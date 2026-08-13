 
app.VendorInvoiceController = function ($scope, $element, $filter, myService, $http) {
    $scope.SetFocus('#txtVendorInvNum');
    $('#ddlfyid').attr('style', 'display:block');
    $('#txtfyid').attr('style', 'display:none');
    $scope.Session = new Date().getFullYear();
    $scope.TodayDate = new Date();
    $scope.disableDelete = true;
    $scope.IsHide = false;
    $scope.freeze = false;
    $scope.AuditApproveDate = new Date(); 
    $scope.DocumentList = [];
    $scope.Isopen = false;
    $scope.IsLocation = true;
    $scope.hideIsLocation = false;
    $scope.IWITHStatus = false;




    $scope.SetTextbox = function (SINVOICENO, ClientId, VendorCId)
    {

        $scope.InvoiceNo = SINVOICENO;
        $scope.ClientId = ClientId;
        $scope.VendorCId = VendorCId;
        $scope.Isopen = false;
    }

    $scope.CHKPermissionForInvoice = function () {
        var collectionobj = {};
        collectionobj.Action = 7; 
        collectionobj.VendorId = LoginId;
        var getData = myService.methode('POST', ("../ClientActMapping/SearchClientActMapping"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.PERBTN = response.data.Result[0].PERBTN;
            if( $scope.PERBTN=='1')
            {
                $('#ISVENOPEN').attr('style', 'display:block');
                $('#ISWVENOPEN').attr('style', 'display:none');
            }
            else if ($scope.PERBTN == '2')
            {
                $('#ISVENOPEN').attr('style', 'display:none');
                $('#ISWVENOPEN').attr('style', 'display:block');
            }
            else if ($scope.PERBTN == '3')
            {
                $('#ISVENOPEN').attr('style', 'display:block');
                $('#ISWVENOPEN').attr('style', 'display:block');
            }
            else {
                $('#ISVENOPEN').attr('style', 'display:none');
                $('#ISWVENOPEN').attr('style', 'display:none');
            }
        });
    }


    $scope.AllPartySiteLoadWI = function () {
        var collectionobj = {};
        collectionobj.ActionType = 17;
        collectionobj.PartyID = $scope.ClientId;
        collectionobj.StateId = $scope.StateId;
        collectionobj.CreatedBy = MapId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data;
        });
    }
   
    $scope.IsopenClose=function()
    {
        $scope.Isopen = false;
    }
    $scope.SearchInvoice =function()
    {
        var collectionobj = {};
        collectionobj.Action = 38;
        collectionobj.Updatedby = MapId;
        collectionobj.Id = $scope.InvoiceNo;
        collectionobj.AuditorId = $scope.ClientId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.ListOfInvoice = response.data
                $scope.Isopen = true;
            }
            else {
                $scope.ListOfInvoice = 'No Record Found';
            }

        });
    }

    $scope.BindClient= function () {
        var collectionobj = {};
        collectionobj.Action = 33;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.ClientList = response.data
            }

        });
    };

    $scope.ChangeInvoice=function()
    {
        if ($scope.TypeInvoice == "WithoutInvoice") { 
            $scope.IWITHStatus = false;
        }
        else {
            $scope.IWITHStatus = true;
        }
        

    }

    $scope.BindStatusInvoice = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.VendorId = MapId;
        var getData = myService.methode('POST', "../ClientActMapping/SearchClientActMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) { 
                if (response.data.Result[0].IStatus == 1)
                {
                    $scope.IWITHStatus = true;
                    $scope.TypeInvoice = "WithoutInvoice";
                }
                else
               {
                    $scope.IWITHStatus = false;
                    $scope.TypeInvoice = "Invoice";
                }
            }

        });
    };

    $scope.SetSingleLocation = function (WClientSiteId) {

        $scope.IsLocation = true;
        $scope.hideIsLocation = false;
        $scope.$applyAsync();
        var collectionobj = {};
        collectionobj.ActionType = 30;
        collectionobj.PartyId = WClientSiteId;
        collectionobj.CreatedBy = MapId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.LocationL = response.data.Result;
        });
    }

    $scope.ValidateWithoutInvoice = function ()
    {
        if ($scope.ClientId == "" || $scope.ClientId==undefined) {
            showMsgBox('999', 'Warning', 'Please Select Client', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.StateId == "" || $scope.StateId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select State', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.FyId == "" || $scope.FyId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Financial Year', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.Month == "" || $scope.Month == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Month', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.WClientSiteId == "" || $scope.WClientSiteId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Client Site', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.WLocation == "" || $scope.WLocation == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Location', 'warning', 'btn-warning')
            return;
        }
        else
        {
            if (isValidate()) {
                $scope.SAVEWithoutInvoice();
            }
        }


    }

    $scope.WIBindMonth = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.VendorId = MapId;
        var getData = myService.methode('POST', ("../ClientActMapping/SearchClientActMapping"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.WIMonthList = response.data.Result;
        });
    }

    $scope.WIBindFinacialYear = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.VendorId = MapId;
        var getData = myService.methode('POST', ("../ClientActMapping/SearchClientActMapping"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.WIfinacialyearList = response.data.Result;
        });
        
    }

    $scope.SAVEWithoutInvoice = function () {

        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.StateID = $scope.StateId;
        collectionobj.FYID = $scope.FyId;
        collectionobj.Month = $scope.Month;
        collectionobj.CreatedBy = LoginId;
        collectionobj.TypeInvoice = $scope.TypeInvoice;
        collectionobj.ClientSiteId = $scope.WClientSiteId;
        collectionobj.Location = $scope.WLocation;
        collectionobj.ActionType = 11;
        var getData = myService.methode('POST', "../VenInvoice/InsertUpdateDelWithoutVenInvoice", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            let text = response.data.Result;
            const invno = text.split("|");
            if (invno == "Already Exists this Mapping")
            {
                showMsgBox('999', 'Alert', response.data.Result, 'warning', 'btn-warning');
            }
            else{
                showMsgBox('999', 'Alert', "Save Successfully New Unique No."+ response.data.Result, 'warning', 'btn-warning');
                $scope.FireEmail(14, invno[0], $scope.ClientId);
                setTimeout(document.location.href = "../Communication/vCommunication", 3000);

            }
          
        });
    }
    $scope.BindAuditor = function () {
        var collectionobj = {};
        collectionobj.Action = 34;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AuditorList = response.data
            }

        });
    };
    $scope.BindInvoiceNo = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 4 });
        getData.then(function (response) {
            debugger;
            $scope.VendorInvNum = response.data[0].InvoiceNo;
        });
    }
    $scope.BindInvoiceStatus = function () {
        var collectionobj = {};
        collectionobj.Action = 18;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AllDraftCount = response.data[0].Draft;
                $scope.AllPendingCount = response.data[0].Pending;
                $scope.AllCompleteCount = response.data[0].Complete;
                $scope.AllDraftAmount = response.data[0].DraftAmount;
                $scope.AllPendingAmount = response.data[0].PendingAmount;
                $scope.AllCompleteAmount = response.data[0].CompleteAmount;
                $scope.ValidCount = response.data[0].ValidCount;
                $scope.ValidAmount = response.data[0].ValidAmount;
            }
            else
            {
                $scope.AllDraftCount = '0';
                $scope.AllPendingCount = '0';
                $scope.AllCompleteCount = '0';
                $scope.AllDraftAmount = '0';
                $scope.AllPendingAmount = '0';
                $scope.AllCompleteAmount = '0';
                $scope.ValidCount = '0';
                $scope.ValidAmount = '0';
            }

        });
    };
    $scope.Bindrating = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.UserId = MapId;
        var getData = myService.methode('POST', ("../rating/searchrating"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.length > 0) {
                $scope.rating = response.data[0].Rating ;
                $scope.certificate = response.data[0].Certificate ;
            }
        });
    }
    $scope.HighlightsExpire = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../rating/searchrating"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.length > 0) {
                $scope.ListOnetimeDocument = response.data;
                
            }
        });
    }
    


    $scope.ValidateINvoice = function(index)
    {
        var collectionobj = {};
        collectionobj.ActionType = 9;
        const FORMAT = "DD-MM-YYYY";
        collectionobj.InvDate = moment($scope.InvoiceDetail[index].InvDate).format(FORMAT);
        collectionobj.VendorInvNum = $scope.InvoiceDetail[index].VendorInvNum;
        collectionobj.VendorId =  LoginId;
        var getData = myService.methode('POST', ("../VenInvoice/GetValidateInvoice"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.length > 0)
            {
                if (response.data[0].Msg == '-1') {
                    showMsgBox('999', 'Duplicate Record', 'Found Duplicate Invoice', 'warning', 'btn-warning');
                    $scope.InvoiceDetail[index].VendorInvNum = '';
                }
            }
           
            
        });

    }

    $scope.BindManpower = function ()
    {
        var collectionobj = {};
        collectionobj.ActionType = 10; 
        var getData = myService.methode('POST', ("../VenInvoice/GetValidateInvoice"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.ManpowerList = response.data;

        });
    }
    $scope.BindSGSTTax=function(index)
    {
        if (parseInt($scope.InvoiceDetail[index].CGST) > 0) {
            $scope.InvoiceDetail[index].SGST = $scope.InvoiceDetail[index].CGST;
            $scope.InvoiceDetail[index].IGST = 0;
        //    var GrossAmount = parseInt($scope.InvoiceDetail[index].TaxableValue) * parseInt($scope.InvoiceDetail[index].SGST) * 2;
            $scope.InvoiceDetail[index].GrossAmount = parseInt($scope.InvoiceDetail[index].TaxableValue) + parseInt($scope.InvoiceDetail[index].SGST) * 2
            $scope.InvoiceDetail[index].GrossAmount = $scope.ConvertAmountToDecimalPoint($scope.InvoiceDetail[index].GrossAmount);
        }
    }
    $scope.BindIGSTTax = function (index) {
        if(parseInt($scope.InvoiceDetail[index].IGST)>0)
        {
            $scope.InvoiceDetail[index].SGST = 0;
            $scope.InvoiceDetail[index].CGST=0; 
            //var GrossAmount = parseInt($scope.InvoiceDetail[index].TaxableValue) * parseInt($scope.InvoiceDetail[index].IGST);
            $scope.InvoiceDetail[index].GrossAmount = parseInt($scope.InvoiceDetail[index].TaxableValue) + parseInt($scope.InvoiceDetail[index].IGST);
            $scope.InvoiceDetail[index].GrossAmount = $scope.ConvertAmountToDecimalPoint($scope.InvoiceDetail[index].GrossAmount);

        }
       

    }
   
    $scope.AllState = function () {
        $scope.CountryId = 1;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": $scope.CountryId });
        //var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetStateList"), { "ActionType": 28, "CountryId": $scope.CountryId });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }


    $scope.StateBind = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.UserId = $scope.ClientId;
        var getData = myService.methode('POST', ("../rating/searchrating"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data;
        });
    }

    $scope.InvoiceDetail = [];
    $scope.AddInvoiceDetail = function () {
        $scope.InvoiceDetail.push({
            Srno : "",
            FyId: "",
            Client: "", 
            ClientSite : "",
            InvDate: "",
            VendorInvNum : "",
            StateId: "", 
            Location: "",
            Manpowertype:"",
            ManpowerCount: "", 
            InvoiceType: "",
            TaxableValue: "",
            CGST: "", 
            SGST: "",
            IGST: "", 
            GrossAmount : "",
            VendorId: "",
            VendorSiteId: "",
            fileupload: "",
            Status: "",
            Ishide: true,
            IsFile: ""
           
        });
        var $index = $scope.InvoiceDetail.length - 1;
        setTimeout(function () {
            $('#txtSrno' + $index).focus();
        }, 500);
    };
    $scope.RemoveInvoiceDetail = function (index) {
        $scope.InvoiceDetail.splice(index, 1)
    };
    $scope.UpInvoiceDetail = function (index) {
        x = index, y = index - 1;
        var obj = $scope.Sauda_Detail[x];
        $scope.InvoiceDetail[x] = $scope.InvoiceDetail.splice(y, 1, obj)[0];
    };
    $scope.DownInvoiceDetail  = function (index) {
        x = index;
        if (index == $scope.InvoiceDetail.length - 1)
            y = 0;
        else
            y = index + 1;
        var obj = $scope.InvoiceDetail[x];
        $scope.InvoiceDetail[x] = $scope.InvoiceDetail.splice(y, 1, obj)[0];
    };
    $scope.BindIn = function (FyId)
    {
        $scope.FyId = FyId;
        $scope.Month = "";
        $scope.dateList = [];
        $scope.dateList = $filter('filter')($scope.finacialyearList, { 'FinancialName': FyId });
        $scope.StartDate = $scope.dateList[0].startdate;
        $scope.EndDate = $scope.dateList[0].enddate;
        var StartDate = $scope.dateList[0].startdate;
        var EndDate = $scope.dateList[0].enddate;
        $scope.Flag = $scope.dateList[0].Flag;
        if ($scope.Flag == 'F')
        {
            $scope.Month = '3';
        }
        $scope.$applyAsync();
       
    }
  
    $scope.ChangeMonth = function () {
        var collectionobj = {};
        collectionobj.ActionType = 8;
        collectionobj.StartDate = ConverttoDate($scope.StartDate);
        collectionobj.EndDate = ConverttoDate($scope.EndDate);
        collectionobj.Month = $scope.Month;
        collectionobj.FYID = $scope.FyId;
        debugger;
        var getData = myService.methode('POST', ("../VenInvoice/SetINVOICEDATE"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.StartDate = response.data[0].StartDate;
            $scope.EndDate = response.data[0].EndDate;
            $scope.$applyAsync();
        });
    }
    $scope.BindFinacialYear = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 6 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data;
        });
    }
    $scope.BindMonth = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 7 });
        getData.then(function (response) {
            debugger;
            $scope.MonthList = response.data;
        });
    }
    var Index = '';
    $scope.fileuploadClick = function (fuControlId, name) {
        $scope.Index = name;
        $(fuCandidatePhoto).click();
    }
    $scope.SetValue = function (ID, fuCandidatePhoto)
    {
        Index = ID;
        $(fuCandidatePhoto).click();
    }
    $scope.show = function (input, imgfileid) {
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.InvoiceDetail[Index].fileupload = e.target.result;
                $scope.InvoiceDetail[Index].IsFile='Attached Invoice'
                $scope.$applyAsync();
                $(imgfileid).attr('src', e.target.result);
                $(imgfileid).attr('value', e.target.result);
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync();
            $(imgfileid).attr('src', '');
            $(imgfileid).attr('value', '');
        }
    };
 
     
    $scope.BindDashBoardInvoice = function () {
        var collectionobj = {};
        collectionobj.ActionType = 16;
        collectionobj.CreatedBy = MapId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.DashBoardInvoice = response.data;
        });
    }
    
    $scope.BindAllDocument = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        var getData = myService.methode('POST', "../DocumentMaster/GetDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllDocument = response.data;
        });
    }
    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 9;
        collectionobj.PartyID = $scope.ClientId;
        collectionobj.StateId = $scope.StateId;
        collectionobj.CreatedBy = MapId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data;
        });
    }

    $scope.AllParty = function () {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.PartyId = LoginId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj)); 
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;;
        });
    }
    //$scope.AllPartySiteV = function (index) {
    //    var getData = myService.methode('POST', (APIURLPath + "SiteManager/GetSiteManagerListDT"), { "ActionType": 5, "PartyId": $scope.InvoiceDetail[index].VendorId });
    //    getData.then(function (response) {
    //        debugger;
    //        $scope.AllPartySiteVList = response.data;
    //    });
    //}
    $scope.AllPartySiteA = function () {
        var getData = myService.methode('POST', ("../SiteManager/GetSiteManagerListDT"), { "ActionType": 5, "PartyId": $scope.AuditId });
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteAList = response.data.Result;
        });
    }
    $scope.AllPartySiteC = function () {
        var getData = myService.methode('POST', ("../SiteManager/GetSiteManagerListDT"), { "ActionType": 5, "PartyId": $scope.ClientId });
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList = response.data.Result;
        });
    }

    $scope.HideShowtable=function()
    {
        if ($scope.ClientId == undefined || $scope.ClientId == "")  
        {
            showMsgBox('999', 'Warning', 'Please Select Client', 'warning', 'btn-warning')
            $scope.IsHide = false;
        }
    else if ($scope.StateId == undefined || $scope.StateId == "") 
        {
        showMsgBox('999', 'Warning', 'Please Select State', 'warning', 'btn-warning')
        $scope.IsHide = false;
    }
    else if ($scope.FyId == undefined || $scope.FyId == "") 
        {
        showMsgBox('999', 'Warning', 'Please Select financial year', 'warning', 'btn-warning')
        $scope.IsHide = false;
    }
    else if ($scope.Month == undefined || $scope.Month == "")  
        {
        showMsgBox('999', 'Warning', 'Please Select Month', 'warning', 'btn-warning')
        $scope.IsHide = false;
        }
    else {
            $scope.freeze = true;
            $scope.IsHide = true;
         
        }
    }
    $scope.ClearReset = function()
    {
        $scope.ClientId = "";
        $scope.StateId = "";
        $scope.FyId = "";
        $scope.Month = "";
        $scope.WClientSiteId = "";
        $scope.WLocation = ""; 
    }

    $scope.ClearHEADER=function()
    {
        $scope.freeze = false;
        $scope.IsHide = false;
        $scope.InvoiceDetail = [];
        $scope.AddInvoiceDetail();
    }
    
    $scope.ManPowerCount = "";
    $scope.ManPowerCount = "";
    $scope.LocationList = [];
    $scope.SetLocation = function (SiteId, index)
    {
        
        $scope.IsLocation = true;
        $scope.hideIsLocation = false;
        $scope.$applyAsync();
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.PartyId = SiteId;
        collectionobj.CreatedBy = MapId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) { 
            debugger;
            $scope.LocationList[index] = response.data.Result;
        });
    }
    $scope.SetState = function (index)
    {
        $scope.StateIdList = [];
        $scope.StateIdList = $filter('filter')($scope.AllPartySiteCList, { 'SiteId': $scope.InvoiceDetail[index].VendorSiteId });
        $scope.InvoiceDetail[index].StateId = $scope.StateId;//($scope.StateIdList[0].StateID).toString();
        $scope.ManPowerCount = ($scope.StateIdList[0].ManPowerCount).toString(); 
        $scope.$applyAsync();
    }
    $scope.chkManpower=function(index)
    {
        if ($scope.Manpowertype == $scope.InvoiceDetail[index].Manpowertype)
        {
            $('#ddlManpowertype' + index).css("background-color", "white");
        }
        else {
            $('#ddlManpowertype' + index).css("background-color", "red");
        }
        if ($scope.ManPowerCount == $scope.InvoiceDetail[index].ManpowerCount) {
            $('#txtManpowerCount' + index).css("background-color", "white");
        }
        else {
            $('#txtManpowerCount' + index).css("background-color", "red");
        } 

    }
    $scope.SaveRecord = function ()
    {

        for (var i = 0; i < $scope.InvoiceDetail.length; i++)
        {
            $scope.InvoiceDetail[i].StateId = $scope.StateId;
            if($scope.InvoiceDetail[i].fileupload=='')
            {
                showMsgBox('999', 'Invoice Require', 'Please Attact Invoice Document Copy in ' + $scope.InvoiceDetail[i].Srno + ' row or Invoice No :' + $scope.InvoiceDetail[i].VendorInvNum, 'warning', 'btn-warning')
                return;
            }
            else if ($scope.InvoiceDetail[i].InvDate == '' || $scope.InvoiceDetail[i].InvDate == 'Invalid date' || $scope.InvoiceDetail[i].InvDate == null || $scope.InvoiceDetail[i].InvDate == undefined) {
                showMsgBox('999', 'Invoice Require', 'Please Add Date in ' + $scope.InvoiceDetail[i].Srno + ' row or Invoice No :' + $scope.InvoiceDetail[i].VendorInvNum, 'warning', 'btn-warning')
                return;
            }
          else if ($scope.InvoiceDetail[i].VendorInvNum.match(/\s/g))
            {
              showMsgBox('999', 'Invoice Require', 'Invoice Number not Allowed space, check row  ' + $scope.InvoiceDetail[i].Srno + '', 'warning', 'btn-warning')
               return;
            }
            else {
                $scope.InvoiceDetail[i].InvDate = moment($scope.InvoiceDetail[i].InvDate, "DD-MMM-YYYY").format('YYYY-MM-DD');
            }
        }
         $scope.SaveAfterValidate();
    }

    $scope.SaveAfterValidate = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
         
            collectionobj.ClientId = $scope.ClientId;
            collectionobj.ClientSiteId = 'NA';
            collectionobj.VendorSiteId = LoginId;
            collectionobj.FYID = $scope.FyId;
            collectionobj.Month = $scope.Month;
            collectionobj.InvDate = $scope.InvDate;
            collectionobj.InvoiceDetail = $scope.InvoiceDetail;
            collectionobj.CreatedBy = LoginId; 
            collectionobj.InvoiceId = $scope.hfId;
            collectionobj.VendorId = LoginId;
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;

            }
            var getData = myService.methode('POST', "../VenInvoice/InsertUpdateDelVenInvoice", '{obj:' + JSON.stringify(collectionobj) + '}');
           
            getData.then(function (response)
            {
					  if (response.data.Result=='') {
                    showMsgBox('999', 'Alert', 'Something Went Wrong , please check Invoice no. , Client,Invoice Date', 'warning', 'btn-warning');
                }  else {
                showMsgBox('999', 'Alert','Save Successfully Batch No :'+ response.data.Result, 'warning', 'btn-warning')
                $scope.FireEmail(16, response.data.Result, $scope.ClientId);
                    $scope.ClearControl(1);
					}
               
            });
        }
    }







    $scope.fileuploadClick = function (fuControlId) {
        $(fuControlId).click();
    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.Delete);
    };
    $scope.Delete = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.VendorInvId = $scope.hfId;
            collectionobj.CreatedBy = LoginId;
            collectionobj.IsDeleted = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', "../VenInvoice/InsertUpdateDelVenInvoice", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    };
    $scope.ClearControl = function (flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
        }
    };

    $scope.ResetControl = function (flag) {
        debugger;
        $scope.IsHide = false;
        $scope.freeze = true;
        var date = new Date();
        var dt = moment(date).format('YYYY-MM-DD');
        $scope.Save = "Save";
        $scope.InvoiceDetail = [];
        $scope.AddInvoiceDetail();
        $scope.finacialyear = "";
        //$scope.StateId = "";
        //$scope.Month = "";
        $scope.CustomerId = "";
        $scope.CustomerSiteId = "";
        $scope.CustomerSiteId = "";
        $scope.ClientSiteId = "";
        //$scope.ClientId = "";
        //$scope.FyId = "";
        $scope.IsLocation = true;
        $scope.hideIsLocation = false;
        $scope.disableAdd = false;
        $scope.disableEdit = true;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $('#ddlfyid').attr('style', 'display:block');
        $('#txtfyid').attr('style', 'display:none');
        $scope.ServiceListMaster = [];
        if (flag == 0) {
            showMsgBox('4');
        }; 
    }
    $scope.VendorInvoiceList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.CreatedBy = LoginId;
        var getData = myService.methode('POST', "../VenInvoice/GetInvoiceList", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "InvoiceId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Batch No", "HeaderValue": "InvoiceId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Created On", "HeaderValue": "CreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Client", "HeaderValue": "ClientName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Site", "HeaderValue": "SiteName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Finacial Year", "HeaderValue": "FYName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                ];

            $scope.VendorInvoiceList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                $scope.IsHide = true;
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.VendorInvoiceList = $filter('filter')($scope.VendorInvoiceList, { 'InvoiceId': $scope.hfId });
                $scope.ClientId = $scope.VendorInvoiceList[0].ClientId;
                $scope.AllPartySiteC();
                setTimeout(function () {
                    $scope.ClientSiteId = $scope.VendorInvoiceList[0].ClientSiteId
                }, 500);
                $scope.hideIsLocation = true;
                $scope.IsLocation = false;
                $scope.$applyAsync();
                $scope.VendorSiteId = $scope.VendorInvoiceList[0].VendorSiteId
                $scope.FyId = $scope.VendorInvoiceList[0].FYName
                $scope.Month = $scope.VendorInvoiceList[0].Month
                $('#ddlfyid').attr('style', 'display:none');
                $('#txtfyid').attr('style', 'display:block');
                var collectionobj = {};
                collectionobj.ActionType = 6;
                collectionobj.InvoiceId = $scope.hfId
                var getData = myService.methode('POST', "../VenInvoice/GetInvoiceList", '{obj:' + JSON.stringify(collectionobj) + '}');
                getData.then(function (response) {
             
                    $scope.InvoiceDetail = response.data;
                    $scope.StateId = response.data[0].StateId;
                });


                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();
            });
        });
    };



    /*Refresh Search Table Record*/
    $(document).on("click", ".RefreshSearchTable", function (e) {
        debugger;
        var panelToRefresh = $(this).closest('.panel').find('.refresh-container');
        var dataToRefresh = $(this).closest('.panel').find('.panel-wrapper');
        var loadingAnim = panelToRefresh.find('.loading-progress');
        panelToRefresh.show();
        setTimeout(function () {
            loadingAnim.addClass('la-animate');
        }, 100);
        $scope.started();
        return false;
    });

    $scope.PrintRecord = function () {
        var tblheader =
            [
                  { "HeaderText": "Sr.No.", "Value": "InvoiceId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Batch No", "HeaderValue": "InvoiceId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Created On", "HeaderValue": "CreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Client", "HeaderValue": "ClientName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Site", "HeaderValue": "SiteName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Finacial Year", "HeaderValue": "FYName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            ];
        $scope.PrintMaster(tblheader, $scope.VendorInvoiceList, window.document.title);
    };



    //------------------------------------------------------Graph Bind
    $scope.BindGraphBehaveCA = function () {
        var AuditorId = $scope.AuditorId;
        var VendorId = $scope.VendorId;

        var collectionobj = {};
        collectionobj.Action = 18;
        collectionobj.Updatedby = MapId;
        collectionobj.AuditorId = $scope.AuditorId;
        collectionobj.VendorId = $scope.VendorId;

        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AllDraftCount = response.data[0].Draft;
                $scope.AllPendingCount = response.data[0].Pending;
                $scope.AllCompleteCount = response.data[0].Complete;
                $scope.AllDraftAmount = response.data[0].DraftAmount;
                $scope.AllPendingAmount = response.data[0].PendingAmount;
                $scope.AllCompleteAmount = response.data[0].CompleteAmount;
                $scope.ValidCount = response.data[0].ValidCount;
                $scope.ValidAmount = response.data[0].ValidAmount; 
                $scope.LoadGraph();

            }
            else {
                $scope.AllDraftCount = '0';
                $scope.AllPendingCount = '0';
                $scope.AllCompleteCount = '0';
                $scope.AllDraftAmount = '0';
                $scope.AllPendingAmount = '0';
                $scope.AllCompleteAmount = '0';
                $scope.ValidCount = '0';
                $scope.ValidAmount = '0';
            }

        });
    };
    $scope.LoadGraph = function () {
        var collectionobj = {};
        collectionobj.Action = 35;
        collectionobj.Updatedby = MapId;
        collectionobj.AuditorId = $scope.AuditorId;
        collectionobj.VendorId = $scope.VendorId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                var DraftPer = '0';
                var PendingPer = '0';
                var CompletePer = '0';
                var DraftPer = response.data[0].DraftPer;
                var PendingPer = response.data[0].PendingPer;
                var CompletePer = response.data[0].CompletePer;
                var ValidPer = response.data[0].ValidPer;
            }
            else {
                var DraftPer = '0';
                var PendingPer = '0';
                var CompletePer = '0';
                var ValidPer = '0';
            }
            var r = document.querySelector(':root');
            var rc = getComputedStyle(r);

            document.getElementById("g5").innerHTML = "";
            document.getElementById("g4").innerHTML = "";
            document.getElementById("g3").innerHTML = "";
            document.getElementById("g6").innerHTML = "";
            g5 = new JustGage({
                id: 'g5',
                value: CompletePer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: false,
                relativeGaugeSize: true

            });
            var g4 = new JustGage({
                id: 'g4',
                value: PendingPer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: true,
                relativeGaugeSize: true

            });
            var g3 = new JustGage({
                id: 'g3',
                value: DraftPer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: true,
                relativeGaugeSize: true

            });
            var g6 = new JustGage({
                id: 'g6',
                value: ValidPer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#efb150',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#efb150",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: true,
                relativeGaugeSize: true

            });

        });
    };

    //----------------------------------------------------------GraphEnd
 
}
 