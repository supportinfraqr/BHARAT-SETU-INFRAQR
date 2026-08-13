app.LogController = function ($scope, $element, $filter, myService) {


    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {

        var collectionobj = {};
        var datenew = "";
        if ($('#txtStartDate').val() == '') {
            datenew = '-1';
        }
        else { datenew = $('#txtStartDate').val(); }
        collectionobj.CreatedOn = datenew;
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', ("../RetailSection/GetMaintainLog"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues =
                [
                    { "Activity Date": $("#txtStartDate").text() },
                ];

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "RowId", "HeaderValue": "RowId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Activity", "HeaderValue": "Activity", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "CreatedOn", "HeaderValue": "CreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Machine Name", "HeaderValue": "MachineName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "System UserName", "HeaderValue": "SystemUserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "LocalIP", "HeaderValue": "localIP", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Public IP", "HeaderValue": "publicIP", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Longitude latitude", "HeaderValue": "longi_lati", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                  


                ];
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}