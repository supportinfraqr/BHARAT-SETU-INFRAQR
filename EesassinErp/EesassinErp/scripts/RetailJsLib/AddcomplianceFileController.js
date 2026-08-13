app.AddcomplianceFileController = function ($scope, $element, $filter, myService, $http, $compile, $timeout, $q) {
    $scope.SelectedActs = [];
    $scope.selectAllActs = false;
    $scope.dropdownOpenActs = false;

    //-----------------------------------Download All----------------
    var $interpolate = angular.element(document.body).injector().get('$interpolate');

    $scope.SelectedStates = [];

    // Toggle function for checkboxes
    $scope.toggleStateSelection = function (code) {
        const idx = $scope.SelectedStates.indexOf(code);
        if (idx > -1) {
            // remove
            $scope.SelectedStates.splice(idx, 1);
        } else {
            // add
            $scope.SelectedStates.push(code);
        }
    };

    $scope.DownloadSelected = async function () {
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
      
        $scope.downloading = true;
        console.log("📁 Starting BulkDocument process...");
        $scope.downloading = true;
        $scope.downloadAlertMessage ="⚠️ Process initiated. Please avoid refreshing the page until completion."
        $scope.downloadMessage = "📁 Starting BulkDocument process...";

        // Step 1: simulate initialization
        await delay(500); 
        $scope.downloadMessage = "⏳ Preparing files...";
        $scope.$applyAsync();

        const selectedStateIds = ($scope.SelectedStates && $scope.SelectedStates.length > 0)
            ? $scope.SelectedStates.join(',')
            : '';

        const collectionobj = {
            Action: 16,
            CMonth: $scope.CMonth,
            FY: $scope.FY,
            Id: MapId,
            StateId: selectedStateIds,
            StoreId: $scope.StoreId,
            LoginId : LoginId,
            ComplianceCategory: $.trim($('#ddlComplianceCategory option:selected').text())
        };

        try {
            const response = await myService.methode('POST', "../RetailSection/GetBulkReportlist", '{obj:' + JSON.stringify(collectionobj) + '}');
            const list = response.data?.Result?.Table || [];

            if (!list.length) {
                showMsgBox("No records found!");
                await delay(500);
                $scope.downloadAlertMessage = "";
                $scope.downloadMessage = ""; 
                $scope.$applyAsync(); 
                return;
            }
            $scope.downloadMessage = "📄 Found " + list.length + " documents.";

            console.log("📄 Found " + list.length + " documents.");
            const zip = new JSZip();

            // 🔁 Loop through all documents
            for (let i = 0; i < list.length; i++)
            {
                const doc = list[i];
                if (!doc.DocumentId) {
                    $scope.downloadSkipMessage = `${doc.HeaderHtml} (${doc.STATE_NM})`;
                    $scope.$applyAsync();  // <-- call before return
                  
                }
                await delay(500);
                $scope.downloadMessage = `🧾 [${i + 1}/${list.length}] Processing ${doc.DocumentName} (${doc.STATE_NM} / ${doc.StoreCode})`;

                if (i == list.length - 1) {
                    await delay(500);
                    $scope.downloadAlertMessage = "✅ Bulk document process completed.";
                    $scope.$applyAsync();
                }


                console.log(`🧾 [${i + 1}/${list.length}] Processing ${doc.DocumentName} (${doc.STATE_NM} / ${doc.StoreCode})`);

                const pdfBlob = await $scope.BulkDocument(doc);

              

                if (pdfBlob)
                {
                    // ✅ Ensure State folder
                    const stateFolder = zip.folder(doc.STATE_NM);

                    // ✅ Inside that, ensure Store folder
                    const storeFolder = stateFolder.folder(doc.StoreCode);

                    // ✅ Add PDF file inside that store folder
                    storeFolder.file(`${doc.DocumentName}.pdf`, pdfBlob);
                } else {
                    console.log("⚠️ Skipped (no PDF):", doc.DocumentName);
                    $scope.downloadSkipMessage += "⚠️ Skipped (no PDF):", doc.DocumentName ;
                }

            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            $scope.downloadMessage = "🎉 ZIP saved successfully!";
            await delay(2000);
            $scope.downloadMessage = "";
            $scope.downloadAlertMessage = "";
            $scope.downloadSkipMessage = "";
            $scope.$applyAsync();
            console.log("🎉 ZIP saved successfully!");
            console.log("✅ Bulk document process completed.");
            saveAs(zipBlob, "BulkRegisterDocument.zip");
           
        } catch (err) {
            console.log("Error fetching bulk data:", err);
            alert("Bulk download failed.");
            $scope.downloadMessage = "❌ Error during bulk download.";
        } finally {
            $scope.downloading = false;
        }
    };


    $scope.BulkDocument = async function (doc) {
		 
        try {
            const collectionobj = {
                Action: 10,
                CMonth: $scope.CMonth,
                FY: $scope.FY,
                Id: MapId,
                DocumentId: doc.DocumentId,
                StateId: doc.STATE_NM,
                StoreId: doc.StoreId,
                ComplianceCategory: 'Establishment'
            };

            const response = await myService.methode('POST', "../RetailSection/GetReportlist", '{obj:' + JSON.stringify(collectionobj) + '}');
            const result = response?.data?.Result;

            if (!result || !result.length) {
                console.log("No data found for", doc.DocumentName);
                return null;
            }
          




                $scope.DocumentDetailList = response.data.Result;
                $scope.PartyName = response.data.Result[0].PartyName;
                $scope.ContactPerson = response.data.Result[0].ContactPerson;
                $scope.Address = response.data.Result[0].PMAddress;
			
                $scope.Month = $scope.getMonthName(response.data.Result[0].Month);
                $scope.Signature = response.data.Result[0].Signature;
                $scope.Nature_ofWork_contractor = response.data.Result[0].Nature_ofWork_contractor;
                $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.MaleCount = response.data.Result[0].MaleCount;
                $scope.FemaleCount = response.data.Result[0].FemaleCount;
                $scope.TotalEmployee = response.data.Result[0].TotalEmployee;
                $scope.if_mother_dies_child_survive_beneift = response.data.Result[0].if_mother_dies_child_survive_beneift;
                $scope.Date_Of_Joining = response.data.Result[0].Date_Of_Joining;
                $scope.Employee_Name = response.data.Result[0].Employee_Name;
                $scope.Nature_ofWork_contractor = response.data.Result[0].Nature_ofWork_contractor;
                $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.Date_proofof_pregnancy = response.data.Result[0].Date_proofof_pregnancy;
                $scope.Birth_date_of_child = response.data.Result[0].Birth_date_of_child;
                $scope.Date_of_Miscarriage = response.data.Result[0].Date_of_Miscarriage;
                $scope.Date_and_Amount_for_maternity_Beneift = response.data.Result[0].Date_and_Amount_for_maternity_Beneift;
                $scope.Amountof_wages_Paid_section9 = response.data.Result[0].Amountof_wages_Paid_section9;
                $scope.Amountof_wages_Paidleave_section10 = response.data.Result[0].Amountof_wages_Paidleave_section10;
                $scope.Nominated_person = response.data.Result[0].Nominated_person;
                $scope.Women_dies_Date_and_beneift_person = response.data.Result[0].Women_dies_Date_and_beneift_person;
                $scope.Total_Days_Worked = response.data.Result[0].Total_Days_Worked;
                $scope.if_mother_dies_child_survive_beneift = response.data.Result[0].if_mother_dies_child_survive_beneift;
                $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.Maternity_Days = response.data.Result[0].Maternity_Days;
                $scope.Designation = response.data.Result[0].Designation;
                $scope.Department = response.data.Result[0].Department;
                $scope.Father_Name = response.data.Result[0].Father_Name;
                $scope.Name_of_contractor = response.data.Result[0].Name_of_contractor;
            $scope.Address_of_contractor = response.data.Result[0].Address_of_contractor;
            $scope.Location = response.data.Result[0].Location;

            const html = doc.HeaderHtml;

            // Generate and return PDF Blob
            const pdfBlob = await $scope.GeneratePDFBlob(html, doc.DocumentName, doc.StoreCode, doc.STATE_NM);
            return pdfBlob;

        } catch (err) {
            console.error("BulkDocument failed for", doc.DocumentName, err);
            return null;
        }
    };


   

    $scope.GeneratePDFBlob = async function (html, DocName, Storecode, State) {
        return new Promise(async (resolve) => {
            const printArea = document.getElementById('print-area');
            if (!printArea) {
                console.error("print-area element not found!");
                resolve(null);
                return;
            }

            printArea.innerHTML = html;

            // Compile AngularJS bindings
            try {
                $compile(angular.element(printArea).contents())($scope);
                $scope.$applyAsync();
            } catch (e) {
                console.error("Angular compile failed:", e);
            }

            // Wait to ensure bindings complete
            await new Promise(r => setTimeout(r, 400));

            try {
                const canvas = await html2canvas(printArea, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#fff",
                    scale: 2
                });

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF("p", "mm", "a4");

                const pageWidth = 210;
                const pageHeight = 297;
                const margin = 10;
                const imgWidth = pageWidth - (2 * margin);
                const imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = margin;
                const imgData = canvas.toDataURL("image/jpeg", 1.0);

                pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - margin * 2);

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight + margin;
                    pdf.addPage();
                    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
                    heightLeft -= (pageHeight - margin * 2);
                }

                const pdfBlob = pdf.output("blob");
                resolve(pdfBlob);
            } catch (err) {
                console.error("PDF generation failed:", err);
                resolve(null);
            }
        });
    };





    //------------------------------------------------------------
    $scope.BindStore = function () { 
        $scope.showLoader();
        var collectionobj = {};
         collectionobj.ActionType = 17;   
        collectionobj.Ids = $scope.ComplianceCategory;
        collectionobj.StoreCode = $scope.StateId;
        collectionobj.UserId = MapId 
        var getData = myService.methode('POST', ("../RetailSection/SearchStoreCompliance"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };


    $scope.LoadStore = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 18;
        collectionobj.Ids = $scope.ComplianceCategory;
        collectionobj.StoreCode = $scope.StateId;
        collectionobj.UserId = MapId
        var getData = myService.methode('POST', ("../RetailSection/SearchStoreCompliance"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.NewStoreList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };

    $scope.BindAct = function (StoreCode) {
        $scope.showLoader();
        var collectionobj = {}; 
        collectionobj.ActionType = 4;
        collectionobj.Id = LoginId;
        collectionobj.StoreCode = StoreCode
        var getData = myService.methode('POST', ("../RetailSection/SearchCompliance"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.ActList = response.data.Result; 
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };

    $scope.toggleAllActs = function () {
        if ($scope.selectAllActs) {
            $scope.SelectedActs = $scope.ActList.map(x => x.Act);
        } else {
            $scope.SelectedActs = [];
        }
    };

    $scope.toggleAct = function (actName) {
        const idx = $scope.SelectedActs.indexOf(actName);
        if (idx > -1) {
            $scope.SelectedActs.splice(idx, 1);
        } else {
            $scope.SelectedActs.push(actName);
        }

        $scope.selectAllActs = ($scope.SelectedActs.length === $scope.ActList.length);
    };

    $scope.setTab = function (tab) {
        $scope.currentTab = tab;
    };

    $scope.isActiveTab = function (tab) {
        return $scope.currentTab === tab;
    };

    $scope.BindFinacialYear = function () {

        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 6 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data;
        });
    }
    $scope.BindMonth = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 7 });
        getData.then(function (response) {
            debugger;
            $scope.MonthList = response.data;
        });
    }
    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": "1" });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }

    $scope.BindDocumentList = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        var getData = myService.methode('POST', "../RetailSection/GetComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.DocumentList = response.data.Result;

        });
    }


    // Initialize SelectedDocument array
    $scope.SelectedDocument = [];

    // Toggle a single document
    // Toggle a single document
    $scope.toggleDocument = function (documentId) {
        const idx = $scope.SelectedDocument.indexOf(documentId);
        if (idx > -1) {
            // Already selected, remove
            $scope.SelectedDocument.splice(idx, 1);
        } else {
            // Not selected, add
            $scope.SelectedDocument.push(documentId);
        }
        // If any deselected, uncheck Select All
        $scope.selectAll = $scope.SelectedDocument.length === $scope.DocumentList.length;
    };

    // Toggle all documents
    $scope.toggleAllDocument = function () {
        if ($scope.selectAll) {
            // Select all
            $scope.SelectedDocument = $scope.DocumentList.map(function (d) { return d.Id; });
        } else {
            // Deselect all
            $scope.SelectedDocument = [];
        }
    };

    // Clear selection
    $scope.clearSelection = function () {
        $scope.selectAll = false;
        $scope.SelectedDocument = [];
    };


    $scope.Panel = false;


    $scope.OpenPanel = function () {
        $scope.existSection = true;
    }
    $scope.AllData = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.Month = $scope.CMonth;
        collectionobj.Year = $scope.FY;
        collectionobj.LoginId = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                proceedConfirmbox("Found Duplicate Record , Do you want to show ?", function () { $scope.confirmData(); });

            }
            else {
                $scope.Panel = false; $scope.existSection = false; $('#wrapper').html(''); $('#miscellaneousSection').html('');
            }

        });
    }
    $scope.confirmData = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.State = $scope.StateId;
        collectionobj.Month = $scope.CMonth;
        collectionobj.Year = $scope.FY;
        collectionobj.LoginId = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllList = response.data.Result;
            if (response.data.Result.length > 0) {
                swal.close();
                $scope.Panel = true;
                $scope.AllerdData();
            }
            else { $scope.Panel = false; }
        });
    }
    $scope.AllerdData = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.State = $scope.StateId;
        collectionobj.Month = $scope.CMonth;
        collectionobj.Year = $scope.FY;
        collectionobj.LoginId = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllerdList = response.data.Result;
        });
    }
    $scope.ExcelMasterList = [];
    /* === Excel upload & preview (dynamic header + day-columns) ================== */

    $scope.DisplayExcel = function () {

        $scope.ExcelMasterList = [];
        $scope.showLoader();

        const file = document.getElementById("input-excel").files[0];
        if (!file) {
            alert("Please select a file.");
            $scope.hideLoader();
            return;
        }

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        reader.onload = function (e) {

            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]]; 
            const range = XLSX.utils.decode_range(ws["!ref"]);
            while (range.e.r > 0) {
                const rowAddress = XLSX.utils.encode_cell({ r: range.e.r, c: 0 });
                const cell = ws[rowAddress];

                if (!cell || !cell.v || cell.v.toString().trim() === "") {
                    range.e.r--;
                } else {
                    break;
                }
            }
            ws["!ref"] = XLSX.utils.encode_range(range);
            // Read full sheet as 2D array (FASTEST)
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });



            if (rows.length < 2) {
                alert("Excel is empty.");
                $scope.hideLoader();
                return;
            }

            // First row = header
            const header = rows[0].map(h => (h || "").toString().trim().toLowerCase());

            // Find EmployeeCode column
            let empIndex = header.findIndex(h =>
                h === "employeecode" ||
                h === "employee code" ||
                h === "employeeid" ||
                h === "employee id" ||
                h === "empcode" ||
                h === "emp id"
            );

            if (empIndex === -1) empIndex = 0; // fallback first column

            // Detect max days (Day1, Day01, 1, 01)
            const dayColumns = [];
            header.forEach((h, idx) => {
                const m = h.match(/^(day)?0?([0-9]{1,2})$/);
                if (m) {
                    const day = parseInt(m[2], 10);
                    if (day >= 1 && day <= 31) {
                        dayColumns.push({ day: day, index: idx });
                    }
                }
            });

            const maxDay = Math.max(...dayColumns.map(x => x.day));

            let html = '<h4>Attendance Section</h4><table class="table table-bordered" style="width:max-content;"><thead><tr>';
            html += '<th>Employee_Code</th>';
            for (let d = 1; d <= maxDay; d++) html += `<th>Day${d}</th>`;
            html += '</tr></thead><tbody>';

            // Process rows
            for (let i = 1; i < rows.length; i++) {

                const row = rows[i];
                if (!row || row.length < 1) continue;

                const empCode = row[empIndex] ? row[empIndex].toString().trim() : "";

                if (!empCode) continue; // skip row if employee code missing

                let obj = {
                    EmployeeId: empCode,
                    Month: $scope.CMonth,
                    Year: $scope.FY,
                    State: $scope.StateId
                };

                html += `<tr><td>${empCode}</td>`;

                for (let d = 1; d <= maxDay; d++) {
                    const col = dayColumns.find(x => x.day === d);
                    const val = col ? (row[col.index] || "") : "";
                    obj["Day" + d] = val;
                    html += `<td>${val}</td>`;
                }

                html += '</tr>';

                $scope.ExcelMasterList.push(obj);
            }

            html += "</tbody></table>";

            // Display table
            $('#wrapper').html(html).css({
                maxHeight: '500px',
                overflow: 'auto',
                border: '1px solid #ccc',
                padding: '10px'
            });
            $scope.DisplaymiscellaneousSectionOnly();
            $scope.$applyAsync();
            $scope.hideLoader();
        };
    };





    $scope.DisplaymiscellaneousSectionOnly = function () {
        $scope.showLoader();
        $scope.MiscExcelList = [];

        const file = $('#input-excel')[0].files[0];
        if (!file) {
            alert('Please select a file.');
            $scope.hideLoader();
            return;
        }

        const rdr = new FileReader();
        rdr.readAsArrayBuffer(file);

        rdr.onload = () => {
            const wb = XLSX.read(new Uint8Array(rdr.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];

            const range = XLSX.utils.decode_range(ws["!ref"]);
            while (range.e.r > 0) {
                const rowAddress = XLSX.utils.encode_cell({ r: range.e.r, c: 0 });
                const cell = ws[rowAddress];

                if (!cell || !cell.v || cell.v.toString().trim() === "") {
                    range.e.r--;
                } else {
                    break;
                }
            }
            ws["!ref"] = XLSX.utils.encode_range(range);




            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

            let headerRowIndex = rawRows.findIndex(r => r.some(cell => /employee/i.test(cell)));
            if (headerRowIndex === -1) headerRowIndex = 3;

            const header = rawRows[headerRowIndex] || [];
            const dataRows = rawRows.slice(headerRowIndex + 1);

            const normalizeKey = str => (str || '').toString().trim()
                .replace(/[\u00A0\r\n]+/g, ' ')
                .replace(/\s+/g, ' ')
                .toLowerCase();

            const headerMap = {};
            header.forEach((cell, idx) => {
                const key = normalizeKey(cell);
                if (key) headerMap[key] = idx;
            });

            const col = (row, name) => {
                const normalizedKey = normalizeKey(name);
                const index = headerMap[normalizedKey];
                return index !== undefined ? (row[index] || '') : '';
            };

            const miscFields = [
                "Employee_Code", "Employee_Name", "Gender", "Father_Name", "Date_of_Birth", "Age", "Date_Of_Joining", "Date_Of_Leaving",
                "Designation", "Department", "Shift", "Branch_Address", "Address", "Location", "State", "Month", "Account_No", "Bank_Name",
                "Name_of_contractor", "Address_of_contractor", "Nature_ofWork_contractor", "Tenure_of_Employement", "Bank_transaction_ID",
                "UAN_No", "ESIC_No", "Name_of_Dispensary", "Wage_Paid", "Month_end_to", "Month_Starts_From", "NO_ofunit_Per_Piece",
                "Total_Days_Worked", "Interval_From", "Interval_To", "Payment_Mode", "Festival", "Absent_Days", "Weekoff", "Arrears_Days",
                "Total_workhours", "Work_Hours_from", "Work_Hours_to", "Loss_of_pay_LOP", "Fixed_Basic_Wages", "House_rent_Allowance",
                "Dearness_Allowance", "Special_Allowance", "Statutory_Bonus", "Medical", "Other_allowance", "Fixed_Gross", "Earned_Basic_Wages",
                "Arrear_of_Basic_Wages", "Earned_Dearness_Allowance", "Arrear_of_Dearness_Allowance", "Earned_House_Rent_Allowance",
                "Arrear_of_House_rent_Allowance", "Earned_Special_Allowance", "Arr_of_Special_Allowance", "Overtime_Allowance",
                "Other_Allowances", "EarnedCity_Compensation_Allowance", "Meal_Payouts", "Earned_Gratuity", "Gross_Wages",
                "PF_Deductions", "Arrear_of_PF", "VPF_Deduction", "Arr_VPF", "ESIC_Deductions", "Arrear_of_ESIC", "PT_Deductions",
                "Lwf_Deductions", "TDS_Deductions", "Medical_Deduction", "Society", "Insurance", "Fine_Deduction", "Overtime_deduction",
                "Salary_Advance", "Other_Deduction", "Total_Deductions", "Recoveries", "Net_Salary", "Recovery_Type", "Particulars",
                "Date_of_Damage", "Recovery_Amount", "Show_Cause_Issued", "Explanation_Heard_By", "Installments_Count", "First_Month_Year",
                "Last_Month_Year", "Recovery_Complete_Date", "Date", "Time", "Place", "Accident_Cause", "Injury_Nature",
                "Injured_Person_Activity", "Notice_Given_Name", "Witness_Name", "Witness_Address", "Witness_Occupation",
                "Injured_Return_Date", "Injured_Absent_Days", "Fine_Offence_Nature", "Fine_Offence_Date", "Fine_Show_Cause_Date",
                "Fine_Realised_Date", "Fine_Amount", "Fine_heardBY", "Deduction_Amount", "Loss_Caused", "Deduction_Show_Cause_Date",
                "Deduction_Date", "Deduction_Installments", "Deduction_Realised_Date", "Overtime_from", "Overtime_To", "Overtime_Date",
                "Overtime_Extent", "Overtime_Total", "Normal_Hours", "Normal_Rate", "Overtime_Rate", "Normal_Earnings",
                "Overtime_Earnings", "Total_Earnings", "Overtime_Payment_Date", "Advance_Amount", "Advance_Date", "Advance_Purpose",
                "Advance_Installments", "Advance_Postponements", "Advance_Repaid_Date", "Advance_Repaid_Amount", "Date_of_Application",
                "Leave_starts_From", "TO_Leave", "Annual_Leave", "Paternity_Leave", "Sick_Leaves", "Casual_Leaves", "Privilieged_Leaves",
                "if_Leave_Refuses", "Reason_LeaveRefuses", "Previous_Balance_Leave", "Credit_Leave", "Earned_Leave", "Nature_of_Leave",
                "Total_Leave", "Balance_Leave", "Maternity", "Maternity_Leave_Type", "Maternity_From", "Maternity_To",
                "Date_Women_notice_Under_Sec6", "Date_of_Discharge", "Date_proofof_pregnancy", "Birth_date_of_child", "Date_of_Miscarriage",
                "Date_of_illness", "Date_and_Amount_inadvance_Delievery", "Date_and_Amount_for_maternity_Beneift", "Amount_ifpaid_section8",
                "Amountof_wages_Paid_section9", "Amountof_wages_Paidleave_section10", "Nominated_person", "Women_dies_Date_and_beneift_person",
                "if_mother_dies_child_survive_beneift", "Deduction_Incentive", "Holiday_List", "Holiday_Day", "Holiday_Date", "Earned_Statutory_Bonus", "Earned_Medical", "Name_of_Employer","StoreCode","ComplianceCategory"

            ];


            // ✅ Duplicate check ke liye ek map
            const seen = {
                Employee_Code: new Map(),
                UAN_No: new Map(),
                ESIC_No: new Map(),
                Account_No: new Map()
            };

            let html = '<h4>OtherColumn Section</h4><table class="table table-bordered table-striped" style="width:max-content;">';
            html += '<thead><tr><th>Employee_Code</th>';
            miscFields.forEach(f => html += `<th>${f}</th>`);
            html += '</tr></thead><tbody>';

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const empCode = (row[0] || '').toString().trim();
                if (!empCode) continue;

                let rowObj = { EmployeeId: empCode };
                html += `<tr><td>${empCode}</td>`;

                let duplicateFound = false;

                //miscFields.forEach(f => {
                //    const val = col(row, f);
                //    rowObj[f.replace(/\s+/g, '_').replace(/[^\w]/g, '')] = val;
                //    html += `<td>${val}</td>`;

                //    // ✅ Check duplicate for only important fields
                //    if (["Employee_Code", "UAN_No", "ESIC_No", "Account_No"].includes(f) && val) {
                //        if (seen[f].has(val)) {
                //            alert(`⚠ Duplicate found in column "${f}" at row ${i + headerRowIndex + 1}. Already exists at row ${seen[f].get(val)}.`);
                //            duplicateFound = true;
                //        } else {
                //            seen[f].set(val, i + headerRowIndex + 1); // Save row index
                //        }
                //    }
                //});

                //if (!duplicateFound) {
                //    $scope.MiscExcelList.push(rowObj);
                //}
                //html += '</tr>';
                miscFields.forEach(f => {
                    const val = col(row, f) ? col(row, f).toString().trim() : ""; // normalize value
                    rowObj[f.replace(/\s+/g, '_').replace(/[^\w]/g, '')] = val;
                    html += `<td>${val}</td>`;

                    // ✅ Duplicate check only for important fields
                    if (["Employee_Code", "UAN_No", "ESIC_No", "Account_No"].includes(f)) {
                        // 🚫 Skip if blank or "-"
                        if (val && val !== "-") {
                            if (seen[f].has(val)) {
                                alert(`⚠ Duplicate found in column "${f}" at row ${i + headerRowIndex + 1}. Already exists at row ${seen[f].get(val)}.`);
                                duplicateFound = true;
                            } else {
                                seen[f].set(val, i + headerRowIndex + 1); // Save row index
                            }
                        }
                    }
                });

                if (!duplicateFound) {
                    $scope.MiscExcelList.push(rowObj);
                }
                html += '</tr>';

            }

            html += '</tbody></table>';
            $('#miscellaneousSection').html(html);

            $scope.$applyAsync();
            $scope.hideLoader();
        };
    };
    $scope.hasColumnData = function (list, column) {
        if (!list || list.length === 0) {
            return false;
        }
        return list.some(function (item) {
            var val = item[column];
            if (val === null || val === undefined) return false;

            // normalize string
            var str = val.toString().trim();

            // treat empty, "-" , "--" etc. as blank
            if (str === "" || str === "-") return false;

            return true;
        });
    };




    $scope.SaveRecord = function () {
        var fileInput = document.getElementById("input-excel");

        // ✅ Check if file is selected
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) { 
            showMsgBox("Please select an Excel file before submitting!");
            return; // 🚫 Stop here
        }
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.State = $scope.StateId;
        collectionobj.Month = $scope.CMonth;
        collectionobj.Year = $scope.FY;
        collectionobj.LoginId = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                proceedConfirmbox("Found Duplicate Record , Do you want to Deactive All Previous Record ?", function () { $scope.DeleteRecord(); });

            }
            else {
                $scope.AfterSaveRecord();
            }
        });
    }
    $scope.DeleteRecord = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.State = $scope.StateId;
        collectionobj.Month = $scope.CMonth;
        collectionobj.Year = $scope.FY;
        collectionobj.LoginId = MapId;
        var getData = myService.methode('POST', "../RetailSection/GetComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result[0].Message == '1') {
                $scope.AfterSaveRecord();
            }
        });
    }
    // ✅ Function to validate State, ComplianceCategory, StoreCode
    function validateMiscList(list, allStates, newStoreList) {
        if (!list || list.length === 0) return true;

        let invalidRecords = [];

        // ✅ Prepare valid state names (case-insensitive)
        const validStates = (allStates || []).map(s => (s.STATE_NM || "").toLowerCase().trim());

        // ✅ Allowed Compliance Categories
        const validCompliance = ["establishment"];

        // ✅ Prepare valid StoreCode list from $scope.NewStoreList
        const validStores = (newStoreList || []).map(s => (s.SCode || "").toLowerCase().trim());

        list.forEach((record, index) => {
            const rowNum = index + 1;
            let issues = [];

            const state = (record.State || "").toString().trim();
            const compliance = (record.ComplianceCategory || "").toString().trim();
            const store = (record.StoreCode || "").toString().trim();

            // ✅ State validation
            if (!state) {
                issues.push("State is blank");
            } else if (!validStates.includes(state.toLowerCase())) {
                issues.push(`Invalid State: "${state}"`);
            }

            // ✅ ComplianceCategory validation
            if (!compliance) {
                issues.push("ComplianceCategory is blank");
            } else if (!validCompliance.includes(compliance.toLowerCase())) {
                issues.push(`Invalid ComplianceCategory: "${compliance}"`);
            }

            // ✅ StoreCode validation
            if (!store) {
                issues.push("StoreCode is blank");
            } else if (!validStores.includes(store.toLowerCase())) {
                issues.push(`Invalid StoreCode: "${store}"`);
            }

            if (issues.length > 0) {
                invalidRecords.push(`Row ${rowNum}: ${issues.join(", ")}`);
            }
        });

        if (invalidRecords.length > 0) {

            showMsgBox("Validation failed:\n\n" + invalidRecords.join("\n"));
           
            return false;
        }
        return true;
    }




    $scope.AfterSaveRecord = function () {
        if (!isValidate()) return;

        // Validate: Check for missing EmployeeId
        const missingEmployee = ($scope.ExcelMasterList || []).some(x =>
            !x.EmployeeId || x.EmployeeId.toString().trim() === ""
        );
        if (missingEmployee) {
            alert("One or more records are missing Employee Code. Please correct them before saving.");
            return;
        }
        
        if (!validateMiscList($scope.MiscExcelList, $scope.AllStateList, $scope.NewStoreList)) {
            return; // stop saving
        }
       

        $scope.showLoader();

        // ERD Mapping (if needed later)
        const erdMap = {};
        ($scope.ERDExcelList || []).forEach(e => {
            erdMap[e.EmployeeId] = e;
        });

        function formatMaternityList(list) {
            return (list || []).map(x =>
                `${x.EmployeeId || ""},${x.Maternity || ""},${x.Maternity_From || ""},${x.Maternity_To || ""},${x.FROM || ""},${x.TO || ""}`
            ).join('|');
        }

        function formatMiscList(list) {
            const miscFields = [
                "Employee_Code", "Employee_Name", "Gender", "Father_Name", "Date_of_Birth", "Age", "Date_Of_Joining", "Date_Of_Leaving",
                "Designation", "Department", "Shift", "Branch_Address", "Address", "Location", "State", "Month", "Account_No", "Bank_Name",
                "Name_of_contractor", "Address_of_contractor", "Nature_ofWork_contractor", "Tenure_of_Employement", "Bank_transaction_ID",
                "UAN_No", "ESIC_No", "Name_of_Dispensary", "Wage_Paid", "Month_end_to", "Month_Starts_From", "NO_ofunit_Per_Piece",
                "Total_Days_Worked", "Interval_From", "Interval_To", "Payment_Mode", "Festival", "Absent_Days", "Weekoff", "Arrears_Days",
                "Total_workhours", "Work_Hours_from", "Work_Hours_to", "Loss_of_pay_LOP", "Fixed_Basic_Wages", "House_rent_Allowance",
                "Dearness_Allowance", "Special_Allowance", "Statutory_Bonus", "Medical", "Other_allowance", "Fixed_Gross", "Earned_Basic_Wages",
                "Arrear_of_Basic_Wages", "Earned_Dearness_Allowance", "Arrear_of_Dearness_Allowance", "Earned_House_Rent_Allowance",
                "Arrear_of_House_rent_Allowance", "Earned_Special_Allowance", "Arr_of_Special_Allowance", "Overtime_Allowance",
                "Other_Allowances", "EarnedCity_Compensation_Allowance", "Meal_Payouts", "Earned_Gratuity", "Gross_Wages",
                "PF_Deductions", "Arrear_of_PF", "VPF_Deduction", "Arr_VPF", "ESIC_Deductions", "Arrear_of_ESIC", "PT_Deductions",
                "Lwf_Deductions", "TDS_Deductions", "Medical_Deduction", "Society", "Insurance", "Fine_Deduction", "Overtime_deduction",
                "Salary_Advance", "Other_Deduction", "Total_Deductions", "Recoveries", "Net_Salary", "Recovery_Type", "Particulars",
                "Date_of_Damage", "Recovery_Amount", "Show_Cause_Issued", "Explanation_Heard_By", "Installments_Count", "First_Month_Year",
                "Last_Month_Year", "Recovery_Complete_Date", "Date", "Time", "Place", "Accident_Cause", "Injury_Nature",
                "Injured_Person_Activity", "Notice_Given_Name", "Witness_Name", "Witness_Address", "Witness_Occupation",
                "Injured_Return_Date", "Injured_Absent_Days", "Fine_Offence_Nature", "Fine_Offence_Date", "Fine_Show_Cause_Date",
                "Fine_Realised_Date", "Fine_Amount", "Fine_heardBY", "Deduction_Amount", "Loss_Caused", "Deduction_Show_Cause_Date",
                "Deduction_Date", "Deduction_Installments", "Deduction_Realised_Date", "Overtime_from", "Overtime_To", "Overtime_Date",
                "Overtime_Extent", "Overtime_Total", "Normal_Hours", "Normal_Rate", "Overtime_Rate", "Normal_Earnings",
                "Overtime_Earnings", "Total_Earnings", "Overtime_Payment_Date", "Advance_Amount", "Advance_Date", "Advance_Purpose",
                "Advance_Installments", "Advance_Postponements", "Advance_Repaid_Date", "Advance_Repaid_Amount", "Date_of_Application",
                "Leave_starts_From", "TO_Leave", "Annual_Leave", "Paternity_Leave", "Sick_Leaves", "Casual_Leaves", "Privilieged_Leaves",
                "if_Leave_Refuses", "Reason_LeaveRefuses", "Previous_Balance_Leave", "Credit_Leave", "Earned_Leave", "Nature_of_Leave",
                "Total_Leave", "Balance_Leave", "Maternity", "Maternity_Leave_Type", "Maternity_From", "Maternity_To",
                "Date_Women_notice_Under_Sec6", "Date_of_Discharge", "Date_proofof_pregnancy", "Birth_date_of_child", "Date_of_Miscarriage",
                "Date_of_illness", "Date_and_Amount_inadvance_Delievery", "Date_and_Amount_for_maternity_Beneift", "Amount_ifpaid_section8",
                "Amountof_wages_Paid_section9", "Amountof_wages_Paidleave_section10", "Nominated_person", "Women_dies_Date_and_beneift_person",
                "if_mother_dies_child_survive_beneift", "Deduction_Incentive", "Holiday_List", "Holiday_Day", "Holiday_Date", "Earned_Statutory_Bonus", "Earned_Medical", "Name_of_Employer",  "StoreCode", "ComplianceCategory"
            ];


            return (list || []).map(record => {
                return miscFields.map(field => {
                    const key = field.replace(/\s+/g, '_').replace(/[().]/g, '').replace(/__/g, '_');
                    return record[key] || "";
                }).join(',');
            }).join('|');
        }


        var collectionobj = {
            AttendanceList: $scope.ExcelMasterList || [],
            MaternityExcelList: formatMaternityList($scope.MaternityExcelList),
            MiscExcelList: formatMiscList($scope.MiscExcelList),
            Action: 1,
            LoginId: LoginId
        };

        var formData = new FormData();
        formData.append("obj", JSON.stringify(collectionobj));

        var fileInput = document.getElementById('signatureFile');
        var file = fileInput?.files?.[0];
        if (file) {
            formData.append("SignatureFile", file);
        }

        $http.post("/Api/RetailSectionApi/IUDBulkComplianceExcel", formData, {
            transformRequest: angular.identity,
            headers: { "Content-Type": undefined }
        }).then(function (response) {
            $scope.hideLoader();
            showMsgBox(response.data.result || "Saved successfully.");
        }).catch(function (error) {
            $scope.hideLoader();
            alert("Error occurred while saving: " + (error?.data?.Message || error.statusText));
            console.error(error);
        });
    };

    $scope.search = {};

    $scope.customFilter = function (item) {
        return (!$scope.search.DocumentName || (item.DocumentName && item.DocumentName.toLowerCase().includes($scope.search.DocumentName.toLowerCase()))) &&
            (!$scope.search.DocumentType || (item.DocumentType && item.DocumentType.toLowerCase().includes($scope.search.DocumentType.toLowerCase()))) &&
            (!$scope.search.Act || (item.Act && item.Act.toLowerCase().includes($scope.search.Act.toLowerCase()))) &&
            (!$scope.search.FormNo || (item.FormNo && item.FormNo.toLowerCase().includes($scope.search.FormNo.toLowerCase()))) &&
            (!$scope.search.Criticality || (item.Criticality && item.Criticality.toLowerCase().includes($scope.search.Criticality.toLowerCase()))) &&
            (!$scope.search.DocumentType2 || (item.DocumentType && item.DocumentType.toLowerCase().includes($scope.search.DocumentType2.toLowerCase()))) &&
            (!$scope.search.Frequency || (item.Frequency && item.Frequency.toLowerCase().includes($scope.search.Frequency.toLowerCase())));
    };

    $scope.closeModal = function () {
        document.getElementById('employeeModal').style.display = 'none';
        $scope.loading = {};   // ya jo bhi aapko karna hai
        $scope.$apply();       // zaroori hai, taki AngularJS update ho
    };

    $scope.dropdownOpenActs = false;

    $scope.toggleDropdown = function ($event) {
        $event.stopPropagation();
        $scope.dropdownOpenActs = !$scope.dropdownOpenActs;
    };

    // Outside click listener
    document.addEventListener('click', function () {
        $scope.$apply(function () {
            $scope.dropdownOpenActs = false;
        });
    });
    $scope.Doclist = false;

    $scope.BindAllDocumentList = function () {
        if (!isValidate()) return;
        $scope.searching = true;
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.StateId = $scope.StateId;
        collectionobj.StoreId = $scope.StoreId;
        collectionobj.CMonth = $scope.CMonth;
        collectionobj.FY = $scope.FY;
        collectionobj.NewActList = $scope.SelectedActs;
        var getData = myService.methode('POST', "../RetailSection/GetReportlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.searching = false;
            $scope.DocumentList = response.data.Result;
            if (response.data.Result.length > 0) {
                $scope.Doclist = true;
            }
            else {
                showMsgBox("Sorry!, Compliance Not Generated yet");

                $scope.Doclist = false;
            }
        });
    }





    $('.modal-backdrop').remove();
    $scope.loading = {};
    var newhtml = '';
    $scope.Doctype = '';
    $scope.DocName = '';
    $scope.ApproveBeforeDownload = function (html, Allowed, DocumentId, Doctype, DocName) {
        $scope.loading[DocumentId] = true;
        newhtml = '';
        if (Allowed == 1)
        {
            var collectionobj = {
                Action: 11,
                CMonth: $scope.CMonth,
                FY: $scope.FY,
                Id: MapId,
                StateId : $.trim($('#ddlState option:selected').text()),
                StoreId : $scope.StoreId,
                ComplianceCategory : $.trim($('#ddlComplianceCategory option:selected').text())
            };
            var getData = myService.methode('POST', "../RetailSection/GetReportlist", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.EmployeeDetail = response.data.Result;
                // Modal open trigger
                angular.element("#employeeModal").css("display", "block");
                newhtml = html;
                $scope.Doctype = Doctype;
                $scope.DocName = DocName;
                $scope.DocumentId = DocumentId;
            });
        }
        else {
            $scope.Downloadlink(html, Allowed, DocumentId, Doctype, DocName)
        }

    };
    $scope.DocumentId = '';
    // Print button click
    $scope.PrintEmployee = function () {
       
        $scope.Downloadlink(newhtml, $scope.SelectedEmployee, $scope.DocumentId , $scope.Doctype, $scope.DocName );
    };

    $scope.Downloadlink = function (html, SelectedEmployee, DocumentId, Doctype, DocName) {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.CMonth = $scope.CMonth;
        collectionobj.FY = $scope.FY;
        collectionobj.Id = MapId
        collectionobj.LoginId = SelectedEmployee
        collectionobj.DocumentId = DocumentId;
        collectionobj.StateId = $.trim($('#ddlState option:selected').text());
        collectionobj.StoreId = $scope.StoreId; 
        collectionobj.ComplianceCategory = $.trim($('#ddlComplianceCategory option:selected').text());
        var getData = myService.methode('POST', "../RetailSection/GetReportlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response && response.data && response.data.Result && response.data.Result.length > 0) {
                $scope.DocumentDetailList = response.data.Result; 
            $scope.PartyName = response.data.Result[0].PartyName;
            $scope.ContactPerson = response.data.Result[0].ContactPerson;
            $scope.Address = response.data.Result[0].PMAddress;
            $scope.Month = $scope.getMonthName(response.data.Result[0].Month);
            $scope.Signature = response.data.Result[0].Signature;
            $scope.Nature_ofWork_contractor = response.data.Result[0].Nature_ofWork_contractor;
            $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
            $scope.MaleCount = response.data.Result[0].MaleCount;
            $scope.FemaleCount = response.data.Result[0].FemaleCount;
            $scope.TotalEmployee = response.data.Result[0].TotalEmployee;
            $scope.if_mother_dies_child_survive_beneift = response.data.Result[0].if_mother_dies_child_survive_beneift;
            $scope.Date_Of_Joining = response.data.Result[0].Date_Of_Joining;
            $scope.Employee_Name = response.data.Result[0].Employee_Name;
            $scope.Nature_ofWork_contractor = response.data.Result[0].Nature_ofWork_contractor;
            $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
            $scope.Date_proofof_pregnancy = response.data.Result[0].Date_proofof_pregnancy;
            $scope.Birth_date_of_child = response.data.Result[0].Birth_date_of_child;
            $scope.Date_of_Miscarriage = response.data.Result[0].Date_of_Miscarriage;
            $scope.Date_and_Amount_for_maternity_Beneift = response.data.Result[0].Date_and_Amount_for_maternity_Beneift;
            $scope.Amountof_wages_Paid_section9 = response.data.Result[0].Amountof_wages_Paid_section9;
            $scope.Amountof_wages_Paidleave_section10 = response.data.Result[0].Amountof_wages_Paidleave_section10;
            $scope.Nominated_person = response.data.Result[0].Nominated_person;
            $scope.Women_dies_Date_and_beneift_person = response.data.Result[0].Women_dies_Date_and_beneift_person;
            $scope.Total_Days_Worked = response.data.Result[0].Total_Days_Worked;
            $scope.if_mother_dies_child_survive_beneift = response.data.Result[0].if_mother_dies_child_survive_beneift;
            $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.Maternity_Days = response.data.Result[0].Maternity_Days;
                $scope.Designation = response.data.Result[0].Designation;
                $scope.Department = response.data.Result[0].Department;
                $scope.Father_Name = response.data.Result[0].Father_Name;
                $scope.Name_of_contractor = response.data.Result[0].Name_of_contractor;
                $scope.Address_of_contractor = response.data.Result[0].Address_of_contractor; 
                $scope.Location = response.data.Result[0].Location;
                
            if (Doctype == 1) {
                $scope.DownloadCompiledHtml(html);
            }
            else if (Doctype == 2) {
                $scope.DownloadAllAsExcel(html, DocName);
            }
            else if (Doctype == 3) {
                $scope.DownloadAllAsPDF(html, DocName);
            }
                $scope.loading[DocumentId] = false;
            } else {
                showMsgBox("OOps !, No Record Found.");
                $scope.loading[DocumentId] = false;
                return; // 🚫 Stop here
            }
        });
    }
	
	
    // Total Deduction calculation
    //$scope.calcNetDeduction = function (value1, val2, val3) {
   //     value1 = parseFloat(value1) || 0;
      //  val2 = parseFloat(val2) || 0;
      //  val3 = parseFloat(val3) || 0;

     //   var result = value1 - (val2 + val3);

        // agar result negative ho to 0 return karo
      //  if (result < 0) result = 0;

    //    return result.toFixed(2); // always 2 decimals
  //  };
  
  
  
  ///////// A-(B+C)  /////////////////////
  

// Total Deduction calculation
$scope.calcNetDeduction = function (value1, val2, val3) {
    // values ko number me convert karo, NaN ya null ko 0 bana do
    value1 = parseFloat(value1) || 0;
    val2   = parseFloat(val2) || 0;
    val3   = parseFloat(val3) || 0;

    // calculation
    var result = value1 - (val2 + val3);

    // agar result negative ho to 0
    if (result < 0) result = 0;

    // decimal remove karke sirf integer return karo
    return Math.round(result);  // nearest integer
};

///////// A-(B+C+D)  /////////////////////

// Total Deduction calculation
$scope.calcNetDeductionfour = function (value1, val2, val3, val4) {
    // values ko number me convert karo, NaN ya null ko 0 bana do
    value1 = parseFloat(value1) || 0;
    val2   = parseFloat(val2) || 0;
    val3   = parseFloat(val3) || 0;
    val4   = parseFloat(val4) || 0;
    // calculation
    var result = value1 - (val2 + val3 + val4);

    // agar result negative ho to 0
    if (result < 0) result = 0;

    // decimal remove karke sirf integer return karo
    return Math.round(result);  // nearest integer

};
 
 
 
///////// A-(B+C+D+E)  /////////////////////

// Total Deduction calculation
$scope.calcNetDeductionfive = function (value1, val2, val3, val4, val5) {
    // values ko number me convert karo, NaN ya null ko 0 bana do
    value1 = parseFloat(value1) || 0;
    val2   = parseFloat(val2) || 0;
    val3   = parseFloat(val3) || 0;
    val4   = parseFloat(val4) || 0;
	val5   = parseFloat(val5) || 0;
  
    // calculation
    var result = value1 - (val2 + val3 + val4 + val5);

    // agar result negative ho to 0
    if (result < 0) result = 0;

    // decimal remove karke sirf integer return karo
    return Math.round(result);  // nearest integer

};
 
 
///////// A-(B+C+D+E+F)  /////////////////////

// Total Deduction calculation
$scope.calcNetDeductionsix = function (value1, val2, val3, val4, val5, val6) {
    // values ko number me convert karo, NaN ya null ko 0 bana do
    value1 = parseFloat(value1) || 0;
    val2   = parseFloat(val2) || 0;
    val3   = parseFloat(val3) || 0;
    val4   = parseFloat(val4) || 0;
	val5   = parseFloat(val5) || 0;
    val6   = parseFloat(val6) || 0;
    // calculation
    var result = value1 - (val2 + val3 + val4 + val5 + val6);

    // agar result negative ho to 0
    if (result < 0) result = 0;

    // decimal remove karke sirf integer return karo
    return Math.round(result);  // nearest integer

};


///////// A-(B+C+D+E+F+G)  /////////////////////

// Total Deduction calculation
$scope.calcNetDeductionseven = function (value1, val2, val3, val4, val5, val6, val7) {
    // values ko number me convert karo, NaN ya null ko 0 bana do
    value1 = parseFloat(value1) || 0;
    val2   = parseFloat(val2) || 0;
    val3   = parseFloat(val3) || 0;
    val4   = parseFloat(val4) || 0;
	val5   = parseFloat(val5) || 0;
    val6   = parseFloat(val6) || 0;
	 val7   = parseFloat(val7) || 0;
    // calculation
    var result = value1 - (val2 + val3 + val4 + val5 + val6 + val7);

    // agar result negative ho to 0
    if (result < 0) result = 0;

    // decimal remove karke sirf integer return karo
    return Math.round(result);  // nearest integer

};


    // Two values subtraction
    $scope.twovaluesubstract = function (val1, val2) {
        val1 = parseFloat(val1) || 0;
        val2 = parseFloat(val2) || 0;

        var result = val1 - val2;

        if (result < 0) result = 0;

        return result.toFixed(2);
    };


    $scope.calculateExpressionforfive = function (a, b, c, d, e) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
      
        let result = a - b + c + d + e ;
        return result;
    };


    $scope.calculateExpression = function (a, b, c, d, e, f) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        let result = a - b + c + d + e + f;
        return result;
    };

   

    $scope.searching = false;

    $scope.calculateExpressionforseven = function (a, b, c, d, e, f, g) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        g = clean(g);
        let result = a - b + c + d + e + f + g;
        return result;
    };
 
	
	
	 


    ///////// CLRA Fixed  /////////////////////


    $scope.fixedotherallowances = function (a, b, c, d, e, f) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
       
        let result = a + b + c + d + e + f;
        return result;
    };


    ///////// CLRA Earned  /////////////////////

    $scope.earnedotherallowances = function (a, b, c, d, e, f, g, h, i, j, k, l) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        g= clean(g);
        h = clean(h);
        i = clean(i);
        j= clean(j);
        k= clean(k);
        l = clean(l);

        let result = a + b + c + d + e + f + g + h + i + j + k + l  ;
        return result;
    };



    ///////// CLRA Deduction  /////////////////////

    $scope.clraotherdeduction = function (a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        g = clean(g);
        h = clean(h);
        i = clean(i);
        j = clean(j);
        k = clean(k);
        l = clean(l);
        m = clean(m);
        n= clean(n);

        let result = a + b + c + d + e + f + g + h + i + j + k + l + m + n ;
        return result;
    };




    $scope.twovalueAdd = function (val1, val2) {
        val1 = parseFloat(val1) || 0;
        val2 = parseFloat(val2) || 0;

        var result = val1 + val2;

        if (result < 0) result = 0;

        return result.toFixed(2);
    };
    $scope.getTimeDifference = function (v1, v2) {
        if (!v1 || !v2) return 0;

        function parseTime(timeStr) {
            let date = new Date("1970-01-01 " + timeStr);

            // Agar direct parse fail ho gaya (like 13:00 format me)
            if (isNaN(date.getTime())) {
                // Add ":00" agar sirf ghanta diya hai
                if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
                    date = new Date("1970-01-01T" + timeStr + ":00");
                }
            }

            return date;
        }

        let t1 = parseTime(v1);
        let t2 = parseTime(v2);

        if (isNaN(t1.getTime()) || isNaN(t2.getTime())) {
            return 0; // agar parse na ho to 0
        }

        let diffMs = t2 - t1;
        let minutes = diffMs / (1000 * 60);

        // Agar negative hai to 0 kar do
        if (minutes < 0) minutes = 0;

        // Agar HH:MM format chahiye
        let hours = Math.floor(minutes / 60);
        let mins = Math.floor(minutes % 60);

        return hours + " hr " + mins + " min";
    };

    $scope.twovaluemultiply = function (val1, val2) {
        val1 = parseFloat(val1) || 0;
        val2 = parseFloat(val2) || 0;

        var result = val1 * val2;

        if (result < 0) result = 0;

        return result.toFixed(2);
    };

    $scope.roundTwo = function (val) {
        if (!val) return 0;
        return Math.round((parseFloat(val) + Number.EPSILON) * 100) / 100;
    };

    $scope.calcNetAmount = function (gross, basic, da, hra, overtime) {
        // Convert values into numbers (float) safely
        gross = parseFloat(gross) > 0 ? parseFloat(gross) : 0;
        basic = parseFloat(basic) > 0 ? parseFloat(basic) : 0;
        da = parseFloat(da) > 0 ? parseFloat(da) : 0;
        hra = parseFloat(hra) > 0 ? parseFloat(hra) : 0;
        overtime = parseFloat(overtime) > 0 ? parseFloat(overtime) : 0;

        var result = gross - (basic + da + hra + overtime);

        // Agar negative aa jaye to 0 hi dikhana hai
        if (result < 0) result = 0;

        // Always return with 2 decimals
        return result.toFixed(2);
    };
	
    //$scope.getMonthName = function (monthNum) {
     //   var monthNames = [
          //  'January', 'February', 'March', 'April', 'May', 'June',
           // 'July', 'August', 'September', 'October', 'November', 'December'
      //  ];
      //  return monthNames[monthNum - 1] || '';
   // };
   
 $scope.getMonthName = function (monthNum) {
    if (!monthNum || monthNum < 1 || monthNum > 12) return '';

    var monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // 🔥 ALWAYS use $scope.FY directly (no window, no confusion)
    var financialYear = $scope.FY;

    if (!financialYear || !financialYear.includes('-')) {
        return monthNames[monthNum - 1];
    }

    var startYear = parseInt(financialYear.split('-')[0]);
    var endYear = parseInt(financialYear.split('-')[1]);

    // 🔥 FINAL CORRECT LOGIC
    if (monthNum >= 4 && monthNum <= 12) {
        return monthNames[monthNum - 1] + ' ' + startYear; // April–Dec
    } else {
        return monthNames[monthNum - 1] + ' ' + endYear;   // Jan–Mar
    }
};


    $scope.DownloadCompiledHtml = function (htmlString) {
        var container = angular.element('<div></div>');
        container.html(htmlString);

        var compiledContent = $compile(container.contents())($scope);

        // Append to a hidden div
        var printArea = document.getElementById('print-area');
        printArea.innerHTML = '';
        angular.element(printArea).append(compiledContent);
        checkNoRecord();

        // Use $timeout to ensure bindings complete before opening new window
        setTimeout(function () {
            var content = printArea.innerHTML;

            var win = window.open('', '', 'height=700,width=1000');
            win.document.open();
            win.document.write('<html><head><title>Print</title></head><body>');
            win.document.write(content);
            win.document.write('</body></html>');
            win.document.close();

            win.focus();
            win.print();
            /*  win.close();  // ✅ final close after print*/
        }, 500); // Wait 500ms for safe binding

        function checkNoRecord() {
            var $tbody = $("#myTable tbody"); // apne table ka id yaha lagao
            var rowCount = $tbody.find("tr:visible").length;

            if (rowCount === 0) {
                $tbody.append('<tr class="no-record"><td colspan="11" style="text-align:center;">No record found</td></tr>');
            } else {
                $tbody.find(".no-record").remove();
            }
        }
    };


    // उपयोग: $scope.DownloadAllAsZip(html)  OR  $scope.DownloadAllAsZip([html1, html2, ...])

    $scope.DownloadAllAsZip = function (docs) {
        // Normalize input → hamesha array
        var htmlArray = [];

        if (Array.isArray(docs)) {
            htmlArray = docs;
        } else if (docs) {
            htmlArray = [docs];
        }

        var zip = new JSZip();
        var pdfPromises = [];

        htmlArray.forEach(function (doc, index) {
            var html = doc.html || doc;       // agar sirf html string pass ho rahi hai
            var name = (doc.name || "Document_" + (index + 1)) + ".pdf";

            var p = new Promise(function (resolve, reject) {
                var printArea = document.getElementById('print-area');
                printArea.innerHTML = html;

                try {
                    $compile(angular.element(printArea).contents())($scope);
                } catch (e) {
                    console.warn("Compile failed:", e);
                }

                $scope.$applyAsync(function () {
                    setTimeout(function () {
                        html2canvas(printArea, {
                            useCORS: true,
                            allowTaint: false,
                            backgroundColor: "#fff",
                            scale: 2
                        }).then(function (canvas) {
                            var imgData = canvas.toDataURL("image/png");
                            var jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF)
                                ? window.jspdf.jsPDF
                                : window.jsPDF;
                            var pdf = new jsPDFConstructor('p', 'mm', 'a4');

                            var imgWidth = 210;
                            var pageHeight = 297;
                            var imgHeight = canvas.height * imgWidth / canvas.width;
                            var heightLeft = imgHeight;
                            var position = 0;

                            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                            heightLeft -= pageHeight;

                            while (heightLeft > 0) {
                                position = heightLeft - imgHeight;
                                pdf.addPage();
                                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                heightLeft -= pageHeight;
                            }

                            var blob = pdf.output('blob');
                            zip.file(name, blob);
                            resolve();
                        }).catch(function (err) {
                            console.error("html2canvas error", err);
                            reject(err);
                        });
                    }, 1000);
                });
            });
            pdfPromises.push(p);
        });

        Promise.all(pdfPromises).then(function () {
            zip.generateAsync({ type: "blob" }).then(function (content) {
                saveAs(content, "Documents.zip");
            });
        }).catch(function (err) {
            console.error("ZIP generation failed", err);
            alert("ZIP generation failed: " + err);
        });
    };


    $scope.DownloadAllAsPDF = function (docs, DocName) {
        // Normalize input → hamesha array
        var htmlArray = [];

        if (Array.isArray(docs)) {
            htmlArray = docs;
        } else if (docs) {
            htmlArray = [docs];
        }

        htmlArray.forEach(function (doc, index) {
            var html = doc.html || doc;   // agar sirf html string pass ho rahi hai
            var name = (DocName || "Document_" + (index + 1)) + ".pdf";

            var printArea = document.getElementById('print-area');
            printArea.innerHTML = html;

            try {
                $compile(angular.element(printArea).contents())($scope);
            } catch (e) {
                console.warn("Compile failed:", e);
            }

            $scope.$applyAsync(function () {
                setTimeout(function () {
                    html2canvas(printArea, {
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#fff",
                        scale: 2
                    }).then(function (canvas) {
                        var imgData = canvas.toDataURL("image/jpeg", 1.0);

                        // ✅ Correct constructor
                        const { jsPDF } = window.jspdf;
                        var pdf = new jsPDF("p", "mm", "a4");

                        var pageWidth = 210;
                        var pageHeight = 297;
                        var margin = 10;

                        var imgWidth = pageWidth - (2 * margin);
                        var imgHeight = canvas.height * imgWidth / canvas.width;
                        var heightLeft = imgHeight;
                        var position = margin;

                        pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
                        heightLeft -= (pageHeight - margin * 2);

                        while (heightLeft > 0) {
                            position = heightLeft - imgHeight + margin;
                            pdf.addPage();
                            pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
                            heightLeft -= (pageHeight - margin * 2);
                        }

                        pdf.save(name);
                    }).catch(function (err) {
                        console.error("html2canvas error", err);
                        alert("PDF generation failed: " + err);
                    });
                }, 1000);
            });
        });
    };
    function toBase64($http, $q, url) {
        var deferred = $q.defer();

        $http.get(url, { responseType: 'arraybuffer' })
            .then(function (response) {
                var blob = new Blob([response.data]);
                var reader = new FileReader();
                reader.onloadend = function () {
                    deferred.resolve(reader.result); // Base64 ready
                };
                reader.readAsDataURL(blob);
            })
            .catch(function (err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }


    $scope.DownloadAllAsExcel = function (docs, DocName) {
        var dataArray = Array.isArray(docs) ? docs : [docs];
        var fileName = (DocName || "Documents") + ".xls";
        var htmlContent = "";
        var printArea = document.getElementById("print-area");

        // ✅ Signature path
        $scope.Signature = 'http://localhost:8881/DownloadMat/ComSignatures/signature%20test.png';

        function processDoc(index) {
            if (index >= dataArray.length) {
                // ✅ Final Excel create
                var excelFile =
                    `<html xmlns:o="urn:schemas-microsoft-com:office:office"
               xmlns:x="urn:schemas-microsoft-com:office:excel"
               xmlns="http://www.w3.org/TR/REC-html40">
         <head>
             <!--[if gte mso 9]>
             <xml><x:ExcelWorkbook><x:ExcelWorksheets>
             <x:ExcelWorksheet><x:Name>Sheet1</x:Name>
             <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
             </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
             <![endif]-->
         </head>
         <body>${htmlContent}</body>
         </html>`;

                var blob = new Blob([excelFile], { type: "application/vnd.ms-excel" });
                var link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
                return;
            }

            var doc = dataArray[index];
            var html = (typeof doc === "string") ? doc : doc.html;

            printArea.innerHTML = html;

            // ✅ Angular compile
            $compile(printArea)($scope);

            $timeout(function () {
                processImages(printArea, function () {
                    // ✅ Fix "Approved By" section with proper table layout
                    var approvedBy = Array.from(printArea.querySelectorAll("td,div"))
                        .find(el => el.innerText && el.innerText.includes("Approved By"));


                    if (approvedBy) {
                        approvedBy.innerHTML = `
                        <div style="text-align:right; margin-top:10px;">
                            Approved By<br/>
                            <img src="${$scope.Signature}" 
                                 style="width:120px; height:60px; object-fit:contain; margin-top:5px;" />
                            <br/>
                            (Authorized Signatory)
                        </div>
                    `;
                    }


                    htmlContent += printArea.innerHTML + "<br/>";
                    processDoc(index + 1);
                });
            }, 100);
        }

        processDoc(0);

        // ✅ Convert images to Base64
        function processImages(container, callback) {
            var images = container.querySelectorAll("img:not([data-processed])");
            if (!images.length) {
                callback();
                return;
            }

            var remaining = images.length;
            images.forEach(function (img) {
                var src = img.getAttribute("src");

                // ✅ Agar src empty hai to signature ka use karo
                if ((!src || src === "") && $scope.Signature) {
                    src = $scope.Signature;
                    img.setAttribute("src", src);
                }

                if (!src) {
                    img.setAttribute("data-processed", "true");
                    if (--remaining === 0) callback();
                    return;
                }

                // ✅ Base64 convert
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        img.setAttribute("src", reader.result); // ✅ Base64 replace
                        img.setAttribute("data-processed", "true");
                        if (--remaining === 0) callback();
                    };
                    reader.readAsDataURL(xhr.response);
                };
                xhr.onerror = function () {
                    console.warn("Image load failed:", src);
                    if (--remaining === 0) callback();
                };
                xhr.open("GET", src, true);
                xhr.responseType = "blob";
                xhr.send();
            });
        }
    };









    $scope.selectAll = false;
    $scope.hasSelected = false;
    $scope.dropdwondisable = true;


    // Toggle select all
    $scope.toggleAll = function () {
        angular.forEach($scope.DocumentList, function (item) {
            item.isSelected = $scope.selectAll;
        });
        $scope.updateSelection();
    };
    $scope.dropdwondisable = true;
    // Update selection state
    $scope.updateSelection = function () {
        var anySelected = false;
   
        var allSelected = true;

        angular.forEach($scope.DocumentList, function (item) {
            if (item.isSelected) {
                anySelected = true;
            } else {
                allSelected = false;
            }
        });

        $scope.hasSelected = anySelected;
        $scope.selectAll = allSelected;

        $scope.dropdwondisable = !anySelected;
    };


    $scope.DounloadBulk = function (bulk) {
        if (bulk == 1) {
            $scope.DownloadSelected();
        }
        if (bulk == 2){
            $scope.DownloadSelectedExcel();
        }
    }




    $scope.downloading = false;

   



    $scope.DownloadSelectedExcel = function () {
        var selectedDocs = $scope.DocumentList.filter(d => d.isSelected);
        if (selectedDocs.length === 0) {
            alert("Please select at least one document!");
            return;
        }

        var wb = XLSX.utils.book_new();

        selectedDocs.forEach(function (doc, index) {
            var tempDiv = document.createElement("div");
            tempDiv.innerHTML = doc.HeaderHtml;

            var table = tempDiv.querySelector("table");
            var ws;

            if (table) {
                // Table -> Sheet
                ws = XLSX.utils.table_to_sheet(table);
            } else {
                // Plain text fallback
                var data = [
                    ["Document Name", doc.DocumentName || ("Document_" + (index + 1))],
                    ["Content", doc.HeaderHtml.replace(/<[^>]*>?/gm, '')]
                ];
                ws = XLSX.utils.aoa_to_sheet(data);
            }

            var sheetName = (doc.DocumentName || "Doc_" + (index + 1)).substring(0, 30);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, "SelectedDocuments.xlsx");
    };




}
 