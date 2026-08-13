
app.ActMasterController = function ($scope, $element, $filter, myService) {
   
    $scope.selectedUsers = [];
    $scope.StateList = [];
    
    $scope.AllState = function () {
        // Fetch all states
        myService.methode('POST', "../PartyMaster/GetPartyMasterDT", { ActionType: 28, PartyId: "1" })
            .then(function (response) {
                $scope.AllStateList = response.data.Result;
            })
            .catch(function (error) {
                console.error("Error fetching states:", error);
            });
    };

    // Initialize variables
    $scope.selectedStates = {};
    $scope.selectedIndustry = {};
    $scope.dropdownOpen = false;
    $scope.dropdownOpenIndustry = false;
   
   
    $scope.toggleDropdown = function () {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    };
  
    $scope.toggleDropdownIndustry = function () {
        $scope.dropdownOpenIndustry = !$scope.dropdownOpenIndustry;
    };
    $scope.selectedIndustry = {}; // Individual industry selections
    $scope.selectAllIndustry = false; // "Select All" checkbox state

    $scope.toggleDropdownIndustry = function () {
        $scope.dropdownOpenIndustry = !$scope.dropdownOpenIndustry;
    };

    $scope.updateIndustrySelection = function () {
        const IndustrySelection = Object.keys($scope.selectedIndustry).filter(key => $scope.selectedIndustry[key]);

        if (IndustrySelection.length === 0) {
            $scope.IndustryList = '';
            alert("Please select at least one Industry.");
            return;
        } else {
            $scope.IndustryList = IndustrySelection;
        }

        // Check if all industries are selected
        $scope.selectAllIndustry = IndustrySelection.length === $scope.AllIndustryList.length;
    };

    $scope.toggleSelectAllIndustry = function () {
        $scope.selectedIndustry = {};

        if ($scope.selectAllIndustry) {
            // Select all industries
            $scope.AllIndustryList.forEach(industry => {
                $scope.selectedIndustry[industry.Id] = true;
            });
        } else {
            // Deselect all industries
            $scope.selectedIndustry = {};
        }

        $scope.updateIndustrySelection();
    };

    //$scope.updateIndustrySelection = function () {
    //    const IndustrySelection = Object.keys($scope.selectedIndustry)
    //        .filter(key => $scope.selectedIndustry[key]);

    //    if (IndustrySelection.length === 0) {
    //        $scope.IndustryList = '';
    //        alert("Please select at least one Industry.");
    //        return;
    //    }
    //    else { $scope.IndustryList = IndustrySelection; }
    //};
   
    // Save selected states
    //$scope.updateStateSelection = function () {
    //    const selected = Object.keys($scope.selectedStates)
    //        .filter(key => $scope.selectedStates[key]);

    //    if (selected.length === 0) {
    //        $scope.StateList = '';
    //        alert("Please select at least one state.");
    //        return;
    //    }
    //    else { $scope.StateList = selected; }
    //};
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

     
    $scope.disableDelete = true;
    $scope.disablePrint = true;
     
    $scope.SaveRecord = function () {
        debugger;
       if ($scope.StateList.length === 0) {
            showMsgBox('Please select atleast one State');
            return false;
        }
       if ($scope.IndustryList.length === 0) {
           showMsgBox('Please select atleast one Industry');
            return false;
        } 
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            const FORMAT = "DD-MM-YYYY";
          

            if (Array.isArray($scope.IndustryList)) {
                collectionobj.IndustryList = $scope.IndustryList.join(',');
            } else {
                collectionobj.IndustryList = $scope.IndustryList;
            } 

            if (Array.isArray($scope.StateList)) {
                collectionobj.State = $scope.StateList.join(',');
            } else {
                collectionobj.State = $scope.StateList;
            } 

            collectionobj.Act = $scope.Act;
            collectionobj.CreatedBy = LoginId; 
            collectionobj.Industry = $scope.Industry;
            collectionobj.selectedCategory = $scope.selectedCategory;
            collectionobj.selectedSubcategory = $scope.selectedSubcategory;
            if ($scope.Save == "Save") {
                collectionobj.Action = 1;
            }
            else {
                collectionobj.Action = 2;
                collectionobj.Id = $scope.hfId;
            }
            var getData = myService.methode('POST', ("../RetailSection/IUDActMaster"), JSON.stringify(collectionobj));
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

    

    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };

    $scope.deleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 3
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', ("../RetailSection/IUDActMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }

    $scope.ResetControl = function (flag) {
     
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        
        $scope.Act = ""; 
        $scope.StateId = "";
        $scope.Industry = "";
       
        $scope.Save = "Save";
       
       
        $scope.selectedStates = {};
        $scope.selectedIndustry = {};
        $scope.hfId = "";
        $scope.StateList = [];
        $scope.IndustryList = [];
        $scope.AllState();
        $scope.AllIndustry();
       
        $scope.dropdownOpen = false;
        $scope.dropdownOpenIndustry = false;
        if (flag == 0) {
            showMsgBox('4');
        };
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };


    

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            debugger;
            $scope.AllIndustryList = response.data.Result;;
        });
    }
    $scope.started = function () {
        $scope.selectedStates = {};
        $scope.selectedIndustry = {};
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 4; 
        var getData = myService.methode('POST', ("../RetailSection/SearchActMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [

                    { "HeaderText": "Id", "HeaderValue": "RowId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ActId", "HeaderValue": "ActId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Act Name", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "State Name", "HeaderValue": "STATE_NM", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "CreatedOn", "HeaderValue": "CreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Category", "HeaderValue": "selectedCategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Subcategory", "HeaderValue": "selectedSubcategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    
                ];

            
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result.Table);
            $('#example tbody').on('dblclick', 'tr', function ()
            {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();

                $scope.hfId = row[1];

                $scope.Act = row[2];
                $scope.selectedCategory = row[6];
                $scope.selectedSubcategory = row[7];
              
                    //-----------------------------------------------

                    $scope.StateList = [];
                $scope.StateList = response.data.Result.Table2;
                $scope.preselectedStates = [];
                $scope.StateList = $scope.StateList.filter(item => String(item.ActId) === String($scope.hfId));
                    if ($scope.StateList.length > 0) { 
                        var Statestringbuilder = "";
                        var Stateseprator = ""; 
                    
                        for (let i = 0; i < $scope.StateList.length; i++) {
                            Statestringbuilder += Stateseprator + $scope.StateList[i].StateId;
                            Stateseprator = ",";
                        }

                        $scope.StateList = Statestringbuilder;
                        $scope.preselectedStates = Statestringbuilder.split(',').map(Number); // Convert to array of integers
                    }
                    $scope.preselectedStates.forEach(stateId => {
                        $scope.selectedStates[stateId] = true;
                    });


                    //---------------------------------------------------- 
                //-----------------------------------------------

                $scope.IndustryList = [];
                $scope.IndustryList = response.data.Result.Table1;
                $scope.preselectedIndustryList = [];
                $scope.IndustryList = $scope.IndustryList.filter(item => String(item.ActId) === String($scope.hfId));
                if ($scope.IndustryList.length > 0) {
                    var IndustryListstringbuilder = "";
                    var IndustryListseprator = "";

                    for (let i = 0; i < $scope.IndustryList.length; i++) {
                        IndustryListstringbuilder += IndustryListseprator + $scope.IndustryList[i].IndustryId ;
                        IndustryListseprator = ",";
                    }

                    $scope.IndustryList = IndustryListstringbuilder;
                    $scope.preselectedIndustryList = IndustryListstringbuilder.split(',').map(Number); // Convert to array of integers
                }
                $scope.preselectedIndustryList.forEach(IndustryId => {
                    $scope.selectedIndustry[IndustryId] = true;
                });


                    //---------------------------------------------------- 
             
                    $scope.Save = "Edit";
                    $scope.disableAdd = false;
                    $scope.disableDelete = false;
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
