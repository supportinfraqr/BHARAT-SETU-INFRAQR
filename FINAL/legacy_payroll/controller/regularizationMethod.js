const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const { sendResponse, handleError } = require('../utils/responce');

exports.createRegularizationMethod = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

    const { RegularizationMethodModel } = await initModels(org_uuid);

    const {
      name,
      shortName,
      type,
      organizationId,
      status = "Active",
      applicableCategories = [],
      rules = {},
      documentRequired = false,
      preventDuplicate = false,
      description
    } = req.body;

    if (!name || !shortName || !type) {
      return sendResponse(res, 400, false, "name, shortName, and type are required");
    }

    if (!["OD", "MP", "FID", "OT"].includes(type)) {
      return sendResponse(res, 400, false, "type must be one of: OD, MP, FID, OT");
    }

    // ---- VALIDATE TYPE-SPECIFIC RULES ----
    if (rules) {
      if (type === "OD" && rules.odRules) {
        // Validate OD rules
        if (rules.odRules.requireLocation !== undefined && typeof rules.odRules.requireLocation !== 'boolean') {
          return sendResponse(res, 400, false, "odRules.requireLocation must be boolean");
        }
      }
      if (type === "MP" && rules.mpRules) {
        // Validate MP rules
        if (rules.mpRules.allowSinglePunch !== undefined && typeof rules.mpRules.allowSinglePunch !== 'boolean') {
          return sendResponse(res, 400, false, "mpRules.allowSinglePunch must be boolean");
        }
        if (rules.mpRules.allowBothMissing !== undefined && typeof rules.mpRules.allowBothMissing !== 'boolean') {
          return sendResponse(res, 400, false, "mpRules.allowBothMissing must be boolean");
        }
      }
      if (type === "FID" && rules.fidRules) {
        // Validate FID rules
        if (rules.fidRules.maxHoursPerDay && (rules.fidRules.maxHoursPerDay < 0 || rules.fidRules.maxHoursPerDay > 24)) {
          return sendResponse(res, 400, false, "fidRules.maxHoursPerDay must be between 0 and 24");
        }
      }
      if (type === "OT" && rules.otRules) {
        // Validate OT rules
        if (rules.otRules.minOvertimeMinutes && rules.otRules.minOvertimeMinutes < 0) {
          return sendResponse(res, 400, false, "otRules.minOvertimeMinutes must be >= 0");
        }
        if (rules.otRules.maxOvertimeHours && (rules.otRules.maxOvertimeHours < 0 || rules.otRules.maxOvertimeHours > 24)) {
          return sendResponse(res, 400, false, "otRules.maxOvertimeHours must be between 0 and 24");
        }
      }
    }

    // ---- VALIDATE APPLICABLE CATEGORIES ----
    if (applicableCategories && applicableCategories.length > 0) {
      for (let i = 0; i < applicableCategories.length; i++) {
        const cat = applicableCategories[i];
        
        if (!cat.categoryId) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: categoryId is required`);
        }
        
        if (cat.allowPastDaysUpto !== undefined && (cat.allowPastDaysUpto < 0 || cat.allowPastDaysUpto > 365)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: allowPastDaysUpto must be between 0 and 365`);
        }
        
        if (cat.maxRequestsPerMonth !== undefined && (cat.maxRequestsPerMonth < 0 || cat.maxRequestsPerMonth > 100)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: maxRequestsPerMonth must be between 0 and 100`);
        }
        
        if (cat.cutOffDay !== undefined && (cat.cutOffDay < 1 || cat.cutOffDay > 31)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: cutOffDay must be between 1 and 31`);
        }
        
        if (cat.graceDays !== undefined && (cat.graceDays < 0 || cat.graceDays > 30)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: graceDays must be between 0 and 30`);
        }
      }
    }

    const exists = await RegularizationMethodModel.findOne({
      shortName,
      organizationId
    });

    if (exists) {
      return sendResponse(res, 400, false, "Regularization method with this shortName already exists");
    }

    const method = await RegularizationMethodModel.create({
      name,
      shortName,
      type,
      organizationId,
      status,
      applicableCategories,
      rules,
      documentRequired,
      preventDuplicate,
      description
    });

    return sendResponse(res, 201, true, "Regularization method created successfully", method);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateRegularizationMethod = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

    const { RegularizationMethodModel } = await initModels(org_uuid);
    const { methodId } = req.params;

    const allowedFields = [
      "name",
      "type",
      "status",
      "applicableCategories",
      "rules",
      "documentRequired",
      "preventDuplicate",
      "description"
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate type if being updated
    if (updateData.type && !["OD", "MP", "FID", "OT"].includes(updateData.type)) {
      return sendResponse(res, 400, false, "type must be one of: OD, MP, FID, OT");
    }

    // ---- VALIDATE TYPE-SPECIFIC RULES IF UPDATING ----
    if (updateData.rules) {
      // Need to get existing method to check type
      const existingMethod = await RegularizationMethodModel.findById(methodId);
      if (!existingMethod) {
        return sendResponse(res, 404, false, "Regularization method not found");
      }
      
      const methodType = updateData.type || existingMethod.type;
      
      if (methodType === "OD" && updateData.rules.odRules) {
        if (updateData.rules.odRules.requireLocation !== undefined && typeof updateData.rules.odRules.requireLocation !== 'boolean') {
          return sendResponse(res, 400, false, "odRules.requireLocation must be boolean");
        }
      }
      if (methodType === "MP" && updateData.rules.mpRules) {
        if (updateData.rules.mpRules.allowSinglePunch !== undefined && typeof updateData.rules.mpRules.allowSinglePunch !== 'boolean') {
          return sendResponse(res, 400, false, "mpRules.allowSinglePunch must be boolean");
        }
        if (updateData.rules.mpRules.allowBothMissing !== undefined && typeof updateData.rules.mpRules.allowBothMissing !== 'boolean') {
          return sendResponse(res, 400, false, "mpRules.allowBothMissing must be boolean");
        }
      }
      if (methodType === "FID" && updateData.rules.fidRules) {
        if (updateData.rules.fidRules.maxHoursPerDay && (updateData.rules.fidRules.maxHoursPerDay < 0 || updateData.rules.fidRules.maxHoursPerDay > 24)) {
          return sendResponse(res, 400, false, "fidRules.maxHoursPerDay must be between 0 and 24");
        }
      }
      if (methodType === "OT" && updateData.rules.otRules) {
        if (updateData.rules.otRules.minOvertimeMinutes && updateData.rules.otRules.minOvertimeMinutes < 0) {
          return sendResponse(res, 400, false, "otRules.minOvertimeMinutes must be >= 0");
        }
        if (updateData.rules.otRules.maxOvertimeHours && (updateData.rules.otRules.maxOvertimeHours < 0 || updateData.rules.otRules.maxOvertimeHours > 24)) {
          return sendResponse(res, 400, false, "otRules.maxOvertimeHours must be between 0 and 24");
        }
      }
    }

    // ---- VALIDATE APPLICABLE CATEGORIES IF UPDATING ----
    if (updateData.applicableCategories && updateData.applicableCategories.length > 0) {
      for (let i = 0; i < updateData.applicableCategories.length; i++) {
        const cat = updateData.applicableCategories[i];
        
        if (!cat.categoryId) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: categoryId is required`);
        }
        
        if (cat.allowPastDaysUpto !== undefined && (cat.allowPastDaysUpto < 0 || cat.allowPastDaysUpto > 365)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: allowPastDaysUpto must be between 0 and 365`);
        }
        
        if (cat.maxRequestsPerMonth !== undefined && (cat.maxRequestsPerMonth < 0 || cat.maxRequestsPerMonth > 100)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: maxRequestsPerMonth must be between 0 and 100`);
        }
        
        if (cat.cutOffDay !== undefined && (cat.cutOffDay < 1 || cat.cutOffDay > 31)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: cutOffDay must be between 1 and 31`);
        }
        
        if (cat.graceDays !== undefined && (cat.graceDays < 0 || cat.graceDays > 30)) {
          return sendResponse(res, 400, false, `applicableCategories[${i}]: graceDays must be between 0 and 30`);
        }
      }
    }

    const updated = await RegularizationMethodModel.findByIdAndUpdate(
      methodId,
      updateData,
      { new: true }
    );

    if (!updated) {
      return sendResponse(res, 404, false, "Regularization method not found");
    }

    return sendResponse(res, 200, true, "Regularization method updated successfully", updated);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getRegularizationMethods = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

    const { RegularizationMethodModel } = await initModels(org_uuid);

    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } }
      ];
    }

    const [data, totalCount] = await Promise.all([
      RegularizationMethodModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RegularizationMethodModel.countDocuments(filter)
    ]);

    return sendResponse(res, 200, true, "Regularization methods fetched", {
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

exports.getRegularizationMethodById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

    const { RegularizationMethodModel } = await initModels(org_uuid);
    const { methodId } = req.params;

    const method = await RegularizationMethodModel.findById(methodId);
    if (!method) {
      return sendResponse(res, 404, false, "Regularization method not found");
    }

    return sendResponse(res, 200, true, "Regularization method fetched", method);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteRegularizationMethod = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) return sendResponse(res, 400, false, "org_uuid not found");

    const { RegularizationMethodModel, RegularizationRequestModel } =
      await initModels(org_uuid);

    const { methodId } = req.params;

    // 🔐 Safety: check if used
    const used = await RegularizationRequestModel.findOne({
      regularizationMethodId: methodId
    });

    if (used) {
      return sendResponse(
        res,
        400,
        false,
        "Cannot delete. Regularization method already used in requests"
      );
    }

    const deleted = await RegularizationMethodModel.findByIdAndDelete(methodId);
    if (!deleted) {
      return sendResponse(res, 404, false, "Regularization method not found");
    }

    return sendResponse(res, 200, true, "Regularization method deleted");
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getRegularizationMethodsByCategory = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, "org_uuid not found");
    }

    const { RegularizationMethodModel } = await initModels(org_uuid);

    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 10));
    const skip = (page - 1) * limit;

    const { categoryId, canRaise, canApprove, search } = req.query;

    if (!categoryId) {
      return sendResponse(res, 400, false, "categoryId is required");
    }

    /* ---------------- MATCH ---------------- */
    const match = {
      status: "Active",
      "applicableCategories.categoryId": new mongoose.Types.ObjectId(categoryId)
    };

    if (search) {
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortName: { $regex: search, $options: "i" } }
      ];
    }

    /* ---------------- PIPELINE ---------------- */
    const pipeline = [
      { $match: match },

      // 🔥 FILTER applicableCategories ARRAY
      {
        $addFields: {
          applicableCategories: {
            $filter: {
              input: "$applicableCategories",
              as: "cat",
              cond: {
                $and: [
                  { $eq: ["$$cat.categoryId", new mongoose.Types.ObjectId(categoryId)] },
                  ...(canRaise !== undefined
                    ? [{ $eq: ["$$cat.canRaise", canRaise === "true"] }]
                    : []),
                  ...(canApprove !== undefined
                    ? [{ $eq: ["$$cat.canApprove", canApprove === "true"] }]
                    : [])
                ]
              }
            }
          }
        }
      },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const result = await RegularizationMethodModel.aggregate(pipeline);

    const data = result[0]?.data || [];
    const totalCount = result[0]?.totalCount?.[0]?.count || 0;

    return sendResponse(res, 200, true, "Regularization methods fetched", {
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

