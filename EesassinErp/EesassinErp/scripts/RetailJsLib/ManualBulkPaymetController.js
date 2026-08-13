app.ManualBulkPaymetController = function ($scope, $element, $filter, myService) {

   
    $scope.GetUnpaidLicence = function () {
        $scope.showLoader();
        $scope.StoreCode = "";
        $scope.LicenseName = "";
        $scope.InvoiceAmount = "";
        $scope.PaymentStatus = "";
        $scope.PaymentOverDueDate = "";
        $scope.LicenseType = "";
        $scope.LicenceRequstId = "";
        $scope.LicenceId = '';
        var collectionobj = {};
        collectionobj.Action = 7; 
        var getData = myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.UnpaidLicenceList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };

    $scope.ChangeSetValue = function (Id)
    {
        $scope.UNPAIDLIST = $filter('filter')($scope.UnpaidLicenceList, { 'LicenceRequstId': Id });
        $scope.StoreCode = $scope.UNPAIDLIST[0].StoreCode
        $scope.LicenseName = $scope.UNPAIDLIST[0].LicenseName
        $scope.InvoiceAmount = $scope.UNPAIDLIST[0].InvoiceAmount
        $scope.PaymentStatus = $scope.UNPAIDLIST[0].PaymentStatus
        $scope.PaymentOverDueDate = $scope.UNPAIDLIST[0].PaymentDueDate 
        $scope.LicenseType = $scope.UNPAIDLIST[0].LicenseType
        $scope.LicenceRequstId = $scope.UNPAIDLIST[0].LicenceRequstId 
    }
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.LicenceReqId = $scope.LicenceRequstId;
            collectionobj.LicenceId = $scope.LicenseName;
            collectionobj.StoreCode = $scope.StoreCode;
            collectionobj.Amount = $scope.InvoiceAmount;
            collectionobj.Action = 11;
            var getData = myService.methode('POST', ("../RetailSection/IUDManualPayment"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.GetUnpaidLicence();
                }
            });
        }
    }
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse'); 
        $scope.started();
    };
    $scope.MasterList = [];
    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 12;
        debugger;
        var getData = myService.methode('POST', "../RetailSection/SearchPayment", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            var tblheader =
                    [
                    { "HeaderText": "Sr.No.", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "StoreId", "HeaderValue": "StoreId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Licence Name", "HeaderValue": "LicenceId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "OrderId", "HeaderValue": "OrderId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "TransId", "HeaderValue": "TransId", "Width": "0px", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "TotalAmount", "HeaderValue": "TotalAmount", "Width": "0px", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PaymentMode", "HeaderValue": "PaymentMode", "Width": "0px", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PaymentMode", "HeaderValue": "PaymentMode", "Width": "0px", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "CreatedOn", "HeaderValue": "CreatedOn", "Width": "0px", "ShowColumn": "Yes", "ImageColumn": "No" }
                    ];

            $scope.MasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.hideLoader();
                alertbox("Not Athority, Please contact to support Team", "", "")
                return false;
              


            });
        });
    };
}
           