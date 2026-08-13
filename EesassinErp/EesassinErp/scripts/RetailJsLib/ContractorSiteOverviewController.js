app.ContractorSiteOverviewController = function ($scope, $element, $filter, myService) {

    $scope.SiteDetails = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Contractor/GetSiteOverview", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.SiteList = response.data.Result;
        });
        $scope.hideLoader();
    }

    $scope.GetSiteId = function (Id) {
        $scope.Siteid = Id;
    }

    $scope.SearchSitebyId = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = Id;
        var getData = myService.methode('POST', "../Contractor/GetSiteOverview", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Sitemaster = response.data.Result[0];
            $scope.BillingOrderDetail(Id);
            $scope.LicenseDetail(Id);
        });
    }

    $scope.BillingOrderDetail = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Contractor/GetSiteOverview", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.OrderDetails = response.data.Result;
        });
    }

    $scope.LicenseDetail = function (Id) {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = Id;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Contractor/GetSiteOverview", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ContractorLicense = response.data.Result;
        });
    }

    $scope.SaveOrder = function () {
        if (!$scope.OrderNumber || $scope.OrderNumber.trim() == "") {
            showMsgBox('999', 'Validation', 'Please enter Order Number', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.OrderQty || isNaN($scope.OrderQty) || Number($scope.OrderQty) <= 0) {
            showMsgBox('999', 'Validation', 'Please enter valid Order Quantity', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.OrderValue || isNaN($scope.OrderValue) || Number($scope.OrderValue) <= 0) {
            showMsgBox('999', 'Validation', 'Please enter valid Order Value', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.ValidFrom) {
            showMsgBox('999', 'Validation', 'Please select Order Validity From Date', 'warning', 'btn-warning');
            return;
        }

        if (!$scope.ValidTo) {
            showMsgBox('999', 'Validation', 'Please select Order Validity To Date', 'warning', 'btn-warning');
            return;
        }

        if (new Date($scope.ValidTo) < new Date($scope.ValidFrom)) {
            showMsgBox('999', 'Validation', 'Validity To Date cannot be earlier than Validity From Date', 'warning', 'btn-warning');
            return;
        }

        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.Id = $scope.Id || 0;
        collectionobj.LoginId = LoginId;
        collectionobj.OrderNumber = $scope.OrderNumber;
        collectionobj.Site = $scope.Siteid;
        collectionobj.OrderQty = $scope.OrderQty;
        collectionobj.OrderValue = $scope.OrderValue;
        collectionobj.OrderValidityFrom = $('#txtvalidfrom').val();
        collectionobj.OrderValidityTo = $('#txtvalidto').val();
        collectionobj.OrderCopy = $scope.AttachCopy_Preview;
        var getData = myService.methode('POST', "../Contractor/SaveBillingOrder", JSON.stringify(collectionobj));
        getData.then(function (response) {
            if (response.data.Result > 0) {
                showMsgBox('999', 'Save', 'Submitted Successfully', 'success', 'btn-success');
                $scope.Id = response.data.Result;
                setTimeout(function () {
                    window.location.reload();
                }, 1500);
            }
        });
    };
    $scope.SaveLicense = function () {
        if (isValidate()) {
            if ($scope.LicenseStatus == "Issued") {
                if (!$scope.LicenseDate) {
                    showMsgBox('999', 'Validation', 'Please select License Date', 'warning', 'btn-warning');
                    return;
                }
                if (!$scope.LicenseNumber) {
                    showMsgBox('999', 'Validation', 'Please Enter License Number', 'warning', 'btn-warning');
                    return;
                }
                if (!$scope.LicenseValidFrom) {
                    showMsgBox('999', 'Validation', 'Please select License Validity Start Date', 'warning', 'btn-warning');
                    return;
                }

                if (!$scope.LicenseValidTo) {
                    showMsgBox('999', 'Validation', 'Please select License Validity End Date', 'warning', 'btn-warning');
                    return;
                }

                if (new Date($scope.LicenseValidTo) < new Date($scope.LicenseValidFrom)) {
                    showMsgBox('999', 'Validation', 'Validity End Date cannot be earlier than Validity From Date', 'warning', 'btn-warning');
                    return;
                }
                if (!$scope.LicenseCopy_Preview) {
                    showMsgBox('999', 'Validation', 'Please Select License Copy', 'warning', 'btn-warning');
                    return;
                }
               
            }
            var collectionobj = {};
            collectionobj.Action = 1;
            collectionobj.Id = $scope.Id || 0;
            collectionobj.LoginId = LoginId;
            // License Details
            collectionobj.Site = $scope.Siteid;
            collectionobj.LicenseName = $scope.LicenseName;
            collectionobj.LicenseStatus = $scope.LicenseStatus;
            collectionobj.LicenseDate = $scope.LicenseDate;
            collectionobj.LicenseCopy = $scope.LicenseCopy_Preview;
            collectionobj.AmendentCopy = $scope.AmendentCopy_Preview;
            collectionobj.LicenseNumber = $scope.LicenseNumber;
            collectionobj.LicenseValidFrom = $scope.LicenseValidFrom;
            collectionobj.LicenseValidTo = $scope.LicenseValidTo;
            collectionobj.LicenseCost = $scope.LicenseCost;
            collectionobj.SecurityDepositAmt = $scope.SecurityDepositAmt;

            // Application Details
            collectionobj.ApplicationStatus = $scope.ApplicationStatus;
            collectionobj.ApplicationDate = $scope.ApplicationDate;
            collectionobj.ApplicationCopy = $scope.ApplicationCopy_Preview;
            collectionobj.ChallanCopy = $scope.ChallanCopy_Preview;
            collectionobj.FeesCopy = $scope.FeesCopy_Preview;

            // User Details
            collectionobj.Username = $scope.Username;
            collectionobj.Password = $scope.Password;
            collectionobj.MobileNo = $scope.MobileNo;
            collectionobj.Emailid = $scope.Emailid;
            collectionobj.Remarks = $scope.Remarks;

            var getData = myService.methode('POST', "../Contractor/SaveLicense", JSON.stringify(collectionobj));
            getData.then(function (response) {
                showMsgBox(response.data.Result);
                setTimeout(function () {
                    window.location.reload();
                }, 1500);
            });
        }
    };

    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var maxSize = 3 * 1024 * 1024;
            var allowedExtensions = ['pdf','png', 'jpg', 'jpeg'];

            var extension = file.name.split('.').pop().toLowerCase();
            if (allowedExtensions.indexOf(extension) === -1) {
                swal("Invalid File", "Only PDF, PNG, JPG and JPEG files are allowed.", "error");
                input.value = '';
                return;
            }
            if (file.size > maxSize) {
                swal("File Too Large", "Maximum allowed file size is 3 MB.", "error");
                input.value = '';
                return;
            }
            var fileNameField = fieldName.replace("FilePath", "FileName");
            $scope[fileNameField] = file.name;

            var filerdr = new FileReader();

            filerdr.onload = function (e) {
                $scope[fieldName + "_Preview"] = e.target.result;
                $scope.$applyAsync();
            };

            filerdr.readAsDataURL(file);
        }
    };

};