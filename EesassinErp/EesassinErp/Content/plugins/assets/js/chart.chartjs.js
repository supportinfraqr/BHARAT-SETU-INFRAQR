$(function(){
  'use strict';
  if (document.getElementById('chartBar1')!==null)
  {
      var ctx1 = document.getElementById('chartBar1').getContext('2d');
      var myChart1 = new Chart(ctx1, {
          type: 'bar',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  label: '# of Votes',
                  data: [12, 39, 20, 10, 25, 18],
                  backgroundColor: '#27AAC8'
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero:true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero:true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  }

  if (document.getElementById('chartBar2') !== null) {
      var ctx2 = document.getElementById('chartBar2').getContext('2d');
      var myChart2 = new Chart(ctx2, {
          type: 'bar',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  label: 'Attendance in percent',
                  data: [12, 100, 20, 10, 25, 18],
                  backgroundColor: [
                    '#29B0D0',
                    '#2A516E',
                    '#F07124',
                    '#CBE0E3',
                    '#979193'
                  ]
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 100
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  };

  if (document.getElementById('chartBar3') !== null) {
      var ctb3 = document.getElementById('chartBar3').getContext('2d');
      new Chart(ctb3, {
          type: 'horizontalBar',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  label: '# of Votes',
                  data: [12, 39, 20, 10, 25, 18],
                  backgroundColor: '#27AAC8'
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11,
                          max: 80
                      }
                  }]
              }
          }
      });
  };

  if (document.getElementById('chartBar4') !== null) {
      var ctb4 = document.getElementById('chartBar4').getContext('2d');
      new Chart(ctb4, {
          type: 'horizontalBar',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  label: '# of Votes',
                  data: [12, 39, 20, 10, 25, 18],
                  backgroundColor: [
                    '#29B0D0',
                    '#2A516E',
                    '#F07124',
                    '#CBE0E3',
                    '#979193'
                  ]
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11,
                          max: 80
                      }
                  }]
              }
          }
      });
  }
  if (document.getElementById('chartLine1') !== null) {
      /* LINE CHART */
      var ctx3 = document.getElementById('chartLine1');
      var myChart3 = new Chart(ctx3, {
          type: 'line',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  label: '# of Votes',
                  data: [12, 39, 20, 10, 25, 18],
                  borderColor: '#27AAC8',
                  borderWidth: 1,
                  fill: false
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  }

  if (document.getElementById('chartLine2') !== null) {
      var ctx4 = document.getElementById('chartLine2');
      var myChart4 = new Chart(ctx4, {
          type: 'line',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  data: [12, 39, 20, 10, 20, 18],
                  borderColor: '#2E5773',
                  borderWidth: 1,
                  fill: false
              }, {
                  data: [30, 50, 28, 23, 25, 28],
                  borderColor: '#F47322',
                  borderWidth: 1,
                  fill: false
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  }

  if (document.getElementById('chartArea1') !== null) {
      /** AREA CHART **/
      var ctx5 = document.getElementById('chartArea1');
      var myChart5 = new Chart(ctx5, {
          type: 'line',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  data: [12, 39, 20, 10, 25, 18],
                  backgroundColor: '#F07124', //rgba(240, 113, 36, 0.4)
                  fill: true,
                  borderWidth: 0,
                  borderColor: '#fff'
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });

  }
  if (document.getElementById('chartArea2') !== null) {
      var ctx6 = document.getElementById('chartArea2');
      new Chart(ctx6, {
          type: 'line',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  data: [10, 24, 20, 25, 35, 50],
                  backgroundColor: '#2E5773',
                  borderWidth: 1,
                  fill: true
              }, {
                  data: [20, 30, 28, 33, 45, 65],
                  backgroundColor: '#F47322',
                  borderWidth: 1,
                  fill: true
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  }

  if (document.getElementById('chartStacked1') !== null) {
      /** STACKED BAR CHART **/
      var ctx7 = document.getElementById('chartStacked1');
      new Chart(ctx7, {
          type: 'bar',
          max : 300,
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
              datasets: [{
                  data: [70, 55, 63, 88, 65, 50, 25, 83, 95, 75, 79, 88],
                 
                  backgroundColor: '#a9b235',
                  borderWidth: 1,
                  label: 'Present',
                  fill: true
              }, {
                  data: [18, 24, 20, 25, 35, 0, 60, 24, 20, 25, 35, 50],
                  backgroundColor: '#427378',
                  borderWidth: 1,
                  label: 'Leave',
              }, {
                  data: [11, 24, 20, 25, 35, 0, 50, 24, 20, 25, 35, 20],
                  backgroundColor: '#d8323e',
                  borderWidth: 1,
                  label: 'Absent',
              }]
          },
          options: {
              legend: {
                  display: true,
                  labels: {
                      display: true
                  }
              },
              scales: {
                  yAxes: [{
                      stacked: true,
                      display: false,
                      //ticks: {
                      //    beginAtZero: true,
                      //    steps: 15,
                      //    stepValue: 5,
                      //    max: 31
                      //}
                  }],
                  xAxes: [{
                      stacked: true,
                      

                  }]
              }
          }
      });
  }

  if (document.getElementById('chartStacked2') !== null) {
      var ctx8 = document.getElementById('chartStacked2');
      new Chart(ctx8, {
          type: 'horizontalBar',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  data: [10, 24, 20, 25, 35, 50],
                  backgroundColor: '#29B0D0',
                  borderWidth: 1,
                  fill: true
              }, {
                  data: [10, 24, 20, 25, 35, 50],
                  backgroundColor: '#2E5773',
                  borderWidth: 1,
                  fill: true
              }, {
                  data: [20, 30, 28, 33, 45, 65],
                  backgroundColor: '#F47322',
                  borderWidth: 1,
                  fill: true
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      stacked: true
                  }],
                  xAxes: [{
                      stacked: true
                  }]
              }
          }
      });
  }

    /** SPECIFIC GRID LINE COLOR **/
  if (document.getElementById('chartArea3') !== null) {
      var ctx9 = document.getElementById('chartArea3');
      new Chart(ctx9, {
          type: 'line',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  data: [10, 24, 20, 25, 35, 50],
                  backgroundColor: 'rgba(46,87,115,.4)',
                  borderWidth: 1,
                  fill: true
              }, {
                  data: [20, 30, 28, 33, 45, 65],
                  backgroundColor: 'rgba(41,176,208,.4)',
                  borderWidth: 1,
                  fill: true
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      gridLines: {
                          drawBorder: false,
                          color: ['', '', '#cc0000']
                      },
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  }

  if (document.getElementById('chartArea4') !== null) {
      var ctx10 = document.getElementById('chartArea4');
      new Chart(ctx10, {
          type: 'line',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                  data: [10, 24, 20, 25, 35, 50],
                  backgroundColor: 'rgba(46,87,115,.4)',
                  borderWidth: 1,
                  fill: true
              }, {
                  data: [20, 30, 28, 33, 45, 65],
                  backgroundColor: 'rgba(41,176,208,.4)',
                  borderWidth: 1,
                  fill: true
              }]
          },
          options: {
              legend: {
                  display: false,
                  labels: {
                      display: false
                  }
              },
              scales: {
                  yAxes: [{
                      gridLines: {
                          drawBorder: false,
                          color: ['', '#cc0000', '#0ad013']
                      },
                      ticks: {
                          beginAtZero: true,
                          fontSize: 10,
                          max: 80
                      }
                  }],
                  xAxes: [{
                      ticks: {
                          beginAtZero: true,
                          fontSize: 11
                      }
                  }]
              }
          }
      });
  }


  /** PIE CHART **/
  //var randomScalingFactor = function() {
  //  return Math.round(Math.random() * 100);
    //};

  //var EmpDataPie = {
  //    labels: ["Absent", "Leave", "Present"],
      
  //    datasets: [{

  //        data: ['100', '20', '80'],
  //        backgroundColor: ['#a9b235', '#427378', '#d8323e'],
         
  //    }]
  //};

  //var StuDataPie = {
  //    labels: ["Present", "Leave", "Absent"],

  //    datasets: [{

  //        data: ['251', '15', '30'],
  //        backgroundColor: ['#a9b235', '#427378', '#d8323e'],

  //    }]
  //};
  var optionpie = {
      responsive: true,
      title: {
          display: false,
          position: "top",
          text: "Pie Chart",
          fontSize: 10,
          fontColor: "#111"
      },
    legend: {
        display: false,
        position: "bottom",
        labels: {
            fontSize: 15
        }
       
    },
    labels:{
        display:true,
    },
      indexLabel :
          {
              fontSize:18,
              display: true,
              indexLabelPlacement: "inside",
              fontColor: "#fff",
          },
    animation: {
      animateScale: true,
      animateRotate: true
    }
  };

  // For a doughnut chart
  //var ctx6 = document.getElementById('chartPie');
  //var myPieChart6 = new Chart(ctx6, {
  //  type: 'doughnut',
  //  data: datapie,
  //  options: optionpie
  //});

  // For a pie chart
  //var ctx7 = document.getElementById('chartDonut');
  //var myPieChart7 = new Chart(ctx7, {
  //    type: 'doughnut',
  //  data: EmpDataPie,
  //  options: optionpie
  //});

  //var ctx8 = document.getElementById('chartDonut2');
  //var myPieChart8 = new Chart(ctx8, {
  //    type: 'doughnut',
  //    data: StuDataPie,
  //    options: optionpie
  //});

});
