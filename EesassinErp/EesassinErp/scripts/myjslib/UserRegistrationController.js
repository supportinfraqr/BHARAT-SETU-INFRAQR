app.UserRegistrationController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#ddlVT');
    $scope.UserNames = '';
   
   
     
    $scope.Password = '';
    $scope.ResetControl();
    $scope.AllParty = function (PartyType) {
 
        $scope.PartyType = PartyType;
        $scope.UserNames = '';
        $scope.Password = '';
        $scope.AllPartyList = "";
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 5, "PartyType": $scope.PartyType, "PartyId": LoginId, });
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;
        });
    }

    $scope.AllParty();
    $scope.SetUserNamePassword = function () {

        //if ($scope.UserNames.length <= 3) {
           
        //    $scope.Password = $scope.UserNames + '@123';
        //}
    }


    $scope.SetName=function()
    {
        //$scope.UserNames = '';
        //$scope.Password = '';
        $scope.MemList = [];
        $scope.MemList = $filter('filter')($scope.AllPartyList, { 'PartyId': $scope.PartyId });
        $scope.EmpName = $scope.MemList[0].PartyName;
        $scope.$applyAsync();
    }


    $scope.VerifyPassword = function ()
    {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.MapId = $scope.PartyId;
            collectionobj.UserName = $scope.UserNames;
            collectionobj.Password = $scope.Password;
            collectionobj.Name = $scope.EmpName;
            collectionobj.ContactNo = $scope.ContactNumber;
            collectionobj.EmailId = $scope.EmailId;
            if ($scope.PartyType == 'Vendor') {
                collectionobj.LoginType = 2;
            }
            if ($scope.PartyType == 'VendorAdmin') {
                collectionobj.LoginType = 6;
            }
            if ($scope.PartyType == 'Auditor') {
                collectionobj.LoginType = 3;
            }
            if ($scope.PartyType == 'Client') {
                collectionobj.LoginType = 4
            }
            collectionobj.LoginId = $scope.hfId;

            collectionobj.BranchCode = '001';

            collectionobj.IsActive = 1//$scope.IsActive == 'True' ? 1 : 0;
            if ($scope.Save == "Save") {
                collectionobj.Action = 7;
            }
            else {
                collectionobj.Action = 2;

            }
            collectionobj.CreatedBy = LoginId;
            var getData = myService.methode('POST', "../DashBoard/IUDUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                debugger;
                if (showMsgBox(response.data.Result)) {
                    if ($scope.Save == "Save") {
                        $scope.FireEmail(1, $scope.EmailId, 0);
                    }
                 
                    $scope.ClearControl(1);
                }
            });
        }
    }


    $scope.validateEmail = function()
    {
         
        var semail = $('#txtEmail').val();
        var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        if (filter.test(semail))
        {
            $scope.VerifyPassword();
        }
        else {
            addToolTip(txtemail, "Please fill correct e-mail address!");
            return false;
        }
    }

    $scope.SaveRecord = function ()
    {
        var upper = 0,
         lower = 0,
         number = 0,
         special = 0;
        var mb = $scope.ContactNumber;
        var str = $scope.Password;
        for (var i = 0; i < str.length; i++) {
            if (str[i] >= "A" && str[i] <= "Z") upper++;
            else if (str[i] >= "a" && str[i] <= "z") lower++;
            else if (str[i] >= "0" && str[i] <= "9") number++;
            else special++;
        }
        if (upper >= 1 && lower >= 1 && special >= 1 && number >= 1 && str.length > 8)
        {
            if (isValidate()) {
                if (mb.length == 10) {
                    $scope.validateEmail()
                }
                else {
                    showMsgBox('999', 'Alert', 'Contact Number Should be 10 digit', 'warning', 'btn-warning')
                }
            }
        }
        else {
            var Msg = "Your Password should be greated than 8 , 1 Upper case , 1 Lower case , 1 Special characters ,1 Number  currently Upper case letter : " + upper + ", Lower case : " + lower + ", Number : " + number + ", Special characters : " + special
            showMsgBox('999', 'Alert', Msg, 'warning', 'btn-warning')
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
      
        $scope.UserNames = "";
        $scope.Password = "";
        $scope.EmpName = "";
        $scope.FatherName = "";
        $scope.CreatedOn = "";
        $scope.Gender = "";
        $scope.Designation = "";
        $scope.Address = "";
        $scope.ContactNumber = "";
        $scope.EmailId = "";
        $scope.PartyId = "";
        
        $scope.SetFocus('#ddlVT');
        $scope.hfId = "";
        $scope.EmployeeMasterList = [];
        if (flag == 0) {
            showMsgBox('4');
        };
        $scope.disableAdd = false;
        $scope.disableDelete = true;
        $scope.disablePrint = true;
    }
    $scope.EmployeeMasterList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        
        var collectionobj = {};
        collectionobj.Action = 4; 
        collectionobj.BranchCode = BranchCode;
        collectionobj.LoginId = LoginId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
 
            var tblheader =
                    [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Login Id", "HeaderValue": "LoginId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
                    { "HeaderText": "Party Name",   "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Name",   "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }, 
             /*       { "HeaderText": "Password", "HeaderValue": "Password", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },*/
                    { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                       { "HeaderText": "EmailId", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Created On", "HeaderValue": "LoginCreatedOn", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }
                  
                     

            ];

            $scope.EmployeeMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function () {

                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                var loginId = row[1];
                $scope.hfId = row[1];
                $scope.$applyAsync(function () {

                    $scope.UserList = $filter('filter')(
                        $scope.EmployeeMasterList,
                        { LoginId: loginId }
                    );

                    if (!$scope.UserList.length) return;

                    var user = $scope.UserList[0];

                    // -------- DIRECT SET (NO TIMEOUT NEEDED) --------
                    $scope.PartyType = user.PartyType;
                   
                    $scope.PartyId = user.PartyIds;
              
                    $scope.EmpName = user.Name;
                    $scope.UserNames = user.UserName;
                    $scope.Password = user.Password;
                    $scope.ContactNumber = user.ContactNo;
                    $scope.EmailId = user.EmailId;
                    $scope.Save = "Edit";
                    $scope.disableAdd = false;
                    $scope.disableDelete = false;

                    // Party dropdown load
                   

                    // UI
                    $('.br-pageheader').fadeIn();
                    $('#collapseinputbox').fadeIn();
                    $('#CollapseSearchTableList').fadeOut();

                    $scope.hideLoader();
                });

            });

            //$('#example tbody').on('dblclick', 'tr', function () {
            //    $scope.showLoader();

            //    var row = $('#example').DataTable().row(this).data();
            //    $scope.hfId = row[1];
            //    $scope.UserList = [];
            //    $scope.UserList = $filter('filter')($scope.EmployeeMasterList, { 'LoginId': $scope.hfId }); 
            //    $scope.$applyAsync();
              

               
            //    $scope.PartyType = $scope.UserList[0].PartyType;
            //    setTimeout(function () {
            //        $scope.AllParty();
            //        $scope.PartyId = $scope.UserList[0].PartyIds;
            //        //$scope.SetName();
            //    }, 100);
                 
            //    setTimeout(function () {
            //        $scope.EmpName = $scope.UserList[0].Name;
            //        $scope.UserNames = $scope.UserList[0].UserName;

            //        $scope.Password = $scope.UserList[0].Password;

            //        $scope.ContactNumber = $scope.UserList[0].ContactNo;
            //        $scope.EmailId = $scope.UserList[0].EmailId;
            //    }, 200);
                
            //    $scope.Save = "Edit";
            //    $scope.disableAdd = false;
            //    $scope.disableDelete = false; 
            //    $scope.$apply();
            //    //collapse box
            //    $('.br-pageheader').fadeIn();
            //    $('#collapseinputbox').fadeIn();
            //    $('#CollapseSearchTableList').fadeOut();
                 
            //    $scope.hideLoader();


            //});
        });
    };

    $scope.DeleteRecord = function () {
        showMsgBox('999', 'NOt Allowed', 'Delete Process not Allow, Manage From Account Permission', 'warning', 'btn-warning')
       
       // deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
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
                    { "HeaderText": "Login Id", "HeaderValue": "LoginId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Type", "HeaderValue": "PartyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Party Name", "HeaderValue": "PartyName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Name", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Password", "HeaderValue": "Password", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                      { "HeaderText": "EmailId", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Contact No", "HeaderValue": "ContactNo", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" }


       ];
        $scope.PrintMaster(tblheader, $scope.EmployeeMasterList, window.document.title);
    };
}