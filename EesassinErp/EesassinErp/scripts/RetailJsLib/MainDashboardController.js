app.MainDashboardController = function ($scope, $element, $filter, myService) {

    $scope.BindTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.UserId = LoginId;  
        var getData = myService.methode('POST', "../RetailSection/GetRetailMainDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.TotalOrganization = response.data.Result[0].TotalOrganization;
            $scope.TotalActiveOrganization = response.data.Result[0].TotalActiveOrganization;
          /*  $scope.TotalLocation = response.data.Result[0].TotalLocation;*/
            $scope.TotalUser = response.data.Result[0].TotalUser;
        });
    }
    $scope.BindOverview = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.UserId = LoginId   ;
        var getData = myService.methode('POST', "../RetailSection/GetRetailMainDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.OverviewList = response.data.Result;
            $scope.calculateTotalLocationCount();
            //if (response.data.Result[1].UserType == 'Subsidiary')
            //{
            //    $scope.ISSubsidiary = true;
            //}
            //else  
            //{ $scope.ISSubsidiary = false; }
            if (response.data.Result && response.data.Result.length > 1 && response.data.Result[1].UserType === 'Subsidiary') {
                $scope.ISSubsidiary = true;
            } else {
                $scope.ISSubsidiary = false;
            }
        });

    } 

    $scope.calculateTotalLocationCount = function () {
        var total = 0;
        $scope.OverviewList.forEach(function (item) {
            total += item.LocationCount; // Summing the LocationCount values
        });
        $scope.TotalLocation = total; // Storing the total in the model
    };

    //$scope.backtodashboard = function () {
    //    setTimeout(function () { $scope.Redirectotdashboardwait(); }, 300);
    //}
    //$scope.Redirectotdashboardwait=function()
    //{ 
    //        var collectionobj = {}; 
    //        collectionobj.Username = LoginId;
    //        collectionobj.Action = "22";
    //        var getDetails = myService.methode('POST', '../RetailSection/getredirect', '{obj:' + JSON.stringify(collectionobj) + '}');
    //        getDetails.then(function (response) {
    //            debugger;
    //            if (response.data.length > 0) {
    //                sessionStorage.setItem('LoginId', response.data[0].LoginId);
    //                sessionStorage.setItem('LastLogin', response.data[0].LastLogin);
    //                sessionStorage.setItem('CurrLogin', response.data[0].CurrentLogin);
    //                sessionStorage.setItem('loginType', response.data[0].LoginType);
    //                sessionStorage.setItem('BranchCode', response.data[0].BranchCode);
    //                sessionStorage.setItem('Name', response.data[0].Name);
    //                sessionStorage.setItem('BranchName', response.data[0].BranchName);
    //                sessionStorage.setItem('ContactNo', response.data[0].ContactNo);
    //                sessionStorage.setItem('Desig', response.data[0].Desig);
    //                sessionStorage.setItem('CreatedOn', response.data[0].CreatedOn);
    //                sessionStorage.setItem('BranchAddress', response.data[0].BranchAddress);
    //                sessionStorage.setItem('MapId', response.data[0].MapId);
    //                sessionStorage.setItem('MapUser', response.data[0].MapUser);
    //                sessionStorage.setItem('Photo', response.data[0].Photo);
    //                sessionStorage.setItem('UserName', response.data[0].UserName);
    //                sessionStorage.setItem('SessionId', response.data[0].SessionId);
    //                sessionStorage.setItem('EmailId', response.data[0].EmailId);
    //               /* $scope.SetRolePermission(response.data[0].LoginType, response.data[0].LoginId);*/


    //                if (response.data[0].LoginId == "-1" || response.data[0].LoginId == null || response.data[0].LoginId == "") {

    //                    showMsgBox('999', 'Invalid Credentials!', 'warning', 'btn-warning');

    //                }
    //                else if (response.data[0].LoginId == "-11") {
    //                    proceedConfirmbox("Found Active Session, Please Logout All Session !", function () { $scope.SessionClose(Username, password); });
    //                }
    //                else {
    //                    $scope.ManageLog(response.data[0].LoginId, 'Login Retail Section through Dashboard');
    //                    window.location.href = '../RetailSection/MainDashboard';

    //                }
    //            }

    //        });
    //    };  
    //$scope.redirect = function (Username) {
    //    sessionStorage.setItem('Loadonce', 1);
    //    $('#btnclick').prop('disabled', false);
    //    var collectionobj = {};  
    //    //if (Username == LoginId) {
    //    //    alert('something went wrong , please wait or refresh.')
    //    //}
    //    collectionobj.Username = Username
    //        collectionobj.Password = LoginId;
    //        collectionobj.Action = "20";
    //    var getDetails = myService.methode('POST', '../RetailSection/getredirect', '{obj:' + JSON.stringify(collectionobj) + '}');
    //        getDetails.then(function (response) {
    //            debugger;
    //            if (response.data.length > 0)
    //            {
    //                $('#btnclick').prop('disabled', true);
    //                    sessionStorage.setItem('LoginId', response.data[0].LoginId);
    //                    sessionStorage.setItem('LastLogin', response.data[0].LastLogin);
    //                    sessionStorage.setItem('CurrLogin', response.data[0].CurrentLogin);
    //                    sessionStorage.setItem('loginType', response.data[0].LoginType);
    //                    sessionStorage.setItem('BranchCode', response.data[0].BranchCode);
    //                    sessionStorage.setItem('Name', response.data[0].Name);
    //                    sessionStorage.setItem('BranchName', response.data[0].BranchName);
    //                    sessionStorage.setItem('ContactNo', response.data[0].ContactNo);
    //                    sessionStorage.setItem('Desig', response.data[0].Desig);
    //                    sessionStorage.setItem('CreatedOn', response.data[0].CreatedOn);
    //                    sessionStorage.setItem('BranchAddress', response.data[0].BranchAddress);
    //                    sessionStorage.setItem('MapId', response.data[0].MapId);
    //                    sessionStorage.setItem('MapUser', response.data[0].MapUser);
    //                    sessionStorage.setItem('Photo', response.data[0].Photo);
    //                    sessionStorage.setItem('UserName', response.data[0].UserName);
    //                    sessionStorage.setItem('SessionId', response.data[0].SessionId);
    //                    sessionStorage.setItem('EmailId', response.data[0].EmailId);
    //                   /* $scope.SetRolePermission(response.data[0].LoginType, response.data[0].LoginId);*/


    //                if (response.data[0].LoginId == "-1" || response.data[0].LoginId == null || response.data[0].LoginId == "") {

    //                    showMsgBox('999', 'Invalid Credentials!', 'warning', 'btn-warning');

    //                }
    //                else if (response.data[0].LoginId == "-11") {
    //                    proceedConfirmbox("Found Active Session, Please Logout All Session !", function () { $scope.SessionClose(Username, password); });
    //                }
    //                    else
    //                    {
    //                        $scope.ManageLog(response.data[0].LoginId, 'Login Retail Section through Dashboard');
    //                        window.location.href = '../RetailSection/Dashboard';

    //                    } 
    //            }
                
    //        }); 
    //};
   
    //$scope.backtodashboard = function () {
    //    $timeout(function () {
    //        $scope.Redirectotdashboardwait();
    //    }, 300);
    //};

    //$scope.Redirectotdashboardwait = function () {
    //    var collectionobj = {
    //        Username: LoginId,
    //        Action: "22"
    //    };

    //    var getDetails = myService.methode('POST', '../RetailSection/getredirect', '{obj:' + JSON.stringify(collectionobj) + '}');
    //    getDetails.then(function (response) {
    //        if (response.data && response.data.length > 0) {
    //            var groupData = response.data[0];

    //            if (groupData.LoginId == "-1" || !groupData.LoginId) {
    //                showMsgBox('999', 'Invalid Credentials!', 'warning', 'btn-warning');
    //                return;
    //            } else if (groupData.LoginId == "-11") {
    //                proceedConfirmbox("Found Active Session, Please Logout All Session !", function () {
    //                    $scope.SessionClose(LoginId);
    //                });
    //                return;
    //            }

    //            // Update session storage
    //            Object.keys(groupData).forEach(key => sessionStorage.setItem(key, groupData[key]));

    //            $scope.ManageLog(groupData.LoginId, 'Login Retail Section through Dashboard');
    //            window.location.href = '../RetailSection/MainDashboard';
    //        } else {
    //            showMsgBox('999', 'Unexpected error. Please try again.', 'error', 'btn-error');
    //        }
    //    }).catch(function (error) {
    //        console.error("Error in backtodashboard:", error);
    //        showMsgBox('999', 'Something went wrong!', 'error', 'btn-error');
    //    });
    //};

   
 
    

}