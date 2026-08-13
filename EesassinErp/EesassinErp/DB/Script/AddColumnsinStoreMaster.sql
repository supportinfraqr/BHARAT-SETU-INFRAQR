ALTER TABLE RTL.StoreMaster
ADD ElectricityBillPeriodUpTo datetime null,
LeasePaidReceiptPeriodUpTo datetime null,
PropertyTaxPeriodUpTo datetime null,
FireNocPeriodUpTo datetime null,
PollutionPeriodUpTo datetime null,
OwnershipDocPeriodUpTo datetime null,
AdditionalDocPeriodUpTo datetime null,
LeaseFromDate date null,
ElectricityBillRemark nvarchar(500) null
,LeasePaidReceiptRemark nvarchar(500) null
,PropertyTaxRemark nvarchar(500) null
,FireNocRemark nvarchar(500) null
,PollutionRemark nvarchar(500) null
,OwnershipDocRemark nvarchar(500) null
,AdditionalDocRemark nvarchar(500) null