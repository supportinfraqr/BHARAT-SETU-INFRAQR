app.AdminDashboardcontroller = function ($scope, $element, $filter, myService, $http) {
    // ---------- MODEL ----------
    $scope.StartDate = new Date();
    $scope.addDoc = {
        docName: '',
        locationIds: [],
        locations: []
    };
    $scope.EditRow = function (row) {
        row.isEdit = true; 
        row._oldDocumentName = row.DocumentName;
    };
    $scope.SetDefault = function (selectedRow) {

        angular.forEach($scope.groupedDocs, function (row) {
            if (row !== selectedRow) {
                row.IsDefault = false;
            }
        });

        selectedRow.IsDefault = true;
    };
    $scope.Updaterow = function (row) {
        $scope.ManageLog('Update Compliance Document')
        row.isEdit = false;
        console.log("Saved:", row.DocumentName);
        if (!row || !row.ComplianceDocId) {
            showMsgBox('999', 'Error', 'Invalid record selected.', 'error', 'btn-danger');
            return;
        } 

        $scope.showLoader(); 
        var fd = new FormData();
        fd.append('Action', 2);  
        fd.append('locationId', row.ComplianceDocId);
        fd.append('IsDefault', row.IsDefault ? 1 : 0);   // 🔥 ADD THIS
        fd.append('DocumentName', row.DocumentName);
        fd.append('Id', MapId);

        $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, { 
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (res) {
                $scope.hideLoader();
                if (res.data && res.data.Result) {
                    showMsgBox(res.data.Result);
                    $scope.BindComDoc();
                } else {
                    showMsgBox('999', 'Error', res.data.Message || 'Update failed.', 'error', 'btn-danger');
                }
            })
            .catch(function () {
                $scope.hideLoader();
                showMsgBox('999', 'Error', 'Server error.', 'error', 'btn-danger');
            })
            .finally(function () {
                $scope.hideLoader();
            });
    };

    $scope.Deleterow = function (row)
    {
        $scope.ManageLog('Delete Compliance Document')
        if (!row || !row.RowData.ComplianceDocId) {
            showMsgBox('999', 'Error', 'Invalid record selected.', 'error', 'btn-danger');
            return;
        }
 

        $scope.showLoader();

        var fd = new FormData();
        fd.append('Action', 3); // UPDATE
        fd.append('locationId', row.RowData.ComplianceDocId)

        $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (res) {
                $scope.hideLoader();
                if (res.data && res.data.Result) {
                    showMsgBox(res.data.Result);
                    $scope.BindComDoc();
                } else {
                    showMsgBox('999', 'Error', res.data.Message || 'Delete failed.', 'error', 'btn-danger');
                }
            })
            .catch(function () {
                $scope.hideLoader();
                showMsgBox('999', 'Error', 'Server error.', 'error', 'btn-danger');
            })
            .finally(function () {
                $scope.hideLoader();
            });
    };

    
    $scope.CancelEdit = function (row) {
        $scope.ManageLog('Cancel Compliance Document')
        row.DocumentName = row._oldDocumentName;
        row.isEdit = false;
    };

    // ---------- TOGGLE SINGLE LOCATION ----------
    $scope.toggleLocation = function (row, loc, $event) {
        if ($event) $event.stopPropagation();

        var idx = row.locationIds.indexOf(loc.StoreId);

        if (idx > -1) {
            row.locationIds.splice(idx, 1);
            row.locations.splice(idx, 1);
        } else {
            row.locationIds.push(loc.StoreId);
            row.locations.push(loc.StoreName);
        }
    };

    // ---------- SELECT / UNSELECT ALL ----------
    $scope.selectAllLocations = function (row, $event) {
        if ($event) $event.stopPropagation();

        if (row.locationIds.length === $scope.locationLists.length) {
            // ❌ Unselect all
            row.locationIds = [];
            row.locations = [];
        } else {
            // ✅ Select all
            row.locationIds = [];
            row.locations = [];

            angular.forEach($scope.locationLists, function (loc) {
                row.locationIds.push(loc.StoreId);
                row.locations.push(loc.StoreName);
            });
        }
    };



    $scope.SaveCustomLicense = function ()
    {
         

        if (!$scope.addLicense.UniqueId) {
            showMsgBox('999', 'Alert', 'Please enter Unique Id.', 'warning', 'btn-warning');
            return;
        }


        $scope.addLicense.LicenseId = $scope.addLicense.selectedLicense.LicenseId;
        $scope.addLicense.Category = $scope.addLicense.selectedLicense.cid;
        $scope.showLoader();

        var fd = new FormData();
        fd.append('Action', 10);
        fd.append('LoginId', MapId);
        fd.append('LicenseId', $scope.addLicense.LicenseId);
        fd.append('Id', $scope.addLicense.Category);
        fd.append('LicenseName', $scope.addLicense.LicenseName);
        fd.append('UniqueId', $scope.addLicense.UniqueId);

        $http.post('../RetailSection/IUDLicense ', fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (res) {
                $scope.hideLoader();
                if (res.data && res.data.Result) {

                    showMsgBox(res.data.Result);

                    $scope.addLicense = {
                        LicenseId: '',
                        LicenseName: '',
                        UniqueId: ''
                    };
                    $scope.currentPage = 1;
                    $scope.pageSize = 10;
                    $scope.AllLicense();

                    $('#LicenseDocument').modal('hide');
                }
                else {
                    $scope.hideLoader();
                    showMsgBox('999', 'Error', 'Something went wrong.', 'error', 'btn-danger');
                }

            })
            .catch(function () {
                $scope.hideLoader();
                showMsgBox('999', 'Error', 'Server error.', 'error', 'btn-danger');
            })
            .finally(function () {
                $scope.hideLoader();
            });

    };
    // ---------- SAVE DOCUMENT ----------
    $scope.SaveDocument = function () {

        if (!$scope.addDoc.docName) {
            showMsgBox('999', 'Alert', 'Please enter Document Name.', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.addDoc.locationIds.length) {
            showMsgBox('999', 'Alert', 'Please select at least one Location.', 'warning', 'btn-warning');
            return;
        }

        $scope.showLoader();

        var fd = new FormData();
        fd.append('Action', 1);
        fd.append('Id', MapId);
        fd.append('DocumentName', $scope.addDoc.docName);
        fd.append('locationId', $scope.addDoc.locationIds.join(','));

        $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (res) {
                $scope.hideLoader();
                if (res.data && res.data.Result) {
                    showMsgBox(res.data.Result);

                    // reset
                    $scope.addDoc = {
                        docName: '',
                        locationIds: [],
                        locations: []
                    };
                    $scope.BindComDoc();
                    $('#AddDocumentModel').modal('hide');
                } else {
                    $scope.hideLoader();
                    showMsgBox('999', 'Error', 'Something went wrong.', 'error', 'btn-danger');
                }
            })
            .catch(function () {
                showMsgBox('999', 'Error', 'Server error.', 'error', 'btn-danger');
            })
            .finally(function () {
                $scope.hideLoader();
            });
    };

    // ---------- GET STORES ----------
    $scope.GETAllSTORE = function () {
        var obj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,
            PageSize: 999999,
            Searchby: ''
        };

        myService.methode('POST', '../RetailSection/GetStoreMaster', JSON.stringify(obj))
            .then(function (res) {
                $scope.locationLists = res.data.Result || [];
            });
    };

    $scope.openLocationPopup = function (row) {
        $scope.selectedDoc = row;
        $('#locationModal').modal('show');
    };

    $scope.BindComDoc = function () {
        $('#locationModal').modal('hide');
        $scope.showLoader();

        var collectionobj = {
            Action: 5,
            Id: MapId
        };

        myService.methode('POST', "../RetailSection/GetComDoc", JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.hideLoader();
                var data = response.data.Result || [];

                // 🔹 FRONT-END GROUPING (Document unique)
                let map = {};

                angular.forEach(data, function (row) {

                    // ⚠️ Prefer DocumentId if available
                    let key = row.DocumentId || row.DocumentName;

                    if (!map[key]) {
                        map[key] = {
                            ComplianceDocId: row.ComplianceDocId,
                            DocumentName: row.DocumentName,
                            CreatedDate: row.CreatedDate,
                            UserName: row.UserName,
                            IsDefault: row.IsDefault ,
                            isEdit: false,
                            show: false,
                            Locations: []
                        };
                    }

                    map[key].Locations.push({
                        StoreCode: row.StoreCode,
                        RowData: row   // original row safe for edit/delete
                    });
                });

                // Final list for UI
                $scope.groupedDocs = Object.values(map);

            })
            .finally(function () {
                $scope.hideLoader();
            });
    };


    $scope.BindMenuForDash = function () {
        var collectionobj = {};
        collectionobj.Action = 26;
        collectionobj.LoginId = MapId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) { 
            $scope.DashMenu = response.data.Result.length; 
            $scope.StoreCount = response.data.Result[0].StoreCount;
            $scope.ValidTo = response.data.Result[0].ValidTo;
            $scope.Duration = response.data.Result[0].Duration;
            $scope.PartyPlan = response.data.Result[0].PartyPlan;
            
             
        });
    }
    $scope.OpenAddUserModal = function () {
        $scope.UserNames = '';
        $scope.Password = '';

        // DOM level clear (browser autofill ko override)
        setTimeout(function () {
            document.querySelector('input[type="text"]').value = '';
            document.querySelector('input[type="password"]').value = '';
        }, 50);
    };
    $scope.UserList = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.BranchCode = BranchCode;
        collectionobj.LoginId = LoginId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.EmployeeList = response.data.Result; 
        });
    }
    $scope.BindUserActivity = function ()
    {

        var collectionobj = {
            Action: 25,
            BranchCode: BranchCode,
            LoginId: MapId
        };

        var getData = myService.methode(
            'POST',
            "../DashBoard/GetUserRegistration",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {

            var list = response.data.Result;

            var dateMap = {};
            $scope.activeCount = 0;
            $scope.inactiveCount = 0;

            angular.forEach(list, function (item) {

             
                    /* User Status Donut  */
                var activeCount = 0;
                var inactiveCount = 0;

                angular.forEach(list, function (item) {
                    if (item.IsActive == 1)
                        activeCount++;
                    else
                        inactiveCount++;
                });


                $scope.activeCount = activeCount;
                $scope.inactiveCount = inactiveCount;
                // destroy old chart (important)
                if ($scope.userStatusChartObj)
                    $scope.userStatusChartObj.destroy();

                $scope.userStatusChartObj = new Chart(
                    document.getElementById("userStatusChart"),
                    {
                        type: "doughnut",
                        data: {
                            labels: ["Active users", "Inactive users"],
                            datasets: [{
                                data: [activeCount, inactiveCount],
                                backgroundColor: ["#E45D27", "#ddd"],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            cutout: "70%",
                            plugins: {
                                legend: { display: false }
                            }
                        }
                    }
                );







                var d = new Date(item.LastLogin);
                var label = d.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short'
                });

                if (!dateMap[label]) {
                    dateMap[label] = { active: 0, inactive: 0 };
                }

                if (item.IsActive == 1)
                    dateMap[label].active++;
                else
                    dateMap[label].inactive++;
            });

            var labels = Object.keys(dateMap);
            var activeData = labels.map(l => dateMap[l].active);
            var inactiveData = labels.map(l => dateMap[l].inactive);

            // destroy old chart (important!)
            if ($scope.userActivityChartObj)
                $scope.userActivityChartObj.destroy();

            $scope.userActivityChartObj = new Chart(
                document.getElementById("userActivityChart"),
                {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Active users",
                                data: activeData,
                                borderColor: "#E45D27",
                                backgroundColor: "rgba(228,93,39,0.15)",
                                borderWidth: 2,
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: "Inactive users",
                                data: inactiveData,
                                borderColor: "#bbb",
                                backgroundColor: "rgba(180,180,180,0.15)",
                                borderWidth: 2,
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: "top" }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1 }
                            }
                        }
                    }
                }
            );
        });
    };
    //-------------------------------User Registration

    $scope.VerifyPassword = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.MapId = MapId;
            collectionobj.UserName = $scope.UserNames;
            collectionobj.Password = $scope.Password;
            collectionobj.Name = $scope.UName;
            collectionobj.ContactNo = $scope.ContactNumber;
            collectionobj.EmailId = $scope.EmailId;
            collectionobj.LoginType = 4
            collectionobj.LoginId = $scope.hfId; 
            collectionobj.BranchCode = '001';
            collectionobj.Action = 7;
            collectionobj.IsActive = 1 
            collectionobj.CreatedBy = LoginId;
            var getData = myService.methode('POST', "../DashBoard/IUDUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                debugger;
                if (showMsgBox(response.data.Result)) {
                    $scope.hideLoader();
                    $scope.FireEmail(1, $scope.EmailId, 0); 
                    $scope.Limit();
                    $scope.UserNames = '';
                    $scope.Password = '';
                    $scope.UName = '';
                    $scope.ContactNumber = '';
                    $scope.EmailId = '';
                    $scope.hideLoader();
                    /* data-bs-dismiss="modal"*/
                }
            });
        }
    }


    $scope.validateEmail = function () {

        var semail = $('#txtEmail').val();
        var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        if (filter.test(semail)) {
            $scope.VerifyPassword();
        }
        else { 
            showMsgBox('999', 'Alert', 'Please fill correct e-mail address!', 'warning', 'btn-warning')
            return;
        }
    }

    $scope.SaveUser = function () {

        
        if ($scope.UName == '' || $scope.UName == undefined) {
            showMsgBox('999', 'Alert', 'Name  Should be Required', 'warning', 'btn-warning')
            return;
        }
        if ($scope.UserNames == '' || $scope.UserNames == undefined) {
            showMsgBox('999', 'Alert', 'UserName  Should be Required', 'warning', 'btn-warning')
            return;
        }
        if ($scope.Password == ''  || $scope.Password == undefined) {
            showMsgBox('999', 'Alert', 'Password  Should be Required', 'warning', 'btn-warning')
            return;
        }
        var upper = 0,
            lower = 0,
            number = 0,
            special = 0;
        var mb = $scope.ContactNumber;
        var str = $scope.Password;
        for (var i = 0; i < str.length; i++) {
            if (str[i] >= "A" && str[i] <= "Z") upper++;
            else if (str[i] >= "a" && str[i] <= "z") lower++;
            else if (str[i] >= "0" && str[i] <= "9") number++;
            else special++;
        }
        if (upper >= 1 && lower >= 1 && special >= 1 && number >= 1 && str.length > 8) {
            if (isValidate()) {
                if (mb.length == 10) {
                    $scope.validateEmail()
                }
                else {
                    showMsgBox('999', 'Alert', 'Contact Number Should be 10 digit', 'warning', 'btn-warning')
                }
            }
        }
        else {
            var Msg = "Your Password should be greated than 8 , 1 Upper case , 1 Lower case , 1 Special characters ,1 Number  currently Upper case letter : " + upper + ", Lower case : " + lower + ", Number : " + number + ", Special characters : " + special
            showMsgBox('999', 'Alert', Msg, 'warning', 'btn-warning')
        }

    }



    //------------------------------------------------------PERMISSION--------
    $scope.AllUserListsLoad = function () {
       /* $('#loadingModal').modal('show');*/
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            var userList = response.data.Result || [];
            // ❌ Remove current LoginId user
            $scope.AllUserList = userList.filter(function (item) {
                return item.LoginId != LoginId;   // LoginId = current logged-in user
            });
              /* $('#loadingModal').modal('hide');*/
        });
          /* $('#loadingModal').modal('hide');*/
    }
    $scope.GetPagesSectionMasterList = function () {
        debugger;
      /* $('#loadingModal').modal('show');*/
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.PartyId = MapId;
        collectionobj.PartyType = "4";
        collectionobj.UserId = $scope.UserId
        collectionobj.RoleId = $scope.Id;
        collectionobj.LoginId = LoginId; 
        var getData = myService.methode('POST', '../Dashboard/PagesSectionMasterList', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.hideLoader();
              /* $('#loadingModal').modal('hide');*/
            $scope.PagesSectionMasterList = response.data.Result;
              /* $('#loadingModal').modal('hide');*/
            $scope.hideLoader();
        });
          /* $('#loadingModal').modal('hide');*/
    };
    $scope.SavePermissionRecord = function () {

        if ($scope.UserId == '' || $scope.UserId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select User', 'warning', 'btn-warning');
            return;
        }

        var SectionList = [];
        var anyPermissionSelected = false; // ⭐ flag

        $("#permissionTable tbody tr").each(function () {
            var row = $(this);

            var SectionId = row.find("input[type='hidden']#hfId").val();

            var chkAllowView = row.find("#chkAllowView").prop("checked");
            var chkAllowEdit = row.find("#chkAllowEdit").prop("checked");
            var chkAllowDelete = row.find("#chkAllowDelete").prop("checked");
            var chkAllowUpload = row.find("#chkAllowUpload").prop("checked");
            var chkAllowDownload = row.find("#chkAllowDownload").prop("checked");
            var chkAllowNewStore = row.find("#chkAllowNewStore").prop("checked");
            var chkAllowNewEmployee = row.find("#chkAllowNewEmployee").prop("checked");
            var chkAllowChk1 = row.find("#chkAllowChk1").prop("checked");
            var chkAllowChk2 = row.find("#chkAllowChk2").prop("checked");
            var chkAllowVerify = row.find("#chkAllowVerify").prop("checked");

            if (
                chkAllowView || chkAllowEdit || chkAllowDelete || chkAllowUpload ||
                chkAllowDownload || chkAllowNewStore || chkAllowNewEmployee ||
                chkAllowChk1 || chkAllowChk2 || chkAllowVerify
            ) {
                anyPermissionSelected = true; // ⭐ at least one selected

                SectionList.push({
                    SectionId: SectionId,
                    View: chkAllowView,
                    Edit: chkAllowEdit,
                    Delete: chkAllowDelete,
                    Upload: chkAllowUpload,
                    Download: chkAllowDownload,
                    NewStore: chkAllowNewStore,
                    NewEmployee: chkAllowNewEmployee,
                    Checkbox1: chkAllowChk1,
                    Checkbox2: chkAllowChk2,
                    Verify: chkAllowVerify
                });
            }
        });

        // 🚨 FINAL VALIDATION
        if (!anyPermissionSelected) {
            showMsgBox(
                '999',
                'Warning',
                'Please select at least one permission. If you do not want to assign any permission, please disable the user or contact SuperAdmin.',
                'warning',
                'btn-warning'
            );
            return;
        }

        var collectionobj = {
            ModuleType: "4",
            LoginId: MapId,
            UserId: $scope.UserId,
            EmployeeCode: "",
            SectionList: SectionList,
            BranchCode: $scope.Id,
            CreatedBy: LoginId,
            Action: 1
        };

        var getData = myService.methode(
            'POST',
            "../Dashboard/InsertSectionPermissionForRole",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                // success logic
            }
        });
    };


    $scope.chkAllow = [];
    $scope.checkAll = false;

    $scope.toggleCheckAll = function () {

        if (!$scope.PagesSectionMasterList ||
            $scope.PagesSectionMasterList.length === 0) {
            console.log("No sections found");
            return;
        }

        angular.forEach($scope.PagesSectionMasterList, function (item, index) {

            if (!$scope.chkAllow[index])
                $scope.chkAllow[index] = {};

            if (item.AllowViewFlag)
                $scope.chkAllow[index].View = $scope.checkAll;

            if (item.AllowEditFlag)
                $scope.chkAllow[index].Edit = $scope.checkAll;
        });
    };

    // ---------------------------------SXtore Mapping
    $scope.AllUserListsLoad = function () {
      /* $('#loadingModal').modal('show');*/
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response)
        {
              /* $('#loadingModal').modal('hide');*/
            $scope.AllUserList = response.data.Result;
        });
        var collectionobj1 = {};
        collectionobj1.ActionType = 11;
        collectionobj1.Id = MapId;
        var getData1 = myService.methode('POST', "../Retail/GetStore", '{obj:' + JSON.stringify(collectionobj1) + '}');
        getData1.then(function (response) {
              /* $('#loadingModal').modal('hide');*/
            $scope.OverallStoresList = response.data.Result;
          
        });  
          /* $('#loadingModal').modal('hide');*/
    }

    $scope.clear = function () {
          /* $('#loadingModal').modal('hide');*/
        if ($scope.OverallStoresList && $scope.OverallStoresList.length > 0) {
            for (var index = 0; index < $scope.OverallStoresList.length; index++) {
                //$scope.chkAllow[index] = $scope.chkAll;
                $scope.OverallStoresList[index].IsAllow = false;
            }
        }
    }

    $scope.SaveStoremappingRecord = function () {

        if (!$scope.StoreUserId) {
            showMsgBox('999', 'Warning', 'Please Select User', 'warning', 'btn-warning');
            return;
        }

        var BulkStore = [];
        var isAnyChecked = false;

        // ✅ ONLY storeMappingTable ke andar check hoga
        $("#storeMappingTable tbody tr").each(function () {

            var chkAllow = $(this).find("input[type='checkbox']#chkAllow");

            if (chkAllow.is(":checked")) {
                isAnyChecked = true;

                BulkStore.push({
                    StoreId: $(this).find("#hfMenuId").val()
                });
            }
        });

        // ✅ Agar ek bhi checkbox checked nahi
        if (!isAnyChecked) {
            showMsgBox('999', 'Warning', 'Please Select At least one Store', 'warning', 'btn-warning');
            return;
        }

        // 🔥 Sab valid → loader chalu
        $scope.showLoader();

        var collectionobj = {
            PartyTypeId: 4,
            UserId: $scope.StoreUserId,
            PartyId: MapId,
            DocumentList: BulkStore,
            CreatedBy: LoginId,
            ActionType: 1
        };

        myService.methode(
            'POST',
            "../Retail/InsertUpdateDelStoreMapping",
            JSON.stringify(collectionobj)
        ).then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.hideLoader();
                $scope.IsOpen = false;
                $scope.FireEmail(10, $scope.StoreUserId, $scope.StoreId);
                $('#emailSendingModal').modal('hide');
            }
        });
    };

     
    $scope.BindAllStoreList = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.Id = $scope.StoreUserId;
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
                                break;
                            }
                        }
                        //   }
                    }

                }
            }

        });
    }

    //-----------------------------------License
    $scope.AllIndustry = function () {
      /* $('#loadingModal').modal('show');*/ 
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.Id = MapId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
              /* $('#loadingModal').modal('hide');*/
            if (response.data.Result.length > 0)
            {
                $scope.IndustryId = response.data.Result[0].Id;
                $scope.AllLicense()
                  /* $('#loadingModal').modal('hide');*/
            }
              /* $('#loadingModal').modal('hide');*/
        });
    }
    $scope.currentPage = 1;
    $scope.pageSize = 10;
    $scope.NextPage = function () {

        $scope.currentPage++;
        $scope.AllLicense();

    };
    $scope.SearchData = function () {

        $scope.currentPage = 1;
        $scope.pageSize = 99999;
        $scope.AllLicense();

    };
    $scope.PrevPage = function () {

        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.AllLicense();
        }

    };
    $scope.AllLicense = function () {
        $scope.showLoader();
      /* $('#loadingModal').modal('show');*/
        var collectionobj = {};
        collectionobj.ActionType = 13;
        collectionobj.Id  = $scope.IndustryId;
        collectionobj.LicenseId = MapId;
        collectionobj.PageNumber = $scope.currentPage;
        collectionobj.PageSize = $scope.pageSize;
        collectionobj.Search = $scope.SearchIndustry;

        var getData = myService.methode(
            'POST',
            "../Retail/SearchLicenseDocumentMaster",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            /* $('#loadingModal').modal('hide');*/
            $scope.hideLoader();
            $scope.OverallList = response.data.Result || [];

            if ($scope.OverallList.length > 0) {
                $scope.totalRecords = $scope.OverallList[0].TotalRecords;
            }
            $scope.hideLoader();

            // 🔑 CHECK LOGIC
            var hasAnyChecked = false;

            // Check if any IsAllow == 1
            for (var i = 0; i < $scope.OverallList.length; i++) {
                if ($scope.OverallList[i].IsAllow == 1 || $scope.OverallList[i].IsAllow === true) {
                    hasAnyChecked = true;
                    break;
                }
            }

            if (!hasAnyChecked) {
                // ✅ Case 1: Sab 0 hain → sabko check karo
                $scope.chkAll = true;
                $scope.chkAllRow();
            } else {
                // ✅ Case 2: Pehle se saved data hai → sirf wahi checked rahenge
                $scope.chkAll = false;

                // normalize to true/false (optional but clean)
                for (var j = 0; j < $scope.OverallList.length; j++) {
                    $scope.OverallList[j].IsAllow =
                        ($scope.OverallList[j].IsAllow == 1 || $scope.OverallList[j].IsAllow === true);
                }
            }

        });
          /* $('#loadingModal').modal('hide');*/
    };


    $scope.AllRecordLicense = function () {
        /* $('#loadingModal').modal('show');*/
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.Id = MapId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            /* $('#loadingModal').modal('hide');*/
            if (response.data.Result.length > 0) {
                $scope.IndustryId = response.data.Result[0].Id;
                $scope.RecordLicense()
                /* $('#loadingModal').modal('hide');*/
            }
            /* $('#loadingModal').modal('hide');*/
        });
    }

   

    $scope.FilterLicense = function () {

        $scope.FilteredLicenseList = $scope.LicenseList.filter(function (x) {

            return (!$scope.SelectedState || x.State == $scope.SelectedState) &&
                (!$scope.SelectedCategory || x.CategoryName == $scope.SelectedCategory);

        });

    };
    $scope.RecordLicense = function () {
        $scope.showLoader();
        /* $('#loadingModal').modal('show');*/
        var collectionobj = {};
        collectionobj.ActionType = 13;
        collectionobj.Id = $scope.IndustryId;
        collectionobj.LicenseId = MapId;
        collectionobj.PageNumber = 1;
        collectionobj.PageSize =99999; 

        var getData = myService.methode(
            'POST',
            "../Retail/SearchLicenseDocumentMaster",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            /* $('#loadingModal').modal('hide');*/
            $scope.hideLoader();
            $scope.LicenseList = response.data.Result || [];
            $scope.FilteredLicenseList = angular.copy($scope.LicenseList);
            $scope.StateList = [...new Set($scope.LicenseList.map(x => x.State))];
            $scope.CategoryList = [...new Set($scope.LicenseList.map(x => x.CategoryName))];
        })
    };

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

    $scope.chkAllRow = function () {
        if (!$scope.OverallList) return;

        for (var index = 0; index < $scope.OverallList.length; index++) {
            $scope.OverallList[index].IsAllow = $scope.chkAll;
        }
    };
    // Data load hone ke baad
 
    $scope.chkRowAll = function () {
        var allChecked = true;

        for (var i = 0; i < $scope.OverallList.length; i++) {
            if (!$scope.OverallList[i].IsAllow) {
                allChecked = false;
                break;
            }
        }

        $scope.chkAll = allChecked;
    };

    $scope.chkStoreAllRow = function () {
        for (var index = 0; index < $scope.OverallStoresList.length; index++) {
            //$scope.chkAllow[index] = $scope.chkAll;
            $scope.OverallStoresList[index].IsAllow = $scope.chkAll;
        }
    }
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
   
    $scope.BindActivity = function () {
      /* $('#loadingModal').modal('show');*/ 
            var collectionobj = {};
            var datenew = "";
            if ($('#txtStartDate').val() == '')
            {
                datenew = '-1'; 
            }
            else { datenew = $('#txtStartDate').val(); }
            collectionobj.CreatedOn = datenew;
        collectionobj.Action = 7;
        collectionobj.Id = MapId
        debugger;
        myService.methode(
            'POST',
            "../RetailSection/GetMaintainLog",
            JSON.stringify(collectionobj)
        ).then(function (response) {
            $scope.LogActivity = response.data.Result;
              /* $('#loadingModal').modal('hide');*/
        }); 
       /*   /* $('#loadingModal').modal('hide');*/ 
    }

    $scope.SaveIndustryMappingRecord = function () { 
            var collectionobj = {};
            var BulkLicense = []; 
            collectionobj.UserId = $scope.IndustryId;
            collectionobj.PartyId = MapId; 
            angular.forEach($scope.OverallList, function (x) {
                if (x.IsAllow === true) {
                    BulkLicense.push({
                        StoreId: x.LicenseId,   // 👈 direct model se
                        CategoryId: x.CategoryId
                    
                    });
                }
            });

        if (BulkLicense.length === 0) {
                showMsgBox('999', 'Warning',
                    'Please Select Atleast one License',
                    'warning', 'btn-warning');
                return;
            }

        collectionobj.DocumentList = BulkLicense;
            collectionobj.CreatedBy = LoginId;
            collectionobj.ActionType = 6;

            myService.methode(
                'POST',
                "../Retail/InsertUpdateDelIndustryMapping",
                JSON.stringify(collectionobj)
            ).then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.IsOpen = false;
                    $scope.clear(); // optional
                }
            }); 
    };
    $scope.deleteCustomLicense = function (x) {

        if (!confirm("Are you sure you want to delete this license?")) {
            return;
        }

        $scope.showLoader();

        var fd = new FormData();
        fd.append('Action', 11);   // 👈 Delete Action
        fd.append('LoginId', MapId);
        fd.append('LicenseId', x.LicenseId);
        fd.append('Id', x.CategoryId);

        $http.post('../RetailSection/IUDLicense', fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (res) {
                $scope.hideLoader();
                $scope.AllIndustry();
                if (res.data && res.data.Result)
                {

                    showMsgBox(res.data.Result);

                    // UI se remove
                    var index = $scope.OverallList.indexOf(x);
                    if (index > -1) {
                        $scope.OverallList.splice(index, 1);
                    }

                } else {
                    showMsgBox('999', 'Error', 'Something went wrong.', 'error', 'btn-danger');
                }

            })
            .catch(function () {
                showMsgBox('999', 'Error', 'Server error.', 'error', 'btn-danger');
            })
            .finally(function () {
                $scope.hideLoader();
            });

    }; 
     
    //------------------------------------------
    $scope.printActivityReport = function () {

        var table = document.getElementById("activityReportTable").outerHTML;

        var printWindow = window.open('', '', 'height=700,width=1200');

        printWindow.document.write(`
        <html>
        <head>
            <title>Log Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }

                .company-header {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .company-header h2 {
                    margin: 0;
                    color: #F37437;
                }

                .company-header p {
                    margin: 2px 0;
                    font-size: 13px;
                    color: #555;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                th {
                    background-color: #F37437;
                    color: #fff;
                    border: 1px solid #ddd;
                    padding: 6px;
                    text-align: center;
                }

                td {
                    border: 1px solid #ddd;
                    padding: 6px;
                }

                tr:nth-child(even) {
                    background-color: #f8f9fa;
                }

                tr:hover {
                    background-color: #eef4ff;
                }
            </style>
        </head>
        <body>

            <div class="company-header">
                <h2>${MapUser}</h2>
                <p>Log Report</p>
                <p>Generated On: ${new Date().toLocaleDateString()}</p>
            </div>

            ${table}

        </body>
        </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };
  $scope.SearchLocation = function (item) {
        console.log(item);
        if (!$scope.searchText) return true;

        let text = $scope.searchText.toString().toLowerCase();

        return (
            (item.StoreCode && item.StoreCode.toLowerCase().includes(text)) ||
            (item.RefStoreCode && item.RefStoreCode.toLowerCase().includes(text)) ||
            (item.StoreName && item.StoreName.toLowerCase().includes(text)) ||
            (item.UserName && item.UserName.toLowerCase().includes(text)) ||
            (item.ClientType && item.ClientType.toLowerCase().includes(text))
        );
    };

}