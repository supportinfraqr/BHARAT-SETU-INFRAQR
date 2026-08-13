app.LocationController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtSiteName');
 
    //$scope.StoreList = $scope.StoreList.filter(
    //    (v, i, a) => a.findIndex(t => t.StoreId === v.StoreId) === i
    //);

    $scope.AllParty = function () {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.PartyId = MapId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;;
        });
    }

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.PartyID = $scope.ClientId;

        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data;
        });
    }

     
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};

            collectionobj.CreatedBy = LoginId;
            collectionobj.ClientSiteId = $scope.SiteId;
            collectionobj.PartyId = $scope.ClientId;
            collectionobj.Location = $scope.Location; 
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelLocation"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }

    $scope.ClearControl = function (flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
        }
    };

    $scope.ResetControl = function (flag) {
        debugger;
        $scope.vendoc = true;
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.SiteId = "";
        $scope.ClientId = "";
        $scope.Location = ""; 
        $scope.Save = "Save";
        $scope.SetFocus('#txtLocation');
        $scope.hfId = 0;
        $scope.hfId1 = 0;
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {

        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.Id = $scope.hfId;

        var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelLocation"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.ClientId = '-1';
        $scope.AllParty();
        $scope.AllPartySiteLoad();
        $scope.started();
    };
    $scope.MasterList = [];
    $scope.started = function () {
        var collectionobj = {};
        collectionobj.ActionType = 4;
        debugger;
        var getData = myService.methode('POST', "../PartyMaster/GetSearchLocation", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            var tblheader =
                    [
                    { "HeaderText": "Sr.No.", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                       { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   { "HeaderText": "Site Name", "HeaderValue": "SiteName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Location", "HeaderValue": "Location", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
                    ];

            $scope.MasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                 
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = row[0];
                $scope.FilerList = [];
                $scope.FilerList = $filter('filter')($scope.MasterList, { 'ID': $scope.hfId });
                 
                $scope.Location = $scope.FilerList[0].Location;
                $scope.ClientId = $scope.FilerList[0].PartyId;
                $scope.SiteId = $scope.FilerList[0].SiteId;
                
                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlRating', true);
                $scope.hideLoader();


            });
        });
    };
}