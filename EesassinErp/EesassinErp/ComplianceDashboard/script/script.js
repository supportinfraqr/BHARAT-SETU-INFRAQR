
document.addEventListener('DOMContentLoaded', () => {
    // Calendar Compliance Summary (Pie Chart)
    //new Chart(document.getElementById('calendarChart'), {
    //    type: 'pie',
    //    data: {
    //       labels: ['Completed', 'Pending', 'Delayed'],
    //        datasets: [{
    //            data: [85, 10, 5],
    //            backgroundColor: ['#2FBFDE', '#6463D6', '#F99C30']
    //        }]
            
    //    }
    //});

// Compliance Risk Matrix (Bar Chart)
//new Chart(document.getElementById('riskMatrixChart'), {
//type: 'bar',
//data: {
//labels: ['High', 'Medium', 'Low'],
//datasets: [{
//    data: [60, 25, 15],
//    backgroundColor: ['#FD6C75', '#F99C30', '#2FBFDE'],
//    borderRadius: 10,  // Round the corners of the bars
//    barThickness: 90,   // Set the width of the bars (width of each bar)
//    maxBarThickness: 90,  // Maximum width of the bars
//    borderColor: 'rgba(0, 0, 0, 0)', // Transparent border to highlight shadow
//    borderWidth: 1,  // Optional border width for visibility of shadow effect
//}]
//},
//options: {
//    responsive: false,
//    scales: {
//        y: {
//            beginAtZero: true,
//            grid: {
//                color: 'rgba(0, 0, 0, 0.1)', // Light gray for grid lines
//                borderDash: [5, 5], // Dashed lines for horizontal grid
               
//                borderDashOffset: 0.5 // Fine-tune the appearance
                
//            },
//            title: {
//                display: true,
//                text: 'Number of Compliances'
//            }
//        },
//        x: {
//            grid: {
//                display: false // No vertical grid lines
//            },
//            title: {
//                display: true
               
//            }
//        }
//    },
//// Adding drop shadow via plugins or custom callback
//plugins: {
//    beforeDraw: (chart) => {
//        let ctx = chart.ctx;
//        let datasets = chart.data.datasets;
//        datasets.forEach((dataset, datasetIndex) => {
//            let meta = chart.getDatasetMeta(datasetIndex);
//            meta.data.forEach((bar, index) => {
//                // Apply drop-shadow effect
//                ctx.save();
//                ctx.shadowColor = "rgba(8, 242, 43, 0.2)";  // Drop shadow color (light green with opacity)
//                ctx.shadowBlur = 10;   // Drop shadow blur effect
//                ctx.shadowOffsetX = 3;  // Horizontal shadow offset (3px to the right)
//                ctx.shadowOffsetY = 6;  // Vertical shadow offset (6px down)
//                ctx.fill(bar._model);  // Fill the bar with its background color
//                ctx.restore();
//            });
//        });
//    }
//}
//}
//});


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
 // JavaScript Section
 var donutChart;

function updateDonutChart(displayed, notDisplayed) {
    var ctx = document.getElementById('donutChart').getContext('2d');

    // Destroy existing chart instance if it exists
    if (donutChart) {
        donutChart.destroy();
    }

    // Donut Chart Data
    var data = {
        labels: ['Displayed', 'Not Displayed'],
        datasets: [{
            data: [displayed, notDisplayed],
            backgroundColor: ['#5932EA', '#16C098'], // Colors for each segment
            borderWidth: [8, 2], // Border width for each segment
            borderColor: ['#5932EA', '#16C098'], // Border colors for each segment
        }]
    };

    var options = {
        cutout: '70%', // Adjust the inner cutout to make it look like a donut
        plugins: {
            legend: { display: false }, // Hide the legend in the chart itself (we have custom legend)
            tooltip: { enabled: true } // Enable tooltips to show data on hover
        }
    };

    // Render Chart
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: options
    });
}

 function exportReport() {
    // Example data to be exported
    const data = [
      ["Applicable Act", "State Name", "Act Type", "Compliance"],
      ["Equal Remuneration Act", "Delhi", "Labour", "Compliance"],
      ["Maternity Act", "Andhra Pradesh", "Labour", "Compliance"],
      ["Minimum Wages Act", "Haryana", "Labour", "Compliance"],
      ["Payment of Wages", "Assam", "Labour", "Compliance"],
    ];
  
    // Convert data to CSV format
    const csvContent = data
      .map((row) => row.join(","))
      .join("\n");
  
    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
    // Create a link element to download the file
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Compliance_Report.csv");
  
    // Programmatically click the link to trigger the download
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.content');

  tabs.forEach(tab => {
      tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));

          tab.classList.add('active');
          document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      });
  });
