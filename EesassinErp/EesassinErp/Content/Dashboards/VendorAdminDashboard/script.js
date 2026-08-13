document.addEventListener("DOMContentLoaded", function () {

    const canvas = document.getElementById("clientProgressChart");

    if (!canvas) return;

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Client A', 'Client B', 'Client C', 'Client D', 'Client E', 'Client F', 'Client G', 'Client H', 'Client I', 'Client J'],
            datasets: [{
                label: 'Progress %',
                data: [85, 72, 64, 90, 55, 35, 98, 22, 74, 50],
                borderRadius: 10,
                barThickness: 30,
                backgroundColor: '#E45D27'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function (value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

});
