var content = {

    invoiceComp:{title:"Invoice Compliance"},
    invoiceNI:{title:"New Invoice"},
    invoicePI:{title:"Pending Invoice"},
    invoiceCI:{title:"Completed Invoice"},
    monthly:{title:"Monthly"},
    quaterly:{title:"Quaterly"},
    yearly:{title:"Yearly"},
    venDash:{title:"Vendor Dashboard"},
    profileName:{title:"Anonymous"},
    certDown:{title:"Certificate Downlaod"},
    profileCp:{title:"Profile Completion"},
    profileCp1:{title:"Profile Completion"},
    profileDc:{title:"Document Upload"},
}
document.getElementById("invoiceComp").innerHTML = content.invoiceComp.title;
document.getElementById("invoiceNI").innerHTML = content.invoiceNI.title;
document.getElementById("invoicePI").innerHTML = content.invoicePI.title;
document.getElementById("invoiceCI").innerHTML = content.invoiceCI.title;
document.getElementById("monthlyText").innerHTML = content.monthly.title;
document.getElementById("quaterlyText").innerHTML = content.quaterly.title;
document.getElementById("yearlyText").innerHTML = content.yearly.title;


//document.getElementById("venDash").innerHTML = content.venDash.title;
document.getElementById("profileName").innerHTML = content.profileName.title;
document.getElementById("certDown").innerHTML = content.certDown.title;
document.getElementById("profileCp").innerHTML = content.profileCp.title;
document.getElementById("profileCp1").innerHTML = content.profileCp1.title;
document.getElementById("profileDc").innerHTML = content.profileDc.title;

if (loginType == "2") { document.getElementById("venDash").innerHTML = 'Vendor Dashboard' } else { document.getElementById("venDash").innerHTML = 'Auditor Dashboard' }

$(document).ready(function () 
{
    var settings121 = {
        "url": ("../Communication/GetCommunication"),
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            Updatedby: LoginId,
            Action :21
}),
};
    $.ajax(settings121).done(function (response) {
        if (response.length > 0) {
            res = JSON.parse(response)
            PreviousYear = res[0].PreviousYear;
            CurrentYear = res[0].CurrentYear;
            NextYear = res[0].NextYear;
            SecondNextYear = res[0].SecondNextYear;

            PreviousDraft = res[0].PreviousDraft;
            PreviousPending = res[0].PreviousPending;
            PreviousComplete = res[0].PreviousComplete;

            CurrentDraft = res[0].CurrentDraft;
            CurrentPending = res[0].CurrentPending;
            CurrentComplete = res[0].CurrentComplete;

            NextDraft = res[0].NextDraft;
            NextPending = res[0].NextPending;
            NextComplete = res[0].NextComplete;

            SecondNextDraft = res[0].SecondNextDraft;
            SecondNextPending = res[0].SecondNextPending;
            SecondNextComplete = res[0].SecondNextComplete;
            DraftPer = res[0].DraftPer;
            PendingPer = res[0].PendingPer;
            CompletePer = res[0].CompletePer;
            ValidPer = res[0].ValidPer;
            DocumentPercentage = res[0].DocumentPercentage

            var chart = c3.generate({
                bindto: '.chart5',
                data: {
                    columns: [
                       ['Draft Documents', CurrentDraft],
                        ['Pending Documentes', CurrentPending],
                        ['Completed Documents', CurrentComplete],
                    ],
                    type: 'donut',
                },
            });



            //var chart = c3.generate({
            //    bindto: '#designerChart',
            //    data: {
            //        columns: [  ['Total', Ma, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] ],
            //        type: 'bar'
            //    },
            //    axis: {
            //        x: {
            //            label: {
            //                text: 'Auditor',
            //                position: 'outer-center',
            //            },
            //            type: 'category',
            //            categories: ['April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'JAN', 'Feb', 'Mar'],
            //            tick: {
            //                centered: true
            //            }
            //        },
            //        y: {
            //            label: {
            //                text: '',
            //                position: 'outer-middle'
            //            },
            //            max: 200,
            //            min: 0,
            //            padding: {
            //                top: 0,
            //                bottom: 0
            //            }
            //        }
            //    },
            //    legend: {
            //        show: false
            //    }
            //});



            var lineChartDataDefault = [{
                period: PreviousYear,
                Invoice: PreviousDraft,
                Pending: PreviousPending,
                Completed: PreviousComplete
            }, {
                period: CurrentYear,
                Invoice: CurrentDraft,
                Pending: CurrentPending,
                Completed: CurrentComplete
            }, {
                period: NextYear,
                Invoice: NextDraft,
                Pending: NextPending,
                Completed: NextComplete
            }, {
                period: SecondNextYear,
                Invoice: SecondNextDraft,
                Pending: SecondNextPending,
                Completed: SecondNextComplete
            }];
        }
        var r = document.querySelector(':root');
        var rc = getComputedStyle(r);
        Morris.Area({
            element: 'extra-area-chart',
            data: lineChartDataDefault,
            xkey: 'period',
            ykeys: ['Invoice', 'Pending', 'Completed'],
            labels: ['Invoice', 'Pending', 'Completed'],
            pointSize: 3,
            fillOpacity: 0,
            pointStrokeColors: [rc.getPropertyValue('--chart-color1'), rc.getPropertyValue('--chart-color2'), rc.getPropertyValue('--chart-color3')],
            behaveLikeLine: true,
            gridLineColor: rc.getPropertyValue('--chart-gridLineColor'),
            lineWidth: 1,
            hideHover: 'auto',
            lineColors: [rc.getPropertyValue('--chart-color1'), rc.getPropertyValue('--chart-color2'), rc.getPropertyValue('--chart-color3')],
            resize: true

        });
        var g3 = new JustGage({
            id: 'g3',
            value: DraftPer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut:true,
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
        var g10 = new JustGage({
            id: 'g10',
            value: DocumentPercentage,
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
            value: PendingPer,
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
        var g4 = new JustGage({
            id: 'g4',
            value: PendingPer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut:true,
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
        var g5 = new JustGage({
            id: 'g5',
            value: CompletePer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut:true,
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
        var g6 = new JustGage({
            id: 'g6',
            value: ValidPer,
            min: 0,
            max: 100,
            symbol: '%',
            pointer: true,
            donut:true,
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
        //var g3 = new JustGage({
        //    id: 'g3',
        //    value: CompletePer,
        //    min: 0,
        //    max: 100,
        //    symbol: '%',
        //    pointer: true,
        //    donut: true,
        //    pointerOptions: {
        //        toplength: -15,
        //        bottomlength: 10,
        //        bottomwidth: 12,
        //        color: '#93fced',
        //        stroke: '#ffffff',
        //        stroke_width: 3,
        //        stroke_linecap: 'round'
        //    },
        //    customSectors: [{
        //        color: "#ff0000",
        //        lo: 50,
        //        hi: 100
        //    }, {
        //        color: "#93fced",
        //        lo: 0,
        //        hi: 50
        //    }],
        //    gaugeWidthScale: 0.6,
        //    counter: true,
        //    relativeGaugeSize: true

        //});
    }); 
});

$(document).ready(function () 
{
    var settings1221 = {
        "url": ("../Rating/GetValues"),
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            Updatedby: MapId,
            Action: 7
        }),
    };
    var TCAprail="";
    var TCMay="";
    var TCJune="";
    var TCJuly="";
    var TCAug="";
    var TCSep="";
    var  TCOCT="";
    var  TCNOV="";
    var  TCDEC="";
    var TCJAN="";
    var TCFEB="";
    var TCMAR=""; 
    $.ajax(settings1221).done(function (response) 
    {
        if (response.length > 0) {
            res = JSON.parse(response)
            TCAprail = res[0].TCAprail
            TCMay = res[0].TCMay
            TCJun = res[0].TCJun
            TCJul = res[0].TCJul
            TCAug = res[0].TCAug
            TCSep = res[0].TCSep
            TCOC = res[0].TCOC
            TCNO = res[0].TCNO
            TCDE = res[0].TCDE
            TCJAN = res[0].TCJAN
            TCFEB = res[0].TCFEB
            TCMAR = res[0].TCMAR
            Session = res[0].year
            var chart = c3.generate({
                bindto: '#designerChart',
                data: {
                    columns: [['Total', TCAprail, TCMay, TCJune, TCJuly, TCAug, TCSep, TCOCT, TCNOV, TCDEC, TCJAN, TCFEB, TCMAR]],
                    type: 'bar'
                },
                axis: {
                    x: {
                        label: {
                            text: 'Auditor',
                            position: 'outer-center',
                        },
                        type: 'category',
                        categories: ['April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'JAN', 'Feb', 'Mar'],
                        tick: {
                            centered: true
                        }
                    },
                    y: {
                        label: {
                            text: '',
                            position: 'outer-middle'
                        },
                        max: 1000,
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
        }
    });

});





var PreviousYear = '';
var CurrentYear = '';
var NextYear = '';
var SecondNextYear = '';

var PreviousDraft = '';
var PreviousPending = '';
var PreviousComplete = '';

var CurrentDraft = '';
var CurrentPending = '';
var CurrentComplete = '';

var NextDraft = '';
var NextPending = '';
var NextComplete = '';

var SecondNextDraft = '';
var SecondNextPending = '';
var SecondNextComplete = '';
var DraftPer = '';
var PendingPer = '';
var CompletePer = '';
var DocumentPercentage = '';

    // var g1, g2;
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
    //      color: '#ef0057',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#ef0057",
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
    //      color: '#ab00f3',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#ab00f3",
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
    //var g5 = new JustGage({
    //    id: 'g5',
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
    //      color: '#9e14d9',
    //      stroke: '#ffffff',
    //      stroke_width: 3,
    //      stroke_linecap: 'round'
    //    },
    //    customSectors: [{
    //        color: "#ff0000",
    //        lo: 50,
    //        hi: 100
    //        }, {
    //        color: "#9e14d9",
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
            ['Draft Documents', CurrentDraft],
            ['Pending Documentes', CurrentPending],
            ['Completed Documents', CurrentComplete],
        ],
        type : 'pie',
    }
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

      //var chart = c3.generate({
      //  bindto: '#designerChart',
      //  data: {
      //    columns: [
      //      ['Total', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
      //    ],
      //    type: 'bar'
      //  },
      //  axis: {
      //    x: {
      //      label: {
      //        text: 'Auditor',
      //        position: 'outer-center',
      //      },
      //      type: 'category',
      //      categories: ['April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'JAN', 'Feb', 'Mar' ],
      //      tick: {
      //        centered: true
      //      }
      //    },
      //    y: {
      //      label: {
      //        text: '',
      //        position: 'outer-middle'
      //      },
      //      max: 200,
      //      min: 0,
      //      padding: {
      //        top: 0,
      //        bottom: 0
      //      }
      //    }
      //  },
      //  legend: {
      //    show: false
      //  }
      //});

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
          pattern: ['#ca7eff', '#ca7eff', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']
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