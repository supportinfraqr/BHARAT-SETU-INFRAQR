$(document).ready(function () {

    $(".principleProfile .principleProfileMenuBtn").on("click", function () {

        var target = $(this).data("target");

        $(".principleProfile .principleProfileMenuBtn")
            .removeClass("active");

        $(this).addClass("active");

        $(".principleProfile .principleProfileTab")
            .removeClass("active");

        $("#" + target).addClass("active");

    });

});


//This is script for edit profile modal(copy from vendor registration)

    let currentStep = 1;
    const totalSteps = 7;

    /* STEP SWITCH */
    const stepIndicators = document.querySelectorAll(".step-item");

    function showStep(step) {

        document.querySelectorAll(".form-step").forEach(s => s.style.display = "none");
    document.querySelector(`[data-step="${step}"]`).style.display = "block";

        stepIndicators.forEach((el, index) => {
        el.classList.remove("active", "completed");

    if (index + 1 < step) {
        el.classList.add("completed");
            }
    else if (index + 1 === step) {
        el.classList.add("active");
            }
        });

    document.querySelector(".prev-btn").classList.toggle("d-none", step === 1);
    }

    document.addEventListener("click", function (e) {

        if (e.target.classList.contains("next-btn")) {
            if (currentStep < totalSteps) {
        currentStep++;
    showStep(currentStep);
            }
        }

    if (e.target.classList.contains("prev-btn")) {
            if (currentStep > 1) {
        currentStep--;
    showStep(currentStep);
            }
        }

    });

   
// User Activity Trend (Line Chart)
document.addEventListener('DOMContentLoaded', function () {

    // chart code here
    const activityCtx = document.getElementById('userActivityChart');

    new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'Active Users',
                    data: [45, 62, 78, 95, 88, 110],
                    borderColor: '#E45D27',
                    backgroundColor: 'rgba(228, 93, 39, 0.12)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#E45D27'
                },
                {
                    label: 'Inactive Users',
                    data: [20, 18, 15, 12, 14, 10],
                    borderColor: '#BDBDBD',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#BDBDBD'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });



});



// User Status Summary (Donut Chart)

document.addEventListener('DOMContentLoaded', function () {

    // chart code here
    const statusCtx = document.getElementById('userStatusChart');

    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Used Users', 'Unused Users'],
            datasets: [{
                data: [8, 192],
                backgroundColor: [
                    '#E45D27',
                    '#E4E4E4'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

});

