/****** Object:  StoredProcedure [RTL].[USP_EmployeeMaster]    Script Date: 12-11-2024 21:59:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
 
 
ALTER PROCEDURE [RTL].[USP_EmployeeMaster] (
	 @Action INT = NULL
	,@Id BIGINT = 0,
	@IsActive int =null
	,@PartyTypeId VARCHAR(50) = null
	,@PartyId VARCHAR(50) = null
	,@EmployeeCode VARCHAR(50) =null
	,@EmployeeName VARCHAR(150) =null
	,@EmployeeDesignation VARCHAR(150) =null
	,@EmployeeDepartment VARCHAR(150) =null
	,@Father_Husband_Name VARCHAR(50) =null
	,@Gendar VARCHAR(10) =null
	,@MaritalStatus VARCHAR(50) =null
	,@DateOfBirth DATE =null
	,@PresentAddress NVARCHAR(250) =null
	,@PermanemtAddress NVARCHAR(250) =null
	,@AdharCardNumber VARCHAR(50) =null
	,@PANNumber VARCHAR(50) =null
	,@MobileNumber VARCHAR(50) =null
	,@AlternativeMobileNumber VARCHAR(50) =null
	,@EmployeeEmailID VARCHAR(50) =null
	,@BankAccountNumber VARCHAR(50) =null
	,@BankIFSCCode VARCHAR(50) =null
	,@PreviousUAN VARCHAR(50) =null
	,@PreviousESI VARCHAR(50) =null 
	,@GrossSalary VARCHAR(50)=null
	,@DOJ DATE =null
	,@NomineeName VARCHAR(150) =null
	,@NomineeAddress NVARCHAR(250) =null
	,@NomineeRelation VARCHAR(50) =null
	,@NomineeDOB DATE =null
	,@StoreCode VARCHAR(50) =null
	,@Status VARCHAR(50) =null
	,@PANCardFilePath VARCHAR(500) =null
	,@Cheque_Passbook_FilePath VARCHAR(500) =null
	,@EducationCertificateFilePath VARCHAR(500) =null
	,@ExperienceCertificateFilePath VARCHAR(500) =null
	,@AdhaarCard_FrontSide_FilePath VARCHAR(500) =null
	,@AdhaarCard_BackSide_FilePath VARCHAR(500) =null
	,@RelievingLetterfFilePath VARCHAR(500) =null
	,@PayslipsFilePath VARCHAR(500)=null 
	,@Photos_1_FilePath VARCHAR(500)=null
	,@Photos_2_FilePath VARCHAR(500)=null
	,@Photos_3_FilePath VARCHAR(500)=null
	,@Photos_4_FilePath VARCHAR(500)=null
	,@SuperVisior1 varchar(50) =null
	,@SuperVisior2 varchar(50) =null
	,@UserId varchar(50) =null
	,@UserIds varchar(50) =null 
	,@EmployeeMaster varchar(Max)=null
	,@Result VARCHAR(50) = '' OUTPUT
	)
AS
BEGIN

	IF(@Action IN (1,2))
	BEGIN
 
	 	 IF EXISTS (SELECT 1 FROM  [RTL].[EmployeeMaster] WHERE Id != @Id AND  MobileNumber=@MobileNumber )
	 BEGIN
		SET  @Result='Employee MobileNumber Already Exists'
		RETURN
	 END
	END
	IF (@Action = 1)
	BEGIN
	
		INSERT INTO [RTL].[EmployeeMaster] (
		    PartyTypeId,
		    PartyId,
			UserId,
			SuperVisior1,
			SuperVisior2,
			[EmployeeCode]
			,[EmployeeName]
			,[EmployeeDesignation]
			,[EmployeeDepartment]
			,[Father_Husband_Name]
			,[Gendar]
			,[MaritalStatus]
			,[DateOfBirth]
			,[PresentAddress]
			,[PermanemtAddress]
			,[AdharCardNumber]
			,[PANNumber]
			,[MobileNumber]
			,[AlternativeMobileNumber]
			,[EmployeeEmailID]
			,[BankAccountNumber]
			,[BankIFSCCode]
			,[PreviousUAN]
			,[PreviousESI]
			,[GrossSalary]
			,[DOJ]
			,[NomineeName]
			,[NomineeAddress]
			,[NomineeRelation]
			,[NomineeDOB]
			,[StoreCode]
			,[IsActive]
			,[PANCardFilePath]
			,[Cheque_Passbook_FilePath]
			,[EducationCertificateFilePath]
			,[ExperienceCertificateFilePath]
			,[AdhaarCard_FrontSide_FilePath]
			,[AdhaarCard_BackSide_FilePath]
			,[RelievingLetterfFilePath]
			,[PayslipsFilePath]
			,[Photos_1_FilePath]
			,[Photos_2_FilePath]
			,[Photos_3_FilePath]
			,[Photos_4_FilePath]
			,[CreatedBy]
			)
		VALUES (
		    @PartyTypeId,
		    @PartyId,
		    @UserId,
			@SuperVisior1,
			@SuperVisior2,
			@EmployeeCode
			,@EmployeeName
			,@EmployeeDesignation
			,@EmployeeDepartment
			,@Father_Husband_Name
			,@Gendar
			,@MaritalStatus
			,@DateOfBirth
			,@PresentAddress
			,@PermanemtAddress
			,@AdharCardNumber
			,@PANNumber
			,@MobileNumber
			,@AlternativeMobileNumber
			,@EmployeeEmailID
			,@BankAccountNumber
			,@BankIFSCCode
			,@PreviousUAN
			,@PreviousESI
			,@GrossSalary
			,@DOJ
			,@NomineeName
			,@NomineeAddress
			,@NomineeRelation
			,@NomineeDOB
			,@StoreCode
			,@Status
			,@PANCardFilePath
			,@Cheque_Passbook_FilePath
			,@EducationCertificateFilePath
			,@ExperienceCertificateFilePath
			,@AdhaarCard_FrontSide_FilePath
			,@AdhaarCard_BackSide_FilePath
			,@RelievingLetterfFilePath
			,@PayslipsFilePath
			,@Photos_1_FilePath
			,@Photos_2_FilePath
			,@Photos_3_FilePath
			,@Photos_4_FilePath
			,@UserIds
			)
		SET  @Result='1'
	END

	IF (@Action = 2)
	BEGIN
		UPDATE [RTL].[EmployeeMaster]
		SET 
		PartyTypeId = @PartyTypeId,
		PartyId = @PartyId,
			UserId=    @UserId, 
		[EmployeeCode] = @EmployeeCode
			,[EmployeeName] = @EmployeeName
			,[EmployeeDesignation] = @EmployeeDesignation
			,[EmployeeDepartment] = @EmployeeDepartment
			,[Father_Husband_Name] = @Father_Husband_Name
			,[Gendar] = @Gendar
			,[MaritalStatus] = @MaritalStatus
			,[DateOfBirth] = @DateOfBirth
			,[PresentAddress] = @PresentAddress
			,[PermanemtAddress] = @PermanemtAddress
			,[AdharCardNumber] = @AdharCardNumber
			,[PANNumber] = @PANNumber
			,[MobileNumber] = @MobileNumber
			,[AlternativeMobileNumber] = @AlternativeMobileNumber
			,[EmployeeEmailID] = @EmployeeEmailID
			,[BankAccountNumber] = @BankAccountNumber
			,[BankIFSCCode] = @BankIFSCCode
			,[PreviousUAN] = @PreviousUAN
			,[PreviousESI] = @PreviousESI
			,[GrossSalary] = @GrossSalary
			,[DOJ] = @DOJ
			,[NomineeName] = @NomineeName
			,[NomineeAddress] = @NomineeAddress
			,[NomineeRelation] = @NomineeRelation
			,[NomineeDOB] = @NomineeDOB
			,[StoreCode] = ISNULL(@StoreCode,'')
			,[IsActive] = ISNULL(@Status,0)
			,[PANCardFilePath] = ISNULL(@PANCardFilePath,[PANCardFilePath])
			,[Cheque_Passbook_FilePath] = ISNULL(@Cheque_Passbook_FilePath,[Cheque_Passbook_FilePath])
			,[EducationCertificateFilePath] = ISNULL(@EducationCertificateFilePath,[EducationCertificateFilePath])
			,[ExperienceCertificateFilePath] = ISNULL(@ExperienceCertificateFilePath,[ExperienceCertificateFilePath])
			,[AdhaarCard_FrontSide_FilePath] = ISNULL(@AdhaarCard_FrontSide_FilePath,[AdhaarCard_FrontSide_FilePath])
			,[AdhaarCard_BackSide_FilePath] = ISNULL(@AdhaarCard_BackSide_FilePath,[AdhaarCard_BackSide_FilePath])
			,[RelievingLetterfFilePath] = ISNULL(@RelievingLetterfFilePath,[RelievingLetterfFilePath])
			,[PayslipsFilePath] = ISNULL(@PayslipsFilePath,[PayslipsFilePath])
			,[Photos_1_FilePath] = ISNULL(@Photos_1_FilePath,[Photos_1_FilePath])
			,[Photos_2_FilePath] = ISNULL(@Photos_2_FilePath,[Photos_2_FilePath])
			,[Photos_3_FilePath] = ISNULL(@Photos_3_FilePath,[Photos_3_FilePath])
			,[Photos_4_FilePath] = ISNULL(@Photos_4_FilePath,[Photos_4_FilePath])
			,[ModifyBy] = @UserIds
			,[ModifiedOn] = GETUTCDATE()
		WHERE Id = @Id
		
		SET  @Result='2'

	END

	IF (@Action = 3)
	BEGIN
		DELETE
		FROM [RTL].[EmployeeMaster]
		WHERE Id = @Id
	END

	IF (@Action = 4)
	BEGIN
		if(@PartyId=1)
		Begin
		SELECT [Id],
        PartyTypeId,
		PartyId,
		convert(varchar,UserId)UserId,
		convert(varchar,SuperVisior1)SuperVisior1,
		convert(varchar,SuperVisior2)SuperVisior2
      ,[EmployeeCode]
      ,[EmployeeName]
      ,[EmployeeDesignation]
      ,[EmployeeDepartment]
      ,[Father_Husband_Name]
      ,[Gendar]
      ,[MaritalStatus]
      ,[DateOfBirth]
      ,[PresentAddress]
      ,[PermanemtAddress]
      ,[AdharCardNumber]
      ,[PANNumber]
      ,[MobileNumber]
      ,[AlternativeMobileNumber]
      ,[EmployeeEmailID]
      ,[BankAccountNumber]
      ,[BankIFSCCode]
      ,[PreviousUAN]
      ,[PreviousESI]
      ,[GrossSalary]
      ,[DOJ]
      ,[NomineeName]
      ,[NomineeAddress]
      ,[NomineeRelation]
      ,[NomineeDOB]
      ,[StoreCode]
      ,[IsActive]
      ,[PANCardFilePath]
      ,[Cheque_Passbook_FilePath]
      ,[EducationCertificateFilePath]
      ,[ExperienceCertificateFilePath]
      ,[AdhaarCard_FrontSide_FilePath]
      ,[AdhaarCard_BackSide_FilePath]
      ,[RelievingLetterfFilePath]
      ,[PayslipsFilePath]
      ,[Photos_1_FilePath]
      ,[Photos_2_FilePath]
      ,[Photos_3_FilePath]
      ,[Photos_4_FilePath],
	  (( CASE WHEN ISNULL([PANCardFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Cheque_Passbook_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([EducationCertificateFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([ExperienceCertificateFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([AdhaarCard_FrontSide_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([RelievingLetterfFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([PayslipsFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Photos_1_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Photos_2_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Photos_3_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Photos_4_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([AdhaarCard_BackSide_FilePath],'') != '' THEN 1 ELSE 0 END
	) * 100 ) As aa,
	((( CASE WHEN ISNULL([PANCardFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Cheque_Passbook_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([EducationCertificateFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([ExperienceCertificateFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([AdhaarCard_FrontSide_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([RelievingLetterfFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([PayslipsFilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([Photos_1_FilePath],'') != '' THEN 1 ELSE 0 END
	--+ CASE WHEN ISNULL([Photos_2_FilePath],'') != '' THEN 1 ELSE 0 END
	--+ CASE WHEN ISNULL([Photos_3_FilePath],'') != '' THEN 1 ELSE 0 END
	--+ CASE WHEN ISNULL([Photos_4_FilePath],'') != '' THEN 1 ELSE 0 END
	+ CASE WHEN ISNULL([AdhaarCard_BackSide_FilePath],'') != '' THEN 1 ELSE 0 END
	)*100) /9)  As DocumentStatus,
	   FORMAT(DOJ,'dd/MM/yyyy') As DisplayDOJ,
	   case when len(isnull(StoreCode,'')) >0 then 'block!important' else 'none!important' end IsTransfer
		FROM [RTL].[EmployeeMaster]
		WHERE Id = @Id OR (@Id = 0)
		order by id desc
		End
		else
		Begin
		if exists(select 1 from rtl.AssignExecuter where executerId=@Id)
Begin
SELECT [Id],
PartyTypeId,
PartyId,
convert(varchar,UserId)UserId,
convert(varchar,SuperVisior1)SuperVisior1,
convert(varchar,SuperVisior2)SuperVisior2
,[EmployeeCode]
,[EmployeeName]
,[EmployeeDesignation]
,[EmployeeDepartment]
,[Father_Husband_Name]
,[Gendar]
,[MaritalStatus]
,[DateOfBirth]
,[PresentAddress]
,[PermanemtAddress]
,[AdharCardNumber]
,[PANNumber]
,[MobileNumber]
,[AlternativeMobileNumber]
,[EmployeeEmailID]
,[BankAccountNumber]
,[BankIFSCCode]
,[PreviousUAN]
,[PreviousESI]
,[GrossSalary]
,[DOJ]
,[NomineeName]
,[NomineeAddress]
,[NomineeRelation]
,[NomineeDOB]
,[StoreCode]
,[IsActive]
,[PANCardFilePath]
,[Cheque_Passbook_FilePath]
,[EducationCertificateFilePath]
,[ExperienceCertificateFilePath]
,[AdhaarCard_FrontSide_FilePath]
,[AdhaarCard_BackSide_FilePath]
,[RelievingLetterfFilePath]
,[PayslipsFilePath]
,[Photos_1_FilePath]
,[Photos_2_FilePath]
,[Photos_3_FilePath]
,[Photos_4_FilePath],
(( CASE WHEN ISNULL([PANCardFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Cheque_Passbook_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([EducationCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([ExperienceCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_FrontSide_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([RelievingLetterfFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([PayslipsFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_1_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_2_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_3_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_4_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_BackSide_FilePath],'') != '' THEN 1 ELSE 0 END
) * 100 ) As aa,
((( CASE WHEN ISNULL([PANCardFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Cheque_Passbook_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([EducationCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([ExperienceCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_FrontSide_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([RelievingLetterfFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([PayslipsFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_1_FilePath],'') != '' THEN 1 ELSE 0 END
--+ CASE WHEN ISNULL([Photos_2_FilePath],'') != '' THEN 1 ELSE 0 END
--+ CASE WHEN ISNULL([Photos_3_FilePath],'') != '' THEN 1 ELSE 0 END
--+ CASE WHEN ISNULL([Photos_4_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_BackSide_FilePath],'') != '' THEN 1 ELSE 0 END
)*100) /9)  As DocumentStatus,
FORMAT(DOJ,'dd/MM/yyyy') As DisplayDOJ,
case when len(isnull(StoreCode,'')) >0 then 'block!important' else 'none!important' end IsTransfer
FROM [RTL].[EmployeeMaster]
WHERE UserId=(select distinct MAPID FROM LOGINTABLE WHERE loginId=@PartyId ) or Id=@Id 
order by id desc
end
else
Begin
SELECT [Id],
PartyTypeId,
PartyId,
convert(varchar,UserId)UserId,
convert(varchar,SuperVisior1)SuperVisior1,
convert(varchar,SuperVisior2)SuperVisior2
,[EmployeeCode]
,[EmployeeName]
,[EmployeeDesignation]
,[EmployeeDepartment]
,[Father_Husband_Name]
,[Gendar]
,[MaritalStatus]
,[DateOfBirth]
,[PresentAddress]
,[PermanemtAddress]
,[AdharCardNumber]
,[PANNumber]
,[MobileNumber]
,[AlternativeMobileNumber]
,[EmployeeEmailID]
,[BankAccountNumber]
,[BankIFSCCode]
,[PreviousUAN]
,[PreviousESI]
,[GrossSalary]
,[DOJ]
,[NomineeName]
,[NomineeAddress]
,[NomineeRelation]
,[NomineeDOB]
,[StoreCode]
,[IsActive]
,[PANCardFilePath]
,[Cheque_Passbook_FilePath]
,[EducationCertificateFilePath]
,[ExperienceCertificateFilePath]
,[AdhaarCard_FrontSide_FilePath]
,[AdhaarCard_BackSide_FilePath]
,[RelievingLetterfFilePath]
,[PayslipsFilePath]
,[Photos_1_FilePath]
,[Photos_2_FilePath]
,[Photos_3_FilePath]
,[Photos_4_FilePath],
(( CASE WHEN ISNULL([PANCardFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Cheque_Passbook_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([EducationCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([ExperienceCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_FrontSide_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([RelievingLetterfFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([PayslipsFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_1_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_2_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_3_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_4_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_BackSide_FilePath],'') != '' THEN 1 ELSE 0 END
) * 100 ) As aa,
((( CASE WHEN ISNULL([PANCardFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Cheque_Passbook_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([EducationCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([ExperienceCertificateFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_FrontSide_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([RelievingLetterfFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([PayslipsFilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([Photos_1_FilePath],'') != '' THEN 1 ELSE 0 END
--+ CASE WHEN ISNULL([Photos_2_FilePath],'') != '' THEN 1 ELSE 0 END
--+ CASE WHEN ISNULL([Photos_3_FilePath],'') != '' THEN 1 ELSE 0 END
--+ CASE WHEN ISNULL([Photos_4_FilePath],'') != '' THEN 1 ELSE 0 END
+ CASE WHEN ISNULL([AdhaarCard_BackSide_FilePath],'') != '' THEN 1 ELSE 0 END
)*100) /9)  As DocumentStatus,
FORMAT(DOJ,'dd/MM/yyyy') As DisplayDOJ,
case when len(isnull(StoreCode,'')) >0 then 'block!important' else 'none!important' end IsTransfer
FROM [RTL].[EmployeeMaster]
WHERE UserId=@PartyId or Id=@Id  
End
		   
		
		End
	END

	IF (@Action = 5)
	BEGIN
			UPDATE [RTL].[EmployeeMaster]
		SET
			[PANCardFilePath] = ISNULL(@PANCardFilePath,[PANCardFilePath])
			,[Cheque_Passbook_FilePath] = ISNULL(@Cheque_Passbook_FilePath,[Cheque_Passbook_FilePath])
			,[EducationCertificateFilePath] = ISNULL(@EducationCertificateFilePath,[EducationCertificateFilePath])
			,[ExperienceCertificateFilePath] = ISNULL(@ExperienceCertificateFilePath,[ExperienceCertificateFilePath])
			,[AdhaarCard_FrontSide_FilePath] = ISNULL(@AdhaarCard_FrontSide_FilePath,[AdhaarCard_FrontSide_FilePath])
			,[AdhaarCard_BackSide_FilePath] = ISNULL(@AdhaarCard_BackSide_FilePath,[AdhaarCard_BackSide_FilePath])
			,[RelievingLetterfFilePath] = ISNULL(@RelievingLetterfFilePath,[RelievingLetterfFilePath])
			,[PayslipsFilePath] = ISNULL(@PayslipsFilePath,[PayslipsFilePath])
			,[Photos_1_FilePath] = ISNULL(@Photos_1_FilePath,[Photos_1_FilePath])
			,[Photos_2_FilePath] = ISNULL(@Photos_2_FilePath,[Photos_2_FilePath])
			,[Photos_3_FilePath] = ISNULL(@Photos_3_FilePath,[Photos_3_FilePath])
			,[Photos_4_FilePath] = ISNULL(@Photos_4_FilePath,[Photos_4_FilePath])
			,[ModifyBy] = @UserIds
			,[ModifiedOn] = GETUTCDATE()
		WHERE Id = @Id
		SET  @Result='2'
	END
	if(@Action=6)
	Begin
	    SELECT LoginId,UserName Name FROM LoginTable 
		WHERE MAPID=@Id 
		--AND LoginId NOT IN (select executerId from rtl.AssignExecuter where PartyId=@Id)
	END
	if(@Action=7)
	Begin
	set @SuperVisior2= isnull(@SuperVisior2,'-1')
	Print @SuperVisior2
	select LoginId Id, UserName Name from Logintable where MapId=@Id --and LoginId<> @SuperVisior2

	 --   SELECT Id,Name FROM [RTL].[RoleMaster] WHERE  UserId=@Id   and
		--Id<> @SuperVisior2 --=case when isnull(@SuperVisior2,'-1')='-1'then @SuperVisior2 else Id end
	END
	if(@Action=8)
	Begin  
	 	select LoginId Id, UserName Name from Logintable where MapId=@Id --and LoginId<> @SuperVisior1
 
	END
	if(@Action=9)
	Begin
	  update [RTL].[EmployeeMaster] set IsActive=@Status where [Id] = @Id
	END
	  IF(@Action=10)
  Begin  
  		SET NOCOUNT ON  
		DECLARE @EmployeeMasterlList NVARCHAR(MAX)  
		DECLARE CursorMaster CURSOR  
		LOCAL  FORWARD_ONLY  FOR  
		Select val from Split('|', @EmployeeMaster)
		OPEN CursorMaster  
		FETCH NEXT FROM CursorMaster INTO  @EmployeeMasterlList
		WHILE @@FETCH_STATUS = 0  
		BEGIN    
		DECLARE CursorI CURSOR  
		LOCAL  FORWARD_ONLY  FOR   
		SELECT   
			case when [1]='' then null else [1] end,  
			case when [2]='' then null else [2] end,
			case when [3]='' then null else [3] end,
			case when [4]='' then null else [4] end,
			case when [5]='' then null else [5] end,
			case when [6]='' then null else [6] end,
			case when [7]='' then null else [7] end,
			case when [8]='' then null else [8] end,
			case when [9]='' then null else [9] end,
			case when [10]='' then null else [10] end,
			case when [11]='' then null else [11] end, 
			case when [12]='' then null else [12] end,
			case when [13]='' then null else [13] end,
			case when [14]='' then null else [14] end,
			case when [15]='' then null else [15] end,
			case when [16]='' then null else [16] end,
			case when [17]='' then null else [17] end,
			case when [18]='' then null else [18] end,
			case when [19]='' then null else [19] end,
			case when [20]='' then null else [20] end,
			case when [21]='' then null else [21] end,
			case when [22]='' then null else [22] end,
			case when [23]='' then null else [23] end,
			 case when [24]='' then null else [24] end,
			 case when [25]='' then null else [25] end
		FROM dbo.Split(',',@EmployeeMasterlList)
		PIVOT
		(
		Max(val)
		FOR [indexs] IN ([1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13],[14],[15],[16],[17],[18],[19],[20],[21],[22],[23],[24],[25])
		) AS P 
		OPEN CursorI  
		FETCH NEXT FROM CursorI INTO @EmployeeName,@EmployeeDesignation,@EmployeeDepartment,@Father_Husband_Name,@Gendar,@MaritalStatus,@DateOfBirth
			,@PresentAddress,@PermanemtAddress,@AdharCardNumber,@PANNumber,@MobileNumber	,@AlternativeMobileNumber,@EmployeeEmailID
			,@BankAccountNumber,@BankIFSCCode,@PreviousUAN,@PreviousESI,@GrossSalary,@DOJ,@NomineeName,@NomineeAddress,@NomineeRelation,@NomineeDOB,@IsActive
		WHILE @@FETCH_STATUS = 0  
		BEGIN    
			SET @EmployeeCode =(Select dbo.VoucherCreation('EM',Isnull((SELECT Max(Id) FROM  rtl.EmployeeMaster  ),0)))
 
		 INSERT INTO [RTL].[EmployeeMaster] ( 
			EmployeeCode,EmployeeName,EmployeeDesignation,EmployeeDepartment,Father_Husband_Name,Gendar,MaritalStatus,DateOfBirth
			,PresentAddress,PermanemtAddress,AdharCardNumber,PANNumber,MobileNumber	,AlternativeMobileNumber,EmployeeEmailID
			,BankAccountNumber,BankIFSCCode,PreviousUAN,PreviousESI,GrossSalary,DOJ,NomineeName,NomineeAddress,NomineeRelation,NomineeDOB,IsActive
			)
		VALUES ( 
			@EmployeeCode,@EmployeeName,@EmployeeDesignation,@EmployeeDepartment,@Father_Husband_Name,@Gendar,@MaritalStatus,@DateOfBirth
			,@PresentAddress,@PermanemtAddress,@AdharCardNumber,@PANNumber,@MobileNumber	,@AlternativeMobileNumber,@EmployeeEmailID
			,@BankAccountNumber,@BankIFSCCode,@PreviousUAN,@PreviousESI,@GrossSalary,@DOJ,@NomineeName,@NomineeAddress,@NomineeRelation,@NomineeDOB,@IsActive
			)

			FETCH NEXT FROM CursorI INTO @EmployeeName,@EmployeeDesignation,@EmployeeDepartment,@Father_Husband_Name,@Gendar,@MaritalStatus,@DateOfBirth
			,@PresentAddress,@PermanemtAddress,@AdharCardNumber,@PANNumber,@MobileNumber	,@AlternativeMobileNumber,@EmployeeEmailID
			,@BankAccountNumber,@BankIFSCCode,@PreviousUAN,@PreviousESI,@GrossSalary,@DOJ,@NomineeName,@NomineeAddress,@NomineeRelation,@NomineeDOB,@IsActive
			
			 
			END  
			CLOSE CursorI  
			DEALLOCATE CursorI  
			FETCH NEXT FROM CursorMaster INTO  @EmployeeMasterlList
			END  
			CLOSE CursorMaster  
			DEALLOCATE CursorMaster  
				SET @RESULT = 'Save Successfully '; 
		  End

		  if(@Action='11')
		  Begin 
		  print @Id
		  if exists(select 1  FROM RTL.TransferLog   where  EmployeeCode=@Id)
		  Begin
		  	SELECT TL.Id,EmployeeCode,TL.StoreCode,format(StartDate,'dd/MM/yyyy')StartDate,format(Enddate,'dd/MM/yyyy') EndDate,SM.StoreCode UnitCode  FROM RTL.TransferLog TL
				INNER JOIN RTL.StoreMaster SM ON SM.Id=TL.StoreCode
			WHERE EmployeeCode=@Id ORDER BY ID  ASC
		  End
		  else
		  Begin
		   insert into  RTL.TransferLog(EmployeeCode,StoreCode,StartDate)
		    select em.Id, StoreCode,CreatedOn from [RTL].[EmployeeMaster] EM where 
		   Id=@Id
		   SELECT TL.Id,EmployeeCode,TL.StoreCode,format(StartDate,'dd/MM/yyyy')StartDate,format(Enddate,'dd/MM/yyyy') EndDate,SM.StoreCode UnitCode  FROM RTL.TransferLog TL
				INNER JOIN RTL.StoreMaster SM ON SM.Id=TL.StoreCode
			WHERE EmployeeCode=@Id 
		  End
			 
		
		  End
		  if(@Action='12')
		  Begin 
				SELECT SM.StoreCode, convert(varchar,COUNT(*))+'  Employee' TotalEmployee ,SM.Id
				FROM rtl.EmployeeMaster EM INNER JOIN 
				RTL.StoreMaster SM ON SM.ID=EM.StoreCode
				where EM.Id <> NUll or EM.Id !=''
				GROUP BY SM.StoreCode ,SM.Id
		  End
		   if(@Action='13')
		  Begin 
		  print   @Id
		        set @Id= isnull(@Id,'-1')
				IF(@Id='0')
				Begin
				SET @Id='-1'
				End 
				print   @Id
				SELECT SM.StoreCode, convert(varchar,COUNT(*))+'  Employee' TotalEmployee, SM.Id
				FROM rtl.EmployeeMaster EM INNER JOIN 
				RTL.StoreMaster SM ON SM.ID=EM.StoreCode
				where EM.Id <> NUll or EM.Id !='' AND
				@Id = case when @Id='-1'   then @Id else SM.StoreCode end 
				GROUP BY  SM.StoreCode , SM.Id
		  End
		  if(@Action='14') 
		 Begin  
				IF not EXISTS (SELECT 1 FROM  RTL.EmployeeMaster WHERE StoreCode=@Id AND  Id=@UserId)
				Begin
				update RTL.EmployeeMaster SET StoreCode=@Id
				WHERE Id=@UserId
				-------------------------------------UPDATE EMPLOYEE
				UPDATE  RTL.TransferLog  SET EndDate=GETDATE()
				WHERE ID=(
				SELECT   Max (Id) FROM RTL.TransferLog WHERE EmployeeCode=@UserId   )
				-------------------------------------UPDATE LAST ROW TRANSFER
				insert into  RTL.TransferLog(EmployeeCode,StoreCode,StartDate)
				VALUES(@UserId,@Id,GETDATE())
				-------------------------------------INTER NEW ROW   
				select 'Transfer Successfully'  Msg
				End	
				else
				Begin
				select 'Already Transfered 'Msg; 
				End
				End
     End 
	 if(@Action=15)
	Begin
	    SELECT LoginId,UserName Name FROM LoginTable 
		WHERE MAPID=@Id 
		AND LoginId NOT IN (select executerId from rtl.AssignExecuter where PartyId=@Id)
	END
  
