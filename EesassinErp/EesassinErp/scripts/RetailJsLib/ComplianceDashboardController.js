app.ComplianceDashboardController = function ($scope, $element, $filter, myService, $http) {

    $scope.BindTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 1;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.TotalCompliance = response.data.Result[0].TotalCompliance ;
            $scope.StoreCount = response.data.Result[0].StoreCount ;
            $scope.Complied = response.data.Result[0].Complied ;
            $scope.REMAINDOC = response.data.Result[0].REMAINDOC;
            $scope.CompliedPer = response.data.Result[0].CompliedPer;
            $scope.NotCompliedPer = response.data.Result[0].NotCompliedPer;
           
        });
    }
    $scope.exportTableToCSV = function (filename) {
        var csv = [];

        // Get number of columns from the first row
        var firstRow = document.querySelector("#myTable tr");
        var colCount = firstRow ? firstRow.querySelectorAll("th, td").length : 2;

        // Create the title row (visually centered by padding)
        var titlePadding = Math.floor((colCount - 1) / 2);
        var titleRow = new Array(titlePadding).fill("").concat(["Calendar Dashboard"]);
        while (titleRow.length < colCount) {
            titleRow.push(""); // ensure the row matches column count
        }

        csv.push(titleRow.join(","));
        csv.push("".repeat(colCount).split("").join(",")); // Blank line after title

        // Extract table rows
        var rows = document.querySelectorAll("#myTable tr");
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll("td, th");

            for (var j = 0; j < cols.length; j++) {
                var text = cols[j].innerText.replace(/"/g, '""');
                row.push('"' + text + '"');
            }

            csv.push(row.join(","));
        }

        // Create and trigger download
        var csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
        var downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    $scope.exportTableToPDF = function (filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add the title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text("Calendar Dashboard", 105, 20, { align: 'center' }); // center aligned title

        // Extract table headers and data
        var headers = [];
        var data = [];

        var table = document.getElementById("myTable");
        var rows = table.querySelectorAll("tr");

        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll("td, th");

            for (var j = 0; j < cols.length; j++) {
                row.push(cols[j].innerText.trim());
            }

            if (i === 0) {
                headers = row;
            } else {
                data.push(row);
            }
        }

        // AutoTable: add table below title
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 30, // position below the title
            theme: 'grid',
            styles: {
                fontSize: 10
            },
            headStyles: {
                fillColor: [255, 165, 0]  // Orange
            }
        });

        // Save the PDF
        doc.save(filename);
    };
     

    $scope.BindAct = function () {

        var collectionobj = {
            Action: 14,
            Industry: $scope.type,
            UserId: LoginId,
            currentMonth: $scope.currentMonth ,
            currentYear: $scope.currentYear 
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", collectionobj); 
        getData.then(function (response) {
            $scope.ActList = response.data.Result;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };
    $scope.BindCompliance = function () {
        var collectionobj = {
            Action: 15,
            Industry: $scope.type,
            UserId: LoginId,
            currentMonth: $scope.currentMonth,
            currentYear: $scope.currentYear
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", collectionobj);
        getData.then(function (response) {
            $scope.ComplianceList = response.data.Result;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };
    $scope.BindCategory = function () {
        var collectionobj = {
            Action: 16,
            Industry: $scope.type,
            UserId: LoginId,
              currentMonth: $scope.currentMonth,
            currentYear: $scope.currentYear
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", collectionobj);
        getData.then(function (response) {
            $scope.CategoryList = response.data.Result;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    };
    $scope.BindselectedSubcategory = function () {
        var collectionobj = {
            Action: 17,
            Industry: $scope.type,
            UserId: LoginId,
            currentMonth: $scope.currentMonth,
            currentYear: $scope.currentYear
        };
        debugger;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", collectionobj);
        getData.then(function (response) {
            $scope.selectedSubcategoryList = response.data.Result;
        }).catch(function (error) {
            console.error("Error fetching activity list:", error);
        });
    }; 


    $scope.clearFilters = function ()
    {
        $scope.ActId = "";
        $scope.SubCategory = "";
        $scope.Category = "";
        $scope.Compliance = "";
        $scope.Status = "";
        $scope.currentYear = "";
        $scope.currentMonth = "";
        //const today = new Date();
        //if ($scope.currentMonth == '') {
        //    $scope.currentMonth = today.getMonth() + 1;
        //    $scope.currentYear = today.getFullYear();
        //}
        //else {
        //    $scope.currentMonth = currentMonth;
        //    $scope.currentYear = currentYear;
        //}
    }


    $scope.BingDisplayedGrapgh = function () {
        var collectionobj = {};
        collectionobj.Action = 2;
        collectionobj.UserId = LoginId; 
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.DisplayedPercentage = response.data.Result[0].DisplayedPercentage;
            $scope.NotDisplayedPercentage = response.data.Result[0].NotDisplayedPercentage; 
            updateDonutChart($scope.DisplayedPercentage, $scope.NotDisplayedPercentage);
        });
    };

    $scope.BindComplianceIndustry = function () {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.Industry = $scope.Industry;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.IndustryComplianceList = response.data.Result;
         
        });
    }; 
    $scope.Bindceriticality = function () {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}'); 
        getData.then(function (response) {
            // Bind data to scope variables

          
          
            $scope.MediumPercentage = response.data.Result[0].MediumPercentage;
            $scope.HighPercentage = response.data.Result[0].HighPercentage;
            $scope.LowPercentage = response.data.Result[0].LowPercentage;
            $scope.InvalidPercentage = response.data.Result[0].InvalidPercentage;

            $scope.InvalidCount = response.data.Result[0].InvalidCount;
            $scope.LowCount = response.data.Result[0].LowCount;
            $scope.HighCount = response.data.Result[0].HighCount;
            $scope.MediumCount = response.data.Result[0].MediumCount;

            // Update the chart's data dynamically
            var myChart = new Chart(document.getElementById('riskMatrixChart'), {
                type: 'bar',
                data: {
                    labels: ['High', 'Medium', 'Low'],
                    datasets: [{
                        label: ['High'],
                        data: [
                            $scope.HighPercentage,  // High percentage
                            $scope.MediumPercentage,  // Medium percentage
                            $scope.LowPercentage   // Low percentage
                        ],
                        backgroundColor: ['#FD6C75', '#F99C30', '#2FBFDE'],
                        borderRadius: 10,  // Round the corners of the bars
                        barThickness: 90,   // Set the width of the bars (width of each bar)
                        maxBarThickness: 90,  // Maximum width of the bars
                        borderColor: 'rgba(0, 0, 0, 0)', // Transparent border to highlight shadow
                        borderWidth: 1,  // Optional border width for visibility of shadow effect
                    }]
                },
                options: {
                    responsive: false,
                    plugins: {
                        legend: {
                            display: false  // This will hide the legend completely
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)', // Light gray for grid lines
                                borderDash: [5, 5], // Dashed lines for horizontal grid
                                borderDashOffset: 0.5 // Fine-tune the appearance
                            },
                            title: {
                                display: true,
                                text: 'Percentage of Compliances'
                            }
                        },
                        x: {
                            grid: {
                                display: false // No vertical grid lines
                            },
                            title: {
                                display: true
                            }
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
        });
    };

    $scope.SetCompliance = function (Act, STATE_NM, ActOverview, Industry) {
        var content = unescape(ActOverview); // CKEditor HTML content
        content = content.replace(/background-color\s*:\s*[^;"]+;?/gi, '');
        var iframe = document.getElementById("dvDetailIframe");
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 14px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ccc; padding: 8px; }
                </style>
            </head>
            <body>${content}</body>
        </html>
    `);
        doc.close();

        $scope.Industry = Industry;
        $scope.Act = Act;
        $scope.StateName = STATE_NM;
    };

    
    $scope.BindClientOnboardingTiles = function () {
        var collectionobj = {};
        collectionobj.Action = 8;
        collectionobj.UserId = LoginId;
        collectionobj.Id = $scope.BoardingType;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.CompleteCount = response.data.Result[0].CompleteCount;
            $scope.PendingCount = response.data.Result[0].PendingCount;
            $scope.TotalCount = response.data.Result[0].TotalCount;  
        });
    }

    $scope.BindClientOnboardingDoc = function () {

        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.UserId = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;
        collectionobj.Id = $scope.BoardingType;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Doclist = response.data.Result;
            console.log($scope.Doclist);
            $scope.totalDoclist = response.data.Result;

        });
    }
    $scope.viewFile = function (file) {
        if (file) {
            let a = document.createElement("a");
            a.href = file;  // Assuming row.UploadFile contains the correct file URL
            a.download = file.split("/").pop(); // Extracts the filename from the path
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("No file uploaded.");
        }
    };
    $scope.SetValue = function (row, fuCandidatePhoto)
    {
        $scope.CACId = row.Id;
        $scope.ASD = row.ASD;
        $(fuCandidatePhoto).click();
    }
    $scope.fileSelected = function (files) {
        if (files && files.length > 0) {

            var file = files[0];
            //if (file.type !== "application/pdf") {
            //    showMsgBox('999', 'Alert', 'Only PDF files are allowed.', 'warning', 'btn-warning');
            //    return;
            // here is commented old code dated 02/05/2026 
            if (file.type !== "application/pdf" && file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && file.type !== "application/vnd.ms-excel"
            ) {
                showMsgBox('999', 'Alert', 'Only PDF or Excel files are allowed.', 'warning', 'btn-warning');
                return;
            }
        }
        $scope.UploadFile = files[0];
        $scope.AfterverifyRecord();
    }
    $scope.AfterverifyRecord = function () {
        if (isValidate()) {
            $scope.showLoader();
            var formData = new FormData(); 
            formData.append('UploadFile', $scope.UploadFile);
            formData.append('Createdby', LoginId);
            formData.append('CACId', $scope.CACId);
            formData.append('Action', '1');
            $http.post("../Retail/IUDClientOnBoardingDash", formData, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                showMsgBox(response.data.Result);
                $scope.BindClientOnboardingDoc();
                $scope.BindClientOnboardingTiles();
            }, function (error) {
                console.error('Error', error);
            });
        }
    }
    $scope.BindClientFilter = function () {

        var collectionobj = {};
        collectionobj.Action = 9;
        //collectionobj.Id = $scope.BoardingType;
        collectionobj.Id = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            const monthMap = ["Invalid Month", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            //$scope.MasterList = response.data.Result.map(item => {
            //    return {
            //        ...item,
            //        MonthName: monthMap[item.Month] || "Invalid Month"
            //    };
            //});
            $scope.MasterList = response.data.Result
             .filter(item => item.Month !== '' && item.Month !== null && item.Month !== undefined)
                .map(item => ({
                    ...item,
                    MonthName: monthMap[item.Month] || "Invalid Month"
                }));
            const distinctYears = [...new Set(response.data.Result.map(item => item.Year))];
            $scope.YearsList = distinctYears; 

        });
    }

    $scope.BindClientOnboardingDocfilter = function () {
        var collectionobj = {};
        collectionobj.Action = 7;
        collectionobj.UserId = LoginId;
        collectionobj.State = $scope.State;
        collectionobj.Month = $scope.Month;
        collectionobj.Year = $scope.Year;
        collectionobj.Id = $scope.BoardingType;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            
            $scope.totalDoclist = response.data.Result;
            console.log($scope.totalDoclist);
        });
    }
    $scope.BindBoardingMaster = function () {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.UserId = LoginId;
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BoardingList = response.data.Result;
        });
    }
    $scope.BindWholeDashboard = function () {
        $scope.BindClientOnboardingTiles();
        $scope.BindClientOnboardingDoc();
    }
    $scope.downloadAll = function () {
        $scope.selectedone = [];

        for (let i = 0; i < $scope.Doclist.length; i += 1) {
            setTimeout(function () {
                if ($scope.Doclist[i].UploadFile && $scope.Doclist[i].UploadFile !== 'undefined') {
                    $scope.selectedone.push($scope.Doclist[i].UploadFile);
                    $scope.id = $scope.Doclist[i].DocumentName;
                }
                
                var link = document.createElement('a');
                var ext = /^.+\.([^.]+)$/.exec($scope.Doclist[i].UploadFile);
                var extension = '';

                if (ext[1] == 'pdf') {
                    extension = '.pdf'
                    link.href = $scope.Doclist[i].UploadFile;
                    link.download =  $scope.Doclist[i].DocumentName + extension;
                    link.click();
                    link.remove();

                }
                
            }, i * 200);
        }

    }
    $scope.currentMonth = '';
    $scope.currentYear = '';
    $scope.LoadData = function (currentMonth, currentYear) {
        var trans = [];
        trans = window.location.href.slice(window.location.href.indexOf('?') + 1).split('%');
        var splitvalue = trans[0].split('|');

        $scope.type = splitvalue[0];
        const today = new Date();
        if (currentMonth == '') {
            $scope.currentMonth = today.getMonth() + 1;
            $scope.currentYear = today.getFullYear();
        }
        else {
            $scope.currentMonth = currentMonth;
            $scope.currentYear = currentYear;
        }

        $scope.BindCalender();

        $scope.BindAct(); $scope.BindCompliance(); $scope.BindCategory(); $scope.BindselectedSubcategory(); $scope.BindCalenderdetail(); $scope.BindCalender();
    }

    $scope.BindCalender = function () { 

        var collectionobj = {};
        collectionobj.Action = 11; 
        collectionobj.UserId = LoginId;
        collectionobj.Industry = $scope.type;
        collectionobj.currentYear = $scope.currentYear
        collectionobj.currentMonth = $scope.currentMonth
        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.CalenderList = response.data.Result;
        });
    }

    $scope.getdetail = function (state) {

        $scope.BindCalenderdetail(state); 
        $scope.BindAct(); $scope.BindCompliance(); $scope.BindCategory(); $scope.BindselectedSubcategory();
    }

    $scope.groupedCalenderDetail = {};


    $scope.BindCalenderOnclickdetail = function (Date) {
        var collectionobj = {
            Action: 19,
            UserId: LoginId,
            DueDate: Date,
            Industry: $scope.type
        };

        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            debugger;
            let data = response.data.Result;

            // Store full data
            $scope.calenderdetail = data;

            // Group by StateName (as you already have)
            $scope.filteredGroupedCalenderDetail = data.reduce((acc, item) => {
                if (!acc[item.StateName]) {
                    acc[item.StateName] = [];
                }
                acc[item.StateName].push(item);
                return acc;
            }, {});

            // ✅ Count statuses
            let pendingCount = 0;
            let compliedCount = 0;
            let delayCompliedCount = 0;

            data.forEach(item => {
                if (item.CStatus === "Pending") {
                    pendingCount++;
                } else if (item.CStatus === "Complied") {
                    compliedCount++;
                } else /*if (item.CStatus === "Delay Complied")*/ {
                    delayCompliedCount++;
                }
            });
            let total = data.length;
            // Store counts in $scope to use in HTML
            $scope.pendingCount = pendingCount;
            $scope.compliedCount = compliedCount;
            $scope.delayCompliedCount = delayCompliedCount;
            $scope.totalCount = total;
            // Optional: for percentage display
            
            var compliedPercent = total ? ((compliedCount / total) * 100).toFixed(2) : 0;
            var delayCompliedPercent = total ? ((delayCompliedCount / total) * 100).toFixed(2) : 0;
            var pendingPercent = total ? ((pendingCount / total) * 100).toFixed(2) : 0;
            $('.complied-bar').css('width', compliedPercent + '%');
            $('.delay-bar').css('width', delayCompliedPercent + '%');
            $('.pending-bar').css('width', pendingPercent + '%');

            $('.complied-percent').text(compliedPercent + '%');
            $('.delay-percent').text(delayCompliedPercent + '%');
            $('.pending-percent').text(pendingPercent + '%');

            $('.complied-count').text(compliedCount);
            $('.delay-count').text(delayCompliedCount);
            $('.pending-count').text(pendingCount);
        });
    };

    $scope.isRotating = false;

    $scope.Refresh = function ()
    {
        $scope.clearFilters();
        $scope.BindCalender();
        $scope.BindCalenderdetail()
        $scope.BindAct(); $scope.BindCompliance(); $scope.BindCategory(); $scope.BindselectedSubcategory();
    }
    $scope.BindCalenderdetail = function (state)
    {
        
        $scope.isRotating = true;  
        var collectionobj = {};
        collectionobj.Action = 18;
        collectionobj.UserId = LoginId;
        collectionobj.Id = state;
        collectionobj.Industry = $scope.type;
        collectionobj.ActId = $scope.ActId;
        collectionobj.Compliance = $scope.Compliance;
        collectionobj.SubCategory = $scope.SubCategory;
        collectionobj.Category = $scope.Category;
        collectionobj.Status = $scope.Status;
        collectionobj.currentYear = $scope.currentYear;
        collectionobj.currentMonth = $scope.currentMonth

        var getData = myService.methode('POST', "../Retail/SearchClientDashboard", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
           
            setTimeout(function () {
                $scope.isRotating = false;
                $scope.$apply(); // Because setTimeout is outside Angular digest
            }, 500);
                $scope.eventdate = response.data.Result;
                let data = response.data.Result; 
            $scope.calenderdetail = response.data.Result;
                $scope.filteredGroupedCalenderDetail = data.reduce((acc, item) =>
                {
                    if (!acc[item.StateName]) {
                        acc[item.StateName] = [];
                    }
                    acc[item.StateName].push(item);
                    return acc;
                }, {});

            // ✅ Count statuses
            let pendingCount = 0;
            let compliedCount = 0;
            let delayCompliedCount = 0;

            data.forEach(item => {
                if (item.CStatus === "Pending") {
                    pendingCount++;
                } else if (item.CStatus === "Complied") {
                    compliedCount++;
                } else /*if (item.CStatus === "Delay Complied")*/
                {
                    delayCompliedCount++;
                }
            });
            let total = data.length;
            // Store counts in $scope to use in HTML
            $scope.pendingCount = pendingCount;
            $scope.compliedCount = compliedCount;
            $scope.delayCompliedCount = delayCompliedCount;
            $scope.totalCount = total;
            // Optional: for percentage display

            var compliedPercent = total ? ((compliedCount / total) * 100).toFixed(2) : 0;
            var delayCompliedPercent = total ? ((delayCompliedCount / total) * 100).toFixed(2) : 0;
            var pendingPercent = total ? ((pendingCount / total) * 100).toFixed(2) : 0;
                
             
            $('.complied-bar').css('width', compliedPercent + '%');
            $('.delay-bar').css('width', delayCompliedPercent + '%');
            $('.pending-bar').css('width', pendingPercent + '%');

            $('.complied-percent').text(compliedPercent + '%');
            $('.delay-percent').text(delayCompliedPercent + '%');
            $('.pending-percent').text(pendingPercent + '%');

            $('.complied-count').text(compliedCount);
            $('.delay-count').text(delayCompliedCount);
            $('.pending-count').text(pendingCount);
        })
    }
    $scope.Viewexcelfile = function (x) {
        if (!x || !x.SampleFile) return;

        var link = document.createElement('a');
        link.href = x.SampleFile;

        // 👉 Safe extension extraction
        var fileExt = '';
        if (x.SampleFile.includes('.')) {
            fileExt = x.SampleFile.split('.').pop().split('?')[0]; // remove query params
        }
        var fileName = (x.DocumentName || 'File');

        link.download = fileName + (fileExt ? '.' + fileExt : '');

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
} 