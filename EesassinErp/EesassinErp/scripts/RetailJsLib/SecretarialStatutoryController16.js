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
        $scope.selectedCompliance = {
            Rule: row.Rule || 'N/A',
            Section: row.Section || 'N/A',
            FormNo: row.Forms || 'N/A',
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
        row.FileName = input.files[0].name;
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
                    row.FileName = files[0].name;
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
        $scope.showLoader();
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
            $scope.MasterRows  = response.data.Result;
            $scope.counttiles($scope.complianceRows);
        });
        $scope.hideLoader();
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


    //$scope.itemsPerPage = 100;
    //$scope.currentIndex = 0;
    //$scope.allComplianceRows = [];
    //$scope.complianceRows = [];

    //// अगला batch load करने का function
    //$scope.loadMore = function () {
    //    var nextIndex = $scope.currentIndex + $scope.itemsPerPage;
    //    var moreData = $scope.allComplianceRows.slice($scope.currentIndex, nextIndex);
    //    $scope.complianceRows = $scope.complianceRows.concat(moreData);
    //    $scope.currentIndex = nextIndex;
    //};

    //// Tiles counts + percentage update करने का function
    //$scope.updateTileCounts = function () {
    //    if (!$scope.allComplianceRows || !$scope.allComplianceRows.length) {
    //        $scope.totalCompliance = 0;
    //        $scope.compliedDocs = 0;
    //        $scope.pendingDocs = 0;
    //        $scope.delayedDocs = 0;
    //        $scope.nonCompliedDocs = 0;

    //        $scope.totalCompliancePercent = 0;
    //        $scope.compliedPercent = 0;
    //        $scope.pendingPercent = 0;
    //        $scope.delayedPercent = 0;
    //        $scope.nonCompliedPercent = 0;
    //        return;
    //    }

    //    var rows = $scope.allComplianceRows.filter(function (row) {
    //        return row.Calendartype && row.Calendartype.toLowerCase() === 'statutory';
    //    });

    //    var total = rows.length;

    //    $scope.totalCompliance = total;
    //    $scope.compliedDocs = rows.filter(row => row.CStatus === 'Complied').length;
    //    $scope.pendingDocs = rows.filter(row => !row.CStatus || row.CStatus.trim() === '').length;
    //    $scope.delayedDocs = rows.filter(row => row.CStatus === 'Delay complied').length;
    //    $scope.nonCompliedDocs = rows.filter(row => row.CStatus === 'Non Complied').length;

    //    // Percent calculation
    //    $scope.totalCompliancePercent = 100; // हमेशा 100%
    //    $scope.compliedPercent = total ? Math.round(($scope.compliedDocs / total) * 100) : 0;
    //    $scope.pendingPercent = total ? Math.round(($scope.pendingDocs / total) * 100) : 0;
    //    $scope.delayedPercent = total ? Math.round(($scope.delayedDocs / total) * 100) : 0;
    //    $scope.nonCompliedPercent = total ? Math.round(($scope.nonCompliedDocs / total) * 100) : 0;
    //};

    //// Backend से data लाना
    //$scope.BindSearch = function () {
    //    var collectionobj = {
    //        Action: 11,
    //        Id: LoginId,
    //        State: $scope.State,
    //        Month: $scope.Month,
    //        Year: $scope.Year
    //    };

    //    myService.methode(
    //        'POST',
    //        "../Retail/SearchSecretarialStatutory",
    //        '{obj:' + JSON.stringify(collectionobj) + '}'
    //    ).then(function (response) {
    //        // Full data save
    //        $scope.allComplianceRows = response.data.Result || [];

    //        // Tiles calculation (full data से)
    //        $scope.updateTileCounts();

    //        // Table partial load
    //        $scope.complianceRows = [];
    //        $scope.currentIndex = 0;
    //        $scope.loadMore();
    //    }).catch(function (error) {
    //        console.error("Error fetching data:", error);
    //        $scope.complianceRows = [];
    //    });
    //};



    //// After getting complianceRows from API
    //$scope.selectedAct = '';   // default no filter

    //// Generate unique list of acts
    //$scope.getUniqueActs = function () {
    //    const acts = $scope.complianceRows.map(row => row.Act);
    //    return [...new Set(acts)];  // unique values
    //};

    //// function to set selected act
    //$scope.filterByAct = function (act) {
    //    $scope.selectedAct = act;
    //};




    //// Scroll detection with threshold + debounce
    //let scrollTimeout;
    //angular.element(window).bind("scroll", function () {
    //    if (scrollTimeout) clearTimeout(scrollTimeout);

    //    scrollTimeout = setTimeout(function () {
    //        let scrollPosition = window.innerHeight + window.scrollY;
    //        let threshold = document.body.offsetHeight - 200; // पहले trigger

    //        if (scrollPosition >= threshold) {
    //            $scope.$apply($scope.loadMore);
    //        }
    //    }, 100); // 100ms debounce
    //});







    /////Added by shipra////////////////


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
    $scope.openComplianceModal = function (row) {
        $scope.selectedCompliance = row;
        setTimeout(function () {
            $('#complianceModal').modal('show');
        }, 0);
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
        if (!row.CStatus || !row.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (row.IsVerified == '') {
            showMsgBox("Please enter Verified Status");
            return;
        }
        if (row.VRemark1 == '' && row.IsVerified == 'Remarks') {
            showMsgBox("Please enter Remark in condition of Clarify.");
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


    $scope.clearAllFilters = function () {

        // ✅ Reset Filter Object
        $scope.filters = {
            Act: '',
            State: '',
            Status: '',
            Month: '',
            Year: ''
        };

        // ✅ Reset Selected Labels
        $scope.SelectedAct = '';
        $scope.StateName = '';
        $scope.SelectedStatus = '';
        $scope.SelectedMonth = '';
        $scope.SelectedYear = '';

        // ✅ Reset Data
        $scope.complianceRows = angular.copy($scope.MasterRows || []);

        // ✅ Rebind Dropdowns
        $scope.BindFilter();

        // ✅ Rebind Search/Grid
        $scope.BindSearch();
    };

    $scope.selectState = function (x) {
        $scope.State = x.State;
        $scope.StateName = x.STATE_NM;
    };

    $scope.clearState = function () {
        $scope.State = '';
        $scope.StateName = '';
    };


    $scope.selectMonth = function (x) {
        $scope.Month = x.Month;
        $scope.SelectedMonth = x.Month;
    };

    $scope.clearMonth = function () {
        $scope.Month = '';
        $scope.SelectedMonth = '';
    };

    $scope.selectYear = function (x) {
        $scope.Year = x;
        $scope.SelectedYear = x;
    };

    $scope.clearYear = function () {
        $scope.Year = '';
        $scope.SelectedYear = '';
    };

    $scope.openEventModal = function (row) {
        if (row.Frequency !== 'Event') {
            return;
        }
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
        obj.VRemark1 = "";
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
        newRow.TempIsVerified = '';
        newRow.VRemark = '';
        newRow.openthis = '';
        newRow.CRemark1 = '';
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
        myService.methode('POST', "../Retail/SearchFinacialStatutoryEvent", { obj: collectionobj }   // cleaner than string JSON
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
                        VRemark1: x.VRemark1,
                        VRemark: x.VRemark,
                        TempIsVerified: x.IsVerified,
                        IsVerified: x.IsVerified,
                        openthis: x.openthis,
                        CRemark1: x.CSIID
                    };
                });
                console.log("checkdata", $scope.selectedEvent1);
            } else {

            }

        }, function (error) {
            console.error("Error fetching event details:", error);
        });
    };
 
    $scope.AddEventNewverifyRecord = function (row1) {
        if (!row1.CStatus || !row1.ActualSubmissionDate) {
            showMsgBox("Please enter both Status  and Actual Submission Date.");
            return;
        }
        if (row1.IsVerified == '') {
            showMsgBox("Please enter Verified Status");
            return; ``
        }
        if (row1.VRemark1 == '' && row1.IsVerified == 'Remarks') {
            showMsgBox("Please enter Remark in condition of Clarify.");
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
            formData.append('Action', '3');
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
                navigator.msSaveBlob(blob, "FinanceCompliance.csv");
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
                <td>${row.CStatus }</td>
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

    $scope.filters = {
        Act: '',
        State: '',
        Status: '',
        Month: '',
        Year: ''
    };

    $scope.getAct = function (act) {
        $scope.SelectedAct = act.Act;
        $scope.filters.Act = act.Act;
        $scope.applyFilters();
    };

    $scope.selectState = function (x) {
        $scope.StateName = x.STATE_NM;
        $scope.filters.State = x.STATE_NM;
        $scope.applyFilters();
    };

    $scope.SelectStatuslist = function (x) {
        $scope.SelectedStatus = x.Status;
        $scope.filters.Status = x.Status;
        $scope.applyFilters();
    };

    $scope.selectMonth = function (x) {
        $scope.SelectedMonth = x.Month;
        $scope.filters.Month = x.Month;
        $scope.applyFilters();
    };

    $scope.selectYear = function (x) {
        $scope.SelectedYear = x;
        $scope.filters.Year = x;
        $scope.applyFilters();
    };

    $scope.applyFilters = function () {

        // ✅ Always start from original data
        var filtered = angular.copy($scope.MasterRows || []);

        // ✅ Act
        if ($scope.filters.Act) {

            filtered = filtered.filter(function (x) {

                return String(x.Act || '').trim().toLowerCase() ===
                    String($scope.filters.Act).trim().toLowerCase();

            });
        }

        // ✅ State
        if ($scope.filters.State) {

            filtered = filtered.filter(function (x) {

                return String(x.STATE_NM || '').trim().toLowerCase() ===
                    String($scope.filters.State).trim().toLowerCase();

            });
        }

        // ✅ Status
        if ($scope.filters.Status) {

            filtered = filtered.filter(function (x) {

                var status = String(x.CStatus || '').trim();
                var isVerified = String(x.IsVerified || '').trim();

                var finalStatus = '';

                if (!status) {
                    finalStatus = 'Pending';
                }
                else if (isVerified === 'Verified') {
                    finalStatus = 'Verified';
                }
                else if (isVerified === 'Clarify') {
                    finalStatus = 'Remarks';
                }
                else {
                    finalStatus = status;
                }

                return finalStatus.toLowerCase() ===
                    String($scope.filters.Status).trim().toLowerCase();

            });
        }

        // ✅ Month
        if ($scope.filters.Month) {

            filtered = filtered.filter(function (x) {

                return String(x.Month || '').trim().toLowerCase() ===
                    String($scope.filters.Month).trim().toLowerCase();

            });
        }

        // ✅ Year
        if ($scope.filters.Year) {

            filtered = filtered.filter(function (x) {

                return String(x.Year || '').trim() ===
                    String($scope.filters.Year).trim();

            });
        }

        // ✅ Final Table
        $scope.complianceRows = filtered;

        // ✅ Dependent Filters
        $scope.ActList = [...new Set(filtered.map(x => x.Act))]
            .map(x => ({ Act: x }));

        $scope.SMasterList = [...new Set(filtered.map(x => x.STATE_NM))]
            .map(x => ({ STATE_NM: x }));

        $scope.MonthList = [...new Set(filtered.map(x => x.Month))]
            .map(x => ({ Month: x }));

        $scope.YearList = [...new Set(
            filtered
                .map(x => x.Year)
                .filter(x => x)
        )].map(x => ({ Year: x }));

        $scope.StatusList = [...new Set(filtered.map(function (x) {

            var status = String(x.CStatus || '').trim();
            var isVerified = String(x.IsVerified || '').trim();

            if (!status) {
                return 'Pending';
            }
            else if (isVerified === 'Verified') {
                return 'Verified';
            }
            else if (isVerified === 'Clarify') {
                return 'Remarks';
            }
            else {
                return status;
            }

        }))].map(x => ({ Status: x }));

        // ✅ Tiles
        $scope.counttiles(filtered);
    };
}

