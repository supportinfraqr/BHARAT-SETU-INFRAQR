 
var LoginId = sessionStorage.getItem("LoginId");
var MapId = sessionStorage.getItem("MapId");
var MapUser = sessionStorage.getItem("MapUser");
var BranchCode = sessionStorage.getItem("BranchCode");
var loginType = sessionStorage.getItem("loginType");
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


            var SCS_ViewFlag = sessionStorage.getItem("SCS_ViewFlag");
            var SCS_AllowEditFlag = sessionStorage.getItem("SCS_AllowEditFlag");
            var SCS_EditFlag = sessionStorage.getItem("SCS_EditFlag");
            var SCS_DeleteFlag = sessionStorage.getItem("SCS_DeleteFlag");
            var SCS_UploadFlag = sessionStorage.getItem("SCS_UploadFlag");
            var SCS_DownloadFlag = sessionStorage.getItem("SCS_DownloadFlag");

            var LR_ViewFlag = sessionStorage.getItem("LR_ViewFlag");
            var SM_ViewFlag = sessionStorage.getItem("SM_ViewFlag");

            var SM_EditFlag = sessionStorage.getItem("SM_EditFlag");
            var SM_DeleteFlag = sessionStorage.getItem("SM_DeleteFlag");
            var SM_UploadFlag = sessionStorage.getItem("SM_UploadFlag");
            var SM_DownloadFlag = sessionStorage.getItem("SM_DownloadFlag");
            var SM_VerifyFlag = sessionStorage.getItem("SM_VerifyFlag");
            var SM_NewStoreFlag = sessionStorage.getItem("SM_NewStoreFlag");

            var CD_ViewFlag = sessionStorage.getItem("CD_ViewFlag");
            var CD_EditFlag = sessionStorage.getItem("CD_EditFlag");
            var CD_DeleteFlag = sessionStorage.getItem("CD_DeleteFlag");
            var CD_UploadFlag = sessionStorage.getItem("CD_UploadFlag");
            var CD_DownloadFlag = sessionStorage.getItem("CD_DownloadFlag");
            var CD_DownloadFlag = sessionStorage.getItem("CD_DownloadFlag");
            var CD_VerifyFlag = sessionStorage.getItem("CD_VerifyFlag");

            var LM_ViewFlag = sessionStorage.getItem("LM_ViewFlag");
            var LM_EditFlag = sessionStorage.getItem("LM_EditFlag");
            var LM_DeleteFlag = sessionStorage.getItem("LM_DeleteFlag");
            var LM_UploadFlag = sessionStorage.getItem("LM_UploadFlag");
            var LM_DownloadFlag = sessionStorage.getItem("LM_DownloadFlag");
            var LM_VerifyFlag = sessionStorage.getItem("LM_VerifyFlag");


            var EM_ViewFlag = sessionStorage.getItem("EM_ViewFlag");
            var EM_EditFlag = sessionStorage.getItem("EM_EditFlag");

            var EM_DeleteFlag = sessionStorage.getItem("EM_DeleteFlag");
            var EM_UploadFlag = sessionStorage.getItem("EM_UploadFlag");
            var EM_DownloadFlag = sessionStorage.getItem("EM_DownloadFlag");
            var EM_VerifyFlag = sessionStorage.getItem("EM_VerifyFlag");

            var NI_ViewFlag = sessionStorage.getItem("NI_ViewFlag");
            var SMF_ViewFlag = sessionStorage.getItem("SMF_ViewFlag");
            var SMF_EditFlag = sessionStorage.getItem("SMF_EditFlag");

            var LD_ViewFlag = sessionStorage.getItem("LD_ViewFlag");
            var SMD_ViewFlag = sessionStorage.getItem("SMD_ViewFlag"); 
            var NL_ViewFlag = sessionStorage.getItem("NL_ViewFlag");
            var LSD_Flag = sessionStorage.getItem("LSD_Flag");

            var COBD_Flag = sessionStorage.getItem("COBD_Flag");
            var COMD_Flag = sessionStorage.getItem("COMD_Flag");
              var STAT_Flag = sessionStorage.getItem("STAT_Flag");

 
 
var AuditorId = '';
var VendorId = '';
var Totalupoad = 0;
//var APIURLPath = "https://api.testeesassin.online/api/";//ezcompliance
var APIURLPath = "https://testeesassin.co.in/api/"; //testessain

if (LoginId == "-1" || LoginId == null || LoginId == "" || LoginId == "null") {
  
    window.top.location.href = '../Login/Login';
}
if (BranchCode == "-1" || BranchCode == null || BranchCode == "" || BranchCode == "null") {
   
    window.top.location.href = '../Login/Login';
}
if (loginType == "-1" || loginType == null || loginType == "" || loginType == "null") {

    window.top.location.href = '../Login/Login';
}

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
  }])

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

    if (SCS_ViewFlag == 'true') { SCS_ViewFlag = 1 } else { SCS_ViewFlag = 0 }
    if (SCS_AllowEditFlag == 'true') { SCS_AllowEditFlag = 1 } else { SCS_AllowEditFlag = 0 }
    if (SCS_EditFlag == 'true') { SCS_EditFlag = 1 } else { SCS_EditFlag = 0 }
    if (SCS_DeleteFlag == 'true') { SCS_DeleteFlag = 1 } else { SCS_DeleteFlag = 0 }
    if (SCS_UploadFlag == 'true') { SCS_UploadFlag = 1 } else { SCS_UploadFlag = 0 }
    if (SCS_DownloadFlag == 'true') { SCS_DownloadFlag = 1 } else { SCS_DownloadFlag = 0 }  
    if (LR_ViewFlag == 'true') { LR_ViewFlag = 1 } else { LR_ViewFlag = 0 }
    if (SM_ViewFlag == 'true') { SM_ViewFlag = 1 } else { SM_ViewFlag = 0 }
    if (SM_EditFlag == 'true') { SM_EditFlag = 1 } else { SM_EditFlag = 0 }
    if (SM_DeleteFlag == 'true') { SM_DeleteFlag = 1 } else { SM_DeleteFlag = 0 }
    if (SM_UploadFlag == 'true') { SM_UploadFlag = 1 } else { SM_UploadFlag = 0 }
    if (SM_VerifyFlag == 'true') { SM_VerifyFlag = 1 } else { SM_VerifyFlag = 0 }
    if (SM_NewStoreFlag == 'true') { SM_NewStoreFlag = 1 } else { SM_NewStoreFlag = 0 } 
    if (CD_ViewFlag == 'true') { CD_ViewFlag = 1 } else { CD_ViewFlag = 0 }
    if (CD_EditFlag == 'true') { CD_EditFlag = 1 } else { CD_EditFlag = 0 }
    if (CD_DeleteFlag == 'true') { CD_DeleteFlag = 1 } else { CD_DeleteFlag = 0 }
    if (CD_UploadFlag == 'true') { CD_UploadFlag = 1 } else { CD_UploadFlag = 0 }
    if (CD_DownloadFlag == 'true') { CD_DownloadFlag = 1 } else { CD_DownloadFlag = 0 }
    if (CD_VerifyFlag == 'true') { CD_VerifyFlag = 1 } else { CD_VerifyFlag = 0 } 
    if (LM_ViewFlag == 'true') { LM_ViewFlag = 1 } else { LM_ViewFlag = 0 }
    if (LM_EditFlag == 'true') { LM_EditFlag = 1 } else { LM_EditFlag = 0 }
    if (LM_DeleteFlag == 'true') { LM_DeleteFlag = 1 } else { LM_DeleteFlag = 0 }
    if (LM_UploadFlag == 'true') { LM_UploadFlag = 1 } else { LM_UploadFlag = 0 }
    if (LM_DownloadFlag == 'true') { LM_DownloadFlag = 1 } else { LM_DownloadFlag = 0 }
    if (LM_VerifyFlag == 'true') { LM_VerifyFlag = 1 } else { LM_VerifyFlag = 0 } 
    if (EM_ViewFlag == 'true') { EM_ViewFlag = 1 } else { EM_ViewFlag = 0 }
    if (EM_EditFlag == 'true') { EM_EditFlag = 1 } else { EM_EditFlag = 0 }
    if (EM_DeleteFlag == 'true') { EM_DeleteFlag = 1 } else { EM_DeleteFlag = 0 }
    if (EM_UploadFlag == 'true') { EM_UploadFlag = 1 } else { EM_UploadFlag = 0 }
    if (EM_DownloadFlag == 'true') { EM_DownloadFlag = 1 } else { EM_DownloadFlag = 0 }
    if (EM_VerifyFlag == 'true') { EM_VerifyFlag = 1 } else { EM_VerifyFlag = 0 }
    if (NI_ViewFlag == 'true') { NI_ViewFlag = 1 } else { NI_ViewFlag = 0 } 
    if (SMF_ViewFlag == 'true') { SMF_ViewFlag = 1 } else { SMF_ViewFlag = 0 }
    if (SMF_EditFlag == 'true') { SMF_EditFlag = 1 } else { SMF_EditFlag = 0 }
    if (LD_ViewFlag == 'true') { LD_ViewFlag = 1 } else { LD_ViewFlag = 0 }
    if (SMD_ViewFlag == 'true') { SMD_ViewFlag = 1 } else { SMD_ViewFlag = 0 } 
    if (NL_ViewFlag == 'true') { NL_ViewFlag = 1 } else { NL_ViewFlag = 0 }
    if (LSD_Flag == 'true') { LSD_Flag = 1 } else { LSD_Flag = 0 } 
    if (COBD_Flag == 'true') { COBD_Flag = 1 } else { COBD_Flag = 0 }
    if (COMD_Flag == 'true') { COMD_Flag = 1 } else { COMD_Flag = 0 }
    if (STAT_Flag == 'true') { STAT_Flag = 1 } else { STAT_Flag = 0 } 
    $scope.SCS_ViewFlag = SCS_ViewFlag;
    $scope.SCS_AllowEditFlag = SCS_AllowEditFlag;
    $scope.SCS_EditFlag = SCS_EditFlag;
    $scope.SCS_DeleteFlag = SCS_DeleteFlag;
    $scope.SCS_UploadFlag = SCS_UploadFlag;
    $scope.SCS_DownloadFlag = SCS_DownloadFlag;
    $scope.LR_ViewFlag = LR_ViewFlag;
    $scope.SM_ViewFlag = SM_ViewFlag;
    $scope.SM_EditFlag = SM_EditFlag;
    $scope.SM_DeleteFlag = SM_DeleteFlag;
    $scope.SM_UploadFlag = SM_UploadFlag;
    $scope.SM_DownloadFlag = SM_DownloadFlag;
    $scope.SM_VerifyFlag = SM_VerifyFlag;
    $scope.SM_NewStoreFlag = SM_NewStoreFlag;
    $scope.CD_ViewFlag = CD_ViewFlag;
    $scope.CD_EditFlag = CD_EditFlag;
    $scope.CD_DeleteFlag = CD_DeleteFlag;
    $scope.CD_UploadFlag = CD_UploadFlag;
    $scope.CD_DownloadFlag = CD_DownloadFlag; 
    $scope.CD_VerifyFlag = CD_VerifyFlag;
    $scope.LM_ViewFlag = LM_ViewFlag;
    $scope.LM_EditFlag = LM_EditFlag;
    $scope.LM_DeleteFlag = LM_DeleteFlag;
    $scope.LM_UploadFlag = LM_UploadFlag;
    $scope.LM_DownloadFlag = LM_DownloadFlag;
    $scope.LM_VerifyFlag = LM_VerifyFlag;
    $scope.EM_ViewFlag = EM_ViewFlag;
    $scope.EM_EditFlag = EM_EditFlag;
    $scope.EM_DeleteFlag = EM_DeleteFlag;
    $scope.EM_UploadFlag = EM_UploadFlag;
    $scope.EM_DownloadFlag = EM_DownloadFlag;
    $scope.EM_VerifyFlag = EM_VerifyFlag;
    $scope.NI_ViewFlag = NI_ViewFlag;
    $scope.SMF_ViewFlag = SMF_ViewFlag;
    $scope.SMF_EditFlag = SMF_EditFlag;
    $scope.LD_ViewFlag = LD_ViewFlag;
    $scope.SMD_ViewFlag = SMD_ViewFlag; 
    $scope.NL_ViewFlag = NL_ViewFlag;
    $scope.LSD_Flag = LSD_Flag; 
    $scope.COBD_Flag = COBD_Flag;
    $scope.COMD_Flag = COMD_Flag;
    $scope.STAT_Flag = STAT_Flag; 
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
     
    $scope.cancelRedirect = function () {
        $('#countdownModal').modal('hide'); // Hide the modal
    }; 
    if ($scope.Photo=="null")
    {
        $scope.Photo = '../content/profile.png';
    }
    $scope.BranchAddress = BranchAddress;
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
    else {
        $scope.url = '../DashBoard/AuditorDashboard'
    }







    if (loginType != '1') {
        var collectionobj = {};
        collectionobj.Action = 12;
        collectionobj.UserId = MapId;

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

    var collectionobj = {};
    collectionobj.Action = 19;
    collectionobj.LoginId = LoginId;
    var getData = myService.methode('POST', ("../Login/GetModulePermission"), JSON.stringify(collectionobj));
    getData.then(function (response)
    {
        if (response.data.Result.length > 0)
        {
            if ($scope.SessionId != response.data.Result[0].SessionId) {
                showMsgBox('999', 'Alert', 'Multiple logins detected. Please log in again.', 'warning', 'btn-warning');
                setTimeout(function () {
                    window.top.location.href = '../Login/Login';
                }, 1500); 
            } 
        }
        else { window.top.location.href = '../Login/Login';}
    }); 
    $scope.alert = function (msg) {
        console.log(msg);
    } 
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
        window.location.href = '../RetailSection/Dashboard'
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

        collectionobj.BranchCode = BranchCode;
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

        sessionStorage.removeItem("SCS_ViewFlag");
        sessionStorage.removeItem("SCS_AllowEditFlag");
        sessionStorage.removeItem("SCS_EditFlag");
        sessionStorage.removeItem("SCS_DeleteFlag");
        sessionStorage.removeItem("SCS_UploadFlag");
        sessionStorage.removeItem("SCS_DownloadFlag");

        sessionStorage.removeItem("LR_ViewFlag");
        sessionStorage.removeItem("SM_ViewFlag");
        sessionStorage.removeItem("SM_EditFlag");
        sessionStorage.removeItem("SM_DeleteFlag");
        sessionStorage.removeItem("SM_UploadFlag");
        sessionStorage.removeItem("SM_VerifyFlag");
        sessionStorage.removeItem("SM_NewStoreFlag");

        sessionStorage.removeItem("CD_ViewFlag");
        sessionStorage.removeItem("CD_EditFlag");
        sessionStorage.removeItem("CD_DeleteFlag");
        sessionStorage.removeItem("CD_UploadFlag");
        sessionStorage.removeItem("CD_DownloadFlag");
        sessionStorage.removeItem("CD_VerifyFlag");


        sessionStorage.removeItem("LM_ViewFlag");
        sessionStorage.removeItem("LM_EditFlag");
        sessionStorage.removeItem("LM_DeleteFlag");
        sessionStorage.removeItem("LM_UploadFlag");
        sessionStorage.removeItem("LM_DownloadFlag");
        sessionStorage.removeItem("LM_VerifyFlag");

        sessionStorage.removeItem("EM_ViewFlag");
        sessionStorage.removeItem("EM_EditFlag");
        sessionStorage.removeItem("EM_UploadFlag");
        sessionStorage.removeItem("EM_DeleteFlag");
        sessionStorage.removeItem("LM_DownloadFlag");
        sessionStorage.removeItem("EM_DownloadFlag");
        sessionStorage.removeItem("EM_VerifyFlag");
        sessionStorage.removeItem("NI_ViewFlag");


        sessionStorage.removeItem("SMF_ViewFlag");
        sessionStorage.removeItem("SMF_EditFlag");
        sessionStorage.removeItem("LD_ViewFlag");
        sessionStorage.removeItem("NL_ViewFlag");
        sessionStorage.removeItem("LSD_Flag");
        sessionStorage.removeItem('COBD_Flag');
        sessionStorage.removeItem('COMD_Flag');
        sessionStorage.removeItem('STAT_Flag');


        $scope.ManageLog('Logout');
        var collectionobj = {};
        collectionobj.Action = 17;
        collectionobj.LoginId = $scope.LoginId;
        var getData = myService.methode('POST', ("../Login/GetModulePermission"), JSON.stringify(collectionobj));
        getData.then(function (response)
        {
            window.top.location.href = '../Login/Login';
        });
        


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
                window.location.href = '../RetailSection/Dashboard';
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

    $scope.SetTextbox = function (SINVOICENO, ClientId) {
        $scope.InvoiceNo = SINVOICENO;
        $scope.ClientId = ClientId;
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
        var collectionobj = {};
        collectionobj.Action = Action;
        collectionobj.ClientId = ClientId;
        collectionobj.Id = Id;
        var getData = myService.methode('POST', "../SendEmail/SendEmail", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

        });
    }

    $scope.FireEmailForNewsletter = function (collectionobj) {
        var getData = myService.methode('POST', "../SendEmail/SendEmailForNewsletter", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

        });
    }


    $scope.ManageLog = function (Activity) {
        var collectionobj = {};
        collectionobj.Action = 3;
        collectionobj.ClientId = $scope.LoginId;
        collectionobj.Activity = Activity;
        var getData = myService.methode('POST', "../RetailSection/MaintainLog", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {

        });
    }

    $scope.Limit = function () {
        var collectionobj = {};
        collectionobj.ActionType = 14;
        collectionobj.Id = MapId
        var getData = myService.methode('POST', "../RetailSection/GetStoreMaster", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.LeftStore = response.data.Result[0].LeftStore;
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
    $scope.BindDashBoardInvoice = function () {
        var collectionobj = {};
        collectionobj.ActionType = 5;
        collectionobj.CreatedBy = MapId;
        var getData = myService.methode('POST', "../VenInvoice/GetVenInvoiceListDT", '{obj:' + JSON.stringify(collectionobj) + '}');
        getData.then(function (response) {
            $scope.ComplianceDashBoardInvoice = response.data;
        });
    }
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
            showMsgBox('999', 'Alert', 'Confirm Current Password Not Valid', 'warning', 'btn-warning')
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
    $scope.VCount = function (str) {
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
    $scope.checkandgetreport = function () {
        if (isValidate()) {
            var collectionobj = {};
            collectionobj.Action = 10;
            collectionobj.InvoiceNo = $scope.InvoiceNo;
            collectionobj.Id = $scope.ClientId;
            var getData = myService.methode('POST', "../DocumentMaster/GetAuditorCompliance", '{obj:' + JSON.stringify(collectionobj) + '}');
            getData.then(function (response) {

                if (response.data[0].MSG != '1') {
                    showMsgBox('999', 'warning', response.data[0].MSG, 'warning', 'btn-warning')
                }
                else {
                    $scope.SelectIframoutiframe('PrintComplianceReport', 'ComplianceReport', $scope.InvoiceNo + '|' + $scope.ClientId, 'ComplianceReport');
                }


            });
        }
    };
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
        app.VendorInvoiceController($scope, $element, $filter, myService);
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
        app.LicenseRequestMasterController($scope, $element, $filter, myService);
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
        app.StatutoryController($scope, $element, $filter, myService, $http);
    }
    if (IsFunctionDefined('app.ComplianceDashboardController')) {
        app.ComplianceDashboardController($scope, $element, $filter, myService, $http);
    }
    
})

function IsFunctionDefined(functionName) {
    if (eval("typeof(" + functionName + ") == typeof(Function)")) {
        return true;
    }
}






