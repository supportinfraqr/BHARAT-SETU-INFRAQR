/// <reference path="controller.js" />
var LoginId = sessionStorage.getItem("LoginId");
var BranchCode = sessionStorage.getItem("BranchCode");
var loginType = sessionStorage.getItem("loginType");
var LastLogin = sessionStorage.getItem("LastLogin");
var Desig = sessionStorage.getItem("Desig");
var Name = sessionStorage.getItem("Name");
var BranchName = sessionStorage.getItem("BranchName");
var ContactNo = sessionStorage.getItem("ContactNo");
var CreatedOn = sessionStorage.getItem("CreatedOn");
var Photo = sessionStorage.getItem("Photo");
var BranchAddress = sessionStorage.getItem("BranchAddress");

debugger;
if (LoginId == "-1" || LoginId == null || LoginId == "" || LoginId == "null") {
    window.top.location.href = '../Login/Login';
} 
if (BranchCode == "-1" || BranchCode == null || BranchCode == "" || BranchCode == "null") {
    window.top.location.href = '../Login/Login';
} 
if (loginType == "-1" || loginType == null || loginType == "" || loginType == "null") { 
    window.top.location.href = '../Login/Login';
}

app.directive('repeatDone', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ArrowMove');
            });
        }
    };
});

app.directive('liRepeatDone', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ListPartyPaymentSheet');
            });
        }
    };
});

app.directive('repeatDoneArrowMoveExpensItem', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ArrowMoveExpensItem');
            });
        }
    };
});

app.directive('tableItemResponsive', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('TableItemResponsiveSet');
            });
        }
    };
});

app.directive('validateNumberAndDecimalOnly', function () {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            if (!ngModelCtrl) {
                return;
            }

            ngModelCtrl.$parsers.push(function (val) {
                if (angular.isUndefined(val)) {
                    var val = '';
                }
                var clean = val.replace(/[^0-9.]/g, '');
                if (val !== clean) {
                    ngModelCtrl.$setViewValue(clean);
                    ngModelCtrl.$render();
                }
                scope.$applyAsync();
                return clean;
            });

            element.bind('keypress', function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
            });
        }
    };
});

app.directive('validateNumberAndDecimalOnlyForPer', function () {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            if (!ngModelCtrl) {
                return;
            }

            ngModelCtrl.$parsers.push(function (val) {
                if (angular.isUndefined(val)) {
                    var val = '';
                }
                var clean = val.replace(/[^0-9.]/g, '');
                if (Number(clean) >= 0 && Number(clean) <= 100) {
                    if (val !== clean) {
                        ngModelCtrl.$setViewValue(clean);
                        ngModelCtrl.$render();
                    }
                }
                else {
                    ngModelCtrl.$setViewValue('');
                    ngModelCtrl.$render();
                }
                   
                scope.$applyAsync();
                return clean;
            });

            element.bind('keypress', function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
            });
        }
    };
});

app.directive('validateNumberOnly', function () {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            if (!ngModelCtrl) {
                return;
            }

            ngModelCtrl.$parsers.push(function (val) {
                if (angular.isUndefined(val)) {
                    var val = '';
                }
                var clean = val.replace(/[^0-9]+/g, '');
                if (val !== clean) {
                    ngModelCtrl.$setViewValue(clean);
                    ngModelCtrl.$render();
                }
                return clean;
            });

            element.bind('keypress', function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
            });
        }
    };
});

app.directive('twoDecimalPlace', function () {
    return {
        require: 'ngModel',
        scope: true,
        link: function (scope, elm, attrs, ctrl) {
            elm.bind('blur', function (event) {
                var currValue = ctrl.$modelValue;
                var newValue = Number(currValue).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 2 });
                ctrl.$setViewValue(newValue);
                ctrl.$render();
                scope.$applyAsync();
                event.preventDefault();
                 // needed if other parts of the app need to be updated
            });
        }
    };
});

app.directive('fourDecimalPlace', function () {
    return {
        require: 'ngModel',
        scope: true,
        link: function (scope, elm, attrs, ctrl) {
            elm.bind('blur', function (event) {
                var currValue = ctrl.$modelValue;
                var newValue = Number(currValue).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 4 });
                ctrl.$setViewValue(newValue);
                ctrl.$render();
                scope.$applyAsync();
                event.preventDefault();
                // needed if other parts of the app need to be updated
            });
        }
    };
});

app.directive('tenDecimalPlace', function () {
    return {
        require: 'ngModel',
        scope: true,
        link: function (scope, elm, attrs, ctrl) {
            elm.bind('blur', function (event) {
                var currValue = ctrl.$modelValue;
                var newValue = Number(currValue).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 10 });
                ctrl.$setViewValue(newValue);
                ctrl.$render();
                scope.$applyAsync();
                event.preventDefault();
                // needed if other parts of the app need to be updated
            });
        }
    };
});

app.directive('orientable', function () {
    return {
        link: function (scope, element, attrs) {
            element.bind("load", function (e) {
            });
        }
    }
});
app.directive('aadhaar', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var jqueryElement = $('#' + element.attr('id'));
            var isFocus = false;
            element.on('keyup', function () {
                isFocus = false;
                var aadhaarno = element.val();
                if (Number(aadhaarno.replace(/\s/g, '')) && aadhaarno.replace(/\s/g, '').length > 0) {
                    var aadhaarno = element.val();
                    var arrayofaadhaarno = aadhaarno.replace(/\s/g, '').split('');
                    var newaadhaarno = "";
                    $.each(arrayofaadhaarno, function (i, val) {
                        if (i == 4 || i == 8) {
                            newaadhaarno = newaadhaarno + ' ' + val;
                        }
                        else {
                            newaadhaarno = newaadhaarno + val;
                        }
                        if (i >= 11) return false;
                    });
                    element.val(newaadhaarno);
                    $scope.studentDetails.AadhaarNo = newaadhaarno
                    if (newaadhaarno.replace(/\s/g, '').split('').length <= 11) {
                        element.focus();
                        addToolTip(jqueryElement, "Must be 12 digit!");
                        isFocus = true;
                    }
                }
                else {
                    if (element.val() != "") {
                        isFocus = true;
                        element.focus();
                        element.val(element.val().replace(/[a-zA-Z]/g, ''));
                        addToolTip(jqueryElement, "Must be numeric value!");
                    }
                }

                if (!isFocus)
                    removeToolTip(jqueryElement);
            });

            element.on('blur', function () {
                if (isFocus)
                    element.focus();
                else
                    removeToolTip(jqueryElement);
            });
        }
    };
});

app.directive('clockPicker', function () {
    return {
        require: '?ngModel',
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.blur(function (e) {
                var model = attrs['ngModel'];
                scope[model] = $(this).val();
                scope.$applyAsync();
            });
        }
    }
});

app.directive('threadList', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('threadList-init');
            });
        }
    };
});
app.directive('addPageBreakCheckHp', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('addPageBreakCheckHpRun');
            });
        }
    };
});
app.directive('chatRepeatDone', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('slimscroll-init');
            });
        }
    };
});
app.directive('bodyDetailsDone', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('bodyDetails-scroll');
            });
        }
    };
});
app.directive('owldemorepeatDone', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('owldemo');
            });
        }
    };
}); 
app.directive('upScrollDone1', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ScrollDone1');
            });
        }
    };
});
app.directive('upScrollDone2', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ScrollDone2');
            });
        }
    };
});
app.directive('upScrollDone3', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ScrollDone3');
            });
        }
    };
});
app.directive('upScrollDone4', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ScrollDone4');
            });
        }
    };
});
app.directive('upScrollDone5', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('ScrollDone5');
            });
        }
    };
});
app.directive('tooltip', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            $('[data-toggle=tooltip]').hover(function () {

                // on mouseenter
                $(this).tooltip('show');
            }, function () {
                // on mouseleave
                $(this).tooltip('hide');
            });
        }
    };
});
app.directive('menurepeatDone', function ($timeout) {
    return function (scope) {
        if (scope.$last) {
            $timeout(function () {
                scope.$emit('NavCollapse');
            });
        }
    };
});
app.directive('chkGroupList', function () {
    return {
        scope: {
            index: '=',
            items: '=chkGroupList'
        },
        link: function (scope, elem, attrs, ctrl) {
            elem.bind('change', function () {
                var i = 0;
                scope.co = 0;
                for (; i < scope.items.length; i++) {
                    if (scope.items[i].IsActive == true)
                    { scope.co = scope.co + 1; }
                }
                scope.$parent.$parent[attrs['setinto']] = scope.co;
                scope.$applyAsync();
                event.preventDefault();
            });

        
        }
    };
});




app.controller('myController', function ($scope, $element, $sce, $timeout, $interval, $filter, $http, $compile, myService) {




    $scope.LoginId = LoginId;
    $scope.BranchCode = BranchCode;
    $scope.loginType = loginType;
    $scope.LastLogin = LastLogin; 
    $scope.Name = Name; 
    $scope.BranchName = BranchName;
    $scope.ContactNo = ContactNo;
    $scope.Desig = Desig;
    $scope.CreatedOn = CreatedOn;
    $scope.Photo = Photo;
    $scope.BranchAddress = BranchAddress;

  

    //$scope.alert = function (msg) {
    //    console.log(msg);
    //}

    $scope.BindNotification = function () {
        var collectionobj = {};
        collectionobj.Action = 16;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../SaudaEntry/GetNotification", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.Table.length > 0)
            {

                $scope.AllNotification = response.data.Result.Table;
                $scope.Ncount = response.data.Result.Table[0].Ncount;
            }
            
        });
    };
    $scope.$on('ArrowMove', function () {
        if (IsFunctionDefined('ArrowMoveWithOutFirstFocus')) {
            $scope.ArrowMoveWithOutFirstFocus("#collapseinputbox");
        }
    });
    $scope.$on('ArrowMoveExpensItem', function () {
        $scope.ArrowMove('#expensitem');
    });
    $scope.ListPartyPaymentSheetDone = 0;
    $scope.$on('ListPartyPaymentSheet', function () {
        $scope.ListPartyPaymentSheetDone = 1;
    });
    $scope.$on('TableItemResponsiveSet', function () {
        
        setTimeout(function () {
            
            // init Isotope
            var $grid = $('#ExpenseBox').isotope({
                itemSelector: '.table-item',
                percentPosition: true,
                transitionDuration: '0.2s',
                //layoutMode: 'fitRows',
                masonry: {
                    columnWidth: '.table-item',
                }
            });
        }, 2000);
    });
    
     $scope.FilterToggle = function () {
        
        $(".section-toggle").slideToggle('slow');
        $(".filter-toggle").toggleClass("open");
    };
    $scope.showLoader = function () {
        $('#cover-spin').show(0);
    };

    $scope.hideLoader = function () {
        $('#cover-spin').hide();
    };

    $scope.trustAsHtml = function (html) {
        return $sce.trustAsHtml(html);
    };

    $scope.NumSum = function (numList) {
        var List = [];
        $.each(numList, function (index,val) {
            var obj = { 'num': val }
            List.push(obj)
        });
        return List.sum('num');
    }
    $scope.GetReportHeaderUsingCategory = function (reportcategoryname) { 
        var collectionobj = {};
        collectionobj.Action = 5;
      
        collectionobj.BranchCode = BranchCode;
        collectionobj.ReportCategoryName = reportcategoryname; 
        var getData = myService.methode('POST', "../DashBoard/GetReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0)
                $scope.ReportHeader = $sce.trustAsHtml(response.data.Result[0].HeaderHtml);

        });
    }

    $scope.ConvertAmountToDecimalPoint = function (amount) {
        //
        if (amount >= 0 || amount <= 0) {
            return $scope.checkNaN(amount).toLocaleString("en", { useGrouping: false, minimumFractionDigits: $scope.Amt, maximumFractionDigits: $scope.Amt });
        }
        else { return ""; }
      
    }

    $scope.ConvertQtyToDecimalPoint = function (Qty) {
        //
        debugger;
        if (Qty >= 0 || Qty <= 0) 
            return $scope.checkNaN(Qty).toLocaleString("en", { useGrouping: false, minimumFractionDigits: $scope.Qty, maximumFractionDigits: $scope.Qty });
        else { return ""; }
    }

    $scope.ConvertPerToDecimalPoint = function (Per) {
        //
        if (Per >= 0 || Per <= 0) 
            return $scope.checkNaN(Per).toLocaleString("en", { useGrouping: false, minimumFractionDigits: $scope.Per, maximumFractionDigits: $scope.Per });
        else { return ""; }
    }

    $scope.ConvertToTwoDecimalPoint = function (amount) {
        return $scope.checkNaN(amount).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    $scope.ConvertToDecimalPoint = function (amount, point) {
        if (amount >= 0 || amount <= 0)
            return $scope.checkNaN(amount).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: point });
        else { return ""; }
        //if (amount >= 0 || amount <= 0)
        //    return $scope.checkNaN(amount).toLocaleString("en", { useGrouping: false, minimumFractionDigits: $scope.Per, maximumFractionDigits: point });
        //else { return ""; }
    }

    $scope.checkNaN = function (amount) {
        if (isNaN(amount))
            return 0;
        else
            return Number(amount)
    }

    

    

    $scope.numbersOnly = function (value) {
        $scope.number=value.replace(/\D+/g, '');
        return $scope.number;
    }

    $scope.decimalOnly = function (value) {
        $scope.number = value.replace(/[^\d\.*]+/g, '');
        return $scope.number;
    }

    $scope.Logout = function () {
        sessionStorage.removeItem("LoginId");
        sessionStorage.removeItem("BranchCode");
        sessionStorage.removeItem("loginType");
        sessionStorage.removeItem("LastLogin");
        sessionStorage.removeItem("Desig");
        sessionStorage.removeItem("Name");
        sessionStorage.removeItem("BranchName");
        sessionStorage.removeItem("ContactNo");
        sessionStorage.removeItem("CreatedOn");
        sessionStorage.removeItem("Photo");
        window.top.location.href = '../Login/Login';

       
    };

  


    $scope.PrintForm = function (print, title) {

        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /></head><body onload="window.print()" class="dt-print-view">' + print + '</body></html>';
        popupWin.document.write(head);
        popupWin.document.close();
    }
    $scope.tablewidth = '100%';
    $scope.ExportToExcel = function (printHeader) {
        var message = "";
        var seprator = "";
        var filter = "<span class='filter' ></span> ";
        var j = 0;
        if (messagevalues.length > 0)
            $.each(messagevalues, function (i, values) {
                $.each(values, function (key, val) {
                    j = j + 1;
                    if (val != null && val != "") {
                        if (j == 3) {
                            message = message + "</br>"
                            j = 0;
                        }
                        else {
                            message = message + seprator + filter;
                        }
                        message = message + "<span class='filter-title-name' >" + key + "</span> : <span class='filter-title' style='font-weight: 600;'>" + val + "</span>"

                        filter = " ";
                    };
                });
            });

 

        
        var docSize = $scope.DocSize;
        var docOrientation = $scope.DocOrientation;
        if ($scope.DocOrientation == '' || $scope.DocOrientation == undefined) {
            docOrientation = "portrait";
        }
        if ($scope.DocSize == '' || $scope.DocSize == undefined) {
            docSize = 'A4';
        }
        $scope.Orientation = (docOrientation == "portrait" ? 'p' : 'l');
       
 
       

            if (printHeader != undefined) {
                if (($('#dvPrint').find('#print-title')).length == 0)
                    $('#dvPrint').find('#ReportHeader').append('<div id="print-title">' + printHeader + '</div>');
            }
            if (message.length > 0)
                if (($('#dvPrint').find('#FilterTitle')).length == 0)
                    $('#dvPrint').find('#tbl').append('<caption class="hide-label"><div id="FilterTitle">' + message + '</div></caption>');
                else
                    $('#dvPrint').find('#FilterTitle').html(message);
            //if (docOrientation == "landscape")
            if (typeof ($scope.FontSize) === 'undefined') {
                var style = 'width: ' + $scope.tablewidth + ';margin: auto;';
            }
            else {
                var style = 'width: ' + $scope.tablewidth + ';margin: auto;font-size: ' + $scope.FontSize + 'px;';
            }

            var printContents = $('#dvPrint').html();
            var popupWin = window.open('', '_blank', 'width=1500,height=1000');
            popupWin.document.open();

            popupWin.document.write('<html><head><meta charset="utf-8" /><style type="text/css" media="print">@page { size:' + docSize.toUpperCase() + ' ' + docOrientation.toUpperCase() + '; }</style><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /><style type="text/css"> @media print { .noprintable {  display: none;   } } </style><script src="https://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js"></script> <script src="https://www.jquery-az.com/jquery/js/table2excel/jquery.table2excel.js"></script></head><body style=\'' + style + '\' ><button id="btnExcelPrint" type="button" value="Print" class="btn2 btn-common btn-3 btn-3d pe-7s-print noprintable" name="ExcelprintButton"   onclick="PrintExcelRecord()" > <span class="triangle-box" title="Excel"></span> <span>Excel </span> </button> <button id="btnPrint" type="button" value="Print" class="btn2 btn-common btn-3 btn-3d pe-7s-print  noprintable" name="printButton"   onclick="PrintRecord()" > <span class="triangle-box" title="Print"></span> <span>Print </span> </button> <script>function  PrintRecord(){ window.print();}</script><div id="dvPrintexcel">' + printContents + '</div></body></html>');
            popupWin.document.close();
            
        return false;
    }


    $scope.Export = function (mode, printHeader) {
        var message = "";
        var seprator = "";
        var filter = "<span class='filter' ></span> ";
        var j = 0;
        if (messagevalues.length > 0)
            $.each(messagevalues, function (i, values) {
                $.each(values, function (key, val) {
                    j = j + 1;
                    if (val != null && val != "") {
                        if (j == 3) {
                            message = message + "</br>"
                            j = 0;
                        }
                        else {
                            message = message + seprator + filter;
                        }
                        message = message + "<span class='filter-title-name' >" + key + "</span> : <span class='filter-title' style='font-weight: 600;'>" + val + "</span>"

                        filter = " ";
                    };
                });
            });
        
        

        
        var docSize = $scope.DocSize;
        var docOrientation = $scope.DocOrientation;
        if ($scope.DocOrientation == '' || $scope.DocOrientation == undefined)
        {
            docOrientation = "portrait";
        }
        if ($scope.DocSize == '' || $scope.DocSize == undefined)
        {
            docSize = 'A4';
        }
        $scope.Orientation = (docOrientation == "portrait" ? 'p' : 'l');
        if (typeof (mode) === 'undefined') return;
        if (mode == "pdf") {
            html2canvas(document.querySelector("#dvPrint")).then(canvas => {
                var pdf = new jsPDF($scope.Orientation, "mm", docSize);
                var width = pdf.internal.pageSize.getWidth();
                var height = pdf.internal.pageSize.getHeight();
                var imgData = canvas.toDataURL("image/png", 100.0);

                pdf.addImage(imgData, 'PNG', 0, 0, width, height);
                pdf.save(window.document.title);
            });
        }

        if (mode == "print") {

            if (printHeader != undefined) {
                if (($('#dvPrint').find('#print-title')).length == 0)
                    $('#dvPrint').find('#ReportHeader').append('<div id="print-title">' + printHeader + '</div>');
            }
            if (message.length>0)
            if (($('#dvPrint').find('#FilterTitle')).length == 0)
                $('#dvPrint').find('#tbl').append('<caption class="hide-label"><div id="FilterTitle">' + message + '</div></caption>');
            else
                $('#dvPrint').find('#FilterTitle').html(message);
            //if (docOrientation == "landscape")
            if (typeof ($scope.FontSize) === 'undefined') {
                var style = 'width: ' + $scope.tablewidth + ';margin: auto;';
            }
            else {
                var style = 'width: ' + $scope.tablewidth + ';margin: auto;font-size: ' + $scope.FontSize + 'px;';
            }

            var printContents = $('#dvPrint').html();
            var popupWin = window.open('', '_blank', 'width=1500,height=1000');
            popupWin.document.open();
      
            popupWin.document.write('<html><head><meta charset="utf-8" /><style type="text/css" media="print">@page { size:' + docSize.toUpperCase() + ' ' + docOrientation.toUpperCase() + '; }</style><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /></head><body style=\'' + style + '\' onload="window.print()">' + printContents + '</body></html>');
            popupWin.document.close();
        }

        return false;
    }
    $scope.PrintMasterHeader = function () {
        var reportHeader = $('.ReportHeader');
        var div = $('<div><div class="ReportHeader" style="font-size:' + fontSize + '">' + reportHeader.html() + '</div></div>');
        return div;
    }

    $scope.PrintMaster = function (tblheader, data, title) {
        if (title == null)
            title = window.document.title;

        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = "0"; i < l; i++) {
            var val = tblheader[i]
            theadrow.append('<th>' + val.HeaderText + '</th>');
        }

        thead.append(theadrow);

        tab.append(thead);
        var tbody = $('<tbody></tbody>');
        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                if (value == 'undefined' || value == null) { value = "" }
                if (key == "Id" || key == "#") {
                    trow.append('<td>' + (i + 1) + '</td>');
                }
                else {
                    if (val.ImageColumn == "Yes") {
                        trow.append('<td><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        trow.append('<td>' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value)) + '</td>');
                    }
                }
            });
            tbody.append(trow);
        });
        tab.append(tbody);
        var div = $('<div class="col-lg-12"></div>');
        var h1 = $('<h1>' + title + '</h1>');
        div.append(h1);
        div.append(tab);
        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var table = div.html();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /></head><body onload="window.print()" class="dt-print-view">' + $scope.PrintMasterHeader().html() + '' + table + '</body></html>';
        popupWin.document.write(head);
        popupWin.document.close();
    };

    $scope.PrintChildMaster = function (tblheader, data, title) {

        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = "0"; i < l; i++) {
            var val = tblheader[i]
            // Append header here
            theadrow.append('<th>' + val.HeaderText + '</th>');
        }

        thead.append(theadrow);

        tab.append(thead);
        var tbody = $('<tbody></tbody>');
        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                if (value == 'undefined' || value == null) { value = "Sorry No Data Found!" }
                if (key == "Id" || key == "#") {ViewNotification
                    trow.append('<td>' + (i + 1) + '</td>');
                }
                else {
                    if (val.ImageColumn == "Yes") {
                        trow.append('<td><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        trow.append('<td>' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value)) + '</td>');
                    }
                }
            });
            tbody.append(trow);
        });
        tab.append(tbody);
        var div = $('<div class="col-lg-12"></div>');
        var h1 = $('<table class="table p-table "><tr><td><h4>' + title + '<h4></td></tr></table>');
        div.append(h1);
        div.append(tab);
        var table = div.html();
        return table;
    };

    $scope.PrintNestedMaster = function (tblheader, data, title, tblnheader, ndata) {

        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');
        var tbody = $('<tbody></tbody>');
        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                if (value == 'undefined' || value == null) { value = "Sorry No Data Found!" }
                if (key == "Id" || key == "#") {
                    trow.append('<td>' + (i + 1) + '</td>');
                }
                else {
                    if (val.ImageColumn == "Yes") {
                        trow.append('<td><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        trow.append('<td>' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value)) + '</td>');
                    }
                }
            });
            tbody.append(trow);
        });
        var trow = $('<tr></tr>');
        trow.append('<td>' + $scope.PrintChildMaster(tblnheader, ndata, '') + '</td>');
        tbody.append(trow);

        tab.append(tbody);
        var div = $('<div class="col-lg-12"></div>');
        var h1 = $('<table class="table p-table "><tr><td><h4>' + title + '<h4></td></tr></table>');
        div.append(h1);
        div.append(tab);
        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var table = div.html();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /></head><body onload="window.print()">' + $scope.PrintMasterHeader().html() + '' + table + '</body></html>';
        popupWin.document.write(head);
        popupWin.document.close();
    };

    $scope.Print2ndMaster = function (tblheader, data, title) {

        var tab = $('<table    ></table>');
        var tbody = $('<tbody></tbody>');
        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                if (value == 'undefined' || value == null) {
                }
                else {
                    if (key == "Id" || key == "#") {
                        trow.append('<td>' + (i + 1) + '</td>');
                    }
                    else {
                        if (val.ImageColumn == "Yes") {
                            trow.append('<td><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                        }
                        else {
                            trow.append('<td>' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value)) + '</td>');
                        }
                    }

                }


            });
            tbody.append(trow);
        });
        tab.append(tbody);
        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var table = tab.html();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /></head><body onload="window.print()">' + table + '</body></html>';
        popupWin.document.write(head);
        popupWin.document.close();
    };

    $scope.Print = function (title) {
        
        var print = $('#printDiv').html();
        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /></head><body onload="window.print()" style="background:#fff;">' + print + '</body></html>';
        popupWin.document.write(head);
        setTimeout(function () { popupWin.document.close(); }, 1000);
    }

    $scope.PrintVoucher = function (transid,vouchertype,adjustmentvoucher) {
        var collectionobj = {};
        if (adjustmentvoucher == 1)
        { collectionobj.Action = 16 }
        else { collectionobj.Action = 6; }
        
        collectionobj.FYId = fyId;
        collectionobj.SchoolCode = schoolCode;
        collectionobj.BranchCode = branchCode;
        collectionobj.CompCode = compCode;
        collectionobj.SiteCode = siteCode;
        collectionobj.VoucherType = vouchertype;
        collectionobj.TransId = transid;
        
        var getData = myService.methode('POST', "../Voucher/GetLedgerVoucher", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0)
            {
                $scope.VoucherType = response.data[0].VoucherType;
                $scope.VoucherNo = response.data[0].VoucherNo;
                $scope.VDate = response.data[0].VDate;
                $scope.VNarr = response.data[0].VoucherNarr;
                $scope.VoucherType = response.data[0].VoucherType;
                $scope.CNCD = response.data[0].CNCD;
                $scope.ChqDate = response.data[0].ChqDate;
                $scope.ChqNo = response.data[0].ChqNo;
                $scope.VoucherDetailData = response.data
                $scope.totalDrAmt = (Number($scope.VoucherDetailData.sum('DrAmt'))).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2 });
                $scope.totalCrAmt = (Number($scope.VoucherDetailData.sum('CrAmt'))).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2 });

                $scope.MergerdCode = $scope.totalDrAmt.split('.');
                $scope.InWords = convertNumberToWords($scope.MergerdCode[0]) + " Rupees";

                if (Number($scope.MergerdCode[1]) != Number(0))
                { $scope.InWords += " and "+convertNumberToWords($scope.MergerdCode[1]) + " Paisa"; }
                
                $scope.InWords += " Only.";
                

                setTimeout(function () { $scope.Print("Ledger Voucher"); }, 2000);
            }
            
        })
    };

    $scope.PrintItemlist = function (transid, showratelist, call) {
        if (call == 1) {
            var collectionobj = {};
            collectionobj.Action = 26;

            if (transid !== undefined)
            { collectionobj.Code = transid; }

            collectionobj.FYId = fyId;
            collectionobj.SchoolCode = schoolCode;
            collectionobj.BranchCode = branchCode;
            collectionobj.CompCode = compCode;
            collectionobj.SiteCode = siteCode;

            var getData = myService.methode('POST', "../Inventory/GetItemMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                if (response.data.length == 0) return;

                if (response.data.Table.length > 0) {
                    $scope.ItemData = response.data.Table;
                    if (showratelist == true)
                    { $scope.ItemRateData = response.data.Table1; }
                    else { $scope.ItemRateData = ""; }


                    setTimeout(function () { $scope.Print("Item List"); }, 2000);
                }

            })
        }
    };
    
    $scope.NavMenu = function () {

        $scope.collectionobj = {};
        $scope.collectionobj["LoginId"] = JSON.parse(LoginId);
        $scope.collectionobj["BranchCode"] = BranchCode; 
        $scope.collectionobj["LoginType"] = loginType;
        var getData = myService.methode('POST', '../DashBoard/NavMenuList', '{obj:' + JSON.stringify($scope.collectionobj) + '}');
        getData.then(function (response) { 
            $scope.ModuleList = response.data.Result; 
        });
    };

    $scope.SetFocus = function (id, checkvalidation, duration) {
        if (duration == null || Number(duration) === false)
            duration = 1100;

        $timeout(function () {
            $(id).focus();
            if (checkvalidation === true) {
                isValidate();
            }
        }, duration);
    };

    $scope.$on('NavCollapse', function () {

        var sidebarNavCollapse = $('.fixed-sidebar-left .side-nav  li .collapse');
        var sidebarNavAnchor = '.fixed-sidebar-left .side-nav  li a';
        $(document).on("click", sidebarNavAnchor, function (e) {
            if ($(this).attr('aria-expanded') === "false")
                $(this).blur();
            $(sidebarNavCollapse).not($(this).parent().parent()).collapse('hide');
        });
    });

    $scope.$on('threadList-init', function () {
        var InW = $(window).width();
        var InH = $(window).height();

        if (InW > 640) {
            var setH = InH - 172  //180
            var itemContainer = $(".threadList-scroll");
            itemContainer.slimScroll({ height: setH, size: '4px', color: '#878787', disableFadeOut: true, borderRadius: 0 });

        }
        else if ((InW <= 640) && (InW > 480)) {
            var setH = InH - 172  //180

            var itemContainer = $(".threadList-scroll");
            itemContainer.slimScroll({ height: setH, size: '4px', color: '#878787', disableFadeOut: true, borderRadius: 0 });

        }
        else if ((InW <= 480) && (InW >= 412)) {
            var setH = InH - 172  //180
            var itemContainer = $(".threadList-scroll");
            itemContainer.slimScroll({ height: setH, size: '4px', color: '#878787', disableFadeOut: true, borderRadius: 0 });

        }
        else {
            var setH = InH - 172  //180
            var itemContainer = $(".threadList-scroll");
            itemContainer.slimScroll({ height: setH, size: '4px', color: '#878787', disableFadeOut: true, borderRadius: 0 });

        }
    });

    $scope.$on('addPageBreakCheckHpRun', function () {
        
        $(function () {
            var cls = document.querySelectorAll('.voucher-layout');
           
            for (var i = 1; i < cls.length; i++) {
                
                //cls[i].style.display = 'none';
                var fid = "#VoucherID" + i;
                var voucherheight = $(fid).height();
                if (voucherheight >= 522)
                {
                    $(fid).parent().parent().append("<p class='page-b page-b-after'>&nbsp;</p>");
                }
                else {
                 
                    if((i%2 == 0) && (i>1))
                    {
                        $(fid).parent().parent().append("<p class='page-b page-b-after'>&nbsp;</p>");
                    }
                }
            }
            //$(".voucher-layout").each(function () {
            //    $(this).html("Found this one");
            //});
        });
    });
    
    $scope.$on('bodyDetails-scroll', function () {

        var InW = $(window).width();
        var InH = $(window).height();
        var FinalSetH
        
        $('.body-details-scorll').css({ "height": 0 });
        var headerHeight = $("#QHeaderHight").height();

        var AddHeight = (isNaN(headerHeight) || headerHeight == null) ? 0 : parseInt(headerHeight);

        if (AddHeight == 0) {
            FinalSetH = $('.body-details-scorll').css({ "height": (InH - 179) });
        }
        else {
            AddHeight = AddHeight - 19;
            FinalSetH = $('.body-details-scorll').css({ "height": (InH - (179 + AddHeight)) });
        }


        var setH = FinalSetH;


        var itemContainer = $(".body-details-scorll");
        var scrollTo_int = itemContainer.prop('scrollHeight') + 'px';
        itemContainer.slimScroll({
            scrollTo: scrollTo_int,
            height: setH,
            size: '4px',
            color: '#878787',
            borderRadius: 0,
            start: 'top',
        });
        
        $(".query-show-body").css({ "height": (InH - (159 + AddHeight)) });
        $('[data-toggle="tooltip"]').tooltip();
    });

    $scope.$on('slimscroll-init', function () {
        var InW = $(window).width();
        var InH = $(window).height();
        var FinalSetH;
        
        $('#QueryScrollControl').css({ "height": 0 });
        var headerHeight = $("#QHeaderHight").height();

        var AddHeight = (isNaN(headerHeight) || headerHeight == null) ? 0 : parseInt(headerHeight);

        if (AddHeight == 0) {
            FinalSetH = $('#QueryScrollControl').css({ "height": (InH - 215) });
        }
        else {
            AddHeight = AddHeight - 19;
            FinalSetH = $('#QueryScrollControl').css({ "height": (InH - (215 + AddHeight)) });
        }


        var setH = FinalSetH;


        var itemContainer = $("#QueryScrollControl");
        var scrollTo_int = itemContainer.prop('scrollHeight') + 'px';
        itemContainer.slimScroll({

            scrollTo: scrollTo_int,
            height: setH,
            size: '4px',
            color: '#878787',
            borderRadius: 0,
            start: 'bottom',

        });
        $(".query-show-body").css({ "height": (InH - (149 + AddHeight)) });
        //$('#QueryScrollControl').css({ "min-height": (InH - 121) });
        //$('#QueryScrollControl').parent(".slimScrollDiv").css({ "height": (InH - 121) });

    });

    $scope.$on('ScrollDone1', function () {
        $("#topscroll1").bootstrapNews({
            newsPerPage: 10,
            autoplay: false,
            pauseOnHover: true,
            direction: 'up',
            newsTickerInterval: 2000,
            onToDo: function () {
                //console.log(this);
            }
        });
    });

    $scope.$on('ScrollDone2', function () {
        $("#topscroll2").bootstrapNews({
            newsPerPage: 10,
            autoplay: false,
            pauseOnHover: true,
            direction: 'up',
            newsTickerInterval: 2000,
            onToDo: function () {
                //console.log(this);
            }
        });
    });

    $scope.$on('ScrollDone3', function () {
        $("#topscroll3").bootstrapNews({
            newsPerPage: 10,
            autoplay: false,
            pauseOnHover: true,
            direction: 'up',
            newsTickerInterval: 2000,
            onToDo: function () {
                //console.log(this);
            }
        });
    });

    $scope.$on('ScrollDone4', function () {
        $("#topscroll4").bootstrapNews({
            newsPerPage: 10,
            autoplay: false,
            pauseOnHover: true,
            direction: 'up',
            newsTickerInterval: 2000,
            onToDo: function () {
                //console.log(this);
            }
        });
    });

    $scope.$on('ScrollDone5', function () {
        $("#topscroll5").bootstrapNews({
            newsPerPage: 10,
            autoplay: false,
            pauseOnHover: true,
            direction: 'up',
            newsTickerInterval: 2000,
            onToDo: function () {
                //console.log(this);
            }
        });
    });

    $scope.count = "0";

    $scope.SelectIframForNID = function (datapath, TransId,UserId, text) {

        


        var addurl = datapath + '?NID=' + TransId



        /*Bind Page Tab with Iframe*/
        
        var date = new Date().getTime();
        var TabTitle = text;
        var src = datapath;
        var HalfID = src.split('/').join('');
        var FinalID = 'MenuNotification' //'menu' + HalfID ;

        $('.nav-item').removeClass('active');
        $('.iframedesign').addClass('iframe-close');
        $('.refresh-box').attr('disabled', true);
        //$('.iframe-box-w-reload-box').addClass('iframe-close');
        /*Bind Page Tab*/
        var iframeTab = '<li class="nav-item active" id="tab' + FinalID + '"><a id="ancor' + FinalID + '" class="nav-link active" onclick="Showtab(\'#' + FinalID + '\');" data-toggle="tab" href="#' + FinalID + '" role="tab">' + TabTitle + '</a><i id="btnrefresh' + FinalID + '" class="pe-7s-refresh-2 fa-spin refresh-box" title="Reload Page" onclick="ReloadBox(\'#' + FinalID + '\');" ></i><i class="icofont-close-line close-box" title="Close Page"  onclick="CloseTab(\'#' + FinalID + '\',\'#tab' + FinalID + '\');" ></i></li>';
        //$(".iframe-wrapper-tab").prepend(iframeTab);
        var falg = true;
        var tablist = $('.iframe-wrapper-tab li');
        $.each(tablist, function () {
            var li = $(this)

            if (li.attr('id') === 'tab' + FinalID) {

                falg = false;
            }
        });
        if (falg) {
            $(iframeTab).insertAfter($('.iframe-wrapper-tab li#tabmenuhomedashboard'));
        }

        

        if ($('.iframe-wrapper-tab').height() > 30) {
            var LastTab = $('.iframe-wrapper-tab li:last-child').toArray();
            var ShowTab = LastTab[0].outerHTML;
            


            $(".fixed-tab-menu-sidebar-right .right-side-menu-tab-bind").prepend(ShowTab);




            $('.iframe-wrapper-tab li:last-child').remove();

        }



        //var SideRightLastTab = $('.right-side-menu-tab-bind li:fast-child').toArray();
        //var ShowTab2 = SideRightLastTab[0].outerHTML;
        //$(".iframe-wrapper-tab").append(ShowTab2);


        /*Bind Page Iframe*/

        var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src=\'..' + addurl + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"></iframe>';

        //var iframe = '<div  id="data' + FinalID + '" class="iframe-box-w-reload-box"><div id="btn' + FinalID + '" class="reload-box"><button  onclick="ReloadBox(\'#' + FinalID + '\');" class="btn btn-primary btn-anim"><i class="mdi mdi-account-off"></i><span class="btn-text">Reload Page</span></button></div><div class="iframe-in-loadpage-box "><iframe id="' + FinalID + '" class="iframedesign " src="' + src + '" rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless" scrolling="no" allowtransparency="true"></iframe></div></div>';

        $(".iframe-wrapper").prepend(iframe);
        //$(".iframe-wrapper").append(iframe);
        var InW = $(window).width();
        var InH = $(window).height();

        var IfSetHeight;
        if (InW > 980) {
            IfSetHeight = InH - 126;
            $('.iframe-wrapper').find('.iframedesign ').css({ "height": IfSetHeight });
        }
        else {
            IfSetHeight = InH - 132;
            $('.iframe-wrapper').find('.iframedesign ').css({ "height": IfSetHeight });
        }
        $scope.RemoveSpin(FinalID);
        $scope.UpdateNotifi(TransId, UserId);
        return false;
    };
    $scope.UpdateNotifi = function (Id, LoginId) {
        var collectionobj = {};
        collectionobj.Action = 17;
        collectionobj.BranchCode = BranchCode;
        collectionobj.NotificationId = Id;
        collectionobj.LoginId = LoginId
        var getData = myService.methode('POST', "../SaudaEntry/UpdateNotification", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.BindNotification();
        });
    };

    $scope.SelectForIframe = function (datapath, text) {
        
        /*Bind Page Tab with Iframe*/

        var date = new Date().getTime();
        var TabTitle = text;
        var src = datapath;
        var HalfID = src.split('/').join('');
        var FinalID = 'menu' + HalfID + date;

        $('.nav-item').removeClass('active');
        $('.iframedesign').addClass('iframe-close');
        $('.refresh-box').attr('disabled', true);

        var iframeTab = '<li class="nav-item active" id="tab' + FinalID + '"><a id="ancor' + FinalID + '" class="nav-link active" onclick="Showtab(\'#' + FinalID + '\');" data-toggle="tab" href="#' + FinalID + '" role="tab">' + TabTitle + '</a><i id="btnrefresh' + FinalID + '" class="pe-7s-refresh-2 fa-spin refresh-box" title="Reload Page" onclick="ReloadBox(\'#' + FinalID + '\');" ></i><i class="icofont-close-line close-box" title="Close Page"  onclick="CloseTab(\'#' + FinalID + '\',\'#tab' + FinalID + '\');" ></i></li>';
        $(".iframe-wrapper-tab").append(iframeTab);

        var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src=\'..' + src + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"></iframe>';

        $(".iframe-wrapper").append(iframe);
        var InW = $(window).width();
        var InH = $(window).height();

        var IfSetHeight;
        if (InW > 980) {
            IfSetHeight = InH - 126;
            $('.iframe-wrapper').find('.iframedesign ').css({ "height": IfSetHeight });
        }
        else {
            IfSetHeight = InH - 132;
            $('.iframe-wrapper').find('.iframedesign ').css({ "height": IfSetHeight });
        }
        $scope.RemoveSpin(FinalID);

        return false;
    };
    $scope.SelectIfram = function (datapath, text) {
        /*Bind Page Tab with Iframe*/ 
        var date = new Date().getTime();
        var TabTitle = text;
        var src = datapath;
        var HalfID = src.split('/').join('');
        var FinalID = 'menu' + HalfID + date;

        $('.nav-item').removeClass('active');
        $('.iframedesign').addClass('iframe-close');
        $('.refresh-box').attr('disabled', true);
        //$('.iframe-box-w-reload-box').addClass('iframe-close');
        /*Bind Page Tab*/
        var iframeTab = '<li class="nav-item active" id="tab' + FinalID + '"><a id="ancor' + FinalID + '" class="nav-link active" onclick="Showtab(\'#' + FinalID + '\');" data-toggle="tab" href="#' + FinalID + '" role="tab">' + TabTitle + '</a><i id="btnrefresh' + FinalID + '" class="pe-7s-refresh-2 fa-spin refresh-box" title="Reload Page" onclick="ReloadBox(\'#' + FinalID + '\');" ></i><i class="icofont-close-line close-box" title="Close Page"  onclick="CloseTab(\'#' + FinalID + '\',\'#tab' + FinalID + '\');" ></i></li>';
        //$(".iframe-wrapper-tab").prepend(iframeTab);

        $(iframeTab).insertAfter($('.iframe-wrapper-tab li#tabmenuhomedashboard'));

        

        if ($('.iframe-wrapper-tab').height() > 30) {
            
            var LastTab = $('.iframe-wrapper-tab li:last-child').toArray();
            var ShowTab = LastTab[0].outerHTML;
            $(".fixed-tab-menu-sidebar-right .right-side-menu-tab-bind").prepend(ShowTab);
            $('.iframe-wrapper-tab li:last-child').remove();

        }

        //var SideRightLastTab = $('.right-side-menu-tab-bind li:fast-child').toArray();
        //var ShowTab2 = SideRightLastTab[0].outerHTML;
        //$(".iframe-wrapper-tab").append(ShowTab2);

        /*Bind Page Iframe*/

        var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src=\'..' + src + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"></iframe>';

        //var iframe = '<div  id="data' + FinalID + '" class="iframe-box-w-reload-box"><div id="btn' + FinalID + '" class="reload-box"><button  onclick="ReloadBox(\'#' + FinalID + '\');" class="btn btn-primary btn-anim"><i class="mdi mdi-account-off"></i><span class="btn-text">Reload Page</span></button></div><div class="iframe-in-loadpage-box "><iframe id="' + FinalID + '" class="iframedesign " src="' + src + '" rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless" scrolling="no" allowtransparency="true"></iframe></div></div>';
        //$('.iframe-wrapper', window.parent.document).prepend(iframe);
        $(".iframe-wrapper").append(iframe);

        var InW = $(window).width();
        var InH = $(window).height();

        var IfSetHeight;
        if (InW > 980) {
            IfSetHeight = InH - 126;
            $('.iframe-wrapper').find('.iframedesign ').css({ "height": IfSetHeight });
        }
        else {
            IfSetHeight = InH - 132;
            $('.iframe-wrapper').find('.iframedesign ').css({ "height": IfSetHeight });
        }
        $scope.RemoveSpin(FinalID);
        //return false;
    };
    $scope.SelectIframoutiframe = function (datapath, text, transid,bcode,locked) {

        /*Bind Page Tab with Iframe*/
        
        var date = new Date().getTime();
        var TabTitle = text;
        var src = datapath;
        var HalfID = src.split('/').join('');
        var FinalID = 'menu' + HalfID + date;

        $('.nav-item', window.parent.document).removeClass('active');
        $('.iframedesign', window.parent.document).addClass('iframe-close');
        $('.refresh-box', window.parent.document).attr('disabled', true);
        //$('.iframe-box-w-reload-box').addClass('iframe-close');
        /*Bind Page Tab*/
        var iframeTab = '<li class="nav-item active" id="tab' + FinalID + '"><a id="ancor' + FinalID + '" class="nav-link active" onclick="Showtab(\'#' + FinalID + '\');" data-toggle="tab" href="#' + FinalID + '" role="tab">' + TabTitle + '</a><i id="btnrefresh' + FinalID + '" class="pe-7s-refresh-2 fa-spin refresh-box" title="Reload Page" onclick="ReloadBox(\'#' + FinalID + '\');" ></i><i class="icofont-close-line close-box" title="Close Page"  onclick="CloseTab(\'#' + FinalID + '\',\'#tab' + FinalID + '\');" ></i></li>';
        //$(".iframe-wrapper-tab").prepend(iframeTab);

        $(iframeTab).insertAfter($('.iframe-wrapper-tab li#tabmenuhomedashboard', window.parent.document));

        

        if ($('.iframe-wrapper-tab', window.parent.document).height() > 30) {
            
            var LastTab = $('.iframe-wrapper-tab li:last-child', window.parent.document).toArray();
            var ShowTab = LastTab[0].outerHTML;
            $(".fixed-tab-menu-sidebar-right .right-side-menu-tab-bind", window.parent.document).prepend(ShowTab);
            $('.iframe-wrapper-tab li:last-child', window.parent.document).remove();

        }


        if (locked == "No") {
            var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src=\'..' + src + '?TransId=' + transid + '&BCode=' + bcode + '&Locked=' + locked + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"></iframe>';
        }
        else {
            var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src=\'..' + src + '?TransId=' + transid + '&BCode=' + bcode + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"></iframe>';
        }


        $('.iframe-wrapper', window.parent.document).prepend(iframe);
        var InW = $(window).width();
        var InH = $(window).height();

        if (InW > 980) {
            InH = InH + 126;
        }
        else {
            InH = InH + 132;
        }
        
        var IfSetHeight;
        if (InW > 980) {
            IfSetHeight = InH - 126;
            $('.iframe-wrapper', window.parent.document).find('.iframedesign ', window.parent.document).css({ "height": IfSetHeight });
        }
        else {
            IfSetHeight = InH - 132;
            $('.iframe-wrapper', window.parent.document).find('.iframedesign ', window.parent.document).css({ "height": IfSetHeight });
        }
        $scope.RemoveSpinoutiframe(FinalID);

        //return false;
    };

    $scope.SelectIframPayNow = function (datapath, text) {
        
        $('#PayNowpageheaderRemove').fadeOut(0);
        $('#PayNowpagebodyRemove').fadeOut(0);

        //var date = new Date().getTime();
        var TabTitle = text;
        var src = datapath;
        //var HalfID = src.split('/').join('');
        //var FinalID = 'menu' + HalfID + date;

        var iframe = '<iframe id="PayNowIframeDesign" class="iframedesign" src=\'..' + src + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless" scrolling="yes" allowtransparency="true"></iframe>';

        
        $(".slimScrollDiv").find(".slimScrollBar").css({ "display": "none" })
        $("#onlyForPayNow").prepend(iframe);
        var InW = $(window).width();
        var InH = $(window).height();

        var IfSetHeight;
        if (InW > 980) {
            IfSetHeight = InH;
            $('#onlyForPayNow').find('#PayNowIframeDesign').css({ "height": IfSetHeight });
            
        }
        else {
            IfSetHeight = InH;
            $('#onlyForPayNow').find('#PayNowIframeDesign').css({ "height": IfSetHeight });
            
        }
        return false;
    };

     

    $scope.RemoveSpin = function (id) {
        var frameID = id;
        var tabID = "#btnrefresh" + frameID;

        var interval1 = setInterval(function () {
            if (document.readyState === 'complete') {
                clearInterval(interval1);
               $(tabID).removeClass('fa-spin');
            }
        }, 100);
    }

    $scope.RemoveSpinoutiframe = function (id) {
        var frameID = id;
        var tabID = "#btnrefresh" + frameID;

        var interval1 = setInterval(function () {
            if (document.readyState === 'complete') {
                clearInterval(interval1);
                $(tabID, window.parent.document).removeClass('fa-spin');
            }
        }, 100);
    }

    $scope.checkReType = function () {
        //
        if ($('#txtNewPasscode').val() == $('#txtReTypePasscode').val()) {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            chk = true;
        }
        else {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            chk = false;
        }
    }
    var chk = '';
    //$scope.ChangePassword = function () {
    //    //
    //    alert('dd');
    //    var valid = true;
    //    if ($('#txtCurrentPasscode').val() == '') {
    //        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
    //        valid = false;
    //        return;
    //    }
    //    else if ($('#txtNewPasscode').val() == '') {
    //        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
    //        valid = false;
    //        return;
    //    }
    //    else if ($('#txtReTypePasscode').val() == '') {
    //        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
    //        valid = false;
    //        return;
    //    }

    //    else if (chk == true) {
    //        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
    //        var collectionobj = {};
    //        collectionobj.schoolCode = schoolCode;
    //        collectionobj.BranchCode = branchCode; collectionobj.CompCode = compCode; collectionobj.SiteCode = siteCode;
    //        collectionobj.SessionId = sessionId;
    //        collectionobj.fyId = fyId;
    //        collectionobj.PassWord = $('#txtCurrentPasscode').val();
    //        collectionobj.PassCode = $('#txtReTypePasscode').val();
    //        collectionobj.userId = LoginId;
    //        var getData = myService.methode('POST', "../ChangePassCode/ModifyPassCode", '{obj:' + JSON.stringify(collectionobj) + '}');
    //        getData.then(function (response) {
    //            if (showMsgBox(response.data)) {
    //                $scope.ClearControl(1);
    //            }
    //        });
    //    }

    //}

    $scope.ClearControl = function (flag) {
        //
        if (flag == 1) {
            $scope.ResetControl(flag);
        }
        else {
            clearConfirmbox("Do you want to clear fields?", function () { $scope.ResetControl(0); });
        }
    };

    $scope.ResetControl = function () {
        $('#txtNewPasscode').val('')
        $('#txtReTypePasscode').val('')
        $('#txtCurrentPasscode').val('')
        $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ffffff;')
        $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ffffff;')
        $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #ffffff;')

        chk = false;
        $scope.mySwitch = false;
    }

    $scope.checkPassCode = function () {
        var collectionobj = {};
        collectionobj.schoolCode = schoolCode;
        collectionobj.BranchCode = branchCode; collectionobj.CompCode = compCode; collectionobj.SiteCode = siteCode;
        collectionobj.SessionId = sessionId;
        collectionobj.PassWord = $('#txtCurrentPasscode').val();
        collectionobj.userId = LoginId;
        var getData = myService.methode('POST', "../ChangePassCode/checkPassCode", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            //

            if (response.data == 0) {
                $scope.mySwitch = true;
                chk = false;
                $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            }
            else {
                $scope.mySwitch = false;
                chk = true;
                $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            }
        });
    };

    $scope.SetPhotoUrl = function (photoPath, photoId, inputfileid) {
        try {
            if (photoPath != null) {
                if (inputfileid != null) {
                    ResetImage(photoPath, inputfileid);
                };

                $(photoId).attr("src", photoPath + '?date=' + new Date());
            }
            else {
                ResetImage("", inputfileid);
                $(photoId).removeAttr("src");
            }
        }
        catch (ex) {
            console.log(ex.message);
        }
        //

        return photoPath;
    }

    $scope.GetModules = function () {

        var collectionobj = {};
        collectionobj.BranchCode = BranchCode;
        collectionobj.LoginId = LoginId;

        var getData = myService.methode('POST', '../Dashboard/ModuleList', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ModuleList = response.data.Result
        });
    };

    $scope.Rowdata = [];
    $scope.move = true;
    $scope.createElement = function (attr, index, name) {
        attr[index]['name'] = name;
        $scope.Rowdata.push({ currentRow: 0, VISIBLE_ROWS: 6 })
        if (attr[index]['valueModel'] == null)
            attr[index]['valueModel'] = attr[index].name + 'ValueModel';

        if (attr[index]['textModel'] == null)
            attr[index]['textModel'] = attr[index].name + 'TextModel';

        if (attr[index]['fontSize'] == null)
            attr[index]['fontSize'] = '12px';

        if (attr[index]['textTransform'] == null)
            attr[index]['textTransform'] = 'capitalize';

        if (attr[index]['showdiv'] == null)
            attr[index]['showdiv'] = false;

        if (attr[index]['Isdisabled'] == null)
            attr[index]['Isdisabled'] = false;

        if (attr[index]['validate'] == null)
            attr[index]['validate'] = 'validate';

        if (attr[index]['placeholder'] == null)
            attr[index]['placeholder'] = 'Select ' + attr[index].name;

        if (attr[index]['textCol'] == null)
            attr[index]['textCol'] = attr[index].header[0].ValueCol;

        if (attr[index]['valueCol'] == null)
            attr[index]['valueCol'] = attr[index].header[0].ValueCol;

        if (attr[index]['keyupfun'] == null)
            if (index == 0)
                attr[index]['keyupfun'] = 'key_Up($event.key)';
            else
                attr[index]['keyupfun'] = 'key_Up' + index + '($event.key)';

        if (attr[index]['initfun'] == null)
            attr[index]['initfun'] = "";

        if (attr[index]['width'] == null)
            attr[index]['width'] = "100%";
  
        var innerWidth = $('.panel-body').innerWidth();
        var totalWidth = 0;
        $.each(attr[index].header, function (index, val) {
            totalWidth = val.Width + totalWidth;
        });
        var excss = 'text-wraping-n'
        if ((innerWidth - 64) > totalWidth) {
            totalWidth = totalWidth + 'px';
        }
        else {
            totalWidth = '100%';
            excss = ''
        }
        $scope.ReplaceText = "'&amp;','&'";
        //\'' + list + '\'
        var newEle = angular.element('<div class="input-box input-z-in-close-box" ng-model=' + attr[index].valueModel + '><input autocomplete="off" style="cursor:pointer;width:' + attr[index].width + ' !important" class="form-control clear custom-div bg-t ' + attr[index].validate + '" id="txt' + attr[index].name + '" ng-model=' + attr[index].textModel + ' type="text" placeholder=\'' + attr[index].placeholder + '\' ng-click="show(attr[' + index + '],' + index + ')" ng-change="resetRowdata(Rowdata[' + index + '])" ng-keydown="HighlightTableRow(attr,' + index + ',$event);" ng-keyup=' + attr[index].keyupfun + ' ng-disabled=' + attr[index].Isdisabled + ' ng-blur="hide(attr[' + index + '])" /><div class="input-z-in ' + attr[index].name + '" style="width:' + totalWidth + ';font-size:' + attr[index].fontSize + ';text-transform:' + attr[index].textTransform + '" ng-show="attr[' + index + '].showdiv"><div id="overflow' + attr[index].name + '" class="datatable-responsive table-responsive advance-btn-table"><table class="table table-in-input-box compact table-bordered ' + excss + ' dataTable t-mgtb-n" id="tbl' + attr[index].name + '" style="cursor:context-menu;"><thead><tr><th style="width:{{th.Width}}px;background-color: #333 !important;" ng-repeat="th in attr[' + index + '].header">{{th.TextCol}}</th></tr></thead><tbody ng-init=' + attr[index].initfun + '><tr ng-if="' + attr[index].listobj + '==null" style="text-align: center;"><td colspan="{{attr[' + index + '].header.length}}"><i class="fa fa-circle-o-notch fa-spin fa-fw"></i></td></tr><tr class="getRow" ng-if="' + attr[index].listobj + '.length>0" ng-click=' + attr[index].keyupfun + '; ng-mouseover="mouseover(attr[' + index + '],' + index + ',$index)" ng-repeat="li in ' + attr[index].listobj + '|filter:' + attr[index].textModel + '" ><td ng-repeat="th in attr[' + index + '].header" ng-click="SetTextAndValue(li[attr[' + index + '].valueCol],li[attr[' + index + '].textCol],attr[' + index + ']);" ng-bind-html="trustAsHtml(li[th.ValueCol])"></td></tr></tbody></table></div></div><div class="text-box-msg-r"></div></div>');
        var target = document.getElementById(attr[index].name);
        angular.element(target).html(newEle);
        $compile(newEle)($scope);
        $scope[attr[index].valueModel] = "";
        $scope[attr[index].textModel] = "";
              
        $scope.$watch(attr[index].listobj, function () {

            if (attr[index].showdiv)
                setTimeout(function () {
                    var table = $('#tbl' + attr[index].name)
                    var trs = $(table).find('tr.getRow');

                    $.each(trs, function () {
                        var tr = this;
                        $(tr).attr('style', 'background-color: #fff;');
                        $(tr).find('td').attr('style', 'color: #000 !important');
                    })

                    $scope.Rowdata[index]['currentRow'] = 0;
                    $scope.highlightRow(trs[$scope.Rowdata[index]['currentRow']]);

                    $(".input-z-in").scrollTop(0);

                }, 100)
        })
        $scope.$watch(attr[index].textModel, function () {

            if (attr[index].showdiv)
                setTimeout(function () {
                    var table = $('#tbl' + attr[index].name)
                    var trs = $(table).find('tr.getRow');

                    $.each(trs, function () {
                        var tr = this;
                        $(tr).attr('style', 'background-color: #fff;');
                        $(tr).find('td').attr('style', 'color: #000 !important');
                    })

                    $scope.Rowdata[index]['currentRow'] = 0;
                    $scope.highlightRow(trs[$scope.Rowdata[index]['currentRow']]);
                   
                    $(".input-z-in").scrollTop(0);

                }, 100)
        })
    }

    $scope.HighlightTableRow = function (attr, index, e) {
        var table = $('#tbl' + attr[index].name)
        var trs = $(table).find('tr.getRow');
        var numRows = trs.length;
        var keyID = (window.event) ? event.keyCode : e.keyCode;
        const key = event.key; // const {key} = event; ES6+
        switch (key) {
            case 'ArrowUp':
                if (parseInt($scope.Rowdata[index]['currentRow']) == parseInt(0)) {
                    // reached the top of the table; do nothing.
                    return true;
                } else {
                    if ($scope.Rowdata[index]['currentRow'] < numRows)
                        $scope.setCurrentRow(trs[$scope.Rowdata[index]['currentRow']]);
                    $scope.Rowdata[index]['currentRow']--;
                    scrollRow("up");
                    if ($scope.Rowdata[index]['currentRow']+6 < $scope[attr[index].listobj].length) {
                        $("." + attr[index].name).scrollTop(Number(($("." + attr[index].name).scrollTop())) - 25);
                    }
                    e.preventDefault();
                }
                break;
            case 'ArrowDown':
                if ($scope.Rowdata[index]['currentRow'] == (numRows - 1)) {
                    // reached the end of the table; do nothing
                    return true;
                } else {
                    $scope.Rowdata[index]['currentRow']++;
                    scrollRow("down");
                    if ($scope.Rowdata[index]['currentRow'] > 0)
                        $scope.setCurrentRow(trs[$scope.Rowdata[index]['currentRow'] - 1]);
                    if ($scope.Rowdata[index]['currentRow'] > $scope.Rowdata[index]['VISIBLE_ROWS']) {
                        $("." + attr[index].name).scrollTop(Number(($("." + attr[index].name).scrollTop())) + 25);
                    }
                    e.preventDefault();
                }
                break;
            case 'ArrowRight':
                if (table.hasClass('text-wraping-n') == false) {
                    $('#overflow' + attr[index].name).scrollLeft(Number(($('#overflow' + attr[index].name).scrollLeft())) + 50);
                }
                break;
            case 'ArrowLeft':
                if (table.hasClass('text-wraping-n') == false) {
                    if (isScrollable(document.getElementById('overflow' + attr[index].name)))
                        if (Number(($('#overflow' + attr[index].name).scrollLeft())) > 50)
                            $('#overflow' + attr[index].name).scrollLeft(Number(($('#overflow' + attr[index].name).scrollLeft())) - 50);
                        else if (Number(($('#overflow' + attr[index].name).scrollLeft())) > 0 && Number(($('#overflow' + attr[index].name).scrollLeft())) <= 50)
                            $('#overflow' + attr[index].name).scrollLeft(0);
                }
                break;
            case 'Enter':
                var currow = $scope.Rowdata[index]['currentRow'];
                if (attr[index].showdiv) {
                    var filterExpression = {};
                    filterExpression[attr[index].textCol] = $scope[attr[index].textModel];
                    $scope.FilterObj = $filter('filter')($scope[attr[index].listobj], filterExpression)
                    $scope.SetTextAndValue($scope.FilterObj[currow][attr[index].valueCol], $scope.FilterObj[currow][attr[index].textCol], attr[index]);
                }
                else {
                    $scope.show(attr[index], index);
                }
                break;
            case 'Backspace':
                $scope[attr[index].valueModel] = "";
                $scope[attr[index].textModel] = "";
                $scope.show(attr[index], index, '1');
                break;
            case 'Delete':
                $scope[attr[index].valueModel] = "";
                $scope[attr[index].textModel] = "";
                $scope.show(attr[index], index, '1');
                break;
            case 'Escape':
                $scope.show(attr[index], index);
                break;
        }

        function scrollRow(dir) {
            if (dir == "up") {
                $scope.highlightRow(trs[$scope.Rowdata[index]['currentRow']]);
            } else if (dir == "down") {
                $scope.highlightRow(trs[$scope.Rowdata[index]['currentRow']]);
            }
        }
    }

    $scope.highlightRow = function (tr) {
        $(tr).attr('style', 'background-color: #1b8bf9;');
        var td = $(tr).find('td');
        td.attr('style', 'color:#fff !important');
    }

    $scope.setCurrentRow = function (tr) {
        $(tr).attr('style', 'background-color: #fff;');
        $(tr).find('td').attr('style', 'color: #000 !important');
    }

    $scope.hide = function (attr) {
        setTimeout(function () {
            attr.showdiv = false;
            $scope.$applyAsync();
            $scope.move = true;
        }, 150);
    }

    $scope.show = function (attr, index, backspace) {
        if (backspace == null)
        {
            if (attr.Isdisabled == false)
                if (attr.showdiv) {
                    $scope.move = true;
                    attr.showdiv = false;
                }
                else {
                    $scope.move = false;
                    attr.showdiv = true;
                }
            else {
                $scope.move = true;
                attr.showdiv = false;
            }
        }
        else {
            $scope.move = false;
            attr.showdiv = true;
        }    
        
        if (attr.showdiv) {
            var table = $('#tbl' + attr.name)
            var trs = $(table).find('tr.getRow');

            $.each(trs, function () {
                var tr = this;
                $(tr).attr('style', 'background-color: #fff;');
                $(tr).find('td').attr('style', 'color: #000 !important');
            })

            $scope.Rowdata[index]['currentRow'] = 0;
            $scope.highlightRow(trs[$scope.Rowdata[index]['currentRow']]);

            $(".input-z-in").scrollTop(0);
        }
        $scope.$applyAsync();
    }

    $scope.mouseover = function (attr, index, rowno) {
        var table = $('#tbl' + attr.name)
        var trs = $(table).find('tr.getRow');

        $.each(trs, function () {
            var tr = this;
            $(tr).attr('style', 'background-color: #fff;');
            $(tr).find('td').attr('style', 'color: #000 !important');
        })

        $scope.Rowdata[index]['currentRow'] = rowno;
        $scope.highlightRow(trs[$scope.Rowdata[index]['currentRow']]);
    }

    $scope.SetTextAndValue = function (val, txt, attr) {
        $scope[attr.valueModel] = val;
        $scope[attr.textModel] = txt
        document.getElementById('txt' + attr.name).focus();
        setTimeout(function () {
            attr.showdiv = false;
        }, 150);
        $scope.move = true;
        $scope.$applyAsync();
    }

    $scope.htmlTextToPlainText = function (htmlText) {
        var plainText = htmlText.replace(/&amp;/g, "&");
        return plainText;
    }
    $scope.dbClick = function () {

    }

    if (IsFunctionDefined('app.ddlBindings')) {
        app.ddlBindings($scope, $element, $filter, myService);
    } 

    if (IsFunctionDefined('app.Authorization')) {
        app.Authorization($scope, $element, $interval, myService);
    } 
    
    if (IsFunctionDefined('app.LoginPermissionController')) {
        app.LoginPermissionController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.DashBoardController')) {
        app.DashBoardController($scope, $element, $filter, myService);
    }
     
    if (IsFunctionDefined('app.BranchMasterController')) {
        app.BranchMasterController($scope, $element, $filter, myService);
    }
    
    if (IsFunctionDefined('app.EmployeeMasterController')) {
        app.EmployeeMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.FarmerMasterController')) {
        app.FarmerMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.TransportMasterController')) {
        app.TransportMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ReportHeaderMasterController')) {
        app.ReportHeaderMasterController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.NavMenuPermissionController')) {
        app.NavMenuPermissionController($scope, $element, $filter, $sce, myService);
    }
 

    if (IsFunctionDefined('app.SaudaEntryController')) {
        app.SaudaEntryController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.BranchMenuPermissionController')) {
        app.BranchMenuPermissionController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ItemMasterController')) {
        app.ItemMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.FarmMasterController')) {
        app.FarmMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.StockAllotmentController')) {
        app.StockAllotmentController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ConvertionController')) {
        app.ConvertionController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.SupervisingController')) {
        app.SupervisingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.VendorReportController')) {
        app.VendorReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.DailyCardController')) {
        app.DailyCardController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.GeneralSMSController')) {
        app.GeneralSMSController($scope, $element, myService);
    }
    if (IsFunctionDefined('app.TransportReportController')) {
        app.TransportReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.FarmerReportController')) {
        app.FarmerReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.BranchReportController')) {
        app.BranchReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.EmployeeReportController')) {
        app.EmployeeReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.BranchStockTransferController')) {
        app.BranchStockTransferController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ConfirmAllotmentController')) {
        app.ConfirmAllotmentController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.FarmerStockAllotmentController')) {
        app.FarmerStockAllotmentController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.SaleController')) {
        app.SaleController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.GCController')) {
        app.GCController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.pettycashbookcontroller')) {
        app.pettycashbookcontroller($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.pettycashbookLoadcontroller')) {
        app.pettycashbookLoadcontroller($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.PettyCashReportController')) {
        app.PettyCashReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.CashBookReportController')) {
        app.CashBookReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.DCController')) {
        app.DCController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.OpeningBalanceController')) {
        app.OpeningBalanceController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.PurchaseReportController')) {
        app.PurchaseReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.BranchStockReportController')) {
        app.BranchStockReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.StockReportController')) {
        app.StockReportController($scope, $element, $filter, myService);
    }
});

function IsFunctionDefined(functionName)
{
    if (eval("typeof(" + functionName + ") == typeof(Function)")) {
        return true;
    }
}






