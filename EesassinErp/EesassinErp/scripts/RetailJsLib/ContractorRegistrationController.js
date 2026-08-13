app.ContractorRegistrationController = function ($scope, $element, $filter, myService, $http) {


    $scope.IsEmailDisabled = false;
    $scope.IsMobileDisabled = false;

    $scope.Email = REmailId;
    $scope.Mobile = ContactNo;

    $scope.IsEmailDisabled = !!$scope.Email;
    $scope.IsMobileDisabled = !!$scope.Mobile;

    $scope.SaveContractor = function () {
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.File4 = $scope.PanFile4_Preview;
            collectionobj.File5 = $scope.GstFile5_Preview;
            collectionobj.File6 = $scope.InFile6_Preview;
            collectionobj.File7 = $scope.ESICFile7_Preview;
            collectionobj.File8 = $scope.LabourFile8_Preview;
            collectionobj.File9 = $scope.CancelFile9_Preview;
            collectionobj.File16 = $scope.PFFile16_Preview;
            collectionobj.File19 = $scope.InsFile19_Preview;

            collectionobj.file22 = $scope.Msmefile22_Preview;
            collectionobj.file23 = $scope.Securityfile23_Preview;
            collectionobj.file24 = $scope.Shopfile24_Preview;
            collectionobj.AgencyName = $scope.AgencyName;
            collectionobj.RegisteredAddress = $scope.RegisteredAddress;
            collectionobj.CorporateAddress = $scope.CorporateAddress;
            collectionobj.ContactPerson = $scope.ContactPerson;
            collectionobj.Designation = $scope.Designation;
            collectionobj.Mobile = $scope.Mobile;
            collectionobj.Email = $scope.Email;
            collectionobj.Website = $scope.Website;
            collectionobj.Year = $scope.YearEstablishment;
            collectionobj.Organization = $scope.Organization;
            collectionobj.EPFREGNO = $scope.EPFREGNO;
            collectionobj.ESICREGNO = $scope.ESICREGNO;
            collectionobj.ProfessionalREGNO = $scope.ProfessionalREGNO;
            collectionobj.LabourREGNO = $scope.LabourREGNO;
            collectionobj.PanNo = $scope.PanNo;
            collectionobj.TAN = $scope.TAN;
            collectionobj.GSTIN = $scope.GSTIN;
            collectionobj.CIN = $scope.CIN;
            collectionobj.SHOPREGI = $scope.SHOPREGI;
            collectionobj.MSME = $scope.MSME;
            collectionobj.Country = $scope.Country;
            collectionobj.State = $scope.State;
            collectionobj.City = $scope.City;
            collectionobj.Pincode = $scope.Pincode;
            collectionobj.Action = 41;

            collectionobj.UserId = LoginId;
            collectionobj.LIN = $scope.LIN;
            collectionobj.Industry = $scope.Industry;

            //$scope.hideLoader();
            //var getData = myService.methode('POST', ("../RetailSection/ContractorRegister"), JSON.stringify(collectionobj));
            //getData.then(function (response) {
            //    if (showMsgBox(response.data.Result)) {
            //        window.location.href = "../Dashboard/ContractorDashboard";
            //    }
            //    $scope.hideLoader();
            //});
            $scope.hideLoader();
            $.ajax({
                url: "../RetailSection/ContractorRegister", type: 'POST',
                data: JSON.stringify(collectionobj),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                success: function (response) {
                    if (showMsgBox(response.data.Result)) {
                        window.location.href = "../Dashboard/ContractorDashboard";
                    }
                    $scope.hideLoader();
                    $scope.$applyAsync();
                },
                error: function (xhr, status, error) {
                    console.error('Error:', xhr.responseText);
                    $scope.hideLoader();
                }
            });
        }
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

    $scope.uploadFile = function (fieldName, input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var maxSize = 3 * 1024 * 1024;
            var allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];

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

    $scope.AllIndustry = function () {
        var getData = myService.methode('POST', ("../Retail/SearchRetailCreateIndustry"), { "Action": 8 });
        getData.then(function (response) {
            $scope.IndustryList = response.data.Result;
        });
    }
}