app.VendorSiteManagerController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtSiteName');
    $scope.ValidFrom = new Date();
    $scope.ValidTo = new Date();
    $scope.vendoc = false;
    setTimeout(function () {
        $scope.Save = "Update";
        $scope.disableDelete = true;
        $scope.disableAdd = false;
        $scope.disableSearch = true;
        $scope.disablePrint = true;
        $scope.disableClear = true;
    }, 1000); 

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 12;
        collectionobj.PartyID = MapId;
      
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data;
        });
    }



    $scope.loadDataSite = function () {
        var collectionobj = {};
        $scope.ResetControl(1);
        collectionobj.ActionType = 13;
        collectionobj.PartyID = $scope.SiteId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.Address = response.data[0].Address;  
            $scope.CountryId = response.data[0].CountryName;
            $scope.StateId = response.data[0].STATE_NAME;
            $scope.CityId = response.data[0].CITY_NAME;
            $scope.Pincode = response.data[0].Pincode;
            $scope.LocationCode = response.data[0].LocationCode;
            $scope.MobileNo = response.data[0].ContactNo;
            $scope.Description = response.data[0].Description;
            $scope.CLRARC = response.data[0].CLRARC;
            $scope.ContactPerson = response.data[0].ContactPerson;
            $scope.ContactMobile = response.data[0].ContactMobile;
            $scope.Descritpion = response.data[0].Descritpion;
            $scope.ValidFrom = response.data[0].ValidFrom;
            $scope.ManPowerCount = response.data[0].ManPowerCount;
            $scope.ValidTo = response.data[0].ValidTo;
            $scope.VendorFileDoc = response.data[0].FileDoc;
            if($scope.VendorFileDoc !='')
            {
                $scope.vendoc = true;
            }
            else { $scope.vendoc = false; }
        });
    }

    $scope.Vendorshow = function (input, imgfileid) {
        $scope.vendoc = false;
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.VendorFileDoc = e.target.result;

                $scope.$applyAsync();
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync();
        }
    };
  
     
    $scope.SaveRecord = function () {

        if ($scope.VendorFileDoc == '' || $scope.VendorFileDoc == undefined)
        {
                showMsgBox('999', 'Warning', 'Please Select Attachment', 'warning', 'btn-warning');
                return;
        }
        else
        {
            $scope.AfterSave();
        }
       
    }
    $scope.AfterSave = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
         
            collectionobj.VendorFileDoc = $scope.VendorFileDoc;
            collectionobj.SiteId = $scope.SiteId;
            collectionobj.PartyId = MapId;
            collectionobj.ActionType = 7;

            var getData = myService.methode('POST', ("../SiteManager/InsertUpdateDelSiteManager"), JSON.stringify(collectionobj));
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
        $scope.vendoc = false; 
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = true;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.SiteName = "";
        $scope.Address = "";
        $scope.EmailId = "";
        $scope.MobileNo = "";
        $scope.Description = "";
        $scope.LocationCode = "";
        $scope.BankDetails = "";
        $scope.AccountNo = "";
        $scope.Panitno = "";
        $scope.Gstinuin = "";
        $scope.Pincode = "";
        $scope.CLRARC = "";
        $scope.CLRLIC = "";
        $scope.ContactPerson = "";
        $scope.ContactMobile = "";
        $scope.Descritpion = "";
        $scope.ValidFrom = "";
        $scope.ValidTo = "";
        $scope.Manpowertype = "";
        $scope.ManPowerCount = "";

        $scope.AdminFileDoc = "";
        $scope.VendorFileDoc = "";

        $("#txtpincode").val('');
        $("#ddlcountry").val(0).change();
        $("#ddlstate").val(0).change();
        $("#ddlcity").val(0);
        $scope.SetFocus('#txtSiteName');
        $scope.hfId = 0;
        $scope.hfId1 = 0; 
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    
}