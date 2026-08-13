app.RetailStorePrefixController = function ($scope, $element, $filter, myService) {
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [
            { "Module_Type": "Auditor", "Id": "3" },
            { "Module_Type": "Client", "Id": "4" },
        ];
        $scope.AllModuleTypeList = moduleTypeLst;
    }


    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            const FORMAT = "DD-MM-YYYY";
            collectionobj.Id = $scope.hfId;
            collectionobj.PartyTypeId = $scope.PartyTypeId;
            collectionobj.Prefix = $scope.Prefix;
            collectionobj.Suffix = $scope.Suffix;
            collectionobj.StartDate = $scope.StartDate;
            collectionobj.EndDate = $scope.EndDate;
            collectionobj.LoginId = LoginId;
            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelStorePrefix"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
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
        collectionobj.Action  = 3;
        collectionobj.Id = $scope.hfId;  
        var getData = myService.methode('POST', ("../Retail/DelStorePrefix"), JSON.stringify(collectionobj));
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
        debugger;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.PartyType = 0;
        $scope.Prefix = "";
        $scope.Suffix = "";
        $scope.StartDate = "";
        $scope.EndDate = "";
        $scope.Description = "";
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
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', ("../Retail/SearchStorePrefix"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "PartyType", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Prefix", "HeaderValue": "Prefix", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Suffix", "HeaderValue": "Suffix", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StartDate", "HeaderValue": "StartDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EndDate", "HeaderValue": "EndDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                ];

            $scope.StorePrefixList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.StorePrefixList = $filter('filter')($scope.StorePrefixList, { 'Id': $scope.hfId });
                $scope.PartyTypeId = $scope.StorePrefixList[0].PartyId.toString();
                $scope.$applyAsync();
                const FORMAT = "DD-MM-YYYY";
                $scope.Prefix = $scope.StorePrefixList[0].Prefix;
                $scope.Suffix = $scope.StorePrefixList[0].Suffix;
                $scope.StartDate = new Date($scope.StorePrefixList[0].SDate);
                $scope.EndDate = $scope.StorePrefixList[0].EDate == null ? $scope.StorePrefixList[0].EDate : new Date($scope.StorePrefixList[0].EDate);
                $scope.Save = "Edit";
                $scope.$applyAsync();
                $scope.disableDelete = true;
                $scope.disableAdd = false;
                $scope.disableDelete = false;
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
