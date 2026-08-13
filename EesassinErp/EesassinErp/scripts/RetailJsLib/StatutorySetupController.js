app.StatutorySetupController = function ($scope, $element, $filter, myService) {

    $scope.ListSet = [];
    $scope.AllActList = [];

    $scope.AddListSet = function () {
        $scope.ListSet.push({
            State: '',
            StoreId:'',
            Act: '',
            ComplianceName : '',
            RegistrationNumber: '',
            ValidFrom: '',
            ValidTo: '',
            TypeCode: '',
            RegistrationType: '',
            Upload: ''
        });
    };
    $scope.showEntryForm = false;


    $scope.ResetForm = function () {
        $scope.ListSet = [{
            State: "",
            Act: "",
            ComplianceName: "",
            RegistrationType: "",
            Upload: ""
        }];
        angular.element("input[type='file']").val(null);
    };

    $scope.switchView = function () {
        $scope.showEntryForm = !$scope.showEntryForm;
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    };

    $scope.RemoveListSet = function (index) {
        $scope.ListSet.splice(index, 1);
    };
    $scope.viewFile = function (uploadfile) {
        if (uploadfile) {
            var link = document.createElement("a");
            // Set correct file path (adjust if necessary)
            link.href = uploadfile;
            link.download = "StaturySetup" + getFileExtension(uploadfile);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("No file uploaded.");
        }
        function getFileExtension(filename) {
            var extension = filename.split('.').pop();
            return extension ? "." + extension : "";
        }
    };

    $scope.BindStore = function (State) {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.ActionType = 19; 
        collectionobj.StoreCode = State;
        collectionobj.UserId = MapId
        var getData = myService.methode('POST', ("../RetailSection/SearchStoreCompliance"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };

    $scope.Binddasboard = function () {
        var collectionobj = {
            Action: 8,
            Id: LoginId
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchStatutorySetup", collectionobj);
        getData.then(function (response) {
            $scope.dashboardlist = response.data;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };

    $scope.AllState = function () {
        var collectionobj = {
            Action: 6,
            Id: LoginId
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchStatutorySetup", collectionobj);
        getData.then(function (response) {
            $scope.AllStateList = response.data;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };

    $scope.BindAct = function (State, index) {
        var collectionobj = {
            Action: 7,
            Createdby: State,
            Id: LoginId
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchStatutorySetup", collectionobj);
        getData.then(function (response) {
            $scope.AllActList[index] = response.data;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };
    $scope.AllComlist = {};
    $scope.BindCompliance = function (Act, State, index) {
        var collectionobj = {
            Action: 9,
            Id: Act,
            Createdby: State
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchStatutorySetup", collectionobj);
        getData.then(function (response) {
         
            $scope.AllComlist[index] = response.data;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };

    //$scope.handleFileUpload = function (input, imgfileid) {
    //    var index = parseInt(input.getAttribute('data-index'));
    //    if (input.files && input.files[0]) {
    //        var filerdr = new FileReader();
    //        filerdr.onload = function (e) {
    //            $scope.ListSet[index].Upload = e.target.result;
    //            $scope.$applyAsync(); 
    //        }
    //        filerdr.readAsDataURL(input.files[0]);
    //    }
    //      const MAX_SIZE_MB = 3;
    //    const fileSizeMB = file.size / (1024 * 1024);
    //    if (fileSizeMB > MAX_SIZE_MB) {
    //        swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
    //        input.value = "";
    //        return;
    //    }
    //    else { 
          
    //        $scope.ListSet[Index].Upload = '';
    //        $scope.$applyAsync();
    //    }
    //};

    $scope.handleFileUpload = function (input, imgfileid) {

        var index = parseInt(input.getAttribute('data-index'));

        if (input.files && input.files[0]) {

            var file = input.files[0];

            // Allow only PDF
            if (file.type !== "application/pdf") {
                swal("Invalid File", "Only PDF files are allowed.", "error");

                input.value = "";
                $scope.ListSet[index].Upload = '';
                $scope.$applyAsync();
                return;
            }

            // File size validation
            const MAX_SIZE_MB = 3;
            const fileSizeMB = file.size / (1024 * 1024);

            if (fileSizeMB > MAX_SIZE_MB) {
                swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");

                input.value = "";
                $scope.ListSet[index].Upload = '';
                $scope.$applyAsync();
                return;
            }
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.ListSet[index].Upload = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
        else {

            $scope.ListSet[index].Upload = '';

            $scope.$applyAsync();
        }
    };


    function formatDateLocal(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }
    $scope.SaveAfterValidate = function () {
        $scope.ListSet;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Map1ListSet = $scope.ListSet.map(obj => {
                return {
                    ...obj,
                    ValidFrom: formatDateLocal(obj.ValidFrom),
                    ValidTo: formatDateLocal(obj.ValidTo)
                };
            });
            collectionobj.Action = 1;
            collectionobj.Createdby = LoginId;
            var getData = myService.methode('POST', "../Retail/IUDStatutorySetup", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.Binddasboard();
                    $scope.switchView();
                    $scope.ListSet = [];
                    $scope.AllActList = [];
                    $scope.AddListSet();
                    $scope.ResetForm();
                }
            });
        }
    };

    function formatDateLocal(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }







    $scope.SearchRecord = function () {
        $('#collapseinputbox').attr('class', 'collapse in');
        $('#CollapseSearchTableList').attr('class', 'collapse');
        $scope.started();
    };

    $scope.started = function () {
        var collectionobj = {
            Action: 5,
            CreatedBy: LoginId
        };

        var getData = myService.methode('POST', "../DocumentMaster/GetMapping", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;

            var tblheader = [
                { HeaderText: "Sr.No.", Value: "Id", HeaderValue: "Id", Width: "50px", ShowColumn: "Yes", ImageColumn: "No", CssClass: "srno" },
                { HeaderText: "Client", HeaderValue: "Client", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
                { HeaderText: "Client Site", HeaderValue: "ClientSite", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
                { HeaderText: "Vendor", HeaderValue: "Vendor", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
                { HeaderText: "Auditor", HeaderValue: "Auditor", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" }
            ];

            $scope.MappingList = response.data;
            loadDataUsingPreDefinedColumn(tblheader, response.data);

            $('#example tbody').on('dblclick', 'tr', function () {
                $scope.showLoader();
                $scope.IsHide = true;
                var row = $('#example').DataTable().row(this).data();
                $scope.hfId = $(this).find('input[type="hidden"]').val();
                $scope.MappingList = $filter('filter')($scope.MappingList, { 'Id': $scope.hfId });

                $scope.ListSet[0].Id = $scope.MappingList[0].Id;
                $scope.ListSet[0].ClientId = $scope.MappingList[0].ClientId;
                $scope.BindClientSite($scope.ListSet[0].ClientId, 0);

                setTimeout(function () {
                    $scope.ListSet[0].ClientSiteId = $scope.MappingList[0].ClientSiteId;
                }, 500);

                $scope.ListSet[0].VendorId = $scope.MappingList[0].VendorId;
                $scope.ListSet[0].AuditorId = $scope.MappingList[0].AuditorId;

                $scope.Save = "Edit";
                $scope.disableAdd = false;
                $scope.$apply();

                $('.br-pageheader').fadeIn();
                $('#collapseinputbox').fadeIn();
                $('#CollapseSearchTableList').fadeOut();

                $scope.SetFocus('#ddlState', true);
                $scope.hideLoader();
            });
        });
    };

    $(document).on("click", ".RefreshSearchTable", function (e) {
        e.preventDefault();
        var panelToRefresh = $(this).closest('.panel').find('.refresh-container');
        var loadingAnim = panelToRefresh.find('.loading-progress');
        panelToRefresh.show();
        setTimeout(function () {
            loadingAnim.addClass('la-animate');
        }, 100);
        $scope.started();
    });

    $scope.PrintRecord = function () {
        var tblheader = [
            { HeaderText: "Sr.No.", Value: "InvoiceId", HeaderValue: "Id", Width: "50px", ShowColumn: "Yes", ImageColumn: "No", CssClass: "srno" },
            { HeaderText: "Serial No", HeaderValue: "InvoiceId", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
            { HeaderText: "Created On", HeaderValue: "CreatedOn", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
            { HeaderText: "Client", HeaderValue: "ClientName", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
            { HeaderText: "Site", HeaderValue: "SiteName", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" },
            { HeaderText: "Finacial Year", HeaderValue: "FYName", Width: "100%", ShowColumn: "Yes", ImageColumn: "No" }
        ];
        $scope.PrintMaster(tblheader, $scope.VendorInvoiceList, window.document.title);
    };

};
