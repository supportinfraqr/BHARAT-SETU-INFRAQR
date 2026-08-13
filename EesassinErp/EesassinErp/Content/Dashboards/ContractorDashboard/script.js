// =========================================================
// WORKFORCE GROWTH CHART
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    const workforceChartCanvas = document.getElementById("workforceChart");

    if (!workforceChartCanvas) return;

    new Chart(workforceChartCanvas, {
        type: "bar",

        data: {

            labels: ["MAR", "APR", "MAY", "JUN", "JUL", "AUG"],

            datasets: [{
                data: [620, 780, 980, 930, 1248, 1080],

                backgroundColor: [
                    "#EEF2F7",
                    "#EEF2F7",
                    "#EEF2F7",
                    "#EEF2F7",
                    "#E45D27",
                    "#EEF2F7"
                ],

                borderRadius: 4,
                borderSkipped: false,
                barThickness: 38,
                hoverBackgroundColor: [
                    "#E5E7EB",
                    "#E5E7EB",
                    "#E5E7EB",
                    "#E5E7EB",
                    "#E45D27",
                    "#E5E7EB"
                ]
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
                    backgroundColor: "#111827",
                    padding: 10,
                    cornerRadius: 10,
                    displayColors: false
                }
            },

            scales: {

                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },

                    ticks: {
                        color: "#667085",
                        font: {
                            size: 11,
                            weight: 600
                        }
                    },

                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        display: false
                    },

                    grid: {
                        display: false,
                        drawBorder: false
                    },

                    border: {
                        display: false
                    }
                }
            }
        }
    });

});