app.RoleMenuPermissionController = function ($scope, $element, $filter, myService) {
    $(document).ready(function () {
        $('#ddlUser').addClass('validate');
    });

    $scope.PagesSectionMasterList = [];
    $scope.chkAllow = [];
    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [ 
            { "Module_Type": "Client", "Id": "4" },
        ];
        $scope.AllModuleTypeList = moduleTypeLst;
    }
    $scope.AllUserListsLoad = function (PartyId) {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.Id = PartyId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            var userList = response.data.Result || []; 
            // ❌ Remove current LoginId user
            $scope.AllUserList = userList.filter(function (item) {
                return item.LoginId != LoginId;   // LoginId = current logged-in user
            });
        });
    }
    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        //var type = "";
        //if ($scope.PartyType == 3) {
        //    type = "Auditor";
        //} else if ($scope.PartyType == 4) {
        //    type = "Client";
        //}
        //else { type = ""; }
        collectionobj.PartyType = "Client";
        collectionobj.PartyId = LoginId; 
        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;
        });
    }
    $scope.GetPagesSectionMasterList = function () {
        debugger;
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.PartyId = $scope.PartyId;
        collectionobj.PartyType = "4";
        collectionobj.UserId = $scope.UserId
        collectionobj.RoleId = $scope.Id;
        collectionobj.LoginId = $scope.LoginId;

        var getData = myService.methode('POST', '../Dashboard/PagesSectionMasterList', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.PagesSectionMasterList = response.data.Result;
            $scope.SetFocus('#ddlRole', true);
            $scope.hideLoader();
        });
    };
    $scope.$watch('Id', function () {
        if (typeof ($scope.Id) === 'undefined') return;
        $scope.GetPagesSectionMasterList();
    });
    //$scope.$watch('chkAll', function () {
    //    if (typeof ($scope.chkAll) === 'undefined') return;
    //    $scope.chkAllRow();
    //});
    //$scope.chkAllRow = function (columnName) {
    //    for (var index = 0; index < $scope.PagesSectionMasterList.length; index++) {
    //        $scope.chkAllow[index][columnName] = $scope['chkAll' + columnName];
    //    }
    //};
    $scope.hide = true;
    $scope.$watch('PagesSectionMasterList', function () {
        if (typeof ($scope.PagesSectionMasterList) === 'undefined') {
            $scope.hide = true;
        } else {
            if ($scope.PagesSectionMasterList.length > 0) {
                $scope.hide = false;
            } else {
                $scope.hide = true;
            }
        }
    });
    $scope.SaveRecord = function () {
        if (isValidate()) {
            var SectionList = [];
            $("table tbody tr").each(function () {
                var row = $(this);
                //var Id = row.find("input[type='hidden']#hfId").val();
                var SectionId = row.find("input[type='hidden']#hfId").val();
                var chkAllowView = row.find("input[type='checkbox']#chkAllowView").prop("checked");
                var chkAllowEdit = row.find("input[type='checkbox']#chkAllowEdit").prop("checked");
                var chkAllowDelete = row.find("input[type='checkbox']#chkAllowDelete").prop("checked");
                var chkAllowUpload = row.find("input[type='checkbox']#chkAllowUpload").prop("checked");
                var chkAllowDownload = row.find("input[type='checkbox']#chkAllowDownload").prop("checked");
                var chkAllowNewStore = row.find("input[type='checkbox']#chkAllowNewStore").prop("checked");
                var chkAllowNewEmployee = row.find("input[type='checkbox']#chkAllowNewEmployee").prop("checked");
                var chkAllowChk1 = row.find("input[type='checkbox']#chkAllowChk1").prop("checked");
                var chkAllowChk2 = row.find("input[type='checkbox']#chkAllowChk2").prop("checked");
                var chkAllowVerify = row.find("input[type='checkbox']#chkAllowVerify").prop("checked");

                if (chkAllowView || chkAllowEdit || chkAllowDelete || chkAllowUpload || chkAllowDownload || chkAllowNewStore || chkAllowNewEmployee
                    || chkAllowChk1 || chkAllowChk2 || chkAllowVerify) {
                    var SectionDetails = {};
                    SectionDetails["SectionId"] = SectionId;
                    SectionDetails["View"] = chkAllowView;
                    SectionDetails["Edit"] = chkAllowEdit;
                    SectionDetails["Delete"] = chkAllowDelete;
                    SectionDetails["Upload"] = chkAllowUpload;
                    SectionDetails["Download"] = chkAllowDownload;
                    SectionDetails["NewStore"] = chkAllowNewStore;
                    SectionDetails["NewEmployee"] = chkAllowNewEmployee;
                    SectionDetails["Checkbox1"] = chkAllowChk1;
                    SectionDetails["Checkbox2"] = chkAllowChk2;
                    SectionDetails["Verify"] = chkAllowVerify;

                    SectionList.push(SectionDetails);
                }
            });

            var collectionobj = {};
            collectionobj.ModuleType = "4";
            collectionobj.LoginId = $scope.PartyId;
            collectionobj.UserId = $scope.UserId;
            collectionobj.EmployeeCode = "";
            collectionobj.SectionList = SectionList;
            collectionobj.BranchCode = $scope.Id;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Action = 1;

            var getData = myService.methode('POST', "../Dashboard/InsertSectionPermissionForRole", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    };
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.Delete);
    };
    $scope.Delete = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.ModuleId = $scope.Id;
            collectionobj.BranchCode = BranchCode;
            collectionobj.LoginId = $scope.ListedUser;
            collectionobj.Action = 3;
            var getData = myService.methode('POST', "../Dashboard/InsertMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    };
    $scope.ClearControl = function (flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        } else {
            clearConfirmbox("Do you want to clear fields?", function () {
                $scope.ResetControl(0);
            });
        }
    };
    $scope.ResetControl = function (flag) {
        debugger;
        $scope.Save = "Save";
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableAdd = false;
        $scope.hfId = "";

        angular.forEach($scope.chkAllow, function (value, key) {
            angular.forEach(value, function (val, k) {
                $scope.chkAllow[key][k] = false;
            });
        });
        angular.element("#ddlRole").focus();
        $scope.Id = "";
        $scope.ListedUser = "";
        $scope.EmployeeDetails = "";
        if (flag == 0) {
            showMsgBox('4');
        };
    }
    $scope.MenuList = [];
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        started();
    };

    function started() {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.BranchCode = BranchCode;
        collectionobj.LoginId = $scope.LoginId;
        var getData = myService.methode('POST', "../Dashboard/SearchSectionandRoleMenuPermission", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            var tblheader = [{
                "HeaderText": "Sr.No.",
                "HeaderValue": "Id",
                "Width": "40px",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
                , "CssClass": "srno"
            },
            {
                "HeaderText": "PageName",
                "Value": "PageName",
                "HeaderValue": "PageName",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "SectionName",
                "Value": "SectionName",
                "HeaderValue": "SectionName",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "PartyName",
                "Value": "PartyName",
                "HeaderValue": "User",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "User",
                "Value": "User",
                "HeaderValue": "User",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            
            {
                "HeaderText": "RoleName",
                "Value": "RoleName",
                "HeaderValue": "RoleName",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "PartyType",
                "Value": "PartyType",
                "HeaderValue": "PartyType",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "ViewFlag",
                "Value": "ViewFlag",
                "HeaderValue": "ViewFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "EditFlag",
                "Value": "EditFlag",
                "HeaderValue": "EditFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "Bulk Upload",
                "Value": "DeleteFlag",
                "HeaderValue": "DeleteFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "DownloadFlag",
                "Value": "DownloadFlag",
                "HeaderValue": "DownloadFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "NewStoreFlag",
                "Value": "NewStoreFlag",
                "HeaderValue": "NewStoreFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "NewEmployeeFlag",
                "Value": "NewEmployeeFlag",
                "HeaderValue": "NewEmployeeFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "Checkbox1Flag",
                "Value": "Checkbox1Flag",
                "HeaderValue": "Checkbox1Flag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "Checkbox1Flag",
                "Value": "Checkbox1Flag",
                "HeaderValue": "Checkbox1Flag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            },
            {
                "HeaderText": "VerifyFlag",
                "Value": "VerifyFlag",
                "HeaderValue": "VerifyFlag",
                "Width": "100%",
                "ShowColumn": "Yes",
                "ImageColumn": "No"
            }
            ];
            debugger;
            $scope.MenuList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                showMsgBox("Edit Not Authorized.");
                //var row = $('#example').DataTable().row(this).data();
                //$scope.Id = $(this).find('input[type="hidden"]#hdModuleName').val();
                //$scope.MenuList = $filter('filter')($scope.MenuList, {
                //    'Id': $scope.Id
                //});
                //$scope.ListedUser = $(this).find('input[type="hidden"]#hdName').val();
                //$scope.GetPagesSectionMasterList();
                //$scope.Save = "Edit";
                //$scope.disableDelete = true;
                //$scope.disablePrint = true;
                //$scope.disableAdd = false;
                //$scope.$applyAsync();
                //$('.br-pageheader').fadeIn();
                //$('#collapseinputbox').fadeIn();
                //$('#CollapseSearchTableList').fadeOut();
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
            "HeaderText": "Module",
            "Value": "Id",
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

    $scope.checkUncheckAll = function () {
        // Make sure PagesSectionMasterList and chkAllow have data before proceeding
        if ($scope.PagesSectionMasterList.length === 0 || $scope.chkAllow.length === 0) {
            return;
        }

        // Rest of the function remains the same
        var isChecked = $('#chkMaster').prop('checked');

        for (var i = 0; i < $scope.PagesSectionMasterList.length; i++) {
            $scope.chkAllow[i]['View'] = isChecked;
            $scope.chkAllow[i]['Edit'] = isChecked;
            $scope.chkAllow[i]['Delete'] = isChecked;
            $scope.chkAllow[i]['Upload'] = isChecked;
            $scope.chkAllow[i]['Download'] = isChecked;
            $scope.chkAllow[i]['NewStore'] = isChecked;
            $scope.chkAllow[i]['NewEmployee'] = isChecked;
            $scope.chkAllow[i]['Checkbox1'] = isChecked;
            $scope.chkAllow[i]['Checkbox2'] = isChecked;
            $scope.chkAllow[i]['Verify'] = isChecked;
        }
    };
};