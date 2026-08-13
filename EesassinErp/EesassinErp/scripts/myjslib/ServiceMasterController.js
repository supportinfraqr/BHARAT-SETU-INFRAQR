app.BranchMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtServiceTitle');
    $scope.disableDelete = true;
     
    $scope.GetServiceCode = function () {
        var getData = myService.methode('POST', (APIURLPath + "ServicesMst/GetListDT"), { "ActionType": 4 });
        getData.then(function (response) {
            $scope.ServiceCode = response.data[0].ServiceCode;
        }); 
    }
     
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            $scope.HeaderTemplate = CKEDITOR.instances.txtHeaderTemplate.getData();
            collectionobj.ImageFile = $("#hidByte1").val();
            collectionobj.FileType = $("#hidFileName1").val();
            collectionobj.ServiceCode = $scope.ServiceCode;
            collectionobj.ServiceTitle = $scope.ServiceTitle;
            collectionobj.ServiceDescription = $scope.HeaderTemplate;
            collectionobj.OrganizationId = 1; 
            collectionobj.CompanyId = 1; 
            collectionobj.LastLoginId = LoginId;  
            collectionobj.LastUpdateBy = LoginId;  
            collectionobj.ServiceId = $scope.hfId;
            collectionobj.FileFolderName = "ServiceIcon";
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
            } 
            var getData = myService.methode('POST', (APIURLPath + "ServicesMst/InsertUpdateDelServMaster"), JSON.stringify(collectionobj));
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
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.ServiceId = $scope.hfId;
            collectionobj.IsDeleted = LoginId;
            collectionobj.CreatedBy = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', (APIURLPath + "ServicesMst/InsertUpdateDelServMaster"), JSON.stringify(collectionobj));
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
        $scope.iconstrbyt = "";
        $scope.sericons = "";
        $scope.BName = "";
        $scope.HeaderTemplate = "";
        $scope.ServiceTitle = "";
        $scope.ServiceCode = "";
        $scope.GetServiceCode(); 
        CKEDITOR.instances.txtHeaderTemplate.setData('');
        $("#hidByte1").val('');
        $("#hidFileName1").val('');
        $("#DrFile").val(null); 
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
        $scope.ServiceListMaster = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
   $scope.ServiceListMaster = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.ActionType = 0;
        var getData = myService.methode('POST', (APIURLPath + "ServicesMst/GetListDT"), { "ActionType": 0 });
        getData.then(function (response) {
            debugger; 
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "SERVICE_ID", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },

                    { "HeaderText": "Service Code", "HeaderValue": "SERVICE_CODE", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Service Title", "HeaderValue": "SERVICE_TITLE", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Service Description", "HeaderValue": "SERVICE_DESCRIPTION", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "FilesName", "HeaderValue": "FilesName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "Yes" }, 
                ];

            $scope.ServiceListMaster = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data(); 
                $scope.hfId = $(this).find('input[type="hidden"]').val(); 
                $scope.ServiceCode = row[1];
                $scope.ServiceTitle = row[2];  
                CKEDITOR.instances.txtHeaderTemplate.setData(row[3]);
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
                { "HeaderText": "Sr.No.", "Value": "SERVICE_ID", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Service Code", "HeaderValue": "SERVICE_CODE", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Service Title", "HeaderValue": "SERVICE_TITLE", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Service Description", "HeaderValue": "SERVICE_DESCRIPTION", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                { "HeaderText": "FilesName", "HeaderValue": "FilesName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "Yes" },
            ];
        $scope.PrintMaster(tblheader, $scope.ServiceListMaster, window.document.title);
    };
}