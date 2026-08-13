app.EnitfyController = function ($scope, $element, $filter, myService) {

     

    $scope.BindList = function () {
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchEntify", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.EntityList = response.data;

            if ($scope.EntityList.length > 0) {
                var data = $scope.EntityList[0];

                // Entity Details
                $scope.EntityType = data.EntityType;
                $scope.ListedCompany = data.ListedCompany;
                $scope.ListedStatus = data.ListedStatus;
                $scope.StockExchange = data.StockExchange;
                $scope.FundingStatus = data.FundingStatus;
                $scope.FundingType = data.FundingType;

                $scope.Turnover = data.Turnover;
                $scope.NetProfit = data.NetProfit;
                $scope.Borrowing = data.Borrowing;
                $scope.AuthorizedShareCap = data.AuthorizedShareCap;
                $scope.IssuedShareCap = data.IssuedShareCap;
                $scope.PaidupCap = data.PaidupCap;
                $scope.AverageNetProfit = data.AverageNetProfit;

                $scope.HoldingSubsidiary = data.HoldingSubsidiary;
                $scope.NBFCRegisterd = data.NBFCRegisterd;
                $scope.RBIRegistered = data.RBIRegistered;
                $scope.Startup = data.Startup;
                $scope.MSMERegistered = data.MSMERegistered;
                $scope.RegisteredunderGST = data.RegisteredunderGST;

                // Company Structure & Identification
                $scope.CIN = data.CIN;
                $scope.PAN = data.PAN;
                $scope.TAN = data.TAN;
                $scope.IncorporationDate = data.IncorporationDate ? new Date(data.IncorporationDate) : null;
                $scope.RegisteredState = data.RegisteredState;
                $scope.NICCode = data.NICCode;
                $scope.FinancialYearEnd = data.FinancialYearEnd;
                $scope.openListedcompany();
                $scope.openfunding();
                // Director / KMP Details
                $scope.ResidentDirector = data.ResidentDirector;
                $scope.IndependentDirectors = data.IndependentDirectors;
                $scope.WomenDirector = data.WomenDirector;
                $scope.CSAppointed = data.CSAppointed;
                $scope.KMPAppointed = data.KMPAppointed;
            }
        });
    };
    $scope.Iopencompany = false;
    $scope.openListedcompany = function () {
        if ($scope.EntityType == 'Public Limited Company') {
            $scope.Iopencompany = true;
        }
        else { $scope.Iopencompany = false; }
    }

    $scope.isfundiung = false;

    $scope.openfunding = function () {
        if ($scope.FundingStatus == 'Yes') {
            $scope.isfundiung = true;
        }
        else { $scope.isfundiung = false; }
    }


    $scope.SaveRecord = function () {
        debugger;
        if (isValidate()) {
            $scope.showLoader();
            var collectionobj = {};

            // System Info
            collectionobj.userid = LoginId; 
            // Entity Details
            collectionobj.EntityType = $scope.EntityType;
            collectionobj.ListedCompany = $scope.ListedCompany;
            collectionobj.ListedStatus = $scope.ListedStatus;
            collectionobj.StockExchange = $scope.StockExchange;
            collectionobj.FundingStatus = $scope.FundingStatus;
            collectionobj.FundingType = $scope.FundingType;

            collectionobj.Turnover = $scope.Turnover;
            collectionobj.NetProfit = $scope.NetProfit;
            collectionobj.Borrowing = $scope.Borrowing;
            collectionobj.AuthorizedShareCap = $scope.AuthorizedShareCap;
            collectionobj.IssuedShareCap = $scope.IssuedShareCap;
            collectionobj.PaidupCap = $scope.PaidupCap;
            collectionobj.AverageNetProfit = $scope.AverageNetProfit;

            collectionobj.HoldingSubsidiary = $scope.HoldingSubsidiary;
            collectionobj.NBFCRegisterd = $scope.NBFCRegisterd;
            collectionobj.RBIRegistered = $scope.RBIRegistered;
            collectionobj.Startup = $scope.Startup;
            collectionobj.MSMERegistered = $scope.MSMERegistered;
            collectionobj.RegisteredunderGST = $scope.RegisteredunderGST;

            // Company Structure & Identification
            collectionobj.CIN = $scope.CIN;
            collectionobj.PAN = $scope.PAN;
            collectionobj.TAN = $scope.TAN;
            collectionobj.IncorporationDate = $scope.IncorporationDate;
            collectionobj.RegisteredState = $scope.RegisteredState;
            collectionobj.NICCode = $scope.NICCode;
            collectionobj.FinancialYearEnd = $scope.FinancialYearEnd;

            // Director / KMP Details
            collectionobj.ResidentDirector = $scope.ResidentDirector;
            collectionobj.IndependentDirectors = $scope.IndependentDirectors;
            collectionobj.WomenDirector = $scope.WomenDirector;
            collectionobj.CSAppointed = $scope.CSAppointed;
            collectionobj.KMPAppointed = $scope.KMPAppointed;
            collectionobj.Action = 1;  
            var getData = myService.methode('POST', ("../Retail/InsertUpdateDelEntify"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                if (showMsgBox(response.data.Result)) {
                    $scope.BindList();
                }
            });
        }
    };







}