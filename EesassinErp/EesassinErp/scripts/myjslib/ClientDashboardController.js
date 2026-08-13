app.ClientDashboardController = function ($scope, $element, $filter, myService) {

    $scope.Isopen = false;

    $scope.SetTextbox = function (SINVOICENO, ClientId, VendorCId) {
        $scope.InvoiceNo = SINVOICENO;
        $scope.ClientId = ClientId;
        $scope.VendorCId = VendorCId;
        $scope.Isopen = false;
    }

    $scope.IsopenClose = function () {
        $scope.Isopen = false;
    }
    $scope.CLSearchInvoice = function () {
        var collectionobj = {};
        collectionobj.Action = 40;
        collectionobj.Updatedby = MapId;
        collectionobj.Id = $scope.InvoiceNo;
        collectionobj.AuditorId = $scope.ClientId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.ListOfInvoice = response.data
                $scope.Isopen = true;
            }
            else {
                $scope.ListOfInvoice = 'No Record Found';
            }

        });
    }
    $scope.BindClientInvoiceStatus = function () {
        var AuditorId = $scope.AuditorId;
        var VendorId = $scope.VendorId;
        
        var collectionobj = {};
        collectionobj.Action = 25;
        collectionobj.Updatedby = MapId;
        collectionobj.AuditorId = $scope.AuditorId;
        collectionobj.VendorId = $scope.VendorId;
     
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AllDraftCount = response.data[0].Draft;
                $scope.AllPendingCount = response.data[0].Pending;
                $scope.AllCompleteCount = response.data[0].Complete;
                $scope.AllDraftAmount = response.data[0].DraftAmount;
                $scope.AllPendingAmount = response.data[0].PendingAmount;
                $scope.AllCompleteAmount = response.data[0].CompleteAmount;
           

                $scope.ValidCount = response.data[0].ValidCount;
                $scope.ValidAmount = response.data[0].ValidAmount;
                
                    $scope.LoadGraph();
                
            }
            else
            {
                $scope.ValidCount = '0';
                $scope.ValidAmount = '0';
                $scope.AllDraftCount = '0';
                $scope.AllPendingCount =   '0';
                $scope.AllCompleteCount   = '0';
                $scope.AllDraftAmount =    '0';
                $scope.AllPendingAmount   = '0';
                $scope.AllCompleteAmount  = '0';
            }

        });
    };
    $scope.LoadGraph = function () { 
        var collectionobj = {};
        collectionobj.Action = 26;
        collectionobj.Updatedby = MapId;
        collectionobj.AuditorId = $scope.AuditorId;
        collectionobj.VendorId = $scope.VendorId; 
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0)
            {
                var DraftPer = '0';
                var PendingPer = '0';
                var CompletePer = '0';
                var ValidPer = '0';

                var DraftPer = response.data[0].DraftPer;
                var PendingPer = response.data[0].PendingPer;
                var CompletePer = response.data[0].CompletePer;
                var ValidPer = response.data[0].ValidPer;
            }
            else{
                var DraftPer = '0';
                var PendingPer = '0';
                var CompletePer = '0';
                var ValidPer = '0';
            }      
            var r = document.querySelector(':root');
            var rc = getComputedStyle(r);
            
            document.getElementById("g5").innerHTML = "";
            document.getElementById("g2").innerHTML = "";
            document.getElementById("g3").innerHTML = "";
            document.getElementById("g4").innerHTML = "";

            
              g5 = new JustGage({
                id: 'g5',
                value: CompletePer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: false,
                relativeGaugeSize: true

            });
            var g3 = new JustGage({
                id: 'g3',
                value: PendingPer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: true,
                relativeGaugeSize: true

            });
            var g2 = new JustGage({
                id: 'g2',
                value: DraftPer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: true,
                relativeGaugeSize: true

            });
            var g4 = new JustGage({
                id: 'g4',
                value: ValidPer,
                min: 0,
                max: 100,
                symbol: '%',
                pointer: true,
                donut: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#f14fa4',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                customSectors: [{
                    color: "#ff0000",
                    lo: 50,
                    hi: 100
                }, {
                    color: "#f14fa4",
                    lo: 0,
                    hi: 50
                }],
                gaugeWidthScale: 0.6,
                counter: true,
                relativeGaugeSize: true

            });
        }); 
    };
   
    $scope.BindVendor = function () {
        var collectionobj = {};
        collectionobj.Action = 31;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.VendorList = response.data
            }

        });
    };
    $scope.BindAuditor= function () {
        var collectionobj = {};
        collectionobj.Action = 32;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AuditorList = response.data
            }

        });
    };
    $scope.BindAuditorCompliance = function () {
        var collectionobj = {};
        collectionobj.Action = 27;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AuditorCompliance = response.data
            }  

        });
    };
    $scope.BindIndiviualAuditorCompliance = function () {
        var collectionobj = {};
        collectionobj.Action = 41;
        collectionobj.Updatedby = MapId;
        collectionobj.VendorId = $scope.AVendorId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AuditorCompliance = response.data
            }
            else {
                $scope.AuditorCompliance = "";
            }

        });
    };

    
    $scope.BindDashBoardInvoice = function () {
        var collectionobj = {};
        collectionobj.Action = 28;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.DashBoardInvoice = response.data;
        });
    }
    $scope.HighlightsExpire = function () {
        var collectionobj = {};
        collectionobj.Action = 29;
        collectionobj.Updatedby = MapId;
        collectionobj.VendorId = LoginId;
        var getData = myService.methode('POST', ("../Communication/GetCommunication"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.length > 0) {
                $scope.ListOnetimeDocument = response.data;

            }
        });
    }
    $scope.PendingDocExpire = function () {
        var collectionobj = {};
        collectionobj.Action = 48;
        collectionobj.Updatedby = MapId;
        collectionobj.VendorId = LoginId;
        var getData = myService.methode('POST', ("../Communication/GetCommunication"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            if (response.data.length > 0) {
                $scope.PendingDocList = response.data;

            }
        });
    }
}