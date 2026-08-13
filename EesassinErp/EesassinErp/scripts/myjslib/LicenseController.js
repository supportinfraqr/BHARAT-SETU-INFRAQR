app.LicenseController = function ($scope, $element, $filter, myService) {

    $scope.getMonthName = function () {
        $scope.Mon = [
            { MonthId: 1, MonthName: "January" },
            { MonthId: 2, MonthName: "February" },
            { MonthId: 3, MonthName: "March" },
            { MonthId: 4, MonthName: "April" },
            { MonthId: 5, MonthName: "May" },
            { MonthId: 6, MonthName: "June" },
            { MonthId: 7, MonthName: "July" },
            { MonthId: 8, MonthName: "August" },
            { MonthId: 9, MonthName: "September" },
            { MonthId: 10, MonthName: "October" },
            { MonthId: 11, MonthName: "November" },
            { MonthId: 12, MonthName: "December" }
        ];
    };

    $scope.SaveRecord = function () {
        if (isValidate()) {
            $scope.AfterverifyRecord();
        }
    }

    $scope.AfterverifyRecord = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};

            collectionobj.State = $scope.State;
            collectionobj.Id = $scope.hfId;
            collectionobj.LicenseName = $scope.LicenseName;
            collectionobj.ApplicabilityCount = $scope.ApplicabilityCount;
            collectionobj.GovtFees = $scope.GovtFees;
            collectionobj.DepositeAmt = $scope.DepositeAmt;
           
            if ($scope.Save == "Save") {
                collectionobj.Action = 5;
            }
            else {
                collectionobj.Action = 6;
            }
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelLWFCompliance"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }
    $scope.DeleteRecord = function () {

        showMsgBox('999', 'Warning', 'Delete Option Not Availabe , Please Inactive Party', 'warning', 'btn-warning')
    };

    $scope.deleteRecord = function () {
        debugger;
        //var collectionobj = {};
        //collectionobj.ActionType = 3;
        //collectionobj.PartyId = $scope.hfId;  
        //var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelPartyMaster"), JSON.stringify(collectionobj));
        //getData.then(function (response) {
        //    if (showMsgBox(response.data.Result)) {
        //        $scope.ClearControl(1);
        //    }
        //});
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
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;

        $scope.State = '';
        $scope.LicenseName = '';
        $scope.ApplicabilityCount = '';
        $scope.GovtFees = '';
        $scope.DepositeAmt = '';
        $scope.PartyMasterList = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.PartyMasterList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 7;
        var getData = myService.methode('POST', ("../PartyMaster/GetNewCompliancesData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "License Name", "HeaderValue": "LicensesName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Applicability Count", "HeaderValue": "ApplicabilityCount", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Govt Fee Amount", "HeaderValue": "GovtFee", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Security Deposit Amount", "HeaderValue": "SecuritydepositeAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            
                ];

            $scope.PartyMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();  //$scope.PartyMasterList[0].PartyId;
                $scope.PartyMasterList = $filter('filter')($scope.PartyMasterList, { 'PartyId': $scope.hfId });
                $scope.LicenseName = row[1];
                $scope.State = row[2];
                $scope.ApplicabilityCount = row[3];
                $scope.GovtFees = row[4];
                $scope.DepositeAmt = row[5];

                $scope.Save = "Edit";
                $scope.$applyAsync();
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
        $scope.hideLoader();
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
                { "HeaderText": "Sr.No.", "Value": "SNO", "HeaderValue": "PartyId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "BankDetails", "HeaderValue": "BankDetails", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "PANIT NO", "HeaderValue": "PANITNO", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "GSTINUIN", "HeaderValue": "GSTINUIN", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "Pincode", "HeaderValue": "Pincode", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "VendorId", "HeaderValue": "VendorId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Contact Person Name", "HeaderValue": "ContactPerson", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Contact Mobile No ", "HeaderValue": "ContactMobile", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Descritpion", "HeaderValue": "Descritpion", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "IsActive", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "PartyId", "HeaderValue": "PartyId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
           
            ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}