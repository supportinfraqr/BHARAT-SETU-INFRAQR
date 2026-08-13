/*================= Toggle Buttons Logic ================= */
document.addEventListener("DOMContentLoaded", function () {

    const toggleButtons = document.querySelectorAll(
        ".adminSetup .btn-pill"
    );

    const sections = document.querySelectorAll(
        ".adminSetup .section-card"
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



//// Charts

///* User Activity Trend */
//    document.addEventListener("DOMContentLoaded", function () {

//        /* User Activity Trend */
//        new Chart(document.getElementById("userActivityChart"), {
//            type: "line",
//            data: {
//                labels: ["09 Jan", "10 Jan", "11 Jan", "12 Jan", "13 Jan", "14 Jan", "15 Jan"],
//                datasets: [
//                    {
//                        label: "Active users",
//                        data: [6, 5, 6, 7, 7, 6, 7],
//                        borderColor: "#E45D27",
//                        backgroundColor: "rgba(228,93,39,0.15)",
//                        borderWidth: 2,
//                        tension: 0.4,
//                        fill: true
//                    },
//                    {
//                        label: "Inactive users",
//                        data: [1, 2, 1, 0, 0, 1, 0],
//                        borderColor: "#bbb",
//                        backgroundColor: "rgba(180,180,180,0.15)",
//                        borderWidth: 2,
//                        tension: 0.4,
//                        fill: true
//                    }
//                ]
//            },
//            options: {
//                responsive: true,
//                maintainAspectRatio: false,
//                plugins: {
//                    legend: { position: "top" }
//                },
//                scales: {
//                    y: {
//                        beginAtZero: true,
//                        ticks: { stepSize: 1 }
//                    }
//                }
//            }
//        });

//    /* User Status Donut  */
//    new Chart(document.getElementById("userStatusChart"), {
//        type: "doughnut",
//    data: {
//        labels: ["Active users", "Inactive users"],
//    datasets: [{
//        data: [7, 3],
//    backgroundColor: ["#E45D27", "#ddd"],
//    borderWidth: 0
//            }]
//        },
//    options: {
//        cutout: "70%",
//    plugins: {
//        legend: {display: false }
//            }
//        }
//    });

//});


    document.addEventListener("DOMContentLoaded", function () {

        new Chart(document.getElementById("userStorageChart"), {
            type: "bar",
            data: {
                labels: [
                    "All User",
                    
                ],
                datasets: [{
                    label: "Storage used (GB)",
                    data: [0],
                    backgroundColor: "rgba(228,93,39,0.75)",
                    borderRadius: 6,
                    barThickness: 16
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.raw + " GB used";
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => value + " GB"
                        }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });

}); 
