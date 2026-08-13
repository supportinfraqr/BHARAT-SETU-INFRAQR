app.BranchMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtSubscriptionCode');
    $scope.disableDelete = true;

    $scope.AllSubscriptionId = function () {
        var getData = myService.methode('POST', (APIURLPath + "SubscriptionMaster/GetSubscriptionMasterListDT"), { "ActionType": 0 });
        getData.then(function (response) {
            debugger;
            $scope.AllSubscriptionIdList = response.data;
        });
    }
      
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.SubscriptionId = $scope.SubscriptionId;
            collectionobj.Higlight = $scope.Higlight;
            collectionobj.Description = $scope.Description; 
            collectionobj.OrganizationId = 1;
            collectionobj.CompanyId = 1; 
            collectionobj.LastLoginId = LoginId;  
            collectionobj.LastUpdateBy = LoginId;  
            collectionobj.OrgId = 1; 
            collectionobj.SubscriptionDtlId = $scope.hfId; 
            collectionobj.LastLoginId = $scope.hfId; 
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
            } 
            var getData = myService.methode('POST', (APIURLPath + "SubscriptionDtls/InsertUpdateDelSubscriptionDtlsItems"), JSON.stringify(collectionobj));
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
            collectionobj.SubscriptionDtlId = $scope.hfId;
            collectionobj.CreatedBy = LoginId;
            collectionobj.IsDeleted = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', (APIURLPath + "SubscriptionDtls/InsertUpdateDelSubscriptionDtlsItems"), JSON.stringify(collectionobj));
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
        $scope.Save = "Save"; 
        $scope.SubscriptionId = "";
        $scope.Higlight = ""; 
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
        var getData = myService.methode('POST', (APIURLPath + "SubscriptionDtls/GetSubscriptionDtlsListDT"), { "ActionType": 0 });
        getData.then(function (response) {
            debugger; 
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "SUBSCRIPTION_DTL_ID", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Subscription Short Detail", "Value": "SUBSCRIPTION_ID", "HeaderValue": "SUBSCRIPTION_SHORT_DETAIL", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "" }, 
                    { "HeaderText": "Higlight", "HeaderValue": "HIGLIGHT", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "Description", "HeaderValue": "DESCRIPTION", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },  
                ];

            $scope.ServiceListMaster = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data(); 
                //$scope.hfId = $(this).find('input[type="hidden"]').val(); 
                $scope.hfId = $(this).find("td").eq(0).find('input[type="hidden"]').val(); 
                $scope.SubscriptionId = $(this).find("td").eq(1).find('input[type="hidden"]').val(); 
                //$scope.SubscriptionId = row[1];
                $scope.Higlight = row[2];  
                $scope.Description = row[3];
                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut(); 
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
                { "HeaderText": "Sr.No.", "Value": "SubscriptionDtlId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },

                { "HeaderText": "Subscription Id", "HeaderValue": "SubscriptionId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Higlight", "HeaderValue": "Higlight", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
            ];
        $scope.PrintMaster(tblheader, $scope.ServiceListMaster, window.document.title);
    };
}