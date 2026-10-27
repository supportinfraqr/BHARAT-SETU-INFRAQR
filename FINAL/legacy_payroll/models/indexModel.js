const mongoose = require('mongoose');
const Organization = require('../models/organizationModel');
const SystemUser = require('../models/systemUserModel');
const Employee = require('../models/employeeModel');
const Attendance = require('../models/attendanceModel');
const Department = require('../models/departmentModel');
const Holiday = require('../models/holidayModel');
const Folder = require('./folderModel');
const { documentSchema } = require('../models/documentModel');
const Shift = require('../models/shiftModel');
const salaryStructure = require('../models/salaryStructureModel');
const PayRoll = require('../models/payRollModel');
const uniqueId = require('../models/employeeIdModel');
const { CategorySchema } = require('../models/userCategoryModel');
const Event = require('./eventModel');
const Position = require('./positionModel');
const Job = require('./jobModel');
const JobTemplate = require('./jobTemplateModel');
const Candidate = require('./candidateModel');
const Template = require('./templateModel');
const PreResignation = require('./preResignationModel');
const Resignation = require('./resignationModel');
const Notification = require('./notificationModel');
const StaffPortal = require('../models/payroll/staffPortal');
const StatutoryCompliance = require('../models/payroll/statutoryCompliance');
const ClaimsDeclaration = require('../models/payroll/claimsDeclaration');
const PayrollRun = require('../models/payroll/payrollRun');
const PayrollSchedule = require('../models/payroll/payrollSchedule');
const SalaryCompensation = require('../models/payroll/salaryCompensation');
const FullAndFinal = require('../models/payroll/fullAndFinal');
const EmployeePreferences = require('../models/payroll/employeePreferences');
const TDSConfig = require('../models/payroll/tdsConfig');
const EmployeeTDS = require('../models/payroll/employeeTDS');
const PayrollAuditLog = require('../models/payroll/payrollAuditLog');
const SalaryRevision = require('../models/payroll/salaryRevision');
const Arrears = require('../models/payroll/arrears');
const BankFileRecord = require('../models/payroll/bankFileRecord');
const PayrollOneTimeImport = require('../models/payroll/payrollOneTimeImport');
const PayrollSalaryRevisionImport = require('../models/payroll/payrollSalaryRevisionImport');
const LoanType = require('../models/payroll/loanType');
const EmployeeLoan = require('../models/payroll/employeeLoan');
const LoanRepayment = require('../models/payroll/loanRepayment');
const ShiftAssign = require('./shiftAssignModel');
const ReportingMethod = require('./reportingMethodModel');
const RegularizationMethod = require('./regularizationMethodModel');
const AttendancePolicy = require('./attendancePolicyModel');
const RegularizationRequest = require('./regularizationRequestModel');
const BiometricDevice = require('./biometricDeviceModel');
const BiometricPunchLog = require('./biometricPunchLogModel');
const PasswordChangeLog = require('./passwordChangeLogModel');
const LiveLocation = require('./liveLocationModel');

// leave models
const LeaveName = require('../models/leave/leaveNameSchema');
const LeaveReason = require('../models/leave/leaveReasonSchema');
const LeaveType = require('../models/leave/leaveTypeSchema');
const LeaveRequest = require('../models/leave/leaveRequestSchema');
const LeaveYearEndHistory = require('../models/leave/leaveYearEndHistorySchema');
const TempEmployee = require('../models/tempEmployeeModel');



const { getDatabaseConnection } = require('../config/mongo');



// Function to initialize models
const initModels = async (orgUuid) => {
    const OrganizationDB = await getDatabaseConnection(orgUuid);
    const AttendanceModel = OrganizationDB.model('Attendance', Attendance);
    const EmployeeModel = OrganizationDB.model('Employee', Employee);
    const DepartmentModel = OrganizationDB.model('Department', Department);
    const OrganizationModel = OrganizationDB.model('Organization', Organization);
    const HolidayModel = OrganizationDB.model('Holiday', Holiday);
    const FolderModel = OrganizationDB.model('Folder', Folder);
    const DocumentModel = OrganizationDB.model('Document', documentSchema);
    const ShiftModel = OrganizationDB.model('Shift', Shift);
    const SalaryStructureModel = OrganizationDB.model('SalaryStructure', salaryStructure);
    const PayrollModel = OrganizationDB.model('Payroll', PayRoll);
    const UniqueIdModel = OrganizationDB.model('UniqueId', uniqueId);
    const CategoryModel = OrganizationDB.model('Category', CategorySchema);
    const EventModel = OrganizationDB.model('Event', Event);
    const PositionModel = OrganizationDB.model('Position', Position);
    const JobModel = OrganizationDB.model('Job', Job);
    const JobTemplateModel = OrganizationDB.model('JobTemplate', JobTemplate);
    const CandidateModel = OrganizationDB.model('Candidate', Candidate);
    const TempEmployeeModel = OrganizationDB.model('TempEmployee', TempEmployee);
    const TemplateModel = OrganizationDB.model('Template', Template);
    const PreResignationModel = OrganizationDB.model('PreResignation', PreResignation);
    const ResignationModel = OrganizationDB.model('Resignation', Resignation);
    const NotificationModel = OrganizationDB.model('Notification', Notification);
    const ShiftAssignModel = OrganizationDB.model('ShiftAssign', ShiftAssign);
    const ReportingMethodModel = OrganizationDB.model('ReportingMethod', ReportingMethod);
    const RegularizationMethodModel = OrganizationDB.model('RegularizationMethod', RegularizationMethod);
    const AttendancePolicyModel = OrganizationDB.model('AttendancePolicy', AttendancePolicy);
    const RegularizationRequestModel = OrganizationDB.model('RegularizationRequest', RegularizationRequest);
    const BiometricDeviceModel = OrganizationDB.model('BiometricDevice', BiometricDevice);
    const BiometricPunchLogModel = OrganizationDB.model('BiometricPunchLog', BiometricPunchLog);
    const PasswordChangeLogModel = OrganizationDB.model('PasswordChangeLog', PasswordChangeLog);
    const LiveLocationModel = OrganizationDB.model('LiveLocation', LiveLocation);

    // leave models

    const LeaveTypeModel = OrganizationDB.model('LeaveType', LeaveType);
    const LeaveRequestModel = OrganizationDB.model('LeaveRequest', LeaveRequest);
    const LeaveNameModel = OrganizationDB.model('LeaveName', LeaveName);
    const LeaveReasonModel = OrganizationDB.model('LeaveReason', LeaveReason);
    const LeaveYearEndHistoryModel = OrganizationDB.model('LeaveYearEndHistory', LeaveYearEndHistory);

    //payroll models
    const StaffPortalModel = OrganizationDB.model('StaffPortal', StaffPortal);
    const StatutoryComplianceModel = OrganizationDB.model('StatutoryCompliance', StatutoryCompliance);
    const ClaimsDeclarationModel = OrganizationDB.model('ClaimsDeclaration', ClaimsDeclaration);
    const PayrollRunModel = OrganizationDB.model('PayrollRun', PayrollRun);
    const PayrollScheduleModel = OrganizationDB.model('PayrollSchedule', PayrollSchedule);
    const SalaryCompensationModel = OrganizationDB.model('SalaryCompensation', SalaryCompensation);
    const FullAndFinalModel = OrganizationDB.model('FullAndFinal', FullAndFinal);
    const EmployeePreferencesModel = OrganizationDB.model('EmployeePreferences', EmployeePreferences);
    const TDSConfigModel = OrganizationDB.model('TDSConfig', TDSConfig);
    const EmployeeTDSModel = OrganizationDB.model('EmployeeTDS', EmployeeTDS);
    const PayrollAuditLogModel = OrganizationDB.model('PayrollAuditLog', PayrollAuditLog);
    const SalaryRevisionModel = OrganizationDB.model('SalaryRevision', SalaryRevision);
    const ArrearsModel = OrganizationDB.model('Arrears', Arrears);
    const BankFileRecordModel = OrganizationDB.model('BankFileRecord', BankFileRecord);
    const PayrollOneTimeImportModel = OrganizationDB.model('PayrollOneTimeImport', PayrollOneTimeImport);
    const PayrollSalaryRevisionImportModel = OrganizationDB.model(
      'PayrollSalaryRevisionImport',
      PayrollSalaryRevisionImport
    );
    const LoanTypeModel = OrganizationDB.model('LoanType', LoanType);
    const EmployeeLoanModel = OrganizationDB.model('EmployeeLoan', EmployeeLoan);
    const LoanRepaymentModel = OrganizationDB.model('LoanRepayment', LoanRepayment);







    return {
        AttendanceModel,
        EmployeeModel,
        DepartmentModel,
        OrganizationModel,
        LeaveTypeModel,
        LeaveRequestModel,
        LeaveNameModel,
        LeaveReasonModel,
        LeaveYearEndHistoryModel,
        HolidayModel,
        FolderModel,
        DocumentModel,
        ShiftModel,
        SalaryStructureModel,
        PayrollModel,
        UniqueIdModel,
        CategoryModel,
        EventModel,
        PositionModel,
        JobModel,
        JobTemplateModel,
        CandidateModel,
        TempEmployeeModel,
        TemplateModel,
        PreResignationModel,
        ResignationModel,
        NotificationModel,
        StaffPortalModel,
        StatutoryComplianceModel,
        ClaimsDeclarationModel,
        PayrollRunModel,
        PayrollScheduleModel,
        SalaryCompensationModel,
        FullAndFinalModel,
        EmployeePreferencesModel,
        TDSConfigModel,
        EmployeeTDSModel,
        PayrollAuditLogModel,
        SalaryRevisionModel,
        ArrearsModel,
        BankFileRecordModel,
        PayrollOneTimeImportModel,
        PayrollSalaryRevisionImportModel,
        LoanTypeModel,
        EmployeeLoanModel,
        LoanRepaymentModel,
        ShiftAssignModel,
        ReportingMethodModel,
        RegularizationMethodModel,
        AttendancePolicyModel,
        RegularizationRequestModel,
        BiometricDeviceModel,
        BiometricPunchLogModel,
        PasswordChangeLogModel,
        LiveLocationModel
    };
};

module.exports = {
    initModels
};
