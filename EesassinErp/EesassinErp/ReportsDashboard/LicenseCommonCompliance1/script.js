/* ================= License Common Compliance Chart ================= */
(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const ctx = document.getElementById("licCommonComplianceChart");
        if (!ctx) return;

        new Chart(ctx, {
            type: "bar",
            data: {
                labels: [
                    "Factory License",
                    "Fire NOC",
                    "FSSAI License",
                    "Health Trade (Eating House)",
                    "Music License",
                    "Pollution NOC - CTE",
                    "Pollution NOC - CTO",
                    "Shop & Establishment Registration",
                    "Signage License",
                    "Health Trade (Eating House)",
                    "Music License",
                    "Pollution NOC - CTE",
                    "Pollution NOC - CTO",
                    "Shop & Establishment Registration",
                    "Signage License",
                    "Trade License"
                ],
                datasets: [{
                    label: "Number of Licenses",
                    data: [1, 7, 12, 1, 4, 8, 5, 8, 6, 11, 4, 8, 5, 8, 6, 11],
                    backgroundColor: "rgba(228, 93, 39, 0.85)",
                    borderRadius: 6,
                    maxBarThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: "#222",
                        titleColor: "#fff",
                        bodyColor: "#fff",
                        padding: 10,
                        cornerRadius: 6
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            color: "#333",
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 2,
                            color: "#333",
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: "rgba(0,0,0,0.06)"
                        }
                    }
                }
            }
        });
    });
})();


/* ================= Smart Search Logic ================= */
(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const input = document.getElementById("licSmartSearch");
        const dropdown = document.getElementById("licSearchDropdown");
        if (!input || !dropdown) return;

        /* Demo data pulled from filter options */
        const searchData = {
            Region: ["Central", "North", "East", "West", "South"],
            "License Status": ["Applied", "Not Applied", "Issued"],
            "Expiry Status": ["Expiring Soon", "Expired"],
            "License Stage": ["Fresh", "Old", "Renewed"],
            "Outlet Name": ["DemoSN1", "DemoSN2", "DemoSN3"],
            "License Type": ["Factory License", "Fire NOC", "FSSAI License", "Trade License"],
            State: ["Assam", "Bihar", "Chandigarh", "Delhi"],
            Address: ["Location1", "Location2"]
        };

        input.addEventListener("input", function () {
            const value = this.value.trim().toLowerCase();
            dropdown.innerHTML = "";

            if (!value) {
                dropdown.classList.add("d-none");
                return;
            }

            let hasResults = false;

            Object.keys(searchData).forEach(group => {
                const matches = searchData[group].filter(item =>
                    item.toLowerCase().includes(value)
                );

                if (matches.length) {
                    hasResults = true;

                    const header = document.createElement("div");
                    header.className = "search-group";
                    header.textContent = group;
                    dropdown.appendChild(header);

                    matches.forEach(text => {
                        const item = document.createElement("div");
                        item.className = "search-item";
                        item.textContent = text;

                        item.addEventListener("click", function () {
                            input.value = text;
                            dropdown.classList.add("d-none");

                            /* Simulate filter apply + auto Go */
                            document.querySelector(".licCommonCompPage .go-btn")?.click();
                        });

                        dropdown.appendChild(item);
                    });
                }
            });

            dropdown.classList.toggle("d-none", !hasResults);
        });

        document.addEventListener("click", function (e) {
            if (!e.target.closest(".licCommonCompPage-search")) {
                dropdown.classList.add("d-none");
            }
        });
    });
})();

/*================= Toggle Buttons Logic ================= */
document.addEventListener("DOMContentLoaded", function () {

    const toggleButtons = document.querySelectorAll(
        ".licCommonCompPage .btn-pill"
    );

    const sections = document.querySelectorAll(
        ".licCommonCompPage .section-card"
    );

    toggleButtons.forEach(btn => {
        btn.addEventListener("click", function () {

            // Remove active state from buttons
            toggleButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });

            // Hide all sections
            sections.forEach(sec => {
                sec.classList.add("d-none");
                sec.classList.remove("active");
            });

            // Activate clicked button
            this.classList.add("active");
            this.setAttribute("aria-pressed", "true");

            // Show target section
            const target = document.querySelector(this.dataset.target);
            if (target) {
                target.classList.remove("d-none");
                target.classList.add("active");
            }
        });
    });

});


/*================= Expiry Report Pagination Logic ================= */
(function () {
    document.addEventListener("DOMContentLoaded", function () {

        const root = document.querySelector(".licCommonCompPage");
        if (!root) return;

        const tableBody = root.querySelector("#exLicTableBody");
        const prevBtn = root.querySelector("#exLicPrev");
        const nextBtn = root.querySelector("#exLicNext");
        const viewAllBtn = root.querySelector("#viewAllRows");
        const paginationWrap = root.querySelector("#exLicPaginationWrap");
        const pageInfo = root.querySelector("#exLicPageInfo");

        if (!tableBody) return;

        const allRows = Array.from(tableBody.querySelectorAll("tr"));
        let currentPage = 1;
        const pageSize = 10;
        let showingAll = false;

        function renderPage() {
            tableBody.innerHTML = "";

            if (showingAll) {
                allRows.forEach(r => tableBody.appendChild(r));
                paginationWrap.style.display = "none";
                pageInfo.textContent = `${allRows.length} rows shown`;
                return;
            }

            paginationWrap.style.display = "flex";

            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;

            allRows.slice(start, end).forEach(r => tableBody.appendChild(r));
            pageInfo.textContent =
                `Showing ${start + 1} - ${Math.min(end, allRows.length)} of ${allRows.length}`;
        }

        prevBtn?.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });

        nextBtn?.addEventListener("click", () => {
            if (currentPage < Math.ceil(allRows.length / pageSize)) {
                currentPage++;
                renderPage();
            }
        });

        viewAllBtn?.addEventListener("click", () => {
            showingAll = !showingAll;
            viewAllBtn.textContent = showingAll ? "Show 10 Rows" : "View All Rows";
            renderPage();
        });

        /* 🔁 Re-render when Expiry tab is activated */
        root.querySelectorAll('.btn-pill').forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.textContent.trim() === "Expiry Report") {
                    setTimeout(renderPage, 50);
                }
            });
        });

        renderPage();
    });
})();

/*================= License Report : Insights (Scoped) =================*/
    document.addEventListener("DOMContentLoaded", function () {

        /* ================= License Status Distribution ================= */
        new Chart(document.getElementById("licStatusDonut"), {
            type: "doughnut",
            data: {
                labels: ["Active", "Expiring Soon", "Expired", "Pending Approval"],
                datasets: [{
                    data: [3, 2, 1, 1],
                    backgroundColor: ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"],
                    borderWidth: 2,
                    borderColor: "#fff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: "70%"
            }
        });

    /* ================= Risk Assessment ================= */
    new Chart(document.getElementById("riskDonut"), {
        type: "doughnut",
    data: {
        datasets: [{
        data: [12, 88],
            backgroundColor: ["#E45D27", "#e5e7eb"],
    borderWidth: 0
            }]
        },
    options: {
        responsive: true,
    maintainAspectRatio: false,
    plugins: {legend: {display: false } },
    cutout: "80%"
        }
    });

    /* ================= Document Status ================= */
    new Chart(document.getElementById("docStatusBar"), {
        type: "bar",
    data: {
        labels: ["Pending", "Active", "Completed"],
    datasets: [{
        data: [15, 19, 16],
    backgroundColor: ["#f59e0b", "#3b82f6", "#22c55e"],
    borderRadius: 6,
    barThickness: 14
            }]
        },
    options: {
        indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {legend: {display: false } },
    scales: {
        x: {
        grid: {display: false },
    ticks: {precision: 0 }
                },
    y: {
        grid: {display: false }
                }
            }
        }
    });

        /* ================= Licenses by Category ================= */
        new Chart(document.getElementById("licensesByCategory"), {
            type: "bar",
            data: {
                labels: ["Business", "Safety", "Trade", "Insurance", "Business", "Safety", "Trade", "Insurance"],
                datasets: [{
                    data: [1, 3, 2, 1, 4, 6, 2, 5],  // Dummy values
                    backgroundColor: "#E45D27",
                    borderRadius: 6,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
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

        /* ================= Expiry Timeline (6 Months) ================= */
        new Chart(document.getElementById("expiryTimeline"), {
            type: "line",
            data: {
                labels: ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026"],
                datasets: [
                    {
                        label: "Expiring",
                        data: [1, 2, 1, 0, 0, 0],
                        backgroundColor: "rgba(245, 158, 11, 0.3)",
                        borderColor: "#f59e0b",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: "Renewed",
                        data: [0, 0, 1, 1, 0, 0],
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

    
});

