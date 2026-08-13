////// Toggle search field with animation
////const searchIcon = document.getElementById("search-icon");
////const searchField = document.getElementById("search-field");
////const searchWrapper = document.querySelector(".search-wrapper");

//////searchIcon.addEventListener("click", (e) => {
//////    e.stopPropagation(); // prevent body click
//////    searchField.classList.toggle("show");
//////    if (searchField.classList.contains("show")) searchField.focus();
//////});

////// Close search when clicking outside
////document.body.addEventListener("click", (e) => {
////    if (!searchWrapper.contains(e.target)) {
////        searchField.classList.remove("show");
////    }
////});

////// Handle role selection
////const roles = document.querySelectorAll(".role-option");
////const selectedRole = document.getElementById("selected-role");

////roles.forEach(role => {
////    role.addEventListener("click", e => {
////        e.preventDefault();
////        selectedRole.textContent = role.textContent;
////    });
////});



////// Toggle active state on filter buttons(left-bottom Container1)
////document.querySelectorAll('.filter-btn').forEach(btn => {
////    btn.addEventListener('click', () => {
////        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
////        btn.classList.add('active');
////    });
////});




////document.addEventListener("DOMContentLoaded", function () {
////    const monthYear = document.getElementById("calendarMonthYear");
////    const calendarDays = document.getElementById("calendarDays");
////    const prevBtn = document.getElementById("prevMonth");
////    const nextBtn = document.getElementById("nextMonth");

////    let currentDate = new Date();

////    function renderCalendar() {
////        const year = currentDate.getFullYear();
////        const month = currentDate.getMonth();

////        // Month names
////        const monthNames = [
////            "January", "February", "March", "April", "May", "June",
////            "July", "August", "September", "October", "November", "December"
////        ];

////        // Update header
////        monthYear.textContent = `${monthNames[month]} ${year}`;

////        // Clear old days
////        calendarDays.innerHTML = "";

////        // Get first and last day info
////        const firstDay = new Date(year, month, 1);
////        const lastDay = new Date(year, month + 1, 0);

////        const prevLastDay = new Date(year, month, 0);
////        const prevDays = prevLastDay.getDate();
////        const firstDayIndex = firstDay.getDay();
////        const lastDayIndex = lastDay.getDay();
////        const nextDays = 6 - lastDayIndex;

////        const today = new Date();

////        // Previous month dates
////        for (let x = firstDayIndex; x > 0; x--) {
////            const div = document.createElement("div");
////            div.classList.add("text-muted");
////            div.textContent = prevDays - x + 1;
////            calendarDays.appendChild(div);
////        }

////        // Current month dates
////        for (let i = 1; i <= lastDay.getDate(); i++) {
////            const div = document.createElement("div");
////            div.textContent = i;

////            // Highlight current day
////            if (
////                i === today.getDate() &&
////                month === today.getMonth() &&
////                year === today.getFullYear()
////            ) {
////                div.classList.add("bg-orange", "text-white", "rounded-circle");
////            }

////            calendarDays.appendChild(div);
////        }

////        // Next month dates
////        for (let j = 1; j <= nextDays; j++) {
////            const div = document.createElement("div");
////            div.classList.add("text-muted");
////            div.textContent = j;
////            calendarDays.appendChild(div);
////        }
////    }

////    // Navigation buttons
////    //prevBtn.addEventListener("click", () => {
////    //    currentDate.setMonth(currentDate.getMonth() - 1);
////    //    renderCalendar();
////    //});

////    //nextBtn.addEventListener("click", () => {
////    //    currentDate.setMonth(currentDate.getMonth() + 1);
////    //    renderCalendar();
////    //});

////    renderCalendar(); // initial load
////});






/////* ========== Container 1 Right Section: Dynamic Compliance Scripting ========== */

////const complianceSections = [
////    //{
////    //    title: "Payroll Compliance",
////    //    buttons: ["PF", "ESIC", "PT", "LWF"],
////    //    defaultButton: "PF",
////    //    data: {
////    //        PF: {
////    //            headers: ["Month", "Type", "Due Date", "Compliance Date", "Status"],
////    //            rows: [
////    //                ["Oct 2025", "PF", "25 Oct", "26 Oct", "Complied"],
////    //                ["Oct 2025", "PF", "25 Oct", "-", "Overdue"],
////    //                ["Sep 2025", "PF", "25 Sep", "25 Sep", "Complied"],
////    //                ["Aug 2025", "PF", "25 Aug", "25 Aug", "Complied"],
////    //                ["Jul 2025", "PF", "25 Jul", "27 Jul", "Pending"],
////    //                ["Jun 2025", "PF", "25 Jun", "26 Jun", "Complied"],
////    //                ["May 2025", "PF", "25 May", "26 May", "Complied"],
////    //                ["Apr 2025", "PF", "25 Apr", "26 Apr", "Pending"],
////    //                ["Sep 2025", "PF", "25 Sep", "25 Sep", "Complied"],
////    //                ["Aug 2025", "PF", "25 Aug", "25 Aug", "Complied"],
////    //                ["Jul 2025", "PF", "25 Jul", "27 Jul", "Pending"],
////    //                ["Jun 2025", "PF", "25 Jun", "26 Jun", "Complied"],
////    //            ],
////    //        },
////    //        ESIC: {
////    //            headers: ["Month", "Type", "Due Date", "Compliance Date", "Status"],
////    //            rows: [
////    //                ["Oct 2025", "ESIC", "15 Oct", "-", "Overdue"],
////    //                ["Sep 2025", "ESIC", "15 Sep", "15 Sep", "Complied"],
////    //                ["Aug 2025", "ESIC", "15 Aug", "15 Aug", "Complied"],
////    //                ["Jul 2025", "ESIC", "15 Jul", "-", "Pending"],
////    //                ["Jun 2025", "ESIC", "15 Jun", "16 Jun", "Complied"],
////    //                ["May 2025", "ESIC", "15 May", "15 May", "Complied"],
////    //                ["Oct 2025", "ESIC", "15 Oct", "-", "Overdue"],
////    //                ["Sep 2025", "ESIC", "15 Sep", "15 Sep", "Complied"],
////    //                ["Aug 2025", "ESIC", "15 Aug", "15 Aug", "Complied"],
////    //                ["Jul 2025", "ESIC", "15 Jul", "-", "Pending"],
////    //                ["Jun 2025", "ESIC", "15 Jun", "16 Jun", "Complied"],
////    //                ["May 2025", "ESIC", "15 May", "15 May", "Complied"],
////    //            ],
////    //        },
////    //        PT: {
////    //            headers: ["Month", "Type", "Due Date", "Compliance Date", "Status"],
////    //            rows: [
////    //                ["Oct 2025", "PT", "20 Oct", "20 Oct", "Complied"],
////    //                ["Sep 2025", "PT", "20 Sep", "20 Sep", "Complied"],
////    //                ["Aug 2025", "PT", "20 Aug", "-", "Overdue"],
////    //                ["Jul 2025", "PT", "20 Jul", "21 Jul", "Complied"],
////    //                ["Jun 2025", "PT", "20 Jun", "20 Jun", "Complied"],
////    //                ["Oct 2025", "PT", "20 Oct", "20 Oct", "Complied"],
////    //                ["Sep 2025", "PT", "20 Sep", "20 Sep", "Complied"],
////    //                ["Aug 2025", "PT", "20 Aug", "-", "Overdue"],
////    //                ["Jul 2025", "PT", "20 Jul", "21 Jul", "Complied"],
////    //                ["Jun 2025", "PT", "20 Jun", "20 Jun", "Complied"],
////    //            ],
////    //        },
////    //        LWF: {
////    //            headers: ["Month", "Type", "Due Date", "Compliance Date", "Status"],
////    //            rows: [
////    //                ["Oct 2025", "LWF", "10 Oct", "-", "Pending"],
////    //                ["Sep 2025", "LWF", "10 Sep", "10 Sep", "Complied"],
////    //                ["Aug 2025", "LWF", "10 Aug", "-", "Pending"],
////    //                ["Jul 2025", "LWF", "10 Jul", "10 Jul", "Complied"],
////    //                ["Jun 2025", "LWF", "10 Jun", "11 Jun", "Overdue"],
////    //                ["Oct 2025", "LWF", "10 Oct", "-", "Pending"],
////    //                ["Sep 2025", "LWF", "10 Sep", "10 Sep", "Complied"],
////    //                ["Aug 2025", "LWF", "10 Aug", "-", "Pending"],
////    //                ["Jul 2025", "LWF", "10 Jul", "10 Jul", "Complied"],
////    //                ["Jun 2025", "LWF", "10 Jun", "11 Jun", "Overdue"],
////    //            ],
////    //        },
////    //    },
////    //},
////    //{
////    //    title: "Establishment Compliance",
////    //    buttons: ["Register", "Return", "Abstract", "Event Based"],
////    //    defaultButton: "Register",
////    //    data: {
////    //        Register: {
////    //            headers: ["Month", "Total", "Completed", "Pending Location"],
////    //            rows: [
////    //                ["Oct 2025", "15", "10", "Delhi"],
////    //                ["Sep 2025", "20", "17", "Mumbai"],
////    //                ["Aug 2025", "22", "18", "Hyderabad"],
////    //                ["Jul 2025", "25", "23", "Chennai"],
////    //                ["Jun 2025", "12", "10", "Pune"],
////    //                ["May 2025", "14", "12", "Bangalore"],
////    //                ["Apr 2025", "18", "15", "Kolkata"],
////    //                ["Mar 2025", "16", "12", "Indore"],
////    //                ["Oct 2025", "15", "10", "Delhi"],
////    //                ["Sep 2025", "20", "17", "Mumbai"],
////    //                ["Aug 2025", "22", "18", "Hyderabad"],
////    //                ["Jul 2025", "25", "23", "Chennai"],
////    //                ["Jun 2025", "12", "10", "Pune"],
////    //                ["May 2025", "14", "12", "Bangalore"],
////    //                ["Apr 2025", "18", "15", "Kolkata"],
////    //                ["Mar 2025", "16", "12", "Indore"],
////    //            ],
////    //        },
////    //        Return: {
////    //            headers: ["Act Name", "Total Location", "Filing Status"],
////    //            rows: [
////    //                ["Shops & Establishment", "8", "Filed"],
////    //                ["Contract Labour Act", "6", "Pending"],
////    //                ["Minimum Wages Act", "5", "Filed"],
////    //                ["Payment of Bonus Act", "7", "Filed"],
////    //                ["Payment of Wages Act", "9", "Pending"],
////    //                ["Shops & Establishment", "8", "Filed"],
////    //                ["Contract Labour Act", "6", "Pending"],
////    //                ["Minimum Wages Act", "5", "Filed"],
////    //                ["Payment of Bonus Act", "7", "Filed"],
////    //                ["Payment of Wages Act", "9", "Pending"],
////    //            ],
////    //        },
////    //        Abstract: {
////    //            headers: ["Location Count", "Display Date", "Display Status"],
////    //            rows: [
////    //                ["12", "10 Oct 2025", "Displayed"],
////    //                ["15", "11 Oct 2025", "Displayed"],
////    //                ["10", "-", "Not Displayed"],
////    //                ["8", "09 Oct 2025", "Displayed"],
////    //                ["9", "-", "Not Displayed"],
////    //                ["12", "10 Oct 2025", "Displayed"],
////    //                ["15", "11 Oct 2025", "Displayed"],
////    //                ["10", "-", "Not Displayed"],
////    //                ["8", "09 Oct 2025", "Displayed"],
////    //                ["9", "-", "Not Displayed"],
////    //            ],
////    //        },
////    //        "Event Based": {
////    //            headers: ["Task Name", "Completion Status"],
////    //            rows: [
////    //                ["License Renewal", "Completed"],
////    //                ["Labour Return Submission", "Pending"],
////    //                ["Welfare Registration", "Completed"],
////    //                ["Contract Audit", "Pending"],
////    //                ["License Renewal", "Completed"],
////    //                ["Labour Return Submission", "Pending"],
////    //                ["Welfare Registration", "Completed"],
////    //                ["Contract Audit", "Pending"],
////    //                ["License Renewal", "Completed"],
////    //                ["Labour Return Submission", "Pending"],
////    //                ["Welfare Registration", "Completed"],
////    //                ["Contract Audit", "Pending"],
////    //            ],
////    //        },
////    //    },
////    //},
////    //{
////    //    title: "Factory Compliance",
////    //    buttons: ["Register", "Return", "Abstract", "Event Based"],
////    //    defaultButton: "Register",
////    //    data: {
////    //        Register: {
////    //            headers: ["Month", "Total", "Completed", "Pending Location"],
////    //            rows: [
////    //                ["Oct 2025", "10", "8", "Surat"],
////    //                ["Sep 2025", "12", "10", "Vadodara"],
////    //                ["Aug 2025", "15", "14", "Pune"],
////    //                ["Jul 2025", "18", "15", "Delhi"],
////    //                ["Jun 2025", "20", "19", "Bangalore"],
////    //                ["May 2025", "25", "22", "Chennai"],
////    //                ["Oct 2025", "10", "8", "Surat"],
////    //                ["Sep 2025", "12", "10", "Vadodara"],
////    //                ["Aug 2025", "15", "14", "Pune"],
////    //                ["Jul 2025", "18", "15", "Delhi"],
////    //                ["Jun 2025", "20", "19", "Bangalore"],
////    //                ["May 2025", "25", "22", "Chennai"],
////    //            ],
////    //        },
////    //        Return: {
////    //            headers: ["Act Name", "Total Location", "Filing Status"],
////    //            rows: [
////    //                ["Factories Act", "10", "Filed"],
////    //                ["Fire Safety Return", "8", "Pending"],
////    //                ["Health & Safety Return", "6", "Filed"],
////    //                ["Waste Management Return", "9", "Pending"],
////    //                ["Factories Act", "10", "Filed"],
////    //                ["Fire Safety Return", "8", "Pending"],
////    //                ["Health & Safety Return", "6", "Filed"],
////    //                ["Waste Management Return", "9", "Pending"],
////    //                ["Factories Act", "10", "Filed"],
////    //                ["Fire Safety Return", "8", "Pending"],
////    //                ["Health & Safety Return", "6", "Filed"],
////    //                ["Waste Management Return", "9", "Pending"],
////    //            ],
////    //        },
////    //        Abstract: {
////    //            headers: ["Location Count", "Display Date", "Display Status"],
////    //            rows: [
////    //                ["10", "01 Oct 2025", "Displayed"],
////    //                ["8", "-", "Not Displayed"],
////    //                ["12", "02 Oct 2025", "Displayed"],
////    //                ["10", "01 Oct 2025", "Displayed"],
////    //                ["8", "-", "Not Displayed"],
////    //                ["12", "02 Oct 2025", "Displayed"],
////    //                ["10", "01 Oct 2025", "Displayed"],
////    //                ["8", "-", "Not Displayed"],
////    //                ["12", "02 Oct 2025", "Displayed"],
////    //            ],
////    //        },
////    //        "Event Based": {
////    //            headers: ["Task Name", "Completion Status"],
////    //            rows: [
////    //                ["Machinery Inspection", "Completed"],
////    //                ["Health Audit", "Pending"],
////    //                ["Emergency Drill", "Completed"],
////    //                ["Machinery Inspection", "Completed"],
////    //                ["Health Audit", "Pending"],
////    //                ["Emergency Drill", "Completed"],
////    //                ["Machinery Inspection", "Completed"],
////    //                ["Health Audit", "Pending"],
////    //                ["Emergency Drill", "Completed"],
////    //                ["Machinery Inspection", "Completed"],
////    //                ["Health Audit", "Pending"],
////    //                ["Emergency Drill", "Completed"],
////    //            ],
////    //        },
////    //    },
////    //},
////];

////// DOM elements
//////let currentIndex = 0;
//////const titleEl = document.getElementById("complianceTitle");
//////const buttonsEl = document.getElementById("complianceButtons");
//////const theadEl = document.getElementById("complianceThead");
//////const tbodyEl = document.getElementById("complianceTbody");
//////const stateSelect = document.getElementById("stateSelect");
//////const regSelect = document.getElementById("regSelect");

//////function renderSection() {
//////    const section = complianceSections[currentIndex];
//////    titleEl.textContent = section.title;

//////    // Render toolbar buttons
//////    buttonsEl.innerHTML = section.buttons
//////        .map(
//////            (btn) =>
//////                `<button class="rc-filter ${btn === section.defaultButton ? "rc-active" : ""
//////                }">${btn}</button>`
//////        )
//////        .join("");

//////    renderTable(section.defaultButton);

//////    // Attach click handlers
//////    document.querySelectorAll(".rc-filter").forEach((btn) => {
//////        btn.addEventListener("click", (e) => {
//////            document
//////                .querySelectorAll(".rc-filter")
//////                .forEach((b) => b.classList.remove("rc-active"));
//////            e.target.classList.add("rc-active");
//////            renderTable(e.target.textContent);
//////        });
//////    });
//////}

//////function renderTable(activeBtn) {
//////    const section = complianceSections[currentIndex];
//////    const data = section.data[activeBtn];
//////    if (!data) return;

//////    // Headers
//////    theadEl.innerHTML = `<tr>${data.headers
//////        .map((h) => `<th>${h}</th>`)
//////        .join("")}</tr>`;

//////    // Rows
//////    tbodyEl.innerHTML = data.rows
//////        .map(
//////            (row) =>
//////                `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
//////        )
//////        .join("");

//////    applyFilters();
//////}

//////// Filtering logic
//////function applyFilters() {
//////    const selectedState =
//////        stateSelect.value !== "Choose State" ? stateSelect.value.toLowerCase() : "";
//////    const selectedReg =
//////        regSelect.value !== "Registration No." ? regSelect.value.toLowerCase() : "";

//////    Array.from(tbodyEl.querySelectorAll("tr")).forEach((tr) => {
//////        const text = tr.textContent.toLowerCase();
//////        const stateMatch = selectedState ? text.includes(selectedState) : true;
//////        const regMatch = selectedReg ? text.includes(selectedReg) : true;
//////        tr.style.display = stateMatch && regMatch ? "" : "none";
//////    });
//////}

////// Navigation
//////document.getElementById("nextCompliance").addEventListener("click", () => {
//////    currentIndex = (currentIndex + 1) % complianceSections.length;
//////    renderSection();
//////});

//////document.getElementById("prevCompliance").addEventListener("click", () => {
//////    currentIndex = (currentIndex - 1 + complianceSections.length) % complianceSections.length;
//////    renderSection();
//////});

////// Filters
//////stateSelect.addEventListener("change", applyFilters);
//////regSelect.addEventListener("change", applyFilters);

//////// Initial render
//////renderSection();






/////* ========= CONTAINER 2 ========= --*/
 
//////const ctx2 = document.getElementById("licensesChart").getContext("2d");
//////const licensesChart2 = new Chart(ctx2, {
//////    type: "bar",
//////    data: {
//////        labels: ["Factory", "PT", "ESIC", "Shops", "Pollution", "Trade", "Fire", "Food", "Water", "Labour", "Safety", "Wages", "LWF", "Contract", "Testing", "Environmental", "Storage"],
//////        datasets: [{
//////            data: [4, 6, 7, 5, 8, 3, 6, 7, 9, 4, 5, 6, 8, 4, 6, 5, 7],
//////            backgroundColor: "#E45D27",
//////            borderRadius: 6,
//////            barThickness: 10
//////        }]
//////    },
//////    options: {
//////        responsive: true,
//////        maintainAspectRatio: false,
//////        plugins: { legend: { display: false } },
//////        scales: {
//////            x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
//////            y: { beginAtZero: true, ticks: { stepSize: 2 } }
//////        }
//////    }
////// });

  
////// new ResizeObserver(() => licensesChart2.resize()).observe(document.getElementById("container2"));

//////// Checkbox: select all
//////document.getElementById("selectAll2").addEventListener("change", function () {
//////    document.querySelectorAll(".row-checkbox2").forEach(cb => cb.checked = this.checked);
//////});



/////* ========= CONTAINER 3 ========= --*/



////// Placeholder: Search input functional logic to be handled by backend
////// Example filter:
////document.querySelector('#container3 .search-input').addEventListener('input', function (e) {
////    const val = e.target.value.toLowerCase();
////    document.querySelectorAll('#container3 tbody tr').forEach(row => {
////        row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
////    });
////});





////// ========= CONTAINER 4 =========


////document.addEventListener('DOMContentLoaded', () => {
////    // ---------- Risk Matrix ----------
////    const rCtx = document.getElementById('riskMatrixChart').getContext('2d');
////    //new Chart(rCtx, {
////    //    type: 'doughnut',
////    //    data: {
////    //        labels: [],
////    //        datasets: [
               
////    //        ]
////    //    },
////    //    options: {
////    //        responsive: true,
////    //        maintainAspectRatio: false,
////    //        plugins: { legend: { display: false } }
////    //    }
////    //});

////    // ---------- Financial Impact ----------
////   // const fCtx = document.getElementById('financialImpactChart').getContext('2d');
////   //new Chart(fCtx, {
////    //    type: 'pie',
////    //    data: {
////    //        labels: ['Interest', 'Late Fee', 'Fines', 'Penalties', 'Other'],
////    //        datasets: [{
////    //            data: [3500, 1800, 1200, 2200, 800],
////    //            backgroundColor: ['#E45D27', '#8BC34A', '#FFC107', '#F68B4F', '#F9B68C'],
////    //            borderWidth: 0
////    //        }]
////    //    },
////    //    options: {
////    //        responsive: true,
////    //        maintainAspectRatio: false,
////    //        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }
////    //    }
////    //});

////    // resize observer
////    new ResizeObserver(() => {
////        if (window.Chart) {
////            Chart.getChart('riskMatrixChart')?.resize();
////         //   Chart.getChart('financialImpactChart')?.resize();
////        }
////    }).observe(document.getElementById('container4'));
////});