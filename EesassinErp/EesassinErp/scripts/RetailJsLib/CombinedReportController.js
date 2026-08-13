app.CombinedReportController = function ($scope, $element, $filter, myService) {
    //$scope.BindStore = function () {
    //    $scope.showLoader();
    //    var collectionobj = {};
    //    collectionobj.ActionType = 20; 
    //    collectionobj.UserId = MapId
    //    var getData = myService.methode('POST', ("../RetailSection/SearchStoreCompliance"), JSON.stringify(collectionobj));
    //    getData.then(function (response) {
    //        $scope.StoreList = response.data.Result;
    //        $scope.hideLoader();
    //    });
    //    $scope.hideLoader();
    //};


    $scope.BindStore = function () {
        var collectionobj = {};
        collectionobj.Id = LoginId;
        collectionobj.ActionType = 17;
        var getData = myService.methode('POST', "../Retail/GetStore", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.StoreList = response.data.Result;
        });
    }


    $scope.BindMonth = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 7 });
        getData.then(function (response) {
            debugger;
            $scope.MonthList = response.data;
        });
    }

    $scope.BindFinacialYear = function () {

        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 6 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data;
        });
    }
    // ==========================================
    // 🟢 SAVE FUNCTION
    // ========================================== 
    $scope.SaveRecordStage1 = function ($event) {
        var btn = $event.target;
        if (isValidate()) {
            if (!$scope.ExcelData1 || !$scope.ExcelData1.length) {
                alert("Please upload the Salary Excel file.");
                return;
            }
            if (!$scope.ExcelData2 || !$scope.ExcelData2.length) {
                alert("Please upload the UAN Master Excel file.");
                return;
            }
            var originalText = btn.innerText;
            btn.innerText = "Please wait...";
            btn.disabled = true;
            var payload = {
                Action: 1,
                PayRollType: $scope.PayRollType,
                Mode: $scope.Mode,
                StoreCode: $scope.StoreCode,
                Year: $scope.Year,
                Month: $scope.Month,
                LoginId: LoginId,
                ExcelData1: $scope.ExcelData1, // Salary Sheet
                ExcelData2: $scope.ExcelData2  // UAN Master
            };

            console.log("🚀 Payload Sending to Server:", payload);

            var getData = myService.methode('POST', "../RetailSection/SaveExcelData", JSON.stringify(payload));
            getData.then(function (response) {
                btn.innerText = "Saved Successfully!";
                $scope.callfromStage1();
                // ✅ After 3 seconds → show next step & reset button text
                setTimeout(function () {
                    btn.innerText = originalText;
                    btn.disabled = false;
                    showSalaryStep();
                }, 2000);

                /* alert(response.data.Message || "Data saved successfully!");*/
            }).catch(function (error) {
                console.error("❌ Error:", error);
                alert("Error while saving data!");
            });
        }
        function showSalaryStep() {
            document.getElementById('salaryStep').classList.remove('d-none');
            scrollToElement('salaryStep');
        }
    };


    // ==========================================
    // 🟩 UAN MASTER FILE (ExcelData2)
    // ==========================================
    $scope.ReadActiveExcel = function (fileInput) {
        var file = fileInput.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            var sheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[sheetName];
            var json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            function excelDateToJSDate(serial) {
                if (isNaN(serial)) return serial;
                var utc_days = Math.floor(serial - 25569);
                var utc_value = utc_days * 86400; // seconds
                var date_info = new Date(utc_value * 1000);
                return date_info.toISOString().split('T')[0]; // format yyyy-mm-dd
            }

            $scope.ExcelData2 = json.map(row => {
                var r = {};
                Object.keys(row).forEach(k => {
                    var normalizedKey = k.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
                    r[normalizedKey] = row[k];
                });

                let dob = r["DOB"] || r["DATEOFBIRTH"] || "";
                let doj = r["DOJ"] || r["DATEOFJOINING"] || "";

                // Convert Excel serial dates to yyyy-mm-dd if numeric
                if (!isNaN(dob) && dob !== "") dob = excelDateToJSDate(Number(dob));
                if (!isNaN(doj) && doj !== "") doj = excelDateToJSDate(Number(doj));

                return {
                    UAN: r["UAN"] || "",
                    MemberID: r["MEMBERID"] || "",
                    Name: r["NAME"] || "",
                    Gender: r["GENDER"] || "",
                    DoB: dob,
                    DoJ: doj,
                    FatherHusbandName: r["FATHERSHUSBANDSNAME"] || r["FATHERORHUSBANDNAME"] || "",
                    Relation: r["RELATION"] || "",
                    MaritalStatus: r["MARITALSTATUS"] || "",
                    Mobile: r["MOBILE"] || "",
                    EmailID: r["EMAILID"] || "",
                    AADHAAR: r["AADHAAR"] || r["AADHAR"] || "",
                    PAN: r["PAN"] || "",
                    BankAccountNo: r["BANKACCOUNTNO"] || "",
                    IFSCCode: r["IFSCCODE"] || "",
                    NominationFiled: r["NOMINATIONFILED"] || "",
                    IsAadhaarVerified: r["ISAADHAARVERIFIED"] || "",
                    FaceAuthStatus: r["FACEAUTHSTATUS"] || "",
                    PensionSchemeMember: r["WHETHERMEMBEROFPENSIONSCHEME"] || "",
                    ContributingOnHigherWages: r["EPSCONTRIBUTINGONHIGHERWAGES"] || "",
                    DeferredPension: r["DEFERREDPENSION"] || "",
                    InternationalWorker: r["INTERNATIONALWORKER"] || ""
                };
            });

            console.log("✅ Fully Mapped ExcelData2 (UAN Master):", $scope.ExcelData2);
            $scope.$apply();
        };

        reader.readAsArrayBuffer(file);
    };



    // ==========================================
    // 🟩 SALARY FILE (ExcelData1)
    // ==========================================
    $scope.ReadSalaryExcel = function (fileInput) {
        var file = fileInput.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            var sheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            var json = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

            // ✅ Normalize headers to uppercase & clean HTML tags
            $scope.ExcelData1 = json.map(row => {
                var r = {};
                Object.keys(row).forEach(k => {
                    // 🔹 Clean out <t>...</t> or any XML/HTML tags and extra spaces
                    const cleanKey = k.replace(/<[^>]*>/g, '').trim().toUpperCase();
                    r[cleanKey] = row[k];
                });

                return {
                    EmployeeCode: r["EMPLOYEE CODE"] || "",
                    EmployeeName: r["EMPLOYEE NAME"] || "",
                    DOJ: r["DOJ"] || "",
                    Designation: r["DESIGNATION"] || "",
                    InternationalWorker: r["INTERNATIONAL WORKER (YES/NO)"] || r["INTERNATIONAL WORKER"] || "",
                    POHW: r["POHW (YES/ NO)"] || r["POHW (YES/NO)"] || r["POHW YES/NO"] || r["POHW"] || "",
                    BranchLocation: r["BRANCH/LOCATION"] || "",
                    UANNumber: r["UAN NUMBER"] || "",
                    PFType: r["PF TYPE(CEILING/ BASIC)"] ||
                        r["PF TYPE (CEILING/BASIC)"] ||
                        r["PF TYPE"] ||
                        r["PF TYPE (CEILING / BASIC)"] ||
                        "",

                    ResignationDate: r["RESIGNATION DATE"] || "",
                    TotalWorkingDays: r["TOTAL WORKING DAYS"] || "",
                    EarnedGrossSalary: r["EARNED GROSS SALARY"] || "",
                    PFSalary: r["PF SALARY"] || "",
                    EmployeePFCont: r["EMPLOYEE'S PF CONT."] || "",
                    VPF: r["VPF"] || "",
                    ArrearGrossSalary: r["ARREAR GROSS SALARY"] || "",
                    ArrearPFSalary: r["ARREAR PF SALARY"] || "",
                    EmployeeESICCont: r["EMPLOYEE'S ESIC CONT."] || "",
                    PTax: r["P TAX"] || "",
                    LWF: r["LWF"] || "",
                    TotalDeduction: r["TOTAL DEDUCTION"] || "",
                    NetPayableSalary: r["NET PAYABLE SALARY"] || "",

                    PensionerEmployee: r["PENSIONER EMPLOYEE (YES/NO)"] || "",
                };
            });

            console.log("✅ Cleaned & Mapped ExcelData1 (Salary Sheet):", $scope.ExcelData1);
            $scope.$apply();
        };

        reader.readAsArrayBuffer(file);
    };


    $scope.DownloadEmpTableCSV = function () {
        if (!$scope.EmpTable || !$scope.EmpTable.length) {
            alert("No employee data available to download!,Firstly View");
            return;
        }

        // Step 1: Define CSV headers (same order as table)
        var headers = [
            "Employee Code", "Employee Name", "Employee Designation", "Employee Department",
            "Father/Husband Name", "Gender", "Marital Status", "Date of Birth",
            "Present Address", "Permanent Address", "Aadhar Card Number", "PAN Number",
            "Mobile Number", "Alternative Mobile Number", "Employee Email ID",
            "Bank Account Number", "Bank IFSC Code", "Previous UAN", "Previous ESI",
            "Gross Salary", "DOJ", "Name of Nominee", "Address of Nominee",
            "Relation of Nominee", "DOB of Nominee", "Store Code", "Status"
        ];

        // Step 2: Build CSV rows
        var csvRows = [];
        csvRows.push(headers.join(',')); // Add header row

        $scope.EmpTable.forEach(function (x) {
            var row = [
                x.EmployeeCode, x.EmployeeName, x.EmployeeDesignation, x.EmployeeDepartment,
                x.Father_Husband_Name, x.Gendar, x.MaritalStatus, x.DateOfBirth,
                x.PresentAddress, x.PermanemtAddress, x.AdharCardNumber, x.PANNumber,
                x.MobileNumber, x.AlternativeMobileNumber, x.EmployeeEmailID,
                x.BankAccountNumber, x.BankIFSCCode, x.PreviousUAN, x.PreviousESI,
                x.GrossSalary, x.DOJ, x.NomineeName, x.NomineeAddress,
                x.NomineeRelation, x.NomineeDOB, x.StoreCode, x.IsActive
            ];
            csvRows.push(row.map(value => `"${(value || '').toString().replace(/"/g, '""')}"`).join(',')); // escape commas/quotes
        });

        // Step 3: Convert to Blob and download
        var csvString = csvRows.join('\n');
        var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement("a");
        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "Employee_List.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    $scope.DownloadActiveTableCSV = function () {
        if (!$scope.ActiveMemberSheet || !$scope.ActiveMemberSheet.length) {
            alert("No active employee data available to download! Please view the data first.");
            return;
        }

        // Step 1: Define CSV headers (same order as your table)
        var headers = [
            "EmployeeCode", "UAN", "Member ID", "Name", "Gender", "DoB", "DoJ",
            "Father's/Husband's Name", "Relation", "Marital Status",
            "Mobile", "Email ID", "AADHAAR", "PAN",
            "Bank Account No", "IFSC Code", "Nomination Filed",
            "Is AADHAAR Verified", "Face Auth Status",
            "Whether Member of Pension Scheme",
            "EPS: Contributing on Higher Wages",
            "Deferred Pension", "International Worker"
        ];

        // Step 2: Build CSV rows
        var csvRows = [];
        csvRows.push(headers.join(',')); // Add header row

        $scope.Disableplease = false;

        $scope.ActiveMemberSheet.forEach(function (x) {
            var row = [
                x.UAN, x.MemberID, x.Name, x.Gender, x.DoB, x.DoJ,
                x.FatherHusbandName, x.Relation, x.MaritalStatus,
                x.Mobile, x.EmailID, x.AADHAAR, x.PAN,
                x.BankAccountNo, x.IFSCCode, x.NominationFiled,
                x.IsAadhaarVerified, x.FaceAuthStatus,
                x.PensionSchemeMember, x.ContributingOnHigherWages,
                x.DeferredPension, x.InternationalWorker
            ];
            // Escape commas and quotes
            csvRows.push(row.map(value => `"${(value || '').toString().replace(/"/g, '""')}"`).join(','));
        });

        // Step 3: Convert to CSV Blob and trigger download
        var csvString = csvRows.join('\n');
        var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement("a");

        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "Active_Employee_List.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    $scope.DownloadSalarySheetCSV = function () {
        if (!$scope.SalarySheet || !$scope.SalarySheet.length) {
            alert("No salary data available to download! Please view the data first.");
            return;
        }

        // Step 1: Define CSV headers (same order as table)
        var headers = [
            "Employee Code", "Employee Name", "DOJ", "Designation",
            "International Worker (Yes/No)", "POHW (Yes/No)",
            "Branch/Location", "UAN Number", "PF Type", "Resignation Date",
            "Total Working Days", "Earned Gross Salary", "PF Salary",
            "Employee's PF Cont.", "VPF", "Arrear Gross Salary",
            "Arrear PF Salary", "Employee's ESIC Cont.", "P Tax",
            "LWF", "Total Deduction", "Net Payable Salary",
            "Pensioner Employee (Yes/No)", "Created Date"
        ];

        // Step 2: Build CSV rows
        var csvRows = [];
        csvRows.push(headers.join(',')); // Add header row

        $scope.SalarySheet.forEach(function (x) {
            var row = [
                x.EmployeeCode, x.EmployeeName, x.DOJ, x.Designation,
                x.InternationalWorker, x.POHW, x.BranchLocation,
                x.UANNumber, x.PFType, x.ResignationDate,
                x.TotalWorkingDays, x.EarnedGrossSalary, x.PFSalary,
                x.EmployeePFCont, x.VPF, x.ArrearGrossSalary,
                x.ArrearPFSalary, x.EmployeeESICCont, x.PTax,
                x.LWF, x.TotalDeduction, x.NetPayableSalary,
                x.PensionerEmployee, x.CreatedDate
            ];
            // Escape commas and quotes safely
            csvRows.push(row.map(value => `"${(value || '').toString().replace(/"/g, '""')}"`).join(','));
        });

        // Step 3: Convert to CSV Blob and trigger download
        var csvString = csvRows.join('\n');
        var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement("a");

        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "Salary_Sheet.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    $scope.callfromStage1 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.PayRollType = $scope.PayRollType,
            collectionobj.Mode = $scope.Mode,
            collectionobj.StoreCode = $scope.StoreCode,
            collectionobj.Year = $scope.Year,
            collectionobj.Month = $scope.Month,
            collectionobj.LoginId = LoginId
        var getData = myService.methode('POST', ("../RetailSection/GetPAYROLLDetail"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (response.data.Result.Table1.length > 0) {
                showSalaryStep();
                $scope.Disableplease = true;
                $scope.EmpTable = response.data.Result.Table;
                $scope.SalarySheet = response.data.Result.Table1;
                $scope.ActiveMemberSheet = response.data.Result.Table2;
            }


        });
        $scope.hideLoader();
    };

    $scope.OpenMismatch = function () {
        new bootstrap.Modal(document.getElementById("MisserrorModal")).show();
    }

    $scope.ValidateAllSheet = function () {
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.PayRollType = $scope.PayRollType,
            collectionobj.Mode = $scope.Mode,
            collectionobj.StoreCode = $scope.StoreCode,
            collectionobj.Year = $scope.Year,
            collectionobj.Month = $scope.Month,
            collectionobj.LoginId = LoginId
        var getData = myService.methode('POST', ("../RetailSection/GetPAYROLLDetail"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.errorList1 = response.data.Result.Table;

            if (
                !$scope.DuplicateEmployeeTableRecord &&
                !$scope.DuplicateSalaryTableRecord &&
                !$scope.DuplicateActiveTableRecord &&
                $scope.errorList1.length === 0
            ) {
                // ✅ Validation Passed
                document.getElementById('validationFailed').classList.add('d-none');
                document.getElementById('validationPassed').classList.remove('d-none');
            } else {
                // ❌ Validation Failed
                document.getElementById('validationPassed').classList.add('d-none');
                document.getElementById('validationFailed').classList.remove('d-none');
            }


            if ($scope.errorList1.length > 0) {
                $scope.MisMatchTableRecord = true;
            }
            else { $scope.MisMatchTableRecord = false; }

        })
    }




    let isValid = false;

    $scope.callfromStagevalidationthreetable = function () {
        $scope.showLoader();
        const collectionobj = {
            Action: 3,
            PayRollType: $scope.PayRollType,
            Mode: $scope.Mode,
            StoreCode: $scope.StoreCode,
            Year: $scope.Year,
            Month: $scope.Month,
            LoginId: LoginId
        };

        const getData = myService.methode('POST', "../RetailSection/GetPAYROLLDetail", JSON.stringify(collectionobj));

        getData.then(function (response) {
            if (response.data && response.data.Result && response.data.Result.Table.length > 0) {

                const result = response.data.Result.Table[0];
                $scope.DuplicateEmployeeTableRecord = result.Duplicate_EmployeeMaster;
                $scope.DuplicateSalaryTableRecord = result.Duplicate_PayRollSalaryUpload;
                $scope.DuplicateActiveTableRecord = result.Duplicate_PayRollUANMasterUpload;
                $scope.ValidateAllSheet();
            }

            $scope.hideLoader();
        });


    };
    $scope.BeforeFixAll = function () {
        proceedConfirmbox("Are you sure you want to auto-fix all visible errors using EmployeeMaster values?", function () { $scope.FixAll(); });
    };

    // 🟩 NEW FUNCTION: FixAll
    $scope.FixAll = async function () {
        if (!$scope.errorList1 || $scope.errorList1.length === 0) {
            alert("No errors found to fix!");
            return;
        }

        const alreadyFixed = $scope.errorList1.some(x => x.IsFix == 1);
        if (alreadyFixed) { 
            showMsgBox('999', 'Alert', '⚠ Some records Unmatched & Missing.\nPlease re-upload the data before running Fix All again!', 'warning', 'btn-warning');
            return;
        }
        $scope.showLoader();

        // Sequential safe loop (waits one-by-one)
        for (let i = 0; i < $scope.errorList1.length; i++) {
            let x = $scope.errorList1[i];

            // ✅ Automatically use EmployeeMaster value as new value
            let autoValue = x.EmployeeMaster;

            // skip if EmployeeMaster value empty
            if (!autoValue || autoValue.trim() === '') continue;

            var collectionobj = {};

            if (x.UpdateTable == 'Active Sheet') {
                collectionobj.Action = 7;
                collectionobj.EmpId = x.MemberID;
            } else if (x.UpdateTable == 'Salary Sheet') {
                collectionobj.Action = 9;
                collectionobj.EmpId = x.RefEmployeeCode;
            } else {
                continue; // skip unknown
            }

            collectionobj.newValue = autoValue;
            collectionobj.columnname = x.ColumnName;
            collectionobj.StoreCode = $scope.StoreCode,
                collectionobj.Year = $scope.Year,
                collectionobj.Month = $scope.Month
            try {
                await myService.methode('POST', ("../RetailSection/UpdateerrorList"), JSON.stringify(collectionobj));
                console.log("✅ Fixed:", x.EmployeeCode, "=>", autoValue);
            } catch (err) {
                console.error("❌ Failed:", x.EmployeeCode, err);
            }
        }

        // ✅ Refresh after completion
        $scope.ValidateAllSheet();

        $scope.hideLoader();
        /*      alert("✅ All errors fixed using EmployeeMaster values!");*/
        showMsgBox('999', 'Resolved', '✅ All errors fixed using EmployeeMaster values!', 'success', 'btn-success');
        return;
    };

    $scope.checkBeforeFix = function (x) {

        // Check if ANY row in table has IsFix = 1
        var anyReuploadPending = $scope.errorList1.some(row => row.IsFix == 1);

        if (anyReuploadPending) {
            showMsgBox('999', 'Alert', '⚠ Some records Unmatched & Missing. Please re - upload the data before running Fix All again!', 'success', 'btn-success');
            return;
        }
        else {
            $scope.MstartEdit(x);
        }

        // Else normal flow
   
    };

    $scope.startEdit = function (item) {
        item.isEditing = true;
        item.newValue = item.ColumnName; // prefill with current value or blank
    };

    $scope.MstartEdit = function (item) {
        item.MisEditing = true;
        item.MnewValue = item.EmployeeMaster || '';  // prefill with EmployeeMaster value
    };
    $scope.redirectmater = function () {
        window.location.href = '../RetailSection/EmployeeMaster?Employees%20Master';
    }



    $scope.saveFix = function (x) {
        $scope.showLoader();
        var collectionobj = {};
        if (x.TableName == 'Employee') {
            showMsgBox('999', 'Alert', 'We cant update employee, contact to Admin', 'warning', 'btn-warning');
            return;
        }
        else if (x.TableName == 'Active/Inactive') { collectionobj.Action = 7 }
        else if (x.TableName == 'Salary') { collectionobj.Action = 9; }
        else { alert('Selction not found') }

        collectionobj.EmpId = x.Id,
            collectionobj.newValue = x.newValue,
            collectionobj.columnname = x.ColumnName
        collectionobj.StoreCode = $scope.StoreCode,
            collectionobj.Year = $scope.Year,
            collectionobj.Month = $scope.Month
        var getData = myService.methode('POST', ("../RetailSection/UpdateerrorList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.TableerrorList(x.TableName);
        });
        $scope.hideLoader();
        $('#errorModal').modal('hide');
    }

    $scope.MsaveFix = function (x) {
        $scope.showLoader();
        var collectionobj = {};
        if (x.UpdateTable == 'Active Sheet') {
            collectionobj.Action = 7
            $scope.Id = x.MemberID
        }
        else if (x.UpdateTable == 'Salary Sheet') { collectionobj.Action = 9; $scope.Id = x.RefEmployeeCode }
        else { alert('Selction not found') }

        collectionobj.EmpId = $scope.Id,
        collectionobj.newValue = x.MnewValue,
        collectionobj.columnname = x.ColumnName
        collectionobj.StoreCode= $scope.StoreCode,
        collectionobj.Year= $scope.Year,
        collectionobj.Month= $scope.Month 
        var getData = myService.methode('POST', ("../RetailSection/UpdateerrorList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.ValidateAllSheet();
        });
        $scope.hideLoader();
    }



    $scope.TableerrorList = function (TableHeader) {
        $scope.showLoader();
        var collectionobj = {};
        $scope.errorList = "";
        new bootstrap.Modal(document.getElementById("errorModal")).show();
        $scope.TableHeader = TableHeader;
        if (TableHeader == 'Employee') { collectionobj.Action = 4; }
        else if (TableHeader == 'Active/Inactive') { collectionobj.Action = 6; }
        else if (TableHeader == 'Salary') { collectionobj.Action = 8; }
        else { alert('Selction not found') }


        collectionobj.PayRollType = $scope.PayRollType,
            collectionobj.Mode = $scope.Mode,
            collectionobj.StoreCode = $scope.StoreCode,
            collectionobj.Year = $scope.Year,
            collectionobj.Month = $scope.Month,
            collectionobj.LoginId = LoginId
        var getData = myService.methode('POST', ("../RetailSection/GetPAYROLLDetail"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (response.data.Result.Table.length > 0) { $scope.errorList = response.data.Result.Table; } else { }
        });
        $scope.hideLoader();
    };//
    $scope.proceedToValidatedSheet = function () {
        $scope.Validationpassedstage3();
        if (typeof showValidatedSheetStep === "function") {
            showValidatedSheetStep();
        }
    };

    $scope.Validationpassedstage3 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.PayRollType = $scope.PayRollType,
            collectionobj.Mode = $scope.Mode,
            collectionobj.StoreCode = $scope.StoreCode,
            collectionobj.Year = $scope.Year,
            collectionobj.Month = $scope.Month,
            collectionobj.LoginId = LoginId
        collectionobj.Action = 10
        var getData = myService.methode('POST', ("../RetailSection/GetPAYROLLDetail"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.ValidationStageThree = response.data.Result.Table;
            $scope.MonthYear = $('#CMonth option:selected').text() + ' / ' + $('#ddlFinancialYear option:selected').text();
        });
        $scope.hideLoader();
    };//

    $scope.Validationpassedstage4 = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.PayRollType = $scope.PayRollType,
            collectionobj.Mode = $scope.Mode,
            collectionobj.StoreCode = $scope.StoreCode,
            collectionobj.Year = $scope.Year,
            collectionobj.Month = $scope.Month,
            collectionobj.LoginId = LoginId
        collectionobj.Action = 12
        var getData = myService.methode('POST', ("../RetailSection/GetPAYROLLDetail"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.ValidationStagefour = response.data.Result.Table;
        });
        $scope.hideLoader();
    };//


    $scope.getTotal = function (field) {
        if (!$scope.ValidationStageThree || $scope.ValidationStageThree.length === 0) return 0;
        var total = 0;
        angular.forEach($scope.ValidationStageThree, function (x) {
            total += parseFloat(x[field]) || 0;
        });
        return total;
    };

    $scope.ExportPFReport = async function () {

       
        $scope.Monthtext = $('#CMonth option:selected').text();
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("PF Report");

        // ==== HEADING ====
        ws.mergeCells('A1:H1');
        ws.getCell('A1').value = $scope.MapUser;
        ws.getCell('A1').font = { bold: true, size: 14 };
        ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        // ==== SUBHEADER ====
        ws.mergeCells('A2:D2');
        ws.getCell('A2').value =
            'PF Report for the month of ' +
            $('#CMonth option:selected').text().trim() +
            '/' +
            $('#ddlFinancialYear option:selected').text().trim();
        ws.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getCell('A2').font = { bold: true };

        ws.mergeCells('E2:H2');
        ws.getCell('E2').value = ' ';
        ws.getCell('E2').alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getCell('E2').font = { bold: true };

        ws.addRow([]);

        // ==== TABLE HEADER ====
        ws.mergeCells('A4:A5');
        ws.mergeCells('B4:B5');
        ws.mergeCells('C4:C5');
        ws.mergeCells('D4:D5');
        ws.mergeCells('E4:F4');
        ws.mergeCells('G4:H4');

        ws.getCell('A4').value = 'Sl. No.';
        ws.getCell('B4').value = 'Emp. Code';
        ws.getCell('C4').value = 'UAN';
        ws.getCell('D4').value = 'Name of Member';
        ws.getCell('E4').value = 'Employee Contribution';
        ws.getCell('G4').value = 'Employer Contribution';

        ws.getCell('E5').value = 'PF Earnings';
        ws.getCell('F5').value = 'Contribution EPF';
        ws.getCell('G5').value = 'EPF Difference';
        ws.getCell('H5').value = 'Pension Fund';

        for (let i = 4; i <= 5; i++) {
            ws.getRow(i).eachCell((cell) => {
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
        }

        // ==== DATA ====
        const data = $scope.ValidationStageThree || [];
        const startRow = 6;

        data.forEach((x, i) => {
            const row = ws.addRow([
                i + 1,
                x.EmployeeCode || '',
                x.UAN || '',
                x.NameAsPerActiveSheet || '',
                parseFloat(x.EPFWages || 0),
                parseFloat(x.EPFContribution || 0),
                parseFloat(x.EPF_EPSDiff367 || 0),
                parseFloat(x.EPSEmployer833 || 0)
            ]);
            row.eachCell((cell, col) => {
                cell.alignment = {
                    horizontal: (col >= 5 ? 'right' : 'center'),
                    vertical: 'middle'
                };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
        });

        // ==== GRAND TOTAL FIX ====
        const endRow = startRow + data.length - 1;
        const totalRow = ws.addRow([
            '', '', '', 'Grand Total',
            { formula: `SUM(E${startRow}:E${endRow})` },
            { formula: `SUM(F${startRow}:F${endRow})` },
            { formula: `SUM(G${startRow}:G${endRow})` },
            { formula: `SUM(H${startRow}:H${endRow})` }
        ]);

        totalRow.eachCell((cell, col) => {
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = {
                horizontal: (col === 4 ? 'left' : 'right'),
                vertical: 'middle'
            };
        });
        ws.getCell(`D${totalRow.number}`).alignment = { horizontal: 'left' };

        // ==== GAP ====
        ws.addRow([]);
        ws.addRow([]);

        // ==== ACCOUNT SUMMARY ====
        const totalEPFWages = $scope.getTotal('EPFWages');
        const totalEPFContribution = $scope.getTotal('EPFContribution');
        const totalEPFDiff = $scope.getTotal('EPF_EPSDiff367');
        const totalEPS = $scope.getTotal('EPSEmployer833');
      
        const totalSEPS = $scope.getTotal('EPS');
        const totalVPS = $scope.getTotal('VPS');

        const accountSummary = [
            `Account No:01 (Column Nos.6+7) = ${((totalEPFContribution || 0) + (totalEPFDiff || 0)).toFixed(2)}`,
            `Account No:02 (0.50000% of Col.5) = ${((totalEPFWages || 0) * 0.005).toFixed(2)}`,
            `Account No:03 (0.50000% of Col.5) = ${((totalEPFWages || 0) * 0.005).toFixed(2)}`,
            `Account No:04 (0.50000% of Col.5) = ${((totalEPFWages || 0) * 0.005).toFixed(2)}`,
            `Account No:05 (0.50000% of Col.5) = ${((totalEPFWages || 0) * 0.005).toFixed(2)}`,
            `TOTAL : ${((totalEPFContribution || 0) + (totalEPFDiff || 0) + (totalEPS || 0)).toFixed(2)}`
        ];

        accountSummary.forEach((line) => {
            const r = ws.addRow([]);
            ws.mergeCells(`A${r.number}:H${r.number}`);
            ws.getCell(`A${r.number}`).value = line;
            ws.getCell(`A${r.number}`).alignment = { horizontal: 'right', vertical: 'middle' };
            ws.getCell(`A${r.number}`).font = { bold: true };
        });

        ws.addRow([]);

        // ==== EMPLOYEE INFO ====
        const footerData = [
            `Total No. of Employees in the Month: ${data.length}`,
            `VPS: ${((totalVPS || 0)).toFixed(2)}`,
            `EDLI Wages :  ${((totalSEPS || 0)).toFixed(2)}  ; Pension Wages :  ${((totalEPFWages || 0)).toFixed(2)}`
        ];

        footerData.forEach((line) => {
            const r = ws.addRow([]);
            ws.mergeCells(`A${r.number}:H${r.number}`);
            ws.getCell(`A${r.number}`).value = line;
            ws.getCell(`A${r.number}`).alignment = { horizontal: 'left', vertical: 'middle' };
            ws.getCell(`A${r.number}`).font = { bold: true };
        });

        // ==== COLUMN WIDTHS ====
        ws.columns = [
            { width: 8 },
            { width: 12 },
            { width: 15 },
            { width: 25 },
            { width: 18 },
            { width: 18 },
            { width: 15 },
            { width: 15 },
        ];

        // ==== SAVE FILE ====
        const buf = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buf]), "PF_Compliance_Report.xlsx");
    };











}
     