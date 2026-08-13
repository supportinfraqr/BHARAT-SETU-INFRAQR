app.LocationMasterController = function ($scope, $element, $filter, myService, $http) {
    $scope.ButtonName = 'Create Location';
    $scope.ButtonReset = true;
    $scope.isDisabled = true;
    $scope.Id = 0;
    $scope._TId = 0;
    $scope.PartyTypeId = '';
    $scope.RefStoreCode = '';
    $scope.StoreCode = '';
    $scope.Category = '';
    $scope._StoreId = '';
    $scope._LicenseId = 0;
    $scope.StoreName = '';
    $scope.CompleteAddress = '';
    $scope.ProposedDate = new Date();
    $scope.StoreLocation = '';
    $scope.CityId = "";
    $scope.CircleId = "";
    $scope.RegionId = "";
    $scope.ZipCode = '';
    $scope.StoreManagerName = '';
    $scope.StoreManagerMobileNo = '';
    $scope.StoreManagerEmail = '';
    $scope.AreaManagerName = '';
    $scope.AreaManagerMobileNo = '';
    $scope.AreaManagerEmail = '';
    $scope.ZonalManagerName = '';
    $scope.ZonalManagerMobileNo = '';
    $scope.ZonalManagerEmail = '';
    $scope.CircleHeadName = '';
    $scope.CircleHeadMobileNo = '';
    $scope.CircleHeadEmail = '';
    $scope.RegionalHeadName = '';
    $scope.RegionalHeadMobileNo = '';
    $scope.RegionalHeadEmail = '';
    $scope.CorporateHeadName = '';
    $scope.CorporateHeadMobileNo = '';
    $scope.CorporateHeadEmail = '';
    $scope.SQFTStoreArea = '';
    $scope.DaysOfExpire = '';
    $scope.LED = '';
    $scope.Operationmodel = '';
    $scope.ComplianceCategory = '';
    $scope.IsActive = '';
    $scope.ElectricityBill = '';
    $scope.RentAgreement = '';
    $scope.PropertyTaxPaidReceipt = '';
    $scope.BuildingPlan = '';
    $scope.StabilityStructureCertificate = '';
    $scope.CompletionCertificate = '';
    $scope.DName = "";
    $scope.DFatherName = "";
    $scope.DAddress = "";
    $scope.DAadhaarNo = "";
    $scope.DPanNo = "";
    $scope.DDateOfBirth = "";
    $scope.DEmailId = "";
    $scope.DMobileNo = "";
    $scope.AName = "";
    $scope.AFatherName = "";
    $scope.AAddress = "";
    $scope.AAadhaarNo = "";
    $scope.APanNo = "";
    $scope.ADateOfBirth = "";
    $scope.AEmailId = "";
    $scope.AMobileNo = "";

    $scope.NatureofBusiness = "";
    $scope.DateofCommencement = "";
    $scope.ProductCategory = "";
    $scope.AadhaarRegisteredofficeAddressNo = "";


    $scope.AadhaarCardofDirector = "";
    $scope.PANCardofDirector = "";
    $scope.PassportSizePhoto1 = "";
    $scope.AuthorizationLetter = "";
    $scope.AadhaarCardofAuthorized = "";
    $scope.PANCard = "";
    $scope.PassportSizePhoto2 = "";
    $scope.ElectricityBill = "";
    $scope.SaledeedRentAgreement = "";
    $scope.FSMSPlan = "";
    $scope.FormIX = "";
    $scope.WaterTestReport = "";



    $scope.StoreMasterGrid = true;
    $scope.StoreMasterForm = false;
    $scope.StoreUploadDocs = true;
    $scope.StoreList = [];
    $scope.StoreListForEdit = [];
    $scope.CityList = [];
    $scope.CircleList = [];
    $scope.RegionList = [];
    $scope._RequiredDocuemntList = [];

    $scope.IsActionType = 0;
    $scope.EditId = 0;

    $scope.Elec = 'none';
    $scope.Electr = 'none';
    $scope.Rent = 'none';
    $scope.RentA = 'none';

    $scope.Property = 'none';
    $scope.Propertyt = 'none';
    $scope.Building = 'none';
    $scope.BuildingP = 'none';
    $scope.Stability = 'none';
    $scope.StabilityS = 'none';
    $scope.Completion = 'none';
    $scope.CompletionC = 'none';
    $scope.ElectricityBill = "none";
    $scope.RentAgreement = "none";
    $scope.PropertyTaxPaidReceipt = "none";
    $scope.BuildingPlan = "none";
    $scope.StabilityStructureCertificate = "none";
    $scope.CompletionCertificate = "none";
    $scope.ElectricityBillPeriodUpTo = "";//new Date();
    $scope.LeasePaidReceiptPeriodUpTo = "";//new Date();
    $scope.PropertyTaxPeriodUpTo = "";//new Date();
    $scope.FireNocPeriodUpTo = "";//new Date();
    $scope.PollutionPeriodUpTo = "";//new Date();
    $scope.OwnershipDocPeriodUpTo = "";//new Date();
    $scope.AdditionalDocPeriodUpTo = "";//new Date();
    $scope.LeaseFromDate = "";//new Date();
    $scope.ElectricityBillRemark = "";
    $scope.LeasePaidReceiptRemark = "";
    $scope.PropertyTaxRemark = "";
    $scope.FireNocRemark = "";
    $scope.PollutionRemark = "";
    $scope.OwnershipDocRemark = "";
    $scope.AdditionalDocRemark = "";



    $scope.StoreList = $scope.StoreList.filter(
        (v, i, a) => a.findIndex(t => t.StoreId === v.StoreId) === i
    );

    $scope.onComplianceChange = function (EDITCHK) {
        $scope.Category = "";

        if (EDITCHK == '1') {
            $scope.CategoryList = [
                { ID: 1, Name: 'Retail Outlet' },
                { ID: 2, Name: 'Warehouse' },
                { ID: 3, Name: 'Factory' },
                { ID: 4, Name: 'State Kitchen' },
                { ID: 5, Name: 'Central Kitchen' }
            ];
            return; // ✅ yahin se function exit
        }

        switch ($scope.ComplianceCategory) {

            case "Factory":
                $scope.CategoryList = [
                    { ID: 5, Name: 'Central Kitchen' }
                ];
                break;

            case "Establishment":
                $scope.CategoryList = [
                    { ID: 1, Name: 'Retail Outlet' },
                    { ID: 4, Name: 'State Kitchen' },
                    { ID: 2, Name: 'Warehouse' }
                ];
                break;

            case "Contractor":
                $scope.CategoryList = [
                    { ID: 3, Name: 'Factory' },
                    { ID: 2, Name: 'Warehouse' }
                ]; break;
            case "":
               

               
                break;

            default:
                $scope.CategoryList = [];
                break;
        }
    };
    // Controller me
    $scope.openRequestModal = function (Noid, NoUserId, NoStoreCode) {
        var modalEl = document.getElementById('lmRequestModal');

        $scope.requestModal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });
        $scope.Noid = Noid;
            $scope.NoUserId = NoUserId;
        $scope.NoStoreCode = NoStoreCode;
        $scope.requestModal.show();
    };



    $scope.reset = function () {
        $scope.ButtonName = 'Create Location';
        $scope.ButtonReset = true;
        $scope.isDisabled = true;
        $scope.Id = 0;
        $scope._TId = 0;
        $scope.PartyTypeId = '';
        $scope.RefStoreCode = '';
        $scope.StoreCode = '';
        $scope.Category = '';
        $scope._StoreId = '';
        $scope._LicenseId = 0;
        $scope.StoreName = '';
        $scope.CompleteAddress = '';
        $scope.ProposedDate = new Date();
        $scope.StoreLocation = '';
        $scope.CityId = "";
        $scope.CircleId = "";
        $scope.RegionId = "";
        $scope.ZipCode = '';
        $scope.StoreManagerName = '';
        $scope.StoreManagerMobileNo = '';
        $scope.StoreManagerEmail = '';
        $scope.AreaManagerName = '';
        $scope.AreaManagerMobileNo = '';
        $scope.AreaManagerEmail = '';
        $scope.ZonalManagerName = '';
        $scope.ZonalManagerMobileNo = '';
        $scope.ZonalManagerEmail = '';
        $scope.CircleHeadName = '';
        $scope.CircleHeadMobileNo = '';
        $scope.CircleHeadEmail = '';
        $scope.RegionalHeadName = '';
        $scope.RegionalHeadMobileNo = '';
        $scope.RegionalHeadEmail = '';
        $scope.CorporateHeadName = '';
        $scope.CorporateHeadMobileNo = '';
        $scope.CorporateHeadEmail = '';
        $scope.SQFTStoreArea = '';
        $scope.DaysOfExpire = '';
        $scope.LED = '';
        $scope.Operationmodel = '';
        $scope.ComplianceCategory = '';
        $scope.IsActive = '';
        $scope.ElectricityBill = '';
        $scope.RentAgreement = '';
        $scope.PropertyTaxPaidReceipt = '';
        $scope.BuildingPlan = '';
        $scope.StabilityStructureCertificate = '';
        $scope.CompletionCertificate = '';
        $scope.DName = "";
        $scope.DFatherName = "";
        $scope.DAddress = "";
        $scope.DAadhaarNo = "";
        $scope.DPanNo = "";
        $scope.DDateOfBirth = "";
        $scope.DEmailId = "";
        $scope.DMobileNo = "";
        $scope.AName = "";
        $scope.AFatherName = "";
        $scope.AAddress = "";
        $scope.AAadhaarNo = "";
        $scope.APanNo = "";
        $scope.ADateOfBirth = "";
        $scope.AEmailId = "";
        $scope.AMobileNo = "";

        $scope.NatureofBusiness = "";
        $scope.DateofCommencement = "";
        $scope.ProductCategory = "";
        $scope.AadhaarRegisteredofficeAddressNo = "";


        $scope.AadhaarCardofDirector = "";
        $scope.PANCardofDirector = "";
        $scope.PassportSizePhoto1 = "";
        $scope.AuthorizationLetter = "";
        $scope.AadhaarCardofAuthorized = "";
        $scope.PANCard = "";
        $scope.PassportSizePhoto2 = "";
        $scope.ElectricityBill = "";
        $scope.SaledeedRentAgreement = "";
        $scope.FSMSPlan = "";
        $scope.FormIX = "";
        $scope.WaterTestReport = "";



        $scope.Elec = 'none';
        $scope.Electr = 'none';
        $scope.Rent = 'none';
        $scope.RentA = 'none';

        $scope.Property = 'none';
        $scope.Propertyt = 'none';
        $scope.Building = 'none';
        $scope.BuildingP = 'none';
        $scope.Stability = 'none';
        $scope.StabilityS = 'none';
        $scope.Completion = 'none';
        $scope.CompletionC = 'none';
        $scope.ElectricityBill = "none";
        $scope.RentAgreement = "none";
        $scope.PropertyTaxPaidReceipt = "none";
        $scope.BuildingPlan = "none";
        $scope.StabilityStructureCertificate = "none";
        $scope.CompletionCertificate = "none";
        $scope.ElectricityBillPeriodUpTo = "";//new Date();
        $scope.LeasePaidReceiptPeriodUpTo = "";//new Date();
        $scope.PropertyTaxPeriodUpTo = "";//new Date();
        $scope.FireNocPeriodUpTo = "";//new Date();
        $scope.PollutionPeriodUpTo = "";//new Date();
        $scope.OwnershipDocPeriodUpTo = "";//new Date();
        $scope.AdditionalDocPeriodUpTo = "";//new Date();
        $scope.LeaseFromDate = "";//new Date();
        $scope.ElectricityBillRemark = "";
        $scope.LeasePaidReceiptRemark = "";
        $scope.PropertyTaxRemark = "";
        $scope.FireNocRemark = "";
        $scope.PollutionRemark = "";
        $scope.OwnershipDocRemark = "";
        $scope.AdditionalDocRemark = "";
    }



    // Page load pe function call
    $scope.init = function () {
        $scope.LicenseD = "License";
        $scope.LabourD = "Labour";
        $scope.FactoryD = "Factory";
        $scope.FinanceD = "Finance";
        $scope.SecraterialD = "Secretarial";
    };

    // init ko call karte hi values set ho jayengi
    $scope.init();



    $scope.toggleApplicable = function (licenseMaster) {
        if (licenseMaster.IsChecked) {
            // Call your same function when checkbox checked
            $scope.IsApplicable(licenseMaster.LicenseId);
            $scope.logmaintainwithstore('IsApplicable ' + licenseMaster.LicenseName);

            // Disable after one check
            licenseMaster.IsApproved = true;
        }
    };





    $scope.ChangeStatus = function (IsActive, StoreCode) {
        if (IsActive == 1) {
            IsActive = 0;
        }
        else {
            IsActive = 1;
        }
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.IsActive = IsActive;
        collectionobj.StoreCode = StoreCode;
        var getData = myService.methode('POST', ("../RetailSection/UpdateStatus"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            window.top.location.href = '../RetailSection/StoreMaster?StoreMaster';
        });
        $scope.hideLoader();
    }

    $scope.isChecked = false;
    $scope.selectedStores = [];
    $scope.toggleSelectAll = function () {
        if ($scope.isChecked) {
            // If checkbox is checked, select all parties
            $scope.selectedStores = $scope.StoreList.map(function (store) {
                return store.StoreId.toString();
            });
        } else {
            // If checkbox is unchecked, clear all selections
            $scope.selectedStores = [];
        }

    };

    $scope.saveStoresStatus = function () {
        if ($scope.selectedStores.length > 0 && $scope.IsActive != '') {
            var collectionobj = {};
            collectionobj.selectedStores = $scope.selectedStores;
            collectionobj.IsActive = $scope.IsActive;
            var a = JSON.stringify(collectionobj);
            var getData = myService.methode('POST', ("../RetailSection/UpdateStoresStatus"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.closeModal();
                var MSG = JSON.parse(response.data.Result);
                showMsgBox('999', 'Alert', MSG.message, 'warning', 'btn-warning');
                $scope.ManageLog('Update Store Bulk Status' + $scope.selectedStores);
                $scope.GetStoreMaster(1, 10);
                /*  window.top.location.href = '../RetailSection/StoreMaster?StoreMaster';*/
            });
        }
    }
    $scope.closeModal = function () {
        document.getElementById('closeId').click(); // Simulate a click on the close button
    }
    $scope.onCross = function () {
        $scope.selectedStores = [];
        $scope.IsActive = '';
        $scope.isChecked = false

    }

    $scope.AllCountry = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 27, "PartyId": "1" });
        getData.then(function (response) {
            debugger;
            $scope.AllCountryList = response.data.Result;
            $scope.Country = '1';
            $scope.Isopenstate = true;
           
        });
    }

    $scope.AllState = function () {
        $scope.State = '';
        $scope.CityId = '';
        if ($scope.Country == '' || $scope.Country == undefined) {
            $scope.Country = 1;
        }
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": $scope.Country});
        getData.then(function (response)
        {
            if (response.data.Result.length > 0)
            {
                $scope.Isopenstate = true;
                $scope.AllStateList = response.data.Result;
              
            }
            else { $scope.Isopenstate = false;}
            debugger;
          
        });
    }
    $scope.AllCity = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 29, "PartyId": $scope.State });
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data.Result;
        });
    }


    $scope.ShowLicenseDetail = function (LicenseName, LicenseId, StoreCode) {

        $scope.LicenseName = LicenseName;
        var collectionobj = {};
        collectionobj.ActionType = 12;
        collectionobj.Id = LicenseId;
        collectionobj.StoreCode = StoreCode;
        var getData = myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.Result.length > 0) {
                $scope.Act = response.data.Result[0].Act;
                $scope.ApplicationLink = response.data.Result[0].ApplicationLink;
                $scope.State = response.data.Result[0].STATE_NM;
                $('#dvDetail').html(response.data.Result[0].Detail);
            }
            else {
                $scope.Act = '';
                $scope.ApplicationLink = '';
                $scope.State = '';
                $('#dvDetail').html('');
            }


        });
    }

    $scope.selectedColumns = [
        "SrNo",
        "StoreCode", "RefStoreCode", "StoreName", "CompleteAddress", 
        "RegionName", "ZipCode", "StoreManagerName",
        "StoreManagerMobileNo", "StoreManagerEmail", "AreaManagerName", "AreaManagerMobileNo",
        "AreaManagerEmail", "ZonalManagerName", "ZonalManagerMobileNo", "ZonalManagerEmail",
        "CircleHeadName", "CircleHeadMobileNo", "CircleHeadEmail", "RegionalHeadName",
        "RegionalHeadMobileNo", "RegionalHeadEmail", "CorporateHeadName", "CorporateHeadMobileNo",
        "CorporateHeadEmail", "SQFTStoreArea", "Status", "DaysOfExpire",
        "LED", "CITY_NAME",  "STATE_NM", "CategoryName", "ComplianceCategory", "Operationmodel"
    ];
    $scope.columnHeaderMap = {
        "SrNo": "Sr No",
        "StoreCode": "Location Code",
        "RefStoreCode": "Ref.LocationCode",
        "StoreName": "Unit Name",
        "CompleteAddress": "Complete Address",
        "RegionName": "Region",
        "ZipCode": "Zip Code",
        "StoreManagerName": "Location Manager Name",
        "StoreManagerMobileNo": "Location Manager Mobile",
        "StoreManagerEmail": "Location Manager Email",
        "AreaManagerName": "Area Manager Name",
        "AreaManagerMobileNo": "Area Manager Mobile",
        "AreaManagerEmail": "Area Manager Email",
        "ZonalManagerName": "Zonal Manager Name",
        "ZonalManagerMobileNo": "Zonal Manager Mobile",
        "ZonalManagerEmail": "Zonal Manager Email",
        "CircleHeadName": "Circle Head Name",
        "CircleHeadMobileNo": "Circle Head Mobile",
        "CircleHeadEmail": "Circle Head Email",
        "RegionalHeadName": "Regional Head Name",
        "RegionalHeadMobileNo": "Regional Head Mobile",
        "RegionalHeadEmail": "Regional Head Email",
        "CorporateHeadName": "Corporate Head Name",
        "CorporateHeadMobileNo": "Corporate Head Mobile",
        "CorporateHeadEmail": "Corporate Head Email",
        "SQFTStoreArea": "Location Area (Sq Ft)",
        "Status": "Status",
        "DaysOfExpire": "Notify(before day",
        "LED": "Reminder(Alert day)",
        "CITY_NAME": "City",
        "STATE_NM": "State",
        "CategoryName": "Category",
        "ComplianceCategory": "Compliance Category",
        "Operationmodel": "Operationmodel"
    };

    $scope.selectedColumnspdf = [
        "SrNo", "StoreCode", "RefStoreCode", "StoreName", "CategoryName", 
        "CITY_NAME", "RegionName", "STATE_NM"
    ];

    $scope.ExportToExcel = function (dataToExport) {

        var filteredData = dataToExport.map(function (row) {
            var filteredRow = {};
            $scope.selectedColumns.forEach(function (column) {
             /*   if (row.hasOwnProperty(column)) {*/
                    var headerName = $scope.columnHeaderMap[column] || column;
                filteredRow[headerName] = row[column];  // Add only the selected columns to the row
             /*   }*/
            });
            return filteredRow;
        });
        var ws = XLSX.utils.json_to_sheet(filteredData);  // Convert data to sheet
        var wb = XLSX.utils.book_new();  // Create a new workbook
        XLSX.utils.book_append_sheet(wb, ws, "Location List Report");  // Append sheet to workbook
        XLSX.writeFile(wb, 'LocationList.xlsx');  // Write to file
    };

    $scope.PrintData = function (dataToPrint) {
        // Filter the data to only include the selected columns
        var filteredData = dataToPrint.map(function (row) {
            var filteredRow = {};
            $scope.selectedColumns.forEach(function (column) {
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
        $scope.selectedColumns.forEach(function (column) {
            tableHtml += "<th style='background-color: #f2f2f2; padding: 8px; text-align: center;'>" + column + "</th>";
        });
        tableHtml += "</tr></thead>";

        // Create the table rows
        tableHtml += "<tbody>";
        filteredData.forEach(function (row) {
            tableHtml += "<tr>";
            $scope.selectedColumns.forEach(function (column) {
                var cellData = row[column] !== undefined && row[column] !== null ? row[column] : "";  // Handle null or undefined data
                tableHtml += "<td style='padding: 8px; text-align: center;'>" + cellData + "</td>";
            });
            tableHtml += "</tr>";
        });
        tableHtml += "</tbody></table>";

        // Open a new window and write the table HTML to it
        var printWindow = window.open('', '', 'width=800, height=600');
        printWindow.document.write('<html><head><title>Location Report</title>');
        printWindow.document.write('<style>body { font-family: Arial, sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { padding: 8px; text-align: center; } th { background-color: #f2f2f2; } </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2 style="text-align: center;">Location Report</h2>');  // Title centered
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
        const title = "Location Report";
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
        doc.save('LocationList.pdf');
    };


    $scope.Getpdf = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: $('#myInput').val()  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj))
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
    $scope.PrintStoreList = function () {
        $scope.showLoader();  // Loader show karen data fetch hone tak

        var requestObj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,      // Saare records fetch karne ke liye
            PageSize: 999999,   // Bada number, taaki saare records mil jaye
       
        };

        myService.methode('POST', "../RetailSection/GetStoreMaster", JSON.stringify(requestObj))
            .then(function (response) {
                if (response.data && response.data.Result && response.data.Result.length > 0) {
                    var storeList = response.data.Result;

                    // HTML table build karen print ke liye
                    var printContents = '<table border="1" style="width:100%; border-collapse: collapse;">';
                    printContents += '<thead>';

                    printContents += '<tr>';
                    printContents += '<th colspan="7" style="text-align:center;font-size:16px">' + $scope.MapUser + '</th>';  // AngularJS variable
                    printContents += '</tr>';
                    printContents += '<tr>';
                    printContents += '<th>Sr.No.</th>';
                    printContents += '<th>Unit Name</th>';
                    printContents += '<th>Location Code</th>';
                    printContents += '<th>Ref Location Code</th>';
                    printContents += '<th>State</th>';
                    printContents += '<th>City</th>';
                    printContents += '<th>Region</th>';
                    // Aap aur columns add kar sakte ho
                    printContents += '</tr>';
                    printContents += '</thead>';
                    printContents += '<tbody>';

                    storeList.forEach(function (store, index) {
                        printContents += '<tr>';
                        printContents += '<td>' + (index + 1) + '</td>';
                        printContents += '<td>' + store.StoreName + '</td>';
                        printContents += '<td>' + store.StoreCode + '</td>';
                        printContents += '<td>' + store.RefStoreCode + '</td>';
                        printContents += '<td>' + store.STATE_NM + '</td>';
                        printContents += '<td>' + store.CITY_NAME + '</td>';
                        printContents += '<td>' + store.RegionName + '</td>';
                        printContents += '</tr>';
                    });

                    printContents += '</tbody></table>';

                    // Print popup
                    var printWindow = window.open('', '', 'height=600,width=800');
                    printWindow.document.write('<html><head><title>Store List</title>');
                    printWindow.document.write('<style>table {font-family: Arial, sans-serif; font-size: 12px;} th, td {padding: 5px; text-align: left;}</style>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(printContents);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.print();
                } else {
                    alert("No data found to print.");
                }
            })
            .finally(function () {
                $scope.hideLoader();  // Loader hide karen
            });
    };


    $scope.GETSTORE = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: ''  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.StoreListU = response.data.Result; // Store data for export 
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };

    $scope.GetPrint = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: $('#myInput').val()  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj))
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
    $scope.GetExcel = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: $('#myInput').val()  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj))
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


    $scope.currentPage = 1;
    $scope.pageSize = 10;

    // NEXT
    $("#lmNext").off("click").on("click", function () {
        $scope.currentPage++;
        $scope.GetStoreMaster($scope.currentPage, $scope.pageSize);
    });

    // PREVIOUS
    $("#lmPrev").off("click").on("click", function () {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.GetStoreMaster($scope.currentPage, $scope.pageSize);
        }
    });
    $scope.getMonthYear = function (dateStr) {
        if (!dateStr) return {};

        let d = new Date(dateStr);  // JS will auto-read 27-Nov-2025

        let months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        return {
            monthName: months[d.getMonth()],
            monthList: months,
            year: d.getFullYear(),
            yearList: [d.getFullYear(), d.getFullYear() - 1, d.getFullYear() - 2]
        };
    };


    $scope.SelectedMonth = "Month";
    $scope.MonthList = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];


    $scope.nullToBlank = function (obj) {
        if (obj === null || obj === "null" || obj === undefined) return '';

        if (angular.isArray(obj)) {
            angular.forEach(obj, function (item, index) {
                obj[index] = $scope.nullToBlank(item);
            });
            return obj;
        }

        if (angular.isObject(obj)) {
            angular.forEach(obj, function (value, key) {
                if (value === null || value === "null"  || value === undefined) {
                    obj[key] = '';
                } else if (angular.isObject(value)) {
                    obj[key] = $scope.nullToBlank(value);
                }
            });
            return obj;
        }

        return obj;
    };

    $scope.FilterByMonth = function (m) {
        $scope.SelectedMonth = m;

        $scope.FilteredStoreList = $scope.StoreList.filter(function (x) {
            let d = new Date(x.ProposedDate);
            let mn = d.toLocaleString('en-us', { month: 'long' });
            return mn === m;
        });
    };
    $('#viewAllRows').text("view all rows");
    $scope.GetStoreMaster = function (pageNumber, pageSize) {
      
        $scope.PageNumber = pageNumber;
      
        if ($('#viewAllRows').text().trim().toLowerCase() === "view all rows") {
            pageSize = pageSize;
        }
        else {
            pageSize = 9999;
        }
        $scope.showLoader();

        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: pageNumber,
            PageSize: pageSize,
            Searchby: $('#lmSearch').val()
        };

        myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj))
            .then(function (response) {

                // 🔥 DATA SET
                let data = response.data.Result || [];
                data= $scope.nullToBlank(data);
                let total = response.data.TotalRecords || data.length;

                // 🔥 SAFE APPLY (WORKS ALWAYS)
                $scope.$evalAsync(function () {
                    $scope.StoreList = data;
                    $scope.TotalRecords = total; 
                    $scope.$applyAsync();

                    document.getElementById("lmPageInfo").innerText =
                        "Showing " + data.length + " rows | Page " + $scope.PageNumber;
                    $scope.GetAllStoreMaster();
                });

            })
            .finally(function () {
                $scope.hideLoader();
            });
    };
    $scope.settextbox = function (m) {
        $('#lmSearch').val(m);
        $scope.GetStoreMaster(1,9999)
    }
    $scope.GetAllStoreMaster = function (search) {

        $scope.FilteredStoreList = '';
        $scope.StoreAllList = '';
        $scope.showLoader();

        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,
            PageSize: 999999,
            Searchby: search
        };

        myService.methode('POST', "../RetailSection/GetStoreMaster", JSON.stringify(collectionobj))
            .then(function (response) {

                let data = response.data.Result || [];

                $scope.$evalAsync(function () {

                    $scope.StoreAllList = data;

                    /* ===============================
                       🔹 SETS FOR UNIQUE VALUES
                    =============================== */

                    let storeSet = new Set();
                    let regionSet = new Set();
                    let stateSet = new Set();
                    let citySet = new Set();

                    let monthSet = new Set();
                    let yearSet = new Set();

                    angular.forEach($scope.StoreAllList, function (item) {

                        // Store Name
                        if (item.StoreName)
                            storeSet.add(item.StoreName);

                        // Region
                        if (item.RegionName)
                            regionSet.add(item.RegionName);

                        // State
                        if (item.STATE_NM)
                            stateSet.add(item.STATE_NM);

                        // City
                        if (item.CITY_NAME)
                            citySet.add(item.CITY_NAME);

                        // Proposed Date → Month / Year
                        if (item.ProposedDate) {
                            let d = new Date(item.ProposedDate);
                            if (!isNaN(d)) {
                                monthSet.add(d.toLocaleString('en-US', { month: 'long' }));
                                yearSet.add(d.getFullYear());
                            }
                        }
                    });

                 

                    $scope.StoreNameList = Array.from(storeSet).sort();
                    $scope.RegionNameList = Array.from(regionSet).sort();
                    $scope.StateNameList = Array.from(stateSet).sort();
                    $scope.CityNameList = Array.from(citySet).sort();

                    $scope.MonthList = Array.from(monthSet).sort();
                    $scope.YearList = Array.from(yearSet).sort((a, b) => b - a);

                });

            })
            .finally(function () {
                $scope.hideLoader();
            });
    };

     
    $scope.ShowDivStoreMasterGrid = function ()
    {
        if ($scope.LeftStore <= 0 && $scope.ButtonName == 'Create Location')
        {
            showMsgBox('999', 'Alert', 'Store Limit exceed:' + $scope.LeftStore + ', contact to admin', 'warning', 'btn-warning'); return;
        }
        if ($scope.State =='') {
            showMsgBox('999', 'Alert', 'State is required.', 'warning', 'btn-warning'); return;
        }
        if ($scope.CityId == '') {
            showMsgBox('999', 'Alert', 'City is required.', 'warning', 'btn-warning'); return;
        }
        else {
            $scope.SaveStore();
        }
       
    };
    $scope.SaveStore = function () {

        $scope.PartyTypeId = 4;
        if (isValidate()) {
            var _isFileValid = true;
            if ($scope.EditId == 0) {
                _isFileValid = IsFileValidation();
            }
            if (_isFileValid) {
                var formData = new FormData();
                formData.append("ActionType", $scope.IsActionType);
                formData.append("Id", $scope.EditId);
                formData.append("PartyTypeId", $scope.PartyTypeId);
                formData.append("StoreCode", $scope.StoreCode);
                formData.append("RefStoreCode", $scope.RefStoreCode);
                formData.append("Category", $scope.Category);
                formData.append("Operationmodel", $scope.Operationmodel);
                formData.append("ComplianceCategory", $scope.ComplianceCategory);



                formData.append("StoreName", $scope.StoreName);
                formData.append("CompleteAddress", $scope.CompleteAddress);
                formData.append("ProposedDate", $scope.StartDate.toISOString());
                formData.append("StoreLocation", $scope.StoreLocation);
                formData.append("CityId", $scope.CityId);
                formData.append("Country", $scope.Country);
                if ($scope.CircleId == "") {
                    $scope.CircleId = 0;
                }
                if ($scope.RegionId == "") {
                    $scope.RegionId = 0;
                }
                formData.append("CircleId", $scope.CircleId);
                formData.append("RegionId", $scope.RegionId);
                formData.append("ZipCode", $scope.ZipCode);
                formData.append("StoreManagerName", $scope.StoreManagerName);
                formData.append("StoreManagerMobileNo", $scope.StoreManagerMobileNo);
                formData.append("StoreManagerEmail", $scope.StoreManagerEmail);
                formData.append("AreaManagerName", $scope.AreaManagerName);
                formData.append("AreaManagerMobileNo", $scope.AreaManagerMobileNo);
                formData.append("AreaManagerEmail", $scope.AreaManagerEmail);
                formData.append("ZonalManagerName", $scope.ZonalManagerName);
                formData.append("ZonalManagerMobileNo", $scope.ZonalManagerMobileNo);
                formData.append("ZonalManagerEmail", $scope.ZonalManagerEmail);
                formData.append("CircleHeadName", $scope.CircleHeadName);
                formData.append("CircleHeadMobileNo", $scope.CircleHeadMobileNo);
                formData.append("CircleHeadEmail", $scope.CircleHeadEmail);
                formData.append("RegionalHeadName", $scope.RegionalHeadName);
                formData.append("RegionalHeadMobileNo", $scope.RegionalHeadMobileNo);
                formData.append("RegionalHeadEmail", $scope.RegionalHeadEmail);
                formData.append("CorporateHeadName", $scope.CorporateHeadName);
                formData.append("CorporateHeadMobileNo", $scope.CorporateHeadMobileNo);
                formData.append("CorporateHeadEmail", $scope.CorporateHeadEmail);
                formData.append("SQFTStoreArea", $scope.SQFTStoreArea);
                formData.append("DaysOfExpire", $scope.DaysOfExpire);
                formData.append("LED", $scope.LED);
                formData.append("IsActive", $scope.IsActive);
                formData.append("ElectricityBill", $scope.ElectricityBill);
                formData.append("RentAgreement", $scope.RentAgreement);
                formData.append("PropertyTaxPaidReceipt", $scope.PropertyTaxPaidReceipt);
                formData.append("BuildingPlan", $scope.BuildingPlan);
                formData.append("StabilityStructureCertificate", $scope.StabilityStructureCertificate);
                formData.append("CompletionCertificate", $scope.CompletionCertificate);

                formData.append("ExecutionLevel1", $scope.ExecutionLevel1);
                formData.append("ExecutionLevel2", $scope.ExecutionLevel2);
                formData.append("ExecutionLevel3", $scope.ExecutionLevel3);
                formData.append("ExecutionLevel4", $scope.ExecutionLevel4);
                formData.append("ExecutionLevel5", $scope.ExecutionLevel5);
                formData.append("SelectDuedatefor", $scope.SelectDuedatefor);


                formData.append("LicenseD", $scope.LicenseD);
                formData.append("LicenseDaysOfExpire", $scope.LicenseDaysOfExpire);
                formData.append("LicenseED", $scope.LicenseED);


                formData.append("LabourD", $scope.LabourD);
                formData.append("LabourDaysOfExpire", $scope.LabourDaysOfExpire);
                formData.append("LabourED", $scope.LabourED);

                formData.append("FactoryD", $scope.FactoryD);
                formData.append("FactoryDaysOfExpire", $scope.FactoryDaysOfExpire);
                formData.append("FactoryED", $scope.FactoryED);

                formData.append("FinanceD", $scope.FinanceD);
                formData.append("FinanceDaysOfExpire", $scope.FinanceDaysOfExpire);
                formData.append("FinanceED", $scope.FinanceED);

                formData.append("SecraterialD", $scope.SecraterialD);
                formData.append("SecraterialDaysOfExpire", $scope.SecraterialDaysOfExpire);
                formData.append("SecraterialED", $scope.SecraterialED);

                formData.append("State", $scope.State);

                if ($scope.LeasePaidReceiptPeriodUpTo instanceof Date && !isNaN($scope.LeasePaidReceiptPeriodUpTo)) {
                    formData.append("LeasePaidReceiptPeriodUpTo", $scope.LeasePaidReceiptPeriodUpTo.toISOString());
                } else {
                    formData.append("LeasePaidReceiptPeriodUpTo", "");
                }




                if ($scope.ElectricityBillPeriodUpTo instanceof Date && !isNaN($scope.ElectricityBillPeriodUpTo)) {
                    formData.append("ElectricityBillPeriodUpTo", $scope.ElectricityBillPeriodUpTo.toISOString());
                } else {
                    formData.append("ElectricityBillPeriodUpTo", "");
                }
                 /*start*/
                if ($scope.InsurancePaidReceiptPeriodUpTo instanceof Date && !isNaN($scope.InsurancePaidReceiptPeriodUpTo)) {
                    formData.append("InsurancePaidReceiptPeriodUpTo", $scope.InsurancePaidReceiptPeriodUpTo.toISOString());
                } else {
                    formData.append("InsurancePaidReceiptPeriodUpTo", "");
                } 

                if ($scope.InsuranceFromDate instanceof Date && !isNaN($scope.InsuranceFromDate)) {
                    formData.append("InsuranceFromDate", $scope.InsuranceFromDate.toISOString());
                } else {
                    formData.append("InsuranceFromDate", "");
                }

                formData.append("InsurancePaidReceiptRemark", $scope.InsurancePaidReceiptRemark);
                /*end*/
                if ($scope.PropertyTaxPeriodUpTo instanceof Date && !isNaN($scope.PropertyTaxPeriodUpTo)) {
                    formData.append("PropertyTaxPeriodUpTo", $scope.PropertyTaxPeriodUpTo.toISOString());
                } else {
                    formData.append("PropertyTaxPeriodUpTo", "");
                }

                if ($scope.FireNocPeriodUpTo instanceof Date && !isNaN($scope.FireNocPeriodUpTo)) {
                    formData.append("FireNocPeriodUpTo", $scope.FireNocPeriodUpTo.toISOString());
                } else {
                    formData.append("FireNocPeriodUpTo", "");
                }

                if ($scope.OwnershipDocPeriodUpTo instanceof Date && !isNaN($scope.OwnershipDocPeriodUpTo)) {
                    formData.append("OwnershipDocPeriodUpTo", $scope.OwnershipDocPeriodUpTo.toISOString());
                } else {
                    formData.append("OwnershipDocPeriodUpTo", "");
                }

                if ($scope.AdditionalDocPeriodUpTo instanceof Date && !isNaN($scope.AdditionalDocPeriodUpTo)) {
                    formData.append("AdditionalDocPeriodUpTo", $scope.AdditionalDocPeriodUpTo.toISOString());
                } else {
                    formData.append("AdditionalDocPeriodUpTo", "");
                }

                if ($scope.LeaseFromDate instanceof Date && !isNaN($scope.LeaseFromDate)) {
                    formData.append("LeaseFromDate", $scope.LeaseFromDate.toISOString());
                } else {
                    formData.append("LeaseFromDate", "");
                }
                if ($scope.PollutionPeriodUpTo instanceof Date && !isNaN($scope.PollutionPeriodUpTo)) {
                    formData.append("PollutionPeriodUpTo", $scope.PollutionPeriodUpTo.toISOString());
                } else {
                    formData.append("PollutionPeriodUpTo", "");
                }

                formData.append("ElectricityBillRemark", $scope.ElectricityBillRemark);
                formData.append("LeasePaidReceiptRemark", $scope.LeasePaidReceiptRemark);
                formData.append("PropertyTaxRemark", $scope.PropertyTaxRemark);
                formData.append("FireNocRemark", $scope.FireNocRemark);
                formData.append("PollutionRemark", $scope.PollutionRemark);
                formData.append("OwnershipDocRemark", $scope.OwnershipDocRemark);
                formData.append("AdditionalDocRemark", $scope.AdditionalDocRemark);
                formData.append("LoginId", sessionStorage.getItem('LoginId'));

                $.ajax({
                    url: "../RetailSection/InsertUpdateDelStoreMaster",
                    type: 'POST',
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function (response) {
                        var data = JSON.parse(response);
                        var msg = data.Result;
                        var parts = msg.split('|');
                        var id = parts[1].trim();

                        if (id == '-2') {
                            showMsgBox('999', 'Alert', parts[0].trim(), 'warning', 'btn-warning')
                        }
                        else {
                            if (showMsgBox('999', 'Save', 'Save Successfully Store  :' + parts[0].trim(), 'success', 'btn-success')) {

                                $scope.ManageLog('Activity in Store :' + data.Result);
                                //$scope.StoreMasterGrid = true;
                                $scope.ForceCloseModal();
                                //$scope.StoreMasterForm = false;
                                $scope.GetStoreMaster(1, 10);
                                $scope.FireEmail(5, $scope.StoreManagerEmail, 0);
                                $scope.ResetStoreMasterForm();
                            }
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error("Error saving employee data: " + error);
                    }
                });
            }
        }
    };




    $scope.ShowDivStoreMasterForm = function () {

        if ($scope.LeftStore > 0) {

            $scope.StoreMasterGrid = false;
            $scope.StoreMasterForm = true;
            $scope.IsActionType = 1;
        }
        else if ($scope.ButtonName == 'Update Location') {
            $scope.StoreMasterGrid = false;
            $scope.StoreMasterForm = true;
            $scope.IsActionType = 1;
        }
        else {
            showMsgBox('999', 'Alert', 'Location Limit exceed:' + $scope.LeftStore + ', contact to admin', 'warning', 'btn-warning');
            return;
        }

    };
    $scope.BindModuleTypeList = function () {
        var moduleTypeLst = [
            { "Module_Type": "Auditor", "Id": "3" },
            { "Module_Type": "Client", "Id": "4" },
        ];
        $scope.AllModuleTypeList = moduleTypeLst;
    }
    $scope.BindMasters = function (Type, Parentid) {
        if (Type == 2) {
            var collectionobj = {};
            collectionobj.Action = 3;
            collectionobj.ParentId = Parentid;
            var getData = myService.nonasyncmethode('POST', "../RetailSection/GetMasters", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.RegionList = response.data.Result;
            });
        }
        var collectionobj = {};
        collectionobj.Action = Type;
        collectionobj.ParentId = Parentid;
        var getData = myService.nonasyncmethode('POST', "../RetailSection/GetMasters", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (Type == 1)
                $scope.CityList = response.data.Result;
            else
                $scope.CircleList = response.data.Result;
        });
    }

    $scope.getFileIconClass = function (fileModel) {
        if (fileModel == 'none') {
            return fileModel = 'fa fa-plus';;
        }
        if (fileModel == 'block') {
            return fileModel = 'fa fa-check-square';;
        }
        else {
            return fileModel ? 'fa fa-check-square' : 'fa fa-plus';
        }

    };



    $scope.SetValue = function (ID, fuCandidatePhoto) {
        Index = ID;
        $(fuCandidatePhoto).click();

    }
    $scope._RequiredDocuemntList.push({
        Srno: "",
        DocumentId: "",
        DocumentName: "",
        DisplayName: "",
        DocumentLink: ""
    });

    //$scope.AdditionalDocshow = function (input) {
    //    if (input.files && input.files[0]) {
    //        var filerdr = new FileReader();
    //        filerdr.onload = function (e) {
    //            $scope.AdditionalDoc = e.target.result;
    //            $scope.AllDoandAllDATA();
    //            $scope.$applyAsync();
    //        }
    //        filerdr.readAsDataURL(input.files[0]);
    //    }
    //    else {
    //        $scope.Image = '';
    //        $scope.$applyAsync();
    //        $(imgfileid).attr('src', '');
    //        $(imgfileid).attr('value', '');
    //    }
    //}

    $scope.AdditionalDocshow = function (input) {
        if ($scope.StoreCode != '') {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const chunkSize = 5 * 1024 * 1024; // 5MB chunk size

                if (file.size > chunkSize) {
                    showMsgBox('999', 'Error', 'File size exceeds the 5MB limit. Please select a smaller file.', 'warning', 'btn-warning');
                    return;
                }
                else if ($scope.AdditionalDocName == '') {
                    showMsgBox('999', 'Alert', 'Please enter Additional Doc Name', 'warning', 'btn-warning');
                    return;
                }
                else {
                    const totalChunks = Math.ceil(file.size / chunkSize);
                    let currentChunk = 0;
                    const start = currentChunk * chunkSize;
                    const end = Math.min(file.size, start + chunkSize);
                    const blob = file.slice(start, end);

                    const formData = new FormData();
                    formData.append('file', blob);
                    formData.append('chunkIndex', currentChunk);
                    formData.append('totalChunks', totalChunks);
                    formData.append('DocumentName', $scope.AdditionalDocName);
                    formData.append('StoreCode', $scope.StoreCode);
                    formData.append('LoginId', LoginId);
                    formData.append('ActionType', 10);

                    $http.post('../RetailSection/UpdateStatus', formData, {
                        headers: { 'Content-Type': undefined }, // Let the browser set Content-Type
                    }).then((response) => {
                        $scope.GETAdditionalDoc();
                    }).catch((error) => {
                        console.error('Error uploading chunk:', error);
                    });
                }
            };
        } else { showMsgBox('999', 'Alert', 'Location Code Not Found, please insert fist then upload again', 'warning', 'btn-warning') }
    };


    $scope.UploadDoBeforeSaveStore = function () {
        debugger;
        $scope.PartyTypeId = 4;
        if (isValidate()) {
            var _isFileValid = true;
            if ($scope.EditId == 0) {
                _isFileValid = IsFileValidation();
            }
            if (_isFileValid) {
                var formData = new FormData();
                formData.append("ActionType", $scope.IsActionType);
                formData.append("Id", $scope.EditId);
                formData.append("PartyTypeId", $scope.PartyTypeId);
                formData.append("StoreCode", $scope.StoreCode);
                formData.append("RefStoreCode", $scope.RefStoreCode);
                formData.append("StoreName", $scope.StoreName);
                formData.append("Category", $scope.Category);
                formData.append("Operationmodel", $scope.Operationmodel);
                formData.append("ComplianceCategory", $scope.ComplianceCategory);

                formData.append("CompleteAddress", $scope.CompleteAddress);
                formData.append("ProposedDate", $scope.ProposedDate.toISOString());
                formData.append("StoreLocation", $scope.StoreLocation);
                formData.append("CityId", $scope.CityId);
                if ($scope.CircleId == "") {
                    $scope.CircleId = 0;
                }
                if ($scope.RegionId == "") {
                    $scope.RegionId = 0;
                }
                formData.append("CircleId", $scope.CircleId);
                formData.append("RegionId", $scope.RegionId);
                formData.append("ZipCode", $scope.ZipCode);
                formData.append("StoreManagerName", $scope.StoreManagerName);
                formData.append("StoreManagerMobileNo", $scope.StoreManagerMobileNo);
                formData.append("StoreManagerEmail", $scope.StoreManagerEmail);
                formData.append("AreaManagerName", $scope.AreaManagerName);
                formData.append("AreaManagerMobileNo", $scope.AreaManagerMobileNo);
                formData.append("AreaManagerEmail", $scope.AreaManagerEmail);
                formData.append("ZonalManagerName", $scope.ZonalManagerName);
                formData.append("ZonalManagerMobileNo", $scope.ZonalManagerMobileNo);
                formData.append("ZonalManagerEmail", $scope.ZonalManagerEmail);
                formData.append("CircleHeadName", $scope.CircleHeadName);
                formData.append("CircleHeadMobileNo", $scope.CircleHeadMobileNo);
                formData.append("CircleHeadEmail", $scope.CircleHeadEmail);
                formData.append("RegionalHeadName", $scope.RegionalHeadName);
                formData.append("RegionalHeadMobileNo", $scope.RegionalHeadMobileNo);
                formData.append("RegionalHeadEmail", $scope.RegionalHeadEmail);
                formData.append("CorporateHeadName", $scope.CorporateHeadName);
                formData.append("CorporateHeadMobileNo", $scope.CorporateHeadMobileNo);
                formData.append("CorporateHeadEmail", $scope.CorporateHeadEmail);
                formData.append("SQFTStoreArea", $scope.SQFTStoreArea);
                formData.append("DaysOfExpire", $scope.DaysOfExpire);
                formData.append("LED", $scope.LED);
                formData.append("IsActive", $scope.IsActive);
                formData.append("ElectricityBill", $scope.ElectricityBill);
                formData.append("RentAgreement", $scope.RentAgreement);
                formData.append("PropertyTaxPaidReceipt", $scope.PropertyTaxPaidReceipt);
                formData.append("BuildingPlan", $scope.BuildingPlan);
                formData.append("StabilityStructureCertificate", $scope.StabilityStructureCertificate);
                formData.append("CompletionCertificate", $scope.CompletionCertificate);

                if ($scope.ElectricityBillPeriodUpTo instanceof Date && !isNaN($scope.ElectricityBillPeriodUpTo)) {
                    formData.append("ElectricityBillPeriodUpTo", $scope.ElectricityBillPeriodUpTo.toISOString());
                } else {
                    formData.append("ElectricityBillPeriodUpTo", "");
                }

                if ($scope.LeasePaidReceiptPeriodUpTo instanceof Date && !isNaN($scope.LeasePaidReceiptPeriodUpTo)) {
                    formData.append("LeasePaidReceiptPeriodUpTo", $scope.LeasePaidReceiptPeriodUpTo.toISOString());
                } else {
                    formData.append("LeasePaidReceiptPeriodUpTo", "");
                }

                if ($scope.PropertyTaxPeriodUpTo instanceof Date && !isNaN($scope.PropertyTaxPeriodUpTo)) {
                    formData.append("PropertyTaxPeriodUpTo", $scope.PropertyTaxPeriodUpTo.toISOString());
                } else {
                    formData.append("PropertyTaxPeriodUpTo", "");
                }

                if ($scope.FireNocPeriodUpTo instanceof Date && !isNaN($scope.FireNocPeriodUpTo)) {
                    formData.append("FireNocPeriodUpTo", $scope.FireNocPeriodUpTo.toISOString());
                } else {
                    formData.append("FireNocPeriodUpTo", "");
                }

                if ($scope.OwnershipDocPeriodUpTo instanceof Date && !isNaN($scope.OwnershipDocPeriodUpTo)) {
                    formData.append("OwnershipDocPeriodUpTo", $scope.OwnershipDocPeriodUpTo.toISOString());
                } else {
                    formData.append("OwnershipDocPeriodUpTo", "");
                }

                if ($scope.AdditionalDocPeriodUpTo instanceof Date && !isNaN($scope.AdditionalDocPeriodUpTo)) {
                    formData.append("AdditionalDocPeriodUpTo", $scope.AdditionalDocPeriodUpTo.toISOString());
                } else {
                    formData.append("AdditionalDocPeriodUpTo", "");
                }

                if ($scope.LeaseFromDate instanceof Date && !isNaN($scope.LeaseFromDate)) {
                    formData.append("LeaseFromDate", $scope.LeaseFromDate.toISOString());
                } else {
                    formData.append("LeaseFromDate", "");
                }
                if ($scope.PollutionPeriodUpTo instanceof Date && !isNaN($scope.PollutionPeriodUpTo)) {
                    formData.append("PollutionPeriodUpTo", $scope.PollutionPeriodUpTo.toISOString());
                } else {
                    formData.append("PollutionPeriodUpTo", "");
                }
                //formData.append("ElectricityBillPeriodUpTo", $scope.ElectricityBillPeriodUpTo.toISOString());
                //formData.append("LeasePaidReceiptPeriodUpTo", $scope.LeasePaidReceiptPeriodUpTo.toISOString());
                //formData.append("PropertyTaxPeriodUpTo", $scope.PropertyTaxPeriodUpTo.toISOString());
                //formData.append("FireNocPeriodUpTo", $scope.FireNocPeriodUpTo.toISOString());
                //  formData.append("PollutionPeriodUpTo", $scope.PollutionPeriodUpTo.toISOString());
                //formData.append("OwnershipDocPeriodUpTo", $scope.OwnershipDocPeriodUpTo.toISOString());
                //formData.append("AdditionalDocPeriodUpTo", $scope.AdditionalDocPeriodUpTo.toISOString());
                //    formData.append("LeaseFromDate", $scope.LeaseFromDate.toISOString());
                formData.append("ElectricityBillRemark", $scope.ElectricityBillRemark);
                formData.append("LeasePaidReceiptRemark", $scope.LeasePaidReceiptRemark);
                formData.append("PropertyTaxRemark", $scope.PropertyTaxRemark);
                formData.append("FireNocRemark", $scope.FireNocRemark);
                formData.append("PollutionRemark", $scope.PollutionRemark);
                formData.append("OwnershipDocRemark", $scope.OwnershipDocRemark);
                formData.append("AdditionalDocRemark", $scope.AdditionalDocRemark);

                formData.append("LoginId", sessionStorage.getItem('LoginId'));
                $.ajax({
                    url: "../RetailSection/InsertUpdateDelStoreMaster",
                    type: 'POST',
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function (response) {

                        var data = JSON.parse(response);
                        $scope._StoreId = data.Result;
                        $scope.StoreCode = $scope._StoreId;
                        $scope.AdditionalDocSaveFile();
                        if (showMsgBox('999', 'Alert', ' Location Code Successfully Created:' + data.Result, 'warning', 'btn-warning')) {

                            $scope.FireEmail(5, $scope.StoreManagerEmail, 0)
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error("Error saving employee data: " + error);
                    }
                });
            }
        }
    };



    
    $scope.openhisty = function (StoreId, LicenseId) {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.StoreId = StoreId;
        collectionobj.LicenseId = LicenseId
        var getData = myService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.HistoryList = response.data.Result.Table;
        });
    }

    $scope.showHistory = false;
     

    $scope.toggleHistory = function () {
        $scope.showHistory = !$scope.showHistory;
    };

    $scope.AllDoandAllDATA = function () {
        if ($scope.AdditionalDocName == '') {
            showMsgBox('999', 'Alert', 'Please Enter Additonal Doc Name', 'warning', 'btn-warning');
        }
        if ($scope.AdditionalDocPeriodUpTo == '') {
            showMsgBox('999', 'Alert', 'Please Enter Additional Doc PeriodUp To', 'warning', 'btn-warning');
        }
        else if ($scope.StoreCode == '') {
            showMsgBox('999', 'Alert', 'Oops Please Enter Mandatory Fields then Attach File Again .', 'warning', 'btn-warning');
            $scope.UploadDoBeforeSaveStore();

        }
        else {
            $scope.AdditionalDocSaveFile();
        }

    }

    $scope.AdditionalDocSaveFile = function () {
        if ($scope.StoreCode != '') {
            var collectionobj = {};
            collectionobj.AdditionalDoc = $scope.AdditionalDoc;
            collectionobj.DocumentName = $scope.AdditionalDocName;
            collectionobj.StoreCode = $scope.StoreCode;
            collectionobj.LoginId = LoginId;
            collectionobj.ActionType = 10;
            var getData = myService.methode('POST', "../RetailSection/UpdateStatus", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.GETAdditionalDoc();
                //$scope.EditStore($scope.StoreCode);
            });
        }
    }
    $scope.GETAdditionalDoc = function () {
        $scope.AdditionalDocName = "";
        var collectionobj = {};
        collectionobj.StoreCode = $scope.StoreCode;
        collectionobj.ActionType = 9;
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.AdditionalDocList = response.data.Result;
            if (response.data.Result.length > 0) {
                $scope.opendiv = 'block';
                $scope.AdditionalDocName = $scope.AdditionalDocList[0].AdditionalDocName;
                $scope.AdditionalDocPeriodUpTo = new Date($scope.AdditionalDocList[0].CreatedOn);
            }
            else { $scope.opendiv = 'none'; }
        });
    }



    $scope.SaveFile = function (base64String, DocumentId) {
        if (!base64String) {
            alert("Please select a file to upload.");
            return;
        }
        if (!base64String.startsWith("data:application/pdf")) {
            alert("Only PDF files are allowed!");
            return;
        }

        function base64ToBlob(base64, mimeType) {
            let byteCharacters = atob(base64.split(',')[1]);
            let byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            let byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        }

        let file = base64ToBlob(base64String, "application/pdf");

        var formData = new FormData();
        formData.append("file", file, "document.pdf");  // ✅ Correct Name and Filename
        formData.append("Id", DocumentId);
        formData.append("StoreId", $scope._StoreId);
        formData.append("LicenseId", $scope._LicenseId);
        formData.append("ActionType", 7);
        console.log("Uploading file...", formData);
        console.log("Uploading file...", formData.get("file"));
        $.ajax({
            url: "../RetailSection/UploadDoc",
            type: "POST",
            data: formData,
            contentType: false,  // ✅ Important
            processData: false,  // ✅ Important
            cache: false,
            success: function (response) {
                console.log("File Uploaded Successfully", response);
                $scope.SHOWDOCUMENT($scope._TId, $scope._LicenseId, 0);
            },
            error: function (error) {
                console.error("File Upload Error", error);
            }
        });
    };




    $scope.show = function (input, imgfileid) {

        const file = input.files[0];

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
        validateDocument(file, $scope._RequiredDocuemntList[Index].DisplayName, function (isValid) {
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
                        $scope.ExceptionFile('Location Master', $scope._RequiredDocuemntList[Index].DisplayName, LoginId)
                        processFile(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }
            function processFile() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope._RequiredDocuemntList[Index].DocumentLink = e.target.result;
                        $scope.SaveFile($scope._RequiredDocuemntList[Index].DocumentLink, $scope._RequiredDocuemntList[Index].DocumentId)
                        $scope.$applyAsync();
                        $(imgfileid).attr('src', e.target.result);
                        $(imgfileid).attr('value', e.target.result);
                    }
                    filerdr.readAsDataURL(input.files[0]);
                }
                else {
                    $scope.Image = '';
                    $scope.$applyAsync();
                    $(imgfileid).attr('src', '');
                    $(imgfileid).attr('value', '');
                }
            }
        });
    };



    $scope.uploadElectricityBill = function (fieldName, input) {
        debugger;

        const file = input.files[0];

        if (!file) {

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
        validateDocument(file, 'Electricity', function (isValid) {
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
                        $scope.ExceptionFile('Location Master', 'Electricity', LoginId)
                        processFile(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }
            function processFile() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope.$applyAsync();

                        var iconClass = $scope.getFileIconClass(file.name);
                        $scope.uploadedElectricityBill = file.name;
                        $scope.Elec = 'block';
                        $scope.Electr = 'block';
                    };
                    filerdr.readAsDataURL(file);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    };





    $scope.uploadBuildingPlan = function (fieldName, input) {
        debugger

        const file = input.files[0];

        if (!file) {

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

        validateDocument(file, 'Fire NOC', function (isValid) {
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
                        $scope.ExceptionFile('Location Master', 'Fire NOC', LoginId)
                        AuploadBuildingPlan(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                AuploadBuildingPlan(); // ✅ Valid file, continue normally
            }

            function AuploadBuildingPlan() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope.$applyAsync();
                        var iconClass = $scope.getFileIconClass($scope[fieldName]);
                        $scope.uploadBuildingPlans = input.files[0].name; // Use 'input' instead of 'inputElement'
                        $scope.Building = 'block';
                        $scope.BuildingP = 'block';
                        $scope.getFileIconClass('block');
                    }
                    filerdr.readAsDataURL(input.files[0]);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    };


    $scope.uploadRentAgreement = function (fieldName, input) {
        debugger;

        const file = input.files[0];

        if (!file) {

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
        validateDocument(file, 'Lease/LOI', function (isValid) {
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
                        $scope.ExceptionFile('Location Master', 'Fire NOC', LoginId)
                        processFile(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }
            function processFile() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope.$applyAsync();
                        //  var iconClass = $scope.getFileIconClass($scope[fieldName]);
                        $scope.uploadRentAgreements = input.files[0].name; // Use 'input' instead of 'inputElement'
                        $scope.Rent = 'block';
                        $scope.RentA = 'block';
                        $scope.getFileIconClass('block');

                    }
                    filerdr.readAsDataURL(input.files[0]);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    };



    $scope.uploadPropertyTaxPaidReceipt = function (fieldName, input) {
        debugger;

        const file = input.files[0];

        if (!file) {
            $scope.hideLoader();
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
        validateDocument(file, 'Property Tax Receipt', function (isValid) {
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
                        $scope.ExceptionFile('Location Master', 'Property Tax Receipt', LoginId)
                        processFile(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }
            function processFile() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope.$applyAsync();
                        var iconClass = $scope.getFileIconClass($scope[fieldName]);
                        $scope.uploadPropertyTaxPaidReceipts = input.files[0].name; // Use 'input' instead of 'inputElement'
                        $scope.Property = 'block';
                        $scope.Propertyt = 'block';
                        $scope.getFileIconClass('block');
                    }
                    filerdr.readAsDataURL(input.files[0]);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    };



    $scope.uploadStabilityStructureCertificate = function (fieldName, input) {
        debugger;

        const file = input.files[0];

        if (!file) {

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
        validateDocument(file, 'Pollution', function (isValid) {
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
                        $scope.ExceptionFile('Location Master', 'Pollution', LoginId)
                        processFile(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }
            function processFile() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope.$applyAsync();
                        var iconClass = $scope.getFileIconClass($scope[fieldName]);
                        $scope.uploadStabilityStructureCertificates = input.files[0].name; // Use 'input' instead of 'inputElement'
                        $scope.Stability = 'block';
                        $scope.StabilityS = 'block';
                        $scope.getFileIconClass('block');
                    }
                    filerdr.readAsDataURL(input.files[0]);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    }

    $scope.uploadCompletionCertificate = function (fieldName, input) {
        debugger;

        const file = input.files[0];

        if (!file) {

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
        validateDocument(file, 'Ownership Docs', function (isValid) {
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
                        $scope.ExceptionFile('Location Master', 'Ownership Docs', LoginId)
                        processFile(); // ✅ Continue processing the file
                    } else {
                        input.value = ""; // ❌ Clear file
                        return;
                    }
                });
            } else {
                processFile(); // ✅ Valid file, continue normally
            }
            function processFile() {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope.$applyAsync();
                        var iconClass = $scope.getFileIconClass($scope[fieldName]);
                        $scope.uploadCompletionCertificates = input.files[0].name; // Use 'input' instead of 'inputElement'
                        $scope.Completion = 'block';
                        $scope.CompletionC = 'block';
                        $scope.getFileIconClass('block');
                    }
                    filerdr.readAsDataURL(input.files[0]);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    }


    function IsFileValidation() {

        var modelStateIsvalid = true;
        var firstElement = null;
        $.each($('input:file'), function (index) {

            if ($(this).hasClass('filevalidate')) {
                var _length = $(this).length;
                if (_length > 0) {
                    var _fileValue = $($(this)[0]).val();
                    if (_fileValue == "" || _fileValue == null || _fileValue == undefined) {
                        var _fileUpload = $($(this)[0]).parent('.fileupld');
                        if (_fileUpload != null || _fileUpload != undefined && _fileUpload.length > 0) {
                            $(_fileUpload).addClass("red-validation");
                            modelStateIsvalid = false;
                            if (firstElement == null)
                                firstElement = $(this);
                        }
                        else {
                            $(_fileUpload).removeClass("red-validation");
                        }
                    }
                    else {
                        var _fileUpload = $($(this)[0]).parent('.fileupld');
                        if (_fileUpload != null || _fileUpload != undefined && _fileUpload.length > 0) {
                            $(_fileUpload).removeClass("red-validation");
                        }
                    }
                }
            }
            else {
                $(this).removeClass("red-validation");
            }
        });
        if (firstElement != null) {
            firstElement.focus();
        }
        return modelStateIsvalid;
    }
    
    $scope.GetLicenseMaster = function (Storeid, UserId, storeCode) {
        $scope.StoreCode = storeCode;
        $scope._StoreId = Storeid;
        $scope.selectedStoreCode = storeCode;
        $scope.showLoader();
        var collectionobj = {};
        $scope.UserId = UserId;
        collectionobj.ActionType = 1;
        collectionobj.LoginId = UserId;
        collectionobj.LicenseId = 0;
        collectionobj.StoreId = Storeid;
        var getData = myService.methode('POST', ("../RetailSection/GetLicenseMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LicenseMasterList = response.data.Result;
            angular.forEach($scope.LicenseMasterList, function (x) {
                if (x.IsAccept === true || x.IsAccept === 1) {
                    x.IsChecked = true;
                } else {
                    x.IsChecked = false;
                }
            });
            console.log($scope.LicenseMasterList);
            $scope.$applyAsync();
            var id = response.data.Result;
            var len = response.data.Result.length;
            var count = 0;
            var LDOC = 0;
            $.each(id, function (i, val) {
                if (val.Status == 1) {
                    count = count + 1;
                    LDOC = count;
                }
            });
            $scope.LDOC = LDOC / len * 100;
            $scope.LDOC = Math.trunc($scope.LDOC);
            $scope.$applyAsync();
            $scope.hideLoader();

        });
        $scope.hideLoader();
    }
    $scope.SHOWDOCUMENT = function (Id, _LicenseId, TId) {
        $scope.StoreMasterDocForm = true;
        $scope.StoreMasterGrid = false;
        $scope.StoreMasterForm = false;
        $('#requestForm').modal('hide');
        $scope._LicenseId = _LicenseId;
        $scope._TId = Id;
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Id = Id;
        collectionobj.ActionType = 4;
        collectionobj.LicenseId = _LicenseId;
        collectionobj.StoreId = $scope._StoreId;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope._RequiredDocuemntList = response.data.Result.Table1;

            $scope.hideLoader();
        });
        $scope.hideLoader();
    }

    $scope.SEEnote = function (x) {
        if (x.isChecked) {
            $scope.opendoceditmode = true
            $scope.Noteopen = false;
            $scope.opendocument = true;
            // yaha checked hone par jo action karna hai wo karo
        } else {
            $scope.opendoceditmode = false
            $scope.opendocument = false;
            $scope.Noteopen = true;
            // yaha unchecked hone par action karo
        }
        $scope.Note = x.Note;
        $scope.Doc = x.DocumentName;
        $scope.DId = x.Id;
        $scope.uploadOn = x.uploadOn;
        $scope.UserN  = x.UserName;
        $scope.Status = x.Status
    }

    $scope.PermissionForSection = function (Id) {
        if (loginType == "1") {
            $scope.Section1 = 'ok'
            $scope.Section2 = 'ok';
            $scope.Section3 = 'ok';
        }
        else {
            $scope.showLoader();
            $scope.Section1 = 'notok'
            $scope.Section2 = 'notok';
            $scope.Section3 = 'notok';
            var collectionobj = {};
            collectionobj.ActionType = 8;
            collectionobj.LicenseId = Id;
            collectionobj.LoginId = LoginId;
            var getData = myService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                debugger;
                $scope.IsSessionOpen = response.data.Result.Table[0].PermissionId;
                if ($scope.IsSessionOpen == "1") {
                    $scope.Section1 = 'ok';
                }
                else if ($scope.IsSessionOpen == "2") {
                    $scope.Section2 = 'ok';
                }
                else if ($scope.IsSessionOpen == "3") {
                    $scope.Section3 = 'ok';
                }
                else if ($scope.IsSessionOpen == "23") {
                    $scope.Section2 = 'ok';
                    $scope.Section3 = 'ok';
                }
                else if ($scope.IsSessionOpen == "123") {
                    $scope.Section1 = 'ok';
                    $scope.Section2 = 'ok';
                    $scope.Section3 = 'ok';
                }
                else if ($scope.IsSessionOpen == "13") {
                    $scope.Section1 = 'ok';
                    $scope.Section3 = 'ok';
                }
                else if ($scope.IsSessionOpen == "12") {
                    $scope.Section1 = 'ok';
                    $scope.Section2 = 'ok';
                }
                else {
                    $scope.IsSessionOpen = 'notok';
                }
                $scope.hideLoader();
            });
            $scope.hideLoader();
        }
    }

    $scope.ShowStoreMasterDocForm = function (Id, _LicenseId, TId, SCode) {
        $scope.SCode = SCode;
        $scope._LicenseId = _LicenseId;
        $scope._TId = Id;
        $scope._StoreId = TId;
        $scope.HistoryList = "";
        $scope.openhisty(TId, _LicenseId);
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Id = Id;
        collectionobj.ActionType = 4;
        collectionobj.LicenseId = _LicenseId;
        collectionobj.StoreId = $scope._StoreId;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope._RequiredDocuemntList = response.data.Result.Table1;
            if (response.data.Result.Table.length > 0) {
                $scope.StoreDocumentDetailsList = response.data.Result.Table[0];
                $scope.Id = response.data.Result.Table[0].Id;
                $scope.StoreCode = response.data.Result.Table[0]._StoreId;
                $scope.RefStoreCode = response.data.Result.Table[0].RefStoreCode;
                $scope.DName = response.data.Result.Table[0].Dire_Name;
                $scope.DFatherName = response.data.Result.Table[0].Dire_FatherName;
                $scope.DAddress = response.data.Result.Table[0].Dire_Address;
                $scope.DAadhaarNo = response.data.Result.Table[0].Dire_AadhaarNo;
                $scope.DPanNo = response.data.Result.Table[0].Dire_PanNo;
                if (response.data.Result.Table[0].Dire_DateOfBirth == null) {
                    $scope.DDateOfBirth = "";
                }
                else {
                    $scope.DDateOfBirth = new Date(response.data.Result.Table[0].Dire_DateOfBirth);
                }
                $scope.DEmailId = response.data.Result.Table[0].Dire_EmailId;
                $scope.DMobileNo = response.data.Result.Table[0].Dire_MobileNo;
                $scope.AName = response.data.Result.Table[0].Auth_Name;
                $scope.AFatherName = response.data.Result.Table[0].Auth_FatherName;
                $scope.AAddress = response.data.Result.Table[0].Auth_Address;
                $scope.AAadhaarNo = response.data.Result.Table[0].Auth_AadhaarNo;
                $scope.APanNo = response.data.Result.Table[0].Auth_PanNo;
                if (response.data.Result.Table[0].Auth_DateOfBirth == null) {
                    $scope.ADateOfBirth = "";
                }
                else {
                    $scope.ADateOfBirth = new Date(response.data.Result.Table[0].Auth_DateOfBirth);
                }

                $scope.AEmailId = response.data.Result.Table[0].Auth_EmailId;
                $scope.AMobileNo = response.data.Result.Table[0].Auth_MobileNo;
                $scope.NatureofBusiness = response.data.Result.Table[0].NatureofBusiness;

                if (response.data.Result.Table[0].DateofCommencement == null) {
                    $scope.DateofCommencement = "";
                }
                else {
                    $scope.DateofCommencement = new Date(response.data.Result.Table[0].DateofCommencement);
                }

                $scope.ProductCategory = response.data.Result.Table[0].ProductCategory;
                $scope.AadhaarRegisteredofficeAddressNo = response.data.Result.Table[0].AadhaarRegisteredofficeAddressNo;
                $scope.AadhaarCardofDirector = response.data.Result.Table[0].AadhaarCardofDirector;
                $scope.PANCardofDirector = response.data.Result.Table[0].PANCardofDirector
                $scope.PassportSizePhoto1 = response.data.Result.Table[0].PassportSizePhoto1;
                $scope.AuthorizationLetter = response.data.Result.Table[0].AuthorizationLetter;
                $scope.AadhaarCardofAuthorized = response.data.Result.Table[0].AadhaarCardofAuthorized;
                $scope.PANCard = response.data.Result.Table[0].PANCard;
                $scope.PassportSizePhoto2 = response.data.Result.Table[0].PassportSizePhoto2;
                $scope.ElectricityBill = response.data.Result.Table[0].ElectricityBill;
                $scope.SaledeedRentAgreement = response.data.Result.Table[0].SaledeedRentAgreement;
                $scope.FSMSPlan = response.data.Result.Table[0].FSMSPlan;
                $scope.FormIX = response.data.Result.Table[0].FormIX;
                $scope.WaterTestReport = response.data.Result.Table[0].WaterTestReport;
                $scope.Status = response.data.Result.Table[0].Status;
            }
            $scope.hideLoader();
        });
        $scope.hideLoader();
        if (yy = 0) { $scope.FireEmail(6, _LicenseId, $scope._StoreId) } else if (yy == 1) { }
    }
    $scope.SubmitStoreDocumentDetails = function (type) {
        $scope.DName;
        $scope.ActionType = 2;
        var formData = new FormData();
        formData.append("Id", $scope._TId);
        formData.append("ActionType", $scope.ActionType);
        formData.append("StoreId", $scope._StoreId);
        formData.append("LoginId", LoginId);
        formData.append("LicenseId", $scope._LicenseId);
        formData.append("DName", $scope.DName);
        formData.append("DFatherName", $scope.DFatherName);
        formData.append("DAddress", $scope.DAddress);
        formData.append("DAadhaarNo", $scope.DAadhaarNo);
        formData.append("DPanNo", $scope.DPanNo);
        if ($scope.DDateOfBirth == '' || $scope.DDateOfBirth === undefined) {
            formData.append("DDateOfBirth", '1900-01-01');
        }
        else {
            formData.append("DDateOfBirth", $scope.DDateOfBirth.toISOString());
        }

        formData.append("DEmailId", $scope.DEmailId);
        formData.append("DMobileNo", $scope.DMobileNo);
        formData.append("AName", $scope.AName);
        formData.append("AFatherName", $scope.AFatherName);
        formData.append("AAddress", $scope.AAddress);
        formData.append("AAadhaarNo", $scope.AAadhaarNo);
        formData.append("APanNo", $scope.APanNo);
         

            if ($scope.ADateOfBirth == '' || $scope.ADateOfBirth === undefined)  
        {
            formData.append("ADateOfBirth", '1900-01-01');
        }
        else {
            formData.append("ADateOfBirth", $scope.ADateOfBirth.toISOString());
        }

        formData.append("AEmailId", $scope.AEmailId);
        formData.append("AMobileNo", $scope.AMobileNo);
        formData.append("NatureofBusiness", $scope.NatureofBusiness);
        if ($scope.DateofCommencement == '' || $scope.DateofCommencement === undefined)  {
            formData.append("DateofCommencement", '1900-01-01');
        }
        else {
            formData.append("DateofCommencement", $scope.DateofCommencement.toISOString());
        }

        formData.append("ProductCategory", $scope.ProductCategory);
        formData.append("AadhaarRegisteredofficeAddressNo", $scope.AadhaarRegisteredofficeAddressNo);
        formData.append("AadhaarCardofDirector", $scope.AadhaarCardofDirector);
        formData.append("PANCardofDirector", $scope.PANCardofDirector);
        formData.append("PassportSizePhoto1", $scope.PassportSizePhoto1);
        formData.append("AuthorizationLetter", $scope.AuthorizationLetter);
        formData.append("AadhaarCardofAuthorized", $scope.AadhaarCardofAuthorized);
        formData.append("PANCard", $scope.PANCard);
        formData.append("PassportSizePhoto2", $scope.PassportSizePhoto2);
        formData.append("ElectricityBill", $scope.ElectricityBill);
        formData.append("SaledeedRentAgreement", $scope.SaledeedRentAgreement);
        formData.append("FSMSPlan", $scope.FSMSPlan);
        formData.append("FormIX", $scope.FormIX);
        formData.append("WaterTestReport", $scope.WaterTestReport);
        formData.append("IsActive", type);
        $.ajax({
            url: "../RetailSection/InsertUpdateDelStoreDocumentMaster",
            type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function (response) {
                var data = JSON.parse(response);
                if (showMsgBox('999', 'Save', 'Save Successfully', 'success', 'btn-success')) {
                    // Back button click
                    document.getElementById("lmUploadBack").click();

                    $scope.requestModal.hide();

                     
                    $scope.GetLicenseMaster($scope.Noid, $scope.NoUserId, $scope.NoStoreCode)

                    $scope.FireEmail(7, $scope._LicenseId, $scope._StoreId)
                /*    document.getElementById("lmUploadBack").click();*/
                  
                    $scope.GetStoreMaster(1, 10);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error saving employee data: " + error);
            }
        });
    }

    $scope.TriggerEditButton = function () {
        const modalEl = document.getElementById('lmNewLocationModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: true });
        modal.show();
    };
    $scope.EditStore = function (StoreCode) {
        $scope.showLoader();
        $scope.TriggerEditButton();
        $scope.StoreCode = StoreCode;
        $scope.GETAdditionalDoc();
        
        $scope.storeeditlist = [];
        $scope.storeeditlist = $filter('filter')($scope.StoreList, { 'StoreCode': StoreCode });
        var selectedStore = $scope.storeeditlist[0];
        $scope.EditId = selectedStore.Id;
        $scope.PartyTypeId = selectedStore.PartyTypeId;
        $scope.StoreCode = selectedStore.StoreCode;
        $scope.StoreName = selectedStore.StoreName;
      

        $scope.Operationmodel = selectedStore.Operationmodel;
        $scope.ComplianceCategory = selectedStore.ComplianceCategory;
        $scope.onComplianceChange('1');
        $scope.CompleteAddress = selectedStore.CompleteAddress;
        $scope.ProposedDate = new Date(selectedStore.ProposedDate);
        $scope.StartDate = new Date(selectedStore.ProposedDate);
        $scope.StoreLocation = selectedStore.StoreLocation;

        $scope.Country = selectedStore.CountryId;
        $scope.State = selectedStore.State;
        $scope.CityId = selectedStore.CityId;

        if ($scope.Country == 1) { $scope.Isopenstate = true; } else { $scope.Isopenstate = false; }
       

        $scope.BindMasters(1, 0);
        if (selectedStore.SATE_CODE != null) {
            $scope.State = selectedStore.SATE_CODE.toString();
        }

        //$scope.BindMasters(2, $scope.CityId);
        if (selectedStore.RegionId != null) {
            if (selectedStore.RegionId != 0) {
                $scope.RegionId = $filter('filter')($scope.RegionList, { 'Id': selectedStore.RegionId })[0].Id.toString();

            }
        }
        // $scope.RegionId = $filter('filter')($scope.RegionList, { 'Id': selectedStore.RegionId })[0].Id.toString();
        $scope.BindMasters(3, $scope.CityId);
        $scope.AllCity();
        setTimeout(function () {
            if (selectedStore.CityId != null) {
                $scope.CityId = selectedStore.CityId.toString();;
            }
            if (selectedStore.CircleId != null) {
                $scope.CircleId = $filter('filter')($scope.CircleList, { 'Id': selectedStore.CircleId })[0].Id.toString();
            }
            //if (selectedStore.RegionId != null || selectedStore.RegionId != 0) {
            //    $scope.RegionId = $filter('filter')($scope.RegionList, { 'Id': selectedStore.RegionId })[0].Id.toString();
            //}


        }, 500);

        $scope.ZipCode = selectedStore.ZipCode;
        $scope.RefStoreCode = selectedStore.RefStoreCode;
        $scope.StoreManagerName = selectedStore.StoreManagerName;
        $scope.StoreManagerMobileNo = selectedStore.StoreManagerMobileNo;
        $scope.StoreManagerEmail = selectedStore.StoreManagerEmail;
        $scope.AreaManagerName = selectedStore.AreaManagerName;
        $scope.AreaManagerMobileNo = selectedStore.AreaManagerMobileNo;
        $scope.AreaManagerEmail = selectedStore.AreaManagerEmail;
        $scope.ZonalManagerName = selectedStore.ZonalManagerName;
        $scope.ZonalManagerMobileNo = selectedStore.ZonalManagerMobileNo;
        $scope.ZonalManagerEmail = selectedStore.ZonalManagerEmail;
        $scope.CircleHeadName = selectedStore.CircleHeadName;
        $scope.CircleHeadMobileNo = selectedStore.CircleHeadMobileNo;
        $scope.AddressofNominee = selectedStore.NomineeAddress;
        $scope.CircleHeadEmail = selectedStore.CircleHeadEmail;
        $scope.RegionalHeadName = selectedStore.RegionalHeadName;
        $scope.RegionalHeadMobileNo = selectedStore.RegionalHeadMobileNo;
        $scope.RegionalHeadEmail = selectedStore.RegionalHeadEmail;
        $scope.CorporateHeadName = selectedStore.CorporateHeadName;
        $scope.CorporateHeadMobileNo = selectedStore.CorporateHeadMobileNo;
        $scope.CorporateHeadEmail = selectedStore.CorporateHeadEmail;
        $scope.SQFTStoreArea = selectedStore.SQFTStoreArea;
        $scope.DaysOfExpire = selectedStore.DaysOfExpire;
        $scope.Category = selectedStore.Category;
        $scope.LED = selectedStore.LED;



        //----------------------------
        $scope.ExecutionLevel1 = selectedStore.ExecutionLevel1;
        $scope.ExecutionLevel2 = selectedStore.ExecutionLevel2;
        $scope.ExecutionLevel3 = selectedStore.ExecutionLevel3;
        $scope.ExecutionLevel4 = selectedStore.ExecutionLevel4;
        $scope.ExecutionLevel5 = selectedStore.ExecutionLevel5;
        $scope.SelectDuedatefor = selectedStore.SelectDuedatefor;


        $scope.LicenseD = selectedStore.LicenseD;
        $scope.LicenseDaysOfExpire = selectedStore.LicenseDaysOfExpire;
        $scope.LicenseED = selectedStore.LicenseED;

        $scope.LabourD = selectedStore.Labour;
        $scope.LabourDaysOfExpire = selectedStore.LabourDaysOfExpire;
        $scope.LabourED = selectedStore.LabourED;

        $scope.FactoryD = selectedStore.FactoryD;
        $scope.FactoryDaysOfExpire = selectedStore.FactoryDaysOfExpire;
        $scope.FactoryED = selectedStore.FactoryED;


        $scope.SecraterialD = selectedStore.SecraterialD;
        $scope.SecraterialDaysOfExpire = selectedStore.SecraterialDaysOfExpire;
        $scope.SecraterialED = selectedStore.SecraterialED;

        $scope.FinanceD = selectedStore.FinanceD;
        $scope.FinanceDaysOfExpire = selectedStore.FinanceDaysOfExpire;
        $scope.FinanceED = selectedStore.FinanceED;


        /*   $scope.State = selectedStore.State; */
        //-------------------------

        $scope.IsActive = selectedStore.IsActive;
        $scope.ElectricityBill = selectedStore.ElectricityBill;
        if (selectedStore.ElectricityBillPeriodUpTo != null) {
            $scope.ElectricityBillPeriodUpTo = new Date(selectedStore.ElectricityBillPeriodUpTo);
        }
        if (selectedStore.LeasePaidReceiptPeriodUpTo != null) {
            $scope.LeasePaidReceiptPeriodUpTo = new Date(selectedStore.LeasePaidReceiptPeriodUpTo);
        }
        if (selectedStore.PropertyTaxPeriodUpTo != null) {
            $scope.PropertyTaxPeriodUpTo = new Date(selectedStore.PropertyTaxPeriodUpTo);
        }
        if (selectedStore.FireNocPeriodUpTo != null) {
            $scope.FireNocPeriodUpTo = new Date(selectedStore.FireNocPeriodUpTo);
        }
        if (selectedStore.PollutionPeriodUpTo != null) {
            $scope.PollutionPeriodUpTo = new Date(selectedStore.PollutionPeriodUpTo);
        }
        if (selectedStore.OwnershipDocPeriodUpTo != null) {
            $scope.OwnershipDocPeriodUpTo = new Date(selectedStore.OwnershipDocPeriodUpTo);
        }
        if (selectedStore.AdditionalDocPeriodUpTo != null) {
            $scope.AdditionalDocPeriodUpTo = new Date(selectedStore.AdditionalDocPeriodUpTo);
        }
        if (selectedStore.LeaseFromDate != null) {
            $scope.LeaseFromDate = new Date(selectedStore.LeaseFromDate);
        }
        if (selectedStore.LeasePaidReceiptPeriodUpTo != null) {
            $scope.LeasePaidReceiptPeriodUpTo = new Date(selectedStore.LeasePaidReceiptPeriodUpTo);
        }
        $scope.ElectricityBillRemark = selectedStore.ElectricityBillRemark;
        $scope.LeasePaidReceiptRemark = selectedStore.LeasePaidReceiptRemark;
        $scope.PropertyTaxRemark = selectedStore.PropertyTaxRemark;
        $scope.FireNocRemark = selectedStore.FireNocRemark;
        $scope.PollutionRemark = selectedStore.PollutionRemark;
        $scope.OwnershipDocRemark = selectedStore.OwnershipDocRemark;
        $scope.AdditionalDocRemark = selectedStore.AdditionalDocRemark;
        if ($scope.ElectricityBill == 'none' || $scope.ElectricityBill == null || $scope.ElectricityBill == undefined || $scope.ElectricityBill == '') {
            $scope.Elec = 'none';
            $scope.Electr = 'none';
        }
        else {
            $scope.Elec = 'block';
            $scope.Electr = 'block';
        }
        $scope.RentAgreement = selectedStore.RentAgreement;
        if ($scope.RentAgreement == 'none' || $scope.RentAgreement == null || $scope.RentAgreement == undefined || $scope.RentAgreement == '') {
            $scope.Rent = 'none';
            $scope.RentA = 'none';
        }
        else {
            $scope.Rent = 'block';
            $scope.RentA = 'block';
        }
        $scope.PropertyTaxPaidReceipt = selectedStore.PropertyTaxPaidReceipt;
        if ($scope.PropertyTaxPaidReceipt == 'none' || $scope.PropertyTaxPaidReceipt == null || $scope.PropertyTaxPaidReceipt == undefined || $scope.PropertyTaxPaidReceipt == '') {
            $scope.Property = 'none';
            $scope.Propertyt = 'none';
        }
        else {
            $scope.Property = 'block';
            $scope.Propertyt = 'block';
        }
        $scope.BuildingPlan = selectedStore.BuildingPlan;
        if ($scope.BuildingPlan == 'none' || $scope.BuildingPlan == null || $scope.BuildingPlan == undefined || $scope.BuildingPlan == '') {
            $scope.Building = 'none';
            $scope.BuildingP = 'none';
        }
        else {
            $scope.Building = 'block';
            $scope.BuildingP = 'block';
        }
        $scope.StabilityStructureCertificate = selectedStore.StabilityStructureCertificate;
        if ($scope.StabilityStructureCertificate == 'none' || $scope.StabilityStructureCertificate == null || $scope.StabilityStructureCertificate == undefined || $scope.StabilityStructureCertificate == '') {
            $scope.Stability = 'none';
            $scope.StabilityS = 'none';
        }
        else {
            $scope.Stability = 'block';
            $scope.StabilityS = 'block';
        }
        $scope.CompletionCertificate = selectedStore.CompletionCertificate;
        if ($scope.CompletionCertificate == 'none' || $scope.CompletionCertificate == null || $scope.CompletionCertificate == undefined || $scope.CompletionCertificate == '') {
            $scope.Completion = 'none';
            $scope.CompletionC = 'none';
        }
        else {
            $scope.Completion = 'block';
            $scope.CompletionC = 'block';
        }
        $scope.LoginId = LoginId;
        $scope.ButtonName = 'Update Location';
        $scope.ShowDivStoreMasterForm();
        $scope.IsActionType = 2;
        //$scope.EmployeeUploadDocs = false;

        $scope.ButtonReset = false;
        $scope.hideLoader();
    };
    $scope.triggerFileInput = function (inputId) {

        if (inputId == 'fuElectricityBill' && $('#ElectricityBillPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter ElectricityBill Period Upto ', 'warning', 'btn-warning');
        }
        else if (inputId == 'fuRentAgreement' && $('#LeasePaidReceiptPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter LeasePaid Receipt Period Upto ', 'warning', 'btn-warning');
        }
        else if (inputId == 'fuPropertyTaxPaidReceipt' && $('#PropertyTaxPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter PropertyTax Period Upto ', 'warning', 'btn-warning');
        }
        else if (inputId == 'fuBuildingPlan' && $('#FireNocPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter Fire Noc Period Upto ', 'warning', 'btn-warning');
        }
        else if (inputId == 'fuStabilityStructureCertificate' && $('#PollutionPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter Pollution Period Upto ', 'warning', 'btn-warning');
        }
        else if (inputId == 'fuCompletionCertificate' && $('#OwnershipDocPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter Ownership Doc Period Upto ', 'warning', 'btn-warning');
        }
        else if (inputId == 'AdditionalDoc' && $('#AdditionalDocPeriodUpTo').val() == '') {
            showMsgBox('999', 'Alert', 'Please Enter AdditionalDoc Period Upto ', 'warning', 'btn-warning');
        }
        else {
            document.getElementById(inputId).click();
        }

    };

    $scope.OpenAddNew = true;
    $scope.ManageProject = function (MStoreCode) {
        $scope.MStoreCode = MStoreCode;
        $scope.AvatarText = ($scope.UserName || 'A').split(' ')
            .map(x => x[0])
            .join('')
            .toUpperCase();
        $scope.getDiligence();
        $scope.getDocDiligence();
        $scope.gettilesdetail();
    }

    $scope.selectedId = null; // pehle koi select nahi

    $scope.selectOnly = function (item) {
        if ($scope.selectedId === item.Id) {
            // agar already selected hai, to unselect kar do (optional)
            $scope.selectedId = null;
        } else {
            $scope.selectedId = item.Id;
        }
        $scope.NName = item.DiligenceName;
        $scope.NAssign = item.DiligenceAssigned;
        $scope.NDate = item.Diligencedate;
        $scope.Note = item.Note;
        
        $scope.Noteopen = false;
        // Backend me bhejna ho to:
        $scope.setdocument(item.Id, $scope.selectedId === item.Id);
    };


    $scope.AddNew = function () {
        $scope.openDiligence = true;
        $scope.OpenAddNew = false;
    }
    $scope.closeNew = function () {
        $scope.openDiligence = false;
        $scope.OpenAddNew = true;
    }

    $scope.SRecord = function () {
        $scope.showLoader();
        var collectionobj = {}; 
        collectionobj.Action = 1;
        collectionobj.StoreCode = $scope.MStoreCode;
        collectionobj.DiligenceName = $scope.DiligenceName;
        collectionobj.DiligenceAssigned = $scope.DiligenceAssigned;
        collectionobj.Diligencedate = $('#Diligencedate').val();
        var getData = myService.methode('POST', ("../RetailSection/IUDDiligenceCheckList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            showMsgBox(response.data.Result)
            $scope.DiligenceName = '';
            $scope.DiligenceAssigned = '';
            $('#Diligencedate').val('');
            $scope.closeNew();
            $scope.getDiligence();
            $scope.hideLoader(); 
        });
        $scope.hideLoader();

    }
    $scope.getDiligence = function () {
       
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.StoreCode = $scope.MStoreCode;
        collectionobj.DiligenceName = $scope.DiligenceName;
        collectionobj.DiligenceAssigned = $scope.DiligenceAssigned;
        collectionobj.Diligencedate = $('#Diligencedate').val();
        var getData = myService.methode('POST', ("../RetailSection/DiligenceCheckList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.DiligenceChecklist = response.data.Result;
        });
      

    }

    $scope.AddDocRow = function () {
        $scope.opendocument = true;
    }

     

    $scope.savenote = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.StoreCode = $scope.MStoreCode;
        collectionobj.DocumentName = $scope.Note;
        collectionobj.Id = $scope.DId;
        var getData = myService.methode('POST', ("../RetailSection/IUDDiligenceCheckList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.hideLoader();
            showMsgBox(response.data.Result)
            $scope.getDocDiligence()
        
        }); 
    }
    $scope.SaveDocument = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.StoreCode = $scope.MStoreCode;
        collectionobj.DocumentName = $scope.DocumentName;
        collectionobj.Id = $scope.Id;  
        var getData = myService.methode('POST', ("../RetailSection/IUDDiligenceCheckList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            showMsgBox(response.data.Result)
            $scope.DocumentName = ''; 
            $scope.getDocDiligence($scope.Id);
          
            $scope.hideLoader();
        });
        $scope.hideLoader();

    }
    $scope.setdocument = function (Id, isChecked,x) {
        $scope.Id = Id;
        
        if (isChecked) {
            $scope.opendoceditmode = true
            $scope.opendocument = true;
            // yaha checked hone par jo action karna hai wo karo
        } else {
            $scope.opendoceditmode = false
            $scope.opendocument = false;
            // yaha unchecked hone par action karo
        }
        $scope.getDocDiligence(Id);

    }
  
   

    $scope.getDocDiligence = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.StoreCode = $scope.MStoreCode;
        collectionobj.Id = Id
        var getData = myService.methode('POST', ("../RetailSection/DiligenceCheckList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
           $scope.DiligenceDocChecklist = response.data.Result;
        }); 
    }
    $scope.gettilesdetail = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.StoreCode = $scope.MStoreCode; 
        var getData = myService.methode('POST', ("../RetailSection/DiligenceCheckList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.DueDiligence = response.data.Result[0].DueDiligence;
            $scope.DueDiligenceDate = response.data.Result[0].DueDiligenceDate;
            $scope.ProposedDate = response.data.Result[0].ProposedDate;
            $scope.DayLeft = response.data.Result[0].DayLeft;
            $scope.ProgressTile = response.data.Result[0].ProgressTile;

           
        });
    }
    $scope.closedocNew = function () {
        $scope.opendoceditmode = true;
        $scope.opendocument = false;

    }
   
    $scope.TriggerFile = function (index) {
       /* var index = index + 1*/
        let fileInput = document.getElementById("docFile_" + index);
        if (fileInput) {
            fileInput.click();
        }
    };
    $scope.uploadFile = function (fieldName, input) {

        var file = input.files[0];
        if (!file) return;

        var scopeRow = angular.element(input).scope().x;   // current row

        var formData = new FormData();
        formData.append("FileUpload", file);         // ✅ backend expects this
        formData.append("Action", 6);                // upload action
        formData.append("Id", scopeRow.Id);          // ✅ required
        formData.append("StoreCode", scopeRow.StoreCode); // from row
        formData.append("LoginId", LoginId);
        $http.post("/RetailSection/IUDDiligenceDocCheckList", formData, {
            transformRequest: angular.identity,
            headers: { "Content-Type": undefined }
        })
            .then(function (res) {

                if (res.data && res.data.FilePath) { 
                    $scope.getDocDiligence();
                    $scope.gettilesdetail();
                }

            }, function (err) {
                alert("Upload failed");
            });
    };

    $scope.VersionHistory = function () {

        // Modal element pick
        var archVersionEl = document.getElementById('lmArchVersionModal');

        if (archVersionEl) {
            var vModal = bootstrap.Modal.getOrCreateInstance(archVersionEl);
            vModal.show();
        }

    };
    $scope.downloadChecklistZip = function () {

        var files = $scope.DiligenceDocChecklist
            .filter(x => x.isChecked && x.UploadFile)
            .map(x => ({
                FilePath: x.UploadFile,
                DocumentName: x.DocumentName
            }));

        if (files.length === 0) {
            alert("Please select at least one document");
            return;
        }

        $http.post('/RetailSection/DownloadZip', {
            StoreCode: $scope.MStoreCode,
            Files: files
        }, {
            responseType: 'arraybuffer'
        }).then(function (response) {

            var blob = new Blob([response.data], { type: 'application/zip' });
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'DiligenceDocuments.zip';
            link.click();

        });
    };

    

    $scope.UploadDocument = function (index) {

        var doc = $scope.DiligenceDocChecklist[index];
        var file = doc.SelectedFile;

        if (!file) {
            showMsgBox("Please choose a file!");
            return;
        }

        $scope.showLoader();

        var formData = new FormData();
        formData.append("Action", 6);
        formData.append("Id", $scope.Id);
        formData.append("DocumentId", doc.Id);
        formData.append("FileUpload", file);

        var getData = myService.methode(
            "POST",
            "../RetailSection/IUDDiligenceDocCheckList",
            formData
        );

        getData.then(function (response) {

            if (response.data && response.data.Path) {

                doc.FilePath = response.data.Path;  // file ka path update
                doc.uploadOn = response.data.UploadOn;
                doc.uploadedby = response.data.UploadedBy;
                doc.Status = "Uploaded";
            }

            showMsgBox(response.data.Result);
            $scope.hideLoader();
        });
    };
    $scope.ViewFile = function (path) {
        if (!path || path === "") {
            alert("No file available");
            return;
        }
        window.open(path, "_blank");
    };

    $scope.ResetStoreMasterForm = function () {
        $scope.Limit();
        $scope.ButtonName = 'Create Location';
        $scope.Id = 0;
        $scope.PartyTypeId = '';
        $scope.StoreCode = '';
        $scope.RefStoreCode = '';
        $scope._StoreId = '';
        $scope.Category = '';
        $scope.StoreName = '';
        $scope.CompleteAddress = '';
        $scope.ProposedDate = new Date();
        $scope.StoreLocation = '';
        $scope.CityId = 0;
        $scope.CircleId = 0;
        $scope.RegionId = 0;
        $scope.ZipCode = '';
        $scope.StoreManagerName = '';
        $scope.StoreManagerMobileNo = '';
        $scope.StoreManagerEmail = '';
        $scope.AreaManagerName = '';
        $scope.AreaManagerMobileNo = '';
        $scope.AreaManagerEmail = '';
        $scope.ZonalManagerName = '';
        $scope.ZonalManagerMobileNo = '';
        $scope.ZonalManagerEmail = '';
        $scope.CircleHeadName = '';
        $scope.CircleHeadMobileNo = '';
        $scope.CircleHeadEmail = '';
        $scope.RegionalHeadName = '';
        $scope.RegionalHeadMobileNo = '';
        $scope.RegionalHeadEmail = '';
        $scope.CorporateHeadName = '';
        $scope.CorporateHeadMobileNo = '';
        $scope.CorporateHeadEmail = '';
        $scope.SQFTStoreArea = '';
        $scope.DaysOfExpire = '';
        $scope.LED = '';
        $scope.IsActive = '';
        $scope.ElectricityBill = '';
        $scope.RentAgreement = '';
        $scope.PropertyTaxPaidReceipt = '';
        $scope.BuildingPlan = '';
        $scope.StabilityStructureCertificate = '';
        $scope.CompletionCertificate = '';
        $scope.ElectricityBillPeriodUpTo = "";//new Date();
        $scope.LeasePaidReceiptPeriodUpTo = "";//new Date();
        $scope.PropertyTaxPeriodUpTo = "";//new Date();
        $scope.FireNocPeriodUpTo = "";//new Date();
        $scope.PollutionPeriodUpTo = "";//new Date();
        $scope.OwnershipDocPeriodUpTo = "";//new Date();
        $scope.AdditionalDocPeriodUpTo = "";//new Date();
        $scope.LeaseFromDate = "";//new Date();
        $scope.ElectricityBillRemark = "";
        $scope.LeasePaidReceiptRemark = "";
        $scope.PropertyTaxRemark = "";
        $scope.FireNocRemark = "";
        $scope.PollutionRemark = "";
        $scope.OwnershipDocRemark = "";
        $scope.AdditionalDocRemark = "";
    }

    $scope.validate = function () {
        const alphanumericRegex = /^[a-zA-Z0-9]*$/;
        const inputValue = $scope.StoreCode;
        if (!alphanumericRegex.test(inputValue)) {
            $scope.showValidationError = true;
        } else {
            $scope.showValidationError = false;
        }
    };

    $scope.ApproveLicenseMaster = function (LicenseId, licenseMaster) {
        $scope.showLoader();
        if (licenseMaster.isLoading) return; // safety 
        licenseMaster.isLoading = true;
        var collectionobj = {};
        collectionobj.Id = 0;
        collectionobj.ActionType = 5;
        collectionobj.LicenseId = LicenseId;
        collectionobj.StoreId = $scope._StoreId;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/ApproveLicense"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (showMsgBox("1")) { 
                $scope.GetLicenseMaster($scope._StoreId, $scope.UserId, '');
            }
            $scope.hideLoader();
           $scope.FireEmail(6, LicenseId, $scope._StoreId);
            $scope.iremail(licenseMaster.LicenseName, response.data.Result, licenseMaster)
            //setTimeout(function () {
              
            //    $scope.iremail(licenseMaster.LicenseName, response.data.Result, licenseMaster)
            //}, 1000);
      
        });
        licenseMaster.isLoading = false;
        $scope.hideLoader();

    }
    $scope.IsApplicable = function (LicenseId) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Id = 0;
        collectionobj.ActionType = 11;
        collectionobj.LicenseId = LicenseId;
        collectionobj.StoreId = $scope._StoreId;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/ApproveLicense"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (showMsgBox(response.data.Result)) {
                $scope.GetLicenseMaster($scope._StoreId, $scope.UserId, '');
            }
            $scope.hideLoader();

        });
        $scope.hideLoader();

    }
    $scope.BindSidelicence = function (StoreId) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = StoreId;
        var getData = myService.methode('POST', ("../RetailSection/StoreComplianceStatusMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.Result.length > 0) {
                $scope.Sidelicence = response.data.Result;
                $scope.SetStore = response.data.Result[0].StoreCode;
                $scope.ModifiedOn = response.data.Result[0].ModifiedOn;
                $scope.TotPerLicence = response.data.Result[0].TotLicence;
            }
            else {
                $scope.Sidelicence = "";
                $scope.SetStore = "";
                $scope.ModifiedOn = "";
                $scope.TotPerLicence = "";
            }
            $scope.hideLoader();
        });
    }
    //-------------------------------------Bulk Store

    $scope.StoreMasterList = [];
    //$scope.DisplayExcel = function () {
    //    if ($scope.LeftStore <= 0) {
    //        showMsgBox('999', 'Alert', 'Store Limit exceed:' + $scope.LeftStore + ', contact to admin', 'warning', 'btn-warning'); return;
    //    }
    //    else {
    //        $scope.StoreMasterList = [];
    //        $scope.showLoader();
    //        var reader = new FileReader();
    //        var fileUploader = $('#input-excel');
    //        reader.readAsArrayBuffer(fileUploader[0].files[0]);
    //        reader.onload = function (fileUploader) {
    //            var data = new Uint8Array(reader.result);
    //            var wb = XLSX.read(data, { type: 'array' });
    //            var htmlstr = XLSX.write(wb, { sheet: "Sheet1", type: 'binary', bookType: 'html' });
    //            $('#wrapper')[0].innerHTML = htmlstr;
    //            var table = $('#wrapper').find('table');
    //            table.addClass('table compact table-hover table-striped table-bordered nowrap dataTable tblcss');

    //            $("tr:first-child td").each(function () {
    //                $(this).replaceWith('<th>' + $(this).text() + '</th>');
    //            });
    //            //$('<thead></thead>').prependTo('table').append($('table tr:first'));
    //            setTimeout(function () {
    //                var tr = table.find('tr');
    //                $.each(tr, function (index) {
    //                    $scope.StoreMasterData = { 'StoreName': "", 'CompleteAddress': "" };
    //                    var td = $(this).find('td');
    //                    if (td.length == 0) return;
    //                    if ($(td[1]).text() == '' || $(td[1]).text() == null || $(td[1]).text() == undefined) return;
    //                    $scope.StoreMasterData['RefStoreCode'] = $(td[0]).text();
    //                    $scope.StoreMasterData['StoreName'] = $(td[1]).text();
    //                    $scope.StoreMasterData['CompleteAddress'] = $(td[2]).text();
    //                    $scope.StoreMasterData['ProposedDate'] = (new Date()).toISOString().split('T')[0];//$(td[3]).text();
    //                    $scope.StoreMasterData['StoreLocation'] = $(td[4]).text();
    //                    $scope.StoreMasterData['ZipCode'] = $(td[5]).text();
    //                    $scope.StoreMasterData['StoreManagerName'] = $(td[6]).text();
    //                    $scope.StoreMasterData['StoreManagerMobileNo'] = $(td[7]).text();
    //                    $scope.StoreMasterData['StoreManagerEmail'] = $(td[8]).text();
    //                    $scope.StoreMasterData['AreaManagerMobileNo'] = $(td[9]).text();
    //                    $scope.StoreMasterData['AreaManagerName'] = $(td[10]).text();
    //                    $scope.StoreMasterData['AreaManagerEmail'] = $(td[11]).text();
    //                    $scope.StoreMasterData['ZonalManagerName'] = $(td[12]).text();
    //                    $scope.StoreMasterData['ZonalManagerMobileNo'] = $(td[13]).text();
    //                    $scope.StoreMasterData['ZonalManagerEmail'] = $(td[14]).text();
    //                    $scope.StoreMasterData['CircleHeadName'] = $(td[15]).text();
    //                    $scope.StoreMasterData['CircleHeadMobileNo'] = $(td[16]).text();
    //                    $scope.StoreMasterData['CircleHeadEmail'] = $(td[17]).text();
    //                    $scope.StoreMasterData['RegionalHeadName'] = $(td[18]).text();
    //                    $scope.StoreMasterData['RegionalHeadMobileNo'] = $(td[19]).text();
    //                    $scope.StoreMasterData['RegionalHeadEmail'] = $(td[20]).text();
    //                    $scope.StoreMasterData['CorporateHeadName'] = $(td[21]).text();
    //                    $scope.StoreMasterData['CorporateHeadMobileNo'] = $(td[22]).text();
    //                    $scope.StoreMasterData['CorporateHeadEmail'] = $(td[23]).text();
    //                    $scope.StoreMasterData['SQFTStoreArea'] = $(td[24]).text();
    //                    $scope.StoreMasterData['DaysOfExpire'] = $(td[25]).text();
    //                    $scope.StoreMasterData['LicenseExpiryDay'] = $(td[26]).text();
    //                    $scope.StoreMasterData['IsActive'] = $(td[27]).text();
    //                    $scope.StoreMasterData['Category'] = $(td[28]).text();
    //                    $scope.StoreMasterData['RegionName'] = $(td[29]).text();
    //                    $scope.StoreMasterData['State'] = $(td[30]).text();
    //                    $scope.StoreMasterData['City'] = $(td[31]).text();
    //                    $scope.StoreMasterData['Operationmodel'] = $(td[32]).text();
    //                    $scope.StoreMasterData['ComplianceCategory'] = $(td[33]).text();

    //                    $scope.StoreMasterList.push($scope.StoreMasterData);
    //                    $scope.btnValiadte = true;
    //                })
    //                if ($scope.StoreMasterList.length == 0) return;
    //                if ($scope.StoreMasterList.length > $scope.LeftStore) {
    //                    showMsgBox(
    //                        '999',
    //                        'Alert',
    //                        'You have submitted ' + $scope.StoreMasterList.length +
    //                        ' stores, but your allowed store limit is ' + $scope.LeftStore +
    //                        '. Please verify and contact the administrator.',
    //                        'warning',
    //                        'btn-warning'
    //                    );
    //                    return;
    //                }
    //                $scope.disableValiadte = false;
    //                $scope.$applyAsync();
    //            }, 1000);
    //            $scope.hideLoader();
    //        }
    //    }
    //}
    $scope.DisplayExcel = function () {

        if ($scope.LeftStore <= 0) {
            showMsgBox(
                '999',
                'Alert',
                'Location Limit exceed: ' + $scope.LeftStore + ', contact to admin',
                'warning',
                'btn-warning'
            );
            return;
        }

        // ===== Helper : Remove comma =====
        function removeComma(val) {
            return val ? val.toString().replace(/,/g, '') : '';
        }

        $scope.StoreMasterList = [];
        $scope.showLoader();

        var reader = new FileReader();
        var fileUploader = $('#input-excel');

        if (!fileUploader[0].files.length) {
            $scope.hideLoader();
            return;
        }

        reader.readAsArrayBuffer(fileUploader[0].files[0]);

        reader.onload = function () {

            /* ================= READ EXCEL ================= */
            var data = new Uint8Array(reader.result);
            var wb = XLSX.read(data, { type: 'array' });
            var htmlstr = XLSX.write(wb, {
                sheet: "Sheet1",
                type: 'binary',
                bookType: 'html'
            });

            /* ================= RENDER TABLE ================= */
            $('#wrapper').empty().html(htmlstr);

            var table = $('#wrapper').find('table');

            /* ================= CLEAN TABLE DATA ================= */

            // Remove comma from ALL cells (UI + data safety)
            table.find('td').each(function () {
                var txt = $(this).text();
                if (txt.indexOf(',') !== -1) {
                    $(this).text(txt.replace(/,/g, ''));
                }
            });

            // Remove completely blank rows
            table.find('tr').each(function () {
                var isEmpty = true;
                $(this).find('td').each(function () {
                    if ($(this).text().trim() !== '') {
                        isEmpty = false;
                        return false;
                    }
                });
                if (isEmpty) $(this).remove();
            });

            /* ================= FIX HEADER / BODY STRUCTURE ================= */

            var rows = table.find('tr');

            // Header row
            var headerRow = rows.eq(0);
            headerRow.find('td').each(function () {
                $(this).replaceWith('<th>' + $(this).text().trim() + '</th>');
            });
            headerRow.wrap('<thead></thead>');

            // Remaining rows → tbody
            rows.slice(1).wrapAll('<tbody></tbody>');

            /* ================= STYLING & SCROLL ================= */

            //$('#wrapper').css({
            //    'max-height': '420px',
            //    'overflow-y': 'auto',
            //    'overflow-x': 'auto',
            //    'border': '1px solid #ddd'
            //});
            $('#wrapper').append(`
<style>
#wrapper::-webkit-scrollbar {
    height: 14px;
    width: 14px;
}
#wrapper::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 8px;
}
#wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
}
</style>
`);

            table.css({
                'width': 'max-content',     // MOST IMPORTANT
                'min-width': '1800px',      // columns zyada ho to badhao
                'table-layout': 'auto',
                'white-space': 'nowrap'
            });
            table.addClass(
                'table table-bordered table-striped table-hover nowrap'
            );
            table.find('th, td').css({
                'border': '1.5px solid #555',
                'padding': '6px 8px',
                'font-size': '12px',
                'vertical-align': 'middle'
            });

            // 🔹 Header thoda dark
            table.find('th').css({
                'background-color': '#f3f3f3',
                'font-weight': '600',
                'text-align': 'left'
            });
            table.find('tbody tr').hover(
                function () { $(this).css('background-color', '#f9f9f9'); },
                function () { $(this).css('background-color', ''); }
            );
            table.css({
                'width': '100%',
                'table-layout': 'fixed',
                'white-space': 'nowrap'
            });

            /* ================= READ TABLE DATA ================= */

            setTimeout(function () {

                table.find('tbody tr').each(function () {

                    var td = $(this).find('td');
                    if (td.length === 0) return;
                    if (!$(td[1]).text()) return;

                    var obj = {};

                    obj.RefStoreCode = removeComma($(td[0]).text());
                    obj.StoreName = removeComma($(td[1]).text());
                    obj.CompleteAddress = removeComma($(td[2]).text());
                    obj.ProposedDate = (new Date()).toISOString().split('T')[0];

                   /* obj.StoreLocation = removeComma($(td[4]).text());*/
                    obj.ZipCode = removeComma($(td[4]).text());

                    obj.StoreManagerName = removeComma($(td[5]).text());
                    obj.StoreManagerMobileNo = removeComma($(td[6]).text());
                    obj.StoreManagerEmail = $(td[7]).text();

                    obj.AreaManagerMobileNo = removeComma($(td[8]).text());
                    obj.AreaManagerName = removeComma($(td[9]).text());
                    obj.AreaManagerEmail = $(td[10]).text();

                    obj.ZonalManagerName = removeComma($(td[11]).text());
                    obj.ZonalManagerMobileNo = removeComma($(td[12]).text());
                    obj.ZonalManagerEmail = $(td[13]).text();

                    obj.CircleHeadName = removeComma($(td[14]).text());
                    obj.CircleHeadMobileNo = removeComma($(td[15]).text());
                    obj.CircleHeadEmail = $(td[16]).text();

                    obj.RegionalHeadName = removeComma($(td[17]).text());
                    obj.RegionalHeadMobileNo = removeComma($(td[18]).text());
                    obj.RegionalHeadEmail = $(td[19]).text();

                    obj.CorporateHeadName = removeComma($(td[20]).text());
                    obj.CorporateHeadMobileNo = removeComma($(td[21]).text());
                    obj.CorporateHeadEmail = $(td[22]).text();

                    obj.SQFTStoreArea = removeComma($(td[23]).text());
                    obj.DaysOfExpire = removeComma($(td[24]).text());
                    obj.LicenseExpiryDay = removeComma($(td[25]).text());
                    obj.IsActive = $(td[26]).text();

                    obj.Category = removeComma($(td[27]).text());
                    obj.RegionName = removeComma($(td[28]).text());
                    obj.Country = removeComma($(td[29]).text());
                    obj.State = removeComma($(td[30]).text());
                    obj.City = removeComma($(td[31]).text());
                    obj.Operationmodel = removeComma($(td[32]).text());
                    obj.ComplianceCategory = removeComma($(td[33]).text());

                    $scope.StoreMasterList.push(obj);
                });

                /* ================= STORE LIMIT CHECK ================= */

                if ($scope.StoreMasterList.length > $scope.LeftStore) {
                    showMsgBox(
                        '999',
                        'Alert',
                        'You have submitted ' + $scope.StoreMasterList.length +
                        ' stores, but allowed limit is ' + $scope.LeftStore,
                        'warning',
                        'btn-warning'
                    );
                    $scope.hideLoader();
                    return;
                }

                $scope.btnValiadte = true;
                $scope.disableValiadte = false;
                $scope.$applyAsync();
                $scope.hideLoader();

            }, 200);
        };
    };


    $scope.btnValiadte = false;

    $scope.SaveRecord = function () {
        if ($scope.LeftStore <= 0 && $scope.ButtonName == 'Create Location') { showMsgBox('999', 'Alert', 'Store Limit exceed:' + $scope.LeftStore + ', contact to admin', 'warning', 'btn-warning'); return; }
        else {
            for (let i = 0; i < $scope.StoreMasterList.length; i++) {
                if (!$scope.StoreMasterList[i].StoreName ||
                    $scope.StoreMasterList[i].StoreName.toString().trim() === '') {
                    showMsgBox('999', 'warning', 'Unit Name cannot be blank', 'warning', 'btn-warning');
                    return;
                }
                if ($scope.StoreMasterList[i].StoreManagerName == '') {
                    showMsgBox('999', 'warning', 'Location Manager Name not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }

                if ($scope.StoreMasterList[i].StoreManagerMobileNo == '') {
                    showMsgBox('999', 'warning', 'Location Manager MobileNo not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }
                if ($scope.StoreMasterList[i].StoreManagerEmail == '') {
                    showMsgBox('999', 'warning', 'Location Manager Email not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }
                if ($scope.StoreMasterList[i].SQFTStoreArea == '') {
                    showMsgBox('999', 'warning', 'SQFT Store Area not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                } if ($scope.StoreMasterList[i].DaysOfExpire == '') {
                    showMsgBox('999', 'warning', 'Days Of Expire not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }
                if ($scope.StoreMasterList[i].LicenseExpiryDay == '') {
                    showMsgBox('999', 'warning', 'License Expiry Day not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }

                if ($scope.StoreMasterList[i].ZipCode == '') {
                    showMsgBox('999', 'warning', 'ZipCode  not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }
                if ($scope.StoreMasterList[i].Category == '') {
                    showMsgBox('999', 'warning', 'Category  not valid in Unit Name ' + $scope.StoreMasterList[i].StoreName, 'warning', 'btn-warning');
                    return;
                }


                if ($scope.StoreMasterList[i].Operationmodel == '')
                {
                    showMsgBox('999', 'warning', 'Operation model  not valid in Unit Name ' + $scope.StoreMasterList[i].Operationmodel, 'warning', 'btn-warning');
                    return;
                }
                var validCModels = ["Central Kitchen", "Retail Outlet", "State Kitchen", "Warehouse", "Office", "Factory"];

                 

                if (!validCModels.includes($scope.StoreMasterList[i].Category)) {
                    showMsgBox(
                        '999',
                        'warning',
                        'Category not valid in Unit Name: ' + $scope.StoreMasterList[i].StoreName +
                        '. Allowed values are Central Kitchen, Retail Outlet, State Kitchen, Warehouse,Office, Factory',

                        'warning',
                        'btn-warning'
                    );
                    return;
                }


                var validModels = ["COCO", "FOCO", "FICO", "COFO", "FOFO"];

                if (!validModels.includes($scope.StoreMasterList[i].Operationmodel))
                {
                    showMsgBox(
                        '999',
                        'warning',
                        'Operation model not valid in Unit Name: ' + $scope.StoreMasterList[i].StoreName +
                        '. Allowed values are COCO, FOCO, FICO, COFO, FOFO.',

                        'warning',
                        'btn-warning'
                    );
                    return;
                }


                var validStastuModels = ["Active", "Inactive", "Upcoming"];

                if (!validStastuModels.includes($scope.StoreMasterList[i].IsActive)) {
                    showMsgBox(
                        '999',
                        'warning',
                        'Status not valid in Unit Name: ' + $scope.StoreMasterList[i].StoreName +
                        '. Allowed values are "Active", "Inactive", "Upcoming"',

                        'warning',
                        'btn-warning'                                                                                                                                                                                                 
                    );
                    return;
                }
                // License Expiry Day
                function isValidInt(val) {
                    return val !== null &&
                        val !== '' &&
                        !isNaN(val) &&
                        Number.isInteger(Number(val));
                }

                if (!isValidInt($scope.StoreMasterList[i].DaysOfExpire)) {
                    showMsgBox(
                        '999',
                        'warning',
                        'Notify (Before Days) must be an numeric in Unit Name ' + $scope.StoreMasterList[i].StoreName,
                        'warning',
                        'btn-warning'
                    );
                    return;
                }

                // Days Of Expire
                if (!isValidInt($scope.StoreMasterList[i].LicenseExpiryDay)) {
                    showMsgBox(
                        '999',
                        'warning',
                        'Reminder (Alert Days) must be an numeric in Unit Name ' + $scope.StoreMasterList[i].StoreName,
                        'warning',
                        'btn-warning'
                    );
                    return;
                }

                // SQFT Store Area
                if (!isValidInt($scope.StoreMasterList[i].SQFTStoreArea)) {
                    showMsgBox(
                        '999',
                        'warning',
                        'Store Area must be an integer in Unit Name ' + $scope.StoreMasterList[i].StoreName,
                        'warning',
                        'btn-warning'
                    );
                    return;
                }


                if ($scope.StoreMasterList[i].ComplianceCategory == '') {
                    showMsgBox('999', 'warning', 'Compliance Category  not valid in Unit Name ' + $scope.StoreMasterList[i].ComplianceCategory, 'warning', 'btn-warning');
                    return;
                }
                var validComplianceCategories = ["Factory", "Establishment", "Contractor"];

                if (!validComplianceCategories.includes($scope.StoreMasterList[i].ComplianceCategory)) {
                    showMsgBox(
                        '999',
                        'warning',
                        'Compliance Category not valid in Unit Name: ' + $scope.StoreMasterList[i].StoreName +
                        '. Allowed values are Factory, Establishment, Contractor.',
                        'warning',
                        'btn-warning'
                    );
                    return;
                }
            }
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.StoreMaster = $scope.StoreMasterList;
            collectionobj.ActionType = 13;
            collectionobj.LoginId = LoginId;
            var getData = myService.methode('POST', "../RetailSection/IUDBulkStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                debugger;
                if (response.data.Result == '') {
                    $scope.BeforeSaveRecordValidate();
                }
                else { showMsgBox(response.data.Result.split('|')[0].trim()); }
            });
        }
    }
    $scope.ForceCloseModal = function () {
        const modalEl = document.getElementById('lmNewLocationModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: true });
        modal.hide();
    };
    $scope.BeforeSaveRecordValidate = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.StoreMaster = $scope.StoreMasterList;
        collectionobj.ActionType = 8;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/IUDBulkStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
          
            showMsgBox('999', 'Alert', response.data.Result, 'warning', 'btn-warning');
            $scope.Limit();
            $scope.GetStoreMaster(1, 10);
            $scope.getbackfromedit();

            $scope.ForceCloseModal();
        });
    }
    //-------------------------------------end bulk


    $scope.logmaintainwithstore = function (message) {
        if ($scope.StoreCode == undefined) {
            $scope.StoreCode = $scope.selectedStoreCode;
        }
        $scope.ManageLog(message + ', Store Code : ' + $scope.StoreCode);
    }
    //------------------------------Download With Name-----------------

    $scope.DownloadWithName = function (DownloadLink, Name) {
        $scope.ManageLog(Name + ', Store Code : ' + $scope.StoreCode);
        var link = document.createElement('a');
        var extension = '.pdf'
        link.href = DownloadLink;
        link.download = Name + '_' + $scope.StoreCode + extension;
        link.click();
        link.remove();
    }

    $scope.ExportPdf = function () {
        $scope.Getpdf();
        /*$('#example').DataTable().buttons(0, 1).trigger();*/
    }
    $scope.ExportExcel = function () {
        /* $('#example1').DataTable().buttons(0, 0).trigger();*/
        $scope.GetExcel();
    }
    $scope.ViewAllClicked = function () {
        //var table = $('#example').DataTable();
        //table.page.len(-1).draw(); // Set to show all rows, effectively removing pagination
        $scope.GetStoreMaster(1, 1000000, '');
    }

    //-----------------------------------------------
    $scope.getbackfromedit = function () {
        document.getElementById("btnViewCard").click();
        document.querySelector('.btn-close[data-bs-dismiss="modal"]').click();
    }
    $scope.Showrequestform = function () {
        $scope.StoreCode = $scope.selectedStoreCode
        $scope.StoreMasterDocForm = false;
        $scope.StoreMasterGrid = true;
        $scope.StoreMasterForm = false;
        $('#requestForm').modal('show');
    }

    //------------------------------------------------------
    $scope.generateLinkcopybutton = function (licenseMaster) {
        var collectionobj = {};
        collectionobj.StoreId = licenseMaster.StoreId;
        collectionobj.ActionType = 9;
        var getData = myService.methode('POST', "../RetailSection/oldUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result == '1') {
                $scope.AFTERVERIFY(licenseMaster); 
            }
            else { showMsgBox('999', 'Alert', 'Kindly Map This Store', 'warning', 'btn-warning'); }
        });
    }
    $scope.generateAndCopyLink = function (licenseMaster) {
        var collectionobj = {};
        collectionobj.StoreId = licenseMaster.StoreId;
        collectionobj.ActionType = 9;
        var getData = myService.methode('POST', "../RetailSection/oldUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result == '1') {
              $scope.AFTERVERIFY(licenseMaster);
                setTimeout(function () {
                    $scope.iremail(licenseMaster.LicenseName, Id, licenseMaster)

                }, 500);
            }
            else { showMsgBox('999', 'Alert', 'Kindly Map This Store', 'warning', 'btn-warning'); }
        });
    }
    $scope.iremail = function (LicenseName, Id, licenseMaster) {
        $scope.selectedStoreCode = licenseMaster.StoreCode;
        const link = `${window.location.origin}/Retail/Registration?${Id}|${licenseMaster.LicenseId}|${licenseMaster.StoreId}|${LoginId}|${$scope.selectedStoreCode}|${licenseMaster.LicenseName}`;
        var collectionobj = {};
        collectionobj.Action = 22;
        collectionobj.ClientId = LoginId;
        collectionobj.StoreCode = $scope.selectedStoreCode;
        collectionobj.LicenseName = LicenseName;
        collectionobj.Id = Id
        collectionobj.Msg = link;
        var getData = myService.methode('POST', "../SendEmail/SendEmail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

        });
    }


    $scope.AFTERVERIFY = function (licenseMaster) {
        if (!licenseMaster) return;
        // ✅ Construct the correct link
        const link = `${window.location.origin}/Retail/Registration?${licenseMaster.Id}|${licenseMaster.LicenseId}|${licenseMaster.StoreId}|${LoginId}|${$scope.selectedStoreCode}|${licenseMaster.LicenseName}`;

        $('#' + licenseMaster.Id).text('Click To Copy');
        // ✅ Modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link).then(() => {
                showTooltip(licenseMaster.Id, "Copied!");
            }).catch(err => {
                console.error("Clipboard copy failed:", err);
            });
        } else {
            // ✅ Fallback for older browsers
            let textarea = document.createElement("textarea");
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);

            showTooltip(licenseMaster.Id, "Copied!");
        }
    };

    function showTooltip(buttonId, message) {
        var button = document.getElementById(buttonId);
        if (button) {
            button.setAttribute("title", message);
            var tooltip = $(button).tooltip({ trigger: 'manual' });
            tooltip.tooltip('show');
            setTimeout(() => {
                tooltip.tooltip('hide').attr("title", "Click to Copy");
            }, 500);
        }
    }


    $scope.$watch('CountryId', function (newVal) {
        if (newVal != 'IN') {
            $scope.State = '';
            $scope.CityId = '';
            $scope.AllStateList = [];
            $scope.AllCityList = [];
        }
    });
    //------------------------------------------------------------------------------Compliance doc
    $scope.compDocs = [];

    $scope.kpi = {
        total: 0,
        pending: 0,
        expired: 0,
        completed: 0
    };



    $scope.GETAllSTORE = function () {
        $scope.showLoader();  // Show loader while fetching data
     
        var collectionobj = {
            ActionType: 4,
            Id: LoginId,
            PageNumber: 1,  // Get all records, so page number can be set to 1
            PageSize: 999999,  // Large number to fetch all records in one go
            Searchby: ''  // Optional search filter
        };

        myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.locationLists = response.data.Result; // Store data for export
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };
    
    $scope.toggleLocation = function (row, loc, $event) {
        if ($event) $event.stopPropagation();

        var idIndex = row.locationIds.indexOf(loc.StoreId);
        var nameIndex = row.locations.indexOf(loc.StoreName);

        if (idIndex > -1) {
            row.locationIds.splice(idIndex, 1);
            row.locations.splice(nameIndex, 1);
        } else {
            row.locationIds.push(loc.StoreId);
            row.locations.push(loc.StoreName);
        }
    };

    $scope.selectAllLocations = function (row, $event) {
        if ($event) $event.stopPropagation();

        if (row.locationIds.length == $scope.locationLists.length) {
            row.locationIds = [];
            row.locations = [];
        } else {
            row.locationIds = $scope.locationLists.map(x => x.StoreId);
            row.locations = $scope.locationLists.map(x => x.StoreName);
        }
    };

    // Add Row
    $scope.AddDocRow = function () {
        $scope.compDocs.push({
            docName: '',
            locations: [],       // for display names
            locationIds: [],     // for saving IDs
            Remark: '',
            ValidFrom: '',
            ValidTo: '',
            file: null,
            status: 'Pending',
            isSaved: false
        });
        
    };
 
  $scope.onFileChange = function (element, row) {
      row.file = element.files[0];
    if (!$scope.$$phase) {
        $scope.$apply();
    }
};

    // File Bind
    $scope.onDiligenceFileChange = function (element) {
        $scope.$apply(function () {
            $scope.DiligenceFileReport = element.files[0];
        });

        if (!$scope.DiligenceFileReport) {
            Showmsg("Please select a file.");
            return;
        }
        var fd = new FormData();
        fd.append('Action',7);
        fd.append('locationId', $scope.DeligStoreId);  
        if ($scope.DiligenceFileReport) {
            fd.append('DiligenceFile', $scope.DiligenceFileReport)
        }
        $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, {
            transformRequest: angular.identity, // DON'T let Angular modify FormData
            headers: { 'Content-Type': undefined } // let browser set boundary
        })
            .then(function (response) {
                $scope.BindDiligenceFile($scope.DeligStoreId);
            })
            .catch(function (err) {
                console.error('SaveRow Error:', err);

            })
            .finally(function () {
                $scope.hideLoader();

            });
         
    };

   
    // Row validation function
    $scope.isRowValid = function (row) {
     
        if (new Date(row.validFrom) > new Date(row.validTo)) { 
            showMsgBox('999', 'Alert', 'Valid From date cannot be greater than Valid To date.', 'warning', 'btn-warning');
            return false;
        }

        return true;
    };

    $scope.Savefromstore = function (row) {

        if (new Date(row.ValidFrom) > new Date(row.ValidTo)) {
            showMsgBox('999', 'Alert', 'Valid From date cannot be greater than Valid To date.', 'warning', 'btn-warning');
            return;
        }


        row.isSaved = false;
        row.status = 'Pending';

        var fd = new FormData();

        fd.append('Action', 9);
        fd.append('Id', LoginId);
        fd.append('locationId', row.ComplianceDocId);
        fd.append('Remark', row.Remark || '');
        fd.append('validFrom', $filter('date')(row.ValidFrom, 'yyyy-MM-dd'));
        fd.append('validTo', $filter('date')(row.ValidTo, 'yyyy-MM-dd'));

        if (row.file) {
            fd.append('file', row.file);   // ✅ FILE
            fd.append('status', 'Complete');
        } else {
            fd.append('status', 'Pending');
        }

        $scope.showLoader();

        $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (res) {
                if (res.data && res.data.Result) {
                    row.isSaved = true;
                    row.status = 'Completed';
                    showMsgBox(res.data.Result);
                    $scope.AfterSaveBindComDoc();
                } else {
                    row.isSaved = false;
                    row.status = 'Pending';
                }
            })
            .catch(function (err) {
                console.error(err);
                row.isSaved = false;
                row.status = 'Pending';
            })
            .finally(function () {
                $scope.hideLoader();
            });
    };

    $scope.SaveRow = function (row) {
        if ($scope.isRowValid(row)) {
            row.isSaved = false;        // Save start
            row.status = 'Pending';

            var fd = new FormData();
             
            fd.append('Action', 9);
            fd.append('Id', LoginId);
            fd.append('DocumentName', row.docName);
            fd.append('locationId', row.locationIds.join(',')); // comma separated
            fd.append('Remark', row.remarks);
            fd.append('validFrom', $filter('date')(row.validFrom, 'yyyy-MM-dd'));
            fd.append('validTo', $filter('date')(row.validTo, 'yyyy-MM-dd'));
            fd.append('status', 'Pending'); 
            if (row.file) { 
                fd.append('file', row.file);
            }

            $scope.showLoader();

            // ================= HTTP POST =================
            $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, {
                transformRequest: angular.identity, // DON'T let Angular modify FormData
                headers: { 'Content-Type': undefined } // let browser set boundary
            })
                .then(function (response) {
                    if (response.data && response.data.Result) {
                        row.isSaved = true;
                        row.status = 'Completed'; 
                        showMsgBox(response.data.Result);
                    } else {
                        row.isSaved = false;
                        row.status = 'Pending';
                    }
                })
                .catch(function (err) {
                    console.error('SaveRow Error:', err);
                    row.isSaved = false;
                    row.status = 'Pending';
                })
                .finally(function () {
                    $scope.hideLoader();
                 
                });
        }
    };

    $scope.viewFile = function (fileUrl) {
        if (!fileUrl) {
            alert('File not available');
            return;
        }

        // New tab me file open karega
        window.open(fileUrl, '_blank');
    };

    $scope.downloadDiligenceFile = function (fileUrl, DocumentName) {
        if (!fileUrl) {
            alert('File not available');
            return;
        }

        // Create hidden link
        var link = document.createElement('a');
        link.href = fileUrl;

        // Extension URL se nikal lo
        var extension = fileUrl.split('.').pop().split(/\#|\?/)[0];

        // Safe custom file name
        var safeName = DocumentName ? DocumentName.replace(/[^a-zA-Z0-9-_ ]/g, '') : 'download';

        // Final renamed file
        link.download = safeName + '_DiligenceFile.' + extension;

        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    $scope.downloadFile = function (fileUrl, DocumentName) {
        if (!fileUrl) {
            alert('File not available');
            return;
        }

        // Create hidden link
        var link = document.createElement('a');
        link.href = fileUrl;

        // Extension URL se nikal lo
        var extension = fileUrl.split('.').pop().split(/\#|\?/)[0];

        // Safe custom file name
        var safeName = DocumentName ? DocumentName.replace(/[^a-zA-Z0-9-_ ]/g, '') : 'download';

        // Final renamed file
        link.download = safeName + '.' + extension;

        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    $scope.BindDiligenceFile = function (StoreId) {
         

        $scope.showLoader();  // Show loader while fetching data 
        var collectionobj = {
            Action: 8,
            StoreId: StoreId 
        };

        myService.methode('POST', ("../RetailSection/GetComDoc"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.DiligenceFileReport = response.data.Result[0].DiligenceFile ;
                      
                }
                else { $scope.DiligenceFileReport = '' }
            })
    }
    $scope.AfterSaveBindComDoc = function () {
       
        $scope.showLoader();  // Show loader while fetching data 
        var collectionobj = {
            Action: 6,
            StoreId: $scope.DeligStoreId 
        };

        myService.methode('POST', ("../RetailSection/GetComDoc"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result)
                {
                    $scope.DiligeList = response.data.Result;

                    $scope.DiligeList.forEach(function (row) {

                        // ValidFrom
                        if (row.ValidFrom) {
                            row.ValidFrom = new Date(row.ValidFrom);
                        }

                        // ValidTo
                        if (row.ValidTo) {
                            row.ValidTo = new Date(row.ValidTo);
                        }

                    });
                    $scope.DTotal = 0;
                    $scope.DPending = 0;
                    $scope.DExpired = 0;
                    $scope.DCompleted = 0;

                    var today = new Date();
                    today.setHours(0, 0, 0, 0); // time remove

                    angular.forEach($scope.DiligeList, function (item) {

                        $scope.DTotal++;

                        // ================= DATE LOGIC =================
                        if (item.ValidTo) {
                            var validToDate = new Date(item.ValidTo);
                            validToDate.setHours(0, 0, 0, 0);

                            if (validToDate < today) {
                                // Future or today = Pending
                                $scope.DExpired++;
                            }
                            //} else {
                            //    // Past = Expired
                            //    $scope.DExpired++;
                            //}
                        }
                        if (item.AdditionalDocPath == null || item.AdditionalDocPath == '') {
                            $scope.DPending++;
                        }
                        // ================= COMPLETE LOGIC =================
                        if (item.AdditionalDocPath != null && item.AdditionalDocPath != '') {
                            $scope.DCompleted++;
                        }
                    });


                }
            }).finally(function () {
                $scope.hideLoader();

            });


    }
    $scope.BindComDoc = function (StoreId, StoreCode, RefStoreCode) {
        $scope.DiligenceFileReport = false;
        $scope.DeligStoreId = StoreId;
        $scope.DeligStoreCode = StoreCode;
        $scope.DeligRefStoreCode = RefStoreCode; 
        $scope.showLoader();  // Show loader while fetching data 
        var collectionobj = {
            Action: 6, 
            StoreId: $scope.DeligStoreId 
        };

        myService.methode('POST', ("../RetailSection/GetComDoc"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.DiligeList = response.data.Result;

                    $scope.DiligeList.forEach(function (row) {

                        // ValidFrom
                        if (row.ValidFrom) {
                            row.ValidFrom = new Date(row.ValidFrom);
                        }

                        // ValidTo
                        if (row.ValidTo) {
                            row.ValidTo = new Date(row.ValidTo);
                        }

                    });
                    $scope.DTotal = 0;
                    $scope.DPending = 0;
                    $scope.DExpired = 0;
                    $scope.DCompleted = 0;

                    var today = new Date();
                    today.setHours(0, 0, 0, 0); // time remove

                    angular.forEach($scope.DiligeList, function (item) {

                        $scope.DTotal++;

                        // ================= DATE LOGIC =================
                        if (item.ValidTo) {
                            var validToDate = new Date(item.ValidTo);
                            validToDate.setHours(0, 0, 0, 0);

                            if (validToDate < today) {
                                // Future or today = Pending
                                $scope.DExpired++;
                            }
                            //} else {
                            //    // Past = Expired
                            //    $scope.DExpired++;
                            //}
                        }
                        if (item.AdditionalDocPath == null || item.AdditionalDocPath == '') {
                            $scope.DPending++;
                        }
                        // ================= COMPLETE LOGIC =================
                        if (item.AdditionalDocPath != null && item.AdditionalDocPath != '') {
                            $scope.DCompleted++;
                        }
                    });
 
                
                }
            }).finally(function () {
                $scope.hideLoader();

            });


    }
    // Save All
 
    $scope.SaveAll = function () {

        $scope.showLoader();

        // ---------------- GET ONLY VALID ROWS ----------------
        var validRows = $scope.compDocs.filter(function (row) {
            return $scope.isRowValid(row);
        });

        if (validRows.length === 0) {
            showMsgBox('999', 'Alert', 'No valid records to save.', 'warning', 'btn-warning');
            $scope.hideLoader();
            return;
        } 
        var total = validRows.length;
        var completed = 0;
        var failed = 0;

        // ---------------- FUNCTION TO SAVE ONE ROW ----------------
        function saveNextRow(index) { 
            if (index >= total) {
                // ✅ ALL DONE
                $scope.compDocs = [];
                $scope.AddDocRow();
                $scope.hideLoader();

                showMsgBox('1', 'Success',
                    'Process Complete!\nSuccess: ' + completed + '\nFailed: ' + failed,
                    'success', 'btn-success');

                $scope.$applyAsync(); // ensure UI update
                return;
            }

            var row = validRows[index];
            row.status = 'Pending';
            row.isSaved = false;

            var fd = new FormData();
            fd.append('Action', 1);
            fd.append('Id', LoginId);
            fd.append('DocumentName', row.docName);
            fd.append('locationId', row.locationIds.join(','));
            fd.append('Remark', row.remarks || '');
            fd.append('validFrom',  row.validFrom ? $filter('date')(row.validFrom, 'yyyy-MM-dd') : '');

            fd.append('validTo',row.validTo ? $filter('date')(row.validTo, 'yyyy-MM-dd') : '');

            fd.append('status', 'Pending');

            if (row.file) {
                fd.append('file', row.file);
            }

            // ✅ ALWAYS APPEND DILIGENCE FILE
            fd.append('DiligenceFile', $scope.DiligenceFileReport);

            // ⏳ SMALL DELAY BEFORE API CALL
            setTimeout(function () {

                $http.post('../RetailSection/IUDCOMPLIANCESTORE', fd, {
                    transformRequest: angular.identity,
                    headers: { 'Content-Type': undefined }
                })
                    .then(function (response) {

                        if (response.data && response.data.Result) {
                            row.isSaved = true;
                            row.status = 'Completed';
                            completed++;
                        } else {
                            row.isSaved = false;
                            row.status = 'Pending';
                            failed++;
                        }

                    })
                    .catch(function (err) {
                        console.error('SaveAll Row Error:', err);
                        row.isSaved = false;
                        row.status = 'Pending';
                        failed++;
                    })
                    .finally(function () {
                        // 🔁 NEXT ROW WITH GAP
                        setTimeout(function () {
                            saveNextRow(index + 1);
                            $scope.$applyAsync(); // sync UI
                        }, 300);
                    });

            }, 300);
        }

        // ---------------- START PROCESS ----------------
        saveNextRow(0);
    }; 
     
    $scope.printDTable = function () {

        var originalTable = document.getElementById('lm-compDoc-Table');
        var cloneTable = originalTable.cloneNode(true);

        /* ===============================
           Find File column & rename to Status
           =============================== */
        var ths = cloneTable.querySelectorAll('th');
        var statusIndex = -1;

        ths.forEach(function (th, i) {
            if (th.innerText.trim().toLowerCase() === 'file') {
                th.innerText = 'Status';
                statusIndex = i;
            }
        });

        /* ===============================
           Fill Status using Angular data
           =============================== */
        cloneTable.querySelectorAll('tbody tr').forEach(function (tr, i) {

            var cells = tr.children;

            if (statusIndex > -1 && cells[statusIndex]) {
                var row = $scope.DiligeList[i]; // 👈 actual data row
                cells[statusIndex].innerText =
                    row && row.AdditionalDocPath ? 'Submitted' : 'Not Submitted';
            }
        });

        /* ===============================
           Remove unwanted columns
           =============================== */
        function removeColumn(name) {
            var idx = -1;
            cloneTable.querySelectorAll('th').forEach(function (th, i) {
                if (th.innerText.trim().toLowerCase() === name.toLowerCase()) {
                    idx = i;
                }
            });
            if (idx > -1) {
                cloneTable.querySelectorAll('tr').forEach(function (tr) {
                    if (tr.children[idx]) tr.children[idx].remove();
                });
            }
        }

        removeColumn('View');
        removeColumn('Download');
        removeColumn('');

        /* ===============================
           Convert inputs to text
           =============================== */
        cloneTable.querySelectorAll('input, textarea, select').forEach(function (el) {
            var span = document.createElement('span');
            span.innerText = el.value || '';
            el.parentNode.replaceChild(span, el);
        });

        /* ===============================
           Print
           =============================== */
        var printContents = cloneTable.outerHTML;
        var company = $scope.MapUser || '';
        var generatedOn = new Date().toLocaleString();

        var win = window.open('', '', 'height=700,width=1000');

        win.document.write(`
        <html>
        <head>
            <title>Compliance Document Report</title>
            <style>
                body { font-family: Arial; }
                table { width:100%; border-collapse: collapse; font-size:12px; margin-top:10px; }
                th, td { border:1px solid #000; padding:6px; }
                .report-header { text-align:center; margin-bottom:10px; }
                .company-name { font-size:18px; font-weight:bold; }
                .report-title { font-size:14px; font-weight:bold; }
                .generated-on { font-size:12px; text-align:right; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div class="company-name">${company}</div>
                <div class="report-title">Compliance Document Report</div>
                <div class="generated-on">Generated On : ${generatedOn}</div>
            </div>
            ${printContents}
        </body>
        </html>
    `);

        win.document.close();
        win.focus();
        win.print();
    };





    $scope.exportToDCSV = function () {

        var rows = [];
        var filteredList = $filter('filter')($scope.DiligeList, $scope.searchText);

        // ===== CSV Header =====
        rows.push([
            'S.No',
            'Document Name',
            'Location',
            'Remark',
            'Valid From',
            'Valid To',
            'Due Diligence File',
            'Status'
        ].join(','));

        // ===== CSV Rows =====
        angular.forEach(filteredList, function (row, index) {

            var validFrom = row.ValidFrom
                ? $filter('date')(row.ValidFrom, 'dd-MM-yyyy')
                : '';

            var validTo = row.ValidTo
                ? $filter('date')(row.ValidTo, 'dd-MM-yyyy')
                : '';

            rows.push([
                index + 1,
                '"' + (row.DocumentName || '') + '"',
                '"' + (row.StoreCode || '') + '"',
                '"' + (row.Remark || '') + '"',
                '"' + validFrom + '"',
                '"' + validTo + '"',
                row.DiligenceFile ? 'Submitted' : 'Not Submitted',
                row.AdditionalDocPath ? 'Submitted' : 'Not Submitted'
            ].join(','));
        });

        var csvString = rows.join('\n');
        var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ComplianceDocument.csv';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    // Remove Row
    $scope.RemoveRow = function (index) {
        $scope.compDocs.splice(index, 1); 
    };

    

    // Search
    $scope.searchText = '';
}