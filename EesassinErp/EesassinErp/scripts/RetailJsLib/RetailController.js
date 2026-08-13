app.ReatilController = function ($scope, $element, $filter, myService) {
    debugger;
    $scope.SetFocus('#txtModuleName');
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.Start_Date = new Date();
    //$scope.End_Date = new Date();

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.PartyID = $scope.ClientId;

        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data;
        });
    }


    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};

            collectionobj.userid = LoginId;
            collectionobj.Module_Name = $scope.Module_Name;
            collectionobj.Description = $scope.Description;
            collectionobj.Start_Date = ConverttoDate($scope.Start_Date);
            collectionobj.End_Date = ConverttoDate($scope.End_Date);
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
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelModuleReg"), JSON.stringify(collectionobj));
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
        $scope.End_Date = "";//new Date();
        $scope.Start_Date = new Date();
        $scope.Description = "";
        $scope.Module_Name = "";
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
        var getData = myService.methode('POST', ("../Retail/InsertUpdateDelModuleReg"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };
    $scope.MasterList = [];
    $scope.started = function () {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 4;
        var getData = myService.methode('POST', "../Retail/GetSearchModuleReg", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Module Name", "HeaderValue": "Module_Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Start Date", "HeaderValue": "Start_Date", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "End Date", "HeaderValue": "End_Date", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "tblId", "HeaderValue": "tblId", "Width": "0%", "ShowColumn": "No", "ImageColumn": "No" }
                ];

            $scope.MasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                debugger;
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = row[5];
                $scope.FilerList = [];
                $scope.FilerList = $filter('filter')($scope.MasterList, { 'Id': $scope.hfId });

                $scope.Module_Name = $scope.FilerList[0].Module_Name;
                $scope.Description = $scope.FilerList[0].Description;
                $scope.Start_Date = RConverttoDate($scope.FilerList[0].Start_Date);
                $scope.End_Date = RConverttoDate($scope.FilerList[0].End_Date);

                $scope.Save = "Edit";
                $scope.disableDelete = true;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlRating', true);
                $scope.hideLoader();


            });
        });
    };
}