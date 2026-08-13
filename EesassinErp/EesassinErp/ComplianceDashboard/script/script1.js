
document.addEventListener('DOMContentLoaded', () => {
    // Calendar Compliance Summary (Pie Chart)
    new Chart(document.getElementById('calendarChart'), {
        type: 'pie',
        data: {
           labels: ['Completed', 'Pending', 'Delayed'],
            datasets: [{
                data: [85, 10, 5],
                backgroundColor: ['#2FBFDE', '#6463D6', '#F99C30']
            }]
            
        }
    });

// Compliance Risk Matrix (Bar Chart)
new Chart(document.getElementById('riskMatrixChart'), {
type: 'bar',
data: {
labels: ['High', 'Medium', 'Low'],
datasets: [{
    data: [60, 25, 15],
    backgroundColor: ['#FD6C75', '#F99C30', '#2FBFDE'],
    borderRadius: 10,  // Round the corners of the bars
    barThickness: 90,   // Set the width of the bars (width of each bar)
    maxBarThickness: 90,  // Maximum width of the bars
    borderColor: 'rgba(0, 0, 0, 0)', // Transparent border to highlight shadow
    borderWidth: 1,  // Optional border width for visibility of shadow effect
}]
},
options: {
scales: {
    y: {
        beginAtZero: true,  // Start y-axis at zero
        ticks: {
            max: 100,   // Set the maximum value for the y-axis (height of the chart)
            stepSize: 20,  // Set the step size for the y-axis
        },
    }
},
// Adding drop shadow via plugins or custom callback
plugins: {
    beforeDraw: (chart) => {
        let ctx = chart.ctx;
        let datasets = chart.data.datasets;
        datasets.forEach((dataset, datasetIndex) => {
            let meta = chart.getDatasetMeta(datasetIndex);
            meta.data.forEach((bar, index) => {
                // Apply drop-shadow effect
                ctx.save();
                ctx.shadowColor = "rgba(8, 242, 43, 0.2)";  // Drop shadow color (light green with opacity)
                ctx.shadowBlur = 10;   // Drop shadow blur effect
                ctx.shadowOffsetX = 3;  // Horizontal shadow offset (3px to the right)
                ctx.shadowOffsetY = 6;  // Vertical shadow offset (6px down)
                ctx.fill(bar._model);  // Fill the bar with its background color
                ctx.restore();
            });
        });
    }
}
}
});


    // Abstract & Notice of Display (Donut Chart)
    new Chart(document.getElementById('abstractChart'), {
        type: 'doughnut',
        data: {
            labels: ['Displayed', 'Not Displayed'],
            datasets: [{
                data: [35, 65],
                backgroundColor: ['#16C098', '#5932EA']
            }]
        }
    });
});
