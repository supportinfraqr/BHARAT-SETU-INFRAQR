app.ReportLicenseMaster = function ($scope, $element, $filter, myService) {


    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.BindStore = function () { 
        $scope.showLoader();
        var collectionobj = {
            Action: 10,
            UserId: LoginId
          
        };
        var getData = myService.methode('POST', ("../RetailSection/ReportLicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };
    $scope.GetStatusMaster = function () {
        var collectionobj = {};
        collectionobj.Name = "All";
        var getData = myService.methode('POST', ("../RetailSection/GetStatusMaster"), JSON.stringify(collectionobj));
        return getData.then(function (response) {
            $scope.StatusMasterList = response.data.Result;
            $scope.ApplicationStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "ApplicationStatus";
            });

            $scope.LicenseStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "LicenseStatus";
            });

            $scope.RenewalStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "RenewalStatus";
            });
 
             
        });


    }; 
    $scope.started = function () {
        $scope.showLoader();
        document.title = "Licence Master Report";
        var collectionobj = {
            Action: 10,
            UserId: LoginId,
            StoreCode: $scope.StoreCode,
            ApplicationStatus: $scope.ApplicationStatus,
            LicenseStatus: $scope.LicenseStatus,
            RenewalStatus: $scope.RenewalStatus
            
        };
        var getData = myService.methode('POST', ("../RetailSection/ReportLicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
         
            messagevalues = [
               
                { "Store Code": $("#ddlStoreCode").val() ? $("#ddlStoreCode option:selected").text() : "" },
                 { "Application Status": $("#ddlApplicationStatus").val() ? $("#ddlApplicationStatus option:selected").text() : "" },
                { "License Status": $("#ddlLicenseStatus").val() ? $("#ddlLicenseStatus option:selected").text() : "" },
                { "Renewal Status": $("#ddlRenewalStatus").val() ? $("#ddlRenewalStatus option:selected").text() : "" },
            ];

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "SrNo", "HeaderValue": "SrNo", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "StoreCode", "HeaderValue": "StoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Ref StoreCode", "HeaderValue": "RefStoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Store Name", "HeaderValue": "StoreName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "CompleteAddress", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Store Location", "HeaderValue": "StoreLocation", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "City Name", "HeaderValue": "CityName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "StateName", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "RegionName", "HeaderValue": "RegionName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "ZipCode", "HeaderValue": "ZipCode", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Circle", "HeaderValue": "Circle", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Store Manager Name", "HeaderValue": "StoreManagerName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Store Manager MobileNo", "HeaderValue": "StoreManagerMobileNo", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "StoreManagerEmail", "HeaderValue": "StoreManagerEmail", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Status", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Days Of Expire", "HeaderValue": "DaysOfExpire", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "CategoryName", "HeaderValue": "CategoryName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "License Expiry days", "HeaderValue": "LED", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    
                    { "HeaderText": "Proposed Date", "HeaderValue": "ProposedDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "License Name", "HeaderValue": "LicenseName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "License Type", "HeaderValue": "LicenseType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                
                    { "HeaderText": "Requested Date", "HeaderValue": "RequestedDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Document Date", "HeaderValue": "DocumentDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    {  "HeaderText": "Application Status", "HeaderValue": "ApplicationStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    {  "HeaderText": "Application Date", "HeaderValue": "ApplicationDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Upload ApplicationCopy", "HeaderValue": "UploadApplicationCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Upload FeesCopy", "HeaderValue": "UploadFeesCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                     { "HeaderText": "Upload ChallanCopy", "HeaderValue": "UploadChallanCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Upload RenewedCopy", "HeaderValue": "UploadRenewedCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                   
                    
                    { "HeaderText": "License Status", "HeaderValue": "LicenseStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "License Date", "HeaderValue": "IssuedDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Upload LicenseCopy", "HeaderValue": "UploadLicenseCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "License Number", "HeaderValue": "LicenseNumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Validity StartDate", "HeaderValue": "ValidityStartDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Validity EndDate", "HeaderValue": "ValidityEndDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "User Name", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "User Password", "HeaderValue": "UserPassword", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Mobile Number", "HeaderValue": "MobileNumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Tentative Date", "HeaderValue": "TentativeDateofComp", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "License Cost", "HeaderValue": "ActualCost", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Govt Fees", "HeaderValue": "GovtFees", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Renewal RequestDate", "HeaderValue": "RenewalRequestDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "RenewalStatus", "HeaderValue": "RenewalStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Renewal StartDate", "HeaderValue": "RenewalStartDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Renewal EndDate", "HeaderValue": "RenewalEndDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Expiry Status", "HeaderValue": "EXPIRESTATUS", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    
                ];
           
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}