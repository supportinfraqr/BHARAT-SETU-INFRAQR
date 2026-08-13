 
app.LicenseMasterController = function ($scope, $element, $filter, myService) {
    $scope.hfLicenseId = 0;
    $scope.selectedDocuments = [];
    $scope.selectedUsers = [];
    $scope.StateList = [];
    $scope.NewCategoryList = [];
    $scope.disableCheckall = true;
    $scope.selectAll == false; 
    $scope.Istrue = false;
    $('#ddlLicenceName').prop('disabled', false);
    $('#ddlstateName').prop('disabled', false);
    $scope.BindAllDocumentList =   function () {
        var getData = myService.nonasyncmethode('GET', "../Retail/GetLicenseMasterDocumentList");
        getData.then(function (response) {
            $scope.AllDocumentList = response.data.Result; 
            $scope.chk = []; 
        });
    }
    $scope.BindAllState = function () {
        var collectionobj = {};
        collectionobj.ActionType = 11;
        var getData = myService.nonasyncmethode('POST', "../Retail/SearchLicenseDocumentMasterList", '{obj:' + JSON.stringify(collectionobj) + '}');
 
        getData.then(function (response) {
            $scope.AllStateList = response.data.Result.Table;
            $scope.chk = [];
        });
    }
    
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
    $scope.dropdownOpen = false; 
    $scope.selectedCategory = {};
    $scope.CategorydropdownOpen = false;
    // Toggle dropdown visibility
    $scope.toggleDropdown = function () {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    };
    $scope.CategorytoggleDropdown = function () {
        $scope.CategorydropdownOpen = !$scope.CategorydropdownOpen;
    };
    $scope.updateCategorySelection = function ()
    {
        const selectedCateg = Object.keys($scope.selectedCategory)
            .filter(key => $scope.selectedCategory[key]);

        if (selectedCateg.length === 0) {
            $scope.NewCategoryList = '';
            alert("Please select at least one Category.");
            return;
        }
        else { $scope.NewCategoryList = selectedCateg; }
        
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

    $scope.chk = [];
    $scope.chk1 = [];

    $scope.CategoryList = [{ Id: 1, Name: 'Retail Outlet/Store' }, { Id: 2, Name: 'Warehouse' }, { Id: 3, Name: 'Factory' }, { Id: 4, Name: 'Establishment' }]

    
    $scope.disableDelete = true;
    $scope.disablePrint = true;
    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [
            { "Module_Type": "Auditor", "Id": "3" },
            { "Module_Type": "Client", "Id": "4" },
        ];
        $scope.AllModuleTypeList = moduleTypeLst;
    }
    $scope.DefaultBind = function () {
        $scope.PartyTypeId = '4';
        var collectionobj = {};
        collectionobj.ActionType = 5; 
        collectionobj.PartyType = "Client";
        var getData = myService.nonasyncmethode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllPartyList = response.data.Result;
            $scope.disableCheckall = false;
            $scope.selectAll = false;
        });
    }

    $scope.AllPartySiteLoad =   function () {
        var collectionobj = {};
        collectionobj.ActionType = 5; 
        collectionobj.PartyType = "Client";
        var getData = myService.nonasyncmethode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllPartyList = response.data.Result;
            $scope.disableCheckall = false;
            $scope.selectAll =  false;
        });
    }
    $scope.SaveRecord = function () {
        debugger; 
        if ($scope.selectedUsers.length == 0 && $scope.NewCategoryList == '') {
            showMsgBox('Please select atleast one User or category');
            return false;
        }
        else if ($scope.NewCategoryList == '' || $scope.NewCategoryList.length==0) {
            if (!$scope.selectedUsers || $scope.selectedUsers.length == 0) {
                showMsgBox('Please select atleast one user');
                return false;
            }
            else if ($scope.selectedDocuments.length == 0) {
                showMsgBox('Please select atleast one document');
                return false;
            }
        } 
        else if ($scope.NewCategoryList.length === 0) {
            showMsgBox('Please select atleast one Category');
            return false;
        } 
        

        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            const FORMAT = "DD-MM-YYYY";
            collectionobj.PartyTypeId = "4"; $scope.PartyTypeId;
            collectionobj.PermissionId = $scope.PermissionId
           
            
            if ($scope.NewCategoryList == '' || $scope.NewCategoryList == undefined || $scope.NewCategoryList.length === 0)
            {
                if (!$scope.selectedUsers || $scope.selectedUsers.length === 0 || $scope.selectedUsers == '0') {
                    showMsgBox('Please select atleast one user or Category');
                    return;
                } else {
                    if (Array.isArray($scope.selectedUsers)) {
                        collectionobj.selectedUsersList = $scope.selectedUsers.join(',');
                    } else {
                        collectionobj.selectedUsersList = $scope.selectedUsers;
                    }
                }

            }
            else { collectionobj.selectedUsersList = 0; } 
            if (!$scope.selectedDocuments || $scope.selectedDocuments.length === 0) {
                showMsgBox('Please select atleast one Document');
                return;
            } 
            if ($scope.selectedDocuments.includes(',') == false)
            {
                if ($scope.selectedDocuments.length <=2) {
                    collectionobj.selectedDocumentsList = $scope.selectedDocuments[0];
                }
                else {

                    collectionobj.selectedDocumentsList = $scope.selectedDocuments.join(',');
                }
               
            }
            else {
                collectionobj.selectedDocumentsList = $scope.selectedDocuments;
            }

  
            if (Array.isArray($scope.NewCategoryList)) {
                collectionobj.CategoryList = $scope.NewCategoryList.join(',');
                } else {
                collectionobj.CategoryList = $scope.NewCategoryList;
                } 

           collectionobj.LicenseName = $('#ddlLicenceName option:selected').text(); // $scope.LicenseName;
            collectionobj.LicenseId = $scope.LicenseId;
            collectionobj.StartDate = moment($scope.StartDate).format(FORMAT);
            collectionobj.EndDate = moment($scope.EndDate).format(FORMAT);
            collectionobj.CreatedBy = LoginId;
            collectionobj.Id = $scope.StateId;
            collectionobj.Industry = $scope.Industry;
            collectionobj.LicenseMasterType = $scope.selectAll == true ? "Default" : "Manual";
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
                collectionobj.LicenseId = $scope.hfLicenseId;
                collectionobj.LSID = $scope.LSID;
                collectionobj.LCID = $scope.LCID;
            }
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelLicenseDocumentMaster"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result))
                {
                    $scope.BindAllDocumentList();
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
        showMsgBox('Delete not allowed, please contact to admin');
        return false;
    }

    $scope.ResetControl = function (flag) { 
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.PartyTypeId = "4";
        $scope.Category = "";
        $scope.selectedUsers = [];
        $scope.LicenseName = "";
        $scope.LicenseId = "";
        $scope.Act =  "";
        $scope.ApplicationLink =  "";
        $scope.StateId = "";
        $scope.LSID = "";
        $scope.LCID = "";
        $scope.chk1 = [];
        $scope.selectedDocuments = [];
        $scope.StartDate = "";
        $scope.Istrue = false;
        $scope.EndDate = "";
        $scope.PermissionId = "";
        $scope.Save = "Save";
        $scope.BindLICENCE();
        $scope.BindAllDocumentList();
        $scope.DefaultBind();
        $scope.AllPartySiteLoad();
        $scope.selectedStates = {};
        $scope.selectedCategory = {};
        $scope.Industry = "";
        $scope.StateList = [];
        $scope.AllState();
        $scope.NewCategoryList = [];
        $scope.toggleDropdown();
        $scope.CategorytoggleDropdown();
        $('#ddlLicenceName').prop('disabled', false);
        $('#ddlstateName').prop('disabled', false);

        CKEDITOR.instances.txtHeaderTemplate.setData('');
     






        $scope.CategoryList = [{ Id: 1, Name: 'Retail Outlet/Store' }, { Id: 2, Name: 'Warehouse' }, { Id: 3, Name: 'Factory' }, { Id: 4, Name: 'Establishment' }]
        if (flag == 0) {
            showMsgBox('4');
        };
    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };


    $scope.change1 = function (index) {
        if ($scope.chk1[index] == true) {
            $scope.chk1[index] = false;
        }
        else {
            $scope.chk1[index] = true;
        }

        seprator1 = ""
        stringbuilder1 = "";
        var count1 = 0;
        var chkflag1 = 0;
        $.each($scope.chk1, function (index, val) {
            if (val === true) {
                stringbuilder1 = stringbuilder1 + seprator1;
                stringbuilder1 = stringbuilder1 + index;
                $scope.selectedUsers = stringbuilder1;
                seprator1 = ","
                count1 += 1;
            }
            else {
                chkflag1 = 1;
            }
        });
        if (chkflag1 == 1) { $scope.ChkAll1 = false } else { $scope.ChkAll1 = true }
        if ($scope.AllPartyList.length == count1) {
            $scope.ChkAll1 = true
        }
        else {
            $scope.ChkAll1 = false
        }
        $scope.$applyAsync();
    }


    $scope.change = function (index) {
        if ($scope.chk[index] == true) {
            $scope.chk[index] = false;
        }
        else {
            $scope.chk[index] = true;
        }
        $scope.selectedDocuments = [];
        seprator = ""
        stringbuilder = "";
        var count = 0;
        var chkflag = 0;
        $.each($scope.chk, function (index, val) {
            if (val === true) {
                stringbuilder = stringbuilder + seprator;
                stringbuilder = stringbuilder + index;
                $scope.selectedDocuments = stringbuilder;
                seprator = ","
                count += 1; 
            }
            else {
                chkflag = 1;
            }
        });
        if (chkflag == 1)
        { $scope.ChkAll = false } else { $scope.ChkAll = true }
        if ($scope.AllDocumentList.length == count) {
            $scope.ChkAll = true
        }
        else {
            $scope.ChkAll = false
        } 
        $scope.$applyAsync();
    }
    $scope.Istrue = false;


    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            debugger;
            $scope.IndustryList = response.data.Result;;
        });
    }
    $scope.started = function () {
        $scope.AllPartySiteLoad();
        $scope.BindAllDocumentList();
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 5;
        $scope.selectedCategory = {};
        var getData = myService.methode('POST', ("../Retail/SearchLicenseDocumentMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                   
                    { "HeaderText": "RowId", "HeaderValue": "RowId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "LicenseName", "HeaderValue": "LicenseName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StartDate", "HeaderValue": "StartDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "EndDate", "HeaderValue": "EndDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "AssignTo", "HeaderValue": "AssignTo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PermissionFor", "HeaderValue": "PermissionFor", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ApplicationLink", "HeaderValue": "ApplicationLink", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Category", "HeaderValue": "CategoryName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "LSID", "HeaderValue": "LSID", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "LCID", "HeaderValue": "LCID", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                  
                ]; 

            $scope.LicenseMasterList1 = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
              
                $scope.id = row[0];
               
                $scope.LicenseId = row[0];
                $scope.hfLicenseName = row[1];
                $scope.hfStartDate = row[2];
                $scope.hfEndDate = row[3];
                $scope.id = parseInt($scope.id, 10);
                $scope.LicenseMasterList = $filter('filter')($scope.LicenseMasterList1, { 'RowId': $scope.id }, true);
                $scope.LSID = row[11];
                $scope.LCID = row[12];
               
               
                $scope.PermissionId = $scope.LicenseMasterList[0].PermissionId;
                $scope.Act = row[6];
                $scope.ApplicationLink = row[8];
             
                $scope.Category = $scope.LicenseMasterList[0].Category;
                $scope.Industry = $scope.LicenseMasterList[0].IndustryId; 
              /*  CKEDITOR.instances.txtHeaderTemplate.setData($scope.LicenseMasterList[0].Detail);*/
                var collectionobj = {};

                collectionobj.ActionType = 4;
                collectionobj.Id = $scope.id;
                collectionobj.LSID =  $scope.LSID;
                collectionobj.LCID = $scope.LCID;
        
                var getData = myService.methode('POST', ("../Retail/SearchLicenseDocumentMasterList"), JSON.stringify(collectionobj));
                getData.then(function (dt) {
                    $scope.LicenseDocumentMasterList = dt.data.Result.Table;
                  
                    $scope.LicenseId = $scope.LicenseDocumentMasterList[0].LicenseId;

                    $scope.table1 = dt.data.Result.Table1;
                    $scope.StateId = $scope.table1[0].StateId != null ? $scope.table1[0].StateId.toString() : '';

                    $scope.BindLICENCE();
                    $scope.StartDate = new Date($scope.hfStartDate);
                    $scope.EndDate = new Date($scope.hfEndDate); 
                    $scope.PartyTypeId = '4'//$filter('filter')($scope.AllModuleTypeList, { 'Id': $scope.LicenseDocumentMasterList[0].PartyTypeId })[0].Id;
                    $scope.LicenseId = $scope.LicenseDocumentMasterList[0].LicenseId;
                    $scope.hfLicenseId = $scope.LicenseId;
                    $scope.selectedUsers = [];
                    $scope.selectedUsers = $scope.LicenseDocumentMasterList[0].UserId;
                    $scope.Istrue = true;

 
                    $scope.change1($scope.selectedUsers); 
                    var List = $scope.LicenseDocumentMasterList[0].DocumentsId ;
                    var List1 = List.split(',');
                    seprator = "";
                    stringbuilder = ""; 
                    var count = 0;
                    for (let i = 0; i < List1.length; i++) {
                        stringbuilder = stringbuilder + seprator + List1[i];
                        seprator = ",";
                        $scope.chk[List1[i]] = true;
                        $scope.selectedDocuments = stringbuilder;
                    }
                    //-----------------------------------------------

                    //$scope.StateList = [];
                    //$scope.StateList = dt.data.Result.Table1;
                    //CKEDITOR.instances.txtHeaderTemplate.setData($scope.StateList[0].Detail);
                    //$scope.preselectedStates = [];
                    //if ($scope.StateList.length > 0) {
                    //  /*  var StateList1 = $scope.StateList[0].StateId.split(',');*/
                    //    var Statestringbuilder = "";
                    //    var Stateseprator = "";

                    //    for (let i = 0; i < $scope.StateList.length; i++) {
                    //        Statestringbuilder += Stateseprator + $scope.StateList[i].StateId;
                    //        Stateseprator = ",";
                    //    }

                    //    $scope.StateList = Statestringbuilder;
                    //    $scope.preselectedStates = Statestringbuilder.split(',').map(Number); // Convert to array of integers
                    //}
                    //$scope.preselectedStates.forEach(stateId => {
                    //    $scope.selectedStates[stateId] = true;
                    //});


                    //----------------------------------------------------

                    //-----------------------------------------------

                    $scope.NewCategoryList = [];
                    //$scope.CategoryList = [{ Id: 1, Name: 'Store' }, { Id: 2, Name: 'Warehouse' }, { Id: 3, Name: 'Factory' }, { Id: 4, Name: 'Establishment' }]


                    $scope.NewCategoryList = dt.data.Result.Table2;
                    $scope.preCategory = [];
                    if ($scope.NewCategoryList.length > 0) {
                     
                        var Categorystringbuilder = "";
                        var Categoryseprator = "";

                        for (let i = 0; i < $scope.NewCategoryList.length; i++) {
                            Categorystringbuilder += Categoryseprator + $scope.NewCategoryList[i].CategoryId;
                            Categoryseprator = ",";
                        }

                        $scope.NewCategoryList = Categorystringbuilder;
                        $scope.preCategory = Categorystringbuilder.split(',').map(Number); // Convert to array of integers
                    }
                    $scope.preCategory.forEach(CategoryId => {
                        $scope.selectedCategory[CategoryId] = true;
                    });


                    //----------------------------------------------------
                   

                    $scope.LicenseName = $scope.hfLicenseName;
                    $('#ddlstateName').prop('disabled', true);

                    $('#ddlLicenceName').prop('disabled', true);
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
        });
        $scope.hideLoader();
    };

    $scope.SelectAllUser = function () {
        if ($scope.selectAll) {
            $scope.selectedUsers = $scope.AllPartyList.map(function (user) {
                return user.PartyId;
            });
            $scope.disableUserDropdown = true;
        } else {
            $scope.disableUserDropdown = false;
            $scope.selectedUsers = [];
        }
    };

    $scope.SaveRecordLicence = function ()
    { 
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            const FORMAT = "DD-MM-YYYY";
          if ($scope.StateList.length === 0) {
                showMsgBox('Please select atleast one State');
                return false;
            }
            if (Array.isArray($scope.StateList)) {
                collectionobj.StateList = $scope.StateList.join(',');
            } else {
                collectionobj.StateList = $scope.StateList;
            } 
            collectionobj.ApplicationLink = $scope.ApplicationLink;
            collectionobj.Act = $scope.Act;  
            collectionobj.Detail = CKEDITOR.instances.txtHeaderTemplate.getData();
            collectionobj.LicenseName = $scope.LicenseName; 
            const format = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            collectionobj.StartDate = format.format(new Date()); 
            collectionobj.EndDate = format.format(new Date());
            collectionobj.CreatedBy = LoginId;  
            if ($scope.Save == "Save") {
                collectionobj.ActionType = 6;
            }
            else {
                collectionobj.ActionType = 7;
                collectionobj.LicenseId = $scope.hfLicenseId;
            }
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelLicenseDocumentMaster"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) { 
                    $scope.ClearControl(1);

                }
            });
        }
    }


    $scope.SearchRecordLicence = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.startedLicence();
    };
    $scope.BindLICENCE = function () {
        var collectionobj = {};
        collectionobj.ActionType = 12;
        collectionobj.Id = $scope.StateId
        var getData = myService.methode('POST', ("../Retail/SearchLicenseDocumentMaster"), JSON.stringify(collectionobj));
         getData.then(function (response) {
             $scope.LicenceList = response.data.Result;
             $scope.LicenceList1 = response.data.Result;
             var StateId = parseInt($scope.StateId); 
             $scope.LicenceList = $filter('filter')($scope.LicenceList1, { 'StateId': StateId }, true);
        });
    }
    $scope.startedLicence = function () {
        $scope.selectedStates = {};
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 8; 
        var getData = myService.methode('POST', ("../Retail/SearchLicenseDocumentMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "LicenseId", "HeaderValue": "LicenseId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "LicenseName", "HeaderValue": "LicenseName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Act", "HeaderValue": "Act", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Application Link", "HeaderValue": "ApplicationLink", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    {
                        "HeaderText": "lsd", "HeaderValue": "LSD", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Detail", "HeaderValue": "Detail", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "StateId", "HeaderValue": "StateId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                ];

            $scope.LicenseMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();

                $scope.hfLicenseId = row[0]; 
                $scope.LicenseName = row[1];
               
                $scope.LSID=row[5];
                $scope.StartDate = new Date(row[2]);
                $scope.EndDate = new Date(row[3]); 
                var collectionobj = {}; 
                collectionobj.ActionType = 10; 
                collectionobj.Id = $scope.hfLicenseId;
                collectionobj.LSID = $scope.LSID;
                var getData = myService.methode('POST', ("../Retail/SearchLicenseDocumentMasterList"), JSON.stringify(collectionobj));
                getData.then(function (dt) {
                    //----------------------------------------------- 
                    $scope.StateList = [];
                    $scope.StateList = dt.data.Result.Table;
                    $scope.Act = $scope.StateList[0].Act; 
                    $scope.ApplicationLink = $scope.StateList[0].ApplicationLink;
                    CKEDITOR.instances.txtHeaderTemplate.setData($scope.StateList[0].Detail);
                    $scope.preselectedStates = [];
                    $scope.selectedStates = {};
                    if ($scope.StateList.length > 0) {
                        /*  var StateList1 = $scope.StateList[0].StateId.split(',');*/
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

                })
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
