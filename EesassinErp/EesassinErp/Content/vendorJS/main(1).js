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
document.getElementById("invoicePI").innerHTML = content.invoicePI.title; invoiceNI
document.getElementById("invoiceCI").innerHTML = content.invoiceCI.title;
document.getElementById("monthlyText").innerHTML = content.monthly.title;
document.getElementById("quaterlyText").innerHTML = content.quaterly.title;
document.getElementById("yearlyText").innerHTML = content.yearly.title;
//document.getElementById("venDash").innerHTML = // content.venDash.title;
document.getElementById("profileName").innerHTML = content.profileName.title;
document.getElementById("certDown").innerHTML = content.certDown.title;
document.getElementById("profileCp").innerHTML = content.profileCp.title;
document.getElementById("profileCp1").innerHTML = content.profileCp1.title;
document.getElementById("profileDc").innerHTML = content.profileDc.title;

if (loginType == 1) { document.getElementById("venDash").innerHTML='Vendor Dashboard' } else { document.getElementById("venDash").innerHTML='Auditor Dashboard' }

var lineChartDataDefault = [{
    period: '2010',
    Invoice: 50,
    Pending: 80,
    Completed: 20
}, {
    period: '2011',
    Invoice: 130,
    Pending: 100,
    Completed: 80
}, {
    period: '2012',
    Invoice: 80,
    Pending: 60,
    Completed: 70
}, {
    period: '2013',
    Invoice: 70,
    Pending: 200,
    Completed: 140
}, {
    period: '2014',
    Invoice: 180,
    Pending: 150,
    Completed: 140
}, {
    period: '2015',
    Invoice: 105,
    Pending: 100,
    Completed: 80
},
 {
    period: '2016',
    Invoice: 250,
    Pending: 150,
    Completed: 200
}];
(function ($) {
	"use strict";
    $('#myTabedu1 a').on('click', function (e) {
		e.preventDefault()
        if($(this).context.id === 'monthlyText'){
            lineChartDataDefault = [{
                period: 'January',
                Invoice: 50,
                Pending: 80,
                Completed: 20
            }, {
                period: 'February',
                Invoice: 130,
                Pending: 100,
                Completed: 80
            }, {
                period: 'March',
                Invoice: 80,
                Pending: 60,
                Completed: 70
            }, {
                period: 'April',
                Invoice: 70,
                Pending: 200,
                Completed: 140
            }, {
                period: 'May',
                Invoice: 180,
                Pending: 150,
                Completed: 140
            }, {
                period: 'June',
                Invoice: 105,
                Pending: 100,
                Completed: 80
            },
             {
                period: 'July',
                Invoice: 250,
                Pending: 150,
                Completed: 200
            }]
        }
        else if($(this).context.id === 'quaterlyText'){
            lineChartDataDefault = [{
                period: 'First Quater',
                Invoice: 50,
                Pending: 80,
                Completed: 20
            }, {
                period: 'Second Quater',
                Invoice: 130,
                Pending: 100,
                Completed: 80
            }, {
                period: 'Third Quater',
                Invoice: 80,
                Pending: 60,
                Completed: 70
            }]
        }
        else if($(this).context.id === 'yearlyText'){
            lineChartDataDefault = [{
                period: '2010',
                Invoice: 50,
                Pending: 80,
                Completed: 20
            }, {
                period: '2011',
                Invoice: 130,
                Pending: 100,
                Completed: 80
            }, {
                period: '2012',
                Invoice: 80,
                Pending: 60,
                Completed: 70
            }, {
                period: '2013',
                Invoice: 70,
                Pending: 200,
                Completed: 140
            }, {
                period: '2014',
                Invoice: 180,
                Pending: 150,
                Completed: 140
            }, {
                period: '2015',
                Invoice: 105,
                Pending: 100,
                Completed: 80
            },
             {
                period: '2016',
                Invoice: 250,
                Pending: 150,
                Completed: 200
            }]
        }
		$(this).tab('show')
	});
})(jQuery);

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
        pointStrokeColors:[rc.getPropertyValue('--chart-color1'), rc.getPropertyValue('--chart-color2'), rc.getPropertyValue('--chart-color3')],
        behaveLikeLine: true,
        gridLineColor: rc.getPropertyValue('--chart-gridLineColor'),
        lineWidth: 1,
        hideHover: 'auto',
        lineColors: [rc.getPropertyValue('--chart-color1'), rc.getPropertyValue('--chart-color2'), rc.getPropertyValue('--chart-color3')],
        resize: true
        
    });
    // var g1, g2;
    var g1 = new JustGage({
        id: 'g1',
        value: 25,
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
    var g3 = new JustGage({
        id: 'g3',
        value: 25,
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
    var g4 = new JustGage({
        id: 'g4',
        value: 25,
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
        value: 25,
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
        value: 25,
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

var chart = c3.generate({
    bindto: '.chart5',
    data: {
        columns: [
            ['Sent Documents', 30],
            ['Pending Documentes', 70],
            ['Completed Documents', 120],
        ],
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