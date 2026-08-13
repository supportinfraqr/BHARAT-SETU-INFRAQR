app.LicenseCommonComplianceController = function ($scope, $element, $filter, myService) {
    
     


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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.InvoiceStatusList = response.data.Result;
            $scope.hideLoader();
        });
    }
    $scope.BindSStore = function () {
        
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 9;
        collectionobj.LoginAs = $scope.LoginAs;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
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
    $scope.hasAppliedFilters = function () {
        return $scope.dvRegion == 1 ||
            $scope.dvStatus == 1 ||
            $scope.dvLicenceStatus == 1 ||
            $scope.dvLicenceApplicable == 1 ||
            $scope.dvExpiryStatus == 1 ||
            $scope.dvFreshRenewal == 1 ||
            $scope.dvClient == 1 ||
            $scope.dvInvoice == 1 ||
            $scope.dvPayment == 1 ||
            $scope.dvOutlet == 1 ||
            $scope.dvLicenceType == 1 ||
            $scope.dvState == 1 ||
            $scope.dvAddress == 1;
    };


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
        $scope.hasAppliedFilters();
    }


   
   var licCommonChart = null;
    $scope.FilterGraph = function () {

        if ($scope.isLoading) return; // 🔥 multiple call stop
        $scope.isLoading = true;

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

        myService.methode(
            'POST',
            "../RetailSection/GetLDashboard",
            JSON.stringify(collectionobj)
        ).then(function (response) {

            var result = response.data.Result || [];

            // 🔥 IMPORTANT: data nahi hai to yahin stop
            if (!result || result.length === 0) {
                console.log("Data not received yet");
                return;
            }

            var labels = [];
            var chartData = [];

            // 🔥 function loop ke bahar (performance fix)
            function uniqueArray(arr) {
                const map = new Map();

                arr.forEach(x => {
                    if (x && x !== 'undefined') {
                        const cleaned = x.trim();
                        const key = cleaned.toLowerCase();
                        if (!map.has(key)) {
                            map.set(key, cleaned);
                        }
                    }
                });

                return Array.from(map.values());
            }

            angular.forEach(result, function (obj) {

                labels.push(obj.LicenseName);

                chartData.push({
                    x: obj.LicenseName,
                    y: obj.Number || 0,

                    License: uniqueArray((obj.LicenseName || '').split(',')),
                    LocationCode: uniqueArray((obj.StoreCode || '').split(',')),
                    Unit: uniqueArray((obj.storeName || '').split(',')),
                    Region: uniqueArray((obj.RegionName || '').split(',')),
                    City: uniqueArray((obj.City || '').split(',')),
                    State: uniqueArray((obj.State || '').split(','))
                });
            });

            // 🔥 double safety
            if (labels.length > 0 && chartData.length > 0) {
                $scope.RenderLicenseChart(labels, chartData);
                $scope.RenderLicenseCategoryChart(labels, chartData);
            }

        }).catch(function (error) {
            console.error("API Error:", error);
        }).finally(function () {
            $scope.isLoading = false;
            $scope.hideLoader();
        });
    };

    /* ---------- CHART RENDER ---------- */
    $scope.RenderLicenseChart = function (labels, chartData) {

        var ctx = document.getElementById("licCommonComplianceChart");
        if (!ctx) return;

        if (licCommonChart) {
            licCommonChart.destroy();
        }

        licCommonChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "License Count",
                    data: chartData,
                    backgroundColor: "rgba(228,93,39,0.85)",
                    borderRadius: 6,
                    maxBarThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: { display: false },

                    //tooltip: {
                    //    enabled: true,
                    //    backgroundColor: "#ffffff",
                    //    titleColor: "#111",
                    //    bodyColor: "#333",
                    //    borderColor: "#ff7a2f",
                    //    borderWidth: 1,
                    //    padding: 14,

                    //    callbacks: {
                    //        title: function (ctx) {
                    //            return ctx[0].label + " ";
                    //        },
                    //        label: function (context) {

                    //            var d = context.raw;

                    //            return [
                    //                "Total Licenses : " + d.y,
                    //                "",
                    //                "🏪 Location Code : " + d.LocationCode.join(", "),
                    //                "🏪 Unit : " + d.Unit.join(", "),
                    //                "🌍 Region : " + d.Region.join(", "),
                    //                "🏙 City : " + d.City.join(", "),
                    //                "📍 State : " + d.State.join(", ")


                                     
                    //            ];
                    //        }
                    //    }
                    //}

                    tooltip: {
                        enabled: true,
                        backgroundColor: "#ffffff",
                        titleColor: "#111",
                        bodyColor: "#333",
                        borderColor: "#ff7a2f",
                        borderWidth: 1,
                        padding: 14,

                        callbacks: {

                            title: function (ctx) {
                                return ctx[0].label + " ";
                            },

                            label: function (context) {

                                var d = context.raw;

                                function wrapArray(arr, perLine) {
                                    if (!arr || !arr.length) return ["-"];

                                    var lines = [];
                                    for (var i = 0; i < arr.length; i += perLine) {
                                        lines.push(arr.slice(i, i + perLine).join(", "));
                                    }
                                    return lines;
                                }

                                return [
                                    "Total Licenses : " + d.y,
                                    "",

                                    //"🏪 Location Code :",
                                    //...wrapArray(d.LocationCode, 10),

                                    //"",

                                    //"🏪 Unit :",
                                    //...wrapArray(d.Unit, 10),

                                    //"",

                                    "🌍 Region :",
                                    ...wrapArray(d.Region, 10),

                                    "",

                                    "🏙 City :",
                                    ...wrapArray(d.City, 10),

                                    "",

                                    "📍 State :",
                                    ...wrapArray(d.State, 10)
                                ];
                            }
                        }
                    }

                },

                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 60,
                            minRotation: 60,
                            font: { size: 11 }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };

    $scope.RenderLicenseCategoryChart = function (labels, chartData) {

        // agar pehle se chart hai to destroy
        if ($scope.licensesByCategoryChart) {
            $scope.licensesByCategoryChart.destroy();
        }

        var ctx = document.getElementById("licensesByCategory");
        if (!ctx) return;

        $scope.licensesByCategoryChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    data: chartData.map(x => x.y),
                    backgroundColor: "#E45D27",
                    borderRadius: 6,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.raw + " Licenses";
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { drawBorder: false }
                    }
                }
            }
        });
    };

    //-------------------------Part Second
    //$scope.BindSecondPart = function () {
    //    $scope.currentDateTime = new Date();
    //    $scope.showLoader();
    //    var collectionobj = {};
    //    collectionobj.Action = 13;
    //    collectionobj.loginType = loginType;
    //    collectionobj.UserId = LoginId;
    //    var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
    //    getData.then(function (response) {
    //        $scope.SActive = response.data.Result[0].Active;
    //        $scope.SExpiringSoon = response.data.Result[0].ExpiringSoon;
    //        $scope.SExpired = response.data.Result[0].Expired;
    //        $scope.SPendingApproval = response.data.Result[0].PendingApproval;
    //        $scope.STotalLicense = response.data.Result[0].TotalLicense;
    //        //$scope.bindLicStatusDonut();
    //        //$scope.bindRiskDonut();
    //        //$scope.bindDocStatusBar();
    //       // $scope.prepareExpiryTimelineData();
    //        $scope.hideLoader();
    //    });
       
    //}

    $scope.BindSecondPart = function () {
        $scope.showLoader();
        var collectionobj = {};
        collectionobj.Action = 14;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        collectionobj.PageNumber = 1;
        collectionobj.PageSize = 10000;
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.LoadMasterListSpeed = response.data.Result; 

            $scope.SActive = $scope.LoadMasterListSpeed.filter(x => x.ExpiryStatus === 'Active').length;

            $scope.SExpiringSoon = $scope.LoadMasterListSpeed.filter(x => x.ExpiryStatus === 'Expiring Soon').length;

            $scope.SExpired = $scope.LoadMasterListSpeed.filter(x => x.ExpiryStatus === 'Expired').length;

            // ✅ TOTAL COUNT
            $scope.STotalLicense = $scope.LoadMasterListSpeed.length;
        });

        //-------------------------
    }







    $scope.bindLicStatusDonut = function () {

        var ctx = document.getElementById("licStatusDonut");
        if (!ctx) return;

        // destroy if already exists
        if ($scope.licStatusDonutChart) {
            $scope.licStatusDonutChart.destroy();
        }

        $scope.licStatusDonutChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Active", "Expiring Soon", "Expired", "Pending Approval"],
                datasets: [{
                    data: [
                        $scope.SActive || 0,
                        $scope.SExpiringSoon || 0,
                        $scope.SExpired || 0,
                        $scope.SPendingApproval || 0
                    ],
                    backgroundColor: ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"],
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                    legend: { display: false }
                }
            }
        });
    };
    $scope.bindRiskDonut = function () {

        var ctx = document.getElementById("riskDonut");
        if (!ctx) return;

        if ($scope.riskDonutChart) {
            $scope.riskDonutChart.destroy();
        }

        var riskValue = $scope.SExpired || 0;   // eg: 12
        var safeValue = $scope.SExpiringSoon;          // eg: 88

        $scope.riskDonutChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [riskValue, safeValue],
                    backgroundColor: ["#E45D27", "#e5e7eb"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "80%",
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    };
    $scope.bindDocStatusBar = function () {

        var ctx = document.getElementById("docStatusBar");
        if (!ctx) return;

        // destroy old chart
        if ($scope.docStatusBarChart) {
            $scope.docStatusBarChart.destroy();
        }

        $scope.docStatusBarChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Expired", "Expiring Soon", "Active"],
                datasets: [{
                    data: [
                        $scope.SExpired || 0,
                    
                        $scope.SExpiringSoon || 0,
                            $scope.SActive || 0
                       
                    ],
                    backgroundColor: ["#f59e0b", "#3b82f6", "#22c55e"],
                    borderRadius: 6,
                    barThickness: 14
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { precision: 0 }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    };


    $scope.nextPage = function () {
        if ($scope.currentPage * $scope.pageSize < $scope.totalCount) {
            $scope.currentPage++;
            $scope.LoadLicenseReg();
        }
    };

    $scope.prevPage = function () {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.LoadLicenseReg();
        }
    };
    $scope.currentPage = 1;
    $scope.pageSize = 10;
    $scope.totalCount = 0;
    $scope.LoadLicenseReg = function (cpage, psize) {
        $scope.showLoader();
        var collectionobj = {}; 
        collectionobj.Action = 14;
        collectionobj.loginType = loginType;
        collectionobj.UserId = LoginId;
        collectionobj.PageNumber = cpage | $scope.currentPage;
        collectionobj.PageSize = psize| $scope.pageSize;
        var getData = myService.methode('POST', ("../RetailSection/GetLDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response)
        {
            $scope.LoadMasterList = response.data.Result;
            $scope.totalCount = response.data.Result[0].TotalCount;
            $scope.isLoading = false;
            $scope.licenseList = [...new Set(
                $scope.LoadMasterList.map(x => x.LicenseName)
            )];
             
            $scope.locationList = [...new Set(
                $scope.LoadMasterList.map(x => x.StoreCode)
            )];
            $scope.hideLoader();

           
        });

        //-------------------------
    }

    $scope.selectLicense = function (license) {

        $scope.selectedLicense = license;

        if (!license) {
            // agar All License select ho
            $scope.locationList = [...new Set(
                $scope.LoadMasterList.map(x => x.StoreCode)
            )];
        }
        else {

            // selected license ke according location filter
            var filtered = $scope.LoadMasterList.filter(x => x.LicenseName == license);

            $scope.locationList = [...new Set(
                filtered.map(x => x.StoreCode)
            )];
        }

    };
    $scope.selectLocation = function (loc) {

        $scope.selectedLocation = loc;

        if (!loc) {

            $scope.licenseList = [...new Set(
                $scope.LoadMasterList.map(x => x.LicenseName)
            )];

        }
        else {

            var filtered = $scope.LoadMasterList.filter(x => x.StoreCode == loc);

            $scope.licenseList = [...new Set(
                filtered.map(x => x.LicenseName)
            )];
        }

    };
    $scope.prepareExpiryTimelineData = function () {
        function getMonthKey(dateStr) {
            var d = new Date(dateStr);
            return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        }
        var expiringMap = {};
        var expiredMap = {};

        angular.forEach($scope.LoadMasterList, function (item) {

            if (!item.ValidityEndDate) return;

            var monthKey = getMonthKey(item.ValidityEndDate);

            if (item.ExpiryStatus === 'Expiring Soon') {
                expiringMap[monthKey] = (expiringMap[monthKey] || 0) + 1;
            }

            if (item.ExpiryStatus === 'Expired') {
                expiredMap[monthKey] = (expiredMap[monthKey] || 0) + 1;
            }
        });

        // sort months
        var months = Object.keys(
            Object.assign({}, expiringMap, expiredMap)
        ).sort(function (a, b) {
            return new Date(a) - new Date(b);
        });

        $scope.ExpiryMonths = months;
        $scope.ExpiringData = months.map(m => expiringMap[m] || 0);
        $scope.RenewedData = months.map(m => expiredMap[m] || 0);
        $scope.bindExpiryTimeline();
    };
    $scope.bindExpiryTimeline = function () {

        var ctx = document.getElementById("expiryTimeline");
        if (!ctx) return;

        // destroy old chart
        if ($scope.expiryTimelineChart) {
            $scope.expiryTimelineChart.destroy();
        }

        $scope.expiryTimelineChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: $scope.ExpiryMonths || [],
                datasets: [
                    {
                        label: "Expiring",
                        data: $scope.ExpiringData || [],
                        backgroundColor: "rgba(245, 158, 11, 0.3)",
                        borderColor: "#f59e0b",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: "Renewed",
                        data: $scope.RenewedData || [],
                        backgroundColor: "rgba(59, 130, 246, 0.3)",
                        borderColor: "#3b82f6",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 12,
                            padding: 12,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0, font: { size: 12 } },
                        grid: { drawBorder: false }
                    }
                }
            }
        });
    };
    $scope.rowLimit = 10000;       // default
    $scope.showAll = false;
    $scope.toggleRows = function () {

        $scope.isLoading = true; // 🔥 loader ON

        if ($scope.showAll) {
            $scope.LoadLicenseReg(1, 10);
            $scope.showAll = false;
        } else {
            $scope.LoadLicenseReg(1, 99999);
            $scope.showAll = true;
        }
    };
    $scope.selectedLicense = '';
    $scope.selectedLocation = '';

    $scope.licenseList = [];
    $scope.locationList = [];
    
    $scope.$watch('selectedLicense', function (v) {
        console.log('License changed:', v);
    }); console.log($scope.licenseList);

    $scope.selectedLicense = "";

    //// dropdown click
    //$scope.selectLicense = function (license) {
    //    $scope.selectedLicense = license;
    //    console.log("License changed:", license);
    //};

    $scope.selectedLocation = "";

    // dropdown click
    //$scope.selectLocation = function (loc) {
    //    $scope.selectedLocation = loc;
    //    console.log("Location changed:", loc);
    //};
    

    // table filter
    $scope.licenseFilter = function (row) {

        // license filter
        if ($scope.selectedLicense &&
            row.LicenseName !== $scope.selectedLicense) {
            return false;
        }

        // location filter
        if ($scope.selectedLocation &&
            row.StoreCode !== $scope.selectedLocation) {
            return false;
        }

        return true;
    };

    $scope.downloadCSV = function () {

        if (!$scope.LoadMasterList || !$scope.LoadMasterList.length) {
            alert("No data to download");
            return;
        }

        // ✅ Date Format Function
        function formatDate(dateStr) {
            if (!dateStr) return "";

            var d = new Date(dateStr);

            if (isNaN(d)) return dateStr; // agar already formatted ho

            var day = ('0' + d.getDate()).slice(-2);
            var month = ('0' + (d.getMonth() + 1)).slice(-2);
            var year = d.getFullYear();

            return day + '/' + month + '/' + year;
        }

        function safeValue(val) {
            if (val === null || val === undefined || val === "null") {
                return "";
            }
            return val;
        }

        // headers
        var headers = [
            "Location Code",
            "License Name",
			"Unit Name",
            "License Number",
            "License Status",
            "Expiry Status",
            "Validity Start Date",
            "Validity End Date",
            "Days Of Expire"
        ];

        var csvRows = [];
        csvRows.push(headers.join(","));

        // filters
        var filteredData = $scope.LoadMasterList
            .filter($scope.licenseFilter)
            .filter(function (item) {

                if (!$scope.searchText) return true;

                return Object.values(item).some(function (val) {
                    return val && val.toString().toLowerCase()
                        .includes($scope.searchText.toLowerCase());
                });

            })
            .slice(0, $scope.rowLimit);

        angular.forEach(filteredData, function (row) {

            csvRows.push([
                row.StoreCode || "",
                row.LicenseName || "",
				  
				    '"' + (row.StoreName || "").replace(/"/g, '""') + '"',
                '="' + (row.LicenseNumber || "") + '"',
                row.LicenseStatus || "",
                row.ExpiryStatus || "",
                '="' + safeValue(row.ValidityStartDate) + '"',  
                '="' + safeValue(row.ValidityEndDate) + '"',   
                (row.LicenseStatus === 'Surrender' && Number(row.DaysOfExpire) < 0)  ? 0   : row.DaysOfExpire,
            ].join(","));

        });

        var csvString = csvRows.join("\n");

        var blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "License_Report.csv";
        link.click();
    };
    $scope.printTable = function () {

        var filteredData = $scope.LoadMasterList
            .filter($scope.licenseFilter)
            .filter(function (item) {

                if (!$scope.searchText) return true;

                return Object.values(item).some(function (val) {
                    return val && val.toString().toLowerCase()
                        .includes($scope.searchText.toLowerCase());
                });

            })
            .slice(0, $scope.rowLimit); // same as limitTo

        if (!filteredData.length) {
            alert("No data to print");
            return;
        }

        var orgName = $scope.MapUser || "";

        var now = new Date();
        var generatedOn = now.toLocaleString();

        var printWindow = window.open("", "", "height=600,width=900");

        printWindow.document.write("<html><head><title>License Report</title>");

        printWindow.document.write(`
        <style>
            body { font-family: Arial, sans-serif; }
            .org-name { text-align:center;font-size:16px;font-weight:bold;margin-bottom:4px;}
            .report-title { text-align:center;font-size:13px;font-weight:bold;margin-bottom:12px;}
            .generated-on { text-align:right;font-size:10px;margin-bottom:6px;}
            table { width:100%;border-collapse:collapse;font-size:12px;}
            th, td { border:1px solid #ccc;padding:6px;text-align:center;}
            th { background:#f3f4f6;}
        </style>
    `);

        printWindow.document.write("</head><body>");

        printWindow.document.write(`
        <div class="org-name">${orgName}</div>
        <div class="report-title">Expiry License Report</div>
        <div class="generated-on">Generated On: ${generatedOn}</div>
    `);

        printWindow.document.write("<table>");

        printWindow.document.write(`
        <tr>
            <th>Location Code</th>
            <th>License Name</th>
			<th>Unit Name</th>
            <th>License Number</th>
             <th>License Status</th>
            <th>Expiry Status</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Days</th>
        </tr>
    `);

        angular.forEach(filteredData, function (row) {

            printWindow.document.write(`
            <tr>
                <td>${row.StoreCode || ""}</td>
                <td>${row.LicenseName || ""}</td>
				 <td>${row.StoreName || ""}</td>
                <td>${row.LicenseNumber || ""}</td>

  <td>${row.LicenseStatus|| ""}</td>
                <td>${row.ExpiryStatus || ""}</td>
                <td>${row.ValidityStartDate || ""}</td>
                <td>${row.ValidityEndDate || ""}</td>
                <td>${   (row.LicenseStatus === 'Surrender' && Number(row.DaysOfExpire) < 0) ? 0 : row.DaysOfExpire}</td>
            </tr>
        `);

        });

        printWindow.document.write("</table></body></html>");

        printWindow.document.close();
        printWindow.print();
    };

    //$scope.printTable = function () {

    //    var filteredData = $scope.LoadMasterList.filter($scope.licenseFilter);

    //    if (!filteredData.length) {
    //        alert("No data to print");
    //        return;
    //    }

    //    // organization name (scope se)
    //    var orgName = $scope.Name || "Organization Name";

    //    var printWindow = window.open("", "", "height=600,width=900");

    //    printWindow.document.write("<html><head><title>License Report</title>");
    //    printWindow.document.write(`
    //    <style>
    //        body { font-family: Arial, sans-serif; }
    //        .org-name {
    //            text-align: center;
    //            font-size: 16px;
    //            font-weight: bold;
    //            margin-bottom: 4px;
    //        }
    //        .report-title {
    //            text-align: center;
    //            font-size: 14px;
    //            font-weight: bold;
    //            margin-bottom: 12px;
    //        }
    //        table {
    //            width:100%;
    //            border-collapse: collapse;
    //            font-size:12px;
    //        }
    //        th, td {
    //            border:1px solid #ccc;
    //            padding:6px;
    //            text-align:center;
    //        }
    //        th {
    //            background:#f3f4f6;
    //        }
    //    </style>
    //`);
    //    printWindow.document.write("</head><body>");

    //    // 🔹 HEADER
    //    printWindow.document.write(`
    //    <div class="org-name">${orgName}</div>
    //    <div class="report-title">License Report</div>
    //`);

    //    // 🔹 TABLE
    //    printWindow.document.write("<table>");
    //    printWindow.document.write(`
    //    <tr>
    //        <th>Store Code</th>
    //        <th>License Name</th>
    //        <th>License Number</th>
    //        <th>Expiry Status</th>
    //        <th>Start Date</th>
    //        <th>End Date</th>
    //        <th>Days</th>
    //    </tr>
    //`);

    //    angular.forEach(filteredData, function (row) {
    //        printWindow.document.write(`
    //        <tr>
    //            <td>${row.StoreCode || ""}</td>
    //            <td>${row.LicenseName || ""}</td>
    //            <td>${row.LicenseNumber || ""}</td>
    //            <td>${row.ExpiryStatus || ""}</td>
    //            <td>${row.ValidityStartDate || ""}</td>
    //            <td>${row.ValidityEndDate || ""}</td>
    //            <td>${row.DaysOfExpire || ""}</td>
    //        </tr>
    //    `);
    //    });

    //    printWindow.document.write("</table>");
    //    printWindow.document.write("</body></html>");

    //    printWindow.document.close();
    //    printWindow.print();
    //};
    //--------------REPORT 
    $scope.BindStore = function ()
    {
        $scope.showLoader();
        var collectionobj = {
            Action: 10,
            UserId: LoginId

        };
        var getData = myService.methode('POST', ("../RetailSection/ReportLicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            debugger;
            $scope.StoreList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };
    $scope.GetStatusMaster = function () {
        var collectionobj = {};
        collectionobj.Name = "All";
        var getData = myService.methode('POST', ("../RetailSection/GetStatusMaster"), JSON.stringify(collectionobj));
        return getData.then(function (response) {
            $scope.StatusMasterList = response.data.Result;
            $scope.ApplicationStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "ApplicationStatus";
            });

            $scope.LicenseStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "LicenseStatus";
            });

            $scope.RenewalStatusList = $scope.StatusMasterList.filter(function (item) {
                return item.KeyName === "RenewalStatus";
            });


        });


    };
    $scope.ResetFilter = function () {

        $scope.isResetting = true;
        $scope.showLoader();

        $scope.StoreCode = '';
        $scope.ApplicationStatus = '';
        $scope.LicenseStatus = '';
        $scope.RenewalStatus = '';
        $scope.selectLicenseReport('');
        $scope.calldata(null, 0);

     

    };
    
    $scope.ApprovalRecord = function (Id) {
        debugger;
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.LicenceRequestId = Id;
        var getData = myService.methode('POST', ("../RetailSection/ApprovalUpdate"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            showMsgBox('999', 'Approved', response.data.Result, 'success', 'btn-success');
            $scope.LoadLicenseReg();
        });
    };


    $scope.pno = 1;      // current page
    $scope.psize = 10;   // page size (change as needed)
    $scope.totalC = 0;


    $scope.nextPageR = function () {
        if ($scope.pno * $scope.psize < $scope.totalC) {
            $scope.pno++;
            $scope.started();
        }
    };

    $scope.prevPageR = function () {
        if ($scope.pno > 1) {
            $scope.pno--;
            $scope.started();
        }
    };
 
    $scope.started = function (p,s) {
        debugger;
        $scope.showLoader();
        document.title = "Licence Master Report";
        var collectionobj = {
            Action: 10,
            UserId: LoginId,
            StoreCode: $scope.StoreCode,
            ApplicationStatus: $scope.ApplicationStatus,
            LicenseStatus: $scope.LicenseStatus,
            RenewalStatus: $scope.RenewalStatus,
            PageNo: p| $scope.pno,
            PageSize: s|$scope.psize,


        };
        $scope.showLoader();
        var getData = myService.methode('POST', ("../RetailSection/ReportLicenseRequestData"), JSON.stringify(collectionobj));
        getData.then(function (response) { 
            debugger;

            $scope.totalC = response.data.Result[0].TotalCount;
            $scope.showLoader();
            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "SrNo", "HeaderValue": "SrNo", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "Location Code", "HeaderValue": "StoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Ref. Location Code", "HeaderValue": "RefStoreCode", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Unit Name", "HeaderValue": "StoreName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Address", "HeaderValue": "CompleteAddress", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                /*    { "HeaderText": "Location", "HeaderValue": "StoreLocation", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },*/
                    { "HeaderText": "City", "HeaderValue": "CityName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "State", "HeaderValue": "StateName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Region", "HeaderValue": "RegionName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "ZipCode", "HeaderValue": "ZipCode", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                  /*  { "HeaderText": "Circle", "HeaderValue": "Circle", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },*/
                    { "HeaderText": "Location Manager Name", "HeaderValue": "StoreManagerName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Location Manager MobileNo", "HeaderValue": "StoreManagerMobileNo", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Location Manager Email", "HeaderValue": "StoreManagerEmail", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Status", "HeaderValue": "IsActive", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Notify (Before Days)", "HeaderValue": "DaysOfExpire", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Category Name", "HeaderValue": "CategoryName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Area", "HeaderValue": "SQFTStoreArea", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Proposed Date", "HeaderValue": "ProposedDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "License Name", "HeaderValue": "LicenseName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No", "FixedColumn": true},
                    { "HeaderText": "License Type", "HeaderValue": "LicenseType", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "License Status", "HeaderValue": "LicenseStatus", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "License Category", "HeaderValue": "LicenseCategory", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Requested Date", "HeaderValue": "RequestedDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Document Date", "HeaderValue": "DocumentDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Application Status", "HeaderValue": "ApplicationStatus", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Application Date", "HeaderValue": "ApplicationDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Application Copy", "HeaderValue": "UploadApplicationCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Fees Copy", "HeaderValue": "UploadFeesCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Challan Copy", "HeaderValue": "UploadChallanCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Renewed Copy", "HeaderValue": "UploadRenewedCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                     


                   

                    { "HeaderText": "License Date", "HeaderValue": "IssuedDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "License Copy", "HeaderValue": "UploadLicenseCopy", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "License Number", "HeaderValue": "LicenseNumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Validity Start Date", "HeaderValue": "ValidityStartDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "Validity End Date", "HeaderValue": "ValidityEndDate", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },

                    { "HeaderText": "User Name", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Password", "HeaderValue": "UserPassword", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Mobile Number", "HeaderValue": "MobileNumber", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Email", "HeaderValue": "EmailId", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Tentative Date", "HeaderValue": "TentativeDateofComp", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "License Cost", "HeaderValue": "ActualCost", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Govt Fees", "HeaderValue": "GovtFees", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Renewal Request Date", "HeaderValue": "RenewalRequestDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Renewal Status", "HeaderValue": "RenewalStatus", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    { "HeaderText": "Renewal Start Date", "HeaderValue": "RenewalStartDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Renewal End Date", "HeaderValue": "RenewalEndDate", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                    { "HeaderText": "Expiry Status", "HeaderValue": "EXPIRESTATUS", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Reminder(Alert Days)", "HeaderValue": "LED", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },

                    {
                        "HeaderText": "Amendment Copy", "HeaderValue": "AmendmentCopy", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    {
                        "HeaderText": "Machine Number", "HeaderValue": "machinenumber", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    
                    {
                        "HeaderText": "Compliance Category", "HeaderValue": "compliancecategory", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    {
                        "HeaderText": "OperationModel", "HeaderValue": "OperationModel", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No"
                    },

                   

                    { "HeaderText": "Remark", "HeaderValue": "Remark", "Width": "100%", "ShowColumn": "No", "ImageColumn": "No" },
                ];
            
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);




            $scope.AllData = response.data.Result;

            var filtered = $scope.AllData;

            $scope.LicenseNameList = [...new Set(filtered.map(x => x.LicenseName))]
                .map(x => ({ LicenseName: x }));



            $scope.StoreList = [...new Set($scope.AllData.map(x => x.StoreCode))]
                .map(x => {
                    let obj = $scope.AllData.find(d => d.StoreCode === x);
                    return {
                        StoreCode: obj.StoreCode,
                        RefStoreCode: obj.RefStoreCode
                    };
                });


            $scope.ApplicationStatusList = [...new Set(filtered.map(x => x.ApplicationStatus))]
                .map(x => ({ AttributeValue: x }));

            $scope.LicenseStatusList = [...new Set(filtered.map(x => x.LicenseStatus))]
                .map(x => ({ AttributeValue: x }));

            $scope.RenewalStatusList = [...new Set(filtered.map(x => x.RenewalStatus))]
                .map(x => ({ AttributeValue: x }));
          
            $scope.isResetting = false;
            $scope.hideLoader();
        });

      
    }


    $scope.selectLicenseReport = function (licenseName) {

        $scope.SelectedLicenseName = licenseName;

        // 🔹 Table filter
        $scope.licenseFilter = function (item) {
            return (!$scope.SelectedLicenseName || item.LicenseName == $scope.SelectedLicenseName);
        };

        // 🔹 StoreList filter
        var filtered = licenseName
            ? $scope.AllData.filter(x => x.LicenseName == licenseName)
            : $scope.AllData;

        $scope.StoreList = [...new Set(filtered.map(x => x.StoreCode))]
            .map(x => {
                let obj = filtered.find(d => d.StoreCode === x);
                return {
                    StoreCode: obj.StoreCode,
                    RefStoreCode: obj.RefStoreCode
                };
            });

    };

    $scope.calldata = function (value, type) {

        if (type == 1) {  // Location
            $scope.StoreCode = value;
        }

        if (type == 2) {  // Application Status
            $scope.ApplicationStatus = value;
        }

        if (type == 3) {  // License Status
            $scope.LicenseStatus = value;
        }

        if (type == 4) {  // Renewal Status
            $scope.RenewalStatus = value;
        }

        // Base filtered data
        var filtered = $scope.AllData.filter(x =>
            (!$scope.StoreCode || x.StoreCode == $scope.StoreCode) &&
            (!$scope.ApplicationStatus || x.ApplicationStatus == $scope.ApplicationStatus) &&
            (!$scope.LicenseStatus || x.LicenseStatus == $scope.LicenseStatus)
        );

        // Application Status List
        $scope.ApplicationStatusList = [...new Set(filtered.map(x => x.ApplicationStatus))]
            .map(x => ({ AttributeValue: x }));

        // License Status List
        $scope.LicenseStatusList = [...new Set(filtered.map(x => x.LicenseStatus))]
            .map(x => ({ AttributeValue: x }));

        // Renewal Status List
        $scope.RenewalStatusList = [...new Set(filtered.map(x => x.RenewalStatus))]
            .map(x => ({ AttributeValue: x }));
        $scope.started();
    };
    $scope.showColumnMenu = false;
    $scope.tblHeader = [];   // Ye aapke tblheader array ko store karega
    $scope.tableData = [];   // API se aayi hui data

    $scope.toggleColumnMenu = function () {
        $scope.showColumnMenu = !$scope.showColumnMenu;
    };

    $scope.toggleSelectAll = function () {
        $scope.tblHeader.forEach(function (col) {
            if (!col.FixedColumn) {
                col.ShowColumn = $scope.selectAllColumns;
            }
        });
    };

    $scope.resetLicenseFilter = function () {

        $scope.selectedLicense = '';
        $scope.selectedLocation = '';

     /*   $scope.LoadLicenseReg();*/

    };
    function loadDataUsingPreDefinedColumn(columns, data) {
        $scope.tblHeader = columns;        
        $scope.tblHeader.forEach(function (col)
        {
            if (col.FixedColumn) {
                col.ShowColumn = true;  
            } else {
                col.ShowColumn = (col.ShowColumn === "Yes");
            }
        });

        // Table data assign
        $scope.tableData = data;

        // Select All ka status set karo
        $scope.updateSelectAllStatus();

    }
    $scope.updateSelectAllStatus = function () {
        var allChecked = true;

        angular.forEach($scope.tblHeader, function (col) {
            if (!col.ShowColumn) {
                allChecked = false;
            }
        });

        $scope.selectAllColumns = allChecked;
    };
    $scope.updateVisibleColumns = function (col) {
        // yahan aapka existing logic (agar koi hai)

        // Select All ka status refresh karo
        $scope.updateSelectAllStatus();
    };

    // Checkbox change hone par ye function run hoga
    $scope.updateVisibleColumns = function (col) {
        // col.ShowColumn automatically update ho jata hai ng-model se
        // table me ng-show me reflect ho jayega
    };
    $scope.ReportexportToExcel = function () {

        // 🔹 Apply filters
        var filteredData = $scope.tableData
            .filter(function (row) {
                return (!$scope.SelectedLicenseName || row.LicenseName == $scope.SelectedLicenseName);
            })
            .filter(function (row) {

                if (!$scope.searchText) return true;

                return Object.values(row).some(function (val) {
                    return val && val.toString().toLowerCase()
                        .includes($scope.searchText.toLowerCase());
                });

            });

        if (!filteredData.length) {
            alert("No data to export");
            return;
        }

        var wb = XLSX.utils.book_new();

        // ===== Worksheet Data =====
        var ws_data = [];

        ws_data.push([$scope.MapUser || 'Company Name']);
        ws_data.push(['License Report']);
        ws_data.push(['Generated On : ' + new Date().toLocaleString()]);
        ws_data.push([]);

        // 🔹 Header
        var headerRow = [];
        angular.forEach($scope.tblHeader, function (col) {
            if (col.ShowColumn) headerRow.push(col.HeaderText);
        });
        ws_data.push(headerRow);

        // 🔹 Data (filtered)
        angular.forEach(filteredData, function (row) {
            var dataRow = [];
            angular.forEach($scope.tblHeader, function (col) {
                if (col.ShowColumn) dataRow.push(row[col.HeaderValue] || '');
            });
            ws_data.push(dataRow);
        });

        var ws = XLSX.utils.aoa_to_sheet(ws_data);

        // ===== Styling =====
        ws['!cols'] = headerRow.map(() => ({ wch: 20 }));

        ws['A1'].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: "center" }
        };

        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: headerRow.length - 1 } }
        ];

        // 🔹 Header style
        for (var C = 0; C < headerRow.length; ++C) {
            var cell_address = XLSX.utils.encode_cell({ r: 4, c: C });
            if (!ws[cell_address]) continue;

            ws[cell_address].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "D3D3D3" } },
                alignment: { horizontal: "center" }
            };
        }

        XLSX.utils.book_append_sheet(wb, ws, "LicenseReport");

        XLSX.writeFile(wb, "LicenseReport.xlsx");
    };

    $scope.ReportexportToCSV = function () {

        var csvContent = [];

        // Header
        var headerRow = [];
        angular.forEach($scope.tblHeader, function (col) {
            if (col.ShowColumn) {
                headerRow.push('"' + col.HeaderText + '"');
            }
        });
        csvContent.push(headerRow.join(','));

        // Data
        angular.forEach($scope.tableData, function (row) {
            var dataRow = [];
            angular.forEach($scope.tblHeader, function (col) {
                if (col.ShowColumn) {
                    var val = row[col.HeaderValue] || '';
                    dataRow.push('"' + val + '"');
                }
            });
            csvContent.push(dataRow.join(','));
        });

        // Download
        var blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var url = window.URL.createObjectURL(blob);

        var a = document.createElement('a');
        a.href = url;
        a.download = 'LicenseReport.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    //$scope.ReportprintTable = function () {

    //    var win = window.open('', '_blank', 'width=1000,height=600');

    //    win.document.write(`
    //    <html>
    //    <head>
    //        <title>Print</title>
    //        <style>
    //            body { font-family: Arial; font-size: 12px; }
    //            table { width: 100%; border-collapse: collapse; }
    //            th, td { border: 1px solid #000; padding: 6px; }
    //            th { background: #F37437; color: #fff; }
    //        </style>
    //    </head>
    //    <body>
    //    <table>
    //        <thead><tr>
    //`);

    //    // Header
    //    angular.forEach($scope.tblHeader, function (col) {
    //        if (col.ShowColumn) {
    //            win.document.write('<th>' + col.HeaderText + '</th>');
    //        }
    //    });

    //    win.document.write('</tr></thead><tbody>');

    //    // Rows
    //    angular.forEach($scope.tableData, function (row) {
    //        win.document.write('<tr>');
    //        angular.forEach($scope.tblHeader, function (col) {
    //            if (col.ShowColumn) {
    //                win.document.write('<td>' + (row[col.HeaderValue] || '') + '</td>');
    //            }
    //        });
    //        win.document.write('</tr>');
    //    });

    //    win.document.write(`
    //        </tbody>
    //    </table>
    //    </body>
    //    </html>
    //`);

    //    win.document.close();
    //    win.print();
    //};

    $scope.ReportprintTable = function () {

        // 🔹 Apply filters
        var filteredData = $scope.tableData
            .filter(function (row) {
                return (!$scope.SelectedLicenseName || row.LicenseName == $scope.SelectedLicenseName);
            })
            .filter(function (row) {

                if (!$scope.searchText) return true;

                return Object.values(row).some(function (val) {
                    return val && val.toString().toLowerCase()
                        .includes($scope.searchText.toLowerCase());
                });

            });

        if (!filteredData.length) {
            alert("No data to print");
            return;
        }

        var win = window.open('', '_blank', 'width=1000,height=600');

        win.document.write(`
<html>
<head>
<title>Print</title>
<style>
body { font-family: Arial; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 1px; }
th { background: #e6e9f3; color: #000; }
.center { text-align: center; }
.company { font-weight: bold; font-size: 19px; }
.top-info { text-align: center; margin-bottom: 5px; }
.Generated { text-align: right; margin-bottom: 5px; }
</style>
</head>
<body>

<div class="top-info company">${$scope.MapUser || 'Company Name'}</div>
<div class="top-info">License Report</div>
<div class="Generated">Generated On: ${new Date().toLocaleString()}</div>

<table>
<thead><tr>
`);

        // 🔹 Header
        angular.forEach($scope.tblHeader, function (col) {
            if (col.ShowColumn) {
                win.document.write('<th>' + col.HeaderText + '</th>');
            }
        });

        win.document.write('</tr></thead><tbody>');

        // 🔹 Rows (filtered)
        angular.forEach(filteredData, function (row) {
            win.document.write('<tr>');
            angular.forEach($scope.tblHeader, function (col) {
                if (col.ShowColumn) {
                    win.document.write('<td>' + (row[col.HeaderValue] || '') + '</td>');
                }
            });
            win.document.write('</tr>');
        });

        win.document.write(`
</tbody>
</table>

</body>
</html>
`);

        win.document.close();
        win.print();
    };


    $scope.LicensePRINTReport = function () {

        var reportDiv = document.getElementById('licenseReportp');
        if (!reportDiv) {
            alert('License Report section not found!');
            return;
        }

        // Show hidden report
      //  reportDiv.classList.remove('d-none');

        setTimeout(function () {

            html2canvas(reportDiv, {
                scale: 2,          // High quality
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollY: -window.scrollY
            }).then(function (canvas) {

                // Convert full report to image
                var imgData = canvas.toDataURL('image/png');

                var popupWin = window.open('', '_blank', 'width=1200,height=900');
                popupWin.document.open();
                popupWin.document.write(`
                <html>
                <head>
                    <title>License Report</title>
                    <style>
                        body { margin:0; text-align:center; }
                        img { width:100%; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <img src="${imgData}" />
                </body>
                </html>
            `);

                popupWin.document.close();

                // Hide again
                //reportDiv.classList.add('d-none');

            });

        }, 500);
    };




    $scope.printoverview = function () {

        var companyName = $scope.MapUser || ' ';

        var canvas = document.getElementById('licCommonComplianceChart');

        if (!canvas) {
            alert('Chart canvas not found!');
            return;
        }

        // Convert canvas to image
        var chartImg = canvas.toDataURL("image/png");

        var popupWin = window.open('', '_blank', 'width=900,height=650');

        popupWin.document.open();
        popupWin.document.write(`
        <html>
        <head>
            <title>License Overview</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .print-header { text-align:center; margin-bottom:20px; }
                .chart-img { max-width:100%; height:auto; }
            </style>
        </head>
        <body onload="window.print(); window.close();">

            <div class="print-header">
                <h2>${companyName}</h2>
                <h4>License Overview</h4>
                <hr/>
            </div>

            <img src="${chartImg}" class="chart-img" />

        </body>
        </html>
    `);

        popupWin.document.close();
    };



}