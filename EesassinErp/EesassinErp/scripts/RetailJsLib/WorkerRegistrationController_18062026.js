app.WorkerRegistrationController = function ($scope, $element, $filter, myService) {

    $scope.EmployeeEmailID = REmailId;
    $scope.MobileNumber = ContactNo;
    $scope.EmployeeName = Name;


  

    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {

        var collectionobj = {};
        var datenew = "";
        if ($('#txtStartDate').val() == '') {
            datenew = '-1';
        }
        else { datenew = $('#txtStartDate').val(); }
        collectionobj.CreatedOn = datenew;
        collectionobj.Action = 9;
        debugger;
        var getData = myService.methode('POST', ("../RetailSection/GetMaintainLog"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues =
                [
                    { "Activity Date": $("#txtStartDate").text() },
                ];

            var tblheader = [
                { "HeaderText": "Sr.No.", "HeaderValue": "RowId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },

                { "HeaderText": "Employee Code", "HeaderValue": "EmployeeCode", "Width": "120px", "ShowColumn": "Yes" },
                { "HeaderText": "Ref Employee Code", "HeaderValue": "RefEmployeeCode", "Width": "150px", "ShowColumn": "Yes" },
                { "HeaderText": "Employee Name", "HeaderValue": "EmployeeName", "Width": "150px", "ShowColumn": "Yes" },
                { "HeaderText": "Designation", "HeaderValue": "EmployeeDesignation", "Width": "150px", "ShowColumn": "Yes" },
                { "HeaderText": "Department", "HeaderValue": "EmployeeDepartment", "Width": "150px", "ShowColumn": "Yes" },

                { "HeaderText": "Father/Husband Name", "HeaderValue": "Father_Husband_Name", "Width": "180px", "ShowColumn": "Yes" },
                { "HeaderText": "Gender", "HeaderValue": "Gendar", "Width": "100px", "ShowColumn": "Yes" },
                { "HeaderText": "Marital Status", "HeaderValue": "MaritalStatus", "Width": "130px", "ShowColumn": "Yes" },
                { "HeaderText": "Date of Birth", "HeaderValue": "DateOfBirth", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "Present Address", "HeaderValue": "PresentAddress", "Width": "200px", "ShowColumn": "Yes" },
                { "HeaderText": "Permanent Address", "HeaderValue": "PermanemtAddress", "Width": "200px", "ShowColumn": "Yes" },
                { "HeaderText": "Alternate Mobile", "HeaderValue": "AlternativeMobileNumber", "Width": "140px", "ShowColumn": "Yes" },

                { "HeaderText": "Aadhaar Number", "HeaderValue": "AdharCardNumber", "Width": "140px", "ShowColumn": "Yes" },
                { "HeaderText": "PAN Number", "HeaderValue": "PANNumber", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "Mobile Number", "HeaderValue": "MobileNumber", "Width": "130px", "ShowColumn": "Yes" },
                { "HeaderText": "Email ID", "HeaderValue": "EmployeeEmailID", "Width": "180px", "ShowColumn": "Yes" },

                { "HeaderText": "Bank Account No", "HeaderValue": "BankAccountNumber", "Width": "150px", "ShowColumn": "Yes" },
                { "HeaderText": "IFSC Code", "HeaderValue": "BankIFSCCode", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "Previous UAN", "HeaderValue": "PreviousUAN", "Width": "130px", "ShowColumn": "Yes" },
                { "HeaderText": "Gross Salary", "HeaderValue": "GrossSalary", "Width": "120px", "ShowColumn": "Yes" },
                { "HeaderText": "Previous ESI", "HeaderValue": "PreviousESI", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "Date of Joining", "HeaderValue": "DOJ", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "Nominee Name", "HeaderValue": "NomineeName", "Width": "150px", "ShowColumn": "Yes" },
                { "HeaderText": "Nominee Address", "HeaderValue": "NomineeAddress", "Width": "200px", "ShowColumn": "Yes" },
                { "HeaderText": "Nominee Relation", "HeaderValue": "NomineeRelation", "Width": "130px", "ShowColumn": "Yes" },
                { "HeaderText": "Nominee DOB", "HeaderValue": "NomineeDOB", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "State", "HeaderValue": "State", "Width": "120px", "ShowColumn": "Yes" },
                { "HeaderText": "City", "HeaderValue": "City", "Width": "120px", "ShowColumn": "Yes" },

                { "HeaderText": "Created On", "HeaderValue": "CreatedOn", "Width": "160px", "ShowColumn": "Yes" },
                { "HeaderText": "Password", "HeaderValue": "Password", "Width": "100px", "ShowColumn": "Yes" }
            ];
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


    $scope.currentTab = 0;

    $scope.nextTab = function () {

        var tabs = document.querySelectorAll(".workerRegistrationTab");
        var contents = document.querySelectorAll(".workerRegistrationTabContent");

        if ($scope.currentTab < tabs.length - 1) {

            // Current active remove
            tabs[$scope.currentTab].classList.remove("active");
            contents[$scope.currentTab].classList.remove("active");

            // Next tab
            $scope.currentTab++;

            // Active add
            tabs[$scope.currentTab].classList.add("active");
            contents[$scope.currentTab].classList.add("active");
        }
    };

    $scope.SaveEmployee = function () {
      

        // 🔥 SAFE HELPERS
        function safe(val) {
            return (val === undefined || val === null) ? "" : val;
        }

        function safeDate(val) {
            return (val ? new Date(val).toISOString() : "");
        }

        if (isValidateA()) {

            var formData = new FormData();

            // ================= BASIC INFO =================
            formData.append("Id", 0);
            formData.append("RefEmployeeCode", safe($scope.RefEmployeeCode));
            formData.append("PartyTypeId", 4);
            formData.append("PartyId", "0");
            formData.append("UserId", "0");

            formData.append("LeavingDate", safeDate($scope.LeavingDate));
            formData.append("PFAccount", safe($scope.PFAccount));

            formData.append("SuperVisior1", safe($scope.SuperVisior1));
            formData.append("SuperVisior2", safe($scope.SuperVisior2));

            formData.append("EmployeeCode", safe($scope.EmployeeCode));
            formData.append("EmployeeName", safe($scope.EmployeeName));
            formData.append("EmployeeDesignation", safe($scope.EmployeeDesignation));
            formData.append("EmployeeDepartment", safe($scope.EmployeeDepartment));

            formData.append("FatherHusbandName", safe($scope.FatherHusbandName));
            formData.append("Gender", safe($scope.Gender));
            formData.append("MaritalStatus", safe($scope.MaritalStatus));

            formData.append("DateofBirth", safeDate($scope.DateofBirth));

            formData.append("PresentAddress", safe($scope.PresentAddress));
            formData.append("PermanentAddress", safe($scope.PermanentAddress));

            formData.append("AdharCardNumber", safe($scope.AdharCardNumber));
            formData.append("PANNumber", safe($scope.PANNumber));

            formData.append("MobileNumber", safe($scope.MobileNumber));
            formData.append("AlternativeMobileNumber", safe($scope.AlternativeMobileNumber));
            formData.append("EmployeeEmailID", safe($scope.EmployeeEmailID));

            formData.append("BankAccountNumber", safe($scope.BankAccountNumber));
            formData.append("BankIFSCCode", safe($scope.BankIFSCCode));

            formData.append("PreviousUAN", safe($scope.PreviousUAN));
            formData.append("PreviousESI", safe($scope.PreviousESI));

            formData.append("GrossSalary", safe($scope.GrossSalary));

            formData.append("DOJ", safeDate($scope.DOJ));
            formData.append("IssueDate", safeDate($scope.IssueDate));
            formData.append("ValidTill", safeDate($scope.ValidTill));

            formData.append("BloodGroup", safe($scope.BloodGroup));
            formData.append("CampNumber", safe($scope.CampNumber));

            formData.append("State", safe($scope.State));
            formData.append("City", safe($scope.City));
            formData.append("Pincode", safe($scope.Pincode));

            // ================= NOMINEE =================
            formData.append("NameofNominee", safe($scope.NameofNominee));
            formData.append("AddressofNominee", safe($scope.AddressofNominee));
            formData.append("RelationofNominee", safe($scope.RelationofNominee));
            formData.append("DOBofNominee", safeDate($scope.DOBofNominee));

            // ================= SITE / STORE =================
            formData.append("StoreCode", safe($scope.StoreCode));
            formData.append("Status", $scope.IsActive);
            formData.append("SiteId", $scope.SiteId);

            // ================= FILE PATHS =================
            formData.append("PANCardFilePath", safe($scope.PANCardFilePath_Preview));
            formData.append("Cheque_Passbook_FilePath", safe($scope.Cheque_Passbook_FilePath_Preview));
            formData.append("EducationCertificateFilePath", safe($scope.EducationCertificateFilePath_Preview));
            formData.append("ExperienceCertificateFilePath", safe($scope.ExperienceCertificateFilePath_Preview));
            formData.append("AdhaarCard_FrontSide_FilePath", safe($scope.AdhaarCard_FrontSide_FilePath_Preview));
            formData.append("AdhaarCard_BackSide_FilePath", safe($scope.AdhaarCard_BackSide_FilePath_Preview));
            formData.append("RelievingLetterfFilePath", safe($scope.RelievingLetterfFilePath_Preview));
            formData.append("PayslipsFilePath", safe($scope.PayslipsFilePath_Preview));

            formData.append("Photos_1_FilePath", safe($scope.Photos_1_FilePath_Preview));
            formData.append("Photos_2_FilePath", safe($scope.Photos_2_FilePath_Preview));
            formData.append("Photos_3_FilePath", safe($scope.Photos_3_FilePath_Preview));
            formData.append("Photos_4_FilePath", safe($scope.Photos_4_FilePath_Preview));

            formData.append("EmployeePhotos", safe($scope.EmployeePhotos));

            // ================= WAGES =================
            formData.append("MinimumWageCategory", safe($scope.MinimumWageCategory));
            formData.append("WageType", safe($scope.WageType));
            formData.append("WageDisbursementMode", safe($scope.WageDisbursementMode));

            // ================= SAFETY =================
            formData.append("PPE", safe($scope.PPE));
            formData.append("PPEType", safe($scope.PPEType));
            formData.append("SafetyTrainingStatus", safe($scope.SafetyTrainingStatus));
            formData.append("SiteInductionStatus", safe($scope.SiteInductionStatus));
            formData.append("PoliceVerificationStatus", safe($scope.PoliceVerificationStatus));

            // ================= TRANSPORT =================
            formData.append("Transport", safe($scope.Transport));
            formData.append("RouteId", safe($scope.RouteId));

            // ================= MEDICAL =================         
            formData.append("CName", safe($scope.CName));
            formData.append("TypeWork", safe($scope.TypeWork));
            formData.append("Sdate", $("#txtSdate").val());
            formData.append("endate", $("#txtendate").val());
            formData.append("SName", safe($scope.SName));
            formData.append("NatureJob", safe($scope.NatureJob));



            // ================= ACTION =================
            formData.append("ActionType", 18);

            // ================= AJAX CALL =================
            $.ajax({
                url: "../RetailSection/InsertUpdateDelEmployeeMaster",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,

                success: function (response) {

                    var data = (typeof response === "string")
                        ? JSON.parse(response)
                        : response;

                    console.log("SUCCESS RESPONSE:", data);

                    if (data.Result == '1') {
                        showMsgBox(data.Result);
                        window.location.href = "../Dashboard/WorkerDashboard";
                    }
                    else {
                        showMsgBox(data.Result);
                    }
                    

                },

                error: function (xhr, status, error) {
                    console.log("STATUS:", xhr.status);
                    console.log("ERROR:", error);
                    console.log("RESPONSE:", xhr.responseText);
                }
            });
        }
    };

    $scope.DownloadFileC = function (documentPath, fileName) {

        var url = "/RetailSection/DownloadFile?filePath="
            + encodeURIComponent(documentPath)
            + "&fileName="
            + encodeURIComponent(fileName || '');

        var link = document.createElement("a");
        link.href = url;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    $scope.ViewFileC = function (documentPath) {

        var url = "/RetailSection/ViewFile?filePath=" + encodeURIComponent(documentPath);

        window.open(url, '_blank', 'width=900,height=600,scrollbars=yes,resizable=yes');
    };

    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var maxSize = 3 * 1024 * 1024;
            var allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];

            var extension = file.name.split('.').pop().toLowerCase();
            if (allowedExtensions.indexOf(extension) === -1) {
                swal("Invalid File", "Only PDF, PNG, JPG and JPEG files are allowed.", "error");
                input.value = '';
                return;
            }
            if (file.size > maxSize) {
                swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
                input.value = '';
                return;
            }
            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;

            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
    };

    $scope.$watch(function () {

        var fields = document.querySelectorAll(".validateA");
        var total = fields.length;
        var filled = 0;

        angular.forEach(fields, function (field) {
            if (field.value && field.value.trim() !== "") {
                filled++;
            }
        });

        return filled;

    }, function (newValue) {

        var total = document.querySelectorAll(".validateA").length;
        $scope.progress = Math.round((newValue / total) * 100);

    });
    //-=----Worker
    $scope.openCropper = function (input) {
        cropper = new Cropper(document.getElementById("cropImage"), {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: "move",
            autoCrop: true,
            autoCropArea: 0.8,
            movable: true,
            zoomable: true,
            scalable: true,
            cropBoxMovable: true,
            cropBoxResizable: true
        });

        if (input.files && input.files[0]) {

            var reader = new FileReader();

            reader.onload = function (e) {

                var img = document.getElementById('cropImage');
                img.src = e.target.result;

                document.getElementById('cropModal').style.display = 'flex';

                setTimeout(function () {

                    if (cropper) {
                        cropper.destroy();
                    }

                    cropper = new Cropper(img, {
                        aspectRatio: 1,
                        viewMode: 1
                    });

                }, 200);
            };

            reader.readAsDataURL(input.files[0]);
        }
    };






    $scope.cropImageSave = function () {
       
        if (!cropper) {
            alert("Cropper not initialized");
            return;
        }

        var canvas = cropper.getCroppedCanvas({
            width: 200,
            height: 200
        });

        var circleCanvas = document.createElement('canvas');
        var size = 200;

        circleCanvas.width = size;
        circleCanvas.height = size;

        var ctx = circleCanvas.getContext('2d');

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(canvas, 0, 0, size, size);

        var base64 = circleCanvas.toDataURL("image/png");

        $scope.$applyAsync(function () {
            $scope.EmployeePhotos = base64;
            $scope.EmployeePhotos_FileName = "CroppedCircle.png";
        });

        cropper.destroy();
        cropper = null;

        $scope.closeCrop();
    };


    $scope.closeCrop = function () {

        document.getElementById('cropModal').style.display = 'none';

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    };

}