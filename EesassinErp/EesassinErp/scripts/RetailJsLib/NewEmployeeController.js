app.NewEmployeeController = function ($scope, $element, $filter, myService, $http, $timeout) {

    $scope.IsEmailDisabled = false;
    $scope.IsMobileDisabled = false;

    $scope.savejobhistory = false;
    $scope.onload = function () {
        $scope.showLoader();
        var params = new URLSearchParams(window.location.search);
        $scope.WorkerId = params.get("WorkerId");
        $scope.EmployeeCode = params.get("WorkerId");
        $scope.RefWorkerCode = params.get("RefWorkerCode");
        $scope.GetWorkerProfile($scope.WorkerId, $scope.RefWorkerCode);
        $scope.GetJobDetailHistory();
        $scope.hideLoader();
    }

    $scope.rowLimit = 10
    $scope.viewAll = function () {
        $scope.rowLimit = $scope.EmployeeList.length;
    };

    $scope.view10 = function () {
        $scope.rowLimit = 10;
    };
    $scope.IsActive = "";
    $scope.jeditid = 0;
    $scope.PartyTypeId = "";
    $scope.PartyId = "";
    $scope.EmployeeCode = '';
    $scope.RefEmployeeCode = '';
    $scope.EmployeeName = '';
    $scope.EmployeeDesignation = '';
    $scope.EmployeeDepartment = '';
    $scope.FatherHusbandName = '';
    $scope.Gender = '';
    $scope.MaritalStatus = '';
    $scope.DateofBirth = '';
    $scope.PresentAddress = '';
    $scope.PermanentAddress = '';
    $scope.AdharCardNumber = '';
    $scope.PANNumber = '';
    $scope.MobileNumber = '';
    $scope.AlternativeMobileNumber = '';
    $scope.EmployeeEmailID = '';
    $scope.BankAccountNumber = '';
    $scope.BankIFSCCode = '';
    $scope.PreviousUAN = '';
    $scope.PreviousESI = '';
    $scope.GrossSalary = '';
    $scope.DOJ = '';
    $scope.NameofNominee = '';
    $scope.AddressofNominee = '';
    $scope.RelationofNominee = '';
    $scope.DOBofNominee = '';
    $scope.StoreCode = '';
    $scope.EmployeeMasterGrid = true;
    $scope.EmployeeMasterForm = false;
    $scope.EmployeeUploadDocs = true;
    $scope.EmployeeList = [];
    $scope.IsActionType = 0;
    $scope.EditId = 0;
    $scope.UserId = '';
    $scope.SuperVisior1 = '';
    $scope.SuperVisior2 = '';
    $scope.Showworkerdetail = 0; // added new



    $scope.PANCardFilePath = "";
    $scope.Cheque_Passbook_FilePath = "";
    $scope.EducationCertificateFilePath = ""
    $scope.ExperienceCertificateFilePath = ""
    $scope.AdhaarCard_FrontSide_FilePath = ""
    $scope.AdhaarCard_BackSide_FilePath = ""
    $scope.RelievingLetterfFilePath = ""
    $scope.PayslipsFilePath = ""
    $scope.Photos_1_FilePath = ""
    $scope.Photos_2_FilePath = ""
    $scope.Photos_3_FilePath = ""
    $scope.Photos_4_FilePath = ""

    $scope.MinimumWageCategory = "";
    $scope.WageType = "";
    $scope.WageDisbursementMode = "";
    $scope.PPE = "";
    $scope.PPEType = "";
    $scope.SafetyTrainingStatus = "";
    $scope.SiteInductionStatus = "";
    $scope.PoliceVerificationStatus = "";
    $scope.TempIDStatus = "";
    $scope.TempIDNumber = "";
    $scope.TempIDDate = "";
    $scope.PermanentIDStatus = "";
    $scope.PermanentIDNumber = "";
    $scope.PermanentIDDate = "";
    $('#txtTempIDDate').val('');
    $scope.CampNumber = "";




    setTimeout(function () {

        if ($scope.LoginId == 1 && loginType == 1) {
            $("#ddlPartyType").removeAttr("disabled");
            $("#ddlPartyId").removeAttr("disabled");
        }
        else {
            $scope.PartyTypeId = '4';
            $("#ddlPartyType").attr("disabled", "disabled");
            $("#ddlPartyId").attr("disabled", "disabled");
            $scope.AllPartySiteLoad('4');
            $scope.PartyId = MapId;
            $scope.AllUserListsLoad(MapId);
        }
    }, 100);

    $scope.BindGenderList = function () {
        var genderList = [
            { "Gender_Type": "Male", "Id": "1" },
            { "Gender_Type": "Female", "Id": "2" },
        ];
        $scope.AllGenderList = genderList;
    }
    $scope.BindMaritalStatusList = function () {
        var MaritalList = [
            { "Marital_Status": "Married", "Id": "1" },
            { "Marital_Status": "UnMarried", "Id": "2" },
        ];
        $scope.AllMaritalStatusList = MaritalList;
    }
    $scope.GenerateEmployeeCode = function () {
        var collectionobj = {};
        collectionobj.PartyTypeId = 0;
        var getData = myService.methode('POST', "../RetailSection/GenerateEmployeeCode", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.EmployeeCode = response.data.Result[0].Column1;
            $scope.isDisabled = true;
        });
    }

    //-------------------------------------Bulk Employeee



    $scope.IcardDetail = function (Detail) {



        function convertToDate(dateStr) {
            if (!dateStr) return null;

            dateStr = dateStr.replace('AM', '').replace('PM', '').trim();

            var parts = dateStr.split('/');

            if (parts.length === 3) {
                var day = parseInt(parts[0], 10);
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);

                var d = new Date(year, month, day);

                if (isNaN(d)) {
                    console.log("Invalid Date:", dateStr);
                    return null;
                }

                return d;
            }

            var d = new Date(dateStr);
            if (isNaN(d)) {
                console.log("Invalid Date:", dateStr);
                return null;
            }

            return d;
        }

        $scope.EmployeePhotos = Detail.EmployeePhotos;
        $scope.EmpName = Detail.EmployeeName;
        $scope.EmpCode = Detail.EmployeeCode;
        $scope.EmpDep = Detail.EmployeeDepartment;
        $scope.EmpDesignation = Detail.EmployeeDesignation;
        $scope.EmpMobile = Detail.MobileNumber;
        $scope.altempmobile = Detail.AlternativeMobileNumber;

        $scope.RouteId = Detail.RouteId;
        $scope.ClientName = Detail.ClientName;
        $scope.AssignColor = Detail.AssignColor;
        $scope.backgroundcolor = Detail.backgroundcolor;
        $scope.BloodGroup = Detail.BloodGroup;
        $scope.CampNumber = Detail.CampNumber;
        $scope.IssueDate = Detail.CreatedOn;
        $scope.ValidTill = Detail.ValidTill;

        $scope.BusNo = Detail.BusNo;


        $scope.PreviousESI = Detail.PreviousESI;
        $scope.PreviousUAN = Detail.PreviousUAN;
        $scope.Location = Detail.LocationCode;
        $scope.VendorName = Detail.VendorName;
        $scope.ClientEmailId = Detail.ClientEmailId;
        $scope.ClientMobileNo = Detail.ClientMobileNo;
        $scope.RouteName = Detail.RouteName;
        var site = $scope.SiteList.find(function (x) {
            return x.SiteCode == Detail.Site;
        });

        $scope.SiteName = site ? site.SiteName : '';
    };


    $scope.getQrUrl = function () {

        if ($scope.EmployeeList && $scope.EmployeeList.Id) {
            return '/Api/QrBridge/qr/workers/' + $scope.EmployeeList.Id + '/card/?fmt=qr&t=' + Date.now();
        }
        if (!$scope.EmpCode) return "";
        return '/Api/QrBridge/qr/my-card/?fmt=qr&t=' + Date.now();
    };

    $scope.printIDCard = function () {

        var printContents = document.getElementById("printArea").outerHTML;

        var popupWin = window.open('', '_blank');

        popupWin.document.open();

        popupWin.document.write(`
        <html>
        <head>
            <title>Print ID Card</title>
 <link rel="stylesheet"
              href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<style>

    html,
    body {
        margin: 0;
        padding: 0;
        background: #fff;
        font-family: 'Segoe UI', sans-serif;
    }

    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    @page {
        size: 85.6mm 53.98mm landscape;
        margin: 0;
    }

    #printArea {
        margin: 0;
        padding: 0;
    }

    #printArea > div {
        display: flex;
        flex-direction: column;
        gap: 0;
        align-items: center;
    }

</style>

 

        </head>

        <body>

            ${printContents}

        </body>
        </html>
    `);

        popupWin.document.close();

        setTimeout(function () {
            popupWin.focus();
            popupWin.print();
            popupWin.close();
        }, 800);
    };



    var cropper = null;
    $scope.OpenRoute = false;
    $scope.openRoutetransport = function () {
        if ($scope.Transport == 'Yes') {
            $scope.OpenRoute = true;
        }
        else { $scope.OpenRoute = false; }

    }
    $scope.GetTransport = function () {

        var collectionobj = {
            Action: 6,
            UserId: MapId
        };

        myService.methode('POST', "../RetailSection/SearchRoute", JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.TransportList = response.data.Result || [];
            });
    };

    $scope.openCropper = function (input) {

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


    $scope.openCropper1 = function (input) {
        cropper = new Cropper(document.getElementById("cropImage1"), {
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

                var img = document.getElementById('cropImage1');
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

    $scope.cropImageSave1 = function () {

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


    $scope.closeCrop1 = function () {

        document.getElementById('cropModal').style.display = 'none';

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    };

    $scope.BindSiteList = function () {
        var collectionobj = {};
        collectionobj.Action = 34;
        collectionobj.LoginId = MapId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SiteList = response.data.Result;
        });
    }
    $scope.BindLocation = function () {
        var collectionobj = {};
        collectionobj.Action = 50;
        collectionobj.LoginId = MapId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Sitelocation = response.data.Result;
        });
    }

    $scope.jobList = [];

    // Page load par ek default block already dikhe
    $scope.jobList.push({
        SiteId: "",
        SiteLocation: "",
        SiteState: "",
        Sdate: "",
        endate: "",
        NatureJob: "",
        TypeWork: "",
        LocationList: []
    });

    $scope.addMore = function () {
        $scope.jobList.push({
            SiteId: "",
            SiteLocation: "",
            SiteState: "",
            Sdate: "",
            endate: "",
            NatureJob: "",
            TypeWork: "",
            LocationList: []
        });
    };

    $scope.removeRow = function (index) {
        $scope.jobList.splice(index, 1);
    };

    $scope.saveAllRecords = function () {
        if ($scope.jobList.length === 0) {
            showMsgBox('999', 'Alert', 'Please Add atleast one Record', 'warning', 'btn-warning');
            return;
        }
        var collectionobj = $scope.jobList.map(function (item) {
            return {
                Id: item.Id || 0,
                LoginId: LoginId,
                Site: item.SiteId,
                Sitelocation: item.SiteLocation,
                State: item.SiteState,
                FromDate: item.Sdate,
                ToDate: item.endate,
                NatureofJob: item.NatureJob,
                Typeofwork: item.TypeWork
            };
        });
        var getData = myService.methode('POST', "../RetailSection/SavePreviousEmploymenthostory", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            //showMsgBox(response.data.Result);
            $scope.SuperVisior1 = response.data.Result;
        }).catch(function (error) {
            //showMsgBox('999', 'Error', 'Error saving records!', 'danger', 'btn-danger');
            //console.log(error);
        });
    };

    $scope.saveAllRecords = function () {
        if ($scope.jobList.length === 0) {
            showMsgBox('999', 'Alert', 'Please Add atleast one Record', 'warning', 'btn-warning');
            return;
        }
        var collectionobj = $scope.jobList;
        var Action = 1; // 1 = Insert, 2 = Update, etc.

        var requestData = {
            obj: collectionobj,
            Action: Action
        };

        var getData = myService.methode('POST', "../RetailSection/SavePreviousEmploymenthostory", JSON.stringify(requestData));
        getData.then(function (response) {
            showMsgBox(response.data.Result);
        }).catch(function (error) {
            showMsgBox('999', 'Error', 'Error saving records!', 'danger', 'btn-danger');
            console.log(error);
        });
    };

    function isValidDate(dateStr) {
        var parts = dateStr.split('/');

        if (parts.length !== 3) return false;

        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1;
        var year = parseInt(parts[2], 10);

        var date = new Date(year, month, day);

        return date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day;
    }

    $scope.EmployeeeMasterList = [];

    $scope.DisplayExcel = function () {

        function validateRow(obj, rowIndex) {

            let errors = [];

            function isEmpty(val) {
                return !val || val.toString().trim() === "";
            }

            const validRoutes = ($scope.TransportList || [])
                .map(x => (x.RouteID || ""));

            const validSite = ($scope.SiteList || [])
                .map(x => (x.SiteCode || ""));
            if (isEmpty(obj.RefEmployeeCode)) errors.push("Ref Worker Code");
            if (isEmpty(obj.EmployeeName)) errors.push("Worker Name");
            if (isEmpty(obj.SiteName)) errors.push("Site Code/Name");
            if (isEmpty(obj.EmployeeDesignation)) errors.push("Designation");
            if (isEmpty(obj.Father_Husband_Name)) errors.push("Father/Husband Name");
            if (isEmpty(obj.MaritalStatus)) errors.push("Marital Status");
            /*if (isEmpty(obj.DateofBirth)) errors.push("DOB");*/
            if (isEmpty(obj.DateofBirth) || isNaN(new Date(obj.DateofBirth).getTime())) {
                errors.push("Invalid DOB");
            }
            if (isEmpty(obj.DOJ) || isNaN(new Date(obj.DOJ).getTime())) {
                errors.push("Invalid DOJ");
            }
            if (isEmpty(obj.Status)) errors.push("Status");
            /*if (isEmpty(obj.MobileNumber)) rowErrors.push("Mobile Number"); old validation */
            if (String(obj.MobileNumber || '').replace(/\s/g, '').length !== 10) {
                errors.push("Mobile Number must be 10 digits only");
            }
            if (obj.AdharCardNumber && !/^\d{12}$/.test(String(obj.AdharCardNumber).replace(/\s/g, ''))) {
                errors.push("Aadhar No must be 12 digits only");
            }
            if (obj.AlternativeMobileNumber && !/^\d{10}$/.test(String(obj.AlternativeMobileNumber).replace(/\s/g, ''))) {
                errors.push("Alternate Mobile Number must be 10 digits only.");
            }
            if (obj.PreviousUAN && !/^\d{12}$/.test(String(obj.PreviousUAN).replace(/\s/g, ''))) {
                errors.push("UAN No must be 12 digits only");
            }
            if (obj.BankAccountNumber && !/^\d+$/.test(String(obj.BankAccountNumber).replace(/\s/g, ''))) {
                errors.push("Bank Account No must contain numbers only");
            }
            if (obj.NomineeDOB && !isValidDate(obj.NomineeDOB)) {
                errors.push("Invalid Nominee DOB");
            }
            if (obj.TempIDDate && isNaN(new Date(obj.TempIDDate).getTime())) {
                errors.push("Invalid Temporary Gate Pass Date");
            }
            if (obj.PermanentIDDate && isNaN(new Date(obj.PermanentIDDate).getTime())) {
                errors.push("Invalid Permanent Gate Pass Date");
            }
            if (obj.IssueDate && !isValidDate(obj.IssueDate)) {
                errors.push("Invalid I Card Issue Date");
            }
            //if (obj.ValidTill && isNaN(new Date(obj.ValidTill).getTime())) {
            //    errors.push("Invalid I Card Valid Till");
            //}
            if (obj.ValidTill && !isValidDate(obj.ValidTill)) {
                errors.push("Invalid I Card Valid Till");
            }
            if (obj.Trannerdate && !isValidDate(obj.Trannerdate)) {
                errors.push("Invalid Training Date");
            }
            if (obj.NextMedicalDue && !isValidDate(obj.NextMedicalDue)) {
                errors.push("Invalid Next Medical Due Date");
            }
            if (isEmpty(obj.EmployeeEmailID)) errors.push("Email ID");
            if (isEmpty(obj.Gendar)) errors.push("Gender");
            if (isEmpty(obj.IssueDate)) errors.push("I Card Issue Date");
            if (isEmpty(obj.ValidTill)) errors.push("I Card Valid Till Date");
            if (isEmpty(obj.BloodGroup)) errors.push("Blood Group");
            if (isEmpty(obj.State)) errors.push("State");
            if (isEmpty(obj.City)) errors.push("City");
            if (isEmpty(obj.Pincode)) errors.push("Pin Code");
            if (isEmpty(obj.EmployeeDepartment)) errors.push("Department");
            if (isEmpty(obj.PermanemtAddress)) errors.push("Permanent Address");// Permanent Address
            if (isEmpty(obj.PState)) errors.push("Permanent State");// state
            if (isEmpty(obj.PCity)) errors.push("Permanent City");// city
            if (isEmpty(obj.PPincode)) errors.push("Permanent Pincode");// pincode

            if (obj.PPE === "Yes" && isEmpty(obj.PPEType)) {
                errors.push("PPE Type required");
            }
            const validRoutesLower = validRoutes.map(x => x.toLowerCase().trim());

            if (!isEmpty(obj.RouteName)) {
                let route = obj.RouteName.toLowerCase().trim();

                if (!validRoutesLower.includes(route)) {
                    errors.push(`Invalid RouteName: "${obj.RouteName}"`);
                }
            }



            const validSiteLower = validSite.map(x => (x || '').toString().toLowerCase().trim());

            if (!isEmpty(obj.SiteName)) {
                let Sitenames = obj.SiteName.toString().toLowerCase().trim();

                if (!validSiteLower.includes(Sitenames)) {
                    errors.push(`Invalid Site : "${obj.SiteName}"`);
                }
            }

            return errors;
        }

        $scope.showLoader();
        $scope.EmployeeeMasterList = [];

        var fileUploader = $('#input-excel');

        if (!fileUploader[0].files.length) {
            alert("Please select file");
            $scope.hideLoader();
            return;
        }

        var reader = new FileReader();
        reader.readAsArrayBuffer(fileUploader[0].files[0]);

        reader.onload = function (e) {

            var data = new Uint8Array(e.target.result);
            var wb = XLSX.read(data, { type: 'array' });

            var htmlstr = XLSX.write(wb, {
                sheet: "Sheet1",
                type: 'binary',
                bookType: 'html'
            });

            $('#wrapper').html(htmlstr).removeClass('d-none');

            var table = $('#wrapper').find('table');
            table.addClass('table table-bordered');

            $("tr:first-child td").each(function () {
                $(this).replaceWith('<th>' + $(this).text() + '</th>');
            });

            setTimeout(function () {

                var tr = table.find('tr');
                var errorsList = [];

                $.each(tr, function (index) {

                    var td = $(this).find('td');
                    if (td.length == 0) return;

                    var blank = true;

                    td.each(function () {
                        if ($(this).text().trim() !== "") {
                            blank = false;
                            return false;
                        }
                    });

                    if (blank) return;

                    var obj = {};

                    obj.RefEmployeeCode = $(td[0]).text().trim();
                    obj.EmployeeName = $(td[1]).text().trim();
                    obj.SiteName = $(td[2]).text().trim();
                    obj.EmployeeDesignation = $(td[3]).text().trim();
                    obj.EmployeeDepartment = $(td[4]).text().trim();
                    obj.Father_Husband_Name = $(td[5]).text().trim();
                    obj.Gendar = $(td[6]).text().trim();
                    obj.MaritalStatus = $(td[7]).text().trim();
                    obj.DateofBirth = $(td[8]).text().trim();
                    obj.DOJ = $(td[9]).text().trim();
                    obj.Status = $(td[10]).text().trim();
                    obj.PresentAddress = $(td[11]).text().trim();
                    obj.PermanemtAddress = $(td[12]).text().trim();
                    obj.MobileNumber = $(td[13]).text().trim();
                    obj.AlternativeMobileNumber = $(td[14]).text().trim();
                    obj.EmployeeEmailID = $(td[15]).text().trim();
                    obj.PANNumber = $(td[16]).text().trim();
                    obj.AdharCardNumber = $(td[17]).text().trim();
                    obj.PreviousUAN = $(td[18]).text().trim();
                    obj.PFAccount = $(td[19]).text().trim();
                    obj.BankAccountNumber = $(td[20]).text().trim();
                    obj.BankIFSCCode = $(td[21]).text().trim();
                    obj.PreviousESI = $(td[22]).text().trim();
                    obj.GrossSalary = $(td[23]).text().trim();
                    obj.NomineeName = $(td[24]).text().trim();
                    obj.NomineeRelation = $(td[25]).text().trim();
                    obj.NomineeDOB = $(td[26]).text().trim();
                    obj.NomineeAddress = $(td[27]).text().trim();
                    obj.MinimumWageCategory = $(td[28]).text().trim();
                    obj.WageType = $(td[29]).text().trim();
                    obj.WageDisbursementMode = $(td[30]).text().trim();
                    obj.PPE = $(td[31]).text().trim();
                    obj.PPEType = $(td[32]).text().trim();
                    obj.SafetyTrainingStatus = $(td[33]).text().trim();
                    obj.SiteInductionStatus = $(td[34]).text().trim();
                    obj.PoliceVerificationStatus = $(td[35]).text().trim();
                    obj.TempIDStatus = $(td[36]).text().trim();
                    obj.TempIDNumber = $(td[37]).text().trim();
                    obj.TempIDDate = $(td[38]).text().trim();
                    obj.PermanentIDStatus = $(td[39]).text().trim();
                    obj.PermanentIDNumber = $(td[40]).text().trim();
                    obj.PermanentIDDate = $(td[41]).text().trim();
                    /*obj.RouteId = $(td[42]).text().trim();*/
                    obj.IssueDate = $(td[42]).text().trim();
                    obj.ValidTill = $(td[43]).text().trim();
                    obj.BloodGroup = $(td[44]).text().trim();
                    obj.CampNumber = $(td[45]).text().trim();
                    obj.State = $(td[46]).text().trim();
                    obj.City = $(td[47]).text().trim();
                    obj.Pincode = $(td[48]).text().trim();
                    // here is add new column

                    obj.TrannerName = $(td[49]).text().trim();
                    obj.Trannerdate = $(td[50]).text().trim();
                    obj.MedicalExamination = $(td[51]).text().trim();
                    obj.FitnessTypes = $(td[52]).text().trim();
                    obj.NextMedicalDue = $(td[53]).text().trim();
                    obj.PState = $(td[54]).text().trim();
                    obj.PCity = $(td[55]).text().trim();
                    obj.PPincode = $(td[56]).text().trim();

                    obj.AllowTransport = $(td[57]).text().trim();
                    obj.RouteId = $(td[58]).text().trim();

                    let rowErrors = validateRow(obj, index + 1);

                    if (rowErrors.length > 0) {
                        $('#input-excel').val('');
                        errorsList.push(
                            `Row ${index + 1}: ${rowErrors.join(", ")}`
                        );
                    } else {
                        $scope.EmployeeeMasterList.push(obj);
                    }

                });

                if (errorsList.length > 0) {
                    showMsgBox(
                        '999',
                        'Validation Error',
                        errorsList.join('<br/>'),
                        'error',
                        'btn-danger'
                    );

                    $('#wrapper').html('');
                    $scope.EmployeeeMasterList = [];
                }
                else {
                    $scope.btnValiadte = true;
                    $scope.disableValiadte = false;
                }

                $scope.$applyAsync();
                $scope.hideLoader();

            }, 1000);
        };
    };



    $scope.ValidateEmployeeList = function () {

        let errorsList = [];

        const validRoutes = ($scope.TransportList || [])
            .map(x => (x.RouteID || "").toLowerCase().trim());


        const validSite = ($scope.SiteList || [])
            .map(x => (x.SiteCode || ""));


        function isEmpty(val) {
            return !val || val.toString().trim() === "";
        }

        angular.forEach($scope.EmployeeeMasterList, function (obj, index) {

            let rowErrors = [];

            if (isEmpty(obj.RefEmployeeCode)) rowErrors.push("Ref Worker Code");
            if (isEmpty(obj.EmployeeName)) rowErrors.push("Worker Name");
            if (isEmpty(obj.SiteName)) rowErrors.push("Site Code/Name");
            if (isEmpty(obj.EmployeeDesignation)) rowErrors.push("Designation");
            if (isEmpty(obj.EmployeeDepartment)) rowErrors.push("Department");// department
            if (isEmpty(obj.Father_Husband_Name)) rowErrors.push("Father/Husband Name");
            //if (isEmpty(obj.Gendar)) rowErrors.push("Gender"); // gender
            if (isEmpty(obj.MaritalStatus)) rowErrors.push("Marital Status");
            if (isEmpty(obj.DateofBirth)) rowErrors.push("DOB");
            if (isEmpty(obj.DOJ)) rowErrors.push("DOJ");
            if (isEmpty(obj.Status)) rowErrors.push("Status");
            /*if (isEmpty(obj.MobileNumber)) rowErrors.push("Mobile Number"); old validation */
            console.log("MobileNumber:", obj.MobileNumber);
            console.log("Length:", String(obj.MobileNumber || '').replace(/\s/g, '').length);

            if (String(obj.MobileNumber || '').replace(/\s/g, '').length !== 10) {
                rowErrors.push("Mobile Number must be 10 digits");
            }
            if (isEmpty(obj.IssueDate)) rowErrors.push("I card issue date");// I card issue date
            if (isEmpty(obj.ValidTill)) rowErrors.push("I card valid till");// i card valid till
            if (isEmpty(obj.BloodGroup)) rowErrors.push("Blood Group");// Blood Group
            if (isEmpty(obj.PresentAddress)) rowErrors.push("Present Address");// Present Address
            if (isEmpty(obj.State)) rowErrors.push("State");//  State
            if (isEmpty(obj.City)) rowErrors.push("City");// city
            if (isEmpty(obj.Pincode)) rowErrors.push("Pincode");// pincode
            if (isEmpty(obj.PermanemtAddress)) rowErrors.push("Permanent Address");// Permanent Address

            if (isEmpty(obj.PState)) rowErrors.push("Permanent State");// state
            if (isEmpty(obj.PCity)) rowErrors.push("Permanent City");// city
            if (isEmpty(obj.PPincode)) rowErrors.push("Permanent Pincode");// pincode
            if (isEmpty(obj.EmployeeEmailID)) rowErrors.push("Email ID");

            if (obj.PPE === "Yes" && isEmpty(obj.PPEType))
                rowErrors.push("PPE Type required");


            const validRoutesLower = validRoutes.map(x => x.toLowerCase().trim());

            if (!isEmpty(obj.RouteName)) {
                let route = obj.RouteName.toLowerCase().trim();

                if (!validRoutesLower.includes(route)) {
                    rowErrors.push(`Invalid RouteId: "${obj.RouteId}"`);
                }
            }



            const validSiteLower = validSite.map(x => (x || '').toString().toLowerCase().trim());

            if (!isEmpty(obj.SiteName)) {
                let Sitenames = obj.SiteName.toString().toLowerCase().trim();

                if (!validSiteLower.includes(Sitenames)) {
                    rowErrors.push(`Invalid Site : "${obj.SiteName}"`);
                }
            }



            if (rowErrors.length > 0) {
                errorsList.push(
                    `Row ${index + 1}: ${rowErrors.join(", ")}`
                );
            }
        });

        if (errorsList.length > 0) {
            showMsgBox(
                '999',
                'Validation Error',
                errorsList.join('<br/>'),
                'error',
                'btn-danger'
            );
            return false;
        }

        return true;
    };





    $scope.SaveRecord = function () {
        if (!$scope.EmployeeeMasterList || $scope.EmployeeeMasterList.length === 0) {
            showMsgBox('999', 'Alert', 'Please Select valid file', 'warning', 'btn-warning');
            return;
        }
        if (!$scope.ValidateEmployeeList()) {
            return;
        }
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.EmployeeMaster = $scope.EmployeeeMasterList;
        collectionobj.ActionType = 17;
        collectionobj.PartyTypeId = $scope.PartyTypeId;
        collectionobj.PartyId = MapId
        collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../RetailSection/NewIUDBulkEmployeee", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            showMsgBox('999', 'Alert', 'Save Successfully', 'warning', 'btn-warning');

            $scope.GetEmployeeMaster();

            $('#tab1-tab').click();
        });
    }
    ////-------------------------------------end bulk

    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [
            { "Module_Type": "Auditor", "Id": "3" },
            { "Module_Type": "Client", "Id": "4" },
        ];
        $scope.AllModuleTypeList = moduleTypeLst;
        $scope.PartyTypeId = '4';
        $scope.AllPartySiteLoad('4');
    }



    $scope.AllPartySiteLoad = function (PartyTypeId) {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        $scope.PartyTypeId = PartyTypeId;
        if (PartyTypeId == '3') {
            $scope.PartyType = 'Auditor';
        }
        else if (PartyTypeId == '4') {
            $scope.PartyType = 'Client';
        }
        else {
            $scope.PartyType = '';
        }
        collectionobj.PartyType = $scope.PartyType;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.AllPartyList = response.data.Result;
        });
    }

    $scope.AllUserListsLoad = function (PartyId) {
        var collectionobj = {};
        $scope.PartyId = PartyId;
        collectionobj.ActionType = 6;
        collectionobj.Id = PartyId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllUserList = response.data.Result;
        });
    }

    $scope.BindSuperVisior1 = function (PartyId) {
        var collectionobj = {};
        collectionobj.ActionType = 7;
        collectionobj.Id = $scope.PartyId;
        collectionobj.Supervisior2 = $scope.Supervisior2;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SuperVisiorList1 = response.data.Result;
        });
    }
    $scope.BindSuperVisior2 = function (SuperVisior1) {
        var collectionobj = {};
        collectionobj.ActionType = 8;
        collectionobj.Id = $scope.PartyId;
        collectionobj.Supervisior1 = SuperVisior1;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SuperVisiorList2 = response.data.Result;
        });
    }
    $scope.BindAllStoreList = function () {
        var collectionobj = {};
        collectionobj.Id = LoginId;
        collectionobj.ActionType = 17;
        var getData = myService.methode('POST', "../Retail/GetStore", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllStoreList = response.data.Result;
        });
    }

    $scope.BindEmpComplianceDoc = function (EmpCode) {
        var collectionobj = {};
        collectionobj.Id = MapId;
        collectionobj.ActionType = 18;
        collectionobj.UserId = EmpCode;
        var getData = myService.methode('POST', "../Retail/GetStore", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllempComplianceDocList = response.data.Result;
            var data = response.data.Result;

            angular.forEach($scope.AllempComplianceDocList, function (item) {

                item.Progress = getProgressValue(item.DocumentStatus);
            });
            $scope.GroupDocs(data);
        });
    }
    $scope.GroupDocs = function (data) {

        var map = {};

        angular.forEach(data, function (item) {

            if (!map[item.DocumentId]) {
                map[item.DocumentId] = {
                    DocumentId: item.DocumentId,
                    DocumentName: item.DocumentName,
                    Files: []
                };
            }


            if (item.Filepath) {
                map[item.DocumentId].Files.push({
                    Filepath: item.Filepath,
                    Uploaded: item.Uploaded,
                    Createdon: item.Createdon
                });
            }
        });

        $scope.groupedDocs = Object.values(map);
    };
    $scope.SelectedPartyName = "";

    $scope.filterByParty = function (partyName) {

        if (partyName === 'ALL') {

            $scope.SelectedPartyName = '';
            $scope.FilteredList = angular.copy($scope.MainList);
        }
        else {
            $scope.SelectedPartyName = partyName;

            $scope.FilteredList = $scope.MainList.filter(function (item) {
                return item.PartyName === partyName;
            });
        }
    };
    $scope.GetEmployeeMaster = function () {
        $scope.showLoader();
        var collectionobj = {
            ActionType: 4,
            PartyId: LoginId
        };

        myService.methode('POST', "../RetailSection/GetEmployeeMaster", JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.EmployeeList = response.data.Result || [];
                $scope.TotalWorker = response.data.Result.length;
                $scope.ActiveWorker = response.data.Result.filter(function (worker) {
                    return worker.IsActive == 1;
                }).length;
                $scope.InactiveWorker = response.data.Result.filter(function (worker) {
                    return worker.IsActive == 0;
                }).length;
                $scope.PartyList = [];
                let unique = {};
                angular.forEach($scope.EmployeeList, function (item) {
                    if (item.PartyName && !unique[item.PartyName]) {
                        unique[item.PartyName] = true;
                        $scope.PartyList.push({ PartyName: item.PartyName });
                    }
                });
                $scope.hideLoader();
            });

    };

    $scope.act = 1;

   $scope.ShowDivEmployeeMasterGrid = function () {
        $scope.IsActionType = 1;
        if (isValidate()) {
            $scope.SaveEmployee();
        }
    };


    $scope.ResetEmployee = function () {
        debugger;


        $scope.EditId = 0;
        $scope.RefEmployeeCode = '';
        $scope.PFAccount = '';
        $scope.SuperVisior1 = '';
        $scope.SuperVisior2 = '';
        $scope.EmployeeCode = '';
        $scope.EmployeeName = '';
        $scope.EmployeeDesignation = '';
        $scope.EmployeeDepartment = '';
        $scope.FatherHusbandName = '';
        $scope.Gender = '';
        $scope.MaritalStatus = '';
        $scope.Transport = '';
        $scope.RouteId = '';

        $scope.DateofBirth = null;
        $scope.DOJ = null;
        $scope.DOBofNominee = null;
        $scope.LeavingDate = null;
        $scope.IssueDate = null;
        $scope.ValidTill = null;
        $scope.BloodGroup = '';
        $scope.CampNumber = '';

        $scope.PresentAddress = '';
        $scope.PermanentAddress = '';
        $scope.AdharCardNumber = '';
        $scope.PANNumber = '';
        $scope.MobileNumber = '';
        $scope.AlternativeMobileNumber = '';
        $scope.EmployeeEmailID = '';


        $scope.BankAccountNumber = '';
        $scope.BankIFSCCode = '';


        $scope.PreviousUAN = '';
        $scope.PreviousESI = '';
        $scope.GrossSalary = '';
        $scope.StoreCode = '';
        $scope.IsActive = 1;


        $scope.NameofNominee = '';
        $scope.AddressofNominee = '';
        $scope.RelationofNominee = '';
        $scope.SiteId = '';

        $scope.PANCardFilePath_Preview = '';
        $scope.Cheque_Passbook_FilePath_Preview = '';
        $scope.EducationCertificateFilePath_Preview = '';
        $scope.ExperienceCertificateFilePath_Preview = '';
        $scope.AdhaarCard_FrontSide_FilePath_Preview = '';
        $scope.AdhaarCard_BackSide_FilePath_Preview = '';
        $scope.RelievingLetterfFilePath_Preview = '';
        $scope.PayslipsFilePath_Preview = '';
        $scope.Photos_1_FilePath_Preview = '';
        $scope.Photos_2_FilePath_Preview = '';
        $scope.Photos_3_FilePath_Preview = '';
        $scope.Photos_4_FilePath_Preview = '';
        $scope.MedicalCertificateFilePath_Preview = '';
        $scope.EmployeePhotos = '';
        $scope.MinimumWageCategory = '';
        $scope.WageType = '';
        $scope.WageDisbursementMode = '';


        $scope.PPE = '';
        $scope.PPEType = '';
        $scope.SafetyTrainingStatus = '';
        $scope.SiteInductionStatus = '';
        $scope.PoliceVerificationStatus = '';


        $scope.TempIDStatus = '';
        $scope.TempIDNumber = '';
        $scope.TempIDDate = '';


        $scope.PermanentIDStatus = '';
        $scope.PermanentIDNumber = '';
        $scope.PermanentIDDate = '';


        $('#txtTempIDDate').val('');
        $('#PermanentIDDate').val('');


        $('input[type="file"]').val(null);


        $scope.IsActionType = 1;
        $scope.act = 1;
    };

    $scope.SaveEmployee = function () {
        //if ($scope.Transport === 'Yes') {

        //    if (!$scope.RouteId || $scope.RouteId === '') {
        //        showMsgBox('999', 'Alert', 'Please Select Route', 'warning', 'btn-warning');
        //        return;
        //    }

        //} else {
        //    $scope.RouteId = '';
        //}
        var _isFileValid = true;
        if ($scope.EditId == 0) {
            _isFileValid = IsFileValidation();
        }
        if (_isFileValid) {
            var formData = new FormData();
            formData.append("Id", $scope.EditId);
            formData.append("RefEmployeeCode", $scope.RefEmployeeCode);
            formData.append("PartyTypeId", 4);
            formData.append("PartyId", MapId);
            formData.append("UserId", LoginId);
            formData.append("WorkerGrade", $scope.WorkerGrade);
            formData.append("Religion", $scope.Religion);
            formData.append("Caste", $scope.Caste);
            formData.append("LeavingDate", ($scope.LeavingDate && $scope.LeavingDate !== "" ? new Date($scope.LeavingDate).toISOString() : ""));
            formData.append("PFAccount", $scope.PFAccount);
            formData.append("SuperVisior1", $scope.SuperVisior1);
            formData.append("SuperVisior2", $scope.SuperVisior2);
            formData.append("EmployeeCode", $scope.EmployeeCode);
            formData.append("EmployeeName", $scope.EmployeeName);
            formData.append("EmployeeDesignation", $scope.EmployeeDesignation);
            formData.append("EmployeeDepartment", $scope.EmployeeDepartment);
            formData.append("FatherHusbandName", $scope.FatherHusbandName);
            formData.append("Gender", $scope.Gender);
            formData.append("MaritalStatus", $scope.MaritalStatus);
            formData.append("DateofBirth", $scope.DateofBirth.toISOString());
            formData.append("PresentAddress", $scope.PresentAddress);
            formData.append("PermanentAddress", $scope.PermanentAddress);
            formData.append("AdharCardNumber", $scope.AdharCardNumber);
            formData.append("PANNumber", $scope.PANNumber);
            formData.append("MobileNumber", $scope.MobileNumber);
            formData.append("AlternativeMobileNumber", $scope.AlternativeMobileNumber);
            formData.append("EmployeeEmailID", $scope.EmployeeEmailID);
            formData.append("BankAccountNumber", $scope.BankAccountNumber);
            formData.append("AcHolderName", $scope.acholdername); //new
            formData.append("BankIFSCCode", $scope.BankIFSCCode);
            formData.append("PreviousUAN", $scope.PreviousUAN);
            formData.append("PreviousESI", $scope.PreviousESI);
            formData.append("GrossSalary", $scope.GrossSalary);
            formData.append("DOJ", ($scope.DOJ && $scope.DOJ !== "" ? new Date($scope.DOJ).toISOString() : ""));
            formData.append("IssueDate", ($scope.IssueDate && $scope.IssueDate !== "" ? new Date($scope.IssueDate).toISOString() : ""));
            formData.append("ValidTill", ($scope.ValidTill && $scope.ValidTill !== "" ? new Date($scope.ValidTill).toISOString() : ""));
            formData.append("BloodGroup", $scope.BloodGroup);
            formData.append("CampNumber", $scope.CampNumber);
            formData.append("State", $scope.State);
            formData.append("City", $scope.City);
            formData.append("Pincode", $scope.Pincode);
            // here is new code 
            formData.append("PState", $scope.PState);
            formData.append("PCity", $scope.PCity);
            formData.append("PPincode", $scope.PPincode);
            formData.append("Trannerdate", $('#txttrainingdt').val());
            formData.append("TrannerName", $scope.TrannerName);

            // here is end new code 
            formData.append("NomineeEmeail", $scope.NomineeEmeail); //new
            formData.append("NomineeMobile", $scope.NomineeMobile);//new
            formData.append("NomineePan", $scope.NomineePan);//new
            formData.append("NomineeAdhar", $scope.NomineeAdhar);//new
            formData.append("PANCopyFilePath", $scope.PANCopyFilePath_Preview); //new
            formData.append("AdharCopy_FilePath", $scope.AdharCopy_FilePath_Preview); //new

            formData.append("LWF", $scope.LWF); //new
            formData.append("WCPolicy", $scope.WCPolicy); //new
            formData.append("BankName", $scope.bankname); //new
            formData.append("NameofNominee", $scope.NameofNominee);
            formData.append("AddressofNominee", $scope.AddressofNominee);
            formData.append("RelationofNominee", $scope.RelationofNominee);
            if ($scope.DOBofNominee) {
                formData.append("DOBofNominee", new Date($scope.DOBofNominee).toISOString());
            } else {
                formData.append("DOBofNominee", null);
            }

            formData.append("StoreCode", $scope.StoreCode);
            formData.append("Status", $scope.IsActive);
            formData.append("SiteId", $scope.SiteId);
            function getFileName(file) {
                return file ? file.name : null;
            }
            formData.append("PANCardFilePath", $scope.PANCardFilePath_Preview);
            formData.append("Cheque_Passbook_FilePath", $scope.Cheque_Passbook_FilePath_Preview);
            formData.append("EducationCertificateFilePath", $scope.EducationCertificateFilePath_Preview);
            formData.append("ExperienceCertificateFilePath", $scope.ExperienceCertificateFilePath_Preview);
            formData.append("AdhaarCard_FrontSide_FilePath", $scope.AdhaarCard_FrontSide_FilePath_Preview);
            formData.append("AdhaarCard_BackSide_FilePath", $scope.AdhaarCard_BackSide_FilePath_Preview);
            formData.append("RelievingLetterfFilePath", $scope.RelievingLetterfFilePath_Preview);
            formData.append("PayslipsFilePath", $scope.PayslipsFilePath_Preview);
            formData.append("Photos_1_FilePath", $scope.Photos_1_FilePath_Preview);
            formData.append("Photos_2_FilePath", $scope.Photos_2_FilePath_Preview);
            formData.append("Photos_3_FilePath", $scope.Photos_3_FilePath_Preview);
            formData.append("Photos_4_FilePath", $scope.Photos_4_FilePath_Preview);
            formData.append("EmployeePhotos", $scope.EmployeePhotos);

            formData.append("MinimumWageCategory", $scope.MinimumWageCategory);
            formData.append("WageType", $scope.WageType);
            formData.append("WageDisbursementMode", $scope.WageDisbursementMode);

            formData.append("PPE", $scope.PPE);
            formData.append("PPEType", $scope.PPEType);
            formData.append("SafetyTrainingStatus", $scope.SafetyTrainingStatus);
            formData.append("SiteInductionStatus", $scope.SiteInductionStatus);
            formData.append("PoliceVerificationStatus", $scope.PoliceVerificationStatus);

            formData.append("TempIDStatus", $scope.TempIDStatus);
            formData.append("TempIDNumber", $scope.TempIDNumber);
            formData.append("TempIDDate", $('#txtTempIDDate').val());


            formData.append("PermanentIDStatus", $scope.PermanentIDStatus);
            formData.append("PermanentIDNumber", $scope.PermanentIDNumber);
            formData.append("PermanentIDDate", $('#txtPermanentIDDate').val());

            formData.append("Transport", $scope.Transport);
            formData.append("RouteId", $scope.RouteId);


            formData.append("MedicalStatus", $scope.MedicalStatus);
            formData.append("NextMedicalDue", $('#txtNextMedicalDue').val());
            formData.append("FitnessTypes", $scope.FitnessTypes);

            formData.append("sitelocation", $scope.SiteLocation);
            formData.append("Sitestate", $scope.SiteState);
            formData.append("Sdate", ($scope.Sdate && $scope.Sdate !== "" ? new Date($scope.Sdate).toISOString() : ""));
            formData.append("endate", ($scope.endate && $scope.endate !== "" ? new Date($scope.endate).toISOString() : ""));
            formData.append("TypeWork", $scope.TypeWork);
            formData.append("NatureJob", $scope.NatureJob);
            // added new filed here
            formData.append("PFNomineeName", $scope.PFNomineeName);
            formData.append("PFNomineeRelation", $scope.PFNomineeRelation);
            formData.append("PFNomineeDOB", $('#txtPFNomineeDOB').val());
            formData.append("PFNomineeAddress", $scope.PFNomineeAddress);
            formData.append("ESINomineeName", $scope.ESINomineeName);
            formData.append("ESINomineeRelation", $scope.ESINomineeRelation);
            formData.append("ESINomineeDOB", $('#txtESINomineeDOB').val());
            formData.append("ESINomineeAddress", $scope.ESINomineeAddress);
            formData.append("BonusNomineeName", $scope.BonusNomineeName);
            formData.append("BonusNomineeRelation", $scope.BonusNomineeRelation);
            formData.append("BonusNomineeDOB", $('#txtBonusNomineeDOB').val());
            formData.append("BonusNomineeAddress", $scope.BonusNomineeAddress);
            formData.append("OtherNomineeName", $scope.OtherNomineeName);
            formData.append("OtherNomineeRelation", $scope.OtherNomineeRelation);
            formData.append("OtherNomineeDOB", $('#txtOtherNomineeDOB').val());
            formData.append("OtherNomineeAddress", $scope.OtherNomineeAddress);
			  formData.append("ESINomineeEmail", $scope.ESINomineeEmail);
            formData.append("ESINomineeMobile", $scope.ESINomineeMobile);
			  formData.append("PFNomineeEmail", $scope.PFNomineeEmail);
            formData.append("PFNomineeMobile", $scope.PFNomineeMobile);

            formData.append("BonusNomineeEmail", $scope.BonusNomineeEmail);
            formData.append("BonusNomineeMobile", $scope.BonusNomineeMobile);

            formData.append("OtherNomineeEmail", $scope.OtherNomineeEmail);
            formData.append("OtherNomineeMobile", $scope.OtherNomineeMobile);
            // here is end new field

            formData.append("MedicalCertificate_FilePath", $scope.MedicalCertificateFilePath_Preview);


            formData.append("ActionType", $scope.IsActionType);
            $.ajax({
                url: "../RetailSection/InsertUpdateDelEmployeeMaster",
                type: 'POST',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (response) {
                    var data = JSON.parse(response);
                    console.log(response);
                    if (showMsgBox(data.Result)) {
                        //$scope.ResetEmployee();
                        $scope.GetEmployeeMaster();
                        //$scope.IsActionType = 1;
                        //$scope.act = 1;
                    }
                },
                error: function (xhr, status, error) {
                    console.error("Error saving employee data: " + error);
                }
            });
        }
    };

    $scope.getFileIconClass = function (fileModel) {
        return fileModel ? 'fa fa-check-square' : 'fa fa-plus';
    };

    //$scope.uploadFile = function (fieldName, input) {
    //    if (input.files && input.files[0]) {
    //        var file = input.files[0];

    //        var fileNameField = fieldName.replace("FilePath", "FileName");
    //        $scope[fileNameField] = file.name;

    //        var filerdr = new FileReader();
    //        filerdr.onload = function (e) {
    //            $scope[fieldName + "_Preview"] = e.target.result; // ✅ base64
    //            $scope.$applyAsync();
    //        };
    //        filerdr.readAsDataURL(file);
    //    }
    //};

    // Above are old code and given below new code for file validation by aadarsh
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

    $scope.ViewFile = function (path) {
        if (!path) {
            alert("File not available");
            return;
        }
        if (typeof path === "object" && path.name) {

            var fileURL = URL.createObjectURL(path);
            window.open(fileURL, '_blank');
        }
        else {
            window.open(path, '_blank');
        }
    };
    $scope.DownloadFile = function (path) {
        if (!path) {
            alert("File not available");
            return;
        }
        if (typeof path === "object" && path.name) {
            var url = URL.createObjectURL(path);
            var a = document.createElement("a");
            a.href = url;
            a.download = path.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        else {
            var a = document.createElement("a");
            a.href = path;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
    function IsFileValidation() {
        var modelStateIsvalid = true;
        var firstElement = null;
        $.each($('input:file'), function (index) {

            if ($(this).hasClass('filevalidate')) {
                var _length = $(this).length;
                if (_length > 0) {
                    var _fileValue = $($(this)[0]).val();
                    if (_fileValue == "" || _fileValue == null || _fileValue == undefined) {
                        var _fileUpload = $($(this)[0]).parent('.fileupld');
                        if (_fileUpload != null || _fileUpload != undefined && _fileUpload.length > 0) {
                            $(_fileUpload).addClass("red-validation");
                            modelStateIsvalid = false;
                            if (firstElement == null)
                                firstElement = $(this);
                        }
                        else {
                            $(_fileUpload).removeClass("red-validation");
                        }
                    }
                    else {
                        var _fileUpload = $($(this)[0]).parent('.fileupld');
                        if (_fileUpload != null || _fileUpload != undefined && _fileUpload.length > 0) {
                            $(_fileUpload).removeClass("red-validation");
                        }
                    }
                }
            }
            else {
                $(this).removeClass("red-validation");
            }
        });
        if (firstElement != null) {
            firstElement.focus();
        }
        return modelStateIsvalid;
    }
    $scope.Siteopen = false;
    $scope.openEmployeeModal = function (_Id) {
        $scope.EmpId = _Id;
        $scope.Siteopen = true;

        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === _Id;
        });

        if (selectedEmployee) {
            $scope.EditId = selectedEmployee.Id;
            $scope.employee =
            {
                IsTransfer: selectedEmployee.IsTransfer,
                Id: selectedEmployee.Id,
                PartyTypeId: selectedEmployee.PartyTypeId,
                SiteId: selectedEmployee.Site,
                Name: selectedEmployee.EmployeeName,
                DOJ: selectedEmployee.DisplayDOJ,
                IssueDate: selectedEmployee.CreatedOn,
                ValidTill: selectedEmployee.ValidTill,
                BloodGroup: selectedEmployee.BloodGroup,
                CampNumber: selectedEmployee.CampNumber,

                RefEmployeeCode: selectedEmployee.RefEmployeeCode,
                UnitCode: selectedEmployee.UnitCode,
                Email: selectedEmployee.EmployeeEmailID,
                PhoneNumber: selectedEmployee.MobileNumber,
                Address: selectedEmployee.PresentAddress,
                City: selectedEmployee.City,
                State: selectedEmployee.State,
                ZipCode: selectedEmployee.ZipCode,
                FatherHusbandName: selectedEmployee.Father_Husband_Name,
                Gender: selectedEmployee.Gender,
                WorkerGrade: selectedEmployee.WorkerGrade,
                MaritalStatus: selectedEmployee.MaritalStatus,
                DateofBirth: selectedEmployee.DisplayDOB,
                NomineeName: selectedEmployee.NomineeName,
                NomineeAddress: selectedEmployee.NomineeAddress,
                NomineeRelation: selectedEmployee.NomineeRelation,
                PANCardFilePath: selectedEmployee.PANCardFilePath,
                Cheque_Passbook_FilePath: selectedEmployee.Cheque_Passbook_FilePath,
                EducationCertificateFilePath: selectedEmployee.EducationCertificateFilePath,
                ExperienceCertificateFilePath: selectedEmployee.ExperienceCertificateFilePath,
                AdhaarCard_FrontSide_FilePath: selectedEmployee.AdhaarCard_FrontSide_FilePath,
                AdhaarCard_BackSide_FilePath: selectedEmployee.AdhaarCard_BackSide_FilePath,
                RelievingLetterfFilePath: selectedEmployee.RelievingLetterfFilePath,
                PayslipsFilePath: selectedEmployee.PayslipsFilePath,
                Photos_1_FilePath: selectedEmployee.Photos_1_FilePath,
                Photos_2_FilePath: selectedEmployee.Photos_2_FilePath,
                Photos_3_FilePath: selectedEmployee.Photos_3_FilePath,
                Photos_4_FilePath: selectedEmployee.Photos_4_FilePath,
                Transport: selectedEmployee.Transport,

                MedicalCertificateFilePath: selectedEmployee.MedicalCertificate_FilePath,
                MedicalStatus: selectedEmployee.MedicalStatus,
                NextMedicalDue: selectedEmployee.NextMedicalDue,
                FitnessTypes: selectedEmployee.FitnessTypes,

                RouteId: selectedEmployee.RouteId,
                State: selectedEmployee.State,
                CityId: selectedEmployee.City,
                Pincode: selectedEmployee.Pincode,

                TempIDDate: selectedEmployee.TempIDDate,
                PermanentIDStatus: selectedEmployee.PermanentIDStatus,
                PermanentIDNumber: selectedEmployee.PermanentIDNumber,
                PermanentIDDate: selectedEmployee.PermanentIDDate,
                EmployeePhotos: selectedEmployee.EmployeePhotos,
            };
            $scope.openRoutetransport();
            $scope.BindTransfer(_Id);
            $scope.BindTransferStore(_Id);
        }
    };
    $scope.viewDocument = function (documentPath) {
        $scope.openDocumentFunction(documentPath);
    };
    $scope.openDocumentFunction = function (documentPath) {
        window.open(documentPath, '_blank');
    };


    $scope.opensomething = function () {
        $scope.Siteopen = false;
    }

    $scope.EditEmployee = function (Id) {

        if (!Array.isArray($scope.EmployeeList)) {
            $scope.EmployeeList = [$scope.EmployeeList];
        }
        function convertToDate(dateStr) {
            if (!dateStr) return null;

            dateStr = dateStr.replace('AM', '').replace('PM', '').trim();

            var parts = dateStr.split('/');

            if (parts.length === 3) {
                var day = parseInt(parts[0], 10);
                var month = parseInt(parts[1], 10) - 1;
                var year = parseInt(parts[2], 10);

                var d = new Date(year, month, day);

                if (isNaN(d)) {
                    console.log("Invalid Date:", dateStr);
                    return null;
                }

                return d;
            }

            var d = new Date(dateStr);
            if (isNaN(d)) {
                console.log("Invalid Date:", dateStr);
                return null;
            }

            return d;
        }
        $scope.act = 2;
        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === Id;
        });
        $scope.EditId = selectedEmployee.Id;
        $scope.SiteId = selectedEmployee.Site;
        $scope.PartyTypeId = selectedEmployee.PartyTypeId;

        setTimeout(function () {
            $scope.AllPartySiteLoad($scope.PartyTypeId);
            $scope.PartyId = selectedEmployee.PartyId;
        }, 100);
        setTimeout(function () {
            $scope.AllUserListsLoad($scope.PartyId);
            $scope.UserId = selectedEmployee.UserId;
        }, 200);
        setTimeout(function () {
            $scope.BindSuperVisior1($scope.UserId);
            $scope.SuperVisior1 = selectedEmployee.SuperVisior1;
        }, 300);

        setTimeout(function () {
            $scope.BindSuperVisior2($scope.UserId);
            $scope.SuperVisior2 = selectedEmployee.SuperVisior2;
        }, 400);

        $scope.EmployeeCode = selectedEmployee.EmployeeCode;

        $scope.EmployeePhotos = selectedEmployee.EmployeePhotos
        $scope.RefEmployeeCode = selectedEmployee.RefEmployeeCode;
        $scope.EmployeeName = selectedEmployee.EmployeeName;
        $scope.EmployeeDesignation = selectedEmployee.EmployeeDesignation;
        $scope.EmployeeDepartment = selectedEmployee.EmployeeDepartment;
        $scope.FatherHusbandName = selectedEmployee.Father_Husband_Name;
        $scope.Gender = selectedEmployee.Gendar;
        $scope.PFAccount = selectedEmployee.PFAccount,
            $scope.MaritalStatus = selectedEmployee.MaritalStatus;

        $scope.DateofBirth = convertToDate(selectedEmployee.DateOfBirth);
        $scope.DOJ = convertToDate(selectedEmployee.DOJ);

        $scope.IssueDate = convertToDate(selectedEmployee.CreatedOn);
        $scope.ValidTill = convertToDate(selectedEmployee.ValidTill);
        $scope.BloodGroup = selectedEmployee.BloodGroup;
        $scope.CampNumber = selectedEmployee.CampNumber;

        $scope.LeavingDate = convertToDate(selectedEmployee.LeavingDate);
        $scope.DOBofNominee = convertToDate(selectedEmployee.NomineeDOB);

        $scope.PresentAddress = selectedEmployee.PresentAddress;
        $scope.PermanentAddress = selectedEmployee.PermanemtAddress;
        $scope.AdharCardNumber = selectedEmployee.AdharCardNumber;
        $scope.PANNumber = selectedEmployee.PANNumber;
        $scope.MobileNumber = selectedEmployee.MobileNumber;
        $scope.AlternativeMobileNumber = selectedEmployee.AlternativeMobileNumber;
        $scope.EmployeeEmailID = selectedEmployee.EmployeeEmailID;
        $scope.BankAccountNumber = selectedEmployee.BankAccountNumber;
        $scope.acholdername = selectedEmployee.acholdername;
        $scope.BankIFSCCode = selectedEmployee.BankIFSCCode;
        $scope.PreviousUAN = selectedEmployee.PreviousUAN;
        $scope.PreviousESI = selectedEmployee.PreviousESI;
        $scope.GrossSalary = selectedEmployee.GrossSalary;

        $scope.NameofNominee = selectedEmployee.NomineeName;
        $scope.AddressofNominee = selectedEmployee.NomineeAddress;
        $scope.RelationofNominee = selectedEmployee.NomineeRelation;
        $scope.StoreCode = selectedEmployee.StoreCode;
        $scope.PFAccount = selectedEmployee.PFAccount;
        $scope.IsActive = selectedEmployee.IsActive == true ? '1' : '0';
        $scope.PANCardFilePath = selectedEmployee.PANCardFilePath;
        $scope.Cheque_Passbook_FilePath = selectedEmployee.Cheque_Passbook_FilePath;
        $scope.EducationCertificateFilePath = selectedEmployee.EducationCertificateFilePath;
        $scope.ExperienceCertificateFilePath = selectedEmployee.ExperienceCertificateFilePath;
        $scope.AdhaarCard_FrontSide_FilePath = selectedEmployee.AdhaarCard_FrontSide_FilePath;
        $scope.AdhaarCard_BackSide_FilePath = selectedEmployee.AdhaarCard_BackSide_FilePath;
        $scope.RelievingLetterfFilePath = selectedEmployee.RelievingLetterfFilePath;
        $scope.PayslipsFilePath = selectedEmployee.PayslipsFilePath;
        $scope.Photos_1_FilePath = selectedEmployee.Photos_1_FilePath;
        $scope.Photos_2_FilePath = selectedEmployee.Photos_2_FilePath;
        $scope.Photos_3_FilePath = selectedEmployee.Photos_3_FilePath;
        $scope.Photos_4_FilePath = selectedEmployee.Photos_4_FilePath;

 $scope.UANFile = selectedEmployee.UANFile;
        $scope.BOCWFile = selectedEmployee.BOCWFile;
        $scope.ESICFile = selectedEmployee.ESICFile;

        $scope.MinimumWageCategory = selectedEmployee.MinimumWageCategory;
        $scope.WageType = selectedEmployee.WageType;
        $scope.WageDisbursementMode = selectedEmployee.WageDisbursementMode;

        $scope.PPE = selectedEmployee.PPE;
        $scope.PPEType = selectedEmployee.PPEType;
        $scope.SafetyTrainingStatus = selectedEmployee.SafetyTrainingStatus;
        $scope.SiteInductionStatus = selectedEmployee.SiteInductionStatus;
        $scope.PoliceVerificationStatus = selectedEmployee.PoliceVerificationStatus;

        $scope.TempIDStatus = selectedEmployee.TempIDStatus;

        $scope.TempIDNumber = selectedEmployee.TempIDNumber;
        $scope.TempIDDate = convertToDate(selectedEmployee.TempIDDate);
        $scope.PermanentIDDate = convertToDate(selectedEmployee.PermanentIDDate);

        // here is new some fields
        $scope.bankname = selectedEmployee.bankname;
        $scope.LWF = selectedEmployee.LWFNo;
        $scope.WCPolicy = selectedEmployee.WCPolicy;
        $scope.NomineePan = selectedEmployee.NomineePan;
        $scope.NomineeAdhar = selectedEmployee.NomineeAadhar;
        $scope.Flag = selectedEmployee.Flag;




        $scope.MedicalCertificateFilePath = selectedEmployee.MedicalCertificate_FilePath;
        $scope.MedicalStatus = selectedEmployee.MedicalStatus;
        $scope.NextMedicalDue = convertToDate(selectedEmployee.NextMedicalDue);
        $scope.FitnessTypes = selectedEmployee.FitnessTypes;


        $scope.State = selectedEmployee.State;
        $scope.City = selectedEmployee.City;
        $scope.Pincode = selectedEmployee.Pincode;

        $scope.PState = selectedEmployee.PState;
        $scope.PCity = selectedEmployee.PCity;
        $scope.PPincode = selectedEmployee.PPincode;

        $scope.Trannerdate = convertToDate(selectedEmployee.Trannerdate);

        //$('#txttrainingdt').val(selectedEmployee.Trannerdate);
        $scope.TrannerName = selectedEmployee.TrannerName;
        $scope.VendorName = selectedEmployee.VendorName;
        $scope.VendorCode = selectedEmployee.VendorCode;
        $('#txtTempIDDate').val(selectedEmployee.TempIDDate);
        // added new here dated 22/06/2026
        $scope.Pincode = selectedEmployee.Pincode;
        $scope.CampNumber = selectedEmployee.CampNumber;
        $scope.SiteLocation = selectedEmployee.sitelocation;
        $scope.SiteState = selectedEmployee.sitestate;
        $scope.NatureJob = selectedEmployee.NatureJob;
        $scope.TypeWork = selectedEmployee.TypeWork;
        $('#txtSdate').val(selectedEmployee.Sdate);
        $('#txtendate').val(selectedEmployee.endate);

        $scope.NomineeMobile = selectedEmployee.NomineeMobile;
        $scope.NomineeEmeail = selectedEmployee.NomineeEmail;

        $scope.PFNomineeName = selectedEmployee.PFNomineeName;
        $scope.PFNomineeRelation = selectedEmployee.PFNomineeRelation;
        $scope.PFNomineeDOB = convertToDate(selectedEmployee.PFNomineeDOB);
        $scope.PFNomineeAddress = selectedEmployee.PFNomineeAddress;
        $scope.PFNomineeEmail = selectedEmployee.PFNomineeEmail;
        $scope.PFNomineeMobile = selectedEmployee.PFNomineeMobile;


        $scope.ESINomineeName = selectedEmployee.ESINomineeName;
        $scope.ESINomineeRelation = selectedEmployee.ESINomineeRelation;
        $scope.ESINomineeDOB = convertToDate(selectedEmployee.ESINomineeDOB);
        $scope.ESINomineeAddress = selectedEmployee.ESINomineeAddress;
        $scope.ESINomineeMobile = selectedEmployee.ESINomineeMobile;
        $scope.ESINomineeEmail = selectedEmployee.ESINomineeEmail;

        $scope.BonusNomineeName = selectedEmployee.BonusNomineeName;
        $scope.BonusNomineeRelation = selectedEmployee.BonusNomineeRelation;
        $scope.BonusNomineeDOB = convertToDate(selectedEmployee.BonusNomineeDOB);
        $scope.BonusNomineeAddress = selectedEmployee.BonusNomineeAddress;
        $scope.BonusNomineeMobile = selectedEmployee.BonusNomineeMobile;
        $scope.BonusNomineeEmail = selectedEmployee.BonusNomineeEmail;

        $scope.OtherNomineeName = selectedEmployee.OtherNomineeName;
        $scope.OtherNomineeRelation = selectedEmployee.OtherNomineeRelation;
        $scope.OtherNomineeDOB = convertToDate(selectedEmployee.OtherNomineeDOB);
        $scope.OtherNomineeAddress = selectedEmployee.OtherNomineeAddress;
        $scope.OtherNomineeMobile = selectedEmployee.OtherNomineeMobile;
        $scope.OtherNomineeEmail = selectedEmployee.OtherNomineeEmail;

        $scope.PermanentIDStatus = selectedEmployee.PermanentIDStatus;

        $scope.WorkerGrade = selectedEmployee.WorkerGrade;
        $scope.Religion = selectedEmployee.Religion;
        $scope.Caste = selectedEmployee.Caste;

        $scope.GetJobDetailHistory();
        $scope.PermanentIDNumber = selectedEmployee.PermanentIDNumber;
        $('#txtPermanentIDDate').val(selectedEmployee.PermanentIDDate);
        $scope.EmployeePhotos = selectedEmployee.EmployeePhotos,
            $scope.Transport = selectedEmployee.Transport,
            $scope.RouteId = selectedEmployee.RouteId,
            $scope.openRoutetransport();
        $scope.IsActionType = 2;
        setTimeout(function () {
            try {
                var el = document.getElementById('newEmployeeModal');
                console.log("Modal Element:", el);
                var modal = new bootstrap.Modal(el);
                modal.show();
                console.log("Modal triggered");
            } catch (e) {
                console.error(e);
            }
        }, 500);

    };
    $scope.FireDoc = function (Id) {
        $('#' + Id).click();
    }
    $scope.ChangeStatus = function (Status, Id) {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = Id;
        collectionobj.Status = Status;
        var getData = myService.methode('POST', "../RetailSection/UpdateEmpStatus", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.GetEmployeeMaster();
        });
    }
    $scope.BindTransfer = function (Id) {
        var collectionobj = {};
        collectionobj.ActionType = 11;
        collectionobj.Id = Id;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.TransferLog = response.data.Result;
        });
    }
    $scope.BindTransferStore = function (Id) {
        var collectionobj = {};
        collectionobj.ActionType = 12;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.TransferStoreList = response.data.Result;
        });
    }
    $scope.SearchStoreList = function () {
        var collectionobj = {};
        collectionobj.ActionType = 13;
        collectionobj.Id = $scope.StoreSearch;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.TransferStoreList = response.data.Result;
        });
    }
    $scope.SetTransfer = function (Id) {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.Id = Id;
        collectionobj.UserId = $scope.EmpId;
        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            showMsgBox('999', 'Alert', response.data.Result[0].Msg, 'success', 'btn-success');
            $scope.GetEmployeeMaster();
        });
    }



    $scope.UpdateDocument = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope[fieldName] = e.target.result;
                $scope.$applyAsync();
                var formData = new FormData();
                formData.append("Id", $scope.EditId);
                formData.append("FieldName", fieldName);
                formData.append("FilePath", $scope[fieldName]);

                $.ajax({
                    url: "../RetailSection/UpdateDocumentForEmployee",
                    type: 'POST',
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function (response) {

                        $scope.employee[fieldName] = response;

                        $scope.GetEmployeeMaster();
                        showMsgBox('2');
                    },
                    error: function (xhr, status, error) {
                        console.error("Error saving employee data: " + error);
                    }
                });
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.$applyAsync();
        }
    };
    $scope.ExportExcel = function () {

        var table = $('#example').DataTable();

        if (table.button) {
            table.button('.buttons-csv').trigger();
        } else {
            console.error("Buttons extension not loaded");
        }
    };

    $scope.ExportPdf = function () {

        var table = $('#example').DataTable();

        if (table.button) {
            table.button('.buttons-pdf').trigger();
        } else {
            console.error("Buttons extension not loaded");
        }
    };

    $scope.ExportPrint = function () {

        var table = $('#example').DataTable();


        if (table.button) {
            table.button('.buttons-print').trigger();
        } else {
            console.error("Buttons extension not loaded");
        }
    };

    function formatDate(dateValue) {

        if (!dateValue || dateValue === "" || dateValue === "null" || dateValue === "undefined") {
            return "";
        }
        if (typeof dateValue === "string" &&
            /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue.trim())) {

            var parts = dateValue.trim().split("/");

            return ("0" + parts[0]).slice(-2) + "/" +
                ("0" + parts[1]).slice(-2) + "/" +
                parts[2];
        }

        // ISO Date or JS Date
        var d = new Date(dateValue);

        if (isNaN(d.getTime())) {
            return "";
        }

        var day = ("0" + d.getDate()).slice(-2);
        var month = ("0" + (d.getMonth() + 1)).slice(-2);
        var year = d.getFullYear();

        return day + "/" + month + "/" + year;
    }

    $scope.ExportToCSV = function () {
        if (!$scope.EmployeeList || $scope.EmployeeList.length === 0) {
            alert("No data to export");
            return;
        }
        var csv = [];
        var headers = [
            "Sr.No",
            "Worker Code",
            "Ref Worker Code",
            "Worker Name",
            "Designation",
            "Date of Joining",
            "Department",
            "Father/Husband Name",
            "Gender",
            "Marital Status",
            "Date Of Birth",
            "Present Address",
            "State",
            "City",
            "Pincode",
            "Permanemt Address ",
            "State",// new field
            "City",// new field
            "Pincode",// new field
            "Aadhaar No",
            "PAN No",
            "Mobile Number",
            "Alternative Mobile Number",
            "Worker Email ID",
            "Bank Account Number",
            "Bank IFSC Code",
            "UAN No",
            "Previous ESIC",
            "Gross Salary",
            "Nominee Name",
            "Address",
            "Relation",
            "DOB",
            "PF Account",
            "Applicable Minimum Wages Category",
            "Wage Type",
            "Wage Disbursement Mode",
            "PPE",
            "Types of PPE Given",
            "Safety Training Status",
            "Training Date", // add new column
            "Trainer Name", // add new column
            "Site Induction Status",
            "Police Verification Status",
            "Temporary Gate Pass Status",
            "Temporary Gate Pass No.",
            "Temporary Gate Pass Date",
            "Permanent Gate Pass Status",
            "Permanent Gate Pass No.",
            "Permanent Gate Pass Date",
            "Allow Transport",
            "I Card Issue Date",
            "I Card Valid Till",
            "Blood Group",
            "Camp Number",
            "Site Name",
            "Assign Color",
            "Contractor Name",
            "Route Name",
            "Medical Examination",
            "Fitness Types",
            "Next Medical Due",
            "Worker Photo",
            "PAN Card",
            "Aadhaar Card Front Side",
            "Aadhaar Card Back Side",
            "Cheque/Passbook Copy",
            "Educational Certificate",
            "Experience Certificate",
            "Relieving Letter",
            "Payslips",
            "Photo",
            "Appointment Letter",
            "TIC card",
            "Signature",
            "Medical Certificate",
            "Status",
        ];
        csv.push(headers.join(","));
        angular.forEach($scope.EmployeeList, function (item, index) {
            function csvVal(val) {
                return '"' + String(val || '').replace(/"/g, '""') + '"';
            }
            function csvAddr(val) {
                return '"' + String(val || '')
                    .replace(/"/g, '""')
                    .replace(/(\r\n|\n|\r)/gm, ' ') + '"';
            }
            function csvText(val) {
                return '="' + String(val || '') + '"';
            }
            var row = [
                index + 1,
                item.EmployeeCode || "",
                item.RefEmployeeCode || "",
                item.EmployeeName || "",
                item.EmployeeDesignation || "",
                csvVal(formatDate(item.DisplayDOJ || "")),
                item.EmployeeDepartment || "",

                item.Father_Husband_Name || "",
                item.Gendar || "",
                item.MaritalStatus || "",
                csvVal(formatDate(item.DateOfBirth || "")),
                csvAddr(item.PresentAddress || ""),
                item.State || "",
                item.City || "",
                csvText(item.Pincode || ""),
                csvAddr(item.PermanemtAddress || ""),
                item.PState || "",// new field
                item.PCity || "",// new field
                csvText(item.PPincode || ""),// new field
                csvText(item.AdharCardNumber || ""),
                csvText(item.PANNumber || ""),
                csvText(item.MobileNumber || ""),
                csvText(item.AlternativeMobileNumber || ""),
                item.EmployeeEmailID || "",
                csvText(item.BankAccountNumber || ""),
                csvText(item.BankIFSCCode || ""),
                csvText(item.PreviousUAN || ""),
                csvText(item.PreviousESI || ""),
                csvText(item.GrossSalary || ""),
                item.NomineeName || "",
                csvAddr(item.NomineeAddress || ""),
                item.NomineeRelation || "",
                csvVal(formatDate(item.NomineeDOB || "")),
                csvText(item.PFAccount ?? ""),
                item.MinimumWageCategory || "",
                item.WageType || "",
                item.WageDisbursementMode || "",
                item.PPE || "",
                csvAddr(item.PPEType || ""),
                item.SafetyTrainingStatus || "",
                csvVal(formatDate(item.Trannerdate || "")),// new field
                item.TrannerName || "",
                item.SiteInductionStatus || "",
                item.PoliceVerificationStatus || "",
                item.TempIDStatus || "",
                csvText(item.TempIDNumber || ""),
                csvVal(formatDate(item.TempIDDate || "")),
                item.PermanentIDStatus || "",
                csvText(item.PermanentIDNumber || ""),
                csvVal(formatDate(item.PermanentIDDate || "")),
                item.Transport || "",
                csvVal(formatDate(item.IssueDate || "")),
                csvVal(formatDate(item.ValidTill || "")),
                item.BloodGroup || "",
                csvText(item.CampNumber || ""),
                item.SiteName + "(" + item.Site + ")" || "",
                item.AssignColor || "",
                csvText(item.VendorName || ""),
                csvVal(item.RouteName),
                // here is new option adding
                item.MedicalStatus || "",
                item.FitnessTypes || "",
                item.NextMedicalDue || "",
                csvText(item.EmployeePhotos ? "Uploaded" : "Not Uploaded"),
                csvText(item.PANCardFilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.AdhaarCard_FrontSide_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.AdhaarCard_BackSide_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.Cheque_Passbook_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.EducationCertificateFilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.ExperienceCertificateFilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.RelievingLetterfFilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.PayslipsFilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.Photos_1_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.Photos_2_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.Photos_3_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.Photos_4_FilePath ? "Uploaded" : "Not Uploaded"),
                csvText(item.MedicalCertificate_FilePath ? "Uploaded" : "Not Uploaded"),
                item.Status || "",
            ];
            csv.push(row.join(","));
        });
        var csvString = csv.join("\n");
        var blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        var url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", "WorkerMaster.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    $scope.ExportToPDF = function () {
        if (!$scope.EmployeeList || $scope.EmployeeList.length === 0) {
            alert("No data to export");
            return;
        }
        var html = `
        <html>
        <head>
            <title>Worker Master</title>
            <style>
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 8px; font-size: 12px; }
                th { background: #f2f2f2; }
            </style>
        </head>
        <body>
            <h3 style="text-align:center;">Worker Master</h3>
            <table>
                <thead>
                    <tr>
                        <th>Sr.No</th>
                        <th>Worker Code</th>
                        <th>Ref Code</th>
                        <th>Name</th>
                        <th>Designation</th>
                        <th>D.O.J</th>
                        <th>Department</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>   `;

        angular.forEach($scope.EmployeeList, function (item, index) {
            html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.EmployeeCode || ''}</td>
                <td>${item.RefEmployeeCode || ''}</td>
                <td>${item.EmployeeName || ''}</td>
                <td>${item.EmployeeDesignation || ''}</td>
                <td>${item.DisplayDOJ || ''}</td>
                <td>${item.EmployeeDepartment || ''}</td>
                <td>${item.DocumentStatus || ''}</td>
            </tr>
        `;
        });
        html += `
                </tbody>
            </table>
        </body>
        </html>`;
        var win = window.open('', '', 'height=700,width=900');
        win.document.write(html);
        win.document.close();
        win.print();
    };
    $scope.ExportToPrint = function () {
        if (!$scope.EmployeeList || $scope.EmployeeList.length === 0) {
            alert("No data to print");
            return;
        }
        var html = `<html><head><title>Print Employee Master</title><style>table { width: 100%; border-collapse: collapse; }th, td { border: 1px solid black; padding: 8px; font-size: 12px; text-align:center; }
                th { background: #f2f2f2; }</style></head><body><h3 style="text-align:center;">Employee Master</h3><table><thead><tr>
                        <th>Sr.No</th><th>Employee Code</th>
                        <th>Ref Employee Code</th><th>Employee Name</th>
                        <th>Designation</th><th>D.O.J</th>
                        <th>Department</th><th>Compliance Status</th>
                    </tr></thead>
                <tbody>`;

        angular.forEach($scope.EmployeeList, function (item, index) {
            html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.EmployeeCode || ''}</td>
                <td>${item.RefEmployeeCode || ''}</td>
                <td>${item.EmployeeName || ''}</td>
                <td>${item.EmployeeDesignation || ''}</td>
                <td>${item.DisplayDOJ || ''}</td>
                <td>${item.EmployeeDepartment || ''}</td>
                <td>${item.DocumentStatus || ''}</td>
            </tr>`;
        }); html += `</tbody></table></body></html>`;

        var win = window.open('', '', 'height=700,width=900');
        win.document.write(html);
        win.document.close();
        win.print();
    };
    $scope.CancelImport = function () {
        document.getElementById("input-excel").value = "";
        document.getElementById("wrapper").classList.add("d-none");
    };
    $scope.UploadDoc = function (doc) {


        $scope.DocumentId = doc;

        document.getElementById("fileUpload").click();
    };

    $scope.opencom = function (EmCode) {
        $scope.EmCode = EmCode;
        $scope.BindEmpComplianceDoc(EmCode);
    }
    $scope.FileChanged = function (element) {

        var file = element.files[0];
        if (!file) return;

        var reader = new FileReader();

        reader.onload = function (e) {

            var base64Data = e.target.result;

            var obj = {
                Id: $scope.DocumentId,
                ActionType: 8,
                LoginId: LoginId,
                EmpCode: $scope.EmCode,
                UFile: base64Data
            };

            $http.post('../RetailSection/UploadComplianceDoc', obj)
                .then(function (res) {

                    var data = res.data;

                    if (data) {
                        showMsgBox('999', 'Alert', 'Save Successfully', 'warning', 'btn-warning');


                        $scope.BindEmpComplianceDoc($scope.EmCode);
                    }

                }, function (err) {
                    console.error(err);
                });
        };

        reader.readAsDataURL(file);
    };
    $scope.onlyNumbers = function (event) {
        var charCode = event.which || event.keyCode;
        if (charCode < 48 || charCode > 57) {
            event.preventDefault();
        }
    };


    // Add New Method For Getting Worker Detail by aadarsh
    $scope.SearchWorkerDetail = function () {
        if (!$scope.WorkerID) {
            showMsgBox('999', 'Alert', 'Please Enter Worker ID', 'warning', 'btn-warning');
            return;
        }
        SiteList = [];
        var collectionobj = {};
        collectionobj.ActionType = 20;
        collectionobj.UserId = $scope.WorkerID;

        var getData = myService.methode('POST', "../RetailSection/GetEmployeeMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                $scope.Showworkerdetail = 1;
                $scope.WorkerDetail = response.data.Result[0];
                $scope.showbtn = $scope.WorkerDetail.Flag;
                $scope.WorkerID = $scope.WorkerDetail.EmployeeCode;
                $scope.BindSiteList().then(function () {
                    $scope.SiteId = $scope.WorkerDetail.site;
                });

            } else {
                $scope.Showworkerdetail = 0;
                showMsgBox('999', 'Alert', 'Worker ID does not exist ! Please Check Worker ID', 'warning', 'btn-warning');
            }
        });
    };
    // Add New Method For Send Request to Worker by aadarsh
    $scope.SendContractorReq = function () {
        if ($scope.showbtn === "Send Consent") {
            if ($scope.Showworkerdetail === 0) {
                showMsgBox('999', 'Alert',
                    'Please Find Worker ID And then Press Button',
                    'warning', 'btn-warning');
                return;
            }
            if ($scope.SiteId == undefined || $scope.SiteId == null || $scope.SiteId == "") {
                showMsgBox('999', 'Alert', 'Please Select Site Name', 'warning', 'btn-warning');
                return;
            }
            if (!$scope.txtjoindate) {
                showMsgBox('999', 'Alert', 'Please Select Joining Date ', 'warning', 'btn-warning');
                return;
            }
            var collectionobj = {
                ActionType: 21,
                EmployeeCode: $scope.WorkerID,
                LoginId: LoginId,
                PartyId: MapId,
                SiteId: $scope.SiteId,
                DOJ: $scope.txtjoindate,
            };

            var getData = myService.methode(
                'POST',
                "../RetailSection/SendReqToWorker",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            );

            getData.then(function (response) {

                showMsgBox(response.data.Result);
                $scope.showbtn = "Pending Consent"
            });

        }
        else if ($scope.showbtn === "Consent Cancelled") {
            showMsgBox('999', 'Alert', 'Consent Already Cancelled at Worker Side', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.showbtn === "Consent Approved") {
            showMsgBox('999', 'Alert', 'Consent Already Approved from Worker', 'warning', 'btn-warning');
            return;
        }
        else {
            showMsgBox('999', 'Alert', 'Consent Already Pending at Worker Side', 'warning', 'btn-warning');
            return;
        }
    };

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

    $scope.GetWorkerProfile = function (wid, wrefcode) {
        $scope.BindTransfer(wid);
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.Id = wid;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/bindworkerdetail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.EmployeeList = response.data.Result[0];
            $scope.IsEmailDisabled = !!$scope.EmployeeList.EmployeeEmailID;
            $scope.IsMobileDisabled = !!$scope.EmployeeList.MobileNumber;
            $scope.bindContractorDetail($scope.EmployeeList.UserId, $scope.EmployeeList.PartyId);
            $scope.getprincipledetail($scope.EmployeeList.UserId, $scope.EmployeeList.PartyId);
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };

    $scope.getProfQR = function (EmpCode) {
        if ($scope.EmployeeList && $scope.EmployeeList.Id) {
            return '/Api/QrBridge/qr/workers/' + $scope.EmployeeList.Id + '/card/?fmt=qr';
        }
        return '/Api/QrBridge/qr/my-card/?fmt=qr';
    };

    $scope.maskNumber = function (value) {
        if (!value) return '';

        value = value.toString();
        return '*'.repeat(Math.max(0, value.length - 4)) + value.slice(-4);
    };
    $scope.SameAs = function () {
        if ($scope.chksameas) {
            $scope.PermanentAddress = $scope.PresentAddress;
            $scope.PState = $scope.State;
            $scope.PCity = $scope.City;
            $scope.PPincode = $scope.Pincode;
            $scope.PCountry = $scope.Country;

        } else {

            $scope.PermanentAddress = '';
            $scope.PState = '';
            $scope.PCity = '';
            $scope.PPincode = '';
            $scope.PCountry = '';

        }
    };
    $scope.PFSameAs = function () {
        if ($scope.pfsameas) {
            $scope.PFNomineeName = $scope.NameofNominee;
            $scope.PFNomineeRelation = $scope.RelationofNominee;
            $scope.PFNomineeDOB = $scope.DOBofNominee;
            $scope.PFNomineeAddress = $scope.AddressofNominee;
            $scope.PFNomineeEmail = $scope.NomineeEmeail;
            $scope.PFNomineeMobile = $scope.NomineeMobile;

        } else {
            $scope.PFNomineeName = '';
            $scope.PFNomineeRelation = '';
            $scope.PFNomineeDOB = '';
            $scope.PFNomineeAddress = '';
            $scope.PFNomineeEmail = '';
            $scope.PFNomineeMobile = '';
        }
    };

    $scope.ESISameAs = function () {
        if ($scope.esisameas) {
            $scope.ESINomineeName = $scope.PFNomineeName;
            $scope.ESINomineeRelation = $scope.PFNomineeRelation;
            $scope.ESINomineeDOB = $scope.PFNomineeDOB;
            $scope.ESINomineeAddress = $scope.PFNomineeAddress;
            $scope.ESINomineeEmail = $scope.PFNomineeEmail;
            $scope.ESINomineeMobile = $scope.PFNomineeMobile;

        } else {
            $scope.ESINomineeName = '';
            $scope.ESINomineeRelation = '';
            $scope.ESINomineeDOB = '';
            $scope.ESINomineeAddress = '';
            $scope.ESINomineeEmail = '';
            $scope.ESINomineeMobile = '';
        }
    };
    $scope.BonusSameAs = function () {
        if ($scope.Bonussameas) {
            $scope.BonusNomineeName = $scope.ESINomineeName;
            $scope.BonusNomineeRelation = $scope.ESINomineeRelation;
            $scope.BonusNomineeDOB = $scope.ESINomineeDOB;
            $scope.BonusNomineeAddress = $scope.ESINomineeAddress;
            $scope.BonusNomineeEmail = $scope.ESINomineeEmail;
            $scope.BonusNomineeMobile = $scope.ESINomineeMobile;

        } else {
            $scope.BonusNomineeName = '';
            $scope.BonusNomineeRelation = '';
            $scope.BonusNomineeDOB = '';
            $scope.BonusNomineeAddress = '';
            $scope.BonusNomineeEmail = '';
            $scope.BonusNomineeMobile = '';
        }
    };
    $scope.OtherSameAs = function () {
        if ($scope.othersameas) {
            $scope.OtherNomineeName = $scope.BonusNomineeName;
            $scope.OtherNomineeRelation = $scope.BonusNomineeRelation;
            $scope.OtherNomineeDOB = $scope.BonusNomineeDOB;
            $scope.OtherNomineeAddress = $scope.BonusNomineeAddress;
            $scope.OtherNomineeEmail = $scope.BonusNomineeEmail;
            $scope.OtherNomineeMobile = $scope.BonusNomineeMobile;

        } else {
            $scope.OtherNomineeName = '';
            $scope.OtherNomineeRelation = '';
            $scope.OtherNomineeDOB = '';
            $scope.OtherNomineeAddress = '';
            $scope.OtherNomineeEmail = '';
            $scope.OtherNomineeMobile = '';
        }

    };

    $scope.SaveStep1 = function () {
        if ($scope.EmployeeName === '') {
            showMsgBox('999', 'Alert', 'Please Enter Worker Name !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.Gender === '') {
            showMsgBox('999', 'Alert', 'Please Select Gender !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.DateofBirth === '') {
            showMsgBox('999', 'Alert', 'Please Enter Worker DOB !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.MaritalStatus === '') {
            showMsgBox('999', 'Alert', 'Please Select Marital Status !!', 'warning', 'btn-warning');
            return;
        }
        //else if ($scope.SiteId === '' && $scope.Flag==1) {
        //    showMsgBox('999', 'Alert', 'Please Select Site Name/Code !!', 'warning', 'btn-warning');
        //    return;
        //}
        else if ($scope.FatherHusbandName === '') {
            showMsgBox('999', 'Alert', 'Please Enter Father/Husband Name !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.BloodGroup === '') {
            showMsgBox('999', 'Alert', 'Please Enter Blood Group !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.MobileNumber || $scope.MobileNumber.trim() === "") {
            showMsgBox('999', 'Alert', 'Please Enter Mobile Number!!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.EmployeeEmailID === '') {
            showMsgBox('999', 'Alert', 'Please Enter Email Id !!', 'warning', 'btn-warning');
            return;
        }
        else {
            $scope.SaveEmployee();
        }

    };
    $scope.SaveStep2 = function () {
        if ($scope.NameofNominee === '') {
            showMsgBox('999', 'Alert', 'Please Enter Nominee Name !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.RelationofNominee === '') {
            showMsgBox('999', 'Alert', 'Please Enter Nominee Relation !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.DOBofNominee === '') {
            showMsgBox('999', 'Alert', 'Please Enter Nominee DOB !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.PFNomineeName === '') {
            showMsgBox('999', 'Alert', 'Please Enter PF Nominee Name !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.PFNomineeRelation === '') {
            showMsgBox('999', 'Alert', 'Please Enter PF Nominee Relation !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.PFNomineeDOB === '') {
            showMsgBox('999', 'Alert', 'Please Enter PF Nominee DOB !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.ESINomineeName === '') {
            showMsgBox('999', 'Alert', 'Please Enter ESIC Nominee Name !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.ESINomineeRelation === '') {
            showMsgBox('999', 'Alert', 'Please Enter ESIC Relation !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.BonusNomineeName === '') {
            showMsgBox('999', 'Alert', 'Please Enter Bonus Nominee Name !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.BonusNomineeRelation === '') {
            showMsgBox('999', 'Alert', 'Please Enter Bonus Nominee Relation !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.OtherNomineeName === '') {
            showMsgBox('999', 'Alert', 'Please Enter Other Nominee Address !!', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.OtherNomineeRelation === '') {
            showMsgBox('999', 'Alert', 'Please Enter Other Nominee Relation!!', 'warning', 'btn-warning');
            return;
        }

        else {
            $scope.SaveEmployee();
        }

    };
    $scope.SaveStep3 = function () {
        if (!$scope.JobDesignation || $scope.JobDesignation.trim() === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Designation !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.JobDepartment || $scope.JobDepartment.trim() === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Department !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.JobConName || $scope.JobConName.trim() === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Contractor Name !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.JobEmployerName || $scope.JobEmployerName.trim() === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Principle Employer Name !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.JobSiteName || $scope.JobSiteName.trim() === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Site Name !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.JobSiteState || $scope.JobSiteState.trim() === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Site State !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.JobSdate || $scope.JobSdate === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your Start Date !!', 'warning', 'btn-warning');
            return;
        }
        else if (!$scope.Jobendate || $scope.Jobendate === '') {
            showMsgBox('999', 'Alert', 'Please Enter Your End Date !!', 'warning', 'btn-warning');
            return;
        }
        else {
            $scope.SaveJobDetailHistory();
        }


    };
    $scope.SaveStep4 = function () {
        showMsgBox('999', 'error', 'Work in Process !!', 'warning', 'btn-warning');
        return;

    };

    $scope.shareOnWhatsApp = function (url, text) {
        var message = text + " " + url;
        var whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(message);
        window.open(whatsappUrl, "_blank");
    };

    $scope.copyToClipboard = function (text) {
        navigator.clipboard.writeText(text).then(function () {
            //alert("Link copied!");
        });
    };

    $scope.shareOnEmail = function (url, text) {
        var subject = text;
        var body = text + " " + url;
        var mailtoUrl = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        window.open(mailtoUrl, "_self");
    };

    $scope.SaveJobDetailHistory = function () {

        var collectionobj = {};
        collectionobj.id = $scope.id;
        collectionobj.JobDesignation = $scope.JobDesignation;
        collectionobj.JobDepartment = $scope.JobDepartment;
        collectionobj.JobIndustry = $scope.JobIndustry;
        collectionobj.JobConID = $scope.JobConID;
        collectionobj.JobConName = $scope.JobConName;
        collectionobj.JobConEmail = $scope.JobConEmail;

        collectionobj.JobEmployerId = $scope.JobEmployerId;
        collectionobj.JobEmployerName = $scope.JobEmployerName;
        collectionobj.JobEmployerEmail = $scope.JobEmployerEmail;

        collectionobj.JobSiteName = $scope.JobSiteName;
        collectionobj.JobSitecode = $scope.JobSitecode;
        collectionobj.JobSiteLocation = $scope.JobSiteLocation;
        collectionobj.JobSiteState = $scope.JobSiteState;

        collectionobj.JobSdate = $('#txtjobSdate').val();
        collectionobj.Jobendate = $('#txtjobendate').val();

        collectionobj.JobNatureJob = $scope.JobNatureJob;
        collectionobj.JobTypeWork = $scope.JobTypeWork;

        collectionobj.Appointmentletter = $scope.JobAppointmentCertificateFilePath_Preview;
        collectionobj.Experienceletter = $scope.JobExperienceCertificateFilePath_Preview;
        collectionobj.JobPFAccount = $scope.JobPFAccount;

        collectionobj.WorkerCode = $scope.EmployeeCode;
        collectionobj.WorkerName = $scope.EmployeeName;
        collectionobj.WorkerMobile = $scope.MobileNumber;
        collectionobj.WorkerEmail = $scope.EmployeeEmailID;
        collectionobj.JobPFAccount = $scope.JobPFAccount;

        collectionobj.Action = 1;
        collectionobj.Loginid = LoginId;
        collectionobj.CreatedBy = LoginId;
        $http({ method: "POST", url: "../RetailSection/SaveJobHistory", data: JSON.stringify(collectionobj), headers: { 'Content-Type': 'application/json' } }).then(function (response) {
            showMsgBox(response.data.Result);
            $scope.resethistory();
            $scope.GetJobDetailHistory();
        }, function (error) {
            console.log(error);
            //alert("Something went wrong.");
        });
    };

    $scope.resethistory = function () {
        $scope.JobDesignation = '';
        $scope.JobDepartment = '';
        $scope.JobIndustry = '';
        $scope.JobConID = '';
        $scope.JobConName = '';
        $scope.JobConEmail = '';
        $scope.JobEmployerId = '';
        $scope.JobEmployerName = '';
        $scope.JobEmployerEmail = '';
        $scope.JobSiteName = '';
        $scope.JobSitecode = '';
        $scope.JobSiteLocation = '';
        $scope.JobSiteState = '';
        $scope.JobSdate = '';
        $scope.Jobendate = '';
        $scope.JobNatureJob = '';
        $scope.JobTypeWork = '';
        $scope.JobPFAccount = '';
        $scope.JobSiteState = '';
        $scope.JobAppointmentCertificateFilePath = '';
        $scope.JobExperienceCertificateFilePath = '';
    }


    $scope.GetJobDetailHistory = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.LoginId = LoginId;
        collectionobj.WorkerCode = $scope.EmployeeCode;
        var getData = myService.methode('POST', "../RetailSection/GetWorkerJobHistory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.WorkerJobHistory = response.data.Result;
            $scope.totaljobs = $scope.WorkerJobHistory.length;
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };

    $scope.ViewJobdetail = function (jobid) {
        var JobDetailList = $scope.WorkerJobHistory.find(function (job) {
            return job.id === jobid;
        });
        $scope.id = jobid;
        $scope.JobDesignation = JobDetailList.JobDesignation;
        $scope.JobDepartment = JobDetailList.JobDesignation;
        $scope.JobIndustry = JobDetailList.JobIndustry;
        $scope.JobConID = JobDetailList.JobConID;
        $scope.JobConName = JobDetailList.JobConName;
        $scope.JobConEmail = JobDetailList.JobConEmail;
        $scope.JobEmployerId = JobDetailList.JobEmployerId;
        $scope.JobEmployerName = JobDetailList.JobEmployerName;
        $scope.JobEmployerEmail = JobDetailList.JobEmployerEmail;
        $scope.JobSiteName = JobDetailList.JobSiteName;
        $scope.JobSitecode = JobDetailList.JobSitecode;
        $scope.JobSiteLocation = JobDetailList.JobSiteLocation;
        $scope.JobSiteState = JobDetailList.JobSiteState;
        $('#txtjobSdate').val(JobDetailList.Jobdt);
        $('#txtjobendate').val(JobDetailList.Jobedt);
        $scope.JobNatureJob = JobDetailList.JobNatureJob;
        $scope.JobTypeWork = JobDetailList.JobTypeWork;
        $scope.JobPFAccount = JobDetailList.JobPFAccount;
        $scope.JobAppointmentCertificateFilePath = JobDetailList.Appointmentletter;
        $scope.JobExperienceCertificateFilePath = JobDetailList.Experienceletter;
        $scope.savejobhistory = true;
    }
    $scope.EditJobdetail = function (jobid) {
        var JobDetailList = $scope.WorkerJobHistory.find(function (job) {
            return job.id === jobid;
        });
        $scope.id = jobid;
        $scope.JobDesignation = JobDetailList.JobDesignation;
        $scope.JobDepartment = JobDetailList.JobDesignation;
        $scope.JobIndustry = JobDetailList.JobIndustry;
        $scope.JobConID = JobDetailList.JobConID;
        $scope.JobConName = JobDetailList.JobConName;
        $scope.JobConEmail = JobDetailList.JobConEmail;
        $scope.JobEmployerId = JobDetailList.JobEmployerId;
        $scope.JobEmployerName = JobDetailList.JobEmployerName;
        $scope.JobEmployerEmail = JobDetailList.JobEmployerEmail;
        $scope.JobSiteName = JobDetailList.JobSiteName;
        $scope.JobSitecode = JobDetailList.JobSitecode;
        $scope.JobSiteLocation = JobDetailList.JobSiteLocation;
        $scope.JobSiteState = JobDetailList.JobSiteState;
        $('#txtjobSdate').val(JobDetailList.Jobdt);
        $('#txtjobendate').val(JobDetailList.Jobedt);
        $scope.JobNatureJob = JobDetailList.JobNatureJob;
        $scope.JobTypeWork = JobDetailList.JobTypeWork;
        $scope.JobPFAccount = JobDetailList.JobPFAccount;
        $scope.JobAppointmentCertificateFilePath = JobDetailList.Appointmentletter;
        $scope.JobExperienceCertificateFilePath = JobDetailList.Experienceletter;
        $scope.savejobhistory = false;
    }
    $scope.DeleteJobdetail = function (jobid) {
        $scope.id = jobid;
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.id = $scope.id;
        collectionobj.LoginId = LoginId;
        collectionobj.WorkerCode = $scope.EmployeeCode;
        var getData = myService.methode('POST', "../RetailSection/GetWorkerJobHistory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            showMsgBox('999', 'Deleted', 'Record Deleted Successfully !!', 'danger', 'btn-danger');
            $scope.GetJobDetailHistory();
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
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
            $scope.ConName = $scope.ContDashboard.connanme;
            $scope.ConCode = $scope.ContDashboard.PartyCode;
            $scope.ConEmailID = $scope.ContDashboard.EmailId;
            $scope.ConState = $scope.ContDashboard.State;
            $scope.ConAddress = $scope.ContDashboard.Address;
            $scope.ConLIN = $scope.ContDashboard.LIN;
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
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
            $scope.Employername = $scope.client.Contractorname;
            $scope.employercode = $scope.client.EmployerCode;
            $scope.Employeremail = $scope.client.EmailId;
            $scope.EmployerContactno = $scope.client.Contactno;
            $scope.employerstate = $scope.client.State;
            $scope.employeraddress = $scope.client.Address;
            $scope.industry = $scope.client.Industry;
            $scope.LIN = $scope.client.LIN;
            $scope.$applyAsync();
        })
            .catch(function (error) {
                console.error('Error:', error);
            });
    };

    $scope.GetDetail = function (Id) {
        if (!Array.isArray($scope.EmployeeList)) {
            $scope.EmployeeList = [$scope.EmployeeList];
        }
        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === Id;
        });
        $scope.WorkerCode = selectedEmployee.EmployeeCode;
    }

    $scope.ViewExpLetter = function (Code) {
        window.location.href = "../Rozgar/ExperienceLetter?WorkerCode=" + Code;
    };

    $scope.ViewAppointment = function (Code) {
        window.location.href = "../Rozgar/AppointmentLetter?WorkerCode=" + Code;
    };

    $scope.BindClientWorker = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = MapId;
        var getData = myService.methode('POST', ("../Dashboard/GetContractorGatePass"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.EmpWorkerList = response.data.Result;

        });
        $scope.hideLoader();
    }



    $scope.SaveReleaseWorker = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.completionProject = $scope.completionProject;
        collectionobj.completionContract = $scope.completionContract;
        collectionobj.OtherReason = $scope.OtherReason;
        collectionobj.fixedTerm = $scope.fixedTerm;
        collectionobj.resignation = $scope.resignation;
        collectionobj.transfer = $scope.transfer;
        collectionobj.retirement = $scope.retirement;
        collectionobj.LastDate = $scope.LastDate;
        collectionobj.Settlement = $scope.Settlement;
        collectionobj.DuesClear = $scope.DuesClear;
        collectionobj.Disciplinary = $scope.Disciplinary;
        collectionobj.Rehiring = $scope.Rehiring;
        collectionobj.Remarks = $scope.Remarks;
        collectionobj.WorkerCode = $scope.WorkerCode;
        collectionobj.Loginid = LoginId;
        collectionobj.Partyid = MapId;
        collectionobj.Action = 1;
        var getData = myService.methode('POST', ("../RetailSection/ReleaseWorkerByContractor"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            showMsgBox(response.data.Result);
            $scope.GetEmployeeMaster();
        });
    }





    var isSharing = false;

    var qrFileForShare = null;
    var qrUrlForShare = null;


    $scope.prepareQRShare = async function (employeeCode) {

        var qrImageUrl = $scope.getProfQR(employeeCode);

        var response = await fetch(qrImageUrl);

        var blob = await response.blob();


        qrFileForShare = new File(
            [blob],
            employeeCode + "_QR.png",
            {
                type: "image/png"
            }
        );


        qrUrlForShare = window.location.origin + '/qr/card/' + employeeCode;


        console.log("QR Ready");
    };

    $scope.shareEmployeeQR = async function (employeeCode) {

        try {

            var imageUrl = $scope.getProfQR(employeeCode);


            // image download
            let response = await fetch(imageUrl);

            let blob = await response.blob();


            // File create
            let imageFile = new File(
                [blob],
                employeeCode + "_QR.png",
                {
                    type: "image/png"
                }
            );


            console.log(imageFile);


            // Download bhi kar sakte ho
            let url = URL.createObjectURL(imageFile);

            let a = document.createElement("a");
            a.href = url;
            a.download = employeeCode + "_QR.png";
            a.click();

            URL.revokeObjectURL(url);



            // Same file share
            if (navigator.share &&
                navigator.canShare &&
                navigator.canShare({ files: [imageFile] })) {


                await navigator.share({

                    title: "Employee QR",

                    text: "Employee I-Card QR",

                    files: [imageFile]

                });

            }
            else {

                alert("Share not supported");

            }


        }
        catch (error) {

            console.log(error);

        }

    };
}