app.NewEmployeeMasterController = function ($scope, $element, $filter, myService) {
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

               

                    // 🔥 Check if row is completely empty
                    var isEmpty = true;
                    td.each(function () {
                        if ($(this).text().trim() !== "") {
                            isEmpty = false;
                            return false; // break loop
                        }
                    });

                    if (isEmpty) return; // ❌ skip blank row

                    var obj = {};

                    obj.RefEmployeeCode = $(td[0]).text();
                    obj.EmployeeName = $(td[1]).text();
                    obj.SiteName = $(td[2]).text();

                    obj.EmployeeDesignation = $(td[3]).text();
                    obj.EmployeeDepartment = $(td[4]).text();
                    obj.FatherHusbandName = $(td[5]).text();
                    obj.Gender = $(td[6]).text();
                    obj.MaritalStatus = $(td[7]).text();

                    obj.DateofBirth = $(td[8]).text();
                    obj.DOJ = $(td[9]).text();

                    obj.PresentAddress = $(td[10]).text();
                    obj.PermanentAddress = $(td[11]).text();

                    obj.MobileNumber = $(td[12]).text();
                    obj.AlternativeMobileNumber = $(td[13]).text();
                    obj.EmployeeEmailID = $(td[14]).text();

                    obj.PANNumber = $(td[15]).text();
                    obj.AdharCardNumber = $(td[16]).text();

                    obj.UAN = $(td[17]).text();
                    obj.PFAccount = $(td[18]).text();

                    obj.BankAccountNumber = $(td[19]).text();
                    obj.BankIFSCCode = $(td[20]).text();

                    obj.PreviousESI = $(td[21]).text();
                    obj.GrossSalary = $(td[22]).text();

                    obj.NomineeName = $(td[23]).text();
                    obj.NomineeRelation = $(td[24]).text();
                    obj.NomineeDOB = $(td[25]).text();
                    obj.NomineeAddress = $(td[26]).text();

                    obj.MinimumWageCategory = $(td[27]).text();
                    obj.WageType = $(td[28]).text();
                    obj.WageDisbursementMode = $(td[29]).text();

                    obj.PPE = $(td[30]).text();
                    obj.PPEType = $(td[31]).text();

                    obj.SafetyTrainingStatus = $(td[32]).text();
                    obj.SiteInductionStatus = $(td[33]).text();
                    obj.PoliceVerificationStatus = $(td[34]).text();

                    obj.TempIDStatus = $(td[35]).text();
                    obj.TempIDNumber = $(td[36]).text();
                    obj.TempIDDate = $(td[37]).text();

                    obj.PermanentIDStatus = $(td[38]).text();
                    obj.PermanentIDNumber = $(td[39]).text();
                    obj.PermanentIDDate = $(td[40]).text();
                 
                    
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


    $scope.GetEmployeeMaster = function () {

        var collectionobj = {
            ActionType: 4,
            PartyId: LoginId
        };

        myService.methode('POST', "../RetailSection/GetEmployeeMaster", JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.EmployeeList = response.data.Result || [];
                $timeout(function () {
                    if ($.fn.DataTable.isDataTable('#example')) {
                        $('#example').DataTable().clear().destroy();
                    }
                    $('#example').DataTable({
                        dom: 'Bfrtip',
                        buttons: [
                            {
                                extend: 'csv',
                                filename: 'Employee Master',
                                orientation: 'landscape',
                                title: 'Employee Master',
                                exportOptions: { columns: [0, 1, 2, 4] },
                                action: function (e, dt, button, config) {
                                    $scope.ManageLog('Employee Master csv Download');
                                    $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
                                }
                            },
                            'excel',
                            {
                                extend: 'pdfHtml5',
                                text: 'Export PDF',
                                filename: 'Employee Master',
                                orientation: 'portrait',
                                pageSize: 'A4',
                                customize: function (doc) {
                                    doc.pageMargins = [20, 60, 20, 30];
                                    doc.styles.tableHeader.fontSize = 15;
                                    doc['header'] = {
                                        columns: [{ alignment: 'center', fontSize: 14, text: 'Employee Master' }],
                                        margin: 40
                                    };
                                },
                                exportOptions: { columns: [0, 1, 2, 4] },
                                action: function (e, dt, button, config) {
                                    $scope.ManageLog('Employee Master pdf Download');
                                    $.fn.dataTable.ext.buttons.pdfHtml5.action.call(this, e, dt, button, config);
                                }
                            },
                            {
                                extend: 'print',
                                filename: 'Employee Master',
                                orientation: 'portrait',
                                title: 'Employee Master',
                                customize: function (win) {
                                    $(win.document.body).addClass('white-bg')
                                        .css('font-size', '14px');
                                    $(win.document.body).find('table')
                                        .addClass('compact')
                                        .css('font-size', '14px')
                                        .css('color', 'black');
                                },
                                exportOptions: { columns: [0, 1, 2, 4] },
                                action: function (e, dt, button, config) {
                                    $scope.ManageLog('Employee Master print Download');
                                    $.fn.dataTable.ext.buttons.print.action.call(this, e, dt, button, config);
                                }
                            }
                        ]
                    });

                }, 500); // wait 0.5s for ng-repeat render
            });
    };



    $scope.ShowDivEmployeeMasterGrid = function () {
        $scope.IsActionType = 1;
        $scope.SaveEmployee();
    };

    $scope.SaveEmployee = function () {
        debugger;
        if (isValidate()) {
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
                formData.append("NameofNominee", $scope.NameofNominee);
                formData.append("AddressofNominee", $scope.AddressofNominee);
                formData.append("RelationofNominee", $scope.RelationofNominee);
                formData.append("DOBofNominee", $scope.DOBofNominee.toISOString());
                formData.append("StoreCode", $scope.StoreCode);
                formData.append("Status", $scope.IsActive);
                function getFileName(file) {
                    return file ? file.name : null;
                }
                function formatDate(date) {
                    var d = new Date(date);
                    var month = ('0' + (d.getMonth() + 1)).slice(-2);
                    var day = ('0' + d.getDate()).slice(-2);
                    var year = d.getFullYear();
                    return year + "-" + month + "-" + day;
                }
                formData.append("PANCardFilePath", getFileName($scope.PANCardFilePath));
                formData.append("Cheque_Passbook_FilePath", getFileName($scope.Cheque_Passbook_FilePath));
                formData.append("EducationCertificateFilePath", getFileName($scope.EducationCertificateFilePath));
                formData.append("ExperienceCertificateFilePath", getFileName($scope.ExperienceCertificateFilePath));
                formData.append("AdhaarCard_FrontSide_FilePath", getFileName($scope.AdhaarCard_FrontSide_FilePath));
                formData.append("AdhaarCard_BackSide_FilePath", getFileName($scope.AdhaarCard_BackSide_FilePath));
                formData.append("RelievingLetterfFilePath", getFileName($scope.RelievingLetterfFilePath));
                formData.append("PayslipsFilePath", getFileName($scope.PayslipsFilePath));
                formData.append("Photos_1_FilePath", getFileName($scope.Photos_1_FilePath));
                formData.append("Photos_2_FilePath", getFileName($scope.Photos_2_FilePath));
                formData.append("Photos_3_FilePath", getFileName($scope.Photos_3_FilePath));
                formData.append("Photos_4_FilePath", getFileName($scope.Photos_4_FilePath));

                // Wage & Compliance
                formData.append("MinimumWageCategory", $scope.MinimumWageCategory || "");
                formData.append("WageType", $scope.WageType || "");
                formData.append("WageDisbursementMode", $scope.WageDisbursementMode || "");

                // Safety & Security
                formData.append("PPE", $scope.PPE || "");
                formData.append("PPEType", $scope.PPEType || "");
                formData.append("SafetyTrainingStatus", $scope.SafetyTrainingStatus || "");
                formData.append("SiteInductionStatus", $scope.SiteInductionStatus || "");
                formData.append("PoliceVerificationStatus", $scope.PoliceVerificationStatus || "");

                // Temporary Gate Pass
                formData.append("TempIDStatus", $scope.TempIDStatus || "");
                formData.append("TempIDNumber", $scope.TempIDNumber || "");
                formData.append("TempIDDate", $scope.TempIDDate ? formatDate($scope.TempIDDate) : "");

                // Permanent Gate Pass
                formData.append("PermanentIDStatus", $scope.PermanentIDStatus || "");
                formData.append("PermanentIDNumber", $scope.PermanentIDNumber || "");
                formData.append("PermanentIDDate", $scope.PermanentIDDate ? formatDate($scope.PermanentIDDate) : "");

                formData.append("MedicalStatus", $scope.MedicalStatus);
                formData.append("NextMedicalDue", $scope.NextMedicalDue ? formatDate($scope.NextMedicalDue) : "");
                formData.append("FitnessTypes", $scope.FitnessTypes); 
                formData.append("MedicalCertificate_FilePath", $scope.MedicalCertificateFilePath__Preview); 
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
                            //if (data.Result == 1 || data.Result == 2) {
                            //window.top.location.href = '../RetailSection/EmployeeMaster?EmployeesMaster';
                            window.top.location.href = '../RetailSection/NewEmployeeMaster';
                            $scope.EmployeeMasterGrid = true;
                            $scope.EmployeeMasterForm = false;

                        }
                    },
                    error: function (xhr, status, error) {
                        console.error("Error saving employee data: " + error);
                    }
                });
            }
        }
    };
    $scope.ShowDivEmployeeMasterForm = function () {
        $scope.EmployeeMasterGrid = false;
        $scope.EmployeeMasterForm = true;
        $scope.IsActionType = 1;
        /*  $scope.GenerateEmployeeCode();*/
    };
    $scope.getFileIconClass = function (fileModel) {
        return fileModel ? 'fa fa-check-square' : 'fa fa-plus';
    };
    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            $scope[fieldName] = file;
            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result;
                $scope.$applyAsync();
                var iconClass = $scope.getFileIconClass($scope[fieldName + "_Preview"]);
            };
            filerdr.readAsDataURL(file);
        }
        else {
            $scope.$applyAsync();
        }
    };avew
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
    $scope.openEmployeeModal = function (_Id) {
        $scope.EmpId = _Id;
        $scope.BindTransfer(_Id);
        $scope.BindTransferStore(_Id);
        // Find the selected employee in EmployeeList based on the employeeCode
        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === _Id;
        });

        if (selectedEmployee) {
            $scope.EditId = selectedEmployee.Id;
            // Set the selected employee data
            $scope.employee = {
                IsTransfer: selectedEmployee.IsTransfer,
                Id: selectedEmployee.Id,
                PartyTypeId: selectedEmployee.PartyTypeId,
                //PartyId: selectedEmployee.PartyId,
                //UserId: selectedEmployee.UserId,
                Name: selectedEmployee.EmployeeName,
                DOJ: selectedEmployee.DisplayDOJ,

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
                EmployeePhoto: selectedEmployee.EmployeePhoto,
            };
            //showModal();
        } else {
            // Employee not found
            // Handle error or show a message
        }
    };
    $scope.viewDocument = function (documentPath) {
        $scope.openDocumentFunction(documentPath);
    };
    $scope.openDocumentFunction = function (documentPath) {
        window.open(documentPath, '_blank');
    };
    $scope.openModal = function (id) {
        $scope.EditEmployee(id);

        var modal = new bootstrap.Modal(document.getElementById('newEmployeeModal'));
        modal.show();
    };
    $scope.EditEmployee = function (Id) {
        debugger;
        var selectedEmployee = $scope.EmployeeList.find(function (employee) {
            return employee.Id === Id;
        });
        $scope.EditId = selectedEmployee.Id;
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
        $scope.RefEmployeeCode = selectedEmployee.RefEmployeeCode;
        $scope.EmployeeName = selectedEmployee.EmployeeName;
        $scope.EmployeeDesignation = selectedEmployee.EmployeeDesignation;
        $scope.EmployeeDepartment = selectedEmployee.EmployeeDepartment;
        $scope.FatherHusbandName = selectedEmployee.Father_Husband_Name;
        $scope.Gender = selectedEmployee.Gendar;
        $scope.PFAccount = selectedEmployee.PFAccount,
            $scope.LeavingDate = selectedEmployee.LeavingDate,
            $scope.MaritalStatus = selectedEmployee.MaritalStatus;
        $scope.DateofBirth = new Date(selectedEmployee.DateOfBirth);
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
        $scope.DOJ = new Date(selectedEmployee.DOJ);
        $scope.NameofNominee = selectedEmployee.NomineeName;
        $scope.AddressofNominee = selectedEmployee.NomineeAddress;
        $scope.RelationofNominee = selectedEmployee.NomineeRelation;
        $scope.DOBofNominee = new Date(selectedEmployee.NomineeDOB);
        $scope.StoreCode = selectedEmployee.StoreCode;
        $scope.PFAccount = selectedEmployee.PFAccount;
        $scope.LeavingDate = new Date(selectedEmployee.LeavingDate);
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
        $scope.EmployeePhoto = selectedEmployee.EmployeePhoto;
        $scope.ShowDivEmployeeMasterForm();
        $('#profileview').modal('hide');
        $scope.IsActionType = 2;
        $scope.EmployeeUploadDocs = false;

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
        collectionobj.Id = Id;
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
            $scope.BindTransferStore($scope.EmpId);
            $scope.BindTransfer($scope.EmpId);
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

}