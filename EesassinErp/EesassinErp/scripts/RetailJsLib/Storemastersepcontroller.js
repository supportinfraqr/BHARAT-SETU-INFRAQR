var myLoginApp = angular.module('myLoginApp', []);

myLoginApp.service("myLoginService", function ($http) {

    this.methode = function (methodType, virtualUrl, dataList) {

        var response = $http({
            method: methodType,
            url: virtualUrl,
            data: dataList,
            contentType: 'application/json; charset=utf-8',
            datatype: 'json'
        });

        return response;
    };
});
myLoginApp.controller('myLoginController', ['$scope', '$element', '$filter', '$sce', '$timeout', 'myLoginService',
    function ($scope, $element, $filter, $sce, $timeout, myLoginService) {
       
        $scope.SaveFile = function (base64String, DocumentId) {
            if (!base64String) {
                alert("Please select a file to upload.");
                return;
            }
            if (!base64String.startsWith("data:application/pdf")) {
                alert("Only PDF files are allowed!");
                return;
            }

            function base64ToBlob(base64, mimeType) {
                let byteCharacters = atob(base64.split(',')[1]);
                let byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                let byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: mimeType });
            }

            let file = base64ToBlob(base64String, "application/pdf");

            var formData = new FormData();
            formData.append("file", file, "document.pdf");  // ✅ Correct Name and Filename
            formData.append("Id", DocumentId);
            formData.append("StoreId", $scope.StoreId);
            formData.append("LicenseId", $scope.LicenseId);
            formData.append("ActionType", 7);
            console.log("Uploading file...", formData);
            console.log("Uploading file...", formData.get("file"));
            $.ajax({
                url: "../RetailSection/UploadDoc",
                type: "POST",
                data: formData,
                contentType: false,  // ✅ Important
                processData: false,  // ✅ Important
                cache: false,
                success: function (response) {
                    console.log("File Uploaded Successfully", response);
                    $scope.SHOWDOCUMENT($scope._TId, $scope._LicenseId, 0);
                },
                error: function (error) {
                    console.error("File Upload Error", error);
                }
            });
        };

        $scope.show = function (input, imgfileid) {
            if (input.files && input.files[0]) {
                var filerdr = new FileReader();
                filerdr.onload = function (e) {
                    $scope._RequiredDocuemntList[Index].DocumentLink = e.target.result;
                    $scope.SaveFile($scope._RequiredDocuemntList[Index].DocumentLink, $scope._RequiredDocuemntList[Index].DocumentId)
                    $scope.$applyAsync();
                    $(imgfileid).attr('src', e.target.result);
                    $(imgfileid).attr('value', e.target.result);
                }
                filerdr.readAsDataURL(input.files[0]);
            }
            else {
                $scope.Image = '';
                $scope.$applyAsync();
                $(imgfileid).attr('src', '');
                $(imgfileid).attr('value', '');
            }
        };
        $scope.verifylink = function () {
            var collectionobj = {};
            collectionobj.StoreId = $scope.Id;
            collectionobj.ActionType = 10;
            var getData = myLoginService.methode('POST', "../RetailSection/oldUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (response.data.Result == '1')
                {  $scope.Isvalid = 1;  }
                else { $scope.Isvalid = 0; alert('LINK HAS BEEN EXPIRED , CONTACT TO ADMIN'); window.top.location.href = '../Login/Login';}
            });
        }
        $scope.Addvalue = function () {
            var collectionobj = {};
            collectionobj.Id = $scope.SCode;
            collectionobj.ActionType = 16;
            var getData = myLoginService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response)
            {
                if (response.data.Result.length > 0) {
                    $scope.SAddress = response.data.Result[0].CompleteAddress
                    $scope.NameUser = response.data.Result[0].Username
                }
            });
        }
        $scope.SHOWDOCUMENT = function (Id, _LicenseId, TId) {
          
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Id = Id;
            collectionobj.ActionType = 4;
            collectionobj.LicenseId = $scope.LicenseId;
            collectionobj.StoreId = $scope.StoreId;
            collectionobj.LoginId = $scope.LoginId;
            var getData = myLoginService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                debugger;
                $scope._RequiredDocuemntList = response.data.Result.Table1;

                $scope.hideLoader();
            });
            $scope.hideLoader();
        }

        $scope.GetLoad = function () {
          
            debugger; 

            const queryString = window.location.search.substring(1);

            // ✅ Step 2: Decode the URL-encoded string
            const decodedURL = decodeURIComponent(queryString);
            console.log("Decoded URL:", decodedURL);

            // ✅ Step 3: Split the decoded string by '|'
            const splitValue = decodedURL.split('|');

            // ✅ Step 4: Assign values safely
            $scope.Id = splitValue[0] || 0;
            $scope.LicenseId = splitValue[1] || "";
            $scope.StoreId = splitValue[2] || "";
            $scope.LoginId = splitValue[3] || "";
            $scope.SCode = splitValue[4] || "";
            $scope.LicenseName = splitValue[5] || "";
            $scope.Addvalue();
            $scope.verifylink();
         
            $scope.PermissionForSection(splitValue[1]);
            $scope.ShowStoreMasterDocForm(splitValue[0], splitValue[1], splitValue[2])
        }
        $scope.showLoader = function () {
            $('#cover-spin').show(0);
        };

        $scope.hideLoader = function () {
            $('#cover-spin').hide();
        };
        $scope.SetValue = function (ID, fuCandidatePhoto) {
            Index = ID;
            $(fuCandidatePhoto).click();

        }
        $scope.PermissionForSection = function (Id) { 
                $scope.showLoader();
                $scope.Section1 = 'notok'
                $scope.Section2 = 'notok';
                $scope.Section3 = 'notok';
                var collectionobj = {};
                collectionobj.ActionType = 8;
                collectionobj.LicenseId = Id;
            collectionobj.LoginId = $scope.LoginId ;
            var getData = myLoginService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
                getData.then(function (response) {
                    debugger;
                    $scope.IsSessionOpen = response.data.Result.Table[0].PermissionId;
                    if ($scope.IsSessionOpen == "1") {
                        $scope.Section1 = 'ok';
                    }
                    else if ($scope.IsSessionOpen == "2") {
                        $scope.Section2 = 'ok';
                    }
                    else if ($scope.IsSessionOpen == "3") {
                        $scope.Section3 = 'ok';
                    }
                    else if ($scope.IsSessionOpen == "23") {
                        $scope.Section2 = 'ok';
                        $scope.Section3 = 'ok';
                    }
                    else if ($scope.IsSessionOpen == "123") {
                        $scope.Section1 = 'ok';
                        $scope.Section2 = 'ok';
                        $scope.Section3 = 'ok';
                    }
                    else if ($scope.IsSessionOpen == "13") {
                        $scope.Section1 = 'ok';
                        $scope.Section3 = 'ok';
                    }
                    else if ($scope.IsSessionOpen == "12") {
                        $scope.Section1 = 'ok';
                        $scope.Section2 = 'ok';
                    }
                    else {
                        $scope.IsSessionOpen = 'notok';
                    }
                    $scope.hideLoader();
                });
                $scope.hideLoader();
        }


        $scope.ShowStoreMasterDocForm = function (Id, LicenseId, StoreId) {
         
            $scope.showLoader();
            var collectionobj = {};
            collectionobj.Id = Id;
            collectionobj.ActionType = 4;
            collectionobj.LicenseId = LicenseId;
            collectionobj.StoreId = StoreId;
            collectionobj.LoginId = $scope.LoginId;
            var getData = myLoginService.methode('POST', ("../RetailSection/GetStoreDocumentDetails"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                debugger;
                $scope._RequiredDocuemntList = response.data.Result.Table1;
                if (response.data.Result.Table.length > 0) {
                    $scope.StoreDocumentDetailsList = response.data.Result.Table[0];
                    $scope.Id = response.data.Result.Table[0].Id;
                    $scope.StoreCode = response.data.Result.Table[0]._StoreId;
                    $scope.RefStoreCode = response.data.Result.Table[0].RefStoreCode;
                    $scope.DName = response.data.Result.Table[0].Dire_Name;
                    $scope.DFatherName = response.data.Result.Table[0].Dire_FatherName;
                    $scope.DAddress = response.data.Result.Table[0].Dire_Address;
                    $scope.DAadhaarNo = response.data.Result.Table[0].Dire_AadhaarNo;
                    $scope.DPanNo = response.data.Result.Table[0].Dire_PanNo;
                    if (response.data.Result.Table[0].Dire_DateOfBirth == null) {
                        $scope.DDateOfBirth = "";
                    }
                    else {
                        $scope.DDateOfBirth = new Date(response.data.Result.Table[0].Dire_DateOfBirth);
                    }
                    $scope.DEmailId = response.data.Result.Table[0].Dire_EmailId;
                    $scope.DMobileNo = response.data.Result.Table[0].Dire_MobileNo;
                    $scope.AName = response.data.Result.Table[0].Auth_Name;
                    $scope.AFatherName = response.data.Result.Table[0].Auth_FatherName;
                    $scope.AAddress = response.data.Result.Table[0].Auth_Address;
                    $scope.AAadhaarNo = response.data.Result.Table[0].Auth_AadhaarNo;
                    $scope.APanNo = response.data.Result.Table[0].Auth_PanNo;
                    if (response.data.Result.Table[0].Auth_DateOfBirth == null) {
                        $scope.ADateOfBirth = "";
                    }
                    else {
                        $scope.ADateOfBirth = new Date(response.data.Result.Table[0].Auth_DateOfBirth);
                    }

                    $scope.AEmailId = response.data.Result.Table[0].Auth_EmailId;
                    $scope.AMobileNo = response.data.Result.Table[0].Auth_MobileNo;
                    $scope.NatureofBusiness = response.data.Result.Table[0].NatureofBusiness;

                    if (response.data.Result.Table[0].DateofCommencement == null) {
                        $scope.DateofCommencement = "";
                    }
                    else {
                        $scope.DateofCommencement = new Date(response.data.Result.Table[0].DateofCommencement);
                    }

                    $scope.ProductCategory = response.data.Result.Table[0].ProductCategory;
                    $scope.AadhaarRegisteredofficeAddressNo = response.data.Result.Table[0].AadhaarRegisteredofficeAddressNo;
                    $scope.AadhaarCardofDirector = response.data.Result.Table[0].AadhaarCardofDirector;
                    $scope.PANCardofDirector = response.data.Result.Table[0].PANCardofDirector
                    $scope.PassportSizePhoto1 = response.data.Result.Table[0].PassportSizePhoto1;
                    $scope.AuthorizationLetter = response.data.Result.Table[0].AuthorizationLetter;
                    $scope.AadhaarCardofAuthorized = response.data.Result.Table[0].AadhaarCardofAuthorized;
                    $scope.PANCard = response.data.Result.Table[0].PANCard;
                    $scope.PassportSizePhoto2 = response.data.Result.Table[0].PassportSizePhoto2;
                    $scope.ElectricityBill = response.data.Result.Table[0].ElectricityBill;
                    $scope.SaledeedRentAgreement = response.data.Result.Table[0].SaledeedRentAgreement;
                    $scope.FSMSPlan = response.data.Result.Table[0].FSMSPlan;
                    $scope.FormIX = response.data.Result.Table[0].FormIX;
                    $scope.WaterTestReport = response.data.Result.Table[0].WaterTestReport;
                    $scope.Status = response.data.Result.Table[0].Status;
                }
                $scope.hideLoader();
            });
            $scope.hideLoader();
            $scope.permissgrant = true;
        }

     

        $scope.SubmitStoreDocumentDetails = function ()
        {
            var collectionobj = {};
            collectionobj.StoreId = $scope.Id;
            collectionobj.ActionType = 10;
            var getData = myLoginService.methode('POST', "../RetailSection/oldUploadDoc", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (response.data.Result == '1')
                {
                    $scope.Isvalid = 1;
                    var formData = new FormData();
                    formData.append("Id", $scope.Id);
                    formData.append("ActionType", 2);
                    formData.append("StoreId", $scope.StoreId);
                    formData.append("LoginId", $scope.LoginId);
                    formData.append("LicenseId", $scope.LicenseId);
                    formData.append("DName", $scope.DName);
                    formData.append("DFatherName", $scope.DFatherName);
                    formData.append("DAddress", $scope.DAddress);
                    formData.append("DAadhaarNo", $scope.DAadhaarNo);
                    formData.append("DPanNo", $scope.DPanNo);
                    if ($scope.DDateOfBirth == '' || $scope.DDateOfBirth === undefined) {
                        formData.append("DDateOfBirth", '1900-01-01');
                    }
                    else {
                        formData.append("DDateOfBirth", $scope.DDateOfBirth.toISOString());
                    }


                    formData.append("DEmailId", $scope.DEmailId);
                    formData.append("DMobileNo", $scope.DMobileNo);
                    formData.append("AName", $scope.AName);
                    formData.append("AFatherName", $scope.AFatherName);
                    formData.append("AAddress", $scope.AAddress);
                    formData.append("AAadhaarNo", $scope.AAadhaarNo);
                    formData.append("APanNo", $scope.APanNo);
                    if ($scope.ADateOfBirth == '' || $scope.ADateOfBirth === undefined) {
                        formData.append("ADateOfBirth", '1900-01-01');
                    }
                    else {
                        formData.append("ADateOfBirth", $scope.ADateOfBirth.toISOString());
                    }

                    formData.append("AEmailId", $scope.AEmailId);
                    formData.append("AMobileNo", $scope.AMobileNo);
                    formData.append("NatureofBusiness", $scope.NatureofBusiness);
                    if ($scope.DateofCommencement == '' || $scope.DateofCommencement === undefined) {
                        formData.append("DateofCommencement", '1900-01-01');
                    }
                    else {
                        formData.append("DateofCommencement", $scope.DateofCommencement.toISOString());
                    }

                    formData.append("ProductCategory", $scope.ProductCategory);
                    formData.append("AadhaarRegisteredofficeAddressNo", $scope.AadhaarRegisteredofficeAddressNo);
                    formData.append("AadhaarCardofDirector", $scope.AadhaarCardofDirector);
                    formData.append("PANCardofDirector", $scope.PANCardofDirector);
                    formData.append("PassportSizePhoto1", $scope.PassportSizePhoto1);
                    formData.append("AuthorizationLetter", $scope.AuthorizationLetter);
                    formData.append("AadhaarCardofAuthorized", $scope.AadhaarCardofAuthorized);
                    formData.append("PANCard", $scope.PANCard);
                    formData.append("PassportSizePhoto2", $scope.PassportSizePhoto2);
                    formData.append("ElectricityBill", $scope.ElectricityBill);
                    formData.append("SaledeedRentAgreement", $scope.SaledeedRentAgreement);
                    formData.append("FSMSPlan", $scope.FSMSPlan);
                    formData.append("FormIX", $scope.FormIX);
                    formData.append("WaterTestReport", $scope.WaterTestReport);
                    formData.append("IsActive", 0);
                    $.ajax({
                        url: "../RetailSection/InsertUpdateDelStoreDocumentMaster",
                        type: 'POST',
                        data: formData,
                        cache: false,
                        contentType: false,
                        processData: false,
                        success: function (response) {
                            var data = JSON.parse(response);
                            if (showMsgBox('999', 'Save', 'Save Successfully', 'success', 'btn-success')) {
                                $scope.iremail();
                            }
                        },
                        error: function (xhr, status, error) {
                            console.error("Error saving data: " + error);
                        }
                    });


                }
                else { $scope.Isvalid = 0; alert('LINK HAS BEEN EXPIRED , CONTACT TO ADMIN'); window.top.location.href = '../Login/Login'; }
            });
           
        }


        $scope.isSubmitting = false;

        $scope.permissgrant = false;

        $scope.submitEmail = function () {

            function validateEmail() {
                var semail = $scope.Athoriseemail;

                // ✅ Blank email allowed
                if (!semail || semail.trim() === "") {
                    document.getElementById("errEmail").style.display = "none";
                    return true;
                }

                // ✅ Validate only if email entered
                var filter = /^[\w-\.]+@([\w-]+\.)+[a-zA-Z]{2,4}$/;

                if (!filter.test(semail)) {
                    document.getElementById("errEmail").style.display = "block";
                    return false;
                }

                document.getElementById("errEmail").style.display = "none";
                return true;
            }

            // 🔴 Only invalid format blocks submit
            if (!validateEmail()) {
                return;
            }

            $scope.isSubmitting = true;

            var collectionobj = {
                Action: 7,
                ClientId: $scope.Athoriseemail || "", // blank allowed
                Id: $scope.StoreId,
                StoreCode : $scope.LicenseId
            };

            var getData = myLoginService.methode(
                'POST',
                "../SendEmail/SendEmail",
                '{obj:' + JSON.stringify(collectionobj) + '}'
            );

            getData.then(function () {

                document.getElementById("emailModal").style.display = "none";
                $scope.isSubmitting = false;

            }, function () {

                $scope.isSubmitting = false;
                alert("Something went wrong. Please try again.");
            });
        };



    }
]);

