app.FactoryStatutoryController = function ($scope, $element, $filter, myService, $http, $sce) {


    $scope.BindFilter = function () {
        
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = LoginId;

        var getData = myService.methode(
            'POST',
            "../Retail/SearchFactoryCompliance",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            $scope.SMasterList = response.data.Result || [];
            $scope.ActList = $scope.SMasterList.map(function (x) {
                return x.Act;
            });
            $scope.StateList = $scope.SMasterList.map(function (x) {
                return x.STATE_NM;
            });
            $scope.StatusList = $scope.SMasterList.map(function (x) {
                return x.status;
            });
            $scope.YearsList = $scope.SMasterList.map(function (x) {
                return x.Year;
            });
            $scope.MonthList = $scope.SMasterList.map(function (x) {
                return x.Month;
            });
            $scope.BindSearch(); $scope.BindFORTILESSearch();

        });

    };

    $scope.BindAllSearch = function () {
        $scope.State = ''; $scope.Month = ''; $scope.Year = '';
        $scope.BindSearch(); $scope.BindFORTILESSearch();
    }

    $scope.closeModal = function () {
        $('#complianceModal').modal('hide');
    };
    $scope.selectedCompliance = null;

    $scope.openComplianceModal = function (row) {
        console.log(row);
        $scope.selectedCompliance = {
            Rule: row.Rules || 'N/A',
            Section: row.Section || 'N/A',
            FormNo: row.FormNo || 'N/A',
            Description: row.Description || 'No description available',
            Risk: row.Risk || 'N/A',
            UploadedFilePath: row.UFile || null // Provide path if uploaded
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
    $scope.fileSelected = function (files, row) {
        const file = files[0];

        if (!file) {
            $scope.hideValidationLoader();
            return;
        }

        //✅ Check for PDF extension
        const isPDF = file.type === 'application/pdf';
        if (!isPDF) {

            swal("Invalid File", "Only PDF files are allowed.", "error");
            input.value = ""; // Clear the file
            return;
        }

        // ✅ Check for 3 MB file size limit
        const MAX_SIZE_MB = 3;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_SIZE_MB) {

            swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
            input.value = ""; // Clear the file
            return;
        }
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
                        swal.close(); // ✅ Manually close SweetAlert v1
                        processFile(); // ✅ Continue processing the file
                    } else {
                        $scope.UploadFile = '';
                        $scope.BindSearch();
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }



            function processFile() {
                $scope.UploadFile = '';
                if (files && files.length > 0) {
                    $scope.UploadFile = files[0]; // Assign the first file to the scope variable  
                    $scope.$apply();
                }
            }
        });
    };


    $scope.DownloadFile = function (fileUrl) {
        if (fileUrl) {
            const a = document.createElement("a");
            a.href = fileUrl;
            a.target = "_blank";

            // Try to extract filename from URL
            const fileName = fileUrl.split('/').pop().split('?')[0];
            a.download = fileName;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("No file uploaded.");
        }
    };

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

    $scope.closeTileModal = function () {
        $('#tileDataModal').modal('hide');
    };

    $scope.BindFORTILESSearch = function () {
        var collectionobj = {
            Action: 11,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year
        };

        var getData = myService.methode('POST', "../Retail/SearchFactStatutory", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.modalDataList = response.data.Result || [];
            var rows = $scope.modalDataList;

            // Total compliance count
            $scope.totalcompliance = rows.length;

            function normalize(value) {
                return (value || '').toString().trim().toLowerCase();
            }

            // Filters
            var compliedList = rows.filter(r => normalize(r.CStatus) === 'complied');
            var delayCompliedList = rows.filter(r => normalize(r.CStatus) === 'delay complied');
            var nonCompliedList = rows.filter(r => normalize(r.CStatus) === 'non complied');
            var pendingList = rows.filter(r => normalize(r.CStatus) === 'pending');
            var verifiedList = rows.filter(r => normalize(r.IsVerified) === 'verified');

            // Totals
            $scope.totalComplied = compliedList.length;
            $scope.totalDelayComplied = delayCompliedList.length;
            $scope.totalNonComplied = nonCompliedList.length;
            $scope.totalPending = pendingList.length;
            $scope.totalVerified = verifiedList.length;

            // Percentages (handle divide by zero)
            const total = $scope.totalcompliance || 1; // avoid division by 0

            $scope.compliedPercentage = (($scope.totalComplied / total) * 100).toFixed(2);
            $scope.delayCompliedPercentage = (($scope.totalDelayComplied / total) * 100).toFixed(2);
            $scope.nonCompliedPercentage = (($scope.totalNonComplied / total) * 100).toFixed(2);
            $scope.pendingPercentage = (($scope.totalPending / total) * 100).toFixed(2);
            $scope.verifiedPercentage = (($scope.totalVerified / total) * 100).toFixed(2);
        });
    };



    /*  ==================== BIND SEARCH ====================*/
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

        myService.methode(
            'POST',
            "../Retail/SearchFactStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {
            $scope.allComplianceRows = response.data.Result || [];
            $scope.updateTileCounts();

            // Reset table
            $scope.complianceRows = [];
            $scope.currentIndex = 0;
            $scope.loadMore();
            $scope.Showing = "All";
            $scope.hideLoader();
            $scope.Pagesize = $scope.complianceRows.length;
            $scope.ActList = [...new Set(
                $scope.complianceRows
                    .map(x => x.Act)
                    .filter(x => x)
            )];

            $scope.StateList = [...new Set(
                $scope.complianceRows
                    .map(x => x.STATE_NM)
                    .filter(x => x)
            )];

            $scope.YearsList = [...new Set(
                $scope.complianceRows
                    .map(x => x.Year)
                    .filter(x => x)
            )];

            $scope.MonthList = [...new Set(
                $scope.complianceRows
                    .map(x => x.Month)
                    .filter(x => x)
            )];
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
        }).catch(function (error) {
            console.error("Error fetching data:", error);
            $scope.complianceRows = [];
        });
    };



    // ==================== CONFIG ====================
    $scope.itemsPerPage = 10000000;
    $scope.currentIndex = 0;
    $scope.allComplianceRows = [];
    $scope.complianceRows = [];

    // ==================== LOAD MORE ====================
    $scope.loadMore = function () {
        var nextIndex = $scope.currentIndex + $scope.itemsPerPage;
        var moreData = $scope.allComplianceRows.slice($scope.currentIndex, nextIndex);
        $scope.complianceRows = $scope.complianceRows.concat(moreData);
        $scope.currentIndex = nextIndex;
    };

    // ==================== TILE COUNTS ====================
    $scope.updateTileCounts = function () {
        if (!$scope.allComplianceRows || !$scope.allComplianceRows.length) {
            $scope.compliedDocs = 0;
            $scope.NonApplicable = 0;
            $scope.pendingDocs = 0;
            $scope.VerifiedDocs = 0;
            $scope.delayedDocs = 0;
            $scope.nonCompliedDocs = 0;
            $scope.Remarks = 0;

            $scope.compliedPercent = 0;
            $scope.pendingPercent = 0;
            $scope.VerifiedPercent = 0;
            $scope.delayedPercent = 0;
            $scope.nonCompliedPercent = 0;
            return;
        }

        // केवल statutory rows लो (case-insensitive) old code commented 
        //var rows = $scope.allComplianceRows.filter(function (row) {
        //    return row.Calendartype && row.Calendartype.trim().toLowerCase() === 'statutory';
        //});
        // ✅ All Rows
        var rows = $scope.allComplianceRows || [];
        var total = rows.length;
        $scope.totalCompliance = total;

        // ---- Normalize helper ----
        function normalize(val) {
            return val ? val.toString().trim().toLowerCase() : '';
        }

        // ---- Counts ----
        $scope.compliedDocs = rows.filter(r => normalize(r.CStatus) === 'complied').length;
        $scope.pendingDocs = rows.filter(r => normalize(r.CStatus) === '').length;
        $scope.delayedDocs = rows.filter(r => normalize(r.CStatus) === 'delay complied').length;
        $scope.nonCompliedDocs = rows.filter(r => normalize(r.CStatus) === 'non complied').length;
        $scope.VerifiedDocs = rows.filter(r => normalize(r.IsVerified) === 'verified').length;
        $scope.NonApplicable = rows.filter(r => normalize(r.CStatus) === 'non applicable').length;
        $scope.Remarks = rows.filter(r => normalize(r.IsVerified) === 'remarks').length;


        // ---- Percent calculation ----
        // $scope.totalCompliancePercent = 100;
        $scope.compliedPercent = total ? Math.round(($scope.compliedDocs / total) * 100) : 0;
        $scope.pendingPercent = total ? Math.round(($scope.pendingDocs / total) * 100) : 0;
        $scope.VerifiedPercent = total ? Math.round(($scope.VerifiedDocs / total) * 100) : 0;
        $scope.delayedPercent = total ? Math.round(($scope.delayedDocs / total) * 100) : 0;
        $scope.nonCompliedPercent = total ? Math.round(($scope.nonCompliedDocs / total) * 100) : 0;

        // Debugging
        console.log("Counts =>", {
            Complied: $scope.compliedDocs,
            Pending: $scope.pendingDocs,
            Delayed: $scope.delayedDocs,
            NonComplied: $scope.nonCompliedDocs,
            Verified: $scope.VerifiedDocs
        });
    };



    // ==================== MODAL ====================
    $scope.openModal = function (type) {
        $scope.modalTitle = type;
        $scope.modalData = $scope.modalDataList;
        //var rows = $scope.modalData.filter(function (row) {
        //    return row.Calendartype && row.Calendartype.trim().toLowerCase() === 'statutory';
        //});
        var rows = $scope.modalData;
        function normalize(val) {
            return val ? val.toString().trim().toLowerCase() : '';
        }

        if (type === 'Total Compliance') {
            $scope.modalData = rows;
        }
        else if (type === 'Complied Docs') {
            $scope.modalData = rows.filter(r => normalize(r.CStatus) === 'complied'); // सही
        }
        else if (type === 'Delayed Docs') {
            $scope.modalData = rows.filter(r => normalize(r.CStatus) === 'delay complied');
        }
        else if (type === 'Non Complied Docs') {
            $scope.modalData = rows.filter(r => normalize(r.CStatus) === 'non complied');
        }
        else if (type === 'Pending Docs') {
            $scope.modalData = rows.filter(r => normalize(r.CStatus) === 'pending');
        }
        else if (type === 'Verified') {
            $scope.modalData = rows.filter(r => normalize(r.IsVerified) === 'verified');
        }


        $('#tileDataModal').modal('show');
    };


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
        if (!row.ActualSubmissionDate) {
            showMsgBox("Please enter Actual Submission Date.");
            return;
        }
        if (!row.IsVerified && $scope.Fac_allowverifyflag === true) {
            showMsgBox("Please Select Verification Status");
            return;
        }
        if (row.IsVerified == '' && $scope.Fac_allowverifyflag === true) {
            showMsgBox("Please Select Verification Status");
            return;
        }
        if (row.VRemark1 == '' && row.IsVerified == 'Remarks' && $scope.Fac_allowverifyflag === true) {
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
            } else {
                formData.append('UploadFile', row.UploadFile);
            }

            formData.append('Createdby', LoginId);
            formData.append('Status', row.CStatus);
            formData.append('VRemark', row.VRemark1);
            formData.append('CRemark', row.CRemark1);
            formData.append('IsVerified', row.IsVerified);
            formData.append('CACId', row.CACId);
            formData.append('Action', '1');

            $http.post("../Retail/IUDFactoryStatutory", formData, {
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
    };

    $scope.openEventModal = function (row) {
        console.log(row);
        if (row.Frequency !== 'Event') {
            return;
        }
        var modalEl = document.getElementById('eventModal');
        var obj = angular.copy(row);

        obj.ActualSubmissionDate = "";
        obj.UploadFile = null;
        obj.CStatus = "";
        obj.DelayDays = "";
        obj.IsVerified = "";
        obj.openthis = "0";
        obj.CreateOn = "";
        obj.VRemark = "";
        obj.VRemark1 = "";
        obj.CSIID = "";
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
        newRow.CSIID = '';
        $scope.selectedEvent1.push(newRow);
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

    $scope.AddEventNewverifyRecord = function (event) {
        if (!event.ActualSubmissionDate) {
            showMsgBox("Please enter Actual Submission Date.");
            return;
        }
        if (!event.IsVerified) {
            showMsgBox("Please Select Verification Status");
            return;
        }
        if (event.VRemark1 == '' && event.IsVerified == 'Remarks') {
            showMsgBox("Please enter Remark in condition of Remarks.");
            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            formData.append('ASD', $filter('date')(event.ActualSubmissionDate, 'yyyy/MM/dd'));
            formData.append('CSD', $filter('date')(event.CSD, 'yyyy/MM/dd'));
            formData.append('RegNo', event.RegistrationNumber);
            formData.append('DelayDay', event.DelayDay);

            if (event.UploadFile == undefined || event.UploadFile == null || event.UploadFile == '') {
                formData.append('UploadFile', '-1');
            } else {
                formData.append('UploadFile', event.UploadFile);
            }

            formData.append('Createdby', LoginId);
            formData.append('Status', event.CStatus);
            formData.append('VRemark', event.VRemark1);
            formData.append('CRemark', event.CRemark1);
            formData.append('IsVerified', event.IsVerified);
            formData.append('CACId', $scope.CACEventId);
            formData.append('Id', event.CSIID);
            formData.append('Action', '1');
            console.log(formData);
            $http.post("../Retail/AddFactoryEventcompliance", formData, {
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
    };

    $scope.getEventDetails = function (CACId) {
        var collectionobj = {
            Action: 4,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year,
            CACId: CACId
        };
        myService.methode('POST', "../Retail/SearchFactoryEventcompliance", { obj: collectionobj }   // cleaner than string JSON
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

    $scope.selectedRemark1 = "";
    $scope.HeaderRemark1 = "";
    $scope.openRemarkModal1 = function (remark1, Header1) {
        $scope.selectedRemark1 = $sce.trustAsHtml(remark1);
        $scope.HeaderRemark1 = Header1;
        $('#remarkModal1').modal('show');
    };
    //$scope.downloadFile = function (url) {
    //    var link = document.createElement('a');
    //    link.href = url;
    //    link.download = '';
    //    document.body.appendChild(link);
    //    link.click();
    //    document.body.removeChild(link);
    //};

    // here is new method for getting all data  dated 13/05/2026 by aadarsh
    $scope.Flags = function () {
        var collectionobj = {
            Action: 13,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year
        };

        myService.methode(
            'POST',
            "../Retail/SearchFactStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {
            $scope.allComplianceRows = response.data.Result || [];
            $scope.All = $scope.allComplianceRows.length;
            
        }).catch(function (error) {
            console.error("Error fetching data:", error);
            $scope.complianceRows = [];
        });
    };
    $scope.ViewAlldata = function () {
        if ($scope.Showing === "All") {
            $scope.showLoader();
            $scope.Showing = "7";
            var collectionobj = {
                Action: 13,
                Id: LoginId,
                State: $scope.State,
                Month: $scope.Month,
                Year: $scope.Year
            };
            myService.methode(
                'POST',
                "../Retail/SearchFactStatutory",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            ).then(function (response) {
                $scope.allComplianceRows = response.data.Result || [];
                $scope.updateTileCounts();
                $scope.complianceRows = [];
                $scope.complianceRows = $scope.allComplianceRows;
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

    $scope.NEwPrintTable = function () {

        function printData(data) {

            // ✅ Convert single object into array
            if (data && !Array.isArray(data)) {
                data = [data];
            }

            data = data || [];

            if (!data.length) {
                alert("No data available!");
                return;
            }

            var companyName = MapUser || '';

            // ✅ Current Date
            var today = new Date();
            var generatedOn =
                ('0' + today.getDate()).slice(-2) + "-" +
                ('0' + (today.getMonth() + 1)).slice(-2) + "-" +
                today.getFullYear();

            // ✅ Date Formatter
            function formatDate(dateValue) {

                if (!dateValue) return '';

                var d = new Date(dateValue);

                if (isNaN(d.getTime())) return '';

                return ('0' + d.getDate()).slice(-2) + '-' +
                    ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                    d.getFullYear();
            }

            // ✅ Table HTML
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

            // ✅ Use data instead of complianceRows
            data.forEach(function (row, index) {

                var statusText = '';

                if (row.CStatus === "Non Complied") {
                    statusText = 'Non-Complied';
                }
                else if (row.CStatus === "Non Applicable") {
                    statusText = 'Non-Applicable';
                }
                else if (row.CStatus === "Complied") {
                    statusText = 'Complied';
                }
                else if (row.CStatus === "Delay Complied") {
                    statusText = 'Delay-Complied';
                }
                else {
                    statusText = 'Pending';
                }

                tableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.Act || ''}</td>
                    <td>${row.ComplianceName || ''}</td>
                    <td>${row.Risk || ''}</td>
                    <td>${row.Frequency || ''}</td>
                    <td>${row.Month || ''}</td>
                    <td>${row.STATE_NM || ''}</td>
                    <td>${formatDate(row.DueDate)}</td>
                    <td>${statusText}</td>
                    <td>${formatDate(row.ActualSubmissionDate)}</td>
                    <td>${row.DelayDays || 0}</td>
                    <td>${row.UploadFile ? 'Uploaded' : 'Not Uploaded'}</td>
                    <td>${formatDate(row.CreateOn)}</td>
                    <td>${row.IsVerified || ''}</td>
                </tr>
            `;
            });

            tableHTML += `
                </tbody>
            </table>
        `;

            // ✅ Open Print Window
            var printWindow = window.open('', '', 'width=1200,height=700');

            printWindow.document.write(`
            <html>
            <head>
                <title>Factory Compliance</title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        padding: 10px;
                    }

                    .print-header {
                        text-align: center;
                        margin-bottom: 20px;
                    }

                    .company-name {
                        font-size: 14px;
                        margin-top: 5px;
                    }

                    .generated {
                        text-align: right;
                        font-size: 12px;
                        margin-bottom: 10px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        table-layout: auto;
                    }

                    th, td {
                        border: 1px solid #000;
                        padding: 6px;
                        font-size: 11px;
                        text-align: left;
                        word-break: break-word;
                    }

                    th {
                        background: #F37437;
                        color: #000;
                    }

                    @media print {

                        body {
                            -webkit-print-color-adjust: exact;
                        }

                        th {
                            background: #F37437 !important;
                        }
                    }

                </style>

            </head>

            <body>

                <div class="generated">
                    <strong>Generated On:</strong> ${generatedOn}
                </div>

                <div class="print-header">
                    <h2>Factory Compliance</h2>
                    <div class="company-name">${companyName}</div>
                </div>

                ${tableHTML}

            </body>
            </html>
        `);

            printWindow.document.close();

            // ✅ Print
            printWindow.onload = function () {

                printWindow.focus();

                setTimeout(function () {

                    printWindow.print();
                    printWindow.close();

                }, 500);
            };
        }

        // ✅ Pass Correct Scope Data
        printData($scope.complianceRows);

    };

    $scope.NewExportCSV = function () {

        var data = $scope.complianceRows || [];

        if (!data.length) {
            alert("No data available!");
            return;
        }
        function formatDate(dateValue) {

            if (!dateValue) return '';

            var d = new Date(dateValue);

            if (isNaN(d.getTime())) return '';

            return ('0' + d.getDate()).slice(-2) + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                d.getFullYear();
        }
        var csv = [];

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
        angular.forEach(data, function (row, index) {
            var statusText = '';
            if (row.CStatus === "Non Complied") {
                statusText = 'Non-Complied';
            }
            else if (row.CStatus === "Non Applicable") {
                statusText = 'Non-Applicable';
            }
            else if (row.CStatus === "Complied") {
                statusText = 'Complied';
            }
            else if (row.CStatus === "Delay Complied") {
                statusText = 'Delay-Complied';
            }
            else {
                statusText = 'Pending';
            }

            var rowData = [
                index + 1,
                '"' + (row.Act || '') + '"',
                '"' + (row.ComplianceName || '') + '"',
                '"' + (row.Risk || '') + '"',
                '"' + (row.Frequency || '') + '"',
                '"' + (row.Month || '') + '"',
                '"' + (row.STATE_NM || '') + '"',
                '"' + formatDate(row.DueDate) + '"',
                '"' + statusText + '"',
                '"' + formatDate(row.ActualSubmissionDate) + '"',
                '"' + (row.DelayDays || 0) + '"',
                '"' + (row.UploadFile ? 'Uploaded' : 'Not Uploaded') + '"',
                '"' + formatDate(row.CreateOn) + '"',
                '"' + (row.IsVerified || '') + '"'
            ];

            csv.push(rowData.join(","));
        });
        var csvContent = "\uFEFF" + csv.join("\n");
        var blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        var link = document.createElement("a");
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, "FactoryCompliance.csv");
        } else {
            var url = URL.createObjectURL(blob);
            link.href = url;
            link.download = "FactoryCompliance.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    $scope.refreshDropdowns = function () {

        var filtered = angular.copy($scope.allComplianceRows || []);

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
                var finalMatch = displayStatus.toString().trim() === selected;
                return finalMatch;
            });
        }
        $scope.DisplayRows = filtered;
        if ($scope.SelectedAct && $scope.SelectedAct !== 'Act') {
            filtered = filtered.filter(row => row.Act === $scope.SelectedAct);
        }
        if ($scope.SelectedState) {
            filtered = filtered.filter(row => row.STATE_NM === $scope.SelectedState);
        }

        // ✅ Month & Year
        if ($scope.SelectedMonth) {
            filtered = filtered.filter(row => row.Month == $scope.SelectedMonth);
        }

        if ($scope.SelectedYear) {
            filtered = filtered.filter(row => row.Year == $scope.SelectedYear);
        }

        // ✅ Normalize
        filtered.forEach(function (row) {
            if (!row.IsVerified || row.IsVerified === 'null' || row.IsVerified === 'undefined') {
                row.IsVerified = '';
            }
        });

        $scope.StatusList = [
            ...new Set(

                filtered.map(function (row) {
                    var status = (row.CStatus || '').toString().trim();
                    var isVerified = (row.IsVerified || '').toString().trim();

                    var displayStatus = '';

                    if (!status) {
                        displayStatus = 'Pending';
                    }
                    else if (isVerified === "Verified" && (status !== 'Non Applicable' && status !== 'Delay Complied' && status !== 'Complied' && status !== 'Non Complied')) {
                        displayStatus = 'Verified';
                    }
                    else if (isVerified === "Remarks" && (status !== 'Non Applicable' && status !== 'Delay Complied' && status !== 'Complied' && status !== 'Non Complied')) {
                        displayStatus = 'Remarks';
                    }

                    else {
                        displayStatus = ($scope.statusDisplayMap && $scope.statusDisplayMap[status])
                            ? $scope.statusDisplayMap[status]
                            : status;
                    }



                    return displayStatus;
                })
            )
        ].sort();
        $scope.StateList = [...new Set(filtered.map(x => x.STATE_NM))];
        $scope.MonthList = [...new Set(filtered.map(x => x.Month))];
        $scope.YearList = [...new Set(filtered.map(x => x.Year))];

        $scope.allComplianceRows = filtered;
        $scope.complianceRows = $scope.allComplianceRows;
        $scope.updateTileCounts(filtered);
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
}

