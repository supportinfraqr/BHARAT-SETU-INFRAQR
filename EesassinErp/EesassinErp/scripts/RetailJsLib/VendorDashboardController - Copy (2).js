app.VendorDashboardcontroller = function ($scope, $element, $filter, myService, $http) {

    $scope.Editetime = '';

  
    $scope.Contractorlimit = function (type) {
        var collectionobj = {};
        collectionobj.ActionType = 19;
        collectionobj.Id = MapId;
        collectionobj.StoreCode = LoginId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ContLimit = response.data.Result[0].ContractorLimit;
            if ($scope.ContLimit <= 0) {
                showMsgBox('Contractor Limit Exceed')
            }
            else { $scope.AddParty();}
               
        });
    }
    $scope.VUserlimit = function (type) {
        var collectionobj = {};
        collectionobj.ActionType = 19;
        collectionobj.Id = MapId;
        collectionobj.StoreCode = LoginId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ULimit = response.data.Result[0].ULimit;
            if ($scope.ULimit <= 0) {
                showMsgBox('User Limit Exceed')
            }
            else { $scope.SaveUser(); }

        });
    }

    $scope.Sitelimit = function (type) {
        var collectionobj = {};
        collectionobj.ActionType = 19;
        collectionobj.Id = MapId;
        collectionobj.StoreCode = LoginId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SiteLimit = response.data.Result[0].SiteLimit;
            if ($scope.SiteLimit <= 0) {
                showMsgBox('Site Limit Exceed')
            }
            else { $scope.AfterSave(); }

        });
    }


    
    $scope.Userlimit = function (type) {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.Id = MapId;
        collectionobj.StoreCode = LoginId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                debugger;
                $scope.FullUserLimit = response.data.Result[0].FullUserLimit;
                $scope.FullContractorLimit = response.data.Result[0].FullContractorLimit;
                $scope.FullSitelimit = response.data.Result[0].FullSitelimit;
            }
            $scope.CheckLimit(type);
        });
    }
    $scope.Sitelimit = function (type) {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.Id = MapId;
        collectionobj.StoreCode = LoginId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                debugger;
                $scope.FullUserLimit = response.data.Result[0].FullUserLimit;
                $scope.FullContractorLimit = response.data.Result[0].FullContractorLimit;
                $scope.FullSitelimit = response.data.Result[0].FullSitelimit;
            }
            $scope.CheckLimit(type);
        });
    }

    $scope.CheckLimit = function (type) {

        var msg = "";

        if (type == 1 && $scope.FullUserLimit <= 0)
            msg = "User limit exceeded";

        else if (type == 2 && $scope.FullContractorLimit <= 0)
            msg = "Party limit exceeded";

        else if (type == 3 && $scope.FullSitelimit <= 0)
            msg = "Site limit exceeded";

        if (msg != "") {
            swal("Warning", msg, "warning");
            return false;
        }

        return true;
    };

    
    $scope.EditVendorSite = function (item) {
        $('#btnsite').click();
        // 🔹 Hidden Id
        $scope.hfId = item.SiteId;
        $scope.Editetime = 1;
        // 🔹 Basic Details
        $scope.SiteName = item.SiteName;
        $scope.SiteAddress = item.Address;
        $scope.LocationCode = item.LocationCode;
        $scope.EmailId = item.EmailId;
        $scope.MobileNo = item.ContactNo;
        $scope.Description = item.Description;

        // 🔹 Bank & Tax
        $scope.BankDetails = item.BankDetails;
        $scope.AccountNo = item.AccountNo;
        $scope.Panitno = item.Panitno;
        $scope.Gstinuin = item.Gstinuin;

        // 🔹 Location
        $scope.Pincode = item.Pincode;
        

        $scope.CountryId = item.CountryID.toString();
      
        $scope.AllState();
        setTimeout(function () {
            $scope.StateId = item.StateID.toString();
            $scope.AllCity();

         

        }, 300);
        setTimeout(function () {
            $scope.CityId = item.CityID.toString();
        }, 300);

        // 🔹 Party Multi Select
        if (item.PartyIds) {
            $scope.PPIds = item.PartyIds.split(',').map(Number);

            angular.forEach($scope.VendorList, function (x) {
                x.Selected = $scope.PPIds.includes(x.Id);
            });
        }

        // 🔹 Contact
        $scope.ContactPerson = item.ContactPerson;
        $scope.ContactMobile = item.ContactMobile;

        // 🔹 CLRA
        $scope.CLRARC = item.CLRARC;
        $scope.CLRLIC = item.CLRLIC;
        $scope.ValidFrom = item.ValidFrom;
        $scope.ValidTo = item.ValidTo;

        // 🔹 Manpower
        $scope.Manpowertype = item.Manpowertype;
        $scope.ManPowerCount = item.ManPowerCount;

        // 🔹 Labour
        $scope.NLabourOffice = item.NLabourOffice;
        $scope.Nature = item.Nature;
        $scope.AssignColor = item.AssignColor;
        $scope.PrincipalRegistration = item.PrincipalRegistration;
        $scope.IssuingAuthority = item.IssuingAuthority;
        $scope.CLRA_MaxWorkers = item.CLRA_MaxWorkers;
        $scope.CLRA_Validity = item.CLRA_Validity;

        // 🔹 Files
        $scope.RCCopy = item.RCCopy;
        $scope.RenewalRCCopy = item.RenewalRCCopy;

        // 🔹 BOCW
        $scope.BOCW_Reg = item.BOCW_Reg;
        $scope.BOCW_IssuingAuth = item.BOCW_IssuingAuth;
        $scope.BOCW_MaxWorkers = item.BOCW_MaxWorkers;
        $scope.BOCW_Validity = item.BOCW_Validity;

        $scope.BOCWRCCopy = item.BOCWRCCopy;
        $scope.RenewalBOCWRCCopy = item.RenewalBOCWRCCopy;

        // 🔹 Safety
        $scope.VendorType = item.VendorType;
        $scope.MaxContractors = item.MaxContractors;
        $scope.MaxWorkersSite = item.MaxWorkersSite;
        $scope.PPEMandatory = item.PPEMandatory;
        $scope.PPEType = item.PPEType;
        $scope.SafetyTraining = item.SafetyTraining;
        $scope.SiteInduction = item.SiteInduction;
        $scope.PoliceVerification = item.PoliceVerification;
        $scope.IDCardRequired = item.IDCardRequired;
        $scope.AssignColor = item.AssignColor;

        // 🔹 Files
        $scope.VendorFileDoc = item.VendorFileDoc;
        $scope.AdminFileDoc = item.AdminFileDoc;
    };

    $scope.printActivityReport = function () {

        var table = document.getElementById("activityReportTable").outerHTML;

        var printWindow = window.open('', '', 'height=700,width=1200');

        printWindow.document.write(`
        <html>
        <head>
            <title>Log Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }

                .company-header {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .company-header h2 {
                    margin: 0;
                    color: #F37437;
                }

                .company-header p {
                    margin: 2px 0;
                    font-size: 13px;
                    color: #555;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                th {
                    background-color: #F37437;
                    color: #fff;
                    border: 1px solid #ddd;
                    padding: 6px;
                    text-align: center;
                }

                td {
                    border: 1px solid #ddd;
                    padding: 6px;
                }

                tr:nth-child(even) {
                    background-color: #f8f9fa;
                }

                tr:hover {
                    background-color: #eef4ff;
                }
            </style>
        </head>
        <body>

            <div class="company-header">
                <h2>${MapUser}</h2>
                <p>Log Report</p>
                <p>Generated On: ${new Date().toLocaleDateString()}</p>
            </div>

            ${table}

        </body>
        </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            debugger;
            $scope.IndustryList = response.data.Result;;
        });
    }
    $scope.AddParty = function () {
        if (isValidate()) {
            if ($scope.MobileNo.length == 10) {
                $scope.AfterverifyAddParty()
            }
            else {
                showMsgBox('999', 'Alert', 'Contact Number Should be 10 digit', 'warning', 'btn-warning')
            }
        }
    }
    $scope.StartDate = new Date();
    $scope.BindActivity = function () {
        /* $('#loadingModal').modal('show');*/
        var collectionobj = {};
        var datenew = "";
        if ($('#txtStartDate').val() == '') {
            datenew = '-1';
        }
        else { datenew = $('#txtStartDate').val(); }
        collectionobj.CreatedOn = datenew;
        collectionobj.Action = 7;
        collectionobj.Id = MapId
        myService.methode(
            'POST',
            "../RetailSection/GetMaintainLog",
            JSON.stringify(collectionobj)
        ).then(function (response) {
            $scope.LogActivity = response.data.Result;
            /* $('#loadingModal').modal('hide');*/
        });
        /*   /* $('#loadingModal').modal('hide');*/
    }

    // here is create new method 
    $scope.bindtiles = function () {

        var collectionobj = {};
        collectionobj.ActionType = 19;
        collectionobj.Id = MapId;
        collectionobj.StoreCode = LoginId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.AllowContractorLimit = response.data.Result[0].AllowContractorLimit;
            $scope.FullContractorLimit = response.data.Result[0].FullContractorLimit;
            $scope.ContractorLimit = response.data.Result[0].ContractorLimit;
           
            $scope.AllowUserLimit = response.data.Result[0].AllowUserLimit;
            $scope.FullUserLimit = response.data.Result[0].FullUserLimit;
            $scope.ULimit = response.data.Result[0].ULimit;


            $scope.AllowSitelimit = response.data.Result[0].AllowSitelimit;
            $scope.FullSitelimit = response.data.Result[0].FullSitelimit;
            $scope.SiteLimit = response.data.Result[0].SiteLimit;
            
        });
    };

    $scope.PartySearch = function () {

        var collectionobj = {};
        collectionobj.ActionType = 31;
        collectionobj.CreatedBy = LoginId;

        var getData = myService.methode('POST', "../PartyMaster/GetPartyMasterDT", JSON.stringify(collectionobj));

        getData.then(function (response) {

            $scope.VendorList = response.data.Result || []; 
            $scope.FilteredVendorList = angular.copy($scope.VendorList); 
           /* UpdateCounts($scope.FilteredVendorList);*/  /* UpdateCounts($scope.FilteredVendorList);*/
            
            $scope.NIndustryList = [...new Set($scope.VendorList
                .map(x => x.PartyName)
                .filter(x => x && x.trim() !== ""))];

        });
    };
    $scope.PPIds = [];

    $scope.SelectAll = function () {
        angular.forEach($scope.VendorList, function (item) {
            item.Selected = $scope.IsAllSelected;
        });
        $scope.UpdateSelection();
    };

    $scope.UpdateSelection = function () {
        $scope.PPIds = [];

        angular.forEach($scope.VendorList, function (item) {
            if (item.Selected) {
                $scope.PPIds.push(item.PartyId);
            }
        });

        // Check if all selected
        $scope.IsAllSelected = $scope.VendorList.every(x => x.Selected);
    };
    $scope.PartySelectContractor = function (industry) {

        $scope.SelectedContractor = industry;

        if (!industry) {
            $scope.FilteredVendorList = angular.copy($scope.VendorList);
        } else {
            $scope.FilteredVendorList = $scope.VendorList.filter(function (x) {
                return x.PartyName &&
                    x.PartyName.trim().toLowerCase() ===
                    industry.trim().toLowerCase();
            });
        }

        console.log($scope.FilteredVendorList);
    };

    //function UpdateCounts(list) {

    //    $scope.TotalVendor = list.length;
    //    $scope.ActiveUser = list.filter(x => x.IsActive == "1").length;
    //    $scope.InactiveUser = list.filter(x => x.IsActive == "0").length;
    //} here is commeted old code 

    function UpdateCounts(list) {
        $scope.ActiveUser = list.filter(x => x.IsActive == "1").length;
        //$scope.InactiveUser = list.filter(x => x.IsActive == "0").length;
        $scope.InactiveUser = $scope.TotalVendor - $scope.ActiveUser;
    }


    $scope.AfterverifyAddParty = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.EmployeeId = $scope.EmployeeId;
            collectionobj.VendorId = $scope.VendorId;
            collectionobj.PartyId = $scope.hfId;
            collectionobj.PartyName = $scope.PartyName;
            collectionobj.Address = $scope.Address;
            collectionobj.EmailId = $scope.EmailId;
            collectionobj.ContactNo = $scope.MobileNo;
            collectionobj.BankDetails = $scope.BankDetails;
            collectionobj.RegistrationType = $scope.RegistrationType;
            collectionobj.Panitno = $scope.Panitno;
            collectionobj.Gstinuin = $scope.Gstinuin;
            collectionobj.CreatedBy = LoginId;
            collectionobj.Pincode = $scope.Pincode;
            collectionobj.Descritpion = $scope.Descritpion;
            collectionobj.ContactMobile = $scope.ContactMobile;
            collectionobj.ContactPerson = $scope.ContactPerson
            collectionobj.StoreLimit = 0;
            collectionobj.UserLimit = $scope.UserLimit;
            collectionobj.ValidTo = $('#txtValidTo').val();
            collectionobj.Industry = $scope.NIndustryId;
            collectionobj.Startdt = $scope.Startdt; // add new start dt dated 29/04/2026
            collectionobj.MonthExpired = $scope.MonthExpired;  
            collectionobj.IsActive = $scope.IsActive;
            collectionobj.State = $scope.State;
            collectionobj.City = $scope.City;
            collectionobj.PartyType = 'Vendor';
            collectionobj.ActionType = 1;
            var getData = myService.methode('POST', ("../PartyMaster/InsertUpdateDelPartyMaster"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.PartySearch();
                    $scope.ClearControl(1);
                }
            });
        }
    }
    $scope.ClearControl = function (flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
        }
    };

    $scope.ResetControl = function (flag) {
        debugger;
        $scope.bindtiles();
        document.getElementById("btnCancel").click();
        $scope.PartyName = "";
        $scope.EmployeeId = "";
        $scope.Address = "";
        $scope.EmailId = "";
        $scope.MobileNo = "";
        $scope.IsActive = ""; 
        $scope.BankDetails = "";
        $scope.Panitno = "";
        $scope.Gstinuin = "";
        $scope.Pincode = "";
        $scope.VendorId = "";
        $scope.Descritpion = "";
        $scope.ContactMobile = "";
        $scope.ContactPerson = "";
        $scope.NIndustryId = "";
        if (flag == 0) {
            showMsgBox('4');
        };

    }
    // here is comment old code for csv and printtable
//    $scope.ExportVendorCSV = function () {

//        var list = $scope.FilteredVendorList || [];

//        if (!list.length) {
//            alert("No data available");
//            return;
//        }

//        var csv = "";
//        csv += "S.No,Party Name,Email,Mobile,Contact Person,Industry,UserLimit,Status\n";

//        list.forEach(function (x) {

//            csv += '"' + (x.SNO || '') + '",';
//            csv += '"' + (x.PartyName || '') + '",';
//            csv += '"' + (x.EmailId || '') + '",';
//            csv += '"' + (x.ContactNo || '') + '",';
//            csv += '"' + (x.ContactPerson || '') + '",';
//            csv += '"' + (x.IndustryName || '') + '",';
//            csv += '"' + (x.UserLimit || '') + '",';
//            csv += '"' + (x.IsActived || '') + '"\n';

//        });

//        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//        var link = document.createElement("a");
//        link.href = URL.createObjectURL(blob);
//        link.download = "PartyManagement.csv";
//        link.click();
//    };
//    $scope.PrintVendorList = function () {

//        var list = $scope.FilteredVendorList || [];
//        if (!list.length) {
//            alert("No data available");
//            return;
//        }

//        var printWindow = window.open('', '', 'height=700,width=1000');

//        var today = new Date().toLocaleString();

//        var html = `
//        <html>
//        <head>
//            <title>Vendor List</title>
//            <style>
//                body { font-family: Arial; padding: 20px; }
//                h2 { text-align: center; margin-bottom: 5px; }
//                .generated { text-align: right; font-size: 12px; margin-bottom: 20px; }
//   .party { text-align: center; font-size: 13px;  }
//                table { width: 100%; border-collapse: collapse; }
//                th, td { border: 1px solid #000; padding: 6px; font-size: 12px; }
//                th { background-color: #f2f2f2; }
//            </style>
//        </head>
//        <body>
//              <h2> ${MapUser}</h2> 
// <div class="party">Party Management</div>
//            <div class="generated">Generated On: ${today}</div>

//            <table>
//                <thead>
//                    <tr>
//                        <th>S.No</th>
//                        <th>Party Name</th>
//                        <th>Email</th>
//                        <th>Mobile</th>
//                        <th>Contact Person</th>
//                        <th>Industry</th>
//<th>UserLimit</th>
//                        <th>Status</th>
//                    </tr>
//                </thead>
//                <tbody>
//    `;

//        list.forEach(function (x) {
//            html += `
//            <tr>
//                <td>${x.SNO || ''}</td>
//                <td>${x.PartyName || ''}</td>
//                <td>${x.EmailId || ''}</td>
//                <td>${x.ContactNo || ''}</td>
//                <td>${x.ContactPerson || ''}</td>
//                <td>${x.IndustryName || ''}</td>
//   <td>${x.UserLimit || ''}</td>
//                <td>${x.IsActived || ''}</td>
//            </tr>
//        `;
//        });

//        html += `
//                </tbody>
//            </table>
//        </body>
//        </html>
//    `;

//        printWindow.document.write(html);
//        printWindow.document.close();
//        printWindow.print();
//    };

//-------------------------------------------------------------------------UserManagement Start

    // here is new code 
    $scope.ExportVendorCSV = function () {

        var list = $scope.FilteredVendorList || [];

        if (!list.length) {
            alert("No data available");
            return;
        }

        var csv = "";
        csv += "S.No,Contractor Name,Email,Start Date,End Date,Status,Craetion Date\n";

        list.forEach(function (x) {

            csv += '"' + (x.SNO || '') + '",';
            csv += '"' + (x.PartyName || '') + '",';
            csv += '"' + (x.EmailId || '') + '",';
            csv += '"' + (x.Startdtt || '') + '",';
            csv += '"' + (x.Valid || '') + '",';
            csv += '"' + (x.IsActived || '') + '",';
            csv += '"' + (x.Createddt || '') + '"\n';

        });

        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "ContractorManagement.csv";
        link.click();
    };
    $scope.PrintVendorList = function () {

        var list = $scope.FilteredVendorList || [];
        if (!list.length) {
            alert("No data available");
            return;
        }

        var printWindow = window.open('', '', 'height=700,width=1000');

        var today = new Date().toLocaleString();

        var html = `
        <html>
        <head>
            <title>Contractor List</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h2 { text-align: center; margin-bottom: 5px; }
                .generated { text-align: right; font-size: 12px; margin-bottom: 20px; }
   .party { text-align: center; font-size: 13px;  }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px; font-size: 12px; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
              <h2> ${MapUser}</h2> 
 <div class="party">Contractor Management</div>
            <div class="generated">Generated On: ${today}</div>

            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Contractor Name</th>
                        <th>Email</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                       <th>Status</th>
                        <th>Craetion Date</th>
                    </tr>
                </thead>
                <tbody>
    `;

        list.forEach(function (x) {
            html += `
            <tr>
                <td>${x.SNO || ''}</td>
                <td>${x.PartyName || ''}</td>
                <td>${x.EmailId || ''}</td>
                <td>${x.Startdtt || ''}</td>
                <td>${x.Valid || ''}</td>
                <td>${x.IsActived || ''}</td>
                <td>${x.Createddt || ''}</td>
            </tr>
        `;
        });

        html += `
                </tbody>
            </table>
        </body>
        </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };


    $scope.AllVendorCity = function () {
       
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 34 });
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data.Result;
        });
    }


    $scope.UserList = function () {
       
        var collectionobj = {};
        collectionobj.Action = 28; 
        collectionobj.LoginId = LoginId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.EmployeeList = response.data.Result;
            $scope.UsedUsers = $scope.EmployeeList.length;

            // 🔹 Total User Limit (first record se le rahe hain)
            $scope.TotalUserLimit = $scope.EmployeeList.length > 0
                ? parseInt($scope.EmployeeList[0].UserLimit) || 0
                : 0;

            // 🔹 Remaining Users
            $scope.RemainingUsers = $scope.TotalUserLimit - $scope.UsedUsers;

            // Safety (negative avoid)
            if ($scope.RemainingUsers < 0) {
                $scope.RemainingUsers = 0;
            }
        });
    }

  

    $scope.VerifyPassword = function () {
         
        $scope.showLoader();
        $scope.VendorType = 2;
            var collectionobj = {};
        collectionobj.MapId = $scope.PPId;
            collectionobj.UserName = $scope.UserNames;
            collectionobj.Password = $scope.Password;
            collectionobj.Name = $scope.UName;
            collectionobj.ContactNo = $scope.ContactNumber;
        collectionobj.EmailId = $scope.UserEmail;
        collectionobj.LoginType = $scope.VendorType;
        collectionobj.LoginId = LoginId
            collectionobj.BranchCode = '001';
            collectionobj.Action = 7;
            collectionobj.IsActive = 1
            collectionobj.CreatedBy = LoginId;
            var getData = myService.methode('POST', "../DashBoard/IUDUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            console.log(response);
                if (showMsgBox(response.data.Result)) {
                    $scope.UserList();
                    $scope.FireEmail(1, $scope.UserEmail, 0);
                     
                 
                    $scope.UserNames = '';
                    $scope.Password = '';
                    $scope.UName = '';
                    $scope.ContactNumber = '';
                    $scope.UserEmail = '';
                }
            }); 
    }


    $scope.validateEmail = function () {

        var semail = $('#txtUserEmail').val();
        var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        if (filter.test(semail)) {
            $scope.VerifyPassword();
        }
        else {
            showMsgBox('999', 'Alert', 'Please fill correct e-mail address!', 'warning', 'btn-warning')
            return;
        }
    }

    $scope.SaveUser = function () {

        if ($scope.PPId == '' || $scope.PPId == undefined) {
            showMsgBox('999', 'Alert', 'Contractor Name  Should be Required', 'warning', 'btn-warning')
            setTimeout(function () {
                document.getElementById("ddlPPId").focus();
            }, 200);
            return;
        }
        if ($scope.UName == '' || $scope.UName == undefined) {
            showMsgBox('999', 'Alert', 'Name  Should be Required', 'warning', 'btn-warning')
            setTimeout(function () {
                document.getElementById("txtUName").focus();
            }, 200);
            return;
        }
        if ($scope.UserNames == '' || $scope.UserNames == undefined) {
            showMsgBox('999', 'Alert', 'UserName  Should be Required', 'warning', 'btn-warning')
            setTimeout(function () {
                document.getElementById("txtUserNames").focus();
            }, 200);
            return;
        }
        if ($scope.Password == '' || $scope.Password == undefined) {
            showMsgBox('999', 'Alert', 'Password  Should be Required', 'warning', 'btn-warning')
            setTimeout(function () {
                document.getElementById("txtPassword").focus();
            }, 200);
            return;
        }
        if ($scope.ContactNumber == '' || $scope.ContactNumber == undefined) {
            showMsgBox('999', 'Alert', 'Contact Number  Should be Required', 'warning', 'btn-warning')
            setTimeout(function () {
                document.getElementById("txtContactNumber").focus();
            }, 200);
            return;
        }

        if ($scope.UserEmail == '' || $scope.UserEmail == undefined) {
            showMsgBox('999', 'Alert', 'Email  Should be Required', 'warning', 'btn-warning')
            setTimeout(function () {
                document.getElementById("txtUserEmail").focus();
            }, 200);
            return;
        }
        //if ($scope.VendorType == '' || $scope.VendorType == undefined) {
        //    showMsgBox('999', 'Alert', 'Vendor Type  Should be Required', 'warning', 'btn-warning')
        //    setTimeout(function () {
        //        document.getElementById("VendorType").focus();
        //    }, 200);
        //    return;
        //}
        var upper = 0,
            lower = 0,
            number = 0,
            special = 0;
        var mb = $scope.ContactNumber;
        var str = $scope.Password;
        for (var i = 0; i < str.length; i++) {
            if (str[i] >= "A" && str[i] <= "Z") upper++;
            else if (str[i] >= "a" && str[i] <= "z") lower++;
            else if (str[i] >= "0" && str[i] <= "9") number++;
            else special++;
        }
        if (upper >= 1 && lower >= 1 && special >= 1 && number >= 1 && str.length > 8) {
            
                if (mb.length == 10) {
                    $scope.validateEmail()
                }
                else {
                    showMsgBox('999', 'Alert', 'Contact Number Should be 10 digit', 'warning', 'btn-warning')
                } 
        }
        else {
            var Msg = "Your Password should be greated than 8 , 1 Upper case , 1 Lower case , 1 Special characters ,1 Number  currently Upper case letter : " + upper + ", Lower case : " + lower + ", Number : " + number + ", Special characters : " + special
            showMsgBox('999', 'Alert', Msg, 'warning', 'btn-warning')
        }

    }

    //-----------------------------------------employee Compliance doc
    $scope.Saveempdoc = function () {

        // Validation
        if (!$scope.DocumentName || $scope.DocumentName.trim() === "") { 
            showMsgBox('999', 'Alert', 'Please enter Document Name', 'warning', 'btn-warning') 
            return;
        }

        // Optional: length validation
        if ($scope.DocumentName.length < 3) {
            showMsgBox('999', 'Document Name must be at least 3 characters', 'warning', 'btn-warning') 
            return;
        }

        $scope.showLoader();

        var collectionobj = {};
        collectionobj.UserName = $scope.DocumentName;
        collectionobj.Action = 30;
        collectionobj.MapId = MapId;

        var getData = myService.methode(
            'POST',
            "../DashBoard/IUDUserRegistration",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.BindEmpDocumentList();
            }
        });
    }



    $scope.BindEmpDocumentList = function () {
        var collectionobj = {};
        collectionobj.Action = 31;
        collectionobj.LoginId = MapId;
        collectionobj.Id= $scope.SelectedVendorId
        
        var getData = myService.methode('POST', "../DashBoard/GetempRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.EmpDocumentList = response.data.Result;

            // 🔥 Auto check fix
            $scope.EmpDocumentList.forEach(function (item) {
                item.IsCheck = item.IsCheck === true || item.IsCheck === "true";
            }); 
        });
    }

    $scope.checkAll = false;
  
    $scope.toggleAll = function () {
        angular.forEach($scope.EmpDocumentList, function (item) {
            item.IsCheck = $scope.checkAll;
       
        });
    };

    $scope.ResetSiteFilters = function () {
        $scope.ResetFilters();
        $scope.fileteractive = true;
        angular.forEach($scope.VendorSiteList, function (item) {
            item.SiteIsSelected = false;
        });
        $scope.SelectSiteAll = false;

    }
    $scope.GetSitemapping = function (x) {
        
        $scope.SelectedPartyName = x ? x.PartyName : '';
        $scope.SelectVendorId = x.PartyId1;
        var collectionobj = {};
        collectionobj.Action = 38;
        collectionobj.LoginId = LoginId;
        collectionobj.Id = x.PartyId1;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetempRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.VendorSiteList = response.data.Result;
            $scope.TotalSite = response.data.Result.length;
            angular.forEach($scope.VendorSiteList, function (item) { 
                item.SiteIsSelected = (item.SiteIsSelected === true || item.SiteIsSelected === 'true' || item.SiteIsSelected == 1);

            });
        });
    }

    $scope.getsitevendor = function (x) { 
        var collectionobj = {};
        collectionobj.Action = 29;
        collectionobj.LoginId = LoginId; 
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetempRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.VendorPartyNameSiteList = response.data.Result;
            $scope.TotalSite = response.data.Result.length;
            
        });
    }

    $scope.ActiveTab = "filter";

    $scope.ToggleTab = function (tabName) {

        if ($scope.ActiveTab === tabName) {
            $scope.ActiveTab = "";   // close panel
        }
        else {
            $scope.ActiveTab = tabName; // open selected
        }
    };
    $scope.hideshowfiltewrforsite = function ()
    {
       
        $scope.fileteractive = false; 
    };
    $scope.SelectSiteAll = false;
    $scope.fileteractive = true;
    $scope.SitetoggleAll = function () {
        angular.forEach($scope.VendorSiteList, function (item) {
            item.SiteIsSelected = $scope.SelectSiteAll;
            $scope.hideshowfiltewrforsite();

         
        });
    };



    $scope.SaveVendorSiteMapping = function () {

        if (!$scope.SelectVendorId) {
            showMsgBox('999', 'warning', 'Please select vendor',  'btn-warning');
            return;
        } 
        var selectedVSiteList = ($scope.VendorSiteList || [])
            .filter(function (x) {
                return x.SiteIsSelected === true;
            })
            .map(function (x) {
                return x.SiteId;
            });
         
        if (selectedVSiteList.length === 0) {
            showMsgBox('999', 'warning', 'Please select at least one Site',  'btn-warning');
            return;
        }

        var obj = {
            VendorId: $scope.SelectVendorId,
            Documents: selectedVSiteList.join(','),
            LoginId: LoginId,
            Action: 39
        };

        console.log("Selected Routes:", selectedVSiteList); 

        myService.methode(
            'POST',
            "../DashBoard/IUDEmployeeDoc",
            { obj: obj }  
        )
            .then(function (res) {
                if (showMsgBox(res.data.Result)) {
                    $scope.BindVendorListList();

                }
            });
    };

    $scope.BindVendorListList = function ()
    {
        var collectionobj = {};
        collectionobj.Action = 32;
        collectionobj.LoginId = MapId;
        debugger;
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.EVendorList = response.data.Result;
        });
    }
    $scope.OnVendorChange = function () {

        if (!$scope.SelectedVendorId) {
            // sab uncheck
            angular.forEach($scope.EmpDocumentList, function (x) {
                x.IsCheck = false;
            });
            return;
        }

        var obj = {
            VendorId: $scope.SelectedVendorId,
            Action: 31 // mapping get action
        };

        var getData = myService.methode(
            'POST',
            "../DashBoard/IUDUserRegistration",
            '{obj:' + JSON.stringify(obj) + '}'
        );

        getData.then(function (res) {

            var mappedDocs = res.data.List || []; 
            angular.forEach($scope.EmpDocumentList, function (x) {
                x.IsCheck = false; 
                var match = mappedDocs.find(m => m.DocumentId == x.DocumentId);
                if (match) {
                    x.IsCheck = true;
                }
            });

        });
    };

    $scope.SaveVendorDocumentMapping = function () {

        if (!$scope.SelectedVendorId) {
          
            showMsgBox('999', 'Please select vendor', 'warning', 'btn-warning')
            return;
            return;A
        }

        var selectedDocs = $scope.EmpDocumentList
            .filter(x => x.IsCheck)
            .map(x => x.Id);   

        var obj = {
            VendorId: $scope.SelectedVendorId,
            Documents: selectedDocs.join(','),   
            Action: 33
        };

        var getData = myService.methode(
            'POST',
            "../DashBoard/IUDEmployeeDoc",
            '{obj:' + JSON.stringify(obj) + '}'
        );

        getData.then(function (res) {
            if (showMsgBox(res.data.Result)) {
                $scope.BindEmpDocumentList();
            }
        });
    };
    //---------------------------------------------------------------


    // here is comment old code by aadarsh

    //$scope.SelectedPartyId = null;
    //$scope.SelectedPartyName = null;

    //$scope.SelectParty = function (x) {
    //    $scope.SelectedPartyId = x.PartyId;
    //    $scope.SelectedPartyName = x.PartyName;
    //};

    //$scope.SelectPartyAll = function () {
    //    $scope.SelectedPartyId = null;
    //    $scope.SelectedPartyName = null;
    //};

    // add new code for Contractor User filter dated 30/04/2026
    // End 30/04/2026

    $scope.SelectedPartyId = null;
    $scope.SelectedPartyName = null;

    $scope.SelectParty = function (x) {
        $scope.SelectedPartyId = x.PartyId;
        $scope.SelectedPartyName = x.PartyName;
        $scope.BindUsername();
    };

    $scope.SelectPartyAll = function () {
        $scope.SelectedPartyId = null;
        $scope.SelectedPartyName = null;
        $scope.BindUsername();
    };

    $scope.SelectUsername = function (x) {
        $scope.SelectedUserName = (x.UserName || '').trim();

        $scope.UsedUsers = ($scope.EmployeeList || [])
            .filter(item => (item.UserName || '').trim() === $scope.SelectedUserName)
            .length;
    };

    $scope.BindUsername = function () {
        if ($scope.SelectedPartyId) {
            $scope.FilteredUsers = $scope.EmployeeList.filter(function (x) {
                return x.PartyId == $scope.SelectedPartyId;
            });
        } else {
            $scope.FilteredUsers = angular.copy($scope.EmployeeList);
        }
    };

    $scope.PrintUserList = function () {

        // 🔹 Apply same filter logic (Party + Search)
        var list = ($scope.EmployeeList || []).filter(function (x) {

            var partyMatch = !$scope.SelectedPartyId || x.PartyId == $scope.SelectedPartyId;

            var searchMatch = !$scope.searchText ||
                (x.UserName && x.UserName.toLowerCase().includes($scope.searchText.toLowerCase())) ||
                (x.PartyName && x.PartyName.toLowerCase().includes($scope.searchText.toLowerCase())) ||
                (x.EmailId && x.EmailId.toLowerCase().includes($scope.searchText.toLowerCase())) ||
                (x.ContactNo && x.ContactNo.includes($scope.searchText));

            return partyMatch && searchMatch;
        });

        if (!list.length) {
            alert("No data available");
            return;
        }

        var printWindow = window.open('', '', 'height=700,width=1000');
        var today = new Date().toLocaleString();

        var html = `
    <html>
    <head>
        <title>User List</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            .sub-title { text-align: center; font-size: 13px; margin-bottom: 5px; }
            .generated { text-align: right; font-size: 12px; margin-bottom: 15px; }
            .count { text-align: left; font-size: 12px; margin-bottom: 15px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 12px; text-align:center; }
            th { background-color: #f2f2f2; font-weight: bold; }
        </style>
    </head>
    <body>

        <h2>User Management</h2>
        <div class="sub-title">User List Report</div>
        <div class="generated">Generated On: ${today}</div>
        <div class="count">Total Records: ${list.length}</div>

        <table>
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>User Name</th>
                    <th>Contractor Name</th>
                    <th>Email</th>
                    <th>Contact No</th>
                    <th>Creation Date</th>
                </tr>
            </thead>
            <tbody>
    `;

        list.forEach(function (x, index) {

            var role = x.LoginType == 5 ? 'Admin' : 'User';

            html += `
            <tr>

                <td>${index + 1}</td>
                <td>${x.UserName || ''}</td>
                <td>${x.PartyName || ''}</td>
                <td>${x.EmailId || ''}</td>
                <td>${x.ContactNo || ''}</td>
                <td>${x.Createdon || ''}</td>
            </tr>
        `;
        });

        html += `
            </tbody>
        </table>
    </body>
    </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    $scope.ExportUserCSV = function () {

        if (!$scope.EmployeeList || $scope.EmployeeList.length == 0) {
            alert("No data to export");
            return;
        }

        var filteredData = $scope.EmployeeList.filter(function (x) {

            var partyMatch = !$scope.SelectedPartyId || x.PartyId == $scope.SelectedPartyId;

            var searchMatch = !$scope.searchText ||
                (x.UserName && x.UserName.toLowerCase().includes($scope.searchText.toLowerCase())) ||
                (x.PartyName && x.PartyName.toLowerCase().includes($scope.searchText.toLowerCase())) ||
                (x.EmailId && x.EmailId.toLowerCase().includes($scope.searchText.toLowerCase())) ||
                (x.ContactNo && x.ContactNo.includes($scope.searchText));

            return partyMatch && searchMatch;
        });

        var csv = "S.No,User Name,Contractor Name,EmailId,Contact No,Creation Date\n";

        filteredData.forEach(function (x, index) {
            //var role = x.LoginType == 5 ? "Admin" : "User";

            csv += (index + 1) + "," +
                x.UserName + "," +
                x.PartyName + "," +
                x.EmailId + "," +
                x.ContactNo + "," +
                x.Createdon + "\n";
        });

        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "UserList.csv";
        link.click();
    };


    //--------------------------------------------------------------------Sitemanager
   
    $scope.AllCountry = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 27 });
        getData.then(function (response) {
            $scope.AllCountryList = response.data.Result;
        });
    }
    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": $scope.CountryId });
        getData.then(function (response) {
            $scope.AllStateList = response.data.Result;
        });
    }
    $scope.AllCity = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 29, "PartyId": $scope.StateId });
        getData.then(function (response) {
            $scope.AllCityList = response.data.Result;
        });
    }


   
    $scope.Vendorshow = function (input, imgfileid) {

        var maxSizeKB = 1024; 
        var maxSizeBytes = maxSizeKB * 1024;

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // 🔴 File Size Validation
            if (file.size > maxSizeBytes) {

                showMsgBox('999', 'Alert',
                    'File size should not exceed 1 MB (1024 KB)',
                    'warning', 'btn-warning');

                // Reset file input
                input.value = "";
                $scope.VendorFileDoc = null;

                return;
            }

            // ✅ If size valid
            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope.VendorFileDoc = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
        else {
            $scope.VendorFileDoc = null;
            $scope.$applyAsync();
        }
    };


    $scope.RCCopyShow = function (input, imgfileid) {

        var maxSizeKB = 1024;
        var maxSizeBytes = maxSizeKB * 1024;

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // 🔴 File Size Validation
            if (file.size > maxSizeBytes) {

                showMsgBox('999', 'Alert',
                    'File size should not exceed 1 MB (1024 KB)',
                    'warning', 'btn-warning');

                // Reset file input
                input.value = "";
                $scope.RCCopy = null;

                return;
            }

            // ✅ If size valid
            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope.RCCopy = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
        else {
            $scope.RCCopy = null;
            $scope.$applyAsync();
        }
    };
    $scope.RenewalRCCopyShow = function (input, imgfileid) {

        var maxSizeKB = 1024;
        var maxSizeBytes = maxSizeKB * 1024;

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // 🔴 File Size Validation
            if (file.size > maxSizeBytes) {

                showMsgBox('999', 'Alert',
                    'File size should not exceed 1 MB (1024 KB)',
                    'warning', 'btn-warning');

                // Reset file input
                input.value = "";
                $scope.RenewalRCCopy = null;

                return;
            }

            // ✅ If size valid
            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope.RenewalRCCopy = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
        else {
            $scope.RenewalRCCopy = null;
            $scope.$applyAsync();
        }
    };
    $scope.BOCWRCCopyShow = function (input, imgfileid) {

        var maxSizeKB = 1024;
        var maxSizeBytes = maxSizeKB * 1024;

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // 🔴 File Size Validation
            if (file.size > maxSizeBytes) {

                showMsgBox('999', 'Alert',
                    'File size should not exceed 1 MB (1024 KB)',
                    'warning', 'btn-warning');

                // Reset file input
                input.value = "";
                $scope.RCCopyShow = null;

                return;
            }

            // ✅ If size valid
            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope.RCCopyShow = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
        else {
            $scope.VendorFileDoc = null;
            $scope.$applyAsync();
        }
    };
    $scope.RenewalBOCWRCCopyShow = function (input, imgfileid) {

        var maxSizeKB = 1024;
        var maxSizeBytes = maxSizeKB * 1024;

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // 🔴 File Size Validation
            if (file.size > maxSizeBytes) {

                showMsgBox('999', 'Alert',
                    'File size should not exceed 1 MB (1024 KB)',
                    'warning', 'btn-warning');

                // Reset file input
                input.value = "";
                $scope.RenewalBOCWRCCopy = null;

                return;
            }

            // ✅ If size valid
            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope.RenewalBOCWRCCopy = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
        else {
            $scope.RenewalBOCWRCCopy = null;
            $scope.$applyAsync();
        }
    };


    $scope.DeleteVendorSite = function (deleteid) {
        deleteConfirmbox(
            "Do you want to delete this record?",
            function () {
                $scope.Deletemapping(deleteid);
            }
        );
    };

    $scope.Deletemapping = function (deleteid) {

        var collectionobj = {
            SiteId: deleteid,
            ActionType: 10
        };

        var getData = myService.methode(
            'POST',
            "../SiteManager/InsertUpdateDelSiteManager",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.BindVendorSiteList();
            }
        }, function (error) {
            console.log(error);
        });
    };

    $scope.AfterSave = function () {

        function setError(id, message) {

            $(".form-control, select").removeClass("border-danger");

            var element = $(id);
            element.addClass("border-danger");

            setTimeout(function () {
                element.focus();
            }, 100);

            showMsgBox('999', 'Alert', message, 'warning', 'btn-warning');
            return false;
        }

      
            if (!$scope.PPIds || $scope.PPIds.length === 0)
                return setError("#ddlparty", "Contractor Required");
        
      

        if (!$scope.SiteName || !$scope.SiteName.trim())
            return setError("#txtSiteName", "Site Name Required");


        if (!$scope.LocationCode || !$scope.LocationCode.trim())
            return setError("#txtLocationCode", "Location Name Required");

        if (!$("#ddlAssignColor").val())
            return setError("#ddlAssignColor", "Assign Color Required");

        if (!$scope.SiteAddress || !$scope.SiteAddress.trim())
            return setError("#txtSiteAddress", "Address Required");

        if (!$scope.MobileNo)
            return setError("#txtMobileNo", "Contact No Required");

        if (!$scope.EmailId)
            return setError("#txtEmailId", "Email Required");

        if (!$scope.Pincode)
            return setError("#txtPincode", "Pincode Required");

        if (!$("#ddlcountry").val())
            return setError("#ddlcountry", "Country Required");

        if (!$("#ddlstate").val())
            return setError("#ddlstate", "State Required");

        if (!$("#ddlcity").val())
            return setError("#ddlcity", "City Required");

        $(".form-control, select").removeClass("border-danger");

        $scope.showLoader();

        var collectionobj = {
            PartyIds: $scope.PPIds.join(',') ,
            PartyType: 'Vendor',
            SiteId: $scope.hfId,
            SiteName: $scope.SiteName,
            Address: $scope.SiteAddress,
            LocationCode: $scope.LocationCode,
            EmailId: $scope.EmailId,
            ContactNo: $scope.MobileNo,
            BankDetails: $scope.BankDetails,
            AccountNo: $scope.AccountNo,
            Description: $scope.Description,
            Panitno: $scope.Panitno,
            Gstinuin: $scope.Gstinuin,
            CreatedBy: LoginId,
            Pincode: $scope.Pincode,
            CountryId: $("#ddlcountry").val(),
            StateId: $("#ddlstate").val(),
            CityId: $("#ddlcity").val(),
            CLRARC: $scope.CLRARC,
            CLRLIC: $scope.CLRLIC,
            ContactPerson: $scope.ContactPerson,
            ContactMobile: $scope.ContactMobile,
            Descritpion: $scope.Descritpion,
            ValidFrom: $scope.ValidFrom,
            ValidTo: $scope.ValidTo,
            VendorFileDoc: $scope.VendorFileDoc,
            AdminFileDoc: $scope.AdminFileDoc,
            Manpowertype: $scope.Manpowertype,
            ManPowerCount: $scope.ManPowerCount,

            NLabourOffice: $scope.NLabourOffice,
            Nature: $scope.Nature,
            AssignColor: $scope.AssignColor,
            PrincipalRegistration: $scope.PrincipalRegistration,
            IssuingAuthority: $scope.IssuingAuthority,
            CLRA_MaxWorkers: $scope.CLRA_MaxWorkers,
            CLRA_Validity: $scope.CLRA_Validity,
            RCCopy: $scope.RCCopy,
            RenewalRCCopy: $scope.RenewalRCCopy,
            BOCW_Reg: $scope.BOCW_Reg,
            BOCW_IssuingAuth: $scope.BOCW_IssuingAuth,
            BOCW_MaxWorkers: $scope.BOCW_MaxWorkers,
            BOCW_Validity: $scope.BOCW_Validity,
            BOCWRCCopy: $scope.BOCWRCCopy,

            RenewalBOCWRCCopy: $scope.RenewalBOCWRCCopy,
            VendorType: 2,
            BOCWRCCopy: $scope.BOCWRCCopy, 

            ActionType: 9
        };

        var getData = myService.methode(
            'POST',
            "../SiteManager/InsertUpdateDelSiteManager",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {

                $scope.BindVendorSiteList();
                $scope.Resetsite();

                angular.forEach($scope.VendorList, function (item) {
                    item.Selected = false;
                });
            }
        });
    };


    $scope.AfterUpdateSite = function () {

        function setError(id, message) {

            $(".form-control, select").removeClass("border-danger");

            var element = $(id);
            element.addClass("border-danger");

            setTimeout(function () {
                element.focus();
            }, 100);

            showMsgBox('999', 'Alert', message, 'warning', 'btn-warning');
            return false;
        }

       


        if (!$scope.SiteName || !$scope.SiteName.trim())
            return setError("#txtSiteName", "Site Name Required");

        if (!$scope.SiteAddress || !$scope.SiteAddress.trim())
            return setError("#txtSiteAddress", "Address Required");

        if (!$scope.MobileNo)
            return setError("#txtMobileNo", "Contact No Required");

        if (!$scope.EmailId)
            return setError("#txtEmailId", "Email Required");

        if (!$scope.Pincode)
            return setError("#txtPincode", "Pincode Required");

        if (!$("#ddlcountry").val())
            return setError("#ddlcountry", "Country Required");

        if (!$("#ddlstate").val())
            return setError("#ddlstate", "State Required");

        if (!$("#ddlcity").val())
            return setError("#ddlcity", "City Required");

        $(".form-control, select").removeClass("border-danger");

        $scope.showLoader();

        var collectionobj = {
            PartyIds: $scope.PPIds.join(','),
            PartyType: 'Vendor',
            SiteId: $scope.hfId,
            SiteName: $scope.SiteName,
            Address: $scope.SiteAddress,
            LocationCode: $scope.LocationCode,
            EmailId: $scope.EmailId,
            ContactNo: $scope.MobileNo,
            BankDetails: $scope.BankDetails,
            AccountNo: $scope.AccountNo,
            Description: $scope.Description,
            Panitno: $scope.Panitno,
            Gstinuin: $scope.Gstinuin,
            CreatedBy: LoginId,
            Pincode: $scope.Pincode,
            CountryId: $("#ddlcountry").val(),
            StateId: $("#ddlstate").val(),
            CityId: $("#ddlcity").val(),
            CLRARC: $scope.CLRARC,
            CLRLIC: $scope.CLRLIC,
            ContactPerson: $scope.ContactPerson,
            ContactMobile: $scope.ContactMobile,
            Descritpion: $scope.Descritpion,
            ValidFrom: $scope.ValidFrom,
            ValidTo: $scope.ValidTo,
            VendorFileDoc: $scope.VendorFileDoc,
            AdminFileDoc: $scope.AdminFileDoc,
            Manpowertype: $scope.Manpowertype,
            ManPowerCount: $scope.ManPowerCount,

            NLabourOffice: $scope.NLabourOffice,
            Nature: $scope.Nature,
            AssignColor: $scope.AssignColor,
            PrincipalRegistration: $scope.PrincipalRegistration,
            IssuingAuthority: $scope.IssuingAuthority,
            CLRA_MaxWorkers: $scope.CLRA_MaxWorkers,
            CLRA_Validity: $scope.CLRA_Validity,
            RCCopy: $scope.RCCopy,
            RenewalRCCopy: $scope.RenewalRCCopy,
            BOCW_Reg: $scope.BOCW_Reg,
            BOCW_IssuingAuth: $scope.BOCW_IssuingAuth,
            BOCW_MaxWorkers: $scope.BOCW_MaxWorkers,
            BOCW_Validity: $scope.BOCW_Validity,
            BOCWRCCopy: $scope.BOCWRCCopy,

            RenewalBOCWRCCopy: $scope.RenewalBOCWRCCopy,
            VendorType: 2,
            BOCWRCCopy: $scope.BOCWRCCopy,

            ActionType: 2
        };

        var getData = myService.methode(
            'POST',
            "../SiteManager/InsertUpdateDelSiteManager",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {

                $scope.BindVendorSiteList();
                $scope.Resetsite();

                angular.forEach($scope.VendorList, function (item) {
                    item.Selected = false;
                });
            }
        });
    };


    $scope.Resetsite = function () {
        $scope.Editetime = '';
        $scope.SiteName = "";
        $scope.SiteAddress = "";
        $scope.EmailId = "";
        $scope.MobileNo = "";
        $scope.Description = "";
        $scope.LocationCode = "";
        $scope.BankDetails = "";
        $scope.AccountNo = "";
        $scope.Panitno = "";
        $scope.Gstinuin = "";
        $scope.Pincode = "";
        $scope.CLRARC = "";
        $scope.CLRLIC = "";
        $scope.ContactPerson = "";
        $scope.ContactMobile = "";
        $scope.Descritpion = "";
        $scope.ValidFrom = "";
        $scope.ValidTo = "";
        $scope.Manpowertype = "";
        $scope.ManPowerCount = "";
        $scope.AssignColor = '';
        $scope.Nature = '';
        $scope.AdminFileDoc = "";
        $scope.VendorFileDoc = "";

        $("#txtpincode").val('');

        $scope.CountryId = "";
        $scope.StateId = "";
        $scope.CityId = "";
        $scope.PPIds = [];
        $scope.IsAllSelected = false;
    }
    $scope.BindVendorSiteList = function () {
        var collectionobj = {};
        collectionobj.Action = 29;
        collectionobj.LoginId = LoginId;
        debugger;
        $scope.VendorSiteList = [];
        var getData = myService.methode('POST', "../DashBoard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.VendorSiteList = response.data.Result; 
            $scope.TotalSite = response.data.Result.length;
            angular.forEach($scope.VendorSiteList, function (item) {

                item.SiteIsSelected = (item.SiteIsSelected === true || item.SiteIsSelected === 'true' || item.SiteIsSelected == 1);

            });
        });
    }
    $scope.ExportSiteCSV = function () {

        var list = $scope.VendorSiteList || [];

        if (!list.length) {
            alert("No data available");
            return;
        }


        var csv = "S.No,Contractor Name,Site Name,Location Code,Email Id,State,Creation Date\n";    

        list.forEach(function (x, index) {

            csv += (index + 1) + "," +
                (x.PartyName || '') + "," +
                (x.SiteName || '') + "," +
                (x.LocationCode || '') + "," +
                (x.EmailId || '') + "," +
                (x.STATE_NM || '') + "," +
                (x.CreatedOn || '') + "\n";
        });

        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "VendorSiteList.csv";
        link.click();
    };
    $scope.PrintSiteList = function () {

        var list = $scope.VendorSiteList || [];

        if (!list.length) {
            alert("No data available");
            return;
        }

        var printWindow = window.open('', '', 'height=700,width=1000');
        var today = new Date().toLocaleString();

        var html = `
    <html>
    <head>
        <title>Vendor Site List</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            .generated { text-align: right; font-size: 12px; margin-bottom: 15px; }
            .count { text-align: left; font-size: 12px; margin-bottom: 15px; }

            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 12px; text-align:center; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>

        <h2>Vendor Site Management</h2>
        <div class="generated">Generated On: ${today}</div>
        <div class="count">Total Records: ${list.length}</div>

        <table>
            <thead>
                <tr>
                     <th>S.No</th>
                    <th>Contractor Name</th>
                    <th>Site Name</th>
                    <th>Location Code</th>
                    <th>Email Id</th>
                    <th>State</th>
                     <th>Creation Date</th>
                </tr>
            </thead>
            <tbody>
    `;

        list.forEach(function (x, index) {
            html += `
            <tr>
                <td>${index + 1}</td>
                <td>${x.PartyName || ''}</td>
                <td>${x.SiteName || ''}</td>
                <td>${x.LocationCode || ''}</td>
                <td>${x.EmailId || ''}</td>
                <td>${x.STATE_NM || ''}</td>
                <td>${x.CreatedOn || ''}</td>
            </tr>
        `;
        });

        html += `
            </tbody>
        </table>
    </body>
    </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };





    $scope.PrintemployeedocList = function () {

        var list = $scope.EmpDocumentList || [];

        if (!list.length) {
            alert("No data available");
            return;
        }

        var printWindow = window.open('', '', 'height=700,width=1000');
        var today = new Date().toLocaleString();

        var html = `
    <html>
    <head>
        <title>Employee Compliance Documents</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            .generated { text-align: right; font-size: 12px; margin-bottom: 15px; }
            .count { text-align: left; font-size: 12px; margin-bottom: 15px; }

            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 12px; text-align:center; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>

        <h2>Employee Compliance Documents</h2>
        <div class="generated">Generated On: ${today}</div>
        <div class="count">Total Records: ${list.length}</div>

        <table>
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Document Name</th> 
                </tr>
            </thead>
            <tbody>
     `;

        list.forEach(function (x, index) {
            html += `
            <tr>
                <td>${index + 1}</td>
                <td>${x.DocumentName || ''}</td> 
            </tr>
        `;
        });

        html += `
            </tbody>
        </table>
    </body>
    </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    // here is add new methods

    $scope.filterData = function (item) {
        if ($scope.SelectedPartyName && item.PartyName !== $scope.SelectedPartyName)
            return false;

        if ($scope.SelectedSite && item.SiteName !== $scope.SelectedSite)
            return false;

        if ($scope.SelectedLocation && item.LocationCode !== $scope.SelectedLocation)
            return false;

        return true;
    };

    $scope.FilteredSiteList = [];
    $scope.FilteredLocationList = [];
    $scope.SelectContractor = function (x) {
        $scope.SelectedPartyName = x ? x.PartyName : '';

        $scope.SelectedSite = '';
        $scope.SelectedLocation = '';

        if ($scope.SelectedPartyName) {
            $scope.FilteredSiteList = $scope.VendorSiteList.filter(function (item) {
                return item.PartyName === $scope.SelectedPartyName;
                $scope.RemainigSites = $scope.VendorSiteList.length;
            });
            $scope.FilteredLocationList = $scope.FilteredSiteList;

        } else {

            $scope.FilteredSiteList = $scope.VendorSiteList;
            $scope.FilteredLocationList = $scope.VendorSiteList;
            $scope.RemainigSites = $scope.VendorSiteList.length;
        }
    };


    $scope.SelectSite = function (x) {
        $scope.SelectedSite = x ? x.SiteName : '';
        $scope.SelectedLocation = '';

        if ($scope.SelectedSite) {
            $scope.FilteredLocationList = $scope.VendorSiteList.filter(function (item) {
                return item.SiteName === $scope.SelectedSite &&
                    (!$scope.SelectedPartyName || item.PartyName === $scope.SelectedPartyName);
            });
        } else {
            $scope.FilteredLocationList = [];
        }
    };

    $scope.SelectLocation = function (x) {
        $scope.SelectedLocation = x ? x.LocationCode : '';
        $scope.RemainigSites = $scope.VendorSiteList.length;
    };


    $scope.ResetFilters = function () {
        $scope.SelectedPartyName = '';
        $scope.SelectedSite = '';
        $scope.SelectedLocation = '';
        $scope.SiteSearch = '';
        $scope.ActiveTab = "filter";
        // optional: agar koi aur model ho
        // $scope.PPId = '';
        // $scope.UName = '';
    };
}