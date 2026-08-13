app.ExpectationController = function ($scope, $element, $filter, myService) {


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
        collectionobj.Action = 6;
        collectionobj.Id = LoginId
        debugger;
        var getData = myService.methode('POST', ("../RetailSection/GetMaintainLog"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues =
                [
                    { "Activity Date": $("#txtStartDate").text() },
                ];

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "PageName", "HeaderValue": "PageName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "FileName", "HeaderValue": "FileName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "MismatchContent", "HeaderValue": "MismatchContent", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                  
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Uploaded", "HeaderValue": "Uploaded", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },


                ];
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}