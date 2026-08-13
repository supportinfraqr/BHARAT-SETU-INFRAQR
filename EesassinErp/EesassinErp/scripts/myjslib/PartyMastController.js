app.PartMasterController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#ddlVT');
    $scope.StoreLimit = 0;
    $scope.UserLimit = 0;
    $scope.Sitelimit = 0;
    $scope.Contractorlimit = 0;
    $scope.PartyDate = new Date();
    $scope.BindAllEmployeeList = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        var getData = myService.methode('POST', ("../RetailSection/GetEmployeeMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AllEmployeeList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };


    $scope.AllParty = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 4 });
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;;
        });
    }

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            debugger;
            $scope.IndustryList = response.data.Result;;
        });
    }


    

    $scope.ChkIsClient = function (id) {
        $scope.PartyType = id;
        $scope.AllParty();
        $scope.$applyAsync();
    }

    $scope.SaveRecord = function () {
        if (isValidate()) {
            if ($scope.MobileNo.length == 10) {
                $scope.AfterverifyRecord()
            }
            else {
                showMsgBox('999', 'Alert', 'Contact Number Should be 10 digit', 'warning', 'btn-warning')
            }
        }
    }

    $scope.AfterverifyRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
           
            collectionobj.EmployeeId = $scope.EmployeeId;
            collectionobj.VendorId = $scope.VendorId;
            collectionobj.PartyId = $scope.hfId;
            collectionobj.PartyName = $scope.PartyName;
            collectionobj.Address = $scope.Address;
            collectionobj.EmailId = $scope.EmailId;
            collectionobj.ContactNo = $scope.MobileNo;
            collectionobj.BankDetails = $scope.BankDetails;
            collectionobj.RegistrationType = $scope.RegistrationType;
            collectionobj.Panitno = $scope.Panitno;
            collectionobj.Gstinuin = $scope.Gstinuin;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Pincode = $scope.Pincode;
            collectionobj.Descritpion = $scope.Descritpion;
            collectionobj.ContactMobile = $scope.ContactMobile;
            collectionobj.ContactPerson = $scope.ContactPerson
            collectionobj.StoreLimit = $scope.StoreLimit;
            collectionobj.UserLimit = $scope.UserLimit; 
            collectionobj.ValidTo = $('#txtValidTo').val();
            collectionobj.PartyDate = $('#txtPartyDate').val();

            
            collectionobj.Industry = $scope.Industry;
			   collectionobj.Contractorlimit = $scope.Contractorlimit; ///Added by AAdarsh 
            collectionobj.Sitelimit = $scope.Sitelimit;  ///Added by AAdarsh
            collectionobj.MonthExpired = $scope.MonthExpired; ///Added by shipra 
            collectionobj.IsActive = $scope.IsActive;
            collectionobj.State = $scope.State;
            collectionobj.City = $scope.City;
            if ($scope.Save == "Save") {
                collectionobj.PartyType = $scope.PartyType;
                collectionobj.ActionType = 1;
            }
            else {
                collectionobj.ActionType = 2;
            }
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelPartyMaster"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result))
                {
                    if ($scope.PartyType === 'Client' && $scope.Save === 'Save') {
                        $scope.FireEmail(25, $scope.EmailId, 0);
                    } 
                    $scope.ClearControl(1);
                }
            });
        }
    }
    $scope.DeleteRecord = function () {
        //deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
        showMsgBox('999', 'Warning', 'Delete Option Not Availabe , Please Inactive Party', 'warning', 'btn-warning')
    };

    $scope.deleteRecord = function () {
        debugger;
        //var collectionobj = {};
        //collectionobj.ActionType = 3;
        //collectionobj.PartyId = $scope.hfId;  
        //var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelPartyMaster"), JSON.stringify(collectionobj));
        //getData.then(function (response) {
        //    if (showMsgBox(response.data.Result)) {
        //        $scope.ClearControl(1);
        //    }
        //});
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
        $scope.Save = "Save";
        $scope.disableAdd = false;
        $scope.disableEdit = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.disableClear = false;
        $scope.IsAdd = true;
        $scope.IsEdit = true;
        $scope.IsDelete = true;
        $scope.IsPrint = true;
        $scope.PartyName = "";
        $scope.EmployeeId = "";
        $scope.Address = "";
        $scope.EmailId = "";
        $scope.MobileNo = "";
        $scope.IsActive = "";
      $scope.PartyDate = new Date();
        $scope.BankDetails = "";
        $scope.Panitno = "";
        $scope.Gstinuin = "";
        $scope.Pincode = "";
        $scope.VendorId = "";
        $scope.Descritpion = "";
        $scope.ContactMobile = "";
        $scope.ContactPerson = "";
		    $scope.Contractorlimit = "";
        $scope.Sitelimit = "";
        $scope.SetFocus('#ddlVT');
        $scope.hfId = "";
        $scope.StoreLimit = 0;
        $scope.UserLimit = 0;
        $scope.Sitelimit = 0;
        $scope.Contractorlimit = 0;
        $scope.PartyMasterList = [];
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    $scope.PartyMasterList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "PartyId", "HeaderValue": "SNO", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "BankDetails", "HeaderValue": "BankDetails", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PANIT NO", "HeaderValue": "PANITNO", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "GSTINUIN", "HeaderValue": "GSTINUIN", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Pincode", "HeaderValue": "Pincode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "VendorId", "HeaderValue": "VendorId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Contact Person Name", "HeaderValue": "ContactPerson", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Contact Mobile No ", "HeaderValue": "ContactMobile", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Descritpion", "HeaderValue": "Descritpion", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "IsActive", "HeaderValue": "IsActived", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Employee Code", "HeaderValue": "EmployeeCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Employee Name", "HeaderValue": "EmployeeName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EmpId", "HeaderValue": "EmpId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "StoreLimit", "HeaderValue": "StoreLimit", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "UserLimit", "HeaderValue": "UserLimit", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ValidDate", "HeaderValue": "Valid", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Industry", "HeaderValue": "Industry", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Industry", "HeaderValue": "IndustryName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "MonthExpired", "HeaderValue": "MonthExpired", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },//Added by shipra
 
                    { "HeaderText": "Party Creation Date", "HeaderValue": "PartyDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },//Added by shipra
                      { "HeaderText": "Contractor Limit", "HeaderValue": "ContractorLimit", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },//Added by Aadarsh
                    { "HeaderText": "Site Limit", "HeaderValue": "Sitelimit", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },//Added by Aadarsh

                    { "HeaderText": "State", "HeaderValue": "State", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "City", "HeaderValue": "City", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    {
                        "HeaderText": "Party Code", "HeaderValue": "PartyCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" } 
            
                ];

            $scope.PartyMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();  //$scope.PartyMasterList[0].PartyId;
                $scope.PartyMasterList = $filter('filter')($scope.PartyMasterList, { 'PartyId': $scope.hfId });
                $scope.IsActive = $scope.PartyMasterList[0].IsActived == 'Yes' ? 'True' : 'False';
                $scope.PartyType = row[1];
                $scope.PartyName = row[2];
                $scope.Address = row[3];
                $scope.EmailId = row[4]
                $scope.MobileNo = row[5];
                $scope.BankDetails = row[6];
                $scope.EmployeeId = row[17];
                //$scope.RegistrationType = row[6];
                $scope.Panitno = row[7];
                $scope.Gstinuin = row[8];
                $scope.Pincode = row[9];
                if ($scope.PartyType == 'Client') {
                    $scope.VendorId = row[10];
                    $scope.$applyAsync();
                }
                else {
                    $scope.$applyAsync();
                }
                $scope.ContactPerson = row[11];
                $scope.ContactMobile = row[12];
                $scope.Descritpion = row[13];
                $scope.StoreLimit = row[18];
                $scope.UserLimit = row[19];
                $scope.ValidTo = new Date(row[20]);
                $scope.PartyDate = new Date(row[24]);
                
                $scope.Industry = row[21];
                $scope.MonthExpired = row[23]; //Added by shipra
				     $scope.Contractorlimit = row[25]; //Added by Aadarsh
                $scope.Sitelimit = row[26]; //Added by Aadarsh

                $scope.State = row[27]; //Added by Aadarsh
                $scope.City = row[28]; //Added by Aadarsh
            
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
                { "HeaderText": "Sr.No.", "Value": "SNO", "HeaderValue": "PartyId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Email Id", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "BankDetails", "HeaderValue": "BankDetails", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "PANIT NO", "HeaderValue": "PANITNO", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "GSTINUIN", "HeaderValue": "GSTINUIN", "Width": "100%", "ShowColumn": "NO", "ImageColumn": "No" },
                { "HeaderText": "Pincode", "HeaderValue": "Pincode", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "VendorId", "HeaderValue": "VendorId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Contact Person Name", "HeaderValue": "ContactPerson", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Contact Mobile No ", "HeaderValue": "ContactMobile", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Descritpion", "HeaderValue": "Descritpion", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "IsActive", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "PartyId", "HeaderValue": "PartyId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
           
            ];
        $scope.PrintMaster(tblheader, $scope.PartyMasterList, window.document.title);
    };
}