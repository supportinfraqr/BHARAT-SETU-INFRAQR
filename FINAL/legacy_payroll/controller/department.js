const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const xlsx = require("xlsx");
const csv = require("csv-parser");
const { sendResponse, handleError } = require('../utils/responce');


exports.createDepartment = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DepartmentModel } = await initModels(org_uuid);

        const { name, description, organizationId } = req.body;

        const department = new DepartmentModel({
            name,
            description,
            organizationId: organizationId || null

        });

        const savedDepartment = await department.save();

        return res.status(201).json({
            status: 'success',
            message: 'Department added successfully',
            data: savedDepartment
        });
    } catch (error) {
        console.error('Error adding Department:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getAllDepartments = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) return res.status(400).json({ status: 'error', message: 'org uuid not found' });

        const { DepartmentModel } = await initModels(org_uuid);
        let { page = 1, limit = 10, search = "", organizationId } = req.query;

        page = Math.max(1, parseInt(page) || 1);
        limit = Math.min(100, Math.max(1, parseInt(limit) || 10)); // cap limit

        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (organizationId) filter.organizationId = organizationId;

        const total = await DepartmentModel.countDocuments(filter);
        const departments = await DepartmentModel.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('employees'); // only if exists

        return res.status(200).json({
            status: 'success',
            message: 'Departments fetched successfully',
            data: departments,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error fetching Departments:', error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
    }
};

exports.getDepartment = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DepartmentModel } = await initModels(org_uuid);

        const { departmentId } = req.params;
        const department = await DepartmentModel.findById(departmentId).populate("employees");

        if (!department) {
            return res.status(404).json({
                status: 'error',
                message: 'Department not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Department fetched successfully',
            data: department
        });
    } catch (error) {
        console.error('Error fetching Department:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.updateDepartment = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DepartmentModel } = await initModels(org_uuid);

        const { departmentId } = req.params;
        const updateData = req.body;

        const department = await DepartmentModel.findByIdAndUpdate(
            departmentId,
            updateData,
            { new: true }
        );

        if (!department) {
            return res.status(404).json({
                status: 'error',
                message: 'Department not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Department updated successfully',
            data: department
        });
    } catch (error) {
        console.error('Error updating Department:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { DepartmentModel, EmployeeModel } = await initModels(org_uuid);
        const { departmentId } = req.params;

        // Fetch the department and check if employees are assigned
        const department = await DepartmentModel.findById(departmentId);
        if (!department) {
            return res.status(404).json({
                status: 'error',
                message: 'Department not found',
            });
        }

        // Check if the shift has assigned employees
        if (department.employees && department.employees.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete department. ${department.employees.length} employees are still assigned to this department.Please reassign them before deleting the department.`,
            });
        }

        // Proceed with deleting the department
        await DepartmentModel.findByIdAndDelete(departmentId);

        return res.status(200).json({
            status: 'success',
            message: 'Department deleted successfully.',
        });
    } catch (error) {
        console.error('Error deleting Department:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.addEmployeeToDepartment = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DepartmentModel, EmployeeModel } = await initModels(org_uuid);
        const { departmentId } = req.params;
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide a valid array of employee IDs'
            });
        }

        const successfullyAdded = [];
        const alreadyAssigned = [];

        for (const employeeId of employeeIds) {
            const employee = await EmployeeModel.findById(employeeId);
            if (!employee) {
                alreadyAssigned.push({ employeeId, message: 'Employee not found' });
                continue;
            }

            if (employee.departmentId) {
                alreadyAssigned.push({
                    employeeId,
                    employeeName: employee.name,
                    departmentId: employee.departmentId,
                    message: 'Employee is already assigned to a department'
                });
                continue;
            }

            await DepartmentModel.findByIdAndUpdate(
                departmentId,
                { $addToSet: { employees: employeeId } },
                { new: true }
            );

            const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
                employeeId,
                { $set: { departmentId: departmentId } },
                { new: true }
            );

            successfullyAdded.push(updatedEmployee);
        }

        return res.status(200).json({
            status: 'success',
            message: 'Employees processed successfully',
            data: {
                successfullyAdded,
                alreadyAssigned
            }
        });
    } catch (error) {
        console.error('Error adding Employees to Department:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.removeEmployeeFromDepartment = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DepartmentModel, EmployeeModel } = await initModels(org_uuid);
        const { departmentId } = req.params;
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'employeeId should be a non-empty array'
            });
        }

        const department = await DepartmentModel.findByIdAndUpdate(
            departmentId,
            { $pull: { employees: { $in: employeeIds } } },
            { new: true }
        );

        if (!department) {
            return res.status(404).json({
                status: 'error',
                message: 'Department not found'
            });
        }

        const employeeUpdates = employeeIds.map(id =>
            EmployeeModel.findByIdAndUpdate(id, { $set: { departmentId: null } }, { new: true })
        );
        const updatedEmployees = await Promise.all(employeeUpdates);

        const notFoundEmployees = updatedEmployees.filter(emp => !emp);
        if (notFoundEmployees.length > 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Some employees not found',
                missingEmployees: notFoundEmployees.map((_, i) => employeeIds[i])
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Employees removed from department successfully',
            data: department,
            updatedEmployees
        });
    } catch (error) {
        console.error('Error removing Employee from Department:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getDepartmentEmployees = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DepartmentModel } = await initModels(org_uuid);

        const { departmentId } = req.params;
        const { search = '', page = 1, limit = 10 } = req.query;

        const department = await DepartmentModel.findById(departmentId).populate({
            path: 'employees',
            match: {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ]
            },
            options: {
                skip: (page - 1) * limit,
                limit: parseInt(limit)
            }
        });

        if (!department) {
            return res.status(404).json({
                status: 'error',
                message: 'Department not found'
            });
        }

        const totalEmployees = await DepartmentModel.aggregate([
            { $match: { _id: department._id } },
            { $unwind: '$employees' },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employees',
                    foreignField: '_id',
                    as: 'employeeData'
                }
            },
            { $unwind: '$employeeData' },
            {
                $match: {
                    $or: [
                        { 'employeeData.name': { $regex: search, $options: 'i' } },
                        { 'employeeData.email': { $regex: search, $options: 'i' } }
                    ]
                }
            },
            { $count: 'total' }
        ]);

        const count = totalEmployees[0] ? totalEmployees[0].total : 0;

        return res.status(200).json({
            status: 'success',
            message: 'Employees fetched successfully',
            data: department.employees,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalEmployees: count
            }
        });
    } catch (error) {
        console.error('Error fetching department employees:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// Bulk Add Departments
exports.bulkAddDepartments = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: "error",
                message: "org uuid not found",
            });
        }

        const { DepartmentModel } = await initModels(org_uuid);
        const { organizationId } = req.body;


        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        let departmentRecords = [];

        // Handle CSV files
        if (req.file.mimetype === "text/csv") {
            const results = [];
            require("fs")
                .createReadStream(req.file.path)
                .pipe(csv())
                .on("data", (row) => results.push(row))
                .on("end", async () => {
                    await processDepartments(results, DepartmentModel, res, organizationId);
                });
        }
        // Handle Excel files
        else if (req.file.mimetype.includes("excel") || req.file.mimetype.includes("spreadsheet")) {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            departmentRecords = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            await processDepartments(departmentRecords, DepartmentModel, res, organizationId);
        }
    } catch (error) {
        console.error("Error processing bulk department upload:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

// Process Departments Helper Function
async function processDepartments(departmentData, DepartmentModel, res, organizationId) {
    const requiredFields = ["name", "description"];
    const errors = [];
    const successes = [];

    for (const record of departmentData) {
        try {
            // Validate required fields
            const missingFields = requiredFields.filter(
                (field) => !record[field] || (typeof record[field] === "string" && record[field].trim() === "")
            );

            if (missingFields.length > 0) {
                errors.push({
                    record,
                    message: `Missing required fields: ${missingFields.join(", ")}`,
                });
                continue;
            }

            const { name, description } = record;

            // Check for duplicate departments
            // const existingDepartment = await DepartmentModel.findOne({ name, organizationId });
            // if (existingDepartment) {
            //     errors.push({
            //         name,
            //         message: "A department with this name already exists",
            //     });
            //     continue;
            // }

            // Create and save new department
            const newDepartment = new DepartmentModel({ name, description, organizationId });
            await newDepartment.save();
            successes.push({ name });
        } catch (error) {
            errors.push({
                name: record.name || "Unknown",
                message: error.message,
            });
        }
    }

    return res.status(errors.length > 0 ? 207 : 201).json({
        status: errors.length > 0 ? "partial_success" : "success",
        message:
            errors.length > 0
                ? "Some departments were not added due to validation errors or duplicates"
                : "All department records added successfully",
        successes,
        errors,
    });
}

exports.getEmployeesNotInDepartment = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid not found");
        }

        const { EmployeeModel, DepartmentModel } = await initModels(org_uuid);


        // ---------- PAGINATION ----------
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = req.query.status;
        const organizationId = req.query.organizationId;

        // ---------- FILTER ----------
        const filters = {
            $or: [
                { departmentId: { $exists: false } },
                { departmentId: null },
                { status: { $ne: 'Inactive' } }
            ]
        };

        // Exclude inactive employees by default
        if (status) {
            filters.status = status;
        }

        if (search) {
            filters.$and = [{
                $or: [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { uniqueId: { $regex: search, $options: "i" } }
                ]
            }];
        }

        if (organizationId) {
            filters.organizationId = organizationId;
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

exports.getDepartmentsDropdown = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 400, false, "org_uuid is required in headers");
        }

        const { search, organizationId } = req.query;

        const { DepartmentModel } = await initModels(org_uuid);

        // Build search filter
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (organizationId) {
            filter.organizationId = organizationId;
        }

        // Fetch departments with only required fields for dropdown
        const departments = await DepartmentModel.find(filter)
            .select('_id name description organizationId')
            .sort({ name: 1 })
            .lean();

        return sendResponse(
            res,
            200,
            true,
            "Departments fetched successfully",
            departments
        );

    } catch (error) {
        console.error("getDepartmentsDropdown error:", error);
        return handleError(res, error);
    }
};