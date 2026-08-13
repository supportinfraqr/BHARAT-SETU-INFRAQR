app.TransportController = function ($scope, $element, $filter, myService, $http, $timeout) {
     

     
    $scope.SelectedPartyName = "";

    $scope.filterByParty = function (partyName) {
        $scope.SelectedPartyName = partyName;
    };

    $scope.GetTransport = function () {

        var collectionobj = {
            Action: 5,
            UserId: LoginId,
            Id : $scope.SelectedVendorId
        };
        angular.forEach($scope.TransportList, function (item) {
            item.IsSelected = false;
        });
        myService.methode('POST', "../RetailSection/SearchRoute", JSON.stringify(collectionobj))
            .then(function (response) {

                $scope.TransportList = response.data.Result || []; 
                angular.forEach($scope.TransportList, function (item) {
                     
                    item.IsSelected = (item.IsSelected === true || item.IsSelected === 'true' || item.IsSelected == 1);

                });

            });
    };


    $scope.SaveVendorTransportMapping = function () {

        if (!$scope.SelectedVendorId) {
            showMsgBox('999', 'Please select vendor', 'warning', 'btn-warning');
            return;
        }

        // 🔥 Only TRUE selected rows
        var selectedTransport = ($scope.TransportList || [])
            .filter(function (x) {
                return x.IsSelected === true;   // strict check
            })
            .map(function (x) {
                return x.Id;
            });

        // ❌ No selection check
        if (selectedTransport.length === 0) {
            showMsgBox('999', 'Please select at least one route', 'warning', 'btn-warning');
            return;
        }

        var obj = {
            VendorId: $scope.SelectedVendorId,
            Documents: selectedTransport.join(','),  // "1,5,7"
            Action: 35
        };

        console.log("Selected Routes:", selectedTransport); // ✅ debug

        myService.methode(
            'POST',
            "../DashBoard/IUDEmployeeDoc",
            { obj: obj }   // 🔥 FIX (no string concat)
        )
            .then(function (res) {
                if (showMsgBox(res.data.Result)) {
                    $scope.GetTransport();
                }
            });
    };

    $scope.TrtansporttoggleAll = function () {

        angular.forEach($scope.TransportList, function (item) {
            item.IsSelected = $scope.SelectAll === true;
        });

    };

    $scope.showFileName = function (input, fieldName) {

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // ✅ file name show
            $scope[fieldName + "Name"] = file.name;

            // ✅ preview ke liye (optional)
            $scope[fieldName + "_FileObj"] = file;

            $scope.$applyAsync();
        }
    };
    
    $scope.ResetForm = function () {
         
        $scope.RouteID = '';
        $scope.CompanyName = '';
        $scope.RouteName = '';
        $scope.Location = '';
        $scope.RouteStartLocation = '';
        $scope.RouteEndLocation = '';
        $scope.Status = '';
         
        $scope.BusNumber = '';
        $scope.RCNO = '';
        $scope.SeatingCapacity = '';
        $scope.BusType = '';
         
        $scope.DriverName = '';
        $scope.DriverContactNumber = '';
        $scope.DriverAddress = '';
        $scope.LicenseNumber = '';
         
        $scope.LicenseCopy = null;
        $scope.LicenseCopyName = '';
        $scope.AadharCardCopy = null;
        $scope.AadharCardCopyName = '';
         
        $scope.ConductorName = '';
        $scope.ConductorContact = '';
        $scope.ConductorAddress = '';
        $scope.ConductorAadhaarCard = null;
        $scope.ConductorAadhaarName = '';    
     
        $scope.BusRC = null;
        $scope.BusRCName = '';
      
        $scope.PollutionCertificate = null;
        $scope.FitnessCertificate = null;
        $scope.InsuranceCopy = null;


        $scope.PollutionCertificateName = '';
        $scope.FitnessCertificateName = '';
        $scope.InsuranceCopyName = '';
        angular.element("input[type='file']").val(null);

    };
    $scope.SaveRouteMaster = function () {

        debugger;

        $scope.IsActionType = 1;

        if (isValidateA())
        {   
                var formData = new FormData();  
                    formData.append("RouteID", $scope.RouteID);

                    formData.append("RouteName", $scope.RouteName);
            
                    formData.append("CompanyName", $scope.CompanyName);
                    formData.append("Location", $scope.Location);
                    formData.append("RouteStartLocation", $scope.RouteStartLocation);
                    formData.append("RouteEndLocation", $scope.RouteEndLocation);
                    formData.append("Status", $scope.Status); 
                    formData.append("BusNumber", $scope.BusNumber);
                    formData.append("RCNO", $scope.RCNO);
                    formData.append("SeatingCapacity", $scope.SeatingCapacity);
                    formData.append("BusType", $scope.BusType);

                    formData.append("DriverName", $scope.DriverName);
                    formData.append("DriverContactNumber", $scope.DriverContactNumber);
                    formData.append("DriverAddress", $scope.DriverAddress);
                    formData.append("LicenseNumber", $scope.LicenseNumber);

                    // Conductor Details
                    formData.append("ConductorName", $scope.ConductorName);
                    formData.append("ConductorContact", $scope.ConductorContact);
                    formData.append("ConductorAddress", $scope.ConductorAddress);
             

                    formData.append("LicenseCopy", document.getElementById("LicenseCopy").files[0] );
                    formData.append("AadharCardCopy", document.getElementById("AadharCardCopy").files[0] );
                    formData.append("ConductorAadhaarCard", document.getElementById("ConductorAadhaarCard").files[0] );

                    // Documents
                    formData.append("BusRC", document.getElementById("BusRC").files[0] );
                    formData.append("PollutionCertificate", document.getElementById("PollutionCertificate").files[0] );
                    formData.append("FitnessCertificate", document.getElementById("LicenseCopy").files[0] );
                    formData.append("InsuranceCopy", document.getElementById("InsuranceCopy").files[0]  );
             
                    formData.append("UserId", LoginId);
            formData.append("PartyId", MapId);


            if ($scope.RouteID !== null && $scope.RouteID !== undefined && $scope.RouteID !== '') {
                formData.append("ActionType", 2);
            } else {
                formData.append("ActionType", 1);
            }
                debugger;

                $.ajax({
                    url: "../RetailSection/InsertUpdateRouteMaster", // 👈 API change kar lena
                    type: 'POST',
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,

                    success: function (response) { 
                        var data = JSON.parse(response); 
                        if (showMsgBox(data.Result)) {
                            $scope.GetTransport();
                            $scope.ResetForm();
                            $scope.$apply(); // 🔥 IMPORTANT
                        }
                    },

                    error: function (xhr, status, error) {
                        console.error("Error saving route data: " + error);
                    }
                }); 
        }
    };
 
    $scope.getFileIconClass = function (fileModel) {
        return fileModel ? 'fa fa-check-square' : 'fa fa-plus';
    };
    $scope.uploadFile = function (fieldName, input) {
        debugger;
        if (input.files && input.files[0]) {
            var file = input.files[0];

          

            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope[fieldName] = e.target.result; // ✅ base64
                $scope.$applyAsync();
            };
            filerdr.readAsDataURL(file);
        }
    };
  
 




        $scope.setTransportData = function (_Id) {

            var selectedTransport = $scope.TransportList.find(function (transport) {
                return transport.Id === _Id;
            });

            if (!selectedTransport) return;

            // 🔥 Route Details
            $scope.RouteID = selectedTransport.RouteID;
            $scope.RouteName = selectedTransport.RouteName;
            $scope.CompanyName = selectedTransport.CompanyName;
            $scope.Location = selectedTransport.Location;
            $scope.RouteStartLocation = selectedTransport.RouteStartLocation;
            $scope.RouteEndLocation = selectedTransport.RouteEndLocation;
            $scope.Status = selectedTransport.Status;

            // 🔥 Bus Details
            $scope.BusNumber = selectedTransport.BusNumber;
            $scope.RCNO = selectedTransport.RCNO;
            $scope.SeatingCapacity = selectedTransport.SeatingCapacity;
            $scope.BusType = selectedTransport.BusType;

            // 🔥 Driver Details
            $scope.DriverName = selectedTransport.DriverName;
            $scope.DriverContactNumber = selectedTransport.DriverContactNumber;
            $scope.DriverAddress = selectedTransport.DriverAddress;
            $scope.LicenseNumber = selectedTransport.LicenseNumber;

            // 🔥 Conductor Details
            $scope.ConductorName = selectedTransport.ConductorName;
            $scope.ConductorContact = selectedTransport.ConductorContact;
            $scope.ConductorAddress = selectedTransport.ConductorAddress;

            // 🔥 File Paths
            $scope.LicenseCopy = selectedTransport.LicenseCopy;
            $scope.AadharCardCopy = selectedTransport.AadharCardCopy;
            $scope.ConductorAadhaarCard = selectedTransport.ConductorAadhaarCard;
            $scope.BusRC = selectedTransport.BusRC;
            $scope.PollutionCertificate = selectedTransport.PollutionCertificate;
            $scope.FitnessCertificate = selectedTransport.FitnessCertificate;
            $scope.InsuranceCopy = selectedTransport.InsuranceCopy;

            // 🔥 File Names
            $scope.LicenseCopyName = getFileName(selectedTransport.LicenseCopy);
            $scope.AadharCardCopyName = getFileName(selectedTransport.AadharCardCopy);
            $scope.ConductorAadhaarCardName = getFileName(selectedTransport.ConductorAadhaarCard);
            $scope.BusRCName = getFileName(selectedTransport.BusRC);
            $scope.PollutionCertificateName = getFileName(selectedTransport.PollutionCertificate);
            $scope.FitnessCertificateName = getFileName(selectedTransport.FitnessCertificate);
            $scope.InsuranceCopyName = getFileName(selectedTransport.InsuranceCopy);

            $scope.$applyAsync();
        };
    $scope.opensomething = function () {
        $scope.Siteopen = false;
    }
   
   
    $scope.FireDoc = function (Id) {
        $('#' + Id).click();
    }
   
    $scope.ExportExcel = function () {

        var table = $('#example').DataTable();

        if (table.button) {
            table.button('.buttons-csv').trigger();
        } else {
            console.error("Buttons extension not loaded");
        }
    };

    $scope.ExportPdf = function () {

        var table = $('#example').DataTable();

        if (table.button) {
            table.button('.buttons-pdf').trigger();
        } else {
            console.error("Buttons extension not loaded");
        }
    };

    $scope.ExportPrint = function () {

        var table = $('#example').DataTable();


        if (table.button) {
            table.button('.buttons-print').trigger();
        } else {
            console.error("Buttons extension not loaded");
        }
    };
    $scope.TExportToCSV = function () {
        if (!$scope.TransportList || $scope.TransportList.length === 0) {
            alert("No data to export");
            return;
        }
        var csv = [];
        var headers = [
            "Sr.No",
            "Route ID",
            "Route Name",
            "Route Start Location",
            "Route End Location",
            "Bus Number",
            "Status" 
        ];
        csv.push(headers.join(","));
        angular.forEach($scope.TransportList, function (item, index) {
            var row = [
                index + 1,
                item.RouteID || '' ,
                item.RouteName || '',
                item.RouteStartLocation || '',
                item.RouteEndLocation || '',
                item.BusNumber || '',
                item.Status || ''
            ];
            csv.push(row.join(","));
        });
        var csvString = csv.join("\n");
        var blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        var link = document.createElement("a");
        var url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", "Transport.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    $scope.TExportToPDF = function () {
        if (!$scope.TransportList || $scope.TransportList.length === 0) {
            alert("No data to export");
            return;
        }
        var html = `
        <html>
        <head>
            <title>Transport Master</title>
            <style>
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 8px; font-size: 12px; }
                th { background: #f2f2f2; }
            </style>
        </head>
        <body>
            <h3 style="text-align:center;">Transport Master</h3>
            <table>
                <thead>
                    <tr>
                      <th>Sr.No</th><th>Route ID</th>
                          <th>Route Name</th>
                                    <th>Start Location</th>
                                    <th>End Location</th>
                                    <th>Bus Number</th>
                                    <th>Status</th>
                    </tr>
                </thead>
                <tbody>   `;

        angular.forEach($scope.TransportList, function (item, index) {
            html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.RouteID || ''}</td>
                <td>${item.RouteName || ''}</td>
                <td>${item.RouteStartLocation || ''}</td>
                <td>${item.RouteEndLocation || ''}</td>
                <td>${item.BusNumber || ''}</td>
                <td>${item.Status || ''}</td> 
            </tr>`;
        }); html += `</tbody></table></body></html>`;
        var win = window.open('', '', 'height=700,width=900');
        win.document.write(html);
        win.document.close();
        win.print();
    };
    $scope.TExportToPrint = function () {
        if (!$scope.TransportList || $scope.TransportList.length === 0) {
            alert("No data to print");
            return;
        }
        var html = `<html><head><title>Print Transport Master</title><style>table { width: 100%; border-collapse: collapse; }th, td { border: 1px solid black; padding: 8px; font-size: 12px; text-align:center; }
                th { background: #f2f2f2; }</style></head><body><h3 style="text-align:center;"> Transport Master</h3><table><thead><tr><th>Sr.No</th><th>Route ID</th>
                          <th>Route Name</th>
                                    <th>Start Location</th>
                                    <th>End Location</th>
                                    <th>Bus Number</th>
                                    <th>Status</th>
                    </tr></thead>
                <tbody>`;

        angular.forEach($scope.TransportList, function (item, index) {
            html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.RouteID || ''}</td>
                <td>${item.RouteName || ''}</td>
                <td>${item.RouteStartLocation || ''}</td>
                <td>${item.RouteEndLocation || ''}</td>
                <td>${item.BusNumber || ''}</td>
                <td>${item.Status || ''}</td> 
            </tr>`;
        });html += `</tbody></table></body></html>`;

        var win = window.open('', '', 'height=700,width=900');
        win.document.write(html);
        win.document.close();
        win.print();
    };
    $scope.CancelImport = function () {
        document.getElementById("input-excel").value = "";
        document.getElementById("wrapper").classList.add("d-none");
    };
    $scope.UploadDoc = function (doc) {
         
        $scope.DocumentId = doc;

        document.getElementById("fileUpload").click();
    };

    $scope.opencom = function (EmCode) {
        $scope.EmCode = EmCode;
        $scope.BindEmpComplianceDoc(EmCode);
    }
    $scope.FileChanged = function (element) {

        var file = element.files[0];
        if (!file) return;

        var reader = new FileReader();

        reader.onload = function (e) {

            var base64Data = e.target.result;

            var obj = {
                Id: $scope.DocumentId,
                ActionType: 8,
                LoginId: LoginId,
                EmpCode: $scope.EmCode,
                UFile: base64Data
            };

            $http.post('../RetailSection/UploadComplianceDoc', obj)
                .then(function (res) {

                    var data = res.data;

                    if (data) {
                        showMsgBox('999', 'Alert', 'Save Successfully', 'warning', 'btn-warning');

                        // refresh list
                        $scope.BindEmpComplianceDoc($scope.EmCode);
                    }

                }, function (err) {
                    console.error(err);
                });
        };

        reader.readAsDataURL(file);
    };
}