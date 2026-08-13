
app.RetailSecretarialComplianceController = function ($scope, $element, $filter, myService) {
    $scope.NewIndustryList = '';
    $scope.BindState = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/GetStoreDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.StateList = response.data.Result;

        });
    };

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            debugger;
            $scope.IndustryList = response.data.Result;;
        });
    }

    $scope.BindAct = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.Id = $scope.State;
        var getData = myService.methode('POST', ("../RetailSection/SearchActMaster"), JSON.stringify(collectionobj))
            .then(function (response) {
                $scope.AllActList = response.data.Result.Table;
                $scope.AllActList = $scope.AllActList.filter(item => String(item.StateId) === String($scope.State));
                $scope.hideLoader();
            })
            .catch(function (error) {
                console.error("Error fetching states:", error);
                $scope.hideLoader();
            });
    };
    $scope.BindFinacialYear = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 11 });
        getData.then(function (response) {
            debugger;
            $scope.finacialyearList = response.data.Result;
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

    $scope.ClearControl = function (flag) {
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
        }
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
     

    $scope.ResetControl = function (flag) {
        $scope.disableDelete = true;
        $scope.disablePrint = true;
        $scope.State = '';
        $scope.Act = '';
        $scope.Constitution = '';
        $scope.Department = '';
        $scope.Month = '';
        $scope.Year = '';
        $scope.Frequency = '';
        $scope.Ministry = '';
        $scope.ComplianceName = '';
        $scope.Calendartype = '';
        $scope.Risk = '';
        $scope.ComplianceType = '';
        $scope.Description = '';
        $scope.CompanyCategory = '';
        $scope.DueDate = '';
        $scope.UploadFile = '';
        $scope.Industry = '';

        $scope.EntityType = [];
        $scope.ListedStatus = '';
        $scope.StockExchange = '';
        $scope.FundingStatus = '';
        $scope.FundingType = '';
        


     
        $scope.toggleDropdown();
        $('#txtDueDate').val('');
        $scope.Save = "Save";
        if (flag == 0) {
            showMsgBox('4');
        };

    }

    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };


    $scope.DeleteRecord = function () {
        showMsgBox('Delete not allowed, please contact to admin');
        return false;
    };

    $scope.dropdownOpen = false;
    $scope.SELECTEDINDUSTRY = {};


    $scope.toggleDropdown = function ($event) {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    }; 
    $scope.updateIndustrySelection = function () {
        const selected = Object.keys($scope.SELECTEDINDUSTRY)
            .filter(key => $scope.SELECTEDINDUSTRY[key]);

        if (selected.length === 0) {
            $scope.NewIndustryList = '';
            alert("Please select at least one Industry.");
            return;
        }
        else { $scope.NewIndustryList = selected; }
    };

    $scope.SaveRecord = function () {
        const selected = $scope.EntityType;

        if (!selected || selected.length === 0) {
            $scope.NewEntityList = '';
            alert("Please select at least one Type of Entity.");
            return;
        } else {
            $scope.NewEntityList = selected;
        }
    };


    $scope.deleteRecord = function () {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = $scope.ActId;
        var getData = myService.methode('POST', ("../Retail/IUDRetailSecretarialCompliance"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.ClearControl(1);
            }
        });
    }


    $scope.SearchMasterList = [];
    $scope.started = function () {
        $scope.SELECTEDINDUSTRY = {};
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 4;
        debugger;
        var getData = myService.methode('POST', ("../Retail/SearchSecretarialCompliance"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            var tblheader =
                [
                    {
                        "HeaderText": "Sr.No.", "Value": "ROWId", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    {
                        "HeaderText": "State", "HeaderValue": "STATE_NM", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No"
                    },
                    { "HeaderText": "Act", "HeaderValue": "ActName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Constitution", "HeaderValue": "Constitution", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Department", "HeaderValue": "Department", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Month", "HeaderValue": "MonthName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Year", "HeaderValue": "Year", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Frequency", "HeaderValue": "Frequency", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Ministry", "HeaderValue": "Ministry", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ComplianceName", "HeaderValue": "ComplianceName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Calendartype", "HeaderValue": "Calendartype", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Risk", "HeaderValue": "Risk", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ComplianceType", "HeaderValue": "ComplianceType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Description", "HeaderValue": "Description", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Expire Through", "HeaderValue": "Expire", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Date", "HeaderValue": "currDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "DueDay", "HeaderValue": "DueDay", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "DueDate", "HeaderValue": "DueDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
              
                    { "HeaderText": "Compliance Category", "HeaderValue": "selectedCategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Compliance Subcategory", "HeaderValue": "selectedSubcategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ComplianceLevel", "HeaderValue": "ComplianceLevel", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Section", "HeaderValue": "Section", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Rule", "HeaderValue": "Rules", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Entity", "HeaderValue": "Entity", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Unit", "HeaderValue": "Unit", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Area", "HeaderValue": "Area", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ComplianceClassification", "HeaderValue": "ComplianceClassification", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "SubClassification", "HeaderValue": "SubClassification", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "AdditionalInformation", "HeaderValue": "AdditionalInformation", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ProofOfCompliance", "HeaderValue": "ProofOfCompliance", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Categorization", "HeaderValue": "Categorization", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ComplianceHeader", "HeaderValue": "ComplianceHeader", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PenaltyType", "HeaderValue": "PenaltyType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "PenaltyDescription", "HeaderValue": "PenaltyDescription", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "StatutoryAuthority", "HeaderValue": "StatutoryAuthority", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EventName", "HeaderValue": "EventName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "EventApplicability", "HeaderValue": "EventApplicability", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },


                    { "HeaderText": "CompanyCategory", "HeaderValue": "CompanyCategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Entity Type", "HeaderValue": "EntityType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Listed Status", "HeaderValue": "ListedStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Stock Exchange", "HeaderValue": "StockExchange", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Funding Status", "HeaderValue": "FundingStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Funding Type", "HeaderValue": "FundingType", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
               
                    

                ];

            $scope.SearchMasterList = response.data.Result;
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);
            $('#example tbody').on('dblclick', 'tr', function ()
            {
                $scope.showLoader();
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.hfId = parseInt($scope.hfId);
                $scope.SearchMasterList = $filter('filter')($scope.SearchMasterList, { 'ROWId': $scope.hfId }, true);
                $scope.State = $scope.SearchMasterList[0].State;
                $scope.BindAct();
                setTimeout(function () {
                    $scope.Act = ($scope.SearchMasterList[0].Act).toString();
                    $scope.$applyAsync();
                }, 500);
                $scope.ActId = $scope.SearchMasterList[0].CACId;
                $scope.Act = $scope.SearchMasterList[0].Act;
                $scope.Constitution = $scope.SearchMasterList[0].Constitution;
                $scope.Department = $scope.SearchMasterList[0].Department;
                $scope.Month = $scope.SearchMasterList[0].Month;
                $scope.Year = $scope.SearchMasterList[0].Year;
                $scope.Frequency = $scope.SearchMasterList[0].Frequency;
                $scope.updateMonthList();
                $scope.Ministry = $scope.SearchMasterList[0].Ministry;
                $scope.ComplianceName = $scope.SearchMasterList[0].ComplianceName;
                $scope.Calendartype = $scope.SearchMasterList[0].Calendartype;
                $scope.Risk = $scope.SearchMasterList[0].Risk;
                $scope.ComplianceType = $scope.SearchMasterList[0].ComplianceType;
                $scope.UploadFile = $scope.SearchMasterList[0].UploadFile;
                $scope.excelFile = $scope.SearchMasterList[0].ExcelFile;
                $scope.Entity = $scope.SearchMasterList[0].Entity;
                $scope.Rule = $scope.SearchMasterList[0].Rules;
                $scope.Unit = $scope.SearchMasterList[0].Unit;
                $scope.Area = $scope.SearchMasterList[0].Area;
                $scope.ComplianceClassification = $scope.SearchMasterList[0].ComplianceClassification;
                $scope.SubClassification = $scope.SearchMasterList[0].SubClassification;
                $scope.AdditionalInformation = $scope.SearchMasterList[0].AdditionalInformation;
                $scope.ProofOfCompliance = $scope.SearchMasterList[0].ProofOfCompliance;
                $scope.Categorization = $scope.SearchMasterList[0].Categorization;
                $scope.ComplianceHeader = $scope.SearchMasterList[0].ComplianceHeader;
                $scope.PenaltyType = $scope.SearchMasterList[0].PenaltyType;
                $scope.PenaltyDescription = $scope.SearchMasterList[0].PenaltyDescription;
                $scope.StatutoryAuthority = $scope.SearchMasterList[0].StatutoryAuthority;
                $scope.EventName = $scope.SearchMasterList[0].EventName;
                $scope.EventApplicability = $scope.SearchMasterList[0].EventApplicability;
                $scope.Section = $scope.SearchMasterList[0].Section;
                $scope.currDate = $scope.SearchMasterList[0].currDate;
                $scope.Description = $scope.SearchMasterList[0].Description;
                $scope.CompanyCategory = $scope.SearchMasterList[0].CompanyCategory;

                
                $scope.Industry = $scope.SearchMasterList[0].IndustryId;
                $('#txtDueDate').val($scope.SearchMasterList[0].DueDate);
                $scope.DueDay = $scope.SearchMasterList[0].DueDay;
                $scope.Expire = $scope.SearchMasterList[0].Expire;
                $scope.selectedCategory = $scope.SearchMasterList[0].selectedCategory;
                $scope.ComplianceLevel = $scope.SearchMasterList[0].ComplianceLevel;
                $scope.EntityType = [];

                $scope.EntityType = $scope.SearchMasterList[0].EntityType;
                $scope.ListedStatus = $scope.SearchMasterList[0].ListedStatus;
                $scope.StockExchange = $scope.SearchMasterList[0].StockExchange;
                $scope.FundingStatus = $scope.SearchMasterList[0].FundingStatus;
                $scope.FundingType = $scope.SearchMasterList[0].FundingType;

                $scope.openfunding();
                 



                $scope.updateSubcategories();

                setTimeout(() => {
                    $scope.Month = $scope.SearchMasterList[0].Month;
                    $scope.selectedSubcategory = $scope.SearchMasterList[0].selectedSubcategory;
                }, 200);
               
         
                 

                $scope.Save = "Edit";
                $scope.$applyAsync();
                $scope.disableDelete = true;
                $scope.disableAdd = false;
                $scope.$apply();
                //collapse box
                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();


            });
        });
        $scope.hideLoader();
    };
    $scope.isfundiung = false;

    $scope.openfunding = function () {
        if ($scope.FundingStatus == 'Yes') {
            $scope.isfundiung = true;
        }
        else {
            $scope.isfundiung = false;
            $scope.FundingType = '';
        }
    }
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
    // Put this in your AngularJS controller
    $scope.calculateDueDate = function () {
        if ($scope.currDate && $scope.DueDay) {
            // Convert currDate to JS Date object
            var baseDate = new Date($scope.currDate);

            // Parse DueDay as integer
            var daysToAdd = parseInt($scope.DueDay, 10);

            if (!isNaN(daysToAdd)) {
                // Add days
                baseDate.setDate(baseDate.getDate() + daysToAdd);

                // Assign as Date object
                $scope.DueDate = baseDate;
            }
        }
    };

    // Watch changes
    $scope.$watchGroup(['currDate', 'DueDay'], function () {
        $scope.calculateDueDate();
    });


    // Watch for changes in currDate and DueDay
    $scope.$watchGroup(['currDate', 'DueDay'], function (newValues, oldValues) {
        $scope.calculateDueDate();
    });



    /////////////commented by shipra at 18july///////////////////


    //$scope.SaveRecord = function () {
         
       
    //  if (isValidate()) {
      
    //        var formData = new FormData();
    //        $scope.showLoader();
    //        function safeAppend(key, value) {
    //            formData.append(key, value !== undefined && value !== null ? value : '');
    //        }
    //        safeAppend("State", $scope.State);
    //        safeAppend("Act", $scope.Act);
    //        safeAppend("Constitution", $scope.Constitution);
    //        safeAppend("Department", $scope.Department);
    //        safeAppend("Month", $scope.Month);
    //        safeAppend("Year", $scope.Year);
    //        safeAppend("Frequency", $scope.Frequency);
    //        safeAppend("Ministry", $scope.Ministry);
    //        safeAppend("ComplianceName", $scope.ComplianceName);
    //        safeAppend("Calendartype", $scope.Calendartype);
    //        safeAppend("Risk", $scope.Risk);
    //        safeAppend("ComplianceType", $scope.ComplianceType);
    //        safeAppend("Description", $scope.Description);
    //        safeAppend("DueDate", $('#txtDueDate').val());
    //        safeAppend("IndustryList", Array.isArray($scope.NewIndustryList) ? $scope.NewIndustryList.join(',') : $scope.NewIndustryList);
    //        safeAppend("selectedCategory", $scope.selectedCategory); 
    //      safeAppend("selectedSubcategory", $('#subcategory').val());
    //        safeAppend("DueDay", $scope.DueDay);
    //      safeAppend("Expire", $scope.Expire);
    //      safeAppend("ComplianceLevel", $scope.ComplianceLevel);
    //      safeAppend("Rule", $scope.Rule);
    //      safeAppend("Section", $scope.Section);
    //      safeAppend("CompanyCategory", $scope.CompanyCategory);


    //      safeAppend("EntityType", $scope.EntityType);
    //      safeAppend("ListedStatus", $scope.ListedStatus);
    //      safeAppend("StockExchange", $scope.StockExchange);
    //      safeAppend("FundingStatus", $scope.FundingStatus);
    //      safeAppend("FundingType", $scope.FundingType);

           
          
          
    //      var dateStr = null;
    //      if ($scope.currDate) {
    //          var d = new Date($scope.currDate);
    //          if (!isNaN(d.getTime())) {
    //              dateStr = d.toISOString().split('T')[0];
    //          }
    //      }
    //      safeAppend("currDate", dateStr);
          
    //        if ($scope.Save === "Save") {
    //            safeAppend("Action", 1);
    //        } else {
    //            safeAppend("Action", 2);
    //            safeAppend("Id", $scope.hfId);
    //         /*   safeAppend("Industry", $scope.hfId);*/ 
    //        }
    //        // Append Excel File
    //        if ($scope.UploadFile) {
    //            safeAppend("UploadFile", $scope.UploadFile);
    //        }
    //        // Append Excel File
    //        if ($scope.ExcelFile) {
    //            safeAppend("ExcelFile", $scope.ExcelFile);
    //        }

    //        // Send data via AJAX
    //        $.ajax({
    //            url: "../Retail/IUDRetailSecretarialCompliance",
    //            type: "POST",
    //            data: formData,
    //            contentType: false,
    //            processData: false,
    //            success: function (response) {
    //            response=  JSON.parse(response.Result);
    //                if (showMsgBox(response.Result))
    //                {
    //                    $scope.ClearControl(1);
    //                }
    //            },
    //            error: function (err) {
    //                alert("Error saving record.");
    //            }
    //        });
    //    }
    //};




    ///////Added by shipra////



  
    $scope.EntityOptions = [
        "Private Limited Company", "Public Limited Company", "One Person Company (OPC)",
        "Small Company", "Nidhi Company", "Section 8 Company", "Producer Company",
        "Dormant Company", "Government Company", "Foreign Company (ROC reg.)",
        "Limited Liability Partnership (LLP)", "Society", "Trust", "Partnership Firm", "SME-Inprogress"
    ];

    $scope.EntityType = []; // This will bind the selected values

    $scope.dropdownVisible = false;

    $scope.toggleDropdown = function () {
        $scope.dropdownVisible = !$scope.dropdownVisible;
    };

    $scope.toggleSelection = function (type) {

        if ($scope.Save == 'Edit') {
            if (!Array.isArray($scope.EntityType)) {
                if (typeof $scope.EntityType === 'string' && $scope.EntityType.trim() !== '') {
                    $scope.EntityType = $scope.EntityType.split(',').map(function (item) {
                        return item.trim();
                    });
                } else {
                    $scope.EntityType = [];
                }
            }
        }



        var idx = $scope.EntityType.indexOf(type);
        if (idx > -1) {
            $scope.EntityType.splice(idx, 1);
        } else {
            $scope.EntityType.push(type);
        }
    };

    $scope.isChecked = function (type) {
        return $scope.EntityType.indexOf(type) > -1;
    };

    $scope.isAllSelected = function () {
        return $scope.EntityType.length === $scope.EntityOptions.length;
    };

    $scope.toggleAll = function () {
        if ($scope.isAllSelected()) {
            $scope.EntityType = [];
        } else {
            $scope.EntityType = angular.copy($scope.EntityOptions);
        }
    };





    $scope.SaveRecord = function () {

        if (!$scope.EntityType || $scope.EntityType.length === 0) {

            Swal.fire({
                title: 'Required',
                text: 'Please select at least one Type of Entity.',
                icon: 'warning',
                iconColor: '#d35400',
                background: '#fffaf3',
                color: '#444',
                confirmButtonColor: '#d35400',
                confirmButtonText: 'OK',
                width: '350px',        // ⬅️ Compact width
                padding: '1em',        // ⬅️ Controlled padding
                customClass: {
                    title: 'swal-title-small',
                    popup: 'swal-popup-small',
                    confirmButton: 'swal-btn-small'
                },
                showClass: {
                    popup: 'animate__animated animate__fadeIn'
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOut'
                }
            });


            return;
        }
        if (isValidate()) {
            var formData = new FormData();
            $scope.showLoader();

            function safeAppend(key, value) {
                formData.append(key, value !== undefined && value !== null ? value : '');
            }

            // Append basic form values
            safeAppend("State", $scope.State);
            safeAppend("Act", $scope.Act);
            safeAppend("Constitution", $scope.Constitution);
            safeAppend("Department", $scope.Department);
            safeAppend("Month", $scope.Month);
            safeAppend("Year", $scope.Year);
            safeAppend("Frequency", $scope.Frequency);
            safeAppend("Ministry", $scope.Ministry);
            safeAppend("ComplianceName", $scope.ComplianceName);
            safeAppend("Calendartype", $scope.Calendartype);
            safeAppend("Risk", $scope.Risk);
            safeAppend("ComplianceType", $scope.ComplianceType);
            safeAppend("Description", $scope.Description);
            safeAppend("DueDate", $('#txtDueDate').val());
            safeAppend("IndustryList", Array.isArray($scope.NewIndustryList) ? $scope.NewIndustryList.join(',') : $scope.NewIndustryList);
            safeAppend("selectedCategory", $scope.selectedCategory);
            safeAppend("selectedSubcategory", $('#subcategory').val());
            safeAppend("DueDay", $scope.DueDay);
            safeAppend("Expire", $scope.Expire);
            safeAppend("ComplianceLevel", $scope.ComplianceLevel);
            safeAppend("Rule", $scope.Rule);
            safeAppend("Entity", $scope.Entity);
            safeAppend("Unit", $scope.Unit);
            safeAppend("Area", $scope.Area);
            safeAppend("ComplianceClassification", $scope.ComplianceClassification);
            safeAppend("SubClassification", $scope.SubClassification);
            safeAppend("AdditionalInformation", $scope.AdditionalInformation);
            safeAppend("ProofOfCompliance", $scope.ProofOfCompliance);
            safeAppend("Categorization", $scope.Categorization);
            safeAppend("ComplianceHeader", $scope.ComplianceHeader);
            safeAppend("PenaltyType", $scope.PenaltyType);
            safeAppend("PenaltyDescription", $scope.PenaltyDescription);
            safeAppend("StatutoryAuthority", $scope.StatutoryAuthority);
            safeAppend("EventName", $scope.EventName);
            safeAppend("EventApplicability", $scope.EventApplicability);
            safeAppend("Section", $scope.Section);
            safeAppend("CompanyCategory", $scope.CompanyCategory);

            // ✅ MULTISELECT HANDLING
            safeAppend("EntityType", Array.isArray($scope.EntityType) ? $scope.EntityType.join(',') : $scope.EntityType);


            // Other values
            safeAppend("ListedStatus", $scope.ListedStatus);
            safeAppend("StockExchange", $scope.StockExchange);
            safeAppend("FundingStatus", $scope.FundingStatus);
            safeAppend("FundingType", $scope.FundingType);

            // Date conversion
            var dateStr = null;
            if ($scope.currDate) {
                var d = new Date($scope.currDate);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                }
            }
            safeAppend("currDate", dateStr);

            // Action for save/update
            if ($scope.Save === "Save") {
                safeAppend("Action", 1);
            } else {
                safeAppend("Action", 2);
                safeAppend("Id", $scope.hfId);
            }

            // File uploads
            if ($scope.UploadFile) {
                safeAppend("UploadFile", $scope.UploadFile);
            }

            if ($scope.ExcelFile) {
                safeAppend("ExcelFile", $scope.ExcelFile);
            }

            // Final AJAX call
            $.ajax({
                url: "../Retail/IUDRetailSecretarialCompliance",
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



    ////Eneded by shipra///////



    $scope.complianceData = {
        "Corporate Compliance": [
            "Companies Act, 2013 (Corporate Governance)",
            "SEBI (Securities and Exchange Board of India) Compliance",
            "FDI (Foreign Direct Investment) Compliance"
        ],
        "Taxation Compliance": [
            "Income Tax Act, 1961",
            "Goods and Services Tax (GST) Compliance",
            "Transfer Pricing Compliance",
            "Excise Duty and Customs Duty Compliance"
        ],
        "Labour and Employment Compliance": [
            "Employees' Provident Fund (EPF) Compliance",
            "Employees' State Insurance (ESI) Compliance",
            "Factories Act Compliance",
            "Minimum Wages Act Compliance",
            "Payment of Gratuity Act Compliance",
            "Professional Tax Compliance",
            "Labour Welfare Fund Compliance",
            "Bonus Compliance",
            "Labour Code Compliance",
            "Other"
        ],
        "Environmental Compliance": [
            "Environment Protection Act, 1986",
            "Air and Water Pollution Control Act Compliance",
            "Hazardous Waste Management Rules"
        ],
        "Financial and Audit Compliance": [
            "Reserve Bank of India (RBI) Guidelines",
            "National Financial Reporting Authority (NFRA) Compliance",
            "Internal Audit and External Audit Regulations",
            "Anti-Money Laundering (AML) and Know Your Customer (KYC) Compliance"
        ],
        "Intellectual Property (IP) Compliance": [
            "Patents Act, 1970",
            "Trademark Act, 1999",
            "Copyright Act, 1957"
        ],
        "Consumer Protection Compliance": [
            "Consumer Protection Act, 2019",
            "Food Safety and Standards Authority of India (FSSAI) Compliance"
        ],
        "Foreign Exchange Management Act (FEMA) Compliance": [
            "Compliance with Foreign Exchange Regulations in India",
            "External Commercial Borrowings (ECB) Compliance"
        ],
        "Data Protection and Privacy Compliance": [
            "Information Technology (Reasonable Security Practices and Procedures) Rules",
            "Data Protection Bill (draft)"
        ],
        "Industry-Specific Compliance": [
            "Telecom Regulatory Authority of India (TRAI) Compliance",
            "Insurance Regulatory and Development Authority of India (IRDAI) Compliance"
        ]
    };

    // Initialize
    $scope.selectedCategory = "";
    $scope.subcategories = [];

    // Function to update subcategories
    $scope.updateSubcategories = function () {
        $scope.subcategories = $scope.complianceData[$scope.selectedCategory] || [];
        $scope.selectedSubcategory = ""; // Reset subcategory selection
    };
    $scope.updateMonthList = function () {
        var freq = $scope.Frequency;

        $scope.MonthList = [];

        $scope.$watch('Frequency', function (newValue, oldValue) {
            if (!newValue) return;

            switch (newValue) {
                case 'Monthly':
                    $scope.MonthList = [
                        { MonthNumber: 'January', MonthName: 'January' },
                        { MonthNumber: 'February', MonthName: 'February' },
                        { MonthNumber: 'March', MonthName: 'March' },
                        { MonthNumber: 'April', MonthName: 'April' },
                        { MonthNumber: 'May', MonthName: 'May' },
                        { MonthNumber: 'June', MonthName: 'June' },
                        { MonthNumber: 'July', MonthName: 'July' },
                        { MonthNumber: 'August', MonthName: 'August' },
                        { MonthNumber: 'September', MonthName: 'September' },
                        { MonthNumber: 'October', MonthName: 'October' },
                        { MonthNumber: 'November', MonthName: 'November' },
                        { MonthNumber: 'December', MonthName: 'December' }
                    ];
                    break;

                case 'Quarterly':
                    $scope.MonthList = [
                        { MonthNumber: 'Q1 - April to June', MonthName: 'Q1 - April to June' },
                        { MonthNumber: 'Q2 - July to September', MonthName: 'Q2 - July to September' },
                        { MonthNumber: 'Q3 - October to December', MonthName: 'Q3 - October to December' },
                        { MonthNumber: 'Q4 - January to March', MonthName: 'Q4 - January to March' }
                    ];
                    break;

                case 'HalfYearly':
                    $scope.MonthList = [
                        { MonthNumber: 'H1 - April to September', MonthName: 'H1 - April to September' },
                        { MonthNumber: 'H2 - October to March', MonthName: 'H2 - October to March' }
                    ];
                    break;

                case 'Yearly':
                    $scope.MonthList = [
                        { MonthNumber: 'Yearly', MonthName: 'Yearly' }
                    ];
                    break;

                case 'Weekly':
                    $scope.MonthList = [
                        { MonthNumber: 'Weekly', MonthName: 'Weekly' }
                    ];
                    break;

                case 'Fortnightly':
                    $scope.MonthList = [
                        { MonthNumber: 'Fortnightly', MonthName: 'Fortnightly' }
                    ];
                    break;

                case 'Event':
                    $scope.MonthList = [
                        { MonthNumber: 'Event', MonthName: 'Event' }
                    ];
                    break;
                case 'One Time':
                    $scope.MonthList = [
                        { MonthNumber: 'One Time', MonthName: 'One Time' }
                    ];
                    break;

                default:
                    $scope.MonthList = [];
                    break;
            }
        });

    };
}
      