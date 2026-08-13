app.LitigationMasterController = function ($scope, $element, $filter, myService) {
    $scope.DashboardOpen = true;
    $scope.ForumCourtName = '';
    $scope.IsOpen = false;
    $scope.FilterIsOpen = false;
    
    $scope.Stage1 = false;
    $scope.Stage2 = true;
    $scope.Stage3 = true;
    $scope.Stage4 = true;
    $scope.Stage5 = true;
    $scope.NewCase = function () {
        $scope.IsOpen = true;
        $scope.FilterIsOpen = false;
      
        $scope.switchTab(null, 'Stage 1', 'tab1');
    }
    $scope.CloseCase = function () {
        $scope.Reset();
        $scope.IsOpen = false;
        $scope.FilterIsOpen = false;
    }

    $scope.AllCourtMaster = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', ("../Retail/SearchCourtMaster"), JSON.stringify(collectionobj)); 
        getData.then(function (response) {
            debugger;
            $scope.CourtMasterList = response.data.Result;
        });
    }
    $scope.BindAppeals = function (CaseCode, caseno) {
        
        var collectionobj = {
            Action: 8,
            CaseCode: caseno
        }; 
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationMasterBYCaseCode", JSON.stringify(collectionobj));
          getData.then(function (response)
        {
              $scope.AppealList = response.data.Result.Table;
        });
    }
    $scope.Reset = function () {
        // Clear Stage 1 Fields
        $scope.CaseCode = '';
        $scope.CaseTitle = '';
        $scope.CaseType = ''; 
        $scope.Probability = '';

        $scope.ForumCourtName = '';
        $scope.CaseNumber = '';
        $scope.FilingDate = '';
        $('#txtFilingDate').val('');
        $scope.OppositionParty = '';
        $scope.AdvocateOrLegalCounsel = '';
        $scope.ExternalFirmName = '';
        $scope.SeniorRepName = '';
        $scope.SeniorRepMobile = '';
        $scope.SeniorRepEmail = '';
        $scope.JuniorRepName = '';
        $scope.JuniorRepMobile = '';
        $scope.JuniorRepEmail = '';
        $scope.ExternalCounselInitialOpinion = '';
        $scope.Interest = '';
        $scope.LateFee = '';
        $scope.Fines = '';
        $scope.Penalities = '';
        $scope.Other = '';

       

        $scope.RepName = '';
        $scope.RepMobile = '';
        $scope.RepEmail = '';
        $scope.InHouseCounselInitialOpinion = '';
        $scope.State = '';
        $scope.FileUploadPath = '';
        $('#txtFileUploadDate').val('');
        $scope.AppealStatus = '';
        $scope.Appealby = '';
        $scope.IsOpen = false;

        // Clear Stage 2 Fields
        $scope.File1 = '';
        $scope.File2 = '';
        $scope.File3 = '';
        $('#txtPleadingsType').val('');
        $('#txtDateOfFilling').val('');
        $('#txtDateOfUpload').val('');
        $scope.Note = '';

        // Clear Stage 3 Hearings
        $scope.hearings = [];
        $scope.AddHeading = false;
        $scope.addNewHearing();
        // Clear Stage 4 Fields
        $scope.JudgmentPassed = '';
        $scope.JudiciaryName = '';
        $scope.SummaryOfJudgment = '';
        $scope.JudgmentTime = '';
        $('#txtJudgmentTime').val('');
        $scope.ExecutionStatus = '';
        $scope.CondonationFiled = '';
        $scope.CondonationStatus = '';
        $scope.JudgmentCopyPath = '';
    };

    $scope.EditCaseCode = function (CaseCode) {
        var collectionobj = {
            Action: 7,
            CaseCode: CaseCode
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationMasterBYCaseCode", JSON.stringify(collectionobj));

        getData.then(function (response) {
            var result = response.data.Result;
            $scope.Stage1List = result.Table;
            $scope.Stage2List = result.Table1;
            $scope.Stage3List = result.Table2;
            $scope.Stage4List = result.Table3;
            $scope.switchTab(null, 'Stage 1', 'tab1');
            if ($scope.Stage1List && $scope.Stage1List.length > 0) {
                $scope.BindStage1($scope.Stage1List[0]);
            }
            if ($scope.Stage2List && $scope.Stage2List.length > 0) {
                $scope.BindStage2($scope.Stage2List[0]);
            }
            if ($scope.Stage3List && $scope.Stage3List.length > 0) {
                $scope.BindStage3($scope.Stage3List);
            }
            
            if ($scope.Stage4List && $scope.Stage4List.length > 0) {
                $scope.BindStage4($scope.Stage4List[0]);
            }
        });
    };
    $scope.BindStage4 = function (Stage4List) {
        function toStringValue(val) {
            return val !== null && val !== undefined ? String(val) : '';
        }

        $scope.JudgmentPassed = toStringValue(Stage4List.JudgmentPassed);
        $scope.JudiciaryName = toStringValue(Stage4List.JudiciaryName);
        $scope.SummaryOfJudgment = toStringValue(Stage4List.SummaryOfJudgment);
        $scope.JudgmentTime = toStringValue(Stage4List.JudgmentTime);
        $('#txtJudgmentTime').val(Stage4List.JudgmentTime)
        $scope.ExecutionStatus = toStringValue(Stage4List.ExecutionStatus);
        $scope.CondonationFiled = toStringValue(Stage4List.CondonationFiled);
        $scope.CondonationStatus = toStringValue(Stage4List.CondonationStatus);
        $scope.JudgmentCopyPath = toStringValue(Stage4List.JudgmentCopyPath);
    };


    $scope.BindStage3 = function (Stage3List) {
        $scope.hearings = []; // Reset before binding
       
        angular.forEach(Stage3List, function (item, index) {
           
            $scope.addNewHearing();
            // Format and assign date strings safely
            var dateOfHearing = item.DateOfHearing ? item.DateOfHearing.split('T')[0] : '';
            var dateOfUpload = item.DateOfUpload ? item.DateOfUpload.split('T')[0] : '';

            $scope.hearings[index].DateOfHearing = dateOfHearing ? new Date(dateOfHearing) : null;
            $scope.hearings[index].DateOfUpload = dateOfUpload ? new Date(dateOfUpload) : null;
            $scope.hearings[index].PurposeOfHearing = item.PurposeOfHearing || '';
            $scope.hearings[index].OutcomeOfHearing = item.OutcomeOfHearing || '';
            $scope.hearings[index].CaseStatus = item.CaseStatus || ''; 
            $scope.hearings[index].HearingFileName = item.HearingFileName || '';
            $scope.hearings[index].HearingFilePath = item.HearingFilePath || '';
            $scope.hearings[index].ExistingFile = item.HearingFilePath || '';
            if (item.CaseStatus == 'Ongoing') {
                $scope.AddHeading = true;
            }
            else { $scope.AddHeading = false; }
        });
    };

    $scope.BindStage2 = function (Stage2List) {
        $scope.File1 = Stage2List.File1;
        $scope.File2 = Stage2List.File2;
        $scope.File3 = Stage2List.File3;
        $('#txtPleadingsType').val(Stage2List.PleadingsType)
        var DateOfFilling = Stage2List.DateOfFilling;
        var DateOfFilling = DateOfFilling.split('T')[0];
        $('#txtDateOfFilling').val(DateOfFilling);

        var DateOfUpload = Stage2List.DateOfFilling;
        var DateOfUpload = DateOfUpload.split('T')[0];
        $('#txtDateOfUpload').val(DateOfUpload)
        $scope.Note = Stage2List.Note;
    }

    $scope.BindStage1 = function (Stage1List) {
        $scope.CaseCode = Stage1List.CaseCode;
        $scope.CaseTitle = Stage1List.CaseTitle;
        $scope.CaseType = Stage1List.CaseType;
        $scope.Probability = Stage1List.Probability;
        $scope.ForumCourtName = Stage1List.ForumCourtName;
        $scope.CaseNumber = Stage1List.CaseNumber;

        var FilingDate = Stage1List.FilingDate;
        FilingDate = FilingDate.split('T')[0];
        
        $('#txtFilingDate').val(FilingDate)
        $scope.FilingDate = FilingDate;
        $scope.OppositionParty = Stage1List.OppositionParty;
        $scope.AdvocateOrLegalCounsel = Stage1List.AdvocateOrLegalCounsel;
        if ($scope.AdvocateOrLegalCounsel == 'External') {
            $scope.external = true;
        }
        else { $scope.external = false; }

       /* $scope.ExternalFirm = Stage1List.ExternalFirm;*/
        $scope.ExternalFirmName = Stage1List.ExternalFirmName;
        $scope.SeniorRepName = Stage1List.SeniorRepName;
        $scope.SeniorRepMobile = Stage1List.SeniorRepMobile;
        $scope.SeniorRepEmail = Stage1List.SeniorRepEmail;
        $scope.JuniorRepName = Stage1List.JuniorRepName;
        $scope.JuniorRepMobile = Stage1List.JuniorRepMobile;
        $scope.JuniorRepEmail = Stage1List.JuniorRepEmail;
        $scope.ExternalCounselInitialOpinion = Stage1List.ExternalCounselInitialOpinion;


        $scope.Interest = Stage1List.Interest;
        $scope.LateFee = Stage1List.LateFee;
        $scope.Fines = Stage1List.Fines;
        $scope.Penalities = Stage1List.Penalities;
        $scope.Other = Stage1List.Other;

        $scope.RepName = Stage1List.RepName;
        $scope.RepMobile = Stage1List.RepMobile;
        $scope.RepEmail = Stage1List.RepEmail; // corrected from CaseCode
        $scope.InHouseCounselInitialOpinion = Stage1List.InHouseCounselInitialOpinion;
        $scope.State = Stage1List.State;
        var fullDate = Stage1List.FileUploadDate;
        var dateOnly = fullDate.split('T')[0];
        $('#txtFileUploadDate').val(dateOnly); 
        $scope.FileUploadPath = Stage1List.FileUploadPath;
        $scope.AppealStatus = Stage1List.AppealStatus;
        $scope.Appealby = Stage1List.Appealby;
        $scope.ACaseStatus = Stage1List.ACaseStatus;
        
        $scope.IsOpen = true;
    };
    $scope.isValidFilePath = function (filePath) {
        return typeof filePath === 'string' && filePath.indexOf('[object') === -1;
    };
    $scope.getFileIcon = function (filePath) {
        debugger;
        if (!filePath) return 'fas fa-file';

        if (typeof filePath === 'object' && filePath instanceof File) {
            return null;
        }
        var ext = filePath.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf':
                return 'fas fa-file text-danger';
            case 'doc':
            case 'docx':
                return 'fas fa-file-word text-primary';
            case 'jpg':
            case 'jpeg':
            case 'png':
                return 'fas fa-file-image text-success';
            default:
                return 'fas fa-file';
        }
    };

    $scope.getFileName = function (filePath) {
        if (!filePath) return '';
        return filePath.split('/').pop(); // or \\ for Windows-style paths
    };
    $scope.BindLitigation = function (casecode,caseno) {
        $scope.$apply(function () {
            $scope.IsOpen = true;
            $scope.FilterIsOpen = true;
            $scope.switchTab(null, 'Stage 1', 'tab1');
            $scope.BindAppeals(casecode, caseno);
        }); 
    }


    $scope.GetLitigationMaster = function (pageNumber, pageSize, Searchby) {
        $scope.showLoader();

        if ($.fn.DataTable && $.fn.DataTable.isDataTable('#example')) {
            $('#example').DataTable().clear().destroy();
        }


        var table = $('#example').DataTable({
            dom: 'Bfrtip',
            searching: false,
            processing: true,
            serverSide: true,
            pageLength: pageSize, 
            ajax: function (data, callback, settings) {
                var currentPage = Math.floor(data.start / data.length) + 1;  
                 
                var collectionobj = {
                    Action: 6,
                    Id: LoginId,
                    Searchby: $('#myInput').val(), 
                    PageNumber: currentPage,
                    PageSize: data.length
                };

                // Make AJAX call to retrieve data
                myService.methode('POST', "../RetailSection/SearchLitigationMaster", JSON.stringify(collectionobj))
                    .then(function (response) {
                        var resultData = response.data.Result.Table || [];
                        var totalRecords = resultData.length > 0 ? resultData[0].TotalRecords : 0; // Get the total record count

                        // Update the scope for any further processing
                        $scope.$applyAsync(function () {
                            $scope.StoreListForEdit = resultData;
                        });

                        // Callback function for DataTable to process the data
                        callback({
                            draw: data.draw,
                            recordsTotal: totalRecords, // Total records without filtering
                            recordsFiltered: totalRecords, // Total records after applying the filter
                            data: resultData // Actual data to display
                        });
                    });
            },
            columns: [
                { data: 'SNO', title: 'Sr.No' },
                {
                    data: 'CaseCode',
                    title: 'CaseCode',
                    render: function (data, type, row) {
                    return `
                    <a class="text-success" 
                    href="javascript:void(0);" 
                    onclick="angular.element(this).scope().BindLitigation('${row.CaseCode}','${row.CaseNumber}')">
                    <b>${row.CaseCode}</b>
                    </a>`;
                    }
                },
                { data: 'CaseTitle', title: 'Case Title', render: data => `<div class="column-content">${data || ''}</div>` },
                { data: 'CaseNumber', title: 'Case Number', render: data => `<div class="column-content">${data || ''}</div>` },
                { data: 'CaseType', title: 'Case Type', render: data => data || '' },
                { data: 'PleadingsType', title: 'Pleadings Type', render: data => `<div class="column-content">${data || ''}</div>` },
                { data: 'OppositionParty', title: 'Opposition Party', render: data => `<div class="column-content">${data || ''}</div>` },
                { data: 'JudgmentPassed', title: 'Judgment Passed', render: data => `<div class="column-content">${data || ''}</div>` },
                {
                    data: 'AppealStatus',
                    title: 'Appeal Status',
                    render: function (data) {
                        if (data === '1') {
                            return '<div class="form-control2 cnt"><label class="switch" style="text-align:center"><div class="newslider" style="border-radius: 34px;background-color: #92c88e!important; padding: 3px !important; height: inherit !important;"><span>Yes</span></div></label></div>';
                        } else if (data === '0') {
                            return '<div class="form-control2 cnt"><label class="switch" style="text-align:center"><div class="newslider" style="border-radius: 34px;background-color: #f9cccc!important; padding: 3px !important; height: inherit !important;"><span>No</span></div></label></div>';
                        }
                        return '<span class="badge bg-warning">No Status</span>';
                    }
                },
                {
                    data: null,
                    title: '',
                    render: function (data, type, row) {
                        return `
                        <div class="editlist dropdown">
                            <a href="#" class="dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                <span class="fa fa-ellipsis-v"></span>
                            </a>
                            <div class="dropdown-menu"> 
                                <a class="dropdown-item view-more" data-store-code="${row.CaseCode}" href="#">View More</a>
                            </div>
                        </div>`;
                    }
                }
            ],
            drawCallback: function () {
                var $scope = angular.element(document.querySelector('[ng-controller="myController"]')).scope();

                // Handle 'View More' button click
                $('.view-more').off('click').on('click', function () {
                    var CaseCode = $(this).data('store-code');
                    $scope.$apply(function () {
                        if ($scope.EditCaseCode) {
                            $scope.EditCaseCode(CaseCode); // Call the EditCaseCode function on click
                        } else {
                            console.error('EditStore is not defined.');
                        }
                    });
                });
            },
            buttons: [
                {
                    extend: 'csv',
                    filename: 'Litigation Master',
                    orientation: 'landscape',
                    title: 'Litigation Master',
                    exportOptions: { columns: ':visible' },
                    action: function () {
                        $scope.ManageLog('Litigation Master CSV Download');
                        $scope.GetExcel();
                    }
                },
                'excel',
                {
                    extend: 'pdfHtml5',
                    text: 'Export PDF',
                    filename: 'Litigation Master',
                    orientation: 'landscape',
                    pageSize: 'A4',
                    customize: function (doc) {
                        doc.pageMargins = [20, 60, 20, 30];
                        doc.styles.tableHeader.fontSize = 15;
                        doc['header'] = function () {
                            return {
                                columns: [{ alignment: 'center', fontSize: 14, text: 'Litigation Master' }],
                                margin: 40
                            };
                        };
                    },
                    exportOptions: { columns: ':visible' },
                    action: function () {
                        $scope.ManageLog('Litigation Master PDF Download');
                        $scope.Getpdf();
                    }
                },
                {
                    extend: 'print',
                    filename: 'Litigation Master',
                    orientation: 'landscape',
                    title: 'Litigation Master',
                    customize: function (win) {
                        $(win.document.body).addClass('white-bg').css('font-size', '8px');
                        $(win.document.body).find('table')
                            .addClass('compact')
                            .css('font-size', '8px')
                            .css('color', 'black');
                    },
                    exportOptions: { columns: ':visible' },
                    action: function () {
                        $scope.ManageLog('Litigation Master Print Download');
                        $scope.GetPrint();
                    }
                }
            ]
        });

        // Handling after DataTable is initialized
        table.on('init', function () {
            $scope.hideLoader();  // Hide loader after DataTable is initialized
        });

    };
    $scope.ChangeHearing = function (Statu) {
        if (Statu == 'Ongoing') {
            $scope.AddHeading = true;
        }
        else { $scope.AddHeading = false;}
    }
    $scope.AddHeading = false;
    $scope.GetPrint = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            Action: 6,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: $('#myInput').val()  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/SearchLitigationMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.StoreListForExport = response.data.Result; // Store data for export 
                    var dataToExport = $scope.StoreListForExport;
                    $scope.PrintData(dataToExport);
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };
    $scope.PrintData = function (dataToPrint) {
        // Filter the data to only include the selected columns
        var filteredData = dataToPrint.map(function (row) {
            var filteredRow = {};
            $scope.selectedColumnspdf.forEach(function (column) {
                if (row.hasOwnProperty(column)) {
                    filteredRow[column] = row[column];  // Add only the selected columns to the row
                }
            });
            return filteredRow;
        });

        // Create a new HTML table for the data to be printed
        var tableHtml = "<table border='1' style='border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;'>";

        // Create the table header
        tableHtml += "<thead><tr>";
        $scope.selectedColumnspdf.forEach(function (column) {
            tableHtml += "<th style='background-color: #f2f2f2; padding: 8px; text-align: center;'>" + column + "</th>";
        });
        tableHtml += "</tr></thead>";

        // Create the table rows
        tableHtml += "<tbody>";
        filteredData.forEach(function (row) {
            tableHtml += "<tr>";
            $scope.selectedColumnspdf.forEach(function (column) {
                var cellData = row[column] !== undefined && row[column] !== null ? row[column] : "";  // Handle null or undefined data
                tableHtml += "<td style='padding: 8px; text-align: center;'>" + cellData + "</td>";
            });
            tableHtml += "</tr>";
        });
        tableHtml += "</tbody></table>";

        // Open a new window and write the table HTML to it
        var printWindow = window.open('', '', 'width=800, height=600');
        printWindow.document.write('<html><head><title>Litigation Master Report</title>');
        printWindow.document.write('<style>body { font-family: Arial, sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { padding: 8px; text-align: center; } th { background-color: #f2f2f2; } </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2 style="text-align: center;">Store Master Report</h2>');  // Title centered
        printWindow.document.write(tableHtml);  // Add the table HTML
        printWindow.document.write('</body></html>');
        printWindow.document.close();  // Close the document for printing

        // Wait for the content to load and trigger the print dialog
        printWindow.onload = function () {
            printWindow.print();  // Trigger the print dialog
        };
    };
    $scope.ExportToPDF = function (dataToExport) {
        const { jsPDF } = window.jspdf;

        // Initialize jsPDF with landscape orientation
        const doc = new jsPDF('landscape');

        // Set font for the entire document
        doc.setFont("helvetica", "normal");

        // Title for the PDF - Centered
        const title = "Litigation Master Report";
        const pageWidth = doc.internal.pageSize.width;
        const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
        const titleX = (pageWidth - titleWidth) / 2; // Center the title

        doc.setFontSize(15);
        doc.text(title, titleX, 10); // Center the title

        // Set font and size for the table content
        doc.setFontSize(10);

        // Define column widths dynamically based on the content
        const columnWidths = new Array($scope.selectedColumnspdf.length).fill(30); // Adjust each column width if necessary
        const startX = 10;
        const startY = 20;
        let yPosition = startY + 10; // Space for title

        // Create header row with bold font, background color, and white text
        doc.setFont("helvetica", "bold");
        const headerHeight = 10; // Height of the header row
        const headerBackgroundColor = [200, 200, 200]; // Light gray background for the header
        const headerWidth = columnWidths.reduce((sum, width) => sum + width, 0); // Total width of all columns

        // Draw header background
        doc.setFillColor(...headerBackgroundColor);
        doc.rect(startX, yPosition - headerHeight, headerWidth, headerHeight, 'F'); // Draw background for header

        // Draw header text
        let xPosition = startX;
        $scope.selectedColumnspdf.forEach(function (column, columnIndex) {
            doc.text(column, xPosition + 5, yPosition); // Add some padding for text
            xPosition += columnWidths[columnIndex];
        });

        yPosition += headerHeight;  // Move to the next line after header row

        // Reset to normal font for the data rows
        doc.setFont("helvetica", "normal");

        // Loop through each row of data and print only the selected columns
        dataToExport.forEach(function (row, index) {
            // If row content overflows, add a page break
            if (yPosition + headerHeight > doc.internal.pageSize.height) {
                doc.addPage(); // Add a new page
                yPosition = startY; // Reset y-position
            }

            // Filter the row based on selected columns and convert all values to string
            var filteredRow = $scope.selectedColumnspdf.map(function (column) {
                return (row[column] !== undefined && row[column] !== null) ? String(row[column]) : "";  // Ensure the value is a string
            });

            // Print the row data with proper column widths
            let xPosition = startX;
            filteredRow.forEach(function (cell, columnIndex) {
                doc.text(cell, xPosition + 5, yPosition); // Add some padding for text
                xPosition += columnWidths[columnIndex]; // Move to the next column position
            });

            yPosition += headerHeight;  // Move to the next line after each row
        });

        // Save the PDF with the name 'StoreMaster.pdf'
        doc.save('LitigationMaster.pdf');
    };
    $scope.Getpdf = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            Action: 6,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: $('#myInput').val()  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/SearchLitigationMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.StoreListForExport = response.data.Result; // Store data for export 
                    var dataToExport = $scope.StoreListForExport;
                    $scope.ExportToPDF(dataToExport);
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };
    $scope.selectedColumnspdf = [
        "SNO", "CaseCode", "CaseTitle", "CaseNumber", "FilingDate", "CaseType",
        "PleadingsType", "DateOfHearing", "JudgmentPassed","AppealStatusFiled"
    ];
     
    $scope.ExportToExcel = function (dataToExport) {

        var filteredData = dataToExport.map(function (row) {
            var filteredRow = {};
            $scope.selectedColumnspdf.forEach(function (column) {
                if (row.hasOwnProperty(column)) {
                    filteredRow[column] = row[column];  // Add only the selected columns to the row
                }
            });
            return filteredRow;
        });
        var ws = XLSX.utils.json_to_sheet(filteredData);  // Convert data to sheet
        var wb = XLSX.utils.book_new();  // Create a new workbook
        XLSX.utils.book_append_sheet(wb, ws, "Litigation Master Report");  // Append sheet to workbook
        XLSX.writeFile(wb, 'LitigationMaster.xlsx');  // Write to file
    };
    $scope.GetExcel = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            Action: 6,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: $('#myInput').val()  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/SearchLitigationMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.StoreListForExport = response.data.Result; // Store data for export 
                    var dataToExport = $scope.StoreListForExport;
                    $scope.ExportToExcel(dataToExport);
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };
    $scope.hearings = [
        {
            DateOfHearing: '',
            PurposeOfHearing: '',
            OutcomeOfHearing: '',
            CaseStatus: '',
            DateOfUpload: '',
            HearingFilePath: ''
        }
    ];

    $scope.addNewHearing = function () {
        $scope.hearings.push({
            DateOfHearing: '',
            PurposeOfHearing: '',
            OutcomeOfHearing: '',
            CaseStatus: '',
            DateOfUpload: '',
            HearingFilePath: ''
        });
    };
    $scope.external = true;
    $scope.AdvocateOrLegalCounsel = 'External';
    $scope.hIDESHOWEVENT = function (AdvocateOrLegalCounsel) {
        if (AdvocateOrLegalCounsel == 'External') {
            $scope.external = true;
        }
        else { $scope.external = false;}
    }
    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": "1" });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }
    $scope.SaveStage1 = function() {
        debugger;
        if ($scope.ACaseStatus === undefined || $scope.ACaseStatus === null || $scope.ACaseStatus === '') {
            $('#txtCaseStatus').addClass('red-validation');
            return;
        } else {
            $('#txtCaseStatus').removeClass('red-validation');
        }
        if ($scope.Probability === undefined || $scope.Probability === null || $scope.Probability === '') {
            $('#txtProbability').addClass('red-validation');
            return;
        } else {
            $('#txtProbability').removeClass('red-validation');
        }

        // Validate emails only if filled
        let emailFields = ['txtSeniorRepEmail', 'txtJuniorRepEmail', 'txtRepEmail'];
        let hasInvalidEmail = false;

        emailFields.forEach(function (fieldId) {
            let email = $('#' + fieldId).val().trim();
            let pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

            if (email !== "" && !pattern.test(email)) {
                $scope.emailInvalids[fieldId] = true;
                hasInvalidEmail = true;
            } else {
                $scope.emailInvalids[fieldId] = false;
            }
        });

        // If any invalid email, block save
        if (hasInvalidEmail) {
            showMsgBox('999', 'Validation Error', 'Please enter valid email addresses.', 'warning', 'btn-warning');
            return;
        }
        if (!isValidate()) return;

        $('#loader').show();

        var fileInput = document.getElementById('txtFileUploadPath');
        var formData = new FormData();

        // Add plain form values
        formData.append("CreatedBy", LoginId);
        formData.append("CreatedOn", new Date().toISOString());
        formData.append("CaseCode", $scope.CaseCode);
        formData.append("CaseTitle", $scope.CaseTitle); 
        formData.append("CaseType", $scope.CaseType);
        formData.append("Probability", $scope.Probability);
        formData.append("ForumCourtName", $scope.ForumCourtName);
        formData.append("CaseNumber", $scope.CaseNumber);
        formData.append("FilingDate", $('#txtFilingDate').val());
        formData.append("OppositionParty", $scope.OppositionParty);
        formData.append("AdvocateOrLegalCounsel", $scope.AdvocateOrLegalCounsel);
     
     /*   formData.append("ExternalFirm", $scope.ExternalFirm);*/
        formData.append("ExternalFirmName", $scope.ExternalFirmName);
        formData.append("SeniorRepName", $scope.SeniorRepName);
        formData.append("SeniorRepMobile", $scope.SeniorRepMobile);
        formData.append("SeniorRepEmail", $('#txtSeniorRepEmail').val());
        formData.append("JuniorRepName", $scope.JuniorRepName);
        formData.append("JuniorRepMobile", $scope.JuniorRepMobile);
        formData.append("JuniorRepEmail", $('#txtJuniorRepEmail').val() );
        formData.append("ExternalCounselInitialOpinion", $scope.ExternalCounselInitialOpinion);


        formData.append("Interest", $scope.Interest);
        formData.append("LateFee", $scope.LateFee);
        formData.append("Fines", $scope.Fines);
        formData.append("Penalities", $scope.Penalities);
        formData.append("Other", $scope.Other);


        formData.append("RepName", $scope.RepName);
        formData.append("RepMobile", $scope.RepMobile);
        formData.append("RepEmail", $('#txtRepEmail').val());
        formData.append("InHouseCounselInitialOpinion", $scope.InHouseCounselInitialOpinion);
        formData.append("State", $scope.State);
        formData.append("FileUploadDate", $('#txtFileUploadDate').val());
        formData.append("ACaseStatus", $scope.ACaseStatus);
        formData.append("Action", 1); 
        // Add file if selected
        if (fileInput.files.length > 0) {
            formData.append("FileUpload", fileInput.files[0]);
        }
        formData.append("ExistingFilePath", $scope.FileUploadPath || '');

        $.ajax({
            url: "../RetailSection/IUDLitigationMaster",
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (response) {
              
                var innerResult = JSON.parse(response.Result); // converts string to object

                // Step 2: Extract and split the "Result" field
                var parts = innerResult.Result.split('|');

                // Step 3: Get the values
                var code = parts[0].trim(); // "LC00021"
                var id = parts[1].trim();   // "1"

                // Example usage
                console.log("Code:", code);
                console.log("ID:", id); 
                $('#txtCaseCode').val(code);
                $scope.CaseCode = $('#txtCaseCode').val();
              
                if (id == '-1') {
                    showMsgBox('999', 'Alert', 'Record Already Exist', 'warning', 'btn-warning');
                } else
                {
                    $scope.$apply(function () {
                        $scope.switchTab(null, 'Stage 2', 'tab2');
                    });
                    showMsgBox('999', 'Save', 'Save Successfully: ' + parts[0].trim(), 'success', 'btn-success')
                }
                $scope.GetLitigationMaster(1, 10, '')
            },
            error: function (xhr, status, error) {
                alert('Error: ' + error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }
    $scope.switchTab = function (evt, Stage, tabId) {
        var i, tabcontent, tablinks;

        // Hide all tab content
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].classList.remove("active");
        }

        // Remove active class from all tab links
        tablinks = document.querySelectorAll(".tab-nav li");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].classList.remove("active");
        }

        // Show the current tab
        document.getElementById(tabId).classList.add("active");

        // If evt is provided (like in UI click), mark the clicked tab as active
        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.add("active");
        } else {
            // Manually activate the corresponding tab link for tabId
            var liList = document.querySelectorAll('.tab-nav li');
            for (var j = 0; j < liList.length; j++) {
                if (liList[j].textContent.trim() === Stage) {
                    liList[j].classList.add("active");
                    break;
                }
            }
        }
    };


    $scope.SaveStage2 = function () {
        debugger;
        $scope.CaseCode = $('#txtCaseCode').val();
        if ($('#txtPleadingsType').val() == '') {
            $('#txtPleadingsType').addClass('red-validation');
            return;
        } else {
            $('#txtPleadingsType').removeClass('red-validation');
        
        }

        if ($('#txtDateOfFilling').val() == '') {
            $('#txtDateOfFilling').addClass('red-validation');
            return;
        } else {
            $('#txtDateOfFilling').removeClass('red-validation');
           
        }
        $('#loader').show(); 
        var fileInput1 = document.getElementById('txtFile1');
        var fileInput2 = document.getElementById('txtFile2');
        var fileInput3 = document.getElementById('txtFile3');
        var formData = new FormData();

        // Add plain form values
        formData.append("CreatedBy", LoginId); 
        formData.append("CaseCode", $scope.CaseCode); 
        formData.append("PleadingsType", $('#txtPleadingsType').val()); 
        formData.append("Note", $scope.Note);
        formData.append("DateOfFilling", $('#txtDateOfFilling').val());
        formData.append("DateOfUpload", $('#txtDateOfUpload').val()); 
        formData.append("Action", 2);
        // Add file if selected
        if (fileInput1.files.length > 0) {
            formData.append("File1", fileInput1.files[0]);
        } 

        if (fileInput2.files.length > 0) {
            formData.append("File2", fileInput2.files[0]);
        } 

        if (fileInput3.files.length > 0) {
            formData.append("File3", fileInput3.files[0]);
        } 
        formData.append("ExistingFile1", $scope.File1 || '');
        formData.append("ExistingFile2", $scope.File2 || '');
        formData.append("ExistingFile3", $scope.File3 || '');
        $.ajax({
            url: "../RetailSection/IUDLitigationMasterStage2",
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (response) { 
                var innerResult = JSON.parse(response.Result); // converts string to object 
                var parts = innerResult.Result
                $scope.$apply(function () {
                    $scope.switchTab(null, 'Stage 3', 'tab3');
                    $scope.GetLitigationMaster(1, 10, '')
                });
                showMsgBox(innerResult.Result );
              
            },
            error: function (xhr, status, error) {
                alert('Error: ' + error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }
    
    $scope.SaveStage3 = function () {
        debugger;
        $scope.CaseCode = $('#txtCaseCode').val();
        $('#loader').show();

        var formData = new FormData();
        formData.append("CaseCode", $scope.CaseCode);
        formData.append("Action", 3);
        formData.append("CreatedBy", LoginId);

        angular.forEach($scope.hearings, function (hearing, index) {
            formData.append("hearings[" + index + "].DateOfHearing", hearing.DateOfHearing || '');
            formData.append("hearings[" + index + "].PurposeOfHearing", hearing.PurposeOfHearing || '');
            formData.append("hearings[" + index + "].OutcomeOfHearing", hearing.OutcomeOfHearing || '');
            formData.append("hearings[" + index + "].CaseStatus", hearing.CaseStatus || '');
            formData.append("hearings[" + index + "].DateOfUpload", hearing.DateOfUpload || '');

            // Append existing file path if any
            formData.append("hearings[" + index + "].ExistingFile", hearing.HearingFilePath  || '');

            // Attach file if selected
            var fileInput = document.getElementById('txtHearingFilePath' + index);
            if (fileInput && fileInput.files.length > 0)
            {
                formData.append("hearings[" + index + "].HearingFilePath", fileInput.files[0]);
            }
        });

        $.ajax({
            url: "../RetailSection/IUDLitigationMasterStage3",
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (response) {
                var innerResult = JSON.parse(response.Result); // Deserialize result from controller
                $scope.$apply(function () {
                    $scope.switchTab(null, 'Stage 4', 'tab4');
                    $scope.GetLitigationMaster(1, 10, '')
                });
                showMsgBox('2'); // Show success
            },
            error: function (xhr, status, error) {
                alert('Error: ' + error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    };

    $scope.SaveStage4 = function () {
        debugger;
        $scope.CaseCode = $('#txtCaseCode').val();
        if ($('#txtJudgmentPassed').val() == '') {
            $('#txtJudgmentPassed').addClass('red-validation');
            return;
        } else {
            $('#txtJudgmentPassed').removeClass('red-validation');

        }

        if ($('#txtJudiciaryName').val() == '') {
            $('#txtJudiciaryName').addClass('red-validation');
            return;
        } else {
            $('#txtJudiciaryName').removeClass('red-validation');

        }
        
        
        $('#loader').show();
        var fileInput4 = document.getElementById('txtJudgmentCopyPath'); 
        var formData = new FormData();

        // Add plain form values
        formData.append("CreatedBy", LoginId);
        formData.append("CaseCode", $scope.CaseCode);
        formData.append("JudgmentPassed", $('#txtJudgmentPassed').val());
        formData.append("SummaryOfJudgment", $('#txtSummaryOfJudgment').val());
        formData.append("JudiciaryName", $('#txtJudiciaryName').val());
        formData.append("JudgmentTime", $('#txtJudgmentTime').val());
        formData.append("ExecutionStatus", $scope.ExecutionStatus);
        formData.append("CondonationFiled", $scope.CondonationFiled);
        formData.append("CondonationStatus", $scope.CondonationStatus);
         

        formData.append("Action", 4);
        // Add file if selected
        if (fileInput4.files.length > 0) {
            formData.append("JudgmentCopyPath", fileInput4.files[0]);
        }
        formData.append("judgementexistfile", $scope.JudgmentCopyPath);
        
        $.ajax({
            url: "../RetailSection/IUDLitigationMaster4",
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (response) {
                var innerResult = JSON.parse(response.Result); // converts string to object 
                var parts = innerResult.Result
                $scope.$apply(function () {
                    $scope.switchTab(null, 'Stage 5', 'tab5');
                    $scope.GetLitigationMaster(1, 10, '')
                });
                showMsgBox(innerResult.Result);

            },
            error: function (xhr, status, error) {
                alert('Error: ' + error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }
    $scope.SaveStage5 = function () {
        debugger;
        $scope.CaseCode = $('#txtCaseCode').val();
        if ($scope.Appealby == '') {
            $('#txtAppealby').addClass('red-validation');
            return;
        } else {
            $('#txtAppealby').removeClass('red-validation');

        }

        if ($scope.AppealStatus == '') {
            $('#txtAppealStatus').addClass('red-validation');
            return;
        } else {
            $('#txtAppealStatus').removeClass('red-validation'); 
        }

       


        $('#loader').show();
        var fileInput4 = document.getElementById('txtJudgmentCopyPath');
        var formData = new FormData();

        // Add plain form values
        formData.append("CreatedBy", LoginId);
        formData.append("CaseCode", $scope.CaseCode); 
        formData.append("AppealStatus", $scope.AppealStatus);
        formData.append("Appealby", $scope.Appealby);
     
        formData.append("Action", 5);
        
        $.ajax({
            url: "../RetailSection/IUDLitigationMaster5",
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function (response) {
                var innerResult = JSON.parse(response.Result); // converts string to object 
                var parts = innerResult.Result
                $scope.$apply(function () {
                    $scope.IsOpen = false;
                    $scope.GetLitigationMaster(1, 10, '')
                });
                showMsgBox(innerResult.Result);

            },
            error: function (xhr, status, error) {
                alert('Error: ' + error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }


    $scope.emailInvalids = {}; // Object to track invalid fields

    $scope.checkEmail = function (fieldKey) {
        var email = $scope[fieldKey]; // Gets the value of ng-model by key
        var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        $scope.emailInvalids[fieldKey] = !(email && pattern.test(email));
    };

}