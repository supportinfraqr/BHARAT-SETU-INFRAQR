app.ComplianceMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtScore');
  
    $scope.SaveRecord = function () {
       
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Form = $scope.Form;
            collectionobj.Act = $scope.Act;
            collectionobj.Nature = $scope.Nature;
            collectionobj.Remark = $scope.Remark;
            collectionobj.Score = $scope.Score;
           
            if ($scope.Save == "Save") {
                collectionobj.Action = 9;
            }
            else {
                collectionobj.Action = 2;
                collectionobj.Id = $scope.hfId;
            }

            var getData = myService.methode('POST', "../DocumentMaster/IUDComplianceMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
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
        
        $scope.Save = "Save";
        $scope.disableAdd = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.Score = "";
        $scope.Id = "";
        $scope.Form = "";
        $scope.Act = "";
         $scope.Nature = "";
         $scope.Remark = "";
        $scope.Score = "";
        $scope.visibleAdd = true
        $scope.IsAdd = true;
        $scope.SetFocus('#txtScore');
     
        if (flag == 0) {
            showMsgBox('4');
        };
         
    }
    $scope.DocumentList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        
        var getData = myService.methode('POST', "../DocumentMaster/GetAuditorCompliance", '{obj:' + JSON.stringify(collectionobj) + '}');

        //   var getData = myService.methode('POST', (APIURLPath + "DocumentMaster/GetDocumentMaster"), JSON.stringify(collectionobj));

        getData.then(function (response) {

            var tblheader =
            [
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Form", "HeaderValue": "Form", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Nature", "HeaderValue": "Nature", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Remark", "HeaderValue": "REMARK", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Score", "HeaderValue": "Score", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
            ];

            $scope.DocumentList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
            

                $scope.Act = row[1];
                $scope.Form = row[2];
               
                $scope.Nature = row[3];
                $scope.Remark = row[4];
                $scope.Score = row[5];

                $scope.disableAdd = false;

                $scope.Save = "Edit";
                $scope.disableDelete = false;
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

    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', "../DocumentMaster/IUDComplianceMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        //   var getData = myService.methode('POST', (APIURLPath + "DocumentMaster/IUDDocumentMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    };
    /*Refresh Search Table Record*/
    $(document).on("click", ".RefreshSearchTable", function (e) {
        
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
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Form", "HeaderValue": "Form", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Nature", "HeaderValue": "Nature", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Remark", "HeaderValue": "Remark", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Score", "HeaderValue": "Score", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }

       ];
        $scope.PrintMaster(tblheader, $scope.DocumentList, window.document.title);
    };
}