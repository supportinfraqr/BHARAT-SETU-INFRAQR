document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
   CARD HEADER UPDATE
===================================================== */

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

    /* =====================================================
   STORE BUTTONS Login View
===================================================== */

    const storeButtons =
        document.getElementById("storeButtons");

    function showStoreButtons() {

        if (storeButtons) {
            storeButtons.style.display = "flex";
        }

    }

    function hideStoreButtons() {

        if (storeButtons) {
            storeButtons.style.display = "none";
        }

    }


//    /* =====================================================
//   STORE BUTTONS Register View
//===================================================== */

//    const registerStoreButtons =
//        document.getElementById("registerStoreButtons");

//    function showRegisterStoreButtons() {

//        if (registerStoreButtons) {
//            registerStoreButtons.style.display = "flex";
//        }

//    }

//    function hideRegisterStoreButtons() {

//        if (registerStoreButtons) {
//            registerStoreButtons.style.display = "none";
//        }

//    }



    /* =====================================================
       ROLE SELECTOR
    ===================================================== */

    const roleItems = document.querySelectorAll(".newLoginRole");

    roleItems.forEach(role => {

        role.addEventListener("click", function () {

            const roleGroup =
                this.closest(".newLoginRoleRow");

            roleGroup.querySelectorAll(".newLoginRole")
                .forEach(item => item.classList.remove("active"));

            this.classList.add("active");

            const radio = this.querySelector("input");

            if (radio) {
                radio.checked = true;
            }

        });

    });


    /* =====================================================
       LOGIN METHOD SWITCHING
    ===================================================== */

    const otpView = document.getElementById("otpView");
    const otpVerifyView = document.getElementById("otpVerifyView");
    const mpinView = document.getElementById("mpinView");
    const passwordView = document.getElementById("passwordView");

    const otpMethods = document.getElementById("otpMethods");
    const mpinMethods = document.getElementById("mpinMethods");
    const passwordMethods = document.getElementById("passwordMethods");

    function hideAllLoginViews() {

        document.querySelectorAll(".newLoginView")
            .forEach(view => view.classList.remove("active"));

        document.querySelectorAll(".newLoginMethodGrid")
            .forEach(grid => grid.classList.remove("active"));

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

    function openOtpView() {

        hideAllLoginViews();

        otpView.classList.add("active");
        otpMethods.classList.add("active");

        showStoreButtons();

    }

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

    document.querySelectorAll(".openOtp").forEach(btn => {

        btn.addEventListener("click", openOtpView);

    });

    document.querySelectorAll(".openMpin").forEach(btn => {

        btn.addEventListener("click", openMpinView);

    });

    document.querySelectorAll(".openPassword").forEach(btn => {

        btn.addEventListener("click", openPasswordView);

    });


    /* =====================================================
       OTP VERIFY SCREEN
    ===================================================== */

    const showOtpVerify =
        document.getElementById("showOtpVerify");

    const backToOtp =
        document.getElementById("backToOtp");

    if (showOtpVerify) {

        showOtpVerify.addEventListener("click", function () {

            hideAllLoginViews();

            otpVerifyView.classList.add("active");
            otpMethods.classList.add("active");

            hideStoreButtons();

        });

    }

    if (backToOtp) {

        backToOtp.addEventListener("click", function () {

            openOtpView();

        });

    }


    /* =====================================================
   LOGIN ↔ REGISTER FLOW
===================================================== */

    const loginFlow =
        document.getElementById("newLoginFlow");

    const registerFlow =
        document.getElementById("newRegisterFlow");

    const openRegister =
        document.getElementById("openRegisterFlow");

    const backToLogin =
        document.getElementById("backToLogin");

    if (openRegister) {

        openRegister.addEventListener("click", function (e) {

            e.preventDefault();

            hideStoreButtons();

            loginFlow.style.display = "none";

            registerFlow.classList.add("active");

            hideRegisterSteps();

            registerStep1.classList.add("active");

            updateCardHeader(
                "Welcome",
                "Create your BharatShramSetu account"
            );

        });

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


    /* =====================================================
   REGISTER STEP SWITCHING
===================================================== */

    const registerStep1 =
        document.getElementById("registerStep1");

    const registerStep2 =
        document.getElementById("registerStep2");

    const registerStep3 =
        document.getElementById("registerStep3");

    const registerStep4 =
        document.getElementById("registerStep4");

    function hideRegisterSteps() {

        document.querySelectorAll(".newRegisterStep")
            .forEach(step => step.classList.remove("active"));

    }


    /* STEP 1 -> STEP 2 */

    const registerSendOtp =
        document.getElementById("registerSendOtp");

    if (registerSendOtp) {

        registerSendOtp.addEventListener("click", function () {

            hideRegisterSteps();

            hideStoreButtons();

            registerStep2.classList.add("active");

            updateCardHeader(
                "Verify Mobile Number",
                "Enter the OTP sent to your registered mobile number"
            );

        });

    }


    /* STEP 2 -> STEP 1 */

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


    /* STEP 2 -> STEP 3 */

    const registerNextStep =
        document.getElementById("registerNextStep");

    if (registerNextStep) {

        registerNextStep.addEventListener("click", function () {

            hideRegisterSteps();

            hideStoreButtons();

            registerStep3.classList.add("active");

            updateCardHeader(
                "Create your 6-digit MPIN",
                "This PIN will be required for every future login to the BharatShramSetu platform."
            );

        });

    }


    /* STEP 3 -> STEP 2 */

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


    /* STEP 3 -> STEP 4 */

    const step3Next =
        document.getElementById("step3Next");

    if (step3Next) {

        step3Next.addEventListener("click", function () {

            hideRegisterSteps();

            hideStoreButtons();

            registerStep4.classList.add("active");

            updateCardHeader(
                "Complete your Profile",
                "Select how you would like to provide your information. We recommend auto-fill for a faster and more accurate registration process."
            );

        });

    }


    /* STEP 4 -> STEP 3 */

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

    /* =====================================================
   FORGOT PASSWORD FLOW
===================================================== */

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

    if (forgotPasswordNext) {

        forgotPasswordNext.addEventListener("click", function () {

            forgotPasswordStep1.classList.remove("active");

            forgotPasswordStep2.classList.add("active");

        });

    }


    /* STEP 2 -> STEP 1 */

    if (forgotPasswordBackStep1) {

        forgotPasswordBackStep1.addEventListener("click", function () {

            forgotPasswordStep2.classList.remove("active");

            forgotPasswordStep1.classList.add("active");

        });

    }


    /* BACK TO LOGIN */

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


    /* PASSWORD RESET COMPLETE */

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

    /* =====================================================
   FORGOT MPIN FLOW
===================================================== */

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


    /* OPEN FLOW */

    if (openForgotMpin) {

        openForgotMpin.addEventListener("click", function (e) {

            e.preventDefault();

            hideStoreButtons();

            hideAllFlows();

            forgotMpinFlow.classList.add("active");

            hideForgotMpinSteps();

            forgotMpinStep1.classList.add("active");

            updateCardHeader(
                "Reset your 6-digit MPIN",
                ""
            );

        });

    }


    /* STEP 1 → STEP 2 */

    if (forgotMpinNext) {

        forgotMpinNext.addEventListener("click", function () {

            hideForgotMpinSteps();

            forgotMpinStep2.classList.add("active");

            updateCardHeader(
                "Reset your 6-digit MPIN",
                ""
            );

        });

    }


    /* =====================================================
   FORGOT MPIN COMPLETE
===================================================== */

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


    /* =====================================
       PASSWORD TOGGLE
    ===================================== */

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

    


});