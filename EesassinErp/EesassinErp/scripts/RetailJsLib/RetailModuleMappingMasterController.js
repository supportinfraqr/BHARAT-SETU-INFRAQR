app.RetailModuleMappingMasterController = function ($scope, $element, $filter, myService)
{
    $scope.BindModuleList = function () {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.Id = 1;
        debugger;
        var getData = myService.methode('POST', ("../Retail/GetSearchModuleReg"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllModuleList = response.data.Result;
        });
    }

    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [
            { "Module_Type": "Auditor", "Id": "3" },
            { "Module_Type": "Client", "Id": "4"},
        ];
        $scope.AllModuleTypeList = moduleTypeLst;
    }

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        var type = "";
        if ($scope.ModelTypeId == 3) {
            type = "Auditor";
        } else {
            type = "Client";
        }
        collectionobj.PartyType = type;
        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;
        });
    }


    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};

            collectionobj.userid = LoginId;
            collectionobj.Module_Reg_Id = $scope.ModuleId;
            collectionobj.Party_Type_Id = $scope.ModelTypeId;
            collectionobj.Party_Id = $scope.ClientId;
            collectionobj.IsActive = 1;
            collectionobj.IsApproval = 1;
            collectionobj.IsDeleted = 0;
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelMappingMaster"), JSON.stringify(collectionobj));
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
        debugger;
        $scope.vendoc = true;
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.ModuleId="";
        $scope.ModelTypeId="";
        $scope.ClientId="";
        $scope.Save = "Save";
        $scope.SetFocus('#txtModuleName');
        $scope.hfId = 0;
        $scope.hfId1 = 0;
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {

        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.Id = $scope.hfId;
        collectionobj.IsDeleted = 1;
        var getData = myService.methode('POST', ("../Retail/InsertUpdateDelMappingMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.AllPartySiteLoad();
        $scope.started();
    };
    $scope.MasterList = [];
    $scope.started = function () {
        var collectionobj = {};
        collectionobj.ActionType = 4;
        debugger;
        var getData = myService.methode('POST', "../Retail/GetSearchModuleMappingMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Module Name", "HeaderValue": "Module_Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Type", "HeaderValue": "Party_Type", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "tblId", "HeaderValue": "tblId", "Width": "0px", "ShowColumn": "NO", "ImageColumn": "No"}
                ];

            $scope.MasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                debugger;

                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = row[4];
                $scope.FilerList = [];
                $scope.FilerList = $filter('filter')($scope.MasterList, { 'Id': $scope.hfId });

                $scope.ModuleId = $scope.FilerList[0].Module_Reg_Id;
                $scope.ModelTypeId = $scope.FilerList[0].Party_Type_ID;
                $scope.ClientId = $scope.FilerList[0].Party_Id;

                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlModuleName', true);
                $scope.hideLoader();


            });
        });
    };
}