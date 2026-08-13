app.RetailDocumentMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtDocumentName');
    

    $scope.SaveRecord = function () { 

        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.DocumentName = $scope.DocumentName;
            collectionobj.DocumentType = $scope.DocumentType;
            collectionobj.Frequency = $scope.Frequency;
            collectionobj.FormatType = $scope.FormatType;
            collectionobj.Note = $scope.Note;
            collectionobj.Act = $scope.Act;
            collectionobj.IsDefault =  $scope.IsDefault  == 'Yes' ? 'True' : 'False';
            collectionobj.Createdby = LoginId;
            collectionobj.Isdelete =    $scope.Isdelete == 'Yes' ? 'True' : 'False';
            collectionobj.StateId = $scope.StateId;
            collectionobj.Criticality = $scope.Criticality;
            collectionobj.FormNo = $scope.FormNo;
            if ($scope.Save == "Save")
            {
                collectionobj.Action = 1;
            }
            else
            {
                collectionobj.Action = 2;
                collectionobj.Id = $scope.hfId;
            }

            var getData = myService.methode('POST', "../Retail/InsertUpdateDelRetailDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
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
        $scope.disableAdd = false;
        $scope.StateId = "";
        $scope.Criticality = "";
        $scope.FormNo = "";
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.DocumentName = "";
        $scope.IsDefault = "";
        $scope.Isdelete = "";
        $scope.DocumentName = "";
        $scope.DocumentType = "";
        $scope.Frequency = "";
        $scope.FormatType = "";
        $scope.Note = "";
        $scope.Act = "";
        
        $scope.SetFocus('#txtFarmerName');
        $scope.hfId = "";
        $scope.ChequeNo = "";
        
        $scope.FarmerMasterList = [];
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
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchRetailDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
 
            var tblheader =
            [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "DocumentName", "HeaderValue": "DocumentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Is Mandotory", "HeaderValue": "IsDefault", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "DocumentType", "HeaderValue": "DocumentType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Frequency", "HeaderValue": "Frequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "FormatType", "HeaderValue": "FormatType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Note", "HeaderValue": "Note", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                   { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Form No", "HeaderValue": "FormNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Criticality", "HeaderValue": "Criticality", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "State Name", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Last Updated by", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Last Updated On", "HeaderValue": "LastUpdate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
             
                    
                    
            ];

            $scope.DocumentList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val(); 
                $scope.MasterList = $filter('filter')($scope.DocumentList, {'Id': $scope.hfId });
             

                $scope.DocumentName = row[1];
                $scope.IsDefault = row[2];
                $scope.DocumentType = row[3];
                $scope.Frequency = row[4];
                $scope.FormatType = row[5];
                $scope.Note = row[6];
                $scope.Act = row[7];
                $scope.FormNo = $scope.MasterList[0].FormNo;
                $scope.Criticality = $scope.MasterList[0].Criticality;
                $scope.StateId = $scope.MasterList[0].StateId;
                    
                $scope.Isdelete = $scope.MasterList[0].StateId;

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
    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": "1" });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }
    $scope.deleteRecord = function () {

        debugger;
        var collectionobj = {};
        collectionobj.Action = 3;  
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', "../Retail/InsertUpdateDelRetailDocumentMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
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
                     { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "DocumentName", "HeaderValue": "DocumentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "IsDefault", "HeaderValue": "IsDefault", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "DocumentType", "HeaderValue": "DocumentType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Frequency", "HeaderValue": "Frequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "FormatType", "HeaderValue": "FormatType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Note", "HeaderValue": "Note", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Last Updated by", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Last Updated On", "HeaderValue": "LastUpdate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
       ];
        $scope.PrintMaster(tblheader, $scope.DocumentList, window.document.title);
    };
}