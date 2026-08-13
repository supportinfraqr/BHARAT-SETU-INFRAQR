app.RoleMasterController = function ($scope, $element, $filter, myService) {

    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [
            { "Module_Type": "Auditor", "Id": "3" },
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
            $scope.AllUserList = response.data.Result;
        });
    }
    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        var type = "";
        if ($scope.PartyType == 3) {
            type = "Auditor";
        } else if ($scope.PartyType == 4) {
            type = "Client";
        }
        else { type = ""; }
        collectionobj.PartyType = type;
        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
           
            $scope.AllPartyList = response.data.Result;
        });
    }

    $scope.BindGrade = function (_PartyId) {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.PartyId = _PartyId;
        var getData = myService.methode('POST', "../Retail/SearchGradeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
           
            $scope.GradeList = response.data.Result;
        });
    }

    $scope.SaveRecord = function () {
       
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            const FORMAT = "DD-MM-YYYY";
            collectionobj.PartyType = $scope.PartyType;
            collectionobj.PartyId = $scope.PartyId;
            collectionobj.UserId = $scope.UserId;
            collectionobj.PartyName = $scope.RoleName;
            collectionobj.Description = $scope.Description;
            collectionobj.StartDate = $scope.StartDate;
            collectionobj.EndDate = $scope.EndDate;
            collectionobj.Description = $scope.Description;
            collectionobj.GradeId = $scope.GradeId;
            collectionobj.CreatedBy = LoginId;
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelRoleMaster"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }

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
        $scope.disablePrint = true;
        $scope.PartyType = "";
        $scope.PartyId = "";
        $scope.RoleName = "";
        $scope.StartDate = "";
        $scope.EndDate = "";
        $scope.Description = "";
        $scope.GradeId = "";
        $scope.UserId = "";
        $scope.Save = "Save";
        if (flag == 0) {
            showMsgBox('4');
        };

    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
       
        var getData = myService.methode('POST', ("../Retail/SearchRoleMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Role Name", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Grade", "HeaderValue": "Grade", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StartDate", "HeaderValue": "StartDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EndDate", "HeaderValue": "EndDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                      { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                ];

            $scope.MasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.MasterList = $filter('filter')($scope.MasterList, { 'Id': $scope.hfId });
                $scope.PartyType = $scope.MasterList[0].RPartyType;
                $scope.AllPartySiteLoad();
            
                setTimeout(function () {
                    $scope.PartyId = $scope.MasterList[0].RPartyId;
                    $scope.AllUserListsLoad($scope.PartyId);
                }, 100);

                $scope.BindGrade($scope.MasterList[0].RPartyId);
                setTimeout(function () {
                    $scope.UserId = $scope.MasterList[0].UserId.toString();
                    $scope.GradeId = $scope.MasterList[0].GradeId.toString();
                }, 500);
                $scope.$applyAsync();
                const FORMAT = "DD-MM-YYYY";
                $scope.RoleName = $scope.MasterList[0].Name;
                $scope.Description = $scope.MasterList[0].Description;
                $scope.StartDate = new Date($scope.MasterList[0].StartDate);
                $scope.EndDate = new Date($scope.MasterList[0].EndDate);
              
                $scope.Save = "Edit";
                $scope.$applyAsync();
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.disableDelete = true;
                $scope.disablePrint = true;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();
                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();
            });
        });
        $scope.hideLoader();
    };


}
