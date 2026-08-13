app.DepartmentMasterController = function ($scope, $element, $filter, myService) {
    $scope.disableDelete = true;
    $scope.disablePrint = true;

    $scope.BindModuleTypeList = function () {
        $scope.AllModuleTypeList = [
            { "Module_Type": "Auditor", "Id": "3" },
            { "Module_Type": "Client", "Id": "4" },
        ];
    };

    $scope.selectedDepartment = {};
    $scope.dropdownOpen = false;
    $scope.selectedDepartmentIds = [];

    $scope.BindDepartment = function () {
        var collectionobj = { Action: 4 };
        myService.methode('POST', "../Retail/SearchDepMaster", JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.DepartmentList = response.data.Result;
            });
    };

    $scope.updateDepartmentSelection = function () {
        const selected = Object.keys($scope.selectedDepartment)
            .filter(key => $scope.selectedDepartment[key]);

        if (selected.length === 0) {
            toastr.warning("Please select at least one Department.");
            return;
        }

        $scope.selectedDepartmentIds = selected;
    };

    $scope.toggleDropdown = function () {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    };

    $scope.getSelectedDepartmentsLabel = function () {
        const selectedNames = $scope.DepartmentList
            ?.filter(dep => $scope.selectedDepartment[dep.DepartmentId])
            .map(dep => dep.DepartmentName);
        return selectedNames?.length ? selectedNames.join(', ') : 'Select Department';
    };

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {
            ActionType: 5,
            PartyType: "Client" 
        }; 
        myService.methode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}')
            .then(function (response) {
                $scope.AllPartyList = response.data.Result;
            });
    };

    $scope.SaveRecord = function () {
        if (isValidate()) {
            if (!$scope.selectedDepartmentIds || $scope.selectedDepartmentIds.length === 0) {
                showMsgBox('Please select at least one Department');
                return false;
            }

            var collectionobj = {};
            const FORMAT = "DD-MM-YYYY";
            collectionobj.PartyType = $scope.PartyType;
            collectionobj.PartyId = $scope.PartyId;
            collectionobj.PartyName = $scope.DepartmentName;
            collectionobj.Description = $scope.Description;
            collectionobj.StartDate = moment($scope.StartDate).format(FORMAT);
            collectionobj.EndDate = moment($scope.EndDate).format(FORMAT);
            collectionobj.DepartmentList = $scope.selectedDepartmentIds.join(',');
            collectionobj.CreatedBy = LoginId;

            collectionobj.ActionType = ($scope.Save === "Save") ? 1 : 2;
            if ($scope.Save !== "Save") {
                collectionobj.Id = $scope.hfId;
            }

            $scope.showLoader();
            myService.methode('POST', "../Retail/InsertUpdateDelDepartmentMaster", JSON.stringify(collectionobj))
                .then(function (response) {
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
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.PartyType = "";
        $scope.PartyId = "";
        $scope.DepartmentName = "";
        $scope.StartDate = "";
        $scope.EndDate = "";
        $scope.Description = "";
        $scope.selectedDepartment = {};
        $scope.selectedDepartmentIds = [];
        $scope.BindDepartment();
        $scope.Save = "Save";
        if (flag == 0) {
            showMsgBox('4');
        }
    };

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = { ActionType: 4 };

        myService.methode('POST', "../Retail/SearchDepartmentMaster", JSON.stringify(collectionobj))
            .then(function (response) {
                var tblheader = [
                    { "HeaderText": "Sr.No.", "Value": "DepartmentId", "HeaderValue": "DepartmentId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Department Name", "HeaderValue": "DepartmentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StartDate", "HeaderValue": "Startfrom", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EndDate", "HeaderValue": "LastDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                ];

                $scope.MasterList = response.data.Result;
                loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

                $('#example tbody').on('dblclick', 'tr', function () {
                    $scope.showLoader();
                    var row = $('#example').DataTable().row(this).data();
                    $scope.hfId = $(this).find('input[type="hidden"]').val();
                    $scope.MasterList = $filter('filter')($scope.MasterList, { 'DepartmentId': $scope.hfId });

                    $scope.PartyType = $scope.MasterList[0].DPartyType;
                    $scope.AllPartySiteLoad();

                    setTimeout(function () {
                        $scope.PartyId = $scope.MasterList[0].DPartyId;
                        $scope.$applyAsync();
                    }, 500); 

                    const FORMAT = "DD-MM-YYYY";
                    $scope.DepartmentName = $scope.MasterList[0].DepartmentName;
                    $scope.Description = $scope.MasterList[0].Description;
                    $scope.StartDate = new Date($scope.MasterList[0].StartDate);
                    $scope.EndDate = new Date($scope.MasterList[0].EndDate);
                  
                    $scope.preselectedDepartment = [];
                    if ($scope.MasterList.length > 0) { 
                        var Departmentstringbuilder = "";
                        var Departmenteprator = "";

                        for (let i = 0; i < $scope.MasterList.length; i++) {
                            Departmentstringbuilder += Departmenteprator + $scope.MasterList[i].DepartmentId;
                            Departmenteprator = ",";
                        }

                        $scope.selectedDepartmentIds = Departmentstringbuilder;
                        $scope.preselectedDepartment = Departmentstringbuilder.split(',').map(Number); // Convert to array of integers
                    }
                    $scope.preselectedDepartment.forEach(DepartmentId => {
                        $scope.selectedDepartment[DepartmentId] = true;
                    });
                        

                    $scope.Save = "Edit";

                    $scope.disableDelete = false;
                    $scope.disableAdd = false;
                    $scope.disablePrint = true;
                    $scope.$apply();

                    $('.br-pageheader').fadeIn();
                    $('#collapseinputbox').fadeIn();
                    $('#CollapseSearchTableList').fadeOut();

                    $scope.SetFocus('#ddlState', true);
                    $scope.hideLoader();
                });
            });

        $scope.hideLoader();
    };
};
