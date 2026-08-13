app.StatutoryController = function ($scope, $element, $filter, myService, $http, $sce) {


    $scope.BindFilter = function () {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = LoginId; 
        var getData = myService.methode('POST', "../Retail/SearchRetailCreateActCalender", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SMasterList = response.data.Result;
            const monthMap = ["Invalid Month", "January", "February", "March", "April","May","June","July","August","September","October","November","December"];
             $scope.MasterList = response.data.Result.map(item => {
                return { 
                    ...item,  
                    MonthName: monthMap[item.Month] || "Invalid Month"  
                };
            }); 

            const distinctYears = [...new Set(response.data.Result.map(item => item.Year))];
            $scope.YearsList = distinctYears;

       
        });
    }

    $scope.getMonthName = function (num) {
        const months = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return months[num] || "";
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
    $scope.fileSelected = function (files, row)
    {
        const file =  files[0];

        if (!file) {
            row.isFileValid = false;
            $scope.hideValidationLoader();
            return;
        }
        else {
            row.isFileValid = true;
        }
        

        //✅ Check for PDF extension
        const isPDF = file.type === 'application/pdf';
        if (!isPDF) {

            swal("Invalid File", "Only PDF files are allowed.", "error");
            row.UploadFile = false;   // 🔥 Important
            row.isFileValid = false;
            $scope.$applyAsync();
            return;
        }

        // ✅ Check for 3 MB file size limit
        const MAX_SIZE_MB = 3;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_SIZE_MB)
        {

            swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
            input.value = ""; // Clear the file
            row.isFileValid = false;
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
            a.href = row.UploadFile;

            // Get file extension from original file
            let extension = row.UploadFile.split('.').pop();

            // Set custom download name using ComplianceName
            a.download = row.ComplianceName + "." + extension;

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
        var getData = myService.methode('POST', "../Retail/SearchStatutory", '{obj:' + JSON.stringify(collectionobj) + '}');
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
           
            $http.post("../Retail/IUDStatutory", formData, {
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
    /* ------------------------------- new labour*/
    $scope.SelectedState = '';
    $scope.SelectedStatus = '';
    $scope.SelectedMonth = '';
    $scope.SelectedYear = '';
    $scope.MonthList = [
        { id: 1, name: 'January' },
        { id: 2, name: 'February' },
        { id: 3, name: 'March' },
        { id: 4, name: 'April' },
        { id: 5, name: 'May' },
        { id: 6, name: 'June' },
        { id: 7, name: 'July' },
        { id: 8, name: 'August' },
        { id: 9, name: 'September' },
        { id: 10, name: 'October' },
        { id: 11, name: 'November' },
        { id: 12, name: 'December' }
    ];


    $scope.reset = function () {
        $scope.SelectedState = '';
        $scope.SelectedStatus = '';
        $scope.SelectedMonth = '';
        $scope.SelectedYear = '';
        $scope.ApplyFilters();
    }
    $scope.getyear = function (year) {
        $scope.SelectedYear = year;
        $scope.refreshDropdowns();
    }
    $scope.getmonth = function (month) {
        $scope.SelectedMonth = month;
        $scope.refreshDropdowns();
    }
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

        $scope.labourcomplianceRows = $scope.AllRows.filter(function (row) {

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
        $scope.updateTilesCount($scope.labourcomplianceRows);
    };

    $scope.BindNewSearch = function () {

        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.Id = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;

        var getData = myService.methode(
            'POST',
            "../Retail/SearchStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            $scope.AllRows = response.data.Result || [];
            $scope.labourcomplianceRows = response.data.Result || [];

            $scope.ActList = [];
            angular.forEach($scope.AllRows, function (row) {
                if (row.Act && $scope.ActList.indexOf(row.Act) === -1) {
                    $scope.ActList.push(row.Act);
                }
            });

            /* ----- DISTINCT DROPDOWNS -----*/
            $scope.statusDisplayMap = {
                'Complied': 'Complied',
                'NonComplied': 'Non-Complied',
                'Delayed': 'Delayed',
                'NonApplicable': 'Non-Applicable',
                'Pending': 'Pending',
                'Verified': 'Verified'
            };
            $scope.StateList = [];
            $scope.YearList = [];
            $scope.StatusList = ['Complied', 'Non-Complied', 'Delayed', 'Non-Applicable', 'Pending', 'Verified'];

            angular.forEach($scope.AllRows, function (row) {

                if (row.STATE_NM && $scope.StateList.indexOf(row.STATE_NM) === -1) {
                    $scope.StateList.push(row.STATE_NM);
                }

                if (row.Year && $scope.YearList.indexOf(row.Year) === -1) {
                    $scope.YearList.push(row.Year);
                }
            });
          //  // ---- COUNT LOGIC START ----
          //  var complied = 0;
          //  var nonComplied = 0;
          //  var delayComplied = 0;
          //  var nonApplicable = 0;
          //  var pending = 0;
          //  var verified = 0;   // ✅ Declare variable
          //  var TotalClarification = 0;
          //  angular.forEach($scope.labourcomplianceRows, function (row) {

          //      var status = (row.CStatus || '')
          //          .toLowerCase()
          //          .replace(/\s+/g, '')     // remove spaces
          //          .replace(/-/g, '')       // remove hyphen
          //          .trim();

          //      var verifyStatus = (row.IsVerified || '').trim();

          //      switch (status) {

          //          case 'complied':
          //              complied++;
          //              break;

          //          case 'noncomplied':
          //              nonComplied++;
          //              break;

          //          case 'delaycomplied':
          //              delayComplied++;
          //              break;

          //          case 'nonapplicable':
          //              nonApplicable++;
          //              break;

          //          default:
          //              pending++;
          //              break;
          //      }

          //      if (verifyStatus.toLowerCase() === 'verified') {
          //          verified++;
          //      }
          //      if (verifyStatus.toLowerCase() === 'clarify') {
          //          TotalClarification++;
          //      }
                
          //  });


          //  // Tile binding variables
          //  $scope.TotalComplied = complied;
          //  $scope.TotalNonComplied = nonComplied + pending;
          //  $scope.TotalDelayComplied = delayComplied;
          //  $scope.TotalNonApplicable = nonApplicable;
          ///*  $scope.TotalPending = pending;*/
          //  $scope.TotalVerified = verified;  // ✅ Fixed
          //  $scope.TotalClarification = TotalClarification;
          //  // ---- COUNT LOGIC END ----
            $scope.updateTilesCount($scope.labourcomplianceRows);
        });
    };
	
	// Toggle button Change - Vansh Chaudhary
    $scope.SelectedAct = 'All';
    $scope.filterByAct = function (act) {

        $scope.SelectedAct = act;

        if (act === 'All') {
            $scope.labourcomplianceRows = angular.copy($scope.AllRows);
        } else {
            $scope.labourcomplianceRows = $scope.AllRows.filter(function (row) {
                return row.Act === act;
            });
        }

        // ✅ Call AFTER filtering
        $scope.updateTilesCount($scope.labourcomplianceRows);
    };
	
    /* $scope.filterByAct = function (act) {

        $scope.SelectedAct = act;

        if (act === 'All') {
            $scope.labourcomplianceRows = angular.copy($scope.AllRows);
        } else {
            $scope.labourcomplianceRows = $scope.AllRows.filter(function (row) {
                return row.Act === act;
            });
        }

        // ✅ Call AFTER filtering
        $scope.updateTilesCount($scope.labourcomplianceRows);
    }; */

    $scope.refreshDropdowns = function () {

        var filtered = $scope.AllRows;

        // Filter by State
        if ($scope.SelectedState) {
            filtered = filtered.filter(function (row) {
                return row.STATE_NM === $scope.SelectedState;
            });
        }

        // Filter by Status
        if ($scope.SelectedStatus) {
            filtered = filtered.filter(function (row) {
                return row.CStatus === $scope.SelectedStatus;
            });
        }

        // Filter by Month
        if ($scope.SelectedMonth) {
            filtered = filtered.filter(function (row) {
                return row.Month == $scope.SelectedMonth;
            });
        }

        // Filter by Year
        if ($scope.SelectedYear) {
            filtered = filtered.filter(function (row) {
                return row.Year == $scope.SelectedYear;
            });
        }

        // 🔥 Rebuild dropdown lists based on filtered data

        $scope.StatusList = [
            ...new Set(
                filtered.map(x => $scope.statusDisplayMap[x.CStatus] || x.CStatus)
            )
        ];
        $scope.MonthList = [...new Set(filtered.map(x => x.Month))]
            .map(m => ({ id: m, name: $scope.getMonthName(m) }));

        $scope.YearList = [...new Set(filtered.map(x => x.Year))];

        $scope.labourcomplianceRows = filtered;

        $scope.updateTilesCount(filtered);
    };

    $scope.selectedEvent = {};
    $scope.selectedEvent1 = {};
    $scope.closeEventModal = function () {

        var modalEl = document.getElementById('eventModal');
        var modalInstance = bootstrap.Modal.getInstance(modalEl);

        if (modalInstance) {
            modalInstance.hide();
        }

        // Extra safety (agar backdrop reh jaye to)
        angular.element('.modal-backdrop').remove();
        angular.element('body').removeClass('modal-open');
        angular.element('body').css('padding-right', '');
    };

    $scope.openEventModal = function (row) {
        if (row.Frequency !== 'Event') {
            return;  
        } 
        $('#eventModal').modal('show');
        $scope.selectedEvent1 = angular.copy(row);
        $scope.CACEventId = row.CACId;
        var modalEl = document.getElementById('eventModal');

        // Agar pehle se instance ho to reuse karo
        var modalInstance = bootstrap.Modal.getInstance(modalEl);

        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalEl);
        }

        modalInstance.show();
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

    $scope.NewfileSelected = function (files, row) {

        if (!files || files.length === 0)  return;

        const file = files[0];

        // PDF check
        if (file.type !== 'application/pdf') {
            swal("Invalid File", "Only PDF files are allowed.", "error");
            row.UploadFile = null
            row.isFileValid = false;
            $scope.$applyAsync();
            return;
        }
       

        // Size check (3MB)
        const MAX_SIZE_MB = 3;
        const fileSizeMB = file.size / (1024 * 1024);

        if (fileSizeMB > MAX_SIZE_MB) {
            swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
            row.UploadFile = null;
            row.isFileValid = false;
            $scope.$applyAsync();
            return;
        }

        // ✅ Store file in row (NOT in $scope)
        row.UploadFile = file;
    };

    $scope.NewverifyRecord = function (row) {
        if (!row.CStatus || !row.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (row.IsVerified == '') {
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

            if (!row.UploadFile) {
                formData.append('UploadFile', '-1');
            } else {
                formData.append('UploadFile', row.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', row.CStatus);
            formData.append('VRemark', row.VRemark1);
            formData.append('CRemark', row.CRemark);
            formData.append('IsVerified', row.IsVerified);

            formData.append('CACId', row.CACId);
            formData.append('CSIID', row.CSIID);
             
            formData.append('Action', '6');
            $http.post("../Retail/IUDStatutory", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                $scope.UploadFile = '';
                showMsgBox(response.data.Result);
                $scope.BindNewSearch();
            }, function (error) {
                console.error('Error', error);
            });
        }
    }
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
        $scope.TotalNonComplied = nonComplied;
        $scope.Totalpending = pending;
        $scope.TotalDelayComplied = delayComplied;
        $scope.TotalNonApplicable = nonApplicable;
        $scope.TotalVerified = verified;
        $scope.TotalClarification = TotalClarification;
    };
    $scope.$watch('Search', function () {

        if (!$scope.labourcomplianceRows) return;

        var filteredData = $scope.labourcomplianceRows.filter(function (row) {
            return $scope.globalSearch(row);
        });

        $scope.updateTilesCount(filteredData);

    });
    $scope.globalSearch = function (row) {

        if (!$scope.Search) return true;

        var searchText = $scope.Search.toString().toLowerCase();

        // Convert month number to month name
        var monthName = $scope.getMonthName(row.Month) ?
            $scope.getMonthName(row.Month).toLowerCase() : '';

        return (

            (row.SNo && row.SNo.toString().toLowerCase().includes(searchText)) ||
            (row.Act && row.Act.toLowerCase().includes(searchText)) ||
            (row.ComplianceName && row.ComplianceName.toLowerCase().includes(searchText)) ||
            (row.RegistrationNumber && row.RegistrationNumber.toLowerCase().includes(searchText)) ||
            (row.Risk && row.Risk.toLowerCase().includes(searchText)) ||
            (row.Frequency && row.Frequency.toLowerCase().includes(searchText)) ||
            (monthName && monthName.includes(searchText)) ||
            (row.STATE_NM && row.STATE_NM.toLowerCase().includes(searchText)) ||
            (row.DueDate && row.DueDate.toString().toLowerCase().includes(searchText)) ||
            (row.CStatus && row.CStatus.toLowerCase().includes(searchText)) ||
            (row.DelayDays && row.DelayDays.toString().includes(searchText)) ||
            (row.CreateOn && row.CreateOn.toString().toLowerCase().includes(searchText)) ||
            (row.IsVerified && row.IsVerified.toLowerCase().includes(searchText)) ||
            (row.VRemark && row.VRemark.toLowerCase().includes(searchText))

        );
    };
    $scope.openComplianceModal = function () {

        var modal = new bootstrap.Modal(
            document.getElementById('complianceDetailsModal')
        );

        modal.show();
    };
    
    $scope.BindCompliance = function (Id) {

        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.Id = Id;

        var getData = myService.methode(
            'POST',
            "../Retail/CategoryStatutory",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {

            var result = (response.data && response.data.Result && response.data.Result.length > 0)
                ? response.data.Result[0]
                : null;

            if (result) {
                $scope.Cname = result.ComplianceName || 'N/A';
                $scope.Rule = result.Rule || 'N/A';
                $scope.Section = result.Section || 'N/A';
                $scope.FormNo = result.FormNo || 'N/A';
                $scope.Risk = result.Risk || 'N/A';
                $scope.Attachment = result.UploadFile || 'No file uploaded.';
                $scope.Description = result.Description || 'N/A';

            } else {

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

    $scope.AddEventNewverifyRecord = function (selectedEvent) {
        if (!selectedEvent.CStatus || !selectedEvent.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (selectedEvent.IsVerified == '') {
            showMsgBox("Please enter Verified Status");
            return;
        }
        if (selectedEvent.VRemark1 == '' && selectedEvent.IsVerified == 'Clarify') {
            showMsgBox("Please enter Remark in condition of Clarify.");
            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            formData.append('ASD', $filter('date')(selectedEvent.ActualSubmissionDate, 'yyyy/MM/dd'));
            formData.append('CSD', $filter('date')(selectedEvent.CSD, 'yyyy/MM/dd'));
            formData.append('RegNo', selectedEvent.RegistrationNumber);
            formData.append('DelayDay', selectedEvent.DelayDay);
            formData.append('UploadFile', selectedEvent.UploadFile);

            if (!selectedEvent.UploadFile) {
                formData.append('UploadFile', '-1');
            } else {
                formData.append('UploadFile', selectedEvent.UploadFile);
            }
            formData.append('Createdby', LoginId);

            formData.append('Status', selectedEvent.CStatus);
            formData.append('VRemark', selectedEvent.VRemark1);
            formData.append('CRemark', selectedEvent.CRemark);
            formData.append('IsVerified', selectedEvent.IsVerified);

            formData.append('CACId', $scope.CACEventId);
            formData.append('Action', '8');
            $http.post("../Retail/IUDStatutory", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                $scope.UploadFile = '';
                $scope.selectedEvent = {};
                $scope.selectedEvent1 = {};
                $scope.CACEventId = '';
                $scope.closeEventModal()
                showMsgBox(response.data.Result);
                $scope.BindNewSearch();
            }, function (error) {
                console.error('Error', error);
            });
        }
    }

    $scope.NewExportTableToCSV = function () {

        if (!$scope.labourcomplianceRows || !$scope.labourcomplianceRows.length) {
            alert("No data available!");
            return;
        }

        // 🔥 Apply same filters as ng-repeat
        var filteredData = $scope.labourcomplianceRows.filter(function (row) {

            // Calendartype filter
            if (row.Calendartype !== 'Statutory') return false;

            // Global search filter
            if ($scope.Search && !$scope.globalSearch(row)) return false;

            return true;
        });

        if (!filteredData.length) {
            alert("No filtered data available!");
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


        // Header row (manual define karo agar chaho)
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
        
        filteredData.forEach(function (row, index) {

            var monthName = $scope.getMonthName(row.Month) || '';

            var rowData = [
                index + 1,
                row.Act || '',
                row.ComplianceName || '',
                row.RegistrationNumber || '',
                row.Risk||'',
                row.Frequency || '',
                monthName,
                row.STATE_NM || '',
                 row.DueDate  || '',
                row.CStatus || '',
                formatDate(row.ActualSubmissionDate) || '',
                row.DelayDays || '', 
                (row.IsVerified == 0 ? '' : row.IsVerified == 'Clarify' ? 'Under Clarification' : (row.IsVerified || ''))
            ];

            csv.push(rowData.map(val => `"${val}"`).join(","));
        });

        var csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(csvFile);
        link.download = "LabourCompliance.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    $scope.NEwPrintTable = function () {

        if (!$scope.labourcomplianceRows || !$scope.labourcomplianceRows.length) {
            alert("No data available!");
            return;
        }

        // 🔥 Apply same filters as ng-repeat
        var filteredData = $scope.labourcomplianceRows.filter(function (row) {

            if (row.Calendartype !== 'Statutory') return false;

            if ($scope.Search && !$scope.globalSearch(row)) return false;

            return true;
        });

        if (!filteredData.length) {
            alert("No filtered data available!");
            return;
        }

        var companyName = MapUser || '';
        var today = new Date();

        var day = String(today.getDate()).padStart(2, '0');
        var month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-based
        var year = today.getFullYear();

        var generatedOn = day + "-" + month + "-" + year;

        // Date formatter
        function formatDate(dateValue) {
            if (!dateValue) return '';
            var d = new Date(dateValue);
            if (isNaN(d.getTime())) return '';
            var day = ('0' + d.getDate()).slice(-2);
            var month = ('0' + (d.getMonth() + 1)).slice(-2);
            var year = d.getFullYear();
            return day + '-' + month + '-' + year;
        }

        // 🔥 Build table manually
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

            var monthName = $scope.getMonthName(row.Month) || '';

            tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${row.Act || ''}</td>
                <td>${row.ComplianceName || ''}</td>
                <td>${row.RegistrationNumber || ''}</td>
                <td>${row.Risk || ''}</td>
                <td>${row.Frequency || ''}</td>
                <td>${monthName}</td>
                <td>${row.STATE_NM || ''}</td>
                <td>${row.DueDate}</td>
                <td>${row.CStatus || ''}</td>
                <td>${formatDate(row.ActualSubmissionDate)}</td>
                <td>${row.DelayDays || ''}</td> 
                <td>${(row.IsVerified == 0 ? ''  : row.IsVerified == 'Clarify' ? 'Under Clarification'  : (row.IsVerified || ''))}</td>
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
                <h2>Labour Compliance</h2>
                <div class="company-name">${companyName}</div>
            </div>

            ${tableHTML}

        </body>
        </html>
    `);

        printWindow.document.close();

        printWindow.onload = function () {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    };

    $scope.DownloadAttachment = function (fileName) {

        if (!fileName) {
            alert("No attachment available");
            return;
        }

        // Get file extension
        var extension = '';
        if (fileName.indexOf('.') !== -1) {
            extension = fileName.substring(fileName.lastIndexOf('.'));
        }

        // Clean Cname (spaces remove ya replace)
        var cleanName = ($scope.Cname || 'File').replace(/\s+/g, '_');

        // New download name
        var newFileName = 'Attachment_' + cleanName + extension;

        var link = document.createElement('a');
        link.href = fileName;   // Agar full path already hai
        link.download = newFileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


}


