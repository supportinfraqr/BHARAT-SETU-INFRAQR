app.PartyReportController = function ($scope, $element, $filter, myService) {


    $scope.Setuser= function()
    {
        if (loginType == '2')
        {
            $scope.VendorId = MapId;
            $scope.isvendirhide = true;
        }
        else if (loginType == '3')
        {
            $scope.AuditorId = MapId;
            $scope.isauditorhide = true;
        }
    }


    $scope.BindClient = function () {
        var collectionobj = {};
        collectionobj.ActionType = 9;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartyCList = response.data.Result;;
        });
    }
    $scope.BindVendor = function (index) {
        var collectionobj = {};
        collectionobj.ActionType = 7;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data.Result;
        });
    }
    $scope.BindAuditor = function () {
        var collectionobj = {};
        collectionobj.ActionType = 8;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteAList = response.data.Result;
        });
    }
    $scope.BindClientSite = function () {
        var collectionobj = {};
        collectionobj.ActionType = 10;
        collectionobj.PartyID = $scope.ClientId;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList = response.data.Result;

        });
    }


    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {

        var collectionobj = {};  
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.ClientSiteId = $scope.ClientSiteId;
        collectionobj.VendorId = $scope.VendorId;
        collectionobj.AuditorId = $scope.AuditorId;
         
        collectionobj.ActionType = 11;
        debugger;
        var getData = myService.methode('POST', ("../Report/SearchReport"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues =
                  [
                            { "ClientId":  $("#ddlClientId option:selected").text()}, 
                            { "ClientSiteId": $("#ddlClientSite option:selected").text() },
                            { "VendorId": $("#ddlVendor option:selected").text() },
                            { "AuditorId": $("#ddlAuditor option:selected").text() },
                  ];

            var tblheader =
             [
                      { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Client", "HeaderValue": "Client", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Client Site", "HeaderValue": "ClientSite", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Vendor", "HeaderValue": "Vendor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Auditor", "HeaderValue": "Auditor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
               
             ];
            
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


}