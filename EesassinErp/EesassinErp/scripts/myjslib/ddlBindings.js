app.ddlBindings = function ($scope, $element, $filter, myService) {
    // Global
    $scope.UrlAccessPermission = function (MenuId) {
        
        $scope.collectionobj = {};
        $scope.collectionobj["LoginId"] = JSON.parse(LoginId);
        $scope.collectionobj["BranchCode"] = BranchCode; 
        $scope.collectionobj["MenuId"] =  MenuId;
        if (MenuId == undefined)
        {
            return;
        }

        var getData = myService.methode('POST', '../Login/UrlAccessPermission', '{obj:' + JSON.stringify($scope.collectionobj) + '}');
        getData.then(function (response) {
            
            if (response.data.Result.length >0)
            {
                if (loginType == 1) {
                    $scope.disableAdd = false;
                    $scope.disableEdit = false;
                    $scope.disableDelete = true;
                    $scope.disablePrint = true;
                    $scope.disableClear = false;

                    $scope.IsAdd = true;
                    $scope.IsEdit = true;
                    $scope.IsDelete = true;
                    $scope.IsPrint = true;
                    return;
                }


                $scope.IsAdd = response.data.Result[0].IsAdd;
                $scope.IsEdit = response.data.Result[0].IsEdit;
                $scope.IsDelete = response.data.Result[0].IsDelete;
                $scope.IsPrint = response.data.Result[0].IsPrint;

                if ($scope.IsAdd === true) {
                    $scope.disableAdd = false;
                    $scope.disableClear = false;

                } else {
                    $scope.disableAdd = true;
                    $scope.disableClear = true;
                }

                if ($scope.IsEdit === true) {
                    $scope.disableEdit = false;
                    $scope.disableClear = false;
                } else {
                    $scope.disableEdit = true;
                    $scope.disableClear = true;
                }

                if ($scope.IsDelete === true) {
                    $scope.disableDelete = false;
                } else {
                    $scope.disableDelete = true;
                }

                if ($scope.IsPrint === true) {
                    $scope.disablePrint = false;
                } else {
                    $scope.disablePrint = true;
                }

                if ($scope.IsPrint === false) {
                    $scope.disableSearch = true;
                }
                else {
                    $scope.disableSearch = false;
                }

            }
             
               
        });
    }

   // $scope.UrlAccessPermission();
     
     
    

    $scope.ToDate = new Date();
    $scope.FromDate = new Date("1990-01-01");
    $scope.Print = function (title) {

        var print = $('#printDiv').html();
        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /></head><body onload="window.print()" style="background:#fff;">' + print + '</body></html>';
        popupWin.document.write(head);
        setTimeout(function () { popupWin.document.close(); }, 1000);
    }


    $scope.ResetControl = function () {
        $('#txtNewPasscode').val('')
        $('#txtReTypePasscode').val('')
        $('#txtCurrentPasscode').val('')
        $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ffffff;')
        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ffffff;')
        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #ffffff;')

        chk = false;
        $scope.mySwitch = false;
    }
    chk = false;
    $scope.mySwitch = true;
    $scope.checkPassCode = function () {
        var collectionobj = {}; 
        collectionobj.BranchCode = BranchCode; 
        collectionobj.OldPassword = $('#txtCurrentPasscode').val();
        collectionobj.LoginId = LoginId;
        collectionobj.Action = 1;
        collectionobj.UserName = $scope.UserName;
        var getData = myService.methode('POST', "../ChangePassCode/checkPassCode", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            //debugger;

            if (response.data == 1) {
                $scope.mySwitch = false;
                chk = true;
                $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')

              
            }
            else {
                $scope.mySwitch = true;
                chk = false;
                $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            }
        });
    };

    $scope.checkReType = function () {
        //debugger;
        if ($('#txtNewPasscode').val() == $('#txtReTypePasscode').val()) {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            chk = true;
        }
        else {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            chk = false;
        }
    }
    var chk = '';
    //$scope.ChangePassword = function () {
    //    //debugger;
    //    var valid = true;
    //    if ($('#txtCurrentPasscode').val() == '') {
    //        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
    //        valid = false;
    //        return;
    //    }
    //    else if ($('#txtNewPasscode').val() == '') {
    //        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
    //        valid = false;
    //        return;
    //    }
    //    else if ($('#txtReTypePasscode').val() == '') {
    //        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
    //        valid = false;
    //        return;
    //    }

    //    else if (chk == true) {
    //        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        var collectionobj = {}; 
    //        collectionobj.BranchCode = BranchCode;
    //        collectionobj.OldPassword = $('#txtCurrentPasscode').val();
    //        collectionobj.NewPassword = $('#txtReTypePasscode').val();
    //        collectionobj.LoginId = LoginId;
    //        collectionobj.Action = 2;
    //        var getData = myService.methode('POST', "../ChangePassCode/ModifyPassCode", '{obj:' + JSON.stringify(collectionobj) + '}');
    //        getData.then(function (response) {
    //            if (showMsgBox(response.data.Result)) {
    //                $scope.ResetControl();
    //            }
    //        });
    //    }

    //}
}
