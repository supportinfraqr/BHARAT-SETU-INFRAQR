app.RetailOverViewMasterController = function ($scope, $element, $filter, $sce, myService) {
    $scope.disableDelete = false;
    $scope.IseditDisable = false;
    $scope.disablePrint = false;
    $scope.ActFile = '';
    $scope.RuleFile = '';
    $scope.BindState = function () {
        // Fetch all states
        myService.methode('POST', "../PartyMaster/GetPartyMasterDT", { ActionType: 28, PartyId: "1" })
            .then(function (response) {
                $scope.AllStateList = response.data.Result;
            })
            .catch(function (error) {
                console.error("Error fetching states:", error);
            });
    };

    //$scope.ActUploadExcelFile = function (element) {
    //    var file = element.files[0]; // Get the selected file
    //    if (!file) return;

    //    var reader = new FileReader();
    //    reader.onload = function (e) {
    //        $scope.$apply(function () {
    //            $scope.ActFile = file; // Store file object
    //        });
    //    };
    //    reader.readAsDataURL(file);
    //};
    //$scope.RuleUploadExcelFile = function (element) {
    //    var file = element.files[0]; // Get the selected file
    //    if (!file) return;

    //    var reader = new FileReader();
    //    reader.onload = function (e) {
    //        $scope.$apply(function () {
    //            $scope.RuleFile = file; // Store file object
    //        });
    //    };
    //    reader.readAsDataURL(file);
    //};

    $scope.ActUploadExcelFile = function (element) {
        var file = element.files[0]; // Get the selected file
        if (!file) return;

        // Validate file type (only PDF and Excel)
        const allowedExtensions = ['pdf', 'xls', 'xlsx'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            alert("Only PDF and Excel files are allowed.");
            element.value = ''; // Clear the invalid file selection
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            $scope.$apply(function () {
                $scope.ActFile = file; // Store file object
            });
        };
        reader.readAsDataURL(file);
    };

    $scope.RuleUploadExcelFile = function (element) {
        var file = element.files[0]; // Get the selected file
        if (!file) return;

        // Validate file type (only PDF and Excel)
        const allowedExtensions = ['pdf', 'xls', 'xlsx'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            alert("Only PDF and Excel files are allowed.");
            element.value = ''; // Clear the invalid file selection
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            $scope.$apply(function () {
                $scope.RuleFile = file; // Store file object
            });
        };
        reader.readAsDataURL(file);
    };

    $scope.BindAct = function () { 
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = $scope.State;
        var getData = myService.methode('POST', ("../RetailSection/SearchActMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.AllActList = response.data.Result.Table;
                $scope.AllActList = $scope.AllActList.filter(item => String(item.StateId) === String($scope.State));
                $scope.hideLoader();
            })
            .catch(function (error) {
                console.error("Error fetching states:", error);
                $scope.hideLoader();
            });
    };



    $scope.toggleDropdown = function () {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    };

    $scope.toggleDropdownIndustry = function () {
        $scope.dropdownOpenIndustry = !$scope.dropdownOpenIndustry;
    };
    $scope.updateIndustrySelection = function () {
        const IndustrySelection = Object.keys($scope.selectedIndustry)
            .filter(key => $scope.selectedIndustry[key]);

        if (IndustrySelection.length === 0) {
            $scope.IndustryList = '';
            alert("Please select at least one Industry.");
            return;
        }
        else { $scope.IndustryList = IndustrySelection; }
    };

    // Save selected states
    $scope.updateStateSelection = function () {
        const selected = Object.keys($scope.selectedStates)
            .filter(key => $scope.selectedStates[key]);

        if (selected.length === 0) {
            $scope.StateList = '';
            alert("Please select at least one state.");
            return;
        }
        else { $scope.StateList = selected; }
    };


    $scope.disableDelete = true;
    $scope.disablePrint = true;
  $scope.SaveRecord = function () {
        if (isValidate()) {

            var formData = new FormData();
            $scope.showLoader();
            formData.append("Createdby", LoginId);
            formData.append("State", $scope.State);
            formData.append("ActId", $scope.ActId);
            formData.append("ActOverview", escape(CKEDITOR.instances.txtHeaderTemplate.getData() || ''));
            formData.append("Action", 6);
            formData.append("ActFile", $scope.ActFile);
            formData.append("RuleFile", $scope.RuleFile);
          
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
        $scope.ActId = "";
        $scope.State= ""; 
        $scope.Save = "Save";
        $scope.ActFile = '';
        $scope.RuleFile = '';
        $scope.hfId = ""; 
        $scope.disableDelete = false;
        $scope.disablePrint = false;
        $scope.IseditDisable = false;
        $scope.Act = ''; 
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
        collectionobj.Action = 7;
        var getData = myService.methode('POST', ("../RetailSection/SearchActMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [

                    { "HeaderText": "Id", "Value": "Id",  "HeaderValue": "RowId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Act Name", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "CreatedOn", "HeaderValue": "CreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                  
                ];


            loadDataUsingPreDefinedColumn(tblheader, response.data.Result.Table);
            $scope.MasterList = response.data.Result.Table;
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                 
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.MasterList = $filter('filter')($scope.MasterList, { 'Id': $scope.hfId });
            
                $scope.State = ($scope.MasterList[0].StateId).toString();
                $scope.BindAct();
                let editorData = unescape($scope.MasterList[0].ActOverview);
                CKEDITOR.instances.txtHeaderTemplate.setData(editorData);
                $scope.ActFile = $scope.MasterList[0].ActFile;
                $scope.RuleFile = $scope.MasterList[0].RuleFile;
                //---------------------------------------------------- 
               
                setTimeout(function () {
                    $scope.ActId = ($scope.MasterList[0].ActId).toString();
                    $scope.$applyAsync();
                }, 500);
            
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
