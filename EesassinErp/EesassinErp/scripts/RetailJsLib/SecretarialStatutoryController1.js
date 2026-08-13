app.SecretarialStatutoryController = function ($scope, $element, $filter, myService, $http, $sce) {


    $scope.BindFilter = function () {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = LoginId; 
        var getData = myService.methode('POST', "../Retail/SearchSecretarialCompliance", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SMasterList = response.data.Result;
            const monthMap = ["Invalid Month", "January", "February", "March", "April","May","June","July","August","September","October","November","December"];
            // $scope.MasterList = response.data.Result.map(item => {
            //    return { 
            //        ...item,  
            //        MonthName: monthMap[item.Month] || "Invalid Month"  
            //    };
            //}); 

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
    $scope.fileSelected = function (files, row)
    {
        const file =  files[0];

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
        validateDocument(file, $scope.CN , function (isValid) {
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
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.Id = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;
        var getData = myService.methode('POST', "../Retail/SearchSecretarialStatutory", '{obj:' + JSON.stringify(collectionobj) + '}');
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
    $scope.openRemarkModal = function (remark,Header) {
        $scope.selectedRemark = $sce.trustAsHtml(remark);
        $scope.HeaderRemark = Header;
        $('#remarkModal').modal('show');
    };
    $scope.closeRemarkModal  = function (remark) {
        $scope.selectedRemark = '';
        $scope.HeaderRemark = "";
        $('#remarkModal').modal('hide');
    };

    $scope.AfterverifyRecord = function (row) {
        if (!row.CStatus || !row.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (row.IsVerified == '' && $scope.IsExecuter == 'Client') {
            showMsgBox("Please enter Verified Status");
            return;
        }
        if (row.CRemark1 == '' && row.IsVerified == 'Clarify' && $scope.IsExecuter == 'Client') {
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
            }
            else {
                formData.append('UploadFile', $scope.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', row.CStatus );
            formData.append('VRemark', row.VRemark1 );
            formData.append('CRemark', row.CRemark1);
            formData.append('IsVerified', row.IsVerified);

            formData.append('CACId', row.CACId);
            if ($scope.IsExecuter == 'Client')
            {
               

                formData.append('Action', '2');
            }
            if ($scope.IsExecuter == 'Executer') {
                formData.append('Action', '1');
            }
            $http.post("../Retail/IUDSecretarialStatutory", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response)
            {
                $scope.UploadFile = '';
            showMsgBox(response.data.Result); 
                $scope.BindSearch();
            }, function (error) {
                console.error('Error', error);
            });
        }
    }

}

