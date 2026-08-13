app.VendorReportController = function ($scope, $element, $filter, myService) {
    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };

    $scope.BindAllotFarmList = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.FarmerId = $scope.FarmerId;
        collectionobj.BranchCode = BranchCode;
        var getData = myService.methode('POST', "../Convertion/SearchFromSupervision", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.FarmAllotList = response.data.Result;
        });
    };

    $scope.started = function () {

        var collectionobj = {};
        collectionobj.Action = 4;
        
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
                { "HeaderText": "Sr No", "HeaderValue": "VendorId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Vendor Type", "HeaderValue": "VendorType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Name", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "AccountGroup", "HeaderValue": "AccountGroup", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "EmailId", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Pincode", "HeaderValue": "Pincode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "ContactNo", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "BankDetails", "HeaderValue": "BankDetails", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "RegistrationType", "HeaderValue": "RegistrationType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "PANITNO", "HeaderValue": "PANITNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "GSTINUIN", "HeaderValue": "GSTINUIN", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
             ];

            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}