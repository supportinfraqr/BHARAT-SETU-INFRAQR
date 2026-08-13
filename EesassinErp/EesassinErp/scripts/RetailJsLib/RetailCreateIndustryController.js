app.RetailCreateIndustryController = function ($scope, $element, $filter, myService) {

    $scope.BindAct = function () {
        var collectionobj = {};
        collectionobj.Action = 4; 
        var getData = myService.methode('POST', "../Retail/SearchRetailCreateActCalender", '{obj:' + JSON.stringify(collectionobj) + '}');
         getData.then(function (response) {
             $scope.ActList = response.data.Result;
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
        $scope.IndustryName = '';
        $scope.Act = ''; 
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


    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', ("../Retail/InsertRetailCreateIndustry"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }
     
    $scope.SearchMasterList = [];
    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 8;
        debugger;
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                  
               /* { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }     ,    */        
                {
                "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No"
                }
                ];

            $scope.SearchMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.SearchMasterList = $filter('filter')($scope.SearchMasterList, { 'Id': $scope.hfId });
                $scope.IndustryName = $scope.SearchMasterList[0].Industry; 
             /*   $scope.Act = $scope.SearchMasterList[0].Act; */
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

    $scope.SaveRecord = function () { 
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Industry = $scope.IndustryName;
      /*      collectionobj.Act = $scope.Act; */
            if ($scope.Save == "Save") {
                collectionobj.Action = 5;
            }
            else {
                collectionobj.Action = 6;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', "../Retail/InsertRetailCreateIndustry", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }

}