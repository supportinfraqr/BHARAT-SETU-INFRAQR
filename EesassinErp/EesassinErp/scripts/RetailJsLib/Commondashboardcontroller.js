app.Commondashboardcontroller = function ($scope, $element, $filter, myService, $timeout) {
     
    $scope.BindTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.PartyID = MapId;
        collectionobj.UserId = LoginId;

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

     

    $scope.prepareLicenseChart = function () {
        if (!$scope.LicenseOverview || $scope.LicenseOverview.length === 0) return;

        // Example: Assuming Table3 has { LicenseType, Count } structure
        const labels = $scope.LicenseOverview.map(x => x.LicenseName);
        const data = $scope.LicenseOverview.map(x => x.Number);

        const ctx2 = document.getElementById("licensesChart").getContext("2d");

        // Destroy previous chart if exists to avoid duplicates
        if ($scope.licensesChart2) {
            $scope.licensesChart2.destroy();
        }

        $scope.licensesChart2 = new Chart(ctx2, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: "#E45D27",
                    borderRadius: 6,
                    barThickness: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
                    y: { beginAtZero: true, ticks: { stepSize: 2 } }
                }
            }
        });
    };
   
    $scope.getUniqueStates = function (stateString) {
        if (!stateString) return '';

        return stateString
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(', ');
    };
    $scope.Bindcompliance = function () {
        var collectionobj = {
            Action: 3,
            PartyID: MapId,
            UserId: LoginId
        };

        var getData = myService.methode('POST', "../Retail/bindingcommmonTiles", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            debugger;

            $scope.PayRollCompliance = response.data.Result.Table || [];
            $scope.EstablishmentCompliance = response.data.Result.Table1 || [];
            $scope.FactoryCompliance = response.data.Result.Table2 || [];
            $scope.LicenseOverview = response.data.Result.Table3 || [];
            $scope.ApplicableActList = response.data.Result.Table5 || [];
            $scope.DocumentExpireList = response.data.Result.Table6 || [];
            $scope.NoticeLIst = response.data.Result.Table7 || [];
            $scope.CaseStatusList = response.data.Result.Table9 || [];
            $scope.LicenseList = response.data.Result.Table10 || [];
            $scope.LabourCompliance = response.data.Result.Table11 || [];

            $scope.availableStates = [...new Set($scope.LabourCompliance.map(x => x.STATE_NM))];
            $scope.availableRegs = [...new Set($scope.LabourCompliance.map(x => x.RegistrationNumber))];

            $scope.selectedState = '';
            $scope.selectedReg = '';

            $scope.CaseFiling = response.data.Result.Table8[0].CaseFiling || [];
            $scope.Pleadings = response.data.Result.Table8[0].Pleadings || [];
            $scope.Orders = response.data.Result.Table8[0].Orders || [];
            $scope.Hearing = response.data.Result.Table8[0].Hearing || [];
            $scope.TotalCases = response.data.Result.Table8[0].TotalCases || [];
            $scope.Appeal = response.data.Result.Table8[0].Appeal || [];


            $scope.Active = response.data.Result.Table4[0].Active;
            $scope.InActive = response.data.Result.Table4[0].InActive
            $scope.Upcoming = response.data.Result.Table4[0].Upcoming
            $scope.TotalStores = response.data.Result.Table4[0].TotalStores
            $scope.TotalCities = response.data.Result.Table4[0].TotalCities
            $scope.TotalStates = response.data.Result.Table4[0].TotalStates


            // Extract unique values for dropdowns
            $scope.uniqueStatesl = [...new Set($scope.LicenseList.map(x => x.STATE_NAME))];
            $scope.uniqueLicensesl = [...new Set($scope.LicenseList.map(x => x.LicenseName))];
            $scope.uniqueLocationsl = [...new Set($scope.LicenseList.map(x => x.RefStoreCode))];

            // Selected filters
            $scope.selectedStatel = '';
            $scope.selectedLicensel = '';
            $scope.selectedLocationl = '';

            // Function to handle dropdown selection
            $scope.selectFilter = function (type, value) {
                if (type === 'state') $scope.selectedStatel = value;
                if (type === 'license') $scope.selectedLicensel = value;
                if (type === 'location') $scope.selectedLocationl = value;
                $scope.applyFilters();
            };

            // Apply filters to LicenseList
            $scope.applyFilters = function () {
                $scope.filteredLicenses = $scope.LicenseList.filter(x =>
                    (!$scope.selectedStatel || x.STATE_NAME === $scope.selectedStatel) &&
                    (!$scope.selectedLicensel || x.LicenseName === $scope.selectedLicensel) &&
                    (!$scope.selectedLocationl || x.Location === $scope.selectedLocationl)
                );
            };

            // Initialize filtered data
            $scope.applyFilters();



            $scope.prepareLicenseChart();
            setTimeout(function () {
                $('[data-toggle="tooltip"]').tooltip();
            }, 500);
            // Convert SQL result to display rows
            const payrollRows = $scope.PayRollCompliance.map(x => {
                let d = new Date(x.CreatedDate);
                let createdShort = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "03 Nov"

                return [
                    x.MonthYear,   // "Nov 2025"
                    x.Type,        // e.g. PF / ESIC / PT / LWF
                    x.StoreCode,
                    createdShort,
                    x.Status
                ];
            });
          
            const LabourCompliance = $scope.LabourCompliance.map(x => {
                let d = new Date(x.DueDate);
                let DueDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "03 Nov"
                return [
                    x.MonthYear,    
                    x.type ,
                    x.ComplianceName ,
                     DueDate , 
                    x.CStatus
                ];
            });

            

            const EstablishmentCompliance = $scope.EstablishmentCompliance.map(x => { 
                return [
                    x.MonthYear,    
                    x.TotalPending, 
                    x.TotalComplete,
                    $scope.getUniqueStates(x.States)
                ];
            });

            const FactoryCompliance = $scope.FactoryCompliance.map(x => {
                return [
                 
                    x.STATE_NAME,
                    x.ComplianceName,
                    x.ActualSubmissionDate ,
                    x.DueDate,
                ];
            });

            

            // ✅ Initialize current index
            let currentIndex = 0;

            // ✅ Define compliance sections
            $scope.complianceSections = [
                {
                    title: "Labour Compliance",
                    buttons: ["PT", "PF", "ESIC","LWF"],
                    defaultButton: "PT",
                    data: {
                        PT: { headers: ["Month",  "Compliance Name", "Due Date", "Status"], rows: LabourCompliance },

                    }
                },  
                {
                    title: "PF Challan",
                    buttons: [],
                    defaultButton: "CT",
                    data: {
                        CT: { headers: ["Month", "Type", "Location Code", "Created On", "Status"], rows: payrollRows },
                      
                    }
                },
                {
                    title: "Establishment Compliance",
                    buttons: ["Register", "Return", "Abstract", "Event Based"],
                    defaultButton: "ESIC",
                    data: { 
                        ESIC: { headers: ["Month", "TotalPending", "TotalComplete", "States"], rows: EstablishmentCompliance },
                       }
                },
                {
                    title: "Factory Compliance",
                    buttons: [],
                    defaultButton: "PT",
                    data: { 
                        PT: { headers: ["State", "Compliance Name", "Actual Submission Date", "Due Date"], rows: FactoryCompliance },
                    
                    }
                }
            ];

            $scope.getLabourRows = function (type) {
                return $scope.LabourCompliance
                    .filter(x => {
                        // Agar PT hai to 'PTRC Return' aur 'PTRC Payment' dono include hon
                        if (type === 'PT') {
                            return x.ComplianceName === 'PTRC Return' || x.ComplianceName === 'PTRC Payment';
                        }
                        // Agar LWF hai to 'LWF Return' lo (example)
                        else if (type === 'LWF') {
                            return x.ComplianceName === 'LWF Challan';
                        }
                        else if (type === 'ESIC') {
                            return x.ComplianceName === 'ESIC Challan';
                        }
                        else if (type === 'PF') {
                            return x.ComplianceName === 'PF Challan';
                        }
                        // Baaki cases me direct match
                        else {
                            return x.ComplianceName === type;
                        }

                       
                    })
                    .map(x => {
                        let d = new Date(x.DueDate);
                        let DueDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        return [x.MonthYear, x.ComplianceName, DueDate, x.CStatus];
                    });
            };
            
            
            $scope.getEstablishmentRows = function (type) {
                return $scope.EstablishmentCompliance
                    .filter(x => { 
                        // Agar PT hai to 'PTRC Return' aur 'PTRC Payment' dono include hon
                        if (type === 'Return') {
                            return x.States === 'Return' 
                        }
                        // Agar LWF hai to 'LWF Return' lo (example)
                        else if (type === 'Abstract') {
                            return x.States === 'Abstract';
                        }
                        else if (type === 'Event Based') {
                            return x.States === 'Event Based';
                        } 
                        // Baaki cases me direct match
                        else {
                            return x.States === type;
                        }
                    })
                    .map(x => { 
                        return [x.MonthYear, x.TotalPending, x.TotalComplete, x.States];
                    }); 
            };

            // ✅ Render selected section based on index
            $scope.renderSection = function () {
                $scope.SectionHide = false;

                const section = $scope.complianceSections[currentIndex];
                document.querySelector(".rc-title").textContent = section.title;

                // Render toolbar buttons
                const buttonsEl = document.querySelector(".rc-toolbar");
                buttonsEl.innerHTML = section.buttons.map(
                    btn => `<button class="rc-filter ${btn === section.defaultButton ? 'rc-active' : ''}">${btn}</button>`
                ).join("");

                // Render the table
                $scope.renderTable(section.defaultButton);

                // Rebind filter button clicks
                document.querySelectorAll(".rc-filter").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        document.querySelectorAll(".rc-filter").forEach(b => b.classList.remove("rc-active"));
                        e.target.classList.add("rc-active");
                        $scope.renderTable(e.target.textContent);
                    });
                });
            };

            

            // ✅ Render table for selected compliance type
            


            $scope.renderTable = function (type) {
                const section = $scope.complianceSections[currentIndex];
                let headers = [];
                let rows = [];
 
                if (section.title === "Labour Compliance")
                {
                    headers = ["Month", "Compliance Name", "Due Date", "Status"];
                   
                    rows = $scope.getLabourRows(type);
                }
               else if (type === "Return") { 

                    rows = $scope.getEstablishmentRows(type);
                }
                else if (type === "Abstract") {

                    rows = $scope.getEstablishmentRows(type);
                }
                else if (type === "Event Based") {

                    rows = $scope.getEstablishmentRows(type);
                }
                else {
                    const data = section.data[section.defaultButton];
                    headers = data.headers;
                    rows = data.rows;
                }

                const tableEl = document.querySelector(".rc-table");

                let html = `
        <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${rows.map(r => `
                <tr>
                    ${r.map((c, i) => {
                    if (headers[i] === "States") {
                        const displayText = c.length > 20 ? c.substring(0, 20) + '...' : c;
                        return `<td title="${c}">${displayText}</td>`;
                    } else {
                        return `<td>${c}</td>`;
                    }
                }).join('')}
                </tr>
            `).join('')}
        </tbody>
    `;
                tableEl.innerHTML = html;
            };


            // ✅ Attach next / previous click events after DOM is ready
            $timeout(function () {
                const nextBtn = document.getElementById("nextCompliance");
                const prevBtn = document.getElementById("prevCompliance");

                if (nextBtn && prevBtn) {
                    nextBtn.addEventListener("click", function () {
                        currentIndex = (currentIndex + 1) % $scope.complianceSections.length;
                        $scope.$apply(function () {
                            $scope.renderSection();
                           
                        });
                    });

                    prevBtn.addEventListener("click", function () {
                        currentIndex = (currentIndex - 1 + $scope.complianceSections.length) % $scope.complianceSections.length;
                        $scope.$apply(function () {
                       
                            $scope.renderSection();
                        });
                    });
                }
            }, 0);

            // ✅ Initial render
            $scope.renderSection();
        });
    };

    $scope.Risk = '0';
    let riskChart = null;
    $scope.getriskmatrix = function (type) {
        var collectionobj = {
            Action: 4,
            PartyID: type,
            UserId: LoginId
        };

        var getData = myService.methode(
            'POST',
            "../Retail/bindingcommmonTiles",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            $scope.riskMatrix = response.data.Result.Table || [];

            // 🔸 Get chart canvas safely
            const canvas = document.getElementById("riskMatrixChart");
            if (!canvas) return; // stop if element not found

            const ctx = canvas.getContext("2d");

            // 🔸 Destroy existing chart safely before reusing the canvas
            if (riskChart && typeof riskChart.destroy === "function") {
                riskChart.destroy();
                riskChart = null;
            }

            // 🔸 Wait a short delay to ensure destroy is complete (fixes async rendering bug)
            setTimeout(() => {
                const labels = $scope.riskMatrix.map(x => x.ProbabilityLevel);
                const values = $scope.riskMatrix.map(x => parseFloat(x.Percentage));

                riskChart = new Chart(ctx, {
                    type: "doughnut",
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: ["#8BC34A", "#FFC107", "#E45D27"], // Low, Medium, High
                            borderWidth: 0,
                            cutout: "70%"
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true, position: "bottom" },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        return `${context.label}: ${context.parsed.toFixed(1)}%`;
                                    }
                                }
                            }
                        }
                    }
                });
            }, 50); // small delay ensures proper canvas reuse
        });
    };

     
   
    $scope.financial = '0';
   
    // 🔹 Declare globally at controller level (outside the function)
    let financialChart = null;

    $scope.getfinancialchart = function (type) {
        var collectionobj = {
            Action: 5,
            PartyID: type,
            UserId: LoginId
        };

        var getData = myService.methode(
            'POST',
            "../Retail/bindingcommmonTiles",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {
            $scope.riskgetfinancialchart = response.data.Result.Table || [];

            const data = $scope.riskgetfinancialchart[0] || {};
            const interest = parseFloat(data.TotalInterest) || 0;
            const lateFee = parseFloat(data.TotalLateFee) || 0;
            const fines = parseFloat(data.TotalFines) || 0;
            const penalties = parseFloat(data.TotalPenalities) || 0;
            const other = parseFloat(data.TotalOther) || 0;

            setTimeout(() => {
                const canvas = document.getElementById('financialImpactChart');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');

                // 🔸 Properly destroy existing chart before reusing the same canvas
                if (financialChart instanceof Chart) {
                    financialChart.destroy();
                    financialChart = null;
                }

                // 🔸 Create new chart safely
                financialChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['Interest', 'Late Fee', 'Fines', 'Penalties', 'Other'],
                        datasets: [{
                            data: [interest, lateFee, fines, penalties, other],
                            backgroundColor: [
                                '#E45D27',
                                '#8BC34A',
                                '#FFC107',
                                '#F68B4F',
                                '#F9B68C'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { usePointStyle: true }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        return `${label}: ₹${value.toLocaleString()}`;
                                    }
                                }
                            }
                        }
                    }
                });
            }, 200);
        });
    };



  



    $scope.BindLabourCompliance = function () {
        var collectionobj = {
            Action: 2,
            PartyID: MapId,
            UserId: LoginId
        };

        var getData = myService.methode('POST', "../Retail/bindingcommmonTiles", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.LabourCompliance1 = response.data.Result.Table || [];
         
            $scope.FilteredCompliance = angular.copy($scope.LabourCompliance1);
            $scope.uniqueStates = [...new Set($scope.LabourCompliance1.map(x => x.STATE_NM))];
            $scope.uniqueCompliances = [...new Set($scope.LabourCompliance1.map(x => x.ComplianceName))];
            $scope.ActiveFilter = null;
            $scope.LabourCompliance1.forEach(x => {
                if (x.DueDate) {
                    // Convert properly to local date object
                    const parts = x.DueDate.split('T')[0];
                    x.DueDate = new Date(parts);
                }
            });
            // initialize after HTML renders
            $timeout(() => {
                if (document.getElementById("calendarDays")) {
                    initCalendar($scope.LabourCompliance1);
                } else {
                    console.error("Calendar container not found!");
                }
            }, 500);
        });

        function initCalendar(complianceData) {
            const monthYear = document.getElementById("calendarMonthYear");
            const calendarDays = document.getElementById("calendarDays");
            const prevBtn = document.getElementById("prevMonth");
            const nextBtn = document.getElementById("nextMonth");
            let currentDate = new Date();

            // Tooltip
            let tooltip = document.createElement("div");
            tooltip.id = "calendarTooltip";
            Object.assign(tooltip.style, {
                position: "absolute",
                background: "#333",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: "5px",
                fontSize: "12px",
                display: "none",
                zIndex: "9999",
                pointerEvents: "none"
            });
            document.body.appendChild(tooltip);

            function renderCalendar() {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const today = new Date();

                const monthNames = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];
                monthYear.textContent = `${monthNames[month]} ${year}`;
                calendarDays.innerHTML = "";

                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const firstDayIndex = firstDay.getDay();
                const lastDayIndex = lastDay.getDay();
                const prevLastDay = new Date(year, month, 0);
                const prevDays = prevLastDay.getDate();
                const nextDays = 6 - lastDayIndex;

                // Group compliances by DueDate
                const complianceMap = {};
                complianceData.forEach(item => {
                    if (item.DueDate instanceof Date && !isNaN(item.DueDate)) {
                        const key = item.DueDate.toDateString();
                        if (!complianceMap[key]) complianceMap[key] = [];
                        complianceMap[key].push(item);
                    }
                });

                // Previous month days
                for (let x = firstDayIndex; x > 0; x--) {
                    const div = document.createElement("div");
                    div.classList.add("text-muted");
                    div.textContent = prevDays - x + 1;
                    calendarDays.appendChild(div);
                }

                // Current month days
                for (let i = 1; i <= lastDay.getDate(); i++) {
                    const div = document.createElement("div");
                    div.textContent = i;
                    div.classList.add("calendar-day");
                    const dateKey = new Date(year, month, i).toDateString();

                    // Highlight today
                    if (
                        i === today.getDate() &&
                        month === today.getMonth() &&
                        year === today.getFullYear()
                    ) {
                        div.classList.add("bg-orange", "text-white");
                    }

                    // Compliance marker
                    if (complianceMap[dateKey]) {
                        div.classList.add("border", "border-danger", "fw-bold");
                        div.style.cursor = "pointer";

                        const details = complianceMap[dateKey]
                            .map(c => `<b>${c.ComplianceName}</b> (${c.Act})<br>${c.STATE_NM}`)
                            .join("<hr style='margin:4px 0;border-color:#666;'>");

                        div.addEventListener("mouseenter", e => {
                            tooltip.innerHTML = details;
                            tooltip.style.display = "block";
                            tooltip.style.left = e.pageX + 10 + "px";
                            tooltip.style.top = e.pageY + 10 + "px";
                        });
                        div.addEventListener("mousemove", e => {
                            tooltip.style.left = e.pageX + 10 + "px";
                            tooltip.style.top = e.pageY + 10 + "px";
                        });
                        div.addEventListener("mouseleave", () => {
                            tooltip.style.display = "none";
                        });

                        // click to filter table
                        div.addEventListener("click", () => {
                            $timeout(() => {
                                $scope.FilteredCompliance = complianceMap[dateKey];
                                $scope.ActiveFilter = `Due Date: ${dateKey}`;
                            });
                        });
                    }

                    calendarDays.appendChild(div);
                }

                // Next month days
                for (let j = 1; j <= nextDays; j++) {
                    const div = document.createElement("div");
                    div.classList.add("text-muted");
                    div.textContent = j;
                    calendarDays.appendChild(div);
                }
            }

            prevBtn.addEventListener("click", () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
            nextBtn.addEventListener("click", () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });

            renderCalendar();
        }
    };




    
   
    $scope.ActiveFilter = "";
    $scope.SelectedState = "All";
    $scope.SelectedCompliance = "All";

    $scope.resetFilters = function () {
        $scope.FilteredCompliance = angular.copy($scope.LabourCompliance1);
        $scope.SelectedState = "All";
        $scope.SelectedCompliance = "All";
        $scope.SearchText = "";
        $scope.ActiveDate = null;
        $scope.ActiveFilter = "";
    };

    // ✅ FILTER BY STATE
    $scope.filterByState = function (state) {
        $scope.resetFilters();
        if (state !== "All") {
            $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x => x.STATE_NM === state);
            $scope.ActiveFilter = "state";
            $scope.SelectedState = state;
        }
    };

    // ✅ FILTER BY COMPLIANCE
    $scope.filterByCompliance = function (comp) {
        $scope.resetFilters();
        if (comp !== "All") {
            $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x => x.ComplianceName === comp);
            $scope.ActiveFilter = "compliance";
            $scope.SelectedCompliance = comp;
        }
    };

    // ✅ SEARCH FILTER
    $scope.filterBySearch = function () {
        $scope.resetFilters();
        if ($scope.SearchText && $scope.SearchText.trim() !== "") {
            const term = $scope.SearchText.toLowerCase();
            $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x =>
                (x.ComplianceName && x.ComplianceName.toLowerCase().includes(term)) ||
                (x.STATE_NM && x.STATE_NM.toLowerCase().includes(term)) ||
                (x.Act && x.Act.toLowerCase().includes(term))
            );
            $scope.ActiveFilter = "search";
        }
    };

    // ✅ STATUS FILTER (Today / Upcoming / Overdue)
    $scope.filterByStatus = function (type) {
        $scope.resetFilters();
        const today = new Date();
        $scope.ActiveFilter = type;

        if (type === "Today") {
            $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x => {
                const d = new Date(x.DueDate);
                return d.toDateString() === today.toDateString();
            });
        } else if (type === "Upcoming") {
            $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x => new Date(x.DueDate) > today);
        } else if (type === "Overdue") {
            $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x => new Date(x.DueDate) < today);
        }
    };
    $scope.filterByDate = function (dateObj) {
        $scope.resetFilters();
        $scope.ActiveFilter = "calendar";
        $scope.ActiveDate = dateObj.toDateString();

        $scope.FilteredCompliance = $scope.LabourCompliance1.filter(x => {
            const d = new Date(x.DueDate);
            return d.toDateString() === dateObj.toDateString();
        });
    };

}