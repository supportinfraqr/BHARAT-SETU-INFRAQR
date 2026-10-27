const mongoose = require('mongoose');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

const validateObjectIds = (ids, type) => {
    if (!Array.isArray(ids)) throw new Error(`Invalid ${type} IDs: must be an array`);
    ids.forEach(id => {
        if (!mongoose.isValidObjectId(id)) throw new Error(`Invalid ${type} ID: ${id}`);
    });
};

exports.createLeaveType = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { LeaveTypeModel, LeaveNameModel } = await initModels(org_uuid);

        const {
          leaveNameId,
          organizationId,
          leaveType,
          creditDays,
          monthlyAllowed,
          typeOfLeave,
          yearFormat,
          reassign,
          reassignFrequency,
          sandwich,
          carryForward,
          carryForwardLimit,
          encashed,
          encashedDays,
          validityStart,
          validityEnd,
          advancedLeave,
          advancedDayLimit,
          applicableTo,
          customFilters,
          genderRestrictions,
          restrictedDays,
          status
        } = req.body;

        if (!organizationId) {
          return sendResponse(res, 400, false, "organizationId is required");
        }

        if (!leaveNameId) {
            return sendResponse(res, 400, false, "leaveNameId is required");
        }

        const leaveName = await LeaveNameModel.findById(leaveNameId);
        if (!leaveName) {
            return sendResponse(res, 404, false, "Leave name not found");
        }

        const existingLeaveType = await LeaveTypeModel.findOne({ leaveNameId, organizationId });
        if (existingLeaveType) {
            return sendResponse(res, 400, false, "Leave type already exists");
        }

        // Normalize enums/booleans to keep queries consistent
        const normalizedStatus = (status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
        const normalizedTypeOfLeave = ["Monthly", "Yearly", "Special"].includes(typeOfLeave) ? typeOfLeave : "Yearly";
        const normalizedYearFormat = ["financial", "calendarYear"].includes(yearFormat) ? yearFormat : "calendarYear";
        const normalizedGenderRestrictions = Array.isArray(genderRestrictions) && genderRestrictions.length
          ? genderRestrictions
          : ["All"];
        const normalizedCustomFilters = customFilters || { departments: [], employees: [], notAssignEmployee: [] };

        // Auto-set validityStart and validityEnd based on yearFormat if not provided
        let finalValidityStart = validityStart;
        let finalValidityEnd = validityEnd;

        if (!finalValidityStart || !finalValidityEnd) {
          const now = new Date();
          const currentYear = now.getUTCFullYear();
          const currentMonth = now.getUTCMonth(); // 0-11

          if (normalizedYearFormat === "calendarYear") {
            // Calendar Year: Jan 1 - Dec 31
            finalValidityStart = finalValidityStart || new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
            finalValidityEnd = finalValidityEnd || new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
          } else {
            // Financial Year: Apr 1 - Mar 31
            if (currentMonth < 3) {
              // Before April: Use previous FY (Apr last year - Mar this year)
              finalValidityStart = finalValidityStart || new Date(Date.UTC(currentYear - 1, 3, 1, 0, 0, 0, 0));
              finalValidityEnd = finalValidityEnd || new Date(Date.UTC(currentYear, 2, 31, 23, 59, 59, 999));
            } else {
              // After April: Use current FY (Apr this year - Mar next year)
              finalValidityStart = finalValidityStart || new Date(Date.UTC(currentYear, 3, 1, 0, 0, 0, 0));
              finalValidityEnd = finalValidityEnd || new Date(Date.UTC(currentYear + 1, 2, 31, 23, 59, 59, 999));
            }
          }
        }

        const leaveTypeDoc = await LeaveTypeModel.create({
          leaveNameId,
          organizationId,
          leaveType,
          creditDays,
          monthlyAllowed,
          typeOfLeave: normalizedTypeOfLeave,
          yearFormat: normalizedYearFormat,
          reassign,
          reassignFrequency,
          sandwich,
          carryForward,
          carryForwardLimit,
          encashed,
          encashedDays,
          validityStart: finalValidityStart,
          validityEnd: finalValidityEnd,
          advancedLeave,
          advancedDayLimit,
          applicableTo,
          customFilters: normalizedCustomFilters,
          genderRestrictions: normalizedGenderRestrictions,
          restrictedDays,
          status: normalizedStatus
        });

        return sendResponse(
            res,
            201,
            true,
            "Leave type created successfully",
            leaveTypeDoc
        );

    } catch (err) {
        return handleError(res, err);
    }
};

exports.createLOPManually = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { organizationId } = req.body;

        if (!organizationId) {
            return sendResponse(res, 400, false, "organizationId is required");
        }

        // Import the function
        const { createDefaultLOPLeaveType } = require('./leaveService');
        
        
        // Create LOP
        const result = await createDefaultLOPLeaveType(
            org_uuid,
            organizationId
        );

        if (result.existed) {
            return sendResponse(
                res,
                200,
                true,
                "LOP leave type already exists",
                result
            );
        }

        return sendResponse(
            res,
            201,
            true,
            "LOP leave type created successfully",
            result
        );

    } catch (error) {
        console.error("createLOPManually error:", error);
        return handleError(res, error);
    }
};

exports.updateLeaveType = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveTypeModel } = await initModels(org_uuid);
        const { leaveTypeId } = req.params;

        // Check if leave type is system-generated (LOP)
        const existingLeaveType = await LeaveTypeModel.findById(leaveTypeId);
        if (!existingLeaveType) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        if (existingLeaveType.isSystemGenerated) {
            return sendResponse(res, 400, false, "System-generated leave types (like LOP) cannot be edited");
        }

        const allowedFields = [
          "leaveNameId",
          "organizationId",
          "leaveType",
          "creditDays",
          "monthlyAllowed",
          "typeOfLeave",
          "yearFormat",
          "reassign",
          "reassignFrequency",
          "sandwich",
          "carryForward",
          "carryForwardLimit",
          "encashed",
          "encashedDays",
          "validityStart",
          "validityEnd",
          "advancedLeave",
          "advancedDayLimit",
          "applicableTo",
          "customFilters",
          "genderRestrictions",
          "restrictedDays",
          "status"
        ];

        const updateData = {};
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
          }
        }

        if (updateData.status) {
          updateData.status = updateData.status.toLowerCase() === "inactive" ? "inactive" : "active";
        }

        if (updateData.typeOfLeave) {
          updateData.typeOfLeave = ["Monthly", "Yearly", "Special"].includes(updateData.typeOfLeave)
            ? updateData.typeOfLeave
            : "Yearly";
        }

        if (updateData.yearFormat) {
          updateData.yearFormat = ["financial", "calendarYear"].includes(updateData.yearFormat)
            ? updateData.yearFormat
            : "calendarYear";
        }

        if (updateData.genderRestrictions) {
          updateData.genderRestrictions = Array.isArray(updateData.genderRestrictions) && updateData.genderRestrictions.length
            ? updateData.genderRestrictions
            : ["All"];
        }

        // Auto-set validityStart and validityEnd if yearFormat is being updated
        if (updateData.yearFormat && (!req.body.validityStart || !req.body.validityEnd)) {
          const now = new Date();
          const currentYear = now.getUTCFullYear();
          const currentMonth = now.getUTCMonth(); // 0-11

          if (updateData.yearFormat === "calendarYear") {
            // Calendar Year: Jan 1 - Dec 31
            if (!req.body.validityStart) {
              updateData.validityStart = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
            }
            if (!req.body.validityEnd) {
              updateData.validityEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
            }
          } else if (updateData.yearFormat === "financial") {
            // Financial Year: Apr 1 - Mar 31
            if (currentMonth < 3) {
              // Before April: Use previous FY
              if (!req.body.validityStart) {
                updateData.validityStart = new Date(Date.UTC(currentYear - 1, 3, 1, 0, 0, 0, 0));
              }
              if (!req.body.validityEnd) {
                updateData.validityEnd = new Date(Date.UTC(currentYear, 2, 31, 23, 59, 59, 999));
              }
            } else {
              // After April: Use current FY
              if (!req.body.validityStart) {
                updateData.validityStart = new Date(Date.UTC(currentYear, 3, 1, 0, 0, 0, 0));
              }
              if (!req.body.validityEnd) {
                updateData.validityEnd = new Date(Date.UTC(currentYear + 1, 2, 31, 23, 59, 59, 999));
              }
            }
          }
        }

        const updated = await LeaveTypeModel.findByIdAndUpdate(
          leaveTypeId,
          updateData,
          { new: true }
        );

        if (!updated) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        return sendResponse(res, 200, true, "Leave type updated successfully", updated);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.getLeaveTypes = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveTypeModel } = await initModels(org_uuid);

        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(100, parseInt(req.query.limit || 10));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = req.query.status;
        const organizationId = req.query.organizationId;

        const filter = {};
        if (status) filter.status = status.toLowerCase() === "inactive" ? "inactive" : "active";
        if (organizationId) filter.organizationId = organizationId;
        if (search) {
            filter.$or = [
                { leaveType: { $regex: search, $options: "i" } }
            ];
        }

        const [data, totalCount] = await Promise.all([
            LeaveTypeModel.find(filter)
                .populate("leaveNameId", "name code shortName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            LeaveTypeModel.countDocuments(filter)
        ]);

        return sendResponse(res, 200, true, "Leave types fetched", {
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

exports.getLeaveTypeById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveTypeModel } = await initModels(org_uuid);
        const { leaveTypeId } = req.params;


        const leaveType = await LeaveTypeModel
            .findById(leaveTypeId)
            .populate("leaveNameId", "name code shortName");

        if (!leaveType) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        return sendResponse(res, 200, true, "Leave type fetched", leaveType);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteLeaveType = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }
        const { LeaveTypeModel, LeaveRequestModel } = await initModels(org_uuid);

        const { leaveTypeId } = req.params;

               // Check if leave type is system-generated (LOP)
        const existingLeaveType = await LeaveTypeModel.findById(leaveTypeId);
        if (!existingLeaveType) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        if (existingLeaveType.isSystemGenerated) {
            return sendResponse(res, 400, false, "System-generated leave types (like LOP) cannot be deleted");
        }

        const used = await LeaveRequestModel.findOne({ leaveTypeId });
        if (used) {
            return sendResponse(
                res,
                400,
                false,
                "Cannot delete. Leave type is already used in leave requests"
            );
        }

        const deleted = await LeaveTypeModel.findByIdAndDelete(leaveTypeId);
        if (!deleted) {
            return sendResponse(res, 404, false, "Leave type not found");
        }

        return sendResponse(res, 200, true, "Leave type deleted successfully");
    } catch (err) {
        return handleError(res, err);
    }
};

exports.assignLeaveTypes = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, "org_uuid not found");
    }

    const { LeaveTypeModel, EmployeeModel } = await initModels(org_uuid);
    const { leaveTypeId } = req.params;

    const {
      organizationId,
      employeeIds = [],
      departments = [],
      all = false,
      notAssignEmployee = []
    } = req.body;

    if (!organizationId) {
      return sendResponse(res, 400, false, "organizationId is required");
    }

    validateObjectIds(employeeIds, "employeeIds");
    validateObjectIds(departments, "departments");
    validateObjectIds(notAssignEmployee, "notAssignEmployee");

    // ---------- LEAVE TYPE ----------
    const leaveType = await LeaveTypeModel
      .findById(leaveTypeId)
      .select("genderRestrictions organizationId")
      .lean();

    if (!leaveType) {
      return sendResponse(res, 404, false, "Leave type not found");
    }

    if (leaveType.organizationId && leaveType.organizationId.toString() !== organizationId) {
      return sendResponse(res, 400, false, "organizationId mismatch with leave type");
    }

    // ---------- EMPLOYEE QUERY ----------
    const employeeQuery = {
      organizationId,
      _id: { $nin: notAssignEmployee }
    };

    if (!all) {
      const orConditions = [];
      if (departments.length) orConditions.push({ departmentId: { $in: departments } });
      if (employeeIds.length) orConditions.push({ _id: { $in: employeeIds } });

      if (!orConditions.length) {
        return sendResponse(res, 400, false, "No assignment criteria provided");
      }
      employeeQuery.$or = orConditions;
    }

    // ---------- GENDER FILTER (DB LEVEL) ----------
    const genderRestrictions = Array.isArray(leaveType.genderRestrictions) && leaveType.genderRestrictions.length
      ? leaveType.genderRestrictions
      : ["All"];

    if (!genderRestrictions.includes("All")) {
      employeeQuery["demographics.gender"] = {
        $in: genderRestrictions
      };
    }

    // ---------- FETCH EMPLOYEES (LIGHT) ----------
    const employees = await EmployeeModel
      .find(employeeQuery)
      .select("_id leaveTypeIds")
      .lean();

    if (!employees.length) {
      return sendResponse(res, 404, false, "No employees found");
    }

    // ---------- ALL = TRUE ----------
    if (all) {
      employeeIds.length = 0;
      employeeIds.push(...employees.map(e => e._id));
    }

    // ---------- BULK UPDATE ----------
    const bulkOps = [];
    const alreadyAssigned = [];

    for (const emp of employees) {
      if (emp.leaveTypeIds?.includes(leaveTypeId)) {
        alreadyAssigned.push(emp._id);
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: emp._id },
          update: { $addToSet: { leaveTypeIds: leaveTypeId } }
        }
      });
    }

    if (bulkOps.length) {
      await EmployeeModel.bulkWrite(bulkOps);
    }

    // ---------- applicableTo ----------
    let applicableTo = "Custom";
    if (all) applicableTo = "All";
    else if (departments.length && !employeeIds.length) applicableTo = "Department";
    else if (employeeIds.length && !departments.length) applicableTo = "Employee";

    // ---------- UPDATE LEAVE TYPE ----------
    await LeaveTypeModel.updateOne(
      { _id: leaveTypeId },
      {
        applicableTo,
        customFilters: {
          departments,
          employees: employeeIds,
          notAssignEmployee
        }
      }
    );

    return sendResponse(res, 200, true, "Leave type assigned successfully", {
      leaveTypeId,
      organizationId,
      applicableTo,
      totalEmployeesMatched: employees.length,
      assignedCount: bulkOps.length,
      alreadyAssignedCount: alreadyAssigned.length
    });

  } catch (error) {
    console.error("assignLeaveTypes error:", error);
    return handleError(res, error);
  }
};

exports.processYearEndLeaveRenewal = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, "org_uuid not found");
    }

    const {
      LeaveTypeModel,
      LeaveRequestModel,
      EmployeeModel,
      LeaveYearEndHistoryModel
    } = await initModels(org_uuid);

    const { organizationId, yearFormat } = req.body;

    if (!organizationId) {
      return sendResponse(res, 400, false, "organizationId is required");
    }

    if (!yearFormat || !["financial", "calendarYear"].includes(yearFormat)) {
      return sendResponse(res, 400, false, "yearFormat must be 'financial' or 'calendarYear'");
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let newValidityStart, newValidityEnd, yearLabel;

    // Determine new validity period based on yearFormat
    if (yearFormat === "calendarYear") {
      // Calendar year: Jan 1 - Dec 31
      newValidityStart = new Date(currentYear + 1, 0, 1); // Jan 1 next year
      newValidityEnd = new Date(currentYear + 1, 11, 31, 23, 59, 59); // Dec 31 next year
      yearLabel = currentYear + 1;
    } else {
      // Financial year: Apr 1 - Mar 31
      if (currentMonth < 3) {
        // If before April, next FY starts in same calendar year
        newValidityStart = new Date(currentYear, 3, 1); // Apr 1 this year
        newValidityEnd = new Date(currentYear + 1, 2, 31, 23, 59, 59); // Mar 31 next year
        yearLabel = currentYear;
      } else {
        // If after April, next FY starts next calendar year
        newValidityStart = new Date(currentYear + 1, 3, 1); // Apr 1 next year
        newValidityEnd = new Date(currentYear + 2, 2, 31, 23, 59, 59); // Mar 31 year after
        yearLabel = currentYear + 1;
      }
    }

    // Find all expired leave types for history (exclude LOP and system-generated)
    const leaveTypes = await LeaveTypeModel.find({
      organizationId,
      yearFormat,
      status: "active",
      isSystemGenerated: { $ne: true },
      isUnlimited: { $ne: true },
      validityEnd: { $lte: now } // Only process expired leave types
    }).lean();

    if (!leaveTypes.length) {
      return sendResponse(res, 200, true, "No expired leave types found", {
        organizationId,
        yearFormat,
        renewedCount: 0,
        historyCount: 0,
        message: "Only leave types whose validityEnd has passed will be processed"
      });
    }

    const processedEmployees = [];
    const historyRecords = [];
    const leaveTypeUpdates = [];

    // Process each leave type
    for (const leaveType of leaveTypes) {
      // Get all employees assigned to this leave type
      const employees = await EmployeeModel.find({
        organizationId,
        leaveTypeIds: leaveType._id,
        status: "Active"
      }).select("_id").lean();

      if (!employees.length) continue;

      const employeeIds = employees.map(e => e._id);

      // Get usage for each employee (approved leaves in current period)
      const usageData = await LeaveRequestModel.aggregate([
        {
          $match: {
            employeeId: { $in: employeeIds },
            leaveTypeId: leaveType._id,
            status: "Approved",
            startDate: { $gte: leaveType.validityStart || new Date(0) },
            endDate: { $lte: leaveType.validityEnd || now }
          }
        },
        {
          $group: {
            _id: "$employeeId",
            usedDays: { $sum: "$leaveDays" }
          }
        }
      ]);

      const usageMap = {};
      usageData.forEach(u => {
        usageMap[u._id.toString()] = u.usedDays || 0;
      });

      // Process each employee's leave balance
      for (const emp of employees) {
        const empId = emp._id.toString();
        const usedDays = usageMap[empId] || 0;
        const totalCredit = leaveType.creditDays || 0;
        const remainingDays = totalCredit - usedDays;

        let carriedForward = 0;
        let encashed = 0;
        let lapsed = 0;

        if (remainingDays > 0) {
          // Carry Forward
          if (leaveType.carryForward) {
            carriedForward = Math.min(
              remainingDays,
              leaveType.carryForwardLimit || 0
            );
          }

          // Encashment
          const remainingAfterCarry = remainingDays - carriedForward;
          if (leaveType.encashed && remainingAfterCarry > 0) {
            encashed = Math.min(
              remainingAfterCarry,
              leaveType.encashedDays || 0
            );
          }

          // Lapsed (remaining after carry forward and encashment)
          lapsed = remainingDays - carriedForward - encashed;
        }

        // Save history
        historyRecords.push({
          organizationId,
          year: yearLabel,
          employeeId: emp._id,
          history: [{
            leaveTypeId: leaveType._id,
            carriedForward,
            encashed,
            lapsed,
            createdAt: now
          }]
        });

        processedEmployees.push({
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          totalCredit,
          usedDays,
          remainingDays,
          carriedForward,
          encashed,
          lapsed
        });
      }

      // Mark leave type for update ONLY if reassign is true
      if (leaveType.reassign) {
        leaveTypeUpdates.push({
          leaveTypeId: leaveType._id,
          validityStart: newValidityStart,
          validityEnd: newValidityEnd
        });
      }
    }

    // Batch update leave types with new validity dates (only reassign=true)
    const bulkLeaveTypeOps = leaveTypeUpdates.map(update => ({
      updateOne: {
        filter: { _id: update.leaveTypeId },
        update: {
          $set: {
            validityStart: update.validityStart,
            validityEnd: update.validityEnd
          }
        }
      }
    }));

    if (bulkLeaveTypeOps.length) {
      await LeaveTypeModel.bulkWrite(bulkLeaveTypeOps);
    }

    // Save history records (handle existing records for same year)
    for (const record of historyRecords) {
      const existing = await LeaveYearEndHistoryModel.findOne({
        organizationId: record.organizationId,
        year: record.year,
        employeeId: record.employeeId
      });

      if (existing) {
        // Append to existing history
        await LeaveYearEndHistoryModel.updateOne(
          { _id: existing._id },
          { $push: { history: record.history[0] } }
        );
      } else {
        // Create new record
        await LeaveYearEndHistoryModel.create(record);
      }
    }

    return sendResponse(res, 200, true, "Year-end leave renewal processed successfully", {
      organizationId,
      yearFormat,
      yearLabel,
      newValidityStart,
      newValidityEnd,
      leaveTypesProcessed: leaveTypes.length,
      leaveTypesRenewed: leaveTypeUpdates.length,
      employeesProcessed: processedEmployees.length,
      historyRecordsSaved: historyRecords.length,
      totalCarriedForward: processedEmployees.reduce((sum, e) => sum + e.carriedForward, 0),
      totalEncashed: processedEmployees.reduce((sum, e) => sum + e.encashed, 0),
      totalLapsed: processedEmployees.reduce((sum, e) => sum + e.lapsed, 0)
    });

  } catch (error) {
    console.error("processYearEndLeaveRenewal error:", error);
    return handleError(res, error);
  }
};

exports.getLeaveYearEndHistory = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, "org_uuid not found");
    }

    const { LeaveYearEndHistoryModel, LeaveTypeModel, LeaveNameModel } = await initModels(org_uuid);
    const { employeeId } = req.params;
    const { year, organizationId } = req.query;

    if (!mongoose.isValidObjectId(employeeId)) {
      return sendResponse(res, 400, false, "Invalid employee ID");
    }

    const filter = { employeeId };

    if (organizationId) {
      filter.organizationId = organizationId;
    }

    if (year) {
      filter.year = parseInt(year);
    }

    const historyRecords = await LeaveYearEndHistoryModel.find(filter)
      .populate({
        path: 'history.leaveTypeId',
        select: 'leaveNameId creditDays carryForward encashed',
        populate: {
          path: 'leaveNameId',
          select: 'name code'
        }
      })
      .sort({ year: -1 })
      .lean();

    return sendResponse(res, 200, true, "Leave year-end history fetched successfully", historyRecords);

  } catch (error) {
    console.error("getLeaveYearEndHistory error:", error);
    return handleError(res, error);
  }
};


