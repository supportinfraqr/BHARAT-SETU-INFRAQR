app.SecretarialStatutoryController = function ($scope, $element, $filter, myService, $http, $sce) {


    $scope.BindFilter = function () {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchSecretarialCompliance", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SMasterList = response.data.Result;
            const monthMap = ["Invalid Month", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            $scope.MasterList = response.data.Result.map(item => {
                return {
                    ...item,
                    MonthName: monthMap[item.Month] || "Invalid Month"
                };
            });
            const distinctYears = [...new Set(response.data.Result.map(item => item.Year))];
            $scope.YearsList = distinctYears;
            $scope.ActList = response.data.Result.map(item => {
                return {
                    ...item,
                    Act: item.Act || ""
                };
            });
            $scope.StatusList = response.data.Result.map(item => {
                return {
                    ...item,
                    Act: monthMap[item.Act] || ""
                };
            });

        });
    }
    $scope.closeModal = function () {
        $('#complianceModal').modal('hide');
    };

    $scope.selectedCompliance = null;

    $scope.openComplianceModal = function (row) {
        // You can customize or fetch additional data here if needed
        console.log(row);
        $scope.selectedCompliance = {
            Rule: row.rules || 'N/A',
            Section: row.section || 'N/A',
            FormNo: row.Forms || 'N/A',
            Description: row.Description || 'No description available',
            Risk: row.Risk || 'N/A',
            UploadedFilePath: row.ufile || null // Provide path if uploaded
        };

        $('#complianceModal').modal('show');
    };

    $scope.PrintTable = function () {

        var tableContent = document.querySelector('#complianceTable').outerHTML;

        var style = `
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .no-print { display: none !important; }
            @media print {
                .no-print { display: none !important; }
                button, input, select { display: none !important; }
            }
        </style>
    `;

        var printWindow = window.open('', '', 'height=700,width=1000');
        printWindow.document.write('<html><head><title>Print Statutory</title>');
        printWindow.document.write(style);
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h3>Statutory Details</h3>');
        printWindow.document.write(tableContent);
        printWindow.document.write('</body></html>');

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };



    $scope.PrintTable1 = function () {

        var tableContent = document.querySelector('#complianceTable1').outerHTML;

        var style = `
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .no-print { display: none !important; }
            @media print {
                .no-print { display: none !important; }
                button, input, select { display: none !important; }
            }
        </style>
    `;

        var printWindow = window.open('', '', 'height=700,width=1000');
        printWindow.document.write('<html><head><title>Print Internal</title>');
        printWindow.document.write(style);
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h3>Internal Details</h3>');
        printWindow.document.write(tableContent);
        printWindow.document.write('</body></html>');

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };


    $scope.ExportTableToExcel = function () {
        var table = document.querySelector('#complianceTable');
        if (!table) {
            alert("Table not found!");
            return;
        }

        var tableClone = table.cloneNode(true);

        // Remove all elements with class 'no-print'
        tableClone.querySelectorAll('.no-print').forEach(el => el.remove());

        // Define allowed headers (excluding dropdown fields like Status and IsVerified)
        var allowedHeaders = [
            "sno",
            "act name",
            "compliance name",
            "registration no.",
            "state name",
            "duedate",
            "status",
            "actual submission date",
            "delay days",
            "upload date",
            "isverified"
        ];

        // Find column indexes to keep
        var headerCells = tableClone.querySelectorAll('thead tr th');
        var keepIndexes = [];
        headerCells.forEach((th, i) => {
            var headerText = th.textContent.trim().toLowerCase();
            if (allowedHeaders.includes(headerText)) {
                keepIndexes.push(i);
            }
        });

        // Remove unwanted <th>
        tableClone.querySelectorAll('thead tr').forEach(tr => {
            var ths = tr.querySelectorAll('th');
            for (let i = ths.length - 1; i >= 0; i--) {
                if (!keepIndexes.includes(i)) {
                    ths[i].remove();
                }
            }
        });

        // Remove unwanted <td>
        tableClone.querySelectorAll('tbody tr').forEach(tr => {
            var tds = tr.querySelectorAll('td');
            for (let i = tds.length - 1; i >= 0; i--) {
                if (!keepIndexes.includes(i)) {
                    tds[i].remove();
                }
            }
        });

        // Remove any <select> and their parent containers (precaution)
        tableClone.querySelectorAll('select').forEach(sel => {
            sel.remove();
        });

        // Remove any <input> fields — keep only visible text or fallback p
        tableClone.querySelectorAll('input').forEach(input => {
            const parent = input.parentNode;
            const nextP = parent.querySelector('p');
            const span = document.createElement('span');
            if (nextP && nextP.textContent.trim()) {
                span.textContent = nextP.textContent.trim();
                parent.replaceChild(span, input);
            } else {
                parent.removeChild(input); // remove without replacement
            }
        });

        // Show hidden <p> values
        tableClone.querySelectorAll('p[ng-show="false"]').forEach(p => {
            p.style.display = 'block';
        });

        // Style table for export
        const cells = tableClone.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.style.border = '1px solid #000';
            cell.style.padding = '5px';
            cell.style.textAlign = 'left';
        });

        tableClone.style.borderCollapse = 'collapse';
        tableClone.style.width = '100%';

        // Generate Excel-compatible HTML
        const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:x="urn:schemas-microsoft-com:office:excel" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <!--[if gte mso 9]>
    <xml>
        <x:ExcelWorkbook>
            <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                    <x:Name>Sheet1</x:Name>
                    <x:WorksheetOptions>
                        <x:Print>
                            <x:ValidPrinterInfo/>
                        </x:Print>
                    </x:WorksheetOptions>
                </x:ExcelWorksheet>
            </x:ExcelWorksheets>
        </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <meta charset="utf-8">
</head>
<body>
    ${tableClone.outerHTML}
</body>
</html>
`;

        // Trigger download
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'StatutoryDetails.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // Helper functions to get state/act names from IDs
    function getStateName(stateCode) {
        let state = $scope.AllStateList.find(x => x.SATE_CODE == stateCode);
        return state ? state.STATE_NM : stateCode;
    }

    function getActName(index, actId) {
        let act = $scope.AllActList[index]?.find(x => x.ActId == actId);
        return act ? act.Act : actId;
    }

    function formatDate(dateObj) {
        if (!dateObj) return '';
        let date = new Date(dateObj);
        return date.toISOString().split('T')[0]; // format as yyyy-mm-dd
    }


    $scope.SetValue = function (row, fuCandidatePhoto, ufile) {
        $scope.CACId = row.Id;
        $scope.ASD = row.ActualSubmissionDate;
        $scope.CSD = row.ComplianceSubmissionDate;
        $scope.DelayDay = row.DelayDays;
        $scope.Createdby = LoginId;
        $scope.CN = row.ComplianceName;
        $(fuCandidatePhoto).click();

    }

    $scope.fileSelected = function (files, row, input) {

        const file = files[0];

        if (!file) {
            if (input) {
                input.value = '';
            }

            $scope.hideValidationLoader();

            return;
        }
        else {
            row.isFileValid = true;
        }
        const isPDF = file.type === 'application/pdf';

        if (!isPDF) {

            swal("Invalid File", "Only PDF files are allowed.", "error");

            row.UploadFile = null;
            if (input) {
                input.value = '';
            }

            $scope.$applyAsync();

            return;
        }

        // =====================================================
        // ✅ FILE SIZE VALIDATION
        // =====================================================

        const MAX_SIZE_MB = 3;
        const fileSizeMB = file.size / (1024 * 1024);

        if (fileSizeMB > MAX_SIZE_MB) {

            swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");

            row.UploadFile = null;
            row.isFileValid = false;

            // ✅ Clear actual file input
            if (input) {
                input.value = '';
            }

            $scope.$applyAsync();

            return;
        }

        // =====================================================
        // ✅ DOCUMENT VALIDATION
        // =====================================================

        $scope.showValidationLoader();

        validateDocument(file, $scope.CN, function (isValid) {

            $scope.hideValidationLoader();

            if (!isValid) {

                swal({
                    title: "Are you sure?",
                    text: "Uploaded file does not appear to be valid. Do you want to continue?",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonClass: 'btn-warning',
                    confirmButtonText: "Yes, continue!",
                    cancelButtonText: "Cancel",
                    closeOnConfirm: false

                }, function (isConfirm) {

                    if (isConfirm) {

                        swal.close();

                        processFile();

                    } else {

                        row.UploadFile = null;
                        row.isFileValid = false;

                        // ✅ Clear actual file input
                        if (input) {
                            input.value = '';
                        }

                        $scope.BindSearch();

                        $scope.$applyAsync();

                        return;
                    }
                });

            } else {

                processFile();
            }
            function processFile() {

                row.UploadFile = file;
                row.isFileValid = true;

                $scope.UploadFile = file;

                $scope.$applyAsync();
            }
        });
    };

    //$scope.fileSelected = function (files, row) {
    //    const file = files[0];
    //    row.FileName = input.files[0].name;
    //    if (!file) {
    //        $scope.hideValidationLoader();
    //        return;
    //    }

    //    //✅ Check for PDF extension
    //    const isPDF = file.type === 'application/pdf';
    //    if (!isPDF) {

    //        swal("Invalid File", "Only PDF files are allowed.", "error");
    //        input.value = ""; // Clear the file
    //        return;
    //    }

    //    // ✅ Check for 3 MB file size limit
    //    const MAX_SIZE_MB = 3;
    //    const fileSizeMB = file.size / (1024 * 1024);
    //    if (fileSizeMB > MAX_SIZE_MB) {

    //        swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
    //        input.value = ""; // Clear the file
    //        return;
    //    }
    //    $scope.showValidationLoader();
    //    validateDocument(file, $scope.CN, function (isValid) {
    //        $scope.hideValidationLoader();

    //        if (!isValid) {
    //            swal({
    //                title: "Are you sure?",
    //                text: "Uploaded file does not appear to be valid. Do you want to continue?",
    //                type: "warning",
    //                showCancelButton: true,
    //                confirmButtonClass: 'btn-warning',
    //                confirmButtonText: "Yes, continue!",
    //                cancelButtonText: "Cancel",
    //                closeOnConfirm: false
    //            }, function (isConfirm) {
    //                if (isConfirm) {
    //                    swal.close(); // ✅ Manually close SweetAlert v1
    //                    processFile(); // ✅ Continue processing the file
    //                } else {
    //                    $scope.UploadFile = '';
    //                    $scope.BindSearch();
    //                    return;
    //                }
    //            });
    //        } else {
    //            processFile(); // ✅ Valid file, continue normally
    //        }



    //        function processFile() {
    //            $scope.UploadFile = '';
    //            if (files && files.length > 0) {
    //                $scope.UploadFile = files[0]; // Assign the first file to the scope variable  
    //                row.FileName = files[0].name;
    //                $scope.$apply();
    //            }
    //        }
    //    });
    //};




    $scope.viewFile = function (row) {
        if (row.UploadFile) {
            let a = document.createElement("a");
            a.href = row.UploadFile;  // Assuming row.UploadFile contains the correct file URL
            a.download = row.UploadFile.split("/").pop(); // Extracts the filename from the path
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("No file uploaded.");
        }
    };

    // Export table as PDF
    $scope.exportToPDF = function () {
        const { jsPDF } = window.jspdf; // Ensure jsPDF is loaded
        const doc = new jsPDF();

        let content = $element.find(".table")[0]; // Find the table element
        doc.autoTable({ html: content }); // Use the autoTable plugin for jsPDF
        doc.save("Statutory/Internal.pdf");
    };

    $scope.BindSearch = function () {
        $scope.showLoader();
        $scope.Flags();
        var collectionobj = {
            Action: 11,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year
        };

        var getData = myService.methode(
            'POST',
            "../Retail/SearchSecretarialStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            $scope.complianceRows = response.data.Result || [];
            $scope.Showing = "All";
            $scope.Pagesize = $scope.complianceRows.length;
            $scope.ActList = [...new Set(
                $scope.complianceRows
                    .map(x => x.Act)
                    .filter(x => x)
            )].sort((a, b) => a.localeCompare(b));
            $scope.StateList = [...new Set(
                $scope.complianceRows
                    .map(x => x.STATE_NM)
                    .filter(x => x)
            )].sort((a, b) => a.localeCompare(b));

            $scope.YearsList = [...new Set(
                $scope.complianceRows
                    .map(x => x.Year)
                    .filter(x => x)
            )].sort((a, b) => a.localeCompare(b));

            var monthOrder = [
                "April", "May", "June", "July", "August", "September",
                "October", "November", "December",
                "January", "February", "March"
            ];

            $scope.MonthList = [...new Set(
                ($scope.complianceRows || [])
                    .map(x => (x.Month || '').trim())
                    .filter(x => x)
            )]
                .sort((a, b) => {
                    return monthOrder.indexOf(a) - monthOrder.indexOf(b);
                });

            $scope.statusDisplayMap = {
                'Complied': 'Complied',
                'Non Complied': 'Non-Complied',
                'Delay Complied': 'Delay-Complied',
                'Non Applicable': 'Non-Applicable',
                'Pending': 'Pending',
                'Verified': 'Verified',
                'Remarks': 'Remarks'
            };
            $scope.StatusList = ['Complied', 'Delay-Complied', 'Non-Applicable', 'Non-Complied', 'Pending', 'Remarks', 'Verified'];
            $scope.counttiles($scope.complianceRows);
            $scope.hideLoader();
        });
    };
    $scope.counttiles = function (complianceRows) {

        $scope.StatusCount = {
            Complied: 0,
            Pending: 0,
            Total: 0,
            Delayed: 0,
            NonComplied: 0,
            NonApplicable: 0,
            Verified: 0,
            Remarks: 0
        };

        angular.forEach(complianceRows, function (row) {

            $scope.StatusCount.Total++;

            if (row.CStatus === "Complied") {
                $scope.StatusCount.Complied++;
            }
            else if (row.CStatus === "Delay Complied") {
                $scope.StatusCount.Delayed++;
            }
            else if (row.CStatus === "Non Complied") {
                $scope.StatusCount.NonComplied++;
            }
            else if (row.CStatus === "Non Applicable") {
                $scope.StatusCount.NonApplicable++;
            }
            else {
                $scope.StatusCount.Pending++;
            }

            // Separate verification count
            if (row.IsVerified === "Verified") {
                $scope.StatusCount.Verified++;
            }

            // Separate remarks count
            if (row.IsVerified === "Remarks") {
                $scope.StatusCount.Remarks++;
            }

        });
    };




    // Modal open करने का function
    $scope.openModal = function (type) {
        $scope.modalTitle = type;

        // पूरा data allComplianceRows से filter करो
        var rows = $scope.allComplianceRows.filter(function (row) {
            return row.Calendartype && row.Calendartype.toLowerCase() === 'statutory';
        });

        if (type === 'Total Compliance') {
            $scope.modalData = rows;
        }
        else if (type === 'Pending Docs') {
            $scope.modalData = rows.filter(row => !row.CStatus || row.CStatus.trim() === '');
        }
        else if (type === 'Complied Docs') {
            $scope.modalData = rows.filter(row => row.CStatus === 'Complied');
        }
        else if (type === 'Delayed Docs') {
            $scope.modalData = rows.filter(row => row.CStatus === 'Delay complied');
        }
        else if (type === 'Non Complied Docs') {
            $scope.modalData = rows.filter(row => row.CStatus === 'Non Complied');
        }

        // Modal show (Bootstrap jQuery)
        $('#tileDataModal').modal('show');
    };

    // Modal close करने का function
    $scope.closeTileModal = function () {
        $('#tileDataModal').modal('hide');
    };


    ////Added by shipra //////////
    $scope.openRemarkModal = function (remark, header) {
        $scope.selectedRemark = remark;
        $scope.HeaderRemark = header;

        // Pehle se open modal ke upar show karo
        $('#remarkModal').modal({
            backdrop: false, // dusra backdrop nahi chahiye
            keyboard: true
        });

        // Optional: agar backdrop chahiye to alag z-index wala add karo
        $('.modal-backdrop').last().addClass('remark-backdrop');
    };

    /////added///
    //$scope.openComplianceModal = function (row) {
    //    $scope.selectedCompliance = row;
    //    setTimeout(function () {
    //        $('#complianceModal').modal('show');
    //    }, 0);
    //};

    $scope.SaveRecord = function () {
        if (isValidate()) {
            $scope.AfterverifyRecord()
        }
    }

    $scope.trustAsHtml = function (html) {
        return $sce.trustAsHtml(html);
    };
    $scope.selectedRemark = "";
    $scope.HeaderRemark = "";
    $scope.openRemarkModal = function (remark, Header) {
        $scope.selectedRemark = $sce.trustAsHtml(remark);
        $scope.HeaderRemark = Header;
        $('#remarkModal').modal('show');
    };
    $scope.closeRemarkModal = function (remark) {
        $scope.selectedRemark = '';
        $scope.HeaderRemark = "";
        $('#remarkModal').modal('hide');
    };

    $scope.AfterverifyRecord = function (row) {
        if (!row.CStatus || !row.ActualSubmissionDate) {
            showMsgBox("Please Enter Both Status  and Actual Submission Date.");
            return;
        }
        if (!row.IsVerified && $scope.SC_allowverifyflag === true) {
            showMsgBox("Please Select Verification Status");
            return;
        }
        if (row.VRemark1 == '' && row.IsVerified == 'Clarify' && $scope.SC_allowverifyflag === true) {
            showMsgBox("Please Enter Remark in Condition of Remarks.");
            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            formData.append('ASD', $filter('date')(row.ActualSubmissionDate, 'yyyy/MM/dd'));
            formData.append('CSD', $filter('date')(row.CSD, 'yyyy/MM/dd'));
            formData.append('RegNo', row.RegistrationNumber);
            formData.append('DelayDay', row.DelayDay);
            if (row.UploadFile == undefined || row.UploadFile == null || row.UploadFile == '') {
                formData.append('UploadFile', '-1');
            }
            else {
                formData.append('UploadFile', row.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', row.CStatus);
            formData.append('VRemark', row.VRemark1);
            formData.append('CRemark', row.CRemark1);
            formData.append('IsVerified', row.IsVerified);

            formData.append('CACId', row.CACId);
            formData.append('Action', '2');
            $http.post("../Retail/IUDSecretarialStatutory", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                $scope.UploadFile = '';
                showMsgBox(response.data.Result);
                $scope.BindSearch();
            }, function (error) {
                console.error('Error', error);
            });
        }
    }

    $scope.openEventModal = function (row) {
        if (row.Frequency !== 'Event') {
            return;
        }
        var modalEl = document.getElementById('eventModal');
        var obj = angular.copy(row);

        obj.ActualSubmissionDate = "";
        obj.UploadFile = null;
        obj.CStatus = "";
        obj.DelayDays = "";
        obj.TempIsVerified = "";
        obj.IsVerified = "";
        obj.openthis = "0";
        obj.CreateOn = "";
        obj.VRemark = "";
        obj.VRemark1 = "";
        obj.CSIID = "";
        obj.isDisabled = false;
        $scope.selectedEvent1 = [obj];
        $scope.CACEventId = row.CACId;
        $scope.getEventDetails(row.CACId);
        var modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show();
    };

    $scope.addEventRow = function () {
        let lastRow = $scope.selectedEvent1[$scope.selectedEvent1.length - 1];
        let newRow = angular.copy(lastRow);
        newRow.UploadFile = null;
        newRow.ActualSubmissionDate = '';
        newRow.DelayDays = 0;
        newRow.IsVerified = '';
        newRow.CStatus = '';
        newRow.isDisabled = false;
        newRow.CreateOn = '';
        newRow.VRemark = '';
        newRow.VRemark1 = '';
        newRow.openthis = '';
        newRow.CRemark1 = '';
        newRow.CSIID = '';
        $scope.selectedEvent1.push(newRow);
    };

    $scope.getEventDetails = function (CACId) {
        var collectionobj = {
            Action: 3,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year,
            CACId: CACId
        };
        myService.methode('POST', "../Retail/SearchSecretarialEvent", { obj: collectionobj }   // cleaner than string JSON
        ).then(function (response) {
            let result = response.data.Result;
            console.log("event datat", result);
            if (result && result.length > 0) {
                $scope.selectedEvent1 = result.map(function (x) {
                    return {
                        Act: x.Act,
                        ComplianceName: x.ComplianceName,
                        Risk: x.Risk,
                        Frequency: x.Frequency,
                        Month: x.Month,
                        STATE_NM: x.STATE_NM,
                        DueDate: x.DueDate,
                        CStatus: x.CStatus,
                        ActualSubmissionDate: x.ActualSubmissionDate,
                        DelayDays: x.DelayDays,
                        UploadFile: x.UploadFile,
                        CreateOn: x.CreateOn,
                        VRemark1: '',
                        VRemark: x.VRemark,
                        TempIsVerified: x.IsVerified,
                        IsVerified: x.IsVerified,
                        openthis: x.openthis,
                        CSIID: x.CSIID,
                        Flag: x.Flag
                    };
                });

            } else {

            }

        }, function (error) {
            console.error("Error fetching event details:", error);
        });
    };

    $scope.$watch('Search', function () {

        if (!$scope.allComplianceRows) return;

        var filteredData = $scope.allComplianceRows.filter(function (row) {
            return $scope.globalSearch(row);
        });

        $scope.complianceRows = filteredData;
        $scope.Pagesize = $scope.complianceRows.length;
        $scope.counttiles(filteredData);
    });


    $scope.globalSearch = function (row) {

        if (!$scope.Search) return true;

        var searchText = ($scope.Search || '')
            .toString()
            .toLowerCase()
            .trim();

        function safe(val) {
            return (val || '')
                .toString()
                .toLowerCase();
        }

        return (

            safe(row.SNo).includes(searchText) ||
            safe(row.Act).includes(searchText) ||
            safe(row.ComplianceName).includes(searchText) ||
            safe(row.RegistrationNumber).includes(searchText) ||
            safe(row.Risk).includes(searchText) ||
            safe(row.Frequency).includes(searchText) ||
            safe(row.Month).includes(searchText) ||
            safe(row.ActualSubmissionDate).includes(searchText) ||
            safe(row.STATE_NM).includes(searchText) ||
            safe(row.DueDate).includes(searchText) ||
            safe(row.CStatus).includes(searchText) ||
            safe(row.DelayDays).includes(searchText) ||
            safe(row.CreateOn).includes(searchText) ||

            safe(
                row.IsVerified === 'Clarify'
                    ? 'Remarks'
                    : row.IsVerified
            ).includes(searchText)

            // ||
            // safe(row.VRemark).includes(searchText)
        );
    };

    $scope.AddEventNewverifyRecord = function (row1) {
        if (!row1.CStatus || !row1.ActualSubmissionDate) {
            showMsgBox("Please Enter both Status  and Actual Submission Date.");
            return;
        }
        if (row1.IsVerified === '' && SC_allowverifyflag === true) {
            showMsgBox("Please Select Verification Status");
            return; ``
        }
        if (row1.VRemark1 === '' && row1.IsVerified === 'Remarks' && SC_allowverifyflag === true) {
            showMsgBox("Please Enter Remark in Condition of Remarks.");
            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            formData.append('ASD', $filter('date')(row1.ActualSubmissionDate, 'yyyy/MM/dd'));
            formData.append('CSD', $filter('date')(row1.CSD, 'yyyy/MM/dd'));
            formData.append('RegNo', row1.RegistrationNumber);
            formData.append('DelayDay', row1.DelayDay);
            if (row1.UploadFile == undefined || row1.UploadFile == null || row1.UploadFile == '') {
                formData.append('UploadFile', '-1');
            }
            else {
                formData.append('UploadFile', row1.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', row1.CStatus);
            formData.append('VRemark', row1.VRemark1);
            formData.append('CRemark', row1.CRemark1);
            formData.append('IsVerified', row1.IsVerified);

            formData.append('CACId', $scope.CACEventId);
            formData.append('Id', row1.CSIID);
            formData.append('Action', '1');
            $http.post("../Retail/AddSecretarialEventcompliance", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                console.log("Checking Response", response.data.Result);
                showMsgBox(response.data.Result);
                $scope.getEventDetails($scope.CACEventId);
            }, function (error) {
                console.error('Error', error);
            });
        }
    }

    $scope.selectedRemark1 = "";
    $scope.HeaderRemark1 = "";
    $scope.openRemarkModal1 = function (remark1, Header1) {
        $scope.selectedRemark1 = $sce.trustAsHtml(remark1);
        $scope.HeaderRemark1 = Header1;
        $('#remarkModal1').modal('show');
    };
    $scope.NewExportTableToCSV = function () {
        function exportToCSV(data) {
            if (!data || !data.length) {
                alert("No data available!");
                return;
            }

            var csv = [];

            function formatDate(dateValue) {
                if (!dateValue) return '';
                var d = new Date(dateValue);
                if (isNaN(d.getTime())) return '';
                var day = ('0' + d.getDate()).slice(-2);
                var month = ('0' + (d.getMonth() + 1)).slice(-2);
                var year = d.getFullYear();
                return day + '-' + month + '-' + year;
            }

            // Header
            csv.push([
                "S.No",
                "Act Name",
                "Compliance Name",
                "Risk",
                "Frequency",
                "Month",
                "State",
                "Due Date",
                "Status",
                "Actual Submission Date",
                "Delay Days",
                "Upload File",
                "Upload Date",
                "Verification Status"
            ].join(","));

            // Data Rows
            data.forEach(function (row, index) {

                var rowData = [
                    index + 1,
                    row.Act || '',
                    row.ComplianceName || '',
                    row.Risk || '',
                    row.Frequency || '',
                    row.Month || '',
                    row.STATE_NM || '',
                    row.DueDate || '',
                    row.CStatus || '',
                    formatDate(row.ActualSubmissionDate),
                    row.DelayDays || '0',
                    row.UploadFile ? 'Uploaded' : 'Not Uploaded',
                    row.CreateOn || '',
                    (row.IsVerified == 0 ? '' : row.IsVerified == 'Clarify' ? 'Remarks' : (row.IsVerified || ''))
                ];

                csv.push(rowData.map(val => `"${val}"`).join(","));
            });

            var csvContent = csv.join('\n');
            var blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });

            var link = document.createElement('a');

            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(blob, "SecretarialCompliance.csv");
            } else {
                var url = URL.createObjectURL(blob);
                link.href = url;
                link.download = "Secretarial.csv";
                document.body.appendChild(link);
                link.click();
                setTimeout(function () {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 0);
            }
        }

        exportToCSV($scope.complianceRows);
    };
    $scope.NEwPrintTable = function () {

        function printData(data) {

            if (data && !Array.isArray(data)) {
                data = [data];
            }

            data = data || [];

            if (!data.length) {
                alert("No data available!");
                return;
            }

            var filteredData = data.filter(function (row) {

                if (row.Calendartype !== 'Statutory') return false;

                if ($scope.Search && !$scope.globalSearch(row)) return false;

                if ($scope.SelectedState && row.STATE_NM !== $scope.SelectedState) return false;

                if ($scope.SelectedAct && $scope.SelectedAct !== 'Act' && row.Act !== $scope.SelectedAct) return false;

                if ($scope.SelectedMonth && row.Month !== $scope.SelectedMonth) return false;

                // ✅ ✅ ✅ FIXED STATUS FILTER
                if ($scope.SelectedStatus) {

                    var cstatus = row.CStatus;
                    if (!cstatus || cstatus.trim() === '') {
                        cstatus = 'Pending';
                    }

                    var displayStatus = $scope.statusDisplayMap[cstatus] || cstatus;

                    // ⭐ Verified
                    if ($scope.SelectedStatus === 'Verified') {
                        if (!row.IsVerified || row.IsVerified.toLowerCase() !== 'verified') {
                            return false;
                        }
                    }

                    // ⭐ Remarks (Clarify)
                    else if ($scope.SelectedStatus === 'Remarks') {
                        if (!row.IsVerified || row.IsVerified.toLowerCase() !== 'clarify') {
                            return false;
                        }
                    }

                    // ⭐ Normal Status
                    else {
                        if (displayStatus !== $scope.SelectedStatus) {
                            return false;
                        }
                    }
                }

                if ($scope.SelectedYear && row.Year !== $scope.SelectedYear) return false;

                return true;
            });

            if (!filteredData || filteredData.length === 0) {
                alert("No filtered data available!");
                return;
            }

            var companyName = MapUser || '';
            var today = new Date();

            var day = String(today.getDate()).padStart(2, '0');
            var month = String(today.getMonth() + 1).padStart(2, '0');
            var year = today.getFullYear();

            var generatedOn = day + "-" + month + "-" + year;

            function formatDate(dateValue) {
                if (!dateValue) return '';
                var d = new Date(dateValue);
                if (isNaN(d.getTime())) return '';
                var day = ('0' + d.getDate()).slice(-2);
                var month = ('0' + (d.getMonth() + 1)).slice(-2);
                var year = d.getFullYear();
                return day + '-' + month + '-' + year;
            }

            var tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Act Name</th>
                    <th>Compliance Name</th>
                    <th>Risk</th>
                    <th>Frequency</th>
                    <th>Month</th>
                    <th>State</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actual Submission Date</th>
                    <th>Delay Days</th>
                    <th>Upload File</th>
                    <th>Upload Date</th>
                    <th>Verification Status</th>
                </tr>
            </thead>
            <tbody>
        `;
            function formatDate(dateValue) {
                if (!dateValue) return '';

                var d = new Date(dateValue);
                if (isNaN(d.getTime())) return '';

                var day = ('0' + d.getDate()).slice(-2);
                var month = ('0' + (d.getMonth() + 1)).slice(-2);
                var year = d.getFullYear();

                return day + '-' + month + '-' + year;
            }
            filteredData.forEach(function (row, index) {

                tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${row.Act || ''}</td>
                <td>${row.ComplianceName || ''}</td>
                <td>${row.Risk || ''}</td>
                <td>${row.Frequency || ''}</td>
                <td>${row.Month}</td>
                <td>${row.STATE_NM || ''}</td>
                <td>${formatDate(row.DueDate)}</td>
                <td>${row.CStatus}</td>
                <td>${formatDate(row.ActualSubmissionDate)}</td>
                <td>${row.DelayDays || '0'}</td>
                <td>${row.UploadFile ? 'Uploaded' : 'Not Uploaded'}</td>
                <td>${formatDate(row.CreateOn)}</td>
                <td>${(!row.IsVerified || row.IsVerified == 0 ? '' : row.IsVerified === 'Clarify' ? 'Remarks' : row.IsVerified)}</td>
            </tr>
            `;
            });

            tableHTML += `</tbody></table>`;

            var printWindow = window.open('', '', 'width=1200,height=700');

            printWindow.document.write(`
        <html>
        <head>
            <title>Print</title>
            <style>
                body { font-family: Arial, sans-serif; }

                .print-header {
                    text-align: center;
                    margin-bottom: 10px;
                }

                .company-name {
                    font-size: 14px;
                    margin-top: 3px;
                }

                .generated {
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    font-size: 12px;
                }

                table {
                    width:100%;
                    border-collapse:collapse;
                    margin-top: 20px;
                    table-layout: fixed; 
                }

                th, td {
                    border:1px solid #000;
                    padding:6px;
                    font-size:12px;
                }

                th {
                    background:#F37437;
                    color:#000;
                }
            </style>
        </head>
        <body>

            <div class="generated">
                Generated On: ${generatedOn}
            </div>

            <div class="print-header">
                <h2>Secretarial Compliance</h2>
                <div class="company-name">${companyName}</div>
            </div>

            ${tableHTML}

        </body>
        </html>
        `);

            printWindow.document.close();
            printWindow.onload = function () {
                printWindow.focus();

                setTimeout(function () {
                    printWindow.print();
                    printWindow.close();
                }, 300);
            };
        }

        //var isNoFilter =
        //    !$scope.SelectedState &&
        //    ($scope.SelectedAct === 'Act' || !$scope.SelectedAct) &&
        //    !$scope.SelectedMonth &&
        //    !$scope.SelectedStatus &&
        //    !$scope.SelectedYear &&
        //    !$scope.Search;

        //if (isNoFilter) {
        //    $scope.newexportdata().then(function (data) {
        //        printData(data);
        //    });

        //} else {
        printData($scope.complianceRows);
        //}
    };

    $scope.refreshDropdowns = function () {

        var filtered = angular.copy($scope.allComplianceRows || []);

        // ✅ Status Filter
        if ($scope.SelectedStatus) {

            var selected = ($scope.SelectedStatus || '').toString().trim();

            filtered = filtered.filter(function (row) {

                var status = (row.CStatus || '').toString().trim();
                var isVerified = (row.IsVerified || '').toString().trim();

                var displayStatus = '';

                if (!status) {
                    displayStatus = 'Pending';
                }
                else if (isVerified === "Verified" && selected === "Verified") {
                    displayStatus = 'Verified';
                }
                else if (isVerified === "Remarks" && selected === "Remarks") {
                    displayStatus = 'Remarks';
                }
                else {
                    displayStatus = ($scope.statusDisplayMap && $scope.statusDisplayMap[status])
                        ? $scope.statusDisplayMap[status]
                        : status;
                }

                return displayStatus.toString().trim() === selected;
            });
        }

        // ✅ Act Filter
        if ($scope.SelectedAct && $scope.SelectedAct !== 'Act') {
            filtered = filtered.filter(row => row.Act === $scope.SelectedAct);
        }

        // ✅ State Filter
        if ($scope.SelectedState) {
            filtered = filtered.filter(row => row.STATE_NM === $scope.SelectedState);
        }

        // ✅ Month Filter
        if ($scope.SelectedMonth) {
            filtered = filtered.filter(row => row.Month === $scope.SelectedMonth);
        }

        // ✅ Year Filter
        if ($scope.SelectedYear) {
            filtered = filtered.filter(row => row.Year === $scope.SelectedYear);
        }

        // ✅ Normalize
        filtered.forEach(function (row) {

            if (!row.IsVerified ||
                row.IsVerified === 'null' ||
                row.IsVerified === 'undefined') {

                row.IsVerified = '';
            }
        });

        // ✅ Status List
        $scope.StatusList = [

            ...new Set(

                filtered.map(function (row) {

                    var status = (row.CStatus || '').toString().trim();
                    var isVerified = (row.IsVerified || '').toString().trim();

                    var displayStatus = '';

                    if (!status) {
                        displayStatus = 'Pending';
                    }
                    else if (
                        isVerified === "Verified" &&
                        (status !== 'Non Applicable' &&
                            status !== 'Delay Complied' &&
                            status !== 'Complied' &&
                            status !== 'Non Complied')
                    ) {
                        displayStatus = 'Verified';
                    }
                    else if (
                        isVerified === "Remarks" &&
                        (status !== 'Non Applicable' &&
                            status !== 'Delay Complied' &&
                            status !== 'Complied' &&
                            status !== 'Non Complied')
                    ) {
                        displayStatus = 'Remarks';
                    }
                    else {

                        displayStatus =
                            ($scope.statusDisplayMap &&
                                $scope.statusDisplayMap[status])
                                ? $scope.statusDisplayMap[status]
                                : status;
                    }

                    return displayStatus;
                })
            )

        ].sort();

        // ✅ State List
        $scope.StateList = [
            ...new Set(
                filtered
                    .map(x => x.STATE_NM)
                    .filter(x => x)
            )
        ].sort((a, b) => a.localeCompare(b));

        // ✅ Month List (April → March)
        var monthOrder = [
            "April", "May", "June", "July", "August", "September",
            "October", "November", "December",
            "January", "February", "March"
        ];

        $scope.MonthList = [...new Set(
            filtered
                .map(x => (x.Month || '').trim())
                .filter(x => x)
        )]
            .sort((a, b) => {
                return monthOrder.indexOf(a) - monthOrder.indexOf(b);
            });

        // ✅ Year Dependent Filter
        var yearFiltered = angular.copy($scope.allComplianceRows || []);

        // Status
        if ($scope.SelectedStatus) {

            var selectedYearStatus =
                ($scope.SelectedStatus || '').toString().trim();

            yearFiltered = yearFiltered.filter(function (row) {

                var status = (row.CStatus || '').toString().trim();
                var isVerified = (row.IsVerified || '').toString().trim();

                var displayStatus = '';

                if (!status) {
                    displayStatus = 'Pending';
                }
                else if (isVerified === "Verified") {
                    displayStatus = 'Verified';
                }
                else if (isVerified === "Remarks") {
                    displayStatus = 'Remarks';
                }
                else {
                    displayStatus =
                        ($scope.statusDisplayMap &&
                            $scope.statusDisplayMap[status])
                            ? $scope.statusDisplayMap[status]
                            : status;
                }

                return displayStatus === selectedYearStatus;
            });
        }

        // Act
        if ($scope.SelectedAct && $scope.SelectedAct !== 'Act') {
            yearFiltered = yearFiltered.filter(
                row => row.Act === $scope.SelectedAct
            );
        }

        // State
        if ($scope.SelectedState) {
            yearFiltered = yearFiltered.filter(
                row => row.STATE_NM === $scope.SelectedState
            );
        }

        // Month
        if ($scope.SelectedMonth) {
            yearFiltered = yearFiltered.filter(
                row => row.Month === $scope.SelectedMonth
            );
        }

        // ✅ Final Year List
        $scope.YearList = [
            ...new Set(
                yearFiltered
                    .map(x => x.Year)
                    .filter(x => x)
            )
        ].sort();

        // ✅ Final Rows
        $scope.DisplayRows = filtered;
        $scope.complianceRows = filtered;
        $scope.Pagesize = $scope.complianceRows.length;

        $scope.counttiles(filtered);
    };

    $scope.reset = function () {
        $scope.SelectedState = '';
        $scope.SelectedStatus = '';
        $scope.SelectedMonth = '';
        $scope.SelectedYear = '';
        $scope.Search = '';
        $scope.SelectedAct = 'Act';
        $scope.BindSearch();
    }
    $scope.getyear = function (year) {
        $scope.SelectedYear = year;
        $scope.refreshDropdowns();
    }
    $scope.getmonth = function (id) {
        $scope.SelectedMonth = id;
        $scope.refreshDropdowns();
    };
    $scope.getstate = function (state) {
        $scope.SelectedState = state;
        $scope.refreshDropdowns();
    }
    $scope.getAct = function (act) {
        $scope.SelectedAct = act;
        $scope.refreshDropdowns();
    }
    $scope.getstatus = function (status) {
        $scope.SelectedStatus = status;
        $scope.refreshDropdowns();
    }

    $scope.ViewAlldata = function () {
        if ($scope.Showing === "All") {
            $scope.showLoader();
            $scope.Showing = "10";
            var collectionobj = {
                Action: 14,
                Id: LoginId,
                State: $scope.State,
                Month: $scope.Month,
                Year: $scope.Year
            };
            myService.methode(
                'POST',
                "../Retail/SearchSecretarialStatutory",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            ).then(function (response) {
                $scope.allComplianceRows = response.data.Result || [];
                $scope.complianceRows = $scope.allComplianceRows;
                $scope.counttiles($scope.complianceRows);
                $scope.All = $scope.allComplianceRows.length;
                $scope.Pagesize = $scope.allComplianceRows.length;
                $scope.hideLoader();
            }).catch(function (error) {
                console.error("Error fetching data:", error);
                $scope.complianceRows = [];
            });
        }
        else {
            $scope.BindSearch(); $scope.BindFORTILESSearch();
        }

    };

    // here is new method for getting all data  dated 15/05/2026 by aadarsh
    $scope.Flags = function () {
        var collectionobj = {
            Action: 14,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year
        };

        myService.methode(
            'POST',
            "../Retail/SearchSecretarialStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {
            $scope.All = response.data.Result.length || [];
        }).catch(function (error) {
            console.error("Error fetching data:", error);
            $scope.complianceRows = [];
        });
    };


    $scope.closeEventModal = function () {

        var modalEl = document.getElementById('eventModal');
        var modalInstance = bootstrap.Modal.getInstance(modalEl);

        if (modalInstance) {
            modalInstance.hide();
        }
        angular.element('.modal-backdrop').remove();
        angular.element('body').removeClass('modal-open');
        angular.element('body').css('padding-right', '');
    };
    $scope.blockSpace = function (event) {

        var value = ($scope.Search || '');

        // Prevent first space
        if (value.length === 0 && event.which === 32) {
            event.preventDefault();
        }
    };
}

