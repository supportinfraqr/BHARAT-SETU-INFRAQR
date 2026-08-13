app.PrincipleEmployerCodeController = function ($scope, $element, $filter, myService, $http, $compile, $timeout) {

   
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
        });
    }

    $scope.BindActiveConstructionSite = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.ActiveConstructionSiteList = response.data.Result;
        });
    }
    $scope.BindAllSite = function () {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.ALLsITE = response.data.Result;
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
        });
    }

    $scope.BindEmployeeSite = function () {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchPrincipleEmploye", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.EmployeeSiteList = response.data.Result;
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
}