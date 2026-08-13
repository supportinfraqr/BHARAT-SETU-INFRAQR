app.NewEmployeeController = function ($scope, $element, $filter, myService, $http, $timeout) {
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
    $scope.DateofBirth = new Date();
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
    $scope.DOJ = new Date();
    $scope.NameofNominee = '';
    $scope.AddressofNominee = '';
    $scope.RelationofNominee = '';
    $scope.DOBofNominee = new Date();
    $scope.StoreCode = '';
    $scope.IsActive = '';
    $scope.EmployeeMasterGrid = true;
    $scope.EmployeeMasterForm = false;
    $scope.EmployeeUploadDocs = true;
    $scope.EmployeeList = [];
    $scope.IsActionType = 0;
    $scope.EditId = 0;
    $scope.UserId = '';
    $scope.SuperVisior1 = '';
    $scope.SuperVisior2 = '';


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

    $scope.EmployeePhotos = Detail.EmployeePhotos;
    $scope.EmpName = Detail.EmployeeName;
    $scope.EmpCode = Detail.EmployeeCode;
    $scope.EmpDep = Detail.EmployeeDepartment;
    $scope.EmpDesignation = Detail.EmployeeDesignation;
    $scope.EmpMobile = Detail.MobileNumber;
    $scope.ValidTill = Detail.ValidTill;
    $scope.IssueDate = Detail.IssueDate;
       $scope.RouteId = Detail.RouteId;
       $scope.ClientName = Detail.ClientName;
       $scope.AssignColor = Detail.AssignColor; 
       $scope.BloodGroup = Detail.BloodGroup;
    var site = $scope.SiteList.find(function (x) {
        return x.SiteId == Detail.Site;
    });

    $scope.SiteName = site ? site.SiteName : '';
};


    $scope.getQrUrl = function () {

        if (!$scope.EmpCode) return "";

        var data = 
            "https://login.ezcompliance.in/icard.html?id=" + $scope.EmpCode + "";

        return "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(data);
    };

   
    $scope.printIDCard = function () {

        var printContents = document.getElementById("printArea").outerHTML;

        var popupWin = window.open('', '_blank', 'width=1000,height=700');

        popupWin.document.open();

        popupWin.document.write(`
    <html>
    <head>
        <title>Print ID Card</title>

        <style>
        /* ================= CONTAINER ================= */
 
        .idCardContainer {
            display: flex;
            gap: 20px;
            justify-content: center;
        }

        /* ================= CARD BASE ================= */
        .idCard {
            background: #f4f4f4;
            border-radius: 14px;
            overflow: hidden;
            position: relative;
            font-family: 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
        }

        /* ================= UI CARD (MODAL) ================= */
        .employeeViewModalPage .idCard {
            width: 420px;
            height: 260px;
        }

        /* ================= PRINT CARD ================= */
        /*#printArea .idCard {
        width: 340px;
        height: 214px;
    }*/

        /* ================= HEADER ================= */
        .idHeader {
            height: 60px;
            background: #8f8f8f;
            /*border-bottom-left-radius: 25px;
        border-bottom-right-radius: 25px;*/
            position: relative;
        }

        .logoBox {
            position: absolute;
            right: 0px;
            top: 13px;
            background: #D9D9D9;
            padding: 10px 10px;
            border-bottom-left-radius: 40px;
            border-top-left-radius: 40px;
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
            width: 30%;
            overflow: hidden;
        }

            .logoBox span {
                font-size: 11px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .logoBox img {
                width: 18px;
            }

        /* ================= PROFILE ================= */
        .profileSection {
            display: flex;
            align-items: flex-start;
            padding: 10px 15px;
            gap: 10px;
        }

        .profileImage {
            width: 100px;
            height: 100px;
            min-width: 100px;
            border-radius: 50%;
            overflow: hidden;
            margin-top: -40px;
            border: 2px solid #fff;
            z-index: 10;
        }

            .profileImage img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

        .profileDetails {
            /*flex: 1;*/
            min-width: 0;
            padding-left: 1rem;
        }

            .profileDetails h2 {
                font-size: 16px;
                /* color: #00224F;*/
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .profileDetails p {
                font-size: 12px;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

        /* ================= QR ================= */
        .qrCode {
            margin-left: auto;
        }

            .qrCode img {
                width: 55px;
            }

        /* ================= INFO ================= */
        .infoSection {
            display: flex;
            padding: 8px 10px;
            flex: 1;
        }

            .infoSection .left,
            .infoSection .right {
                width: 50%;
                min-width: 0;
            }

        .divider {
            width: 2px;
            background: #1d3557;
            margin: 0 5px;
        }

        .field label {
            font-size: 10px;
            color: #1d3557;
        }

        .field h4 {
            font-size: 13px;
            margin: 2px 0 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* ================= BACK ================= */
        .backContent {
            padding: 10px 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
        }

        .row1 {
            display: flex;
            justify-content: space-between;
            gap: 6px;
        }

            .row1 div {
                width: 50%;
                min-width: 0;
            }

        .backContent h4 {
            font-size: 11px;
            margin: 2px 0 6px;
            line-height: 1.2;
            max-height: 28px;
            overflow: hidden;
        }


        /* ================= NOTES ================= */
        .notesBox {
            background: #e6e6e6;
            border-radius: 8px;
            padding: 6px;
            font-size: 10px;
            text-align: left;
        }

            .notesBox ul {
                margin: 0;
                padding-left: 12px;
            }

        /* ================= FLIP ================= */
        .flip-card {
            width: 420px;
            height: 260px;
            perspective: 1000px;
            margin: auto;
            cursor: pointer;
        }

        .card-inner {
            width: 100%;
            height: 100%;
            position: relative;
            transition: transform 0.6s;
            transform-style: preserve-3d;
        }

        .flip-card.flip .card-inner {
            transform: rotateY(180deg);
        }

        .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
        }

            .card-face.back {
                transform: rotateY(180deg);
            }

        /* ================= PRINT FIX ================= */
        /* HIDE FROM SCREEN BUT KEEP FOR PRINT */
        .printAreaHidden {
            position: absolute;
            top: -9999px;
            left: -9999px;
        }

        @@media print {

            body * {
                visibility: hidden !important;
            }

            #printArea,
            #printArea * {
                visibility: visible !important;
            }

            #printArea {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
            }

            FORCE STYLES
            #printArea .idCard {
                width: 340px !important;
                height: 214px !important;
                display: flex !important;
                flex-direction: column !important;
                background: #f4f4f4 !important;
            }

            #printArea .idCardContainer {
                display: flex !important;
                gap: 10px !important;
                justify-content: center !important;
            }
        }

        .row1 {
            display: flex;
            gap: 6px;
        }

            .row1 div {
                width: 50%;
                min-width: 0;
            }

                .row1 div[style*="100%"] {
                    width: 100%;
                }

        Company + Address stacking
        .backContent .row1:first-child div:first-child h4 {
            font-size: 12px;
            line-height: 1.2;
            margin: 2px 0;
        }

        Prevent overflow breaking layout
        .backContent .row1 div {
            min-width: 0;
        }

        .backContent h4 {
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /*FOOTER*/
        .footerRow {
            display: flex;
            justify-content: space-between;
            font-weight: 400;
        }

            .footerRow .label {
                color: #00224F;
                font-size: 11px;
            }

            .footerRow span {
                font-size: 11px;
            }

        .rightAlign {
            text-align: right;
        }
</style>

    </head>
    <body>
        ${printContents}
    </body>
    </html>
    `);

        popupWin.document.close();

        // ✅ Wait for images to load properly
        popupWin.onload = function () {
            setTimeout(function () {
                popupWin.focus();
                popupWin.print();
                popupWin.close();
            }, 500);
        };
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
                        aspectRatio: 1,   // 🔥 MUST
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
            height: 200 // 👈 square lo (circle banane ke liye)
        });

        // 🎯 Create circular canvas
        var circleCanvas = document.createElement('canvas');
        var size = 200;

        circleCanvas.width = size;
        circleCanvas.height = size;

        var ctx = circleCanvas.getContext('2d');

        // 🔵 Draw circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 🖼️ Draw cropped image inside circle
        ctx.drawImage(canvas, 0, 0, size, size);

        // 📦 Convert to base64
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
    







    $scope.BindSiteList = function () {
        var collectionobj = {};
        collectionobj.Action = 34;
        collectionobj.LoginId = LoginId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SiteList = response.data.Result;
        });
    }

    $scope.EmployeeeMasterList = [];
    $scope.DisplayExcel = function () {
        $scope.showLoader();

        $scope.EmployeeeMasterList = [];

        var fileUploader = $('#input-excel');

        if (!fileUploader[0].files.length) {
            alert("Please select file");
            return;
        }

        var reader = new FileReader();
        reader.readAsArrayBuffer(fileUploader[0].files[0]);

        reader.onload = function (e) {

            var data = new Uint8Array(e.target.result);
            var wb = XLSX.read(data, { type: 'array' });

            var htmlstr = XLSX.write(wb, { sheet: "Sheet1", type: 'binary', bookType: 'html' });

            $('#wrapper').html(htmlstr).removeClass('d-none');

            var table = $('#wrapper').find('table');
            table.addClass('table table-bordered');

            $("tr:first-child td").each(function () {
                $(this).replaceWith('<th>' + $(this).text() + '</th>');
            });

            setTimeout(function () {

                var tr = table.find('tr');

                $.each(tr, function () {

                    var td = $(this).find('td');
                    if (td.length == 0) return;

                    var obj = {};

                    obj.RefEmployeeCode = $(td[0]).text();
                    obj.EmployeeName = $(td[1]).text();
                    obj.SiteName = $(td[2]).text();

                    obj.EmployeeDesignation = $(td[3]).text();
                    obj.EmployeeDepartment = $(td[4]).text();
                    obj.Father_Husband_Name = $(td[5]).text();
                    obj.Gendar = $(td[6]).text();
                    obj.MaritalStatus = $(td[7]).text();

                    obj.DateofBirth = $(td[8]).text();
                    obj.DOJ = $(td[9]).text();

                    obj.Status = $(td[10]).text();              // ✅ alag rakha
                    obj.PresentAddress = $(td[11]).text();      // ✅ shift kiya
                    obj.PermanemtAddress = $(td[12]).text();

                    obj.MobileNumber = $(td[13]).text();
                    obj.AlternativeMobileNumber = $(td[14]).text();
                    obj.EmployeeEmailID = $(td[15]).text();

                    obj.PANNumber = $(td[16]).text();
                    obj.AdharCardNumber = $(td[17]).text();

                    obj.PreviousUAN = $(td[18]).text();
                    obj.PFAccount = $(td[19]).text();

                    obj.BankAccountNumber = $(td[20]).text();
                    obj.BankIFSCCode = $(td[21]).text();

                    obj.PreviousESI = $(td[22]).text();
                    obj.GrossSalary = $(td[23]).text();

                    obj.NomineeName = $(td[24]).text();
                    obj.NomineeRelation = $(td[25]).text();
                    obj.NomineeDOB = $(td[26]).text();
                    obj.NomineeAddress = $(td[27]).text();

                    obj.MinimumWageCategory = $(td[28]).text();
                    obj.WageType = $(td[29]).text();
                    obj.WageDisbursementMode = $(td[30]).text();

                    obj.PPE = $(td[31]).text();
                    obj.PPEType = $(td[32]).text();

                    obj.SafetyTrainingStatus = $(td[33]).text();
                    obj.SiteInductionStatus = $(td[34]).text();
                    obj.PoliceVerificationStatus = $(td[35]).text();

                    obj.TempIDStatus = $(td[36]).text();
                    obj.TempIDNumber = $(td[37]).text();
                    obj.TempIDDate = $(td[38]).text();

                    obj.PermanentIDStatus = $(td[39]).text();
                    obj.PermanentIDNumber = $(td[40]).text();
                    obj.PermanentIDDate = $(td[41]).text();

                    $scope.EmployeeeMasterList.push(obj);
                });

                $scope.btnValiadte = true;
                $scope.disableValiadte = false;

                $scope.$applyAsync();

            }, 500);

            $scope.hideLoader();
        }
    };

    $scope.SaveRecord = function () {
        if (!$scope.EmployeeeMasterList || $scope.EmployeeeMasterList.length === 0) {
            showMsgBox('999', 'Alert', 'Please Select valid file', 'warning', 'btn-warning');
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
    //-------------------------------------end bulk

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
        });
    }
    $scope.SelectedPartyName = "";

    $scope.filterByParty = function (partyName) {
        $scope.SelectedPartyName = partyName;
    };

    $scope.GetEmployeeMaster = function () {

        var collectionobj = {
            ActionType: 4,
            PartyId: LoginId
        };

        myService.methode('POST', "../RetailSection/GetEmployeeMaster", JSON.stringify(collectionobj))
            .then(function (response) {

                $scope.EmployeeList = response.data.Result || [];
                
                $scope.PartyList = [];
                let unique = {};

                angular.forEach($scope.EmployeeList, function (item) {
                    if (item.PartyName && !unique[item.PartyName]) {
                        unique[item.PartyName] = true;
                        $scope.PartyList.push({ PartyName: item.PartyName });
                    }
                });

            });
    };

    $scope.act = 1;

    $scope.ShowDivEmployeeMasterGrid = function () {
        $scope.IsActionType = 1;
        $scope.SaveEmployee();
    };


    $scope.ResetEmployee = function () {
        debugger;

        // Basic fields
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
        // Dates
        $scope.DateofBirth = null;
        $scope.DOJ = null;
        $scope.DOBofNominee = null;
        $scope.LeavingDate = null;
        $scope.IssueDate = null;
        $scope.ValidTill = null;
        $scope.BloodGroup = '';
        // Address & Contact
        $scope.PresentAddress = '';
        $scope.PermanentAddress = '';
        $scope.AdharCardNumber = '';
        $scope.PANNumber = '';
        $scope.MobileNumber = '';
        $scope.AlternativeMobileNumber = '';
        $scope.EmployeeEmailID = '';

        // Bank
        $scope.BankAccountNumber = '';
        $scope.BankIFSCCode = '';

        // Other
        $scope.PreviousUAN = '';
        $scope.PreviousESI = '';
        $scope.GrossSalary = '';
        $scope.StoreCode = '';
        $scope.IsActive = 1;

        // Nominee
        $scope.NameofNominee = '';
        $scope.AddressofNominee = '';
        $scope.RelationofNominee = '';
        $scope.SiteId = '';
        // ✅ File Preview Reset
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

        $scope.EmployeePhotos = '';
        $scope.MinimumWageCategory = '';
        $scope.WageType = '';
        $scope.WageDisbursementMode = '';

        // Safety & Security
        $scope.PPE = '';
        $scope.PPEType = '';
        $scope.SafetyTrainingStatus = '';
        $scope.SiteInductionStatus = '';
        $scope.PoliceVerificationStatus = '';

        // Temporary ID
        $scope.TempIDStatus = '';
        $scope.TempIDNumber = '';
        $scope.TempIDDate = '';

        // Permanent ID
        $scope.PermanentIDStatus = '';
        $scope.PermanentIDNumber = '';
        $scope.PermanentIDDate = '';

        // 🔥 jQuery date fields bhi reset karo (important)
        $('#txtTempIDDate').val('');
        $('#PermanentIDDate').val('');

        // Optional: clear file inputs (important 🔥)
        $('input[type="file"]').val(null);

        // Action reset
        $scope.IsActionType = 1;
        $scope.act = 1;
    };

    $scope.SaveEmployee = function () {
        debugger;
        if (isValidate())
        {

            if ($scope.Transport === 'Yes') {

                if (!$scope.RouteId || $scope.RouteId === '') {
                    showMsgBox('999', 'Alert', 'Please Select Route', 'warning', 'btn-warning');
                    return;
                }

            } else {
                $scope.RouteId = '';
            }
            var _isFileValid = true;
            if ($scope.EditId == 0) {
                _isFileValid = IsFileValidation();
            }
            if (_isFileValid) {
                debugger;
                var formData = new FormData();
                formData.append("Id", $scope.EditId);
                formData.append("RefEmployeeCode", $scope.RefEmployeeCode);
                formData.append("PartyTypeId", 4);
                formData.append("PartyId", MapId);
                formData.append("UserId", LoginId);
                formData.append(
                    "LeavingDate",
                    ($scope.LeavingDate && $scope.LeavingDate !== ""
                        ? new Date($scope.LeavingDate).toISOString()
                        : "")
                );
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
                formData.append("BankIFSCCode", $scope.BankIFSCCode);
                formData.append("PreviousUAN", $scope.PreviousUAN);
                formData.append("PreviousESI", $scope.PreviousESI);
                formData.append("GrossSalary", $scope.GrossSalary);
                formData.append("DOJ", $scope.DOJ.toISOString());
                formData.append("IssueDate", $scope.IssueDate.toISOString());
                formData.append("ValidTill", $scope.ValidTill.toISOString());
                formData.append("BloodGroup", $scope.BloodGroup);

               
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

                // Safety & Security
                formData.append("PPE", $scope.PPE);
                formData.append("PPEType", $scope.PPEType);
                formData.append("SafetyTrainingStatus", $scope.SafetyTrainingStatus);
                formData.append("SiteInductionStatus", $scope.SiteInductionStatus);
                formData.append("PoliceVerificationStatus", $scope.PoliceVerificationStatus);

                // Temporary ID
                formData.append("TempIDStatus", $scope.TempIDStatus);
                formData.append("TempIDNumber", $scope.TempIDNumber);
                formData.append("TempIDDate", $('#txtTempIDDate').val());

                // Permanent ID
                formData.append("PermanentIDStatus", $scope.PermanentIDStatus);
                formData.append("PermanentIDNumber", $scope.PermanentIDNumber);
                formData.append("PermanentIDDate", $('#txtPermanentIDDate').val());

                formData.append("Transport", $scope.Transport);
                formData.append("RouteId", $scope.RouteId);

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
                            $scope.ResetEmployee();
                            $scope.GetEmployeeMaster();
                            $scope.IsActionType = 1;
                            $scope.act = 1; 
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error("Error saving employee data: " + error);
                    }
                });
            }
        }

    };
 
    $scope.getFileIconClass = function (fileModel) {
        return fileModel ? 'fa fa-check-square' : 'fa fa-plus';
    };
    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];

            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;

            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result; // ✅ base64
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
      
        // Find the selected employee in EmployeeList based on the employeeCode
        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === _Id;
        });

        if (selectedEmployee)
        {
            $scope.EditId = selectedEmployee.Id;
            // Set the selected employee data
            $scope.employee =
            {
                IsTransfer: selectedEmployee.IsTransfer,
                Id: selectedEmployee.Id,
                PartyTypeId: selectedEmployee.PartyTypeId,
                SiteId: selectedEmployee.Site,
                //UserId: selectedEmployee.UserId,
                Name: selectedEmployee.EmployeeName,
                DOJ: selectedEmployee.DisplayDOJ,
                IssueDate: selectedEmployee.IssueDate,
                ValidTill: selectedEmployee.ValidTill,
                BloodGroup: selectedEmployee.BloodGroup,
              

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
                Transport: selectedEmployee.Transport,
               
                RouteId: selectedEmployee.RouteId,

                
                    EmployeePhotos: selectedEmployee.EmployeePhotos
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
        debugger;
        function convertToDate(dateStr) {
            if (!dateStr) return null;
             
            dateStr = dateStr.replace('AM', '').replace('PM', '');

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
       
        $scope.EmployeePhotos= selectedEmployee.EmployeePhotos
        $scope.RefEmployeeCode = selectedEmployee.RefEmployeeCode;
        $scope.EmployeeName = selectedEmployee.EmployeeName;
        $scope.EmployeeDesignation = selectedEmployee.EmployeeDesignation;
        $scope.EmployeeDepartment = selectedEmployee.EmployeeDepartment;
        $scope.FatherHusbandName = selectedEmployee.Father_Husband_Name;
        $scope.Gender = selectedEmployee.Gendar;
        $scope.PFAccount = selectedEmployee.PFAccount,
        /*    $scope.LeavingDate = selectedEmployee.LeavingDate,*/
            $scope.MaritalStatus = selectedEmployee.MaritalStatus;

        


        $scope.DateofBirth = convertToDate(selectedEmployee.DateOfBirth);
        $scope.DOJ = convertToDate(selectedEmployee.DOJ);


        $scope.IssueDate = convertToDate(selectedEmployee.IssueDate);
        $scope.ValidTill = convertToDate(selectedEmployee.ValidTill);
        $scope.BloodGroup =  selectedEmployee.BloodGroup ;

       
        $scope.LeavingDate = convertToDate(selectedEmployee.LeavingDate);
        $scope.DOBofNominee = convertToDate(selectedEmployee.NomineeDOB);
        $scope.DOBofNominee = convertToDate(selectedEmployee.NomineeDOB);






    /*    $scope.DateofBirth = new Date(selectedEmployee.DateOfBirth);*/
        $scope.PresentAddress = selectedEmployee.PresentAddress;
        $scope.PermanentAddress = selectedEmployee.PermanemtAddress;
        $scope.AdharCardNumber = selectedEmployee.AdharCardNumber;
        $scope.PANNumber = selectedEmployee.PANNumber;
        $scope.MobileNumber = selectedEmployee.MobileNumber;
        $scope.AlternativeMobileNumber = selectedEmployee.AlternativeMobileNumber;
        $scope.EmployeeEmailID = selectedEmployee.EmployeeEmailID;
        $scope.BankAccountNumber = selectedEmployee.BankAccountNumber;
        $scope.BankIFSCCode = selectedEmployee.BankIFSCCode;
        $scope.PreviousUAN = selectedEmployee.PreviousUAN;
        $scope.PreviousESI = selectedEmployee.PreviousESI;
        $scope.GrossSalary = selectedEmployee.GrossSalary;
  
        $scope.NameofNominee = selectedEmployee.NomineeName;
        $scope.AddressofNominee = selectedEmployee.NomineeAddress;
        $scope.RelationofNominee = selectedEmployee.NomineeRelation;
   /*     $scope.DOBofNominee = new Date(selectedEmployee.NomineeDOB);*/
        $scope.StoreCode = selectedEmployee.StoreCode;
        $scope.PFAccount = selectedEmployee.PFAccount;
   /*     $scope.LeavingDate = new Date(selectedEmployee.LeavingDate);*/
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

        // Wage & Compliance
        $scope.MinimumWageCategory = selectedEmployee.MinimumWageCategory;
        $scope.WageType = selectedEmployee.WageType;
        $scope.WageDisbursementMode = selectedEmployee.WageDisbursementMode;

        // Safety & Security
        $scope.PPE = selectedEmployee.PPE;
        $scope.PPEType = selectedEmployee.PPEType;
        $scope.SafetyTrainingStatus = selectedEmployee.SafetyTrainingStatus;
        $scope.SiteInductionStatus = selectedEmployee.SiteInductionStatus;
        $scope.PoliceVerificationStatus = selectedEmployee.PoliceVerificationStatus;

        // Temporary ID
        $scope.TempIDStatus = selectedEmployee.TempIDStatus;
        $scope.TempIDNumber = selectedEmployee.TempIDNumber;
       
          $('#txtTempIDDate').val(selectedEmployee.TempIDDate);
        // Permanent ID
        $scope.PermanentIDStatus = selectedEmployee.PermanentIDStatus;
        $scope.PermanentIDNumber = selectedEmployee.PermanentIDNumber;
        $('#txtPermanentIDDate').val(selectedEmployee.PermanentIDDate);

        $scope.Transport = selectedEmployee.Transport,
            $scope.RouteId= selectedEmployee.RouteId,
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
    $scope.ExportToCSV = function () {
        if (!$scope.EmployeeList || $scope.EmployeeList.length === 0) {
            alert("No data to export");
            return;
        }
        var csv = [];
        var headers = [
            "Sr.No",
            "Employee Code",
            "Ref Employee Code",
            "Employee Name",
            "Designation",
            "D.O.J",
            "Department",
            "Compliance Status"
        ];
        csv.push(headers.join(","));
        angular.forEach($scope.EmployeeList, function (item, index) {
            var row = [
                index + 1,
                item.EmployeeCode || "",
                item.RefEmployeeCode || "",
                item.EmployeeName || "",
                item.EmployeeDesignation || "",
                item.DisplayDOJ || "",
                item.EmployeeDepartment || "",
                item.DocumentStatus || ""
            ];
            csv.push(row.join(","));
        });
        var csvString = csv.join("\n");
        var blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        var url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", "EmployeeMaster.csv");
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
            <title>Employee Master</title>
            <style>
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 8px; font-size: 12px; }
                th { background: #f2f2f2; }
            </style>
        </head>
        <body>
            <h3 style="text-align:center;">Employee Master</h3>
            <table>
                <thead>
                    <tr>
                        <th>Sr.No</th>
                        <th>Employee Code</th>
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
                th { background: #f2f2f2; }</style></head><body><h3 style="text-align:center;">Employee Master</h3><table><thead><tr><th>Sr.No</th><th>Employee Code</th>
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
        });html += `</tbody></table></body></html>`;

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

        // file input trigger karo (hidden input use karo)
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

                        // refresh list
                        $scope.BindEmpComplianceDoc($scope.EmCode);
                    }

                }, function (err) {
                    console.error(err);
                });
        };

        reader.readAsDataURL(file);
    };
}