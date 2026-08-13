/* ================= Supplier Admin Script ================= */

let userActivityChartInstance = null;
let userStatusChartInstance = null;

document.addEventListener("DOMContentLoaded", function () {

    /* ================= Chart Creator Function ================= */

    function loadOverviewCharts() {

        const activityCanvas = document.getElementById("userActivityChart");
        const statusCanvas = document.getElementById("userStatusChart");

        // Destroy existing charts first (important!)
        if (userActivityChartInstance) {
            userActivityChartInstance.destroy();
            userActivityChartInstance = null;
        }

        if (userStatusChartInstance) {
            userStatusChartInstance.destroy();
            userStatusChartInstance = null;
        }

        // Recreate Activity Chart
        if (activityCanvas) {
            userActivityChartInstance = new Chart(activityCanvas, {
                type: "line",
                data: {
                    labels: ["09 Jan", "10 Jan", "11 Jan", "12 Jan", "13 Jan", "14 Jan", "15 Jan"],
                    datasets: [
                        {
                            label: "Active users",
                            data: [6, 5, 6, 7, 7, 6, 7],
                            borderColor: "#E45D27",
                            backgroundColor: "rgba(228,93,39,0.15)",
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: "Inactive users",
                            data: [1, 2, 1, 0, 0, 1, 0],
                            borderColor: "#bbb",
                            backgroundColor: "rgba(180,180,180,0.15)",
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "top" }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }

        // Recreate Donut Chart
        if (statusCanvas) {
            userStatusChartInstance = new Chart(statusCanvas, {
                type: "doughnut",
                data: {
                    labels: ["Active users", "Inactive users"],
                    datasets: [{
                        data: [7, 3],
                        backgroundColor: ["#E45D27", "#ddd"],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: "70%",
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }

    /* ================= Toggle Buttons Logic ================= */

    const toggleButtons = document.querySelectorAll(
        ".vendorAdminPage .btn-pill"
    );

    const sections = document.querySelectorAll(
        ".vendorAdminPage .section-card"
    );

    toggleButtons.forEach(btn => {
        btn.addEventListener("click", function () {

            toggleButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });

            sections.forEach(sec => {
                sec.classList.add("d-none");
                sec.classList.remove("active");
            });

            this.classList.add("active");
            this.setAttribute("aria-pressed", "true");

            const target = document.querySelector(this.dataset.target);

            if (target) {
                target.classList.remove("d-none");
                target.classList.add("active");

                // If Overview opened → reload charts
                if (target.id === "overview") {
                    setTimeout(function () {
                        loadOverviewCharts();
                    }, 100);
                }
            }
        });
    });

    /* ================= Initial Load ================= */

    loadOverviewCharts();

});

/*===========Dropdown logic inside add party modal=============*/
document.addEventListener("DOMContentLoaded", function () {

    const wrapper = document.querySelector(".vendor-search-wrapper");
    const input = wrapper.querySelector(".vendor-search-input");
    const menu = wrapper.querySelector(".vendor-search-menu");
    const items = menu.querySelectorAll(".dropdown-item");

    input.addEventListener("input", function () {
        const value = this.value.toLowerCase();
        let hasMatch = false;

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(value) && value !== "") {
                item.style.display = "block";
                hasMatch = true;
            } else {
                item.style.display = "none";
            }
        });

        menu.classList.toggle("show", hasMatch);
    });

    items.forEach(item => {
        item.addEventListener("click", function () {
            input.value = this.textContent;
            menu.classList.remove("show");
        });
    });

    document.addEventListener("click", function (e) {
        if (!e.target.closest(".vendor-search-wrapper")) {
            menu.classList.remove("show");
        }
    });

});


