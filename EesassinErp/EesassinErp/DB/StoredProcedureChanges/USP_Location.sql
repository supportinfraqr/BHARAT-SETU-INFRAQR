/****** Object:  StoredProcedure [dbo].[Usp_Location]    Script Date: 08-11-2024 15:03:52 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
 
ALTER PROCEDURE [dbo].[Usp_Location]
@Id int  =null,
@PartyId int=null,
@SiteId int=null,
@PartyType varchar(max) =NULL,
@Location varchar(max) =NULL,
@Createdby int=NULL,
@CreatedOn int=NULL,
@ActionType int=null,
@Result VARCHAR(50)=''  OUTPUT 
AS
BEGIN
	  if(@ActionType=1)
	 Begin
	      If not Exists(Select 1 from Location Where SiteId=@SiteId and Location=@Location and PartyId=@PartyId)
		  Begin
		   insert into Location(PartyId,	SiteId,	Location,	Createdby ,	CreatedOn)
		   values(@PartyId,	@SiteId,	@Location,	@Createdby ,	getdate())
		   Set @Result = '1'   
		  End
		  else
		  Begin 
		    Set @Result = 'Duplicate Same Site with Location found' 
		  End
	 End
	 if(@ActionType=2)
	 Begin
	  Update dbo.Location Set Location=@Location where Id=@Id
	   Set @Result = '2'
	 End
	   IF(@ActionType=3)
	 Begin
	       Delete from  Location Where Id=@Id
		   Set @Result='3'
	 End
	  IF(@ActionType=4)
	 Begin
	       Select   SiteName,PartyName,L.ID,convert(varchar,L.PartyId) PartyId,convert(varchar,L.SiteId)SiteId,Location from  Location  L 
		   inner join Evm.tbl_sitemanager SM ON SM.SITEID=L.SITEID
		     inner join Evm.tbl_partymaster PM ON PM.partyId=L.partyId
	 End
END
