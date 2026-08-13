app.DeclarationController = function ($scope, $element, $filter, $sce, myService) {
    $scope.disableDelete = false;
    $scope.IseditDisable = false;
    $scope.disablePrint = false;

    $scope.AllParty = function () {

        $scope.PartyType = "Client";
        $scope.UserNames = '';
        $scope.Password = '';
        $scope.AllPartyList = "";
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 32, "PartyType": $scope.PartyType, "PartyId": LoginId, });
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;
        });
    }


 
  $scope.SaveRecord = function () {
        if (isValidate()) {

            var formData = new FormData();
            $scope.showLoader(); 
            formData.append("ActOverview", escape(CKEDITOR.instances.txtHeaderTemplate.getData() || ''));
            formData.append("Action", 9);
            formData.append("ActId", $scope.PartyId);
            formData.append("State", $scope.DeclarationType);
          
            $.ajax({
                url: "../RetailSection/InsertOverView",
                type: "POST",
                data: formData,
                contentType: false,
                processData: false,
                success: function (response) {
                    response = JSON.parse(response.Result);
                    if (showMsgBox(response.Result)) {
                        $scope.ClearControl(1);
                    }
                },
                error: function (err) {
                    alert("Error saving record.");
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


 

  
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.ResetControl = function (flag) {  
        $scope.DeclarationType= "";
        $scope.Save = "Save"; 
        $scope.hfId = ""; 
        $scope.disableDelete = false;
        $scope.disablePrint = false;
        $scope.IseditDisable = false; 
        CKEDITOR.instances.txtHeaderTemplate.setData(""); 
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

        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 10;
        var getData = myService.methode('POST', ("../RetailSection/SearchActMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [

                    { "HeaderText": "Id", "Value": "Id", "HeaderValue": "Id", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    {
                        "HeaderText": "Declaration Type", "HeaderValue": "Type", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PartyName", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "OverView", "HeaderValue": "OverView", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   
                  
                ];


            loadDataUsingPreDefinedColumn(tblheader, response.data.Result.Table);
            $scope.MasterList = response.data.Result.Table;
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                 
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.MasterList = $filter('filter')($scope.MasterList, { 'Id': $scope.hfId });
            
               
                let editorData = unescape($scope.MasterList[0].Overview);
                CKEDITOR.instances.txtHeaderTemplate.setData(editorData);
                $scope.PartyId = $scope.MasterList[0].PartyId;
                $scope.DeclarationType = $scope.MasterList[0].Type; 
            
                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.disablePrint = false;
                $scope.IseditDisable = true; 
                $scope.$applyAsync();
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();
                $scope.hideLoader();

            });
        });
        $scope.hideLoader();
    };





}
