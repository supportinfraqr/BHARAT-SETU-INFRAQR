app.NewEmployeeController = function ($scope, $element, $filter, myService, $http, $timeout) {

    $scope.rowLimit = 10
    $scope.viewAll = function () {
        $scope.rowLimit = $scope.EmployeeList.length; 
    };

    $scope.view10 = function () {
        $scope.rowLimit = 10;
    };
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
 
        $scope.IssueDate = convertToDate(Detail.IssueDate);
        $scope.ValidTill = convertToDate(Detail.ValidTill);
       $scope.RouteId = Detail.RouteId;
       $scope.ClientName = Detail.ClientName;
        $scope.AssignColor = Detail.AssignColor;
        $scope.backgroundcolor = Detail.backgroundcolor;
       $scope.BloodGroup = Detail.BloodGroup;
       $scope.CampNumber = Detail.CampNumber;

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

        if (!$scope.EmpCode) return "";

        var data =
            "https://login.ezcompliance.in/icard.html?id=" + $scope.EmpCode + "";

        return "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(data);
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
             
            if (isEmpty(obj.RefEmployeeCode)) errors.push("RefEmployeeCode");
            if (isEmpty(obj.EmployeeName)) errors.push("EmployeeName");
            if (isEmpty(obj.SiteName)) errors.push("SiteName");
            if (isEmpty(obj.EmployeeDesignation)) errors.push("Designation");
            if (isEmpty(obj.Father_Husband_Name)) errors.push("Father/Husband Name");
            if (isEmpty(obj.MaritalStatus)) errors.push("Marital Status");
            if (isEmpty(obj.DateofBirth)) errors.push("DOB");
            if (isEmpty(obj.DOJ)) errors.push("DOJ");
            if (isEmpty(obj.Status)) errors.push("Status");
            if (isEmpty(obj.MobileNumber)) errors.push("Mobile Number");
            if (isEmpty(obj.EmployeeEmailID)) errors.push("Email ID");
            if (isEmpty(obj.NomineeName)) errors.push("Nominee Name");
            if (isEmpty(obj.GrossSalary)) errors.push("Gross Salary");
             
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

                   
                    obj.RouteId = $(td[42]).text().trim();
                    obj.IssueDate = $(td[43]).text().trim();
                    obj.ValidTill = $(td[44]).text().trim();
                    obj.BloodGroup = $(td[45]).text().trim();
                    obj.CampNumber = $(td[46]).text().trim();
                    obj.State = $(td[47]).text().trim();
                    obj.City  = $(td[48]).text().trim();
                    obj.Pincode  = $(td[49]).text().trim();

                    let rowErrors = validateRow(obj, index + 1);

                    if (rowErrors.length > 0) {
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

            }, 500);
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

            if (isEmpty(obj.RefEmployeeCode)) rowErrors.push("RefEmployeeCode");
            if (isEmpty(obj.EmployeeName)) rowErrors.push("EmployeeName");
            if (isEmpty(obj.SiteName)) rowErrors.push("SiteName");
            if (isEmpty(obj.EmployeeDesignation)) rowErrors.push("Designation");
            if (isEmpty(obj.Father_Husband_Name)) rowErrors.push("Father/Husband Name");
            if (isEmpty(obj.MaritalStatus)) rowErrors.push("Marital Status");
            if (isEmpty(obj.DateofBirth)) rowErrors.push("DOB");
            if (isEmpty(obj.DOJ)) rowErrors.push("DOJ");
            if (isEmpty(obj.Status)) rowErrors.push("Status");
            if (isEmpty(obj.MobileNumber)) rowErrors.push("Mobile Number");
            if (isEmpty(obj.EmployeeEmailID)) rowErrors.push("Email ID");
            if (isEmpty(obj.NomineeName)) rowErrors.push("Nominee Name");
            if (isEmpty(obj.GrossSalary)) rowErrors.push("Gross Salary");

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
        getData.then(function (response)
        {
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
                formData.append("CampNumber", $scope.CampNumber);
                formData.append("State", $scope.State);
                formData.append("City", $scope.City);
                formData.append("Pincode", $scope.Pincode);

                
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
       
        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === _Id;
        });

        if (selectedEmployee)
        {
            $scope.EditId = selectedEmployee.Id; 
            $scope.employee =
            {
                IsTransfer: selectedEmployee.IsTransfer,
                Id: selectedEmployee.Id,
                PartyTypeId: selectedEmployee.PartyTypeId,
                SiteId: selectedEmployee.Site, 
                Name: selectedEmployee.EmployeeName,
                DOJ: selectedEmployee.DisplayDOJ,
                IssueDate: selectedEmployee.IssueDate,
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
                State: selectedEmployee.State,
                CityId: selectedEmployee.City,
                Pincode: selectedEmployee.Pincode,

                TempIDDate: selectedEmployee.TempIDDate	,
                PermanentIDStatus: selectedEmployee.PermanentIDStatus	,
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
        debugger;


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
       
        $scope.EmployeePhotos= selectedEmployee.EmployeePhotos
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


        $scope.IssueDate = convertToDate(selectedEmployee.IssueDate);
        $scope.ValidTill = convertToDate(selectedEmployee.ValidTill);
        $scope.BloodGroup = selectedEmployee.BloodGroup;
        $scope.CampNumber = selectedEmployee.CampNumber;
       
        $scope.LeavingDate = convertToDate(selectedEmployee.LeavingDate);
        $scope.DOBofNominee = convertToDate(selectedEmployee.NomineeDOB);
        $scope.DOBofNominee = convertToDate(selectedEmployee.NomineeDOB);





         
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





        $scope.State = selectedEmployee.State;
        $scope.City = selectedEmployee.City;
        $scope.Pincode = selectedEmployee.Pincode;

      
       
          $('#txtTempIDDate').val(selectedEmployee.TempIDDate);
 
        $scope.PermanentIDStatus = selectedEmployee.PermanentIDStatus;
        $scope.PermanentIDNumber = selectedEmployee.PermanentIDNumber;
        $('#txtPermanentIDDate').val(selectedEmployee.PermanentIDDate);
        $scope.EmployeePhotos = selectedEmployee.EmployeePhotos,
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
            
            "Document Status",
            "Father/Husband Name",
            "Gender",
            "Marital Status",
            "Date Of Birth",
            "Present Address",
            "Permanemt Address ",
            "Adhar CardNumber",
            "PAN Number",
            "Mobile Number",
            "Alternative Mobile Number",
            "Employee EmailID",
            "Bank AccountNumber",
            "Bank IFSCCode",
            "Previous UAN",
            "Previous ESI",
            "Gross Salary",
            "Nominee Name",
            "Nominee Address",
            "Nominee Relation",
            "Nominee DOB",
            "PF Account",
            "Leaving Date",
            "Is Transfer",
            "Minimum WageCategory",
            "Wage Type",
            "Wage Disbursement Mode",
            "PPE",
            "PPEType",
            "Safety Training Status",
            "Site Induction Status",
            "Police Verification Status",
            "TempID Status",
            "TempID Number",
            "TempID Date",
            "PermanentID Status",
            "PermanentID Number",
            "PermanentID Date",
            "Party Name",
            "Transport",
            "RouteId",
            "Issue Date",
            "Valid Till",
            "Blood Group",
            "Camp Number",
            "Site Name", 
            "Assign Color",
            "Vendor Name",
            "Route Name",
            "State",
             "City",
              "Pincode"
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
                item.DocumentStatus || "",
                item.Father_Husband_Name || "",
                item.Gendar || "",
                item.MaritalStatus || "",
                item.DateOfBirth || "",
                item.PresentAddress || "",
                item.PermanemtAddress || "",
                item.AdharCardNumber || "",
                item.PANNumber || "",
                item.MobileNumber || "",
                item.AlternativeMobileNumber || "",
                item.EmployeeEmailID || "",
                item.BankAccountNumber || "",
                item.BankIFSCCode || "",
                item.PreviousUAN || "",
                item.PreviousESI || "",
                item.GrossSalary || "",
                item.NomineeName || "",
                item.NomineeAddress || "",
                item.NomineeRelation || "",
                item.NomineeDOB || "",
                item.PFAccount || "",
                item.LeavingDate || "",
                item.IsTransfer || "",
                item.MinimumWageCategory || "",
                item.WageType || "",
                item.WageDisbursementMode || "",
                item.PPE || "",
                item.PPEType || "",
                item.SafetyTrainingStatus || "",
                item.SiteInductionStatus || "",
                item.PoliceVerificationStatus || "",
                item.TempIDStatus || "",
                item.TempIDNumber || "",
                item.TempIDDate || "",
                item.PermanentIDStatus || "",
                item.PermanentIDNumber || "",
                item.PermanentIDDate || "",
                item.PartyName || "",
                item.Transport || "",
                item.RouteId || "",
                item.IssueDate || "",
                item.ValidTill || "",
                item.BloodGroup || "",

                item.CampNumber ||"",
                item.SiteName || "", 
                item.AssignColor || "",
                item.VendorName || "",
                item.RouteName || "", 
                item.State || "",
                item.City || "",
                item.Pincode || "",
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
}