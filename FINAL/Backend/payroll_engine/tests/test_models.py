"""Model-level parity tests for the ported Mongoose schemas.

Expected key lists are the top-level paths of each legacy schema (``schema.obj`` minus
``organizationId``), in legacy order; expected defaults are what Mongoose materialises
for ``new Model({})`` (verified against mongoose itself when the models were ported).
"""

import json
from datetime import datetime

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from payroll_engine import bss_adapter
from payroll_engine import models as M
from payroll_engine.models import base as B
from payroll_engine.models import (claims_declaration, full_and_final, payroll_one_time_import,
                                   payroll_salary_revision_import, salary_compensation,
                                   staff_portal, statutory_compliance)
from payroll_engine.tests.fixtures import make_org_world

LEGACY_KEYS = {
    "Arrears": ['employeeId', 'arrearsType', 'periodFrom', 'periodTo', 'components', 'totalArrearsAmount', 'tdsOnArrears', 'netArrearsPayable', 'payInMonth', 'payInYear', 'status', 'paidInMonth', 'paidInYear', 'payrollId', 'paidDate', 'salaryRevisionId', 'remarks'],  # noqa: E501
    "BankFileRecord": ['fileName', 'format', 'month', 'year', 'totalAmount', 'employeeCount', 'status', 'mimeType', 'size', 'content'],  # noqa: E501
    "ClaimsDeclaration": ['employeeId', 'flexibleBenefitPlan', 'reimbursements', 'incomeTaxDeclarations', 'investmentProofs'],  # noqa: E501
    "EmployeeLoan": ['loanNumber', 'loanTypeId', 'employeeId', 'loanAmount', 'outstandingBalance', 'disbursementDate', 'paidThroughAccount', 'referenceNumber', 'reason', 'exemptFromPerquisite', 'emiStartDate', 'installmentAmount', 'totalInstallments', 'lastInstallmentAmount', 'paidInstallments', 'status', 'closedAt', 'createdBy'],  # noqa: E501
    "EmployeePreferences": ['employeeId', 'language', 'dateFormat', 'timeZone', 'emailNotifications', 'smsNotifications', 'theme'],  # noqa: E501
    "EmployeeTDS": ['employeeId', 'financialYear', 'taxRegime', 'projectedAnnualIncome', 'declaredDeductions', 'investments80C', 'investments80D', 'itDeclaration', 'hraExemption', 'section10Exemptions', 'taxableIncome', 'taxPayable', 'rebateApplicable', 'rebateAmount', 'incomeBreakdown', 'monthlyTDS', 'tdsPeriod', 'fullYearComparison', 'monthlyDeductions', 'totalTDSDeducted', 'proofItems', 'proofSubmitted', 'proofVerified', 'proofStatus', 'proofRemarks', 'proofReviewedBy', 'proofReviewedAt', 'isLocked', 'adminCalculated', 'hasInvestmentDeclaration'],  # noqa: E501
    "FullAndFinal": ['employeeId', 'resignationId', 'lastWorkingDate', 'settlementDate', 'status', 'salaryDues', 'leaveEncashment', 'bonusIncentives', 'pendingReimbursements', 'deductions', 'gratuity', 'taxDeductions', 'totalPayables', 'totalDeductions', 'netPayable', 'paymentDetails', 'approvals', 'documents', 'remarks', 'finalizedAt'],  # noqa: E501
    "LoanRepayment": ['loanId', 'employeeId', 'repaymentAmount', 'repaymentDate', 'paymentMode', 'depositToAccount', 'referenceNumber', 'balanceBefore', 'balanceAfter', 'repaymentType', 'payrollMonth', 'payrollYear', 'payrollId', 'createdBy'],  # noqa: E501
    "LoanType": ['loanName', 'perquisiteRate', 'status', 'createdBy'],
    "PayrollAuditLog": ['action', 'entityType', 'entityId', 'performedBy', 'performedByName', 'affectedEmployee', 'affectedEmployeeName', 'beforeData', 'afterData', 'payrollDetails', 'ipAddress', 'userAgent', 'remarks'],  # noqa: E501
    "PayrollOneTimeImport": ['month', 'year', 'importBatchId', 'fileName', 'status', 'uploadedBy', 'confirmedAt', 'rows', 'summary'],  # noqa: E501
    "PayrollRun": ['employeeId', 'month', 'year', 'earnings', 'deductions', 'benefits', 'reimbursements', 'grossEarnings', 'totalDeductions', 'netPay', 'employerContributions', 'epfDetails', 'esiDetails', 'ptDetails', 'lwfDetails', 'bonusDetails', 'workingDays', 'presentDays', 'absentDays', 'lopDays', 'payStatus', 'processedDate', 'approvedDate', 'paidDate', 'paymentMode', 'transactionId', 'remarks'],  # noqa: E501
    "PayrollSalaryRevisionImport": ['importBatchId', 'fileName', 'status', 'uploadedBy', 'confirmedAt', 'rows', 'summary'],  # noqa: E501
    "PayrollSchedule": ['payFrequency', 'workingDays', 'payDay', 'firstPayPeriod', 'upcomingPayrolls', 'status', 'autoProcessEnabled', 'autoProcessTime', 'lastAutoRunAt', 'lastAutoRunKey', 'lastAutoRunStatus', 'lastAutoRunMessage', 'createdBy'],  # noqa: E501
    "SalaryCompensation": ['category', 'components'],
    "SalaryRevision": ['employeeId', 'revisionType', 'effectiveFrom', 'oldSalary', 'newSalary', 'incrementAmount', 'incrementPercentage', 'arrearsApplicable', 'arrearsFromDate', 'arrearsToDate', 'arrearsAmount', 'arrearsPaid', 'statutoryApplicability', 'status', 'requestedBy', 'approvals', 'implementedDate', 'remarks', 'state'],  # noqa: E501
    "StaffPortal": ['enablePortalAccess', 'bannerMessage', 'bannerEndDate', 'portalContactEmail', 'webTabs'],  # noqa: E501
    "StatutoryCompliance": ['epf', 'esi', 'professionalTax', 'labourWelfareFund', 'statutoryBonus'],  # noqa: E501
    "TDSConfig": ['financialYear', 'taxRegime', 'newRegimeSlabs', 'oldRegimeSlabs', 'oldRegimeSlabsSenior', 'oldRegimeSlabsSuperSenior', 'standardDeduction', 'standardDeductionOld', 'section80CLimit', 'surchargeSlabs', 'surchargeSlabsOld', 'healthEducationCess', 'rebateLimit', 'rebateAmount', 'rebateLimitOld', 'rebateAmountOld', 'exemptionLimits'],  # noqa: E501
    "AutoPayrollRegistry": ['org_uuid', 'organizationName', 'status', 'autoProcessEnabled', 'autoProcessTime', 'payFrequency', 'payDay', 'firstPayPeriod', 'upcomingPayrolls', 'lastAutoRunKey'],  # noqa: E501
}
COMMON = {"_id", "id", "organizationId", "createdAt", "updatedAt"}

D = lambda *a: timezone.make_aware(datetime(*a))  # noqa: E731


class ModelParityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        world = make_org_world(n_workers=2)
        cls.org = world["contractor"]
        bss_adapter.sync_employees(cls.org, force=True)
        cls.emp, cls.emp2 = list(M.PayrollEmployee.objects.filter(org=cls.org).order_by("unique_id"))

    # ---------------------------------------------------------------- helpers
    def roundtrip(self, obj):
        obj.save()
        fresh = type(obj).objects.get(pk=obj.pk)
        out = fresh.to_dict()
        json.dumps(out)  # must be JSON-serialisable
        name = type(obj).__name__
        keys = [k for k in out if k not in COMMON]
        self.assertEqual(keys, LEGACY_KEYS[name], name)
        if name != "AutoPayrollRegistry":
            self.assertEqual(out["organizationId"], str(self.org.pk))
        self.assertTrue(out["createdAt"] and out["updatedAt"])
        return fresh, out

    def build(self, cls, **kw):
        if cls is M.AutoPayrollRegistry:
            return cls(**kw)
        return cls(org=self.org, **kw)

    def make_run(self, emp=None, month="April", year=2025):
        return self.build(M.PayrollRun, employee=emp or self.emp, month=month, year=year)

    def make_loan_type(self, name="Personal"):
        lt = self.build(M.LoanType, loan_name=name)
        lt.save()
        return lt

    def make_loan(self, lt=None, number=None):
        loan = self.build(M.EmployeeLoan, loan_type=lt or self.make_loan_type(), employee=self.emp,
                          loan_number=number, loan_amount=10000, outstanding_balance=10000,
                          disbursement_date=D(2025, 4, 1), emi_start_date=D(2025, 5, 1),
                          installment_amount=1000, total_installments=10)
        loan.save()
        return loan

    # ---------------------------------------------------------------- every model
    def test_every_model_registered_and_covered(self):
        for name in LEGACY_KEYS:
            self.assertTrue(hasattr(M, name), name)
            table = getattr(M, name)._meta.db_table
            self.assertTrue(table.startswith("pe_"), table)

    def test_arrears(self):
        run = self.make_run()
        run.save()
        rev = self.build(M.SalaryRevision, employee=self.emp, revision_type="increment",
                         effective_from=D(2025, 4, 1))
        rev.save()
        a = self.build(M.Arrears, employee=self.emp, arrears_type="salary_revision",
                       total_arrears_amount=1500, payroll=run, salary_revision=rev,
                       components=[{"componentName": "Basic", "difference": 500, "months": 3}])
        fresh, out = self.roundtrip(a)
        self.assertEqual(out["status"], "calculated")
        self.assertEqual(out["tdsOnArrears"], 0)
        self.assertEqual(out["netArrearsPayable"], 0)
        self.assertEqual(out["periodFrom"], {})
        self.assertEqual(out["payrollId"], str(run.pk))
        self.assertEqual(out["salaryRevisionId"], str(rev.pk))
        self.assertEqual(out["employeeId"], str(self.emp.pk))
        self.assertEqual(len(out["components"][0]["_id"]), 32)
        run.delete()  # SET_NULL
        fresh.refresh_from_db()
        self.assertIsNone(fresh.payroll_id)

    def test_bank_file_record(self):
        rec = self.build(M.BankFileRecord, file_name="  bank.csv ", content=b"a,b\n")
        fresh, out = self.roundtrip(rec)
        self.assertEqual(out["fileName"], "bank.csv")  # trim: true
        self.assertEqual(out["format"], "UNKNOWN")
        self.assertEqual(out["month"], "")
        self.assertIsNone(out["year"])
        self.assertEqual(out["status"], "generated")
        self.assertEqual(out["mimeType"], "application/octet-stream")
        self.assertEqual(out["content"], {"type": "Buffer", "data": [97, 44, 98, 10]})
        self.assertEqual(fresh.content_bytes, b"a,b\n")

    def test_claims_declaration(self):
        c = self.build(M.ClaimsDeclaration, employee=self.emp,
                       reimbursements=[{"name": "Fuel", "claimedAmount": 500}],
                       flexible_benefit_plan=[{"componentName": "LTA", "amount": 100}],
                       investment_proofs=[{"fileUrl": "x"}])
        fresh, out = self.roundtrip(c)
        r = out["reimbursements"][0]
        self.assertEqual(r["status"], "pending")
        self.assertEqual(r["attachmentUrls"], [])
        self.assertEqual(len(r["_id"]), 32)
        self.assertEqual(out["flexibleBenefitPlan"][0]["status"], "pending")
        self.assertEqual(out["investmentProofs"][0]["status"], "pending")
        self.assertEqual(out["incomeTaxDeclarations"], [])
        # ids are stable across saves
        first_id = r["_id"]
        fresh.save()
        fresh.refresh_from_db()
        self.assertEqual(fresh.reimbursements[0]["_id"], first_id)
        built = claims_declaration.new_reimbursement(name="x")
        self.assertEqual(list(built)[0], "_id")

    def test_employee_loan_and_repayment(self):
        lt = self.make_loan_type("  Vehicle  ")
        self.assertEqual(lt.loan_name, "Vehicle")
        _, lt_out = self.roundtrip(lt)
        self.assertEqual(lt_out["perquisiteRate"], 0)
        self.assertEqual(lt_out["status"], "active")
        self.assertEqual(lt_out["createdBy"], "")

        loan = self.make_loan(lt, number="LN-1")
        fresh, out = self.roundtrip(loan)
        self.assertEqual(out["loanTypeId"], str(lt.pk))
        self.assertEqual(out["paidInstallments"], 0)
        self.assertEqual(out["status"], "active")
        self.assertIsNone(out["closedAt"])
        self.assertFalse(out["exemptFromPerquisite"])
        self.assertEqual(out["paidThroughAccount"], "")
        self.assertIsNone(out["lastInstallmentAmount"])

        rep = self.build(M.LoanRepayment, loan=loan, employee=self.emp, repayment_amount=1000,
                         repayment_date=D(2025, 5, 31), payment_mode="cash",
                         balance_before=10000, balance_after=9000)
        _, rout = self.roundtrip(rep)
        self.assertEqual(rout["repaymentType"], "manual")
        self.assertIsNone(rout["payrollMonth"])
        self.assertIsNone(rout["payrollYear"])
        self.assertIsNone(rout["payrollId"])
        self.assertEqual(rout["loanId"], str(loan.pk))

    def test_employee_preferences(self):
        _, out = self.roundtrip(self.build(M.EmployeePreferences, employee=self.emp))
        self.assertEqual((out["language"], out["dateFormat"], out["timeZone"], out["theme"]),
                         ("en", "DD/MM/YYYY", "UTC", "light"))
        self.assertTrue(out["emailNotifications"])
        self.assertFalse(out["smsNotifications"])

    def test_employee_tds(self):
        t = self.build(M.EmployeeTDS, employee=self.emp, financial_year="2025-26",
                       investments80_c=[{"investmentType": " PPF ", "amount": 1000}],
                       proof_items=[{"lineKey": "80C:0"}])
        fresh, out = self.roundtrip(t)
        self.assertEqual(out["taxRegime"], "new")
        self.assertEqual(out["declaredDeductions"]["standardDeduction"], 50000)
        self.assertIs(out["declaredDeductions"]["section80DDSevere"], False)
        self.assertEqual(out["taxPayable"]["cessRate"], 4)
        self.assertEqual(out["taxPayable"]["slabBreakdown"], [])
        self.assertEqual(out["tdsPeriod"]["equivalentMonths"], 12)
        self.assertIsNone(out["tdsPeriod"]["start"])
        self.assertEqual(out["tdsPeriod"]["openingMonth"]["label"], "")
        self.assertEqual(out["itDeclaration"]["toggles"],
                         {"section80C": True, "section80D": True, "otherInvestments": False})
        self.assertEqual(out["itDeclaration"]["rentEntries"], [])
        self.assertEqual(out["itDeclaration"]["homeLoanSelfOccupied"]["lenderPAN"], "")
        self.assertEqual(len(out["itDeclaration"]["chapterVIA"]), 23)
        self.assertEqual(len(out["declaredDeductions"]), 38)
        self.assertEqual(out["section10Exemptions"], {})
        self.assertIsNone(out["hasInvestmentDeclaration"])
        self.assertEqual(out["proofStatus"], "pending")
        self.assertEqual(out["investments80C"][0]["investmentType"], "PPF")  # trim
        self.assertEqual(out["investments80C"][0]["attachment"], "")
        self.assertEqual(out["proofItems"][0]["status"], "pending")
        self.assertEqual(out["proofItems"][0]["requestedAmount"], 0)
        # nested defaults filled when a legacy-shaped partial object is saved
        fresh.it_declaration = {"stayingInRentedHouse": True,
                                "rentEntries": [{"address": " Flat 1 "}]}
        fresh.save()
        fresh.refresh_from_db()
        rent = fresh.it_declaration["rentEntries"][0]
        self.assertEqual(rent["address"], "Flat 1")
        self.assertEqual(rent["rentMonthly"], 0)
        self.assertIn("_id", rent)
        self.assertEqual(fresh.it_declaration["toggles"]["section80C"], True)
        # unique (employeeId, financialYear)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.build(M.EmployeeTDS, employee=self.emp, financial_year="2025-26").save()
        self.build(M.EmployeeTDS, employee=self.emp2, financial_year="2025-26").save()

    def test_full_and_final(self):
        f = self.build(M.FullAndFinal, employee=self.emp, last_working_date=D(2025, 6, 30),
                       documents=[{"documentType": "relieving"}], approvals=[{"approverName": "HR"}])
        _, out = self.roundtrip(f)
        self.assertEqual(out["status"], "initiated")
        self.assertEqual(out["leaveEncashment"]["method"], "basic_26")
        self.assertIs(out["gratuity"]["isEligible"], False)
        self.assertEqual(out["paymentDetails"], {})
        self.assertEqual(out["netPayable"], 0)
        self.assertEqual(out["resignationId"], "")
        self.assertEqual(out["approvals"][0]["status"], "pending")
        self.assertTrue(out["documents"][0]["uploadedAt"].endswith("Z"))  # Date.now
        self.assertIn("_id", full_and_final.new_approval())

    def test_payroll_audit_log(self):
        log = self.build(M.PayrollAuditLog, action="payroll_processed", entity_type="payroll",
                         entity_id="abc", performed_by=str(self.org.pk),
                         affected_employee=self.emp, after_data={"netPay": 1})
        fresh, out = self.roundtrip(log)
        self.assertEqual(out["affectedEmployee"], str(self.emp.pk))
        self.assertIsNone(out["beforeData"])
        self.assertEqual(out["afterData"], {"netPay": 1})
        self.assertEqual(out["payrollDetails"], {})
        # The audit trail outlives the employee row (SET_NULL).
        log2 = self.build(M.PayrollAuditLog, action="claim_approved", entity_type="claim",
                          entity_id="c1", performed_by="u1", affected_employee=self.emp2)
        log2.save()
        self.emp2.delete()
        log2.refresh_from_db()
        self.assertIsNone(log2.affected_employee_id)

    def test_payroll_one_time_import(self):
        imp = self.build(M.PayrollOneTimeImport, month="April", year=2025, import_batch_id="b1",
                         rows=[{"amount": 5, "employeeCode": " E1 "}])
        _, out = self.roundtrip(imp)
        self.assertEqual(out["status"], "draft")
        self.assertEqual(out["uploadedBy"], "")
        self.assertIsNone(out["confirmedAt"])
        self.assertEqual(out["summary"], {"totalRows": 0, "validRows": 0, "invalidRows": 0})
        row = out["rows"][0]
        self.assertNotIn("_id", row)  # { _id: false }
        self.assertEqual(row["employeeCode"], "E1")
        self.assertIsNone(row["employeeId"])
        self.assertEqual(row, {**payroll_one_time_import.new_row(amount=5), "employeeCode": "E1"})
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.build(M.PayrollOneTimeImport, month="May", year=2025, import_batch_id="b1").save()

    def test_payroll_run(self):
        run = self.make_run()
        run.earnings = [{"componentName": "Basic", "amount": 10000, "calculationType": "fixed"}]
        _, out = self.roundtrip(run)
        self.assertEqual(out["payStatus"], "pending")
        self.assertEqual((out["workingDays"], out["presentDays"], out["absentDays"],
                          out["lopDays"]), (26, 26, 0, 0))
        self.assertEqual(out["employerContributions"],
                         {"epf": 0, "edli": 0, "adminCharges": 0, "esi": 0, "lwf": 0, "total": 0})
        self.assertIs(out["epfDetails"]["ceilingApplied"], True)
        self.assertIs(out["esiDetails"]["includeEmployerInCtc"], True)
        self.assertEqual(out["ptDetails"]["cycle"], "monthly")
        self.assertEqual(out["lwfDetails"]["cycle"], "half-yearly")
        self.assertEqual(out["bonusDetails"]["cycle"], "yearly")
        self.assertIn("_id", out["earnings"][0])
        self.assertEqual(out["paymentMode"], "")
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_run().save()
        self.make_run(month="May").save()
        self.make_run(emp=self.emp2).save()

    def test_payroll_salary_revision_import(self):
        imp = self.build(M.PayrollSalaryRevisionImport, import_batch_id="r1",
                         rows=[{"rowNumber": 1, "oldSalary": {"ctc": 5}}])
        _, out = self.roundtrip(imp)
        self.assertEqual(out["summary"]["revisionsCreated"], 0)
        self.assertEqual(len(out["summary"]), 7)
        row = out["rows"][0]
        self.assertNotIn("_id", row)
        self.assertEqual(row["plannedStatus"], "pending")
        self.assertEqual(row["warnings"], [])
        self.assertIsNone(row["grossSalaryInput"])
        self.assertEqual(row["oldSalary"], {"ctc": 5, "grossSalary": 0, "basicSalary": 0,
                                            "components": [], "componentOverrides": []})
        self.assertNotIn("statutoryFlags", row)  # empty nested object minimised
        fresh_row = payroll_salary_revision_import.new_row()
        self.assertEqual(fresh_row["newSalary"]["defaultComponents"], [])
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.build(M.PayrollSalaryRevisionImport, import_batch_id="r1").save()

    def test_payroll_schedule(self):
        s = self.build(M.PayrollSchedule, first_pay_period=D(2025, 4, 1),
                       working_days=["Monday"], auto_process_time=" 09:30 ",
                       upcoming_payrolls=[{"period": "April 2025", "payDate": "2025-05-07"}])
        _, out = self.roundtrip(s)
        self.assertEqual((out["payFrequency"], out["payDay"], out["status"]),
                         ("monthly", "7", "active"))
        self.assertTrue(out["autoProcessEnabled"])
        self.assertEqual(out["autoProcessTime"], "09:30")
        self.assertIsNone(out["lastAutoRunAt"])
        self.assertEqual(out["lastAutoRunKey"], "")
        self.assertEqual(out["workingDays"], ["Monday"])
        self.assertIn("_id", out["upcomingPayrolls"][0])
        self.assertEqual(M.PayrollSchedule(org=self.org).auto_process_time, "13:00")

    def test_salary_compensation(self):
        c = self.build(M.SalaryCompensation, category="earnings",
                       components=[{"name": "Basic", "type": "earning"}])
        _, out = self.roundtrip(c)
        comp = out["components"][0]
        self.assertEqual(comp, {**salary_compensation.new_component(name="Basic", type="earning"),
                                "_id": comp["_id"]})
        self.assertEqual((comp["calculationType"], comp["basedOn"], comp["frequency"],
                          comp["status"]), ("fixed", "none", "monthly", "active"))
        self.assertIs(comp["taxable"], True)

    def test_salary_revision(self):
        r = self.build(M.SalaryRevision, employee=self.emp, revision_type="increment",
                       effective_from=D(2025, 4, 1), state=" Gujarat ",
                       new_salary={"ctc": 1, "grossSalary": 1, "basicSalary": 1},
                       approvals=[{"approverName": "HR"}])
        _, out = self.roundtrip(r)
        self.assertEqual(out["status"], "pending")
        self.assertEqual(out["oldSalary"], {"ctc": 0, "grossSalary": 0, "basicSalary": 0,
                                            "components": [], "componentOverrides": []})
        self.assertEqual(out["newSalary"]["components"], [])
        self.assertEqual(out["newSalary"]["defaultComponents"], [])
        self.assertEqual(out["statutoryApplicability"], {})
        self.assertEqual(out["state"], "Gujarat")
        self.assertEqual(out["approvals"][0]["status"], "pending")
        self.assertIsNone(out["approvals"][0]["employeeId"])
        self.assertFalse(out["arrearsPaid"])

    def test_staff_portal(self):
        p = self.build(M.StaffPortal, web_tabs=[{"title": "HR", "url": "https://x"}])
        _, out = self.roundtrip(p)
        self.assertFalse(out["enablePortalAccess"])
        self.assertTrue(out["webTabs"][0]["isVisible"])
        self.assertEqual(len(out["webTabs"][0]["_id"]), 32)
        self.assertEqual(staff_portal.new_web_tab(title="t")["isVisible"], True)

    def test_statutory_compliance(self):
        _, out = self.roundtrip(self.build(M.StatutoryCompliance))
        epf = out["epf"]
        self.assertEqual((epf["employeeContributionRate"], epf["employerContributionRate"],
                          epf["restrictedPfWage"], epf["deductionCycle"]), (12, 12, 15000, "monthly"))
        self.assertEqual(epf["contributionPreferences"],
                         {"employerPfContribution": True, "edliContribution": False,
                          "adminCharges": False})
        self.assertNotIn("epfNumber", epf)
        self.assertEqual((out["esi"]["employeeContributionRate"],
                          out["esi"]["employerContributionRate"], out["esi"]["wageLimit"]),
                         (0.75, 3.25, 21000))
        self.assertEqual(out["professionalTax"],
                         {"isEnabled": False, "deductionCycle": "monthly", "states": []})
        self.assertEqual(out["labourWelfareFund"],
                         {"isEnabled": False, "deductionCycle": "half-yearly", "months": [],
                          "states": []})
        self.assertEqual(out["statutoryBonus"]["percentage"], 8.33)
        self.assertEqual(out["statutoryBonus"]["paymentMonth"], "October")
        lwf = statutory_compliance.new_lwf_state(stateName="Gujarat")
        self.assertEqual((lwf["periodFrom"], lwf["periodTo"], lwf["calculationType"],
                          lwf["status"], lwf["months"]), ("Jun", "Dec", "fixed", "active", []))

    def test_tds_config(self):
        c = self.build(M.TDSConfig, financial_year="2025-26",
                       new_regime_slabs=[{"incomeFrom": 0, "incomeTo": 400000, "taxRate": 0}])
        _, out = self.roundtrip(c)
        self.assertEqual((out["standardDeduction"], out["standardDeductionOld"],
                          out["section80CLimit"], out["healthEducationCess"]),
                         (75000, 50000, 150000, 4))
        self.assertEqual((out["rebateLimit"], out["rebateAmount"], out["rebateLimitOld"],
                          out["rebateAmountOld"]), (1200000, 60000, 500000, 12500))
        lim = out["exemptionLimits"]
        self.assertEqual(len(lim), 39)
        self.assertIsNone(lim["section80E"])
        self.assertEqual(lim["section80D"], 100000)
        self.assertEqual(lim["gratuity"], 2000000)
        self.assertIn("_id", out["newRegimeSlabs"][0])

    def test_auto_payroll_registry(self):
        reg = M.AutoPayrollRegistry(org_uuid=str(self.org.pk))
        _, out = self.roundtrip(reg)
        self.assertNotIn("organizationId", out)
        self.assertEqual((out["status"], out["payFrequency"], out["payDay"],
                          out["autoProcessTime"]), ("active", "monthly", "7", "13:00"))
        self.assertTrue(out["autoProcessEnabled"])
        self.assertIsNone(out["firstPayPeriod"])
        self.assertEqual(out["organizationName"], "")
        with self.assertRaises(IntegrityError), transaction.atomic():
            M.AutoPayrollRegistry(org_uuid=str(self.org.pk)).save()

    # ---------------------------------------------------------------- unique constraints
    def test_loan_type_unique_per_org(self):
        self.make_loan_type("Home")
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_loan_type("Home")
        other = make_org_world(suffix="2")["contractor"]
        M.LoanType(org=other, loan_name="Home").save()

    def test_loan_number_sparse_unique(self):
        lt = self.make_loan_type()
        self.make_loan(lt, number=None)
        self.make_loan(lt, number=None)  # sparse: missing numbers don't clash
        self.make_loan(lt, number="LN-9")
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_loan(lt, number="LN-9")

    def test_loan_type_protected_while_loans_exist(self):
        from django.db.models import ProtectedError
        loan = self.make_loan()
        with self.assertRaises(ProtectedError):
            loan.loan_type.delete()

    def test_loan_repayment_partial_unique(self):
        loan = self.make_loan()
        kw = dict(loan=loan, employee=self.emp, repayment_amount=1000,
                  repayment_date=D(2025, 5, 31), payment_mode="cash", balance_before=10000,
                  balance_after=9000)
        # manual repayments: no uniqueness
        self.build(M.LoanRepayment, **kw).save()
        self.build(M.LoanRepayment, **kw).save()
        payroll_kw = dict(kw, repayment_type="payroll", payroll_month="May", payroll_year=2025)
        self.build(M.LoanRepayment, **payroll_kw).save()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.build(M.LoanRepayment, **payroll_kw).save()
        self.build(M.LoanRepayment, **dict(payroll_kw, payroll_month="June")).save()

    # ---------------------------------------------------------------- base helpers
    def test_new_subdoc_id_and_schema_dsl(self):
        a, b = B.new_subdoc_id(), B.new_subdoc_id()
        self.assertNotEqual(a, b)
        self.assertEqual(len(a), 32)
        int(a, 16)
        node = B.Obj(x=1, y=B.NO, z=B.Trim(""), sub=B.Obj(k=B.NO), arr=B.Arr(B.Obj(s="p")))
        self.assertEqual(B.materialise(node), {"x": 1, "z": "", "arr": []})
        val = B.normalise({"z": " q ", "arr": [{"_id": "keep"}, {"s": "set"}], "extra": 1}, node)
        self.assertEqual(val["z"], "q")
        self.assertEqual(val["arr"][0], {"_id": "keep", "s": "p"})
        self.assertEqual(val["arr"][1]["s"], "set")
        self.assertEqual(len(val["arr"][1]["_id"]), 32)
        self.assertEqual(val["extra"], 1)  # unknown keys kept
        self.assertEqual(val["x"], 1)
