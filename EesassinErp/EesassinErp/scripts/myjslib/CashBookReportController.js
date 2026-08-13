app.CashBookReportController = function ($scope, $element, $filter, myService) {
    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {

        var collectionobj = {};
        collectionobj.Action = 11

        collectionobj.BranchCode = $scope.BranchId;
        collectionobj.FromDate = moment($scope.FromDate).format('DD-MM-YYYY');
        collectionobj.ToDate = moment($scope.ToDate).format('DD-MM-YYYY');

        var getData = myService.methode('POST', "../Sale/Searchpettycash", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            messagevalues =
                  [
                    { "FromDate": moment($scope.FromDate).format('DD-MMM-YYYY') },
                    { "ToDate": moment($scope.ToDate).format('DD-MMM-YYYY') },
                   { "Account Name":  $('#ddlBranchList :selected').text() }
                  ];

            var tblheader =
             [
                { "HeaderText": "Sr No", "HeaderValue": "SNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Date", "HeaderValue": "Createdon", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Narration", "HeaderValue": "Narration", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "FooterText": "Total", "CssClass": "td-wh-nor" },
                { "HeaderText": "Cr", "HeaderValue": "CrAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "text-right", "Fun": "Sum" },
                { "HeaderText": "Dr", "HeaderValue": "DrAmt", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "text-right", "Fun": "Sum" },
             
             ];


            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }
    $scope.BranchList = function () {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.BranchCode = BranchCode;
        var getData = myService.methode('POST', "../Sale/Searchpettycash", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BranchList = response.data.Result;
        });
    };

}