app.LicenseRequestMasterController = function ($scope, $element, $filter, myService) {
    $scope.currentPage = 1;
    $scope.pageSize = 10;
    $scope.totalItems = 0;
    $scope.pageNumbers = [];

    $scope.SetDate = function (Id)
    {
        var Sdate = $('#ValidityStartDate' + Id).val();
        var Edate = $('#ValidityEndDate' + Id).val();
        if(Sdate >=Edate)
        {
            $('#ValidityEndDate' + Id).val('');
            showMsgBox('999', 'Mandatory', 'Validity End Date Should be Greater than Validity Start Date', 'warning', 'btn-warning');
            return;
        }
    }
    $scope.filterByStatus = function (license) {
        return license.LStatus === 1 || license.LStatus === 3;
    };
    $scope.LDate = function (Id) { 
         
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; // Months start at 0!
        let dd = today.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

        var TodayDate = yyyy + '-' + mm + '-' + dd;

        var IssuedDate = $('#IssuedDate' + Id).val();
        var ApplicationDate = $('#ApplicationDate' + Id).val();
        //if (IssuedDate < ApplicationDate) {
        //    $('#IssuedDate' + Id).val('');
        //    showMsgBox('999', 'Mandatory', 'License Date Should  be Greater than Application Date', 'warning', 'btn-warning');
        //    $('#IssuedDate' + Id).val('');
        //    return;
        //}
        //if (IssuedDate > TodayDate) {
        //    $('#IssuedDate' + Id).val('');
        //    showMsgBox('999', 'Mandatory', 'Licence Date Should Not be Greater than current Date', 'warning', 'btn-warning');
        //    $('#IssuedDate' + Id).val('');
        //    return;
        //}
    }
    

    $scope.AUploadApplicationCopy = 0;
    $scope.AUploadChallanCopy = 0;
    $scope.AUploadFeesCopy = 0;
    $scope.AUploadLicenseCopy = 0;
    $scope.AUploadRenewedCopy = 0;
    $scope.AUploadInvoice = 0;
    $scope.UploadApplicationCopy = '';
    $scope.UploadChallanCopy = '';
    $scope.UploadFeesCopy = '';
    $scope.UploadLicenseCopy = '';
    $scope.UploadRenewedCopy = '';
    $scope.UploadInvoice = '';
    $scope.ISopen = false;
    $scope.Funcationlitycheck= function()
    { 
        //if ($scope.LoginAs == 'Client') {
        //    $scope.IsValid = true;
        //}
        $scope.IsValid = false;
        $scope.$applyAsync();
    }
 

    $scope.$watch('LoginAs', function (newValue) {
        if (newValue) { // If LoginAs is now defined
            if (newValue === 'Client') {
                $scope.IsValid = true;
            }
            $scope.BindExecuter();
        }
    });


    $scope.CheckBulkChekout = function ()
    {
        if ($('[type="checkbox"]').is(":checked"))
        {
            window.parent.location.href = '../RetailSection/checkout';
        } else
        {
            showMsgBox('999', 'Mandatory', 'Please Select Atleast one Licence', 'warning', 'btn-warning');
            return;
        }
        
    }
    $scope.Allrecord = function () {
        $scope.pageSize = '9999'
        $scope.GetLicenseRequestData(1);
    }
    
    $scope.GetLicenseRequestData = function (PageNo) {
        $scope.Funcationlitycheck();
        $scope.showLoader();
        var collectionobj = {
            Action: 4,
            UserId: LoginId,
            PageNo: PageNo || 1,
            PageSize: $scope.pageSize  ,
               Searchby: $('#myInput').val()
        };
        var getData = myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LicenseRequestList = response.data.Result;
            //let uniqueLicenses = new Set(response.data.Result.map(item => `${item.storeCode}-${item.licenseName}`));

            //$scope.TotalLicense = uniqueLicenses.size;
            $scope.totalItems = response.data.Result[0].TotalRecords
            
            if ($.fn.DataTable.isDataTable('#example')) {
                $('#example').DataTable().destroy();
            } else {
                angular.element(document).ready(function () {
                   
                    dTable = $('#example')
                    dTable.DataTable({
                        dom: 'Bfrtip',
                        buttons: [
                            //'colvis',
                            {
                                extend: 'csv',
                                filename: 'License Master',
                                orientation: 'landscape', //portrait
                                title: function () {
                                    var printTitle = 'License Master';
                                    return printTitle
                                },
                                exportOptions: {
                                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 41, 65, 42, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64]
                                },
                                action: function (e, dt, button, config) {
                                    $scope.ManageLog('Licence Master csv Download');
                                    $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
                                }
                            },

                            'excel',
                            {
                                extend: 'pdfHtml5',
                                text: 'Export PDF',
                                filename: 'License Master',
                                orientation: 'landscape', //portrait
                                pageSize: 'A4', //A3 , A5 , A6 , legal , letter 
                                customize: function (doc) {
                                    doc.styles['table'] = { width: '100%' }
                                    doc.pageMargins = [20, 60, 20, 30];
                                    doc.styles.tableHeader.fontSize = 13;
                                    doc['header'] = (function () {
                                        return {
                                            columns: [
                                                {
                                                    alignment: 'center',
                                                    fontSize: 13,
                                                    text: 'License Master'
                                                }
                                            ],
                                            margin: 35
                                        }
                                    });
                                },
                                exportOptions: {
                                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 15, 24, 25, 26, 27, 31]
                                },
                                action: function (e, dt, button, config) {
                                    $scope.ManageLog('License Master pdf Download');
                                    $.fn.dataTable.ext.buttons.pdfHtml5.action.call(this, e, dt, button, config);
                                }
                            },
                            , {
                                extend: 'print',
                                filename: 'License Master',
                                orientation: 'landscape', //portrait
                                title: function () {
                                    var printTitle = 'License Master';
                                    return printTitle
                                },
                                customize: function (win) {
                                    $(win.document.body).addClass('white-bg');
                                    $(win.document.body).css('font-size', '14px');

                                    $(win.document.body).find('table')
                                        .addClass('compact')
                                        .css('font-size', '14px')
                                        .css('color', 'black');

                                },
                                exportOptions: {
                                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 15, 24, 25, 26, 27, 31]
                                },
                                action: function (e, dt, button, config) {

                                    $scope.ManageLog('License Master print Download');
                                    $.fn.dataTable.ext.buttons.print.action.call(this, e, dt, button, config);
                                }
                            }
                        ],
                 
                    });


                }); 
            }
             
            $scope.hideLoader();
        });
       
    };
    $scope.generatePageNumbers = function () {
        let totalPages = Math.ceil($scope.totalItems / $scope.pageSize);
        let current = $scope.currentPage;
        let range = [];

        if (totalPages <= 10) {
            range = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            range.push(1, 2, 3,4,5,6); // Always show first three pages

            if (current <= 3) {
                range.push("...", totalPages - 2, totalPages - 1, totalPages);
            } else if (current > 3 && current < 6) {
                for (let i = 4; i <= current; i++) {
                    range.push(i);
                }
                range.push("...", totalPages - 2, totalPages - 1, totalPages);
            } else if (current >= 6 && current <= totalPages - 4) {
                range.push("...", current - 1, current, current + 1, "...", totalPages - 2, totalPages - 1, totalPages);
            } else {
                range.push("...");
                for (let i = totalPages - 6; i <= totalPages; i++) {
                    range.push(i);
                }
            }
        }
        return range;
    };

    $scope.changePage = function (newPage) {
        let totalPages = Math.ceil($scope.totalItems / $scope.pageSize);

        if (newPage >= 1 && newPage <= totalPages && newPage !== "...") {
            $scope.currentPage = newPage;
            $scope.GetLicenseRequestData(newPage);
            $scope.pageNumbers = $scope.generatePageNumbers();
        }
    };

    $scope.$watch('totalItems', function () {
        $scope.pageNumbers = $scope.generatePageNumbers();
    });

 

    $scope.GetBulkSuccessPayment = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.BulkSuccessPaymentList = response.data.Result;
            $scope.Funcationlitycheck();
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };

    $scope.$watch('license.ApplicationStatus', function (newValue, oldValue) {
        // Check if the selected option requires the "UploadChallanCopy" field to be mandatory
        IsFileValidation();
    });
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

    $scope.GetStatusMaster = function () {
        var collectionobj = {};
        collectionobj.Name = "All";
        var getData = myService.methode('POST', ("../RetailSection/GetStatusMaster"), JSON.stringify(collectionobj));
        return getData.then(function (response) {
            $scope.StatusMasterList = response.data.Result;
            $scope.ApplicationStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "ApplicationStatus";
            });

            $scope.LicenseStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "LicenseStatus";
            });

            $scope.RenewalStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "RenewalStatus";
            });

            $scope.InvoiceStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "InvoiceStatus";
            });

            $scope.PaymentStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "PaymentStatus";
            });
        });


    };
    $scope.isFieldInvalid = function (fieldName, license) {
        if (license.ApplicationStatus === 'Applied') {  
            if (fieldName === 'UploadChallanCopy') {
                return !license.UploadLicenseCopy;
            }
            if (fieldName === 'UploadApplicationCopy') {
                return !license.UploadApplicationCopy;
            }
            if (fieldName === 'ApplicationDate') {
                return !license.ApplicationDate;
            }
        }
        if (license.LicenseStatus === 'Issued') {


            if (fieldName === 'InvoiceNo') {
                return !license.InvoiceNo;
            }
            if (fieldName === 'InvoiceAmount') {
                return !license.InvoiceAmount;
            }
            if (fieldName === 'UploadInvoice') {
                return !license.UploadInvoice;
            }
        }

        // By default, return false for other fields when ApplicationStatus is not 'Applied'
        return false;
    };

    

    // Function to handle the change in Application Status
    $scope.onStatusChange = function (license) {
        // Trigger validation when Application Status changes
        $scope.validateLicense(license);
    };

    // Function to validate the entire license row
    $scope.validateLicense = function (license) {
        // Loop through each field and update its validity based on the ApplicationStatus
        angular.forEach(license, function (value, key) {
            if (key === 'ApplicationStatus') return; // Skip the ApplicationStatus field itself
            if (key === 'LicenseStatus') return; 
            // Update the field's validity dynamically
            license[key + 'Invalid'] = $scope.isFieldInvalid(key, license);
        });
    };
    $scope.GetStatusMaster();
    $scope.SetValue = function (ID, fuCandidatePhoto) {
        Index = ID;
        //$(fuCandidatePhoto).click();
    }
    function getValue(pdftext, fieldName, fieldType) {

        let cleanField = fieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        let pattern = "";

        if (fieldType === "int") {
            pattern = new RegExp(
                cleanField + "[\\s:\\/\\-\\u0900-\\u097F]*([0-9]{4,20})",
                "i"
            );
        }
        //else if (fieldType === "date") {
        //    pattern = new RegExp(
        //        cleanField +
        //        "[\\s:\\/\\-\\u0900-\\u097F]*" +
        //        "(\\b[0-9]{1,2}[\\-\\/\\.][0-9]{1,2}[\\-\\/\\.][0-9]{4})\\b",
        //        "i"
        //    );
        //}
        else {
            pattern = new RegExp(
                cleanField + "[\\s:\\/\\-\\u0900-\\u097F]*([^\\n]+)",
                "i"
            );
        }

        let match = pdftext.match(pattern);
        if (!match) return "";
        return match[1].trim();
    }


 
    function extractDate(text) {
        if (!text) return null;

        let match = text.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (match) {
            let dd = match[1].padStart(2, '0');
            let mm = match[2].padStart(2, '0');
            let yyyy = match[3];

            // Return REAL JS Date object
            return new Date(`${yyyy}-${mm}-${dd}`);
        }

        return null;
    }



    $scope.extractData = function (pdftext, SelectedColumn, rowID, callback)
    {
        debugger;
        pdftext = pdftext.replace(/\s+/g, " ").trim();

        var collectionobj = {
            Action: 5,
            SelectedColumn: SelectedColumn,
            StoreCode: $scope.LicenseRequestList[rowID].StoreCode
        };

        return myService.methode(
            'POST',
            ("../Retail/SearchRetailFileMatching"),
            JSON.stringify(collectionobj)
        )
            .then(function (response) {

                if (response.data.Result.length > 0) {
                    let vText = response.data.Result[0].VaildText;

                    let MatchingText = response.data.Result[0].MatchingText;


                    let StateName = response.data.Result[0].StateName;

                    if (!looselyMatch(StateName, pdftext)) {

                        var msg = "Uploaded file does not belong in " + StateName + " State, please verify once.";

                        swal({
                            title: "Warning!",
                            text: msg,
                            type: "warning"
                        });

                    }

                    if (looselyMatch(MatchingText, pdftext)) {
                        callback(true);

                    } else {
                        callback(false);
                        return;
                    }

                    let fields = vText.split(",")
                        .map(x => x.trim())
                        .filter(x => x !== "")
                        .map(x => {
                            let parts = x.split(":");
                            return {
                                name: parts[0].trim(),
                                type: parts[1] ? parts[1].trim().toLowerCase() : "string",
                                Seton: parts[2] ? parts[2].trim() : "string"
                            };
                        });

                    let result = {};

                    fields.forEach(f => {

                        let fieldName = f.name;
                        let fieldType = f.type;
                        let Seton = f.Seton;

                        let rawValue = getValue(pdftext, fieldName, fieldType);

                        if (fieldType === "int") {
                            rawValue = rawValue.replace(/\D+/g, "");
                        }
                        else if (fieldType === "date") {
                            rawValue = extractDate(rawValue);
                        }

                        result[fieldName] = rawValue || null;
                        if (f.Seton) {
                            $scope.$applyAsync(() => {
                                $scope.LicenseRequestList[rowID][Seton] =
                                    rawValue ? rawValue : null;
                            
                            });
                        }

                    });

                    console.log("Extracted Clean Data:", result);

                    return result;
                }
                else {
                     $scope.hideValidationLoader();
                    callback(true);
                   } 
            });
    };







    $scope.ReadingFile = function (files, index, RowId, callback) {

        if (!files || !files[0]) {
            console.error("File not received!");
            return;
        }

        let file = files[0];  // <-- Yaha error hota tha jab files undefined ata tha

        let reader = new FileReader();

        reader.onload = function () {

            let typedarray = new Uint8Array(this.result);

            pdfjsLib.getDocument({ data: typedarray }).promise.then(function (pdf) {

                let allText = "";
                let totalPages = pdf.numPages;
                let done = 0;

                for (let p = 1; p <= totalPages; p++) {
                    pdf.getPage(p).then(function (page) {
                        page.getTextContent().then(function (text) {

                            text.items.forEach(t => { allText += t.str + " "; });

                            done++;

                            if (done === totalPages) {
                                $scope.$applyAsync(function () {

                                    if (allText == "")
                                    {
                                        $scope.hideValidationLoader();
                                        swal("Invalid File", "PDF files not valid format.", "error");
                                        input.value = "";
                                     
                                        return;
                                    } else { $scope.extractData(allText, index, RowId, callback);}
                                
                                });
                            }
                        });
                    });
                }
            });
        };

        reader.readAsArrayBuffer(file);  // <-- Ab error nahi aayega
    };

    $scope.uploadFile = function (fieldName, input) {

        // Use input.id instead of event.target.id
        let idText = input.id.replace(fieldName, "");



        // convert to number safely
        let rowId = parseInt(idText);

        // if parseInt gives NaN → set rowId = 0
        if (isNaN(rowId)) {
            rowId = 0;
        } else {
            rowId = rowId - 1;
        }
    

        const file = input.files[0];
        if (!file) {
            $scope.hideValidationLoader();
            return;
        }

        // PDF + Size validation
        const isPDF = file.type === 'application/pdf';
        if (!isPDF) {
            swal("Invalid File", "Only PDF files are allowed.", "error");
            input.value = "";
            return;
        }

        const MAX_SIZE_MB = 20;
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_SIZE_MB) { 
            return;
        }

        $scope.showValidationLoader();

        // 👇 FIXED HERE - RowId → rowId
        $scope.ReadingFile(input.files, fieldName, rowId, function (isValid) {

            $scope.hideValidationLoader();

            if (!isValid) {
                swal({
                    title: "Are you sure?",
                    text: "Uploaded file does not appear to be valid. Do you want to continue?",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes, continue!",
                    cancelButtonText: "Cancel",
                    closeOnConfirm: false
                }, function (isConfirm) {

                    if (isConfirm) {
                        swal.close();
                        $scope.ExceptionFile('License Master', fieldName, LoginId);
                        processFile();
                    } else {
                        input.value = "";
                        return;
                    }
                });
            } else {
                processFile();
            }

            function processFile() {
                var id = $(input).attr('id');
                $scope.ManageLog('click on browser button' + fieldName);

                if (input.files && input.files[0]) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        $scope[fieldName] = e.target.result;
                        $scope[id] = '1';
                        $scope.$applyAsync();
                    };
                    reader.readAsDataURL(input.files[0]);
                } else {
                    $scope.$applyAsync();
                }
            }
        });
    };




    //$scope.uploadFile = function (fieldName, input)
    //{
    //    debugger;
    //    let rowId = parseInt(event.target.id.replace("UploadLicenseCopy", ""));
    //    rowId = rowId - 1;
    //    $scope.ReadingFile(input.files, fieldName, rowId );
    //    const file = input.files[0];

      
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
         
    //    $scope.ReadingFile(file, fieldName, function (isValid) {
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
    //                    $scope.ExceptionFile('License Master', fieldName , LoginId)
    //                    processFile(); // ✅ Continue processing the file
                     
    //                } else {
    //                    input.value = ""; // ❌ Clear file
    //                    return;
    //                }
    //            });
    //        } else {
    //            processFile(); // ✅ Valid file, continue normally
    //        }

    //        function processFile() {
    //            var id = $(input).attr('id');
    //            $scope.ManageLog('click on browser button' + fieldName);
    //            debugger;
    //            if (input.files && input.files[0]) {
    //                var filerdr = new FileReader();
    //                filerdr.onload = function (e)
    //                {
    //                    $scope[fieldName] = e.target.result;
    //                    $scope[id] = '1';
    //                    $scope.$applyAsync();

    //                }
    //                filerdr.readAsDataURL(input.files[0]);

    //            }
    //            else {
    //                $scope.$applyAsync();
    //            }
    //        }
    //    });
    //};

    $scope.chkissuestatus = function (Id)
    {
        //if ($('#LicenseStatus' + Id).val() === 'Issued') {
        //    if ($('#ApplicationStatus' + Id).val() != 'Applied') {
        //        $('#LicenseStatus' + Id).focus(); 
        //        $('#LicenseStatus' + Id).addClass("red-validation");
        //        showMsgBox('999', 'Alert', 'Application Status Should be Applied', 'warning', 'btn-warning');
        //        return;
        //    }
        //    else { $('#LicenseStatus' + Id).removeClass("red-validation"); }
        //}
    }
    $scope.LimId = '';
    $scope.ChangeLicenseType = function (SetLT) {
        $scope.LimId = SetLT;
        $scope.List = $scope.LicenseList.filter(item => item.LicenceRequstId == SetLT); // Use '==' for type conversion
        $scope.SetLicense($scope.List[0]);
    };
    $scope.SetLicense = function (license) {
    
            $scope.showLoader();  // Show loader while fetching data

            var collectionobj = {
                Action: 4,
                UserId: LoginId,
                PageNo: 1,
                PageSize: 999999,
                Searchby: license.StoreCode
            };
            myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj))
                .then(function (response) {
                    if (response.data && response.data.Result) {
                        $scope.LicenseList = response.data.Result; // Store data for export

                        $scope.LMStoreCode = license.StoreCode;
                        $scope.filteredLicenses = [];
                        $scope.filteredLicenses = $scope.LicenseList.filter(item => item.StoreCode === license.StoreCode);

                        $scope.LMRefStoreCode = license.RefStoreCode;
                        $scope.LMLicenceRequstId = license.LicenceRequstId;
                        $scope.SetLT = license.LicenceRequstId.toString();
                        $scope.LMRefStoreAddress = license.StoreAddress;
                        $scope.LMProposedDate = license.ProposedDate
                        $scope.LMLicenseNamee = license.LicenseName;
                        $scope.LMLicenseType = license.LicenseType;
                        $scope.LMRequestedDate = license.RequestedDate
                        $scope.LMDocDate = license.DocumentDate
                        $scope.LMAppStatus = license.ApplicationStatus;
                        $scope.AppDate = license.ApplicationDate
                        $scope.LMAppcopy = license.UploadApplicationCopy;
                        $scope.LMchallanCopy = license.UploadChallanCopy;
                        $scope.LMFeeCopy = license.UploadFeesCopy;
                        $scope.LMLicenseStatus = license.LicenseStatus;
                        $scope.LMLicensDate = license.IssuedDate ? moment(license.IssuedDate, "MM/DD/YYYY").toDate() : null;
                        $scope.LMLicenseNumber = license.LicenseNumber;
                        $scope.LMValidityStartDate = license.ValidityStartDate ? moment(license.ValidityStartDate, "MM/DD/YYYY").toDate() : null;

                        $scope.LMValidityEndDate = license.ValidityEndDate ? moment(license.ValidityEndDate, "MM/DD/YYYY").toDate() : null;

                        $scope.LMLicenseCopy = license.UploadLicenseCopy;
                        $scope.LMUserName = license.UserName;
                        $scope.LMUserPassword = license.UserPassword;
                        $scope.LMMobileNumber = license.MobileNumber;
                        $scope.LMEmailId = license.EmailId;
                        $scope.LMTentativeDateofComp = license.TentativeDateofComp ? moment(license.TentativeDateofComp, "MM/DD/YYYY").toDate() : null;
                        $scope.LMoverday = license.PaymentOverDueDate;
                        $scope.LMActualCost = license.ActualCost;
                        $scope.LMGovtFees = license.GovtFees;
                        $scope.LMRenewalRequestDate = license.RenewalRequestDate ? moment(license.RenewalRequestDate, "MM/DD/YYYY").toDate() : null;
                        $scope.LMRenewalStartDate = license.RenewalStartDate ? moment(license.RenewalStartDate, "MM/DD/YYYY").toDate() : null;
                        $scope.LMRenewalEnddate = license.RenewalEndDate ? moment(license.RenewalEndDate, "MM/DD/YYYY").toDate() : null;
                        $scope.LMRenewalStatus = license.RenewalStatus;
                        $scope.LMUploadRenewedCopy = (license.UploadRenewedCopy !== 'undefined' && license.UploadRenewedCopy !== null) ? license.UploadRenewedCopy : "";
                        $scope.LMLStatus = license.LStatus;
                        $scope.$applyAsync();
                    }
                    else { $scope.ResetLicenseData()}
                }).finally(function () {
                    $scope.hideLoader();  // Hide loader after fetching data
                });
    }
    $scope.ResetLicenseData = function () {

        $scope.LicenseList = [];
        $scope.filteredLicenses = [];

        $scope.LMStoreCode = "";
        $scope.LMRefStoreCode = "";
        $scope.LMLicenceRequstId = "";
        $scope.SetLT = "";
        $scope.LMRefStoreAddress = "";
        $scope.LMProposedDate = null;
        $scope.LMLicenseNamee = "";
        $scope.LMLicenseType = "";
        $scope.LMRequestedDate = null;
        $scope.LMDocDate = null;
        $scope.LMAppStatus = "";
        $scope.AppDate = null;
        $scope.LMAppcopy = "";
        $scope.LMchallanCopy = "";
        $scope.LMFeeCopy = "";
        $scope.LMLicenseStatus = "";
        $scope.LMLicensDate = null;
        $scope.LMLicenseNumber = "";
        $scope.LMValidityStartDate = null;
        $scope.LMValidityEndDate = null;
        $scope.LMLicenseCopy = "";
        $scope.LMUserName = "";
        $scope.LMUserPassword = "";
        $scope.LMMobileNumber = "";
        $scope.LMEmailId = "";
        $scope.LMTentativeDateofComp = null;
        $scope.LMoverday = "";
        $scope.LMActualCost = "";
        $scope.LMGovtFees = "";
        $scope.LMRenewalRequestDate = null;
        $scope.LMRenewalStartDate = null;
        $scope.LMRenewalEnddate = null;
        $scope.LMRenewalStatus = "";
        $scope.LMUploadRenewedCopy = "";
        $scope.LMLStatus = "";

    };

    $scope.LSave = function () {
        $scope.showLoader();
        var formData = new FormData();

        // Validate Application Date
        //if (!$scope.AppDate) {
        //    $('#AppDate').focus().addClass("red-validation");
        //    showMsgBox('999', 'Mandatory', 'Please select Application Date', 'warning', 'btn-warning');
        //    return;
        //}

       // if ($scope.LMAppStatus === 'Applied')
      //  {
            // Validate LM Application Status
            //if (!$scope.LMAppStatus) {
            //    $('#LMAppStatus').focus().addClass("red-validation");
            //    showMsgBox('999', 'Mandatory', 'Application Status is Required', 'warning', 'btn-warning');
            //    return;
            //}

            // Validate Application Copy
            //if (!$scope.LMAppcopy) {
            //    $('#LMAppcopy').focus().addClass("red-validation");
            //    showMsgBox('999', 'Mandatory', 'Application Copy is Required', 'warning', 'btn-warning');
            //    return;
            //}

            //// Validate Challan Copy
            //if (!$scope.LMchallanCopy && !$scope.UploadChallanCopy) {
            //    $('#LMchallanCopy').focus().addClass("red-validation");
            //    showMsgBox('999', 'Mandatory', 'Challan Copy is Required', 'warning', 'btn-warning');
            //    return;
            //}
       // }

        // Validate License Status
        if (!$scope.LMLicenseStatus) {
            $('#LMLicenseStatus').focus().addClass("red-validation");
            showMsgBox('999', 'Mandatory', 'Please select License Status', 'warning', 'btn-warning');
            return;
        }

        if ($scope.LMLicenseStatus === 'Issued') {
            // Validate License Date
            if (!$scope.LMLicensDate || isNaN(new Date($scope.LMLicensDate).getTime())) {
                $('#LMLicensDate').focus().addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'License Date is Required', 'warning', 'btn-warning');
                return;
            }

            // Validate Application Status for Issued License
            //if ($('#LMLicenseStatus').val() === 'Issued' && $('#LMAppStatus').val() !== 'Applied') {
            //    $('#LMAppStatus').focus().addClass("red-validation");
            //    showMsgBox('999', 'Alert', 'Application Status Should be Applied', 'warning', 'btn-warning');
            //    return;
            //}

            // Ensure License Date is after Application Date
            var IssuedDate = new Date($('#LMLicensDate').val());
            var ApplicationDate = new Date($('#AppDate').val());
            //if (IssuedDate < ApplicationDate) {
            //    $('#LMLicensDate').val('');
            //    showMsgBox('999', 'Mandatory', 'License Date Should be Greater than Application Date', 'warning', 'btn-warning');
            //    return;
            //}

            // Validate License Number
            if (!$scope.LMLicenseNumber) {
                $('#LMLicenseNumber').focus().addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'License Number is Required', 'warning', 'btn-warning');
                return;
            }

            // Validate Validity Start Date
            if (!$scope.LMValidityStartDate || isNaN(new Date($scope.LMValidityStartDate).getTime())) {
                $('#LMValidityStartDate').focus().addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'Validity Start Date is Required', 'warning', 'btn-warning');
                return;
            }

            // Validate Validity End Date
            if (!$scope.LMValidityEndDate || isNaN(new Date($scope.LMValidityEndDate).getTime())) {
                $('#LMValidityEndDate').focus().addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'Validity End Date is Required', 'warning', 'btn-warning');
                return;
            }

            // Ensure Validity End Date is after Validity Start Date
            var Sdate = new Date($('#LMValidityStartDate').val());
            var Edate = new Date($('#LMValidityEndDate').val());
            if (Sdate > Edate) {
                $('#LMValidityEndDate').val('');
                showMsgBox('999', 'Mandatory', 'Validity End Date Should be Greater than Validity Start Date', 'warning', 'btn-warning');
                return;
            }

            // Validate License Copy
            if (!$scope.LMLicenseCopy && !$scope.UploadLicenseCopy ) {
                $('#UploadLicenseCopy').focus().addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'License Copy is Required', 'warning', 'btn-warning');
                return;
            }
        }

        // Validate Mobile Number
        var smobileno = $('#MobileNumber').val();
        if (smobileno && (!/^\d{10}$/.test(smobileno))) {
            $('#LMMobileNumber').focus();
            showMsgBox("999", "Error", "Phone number must be 10 digits!", "warning", "btn-warning");
            return false;
        }

        // Validate Email
        var semail = $('#Email').val();
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (semail && !emailPattern.test(semail)) {
            $('#Email').focus().addClass("red-validation");
            showMsgBox("999", "Error", "Please enter a valid email address!", "warning", "btn-warning");
            return false;
        }

        if ($scope.UploadApplicationCopy == undefined || $scope.UploadApplicationCopy == null || $scope.UploadApplicationCopy == '') {
            if ($scope.LMAppcopy != '') {
                $scope.UploadApplicationCopy = $scope.LMAppcopy;
                $scope.AUploadApplicationCopy = 1;
            }
        }
        if ($scope.UploadChallanCopy == undefined || $scope.UploadChallanCopy == null || $scope.UploadChallanCopy == '') {
            if ($scope.LMchallanCopy != '') {
                $scope.UploadChallanCopy = $scope.LMchallanCopy;
                $scope.AUploadChallanCopy = 1;
            }
        }
        if ($scope.UploadFeesCopy == undefined || $scope.UploadFeesCopy == null || $scope.UploadFeesCopy == '') {
            if ($scope.LMFeeCopy != '') {
                $scope.UploadFeesCopy = $scope.LMFeeCopy;
                $scope.AUploadFeesCopy = 1;
            }
        }
        if ($scope.UploadLicenseCopy == undefined || $scope.UploadLicenseCopy == null || $scope.UploadLicenseCopy == '') {
            if ($scope.LMLicenseCopy != '') {
                $scope.UploadLicenseCopy = $scope.LMLicenseCopy;
                $scope.AUploadLicenseCopy = 1;
            }
        }

        if ($scope.UploadRenewedCopy == undefined || $scope.UploadRenewedCopy == null || $scope.UploadRenewedCopy == '') {
            if ($scope.LMRenewedCopy != '') {
                $scope.UploadRenewedCopy = $scope.LMRenewedCopy;
                $scope.AUploadRenewedCopy = 1;
            }
        }
         

        formData.append('UserId', LoginId);
        formData.append('Action', 2) 
        const FORMAT = "MM/DD/YYYY";
        formData.append('AUploadApplicationCopy', $scope.AUploadApplicationCopy);
        formData.append('AUploadChallanCopy', $scope.AUploadChallanCopy);
        formData.append('AUploadFeesCopy', $scope.AUploadFeesCopy);
        formData.append('AUploadLicenseCopy', $scope.AUploadLicenseCopy);
        formData.append('AUploadRenewedCopy', $scope.AUploadRenewedCopy);
        formData.append('AUploadInvoice', $scope.LMAUploadInvoice);
       
        formData.append('LicenceRequestId', $scope.LMLicenceRequstId);
        formData.append('ApplicationStatus', $scope.LMAppStatus);
        formData.append('ApplicationDate', moment($scope.AppDate).format(FORMAT));
        formData.append('UploadApplicationCopy', $scope.UploadApplicationCopy);
        formData.append('UploadChallanCopy', $scope.UploadChallanCopy);
        formData.append('UploadFeesCopy', $scope.UploadFeesCopy);
        formData.append('LicenseStatus', $scope.LMLicenseStatus);
        formData.append('IssuedDate', moment($scope.LMLicensDate).format(FORMAT));
        formData.append('LicenseNumber', $scope.LMLicenseNumber);
        formData.append('ValidityStartDate', moment($scope.LMValidityStartDate).format(FORMAT));

        formData.append('ValidityEndDate', moment($scope.LMValidityEndDate).format(FORMAT));
        formData.append('UploadLicenseCopy', $scope.UploadLicenseCopy);


        formData.append('RenewalStatus', $scope.LMRenewalStatus);
        formData.append('RenewalStartDate', moment($scope.LMRenewalStartDate).format(FORMAT));

        formData.append('RenewalEndDate', moment($scope.LMRenewalEnddate).format(FORMAT));
        formData.append('UploadRenewedCopy', $scope.UploadRenewedCopy);
        formData.append('UserName', $scope.LMUserName);
        formData.append('UserPassword', $scope.LMUserPassword);
        formData.append('MobileNumber', $scope.LMMobileNumber);
        formData.append('EmailId', $scope.LMEmailId);
        formData.append('TentativeDateofComp', $scope.LMTentativeDateofComp);
        formData.append('InvoiceStatus', $scope.LMInvoiceStatus);
        formData.append('InvoiceDate', moment($scope.LMInvoiceDate).format(FORMAT));
        formData.append('InvoiceNo', $scope.LMInvoiceNo);
        formData.append('InvoiceAmount', $scope.LMInvoiceAmount);
        formData.append('UploadInvoice', $scope.UploadInvoice);
        formData.append('PaymentStatus', $scope.LMPaymentStatus);
        formData.append('PaymentTAT', $scope.LMPaymentTAT);
        formData.append('PaymentDueDate', $scope.LMPaymentDueDate);
        formData.append('PaymentOverDueDate', $scope.LMoverday);
        formData.append('ActualCost', $scope.LMActualCost);
        formData.append('GovtFees', $scope.LMGovtFees);
        
        $.ajax({
            url: "../RetailSection/InsertUpdateDelLicenseRequest",
            type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function (response) {
                $scope.hideLoader();
                if (response == "Exception of type 'System.OutOfMemoryException' was thrown.") {
                    showMsgBox('999', 'Alert', 'Files too large , Please upload one by one. ', 'warning', 'btn-warning');
                    return;
                }
                var data = JSON.parse(response);
                if (showMsgBox(data.Result)) {
                    $scope.AUploadApplicationCopy = 0;
                    $scope.AUploadChallanCopy = 0;
                    $scope.AUploadFeesCopy = 0;
                    $scope.AUploadLicenseCopy = 0;
                    $scope.AUploadRenewedCopy = 0;
                    $scope.AUploadInvoice = 0;
                    $scope.UploadApplicationCopy = '';
                    $scope.UploadChallanCopy = '';
                    $scope.UploadChallanCopy = '';
                    $scope.UploadFeesCopy = '';
                    $scope.UploadLicenseCopy = '';
                    $scope.UploadRenewedCopy = '';
                    $scope.UploadInvoice = '';

                    $scope.LicenceRequstId = '';
                    $scope.GetLicenseRequestData(1);

                    setTimeout(() => {
                        $scope.FireEmail(8, $scope.LicenceRequstId, $scope.StoreCode);
                        angular.element('#closemodalrequestForm').triggerHandler('click');
                    }, 300);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error saving data: " + error);
                $scope.hideLoader();
            }
        });
    };
    
    $scope.SubmitLicense = function (license, Id) {

        $scope.showLoader();
        var formData = new FormData();
        //if (license.ApplicationStatus == '')
        //{
        //    $('#ApplicationStatus' + Id).focus();
        //    $('#ApplicationStatus' + Id).addClass("red-validation");
        //    $('#ApplicationStatus' + Id).focus();
        //    showMsgBox('999', 'Mandatory', 'Plese select Application Status', 'warning', 'btn-warning');
        //    return;
        //}
       
        //if (license.ApplicationStatus === 'Applied')
        //{
          
        //    if (license.ApplicationDate == '' || license.ApplicationDate == null || license.ApplicationDate == 'undefined' || license.ApplicationDate == 'Invalid Date') {
        //            if (license.ApplicationDate == '' || license.ApplicationDate == null || license.ApplicationDate == 'undefined' || license.ApplicationDate == 'Invalid Date') {
        //                $('#ApplicationStatus' + Id).removeClass("red-validation");
        //                $('#ApplicationDate' + Id).addClass("red-validation");
        //                $('#ApplicationDate' + Id).focus();
        //                showMsgBox('999', 'Mandatory', 'Application Date IS REQUIRED', 'warning', 'btn-warning');
                       
        //                return;
        //            }
        //        }
        //        if (license.UploadApplicationCopy == '' || license.UploadApplicationCopy == null) {
        //            if ($scope.UploadApplicationCopy == '' || $scope.UploadApplicationCopy == undefined) { 
        //                $('#ApplicationStatus' + Id).removeClass("red-validation");
        //                $('#ApplicationDate' + Id).removeClass("red-validation");
        //                $('#UploadApplicationCopy' + Id).addClass("red-validation");
        //                $('#ApplicationStatus' + Id).focus();
        //                showMsgBox('999', 'Mandatory', 'Application Copy IS REQUIRED', 'warning', 'btn-warning');
        //                return;
        //            }
        //        }
        //        if (license.UploadChallanCopy == '' || license.UploadChallanCopy == null)
        //        {
        //            if ($scope.UploadChallanCopy == '' || $scope.UploadChallanCopy == undefined) {
                       
        //                $('#ApplicationStatus' + Id).removeClass("red-validation");
        //                $('#ApplicationDate' + Id).removeClass("red-validation");
        //                $('#UploadApplicationCopy' + Id).removeClass("red-validation");
        //                $('#ChallanCopy' + Id).addClass("red-validation");
        //                $('#ApplicationStatus' + Id).focus();
        //                showMsgBox('999', 'Mandatory', 'Challan Copy IS REQUIRED', 'warning', 'btn-warning');
        //                return;
        //            }
        //        }
        //    }
          
        //    if (license.LicenseStatus == '') {
        //        $('#LicenseStatus' + Id).focus();
        //        $('#ApplicationStatus' + Id).removeClass("red-validation");
        //        $('#ApplicationDate' + Id).removeClass("red-validation");
        //        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
        //        $('#ChallanCopy' + Id).removeClass("red-validation");
        //        $('#LicenseStatus' + Id).addClass("red-validation");
        //        showMsgBox('999', 'Mandatory', 'Plese select License Status', 'warning', 'btn-warning');
        //        return;
        //    }
            if (license.LicenseStatus === 'Issued')
            {
                if (license.IssuedDate != '' || license.IssuedDate == null || license.IssuedDate == '')
                {
                    if (license.IssuedDate == '' || license.IssuedDate == 'undefined' || license.IssuedDate == 'Invalid Date') {
                        $('#IssuedDate' + Id).focus();
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                        $('#ChallanCopy' + Id).removeClass("red-validation");
                        $('#LicenseStatus' + Id).removeClass("red-validation");
                        $('#IssuedDate' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'License Date IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                //if ($('#LicenseStatus' + Id).val() === 'Issued') {
                //    if ($('#ApplicationStatus' + Id).val() != 'Applied')
                //    {
                //        $('#ApplicationStatus' + Id).focus();
                //        /* $('#LicenseStatus' + Id).val('');*/
                //        $('#LicenseStatus' + Id).addClass("red-validation");
                //        $('#ApplicationStatus' + Id).addClass("red-validation");
                //        showMsgBox('999', 'Alert', 'Application Status Should be Applied', 'warning', 'btn-warning');
                //        return;
                //    }
                //    else { $('#LicenseStatus' + Id).removeClass("red-validation"); }
                //}
                const today = new Date();
                const yyyy = today.getFullYear();
                let mm = today.getMonth() + 1; // Months start at 0!
                let dd = today.getDate();

                if (dd < 10) dd = '0' + dd;
                if (mm < 10) mm = '0' + mm;

                var TodayDate = yyyy + '-' + mm + '-' + dd;

                var IssuedDate = $('#IssuedDate' + Id).val();
                var ApplicationDate = $('#ApplicationDate' + Id).val();
                //if (IssuedDate < ApplicationDate) 
                //{
                //    $('#IssuedDate' + Id).val('');
                //    showMsgBox('999', 'Mandatory', 'License Date Should  be Greater than Application Date', 'warning', 'btn-warning');
                //    $('#IssuedDate' + Id).val('');
                //    return;
                //}
                //if (IssuedDate > TodayDate) {
                //    $('#IssuedDate' + Id).val('');
                //    showMsgBox('999', 'Mandatory', 'License Date Should Not be Greater than current Date', 'warning', 'btn-warning');
                //    $('#IssuedDate' + Id).val('');
                //    return;
                //}
                if (license.LicenseNumber == '' || license.LicenseNumber == null) {
                    if ($scope.LicenseNumber == '' || $scope.LicenseNumber == undefined) {
                        $('#LicenseNumber' + Id).focus();
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                        $('#ChallanCopy' + Id).removeClass("red-validation");
                        $('#LicenseStatus' + Id).removeClass("red-validation");
                        $('#IssuedDate' + Id).removeClass("red-validation");
                        $('#LicenseNumber' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'License Number IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                if (license.ValidityStartDate != '' || license.ValidityStartDate == null || license.ValidityStartDate == '') {
                    if (license.ValidityStartDate == '' || license.ValidityStartDate == 'undefined' || license.ValidityStartDate == 'Invalid Date' || license.ValidityStartDate == null) {
                        $('#ValidityStartDate' + Id).focus();
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                        $('#ChallanCopy' + Id).removeClass("red-validation");
                        $('#LicenseStatus' + Id).removeClass("red-validation");
                        $('#IssuedDate' + Id).removeClass("red-validation");
                        $('#LicenseNumber' + Id).removeClass("red-validation");
                        $('#ValidityStartDate' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'Validity Start Date IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                if (license.ValidityEndDate != '' || license.ValidityEndDate == null || license.ValidityEndDate == '') {

                    if (license.ValidityEndDate == '' || license.ValidityEndDate == 'undefined' || license.ValidityEndDate == 'Invalid Date' || license.ValidityEndDate == null) {
                        $('#ValidityEndDate' + Id).focus();
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                        $('#ChallanCopy' + Id).removeClass("red-validation");
                        $('#LicenseStatus' + Id).removeClass("red-validation");
                        $('#IssuedDate' + Id).removeClass("red-validation");
                        $('#LicenseNumber' + Id).removeClass("red-validation");
                        $('#ValidityStartDate' + Id).removeClass("red-validation");
                        $('#ValidityEndDate' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'Validity End Date IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                var Sdate = $('#ValidityStartDate' + Id).val();
                var Edate = $('#ValidityEndDate' + Id).val();
                if (Sdate > Edate) {
                    $('#ValidityEndDate' + Id).val('');
                    showMsgBox('999', 'Mandatory', 'Validity End Date Should be Greater than Validity Start Date', 'warning', 'btn-warning');
                    return;
                }
                if (license.UploadLicenseCopy == '' || license.UploadLicenseCopy == null) {
                    if ($scope.UploadLicenseCopy == '' || $scope.UploadLicenseCopy == undefined) {
                        $('#ValidityEndDate' + Id).removeClass("red-validation");
                        $('#UploadLicenseCopy' + Id).addClass("red-validation");
                        $('#ValidityEndDate' + Id).focus();
                        showMsgBox('999', 'Mandatory', 'License Copy IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
            }
            if ($('#MobileNumber' + Id) != '' || $('#MobileNumber' + Id) != undefined)
            {
                var txtmobileno = $('#MobileNumber' + Id);
                var smobileno = txtmobileno.val(); 
                var filter = /^[0-9]+$/;
                if (smobileno != "")
                {
                    if (filter.test(smobileno)) {
                        if (smobileno.length != 10) {
                            $('#MobileNumber' + Id).focus();
                            $('#ApplicationStatus' + Id).removeClass("red-validation");
                            $('#ApplicationDate' + Id).removeClass("red-validation");
                            $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                            $('#ChallanCopy' + Id).removeClass("red-validation");
                            $('#LicenseStatus' + Id).removeClass("red-validation");
                            $('#IssuedDate' + Id).removeClass("red-validation");
                            $('#LicenseNumber' + Id).removeClass("red-validation");
                            $('#ValidityStartDate' + Id).removeClass("red-validation");
                            $('#ValidityEndDate' + Id).removeClass("red-validation");
                            $('#MobileNumber' + Id).addClass("red-validation");
                            showMsgBox("Phone number must be 10 digits!");
                            return false;
                        }
                    }
                } 
            }
            if ($('#Email' + Id) != '' || $('#Email' + Id) != undefined)
            {
                var txtemail = $('#Email' + Id);
                var semail = txtemail.val();
                var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/; 
                if (semail != "") {
                    if (filter.test(semail))
                    {
                      
                    }
                    else {
                        $('#Email' + Id).focus();
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                        $('#ChallanCopy' + Id).removeClass("red-validation");
                        $('#LicenseStatus' + Id).removeClass("red-validation");
                        $('#IssuedDate' + Id).removeClass("red-validation");
                        $('#LicenseNumber' + Id).removeClass("red-validation");
                        $('#ValidityStartDate' + Id).removeClass("red-validation");
                        $('#ValidityEndDate' + Id).removeClass("red-validation");
                        $('#MobileNumber' + Id).Email("red-validation");
                        $('#Email' + Id).addClass("red-validation");
                        showMsgBox("Please fill correct e-mail address!");
                        return false;
                    }
                } 
            }
            //if (license.InvoiceStatus == '')
            //{
            //    $('#InvoiceStatus' + Id).focus();
            //    $('#ApplicationStatus' + Id).removeClass("red-validation");
            //    $('#ApplicationDate' + Id).removeClass("red-validation");
            //    $('#UploadApplicationCopy' + Id).removeClass("red-validation");
            //    $('#ChallanCopy' + Id).removeClass("red-validation");
            //    $('#LicenseStatus' + Id).removeClass("red-validation");
            //    $('#IssuedDate' + Id).removeClass("red-validation");
            //    $('#LicenseNumber' + Id).removeClass("red-validation");
            //    $('#ValidityStartDate' + Id).removeClass("red-validation");
            //    $('#ValidityEndDate' + Id).removeClass("red-validation");
            //    $('#MobileNumber' + Id).removeClass("red-validation");
            //    $('#Email' + Id).removeClass("red-validation");
            //    $('#InvoiceStatus' + Id).addClass("red-validation");
            //    showMsgBox('999', 'Mandatory', 'Plese select Invoice Status', 'warning', 'btn-warning');
            //    return;
            //}
           
            //if (license.InvoiceStatus === 'Done')
            //{
                
            //    if (license.InvoiceNo == '' || license.InvoiceNo == null || license.InvoiceNo == undefined) {
            //        if (license.InvoiceNo == '' || license.InvoiceNo == undefined) {
            //            $('#InvoiceNo' + Id).focus();
            //            $('#InvoiceDate' + Id).removeClass("red-validation");
            //            $('#InvoiceNo' + Id).addClass("red-validation");
            //            showMsgBox('999', 'Mandatory', 'Invoice No IS REQUIRED', 'warning', 'btn-warning');
            //            return;
            //        }
            //    }
            //    if (license.InvoiceAmount != '' || license.InvoiceAmount == null || license.InvoiceAmount == '') {
            //        if (license.InvoiceAmount == '' || license.InvoiceAmount == 'undefined' || license.InvoiceAmount == 'Invalid Date' || license.InvoiceAmount == null) {
            //            $('#InvoiceAmount' + Id).focus();
            //            $('#InvoiceNo' + Id).removeClass("red-validation");
            //            $('#InvoiceAmount' + Id).addClass("red-validation");
            //            showMsgBox('999', 'Mandatory', 'Invoice Amount IS REQUIRED', 'warning', 'btn-warning');
            //            return;
            //        }
            //    }
            //    if (license.InvoiceDate != '' || license.InvoiceDate == null || license.InvoiceDate == '') {
            //        if (license.InvoiceDate == '' || license.InvoiceDate == 'undefined' || license.InvoiceDate == 'Invalid Date') {
            //            $('#InvoiceStatus' + Id).removeClass("red-validation");
            //            $('#InvoiceDate' + Id).addClass("red-validation");
            //            $('#InvoiceDate' + Id).focus();
            //            showMsgBox('999', 'Mandatory', 'Invoice Date IS REQUIRED', 'warning', 'btn-warning');
            //            return;
            //        }
            //    }
            //    if (license.UploadInvoice == '' || license.UploadInvoice == null) {
            //        if ($scope.UploadInvoice == '' || $scope.UploadInvoice == undefined) {
            //            $('#InvoiceNo' + Id).focus();
            //            $('#InvoiceAmount' + Id).removeClass("red-validation");
            //            $('#InvoiceCopy' + Id).addClass("red-validation");
            //            showMsgBox('999', 'Mandatory', 'Upload Invoice IS REQUIRED', 'warning', 'btn-warning');
            //            return;
            //        }
            //    }

            //} 
            if ($scope.UploadApplicationCopy == undefined || $scope.UploadApplicationCopy == null || $scope.UploadApplicationCopy == '')
            {
                if (license.UploadApplicationCopy != '')
                {
                    $scope.UploadApplicationCopy = license.UploadApplicationCopy;
                    $scope.AUploadApplicationCopy = 1;
                } 
            }
            if ($scope.UploadChallanCopy == undefined || $scope.UploadChallanCopy == null || $scope.UploadChallanCopy == '') {
                if (license.UploadChallanCopy != '') {
                    $scope.UploadChallanCopy = license.UploadChallanCopy;
                    $scope.AUploadChallanCopy = 1;
                }
            }
            if ($scope.UploadFeesCopy == undefined || $scope.UploadFeesCopy == null || $scope.UploadFeesCopy == '') {
                if (license.UploadFeesCopy != '') {
                    $scope.UploadFeesCopy = license.UploadFeesCopy;
                    $scope.AUploadFeesCopy = 1;
                }
            }
            if ($scope.UploadLicenseCopy == undefined || $scope.UploadLicenseCopy == null || $scope.UploadLicenseCopy == '') {
                if (license.UploadLicenseCopy != '') {
                    $scope.UploadLicenseCopy = license.UploadLicenseCopy;
                    $scope.AUploadLicenseCopy = 1;
                }
            }
            
            if ($scope.UploadRenewedCopy == undefined || $scope.UploadRenewedCopy == null || $scope.UploadRenewedCopy == '') {
                if (license.UploadRenewedCopy != '') {
                    $scope.UploadRenewedCopy = license.UploadRenewedCopy;
                    $scope.AUploadRenewedCopy = 1;
                }
            }
            if ($scope.UploadInvoice == undefined || $scope.UploadInvoice == null || $scope.UploadInvoice == '') {
                if (license.UploadInvoice != '') {
                    $scope.UploadInvoice = license.UploadInvoice;
                    $scope.AUploadInvoice = 1;
                }
            }

        formData.append('UserId', LoginId);
        formData.append('Action', 2);
        const FORMAT = "MM/DD/YYYY";
        formData.append('AUploadApplicationCopy', $scope.AUploadApplicationCopy);
        formData.append('AUploadChallanCopy', $scope.AUploadChallanCopy);
        formData.append('AUploadFeesCopy', $scope.AUploadFeesCopy);
        formData.append('AUploadLicenseCopy', $scope.AUploadLicenseCopy);
        formData.append('AUploadRenewedCopy', $scope.AUploadRenewedCopy);
        formData.append('AUploadInvoice', $scope.AUploadInvoice);
        $scope.LicenceRequstId = license.LicenceRequstId;
        $scope.StoreCode = license.StoreCode;
        formData.append('LicenceRequestId', license.LicenceRequstId);
        formData.append('ApplicationStatus', license.ApplicationStatus);
        formData.append('ApplicationDate', moment(license.ApplicationDate).format(FORMAT));  
        formData.append('UploadApplicationCopy', $scope.UploadApplicationCopy);
        formData.append('UploadChallanCopy', $scope.UploadChallanCopy);
        formData.append('UploadFeesCopy', $scope.UploadFeesCopy);
        formData.append('LicenseStatus', license.LicenseStatus);
        formData.append('IssuedDate', moment(license.IssuedDate).format(FORMAT)); 
        formData.append('LicenseNumber', license.LicenseNumber);
        formData.append('ValidityStartDate', moment(license.ValidityStartDate).format(FORMAT)); 
      
        formData.append('ValidityEndDate', moment(license.ValidityEndDate).format(FORMAT));
        formData.append('UploadLicenseCopy', $scope.UploadLicenseCopy);
        formData.append('RenewalStatus', license.RenewalStatus);
        formData.append('RenewalStartDate', moment(license.RenewalStartDate).format(FORMAT));
        
        formData.append('RenewalEndDate', moment(license.RenewalEndDate).format(FORMAT));
        formData.append('UploadRenewedCopy', $scope.UploadRenewedCopy);
        formData.append('UserName', license.UserName);
        formData.append('UserPassword', license.UserPassword);
        formData.append('MobileNumber', license.MobileNumber);
        formData.append('EmailId', license.EmailId);
        formData.append('TentativeDateofComp', license.TentativeDateofComp);
        formData.append('InvoiceStatus', license.InvoiceStatus);
        formData.append('InvoiceDate',  moment(license.InvoiceDate).format(FORMAT)); 
        formData.append('InvoiceNo', license.InvoiceNo);
        formData.append('InvoiceAmount', license.InvoiceAmount);
        formData.append('UploadInvoice', $scope.UploadInvoice);
        formData.append('PaymentStatus', license.PaymentStatus);
        formData.append('PaymentTAT', license.PaymentTAT);
        formData.append('PaymentDueDate', license.PaymentDueDate);
        formData.append('PaymentOverDueDate', license.PaymentOverDueDate);
        formData.append('ActualCost', license.ActualCost);
        formData.append('GovtFees', license.GovtFees); 
         
        $.ajax({
            url: "../RetailSection/InsertUpdateDelLicenseRequest",
            type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function (response)
            {
                $scope.hideLoader();
                if (response == "Exception of type 'System.OutOfMemoryException' was thrown.") {
                    showMsgBox('999', 'Alert', 'Files too large , Please upload one by one. ', 'warning', 'btn-warning');
                    return;
                }
                var data = JSON.parse(response);
                if (showMsgBox(data.Result)) {
                    $scope.AUploadApplicationCopy = 0;
                    $scope.AUploadChallanCopy = 0;
                    $scope.AUploadFeesCopy = 0;
                    $scope.AUploadLicenseCopy = 0;
                    $scope.AUploadRenewedCopy = 0;
                    $scope.AUploadInvoice = 0;
                    $scope.UploadApplicationCopy = '';
                    $scope.UploadChallanCopy  ='';
                    $scope.UploadFeesCopy  ='';
                    $scope.UploadLicenseCopy  ='';
                    $scope.UploadRenewedCopy  ='';
                    $scope.UploadInvoice = '';
                
                    $scope.LicenceRequstId = '';
                    $scope.GetLicenseRequestData();
                    setTimeout(function () {
                        $scope.FireEmail(8, $scope.LicenceRequstId, $scope.StoreCode);
                        $scope.hideLoader();
                    }, 300);
                   
              
                }
            },
            error: function (xhr, status, error) {
                $scope.hideLoader();
                console.error("Error saving employee data: " + error);
            }
        });

    }

    function formatDate(dateString) {
        //if (dateString) {
        //    var date = new Date(dateString);
        //    return date.toISOString().split('T')[0];
        //}
        return null;
    }

    //$scope.viewDocument = function (documentPath) {
    //    if (documentPath != null)
    //    {
    //        $scope.openDocumentFunction(documentPath);
    //    }
      
    //};
    //$scope.openDocumentFunction = function (documentPath) {
    //    window.open(documentPath, '_blank');
    //};
    $scope.viewDocument = function (documentPath, fileName) {
        var link = document.createElement("a");
        link.href = documentPath;
        link.download = fileName || documentPath.split('/').pop(); // Use provided name or extract from path
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    $scope.loadData = function () {
        $scope.showLoader();
       
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.Id = LoginId;
        collectionobj.StoreId = $scope.StoreId;
        var getData = myService.methode('POST', ("../Retail/SearchStoreComplianceStatusMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreComplianceStatusList = response.data.Result;
            $scope.TotalupoadDoc = response.data.Result[0].Totalupoad;
            $scope.TotalVerify = response.data.Result[0].TotalVerify;
            var Totalupoad = response.data.Result[0].Totalupoad;
            var TotPer = response.data.Result[0].TotPer;
            Bindgra(Totalupoad, TotPer);
            $scope.hideLoader();
        });
        collectionobj.PartyId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLicenseAndRegistrationBy"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LoadMasterList = response.data.Result; 

            // Use a Set to store unique combinations of storeCode and licenseName
           

            $scope.hideLoader();
        });
        $scope.hideLoader();

        $scope.hideLoader();
    }; 
    var LicenceId = '';
    $scope.DeleteRecord = function (LicenceRequstId) {
       
        LicenceId = LicenceRequstId;
        deleteConfirmbox("Do you want to delete this record?", $scope.AfterDeleteRecord);
    };
    $scope.AfterDeleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LicenceRequestId = LicenceId;
        var getData = myService.methode('POST', ("../RetailSection/ApprovalUpdate"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            LicenceId = ''; 
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
            $scope.GetLicenseRequestData();
        });
    };
       
    $scope.ApprovalRecord = function (Id) {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LicenceRequestId =Id;  
        var getData = myService.methode('POST', ("../RetailSection/ApprovalUpdate"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            showMsgBox('999', 'Approved', response.data.Result, 'success', 'btn-success'); 
            $scope.loadData();
        });
    };
    var Id = '';
    $scope.SetValue = function (ID, fuCandidatePhoto) {
        Id = ID;
        $(fuCandidatePhoto).click();
    }
    $scope.show = function (input, img) {
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.fileupload = e.target.result;
                $scope.UploadDocCompliance($scope.fileupload, Id);
                $scope.$applyAsync(); 
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        
    };
    $scope.UploadDocCompliance = function (fileupload, Id)
    {
        if ($scope.StoreId == '' || $scope.StoreId == undefined)
        {
            showMsgBox('999', 'Alert', 'Please Select Atlest one Store', 'warning', 'btn-warning');
            return;
        }
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 2;
        collectionobj.UFile = fileupload;
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        collectionobj.StoreId = $scope.StoreId;
        var getData = myService.methode('POST', ("../RetailSection/UploadComplianceDoc"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.loadData();
            showMsgBox(response.data.Result);
           
        });
    };

    $scope.VerifyDoc = function (Id)
    {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 3; 
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        collectionobj.Verify = 1;
        collectionobj.StoreId = $scope.StoreId;
        var getData = myService.methode('POST', ("../RetailSection/UploadComplianceDoc"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.loadData();
            showMsgBox('999', 'Approved', response.data.Result, 'success', 'btn-success');
          
        });
    };
    $scope.ChkNo = function (Id) {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        collectionobj.Verify = 0;
        collectionobj.StoreId = $scope.StoreId;
        var getData = myService.methode('POST', ("../RetailSection/UploadComplianceDoc"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.loadData();
            showMsgBox('999', 'Alert', response.data.Result, 'success', 'btn-success');

        });
    };
    $scope.ChkYES = function (Id) {
        debugger;
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        collectionobj.Verify = 1;
        collectionobj.StoreId = $scope.StoreId;
        var getData = myService.methode('POST', ("../RetailSection/UploadComplianceDoc"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.loadData();
            showMsgBox('999', 'Alert', response.data.Result, 'success', 'btn-success');

        });
    };
    $scope.GetStoreMaster = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreList = response.data.Result;
            if (response.data.Result.length > 0)
            {
                var tot = response.data.Result.length - 1;
                $scope.StoreId = response.data.Result[tot].StoreId;
                $scope.StoreCode = response.data.Result[tot].StoreCode;
            }
            setTimeout(function () {
                $scope.loadData();
            }, 100);
        
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };
    $scope.SearchStore = function (StoreCode) {
        $scope.ISopen = true;
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 7;
        collectionobj.Id = LoginId;
        collectionobj.StoreCode = StoreCode;
        var getData = myService.methode('POST', ("../RetailSection/GetStoreMaster"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreList = response.data.Result;

            $scope.hideLoader();
        });
        $scope.hideLoader();
    };

    
    $scope.ddlSelectStoreValue = function (StoreId, StoreCode) {
        $scope.ISopen = false;
        $scope.StoreId = StoreId;
        $scope.StoreCode = StoreCode;
        $scope.SearchValue = StoreCode;
        $scope.loadData(StoreId);
    }
    //---------------------------------------------------------Notice
    $scope.BindNoticeStoreStatus = function (DepartmentId) {
        $scope.showLoader();
        var collectionobj = {}; 
        collectionobj.Action = 8;
        collectionobj.StoreId = $scope.NStoreId;
        collectionobj.DepartmentId = DepartmentId;
        collectionobj.LoginAs = loginType;
        var getData = myService.methode('POST', ("../RetailSection/GetNoticeList"), JSON.stringify(collectionobj));
        getData.then(function (response)
        {
            $scope.DocStage = response.data.Result[0].DocStage;
            if ($scope.DocStage == 'First Stage' && $scope.LoginAs == 'Client')
            {
                $scope.DocStatus = 'open';
            } 
            else if ($scope.DocStage == 'Submittion Stage' && $scope.LoginAs == 'Executer')
            {
                $scope.DocStatus = 'open';
            }
            else if ($scope.DocStage == 'Submittion Stage' && $scope.LoginAs == 'Admin')
            {
                $scope.DocStatus = 'open';
            } 
            else if ($scope.DocStage == 'Final Stage' && $scope.LoginAs == 'Executer')
            { 
                $scope.DocStatus = 'open';
            }
            else if ($scope.DocStage == 'Final Stage' && $scope.LoginAs == 'Admin')
            {
                $scope.DocStatus = 'open';
            }
            else {
                $scope.DocStatus = 'close';
            }
            $scope.$applyAsync();
            $scope.hideLoader();
        });
    }

    $scope.DocStage = '-1';
    $scope.BindNoticeStoreList =function()
    {
        $scope.showLoader();
        var collectionobj = {};
        if ($scope.LoginAs == 'Client') {
            collectionobj.Action = 4;
        } 
        else { collectionobj.Action = 7; }
      
        collectionobj.Id = LoginId;
        collectionobj.LoginAs = loginType;
        var getData = myService.methode('POST', ("../RetailSection/GetNoticeList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.NoticeStoreList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindNoticeDepartment = function (NStoreId) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = LoginId;
        collectionobj.LoginAs = $scope.LoginAs;
        collectionobj.StoreId = NStoreId;
        var getData = myService.methode('POST', ("../RetailSection/GetNoticeList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.NoticeDepartmentList = response.data.Result;
          
            $scope.hideLoader();
        });
    }
    
    $scope.BindNoticeUpload = function (input, imgfileid) {
        fileName = document.querySelector('#fNoticeUpload').value;
        if (fileName != "")
        {
            extension = fileName.substring(fileName.lastIndexOf('.') + 1);
            if (extension == 'jpg')
            {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope.NoticeUpload = e.target.result;
                        $scope.$applyAsync();
                    }
                    filerdr.readAsDataURL(input.files[0]);
                }
                else {
                    $scope.NoticeUpload = '';
                    $scope.$applyAsync();
                } 
            }
            else if (extension == 'png')
            {
              if (input.files && input.files[0]) {
                var filerdr = new FileReader();
                filerdr.onload = function (e) {
                    $scope.NoticeUpload = e.target.result;
                    $scope.$applyAsync();
                }
                filerdr.readAsDataURL(input.files[0]);
            }
            else {
                $scope.NoticeUpload = '';
                $scope.$applyAsync();
            }
          }
            else if( extension == 'pdf')
            {
                if (input.files && input.files[0]) {
                    var filerdr = new FileReader();
                    filerdr.onload = function (e) {
                        $scope.NoticeUpload = e.target.result;
                        $scope.$applyAsync();
                    }
                    filerdr.readAsDataURL(input.files[0]);
                }
                else {
                    $scope.NoticeUpload = '';
                    $scope.$applyAsync();
                }
            }
            else
            {
                showMsgBox('999', 'Rejected', 'File Not Correct Format,please Upload in jpg,png or pdf format', 'warning', 'btn-warning');
                return;
            }
        };
    }


    $scope.SaveRecord = function () {

        if ($scope.NoticeUpload == '' || $scope.NoticeUpload == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Attachment', 'warning', 'btn-warning');
            return;
        }
        else {
            $scope.AfterSave();
        }

    }

    var IdFM = '';
    $scope.AfterSave = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.UserId = LoginId;
            collectionobj.StoreId = $scope.NStoreId;
            collectionobj.DepartmentId = $scope.DepartmentId;
            collectionobj.NoticeUpload = $scope.NoticeUpload; 
            if ($scope.DocStage == 'First Stage')
            {
                if ($scope.LoginAs == 'Client')
                {
                    collectionobj.Action = '1';
                    $scope.IdFM = MapId;
                }
                else
                {
                    showMsgBox('999', 'Alert', 'Client only Register Report Notice', 'warning', 'btn-warning');
                    return;
                }
               
            
            }
            else if ($scope.DocStage == 'Submittion Stage')
            {
                if ($scope.LoginAs != 'Client') {
                    collectionobj.Action = '2';
                    $scope.IdFM = LoginId;
                }
                else {
                    showMsgBox('999', 'Alert', 'Admin/Executer only Submitted Report Notice', 'warning', 'btn-warning');
                    return;
                }
               
            }
            else if ($scope.DocStage == 'Final Stage')
            {
                if ($scope.LoginAs != 'Client') {
                    collectionobj.Action = '3';
                    $scope.IdFM = LoginId;
                }
                else {
                    showMsgBox('999', 'Alert', 'Admin/Executer only Submitted Report Notice', 'warning', 'btn-warning');
                    return;
                }
            }
           
            var getData = myService.methode('POST', ("../RetailSection/InsertUpdateNotice"), JSON.stringify(collectionobj));
            getData.then(function (response)
            {
                showMsgBox('999', 'Alert', response.data.Result, 'warning', 'btn-warning');
                $('#closeId').click();
                 $scope.BindNoticeClient();
                 $scope.FireEmail(9, LoginId, $scope.NStoreId)
                $scope.ClearControl();
               
               
            });
        }
    }

    $scope.ClearControl=function()
    {
        $scope.NStoreId = '';
        $scope.DepartmentId = '';
        $scope.NoticeUpload = '';
        $scope.ReceiptDate = '';
        $scope.DocStage = '-1';
        $("#fNoticeUpload").val('');
    }
    $scope.BindNoticeClient= function()
    {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = LoginId;
        collectionobj.LoginAs = $scope.LoginAs;
        var getData = myService.methode('POST', ("../RetailSection/GetNoticeList"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.NoticeClientList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindExecuter = function () {
     
        //var collectionobj = {};
        //collectionobj.ActionType = 10; 
        //collectionobj.Id = LoginId;
        //var getData = myService.methode('POST', ("../RetailSection/SearchCompliance"), JSON.stringify(collectionobj));
        //getData.then(function (response) {

        //    $scope.LoginAs = response.data.Result[0].LoginAs;
        //    if (loginType == '1')
        //    {
        //        $scope.LoginAs = 'Admin';
        //    }
        //    if ($scope.LoginAs == 'Executer')
        //    {
        //        $scope.loginType = '1'
        //    }
           
            $scope.GetLicenseRequestData(); 
            //$scope.BindNoticeStoreList();
            //$scope.BindNoticeClient();
            $scope.Funcationlitycheck();
            $scope.$applyAsync();
      /*  });*/
        $scope.hideLoader();
    };

    //-------------------------End Notice
    //-----------------------------Excelation Process

    
    $scope.BindEscalation = function () {

        var collectionobj = {};
        collectionobj.ActionType = 3;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/SearchEscalation"), JSON.stringify(collectionobj));
        getData.then(function (response)
        {
            $scope.ExecuterId = response.data.Result[0].ExecuterId,
            $scope.ExecuterName = response.data.Result[0].ExecuterName
            $scope.ExecuterMobile = response.data.Result[0].ExecuterMobile
            $scope.ExecuterEmail = response.data.Result[0].ExecuterEmail
            $scope.Escalation1 = response.data.Result[0].Escalation1
            $scope.Escalation1Name = response.data.Result[0].Escalation1Name
            $scope.Escalation1Mobile = response.data.Result[0].Escalation1Mobile
            $scope.Escalation1Email = response.data.Result[0].Escalation1Email
            $scope.Escalation2 = response.data.Result[0].Escalation2
            $scope.Escalation2Name = response.data.Result[0].Escalation2Name
            $scope.Escalation2Mobile = response.data.Result[0].Escalation2Mobile
            $scope.Escalation2Email = response.data.Result[0].Escalation2Email
            $scope.Escalation3 = response.data.Result[0].Escalation3
            $scope.Escalation3Name = response.data.Result[0].Escalation3Name
            $scope.Escalation3Mobile = response.data.Result[0].Escalation3Mobile
            $scope.Escalation3Email = response.data.Result[0].Escalation3Email
        });
       
    };
    $scope.BindIStore = function () {

        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/SearchEscalation"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.eStoreList = response.data.Result;
        }); 
    };
    $scope.BindILicence = function () { 
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.UserId = $scope.eStoreId1;
        var getData = myService.methode('POST', ("../RetailSection/SearchEscalation"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.eLicenceList = response.data.Result;
        });
    };
    
   
    $scope.SaveComplianceEsc = function ()
    {
        if ($scope.eStoreId1 == '' || $scope.eStoreId1 ==undefined)
        {
            showMsgBox('999', 'Alert', 'Enter Store Code', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.Remark1 == '' || $scope.Remark1 == undefined) {
            showMsgBox('999', 'Alert', 'Enter Remark', 'warning', 'btn-warning');
            return;
        }
        else
        {
            var collectionobj = {};
            collectionobj.ActionType = 6;
            collectionobj.ClientId = LoginId;
            collectionobj.StoreCode = $scope.eStoreId1;
            collectionobj.Escalation1 = $scope.Escalation1;
            collectionobj.Escalation2 = $scope.Escalation2;
            collectionobj.Remark = $scope.Remark1;
            var getData = myService.methode('POST', ("../RetailSection/IUDEscalation"), JSON.stringify(collectionobj));
            getData.then(function (response)
            {
                $scope.Remark1 == '';
                $scope.eStoreId1 == '';
                $('#btnclose1').click();
                $scope.MessageReturn = response.data.Result ;
                $('#showmsgid').click();
                $scope.getRetailNotification();
            });
        };
    }
    $scope.SaveLicenceEsc = function () {
        if ($scope.eStoreId1 == '' || $scope.eStoreId1 == undefined) {
            showMsgBox('999', 'Alert', 'Enter Store Code', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.eLicenseId == '' || $scope.eLicenseId == undefined) {
            showMsgBox('999', 'Alert', 'Enter License', 'warning', 'btn-warning');
            return;
        }
        else if ($scope.Remark2 == '' || $scope.Remark2 == undefined) {
            showMsgBox('999', 'Alert', 'Enter Remark', 'warning', 'btn-warning');
            return;
        }
        
        else {
            var collectionobj = {};
            collectionobj.ActionType = 6;
            collectionobj.ClientId = LoginId;
            collectionobj.StoreCode = $scope.eStoreId1;
            collectionobj.LicenceId = $scope.eLicenseId;
            collectionobj.Escalation1 = $scope.Escalation1;
            collectionobj.Escalation2 = $scope.Escalation2;
            collectionobj.Remark = $scope.Remark2;
            var getData = myService.methode('POST', ("../RetailSection/IUDEscalation"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.Remark1 == '';
                $scope.eStoreId1 == '';
                $('#btnclose2').click();
                $scope.MessageReturn = response.data.Result;
                $('#showmsgid').click();
                $scope.getRetailNotification();
            });
        };
    }
    
    $scope.BindTicket = function () {
        var collectionobj = {};
        collectionobj.ActionType = 11;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/SearchEscalation"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.TicketList = response.data.Result;
        });
    };
    $scope.BindIDetail = function ()
    {
        setTimeout(function () {
            $scope.FilerList = $filter('filter')($scope.TicketList, { 'Title': $scope.TicketId });
            $scope.RemarkLevel2 = 'Remark : ' + $scope.FilerList[0].Remark;
            $scope.Escalation1RemarkLevel2 = $scope.FilerList[0].Escalation1Remark;
            $scope.Escalation2RemarkLevel2 = $scope.FilerList[0].Escalation2Remark;
        }, 50);
       
    }
    $scope.SaveEscalation = function () {
        if ($scope.TicketId == '' || $scope.TicketId == undefined) {
            showMsgBox('999', 'Alert', 'Enter Ticket Id', 'warning', 'btn-warning');
            return;
        } 
        else {
            var collectionobj = {};
            collectionobj.ActionType = 10; 
            collectionobj.Id = $scope.TicketId;
            var getData = myService.methode('POST', ("../RetailSection/IUDEscalation"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.TicketId == ''; 
                $('#btnclose2').click();
                $scope.MessageReturn = response.data.Result;
                $('#showmsgid').click();
                $scope.getRetailNotification();
            });
        };
    }
    $scope.CheckBulkTocheckout = function (license)
    {
        const isChecked = $("#chk" + license.LicenceRequstId).is(":checked");
        var collectionobj = {};
        if (isChecked == true) {
            collectionobj.Action = 7;
        } else {
            collectionobj.Action = 9;
        } 
            collectionobj.StoreCode = license.StoreCode;
            collectionobj.LicenceId = license.LicenseName;
            collectionobj.Amount = license.InvoiceAmount;
            collectionobj.LicenceReqId = license.LicenceRequstId;
            collectionobj.Id = LoginId;
            var getData = myService.methode('POST', ("../RetailSection/IUDPayment"), JSON.stringify(collectionobj));
            getData.then(function (response) {

            }); 
        

    }

    $scope.RedirectTocheckout = function (license)
    {
        if (license.InvoiceAmount == '' || license.InvoiceAmount == undefined)
        {
            showMsgBox('999', 'Alert', "PLEASE ENTER AMOUNT", 'warning', 'btn-warning');
            return;
        }
        else
        {
            var collectionobj = {};
            collectionobj.Action = 1;
            collectionobj.StoreCode = license.StoreCode;
            collectionobj.LicenceId = license.LicenseName;
            collectionobj.Amount = license.InvoiceAmount;
            collectionobj.LicenceReqId = license.LicenceRequstId;
            collectionobj.Id = LoginId;
            var getData = myService.methode('POST', ("../RetailSection/IUDPayment"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (response.data.Result == '-1') {
                    showMsgBox('999', 'Alert', "Already Attached", 'warning', 'btn-warning');
                }
                else { window.top.location.href = '../RetailSection/checkout'; }

            });
        }
     
      
    }
    $scope.Deletecheckout = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 3; 
        collectionobj.Id = Id;
        var getData = myService.methode('POST', ("../RetailSection/IUDPayment"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.GetCheckout();
        });

    }
    //=======================================
    $scope.InsertPaymentProcess = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/IUDPayment"), JSON.stringify(collectionobj));
        getData.then(function (response)
        {
             $scope.CreateToken(response.data.Result); 
        }); 
    }
    $scope.CreateToken = function (OrderId) {
        var collectionobj = {};
        collectionobj.Id = Id;
        collectionobj.ContactNo = $scope.ContactNo;
        collectionobj.EmailId = $scope.EmailId;
        collectionobj.Name = $scope.UserName;
        collectionobj.TotalAmount = $scope.TotalAmount;
        collectionobj.OrderId =  OrderId;
        var getData = myService.methode('POST', '../Paymentgateway/btnCheckout', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            document.write(response.data)
        });
    };

    //=======================
    $scope.GetCheckout = function () {
        var collectionobj = {};
        collectionobj.Action  = 4;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/SearchPayment"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (response.data.Result.length > 0)
            {
                $scope.CheckOutList = response.data.Result;
                $scope.TotalAmount = response.data.Result[0].TotalAmount;
                $scope.UserName = response.data.Result[0].UserName;
                $scope.EmailId = response.data.Result[0].EmailId;
                $scope.ContactNo = response.data.Result[0].ContactNo;
                $scope.Totallength = response.data.Result.length;
            }
            else {
                $scope.CheckOutList = response.data.Result;
                $scope.Totallength = response.data.Result.length;
                $scope.TotalAmount = '0';
            }
        });
    };
    $scope.SetSessionforConfirm=function()
    {
        var collectionobj = {};
        collectionobj.Id = (window.location.href.slice(window.location.href.indexOf('?') + 1).split('&'))[0];
      
        collectionobj.Action = 8; 
        var getData = myService.methode('POST', ("../RetailSection/SearchPayment"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.OrderId = response.data.Result[0].OrderId
            $scope.TransId = response.data.Result[0].TransId
            $scope.Amount = response.data.Result[0].TotalAmount
            $scope.PaymentStatus = response.data.Result[0].PaymentStatus
            $scope.ResponseCompleteOn = response.data.Result[0].ResponseCompleteOn
            if ($scope.PaymentStatus == 'SUCCESS')
            {
                $scope.resmsg = 'Your payment has been successfully done.';
            }
            else {
                $scope.resmsg = 'Your payment was not successfully processed.';
            } 
            $scope.FireEmail(11, $scope.OrderId,LoginId)
        });
       
    }
   

    $scope.ExportPdf = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = { 
                Action: 4,
            UserId: LoginId,
            PageNo:  1,
            PageSize: 999999,
            Searchby: $('#myInput').val()
        };  
        myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.LicenseForExport = response.data.Result; // Store data for export
                    var dataToExport = $scope.LicenseForExport;
                    $scope.ExportToPDF(dataToExport);
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };

    /////Added by shipra //////////////

    $scope.DownloadAllFiles = function (fieldName, label) {
        $scope.showLoader();

        var collectionobj = {
            Action: 4,
            UserId: LoginId,
            PageNo: 1,
            PageSize: 999999,
            Searchby: $('#myInput').val()
        };

        function sanitizeFileName(name) {
            return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
        }

        // ✅ Ensure checkbox is selected
        var selectedCheckboxes = document.querySelectorAll(".select-license-checkbox:checked");
        if (selectedCheckboxes.length === 0) {
            alert("Please select at least one record.");
            $scope.hideLoader();
            return;
        }

        var selectedStoreCodes = new Set();

        selectedCheckboxes.forEach(cb => {
            try {
                var scope = angular.element(cb).scope();
                var license = scope.license;
                if (license && license.StoreCode) {
                    selectedStoreCodes.add(license.StoreCode);
                }
            } catch (e) {
                console.warn("Failed to get license from checkbox:", e);
            }
        });

        myService.methode('POST', "../RetailSection/LicenseRequestData", JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    var fileDataList = response.data.Result;
                    var filesToDownload = [];

                    fileDataList.forEach(function (license) {
                        // ✅ Only download if selected
                        if (selectedStoreCodes.has(license.StoreCode)) {
                            var fileUrl = license[fieldName];
                            if (fileUrl && fileUrl !== "null") {
                                var fileName = sanitizeFileName(`${license.StoreCode}_${license.LicenseName}__${license.RefStoreCode}__${fieldName}.pdf`);
                                filesToDownload.push({ url: fileUrl, name: fileName });
                            }
                        }
                    });

                    if (filesToDownload.length === 0) {
                        alert(`No ${label} files found for selected records.`);
                        return;
                    }

                    filesToDownload.forEach(function (file, index) {
                        setTimeout(function () {
                            var a = document.createElement("a");
                            a.href = file.url;
                            a.download = file.name;
                            a.target = "_blank";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }, index * 200);
                    });

                } else {
                    alert("No data found.");
                }
            })
            .finally(function () {
                $scope.hideLoader();
            });
    };



    /////Ended by shipra //////////////








    $scope.ExportToPDF = function (dataToExport) {
        const { jsPDF } = window.jspdf;

        // Initialize jsPDF with landscape orientation
        const doc = new jsPDF('landscape');

        // Set font for the entire document
        doc.setFont("helvetica", "normal");

        // Title for the PDF - Centered
        const title = "License Master Report";
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
        doc.save('LicenseMaster.pdf');
    };



    $scope.ExportExcel = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            Action: 4,
            UserId: LoginId,
            PageNo: 1,
            PageSize: 999999,
            Searchby: $('#myInput').val()
        };

        myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    $scope.LicenseForExport = response.data.Result; // Store data for export
                    var dataToExport = $scope.LicenseForExport;
                    $scope.ExportToExcel(dataToExport);
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };

    $scope.selectedColumns = [
        'SrNo', 'StoreCode', 'RefStoreCode', 'StoreAddress', 'ProposedDate', 'LicenseName', 'LicenseType', 'RequestedDate', 'DocumentDate',
        'ApplicationStatus', 'ApplicationDate', 'LicenseStatus', 'LicenseDate'  , 'LicenseNumber', 'ValidityStartDate', 'ValidityEndDate',
        'RenewalRequestDate', 'RenewalStartDate', 'RenewalStatus', 'RenewalEndDate', 'UserName', 'UserPassword', 'MobileNumber', 'EmailId', 'TentativeDate','LicenseCost',  'GovtFees'
    ];
    $scope.selectedColumnspdf = [
        'SrNo', 'StoreCode', 'RefStoreCode', 'StoreAddress', 'ProposedDate', 'LicenseName', 'LicenseType', 'RequestedDate', 'DocumentDate',
        'ApplicationStatus', 'ApplicationDate', 'LicenseStatus', 'LicenseDate', 'LicenseNumber', 'ValidityStartDate', 'ValidityEndDate',
        'RenewalRequestDate', 'RenewalStartDate', 'RenewalStatus', 'RenewalEndDate', 'UserName', 'UserPassword', 'MobileNumber', 'EmailId', 'TentativeDate', 'LicenseCost', 'GovtFees'
    ];
    

    $scope.ExportToExcel = function (dataToExport) {

        var filteredData = dataToExport.map(function (row) {
            var filteredRow = {};
            $scope.selectedColumns.forEach(function (column) {
                if (row.hasOwnProperty(column)) {
                    filteredRow[column] = row[column];  // Add only the selected columns to the row
                }
            });
            return filteredRow;
        });
        var ws = XLSX.utils.json_to_sheet(filteredData);  // Convert data to sheet
        var wb = XLSX.utils.book_new();  // Create a new workbook
        XLSX.utils.book_append_sheet(wb, ws, "License Master Report");  // Append sheet to workbook
        XLSX.writeFile(wb, 'LicenseMaster.xlsx');  // Write to file
    };
   
} 