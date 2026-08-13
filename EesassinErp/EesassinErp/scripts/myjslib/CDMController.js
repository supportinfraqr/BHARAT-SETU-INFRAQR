app.CDMController = function ($scope, $element, $filter, $sce, myService) {
    $(document).ready(function () {
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
     


    $scope.BindClient = function () {
        var collectionobj = {};
        collectionobj.ActionType = 9; 
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.ListedUsers = response.data.Result;;
        });
    } 
    $scope.GetSubMenuList = function () {
        debugger;
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.ClientId = $scope.ClientId;
        var getData = myService.methode('POST', '../CDM/GetCDM', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
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
            $scope.NavMenuList = response.data; 
            $scope.SetFocus('#ddlModule', true);
           
            $scope.hideLoader();
        });
    };
    $scope.$watch('ModuleId', function () {
        if (typeof ($scope.ModuleId) === 'undefined') return;
        $scope.GetSubMenuList();
    });
    $scope.$watch('ListedUser', function () {
        if (typeof ($scope.ListedUser) === 'undefined') return;
        $scope.GetSubMenuList();
        //$scope.GetEmployeeDetails($scope.ListedUser);
    });
    $scope.chkRowAll = function (index) {
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
    $scope.$watch('chkAllow', function () {
        if (typeof ($scope.chkAll) === 'undefined') return;
        $scope.chkAllRow();
    });
    $scope.hide = true;
    $scope.$watch('NavMenuList', function () {
        if (typeof ($scope.NavMenuList) === 'undefined') {
            $scope.hide = true;
        } else {
            if ($scope.NavMenuList.length > 0) {
                $scope.hide = false;
            } else {
                $scope.hide = true;
            }
        }
    });
    $scope.chkAllRow = function () {
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
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            var MenuList = [];
            var collectionobj = {};
            collectionobj.ClientId = $scope.ClientId;
            $("table tbody tr").each(function () {
                debugger;
                var row = $(this);
                var chkAllow = row.find("input[type='checkbox']#chkAllow");
                if (chkAllow.prop("checked")) {
                    var MenuDetails = {};
                    MenuDetails["MenuId"] = row.find("input[type='hidden']#hfMenuId").val();
                    MenuList.push(MenuDetails);
                }
            });
            collectionobj.MenuList = MenuList;
             
            collectionobj.CreatedBy = LoginId;
            collectionobj.Action = 1;
            var getData = myService.methode('POST', "../CDM/IUDCDM", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.GetSubMenuList();
                }
            });
        }
    };
    $scope.DeleteRecord = function () {
        showMsgBox('999', 'Warning', 'Not Allowed', 'warning', 'btn-warning');
        return;
    };
    
    $scope.ClearControl = function (flag) {
        showMsgBox('999', 'Warning', 'Not Allowed', 'warning', 'btn-warning');
        return;
    };
    
    $scope.MenuList = [];
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        started();
    };

    function started() {
        var collectionobj = {};
        collectionobj.Action = 5; 
        var getData = myService.methode('POST', '../CDM/GetCDM', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            var tblheader = [{
                "HeaderText": "Row No.",
                "HeaderValue": "Id",
                "Width": "40px",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
                 , "CssClass": "srno"
            },
            {
                "HeaderText": "Sr.No.",
                "HeaderValue": "RowNo",
                "Width": "40px",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
                 , "CssClass": "srno"
            }, {
                "HeaderText": "Client Name",
                "Value": "ClientName",
                "HeaderValue": "ClientName",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            }, {
                "HeaderText": "Document Name",
                "Value": "DocumentName",
                "HeaderValue": "DocumentName",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "Created On",
                "Value": "CreatedOn",
                "HeaderValue": "CreatedOn",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            
            }];
            debugger;
          //  $scope.MenuList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                
                showMsgBox('999', 'Warning', 'Not Allowed', 'warning', 'btn-warning');
                return;
            });
        });
    };
    $scope.PrintRecord = function () {
        var tblheader = [{
            "HeaderText": "Sr.No.",
            "HeaderValue": "Id",
            "Width": "40px",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
            , "CssClass": "srno"
        }, {
            "HeaderText": "Document Name",
            "Value": "DocumentName",
            "HeaderValue": "DocumentName",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        }, {
            "HeaderText": "DocumentType",
            "Value": "DocumentType",
            "HeaderValue": "DocumentType",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        },
        {
            "HeaderText": "Frequency",
            "Value": "Frequency",
            "HeaderValue": "Frequency",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        },
        {
            "HeaderText": "Format Type",
            "Value": "FormatType",
            "HeaderValue": "FormatType",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        }
        , {
            "HeaderText": "Note",
            "Value": "Note",
            "HeaderValue": "Note",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        },
        {
            "HeaderText": "Mandatory",
            "Value": "Mandatory",
            "HeaderValue": "Mandatory",
            "Width": "100%",
            "ShowColumn": "Yes",
            "ImageColumn": "No"
        }];

        $("table tbody tr").each(function () {
            debugger;
            var row = $(this);
            var chkAllow = row.find("input[type='checkbox']#chkAllow");
            if (chkAllow.prop("checked")) {
                var MenuDetails = {};
                MenuDetails["MenuId"] = row.find("input[type='hidden']#hfMenuId").val();
                MenuList.push(MenuDetails);
            }
        });
        $scope.MenuList = MenuList;
        $scope.PrintMaster(tblheader, $scope.MenuList, window.document.title);
    };
};