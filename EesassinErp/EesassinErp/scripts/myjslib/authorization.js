app.Authorization = function ($scope, $element, $interval, myService) {
    $scope.visibleAdd = true;
    $scope.visibleSearch = true;
    $scope.visibleDelete = true;
    $scope.visiblePrint = true;
    $scope.visibleClear = true; 
   


    $scope.ArrowMove = function (id) {
        if (id == null)
            id = '#collapseinputbox';

        var focusableEls = $(id).find('a:visible, button:visible, textarea:visible, select:visible, input:visible')
        var flag = true;
        $.each(focusableEls, function (index, elem) {
            elem.addEventListener('keydown', function (e) {
                //UP Arrow--->Move Prev as like Shift+Tab keypress

                if (e.keyCode == "38") {
                    if (index == 0) {
                        for (var i = focusableEls.length; i > 0; i--) {
                            if (!$(focusableEls[i - 1]).attr('disabled')) {
                                if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                    focusableEls[i - 1].focus();
                                    checkfocus();
                                }
                                e.preventDefault();
                                return;
                            }
                            e.preventDefault();
                        }
                    }
                    else {
                        for (var i = index; i > 0; i--) {
                            if (!$(focusableEls[i - 1]).attr('disabled')) {
                                if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                    focusableEls[i - 1].focus();
                                    checkfocus();
                                }
                                e.preventDefault();
                                return;
                            }
                            e.preventDefault();
                        }
                    }
                    e.preventDefault();
                }
                if (e.keyCode == "40") {
                    //Down Arrow--->Move Next as like Tab keypress
                    if (index == focusableEls.length - 1) {
                        for (var i = -1; i < focusableEls.length; i++) {
                            if (!$(focusableEls[i + 1]).attr('disabled')) {
                                if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                    focusableEls[i + 1].focus();
                                    checkfocus();
                                }
                                e.preventDefault();
                                return;
                            }
                            e.preventDefault();
                        }
                    }
                    else {
                        for (var i = index; i < focusableEls.length; i++) {
                            if (!$(focusableEls[i + 1]).attr('disabled')) {
                                if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                    focusableEls[i + 1].focus();
                                    checkfocus();
                                }
                                e.preventDefault();
                                return;
                            }
                            e.preventDefault();
                        }
                    }
                    e.preventDefault();
                }

            });
        });
        function checkfocus() {
            //if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {

                debugger;
                $("input[type=checkbox]").focus(function () {
                    $(this).closest(".check-box").find("label").addClass('FocusCheckBox');

                });
                $("input[type=checkbox]").focusout(function () {
                    $(this).closest(".check-box").find("label").removeClass('FocusCheckBox');

                });
                $('input[type=checkbox]').change(function () {
                    if (!$(this).is(':checked')) {

                        $(this).closest(".check-box").find("label").removeClass('FocusCheckBoxChecked');
                    }
                    else {

                        $(this).closest(".check-box").find("label").addClass('FocusCheckBoxChecked');
                    }
                });
                $("input[type=radio]").focus(function () {
                    $(this).closest(".radio-box").find("label").addClass('FocusRadioBox');

                });
                $("input[type=radio]").focusout(function () {
                    $(this).closest(".radio-box").find("label").removeClass('FocusRadioBox');

                });
            //}
        }
    }

    $scope.ArrowMoveWithOutFirstFocus = function (id) {
        var focusableEls = $(id).find('a:visible, button:visible, textarea:visible, select:visible, input:visible')
        //var flag = true;
        $.each(focusableEls, function (index, elem) {

            //if (flag)
            //    if (!$(focusableEls[index]).attr('disabled')) {
            //        focusableEls[index].focus();
            //        flag = false;
            //    }
            //if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                elem.addEventListener('keydown', function (e) {
                    //UP Arrow--->Move Prev as like Shift+Tab keypress
                    if (e.keyCode == "38") {
                        if (index == 0) {
                            for (var i = focusableEls.length; i > 0; i--) {
                                if (!$(focusableEls[i - 1]).attr('disabled')) {
                                    if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                        focusableEls[i - 1].focus();
                                        checkfocus();
                                    }
                                    e.preventDefault();
                                    return;
                                }
                                e.preventDefault();
                            }
                        }
                        else {
                            for (var i = index; i > 0; i--) {
                                if (!$(focusableEls[i - 1]).attr('disabled')) {
                                    if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                        focusableEls[i - 1].focus();
                                        checkfocus();
                                    }
                                    e.preventDefault();
                                    return;
                                }
                                e.preventDefault();
                            }
                        }
                        e.preventDefault();
                    }
                    if (e.keyCode == "40") {
                        //Down Arrow--->Move Next as like Tab keypress
                        if (index == focusableEls.length - 1) {
                            for (var i = -1; i < focusableEls.length; i++) {
                                if (!$(focusableEls[i + 1]).attr('disabled')) {
                                    if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                        focusableEls[i + 1].focus();
                                        checkfocus();
                                    }
                                    e.preventDefault();
                                    return;
                                }
                                e.preventDefault();
                            }
                        }
                        else {
                            for (var i = index; i < focusableEls.length; i++) {
                                if (!$(focusableEls[i + 1]).attr('disabled')) {
                                    if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {
                                        focusableEls[i + 1].focus();
                                        checkfocus();
                                    }
                                    e.preventDefault();
                                    return;
                                }
                                e.preventDefault();
                            }
                        }
                        e.preventDefault();
                    }

                });

            //}
        });
        function checkfocus() {
 
         
            //if ($scope.move == true || typeof ($scope.move) == 'undefined' || $scope.move == null) {

                debugger;
                $("input[type=checkbox]").focus(function () {
                    $(this).closest(".check-box").find("label").addClass('FocusCheckBox');

                });
                $("input[type=checkbox]").focusout(function () {
                    $(this).closest(".check-box").find("label").removeClass('FocusCheckBox');

                });
                $('input[type=checkbox]').change(function () {
                    if (!$(this).is(':checked')) {

                        $(this).closest(".check-box").find("label").removeClass('FocusCheckBoxChecked');
                    }
                    else {

                        $(this).closest(".check-box").find("label").addClass('FocusCheckBoxChecked');
                    }
                });
                $("input[type=radio]").focus(function () {
                    $(this).closest(".radio-box").find("label").addClass('FocusRadioBox');

                });
                $("input[type=radio]").focusout(function () {
                    $(this).closest(".radio-box").find("label").removeClass('FocusRadioBox');

                });
            //}
        }
    }

    $scope.dbClick = function () {
        
        $scope.disableAdd=$scope.disableEdit;
        if ($scope.disableDeleted === true) {
            $scope.startForDelete();
        }
        $scope.disablePrint = $scope.disablePrinted;
        $scope.$apply();
    };
    //  $scope.UrlAccessPermission = function (MenuId) {
        
    //    $scope.collectionobj = {};
    //    $scope.collectionobj["LoginId"] = JSON.parse(LoginId);
    //    $scope.collectionobj["BranchCode"] = BranchCode; 
    //    $scope.collectionobj["MenuId"] =  MenuId;
    //    if (loginType == 2) {
    //        $scope.disableAdd = false;
    //        $scope.disableEdit = false;
    //        $scope.disableDelete = true;
    //        $scope.disablePrint = true;
    //        $scope.disableClear = false;

    //        $scope.IsAdd = true;
    //        $scope.IsEdit = true;
    //        $scope.IsDelete = true;
    //        $scope.IsPrint = true;
    //        return;
    //    }
        
    //    var getData = myService.methode('POST', '../Login/UrlAccessPermission', '{obj:' + JSON.stringify($scope.collectionobj) + '}');
    //    getData.then(function (response) {
    //        debugger;
    //        if (response.data.Result.length >0)
    //        {
    //            if (loginType == 1) {
    //                $scope.disableAdd = false;
    //                $scope.disableEdit = false;
    //                $scope.disableDelete = true;
    //                $scope.disablePrint = true;
    //                $scope.disableClear = false;

    //                $scope.IsAdd = true;
    //                $scope.IsEdit = true;
    //                $scope.IsDelete = true;
    //                $scope.IsPrint = true;
    //                $scope.visibleAdd = true;
    //                $scope.visibleSearch = true;
    //                $scope.visibleDelete = true;
    //                $scope.visiblePrint = true;
    //                $scope.visibleClear = true;
    //                return;
    //            }


    //            $scope.IsAdd = response.data.Result[0].IsAdd;
    //            $scope.IsEdit = response.data.Result[0].IsEdit;
    //            $scope.IsDelete = response.data.Result[0].IsDelete;
    //            $scope.IsPrint = response.data.Result[0].IsPrint;



    //            if ($scope.IsAdd === true) {
    //                $scope.disableAdd = false;
    //             //   $scope.visibleAdd = true;
    //                $scope.disableClear = false;
                 

    //            } else {
    //                $scope.disableAdd = true;
    //                $scope.disableClear = true;
    //                $('#btnSave').attr('disabled', 'disabled');
    //            }

    //            if ($scope.IsEdit === true) {
    //                $scope.disableEdit = false;
    //            //    $scope.visibleAdd = true;
                  
    //                $scope.disableClear = false;
    //            } else {
    //                $scope.disableEdit = true;
    //                $scope.disableClear = true;
    //                $('#btnSave').attr('disabled', 'disabled');
    //            }

    //            if ($scope.IsDelete === true) {
    //                $scope.disableDelete = false;
    //           //     $scope.visibleDelete = true;
                 
    //            } else {
    //                $scope.disableDelete = true;
    //                $('#btnDelete').attr('disabled', 'disabled');
    //            }

    //            if ($scope.IsPrint === true) {
    //                $scope.disablePrint = false;
    //              //  $scope.visiblePrint = true;
               
    //            } else {
    //                $scope.disablePrint = true;
    //                $('#btnPrint').attr('disabled', 'disabled');
    //            }

    //            if ($scope.IsPrint === false) {
    //                $scope.disableSearch = true;
    //            }
    //            else {
    //                $scope.disableSearch = false;
    //                $('#btnSearch').attr('disabled', 'disabled');
    //            }
    //            $scope.$applyAsync();
    //        }
     
    //        $scope.$applyAsync();
    //        $scope.ArrowMove();
    //    });
    //}
    //$scope.UrlAccessPermission = function () {
    //    if (loginType == 1)
    //    {
    //        $scope.disableAdd = false;
    //        $scope.disableEdit = false;
    //        $scope.disableDelete = true;
    //        $scope.disablePrint = true;
    //        $scope.disableClear = false;

    //        $scope.IsAdd = true;
    //        $scope.IsEdit = true;
    //        $scope.IsDelete = true;
    //        $scope.IsPrint = true;
    //        return;
    //    }
       
    //    $scope.IsAllow = true;
    //    $scope.IsAdd = false;
    //    $scope.IsEdit = false;
    //    $scope.IsDelete = false;
    //    $scope.IsPrint = false;

    //    $scope.disableAdd = true;
    //    $scope.disableEdit = true;
    //    $scope.disableDelete = true;
    //    $scope.disableDeleted = true;
    //    $scope.disablePrint = true;
    //    $scope.disablePrinted = true;
    //    $scope.disableClear = false;
    //    $scope.disableSearch = true;
         
        
    //    $scope.collectionobj = {};
    //    $scope.collectionobj["LoginId"] = JSON.parse(LoginId); 
    //    $scope.collectionobj["BranchCode"] = BranchCode;
       
        
    //    var getData = myService.methode('POST', '../Login/UrlAccessPermission', '{obj:' + JSON.stringify($scope.collectionobj) + '}');
    //    getData.then(function (response) {
    //        debugger;
    //        try{
    //            $scope.IsAllow = response.data.Result[0].IsAllow;
    //            $scope.IsAdd = response.data.Result[0].IsAdd;
    //            $scope.IsEdit = response.data.Result[0].IsEdit;
    //            $scope.IsDelete = response.data.Result[0].IsDelete;
    //            $scope.IsPrint = response.data.Result[0].IsPrint;
             
    //            if ($scope.IsAdd === true) {
    //                $scope.disableAdd = false;
    //            } else {
    //                $scope.disableAdd = true;
    //            }

    //            if ($scope.IsEdit === true) {
    //                $scope.disableEdit = false;
    //            } else {
    //                $scope.disableEdit = true;
    //            }

    //            if ($scope.IsDelete === true) {
    //                $scope.disableDeleted = false;
    //            } else {
    //                $scope.disableDeleted = true;
    //            }

    //            if ($scope.IsPrint === true) {
    //                $scope.disablePrinted = false;
    //            } else {
    //                $scope.disablePrinted = true;
    //            }

    //            if ($scope.IsEdit === false && $scope.IsDelete === false && $scope.IsPrint === false) {
    //                $scope.disableSearch = true;
    //            }
    //            else {
    //                $scope.disableSearch = false;
    //            }

    //            $scope.ArrowMove();
    //        }
    //        catch(err)
    //        {
    //            $scope.disableAdd = true;
    //            $scope.disableEdit = true;
    //            $scope.disableDelete = true;
    //            $scope.disablePrint = true;
    //            $scope.disableSearch = true;

    //            console.log(err);
    //            console.log('Authorization');
    //        }
           
    //    });
    //}

    //$scope.UrlAccessPermission();

    //$scope.$watch('IsAllow', function () {
        
    //    if (typeof ($scope.IsAllow) === 'undefined') return;
    //    if ($scope.IsAllow===false)
    //    window.top.location.href = '../Login/Login';
    //})

    $scope.CheckSavePermission = function () {       
        if ($scope.disableAdd === true) {
            window.top.location.href = '../Login/Login';
            e.preventDefault();
            return false;
        }
    };

    $scope.CheckDeletePermission = function () {
        if ($scope.disableDeleted === true) {
            window.top.location.href = '../Login/Login';
            e.preventDefault();
            return false;
        }
    };

    $scope.CheckPrintPermission = function () {
        if ($scope.disablePrint === true) {
            window.top.location.href = '../Login/Login';
            e.preventDefault();
            return false;
        }
    };

    $scope.CheckSearchPermission = function () {
        if ($scope.disableSearch === true) {
            window.top.location.href = '/Login/Login';
            e.preventDefault();
            return false;
        }
    };

    $scope.ClearOk = function () {
        
        //if ($scope.IsAdd === true) {
        //    $scope.disableAdd = false;
        //} else {
        //    $scope.disableAdd = true;
        //}

        //if ($scope.IsEdit === true) {
        //    $scope.disableEdit = false;
        //} else {
        //    $scope.disableEdit = true;
        //}

        //if ($scope.IsDelete === true) {
        //    $scope.disableDeleted = false;
        //} else {
        //    $scope.disableDeleted = true;
        //}

        //if ($scope.IsPrint === true) {
        //    $scope.disablePrinted = false;
        //} else {
        //    $scope.disablePrinted = true;
        //}

        //if ($scope.IsEdit === false && $scope.IsDelete === false && $scope.IsPrint === false) {
        //    $scope.disableSearch = true;
        //}
        //else {
        //    $scope.disableSearch = false;
        //}
        //$scope.UrlAccessPermission();
        $scope.$applyAsync();
    };
 
    $scope.startForDelete = function () {
        //$interval(function () {
        //    $('#btnDelete').prop('disabled',$scope.disableDeleted);
        //    $scope.disableDelete = $scope.disableDeleted;
        //    if ($('#btnDelete').prop('disabled'))
        //    { $interval.cancel($scope.startForDelete); }
        //}, 100);
    };
}
 