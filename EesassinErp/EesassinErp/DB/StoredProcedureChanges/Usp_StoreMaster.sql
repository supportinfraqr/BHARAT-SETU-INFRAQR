/****** Object:  StoredProcedure [RTL].[Usp_StoreMaster]    Script Date: 12-11-2024 23:29:17 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
 
 
ALTER PROCEDURE [RTL].[Usp_StoreMaster]  
@Id BIGINT =null
,@Action int=null
,@PartyTypeId varchar(150)=null
,@SequenceNumber int=null
,@StoreCode varchar(50)=null
,@RefStoreCode varchar(50)=null 
,@StoreName varchar(150)=null
,@CompleteAddress nvarchar(250)=null
,@ProposedDate date=null
,@StoreLocation varchar(150)=null
,@CityId float=null
,@CircleId float=null
,@RegionId float=null
,@zipCode varchar(50)=null
,@StoreManagerName varchar(150)=null
,@StoreManagerMobileNo varchar(50)=null
,@StoreManagerEmail varchar(150)=null
,@AreaManagerName varchar(150)=null
,@AreaManagerMobileNo varchar(50)=null
,@AreaManagerEmail varchar(150)=null
,@ZonalManagerName varchar(150)=null
,@ZonalManagerMobileNo varchar(50)=null
,@ZonalManagerEmail varchar(150)=null
,@CircleHeadName varchar(150)=null
,@CircleHeadMobileNo varchar(50)=null
,@CircleHeadEmail varchar(150)=null
,@RegionalHeadName varchar(150)=null
,@RegionalHeadMobileNo varchar(50)=null
,@RegionalHeadEmail varchar(150)=null
,@CorporateHeadName varchar(150)=null
,@CorporateHeadMobileNo varchar(50)=null
,@CorporateHeadEmail varchar(150)=null
,@SQFTStoreArea varchar(50)=null
,@IsActive varchar(50)=null
,@ElectricityBill varchar(500)=null
,@RentAgreement varchar(500)=null
,@PropertyTaxPaidReceipt varchar(500)=null
,@BuildingPlan varchar(500)=null
,@StabilityStructureCertificate varchar(500)=null
,@CompletionCertificate varchar(500)=null
 ,@StoreMaster varchar(Max)=null,
 @DocumentName nvarchar(Max)=null ,
 @UFile varchar(Max)=null,	
 @Createdby varchar(Max)=null
,@UserId int=null
,@DaysOfExpire int=null
,@Category varchar(500)=null
,@ElectricityBillPeriodUpTo date = null
,@LeasePaidReceiptPeriodUpTo date = null
,@PropertyTaxPeriodUpTo date = null
,@FireNocPeriodUpTo date = null
,@PollutionPeriodUpTo date = null
,@OwnershipDocPeriodUpTo date = null
,@AdditionalDocPeriodUpTo date = null
,@LeaseFromDate date = null
,@ElectricityBillRemark nvarchar(500) = null
,@LeasePaidReceiptRemark nvarchar(500) = null
,@PropertyTaxRemark nvarchar(500) = null
,@FireNocRemark nvarchar(500) = null
,@PollutionRemark nvarchar(500) = null
,@OwnershipDocRemark nvarchar(500) = null
,@AdditionalDocRemark nvarchar(500) = null
,@Result VARCHAR(50)=''  OUTPUT   
AS  
BEGIN  
	DECLARE @Store_Code VARCHAR(150) 
	DECLARE @seqNumber INT 

	IF (@Action IN (1,2))
	BEGIN
	DECLARE @Prefix VARCHAR(10)
	DECLARE @Suffix VARCHAR(10)

	SET @seqNumber = (SELECT ISNULL((SELECT ISNULL(Max(SequenceNumber),0) + 1 
	FROM RTL.StoreMaster with(nolock) 
	--Where PartyTypeId =@PartyTypeId
	),1))

	SELECT @Prefix = Prefix,@Suffix =Suffix FROM RTL.StorePrefix WITH(NOLOCK)
	WHERE 
	--PartyId =@PartyTypeId AND 
	CONVERT(DATE,GETUTCDATE()) BETWEEN StartDate AND EndDate

	SELECT @Store_Code = ISNULL(@Prefix,'') + FORMAT(@seqNumber,'00000000') + ISNULL(@Suffix,'') 
 
 
	 
	END

   if(@Action=1)  
  Begin  
	
    --   If not Exists(Select 1 from RTL.StoreMaster)  
    --Begin  
	
   INSERT INTO [RTL].[StoreMaster]
           ([PartyTypeId]
           ,[SequenceNumber]
           ,[StoreCode],RefStoreCode
           ,[StoreName]
           ,[CompleteAddress]
           ,[ProposedDate]
           ,[StoreLocation]
           ,[CityId]
           ,[CircleId]
           ,[RegionId]
		   ,zipCode
           ,[StoreManagerName]
           ,[StoreManagerMobileNo]
           ,[StoreManagerEmail]
           ,[AreaManagerName]
           ,[AreaManagerMobileNo]
           ,[AreaManagerEmail]
           ,[ZonalManagerName]
           ,[ZonalManagerMobileNo]
           ,[ZonalManagerEmail]
           ,[CircleHeadName]
           ,[CircleHeadMobileNo]
           ,[CircleHeadEmail]
           ,[RegionalHeadName]
           ,[RegionalHeadMobileNo]
           ,[RegionalHeadEmail]
           ,[CorporateHeadName]
           ,[CorporateHeadMobileNo]
           ,[CorporateHeadEmail]
           ,[SQFTStoreArea]
           ,[IsActive]
		     ,[ElectricityBill]
           ,[RentAgreement]
           ,[PropertyTaxPaidReceipt]
           ,[BuildingPlan]
           ,[StabilityStructureCertificate]
           ,[CompletionCertificate]
           ,[CreatedBy]
		   ,DaysOfExpire
		   ,[Category]
		   ,ElectricityBillPeriodUpTo
           ,LeasePaidReceiptPeriodUpTo 
           ,PropertyTaxPeriodUpTo 
           ,FireNocPeriodUpTo 
           ,PollutionPeriodUpTo
           ,OwnershipDocPeriodUpTo
           ,AdditionalDocPeriodUpTo
           ,LeaseFromDate
           ,ElectricityBillRemark
           ,LeasePaidReceiptRemark
           ,PropertyTaxRemark
           ,FireNocRemark
           ,PollutionRemark
           ,OwnershipDocRemark
           ,AdditionalDocRemark
           )
     VALUES
           (
		    @PartyTypeId
           ,@seqNumber
           ,@Store_Code,@RefStoreCode
           ,@StoreName
           ,@CompleteAddress
           ,@ProposedDate
           ,@StoreLocation
           ,@CityId
           ,@CircleId
           ,@RegionId
		   ,@zipCode
           ,@StoreManagerName
           ,@StoreManagerMobileNo
           ,@StoreManagerEmail
           ,@AreaManagerName
           ,@AreaManagerMobileNo
           ,@AreaManagerEmail
           ,@ZonalManagerName
           ,@ZonalManagerMobileNo
           ,@ZonalManagerEmail
           ,@CircleHeadName
           ,@CircleHeadMobileNo
           ,@CircleHeadEmail
           ,@RegionalHeadName
           ,@RegionalHeadMobileNo
           ,@RegionalHeadEmail
           ,@CorporateHeadName
           ,@CorporateHeadMobileNo
           ,@CorporateHeadEmail
           ,@SQFTStoreArea
           ,@IsActive
		   ,@ElectricityBill
           ,@RentAgreement
           ,@PropertyTaxPaidReceipt
           ,@BuildingPlan
           ,@StabilityStructureCertificate
           ,@CompletionCertificate
           ,@UserId
		   ,@DaysOfExpire
		   ,@Category
		   ,@ElectricityBillPeriodUpTo
           ,@LeasePaidReceiptPeriodUpTo 
           ,@PropertyTaxPeriodUpTo 
           ,@FireNocPeriodUpTo 
           ,@PollutionPeriodUpTo
           ,@OwnershipDocPeriodUpTo
           ,@AdditionalDocPeriodUpTo
           ,@LeaseFromDate
           ,@ElectricityBillRemark
           ,@LeasePaidReceiptRemark
           ,@PropertyTaxRemark
           ,@FireNocRemark
           ,@PollutionRemark
           ,@OwnershipDocRemark
           ,@AdditionalDocRemark
		   ) 

		   IF(@UserId !='1')
		   BEGIN 
		     INSERT INTO [RTL].[StoreMapping] (StoreId,PartyId, UserId, PartyTypeId, StartDate, EndDate, CreatedOn, CreatedBy)
	         values(@Store_Code,(SELECT tOP(1)MapId  FROM LoginTable WHERE LoginId=@UserId), @UserId, 4, getdate(), getdate(), getdate(), 1) 
	      END
 
     Set @Result =    @Store_Code
    End  
    --else  
    --Begin   
    --  Set @Result = 'Duplicate Store Name and ZipCode'   
    --End  
  --End  
  if(@Action=2)  
  Begin  
   UPDATE [RTL].[StoreMaster]
   SET 
		[PartyTypeId] = @PartyTypeId
      ,[RefStoreCode] = @RefStoreCode 
      ,[StoreName] = @StoreName
      ,[CompleteAddress] = @CompleteAddress
      ,[ProposedDate] = @ProposedDate
      ,[StoreLocation] = @StoreLocation
      ,[CityId] = @CityId
      ,[CircleId] = @CircleId
      ,[RegionId] = @RegionId
	  ,zipCode = @zipCode
      ,[StoreManagerName] = @StoreManagerName
      ,[StoreManagerMobileNo] = @StoreManagerMobileNo
      ,[StoreManagerEmail] = @StoreManagerEmail
      ,[AreaManagerName] = @AreaManagerName
      ,[AreaManagerMobileNo] = @AreaManagerMobileNo
      ,[AreaManagerEmail] = @AreaManagerEmail
      ,[ZonalManagerName] = @ZonalManagerName
      ,[ZonalManagerMobileNo] = @ZonalManagerMobileNo
      ,[ZonalManagerEmail] = @ZonalManagerEmail
      ,[CircleHeadName] = @CircleHeadName
      ,[CircleHeadMobileNo] = @CircleHeadMobileNo
      ,[CircleHeadEmail] = @CircleHeadEmail
      ,[RegionalHeadName] = @RegionalHeadName
      ,[RegionalHeadMobileNo] = @RegionalHeadMobileNo
      ,[RegionalHeadEmail] = @RegionalHeadEmail
      ,[CorporateHeadName] = @CorporateHeadName
      ,[CorporateHeadMobileNo] = @CorporateHeadMobileNo
      ,[CorporateHeadEmail] = @CorporateHeadEmail
      ,[SQFTStoreArea] = @SQFTStoreArea
      ,[IsActive] = @IsActive
      ,[ModifyBy] = @UserId
      ,[ModifiedOn] = GETUTCDATE()
	  ,[ElectricityBill] = ISNULL(@ElectricityBill,[ElectricityBill])
      ,[RentAgreement] = ISNULL(@RentAgreement,[RentAgreement])
      ,[PropertyTaxPaidReceipt] = ISNULL(@PropertyTaxPaidReceipt,[PropertyTaxPaidReceipt])
      ,[BuildingPlan] = ISNULL(@BuildingPlan,[BuildingPlan])
      ,[StabilityStructureCertificate] = ISNULL(@StabilityStructureCertificate,[StabilityStructureCertificate])
      ,[CompletionCertificate] = ISNULL(@CompletionCertificate,[CompletionCertificate])
	  ,DaysOfExpire=@DaysOfExpire
	  ,[Category] = @Category
	  ,ElectricityBillPeriodUpTo = @ElectricityBillPeriodUpTo
      ,LeasePaidReceiptPeriodUpTo = @LeasePaidReceiptPeriodUpTo  
      ,PropertyTaxPeriodUpTo = @PropertyTaxPeriodUpTo
      ,FireNocPeriodUpTo = @FireNocPeriodUpTo
      ,PollutionPeriodUpTo = @PollutionPeriodUpTo
      ,OwnershipDocPeriodUpTo = @OwnershipDocPeriodUpTo
      ,AdditionalDocPeriodUpTo= @AdditionalDocPeriodUpTo
      ,LeaseFromDate  = @LeaseFromDate
      ,ElectricityBillRemark  = @ElectricityBillRemark
      ,LeasePaidReceiptRemark = @LeasePaidReceiptRemark
      ,PropertyTaxRemark = @PropertyTaxRemark
      ,FireNocRemark = @FireNocRemark
      ,PollutionRemark = @PollutionRemark
      ,OwnershipDocRemark = @OwnershipDocRemark
      ,AdditionalDocRemark = @AdditionalDocRemark
	   WHERE Id =@Id
    Set @Result = 'Update Successfully'  
  End  
  IF(@Action=3)  
  Begin  
		DELETE FROM   RTL.TBL_StoreMaster WHERE Id =@Id 
     Set @Result='3'  
  End  
   IF(@Action=4)  
  Begin  
         if(@Id='1')
		 Begin
		--SELECT ST.*,isnull(UserId,1)UserId,CI.CITY_CODE,CI.CITY_NAME,STA.SATE_CODE,STA.STATE_NM
			SELECT DISTINCT 
			ROW_NUMBER() OVER (ORDER BY ST.CreatedOn DESC) SrNo, 
			ST.Id,ST.Id StoreId,UserId,	ST.PartyTypeId,	SequenceNumber,	StoreCode,RefStoreCode	,StoreName,	CompleteAddress,	ProposedDate,	StoreLocation	,ST.CityId,CM.Name
            CircleId,RegionId,RM.Name RegionName,	ZipCode,	StoreManagerName,	StoreManagerMobileNo,	StoreManagerEmail,	AreaManagerName,	AreaManagerMobileNo,	AreaManagerEmail,
			ZonalManagerName,	ZonalManagerMobileNo,	ZonalManagerEmail	,CircleHeadName,	CircleHeadMobileNo,	CircleHeadEmail,	RegionalHeadName,	RegionalHeadMobileNo,	RegionalHeadEmail,	CorporateHeadName	,CorporateHeadMobileNo,	CorporateHeadEmail,	SQFTStoreArea	,IsActive,
			CASE WHEN   ElectricityBill='' OR  ElectricityBill IS NULL THEN 'none' ELSE ElectricityBill END AS  ElectricityBill	,
			CASE WHEN   RentAgreement='' OR  RentAgreement IS NULL THEN 'none' ELSE RentAgreement END AS  RentAgreement,
			CASE WHEN   PropertyTaxPaidReceipt='' OR  PropertyTaxPaidReceipt IS NULL THEN 'none' ELSE PropertyTaxPaidReceipt END AS PropertyTaxPaidReceipt	,
			CASE WHEN   BuildingPlan='' OR  BuildingPlan IS NULL THEN 'none' ELSE BuildingPlan END AS  BuildingPlan	,
			CASE WHEN   StabilityStructureCertificate='' OR  StabilityStructureCertificate IS NULL THEN 'none' ELSE StabilityStructureCertificate END AS StabilityStructureCertificate	,
			CASE WHEN   CompletionCertificate='' OR  CompletionCertificate IS NULL THEN 'none' ELSE CompletionCertificate END AS   CompletionCertificate,
			ST.CreatedBy,	ST.CreatedOn,	ModifyBy,	ST.ModifiedOn,	DaysOfExpire,CI.CITY_CODE,CI.CITY_NAME,STA.SATE_CODE,STA.STATE_NM,ST.Category
			 ,ElectricityBillPeriodUpTo
           ,LeasePaidReceiptPeriodUpTo 
           ,PropertyTaxPeriodUpTo 
           ,FireNocPeriodUpTo 
           ,PollutionPeriodUpTo
           ,OwnershipDocPeriodUpTo
           ,AdditionalDocPeriodUpTo
           ,LeaseFromDate
           ,ElectricityBillRemark
           ,LeasePaidReceiptRemark
           ,PropertyTaxRemark
           ,FireNocRemark
           ,PollutionRemark
           ,OwnershipDocRemark
           ,AdditionalDocRemark
					
		FROM RTL.StoreMaster ST WITH(NOLOCK)
		 left JOIN [RTL].[CircleMaster]   CM WITH(NOLOCK) ON CM.ID = ST.CircleId
	   left JOIN [RTL].[StoreMapping]  SMM WITH(NOLOCK) ON SMM.StoreId = cast(ST.StoreCode as int)
		left JOIN EVM.TBL_CITY CI WITH(NOLOCK)  ON ST.CityId=CI.CITY_CODE
		left JOIN EVM.TBL_STATE STA WITH(NOLOCK)  ON ci.STATE_ID = STA.SATE_CODE  --ST.CircleId= STA.SATE_CODE 
		 left Join RTL.RegionMaster RM ON RM.ID = ST.RegionId
		 
		End
		else 
		 Begin
			 if exists(select 1 from rtl.AssignExecuter where executerId=@Id)
			 Begin
			 SELECT DISTINCT ROW_NUMBER() OVER (ORDER BY CreatedOn DESC) SrNo,  * FROM (
			 SELECT DISTINCT  ST.Id,UserId,ST.Id StoreId,	ST.PartyTypeId,	SequenceNumber,	StoreCode,RefStoreCode	,StoreName,	CompleteAddress,	ProposedDate,	StoreLocation	,ST.CityId,CM.Name	CircleId,RegionId,RM.Name RegionName,	ZipCode,	StoreManagerName,	StoreManagerMobileNo,	StoreManagerEmail,	AreaManagerName,	AreaManagerMobileNo,	AreaManagerEmail,	ZonalManagerName,	ZonalManagerMobileNo,	ZonalManagerEmail	,CircleHeadName,	CircleHeadMobileNo,	CircleHeadEmail,	RegionalHeadName,	RegionalHeadMobileNo,	RegionalHeadEmail,	CorporateHeadName	,CorporateHeadMobileNo,	CorporateHeadEmail,	SQFTStoreArea	,IsActive,
                      CASE WHEN   ElectricityBill='' OR  ElectricityBill IS NULL THEN 'none' ELSE ElectricityBill END AS  ElectricityBill	,
					  CASE WHEN   RentAgreement='' OR  RentAgreement IS NULL THEN 'none' ELSE RentAgreement END AS  RentAgreement,
					   CASE WHEN   PropertyTaxPaidReceipt='' OR  PropertyTaxPaidReceipt IS NULL THEN 'none' ELSE PropertyTaxPaidReceipt END AS PropertyTaxPaidReceipt	,
					  CASE WHEN   BuildingPlan='' OR  BuildingPlan IS NULL THEN 'none' ELSE BuildingPlan END AS  BuildingPlan	,
					   CASE WHEN   StabilityStructureCertificate='' OR  StabilityStructureCertificate IS NULL THEN 'none' ELSE StabilityStructureCertificate END AS StabilityStructureCertificate	,
					  CASE WHEN   CompletionCertificate='' OR  CompletionCertificate IS NULL THEN 'none' ELSE CompletionCertificate END AS   CompletionCertificate,
					  ST.CreatedBy,	ST.CreatedOn,	ModifyBy,	ST.ModifiedOn,	DaysOfExpire,CI.CITY_CODE,CI.CITY_NAME,STA.SATE_CODE,STA.STATE_NM,ST.Category
					   ,ElectricityBillPeriodUpTo
           ,LeasePaidReceiptPeriodUpTo 
           ,PropertyTaxPeriodUpTo 
           ,FireNocPeriodUpTo 
           ,PollutionPeriodUpTo
           ,OwnershipDocPeriodUpTo
           ,AdditionalDocPeriodUpTo
           ,LeaseFromDate
           ,ElectricityBillRemark
           ,LeasePaidReceiptRemark
           ,PropertyTaxRemark
           ,FireNocRemark
           ,PollutionRemark
           ,OwnershipDocRemark
           ,AdditionalDocRemark
					FROM RTL.StoreMaster ST WITH(NOLOCK)
					 left JOIN [RTL].[CircleMaster]   CM WITH(NOLOCK) ON CM.ID = ST.CircleId
					left JOIN [RTL].[StoreMapping]  SMM WITH(NOLOCK) ON SMM.StoreId = cast(ST.StoreCode as int)
					left JOIN EVM.TBL_CITY CI WITH(NOLOCK)  ON ST.CityId=CI.CITY_CODE
					left JOIN EVM.TBL_STATE STA WITH(NOLOCK)  ON ci.STATE_ID = STA.SATE_CODE  --ST.CircleId= STA.SATE_CODE 
					 left Join RTL.RegionMaster RM ON RM.ID = ST.RegionId
					WHERE   
					 SMM.PartyId in (select distinct MAPID FROM LOGINTABLE WHERE loginId=@Id ))T1 
					ORDER BY CreatedOn DESC
			 End
			 Else
			 Begin
			 SELECT DISTINCT ROW_NUMBER() OVER (ORDER BY CreatedOn DESC) SrNo,  * FROM (
			 SELECT DISTINCT  ST.Id,UserId,ST.Id StoreId,	ST.PartyTypeId,	SequenceNumber,	StoreCode,RefStoreCode	,StoreName,	CompleteAddress,	ProposedDate,	StoreLocation	,ST.CityId,CM.Name	CircleId,RegionId,RM.Name RegionName,	ZipCode,	StoreManagerName,	StoreManagerMobileNo,	StoreManagerEmail,	AreaManagerName,	AreaManagerMobileNo,	AreaManagerEmail,	ZonalManagerName,	ZonalManagerMobileNo,	ZonalManagerEmail	,CircleHeadName,	CircleHeadMobileNo,	CircleHeadEmail,	RegionalHeadName,	RegionalHeadMobileNo,	RegionalHeadEmail,	CorporateHeadName	,CorporateHeadMobileNo,	CorporateHeadEmail,	SQFTStoreArea	,IsActive,
                      CASE WHEN   ElectricityBill='' OR  ElectricityBill IS NULL THEN 'none' ELSE ElectricityBill END AS  ElectricityBill	,
					  CASE WHEN   RentAgreement='' OR  RentAgreement IS NULL THEN 'none' ELSE RentAgreement END AS  RentAgreement,
					   CASE WHEN   PropertyTaxPaidReceipt='' OR  PropertyTaxPaidReceipt IS NULL THEN 'none' ELSE PropertyTaxPaidReceipt END AS PropertyTaxPaidReceipt	,
					  CASE WHEN   BuildingPlan='' OR  BuildingPlan IS NULL THEN 'none' ELSE BuildingPlan END AS  BuildingPlan	,
					   CASE WHEN   StabilityStructureCertificate='' OR  StabilityStructureCertificate IS NULL THEN 'none' ELSE StabilityStructureCertificate END AS StabilityStructureCertificate	,
					  CASE WHEN   CompletionCertificate='' OR  CompletionCertificate IS NULL THEN 'none' ELSE CompletionCertificate END AS   CompletionCertificate,
					  ST.CreatedBy,	ST.CreatedOn,	ModifyBy,	ST.ModifiedOn,	DaysOfExpire,CI.CITY_CODE,CI.CITY_NAME,STA.SATE_CODE,STA.STATE_NM,ST.Category
					   ,ElectricityBillPeriodUpTo
           ,LeasePaidReceiptPeriodUpTo 
           ,PropertyTaxPeriodUpTo 
           ,FireNocPeriodUpTo 
           ,PollutionPeriodUpTo
           ,OwnershipDocPeriodUpTo
           ,AdditionalDocPeriodUpTo
           ,LeaseFromDate
           ,ElectricityBillRemark
           ,LeasePaidReceiptRemark
           ,PropertyTaxRemark
           ,FireNocRemark
           ,PollutionRemark
           ,OwnershipDocRemark
           ,AdditionalDocRemark
					FROM RTL.StoreMaster ST WITH(NOLOCK)
					 left JOIN [RTL].[CircleMaster]   CM WITH(NOLOCK) ON CM.ID = ST.CircleId
					left JOIN [RTL].[StoreMapping]  SMM WITH(NOLOCK) ON SMM.StoreId = cast(ST.StoreCode as int)
					left JOIN EVM.TBL_CITY CI WITH(NOLOCK)  ON ST.CityId=CI.CITY_CODE
					left JOIN EVM.TBL_STATE STA WITH(NOLOCK)  ON ci.STATE_ID = STA.SATE_CODE --ST.CircleId= STA.SATE_CODE 
					 left Join RTL.RegionMaster RM ON RM.ID = ST.RegionId
					WHERE 
					--ST.createdby=@Id or 
						SMM.UserId in (@Id ))T1 
					--SMM.UserId in (select distinct MAPID FROM LOGINTABLE WHERE loginId=@Id ))T1 
					ORDER BY CreatedOn DESC
			 End
				
					
					
				
		End
  End  


     IF(@Action=5)  ---Store binds for Admin Panel
  Begin  
		SELECT s.StoreCode as StoreId ,UserId,  StoreCode+' ['+ RefStoreCode +']' StoreCode,StoreName,RefStoreCode, case WHEN ISNULL(UserId,'-1')='-1' THEN Convert(Bit,0) else Convert(Bit,1) end IsAllow
		FROM RTL.StoreMaster  s
		Left Join RTL.StoreMapping sm on sm.StoreId= cast(s.StoreCode as int)
		where 
		@Id= case when @Id=1 then @Id else  UserId end 
		or UserId is null
  End  
     IF(@Action=6)  ---Store binds for Admin Panel
  Begin  
       Print @IsActive 
		update RTL.StoreMaster set IsActive=@IsActive where StoreCode=@StoreCode
  End  
  IF(@Action=7)  
  Begin  
         if(@Id='1')
		 Begin  
			SELECT   
			Id StoreId,StoreCode+' ['+ RefStoreCode+']' StoreCode
			FROM RTL.StoreMaster 
			where StoreCode like '%'+ @StoreCode +'%'
			ORDER BY  CreatedOn DESC
		End
		else 
		 Begin 
		  if exists (select 1 from rtl.AssignExecuter where ExecuterId=@Id)
		  Begin
		  SELECT   
				SM.Id StoreId,StoreCode+' ['+ RefStoreCode+']' StoreCode
				FROM RTL.StoreMaster SM
				inner JOIN [RTL].[StoreMapping]  SMM WITH(NOLOCK) ON SMM.StoreId = cast(SM.StoreCode as int)
				where StoreCode like '%'+ @StoreCode +'%' AND 	
				SMM.PartyId in (select distinct MAPID FROM LOGINTABLE WHERE loginId=@Id )    ORDER BY  SM.CreatedOn DESC
				 
		  End
		  else
		  Begin
		  SELECT   
				SM.Id StoreId,StoreCode+' ['+ RefStoreCode +']' StoreCode
				FROM RTL.StoreMaster SM
				inner JOIN [RTL].[StoreMapping]  SMM WITH(NOLOCK) ON SMM.StoreId = cast(SM.StoreCode as int)
				where StoreCode like '%'+ @StoreCode +'%' AND 	
				SMM.UserId=@Id     ORDER BY  SM.CreatedOn DESC

		  End
				
		End
  End  
  IF(@Action=8)
  Begin   
  		SET NOCOUNT ON 
		DECLARE @RegionIdS varchar(50)=null
		DECLARE @StoreMasterlList NVARCHAR(MAX)  
		DECLARE CursorMaster CURSOR  
		LOCAL  FORWARD_ONLY  FOR  
		Select val from Split('|', @StoreMaster)
		OPEN CursorMaster  
		FETCH NEXT FROM CursorMaster INTO  @StoreMasterlList
		WHILE @@FETCH_STATUS = 0  
		BEGIN    
		DECLARE CursorI CURSOR  		     
		LOCAL  FORWARD_ONLY  FOR   		     
		SELECT   						     
		case when [1]='' then null else  [1]   end,  
		case when [2]='' then null else  [2]   end,
		case when [3]='' then null else  [3]   end,
		case when [4]='' then null else  [4]   end,
		case when [5]='' then null else  [5]   end,
		case when [6]='' then null else  [6]   end,	 
		case when [7]='' then null else  [7]   end,  
		case when [8]='' then null else  [8]   end,
		case when [9]='' then null else  [9]   end,
		case when [10]='' then null else [10]     end,
		case when [11]='' then null else [11]     end,
		case when [12]='' then null else [12]     end,	 
		case when [13]='' then null else [13]     end,  
		case when [14]='' then null else [14]     end,
		case when [15]='' then null else [15]     end,
		case when [16]='' then null else [16]     end,
		case when [17]='' then null else [17]     end,
		case when [18]='' then null else [18]     end,	 
		case when [19]='' then null else [19]     end,  
		case when [20]='' then null else [20]     end,
		case when [21]='' then null else [21]     end,
		case when [22]='' then null else [22]     end,
		case when [23]='' then null else [23]     end,
		case when [24]='' then null else [24]     end,	 
		case when [25]='' then null else [25]     end,  
		case when [26]='' then null else [26]     end,
		case when [27]='' then null else [27]     end,
		case when [28]='' then null else [28]     end,
		case when [29]='' then null else [29]     end
		FROM dbo.Split(',',@StoreMasterlList)
		PIVOT
		(
		Max(val)
		FOR [indexs] IN ([1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13],[14],[15],[16],[17],[18],[19],[20],[21],[22],[23],[24],[25],[26],[27],[28],[29])
		) AS P 
		OPEN CursorI  
		FETCH NEXT FROM CursorI INTO 
		@RefStoreCode,@StoreName ,@CompleteAddress,@ProposedDate,@StoreLocation ,@ZipCode,
			@StoreManagerName,@StoreManagerMobileNo ,@StoreManagerEmail,@AreaManagerMobileNo,@AreaManagerName,@AreaManagerEmail,@ZonalManagerName,
			@ZonalManagerMobileNo,@ZonalManagerEmail,@CircleHeadName,@CircleHeadMobileNo,@CircleHeadEmail,@RegionalHeadName, @RegionalHeadMobileNo ,
			@RegionalHeadEmail,@CorporateHeadName,@CorporateHeadMobileNo,@CorporateHeadEmail ,@SQFTStoreArea,@DaysOfExpire,@IsActive,@Category,@RegionIdS
		WHILE @@FETCH_STATUS = 0  
		BEGIN    
			SET @seqNumber = (SELECT ISNULL((SELECT ISNULL(Max(SequenceNumber),0) + 1 
			FROM RTL.StoreMaster with(nolock)  
			),1)) 
			SELECT @Prefix = Prefix,@Suffix =Suffix FROM RTL.StorePrefix WITH(NOLOCK)
			WHERE   CONVERT(DATE,GETUTCDATE()) BETWEEN StartDate AND EndDate 
			SELECT @Store_Code = ISNULL(@Prefix,'') + FORMAT(@seqNumber,'00000000') + ISNULL(@Suffix,'')  
		 
		   SET @Cityid =(SELECT distinct top(1) CITY_ID FROM [EVM].[TBL_PIN]  where pin_number=@ZipCode)
		    set @RegionId = convert(float,@RegionIdS)
			IF(@StoreName!='')
			bEGIN
			INSERT INTO [RTL].[StoreMaster] 
			( [StoreCode] ,SequenceNumber,RefStoreCode,[StoreName] ,CompleteAddress,ProposedDate,StoreLocation ,ZipCode,SQFTStoreArea,
			DaysOfExpire,StoreManagerName,	StoreManagerMobileNo ,StoreManagerEmail,	AreaManagerMobileNo,AreaManagerName,AreaManagerEmail,
			ZonalManagerName,	ZonalManagerMobileNo, 	ZonalManagerEmail,	CircleHeadName,	CircleHeadMobileNo,CircleHeadEmail,	RegionalHeadName, 
			RegionalHeadMobileNo ,	RegionalHeadEmail,	CorporateHeadName,	CorporateHeadMobileNo,	CorporateHeadEmail ,IsActive,Cityid,Category,RegionId,CreatedBy  )
			VALUES
			(@Store_Code,@seqNumber, @RefStoreCode,@StoreName ,@CompleteAddress,@ProposedDate,@StoreLocation,@ZipCode,@SQFTStoreArea,@DaysOfExpire,
			@StoreManagerName,@StoreManagerMobileNo ,@StoreManagerEmail,@AreaManagerMobileNo,@AreaManagerName,@AreaManagerEmail,@ZonalManagerName,@ZonalManagerMobileNo, 
			@ZonalManagerEmail,@CircleHeadName,@CircleHeadMobileNo,@CircleHeadEmail,@RegionalHeadName, @RegionalHeadMobileNo ,@RegionalHeadEmail,@CorporateHeadName,
			@CorporateHeadMobileNo,@CorporateHeadEmail ,@IsActive,@Cityid,@Category,@RegionId,@UserId  ) 
			--if not exists(select 1 from RTL.CreateExecuter where ExecuterId=@UserId)
		--	Begin
			Declare @StoreId int;
			Declare @PartyId int;
			Set @StoreId =(select top(1)StoreCode  from rtl.storemaster where StoreCode=@Store_Code)
			Set @PartyId =(SELECT tOP(1)MapId  FROM LoginTable WHERE LoginId=@UserId)
			if exists(select 1 from LoginTable where LoginId=@UserId and logintype=4)
			Begin
			 INSERT INTO [RTL].[StoreMapping] (StoreId,PartyId, UserId, PartyTypeId, StartDate, EndDate, CreatedOn, CreatedBy)
	         values(@StoreId,@PartyId, @UserId, 4, getdate(), getdate(), getdate(), 1) 
			 End
			End
		--   END
			FETCH NEXT FROM CursorI INTO  @RefStoreCode,@StoreName ,@CompleteAddress,@ProposedDate,@StoreLocation ,@ZipCode,	@StoreManagerName,@StoreManagerMobileNo ,@StoreManagerEmail,@AreaManagerMobileNo,@AreaManagerName,@AreaManagerEmail,@ZonalManagerName,@ZonalManagerMobileNo, 
			@ZonalManagerEmail,@CircleHeadName,@CircleHeadMobileNo,@CircleHeadEmail,@RegionalHeadName, @RegionalHeadMobileNo ,@RegionalHeadEmail,@CorporateHeadName,
			@CorporateHeadMobileNo,@CorporateHeadEmail ,@SQFTStoreArea,@DaysOfExpire,@IsActive,@Category,@RegionIdS
			END  
			CLOSE CursorI  
			DEALLOCATE CursorI  
			FETCH NEXT FROM CursorMaster INTO  @StoreMasterlList
			END  
			CLOSE CursorMaster  
			DEALLOCATE CursorMaster  
				SET @RESULT = 'Save Successfully '; 
		  End
		  if(@Action=9)
	Begin
	   select * from rtl.AdditionalStoreDoc where StoreCode=@StoreCode
	End
	IF(@Action=10)
	Begin
	    IF NOT EXISTS(select 1 FROM  rtl.AdditionalStoreDoc  where StoreCode=@StoreCode)
		bEGIN
		   INSERT INTO rtl.AdditionalStoreDoc(StoreCode,AdditionalDocName,	AdditionalDoc,	Createdby,	CreatedOn)VALUES
	   (@StoreCode,@DocumentName,	@UFile,	@Createdby,	GETDATE()) 
	   sET @Result='1' 
		END
		ELSE
		bEGIN
		UPDATE  rtl.AdditionalStoreDoc SET AdditionalDoc=@UFile ,AdditionalDocName=@DocumentName
		WHERE StoreCode=@StoreCode
		  sET @Result='2' 
		eND
	
	End
	IF(@Action = 11)  ---Store binds for Admin Panel
BEGIN  
  SELECT distinct s.StoreCode as StoreId ,
   StoreCode+' ['+ RefStoreCode +']' StoreCode,
   StoreName,RefStoreCode,
   case WHEN ISNULL(UserId,'-1')='-1' THEN Convert(Bit,0) else Convert(Bit,1) end IsAllow,
   LT.[UserName],
   Case 
    WHEN ISNULL(LT.LoginId,'-1')='-1' THEN NULL
   When (select 1 from rtl.AssignExecuter where executerId=LT.LoginId) = 1 Then 'Executor'
    
	else 'client' end ClientType
		FROM RTL.StoreMaster  s
		Left Join RTL.StoreMapping sm on sm.StoreId= cast(s.StoreCode as int)
		Left Join LoginTable LT on LT.LoginId=s.CreatedBy
		where 
		userId in (select LoginId from LoginTable where mapId=@Id)  
		--or UserId is null
END
End
