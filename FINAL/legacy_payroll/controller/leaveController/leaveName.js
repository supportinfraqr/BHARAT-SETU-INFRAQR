const mongoose = require('mongoose');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

exports.createLeaveName = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveNameModel } = await initModels(org_uuid);

        const { name, code, shortName, description, status } = req.body;

        if (!name) {
            return sendResponse(res, 400, false, "Leave name is required");
        }

        const exists = await LeaveNameModel.findOne({ name });
        if (exists) {
            return sendResponse(res, 400, false, "Leave name already exists");
        }

        const leaveName = await LeaveNameModel.create({
            name,
            code,
            shortName,
            description,
            status
        });

        return sendResponse(res, 201, true, "Leave name created successfully", leaveName);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.updateLeaveName = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveNameModel } = await initModels(org_uuid);
        const { leaveNameId } = req.params;

        // Check if leave type is system-generated (LOP)
        const existingLeaveName = await LeaveNameModel.findById(leaveNameId);
        if (!existingLeaveName) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        if (existingLeaveName.isSystemGenerated) {
            return sendResponse(res, 400, false, "System-generated leave names (like LOP) cannot be edited");
        }

        const allowedFields = [
            "name",
            "code",
            "shortName",
            "description",
            "status"
        ];

        const updateData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const updated = await LeaveNameModel.findByIdAndUpdate(
            leaveNameId,
            updateData,
            { new: true }
        );

        if (!updated) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        return sendResponse(res, 200, true, "Leave name updated successfully", updated);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getLeaveNames = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveNameModel } = await initModels(org_uuid);
        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(100, parseInt(req.query.limit || 10));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = req.query.status;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { code: { $regex: search, $options: "i" } },
                { shortName: { $regex: search, $options: "i" } }
            ];
        }

        const [data, totalCount] = await Promise.all([
            LeaveNameModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            LeaveNameModel.countDocuments(filter)
        ]);

        return sendResponse(res, 200, true, "Leave names fetched", {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            data
        });

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getLeaveNameById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { leaveNameId } = req.params;
        const { LeaveNameModel } = await initModels(org_uuid);
        const leaveName = await LeaveNameModel.findById(leaveNameId);

        if (!leaveName) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        return sendResponse(res, 200, true, "Leave name fetched", leaveName);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteLeaveName = async (req, res) => {
    try {

        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { leaveNameId } = req.params;
        const {
            LeaveNameModel,
            LeaveTypeModel,
            LeaveReasonModel
        } = await initModels(org_uuid);

        // Check if leave type is system-generated (LOP)
        const existingLeaveName = await LeaveNameModel.findById(leaveNameId);
        if (!existingLeaveName) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        if (existingLeaveName.isSystemGenerated) {
            return sendResponse(res, 400, false, "System-generated leave names (like LOP) cannot be edited");
        }

        const usedInType = await LeaveTypeModel.findOne({ leaveNameId });
        const usedInReason = await LeaveReasonModel.findOne({ leaveNameId });

        if (usedInType || usedInReason) {
            return sendResponse(
                res,
                400,
                false,
                "Cannot delete. Leave name is already in use"
            );
        }

        const deleted = await LeaveNameModel.findByIdAndDelete(leaveNameId);

        if (!deleted) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        return sendResponse(res, 200, true, "Leave name deleted successfully");

    } catch (err) {
        return handleError(res, err);
    }
};
