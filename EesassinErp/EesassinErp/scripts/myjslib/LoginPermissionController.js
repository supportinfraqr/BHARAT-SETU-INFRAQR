app.LoginPermissionController = function ($scope, $element, $filter, myService) {
    $scope.Status = [];
    $scope.SetUser = function ()
    {
        debugger;
        $('#dvpanel2').attr("style", "display:block");
        
        $scope.UName = 'Employee Name'
        $scope.Password = 'Password'
        $scope.Designation = 'Party Type'
        $scope.Contact = 'Contact'
        $scope.EmailId = 'EmailId'
        var collectionobj = {};
        collectionobj.IsActive = $scope.IsActive;  
        collectionobj.BranchCode = BranchCode;
        var getData = myService.methode('POST', "../DashBoard/GetLoginMemberDetails", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            if (response.data.Result.length > 0) {
                $scope.UserDetails = response.data.Result;
                $scope.forcheck = response.data.Result[0].IsActive == "Active User" ? true : false;
            }
            else {
                $scope.UserDetails = '';
                $scope.forcheck = '';
                $scope.all = '';
            }
        });
    }


    $scope.UpdateRecord = function () {
        debugger; 
        var collectionobj = {};
 
        collectionobj.BranchCode = BranchCode;
        collectionobj.IsActive = $scope.all == true ? 1 : 0;
        collectionobj.Action = 2;
        var getData = myService.methode('POST', "../Dashboard/UpdateAllMembers", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            showMsgBox("2");
            $scope.Status = [];
            $scope.SetUser();

        });
    };

    function ActiveConfirmbox(confirmText, functions) {
        swal({
            title: "Are you sure?",
            text: confirmText,
            type: "error",
            showCancelButton: true,
            confirmButtonClass: 'btn-danger',
            confirmButtonText: "Yes, Update it!",
            closeOnConfirm: true,
            closeOnCancel: true
        }, functions);
    }
    $scope.ChangeStatus = function (isChecked, UserCode) {
        ActiveConfirmbox("do u want to Update this record!", function (inputValue) {
               
            if (inputValue === false) {

                $scope.all = false;
                $scope.SetUser();
            } else {
                $scope.AfterChangeStatus(isChecked, UserCode);
            }
        });
    };

    //proceedConfirmbox
     
    //$scope.ConfirmUpdation = function () {
    //    $scope.all = false;
    //    deleteConfirmbox("Do you want to Update All record?", $scope.UpdateRecord);
    //};





    $scope.AfterChangeStatus = function (isChecked, UserCode) {
        debugger;
        var collectionobj = {};
       
        collectionobj.BranchCode = BranchCode;
        collectionobj.Action = 3;
        collectionobj.LoginId = UserCode;
        if (isChecked == true)
        { collectionobj.IsActive = 1; }
        else { collectionobj.IsActive = 0; }

        var getData = myService.methode('POST', "../DashBoard/SeprateUpdateMembers", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Status = [];
            $scope.SetUser(); 
        });
    }
     
};