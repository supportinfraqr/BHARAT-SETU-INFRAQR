app.FileRetailMatchingController = function ($scope, $element, $filter, myService) {
    $scope.disableDelete = true;
    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            if (Array.isArray($scope.StateList)) {
                collectionobj.State = $scope.StateList.join(',');
            } else {
                collectionobj.State = $scope.StateList;
            }
            collectionobj.MatchingText = $scope.MatchingText;
            collectionobj.SetInColumn = $scope.SetInColumn;
            collectionobj.SelectedColumn = $scope.SelectedColumn; 
            collectionobj.CreatedBy = LoginId;
            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../Retail/IUDRetailFileMatching"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.ClearControl(1);
                }
            });
        }
    }
 

    $scope.selectedStates = {}; // Individual state selections
    $scope.selectAllStates = false; // "Select All" checkbox state

    $scope.toggleDropdown = function () {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    };

    $scope.updateStateSelection = function () {
        const selected = Object.keys($scope.selectedStates).filter(key => $scope.selectedStates[key]);

        if (selected.length === 0) {
            $scope.StateList = '';
            alert("Please select at least one state.");
            return;
        } else {
            $scope.StateList = selected;
        }

        // Check if all states are selected
        $scope.selectAllStates = selected.length === $scope.AllStateList.length;
    };

    $scope.toggleSelectAll = function () {
        $scope.selectedStates = {};

        if ($scope.selectAllStates) {
            // Select all states
            $scope.AllStateList.forEach(state => {
                $scope.selectedStates[state.SATE_CODE] = true;
            });
        } else {
            // Deselect all states
            $scope.selectedStates = {};
        }

        $scope.updateStateSelection();
    };


    $scope.StateList = [];

    $scope.AllState = function () { 
        myService.methode('POST', "../PartyMaster/GetPartyMasterDT", { ActionType: 28, PartyId: "1" })
            .then(function (response) {
                $scope.AllStateList = response.data.Result;
            })
            .catch(function (error) {
                console.error("Error fetching states:", error);
            });
    };

    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () { 
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', "../Retail/IUDRetailFileMatching", '{obj:' + JSON.stringify(collectionobj) + '}'); 
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
        debugger; 
        $scope.disablePrint = true;
        $scope.MatchingText = "";
        $scope.SelectedColumn = "";
      
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

        $scope.showLoader();

        // Object to send
        var collectionobj = { Action: 4 };

        var getData = myService.methode('POST', "../Retail/SearchRetailFileMatching", JSON.stringify(collectionobj));

        getData.then(function (response) {

            var tblheader = [
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Selected Column", "HeaderValue": "SelectedColumn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Matching Text", "HeaderValue": "MatchingText", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Set in Column", "HeaderValue": "VaildText", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "State", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
            ];

            $scope.MasterList = response.data.Result;

            loadDataUsingPreDefinedColumn(tblheader, $scope.MasterList);


            /*** ON DOUBLE CLICK ***/
            $('#example tbody').on('dblclick', 'tr', function () {

                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();

                // Filter selected row record
                $scope.MasterList = $filter('filter')(response.data.Result, { 'Id': $scope.hfId });

                $scope.SelectedColumn = $scope.MasterList[0].SelectedColumn;
                $scope.MatchingText = $scope.MasterList[0].MatchingText;
                $scope.SetInColumn = $scope.MasterList[0].VaildText;

                /*** STATE FIX START ***/
                $scope.StateList = $scope.MasterList[0].State;   // This is array like [{StateId:1,StateName:"X"} ...]

             
                $scope.preselectedStates = [];
                $scope.selectedStates = {};

                if ($scope.StateList) {

                    let temp = [];

                    // CASE 1: If State is array → [{StateId:1},{StateId:2}]
                    if (Array.isArray($scope.StateList)) {

                        temp = $scope.StateList.map(function (x) {
                            return Number(x.StateId);
                        });

                    } else if (typeof $scope.StateList === "string") {
                        // CASE 2: If State is string → "1,2,3"

                        // Remove spaces
                        let clean = $scope.StateList.replace(/\s/g, "");

                        // Split into array
                        temp = clean.split(',').map(Number);
                    }

                    // Now temp = [1,2,3,...]
                    $scope.preselectedStates = temp;

                    temp.forEach(function (id) {
                        $scope.selectedStates[id] = true;
                    });
                }



                // Apply changes on UI
                $scope.$applyAsync();
                $scope.Save = "Edit";
                $scope.disableDelete = false;
                $scope.disableAdd = false;
                $scope.disablePrint = true;

                $scope.$apply();
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();
            });

        });

        $scope.hideLoader();
    };






}