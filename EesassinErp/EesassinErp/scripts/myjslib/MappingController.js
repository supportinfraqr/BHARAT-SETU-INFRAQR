app.MappingController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtVendorInvNum');
   
       
    $scope.ListSet = [];
    $scope.AddListSet = function () {
        $scope.ListSet.push({
            Srno: "",
            ClientId: "",
            ClientSiteId: "",
            VendorId: "",
            AuditorId: "", 
            

        });
        var $index = $scope.ListSet.length - 1;
        setTimeout(function () {
            $('#txtSrno' + $index).focus();
        }, 500);
    };
    $scope.RemoveListSet = function (index) {
        $scope.ListSet.splice(index, 1)
    };
    $scope.UpListSet = function (index) {
        x = index, y = index - 1;
        var obj = $scope.Sauda_Detail[x];
        $scope.ListSet[x] = $scope.ListSet.splice(y, 1, obj)[0];
    };
    $scope.DownListSet = function (index) {
        x = index;
        if (index == $scope.ListSet.length - 1)
            y = 0;
        else
            y = index + 1;
        var obj = $scope.ListSet[x];
        $scope.ListSet[x] = $scope.ListSet.splice(y, 1, obj)[0];
    };
       
    
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
    $scope.BindClientSite = function (ClientId, index) {
        var collectionobj = {};
        collectionobj.ActionType = 10;
        collectionobj.PartyID = ClientId;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteCList[index] = response.data.Result;
          
        });
    }
     
    $scope.AllPartySiteCList = [];
   
    $scope.SaveAfterValidate = function ()
    {
        if (isValidate()) {
            for (var i = 0; i < $scope.ListSet.length; i++)
            {
                $scope.showLoader();
                var collectionobj = {};
                collectionobj.ClientId = $scope.ListSet[i].ClientId;
                collectionobj.ClientSiteId = $scope.ListSet[i].ClientSiteId;;
                collectionobj.VendorId = $scope.ListSet[i].VendorId;
                collectionobj.AuditorId = $scope.ListSet[i].AuditorId;
                collectionobj.Action = 4;
                var getData = myService.methode('POST', "../DocumentMaster/VerifyMap", '{obj:' + JSON.stringify(collectionobj) + '}');
                getData.then(function (response) {
                    if (response.data.Result == '-1') {
                        showMsgBox('999', 'Duplicate Record', 'Please Check Row :' + i, 'warning', 'btn-warning');
                         
                    }
                    $scope.hideLoader();
                });
            }
             
        }
    }
      
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.MapListSet = $scope.ListSet;
            collectionobj.CreatedBy = LoginId; 
          
            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                 
            }
            var getData = myService.methode('POST', "../DocumentMaster/InsertUpdateDelMapping", '{obj:' + JSON.stringify(collectionobj) + '}');

            getData.then(function (response) {
                if (response.data.Result == "Duplicate Record")
                {
                    showMsgBox('999', 'Duplicate', response.data.Result, 'warning', 'btn-warning');
                }
                else {
                    showMsgBox('999', 'Save', response.data.Result, 'success', 'btn-success');
                    $scope.ClearControl(1);
                }
               
            });
        }
    }

 
    $scope.Delete = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.VendorInvId = $scope.hfId;
            collectionobj.CreatedBy = LoginId;
            collectionobj.IsDeleted = 1;
            collectionobj.ActionType = 3;
            var getData = myService.methode('POST', "../Mapping/InsertUpdateDelMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
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
        $scope.ListSet = [];
        $scope.AddListSet();
      
        $scope.disableAdd = false;
        $scope.disableEdit = true;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;  
        if (flag == 0) {
            showMsgBox('4');
        };
    }
    $scope.MappingList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.CreatedBy = LoginId;
        var getData = myService.methode('POST', "../DocumentMaster/GetMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Client", "HeaderValue": "Client", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Client Site", "HeaderValue": "ClientSite", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Vendor", "HeaderValue": "Vendor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Auditor", "HeaderValue": "Auditor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   
                ];

            $scope.MappingList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                $scope.IsHide = true;
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.MappingList = $filter('filter')($scope.MappingList, { 'Id': $scope.hfId });
                $scope.ListSet[0].Id = $scope.MappingList[0].Id;
                $scope.ListSet[0].ClientId = $scope.MappingList[0].ClientId;
                $scope.BindClientSite($scope.ListSet[0].ClientId, 0);
                setTimeout(function () {
                    $scope.ListSet[0].ClientSiteId = $scope.MappingList[0].ClientSiteId
                }, 500);
                $scope.ListSet[0].VendorId = $scope.MappingList[0].VendorId
                $scope.ListSet[0].AuditorId = $scope.MappingList[0].AuditorId 
                $scope.Save = "Edit";
                //$scope.disableDelete = false;
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
                  { "HeaderText": "Sr.No.", "Value": "InvoiceId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Serial No", "HeaderValue": "InvoiceId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Created On", "HeaderValue": "CreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Client", "HeaderValue": "ClientName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Site", "HeaderValue": "SiteName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Finacial Year", "HeaderValue": "FYName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            ];
        $scope.PrintMaster(tblheader, $scope.VendorInvoiceList, window.document.title);
    };
}
