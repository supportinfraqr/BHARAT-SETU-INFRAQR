const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const mongoose = require('mongoose');
const {
  getEmployeeLeaveEncashmentDetails,
} = require('../../utils/payroll/ffLeaveEncashmentHelper');
const { buildSettlementPreview, leaveRate, GRATUITY_CAP } = require('../../utils/payroll/ffSettlementPreview');

const EMPLOYEE_FIELDS = 'firstName lastName email uniqueId jobTitle dateOfJoining exitData status';

function isSettlementLocked(settlement) {
  return settlement?.status === 'finalized' || settlement?.status === 'paid';
}


exports.initiateFullAndFinal = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { FullAndFinalModel } = await initModels(org_uuid);

    const { employeeId, resignationId, lastWorkingDate } = req.body;

    if (!employeeId || !lastWorkingDate) {
      return sendResponse(res, 400, false, 'Employee ID and last working date are required');
    }

    const normalizedResignationId = typeof resignationId === 'string'
      ? resignationId.trim().replace(/^"+|"+$/g, '')
      : resignationId;

    if (
      normalizedResignationId &&
      !mongoose.Types.ObjectId.isValid(normalizedResignationId)
    ) {
      return sendResponse(res, 400, false, 'Invalid resignation ID');
    }

    // Check if already exists
    const existing = await FullAndFinalModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (existing) {
      return sendResponse(res, 400, false, 'Full & Final settlement already initiated for this employee');
    }

    const settlement = new FullAndFinalModel({
      organizationId: org_uuid,
      employeeId,
      resignationId: normalizedResignationId || undefined,
      lastWorkingDate,
      status: 'initiated',
    });

    await settlement.save();

    return sendResponse(res, 201, true, 'Full & Final settlement initiated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateSalaryDues = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      unpaidSalary,
      workingDaysInLastMonth,
      proratedSalary,
      basicSalary,
      allowances,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    settlement.salaryDues = {
      unpaidSalary: unpaidSalary || 0,
      workingDaysInLastMonth: workingDaysInLastMonth || 0,
      proratedSalary: proratedSalary || 0,
      basicSalary: basicSalary || 0,
      allowances: allowances || 0,
      formula: req.body.formula || settlement.salaryDues?.formula || '',
    };

    await settlement.save();

    return sendResponse(res, 200, true, 'Salary dues updated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateLeaveEncashment = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      availableLeaves,
      encashableLeaves,
      method,
      basicSalary,
      grossSalary,
      formula,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    const resolvedMethod = method || settlement.leaveEncashment?.method || 'basic_26';
    const basic = Number(basicSalary ?? settlement.leaveEncashment?.basicSalary) || 0;
    const gross = Number(grossSalary ?? settlement.leaveEncashment?.grossSalary) || 0;
    const rate = leaveRate(resolvedMethod, basic, gross);
    const perDayRate = rate.perDayRate || Number(req.body.perDayRate) || 0;
    const leaves = Number(encashableLeaves) || 0;

    settlement.leaveEncashment = {
      availableLeaves: availableLeaves || 0,
      encashableLeaves: leaves,
      perDayRate,
      totalAmount: Math.round(leaves * perDayRate * 100) / 100,
      method: resolvedMethod,
      basicSalary: basic,
      grossSalary: gross,
      formula: formula || `Encashable leaves × (${rate.formula})`,
    };

    await settlement.save();

    return sendResponse(res, 200, true, 'Leave encashment updated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateBonusIncentives = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      performanceBonus,
      statutoryBonus,
      incentives,
      commission,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    settlement.bonusIncentives = {
      performanceBonus: performanceBonus || 0,
      statutoryBonus: statutoryBonus || 0,
      incentives: incentives || 0,
      commission: commission || 0,
      method: req.body.method || '',
      formula: req.body.formula || '',
      monthsCounted: req.body.monthsCounted || 0,
      calcBase: req.body.calcBase || 0,
      percentage: req.body.percentage || 0,
      eligible: !!req.body.eligible,
    };

    await settlement.save();

    return sendResponse(res, 200, true, 'Bonus and incentives updated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateDeductions = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      noticePeriodShortfall,
      loansAdvances,
      companyAssetRecovery,
      damageLoss,
      overtimeTaken,
      otherDeductions,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    const totalDeductions =
      (noticePeriodShortfall || 0) +
      (loansAdvances || 0) +
      (companyAssetRecovery || 0) +
      (damageLoss || 0) +
      (overtimeTaken || 0) +
      (otherDeductions || 0);

    settlement.deductions = {
      noticePeriodShortfall: noticePeriodShortfall || 0,
      loansAdvances: loansAdvances || 0,
      companyAssetRecovery: companyAssetRecovery || 0,
      damageLoss: damageLoss || 0,
      overtimeTaken: overtimeTaken || 0,
      otherDeductions: otherDeductions || 0,
      totalDeductions,
    };

    await settlement.save();

    return sendResponse(res, 200, true, 'Deductions updated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateGratuity = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      isEligible,
      yearsOfService,
      lastDrawnSalary,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    const years = Number(yearsOfService) || 0;
    const wage = Number(lastDrawnSalary) || 0;
    const raw = isEligible ? (wage * 15 * years) / 26 : 0;
    const capped = raw > GRATUITY_CAP;
    const gratuityAmount = Math.round(Math.min(GRATUITY_CAP, raw) * 100) / 100;

    settlement.gratuity = {
      isEligible: !!isEligible,
      yearsOfService: years,
      completedYears: Number(req.body.completedYears) || settlement.gratuity?.completedYears || 0,
      lastDrawnSalary: wage,
      gratuityAmount,
      formula: isEligible
        ? `(Last drawn Basic + DA × 15 × ${years}) / 26${capped ? '. Capped at 20,00,000.' : ''}`
        : 'Not eligible',
      reason: req.body.reason || '',
      capped,
    };

    await settlement.save();

    return sendResponse(res, 200, true, 'Gratuity updated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.calculateFinalSettlement = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    // Payable salary is unpaid arrears plus last-month prorated pay.
    // Monthly basic and allowances are already inside the prorated gross.
    const salaryTotal =
      (settlement.salaryDues?.unpaidSalary || 0) +
      (settlement.salaryDues?.proratedSalary || 0);

    const leaveTotal = settlement.leaveEncashment?.totalAmount || 0;

    const bonusTotal =
      (settlement.bonusIncentives?.performanceBonus || 0) +
      (settlement.bonusIncentives?.statutoryBonus || 0) +
      (settlement.bonusIncentives?.incentives || 0) +
      (settlement.bonusIncentives?.commission || 0);

    const reimbursementTotal = settlement.pendingReimbursements?.totalAmount || 0;

    const gratuityTotal = settlement.gratuity?.gratuityAmount || 0;

    const totalPayables =
      salaryTotal + leaveTotal + bonusTotal + reimbursementTotal + gratuityTotal;

    // Calculate total deductions
    const totalDeductions =
      (settlement.deductions?.totalDeductions || 0) +
      (settlement.taxDeductions?.totalTax || 0);

    // Net payable
    const netPayable = totalPayables - totalDeductions;

    // Update settlement
    settlement.totalPayables = totalPayables;
    settlement.totalDeductions = totalDeductions;
    settlement.netPayable = netPayable;

    await settlement.save();

    return sendResponse(res, 200, true, 'Final settlement calculated successfully', {
      totalPayables,
      totalDeductions,
      netPayable,
      settlement
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.addApproval = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      approverName,
      approverRole,
      status,
      comments,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (isSettlementLocked(settlement)) {
      return sendResponse(res, 400, false, 'Finalized settlement cannot be changed');
    }

    settlement.approvals.push({
      approverName,
      approverRole,
      approvedDate: new Date(),
      status: status || 'pending',
      comments: comments || '',
    });

    // Update settlement status
    if (status === 'approved') {
      settlement.status = 'approved';
    } else if (status === 'rejected') {
      settlement.status = 'rejected';
    }

    await settlement.save();

    return sendResponse(res, 200, true, 'Approval added successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updatePaymentDetails = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const {
      paymentMode,
      paymentDate,
      transactionId,
      bankAccountNumber,
      ifscCode,
    } = req.body;

    const settlement = await FullAndFinalModel.findById(settlementId);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }

    settlement.paymentDetails = {
      paymentMode,
      paymentDate: paymentDate || new Date(),
      transactionId,
      bankAccountNumber,
      ifscCode,
    };

    settlement.status = 'paid';
    settlement.settlementDate = new Date();

    await settlement.save();

    return sendResponse(res, 200, true, 'Payment details updated successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getEmployeeLeaveEncashmentDetails = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { asOfDate } = req.query;

    const result = await getEmployeeLeaveEncashmentDetails({
      org_uuid,
      employeeId,
      asOfDate,
      initModels,
    });

    if (result.error) {
      return sendResponse(res, result.error.status, false, result.error.message);
    }

    return sendResponse(
      res,
      200,
      true,
      'Employee leave encashment details fetched successfully',
      result.data
    );
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getSettlementByEmployee = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const settlement = await FullAndFinalModel.findOne({
      organizationId: org_uuid,
      employeeId,
    }).populate('employeeId', EMPLOYEE_FIELDS);

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }

    return sendResponse(res, 200, true, 'Settlement fetched successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getSettlementById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { settlementId } = req.params;
    const { FullAndFinalModel } = await initModels(org_uuid);

    const settlement = await FullAndFinalModel.findById(settlementId).populate(
      'employeeId',
      EMPLOYEE_FIELDS
    );

    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }

    return sendResponse(res, 200, true, 'Settlement fetched successfully', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getAllSettlements = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { FullAndFinalModel } = await initModels(org_uuid);

    const settlements = await FullAndFinalModel.find({
      organizationId: org_uuid,
    }).populate('employeeId', EMPLOYEE_FIELDS);

    return sendResponse(res, 200, true, 'Settlements fetched successfully', settlements);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getExitedEmployees = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { EmployeeModel } = await initModels(org_uuid);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 30);
    const search = String(req.query.search || '').trim();
    const left = {
      $or: [
        { status: 'Inactive' },
        { 'exitData.exitStatus': { $exists: true, $nin: [null, ''] } },
        { 'exitData.lastWorkingDay': { $ne: null } },
      ],
    };
    const filter = { ...left };
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and = [
        left,
        {
          $or: [
            { firstName: { $regex: safe, $options: 'i' } },
            { lastName: { $regex: safe, $options: 'i' } },
            { uniqueId: { $regex: safe, $options: 'i' } },
            { email: { $regex: safe, $options: 'i' } },
          ],
        },
      ];
      delete filter.$or;
    }

    const [employees, totalEmployees] = await Promise.all([
      EmployeeModel.find(filter)
        .select('firstName lastName email uniqueId jobTitle status exitData dateOfJoining')
        .sort({ 'exitData.lastWorkingDay': -1, firstName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmployeeModel.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, 'Left employees fetched successfully', {
      employees,
      totalEmployees,
      totalPages: Math.max(1, Math.ceil(totalEmployees / limit)),
      currentPage: page,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getSettlementPreview = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const result = await buildSettlementPreview({
      org_uuid,
      employeeId: req.params.employeeId,
      lastWorkingDate: req.query.lastWorkingDate,
      initModels,
    });
    if (result.error) {
      return sendResponse(res, result.error.status, false, result.error.message);
    }
    return sendResponse(res, 200, true, 'Settlement preview calculated', result.data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.finalizeSettlement = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { FullAndFinalModel } = await initModels(org_uuid);
    const settlement = await FullAndFinalModel.findById(req.params.settlementId);
    if (!settlement) {
      return sendResponse(res, 404, false, 'Settlement not found');
    }
    if (settlement.status === 'paid') {
      return sendResponse(res, 400, false, 'Paid settlement is already closed');
    }
    if (settlement.status === 'rejected') {
      return sendResponse(res, 400, false, 'Rejected settlement cannot be finalized');
    }

    const salaryTotal = (settlement.salaryDues?.unpaidSalary || 0) + (settlement.salaryDues?.proratedSalary || 0);
    const leaveTotal = settlement.leaveEncashment?.totalAmount || 0;
    const bonusTotal =
      (settlement.bonusIncentives?.performanceBonus || 0) +
      (settlement.bonusIncentives?.statutoryBonus || 0) +
      (settlement.bonusIncentives?.incentives || 0) +
      (settlement.bonusIncentives?.commission || 0);
    const totalPayables = salaryTotal + leaveTotal + bonusTotal + (settlement.pendingReimbursements?.totalAmount || 0) + (settlement.gratuity?.gratuityAmount || 0);
    const totalDeductions = (settlement.deductions?.totalDeductions || 0) + (settlement.taxDeductions?.totalTax || 0);
    settlement.totalPayables = totalPayables;
    settlement.totalDeductions = totalDeductions;
    settlement.netPayable = totalPayables - totalDeductions;
    settlement.status = 'finalized';
    settlement.finalizedAt = new Date();
    await settlement.save();

    return sendResponse(res, 200, true, 'Full and final settlement finalized', settlement);
  } catch (err) {
    return handleError(res, err);
  }
};
