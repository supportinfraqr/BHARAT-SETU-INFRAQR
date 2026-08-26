app.PrincipleEmployerCodeController = function ($scope, $element, $filter, myService, $http, $compile, $timeout) {


    $scope.IsEmailDisabled = false;
    $scope.IsMobileDisabled = false;

    $scope.Email = REmailId;
    $scope.Mobile = ContactNo;

    $scope.IsEmailDisabled = !!$scope.Email;
    $scope.IsMobileDisabled = !!$scope.Mobile;

    $scope.ShowVendorList = false;

    $scope.SelectVendor = function (vendor) {

        $scope.SelectedVendor = vendor;

        $scope.SearchText = vendor.VName;

        // Dropdown hide
        $scope.ShowVendorList = false;




    };


    $scope.CalculateDashboard = function () {

        if (!$scope.SearchText || $scope.SearchText.trim() == '') {

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

        }
        else {

            var vendor = $scope.dashboardList.find(function (x) {
                return x.VName == $scope.SearchText;
            });

            if (vendor) {
                $scope.dashboard = angular.copy(vendor);
            }
        }
    };
    $scope.DashboardDetail = {};
    $scope.BindEmployerDashboard = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 13;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.DashboardDetail1 = response.data.Result[0];
            $scope.BindTiles();
        });
    }

    $scope.BindTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.DashboardDetail = response.data.Result[0];
            $scope.RenderWorkerDistributionChart(
                $scope.DashboardDetail.ChildWorkerc,
                $scope.DashboardDetail.EmployeeOtherCity,
                $scope.DashboardDetail.EmployeeRegularWorker
            );

            $scope.overrideDashboardFromBss();
        });
    }

    $scope.overrideDashboardFromBss = function () {
        try {
            $.get('../Api/QrBridge/qr/dashboard/').done(function (res) {
                if (res && res.Result === 'Success' && res.Data) {
                    var d = res.Data;
                    if (d.total_contractors !== undefined) $scope.DashboardDetail.VendorCount = d.total_contractors;
                    if (d.total_workers !== undefined) $scope.DashboardDetail.WorkerCount = d.total_workers;
                    if (d.total_sites !== undefined) $scope.DashboardDetail.SiteCount = d.total_sites;
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

    $scope.BindActiveConstructionSite = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.ActiveConstructionSiteList = response.data.Result;
            console.log($scope.ActiveConstructionSiteList);
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

    $scope.Bindgatepass = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.gatepasslist = response.data.Result[0];
        });
    }
    $scope.BindMedicalExamination = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.MedicalExaminationlist = response.data.Result[0];
        });
    }
    $scope.BindHealth = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.HealthList = response.data.Result[0];
        });
    }

    $scope.OtherFacilities = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.OtherFacilitiesList = response.data.Result[0];
        });
    }
    $scope.BindCompliance = function () {
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.ComplianceList = response.data.Result;
        });
    }
    $scope.BindCLlraLicense = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.CLRAList = response.data.Result;

        });

    }

    $scope.BindWorkerCerifitacte = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
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
            }
        });
    }

    $scope.BindEmployeeSite = function () {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.EmployeeSiteList = response.data.Result;
            $scope.hideLoader();
        });
    }

    $scope.SearchSitebyId = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.LoginId = Id;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Sitemaster = response.data.Result[0];
        });
    }

    $scope.BindControl = function () {
        var collectionobj = {};
        collectionobj.Updatedby = MapId;
        collectionobj.Action = 55;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.InvoiceList = response.data;
            $scope.VendorList = response.data;
            $scope.ShowVendorList = true;
        });
    }


    $scope.RenderWorkerDistributionChart = function (childWorkers, interStateWorkers, regularWorkers) {
        if ($scope.workerDistributionChart) {
            $scope.workerDistributionChart.destroy();
        }

        var options = {
            series: [
                childWorkers || 0,
                interStateWorkers || 0,
                regularWorkers || 0
            ],
            chart: {
                type: 'pie',
                height: 300,
                toolbar: {
                    show: false
                }
            },
            labels: [
                'Child Workers',
                'Inter-State Workers',
                'Regular Workers'
            ],
            legend: {
                position: 'bottom'
            },
            dataLabels: {
                enabled: true
            },
            stroke: {
                width: 2
            },
            responsive: [{
                breakpoint: 768,
                options: {
                    chart: {
                        height: 300
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        $scope.workerDistributionChart = new ApexCharts(
            document.querySelector("#workerDistributionChart"),
            options
        );
        $scope.workerDistributionChart.render();
    };


    // here is principle employer profile code 
    $scope.PrincipleProfile = function () {
        var collectionobj = {};
        collectionobj.Action = 14;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Profile = response.data.Result[0];
            $scope.PartyCode = $scope.Profile.PartyCode;
            $scope.Industry = $scope.Profile.Industryname;
            $scope.LIN = $scope.Profile.LINNO;
            $scope.State = $scope.Profile.State;
            $scope.City = $scope.Profile.City;
            $scope.Country = "India";
            $scope.Pincode = $scope.Profile.Pincode;
            $scope.almobile = $scope.Profile.ContactMobile;
        });
    }

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

            $scope.PanNo = $scope.RegistrationList[0].PanNo;
            $scope.TAN = $scope.RegistrationList[0].Tan;
            $scope.GSTIN = $scope.RegistrationList[0].GSTIN;
            $scope.CIN = $scope.RegistrationList[0].CIN;
            $scope.SHOPREGI = $scope.RegistrationList[0].SHOPREGI;
            $scope.MSME = $scope.RegistrationList[0].MSME;

            $scope.EPFREGNO = $scope.RegistrationList[0].EPFREGNO;
            $scope.ESICREGNO = $scope.RegistrationList[0].ESICREGNO;
            $scope.ProfessionalREGNO = $scope.RegistrationList[0].ProfessionalREGNO;
            $scope.LabourREGNO = $scope.RegistrationList[0].LabourREGNO;

            $scope.Representnamet = $scope.RegistrationList[0].Representativename;
            $scope.representDesignation = $scope.RegistrationList[0].RepresentativeDesignation;
            $scope.RepMobile = $scope.RegistrationList[0].RepresentativeMobile;
            $scope.RepEmail = $scope.RegistrationList[0].RepresentativeEmail;


            $scope.Dec1 = $scope.RegistrationList[0].IndemnityClause;
            $scope.Dec2 = $scope.RegistrationList[0].ConfidentialityAgreement;
            $scope.Dec3 = $scope.RegistrationList[0].CodeofConduct;
            $scope.Dec4 = $scope.RegistrationList[0].AMLDeclaration;
            $scope.Dec5 = $scope.RegistrationList[0].AntiBribery;
            $scope.Dec6 = $scope.RegistrationList[0].DPDPDeclaration;
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
        collectionobj.MobileNo1 = $scope.almobile;
        collectionobj.Email = $scope.Email;
        collectionobj.Website = $scope.Website;
		 collectionobj.LIN = $scope.LIN;
        collectionobj.State = $scope.State;
        collectionobj.City = $scope.City;
        collectionobj.Pincode = $scope.Pincode;
        collectionobj.Year = $scope.YearEstablishment;
        collectionobj.Organization = $('#multiDisplay').val();
        collectionobj.Action = 2;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/InsertRegister"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.SaveStep2();
            $scope.hideLoader();
            $scope.BindRegistration();
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
            document.querySelector('[data-step="6"]').style.display = "none";
            document.querySelector('[data-step="7"]').style.display = "block";

            return true; // ✅ all approved
        }
    };

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
    $scope.SaveStep4 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ContactPerson = $scope.Representnamet;
        collectionobj.Designation = $scope.representDesignation;
        collectionobj.Mobile = $scope.RepMobile;
        collectionobj.Email = $scope.RepEmail;
        collectionobj.Action = 40;
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

    // Principle Employer
    $scope.SavePrincipleRegistration = function () {
        if (isValidate()) {
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
            collectionobj.Organization = $scope.Organization;
            collectionobj.EPFREGNO = $scope.EPFREGNO;
            collectionobj.ESICREGNO = $scope.ESICREGNO;
            collectionobj.ProfessionalREGNO = $scope.ProfessionalREGNO;
            collectionobj.LabourREGNO = $scope.LabourREGNO;
            collectionobj.PanNo = $scope.PanNo;
            collectionobj.TAN = $scope.TAN;
            collectionobj.GSTIN = $scope.GSTIN;
            collectionobj.CIN = $scope.CIN;
            collectionobj.SHOPREGI = $scope.SHOPREGI;
            collectionobj.MSME = $scope.MSME;
            collectionobj.Country = $scope.Country;
            collectionobj.State = $scope.State;
            collectionobj.City = $scope.City;
            collectionobj.Pincode = $scope.Pincode;
            collectionobj.ReContactPerson = $scope.Representnamet;
            collectionobj.ReDesignation = $scope.representDesignation;
            collectionobj.ReMobile = $scope.RepMobile;
            collectionobj.ReEmail = $scope.RepEmail;
            collectionobj.nameofeshtablishment = $scope.nameofeshtablishment;
            collectionobj.typeofeshtablishment = $scope.typeofeshtablishment;
            collectionobj.validupto = $('#txtvalidupto').val();

            collectionobj.LIN = $scope.LIN;
            collectionobj.Industry = $scope.Industry;

            collectionobj.Action = 42;
            collectionobj.UserId = LoginId;
            $scope.hideLoader();
            var getData = myService.methode('POST', ("../RetailSection/SavePrincipleEmployer"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    window.location.href = "../Dashboard/PrincipleEmployerDashboard";
                }
                $scope.hideLoader();
            });
        }
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
    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            $scope.IndustryList = response.data.Result;
        });
    }

    $scope.GetContractorReq = function (isAction) {
        var collectionobj = {};
        collectionobj.Action = isAction;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BindRequest = response.data.Result;
        });
    }

    $scope.GetContractorReqall = function (isAction) {
        var collectionobj = {};
        collectionobj.Action = isAction;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BindRequestal = response.data.Result;
            $scope.TotalReq = response.data.Result.length;
        });
    }


    $scope.CompleteRequest = function (ConPartyid, Action, Id) {
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
            $scope.BindEmployerDashboard();
        });
    }
}
