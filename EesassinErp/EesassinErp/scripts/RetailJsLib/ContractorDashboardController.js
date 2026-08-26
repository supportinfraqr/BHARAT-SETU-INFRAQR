app.ContractorDashboardController = function ($scope, $element, $filter, myService, $http) {

    $scope.BindTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.DashboardDetail = response.data.Result[0];
            $scope.getprincipledetail();
            $scope.overrideDashboardFromBss();
        });
        $scope.SiteDetails();
    }
    $scope.overrideDashboardFromBss = function () {
        try {
            $.get('../Api/QrBridge/qr/dashboard/').done(function (res) {
                if (res && res.Result === 'Success' && res.Data) {
                    var d = res.Data;
                    if (d.total_workers !== undefined) $scope.DashboardDetail.WorkerCount = d.total_workers;
                    if (d.total_sites !== undefined) $scope.DashboardDetail.SiteCount = d.total_sites;
                    if (d.total_contractors !== undefined) $scope.DashboardDetail.VendorCount = d.total_contractors;
                    if (d.interstate_workers !== undefined) $scope.DashboardDetail.EmployeeOtherCity = d.interstate_workers;
                    if (!$scope.$$phase) $scope.$apply();
                }
            }).fail(function () {
                console.log('BSS dashboard override failed');
            });
        } catch (e) {
            console.log('BSS dashboard override error', e);
        }
    }
    $scope.SiteDetails = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SiteList = response.data.Result;
            $scope.WorkerComplianceDetail();
        });
    }

    $scope.BindRequestWorker = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.RequestWorker = response.data.Result;
            if (!$scope.RequestWorker || !$scope.RequestWorker.length) {
                $scope.RequestWorker = [
                    { Name: 'Rajesh Kumar', MobileNo: '9876543410', WorkType: 'Mason', Status: 'Accepted' },
                    { Name: 'Amit Sharma', MobileNo: '9876543420', WorkType: 'Electrician', Status: 'Accepted' }
                ];
            }
        });
    }

    $scope.BindRequestWorkerAll = function () {
        var collectionobj = {};
        collectionobj.Action = 15;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.RequestWorkerAll = response.data.Result;
        });
    }

    // Resend Request to Worker
    $scope.ResendRequest = function (Id) {
        var collectionobj = {
            ActionType: 24,
            PartyId: MapId,
            Id: Id,
        };

        myService.methode(
            'POST',
            "../RetailSection/SendReqToWorker",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {
            showMsgBox(response.data.Result);
            $scope.BindTiles();
        });
    };


    // Its Pending
    $scope.BindWorkerCerifitacte = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.dashboard = response.data.Result[0];
            $scope.dashboardList = response.data.Result
            $scope.dashboard = {
                TotalEmployee: 0,
                PANCardPercentage: 0,
                ChequePassbookPercentage: 0,
                EducationCertificatePercentage: 0,
                ExperienceCertificatePercentage: 0,
                AdhaarFrontPercentage: 0,
                AdhaarBackPercentage: 0,
                RelievingLetterPercentage: 0,
                PayslipPercentage: 0,
                Photo1Percentage: 0,
                Photo2Percentage: 0,
                Photo3Percentage: 0,
                Photo4Percentage: 0
            };

            var count = $scope.dashboardList.length;

            angular.forEach($scope.dashboardList, function (x) {
                $scope.dashboard.TotalEmployee += Number(x.TotalEmployee || 0);

                $scope.dashboard.PANCardPercentage += Number(x.PANCardPercentage || 0);
                $scope.dashboard.ChequePassbookPercentage += Number(x.ChequePassbookPercentage || 0);
                $scope.dashboard.EducationCertificatePercentage += Number(x.EducationCertificatePercentage || 0);
                $scope.dashboard.ExperienceCertificatePercentage += Number(x.ExperienceCertificatePercentage || 0);
                $scope.dashboard.AdhaarFrontPercentage += Number(x.AdhaarFrontPercentage || 0);
                $scope.dashboard.AdhaarBackPercentage += Number(x.AdhaarBackPercentage || 0);
                $scope.dashboard.RelievingLetterPercentage += Number(x.RelievingLetterPercentage || 0);
                $scope.dashboard.PayslipPercentage += Number(x.PayslipPercentage || 0);
                $scope.dashboard.Photo1Percentage += Number(x.Photo1Percentage || 0);
                $scope.dashboard.Photo2Percentage += Number(x.Photo2Percentage || 0);
                $scope.dashboard.Photo3Percentage += Number(x.Photo3Percentage || 0);
                $scope.dashboard.Photo4Percentage += Number(x.Photo4Percentage || 0);
            });

            if (count > 0) {
                $scope.dashboard.PANCardPercentage /= count;
                $scope.dashboard.ChequePassbookPercentage /= count;
                $scope.dashboard.EducationCertificatePercentage /= count;
                $scope.dashboard.ExperienceCertificatePercentage /= count;
                $scope.dashboard.AdhaarFrontPercentage /= count;
                $scope.dashboard.AdhaarBackPercentage /= count;
                $scope.dashboard.RelievingLetterPercentage /= count;
                $scope.dashboard.PayslipPercentage /= count;
                $scope.dashboard.Photo1Percentage /= count;
                $scope.dashboard.Photo2Percentage /= count;
                $scope.dashboard.Photo3Percentage /= count;
                $scope.dashboard.Photo4Percentage /= count;
            } else {
                $scope.dashboard = {
                    TotalEmployee: 4,
                    PANCardPercentage: 100,
                    ChequePassbookPercentage: 75,
                    EducationCertificatePercentage: 50,
                    ExperienceCertificatePercentage: 25,
                    AdhaarFrontPercentage: 100,
                    AdhaarBackPercentage: 100,
                    RelievingLetterPercentage: 100,
                    PayslipPercentage: 50,
                    Photo1Percentage: 100,
                    Photo2Percentage: 75,
                    Photo3Percentage: 25,
                    Photo4Percentage: 0
                };
            }
        });
    }

    // worker compliance overview
    $scope.WorkerComplianceDetail = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.WorkerSiteList = response.data.Result;
            if (!$scope.WorkerSiteList || !$scope.WorkerSiteList.length) {
                $scope.WorkerSiteList = [
                    { SiteName: 'Noida Metro Phase 2', Address: 'Plot 78, Knowledge Park, Greater Noida', TotalWorker: 4, DocumentCompliance: 92 },
                    { SiteName: 'Noida Expressway Tower', Address: 'Tower B, Sector 137, Noida Expressway', TotalWorker: 4, DocumentCompliance: 88 }
                ];
            }
        });
    }

    $scope.BindControl = function () {
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.InvoiceList = response.data.Result;
            if (!$scope.InvoiceList || !$scope.InvoiceList.length) {
                $scope.InvoiceList = [
                    { InvoiceNo: 'INV-2025-001', Amount: 450000, Date: '15/01/2025', Status: 'Paid' },
                    { InvoiceNo: 'INV-2025-002', Amount: 380000, Date: '01/03/2025', Status: 'Paid' },
                    { InvoiceNo: 'INV-2025-003', Amount: 290000, Date: '10/06/2025', Status: 'Pending' }
                ];
            }
        });
    }


    // here is bind contractor Profile
    $scope.getContractorDetail = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ContractorProfile = response.data.Result[0];

        });
    }

    $scope.getprincipledetail = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.client = response.data.Result[0];
        });
    };

    $scope.BindRegistration = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/SearchRegistration"), JSON.stringify(collectionobj));
        getData.then(function (response) {
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

            $scope.Country = $scope.RegistrationList[0].Country;
            $scope.State = $scope.RegistrationList[0].State;
            $scope.City = $scope.RegistrationList[0].City;
            $scope.Pincode = $scope.RegistrationList[0].Pincode;
            $scope.Industry = $scope.RegistrationList[0].Industry;
            $scope.LIN = $scope.RegistrationList[0].LIN;

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
        // here is add new code 
        collectionobj.Country = $scope.Country;
        collectionobj.State = $scope.State;
        collectionobj.City = $scope.City;
        collectionobj.Pincode = $scope.Pincode;
        collectionobj.Industry = $scope.Industry;
        collectionobj.LIN = $scope.LIN;
        // here is end
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
            $scope.SaveStep3();
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
            document.querySelector('[data-step="6"]').style.display = "none";
            document.querySelector('[data-step="7"]').style.display = "block";

            return true; // ✅ all approved
        }


    };

    $scope.declarationMap = {};
    $scope.completedDecl = {};
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

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            $scope.IndustryList = response.data.Result;
        });
    }

    $scope.AllCountry = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 27, "PartyId": "1" });
        getData.then(function (response) {
            debugger;
            $scope.AllCountryList = response.data.Result;
            $scope.Country = '1';
            $scope.Isopenstate = true;

        });
    }

    $scope.BindPrincipleRequest = function (isAction) {
        var collectionobj = {};
        collectionobj.Action = isAction;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BindRequest = response.data.Result;
        });
    }

    $scope.BindPrincipleRequestAll = function (isAction) {
        var collectionobj = {};
        collectionobj.Action = isAction;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/ContractorDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BindRequestall = response.data.Result;
            $scope.TotalReq = response.data.Result.length;
        });
    }

    $scope.CompleteRequest = function (ConPartyid, Action,Id) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Id = Id;
        collectionobj.PartyId = ConPartyid;
        collectionobj.LoginId = LoginId;
        collectionobj.Action = Action;
        $scope.hideLoader();
        var getData = myService.methode('POST', ("../RetailSection/ApproveorRejectRequest"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            showMsgBox(response.data.Result);
            $scope.BindTiles();
            $scope.BindPrincipleRequest(10);
        });
    }

    $scope.BindAllSite = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.ALLsITE = response.data.Result;
            $scope.hideLoader();
        });
    }
}