const mongoose = require('mongoose');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

exports.createLeaveReason = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveReasonModel, LeaveNameModel } = await initModels(org_uuid);

        const { reason, description, leaveNameId, status } = req.body;

        if (!reason) {
            return sendResponse(res, 400, false, "Leave reason is required");
        }

        if (!leaveNameId) {
            return sendResponse(res, 400, false, "leaveNameId is required");
        }

        const leaveName = await LeaveNameModel.findById(leaveNameId);
        if (!leaveName) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        // const exists = await LeaveReasonModel.findOne({ reason });
        // if (exists) {
        //     return sendResponse(res, 400, false, "Leave reason already exists");
        // }

        const leaveReason = await LeaveReasonModel.create({
            reason,
            description,
            leaveNameId,
            status
        });

        return sendResponse(res, 201, true, "Leave reason created successfully", leaveReason);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.updateLeaveReason = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveReasonModel, LeaveNameModel } = await initModels(org_uuid);
        const { leaveReasonId } = req.params;
        // Check if leave type is system-generated (LOP)
        const existing = await LeaveReasonModel.findById(leaveReasonId);
        if (!existing) {
            return sendResponse(res, 404, false, "Leave reason not found");
        }

        if (existing.isSystemGenerated) {
            return sendResponse(res, 400, false, "System-generated leave reasons (like LOP) cannot be edited");
        }
        const allowedFields = ["reason", "description", "leaveNameId", "status"];
        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (updateData.leaveNameId) {
            const leaveName = await LeaveNameModel.findById(updateData.leaveNameId);
            if (!leaveName) {
                return sendResponse(res, 404, false, "Leave name not found");
            }
        }

        const updated = await LeaveReasonModel.findByIdAndUpdate(
            leaveReasonId,
            updateData,
            { new: true }
        );

        if (!updated) {
            return sendResponse(res, 404, false, "Leave reason not found");
        }

        return sendResponse(res, 200, true, "Leave reason updated successfully", updated);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getLeaveReasons = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveReasonModel } = await initModels(org_uuid);

        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(100, parseInt(req.query.limit || 10));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = req.query.status;
        const leaveNameId = req.query.leaveNameId;

        const filter = {};

        if (status) filter.status = status;
        if (leaveNameId) filter.leaveNameId = leaveNameId;

        if (search) {
            filter.$or = [
                { reason: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        const [data, totalCount] = await Promise.all([
            LeaveReasonModel.find(filter)
                .populate("leaveNameId", "name code shortName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            LeaveReasonModel.countDocuments(filter)
        ]);

        return sendResponse(res, 200, true, "Leave reasons fetched", {
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

exports.getLeaveReasonById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveReasonModel } = await initModels(org_uuid);
        const { leaveReasonId } = req.params;

        const reason = await LeaveReasonModel
            .findById(leaveReasonId)
            .populate("leaveNameId", "name code shortName");

        if (!reason) {
            return sendResponse(res, 404, false, "Leave reason not found");
        }

        return sendResponse(res, 200, true, "Leave reason fetched", reason);

    } catch (err) {
        return handleError(res, err);
    }
};

exports.getLeaveReasonsByLeaveType = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveReasonModel, LeaveTypeModel } = await initModels(org_uuid);
        const { leaveTypeId } = req.params;

        if (!leaveTypeId) {
            return sendResponse(res, 400, false, "leaveTypeId is required");
        }

        if (!mongoose.isValidObjectId(leaveTypeId)) {
            return sendResponse(res, 400, false, "Invalid leaveTypeId");
        }

        const leaveType = await LeaveTypeModel
            .findById(leaveTypeId)
            .select('leaveNameId')
            .lean();

        if (!leaveType) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        if (!leaveType.leaveNameId) {
            return sendResponse(res, 200, true, "No leave name found for selected leave type", {
                leaveTypeId,
                leaveNameId: null,
                reasons: []
            });
        }

        const reasons = await LeaveReasonModel.find({
            leaveNameId: leaveType.leaveNameId,
            status: 'active'
        })
            .populate('leaveNameId', 'name code shortName')
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, true, "Leave reasons fetched by leave type", {
            leaveTypeId,
            leaveNameId: leaveType.leaveNameId,
            reasons
        });
    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteLeaveReason = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveReasonModel, LeaveRequestModel } = await initModels(org_uuid);

        const { leaveReasonId } = req.params;
        // Check if leave type is system-generated (LOP)
        const existing = await LeaveReasonModel.findById(leaveReasonId);
        if (!existing) {
            return sendResponse(res, 404, false, "Leave reason not found");
        }

        if (existing.isSystemGenerated) {
            return sendResponse(res, 400, false, "System-generated leave reasons (like LOP) cannot be deleted");
        }
        const used = await LeaveRequestModel.findOne({ leaveReasonId });
        if (used) {
            return sendResponse(
                res,
                400,
                false,
                "Cannot delete. Leave reason is used in leave requests"
            );
        }

        const deleted = await LeaveReasonModel.findByIdAndDelete(leaveReasonId);

        if (!deleted) {
            return sendResponse(res, 404, false, "Leave reason not found");
        }

        return sendResponse(res, 200, true, "Leave reason deleted successfully");

    } catch (err) {
        return handleError(res, err);
    }
};
