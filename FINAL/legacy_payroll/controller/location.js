const { getDatabaseConnection } = require('../config/mongo');
const { initModels } = require('../models/indexModel');
const mongoose = require('mongoose');

exports.addLocation = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const {
            organizationName,
            domainName,
            brn,
            gst,
            industryId,
            industry,
            foundedDate,
            taxId,
            organizationType,
            logo,
            status,
            organizationIcon,
            organizationAddress,
            contactDetails,
            email,
            phoneNumber,
            registrationDate,
            employeesCount,
            isVerified,
            systemUserId
        } = req.body;

        // Validate required fields
        if (!organizationName) {
            return res.status(400).json({
                status: 'error',
                message: 'location name are required'
            });
        }

        const { OrganizationModel } = await initModels(org_uuid);


        const newLocation = new OrganizationModel({
            organizationName,
            domainName,
            brn,
            gst,
            sideId: org_uuid,
            industryId,
            industry,
            foundedDate,
            taxId,
            organizationType,
            logo,
            status,
            organizationIcon,
            organizationAddress,
            contactDetails,
            email,
            phoneNumber,
            registrationDate: registrationDate || Date.now(),
            employeesCount,
            isVerified
        });

        // Save the organization to the database
        const savedLocation = await newLocation.save();

        // Auto-create default LOP leave type for this location
        try {
            const { createDefaultLOPLeaveType } = require('./leaveController/leaveService');
            await createDefaultLOPLeaveType(org_uuid, savedLocation._id);
        } catch (lopError) {
            console.error('Warning: Failed to create LOP for location:', lopError.message);
        }

        // Respond with success status
        return res.status(201).json({
            status: 'success',
            message: 'Organization location added successfully',
            data: savedLocation
        });

    } catch (error) {
        console.error('Error adding organization location:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getAllLocation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { OrganizationModel } = await initModels(org_uuid);

        const locations = await OrganizationModel.find();

        if (!locations || locations.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No locations found for the given Organization'
            });
        }

        // Remove the first object from the array
        const updatedLocations = locations.slice(1);

        return res.status(200).json({
            status: 'success',
            message: 'location fetched successfully',
            data: updatedLocations,
        });

    } catch (error) {
        console.error('Error fetching organizations locations:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getLocationById = async (req, res) => {
    try {
        const { org_uuid } = req.headers;
        const { locationId } = req.params;

        // Validate org_uuid in headers
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { OrganizationModel } = await initModels(org_uuid);


        const location = await OrganizationModel.findOne({ _id: locationId });

        if (!location) {
            return res.status(404).json({
                status: 'error',
                message: 'location not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'location fetched successfully',
            data: location
        });

    } catch (error) {
        console.error('Error fetching location by ID:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { locationId } = req.params;
        const updateData = req.body;

        const { OrganizationModel } = await initModels(org_uuid);

        // Find the organization by ID and update it
        const updatedOrganization = await OrganizationModel.findByIdAndUpdate(
            locationId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedOrganization) {
            return res.status(404).json({
                status: 'error',
                message: 'location not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'location updated successfully',
            data: updatedOrganization
        });

    } catch (error) {
        console.error('Error updating location:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

