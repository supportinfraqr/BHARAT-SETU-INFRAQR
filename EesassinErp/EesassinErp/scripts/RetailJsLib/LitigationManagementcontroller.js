app.LitigationManagementcontroller = function ($scope, $element, $filter, myService, $timeout) {

     
    $scope.BindTitles = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.Id = LoginId; 
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.StageOneTotal = response.data.Result.Table[0].StageOneTotal;
            $scope.PleadingsTotal = response.data.Result.Table[0].PleadingsTotal;
            $scope.OrdersTotal = response.data.Result.Table[0].OrdersTotal;
            $scope.HearingsTotal = response.data.Result.Table[0].HearingsTotal;
            $scope.TotalCases = response.data.Result.Table[0].TotalCases;
            $scope.StageOnePercent = response.data.Result.Table[0].StageOnePercent;
            $scope.PleadingsPercent = response.data.Result.Table[0].PleadingsPercent;
            $scope.OrdersPercent = response.data.Result.Table[0].OrdersPercent;
            $scope.HearingsPercent = response.data.Result.Table[0].HearingsPercent;
        });
    }
    $scope.openModal = function () { modal.style.display = 'flex'; }
    $scope.Binddetailtiles = function (action) {
        var collectionobj = {};
        collectionobj.Action = action;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ListDetail = response.data.Result.Table;
            $scope.openModal();
        });
    }

    $scope.BindMonthlyFilingchart = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.Id = LoginId; 
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
          getData.then(function (response) {
            var rawData = response.data.Result.Table; 
            const chartData = rawData.map(row => {
                return {
                    month: row.Month,
                    values: [
                        parseFloat(row.CaseFiling) || 0,
                        parseFloat(row.Pleading) || 0,
                        parseFloat(row.Hearing) || 0,
                        parseFloat(row.OrderJudgment) || 0
                    ]
                };
            });

            // Call your chart rendering function with chartData
              renderBarChart(chartData); // Define this below or move your chart logic here
              function renderBarChart(chartData) {
                  const colors = ["#39b54a", "#f9c66c", "#4a90e2", "#f26666"];
                  const labels = ["Case Filing", "Pleading", "Hearing", "Order & Judgment"];
                  const barChart = document.getElementById("barChart");

                  barChart.innerHTML = "";

                  const yAxis = document.createElement("div");
                  yAxis.style.display = "flex";
                  yAxis.style.flexDirection = "column";
                  yAxis.style.justifyContent = "space-between";
                  yAxis.style.height = "250px";
                  yAxis.style.marginRight = "10px";
                  yAxis.style.textAlign = "right";
                  yAxis.style.fontSize = "12px";

                  for (let i = 100; i >= 10; i -= 10) {
                      const label = document.createElement("div");
                      label.innerText = i + "%";
                      label.style.height = "25px";
                      yAxis.appendChild(label);
                  }

                  const chartWrapper = document.createElement("div");
                  chartWrapper.style.display = "flex";
                  chartWrapper.style.gap = "10px";
                  chartWrapper.style.alignItems = "flex-end";
                  chartWrapper.style.flexGrow = "1";
                  chartWrapper.style.height = "400px";
                  chartWrapper.style.position = "relative";

                  chartData.forEach((data) => {
                      const wrapper = document.createElement("div");
                      wrapper.style.display = "flex";
                      wrapper.style.flexDirection = "column";
                      wrapper.style.alignItems = "center";
                      wrapper.style.position = "relative";

                      const bar = document.createElement("div");
                      bar.className = "bar";
                      bar.style.position = "relative";
                      bar.style.overflow = "hidden";

                      const tooltip = document.createElement("div");
                      tooltip.className = "tooltip";

                      data.values.forEach((val, i) => {
                          const segment = document.createElement("div");
                          segment.className = "bar-segment";
                          segment.style.backgroundColor = colors[i];
                          segment.style.height = "0px";

                          setTimeout(() => {
                              segment.style.transition = "height 0.6s ease";
                              segment.style.height = `${val * 4}px`;
                          }, 50);

                          bar.appendChild(segment);

                          const info = document.createElement("span");
                          info.style.color = colors[i];
                          info.innerHTML = `${val.toFixed(1)}% ${labels[i]}`;
                          tooltip.appendChild(info);
                      });

                      bar.addEventListener("mouseenter", () => {
                          tooltip.style.display = "flex";
                          tooltip.style.bottom = `${bar.offsetHeight + 10}px`;
                          tooltip.style.left = "50%";
                          tooltip.style.transform = "translateX(-50%)";
                      });

                      bar.addEventListener("mouseleave", () => {
                          tooltip.style.display = "none";
                      });

                      wrapper.appendChild(bar);
                      wrapper.appendChild(tooltip);

                      const month = document.createElement("div");
                      month.className = "month-label";
                      month.innerText = data.month;
                      wrapper.appendChild(month);

                      chartWrapper.appendChild(wrapper);
                  });

                  barChart.style.display = "flex";
                  barChart.appendChild(yAxis);
                  barChart.appendChild(chartWrapper);
              }

        });
    };
    $scope.Bindcircle = function () {
        var collectionobj = {
            Action: 3,
            Id: LoginId
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.CircleList = response.data.Result.Table;
              $scope.CaseFiling=   parseInt($scope.CircleList[0]?.CaseFiling || 0),
                $scope.Pleadings=   parseInt($scope.CircleList[0]?.Pleadings || 0),
                $scope.Hearing=   parseInt($scope.CircleList[0]?.Hearing || 0),
                $scope.Orders=   parseInt($scope.CircleList[0]?.Orders || 0),
                $scope.Appeal=   parseInt($scope.CircleList[0]?.Appeal || 0)

            // Extract numbers for each stage
            const chartData = [
                parseInt($scope.CircleList[0]?.CaseFiling || 0),
                parseInt($scope.CircleList[0]?.Pleadings || 0),
                parseInt($scope.CircleList[0]?.Hearing || 0),
                parseInt($scope.CircleList[0]?.Orders || 0),
                parseInt($scope.CircleList[0]?.Appeal || 0)
            ];

            renderChart(chartData);
        });

        function renderChart(dataArray) {
            const ctx = document.getElementById('myChart');

            // Destroy previous chart if exists
            if (window.myChartInstance) {
                window.myChartInstance.destroy();
            }

            // Create new chart instance
            window.myChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Case Filing', 'Pleadings', 'Hearing', 'Orders & Judgments', 'Appeal'], 
                    datasets: [{
                        label: 'Case Overview',
                        data: dataArray,
                        backgroundColor: [
                            '#FF6B6B',
                            '#FF9F68',
                            '#4D96FF',
                            '#C780FA',
                            '#6EDCD9'
                        ],
                        borderRadius: 9,         // ✅ Rounded corners
                        hoverOffset: 4
                    }]
                },
                options: {
                    cutout: '100%',
                    responsive: false,         // ❌ Set to true if you want it responsive
                    plugins: {
                        legend: {
                            display: false     // ✅ Hide legend
                        },
                        tooltip: {
                            callbacks: {
                                title: function () {
                                    return ''; // ✅ Hide hover title
                                }
                            }
                        }
                    }
                }
            });

            // Update progress bars below chart
            const max = 158;
            const items = document.querySelectorAll('.status-item');
            items.forEach(item => {
                const value = parseInt(item.querySelector('.value').textContent.trim());
                const fill = item.querySelector('.progress-fill');
                const width = (value / max) * 100;
                fill.style.width = width + '%';
            });
        }
    };

    $scope.BindCaseStatus = function () {
        var collectionobj = {
            Action: 4,
            Id: LoginId
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.CaseStatusList = response.data.Result.Table;

            $scope.CaseInitiation = parseInt($scope.CaseStatusList[0]?.CaseInitiation || 0);
            $scope.PreliminaryProcessing = parseInt($scope.CaseStatusList[0]?.PreliminaryProcessing || 0);
            $scope.AdmissionOfCase = parseInt($scope.CaseStatusList[0]?.AdmissionOfCase || 0);
            $scope.AppearancePleadings = parseInt($scope.CaseStatusList[0]?.AppearancePleadings || 0);
            $scope.FramingOfIssues = parseInt($scope.CaseStatusList[0]?.FramingOfIssues || 0);
            $scope.EvidenceStage = parseInt($scope.CaseStatusList[0]?.EvidenceStage || 0);
            $scope.FinalArguments = parseInt($scope.CaseStatusList[0]?.FinalArguments || 0);
            $scope.JudgmentFinalOrder = parseInt($scope.CaseStatusList[0]?.JudgmentFinalOrder || 0);
            $scope.PostJudgment = parseInt($scope.CaseStatusList[0]?.PostJudgment || 0);

            // WAIT until DOM is ready (especially if you're using ng-repeat/ng-if)
            $timeout(function () {
                const max = 158;
                const items = document.querySelectorAll('.status-item');

                items.forEach(item => {
                    const value = parseInt(item.querySelector('.value')?.textContent.trim() || "0");
                    const fill = item.querySelector('.progress-fill');
                    const width = (value / max) * 100;
                    if (fill) {
                        fill.style.width = width + '%';
                    }
                });
            }, 100); // delay gives Angular time to render view
        });
    };


    $scope.changeMonth = function (offset) {
        if (!(currentDate instanceof Date)) {
            currentDate = new Date(currentDate);
        }

        currentDate.setMonth(currentDate.getMonth() + offset);
        renderCalendar();
    };
    $scope.selectDate = function (dateStr) {
        alert("Selected date: " + dateStr);
        // Do whatever you want with the selected date
    };
    $scope.BindCalender = function () {
        var collectionobj = {
            Action: 5,
            Id: LoginId
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            $scope.eventList = response.data.Result.Table;

            // Call JS to populate eventMap and render
            loadEventData($scope.eventList);
        });
    };

    $scope.clearcal = function () {
        $scope.searchTextCal = '';
    }

    $scope.BindCaseDetail= function () {
        var collectionobj = {};
        collectionobj.Action = 6;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.CaseDetailList = response.data.Result.Table;
            $scope.DetailList = response.data.Result.Table;
            
        });
    }
    $scope.BindAdvocate = function () {
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ExternalCount = parseInt(response.data.Result.Table[0].ExternalCount || 0),
                $scope.InHouseCount = parseInt(response.data.Result.Table[0].InHouseCount || 0),
                $scope.InHousePercentage = parseInt(response.data.Result.Table[0].InHousePercentage || 0),
              /*  $scope.ExternalPercentage = parseInt(response.data.Result.Table[0].ExternalPercentage || 0)*/
            $scope.ATotal = parseInt(response.data.Result.Table[0].Total || 0)
            updateDonutChart($scope.InHouseCount, $scope.ExternalCount);
            function updateDonutChart(inhouse, external) {
                const total = inhouse + external;
                const inhousePercent = Math.round((inhouse / total) * 100);
                const externalPercent = 100 - inhousePercent;

                // Update counts
                document.getElementById("inhouseCount").textContent = inhouse;
                document.getElementById("externalCount").textContent = external;
                document.getElementById("totalCount").textContent = total;

                const inhouseArc = document.getElementById("inhouseArc");
                const externalArc = document.getElementById("externalArc");
                const inhouseLabel = document.getElementById("inhouseLabel");
                const externalLabel = document.getElementById("externalLabel");

                let currentInhouse = 0;
                let frame = 0;
                const maxFrames = 60;

                const animate = () => {
                    frame++;
                    const ease = t => t * t * (3 - 2 * t);
                    const progress = ease(frame / maxFrames);

                    currentInhouse = Math.round(inhousePercent * progress);
                    const currentExternal = 100 - currentInhouse;

                    inhouseArc.setAttribute("stroke-dasharray", `${currentInhouse} ${100 - currentInhouse}`);
                    externalArc.setAttribute("stroke-dasharray", `${currentExternal} ${currentInhouse}`);
                    externalArc.setAttribute("stroke-dashoffset", `${currentInhouse}`);

                    inhouseLabel.textContent = `${currentInhouse}%`;
                    externalLabel.textContent = `${currentExternal}%`;

                    if (frame < maxFrames) requestAnimationFrame(animate);
                };

                requestAnimationFrame(animate);
            }

        });
    }
    $scope.BindHearing = function () {
        var collectionobj = {
            Action: 8,
            Id: LoginId
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            const result = response.data.Result.Table[0];

            $scope.Ongoing = parseInt(result.Ongoing || 0);
            $scope.Settled = parseInt(result.Settled || 0);
            $scope.Disposed = parseInt(result.Disposed || 0);
            $scope.Others = parseInt(result.Others || 0);

            const chartData = [
                { name: 'Ongoing', value: $scope.Ongoing },
                { name: 'Settled', value: $scope.Settled },
                { name: 'Disposed', value: $scope.Disposed },
                { name: 'Others', value: $scope.Others }
            ];

            renderChart(chartData);
            function renderChart(data) {
                const chart = document.getElementById('chart');
                chart.innerHTML = ''; // Clear old data

                const maxValue = Math.max(...data.map(item => item.value));
                const maxBarWidth = 100;

                data.forEach(item => {
                    const label = document.createElement('div');
                    label.className = 'label';
                    label.innerHTML = `<span>${item.name}</span><span>${item.value}</span>`;
                    chart.appendChild(label);

                    const bar = document.createElement('div');
                    bar.className = 'bar';
                    const widthPercentage = (item.value / maxValue) * maxBarWidth;
                    bar.style.width = widthPercentage + '%';
                    bar.innerHTML = `<span>${item.value}</span>`;
                    chart.appendChild(bar);
                });
            }

        });
    };

    $scope.BindState = function () {
        var collectionobj = {
            Action: 10,
            Id: LoginId
        };
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.statelist = response.data.Result.Table;


        });
    }
    $scope.BindCasetype = function () {
        var collectionobj = {
            Action: 12,
            Id: LoginId
        };
        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.CaseTypeLIST = response.data.Result.Table;


        });
    }

    $scope.BindStatewise = function () {
        var collectionobj = {
            Action: 9,
            Id: LoginId,
            State: $scope.State
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result && response.data.Result.Table) {
                $scope.StateWiseList = response.data.Result.Table;

                const caseTypeMap = new Map();
                $scope.StateWiseList.forEach(function (item) {
                    const caseType = item.CaseType;
                    const count = item.TotalCount;

                    if (caseTypeMap.has(caseType)) {
                        caseTypeMap.set(caseType, caseTypeMap.get(caseType) + count);
                    } else {
                        caseTypeMap.set(caseType, count);
                    }
                });

                const labels = Array.from(caseTypeMap.keys());
                const values = Array.from(caseTypeMap.values());

                // ✅ Update chart safely now
                caseChart.data.labels = labels;
                caseChart.data.datasets[0].data = values;
                caseChart.update();
            }
        });
    };

    $scope.BindCaseTypeMonth = function () {
        var collectionobj = {
            Action: 11,
            Id: LoginId,
            CaseCode: $scope.CaseType
        };

        var getData = myService.methode('POST', "../RetailSection/SearchLitigationManagement", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.CaseTypeMonthList = response.data.Result.Table;

            // Extract labels and values from CaseTypeMonthList
            const labels = [];
            const values = [];

            $scope.CaseTypeMonthList.forEach(function (item) {
                labels.push(item.FilingMonth);     // e.g., "April 2025"
                values.push(item.TotalCount);
            });

            // Draw Chart after data is ready
            const canvas = document.getElementById('uic-bar-chart');
            const ctx1 = canvas.getContext('2d');

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx1.scale(dpr, dpr);

            new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Cases',
                        data: values,
                        backgroundColor: '#FFCB82',
                        borderRadius: 4,
                        barThickness: 30
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#555',
                                stepSize: 10
                            },
                            grid: {
                                color: '#eee'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#0c0c50',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        });
    };

    
    $scope.onlyAPSZero = function (item) {
        return item.APS === '0';
    };
    $scope.Getpdf = function () {
        $scope.showLoader();  // Show loader while fetching data

        var collectionobj = {
            Action: 6,
            Id: LoginId
        };

        myService.methode('POST', ("../RetailSection/SearchLitigationManagement"), JSON.stringify(collectionobj))
            .then(function (response) {
                if (response.data && response.data.Result) {
                    var dataToExport = response.data.Result;  
                    $scope.ExportToPDF(dataToExport);
                }
            }).finally(function () {
                $scope.hideLoader();  // Hide loader after fetching data
            });
    };

    $scope.selectedColumnspdf = [
         "CaseCode", "CaseTitle", "CaseNo", "FilingDate", "CaseType",
        "PleadingsType", "HearingDate",   "ExecutionStatus"
    ];

    $scope.ExportToPDF = function (dataToExport) {
        const { jsPDF } = window.jspdf;

        // Initialize jsPDF with landscape orientation
        const doc = new jsPDF('landscape');

        // Set font for the entire document
        doc.setFont("helvetica", "normal");

        // Title for the PDF - Centered
        const title = "Store Master Report";
        const pageWidth = doc.internal.pageSize.width;
        const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
        const titleX = (pageWidth - titleWidth) / 2; // Center the title

        doc.setFontSize(15);
        doc.text(title, titleX, 10); // Center the title

        // Set font and size for the table content
        doc.setFontSize(10);

        // Define column widths dynamically based on the content
        const columnWidths = new Array($scope.selectedColumnspdf.length).fill(30); // Adjust each column width if necessary
        const startX = 10;
        const startY = 20;
        let yPosition = startY + 10; // Space for title

        // Create header row with bold font, background color, and white text
        doc.setFont("helvetica", "bold");
        const headerHeight = 10; // Height of the header row
        const headerBackgroundColor = [200, 200, 200]; // Light gray background for the header
        const headerWidth = columnWidths.reduce((sum, width) => sum + width, 0); // Total width of all columns

        // Draw header background
        doc.setFillColor(...headerBackgroundColor);
        doc.rect(startX, yPosition - headerHeight, headerWidth, headerHeight, 'F'); // Draw background for header

        // Draw header text
        let xPosition = startX;
        $scope.selectedColumnspdf.forEach(function (column, columnIndex) {
            doc.text(column, xPosition + 5, yPosition); // Add some padding for text
            xPosition += columnWidths[columnIndex];
        });

        yPosition += headerHeight;  // Move to the next line after header row

        // Reset to normal font for the data rows
        doc.setFont("helvetica", "normal");

        // Loop through each row of data and print only the selected columns
        dataToExport.forEach(function (row, index) {
            // If row content overflows, add a page break
            if (yPosition + headerHeight > doc.internal.pageSize.height) {
                doc.addPage(); // Add a new page
                yPosition = startY; // Reset y-position
            }

            // Filter the row based on selected columns and convert all values to string
            var filteredRow = $scope.selectedColumnspdf.map(function (column) {
                return (row[column] !== undefined && row[column] !== null) ? String(row[column]) : "";  // Ensure the value is a string
            });

            // Print the row data with proper column widths
            let xPosition = startX;
            filteredRow.forEach(function (cell, columnIndex) {
                doc.text(cell, xPosition + 5, yPosition); // Add some padding for text
                xPosition += columnWidths[columnIndex]; // Move to the next column position
            });

            yPosition += headerHeight;  // Move to the next line after each row
        });

        // Save the PDF with the name 'StoreMaster.pdf'
        doc.save('CaseDetail.pdf');
    };

}