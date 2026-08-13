app.FinacialStatutoryController = function ($scope, $element, $filter, myService, $http, $sce) {
    $scope.BindFilter = function () {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchRetailFinacialCreateActCalender", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SMasterList = response.data.Result;


            const distinctYears = [...new Set(response.data.Result.map(item => item.Year))];
            $scope.YearsList = distinctYears;


        });
    }


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


    $scope.ExportTableToExcel = function () {
        var table = document.querySelector('#complianceTable');
        if (!table) {
            alert("Table not found!");
            return;
        }

        // Clone the table
        var tableClone = table.cloneNode(true);

        // Completely remove elements with class 'no-print'
        var noPrintElements = tableClone.querySelectorAll('.no-print');
        noPrintElements.forEach(function (el) {
            el.remove();
        });

        // Allowed columns
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

        // Identify indexes to keep
        var headerCells = tableClone.querySelectorAll('thead tr th');
        var keepIndexes = [];
        headerCells.forEach(function (th, index) {
            var headerText = th.textContent.trim().toLowerCase();
            if (allowedHeaders.includes(headerText)) {
                keepIndexes.push(index);
            }
        });

        // Remove unwanted <th>
        var theadRows = tableClone.querySelectorAll('thead tr');
        theadRows.forEach(function (tr) {
            var ths = tr.querySelectorAll('th');
            for (var i = ths.length - 1; i >= 0; i--) {
                if (!keepIndexes.includes(i)) {
                    ths[i].remove();
                }
            }
        });

        // Remove unwanted <td>
        var bodyRows = tableClone.querySelectorAll('tbody tr');
        bodyRows.forEach(function (tr) {
            var tds = tr.querySelectorAll('td');
            for (var i = tds.length - 1; i >= 0; i--) {
                if (!keepIndexes.includes(i)) {
                    tds[i].remove();
                }
            }
        });

        // Replace dropdowns with plain text
        var selects = tableClone.querySelectorAll('select');
        selects.forEach(function (select) {
            var selectedText = '';
            try {
                selectedText = select.options[select.selectedIndex]?.text || '';
                if (selectedText.toLowerCase() === 'select') selectedText = '';
            } catch (e) {
                selectedText = '';
            }
            var span = document.createElement('span');
            span.textContent = selectedText;
            select.parentNode.replaceChild(span, select);
        });

        // Remove any remaining <select> elements
        var leftoverSelects = tableClone.querySelectorAll('select');
        leftoverSelects.forEach(function (sel) {
            var span = document.createElement('span');
            span.textContent = '';
            sel.parentNode.replaceChild(span, sel);
        });

        // Reveal hidden <p> values
        var hiddenPs = tableClone.querySelectorAll('p[ng-show="false"]');
        hiddenPs.forEach(function (p) {
            p.style.display = 'block';
        });

        // Style formatting
        var cells = tableClone.querySelectorAll('th, td');
        cells.forEach(function (cell) {
            cell.style.border = '1px solid #000';
            cell.style.padding = '5px';
            cell.style.textAlign = 'left';
        });

        tableClone.style.borderCollapse = 'collapse';
        tableClone.style.width = '100%';

        // Generate Excel HTML
        var html = `
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

        // Trigger file download
        var blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'StatutoryDetails.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        const fileName = file.name;
        console.log("Selected File Name:", fileName);

        row.FileName = fileName;

        const isPDF = file.type === 'application/pdf';
        if (!isPDF) {
            swal("Invalid File", "Only PDF files are allowed.", "error");
            return;
        }

        const MAX_SIZE_MB = 3;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_SIZE_MB) {
            swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
            return;
        }

        $scope.showValidationLoader();

        validateDocument(file, $scope.CN, function (isValid) {
            $scope.hideValidationLoader();

            function processFile() {
                row.UploadFile = file;
                row.FileName = file.name;
                $scope.$apply();
            }

            if (!isValid) {
                swal({
                    title: "Are you sure?",
                    text: "Uploaded file does not appear to be valid. Do you want to continue?",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes, continue!",
                    cancelButtonText: "Cancel"
                }, function (isConfirm) {
                    if (isConfirm) {
                        swal.close();
                        processFile();
                    }
                });
            } else {
                processFile();
            }
        });
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
    $scope.exportToPDF = function () {
        const { jsPDF } = window.jspdf; // Ensure jsPDF is loaded
        const doc = new jsPDF();

        let content = $element.find(".table")[0]; // Find the table element
        doc.autoTable({ html: content }); // Use the autoTable plugin for jsPDF
        doc.save("Statutory/Internal.pdf");
    };
    $scope.SetNewValue = function (row, fuCandidatePhoto, ufile) {
        $scope.CACId = row.Id;
        $scope.ASD = row.ActualSubmissionDate;
        $scope.CSD = row.ComplianceSubmissionDate;
        $scope.DelayDay = row.DelayDays;
        $scope.Createdby = LoginId;
        $scope.CN = row.ComplianceName;
        $(fuCandidatePhoto).click();

    }
    $scope.BindSearch = function () {
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.Id = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;

        var getData = myService.methode('POST', "../Retail/SearchFinacialStatutory", '{obj:' + JSON.stringify(collectionobj) + '}'
        );
        getData.then(function (response) {
            $scope.complianceRows = response.data.Result;
            $scope.AllRows = response.data.Result;
            angular.forEach($scope.complianceRows, function (row) {
                row.TempIsVerified = row.IsVerified;
            });
            $scope.getalldropdowndata();
        });
    }
    $scope.SelectedAct = 'All';
    $scope.filterByAct = function (act) {

        $scope.SelectedAct = act;

        if (act === 'All') {
            $scope.complianceRows = angular.copy($scope.AllRows);
        } else {
            $scope.complianceRows = $scope.AllRows.filter(function (row) {
                return row.Act === act;
            });
        }
        $scope.updateTilesCount($scope.complianceRows);
    };

    $scope.updateTilesCount = function (data) {

        var complied = 0;
        var nonComplied = 0;
        var delayComplied = 0;
        var nonApplicable = 0;
        var pending = 0;
        var verified = 0;
        var TotalClarification = 0;

        angular.forEach(data, function (row) {

            var status = (row.CStatus || '')
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/-/g, '')
                .trim();

            var verifyStatus = (row.IsVerified || '').toLowerCase().trim();

            switch (status) {

                case 'complied':
                    complied++;
                    break;

                case 'noncomplied':
                    nonComplied++;
                    break;

                case 'delaycomplied':
                    delayComplied++;
                    break;

                case 'nonapplicable':
                    nonApplicable++;
                    break;

                default:
                    pending++;
                    break;
            }

            if (verifyStatus === 'verified') {
                verified++;
            }

            if (verifyStatus === 'clarify') {
                TotalClarification++;
            }
        });

        $scope.TotalComplied = complied;
        $scope.TotalNonComplied = nonComplied + pending;
        $scope.TotalDelayComplied = delayComplied;
        $scope.TotalNonApplicable = nonApplicable;
        $scope.TotalVerified = verified;
        $scope.TotalClarification = TotalClarification;
    };

    $scope.$watch('Search', function () {

        if (!$scope.AllRows) return;

        var filteredData = $scope.AllRows.filter(function (row) {
            return $scope.globalSearch(row);
        });
        $scope.complianceRows = filteredData;
        $scope.updateTilesCount(filteredData);
    });

    $scope.globalSearch = function (row) {

        if (!$scope.Search) return true;

        var searchText = $scope.Search.toString().toLowerCase();
        //var monthName = row.Month;
        //monthName = monthName ? monthName.toLowerCase() : '';

        return (
            (row.SNo && row.SNo.toString().toLowerCase().includes(searchText)) ||
            (row.Act && row.Act.toLowerCase().includes(searchText)) ||
            (row.ComplianceName && row.ComplianceName.toLowerCase().includes(searchText)) ||
            (row.RegistrationNumber && row.RegistrationNumber.toLowerCase().includes(searchText)) ||
            (row.Risk && row.Risk.toLowerCase().includes(searchText)) ||
            (row.Frequency && row.Frequency.toLowerCase().includes(searchText)) ||
            //(monthName.includes(searchText)) ||
            (row.Month && row.Month.toString().toLowerCase().includes(searchText)) ||
            (row.STATE_NM && row.STATE_NM.toLowerCase().includes(searchText)) ||
            (row.DueDate && row.DueDate.toString().toLowerCase().includes(searchText)) ||
            (row.CStatus && row.CStatus.toLowerCase().includes(searchText)) ||
            (row.DelayDays && row.DelayDays.toString().includes(searchText)) ||
            (row.CreateOn && row.CreateOn.toString().toLowerCase().includes(searchText)) ||
            (row.IsVerified && row.IsVerified.toLowerCase().includes(searchText)) ||
            (row.VRemark && row.VRemark.toLowerCase().includes(searchText))
        );
    };
    $scope.refreshDropdowns = function () {

        var filtered = $scope.AllRows;

        // ✅ Filter by Act
        if ($scope.SelectedAct && $scope.SelectedAct !== 'All') {
            filtered = filtered.filter(function (row) {
                return row.Act === $scope.SelectedAct;
            });
        }

        // ✅ Filter by State
        if ($scope.SelectedState) {
            filtered = filtered.filter(function (row) {
                return row.STATE_NM === $scope.SelectedState;
            });
        }

        // ✅ ✅ FIXED: Filter by Status (Pending + blank handle)
        if ($scope.SelectedStatus) {
            filtered = filtered.filter(function (row) {

                var status = row.CStatus;
                if (!status || status.trim() === '') {
                    status = 'Pending';
                }
                var displayStatus = $scope.statusDisplayMap[status] || status;

                return displayStatus === $scope.SelectedStatus;
            });
        }

        // ✅ Filter by Month
        if ($scope.SelectedMonth) {
            filtered = filtered.filter(function (row) {
                return row.Month == $scope.SelectedMonth;
            });
        }

        // ✅ Filter by Year
        if ($scope.SelectedYear) {
            filtered = filtered.filter(function (row) {
                return row.Year == $scope.SelectedYear;
            });
        }
        $scope.StatusList = [
            ...new Set(
                filtered.map(function (x) {
                    var status = x.CStatus;

                    if (!status || status.trim() === '') {
                        status = 'Pending';
                    }

                    return $scope.statusDisplayMap[status] || status;
                })
            )
        ];
        $scope.StateList = [...new Set(filtered.map(x => x.STATE_NM))];
        $scope.MonthList = [...new Set(filtered.map(x => x.Month))];
        $scope.YearList = [...new Set(filtered.map(x => x.Year))];

        $scope.complianceRows = filtered;

        $scope.updateTilesCount(filtered);
    };

    $scope.SaveRecord = function () {
        if (isValidate()) {
            $scope.AfterverifyRecord()
        }
    }

    $scope.trustAsHtml = function (html) {
        return $sce.trustAsHtml(html);
    };
    $scope.openComplianceModal = function () {

        var modal = new bootstrap.Modal(
            document.getElementById('complianceDetailsModal')
        );

        modal.show();
    };
    $scope.getMonthName = function (num) {
        const months = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return months[num] || "";
    };
    $scope.BindCompliance = function (Id) {

        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.Id = Id;

        var getData = myService.methode('POST',"../Retail/CategoryStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            var result = (response.data && response.data.Result && response.data.Result.length > 0)
                ? response.data.Result[0]
                : null;
            console.log(result);
            if (result) {

                $scope.Cname = result.ComplianceName || 'N/A';
                $scope.Rule = result.Rules || 'N/A';
                $scope.Section = result.Section || 'N/A';
                $scope.FormNo = result.FormNo || 'N/A';
                $scope.Risk = result.Risk || 'N/A';
                if (!result.UploadFile || result.UploadFile === 'null' || result.UploadFile.trim() === '') {
                    $scope.Attachment = null;
                } else {
                    $scope.Attachment = result.UploadFile;
                }
                $scope.Description = result.Description || 'N/A';

            } else {
                t

                // Reset values if no data
                $scope.Cname = 'N/A';
                $scope.Rule = 'N/A';
                $scope.Section = 'N/A';
                $scope.FormNo = 'N/A';
                $scope.Risk = 'N/A';
                $scope.Attachment = '';
                $scope.Description = 'N/A';
            }

        }, function (error) {
            console.error("Error loading compliance details:", error);
        });

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
                "SNo",
                "Act Name",
                "Compliance Name",
                "Registration No.",
                "Risk",
                "Frequency",
                "Month",
                "State",
                "Due Date",
                "Status",
                "Actual Submission Date",
                "Delay Days",
                "Verification Status"
            ].join(","));

            // Data Rows
            data.forEach(function (row, index) {

                var rowData = [
                    index + 1,
                    row.Act || '',
                    row.ComplianceName || '',
                    row.RegistrationNumber || '',
                    row.Risk || '',
                    row.Frequency || '',
                    row.Month || '',
                    row.STATE_NM || '',
                    row.DueDate || '',
                    row.CStatus || '',
                    formatDate(row.ActualSubmissionDate),
                    row.DelayDays || '',
                    (row.IsVerified == 0 ? '' : row.IsVerified == 'Clarify' ? 'Remarks' : (row.IsVerified || ''))
                ];

                csv.push(rowData.map(val => `"${val}"`).join(","));
            });

            var csvContent = csv.join('\n');
            var blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });

            var link = document.createElement('a');

            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(blob, "FinanceCompliance.csv");
            } else {
                var url = URL.createObjectURL(blob);
                link.href = url;
                link.download = "FinanceCompliance.csv";
                document.body.appendChild(link);
                link.click();
                setTimeout(function () {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 0);
            }
        }
        var isFilterApplied = $scope.filters && Object.values($scope.filters).some(v => v);
        if (!isFilterApplied && !$scope.SelectedState && ($scope.SelectedAct === 'All' || !$scope.SelectedAct) && !$scope.SelectedMonth &&
            !$scope.SelectedStatus && !$scope.SelectedYear && !$scope.Search) {
            $scope.newexportdata().then(function (data) {
                console.log("API Data:", data);
                exportToCSV(data);
            });

        } else {

            exportToCSV($scope.complianceRows);
        }
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

                if ($scope.SelectedAct && $scope.SelectedAct !== 'All' && row.Act !== $scope.SelectedAct) return false;

                if ($scope.SelectedMonth && row.Month !== $scope.SelectedMonth) return false;

                if ($scope.SelectedStatus && row.CStatus !== $scope.SelectedStatus) return false;

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
                    <th>SNo</th>
                    <th>Act</th>
                    <th>Compliance Name</th>
                    <th>Registration No.</th>
                    <th>Risk</th>
                    <th>Frequency</th>
                    <th>Month</th>
                    <th>State</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actual Submission Date</th>
                    <th>Delay Days</th> 
                    <th>Verification Status</th>
                </tr>
            </thead>
            <tbody>
        `;

            filteredData.forEach(function (row, index) {

                tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${row.Act || ''}</td>
                <td>${row.ComplianceName || ''}</td>
                <td>${row.RegistrationNumber || ''}</td>
                <td>${row.Risk || ''}</td>
                <td>${row.Frequency || ''}</td>
                <td>${row.Month}</td>
                <td>${row.STATE_NM || ''}</td>
                <td>${row.DueDate}</td>
                <td>${row.CStatus || ''}</td>
                <td>${formatDate(row.ActualSubmissionDate)}</td>
                <td>${row.DelayDays || ''}</td> 
                <td>${(row.IsVerified == 0 ? '' : row.IsVerified == 'Clarify' ? 'Remarks' : (row.IsVerified || ''))}</td>
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
                <h2>Finance Compliance</h2>
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

        var isNoFilter =
            !$scope.SelectedState &&
            ($scope.SelectedAct === 'All' || !$scope.SelectedAct) &&
            !$scope.SelectedMonth &&
            !$scope.SelectedStatus &&
            !$scope.SelectedYear &&
            !$scope.Search;

        if (isNoFilter) {
            $scope.newexportdata().then(function (data) {
                printData(data);
            });

        } else {
            printData($scope.complianceRows);
        }
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
        console.log(row);
        row.IsVerified = row.TempIsVerified;
        if (!row.CStatus || !row.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (!row.IsVerified) {
            showMsgBox("Please enter Verified Status");
            return;
        }
        if (row.VRemark1 == '' && row.IsVerified == 'Clarify') {
            showMsgBox("Please enter Remark in condition of Clarify.");
            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            formData.append('ASD', $filter('date')(row.ActualSubmissionDate, 'yyyy/MM/dd'));
            formData.append('CSD', $filter('date')(row.CSD, 'yyyy/MM/dd'));
            formData.append('RegNo', row.RegistrationNumber);
            formData.append('DelayDay', row.DelayDay);
            formData.append('UploadFile', row.UploadFile);

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
            formData.append('Action', '1');
            $http.post("../Retail/IUDFinancialStatutory", formData, {
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

    $scope.reset = function () {
        $scope.SelectedState = '';
        $scope.SelectedStatus = '';
        $scope.SelectedMonth = '';
        $scope.SelectedYear = '';
        $scope.SelectedAct = 'All';
        $scope.BindSearch();
    }
    $scope.getyear = function (year) {
        $scope.SelectedYear = year;
        $scope.refreshDropdowns();
    }
    $scope.getmonth = function (id, name) {
        $scope.SelectedMonth = id;
        $scope.SelectedMonthName = name;

        $scope.refreshDropdowns();
    };
    $scope.getstate = function (State) {
        $scope.SelectedState = State;
        $scope.refreshDropdowns();
    }
    $scope.getAct = function (Act) {
        $scope.SelectedAct = Act;
        $scope.refreshDropdowns();
    }
    $scope.getstatus = function (Status) {
        $scope.SelectedStatus = Status;
        $scope.refreshDropdowns();
    }
    $scope.ApplyFilters = function () {
        $scope.complianceRows = $scope.AllRows.filter(function (row) {

            var matchState = !$scope.SelectedState || row.STATE_NM === $scope.SelectedState;

            var matchStatus = true;

            if ($scope.SelectedStatus) {

                if ($scope.SelectedStatus === 'Pending') {
                    matchStatus = !row.CStatus || row.CStatus === '';
                }
                else if ($scope.SelectedStatus === 'Verified') {
                    matchStatus = row.IsVerified === 'Verified';
                }
                else {
                    matchStatus = row.CStatus === $scope.SelectedStatus;
                }
            }
            var matchMonth = !$scope.SelectedMonth || row.Month == $scope.SelectedMonth;

            var matchYear = !$scope.SelectedYear || row.Year == $scope.SelectedYear;

            return matchState && matchStatus && matchMonth && matchYear;
        });
        $scope.updateTilesCount($scope.complianceRows);
    };
    $scope.getalldropdowndata = function () {
        var collectionobj = {};
        collectionobj.Action = 13;
        collectionobj.Id = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;
        var getData = myService.methode('POST', "../Retail/SearchFinacialStatutory", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AllRows = response.data.Result || [];

            $scope.ActList = [];
            angular.forEach($scope.AllRows, function (row) {
                if (row.Act && $scope.ActList.indexOf(row.Act) === -1) {
                    $scope.ActList.push(row.Act);
                }
            });
            $scope.statusDisplayMap = {
                'Complied': 'Complied',
                'NonComplied': 'Non-Complied',
                'Delayed': 'Delayed',
                'NonApplicable': 'Non-Applicable',
                'Pending': 'Pending',
                'Verified': 'Verified'
            };
            $scope.StatusList = ['Complied', 'Non-Complied', 'Delayed', 'Non-Applicable', 'Pending', 'Verified'];
            $scope.StateList = [];
            $scope.YearList = [];
            $scope.MonthList = [];


            angular.forEach($scope.AllRows, function (row) {

                if (row.STATE_NM && $scope.StateList.indexOf(row.STATE_NM) === -1) {
                    $scope.StateList.push(row.STATE_NM);
                }

                if (row.Year && $scope.YearList.indexOf(row.Year) === -1) {
                    $scope.YearList.push(row.Year);
                }
                if (row.Month && $scope.MonthList.indexOf(row.Month) === -1) {
                    $scope.MonthList.push(row.Month);
                }
            });
            $scope.updateTilesCount($scope.AllRows);
        });
    }
    $scope.Getalldata = function () {
        var collectionobj = {};
        collectionobj.Action = 13;
        collectionobj.Id = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;
        var getData = myService.methode('POST', "../Retail/SearchFinacialStatutory", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.complianceRows = response.data.Result;
            $scope.AllRows = response.data.Result || [];

            $scope.ActList = [];
            angular.forEach($scope.AllRows, function (row) {
                if (row.Act && $scope.ActList.indexOf(row.Act) === -1) {
                    $scope.ActList.push(row.Act);
                }
            });
            $scope.StateList = [];
            $scope.YearList = [];
            $scope.MonthList = [];

            angular.forEach($scope.AllRows, function (row) {

                if (row.STATE_NM && $scope.StateList.indexOf(row.STATE_NM) === -1) {
                    $scope.StateList.push(row.STATE_NM);
                }

                if (row.Year && $scope.YearList.indexOf(row.Year) === -1) {
                    $scope.YearList.push(row.Year);
                }
                if (row.Month && $scope.MonthList.indexOf(row.Month) === -1) {
                    $scope.MonthList.push(row.Month);
                }
            });

            angular.forEach($scope.complianceRows, function (row) {
                row.TempIsVerified = row.IsVerified;
            });
            $scope.updateTilesCount($scope.complianceRows);
        });
    }

    $scope.newexportdata = function () {
        var collectionobj = {};
        collectionobj.Action = 13;
        collectionobj.Id = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;
        return myService.methode(
            'POST',
            "../Retail/SearchFinacialStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {

            $scope.AllRows = response.data.Result;

            return response.data.Result; 
        });
    };
    // New code added work from home
    $scope.AddEventNewverifyRecord = function (event) {
        console.log(event);
        event.IsVerified = event.TempIsVerified;
        if (!event.CStatus || !event.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (event.TempIsVerified == '') {
            showMsgBox("Please enter Verified Status");
            return;
        }
        if (event.VRemark1 == '' && event.IsVerified == 'Clarify') {
            showMsgBox("Please enter Remark in condition of Clarify.");
            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            formData.append('ASD', $filter('date')(event.ActualSubmissionDate, 'yyyy/MM/dd'));
            formData.append('CSD', $filter('date')(event.CSD, 'yyyy/MM/dd'));
            formData.append('RegNo', "");
            formData.append('DelayDay', event.DelayDay);
            formData.append('UploadFile', event.UploadFile);

            if (!event.UploadFile) {
                formData.append('UploadFile', '-1');
            } else {
                formData.append('UploadFile', event.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', event.CStatus);
            formData.append('VRemark', event.VRemark1);
            formData.append('CRemark', "");
            formData.append('IsVerified', event.IsVerified);

            formData.append('CACId', $scope.CACEventId);
            formData.append('Action', '3');
            $http.post("../Retail/IUDFinancialStatutory", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                $scope.UploadFile = '';
                $scope.selectedEvent = {};
                //$scope.selectedEvent1 = {};
                //$scope.CACEventId = '';
                showMsgBox(response.data.Result);
                $scope.getEventDetails($scope.CACEventId);
            }, function (error) {
                console.error('Error', error);
            });
        }
    }
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

    $scope.openEventModal = function (row) {
        if (row.Frequency !== 'Event') {
            return;
        }
        console.log(row);
        var modalEl = document.getElementById('eventModal');
        //$scope.selectedEvent1 = [angular.copy(row)];
        //console.log($scope.selectedEvent1);
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

        $scope.selectedEvent1 = [obj];
        $scope.CACEventId = row.CACId;
        $scope.getEventDetails(row.CACId);
        console.log($scope.selectedEvent1, $scope.CACEventId);
        var modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show();
    };

    //$scope.openEventModal = function (row) {
    //    if (row.Frequency !== 'Event') return;

    //    var modalEl = document.getElementById('eventModal');

    //    var collectionobj = {};
    //    collectionobj.Action = 1;
    //    collectionobj.Id = LoginId;
    //    collectionobj.State = $scope.State;
    //    collectionobj.Month = $scope.Month;
    //    collectionobj.Year = $scope.Year;
    //    collectionobj.CACId = row.CACId;
    //    var getData = myService.methode(
    //        'POST',
    //        "../Retail/SearchFinacialStatutoryEvent",
    //        '{obj:' + JSON.stringify(collectionobj) + '}'
    //    );
    //    getData.then(function (response) {
    //        let result = response.data.Result;
    //        if (result && result.length > 0) {
    //            console.log(result);
    //            $scope.selectedEvent1 = result.map(function (x) {
    //                return {
    //                    Act: x.Act,
    //                    ComplianceName: x.ComplianceName,
    //                    Month: x.Month,
    //                    STATE_NM: x.STATE_NM,
    //                    DueDate: x.DueDate,
    //                    CStatus: x.CStatus,
    //                    ActualSubmissionDate: x.ActualSubmissionDate,
    //                    DelayDays: x.DelayDays,
    //                    UploadFile: null,
    //                    CreateOn: x.CreateOn,
    //                    VRemark1: x.VRemark1,
    //                    TempIsVerified: x.IsVerified,
    //                    IsVerified: x.IsVerified,
    //                    openthis: x.openthis
    //                };
    //            });

    //        } else {
    //            $scope.selectedEvent1 = [angular.copy(row)];
    //        }

    //        console.log("Modal Data:", $scope.selectedEvent1);
    //        var modalInstance = bootstrap.Modal.getInstance(modalEl);
    //        if (!modalInstance) {
    //            modalInstance = new bootstrap.Modal(modalEl);
    //        }
    //        modalInstance.show();

    //    }, function (error) {
    //        console.error("Error:", error);
    //        $scope.selectedEvent1 = [angular.copy(row)];

    //        var modalInstance = new bootstrap.Modal(modalEl);
    //        modalInstance.show();
    //    });
    //};


    $scope.addEventRow = function () {
        let lastRow = $scope.selectedEvent1[$scope.selectedEvent1.length - 1];
        let newRow = angular.copy(lastRow);
        newRow.UploadFile = null;
        newRow.ActualSubmissionDate = '';
        newRow.DelayDays = 0;
        newRow.CStatus = '';
        newRow.CreateOn = '';
        newRow.TempIsVerified = '';
        newRow.VRemark = '';
        newRow.openthis = '';
        $scope.selectedEvent1.push(newRow);
    };
    $scope.getEventDetails = function (CACId) {

        var collectionobj = {
            Action: 1,
            Id: LoginId,
            State: $scope.State,
            Month: $scope.Month,
            Year: $scope.Year,
            CACId: CACId
        };
        myService.methode('POST',"../Retail/SearchFinacialStatutoryEvent",{ obj: collectionobj }   // cleaner than string JSON
        ).then(function (response) {

            let result = response.data.Result;

            if (result && result.length > 0) {
                console.log("Show Record",result);
                $scope.selectedEvent1 = result.map(function (x) {
                    return {
                        Act: x.Act,
                        ComplianceName: x.ComplianceName,
                        Month: x.Month,
                        STATE_NM: x.STATE_NM,
                        DueDate: x.DueDate,
                        CStatus: x.CStatus,
                        ActualSubmissionDate: x.ActualSubmissionDate,
                        DelayDays: x.DelayDays,
                        UploadFile: x.UploadFile,
                        CreateOn: x.CreateOn,
                        VRemark1: x.VRemark1,
                        VRemark: x.VRemark,
                        TempIsVerified: x.IsVerified,
                        IsVerified: x.IsVerified,
                        openthis: x.openthis,
                        CSIID: x.CSIID
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
    $scope.closeRemarkModal = function (remark) {
        $scope.selectedRemark1 = '';
        $scope.HeaderRemark1 = "";
        $('#remarkModal1').modal('hide');
    };
}

