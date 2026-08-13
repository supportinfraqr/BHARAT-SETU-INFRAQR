app.BranchMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtLookupValue');
    $scope.disableDelete = true;
     
    //$scope.GetServiceCode = function () {
    //    var getData = myService.methode('POST', (APIURLPath + "ServicesMst/GetListDT"), { "ActionType": 4 });
    //    getData.then(function (response) {
    //        $scope.ServiceCode = response.data[0].ServiceCode;
    //    }); 
    //}
     
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.LookupValue = $scope.LookupValue;
            collectionobj.Module = $scope.Module;
            collectionobj.Description = $scope.Description;
            collectionobj.Field = 1; 
            collectionobj.ProjectModuleName = 1; 
            collectionobj.CompanyId = 1; 
            collectionobj.LastLoginId = LoginId;  
            collectionobj.CreatedBy = LoginId;  
            collectionobj.RowId = $scope.hfId; 
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
            } 
            var getData = myService.methode('POST', (APIURLPath + "Lookup/InsertUpdateDelLookupItems"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data)) { 
                   $scope.ClearControl(1);
                } 
            });
        }
    }

    $scope.fileuploadClick = function (fuControlId) {
        $(fuControlId).click();
    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.Delete);
    };
    $scope.Delete = function () {
        debugger;
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.LookupValue = $scope.LookupValue;
            collectionobj.RowId = $scope.hfId; 
            collectionobj.CreatedBy = LoginId;
            collectionobj.IsDeleted = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', (APIURLPath + "Lookup/InsertUpdateDelLookupItems"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data)) {
                    $scope.ClearControl(1);
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
        debugger;
        $scope.Save = "Save"; 
        $scope.LookupValue = "";
        $("#txtLookupValue").prop("readonly", false);
        $("#txtModule").prop("readonly", false);
        $scope.Module = "";
        $scope.Description = "";  
        $scope.hfId = 0;
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false; 
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.LookupListMaster = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.LookupListMaster = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.ActionType = 0;
        var getData = myService.methode('POST', (APIURLPath + "Lookup/GetLookupListDT"), { "ActionType": 0 });
        getData.then(function (response) {
            debugger; 
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "ROW_ID", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },

                    { "HeaderText": "Lookup Value", "HeaderValue": "LOOKUP_VALUE", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Module", "HeaderValue": "MODULE", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Description", "HeaderValue": "DESCRIPTION", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    //{ "HeaderText": "FilesName", "HeaderValue": "FilesName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "Yes" }, 
                ];

            $scope.LookupListMaster = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data(); 
                $scope.hfId = $(this).find('input[type="hidden"]').val(); 
                $scope.LookupValue = row[1];
                $scope.Module = row[2];  
                $scope.Description = row[3];
                $("#txtLookupValue").prop("readonly", true);
                $("#txtModule").prop("readonly", true);
                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader(); 
            });
        });
    };



    /*Refresh Search Table Record*/
    $(document).on("click", ".RefreshSearchTable", function (e) {
        debugger;
        var panelToRefresh = $(this).closest('.panel').find('.refresh-container');
        var dataToRefresh = $(this).closest('.panel').find('.panel-wrapper');
        var loadingAnim = panelToRefresh.find('.loading-progress');
        panelToRefresh.show();
        setTimeout(function () {
            loadingAnim.addClass('la-animate');
        }, 100);
        $scope.started();
        return false;
    });

    $scope.PrintRecord = function () {
        var tblheader =
            [
                { "HeaderText": "Sr.No.", "Value": "RowId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },

                { "HeaderText": "Lookup Value", "HeaderValue": "LookupValue", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Module", "HeaderValue": "Module", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    //{ "HeaderText": "FilesName", "HeaderValue": "FilesName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "Yes" },
            ];
        $scope.PrintMaster(tblheader, $scope.LookupListMaster, window.document.title);
    };
}