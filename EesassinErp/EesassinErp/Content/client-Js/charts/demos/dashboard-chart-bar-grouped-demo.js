// Demo Grouped Bar Chart
// 
// The style configurations in this demo are
// intended to match the Material Design styling.
// Use this demo chart as a starting point and for
// reference when creating charts within an app.
// 
// Chart.js v3 is being used, which is currently
// in beta. For the v3 docs, visit
// https://www.chartjs.org/docs/master/






var m1 = "";
var m2 = "";
var m3 = "";
var m4 = "";
var MM1 = "";
var MM2 = "";
var MM3 = "";
var MM4 = "";
var LM1 = "";
var LM2 = "";
var LM3 = "";
var LM4 = "";
var GOALACC = "";
var LASTYEARGOAL = "";
var CURRENTYEARGOAL = "";


var DraftPer = "";
var PendingPer = "";
var CompletePer = "";
$(document).ready(function () {
    var settings121 = {
        "url": ("../Communication/GetCommunication"),
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            Updatedby: MapId,
            Action: 22
        }),
    };
    $.ajax(settings121).done(function (response) {
        if (response.length > 0) {
            res = JSON.parse(response)
            M1 = res[0].M1;
            M2 = res[0].M2;
            M3 = res[0].M3;
            M4 = res[0].M4;
            M5 = res[0].M5;
            M6 = res[0].M6;
            M7 = res[0].M7;
            M8 = res[0].M8;
            M9 = res[0].M9;
            M10 = res[0].M10;
            M11=res[0].M11;
            M12=res[0].M12;
            LM1 = res[0].LM1;
            LM2 = res[0].LM2;
            LM3 = res[0].LM3;
            LM4 = res[0].LM4;
            LM5 = res[0].LM5;
            LM6 = res[0].LM6;
            LM7 = res[0].LM7;
            LM8 = res[0].LM8;

            LM9 = res[0].LM9;
            LM10 = res[0].LM10;
            LM11 = res[0].LM11;
            LM12 = res[0].LM12;
            GOALACC = res[0].GOALACC;

            LASTYEARGOAL = res[0].LASTYEARGOAL;
            CURRENTYEARGOAL = res[0].CURRENTYEARGOAL;



            DraftPer = res[0].DraftPer;
            PendingPer = res[0].PendingPer;
            CompletePer = res[0].CompletePer;




var ctx = document.getElementById('dashboardBarChart').getContext('2d');
var myBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'],
        datasets: [{
                label: 'Last Year',
                backgroundColor: primaryColorOpacity50,
                borderColor: primaryColorOpacity50,
                borderRadius: 4,
                maxBarThickness: 32,
                data: [LM4, LM5, LM6, LM7, LM8, LM9, LM10, LM11 ,LM12, LM1, LM2, LM3],
            },
            {
                label: 'This Year',
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                borderRadius: 4,
                maxBarThickness: 32, 
                data: [M4, M5, M6, M7, M8, M9, M10, M11, M12, M1, M2, M3],
            },
        ],
    },
    options: {
        scales: {
            x: {
                time: {
                    unit: 'month'
                },
                gridLines: {
                    display: false
                },
                ticks: {
                    maxTicksLimit: 12
                },
            },
            y: {
                ticks: {
                    min: 0,
                    max: 50000,
                    maxTicksLimit: 5
                },
                gridLines: {
                    color: 'rgba(0, 0, 0, .075)',
                },
            },
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                displayColors: true
            }
        },
    }
});


        }

    });

});