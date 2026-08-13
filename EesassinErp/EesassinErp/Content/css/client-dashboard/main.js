//var r = document.querySelector(':root');
//var rc = getComputedStyle(r);

//var DraftPer = '';
//var PendingPer = '';
//var CompletePer = '';
//$(document).ready(function () { 
//  //  LoadGraph();
//});


//function LoadGraph()
//{
//    var settings121 = {
//        "url": ("../Communication/GetCommunication"),
//        "method": "POST",
//        "timeout": 0,
//        "headers": {
//            "Content-Type": "application/json"
//        },
//        "data": JSON.stringify({
//            Updatedby: MapId, 
//            Action: 26
//        }),
//    };
//    $.ajax(settings121).done(function (response) {
//        if (response.length > 0) {
//            res = JSON.parse(response)
//            DraftPer = res[0].DraftPer;
//            PendingPer = res[0].PendingPer;
//            CompletePer = res[0].CompletePer;

//        }
//        var r = document.querySelector(':root');
//        var rc = getComputedStyle(r);
//        var g5 = new JustGage({
//            id: 'g5',
//            value: CompletePer,
//            min: 0,
//            max: 100,
//            symbol: '%',
//            pointer: true,
//            donut: true,
//            pointerOptions: {
//                toplength: -15,
//                bottomlength: 10,
//                bottomwidth: 12,
//                color: '#f14fa4',
//                stroke: '#ffffff',
//                stroke_width: 3,
//                stroke_linecap: 'round'
//            },
//            customSectors: [{
//                color: "#ff0000",
//                lo: 50,
//                hi: 100
//            }, {
//                color: "#f14fa4",
//                lo: 0,
//                hi: 50
//            }],
//            gaugeWidthScale: 0.6,
//            counter: true,
//            relativeGaugeSize: true

//        });
//        var g3 = new JustGage({
//            id: 'g3',
//            value: PendingPer,
//            min: 0,
//            max: 100,
//            symbol: '%',
//            pointer: true,
//            donut: true,
//            pointerOptions: {
//                toplength: -15,
//                bottomlength: 10,
//                bottomwidth: 12,
//                color: '#f14fa4',
//                stroke: '#ffffff',
//                stroke_width: 3,
//                stroke_linecap: 'round'
//            },
//            customSectors: [{
//                color: "#ff0000",
//                lo: 50,
//                hi: 100
//            }, {
//                color: "#f14fa4",
//                lo: 0,
//                hi: 50
//            }],
//            gaugeWidthScale: 0.6,
//            counter: true,
//            relativeGaugeSize: true

//        });
//        var g2 = new JustGage({
//            id: 'g2',
//            value: DraftPer,
//            min: 0,
//            max: 100,
//            symbol: '%',
//            pointer: true,
//            donut: true,
//            pointerOptions: {
//                toplength: -15,
//                bottomlength: 10,
//                bottomwidth: 12,
//                color: '#f14fa4',
//                stroke: '#ffffff',
//                stroke_width: 3,
//                stroke_linecap: 'round'
//            },
//            customSectors: [{
//                color: "#ff0000",
//                lo: 50,
//                hi: 100
//            }, {
//                color: "#f14fa4",
//                lo: 0,
//                hi: 50
//            }],
//            gaugeWidthScale: 0.6,
//            counter: true,
//            relativeGaugeSize: true

//        });
//    });
//}




    //// var g1, g2;
    //var g1 = new JustGage({
    //    id: 'g1',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#f20057',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#f20057",
    //        lo: 0,
    //        hi: 50
    //    }],
    //    gaugeWidthScale: 0.6,
    //    counter: true,
    //    relativeGaugeSize: true
    //});
    //var g2 = new JustGage({
    //    id: 'g2',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#00bbf2',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#00bbf2",
    //        lo: 0,
    //        hi: 50
    //    }],
    //    gaugeWidthScale: 0.6,
    //    counter: true,
    //    relativeGaugeSize: true

    //});
    //var g3 = new JustGage({
    //    id: 'g3',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#f0e705',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //      }, {
    //        color: "#f0e705",
    //        lo: 0,
    //        hi: 50
    //      }],
    //    gaugeWidthScale: 0.6,
    //    counter: true,
    //    relativeGaugeSize: true

    //});
    //var g4 = new JustGage({
    //    id: 'g4',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#e401f1',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#e401f1",
    //        lo: 0,
    //        hi: 50
    //    }],
    //    gaugeWidthScale: 0.6,
    //    counter: true,
    //    relativeGaugeSize: true

    //});
    //var g5 = new JustGage({
    //    id: 'g5',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#00f1df',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#00f1df",
    //        lo: 0,
    //        hi: 50
    //    }],
    //    gaugeWidthScale: 0.6,
    //    counter: true,
    //    relativeGaugeSize: true

    //});
    //var g6 = new JustGage({
    //    id: 'g6',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#efb150',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#efb150",
    //        lo: 0,
    //        hi: 50
    //    }],
    //    gaugeWidthScale: 0.6,
    //    counter: true,
    //    relativeGaugeSize: true

    //});

// ===================================
var a = document.body;
a.classList ? a.classList.add('classname') : a.className += ' classname';

function printChart(divName) {
     var printContents = document.getElementById(divName);
     printContents.className += 'printMe';

     document.body.innerHTML = printContents;

     window.print();
  
     printContents.className = '';

     document.body.innerHTML = originalContents;
}
var CurrentDraft = 0;
var CurrentPending =0;
var CurrentComplete = 0;
var chart = c3.generate({
    bindto: '.chart4',
    data: {
        columns: [
            ['Draft Documents', CurrentDraft],
            ['Pending Documentes', CurrentPending],
            ['Completed Documents', CurrentComplete],
        ],
        color:['#19CDD7','#DDB27C','red'],
        type : 'pie',
    }
});

var chart = c3.generate({
    bindto: '.chart5',
    data: {
        columns: [
            ['Sent Documents', 30],
            ['Pending Documentes', 70],
            ['Completed Documents', 120],
        ],
        color:['#19CDD7','#DDB27C','red'],
        type : 'donut',
    },
});

(function ($) {
	"use strict";
    $('#myTabedu2 a').on('click', function (e) {
		e.preventDefault()
		$(this).tab('show')
	});
})(jQuery);



// background: rgb(163,93,254);
// background: linear-gradient(90deg, rgba(163,93,254,1) 0%, rgba(206,129,255,1) 35%, rgba(216,217,219,1) 100%);



columnColors = ['rgb(163,93,254)', 'rgb(163,93,254)', 'rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)','rgb(163,93,254)',];

      function setColumnBarColors(colors, chartContainer) {

        $('#' + chartContainer + ' .c3-chart-bars .c3-shape').each(function(index) {
          this.style.cssText += 'fill: ' + colors[index] + ' !important; stroke: ' + colors[index] + '; !important';
        });

        $('#' + chartContainer + ' .c3-chart-texts .c3-text').each(function(index) {
          this.style.cssText += 'fill: ' + colors[index] + ' !important;';
        });
      }

      var chart = c3.generate({
        bindto: '#designerChart',
        data: {
          columns: [
            ['rainfall', 10, 20, 30, 40, 50]
          ],
          type: 'bar'
        },
        axis: {
          x: {
            label: {
              text: 'Auditor',
              position: 'outer-center',
            },
            type: 'category',
            categories: ['Jan','Feb', 'Mar', 'April', 'May'],
            tick: {
              centered: true
            }
          },
          y: {
            label: {
              text: '',
              position: 'outer-middle'
            },
            max: 200,
            min: 0,
            padding: {
              top: 0,
              bottom: 0
            }
          }
        },
        legend: {
          show: false
        }
      });

      setColumnBarColors(columnColors, 'designerChart');

      // Color turns to original when window is resized
      // To handle that
      $(window).resize(function() {
        setColumnBarColors(columnColors, 'designerChart');
      });
    
    
var chart = c3.generate({
    data: {
      bindto: '#barchart',
      x: 'x',
      onclick: function(d, element) {
      },
      columns: [
        ['x','Jan','Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        ['download', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
      ],
      color: {
        pattern: ['#aec7e8', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']
      },
      groups: [
        ['download', 'loading']
      ],
      type: 'bar'
    },
    axis: {
      x: {
        type: 'category' // this needed to load string x value
      }
    }
  });


  var barChartData1 = {
    labels: ["January", "February", "March", "April", "May", "June", "July"],
    datasets: [{
      label: 'Pending',
      backgroundColor:"#9653fd",
      data: [1,7,13,19,25,31,37]
    }, {
      label: 'Completed',
      backgroundColor: "#fc7993",
      data: [3,,9,15,21,27,33,39]
    },{
      label: 'New Invoice',
      backgroundColor: "#93a6f1",
      data: [5,11,17,23,29,35,41]
    }]
  };
  var barChartData2 = {
    labels: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11","V12"],
    datasets: [{
      label: 'Vendor',
      backgroundColor: "#1ccaba",
      data: [1,3,5,7,9,11,13,15,17,19,21,23]
    }]
  };
  
  var ctx1 = document.getElementById("canvas").getContext("2d");
  var ctx2 = document.getElementById("canvas1").getContext("2d");
  var myBar1 = new Chart(ctx1, {
    type: 'bar',
    data: barChartData1,
    options: {
      responsive: true,
      scales: {
        xAxes: [{
            barPercentage: .3,
            categoryPercentage: 0.4 / 10 * barChartData1.datasets[0].data.length
        }],
        yAxes: [{
          ticks: {
            beginAtZero:true
          }
        }]
      }
    }
  });
  var myBar2 = new Chart(ctx2, {
    type: 'bar',
    data: barChartData2,
    options: {
      responsive: true,
      scales: {
        xAxes: [{
            barPercentage: .3,
            categoryPercentage: 0.4 / 10 * barChartData2.datasets[0].data.length
        }],
        yAxes: [{
          ticks: {
            beginAtZero:true
          }
        }]
      }
    }
  });
