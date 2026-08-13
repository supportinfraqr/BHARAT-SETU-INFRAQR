app.RetailCreateExecuterController = function ($scope, $element, $filter, myService) {
    debugger;
    $scope.SetFocus('#ddlParty');
    $scope.disableDelete = true;
    $scope.disablePrint = true; 

   

    $scope.AllPartySiteLoad = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5; 
        collectionobj.PartyType = 'Client';
        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;
        });
    }
    $scope.AllUserListsLoad = function (PartyId) {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.Id = PartyId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllUserList = response.data.Result;
        });
    }

    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.PartyId = $scope.PartyId;
            collectionobj.UserId = $scope.ExecuterId;
            collectionobj.IsActive = $scope.IsActive 
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../Retail/IUDRetailCreateExecuter"), JSON.stringify(collectionobj));
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
        $scope.PartyId = "";
        $scope.ExecuterId = "";
        $scope.IsActive = "True";
        $scope.Save = "Save";

        $scope.SetFocus('#ddlParty'); 
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
        collectionobj.IsDeleted = 1;
        var getData = myService.methode('POST', ("../Retail/IUDRetailCreateExecuter"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };
    $scope.MasterList = [];
    $scope.started = function () {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 4;
        var getData = myService.methode('POST', "../Retail/SearchRetailCreateExecuter", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "User", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "IsExecuter", "HeaderValue": "IsExecuter", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                  
                ];

            $scope.MasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                debugger;
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.FilerList = [];
                $scope.FilerList = $filter('filter')($scope.MasterList, { 'Id': $scope.hfId });

                $scope.PartyId = $scope.FilerList[0].PartyId;
                $scope.AllUserListsLoad($scope.PartyId);
                
                setTimeout(function () {
                    $scope.ExecuterId = $scope.FilerList[0].ExecuterId;
                }, 500);
                
                $scope.IsActive = $scope.FilerList[0].IsActive == 1 ? 'True' : 'False';
               

                $scope.Save = "Edit";
                $scope.disableDelete = true;
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