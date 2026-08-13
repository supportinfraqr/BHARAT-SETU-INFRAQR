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

            // =====================================================
            // ✅ FINAL FILE PROCESS
            // =====================================================

            function processFile() {

                row.UploadFile = file;
                row.isFileValid = true;

                $scope.UploadFile = file;

                $scope.$applyAsync();
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
            showMsgBox("Please Select Both Status and Actual Submission Date.");
            return;
        }
        if (row.IsVerified == '') {
            showMsgBox("Please Enter Verified Status");
            return;
        }
        if (row.CRemark1 == '' && row.IsVerified == 'Clarify') {
            showMsgBox("Please Enter Remark in Condition of Remark.");
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
            //if ($scope.IsExecuter == 'Client')
            //{ 
                formData.append('Action', '1');
            //}
            //if ($scope.IsExecuter == 'Executer') {
            //    formData.append('Action', '1');
            //}
           
            $http.post("../Retail/IUDStatutory", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response)
            {
                $scope.UploadFile = '';
            showMsgBox(response.data.Result); 
                $scope.BindNewSearch();
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
        $scope.Search = '';
        $scope.SelectedAct = 'Act';
        $scope.BindNewSearch();
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
    $scope.getAct = function (act) {
        $scope.SelectedAct = act;
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
        
        $scope.Showing = "All";
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
            $scope.Pagesize = $scope.labourcomplianceRows.length;
            $scope.Flags();
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
	
    $scope.refreshDropdowns = function () {

        var allData = angular.copy($scope.AllRows || []);
        var filtered = angular.copy(allData);

        // =====================================================
        // ✅ COMMON STATUS FUNCTION
        // =====================================================

        function getDisplayStatus(row) {

            var status = (row.CStatus || '').toString().trim();
            var isVerified = (row.IsVerified || '').toString().trim();

            var displayStatus = '';

            if (!status) {
                displayStatus = 'Pending';
            }
            else if (isVerified === "Verified" && selected === "Verified") {
                displayStatus = 'Verified';
            }


            else if (isVerified === "Clarify" && selected === "Remarks") {
                displayStatus = 'Remarks';
            }

            else {
                displayStatus = ($scope.statusDisplayMap && $scope.statusDisplayMap[status])
                    ? $scope.statusDisplayMap[status]
                    : status;
            }

            return displayStatus;
        }

        // =====================================================
        // ✅ MAIN FILTERS
        // =====================================================

        // ✅ Status Filter
        if ($scope.SelectedStatus) {

            var selected = ($scope.SelectedStatus || '').toString().trim();

            filtered = filtered.filter(function (row) {

                var displayStatus = getDisplayStatus(row);

                return displayStatus === selected;
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
            filtered = filtered.filter(row =>
                row.Month != null &&
                row.Month.toString().trim() === $scope.SelectedMonth.toString().trim()
            );
        }

        // ✅ Year Filter
        if ($scope.SelectedYear) {
            filtered = filtered.filter(row =>
                row.Year != null &&
                row.Year.toString().trim() === $scope.SelectedYear.toString().trim()
            );
        }

        // =====================================================
        // ✅ FINAL GRID DATA
        // =====================================================

        $scope.DisplayRows = filtered;
        $scope.labourcomplianceRows = filtered;

        // =====================================================
        // ✅ MONTH LIST (without month filter)
        // =====================================================

        var monthData = angular.copy(allData);

        if ($scope.SelectedStatus) {

            monthData = monthData.filter(function (row) {

                var displayStatus = getDisplayStatus(row);

                return displayStatus === $scope.SelectedStatus;
            });
        }

        if ($scope.SelectedAct && $scope.SelectedAct !== 'Act') {
            monthData = monthData.filter(row => row.Act === $scope.SelectedAct);
        }

        if ($scope.SelectedState) {
            monthData = monthData.filter(row => row.STATE_NM === $scope.SelectedState);
        }

        if ($scope.SelectedYear) {
            monthData = monthData.filter(row =>
                row.Year != null &&
                row.Year.toString().trim() === $scope.SelectedYear.toString().trim()
            );
        }

        // =====================================================
        // ✅ YEAR LIST (without year filter)
        // =====================================================

        var yearData = angular.copy(allData);

        if ($scope.SelectedStatus) {

            yearData = yearData.filter(function (row) {

                var displayStatus = getDisplayStatus(row);

                return displayStatus === $scope.SelectedStatus;
            });
        }

        if ($scope.SelectedAct && $scope.SelectedAct !== 'Act') {
            yearData = yearData.filter(row => row.Act === $scope.SelectedAct);
        }

        if ($scope.SelectedState) {
            yearData = yearData.filter(row => row.STATE_NM === $scope.SelectedState);
        }

        if ($scope.SelectedMonth) {
            yearData = yearData.filter(row =>
                row.Month != null &&
                row.Month.toString().trim() === $scope.SelectedMonth.toString().trim()
            );
        }

        // =====================================================
        // ✅ STATUS LIST (without status filter)
        // =====================================================

        var statusData = angular.copy(allData);

        // Act
        if ($scope.SelectedAct && $scope.SelectedAct !== 'Act') {
            statusData = statusData.filter(row => row.Act === $scope.SelectedAct);
        }

        // State
        if ($scope.SelectedState) {
            statusData = statusData.filter(row => row.STATE_NM === $scope.SelectedState);
        }

        // Month
        if ($scope.SelectedMonth) {
            statusData = statusData.filter(row =>
                row.Month != null &&
                row.Month.toString().trim() === $scope.SelectedMonth.toString().trim()
            );
        }

        // Year
        if ($scope.SelectedYear) {
            statusData = statusData.filter(row =>
                row.Year != null &&
                row.Year.toString().trim() === $scope.SelectedYear.toString().trim()
            );
        }

        // =====================================================
        // ✅ FINAL DROPDOWNS
        // =====================================================

        $scope.MonthList = [...new Set(monthData.map(x => x.Month).filter(x => x))]
            .sort((a, b) =>
                new Date(Date.parse(a + " 1")).getMonth() -
                new Date(Date.parse(b + " 1")).getMonth()
            );

        $scope.MonthList = $scope.MonthList.slice(3).concat($scope.MonthList.slice(0, 3));

        $scope.YearList = [...new Set(yearData.map(x => x.Year))];

        $scope.StateList = [...new Set(filtered.map(x => x.STATE_NM))];

        $scope.StatusList = [
            ...new Set(
                statusData.map(function (row) {

                    return getDisplayStatus(row);

                })
            )
        ].sort();
        $scope.Pagesize = $scope.labourcomplianceRows.length;
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
    $scope.closeModal = function () {

        var modalEl = document.getElementById('complianceDetailsModal');
        var modalInstance = bootstrap.Modal.getInstance(modalEl);

        if (modalInstance) {
            modalInstance.hide();
        }

        // Extra safety (agar backdrop reh jaye to)
        angular.element('.modal-backdrop').remove();
        angular.element('body').removeClass('modal-open');
        angular.element('body').css('padding-right', '');
    };

    //$scope.openEventModal = function (row) {
    //    if (row.Frequency !== 'Event') {
    //        return;  
    //    } 
    //    $('#eventModal').modal('show');
    //    $scope.selectedEvent1 = angular.copy(row);
    //    $scope.CACEventId = row.CACId;
    //    var modalEl = document.getElementById('eventModal');

    //    // Agar pehle se instance ho to reuse karo
    //    var modalInstance = bootstrap.Modal.getInstance(modalEl);

    //    if (!modalInstance) {
    //        modalInstance = new bootstrap.Modal(modalEl);
    //    }

    //    modalInstance.show();
    //};

  
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
            showMsgBox("Please Select Both Status and Actual Submission Date.");
            return;
        }
        if (row.IsVerified=='0') {
            showMsgBox("Please Select Verified Status");
            return;
        }
        if (row.VRemark1 == '' && row.IsVerified == 'Clarify') {
            showMsgBox("Please Enter Remark in Condition of Remarks.");
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

        if (!$scope.AllRows) return;

        var filteredData = $scope.AllRows.filter(function (row) {
            return $scope.globalSearch(row);
        });

        $scope.labourcomplianceRows = filteredData;
        $scope.Pagesize = $scope.labourcomplianceRows.length;
        $scope.updateTilesCount(filteredData);
    });
    $scope.globalSearch = function (row) {

        if (!$scope.Search) return true;

        var searchText = ($scope.Search || '').toString().toLowerCase().trim();

        return !! (

            (row.SNo && row.SNo.toString().toLowerCase().includes(searchText)) ||
            (row.Act && row.Act.toLowerCase().includes(searchText)) ||
            (row.ComplianceName && row.ComplianceName.toLowerCase().includes(searchText)) ||
            (row.RegistrationNumber && row.RegistrationNumber.toLowerCase().includes(searchText)) ||
            (row.Risk && row.Risk.toLowerCase().includes(searchText)) ||
            (row.Frequency && row.Frequency.toLowerCase().includes(searchText)) ||
            (row.Month && row.Month.toLowerCase().includes(searchText)) ||
            (
                row.ActualSubmissionDate &&
                $scope.formatDate(row.ActualSubmissionDate)
                    .toLowerCase()
                    .includes(searchText)
            ) ||
            (row.STATE_NM && row.STATE_NM.toLowerCase().includes(searchText)) ||
            (row.DueDate && row.DueDate.toString().toLowerCase().includes(searchText)) ||
            (row.CStatus && row.CStatus.toLowerCase().includes(searchText)) ||
            (row.DelayDays && row.DelayDays.toString().includes(searchText)) ||
            (row.CreateOn && row.CreateOn.toString().toLowerCase().includes(searchText)) ||
            (
                (
                    row.IsVerified === 'Clarify'
                        ? 'Remarks'
                        : (row.IsVerified || '')
                )
                    .toLowerCase()
                    .includes(searchText)
            )
            //||
            //(row.VRemark && row.VRemark.toLowerCase().includes(searchText))

        );
    };

    $scope.formatDate = function (date) {

        if (!date) return '';

        var d = new Date(date);

        var day = ('0' + d.getDate()).slice(-2);
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var year = d.getFullYear();

        return day + '-' + month + '-' + year;
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
                $scope.Rule = result.Rules || 'N/A';
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

    //$scope.AddEventNewverifyRecord = function (selectedEvent) {
    //    if (!selectedEvent.CStatus || !selectedEvent.ActualSubmissionDate) {
    //        showMsgBox("Please enter both Status  and Actual Submission Date.");
    //        return;
    //    }
    //    if (selectedEvent.IsVerified == '') {
    //        showMsgBox("Please enter Verified Status");
    //        return;
    //    }
    //    if (selectedEvent.VRemark1 == '' && selectedEvent.IsVerified == 'Clarify') {
    //        showMsgBox("Please enter Remark in condition of Clarify.");
    //        return;
    //    }
    //    if (isValidate()) {
    //        var formData = new FormData();
    //        formData.append('ASD', $filter('date')(selectedEvent.ActualSubmissionDate, 'yyyy/MM/dd'));
    //        formData.append('CSD', $filter('date')(selectedEvent.CSD, 'yyyy/MM/dd'));
    //        formData.append('RegNo', selectedEvent.RegistrationNumber);
    //        formData.append('DelayDay', selectedEvent.DelayDay);
    //        formData.append('UploadFile', selectedEvent.UploadFile);

    //        if (!selectedEvent.UploadFile) {
    //            formData.append('UploadFile', '-1');
    //        } else {
    //            formData.append('UploadFile', selectedEvent.UploadFile);
    //        }
    //        formData.append('Createdby', LoginId);

    //        formData.append('Status', selectedEvent.CStatus);
    //        formData.append('VRemark', selectedEvent.VRemark1);
    //        formData.append('CRemark', selectedEvent.CRemark);
    //        formData.append('IsVerified', selectedEvent.IsVerified);

    //        formData.append('CACId', $scope.CACEventId);
    //        formData.append('Action', '8');
    //        $http.post("../Retail/IUDStatutory", formData, {
    //            transformRequest: angular.identity,
    //            headers: { 'Content-Type': undefined }
    //        }).then(function (response) {
    //            $scope.UploadFile = '';
    //            $scope.selectedEvent = {};
    //            $scope.selectedEvent1 = {};
    //            $scope.CACEventId = '';
    //            $scope.closeEventModal()
    //            showMsgBox(response.data.Result);
    //            $scope.BindNewSearch();
    //        }, function (error) {
    //            console.error('Error', error);
    //        });
    //    }
    //}
    $scope.NewExportTableToCSV = function () {

        // =========================
        // CHECK DATA
        // =========================
        if (!$scope.labourcomplianceRows || $scope.labourcomplianceRows.length === 0) {
            alert("No data available!");
            return;
        }

        // =========================
        // FORMAT DATE FUNCTION
        // =========================
        $scope.formatDate = function (date) {

            if (!date || date === '1900-01-01')
                return '';

            var d = new Date(date);

            if (isNaN(d))
                return '';

            return ('0' + d.getDate()).slice(-2) + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                d.getFullYear();
        };

        // =========================
        // APPLY FILTERS
        // =========================
        var filteredData = $scope.labourcomplianceRows.filter(function (row) {

            // Global Search Filter
            if ($scope.Search && !$scope.globalSearch(row))
                return false;

            return true;
        });

        // =========================
        // CHECK FILTERED DATA
        // =========================
        if (!filteredData || filteredData.length === 0) {
            alert("No filtered data available!");
            return;
        }

        // =========================
        // CSV ARRAY
        // =========================
        var csv = [];

        // =========================
        // CSV HEADER
        // =========================
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

        // =========================
        // LOOP DATA
        // =========================
        filteredData.forEach(function (row, index) {

            // Status Text
            var statusText = 'Pending';

            if (row.CStatus === "NonComplied") {
                statusText = 'Non-Complied';
            }
            else if (row.CStatus === "NonApplicable") {
                statusText = 'Non-Applicable';
            }
            else if (row.CStatus === "Complied") {
                statusText = 'Complied';
            }
            else if (row.CStatus === "Delaycomplied") {
                statusText = 'Delay-Complied';
            }

            // Verification Status
            var verificationStatus = '';

            if (row.IsVerified === "Clarify") {
                verificationStatus = 'Remarks';
            }
            else if (row.IsVerified === "Verified") {
                verificationStatus = 'Verified';
            }

            // Row Data
            var rowData = [

                index + 1,

                '"' + (row.Act || '') + '"',

                '"' + (row.ComplianceName || '') + '"',

                '"' + (row.Risk || '') + '"',

                '"' + (row.Frequency || '') + '"',

                '"' + (row.Month || '') + '"',

                '"' + (row.STATE_NM || '') + '"',

                '"' + (row.DueDate || '') + '"',

                '"' + statusText + '"',

                '"' + $scope.formatDate(row.ActualSubmissionDate) + '"',

                '"' + (row.DelayDays || '0') + '"',

                '"' + (row.UploadFile ? 'Uploaded' : 'Not Uploaded') + '"',

                '"' + (row.CreateOn || '') + '"',

                '"' + verificationStatus + '"'
            ];

            csv.push(rowData.join(","));
        });

        // =========================
        // CREATE CSV FILE
        // =========================
        var csvFile = new Blob(
            [csv.join('\n')],
            { type: 'text/csv;charset=utf-8;' }
        );

        // =========================
        // DOWNLOAD CSV
        // =========================
        var downloadLink = document.createElement("a");

        var url = URL.createObjectURL(csvFile);

        downloadLink.href = url;

        downloadLink.download = "LabourCompliance.csv";

        document.body.appendChild(downloadLink);

        downloadLink.click();

        document.body.removeChild(downloadLink);
    };

    $scope.NEwPrintTable = function () {
        if (!$scope.labourcomplianceRows || $scope.labourcomplianceRows.length === 0) {
            alert("No data available!");
            return;
        }
        $scope.formatDate = function (date) {

            if (!date || date === '1900-01-01')
                return '';

            var d = new Date(date);

            if (isNaN(d))
                return '';

            return ('0' + d.getDate()).slice(-2) + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                d.getFullYear();
        };
        var filteredData = $scope.labourcomplianceRows.filter(function (row) {
            if ($scope.Search && !$scope.globalSearch(row))
                return false;

            return true;
        });
        if (!filteredData || filteredData.length === 0) {
            alert("No filtered data available!");
            return;
        }
        var companyName = MapUser || '';

        var today = new Date();

        var generatedOn =
            ('0' + today.getDate()).slice(-2) + "-" +
            ('0' + (today.getMonth() + 1)).slice(-2) + "-" +
            today.getFullYear();
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
        filteredData.forEach(function (row, index) {

            var statusText = 'Pending';

            if (row.CStatus === "NonComplied") {
                statusText = 'Non-Complied';
            }
            else if (row.CStatus === "NonApplicable") {
                statusText = 'Non-Applicable';
            }
            else if (row.CStatus === "Complied") {
                statusText = 'Complied';
            }
            else if (row.CStatus === "Delaycomplied") {
                statusText = 'Delay-Complied';
            }

            var verificationStatus = '';

            if (row.IsVerified === "Clarify") {
                verificationStatus = 'Remarks';
            }
            else if (row.IsVerified === "Verified") {
                verificationStatus = 'Verified';
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
                <td>${row.DueDate || ''}</td>
                <td>${statusText}</td>
                <td>${$scope.formatDate(row.ActualSubmissionDate)}</td>
                <td>${row.DelayDays || '0'}</td>
                <td>${row.UploadFile ? 'Uploaded' : 'Not Uploaded'}</td>
                <td>${row.CreateOn || ''}</td>
                <td>${verificationStatus}</td>
            </tr>
        `;
        });

        tableHTML += `
            </tbody>
        </table>`;
        var printWindow = window.open('', '', 'width=1200,height=700');

        printWindow.document.write(`
        <html>
        <head>
            <title>Labour Compliance Print</title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
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
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    font-size: 12px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    border: 1px solid #000;
                    padding: 6px;
                    font-size: 12px;
                    text-align: left;
                }

                th {
                    background: #F37437;
                    color: #000;
                }

            </style>
        </head>

        <body>

            <div class="generated">
                Generated On : ${generatedOn}
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

        // =========================
        // PRINT
        // =========================
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

    //$scope.openEventModal = function (row) {
    //    if (row.Frequency !== 'Event') {
    //        return;
    //    }
    //    var modalEl = document.getElementById('eventModal');
    //    var obj = angular.copy(row);

    //    obj.ActualSubmissionDate = "";
    //    obj.UploadFile = null;
    //    obj.CStatus = "";
    //    obj.DelayDays = "";
    //    obj.IsVerified = "";
    //    obj.openthis = "0";
    //    obj.CreateOn = "";
    //    obj.VRemark = "";
    //    obj.VRemark1 = "";
    //    obj.CSIID = "";
    //    $scope.selectedEvent1 = [obj];
    //    $scope.CACEventId = row.CACId;
    //    $scope.getEventDetails(row.CACId);
    //    var modalInstance = bootstrap.Modal.getInstance(modalEl);
    //    if (!modalInstance) {
    //        modalInstance = new bootstrap.Modal(modalEl);
    //    }
    //    modalInstance.show();
    //};
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
        obj.IsVerified = "";
        obj.openthis = "0";
        obj.CreateOn = "";
        obj.VRemark = "";
        obj.VRemark1 = "";
        obj.CSIID = "";

        // ✅ UNFREEZE / ENABLE ALL FIELDS
        obj.Flag = 0;
        obj.isDisabled = false;
        obj.IsFreeze = false;
        obj.IsLocked = false;

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

        let baseRow = $scope.selectedEvent1[0];

        $scope.selectedEvent1.push({
            ComplianceName: baseRow.ComplianceName,
            Act: baseRow.Act,
            Risk: baseRow.Risk,
            Frequency: baseRow.Frequency,
            Month: baseRow.Month,
            STATE_NM: baseRow.STATE_NM,
            DueDate: baseRow.DueDate,

            CStatus: '',
            ActualSubmissionDate: '',
            DelayDays: 0,
            UploadFile: null,
            Upload: '',
            IsVerified: '',
            VRemark: '',
            VRemark1: '',
            CSIID: '',
            isDisabled: false
        });
    };
    $scope.AddEventNewverifyRecord = function (event) {
        if (!event.CStatus || !event.ActualSubmissionDate) {
            showMsgBox("Please Select both Status  and Actual Submission Date.");
            return;
        }
        if (!event.IsVerified) {
            showMsgBox("Please Select Verification Status");
            return;
        }
        if (event.VRemark1 == '' && event.IsVerified == 'Remarks') {
            showMsgBox("Please Enter Remark in Condition of Remarks.");
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
            $http.post("../Retail/AddLabourEventcompliance", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
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
        myService.methode('POST', "../Retail/SearchLabourEvent", { obj: collectionobj }   // cleaner than string JSON
        ).then(function (response) {
            let result = response.data.Result;
            console.log(result);
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
                        openthis: x.OpenThis,
                        CSIID: x.CSIID,
                        Flag: x.Flag
                    };
                });
                console.log($scope.selectedEvent1);
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

    $scope.ViewAlldata = function () {
      
        if ($scope.Showing === "All") {
            $scope.Showing = "10";
            $scope.showLoader();
            var collectionobj = {
                Action: 13,
                Id: LoginId,
                State: $scope.State,
                Month: $scope.Month,
                Year: $scope.Year
            };
            myService.methode(
                'POST',
                "../Retail/SearchStatutory",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            ).then(function (response) {
                $scope.AllRows = response.data.Result || [];
                $scope.labourcomplianceRows = response.data.Result || [];
                $scope.ActList = [...new Set(
                    $scope.labourcomplianceRows
                        .map(x => x.Act)
                        .filter(x => x)
                )].sort((a, b) => a.localeCompare(b));

                $scope.StateList = [...new Set(
                    $scope.labourcomplianceRows
                        .map(x => x.STATE_NM)
                        .filter(x => x)
                )].sort((a, b) => a.localeCompare(b));

                $scope.YearList = [...new Set(
                    $scope.labourcomplianceRows
                        .map(x => x.Year)
                        .filter(x => x)
                )].sort((a, b) => a - b);

                $scope.MonthList = [
                    ...new Set(
                        $scope.labourcomplianceRows
                            .map(x => x.Month)
                            .filter(x => x)
                    )
                ].sort((a, b) =>
                    new Date(Date.parse(a + " 1")).getMonth() -
                    new Date(Date.parse(b + " 1")).getMonth()
                );

                // April → March
                $scope.MonthList = $scope.MonthList.slice(3).concat($scope.MonthList.slice(0, 3));

                $scope.All = $scope.labourcomplianceRows.length;
                $scope.Pagesize = $scope.labourcomplianceRows.length;
                $scope.updateTilesCount($scope.labourcomplianceRows);
                $scope.statusDisplayMap = {
                    'Complied': 'Complied',
                    'NonComplied': 'Non-Complied',
                    'Delaycomplied': 'Delay-Complied',
                    'NonApplicable': 'Non-Applicable',
                    'Pending': 'Pending',
                    'Verified': 'Verified',
                    'Remarks': 'Remarks'
                };

                $scope.StatusList = ['Complied', 'Delay-Complied', 'Non-Applicable', 'Non-Complied', 'Pending', 'Remarks', 'Verified'];
                $scope.SelectedState = '';
                $scope.SelectedStatus = '';
                $scope.SelectedMonth = '';
                $scope.SelectedYear = '';
                $scope.Search = '';
                $scope.SelectedAct = 'Act';
                $scope.hideLoader();
            }).catch(function (error) {
                console.error("Error fetching data:", error);
                $scope.labourcomplianceRows = [];
            });
        }
        else {
            $scope.BindNewSearch();
            $scope.SelectedState = '';
            $scope.SelectedStatus = '';
            $scope.SelectedMonth = '';
            $scope.SelectedYear = '';
            $scope.Search = '';
            $scope.SelectedAct = 'Act';
        }

    };

    $scope.Flags = function () {
        $scope.Showing = "All";
        var collectionobj = {};
        collectionobj.Action = 13;
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
            $scope.ActList = [...new Set(
                $scope.AllRows
                    .map(x => x.Act)
                    .filter(x => x)
            )].sort((a, b) => a.localeCompare(b));

            $scope.StateList = [...new Set(
                $scope.AllRows
                    .map(x => x.STATE_NM)
                    .filter(x => x)
            )].sort((a, b) => a.localeCompare(b));

            $scope.YearList = [...new Set(
                $scope.AllRows
                    .map(x => x.Year)
                    .filter(x => x)
            )].sort((a, b) => a - b);

            $scope.MonthList = [
                ...new Set(
                    $scope.AllRows
                        .map(x => x.Month)
                        .filter(x => x)
                )
            ].sort((a, b) =>
                new Date(Date.parse(a + " 1")).getMonth() -
                new Date(Date.parse(b + " 1")).getMonth()
            );

            // April → March
            $scope.MonthList = $scope.MonthList.slice(3).concat($scope.MonthList.slice(0, 3));
            $scope.statusDisplayMap = {
                'Complied': 'Complied',
                'NonComplied': 'Non-Complied',
                'Delaycomplied': 'Delay-Complied',
                'NonApplicable': 'Non-Applicable',
                'Pending': 'Pending',
                'Verified': 'Verified',
                'Remarks': 'Remarks'
            };

            $scope.StatusList = ['Complied', 'Delay-Complied', 'Non-Applicable', 'Non-Complied', 'Pending', 'Remarks', 'Verified'];
            $scope.All = $scope.AllRows.length;
            $scope.updateTilesCount($scope.AllRows);
            $scope.SelectedState = '';
            $scope.SelectedStatus = '';
            $scope.SelectedMonth = '';
            $scope.SelectedYear = '';
            $scope.Search = '';
            $scope.SelectedAct = 'Act';
        });
    };
    $scope.blockSpace = function (event) {

        var value = ($scope.Search || '');

        // Prevent first space
        if (value.length === 0 && event.which === 32) {
            event.preventDefault();
        }
    };
}


