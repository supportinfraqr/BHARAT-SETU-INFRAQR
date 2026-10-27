/**
 * Reporting Validator - Validates employee reporting methods and locations
 * Supports: Geo-fencing, IP restriction, Self-reporting
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    return getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) * 1000;
}

function getRadiusMeters(location) {
    const meters = Number(location?.radiusMeters ?? location?.radiusKm);
    return Number.isFinite(meters) && meters > 0 ? meters : 0;
}

function formatDistanceLabel(meters) {
    if (!Number.isFinite(meters)) return '';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
}

/**
 * Validate reporting method - Geo-fencing, IP, or Self-reporting
 * @param {Object} reportingMethod - Reporting method configuration
 * @param {string} reportingType - Type of reporting: 'web', 'mobile', 'kiosk'
 * @param {number} userLat - User's latitude (for geo-fencing)
 * @param {number} userLng - User's longitude (for geo-fencing)
 * @returns {Object} { valid, error, message }
 */
async function validateReportingMethod(reportingMethod, reportingType, userLat, userLng, currentIp) {
    // ========== NO REPORTING METHOD CONFIGURED ==========
    if (!reportingMethod) {
        return { valid: true, error: null, message: "No reporting method configured - all reporting allowed" };
    }

    const { type, isActive } = reportingMethod;

    if (reportingType === 'biometric') {
        if (isActive === false) {
            return { valid: false, error: 'Reporting method is inactive' };
        }
        if (reportingMethod.allowedChannels && reportingMethod.allowedChannels.biometric === false) {
            return { valid: false, error: 'Reporting not allowed on biometric' };
        }
        return { valid: true, message: 'Biometric device punch allowed' };
    }

    if(reportingType) {
        const allowedChannels = reportingMethod.allowedChannels || {};
        if (!allowedChannels[reportingType]) {
            return { valid: false, error: `Reporting not allowed on ${reportingType}` };
        }
    }

    // ========== INACTIVE REPORTING METHOD ==========
    if (!isActive) {
        return { valid: false, error: "Reporting method is inactive" };
    }

    // ========== None-REPORTING ==========
    if (type === "none") {
        return { valid: true, message: "none-reporting allowed" };
    }

    // ========== GEO-FENCING VALIDATION ==========
    if (type === "geofencing") {
        if (!userLat || !userLng) {
            return { valid: false, error: "Location required for geo-fencing" };
        }

        const locations = reportingMethod.locations || [];
        if (locations.length === 0) {
            return { valid: false, error: "No geo-fencing locations configured" };
        }

        // Check if user is within any allowed location
        let nearest = null;
        for (const location of locations) {
            const radiusMeters = getRadiusMeters(location);
            if (!location.latitude || !location.longitude || !radiusMeters) {
                continue;
            }

            const distanceMeters = getDistanceFromLatLonInMeters(
                parseFloat(userLat),
                parseFloat(userLng),
                parseFloat(location.latitude),
                parseFloat(location.longitude)
            );

            if (!nearest || distanceMeters < nearest.distanceMeters) {
                nearest = {
                    name: location.name || 'location',
                    distanceMeters,
                    radiusMeters
                };
            }

            if (distanceMeters <= radiusMeters) {
                return {
                    valid: true,
                    message: `Within ${location.name || 'allowed'} location`,
                    distance: Number((distanceMeters / 1000).toFixed(3)),
                    distanceMeters: Number(distanceMeters.toFixed(1))
                };
            }
        }

        if (!nearest) {
            return { valid: false, error: "No valid geo-fencing locations configured" };
        }

        return {
            valid: false,
            error: `User location outside allowed geo-fencing boundaries (nearest: ${nearest.name}, ${formatDistanceLabel(nearest.distanceMeters)} away, allowed ${formatDistanceLabel(nearest.radiusMeters)})`
        };
    }

    // ========== IP RESTRICTION VALIDATION ==========
    if (type === "ipRestriction") {
        // Note: IP validation would require userIp to be passed from req
        // This is a placeholder implementation
        const allowedIps = reportingMethod.allowedIps || [];

        if (allowedIps.length === 0) {
            return { valid: true, message: "IP restriction not configured" };
        }

        if (!currentIp) {
            return { valid: false, error: "User IP required for IP restriction validation" };
        }

        if (!allowedIps.includes(currentIp)) {
            return { valid: false, error: "User IP not allowed for reporting" };
        }
        // IP validation would happen here if userIp is provided
        return { valid: true, message: "IP validation enabled" };
    }

    return { valid: true, message: "Reporting method validated successfully" };
}

/**
 * Validate specific reporting location - used for geo-fencing
 * @param {Object} location - Location object with lat, lng, radius
 * @param {number} userLat - User's current latitude
 * @param {number} userLng - User's current longitude
 * @returns {Object} { isValid, distance, message }
 */
function validateReportingLocation(location, userLat, userLng) {
    const radiusMeters = getRadiusMeters(location);
    if (!location || !location.latitude || !location.longitude || !radiusMeters) {
        return { isValid: false, message: "Invalid location configuration" };
    }

    if (!userLat || !userLng) {
        return { isValid: false, message: "User location not provided" };
    }

    const distanceMeters = getDistanceFromLatLonInMeters(
        parseFloat(userLat),
        parseFloat(userLng),
        parseFloat(location.latitude),
        parseFloat(location.longitude)
    );

    const isValid = distanceMeters <= radiusMeters;

    return {
        isValid,
        distance: Number((distanceMeters / 1000).toFixed(3)),
        distanceMeters: Number(distanceMeters.toFixed(1)),
        allowedRadius: radiusMeters,
        message: isValid
            ? `Within ${location.name || 'allowed'} location`
            : `Outside ${location.name || 'allowed'} location (${formatDistanceLabel(distanceMeters)} away)`
    };
}

/**
 * Get reporting method details for employee
 * @param {Object} reportingMethod - Reporting method document
 * @returns {Object} Formatted reporting method details
 */
function getReportingMethodDetails(reportingMethod) {
    if (!reportingMethod) {
        return {
            type: "none",
            isActive: false,
            details: "No reporting method configured"
        };
    }

    const details = {
        type: reportingMethod.type,
        isActive: reportingMethod.isActive,
        name: reportingMethod.name || ""
    };

    if (reportingMethod.type === "geofencing" && reportingMethod.locations) {
        details.locations = reportingMethod.locations.map(loc => ({
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
            radiusMeters: getRadiusMeters(loc),
            radiusKm: getRadiusMeters(loc) / 1000
        }));
    }

    if (reportingMethod.type === "ipRestriction") {
        details.allowedIps = reportingMethod.allowedIps || [];
    }

    return details;
}

/**
 * Validate multiple locations - returns which ones user is in
 * @param {Array} locations - Array of location objects
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @returns {Object} { withinLocations, nearestLocation, message }
 */
function validateMultipleLocations(locations, userLat, userLng) {
    if (!Array.isArray(locations) || locations.length === 0) {
        return { withinLocations: [], nearestLocation: null, message: "No locations configured" };
    }

    const results = locations.map(loc => {
        const radiusMeters = getRadiusMeters(loc);
        const distanceMeters = getDistanceFromLatLonInMeters(
            parseFloat(userLat),
            parseFloat(userLng),
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
        );
        return {
            ...loc,
            radiusMeters,
            distance: distanceMeters / 1000,
            distanceMeters,
            isWithin: radiusMeters > 0 && distanceMeters <= radiusMeters
        };
    });

    const withinLocations = results.filter(r => r.isWithin);
    const nearestLocation = results.reduce((prev, curr) =>
        curr.distance < prev.distance ? curr : prev
    );

    return {
        withinLocations: withinLocations.map(l => ({ name: l.name, distance: l.distance })),
        nearestLocation: {
            name: nearestLocation.name,
            distance: Number(nearestLocation.distance.toFixed(3)),
            distanceMeters: Number(nearestLocation.distanceMeters.toFixed(1)),
            isWithin: nearestLocation.isWithin
        },
        message: withinLocations.length > 0
            ? `User within ${withinLocations.length} location(s)`
            : `User outside all locations (nearest: ${nearestLocation.name})`
    };
}

module.exports = {
    validateReportingMethod,
    validateReportingLocation,
    getReportingMethodDetails,
    validateMultipleLocations,
    getDistanceFromLatLonInKm,
    getDistanceFromLatLonInMeters,
    getRadiusMeters
};
