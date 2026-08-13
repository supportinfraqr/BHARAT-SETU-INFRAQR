app.RetailClientStoreMappingController = function ($scope, $element, $filter, myService) {
    $scope.hfLicenseId = 0;
    $scope.selectedStores = [];
    $scope.selectedUsers = [];
    $scope.IsOpen = false;
    $scope.chkAllow = [];
    $scope.OverallStoresList = [];
    $scope.disableSearch = true;
    $scope.BindAllStoreList = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.Id = $scope.UserId;
        var getData = myService.nonasyncmethode('POST', "../Retail/GetStore", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.chkAll = false;
            $scope.IsOpen = true;
            $scope.chkAllow = [];
            $scope.AllStoreList = response.data.Result;

            $scope.clear();
            //  $scope.chkAllow = [];
            if ($scope.AllStoreList && $scope.AllStoreList.length > 0) {
                for (var i = 0; i < $scope.AllStoreList.length; i++) {
                    var store = $scope.AllStoreList[i];
                    //if (store.IsAllow) {
                    if ($scope.OverallStoresList && $scope.OverallStoresList.length > 0) {
                        for (var j = 0; j < $scope.OverallStoresList.length; j++) {
                            var overallStore = $scope.OverallStoresList[j];
                            if (overallStore.StoreId === store.StoreId) {
                                overallStore.IsAllow = store.IsAllow;
                                //$scope.chkAllow[j] = store.IsAllow;
                                // $scope.$apply();
                                break;
                            }
                        }
                        //   }
                    }

                }
            }

        });
    }

    $scope.clear = function () {
        if ($scope.OverallStoresList && $scope.OverallStoresList.length > 0) {
            for (var index = 0; index < $scope.OverallStoresList.length; index++) {
                //$scope.chkAllow[index] = $scope.chkAll;
                $scope.OverallStoresList[index].IsAllow = false;
            }
        }
    }

        $scope.chkAllRow = function () {
            for (var index = 0; index < $scope.OverallStoresList.length; index++) {
                //$scope.chkAllow[index] = $scope.chkAll;
                $scope.OverallStoresList[index].IsAllow = $scope.chkAll;
            }
        }

        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.BindModuleTypeList = function () {
            var moduleTypeLst = [
                { "Module_Type": "Auditor", "Id": "3" },
                { "Module_Type": "Client", "Id": "4" },
            ];
            $scope.AllModuleTypeList = moduleTypeLst;
        }

        $scope.AllPartySiteLoad = function () {
            $scope.AllPartyList = [
                { "PartyId": MapId, "PartyName": Name },
           
            ];
        }
        $scope.AllUserListsLoad = function (PartyId) {
            var collectionobj = {};
            collectionobj.ActionType = 15;
            collectionobj.Id = PartyId;
            var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.AllUserList = response.data.Result;
            });
            var collectionobj1 = {};
            collectionobj1.ActionType = 11;
            collectionobj1.Id = PartyId;
            var getData1 = myService.methode('POST', "../Retail/GetStore", '{obj:' + JSON.stringify(collectionobj1) + '}');
            getData1.then(function (response) {
                $scope.OverallStoresList = response.data.Result;
            });
            console.log($scope.OverallStoresList);
            $scope.IsOpen = true;

        }

        $scope.SaveRecord = function () {
            if ($scope.Save == 'Edit') {
                alertbox("Not Athority, Please Save Again", "", "")
                return false;
            }
            if (isValidate()) {
                $scope.showLoader();
                var collectionobj = {};
                var BulkStore = [];
                const FORMAT = "DD-MM-YYYY";
                collectionobj.PartyTypeId = $scope.PartyTypeId;
                collectionobj.UserId = $scope.UserId;
                collectionobj.PartyId = $scope.PartyId;
                $("table tbody tr").each(function () {
                //    debugger;
                    var row = $(this);
                    var chkAllow = row.find("input[type='checkbox']#chkAllow");
                    if (chkAllow.prop("checked")) {
                        var MenuDetails = {};
                        MenuDetails["StoreId"] = row.find("input[type='hidden']#hfMenuId").val();
                        BulkStore.push(MenuDetails);
                    }
                });
                if (BulkStore.length <= 0) {
                    showMsgBox('999', 'Warning', 'Please Select Atleast one Store', 'warning', 'btn-warning');
                    return;
                }
                collectionobj.DocumentList = BulkStore;
                collectionobj.CreatedBy = LoginId;
                collectionobj.ActionType = 1;
                var getData = myService.methode('POST', ("../Retail/InsertUpdateDelStoreMapping"), JSON.stringify(collectionobj));
                getData.then(function (response) {
                    if (showMsgBox(response.data.Result)) {
                        $scope.IsOpen = false;
                        $scope.FireEmail(10, $scope.UserId, $scope.StoreId)
                        $scope.ClearControl(1);
                    }
                });
            }
        }
        $scope.DeleteRecord = function () {
            deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
        };

        $scope.deleteRecord = function () {

            debugger;
            var collectionobj = {};
            collectionobj.ActionType = 5;
            collectionobj.PartyTypeId = $scope.hfId;
            var getData = myService.methode('POST', "../Retail/InsertUpdateDelStoreMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        };
        $scope.ClearControl = function (flag) {
            if (flag == 1) {
                $scope.ResetControl(flag);
            }
            else {
                clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
            }
        };

        $scope.ResetControl = function (flag) {

            $scope.disableDelete = true;
            $scope.disableDelete = true;
            $scope.disableSearch = true;
            $scope.PartyTypeId = "4";
            $scope.selectedUsers = [];
            $scope.selectedStores = [];
            $scope.chkAllow = [];
            $scope.PartyId = "";
            $scope.UserId = "";
            $scope.StoreId = "";
            $scope.StartDate = "";
            $scope.EndDate = "";
            $scope.Save = "Save";
            if (flag == 0) {
                showMsgBox('4');
            };
        }

        $scope.SearchRecord = function () {
            showMsgBox('999', 'Warning', 'Not Athority Please Save Again"', 'warning', 'btn-warning');
            return;
        };

        $scope.started = function () {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.ActionType = 3;
            $scope.AllPartySiteLoad();
            $scope.BindAllStoreList();
            var getData = myService.methode('POST', ("../Retail/SearchStoreMapping"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                var tblheader =
                    [
                        { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },

                        { "HeaderText": "PartyType", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                        { "HeaderText": "PartyName", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                        { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                        { "HeaderText": "StoreName", "HeaderValue": "StoreName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                        { "HeaderText": "StoreCode", "HeaderValue": "StoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    ];

                $scope.StoreMappingList = response.data.Result;
                loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
                $('#example tbody').on('dblclick', 'tr', function () {

                    showMsgBox('999', 'Warning', 'Not Athority Please Save Again"', 'warning', 'btn-warning');
                    return;
                });
            });
            $scope.hideLoader();
        };

        $scope.SelectAllUser = function () {
            if ($scope.selectAll) {
                $scope.selectedUsers = $scope.AllPartyList.map(function (user) {
                    return user.PartyId;
                });
                $scope.disableUserDropdown = true;
            } else {
                $scope.disableUserDropdown = false;
                $scope.selectedUsers = [];
            }
        };

        $scope.chk = [];
        $scope.change = function (index) {
            if ($scope.chk[index] == true) {
                $scope.chk[index] = false;
            }
            else {
                $scope.chk[index] = true;
            }

            seprator = ""
            stringbuilder = "";
            var count = 0;
            var chkflag = 0;
            $.each($scope.chk, function (index, val) {
                if (val === true) {
                    stringbuilder = stringbuilder + seprator;
                    stringbuilder = stringbuilder + index;
                    $scope.BulkStore = stringbuilder;
                    seprator = ","
                    count += 1;
                }
                else {
                    chkflag = 1;
                }
            });
            if (chkflag == 1) { $scope.ChkAll = false } else { $scope.ChkAll = true }
            if ($scope.BulkStore.length == count) {
                $scope.ChkAll = true
            }
            else {
                $scope.ChkAll = false
            }
            $scope.$applyAsync();
        }

    }
