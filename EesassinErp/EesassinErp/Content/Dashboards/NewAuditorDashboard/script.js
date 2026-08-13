/* =========================================================
   AUDITOR DASHBOARD SCRIPT
   Cleaned & Fixed Version (SVG Ring Only)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* ================================
       KPI RING DRAWING (SVG Based)
       ================================ */

    document.querySelectorAll(
        ".auditorDashboard #container1 .vendor-c1-ring"
    ).forEach(function (ring) {

        const percent = parseInt(ring.getAttribute("data-percent")) || 0;
        const safePercent = Math.max(0, Math.min(percent, 100));

        const circle = ring.querySelector(".progress");
        if (!circle) return;

        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;

        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference;

        const offset = circumference - (safePercent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    });


    /* ================================
       COMPLIANCE LINE CHART
       ================================ */

    const complianceCanvas = document.getElementById("licensesChart");

    if (complianceCanvas && typeof Chart !== "undefined") {

        new Chart(complianceCanvas, {
            type: "line",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                    label: "Vendor Docs",
                    data: [40, 55, 50, 65, 60, 75],
                    borderColor: "#E45D27",
                    backgroundColor: "rgba(228,93,39,0.15)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#fff",
                        titleColor: "#000",
                        bodyColor: "#000",
                        borderColor: "#E45D27",
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 10 } }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });

    }

});
