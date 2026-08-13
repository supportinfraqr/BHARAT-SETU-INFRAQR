app.ContractorRegistration = function ($scope, $element, $filter, myService, $http) {
    $scope.isDropdownOpen = false;
    
    $scope.onload = function () {
        var params = new URLSearchParams(window.location.search);

        $scope.Partycode = params.get("Partycode");
        $scope.PartyName = params.get("PartyName");
        $scope.Userbind($scope.Partycode);
    }


    $scope.PartySearch = function () {
        var collectionobj = {};
        collectionobj.ActionType = 35;
        collectionobj.CreatedBy = LoginId;

        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", JSON.stringify(collectionobj));

        getData.then(function (response) {
            $scope.VendorList = response.data.Result || [];
           
        });
    };

    $scope.Userbind = function (UserId) {

        var collectionobj = {};
        collectionobj.ActionType = 36;
        collectionobj.CreatedBy = UserId;

        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", JSON.stringify(collectionobj));

        getData.then(function (response) {
            $scope.UserList = response.data.Result || [];
            var VendorId = $scope.UserList[0].LoginId;
            $scope.BindRegistrationReport(VendorId);

        });
    };

    $scope.BindRegistrationReport = function (VendorId) {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.UserId = VendorId;
        var getData = myService.methode('POST', ("../RetailSection/SearchRegistration"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.RegistrationList = response.data.Result;
            $scope.AgencyName = $scope.RegistrationList[0].AgencyName;
            $scope.RegisteredAddress = $scope.RegistrationList[0].RegisteredAddress;
            $scope.CorporateAddress = $scope.RegistrationList[0].CorporateAddress;
            $scope.ContactPerson = $scope.RegistrationList[0].ContactPerson;
            $scope.Designation = $scope.RegistrationList[0].Designation;
            $scope.Mobile = $scope.RegistrationList[0].Mobile;
            $scope.Email = $scope.RegistrationList[0].Email;
            $scope.Website = $scope.RegistrationList[0].Website;
            $scope.YearEstablishment = $scope.RegistrationList[0].YearEstablishment;
            $('#multiDisplay').val($scope.RegistrationList[0].Organization);

            $scope.PanNo = $scope.RegistrationList[0].PanNo;
            $scope.TAN = $scope.RegistrationList[0].Tan;
            $scope.GSTIN = $scope.RegistrationList[0].GSTIN;
            $scope.CIN = $scope.RegistrationList[0].CIN;
            $scope.SHOPREGI = $scope.RegistrationList[0].SHOPREGI;
            $scope.MSME = $scope.RegistrationList[0].MSME;

            $scope.BankName = $scope.RegistrationList[0].BankName;
            $scope.AccountNumber = $scope.RegistrationList[0].AccountNumber;
            $scope.IFSCCode = $scope.RegistrationList[0].IFSCCode;
            $scope.CancelledCheque = $scope.RegistrationList[0].CancelledCheque;

            $scope.EPFREGNO = $scope.RegistrationList[0].EPFREGNO;
            $scope.ESICREGNO = $scope.RegistrationList[0].ESICREGNO;
            $scope.ProfessionalREGNO = $scope.RegistrationList[0].ProfessionalREGNO;
            $scope.LabourREGNO = $scope.RegistrationList[0].LabourREGNO;
            $scope.ContractREGNO = $scope.RegistrationList[0].ContractREGNO;
            $scope.LabourLicenseNO = $scope.RegistrationList[0].LabourLicenseNO;

            $('#licenseDate').val($scope.RegistrationList[0].LicenseValidity);
            $scope.LicenseEmployeeCount = $scope.RegistrationList[0].LicenseEmployeeCount;

            $('#ServicesOffered').val($scope.RegistrationList[0].Service);
            $('#IndustriesServed').val($scope.RegistrationList[0].Industries);
            $scope.TotalEmployees = $scope.RegistrationList[0].TotalEmployees;
            $scope.OperationalLocations = $scope.RegistrationList[0].OperationalLocations;



            $scope.YearsOfExperience = $scope.RegistrationList[0].YearsOfExperience;
            $scope.KeyClients = $scope.RegistrationList[0].KeyClients;
            $scope.SimilarContracts = $scope.RegistrationList[0].SimilarContracts;
            $scope.NameOrganization1 = $scope.RegistrationList[0].NameOrganization1;
            $scope.ServiceType1 = $scope.RegistrationList[0].ServiceType1;
            $scope.ConcernPerson1 = $scope.RegistrationList[0].ConcernPerson1;
            $scope.Designation1 = $scope.RegistrationList[0].Designation1;
            $scope.MobileNo1 = $scope.RegistrationList[0].MobileNo1;
            $scope.EmailId1 = $scope.RegistrationList[0].EmailId1;
            $scope.NameOrganization2 = $scope.RegistrationList[0].NameOrganization2;
            $scope.ServiceType2 = $scope.RegistrationList[0].ServiceType2;
            $scope.ConcernPerson2 = $scope.RegistrationList[0].ConcernPerson2;
            $scope.Designation2 = $scope.RegistrationList[0].Designation2;
            $scope.MobileNo2 = $scope.RegistrationList[0].MobileNo2;
            $scope.EmailId2 = $scope.RegistrationList[0].EmailId2;
            $scope.NameOrganization3 = $scope.RegistrationList[0].NameOrganization3;
            $scope.ServiceType3 = $scope.RegistrationList[0].ServiceType3;
            $scope.ConcernPerson3 = $scope.RegistrationList[0].ConcernPerson3;
            $scope.Designation3 = $scope.RegistrationList[0].Designation3;
            $scope.MobileNo3 = $scope.RegistrationList[0].MobileNo3;
            $scope.EmailId3 = $scope.RegistrationList[0].EmailId3;

            $scope.SignatoryName = $scope.RegistrationList[0].SignatoryName;
            $scope.SignatoryDesignation = $scope.RegistrationList[0].SignatoryDesignation;
            $('#txtGeneralDate').val($scope.RegistrationList[0].GeneralDate);

            $scope.File1 = $scope.RegistrationList[0].File1;
            $scope.File2 = $scope.RegistrationList[0].File2;
            $scope.File3 = $scope.RegistrationList[0].File3;
            $scope.File4 = $scope.RegistrationList[0].File4;
            $scope.File5 = $scope.RegistrationList[0].File5;
            $scope.File6 = $scope.RegistrationList[0].File6;
            $scope.File7 = $scope.RegistrationList[0].File7;
            $scope.File8 = $scope.RegistrationList[0].File8;
            $scope.File9 = $scope.RegistrationList[0].File9;
            $scope.File10 = $scope.RegistrationList[0].File10;
            $scope.File11 = $scope.RegistrationList[0].File11;
            $scope.File12 = $scope.RegistrationList[0].File12;
            $scope.File13 = $scope.RegistrationList[0].File13;
            $scope.File14 = $scope.RegistrationList[0].File14;
            $scope.File15 = $scope.RegistrationList[0].File15;
            $scope.File16 = $scope.RegistrationList[0].File16;
            $scope.File17 = $scope.RegistrationList[0].File17;
            $scope.File18 = $scope.RegistrationList[0].File18;
            $scope.File19 = $scope.RegistrationList[0].File19;
            $scope.File20 = $scope.RegistrationList[0].File20;
            $scope.File21 = $scope.RegistrationList[0].File21;

            $scope.file22 = $scope.RegistrationList[0].file22;
            $scope.file23 = $scope.RegistrationList[0].file23;
            $scope.file24 = $scope.RegistrationList[0].file24;

            $scope.Dec1 = $scope.RegistrationList[0].IndemnityClause;
            $scope.Dec2 = $scope.RegistrationList[0].ConfidentialityAgreement;
            $scope.Dec3 = $scope.RegistrationList[0].CodeofConduct;
            $scope.Dec4 = $scope.RegistrationList[0].AMLDeclaration;
            $scope.Dec5 = $scope.RegistrationList[0].AntiBribery;
            $scope.Dec6 = $scope.RegistrationList[0].DPDPDeclaration;

        });
    }

    $scope.orgList = [
        { name: 'Proprietorship', selected: false },
        { name: 'Partnership', selected: false },
        { name: 'LLP', selected: false },
        { name: 'Pvt Ltd', selected: false },
        { name: 'Public Ltd', selected: false }
    ];

    // Dropdown toggle
    $scope.toggleDropdown = function (event) {
        event.stopPropagation();
        $scope.isDropdownOpen = !$scope.isDropdownOpen;
    };

    // Selected values update
    $scope.updateSelected = function () {
        var selected = $scope.orgList
            .filter(x => x.selected)
            .map(x => x.name);

        $scope.Organization = selected.join(',');       // DB ke liye
        $scope.OrganizationDisplay = selected.join(', '); // UI ke liye
    };

    // Outside click close
    angular.element(document).on('click', function () {
        $scope.$apply(function () {
            $scope.isDropdownOpen = false;
        });
    });
    $scope.BindRegistration = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/SearchRegistration"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.RegistrationList = response.data.Result;
            $scope.AgencyName = $scope.RegistrationList[0].AgencyName;
            $scope.RegisteredAddress = $scope.RegistrationList[0].RegisteredAddress;
            $scope.CorporateAddress = $scope.RegistrationList[0].CorporateAddress;
            $scope.ContactPerson = $scope.RegistrationList[0].ContactPerson;
            $scope.Designation = $scope.RegistrationList[0].Designation;
            $scope.Mobile = $scope.RegistrationList[0].Mobile;
            $scope.Email = $scope.RegistrationList[0].Email;
            $scope.Website = $scope.RegistrationList[0].Website;
            $scope.YearEstablishment = $scope.RegistrationList[0].YearEstablishment;
            $('#multiDisplay').val($scope.RegistrationList[0].Organization);

            $scope.PanNo = $scope.RegistrationList[0].PanNo;
            $scope.TAN = $scope.RegistrationList[0].Tan;
            $scope.GSTIN = $scope.RegistrationList[0].GSTIN;
            $scope.CIN = $scope.RegistrationList[0].CIN;
            $scope.SHOPREGI = $scope.RegistrationList[0].SHOPREGI;
            $scope.MSME = $scope.RegistrationList[0].MSME;

            $scope.BankName = $scope.RegistrationList[0].BankName;
            $scope.AccountNumber = $scope.RegistrationList[0].AccountNumber;
            $scope.IFSCCode = $scope.RegistrationList[0].IFSCCode;
            $scope.CancelledCheque = $scope.RegistrationList[0].CancelledCheque;

            $scope.EPFREGNO = $scope.RegistrationList[0].EPFREGNO;
            $scope.ESICREGNO = $scope.RegistrationList[0].ESICREGNO;
            $scope.ProfessionalREGNO = $scope.RegistrationList[0].ProfessionalREGNO;
            $scope.LabourREGNO = $scope.RegistrationList[0].LabourREGNO;
            $scope.ContractREGNO = $scope.RegistrationList[0].ContractREGNO;
            $scope.LabourLicenseNO = $scope.RegistrationList[0].LabourLicenseNO;

            $('#licenseDate').val($scope.RegistrationList[0].LicenseValidity);
            $scope.LicenseEmployeeCount = $scope.RegistrationList[0].LicenseEmployeeCount;

            $('#ServicesOffered').val($scope.RegistrationList[0].Service);
            $('#IndustriesServed').val($scope.RegistrationList[0].Industries);
            $scope.TotalEmployees = $scope.RegistrationList[0].TotalEmployees;
            $scope.OperationalLocations = $scope.RegistrationList[0].OperationalLocations;



            $scope.YearsOfExperience = $scope.RegistrationList[0].YearsOfExperience;
            $scope.KeyClients = $scope.RegistrationList[0].KeyClients;
            $scope.SimilarContracts = $scope.RegistrationList[0].SimilarContracts;
            $scope.NameOrganization1 = $scope.RegistrationList[0].NameOrganization1;
            $scope.ServiceType1 = $scope.RegistrationList[0].ServiceType1;
            $scope.ConcernPerson1 = $scope.RegistrationList[0].ConcernPerson1;
            $scope.Designation1 = $scope.RegistrationList[0].Designation1;
            $scope.MobileNo1 = $scope.RegistrationList[0].MobileNo1;
            $scope.EmailId1 = $scope.RegistrationList[0].EmailId1;
            $scope.NameOrganization2 = $scope.RegistrationList[0].NameOrganization2;
            $scope.ServiceType2 = $scope.RegistrationList[0].ServiceType2;
            $scope.ConcernPerson2 = $scope.RegistrationList[0].ConcernPerson2;
            $scope.Designation2 = $scope.RegistrationList[0].Designation2;
            $scope.MobileNo2 = $scope.RegistrationList[0].MobileNo2;
            $scope.EmailId2 = $scope.RegistrationList[0].EmailId2;
            $scope.NameOrganization3 = $scope.RegistrationList[0].NameOrganization3;
            $scope.ServiceType3 = $scope.RegistrationList[0].ServiceType3;
            $scope.ConcernPerson3 = $scope.RegistrationList[0].ConcernPerson3;
            $scope.Designation3 = $scope.RegistrationList[0].Designation3;
            $scope.MobileNo3 = $scope.RegistrationList[0].MobileNo3;
            $scope.EmailId3 = $scope.RegistrationList[0].EmailId3;

            $scope.SignatoryName = $scope.RegistrationList[0].SignatoryName;
            $scope.SignatoryDesignation = $scope.RegistrationList[0].SignatoryDesignation;
            $('#txtGeneralDate').val($scope.RegistrationList[0].GeneralDate);

            $scope.File1 = $scope.RegistrationList[0].File1;
            $scope.File2 = $scope.RegistrationList[0].File2;
            $scope.File3 = $scope.RegistrationList[0].File3;
            $scope.File4 = $scope.RegistrationList[0].File4;
            $scope.File5 = $scope.RegistrationList[0].File5;
            $scope.File6 = $scope.RegistrationList[0].File6;
            $scope.File7 = $scope.RegistrationList[0].File7;
            $scope.File8 = $scope.RegistrationList[0].File8;
            $scope.File9 = $scope.RegistrationList[0].File9;
            $scope.File10 = $scope.RegistrationList[0].File10;
            $scope.File11 = $scope.RegistrationList[0].File11;
            $scope.File12 = $scope.RegistrationList[0].File12;
            $scope.File13 = $scope.RegistrationList[0].File13;
            $scope.File14 = $scope.RegistrationList[0].File14;
            $scope.File15 = $scope.RegistrationList[0].File15;
            $scope.File16 = $scope.RegistrationList[0].File16;
            $scope.File17 = $scope.RegistrationList[0].File17;
            $scope.File18 = $scope.RegistrationList[0].File18;
            $scope.File19 = $scope.RegistrationList[0].File19;
            $scope.File20 = $scope.RegistrationList[0].File20;
            $scope.File21 = $scope.RegistrationList[0].File21;
            // added new here
            $scope.file22 = $scope.RegistrationList[0].file22;
            $scope.file23 = $scope.RegistrationList[0].file23;
            $scope.file24 = $scope.RegistrationList[0].file24;


            $scope.Dec1 = $scope.RegistrationList[0].IndemnityClause;
            $scope.Dec2 = $scope.RegistrationList[0].ConfidentialityAgreement;
            $scope.Dec3 = $scope.RegistrationList[0].CodeofConduct;
            $scope.Dec4 = $scope.RegistrationList[0].AMLDeclaration;
            $scope.Dec5 = $scope.RegistrationList[0].AntiBribery;
            $scope.Dec6 = $scope.RegistrationList[0].DPDPDeclaration;

        });
    }


    $scope.validateDeclarations = function () {

        if ($scope.Dec1 != '1') {
            ShowMsgBox("Please approve the Indemnity Clause.");
            return false;
        }
        else if ($scope.Dec2 != '1') {
            ShowMsgBox("Please approve the Confidentiality Agreement.");
            return false;
        }
        else if ($scope.Dec3 != '1') {
            ShowMsgBox("Please approve the Code of Conduct.");
            return false;
        }
        else if ($scope.Dec4 != '1') {
            ShowMsgBox("Please approve the AML Declaration.");
            return false;
        }
        else if ($scope.Dec5 != '1') {
            ShowMsgBox("Please approve the Anti-Bribery Declaration.");
            return false;
        }

        else if ($scope.Dec6 != '1') {
            ShowMsgBox("Please approve the DPDP Declaration.");
            return false;
        }
        else {

            //currentStep++;
            //showStep(currentStep);
            document.querySelector('[data-step="9"]').style.display = "block";

            return true; // ✅ all approved
        }


    };

    $scope.declarationMap = {};
    $scope.completedDecl = {};

    /* 🔹 Bind from DB */
    $scope.BindDeclaration = function () {
        var obj = {
            Action: 27,
            UserId: MapId
        };

        myService.methode('POST', "../RetailSection/SearchRegistration", JSON.stringify(obj))
            .then(function (res) {

                var data = res.data.Result;

                data.forEach(function (item) {
                    $scope.declarationMap[item.Type] = item.Overview;
                });

            });
    };



    $scope.currentDecl = null;

    $scope.htmlToText = function (html) {

        if (!html) return "";
        var decoded = decodeURIComponent(html);
        var tempDiv = document.createElement("div");
        tempDiv.innerHTML = decoded;

        return tempDiv.textContent || tempDiv.innerText || "";
    };
    $scope.openDeclaration = function (type) {

        $scope.currentDecl = type;

        document.getElementById("declTitle").innerText = type;

        var htmlContent = $scope.declarationMap[type];

        var plainText = $scope.htmlToText(htmlContent);

        document.getElementById("declContent").innerText = plainText;

        document.getElementById("declAgree").checked = false;

        enableScrollCheck();

        new bootstrap.Modal(document.getElementById("declModal")).show();
    };
    $scope.RepoortopenDeclaration = function (type) {

        $scope.currentDecl = type;

        document.getElementById("declTitle").innerText = type;

        var htmlContent = $scope.declarationMap[type];

        var plainText = $scope.htmlToText(htmlContent);

        document.getElementById("declContent").innerText = plainText;





        new bootstrap.Modal(document.getElementById("declModal")).show();
    };

    function enableScrollCheck() {

        const box = document.getElementById("declContent");
        const checkbox = document.getElementById("declAgree");

        checkbox.disabled = true;
        box.scrollTop = 0;

        if (box.scrollHeight <= box.clientHeight + 10) {
            checkbox.disabled = false;
            return;
        }



        box.onscroll = function () {
            if (box.scrollTop + box.clientHeight >= box.scrollHeight - 5) {
                checkbox.disabled = false;
            }
        };
    }
    $scope.ReportconfirmDeclaration = function () {



        $scope.completedDecl[$scope.currentDecl] = true;

        //document.querySelector(`[data-type="${$scope.currentDecl}"] .status`).innerText = "Done";

        //var modalEl = document.getElementById("declModal");
        //var modalInstance = bootstrap.Modal.getInstance(modalEl);
        $scope.SaveDeclalation($scope.currentDecl);
        /*  modalInstance.hide();*/

        setTimeout(function () {
            document.body.classList.remove("modal-open");
            document.body.style = "";

            document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
        }, 300);
    };

    $scope.confirmDeclaration = function () {

        if (!document.getElementById("declAgree").checked) {
            alert("Please agree first");
            return;
        }

        $scope.completedDecl[$scope.currentDecl] = true;
        $scope.SaveDeclalation($scope.currentDecl);
        setTimeout(function () {
            document.body.classList.remove("modal-open");
            document.body.style = "";

            document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
        }, 300);
    };
    $scope.SaveDeclalation = function (Declalation) {
        $scope.showLoader();
        var collectionobj = {};
        if (Declalation == 'Indemnity Clause') {
            collectionobj.Action = 28;
        }
        else if (Declalation == 'Confidentiality Agreement') {
            collectionobj.Action = 29;
        }
        else if (Declalation == 'Code of Conduct') {
            collectionobj.Action = 30;
        }
        else if (Declalation == 'AML Declaration') {
            collectionobj.Action = 31;
        }
        else if (Declalation == 'Anti-Bribery') {
            collectionobj.Action = 32;
        }
        else if (Declalation == 'DPDP Declaration') {
            collectionobj.Action = 33;
        }
        else {
            alert('Something Went Wrong, please refresh plage');
        }
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/InsertRegister"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.hideLoader();
            $scope.BindRegistration();
        });
    }






    $scope.nextStepDeclaration = function () {

        var total = document.querySelectorAll(".decl-item").length;
        var done = Object.keys($scope.completedDecl).length;

        //if (total !== done) {
        //    alert("Please complete all declarations");
        //    return;
        //}

        // 👉 Next Step Call
        $scope.GoNextStep();
    };

    $scope.saveFile = function (type, Action) {

        var file = $scope[type];

        if (!file) return;

        // ✅ 2.5 MB validation
        var maxSize = 2.5 * 1024 * 1024;

        if (file.size > maxSize) {
            alert("File size should not exceed 2.5 MB");
            return;
        }

        var formData = new FormData();
        formData.append("File1", file);  // backend expects File1
        formData.append("Action", Action);
        formData.append("UserId", LoginId);

        $http.post('/RetailSection/UploadVfile', formData, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        }).then(function (res) {
            $scope.BindRegistration();
        });
    };

    $scope.Reset = function () {

        $scope.AgencyName = '';
        $scope.RegisteredAddress = '';
        $scope.CorporateAddress = '';
        $scope.ContactPerson = '';
        $scope.Designation = '';
        $scope.Mobile = '';
        $scope.Email = '';
        $scope.Website = '';
        $scope.YearEstablishment = '';
        $scope.Organization = '';
    }

    $scope.FinalSave = function () {
        $scope.showLoader();
        var collectionobj = {};

        collectionobj.SignatoryName = $scope.SignatoryName;
        collectionobj.SignatoryDesignation = $scope.SignatoryDesignation;
        collectionobj.GeneralDate = $('#txtGeneralDate').val();
        collectionobj.Action = 34;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/InsertRegister"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.hideLoader();
            showMsgBox(response.data.Result)
            $scope.BindRegistration();
        });
    }

    $scope.SaveStep1 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.AgencyName = $scope.AgencyName;
        collectionobj.RegisteredAddress = $scope.RegisteredAddress;
        collectionobj.CorporateAddress = $scope.CorporateAddress;
        collectionobj.ContactPerson = $scope.ContactPerson;
        collectionobj.Designation = $scope.Designation;
        collectionobj.Mobile = $scope.Mobile;
        collectionobj.Email = $scope.Email;
        collectionobj.Website = $scope.Website;
        collectionobj.Year = $scope.YearEstablishment;
        collectionobj.Organization = $('#multiDisplay').val();
        collectionobj.Action = 2;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/InsertRegister"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.hideLoader();
            $scope.BindRegistration();
        });
    }


    $scope.SaveStep2 = function () {
        $scope.showLoader();

        var collectionobj = {};

        collectionobj.PanNo = $scope.PanNo;
        collectionobj.TAN = $scope.TAN;
        collectionobj.GSTIN = $scope.GSTIN;
        collectionobj.CIN = $scope.CIN;
        collectionobj.SHOPREGI = $scope.SHOPREGI;
        collectionobj.MSME = $scope.MSME;

        collectionobj.Action = 3; // 🔥 Step2 ke liye
        collectionobj.UserId = LoginId
        var getData = myService.methode(
            'POST',
            ("../RetailSection/InsertRegister"),
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            $scope.hideLoader();

            $scope.BindRegistration();

        }, function () {
            $scope.hideLoader();
            alert("Error in Step 2 Save");
        });
    };

    $scope.SaveStep3 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.EPFREGNO = $scope.EPFREGNO;
        collectionobj.ESICREGNO = $scope.ESICREGNO;
        collectionobj.ProfessionalREGNO = $scope.ProfessionalREGNO;
        collectionobj.LabourREGNO = $scope.LabourREGNO;
        collectionobj.ContractREGNO = $scope.ContractREGNO;
        collectionobj.LabourLicenseNO = $scope.LabourLicenseNO;

        collectionobj.LicenseValidity = $('#licenseDate').val();
        collectionobj.LicenseEmployeeCount = $scope.LicenseEmployeeCount;

        collectionobj.Action = 4;

        collectionobj.UserId = LoginId

        var getData = myService.methode(
            'POST',
            ("../RetailSection/InsertRegister"),
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            $scope.hideLoader();

            $scope.BindRegistration();

        }, function () {
            $scope.hideLoader();
            alert("Error in Step 3 Save");
        });
    };

    $scope.SaveStep4 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.BankName = $scope.BankName;
        collectionobj.AccountNumber = $scope.AccountNumber;
        collectionobj.IFSCCode = $scope.IFSCCode;
        collectionobj.CancelledCheque = $scope.CancelledCheque;
        collectionobj.Action = 5;
        collectionobj.UserId = LoginId
        var getData = myService.methode(
            'POST',
            ("../RetailSection/InsertRegister"),
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            $scope.hideLoader();

            $scope.BindRegistration();

        }, function () {
            $scope.hideLoader();
            alert("Error in Step 4 Save");
        });
    };





    $scope.SaveStep5 = function () {
        $scope.showLoader();

        var collectionobj = {};

        collectionobj.Service = $('#ServicesOffered').val();
        collectionobj.Industries = $('#IndustriesServed').val();
        collectionobj.TotalEmployees = $scope.TotalEmployees;
        collectionobj.OperationalLocations = $scope.OperationalLocations;
        collectionobj.Action = 6;
        collectionobj.UserId = LoginId;

        var getData = myService.methode(
            'POST',
            "../RetailSection/InsertRegister",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            $scope.hideLoader();

            $scope.BindRegistration();

        }, function () {
            $scope.hideLoader();
            alert("Error in Step 5 Save");
        });
    };
    // Lists
    $scope.ServiceList = [
        'Manpower Supply',
        'Facility Management',
        'Security Services',
        'Housekeeping',
        'IT Services',
        'Consulting'
    ];

    $scope.IndustryList = [
        'Manufacturing',
        'IT',
        'Healthcare',
        'Retail',
        'Banking',
        'Logistics'
    ];




    $scope.SaveStep6 = function () {
        $scope.showLoader();


        var collectionobj = {};

        collectionobj.YearsOfExperience = $scope.YearsOfExperience;
        collectionobj.KeyClients = $scope.KeyClients;
        collectionobj.SimilarContracts = $scope.SimilarContracts;

        collectionobj.NameOrganization1 = $scope.NameOrganization1;
        collectionobj.ServiceType1 = $scope.ServiceType1;
        collectionobj.ConcernPerson1 = $scope.ConcernPerson1;
        collectionobj.Designation1 = $scope.Designation1;
        collectionobj.MobileNo1 = $scope.MobileNo1;
        collectionobj.EmailId1 = $scope.EmailId1;

        // Reference 2
        collectionobj.NameOrganization2 = $scope.NameOrganization2;
        collectionobj.ServiceType2 = $scope.ServiceType2;
        collectionobj.ConcernPerson2 = $scope.ConcernPerson2;
        collectionobj.Designation2 = $scope.Designation2;
        collectionobj.MobileNo2 = $scope.MobileNo2;
        collectionobj.EmailId2 = $scope.EmailId2;

        // Reference 3
        collectionobj.NameOrganization3 = $scope.NameOrganization3;
        collectionobj.ServiceType3 = $scope.ServiceType3;
        collectionobj.ConcernPerson3 = $scope.ConcernPerson3;
        collectionobj.Designation3 = $scope.Designation3;
        collectionobj.MobileNo3 = $scope.MobileNo3;
        collectionobj.EmailId3 = $scope.EmailId3;

        // Common
        collectionobj.Action = 8;
        collectionobj.UserId = LoginId

        // ✅ API Call
        var getData = myService.methode(
            'POST',
            "../RetailSection/InsertRegister",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            $scope.hideLoader();
            $scope.BindRegistration();

        }, function () {
            $scope.hideLoader();
            alert("Error in Step 6 Save");
        });
    };
	
	 $scope.VendorRegistrationReport = function (id, name) {
        window.location.href = "../RetailSection/VendorRegistrationReport?Partycode=" + id + "&PartyName=" + name;
    };

}