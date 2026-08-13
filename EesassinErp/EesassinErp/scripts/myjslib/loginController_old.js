var myLoginApp = angular.module('myLoginApp', []);

myLoginApp.service("myLoginService", function ($http) {

    this.methode = function (methodType, virtualUrl, dataList) {

        var response = $http({
            method: methodType,
            url: virtualUrl,
            data: dataList,
            contentType: 'application/json; charset=utf-8',
            datatype: 'json'
        });

        return response;
    };
});
myLoginApp.controller('myLoginController', function ($scope, $element, $filter, $sce, $timeout, myLoginService) {
    $('#txtUserName').val('');
    $('#txtPassWord').val('');
    $scope.Username = '';
    $scope.Password = '';
    $('#txtUserName').focus();

    $scope.flag = false;
    $scope.optionValue = 0;

    $scope.PassWordEnterKey = function (event) {
        if (typeof (event.keyCode) === 'undefined') return;
        var keyCode = event.keyCode;
        if (keyCode == 13) {
            $scope.Login();
        }
    };

    $scope.GetCaptchaImage = function () {
        debugger;
        $scope.refresh = 'fa fa-spinner fa-spin'
        var getData = myLoginService.methode('GET', "../Login/CaptchaImage", '{}');
        getData.then(function (response) {
            $timeout(function () {
                $scope.CaptchaSrc = response.data;
                $scope.refresh = 'fa fa-refresh'
                $
            }, 200);
        });
    }
    $scope.CheckCaptchaSum = function () {
        debugger;
        var getData = myLoginService.methode('POST', "../Login/GetUserId", '{sum:' + JSON.stringify($scope.Captcha) + '}');
        getData.then(function (response) {
            console.log(response.data);
        });
    }

    $scope.LoadFocus = function () {
        $scope.Username = "";
        $scope.Password = "";
        $("#txtUserName").focus();
    }

    $scope.CUVAILD = function () {
        var collectionobj = {};
        collectionobj.Username = $scope.Username;
        collectionobj.Action = "15";
        var getDetails = myLoginService.methode('POST', '../Login/GetModulePermission', '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {
            if (response.data.Result.length > 0)
            {
                if (response.data.Result[0].Module_Name == 'Both') {
                    $scope.IsModuleOpen = true;
                }
                else {
                    $scope.IsModuleOpen = false;
                }
            }
            else {
                $scope.IsModuleOpen = false;
            }
        

        });
    }

    $scope.BindModule = function () {
        var collectionobj = {};
        collectionobj.Action = "16";
        var getDetails = myLoginService.methode('POST', '../Login/GetModulePermission', '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {
            $scope.ModuleList = response.data.Result;

        });
    }
    $scope.RedirectToModule = function () {
        var collectionobj = {};
        //collectionobj.Action = "14";
        collectionobj.Action = "15";
        collectionobj.LoginId = $scope.ModuleId;
        collectionobj.Username = $scope.Username;
        var getDetails = myLoginService.methode('POST', '../Login/GetModulePermission', '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {

            if (response.data.Result.length > 0)
            {
                if (response.data.Result[0].LoginType == '1') {
                    $("#lblmsg").text("You have logged in successfully.");
                    $("#msgbox").attr("class", "box-v-g");
                    $scope.Captcha = "";
                    $scope.GetCaptchaImage();
                    $scope.ManageLog(response.data.Result[0].LoginId, 'Login Supplier Section');
                    window.location.href = '../Dashboard/Dashboard';
                }
                else if (response.data.Result[0].Module_Name == 'Both') {
                    $("#lblmsg").text("You have logged in successfully.");
                    $("#msgbox").attr("class", "box-v-g");
                    $scope.Captcha = "";
                    $scope.GetCaptchaImage();
                    if ($("#ddlModule option:selected").text() == 'Supplier') {
                        $scope.ManageLog(response.data.Result[0].LoginId, 'Login Supplier Section');
                        window.location.href = '../Dashboard/Dashboard';
                    }
                    else if ($("#ddlModule option:selected").text() == 'Retail') {
                        $scope.ManageLog(response.data.Result[0].LoginId,'Login Retail Section');
                        window.location.href = '../RetailSection/MainDashboard';
                    }
                    else {
                        $("#lblmsg").text("Please Select Module List!");
                        $("#msgbox").attr("class", "box-v-r");
                        $('#btnLogin').html('Login');
                        $('#btnLogin').prop('disabled', false);
                        $scope.Captcha = "";
                        $("#msgbox").fadeIn().delay(3000).fadeOut();
                        $scope.GetCaptchaImage();
                    }

                }
                else if (response.data.Result[0].Module_Name == 'Retail') {
                    $("#lblmsg").text("You have logged in successfully.");
                    $("#msgbox").attr("class", "box-v-g");
                    $scope.Captcha = "";
                    $scope.GetCaptchaImage();
                    $scope.ManageLog(response.data.Result[0].LoginId, 'Login Retail Section')
                    window.location.href = '../RetailSection/MainDashboard';
                }
                else if (response.data.Result[0].Module_Name == 'Supplier') {
                    $("#lblmsg").text("You have logged in successfully.");
                    $("#msgbox").attr("class", "box-v-g");
                    $scope.Captcha = "";
                    $scope.GetCaptchaImage();
                    $scope.ManageLog(response.data.Result[0].LoginId, 'Login Supplier Section')
                    window.location.href = '../Dashboard/Dashboard';
                }
                else {
                    $("#lblmsg").text("You have logged in successfully.");
                    $("#msgbox").attr("class", "box-v-g");
                    $('#btnLogin').html('Login');
                    $('#btnLogin').prop('disabled', false);
                    $scope.Captcha = "";
                    $scope.GetCaptchaImage();
                    $scope.ManageLog(response.data.Result[0].LoginId, 'Login Supplier Section')
                    window.location.href = '../Dashboard/Dashboard';
                }
            }
            else {
                $scope.ManageLog(response.data.Result[0].LoginId, 'Login Supplier Section')
                window.location.href = '../Dashboard/Dashboard';
            }
           
        });
    }
    $scope.ModuleId = '3'; 
    $scope.SessionClose = function () {
        if (isValidate()) {
            $('#btnLogin').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait');
            $('#btnLogin').prop('disabled', true);
            debugger;
            var collectionobj = {};
            collectionobj.Username = $scope.Username;
            collectionobj.Password = $scope.Password;
            collectionobj.Captcha = $scope.Captcha;
            collectionobj.Action = "18";
            var getDetails = myLoginService.methode('POST', '../Login/GetUserId', '{obj:' + JSON.stringify(collectionobj) + '}');

            getDetails.then(function (response) {
                debugger;
                if (response.data.length > 0) {
                    if (response.data == '89') {
                        $("#lblmsg").text("Invalid Captcha!");
                        $("#msgbox").attr("class", "box-v-r");
                        $('#btnLogin').html('Login');
                        $('#btnLogin').prop('disabled', false);
                        $scope.Captcha = "";
                        $("#msgbox").fadeIn().delay(3000).fadeOut();
                        $scope.GetCaptchaImage();
                    } else {
                        sessionStorage.setItem('LoginId', response.data[0].LoginId);
                        sessionStorage.setItem('LastLogin', response.data[0].LastLogin);
                        sessionStorage.setItem('CurrLogin', response.data[0].CurrentLogin);
                        sessionStorage.setItem('loginType', response.data[0].LoginType);
                        sessionStorage.setItem('BranchCode', response.data[0].BranchCode);
                        sessionStorage.setItem('Name', response.data[0].Name);
                        sessionStorage.setItem('BranchName', response.data[0].BranchName);
                        sessionStorage.setItem('ContactNo', response.data[0].ContactNo);
                        sessionStorage.setItem('Desig', response.data[0].Desig);
                        sessionStorage.setItem('CreatedOn', response.data[0].CreatedOn);
                        sessionStorage.setItem('BranchAddress', response.data[0].BranchAddress);
                        sessionStorage.setItem('MapId', response.data[0].MapId);
                        sessionStorage.setItem('MapUser', response.data[0].MapUser);
                        sessionStorage.setItem('Photo', response.data[0].Photo);
                        sessionStorage.setItem('UserName', response.data[0].UserName);
                        sessionStorage.setItem('SessionId', response.data[0].SessionId);
                        sessionStorage.setItem('EmailId', response.data[0].EmailId);
                        sessionStorage.setItem('Loadonce', 0);

                        // Call SetRolePermission and wait for it to complete
                        $scope.SetRolePermission(response.data[0].LoginType, response.data[0].LoginId).then(function () {
                            // Now execute the rest of the code after role permission is set
                            if (response.data[0].LoginId == "-1" || response.data[0].LoginId == null || response.data[0].LoginId == "") {
                                $("#lblmsg").text("Invalid Credentials!");
                                $("#msgbox").attr("class", "box-v-r");
                                $('#btnLogin').html('Login');
                                $('#btnLogin').prop('disabled', false);
                                $scope.Captcha = "";
                                $scope.GetCaptchaImage();
                            } else if (response.data[0].LoginId == "-11") {
                                $("#lblmsg").text("Session Active, Please Close All Session !");
                                $("#msgbox").attr("class", "box-v-r");
                                $('#btnLogin').html('Login');
                                $('#btnLogin').prop('disabled', false);
                                $scope.Captcha = "";
                                $scope.GetCaptchaImage();
                            } else {
                                if ([1, 2, 3, 4].includes(response.data[0].LoginType)) {
                                    if ($scope.ModuleId == '3' || $scope.ModuleId == '4') {
                                        $scope.RedirectToModule();
                                    } else {
                                        $("#lblmsg").text("You have logged in successfully.");
                                        $("#msgbox").attr("class", "box-v-g");
                                        $scope.Captcha = "";
                                        $scope.GetCaptchaImage();
                                        $scope.ManageLog(response.data[0].LoginId, 'Login');
                                        window.location.href = '../Dashboard/Dashboard';
                                    }
                                }
                            }
                            $("#msgbox").fadeIn().delay(3000).fadeOut();
                        });
                    }
                }
            });
        }
    };

    $scope.ManageLog = function (ClientId, Activity) {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.ClientId = ClientId;
        collectionobj.Activity = Activity;
        var getDetails = myLoginService.methode('POST', "../RetailSection/MaintainLog", '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {

        });
    }
    $scope.Login = function () 
        {
        if (isValidate()) {
            $('#btnLogin').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait')
            $('#btnLogin').prop('disabled', true);
            debugger;
            var collectionobj = {};
            collectionobj.Username = $scope.Username;
            collectionobj.Password = $scope.Password;
            collectionobj.Captcha = $scope.Captcha
            collectionobj.Action = "1";
            var getDetails = myLoginService.methode('POST', '../Login/GetUserId', '{obj:' + JSON.stringify(collectionobj) + '}');
            getDetails.then(function (response) {
                debugger;
                if (response.data.length > 0) {
                    if (response.data == '89') {
                        $("#lblmsg").text("Invalid Captcha!");
                        $("#msgbox").attr("class", "box-v-r");
                        $('#btnLogin').html('Login');
                        $('#btnLogin').prop('disabled', false);
                        $scope.Captcha = "";
                        $("#msgbox").fadeIn().delay(3000).fadeOut();
                        $scope.GetCaptchaImage();
                    }
                    else {
                        sessionStorage.setItem('LoginId', response.data[0].LoginId);
                        sessionStorage.setItem('LastLogin', response.data[0].LastLogin);
                        sessionStorage.setItem('CurrLogin', response.data[0].CurrentLogin);
                        sessionStorage.setItem('loginType', response.data[0].LoginType);
                        sessionStorage.setItem('BranchCode', response.data[0].BranchCode);
                        sessionStorage.setItem('Name', response.data[0].Name);
                        sessionStorage.setItem('BranchName', response.data[0].BranchName);
                        sessionStorage.setItem('ContactNo', response.data[0].ContactNo);
                        sessionStorage.setItem('Desig', response.data[0].Desig);
                        sessionStorage.setItem('CreatedOn', response.data[0].CreatedOn);
                        sessionStorage.setItem('BranchAddress', response.data[0].BranchAddress);
                        sessionStorage.setItem('MapId', response.data[0].MapId);
                        sessionStorage.setItem('MapUser', response.data[0].MapUser);
                        sessionStorage.setItem('Photo', response.data[0].Photo);
                        sessionStorage.setItem('UserName', response.data[0].UserName);
                        sessionStorage.setItem('SessionId', response.data[0].SessionId);
                        sessionStorage.setItem('EmailId', response.data[0].EmailId);
                        sessionStorage.setItem('Loadonce', 0);
                    
                        $scope.SetRolePermission(response.data[0].LoginType, response.data[0].LoginId).then(function () { 
                            if (response.data[0].LoginId == "-1" || response.data[0].LoginId == null || response.data[0].LoginId == "") {
                                $("#lblmsg").text("Invalid Credentials!");
                                $("#msgbox").attr("class", "box-v-r");
                                $('#btnLogin').html('Login');
                                $('#btnLogin').prop('disabled', false);
                                $scope.Captcha = "";
                                $scope.GetCaptchaImage();
                            } else if (response.data[0].LoginId == "-11") {
                                $("#lblmsg").text("Session Active, Please Close All Session !");
                                $("#msgbox").attr("class", "box-v-r");
                                $('#btnLogin').html('Login');
                                $('#btnLogin').prop('disabled', false);
                                $scope.Captcha = "";
                                $scope.GetCaptchaImage();
                            } else {
                                if ([1, 2, 3, 4].includes(response.data[0].LoginType)) {
                                    if ($scope.ModuleId == '3' || $scope.ModuleId == '4') {
                                        $scope.RedirectToModule();
                                    } else {
                                        $("#lblmsg").text("You have logged in successfully.");
                                        $("#msgbox").attr("class", "box-v-g");
                                        $scope.Captcha = "";
                                        $scope.GetCaptchaImage();
                                        $scope.ManageLog(response.data[0].LoginId, 'Login');
                                        window.location.href = '../Dashboard/Dashboard';
                                    }
                                }
                            }
                            $("#msgbox").fadeIn().delay(3000).fadeOut();
                        });
                    }
                }
                $("#msgbox").fadeIn().delay(3000).fadeOut();
            });
        }
    };
  
    $scope.SetRolePermission = function (loginType,LoginId) {
        return new Promise((resolve) => {
        var collectionobj = {};
        debugger;
        collectionobj.Id = LoginId;
        collectionobj.Action = 1;
        var getDetails = myLoginService.methode('POST', ("../RetailSection/RetailRolePermisssion"), JSON.stringify(collectionobj));
        getDetails.then(function (response) {
            $scope.RetaiRolePermission = response.data.Result; 
            if (loginType == 1 && LoginId == 1)
            {
                //----------Store Compliance Status---------
                sessionStorage.setItem('SCS_ViewFlag', 'true');
                sessionStorage.setItem('SCS_AllowEditFlag', 'true');
                sessionStorage.setItem('SCS_EditFlag', 'true');
                sessionStorage.setItem('SCS_DeleteFlag', 'true');
                sessionStorage.setItem('SCS_UploadFlag', 'true');
                sessionStorage.setItem('SCS_DownloadFlag', 'true'); 
                sessionStorage.setItem('SCS_VerifyFlag', 'true');
                sessionStorage.setItem('LR_ViewFlag', 'true');
                sessionStorage.setItem('SM_ViewFlag', 'true');
                sessionStorage.setItem('CD_ViewFlag', 'true');
                sessionStorage.setItem('LM_ViewFlag', 'true');
                sessionStorage.setItem('EM_ViewFlag', 'true');
                sessionStorage.setItem('SM_NewStoreFlag', 'true');
                sessionStorage.setItem('SM_EditFlag', 'true');
                sessionStorage.setItem('SMF_ViewFlag', 'true');
                sessionStorage.setItem('SMF_EditFlag', 'true');
                sessionStorage.setItem('NI_ViewFlag', 'true');
                sessionStorage.setItem('NI_AllowEditFlag', 'true');
                sessionStorage.setItem('LD_ViewFlag', 'true');
                sessionStorage.setItem('NL_ViewFlag', 'true');
                sessionStorage.setItem('LSD_Flag', 'true');

                sessionStorage.setItem('COBD_Flag', 'true');
                sessionStorage.setItem('COMD_Flag', 'true');
                sessionStorage.setItem('STAT_Flag', 'true');
            }
            else
            {
                if (response.data.Result.length > 0)
                {
                    if ($scope.RetaiRolePermission[0].SectionId == 1)
                    { 
                        sessionStorage.setItem('SCS_ViewFlag', $scope.RetaiRolePermission[0].ViewFlag);
                        sessionStorage.setItem('SCS_AllowEditFlag', $scope.RetaiRolePermission[0].EditFlag);
                        sessionStorage.setItem('SCS_EditFlag', $scope.RetaiRolePermission[0].DeleteFlag);
                        sessionStorage.setItem('SCS_DeleteFlag', $scope.RetaiRolePermission[0].UploadFlag);
                        sessionStorage.setItem('SCS_UploadFlag', $scope.RetaiRolePermission[0].DownloadFlag);
                        sessionStorage.setItem('SCS_DownloadFlag', $scope.RetaiRolePermission[0].VerifyFlag); 
                    }
                    if ($scope.RetaiRolePermission[1].SectionId == 2) { 
                        sessionStorage.setItem('LR_ViewFlag', $scope.RetaiRolePermission[1].ViewFlag); 
                    }
                    if ($scope.RetaiRolePermission[2].SectionId == 3) {  
                    sessionStorage.setItem('SM_ViewFlag', $scope.RetaiRolePermission[2].ViewFlag); 
                    sessionStorage.setItem('SM_EditFlag', $scope.RetaiRolePermission[2].EditFlag); 
                    sessionStorage.setItem('SM_DeleteFlag', $scope.RetaiRolePermission[2].SM_DeleteFlag); 
                    sessionStorage.setItem('SM_UploadFlag', $scope.RetaiRolePermission[2].UploadFlag); 
                    sessionStorage.setItem('SM_DownloadFlag', $scope.RetaiRolePermission[2].DownloadFlag); 
                    sessionStorage.setItem('SM_VerifyFlag', $scope.RetaiRolePermission[2].VerifyFlag);
                    sessionStorage.setItem('SM_NewStoreFlag', $scope.RetaiRolePermission[2].NewStoreFlag); 
                    }
                    if ($scope.RetaiRolePermission[3].SectionId == 4) {
                    sessionStorage.setItem('CD_ViewFlag', $scope.RetaiRolePermission[3].ViewFlag);
                    sessionStorage.setItem('CD_EditFlag', $scope.RetaiRolePermission[3].EditFlag);
                    sessionStorage.setItem('CD_DeleteFlag', $scope.RetaiRolePermission[3].DeleteFlag);
                    sessionStorage.setItem('CD_UploadFlag', $scope.RetaiRolePermission[3].UploadFlag);
                    sessionStorage.setItem('CD_DownloadFlag', $scope.RetaiRolePermission[3].DownloadFlag);
                    sessionStorage.setItem('CD_VerifyFlag', $scope.RetaiRolePermission[3].VerifyFlag); 
                    }
                    if ($scope.RetaiRolePermission[4].SectionId == 5) {
                    sessionStorage.setItem('LM_ViewFlag', $scope.RetaiRolePermission[4].ViewFlag);
                    sessionStorage.setItem('LM_EditFlag', $scope.RetaiRolePermission[4].EditFlag);
                    sessionStorage.setItem('LM_DeleteFlag', $scope.RetaiRolePermission[4].DeleteFlag);
                    sessionStorage.setItem('LM_UploadFlag', $scope.RetaiRolePermission[4].UploadFlag);
                    sessionStorage.setItem('LM_DownloadFlag', $scope.RetaiRolePermission[4].DownloadFlag);
                    sessionStorage.setItem('LM_VerifyFlag', $scope.RetaiRolePermission[4].VerifyFlag); 
                    }
                    if ($scope.RetaiRolePermission[5].SectionId == 6) {
                    sessionStorage.setItem('EM_ViewFlag', $scope.RetaiRolePermission[5].ViewFlag);
                    sessionStorage.setItem('EM_EditFlag', $scope.RetaiRolePermission[5].EditFlag);
                    sessionStorage.setItem('EM_DeleteFlag', $scope.RetaiRolePermission[5].DeleteFlag);
                    sessionStorage.setItem('EM_UploadFlag', $scope.RetaiRolePermission[5].UploadFlag);
                    sessionStorage.setItem('EM_DownloadFlag', $scope.RetaiRolePermission[5].DownloadFlag);
                    sessionStorage.setItem('EM_VerifyFlag', $scope.RetaiRolePermission[5].VerifyFlag); 
                    }
                    if ($scope.RetaiRolePermission[6].SectionId == 7) {
                    sessionStorage.setItem('NI_ViewFlag', $scope.RetaiRolePermission[6].ViewFlag); 
                    }
                    if ($scope.RetaiRolePermission[7].SectionId == 8) {
                    sessionStorage.setItem('SMF_ViewFlag', $scope.RetaiRolePermission[7].ViewFlag);
                    sessionStorage.setItem('SMF_EditFlag', $scope.RetaiRolePermission[7].EditFlag); 
                    }
                    if ($scope.RetaiRolePermission[8].SectionId == 9) { 
                    sessionStorage.setItem('LD_ViewFlag', $scope.RetaiRolePermission[8].ViewFlag); 
                    } 
                    if ($scope.RetaiRolePermission[9].SectionId == 10) {
                    sessionStorage.setItem('NL_ViewFlag', $scope.RetaiRolePermission[9].ViewFlag); 
                    }
                    if ($scope.RetaiRolePermission[10].SectionId == 11) {
                        sessionStorage.setItem('SMD_ViewFlag', $scope.RetaiRolePermission[10].ViewFlag);
                    }
                    if ($scope.RetaiRolePermission[11].SectionId == 12) {
                        sessionStorage.setItem('COBD_Flag', $scope.RetaiRolePermission[11].ViewFlag);
                    }
                    if ($scope.RetaiRolePermission[12].SectionId == 13) {
                        sessionStorage.setItem('COMD_Flag', $scope.RetaiRolePermission[12].ViewFlag);
                    }

                    if ($scope.RetaiRolePermission[13].SectionId == 14) { 
                        sessionStorage.setItem('STAT_Flag', $scope.RetaiRolePermission[13].ViewFlag);
                    } 
                    sessionStorage.setItem('LSD_Flag', 0);
                   
                } 
            }

          
        }); 
            // Existing logic
            console.log("Setting role permission for", loginType, LoginId);
            resolve(); // Ensure the function resolves when complete
        });
    };
    //$scope.ControlSelect = function ()
    //{
    //    if ($scope.ModuleId == 1) {
    //        $("#lblmsg").text("You have logged in successfully.");
    //        $("#msgbox").attr("class", "box-v-g");
    //        $scope.Captcha = "";
    //        $scope.GetCaptchaImage();
    //        window.location.href = '../Dashboard/Dashboard';
    //    } else {
    //        $("#lblmsg").text("You have logged in successfully.");
    //        $("#msgbox").attr("class", "box-v-g");
    //        $scope.Captcha = "";
    //        $scope.GetCaptchaImage();
    //        window.location.href = '../Dashboard/Dashboard';
    //    }
    //}

    $scope.FindWindow = function () {
        debugger;
        var inputs = $(".input-effect input");
        $.each(inputs, function (i, input) {
            if ($(this).hasClass("has-content") && $(this).val().length <= 0) {
                $(this).removeClass("has-content");
            } else {
                $(this).addClass("has-content");
            }
        })
    };

    $scope.hascontent = function (id) {
        if ($(id).hasClass("has-content") && $(id).val().length <= 0) {
            $(id).removeClass("has-content");
        } else {
            $(id).addClass("has-content");
        }
    }

    $scope.RecoverPassword = function () {
        if (isValidate()) {
            $('#btnSubmit').html('<i class="fa fa-spinner fa-spin"></i>&nbsp; Please wait')
            $('#btnSubmit').prop('disabled', true);

            var getDetails = myLoginService.methode('POST', '../Login/RecoverPassword', '{username:' + JSON.stringify($scope.Username) + ',mobileno:' + JSON.stringify($scope.MobileNo) + ',schoolcode:' + JSON.stringify($scope.SchoolCode) + '}');

            getDetails.then(function (response) {
                var data = response.data.replace(/"/g, "");
                var splitdata = data.split('$');
                if (splitdata[0] == '1') {
                    if (splitdata[1] == 'Email') {
                        $("#lblmsg").text("Password has been sent to your registered email.");
                    }
                    else if (splitdata[1] == 'Mobile') {
                        $("#lblmsg").text("Password has been sent to your registered mobile no.");
                    }

                    $("#msgbox").attr("class", "box-v-g");
                    $('#btnSubmit').html('Submit');
                    $('#btnSubmit').prop('disabled', false);

                    $scope.Username = "";
                    $scope.MobileNo = "";
                }
                else {
                    $("#lblmsg").html(splitdata[0]);
                    $("#msgbox").attr("class", "box-v-r");
                    $('#btnSubmit').html('Submit');
                    $('#btnSubmit').prop('disabled', false);
                }
            });

            $("#msgbox").fadeIn().delay(6000).fadeOut(function () { $("#lblmsg").html(''); });
        }
    };
});
 