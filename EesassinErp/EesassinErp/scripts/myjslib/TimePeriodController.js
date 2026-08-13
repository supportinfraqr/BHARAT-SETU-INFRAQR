app.TimePeriodController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#ddlClientId');
 

    $scope.AllParty = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 4 });
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;;
        });
    }
    $scope.BindFinacialYear = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 6 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data;
        });
    }
    $scope.BindMonth = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 7 });
        getData.then(function (response) {
            debugger;
            $scope.MonthList = response.data;
        });
    }
    $scope.AllPartySiteC = function () {
        var getData = myService.methode('POST', ("../SiteManager/GetSiteManagerListDT"), { "ActionType": 5, "PartyId": $scope.ClientId });
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList = response.data.Result;
        });
    }


    $scope.AllPartySiteLoadWI = function (VendorId) {
        var collectionobj = {};
        collectionobj.ActionType = 18;
        collectionobj.PartyID = $scope.ClientId; 
        collectionobj.CreatedBy = VendorId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList = response.data;
        });
    }

    $scope.SetSingleLocation = function (WClientSiteId) {

        $scope.IsLocation = true;
        $scope.hideIsLocation = false;
        $scope.$applyAsync();
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.PartyId = WClientSiteId;
        collectionobj.CreatedBy = MapId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.LocationL = response.data.Result;
        });
    }

    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.ClientId = $scope.ClientId;
            collectionobj.VendorId = $scope.VendorId;
            collectionobj.Year = $scope.Year;
            collectionobj.Month = $scope.Month;
            collectionobj.Location = $scope.WLocation;
            collectionobj.ClientSiteId = $scope.WClientSiteId;
           
            collectionobj.EndDate = $('#EndDate').val();
  
            
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
                collectionobj.Id =  $scope.hfId
            }
            var getData = myService.methode('POST', ("../TimePeriod/IUDTimePeriod"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }
    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);      
    };

    $scope.deleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.Id = $scope.hfId;  
        var getData = myService.methode('POST', ("../TimePeriod/IUDTimePeriod"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    };
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
        $scope.Save = "Save";
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.ClientId =
        $scope.VendorId = "";
        $scope.Year = "";
        $scope.Month = "";
        $('#txtEndDate').val('');
        $scope.DateList = '';
        $scope.hfId = "";
        $scope.TimePeriodList = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.TimePeriodList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };
    $scope.BindInvoice = function ()
    {
        var collectionobj = {};
        collectionobj.ActionType = 6; 
        var getData = myService.methode('POST', ("../TimePeriod/GetSearchTimePeriod"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.InvoiceList = response.data.Result;
        });
    }
    $scope.BindDate = function (InId) {
        var collectionobj = {};
        collectionobj.ActionType = 8;
        collectionobj.Id = InId;
        var getData = myService.methode('POST', ("../TimePeriod/GetSearchTimePeriod"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.DateList = response.data.Result[0].WIEndDate;
        });
    }
    
    $scope.UpdateRecord = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.ActionType = 7;
            collectionobj.Id = $scope.InId;
            collectionobj.EndDate = $('#txtEndDate').val();
            var getData = myService.methode('POST', ("../TimePeriod/IUDTimePeriod"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $('#ddlinvoice').text(); 
                    $scope.DateList = '';  
                    $scope.FireEmail(18, $scope.InId, MapId);
                    $scope.BindInvoice();
                }
            });
        }
    }
    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        debugger;
        var getData = myService.methode('POST', ("../TimePeriod/GetSearchTimePeriod"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "SNO", "HeaderValue": "SNO", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Client", "HeaderValue": "Client", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Vendor", "HeaderValue": "Vendor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Year", "HeaderValue": "Year", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    
                      { "HeaderText": "Site", "HeaderValue": "SITENAME", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                        { "HeaderText": "Location", "HeaderValue": "Location", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                           { "HeaderText": "End Date", "HeaderValue": "Enddate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                 ];
          
            $scope.TimePeriodList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();  
                $scope.TimePeriodList = $filter('filter')($scope.TimePeriodList, { 'Id': $scope.hfId }); 
                $scope.ClientId = $scope.TimePeriodList[0].ClientId;
                $scope.VendorId = $scope.TimePeriodList[0].VendorId;
                $scope.Year = $scope.TimePeriodList[0].Year;
                $scope.Month = $scope.TimePeriodList[0].Month;
              
                $scope.SetSingleLocation($scope.TimePeriodList[0].ClientSiteId)
                var collectionobj = {};
                collectionobj.ActionType = 18;
                collectionobj.PartyID = $scope.TimePeriodList[0].ClientId;
                collectionobj.CreatedBy = $scope.TimePeriodList[0].VendorId;
                var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
                getData.then(function (response) {
                    debugger;
                    $scope.AllPartySiteCList = response.data;
                });
              
                setTimeout(function () {
                    $scope.WClientSiteId = $scope.TimePeriodList[0].ClientSiteId; 
                    $scope.WLocation = $scope.TimePeriodList[0].Location;
                }, 1000);
               
                $('#EndDate').val($scope.TimePeriodList[0].Enddate);
                $scope.$applyAsync();
                $scope.Save = "Edit";
                $scope.$applyAsync();
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();


            });
        });
        $scope.hideLoader();
    };

    /*Refresh Search Table Record*/
    $(document).on("click", ".RefreshSearchTable", function (e) {
        debugger;
        var panelToRefresh = $(this).closest('.panel').find('.refresh-container');
        var dataToRefresh = $(this).closest('.panel').find('.panel-wrapper');
        var loadingAnim = panelToRefresh.find('.loading-progress');
        panelToRefresh.show();
        setTimeout(function () {
            loadingAnim.addClass('la-animate');
        }, 100);
        $scope.started();
        return false;
    });

    $scope.PrintRecord = function () {
        var tblheader =
               [
                   { "HeaderText": "Sr.No.", "Value": "SNO", "HeaderValue": "SNO", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                   { "HeaderText": "Client", "HeaderValue": "Client", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   { "HeaderText": "Vendor", "HeaderValue": "Vendor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   { "HeaderText": "Hours", "HeaderValue": "Hours", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   { "HeaderText": "Minutes", "HeaderValue": "Minutes", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
               ];
        $scope.PrintMaster(tblheader, $scope.TimePeriodList, window.document.title);
    };
}