app.IndustryMappingController = function ($scope, $element, $filter, myService) {
   

     
    $scope.disableDelete = true;
    $scope.disablePrint = true;
     
    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            debugger;
            $scope.IndustryList = response.data.Result;;
        });
    }

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5; 
        collectionobj.PartyType = 'Client';
        var getData = myService.nonasyncmethode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllPartyList = response.data.Result;

        });
    }
    $scope.AllUserListsLoad = function (PartyId) {
        var collectionobj = {};
        collectionobj.ActionType = 15;
        collectionobj.Id = PartyId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllUserList = response.data.Result;
        }); 
    }

    $scope.SaveRecord = function () {
        
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.ClientId = $scope.PartyId;
            collectionobj.UserId = $scope.UserId;
            collectionobj.Industry = $scope.Industry; 
           

            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                collectionobj.Id =   $scope.hfId;
            } 
            var getData = myService.methode('POST', ("../Retail/INUIndustryMapping"), JSON.stringify(collectionobj));
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
        collectionobj.Action = 3;
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', "../Retail/INUIndustryMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
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

        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.Industry = "";
        $scope.UserId = "";
        $scope.PartyId = "";
        $scope.Save = "Save";
        if (flag == 0) {
            showMsgBox('4');
        };
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        $scope.AllPartySiteLoad(); 
        var getData = myService.methode('POST', ("../Retail/SearchMapping"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                      { "HeaderText": "PartyName", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "IndustryId", "HeaderValue": "IndustryId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "PartyId", "HeaderValue": "PartyId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "LoginId", "HeaderValue": "LoginId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                ];

            $scope.MappingList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val(); 
                $scope.Industry = row[4];
                $scope.PartyId = row[5];
              
                $scope.AllUserListsLoad($scope.PartyId );
                
                setTimeout(() => {
                    $scope.UserId = row[6];
                    $scope.$apply(); // Update the view
                }, 100); 
               
                $scope.Save = "Edit";
                $scope.$applyAsync();
                $scope.disableDelete = false;
                $scope.disableAdd = false;
           
                $scope.$apply(); 
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();
                $scope.hideLoader();
            });
        });
        $scope.hideLoader();
    };

     

}



