app.LCDashboard = function ($scope, $element, $filter, myService) {
    $scope.LicenceS = "";
    $scope.InvoiceSt = "";

    $scope.isRefreshing = false;

    $scope.RefreshRegions = function () {
        $scope.isRefreshing = true; // Start rotation
        $scope.RegionId = "";
        $scope.FilterGraph();
        $scope.GetRegion(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshing = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };
    $scope.RefreshStatus = function () {
        $scope.isRefreshingS = true; // Start rotation
        $scope.DocStatus = "";
        $scope.FilterGraph();
        $scope.GetDocumentStatus(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingS = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };
    $scope.RefreshLicenceStatus = function () {
        $scope.isRefreshingL = true; // Start rotation
        $scope.LicenceStatus = "";
        $scope.BindLicenceStatus(); // Call the function to refresh regions
        $scope.FilterGraph();
        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $(".LicenceStatus.bg-light1").removeClass("bg-light1");
            $scope.isRefreshingL = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };

    $scope.RefreshExpirystatus = function () {
        $scope.isRefreshinges = true; // Start rotation
        $scope.ExpiryStatus = "";
        $scope.FilterGraph();

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $(".Expirystatus.bg-light1").removeClass("bg-light1");
            $scope.isRefreshinges = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };


    $scope.RefreshFreshRenewalStatus = function () {
        $scope.isRefreshingFR = true; // Start rotation
        $scope.LicenceType = "";
        $scope.FilterGraph();
        $scope.BindLicenceType(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingFR = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };

    $scope.RefreshClient = function () {
        $scope.isRefreshingc = true; // Start rotation
        $scope.Client = "";
        $scope.FilterGraph();
        $scope.BindClientList(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingc = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };



    $scope.RefreshInvoiceStatus = function () {
        $scope.isRefreshingIS = true; // Start rotation
        $scope.InvoiceStatus = "";
        $scope.FilterGraph();
        $scope.BindInvoiceStatus(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingIS = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };



    $scope.RefreshPaymentStatus = function () {
        $scope.isRefreshingps = true; // Start rotation
        $scope.PaymentStatus = "";
        $scope.FilterGraph();
        $scope.GetPaymentStatus(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingps = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };




    $scope.RefreshOutlet = function () {
        $scope.isRefreshingon = true; // Start rotation

        $scope.Store = "";
        $scope.FilterGraph();
        $scope.BindStore(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingon = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };



    $scope.RefreshState = function () {
        $scope.isRefreshingS = true; // Start rotation
        $scope.State = "";
        $scope.FilterGraph();
        $scope.BindState(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingS = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed
    };


    $scope.RefreshLicence = function () {
        $scope.isRefreshingtl = true; // Start rotation

        $scope.License = "";
        $scope.FilterGraph();
        $scope.BindLicence(); // Call the function to refresh regions

        // Simulate a delay for the refreshing process
        setTimeout(() => {
            $scope.isRefreshingtl = false; // Stop rotation after completion
            $scope.$apply(); // Update the view
        }, 100); // Adjust delay as needed

        $scope.RefreshAddress = function () {
            $scope.isRefreshingA = true; // Start rotation
            $scope.Address = "";
            $scope.FilterGraph();
            $scope.BindAddress(); // Call the function to refresh regions

            // Simulate a delay for the refreshing process
            setTimeout(() => {
                $scope.isRefreshingA = false; // Stop rotation after completion
                $scope.$apply(); // Update the view
            }, 100); // Adjust delay as needed
        };
    };




    $scope.GetRegion = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 2;

        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;

        //-----------------Add filter------------

        collectionobj.RegionId = $scope.RegionId;
        collectionobj.DocStatus = $scope.DocStatus;
        collectionobj.LicenceStatus = $scope.LicenceStatus;
        collectionobj.ExpiryStatus = $scope.ExpiryStatus;
        collectionobj.LicenceType = $scope.LicenceType;
        collectionobj.Client = $scope.Client;
        collectionobj.InvoiceStatus = $scope.InvoiceStatus;
        collectionobj.PaymentStatus = $scope.PaymentStatus;
        collectionobj.Store = $scope.Store;
        collectionobj.State = $scope.State;
        collectionobj.Address = $scope.Address;
        collectionobj.License = $scope.License;

        //---------------end filter------------------
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.RegionList = response.data.Result;
            $scope.hideLoader();
        });
    };



    $scope.GetDocumentStatus = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 4;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.DocumentListSatus = response.data.Result;
            $scope.hideLoader();
        });
    };


    $scope.GetPaymentStatus = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.PaymentList = response.data.Result;
            $scope.hideLoader();
        });
    };
    $scope.BindLicenceStatus = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LicenceStatus = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindLicenceType = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LicenseTypeList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindAddress = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.AddressList = response.data.Result;
            $scope.hideLoader();
        });

    }
    $scope.BindClientList = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.ClientList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindInvoiceStatus = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.InvoiceStatusList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindStore = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LoginAs = $scope.LoginAs;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StoreLList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindState = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.LoginAs = $scope.LoginAs;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.StateList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindLicence = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 11;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LicenceList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.FilterLIst = [];
    stringbuilder = "";
    seprator = "";
    $scope.SetRegion = function (RegionId) {
        $scope.dvRegion = 1;
        $scope.RegionId = RegionId;
        $scope.FilterGraph();

    }
    $scope.SetDocStatus = function (Status) {
        $scope.dvStatus = 1;

        $scope.DocStatus = Status;
        $scope.FilterGraph();
    }

    $scope.SetLicenceStatus = function (LicenceStatus) {

        $scope.dvLicenceStatus = 1;
        $scope.LicenceStatus = LicenceStatus;
        $scope.FilterGraph();
    }
    $scope.SetLicenceApplicable = function (LicenceApplicable) {

        $scope.dvLicenceApplicable = 1;
        $scope.LicenceApplicable = LicenceApplicable;
        $scope.FilterGraph();
    }
    $scope.SetExpiryStatus = function (ExpiryStatus) {

        $scope.dvExpiryStatus = 1;
        $scope.ExpiryStatus = ExpiryStatus;
        $scope.FilterGraph();
    }

    $scope.SetLicenceType = function (LicenceType) {

        $scope.dvFreshRenewal = 1;
        $scope.LicenceType = LicenceType;
        $scope.FilterGraph();
    }
    $scope.SetClient = function (Client) {


        $scope.dvClient = 1;

        $scope.Client = Client;
        $scope.FilterGraph();
    }
    $scope.SetInvoiceStatus = function (InvoiceStatus) {

        $scope.dvInvoice = 1;

        $scope.InvoiceStatus = InvoiceStatus;
        $scope.FilterGraph();
    }
    $scope.SetPaymentStatus = function (PaymentStatus) {


        $scope.dvPayment = 1;

        $scope.PaymentStatus = PaymentStatus;
        $scope.FilterGraph();
    }
    $scope.SetStore = function (Store) {

        $scope.dvOutlet = 1;

        $scope.Store = Store;
        $scope.FilterGraph();
    }
    $scope.SetState = function (State) {

        $scope.dvState = 1;

        $scope.State = State;
        $scope.FilterGraph();
    }
    $scope.SetAddress = function (Address) {

        $scope.dvAddress = 1;
        $scope.Address = Address;
        $scope.FilterGraph();
    }
    $scope.SetLicense = function (License) {

        $scope.dvLicenceType = 1;
        $scope.License = License;
        $scope.FilterGraph();
    }
    $scope.Reset = function () {
        $('.badge').removeClass('bg-light1');
        $scope.dvLicenceApplicable = "";
        $scope.LicenceApplicable = "";
        $scope.RegionId = "";
        $scope.DocStatus = "";
        $scope.LicenceStatus = "";
        $scope.ExpiryStatus = "";
        $scope.LicenceType = "";
        $scope.Client = "";
        $scope.InvoiceStatus = "";
        $scope.PaymentStatus = "";
        $scope.Store = "";
        $scope.State = "";
        $scope.Address = "";
        $scope.License = "";
        $scope.dvRegion = "";
        $scope.dvOutlet = "";
        $scope.dvStatus = "";
        $scope.dvLicenceStatus = "";
        $scope.dvAddress = "";
        $scope.dvState = "";
        $scope.dvPayment = "";
        $scope.dvInvoice = "";
        $scope.dvClient = "";
        $scope.dvLicenceType = "";
        $scope.dvExpiryStatus = "";
        $scope.dvFreshRenewal = "";
        $scope.FilterGraph();
    }


    $scope.SearchRecord = function () {
        if (isValidate()) {
            $('#CollapseSearchTableList').fadeIn();
            $scope.started();
        }
    };
    $scope.started = function () {
        var collectionobj = {};
        collectionobj.Action = 13;
        collectionobj.RegionId = $scope.RegionId;
        collectionobj.DocStatus = $scope.DocStatus;
        collectionobj.ExpiryStatus = $scope.ExpiryStatus
        collectionobj.LicenceStatus = $scope.LicenceS;
        collectionobj.LicenceType = $scope.LicenceType;
        collectionobj.Client = $scope.Client;
        collectionobj.InvoiceStatus = $scope.InvoiceSt;
        collectionobj.PaymentStatus = $scope.PaymentStatus;
        collectionobj.Store = $scope.Store;
        collectionobj.State = $scope.State;
        collectionobj.Address = $scope.Address;
        collectionobj.License = $scope.License;
        collectionobj.UserId = LoginId;
        collectionobj.loginType = loginType;
        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            messagevalues =
                [
                    { "Region": $("#ddlRegion option:selected").text() == 'Select' ? '' : $("#ddlRegion option:selected").text() },
                    { "Document Status": $("#ddlDocument option:selected").text() == 'Select' ? '' : $("#ddlDocument option:selected").text() },
                    { "Licence Status": $("#ddlLicenceStatus option:selected").text() == 'Select' ? '' : $("#ddlLicenceStatus option:selected").text() },
                    { "Fresh/Renewal": $("#ddlFresh option:selected").text() == 'Select' ? '' : $("#ddlFresh option:selected").text() },
                    { "Client": $("#ddlClient option:selected").text() == 'Select' ? '' : $("#ddlClient option:selected").text() },
                    { "Invoice Status": $("#ddlInvoice option:selected").text() == 'Select' ? '' : $("#ddlInvoice option:selected").text() },
                    { "Payment Status": $("#ddlPayment option:selected").text() == 'Select' ? '' : $("#ddlPayment option:selected").text() },
                    { "Store": $("#ddlStore option:selected").text() == 'Select' ? '' : $("#ddlStore option:selected").text() },
                    { "State": $("#ddlState option:selected").text() == 'Select' ? '' : $("#ddlState option:selected").text() },
                    { "Complete Address": $("#ddlComplete option:selected").text() == 'Select' ? '' : $("#ddlComplete option:selected").text() },
                    { "Type of Licence": $("#ddlTypeofLicence option:selected").text() == 'Select' ? '' : $("#ddlTypeofLicence option:selected").text() },

                ];

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "Id", "HeaderValue": "Id", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "RegionName", "HeaderValue": "RegionName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Document Status", "HeaderValue": "DocumentStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Application Status", "HeaderValue": "LApplicationStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Licence Status", "HeaderValue": "LicenseStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Fresh/Renewal", "HeaderValue": "FreshReneval", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Client Name", "HeaderValue": "PARTYNAME", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Outlet", "HeaderValue": "StoreName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Invoice Status", "HeaderValue": "InvoiceStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Payment Status", "HeaderValue": "PaymentStatus", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Type of Licence", "HeaderValue": "LicenseName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "Address", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Expiry Status", "HeaderValue": "EXPIRESTATUS", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                ];

            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }

    $scope.signFilter = function () {
        $(document).on('click', '.cldiv', function () {
            $('.cldiv').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.Status', function () {
            $('.Status').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.LicenceStatus', function () {
            $('.LicenceStatus').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.Expirystatus', function () {
            $('.Expirystatus').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.Fresh', function () {
            $('.Fresh').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.Client', function () {
            $('.Client').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.InvoiceStatus', function () {
            $('.InvoiceStatus').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.PaymentStatus', function () {
            $('.PaymentStatus').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.Outlet', function () {
            $('.Outlet').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.State', function () {
            $('.State').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.TLicence', function () {
            $('.TLicence').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });

        $(document).on('click', '.Address', function () {
            $('.Address').removeClass("bg-light1");
            $(this).addClass("bg-light1");
        });
    };
    $scope.FilterGraph = function () {
        $scope.signFilter();
        $scope.showLoader();
        var collectionobj = {
            Action: 1,
            RegionId: $scope.RegionId,
            LicenceApplicable: $scope.LicenceApplicable,
            DocStatus: $scope.DocStatus,
            LicenceStatus: $scope.LicenceStatus,
            ExpiryStatus: $scope.ExpiryStatus,
            LicenceType: $scope.LicenceType,
            Client: $scope.Client,
            InvoiceStatus: $scope.InvoiceStatus,
            PaymentStatus: $scope.PaymentStatus,
            Store: $scope.Store,
            State: $scope.State,
            Address: $scope.Address,
            License: $scope.License,
            UserId: LoginId,
            loginType: loginType
        };

        var getData = myService.methode('POST', ("../RetailSection/GetLSDashboard"), JSON.stringify(collectionobj));

        getData.then(function (response) {
            res = '';
            res = response.data.Result;
            var xAxis = [];
            var series = [];

            angular.forEach(res, function (obj) {
                xAxis.push(obj.LicenseName);
                series.push({
                    value: obj.Number,
                    storeName: obj.storeName || 'N/A',
                    StoreCode: obj.StoreCode || 'N/A',
                    Region: obj.RegionName || 'N/A',
                    City: obj.City || 'N/A',
                    State: obj.State || 'N/A'
                });
            });

            $scope.BindGraph(xAxis, series);
            $scope.hideLoader();
        });
    };

    $scope.BindGraph = function (Licence, Number) {
        var chartDom = document.getElementById('main');
        var myChart = echarts.init(chartDom);

        var option = {
            title: {
                text: 'Number of Licenses',
                x: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                enterable: true, // 👈 IMPORTANT LINE
                position: function (point, params, dom, rect, size) {
                    // Horizontally center
                    var chartWidth = size.viewSize[0];
                    var boxWidth = size.contentSize[0];
                    var x = (chartWidth - boxWidth) / 2;

                    // Fixed position from top (e.g., 100px)
                    var y = 100;
                    return [x, y];
                },
                extraCssText: 'z-index: 9999 !important; box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3) !important; background: #fff !important; padding: 12px 16px !important; border-radius: 8px !important; width: 100% !important; word-wrap: break-word !important; white-space: normal !important; color: #333; font-size: 12px !important; max-height: 300px !important; overflow-y: auto !important; overscroll-behavior: contain !important;',

                formatter: function (params) {
                    var data = params[0].data;
                    return `
                   
                    <strong>Total License:</strong> ${data.value}<br/> 
                    <strong>Store:</strong> ${data.storeName}<br/>
                    <strong>StoreCode:</strong> ${data.StoreCode}<br/> 
                    <strong>Region:</strong> ${data.Region}<br/>
                    <strong>City:</strong> ${data.City}
                    <strong>State:</strong> ${data.State}
                `;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                axisTick: {
                    alignWithLabel: true
                },
                axisLabel: {
                    rotate: 60
                },
                data: Licence
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: 'License',
                    type: 'bar',
                    stack: 'Total',
                    label: {
                        show: true,
                        position: 'top'
                    },
                    data: Number
                }
            ]
        };

        option && myChart.setOption(option);
    };

}