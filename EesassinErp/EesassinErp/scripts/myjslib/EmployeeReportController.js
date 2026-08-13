app.EmployeeReportController = function ($scope, $element, $filter, myService) {
    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {

        var collectionobj = {};
        collectionobj.Action = 7;

        collectionobj.BranchCode = BranchCode;
        collectionobj.FromDate = moment($scope.FromDate).format('DD-MM-YYYY');
        collectionobj.ToDate = moment($scope.ToDate).format('DD-MM-YYYY');

        var getData = myService.methode('POST', "../Report/SearchReport", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            messagevalues =
                  [
                    { "FromDate": moment($scope.FromDate).format('DD-MMM-YYYY') },
                    { "ToDate": moment($scope.ToDate).format('DD-MMM-YYYY') }
                  ];

            var tblheader =

             [
                { "HeaderText": "Sr No", "HeaderValue": "SNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Name", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Father Name", "HeaderValue": "FatherName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Gender", "HeaderValue": "Gender", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Designation", "HeaderValue": "Designation", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Last Login", "HeaderValue": "LastLogin", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

             ];

            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}