app.ContractorGatePassController = function ($scope, $element, $filter, myService, $http) {

    $scope.redirectomain = function () {
        window.location.href = '../Dashboard/contractorGatePass';
    };

    $scope.redirectdetail = function () {
        window.location.href = '../Dashboard/contractorGatePassDetail';
    };
    $scope.PassType = 'P'
    $scope.CallPfrompass = function () {
        $scope.PassType= 'P'
    }
    $scope.CallTfrompass = function () {
        $scope.PassType = 'T'
    }
    $scope.ChangeGatePassType = function (type) {

        console.log("Clicked Type:", type);

        $scope.PassType = type;

        console.log("PassType:", $scope.PassType);
    };
    $scope.BindWorker = function () { 
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LoginId = MapId;
        collectionobj.Id = $scope.PassType;
        var getData = myService.methode('POST', ("../Dashboard/GetContractorGatePass"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.WorkerList1 = response.data.Result;
            $scope.WorkerList = response.data.Result;
            $scope.selectAll = false;
            $scope.SelectedWorker = 0;
          
            angular.forEach($scope.WorkerList, function (item) {
                item.Selected = false;
            });   
        });
        $scope.hideLoader();
    }

   
    $scope.BindWorkerDetail = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LoginId = MapId;
        collectionobj.Id = $scope.PassType;
        var getData = myService.methode('POST', ("../Dashboard/GetContractorGatePass"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.WorkerList1 = response.data.Result;
            $scope.WorkerList = response.data.Result;
            $scope.selectAll = false;
            $scope.SelectedWorker = 0;

            angular.forEach($scope.WorkerList, function (item) {
                item.Selected = false;
            });
        });
        $scope.hideLoader();
    }
    $scope.GetPendingCount = function () {

        var count = 0;

        angular.forEach($scope.WorkerList, function (item) {

            if ((!$scope.SelectedSite || item.SiteName === $scope.SelectedSite)
                && item.GSTATUS === "Pending") {

                count++;
            }

        });

        return count;
    };
    $scope.GetTotalEmployeeCount = function () {

        var count = 0;

        angular.forEach($scope.WorkerList, function (item) {

            if (!$scope.SelectedSite || item.SiteName === $scope.SelectedSite) {
                count++;
            }

        });

        return count;
    };
    $scope.SiteFilter = function (item) {

        if (!$scope.SelectedSite)
            return true;

        return item.SiteName === $scope.SelectedSite;
    };
    $scope.setEmpValue = function (x) {

        $scope.SiteInduction = x.SiteInduction
        $scope.PPE = x.PPE
        $scope.SafetyTrainingStatus = x.SafetyTrainingStatus
        $scope.MedicalStatus = x.MedicalStatus
        $scope.FitnessTypes = x.FitnessTypes
        $scope.SiteInduction = x.SiteInduction
        $scope.Compliance = x.Compliance,
            $scope.BankVerify = x.BankVerify,
            $scope.PanVerify = x.PanVerify,
            $scope.UANVerify = x.UANVerify,
            $scope.AadharVerify = x.AadharVerify,
            $scope.EmployeeCode = x.EmployeeCode,
            $scope.EmpName = x.EmployeeName,
            $scope.AadharVerify = x.AadharVerify,
            $scope.PFVerify = x.PFVerify  
    }
   
     
    $scope.toggleAll = function () {

        angular.forEach($scope.WorkerList, function (item) {
            item.Selected = $scope.selectAll;
            $scope.SelectedWorker = $scope.selectAll ? $scope.WorkerList.length : 0;
        });

    };
     
    $scope.updateSelection = function () {

        $scope.SelectedWorker = 0;

        angular.forEach($scope.WorkerList, function (item) {
            if (item.Selected) {
                $scope.SelectedWorker++;
            }
        });

        $scope.selectAll = ($scope.SelectedWorker === $scope.WorkerList.length);
    };
    
    $scope.GatePassType = "P";   

    $scope.IndiviualApprove = function (Id, pass, Action) {



       

        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to Approve Continue?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, Approve",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d"
        }).then((result) => {

            if (result.isConfirmed) {

                var obj = {
                    GatePassType: pass,
                    Action: Action,
                    Id: Id
                };

                $http.post("/Dashboard/IUDContractorGatePass", obj)
                    .then(function (response) {

                        showMsgBox("Approve Successfully");
                        $scope.Bindtiles(); $scope.BindClientWorker();
                        document.querySelector(".btn-close").click();
                    }, function () {

                        showMsgBox("Error while saving.");

                    });

            }

        });

    };

    $scope.IndiviualRefect = function (Id, pass, Action) {





        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to Reject Continue?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, Reject",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d"
        }).then((result) => {

            if (result.isConfirmed) {

                var obj = {
                    GatePassType: pass,
                    Action: Action,
                    Id: Id
                };

                $http.post("/Dashboard/IUDContractorGatePass", obj)
                    .then(function (response) {

                        showMsgBox("Reject Successfully");
                        $scope.Bindtiles(); $scope.BindClientWorker();
                        document.querySelector(".btn-close").click();

                    }, function () {

                        showMsgBox("Error while saving.");

                    });

            }

        });

    };






    //$scope.ChangeGatePassType = function (type) {

    //    $scope.GatePassType = type; 
    //};
    $scope.SaveSelectedEmployee = function ()
    { 
        $("#gatePassModal").modal("hide");
        var ids = [];

        angular.forEach($scope.WorkerList, function (item) {
            if (item.Selected) {
                ids.push(item.EmployeeId);
            }
        });

        if (ids.length == 0) {
            showMsgBox("Please select at least one employee.");
            return;
        }

        var obj = {
            GatePassType: $scope.PassType,
            GatePassDays: $scope.GatePassDays,
            Action: "1",
            Id: ids.join(',')   
        };


        $http.post("/Dashboard/IUDContractorGatePass", obj)
            .then(function (response) {
                showMsgBox(response.data.Result); 
                document.querySelector(".btn-close").click();
            }, function () {

                showMsgBox("Error while saving.");

            });

    };
    $scope.OpenGatePassModal = function () {

        var ids = [];

        angular.forEach($scope.WorkerList, function (item) {
            if (item.Selected) {
                ids.push(item.EmployeeId);
            }
        });

        if (ids.length == 0) {
            showMsgBox("Please select at least one employee.");
            return;
        }

        $scope.GatePassDays = "";

        $("#gatePassModal").modal("show");
    };


    //////////////////////////////////--------------------------------------------principle p[art ]  


    $scope.BindClientWorker = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', ("../Dashboard/GetContractorGatePass"), JSON.stringify(collectionobj));
        getData.then(function (response) { 
            $scope.EmpWorkerList = response.data.Result;
        
        });
        $scope.hideLoader();
    }
    $scope.Getallgatepassbyparty = function (x) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.Id = x.PartyId;
        var getData = myService.methode('POST', ("../Dashboard/GetContractorGatePass"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.WorkerList1 = response.data.Result;
            $scope.WorkerList = response.data.Result;
            $scope.selectAll = false;
            $scope.SelectedWorker = 0;

            angular.forEach($scope.WorkerList, function (item) {
                item.Selected = false;
            });
        });
        $scope.hideLoader();
    }
    $scope.Bindtiles = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', ("../Dashboard/GetContractorGatePass"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.DTiles = response.data.Result[0]; 
        });
        $scope.hideLoader();
    }



    $scope.RejectSection = function () {

        var ids = [];

        angular.forEach($scope.WorkerList, function (item) {
            if (item.Selected) {
                ids.push(item.EmployeeId);
            }
        });

        if (ids.length == 0) {
            showMsgBox("Please select at least one employee.");
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to reject the selected gate pass(s)?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, Reject",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d"
        }).then((result) => {

            if (result.isConfirmed) {

                var obj = {
                    GatePassType: 2,
                    Action: "2",
                    Id: ids.join(',')
                };

                $http.post("/Dashboard/IUDContractorGatePass", obj)
                    .then(function (response) {

                        showMsgBox(response.data.Result);
                        $scope.Bindtiles(); $scope.BindClientWorker();
                        document.querySelector(".btn-close").click();
                    }, function () {

                        showMsgBox("Error while saving.");

                    });

            }

        });

    };
    $scope.ApprovalSection = function () {

        var ids = [];

        angular.forEach($scope.WorkerList, function (item) {
            if (item.Selected) {
                ids.push(item.EmployeeId);
            }
        });

        if (ids.length == 0) {
            showMsgBox("Please select at least one employee.");
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to Approve the selected gate pass(s)?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, Approve",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d"
        }).then((result) => {

            if (result.isConfirmed) {

                var obj = {
                    GatePassType: 1,
                    Action: "2",
                    Id: ids.join(',')
                };

                $http.post("/Dashboard/IUDContractorGatePass", obj)
                    .then(function (response) {

                        showMsgBox(response.data.Result);
                        $scope.Bindtiles(); $scope.BindClientWorker();
                        document.querySelector(".btn-close").click();
                    }, function () {

                        showMsgBox("Error while saving.");

                    });

            }

        });

    };
    
}