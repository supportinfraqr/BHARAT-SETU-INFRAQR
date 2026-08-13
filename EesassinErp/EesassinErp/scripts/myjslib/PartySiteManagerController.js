app.PartySiteManagerController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtSiteName');
    $scope.ValidFrom = new Date();
    $scope.ValidTo = new Date();
    $scope.DISABLEFIELD = false;
    $scope.PartyType = 'Client'; 
    $('#btnSubmit').attr('style', 'display: none');
   
    $scope.activeTab = 1;
    $scope.goToTab = function (tab) {
        $scope.activeTab = tab;
    };

    $scope.nextTab = function () {
        if ($scope.activeTab < 8) {
            $scope.activeTab++;
        }
    };

    $scope.prevTab = function () {
        if ($scope.activeTab > 1) {
            $scope.activeTab--;
        }
    };

    $scope.BindClientSite = function () {
        var collectionobj = {};
        collectionobj.ActionType = 10;
        collectionobj.PartyID = $scope.PartyId;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList = response.data.Result;

        });
    }
    
    $scope.ClientDashboardSite = function () {
        var collectionobj = {};
        collectionobj.ActionType = 10;
        collectionobj.PartyID = MapId
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList = response.data.Result;
            //if ($scope.AllPartySiteCList && $scope.AllPartySiteCList.length > 0) {
            //    // Set SiteId to last item's SiteId
            //    $scope.SiteId = $scope.AllPartySiteCList[$scope.AllPartySiteCList.length - 1].SiteId.toString();
            //}
            //setTimeout(function () {
            //    $scope.$apply(function () {
                  
            //    });
            //}, 2000);
          

        });
    }
    //---------------------------------------------------------------------
 
    $scope.Adminshow = function (input, imgfileid) {
        if ($('#fuCandidatePhoto').val().split('.').pop().toLowerCase() == 'pdf')
        {
            if (input.files && input.files[0]) {
                var filerdr = new FileReader();
                filerdr.onload = function (e) {
                    $scope.AdminFileDoc = e.target.result;

                    $scope.$applyAsync();
                }
                filerdr.readAsDataURL(input.files[0]);
            }
            else {
                $scope.Image = '';
                $scope.$applyAsync();
            }
        }
        else {
            showMsgBox('999', 'Warning', 'Please Select only Pdf', 'warning', 'btn-warning');
            $('#fuCandidatePhoto').val('');
            return;
        }
      
    };
    $scope.Vendorshow = function (input, imgfileid) {

        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.VendorFileDoc = e.target.result;

                $scope.$applyAsync();
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync();
        }
    };
    $scope.AllParty = function () {
        $scope.showLoader();  
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 5, "PartyType": 'Client' });
        getData.then(function (response) {
            debugger;

            $scope.AllPartyList = response.data.Result;
            if (loginType == '4')
            {
                $scope.PartyId = MapId;
                $scope.BindClientSite();
                $scope.DISABLEFIELD = true;
                $scope.SetProjectManagement();
                $scope.Preload();
            }
            $scope.hideLoader();
        });
    }

    $scope.IsOpenPrint = function () {
        $('#btnSubmit').attr('style', 'display: block');
       
    }
    $scope.BindManpower = function () {
        var collectionobj = {};
        collectionobj.ActionType = 10;
        var getData = myService.methode('POST', ("../VenInvoice/GetValidateInvoice"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.ManpowerList = response.data;

        });
    }
    $scope.AllCountry = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 27 });
        getData.then(function (response) {
            debugger;
            $scope.AllCountryList = response.data.Result;
        });
    }
    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": $scope.CountryId });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }
    $scope.AllCity = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), {"ActionType": 29, "PartyId": $scope.StateId});
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data.Result;
        });
    }
    $scope.AllPincode = function () {
        $scope.showLoader();
        if ($("#txtpincode").val().length == 6)
        { 
            var getData = myService.methode('POST', (APIURLPath + "UserSubscription/GetPinCodeList"), { "ActionType": 30, "PinCode": $scope.Pincode });
            getData.then(function (responsest) {
                debugger;
                if (responsest.data.length > 0)
                {
                    $("#ddlcity").empty();
                    $("#ddlstate").empty();
                    $("#ddlcountry").val(1);
                    for (var i = 0; i < responsest.data.length; i++) {
                        if (responsest.data[i].ty == 1) {
                            $("#ddlcity").append('<option value="' + responsest.data[i].val + '">' + responsest.data[i].txt + '</option>');
                        } else if (responsest.data[i].ty == 2) {
                            $("#ddlstate").append('<option value="' + responsest.data[i].val + '">' + responsest.data[i].txt + '</option>');
                        }
                    }
                }
              
            });
        }
        else if($("#txtpincode").val().length == 0)
        {
              
         
            $scope.CountryId = "";
            $scope.StateId = ""; 
            $scope.CityId = "";
            $("#ddlcity").empty();
            $("#ddlstate").empty();
            $("#ddlstate").append('<option value="">Select State</option>');
            $("#ddlcity").append('<option value="">Select City</option>');
          
        }
        $scope.hideLoader();
    }
    $scope.PartyType = 'Client'
    $scope.Preload = function () { 
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.Id = $scope.SiteId;
        var getData = myService.methode('POST', ("../RetailSection/SearchPManagement"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.PartySiteMasterList = response.data.Result;
            if (response.data.Result.length > 0) {
             $scope.hfId = $scope.PartySiteMasterList[0].SiteId;
            $scope.SiteName = $scope.PartySiteMasterList[0].SiteName;
            $scope.Address = $scope.PartySiteMasterList[0].Address;
            $scope.Pincode = $scope.PartySiteMasterList[0].Pincode;
            $("#txtpincode").change();
            $scope.EmailId = $scope.PartySiteMasterList[0].EmailId;
            $scope.MobileNo = $scope.PartySiteMasterList[0].MobileNo;
            $scope.Description = $scope.PartySiteMasterList[0].Description;
            $scope.Panitno = $scope.PartySiteMasterList[0].PANITNO;
            $scope.Gstinuin = $scope.PartySiteMasterList[0].GSTINUIN;
            $scope.LocationCode = $scope.PartySiteMasterList[0].LocationCode; 
                $scope.CLRARC = $scope.PartySiteMasterList[0].CLRARC;

                if ($scope.PartySiteMasterList[0].CLRARC == 1) {
                    $scope.ddlCLRARC = 'Yes'
                }
                else { $scope.ddlCLRARC = 'No' }
              
            $scope.CLRLIC = $scope.PartySiteMasterList[0].CLRLIC;
            $scope.ContactPerson = $scope.PartySiteMasterList[0].ContactPerson;
            $scope.ContactMobile = $scope.PartySiteMasterList[0].ContactMobile;
            $scope.Descritpion = $scope.PartySiteMasterList[0].Descritpion;
            $scope.ValidFrom = new Date($scope.PartySiteMasterList[0].ValidFrom);
            $scope.ValidTo = new Date($scope.PartySiteMasterList[0].ValidTo);
            $scope.Manpowertype = $scope.PartySiteMasterList[0].Manpowertype;
            $scope.ManPowerCount = $scope.PartySiteMasterList[0].ManPowerCount; 
                $scope.AdminFileDoc = $scope.PartySiteMasterList[0].AdminFileDoc;

                $scope.CountryName = 'India';
                $scope.StateName = $scope.PartySiteMasterList[0].STATE_NM;
                $scope.CityName = $scope.PartySiteMasterList[0].CITY_NAME; 
                $scope.VendorFileDoc = $scope.PartySiteMasterList[0].VendorFileDoc;
                if ($scope.PartySiteMasterList && $scope.PartySiteMasterList.length > 0) {
                    $scope.CountryId = $scope.PartySiteMasterList[0].CountryID.toString();
                }
                $scope.AllState();
            setTimeout(function () {  
              
                $scope.StateId = $scope.PartySiteMasterList[0].StateID.toString(); 
                $scope.AllCity();
                $scope.CityId = $scope.PartySiteMasterList[0].CityID.toString();

              
               
            }, 1000);
        
            $scope.Save = "Edit";
            $scope.disableDelete = false;
            $scope.disableAdd = false;
                $scope.$apply();


            }
        });

    }

    $scope.SetProjectManagement = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.Id = $scope.SiteId;
        collectionobj.PartyId = MapId 
        var getData = myService.methode('POST', ("../RetailSection/SearchPManagement"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.Clear();
            if (response.data.Result.length == 0) { return;}
            $scope.ProjectManagementList = response.data.Result;
          /*  */
            $scope.ProjectName = response.data.Result[0].ProjectName;
            $scope.SizeCapacity = response.data.Result[0].SizeCapacity;
            $scope.GovtPrivate = response.data.Result[0].GovtPrivate;
            $scope.EndUserParty = response.data.Result[0].EndUserParty;
            $scope.CommissioningDate = new Date(response.data.Result[0].CommissioningDate);
            $scope.ExecutionDate = new Date(response.data.Result[0].ExecutionDate);  
            $scope.AggregatorFees = response.data.Result[0].AggregatorFees;
            $scope.ActualCost = response.data.Result[0].ActualCost;
            $scope.LandConversion = response.data.Result[0].LandConversion;
            $scope.RegistryValue = response.data.Result[0].RegistryValue;
            $scope.Variance = response.data.Result[0].Variance;
            $scope.MortgageProperty = response.data.Result[0].MortgageProperty;
            $scope.Miscellaenous = response.data.Result[0].Miscellaenous;
            $scope.CreatedBy = response.data.Result[0].CreatedBy;

            $scope.LoanAgreements = response.data.Result[0].LoanAgreements;
            $scope.MortgageAmount = response.data.Result[0].MortgageAmount;
            $scope.TechFeasibilityStatus = response.data.Result[0].TechFeasibilityStatus;
            $scope.TechPersonName = response.data.Result[0].TechPersonName;
            $scope.GridDistance = response.data.Result[0].GridDistance;
            $scope.GridConnectivity = response.data.Result[0].GridConnectivity;
            $scope.RightOfWayDistance = response.data.Result[0].RightOfWayDistance;
            $scope.RightOfWayFeasibility = response.data.Result[0].RightOfWayFeasibility;
            $scope.ROWPersonName = response.data.Result[0].ROWPersonName;
            $scope.AccessRoad = response.data.Result[0].AccessRoad;
            $scope.VerifierName = response.data.Result[0].VerifierName;
            $scope.SupportingDocsAttached = response.data.Result[0].SupportingDocsAttached;
            $scope.RoadConstructionStatus = response.data.Result[0].RoadConstructionStatus;
            $scope.RoadCompletionDate = response.data.Result[0].RoadCompletionDate;
            $scope.AdditionalDetails = response.data.Result[0].AdditionalDetails;

            $scope.FarmerName = response.data.Result[0].FarmerName;
            $scope.KhatedarName = response.data.Result[0].KhatedarName;
            $scope.Village = response.data.Result[0].Village;
            $scope.KhasraNo = response.data.Result[0].KhasraNo;
            $scope.KhatauliNo = response.data.Result[0].KhatauliNo;
            $scope.AreaAcre = response.data.Result[0].AreaAcre;
            $scope.AreaBigah = response.data.Result[0].AreaBigah;
            $scope.LandCharge = response.data.Result[0].LandCharge;
            $scope.ChargeAmount = response.data.Result[0].ChargeAmount;
            $scope.ChargeTenure = response.data.Result[0].ChargeTenure;
            $scope.ChargeholderName = response.data.Result[0].ChargeholderName;
            $scope.LandStatus = response.data.Result[0].LandStatus;
            $scope.LandType = response.data.Result[0].LandType;

            $scope.RatePerAcre = response.data.Result[0].RatePerAcre;
            $scope.TotalLandCost = response.data.Result[0].TotalLandCost;
            $scope.AdvancePaid = response.data.Result[0].AdvancePaid;
            $scope.LeaseValue = response.data.Result[0].LeaseValue;
            $scope.LeaseDuration = response.data.Result[0].LeaseDuration;
            $scope.LeaseEscalation = response.data.Result[0].LeaseEscalation;
            $scope.ApplicableTDS = response.data.Result[0].ApplicableTDS;
            $scope.SecurityChequeNo = response.data.Result[0].SecurityChequeNo;
            $scope.SecurityChequeAmount = response.data.Result[0].SecurityChequeAmount;
            $scope.TotalAdvanceToFarmers = response.data.Result[0].TotalAdvanceToFarmers;
            $scope.TotalPaymentToFarmers = response.data.Result[0].TotalPaymentToFarmers;
       
            $('#txtPaymentDateToFarmers').val(response.data.Result[0].PaymentDateToFarmers);
            $scope.PaymentDateToFarmers = response.data.Result[0].PaymentDateToFarmers;
            $scope.RegistrationCharges = response.data.Result[0].RegistrationCharges;
            $scope.StampDutyCharges = response.data.Result[0].StampDutyCharges;
            $scope.StampVendorPayment = response.data.Result[0].StampVendorPayment;
            $scope.MiscExpenses = response.data.Result[0].MiscExpenses;
            $scope.AdvocateFee = response.data.Result[0].AdvocateFee;
            $scope.AdvocateName5 = response.data.Result[0].AdvocateName5;
            $scope.AdvocateName = response.data.Result[0].AdvocateName;
            $scope.TSRStatus = response.data.Result[0].TSRStatus;
            $scope.TSRConductedBy = response.data.Result[0].TSRConductedBy;
            $scope.TSRValidatedByLocalAdvocate = response.data.Result[0].TSRValidatedByLocalAdvocate;
            $scope.LocalAdvocateByAggregator = response.data.Result[0].LocalAdvocateByAggregator;
            $scope.LocalAdvocateByCompany = response.data.Result[0].LocalAdvocateByCompany;
            $scope.TSRFeesAggregator = response.data.Result[0].TSRFeesAggregator;
            $scope.TSRFeesCompany = response.data.Result[0].TSRFeesCompany; 
            $('#txtTSRPaymentDateAggregator').val(response.data.Result[0].TSRPaymentDateAggregator);

            $scope.TSRPaymentDateAggregator = response.data.Result[0].TSRPaymentDateAggregator;
            $('#txtTSRPaymentDateCompany').val(response.data.Result[0].TSRPaymentDateCompany);


            $scope.TSRPaymentDateCompany = response.data.Result[0].TSRPaymentDateCompany;

            $scope.TSRValidatedByInHouse = response.data.Result[0].TSRValidatedByInHouse;
            $scope.TSRValidatedInHousePerson = response.data.Result[0].TSRValidatedInHousePerson;
            $scope.DocumentsSubmittedToLegal = response.data.Result[0].DocumentsSubmittedToLegal;
         
            $('#txtTermSheetDateAggregator').val(response.data.Result[0].TermSheetDateAggregator);

            $scope.TermSheetDateAggregator = response.data.Result[0].TermSheetDateAggregator;
      
            $('#txtTermSheetDateOfftaker').val(response.data.Result[0].TermSheetDateOfftaker);

            $scope.TermSheetDateOfftaker = response.data.Result[0].TermSheetDateOfftaker;
            $scope.DocumentName = response.data.Result[0].DocumentName;
            $scope.DocumentSharingStatus = response.data.Result[0].DocumentSharingStatus;
            $scope.DocumentRemarks = response.data.Result[0].DocumentRemarks;
            $scope.DocumentSharingDate = new Date(response.data.Result[0].DocumentSharingDate);

            $('#txtDocumentSharingDate').val(response.data.Result[0].DocumentSharingDate);
            $scope.DocumentSharingMode = response.data.Result[0].DocumentSharingMode;
            $scope.UploadedFilesPaths1 = response.data.Result[0].UploadedFilesPaths1;
            $scope.UploadedFilesPaths2 = response.data.Result[0].UploadedFilesPaths2;
            $scope.UploadedFilesPaths3 = response.data.Result[0].UploadedFilesPaths3;
            $scope.UploadedFilesPaths4 = response.data.Result[0].UploadedFilesPaths4;
            $scope.UploadedFilesPaths5 = response.data.Result[0].UploadedFilesPaths5;
            $scope.UploadedFilesPaths6 = response.data.Result[0].UploadedFilesPaths6;
            $scope.UploadedFilesPaths7 = response.data.Result[0].UploadedFilesPaths7;
            $scope.UploadedFilesPaths8 = response.data.Result[0].UploadedFilesPaths8;
            $scope.UploadedFilesPaths9 = response.data.Result[0].UploadedFilesPaths9;
            $scope.UploadedFilesPaths10 = response.data.Result[0].UploadedFilesPaths10;
            $scope.TotalProjectCost = response.data.Result[0].TotalProjectCost;
            $scope.Debt = response.data.Result[0].Debt;
            $scope.ExecutionDateSSHA = new Date(response.data.Result[0].ExecutionDateSSHA);
            $scope.LegalEntityName = response.data.Result[0].LegalEntityName;
            $scope.EquityOffTaker = response.data.Result[0].EquityOffTaker;
            $scope.EquityOPL = response.data.Result[0].EquityOPL;
            $scope.ExecutionDatePPA = new Date(response.data.Result[0].ExecutionDatePPA);
            
        });
    }
    $scope.getFileIcon = function (filePath) {
        if (!filePath) return 'fas fa-file';
        var cleanPath = filePath.split('?')[0];
        var ext = cleanPath.split('.').pop().toLowerCase();

        switch (ext) {
            case 'pdf':
                return 'fas fa-file-pdf text-danger';
            case 'doc':
            case 'docx':
                return 'fas fa-file-word text-primary';
            case 'jpg':
            case 'jpeg':
            case 'png':
                return 'fas fa-file-image text-success';
            default:
                return 'fas fa-file';
        }
    };

    $scope.getFileName = function (filePath) {
        if (!filePath) return '';
        var cleanPath = filePath.split('?')[0];
        return cleanPath.split('/').pop();
    };

    $scope.Clear = function () {

        $scope.ProjectName = '';
        $scope.SizeCapacity = '';
        $scope.GovtPrivate = '';
        $scope.EndUserParty = '';
        $scope.CommissioningDate = '';
        $scope.ExecutionDate = '';
        $scope.AggregatorFees = '';
        $scope.ActualCost = '';
        $scope.LandConversion = '';
        $scope.RegistryValue = '';
        $scope.Variance = '';
        $scope.MortgageProperty = '';
        $scope.Miscellaenous = '';
        $scope.CreatedBy = ''; 
        $scope.LoanAgreements = '';
        $scope.MortgageAmount = '';
        $scope.TechFeasibilityStatus = '';
        $scope.TechPersonName = '';
        $scope.GridDistance = '';
        $scope.GridConnectivity = '';
        $scope.RightOfWayDistance = '';
        $scope.RightOfWayFeasibility = '';
        $scope.ROWPersonName = '';
        $scope.AccessRoad = '';
        $scope.VerifierName = '';
        $scope.SupportingDocsAttached = '';
        $scope.RoadConstructionStatus = '';
        $scope.RoadCompletionDate = '';
        $scope.AdditionalDetails = '';
        $scope.FarmerName = '';
        $scope.KhatedarName = '';
        $scope.Village = '';
        $scope.KhasraNo = '';
        $scope.KhatauliNo = '';
        $scope.AreaAcre = '';
        $scope.AreaBigah = '';
        $scope.LandCharge = '';
        $scope.ChargeAmount = '';
        $scope.ChargeTenure = '';
        $scope.ChargeholderName = '';
        $scope.LandStatus = '';
        $scope.LandType = '';
        $scope.RatePerAcre = '';
        $scope.TotalLandCost = '';
        $scope.AdvancePaid = '';
        $scope.LeaseValue = '';
        $scope.LeaseDuration = '';
        $scope.LeaseEscalation = '';
        $scope.ApplicableTDS = '';
        $scope.SecurityChequeNo = '';
        $scope.SecurityChequeAmount = '';
        $scope.TotalAdvanceToFarmers = '';
        $scope.TotalPaymentToFarmers = '';
        $scope.PaymentDateToFarmers = '';
        $scope.RegistrationCharges = '';
        $scope.StampDutyCharges = '';
        $scope.StampVendorPayment = '';
        $scope.MiscExpenses = '';
        $scope.AdvocateFee = '';
        $scope.AdvocateName5 = '';
        $scope.TSRStatus = '';
        $scope.TSRConductedBy = '';
        $scope.TSRValidatedByLocalAdvocate = '';
        $scope.AdvocateName = '';
        $scope.LocalAdvocateByAggregator = '';
        $scope.LocalAdvocateByCompany = '';
        $scope.TSRFeesAggregator = '';
        $scope.TSRFeesCompany = '';
        $scope.TSRPaymentDateAggregator = '';
        $scope.TSRPaymentDateCompany = '';
        $scope.TSRValidatedByInHouse = '';
        $scope.TSRValidatedInHousePerson = '';
        $scope.DocumentsSubmittedToLegal = '';
        $scope.TermSheetDateAggregator = '';
        $scope.TermSheetDateOfftaker = '';
        $scope.DocumentName = '';
        $scope.DocumentSharingStatus = '';
        $scope.DocumentRemarks  = '';
        $scope.DocumentSharingDate = '';
        $scope.DocumentSharingMode = '';
        $scope.UploadedFilesPaths1 = '';
        $scope.UploadedFilesPaths2 = '';
        $scope.UploadedFilesPaths3 = '';
        $scope.UploadedFilesPaths4 = '';
        $scope.UploadedFilesPaths5 = '';
        $scope.UploadedFilesPaths6 = '';
        $scope.UploadedFilesPaths7 = '';
        $scope.UploadedFilesPaths8 = '';
        $scope.UploadedFilesPaths9 = '';
        $scope.UploadedFilesPaths10 = '';
        $scope.TotalProjectCost =  '';
        $scope.Debt = '';
        $scope.ExecutionDateSSHA = '';
        $scope.LegalEntityName = '';
        $scope.EquityOffTaker  = '';
        $scope.EquityOPL  = '';
        $scope.ExecutionDatePPA = '';
        

    }
   
    $scope.SaveStep8 = function () {

        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.TotalProjectCost) {
            showMsgBox('999', 'Validation Error', 'Please enter Total Project Cost', 'warning', 'btn-warning');
            return;
        }
        $('#loader').show(); // Optional: show loading indicator

        var formData = new FormData();

        formData.append("TotalProjectCost", $scope.TotalProjectCost || '');
        formData.append("Debt", $scope.Debt || '');
        formData.append("EquityOPL", $scope.EquityOPL || '');
        formData.append("EquityOffTaker", $scope.EquityOffTaker || '');
        formData.append("LegalEntityName", $scope.LegalEntityName || '');
        formData.append("ExecutionDateSSHA", $('#txtExecutionDateSSHA').val()  || '');
        formData.append("ExecutionDatePPA", $('#txtExecutionDatePPA').val() || '');
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 8 || '');

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep8",
            type: 'POST',
            data: formData,
            contentType: false,      // Let browser set correct boundary
            processData: false,      // Prevent jQuery from transforming data
            success: function (response) {
                $scope.$apply(function () {
               
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                });
            },
            error: function (xhr, status, error) {
                alert("Error while saving financial data: " + error);
            },
            complete: function () {
                $('#loader').hide(); // Hide loader
            }
        });
    };




    $scope.SaveStep7 = function () {

        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }

        
        if (!$scope.DocumentName) {
            showMsgBox('999', 'Validation Error', 'Please enter Document Name', 'warning', 'btn-warning');
            return;
        }

        $('#loader').show(); // Optional: show loading indicator

        var formData = new FormData();

        // Append form field values
        formData.append("DocumentName", $scope.DocumentName || '');
        formData.append("DocumentSharingStatus", $scope.DocumentSharingStatus || '');
        formData.append("DocumentRemarks", $scope.DocumentRemarks || '');
        formData.append("DocumentSharingDate", $('#txtDocumentSharingDate').val() || '');
        formData.append("DocumentSharingMode", $scope.DocumentSharingMode || '');
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 7 || '');

        // Append up to 10 uploaded files
        for (let i = 1; i <= 10; i++) {
            var file = $scope['Upload' + i];
            if (file) {
                formData.append('Upload' + i, file);
            }
        }

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep7",
            type: 'POST',
            data: formData,
            contentType: false,       // Important: do not set content type
            processData: false,       // Important: prevents jQuery from processing FormData
            success: function (response) {
                $scope.$apply(function () {
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                });
            },
            error: function (xhr, status, error) {
                alert("Error while saving: " + error);
            },
            complete: function () {
                $('#loader').hide(); // Hide loading indicator
            }
        });
    };

    $scope.SaveStep6 = function () {
        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.TSRStatus) {
            showMsgBox('999', 'Validation Error', 'Please enter TSR Status', 'warning', 'btn-warning');
            return;
        }
        
        $('#loader').show(); // Show loader if needed

        var formData = new FormData();
        formData.append("TSRStatus", $scope.TSRStatus || '');
        formData.append("TSRConductedBy", $scope.TSRConductedBy || '');
        formData.append("TSRValidatedByLocalAdvocate", $scope.TSRValidatedByLocalAdvocate || '');
        formData.append("AdvocateName", $scope.AdvocateName || '');
        formData.append("LocalAdvocateByAggregator", $scope.LocalAdvocateByAggregator || '');
        formData.append("LocalAdvocateByCompany", $scope.LocalAdvocateByCompany || '');
        formData.append("TSRFeesAggregator", $scope.TSRFeesAggregator || '');
        formData.append("TSRFeesCompany", $scope.TSRFeesCompany || '');
        formData.append("TSRPaymentDateAggregator", $('#txtTSRPaymentDateAggregator').val()  || '');
        formData.append("TSRPaymentDateCompany", $('#txtTSRPaymentDateCompany').val()  || '');
        formData.append("TSRValidatedByInHouse", $scope.TSRValidatedByInHouse || '');
        formData.append("TSRValidatedInHousePerson", $scope.TSRValidatedInHousePerson || '');
        formData.append("DocumentsSubmittedToLegal", $scope.DocumentsSubmittedToLegal || '');
        formData.append("TermSheetDateAggregator", $('#txtTermSheetDateAggregator').val() || '');
        formData.append("TermSheetDateOfftaker", $('#txtTermSheetDateOfftaker').val()   || '');
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 6 || '');

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep6",
            type: "POST",
            data: formData,
            processData: false, // Required for FormData
            contentType: false, // Required for FormData
            success: function (resp) {
                $scope.$apply(function () {
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                });
            },
            error: function (xhr, status, err) {
                alert("An error occurred while saving legal details: " + err);
            },
            complete: function () {
                $('#loader').hide(); // Hide loader
            }
        });
    };


    $scope.SaveStep5 = function () {
        $('#loader').show(); // Show loading spinner

        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }

      
        var formData = new FormData();
        formData.append("RatePerAcre", $scope.RatePerAcre || '');
        formData.append("TotalLandCost", $scope.TotalLandCost || '');
        formData.append("AdvancePaid", $scope.AdvancePaid || '');
        formData.append("LeaseValue", $scope.LeaseValue || '');
        formData.append("LeaseDuration", $scope.LeaseDuration || '');
        formData.append("LeaseEscalation", $scope.LeaseEscalation || '');
        formData.append("ApplicableTDS", $scope.ApplicableTDS || '');
        formData.append("SecurityChequeNo", $scope.SecurityChequeNo || '');
        formData.append("SecurityChequeAmount", $scope.SecurityChequeAmount || '');
        formData.append("TotalAdvanceToFarmers", $scope.TotalAdvanceToFarmers || '');
        formData.append("TotalPaymentToFarmers", $scope.TotalPaymentToFarmers || '');
        formData.append("PaymentDateToFarmers", $('#txtPaymentDateToFarmers').val()   || '');
        formData.append("RegistrationCharges", $scope.RegistrationCharges || '');
        formData.append("StampDutyCharges", $scope.StampDutyCharges || '');
        formData.append("StampVendorPayment", $scope.StampVendorPayment || '');
        formData.append("MiscExpenses", $scope.MiscExpenses || '');
        formData.append("AdvocateFee", $scope.AdvocateFee || '');
        formData.append("AdvocateName5", $scope.AdvocateName5 || '');
        formData.append("CreatedBy", LoginId);
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 5 || '');

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep5",
            type: "POST",
            data: formData,
            processData: false,      // Do not process data
            contentType: false,      // Let browser set it to multipart/form-data
            success: function (resp) {
                $scope.$apply(function () {
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                });
            },
            error: function (xhr, status, error) {
                alert("Save failed: " + error);
            },
            complete: function () {
                $('#loader').hide(); // Hide loading spinner
            }
        });
    };

    $scope.SaveStep4 = function () {
      
        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.FarmerName) {
            showMsgBox('999', 'Validation Error', 'Please enter the Farmer Name.', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.KhatedarName) {
            showMsgBox('999', 'Validation Error', 'Please enter the Khatedar Name.', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.Village) {
            showMsgBox('999', 'Validation Error', 'Please enter the Village.', 'warning', 'btn-warning');
            return;
        }
        $('#loader').show(); // Show loader while saving

        var formData = new FormData();
        formData.append("FarmerName", $scope.FarmerName || '');
        formData.append("KhatedarName", $scope.KhatedarName || '');
        formData.append("Village", $scope.Village || '');
        formData.append("KhasraNo", $scope.KhasraNo || '');
        formData.append("KhatauliNo", $scope.KhatauliNo || '');
        formData.append("AreaAcre", $scope.AreaAcre || '');
        formData.append("AreaBigah", $scope.AreaBigah || '');
        formData.append("LandCharge", $scope.LandCharge || '');
        formData.append("ChargeAmount", $scope.ChargeAmount || '');
        formData.append("ChargeTenure", $scope.ChargeTenure || '');
        formData.append("ChargeholderName", $scope.ChargeholderName || '');
        formData.append("LandStatus", $scope.LandStatus || '');
        formData.append("LandType", $scope.LandType || '');
        formData.append("CreatedBy", LoginId);
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 4 || '');

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep4",
            type: "POST",
            data: formData,
            processData: false, // Important: prevent jQuery from processing data
            contentType: false, // Important: let browser set Content-Type header
            success: function (resp) {
                $scope.$apply(function () {
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                    // Optionally clear form or reload data here
                });
            },
            error: function (xhr, status, err) {
                alert("Save failed: " + err);
            },
            complete: function () {
                $('#loader').hide(); // Hide loader
            }
        });
    };



    $scope.SaveStep3 = function () {
     
        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.TechFeasibilityStatus) {
            showMsgBox('999', 'Validation Error', 'Please Select Technical feasibility check Status.', 'warning', 'btn-warning');
            return;
        }
        if ($scope.txtTechPerson=='') {
            showMsgBox('999', 'Validation Error', 'Please Select Person name for technical feasibility.', 'warning', 'btn-warning');
            return;
        }
      
       
        $('#loader').show();

        var formData = new FormData();
        formData.append("TechFeasibilityStatus", $scope.TechFeasibilityStatus);
        formData.append("TechPersonName", $scope.TechPersonName || '');
        formData.append("GridDistance", $scope.GridDistance || '');
        formData.append("GridConnectivity", $scope.GridConnectivity || '');
        formData.append("RightOfWayDistance", $scope.RightOfWayDistance || '');
        formData.append("RightOfWayFeasibility", $scope.RightOfWayFeasibility);
        formData.append("ROWPersonName", $scope.ROWPersonName || '');
        formData.append("AccessRoad", $scope.AccessRoad || '');
        formData.append("VerifierName", $scope.VerifierName || '');
        formData.append("SupportingDocsAttached", $scope.SupportingDocsAttached || '');
        formData.append("RoadConstructionStatus", $scope.RoadConstructionStatus || '');
        formData.append("RoadCompletionDate", $('#txtRoadCompletionDate').val() || '');
        formData.append("AdditionalDetails", $scope.AdditionalDetails || '');
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 3 || '');

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep3",
            type: "POST",
            data: formData,
            processData: false,        // Don't process data
            contentType: false,        // Let browser set Content-Type
            success: function (resp) {
                $scope.$apply(function () {
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                });
            },
            error: function (xhr, status, err) {
                alert("Save failed: " + err);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    };



    $scope.SaveStep2 = function () {
        if ($scope.PartyId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Party', 'warning', 'btn-warning');
            return;
        }
        if ($scope.SiteId == '') {
            showMsgBox('999', 'Validation Error', 'Please Select Site', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.ProjectName) {
            showMsgBox('999', 'Validation Error', 'Enter Project Name.', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.SizeCapacity) {
            showMsgBox('999', 'Validation Error', 'Enter Project Size and Capacity.', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.GovtPrivate) {
            showMsgBox('999', 'Validation Error', 'Select Project Ownership Type.', 'warning', 'btn-warning');
            return;
        }
       
        $('#loader').show();

        var formData = new FormData();
        formData.append("ProjectName", $scope.ProjectName || '');
        formData.append("SizeCapacity", $scope.SizeCapacity || '');
        formData.append("GovtPrivate", $scope.GovtPrivate || '');
        formData.append("EndUserParty", $scope.EndUserParty || '');
        formData.append("CommissioningDate", $('#txtCommissioningDate').val() || '');
        formData.append("ExecutionDate", $('#txtExecutionDate').val() || '');
        formData.append("AggregatorFees", $scope.AggregatorFees || '');
        formData.append("LandConversion", $scope.LandConversion || '');
        formData.append("ActualCost", $scope.ActualCost || '');
        formData.append("RegistryValue", $scope.RegistryValue || '');
        formData.append("Variance", $scope.Variance || '');
        formData.append("MortgageProperty", $scope.MortgageProperty || '');
        formData.append("LoanAgreements", $scope.LoanAgreements || '');
        formData.append("MortgageAmount", $scope.MortgageAmount || '');
        formData.append("Miscellaenous", $scope.Miscellaenous || '');
        formData.append("AnyOtherDetail", $scope.AnyOtherDetail || '');
        formData.append("CreatedBy", LoginId || '');
        formData.append("PartyId", $scope.PartyId || '');
        formData.append("Id", $scope.SiteId || '');
        formData.append("Action", 2); // Optional if used in backend

        $.ajax({
            url: "../RetailSection/ProjectDetailsStep2",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (resp) {
                $scope.$apply(function () {
                    $scope.SetProjectManagement();
                    showMsgBox('1');
                  
                });
            },
            error: function (xhr, status, err) {
                alert("Save failed: " + err);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    };


  


    $scope.SaveRecord= function ()
    {
        if($scope.CLRARC=='1')
        {
            if ($scope.AdminFileDoc == '' || $scope.AdminFileDoc == undefined)
            {
                showMsgBox('999', 'Warning', 'Please Select Attachment', 'warning', 'btn-warning');
                return;
            }
            else
            { 
                if ($scope.activeTab == '1') {
                    $scope.AfterSave();
                }
                else if ($scope.activeTab == '2') {
                    $scope.SaveStep2();
                }
                else if ($scope.activeTab == '3') {
                    $scope.SaveStep3();
                }
                else if ($scope.activeTab == '4') {
                    $scope.SaveStep4();
                }
                else if ($scope.activeTab == '5') {
                    $scope.SaveStep5();
                }
                else if ($scope.activeTab == '6') {
                    $scope.SaveStep6();
                }
                else if ($scope.activeTab == '7') {
                    $scope.SaveStep7();
                }
                else if ($scope.activeTab == '8') {
                    $scope.SaveStep8();
                }
                else { alert('else'); }
            }
        }
        else
        {
            if ($scope.activeTab == '1') {
                $scope.AfterSave();
            }
            else if ($scope.activeTab == '2') {
                $scope.SaveStep2();
            }
            else if ($scope.activeTab == '3') {
                $scope.SaveStep3();
            }
            else if ($scope.activeTab == '4') {
                $scope.SaveStep4();
            }
            else if ($scope.activeTab == '5') {
                $scope.SaveStep5();
            }
            else if ($scope.activeTab == '6') {
                $scope.SaveStep6();
            }
            else if ($scope.activeTab == '7') {
                $scope.SaveStep7();
            }
            else if ($scope.activeTab == '8') {
                $scope.SaveStep8();
            }
            else { alert('else'); }
        }
    }
    $scope.AfterSave = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.PartyId = $scope.PartyId;
            collectionobj.PartyType = $scope.PartyType;
            collectionobj.SiteId = $scope.hfId;
            collectionobj.SiteName = $scope.SiteName; 
            collectionobj.Address = $scope.Address;   
            collectionobj.LocationCode = $scope.LocationCode;
            collectionobj.EmailId = $scope.EmailId;
            collectionobj.ContactNo = $scope.MobileNo;
            collectionobj.BankDetails = $scope.BankDetails;
            collectionobj.AccountNo = $scope.AccountNo;
            collectionobj.Description = $scope.Description;
            collectionobj.Panitno = $scope.Panitno;
            collectionobj.Gstinuin = $scope.Gstinuin;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Pincode = $scope.Pincode; 
            collectionobj.CountryId = $("#ddlcountry").val();
            collectionobj.StateId = $("#ddlstate").val();
            collectionobj.CityId = $("#ddlcity").val();


            collectionobj.CLRARC = $scope.CLRARC;
            collectionobj.CLRLIC = $scope.CLRLIC;
            collectionobj.ContactPerson = $scope.ContactPerson;
            collectionobj.ContactMobile = $scope.ContactMobile;
            collectionobj.Descritpion = $scope.Descritpion;
            collectionobj.ValidFrom = $scope.ValidFrom;
            collectionobj.ValidTo = $scope.ValidTo;
            collectionobj.VendorFileDoc = $scope.VendorFileDoc;
            collectionobj.AdminFileDoc = $scope.AdminFileDoc;
            collectionobj.Manpowertype = $scope.Manpowertype;
            collectionobj.ManPowerCount = $scope.ManPowerCount; 



            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2; 
            }
            var getData = myService.methode('POST', ("../SiteManager/InsertUpdateDelSiteManager"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    /*   $scope.ClearControl(1);*/
                     
                }
            });
        } 
    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.SiteId = $scope.hfId;  
        collectionobj.PartyId = $scope.hfId1;  
        var getData = myService.methode('POST', ("../SiteManager/InsertUpdateDelSiteManager"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data)) {
                $scope.ClearControl(1);
            }
        });
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
        $scope.Save = "Save";
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.SiteName = ""; 
        $scope.Address = "";
        $scope.EmailId = "";
        $scope.MobileNo = "";
        $scope.Description = "";
        $scope.LocationCode = "";
        $scope.BankDetails = "";
        $scope.AccountNo = "";
        $scope.Panitno = "";
        $scope.Gstinuin = "";
        $scope.Pincode = "";
        $scope.CLRARC = "";
        $scope.CLRLIC = "";
        $scope.ContactPerson = "";
        $scope.ContactMobile = "";
        $scope.Descritpion = "";
        $scope.ValidFrom = "";
        $scope.ValidTo = "";
        $scope.Manpowertype = "";
        $scope.ManPowerCount = "";

        $scope.AdminFileDoc = "";
        $scope.VendorFileDoc = "";
        
        $("#txtpincode").val('');
      
        $scope.CountryId = "";
        $scope.StateId = "";
        $scope.CityId = "";
        $scope.SetFocus('#txtSiteName');
        $scope.hfId = 0;
        $scope.hfId1 = 0;
        $scope.PartyMasterList = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.PartyMasterList = []; 
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

  

    $scope.started = function () {
        $scope.showLoader(); 
        var collectionobj = {};
        collectionobj.ActionType = 4; 
        debugger;
        var getData = myService.methode('POST', ("../SiteManager/GetSiteManagerListDT"), JSON.stringify(collectionobj));
        getData.then(function (response) { 
            var tblheader =
            [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "SiteId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "Value": "PartyID", "HeaderValue": "PartyName", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "Site Name", "HeaderValue": "SiteName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Pincode", "HeaderValue": "Pincode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "Country", "Value": "CountryID", "HeaderValue": "CountryName", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "State", "Value": "StateID", "HeaderValue": "STATE_NM", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "City", "Value": "CityID", "HeaderValue": "CITY_NAME", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" }, 
                    { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                      { "HeaderText": "PANIT NO", "HeaderValue": "PANITNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "GSTINUIN", "HeaderValue": "GSTINUIN", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "Location", "HeaderValue": "LocationCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Manpower type", "HeaderValue": "Manpowertype", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "ManPower Count", "HeaderValue": "ManPowerCount", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                ];
            if (loginType == '4') {
                $scope.PartySiteMasterList = $filter('filter')(response.data.Result, { PartyId: MapId }, true);
            } else {
                $scope.PartySiteMasterList = $filter('unique')(response.data.Result, 'SiteId'); // or another unique field
            }

        
            loadDataUsingPreDefinedColumn(tblheader, $scope.PartySiteMasterList);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader(); 
                var row = $('#example').DataTable().row(this).data(); 
                $scope.hfId = row[0];
                 
                $scope.PartySiteMasterList = $filter('filter')($scope.PartySiteMasterList, { 'SiteId': $scope.hfId });
                $scope.hfId1 = row[2];

                $scope.PartyType = row[1]; 
         
                $scope.SiteName = row[3]; 
                $scope.Address = row[4];
                $scope.Pincode = row[5];
                $("#txtpincode").change();
                $scope.EmailId = row[9]
                $scope.MobileNo = row[10];  
                $scope.Description = $scope.PartySiteMasterList[0].Description;
                $scope.Panitno = $scope.PartySiteMasterList[0].PANITNO;
                $scope.Gstinuin = $scope.PartySiteMasterList[0].GSTINUIN;
                $scope.LocationCode = $scope.PartySiteMasterList[0].LocationCode;


                $scope.CLRARC = $scope.PartySiteMasterList[0].CLRARC;
                $scope.CLRLIC = $scope.PartySiteMasterList[0].CLRLIC;
                $scope.ContactPerson = $scope.PartySiteMasterList[0].ContactPerson;
                $scope.ContactMobile = $scope.PartySiteMasterList[0].ContactMobile;
                $scope.Descritpion = $scope.PartySiteMasterList[0].Descritpion;
                $scope.ValidFrom = new Date($scope.PartySiteMasterList[0].ValidFrom);
                $scope.ValidTo = new Date($scope.PartySiteMasterList[0].ValidTo) ;
                $scope.Manpowertype = $scope.PartySiteMasterList[0].Manpowertype;
                $scope.ManPowerCount = $scope.PartySiteMasterList[0].ManPowerCount;

                $scope.AdminFileDoc = $scope.PartySiteMasterList[0].AdminFileDoc;
                $scope.VendorFileDoc = $scope.PartySiteMasterList[0].VendorFileDoc;

               
                setTimeout(function () {
                    $scope.AllParty();
                    $scope.PartyId = $scope.PartySiteMasterList[0].PartyId;
                    $scope.CountryId = $scope.PartySiteMasterList[0].CountryId;
                    $scope.AllState();
                    $scope.StateId = $scope.PartySiteMasterList[0].StateId;
                    $scope.AllCity();
                    $scope.CityId = $scope.PartySiteMasterList[0].CityId; 
               
                }, 1000);

                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.$apply(); 
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();


            });
        });
        $scope.hideLoader();
    };
      
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
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "SiteId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "Value": "PartyID", "HeaderValue": "PartyName", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "Site Name", "HeaderValue": "SiteName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Pincode", "HeaderValue": "Pincode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Country", "Value": "CountryID", "HeaderValue": "CountryName", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "State", "Value": "StateID", "HeaderValue": "STATE_NM", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "City", "Value": "CityID", "HeaderValue": "CITY_NAME", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" },
                    { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    //{ "HeaderText": "BankDetails", "HeaderValue": "BankDetails", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    //{ "HeaderText": "Account No", "HeaderValue": "AccountNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    //{ "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "PANIT NO", "HeaderValue": "PANITNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "GSTINUIN", "HeaderValue": "GSTINUIN", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Location", "HeaderValue": "LocationCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Manpower type", "HeaderValue": "Manpowertype", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "ManPower Count", "HeaderValue": "ManPowerCount", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

       ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}