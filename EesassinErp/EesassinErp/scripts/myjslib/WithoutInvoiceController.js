
app.WithoutInvoiceController = function ($scope, $element, $filter, myService, $http, $sce, $compile) {




    $scope.fileChange = function (input) {
        var index = input.id.replace('fuCandidatePhoto', '');

        if (input.files && input.files[0]) {
            $scope.$apply(function () {
                $scope.InvoiceDetail[index].file = input.files[0];   // ✅ actual file
                $scope.InvoiceDetail[index].IsFile = 'Attached Invoice';
                $scope.InvoiceDetail[index].loading = false;
            });
        }
    };


    //--------------------------------------------------------
    $scope.BeforeSaveRecord = function () {

        for (var i = 0; i < $scope.InvoiceDetail.length; i++) {

            $scope.InvoiceDetail[i].StateId = $scope.StateId;

            // ✅ FILE CHECK (new OR existing)
            if (!$scope.InvoiceDetail[i].file && !$scope.InvoiceDetail[i].fileupload) {
                showMsgBox('999', 'Invoice Required',
                    'Please attach Invoice in row ' + $scope.InvoiceDetail[i].Srno +
                    ' / Invoice No: ' + $scope.InvoiceDetail[i].VendorInvNum,
                    'warning', 'btn-warning');
                return;
            }

            // ✅ DATE CHECK
            if (!$scope.InvoiceDetail[i].InvDate ||
                $scope.InvoiceDetail[i].InvDate == 'Invalid date') {

                showMsgBox('999', 'Invoice Required',
                    'Please add date in row ' + $scope.InvoiceDetail[i].Srno +
                    ' / Invoice No: ' + $scope.InvoiceDetail[i].VendorInvNum,
                    'warning', 'btn-warning');
                return;
            }

            // ✅ SPACE NOT ALLOWED
            if ($scope.InvoiceDetail[i].VendorInvNum &&
                $scope.InvoiceDetail[i].VendorInvNum.match(/\s/g)) {

                showMsgBox('999', 'Invoice Error',
                    'Invoice number cannot contain spaces (Row ' + $scope.InvoiceDetail[i].Srno + ')',
                    'warning', 'btn-warning');
                return;
            }

            // ✅ DATE FORMAT
            $scope.InvoiceDetail[i].InvDate = moment(
                $scope.InvoiceDetail[i].InvDate,
                "DD-MMM-YYYY"
            ).format('YYYY-MM-DD');
        }

        $scope.SaveInvoiceAfterValidate();
    };
    $scope.AccPercentage = '';
    $scope.detailSave = '';
    $scope.SaveInvoiceAfterValidate = function () {

        if (!$scope.ValidateInvoiceGrid()) return;

        $scope.showLoader();

        var formData = new FormData();

        // 🔥 MAIN FIELDS
        formData.append("ClientId", $scope.ClientId);
        formData.append("ClientSiteId", 'NA');
        formData.append("VendorSiteId", LoginId);
        formData.append("FYID", $scope.FyId);
        formData.append("Month", $scope.Month);
        formData.append("InvDate", $scope.InvDate);
        formData.append("CreatedBy", LoginId);
        formData.append("InvoiceId", $scope.hfId);
        formData.append("VendorId", LoginId);
        formData.append("ActionType", 1);

        // 🔥 LOOP DATA
        angular.forEach($scope.InvoiceDetail, function (item, index) {

            // ✅ FILE SEND
            if (item.file) {
                formData.append("files[" + index + "]", item.file);
            }

            // ✅ JSON SEND
            formData.append("InvoiceDetail[" + index + "]", JSON.stringify(item));
        });

        // 🔥 API CALL
        $http.post("../VenInvoice/NewInsertUpdateDelVenInvoice", formData, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        })
            .then(function (response) {

                if (!response.data || !response.data.Result) {
                    showMsgBox('999', 'Alert', 'Something Went Wrong', 'warning', 'btn-warning');
                } else {

                    showMsgBox('999', 'Success',
                        'Saved Successfully. Batch No: ' + response.data.Result,
                        'success', 'btn-success');
                    $scope.BindCommunication();
                    $scope.ResetInvoiceForm();
                    $scope.ClearHEADER();
                    $scope.FireEmail(16, response.data.Result, $scope.ClientId);

                }
            })
            .catch(function (err) {
                console.error("Error:", err);
                showMsgBox('999', 'Error', 'Server Error Occurred', 'danger', 'btn-danger');
            })
            .finally(function () {
                $scope.hideLoader();
            });
    };

    $scope.ClearHEADER = function () {
        $scope.freeze = false;
        $scope.IsHide = false;
        $scope.InvoiceDetail = [];
        $scope.AddInvoiceDetail();
    }
    $scope.ValidateInvoiceGrid = function () {

        for (var i = 0; i < $scope.InvoiceDetail.length; i++) {

            var row = $scope.InvoiceDetail[i];

            // reset error flags
            row.errVendorInvNum = false;
            row.errInvDate = false;
            row.errTaxable = false;
            row.errFile = false;

            // 🔴 Invoice No
            if (!row.VendorInvNum || row.VendorInvNum.trim() == '') {
                row.errVendorInvNum = true;
                showMsgBox('999', 'Validation', 'Enter Invoice No at row ' + (i + 1), 'warning', 'btn-warning');
                return false;
            }

            // 🔴 Date
            if (!row.InvDate) {
                row.errInvDate = true;
                showMsgBox('999', 'Validation', 'Select Invoice Date at row ' + (i + 1), 'warning', 'btn-warning');
                return false;
            }

            // 🔴 Taxable
            if (!row.TaxableValue || row.TaxableValue == 0) {
                row.errTaxable = true;
                showMsgBox('999', 'Validation', 'Enter Taxable Value at row ' + (i + 1), 'warning', 'btn-warning');
                return false;
            }

            // 🔴 File
            if (!row.file && !row.fileupload) {
                row.errFile = true;
                showMsgBox('999', 'Validation', 'Upload file at row ' + (i + 1), 'warning', 'btn-warning');
                return false;
            }
        }

        return true; // ✅ ALL GOOD
    };

    $scope.ResetInvoiceForm = function () {

        $scope.ClientId = '';
        $scope.FyId = '';
        $scope.Month = '';
        $scope.InvDate = '';
        $scope.hfId = '';
        $scope.Save = "Save";

        if ($scope.InvoiceDetail && $scope.InvoiceDetail.length > 0) {

            angular.forEach($scope.InvoiceDetail, function (item) {

                item.Srno = '';
                item.InvDate = '';
                item.VendorInvNum = '';
                item.StateId = '';
                item.Location = '';
                item.ManpowerType = '';
                item.ManpowerCount = '';
                item.InvoiceType = '';
                item.TaxableValue = '';
                item.CGST = '';
                item.SGST = '';
                item.IGST = '';
                item.GrossAmount = '';
                item.Status = '';

                item.file = null;
                item.fileupload = '';
                item.IsFile = '';
                item.loading = false;
            });
        }

        $scope.InvoiceDetail = [{
            Srno: 1,
            InvDate: '',
            VendorInvNum: '',
            file: null,
            fileupload: '',
            IsFile: '',
            loading: false
        }];
    };
    //----------------------------------------------

    $scope.AllPartySiteLoadWI = function () {
        var collectionobj = {};
        collectionobj.ActionType = 17;
        collectionobj.PartyID = $scope.ClientId;
        collectionobj.StateId = $scope.StateId;
        collectionobj.CreatedBy = MapId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.AllPartySiteVList = response.data;
        });
    }


    $scope.BindStatusInvoice = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.VendorId = MapId;
        var getData = myService.methode('POST', "../ClientActMapping/SearchClientActMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                if (response.data.Result[0].IStatus == 1) {
                    $scope.IWITHStatus = true;
                    $scope.TypeInvoice = "WithoutInvoice";
                }
                else {
                    $scope.IWITHStatus = false;
                    $scope.TypeInvoice = "Invoice";
                }
            }

        });
    };

    $scope.SetSingleLocation = function (WClientSiteId) {

        $scope.IsLocation = true;
        $scope.hideIsLocation = false;
        $scope.$applyAsync();
        var collectionobj = {};
        collectionobj.ActionType = 30;
        collectionobj.PartyId = WClientSiteId;
        collectionobj.CreatedBy = MapId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.LocationL = response.data.Result;
        });
    }

    $scope.ValidateWithoutInvoice = function () {
        if ($scope.ClientId == "" || $scope.ClientId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Client', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.StateId == "" || $scope.StateId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select State', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.FyId == "" || $scope.FyId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Financial Year', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.Month == "" || $scope.Month == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Month', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.WClientSiteId == "" || $scope.WClientSiteId == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Client Site', 'warning', 'btn-warning')
            return;
        }
        else if ($scope.WLocation == "" || $scope.WLocation == undefined) {
            showMsgBox('999', 'Warning', 'Please Select Location', 'warning', 'btn-warning')
            return;
        }
        else {

            $scope.SAVEWithoutInvoice();

        }


    }

    $scope.WIBindMonth = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.VendorId = MapId;
        var getData = myService.methode('POST', ("../ClientActMapping/SearchClientActMapping"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.WIMonthList = response.data.Result;
        });
    }

    $scope.WIBindFinacialYear = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.VendorId = MapId;
        var getData = myService.methode('POST', ("../ClientActMapping/SearchClientActMapping"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.WIfinacialyearList = response.data.Result;
        });

    }

    $scope.SAVEWithoutInvoice = function () {

        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.StateID = $scope.StateId;
        collectionobj.FYID = $scope.FyId;
        collectionobj.Month = $scope.Month;
        collectionobj.CreatedBy = LoginId;
        collectionobj.TypeInvoice = $scope.TypeInvoice;
        collectionobj.ClientSiteId = $scope.WClientSiteId;
        collectionobj.Location = $scope.WLocation;
        collectionobj.ActionType = 11;
        var getData = myService.methode('POST', "../VenInvoice/InsertUpdateDelWithoutVenInvoice", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            let text = response.data.Result;
            const invno = text.split("|");
            if (invno == "Already Exists this Mapping") {
                showMsgBox('999', 'Alert', response.data.Result, 'warning', 'btn-warning');
            }
            else {
                showMsgBox('999', 'Alert', "Save Successfully New Unique No." + response.data.Result, 'warning', 'btn-warning');
                $scope.FireEmail(14, invno[0], $scope.ClientId);
                $scope.BindCommunication();

            }

        });
    }


    $scope.AllState = function () {
        $scope.CountryId = 1;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": $scope.CountryId });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }


    $scope.StateBind = function () {
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.UserId = $scope.ClientId;
        var getData = myService.methode('POST', ("../rating/searchrating"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data;
        });
    }



    $scope.ChangeMonth = function () {
        var collectionobj = {};
        collectionobj.ActionType = 8;
        collectionobj.StartDate = ConverttoDate($scope.StartDate);
        collectionobj.EndDate = ConverttoDate($scope.EndDate);
        collectionobj.Month = $scope.Month;
        collectionobj.FYID = $scope.FyId;
        debugger;
        var getData = myService.methode('POST', ("../VenInvoice/SetINVOICEDATE"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.StartDate = response.data[0].StartDate;
            $scope.EndDate = response.data[0].EndDate;
            $scope.$applyAsync();
        });
    }
    $scope.BindFinacialYear = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 6 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data;
        });
    }


    $scope.AllParty = function () {
        var collectionobj = {};
        collectionobj.ActionType = 6;
        collectionobj.PartyId = LoginId;
        debugger;
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.AllPartyList = response.data.Result;;
        });
    }

    $scope.ClearReset = function () {
        $scope.ClientId = "";
        $scope.StateId = "";
        $scope.FyId = "";
        $scope.Month = "";
        $scope.WClientSiteId = "";
        $scope.WLocation = "";
    }

    //-----------------------------------------------------------------vendor communication
    $scope.InvoiceList = [];
    $scope.FilteredList = [];

    // Selected values
    $scope.selectedStatus = '';
    $scope.selectedState = '';
    $scope.selectedMonth = '';
    $scope.selectedYear = '';

    // Dropdown Lists
    $scope.StatusList = [];
    $scope.StateList = [];
    $scope.MonthList = [];
    $scope.YearList = [];

    $scope.BindCommunication = function () {

        var collectionobj = {};
        collectionobj.Action = 50;
        collectionobj.Id = LoginId;

        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {

            $scope.InvoiceList = response.data;
            $scope.FilteredList = angular.copy($scope.InvoiceList);

            // Auto bind dropdowns
            $scope.StatusList = [...new Set($scope.InvoiceList.map(x => x.Status))];
            $scope.StateList = [...new Set($scope.InvoiceList.map(x => x.StateName))];
            $scope.MonthList = [...new Set($scope.InvoiceList.map(x => x.InMonthName))];
            $scope.YearList = [...new Set($scope.InvoiceList.map(x => x.FYID))];
        });
    };
    $scope.setFilter = function (type, value) {

        if (type === 'status') $scope.selectedStatus = value;
        if (type === 'state') $scope.selectedState = value;
        if (type === 'month') $scope.selectedMonth = value;
        if (type === 'year') $scope.selectedYear = value;
    };
    $scope.applyFilter = function () {

        $scope.FilteredList = $scope.InvoiceList.filter(function (x) {

            return (!$scope.selectedStatus || x.Status === $scope.selectedStatus)
                && (!$scope.selectedState || x.StateName === $scope.selectedState)
                && (!$scope.selectedMonth || x.InMonthName === $scope.selectedMonth)
                && (!$scope.selectedYear || x.FYID === $scope.selectedYear);

        });

        // Dependent dropdown update
        updateDropdowns();
    };
    function updateDropdowns() {

        let data = $scope.FilteredList;

        $scope.StatusList = [...new Set(data.map(x => x.Status))];
        $scope.StateList = [...new Set(data.map(x => x.StateName))];
        $scope.MonthList = [...new Set(data.map(x => x.InMonthName))];
        $scope.YearList = [...new Set(data.map(x => x.FYID))];
    }
    $scope.resetFilter = function () {

        $scope.selectedStatus = '';
        $scope.selectedState = '';
        $scope.selectedMonth = '';
        $scope.selectedYear = '';

        $scope.FilteredList = angular.copy($scope.InvoiceList);

        // Reset dropdowns
        $scope.StatusList = [...new Set($scope.InvoiceList.map(x => x.Status))];
        $scope.StateList = [...new Set($scope.InvoiceList.map(x => x.StateName))];
        $scope.MonthList = [...new Set($scope.InvoiceList.map(x => x.InMonthName))];
        $scope.YearList = [...new Set($scope.InvoiceList.map(x => x.FYID))];
    };
    $scope.Searchbox = '';


    $scope.SetValues = function (Id) {
        $scope.ComFreeze = true;
        $scope.ConversationId = Id;
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.Id = Id;
        collectionobj.Updatedby = LoginId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.InList = response.data;
            }

        });
    };

    $scope.downloadAll = function () {
        $scope.selectedone = [];

        for (let i = 0; i < $scope.InDocList.length; i += 1) {
            setTimeout(function () {
                //if ($scope.InDocList[i].IsDefault == true) {
                $scope.selectedone.push($scope.InDocList[i].DocumentFile);
                $scope.id = $scope.InDocList[i].name;
                var link = document.createElement('a');
                var ext = /^.+\.([^.]+)$/.exec($scope.InDocList[i].DocumentFile);
                var extension = '';

                if (ext[1] == 'pdf') {
                    extension = '.pdf'
                    link.href = $scope.InDocList[i].DocumentFile;
                    link.download = $scope.InDocList[i].InvoiceNo + '_' + $scope.InDocList[i].DocumentName + extension;
                    link.click();
                    link.remove();

                }
                else if (ext[1] == 'jpeg') {
                    extension = '.jpeg'
                    link.href = $scope.InDocList[i].DocumentFile;
                    link.download = $scope.InDocList[i].InvoiceNo + '_' + $scope.InDocList[i].DocumentName + extension;
                    link.click();
                    link.remove();
                }

                //}
            }, i * 200);
        }

    }




    $scope.BindClientAutomate = function (x) {
        var obj = {};
        obj.Action = 6;
        obj.SiteCode = x.SiteCode;
        obj.LoginId = MapId;
        obj.State = x.StateName;
        obj.EmployeeId = x.DocumentId;
        obj.Month = $scope.MonthNew;
        obj.Year = $scope.FyIDNew;

        var getData = myService.methode('POST', "../RetailSection/AuditGetContractorComlist", '{obj:' + JSON.stringify(obj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AutomateDocument = response.data;
            }

        });
    };

    $scope.SetAutomateDocument = function (x) {

        if (x.Automation == 'Yes') {
            $scope.BindAutomateDocumentList(x)
        }
        else {
            $scope.GetDocument(x.ConversationId);
        }
    }
    $scope.ConversationIdNew = '';
    $scope.StateNew = '';
    $scope.MonthNew = '';
    $scope.FyIDNew = '';
    $scope.SiteCodeNew = '';
    $scope.BindAutomateDocumentList = function (x) {

        $scope.CurrentRow = x;
        $scope.ConversationIdNew = x.ConversationId;
        $scope.StateNew = x.StateName;
        $scope.MonthNew = x.Month;
        $scope.FyIDNew = x.FYID;
        $scope.SiteCodeNew = x.SiteCode;
        var collectionobj = {};
        collectionobj.Action = 51;
        collectionobj.Updatedby = LoginId;
        collectionobj.Id = $scope.ConversationIdNew;

        var getData = myService.methode(
            'POST',
            "../Communication/GetCommunication",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {

            if (response.data.length > 0) {
                $scope.ConversationId = response.data[0].ConversationId;
                $scope.Pendding = response.data[0].Pendding;
                $scope.Submit = response.data[0].Submit;
                $scope.Reject = response.data[0].Reject;
                $scope.NewReq = response.data[0].NewReq;
                $scope.TotalDoc = response.data[0].TotalDoc;
                $scope.IDATE = response.data[0].InvDate;
                $scope.ClientName = response.data[0].Name;
                $scope.ClientId = response.data[0].ClientId;
                $scope.Location = response.data[0].Location;
                $scope.RegInvoiceNo = response.data[0].RegInvoiceNo;
                $scope.InvoiceNo = response.data[0].InvoiceNo;
                $scope.HeaderInvoice = response.data[0].HeaderInvoice;

                $scope.DayLeft = response.data[0].DayLeft;
                $scope.Flag = response.data[0].Flag;

                if ($scope.DayLeft == "0") {
                    $('.lbldayleft').css('color', 'red');
                    $scope.DayLeft = 'Day Left : Uploading Time Expire, Please Contact to Admin';
                    $scope.TimeLeftMsg = true;

                }
                else {
                    $('.lbldayleft').css('color', 'green');
                    $scope.DayLeft = 'Last day of document submision: ' + response.data[0].WIEndDate + ' ;  Day Left :' + $scope.DayLeft;
                    $scope.TimeLeftMsg = false;
                }
                if ($scope.HeaderInvoice == "Unique No : ") {
                    $scope.WhichDate = "Created Date : ";
                }
                else {
                    $scope.WhichDate = "Invoice Date :";
                }
                $scope.ConversationId = response.data[0].ConversationId;
                $scope.InDocList = response.data;
                $scope.$applyAsync();
            }

            $scope.InDocList = response.data || [];


            // Agar Automation No hai to direct data bind kar do
            if (x.Automation != "Yes") {
                $scope.FinalDocList = angular.copy($scope.InDocList);
                return;
            }

            // Automation Yes hai to Audit List lao
            var obj = {};
            obj.Action = 6;
            obj.SiteCode = x.SiteCode;
            obj.LoginId = MapId;
            obj.State = x.StateName;
            obj.EmployeeId = x.DocumentId;
            obj.Month = $scope.MonthNew;
            obj.Year = $scope.FyIDNew;
            $scope.dOCUsITE = x.SiteCode;

            var auditData = myService.methode(
                'POST',
                "../RetailSection/AuditGetContractorComlist",
                '{obj:' + JSON.stringify(obj) + '}'
            );

            auditData.then(function (response2) {

                $scope.AuditInDocList = response2.data.Result || [];

                $scope.FinalDocList = [];

                // Audit list ko pehle add karo
                angular.forEach($scope.AuditInDocList, function (audit) {
                    audit.IsAudit = true;
                    $scope.FinalDocList.push(audit);
                });


                angular.forEach($scope.InDocList, function (item) {

                    var exists = false;



                    angular.forEach($scope.AuditInDocList, function (a) {

                        if (
                            a.DocumentName &&
                            item.DocumentName &&
                            a.DocumentName.trim().toLowerCase() ==
                            item.DocumentName.trim().toLowerCase()
                        ) {
                            exists = true;
                        }

                    });

                    if (!exists) {
                        item.IsAudit = false;
                        $scope.FinalDocList.push(item);
                    }


                });

            });

        });

    };


    $scope.GetDocument = function (Id) {

        var collectionobj = {};
        collectionobj.Action = 51;
        collectionobj.Updatedby = LoginId;
        collectionobj.Id = Id;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.InDocList = '';
                $scope.Pendding = response.data[0].Pendding;
                $scope.Submit = response.data[0].Submit;
                $scope.Reject = response.data[0].Reject;
                $scope.NewReq = response.data[0].NewReq;
                $scope.TotalDoc = response.data[0].TotalDoc;
                $scope.IDATE = response.data[0].InvDate;
                $scope.ClientName = response.data[0].Name;
                $scope.ClientId = response.data[0].ClientId;
                $scope.Location = response.data[0].Location;
                $scope.RegInvoiceNo = response.data[0].RegInvoiceNo;
                $scope.InvoiceNo = response.data[0].InvoiceNo;
                $scope.HeaderInvoice = response.data[0].HeaderInvoice;

                $scope.DayLeft = response.data[0].DayLeft;
                $scope.Flag = response.data[0].Flag;

                if ($scope.DayLeft == "0") {
                    $('.lbldayleft').css('color', 'red');
                    $scope.DayLeft = 'Day Left : Uploading Time Expire, Please Contact to Admin';
                    $scope.TimeLeftMsg = true;

                }
                else {
                    $('.lbldayleft').css('color', 'green');
                    $scope.DayLeft = 'Last day of document submision: ' + response.data[0].WIEndDate + ' ;  Day Left :' + $scope.DayLeft;
                    $scope.TimeLeftMsg = false;
                }
                if ($scope.HeaderInvoice == "Unique No : ") {
                    $scope.WhichDate = "Created Date : ";
                }
                else {
                    $scope.WhichDate = "Invoice Date :";
                }
                $scope.ConversationId = response.data[0].ConversationId;
                $scope.InDocList = response.data;
                $scope.$applyAsync();

            }
            else { $scope.ClearDocumentData(); alert('Something went wrong, Contact to Admin'); }

        });
    };

    $scope.ClearDocumentData = function () {
        $scope.InDocList = [];
        $scope.Pendding = '';
        $scope.Submit = '';
        $scope.Reject = '';
        $scope.NewReq = '';
        $scope.TotalDoc = '';
        $scope.IDATE = '';
        $scope.ClientName = '';
        $scope.ClientId = '';
        $scope.Location = '';
        $scope.RegInvoiceNo = '';
        $scope.InvoiceNo = '';
        $scope.HeaderInvoice = '';
        $scope.DayLeft = '';
        $scope.Flag = '';
        $scope.WhichDate = '';
        $scope.ConversationId = '';
        $scope.TimeLeftMsg = false;
    };
    $scope.ValidateFileDoc = function (InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId) {

        /*fileName = document.querySelector('#fuCandidatePhoto1' + index).value;*/



        var fileInput = document.querySelector('#fuCandidatePhoto1' + index);

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showMsgBox(
                '999',
                'Oops !',
                'File Not Found, Please Upload Again.',
                'warning',
                'btn-warning'
            );
            return;
        }

        var fileName = fileInput.files[0].name;

        var extension = fileName.split('.').pop().toLowerCase();

        if (fileName != "") {
            /*extension = fileName.substring(fileName.lastIndexOf('.') + 1);*/
            if (FormatFile == extension) {
                $scope.UploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId, $scope.AccPercentage);
            }
            else if (FormatFile == 'image') {
                if (extension == 'jpg') {
                    $scope.UploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId, $scope.AccPercentage);
                }
                else if (extension == 'png') {
                    $scope.UploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, FormatFile, index, ConversationId, $scope.AccPercentage);
                }
                else {
                    showMsgBox('999', 'Rejected', 'File Not Correct Format,please Upload in jpg or png format', 'warning', 'btn-warning');
                    return;
                }
            }
            else {
                showMsgBox('999', 'Rejected', 'File Not Correct Format,please Upload in ' + FormatFile + ' format', 'warning', 'btn-warning');
                return;
            }
        } else {
            showMsgBox('999', 'OOps !', 'File Not Found,Please Upload in proper way.', 'warning', 'btn-warning');
            return;
        }

    }

    $scope.showDetailPopup = function (detail) {
        $scope.SelectedDetail = $sce.trustAsHtml(detail);
        $("#detailModal").modal("show");
    };
    $scope.UploadDocument = function (InvoiceNo, SNO, DocumentName, DocumentId, ConversationId, x) {
        debugger;
        {
            $scope.showLoader();
            var collectionobj = {};


            collectionobj.InvoiceId = InvoiceNo;
            collectionobj.ConversationId = ConversationId;
            collectionobj.SNO = SNO;
            collectionobj.DocumentName = DocumentName;
            collectionobj.DocumentId = DocumentId;
            collectionobj.FileDoc = $scope.FileDoc;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Percentage = $scope.AccPercentage;
            collectionobj.Detail = $scope.detailSave;
            collectionobj.ActionType = 8;

            var getData = myService.methode('POST', "../VenInvoice/UploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');

            getData.then(function (response) {

                $scope.GetDocument($scope.RegInvoiceNo);
                $scope.BindAutomateDocumentList($scope.CurrentRow);
                $scope.detailSave = '';
                showMsgBox(response.data.Result);

            });
        }
    }
    $scope.AutomationextractData = async function (InvoiceNo, SNO, DocumentName, DocumentId, ConversationId, pdftext) {

        function accurateMatch(compareValue, pdftext) {

            if (!compareValue || !pdftext)
                return false;

            let search = compareValue
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();

            let text = pdftext
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();

            const monthMap = {
                january: ['january', 'jan'],
                february: ['february', 'feb'],
                march: ['march', 'mar'],
                april: ['april', 'apr'],
                may: ['may'],
                june: ['june', 'jun'],
                july: ['july', 'jul'],
                august: ['august', 'aug'],
                september: ['september', 'sept', 'sep'],
                october: ['october', 'oct'],
                november: ['november', 'nov'],
                december: ['december', 'dec']
            };

            if (monthMap[search]) {
                return monthMap[search].some(m =>
                    new RegExp(`\\b${m}\\b`, 'i').test(text)
                );
            }

            return new RegExp(
                `\\b${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
                'i'
            ).test(text);
        }

        pdftext = (pdftext || "").replace(/\s+/g, " ").trim();

        let collectionobj = {
            Action: 53,
            Id: DocumentId
        };

        try {

            let response = await myService.methode(
                'POST',
                "../Communication/GetCommunication",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            );

            let ValidationData = response.data || [];

            $scope.hideValidationLoader();

            if (ValidationData.length === 0) {

                swal({
                    title: "Validation Warning",
                    text: "No validation rules found. Do you want to upload anyway?",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Upload Anyway",
                    cancelButtonText: "Cancel",
                    closeOnConfirm: true
                },
                    function (isConfirm) {

                        if (!isConfirm) {
                            return;
                        }

                        $scope.$applyAsync(function () {

                            setTimeout(function () {
                                $scope.detailSave = 'No validation rules found.';
                                $scope.AccPercentage = '0';

                                $scope.AutomationUploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, ConversationId)

                            }, 500);

                        });

                    });
            }

            let detailHtml =
                "<table class='table table-bordered'>" +
                "<thead>" +
                "<tr><th>Validation</th><th>Status</th></tr>" +
                "</thead><tbody>";

            swal({
                title: "Validation In Progress",
                text:
                    "<div style='width:100%;background:#eee;border-radius:8px'>" +
                    "<div id='progressBar' style='width:0%;height:20px;background:green;color:white;text-align:center;border-radius:8px'>0%</div>" +
                    "</div><br>" +
                    "<table class='table table-bordered'>" +
                    "<thead><tr><th>Validation</th><th>Status</th></tr></thead>" +
                    "<tbody id='validationProgress'></tbody>" +
                    "</table>",
                html: true,
                showConfirmButton: false
            });

            let successCount = 0;

            const headerMap = {
                "FormNo": "FormNo",
                "Heading": "Heading",
                "Format": "Format",
                "Registeration No": "RegisterationNo",
                "Establishment Name": "EstablishmentName",
                "Payment Status": "PaymentStatus",
                "EmployersCodeNo": "EmployerCodeNo",
                "EmployersCodeNo.": "EmployerCodeNo",
                "Challan Period": "ChallanPeriod",
                "Challan Number": "ChallanNumber",
                "Contribution Year": "ContributionYear",
                "Period of Return": "PeriodofReturn",
                "Period Covered by Return": "PeriodCoveredbyReturn",
                "Transaction Status": "TransactionStatus",
                "Employer's Name": "EmployerName",
                "Transaction Number": "TransactionNumber",
                "Name of Establishment": "NameofEstablishment",
                "Establishment Id": "EstablishmentId",
                "RETURN STATEMENT(Regular Return)": "RETURNSTATEMENT",
                "EMPLOYEE'S PROVIDENT FUND ORGANISATION": "EMPLOYEEPROVIDENTFUNDORGANISATION",
                "InsuredName": "InsuredName",
                "Insured Name": "InsuredAddress",
                "Period of Insurance": "PeriodofInsurance",
                "EMPLOYEES COMPENSATION INSURANCE": "EMPLOYEESCOMPENSATIONINSURANCE"
            };

            for (let i = 0; i < ValidationData.length; i++) {

                let item = ValidationData[i];

                $("#validationProgress").append(
                    "<tr id='row" + i + "'>" +
                    "<td>" + item.ValidationHeader + "</td>" +
                    "<td>⏳ Processing...</td>" +
                    "</tr>"
                );

                await new Promise(r => setTimeout(r, 700));

                let compareValue = item.ValidationValue || "";

                if (!compareValue.trim()) {

                    let originalHeader = (item.ValidationHeader || "").trim();

                    let mappedHeader =
                        headerMap[originalHeader] || originalHeader;

                    let possibleHeaders = [
                        ...new Set([originalHeader, mappedHeader])
                    ];

                    // Direct Match
                    for (let header of possibleHeaders) {

                        compareValue =
                            ($scope.DocumentValidationData &&
                                $scope.DocumentValidationData[header]) ||

                            ($scope.MasterValidationData &&
                                $scope.MasterValidationData[header]) ||

                            '';

                        if (compareValue)
                            break;
                    }

                    // Flexible Match
                    if (!compareValue) {

                        for (let header of possibleHeaders) {

                            let normalizedHeader = header
                                .replace(/[^a-zA-Z0-9]/g, '')
                                .toLowerCase();

                            if ($scope.DocumentValidationData) {

                                let matchedKey = Object.keys($scope.DocumentValidationData)
                                    .find(function (key) {

                                        return key
                                            .replace(/[^a-zA-Z0-9]/g, '')
                                            .toLowerCase() === normalizedHeader;

                                    });

                                if (matchedKey) {

                                    compareValue =
                                        $scope.DocumentValidationData[matchedKey];

                                    break;
                                }
                            }

                            if (!compareValue &&
                                $scope.MasterValidationData) {

                                let matchedKey = Object.keys($scope.MasterValidationData)
                                    .find(function (key) {

                                        return key
                                            .replace(/[^a-zA-Z0-9]/g, '')
                                            .toLowerCase() === normalizedHeader;

                                    });

                                if (matchedKey) {

                                    compareValue =
                                        $scope.MasterValidationData[matchedKey];

                                    break;
                                }
                            }
                        }
                    }
                }

                console.log(
                    "ValidationHeader:",
                    item.ValidationHeader,
                    "CompareValue:",
                    compareValue
                );

                let matched = compareValue
                    ? accurateMatch(compareValue, pdftext)
                    : false;

                let rowHtml = "";

                if (matched) {

                    successCount++;

                    rowHtml =
                        "<tr>" +
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>✅ Found (" + compareValue + ")</td>" +
                        "</tr>";

                    $("#row" + i).html(
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>✅ Found (" + compareValue + ")</td>"
                    );
                }
                else {

                    rowHtml =
                        "<tr>" +
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>❌ Not Found</td>" +
                        "</tr>";

                    $("#row" + i).html(
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>❌ Not Found</td>"
                    );
                }

                detailHtml += rowHtml;

                let percent = Math.round(
                    ((i + 1) / ValidationData.length) * 100
                );

                $("#progressBar")
                    .css("width", percent + "%")
                    .html(percent + "%");
            }

            detailHtml += "</tbody></table>";

            $scope.detailSave = detailHtml;

            //let finalPercent = Math.round(
            //    (successCount / ValidationData.length) * 100
            //);
            let finalPercent = ValidationData.length > 0
                ? Math.round((successCount / ValidationData.length) * 100)
                : 0;
            $scope.AccPercentage = finalPercent;

            setTimeout(function () {
                let isValid = (finalPercent === 100);


                let msg =
                    "Matched : " +
                    successCount +
                    "/" +
                    ValidationData.length +
                    " (" +
                    finalPercent +
                    "%)";

                swal({
                    title: isValid
                        ? "Validation Complete"
                        : "Validation Warning",

                    text:
                        "<b>Total Validation Match:</b> " +
                        successCount + "/" + ValidationData.length +
                        "<br><b>Calculate Accuracy:</b> " +
                        finalPercent + "%",

                    html: true,
                    type: isValid ? "success" : "warning",
                    showCancelButton: true,
                    closeOnConfirm: true,
                    confirmButtonText: "Upload Anyway"
                },
                    function () {
                        $scope.$applyAsync(function () {

                            setTimeout(function () {
                                debugger;
                                $scope.detailSave = detailHtml;
                                $scope.AccPercentage = finalPercent;
                                $scope.AutomationUploadDocument(InvoiceNo, SNO, DocumentName, DocumentId, ConversationId)
                            }, 500);

                        });
                        /* callback(isValid, msg); */

                    });

            }, 800);

        }
        catch (e) {

            console.error(e);

            callback(
                false,
                "Validation failed : " +
                (e.message || e)
            );
        }
    };
    $scope.AutomationUploadDocument = function (InvoiceNo, SNO, DocumentName, DocumentId, ConversationId) {
        debugger;
        {

            $scope.showLoader();
            var collectionobj = {};


            collectionobj.InvoiceId = InvoiceNo;
            collectionobj.ConversationId = ConversationId;
            collectionobj.SNO = SNO;
            collectionobj.DocumentName = DocumentName;
            collectionobj.DocumentId = DocumentId;
            collectionobj.FileDoc = 'Automation';
            collectionobj.CreatedBy = LoginId;
            collectionobj.Percentage = $scope.AccPercentage;
            collectionobj.Detail = $scope.detailSave;
            collectionobj.ActionType = 8;

            var getData = myService.methode('POST', "../VenInvoice/UploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');

            getData.then(function (response) {

                $scope.GetDocument($scope.RegInvoiceNo);
                $scope.detailSave = '';
                showMsgBox(response.data.Result);

            });
        }
    }


    $scope.Callforvalidation = function (x) {
        $scope.MasterValidationData = {


            ClientName: x.ClientName || '',
            ContractorName: x.ContractorName || '',
            State: x.StateName || '',
            Site: x.SiteName || '',
            Month: x.InMonthName || '',
            Year: x.Year || '',

        };
        $scope.Automation = x.Automation;
    };
    $scope.CallforDocumentvalidation = function (x) {
        $scope.DocumentValidationData = {
            FormNo: x.FormNo || '',
            Heading: x.Heading || '',
            Format: x.Format || '',
            RegisterationNo: x.RegisterationNo || '',
            EstablishmentName: x.EstablishmentName || Name,
            PaymentStatus: x.PaymentStatus || '',
            EmployerCodeNo: x.EmployerCodeNo || '',
            ChallanPeriod: x.ChallanPeriod || x.InMonthName + '-' + x.Year,
            ChallanNumber: x.ChallanNumber || '',
            ContributionYear: x.ContributionYear || x.Year,
            PeriodofReturn: x.PeriodofReturn || x.InMonthName + '-' + x.Year,
            PeriodCoveredbyReturn: x.PeriodCoveredbyReturn || x.InMonthName + '-' + x.Year,
            TransactionStatus: x.TransactionStatus || '',
            EmployerName: x.EmployerName || Name,
            TransactionNumber: x.TransactionNumber || '',
            NameofEstablishment: x.NameofEstablishment || Name,
            EstablishmentId: x.EstablishmentId || '',
            RETURNSTATEMENT: x.RETURNSTATEMENT || '',
            EMPLOYEEPROVIDENTFUNDORGANISATION: x.EMPLOYEEPROVIDENTFUNDORGANISATION || '',
            InsuredName: x.InsuredName || Name,
            InsuredAddress: x.InsuredAddress || BranchAddress,
            PeriodofInsurance: x.PeriodofInsurance || x.InMonthName + '-' + x.Year,
            EMPLOYEESCOMPENSATIONINSURANCE: x.EMPLOYEESCOMPENSATIONINSURANCE || ''
        };
    };
    $scope.extractData = async function (pdftext, SelectedColumn, rowId, DocumentId, callback) {

        function accurateMatch(compareValue, pdftext) {

            if (!compareValue || !pdftext)
                return false;

            let search = compareValue
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();

            let text = pdftext
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();

            const monthMap = {
                january: ['january', 'jan'],
                february: ['february', 'feb'],
                march: ['march', 'mar'],
                april: ['april', 'apr'],
                may: ['may'],
                june: ['june', 'jun'],
                july: ['july', 'jul'],
                august: ['august', 'aug'],
                september: ['september', 'sept', 'sep'],
                october: ['october', 'oct'],
                november: ['november', 'nov'],
                december: ['december', 'dec']
            };

            if (monthMap[search]) {
                return monthMap[search].some(m =>
                    new RegExp(`\\b${m}\\b`, 'i').test(text)
                );
            }

            return new RegExp(
                `\\b${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
                'i'
            ).test(text);
        }

        pdftext = (pdftext || "").replace(/\s+/g, " ").trim();

        let collectionobj = {
            Action: 53,
            Id: DocumentId
        };

        try {

            let response = await myService.methode(
                'POST',
                "../Communication/GetCommunication",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            );

            let ValidationData = response.data || [];

            $scope.hideValidationLoader();

            if (ValidationData.length === 0) {

                swal({
                    title: "Validation Warning",
                    text: "No validation rules found. Do you want to upload anyway?",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Upload Anyway",
                    cancelButtonText: "Cancel",
                    closeOnConfirm: true
                },
                    function (isConfirm) {

                        if (!isConfirm) {
                            return;
                        }

                        $scope.$applyAsync(function () {

                            setTimeout(function () {
                                $scope.detailSave = 'No validation rules found.';
                                $scope.AccPercentage = '0';

                                $('#btnupload' + rowId).trigger('click');

                            }, 500);

                        });

                    });
            }

            let detailHtml =
                "<table class='table table-bordered'>" +
                "<thead>" +
                "<tr><th>Validation</th><th>Status</th></tr>" +
                "</thead><tbody>";

            swal({
                title: "Validation In Progress",
                text:
                    "<div style='width:100%;background:#eee;border-radius:8px'>" +
                    "<div id='progressBar' style='width:0%;height:20px;background:green;color:white;text-align:center;border-radius:8px'>0%</div>" +
                    "</div><br>" +
                    "<table class='table table-bordered'>" +
                    "<thead><tr><th>Validation</th><th>Status</th></tr></thead>" +
                    "<tbody id='validationProgress'></tbody>" +
                    "</table>",
                html: true,
                showConfirmButton: false
            });

            let successCount = 0;

            const headerMap = {
                "FormNo": "FormNo",
                "Heading": "Heading",
                "Format": "Format",
                "Registeration No": "RegisterationNo",
                "Establishment Name": "EstablishmentName",
                "Payment Status": "PaymentStatus",
                "EmployersCodeNo": "EmployerCodeNo",
                "EmployersCodeNo.": "EmployerCodeNo",
                "Challan Period": "ChallanPeriod",
                "Challan Number": "ChallanNumber",
                "Contribution Year": "ContributionYear",
                "Period of Return": "PeriodofReturn",
                "Period Covered by Return": "PeriodCoveredbyReturn",
                "Transaction Status": "TransactionStatus",
                "Employer's Name": "EmployerName",
                "Transaction Number": "TransactionNumber",
                "Name of Establishment": "NameofEstablishment",
                "Establishment Id": "EstablishmentId",
                "RETURN STATEMENT(Regular Return)": "RETURNSTATEMENT",
                "EMPLOYEE'S PROVIDENT FUND ORGANISATION": "EMPLOYEEPROVIDENTFUNDORGANISATION",
                "InsuredName": "InsuredName",
                "Insured Name": "InsuredAddress",
                "Period of Insurance": "PeriodofInsurance",
                "EMPLOYEES COMPENSATION INSURANCE": "EMPLOYEESCOMPENSATIONINSURANCE"
            };

            for (let i = 0; i < ValidationData.length; i++) {

                let item = ValidationData[i];

                $("#validationProgress").append(
                    "<tr id='row" + i + "'>" +
                    "<td>" + item.ValidationHeader + "</td>" +
                    "<td>⏳ Processing...</td>" +
                    "</tr>"
                );

                await new Promise(r => setTimeout(r, 700));

                let compareValue = item.ValidationValue || "";

                if (!compareValue.trim()) {

                    let originalHeader = (item.ValidationHeader || "").trim();

                    let mappedHeader =
                        headerMap[originalHeader] || originalHeader;

                    let possibleHeaders = [
                        ...new Set([originalHeader, mappedHeader])
                    ];

                    // Direct Match
                    for (let header of possibleHeaders) {

                        compareValue =
                            ($scope.DocumentValidationData &&
                                $scope.DocumentValidationData[header]) ||

                            ($scope.MasterValidationData &&
                                $scope.MasterValidationData[header]) ||

                            '';

                        if (compareValue)
                            break;
                    }

                    // Flexible Match
                    if (!compareValue) {

                        for (let header of possibleHeaders) {

                            let normalizedHeader = header
                                .replace(/[^a-zA-Z0-9]/g, '')
                                .toLowerCase();

                            if ($scope.DocumentValidationData) {

                                let matchedKey = Object.keys($scope.DocumentValidationData)
                                    .find(function (key) {

                                        return key
                                            .replace(/[^a-zA-Z0-9]/g, '')
                                            .toLowerCase() === normalizedHeader;

                                    });

                                if (matchedKey) {

                                    compareValue =
                                        $scope.DocumentValidationData[matchedKey];

                                    break;
                                }
                            }

                            if (!compareValue &&
                                $scope.MasterValidationData) {

                                let matchedKey = Object.keys($scope.MasterValidationData)
                                    .find(function (key) {

                                        return key
                                            .replace(/[^a-zA-Z0-9]/g, '')
                                            .toLowerCase() === normalizedHeader;

                                    });

                                if (matchedKey) {

                                    compareValue =
                                        $scope.MasterValidationData[matchedKey];

                                    break;
                                }
                            }
                        }
                    }
                }

                console.log(
                    "ValidationHeader:",
                    item.ValidationHeader,
                    "CompareValue:",
                    compareValue
                );

                let matched = compareValue
                    ? accurateMatch(compareValue, pdftext)
                    : false;

                let rowHtml = "";

                if (matched) {

                    successCount++;

                    rowHtml =
                        "<tr>" +
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>✅ Found (" + compareValue + ")</td>" +
                        "</tr>";

                    $("#row" + i).html(
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>✅ Found (" + compareValue + ")</td>"
                    );
                }
                else {

                    rowHtml =
                        "<tr>" +
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>❌ Not Found</td>" +
                        "</tr>";

                    $("#row" + i).html(
                        "<td>" + item.ValidationHeader + "</td>" +
                        "<td>❌ Not Found</td>"
                    );
                }

                detailHtml += rowHtml;

                let percent = Math.round(
                    ((i + 1) / ValidationData.length) * 100
                );

                $("#progressBar")
                    .css("width", percent + "%")
                    .html(percent + "%");
            }

            detailHtml += "</tbody></table>";

            $scope.detailSave = detailHtml;

            //let finalPercent = Math.round(
            //    (successCount / ValidationData.length) * 100
            //);
            let finalPercent = ValidationData.length > 0
                ? Math.round((successCount / ValidationData.length) * 100)
                : 0;
            $scope.AccPercentage = finalPercent;

            setTimeout(function () {
                let isValid = (finalPercent === 100);


                let msg =
                    "Matched : " +
                    successCount +
                    "/" +
                    ValidationData.length +
                    " (" +
                    finalPercent +
                    "%)";

                swal({
                    title: isValid
                        ? "Validation Complete"
                        : "Validation Warning",

                    text:
                        "<b>Total Validation Match:</b> " +
                        successCount + "/" + ValidationData.length +
                        "<br><b>Calculate Accuracy:</b> " +
                        finalPercent + "%",

                    html: true,
                    type: isValid ? "success" : "warning",
                    showCancelButton: true,
                    closeOnConfirm: true,
                    confirmButtonText: "Upload Anyway"
                },
                    function () {
                        $scope.$applyAsync(function () {

                            setTimeout(function () {
                                debugger;
                                $scope.detailSave = detailHtml;
                                $scope.AccPercentage = finalPercent;
                                $('#btnupload' + rowId).click();
                            }, 500);

                        });
                        /* callback(isValid, msg); */

                    });

            }, 800);

        }
        catch (e) {

            console.error(e);

            callback(
                false,
                "Validation failed : " +
                (e.message || e)
            );
        }
    };

    $scope.CurrentUploadInput = null;
    $scope.CurrentFieldName = null;
    $scope.uploadFile = function (fieldName, input) {


        $scope.CurrentUploadInput = input;
        $scope.CurrentFieldName = fieldName;

        let index = input.id.replace('fuCandidatePhoto1', '');
        let xx = $scope.InDocList[index];

        $scope.CallforDocumentvalidation(xx);

        let documentId = $(input).data("documentid");
        processFile();
        let idText = input.id.replace(fieldName, "");
        let rowId = index;/*parseInt(idText);*/



        const file = input.files[0];

        if (!file) {
            $scope.hideValidationLoader();
            return;
        }

        // Validate extension
        let allowedFormat = (xx.FormatType || "").toLowerCase();
        let uploadedExt = file.name.split('.').pop().toLowerCase();

        if (allowedFormat !== uploadedExt) {

            swal(
                "Invalid File",
                "Only ." + allowedFormat + " file allowed.",
                "error"
            );

            input.value = "";
            return;
        }

        $scope.showValidationLoader();

        ReadingFile(
            input.files,
            index,
            rowId,
            documentId,
            function (isValid, msg) {



                if (!isValid) {

                    swal({
                        title: "Validation Warning",
                        text: msg,
                        type: "warning",
                        showCancelButton: true,
                        closeOnConfirm: true,
                        confirmButtonText: "Upload Anyway"
                    },
                        function (isConfirm) {

                            if (isConfirm) {

                                swal.close();



                                $scope.$applyAsync(function () {

                                    setTimeout(function () {
                                        debugger;
                                        $scope.detailSave = msg;
                                        $scope.AccPercentage = '0';
                                        $('#btnupload' + rowId).click();
                                    }, 500);

                                });
                            }
                        });
                }
                else {

                    processFile();
                }
            }
        );
    };
    function processFile() {


        let input = $scope.CurrentUploadInput;
        let fieldName = $scope.CurrentFieldName;

        if (!input)
            return;

        let id = $(input).attr('id');


        if (input.files && input.files[0]) {

            let reader = new FileReader();

            reader.onload = function (e) {

                $scope.FileDoc = e.target.result;

                $scope[id] = '1';

                $scope.$applyAsync();

                console.log("File Saved");
            };

            reader.readAsDataURL(
                input.files[0]
            );
        }


    }
    function ReadingFile(files, index, rowId, documentId, callback) {

        function UploadAfterConfirm(rowId, message) {

            swal({
                title: "Validation Warning",
                text: message,
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Upload Anyway",
                cancelButtonText: "Cancel",
                closeOnConfirm: true
            }, function (isConfirm) {

                if (isConfirm) {

                    setTimeout(function () {
                        $scope.detailSave = message;
                        $scope.AccPercentage = '0';
                        $('#btnupload' + rowId).trigger('click');

                    }, 500);
                }
            });
        }

        if (!files || !files[0]) {
            callback(true, "File not received.");
            return;
        }

        let file = files[0];

        // IMAGE
        if (file.type.startsWith("image")) {

            Tesseract.recognize(file, "eng")
                .then(function (result) {

                    let extractedText = result.data.text || "";

                    if (!extractedText.trim()) {

                        $scope.detailSave = 'File is being saved without proper validation.';
                        $scope.AccPercentage = '0';

                        UploadAfterConfirm(
                            rowId,
                            "No readable text found in the image. Do you want to upload anyway?"
                        );

                        return;
                    }

                    $scope.$applyAsync(function () {

                        $scope.extractData(
                            extractedText,
                            index,
                            rowId,
                            documentId,
                            callback
                        );

                    });

                })
                .catch(function (err) {

                    $scope.hideValidationLoader();

                    console.error(err);

                    $scope.detailSave = 'File is being saved without proper validation.';
                    $scope.AccPercentage = '0';

                    UploadAfterConfirm(
                        rowId,
                        "Unable to read image. Do you want to upload anyway?"
                    );
                });

            $scope.hideValidationLoader();
            return;
        }

        // PDF
        let reader = new FileReader();

        reader.onload = async function () {

            try {

                let typedarray = new Uint8Array(this.result);

                let pdf = await pdfjsLib
                    .getDocument({ data: typedarray })
                    .promise;

                let pagePromises = [];

                for (let i = 1; i <= pdf.numPages; i++) {

                    pagePromises.push(
                        pdf.getPage(i).then(async function (page) {

                            let textContent =
                                await page.getTextContent();

                            let pageText = textContent.items
                                .map(x => x.str)
                                .join(" ");

                            if (pageText.trim())
                                return pageText;

                            // OCR fallback
                            let viewport =
                                page.getViewport({ scale: 2 });

                            let canvas =
                                document.createElement("canvas");

                            let context =
                                canvas.getContext("2d");

                            canvas.width = viewport.width;
                            canvas.height = viewport.height;

                            await page.render({
                                canvasContext: context,
                                viewport: viewport
                            }).promise;

                            let result =
                                await Tesseract.recognize(
                                    canvas,
                                    "eng"
                                );

                            return result.data.text || "";
                        })
                    );
                }

                let texts = await Promise.all(pagePromises);

                let allText = texts.join(" ");

                if (!allText.trim()) {

                    $scope.hideValidationLoader();

                    $scope.AccPercentage = '0';
                    $scope.detailSave = 'File is being saved without proper validation.';

                    UploadAfterConfirm(
                        rowId,
                        "No readable text found in the PDF. Do you want to upload anyway?"
                    );

                    return;
                }

                console.log("Final Text:", allText);

                $scope.$applyAsync(function () {

                    $scope.extractData(
                        allText,
                        index,
                        rowId,
                        documentId,
                        callback
                    );

                });

            }
            catch (err) {

                console.error(err);

                $scope.hideValidationLoader();

                $scope.AccPercentage = '0';
                $scope.detailSave = 'File is being saved without proper validation.';

                UploadAfterConfirm(
                    rowId,
                    "Unable to read PDF. Do you want to upload anyway?"
                );
            }
        };

        reader.readAsArrayBuffer(file);
    }
    //function ReadingFile(files, index, rowId, documentId, callback) {

    //    if (!files || !files[0]) {
    //        callback(true, "File not received.");
    //        return;
    //    }

    //    let file = files[0];

    //    // IMAGE
    //    if (file.type.startsWith("image"))
    //    {

    //        Tesseract.recognize(file, "eng")
    //            .then(function (result) {

    //                let extractedText = result.data.text || "";

    //                if (!extractedText.trim()) {

    //                    swal(
    //                        "Invalid Image",
    //                        "No readable text found.",
    //                        "error"
    //                    );
    //                    $scope.detailSave = 'File is being saved without proper validation.';
    //                    $scope.AccPercentage = '0';

    //                    $scope.$applyAsync(function () {

    //                        setTimeout(function () {
    //                            debugger;
    //                            $('#btnupload' + rowId).click();
    //                        }, 500);

    //                    });
    //                 /*   callback(true, "OCR failed.");*/
    //                    return;
    //                }

    //                $scope.$applyAsync(function () {

    //                    $scope.extractData(
    //                        extractedText,
    //                        index,
    //                        rowId,
    //                        documentId,
    //                        callback
    //                    );
    //                });
    //            })
    //            .catch(function (err) {
    //                $scope.hideValidationLoader();
    //                console.error(err);

    //                swal(
    //                    "Error",
    //                    "Unable to read image.",
    //                    "error"
    //                );
    //                $scope.detailSave = 'File is being saved without proper validation.';
    //                $scope.AccPercentage = '0';
    //                $scope.$applyAsync(function () {

    //                    setTimeout(function () {
    //                        debugger;
    //                        $('#btnupload' + rowId).click();
    //                    }, 500);

    //                });
    //              /*  callback(true, err);*/
    //            });
    //        $scope.hideValidationLoader();
    //        return;
    //    }

    //    // PDF
    //    let reader = new FileReader();

    //    reader.onload = async function () {

    //        try {

    //            let typedarray = new Uint8Array(this.result);

    //            let pdf = await pdfjsLib
    //                .getDocument({ data: typedarray })
    //                .promise;

    //            let pagePromises = [];

    //            for (let i = 1; i <= pdf.numPages; i++) {

    //                pagePromises.push(
    //                    pdf.getPage(i).then(async function (page) {

    //                        let textContent =
    //                            await page.getTextContent();

    //                        let pageText = textContent.items
    //                            .map(x => x.str)
    //                            .join(" ");

    //                        if (pageText.trim())
    //                            return pageText;

    //                        // OCR fallback
    //                        let viewport =
    //                            page.getViewport({ scale: 2 });

    //                        let canvas =
    //                            document.createElement("canvas");

    //                        let context =
    //                            canvas.getContext("2d");

    //                        canvas.width = viewport.width;
    //                        canvas.height = viewport.height;

    //                        await page.render({
    //                            canvasContext: context,
    //                            viewport: viewport
    //                        }).promise;

    //                        let result =
    //                            await Tesseract.recognize(
    //                                canvas,
    //                                "eng"
    //                            );

    //                        return result.data.text || "";
    //                    })
    //                );
    //            }

    //            let texts = await Promise.all(pagePromises);

    //            let allText = texts.join(" ");

    //            if (!allText.trim()) {
    //                $scope.hideValidationLoader();
    //                $scope.AccPercentage = '0';
    //                $scope.detailSave = 'File is being saved without proper validation.';


    //                var msg = "No readable text found.";
    //                swal({
    //                    title: "Validation Warning",
    //                    text: msg,
    //                    type: "warning",
    //                    showCancelButton: true,
    //                    closeOnConfirm: true,
    //                    confirmButtonText: "Upload Anyway"
    //                },
    //                    function (isConfirm) {
    //                        $scope.$applyAsync(function () {

    //                            setTimeout(function () {
    //                                debugger;
    //                                $('#btnupload' + rowId).click();
    //                            }, 500);

    //                        });
    //                    }

    //            };

    //            console.log("Final Text:", allText);

    //            $scope.$applyAsync(function () {

    //                $scope.extractData(
    //                    allText,
    //                    index,
    //                    rowId,
    //                    documentId,
    //                    callback
    //                );
    //            });

    //        }
    //        catch (err) {

    //            console.error(err);

    //            swal(
    //                "Error",
    //                "Unable to read PDF.",
    //                "error"
    //            );


    //            $scope.AccPercentage = '0';
    //            $scope.detailSave = 'File is being saved without proper validation.';
    //            $scope.$applyAsync(function () {

    //                setTimeout(function () {
    //                    debugger;
    //                    $('#btnupload' + rowId).click();
    //                }, 500);

    //            });
    //           /* callback(true, err);*/
    //        }
    //    };

    //    reader.readAsArrayBuffer(file);
    //}


    $scope.ChkDefaultFile = function () {
        for (var i = 0; i < $scope.InDocList.length; i++) {
            if ($scope.InDocList[i].IsUpload == '' && $scope.InDocList[i].IsDefault == true) {
                showMsgBox('999', 'Auditor Requirement', 'Please Attact Document of ' + $scope.InDocList[i].DocumentName, 'warning', 'btn-warning')
                return;
            }
        }
        $scope.SaveAuditorRecord();
    }

    $scope.SaveAuditorRecord = function () {
        var collectionobj = {};
        collectionobj.InvoiceId = $scope.RegInvoiceNo;
        collectionobj.ClientId = $scope.ClientId;
        collectionobj.ConversationId = $scope.ConversationId;
        collectionobj.CreatedBy = LoginId;
        collectionobj.ActionType = 16
        var getData = myService.methode('POST', "../VenInvoice/ApproveUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            showMsgBox('999', 'Approve', response.data.Result, 'success', 'btn-success')
            $('#btnCancel').click();
            $scope.FireEmail(2, $scope.RegInvoiceNo, '');
        });
    }

    $scope.printData = function () {

        let data = $scope.FilteredList;

        if (!data || !data.length) {
            alert("No data to print");
            return;
        }

        let createdBy = "Admin"; // yaha dynamic bhi laga sakte ho (Login user)
        let generatedOn = new Date().toLocaleString();

        let html = `
    <html>
    <head>
        <title>Print</title>
        <style>
            body { font-family: Arial; }
            .header { text-align: center; margin-bottom: 10px; }
            .company { font-size: 20px; font-weight: bold; }
            .meta { font-size: 12px; margin-top: 5px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 5px; font-size: 12px; }
            th { background: #f2f2f2; }
        </style>
    </head>
    <body>

    <div class="header">
        <div class="company">${MapUser}</div>
        <div class="meta">Created By: ${UserName}</div>
        <div class="meta">Generated On: ${generatedOn}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Party</th>
                <th>State</th>
                <th>Year</th>
                <th>Month</th>
                <th>Site</th>
                <th>Location</th>
                <th>Status</th>
                <th>Invoice</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Days</th>
            </tr>
        </thead>
        <tbody>
    `;

        data.forEach(function (item, index) {
            html += `
        <tr>
            <td>${index + 1}</td>
            <td>${item.PartyName || ''}</td>
            <td>${item.StateName || ''}</td>
            <td>${item.FYID || ''}</td>
            <td>${item.InMonthName || ''}</td>
            <td>${item.SiteName || ''}</td>
            <td>${item.Location || ''}</td>
            <td>${item.Status || ''}</td>
            <td>${item.InvoiceNo || ''}</td>
            <td>${item.CreatedOn || ''}</td>
            <td>${item.UpdatedON || ''}</td>
            <td>${item.DayLeft || ''}</td>
        </tr>`;
        });

        html += `
        </tbody>
    </table>

    </body>
    </html>
    `;

        let printWindow = window.open('', '', 'width=900,height=600');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    //$scope.exportCSV = function () {

    //    let data = $scope.InvoiceList;

    //    if (!data || !data.length) {
    //        alert("No data to export");
    //        return;
    //    }

    //    let csv = '';

    //    // Header
    //    csv += "Party Name,State,Year,Month,Site,Location,Status,Invoice No,Created On,Updated On,Day Left\n";

    //    // Rows (IMPORTANT FIX)
    //    data.forEach(function (item) {

    //        let row = [
    //            item.PartyName || '',
    //            item.StateName || '',
    //            item.FYID || '',
    //            item.InMonthName || '',
    //            item.SiteName || '',
    //            item.Location || '',
    //            item.Status || '',
    //            item.InvoiceNo || '',
    //            item.CreatedOn || '',
    //            item.UpdatedON || '',
    //            item.DayLeft || ''
    //        ];

    //        csv += row.join(",") + "\n";   // ✅ yaha fix hai
    //    });

    //    // Download
    //    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    //    let link = document.createElement("a");
    //    link.href = URL.createObjectURL(blob);
    //    link.download = "FilteredData.csv";
    //    link.click();
    //};





    //-----------------------------------Client

    $scope.exportCSV = function () {

        let data = $filter('filter')($scope.InvoiceList, $scope.Searchbox);

        if (!data || !data.length) {
            alert("No data to export");
            return;
        }

        let csv = '';

        csv += "Contractor Name,State,Year,Month,Site,Location,Status,Invoice No,Created On,Updated On,Day Left\n";

        data.forEach(function (item) {

            let row = [
                item.VName || '',
                item.StateName || '',
                item.FYID || '',
                item.InMonthName || '',
                item.SiteName || '',
                item.Location || '',
                item.Status || '',
                item.InvoiceNo || '',
                item.CreatedOn || '',
                item.UpdatedON || '',
                item.DayLeft || ''
            ];

            csv += row.join(",") + "\n";
        });

        let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "ClientSubmissionDetail.csv";
        link.click();
    };


    //-----------------------------------Client
    $scope.BindVendor = function () {
        var collectionobj = {};
        collectionobj.Action = 31;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.VendorList = response.data
            }

        });
    };

    $scope.GetClientDocument = function (Id, ConversationId) {

        $scope.ConversationId = Id;

        var collectionobj = {};
        collectionobj.Action = 37;
        collectionobj.Id = Id;
        collectionobj.Updatedby = MapId;
        collectionobj.ConversationId = ConversationId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.InDocList = '';


                $scope.InDocList = response.data;
                $scope.$applyAsync();

            }

        });
    };

    $scope.Controlbyuser = "0";
    $scope.BindControl = function () {
        var collectionobj = {};
        $scope.InDocList = "";
        if ($scope.VendorId == undefined || $scope.VendorId == "" || $scope.VendorId == null) {
            collectionobj.Id = '';
        }
        else { collectionobj.Id = $scope.VendorId; }

        collectionobj.VendorId = $scope.Controlbyuser;
        collectionobj.Updatedby = MapId;
        collectionobj.Action = 36;
        if ($scope.SearchCom == '' || $scope.SearchCom == 'undefined' || $scope.SearchCom == undefined) {
            $scope.SearchCom = '';
        }
        collectionobj.ConversationId = $scope.SearchCom;

        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.InvoiceList = response.data;
        });
    }

    //---------------------------------OCR
    $scope.ApproveBeforeDownload = function (html, Allowed, DocumentId, Doctype, DocName) {

        newhtml = '';

        if (Allowed == 1) {
            var collectionobj = {
                Action: 20,
                Id: MapId,
                State: $scope.StateNew,
                Month: $scope.MonthNew,
                Year: $scope.FyIDNew,
                SiteCode: $scope.SiteCodeNew,
            };
            var getData = myService.methode('POST', "../RetailSection/AuditGetContractorComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.EmployeeDetail = response.data.Result;
                angular.element("#employeeModal").css("display", "block");
                newhtml = html;
                $scope.Doctype = Doctype;
                $scope.DocName = DocName;
                $scope.DocumentId = DocumentId;
            });
        }
        else {
            $scope.Downloadlink(html, Allowed, DocumentId, Doctype, DocName)
        }

    };

    $scope.Downloadlink = function (html, SelectedEmployee, DocumentId, Doctype, DocName) {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 10;

        collectionobj.Month = $scope.MonthNew,
            collectionobj.State = $scope.StateNew,
            collectionobj.Year = $scope.FyIDNew,
            collectionobj.Month = $scope.MonthNew,
            collectionobj.SiteCode = $scope.SiteCodeNew,
            collectionobj.DocumentId = DocumentId;
        var getData = myService.methode('POST', "../RetailSection/AuditGetContractorComlist", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response && response.data && response.data.Result && response.data.Result.length > 0) {
                $scope.DocumentDetailList = response.data.Result;
                $scope.PartyName = response.data.Result[0].PartyName;
                $scope.ContactPerson = response.data.Result[0].ContactPerson;
                $scope.Address = response.data.Result[0].PMAddress;
                $scope.Month = $scope.getMonthName(response.data.Result[0].Month);
                $scope.Signature = response.data.Result[0].Signature;
                $scope.Nature_ofWork_contractor = response.data.Result[0].Nature_ofWork_contractor;
                $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.MaleCount = response.data.Result[0].MaleCount;
                $scope.FemaleCount = response.data.Result[0].FemaleCount;
                $scope.TotalEmployee = response.data.Result[0].TotalEmployee;
                $scope.if_mother_dies_child_survive_beneift = response.data.Result[0].if_mother_dies_child_survive_beneift;
                $scope.Date_Of_Joining = response.data.Result[0].Date_Of_Joining;
                $scope.Employee_Name = response.data.Result[0].Employee_Name;
                $scope.Nature_ofWork_contractor = response.data.Result[0].Nature_ofWork_contractor;
                $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.Date_proofof_pregnancy = response.data.Result[0].Date_proofof_pregnancy;
                $scope.Birth_date_of_child = response.data.Result[0].Birth_date_of_child;
                $scope.Date_of_Miscarriage = response.data.Result[0].Date_of_Miscarriage;
                $scope.Date_and_Amount_for_maternity_Beneift = response.data.Result[0].Date_and_Amount_for_maternity_Beneift;
                $scope.Amountof_wages_Paid_section9 = response.data.Result[0].Amountof_wages_Paid_section9;
                $scope.Amountof_wages_Paidleave_section10 = response.data.Result[0].Amountof_wages_Paidleave_section10;
                $scope.Nominated_person = response.data.Result[0].Nominated_person;
                $scope.Women_dies_Date_and_beneift_person = response.data.Result[0].Women_dies_Date_and_beneift_person;
                $scope.Total_Days_Worked = response.data.Result[0].Total_Days_Worked;
                $scope.if_mother_dies_child_survive_beneift = response.data.Result[0].if_mother_dies_child_survive_beneift;
                $scope.Date_Women_notice_Under_Sec6 = response.data.Result[0].Date_Women_notice_Under_Sec6;
                $scope.Maternity_Days = response.data.Result[0].Maternity_Days;
                $scope.Designation = response.data.Result[0].Designation;
                $scope.Department = response.data.Result[0].Department;
                $scope.Father_Name = response.data.Result[0].Father_Name;
                $scope.Name_of_contractor = response.data.Result[0].Name_of_contractor;
                $scope.Address_of_contractor = response.data.Result[0].Address_of_contractor;

                if (Doctype == 1) {
                    $scope.DownloadCompiledHtml(html);
                }
                else if (Doctype == 2) {
                    $scope.DownloadAllAsExcel(html, DocName);
                }
                else if (Doctype == 3) {
                    $scope.DownloadAllAsPDF(html, DocName);
                }
                $scope.loading[DocumentId] = false;
            } else {
                showMsgBox("OOps !, No Record Found.");
                $scope.loading[DocumentId] = false;
                return; // 🚫 Stop here
            }
        });
    }

    $scope.calcNetDeduction = function (value1, val2, val3) {
        value1 = parseFloat(value1) || 0;
        val2 = parseFloat(val2) || 0;
        val3 = parseFloat(val3) || 0;

        var result = value1 - (val2 + val3);

        // agar result negative ho to 0 return karo
        if (result < 0) result = 0;

        return result.toFixed(2); // always 2 decimals
    };

    // Two values subtraction
    $scope.twovaluesubstract = function (val1, val2) {
        val1 = parseFloat(val1) || 0;
        val2 = parseFloat(val2) || 0;

        var result = val1 - val2;

        if (result < 0) result = 0;

        return result.toFixed(2);
    };


    $scope.calculateExpressionforfive = function (a, b, c, d, e) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);

        let result = a - b + c + d + e;
        return result;
    };


    $scope.calculateExpression = function (a, b, c, d, e, f) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        let result = a - b + c + d + e + f;
        return result;
    };



    $scope.searching = false;

    $scope.calculateExpressionforseven = function (a, b, c, d, e, f, g) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        g = clean(g);
        let result = a - b + c + d + e + f + g;
        return result;
    };



    ///////// CLRA Fixed  /////////////////////


    $scope.fixedotherallowances = function (a, b, c, d, e, f) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);

        let result = a + b + c + d + e + f;
        return result;
    };


    ///////// CLRA Earned  /////////////////////

    $scope.earnedotherallowances = function (a, b, c, d, e, f, g, h, i, j, k, l) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        g = clean(g);
        h = clean(h);
        i = clean(i);
        j = clean(j);
        k = clean(k);
        l = clean(l);

        let result = a + b + c + d + e + f + g + h + i + j + k + l;
        return result;
    };



    ///////// CLRA Deduction  /////////////////////

    $scope.clraotherdeduction = function (a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
        function clean(val) {
            if (val === null || val === undefined || val === "" || val === "-") {
                return 0;
            }
            return Number(val) || 0; // number convert karega, agar NaN hua to 0
        }
        a = clean(a);
        b = clean(b);
        c = clean(c);
        d = clean(d);
        e = clean(e);
        f = clean(f);
        g = clean(g);
        h = clean(h);
        i = clean(i);
        j = clean(j);
        k = clean(k);
        l = clean(l);
        m = clean(m);
        n = clean(n);

        let result = a + b + c + d + e + f + g + h + i + j + k + l + m + n;
        return result;
    };




    $scope.twovalueAdd = function (val1, val2) {
        val1 = parseFloat(val1) || 0;
        val2 = parseFloat(val2) || 0;

        var result = val1 + val2;

        if (result < 0) result = 0;

        return result.toFixed(2);
    };
    $scope.getTimeDifference = function (v1, v2) {
        if (!v1 || !v2) return 0;

        function parseTime(timeStr) {
            let date = new Date("1970-01-01 " + timeStr);

            // Agar direct parse fail ho gaya (like 13:00 format me)
            if (isNaN(date.getTime())) {
                // Add ":00" agar sirf ghanta diya hai
                if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
                    date = new Date("1970-01-01T" + timeStr + ":00");
                }
            }

            return date;
        }

        let t1 = parseTime(v1);
        let t2 = parseTime(v2);

        if (isNaN(t1.getTime()) || isNaN(t2.getTime())) {
            return 0; // agar parse na ho to 0
        }

        let diffMs = t2 - t1;
        let minutes = diffMs / (1000 * 60);

        // Agar negative hai to 0 kar do
        if (minutes < 0) minutes = 0;

        // Agar HH:MM format chahiye
        let hours = Math.floor(minutes / 60);
        let mins = Math.floor(minutes % 60);

        return hours + " hr " + mins + " min";
    };

    $scope.twovaluemultiply = function (val1, val2) {
        val1 = parseFloat(val1) || 0;
        val2 = parseFloat(val2) || 0;

        var result = val1 * val2;

        if (result < 0) result = 0;

        return result.toFixed(2);
    };

    $scope.roundTwo = function (val) {
        if (!val) return 0;
        return Math.round((parseFloat(val) + Number.EPSILON) * 100) / 100;
    };

    $scope.calcNetAmount = function (gross, basic, da, hra, overtime) {
        // Convert values into numbers (float) safely
        gross = parseFloat(gross) > 0 ? parseFloat(gross) : 0;
        basic = parseFloat(basic) > 0 ? parseFloat(basic) : 0;
        da = parseFloat(da) > 0 ? parseFloat(da) : 0;
        hra = parseFloat(hra) > 0 ? parseFloat(hra) : 0;
        overtime = parseFloat(overtime) > 0 ? parseFloat(overtime) : 0;

        var result = gross - (basic + da + hra + overtime);

        // Agar negative aa jaye to 0 hi dikhana hai
        if (result < 0) result = 0;

        // Always return with 2 decimals
        return result.toFixed(2);
    };
    $scope.getMonthName = function (monthNum) {
        var monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return monthNames[monthNum - 1] || '';
    };

    $scope.DownloadCompiledHtml = function (htmlString) {
        var container = angular.element('<div></div>');
        container.html(htmlString);

        var compiledContent = $compile(container.contents())($scope);

        // Append to a hidden div
        var printArea = document.getElementById('print-area');
        printArea.innerHTML = '';
        angular.element(printArea).append(compiledContent);
        checkNoRecord();

        // Use $timeout to ensure bindings complete before opening new window
        setTimeout(function () {
            var content = printArea.innerHTML;

            var win = window.open('', '', 'height=700,width=1000');
            win.document.open();
            win.document.write('<html><head><title>Print</title></head><body>');
            win.document.write(content);
            win.document.write('</body></html>');
            win.document.close();

            win.focus();
            win.print();
            /*  win.close();  // ✅ final close after print*/
        }, 500); // Wait 500ms for safe binding

        function checkNoRecord() {
            var $tbody = $("#myTable tbody"); // apne table ka id yaha lagao
            var rowCount = $tbody.find("tr:visible").length;

            if (rowCount === 0) {
                $tbody.append('<tr class="no-record"><td colspan="11" style="text-align:center;">No record found</td></tr>');
            } else {
                $tbody.find(".no-record").remove();
            }
        }
    };

    $scope.DownloadAllAsPDF = function (docs, DocName) {
        // Normalize input → hamesha array
        var htmlArray = [];

        if (Array.isArray(docs)) {
            htmlArray = docs;
        } else if (docs) {
            htmlArray = [docs];
        }

        htmlArray.forEach(function (doc, index) {
            var html = doc.html || doc;   // agar sirf html string pass ho rahi hai
            var name = (DocName || "Document_" + (index + 1)) + ".pdf";

            var printArea = document.getElementById('print-area');
            printArea.innerHTML = html;

            try {
                $compile(angular.element(printArea).contents())($scope);
            } catch (e) {
                console.warn("Compile failed:", e);
            }

            $scope.$applyAsync(function () {
                setTimeout(function () {
                    html2canvas(printArea, {
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#fff",
                        scale: 2
                    }).then(function (canvas) {
                        var imgData = canvas.toDataURL("image/jpeg", 1.0);

                        // ✅ Correct constructor
                        const { jsPDF } = window.jspdf;
                        var pdf = new jsPDF("p", "mm", "a4");

                        var pageWidth = 210;
                        var pageHeight = 297;
                        var margin = 10;

                        var imgWidth = pageWidth - (2 * margin);
                        var imgHeight = canvas.height * imgWidth / canvas.width;
                        var heightLeft = imgHeight;
                        var position = margin;

                        pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
                        heightLeft -= (pageHeight - margin * 2);

                        while (heightLeft > 0) {
                            position = heightLeft - imgHeight + margin;
                            pdf.addPage();
                            pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
                            heightLeft -= (pageHeight - margin * 2);
                        }

                        pdf.save(name);
                    }).catch(function (err) {
                        console.error("html2canvas error", err);
                        alert("PDF generation failed: " + err);
                    });
                }, 1000);
            });
        });
    };
}
