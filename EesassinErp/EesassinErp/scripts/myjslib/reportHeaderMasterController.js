app.ReportHeaderMasterController = function ($scope, $element, $filter, $sce, myService) {
    $scope.SetFocus('#ddlReportCategory');
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.disableAdd = false;
    /*Save-Edit Button Click Event*/
    $scope.SaveRecord = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            $scope.HeaderTemplate = CKEDITOR.instances.txtHeaderTemplate.getData();
            collectionobj.ReportHeaderId = $scope.hfId;
            collectionobj.ReportCategoryName = $scope.ReportCategoryName
            collectionobj.HeaderHtml = $scope.HeaderTemplate;
            collectionobj.IsActive = $scope.IsActive==true?1:0
          
            collectionobj.BranchCode = BranchCode;
           
            collectionobj.CreatedBy = LoginId;
            collectionobj.UpdatedBy = LoginId;

            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
            }

            var getData = myService.methode('POST', "../DashBoard/InsertUpdateDeleteReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
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
        $scope.ReportCategoryName = "";
       
        $scope.IsActive = "";
        $scope.hfId = "";
        $scope.ReportHeaderList = [];

        $scope.SetFocus('#ddlReportCategory');

        if (flag == 0) {
            showMsgBox('4');
        };

        CKEDITOR.instances.txtHeaderTemplate.setData("");

    }
    $scope.ReportHeaderList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
       
        collectionobj.BranchCode = BranchCode;
       

        var getData = myService.methode('POST', "../DashBoard/GetReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            var tblheader =
            [
                { "HeaderText": "Sr.No.", "Value": "ReportHeaderId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Category", "HeaderValue": "ReportCategoryName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Header Html", "HeaderValue": "HeaderHtml", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Active", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "activeyn" }
              
            ];
            $scope.ReportHeaderList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader(); 
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                debugger;
                $scope.ReportHeaderList = $filter('filter')($scope.ReportHeaderList, { 'ReportHeaderId': $scope.hfId });

                $scope.ReportCategoryName = row[1];
                $scope.HeaderTemplate = row[2];
                CKEDITOR.instances.txtHeaderTemplate.setData($scope.HeaderTemplate);
                $scope.IsActive = row[3] == "Yes" ? "True" : "False";

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

    /*Delete Button Click Event*/
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 3; 
        collectionobj.BranchCode = BranchCode;
        collectionobj.ReportHeaderId = $scope.hfId; 
        var getData = myService.methode('POST', "../DashBoard/InsertUpdateDeleteReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            };
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
        { "HeaderText": "Sr.No.", "Value": "ReportHeaderId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
        { "HeaderText": "Category", "HeaderValue": "ReportCategoryName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
        { "HeaderText": "Header Html", "HeaderValue": "HeaderHtml", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
        { "HeaderText": "Active", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "activeyn" }
    ];
        $scope.PrintMaster(tblheader, $scope.ReportHeaderList, window.document.title);
    };

}