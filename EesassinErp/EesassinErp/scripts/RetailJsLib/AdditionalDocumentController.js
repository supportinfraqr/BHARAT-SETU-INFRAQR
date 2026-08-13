app.AdditionalDocumentController = function ($scope, $element, $filter, myService) {
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.SaveRecord = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.DocumentName = $scope.DocumentName;
            collectionobj.DocumentType = $scope.PermissionId;
            if ($scope.Save == "Save") {
                collectionobj.Action = 7;
            }
            else {
                collectionobj.Action = 8;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../DocumentMaster/IUDDocumentMaster"), JSON.stringify(collectionobj));
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
        $scope.DocumentName = "";
        $scope.PermissionId = "";
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
        collectionobj.Action = 9;
        var getData = myService.methode('POST', ("../DocumentMaster/GetDocumentMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
            [
                { "HeaderText": "Sr.No.", "Value": "DocumentId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "No", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Document Name", "HeaderValue": "DocumentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "DisplayName", "HeaderValue": "DisplayName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "PermissionFor", "HeaderValue": "PermissionFor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
                
            ];
            $scope.MasterList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId =  $(this).find('input[type="hidden"]').val();
                $scope.MasterList = $filter('filter')($scope.MasterList, { 'DocumentId': $scope.hfId });
                $scope.$applyAsync(); 
                $scope.DocumentName = $scope.MasterList[0].DocumentName;
                $scope.PermissionId = $scope.MasterList[0].PermissionId;
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