var myLoginApp = angular.module('myLoginApp', []);

myLoginApp.service("myLoginService", function ($http) {
    this.methode = function (methodType, virtualUrl, dataList) {
        return $http({
            method: methodType,
            url: virtualUrl,
            data: dataList, // ✅ object directly
            headers: {
                'Content-Type': 'application/json'
            }
        });
    };
});

myLoginApp.controller('myLoginController', function ($scope, $timeout, myLoginService) {
     
     $scope.Reglogin = 'Log into your BharatShramSetu account';
    $scope.ldynamicback = 'Welcome Back!';
    sessionStorage.clear();
    $scope.MPINMobileNo = "";

    $scope.IsMobileDisabled = false;
    $scope.Username = $scope.Password = $scope.Captcha = $scope.MobileNo = $scope.NewPassword = '';
    $scope.Step1 = true; $scope.Step2 = $scope.Step3 = false;
    $scope.IshideOtp = false; $scope.hidemobile = true; $scope.IshideSubmit = false;
    $scope.ModuleId = '3';
    $scope.refresh = 'fa fa-refresh'; 
 
    function setBtn($sel, html, disabled) { $($sel).html(html).prop('disabled', !!disabled); }
    function showMsg(text, color, duration) {
        $("#lblmsg").text(text).css('color', color);
        $("#msgbox").attr("class", color === "green" ? "box-v-g" : "box-v-r").fadeIn().delay(duration || 3000).fadeOut();
    }
    $scope.EnableMobile = function () {

        $scope.IsMobileDisabled = false;
        $scope.MPINMobileNo = "";
        localStorage.removeItem("LastUserName");

        setTimeout(function () {
            $("#Mobile").focus();
        }, 100);

    };

    function storeSession(d) { 
        var sessionData = {
            LoginId: d.LoginId,
            MapId: d.MapId,
            MapUser: d.MapUser,
            BranchCode: d.BranchCode,
            LoginType: d.LoginType,
            LastLogin: d.LastLogin,
            Desig: d.Desig,
            Name: d.Name,
            BranchName: d.BranchName,
            ContactNo: d.ContactNo,
            CreatedOn: d.CreatedOn,
            Photo: d.Photo,
            UserName: d.UserName,
            BranchAddress: d.BranchAddress,
            SessionId: d.SessionId,
            EmailId: d.EmailId,
            PartyEMail: d.PartyEMail,
            Loadonce: 0
        };
         
        sessionStorage.setItem("userSession", JSON.stringify(sessionData));
        localStorage.setItem("LastUserName", d.UserName);
    }
     
    $timeout(function () { $('#username-input').val('').focus(); }, 50);
     
    var _bridgeAuthPending = null;
    function postObj(url, obj) {
        if (url.indexOf('NGetUserId') !== -1) {
            _bridgeAuthPending = $.post('../Api/QrBridge/auth/login/', { username: obj.Username || obj.username || '', password: obj.Password || obj.password || '' });
        }
        return myLoginService.methode('POST', url, '{obj:' + JSON.stringify(obj) + '}');
    }
    function _goAfterBridge(path) {
        // Wait for the bridge JWT to be cached (usually ~100ms now) so QR
        // pages don't get 401 'Session expired'. Hard cap at 2.5s so login
        // can never freeze — then redirect regardless.
        if (_bridgeAuthPending) {
            var p = _bridgeAuthPending; _bridgeAuthPending = null;
            var done = false;
            var force = setTimeout(function () {
                if (!done) { done = true; window.location.href = path; }
            }, 2500);
            p.always(function () {
                if (done) return;
                done = true;
                clearTimeout(force);
                window.location.href = path;
            });
        } else {
            window.location.href = path;
        }
    }
    function getPlain(url) {
        return myLoginService.methode('GET', url, '{}');
    }
     
    $scope.rtodemo = function () {
        window.open("https://ezcompliance.in/demo/", "_blank");
    };


    // --------------- Login flow ---------------
  
    function hideAllLoginViews() {

        document.querySelectorAll(".newLoginView")
            .forEach(view => view.classList.remove("active"));

        document.querySelectorAll(".newLoginMethodGrid")
            .forEach(grid => grid.classList.remove("active"));

    }
    const otpView = document.getElementById("otpView");
    const otpVerifyView = document.getElementById("otpVerifyView");
    const mpinView = document.getElementById("mpinView");
    const passwordView = document.getElementById("passwordView");

    const otpMethods = document.getElementById("otpMethods");
    const mpinMethods = document.getElementById("mpinMethods");
    const passwordMethods = document.getElementById("passwordMethods");



    function hideStoreButtons() {

        //if (storeButtons) {
        //    storeButtons.style.display = "none";
        //}

    }


 

    $scope.Loginotp = function () {

        if (!$scope.MobileNumber) {
            $('#username-input').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile Number or Email ID should not be empty.', 'warning', 'btn-warning');
            return;
        }

        setBtn('#btnStep1Login', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);

        postObj('../Login/VLoginVerify', { Username: $scope.MobileNumber, Action: "8" }).then(function (res) {

            setBtn('#btnStep1Login', 'Send OTP', false);

            var d = res.data && res.data[0];
            if (!d) {
                showMsgBox('999', 'Alert', 'Your Account is not Registered. Please Register First to Continue', 'warning', 'btn-warning');
                return;
            } 
            $scope.Otp = d.Otp;
            $scope.MobileNo = $scope.MobileNumber;
            $scope.LoginId = d.LoginId;
            
            var isMobile = /^[0-9]{10}$/.test($scope.MobileNo);
            if (isMobile) {
                sendOtpSMS(); 
            }
            else {
                sendOtpEmail();  
            }
            $scope.startOtpTimer()
            hideAllLoginViews();
            otpVerifyView.classList.add("active");
            otpMethods.classList.add("active");
            hideStoreButtons();

        });
    };


    $scope.startOtpTimer= function() {

        $scope.otpTimer = 30;

        var timer = setInterval(function () {

            $scope.$apply(function () {
                $scope.otpTimer--;

                if ($scope.otpTimer <= 0) {
                    clearInterval(timer);
                    $scope.otpTimer = 0;
                }
            });

        }, 1000);
    }

    $scope.SecureLogin = function () { 
        sessionStorage.clear(); 
        if (!isValidate()) return; 
        setBtn('#btnSecureLogin', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.MobileNumber, Password: $scope.Potp, Action: "43" };

        postObj('../Login/NGetUserId', obj).then(function (res) {
            if (res.data.length > 0) {
                var data = res.data;
                var d = data[0];
                storeSession(d);
                setBtn('#btnSecureLogin', 'Secure Login', false);
                _goAfterBridge(d.RPath);
            }
            else {
                setBtn('#btnSecureLogin', 'Secure Login', false);
                showMsgBox('999', 'Alert', 'Invalid credentials!', 'warning', 'btn-warning'); return;
            }
             
        }).finally();
    };
    $scope.SecureLoginMPin = function () {
        sessionStorage.clear();
        if (!$scope.MPINMobileNo) {
            $('#Mobile').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile Number or Email ID should not be empty.', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.MPIN) {
            $('#MPIN').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'MPIN should not be empty.', 'warning', 'btn-warning');
            return;
        }

        
        setBtn('#btnSecureLoginMPin', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.MPINMobileNo, Password: $scope.MPIN, Action: "44" };

        postObj('../Login/NGetUserId', obj).then(function (res) {
            if (res.data.length > 0) {
                var data = res.data; 
                var d = data[0];
                storeSession(d);
                setBtn('#btnSecureLoginMPin', 'Secure Login', false);
                _goAfterBridge(d.RPath);
            }
            else {
                setBtn('#btnSecureLoginMPin', 'Secure Login', false);
                showMsgBox('999', 'Alert', 'Invalid credentials!', 'warning', 'btn-warning'); return;
            }
           

        }).finally();
    };
    $scope.SecureLoginUserName = function () {
        sessionStorage.clear();
        if (!$scope.UserName) {
            $('#user').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'User Name should not be empty', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.Password) {
            $('#pass').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Password should not be empty', 'warning', 'btn-warning');
            return;
        }
       
        setBtn('#btnSecureLoginUserName', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.UserName, Password: $scope.Password, Action: "45" };

        postObj('../Login/NGetUserId', obj).then(function (res)
        {
            setBtn('#btnSecureLoginUserName', 'Secure Login', false);
            if (res.data.length > 0) {
                var data = res.data;
                var d = data[0];
                storeSession(d);
                _goAfterBridge(d.RPath);
            }
            else {
                showMsgBox('999', 'Alert', 'Invalid credentials!', 'warning', 'btn-warning'); return;
            }
         

        }).finally();
    };
     
 

      
    function sendOtpEmail() {
        setBtn('#btnLogin2', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);

        postObj('../Login/SendEmail', {
            Id: $scope.Otp,
            ClientId: $scope.MobileNo,
            Action: "19"
        }).then(function (res) {

            console.log(res.data); // ✅ debug

            $('#txtOtp').val('');
            showMsg("Otp sent to your Email Id", "green", 300);

            $scope.IshideOtp = true;
            $scope.hidemobile = false;
            $scope.IshideSubmit = false;

        }).finally(function () {
            setBtn('#btnLogin2', 'Submit', false);
        });
    }

    

    function sendOtpSMS() {
        setBtn('#btnLogin2', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        postObj('../Login/SendGeneralSMS', { Msg: $scope.Otp, ContactNo: $scope.MobileNo, Action: "1" }).then(function () {
            $('#txtOtp').val('');
            showMsg("Otp sent to your number", "grey", 300);
            $scope.IshideOtp = true; $scope.hidemobile = false; $scope.IshideSubmit = false;
        }).finally(function () { setBtn('#btnLogin2', 'Submit', false); });
    }
     
    //----------------------------------------------------------------------------Registration



        $scope.SecureLoginMPin = function () {
        sessionStorage.clear();
        if (!$scope.MPINMobileNo) {
            $('#Mobile').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile Number or Email ID should not be empty.', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.MPIN) {
            $('#MPIN').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'MPIN should not be empty.', 'warning', 'btn-warning');
            return;
        }

        
        setBtn('#btnSecureLoginMPin', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.MPINMobileNo, Password: $scope.MPIN, Action: "44" };

        postObj('../Login/NGetUserId', obj).then(function (res) {
            if (res.data.length > 0) {
                var data = res.data; 
                var d = data[0];
                storeSession(d);
                setBtn('#btnSecureLoginMPin', 'Secure Login', false);
                _goAfterBridge(d.RPath);
            }
            else {
                setBtn('#btnSecureLoginMPin', 'Secure Login', false);
                showMsgBox('999', 'Alert', 'Invalid credentials!', 'warning', 'btn-warning'); return;
            }
           

        }).finally();
    };


    //--------------------------------------Forget PAssword



    $scope.ForgetMpin = function () {

 
        if (!$scope.MPINMobileNo) {
            $('#Mobile').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile Number or Email ID should not be empty.', 'warning', 'btn-warning');
            return;
        }
        else {
            $scope.MobileNumber = $scope.MPINMobileNo;
            $scope.Loginotp();
            hideStoreButtons();

            hideAllFlows();

            forgotMpinFlow.classList.add("active");

            hideForgotMpinSteps();

            forgotMpinStep1.classList.add("active");

            updateCardHeader(
                "Reset your 6-digit MPIN",
                ""
            ); 
        }
       
    }

    $scope.Verifynumber = function () {

        if (!$scope.Otp || !$scope.NewOTP) {
            $('#NewOTP').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please enter the OTP.', 'warning', 'btn-warning');
            return;
        }

        if ($scope.Otp != $scope.NewOTP) {
            $('#NewOTP').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'The OTP you entered is incorrect.', 'warning', 'btn-warning');
            return;
        }

        hideForgotMpinSteps();

        forgotMpinStep2.classList.add("active");

        updateCardHeader(
            "Reset your 6-digit MPIN",
            ""
        );
    };


    $scope.UpdateMpin = function () {
        sessionStorage.clear();

        if (!$scope.MPIN1) {
            $('#MPIN1').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please enter 6 digit  MPIN.', 'warning', 'btn-warning');
            return;
        }
        if (!/^\d{6}$/.test($scope.MPIN1)) {
            $('#MPIN1').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please enter a valid 6-digit MPIN.', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.MPIN2) {
            $('#MPIN2').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please confirm MPIN.', 'warning', 'btn-warning');
            return;
        }

        if ($scope.MPIN1 !== $scope.MPIN2) {
            $('#MPIN1, #MPIN2').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'MPIN and Confirm MPIN do not match.', 'warning', 'btn-warning');
            return;
        }

        $('#MPIN1, #MPIN2').css('border-bottom', '');

        setBtn('#registerNextStep', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.LoginId, Password: $scope.MPIN2, Action: "48" };

        postObj('../Login/NGetUserId', obj).then(function (res) {
            var data = res.data[0];
            if (data.LoginId == '-1') {
                showMsgBox('999', 'Alert', 'Something Went Wrong !', 'warning', 'btn-warning'); return;
            }
            else {
                storeSession(data);
                _goAfterBridge(data.RPath);
            }


        }).finally();
    };



    $scope.forgotPasswordNext = function () {


        if (!$scope.MobileNumber) {
            $('#MobileNumber').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile Number or Email ID should not be empty.', 'warning', 'btn-warning');
            return;
        }
        else {
            
         
            postObj('../Login/VLoginVerify', { Username: $scope.MobileNumber, Action: "8" }).then(function (res) {

                setBtn('#btnStep1Login', 'Send OTP', false);

                var d = res.data && res.data[0];
                if (!d) {
                    showMsgBox('999', 'Alert', 'Your Account is not Registered. Please Register First to Continue', 'warning', 'btn-warning');
                    return;
                }
                $scope.Otp = d.Otp;
                $scope.MobileNo = $scope.MobileNumber;
                $scope.LoginId = d.LoginId;

                var isMobile = /^[0-9]{10}$/.test($scope.MobileNo);
                if (isMobile) {
                    sendOtpSMS();
                }
                else {
                    sendOtpEmail();
                }
                $scope.startOtpTimer()
                hideAllLoginViews();
                forgotPasswordStep1.classList.remove("active");

                forgotPasswordStep2.classList.add("active");

            });
            
        }

    }

     


    $scope.o1 = "";
    $scope.o2 = "";
    $scope.o3 = "";
    $scope.o4 = "";
    $scope.o5 = "";
    $scope.o6 = "";

    $scope.passOTP = "";
    $scope.permissiontoopen = false;
    $scope.joinOTP = function () {
        $scope.passOTP =
            ($scope.o1 || "") +
            ($scope.o2 || "") +
            ($scope.o3 || "") +
            ($scope.o4 || "") +
            ($scope.o5 || "") +
            ($scope.o6 || "");
    };

    $scope.Verifyotppass = function () {

        if (!$scope.Otp || !$scope.passOTP) {
            $scope.permissiontoopen = false;
            $scope.otpStatus = "";
            return;
        }

        if ($scope.Otp != $scope.passOTP) {

            $scope.permissiontoopen = false;
            $scope.otpStatus = "error";

            showMsgBox('999', 'Alert', 'The OTP you entered is incorrect.', 'warning', 'btn-warning');
            return;
        }

        $scope.permissiontoopen = true;
        $scope.otpStatus = "success";
    };

    $scope.otpStatus = "";
    $scope.permissiontoopen = false;
    $scope.otpKey = function (event, index) {
      
        var inputs = document.querySelectorAll(".newOtpBoxes input");

        // Sirf number allow
        event.target.value = event.target.value.replace(/\D/g, "");

        // Model update
        $scope["o" + index] = event.target.value;
        $scope.joinOTP();

        // Next box
        if (event.target.value.length == 1 && index < 6) {
            inputs[index].focus();
        }
        if (index == 6) {
          
            $scope.Verifyotppass();
        }
        else { $scope.permissiontoopen = false;}
        // Backspace
        if (event.key === "Backspace") {
            if (index == 6) {
                $scope.Verifyotppass();
            }
            else { $scope.permissiontoopen = false; }
            if (event.key === "Backspace") {
                $scope.permissiontoopen = false;
                $scope.otpStatus = "";

                if (event.target.value === "" && index > 1) {
                    inputs[index - 2].focus();
                }
            }
        }
    };

   
    $scope.Updatepass = function () {
        sessionStorage.clear();
        if (!$scope.MobileNumber) {
            $('#Mobile').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile Number or Email ID should not be empty.', 'warning', 'btn-warning');
            return;
        }
        
        if (!$scope.passOTP || !/^\d{6}$/.test($scope.passOTP)) {
            Swal.fire({
                icon: "warning",
                title: "Invalid OTP",
                text: "Please enter a valid 6-digit OTP."
            });
            return;
        }
        if (!$scope.Password1) {
            $('#Password1').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please enter 6 digit  MPIN.', 'warning', 'btn-warning');
            return;
        }


        if (!$scope.Password2) {
            $('#Password2').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please confirm MPIN.', 'warning', 'btn-warning');
            return;
        }

        if ($scope.Password1 !== $scope.Password2) {
            $('#Password1, #Password2').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Password and Confirm Password do not match.', 'warning', 'btn-warning');
            return;
        }


        setBtn('#forgotPasswordContinue', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.MobileNumber, Password: $scope.Password1, Action: "59" };

        postObj('../Login/NGetUserId', obj).then(function (res) {
            if (res.data.length > 0) {
                var data = res.data;
                var d = data[0];
                storeSession(d);
                setBtn('#forgotPasswordContinue', 'Continue', false);
                _goAfterBridge(d.RPath);
            }
            else {
                setBtn('#btnSecureLoginMPin', 'Secure Login', false);
                showMsgBox('999', 'Alert', 'Invalid credentials!', 'warning', 'btn-warning'); return;
            }


        }).finally();
    };



    //------------------------------------------------End Forgetpass

    

    const registerSendOtp =
        document.getElementById("registerSendOtp");

    const cardTitle =
        document.getElementById("newLoginCardTitle");

    const cardSubTitle =
        document.getElementById("newLoginCardSubTitle");

    function updateCardHeader(title, subtitle) {

        if (cardTitle) {
            cardTitle.textContent = title;
        }

        if (cardSubTitle) {
            cardSubTitle.textContent = subtitle;
        }

    }
    function hideRegisterSteps() {

        document.querySelectorAll(".newRegisterStep")
            .forEach(step => step.classList.remove("active"));

    }

    const loginFlow =
        document.getElementById("newLoginFlow");

    const registerFlow =
        document.getElementById("newRegisterFlow");

    const openRegister =
        document.getElementById("openRegisterFlow");

    const backToLogin =
        document.getElementById("backToLogin");

    $scope.openregistration = function() {
        hideStoreButtons();
  $scope.ldynamicback = 'Welcome';
        $scope.Reglogin = "Create your BharatShramSetu account";
        loginFlow.style.display = "none";

        registerFlow.classList.add("active");

        hideRegisterSteps();

        registerStep1.classList.add("active");
    }


    $scope.DigilockerRegistration = function () {

        sessionStorage.clear();

        if (!LType) {
            LType = 7;
        }

        var userType = "";

        if (LType == 7)
            userType = "Worker";
        else if (LType == 5)
            userType = "Principal Employer";
        else if (LType == 6)
            userType = "Contractor";

        Swal.fire({
            title: 'Confirm Registration',
            text: 'Do you want to register as ' + userType + '?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Continue',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false
        }).then((result) => {

            if (result.isConfirmed) {

                setBtn(
                    '#btnDigilockerRegistration',
                    '<i class="fa fa-spinner fa-spin"></i> Please wait',
                    true
                );

                window.location.href =
                    "../Login/DigiLockerLogin?LType=" + LType;
            }

        });
    };

    $scope.ReSendotp= function () {
        sessionStorage.clear();
        if (!$scope.NewMobileNo) {
            $('#userNewMobileNo').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile No. or Email Id should not be empty', 'warning', 'btn-warning');
            return;
        }

        setBtn('#btnSecureLoginUserName', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.NewMobileNo, Action: "49" };

        postObj('../Login/VLoginVerify', obj).then(function (res) {
            var data = res.data[0];
            if (data.LoginId == '-1') {
                showMsgBox('999', 'Alert', 'Already Register, Please login', 'warning', 'btn-warning'); return;
            }
            else {
                $scope.Otp = data.LoginId;
                $scope.MobileNo = $scope.NewMobileNo;
                var isMobile = /^[0-9]{10}$/.test($scope.MobileNo);
                if (isMobile) {
                    sendOtpSMS();
                }
                else {
                    sendOtpEmail();
                }
                $scope.startOtpTimer()
                hideRegisterSteps();

                hideStoreButtons();

                registerStep2.classList.add("active");


            }


        }).finally();
    };
	
	
	 $scope.ValidateEmilaorMobile = function () {
        var value = $scope.NewMobileNo;
        if (!value || value.trim() == '') {
            return;
        }
        value = value.trim();
        var isNumber = /^[0-9]+$/.test(value);
        if (isNumber) {
            var isMobile = /^[0-9]{10}$/.test(value);
            if (!isMobile) {
                $('#userNewMobileNo').css('border-bottom', '1px solid red');
                showMsgBox('999', 'Alert', 'Please enter valid 10 digit Mobile No.', 'warning', 'btn-warning');
                $scope.NewMobileNo = '';
                return;
            }
        }
        else {
            var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            if (!isEmail) {
                $('#userNewMobileNo').css('border-bottom', '1px solid red');
                showMsgBox('999', 'Alert', 'Please enter valid Email Id.', 'warning', 'btn-warning');
                $scope.NewMobileNo = '';
                return;
            }
        }
    };
	
    $scope.Registration = function ()
    {
        sessionStorage.clear();
        if (!$scope.NewMobileNo) {
            $('#userNewMobileNo').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile No. or Email Id should not be empty', 'warning', 'btn-warning');
            return;
        }
        if (!LType) {

            LType = 7;
        }
        if (!LType) {
          
            showMsgBox('999', 'Alert', 'Please Select User Type', 'warning', 'btn-warning');
            return;
        }
        
        setBtn('#btnSecureLoginUserName', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
       
        var obj = { Username: $scope.NewMobileNo, PassWord: LType,  Action: "46" };

        postObj('../Login/VLoginVerify', obj).then(function (res) {
            var data = res.data[0];
            if (data.LoginId == '-1')
            {
                showMsgBox('999', 'Alert', 'Already Register, Please login', 'warning', 'btn-warning'); return;
            }
            else 
            {
                $scope.Otp = data.Otp;
                $scope.MobileNo = $scope.NewMobileNo;
                var isMobile = /^[0-9]{10}$/.test($scope.MobileNo);
                if (isMobile) {
                    sendOtpSMS();
                }
                else {
                    sendOtpEmail();
                }
                $scope.startOtpTimer()
                hideRegisterSteps();

                hideStoreButtons();

                registerStep2.classList.add("active");

               
            }
           

        }).finally();
    };


   

    $scope.ConfirmRegistration = function () {
        sessionStorage.clear();
        if (!$scope.NewMobileNo) {
            $('#userNewMobileNo').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile No. or Email Id should not be empty', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.NewNRotp) {
            $('#NewNRotp').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Mobile No. or Email Id should not be empty', 'warning', 'btn-warning');
            return;
        }
         
        setBtn('#registerNextStep', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.NewMobileNo, Password: $scope.NewNRotp,  Action: "47" };

        postObj('../Login/VLoginVerify', obj).then(function (res) {
            var data = res.data[0];
            setBtn('#registerNextStep', 'Next', false);
            if (data.LoginId == '-1') {
                showMsgBox('999', 'Alert', 'Invalid Otp', 'warning', 'btn-warning'); return;
            }
            else
            {
                
                $scope.LoginId = data.LoginId;
                $scope.TUserName = data.TUserName;
              
                hideRegisterSteps();

                hideStoreButtons();

                registerStep3.classList.add("active");


            }


        }).finally();
    };




    $scope.redirectotupload = function () {
        window.location.href = '../Worker/AutoFillDoc';
    }


    $scope.WorkerRegistrationR = function () {
        window.location.href = '../RetailSection/NewWorkerRegistraton';
    }


    const step3Next =
        document.getElementById("step3Next");
    $scope.CreateMpin = function () {
        sessionStorage.clear();
         
        if (!$scope.MPIN1) {
            $('#MPIN1').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please enter 6 digit  MPIN.', 'warning', 'btn-warning');
            return;
        }
        if (!/^\d{6}$/.test($scope.MPIN1)) {
            $('#MPIN1').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please enter a valid 6-digit MPIN.', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.MPIN2) {
            $('#MPIN2').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'Please confirm MPIN.', 'warning', 'btn-warning');
            return;
        }
         
        if ($scope.MPIN1 !== $scope.MPIN2) {
            $('#MPIN1, #MPIN2').css('border-bottom', '1px solid red');
            showMsgBox('999', 'Alert', 'MPIN and Confirm MPIN do not match.', 'warning', 'btn-warning');
            return;
        }
         
        $('#MPIN1, #MPIN2').css('border-bottom', '');

        setBtn('#registerNextStep', '<i class="fa fa-spinner fa-spin"></i> Please wait', true);
        var obj = { Username: $scope.LoginId, Password: $scope.MPIN2, Action: "48" };

        postObj('../Login/NGetUserId', obj).then(function (res) {
            var data = res.data[0];
            if (data.LoginId == '-1') {
                showMsgBox('999', 'Alert', 'Something Went Wrong !', 'warning', 'btn-warning'); return;
            }
            else {
                storeSession(data);
                if (data.LoginType == '7') {
                   

                    hideRegisterSteps();

                    hideStoreButtons();

                    registerStep4.classList.add("active");

                }
                else {
            
                    _goAfterBridge(data.RPath);
                }

               
          
            }


        }).finally();
    };

    var LType = '';
    
    const roleItems = document.querySelectorAll(".newLoginRole");

    roleItems.forEach(role => {

        role.addEventListener("click", function () {

            document.querySelectorAll(".newLoginRole")
                .forEach(item => item.classList.remove("active"));

            this.classList.add("active");

            const radio = this.querySelector("input[type='radio']");

            if (radio) {
                radio.checked = true;
            }
            LType = radio.value;
            console.log(radio.value); // Selected Value
        });

    });


    const registerBackStep3 =
        document.getElementById("registerBackStep3");

    if (registerBackStep3) {

        registerBackStep3.addEventListener("click", function () {

            hideRegisterSteps();

            hideStoreButtons();

            registerStep3.classList.add("active");

            updateCardHeader(
                "Create your 6-digit MPIN",
                "This PIN will be required for every future login to the BharatShramSetu platform."
            );

        });

    }


    const registerBackStep2 =
        document.getElementById("registerBackStep2");

    if (registerBackStep2) {

        registerBackStep2.addEventListener("click", function () {

            hideRegisterSteps();

            hideStoreButtons();

            registerStep2.classList.add("active");

            updateCardHeader(
                "Verify Mobile Number",
                "Enter the OTP sent to your registered mobile number"
            );

        });

    }
    const registerBackStep1 =
        document.getElementById("registerBackStep1");

    if (registerBackStep1) {

        registerBackStep1.addEventListener("click", function () {

            hideRegisterSteps();

            registerStep1.classList.add("active");

            updateCardHeader(
                "Welcome",
                "Create your BharatShramSetu account"
            );

        });

    }
    document.querySelectorAll(".openOtp").forEach(btn => {

        btn.addEventListener("click", openOtpView);

    });

    document.querySelectorAll(".openMpin").forEach(btn => {

        btn.addEventListener("click", openMpinView);

    });

    document.querySelectorAll(".openPassword").forEach(btn => {

        btn.addEventListener("click", openPasswordView);

    });
    function openOtpView() {

        hideAllLoginViews();

        otpView.classList.add("active");
        otpMethods.classList.add("active");

        showStoreButtons();

    }



    document.querySelectorAll(".newPasswordToggle")
        .forEach(btn => {

            btn.addEventListener("click", function () {

                const input =
                    this.parentElement.querySelector("input");

                if (input.type === "password") {

                    input.type = "text";

                } else {

                    input.type = "password";

                }

            });

        });
    function openMpinView() {

        hideAllLoginViews();

        mpinView.classList.add("active");
        mpinMethods.classList.add("active");

        hideStoreButtons();

    }

    function openPasswordView() {

        hideAllLoginViews();

        passwordView.classList.add("active");
        passwordMethods.classList.add("active");

        hideStoreButtons();

    }
    if (backToLogin) {

        backToLogin.addEventListener("click", function (e) {

            e.preventDefault();

            registerFlow.classList.remove("active");
           
            hideRegisterSteps();

            registerStep1.classList.add("active");

            loginFlow.style.display = "block";

            updateCardHeader(
                "Welcome Back!",
                "Log in to your BharatShramSetu account"
            );

        });

    }
 
    const forgotPasswordFlow =
        document.getElementById("forgotPasswordFlow");

    const forgotPasswordStep1 =
        document.getElementById("forgotPasswordStep1");

    const forgotPasswordStep2 =
        document.getElementById("forgotPasswordStep2");

    const openForgotPassword =
        document.getElementById("openForgotPassword");

    const forgotPasswordBackToLogin =
        document.getElementById("forgotPasswordBackToLogin");

    const forgotPasswordNext =
        document.getElementById("forgotPasswordNext");

    const forgotPasswordBackStep1 =
        document.getElementById("forgotPasswordBackStep1");

    const forgotPasswordContinue =
        document.getElementById("forgotPasswordContinue");


    /* OPEN FORGOT PASSWORD */

    if (openForgotPassword) {

        openForgotPassword.addEventListener("click", function (e) {

            e.preventDefault();

            hideStoreButtons();

            loginFlow.style.display = "none";

            registerFlow.classList.remove("active");

            forgotPasswordFlow.classList.add("active");

            forgotPasswordStep1.classList.add("active");

            forgotPasswordStep2.classList.remove("active");

            updateCardHeader(
                "Reset Password",
                "Enter your registered email or mobile number to receive a verification code."
            );

        });

    }


    /* STEP 1 -> STEP 2 */
 

     

    if (forgotPasswordBackStep1) {

        forgotPasswordBackStep1.addEventListener("click", function () {

            forgotPasswordStep2.classList.remove("active");

            forgotPasswordStep1.classList.add("active");

        });

    }

     

    if (forgotPasswordBackToLogin) {

        forgotPasswordBackToLogin.addEventListener("click", function () {

            forgotPasswordFlow.classList.remove("active");

            loginFlow.style.display = "block";

            updateCardHeader(
                "Welcome Back!",
                "Log in to your BharatShramSetu account"
            );

        });

    }

     

    if (forgotPasswordContinue) {

        forgotPasswordContinue.addEventListener("click", function () {

            Swal.fire({
                icon: "success",
                title: "Password Updated",
                text: "Your password has been reset successfully.",
                confirmButtonText: "Login"
            }).then(() => {

                forgotPasswordFlow.classList.remove("active");

                loginFlow.style.display = "block";

                updateCardHeader(
                    "Welcome Back!",
                    "Log in to your BharatShramSetu account"
                );

                openPasswordView();

            });

        });

    }
     

    const forgotMpinFlow =
        document.getElementById("forgotMpinFlow");

    const forgotMpinStep1 =
        document.getElementById("forgotMpinStep1");

    const forgotMpinStep2 =
        document.getElementById("forgotMpinStep2");

    const openForgotMpin =
        document.getElementById("openForgotMpin");

    const forgotMpinNext =
        document.getElementById("forgotMpinNext");

    function hideForgotMpinSteps() {

        document.querySelectorAll("#forgotMpinFlow .newRegisterStep")
            .forEach(step => step.classList.remove("active"));

    }

    function hideAllFlows() {

        if (loginFlow)
            loginFlow.style.display = "none";

        if (registerFlow)
            registerFlow.classList.remove("active");

        const forgotMpinFlow =
            document.getElementById("forgotMpinFlow");

        if (forgotMpinFlow)
            forgotMpinFlow.classList.remove("active");

    }

    

     

   

   

    const forgotMpinContinue =
        document.getElementById("forgotMpinContinue");

    if (forgotMpinContinue) {

        forgotMpinContinue.addEventListener("click", function () {

            /* hide forgot flow */
            forgotMpinFlow.classList.remove("active");

            /* show login */
            loginFlow.style.display = "block";

            /* reset heading */
            updateCardHeader(
                "Welcome Back!",
                "Log in to your BharatShramSetu account"
            );

            /* open MPIN login view */
            openMpinView();

        });

    }


    
});
