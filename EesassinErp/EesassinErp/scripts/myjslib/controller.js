var user = JSON.parse(sessionStorage.getItem("userSession")) || {};
 
var LoginId = sessionStorage.getItem("LoginId");
debugger;
var MapId = sessionStorage.getItem("MapId");
var MapUser = sessionStorage.getItem("MapUser");
var BranchCode = sessionStorage.getItem("BranchCode");
var loginType = sessionStorage.getItem("loginType") || sessionStorage.getItem("LoginType");
var LastLogin = sessionStorage.getItem("LastLogin");
var Desig = sessionStorage.getItem("Desig");
var Name = sessionStorage.getItem("Name");
var BranchName = sessionStorage.getItem("BranchName");
var ContactNo = sessionStorage.getItem("ContactNo");
var CreatedOn = sessionStorage.getItem("CreatedOn");
var Photo = sessionStorage.getItem("Photo");
var UserName = sessionStorage.getItem("UserName");
var BranchAddress = sessionStorage.getItem("BranchAddress"); 
var SessionId = sessionStorage.getItem("SessionId");
var REmailId = sessionStorage.getItem("EmailId");
var Loadonce = sessionStorage.getItem("Loadonce"); 
var PartyEMail = sessionStorage.getItem("PartyEMail");
var DashboardSwitch = sessionStorage.getItem("DashboardSwitch");

var LoginId = user.LoginId;
var MapId = user.MapId;
var MapUser = user.MapUser;
var BranchCode = user.BranchCode;
var loginType = user.LoginType;
var LastLogin = user.LastLogin;
var Desig = user.Desig;
var Name = user.Name;
var BranchName = user.BranchName;
var ContactNo = user.ContactNo;
var CreatedOn = user.CreatedOn;
var Photo = user.Photo;
var UserName = user.UserName;
var BranchAddress = user.BranchAddress;
var SessionId = user.SessionId;
var REmailId = user.EmailId;
var Loadonce = user.Loadonce;
var PartyEMail = user.PartyEMail;
var DashboardSwitch= sessionStorage.getItem("DashboardSwitch");

var AuditorId = '';
var VendorId = '';
var Totalupoad = 0; 

 

if (LoginId == "-1" || LoginId == null || LoginId == "" || LoginId == "null") {
  
    window.top.location.href = '../Login/Login';
}
if (BranchCode == "-1" || BranchCode == null || BranchCode == "" || BranchCode == "null") {
   
    window.top.location.href = '../Login/Login';
}
if (loginType == "-1" || loginType == null || loginType == "" || loginType == "null") {

    window.top.location.href = '../Login/Login';
}

app.filter('unique', function () {
    return function (items, key) {
        var output = [], keys = [];

        angular.forEach(items, function (item) {
            var val = item[key];
            if (keys.indexOf(val) === -1) {
                keys.push(val);
                output.push(item);
            }
        });

        return output;
    };
});

//app.directive('fileSizeLimit', function () {
//    return {
//        restrict: 'A',
//        link: function (scope, element, attrs) {

//            var maxSizeMB = parseInt(attrs.fileSizeLimit) || 20;

//            element.on('change', function () {
//                var file = element[0].files[0];

//                if (file) {
//                    var maxSize = maxSizeMB * 1024 * 1024;

//                    if (file.size > maxSize) {

//                        Swal.fire({
//                            title: "File size exceeded",
//                            text: "File size should not exceed " + maxSizeMB + " MB",
//                            icon: "warning",
//                            confirmButtonText: "OK",
//                            allowOutsideClick: false,
//                            allowEscapeKey: false
//                        });

//                        element.val(""); // reset input
//                        scope.$apply(); // Angular sync
//                    }
//                }
//            });
//        }
//    };
//});
app.directive('fileSizeLimit', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {

            var maxSizeMB = parseInt(attrs.fileSizeLimit) || 20;

            element.on('change', function (event) {

                var file = element[0].files[0];

                if (file) {
                    var maxSize = maxSizeMB * 1024 * 1024;

                    if (file.size > maxSize) {

                        // ❌ STOP everything
                        event.stopImmediatePropagation();
                        event.preventDefault();

                        Swal.fire({
                            title: "File size exceeded",
                            text: "File size should not exceed " + maxSizeMB + " MB",
                            icon: "warning",
                            confirmButtonText: "OK",
                            allowOutsideClick: false,
                            allowEscapeKey: false
                        });

                        element.val(""); // reset input
                        scope.$apply();

                        return false;
                    }
                }
            });
        }
    };
});
app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {

            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function () {

                scope.$apply(function () {
                    modelSetter(scope, element[0].files[0]); // ✅ direct assign
                });

                if (attrs.onChange) {
                    scope.$eval(attrs.onChange); // ✅ trigger function
                }
            });
        }
    };
}]);

var sessionPopupShown = false;
var sessionPopupShown = false;

app.factory('sessionInterceptor', function ($q) {

    return {

        response: function (response) {

            // agar server ne login page HTML bhej diya (session expire)
            if (!sessionPopupShown &&
                typeof response.data === "string" &&
                response.data.indexOf("<!DOCTYPE html>") !== -1 &&
                response.data.indexOf("Sign in to access") !== -1) {

                sessionPopupShown = true;

                Swal.fire({
                    title: "Session Expired",
                    text: "Your session expired or multiple login detected.",
                    icon: "warning",
                    confirmButtonText: "Login Again",
                    allowOutsideClick: false,
                    allowEscapeKey: false
                }).then(function () {
                    window.top.location.href = '../Login/Login';
                });

                return $q.reject(response);
            }

            return response;
        },

        responseError: function (rejection) {

            if (rejection.status === 401 && !sessionPopupShown) {

                sessionPopupShown = true;

                Swal.fire({
                    title: "Session Expired",
                    text: "Your session expired or multiple login detected.",
                    icon: "warning",
                    confirmButtonText: "Login Again",
                    allowOutsideClick: false,
                    allowEscapeKey: false
                }).then(function () {
                    window.top.location.href = '../Login/Login';
                });
            }

            return $q.reject(rejection);
        }

    };

});
app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('sessionInterceptor');
});
app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.bind('change', function () {
                $parse(attrs.fileModel).assign(scope, element[0].files[0]);
                scope.$apply();
            });
        }
    };
}]);

app.directive('fileModel', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('change', function () {
                scope.$apply(function () {
                    $parse(attrs.fileModel)
                        .assign(scope, element[0].files[0]);
                });
            });
        }
    };
});



 
app.directive('endDateAfterStart', function () {
    return {
        restrict: 'A',
        scope: {
            start: '=endDateAfterStart'
        },
        link: function (scope, element) {
            scope.$watch('start', function (newStartDate) {
                if (!newStartDate) return;

                // Convert the selected Start Date to a JavaScript Date object
                var startDate = new Date(newStartDate);
                // Increment the Start Date by one day to get the minimum date for the End Date
                startDate.setDate(startDate.getDate() + 1);

                // Set the minimum date for the End Date input
                var minDate = startDate.toISOString().split('T')[0];
                element[0].setAttribute('min', minDate);

                // Get the input element of End Date
                var endDateInput = element[0];

                // Disable or hide the dates before the selected Start Date
                // Uncomment one of the following lines based on your preference

                // Option 1: Disable the dates before the selected Start Date
                endDateInput.setAttribute('disable-date-before', minDate);

                // Option 2: Hide the dates before the selected Start Date
                // endDateInput.setAttribute('hide-date-before', minDate);
            });
        }
    };
});


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




app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var model = $parse(attrs.fileModel);

            element.bind('change', function () {
                scope.$apply(function () {
                    model.assign(scope, element[0].files[0]);
                });
            });
        }
    };
}]);





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

app.directive('dateInput', function () {
    return {
        restrict: 'A',
        scope: {
            ngModel: '='
        },
        link: function (scope) {
            if (scope.ngModel) scope.ngModel = new Date(scope.ngModel);
        }
    }
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

app.directive("fileChange", function () {
    return {
        restrict: "A",
        scope: {
            fileChange: "&"
        },
        link: function (scope, element, attrs) {
            element.on("change", function (event) {
                let files = event.target.files;
                let index = attrs.index;   // row index

                scope.$apply(function () {
                    scope.fileChange({ files: files, $index: index });
                });
            });
        }
    };
});
app.directive('ckDragPlaceholder', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {

            element.attr('draggable', true);

            element.on('dragstart', function (e) {

                // 🔥 IMPORTANT FIX
                var dt = e.originalEvent.dataTransfer;

                var field = (attrs.field || element.attr('data-field') || '').trim();
                dt.setData('text/plain', field);
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
                    if (scope.items[i].IsActive == true) { scope.co = scope.co + 1; }
                }
                scope.$parent.$parent[attrs['setinto']] = scope.co;
                scope.$applyAsync();
                event.preventDefault();
            });


        }
    };
});
   
app.controller('myController', function ($scope, $element, $sce, $timeout, $interval, $filter, $http, $compile, myService, $window) {
    $scope.LoginId = LoginId;
    $scope.MapUser = MapUser;
    $scope.BranchCode = BranchCode;
    $scope.loginType = loginType;
    $scope.LastLogin = LastLogin;
    $scope.Name = Name;
    $scope.BranchName = BranchName;
    $scope.ContactNo = ContactNo;
    $scope.Desig = Desig;
    $scope.CreatedOn = CreatedOn;
    $scope.Photo = Photo;  
    $scope.DashboardSwitch = DashboardSwitch;
    $scope.countdown = 5;  
    $scope.showCountdownPopup = function () { 
        $('#countdownModal').modal('show'); 
        var timer = $scope.countdown;
        var countdownInterval = setInterval(function () {
            $scope.$apply(function () {
                timer--;
                $scope.countdown = timer; 
                if (timer === 0) {
                    clearInterval(countdownInterval);
                    $('#countdownModal').modal('hide'); // Hide the modal
                    $scope.Redirectotdashboardwait(); 
                }
            });
        }, 1000);
    };
    debugger;

    //if (DashboardSwitch != 'Supplier' && DashboardSwitch != null) {
    //if (loginType != '1') { 

    //    var collectionobj = {}; 
    //    collectionobj.UFile = window.location.pathname;
    //    collectionobj.ActionType = 6
    //    collectionobj.Id = LoginId
    //    var getData = myService.methode('POST', ("../RetailSection/CrossCheck"), JSON.stringify(collectionobj));
    //    getData.then(function (response) {
    //        if (response.data.Result[0].RM == 0) {
    //            window.top.location.href = '../Login/Login';
    //        }
    //    });
    //    }
    //}


   
    $scope.loadPage = function (url) {  
        window.top.location.href = url; 
    }
    
     
    $scope.cancelRedirect = function () {
        $('#countdownModal').modal('hide'); // Hide the modal
    }; 
    if ($scope.Photo=="null")
    {
        $scope.Photo = '../content/profile.png';
    }
    $scope.BranchAddress = BranchAddress;
    $scope.PartyEMail = PartyEMail ;
    $scope.UserName = UserName;
    $scope.SessionId = SessionId;
    $scope.REmailId = REmailId; 
    if (loginType == "1") {
        $scope.url = '../DashBoard/AdminDashboard'
    }
    else if (loginType == '2') {
        $scope.url = '../DashBoard/VendorDashboard'
    }
    else if (loginType == '4') {
        $scope.url = '../DashBoard/ClientDashboard'
    }
    else if (loginType == '5') {
        $scope.url = '../DashBoard/Dash'
    }
    else {
        $scope.url = '../DashBoard/AuditorDashboard'
    }
 

    if (loginType != '1') {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = MapId; //----------is user active
        var getData = myService.methode('POST', ("../rating/searchrating"), JSON.stringify(collectionobj));
        getData.then(function (response) { 
            if (response.data.length > 0) {
                window.top.location.href = '../Login/Login'; 
            }
        });
    } 
    var collectionobj = {};
    collectionobj.ActionType = 10;
    collectionobj.Id = LoginId;
    var getData = myService.methode('POST', ("../RetailSection/SearchCompliance"), JSON.stringify(collectionobj));
    getData.then(function (response) { 
        $scope.LoginAs = response.data.Result[0].LoginAs;
        $scope.IsExecuter = response.data.Result[0].LoginAs;
        if (loginType == '1') {
            $scope.LoginAs = 'Admin';
        }
        if ($scope.LoginAs == 'Executer')
        {
            $scope.loginType = '1';
        }
        $scope.$applyAsync();
    });

    //var collectionobj = {};
    //collectionobj.Action = 19;
    //collectionobj.LoginId = LoginId;
    //var getData = myService.methode('POST', ("../Login/GetModulePermission"), JSON.stringify(collectionobj));
    //getData.then(function (response)
    //{
    //    if (response.data.Result.length > 0)
    //    {
    //        if ($scope.SessionId != response.data.Result[0].SessionId) {
    //            showMsgBox('999', 'Alert', 'Multiple logins detected, Closing all sessions automatically', 'warning', 'btn-warning');
    //            sessionStorage.clear(); 
    //            setTimeout(function () {
    //                window.top.location.href = '../Login/Login';
    //            }, 3000); 
    //        } 
    //    }
    //    else { window.top.location.href = '../Login/Login';}
    //}); 
    
    $scope.BindNotification = function () {
        var collectionobj = {};
        collectionobj.Action = 17; 
        collectionobj.Updatedby = LoginId; 
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AllNotification = response.data;
                $scope.Ncount = response.data[0].Ncount;
            }

        });
    };
    $scope.BindInvoiceStatus = function () {
        var collectionobj = {};
        collectionobj.Action = 18;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AllDraftCount = response.data[0].Draft;
                $scope.AllPendingCount = response.data[0].Pending;
                $scope.AllCompleteCount = response.data[0].Complete;
                $scope.AllDraftAmount = response.data[0].DraftAmount;
                $scope.AllPendingAmount = response.data[0].PendingAmount;
                $scope.AllCompleteAmount = response.data[0].CompleteAmount;
                $scope.ValidCount = response.data[0].ValidCount;
                $scope.ValidAmount = response.data[0].ValidAmount;
            }

        });
    };
    $scope.BindAuditorStatus = function () {
        var collectionobj = {};
        collectionobj.Action = 19;
        collectionobj.Updatedby = MapId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.AllDraftCount = response.data[0].Draft;
                $scope.AllPendingCount = response.data[0].Pending;
                $scope.AllCompleteCount = response.data[0].Complete;
                $scope.AllDraftAmount = response.data[0].DraftAmount;
                $scope.AllPendingAmount = response.data[0].PendingAmount;
                $scope.AllCompleteAmount = response.data[0].CompleteAmount;
                $scope.ValidCount = response.data[0].ValidCount;
                $scope.ValidAmount = response.data[0].ValidAmount;
            }

        });
    };

    $scope.GoToRetail = function () {
        $scope.ManageLog('Redirect To Retail Section');
       /* window.location.href = '../RetailSection/Dashboard'*/
        window.location.href = '../RetailSection/StoreDashboard?Location%20Dashboard'
    }
    $scope.GoToSupplier = function () {
        window.location.href = '../DashBoard/Dashboard'
    }
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
            var $grid = $('#ExpenseBox').isotope({
                itemSelector: '.table-item',
                percentPosition: true,
                transitionDuration: '0.2s', 
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

   
    $scope.showValidationLoader = function ()  {
        $('#file-validation-loader').fadeIn();
    }

    $scope.hideValidationLoader = function () {
        $('#file-validation-loader').fadeOut();
    }

    $scope.trustAsHtml = function (html) {
        return $sce.trustAsHtml(html);
    };

    $scope.NumSum = function (numList) {
        var List = [];
        $.each(numList, function (index, val) {
            var obj = { 'num': val }
            List.push(obj)
        });
        return List.sum('num');
    }
    $scope.GetReportHeaderUsingCategory = function (reportcategoryname) {
        var collectionobj = {};
        collectionobj.Action = 5; 
        collectionobj.BranchCode = MapId;
        collectionobj.ReportCategoryName = reportcategoryname;
        var getData = myService.methode('POST', "../../DashBoard/GetReportHeader", '{obj:' + JSON.stringify(collectionobj) + '}');
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
    }

    $scope.checkNaN = function (amount) {
        if (isNaN(amount))
            return 0;
        else
            return Number(amount)
    }

    $scope.numbersOnly = function (value) {
        $scope.number = value.replace(/\D+/g, '');
        return $scope.number;
    }

    $scope.decimalOnly = function (value) {
        $scope.number = value.replace(/[^\d\.*]+/g, '');
        return $scope.number;
    }
    $scope.FoundActiveSession = function () {

        var collectionobj = {
            Username: Username,
            Password: LoginId,
            Action: "20"
        };

        myService.methode(
            'POST',
            '../RetailSection/getredirect',
            '{obj:' + JSON.stringify(collectionobj) + '}'
        ).then(function (response) {

            if (response && response.data && response.data.length > 0) {

                var userData = response.data[0];

                // Active session found
                if (userData.LoginId === "-11" && !userData.UserName?.endsWith("@test.com")) {
                    showMsgBox(
                        '999',
                        'Found Active Session, Closing all sessions automatically',
                        'warning',
                        'btn-warning'
                    );

                    // slight delay so user can read message
                    setTimeout(function () {
                        $scope.Logout();
                    }, 1500);
                }
            }

        }, function (error) {
            console.error("FoundActiveSession error:", error);
        });
    };

    $scope.Logout = function () {
        sessionStorage.removeItem("MenuPermission");
        sessionStorage.clear();
        $scope.logoutWithProcess();  
        var collectionobj = {
            Action: 17,
            LoginId: $scope.LoginId
        }; 
        myService.methode(
            'POST',
            "../Login/GetModulePermission",
            JSON.stringify(collectionobj)
        ).finally(function () { 
          /*  window.top.location.href = '../Login/Login';*/
        });
    };


    $scope.PrintForm = function (print, title) {
         
        var popupWin = window.open('', '_blank');
        popupWin.document.open();
        var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /></head><body onload="window.print()" style="background:#fff;">' + print + '</body></html>';
        popupWin.document.write(head);
        setTimeout(function () { popupWin.document.close(); }, 1000);


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


    $scope.backtodashboard = function () {
        $timeout(function () {
            $scope.Redirectotdashboardwait();
        }, 100);
    };

    $scope.Redirectotdashboardwait = function () {
        var collectionobj = {
            Username: LoginId,
            Action: "22"
        };

        var getDetails = myService.methode('POST', '../RetailSection/getredirect', '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {
            if (response.data && response.data.length > 0) {
                var groupData = response.data[0];

                if (groupData.LoginId == "-1" || !groupData.LoginId) {
                    showMsgBox('999', 'Invalid Credentials!', 'warning', 'btn-warning');
                    return;
                } else if (groupData.LoginId == "-11") {
                    proceedConfirmbox("Found Active Session, Please Logout All Session !", function () {
                        $scope.SessionClose(LoginId);
                    });
                    return;
                }

                // Update session storage
                Object.keys(groupData).forEach(key => sessionStorage.setItem(key, groupData[key]));

                $scope.ManageLog(groupData.LoginId, 'Login Retail Section through Dashboard');
                window.location.href = '../RetailSection/MainDashboard?Main Dashboard';
            } else {
                showMsgBox('999', 'Unexpected error. Please try again.', 'error', 'btn-error');
            }
        }).catch(function (error) {
            console.error("Error in backtodashboard:", error);
            showMsgBox('999', 'Something went wrong!', 'error', 'btn-error');
        });
    };

    $scope.redirect = function (Username) {
        sessionStorage.setItem('Loadonce', 1);
        $('#btnclick').prop('disabled', false);
        var collectionobj = {
            Username: Username,
            Password: LoginId,
            Action: "20"
        };

        var getDetails = myService.methode('POST', '../RetailSection/getredirect', '{obj:' + JSON.stringify(collectionobj) + '}');
        getDetails.then(function (response) {
            if (response.data && response.data.length > 0) {
                var userData = response.data[0];

                if (userData.LoginId == "-1" || !userData.LoginId) {
                    showMsgBox('999', 'Invalid Credentials!', 'warning', 'btn-warning');
                    return;
                } else if (userData.LoginId == "-11") {
                    proceedConfirmbox("Found Active Session, Please Logout All Session !", function () {
                        $scope.SessionClose(Username, password);
                    });
                    return;
                }

                // Update session storage
                Object.keys(userData).forEach(key => sessionStorage.setItem(key, userData[key]));

                $('#btnclick').prop('disabled', true);

                $scope.ManageLog(userData.LoginId, 'Login Retail Section through Dashboard');
                window.location.href = '../RetailSection/StoreDashboard?Location%20Dashboard';
            } else {
                showMsgBox('999', 'Unexpected error. Please try again.', 'error', 'btn-error');
            }
        }).catch(function (error) {
            console.error("Error in redirect:", error);
            showMsgBox('999', 'Something went wrong!', 'error', 'btn-error');
        });
    };
     
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
        if ($scope.DocOrientation == '' || $scope.DocOrientation == undefined) {
            docOrientation = "portrait";
        }
        if ($scope.DocSize == '' || $scope.DocSize == undefined) {
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

            popupWin.document.write('<html><head><meta charset="utf-8" /><style type="text/css" media="print">@page { size:' + docSize.toUpperCase() + ' ' + docOrientation.toUpperCase() + '; }</style><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/icofont.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/font-awesome.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/font-icons/materialdesignicons.min.css" media="all" rel="stylesheet" /></head><body style=\'' + style + '\' onload="window.print()">' + printContents + '</body></html>');
            popupWin.document.close();
        }

        return false;
    }
    $scope.AllVendorCity = function () {

        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 34 });
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data.Result;
        });
    }

    
    $scope.AllCity = function () {
        
        var getData = myService.methode('POST', ("../PartyMaster/GetPartyMasterDT"), { "ActionType": 34  });
        getData.then(function (response) {
            debugger;
            $scope.AllCityList = response.data.Result;
        });
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
                if (key == "Id" || key == "#") {
                    ViewNotification
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

    $scope.NavMenu = function () {
        //debugger;

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

    $scope.Isopen = false;

    $scope.SetTextbox = function (SINVOICENO, ClientId, VendorCId) {
        $scope.InvoiceNo = SINVOICENO;
        $scope.ClientId = ClientId;
        $scope.VendorCId = VendorCId;
        $scope.Isopen = false;
    }

    $scope.IsopenClose = function () {
        $scope.Isopen = false;
    }
    $scope.AuSearchInvoice = function () {
        var collectionobj = {};
        collectionobj.Action = 39;
        collectionobj.Updatedby = MapId;
        collectionobj.Id = $scope.InvoiceNo;
        collectionobj.AuditorId = $scope.ClientId;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.length > 0) {
                $scope.ListOfInvoice = response.data
                $scope.Isopen = true;
            }
            else {
                $scope.ListOfInvoice = 'No Record Found';
            }

        });
    }
    $scope.selectedInvoiceType = '';

    $scope.filterInvoice = function (type) {
        $scope.selectedInvoiceType = type;

        if (!type) {
            $scope.filteredInvoices = angular.copy($scope.VendorInvoiceList);
			$scope.bindtiles($scope.filteredInvoices);
        } else {
            $scope.filteredInvoices = $scope.VendorInvoiceList.filter(x => x.VendorInvNum == type);
			$scope.bindtiles($scope.filteredInvoices);
        }
    };



 $scope.bindtiles = function (list) {
        // here is new code for bindtiles
        $scope.FinalCount = list.filter(x => (x.ComplianceStatus || '').toLowerCase() === 'compliance report generated').length;
        $scope.DraftCount = list.filter(x => (x.ComplianceStatus || '').toLowerCase() === 'draft').length;
        $scope.VendorUserCount = new Set(list.map(x => x.VendorUser).filter(v => v)).size;
        $scope.sitecount = list.length;
    }
	
    $scope.AllVendorCompliance = function () {
        var collectionobj = {};
        collectionobj.Action = 52;
        collectionobj.Updatedby = MapId;
        collectionobj.Id = $scope.InvoiceNo;
        collectionobj.AuditorId = $scope.ClientId;

        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');

        getData.then(function (response) {
            if (response.data.length > 0) {

                $scope.VendorInvoiceList = response.data;

                // 🔥 IMPORTANT
                $scope.filteredInvoices = angular.copy($scope.VendorInvoiceList);

                // 🔥 Dynamic dropdown values (unique types)
                $scope.InvoiceTypes = [...new Set($scope.VendorInvoiceList.map(x => x.VendorInvNum))];
				   $scope.bindtiles($scope.filteredInvoices);
            }
        });
    }

    $scope.downloadDivInImg = function (name) {
        var divwidth = document.querySelector("#downloaddiv2").offsetWidth;
        var divheight = document.querySelector("#downloaddiv2").offsetHeight;

        html2canvas(document.querySelector("#downloaddiv2"), {
            scale: 0,  // Increase the scale for higher resolution,
            width: divwidth,
            height: divheight,
        }).then(canvas => {
            var imgData = canvas.toDataURL("image/png");
            var downloadLink = document.createElement('a');
            //var link= document.getElementById('downloadLink');
            downloadLink.setAttribute('download', name + '.png');
            downloadLink.setAttribute('href', imgData);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            //-----------------------------
        });
    };

    $scope.downloadDivInPdf = function (name) {
        //-----------------------------------
        var pdf = new jsPDF('l', 'pt', 'a4');
        var pdfwidth = pdf.internal.pageSize.width;
        var pdfheight = pdf.internal.pageSize.height;
        var divwidth = document.querySelector("#downloaddiv2").offsetWidth;
        var divheight = document.querySelector("#downloaddiv2").offsetHeight;

        html2canvas(document.querySelector("#downloaddiv2"), {
            scale: 0,  // Increase the scale for higher resolution,
            width: divwidth+5,
            height: divheight+100,
        }).then(canvas => {
            var imgData = canvas.toDataURL("image/png");

                // Add the image to the PDF
                pdf.addImage(imgData, 'PNG', 0, 0, pdfwidth, pdfheight);
                pdf.save(name + '.pdf'); // The name of the downloaded PDF
            //-----------------------------
        });
    };
     
    var collectionobj = {};
    collectionobj.ActionType = 15;
    collectionobj.Id = MapId
    var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
    getData.then(function (response) {
        if (response.data.Result.length > 0) { $scope.Industry = response.data.Result[0].Industry;}
       
    });


    $scope.FireEmail = function (Action, ClientId, Id) { 
        $('#emailSendingModal').modal('show');

        var collectionobj = {
            Action: Action,
            ClientId: ClientId,
            Id: Id
        }; 
        myService.methode(
            'POST',
            "../SendEmail/SendEmail",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        )
            .then(function (response) {
                $('#emailSendingModal').modal('hide');
            })
            .catch(function (error) {
                // error case (optional message)
                $('#emailSendingModal').modal('hide');
            })
            .finally(function () {
                // ✅ har haal me modal hide
                $('#emailSendingModal').modal('hide');
            });
    };



    $scope.FireEmailForNewsletter = function (collectionobj) {
        $('#emailSendingModal').modal('show');
        var getData = myService.methode('POST', "../SendEmail/SendEmailForNewsletter", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $('#emailSendingModal').modal('hide');
        /*    toastr.success("Email sent successfully");*/
        }, function () {
            $('#emailSendingModal').modal('hide');
     /*       toastr.error("Failed to send email");*/
        });
    }


    $scope.ManageLog = function (Activity, rece,dweta) {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.ClientId = $scope.LoginId;
        collectionobj.Activity = Activity;


        collectionobj.Receiver = $scope.LoginId;
        collectionobj.Detail = Activity;

        var getData = myService.methode('POST', "../RetailSection/MaintainLog", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

        });
    }



    $scope.ExceptionFile = function (PageName, FileName, UserName) {
        var collectionobj = {};
        collectionobj.Action = 5;
        collectionobj.machineName = PageName;
        collectionobj.systemUserName = UserName;
        collectionobj.Activity = FileName
        var getData = myService.methode('POST', "../RetailSection/Exception", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

        });
    }

    $scope.DownloadFileWithName = function (documentPath, fileName) {
        var link = document.createElement("a");
        link.href = documentPath;
        link.download = fileName || documentPath.split('/').pop(); // Use provided name or extract from path
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    $scope.Limit = function () {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.Id = MapId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (response.data.Result.length > 0) {
                debugger;
                $scope.total = response.data.Result[0].total;
                $scope.StoreLimit = response.data.Result[0].StoreLimit;
                $scope.LeftStore = response.data.Result[0].LeftStore;
                $scope.LicenseCount = response.data.Result[0].LicenseCount;
                $scope.Upcoming = response.data.Result[0].Upcoming;
                $scope.UserLimit = response.data.Result[0].UserLimit;
                $scope.Useroccupied = response.data.Result[0].Useroccupied;

            }
            else { $scope.LeftStore = 0 }
        });
    } 

    $scope.GetLog = function () {
        var collectionobj = {};
        collectionobj.Action = Action;
        collectionobj.CreatedOn =  $('#txtcreatedon').val(); 
        var getData = myService.methode('POST', "../RetailSection/GetMaintainLog", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            messagevalues =
                [
                    { "LogOn Date": $("#txtStartDate").text() },
                ];

            var tblheader =
                [
                    { "HeaderText": "Sr.No.", "Value": "RowId", "HeaderValue": "RowId", "Width": "50px", "ShowColumn": "Yes", "ImageColumn": "No", "CssClass": "srno" },
                    { "HeaderText": "UserName", "HeaderValue": "UserName", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                    { "HeaderText": "Activity", "HeaderValue": "Activity", "Width": "100%", "ShowColumn": "Yes", "ImageColumn": "No" },
                   
                ];
            loadDataUsingPreDefinedColumn(tblheader, response.data.Result);

        });
    }


    $scope.activeModuleId = null;

    $scope.toggleModule = function (moduleId) {
        if ($scope.activeModuleId === moduleId) {
            $scope.activeModuleId = null; // close if already open
        } else {
            $scope.activeModuleId = moduleId; // open selected
        }
    };

    $scope.HighAuditorlightsExpire = function () {
        var collectionobj = {};
        collectionobj.Action = 10;
        collectionobj.UserId = MapId;
        var getData = myService.methode('POST', ("../rating/searchrating"), JSON.stringify(collectionobj));
        getData.then(function (response) {

            if (response.data.length > 0) {
                $scope.ListOnetimeDocument = response.data;

            }
        });
    }

    $scope.BindAuditorWork = function () {
        var collectionobj = {};
        collectionobj.ActionType = 10;
        collectionobj.CreatedBy = MapId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

            $scope.DashBoardInvoice = response.data;
        });
    }
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
                if (voucherheight >= 522) {
                    $(fid).parent().parent().append("<p class='page-b page-b-after'>&nbsp;</p>");
                }
                else {

                    if ((i % 2 == 0) && (i > 1)) {
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

    $scope.SelectIframForNID = function (datapath, TransId, UserId, text) { 
        var addurl = datapath + '?NID=' + TransId 
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
        //$scope.UpdateNotifi(TransId, UserId);
        return false;
    };
    $scope.UpdateNotifi = function (InvoiceNo, Url, Conversation, CreatedOn, Id, PageName) {

        $scope.MInvoiceNo = InvoiceNo;
        $scope.MNOti = Conversation;
        $scope.MCreatedOn = CreatedOn;
        $scope.MURL = Url;
        $scope.PageName = PageName;
        var collectionobj = {};
        collectionobj.Action = 42;
        collectionobj.Updatedby = Id;
        var getData = myService.methode('POST', "../Communication/GetCommunication", '{obj:' + JSON.stringify(collectionobj) + '}');
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

        var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src=\'..' + src + '\' rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"  oncontextmenu="return false;" ></iframe>';

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
    $scope.SelectIframoutiframe = function (datapath, text, transid, bcode, locked) {

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
            var iframe = '<iframe id="' + FinalID + '" class="iframedesign " src="' + src + '?' + transid + '\'" rameborder="0" marginheight="1" role="tabpanel" marginwidth="1" seamless="seamless"  allowtransparency="true"></iframe>';
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
    $scope.showphoto = function (input, imgfileid) {
        if (input.files && input.files[0]) {
            var filerdr = new FileReader();
            filerdr.onload = function (e) {
                $scope.Photo = e.target.result;
                $scope.$applyAsync();
                $(imgfileid).attr('src', e.target.result);
                $(imgfileid).attr('value', e.target.result);
            }
            filerdr.readAsDataURL(input.files[0]);
        }
        else {
            $scope.Image = '';
            $scope.$applyAsync();
            $(imgfileid).attr('src', '');
            $(imgfileid).attr('value', '');
        }
    };

    $scope.UploadPhoto = function () {
        var collectionobj = {};
        debugger;
        collectionobj.LoginId = LoginId;
        collectionobj.Photo = $scope.Photo;
        collectionobj.Action = 12;
        var getData = myService.methode('POST', "../ChangePassCode/UploadPhoto", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.GetDetails();
            }
        });
    }
    $scope.DeletePhoto = function () {
        var collectionobj = {};
        collectionobj.LoginId = LoginId;
        collectionobj.Photo = '';
        collectionobj.Action = 27;
        var getData = myService.methode('POST', "../ChangePassCode/UploadPhoto", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result)) {
                $scope.Photo = '';
                $('#profilePreview').attr('src', '~/PayrollDashboard/assets/profile.png');
                $('#profilepic').attr('src', '~/PayrollDashboard/assets/profile.png');
                $scope.GetDetails();
            }
        });
    }

    $scope.GetDetails = function () {
        var collectionobj = {};
        collectionobj.Action = 13;
        collectionobj.LoginId = LoginId;
        var getData = myService.methode('POST', "../Dashboard/GetUserRegistration", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.Photo = response.data.Result[0].Photo;
            sessionStorage.removeItem("Photo");

            sessionStorage.setItem('Photo', response.data.Result[0].Photo);
            var Photo = sessionStorage.getItem("Photo");
            $scope.$applyAsync(); 
        });
    }

    $scope.Pergatepass = function () {

        $scope.showLoader();

        var collectionobj = {
            Action: 10,
            LoginId: LoginId,
            Id: $scope.PassType
        };

        var getData = myService.methode(
            'POST',
            "../Dashboard/GetContractorGatePass",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            if (response.data &&
                response.data.Result &&
                response.data.Result.length > 0) {

                var data = response.data.Result[0];
                $scope.PermanentGatePassStatus = 'Yes'
                $scope.PerGatepass = data.PerGatepass;
                $scope.gatepassper = true;
                $scope.PrincipleName = data.PrincipleName;
                $scope.PartyName = data.PartyName;
                $scope.EmployeeDesignation = data.EmployeeDesignation;
                $scope.SiteName = data.SiteName;
                $scope.PCreatedOn = data.CreatedOn;
                $scope.GatePassDays = data.GatePassDays;
                $scope.PGatePassExpiryDate = data.GatePassExpiryDate;
                $scope.EmployeeName = data.EmployeeName;
                $scope.PermanemtAddress = data.PermanemtAddress;
                $scope.StampDate = data.StampDate;
                $scope.Age = data.Age;
                $scope.EmployeePhoto = data.EmployeePhotos;

                $scope.PermanentGatePassNo = data.GatePassID;
                $scope.DateOfBirth = data.DateOfBirth;
                $scope.ContractMobileNumber = data.ContractMobileNumber;
                $scope.PrMobileNumber = data.PrMobileNumber;
                $scope.EmployeePhoto = data.EmployeePhotos;
                $scope.BloodGroup = data.BloodGroup;
            }

        }).catch(function (error) {

            console.log(error);
            $scope.gatepasstem = false;

        }).finally(function () {

            $scope.hideLoader();

        });
    };
    $scope.Tempgatepass = function () {

        $scope.showLoader();

        var collectionobj = {
            Action: 11,
            LoginId: LoginId,
            Id: $scope.PassType
        };

        var getData = myService.methode(
            'POST',
            "../Dashboard/GetContractorGatePass",
            JSON.stringify(collectionobj)
        );

        getData.then(function (response) {

            if (response.data &&
                response.data.Result &&
                response.data.Result.length > 0) {

                var data = response.data.Result[0];

                $scope.gatepasstem = true;
                $scope.TemporaryGatePassStatus = 'Yes'
                $scope.PrincipleName = data.PrincipleName;
                $scope.PartyName = data.PartyName;
                $scope.EmployeeDesignation = data.EmployeeDesignation;

                $scope.TemporaryGatePassNo = data.GatePassID;

                $scope.SiteName = data.SiteName;
                $scope.TCreatedOn = data.CreatedOn;
                $scope.GatePassDays = data.GatePassDays;
                $scope.TGatePassExpiryDate = data.GatePassExpiryDate;
                $scope.EmployeeName = data.EmployeeName;
                $scope.EmployeeCode = data.EmployeeCode;
                $scope.PermanemtAddress = data.PermanemtAddress;
                $scope.StampDate = data.StampDate;
                $scope.DateOfBirth = data.DateOfBirth;
                $scope.ContractMobileNumber = data.ContractMobileNumber;
                $scope.PrMobileNumber = data.PrMobileNumber;
                $scope.EmployeePhoto = data.EmployeePhotos;
                $scope.BloodGroup = data.BloodGroup;
                $scope.Age = data.Age;
                $scope.EmployeePhoto = data.EmployeePhotos;

            }

        }).catch(function (error) {

            console.log(error);

            $scope.gatepassper = false;

        }).finally(function () {

            $scope.hideLoader();

        });
    };
    $scope.printTemporaryGatePass = function () {

        var printContents = document.getElementById("temporaryGatePassPrintArea").innerHTML;

        var printWindow = window.open('', '', 'width=900,height=700');

        printWindow.document.write(`
        <html>
        <head>
            <title>Temporary Gate Pass</title>

            <style>
                body{
                    font-family: Arial, sans-serif;
                    margin:20px;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                }

                table, th, td{
                    border:1px solid #000;
                }

                th, td{
                    padding:8px;
                    text-align:left;
                }

                .page-title{
                    text-align:center;
                    font-size:22px;
                    font-weight:bold;
                    margin-bottom:10px;
                }

                .signature-wrapper{
                    display:flex;
                    justify-content:space-between;
                    margin-top:50px;
                }

                .signature-box{
                    width:22%;
                    text-align:center;
                }

                .signature-line{
                    border-top:1px solid #000;
                    margin-bottom:5px;
                }
            </style>

        </head>
        <body>
            ${printContents}
        </body>
        </html>
    `);

        printWindow.document.close();

        setTimeout(function () {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };
    $scope.printPermanentGatePass = function () {

        var printContents =
            document.getElementById("permanentGatePassPrintArea").outerHTML;

        var printWindow = window.open('', '_blank');

        printWindow.document.write(`
    <html>
    <head>
        <title>Permanent Gate Pass</title>

        <link rel="stylesheet"
              href="https://login.bharatshramsetu.com/Content/Dashboards/WorkerProfile/style.css">

        <link rel="stylesheet"
              href="https://login.bharatshramsetu.com/Content/Masters/NewEmployeeMaster/style.css">

        <style>
            body{
                margin:15px;
                background:#fff;
            }

            @page{
                size:A4;
                margin:5mm;
            }
        </style>
<style>
    p {
        margin-top: 0;
        margin-bottom: 0rem !important;
    }

    .d-none-print {
        display: none;
    }

    .d-none-print {
        display: none;
    }

    .cropper-view-box,
    .cropper-face {
        border-radius: 50%;
    }
</style>
<style>
    /* ================= CONTAINER ================= */
    .idCardContainer {
        display: flex;
        gap: 20px;
        justify-content: center;
    }

    /* ================= CARD BASE ================= */
    .idCard {
        background: #f4f4f4;
        border-radius: 14px;
        overflow: hidden;
        position: relative;
        font-family: 'Segoe UI', sans-serif;
        display: flex;
        flex-direction: column;
    }

    /* ================= UI CARD (MODAL) ================= */
    .employeeViewModalPage .idCard {
        width: 420px;
        height: 260px;
    }

    /* ================= HEADER ================= */
    .idHeader {
        height: 60px;
        background: #8f8f8f;
        /*border-bottom-left-radius: 25px;
        border-bottom-right-radius: 25px;*/
        position: relative;
    }

    .logoBox {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        color: #fff;
    }

        .logoBox span {
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .logoBox img {
            width: 18px;
        }

    /* ================= PROFILE ================= */
    .profileSection {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        gap: 10px;
    }

    .profileImage {
        width: 65px;
        height: 65px;
        min-width: 60px;
        border-radius: 50%;
        overflow: hidden;
        /* margin-top: -40px; */
        border: 1px solid #fff;
        z-index: 10;
    }

        .profileImage img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

    .profileDetails {
        /*flex: 1;*/
        text-align: left;
        /* min-width: 0; */
        padding-left: 1rem;
    }

        .profileDetails h2 {
            font-size: 16px;
            color: #00224F;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .profileDetails p {
            font-size: 12px;
            margin: 0;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

    /* ================= QR ================= */
    .qrCode {
        margin-left: auto;
    }

        .qrCode img {
            width: 55px;
        }

    /* ================= INFO ================= */
    .infoSection {
        display: flex;
        padding: 8px 10px;
        flex: 1;
    }

        .infoSection .left,
        .infoSection .right {
            width: 50%;
            min-width: 0;
        }

    .divider {
        width: 2px;
        background: #1d3557;
        margin: 0 5px;
    }

    .infoSection .field label {
        font-size: 10px;
        color: #00224F;
    }

    .field h4 {
        font-size: 13px;
        margin: 2px 0 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #000;
    }


    /* ================= BACK ================= */
    .backContent {
        padding: 10px;
        height: 100%;
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* 3 columns */
        grid-template-rows: repeat(2, auto); /* 2 rows */
        gap: 8px;
    }

        /* REMOVE old row behavior */
        .backContent .row1 {
            display: contents; /* makes children behave like direct grid items */
        }

        /* EACH FIELD */
        .backContent .field {
            min-width: 0;
        }

            /* TEXT CONTROL */
            .backContent .field label {
                font-size: 10px;
                color: #00224F;
            }

        .backContent h4 {
            font-size: 11px;
            margin: 2px 0 6px;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #000;
        }


    /* ================= NOTES ================= */
    .notesBox {
        background: #e6e6e6;
        border-radius: 8px;
        padding: 6px;
        font-size: 9px;
        text-align: left;
    }

        .notesBox ul {
            margin: 0;
            padding-left: 12px;
        }

    /* ================= FLIP ================= */
    .flip-card {
        width: 420px;
        height: 260px;
        perspective: 1000px;
        margin: auto;
        cursor: pointer;
    }

    .card-inner {
        width: 100%;
        height: 100%;
        position: relative;
        transition: transform 0.6s;
        transform-style: preserve-3d;
    }

    .flip-card.flip .card-inner {
        transform: rotateY(180deg);
    }

    .card-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
    }

        .card-face.back {
            transform: rotateY(180deg);
        }


    /*FOOTER*/
    .footerRow {
        display: flex;
        justify-content: space-between;
        font-weight: 400;
    }

        .footerRow .label {
            color: #00224F;
            font-size: 10px;
        }

        .footerRow span {
            font-size: 10px;
        }

    .rightAlign {
        text-align: right;
    }
</style>

    </head>
    <body>
        ${printContents}
    </body>
    </html>
    `);

        printWindow.document.close();

        printWindow.onload = function () {

            printWindow.focus();
            printWindow.print();

            setTimeout(function () {
                printWindow.close();
            }, 500);
        };
    };

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
    $scope.ChangePassword = function () {
        // 
        var valid = true;
        if ($('#txtCurrentPasscode').val() == '') {
            $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            showMsgBox('999', 'Alert', 'Current Password Not Valid', 'warning', 'btn-warning')
            valid = false;
            return;
        }
        else if ($('#txtNewPasscode').val() == '') {
            $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            showMsgBox('999', 'Alert', 'New Current Password Not Valid', 'warning', 'btn-warning')
            valid = false;
            return;
        }
        else if ($('#txtReTypePasscode').val() == '') {
            $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            showMsgBox('999', 'Alert', 'Confirm Password Not Valid', 'warning', 'btn-warning')
            valid = false;
            return;
        }
        else if ($('#txtNewPasscode').val() != $('#txtReTypePasscode').val()) {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            showMsgBox('999', 'Alert', 'New Password and Confirm Password must match.', 'warning', 'btn-warning')
            valid = false;
            return;
        }
        else if ($('#txtCurrentPasscode').val() == $('#txtReTypePasscode').val()) {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            showMsgBox('999', 'Alert', 'Current Password and New Password Sholud not match.', 'warning', 'btn-warning')
            valid = false;
            return;
        }
        else if (valid == true) {
            $('#txtCurrentPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            $('#txtNewPasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            $scope.VCount($('#txtReTypePasscode').val())
        }

    }
    $scope.VCount = function (str) 
	{
        var upper = 0,
            lower = 0,
            number = 0,
            special = 0;
        for (var i = 0; i < str.length; i++) {
            if (str[i] >= "A" && str[i] <= "Z") upper++;
            else if (str[i] >= "a" && str[i] <= "z") lower++;
            else if (str[i] >= "0" && str[i] <= "9") number++;
            else special++;
        }
        if (upper >= 1 && lower >= 1 && special >= 1 && number >= 1) {
            $scope.VerifyPassword()
        }
        else {
            var Msg = "Your Password should be Upper case  should be 1 Capital letter , 1 Special characters ,1 Number currently Upper case letter : " + upper + ", Lower case : " + lower + ", Number : " + number + ", Special characters : " + special
            showMsgBox('999', 'Alert', Msg, 'warning', 'btn-warning')
        }

    }

    $scope.showLogoutProcess = false;
    $scope.logoutStep = 0;

    $scope.logoutWithProcess = function () {

        // Show overlay
        $scope.showLogoutProcess = true;
        $scope.logoutStep = 0;

        // Step 1 - Save Data
        setTimeout(function () {
            $scope.$apply(function () {
                $scope.logoutStep = 1;
            });
        }, 800);

        // Step 2 - Maintain Settings
        setTimeout(function () {
            $scope.$apply(function () {
                $scope.logoutStep = 2;
            });
        }, 1600);

        // Step 3 - Maintain Logs
        setTimeout(function () {
            $scope.$apply(function () {
                $scope.logoutStep = 3;
            });
        }, 2400);

        // Final Logout
        setTimeout(function () {
            $scope.$apply(function () {
                $scope.logoutStep = 4;
            });

            // 🔴 ACTUAL LOGOUT CALL HERE
            // Example:
            // myService.methode('POST', '../Account/Logout')

            setTimeout(function () {
                if (window.top !== window.self) {
                    window.top.location.href = '../Login/Login';
                } else {
                    window.location.href = '../Login/Login';
                }
            }, 1000);

        }, 3200);
    };

    $scope.BindDashboard = function () {

        let cacheKey = "MenuBinding_" + (LoginId || "guest");
        let cachedMenuBinding = sessionStorage.getItem(cacheKey);

        // ✅ CACHE USE
        if (cachedMenuBinding) {
            let data1 = JSON.parse(cachedMenuBinding);

            $scope.UserDetail = data1.UserDetail || [];
            $scope.DahboardList = data1.DahboardList || [];

            // 👉 menu yahi se
            $scope.MenuAddDynamic = $scope.DahboardList;

            applyFlags($scope.MenuAddDynamic);
            setUserInfo();
            return;
        }

        var collectionobj = {
            PartyID: MapId,
            UserId: LoginId,
            Action: ($scope.DashboardSwitch == 'AdminSupplier' || $scope.DashboardSwitch == 'Supplier') ? 7 : 1
        };

        $scope.isDashboardLoading = true;

        myService.methode('POST', "../Retail/bindingDashboard", collectionobj)
            .then(function (response) {

                var res = response.data?.Result;

                if (res) {
                    $scope.UserDetail = res.Table || [];
                    $scope.DahboardList = res.Table1 || [];

                    // 👉 menu same list se
                    $scope.MenuAddDynamic = $scope.DahboardList;

                    // ✅ CACHE STORE
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        UserDetail: $scope.UserDetail,
                        DahboardList: $scope.DahboardList
                    }));

                    applyFlags($scope.MenuAddDynamic);
                    setUserInfo();
                }

            }).finally(function () {
                $scope.isDashboardLoading = false;
            });

        function setUserInfo() {
            if ($scope.UserDetail.length > 0) {
                var u = $scope.UserDetail[0];

                $scope.UserName = u.UserName;
                $scope.Status = u.Status;
                $scope.LastLogin = u.LastLogin;
                $scope.LoginType = u.Desig;
                $scope.Photo = (u.Photo && u.Photo.trim() !== '')
                    ? u.Photo
                    : '../content/profile.png';
            }
        }
    };
    $scope.BindMenus = function () {

        let cacheKey = "MenuPermission_" + (LoginId || "guest");
        let cachedMenu = sessionStorage.getItem(cacheKey);

        if (cachedMenu) {
            console.log("Using cached menu");

            let data = JSON.parse(cachedMenu);
            if (data && data.length > 0) {
                $scope.MenuAddDynamic = data;
                $scope.DahboardList = data;
                applyFlags(data); // alag function bana lo flags ke liye
                return;
            } else {
                sessionStorage.removeItem(cacheKey);
            }
        }

       
        var collectionobj = {};
        collectionobj.Id = LoginId;
        collectionobj.Action = 5;

        var getDetails = myService.methode(
            'POST',
            "../RetailSection/RetailRolePermisssion",
            JSON.stringify(collectionobj) 
        );

        getDetails.then(function (response) {

            angular.forEach(response.data.Result, function (menu) {
                menu.OriginalUrl = menu.MenuUrl;
                menu.MenuUrl = "/p/" + btoa(menu.MenuUrl);
            });

            // ✅ cache me save karo
            sessionStorage.setItem(cacheKey, JSON.stringify(response.data.Result));

            $scope.MenuAddDynamic = response.data.Result;
            $scope.DahboardList = response.data.Result;
            applyFlags(response.data.Result);
        });
    };
	
	
	
    $scope.Bindflags = function () {
        var sessionData = JSON.parse(sessionStorage.getItem("userSession"));
        var collectionobj = {};
        collectionobj.Id = sessionData.LoginId;
        collectionobj.Action = 2;
        collectionobj.MapId = sessionData.MapId;

        var getData = myService.methode(
            'POST',
            "../RetailSection/GetUserPermissionSectionRoll",
            JSON.stringify(collectionobj)
        );
        getData.then(function (response) {
            sessionStorage.setItem("RollPermission", JSON.stringify(response.data.Result));
        });
    };

	
	
    function applyFlags(menuData) {

        let row = menuData.find(x => x.SectionName === 'Store Compliance Status');
        let row1 = menuData.find(x => x.SectionName === 'Location Master');
        let row2 = menuData.find(x => x.SectionName === 'Finance Common Compliance');
        let row3 = menuData.find(x => x.SectionName === 'Secretarial Common Compliance');
        let row4 = menuData.find(x => x.SectionName === 'Compliance Doc');
        let row5 = menuData.find(x => x.SectionName === 'Manage Project');
        let row6 = menuData.find(x => x.SectionName === 'License Master');
        let row7 = menuData.find(x => x.SectionName === 'Labour Compliance');
        let row8 = menuData.find(x => x.SectionName === 'Finance Compliance');
		 let row9 = menuData.find(x => x.SectionName === 'Factory  Compliance');
        let row10 = menuData.find(x => x.SectionName === 'Secretarial Compliance');
       
        if (row) {
            $scope.SCS_ViewFlag = row.ViewFlag;
            $scope.SCS_AllowEditFlag = row.ViewFlag;
            $scope.SCS_EditFlag = row.ViewFlag;
            $scope.SCS_DeleteFlag = row.ViewFlag;
            $scope.SCS_UploadFlag = row.ViewFlag;
            $scope.SCS_DownloadFlag = row.ViewFlag;
        }

        if (row1) {
            $scope.SMF_EditFlag = row1.EditFlag;
            $scope.SMF_ViewFlag = row1.ViewFlag;
            $scope.SM_DeleteFlag = row1.DeleteFlag;
            $scope.SM_UploadFlag = row1.UploadFlag;
            $scope.SM_DownloadFlag = row1.DownloadFlag;
            $scope.SM_VerifyFlag = row1.VerifyFlag;
            $scope.SM_NewStoreFlag = row1.NewStoreFlag;
        }

        if (row2) {
            $scope.FINAETUP_Flag = row2.ViewFlag;
        }

        if (row3) {
            $scope.SECRETUP_Flag = row3.ViewFlag;
            $scope.Entity_Flag = row3.ViewFlag;
        }

        if (row4) {
            $scope.CD_ViewFlag = row4.ViewFlag;
            $scope.CD_EditFlag = row4.EditFlag;
            $scope.CD_DeleteFlag = row4.DeleteFlag;
            $scope.CD_UploadFlag = row4.UploadFlag;
            $scope.CD_DownloadFlag = row4.DownloadFlag;
            $scope.CD_VerifyFlag = row4.VerifyFlag;
        }

        if (row5) {
            $scope.MP_ViewFlag = row5.ViewFlag;
        }

        if (row6) {
            $scope.Licenseurl = row6.url;
            $scope.LR_ViewFlag = row6.ViewFlag;
            $scope.LM_ViewFlag = row6.ViewFlag;
            $scope.LM_EditFlag = row6.EditFlag;
            $scope.LM_DeleteFlag = row6.DeleteFlag;
            $scope.LM_UploadFlag = row6.UploadFlag;
            $scope.LM_DownloadFlag = row6.DownloadFlag;
            $scope.LM_VerifyFlag = row6.VerifyFlag;
        }

        if (row7) {
            $scope.PF_EditFlag = row7.EditFlag;
            $scope.PFUpload = row7.UploadFlag;
            $scope.PFVerify = row7.VerifyFlag;
        }
        if (row8) { 
            $scope.FM_EditFlag = row8.EditFlag;
            $scope.allowupdfile = row8.UploadFlag; 
            $scope.allowverifyflag = row8.VerifyFlag;
        }
		if (row9) {
            $scope.Fac_EditFlag = row9.EditFlag;
            $scope.Fac_allowupdfile = row9.UploadFlag;
            $scope.Fac_allowverifyflag = row9.VerifyFlag;
        }
        if (row10) {
            $scope.SC_EditFlag = row10.EditFlag;
            $scope.SC_allowupdfile = row10.UploadFlag;
            $scope.SC_allowverifyflag = row10.VerifyFlag;
        }
    }
   
    $scope.VerifyPassword = function () {
        var collectionobj = {};
        collectionobj.BranchCode = '001';
        collectionobj.OldPassword = $('#txtCurrentPasscode').val();
        collectionobj.NewPassword = $('#txtReTypePasscode').val();
        collectionobj.LoginId = LoginId;
        collectionobj.Action = 2;
        var getData = myService.methode('POST', "../ChangePassCode/ModifyPassCode", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            if (showMsgBox(response.data.Result))
            {
                $scope.ClearControl(1);
            }
        });
    }


 
    $scope.Clicktocompliance = function (SINVOICENO, ClientId, VendorCId) {

        if (isValidate()) {

            var collectionobj = {
                Action: 10,
                InvoiceNo: SINVOICENO,
                VendorId: VendorCId,
                Id: ClientId
            };

            var getData = myService.methode(
                'POST',
                "../DocumentMaster/GetAuditorCompliance",
                { obj: collectionobj }   // ✅ Direct object pass karo
            );

            getData.then(function (response) {

                if (!response.data || response.data.length === 0) {
                    showMsgBox('999', 'warning', 'No data found', 'warning', 'btn-warning');
                    return;
                }

                if (response.data[0].MSG != '1') {
                    showMsgBox('999', 'warning', response.data[0].MSG, 'warning', 'btn-warning');
                }
                else { 
                    window.location.href = '../Dashboard/ComplianceAuditReport?'+ SINVOICENO + '|' + ClientId + '|' + VendorCId;
                }

            }, function (error) {
                showMsgBox('999', 'error', 'Something went wrong', 'danger', 'btn-danger');
            });
        }
    };

    $scope.checkandgetreport = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.Action = 10;
            collectionobj.InvoiceNo = $scope.InvoiceNo;
            collectionobj.VendorId = $scope.VendorCId;
            collectionobj.Id = $scope.ClientId;
            var getData = myService.methode('POST', "../DocumentMaster/GetAuditorCompliance", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {

                if (response.data[0].MSG != '1') {
                    showMsgBox('999', 'warning', response.data[0].MSG, 'warning', 'btn-warning')
                }
                else {
                    $scope.SelectIframoutiframe('PrintComplianceReport', 'ComplianceReport', $scope.InvoiceNo + '|' + $scope.ClientId + '|' + $scope.VendorCId, 'ComplianceReport');
                }


            });
        }
    };



    $scope.switchtoRetailadmin = function () {

        if (DashboardSwitch == 'AdminSupplier' || DashboardSwitch == 'Supplier') {
            window.top.location.href = '../Dashboard/VBoard';
        }
        else {
            window.top.location.href = '../Dashboard/VBoard';
        }
     
    }

    $scope.switchtovendoradmin = function () {
        //if (DashboardSwitch == 'Supplier' || DashboardSwitch == 'AdminSupplier' ) {
           // window.top.location.href = '../Dashboard/VBoard';
       // }
        //else {
          //  window.top.location.href = '../Dashboard/Board';
        //}
		window.top.location.href = '../Dashboard/VBoard';
        
    }

 $scope.SwithctoProfile = function () {
        if (loginType == 7) {
            window.top.location.href = '../RetailSection/WorkerProfile';
        }
        else if (loginType == 6 || loginType == 2) {
            window.top.location.href = '../RetailSection/ContractorProfile';
        }
        else {
            window.top.location.href = '../RetailSection/PrincipleProfile';
        }
    }
     
    $scope.ClearControl = function (flag) { 
        if (flag == 1) {
            $scope.ResetControl(flag);
            $scope.Logout();
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
        $scope.currentPassStatus = '';
        $scope.ReTypePasscodeStatus = '';
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



    $scope.ChkCurrectPassword = function () {

        $scope.isVerifying = true;          // 🔄 SHOW LOADER
        $scope.currentPassStatus = null;   // reset icons

        var collectionobj = {};
        collectionobj.OldPassword = $('#txtCurrentPasscode').val();
        collectionobj.userId = LoginId;
        collectionobj.UserName = $scope.UserName;

        var getData = myService.methode(
            'POST',
            "../ChangePassCode/checkPassCode",
            '{obj:' + JSON.stringify(collectionobj) + '}'
        );

        getData.then(function (response) {

            if (response.data == "1") {
                $scope.currentPassStatus = 1;   // ✔️
                $scope.mySwitch = false;
                $('#txtCurrentPasscode')
                    .css('box-shadow', '0 0 5px #70c126');
            }
            else {
                $scope.currentPassStatus = 0;   // ❌
                $scope.mySwitch = true;
                $('#txtCurrentPasscode')
                    .css('box-shadow', '0 0 5px #ea1313');
            }

        }).finally(function () {
            $scope.isVerifying = false;     // ✅ HIDE LOADER
        });
    };


    $scope.ChkConfirmpass = function () {
        //
        if ($('#txtNewPasscode').val() == $('#txtReTypePasscode').val()) {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #70c126;')
            $scope.ReTypePasscodeStatus = 1;
        }
        else {
            $('#txtReTypePasscode').attr('style', 'box-shadow: 0px 1px #ea1313;')
            $scope.ReTypePasscodeStatus = 0;
        }
    }
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
    //-------------------------------------------
    $scope.getRetailNotification = function () {

        var collectionobj = {}; 
        collectionobj.UserId = LoginId;
        collectionobj.ActionType = 7;
        var getData = myService.methode('POST', ("../RetailSection/SearchEscalation"), JSON.stringify(collectionobj));
        getData.then(function (response)
        {
            $scope.RetailNotificationList = response.data.Result
        });
    };
    
    $scope.Schecdular = function () {
        var elements = $('.period');
        function update_status() {
            elements.each(function () {
                var current = new Date();
                var sH = parseInt($(this).find('.start_time_hour').val());
                var sM = parseInt($(this).find('.start_time_min').val());
                var eH = parseInt($(this).find('.end_time_hour').val());
                var eM = parseInt($(this).find('.end_time_min').val());

                if (current.getHours() >= sH && current.getHours() <= eH && current.getMinutes() >= sM && current.getMinutes() <= eM) {
                    $(this).setAttr('id', 'active');
                }
            });
        }
        setInterval(update_status, 1000);
    }
    $scope.SetRetaildetail = function (Title, Date, Remark, button, css, Id, Escalation1Remark, Escalation2Remark, Status, Closedby)
    {
        $scope.Title=Title;
        $scope.Date=Date;
        $scope.Remark = Remark;
        $scope.button = button; $scope.css = css;
        $scope.Id = Id;
        $scope.Escalation1Remark = Escalation1Remark;
        $scope.Escalation2Remark = Escalation2Remark;
        $scope.Status = Status
        $scope.Closedby = Closedby
    }

    $scope.DownloadFileC = function (documentPath, fileName) {

        var url = "/RetailSection/DownloadFile?filePath="
            + encodeURIComponent(documentPath)
            + "&fileName="
            + encodeURIComponent(fileName || '');

        var link = document.createElement("a");
        link.href = url;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    $scope.ViewFileC = function (documentPath) {

        var url = "/RetailSection/ViewFile?filePath=" + encodeURIComponent(documentPath);

        window.open(url, '_blank', 'width=900,height=600,scrollbars=yes,resizable=yes');
    };
    $scope.ApproveClose = function (css,Id) {
         
            var collectionobj = {};
            if (css == 'block') 
            {
                collectionobj.ActionType = 8;
                collectionobj.Remark = $scope.Aremark;
                if ($scope.Aremark == '' || $scope.Aremark == undefined) {
                  showMsgBox('999', 'Alert', 'Enter Remark', 'warning', 'btn-warning');
                  return;
                }
            }
            else if (css == 'none') {
                collectionobj.ActionType = 9;
                collectionobj.Remark = "";
            }
            else {
                showMsgBox('999', 'Alert', 'Something went Wrong, please refresh page', 'warning', 'btn-warning');
                return;
            }
            collectionobj.Id = Id;
            collectionobj.ClientId = LoginId;

            var getData = myService.methode('POST', ("../RetailSection/IUDEscalation"), JSON.stringify(collectionobj));
            getData.then(function (response) {
                $scope.Aremark == '';
                $scope.eStoreId1 == '';
                $('#btnclose1').click();
                $scope.MessageReturn = response.data.Result;
                $('#showmsgid').click();
                $scope.getRetailNotification();
            });
        }; 
   
    //----------------------------------------------------
    $scope.GetModules = function () {

        var collectionobj = {};
        collectionobj.BranchCode = BranchCode;
        collectionobj.LoginId = LoginId;

        var getData = myService.methode('POST', '../Dashboard/ModuleList', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ModuleList = response.data.Result
        });
    };

    $scope.GetRoles = function (PartyId) {

        var collectionobj = {};
        collectionobj.BranchCode = BranchCode;
        collectionobj.LoginId = LoginId;
        collectionobj.PartyId = PartyId;

        var getData = myService.methode('POST', '../Dashboard/RoleList', '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.RoleList = response.data.Result
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
                    if ($scope.Rowdata[index]['currentRow'] + 6 < $scope[attr[index].listobj].length) {
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
        if (backspace == null) {
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


    $scope.LoadPageName = function () {
        var value = '';
        if (window.location.href.indexOf('?') !== -1) {
            value = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
            value = value[0].replace(/%20/g, " ");
            $scope.SectionMenuName = value;
        }
        else {
            $scope.SectionMenuName = "Dashboard";
        }

    }
    $scope.searchQuery = '';
    $scope.showDropdown = false;
    $scope.searchResults = [];

     
    $scope.onSearch = function () {
        $('#cover-spin').show(150);
        var collectionobj = {};
        if (loginType == 1) {
            type = "Auditor";
        } else if (loginType == 4) {
            type = "Client";
        }
        collectionobj.PartyType = type;
        collectionobj.PartyId = LoginId;
        collectionobj.Attribute1 = $scope.SearchValue;
        var selectedValue = $scope.SearchValue;
        if ($scope.SearchValue.length > 0) {
            var getData = myService.methode('POST', "../RetailSection/GetStoreDataBySearch", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {
                $scope.records = response.data.Result;
                if (response.data.Result.length > 0)
                {
                    var tot = response.data.Result.length - 1;
                    $scope.StoreCode = response.data.Result[tot].StoreId; 
                }
                else{$scope.StoreCode = ''; }
            })
            .catch(function (error) {
                console.error('Error fetching data:', error);
            });

        }
        else {
            $scope.showDropdown = false;
        }

    };
    $scope.showViewAllLink = function () {
        // Check if the number of rows in the table is greater than 4
        return $scope.MasterList.length > 4;
    };
    $scope.handleBlur = function () {
        $timeout.cancel($scope.blurTimer);
        $scope.blurTimer = $timeout(function () {
            $('#collapseinputbox').attr('class', 'collapse in');
            $('#CollapseSearchTableList').attr('class', 'collapse');
            $scope.Onstarted();
        }, 100);
    };

    $scope.selectAll = false;

    $scope.toggleSelectAll = function () {
        angular.forEach($scope.MasterList, function (licenseMaster) {
            licenseMaster.checked = $scope.selectAll;
        });
    };

    $scope.$watch('MasterList', function () {
        var allChecked = true;
        angular.forEach($scope.MasterList, function (licenseMaster) {
            if (!licenseMaster.checked) {
                allChecked = false;
            }
        });
        $scope.selectAll = allChecked;
    }, true);
     
    $scope.Onstarted = function () {
        var collectionobj = {};
        $scope.showLoader();
        collectionobj.PartyId = LoginId;
        collectionobj.StoreCode = $scope.SearchValue;
        var getData = myService.methode('POST', ("../RetailSection/GetLicenseAndRegistrationBy"), JSON.stringify(collectionobj));
        getData.then(function (response) {
            $scope.MasterList = response.data.Result;
            $scope.hideLoader();
        });
        $scope.hideLoader();
    };
      
    $scope.tabList = [];
    $scope.activeTabId = null;

    $scope.openTab = function (tabId, tabTitle, tabUrl) {
        $scope.activeTabId = tabId;

        // Check if tab already exists
        let existing = $scope.tabList.find(t => t.id === tabId);
        if (!existing) {
            $scope.tabList.push({ id: tabId, title: tabTitle, url: tabUrl });
        }

        // Clear headers and re-render
        angular.element('#tabs').empty();
        angular.element('#tabContents .tab-pane').removeClass('active show');

        let visibleTabs = $scope.tabList.slice(0, 4);
        let overflowTabs = $scope.tabList.slice(4);

        // --- Render first 6 tabs ---
        angular.forEach(visibleTabs, function (tab) {
            var tabHeader = `
        <li class="nav-item" id="tabHead-${tab.id}">
            <a class="nav-link ${tab.id === tabId ? 'active' : ''}" data-toggle="tab" href="#${tab.id}" role="tab">
                ${tab.title}
                <span class="ml-2 text-primary" style="cursor:pointer;" ng-click="reloadActiveTab('${tab.id}')">&#x21bb;</span>
                <span class="ml-2 text-danger" style="cursor:pointer;" ng-click="closeTab('${tab.id}')">&times;</span>
            </a>
        </li>`;
            var compiledHeader = $compile(tabHeader)($scope);
            angular.element('#tabs').append(compiledHeader);
        });

        // --- Render overflow tabs inside dropdown ---
        if (overflowTabs.length > 0) {
            let moreDropdown = `
        <li class="nav-item dropdown" id="moreTabs" style="position: absolute;margin-left: 88%;">
            <a class="nav-link dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">
                More
            </a>
            <div class="dropdown-menu">`;

            angular.forEach(overflowTabs, function (tab) {
                moreDropdown += `
            <a class="dropdown-item" href="javascript:void(0);" ng-click="switchToTab('${tab.id}')">
                ${tab.title}
                <span class="ml-2 text-primary" style="cursor:pointer;" ng-click="reloadActiveTab('${tab.id}'); $event.stopPropagation();">&#x21bb;</span>
                <span class="ml-2 text-danger" style="cursor:pointer;" ng-click="closeTab('${tab.id}'); $event.stopPropagation();">&times;</span>
            </a>`;
            });

            moreDropdown += `</div></li>`;
            var compiledDropdown = $compile(moreDropdown)($scope);
            angular.element('#tabs').append(compiledDropdown);
        }

        // Render tab content
        if (!document.getElementById(tabId)) {
            var tabContent = `
        <div class="tab-pane fade show active" id="${tabId}" role="tabpanel">
            <iframe id="iframe-${tabId}" src="${tabUrl}" style="width:100%; height:600px; border:none;"></iframe>
        </div>`;
            var compiledContent = $compile(tabContent)($scope);
            angular.element('#tabContents').append(compiledContent);
        } else {
            $('#' + tabId).addClass('show active');
        }
    };


    $scope.reloadActiveTab = function (tabId) {
        var iframe = document.getElementById("iframe-" + tabId);
        if (iframe) iframe.src = iframe.src;
    };

    $scope.closeTab = function (tabId) {
        // Remove from list
        $scope.tabList = $scope.tabList.filter(t => t.id !== tabId);

        // Remove DOM elements
        $('#tabHead-' + tabId).remove();
        $('#' + tabId).remove();

        // Re-render remaining
        if ($scope.tabList.length > 0) {
            const lastTab = $scope.tabList[$scope.tabList.length - 1];
            $scope.openTab(lastTab.id, lastTab.title, lastTab.url);
        }
    };

    $scope.switchToTab = function (tabId) {
        const tab = $scope.tabList.find(t => t.id === tabId);
        if (tab) {
            $scope.openTab(tab.id, tab.title, tab.url);
        }
    };

    
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

    if (IsFunctionDefined('app.ReportHeaderMasterController')) {
        app.ReportHeaderMasterController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.NavMenuPermissionController')) {
        app.NavMenuPermissionController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.VendorInvoiceController')) {
        app.VendorInvoiceController($scope, $element, $filter, myService,$http);
    }
    if (IsFunctionDefined('app.VendorCommunicationController')) {
        app.VendorCommunicationController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ClientCommunicationController')) {
        app.ClientCommunicationController($scope, $element, $filter, myService);
    }


    if (IsFunctionDefined('app.BranchMenuPermissionController')) {
        app.BranchMenuPermissionController($scope, $element, $filter, myService);
    }


    if (IsFunctionDefined('app.PartMasterController')) {
        app.PartMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.NewsletterController')) {
        app.NewsletterController($scope, $element, $filter, myService, $http);
    }

    if (IsFunctionDefined('app.PartySiteManagerController')) {
        app.PartySiteManagerController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.BranchMenuPermissionController')) {
        app.BranchMenuPermissionController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.CommunicationController')) {
        app.CommunicationController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.PartyReportController')) {
        app.PartyReportController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.OneTimeDocumentController')) {
        app.OneTimeDocumentController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.DocumentMasterController')) {
        app.DocumentMasterController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.UserRegistrationController')) {
        app.UserRegistrationController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.AuditorComplianceController')) {
        app.AuditorComplianceController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ComplianceMasterController')) {
        app.ComplianceMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.MappingController')) {
        app.MappingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.DepartmentMasterController')) {
        app.DepartmentMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.StoreComplianceStatusMasterController')) {
        app.StoreComplianceStatusMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RatingController')) {
        app.RatingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.VendorSiteManagerController')) {
        app.VendorSiteManagerController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ClientDashboardController')) {
        app.ClientDashboardController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LocationController')) {
        app.LocationController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.InvoiceDeleteController')) {
        app.InvoiceDeleteController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.CDMController')) {
        app.CDMController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.ReatilController')) {
        app.ReatilController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailModuleMappingMasterController')) {
        app.RetailModuleMappingMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RoleMasterController')) {
        app.RoleMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RoleMenuPermissionController')) {
        app.RoleMenuPermissionController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.RetailEmployeeMasterController')) {
        app.RetailEmployeeMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailStoreMasterController')) {
        app.RetailStoreMasterController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.LicenseMasterController')) {
        app.LicenseMasterController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.GradeMasterController')) {
        app.GradeMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LicenseRequestMasterController')) {
        app.LicenseRequestMasterController($scope, $element, $filter, myService, $timeout);
    }
    if (IsFunctionDefined('app.NewsletterDetailsController')) {
        app.NewsletterDetailsController($scope, $element, $filter, myService, $sce, $window);
    }
    if (IsFunctionDefined('app.RetailStoreMappingController')) {
        app.RetailStoreMappingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailStorePrefixController')) {
        app.RetailStorePrefixController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailDocumentMasterController')) {
        app.RetailDocumentMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailClientDocMapping')) {
        app.RetailClientDocMapping($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.RetailClientDocMapping')) {
        app.RetailClientDocMapping($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.RetailCreateExecuterController')) {
        app.RetailCreateExecuterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailCreateAssignController')) {
        app.RetailCreateAssignController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailAssignExecuterController')) {
        app.RetailAssignExecuterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ComplianceDocController')) {
        app.ComplianceDocController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ManualBulkPaymetController')) {
        app.ManualBulkPaymetController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.AdditionalDocumentController')) {
        app.AdditionalDocumentController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailOneTimeDocumentController')) {
        app.RetailOneTimeDocumentController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LSDController')) {
        app.LSDController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.TimePeriodController')) {
        app.TimePeriodController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ClientActMapping')) {
        app.ClientActMapping($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.ReminderController')) {
        app.ReminderController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LogController')) {
        app.LogController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.StoreDashboardController')) {
        app.StoreDashboardController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailCreateActCalenderController')) {
        app.RetailCreateActCalenderController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailCreateIndustryController')) {
        app.RetailCreateIndustryController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.SubsidiaryController')) {
        app.SubsidiaryController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.MainDashboardController')) {
        app.MainDashboardController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ActoverviewController')) {
        app.ActoverviewController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.IndustryMappingController')) {
        app.IndustryMappingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ClientBoardingController')) {
        app.ClientBoardingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.BoardingMappingController')) {
        app.BoardingMappingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ComplianceDashboardControlelr')) {
        app.ComplianceDashboardControlelr($scope, $element, $filter, myService);
    }
   
    if (IsFunctionDefined('app.StatutoryController')) {
        app.StatutoryController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.ComplianceDashboardController')) {
        app.ComplianceDashboardController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.ReportLicenseMaster')) {
        app.ReportLicenseMaster($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.NoticeInspectionMaster')) {
        app.NoticeInspectionMaster($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ActMasterController')) {
        app.ActMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailOverViewMasterController')) {
        app.RetailOverViewMasterController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.ChatbotSupportController')) {
        app.ChatbotSupportController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.RetailDepMasterController')) {
        app.RetailDepMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LitigationMasterController')) {
        app.LitigationMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailCourtMasterController')) {
        app.RetailCourtMasterController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LitigationManagementcontroller')) {
        app.LitigationManagementcontroller($scope, $element, $filter, myService, $timeout);
    }
    if (IsFunctionDefined('app.FileRetailMatchingController')) {
        app.FileRetailMatchingController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.StatutorySetupController')) {
        app.StatutorySetupController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ExpectationController')) {
        app.ExpectationController($scope, $element, $filter, myService);
    }
    var injector = angular.element(document).injector();
    var $q = injector.get('$q');
    var $compile = injector.get('$compile');
    var $timeout = injector.get('$timeout');
    var $http = injector.get('$http');

    if (IsFunctionDefined('app.AddcomplianceFileController')) {
        app.AddcomplianceFileController($scope, $element, $filter, myService, $http, $compile, $timeout, $q);
    }  
    if (IsFunctionDefined('app.RetailSecretarialComplianceController')) {
        app.RetailSecretarialComplianceController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.SecretarialStatutoryController')) {
        app.SecretarialStatutoryController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.SecretarialStatutorySetupController')) {
        app.SecretarialStatutorySetupController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailFinacialCreateActCalenderController')) {
        app.RetailFinacialCreateActCalenderController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.FinacialStatutoryController')) {
        app.FinacialStatutoryController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.FinancialStatutorySetupController')) {
        app.FinancialStatutorySetupController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.RetailHeaderTemplateController')) {
        app.RetailHeaderTemplateController($scope, $element, $filter, $sce, myService);
    }
    if (IsFunctionDefined('app.EnitfyController')) {
        app.EnitfyController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailFactoryComplianceController')) {
        app.RetailFactoryComplianceController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.FactoryStatutoryController')) {
        app.FactoryStatutoryController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.CombinedReportController')) {
        app.CombinedReportController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.LicenseApplicableController')) {
        app.LicenseApplicableController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RController')) {
        app.RController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.AddContractorComplianceController')) {
        app.AddContractorComplianceController($scope, $element, $filter, myService, $http, $compile, $timeout);
    }
    if (IsFunctionDefined('app.ReportDashbaord')) {
        app.ReportDashbaord($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.Commondashboardcontroller')) {
        app.Commondashboardcontroller($scope, $element, $filter, myService, $timeout);
    }
    if (IsFunctionDefined('app.RetailLabourCodeComplianceController')) {
        app.RetailLabourCodeComplianceController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LabourCodeController')) {
        app.LabourCodeController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.LocationMasterController')) {
        app.LocationMasterController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.MailingController')) {
        app.MailingController($scope, $element, $filter, $sce, myService, $timeout);
    }

    if (IsFunctionDefined('app.AdminDashboardcontroller')) {
        app.AdminDashboardcontroller($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.NewLicenseRequestMasterController')) {
        app.NewLicenseRequestMasterController($scope, $element, $filter, myService,$timeout);
    }
    if (IsFunctionDefined('app.RetailClientStoreMappingController')) {
        app.RetailClientStoreMappingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.RetailIndustryMappingController')) {
        app.RetailIndustryMappingController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LCDashboard')) {
        app.LCDashboard($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.LicenseCommonComplianceController')) {
        app.LicenseCommonComplianceController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.VendorDashboardcontroller')) {
        app.VendorDashboardcontroller($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.Sacretrialcompliancecontroller')) {
        app.Sacretrialcompliancecontroller($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.WithoutInvoiceController')) {
        app.WithoutInvoiceController($scope, $element, $filter, myService, $http, $sce);
    }
    if (IsFunctionDefined('app.NewEmployeeController')) {
        app.NewEmployeeController($scope, $element, $filter, myService, $http,$timeout);
    }

    if (IsFunctionDefined('app.NewVendorRegistrationController')) {
        app.NewVendorRegistrationController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.DeclarationController')) {
        app.DeclarationController($scope, $element, $filter, $sce, myService);
    }

    if (IsFunctionDefined('app.TransportController')) {
        app.TransportController($scope, $element, $filter, myService, $http, $timeout);
    }

    if (IsFunctionDefined('app.AddAuditContractorComplianceController')) {
        app.AddAuditContractorComplianceController($scope, $element, $filter, myService, $http, $compile, $timeout);
    }
    if (IsFunctionDefined('app.PrincipleEmployerCodeController')) {
        app.PrincipleEmployerCodeController($scope, $element, $filter, myService, $http, $compile, $timeout);
    }
	
	 if (IsFunctionDefined('app.WorkerRegistrationController')) {
        app.WorkerRegistrationController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.WorkerDashboardController')) {
        app.WorkerDashboardController($scope, $element, $filter, myService);
    }
    if (IsFunctionDefined('app.ContractorDashboardController')) {
        app.ContractorDashboardController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.ContractorRegistrationController')) {
        app.ContractorRegistrationController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.RozgarController')) {
        app.RozgarController($scope, $element, $filter, myService, $http);
    }
	 if (IsFunctionDefined('app.ReleaseWorkerController')) {
        app.ReleaseWorkerController($scope, $element, $filter, myService, $http, $timeout);
    }
    if (IsFunctionDefined('app.ContractorGatePassController')) {
        app.ContractorGatePassController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.GrivancesController')) {
        app.GrivancesController($scope, $element, $filter, myService);
    }
	 if (IsFunctionDefined('app.SkillController')) {
        app.SkillController($scope, $element, $filter, myService,$http);
    }
	
    if (IsFunctionDefined('app.ContractorSiteOverviewController')) {
        app.ContractorSiteOverviewController($scope, $element, $filter, myService);
    }
	
    if (IsFunctionDefined('app.LicenseController')) {
        app.LicenseController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.LWFController')) {
        app.LWFController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.ProfessionalTaxController')) {
        app.ProfessionalTaxController($scope, $element, $filter, myService);
    }

    if (IsFunctionDefined('app.MinimumWagesController')) {
        app.MinimumWagesController($scope, $element, $filter, myService);
    }
})

function IsFunctionDefined(functionName) {
    if (eval("typeof(" + functionName + ") == typeof(Function)")) {
        return true;
    }

}






