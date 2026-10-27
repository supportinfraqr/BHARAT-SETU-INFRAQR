const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');


exports.createOrUpdateFlexiblePlan = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const {
      componentId,
      componentName,
      amount,
      month,
    } = req.body;

    if (!componentName || !amount) {
      return sendResponse(res, 400, false, 'Component name and amount are required');
    }

    let claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      claim = new ClaimsDeclarationModel({
        organizationId: org_uuid,
        employeeId,
        flexibleBenefitPlan: [],
      });
    }

    claim.flexibleBenefitPlan.push({
      componentId,
      componentName,
      amount,
      month,
      status: 'pending',
    });

    await claim.save();

    return sendResponse(res, 200, true, 'Flexible benefit plan added successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateFlexiblePlanStatus = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId, planId } = req.params;
    const { status, amount } = req.body;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return sendResponse(res, 400, false, 'Invalid status. Must be approved, rejected, or pending');
    }

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      return sendResponse(res, 404, false, 'No claims found for this employee');
    }

    const plan = claim.flexibleBenefitPlan.id(planId);
    if (!plan) {
      return sendResponse(res, 404, false, 'Flexible plan not found');
    }

    plan.status = status;
    if (amount !== undefined) {
      plan.amount = amount;
    }

    claim.markModified('flexibleBenefitPlan');
    await claim.save();

    return sendResponse(res, 200, true, 'Flexible plan status updated successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getFlexiblePlansByEmployee = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    return sendResponse(res, 200, true, 'Flexible plans fetched successfully', claim?.flexibleBenefitPlan || []);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.submitReimbursementClaim = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const {
      name,
      type,
      claimDate,
      claimedAmount,
      proofUrl,
    } = req.body;

    if (!name || !type || !claimedAmount) {
      return sendResponse(res, 400, false, 'Name, type, and claimed amount are required');
    }

    let claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      claim = new ClaimsDeclarationModel({
        organizationId: org_uuid,
        employeeId,
        reimbursements: [],
      });
    }

    claim.reimbursements.push({
      name,
      type,
      claimDate: claimDate || new Date(),
      claimedAmount,
      approvedAmount: 0,
      proofUrl: proofUrl || '',
      status: 'pending',
    });

    await claim.save();

    return sendResponse(res, 200, true, 'Reimbursement claim submitted successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateReimbursementStatus = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId, claimId } = req.params;
    const { status, approvedAmount } = req.body;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return sendResponse(res, 400, false, 'Invalid status');
    }

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      return sendResponse(res, 404, false, 'No claims found for this employee');
    }

    const reimbursement = claim.reimbursements.id(claimId);
    if (!reimbursement) {
      return sendResponse(res, 404, false, 'Reimbursement claim not found');
    }

    reimbursement.status = status;
    if (approvedAmount !== undefined) {
      reimbursement.approvedAmount = approvedAmount;
    }

    claim.markModified('reimbursements');
    await claim.save();

    return sendResponse(res, 200, true, 'Reimbursement status updated successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getReimbursementsByEmployee = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    return sendResponse(res, 200, true, 'Reimbursements fetched successfully', claim?.reimbursements || []);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.saveIncomeTaxDeclaration = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const {
      section,
      subSection,
      amountDeclared,
    } = req.body;

    if (!section || !amountDeclared) {
      return sendResponse(res, 400, false, 'Section and amount declared are required');
    }

    let claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      claim = new ClaimsDeclarationModel({
        organizationId: org_uuid,
        employeeId,
        incomeTaxDeclarations: [],
      });
    }

    claim.incomeTaxDeclarations.push({
      section,
      subSection: subSection || '',
      amountDeclared,
      amountApproved: 0,
    });

    await claim.save();

    return sendResponse(res, 200, true, 'Income tax declaration saved successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateIncomeTaxDeclaration = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId, declarationId } = req.params;
    const { amountApproved } = req.body;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      return sendResponse(res, 404, false, 'No claims found for this employee');
    }

    const declaration = claim.incomeTaxDeclarations.id(declarationId);
    if (!declaration) {
      return sendResponse(res, 404, false, 'Declaration not found');
    }

    declaration.amountApproved = amountApproved;
    claim.markModified('incomeTaxDeclarations');
    await claim.save();

    return sendResponse(res, 200, true, 'Income tax declaration updated successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getIncomeTaxDeclarationsByEmployee = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    return sendResponse(res, 200, true, 'Income tax declarations fetched successfully', claim?.incomeTaxDeclarations || []);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.uploadInvestmentProof = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const {
      declarationId,
      fileUrl,
    } = req.body;

    if (!declarationId || !fileUrl) {
      return sendResponse(res, 400, false, 'Declaration ID and file URL are required');
    }

    let claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      claim = new ClaimsDeclarationModel({
        organizationId: org_uuid,
        employeeId,
        investmentProofs: [],
      });
    }

    claim.investmentProofs.push({
      declarationId,
      fileUrl,
      verifiedBy: '',
      status: 'pending',
    });

    await claim.save();

    return sendResponse(res, 200, true, 'Investment proof uploaded successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.verifyInvestmentProof = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId, proofId } = req.params;
    const { status, verifiedBy } = req.body;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return sendResponse(res, 400, false, 'Invalid status');
    }

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    if (!claim) {
      return sendResponse(res, 404, false, 'No claims found for this employee');
    }

    const proof = claim.investmentProofs.id(proofId);
    if (!proof) {
      return sendResponse(res, 404, false, 'Investment proof not found');
    }

    proof.status = status;
    if (verifiedBy) {
      proof.verifiedBy = verifiedBy;
    }

    claim.markModified('investmentProofs');
    await claim.save();

    return sendResponse(res, 200, true, 'Investment proof verified successfully', claim);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getInvestmentProofsByEmployee = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const claim = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    return sendResponse(res, 200, true, 'Investment proofs fetched successfully', claim?.investmentProofs || []);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getAllClaimsByEmployee = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const data = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    return sendResponse(res, 200, true, 'Claims data fetched successfully', data || {});
  } catch (err) {
    return handleError(res, err);
  }
};
