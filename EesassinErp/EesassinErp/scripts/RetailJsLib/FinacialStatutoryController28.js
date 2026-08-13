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

        //✅ Check for PDF extension
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
        });
    }

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
        console.log(row);
        row.IsVerified = row.TempIsVerified;
        if (!row.CStatus || !row.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (row.IsVerified == '' && $scope.IsExecuter == 'Client') {
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
            formData.append('UploadFile', $scope.UploadFile);

            if ($scope.UploadFile == undefined || $scope.UploadFile == null || $scope.UploadFile == '') {
                formData.append('UploadFile', '-1');
            } else {
                formData.append('UploadFile', row.UploadFile);
            }
            else {
                formData.append('UploadFile', $scope.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', row.CStatus);
            formData.append('VRemark', row.VRemark1);
            formData.append('CRemark', row.CRemark1);
            formData.append('IsVerified', row.IsVerified);

            formData.append('CACId', row.CACId);
            if ($scope.IsExecuter == 'Client')
            {
               

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

