app.RetailIndustryMappingController = function ($scope, $element, $filter, myService) {
    $scope.hfLicenseId = 0;
    $scope.selectedStores = [];
    $scope.selectedUsers = [];
    $scope.IsOpen = false;
    $scope.chkAllow = [];
    $scope.OverallList = [];
    $scope.disableSearch = true;
  

    $scope.clear = function () {
        if ($scope.OverallList && $scope.OverallList.length > 0) {
            for (var index = 0; index < $scope.OverallList.length; index++) {
                //$scope.chkAllow[index] = $scope.chkAll;
                $scope.OverallList[index].IsAllow = false;
            }
        }
    }

    $scope.AllIndustry = function () {
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.Id = MapId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0)
            { $scope.IndustryList = response.data.Result }

        });
    }


        $scope.chkAllRow = function () {
            for (var index = 0; index < $scope.OverallList.length; index++) {
                //$scope.chkAllow[index] = $scope.chkAll;
                $scope.OverallList[index].IsAllow = $scope.chkAll;
            }
        }

        $scope.disableDelete = true;
        $scope.disablePrint = true;
         
    $scope.AllLicense = function () {
        $scope.showLoader();
            var collectionobj = {};
            collectionobj.ActionType = 13;
            collectionobj.Id = $scope.IndustryId;
            var getData = myService.methode('POST', ("../Retail/SearchLicenseDocumentMaster"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.OverallList = response.data.Result;
                $scope.hideLoader();
            });
         
            $scope.IsOpen = true;

        }

    $scope.SaveRecord = function () {

        if (isValidate()) {

            var collectionobj = {};
            var BulkStore = [];

            collectionobj.UserId = $scope.IndustryId;
            collectionobj.PartyId = MapId;

            angular.forEach($scope.OverallList, function (x) {
                if (x.IsAllow === true) {
                    BulkStore.push({
                        StoreId: x.LicenseId   // 👈 direct model se
                    });
                }
            });

            if (BulkStore.length === 0) {
                showMsgBox('999', 'Warning',
                    'Please Select Atleast one License',
                    'warning', 'btn-warning');
                return;
            }

            collectionobj.DocumentList = BulkStore;
            collectionobj.CreatedBy = LoginId;
            collectionobj.ActionType = 6;

            myService.methode(
                'POST',
                "../Retail/InsertUpdateDelStoreMapping",
                JSON.stringify(collectionobj)
            ).then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.IsOpen = false;
                    $scope.clear(); // optional
                }
            });
        }
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
