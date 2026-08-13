app.LWFController = function ($scope, $element, $filter, myService) {
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
            collectionobj.Status = $scope.Status;
            collectionobj.MinAmount = $scope.MinAmount;
            collectionobj.MaxAmount = $scope.MaxAmount;
            collectionobj.EmployeeShare = $scope.EmployeeShare;
            collectionobj.EmployerShare = $scope.EmployerShare;
            collectionobj.Type = $scope.Type;
            collectionobj.Month = $scope.Month;
            collectionobj.CreatedBy = LoginId;
            collectionobj.DesignationType = $scope.DesignationType;
            collectionobj.Designation = $scope.Designation;
            collectionobj.EffectiveFrom = $('#txtefectivefrom').val();
            collectionobj.Effectiveto = $('#txteffectiveto').val();

            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
            }
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelLWFCompliance"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
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
        $scope.Status = '';
        $scope.MinAmount = '';
        $scope.MaxAmount = '';
        $scope.EmployeeShare = '';
        $scope.EmployerShare = '';
        $scope.Type = '';
        $scope.Month = '';
        $scope.DesignationType = '';
        $scope.Designation = '';
        $('#txtefectivefrom').val() = '';
        $('#txteffectiveto').val() = '';
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
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetNewCompliancesData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Status", "HeaderValue": "Status", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Minimum Amount", "HeaderValue": "MinAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Maximum Amount", "HeaderValue": "MaxAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Employee Share", "HeaderValue": "EmployeeShare", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Employer Share", "HeaderValue": "EmployerShare", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Month", "HeaderValue": "Month", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Type", "HeaderValue": "Type", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Designation Applicability", "HeaderValue": "DesignationAvail", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Designation", "HeaderValue": "Designation", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Effective From", "HeaderValue": "EffectiveFrom", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Effective To", "HeaderValue": "Effectiveto", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }

                ];

            $scope.PartyMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();  //$scope.PartyMasterList[0].PartyId;
                $scope.PartyMasterList = $filter('filter')($scope.PartyMasterList, { 'PartyId': $scope.hfId });
                $scope.State = row[1];
                $scope.Status = row[2];
                $scope.MinAmount = row[3];
                $scope.MaxAmount = row[4]
                $scope.EmployeeShare = row[5];
                $scope.EmployerShare = row[6];
                $scope.Month = row[7];
                $scope.Type = row[8];
                $scope.DesignationType = row[9];
                $scope.Designation = row[10];
                $scope.EffectiveFrom = new Date(row[11]);
                $scope.Effectiveto = new Date(row[12]);

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
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Status", "HeaderValue": "Status", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Minimum Amount", "HeaderValue": "MinAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Maximum Amount", "HeaderValue": "MaxAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Employee Share", "HeaderValue": "EmployeeShare", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Employer Share", "HeaderValue": "EmployerShare", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Month", "HeaderValue": "Month", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Type", "HeaderValue": "Type", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Designation Applicability", "HeaderValue": "DesignationAvail", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Designation", "HeaderValue": "Designation", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Effective From", "HeaderValue": "EffectiveFrom", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Effective To", "HeaderValue": "Effectiveto", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }

            ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}