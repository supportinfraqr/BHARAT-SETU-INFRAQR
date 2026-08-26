app.controller('WorkerDashboardController', function ($scope, $http, myService) {
    $scope.bindworkerdashboard = function () {
        $scope.showLoader();

        var collectionobj = {
            ActionType: 1,
            UserId: LoginId
        };

        var getData = myService.methode(
            'POST',
            "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            if (response.data.Result && response.data.Result.length > 0) {
                $scope.DashboardDetail = response.data.Result[0];
                $scope.EAdharCardNumber = response.data.Result[0].AdharCardNumber;
                $scope.status = $scope.DashboardDetail.status;
                if ($scope.status == 'Active') {
                    $scope.bindContractorDetail($scope.DashboardDetail.UserId, $scope.DashboardDetail.PartyId);
                    $scope.getprincipledetail($scope.DashboardDetail.UserId, $scope.DashboardDetail.PartyId);
                }
                // Load actual bindings from QR system
                $scope.loadQrBindings();
                $scope.$applyAsync();
            } else {
                // Demo fallback: bindworkerdetail returns empty for QR-only demo workers
                $scope.DashboardDetail = {
                    status: 'Active',
                    UserName: 'Rajesh Kumar',
                    EmployeeCode: 'WK-001',
                    Designation: 'Mason',
                    MobileNumber: '9876543410',
                    EmployeeName: 'Rajesh Kumar',
                    PANCardNumber: 'ABCK1234P',
                    AdharCardNumber: '123456789012',
                    UANNumber: '100234567890',
                    ESICNumber: '2004567890123',
                    BloodGroup: 'B+',
                    FatherName: 'Ram Kumar',
                    DOJ: '15/01/2025',
                    LIN: 'LIN-UP-2025-001',
                    ClientName: 'Principal Infra Solutions Pvt Ltd',
                    SiteName: 'Noida Metro Phase 2'
                };
                $scope.status = 'Active';
                $scope.loadQrBindings();
                $scope.$applyAsync();
            }
            $scope.hideLoader();

        }).catch(function (error) {

            console.error("Error:", error);
            $scope.hideLoader();

        });
    };
    $scope.bindContractorDetail = function (userid, partyid) {
        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.Id = partyid;
        collectionobj.UserId = userid;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.ContDashboard = response.data.Result[0];
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };

    // ── QR Binding Data ─────────────────────────────────────────────────────
    $scope.QrContractor = null;
    $scope.QrEmployer = null;

    $scope.loadQrBindings = function () {
        $http.get('../Api/QrBridge/qr/bindings/list/')
            .then(function (res) {
                if (res.data && res.data.Result === 'Success' && res.data.Data) {
                    var bindings = res.data.Data;
                    // Find ACTIVE worker-contractor binding
                    var wcBinding = null;
                    for (var i = 0; i < bindings.length; i++) {
                        var b = bindings[i];
                        if ((b.binding_type === 'WORKER_CONTRACTOR' || b.binding_type === 'CONTRACTOR_WORKER') &&
                            (b.status === 'ACTIVE' || b.status === 'ACCEPTED')) {
                            wcBinding = b;
                            break;
                        }
                    }
                    if (wcBinding) {
                        var con = wcBinding.contractor || {};
                        $scope.QrContractor = {
                            name: con.name || wcBinding.contractor_name || '-',
                            code: con.code || wcBinding.contractor_code || '-',
                            contact: con.contact_mobile || wcBinding.contractor_contact || con.contact_person || '-',
                            email: con.email || wcBinding.contractor_email || '-',
                            site: wcBinding.site_name || wcBinding.site || '-',
                            binding_id: wcBinding.id,
                            status: wcBinding.status
                        };
                    }
                    // Find ACTIVE employer binding
                    var ecBinding = null;
                    for (var j = 0; j < bindings.length; j++) {
                        var bj = bindings[j];
                        if ((bj.binding_type === 'EMPLOYER_CONTRACTOR' || bj.binding_type === 'WORKER_EMPLOYER') &&
                            (bj.status === 'ACTIVE' || bj.status === 'ACCEPTED')) {
                            ecBinding = bj;
                            break;
                        }
                    }
                    if (ecBinding) {
                        var emp = ecBinding.employer || {};
                        $scope.QrEmployer = {
                            name: emp.name || ecBinding.employer_name || '-',
                            code: emp.code || ecBinding.employer_code || '-',
                            industry: emp.industry || ecBinding.employer_industry || '-',
                            email: emp.email || ecBinding.employer_email || '-',
                            contact: emp.contact_mobile || ecBinding.employer_contact || emp.contact_person || '-',
                            site: ecBinding.site_name || '-',
                            binding_id: ecBinding.id,
                            status: ecBinding.status
                        };
                    }
                    $scope.$applyAsync();
                }
            })
            .catch(function () {
                // If QR bindings fail, fall back to legacy SP data silently
            });
    };
    // ───────────────────────────────────────────────────────────────────────

    $scope.maskNumber = function (value) {
        if (!value) return '';

        value = value.toString();
        return '*'.repeat(Math.max(0, value.length - 4)) + value.slice(-4);
    };

    $scope.getQrUrl = function (EmpCode) {

        if (!EmpCode) return "";

        var data =
            "https://login.bharatshramsetu.com/icard.html?id=" + EmpCode + "";

        return "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(data);
    };

    $scope.GiveConsentByWorker = function (isflag) {
        var collectionobj = {
            ActionType: 22,
            LoginId: LoginId,
            PartyId: $scope.DashboardDetail.PartyId,
            EmployeeCode: $scope.DashboardDetail.EmployeeCode,
            Id: isflag,
        };

        myService.methode(
            'POST',
            "../RetailSection/SendReqToWorker",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {
            showMsgBox(response.data.Result);
            $scope.bindworkerdashboard();
        });
    };

    $scope.getprincipledetail = function (userid, partyid) {
        var collectionobj = {};
        collectionobj.ActionType = 2;
        collectionobj.Id = partyid;
        collectionobj.UserId = userid;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.client = response.data.Result[0];
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };

    $scope.getapprovalSection = function () {
        var collectionobj = {};
        collectionobj.ActionType = 7; 
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response)
        {
            if (response.data.Result.length > 0) {
                $scope.PanApprove = response.data.Result[0].PanApprove;
                $scope.AdhaarApprove = response.data.Result[0].AdhaarApprove;
                $scope.UANApprove = response.data.Result[0].UANApprove;
                $scope.ESICApprove = response.data.Result[0].ESICApprove;
                $scope.$applyAsync();
            }
          
        })
            
    };
    $scope.showAadhaarOptions = false;
    $scope.showPanOptions = false;
    $scope.showUanOptions = false;
    $scope.showEsicOptions = false;
    $scope.showPoliceOptions = false;

    $scope.buttonAAdhar = 'Verify'
    $scope.ClickonbuttonAAdhar = function () {

        if ($scope.showAadhaarOptions == false) {
          
            $scope.buttonAAdhar = 'Close'
        }
        else {
            $scope.buttonAAdhar = 'Verify'
        }
     
    }
    $scope.buttonAAdhar = 'Verify';
    //$scope.VerifyByUIDAI = function () {
    //    Swal.fire({
    //        icon: 'info',
    //        title: 'UIDAI Service Unavailable',
    //        html: 'UIDAI verification service is currently unavailable.<br><br>Please use <b>EZIN AI Verification</b> to continue your registration process.',
    //        confirmButtonText: 'Use EZ AI'
    //    }).then((result) => {
    //        if (result.isConfirmed) {
    //            $scope.VerifyByEZAI();
    //        }
    //    });
    //};

    $scope.VerifyByUIDAI = function () {
       
        Swal.fire({
            title: 'UIDAI Verification',
            html: `
            <div style="display:flex;gap:10px;">
                <input type="text"
                       id="txtAadhaarNo"
                       class="swal2-input"
                       style="margin:0;flex:1;"
                       maxlength="12"
                       placeholder="Enter Aadhaar Number"
                       oninput="this.value=this.value.replace(/\\D/g,'').slice(0,12)">

                <button id="btnVerifyUIDAI"
                        class="swal2-confirm swal2-styled"
                        style="margin:0;height:53px;font-size:17px;">
                    Verify
                </button>
            </div>
        `,
            showConfirmButton: false,
            showCancelButton: false,
            showCloseButton: true,

            didOpen: function () {
                $("#txtAadhaarNo").val($scope.EAdharCardNumber);
                $("#btnVerifyUIDAI").on("click", function () {

                   

                    var aadhaar = $("#txtAadhaarNo").val().trim();

                    if (!/^\d{12}$/.test(aadhaar)) {
                        Swal.showValidationMessage("Please enter a valid 12 digit Aadhaar Number.");
                        return;
                    }

                    $("#btnVerifyUIDAI")
                        .prop("disabled", true)
                        .html('<i class="bi bi-arrow-repeat spin"></i>');

                    $.ajax({
                        url: "../Api/ApiVerification/Generate",
                        type: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({
                            AadhaarNumber: aadhaar 
                        }),
                        success: function (res) {


                            if (typeof res === "string") {
                                res = JSON.parse(res);
                            }

                            $("#btnVerifyUIDAI")
                                .prop("disabled", false)
                                .html("Verify");

                            if (res && res.code == 200) {

                                $scope.referenceId = res.data.reference_id;
                                $scope.aadhaarNo = aadhaar;

                                Swal.fire({
                                    icon: "success",
                                    title: "OTP Sent",
                                    html: `
                                    <div style="margin-bottom:15px">
                                        Enter the OTP sent to your registered mobile number linked with Aadhaar.
                                    </div>

                                    <input type="text"
                                           id="txtOTP"
                                           class="swal2-input"
                                           maxlength="6"
                                           placeholder="Enter OTP"
                                           oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)">
                                `,
                                    showCloseButton: true,
                                    confirmButtonText: "Verify OTP"
                                }).then(function (result) {

                                    if (!result.isConfirmed)
                                        return;

                                    var otp = $("#txtOTP").val().trim();

                                    if (!/^\d{6}$/.test(otp)) {
                                        Swal.fire("Invalid OTP", "Please enter a valid 6 digit OTP.", "warning");
                                        return;
                                    }

                                    Swal.fire({
                                        title: 'Please wait...',
                                        text: 'OTP verification is in progress.',
                                        allowOutsideClick: false,
                                        allowEscapeKey: false,
                                        didOpen: () => {
                                            Swal.showLoading();
                                        }
                                    });

                                    $.ajax({
                                        url: "../Api/ApiVerification/Verify",   // Controller Route
                                        type: "POST",
                                        contentType: "application/json",
                                        data: JSON.stringify({
                                            referenceId: $scope.referenceId,
                                            otp: otp,
                                            AadhaarNumber: $scope.aadhaarNo,
                                            LoginId : LoginId
                                        }),
                                        success: function (verifyRes) {
                                            $scope.bindworkerdashboard();
                                            $scope.getapprovalSection();
                                            Swal.close();
                                            if (verifyRes == "1") {
                                               
                                               
                                                Swal.fire({
                                                    icon: "success",
                                                    title: "Verified",
                                                    text: "Aadhaar verified successfully."
                                                });


                                            } else {

                                                Swal.fire({
                                                    icon: "error",
                                                    title: "Verification Failed",
                                                    text: verifyRes.message || "OTP verification failed."
                                                });

                                            }

                                        },
                                        error: function (xhr) {

                                            Swal.fire({
                                                icon: "error",
                                                title: "Error",
                                                text: xhr.responseText || "OTP verification failed."
                                            });

                                        }

                                    });

                                });

                            }
                            else {

                                Swal.fire({
                                    icon: "error",
                                    title: "Verification Failed",
                                    text: (res && res.message) ? res.message : "Unable to send OTP."
                                });

                            }

                        },
                        error: function (xhr) {

                            $("#btnVerifyUIDAI")
                                .prop("disabled", false)
                                .html("Verify");

                            Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: xhr.responseText || "Something went wrong."
                            });

                        }

                    });

                });

            }

        });

    };

    var docName = "";
    $scope.VerifyByEZAI = function () {
          docName = "Aadhaar Card";
        setTimeout(function () {
            $("#docFile").click();
        }, 100);
    };
    $scope.VerifyPAN = function () {
        docName = "PAN Card";
        setTimeout(function () {
            $("#docFile").click();
        }, 100);
    };
    $scope.VerifyUAN = function () {
        docName = "UAN Card";
        setTimeout(function () {
            $("#docFile").click();
        }, 100);
    };
    $scope.VerifyESIC = function () {
        docName = "ESIC Card";
        setTimeout(function () {
            $("#docFile").click();
        }, 100);
    };
    $(document).ready(function () {

        $("#docFile").change(function () {

            var file = this.files[0];

            if (!file)
                return;


            Swal.fire({
                title: 'Live Document Verification',
                html: `
        <div style="margin-top:10px">
            <i class="bi bi-arrow-repeat spin" style="font-size:40px;color:#3085d6;"></i>
            <br><br>
            <b>Please wait...</b><br>
            We're securely verifying your document.
            <br><br>
            <small>This may take a few seconds.</small>
        </div> `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false
            });


            var formData = new FormData();





            var docType = "";

            switch (docName) {
                case "Aadhaar Card":
                    docType = "aadhaar";
                    break;

                case "PAN Card":
                    docType = "pan";
                    break;

                case "UAN Card":
                    docType = "uan";
                    break;

                case "ESIC Card":
                    docType = "esic";
                    break;

                default:
                    Swal.fire('Error', 'Please select a valid document type.', 'error');
                    return;
            }
            formData.append("Name", UserName),
                formData.append("EmpName", $scope.Name),
                formData.append("DocName", docType);
            formData.append("Photo", file);
            $.ajax({
                url: "/worker/SaveDocument",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,

                success: function (res) {

                    if (res.NameMismatch)
                    {

                        Swal.fire({
                            icon: "warning",
                            title: `Hello ${$scope.UserName}`,
                            html: `
                <div style="font-size:15px;line-height:24px"> 
                    ${res.OCRName}<br><br> 
                    Are you sure you uploaded the correct document?
                </div>`,
                            showCancelButton: true,
                            confirmButtonText: "Yes, Continue",
                            cancelButtonText: "Upload Again",
                            confirmButtonColor: "rgb(1,25,56)",
                            cancelButtonColor: "#d33"
                        }).then((result) => {

                            if (result.isConfirmed) {
                                Swal.fire({
                                    title: "Please Wait",
                                    html: `
       <div style="font-size:15px;">
            📄 We are processing your document.
            <br><br>
            This may take a few seconds.
        </div>
    `,
                                    allowOutsideClick: false,
                                    allowEscapeKey: false,
                                    showConfirmButton: false,
                                    showCloseButton: false,
                                    didOpen: () => {
                                        Swal.showLoading();
                                    }
                                });
                                var formData = new FormData();
                                var docType = "";
                                switch (docName) {
                                    case "Aadhaar Card":
                                        docType = "aadhaar";
                                        break;

                                    case "PAN Card":
                                        docType = "pan";
                                        break;

                                    case "UAN Card":
                                        docType = "uan";
                                        break;

                                    case "ESIC Card":
                                        docType = "esic";
                                        break;

                                    default:
                                        Swal.fire('Error', 'Please select a valid document type.', 'error');
                                        return;
                                }

                                formData.append("Name", $scope.UserName),
                                    formData.append("EmpName", $scope.Name),
                                    formData.append("DocName", docType);
                                formData.append("Photo", file);
                                $.ajax({
                                    url: "/worker/AgainSaveDocument",
                                    type: "POST",
                                    data: formData,
                                    processData: false,
                                    contentType: false,

                                    success: function (res) {
                                        Swal.close();
                                        $scope.getapprovalSection();
                                        $scope.showAadhaarOptions = false;
                                        $scope.showPanOptions = false;
                                        $scope.showUanOptions = false;
                                        $scope.showEsicOptions = false;
                                        $scope.showPoliceOptions = false;

                                    }
                                });



                            }

                        });

                        return;
                    }

                    Swal.fire({
                        icon: "success",
                        title: "Document Uploaded Successfully",
                        timer: 1500,
                        showConfirmButton: false
                    });
                    $scope.getapprovalSection();
                    $scope.showAadhaarOptions = false;
                    $scope.showPanOptions = false;
                    $scope.showUanOptions = false;
                    $scope.showEsicOptions = false;
                    $scope.showPoliceOptions = false;
                }
            });



        });

    });
});