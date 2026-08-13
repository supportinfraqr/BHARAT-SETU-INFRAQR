app.ClientBoardingController = function ($scope, $element, $filter, myService) {
    $scope.SetFocus('#txtBoardingtype'); 
    $scope.UploadExcelFile = function (element) {
        var file = element.files[0]; // Get the selected file
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            $scope.$apply(function () {
                $scope.ExcelFile = file; // Store file object
            });
        };
        reader.readAsDataURL(file);
    };
    $scope.UploadFileshow = function (input) {
        if (input.files && input.files[0]) {
            let file = input.files[0];

            // Validate file type (Only PDF)
            if (file.type !== "application/pdf") {
                alert("Only PDF files are allowed!");
                return;
            }

            // Initialize FormData 
            $scope.UploadFile = file;
        } else {
            alert("Please select a file.");
        }
    };


    $scope.SaveRecord = function () {
        if (isValidate()) { 
            $scope.showLoader(); 
            // Create FormData to send file + JSON data
            var formData = new FormData();
             
            $scope.showLoader();
            function safeAppend(key, value) {
                formData.append(key, value !== undefined && value !== null ? value : '');
            }


           safeAppend("Boardingtype", $scope.Boardingtype);
           safeAppend("DocumentName", $scope.DocumentName);
           safeAppend("Frequency", $scope.Frequency);
           safeAppend("Month", $scope.Month);
           safeAppend("Year", $scope.Year);
           safeAppend("State", $scope.State);
           safeAppend("Description", $scope.Description);
           safeAppend("DueDate", $('#txtDueDate').val()); 
           safeAppend("Remark", $scope.Remark);
           safeAppend("Createdby", LoginId);

            if ($scope.Save === "Save") {
               safeAppend("Action", 1);
            } else {
               safeAppend("Action", 2);
               safeAppend("Id", $scope.hfId); 
            }
            // Append Excel File
            if ($scope.UploadFile) {
               safeAppend("UploadFile", $scope.UploadFile);
            }
            // Append Excel File
            if ($scope.ExcelFile) {
               safeAppend("ExcelFile", $scope.ExcelFile);
            }

            // Send data via AJAX
            $.ajax({
                url: "../Retail/InsertClientOnboarding",
                type: "POST",
                data: formData,
                contentType: false,
                processData: false,
                success: function (response) {
                    response = JSON.parse(response.Result);
                    if (showMsgBox(response.Result)) {
                        $scope.ClearControl(1);
                    }
                },
                error: function (err) {
                    alert("Error saving record.");
                }
            });
        }
    };




    //$scope.SaveRecord = function () { 
    //    if (isValidate()) {
    //        $scope.showLoader(); 
    //        var collectionobj = {};
    //        collectionobj.Boardingtype = $scope.Boardingtype; // Checked
    //        collectionobj.DocumentName = $scope.DocumentName; // Checked
    //        collectionobj.Frequency = $scope.Frequency; // Checked
    //        collectionobj.Month = $scope.Month; // Checked
    //        collectionobj.Year = $scope.Year; // Checked
    //        collectionobj.State = $scope.State; // Checked
    //        collectionobj.Description = $scope.Description; // Checked
    //        collectionobj.DueDate = $('#txtDueDate').val();
    //        collectionobj.Remark = $scope.Remark; // Checked
    //        collectionobj.UploadFile = $scope.UploadFile; // Checked
    //        collectionobj.Createdby = LoginId; // Logged-in user ID

    //        // Set action type based on Save/Update
    //        if ($scope.Save == "Save") {
    //            collectionobj.Action = 1; // Insert
    //        } else {
    //            collectionobj.Action = 2; // Update
    //            collectionobj.Id = $scope.hfId; // Use hidden field ID for update
    //        }

    //        // API call for inserting/updating data
    //        var getData = myService.methode(
    //            'POST',
    //            "../Retail/InsertClientOnboarding",
    //            '{obj:' + JSON.stringify(collectionobj) + '}'
    //        );

    //        getData.then(function (response) {
    //            if (showMsgBox(response.data.Result)) {
    //                $scope.ClearControl(1);
    //            }
    //        }).catch(function (error) {
    //            console.error("Error occurred:", error);
    //            showMsgBox("An error occurred while processing the request.");
    //        });
    //    }
    //};
    $scope.BindState = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/GetStoreDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.StateList = response.data.Result;

        });
    };
    $scope.BindFinacialYear = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 11 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data.Result;
        });
    }
    $scope.BindMonth = function () {
        var getData = myService.methode('POST', ("../VenInvoice/GetVenInvoiceListDT"), { "ActionType": 7 });
        getData.then(function (response) {
            debugger;
            $scope.MonthList = response.data;
        });
    }
    $scope.handleFileUpload = function (inputElement) {
        const file = inputElement.files[0];
        if (file) {
            console.log('File selected:', file.name);
            $scope.UploadFile = file.name; // Bind the file to the Angular model
            $scope.$apply(); // Update the scope
        }
    };
    //$scope.UploadFileshow = function (input) {
    //    if (input.files && input.files[0]) {
    //        const file = input.files[0];
    //        var maxFileSize = 10 * 1024 * 1024; // 10 MB

    //        if (file.size > maxFileSize) {
    //            alert("File size exceeds 10 MB!");
    //            return;
    //        } 
    //        const reader = new FileReader();
    //        reader.onload = function (e) {
    //            $scope.UploadFile = e.target.result;
    //            $scope.$applyAsync();
    //        };
    //        reader.readAsDataURL(file);
    //    } else {
    //        $scope.UploadFile = '';
    //        $scope.$applyAsync();
    //    }
    //};


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
        // Reset form controls to their default values
        $scope.Save = "Save";
        $scope.disableAdd = false;
        $scope.State = ""; // Reset State field (Checked)
        $scope.Description = ""; // Reset Description field (Checked)
        $scope.DocumentName = ""; // Reset DocumentName field (Checked)
        $scope.Frequency = ""; // Reset Frequency field (Checked)
        $scope.Month = ""; // Reset Month field (Checked)
        $scope.Year = ""; // Reset Year field (Checked)
        $scope.DueDate = ""; // Reset DueDate field (Checked)
        $scope.Remark = ""; // Reset Remark field (Checked)
        $scope.UploadFile = ""; // Reset UploadFile field (Checked)
        $('#txtDueDate').val('');
        // Clear hidden fields and lists
        $scope.hfId = "";
        $scope.MasterList = []; // Reset FarmerMasterList

        // Set focus on the desired element
        $scope.SetFocus('#txtBoardingtype'); // Adjusted for DocumentName field focus

        // Show a message if the flag is 0
        if (flag == 0) {
            showMsgBox('4');
        }
    };

    $scope.DocumentList = [];
    /*Search Button Click Event*/
    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 4; // Action to fetch data
        debugger;

        var getData = myService.methode('POST', "../Retail/SearchClientOnboarding", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            // Define table header columns
            var tblheader = [
                { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                { "HeaderText": "Boarding Type", "HeaderValue": "Boardingtype", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Document Name", "HeaderValue": "DocumentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Frequency", "HeaderValue": "Frequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "State Name", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Due Date", "HeaderValue": "DueDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Remark", "HeaderValue": "Remark", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                { "HeaderText": "Month", "HeaderValue": "Month", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Year", "HeaderValue": "Year", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Uploaded File", "HeaderValue": "UploadFile", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Last Updated By", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                { "HeaderText": "Last Updated On", "HeaderValue": "LastUpdate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
            ];

            // Bind data to the scope variable
            $scope.DocumentList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

            // Event for double-clicking a row
            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();

                var row = $('#example').DataTable().row(this).data();
                
                $scope.hfId = parseInt($(this).find('input[type="hidden"]').val());
                $scope.MasterList = $filter('filter')($scope.DocumentList, { 'Id': $scope.hfId});

                // Populate form fields with the selected row's data
                $scope.Boardingtype = $scope.MasterList[0].Boardingtype
                $scope.DocumentName = $scope.MasterList[0].DocumentName
                $scope.Frequency = $scope.MasterList[0].Frequency
                $scope.State = $scope.MasterList[0].State;
                $scope.Description = $scope.MasterList[0].Description;
                $scope.DueDate = $('#txtDueDate').val($scope.MasterList[0].DueDate);
                $scope.Remark = $scope.MasterList[0].Remark;
                $scope.UploadFile = $scope.MasterList[0].UploadFile;
                $scope.Month = $scope.MasterList[0].Month;
                $scope.Year = $scope.MasterList[0].Year;

                // Enable/disable buttons
                $scope.disableAdd = false;
                $scope.Save = "Edit";
                $scope.disableDelete = false;

                $scope.$apply();

                // Manage visibility of sections
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();
            });
        });
    };


    $scope.DeleteRecord = function () {
        deleteConfirmbox("Do you want to delete this record?", $scope.deleteRecord);
    };
   
    $scope.deleteRecord = function () { 
        debugger;
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = $scope.hfId;
        var getData = myService.methode('POST', "../Retail/InsertClientOnboarding", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    };

    /*Refresh Search Table Record*/
    $(document).on("click", ".RefreshSearchTable", function (e) {
        debugger;
        var panelToRefresh = $(this).closest('.panel').find('.refresh-container');
        var dataToRefresh = $(this).closest('.panel').find('.panel-wrapper');
        var loadingAnim = panelToRefresh.find('.loading-progress');
        panelToRefresh.show();
        setTimeout(function () {
            loadingAnim.addClass('la-animate');
        }, 100);
        $scope.started();
        return false;
    });

    $scope.PrintRecord = function () {
        var tblheader = [
            { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
            { "HeaderText": "Document Name", "HeaderValue": "DocumentName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "Frequency", "HeaderValue": "Frequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "State Name", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "Due Date", "HeaderValue": "DueDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "Remark", "HeaderValue": "Remark", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "Uploaded File", "HeaderValue": "UploadFile", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
            { "HeaderText": "Last Updated By", "HeaderValue": "Name", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
            { "HeaderText": "Last Updated On", "HeaderValue": "LastUpdate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
        ];
        $scope.PrintMaster(tblheader, $scope.DocumentList, window.document.title);
    };
}