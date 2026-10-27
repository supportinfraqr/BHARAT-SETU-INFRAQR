const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const { sendResponse, handleError } = require('../utils/responce');

function normalizeGeoLocations(locations = []) {
    return locations.map((loc) => {
        const radiusMeters = Number(loc.radiusMeters ?? loc.radiusKm);
        return {
            name: loc.name,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            radiusMeters,
            radiusKm: radiusMeters
        };
    });
}

function hasValidGeoLocation(loc) {
    const radius = Number(loc.radiusMeters ?? loc.radiusKm);
    return loc.latitude !== undefined && loc.longitude !== undefined && Number.isFinite(radius) && radius > 0;
}


exports.createReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { ReportingMethodModel } = await initModels(org_uuid);

        let {
            name,
            organizationId,
            type = "none",
            isActive = true,
            allowedChannels = {},
            locations = [],
            allowedIps = [],
            employees = []
        } = req.body;

        if (!name) {
            return sendResponse(res, 400, false, "Reporting method name is required");
        }

        // ---------- ENUM SAFETY ----------
        type = ["geofencing", "ipRestriction", "none"].includes(type)
            ? type
            : "none";

        isActive = typeof isActive === "boolean" ? isActive : true;

        // ---------- GEO LOCATION VALIDATION ----------
        if (Array.isArray(locations) && locations.length > 0) {

            for (let i = 0; i < locations.length; i++) {
                if (!hasValidGeoLocation(locations[i])) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        `latitude, longitude, and radiusMeters required for locations[${i}]`
                    );
                }
            }
            locations = normalizeGeoLocations(locations);
        }

        const reportingMethod = new ReportingMethodModel({
            name,
            organizationId,
            type,
            isActive,
            allowedChannels,
            locations,
            allowedIps,
            employees
        });

        const saved = await reportingMethod.save();

        return sendResponse(
            res,
            201,
            true,
            "Reporting method created successfully",
            saved
        );

    } catch (error) {
        return handleError(res, error);
    }
};

exports.updateReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { ReportingMethodModel } = await initModels(org_uuid);
        const { methodId } = req.params;

        const allowedUpdates = [
            "name",
            "type",
            "isActive",
            "allowedChannels",
            // "autoAbsent",
            "locations",
            "allowedIps",
            "employees"
        ];

        const updateData = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updateData[key] = req.body[key];
            }
        }

        // ---------- ENUM SAFETY ----------
        if (updateData.type) {
            updateData.type =
                ["geofencing", "ipRestriction", "none"].includes(updateData.type)
                    ? updateData.type
                    : "none";
        }

        if (typeof updateData.isActive !== "undefined") {
            updateData.isActive = typeof updateData.isActive === "boolean" ? updateData.isActive : true;
        }

        // ---------- GEO LOCATION SAFETY ----------
        if (Array.isArray(updateData.locations)) {
            if (updateData.locations.length > 0) {
                // updateData.gpsRequired = true;

                for (let i = 0; i < updateData.locations.length; i++) {
                    if (!hasValidGeoLocation(updateData.locations[i])) {
                        return sendResponse(
                            res,
                            400,
                            false,
                            `latitude, longitude, and radiusMeters required for locations[${i}]`
                        );
                    }
                }
                updateData.locations = normalizeGeoLocations(updateData.locations);
            } else {
                // updateData.gpsRequired = false;
            }
        }

        const updated = await ReportingMethodModel.findByIdAndUpdate(
            methodId,
            updateData,
            { new: true }
        );

        if (!updated) {
            return sendResponse(res, 404, false, "Reporting method not found");
        }

        return sendResponse(
            res,
            200,
            true,
            "Reporting method updated successfully",
            updated
        );

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getReportingMethods = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { ReportingMethodModel } = await initModels(org_uuid);

        // Pagination
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();

        // Filters
        const filters = {};

        // Search only on name
        if (search) {
            filters.name = { $regex: search, $options: "i" };
        }

        // organizationId filter (IMPORTANT FIX)
        if (req.query.organizationId) {
            try {
                filters.organizationId = new mongoose.Types.ObjectId(req.query.organizationId);
            } catch {
                return sendResponse(res, 400, false, "Invalid organizationId");
            }
        }

        // Channel Filters
        if (req.query.web) filters["allowedChannels.web"] = req.query.web === "true";
        if (req.query.mobile) filters["allowedChannels.mobile"] = req.query.mobile === "true";
        if (req.query.excel) filters["allowedChannels.excel"] = req.query.excel === "true";
        if (req.query.biometric) filters["allowedChannels.biometric"] = req.query.biometric === "true";

        // Sorting
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
        const sortQuery = { [sortBy]: sortOrder };

        // Pipeline
        const pipeline = [
            { $match: filters },
            { $sort: sortQuery },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ];

        const result = await ReportingMethodModel.aggregate(pipeline);

        const data = result[0]?.data || [];
        const totalCount = result[0]?.totalCount?.[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        return sendResponse(res, 200, true, "Reporting methods fetched", {
            page,
            limit,
            totalPages,
            totalCount,
            data
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getReportingMethodById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { ReportingMethodModel } = await initModels(org_uuid);
        const { methodId } = req.params;

        const method = await ReportingMethodModel
            .findById(methodId)
            .populate("employees", "firstName email");

        if (!method) {
            return sendResponse(res, 404, false, "Reporting method not found");
        }

        return sendResponse(res, 200, true, "Reporting method fetched", method);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.assignEmployeesToReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, "org_uuid not found");
        }

        const { ReportingMethodModel, EmployeeModel } = await initModels(org_uuid);
        const { methodId } = req.params;
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return sendResponse(res, 400, false, "employeeIds must be a non-empty array");
        }

        const method = await ReportingMethodModel.findById(methodId);
        if (!method) {
            return sendResponse(res, 404, false, "Reporting method not found");
        }

        const successfullyAssigned = [];
        const alreadyAssigned = [];
        const errors = [];

        for (const employeeId of employeeIds) {
            try {
                const employee = await EmployeeModel.findById(employeeId);

                if (!employee) {
                    errors.push({ employeeId, message: "Employee not found" });
                    continue;
                }

                if (employee.reportingMethodId) {
                    alreadyAssigned.push({
                        employeeId,
                        employeeName: employee.firstName,
                        reportingMethodId: employee.reportingMethodId,
                        message: "Employee is already assigned to a reporting method"
                    });
                    continue;
                }

                // Update method & employee
                // Handle case where employees might be null by initializing to array first
                const updateOperation = method.employees === null || method.employees === undefined
                    ? { $set: { employees: [employee._id] } }
                    : { $addToSet: { employees: employee._id } };

                await ReportingMethodModel.findByIdAndUpdate(methodId, updateOperation);

                await EmployeeModel.findByIdAndUpdate(
                    employeeId,
                    { reportingMethodId: methodId }
                );

                successfullyAssigned.push({
                    employeeId,
                    employeeName: employee.firstName
                });

            } catch (err) {
                errors.push({ employeeId, message: err.message });
            }
        }

        const updatedMethod = await ReportingMethodModel.findById(methodId);

        return sendResponse(res, 200, true, "Employees processed successfully", {
            successfullyAssigned,
            alreadyAssigned,
            errors,
            updatedMethod
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.removeEmployeesFromReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, "org_uuid not found");
        }

        const { ReportingMethodModel, EmployeeModel } = await initModels(org_uuid);
        const { methodId } = req.params;
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return sendResponse(res, 400, false, "employeeIds must be a non-empty array");
        }

        const method = await ReportingMethodModel.findById(methodId);
        if (!method) {
            return sendResponse(res, 404, false, "Reporting method not found");
        }

        const removed = [];
        const notAssigned = [];
        const errors = [];

        for (const employeeId of employeeIds) {
            try {
                const employee = await EmployeeModel.findById(employeeId);

                if (!employee) {
                    errors.push({ employeeId, message: "Employee not found" });
                    continue;
                }

                if (!employee.reportingMethodId || employee.reportingMethodId.toString() !== methodId) {
                    notAssigned.push({
                        employeeId,
                        employeeName: employee.firstName,
                        message: "Employee is not assigned to this reporting method"
                    });
                    continue;
                }

                // Remove from reporting method
                await ReportingMethodModel.findByIdAndUpdate(
                    methodId,
                    { $pull: { employees: employee._id } }
                );

                await EmployeeModel.findByIdAndUpdate(
                    employeeId,
                    { reportingMethodId: null }
                );

                removed.push({
                    employeeId,
                    employeeName: employee.firstName
                });

            } catch (err) {
                errors.push({ employeeId, message: err.message });
            }
        }

        const updatedMethod = await ReportingMethodModel.findById(methodId);

        return sendResponse(res, 200, true, "Employees removed successfully", {
            removed,
            notAssigned,
            errors,
            updatedMethod
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, "org_uuid not found");
        }

        const { ReportingMethodModel } = await initModels(org_uuid);
        const { methodId } = req.params;

        // Step 1: Find reporting method
        const method = await ReportingMethodModel.findById(methodId);
        if (!method) {
            return sendResponse(res, 404, false, "Reporting method not found");
        }

        // Step 2: Check if employees assigned
        if (method.employees && method.employees.length > 0) {
            return sendResponse(
                res,
                400,
                false,
                `Cannot delete reporting method. ${method.employees.length} employees are still assigned. Please remove or reassign them first.`
            );
        }

        // Step 3: Safe delete
        await ReportingMethodModel.findByIdAndDelete(methodId);

        return sendResponse(res, 200, true, "Reporting method deleted successfully");

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getEmployeesByReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { ReportingMethodModel, EmployeeModel } = await initModels(org_uuid);
        const { methodId } = req.params;

        // ---------- CHECK REPORTING METHOD ----------
        const method = await ReportingMethodModel.findById(methodId)
            .select("name");

        if (!method) {
            return sendResponse(res, 404, false, "Reporting method not found");
        }

        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const department = req.query.department;
        const status = req.query.status;

        // ---------- FILTERS ----------
        const filters = {
            reportingMethodId: methodId
        };

        if (search) {
            filters.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { uniqueId: { $regex: search, $options: "i" } }
            ];
        }

        if (department) {
            filters.department = department;
        }

        if (status) {
            filters.status = status;
        }

        // ---------- QUERY ----------
        const [employees, totalCount] = await Promise.all([
            EmployeeModel.find(filters)
                .select("firstName lastName email uniqueId status department designation")
                .sort({ firstName: 1 })
                .skip(skip)
                .limit(limit),
            EmployeeModel.countDocuments(filters)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return sendResponse(res, 200, true, "Employees fetched successfully", {
            reportingMethod: {
                _id: method._id,
                name: method.name
            },
            pagination: {
                page,
                limit,
                totalPages,
                totalCount
            },
            employees
        });

    } catch (error) {
        return handleError(res, error);
    }
};

exports.getEmployeesNotInReportingMethod = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { EmployeeModel, ReportingMethodModel } = await initModels(org_uuid);


        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const department = req.query.department;
        const status = req.query.status;
        const organizationId = req.query.organizationId;

        // ---------- FILTER ----------
        // Use aggregation to find employees not assigned to any existing reporting method
        const pipeline = [
            {
                $lookup: {
                    from: 'reportingmethods',
                    localField: 'reportingMethodId',
                    foreignField: '_id',
                    as: 'reportingMethod'
                }
            },
            {
                $match: {
                    $or: [
                        { reportingMethodId: { $exists: false } },
                        { reportingMethodId: null },
                        { reportingMethod: { $size: 0 } } // reportingMethodId exists but reporting method not found
                    ],
                    status: { $ne: 'Inactive' }
                }
            }
        ];

        if (organizationId) {
            pipeline[1].$match.organizationId = organizationId;
        }

        if (search) {
            pipeline[1].$match.$and = [{
                $or: [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { uniqueId: { $regex: search, $options: "i" } }
                ]
            }];
        }

        if (department) {
            pipeline[1].$match.department = department;
        }

        if (status) {
            pipeline[1].$match.status = status;
        }

        // Add projection and pagination
        pipeline.push(
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    uniqueId: 1,
                    status: 1,
                    department: 1,
                    designation: 1
                }
            },
            { $sort: { firstName: 1 } },
            { $skip: skip },
            { $limit: limit }
        );

        const employees = await EmployeeModel.aggregate(pipeline);
        const totalCount = await EmployeeModel.aggregate([
            ...pipeline.slice(0, -3), // Remove project, sort, skip, limit
            { $count: "total" }
        ]).then(result => result[0]?.total || 0);

        const totalPages = Math.ceil(totalCount / limit);

        return sendResponse(res, 200, true, "Unassigned employees fetched successfully", {
            pagination: {
                page,
                limit,
                totalPages,
                totalCount
            },
            employees
        });

    } catch (error) {
        return handleError(res, error);
    }
};
