app.BranchMenuPermissionController = function ($scope, $element, $filter, myService) {
    debugger;
    $(document).ready(function() {
        $('#ddlAdmin').addClass('validate');
    });
    $scope.chkAllow = [];

    $scope.GetSubMenuList = function() {
        $scope.showLoader(); 
        $scope.collectionobj = {};
        $scope.collectionobj["ModuleId"] = $scope.ModuleId;
        $scope.collectionobj["BranchCode"] = BranchCode;
        $scope.collectionobj["LoginId"] = LoginId;

        var getData = myService.methode('POST', '../Dashboard/SubMenuList', '{obj:' + JSON.stringify($scope.collectionobj) + '}');
        getData.then(function(response) {
            debugger;
            $scope.chkAll = false;
            $scope.chkAllow = [];

            $scope.NavMenuList = response.data.Result;

            $scope.SetFocus('#ddlModule', true);
            $scope.hideLoader();
        });
    };
    $scope.$watch('ModuleId', function() {
        if (typeof($scope.ModuleId) === 'undefined') return;
        $scope.GetSubMenuList();
    });
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
        }
    }
    $scope.SaveRecord = function() {
        debugger;
        if (isValidate()) {
            var MenuList = [];
            var collectionobj = {};
            collectionobj.ModuleId = $scope.ModuleId;
            $("table tbody tr").each(function() {
                debugger;
                var row = $(this);
                var chkAllow = row.find("input[type='checkbox']#chkAllow");
                if (chkAllow.prop("checked")) {
                    var MenuDetails = {};
                    MenuDetails["MenuId"] = row.find("input[type='hidden']#hfMenuId").val();
                    MenuDetails["SubMenuId"] = row.find("input[type='hidden']#hfSubMenuId").val();                
                    MenuList.push(MenuDetails);
                }
            });
            collectionobj.MenuList = MenuList; 
            collectionobj.BranchCode = BranchCode;

            collectionobj.CreatedBy = JSON.parse(LoginId);
            collectionobj.Action = 1;
            var getData = myService.methode('POST', "../Dashboard/InsertBranchMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
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
            collectionobj.CreatedBy = LoginId;
            collectionobj.Action = 3;
            var getData = myService.methode('POST', "../Dashboard/InsertBranchMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
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
        $scope.hfId = "";
        angular.element("#ddlModule").focus();
        $scope.ModuleId = "";
        $scope.EmployeeCode = "";
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
         var getData = myService.methode('POST', "../Dashboard/SearchBranchMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
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
                "HeaderText": "For",
                "HeaderValue": "Name",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            }];
            $scope.MenuList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function() {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.ModuleId = $(this).find('input[type="hidden"]#hdModuleName').val();
                $scope.MenuList = $filter('filter')($scope.MenuList, {
                    'ModuleId': $scope.ModuleId
                });
                $scope.GetSubMenuList();
                $scope.Save = "Edit";
                $scope.disableDelete = false;
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