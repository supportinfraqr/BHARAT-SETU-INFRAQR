var r = document.querySelector(':root');
var rc = getComputedStyle(r);

// var g1, g2;

var DraftPer = '';
var PendingPer = '';
var CompletePer = '';
var ValidPer = '';
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
            Action: 19
        }),
    };
    $.ajax(settings121).done(function (response) {
        if (response.length > 0) {
            res = JSON.parse(response) 
            DraftPer = res[0].DraftPer;
            PendingPer = res[0].PendingPer;
            CompletePer = res[0].CompletePer;
           
            ValidPer = res[0].ValidPer;
             
        }
        var r = document.querySelector(':root');
        var rc = getComputedStyle(r);
        var g4 = new JustGage({
            id: 'g4',
            value: CompletePer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut: true,
            pointerOptions: {
                toplength: -15,
                bottomlength: 10,
                bottomwidth: 12,
                color: '#f14fa4',
                stroke: '#ffffff',
                stroke_width: 3,
                stroke_linecap: 'round'
            },
            customSectors: [{
                color: "#ff0000",
                lo: 50,
                hi: 100
            }, {
                color: "#f14fa4",
                lo: 0,
                hi: 50
            }],
            gaugeWidthScale: 0.6,
            counter: true,
            relativeGaugeSize: true

        });
        var g6 = new JustGage({
            id: 'g6',
            value: PendingPer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut: true,
            pointerOptions: {
                toplength: -15,
                bottomlength: 10,
                bottomwidth: 12,
                color: '#efb150',
                stroke: '#ffffff',
                stroke_width: 3,
                stroke_linecap: 'round'
            },
            customSectors: [{
                color: "#ff0000",
                lo: 50,
                hi: 100
            }, {
                color: "#efb150",
                lo: 0,
                hi: 50
            }],
            gaugeWidthScale: 0.6,
            counter: true,
            relativeGaugeSize: true

        });
        var g3 = new JustGage({
            id: 'g3',
            value: DraftPer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut: true,
            pointerOptions: {
                toplength: -15,
                bottomlength: 10,
                bottomwidth: 12,
                color: '#93fced',
                stroke: '#ffffff',
                stroke_width: 3,
                stroke_linecap: 'round'
            },
            customSectors: [{
                color: "#ff0000",
                lo: 50,
                hi: 100
            }, {
                color: "#93fced",
                lo: 0,
                hi: 50
            }],
            gaugeWidthScale: 0.6,
            counter: true,
            relativeGaugeSize: true

        });
        var g5 = new JustGage({
            id: 'g5',
            value: ValidPer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut: true,
            pointerOptions: {
                toplength: -15,
                bottomlength: 10,
                bottomwidth: 12,
                color: '#9e14d9',
                stroke: '#ffffff',
                stroke_width: 3,
                stroke_linecap: 'round'
            },
            customSectors: [{
                color: "#ff0000",
                lo: 50,
                hi: 100
            }, {
                color: "#9e14d9",
                lo: 0,
                hi: 50
            }],
            gaugeWidthScale: 0.6,
            counter: true,
            relativeGaugeSize: true

        });
    });

});





    var g1 = new JustGage({
        id: 'g1',
        value: 0,
        min: 0,
        max: 100,
        symbol: '%',
        pointer: true,
        pointerOptions: {
          toplength: -15,
          bottomlength: 10,
          bottomwidth: 12,
          color: '#ef0057',
          stroke: '#ffffff',
          stroke_width: 3,
          stroke_linecap: 'round'
        },
        customSectors: [{
            color: "#ff0000",
            lo: 50,
            hi: 100
            }, {
            color: "#ef0057",
            lo: 0,
            hi: 50
        }],
        gaugeWidthScale: 0.6,
        counter: true,
        relativeGaugeSize: true
    });
    var g2 = new JustGage({
        id: 'g2',
        value: 25,
        min: 0,
        max: 100,
        symbol: '%',
        pointer: true,
        pointerOptions: {
          toplength: -15,
          bottomlength: 10,
          bottomwidth: 12,
          color: '#ab00f3',
          stroke: '#ffffff',
          stroke_width: 3,
          stroke_linecap: 'round'
        },
        customSectors: [{
            color: "#ff0000",
            lo: 50,
            hi: 100
            }, {
            color: "#ab00f3",
            lo: 0,
            hi: 50
        }],
        gaugeWidthScale: 0.6,
        counter: true,
        relativeGaugeSize: true

    });
    //var g3 = new JustGage({
    //    id: 'g3',
    //    value: 25,
    //    min: 0,
    //    max: 100,
    //    symbol: '%',
    //    pointer: true,
    //    donut:true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#93fced',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //      }, {
    //        color: "#93fced",
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
    //    donut:true,
    //    pointerOptions: {
    //      toplength: -15,
    //      bottomlength: 10,
    //      bottomwidth: 12,
    //      color: '#f14fa4',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#f14fa4",
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
    //    donut:true,
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
var chart = c3.generate({
    bindto: '.chart4',
    data: {
        columns: [
            ['Sent Documents', 30],
            ['Pending Documentes', 70],
            ['Completed Documents', 120],
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
            ['rainfall', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
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
            categories: ['Jan','Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
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

var PA = "";
var DA = "";
var CA = "";
var PM = "";
var DM = "";
var CM = "";

var PJ = "";
var DJ = "";
var CJ = "";

var PJL = "";
var DJL = "";
var CJL = "";

var PAU = "";
var DAU = "";
var CAU = "";

var PS = "";
var DS = "";
var CS = "";

var PO = "";
var DO = "";
var CO = "";

var PN = "";
var DN = "";
var CN = "";

var PD = "";
var DD = "";
var CD = "";

var PJA = "";
var DJA = "";
var CJA = "";

var PF = "";
var DF = "";
var CF = "";


var PMA = "";
var DMA = "";
var CMA = "";
var vendor1 = ""; var vendor2 = ""; var vendor3 = ""; var vendor4 = ""; var vendor5 = ""; var vendor6 = "";
var vdco1 = ""; var vdco2 = ""; var vdco3 = ""; var vdco4 = ""; var vdco5 = ""; var vdco6;
$(document).ready(function () {
    var settings1121 = {
        "url": ("../Rating/SearchRating"),
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            UserId: MapId,
            Action: 11
        }),
    };
    $.ajax(settings1121).done(function (response)
    {
        if (response.length > 0) {
            res = JSON.parse(response)
            PA = res[0].PA;
            DA = res[0].DA;
            CA = res[0].CA;
            PM = res[0].PM;
            DM = res[0].DM;
            CM = res[0].CM;
            PJ = res[0].PJ;
            DJ = res[0].DJ;
            CJ = res[0].CJ;
            PJL = res[0].PJL;
            DJL = res[0].DJL;
            CJL = res[0].CJL;
            PAU = res[0].PAU;
            DAU = res[0].DAU;
            CAU = res[0].CAU;
            PS = res[0].PS;
            DS = res[0].DS;
            CS = res[0].CS;
            PO = res[0].PO;
            DO = res[0].DO;
            CO = res[0].CO;
            PN = res[0].PN;
            DN = res[0].DN;
            CN = res[0].CN;
            PD = res[0].PD;
            DD = res[0].DD;
            CD = res[0].CD;
            PJA = res[0].PJA;
            DJA = res[0].DJA;
            CJA = res[0].CJA;
            PF = res[0].PF;
            DF = res[0].DF;
            CF = res[0].CF;
            PMA = res[0].PMA;
            DMA = res[0].DMA;
            CMA = res[0].CMA;
            vdco1 = res[0].vdco1;
            vdco2 = res[0].vdco2;
            vdco3 = res[0].vdco3;
            vdco4 = res[0].vdco4;
            vdco5 = res[0].vdco5;
            vdco6 = res[0].vdco6;

            vendor1 = res[0].vendor1;
            vendor2 = res[0].vendor2;
            vendor3 = res[0].vendor3;
            vendor4 = res[0].vendor4;
            vendor5 = res[0].vendor5;
            vendor6 = res[0].vendor6;
        }
        //----------------------------Bind


        var barChartData1 = {
            labels: ["April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March"],
            datasets: [{
                label: 'Pending',
                backgroundColor: "#9653fd",
                data: [PA,PM,PJ,PJL,PAU,PS,PO,PN,PD,PJA,PF,PMA]
            }, {
                label: 'Completed',
                backgroundColor: "#fc7993",
                data: [CA, CM, CJ, CJL, CAU, CS, CO, CN, CD, CJA, CF, CMA]
            }, {
                label: 'New Invoice',
                backgroundColor: "#93a6f1",
                data: [DA, DM, DJ, DJL, DAU, DS, DO, DN, DD, DJA, DF, DMA]
            }]
        };
        var barChartData2 = {
            labels: [vendor1, 'No Record', 'No Record', 'No Record', 'No Record', 'No Record', 'No Record', 'No Record'],
            datasets: [{
                label: 'Total Document',
                backgroundColor: "#1ccaba",
                data: [vdco1, '0', '0', '0', '0', '0', '0', '0']
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
                            beginAtZero: true
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
                            beginAtZero: true
                        }
                    }]
                }
            }
        });

        //---------------------------------End Bind
    });

});




