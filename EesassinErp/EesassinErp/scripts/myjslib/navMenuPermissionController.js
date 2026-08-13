app.NavMenuPermissionController = function ($scope, $element, $filter, $sce, myService) {
    $(document).ready(function() {
        $('#ddlUser').addClass('validate');
    });

    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.disableAdd = false;
    $scope.chkAllow = [];
    $scope.chkAdd = [];
    $scope.chkEdit = [];
    $scope.chkDelete = [];
    $scope.chkPrint = [];
    $scope.chkAddDisable = [];
    $scope.chkEditDisable = [];
    $scope.chkDeleteDisable = [];
    $scope.chkPrintDisable = [];


    $scope.BindListedUsers = function () {
        debugger;

        $scope.collectionobj = {};
        $scope.collectionobj["Action"] = 6;
        $scope.collectionobj["BranchCode"] = BranchCode;
        var getData = myService.methode('POST', '../DashBoard/GetCompanyAndBranchMaster', '{obj:' + JSON.stringify($scope.collectionobj) + '}');
        getData.then(function (response) {
            $scope.ListedUsers = response.data.Result;
        });
    };

    $scope.GetSubMenuList = function () {
        debugger;
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.EmployeeCode = $scope.ListedUser;
        collectionobj.ModuleId = $scope.ModuleId; 
        collectionobj.BranchCode = BranchCode;
        collectionobj.BranchCode = BranchCode;
       
        var getData = myService.methode('POST', '../Dashboard/SubMenuList', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function(response) {
            debugger;
            $scope.chkAll = false;
            $scope.chkAllow = [];
            $scope.chkAdd = [];
            $scope.chkEdit = [];
            $scope.chkDelete = [];
            $scope.chkPrint = [];
            $scope.chkAddDisable = [];
            $scope.chkEditDisable = [];
            $scope.chkDeleteDisable = [];
            $scope.chkPrintDisable = [];
            $scope.NavMenuList = response.data.Result;

            $scope.SetFocus('#ddlModule', true);
            $scope.hideLoader();
        });
    };
    $scope.$watch('ModuleId', function () {
        if (typeof($scope.ModuleId) === 'undefined') return;
        $scope.GetSubMenuList();
    });
    $scope.$watch('ListedUser', function () {
        if (typeof ($scope.ListedUser) === 'undefined') return;
        $scope.GetSubMenuList();
        //$scope.GetEmployeeDetails($scope.ListedUser);
    });
    $scope.chkRowAll = function(index) {
        $scope.chkAdd[index] = $scope.chkAllow[index];
        $scope.chkEdit[index] = $scope.chkAllow[index];
        $scope.chkDelete[index] = $scope.chkAllow[index];
        $scope.chkPrint[index] = $scope.chkAllow[index];
        if ($scope.chkAllow[index] == true) {
            $scope.chkAddDisable[index] = false;
            $scope.chkEditDisable[index] = false;
            $scope.chkDeleteDisable[index] = false;
            $scope.chkPrintDisable[index] = false;
        } else {
            $scope.chkAddDisable[index] = true;
            $scope.chkEditDisable[index] = true;
            $scope.chkDeleteDisable[index] = true;
            $scope.chkPrintDisable[index] = true;
        }
    }
    $scope.$watch('chkAll', function() {
        if (typeof($scope.chkAll) === 'undefined') return;
        $scope.chkAllRow();
    });
    $scope.hide = true;
    $scope.$watch('NavMenuList', function() {
        if (typeof($scope.NavMenuList) === 'undefined') {
            $scope.hide = true;
        } else {
            if ($scope.NavMenuList.length > 0) {
                $scope.hide = false;
            } else {
                $scope.hide = true;
            }
        }
    });
    $scope.chkAllRow = function() {
        for (var index = 0; index < $scope.NavMenuList.length; index++) {
            $scope.chkAllow[index] = $scope.chkAll;
            $scope.chkAdd[index] = $scope.chkAll;
            $scope.chkEdit[index] = $scope.chkAll;
            $scope.chkDelete[index] = $scope.chkAll;
            $scope.chkPrint[index] = $scope.chkAll;
            if ($scope.chkAll == true) {
                $scope.chkAddDisable[index] = false;
                $scope.chkEditDisable[index] = false;
                $scope.chkDeleteDisable[index] = false;
                $scope.chkPrintDisable[index] = false;
            } else {
                $scope.chkAddDisable[index] = true;
                $scope.chkEditDisable[index] = true;
                $scope.chkDeleteDisable[index] = true;
                $scope.chkPrintDisable[index] = true;
            }
        }
    }
    $scope.SaveRecord = function() {
        debugger;
        if (isValidate()) {
            var MenuList = [];
            var collectionobj = {};
            collectionobj.ModuleId = $scope.ModuleId;
            collectionobj.EmployeeCode = $scope.ListedUser;
            $("table tbody tr").each(function() {
                debugger;
                var row = $(this);
                var chkAllow = row.find("input[type='checkbox']#chkAllow");
                if (chkAllow.prop("checked")) {
                    var MenuDetails = {};
                    MenuDetails["MenuId"] = row.find("input[type='hidden']#hfMenuId").val();
                    MenuDetails["SubMenuId"] = row.find("input[type='hidden']#hfSubMenuId").val();
                    var chkAdd = row.find("input[type='checkbox']#chkAdd");
                    var chkEdit = row.find("input[type='checkbox']#chkEdit");
                    var chkDelete = row.find("input[type='checkbox']#chkDelete");
                    var chkPrint = row.find("input[type='checkbox']#chkPrint");
                    MenuDetails["Add"] = chkAdd.prop("checked");
                    MenuDetails["Edit"] = chkEdit.prop("checked") 
                    MenuDetails["Delete"] = chkDelete.prop("checked") 
                    MenuDetails["Print"] = chkPrint.prop("checked") 
                    MenuList.push(MenuDetails);
                }
            });
            collectionobj.MenuList = MenuList;
         
            collectionobj.BranchCode = BranchCode;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Action = 1;
            var getData = myService.methode('POST', "../Dashboard/InsertMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function(response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    };
    $scope.DeleteRecord = function() {
        deleteConfirmbox("Do you want to delete this record?", $scope.Delete);
    };
    $scope.Delete = function() {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.ModuleId = $scope.ModuleId; 
            collectionobj.BranchCode = BranchCode;   
            collectionobj.LoginId = $scope.ListedUser;
            collectionobj.Action = 3;
            var getData = myService.methode('POST', "../Dashboard/InsertMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function(response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    };
    $scope.ClearControl = function(flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        } else {
            clearConfirmbox("Do you want to clear fields?", function() {
                $scope.ResetControl(0);
            });
        }
    };
    $scope.ResetControl = function(flag) {
        debugger;
        $scope.Save = "Save";
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableAdd = false;
        $scope.hfId = "";
        $scope.chkAllow = [];
        $scope.chkAdd = [];
        $scope.chkEdit = [];
        $scope.chkDelete = [];
        $scope.chkPrint = [];
        $scope.chkAddDisable = [];
        $scope.chkEditDisable = [];
        $scope.chkDeleteDisable = [];
        $scope.chkPrintDisable = [];


        angular.element("#ddlModule").focus();
        $scope.ModuleId = "";
        $scope.ListedUser = "";
        $scope.EmployeeDetails = "";
        if (flag == 0) {
            showMsgBox('4');
        };
    }
    $scope.MenuList = [];
    $scope.SearchRecord = function() {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        started();
    };

    function started() {
        var collectionobj = {};
        collectionobj.Action = 4; 
        collectionobj.BranchCode = BranchCode;  
        var getData = myService.methode('POST', "../Dashboard/SearchMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function(response) {
            var tblheader = [{
                "HeaderText": "Sr.No.",
                "HeaderValue": "Id",
                "Width": "40px",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
                 , "CssClass": "srno"
            }, {
                "HeaderText": "Module",
                "Value": "ModuleId",
                "HeaderValue": "ModuleName",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            }, {
                "HeaderText": "Employee Name",
                "Value": "EmpId",
                "HeaderValue": "Name",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            }];
            debugger;
            $scope.MenuList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function() {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.ModuleId = $(this).find('input[type="hidden"]#hdModuleName').val();
                $scope.MenuList = $filter('filter')($scope.MenuList, {
                    'ModuleId': $scope.ModuleId
                });
                $scope.ListedUser = $(this).find('input[type="hidden"]#hdName').val();
                $scope.GetSubMenuList();
                $scope.Save = "Edit";
                $scope.disableDelete = true;
                $scope.disablePrint = true;
                $scope.disableAdd = false;
                $scope.$applyAsync();
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();
            });
        });
    };
    $scope.PrintRecord = function() {
        var tblheader = [{
            "HeaderText": "Sr.No.",
            "HeaderValue": "Id",
            "Width": "40px",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
            , "CssClass": "srno"
        }, {
            "HeaderText": "Module",
            "Value": "ModuleId",
            "HeaderValue": "ModuleName",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        }, {
            "HeaderText": "Employee Name",
            "Value": "EmployeeCode",
            "HeaderValue": "Name",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        }];
        $scope.PrintMaster(tblheader, $scope.MenuList, window.document.title);
    };
};