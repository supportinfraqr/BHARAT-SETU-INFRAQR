app.ActoverviewController = function ($scope, $element, $filter, myService) {

   
    $scope.disableDelete = false;
    $scope.BindACT = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateActCalender"), { "Action": 4 });
        getData.then(function (response) {
            debugger;
            $scope.ActList = response.data.Result;;
        });
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
        $scope.disableDelete = true;
        $scope.disablePrint = true; 
        $scope.Act = '';
        CKEDITOR.instances.txtHeaderTemplate.setData("");
     
        $('#txtDueDate').val('');
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
        showMsgBox('999', 'Alert', 'Not Allowed, please edit and leave blank', 'warning', 'btn-warning');
    };

    $scope.deleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', ("../Retail/IUDActoverview"), JSON.stringify(collectionobj));
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
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateActCalender"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    {
                        "HeaderText": "Sr.No.", "Value": "CACId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                     { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Overview", "HeaderValue": "ActOverview", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                ];

            $scope.SearchMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val(); 
                $scope.Act = $scope.hfId;
                CKEDITOR.instances.txtHeaderTemplate.setData(row[2]); 
                $scope.$applyAsync();
                $scope.disableDelete = false;
                $scope.disableAdd = false;
              
                $scope.$apply(); 
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut(); 
                $scope.SetFocus('#ddlAct', true);
                $scope.hideLoader(); 
            });
        });
        $scope.hideLoader();
    };

    $scope.SaveRecord = function () {

        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};  
            collectionobj.Description = CKEDITOR.instances.txtHeaderTemplate.getData(); 
            collectionobj.Action = 9;
            collectionobj.Id = $scope.Act;
            var getData = myService.methode('POST', "../Retail/IUDActoverview", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }

}