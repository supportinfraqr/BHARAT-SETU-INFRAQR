const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const csv = require('csv-parser');
const fs = require('fs');
const xlsx = require('xlsx');
const moment = require("moment");
const { parse, isValid } = require('date-fns');

function parseDateSafe(date) {
    if (typeof date === "number") {
        // ✅ Excel serial number
        if (!Number.isInteger(date) || date <= 0) return null;
        const baseDate = new Date(Date.UTC(1900, 0, 1));
        const offsetDays = date > 60 ? 2 : 1;
        return new Date(baseDate.getTime() + (date - offsetDays) * 86400000);
    }

    if (typeof date === "string") {
        // ✅ Allow both MM/dd/yyyy and MM-dd-yyyy
        const formats = ["MM/dd/yyyy", "MM-dd-yyyy"];
        let parsed = null;

        for (let fmt of formats) {
            const temp = parse(date, fmt, new Date());
            if (isValid(temp)) {
                parsed = temp;
                break;
            }
        }

        if (!parsed) return null;

        // Return as true UTC date (without timezone shift)
        return new Date(Date.UTC(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate()
        ));
    }

    return null;
}

exports.addHoliday = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org_uuid not found'
            });
        }

        const { HolidayModel } = await initModels(org_uuid);
        const createId = req.empId;
        const { holidayName, description, date, type, locationId } = req.body;

        // Validate required fields
        if (!holidayName || !date || !type || !locationId) {
            return res.status(400).json({
                status: 'error',
                message: 'holidayName, date, type, and locationId are required'
            });
        }

        // Parse date using parseDateSafe
        const finalDate = parseDateSafe(date);
        if (!finalDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid date format. Must be MM/DD/YYYY, "MM-dd-yyyy" or Excel serial number'
            });
        }

        // Validate date range (e.g., 1970–2100)
        const minDate = new Date(Date.UTC(1970, 0, 1));
        const maxDate = new Date(Date.UTC(2100, 11, 31));
        if (finalDate < minDate || finalDate > maxDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Date must be between 1970 and 2100'
            });
        }

        // Check for duplicate holiday
        const existingHoliday = await HolidayModel.findOne({
            holidayName,
            date: finalDate,
            location: locationId
        });

        if (existingHoliday) {
            return res.status(400).json({
                status: 'error',
                message: 'A holiday with this name, date, and location already exists'
            });
        }

        const newHoliday = new HolidayModel({
            holidayName,
            description,
            date: finalDate,
            type,
            location: locationId,
            createdBy: createId
        });

        const savedHoliday = await newHoliday.save();

        return res.status(201).json({
            status: 'success',
            message: 'Holiday added successfully',
            data: savedHoliday
        });
    } catch (error) {
        console.error('Error adding holiday:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.updateHoliday = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { HolidayModel } = await initModels(org_uuid);
        const { holidayId } = req.params;

        const updateData = req.body;

        // ✅ Parse date only if provided
        if (updateData.date) {
            const finalDate = parseDateSafe(updateData.date);
            if (!finalDate) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid date format. Must be MM/DD/YYYY, "MM-dd-yyyy" or Excel serial number'
                });
            }
            updateData.date = finalDate;
        }

        // ✅ Duplicate check (ignore current holidayId)
        if (updateData.holidayName || updateData.date || updateData.locationId) {
            const duplicateCheck = await HolidayModel.findOne({
                _id: { $ne: holidayId }, // ignore current record
                holidayName: updateData.holidayName,
                date: updateData.date,
                location: updateData.location
            });

            if (duplicateCheck) {
                return res.status(400).json({
                    status: 'error',
                    message: 'A holiday with this name, date, and location already exists'
                });
            }
        }

        // ✅ Proceed to update
        const updatedHoliday = await HolidayModel.findByIdAndUpdate(
            holidayId,
            updateData,
            { new: true }
        );

        if (!updatedHoliday) {
            return res.status(404).json({ status: 'error', message: 'Holiday not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Holiday updated successfully',
            data: updatedHoliday,
        });
    } catch (error) {
        console.error('Error updating holiday:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};


exports.deleteHoliday = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { HolidayModel } = await initModels(org_uuid);

        const { holidayId } = req.params;

        const holiday = await HolidayModel.findByIdAndDelete(holidayId);
        if (!holiday) {
            return res.status(404).json({ status: 'error', message: 'Holiday not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Holiday deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getHolidayById = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { HolidayModel } = await initModels(org_uuid);

        const { holidayId } = req.params;

        const holiday = await HolidayModel.findById(holidayId).populate("location");
        if (!holiday) {
            return res.status(404).json({ status: 'error', message: 'Holiday not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Holiday retrieved successfully',
            data: holiday
        });
    } catch (error) {
        console.error('Error retrieving holiday:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getAllHolidays = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { HolidayModel } = await initModels(org_uuid);

        const {
            page = 1,
            limit = 10,
            holidayName = '',
            type = '',
            status = '',
            startDate,
            endDate,
            locationId
        } = req.query;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        const searchFilter = {
            ...(holidayName && { holidayName: { $regex: holidayName, $options: 'i' } }),
            ...(type && { type }),
            ...(status && { status }),
            ...(locationId && { location: locationId })
        };

        if (startDate && endDate) {
            searchFilter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (startDate) {
            searchFilter.date = { $gte: new Date(startDate) };
        } else if (endDate) {
            searchFilter.date = { $lte: new Date(endDate) };
        }

        const totalHolidays = await HolidayModel.countDocuments(searchFilter);

        const holidays = await HolidayModel.find(searchFilter)
            .populate("location")
            .sort({ date: 1 }) // Sort by date in ascending order
            .skip((pageInt - 1) * limitInt)
            .limit(limitInt);

        return res.status(200).json({
            status: 'success',
            message: 'Holidays retrieved successfully',
            data: holidays,
            pagination: {
                total: totalHolidays,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(totalHolidays / limitInt)
            }
        });
    } catch (error) {
        console.error('Error retrieving holidays:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// Bulk add holidays
exports.bulkAddHolidays = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { HolidayModel } = await initModels(org_uuid);
        const createId = req.empId;
        const { locationId } = req.body;

        if (!locationId) {
            return res.status(400).json({ message: 'locationId is required' });
        }

        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const holidayRecords = [];

        // Handle CSV files
        if (req.file.mimetype === 'text/csv') {
            // Read the file buffer and process it as a stream
            const bufferStream = new Readable();
            bufferStream.push(req.file.buffer);
            bufferStream.push(null);

            bufferStream.pipe(csv())
                .on('data', (row) => {
                    // Push each row into the holidayRecords array
                    holidayRecords.push(row);
                })
                .on('end', async () => {
                    await processHolidays(holidayRecords, HolidayModel, createId, locationId, res);
                });
        }
        // Handle Excel files
        else if (req.file.mimetype.includes('excel') || req.file.mimetype.includes('spreadsheet')) {
            // Process the Excel file directly from the buffer
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0]; // Assuming first sheet
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            await processHolidays(data, HolidayModel, createId, locationId, res);
        }

    } catch (error) {
        console.error('Error processing bulk holiday upload:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// Process Holidays Helper Functio
async function processHolidays(holidayData, HolidayModel, createId, locationId, res) {
    const requiredFields = ["holidayName", "date", "type"];
    const errors = [];
    const successes = [];

    for (const record of holidayData) {
        try {
            // Validate required fields
            const missingFields = requiredFields.filter((field) => {
                const value = record[field];
                return !value || (typeof value === "string" && value.trim() === "");
            });

            if (missingFields.length > 0) {
                errors.push({
                    record,
                    message: `Missing required fields: ${missingFields.join(", ")}`,
                });
                continue;
            }

            const { holidayName, date, description, type } = record;

            // Parse date using parseDateSafe
            const finalDate = parseDateSafe(date);
            if (!finalDate) {
                errors.push({
                    holidayName: holidayName || "Unknown",
                    date: date || "Unknown",
                    message: `Invalid date format: ${date}. Supported formats: MM/DD/YYYY, "MM-dd-yyyy" or Excel serial number`
                });
                continue;
            }

            // Validate date range (1970–2100)
            const minDate = new Date(Date.UTC(1970, 0, 1));
            const maxDate = new Date(Date.UTC(2100, 11, 31));
            if (finalDate < minDate || finalDate > maxDate) {
                errors.push({
                    holidayName: holidayName || "Unknown",
                    date: date || "Unknown",
                    message: 'Date must be between 1970 and 2100'
                });
                continue;
            }

            // Check for duplicate holidays
            const existingHoliday = await HolidayModel.findOne({
                holidayName,
                date: finalDate,
                location: locationId
            });

            if (existingHoliday) {
                errors.push({
                    holidayName,
                    date: finalDate,
                    message: "A holiday with this name, date, and location already exists"
                });
                continue;
            }

            const newHoliday = new HolidayModel({
                holidayName,
                date: finalDate,
                description,
                location: locationId,
                type,
                createdBy: createId
            });

            await newHoliday.save();

            successes.push({
                holidayName,
                date: finalDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
            });

        } catch (error) {
            errors.push({
                holidayName: record.holidayName || "Unknown",
                date: record.date || "Unknown",
                message: error.message
            });
        }
    }

    return res.status(errors.length > 0 ? 207 : 201).json({
        status: errors.length > 0 ? "partial_success" : "success",
        message: errors.length > 0
            ? "Some holidays were not added due to validation errors or duplicates"
            : "All holiday records added successfully",
        successes,
        errors
    });
}


// controller/holidayController.js
exports.generateWeekoffs = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        const createdBy = req.empId;
        if (!org_uuid) {
            return res.status(400).json({ status: "error", message: "org_uuid required" });
        }

        const { HolidayModel } = await initModels(org_uuid);

        const {
            startDate,
            endDate,
            rules,
            locationId,
            type = "weekoff",
            holidayNamePrefix = "",
            skipDuplicates = true,
            overwrite = false
        } = req.body;

        if (!startDate || !endDate || !rules || !Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ status: "error", message: "startDate, endDate and rules[] are required" });
        }
        if (!locationId) {
            return res.status(400).json({ status: "error", message: "locationId is required" });
        }

        // ✅ Use parseDateSafe
        const start = parseDateSafe(startDate);
        const end = parseDateSafe(endDate);

        if (!start || !end || start > end) {
            return res.status(400).json({ status: "error", message: "Invalid startDate or endDate" });
        }

        // Normalize rules
        const normalizedRules = (rules || []).map(r => {
            const weeks = (r.weeks || []).map(w => {
                if (typeof w === "string" && w.toLowerCase() === "all") return "all";
                return Number(w);
            });
            return { day: r.day, weeks };
        });

        const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

        function getWeekOfMonth(date) {
            return Math.ceil(date.getUTCDate() / 7);
        }

        // Build candidates
        const candidates = [];
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const current = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
            const dayNum = current.getUTCDay(); // ✅ UTC day
            const weekOfMonth = getWeekOfMonth(current);

            for (const rule of normalizedRules) {
                const ruleDayNum = dayMap[rule.day];
                if (dayNum !== ruleDayNum) continue;

                if (rule.weeks.includes("all") || rule.weeks.includes(weekOfMonth)) {
                    const isoDate = current.toISOString().slice(0, 10);
                    candidates.push({
                        holidayName: `${holidayNamePrefix ? holidayNamePrefix + " " : ""}${rule.day} Weekoff`,
                        description: `Auto-generated (${rule.day})`,
                        date: current, // ✅ already UTC midnight
                        type,
                        location: locationId,
                        createdBy,
                        status: "Active",
                        _dateStr: isoDate
                    });
                }
            }
        }

        if (candidates.length === 0) {
            return res.status(200).json({ status: "success", message: "No weekoffs matched rules in given range", data: [] });
        }

        // Overwrite case
        if (overwrite) {
            await HolidayModel.deleteMany({
                date: {
                    $gte: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)),
                    $lte: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999))
                },
                location: locationId,
                type
            });
        }

        // Dedupe if skipDuplicates
        let toInsert = candidates;
        if (skipDuplicates && !overwrite) {
            const existing = await HolidayModel.find({
                date: {
                    $gte: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0)),
                    $lte: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999))
                },
                location: locationId,
                type
            }, { date: 1 }).lean();

            const existSet = new Set(existing.map(e => new Date(e.date).toISOString().slice(0, 10)));
            toInsert = candidates.filter(c => !existSet.has(c._dateStr));
            toInsert.forEach(x => delete x._dateStr);
        } else {
            toInsert.forEach(x => delete x._dateStr);
        }


        if (toInsert.length === 0) {
            return res.status(200).json({ status: "success", message: "No new weekoffs to insert (duplicates skipped)", data: [] });
        }

        const inserted = await HolidayModel.insertMany(toInsert);

        return res.status(201).json({
            status: "success",
            message: "Weekoffs generated",
            count: inserted.length,
            data: inserted
        });

    } catch (err) {
        console.error("generateWeekoffs error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
};

