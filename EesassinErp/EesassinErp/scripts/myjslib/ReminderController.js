app.ReminderController = function ($scope, $element, $filter, myService) {

     
    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {

        var collectionobj = {};
        var datenew = "";
        if ($('#txtStartDate').val()=='') {
            datenew = '-1';
        }
        else { datenew = $('#txtStartDate').val();}
        collectionobj.StartDate = datenew;
        collectionobj.Action = 2;
        debugger;
        var getData = myService.methode('POST', ("../Report/SearchReminderReport"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues =
                [
                { "Reminder Date": $("#txtStartDate").text() },
                ];

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "RowId", "HeaderValue": "RowId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "StoreCode", "HeaderValue": "StoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "LicenseNumber", "HeaderValue": "LicenseNumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "LicenseName", "HeaderValue": "LicenseName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StartDate", "HeaderValue": "StartDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EndDate", "HeaderValue": "EndDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ReminderDate", "HeaderValue": "ReminderDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Status", "HeaderValue": "Status", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ToEmail", "HeaderValue": "ToEmail", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Licence Expiry Day", "HeaderValue": "LED", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Days Of Expire", "HeaderValue": "DaysOfExpire", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   

                ]; 
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}