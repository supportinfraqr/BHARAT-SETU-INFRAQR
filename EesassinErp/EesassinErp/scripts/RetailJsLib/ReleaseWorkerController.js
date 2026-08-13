app.ReleaseWorkerController = function ($scope, $element, $filter, myService, $http, $timeout) {

    $scope.GetexpDetails = function () {
        var params = new URLSearchParams(window.location.search);
        $scope.WorkerId = params.get("WorkerCode");
        $scope.GetWorkerProfile($scope.WorkerId, $scope.RefWorkerCode);
        $scope.CurrentAppointDetail($scope.WorkerId, $scope.RefWorkerCode);
    }
    $scope.GetWorkerProfile = function (wid,ref) {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.Id = wid;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.EmployeeList = response.data.Result[0];
            $scope.bindContractorDetail($scope.EmployeeList.UserId, $scope.EmployeeList.PartyId);
            $scope.getprincipledetail($scope.EmployeeList.UserId, $scope.EmployeeList.PartyId);
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };
    $scope.CurrentAppointDetail = function (wid, ref) {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.Id = wid;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.Appointmentdetail = response.data.Result[0];
            $scope.bindContractorDetail($scope.Appointmentdetail.UserId, $scope.Appointmentdetail.PartyId);
            $scope.getprincipledetail($scope.Appointmentdetail.UserId, $scope.Appointmentdetail.PartyId);
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };
    $scope.bindContractorDetail = function (userid, partyid) {
        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.Id = partyid;
        collectionobj.UserId = userid;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
          
            $scope.ContDashboard= response.data.Result[0];
            $scope.ConName = $scope.ContDashboard.connanme;
            $scope.ConCode = $scope.ContDashboard.PartyCode;
            $scope.ConEmailID = $scope.ContDashboard.EmailId;
            $scope.ConState = $scope.ContDashboard.State;
            $scope.ConAddress = $scope.ContDashboard.Address;
            $scope.ConLIN = $scope.ContDashboard.LIN;
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };
    $scope.getprincipledetail = function (userid, partyid) {
        var collectionobj = {};
        collectionobj.ActionType = 2;
        collectionobj.Id = partyid;
        collectionobj.UserId = userid;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.client = response.data.Result[0];
            $scope.Employername = $scope.client.Contractorname;
            $scope.employercode = $scope.client.EmployerCode;
            $scope.Employeremail = $scope.client.EmailId;
            $scope.employerstate = $scope.client.State;
            $scope.employeraddress = $scope.client.Address;
            $scope.industry = $scope.client.Industry;
            $scope.LIN = $scope.client.LIN;
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };
}
