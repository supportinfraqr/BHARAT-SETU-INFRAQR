app.RetailOneTimeDocumentController = function ($scope, $element, $filter, myService) {

    $scope.AllCountry = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 27 });
        getData.then(function (response) {
            debugger;
            $scope.AllCountryList = response.data.Result;
        });
    }
    $scope.AllState = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 28, "PartyId": $scope.Country });
        getData.then(function (response) {
            debugger;
            $scope.AllStateList = response.data.Result;
        });
    }
    $scope.AllCity = function () {
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 29, "PartyId": $scope.State });
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data.Result;
        });
    }
    $scope.CountPercetageDoc = function () { 
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.ClientId = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchRetailONETIMEDOCUMENT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                $scope.ProfilePercentage = response.data.Result[0].PercentageDoc;
            }
        });
    }
    $scope.AllProfileDetail = function () {
        $scope.Country = "1";
        $scope.AllState();
        var collectionobj = {};
        collectionobj.ActionType = 4;
        collectionobj.ClientId = LoginId; 
        var getData = myService.methode('POST', "../RetailSection/SearchRetailONETIMEDOCUMENT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response)
        {
            if (response.data.Result.length > 0)
            {
            $scope.CompanyName = response.data.Result[0].Name;
            $scope.CompanyEmailId = response.data.Result[0].EmailId;
            $scope.CompanyContactNo = response.data.Result[0].ContactNo;
            $scope.CIN = response.data.Result[0].CIN;
            $scope.Panitno = response.data.Result[0].PAN;
            $scope.Gstinuin = response.data.Result[0].GSTN;
            $scope.Pincode = response.data.Result[0].Pincode;
            //$scope.Country = response.data.Result[0].Country;
            setTimeout(function () {
                $scope.State = response.data.Result[0].State;
                $scope.AllCity();
            }, 100);

            setTimeout(function () {
                $scope.City = response.data.Result[0].City;
            }, 500);
           
          
            $scope.Address = response.data.Result[0].Address;
            $scope.PF = response.data.Result[0].PF;
            $scope.TAN = response.data.Result[0].TAN;
            $scope.Labour = response.data.Result[0].Labour;
            $scope.ProfessionalTaxReg = response.data.Result[0].ProfessionalTaxReg;
            $scope.ISOCERTIFICATE = response.data.Result[0].ISOCERTIFICATE;
           
            $scope.SECERTIFICATE = response.data.Result[0].SECERTIFICATE;
            $scope.MSMECERTIFICATE = response.data.Result[0].MSMECERTIFICATE;
            $scope.SLLCERTIFICATE = response.data.Result[0].SLLCERTIFICATE;
            $scope.CLRACERTIFICATE = response.data.Result[0].CLRACERTIFICATE;
            $scope.ContractCERTIFICATE = response.data.Result[0].ContractCERTIFICATE;
            $scope.InterstateCERTIFICATE = response.data.Result[0].InterstateCERTIFICATE;
            if ($scope.ISOCERTIFICATE == '-1')
            {
                $scope.ISO = 'none';
            }
            else {
                $scope.ISO = 'block'; 
            }
            if ($scope.SECERTIFICATE == '-1') {
                $scope.SEC = 'none';
            }
            else {
                $scope.SEC = 'block';
            }
            if ($scope.MSMECERTIFICATE == '-1') {
                $scope.MSME = 'none';
            }
            else {
                $scope.MSME = 'block';
            }
            if ($scope.SLLCERTIFICATE == '-1') {
                $scope.SLL = 'none';
            }
            else {
                $scope.SLL = 'block';
            }
            if ($scope.CLRACERTIFICATE == '-1') {
                $scope.CLRA = 'none';
            }
            else {
                $scope.CLRA = 'block';
            }
            if ($scope.ContractCERTIFICATE == '-1') {
                $scope.Contract = 'none';
            }
            else {
                $scope.Contract = 'block';
            }
            if ($scope.InterstateCERTIFICATE == '-1') {
                $scope.Interstate = 'none';
            }
            else {
                $scope.Interstate = 'block';
            }


            }
            else {
                $scope.ISOCERTIFICATE = '-1';
                $scope.SECERTIFICATE = '-1';
                $scope.MSMECERTIFICATE = '-1';
                $scope.SLLCERTIFICATE = '-1';
                $scope.CLRACERTIFICATE = '-1';
                $scope.ContractCERTIFICATE = '-1';
                $scope.InterstateCERTIFICATE = '-1';
                    $scope.ISO = 'none'; 
                    $scope.SEC = 'none'; 
                    $scope.MSME = 'none'; 
                    $scope.SLL = 'none'; 
                    $scope.CLRA = 'none'; 
                    $scope.Contract = 'none'; 
                    $scope.Interstate = 'none'; 
            }
        });
    }
    $scope.DownloadWithName = function (DownloadLink, Name) {
        var link = document.createElement('a');
        var extension = '.pdf'
        link.href = DownloadLink;
        link.download = Name + '_' + LoginId+ extension;
        link.click();
        link.remove();
    }
    $scope.getFileIconClass = function (fileModel) {
        if (fileModel == '-1') {
            return fileModel = 'fa fa-plus';;

        }
        else{
            return fileModel = 'fa fa-check-square';;
        }
     

    };


    $scope.getIconClass = function (fileModel) {
        if (fileModel == undefined || fileModel == '-1') {
            return fileModel = 'bi bi-plus-lg';;

        }
        else {
            return fileModel = 'fa fa-check-square';;
        }


    };

    $scope.SaveRecord = function ()
    {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};

            collectionobj.Name = $scope.CompanyName;
            collectionobj.EmailId = $scope.CompanyEmailId;
            collectionobj.ContactNo = $scope.CompanyContactNo;
            collectionobj.CIN = $scope.CIN;
            collectionobj.TAN = $scope.TAN;
            collectionobj.Panitno = $scope.Panitno;
            collectionobj.Gstinuin = $scope.Gstinuin;
            collectionobj.Pincode = $scope.Pincode;
            collectionobj.CountryId = $scope.Country;
            collectionobj.StateId = $scope.State;
            collectionobj.CityId = $scope.City;
            collectionobj.Address = $scope.Address;
            collectionobj.PF = $scope.PF;
            collectionobj.Labour = $scope.Labour;
            collectionobj.ProfessionalTaxReg = $scope.ProfessionalTaxReg; 
            collectionobj.ClientId = LoginId;
            collectionobj.ActionType = 1;
            var getData = myService.methode('POST', ("../RetailSection/RetailONETIMEDOCUMENT"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.AllProfileDetail();
                }
            });
        }
    }
    $scope.AddDocshow = function (input, FileName) {
        $scope.FileName = FileName;
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.File = e.target.result;
                $scope.UpdateDocument();
                $scope.$applyAsync();
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync();
            $(imgfileid).attr('src', '');
            $(imgfileid).attr('value', '');
        }
    }
    $scope.UpdateDocument = function () {
        debugger;
       
            $scope.showLoader();
            var collectionobj = {}; 
            collectionobj.File = $scope.File;
            collectionobj.FileName = $scope.FileName;
            collectionobj.ClientId = LoginId;
            collectionobj.ActionType = 2;
            var getData = myService.methode('POST', ("../RetailSection/RetailONETIMEDOCUMENT"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.AllProfileDetail();
                }
            }); 
    }
 


}