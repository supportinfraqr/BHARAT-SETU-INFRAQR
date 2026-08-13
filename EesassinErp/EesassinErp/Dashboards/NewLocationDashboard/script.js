/////* ================= Container 2 Charts ================= */
////(function () {
////    document.addEventListener("DOMContentLoaded", function () {

////        const donutConfig = (value, total, color) => ({
////            type: "doughnut",
////            data: {
////                datasets: [{
////                    data: [value, total - value],
////                    backgroundColor: [color, "#eee"],
////                    borderWidth: 0
////                }]
////            },
////            options: {
////                cutout: "70%",
////                plugins: {
////                    legend: { display: false },
////                    tooltip: { enabled: false }
////                }
////            }
////        });

////        new Chart(document.getElementById("budgetedChart"),
////            donutConfig(35, 100, "#E45D27"));

////        new Chart(document.getElementById("locationDaysChart"),
////            donutConfig(20, 10, "#E45D27"));

////        new Chart(document.getElementById("actualDaysChart"),
////            donutConfig(5, 10, "#E45D27"));
////    });
////})();


/* ================= Container 3 Charts ================= */
(function () {
    document.addEventListener("DOMContentLoaded", function () {

        if (typeof Chart === "undefined") return;

        /* ----- Location Document Bar Chart ----- */
        new Chart(document.getElementById("locationDocumentChart"), {
            type: "bar",
            data: {
                labels: [
                    "Electric Bill",
                    "Lease / LOI",
                    "Property Tax Receipt",
                    "Fire NOC",
                    "Pollution",
                    "Ownership Docs",
                    "Additional Doc Name"
                ],
                datasets: [{
                    data: [2.6, 2.6, 1.0, 1.0, 1.0, 1.6, 1.0],
                    backgroundColor: [
                        "#E45D27",
                        "#E45D27",
                        "#E45D27",
                        "#E45D27",
                        "#E45D27",
                        "#E45D27",
                        "#E45D27"
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "#e6e6e6" }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        /* ----- Distribution Donut Chart ----- */
        new Chart(document.getElementById("locationDistributionChart"), {
            type: "doughnut",
            data: {
                labels: ["East", "West", "North", "South", "Central"],
                datasets: [{
                    data: [46, 27, 51, 30, 31],
                    backgroundColor: [
                        "#5b74d6",
                        "#7ac36a",
                        "#f7c64b",
                        "#ef6461",
                        "#6ec1e4"
                    ],
                    borderWidth: 4
                }]
            },
            options: {
                cutout: "65%",
                plugins: {
                    legend: {
                        position: "left",
                        labels: {
                            boxWidth: 14,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });

    });
})();


/* =========Container 4 Table ==============*/
(function () {
    document.addEventListener("DOMContentLoaded", function () {

        const root = document.querySelector(".locationDashPage");
        if (!root) return;

        /* ===== PAGINATION ===== */
        const tableBody = root.querySelector("#locationDashTableBody");
        const prevBtn = root.querySelector("#locationDashPrev");
        const nextBtn = root.querySelector("#locationDashNext");
        const viewAllBtn = root.querySelector("#viewAllRows");
        const paginationWrap = root.querySelector("#locationDashPaginationWrap");
        const pageInfo = root.querySelector("#locationDashPageInfo");

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

            paginationWrap.style.display = "";

            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;

            allRows.slice(start, end).forEach(r => tableBody.appendChild(r));
            pageInfo.textContent = `Showing ${start + 1} - ${Math.min(end, allRows.length)} of ${allRows.length}`;
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

        renderPage();
    });
})();