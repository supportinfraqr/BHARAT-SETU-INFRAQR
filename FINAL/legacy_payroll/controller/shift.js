const { initModels } = require('../models/indexModel');
const csv = require('csv-parser');
const fs = require('fs');
const xlsx = require('xlsx');
const moment = require("moment");
const { sendResponse, handleError } = require('../utils/responce');
const mongoose = require('mongoose');

const validateHHMMSS = (timeStr) => /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/.test(timeStr);
const validateHHMM = (timeStr) => /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(timeStr);
const validateDecimalTime = (time) => !isNaN(time) && time >= 0 && time < 1;

function dayBefore(date) {
    return new Date(date.getTime() - 1);
}

const parseTimeToMinutes = (time) => {
    if (typeof time === 'string' && validateHHMMSS(time)) {
        const [h, m] = time.split(':').slice(0, 2).map(Number);
        return h * 60 + m;
    }
    if (typeof time === 'number' && validateDecimalTime(time)) {
        return Math.floor(time * 24 * 60); // Convert decimal to minutes
    }
    return null;
};

const minutesToHHMM = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

exports.addShift = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'Organization UUID missing');
        }

        if (!req.userId) {
            return sendResponse(res, 401, false, 'Unauthorized');
        }

        const { ShiftModel } = await initModels(org_uuid);

        const {
            name,
            organizationId,
            shortName,
            startTime,
            endTime,
            breakDuration = 0,
            compulsoryWorkHours,
            excludeBreakFromWorkingHours = true,
            allowHalfDay = false,
            firstHalfOffSecondHalfStartAt,
            secondHalfOffFirstHalfEndAt,
            employees = [],
            weeklyOff = {},
            status = 'active'
        } = req.body;

        if (!name) {
            return sendResponse(res, 400, false, 'Shift name required');
        }

        // -------- DUPLICATE CHECK (ORG-WISE) --------
        const existingShift = await ShiftModel.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            organizationId
        });

        if (existingShift) {
            return res.status(400).json({
                status: 'error',
                message: `Shift '${name}' already exists`
            });
        }

        // -------- TIME PARSE --------
        const startMin = parseTimeToMinutes(startTime);
        const endMin = parseTimeToMinutes(endTime);

        if (startMin === null || endMin === null) {
            return res.status(400).json({ status: 'error', message: 'Invalid time format' });
        }

        let shiftDuration =
            endMin >= startMin ? endMin - startMin : (1440 - startMin) + endMin;

        if (breakDuration > shiftDuration) {
            return res.status(400).json({ status: 'error', message: 'Break exceeds shift duration' });
        }

        const netWorkingTime = excludeBreakFromWorkingHours
            ? shiftDuration - breakDuration
            : shiftDuration;

        let compulsoryMinutes = netWorkingTime;

        if (compulsoryWorkHours) {
            const parsed = parseTimeToMinutes(compulsoryWorkHours);
            if (parsed === null) {
                return sendResponse(res, 400, false, 'Invalid compulsory work hours format');
            }
            compulsoryMinutes = parsed;
        }

        if (compulsoryMinutes > netWorkingTime) {
            return sendResponse(res, 400, false, 'Compulsory hours exceed net working time');
        }

        // -------- HALF DAY VALIDATION --------
        if (allowHalfDay) {
            if (!firstHalfOffSecondHalfStartAt || !secondHalfOffFirstHalfEndAt) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Half-day timings required'
                });
            }
        }

        // -------- ORGANIZATION ID VALIDATION --------
        if (!organizationId) {
            return sendResponse(res, 400, false, 'organizationId is required');
        }

        const shift = new ShiftModel({
            name,
            shortName,
            organizationId,
            startTime: minutesToHHMM(startMin),
            endTime: minutesToHHMM(endMin),
            breakDuration,
            compulsoryWorkHours: compulsoryMinutes,
            excludeBreakFromWorkingHours,
            allowHalfDay,
            firstHalfOffSecondHalfStartAt: allowHalfDay ? firstHalfOffSecondHalfStartAt : null,
            secondHalfOffFirstHalfEndAt: allowHalfDay ? secondHalfOffFirstHalfEndAt : null,
            employees,
            weeklyOff,
            status,
            createdBy: req.userId
        });

        const saved = await shift.save();

        return sendResponse(res, 201, true, 'Shift added successfully', saved);

    } catch (err) {
        console.error('addShift error:', err);
        return handleError(res, err, 500);
    }
};

exports.updateShift = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'Organization UUID missing');
        }

        if (!req.userId) {
            return sendResponse(res, 401, false, 'Unauthorized');
        }

        const { ShiftModel } = await initModels(org_uuid);
        const { shiftId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return sendResponse(res, 400, false, 'Invalid shift ID');
        }

        const data = req.body;
        const existingShift = await ShiftModel.findById(shiftId);
        if (!existingShift) {
            return sendResponse(res, 404, false, 'Shift not found');
        }

        /* ---------------- MERGED VALUES ---------------- */
        const startTime = data.startTime || existingShift.startTime;
        const endTime = data.endTime || existingShift.endTime;

        const breakDuration =
            data.breakDuration !== undefined ? data.breakDuration : existingShift.breakDuration;

        const excludeBreakFromWorkingHours =
            data.excludeBreakFromWorkingHours !== undefined
                ? data.excludeBreakFromWorkingHours
                : existingShift.excludeBreakFromWorkingHours;

        const allowHalfDay =
            data.allowHalfDay !== undefined ? data.allowHalfDay : existingShift.allowHalfDay;


        /* ---------------- TIME VALIDATION ---------------- */
        const startMin = parseTimeToMinutes(startTime);
        const endMin = parseTimeToMinutes(endTime);

        if (startMin === null || endMin === null) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid time format'
            });
        }

        const shiftDuration =
            endMin >= startMin ? endMin - startMin : (1440 - startMin) + endMin;

        if (!Number.isInteger(breakDuration) || breakDuration < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid break duration'
            });
        }

        if (breakDuration > shiftDuration) {
            return res.status(400).json({
                status: 'error',
                message: 'Break duration cannot exceed shift duration'
            });
        }

        /* ---------------- NET WORKING TIME ---------------- */
        const netWorkingTime = excludeBreakFromWorkingHours
            ? shiftDuration - breakDuration
            : shiftDuration;

        /* ---------------- COMPULSORY HOURS ---------------- */
        let compulsoryMinutes;

        if (
            data.compulsoryWorkHours === undefined ||
            data.compulsoryWorkHours === null ||
            data.compulsoryWorkHours === ''
        ) {
            compulsoryMinutes = netWorkingTime;
        } else {
            const parsed = parseTimeToMinutes(data.compulsoryWorkHours);
            if (parsed === null) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid compulsory work hours format'
                });
            }

            if (parsed > netWorkingTime) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Compulsory work hours exceed net working time'
                });
            }

            compulsoryMinutes = parsed;
        }

        /* ---------------- HALF DAY VALIDATION ---------------- */
        let firstHalfOffSecondHalfStartAt =
            data.firstHalfOffSecondHalfStartAt || existingShift.firstHalfOffSecondHalfStartAt;

        let secondHalfOffFirstHalfEndAt =
            data.secondHalfOffFirstHalfEndAt || existingShift.secondHalfOffFirstHalfEndAt;

        if (allowHalfDay) {
            if (!firstHalfOffSecondHalfStartAt || !secondHalfOffFirstHalfEndAt) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Half-day enabled but timings missing'
                });
            }
        } else {
            firstHalfOffSecondHalfStartAt = null;
            secondHalfOffFirstHalfEndAt = null;
        }



        /* ---------------- FINAL UPDATE ---------------- */
        const finalUpdate = {
            ...data,
            startTime: minutesToHHMM(startMin),
            endTime: minutesToHHMM(endMin),
            breakDuration,
            excludeBreakFromWorkingHours,
            compulsoryWorkHours: compulsoryMinutes,
            allowHalfDay,
            firstHalfOffSecondHalfStartAt,
            secondHalfOffFirstHalfEndAt,
            updatedBy: req.userId
        };

        const updatedShift = await ShiftModel.findByIdAndUpdate(
            shiftId,
            finalUpdate,
            { new: true }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Shift updated successfully',
            data: updatedShift
        });

    } catch (error) {
        console.error('updateShift error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteShift = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'Organization UUID missing');
        }

        const { ShiftModel } = await initModels(org_uuid);
        const { shiftId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return sendResponse(res, 400, false, 'Invalid shift ID');
        }

        const shift = await ShiftModel.findById(shiftId);
        if (!shift) {
            return sendResponse(res, 404, false, 'Shift not found');
        }

        if (shift.employees && shift.employees.length > 0) {
            return sendResponse(res, 400, false, `Cannot delete shift. ${shift.employees.length} employees are still assigned to this shift. Please reassign them before deleting the shift.`);
        }

        await ShiftModel.findByIdAndDelete(shiftId);
        return sendResponse(res, 200, true, 'Shift deleted successfully');
    } catch (error) {
        console.error('deleteShift error:', error);
        return handleError(res, error, 500);
    }
};

exports.getShiftById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'Organization UUID missing');
        }

        const { ShiftModel } = await initModels(org_uuid);
        const { shiftId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return sendResponse(res, 400, false, 'Invalid shift ID');
        }

        const shift = await ShiftModel.findById(shiftId).populate('employees');
        if (!shift) {
            return sendResponse(res, 404, false, 'Shift not found');
        }

        return sendResponse(res, 200, true, 'Shift retrieved successfully', shift);
    } catch (error) {
        console.error('getShiftById error:', error);
        return handleError(res, error, 500);
    }
};

exports.getAllShifts = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'Organization UUID missing');
        }

        const { ShiftModel } = await initModels(org_uuid);

        // Query params with validation
        let { page = 1, limit = 10, search = '', organizationId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        page = Math.max(1, parseInt(page) || 1);
        limit = Math.min(100, Math.max(1, parseInt(limit) || 10));

        // Build filter
        const filter = {};
        if (organizationId) {
            filter.organizationId = organizationId;
        }

        // Safe search (escape regex special chars)
        if (search && search.toString().trim()) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Deterministic sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const totalShifts = await ShiftModel.countDocuments(filter);

        const shifts = await ShiftModel.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('employees')
            .lean();

        return sendResponse(res, 200, true, 'Shifts retrieved successfully', {
            data: shifts,
            pagination: {
                total: totalShifts,
                page,
                limit,
                totalPages: Math.ceil(totalShifts / limit) || 0
            }
        });
    } catch (error) {
        console.error('getAllShifts error:', error);
        return handleError(res, error, 500);
    }
};

exports.addEmployeeToShift = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, 'Organization UUID missing');
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.shiftId)) {
            return sendResponse(res, 400, false, 'Invalid shift ID');
        }

        const { ShiftModel, EmployeeModel, ShiftAssignModel } = await initModels(org_uuid);
        const { shiftId } = req.params;
        const { employeeIds, effectiveFrom } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return sendResponse(res, 400, false, 'Employee IDs must be a non-empty array');
        }

        const shift = await ShiftModel.findById(shiftId);
        if (!shift) {
            return sendResponse(res, 404, false, 'Shift not found');
        }

        const effFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();

        const successfullyAdded = [];
        const alreadyAssigned = [];
        const errors = [];

        await Promise.all(
            employeeIds.map(async (employeeId) => {
                const employee = await EmployeeModel.findById(employeeId);
                if (!employee) {
                    errors.push({ employeeId, message: 'Employee not found' });
                    return;
                }

                const currentShiftId = employee.shiftId ? String(employee.shiftId) : null;
                const currentShift = currentShiftId
                    ? await ShiftModel.findById(currentShiftId).select('employees')
                    : null;
                const listedOnCurrent = !!(currentShift?.employees || []).some(
                    id => String(id) === String(employeeId)
                );

                // Already on a real shift list. A deleted shiftId must not block a new add.
                if (currentShift && listedOnCurrent) {
                    alreadyAssigned.push({
                        employeeId,
                        employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                        shiftId: employee.shiftId,
                        message: 'Already assigned'
                    });
                    return;
                }

                // shiftId points at a deleted shift, or the employee is missing from that shift's list.
                await ShiftAssignModel.updateMany(
                    {
                        employeeId,
                        $or: [
                            { effectiveTo: { $exists: false } },
                            { effectiveTo: null }
                        ]
                    },
                    { $set: { effectiveTo: effFrom } }
                );

                await ShiftAssignModel.create({
                    employeeId,
                    shiftId,
                    effectiveFrom: effFrom
                });

                await Promise.all([
                    ShiftModel.findByIdAndUpdate(shiftId, { $addToSet: { employees: employeeId } }),
                    EmployeeModel.findByIdAndUpdate(employeeId, { $set: { shiftId } })
                ]);

                successfullyAdded.push({ employeeId, employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() });
            })
        );

        const updatedShift = await ShiftModel.findById(shiftId);

        return res.status(200).json({
            status: 'success',
            message: 'Employees processed',
            data: { successfullyAdded, alreadyAssigned, errors, updatedShift }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

exports.removeEmployeeFromShift = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { ShiftModel, EmployeeModel, ShiftAssignModel } = await initModels(org_uuid);
        const { shiftId } = req.params;
        const { employeeIds, effectiveTo } = req.body;

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid shift ID' });
        }

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'employeeIds required' });
        }

        const ids = employeeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (!ids.length) {
            return res.status(400).json({ status: 'error', message: 'employeeIds required' });
        }

        const shift = await ShiftModel.findById(shiftId);
        if (!shift) {
            return res.status(404).json({ status: 'error', message: 'Shift not found' });
        }

        const effTo = effectiveTo ? new Date(effectiveTo) : new Date();

        await ShiftModel.findByIdAndUpdate(shiftId, {
            $pull: { employees: { $in: ids } }
        });

        await EmployeeModel.updateMany(
            { _id: { $in: ids }, shiftId },
            { $set: { shiftId: null } }
        );

        await ShiftAssignModel.updateMany(
            {
                employeeId: { $in: ids },
                shiftId,
                $or: [
                    { effectiveTo: { $exists: false } },
                    { effectiveTo: null }
                ]
            },
            { $set: { effectiveTo: effTo } }
        );

        const updatedShift = await ShiftModel.findById(shiftId);

        return res.status(200).json({
            status: 'success',
            message: 'Employees removed successfully',
            data: { updatedShift }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

exports.getShiftEmployees = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { ShiftModel, EmployeeModel } = await initModels(org_uuid);

        const { shiftId } = req.params;
        const { search = '', page = 1, limit = 10 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid shift ID' });
        }

        const shift = await ShiftModel.findById(shiftId).select('employees');
        if (!shift) {
            return res.status(404).json({
                status: 'error',
                message: 'Shift not found'
            });
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const searchText = String(search || '').trim();
        const filter = { _id: { $in: shift.employees || [] } };

        if (searchText) {
            filter.$or = [
                { firstName: { $regex: searchText, $options: 'i' } },
                { lastName: { $regex: searchText, $options: 'i' } },
                { email: { $regex: searchText, $options: 'i' } }
            ];
        }

        const [employees, count] = await Promise.all([
            EmployeeModel.find(filter)
                .select('firstName lastName email status')
                .sort({ firstName: 1, lastName: 1 })
                .skip((pageNum - 1) * pageLimit)
                .limit(pageLimit)
                .lean(),
            EmployeeModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            status: 'success',
            message: 'Employees fetched successfully',
            data: employees,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.max(1, Math.ceil(count / pageLimit)),
                totalEmployees: count
            }
        });
    } catch (error) {
        console.error('Error fetching shift employees:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.transferEmployeesBetweenShifts = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { ShiftModel, EmployeeModel, ShiftAssignModel } = await initModels(org_uuid);
        const { fromShiftId, toShiftId, employeeIds, effectiveFrom } = req.body;

        if (!mongoose.Types.ObjectId.isValid(fromShiftId) || !mongoose.Types.ObjectId.isValid(toShiftId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid shift ID' });
        }

        if (String(fromShiftId) === String(toShiftId)) {
            return res.status(400).json({ status: 'error', message: 'Choose a different shift' });
        }

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'employeeIds required' });
        }

        const [fromShift, toShift] = await Promise.all([
            ShiftModel.findById(fromShiftId).select('employees'),
            ShiftModel.findById(toShiftId).select('_id')
        ]);

        if (!fromShift || !toShift) {
            return res.status(404).json({ status: 'error', message: 'Shift not found' });
        }

        const memberIds = new Set((fromShift.employees || []).map(id => id.toString()));
        const effFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();

        const successfullyTransferred = [];
        const notInFromShift = [];
        const errors = [];

        await Promise.all(
            employeeIds.map(async (employeeId) => {
                if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                    errors.push({ employeeId, message: 'Invalid employee id' });
                    return;
                }

                const employee = await EmployeeModel.findById(employeeId);
                if (!employee) {
                    errors.push({ employeeId, message: 'Employee not found' });
                    return;
                }

                const assignedHere = employee.shiftId?.toString() === String(fromShiftId)
                    || memberIds.has(String(employeeId));

                if (!assignedHere) {
                    notInFromShift.push({
                        employeeId,
                        employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                        currentShiftId: employee.shiftId
                    });
                    return;
                }

                const openAssigns = await ShiftAssignModel.find({
                    employeeId,
                    shiftId: fromShiftId,
                    $or: [
                        { effectiveTo: { $exists: false } },
                        { effectiveTo: null }
                    ]
                });

                const closeTo = dayBefore(effFrom);
                await Promise.all(
                    openAssigns.map(async (hist) => {
                        hist.effectiveTo = closeTo;
                        await hist.save();
                    })
                );

                await ShiftAssignModel.create({
                    employeeId,
                    shiftId: toShiftId,
                    effectiveFrom: effFrom
                });

                await Promise.all([
                    ShiftModel.findByIdAndUpdate(fromShiftId, { $pull: { employees: employeeId } }),
                    ShiftModel.findByIdAndUpdate(toShiftId, { $addToSet: { employees: employeeId } }),
                    EmployeeModel.findByIdAndUpdate(employeeId, { $set: { shiftId: toShiftId } })
                ]);

                successfullyTransferred.push({ employeeId, employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() });
            })
        );

        const updatedFromShift = await ShiftModel.findById(fromShiftId);
        const updatedToShift = await ShiftModel.findById(toShiftId);

        if (!successfullyTransferred.length) {
            return res.status(400).json({
                status: 'error',
                message: notInFromShift.length
                    ? 'Selected employees are not assigned to this shift'
                    : 'No employees transferred',
                data: { successfullyTransferred, notInFromShift, errors }
            });
        }

        return res.status(200).json({
            status: 'success',
            message: notInFromShift.length
                ? `${successfullyTransferred.length} transferred, ${notInFromShift.length} skipped`
                : 'Employees transferred',
            data: { successfullyTransferred, notInFromShift, errors, updatedFromShift, updatedToShift }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// Bulk Add Shifts
exports.bulkAddShifts = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: "error",
                message: "org uuid not found",
            });
        }

        const { ShiftModel } = await initModels(org_uuid);

        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        let shiftRecords = [];

        // Handle CSV files
        if (req.file.mimetype === "text/csv") {
            const results = [];
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on("data", (row) => results.push(row))
                .on("end", async () => {
                    await processShifts(results, ShiftModel, res, {
                        organizationId: req.body.organizationId,
                        userId: req.userId
                    });
                });
        }
        // Handle Excel files
        else if (req.file.mimetype.includes("excel") || req.file.mimetype.includes("spreadsheet")) {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            shiftRecords = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            await processShifts(shiftRecords, ShiftModel, res, {
                organizationId: req.body.organizationId,
                userId: req.userId
            });
        }
    } catch (error) {
        console.error("Error processing bulk shift upload:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

// Process Shifts Helper Function (UPDATED – aligned with addShift)
async function processShifts(shiftData, ShiftModel, res, meta = {}) {
    const requiredFields = ['name', 'startTime', 'endTime'];
    const errors = [];
    const successes = [];

    // Validate organizationId
    if (!meta.organizationId) {
        return res.status(400).json({
            status: 'error',
            message: 'organizationId is required in request body'
        });
    }

    const WEEKLY_OFF_TEMPLATE = {
        firstWeek: { days: [] },
        secondWeek: { days: [] },
        thirdWeek: { days: [] },
        fourthWeek: { days: [] },
        fifthWeek: { days: [] }
    };

    const validateHHMM = (time) =>
        typeof time === 'string' &&
        /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(time);

    const parseTimeToMinutes = (time) => {
        if (!validateHHMM(time)) return null;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToHHMM = (min) =>
        `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

    // Parse boolean from string or boolean
    const parseBoolean = (value, defaultValue = false) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
        }
        return defaultValue;
    };

    // Get existing shift names for this organization only
    const existingNames = new Set(
        (await ShiftModel.find({ organizationId: meta.organizationId }, 'name').lean())
            .map(s => s.name.toLowerCase())
    );

    for (const record of shiftData) {
        try {
            const missing = requiredFields.filter(
                f => !record[f] || String(record[f]).trim() === ''
            );

            if (missing.length) {
                errors.push({ name: record.name || 'Unknown', message: `Missing: ${missing.join(', ')}` });
                continue;
            }

            let {
                name,
                shortName,
                startTime,
                endTime,
                breakDuration = 0,
                compulsoryWorkHours,
                excludeBreakFromWorkingHours = true,
                allowHalfDay = false,
                firstHalfOffSecondHalfStartAt,
                secondHalfOffFirstHalfEndAt,
                weeklyOff,
                status = 'active'
            } = record;

            // Parse booleans properly (CSV/Excel may send strings)
            excludeBreakFromWorkingHours = parseBoolean(excludeBreakFromWorkingHours, true);
            allowHalfDay = parseBoolean(allowHalfDay, false);

            status = status.toLowerCase();
            if (!['active', 'inactive'].includes(status)) status = 'active';

            if (existingNames.has(name.toLowerCase())) {
                errors.push({ name, message: 'Duplicate shift name' });
                continue;
            }

            const startM = parseTimeToMinutes(startTime);
            const endM = parseTimeToMinutes(endTime);

            if (startM === null || endM === null) {
                errors.push({ name, message: 'Invalid time format HH:mm' });
                continue;
            }

            const duration =
                endM >= startM ? endM - startM : 1440 - startM + endM;

            breakDuration = Number(breakDuration);
            if (!Number.isInteger(breakDuration) || breakDuration < 0 || breakDuration > duration) {
                errors.push({ name, message: 'Invalid break duration' });
                continue;
            }

            const netTime = excludeBreakFromWorkingHours
                ? duration - breakDuration
                : duration;

            let compulsoryMinutes = netTime;
            if (compulsoryWorkHours) {
                const parsed = parseTimeToMinutes(compulsoryWorkHours);
                if (parsed === null || parsed > netTime) {
                    errors.push({ name, message: 'Invalid compulsory work hours' });
                    continue;
                }
                compulsoryMinutes = parsed;
            }

            if (allowHalfDay) {
                if (
                    !validateHHMM(firstHalfOffSecondHalfStartAt) ||
                    !validateHHMM(secondHalfOffFirstHalfEndAt)
                ) {
                    errors.push({ name, message: 'Invalid half-day timings' });
                    continue;
                }
            } else {
                firstHalfOffSecondHalfStartAt = null;
                secondHalfOffFirstHalfEndAt = null;
            }

            if (enableAutoClockOut) {
                const parsedMinutes = Number(autoClockOutAfterMinutes);
                if (isNaN(parsedMinutes) || !Number.isInteger(parsedMinutes) || parsedMinutes <= 0) {
                    errors.push({ name, message: 'Invalid auto clock-out minutes' });
                    continue;
                }
                autoClockOutAfterMinutes = parsedMinutes;
            } else {
                autoClockOutAfterMinutes = null;
            }

            const payload = {
                name,
                shortName,
                startTime: minutesToHHMM(startM),
                endTime: minutesToHHMM(endM),
                breakDuration,
                compulsoryWorkHours: compulsoryMinutes,
                excludeBreakFromWorkingHours,
                allowHalfDay,
                firstHalfOffSecondHalfStartAt,
                secondHalfOffFirstHalfEndAt,
                weeklyOff: weeklyOff || WEEKLY_OFF_TEMPLATE,
                status,
                organizationId: meta.organizationId,
                createdBy: meta.userId
            };

            await ShiftModel.create(payload);
            successes.push({ name });
            existingNames.add(name.toLowerCase());

        } catch (err) {
            errors.push({ name: record.name || 'Unknown', message: err.message });
        }
    }

    return res.status(errors.length ? 207 : 201).json({
        status: errors.length ? 'partial_success' : 'success',
        data: { successes, errors }
    });
}

exports.getEmployeeShiftHistory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return sendResponse(res, 404, false, 'org uuid not found');

        const { ShiftAssignModel } = await initModels(org_uuid);

        const {
            employeeId,
            from,
            to,
            page = 1,
            limit = 20,
            sort = 'desc' // optional: asc | desc
        } = req.query;

        const pageInt = Math.max(1, parseInt(page, 10) || 1);
        const limitInt = Math.max(1, parseInt(limit, 10) || 20);
        const skip = (pageInt - 1) * limitInt;
        const sortOrder = sort === 'asc' ? 1 : -1;

        // build base query
        const q = {};

        // validate and add employeeId if provided
        if (employeeId) {
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return sendResponse(res, 400, false, 'Invalid employeeId');
            }
            q.employeeId = new mongoose.Types.ObjectId(employeeId);
        }

        // parse dates if provided
        let fromDate = null;
        let toDate = null;
        if (from) {
            fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return sendResponse(res, 400, false, 'Invalid from date');
            }
        }
        if (to) {
            toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return sendResponse(res, 400, false, 'Invalid to date');
            }
        }

        if (fromDate && toDate) {
            q.$and = [
                { effectiveFrom: { $lte: toDate } },
                {
                    $or: [
                        { effectiveTo: { $exists: false } },
                        { effectiveTo: { $gte: fromDate } }
                    ]
                }
            ];
        } else if (fromDate) {
            q.$or = [
                { effectiveTo: { $exists: false } },
                { effectiveTo: { $gte: fromDate } },
                { effectiveFrom: { $gte: fromDate } }
            ];
        } else if (toDate) {
            q.effectiveFrom = { $lte: toDate };
        }

        const shifts = await ShiftAssignModel.find(q)
            .populate('shiftId', 'name startTime endTime')
            .sort({ effectiveFrom: sortOrder })
            .skip(skip)
            .limit(limitInt)
            .lean();

        const totalShifts = await ShiftAssignModel.countDocuments(q);

        return sendResponse(res, 200, true, 'Shift history fetched', {
            data: shifts,
            pagination: {
                total: totalShifts,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(totalShifts / limitInt)
            }
        });
    } catch (err) {
        console.error('getEmployeeShiftHistory error:', err);
        return handleError(res, err, 500);
    }
};

exports.getEmployeesNotInShift = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { EmployeeModel } = await initModels(org_uuid);


        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = req.query.status;
        const organizationId = req.query.organizationId;

        // ---------- FILTER ----------
        // Use aggregation to find employees not assigned to any existing shift
        const pipeline = [
            {
                $lookup: {
                    from: 'shifts',
                    localField: 'shiftId',
                    foreignField: '_id',
                    as: 'shift'
                }
            },
            {
                $match: {
                    $or: [
                        { shiftId: { $exists: false } },
                        { shiftId: null },
                        { shift: { $size: 0 } } // shiftId exists but shift not found
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

exports.getShiftsDropdown = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid is required in headers");
        }

        const { search, organizationId } = req.query;

        const { ShiftModel } = await initModels(org_uuid);

        // Build search filter
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { shortName: { $regex: search, $options: 'i' } }
            ];
        }
        if (organizationId) {
            filter.organizationId = organizationId;
        }

        // Fetch shifts with only required fields for dropdown
        const shifts = await ShiftModel.find(filter)
            .select('_id name shortName startTime endTime organizationId status')
            .sort({ name: 1 })
            .lean();

        return sendResponse(
            res,
            200,
            true,
            "Shifts fetched successfully",
            shifts
        );

    } catch (error) {
        console.error("getShiftsDropdown error:", error);
        return handleError(res, error);
    }
};