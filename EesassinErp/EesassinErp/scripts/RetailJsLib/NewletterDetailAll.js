app.NewsletterDetailsController = function ($scope, $element, $filter, myService, $sce,$window) {
    

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

    $scope.ShowDetails = false;

    $scope.ShowDetailsFunction = function (id) {
        $scope.newsletter = $filter('filter')($scope.newsletterAll, { 'Id': id });

        //var collectionobj = {};
        //collectionobj.Id = id;
        //var getData = myService.methode('POST', ("../Newsletter/GetNewsletterClientNames"), JSON.stringify(collectionobj));
        //getData.then(function (response) {
        //    $scope.newsletter[0].PartyName = response.data.Result;
        //    $scope.$applyAsync();
        //});

        $scope.trustedSummary = $sce.trustAsHtml($scope.newsletter[0].Summary);
        $scope.ShowDetails = !$scope.ShowDetails;
    }

    $scope.ViewAllFun = function () {
        $scope.newsletterDetail = $scope.newsletterAll;
    }

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
        if (IssuedDate < ApplicationDate) {
            $('#IssuedDate' + Id).val('');
            showMsgBox('999', 'Mandatory', 'License Date Should  be Greater than Application Date', 'warning', 'btn-warning');
            $('#IssuedDate' + Id).val('');
            return;
        }
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
        if ($scope.loginType == 4)
        {
            $scope.IsValid = true;
        }
        $scope.$applyAsync();
    }

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

    $scope.GetLicenseRequestData = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/LicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LicenseRequestList = response.data.Result;
            angular.element(document).ready(function () {
                $('#example').DataTable().destroy();
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
                                columns: [0, 1, 2,3, 4, 5, 6, 7, 15,24,25,26,27,31]
                            },
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
                                doc.styles.tableHeader.fontSize = 15;
                                doc['header'] = (function () {
                                    return {
                                        columns: [
                                            {
                                                alignment: 'center',
                                                fontSize: 14,
                                                text: 'License Master'
                                            }
                                        ],
                                        margin: 40
                                    }
                                });
                            },
                            exportOptions: {
                                columns: [0, 1, 2, 3, 4, 5, 6, 7, 15, 24, 25, 26, 27, 31]
                            },

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
                        }
                    ],
                    //columnDefs: [{
                    //    targets: -1,
                    //    visible: false
                    //}]
                });
                //buttons: ['copy', 'excelHtml5', 'print']

                // Added by pradeep for License and Registeration and inspection
                $('#licenseregistration').DataTable().destroy();
                dTable1 = $('#licenseregistration');

                dTable1.DataTable({
                    searching: false,
                    dom: 'Bfrtip',
                    buttons: [
                        //'colvis',
                        {
                            extend: 'csv',
                            filename: 'License & Registration',
                            orientation: 'landscape', //portrait
                            title: function () {
                                var printTitle = 'License & Registration';
                                return printTitle
                            },
                            exportOptions: {
                                columns: [1, 2, 3, 4, 5, 6, 7, 8]
                            },
                        },

                        'excel',
                        {
                            extend: 'pdfHtml5',
                            text: 'Export PDF',
                            filename: 'License & Registration',
                            orientation: 'landscape', //portrait
                            pageSize: 'A4', //A3 , A5 , A6 , legal , letter 
                            customize: function (doc) {
                                doc.styles['table'] = { width: '100%' }
                                doc.pageMargins = [20, 60, 20, 30];
                                doc.styles.tableHeader.fontSize = 15;
                                doc['header'] = (function () {
                                    return {
                                        columns: [
                                            {
                                                alignment: 'center',
                                                fontSize: 14,
                                                text: 'License & Registration'
                                            }
                                        ],
                                        margin: 40
                                    }
                                });
                            },
                            exportOptions: {
                                columns: [1, 2, 3, 4, 5, 6, 7, 8]
                            },

                        },
                        , {
                            extend: 'print',
                            filename: 'Store Master',
                            orientation: 'landscape', //portrait
                            title: function () {
                                var printTitle = 'License & Registration';
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
                                columns: [1, 2, 3, 4, 5, 6, 7, 8]
                            },
                        }
                    ],

                });
                // for inspection
                $('#noticesinspections').DataTable().destroy();
                dTable2 = $('#noticesinspections');

                dTable2.DataTable({
                    searching: false,
                    dom: 'Bfrtip',
                    buttons: [
                        //'colvis',
                        {
                            extend: 'csv',
                            filename: 'Notices & Inspections',
                            orientation: 'landscape', //portrait
                            title: function () {
                                var printTitle = 'Store Master';
                                return printTitle
                            },
                            exportOptions: {
                                columns: [0, 1, 2, 3, 4, 5]
                            },
                        },

                        'excel',
                        {
                            extend: 'pdfHtml5',
                            text: 'Export PDF',
                            filename: 'Notices & Inspections',
                            orientation: 'landscape', //portrait
                            pageSize: 'A4', //A3 , A5 , A6 , legal , letter 
                            customize: function (doc) {
                                doc.styles['table'] = { width: '100%' }
                                doc.pageMargins = [20, 60, 20, 30];
                                doc.styles.tableHeader.fontSize = 15;
                                doc['header'] = (function () {
                                    return {
                                        columns: [
                                            {
                                                alignment: 'center',
                                                fontSize: 14,
                                                text: 'Notices & Inspections'
                                            }
                                        ],
                                        margin: 40
                                    }
                                });
                            },
                            exportOptions: {
                                columns: [0, 1, 2, 3, 4, 5]
                            },

                        },
                        , {
                            extend: 'print',
                            filename: 'Notices & Inspections',
                            orientation: 'landscape', //portrait
                            title: function () {
                                var printTitle = 'Notices & Inspections';
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
                                columns: [0, 1, 2, 3, 4, 5]
                            },
                        }
                    ],

                });
                // end added by pradeep

            });
            $scope.Funcationlitycheck();
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };
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

    $scope.uploadFile = function (fieldName, input) {
        var id = $(input).attr('id');
        debugger;
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
              
                $scope[fieldName] = e.target.result;
                $scope[id] = '1';
                $scope.$applyAsync();
               
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.$applyAsync();
        }
    };

    $scope.SubmitLicense = function (license, Id) {

       
        var formData = new FormData();
        if (license.ApplicationStatus == '')
        {
            $('#ApplicationStatus' + Id).focus();
            $('#ApplicationStatus' + Id).addClass("red-validation");
            showMsgBox('999', 'Mandatory', 'Plese select Application Status', 'warning', 'btn-warning');
            return;
        }
       
        if (license.ApplicationStatus === 'Applied')
        {
          
            if (license.ApplicationDate == '' || license.ApplicationDate == null || license.ApplicationDate == 'undefined' || license.ApplicationDate == 'Invalid Date') {
                    if (license.ApplicationDate == '' || license.ApplicationDate == null || license.ApplicationDate == 'undefined' || license.ApplicationDate == 'Invalid Date') {
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).addClass("red-validation");
                        $('#ApplicationDate' + Id).focus();
                        showMsgBox('999', 'Mandatory', 'Application Date IS REQUIRED', 'warning', 'btn-warning');
                       
                        return;
                    }
                }
                if (license.UploadApplicationCopy == '' || license.UploadApplicationCopy == null) {
                    if ($scope.UploadApplicationCopy == '' || $scope.UploadApplicationCopy == undefined) { 
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).addClass("red-validation");
                        $('#ApplicationStatus' + Id).focus();
                        showMsgBox('999', 'Mandatory', 'Application Copy IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                if (license.UploadChallanCopy == '' || license.UploadChallanCopy == null)
                {
                    if ($scope.UploadChallanCopy == '' || $scope.UploadChallanCopy == undefined) {
                       
                        $('#ApplicationStatus' + Id).removeClass("red-validation");
                        $('#ApplicationDate' + Id).removeClass("red-validation");
                        $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                        $('#ChallanCopy' + Id).addClass("red-validation");
                        $('#ApplicationStatus' + Id).focus();
                        showMsgBox('999', 'Mandatory', 'Challan Copy IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
            }
          
            if (license.LicenseStatus == '') {
                $('#LicenseStatus' + Id).focus();
                $('#ApplicationStatus' + Id).removeClass("red-validation");
                $('#ApplicationDate' + Id).removeClass("red-validation");
                $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                $('#ChallanCopy' + Id).removeClass("red-validation");
                $('#LicenseStatus' + Id).addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'Plese select License Status', 'warning', 'btn-warning');
                return;
            }
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
                const today = new Date();
                const yyyy = today.getFullYear();
                let mm = today.getMonth() + 1; // Months start at 0!
                let dd = today.getDate();

                if (dd < 10) dd = '0' + dd;
                if (mm < 10) mm = '0' + mm;

                var TodayDate = yyyy + '-' + mm + '-' + dd;

                var IssuedDate = $('#IssuedDate' + Id).val();
                var ApplicationDate = $('#ApplicationDate' + Id).val();
                if (IssuedDate < ApplicationDate) 
                {
                    $('#IssuedDate' + Id).val('');
                    showMsgBox('999', 'Mandatory', 'License Date Should  be Greater than Application Date', 'warning', 'btn-warning');
                    $('#IssuedDate' + Id).val('');
                    return;
                }
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
            if (license.InvoiceStatus == '')
            {
                $('#InvoiceStatus' + Id).focus();
                $('#ApplicationStatus' + Id).removeClass("red-validation");
                $('#ApplicationDate' + Id).removeClass("red-validation");
                $('#UploadApplicationCopy' + Id).removeClass("red-validation");
                $('#ChallanCopy' + Id).removeClass("red-validation");
                $('#LicenseStatus' + Id).removeClass("red-validation");
                $('#IssuedDate' + Id).removeClass("red-validation");
                $('#LicenseNumber' + Id).removeClass("red-validation");
                $('#ValidityStartDate' + Id).removeClass("red-validation");
                $('#ValidityEndDate' + Id).removeClass("red-validation");
                $('#MobileNumber' + Id).removeClass("red-validation");
                $('#Email' + Id).removeClass("red-validation");
                $('#InvoiceStatus' + Id).addClass("red-validation");
                showMsgBox('999', 'Mandatory', 'Plese select Invoice Status', 'warning', 'btn-warning');
                return;
            }
           
            if (license.InvoiceStatus === 'Done')
            {
                
                if (license.InvoiceNo == '' || license.InvoiceNo == null || license.InvoiceNo == undefined) {
                    if (license.InvoiceNo == '' || license.InvoiceNo == undefined) {
                        $('#InvoiceNo' + Id).focus();
                        $('#InvoiceDate' + Id).removeClass("red-validation");
                        $('#InvoiceNo' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'Invoice No IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                if (license.InvoiceAmount != '' || license.InvoiceAmount == null || license.InvoiceAmount == '') {
                    if (license.InvoiceAmount == '' || license.InvoiceAmount == 'undefined' || license.InvoiceAmount == 'Invalid Date' || license.InvoiceAmount == null) {
                        $('#InvoiceAmount' + Id).focus();
                        $('#InvoiceNo' + Id).removeClass("red-validation");
                        $('#InvoiceAmount' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'Invoice Amount IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                if (license.InvoiceDate != '' || license.InvoiceDate == null || license.InvoiceDate == '') {
                    if (license.InvoiceDate == '' || license.InvoiceDate == 'undefined' || license.InvoiceDate == 'Invalid Date') {
                        $('#InvoiceStatus' + Id).removeClass("red-validation");
                        $('#InvoiceDate' + Id).addClass("red-validation");
                        $('#InvoiceDate' + Id).focus();
                        showMsgBox('999', 'Mandatory', 'Invoice Date IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }
                if (license.UploadInvoice == '' || license.UploadInvoice == null) {
                    if ($scope.UploadInvoice == '' || $scope.UploadInvoice == undefined) {
                        $('#InvoiceNo' + Id).focus();
                        $('#InvoiceAmount' + Id).removeClass("red-validation");
                        $('#InvoiceCopy' + Id).addClass("red-validation");
                        showMsgBox('999', 'Mandatory', 'Upload Invoice IS REQUIRED', 'warning', 'btn-warning');
                        return;
                    }
                }

            } 
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
        
        formData.append('RenewalEndDate', moment(license.RenewalEnddate).format(FORMAT));
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



        $.ajax({
            url: "../RetailSection/InsertUpdateDelLicenseRequest",
            type: 'POST',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: function (response) {
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
                    $scope.FireEmail(8, $scope.LicenceRequstId, $scope.StoreCode);
                    $scope.LicenceRequstId = '';
                    $scope.GetLicenseRequestData();
                    window.top.location.href = '../RetailSection/LicenseMaster?LicenseMaster';
                 
                }
            },
            error: function (xhr, status, error) {
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

    $scope.viewDocument = function (documentPath) {
        if (documentPath != null)
        {
            $scope.openDocumentFunction(documentPath);
        }
      
    };
    $scope.openDocumentFunction = function (documentPath) {
        window.open(documentPath, '_blank');
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
           // Bindgra(Totalupoad, TotPer);
            $scope.hideLoader();
        });
        collectionobj.PartyId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLicenseAndRegistrationBy"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LoadMasterList = response.data.Result;
            $scope.hideLoader();
        });

       

        $scope.hideLoader();

      
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
    $scope.BindExecuter = function (id) {
        var collectionobj = {};
        collectionobj.Id = LoginId;
        //collectionobj.ActionType = 10; 
        //collectionobj.Id = LoginId;
        //var getData = myService.methode('POST', ("../RetailSection/SearchCompliance"), JSON.stringify(collectionobj));
        //getData.then(function (response) {

        //    $scope.LoginAs = response.data.Result[0].LoginAs;
        //    if (loginType == '1')
        //    {
        //        $scope.LoginAs = 'Admin';
        //    }
        //    if ($scope.LoginAs == 'Executer') {
        //        $scope.loginType = '1'
        //    }
           
        //    $scope.GetLicenseRequestData();
        //    $scope.BindNoticeStoreList();
        //    $scope.BindNoticeClient();
        //    $scope.Funcationlitycheck();
        //    $scope.$applyAsync();
        //});
        var getData = myService.methode('POST', ("../Newsletter/GetNewsletterForSearchDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.newsletterAll = response.data.Result;
            $scope.newsletter = $filter('filter')(response.data.Result, { 'Id': id });
            $scope.newsletterDetail = $scope.newsletter;
            $scope.trustedSummary = $sce.trustAsHtml($scope.newsletter[0].Summary);
            $scope.$applyAsync();
        });

        var getNewletters = myService.methode('POST', ("../RetailSection/GetNewsletter"), JSON.stringify(collectionobj));
        getNewletters.then(function (response) {
            $scope.Newletters = response.data.Result;
            $scope.hideLoader();
        });

        $scope.hideLoader();
    };

    //-------------------------End Notice
    //-----------------------------Excelation Process

    $scope.downloadsummary = function () {
       //-----------------------------------
        //var pdf = new jsPDF('l', 'pt', 'a4');
        //var pdfwidth = pdf.internal.pageSize.width;
        //var pdfheight = pdf.internal.pageSize.height;

     
        html2canvas(document.querySelector("#downloaddiv2"), {
            scale: 0,  // Increase the scale for higher resolution,
        }).then(canvas => {
          
            var imgData = canvas.toDataURL("image/png");
            
        //    // Add the image to the PDF
        //    pdf.addImage(imgData, 'PNG', 0, 0, pdfwidth, pdfheight);
        //    pdf.save($scope.newsletter[0].SubjectLine + '.pdf'); // The name of the downloaded PDF
          //---------------------------------------------------------
            //---------------------------
            var downloadLink = document.createElement('a');
           //var link= document.getElementById('downloadLink');
            downloadLink.setAttribute('download', $scope.newsletter[0].SubjectLine + '.png');
            downloadLink.setAttribute('href', imgData);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            //-----------------------------
            });
    };
    
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
        $('#example').DataTable().buttons(0, 1).trigger();
        $('#licenseregistration').DataTable().buttons(0, 1).trigger();
        $('#noticesinspections').DataTable().buttons(0, 1).trigger();
        
    }
    $scope.ExportExcel = function () {
        $('#example').DataTable().buttons(0, 0).trigger();
        $('#licenseregistration').DataTable().buttons(0, 0).trigger();
        $('#noticesinspections').DataTable().buttons(0, 0).trigger();
    }
} 