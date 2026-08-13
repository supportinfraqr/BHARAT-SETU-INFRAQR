app.ProfessionalTaxController = function ($scope, $element, $filter, myService) {


    $scope.DynamicRows = [];

    $scope.addRow = function () {
        $scope.DynamicRows.push({
            Value1: '0',
            Value2: '0',
            Value3: '0'
        });
    };

    $scope.removeRow = function (index) {
        $scope.DynamicRows.splice(index, 1);
    };

    $scope.SaveDynamicrow = function () {
        var collectionobj = {};
        collectionobj.DynamicRows = [];
        angular.forEach($scope.DynamicRows, function (item) {
            collectionobj.DynamicRows.push({
                Value1: item.Value1 || 0,
                Value2: item.Value2 || 0,
                Value3: item.Value3 || 0,
                PtId: $scope.Ptid,
                CreatedBy: LoginId
            });
        });
        var getData = myService.methode('POST',"../PartyMaster/SaveDynamicRows",JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                console.log("Dynamic Rows Saved");
            }

        });
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
            collectionobj.DeductionCycle = $scope.DeductionCycle;
            collectionobj.Applicability = $scope.Applicability;
            collectionobj.PTNumber = $scope.PTNumber;
            collectionobj.GovtFees = $scope.GovtFees;
            collectionobj.DepositeAmt = $scope.DepositeAmt;
            collectionobj.Payment = $scope.Payment;
            collectionobj.ApplicationLink = $scope.ApplicationLink;
            collectionobj.CreatedBy = LoginId;
            collectionobj.EffectiveFrom = $('#txtefectivefrom').val();
            collectionobj.Effectiveto = $('#txteffectiveto').val();

            if ($scope.Save == "Save") {
                collectionobj.Action = 8;
            }
            else {
                collectionobj.Action = 9;
            }
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelLWFCompliance"), JSON.stringify(collectionobj));
            getData.then(function (response) {
              /*  if (showMsgBox(response.data.Result)) {*/
                    $scope.Ptid = response.data.Result;
                    $scope.SaveDynamicrow();
                    $scope.ClearControl(1);
                //}
            });
        }
    }
    $scope.DeleteRecord = function () {
        //deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
        showMsgBox('999', 'Warning', 'Delete Option Not Availabe , Please Inactive Party', 'warning', 'btn-warning')
    };

    $scope.deleteRecord = function () {

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
        collectionobj.Action = 10;
        var getData = myService.methode('POST', ("../PartyMaster/GetNewCompliancesData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Status", "HeaderValue": "Status", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Deduction Cycle", "HeaderValue": "DeductionCycle", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PT Number", "HeaderValue": "PTNumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Applicability", "HeaderValue": "Applicability", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Payment", "HeaderValue": "Payment", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Application Link", "HeaderValue": "ApplicationLink", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Gov Fees", "HeaderValue": "GovtFees", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Security Deposit Amount", "HeaderValue": "DepositeAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Effective From", "HeaderValue": "EffectiveFrom", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Effective To", "HeaderValue": "Effectiveto", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Start Range", "HeaderValue": "StartAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "End Range", "HeaderValue": "EndAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Monthly Tax Amount", "HeaderValue": "MonthlyAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
            
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
                $scope.DeductionCycle = row[3];
                $scope.PTNumber = row[4]
                $scope.Applicability = row[5];
                $scope.Payment = row[6];
                $scope.ApplicationLink = row[7];
                $scope.GovtFees = row[8];
                $scope.DepositeAmt = row[9];
                $scope.EffectiveFrom = new Date(row[10]);
                $scope.Effectiveto = new Date(row[11]);
                $scope.Value1 = row[12];
                $scope.Value2 = row[13];
                $scope.Value3 = row[14];
                $scope.$applyAsync();
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
                { "HeaderText": "Deduction Cycle", "HeaderValue": "DeductionCycle", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "PT Number", "HeaderValue": "PTNumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Applicability", "HeaderValue": "Applicability", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Payment", "HeaderValue": "Payment", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Application Link", "HeaderValue": "ApplicationLink", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Gov Fees", "HeaderValue": "GovtFees", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Security Deposit Amount", "HeaderValue": "DepositeAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Effective From", "HeaderValue": "EffectiveFrom", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Effective To", "HeaderValue": "Effectiveto", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Start Range", "HeaderValue": "StartAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "End Range", "HeaderValue": "EndAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Monthly Tax Amount", "HeaderValue": "MonthlyAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
            ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}