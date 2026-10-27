const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SystemUser = require('../models/systemUserModel');
const { initModels } = require('../models/indexModel');
const csv = require('csv-parser');
const fs = require('fs');
const xlsx = require('xlsx');
const { uploadFile } = require('../service/cloudUploade/clodeUpload');
const { set } = require('../models/organizationModel');
const path = require("path");
const moment = require('moment');
const UserJwt = require('../models/userJWTModel');
const { parse, isValid } = require("date-fns");
const { sendWelcomeEmail, sendPasswordChangeEmail, candidateJoiningEmail } = require('../service/nodemailer/mailerConfig');
const { resolveLoginUrl } = require('../config/systemConfig');
const { normalizeVpf, formatVpfResponse } = require('./payroll/vpfManagement');
const {
    calculateEpf,
    calculateEsi,
    calculateProfessionalTax,
} = require('../utils/payroll/statutoryCalculator');

function getRequestMeta(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0] : '';
    const ip = forwardedIp || req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip || '';
    return {
        ipAddress: String(ip).trim(),
        userAgent: req.headers['user-agent'] || '',
    };
}

async function writePasswordChangeLog(PasswordChangeLogModel, payload) {
    try {
        await PasswordChangeLogModel.create(payload);
    } catch (err) {
        console.error('Failed to write password change audit log:', err);
    }
}


exports.addEmployee = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { EmployeeModel, DepartmentModel, ShiftModel, UniqueIdModel, ShiftAssignModel } = await initModels(org_uuid);
        const createId = req.empId;
        const {
            empId,
            firstName,
            lastName,
            salutation,
            fatherSpouse,
            relation,
            displayName,
            email,
            password,
            categoryId,
            reportingManagerId,
            customId,
            categoryName,
            employeeType,
            demographics,
            handicappedInfo,
            nationalID,
            phone,
            photoUrl,
            presentAddress,
            permanentAddress,
            maritalInfo,
            emergencyContact,
            identificationDocument,
            jobTitle,
            status,
            activationString,
            departmentId,
            shiftId,
            salaryStructureId,
            organizationId,
            databaseName,
            organizationName,
            probationTime,
            positionsId,
            dateOfJoining,
            onboarding,
            payrollInfo,
            payrollPreferences,
            taxInfo,
            bankInfo,
            statutoryInfo,
            isInternationalEmployee,
            previousEmployment,
            qualificationInfo,
            familyDetails,
            nominationInfo,
            joiningDocuments
        } = req.body;

        // Check if the email already exists in the SystemUser model
        const emailExists = await SystemUser.findOne({ systemUserEmail: email });
        if (emailExists) {
            return res.status(409).json({ message: 'Email is already present in the database' });
        }

        // Handle dynamic unique ID for the organization
        let employeeUniqueId = await UniqueIdModel.findOne();
        if (!employeeUniqueId) {
            const orgPrefix = organizationName && organizationName.length >= 3
                ? organizationName.substring(0, 3).toUpperCase()
                : 'ORG';
            employeeUniqueId = new UniqueIdModel({
                name: orgPrefix,
                value: 1,
            });
        } else {
            employeeUniqueId.value += 1;
        }

        await employeeUniqueId.save();

        // 🔥 AUTO-CALCULATE PAYROLL INFO if baseSalary is provided but other fields are missing
        let finalPayrollInfo = payrollInfo;
        if (payrollInfo && payrollInfo.baseSalary && !payrollInfo.grossSalary) {
            // User provided baseSalary but not gross/CTC - auto-calculate
            const calculatedPayroll = await autoCalculatePayrollInfo(payrollInfo.baseSalary, org_uuid);
            finalPayrollInfo = {
                ...calculatedPayroll,
                ...payrollInfo // Override with any explicitly provided values
            };
            console.log('✅ Auto-calculated payroll info:', finalPayrollInfo);
        }

        // Create the new employee
        const newEmployee = new EmployeeModel({
            empId,
            firstName,
            lastName,
            salutation,
            fatherSpouse,
            relation,
            displayName,
            email,
            categoryId,
            reportingManagerId,
            customId,
            categoryName,
            employeeType,
            demographics: {
                dob: parseDateSafe(demographics.dob),
                gender: demographics.gender,
                nationality: demographics.nationality,
                religion: demographics.religion,
                qualification: demographics.qualification
            },
            handicappedInfo: {
                handicapped: parseDateSafe(handicappedInfo.handicapped),
                from: handicappedInfo.from,
                certificate: handicappedInfo.certificate
            },
            nationalID,
            phone,
            photoUrl,
            presentAddress,
            permanentAddress,
            maritalInfo,
            emergencyContact,
            identificationDocument,
            jobTitle,
            status,
            activationString,
            departmentId,
            shiftId,
            salaryStructureId,
            organizationId,
            uniqueId: `${employeeUniqueId.name}${employeeUniqueId.value.toString().padStart(5, '0')}`,
            createdBy: createId,
            probationTime,
            positionsId,
            dateOfJoining: parseDateSafe(dateOfJoining),
            onboarding,
            payrollInfo: finalPayrollInfo,
            payrollPreferences,
            taxInfo,
            bankInfo,
            statutoryInfo,
            isInternationalEmployee,
            previousEmployment,
            qualificationInfo,
            familyDetails,
            nominationInfo,
            joiningDocuments
        });

        const savedEmployee = await newEmployee.save();

        // Update department with the new employee
        if (departmentId) {
            await DepartmentModel.findByIdAndUpdate(
                departmentId,
                { $addToSet: { employees: savedEmployee._id } },
                { new: true }
            );
        }

        // Update shift with the new employee
        if (shiftId) {
            await Promise.all([
                ShiftModel.findByIdAndUpdate(
                    shiftId,
                    { $addToSet: { employees: savedEmployee._id } },
                    { new: true }
                ),
                ShiftAssignModel.create({
                    employeeId: savedEmployee._id,
                    shiftId,
                    effectiveFrom: parseDateSafe(dateOfJoining) || new Date()
                })
            ]);
        }

        // 🔗 PAYROLL INTEGRATION: Sync Salary Structure with Employee
        if (salaryStructureId) {
            const { SalaryStructureModel } = await initModels(org_uuid);
            const salaryStructure = await SalaryStructureModel.findById(salaryStructureId);
            
            if (salaryStructure) {
                // Add employee to salary structure's employees array
                await SalaryStructureModel.findByIdAndUpdate(
                    salaryStructureId,
                    { $addToSet: { employees: savedEmployee._id } },
                    { new: true }
                );

                // Auto-populate employee's payrollInfo from salary structure
                const payrollUpdate = {
                    'payrollInfo.baseSalary': salaryStructure.basicSalary?.totalAmount || 0,
                    'payrollInfo.grossSalary': salaryStructure.grossSalary || 0,
                    'payrollInfo.ctc': (salaryStructure.grossSalary || 0) * 12,
                    'payrollInfo.salaryEffectiveFrom': salaryStructure.effectiveFrom || new Date()
                };

                // Only update if payrollInfo was not explicitly provided
                if (!payrollInfo || !payrollInfo.baseSalary) {
                    await EmployeeModel.findByIdAndUpdate(
                        savedEmployee._id,
                        { $set: payrollUpdate },
                        { new: true }
                    );
                }
            }
        }

        // Create the associated system user
        const SystemUserData = new SystemUser({
            systemUserName: firstName,
            systemUserPassword: bcrypt.hashSync(password, 10),
            systemUserEmail: email,
            categoryId,
            linkSystemUser: {
                employeeId: savedEmployee._id,
                organizationId,
                databaseName: org_uuid,
                organizationName,
            },
        });

        await SystemUserData.save();


        // 🔔 YAHAN WELCOME MAIL BHEJO
        sendWelcomeEmail({
            org_uuid,
            employee: {
                ...savedEmployee.toObject(),
                organizationName, // safe side
            },
            loginEmail: email,
            rawPassword: password, // agar nahi bhejna to null kar do
            req,
        })
            .then((result) => {
                if (result.status === 'error') {
                    console.error('Welcome email failed:', result.message);
                }
            })
            .catch((err) => {
                console.error('Unexpected error while sending welcome email:', err);
            });


        return res.status(201).send({
            status: 'success',
            message: 'Employee saved successfully',
            data: savedEmployee,
        });
    } catch (error) {
        console.error('Error saving employee:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

// exports.updateEmployee = async (req, res) => {
//     try {
//         let org_uuid = req.headers.org_uuid
//         if (!org_uuid) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'org uuid not found'
//             });
//         }

//         const { EmployeeModel } = await initModels(org_uuid);

//         const { employeeId } = req.params;
//         const updateData = req.body;

//         const employee = await EmployeeModel.findByIdAndUpdate(
//             employeeId,
//             updateData,
//             { new: true }
//         );

//         if (!employee) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'Employee not found'
//             });
//         }

//         return res.status(200).json({
//             status: 'success',
//             message: 'Employee updated successfully',
//             data: employee,
//         });
//     } catch (error) {
//         console.error('Error updating employee:', error);
//         return res.status(500).send({
//             status: 'error',
//             message: 'Internal Server Error',
//             error: error.message,
//         });
//     }
// };

exports.deleteEmployee = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { EmployeeModel } = await initModels(org_uuid);

        const { employeeId } = req.params;

        const employee = await EmployeeModel.findByIdAndDelete(employeeId);
        if (!employee) {
            return res.status(404).json({ status: 'error', message: 'Employee not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Employee deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllEmployees = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { EmployeeModel } = await initModels(org_uuid);

        const {
            name,
            location,
            status,
            categoryId,
            departmentId,
            shiftId,
            orgId,
            employeeId
        } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        // Build search filters
        let filters = {};

        if (name) {
            filters.$or = [
                { firstName: { $regex: name, $options: 'i' } },
                { lastName: { $regex: name, $options: 'i' } }
            ];
        }

        if (employeeId) {
            filters.$or = [
                { uniqueId: { $regex: employeeId, $options: "i" } },
                { customId: { $regex: employeeId, $options: "i" } }
            ];
        }

        if (location) {
            filters.$or = [
                { 'address.city': { $regex: location, $options: 'i' } },
                { 'address.state': { $regex: location, $options: 'i' } },
                { 'address.country': { $regex: location, $options: 'i' } }
            ];
        }

        if (status) {
            filters.status = status;
        }

        if (orgId) {
            filters.organizationId = orgId;
        }

        if (categoryId) {
            filters.categoryId = categoryId;
        }

        if (departmentId) {
            filters.departmentId = departmentId;
        }

        if (shiftId) {
            filters.shiftId = shiftId;
        }

        // Fetch employees with filters and pagination
        const employees = await EmployeeModel.find(filters)
            .skip(skip)
            .limit(parseInt(limit))
            .populate(['categoryId', 'departmentId', 'shiftId', 'reportingManagerId'])
            .exec();

        // Get total count for pagination
        const totalEmployees = await EmployeeModel.countDocuments(filters);

        return res.status(200).json({
            status: 'success',
            message: 'Employees fetched successfully',
            data: {
                employees,
                totalPages: Math.ceil(totalEmployees / limit),
                currentPage: page,
                totalEmployees
            }
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getEmployeeById = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { EmployeeModel } = await initModels(org_uuid);

        const { employeeId } = req.params;
        const employee = await EmployeeModel.findById(employeeId).populate(['categoryId', 'departmentId', 'shiftId', 'reportingManagerId']);
        if (!employee) {
            return res.status(404).json({ status: 'error', message: 'Employee not found' });
        }
        return res.status(200).json({
            status: 'success',
            message: 'Employee fetched successfully',
            data: employee,
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

// Bulk add employees
exports.bulkAddEmployees = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({ status: 'error', message: 'org_uuid is missing' });
        }

        const { EmployeeModel, UniqueIdModel, ShiftModel, DepartmentModel } = await initModels(org_uuid);
        const createId = req.userId;

        const { organizationId, databaseName, organizationName, categoryId, categoryName, departmentId,
            shiftId } = req.body;

        // Check for missing required fields
        const missingFields = [];
        if (!organizationId) missingFields.push('organizationId');
        if (!databaseName) missingFields.push('databaseName');
        if (!organizationName) missingFields.push('organizationName');
        if (!categoryId) missingFields.push('categoryId');
        if (!categoryName) missingFields.push('categoryName');

        // If any field is missing, return an error with the missing field(s)
        if (missingFields.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Missing required field(s): ${missingFields.join(', ')}`
            });
        }

        // Validate file
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }

        const employees = await parseFile(req.file);

        if (!employees || employees.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No valid data found in the uploaded file' });
        }

        await processEmployees({
            org_uuid,
            EmployeeModel,
            UniqueIdModel,
            ShiftModel,
            DepartmentModel,
            employees,
            organizationId,
            databaseName,
            organizationName,
            categoryId,
            categoryName,
            createId,
            departmentId,
            shiftId,
            res,
        });

    } catch (error) {
        console.error('Bulk employee upload failed:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
    }
};

const parseFile = async (file) => {
    try {
        const employees = [];

        // Handle CSV file
        if (file.mimetype === 'text/csv') {
            const rows = await new Promise((resolve, reject) => {
                const results = [];
                // Using the buffer directly instead of file path
                const bufferStream = require('stream').Readable.from(file.buffer);
                bufferStream.pipe(csv())
                    .on('data', (row) => results.push(row))
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));
            });
            employees.push(...rows);
        }
        // Handle Excel file (XLSX)
        else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
            // Parse the buffer instead of file path
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            employees.push(...data);
        }

        return employees;
    } catch (err) {
        console.error('File parsing error:', err);
        throw new Error('Failed to parse file');
    }
};

// function parseDateSafe(date) {
//     let finalDate;

//     console.log('Raw Date:', date); // Debug log

//     if (typeof date === "number") {
//         // Excel date system: January 1, 1900 = 1
//         const baseDate = new Date(Date.UTC(1900, 0, 1));
//         const offsetDays = date > 60 ? 2 : 1; // Adjust for 1900 leap year bug
//         finalDate = new Date(baseDate.getTime() + (date - offsetDays) * 86400000);
//     } else if (typeof date === "string") {
//         const parsed = moment.utc(date, [
//             "MM/DD/YYYY",
//             "YYYY-MM-DD",
//             "DD-MM-YYYY",
//             "MM-DD-YYYY",
//             "M/D/YYYY",
//             "MM/DD/YY",
//             "DD/MM/YYYY"
//         ], false);
//         if (!parsed.isValid()) {
//             console.log('Invalid Date String:', date); // Debug log
//             return null;
//         }
//         finalDate = parsed.toDate();
//     } else {
//         console.log('Invalid Date Type:', typeof date); // Debug log
//         return null;
//     }

//     console.log('Parsed Date:', finalDate); // Debug log
//     return finalDate;
// }

function parseDateSafe(date) {
    if (date === undefined || date === null || date === '') return null;

    if (date instanceof Date) {
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof date === "number") {
        // ✅ Excel serial number
        if (!Number.isInteger(date) || date <= 0) return null;
        const baseDate = new Date(Date.UTC(1900, 0, 1));
        const offsetDays = date > 60 ? 2 : 1;
        return new Date(baseDate.getTime() + (date - offsetDays) * 86400000);
    }

    if (typeof date === "string") {
        const trimmed = date.trim();
        if (!trimmed || trimmed.toUpperCase() === 'NA' || trimmed.toUpperCase() === 'N/A') {
            return null;
        }

        // ✅ HTML <input type="date"> and ISO date-only: yyyy-MM-dd
        const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (isoDateOnly) {
            return new Date(Date.UTC(
                Number(isoDateOnly[1]),
                Number(isoDateOnly[2]) - 1,
                Number(isoDateOnly[3])
            ));
        }

        // ✅ Full ISO datetime
        if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
            const iso = new Date(trimmed);
            return Number.isNaN(iso.getTime()) ? null : iso;
        }

        // ✅ Common UI / Excel formats
        const formats = [
            "yyyy-MM-dd",
            "dd/MM/yyyy",
            "dd-MM-yyyy",
            "MM/dd/yyyy",
            "MM-dd-yyyy",
        ];
        let parsed = null;

        for (let fmt of formats) {
            const temp = parse(trimmed, fmt, new Date());
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

/**
 * 🔥 AUTO-CALCULATE PAYROLL INFO FROM ORGANIZATION SETTINGS
 * Calculate gross salary and CTC based on organization's salary compensation rules
 * @param {Number} baseSalary - Employee's base/basic salary
 * @param {String} org_uuid - Organization UUID
 * @returns {Object} - Calculated payroll info
 */
async function autoCalculatePayrollInfo(baseSalary, org_uuid) {
    try {
        const { SalaryCompensationModel, StatutoryComplianceModel } = await initModels(org_uuid);
        
        // Get organization's salary components and statutory compliance settings
        const salaryComponents = await SalaryCompensationModel.find({ 
            organizationId: org_uuid 
        });
        
        const statutoryCompliance = await StatutoryComplianceModel.findOne({ 
            organizationId: org_uuid 
        });
        
        let totalEarnings = baseSalary; // Start with basic salary
        
        // ========== EARNINGS CALCULATION ==========
        const earningsComponent = salaryComponents.find(c => c.category === 'earnings');
        if (earningsComponent && earningsComponent.components) {
            earningsComponent.components.forEach(component => {
                if (component.status === 'active') {
                    let amount = 0;
                    
                    switch (component.calculationType) {
                        case 'fixed':
                            amount = component.value || 0;
                            break;
                        case 'percentage':
                            if (component.basedOn === 'basic') {
                                amount = (baseSalary * component.value) / 100;
                            } else if (component.basedOn === 'gross') {
                                amount = 0; // Gross-based calculated later
                            }
                            break;
                        case 'variable':
                            amount = component.value || 0;
                            break;
                    }
                    
                    // Apply max limit if defined
                    if (component.maxLimit > 0 && amount > component.maxLimit) {
                        amount = component.maxLimit;
                    }
                    
                    totalEarnings += amount;
                }
            });
        }
        
        const grossSalary = totalEarnings;
        
        // ========== STATUTORY DEDUCTIONS CALCULATION ==========
        let totalDeductions = 0;
        
        // EPF Calculation (centralized — honors EDLI, Admin Charges, ABRY, override, etc.)
        const epfBreakdown = calculateEpf({
            epfConfig: statutoryCompliance?.epf,
            baseSalary,
            epfApplicableWage: baseSalary,
        });
        if (epfBreakdown.applicable) {
            totalDeductions += epfBreakdown.employeeContribution;
        }
        
        // ESI Calculation (centralized)
        const esiBreakdown = calculateEsi({
            esiConfig: statutoryCompliance?.esi,
            grossSalary,
            esiApplicableWage: grossSalary,
        });
        if (esiBreakdown.applicable) {
            totalDeductions += esiBreakdown.employeeContribution;
        }

        // Professional Tax (centralized — slab-based; previously not computed at all)
        const ptBreakdown = calculateProfessionalTax({
            ptConfig: statutoryCompliance?.professionalTax,
            grossSalary,
        });
        if (ptBreakdown.applicable) {
            totalDeductions += ptBreakdown.amount;
        }
        
        // Other deductions from salary components
        const deductionsComponent = salaryComponents.find(c => c.category === 'deductions');
        if (deductionsComponent?.components) {
            deductionsComponent.components.forEach(component => {
                if (component.status === 'active') {
                    let amount = 0;
                    
                    if (component.calculationType === 'percentage') {
                        if (component.basedOn === 'gross') {
                            amount = (grossSalary * component.value) / 100;
                        } else if (component.basedOn === 'basic') {
                            amount = (baseSalary * component.value) / 100;
                        }
                    } else if (component.calculationType === 'fixed') {
                        amount = component.value || 0;
                    }
                    
                    totalDeductions += amount;
                }
            });
        }
        
        const netPay = grossSalary - totalDeductions;
        const ctc = grossSalary * 12; // Annual CTC
        
        return {
            baseSalary: baseSalary,
            grossSalary: Math.round(grossSalary),
            totalDeductions: Math.round(totalDeductions),
            netPay: Math.round(netPay),
            ctc: Math.round(ctc),
            paymentFrequency: 'Monthly',
            currency: 'INR',
            taxRegime: 'New',
            variablePay: 0,
            incentives: 0,
            salaryEffectiveFrom: new Date()
        };
        
    } catch (error) {
        console.error('Error in autoCalculatePayrollInfo:', error);
        // Return basic calculation as fallback
        return {
            baseSalary: baseSalary,
            grossSalary: Math.round(baseSalary * 1.3), // 30% increase as default
            ctc: Math.round(baseSalary * 1.3 * 12),
            paymentFrequency: 'Monthly',
            currency: 'INR',
            taxRegime: 'New',
            variablePay: 0,
            incentives: 0,
            salaryEffectiveFrom: new Date()
        };
    }
}


function mapFrontendKeysToDB(employee) {

    const parsedDOJ = parseDateSafe(employee.dateOfJoining);
    const parsedDOB = parseDateSafe(employee.dob);
    const parsedFromDate = parseDateSafe(employee.fromDate);

    return {
        firstName: employee.firstName,
        lastName: employee.lastName,
        salutation: employee.salutation,
        fatherSpouse: employee.fatherSpouse,
        relation: employee.relation,
        email: employee.email,
        uniqueId: employee.uniqueId || '',
        customId: employee.empId,
        employeeType: employee.employeeType,
        jobTitle: employee.jobTitle,
        password: employee.password,
        dateOfJoining: parsedDOJ || null,
        demographics: {
            dob: parsedDOB || null,
            gender: employee.gender,
            nationality: employee.nationality,
            religion: employee.religion,
            qualification: employee.qualification,
        },
        handicappedInfo: {
            handicapped: employee.handicappedStatus,
            from: parsedFromDate || null,
            certificate: employee.certificateStatus
        },
        nationalID: {
            pan: employee.panCard,
            aadhar: employee.aadharCard,
            passport: employee.passport,
            passportValid: employee.passportValid,
        },
        phone: {
            mobile: employee.mobileNo,
            home: employee.homeMobileNo,
        },
        presentAddress: {
            address: employee.presentAddress,
            street: employee.presentAddressStreet,
            city: employee.presentAddressCity,
            state: employee.presentAddressState,
            zip: employee.presentAddressZip,
            country: employee.presentAddressCountry,
        },
        permanentAddress: {
            address: employee.permanentAddress,
            street: employee.permanentAddressStreet,
            city: employee.permanentAddressCity,
            state: employee.permanentAddressState,
            zip: employee.permanentAddressZip,
            country: employee.permanentAddressCountry,
        },
        maritalInfo: {
            status: employee.maritalStatus,
            spouseName: employee.maritalSpouseName,
            anniversary: employee.maritalAnniversary,
            numberOfChildren: employee.numberOfChildren,
        },
        emergencyContact: {
            name: employee.emergencyContactName,
            mobilePhone: employee.emergencyMobileNo,
            homePhone: employee.emergencyHomePhone,
            informToAddress: employee.emergencyInformToAddress,
            bloodGroup: employee.bloodGroup,
            informToRelation: employee.emergencyRelation,
        },
        payrollInfo: {
            employeeCode: employee.employeeCode || '',
            baseSalary: employee.baseSalary || 0,
            grossSalary: employee.grossSalary || 0,
            ctc: employee.ctc || 0,
            department: employee.payrollDepartment || '',
            designation: employee.payrollDesignation || '',
            paymentFrequency: employee.paymentFrequency || 'Monthly',
            currency: employee.currency || 'INR',
            taxRegime: employee.taxRegime || 'New',
            variablePay: employee.variablePay || 0,
            incentives: employee.incentives || 0,
            salaryEffectiveFrom: parseDateSafe(employee.salaryEffectiveFrom) || null,
        },
        payrollPreferences: {
            holdSalary: employee.holdSalary || false,
            holdReason: employee.holdReason || '',
            loanDeduction: employee.loanDeduction || 0,
            advanceDeduction: employee.advanceDeduction || 0,
            vpf: formatVpfResponse(normalizeVpf(employee.payrollPreferences)),
            paymentMode: employee.payrollPreferences?.paymentMode || employee.paymentMode || 'Bank Transfer',
        },
        taxInfo: {
            taxDeclarationSubmitted: employee.taxDeclarationSubmitted || false,
            taxDeclarationYear: employee.taxDeclarationYear || '',
            investmentProofSubmitted: employee.investmentProofSubmitted || false,
            investmentProofYear: employee.investmentProofYear || '',
            estimatedTaxLiability: employee.estimatedTaxLiability || 0,
            tdsDeducted: employee.tdsDeducted || 0,
        },
        bankInfo: {
            bankCountry: employee.bankCountry || '',
            bankCode: employee.bankCode || '',
            bankName: employee.bankName || '',
            branchName: employee.branchName || '',
            ifscCode: employee.ifscCode || '',
            swiftCode: employee.swiftCode || '',
            bankAccountNumber: employee.bankAccountNumber || '',
            confirmBankAccountNumber: employee.confirmBankAccountNumber || '',
            accountHolderName: employee.accountHolderName || '',
            accountType: employee.accountType || '',
            isVerified: employee.isVerified || false,
            verifiedOn: parseDateSafe(employee.verifiedOn) || null
        },
        statutoryInfo: {
            pfAccountNumber: employee.pfAccountNumber || '',
            uan: employee.uan || '',
            esiNumber: employee.esiNumber || employee.statutoryInfo?.esiNumber || '',
            esiApplicable: employee.esiApplicable != null
                ? !!employee.esiApplicable
                : employee.statutoryInfo?.esiApplicable !== false,
            esiOptedOut: !!(employee.esiOptedOut || employee.statutoryInfo?.esiOptedOut),
            ptApplicable: employee.ptApplicable || false,
            ptState: employee.ptState || '',
            gratuityApplicable: employee.gratuityApplicable || false,
            lwfApplicable: employee.lwfApplicable || false,
        },
        isInternationalEmployee: employee.isInternationalEmployee || false,
        onboarding: {
            grade: employee.grade || '',
            BGVtype: employee.BGVtype || [],
            BGVagency: employee.BGVagency || '',
            hiringSource: {
                jobPortal: {
                    isSelected: employee.jobPortalSelected || false,
                    portalName: employee.jobPortalName || '',
                    portalCost: employee.jobPortalCost || 0
                },
                internalReference: {
                    isSelected: employee.internalRefSelected || false,
                    referenceName: employee.internalRefName || '',
                    referenceCost: employee.internalRefCost || 0
                },
                recruitmentConsultant: {
                    isSelected: employee.consultantSelected || false,
                    consultantName: employee.consultantName || '',
                    consultantCost: employee.consultantCost || 0
                },
                advertisement: {
                    isSelected: employee.adSelected || false,
                    adName: employee.adName || '',
                    adCost: employee.adCost || 0
                },
                media: {
                    isSelected: employee.mediaSelected || false,
                    mediaName: employee.mediaName || '',
                    mediaCost: employee.mediaCost || 0
                }
            }
        }
    };
}

async function processEmployees({
    org_uuid,
    EmployeeModel,
    UniqueIdModel,
    ShiftModel,
    DepartmentModel,
    employees,
    organizationId,
    databaseName,
    organizationName,
    categoryId,
    categoryName,
    createId,
    departmentId = null,
    shiftId = null,
    res,
}) {
    try {
        const errors = [];
        const validEmployees = [];
        const emails = employees.map((employee) => employee.email);

        // Batch query to check existing emails
        const existingEmails = await SystemUser.find({ systemUserEmail: { $in: emails } }).select('systemUserEmail');
        const existingEmailSet = new Set(existingEmails.map((e) => e.systemUserEmail));

        // Unique ID initialization
        const orgPrefix = organizationName?.substring(0, 3).toUpperCase() || 'ORG';
        let employeeUniqueId = await UniqueIdModel.findOne();
        if (!employeeUniqueId) {
            employeeUniqueId = new UniqueIdModel({ name: orgPrefix, value: 1 });
        }

        // Regular expressions for validation
        const regexValidators = {
            mobile: /^[0-9()+-\s]{10,17}$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            password: /^.{6,}$/, // At least 6 characters
            nationalID: {
                aadhar: /^\d{12}$/,
                pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                passport: /^[A-Z]{1}[0-9]{7}$/
            }
        };

        // Allowed values for specific fields
        const allowedValues = {
            salutation: ['Mr', 'Ms', 'Mrs', 'Dr'],
            employeeType: ['full-time', 'part-time', 'contract', 'intern'],
            handicappedInfo: {
                handicapped: ['yes', 'no'],
            },
            demographics: {
                gender: ['Male', 'Female', 'LGBTQ'],
            }
        };

        // Validate and Map Employee
        employees.forEach((employee, index) => {
            const mappedEmployee = mapFrontendKeysToDB(employee);
            const validationErrors = [];

            // Validate required fields
            const requiredFields = ["firstName", "email", "password"];
            requiredFields.forEach(field => {
                if (!mappedEmployee[field] || String(mappedEmployee[field]).trim() === '') {
                    validationErrors.push(`${field} is required`);
                }
            });

            // Validate format of certain fields
            Object.keys(regexValidators).forEach(field => {
                const regex = regexValidators[field];
                if (regex && regex.test && mappedEmployee[field] && !regex.test(String(mappedEmployee[field]))) {
                    validationErrors.push(`${field} is invalid`);
                }
            });

            // Validate enum values
            Object.keys(allowedValues).forEach(field => {
                // Ensure allowedValues[field] is an array before calling .includes()
                if (Array.isArray(allowedValues[field]) && mappedEmployee[field] && !allowedValues[field].includes(mappedEmployee[field])) {
                    validationErrors.push(`${field} should be one of ${allowedValues[field].join(', ')}`);
                }

                // Handle nested validation for fields like demographics and relation
                if (allowedValues[field] && typeof allowedValues[field] === 'object') {
                    Object.keys(allowedValues[field]).forEach(subField => {
                        const subValues = allowedValues[field][subField];
                        if (Array.isArray(subValues) && mappedEmployee[field] && mappedEmployee[field][subField] && !subValues.includes(mappedEmployee[field][subField])) {
                            validationErrors.push(`${subField} under ${field} should be one of ${subValues.join(', ')}`);
                        }
                    });
                }
            });

            // Handle nested validation for fields like nationalID
            if (mappedEmployee.nationalID) {
                if (mappedEmployee.nationalID.aadhar && regexValidators.nationalID.aadhar && !regexValidators.nationalID.aadhar.test(mappedEmployee.nationalID.aadhar)) {
                    validationErrors.push("Aadhar under National ID is invalid. Please provide a valid 12-digit Aadhar number.");
                }
                if (mappedEmployee.nationalID.pan && regexValidators.nationalID.pan && !regexValidators.nationalID.pan.test(mappedEmployee.nationalID.pan)) {
                    validationErrors.push("PAN under National ID is invalid. Please provide a valid PAN number.");
                }
                if (mappedEmployee.nationalID.passport && regexValidators.nationalID.passport && !regexValidators.nationalID.passport.test(mappedEmployee.nationalID.passport)) {
                    validationErrors.push("Passport under National ID is invalid. Please provide a valid Passport number.");
                }
            }

            // Add the mapped employee to the errors list if there are validation issues
            if (validationErrors.length > 0) {
                errors.push({ email: employee.email, message: validationErrors });
                return;
            }

            if (existingEmailSet.has(mappedEmployee.email)) {
                errors.push({ email: mappedEmployee.email, message: 'Email already exists' });
            } else {
                const uniqueId = `${employeeUniqueId.name}${(employeeUniqueId.value + index).toString().padStart(5, '0')}`;
                validEmployees.push({ ...mappedEmployee, uniqueId });
            }
        });

        if (validEmployees.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No valid employees to process', errors });
        }

        // Prepare bulk operations to insert employees
        const bulkOps = validEmployees.map((employee) => ({
            insertOne: {
                document: {
                    ...employee,
                    organizationId,
                    categoryId,
                    categoryName,
                    createdBy: createId,
                    departmentId,
                    shiftId,
                },
            },
        }));

        // Insert the employees in bulk
        const insertedEmployees = await EmployeeModel.bulkWrite(bulkOps);

        // push employee ids on department and shift
        const insertedIds = Object.values(insertedEmployees.insertedIds);

        if (departmentId) {
            await DepartmentModel.updateOne(
                { _id: departmentId },
                { $addToSet: { employees: { $each: insertedIds } } }
            );
        }

        if (shiftId) {
            await ShiftModel.updateOne(
                { _id: shiftId },
                { $addToSet: { employees: { $each: insertedIds } } }
            );
        }

        // Create system users based on inserted employees
        const systemUsers = validEmployees.map((employee, index) => {
            const { email, firstName, password, uniqueId } = employee;

            return {
                systemUserName: firstName,
                systemUserPassword: bcrypt.hashSync(String(password), 10),
                systemUserEmail: email,
                categoryId,
                linkSystemUser: {
                    employeeId: insertedEmployees.insertedIds[index],
                    organizationId,
                    databaseName: org_uuid,
                    organizationName,
                },
            };
        });

        // Insert system users in bulk
        await SystemUser.insertMany(systemUsers);

        // Update unique ID value
        employeeUniqueId.value += validEmployees.length;
        await employeeUniqueId.save();

        res.status(201).json({ status: 'success', message: 'Employees added successfully', errors });
    } catch (err) {
        console.error('Error processing employees:', err);
        res.status(500).json({ status: 'error', message: 'Internal Server Error', error: err.message });
    }
}

exports.changeEmployeePasswords = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { employeeIds, newPassword } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Employee IDs are required and should be in an array'
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'New password is required'
            });
        }

        // Hash the new password once
        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        const { OrganizationModel, PasswordChangeLogModel } = await initModels(org_uuid);
        const organization = await OrganizationModel.findById(org_uuid);
        const orgName = organization?.organizationName || org_uuid;
        const { ipAddress, userAgent } = getRequestMeta(req);

        let actorName = '';
        let actorEmail = '';
        if (req.userId) {
            const actor = await SystemUser.findById(req.userId).select('systemUserName systemUserEmail');
            actorName = actor?.systemUserName || '';
            actorEmail = actor?.systemUserEmail || '';
        }

        const results = [];

        for (const employeeId of employeeIds) {
            const auditBase = {
                organizationId: org_uuid,
                organizationName: orgName,
                performedBy: req.userId || null,
                performedByName: actorName,
                performedByEmail: actorEmail,
                performedByEmployeeId: mongoose.isValidObjectId(req.empId) ? req.empId : null,
                employeeId,
                ipAddress,
                userAgent,
            };

            try {
                const systemUser = await SystemUser.findOneAndUpdate(
                    { "linkSystemUser.employeeId": employeeId },
                    { systemUserPassword: hashedPassword },
                    { new: true }
                );

                if (!systemUser) {
                    const result = { employeeId, status: 'failed', message: 'No SystemUser found for this employeeId' };
                    results.push(result);
                    await writePasswordChangeLog(PasswordChangeLogModel, { ...auditBase, ...result, employeeName: '', employeeEmail: '', emailSent: false });
                    continue;
                }

                const loginEmail = systemUser.systemUserEmail;
                const employeeName = systemUser.systemUserName || '';
                if (!loginEmail) {
                    const result = { employeeId, status: 'warning', message: 'Password updated but SystemUser has no email to send notification' };
                    results.push(result);
                    await writePasswordChangeLog(PasswordChangeLogModel, {
                        ...auditBase,
                        ...result,
                        employeeName,
                        employeeEmail: '',
                        emailSent: false,
                    });
                    continue;
                }

                const employeeInfo = {
                    firstName: employeeName,
                    lastName: '',
                    organizationName: orgName,
                };

                const emailResult = await sendPasswordChangeEmail({
                    org_uuid,
                    employee: employeeInfo,
                    loginEmail,
                    newPassword,
                });

                if (emailResult.status !== 'success') {
                    console.error(`Password change email failed for ${loginEmail}:`, emailResult.message);
                    const result = { employeeId, status: 'warning', message: 'Password updated but email failed', emailError: emailResult.message };
                    results.push(result);
                    await writePasswordChangeLog(PasswordChangeLogModel, {
                        ...auditBase,
                        employeeName,
                        employeeEmail: loginEmail,
                        status: 'warning',
                        emailSent: false,
                        message: result.message,
                    });
                } else {
                    const result = { employeeId, status: 'success', message: 'Password updated and email sent' };
                    results.push(result);
                    await writePasswordChangeLog(PasswordChangeLogModel, {
                        ...auditBase,
                        employeeName,
                        employeeEmail: loginEmail,
                        status: 'success',
                        emailSent: true,
                        message: result.message,
                    });
                }
            } catch (err) {
                console.error(`Error processing employeeId ${employeeId}:`, err);
                const result = { employeeId, status: 'failed', message: err.message };
                results.push(result);
                await writePasswordChangeLog(PasswordChangeLogModel, {
                    ...auditBase,
                    ...result,
                    employeeName: '',
                    employeeEmail: '',
                    emailSent: false,
                });
            }
        }

        return res.status(200).json({
            status: 'success',
            message: 'Password update process completed',
            data: results
        });

    } catch (error) {
        console.error('Error changing passwords:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getPasswordChangeHistory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { PasswordChangeLogModel } = await initModels(org_uuid);

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        const employeeId = req.query.employeeId;

        const filter = {};
        if (employeeId) {
            filter.employeeId = employeeId;
        }

        const total = await PasswordChangeLogModel.countDocuments(filter);
        const logs = await PasswordChangeLogModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.status(200).json({
            status: 'success',
            message: 'Password change logs fetched successfully',
            data: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                logs,
            }
        });
    } catch (error) {
        console.error('Error fetching password change logs:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.employeeImg = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { employeeId } = req.params;
        const { EmployeeModel } = await initModels(org_uuid);

        // Check if a file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload the file using your uploadFile function
        const result = await uploadFile(req.file);
        console.log(result, "resultresultresult")
        if (!result) {
            return res.status(400).json({ message: 'File upload failed' });
        }

        // Update the employee record with the photo URL
        const data = await EmployeeModel.findByIdAndUpdate(
            employeeId,
            {
                $set: { photoUrl: result.url }
            },
            { new: true }
        );

        if (!data) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json({
            message: 'File uploaded successfully',
            url: data.photoUrl,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            message: 'Failed to upload file',
            error: error.message
        });
    }
};

exports.employeeDashboardData = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { EmployeeModel, ResignationModel } = await initModels(org_uuid);

        const users = await EmployeeModel.find();
        if (!users || users.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No users found',
            });
        }

        const counts = users.reduce(
            (acc, user) => {
                const status = user.status;
                if (status === "Active") acc.activeEmployee++;
                else if (status === "Inactive") acc.inactiveEmployee++;
                else if (status === "Terminated") acc.terminatedEmployee++;
                else if (status === "Probation") {
                    acc.probationEmployee++;
                    // Pending probation confirmation = still on Probation and not marked completed
                    if (user?.probationTime?.completed !== true) {
                        acc.pendingProbationConfirmation++;
                    }
                }

                const gender = String(
                    user?.demographics?.gender ||
                    user?.Personal_Information?.gender ||
                    user?.gender ||
                    ''
                )
                    .trim()
                    .toLowerCase();

                if (gender === 'male' || gender === 'm') acc.maleEmployee++;
                else if (gender === 'female' || gender === 'f') acc.femaleEmployee++;
                else if (
                    gender === 'lgbtq' ||
                    gender === 'other' ||
                    gender === 'others' ||
                    gender === 'non-binary' ||
                    gender === 'nonbinary'
                ) {
                    acc.lgbtqEmployee++;
                }

                const nationality = String(
                    user?.demographics?.nationality ||
                    user?.nationality ||
                    ''
                )
                    .trim()
                    .toLowerCase();

                if (nationality === 'indian') acc.indianEmployee++;
                else if (nationality) acc.othersEmployee++;
                else acc.notSpecifiedEmployee++;

                return acc;
            },
            {
                activeEmployee: 0,
                inactiveEmployee: 0,
                terminatedEmployee: 0,
                probationEmployee: 0,
                maleEmployee: 0,
                femaleEmployee: 0,
                lgbtqEmployee: 0,
                indianEmployee: 0,
                othersEmployee: 0,
                notSpecifiedEmployee: 0,
                pendingProbationConfirmation: 0,
            }
        );

        // Profile Updates / Transfers modules are not wired yet in this codebase.
        const pendingProfileUpdates = 0;
        const pendingTransfers = 0;

        let pendingResignations = 0;
        if (ResignationModel) {
            pendingResignations = await ResignationModel.countDocuments({
                status: { $in: ['Submitted', 'Under Review'] },
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Users fetched successfully',
            data: {
                totalEmployee: users.length,
                activeEmployee: counts.activeEmployee,
                inactiveEmployee: counts.inactiveEmployee,
                terminatedEmployee: counts.terminatedEmployee,
                probationEmployee: counts.probationEmployee,
                maleEmployee: counts.maleEmployee,
                femaleEmployee: counts.femaleEmployee,
                lgbtqEmployee: counts.lgbtqEmployee,
                indianEmployee: counts.indianEmployee,
                othersEmployee: counts.othersEmployee,
                notSpecifiedEmployee: counts.notSpecifiedEmployee,
                pendingRequests: {
                    profileUpdates: pendingProfileUpdates,
                    transfers: pendingTransfers,
                    probationConfirmation: counts.pendingProbationConfirmation,
                    resignation: pendingResignations,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

// Recursive function to fetch the full employee hierarchy
const getEmployeeHierarchy = async (EmployeeModel, managerId) => {
    const employees = await EmployeeModel.find({ reportingManagerId: managerId }).lean();

    for (const employee of employees) {
        // Recursively fetch subordinates
        employee.subordinates = await getEmployeeHierarchy(EmployeeModel, employee._id);
    }

    return employees;
};

exports.getFullEmployeeTree = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID is required',
            });
        }

        const { managerId } = req.params;

        // Validate managerId
        if (managerId && !mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid Manager ID',
            });
        }

        const { EmployeeModel } = await initModels(org_uuid);

        // Fetch the full tree hierarchy starting from the given managerId
        const hierarchy = await getEmployeeHierarchy(EmployeeModel, managerId || null);

        return res.status(200).json({ success: true, hierarchy });

    } catch (error) {
        console.error('Error fetching full employee tree:', error);

        return res.status(500).json({
            message: 'Failed to fetch employee tree',
            error: error.message,
        });
    }
};

// exports.exportEmployeesToExcel = async (req, res) => {
//     try {
//         const org_uuid = req.headers.org_uuid;

//         if (!org_uuid) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'Organization UUID is required',
//             });
//         }
//         const { employeeIds, fields } = req.body;

//         const { EmployeeModel } = await initModels(org_uuid);

//         if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
//             return res.status(400).json({ message: "Employee IDs are required" });
//         }

//         if (!fields || !Array.isArray(fields) || fields.length === 0) {
//             return res.status(400).json({ message: "Fields are required" });
//         }

//         const employees = await EmployeeModel.find({ _id: { $in: employeeIds } }).lean();

//         if (!employees.length) {
//             return res.status(404).json({ message: "No employees found" });
//         }

//         const excelData = employees.map((emp) => {
//             const employeeData = {};

//             fields.forEach((field) => {
//                 if (field === "uniqueId") employeeData.uniqueId = emp.uniqueId || "N/A";
//                 else if (field === "firstName") employeeData.firstName = emp.firstName || "N/A";
//                 else if (field === "lastName") employeeData.lastName = emp.lastName || "N/A";
//                 else if (field === "salutation") employeeData.salutation = emp.salutation || "N/A";
//                 else if (field === "fatherHusbandName") employeeData.fatherHusbandName = emp.fatherHusbandName || "N/A";
//                 else if (field === "relation") employeeData.relation = emp.relation || "N/A";
//                 else if (field === "email") employeeData.email = emp.email || "N/A";
//                 else if (field === "empId") employeeData.empId = emp.customId || "N/A";
//                 else if (field === "dateOfJoining") employeeData.dateOfJoining = emp.dateOfJoining || "N/A";
//                 else if (field === "employeeType") employeeData.employeeType = emp.employeeType || "N/A";
//                 else if (field === "jobTitle") employeeData.jobTitle = emp.jobTitle || "N/A";
//                 else if (field === "dob") employeeData.dob = emp.demographics?.dob || "N/A";
//                 else if (field === "gender") employeeData.gender = emp.demographics?.gender || "N/A";
//                 else if (field === "nationality") employeeData.nationality = emp.demographics?.nationality || "N/A";
//                 else if (field === "religion") employeeData.religion = emp.demographics?.religion || "N/A";
//                 else if (field === "qualification") employeeData.qualification = emp.demographics?.qualification || "N/A";
//                 else if (field === "mobileNo") employeeData.mobileNo = emp.phone?.mobile || "N/A";
//                 else if (field === "homeMobileNo") employeeData.homeMobileNo = emp.phone?.home || "N/A";
//                 else if (field === "presentAddress") employeeData.presentAddress = emp.presentAddress?.address || "N/A";
//                 else if (field === "presentAddressStreet") employeeData.presentAddressStreet = emp.presentAddress?.street || "N/A";
//                 else if (field === "presentAddressCity") employeeData.presentAddressCity = emp.presentAddress?.city || "N/A";
//                 else if (field === "presentAddressState") employeeData.presentAddressState = emp.presentAddress?.state || "N/A";
//                 else if (field === "PresentZip") employeeData.PresentZip = emp.presentAddress?.zip || "N/A";
//                 else if (field === "presentAddressCountry") employeeData.presentAddressCountry = emp.presentAddress?.country || "N/A";
//                 else if (field === "permanentAddress") employeeData.permanentAddress = emp.permanentAddress?.address || "N/A";
//                 else if (field === "permanentAddressStreet") employeeData.permanentAddressStreet = emp.permanentAddress?.street || "N/A";
//                 else if (field === "permanentAddressCity") employeeData.permanentAddressCity = emp.permanentAddress?.city || "N/A";
//                 else if (field === "permanentAddressState") employeeData.permanentAddressState = emp.permanentAddress?.state || "N/A";
//                 else if (field === "permanentAddressZip") employeeData.permanentAddressZip = emp.permanentAddress?.zip || "N/A";
//                 else if (field === "permanentAddressCountry") employeeData.permanentAddressCountry = emp.permanentAddress?.country || "N/A";
//                 else if (field === "maritalStatus") employeeData.maritalStatus = emp.maritalInfo?.status || "N/A";
//                 else if (field === "maritalSpouseName") employeeData.maritalSpouseName = emp.maritalInfo?.spouseName || "N/A";
//                 else if (field === "maritalAnniversary") employeeData.maritalAnniversary = emp.maritalInfo?.anniversary || "N/A";
//                 else if (field === "numberOfChildren") employeeData.numberOfChildren = emp.maritalInfo?.numberOfChildren || "N/A";
//                 else if (field === "emergencyContactName") employeeData.emergencyContactName = emp.emergencyContact?.name || "N/A";
//                 else if (field === "emergencyMobileNo") employeeData.emergencyMobileNo = emp.emergencyContact?.mobilePhone || "N/A";
//                 else if (field === "emergencyHomePhone") employeeData.emergencyHomePhone = emp.emergencyContact?.homePhone || "N/A";
//                 else if (field === "emergencyInformToAddress") employeeData.emergencyInformToAddress = emp.emergencyContact?.informToAddress || "N/A";
//                 else if (field === "bloodGroup") employeeData.bloodGroup = emp.emergencyContact?.bloodGroup || "N/A";
//                 else if (field === "emergencyRelation") employeeData.emergencyRelation = emp.emergencyContact?.informToRelation || "N/A";
//                 else if (field === "panCard") employeeData.panCard = emp.nationalID?.pan || "N/A";
//                 else if (field === "aadharCard") employeeData.aadharCard = emp.nationalID?.aadhar || "N/A";
//                 else if (field === "passport") employeeData.passport = emp.nationalID?.passport || "N/A";
//                 else if (field === "passportValid") employeeData.passportValid = emp.nationalID?.passportValid || "N/A";
//                 else if (field === "handicappedStatus") employeeData.handicappedStatus = emp.handicappedInfo?.handicapped || "N/A";
//                 else if (field === "fromDate") employeeData.fromDate = emp.handicappedInfo?.from || "N/A";
//                 else if (field === "certificateStatus") employeeData.certificateStatus = emp.handicappedInfo?.certificate || "N/A";

//             });

//             return employeeData;
//         });



//         // Create a new workbook and worksheet
//         const workbook = xlsx.utils.book_new();
//         const worksheet = xlsx.utils.json_to_sheet(excelData);
//         xlsx.utils.book_append_sheet(workbook, worksheet, "Employees");

//         // Generate the Excel file buffer (in-memory)
//         const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

//         // Set the response headers for file download
//         res.setHeader('Content-Disposition', 'attachment; filename=Employees.xlsx');
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

//         // Send the buffer as the response to the frontend
//         res.send(excelBuffer);

//     } catch (error) {
//         console.error("Error exporting employees:", error);
//         res.status(500).json({ message: "Error exporting employees" });
//     }
// };

exports.exportEmployeesToExcel = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(400).json({
                status: "error",
                message: "Organization UUID is required",
            });
        }

        const { employeeIds, fields, status } = req.body;
        const { EmployeeModel } = await initModels(org_uuid);

        // 🔹 Validation
        if (
            (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) &&
            !status
        ) {
            return res.status(400).json({
                message: "Either employeeIds or status is required",
            });
        }

        if (!fields || !Array.isArray(fields) || fields.length === 0) {
            return res.status(400).json({
                message: "Fields are required",
            });
        }

        // 🔹 Dynamic Mongo Filter
        const filter = {};

        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
            filter._id = { $in: employeeIds };
        }

        if (status) {
            filter.status = status;
        }
        // 🔹 Fetch employees
        const employees = await EmployeeModel.find(filter).lean();

        if (!employees.length) {
            return res.status(404).json({ message: "No employees found" });
        }

        // 🔹 Prepare Excel Data
        const excelData = employees.map((emp) => {
            const employeeData = {};

            fields.forEach((field) => {
                if (field === "uniqueId") employeeData.uniqueId = emp.uniqueId || "N/A";
                else if (field === "firstName") employeeData.firstName = emp.firstName || "N/A";
                else if (field === "lastName") employeeData.lastName = emp.lastName || "N/A";
                else if (field === "salutation") employeeData.salutation = emp.salutation || "N/A";
                else if (field === "fatherHusbandName") employeeData.fatherHusbandName = emp.fatherHusbandName || "N/A";
                else if (field === "relation") employeeData.relation = emp.relation || "N/A";
                else if (field === "email") employeeData.email = emp.email || "N/A";
                else if (field === "empId") employeeData.empId = emp.customId || "N/A";
                else if (field === "dateOfJoining") employeeData.dateOfJoining = emp.dateOfJoining || "N/A";
                else if (field === "employeeType") employeeData.employeeType = emp.employeeType || "N/A";
                else if (field === "jobTitle") employeeData.jobTitle = emp.jobTitle || "N/A";

                // 🔹 Demographics
                else if (field === "dob") employeeData.dob = emp.demographics?.dob || "N/A";
                else if (field === "gender") employeeData.gender = emp.demographics?.gender || "N/A";
                else if (field === "nationality") employeeData.nationality = emp.demographics?.nationality || "N/A";
                else if (field === "religion") employeeData.religion = emp.demographics?.religion || "N/A";
                else if (field === "qualification") employeeData.qualification = emp.demographics?.qualification || "N/A";

                // 🔹 Phone
                else if (field === "mobileNo") employeeData.mobileNo = emp.phone?.mobile || "N/A";
                else if (field === "homeMobileNo") employeeData.homeMobileNo = emp.phone?.home || "N/A";

                // 🔹 Present Address
                else if (field === "presentAddress") employeeData.presentAddress = emp.presentAddress?.address || "N/A";
                else if (field === "presentAddressStreet") employeeData.presentAddressStreet = emp.presentAddress?.street || "N/A";
                else if (field === "presentAddressCity") employeeData.presentAddressCity = emp.presentAddress?.city || "N/A";
                else if (field === "presentAddressState") employeeData.presentAddressState = emp.presentAddress?.state || "N/A";
                else if (field === "presentZip") employeeData.presentZip = emp.presentAddress?.zip || "N/A";
                else if (field === "presentAddressCountry") employeeData.presentAddressCountry = emp.presentAddress?.country || "N/A";

                // 🔹 Permanent Address
                else if (field === "permanentAddress") employeeData.permanentAddress = emp.permanentAddress?.address || "N/A";
                else if (field === "permanentAddressStreet") employeeData.permanentAddressStreet = emp.permanentAddress?.street || "N/A";
                else if (field === "permanentAddressCity") employeeData.permanentAddressCity = emp.permanentAddress?.city || "N/A";
                else if (field === "permanentAddressState") employeeData.permanentAddressState = emp.permanentAddress?.state || "N/A";
                else if (field === "permanentAddressZip") employeeData.permanentAddressZip = emp.permanentAddress?.zip || "N/A";
                else if (field === "permanentAddressCountry") employeeData.permanentAddressCountry = emp.permanentAddress?.country || "N/A";

                // 🔹 Marital
                else if (field === "maritalStatus") employeeData.maritalStatus = emp.maritalInfo?.status || "N/A";
                else if (field === "maritalSpouseName") employeeData.maritalSpouseName = emp.maritalInfo?.spouseName || "N/A";
                else if (field === "maritalAnniversary") employeeData.maritalAnniversary = emp.maritalInfo?.anniversary || "N/A";
                else if (field === "numberOfChildren") employeeData.numberOfChildren = emp.maritalInfo?.numberOfChildren || "N/A";

                // 🔹 Emergency
                else if (field === "emergencyContactName") employeeData.emergencyContactName = emp.emergencyContact?.name || "N/A";
                else if (field === "emergencyMobileNo") employeeData.emergencyMobileNo = emp.emergencyContact?.mobilePhone || "N/A";
                else if (field === "emergencyHomePhone") employeeData.emergencyHomePhone = emp.emergencyContact?.homePhone || "N/A";
                else if (field === "bloodGroup") employeeData.bloodGroup = emp.emergencyContact?.bloodGroup || "N/A";
                else if (field === "emergencyRelation") employeeData.emergencyRelation = emp.emergencyContact?.informToRelation || "N/A";

                // 🔹 National ID
                else if (field === "panCard") employeeData.panCard = emp.nationalID?.pan || "N/A";
                else if (field === "aadharCard") employeeData.aadharCard = emp.nationalID?.aadhar || "N/A";
                else if (field === "passport") employeeData.passport = emp.nationalID?.passport || "N/A";
                else if (field === "passportValid") employeeData.passportValid = emp.nationalID?.passportValid || "N/A";

                // 🔹 Handicapped
                else if (field === "handicappedStatus") employeeData.handicappedStatus = emp.handicappedInfo?.handicapped || "N/A";
                else if (field === "fromDate") employeeData.fromDate = emp.handicappedInfo?.from || "N/A";
                else if (field === "certificateStatus") employeeData.certificateStatus = emp.handicappedInfo?.certificate || "N/A";
            });

            return employeeData;
        });

        // 🔹 Create Excel
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Employees");

        const excelBuffer = xlsx.write(workbook, {
            bookType: "xlsx",
            type: "buffer",
        });

        // 🔹 Response Headers
        res.setHeader("Content-Disposition", "attachment; filename=Employees.xlsx");
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        return res.send(excelBuffer);

    } catch (error) {
        console.error("Error exporting employees:", error);
        return res.status(500).json({
            message: "Error exporting employees",
        });
    }
};

exports.getFreeEmployeesForInterview = async (req, res) => {
    try {
        // Extract organization UUID from headers
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: "error",
                message: "Organization UUID is required",
            });
        }

        // Extract and validate query parameters
        const { date, startTime, endTime } = req.query;
        const { orgId } = req.body;

        if (!date || !startTime || !endTime) {
            return res.status(400).json({
                status: "error",
                message: "Date, start time, and end time are required",
            });
        }

        // Validate date and time formats
        const dateFormat = "YYYY-MM-DD";
        const timeFormat = "HH:mm";
        const moment = require("moment");

        if (!moment(date, dateFormat, true).isValid()) {
            return res.status(400).json({
                status: "error",
                message: "Invalid date format. Expected format: YYYY-MM-DD",
            });
        }

        if (!moment(startTime, timeFormat, true).isValid() || !moment(endTime, timeFormat, true).isValid()) {
            return res.status(400).json({
                status: "error",
                message: "Invalid time format. Expected format: HH:mm",
            });
        }

        // Convert date and time to Date objects
        const start = new Date(`${date}T${startTime}Z`);
        const end = new Date(`${date}T${endTime}Z`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                status: "error",
                message: "Invalid date or time format",
            });
        }

        // Initialize models with organization UUID
        const { CandidateModel, PreResignationModel, ResignationModel, EmployeeModel } = await initModels(org_uuid);

        // Helper function to get busy employees from a model with Scheduled status
        const getBusyEmployees = async (Model, interviewField) => {
            const result = await Model.aggregate([
                { $unwind: `$${interviewField}` },
                {
                    $match: {
                        [`${interviewField}.date`]: new Date(date),
                        [`${interviewField}.status`]: "Scheduled", // Filter for Scheduled status
                        $or: [
                            { [`${interviewField}.startTime`]: { $gte: start, $lt: end } },
                            { [`${interviewField}.endTime`]: { $gt: start, $lte: end } },
                            {
                                [`${interviewField}.startTime`]: { $lte: start },
                                [`${interviewField}.endTime`]: { $gte: end },
                            },
                        ],
                    },
                },
                { $project: { panel: `$${interviewField}.panel` } },
                { $unwind: "$panel" },
                {
                    $group: {
                        _id: null,
                        busyEmployees: { $addToSet: "$panel" },
                    },
                },
            ]);

            return result.length > 0 ? result[0].busyEmployees.map(id => id.toString()) : [];
        };

        // Fetch busy employees from all three models
        const [busyCandidates, busyPreResignations, busyResignations] = await Promise.all([
            getBusyEmployees(CandidateModel, "interviewDetails"),
            getBusyEmployees(PreResignationModel, "interviewDetails"),
            getBusyEmployees(ResignationModel, "exitInterviewDetails"),
        ]);

        // Combine all busy employee IDs
        const busyEmployeeIds = [...new Set([...busyCandidates, ...busyPreResignations, ...busyResignations])];

        // Build the query for fetching free employees
        const query = {
            _id: { $nin: busyEmployeeIds },
        };

        // Only add organizationId filter if orgId is provided
        if (orgId) {
            query.organizationId = orgId;
        }
        // Fetch free employees who are not in the busy list and belong to the organization
        const freeEmployees = await EmployeeModel.find(query).select("_id firstName lastName email");

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Free employees fetched successfully",
            data: freeEmployees,
        });
    } catch (error) {
        // Log error for debugging
        console.error("Error fetching free employees:", error);

        // Return generic error message to client
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

exports.getEmployeeInterviewsByDate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({ status: "error", message: "Organization UUID is required" });
        }

        const { CandidateModel, PreResignationModel, ResignationModel } = await initModels(org_uuid);
        const employeeId = new mongoose.Types.ObjectId(req.params.employeeId);
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ status: "error", message: "Start date and end date are required" });
        }

        if (!moment(startDate, "YYYY-MM-DD", true).isValid() || !moment(endDate, "YYYY-MM-DD", true).isValid()) {
            return res.status(400).json({ status: "error", message: "Invalid date format. Expected format: YYYY-MM-DD" });
        }

        const start = moment(startDate).startOf("day").toDate();
        const end = moment(endDate).endOf("day").toDate();

        if (start > end) {
            return res.status(400).json({ status: "error", message: "Start date must be before end date." });
        }

        const fetchInterviews = async (Model, interviewField, modelType) => {
            return Model.aggregate([
                { $unwind: `$${interviewField}` },
                {
                    $match: {
                        [`${interviewField}.panel`]: employeeId,
                        [`${interviewField}.date`]: { $gte: start, $lte: end },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        searchId: "$_id",
                        interviewId: `$${interviewField}._id`,
                        date: `$${interviewField}.date`,
                        startTime: `$${interviewField}.startTime`,
                        endTime: `$${interviewField}.endTime`,
                        meetingLink: `$${interviewField}.meetingLink`,
                        feedback: `$${interviewField}.feedback`,
                        panel: `$${interviewField}.panel`,
                        source: modelType,
                    },
                },
            ]);
        };

        const [candidateInterviews, preResignationInterviews, resignationInterviews] = await Promise.all([
            fetchInterviews(CandidateModel, "interviewDetails", "Candidate"),
            fetchInterviews(PreResignationModel, "interviewDetails", "PreResignation"),
            fetchInterviews(ResignationModel, "exitInterviewDetails", "Resignation"),
        ]);

        const interviews = [...candidateInterviews, ...preResignationInterviews, ...resignationInterviews];

        if (!interviews.length) {
            return res.status(404).json({
                status: "error",
                message: "No interviews found for this employee within the specified date range"
            });
        }

        interviews.sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(`1970-01-01T${a.startTime}`) - new Date(`1970-01-01T${b.startTime}`));

        res.status(200).json({
            success: true,
            message: "Interviews fetched successfully",
            data: interviews
        });
    } catch (error) {
        console.error("Error fetching interviews:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};

exports.getEmployeeDemographics = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({ status: "error", message: "Organization UUID is required" });
        }

        const { EmployeeModel } = await initModels(org_uuid);
        const today = new Date();

        const employees = await EmployeeModel.aggregate([
            {
                $addFields: {
                    dobDate: {
                        $convert: {
                            input: "$demographics.dob",
                            to: "date",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $addFields: {
                    age: {
                        $cond: [
                            { $ifNull: ["$dobDate", false] },
                            {
                                $dateDiff: {
                                    startDate: "$dobDate",
                                    endDate: today,
                                    unit: "year"
                                }
                            },
                            null
                        ]
                    }
                }
            },
            {
                $facet: {
                    ageGroups: [
                        {
                            $match: { age: { $ne: null } }
                        },
                        {
                            $bucket: {
                                groupBy: "$age",
                                boundaries: [0, 18, 31, 41, 59, 200],
                                default: 200,
                                output: {
                                    count: { $sum: 1 }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                group: {
                                    $switch: {
                                        branches: [
                                            { case: { $eq: ["$_id", 0] }, then: "Under 18" },
                                            { case: { $eq: ["$_id", 18] }, then: "18-30" },
                                            { case: { $eq: ["$_id", 31] }, then: "31-40" },
                                            { case: { $eq: ["$_id", 41] }, then: "41-58" },
                                            { case: { $eq: ["$_id", 59] }, then: "Above 58" }
                                        ],
                                        default: "Unknown"
                                    }
                                },
                                count: 1
                            }
                        }
                    ],
                    unknownAges: [
                        {
                            $match: { age: null }
                        },
                        {
                            $count: "count"
                        }
                    ],
                    nationalities: [
                        {
                            $match: {
                                "demographics.nationality": { $ne: null, $ne: "" }
                            }
                        },
                        {
                            $group: {
                                _id: "$demographics.nationality",
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        // Merge unknown ages into ageGroups
        let ageGroups = employees[0].ageGroups;
        const unknownCount = employees[0].unknownAges.length > 0 ? employees[0].unknownAges[0].count : 0;

        if (unknownCount > 0) {
            ageGroups.push({
                group: "Unknown",
                count: unknownCount
            });
        }

        res.status(200).json({
            status: "success",
            message: "Demographics data fetched",
            data: {
                ageGroups,
                nationalities: employees[0].nationalities
            }
        });

    } catch (error) {
        console.error("Error fetching demographics:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// exports.getEmployeeHighlights = async (req, res) => {
//     try {
//         const org_uuid = req.headers.org_uuid;
//         if (!org_uuid) {
//             return res.status(400).json({ status: "error", message: "Organization UUID is required" });
//         }

//         const { EmployeeModel, EventModel, HolidayModel, PreResignationModel, CandidateModel, ResignationModel } = await initModels(org_uuid);
//         const today = new Date();
//         const todayMonth = today.getMonth() + 1; // local month
//         const todayDay = today.getDate();        // local day
//         const startOfDay = new Date(today);
//         startOfDay.setHours(0, 0, 0, 0);

//         const endOfDay = new Date(today);
//         endOfDay.setHours(23, 59, 59, 999);

//         const highlights = [];

//         // 1. Birthdays today
//         const birthdays = await EmployeeModel.aggregate([
//             {
//                 $addFields: {
//                     dobDate: {
//                         $convert: {
//                             input: "$demographics.dob",
//                             to: "date",
//                             onError: null,
//                             onNull: null
//                         }
//                     }
//                 }
//             },
//             {
//                 $match: {
//                     dobDate: { $ne: null },
//                     $expr: {
//                         $and: [
//                             { $eq: [{ $month: "$dobDate" }, todayMonth] },
//                             { $eq: [{ $dayOfMonth: "$dobDate" }, todayDay] }
//                         ]
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     firstName: 1,
//                     lastName: 1,
//                     dobDate: 1
//                 }
//             }
//         ]);




//         highlights.push(...birthdays.map(emp => ({
//             type: 'birthday',
//             title: `${emp.firstName} ${emp.lastName}'s Birthday`,
//             details: `Today is ${emp.firstName} ${emp.lastName}'s birthday!`,
//             date: today,
//             employeeId: emp._id
//         })));

//         // 2. Work anniversaries today
//         const anniversaries = await EmployeeModel.aggregate([
//             {
//                 $addFields: {
//                     joiningDate: {
//                         $convert: {
//                             input: "$dateOfJoining",
//                             to: "date",
//                             onError: null,
//                             onNull: null
//                         }
//                     }
//                 }
//             },
//             {
//                 $match: {
//                     joiningDate: { $ne: null },
//                     $expr: {
//                         $and: [
//                             { $eq: [{ $month: "$joiningDate" }, todayMonth] },
//                             { $eq: [{ $dayOfMonth: "$joiningDate" }, todayDay] }
//                         ]
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     firstName: 1,
//                     lastName: 1,
//                     joiningDate: 1
//                 }
//             }
//         ]);

//         highlights.push(...anniversaries.map(emp => {
//             const years = today.getFullYear() - new Date(emp.joiningDate).getFullYear();
//             return {
//                 type: 'work_anniversary',
//                 title: `${emp.firstName} ${emp.lastName}'s Work Anniversary`,
//                 details: `${emp.firstName} ${emp.lastName} is celebrating ${years} year(s) with the company!`,
//                 date: today,
//                 employeeId: emp._id
//             };
//         }));

//         // 3. Holidays today
//         const holidays = await HolidayModel.find({
//             $expr: {
//                 $and: [
//                     { $eq: [{ $month: "$date" }, todayMonth] },
//                     { $eq: [{ $dayOfMonth: "$date" }, todayDay] }
//                 ]
//             }
//         }).select('holidayName date');

//         highlights.push(...holidays.map(holiday => ({
//             type: 'holiday',
//             title: holiday.holidayName,
//             details: `Today is ${holiday.holidayName} holiday`,
//             date: holiday.date
//         })));

//         // 4. Events today
//         const events = await EventModel.find({
//             $expr: {
//                 $and: [
//                     { $eq: [{ $month: "$date" }, todayMonth] },
//                     { $eq: [{ $dayOfMonth: "$date" }, todayDay] }
//                 ]
//             }
//         }).select('eventName date description');

//         highlights.push(...events.map(event => ({
//             type: 'event',
//             title: event.eventName,
//             details: event.description || '',
//             date: event.date
//         })));

//         // 5. Meetings today
//         // Candidate Interviews (interviewDetails is an array)
//         const jobInterviewMeetings = await CandidateModel.find({
//             "interviewDetails.date": {
//                 $gte: startOfDay,
//                 $lte: endOfDay
//             }
//         }).select('interviewDetails');


//         // Pre-Resignation Meetings (interviewDetails is an array)
//         const preResignationMeetings = await PreResignationModel.find({
//             "interviewDetails.date": {
//                 $gte: startOfDay,
//                 $lte: endOfDay
//             }
//         }).select('interviewDetails');



//         // Resignation Exit Interviews (exitInterviewDetails is an array)
//         const resignationMeetings = await ResignationModel.find({
//             "exitInterviewDetails.date": {
//                 $gte: startOfDay,
//                 $lte: endOfDay
//             }
//         }).select('exitInterviewDetails');



//         // Add Candidate Interviews
//         jobInterviewMeetings.forEach(doc => {
//             (doc.interviewDetails || []).forEach(meeting => {
//                 const date = new Date(meeting.date);
//                 if (date >= startOfDay && date <= endOfDay) {
//                     highlights.push({
//                         type: 'interview_meeting',
//                         title: `Interview: ${meeting.name || 'N/A'}`,
//                         link: meeting.meetingLink || 'N/A',
//                         details: `From ${meeting.startTime || ''} to ${meeting.endTime || ''}. Join: ${meeting.meetingLink || 'N/A'}`,
//                         date: date
//                     });
//                 }
//             });
//         });

//         // Add Pre-Resignation Meetings
//         preResignationMeetings.forEach(doc => {
//             (doc.interviewDetails || []).forEach(meeting => {
//                 const date = new Date(meeting.date);
//                 if (date >= startOfDay && date <= endOfDay) {
//                     highlights.push({
//                         type: 'pre_resignation_meeting',
//                         title: `Pre-Resignation: ${meeting.name || 'N/A'}`,
//                         link: meeting.meetingLink || 'N/A',
//                         details: `From ${meeting.startTime || ''} to ${meeting.endTime || ''}. Join: ${meeting.meetingLink || 'N/A'}`,
//                         date: date
//                     });
//                 }
//             });
//         });

//         // Add Resignation Exit Interviews
//         resignationMeetings.forEach(doc => {
//             (doc.exitInterviewDetails || []).forEach(meeting => {
//                 const date = new Date(meeting.date);
//                 if (date >= startOfDay && date <= endOfDay) {
//                     highlights.push({
//                         type: 'resignation_exit_meeting',
//                         title: `Exit Interview: ${meeting.name || 'N/A'}`,
//                         link: meeting.meetingLink || 'N/A',
//                         details: `From ${meeting.startTime || ''} to ${meeting.endTime || ''}. Join: ${meeting.meetingLink || 'N/A'}`,
//                         date: date
//                     });
//                 }
//             });
//         });

//         highlights.sort((a, b) => new Date(a.date) - new Date(b.date));

//         res.status(200).json({
//             status: "success",
//             message: "Employee highlights fetched",
//             data: highlights
//         });

//     } catch (error) {
//         console.error("Error fetching employee highlights:", error);
//         res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

exports.getEmployeeHighlights = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({ status: "error", message: "Organization UUID is required" });
        }

        const { EmployeeModel, EventModel, HolidayModel, PreResignationModel, CandidateModel, ResignationModel } = await initModels(org_uuid);

        const today = new Date();

        // ✅ frontend se startDate, endDate
        let { startDate, endDate } = req.query;

        if (startDate && endDate) {
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            endDate.setHours(23, 59, 59, 999); // end of day
        } else {
            // default = current month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const highlights = [];

        // 1. Birthdays (within range → check only month/day part)
        const birthdays = await EmployeeModel.aggregate([
            {
                $addFields: {
                    dobDate: {
                        $convert: {
                            input: "$demographics.dob",
                            to: "date",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    dobDate: { $ne: null },
                    status: "Active",
                }
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    dobDate: 1
                }
            }
        ]);

        birthdays.forEach(emp => {
            if (!emp.dobDate) return;
            const dob = new Date(emp.dobDate);
            const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (birthdayThisYear >= startDate && birthdayThisYear <= endDate) {
                highlights.push({
                    type: "birthday",
                    title: `${emp.firstName} ${emp.lastName}'s Birthday`,
                    details: `${emp.firstName} ${emp.lastName}'s birthday!`,
                    date: birthdayThisYear,
                    employeeId: emp._id
                });
            }
        });

        // 2. Work anniversaries (within range)
        const anniversaries = await EmployeeModel.aggregate([
            {
                $addFields: {
                    joiningDate: {
                        $convert: {
                            input: "$dateOfJoining",
                            to: "date",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    joiningDate: { $ne: null },
                    status: "Active"   // ✅ IMPORTANT CONDITION
                }
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    joiningDate: 1
                }
            }
        ]);

        anniversaries.forEach(emp => {
            const jd = new Date(emp.joiningDate);
            if (Number.isNaN(jd.getTime())) return;

            const anniversaryThisYear = new Date(today.getFullYear(), jd.getMonth(), jd.getDate());
            const years = anniversaryThisYear.getFullYear() - jd.getFullYear();
            // Joining day is not an anniversary. First celebration is after 1 full year.
            if (years < 1) return;

            if (anniversaryThisYear >= startDate && anniversaryThisYear <= endDate) {
                highlights.push({
                    type: "work_anniversary",
                    title: `${emp.firstName} ${emp.lastName}'s Work Anniversary`,
                    details: `${emp.firstName} ${emp.lastName} completing ${years} year(s)`,
                    date: anniversaryThisYear,
                    employeeId: emp._id
                });
            }
        });

        // 3. Holidays
        const holidays = await HolidayModel.find({
            date: { $gte: startDate, $lte: endDate }
        }).select("holidayName date");

        highlights.push(...holidays.map(holiday => ({
            type: "holiday",
            title: holiday.holidayName,
            details: `${holiday.holidayName} holiday`,
            date: holiday.date
        })));

        // 4. Events
        const events = await EventModel.find({
            date: { $gte: startDate, $lte: endDate }
        }).select("eventName date description");

        highlights.push(...events.map(event => ({
            type: "event",
            title: event.eventName,
            details: event.description || "",
            date: event.date
        })));

        // 5. Meetings (Candidate / Pre-Resignation / Exit)
        const jobInterviewMeetings = await CandidateModel.find({
            "interviewDetails.date": { $gte: startDate, $lte: endDate }
        }).select("interviewDetails");

        const preResignationMeetings = await PreResignationModel.find({
            "interviewDetails.date": { $gte: startDate, $lte: endDate }
        }).select("interviewDetails");

        const resignationMeetings = await ResignationModel.find({
            "exitInterviewDetails.date": { $gte: startDate, $lte: endDate }
        }).select("exitInterviewDetails");

        // Candidate Interviews
        jobInterviewMeetings.forEach(doc => {
            (doc.interviewDetails || []).forEach(meeting => {
                const date = new Date(meeting.date);
                if (date >= startDate && date <= endDate) {
                    highlights.push({
                        type: "interview_meeting",
                        title: `Interview: ${meeting.name || "N/A"}`,
                        link: meeting.meetingLink || "N/A",
                        details: `From ${meeting.startTime || ""} to ${meeting.endTime || ""}`,
                        date
                    });
                }
            });
        });

        // Pre-Resignation Meetings
        preResignationMeetings.forEach(doc => {
            (doc.interviewDetails || []).forEach(meeting => {
                const date = new Date(meeting.date);
                if (date >= startDate && date <= endDate) {
                    highlights.push({
                        type: "pre_resignation_meeting",
                        title: `Pre-Resignation: ${meeting.name || "N/A"}`,
                        link: meeting.meetingLink || "N/A",
                        details: `From ${meeting.startTime || ""} to ${meeting.endTime || ""}`,
                        date
                    });
                }
            });
        });

        // Resignation Exit Interviews
        resignationMeetings.forEach(doc => {
            (doc.exitInterviewDetails || []).forEach(meeting => {
                const date = new Date(meeting.date);
                if (date >= startDate && date <= endDate) {
                    highlights.push({
                        type: "resignation_exit_meeting",
                        title: `Exit Interview: ${meeting.name || "N/A"}`,
                        link: meeting.meetingLink || "N/A",
                        details: `From ${meeting.startTime || ""} to ${meeting.endTime || ""}`,
                        date
                    });
                }
            });
        });

        // Sort by date
        highlights.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            status: "success",
            message: "Employee highlights fetched",
            data: highlights
        });

    } catch (error) {
        console.error("Error fetching employee highlights:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};

exports.changeEmployeeEmail = async (req, res) => {
    try {
        // Extract organization UUID from headers
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: "error",
                message: "Organization UUID is required",
            });
        }

        // Extract and validate request body
        const { employeeId, newEmail } = req.body;
        if (!employeeId || !newEmail) {
            return res.status(400).json({
                status: "error",
                message: "Employee ID and new email are required",
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid email format",
            });
        }

        // Initialize models with organization UUID
        const { EmployeeModel } = await initModels(org_uuid);

        // Check if the new email is already taken
        const emailExists = await SystemUser.findOne({
            systemUserEmail: newEmail.toLowerCase(),
        });
        if (emailExists) {
            return res.status(400).json({
                status: "error",
                message: "Email already exists",
            });
        }

        // Find system user by linked employeeId
        const systemUser = await SystemUser.findOne({
            "linkSystemUser.employeeId": employeeId,
        });
        if (!systemUser) {
            return res.status(404).json({
                status: "error",
                message: "System user not found",
            });
        }

        // Update system user email
        systemUser.systemUserEmail = newEmail;
        await systemUser.save();

        // Invalidate all current JWT tokens for the user
        await UserJwt.updateMany(
            { systemUserId: systemUser._id },
            { $set: { currentToken: null } }
        );

        // Update employee record
        const employee = await EmployeeModel.findByIdAndUpdate(
            employeeId,
            { email: newEmail },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                status: "error",
                message: "Employee not found",
            });
        }

        // Return success response
        return res.status(200).json({
            status: "success",
            message: "Employee email updated successfully",
            data: employee,
        });
    } catch (error) {
        // Log error for debugging
        console.error("Error changing employee email:", error);

        // Return generic error message to client
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

exports.exitEmployee = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({ status: "error", message: "Organization UUID is required" });
        }

        const { EmployeeModel, ShiftModel, DepartmentModel } = await initModels(org_uuid);
        const { employeeId } = req.params;
        const { exitData, loginLocked, removeFromShift, removeFromDepartment } = req.body;
        const authorizedBy = req.empId;

        // ✅ Validate exitStatus against allowed enum
        const allowedExitStatuses = [
            "Absconding", "AWOL", "Contract Expiry", "Deported", "Expired (Death)",
            "Resigned", "Retired", "Permanent Disability", "Termination", "Superannuation",
            "Cessation", "Abandonment", "Misconduct", "Poor Performance", "Others"
        ];
        if (exitData.exitStatus && !allowedExitStatuses.includes(exitData.exitStatus)) {
            return res.status(400).json({
                status: "error",
                message: `Invalid exit status: ${exitData.exitStatus}`,
            });
        }

        // ✅ Build update object
        const updateData = {
            status: "Inactive",
            exitData: {
                exitStatus: exitData.exitStatus,
                date: exitData.date || new Date(),
                reason: exitData.reason || "",
                authorizedBy: authorizedBy || null,
                // ✅ NEW FIELD
                lastWorkingDay: exitData.lastWorkingDay || null,
            },
        };

        if (loginLocked === true) {
            updateData.loginLocked = true;
            // SystemUser me bhi update karo
            await SystemUser.updateOne(
                { "linkSystemUser.employeeId": employeeId },
                { $set: { "linkSystemUser.$.adminLoginLock": true } }
            );
        }

        if (removeFromShift === true) {
            await ShiftModel.findByIdAndUpdate(
                { _id: employeeId },
                { $pull: { employees: employeeId } }
            );
            updateData.shiftId = null;
        }

        if (removeFromDepartment === true) {
            await DepartmentModel.findByIdAndUpdate(
                { _id: employeeId },
                { $pull: { employees: employeeId } }
            );
            updateData.departmentId = null;
        }

        // ✅ Update employee in one go (no dob validation issue)
        const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
            employeeId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({ status: "error", message: "Employee not found" });
        }

        return res.status(200).json({
            status: "success",
            message: "Employee exit processed successfully",
            data: updatedEmployee,
        });
    } catch (error) {
        console.error("Error in exitEmployee:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


exports.toggleProfileLock = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: "error",
                message: "Organization UUID is required"
            });
        }

        const { EmployeeModel } = await initModels(org_uuid);
        const { employeeId } = req.params;
        const { lock } = req.body; // true = lock, 
        // false = unlock

        if (typeof lock !== "boolean") {
            return res.status(400).json({
                status: "error",
                message: "lock field must be true or false"
            });
        }

        // ✅ Employee update (direct findByIdAndUpdate, save() ki zarurat nahi)
        const employee = await EmployeeModel.findByIdAndUpdate(
            employeeId,
            { $set: { loginLocked: lock } },
            { new: true }
        );
        if (!employee) {
            return res.status(404).json({ status: "error", message: "Employee not found" });
        }

        // ✅ SystemUser update
        await SystemUser.updateOne(
            { "linkSystemUser.employeeId": employee._id },
            { $set: { "linkSystemUser.$.adminLoginLock": lock } }
        );

        return res.status(200).json({
            status: "success",
            message: lock ? "Profile locked successfully" : "Profile unlocked successfully",
            data: {
                employeeId: employee._id,
                loginLocked: lock
            }
        });

    } catch (error) {
        console.error("Error in toggleProfileLock:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: "error", message: "org uuid not found" });
        }

        const { EmployeeModel } = await initModels(org_uuid);
        const { employeeId } = req.params;
        const body = req.body;

        const employee = await EmployeeModel.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ status: "error", message: "Employee not found" });
        }

        let updateData = {};

        // -------------------------
        // BASIC FIELDS
        // -------------------------
        Object.assign(updateData, body); // direct copy — simple

        // -------------------------
        // MERGE NESTED OBJECTS
        // -------------------------
        if (body.demographics)
            updateData.demographics = { ...employee.demographics, ...body.demographics };

        if (body.presentAddress)
            updateData.presentAddress = { ...employee.presentAddress, ...body.presentAddress };

        if (body.permanentAddress)
            updateData.permanentAddress = { ...employee.permanentAddress, ...body.permanentAddress };

        if (body.emergencyContact)
            updateData.emergencyContact = { ...employee.emergencyContact, ...body.emergencyContact };

        if (body.handicappedInfo)
            updateData.handicappedInfo = { ...employee.handicappedInfo, ...body.handicappedInfo };

        if (body.maritalInfo)
            updateData.maritalInfo = { ...employee.maritalInfo, ...body.maritalInfo };

        if (body.bankInfo)
            updateData.bankInfo = { ...employee.bankInfo, ...body.bankInfo };

        if (body.nationalID)
            updateData.nationalID = { ...employee.nationalID, ...body.nationalID };

        if (body.statutoryInfo)
            updateData.statutoryInfo = { ...employee.statutoryInfo, ...body.statutoryInfo };

        // -------------------------
        // PAYROLL FIELDS (NEW)
        // -------------------------
        if (body.payrollInfo)
            updateData.payrollInfo = { ...employee.payrollInfo, ...body.payrollInfo };

        if (body.payrollPreferences)
            updateData.payrollPreferences = { ...employee.payrollPreferences, ...body.payrollPreferences };

        if (body.taxInfo)
            updateData.taxInfo = { ...employee.taxInfo, ...body.taxInfo };

        // -------------------------
        // ONBOARDING (with hiringSource)
        // -------------------------
        if (body.onboarding)
            updateData.onboarding = { ...employee.onboarding, ...body.onboarding };

        // Phone
        if (body.phoneNumber) {
            updateData.phone = { ...employee.phone, mobile: body.phoneNumber };
        }

        // -------------------------
        // BOOLEAN & SIMPLE FIELDS
        // -------------------------
        if (typeof body.isInternationalEmployee !== 'undefined')
            updateData.isInternationalEmployee = body.isInternationalEmployee;

        // -------------------------
        // ARRAY FIELDS (simply replace)
        // -------------------------
        if (Array.isArray(body.previousEmployment))
            updateData.previousEmployment = body.previousEmployment;

        if (Array.isArray(body.qualificationInfo))
            updateData.qualificationInfo = body.qualificationInfo;

        if (Array.isArray(body.familyDetails))
            updateData.familyDetails = body.familyDetails;

        if (body.nominationInfo)
            updateData.nominationInfo = body.nominationInfo;

        if (Array.isArray(body.joiningDocuments))
            updateData.joiningDocuments = body.joiningDocuments;

        if (Array.isArray(body.identificationDocument))
            updateData.identificationDocument = body.identificationDocument;

        // -------------------------
        // 🔗 PAYROLL INTEGRATION: Sync Salary Structure if Changed
        // -------------------------
        if (body.salaryStructureId && body.salaryStructureId !== employee.salaryStructureId?.toString()) {
            const { SalaryStructureModel } = await initModels(org_uuid);
            
            // Remove from old salary structure
            if (employee.salaryStructureId) {
                await SalaryStructureModel.findByIdAndUpdate(
                    employee.salaryStructureId,
                    { $pull: { employees: employeeId } }
                );
            }
            
            // Add to new salary structure
            const salaryStructure = await SalaryStructureModel.findById(body.salaryStructureId);
            if (salaryStructure) {
                await SalaryStructureModel.findByIdAndUpdate(
                    body.salaryStructureId,
                    { $addToSet: { employees: employeeId } }
                );

                // Auto-sync payrollInfo from salary structure (only if not explicitly provided)
                if (!body.payrollInfo || Object.keys(body.payrollInfo).length === 0) {
                    updateData.payrollInfo = {
                        ...employee.payrollInfo,
                        baseSalary: salaryStructure.basicSalary?.totalAmount || employee.payrollInfo?.baseSalary || 0,
                        grossSalary: salaryStructure.grossSalary || employee.payrollInfo?.grossSalary || 0,
                        ctc: (salaryStructure.grossSalary || 0) * 12,
                        salaryEffectiveFrom: salaryStructure.effectiveFrom || new Date()
                    };
                }
            }
        }

        // -------------------------
        // UPDATE IN DB
        // -------------------------
        const updated = await EmployeeModel.findByIdAndUpdate(
            employeeId,
            { $set: updateData },
            { new: true }
        );

        return res.status(200).json({
            status: "success",
            message: "Employee updated successfully",
            data: updated
        });

    } catch (error) {
        console.error("Update Error:", error);
        return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
};

// Add Joining Form Documents
// Add Joining Form Documents
// exports.addJoiningFormDocuments = async (req, res) => {
//     try {
//         const org_uuid = req.headers.org_uuid;
//         if (!org_uuid) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "Organization UUID not found"
//             });
//         }

//         const { employeeId } = req.params;
//         const { EmployeeModel } = await initModels(org_uuid);

//         // Check employee exists
//         const employee = await EmployeeModel.findById(employeeId);
//         if (!employee) {
//             return res.status(404).json({ status: "error", message: "Employee not found" });
//         }

//         // Check any files sent
//         if (!req.files || Object.keys(req.files).length === 0) {
//             return res.status(400).json({ status: "error", message: "No files uploaded" });
//         }

//         const uploadedDocs = [];

//         // req.files = { fieldName: [file] }
//         for (const fieldName of Object.keys(req.files)) {
//             const file = req.files[fieldName][0]; // only one file per field

//             // Upload file to cloud
//             const result = await uploadFile(file);
//             if (!result || !result.url) {
//                 console.warn(`Upload failed for field ${fieldName}`);
//                 continue;
//             }

//             const docEntry = {
//                 fieldName,
//                 url: result.url,
//                 fileName: file.originalname,
//                 mimeType: file.mimetype,
//                 size: file.size,
//                 uploadedAt: new Date()
//             };

//             // Replace existing doc for same field
//             employee.joiningDocuments = employee.joiningDocuments.filter(
//                 d => d.fieldName !== fieldName
//             );

//             employee.joiningDocuments.push(docEntry);
//             uploadedDocs.push(docEntry);
//         }

//         await employee.save();

//         return res.status(200).json({
//             status: "success",
//             message: "Documents uploaded successfully",
//             uploadedDocuments: uploadedDocs,
//             allDocuments: employee.joiningDocuments
//         });

//     } catch (error) {
//         console.error("Add Joining Documents Error:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Failed to upload documents",
//             error: error?.message
//         });
//     }
// };


exports.addJoiningFormDocuments = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: "error",
                message: "Organization UUID not found"
            });
        }

        const { employeeId } = req.params;
        const { TempEmployeeModel } = await initModels(org_uuid);

        // Check employee exists
        const employee = await TempEmployeeModel.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ status: "error", message: "Employee not found" });
        }

        // Check any files sent
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ status: "error", message: "No files uploaded" });
        }

        const uploadedDocs = [];

        // req.files = { fieldName: [file] }
        for (const fieldName of Object.keys(req.files)) {
            const file = req.files[fieldName][0]; // only one file per field

            // Upload file to cloud
            const result = await uploadFile(file);
            if (!result || !result.url) {
                console.warn(`Upload failed for field ${fieldName}`);
                continue;
            }

            const docEntry = {
                fieldName,
                url: result.url,
                fileName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                uploadedAt: new Date()
            };

            // Replace existing doc for same field
            employee.joiningDocuments = employee.joiningDocuments.filter(
                d => d.fieldName !== fieldName
            );

            employee.joiningDocuments.push(docEntry);
            uploadedDocs.push(docEntry);
        }

        await employee.save();

        return res.status(200).json({
            status: "success",
            message: "Documents uploaded successfully",
            uploadedDocuments: uploadedDocs,
            allDocuments: employee.joiningDocuments
        });

    } catch (error) {
        console.error("Add Joining Documents Error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to upload documents",
            error: error?.message
        });
    }
};

/**
 * 🔥 NEW API: Calculate Payroll Info Based on Organization Settings
 * This allows frontend to preview calculated salary before creating employee
 */
exports.calculatePayrollInfo = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }
        console.log("hello");
        const { baseSalary } = req.body;
        
        if (!baseSalary || baseSalary <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'baseSalary is required and must be greater than 0'
            });
        }

       
        // Calculate payroll info using organization's rules
        const calculatedPayroll = await autoCalculatePayrollInfo(baseSalary, org_uuid);

        return res.status(200).json({
            status: 'success',
            message: 'Payroll info calculated successfully',
            data: calculatedPayroll,
            calculation: {
                baseSalary: calculatedPayroll.baseSalary,
                grossSalary: calculatedPayroll.grossSalary,
                monthlyCTC: Math.round(calculatedPayroll.ctc / 12),
                annualCTC: calculatedPayroll.ctc,
                additionalEarnings: calculatedPayroll.grossSalary - calculatedPayroll.baseSalary,
                percentageIncrease: Math.round(((calculatedPayroll.grossSalary - calculatedPayroll.baseSalary) / calculatedPayroll.baseSalary) * 100)
            }
        });

    } catch (error) {
        console.error("Calculate Payroll Info Error:", error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to calculate payroll info',
            error: error?.message
        });
    }
};

exports.employeesList = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { EmployeeModel } = await initModels(org_uuid);

        const {
            name,
            location,
            status,
            categoryId,
            departmentId,
            shiftId,
            orgId,
            jobTitle
        } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 🔹 Build filters
        let filters = {};

        if (name) {
            filters.$or = [
                { firstName: { $regex: name, $options: 'i' } },
                { lastName: { $regex: name, $options: 'i' } }
            ];
        }

        if (location) {
            filters.$or = [
                { 'address.city': { $regex: location, $options: 'i' } },
                { 'address.state': { $regex: location, $options: 'i' } },
                { 'address.country': { $regex: location, $options: 'i' } }
            ];
        }

        if (status) {
            filters.status = status;
        }

        if (orgId) {
            filters.organizationId = orgId;
        }

        if (categoryId) {
            filters.categoryId = categoryId;
        }

        if (departmentId) {
            filters.departmentId = departmentId;
        }

        if (shiftId) {
            filters.shiftId = shiftId;
        }

        // 🔹 Fetch employees (ONLY required fields)
        const employees = await EmployeeModel.find(filters)
            .select("firstName lastName email jobTitle")   // ✅ IMPORTANT LINE
            .skip(skip)
            .limit(limit)
            .exec();

        const totalEmployees = await EmployeeModel.countDocuments(filters);

        return res.status(200).json({
            status: 'success',
            message: 'Employees fetched successfully',
            data: {
                employees,
                totalPages: Math.ceil(totalEmployees / limit),
                currentPage: page,
                totalEmployees
            }
        });

    } catch (error) {
        console.error('Error fetching employees:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.candidateJoiningForm = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { email, password, firstName } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Email is required'
            });
        }

        const { TempEmployeeModel, OrganizationModel, CategoryModel } = await initModels(org_uuid);

        const existingUser = await SystemUser.findOne({ systemUserEmail: email });

        const organization = await OrganizationModel.findById(org_uuid);
        const organizationName = organization?.organizationName || 'Organization';

        const categoryIdString = '576beaf0ed777ab0145122d3';

        let candidateCategory = await CategoryModel.findById(categoryIdString);

        if (!candidateCategory) {
            candidateCategory = await CategoryModel.create({
                _id: new mongoose.Types.ObjectId(categoryIdString),
                name: 'CandidateCategory',
                permissions: [
                    'candidate_joining_form',
                ]
            });
        }

        const updateData = { ...req.body };
        delete updateData.email;
        delete updateData.password;

        // =========================================
        // 🟢 CREATE FLOW
        // =========================================
        if (!existingUser) {

            if (!password || !firstName) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Password and firstName are required'
                });
            }

            const tempEmployee = new TempEmployeeModel({
                email,
                organizationId: org_uuid,
                organizationName,
                createdBy: req.empId || null,
                ...updateData
            });

            const savedTempEmployee = await tempEmployee.save();

            const systemUser = new SystemUser({
                systemUserName: `${firstName} ${req.body.lastName || ''}`.trim(),
                systemUserPassword: bcrypt.hashSync(password, 10),
                systemUserEmail: email,
                categoryId: candidateCategory._id,
                linkSystemUser: [
                    {
                        employeeId: savedTempEmployee._id,
                        organizationId: org_uuid,
                        databaseName: org_uuid,
                        organizationName,
                    }
                ],
            });

            await systemUser.save();

            const loginUrl = resolveLoginUrl(req);
            await candidateJoiningEmail({
                org_uuid,
                employee: {
                    firstName,
                    lastName: req.body.lastName,
                    organizationName
                },
                loginEmail: email,
                rawPassword: password,
                loginUrl,
                frontendUrl: loginUrl,
                req
            });

            return res.status(201).json({
                status: 'success',
                message: 'Candidate created successfully',
                data: savedTempEmployee
            });
        }

        // =========================================
        // 🔵 UPDATE FLOW
        // =========================================
        else {

            if (existingUser.categoryId?.toString() !== categoryIdString) {
                return res.status(403).json({
                    status: 'error',
                    message: 'User is not a candidate'
                });
            }

            const tempEmployeeId = existingUser.linkSystemUser.find(
                link => link.organizationId?.toString() === org_uuid
            )?.employeeId;

            if (!tempEmployeeId) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Temp employee not found'
                });
            }

            // 🔥 UNIVERSAL NESTED UPDATE BUILDER
            const updateQuery = {};

            const buildUpdateQuery = (obj, parentKey = "") => {
                Object.entries(obj).forEach(([key, value]) => {

                    const newKey = parentKey ? `${parentKey}.${key}` : key;

                    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
                        buildUpdateQuery(value, newKey);
                    } else {
                        updateQuery[newKey] = value;
                    }
                });
            };

            buildUpdateQuery(updateData);

            console.log("FINAL UPDATE =>", updateQuery);

            const updatedEmployee = await TempEmployeeModel.findByIdAndUpdate(
                tempEmployeeId,
                { $set: updateQuery },
                {
                    new: true,
                    runValidators: true
                }
            );

            return res.status(200).json({
                status: 'success',
                message: 'Candidate updated successfully',
                data: updatedEmployee
            });
        }

    } catch (error) {
        console.error("ERROR =>", error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

/**
 * 🔥 GET API: Fetch Temp Employee Details (Candidate Info)
 * Helps UI display candidate info before approval
 */
exports.getTempEmployeeDetails = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID is required'
            });
        }

        const { tempEmployeeId } = req.params;
        if (!tempEmployeeId) {
            return res.status(400).json({
                status: 'error',
                message: 'Temp Employee ID is required'
            });
        }

        const { TempEmployeeModel } = await initModels(org_uuid);

        const tempEmployee = await TempEmployeeModel.findById(tempEmployeeId);
        if (!tempEmployee) {
            return res.status(404).json({
                status: 'error',
                message: 'Temp employee not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Temp employee details fetched successfully',
            data: tempEmployee
        });

    } catch (error) {
        console.error('Error fetching temp employee details:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

/**
 * 🔥 GET API: Fetch All Temp Employees (Pending Candidates)
 * Shows list for admin to approve/reject
 */
exports.getAllTempEmployees = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID is required'
            });
        }

        const { TempEmployeeModel } = await initModels(org_uuid);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 🔹 Build filters
        let filters = { organizationId: org_uuid };

        // Filter by status (Pending, Approved, Rejected).
        // Approved candidates are already main employees, so hide them by default.
        const { status } = req.query;
        if (status) {
            filters.candidateJoiningStatus = status;
        } else {
            filters.candidateJoiningStatus = { $ne: 'Approved' };
        }

        // Filter by name
        const { name } = req.query;
        if (name) {
            filters.$or = [
                { firstName: { $regex: name, $options: 'i' } },
                { lastName: { $regex: name, $options: 'i' } },
                { email: { $regex: name, $options: 'i' } }
            ];
        }

        // 🔹 Fetch temp employees
        const tempEmployees = await TempEmployeeModel.find(filters)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .exec();

        const total = await TempEmployeeModel.countDocuments(filters);

        return res.status(200).json({
            status: 'success',
            message: 'Temp employees fetched successfully',
            data: {
                tempEmployees,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching temp employees:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.approvedCandidateJoiningForm = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        const { tempEmployeeId } = req.params;

        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { 
            TempEmployeeModel, 
            EmployeeModel, 
            DepartmentModel,
            ShiftModel,
            UniqueIdModel,
            SalaryStructureModel
        } = await initModels(org_uuid);

        const tempEmployee = await TempEmployeeModel.findById(tempEmployeeId);
        if (!tempEmployee) {
            return res.status(404).json({ status: 'error', message: 'Temp employee not found' });
        }

        if (tempEmployee.status === 'Approved' || tempEmployee.candidateJoiningStatus === 'Approved') {
            return res.status(409).json({ status: 'error', message: 'Already approved' });
        }

        // 🔥 EXTRACT NESTED OBJECTS PROPERLY
        const extractNestedObject = (obj, prefix = '') => {
            const result = {};
            Object.keys(obj).forEach(key => {
                if (key.includes('.')) {
                    const parts = key.split('.');
                    let current = result;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!current[parts[i]]) {
                            current[parts[i]] = {};
                        }
                        current = current[parts[i]];
                    }
                    current[parts[parts.length - 1]] = obj[key];
                } else {
                    result[key] = obj[key];
                }
            });
            return result;
        };

        const tempEmployeeObj = tempEmployee.toObject ? tempEmployee.toObject() : tempEmployee;
        const extractedData = extractNestedObject(tempEmployeeObj);

        // 🔥 UNIQUE ID
        let employeeUniqueId = await UniqueIdModel.findOne();
        if (!employeeUniqueId) {
            const orgPrefix = tempEmployee.organizationName?.substring(0, 3).toUpperCase() || 'ORG';
            employeeUniqueId = new UniqueIdModel({ name: orgPrefix, value: 1 });
        } else {
            employeeUniqueId.value += 1;
        }
        await employeeUniqueId.save();

        // 🔥 PAYROLL AUTO CALC
        let finalPayrollInfo = extractedData.payrollInfo || {};
        if (finalPayrollInfo.baseSalary && !finalPayrollInfo.grossSalary) {
            const calculated = await autoCalculatePayrollInfo(finalPayrollInfo.baseSalary, org_uuid);
            finalPayrollInfo = {
                ...calculated,
                ...finalPayrollInfo
            };
        }

        // ✅ CREATE EMPLOYEE
        const employeePayload = {
            firstName: tempEmployee.firstName,
            lastName: tempEmployee.lastName,
            email: tempEmployee.email,
            phone: extractedData.phone || {},
            presentAddress: extractedData.presentAddress || {},
            permanentAddress: extractedData.permanentAddress || {},
            maritalInfo: extractedData.maritalInfo || {},
            emergencyContact: extractedData.emergencyContact || {},
            identificationDocument: extractedData.identificationDocument || [],
            jobTitle: extractedData.jobTitle || '',
            status: 'Active',
            organizationId: tempEmployee.organizationId,
            organizationName: tempEmployee.organizationName,
            uniqueId: `${employeeUniqueId.name}${employeeUniqueId.value.toString().padStart(5, '0')}`,
            createdBy: req.empId || null,

            // 🔥 NESTED OBJECTS
            demographics: extractedData.demographics || {},
            onboarding: extractedData.onboarding || {},
            payrollInfo: finalPayrollInfo,
            payrollPreferences: extractedData.payrollPreferences || {},
            taxInfo: extractedData.taxInfo || {},
            bankInfo: extractedData.bankInfo || {},
            statutoryInfo: extractedData.statutoryInfo || {},

            // 📄 TRANSFER JOINING DOCUMENTS
            joiningDocuments: extractedData.joiningDocuments || [],

            // 🎯 CANDIDATE JOINING STATUS
            candidateJoiningStatus: 'Approved',

            departmentId: extractedData.departmentId,
            shiftId: extractedData.shiftId,
            salaryStructureId: extractedData.salaryStructureId,
            dateOfJoining: extractedData.dateOfJoining || new Date(),
        };

        const savedEmployee = await EmployeeModel.create(employeePayload);

        // ✅ UPDATE DEPARTMENT
        if (employeePayload.departmentId) {
            await DepartmentModel.findByIdAndUpdate(
                employeePayload.departmentId,
                { $addToSet: { employees: savedEmployee._id } }
            );
        }

        // ✅ UPDATE SHIFT
        if (employeePayload.shiftId) {
            await ShiftModel.findByIdAndUpdate(
                employeePayload.shiftId,
                { $addToSet: { employees: savedEmployee._id } }
            );
        }

        // 🔥 SALARY STRUCTURE INTEGRATION
        if (employeePayload.salaryStructureId) {
            const salaryStructure = await SalaryStructureModel.findById(employeePayload.salaryStructureId);

            if (salaryStructure) {
                await SalaryStructureModel.findByIdAndUpdate(
                    employeePayload.salaryStructureId,
                    { $addToSet: { employees: savedEmployee._id } }
                );

                if (!extractedData.payrollInfo?.baseSalary) {
                    await EmployeeModel.findByIdAndUpdate(savedEmployee._id, {
                        $set: {
                            'payrollInfo.baseSalary': salaryStructure.basicSalary?.totalAmount || 0,
                            'payrollInfo.grossSalary': salaryStructure.grossSalary || 0,
                            'payrollInfo.ctc': (salaryStructure.grossSalary || 0) * 12
                        }
                    });
                }
            }
        }

        // ✅ SYSTEM USER UPDATE
        const systemUser = await SystemUser.findOne({ systemUserEmail: tempEmployee.email });

        if (systemUser) {
            systemUser.systemUserName = `${savedEmployee.firstName} ${savedEmployee.lastName}`.trim();

            systemUser.linkSystemUser = systemUser.linkSystemUser.map(link => {
                if (link.employeeId?.toString() === tempEmployee._id.toString()) {
                    return {
                        ...link.toObject?.() || link,
                        employeeId: savedEmployee._id
                    };
                }
                return link;
            });

            await systemUser.save();
        }

        // Main employee is created, so remove the temp record.
        await TempEmployeeModel.findByIdAndDelete(tempEmployee._id);

        return res.status(200).json({
            status: 'success',
            message: 'Employee approved successfully',
            data: savedEmployee
        });

    } catch (error) {
        console.error('Approve error:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
