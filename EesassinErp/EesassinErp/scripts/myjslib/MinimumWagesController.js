app.MinimumWagesController = function ($scope, $element, $filter, myService) {

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

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            $scope.IndustryList = response.data.Result;;
        });
    }


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
            collectionobj.Industry = $scope.Industry;
            collectionobj.PaymentFrequency = $scope.PaymentFrequency;
            collectionobj.PercentageBonus = $scope.PercentageBonus;
            collectionobj.PayoutMonth = $scope.PayoutMonth;
            collectionobj.Grade = $scope.Grade;
            collectionobj.EmploymentCategory = $scope.EmploymentCategory;
            collectionobj.Zone = $scope.Zone;
            collectionobj.BasicPerMonth = $scope.BasicPerMonth;
            collectionobj.VDAPerMonth = $scope.VDAPerMonth;
            collectionobj.TotalPerMonth = $scope.TotalPerMonth;
            collectionobj.MinimumWage = $scope.MinimumWage;
            collectionobj.FloorWage = $scope.FloorWage;
            collectionobj.CreatedBy = LoginId;
            collectionobj.EffectiveFrom = $('#txtefectivefrom').val();
            collectionobj.Effectiveto = $('#txteffectiveto').val();

            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
            }
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelMinimumWageCompliance"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
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
        debugger;
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
        $scope.State = "";
        $scope.Status = "";
        $scope.Industry = "";
        $scope.PaymentFrequency = "";
        $scope.PercentageBonus = "";
        $scope.PayoutMonth = "";
        $scope.Grade = "";
        $scope.EmploymentCategory = "";
        $scope.Zone = "";
        $scope.BasicPerMonth = "";
        $scope.VDAPerMonth = "";
        $scope.TotalPerMonth = "";
        $scope.MinimumWage = "";
        $scope.FloorWage = "";
        $scope.CreatedBy = "";
        $scope.EffectiveFrom = "";
        $scope.EffectiveTo = "";
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
        var getData = myService.methode('POST', ("../PartyMaster/GetNewCMinmumWages"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [{ "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Status", "HeaderValue": "Status", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Payment Frequency", "HeaderValue": "PaymentFrequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Yearly Percentage of Bonus", "HeaderValue": "YearlyperBonus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Payout Month", "HeaderValue": "PayoutMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Grade", "HeaderValue": "Grade", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Employment Category", "HeaderValue": "EmploymentCategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Zone", "HeaderValue": "Zone", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Basic per Month", "HeaderValue": "BasicPerMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "VDA per Month", "HeaderValue": "VDAPerMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Total per Month", "HeaderValue": "TotalPerMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Minimum Wage", "HeaderValue": "MinWage", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Floor Wage", "HeaderValue": "FloorWage", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
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
                $scope.Industry = row[2];
                $scope.Status = row[3];
                $scope.PaymentFrequency = row[4];
                $scope.PercentageBonus = row[5];
                $scope.PayoutMonth = row[6];
                $scope.Grade = row[7];
                $scope.EmploymentCategory = row[8];
                $scope.Zone = row[9];
                $scope.BasicPerMonth = row[10];
                $scope.VDAPerMonth = row[11];
                $scope.TotalPerMonth = row[12];
                $scope.MinimumWage = row[13];
                $scope.FloorWage = row[14];

                $scope.EffectiveFrom = new Date(row[15]);
                $scope.Effectiveto = new Date(row[16]);
            
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
            [{ "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Status", "HeaderValue": "Status", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Payment Frequency", "HeaderValue": "PaymentFrequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Yearly Percentage of Bonus", "HeaderValue": "PercentageBonus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Payout Month", "HeaderValue": "PayoutMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Grade", "HeaderValue": "Grade", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Employment Category", "HeaderValue": "EmploymentCategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Zone", "HeaderValue": "Zone", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Basic per Month", "HeaderValue": "BasicPerMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "VDA per Month", "HeaderValue": "VDAPerMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Total per Month", "HeaderValue": "TotalPerMonth", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Minimum Wage", "HeaderValue": "MinimumWage", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Floor Wage", "HeaderValue": "FloorWage", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Effective From", "HeaderValue": "EffectiveFrom", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Effective To", "HeaderValue": "Effectiveto", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
           
            ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}