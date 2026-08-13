// Ring Drawing – Static Ready
    (function () {
        document.addEventListener("DOMContentLoaded", function () {
            document.querySelectorAll(".vendorDashboard #container1 .vendor-c1-ring")
                .forEach(function (ring) {

                    const percent = Number(ring.dataset.percent || 0);
                    const color = ring.dataset.color || "#E45D27";

                    ring.style.background =
                        `conic-gradient(${color} ${percent * 3.6}deg, transparent 0deg)`;
                });
        });
})();


// Line chart
(function () {
    document.addEventListener("DOMContentLoaded", function () {

        /* ================= Compliance Score Chart ================= */
        const ctx = document.getElementById("licensesChart");
        if (!ctx) return;

        new Chart(ctx, {
            type: "line",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                    label: "Compliance Score",
                    data: [40, 55, 50, 65, 60, 75],
                    borderColor: "#E45D27",
                    backgroundColor: "rgba(228,93,39,0.15)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: { size: 10 }
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 10 }
                        }
                    }
                }
            }
        });

    });
})();


document.addEventListener('DOMContentLoaded', function () {

    /* ================= INVOICE COMPLIANCE (LINE) ================= */
    const invoiceCanvas = document.getElementById('invoiceComplianceChartCanvas');

    if (invoiceCanvas) {
        new Chart(invoiceCanvas, {
            type: 'line',
            data: {
                labels: ['2025', '2026', '2027', '2028'],
                datasets: [
                    {
                        label: 'New Invoice',
                        data: [0.9, 0.1, 0, 0],
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: 'Pending Invoice',
                        data: [0, 0, 0, 0],
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: 'Completed Invoice',
                        data: [1, 0, 0, 0],
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'start',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 1,
                        ticks: {
                            stepSize: 0.25
                        }
                    }
                }
            }
        });
    }

    /* ================= AUDITOR COMPLIANCE (BAR) ================= */
    const auditorCanvas = document.getElementById('auditorComplianceChartCanvas');

    if (auditorCanvas) {
        new Chart(auditorCanvas, {
            type: 'bar',
            data: {
                labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                datasets: [{
                    label: 'Audits',
                    data: [60, 30, 15, 80, 27, 35, 55, 5, 90, 120, 20, 80],
                    borderWidth: 1,
                    barThickness: 18
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

});