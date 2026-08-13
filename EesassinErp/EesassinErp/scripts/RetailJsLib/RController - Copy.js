app.RController = function ($scope, $element, $filter, myService) {



    //$scope.BindDashboard = function () {

    //    var collectionobj = {};
      
    //    collectionobj.PartyID = MapId;
    //    collectionobj.UserId = LoginId;
    //    if ($scope.DashboardSwitch == 'AdminSupplier' || $scope.DashboardSwitch=='Supplier') {
    //        collectionobj.Action = 7;
    //    } else { collectionobj.Action = 1;}
    //     🔄 Loader ON
    //    $scope.isDashboardLoading = true;

    //    var getData = myService.methode(
    //        'POST',
    //        "../Retail/bindingDashboard",
    //        '{obj:' + JSON.stringify(collectionobj) + '}'
    //    );

    //    getData.then(function (response) {
    //        debugger;

    //        if (response.data && response.data.Result) {

    //            $scope.UserDetail = response.data.Result.Table || [];
    //            $scope.DahboardList = response.data.Result.Table1 || [];

    //            if ($scope.UserDetail.length > 0) {
    //                $scope.UserName = $scope.UserDetail[0].UserName;
    //                $scope.Status = $scope.UserDetail[0].Status;
    //                $scope.LastLogin = $scope.UserDetail[0].LastLogin;
    //                $scope.LoginType = $scope.UserDetail[0].Desig;
    //                $scope.Photo = ($scope.UserDetail[0].Photo &&
    //                    $scope.UserDetail[0].Photo.trim() !== '')
    //                    ? $scope.UserDetail[0].Photo
    //                    : '../content/profile.png';
    //            }
    //        }

    //    }).catch(function (error) {
    //        console.error("Dashboard load error", error);
    //    }).finally(function () {
    //         ✅ Loader OFF (success / error dono me)
    //        $scope.isDashboardLoading = false;
    //    });
    //};


    //$scope.Logout = function () {
    //    sessionStorage.removeItem("LoginId");
    //    sessionStorage.removeItem("BranchCode");
    //    sessionStorage.removeItem("loginType");
    //    sessionStorage.removeItem("LastLogin");
    //    sessionStorage.removeItem("Desig");
    //    sessionStorage.removeItem("Name");
    //    sessionStorage.removeItem("BranchName");
    //    sessionStorage.removeItem("ContactNo");
    //    sessionStorage.removeItem("CreatedOn");
    //    sessionStorage.removeItem("Photo");

    //    sessionStorage.removeItem("SCS_ViewFlag");
    //    sessionStorage.removeItem("SCS_AllowEditFlag");
    //    sessionStorage.removeItem("SCS_EditFlag");
    //    sessionStorage.removeItem("SCS_DeleteFlag");
    //    sessionStorage.removeItem("SCS_UploadFlag");
    //    sessionStorage.removeItem("SCS_DownloadFlag");

    //    sessionStorage.removeItem("LR_ViewFlag");
    //    sessionStorage.removeItem("SM_ViewFlag");
    //    sessionStorage.removeItem("SM_EditFlag");
    //    sessionStorage.removeItem("SM_DeleteFlag");
    //    sessionStorage.removeItem("SM_UploadFlag");
    //    sessionStorage.removeItem("SM_VerifyFlag");
    //    sessionStorage.removeItem("SM_NewStoreFlag");

    //    sessionStorage.removeItem("CD_ViewFlag");
    //    sessionStorage.removeItem("CD_EditFlag");
    //    sessionStorage.removeItem("CD_DeleteFlag");
    //    sessionStorage.removeItem("CD_UploadFlag");
    //    sessionStorage.removeItem("CD_DownloadFlag");
    //    sessionStorage.removeItem("CD_VerifyFlag");


    //    sessionStorage.removeItem("LM_ViewFlag");
    //    sessionStorage.removeItem("LM_EditFlag");
    //    sessionStorage.removeItem("LM_DeleteFlag");
    //    sessionStorage.removeItem("LM_UploadFlag");
    //    sessionStorage.removeItem("LM_DownloadFlag");
    //    sessionStorage.removeItem("LM_VerifyFlag");

    //    sessionStorage.removeItem("EM_ViewFlag");
    //    sessionStorage.removeItem("EM_EditFlag");
    //    sessionStorage.removeItem("EM_UploadFlag");
    //    sessionStorage.removeItem("EM_DeleteFlag");
    //    sessionStorage.removeItem("LM_DownloadFlag");
    //    sessionStorage.removeItem("EM_DownloadFlag");
    //    sessionStorage.removeItem("EM_VerifyFlag");
    //    sessionStorage.removeItem("NI_ViewFlag");


    //    sessionStorage.removeItem("SMF_ViewFlag");
    //    sessionStorage.removeItem("SMF_EditFlag");
    //    sessionStorage.removeItem("LD_ViewFlag");
    //    sessionStorage.removeItem("NL_ViewFlag");
    //    sessionStorage.removeItem("LSD_Flag");
    //    sessionStorage.removeItem('COBD_Flag');
    //    sessionStorage.removeItem('COMD_Flag');
    //    sessionStorage.removeItem('STAT_Flag');


    //    $scope.ManageLog('Logout');
    //    var collectionobj = {};
    //    collectionobj.Action = 17;
    //    collectionobj.LoginId = $scope.LoginId;
    //    var getData = myService.methode('POST', ("../Login/GetModulePermission"), JSON.stringify(collectionobj));
    //    getData.then(function (response) {
    //        window.top.location.href = '../Login/Login';
    //    });



    //};





}