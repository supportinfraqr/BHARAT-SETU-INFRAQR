app.ReportDashbaord = function ($scope, $element, $filter, myService) {
    var MapUser = $scope.MapUser;
    $scope.BindTiles = function ()
    {
        var value = '';
        if (window.location.href.indexOf('?') !== -1) {
            value = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
            value = value[0].replace(/%20/g, " ");
            $scope.SectionMenuName = value;
        }
        var collectionobj = {};
        if ($scope.SectionMenuName == 'FactoryCommonCompliance') {

            collectionobj.Action = 6;
        } 
        else if ($scope.SectionMenuName == 'Labourcommoncompliance') { collectionobj.Action = 7; }
        else if ($scope.SectionMenuName == 'SecretarialCommonCompliance') { collectionobj.Action = 8;}
        else if ($scope.SectionMenuName == 'FinanceCommonCompliance') { collectionobj.Action = 9; }
        else { collectionobj.Action = 1;}
     
       
        collectionobj.PartyID = MapId;
        collectionobj.UserId = LoginId;
        collectionobj.PageName = $scope.SectionMenuName;
        var getData = myService.methode('POST', "../Retail/bindingcommmonTiles", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger; 
            $scope.Pending = response.data.Result.Table[0].Pending;
            $scope.Complied = response.data.Result.Table[0].Complied;
            $scope.NonComplied = response.data.Result.Table[0].NonComplied;
            $scope.DelayComplied = response.data.Result.Table[0].DelayComplied;
            $scope.TotalComplied = response.data.Result.Table[0].TotalComplied; 
        });
    }
    $scope.CalculateCounts = function () {

        let data = $scope.LabourCompliance;

        // MASTER CATEGORY OBJECT
        $scope.CategoryCount = {
            LWF: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 },
            PF: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 },
            PT: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 },
            ESIC: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 }
        };

        data.forEach(x => {

            let name = (x.ComplianceName || "").toLowerCase().trim();
            let status = (x.CStatus || "").toLowerCase().trim();

            // find category name
            let cat = null;

            if (name.includes("lwf")) cat = "LWF";
            else if (name.includes("pf")) cat = "PF";
            else if (name.includes("pt")) cat = "PT";     // PTEC / PTRC both
            else if (name.includes("esic")) cat = "ESIC";

            if (!cat) return;

            // Increase total
            $scope.CategoryCount[cat].total++;

            // Status-wise count
            if (status === "complied") $scope.CategoryCount[cat].complied++;
            else if (status === "non complied") $scope.CategoryCount[cat].non++;
            else if (status === "delay complied") $scope.CategoryCount[cat].delay++;
            else if (status === "pending" || status === "") $scope.CategoryCount[cat].pending++;
        });
    };

    $scope.CalculateDashboardCounts = function () {

        let data = $scope.LabourCompliance;

        $scope.Dashboard = {
            complied: 0,
            non: 0,
            delay: 0,
            pending: 0,
            verified: 0
        };

        data.forEach(x => {

            let status = (x.CStatus || "").toLowerCase().trim();
            let verified = (x.IsVerified || "").toLowerCase().trim();

            // ---- STATUS COUNTS ----
            if (status === "complied") {
                $scope.Dashboard.complied++;
            }
            else if (status === "non complied") {
                $scope.Dashboard.non++;
            }
            else if (status === "delay complied") {
                $scope.Dashboard.delay++;
            }
            else if (status === "pending" || status === "") {
                $scope.Dashboard.pending++;
            }

            // ---- VERIFIED COUNTS ----
            if (verified === "verified") {
                $scope.Dashboard.verified++;
            }

        });
    };

    // ================================
    // STATE WISE LABOUR COMPLIANCE CHART
    // ================================
   

    $scope.labourComplianceChart = null;

    $scope.BindLabourComplianceStateChart = function () {

        if (!$scope.LabourCompliance || $scope.LabourCompliance.length === 0) {
            return;
        }

        // ===== DISTINCT + TOTAL BY STATE =====
        const stateMap = {};

        $scope.LabourCompliance.forEach(item => {
            let state = item.STATE_NM;
            let count = item.Total || 1;

            if (!stateMap[state]) {
                stateMap[state] = 0;
            }

            stateMap[state] += count; // total sum for each state
        });

        // Convert to labels + data
        const states = Object.keys(stateMap);            // unique state names
        const complianceData = Object.values(stateMap);  // total per state

        // Alternate Colors
        const colors = states.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

        // Destroy Previous Chart
        if ($scope.labourComplianceChart) {
            $scope.labourComplianceChart.destroy();
        }

        const ctx3 = document.getElementById('labourComplianceChart').getContext('2d');

        // ===== CREATE NEW CHART =====
        $scope.labourComplianceChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: states,
                datasets: [{
                    label: 'No. of Documents',
                    data: complianceData,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#555',
                            font: { size: 11 },
                            maxRotation: 80,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#555',
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'No. of Documents',
                            color: '#333',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.parsed.y} documents`
                        }
                    }
                }
            }
        });
    };

    $scope.GetCurrentMonthYear = function () {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const today = new Date();
        const month = months[today.getMonth()];
        const year = today.getFullYear();

        return month + " " + year;
    };

    // Set value on page load
    $scope.ReportPeriod = "Report Period: " + $scope.GetCurrentMonthYear();
    var ReportPeriod = $scope.ReportPeriod;
    $scope.commonReport = function () {

        if (!$scope.myCharts) {
            $scope.myCharts = {};   // first time create chart store
        }

        var value = '';
        if (window.location.href.indexOf('?') !== -1) {
            value = window.location.href.split('?')[1].split('&')[0].replace(/%20/g, " ");
            $scope.SectionMenuName = value;
        }

        var collectionobj = {
            Action: 1,
            PartyID: MapId,
            UserId: LoginId,
            PageName: $scope.SectionMenuName
        };

        var getData = myService.methode(
            'POST',
            "../RetailSection/bindcommonreport",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            $scope.LabourCompliance = response.data.Result.Table1;
          
            $scope.CalculateCounts();
            $scope.CalculateDashboardCounts();
  
            var data = response.data.Result.Table[0];
            var Labourdata = response.data.Result.Table2[0];
            var Fdata = response.data.Result.Table3[0];
            var Sdata = response.data.Result.Table4[0];
            var Pdata = response.data.Result.Table5[0];
            const chartData = {
                chartFactory: [
                    data.CompliedPercent,
                    data.PendingPercent,
                    data.DelayCompliedPercent
                ],
                chartFinance: [
                    Fdata.FCompliedPercent ,
                    Fdata.FPendingPercent ,
                    Fdata.FNonCompliedPercent
                ],

                chartLabour: [
                    Labourdata.LCompliedCount,
                    Labourdata.LPendingCount,
                    Labourdata.LDelayCompliedCount
                ],
                	 
                chartSecretarial: [
                    Sdata.CompliedPerc,
                    Sdata.PendingAndNonCompliedPerc,
                    Sdata.DelayCompliedPerc
                ],

                
                chartPayroll: [
                    Pdata.CompletedPerc ,
                    Pdata.PendingPerc
                   
                ]

            };
          
         

            // ✔ FIX LOGIC: 0% par wrong 100% chart ko rokta hai
            const makeDatasets = (outer, middle, inner) => {

                const fix = (v, colors) => {
                    if (v <= 0) {
                        return {
                            data: [0, 100],
                            backgroundColor: ['#D6D6D6', '#F1F1F1']
                        };
                    }
                    return {
                        data: [v, 100 - v],
                        backgroundColor: colors
                    };
                };

                return [
                    {
                        ...fix(outer, ['#E45D27', '#FFE2D5']),
                        cutout: '70%'
                    },
                    {
                        ...fix(middle, ['#8BC34A', '#E9F7EA']),
                        cutout: '50%',
                        radius: '70%'
                    },
                    {
                        ...fix(inner, ['#FFC107', '#FFF6E0']),
                        cutout: '30%',
                        radius: '50%'
                    }
                ];
            };

            // ---- render all charts ----
            Object.entries(chartData).forEach(([chartId, values]) => {

                var canvas = document.getElementById(chartId);
                if (!canvas) return;

                // 🔥 Destroy old chart if exist
                if ($scope.myCharts[chartId]) {
                    $scope.myCharts[chartId].destroy();
                }

                // 🔥 Create NEW chart & save reference
                $scope.myCharts[chartId] = new Chart(canvas, {
                    type: 'doughnut',
                    data: { datasets: makeDatasets(...values) },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });

            });
            $scope.BindLabourComplianceStateChart();
        });

    }

    
     


    $scope.BindReport = function () {
        var value = '';
        if (window.location.href.indexOf('?') !== -1) {
            value = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
            value = value[0].replace(/%20/g, " ");
            $scope.SectionMenuName = value;
        }
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.PartyID = MapId;
        collectionobj.UserId = LoginId;
        collectionobj.PageName = $scope.SectionMenuName
        var getData = myService.methode('POST', "../Retail/bindingReport", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;

            $scope.UserDetail = response.data.Result.Table;
            $scope.DahboardList = response.data.Result.Table1;
            console.log($scope.DahboardList);
            $scope.UserName = response.data.Result.Table[0].UserName;
            $scope.Status = response.data.Result.Table[0].Status;
            $scope.LastLogin = response.data.Result.Table[0].LastLogin;
            $scope.LoginType = response.data.Result.Table[0].LoginType;
            $scope.Photo = (response.data.Result.Table[0].Photo && response.data.Result.Table[0].Photo.trim() !== '')
                ? response.data.Result.Table[0].Photo
                : '../content/profile.png';
            
        });
    }


    $scope.DownloadPDF = function (type) {
        var element = document.getElementById('divprint');

        // 🔹 Convert any <canvas> (chart) to image before PDF
        var canvases = element.querySelectorAll('canvas');
        canvases.forEach(function (canvas) {
            var imgData = canvas.toDataURL('image/png', 1.0);
            var img = document.createElement('img');
            img.src = imgData;
            img.style.width = canvas.width + 'px';
            img.style.height = 'auto';
            canvas.parentNode.replaceChild(img, canvas);
        });

        var opt = {
            margin: [11, 0, 0, 0], // top, left, bottom, right
            filename: type +'.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: {
                scale: 3, // higher = sharper
                useCORS: true,
                scrollY: 0,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: document.documentElement.offsetWidth,
                onclone: function (clonedDoc) {
                    // ensure charts render correctly in cloned HTML
                    const clonedCharts = clonedDoc.querySelectorAll('img, canvas');
                    clonedCharts.forEach(el => {
                        el.style.maxWidth = '100%';
                        el.style.height = 'auto';
                    });
                }
            },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .toPdf()
            .get('pdf')
            .then(function (pdf) {
                const totalPages = pdf.internal.getNumberOfPages();
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const dateStr = new Date().toLocaleDateString();

                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);


                    // ✅ HEADER with LOGO
                    pdf.setFillColor('#E45D27');
                    pdf.rect(0, 0, pageWidth, 40, 'F');
                    pdf.setTextColor('#ffffff');
                    pdf.setFontSize(10);

                    // 🟢 Add logo at top-left (now using correct PNG)
                    try {
                        const logo = new Image();
                        logo.src = 'login/image/ezfulllogo 3.png'; // ✅ your working logo path

                        logo.onload = function () {
                            pdf.addImage(logo, 'PNG', 10, 5, 60, 30); // (x, y, width, height)
                        };

                        logo.onerror = function (err) {
                            console.error('Logo load error: File not found or invalid format', err);
                        };
                    } catch (e) {
                        console.error('Unexpected logo load error:', e);
                    }


                    // 🟢 Header text
                    pdf.text(ReportPeriod, 80, 25);
                    pdf.text('Generated on: ' + dateStr, pageWidth - 150, 25);


                    // ✅ FOOTER (same orange design)
                    pdf.setFillColor('#E45D27');
                    pdf.rect(0, pageHeight - 30, pageWidth, 30, 'F');
                    pdf.setTextColor('#ffffff');
                    pdf.setFontSize(9);
                    pdf.text('Prepared By: EZCompliance', 40, pageHeight - 12);
                    pdf.text('Generated for: ' + MapUser, 430    , pageHeight - 12);
                    pdf.text('Page ' + i + ' of ' + totalPages, pageWidth / 2 - 15, pageHeight - 12);
                }
            })
            .save()
            .then(() => {
                console.log("✅ PDF downloaded successfully");
            });
    };


     
    $scope.CalculatefactoryCounts = function () {

        let data = $scope.facCompliance;

        // safety check
        if (!Array.isArray(data)) {
            console.warn("facCompliance is not an array. Resetting.");
            data = [];
        }

        // ONLY EVENT category
        $scope.facCategoryCount = {
            event: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 }
        };

        data.forEach(x => {

            let name = (x.Frequency || "").toLowerCase().trim();
            let status = (x.CStatus || "").toLowerCase().trim();

            // check ONLY if "event" word exists
            if (!name.includes("event")) return;

            // COUNT TOTAL
            $scope.facCategoryCount.event.total++;

            // STATUS-WISE COUNT
            if (status === "complied") {
                $scope.facCategoryCount.event.complied++;
            }
            else if (status === "non complied") {
                $scope.facCategoryCount.event.non++;
            }
            else if (status === "delay complied") {
                $scope.facCategoryCount.event.delay++;
            }
            else {
                $scope.facCategoryCount.event.pending++;
            }

        });
    };

    


    $scope.BindfactoryReport = function () {
        var collectionobj = {
            Action: 2,
            UserId: LoginId
        };

        myService.methode(
            'POST',
            "../RetailSection/bindcommonreport",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {
           
        }).catch(function (error) {
            console.error("Error fetching data:", error);
            $scope.allComplianceRows = [];
        });
    };
    $scope.BindfactoryComplianceStateChart = function () {

        if (!$scope.facCompliance || $scope.facCompliance.length === 0) {
            return;
        }

        // ===== DISTINCT + TOTAL BY STATE =====
        const stateMap = {};

        $scope.facCompliance.forEach(item => {
            let state = item.STATE_NM;
            let count = item.Total || 1;

            if (!stateMap[state]) {
                stateMap[state] = 0;
            }

            stateMap[state] += count; // total sum for each state
        });

        // Convert to labels + data
        const states = Object.keys(stateMap);            // unique state names
        const complianceData = Object.values(stateMap);  // total per state

        // Alternate Colors
        const colors = states.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

        // Destroy Previous Chart
        if ($scope.labourComplianceChart) {
            $scope.labourComplianceChart.destroy();
        }

        const ctx3 = document.getElementById('labourComplianceChart').getContext('2d');

        // ===== CREATE NEW CHART =====
        $scope.labourComplianceChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: states,
                datasets: [{
                    label: 'No. of Documents',
                    data: complianceData,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#555',
                            font: { size: 11 },
                            maxRotation: 80,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#555',
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'No. of Documents',
                            color: '#333',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.parsed.y} documents`
                        }
                    }
                }
            }
        });
    };


 
    $scope.BindfactoryReport = function () { 
        var collectionobj = {};
            collectionobj.Action= 2,
            collectionobj.UserId= LoginId
        var getData = myService.methode('POST', "../RetailSection/bindcommonreport", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.facCompliance = response.data.Result.Table || [];
            $scope.CalculatefactoryDashboardCounts();
            $scope.BindfactoryComplianceStateChart();
            $scope.CalculatefactoryCounts();
        });
    }
    $scope.BindsactrarialReport = function () {
        var collectionobj = {};
        collectionobj.Action = 3,
            collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../RetailSection/bindcommonreport", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.sactCompliance = response.data.Result.Table || [];
            $scope.CalculatesacCounts();
            $scope.BindsacComplianceStateChart();
            $scope.CalculatesacDashboardCounts();
        });
    }
    

    $scope.BindsacComplianceStateChart = function () {

        if (!$scope.sactCompliance || $scope.sactCompliance.length === 0) {
            return;
        }

        // ===== DISTINCT + TOTAL BY STATE =====
        const stateMap = {};

        $scope.sactCompliance.forEach(item => {
            let state = item.STATE_NM;
            let count = item.Total || 1;

            if (!stateMap[state]) {
                stateMap[state] = 0;
            }

            stateMap[state] += count; // total sum for each state
        });

        // Convert to labels + data
        const states = Object.keys(stateMap);            // unique state names
        const complianceData = Object.values(stateMap);  // total per state

        // Alternate Colors
        const colors = states.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

        // Destroy Previous Chart
        if ($scope.labourComplianceChart) {
            $scope.labourComplianceChart.destroy();
        }

        const ctx3 = document.getElementById('labourComplianceChart').getContext('2d');

        // ===== CREATE NEW CHART =====
        $scope.labourComplianceChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: states,
                datasets: [{
                    label: 'No. of Documents',
                    data: complianceData,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#555',
                            font: { size: 11 },
                            maxRotation: 80,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#555',
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'No. of Documents',
                            color: '#333',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.parsed.y} documents`
                        }
                    }
                }
            }
        });
    };


    $scope.CalculatesacCounts = function () {

        let data = $scope.sactCompliance;

        // safety check
        if (!Array.isArray(data)) {
            console.warn("sacCategory is not an array. Resetting.");
            data = [];
        }

        // ONLY EVENT category
        $scope.sacCategory = {
            event: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 }
        };

        data.forEach(x => {

            let name = (x.Frequency || "").toLowerCase().trim();
            let status = (x.CStatus || "").toLowerCase().trim();

            // check ONLY if "event" word exists
            if (!name.includes("event")) return;

            // COUNT TOTAL
            $scope.sacCategory.event.total++;

            // STATUS-WISE COUNT
            if (status === "complied") {
                $scope.sacCategory.event.complied++;
            }
            else if (status === "non complied") {
                $scope.sacCategory.event.non++;
            }
            else if (status === "delay complied") {
                $scope.sacCategory.event.delay++;
            }
            else {
                $scope.sacCategory.event.pending++;
            }

        });
    };

    $scope.CalculatesacDashboardCounts = function () {

        let data = $scope.sactCompliance;

        $scope.sac = {
            complied: 0,
            non: 0,
            delay: 0,
            pending: 0,
            verified: 0
        };

        data.forEach(x => {

            let status = (x.CStatus || "").toLowerCase().trim();
            let verified = (x.IsVerified || "").toLowerCase().trim();

            // ---- STATUS COUNTS ----
            if (status === "complied") {
                $scope.sac.complied++;
            }
            else if (status === "non complied") {
                $scope.sac.non++;
            }
            else if (status === "delay complied") {
                $scope.sac.delay++;
            }
            else if (status === "pending" || status === "") {
                $scope.sac.pending++;
            }

            // ---- VERIFIED COUNTS ----
            if (verified === "verified") {
                $scope.sac.verified++;
            }

        });
    };


    $scope.CalculatefactoryDashboardCounts = function () {

        let data = $scope.facCompliance;

        $scope.factory = {
            complied: 0,
            non: 0,
            delay: 0,
            pending: 0,
            verified: 0
        };

        data.forEach(x => {

            let status = (x.CStatus || "").toLowerCase().trim();
            let verified = (x.IsVerified || "").toLowerCase().trim();

            // ---- STATUS COUNTS ----
            if (status === "complied") {
                $scope.factory.complied++;
            }
            else if (status === "non complied") {
                $scope.factory.non++;
            }
            else if (status === "delay complied") {
                $scope.factory.delay++;
            }
            else if (status === "pending" || status === "") {
                $scope.factory.pending++;
            }

            // ---- VERIFIED COUNTS ----
            if (verified === "verified") {
                $scope.factory.verified++;
            }

        });
    };

    //-------------------------------

    $scope.BindFinanceReport = function () {
        var collectionobj = {};
        collectionobj.Action = 4,
            collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../RetailSection/bindcommonreport", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.FinCompliance = response.data.Result.Table || [];
            $scope.CalculateFinComplianceCounts();
            $scope.BindFinComplianceStateChart();
            $scope.CalculateFinDashboardCounts();

        });
    }


    $scope.BindFinComplianceStateChart = function () {

        if (!$scope.FinCompliance || $scope.FinCompliance.length === 0) {
            return;
        }

        // ===== DISTINCT + TOTAL BY STATE =====
        const stateMap = {};

        $scope.FinCompliance.forEach(item => {
            let state = item.STATE_NM;
            let count = item.Total || 1;

            if (!stateMap[state]) {
                stateMap[state] = 0;
            }

            stateMap[state] += count; // total sum for each state
        });

        // Convert to labels + data
        const states = Object.keys(stateMap);            // unique state names
        const complianceData = Object.values(stateMap);  // total per state

        // Alternate Colors
        const colors = states.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

        // Destroy Previous Chart
        if ($scope.labourComplianceChart) {
            $scope.labourComplianceChart.destroy();
        }

        const ctx3 = document.getElementById('labourComplianceChart').getContext('2d');

        // ===== CREATE NEW CHART =====
        $scope.labourComplianceChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: states,
                datasets: [{
                    label: 'No. of Documents',
                    data: complianceData,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#555',
                            font: { size: 11 },
                            maxRotation: 80,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#555',
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'No. of Documents',
                            color: '#333',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.parsed.y} documents`
                        }
                    }
                }
            }
        });
    };


    $scope.CalculateFinComplianceCounts = function () {

        let data = $scope.FinCompliance;

        // safety check
        if (!Array.isArray(data)) {
            console.warn("sacCategory is not an array. Resetting.");
            data = [];
        }

        // ONLY EVENT category
        $scope.FinCompliancecont = {
            event: { total: 0, complied: 0, pending: 0, non: 0, delay: 0 }
        };

        data.forEach(x => {

            let name = (x.Frequency || "").toLowerCase().trim();
            let status = (x.CStatus || "").toLowerCase().trim();

            // check ONLY if "event" word exists
            if (!name.includes("event")) return;

            // COUNT TOTAL
            $scope.FinCompliancecont.event.total++;

            // STATUS-WISE COUNT
            if (status === "complied") {
                $scope.FinCompliancecont.event.complied++;
            }
            else if (status === "non complied") {
                $scope.FinCompliancecont.event.non++;
            }
            else if (status === "delay complied") {
                $scope.FinCompliancecont.event.delay++;
            }
            else {
                $scope.FinCompliancecont.event.pending++;
            }

        });
    };

    $scope.CalculateFinDashboardCounts = function () {

        let data = $scope.FinCompliance;

        $scope.Fin = {
            complied: 0,
            non: 0,
            delay: 0,
            pending: 0,
            verified: 0
        };

        data.forEach(x => {

            let status = (x.CStatus || "").toLowerCase().trim();
            let verified = (x.IsVerified || "").toLowerCase().trim();

            // ---- STATUS COUNTS ----
            if (status === "complied") {
                $scope.Fin.complied++;
            }
            else if (status === "non complied") {
                $scope.Fin.non++;
            }
            else if (status === "delay complied") {
                $scope.Fin.delay++;
            }
            else if (status === "pending" || status === "") {
                $scope.Fin.pending++;
            }

            // ---- VERIFIED COUNTS ----
            if (verified === "verified") {
                $scope.Fin.verified++;
            }

        });
    };

   //--------------------------------------license

    $scope.BindlicenseReport = function () {
        var collectionobj = {};
        collectionobj.Action = 5,
            collectionobj.UserId = LoginId
        var getData = myService.methode('POST', "../RetailSection/bindcommonreport", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            $scope.licenseCompliance = response.data.Result.Table || [];
            
            $scope.CalculateLicenseCounts();
            $scope.RenderLicenseChart();
        });
    }

    $scope.CalculateLicenseCounts = function () {

        let data = $scope.licenseCompliance || [];

        // Final result object
        $scope.licenseCount = {
            total: data.length,
            expired: 0,
            expiringSoon: 0,
            valid: 0,
            allLicense: data.length, // all rows = all licenses

            uploadCopy: 0,
            appCopy: 0
        };

        data.forEach(x => {

            let status = (x.ExpiryStatus || "").toLowerCase().trim();

            // Status Count
            if (status === "expired") {
                $scope.licenseCount.expired++;
            }
            else if (status === "expiring soon") {
                $scope.licenseCount.expiringSoon++;
            }
            else if (status === "valid") {
                $scope.licenseCount.valid++;
            }

            // Document Count
            if (x.LicenseCopy && x.LicenseCopy !== "") {
                $scope.licenseCount.uploadCopy++;
            }
            if (x.ApplicationCopy && x.ApplicationCopy !== "") {
                $scope.licenseCount.appCopy++;
            }
        });

    };

    $scope.RenderLicenseChart = function () {

        // destroy old chart if exists
        if ($scope.licenseChart) {
            $scope.licenseChart.destroy();
        }

        let data = $scope.licenseCompliance || [];

        // STEP 1: Get unique license names automatically
        let licenseNames = [...new Set(data.map(x => x.LicenseName))];

        // STEP 2: Count frequency of each license name
        let licenseCounts = licenseNames.map(name =>
            data.filter(x => x.LicenseName === name).length
        );

        // STEP 3: auto color generate (alternating)
        const colors = licenseNames.map((_, i) =>
            i % 2 === 0 ? '#E45D27' : '#F4844C'
        );

        const ctx = document.getElementById('licenseReportChart').getContext('2d');

        // Create dynamic chart
        $scope.licenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: licenseNames,
                datasets: [{
                    label: 'No. of Licenses',
                    data: licenseCounts,
                    backgroundColor: colors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: { beginAtZero: true }
                }
            }
        });
    };

    //--------------------------------------------license end

    //-----------------------------------Location master
    $scope.Locationmaster = function () { 
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/bindcommonreport"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.CityCount = response.data.Result.Table[0].CITY_NAME;
            $scope.StateCount = response.data.Result.Table[0].STATE_NM;
            $scope.TotalStores = response.data.Result.Table[0].TotalStores;
            $scope.ActiveCount = response.data.Result.Table1[0].ActiveCount;
            $scope.InactiveCount = response.data.Result.Table1[0].InactiveCount;
            $scope.UpcomingCount = response.data.Result.Table1[0].UpcomingCount;
            $scope.DocumentHighlights();
        });
    }

    $scope.DocumentHighlights = function () {

        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/GetStoreDashboard"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.DocumentHighlightsList = response.data.Result;
        });
    }
    


    //------------------------------------------

    //--------------------------notice

    $scope.noticeMater = function () {
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', ("../RetailSection/bindcommonreport"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.Noticelist = response.data.Result.Table;
            $scope.SubmitCount = response.data.Result.Table1[0].SubmitCount;
            $scope.PendingCount = response.data.Result.Table1[0].PendingCount;
            $scope.TotalRecords = response.data.Result.Table1[0].TotalRecords;

            let t = response.data.Result.Table2[0];

            // extract values
            let lateFee = t.TotalLateFee || 0;
            let fines = t.TotalFines || 0;
            let penalties = t.TotalPenalities || 0;
            let interest = t.TotalInterest || 0;
            let other = t.TotalOther || 0;

            if (typeof $timeout !== 'undefined') {
                $timeout(function () {
                    $scope.loadNoticeInspectionChart(lateFee, fines, penalties, interest, other);
                }, 0);
            } else {
                // small delay fallback so DOM can render
                setTimeout(function () {
                    $scope.loadNoticeInspectionChart(lateFee, fines, penalties, interest, other);
                }, 50);
            }
        });
    }

    $scope.loadNoticeInspectionChart = function (lateFee, fines, penalties, interest, other) {

        // Convert all values (avoid undefined / null issues)
        lateFee = Number(lateFee) || 0;
        fines = Number(fines) || 0;
        penalties = Number(penalties) || 0;
        interest = Number(interest) || 0;
        other = Number(other) || 0;

        const values = [lateFee, fines, penalties, interest, other];

        let labels = [
            "Late Fee",
            "Fines",
            "Penalties",
            "Interest",
            "Other"
        ];

        let backgroundColors = [
            "#FBB03B",
            "#62C4A8",
            "#E94B35",
            "#F178B6",
            "#6C63FF"
        ];

        // 🔥 CASE: All values are zero → show fallback "No Data"
        if (values.every(v => v === 0)) {
            labels = ["No Data Available"];
            backgroundColors = ["#d0d0d0"];
            values.splice(0, values.length, 1); // Make dataset [1]
        }

        const canvas = document.getElementById("noticeInspectionChart");
        if (!canvas) {
            console.error("Canvas not found");
            return;
        }

        const ctx = canvas.getContext("2d");

        if ($scope.noticeChart) {
            try { $scope.noticeChart.destroy(); } catch (e) { }
        }

        $scope.noticeChart = new Chart(ctx, {
            type: "pie",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: "#fff",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    };



    $scope.BindLitigation  = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.StageOneTotal = response.data.Result.Table[0].CaseFiling;
            $scope.PleadingsTotal = response.data.Result.Table[0].Pleadings;
            $scope.OrdersTotal = response.data.Result.Table[0].Orders;
            $scope.HearingsTotal = response.data.Result.Table[0].Hearing;
            $scope.TotalCases = response.data.Result.Table[0].TotalCases;
            $scope.Appeal = response.data.Result.Table[0].Appeal;
            //$scope.StageOnePercent = response.data.Result.Table[0].StageOnePercent;
            //$scope.PleadingsPercent = response.data.Result.Table[0].PleadingsPercent;
            //$scope.OrdersPercent = response.data.Result.Table[0].OrdersPercent;
            //$scope.HearingsPercent = response.data.Result.Table[0].HearingsPercent;
        });
    }
    $scope.BindLitigationManagement = function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.litigationList = response.data.Result.Table  
            $scope.getfinancialchart()
        });
    } 
 



    $scope.getfinancialchart = function () {
        var collectionobj = {
            Action: 5,
            PartyID: '0',
            UserId: LoginId
        };

        var getData = myService.methode(
            'POST',
            "../Retail/bindingcommmonTiles",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {

            $scope.riskgetfinancialchart = response.data.Result.Table || [];
            const d = $scope.riskgetfinancialchart[0] || {};

            const interest = parseFloat(d.TotalInterest) || 0;
            const lateFee = parseFloat(d.TotalLateFee) || 0;
            const fines = parseFloat(d.TotalFines) || 0;
            const penalties = parseFloat(d.TotalPenalities) || 0;
            const other = parseFloat(d.TotalOther) || 0;

            setTimeout(() => {

                const canvas = document.getElementById("litigationChart");
                if (!canvas) return;

                const ctx = canvas.getContext("2d");

                // Destroy old chart
                if (window.financialChart instanceof Chart) {
                    window.financialChart.destroy();
                }

                // Labels + Amount like your original example
                const labels = [
                    `Interest ₹${interest}`,
                    `Late Fee ₹${lateFee}`,
                    `Fines ₹${fines}`,
                    `Penalties ₹${penalties}`,
                    `Other Expenses ₹${other}`
                ];

                const values = [interest, lateFee, fines, penalties, other];

                // If all values are zero → Show 'No Data'
                let finalLabels = labels;
                let finalValues = values;
                let finalColors = ["#FBB03B", "#62C4A8", "#E94B35", "#F178B6", "#6C63FF"];

                if (values.every(v => v === 0)) {
                    finalLabels = ["No Data Available"];
                    finalValues = [1];
                    finalColors = ["#d0d0d0"];
                }

                // Create fresh chart
                window.financialChart = new Chart(ctx, {
                    type: "pie",
                    data: {
                        labels: finalLabels,
                        datasets: [{
                            data: finalValues,
                            backgroundColor: finalColors,
                            borderColor: "#fff",
                            borderWidth: 2,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: 20 },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        return context.label.split("₹")[0] +
                                            ": ₹" + context.parsed.toLocaleString();
                                    }
                                }
                            },
                            datalabels: {
                                color: "#333",
                                formatter: (value, ctx) => {
                                    const label = ctx.chart.data.labels[ctx.dataIndex];
                                    return label.split("₹")[0];
                                },
                                font: { size: 12, weight: "bold" },
                                anchor: "end",
                                align: "end",
                                offset: 8
                            }
                        }
                    },
                    plugins: [ChartDataLabels]
                });

            }, 300);
        });
    };


    //------------------------------end
}