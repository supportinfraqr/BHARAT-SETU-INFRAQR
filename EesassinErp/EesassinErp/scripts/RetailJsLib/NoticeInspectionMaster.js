app.NoticeInspectionMaster = function ($scope, $element, $filter, myService) { 

    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.BindFilter = function () {
        $scope.showLoader(); 
        var collectionobj = {
            Action: 9,
            Id: LoginId,
            LoginAs: $scope.LoginAs
           
        };

        var getData = myService.methode('POST', "../RetailSection/GetNoticeList", JSON.stringify(collectionobj));

        getData.then(function (response) {
            if (response && response.data && response.data.Result) {
                $scope.BindFilterList = response.data.Result;

                // Extract unique StoreCode and StoreId pairs
                let storeList = response.data.Result
                    .filter(item => item.StoreId && item.StoreCode) // Filter out null/undefined values
                    .map(item => ({ StoreId: item.StoreId, StoreCode: item.StoreCode }));

                // Remove duplicate StoreId entries
                $scope.StoreCodeList = Array.from(new Map(storeList.map(item => [item.StoreId, item])).values());

                // Extract unique DepartmentId and DepartmentName pairs
                let departmentList = response.data.Result
                    .filter(item => item.DepartmentId && item.DepartmentName) // Filter out null/undefined values
                    .map(item => ({ DepartmentId: item.DepartmentId, DepartmentName: item.DepartmentName }));

                // Remove duplicate DepartmentId entries
                $scope.DepartmentNameList = Array.from(new Map(departmentList.map(item => [item.DepartmentId, item])).values());

                console.log("Processed Store List:", $scope.StoreCodeList);
                console.log("Processed Department List:", $scope.DepartmentNameList);
            } else {
                $scope.BindFilterList = [];
                $scope.StoreCodeList = [];
                $scope.DepartmentNameList = [];
            }
        }).catch(function (error) {
            console.error("Error fetching notice list:", error);
        }).finally(function () {
            $scope.hideLoader();
        });
    };



   
    $scope.started = function () { 
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.Id = LoginId;
        collectionobj.LoginAs = $scope.LoginAs;
        collectionobj.StoreId =  $scope.StoreId,
            collectionobj.DepartmentId =  $scope.DepartmentId
        var getData = myService.methode('POST', ("../RetailSection/GetNoticeList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues = [
                { "Department Name": $("#ddlDepartmentName").val() ? $("#ddlDepartmentName option:selected").text() : "" },
                { "Store Code": $("#ddlStoreCode").val() ? $("#ddlStoreCode option:selected").text() : "" }
            ];
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Department", "HeaderValue": "DepartmentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StoreCode", "HeaderValue": "StoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Submitions", "HeaderValue": "Submitions", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Submitions Date", "HeaderValue": "ReceiptDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Closer Status", "HeaderValue": "FinalReceiptDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Notice Date", "HeaderValue": "NoticeDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Notice Mode", "HeaderValue": "NoticeMode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Hearing Date", "HeaderValue": "HearingDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Officer Name", "OfficerName": "FinalReceiptDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Representative Name", "HeaderValue": "RepresentativeName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Representative Email", "HeaderValue": "RepresentativeEmail", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 


                ];
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}