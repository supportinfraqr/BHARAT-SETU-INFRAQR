app.RetailHeaderTemplateController = function ($scope, $element, $filter, $sce, myService) {
    $scope.SetFocus('#ddlReportCategory');
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.disableAdd = false;
    /*Save-Edit Button Click Event*/
    $scope.BindState = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/GetStoreDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.StateList = response.data.Result;

        });
    };

    $scope.GetDocuemnt = function () {
        debugger;
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.ClientId = $scope.StateId;
        var getData = myService.methode('POST', '../Retail/SearchRetailClientDocMapping', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) { 
            $scope.Documentist = response.data.Result;
            $scope.SetFocus('#ddlModule', true); 
            $scope.hideLoader();
        });
    };
    $scope.SaveRecord = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            $scope.HeaderTemplate = CKEDITOR.instances.txtHeaderTemplate.getData();
            collectionobj.StateId = $scope.StateId;
            collectionobj.DocumentId = $scope.DocumentId
            collectionobj.HeaderHtml = $scope.HeaderTemplate; 
            collectionobj.CreatedBy = LoginId;  
            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                collectionobj.Id = $scope.hfId
            }
            var getData = myService.methode('POST', "../DashBoard/IUDManageReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                debugger;
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
        $scope.Save = "Save";
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableAdd = false;
        $scope.Id = "";
        $scope.StateId = "";
        $scope.DocumentId = "";
        $scope.HeaderHtml = ""; 
        $scope.hfId = "";
        $scope.ReportHeaderList = [];

        $scope.SetFocus('#ddlReportCategory');

        if (flag == 0) {
            showMsgBox('4');
        };

        CKEDITOR.instances.txtHeaderTemplate.setData("");

    }
    $scope.ReportHeaderList = [];
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 4; 
        var getData = myService.methode('POST', "../DashBoard/GetManageReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "State Name", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "DocumentName", "HeaderValue": "DocumentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Header Html", "HeaderValue": "HeaderHtml", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" } 

                ];
            $scope.ReportHeaderList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                debugger;
                var filteredList = $filter('filter')($scope.ReportHeaderList, { 'Id': $scope.hfId });
                $scope.ReportHeaderList = filteredList;

                $scope.StateId = $scope.ReportHeaderList[0].StateId;
                $scope.GetDocuemnt();
                CKEDITOR.instances.txtHeaderTemplate.setData($scope.ReportHeaderList[0].HeaderHtml);

                setTimeout(function () {
                    $scope.DocumentId = $scope.ReportHeaderList[0].DocumentId;
                }, 100);
               
                $scope.Save = "Edit";
                $scope.disableAdd = false;
                $scope.disableDelete = false;
                $scope.$applyAsync();
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlReportCategory', true);
                $scope.hideLoader();
            });
        });
    };

    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 3; 
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', "../DashBoard/IUDManageReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            };
        });
    };

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
                { "HeaderText": "Sr.No.", "Value": "ReportHeaderId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Category", "HeaderValue": "ReportCategoryName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Header Html", "HeaderValue": "HeaderHtml", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Active", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "activeyn" }
            ];
        $scope.PrintMaster(tblheader, $scope.ReportHeaderList, window.document.title);
    };

}