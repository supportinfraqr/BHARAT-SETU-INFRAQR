app.BranchMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtBranchName');
    $scope.disableDelete = true;
    $scope.SaveRecord = function () { 

        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 

            collectionobj.ContactNo = $scope.MobileNo;
            collectionobj.IsActive = $scope.IsActive;
            collectionobj.BranchAddress = $scope.BAddress;
            collectionobj.BranchName = $scope.BName;
           
            collectionobj.CreatedOn = CreatedOn;
            collectionobj.BranchCode = BranchCode;
            if ($scope.Save == "Save")
            {
                collectionobj.Action = 1;
            }
            else
            {
                collectionobj.Action = 2;
             
            } 
            collectionobj.CreatedBy =  LoginId;
            var getData = myService.methode('POST', "../Hathery/InsertBranchMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
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
        $scope.MobileNo = "";
        $scope.IsActive = "";
        $scope.BAddress = "";
        $scope.BName = "";
        $scope.BranchCode = ""; 
       
        $scope.SetFocus('#ddlState');
        $scope.hfId = "";
        $scope.CityMasterList = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.CityMasterList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 5; 
        collectionobj.BranchCode = BranchCode; 
        debugger;
        var getData = myService.methode('POST', "../Hathery/SearchBranchMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
 
            var tblheader =
            [
                            { "HeaderText": "Sr.No.", "Value": "BranchCode", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                            
                            { "HeaderText": "BranchName", "HeaderValue": "BranchName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                            { "HeaderText": "BranchAddress",   "HeaderValue": "BranchAddress", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                            { "HeaderText": "ContactNo",   "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                            { "HeaderText": "IsActive",   "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            ];

            $scope.BranchMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.BName = row[1];
                $scope.BAddress = row[2];
                $scope.MobileNo = row[3];
                $scope.IsActive = row[4] == 'Yes' ? 'True' : 'False';
     
                $scope.Save = "Edit";
                $scope.disableDelete = true;
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
 { "HeaderText": "Sr.No.", "Value": "BranchCode", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                            
                            { "HeaderText": "BranchName", "HeaderValue": "BranchName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                            { "HeaderText": "BranchAddress",   "HeaderValue": "BranchAddress", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                            { "HeaderText": "ContactNo",   "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                            { "HeaderText": "IsActive",   "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
       ];
        $scope.PrintMaster(tblheader, $scope.BranchMasterList, window.document.title);
    };
}