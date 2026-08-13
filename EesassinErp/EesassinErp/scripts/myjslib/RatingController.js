app.RatingController = function ($scope, $element, $filter, myService) {
    $('#isshow').attr('style','display:none')
    $scope.Vendorshow = function (input, imgfileid) {

        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.Certificate = e.target.result;

                $scope.$applyAsync();
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync();
        }
    };
    $scope.VendorParty = function () {
        var collectionobj = {};
        collectionobj.Action=5;
        var getData = myService.methode('POST', "../Rating/SearchRating", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data;
        });
    }
    $scope.SaveRecord = function () {

        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.UserId = $scope.VendorId;
            collectionobj.Rating = $scope.Rating;
            collectionobj.Certificate = $scope.Certificate;  
           
            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                
            }
            collectionobj.CreatedBy = LoginId;
            var getData = myService.methode('POST', "../Rating/IUDRating", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                debugger;
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
        $scope.Save = "Save";
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $('#isshow').attr('style', 'display:none')
        $scope.UserId = "";
        $scope.VendorId = "";
        $scope.Rating = "";
        $scope.Certificate = ""; 
        $scope.SetFocus('#ddlRating');
        $scope.hfId = "";
        $scope.EmployeeMasterList = [];
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
        collectionobj.Action = 3;
        collectionobj.UserId = $scope.VendorId;

        var getData = myService.methode('POST', "../Rating/IUDRating", '{obj:' + JSON.stringify(collectionobj) + '}');
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
    $scope.EmployeeMasterList = [];
    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.BranchCode = BranchCode;
        debugger;
        var getData = myService.methode('POST', "../Rating/SearchRating", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            var tblheader =
                    [
                    { "HeaderText": "Sr.No.", "Value": "UserId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Name", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Rating", "HeaderValue": "Rating", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }     
                    ];

            $scope.EmployeeMasterList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = row[0];

                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();  //$scope.PartyMasterList[0].PartyId;
             
                $scope.EmployeeMasterList = $filter('filter')($scope.EmployeeMasterList, { 'UserId': $scope.hfId });
               
                $scope.VendorId = $scope.EmployeeMasterList[0].UserId;
                $scope.Rating = $scope.EmployeeMasterList[0].Rating;
                $scope.Certificate = $scope.EmployeeMasterList[0].Certificate;
                $('#isshow').attr('style', 'display:block')

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