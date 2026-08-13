

 

$(document).ready(function () {
    $(document).bind("contextmenu", function (e) {
        return false;
    });
});

var startdate = new Date();
var enddate = new Date();


Array.prototype.sum = function (prop) {

    var total = 0
    for (var i = 0, _len = this.length; i < _len; i++) {
        if (!isNaN(Number(this[i][prop]))) {
            total += Number(this[i][prop])
        }
    }
    return total.toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


$(document).click(function (e) {

    if ($(e.target).closest('#popupdivID').length != 0) return false;
    $('#popupdivID').hide();
});
//$(".mypicker").datepicker({
//       changeYear: true,
//       dateFormat: 'yy-mm-dd',
//       showButtonPanel: false,
//       changeMonth: true,
//       changeYear: true,
//       showOn: "button",
//       buttonImage: "images/calendar.gif",
//       buttonImageOnly: true,
//       minDate: new Date(startdate),
//       maxDate: new Date(enddate),
//       inline: true
//   });
Array.prototype.concatValueUsingChk = function (param, key, sep) {
    var str = "";
    var seprator = "";
    for (var i = 0, _len = this.length; i < _len; i++) {
        if (this[i][param] == true) {
            str = str + seprator;
            str = str + this[i][key];
            seprator = sep;
        }
    }
    return str;
};

Array.prototype.filterUsingChk = function (param) {
    var list = [];
    for (var i = 0, _len = this.length; i < _len; i++) {
        if (this[i][param] == true) {
            list.push(this[i]);
        }
    }
    return list;
};

Array.prototype.chkUncheckAll = function (param, flag) {
    for (var i = 0, _len = this.length; i < _len; i++) {
        this[i][param] = flag;
    }
    return this;
};

Array.prototype.chkUncheckChk = function (param) {
    var flag = true;
    for (var i = 0, _len = this.length; i < _len; i++) {
        if (this[i][param] == false) {
            flag = false;
            return;
        }
    }
    return flag;
};

function ConvertDateToDateType(date) {
    var m = moment(date).format('YYYY-MM-DD');
    return m;
}
function RConverttoDate(date) {
    var m = moment(date, 'DD-MMM-YYYY');
    if (m.isValid()) {
        return new Date(date);
    }
    else {
        return date;
    }
};


//----------------------Convert Dynamic Point
function ConvertToDecimalDynamicPoint(amount, number) {

    if (amount >= 0 || amount <= 0) {
        return checkNaN(amount).toLocaleString("en", { useGrouping: false, minimumFractionDigits: number, maximumFractionDigits: number });
    }
    else { return amount; }

}
function checkNaN(amount) {
    if (isNaN(amount))
        return 0;
    else
        return Number(amount)
}
//-----------------End
function convertToNumber(val) {
    if (isNaN(Number(val))) {
        return 0;
    }
    else {
        return Number(val);
    }
}

function ValidDate(date) {
    var m = moment(date, 'YYYY-MMM-DD');
    return m.isValid();
};

function ConverttoDate(date) {
    var m = moment(date, 'YYYY-MMM-DD');
    if (m.isValid()) {
        return new Date(date);
    }
    else {
        return date;
    }
};

var comp = "";


 

function SortByNumber(a, b) {
    var value1 = a[comp];
    var value2 = b[comp];
    let comparison = 0;
    if (value1 > value2) {
        comparison = 1;
    } else if (value1 < value2) {
        comparison = -1;
    }
    return comparison;
}


//---Satrt Show Tab---//

function ResetImage(imagenUrl, inputfileid) {
    var drEvent = $(inputfileid).dropify();
    drEvent = drEvent.data('dropify');
    drEvent.resetPreview();
    drEvent.clearElement();
    drEvent.settings.defaultFile = imagenUrl;
    drEvent.destroy();
    drEvent.init();
}

function FileExists(urlToFile) {
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', urlToFile, false);
    xhr.send();

    if (xhr.status == "404") {
        return false;
    }
    else {
        return true;
    }
};

function setScrollPosition(focuselementid, scrollClass) {
    var element = $(focuselementid);
    element.stop().animate({ scrollTop: 0 }, 1000, 'swing', function () {
        if ($(scrollClass) == null || typeof ($(scrollClass)) === 'undefined') {
            $(scrollClass).css("top", "0");
        }
        else {
            $('.slimScrollBar').css("top", "0");
        }
    });
}

function Showtab(id) {
    $('.iframedesign').addClass('iframe-close');
    $('.refresh-box').attr('disabled', true);
    $(id).removeClass('iframe-close');
    $('#btnrefresh' + id.replace('#', '')).removeAttr("disabled");
}

function ReloadBox(id) {
    var frameID = id.replace('#', '');
    var tabID = "#btnrefresh" + frameID;
    $(tabID).addClass('fa-spin');

    document.getElementById(id.replace('#', '')).contentDocument.location.reload(true);

    var interval = setInterval(function () {
        if (document.readyState === 'complete') {
            clearInterval(interval);
            $(tabID).removeClass('fa-spin');
        };
    }, 100);
}
//---End Show Tab---//

//---Satrt Close Tab---//
function FindText(string) {
    if (string == null) return;
    return string.replace(/<(?:.|\n)*?>/gm, '');
}
function FindHtml(string) {
    try {
        if (string == null) return;
        var html = string.replace(string.replace(/<(?:.|\n)*?>/gm, ''), '')
        var val = $(html).val().replace("/", '');
        return $(html).val(val);
    } catch (err) {
        return;
    }
}

function CloseTab(iframid, tabid) {


    $(tabid, document).remove();
    $(iframid, document).remove();

    var tablastli = $('.iframe-wrapper-tab li:last-child').attr("id");
    var tablastlianchor = $('.iframe-wrapper-tab li:last-child a').attr("href");

    $('tablastlianchor').removeClass('active');
    $('#' + tablastli).addClass('active');
    Showtab(tablastlianchor);
}
//---End Close Tab---//

function showMsgBox(response, title, text, type, ButtonClass) {
    var msgbox_class = "";
    var msgbox_icon_class = "";
    var returnflag = true;

    switch (response.replace(/"/g, "")) {
        case "-1": /*Duplicate Record found!*/
            swal({
                title: "Duplicate",
                text: "Sorry, Duplicate Record found!",
                type: "warning",
                confirmButtonClass: 'btn-warning',
                timer: 3000,
            });
            returnflag = false;
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }

            break;
        case "-01": /*Duplicate Record found!*/
            swal({
                title: "Child",
                text: "Sorry, Child Record found!",
                type: "warning",
                confirmButtonClass: 'btn-warning',
                timer: 3000,
            });
            returnflag = false;
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }

            break;
        case "1": /*Submitted successfully*/
            swal({
                title: "Save",
                text: "Submitted successfully.",
                type: "success",
                confirmButtonClass: 'btn-success',
                timer: 3000,
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            try {
                angular.element(document).scope().ClearOk();
            }
            catch (ex) {
                console.log(ex.message);
            }

            break;
        case "2": /*Updated successfully.*/
            swal({
                title: "Update",
                text: "Updated successfully.",
                type: "success",
                confirmButtonClass: 'btn-success',
                timer: 3000,
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            try {
                angular.element(document).scope().ClearOk();
            }
            catch (ex) {
                console.log(ex.message);
            }
            break;
        case "3": /*Deleted successfully.*/
            swal({
                title: "Delete",
                text: "Deleted successfully.",
                type: "success",
                confirmButtonClass: 'btn-success',
                timer: 3000,
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            try {
                angular.element(document).scope().ClearOk();
            }
            catch (ex) {
                console.log(ex.message);
            }
            break;
        case "4": /*Cleare successfully.*/
            swal({
                title: "Clear",
                text: "Fields have been cleared.",
                type: "success",
                confirmButtonClass: 'btn-success',
                timer: 3000,
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            try {
                angular.element(document).scope().ClearOk();
            }
            catch (ex) {
                console.log(ex.message);
            }
            break;
        case "5": /*Auditor Compliance Not Found Message*/
            swal({
                title: "Not Allowed",
                text: "Vendor Query Still Pending",
                type: "warning",
                confirmButtonClass: 'btn-warning',
                timer: 3000,
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            try {
                angular.element(document).scope().ClearOk();
            }
            catch (ex) {
                console.log(ex.message);
            }
            break;
        case "6": /*Deleted successfully.*/
            swal({
                title: "File Approval",
                text: "Uploaded file does not appear to be valid. Do you want to continue?",
                type: "Alert",
                confirmButtonClass: 'btn-success',
                timer: 3000,
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            try {
                angular.element(document).scope().ClearOk();
            }
            catch (ex) {
                console.log(ex.message);
            }
            break;
        case "0":  /*Sorry Record not validate!*/
            swal({
                title: "Validate",
                text: "This is system genrated error! Please contact at helpdesk 0522-4959891,4005977",
                type: "warning",
                confirmButtonClass: 'btn-warning'
            });
            returnflag = false;
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            break;

        case "99999":  /*Cr/Dr  Validation*/
            swal({
                title: "Warning",
                text: "No Ledger selection found.",
                type: "warning",
                confirmButtonClass: 'btn-warning'
            });
            returnflag = false;
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            break;

        case "9999":  /*Cr/Dr  Validation*/
            swal({
                title: "Warning",
                text: "Cr Amount is not equal to Dr Amount.",
                type: "warning",
                confirmButtonClass: 'btn-warning'
            });
            returnflag = false;
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            break; 
        case "999":  /*For Title Change*/
            swal({
                title: title,
                text: text,
                icon: type,
                confirmButtonClass: ButtonClass,
                timer: 3000,
            });
        /*    returnflag = false;*/
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            break;
        default:  /*Sorry Record not validate!*/
            swal({
                title: "Warning",
                text: response.replace(/"/g, ""),
                type: "warning",
                confirmButtonClass: 'btn-warning'
            });
            try { angular.element(document).scope().hideLoader(); }
            catch (ex) { }
            returnflag = false;
            break;
    }
  return returnflag;
}

function deleteConfirmbox(confirmText, functions) {
    swal({
        title: "Are you sure?",
        text: confirmText,
        type: "error",
        showCancelButton: true,
        confirmButtonClass: 'btn-danger',
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: false
    }, functions);
}

function clearConfirmbox(confirmText, functions) {
    swal({
        title: "Are you sure?",
        text: confirmText,
        type: "warning",
        showCancelButton: true,
        confirmButtonClass: 'btn-warning',
        confirmButtonText: "Yes, clear it!",
        closeOnConfirm: false
    }, functions);
}
function proceedConfirmbox(confirmText, functions) {
    swal({
        title: "Are you sure?",
        text: confirmText,
        type: "warning",
        showCancelButton: true,
        confirmButtonClass: 'btn-success',
        confirmButtonText: "Yes, Confirm it!",
        closeOnConfirm: false
    }, functions);
}
function editConfirmbox(confirmText, functions)
{
    swal({
        title: "Are you sure?",
        text: confirmText,
        type: "warning",
        showCancelButton: true,
        confirmButtonClass: 'btn-warning',
        confirmButtonText: "Yes, edit it!",
        closeOnConfirm: false
    }, functions);
}

function submitConfirmbox(confirmText, functions) {
    swal({
        title: "Are you sure?",
        text: confirmText,
        type: "warning",
        showCancelButton: true,
        confirmButtonClass: 'btn-warning',
        confirmButtonText: "Submit",
        closeOnConfirm: false
    }, functions);
}

function alertbox(confirmText, title, type) {
    swal({
        title: title == null ? "Alert" : title,
        text: confirmText,
        type: type == null ? "warning" : type,
        confirmButtonClass: 'btn-warning',
        timer: 1000
    }, function () { });
}

 


//---End---//

//------Start JS for Clear All Textbox--------------//
function clearControl(flag) {
    $('#btnSave').val("Save");
    $('#btnSavetxt').text("Save");
    $('#Id').text("-1");

    var id1 = $('#collapseinputbox select[id]').each(function () {
        var id = $(this).attr("id");
        document.getElementById(id).selectedIndex = "0";
        return this.id;
    }).get();

    $('input.clear[type="text"]').each(function () {
        $(this).val("");
    });

    $('textarea.clear').each(function () {
        $(this).val("");
    });

    $('input.clear[type="date"]').each(function () {
        $(this).val("");
    });

    $('input.clear[type="checkbox"]').each(function () {
        $(this).prop("checked", false);
    });

    $('select.clear').each(function () {
        $(this).prop('selectedIndex', 0);
    });

    if (flag != 0)
        showMsgBox('4');
}

function defaultValueOnFailure() {
    $('#btnSave').val("Save");
    $('#btnSave').prop('disabled', false);
    $('#btnDelete').prop('disabled', true);
    $('#Id').text("-1");
};
//------End JS for Clear All Textbox--------------//
function checkAllCheckBox(handler, parentDivId, type) {
    if (type == 'checkbox')
        var parentDiv = parentDivId + ' input[type="checkbox"]';

    if (type == "checkbox") {
        if ($(handler).prop('checked'))
            $(parentDiv).prop('checked', true);
        else
            $(parentDiv).prop('checked', false);
    };

    if (type == 'checkbox')
        var findControls = 'input[type = "checkbox"]:checked';

    if ($(parentDivId).find(findControls).length == 0) {
        $(parentDivId).addClass("red-validation");
    }
    else {
        $(parentDivId).removeClass("red-validation");
    }
};

function checkChkAllByJs(handler, parentDivId, type) {
    if (type == 'checkbox')
        var parentDiv = parentDivId + ' input[type="checkbox"]';

    var inputControls = $(parentDiv);
    var flag = true;
    for (var i = 0; i < inputControls.length; i++) {
        if (!$(inputControls[i]).prop('checked'))
            flag = false;
    };
    if (type == "checkbox")
        $(handler).prop('checked', flag);
};
//------Start JS for Fill DropDown List--------------//
function loadSubject(selectedvalue) {
    var subjectGroupid = $('#ddlSubjectGroup option:selected').val();
    $.ajax({
        url: '../Administrator/SubjectMasterList',
        type: 'POST',
        data: '{sessionId:' + JSON.stringify(sessionId) + ',schoolcode:' + JSON.stringify(schoolCode) + ',branchcode:' + JSON.stringify(branchCode) + ',subjectgroupid:' + JSON.stringify(subjectGroupid) + '}',
        dataType: 'json',
        contentType: 'application/json charset:utf-8',
        success: function (response) {
            fillSubject(response, selectedvalue);
        }
    });
}
function fillSubject(data, selectedvalue) {
    var ddlSubject = $('#ddlSubject');
    var optionfirst = $('<option value="-1">Select Subject</option>');
    ddlSubject.html(optionfirst);
    if ($('#ddlSubjectGroup option:selected').index() > 0) {
        $.each(data, function (i, val) {
            var option = $('<option value=' + val.SubjectId + '>' + val.SubjectName + '</option>');
            ddlSubject.append(option);
        });

        if (selectedvalue != null) {
            $('#ddlSubject option').each(function (index) {
                if ($(this).text() == selectedvalue) {
                    $(this).prop("selected", true);
                }
            });
        }

    }
};
function loadSection(selectedvalue) {
    var classid = $('#ddlClass option:selected').val();
    $.ajax({
        url: '../Administrator/SectionMasterList',
        type: 'POST',
        data: '{sessionId:' + JSON.stringify(sessionId) + ',schoolcode:' + JSON.stringify(schoolCode) + ',branchcode:' + JSON.stringify(branchCode) + ',classid:' + JSON.stringify(classid) + '}',
        dataType: 'json',
        contentType: 'application/json charset:utf-8',
        success: function (response) {
            fillSection(response, selectedvalue);
        }
    });
}
function fillSection(data, selectedvalue) {
    var ddlSection = $('#ddlSection');
    var optionfirst = $('<option value="-1">Select Section</option>');
    ddlSection.html(optionfirst);
    if ($('#ddlClass option:selected').index() > 0) {
        $.each(data, function (i, val) {
            var option = $('<option value=' + val.SectionId + '>' + val.SectionName + '</option>');
            ddlSection.append(option);
        });

        if (selectedvalue != null) {
            $('#ddlSection option').each(function (index) {

                if ($(this).text() == selectedvalue) {
                    $(this).prop("selected", true);
                }
                if ($(this).val() == selectedvalue) {
                    $(this).prop("selected", true);
                }
            });
        }
    }
};
function loadCaste(selectedvalue) {
    var categoryid = $('#ddlCategory option:selected').val();
    $.ajax({
        url: '../Administrator/CasteMasterList',
        type: 'POST',
        data: '{categoryid:' + JSON.stringify(categoryid) + ',sessionId:' + JSON.stringify(sessionId) + ',schoolcode:' + JSON.stringify(schoolCode) + ',branchcode:' + JSON.stringify(branchCode) + '}',
        dataType: 'json',
        contentType: 'application/json charset:utf-8',
        success: function (response) {
            fillCaste(response, selectedvalue);

        }
    });
}
function fillCaste(data, selectedvalue) {
    var ddlCaste = $('#ddlCaste');
    var optionfirst = $('<option value="-1">Select Caste</option>');
    ddlCaste.html(optionfirst);
    if ($('#ddlCategory option:selected').index() > 0) {
        $.each(data, function (i, val) {
            var option = $('<option value=' + val.CasteId + '>' + val.CasteName + '</option>');
            ddlCaste.append(option);
        });

        if (selectedvalue != null) {
            $('#ddlCaste option').each(function (index) {
                if ($(this).text() == selectedvalue) {
                    $(this).prop("selected", true);
                }
            });
        }
    }
};
function loadState(ddlCountryId, ddlSatateId, selectedvalue) {
    var countryid = $(ddlCountryId + ' option:selected').val();
    $.ajax({
        url: '../Administrator/StateMasterList',
        type: 'POST',
        data: '{countryid:' + JSON.stringify(countryid) + ',}',
        dataType: 'json',
        contentType: 'application/json charset:utf-8',
        success: function (response) {
            fillState(ddlCountryId, ddlSatateId, response, selectedvalue);

        }
    });
}
function fillState(ddlCountryId, ddlSatateId, data, selectedvalue) {
    var ddlState = $(ddlSatateId);
    var optionfirst = $('<option value="-1">Select State</option>');
    ddlState.html(optionfirst);
    if ($(ddlCountryId + ' option:selected').index() > 0) {
        $.each(data, function (i, val) {
            var option = $('<option value=' + val.StateId + '>' + val.StateName + '</option>');
            ddlState.append(option);
        });

        if (selectedvalue != null) {
            $(ddlSatateId + ' option').each(function (index) {
                if ($(this).text() == selectedvalue) {
                    $(this).prop("selected", true);
                }
            });
        }
    }
};
function loadCity(ddlSatateId, ddlCityId, selectedvalue) {
    var stateid = $(ddlSatateId + ' option:selected').val();
    $.ajax({
        url: '../Administrator/CityMasterList',
        type: 'POST',
        data: '{stateid:' + JSON.stringify(stateid) + '}',
        dataType: 'json',
        contentType: 'application/json charset:utf-8',
        success: function (response) {
            fillCity(ddlSatateId, ddlCityId, response, selectedvalue);
        }
    });
}
function fillCity(ddlSatateId, ddlCityId, data, selectedvalue) {
    var ddlCity = $(ddlCityId);
    var optionfirst = $('<option value="-1">Select City</option>');
    ddlCity.html(optionfirst);
    if ($(ddlSatateId + ' option:selected').index() > 0) {
        $.each(data, function (i, val) {
            var option = $('<option value=' + val.CityId + '>' + val.CityName + '</option>');
            ddlCity.append(option);
        });

        if (selectedvalue != null) {
            $(ddlCityId + ' option').each(function (index) {
                if ($(this).text() == selectedvalue) {
                    $(this).prop("selected", true);
                }
            });
        }
    }
};
function loadClass(ddlCourseId, ddlClassId, selectedvalue) {

    var courseid = $(ddlCourseId + ' option:selected').val();
    $.ajax({
        url: '../Administrator/ClassMasterList',
        type: 'POST',
        data: '{courseid:' + JSON.stringify(courseid) + ',sessionId:' + JSON.stringify(sessionId) + ',schoolcode:' + JSON.stringify(schoolCode) + ',branchcode:' + JSON.stringify(branchCode) + '}',
        dataType: 'json',
        contentType: 'application/json charset:utf-8',
        success: function (response) {
            //alert(response);
            fillClassusingcourse(ddlCourseId, ddlClassId, response, selectedvalue);
        }
    });
}
function fillClassusingcourse(ddlCourseId, ddlClassId, data, selectedvalue) {
    var ddlClass = $(ddlClassId);
    var optionfirst = $('<option value="-1">Select Class</option>');
    ddlClass.html(optionfirst);
    if ($(ddlCourseId + ' option:selected').index() > 0) {
        $.each(data, function (i, val) {
            var option = $('<option value=' + val.ClassId + '>' + val.ClassName + '</option>');
            ddlClass.append(option);
        });

        if (selectedvalue != null) {
            $(ddlClassId + ' option').each(function (index) {
                if ($(this).text() == selectedvalue) {
                    $(this).prop("selected", true);
                }
            });
        }
    }
};
//------End JS for Fill DropDown List--------------//

//------Start Add ToolTip--------------//
function addToolTip(control, tooltipmesage) {
    control.attr("data-original-title", tooltipmesage);
    control.attr("data-toggle", "tooltip");
    control.tooltip();
    control.focus();
}
//------End Add ToolTip--------------//

//------Start JS for Remove ToolTip--------------//
function removeToolTip(control) {
    control.removeAttr("data-toggle", "tooltip");
    control.removeAttr("data-original-title");
}
//------End JS for Remove ToolTip--------------//

//------Start JS for Validate Control--------------//
$(document).ready(function () {
    setTimeout(function () {
        $('input.validate').keyup(function () {
            checktextbox($(this));
        });
        $('textarea.validate').keyup(function () {
            checktextarea($(this));
        });
        $('input.validate').blur(function () {
            checktextbox($(this));
        });
        $('select.validate').change(function () {
            checkddl($(this));
        });
        $('select.validate').blur(function () {
            checkddl($(this));
        });
        $('.validate-chk input[type="checkbox"]').change(function () {
            checkchk($(this));
        });
        $('input.numbersOnly').keyup(function () {
            $(this).val($(this).val().replace(/[^0-9]/g, ''));
        });
        $('input.alphabetOnly').keyup(function () {
            $(this).val($(this).val().replace(/[^a-zA-Z]+/g, ''));
        });
        $('input.time').change(function () {

            $(this).attr('maxlength', '5');
            $(this).mask('99:99');
        });
        $('input.prefix').keyup(function () {
            var txtprefixincrementno = $('#txtPrefixIncrementNo');
            var txtprefix = $('#txtPrefix');
            if (txtprefixincrementno.val() > 0 && !Number(txtprefix.val())) {
                txtprefixincrementno.val(0);
                addToolTip(txtprefixincrementno, "Prefix must be numeric vlaue!");
            }
            else {
                removeToolTip(txtprefixincrementno);
            }
        });
        $('input.sufix').keyup(function () {
            var txtsufixincrementno = $('#txtSufixIncrementNo');
            var txtsufix = $('#txtSufix');
            if (txtsufixincrementno.val() > 0 && !Number(txtsufix.val())) {
                txtsufixincrementno.val('0');
                addToolTip(txtsufixincrementno, "Sufix must be numeric vlaue!");
            }
            else {
                removeToolTip(txtsufixincrementno);
            }
        });
    }, 100);
    //$('#btnClear').click(function () {
    //    if (confirm('do u want to clear controls?'))
    //        clearControl();
    //});
    //$('#btnSave').click(function () {
    //    if (isValidate())
    //    $(this).prop('disabled', true);
    //});
});
function isValidateList(parendiv) {

    var modelStateIsvalid = true;
    var firstElement = null;
    if (parendiv != null) {
        var inputelement = parendiv.find('input.newvalidate');
        var textarea = parendiv.find('textarea.newvalidate');
        var ddlelement = parendiv.find('select.newvalidate');

        $.each(inputelement, function (index) {
            if ($(this).val() == "") {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null)
                    firstElement = $(this);
            }
            else {
                $(this).removeClass("red-validation");
            }
        });

        $.each(textarea, function (index) {
            if ($(this).val() == "") {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null)
                    firstElement = $(this);
            }
            else {
                $(this).removeClass("red-validation");
            }
        });

        $.each(ddlelement, function (index) {
            if ($(this).children('option:selected').index() == 0) {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null)
                    firstElement = $(this);
            } else {
                $(this).removeClass("red-validation");
            }
        });
    }
    else {
        $.each($('input'), function (index) {
            if ($(this).hasClass('newvalidate')) {
                if ($(this).val() == "") {
                    $(this).addClass("red-validation");
                    modelStateIsvalid = false;
                    if (firstElement == null)
                        firstElement = $(this);
                }
                else {
                    $(this).removeClass("red-validation");
                }

            }
            else {
                $(this).removeClass("red-validation");
            }

        });

        $.each($('textarea.validate'), function (index) {
            if ($(this).val() == "") {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null)
                    firstElement = $(this);
            }
            else {
                $(this).removeClass("red-validation");
            }
        });

        $.each($('select.newvalidate'), function (index) {
            if ($(this).children('option:selected').index() == 0) {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null)
                    firstElement = $(this);
            } else {
                $(this).removeClass("red-validation");
            }
        });

        $.each($('.validate-chk'), function (index) {
            if ($(this).find('input[type = "checkbox"]:checked').length == 0) {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null)
                    firstElement = $(this);
            }
            else {
                $(this).removeClass("red-validation");
            }
        });
    }
    if (firstElement != null) {
        firstElement.focus();
    }

    return modelStateIsvalid;
}
//function isValidate(parendiv) {

//    var modelStateIsvalid = true;
//    var firstElement = null;
//    if (parendiv != null) {
//        var inputelement = parendiv.find('input.validate');
//        var textarea = parendiv.find('textarea.validate');
//        var ddlelement = parendiv.find('select.validate');

//        $.each(inputelement, function (index) {
//            if ($(this).val() == "") {
//                $(this).addClass("red-validation");
//                modelStateIsvalid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            }
//            else {
//                $(this).removeClass("red-validation");
//            }
//        });

//        $.each(textarea, function (index) {
//            if ($(this).val() == "") {
//                $(this).addClass("red-validation");
//                modelStateIsvalid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            }
//            else {
//                $(this).removeClass("red-validation");
//            }
//        });

//        $.each(ddlelement, function (index) {
//            if ($(this).children('option:selected').index() == 0) {
//                $(this).addClass("red-validation");
//                modelStateIsvalid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            } else {
//                $(this).removeClass("red-validation");
//            }
//        });
//    }
//    else {
//        $.each($('input'), function (index) {
//            if ($(this).hasClass('validate')) {
//                if ($(this).val() == "") {
//                    $(this).addClass("red-validation");
//                    modelStateIsvalid = false;
//                    if (firstElement == null)
//                        firstElement = $(this);
//                }
//                else {
//                    $(this).removeClass("red-validation");
//                }

//            }
//            else {
//                $(this).removeClass("red-validation");
//            }

//        });

//        $.each($('textarea.validate'), function (index) {
//            if ($(this).val() == "") {
//                $(this).addClass("red-validation");
//                modelStateIsvalid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            }
//            else {
//                $(this).removeClass("red-validation");
//            }
//        });

//        $.each($('select.validate'), function (index) {
//            ////
//            if ($(this).children('option:selected').index() == 0) {
//                $(this).addClass("red-validation");
//                modelStateIsvalid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            } else {
//                $(this).removeClass("red-validation");
//            }
//        });

//        $.each($('.validate-chk'), function (index) {
//            if ($(this).find('input[type = "checkbox"]:checked').length == 0) {
//                $(this).addClass("red-validation");
//                modelStateIsvalid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            }
//            else {
//                $(this).removeClass("red-validation");
//            }
//        });

//        var emailelements = $('input[type="email"].validate');
//        $.each(emailelements, function (index) {
//            var emailValue = $(this).val();
//            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//            if (emailValue == "" || !emailPattern.test(emailValue)) {
//                $(this).addClass("red-validation");
//                modelStateIsValid = false;
//                if (firstElement == null)
//                    firstElement = $(this);
//            } else {
//                $(this).removeClass("red-validation");
//            }
//        });
//    }
//    if (firstElement != null) {
//        firstElement.focus();
//    }

//    return modelStateIsvalid;
//}
function isValidate(parendiv) {

    var modelStateIsvalid = true;
    var firstElement = null;

    // 🔹 helper to get field name
    function getFieldName(el) {
        return el.attr('placeholder')
            || el.attr('name')
            || el.closest('.form-group').find('label').text()
            || el.prev('label').text()
            || 'This field';
    }

    // 🔹 helper to add/remove red border (select2 supported)
    function addError(el) {
        el.addClass("red-validation");

        if (el.hasClass('select2-hidden-accessible')) {
            el.next('.select2').find('.select2-selection')
                .addClass("red-validation");
        }
    }

    function removeError(el) {
        el.removeClass("red-validation");

        if (el.hasClass('select2-hidden-accessible')) {
            el.next('.select2').find('.select2-selection')
                .removeClass("red-validation");
        }
    }

    if (parendiv != null) {

        var inputelement = parendiv.find('input.validate');
        var textarea = parendiv.find('textarea.validate');
        var ddlelement = parendiv.find('select.validate');

        $.each(inputelement, function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each(textarea, function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each(ddlelement, function () {
            if ($(this).children('option:selected').index() == 0) {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

    } else {

        $.each($('input.validate'), function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each($('textarea.validate'), function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each($('select.validate'), function () {
            if ($(this).children('option:selected').index() == 0) {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        // 🔹 checkbox group validation
        $.each($('.validate-chk'), function () {
            if ($(this).find('input[type="checkbox"]:checked').length == 0) {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                $(this).removeClass("red-validation");
            }
        });

        // 🔹 email validation
        var emailelements = $('input[type="email"].validate');
        $.each(emailelements, function () {
            var emailValue = $(this).val();
            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (emailValue == "" || !emailPattern.test(emailValue)) {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });
    }

    // 🔥 POPUP + AUTO FOCUS
    if (!modelStateIsvalid && firstElement != null) {

        // focus fix for select2
        if (firstElement.hasClass('select2-hidden-accessible')) {
            firstElement.next('.select2')
                .find('.select2-selection')
                .focus();
        } else {
            firstElement.focus();
        }

        swal(
            "Validation Error",
            getFieldName(firstElement) + " is required or invalid. Please check highlighted fields.",
            "error"
        );
    }

    return modelStateIsvalid;
}

function isValidateA(parendiv) {

    var modelStateIsvalid = true;
    var firstElement = null;

    // 🔹 helper to get field name
    function getFieldName(el) {
        return el.attr('placeholder')
            || el.attr('name')
            || el.closest('.form-group').find('label').text()
            || el.prev('label').text()
            || 'This field';
    }

    // 🔹 helper to add/remove red border (select2 supported)
    function addError(el) {
        el.addClass("red-validation");

        if (el.hasClass('select2-hidden-accessible')) {
            el.next('.select2').find('.select2-selection')
                .addClass("red-validation");
        }
    }

    function removeError(el) {
        el.removeClass("red-validation");

        if (el.hasClass('select2-hidden-accessible')) {
            el.next('.select2').find('.select2-selection')
                .removeClass("red-validation");
        }
    }

    if (parendiv != null) {

        var inputelement = parendiv.find('input.validateA');
        var textarea = parendiv.find('textarea.validateA');
        var ddlelement = parendiv.find('select.validateA');

        $.each(inputelement, function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each(textarea, function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each(ddlelement, function () {
            if ($(this).children('option:selected').index() == 0) {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

    } else {

        $.each($('input.validateA'), function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each($('textarea.validateA'), function () {
            if ($(this).val() == "") {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        $.each($('select.validateA'), function () {
            if ($(this).children('option:selected').index() == 0) {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });

        // 🔹 checkbox group validation
        $.each($('.validateA-chk'), function () {
            if ($(this).find('input[type="checkbox"]:checked').length == 0) {
                $(this).addClass("red-validation");
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                $(this).removeClass("red-validation");
            }
        });

        // 🔹 email validation
        var emailelements = $('input[type="email"].validateA');
        $.each(emailelements, function () {
            var emailValue = $(this).val();
            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (emailValue == "" || !emailPattern.test(emailValue)) {
                addError($(this));
                modelStateIsvalid = false;
                if (firstElement == null) firstElement = $(this);
            } else {
                removeError($(this));
            }
        });
    }

    // 🔥 POPUP + AUTO FOCUS
    if (!modelStateIsvalid && firstElement != null) {

        // focus fix for select2
        if (firstElement.hasClass('select2-hidden-accessible')) {
            firstElement.next('.select2')
                .find('.select2-selection')
                .focus();
        } else {
            firstElement.focus();
        }

        swal(
            "Validation Error",
            getFieldName(firstElement) + " is required or invalid. Please check highlighted fields.",
            "error"
        );
    }

    return modelStateIsvalid;
}

function checktextbox(txtbox) {
    if (txtbox.val() == "") {
        txtbox.addClass("red-validation");
    }
    else {
        txtbox.removeClass("red-validation");
    }
}
function checktextarea(txtarea) {
    if (txtarea.val() == "") {
        txtarea.addClass("red-validation");
    }
    else {
        txtarea.removeClass("red-validation");
    }
}
function checktextboxhtml(txtboxid) {
    var txtbox = $(txtboxid);
    if (txtbox.val() == "") {
        txtbox.addClass("red-validation");
    }
    else {
        txtbox.removeClass("red-validation");
    }
}
function checkddl(ddl) {
    if (ddl.children('option:selected').index() == 0) {
        ddl.addClass("red-validation");
        var s2id_ddl = $('#s2id_' + ddl.attr('id'));
        if (s2id_ddl != null) {
            s2id_ddl.children().addClass("red-validation");
        }
    }
    else {
        ddl.removeClass("red-validation");
        var s2id_ddl = $('#s2id_' + ddl.attr('id'));
        if (s2id_ddl != null) {
            s2id_ddl.children().removeClass("red-validation");
        }
    }
}
function checkchk(chk) {
    if (chk.parent().parent().find('input[type = "checkbox"]:checked').length == 0) {
        chk.parent().parent().addClass("red-validation");
    }
    else {
        chk.parent().parent().removeClass("red-validation");
    }
}
function validateEmail(txtemailid) {
    var txtemail = $(txtemailid);
    var semail = txtemail.val();
    var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
    if (semail == "" || filter.test(semail)) {
        removeToolTip(txtemail);
        return true;
    }
    else {
        addToolTip(txtemail, "Please fill correct e-mail address!");
        return false;
    }
}
function validatePhoneNo(txtmobilenoid) {
    var txtmobileno = $(txtmobilenoid);
    var smobileno = txtmobileno.val();
    var filter = /^[0-9]+$/;
    if (smobileno == "" || filter.test(smobileno)) {
        if (smobileno == "" || smobileno.length == 10) {
            removeToolTip(txtmobileno);
            return true;
        }
        else {
            addToolTip(txtmobileno, "Phone number must be 10 digits!");
            return false;
        }
    }
    else {
        addToolTip(txtmobileno, "Phone number must be 10 digits!");
        return false;
    }
}
function validateNumberAndDecimalOnly(txtfield) {
    var element = $(txtfield);
    var value = element.val();
    //var filter = /^[0-9]*\.?[0-9]*$/;;
    var filter = /^[0-9]+$/;
    if (value == "" || filter.test(value)) {
        removeToolTip(element);
        return true;
    }
    else {
        addToolTip(element, "Must be numeric digits!");
        return false;
    }
}
//------End JS for Validate Control--------------//
function loadDataTable(tblheader, tblrows, showColumn, imageColumn) {

    var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" style="width:100%"></table>');
    var thead = $('<thead></thead>');
    var theadrow = $('<tr></tr>');

    var tfoot = $('<tfoot></tfoot>');
    var tfootrow = $('<tr></tr>');
    var colspan = 0;
    for (var i = 0; i < l; i++) {
        colspan = colspan + 1;
    }

    var l = tblheader.length;
    for (var i = 0; i < l; i++) {
        var val = tblheader[i]
        var flag = true;
        if (showColumn != null) { flag = jQuery.inArray(i, showColumn) == -1 ? false : true; }
        if (flag) {
            if ($('#anchor label').text() != '') {
                if ($('#anchor label').text().indexOf(val.Header) == -1) {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + val.Header + '</label></div>');
                }
            }
            else {
                $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + val.Header + '</label></div>');
            }

        }
        else {
            if ($('#anchor label').text().indexOf(val.Header) == -1) {
                $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + val.Header + '</label></div>');
            }
        }
        // Append header here
        theadrow.append('<th>' + val.Header + '</th>');
        // Append footerrow here
        tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + val.Header + '" /></th>');
    }

    thead.append(theadrow);
    tab.append(thead);
    if (JSON.stringify(tblrows).length > 2) {
        var tbody = $('<tbody></tbody>');
        var p = tblrows.length;
        for (var i = 0; i < p; i++) {
            var val = tblrows[i]
            var trow = $('<tr></tr>');
            for (var key in val) {
                if (key == "Id" || key == "#") {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + val[key] + ' /></td>');
                }
                else {
                    if (imageColumn != null) {
                        var showImage = jQuery.inArray(key, imageColumn) == -1 ? false : true;

                        if (showImage) {
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="../' + (val[key] == null ? '../content/photos/default-user.png' : val[key]) + '" width="50px" height="50px"></td>');
                        }
                        else {
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + val[key] + '</td>');
                        }
                    }
                    else {
                        trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + val[key] + '</td>');
                    }
                }
            };
            tbody.append(trow);
        };
    } else {
        var trow = $('<tr><td style="text-align:center" colspan=' + colspan + '>No Record Found!</td></tr>');
        tbody.append(trow);
    }
    tab.append(tbody);

    tfoot.append(tfootrow);
    tab.append(tfoot);

    $("#UpdatePanel").html(tab);

    var hideColumn = [];
    var m = $('#anchor input[type="checkbox"]');
    for (var i = 0; i < m.length; i++) {

        if (!$(m[i]).prop('checked')) {
            hideColumn.push(i);
        }
    }
    if (JSON.stringify(tblrows).length > 2) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.append("datatable('" + hideColumn + "')");

        $("#UpdatePanel").append(script);
    }
    angular.element(document).scope().hideLoader();
};
var colIndex = 0;
var colOrder = "asc";

function loadDataUsingPreDefinedColumn(headerColumn, data, displayOrder, backward) {
    if (backward == null)
        backward = 0;

    if (displayOrder != null) {
        colOrder = displayOrder;
    }
    loadDataTablesUsingPreDefinedColumn(headerColumn, data, backward);
};
function loadDataTablesUsingPreDefinedColumn(tblheader, data, backward) {
    if (JSON.stringify(data).length > 2) {
        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap ' + tblClass + '" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var tfoot = $('<tfoot></tfoot>');
        var tfootrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = 0; i < l; i++) {
            var val = tblheader[i]
            var headertext = "Sr.No.";
            if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {
                if (val.HeaderText != "Id") {
                    headertext = val.HeaderText;
                }

                if (val.ShowColumn == "Yes") {
                    if ($('#anchor label').text() != '') {
                        if ($('#anchor label').text().indexOf(headertext) == -1) {
                            $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label> </div>');
                        }
                    }
                    else {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label></div>');
                    }
                }
                else {
                    if ($('#anchor label').text().indexOf(headertext) == -1) {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + headertext + '</label></div>');
                    }
                }
                

                if (val.CssClass == 'undefined' || val.CssClass == null) {
                    theadrow.append('<th>' + headertext + '</th>');
                }
                else {
                    theadrow.append('<th class=' + val.CssClass + '>' + headertext + '</th>');
                }

                tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + headertext + '" /></th>');
            }
            // Append footerrow here
        }

        thead.append(theadrow);

        tab.append(thead);
        var tbody = $('<tbody></tbody>');
        var sumList = [];


        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            var k = i;
            var i = 0;
            $.each(tblheader, function (j, val) {
                if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {

                    var key = val.HeaderValue;
                    var value = obj[key];
                    value = (val.NumberType == 'undefined' || val.NumberType == null) ? ((val.DateType == 'undefined' || val.DateType == null) ? value : ConvertDateToDateType(value)) : ConvertToDecimalDynamicPoint(value, val.NumberType);
                    if (value == 'undefined' || value == null) { value = "" }
                    if (key == "Id" || key == "#") {
                        if (obj[val.Value] == 'undefined' || obj[val.Value] == null)
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (k + 1) + '</td>');
                        else
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (k + 1) + '<input type="hidden" id="hdId_' + k + '" name="Id" value=\'' + obj[val.Value] + '\' /></td>');
                    }
                    else {
                        if (val.ImageColumn == "Yes") {
                            if (val.CssClass == 'undefined' || val.CssClass == null)
                                trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="' + ((value == null || value == "") ? '../content/photos/default-user.png' : ("https://testeesassin.co.in/Uploading/" + value)) + '" width="50px" height="50px"></td>');
                            else
                                trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><img src="' + ((value == null || value == "") ? '../content/photos/default-user.png' : ("https://testeesassin.co.in/Uploading/" + value)) + '" width="50px" height="50px"></td>');

                        }
                        else if (val.tooltip == "Yes") {
                            if (obj[val.Value] == 'undefined' || obj[val.Value] == null) {
                                if (val.CssClass == 'undefined' || val.CssClass == null)
                                    trow.append('<td  ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                                else
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                            }
                            else {

                                if (val.CssClass == 'undefined' || val.CssClass == null)
                                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><input type="hidden" id="hd' + key + '" name=' + key + ' value=\'' + obj[val.Value] + '\' /><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                                else
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><input type="hidden" id="hd' + key + '" name=' + key + ' value=\'' + obj[val.Value] + '\' /><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                            }
                        }
                        else {
                            //--------------------
                            if (obj[val.Value] == 'undefined' || obj[val.Value] == null) {
                                if (val.CssClass == 'undefined' || val.CssClass == null) {
                                    trow.append('<td  ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');
                                }
                                else {
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');

                                }

                            }
                            else {
                                if (val.CssClass == 'undefined' || val.CssClass == null) {
                                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '<input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /></td>');
                                }

                                else {
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '<input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /></td>');
                                }

                            }

                        }
                        //----------------------------
                    }

                    if (sumList[i] == "" || sumList[i] == 'undefined' || sumList[i] == null)
                        sumList[i] = 0;
                    if (val.Fun == 'undefined' || val.Fun == null) {
                        if (val.FooterText == 'undefined' || val.FooterText == null) {
                            sumList[i] = "";
                        }
                        else {
                            sumList[i] = val.FooterText;
                        }
                    }
                    else {
                        addfunfoot = 1;
                        sumList[i] = Number(sumList[i]) + (isNaN(value) ? 0 : Number(value));
                    }
                    i = i + 1;
                }
            });

            tbody.append(trow);
        });

        tab.append(tbody);

        if (addfunfoot == 1) {
            var ftrow = $('<tr class="print"></tr>');
            $.each(sumList, function (index, value) {
                var footval = (value == '0' ? '-' : ((isNaN(value) || value == "") ? value : Number(value).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })));

                ftrow.append('<th class="text-right">' + footval + '</th>');
            });
            //tfoot.append(tfootrow);
            tfoot.addClass("print")
            tfoot.append(ftrow);

            tab.append(tfoot);
        }
        else {
            tfoot.append(tfootrow);
            tab.append(tfoot);
        }


        $("#UpdatePanel").html(tab);

        var hideColumn = [];
        var m = $('#anchor input[type="checkbox"]');
        for (var i = 0; i < m.length; i++) {
            if (!$(m[i]).prop('checked')) {
                hideColumn.push(i);
            }
        }


        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.append("datatable('" + hideColumn + "','" + backward + "')");

        $("#UpdatePanel").append(script);


    }
    else {
        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = 0; i < l; i++) {
            var val = tblheader[i]
            var headertext = "Sr.No.";
            if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {
                if (val.HeaderText != "Id") {
                    headertext = val.HeaderText;
                }
                if (val.ShowColumn == "Yes") {
                    if ($('#anchor label').text() != '') {
                        if ($('#anchor label').text().indexOf(headertext) == -1) {
                            $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label> </div>');
                        }
                    }
                    else {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label></div>');
                    }

                }
                else {
                    if ($('#anchor label').text().indexOf(headertext) == -1) {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + headertext + '</label></div>');
                    }
                }


                if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {
                    if (val.CssClass == 'undefined' || val.CssClass == null) {
                        theadrow.append('<th>' + headertext + '</th>');
                    }
                    else {
                        theadrow.append('<th class=' + val.CssClass + '>' + headertext + '</th>');
                    }
                }

                thead.append(theadrow);

                tab.append(thead);




            }
        }
        var tbody = $('<tbody></tbody>');

        var trow = $('<tr></tr>');
        trow.append("<th colspan=" + tblheader.length + " style='text-align: center;'>No Record Found!</th>");
        tbody.append(trow);

        tab.append(tbody);
        $("#UpdatePanel").html(tab);
        angular.element(document).scope().hideLoader();
    };

};

function loadDataUsingPreDefinedColumnForCustomHeader(headerColumn, data, displayOrder, backward, colspan, rowspan, coindex) {
    if (backward == null)
        backward = 0;

    if (displayOrder != null) {
        colOrder = displayOrder;
    }
    loadDataTablesUsingPreDefinedColumnForCustomHeader(headerColumn, data, backward, colspan, rowspan, coindex);
};
function loadDataTablesUsingPreDefinedColumnForCustomHeader(tblheader, data, backward, colspan, rowspan, coindex) {
    if (JSON.stringify(data).length > 2) {
        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap ' + tblClass + '" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var tfoot = $('<tfoot></tfoot>');
        var tfootrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = 0; i < l; i++) {
            var val = tblheader[i]
            var headertext = "Sr.No.";
            if (val.HeaderText != "Id") {
                headertext = val.HeaderText;
            }

            if (val.ShowColumn == "Yes") {
                if ($('#anchor label').text() != '') {
                    if ($('#anchor label').text().indexOf(headertext) == -1) {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label> </div>');
                    }
                }
                else {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label></div>');
                }

            }
            else {
                if ($('#anchor label').text().indexOf(headertext) == -1) {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + headertext + '</label></div>');
                }
            }

            if (headertext !== '') {
                if (val.CssClass == 'undefined' || val.CssClass == null)
                    theadrow.append('<th rowspan=' + val.rowspan + ' colspan=' + val.colspan + '>' + headertext + '</th>');
                else
                    theadrow.append('<th rowspan=' + val.rowspan + ' colspan=' + val.colspan + ' class=' + val.CssClass + '>' + headertext + '</th>');
            }
            // Append footerrow here
            tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + headertext + '" /></th>');
        }

        thead.append(theadrow);
        theadrow = $('<tr></tr>');
        var ll = backward.length;
        for (var i = 0; i < ll; i++) {
            var val = backward[i]
            var headertext = "Sr.No.";
            if (val.HeaderText != "Id") {
                headertext = val.HeaderText;
            }

            if (val.ShowColumn == "Yes") {
                if ($('#anchor label').text() != '') {
                    if ($('#anchor label').text().indexOf(headertext) == -1) {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label> </div>');
                    }
                }
                else {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label></div>');
                }

            }
            else {
                if ($('#anchor label').text().indexOf(headertext) == -1) {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + headertext + '</label></div>');
                }
            }
            if (headertext !== '') {
                if (val.CssClass == 'undefined' || val.CssClass == null)
                    theadrow.append('<th rowspan=' + val.rowspan + ' colspan=' + val.colspan + '>' + headertext + '</th>');
                else
                    theadrow.append('<th rowspan=' + val.rowspan + ' colspan=' + val.colspan + 'class=' + val.CssClass + '>' + headertext + '</th>');
            }
            // Append footerrow here
            tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + headertext + '" /></th>');
        }

        thead.append(theadrow);


        tab.append(thead);
        var tbody = $('<tbody></tbody>');
        var sumList = [];

        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                value = (val.NumberType == 'undefined' || val.NumberType == null) ? ((val.DateType == 'undefined' || val.DateType == null) ? value : ConvertDateToDateType(value)) : ConvertToDecimalDynamicPoint(value, val.NumberType);
                if (value == 'undefined' || value == null) { value = "" }
                if (key == "Id" || key == "#") {
                    if (obj[val.Value] == 'undefined' || obj[val.Value] == null)
                        trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '</td>');
                    else
                        trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=\'' + obj[val.Value] + '\' /></td>');
                }
                else {
                    if (val.ImageColumn == "Yes") {
                        if (val.CssClass == 'undefined' || val.CssClass == null)
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                        else
                            trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');

                    }
                    else if (val.tooltip == "Yes") {
                        if (obj[val.Value] == 'undefined' || obj[val.Value] == null) {
                            if (val.CssClass == 'undefined' || val.CssClass == null)
                                trow.append('<td  ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                            else
                                trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                        }
                        else {

                            if (val.CssClass == 'undefined' || val.CssClass == null)
                                trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><input type="hidden" id="hd' + key + '" name=' + key + ' value=\'' + obj[val.Value] + '\' /><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                            else
                                trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><input type="hidden" id="hd' + key + '" name=' + key + ' value=\'' + obj[val.Value] + '\' /><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                        }
                    }
                    else {
                        //--------------------
                        if (obj[val.Value] == 'undefined' || obj[val.Value] == null) {
                            if (val.CssClass == 'undefined' || val.CssClass == null) {
                                trow.append('<td  ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');
                            }
                            else {
                                trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');

                            }

                        }
                        else {
                            if (val.CssClass == 'undefined' || val.CssClass == null) {
                                trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '<input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /></td>');
                            }

                            else {
                                trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '<input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /></td>');
                            }

                        }

                    }
                    //----------------------------
                }
                if (sumList[j] == "" || sumList[j] == 'undefined' || sumList[j] == null)
                    sumList[j] = 0;
                if (val.Fun == 'undefined' || val.Fun == null) {
                    if (val.FooterText == 'undefined' || val.FooterText == null) {
                        sumList[j] = "";
                    }
                    else {
                        sumList[j] = val.FooterText;
                    }
                }
                else {
                    addfunfoot = 1;
                    sumList[j] = Number(sumList[j]) + (isNaN(value) ? 0 : Number(value));
                }
            });

            tbody.append(trow);
        });

        tab.append(tbody);

        if (addfunfoot == 1) {
            var ftrow = $('<tr class="print"></tr>');
            $.each(sumList, function (index, value) {
                var footval = (value == '0' ? '-' : ((isNaN(value) || value == "") ? value : Number(value).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })));

                ftrow.append('<th class="text-right">' + footval + '</th>');
            });
            //tfoot.append(tfootrow);
            tfoot.addClass("print")
            tfoot.append(ftrow);

            tab.append(tfoot);
        }
        else {
            tfoot.append(tfootrow);
            tab.append(tfoot);
        }


        $("#UpdatePanel").html(tab);

        var hideColumn = [];
        var m = $('#anchor input[type="checkbox"]');
        for (var i = 0; i < m.length; i++) {
            if (!$(m[i]).prop('checked')) {
                hideColumn.push(i);
            }
        }


        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.append("datatable('" + hideColumn + "','" + backward + "')");

        $("#UpdatePanel").append(script);


    }
    else {
        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = 0; i < l; i++) {
            var val = tblheader[i]
            var headertext = "Sr.No.";
            if (val.HeaderText != "Id") {
                headertext = val.HeaderText;
            }
            if (val.ShowColumn == "Yes") {
                if ($('#anchor label').text() != '') {
                    if ($('#anchor label').text().indexOf(headertext) == -1) {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label> </div>');
                    }
                }
                else {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label></div>');
                }

            }
            else {
                if ($('#anchor label').text().indexOf(headertext) == -1) {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + headertext + '</label></div>');
                }
            }
            if (val.CssClass == 'undefined' || val.CssClass == null)
                // Append header here
                theadrow.append('<th>' + headertext + '</th>');
            else
                theadrow.append('<th class=' + val.CssClass + '>' + headertext + '</th>');
        }

        thead.append(theadrow);

        tab.append(thead);


        var tbody = $('<tbody></tbody>');

        var trow = $('<tr></tr>');
        trow.append("<th colspan=" + tblheader.length + " style='text-align: center;'>No Record Found!</th>");
        tbody.append(trow);

        tab.append(tbody);
        $("#UpdatePanel").html(tab);

    }

    angular.element(document).scope().hideLoader();
};

var addfunfoot = 0;
var addGransFooterRow = 0;
var closingRow = 'closingRow';
var tablelayout = 'fixed';
var tblClass = '';

function loadDataUsingPreDefinedColumnForMulitpleTable(headerColumn, tblid, data, dataList, displayOrder) {

    if (displayOrder != null) {
        colOrder = displayOrder;
    }
    loadDataTablesUsingPreDefinedColumnForMulitpleTable(headerColumn, tblid, data, dataList);
};

var createFooter = true;
function loadDataTablesUsingPreDefinedColumnForMulitpleTable(tblheader, tblid, data, dataList) {

    if (JSON.stringify(data).length > 2) {

        var tab = $('<table id="' + tblid + '" class="table compact table-hover table-striped table-bordered nowrap ' + tblClass + ' ' + closingRow + '" style="table-layout: ' + tablelayout + ';" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var tfoot = $('<tfoot></tfoot>');
        var tfootrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = 0; i < l; i++) {
            var val = tblheader[i]
            var headertext = "Sr.No.";
            if (val.HeaderText != "Id") {
                headertext = val.HeaderText;
            }


            if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {

                if (val.CssClass == 'undefined' || val.CssClass == null)
                    theadrow.append('<th style="width:' + val.Width + '">' + headertext + '</th>');
                else
                    theadrow.append('<th style="width:' + val.Width + '" class=' + val.CssClass + '>' + headertext + '</th>');
                tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + headertext + '" /></th>');
            }
        }

        thead.append(theadrow);

        tab.append(thead);
        var tbody = $('<tbody></tbody>');
        var sumList = [];

        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            var k = 0;
            $.each(tblheader, function (j, val) {
                if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {
                    var key = val.HeaderValue;
                    var value = obj[key];
                    value = (val.NumberType == 'undefined' || val.NumberType == null) ? value : ConvertToDecimalDynamicPoint(value, val.NumberType);
                    if (value == 'undefined' || value == null) { value = "" }
                    if (key == "Id" || key == "#") {
                        if (obj[val.Value] == 'undefined' || obj[val.Value] == null)
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '</td>');
                        else
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + obj[val.Value] + ' /></td>');
                    }
                    else {
                        if (val.ImageColumn == "Yes") {
                            if (val.CssClass == 'undefined' || val.CssClass == null)
                                trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                            else
                                trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');

                        }
                        else if (val.tooltip == "Yes") {
                            if (obj[val.Value] == 'undefined' || obj[val.Value] == null) {
                                if (val.CssClass == 'undefined' || val.CssClass == null)
                                    trow.append('<td  ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                                else
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                            }
                            else {

                                if (val.CssClass == 'undefined' || val.CssClass == null)
                                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                                else
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();"><span class="spnDetails">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</span><input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /><span class="spnTooltip">' + obj[val.tooltipvalue] + '</span></td>');
                            }
                        }
                        else {

                            if (obj[val.Value] == 'undefined' || obj[val.Value] == null) {
                                if (val.CssClass == 'undefined' || val.CssClass == null)
                                    trow.append('<td  ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');
                                else
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');
                            }
                            else {

                                if (val.CssClass == 'undefined' || val.CssClass == null)
                                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '<input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /></td>');
                                else
                                    trow.append('<td class=' + val.CssClass + ' ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '<input type="hidden" id="hd' + key + '" name=' + key + ' value=' + obj[val.Value] + ' /></td>');
                            }

                        }
                    }
                    if (sumList[k] == "" || sumList[k] == 'undefined' || sumList[k] == null)
                        sumList[k] = 0;
                    if (val.Fun == 'undefined' || val.Fun == null) {
                        if (val.FooterText == 'undefined' || val.FooterText == null) {
                            sumList[k] = "";
                        }
                        else {
                            sumList[k] = val.FooterText;
                        }
                    }
                    else {
                        addfunfoot = 1;
                        sumList[k] = Number(sumList[k]) + (isNaN(value) ? 0 : Number(value));

                    }
                    k = k + 1;
                }
            });

            tbody.append(trow);
        });

        tab.append(tbody);

        if (addfunfoot == 1) {
            var ftrow = $('<tr class="print"></tr>');
            $.each(sumList, function (index, value) {
                var footval = (value == '0' ? '-' : ((isNaN(value) || value == "") ? value : Number(value).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })));

                ftrow.append('<th class="text-right">' + footval + '</th>');
            });
            if (createFooter) {
                tfoot.addClass("print")
                tfoot.append(ftrow);
            }
            tab.append(tfoot);
        }
        else {
            if (createFooter) {
                tfoot.append(tfootrow);
                tab.append(tfoot);
            }
        }

        var sumList1 = [];



        if (addGransFooterRow == 1) {
            if (dataList.length > 0)
                debugger;
            $.each(dataList, function (i, obj) {
                var l = 0;
                $.each(tblheader, function (j, val) {
                    if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {
                        var key = val.HeaderValue;
                        var value = obj[key];
                        value = (val.NumberType == 'undefined' || val.NumberType == null) ? value : ConvertToDecimalDynamicPoint(value, val.NumberType);
                        if (value == 'undefined' || value == null) { value = "" }
                        if (sumList1[l] == "" || sumList1[l] == 'undefined' || sumList1[l] == null)
                            sumList1[l] = 0;
                        if (val.Fun == 'undefined' || val.Fun == null) {
                            if (val.GFooterText == 'undefined' || val.GFooterText == null) {
                                sumList1[l] = "";
                            }
                            else {
                                sumList1[l] = val.GFooterText;
                            }
                        }
                        else {
                            addfunfoot = 1;
                            sumList1[l] = Number(sumList1[l]) + (isNaN(value) ? 0 : Number(value));
                        }
                        l = l + 1;
                    }
                });
            });

            var ftrow = $('<tr class="print"></tr>');
            $.each(sumList1, function (index, value) {
                var footval = (value == '0' ? '-' : ((isNaN(value) || value == "") ? value : Number(value).toLocaleString("en", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })));

                ftrow.append('<th class="text-right">' + footval + '</th>');
            });
            if (createFooter) {
                tfoot.addClass("print")
                tfoot.append(ftrow);
            }
        }



        $("#UpdatePanel").append(tab);

        var hideColumn = [];
        var m = $('#anchor input[type="checkbox"]');
        for (var i = 0; i < m.length; i++) {
            if (!$(m[i]).prop('checked')) {
                hideColumn.push(i);
            }
        }


        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.append("BasicDatatableMultipleTable('" + tblid + "')");

        $("#UpdatePanel").append(script);

    }
    else {
        var tab = $('<table id="example" class="table compact table-hover table-striped table-bordered nowrap" ></table>');
        var thead = $('<thead></thead>');
        var theadrow = $('<tr></tr>');

        var l = tblheader.length;
        for (var i = 0; i < l; i++) {
            var val = tblheader[i]
            var headertext = "Sr.No.";
            if (val.HeaderText != "Id") {
                headertext = val.HeaderText;
            }
            if (val.ShowColumn == "Yes") {
                if ($('#anchor label').text() != '') {
                    if ($('#anchor label').text().indexOf(headertext) == -1) {
                        $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label> </div>');
                    }
                }
                else {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="">' + headertext + '</label></div>');
                }

            }
            else {
                if ($('#anchor label').text().indexOf(headertext) == -1) {
                    $("#anchor").append('<div class="checkbox checkbox-success check-box"><input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="">' + headertext + '</label></div>');
                }
            }
            if (val.Generate == 'undefined' || val.Generate == null || val.Generate != 'No') {
                if (val.CssClass == 'undefined' || val.CssClass == null)
                    // Append header here
                    theadrow.append('<th>' + headertext + '</th>');
                else
                    theadrow.append('<th class=' + val.CssClass + '>' + headertext + '</th>');
            }
        }
        thead.append(theadrow);

        tab.append(thead);


        var tbody = $('<tbody></tbody>');

        var trow = $('<tr></tr>');
        trow.append("<th colspan=" + tblheader.length + " style='text-align: center;'>No Record Found!</th>");
        tbody.append(trow);

        tab.append(tbody);
        $("#UpdatePanel").append(tab);

    }

    angular.element(document).scope().hideLoader();
};
var breakafter = 3;
function BasicDatatableMultipleTable(tableid) {

    if (tableid == null) {
        tableid = "example";
    }
    var message = "";
    var seprator = "";
    var filter = "<span class='filter' ></span> ";
    var j = 0;
    if (messagevalues.length > 0)
        $.each(messagevalues, function (i, values) {
            $.each(values, function (key, val) {
                j = j + 1;
                if (val != null && val != "") {
                    if (j == breakafter) {
                        message = message + "</br>"
                        j = 0;
                    }
                    else {
                        message = message + seprator + filter;
                    }
                    message = message + "<span class='filter-title-name' >" + key + "</span> : <span class='filter-title'>" + val + "</span>"

                    filter = " ";
                };
            });
        });
    if (message.length > 0) {
        message = '' + message + '';
    }
    $('#' + tableid).append('<caption style="caption-side: center"><div id="FilterTitle">' + message + '</div></caption>');

}


function loadDataUsingPreDefinedColumnOnPage(headerColumn, data, displayOrder, displayid, tableid) {
    ////
    if (displayOrder != null) {
        colOrder = displayOrder;
    }
    loadDataTablesUsingPreDefinedColumnOnPage(headerColumn, data, displayid, tableid);
};

function Replace(value) {
    var str = value.toString().split('$');
    var returnstring = "";
    var para = $('<p></p>');
    for (var i = 0; i < str.length; i++) {
        para.append('<p>' + str[i] + '</p>');
    }
    return para.html();
};

function loadDataTablesUsingPreDefinedColumnOnPage(tblheader, data, displayid, tableid) {
    if (tableid == null) {
        tableid = 'example';
    }
    var tab = $('<table id=' + tableid + ' class="table compact table-hover table-striped table-bordered nowrap" ></table>');
    var thead = $('<thead></thead>');
    var theadrow = $('<tr></tr>');

    var l = tblheader.length;
    var colspan = 0;
    for (var i = 0; i < l; i++) {
        var val = tblheader[i]
        colspan = colspan + 1;
        // Append header here
        theadrow.append('<th>' + val.HeaderText + '</th>');
    }

    thead.append(theadrow);

    tab.append(thead);
    var tbody = $('<tbody></tbody>');
    if (JSON.stringify(data).length > 2) {
        $.each(data, function (i, obj) {
            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                if (value == 'undefined' || value == null) { value = "" }
                if (key == "Id" || key == "#") {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + obj[val.Value] + ' /></td>');
                }
                else {
                    if (val.ImageColumn == "Yes") {
                        trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="' + ((value == null || value == "") ? '../content/photos/default-user.png' : ("https://testeesassin.co.in/Uploading/" + value)) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : value) + '</td>');
                    }
                }
            });
            tbody.append(trow);
        });
    }
    else {
        var trow = $('<tr><td style="text-align:center" colspan=' + colspan + '>No Record Found!</td></tr>');
        tbody.append(trow);
    }
    tab.append(tbody);

    if (displayid == null)
        $("#UpdatePanel").html(tab);
    else
        $(displayid).html(tab);

    if (JSON.stringify(data).length > 2) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.append("BasicDatatable('" + tableid + "')");

        if (displayid == null)
            $("#UpdatePanel").append(script);
        else
            $(displayid).append(script);
    }

    angular.element(document).scope().hideLoader();
};

function BasicDatatable(tableid) {

    if (tableid == null) {
        tableid = "example";
    }
    var message = "";
    var seprator = "";
    var filter = "<span class='filter' >Filter  : </span> ";

    if (messagevalues.length > 0)
        $.each(messagevalues, function (i, values) {
            $.each(values, function (key, val) {
                if (val != null && val != "") {
                    message = message + seprator + filter;
                    message = message + "<span class='filter-title-name' >" + key + "</span> : <span class='filter-title'>" + val + "</span>"
                    seprator = ", ";
                    filter = "";
                };
            });
        });
    if (message.length > 0) {
        message = '(' + message + ')';
    }
    $('#' + tableid).append('<caption style="caption-side: center"><div id="FilterTitle">' + message + '</div></caption>');
    var table = $('#' + tableid).DataTable({
        "paging": false,
        "ordering": true,
        "info": false,
        "searching": false,
        realtime: true,
        responsive: false,
        dom: 'lBfrtip',
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "All"]],
        buttons: [
            {
                extend: 'copyHtml5',
                titleAttr: 'Copy',
                //messageTop: message,
                exportOptions: {
                    columns: function (idx, data, node) {
                        return table.column(idx).visible();
                    }
                }
            },
            {
                extend: 'csvHtml5',
                titleAttr: 'CSV',
                //messageTop: message,
                exportOptions: {
                    columns: function (idx, data, node) {
                        return table.column(idx).visible();
                    }
                }
            },
            {
                extend: 'excelHtml5',
                titleAttr: 'Excel',
                //messageTop: message,
                exportOptions: {
                    columns: function (idx, data, node) {
                        return table.column(idx).visible();
                    }
                }
            },
            //{
            //    extend: 'pdfHtml5',
            //    titleAttr: 'PDF',
            //    //messageTop: message,
            //    exportOptions: {
            //        columns: function (idx, data, node) {

            //            return table.column(idx).visible();
            //        }
            //    }
            //},
            {
                extend: 'print',
                titleAttr: 'Print',
                messageTop: message,
                autoPrint: true,
                exportOptions: {
                    stripHtml: false,
                    columns: function (idx, data, node) {
                        return table.column(idx).visible();
                    }
                }
            }
        ],
        select: true
    });

}


function loadDataUsingPreDefinedColumnOnPage1(tblheader, data, displayOrder, displayid, tableid) {
    if (tableid == null) {
        tableid = 'example';
    }
    var tab = $('<table id=' + tableid + ' class="table compact table-hover table-striped table-bordered nowrap" ></table>');
    var thead = $('<thead></thead>');
    var theadrow = $('<tr></tr>');

    var tfoot = $('<tfoot></tfoot>');
    var tfootrow = $('<tr></tr>');

    var l = tblheader.length;
    var colspan = 0;
    for (var i = 0; i < l; i++) {
        var val = tblheader[i]
        colspan = colspan + 1;
        // Append header here
        if (i > 0) {
            theadrow.append('<th class="sum">' + val.HeaderText + '</th>');
        }
        else {
            theadrow.append('<th>' + val.HeaderText + '</th>');
        }
        // Append footerrow here        
    }

    thead.append(theadrow);

    tab.append(thead);
    var tbody = $('<tbody></tbody>');
    if (JSON.stringify(data).length > 2) {
        $.each(data, function (i, obj) {

            var trow = $('<tr></tr>');
            $.each(tblheader, function (j, val) {
                var key = val.HeaderValue;
                var value = obj[key];
                if (value == 'undefined' || value == null) { value = "" }
                if (key == "Id" || key == "#") {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + obj[val.Value] + ' /></td>');
                }
                else {
                    if (val.ImageColumn == "Yes") {
                        trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : ("https://testeesassin.co.in/Uploading/" + value)) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        var cellvalue = (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value));
                        if (j > 0) {
                            trow.append('<td class="sum" ondblclick="angular.element(this).scope().dbClick();">' + cellvalue + '</td>');
                        }
                        else {
                            trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + cellvalue + '</td>');
                        }
                    }
                }
            });

            tbody.append(trow);
        });
        //alert($($(tab).html()).find('tbody tr').length)
        ////
        $.each($(tbody).find('tr'), function () {
            var tatalamount;
            var index = $(this).index();
            var tbodytd = $(this).find('td');
            $.each(tbodytd, function (i, val) {
                var cellvalue = angular.element(val).text();
                if ($.isNumeric(cellvalue)) {
                    if ($.isNumeric(tatalamount))
                        tatalamount = tatalamount + Number(cellvalue);
                    else
                        tatalamount = Number(cellvalue);
                }
            });


            if ($.isNumeric(tatalamount)) {
                $(tbody).find('tr:eq(' + (index) + ') td:eq(' + (tbodytd.length - 1) + ')').html('<p style="font-weight:500">' + tatalamount + '</p>');
            }
        });

        $.each($(thead).find('tr th'), function () {
            var tatalamount;
            var index = $(this).index();
            $.each($(tbody).find('tr'), function () {
                var tbodytd = $(this).find('td')[index];
                var cellvalue = angular.element(tbodytd).text();
                if ($.isNumeric(cellvalue)) {
                    if ($.isNumeric(tatalamount))
                        tatalamount = tatalamount + Number(cellvalue);
                    else
                        tatalamount = Number(cellvalue);
                }
            });

            if ($.isNumeric(tatalamount))
                tfootrow.append('<td><p style="font-weight:500">' + tatalamount + '</p></td>');
            else
                tfootrow.append('<td><p style="font-weight:500">Total</p></td>');
        });
    }
    else {
        var trow = $('<tr><td style="text-align:center" colspan=' + colspan + '>No Record Found!</td></tr>');
        tbody.append(trow);
    }

    tab.append(tbody);

    tfoot.append(tfootrow);
    tab.append(tfoot);



    if (displayid == null)
        $("#UpdatePanel").html(tab);
    else
        $(displayid).html(tab);

    if (JSON.stringify(data).length > 2) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.append("BasicDatatable1('" + tableid + "')");

        if (displayid == null)
            $("#UpdatePanel").append(script);
        else
            $(displayid).append(script);
    }

    angular.element(document).scope().hideLoader();
};

function BasicDatatable1(tableid) {
    if (tableid == null) {
        tableid = "example";
    }
    var table = $('#' + tableid).DataTable({
        "paging": false,
        "ordering": false,
        "info": false,
        "searching": false,
        //"scrollX": true,
        colReorder: true,
        realtime: true,
        responsive: false
    });
}

var logo = "";

function getBase64Image() {
    try {
        var element = $('.ReportHeader');
        //var h = $(element)[0].ownerDocument.defaultView.innerHeight;
        //$(element)[0].ownerDocument.defaultView.innerHeight = $(element).height();

        html2canvas(element).then(canvas => {
            try {
                logo = canvas.toDataURL("image/png");
                $('#cover-spin').attr('style', 'display:none;');
            }
            catch (err) {
                $('#cover-spin').attr('style', 'display:none;');
            }
        });
    }
    catch (err) {
        $('#cover-spin').attr('style', 'display:none;');
    }

}
var oldClass = "";
var fontSize = "12";
function resizeFont() {
    ////
    var classname = $('#ddlFonts option:selected').val();
    fontSize = $('#ddlFonts option:selected').text();
    $('.dataTable').find('thead th').removeClass(oldClass);
    $('#example').find('td').removeClass(oldClass);
    $('#FilterTitle').removeClass(oldClass);
    oldClass = classname;
    $('.dataTable').find('thead th').addClass(classname);
    $('#example').find('td').addClass(classname);
    $('#FilterTitle').addClass(oldClass);
}

var tooglecount = 0;

var messagevalues = [];
function datatable(hideColumn, backward) {
    $("#example").colResizable({ disable: true });

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
                    else { message = message + seprator + filter; }
                    message = message + "<span class='filter-title-name' >" + key + "</span> : <span class='filter-title'>" + val + "</span>"
                    seprator = ", ";

                    filter = "";
                };
            });
        });
    if (message.length > 0) {
        message = '' + message + '';
    }

    if (hideColumn != null) {
        hideColumn = hideColumn.split(',');
    };

    if (colOrder != "") {
        var order = [[colIndex, colOrder]]
    }
    else {
        var order = [];
    }

    if (hideColumn != null && hideColumn.length > 0 && hideColumn[0] != "") {
        var columnDefs = [];
        for (var i = 0; i < hideColumn.length; i++) {
            var val = hideColumn[i]
            columnDefs.push({
                "targets": [Number(val)],
                "visible": false
                //"searchable": false 
            })
        }
        $('#example').append('<caption style="caption-side: center"><div id="FilterTitle">' + message + '</div></caption>');
        //alert(JSON.stringify(columnDefs));
        var table = $('#example').DataTable({
            "order": order,
            "columnDefs": columnDefs,
            colReorder: true,
            realtime: true,
            responsive: false,
            "scrollX": true,
            dom: 'lBfrtip',
            "iDisplayLength": -1,
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            fnInitComplete: function () {
                var div = $('<div class="ReportHeader"></div>')
                div.append($('#ReportHeader').html());
                $(div).insertBefore($("#example_wrapper"));
                setTimeout(function () {
                    $('#cover-spin').attr('style', 'display:block;');
                    setTimeout(getBase64Image, 500);
                }, 100);
            },
            buttons: [
                {
                    extend: 'copyHtml5',
                    titleAttr: 'Copy',
                    //messageTop: message,
                    exportOptions: {
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    }
                },
                {
                    extend: 'csvHtml5',
                    titleAttr: 'CSV',
                    //messageTop: message,
                    exportOptions: {
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    }
                },
                {
                    extend: 'excelHtml5',
                    titleAttr: 'Excel',
                    //messageTop: message,
                    exportOptions: {
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    },
                    customize: function (xlsx) {
                        var sheet = xlsx.xl['styles.xml'];
                        var tagName = sheet.getElementsByTagName('sz');
                        for (i = 0; i < tagName.length; i++) {
                            tagName[i].setAttribute("val", fontSize)
                        }
                    }
                }, 
                {
                    extend: 'print',
                    titleAttr: 'Print',
                    messageTop: message,
                    autoPrint: true,
                    footer: addfunfoot == 1 ? true : false,
                    exportOptions: {
                        stripHtml: false,
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    },
                    customize: function (win) {
                       
                        var url = window.location.href.replace(window.location.pathname, '');
                        var title = $(win.document.head).find('title');
                        $(win.document.head).html('').append(title).append('<link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" rel="stylesheet" />').append('<link href="../Content/plugins/assets/css/print/print-main.css" rel="stylesheet" />');

                        $(win.document.head).append('<style>table.dataTable thead .sorting:before, table.dataTable thead .sorting_asc:before, table.dataTable thead .sorting_desc:before, table.dataTable thead .sorting_asc_disabled:before, table.dataTable thead .sorting_desc_disabled:before {opacity: 0;}table.dataTable thead .sorting:after, table.dataTable thead .sorting_asc:after, table.dataTable thead .sorting_desc:after, table.dataTable thead .sorting_asc_disabled:after, table.dataTable thead .sorting_desc_disabled:after {opacity: 0;}</style>');

                        $(win.document.head).append('<script>var x = document.getElementsByTagName("img");for (var i = 0; i < x.length-1; i++) {var src=x[i].src; x[i].src = src;};</script>');
                        var div = $('<div class="ReportHeader"></div>')

                        div.append($('#ReportHeader').html());
                        $(win.document.body).prepend(div);
                        //$(win.document.body)
                        //    .prepend('<img src=' + logo + ' style="width:100%" />');

                        $(win.document.body).find('table')
                            .addClass('compact')
                            .css('font-size', 'inherit');

                        $(win.document.body).find('table tbody td')
                            .css('font-size', fontSize);

                        $(win.document.body).find('table thead th')
                            .css('font-size', fontSize);
                        var setFilterSize = Number(fontSize) + 3;

                        $(win.document.body).find('div').css('font-size', setFilterSize);
                        $(win.document.body).find('div').addClass('filter-toggle');

                        var tbl = $('.dataTables_scrollHeadInner').find('table');
                        var thead = $(tbl).find('thead');
                        $(win.document.body).find('thead').html($(thead).html());

                        var tbl1 = $('.dataTables_scrollBody').find('table');
                        var tbody = $(tbl1).find('tbody');
                        $(win.document.body).find('table.dataTable tbody').html($(tbody).html());

                        var tbl2 = $('.dataTables_scrollFootInner').find('table');
                        var tfoot = $(tbl2).find('tfoot');
                        $(win.document.body).find('table.dataTable tfoot').html($(tfoot).html());
                    }
                }
            ],
            select: true

        });
    }
    else {
        $('#example').append('<caption style="caption-side: center"><div id="FilterTitle">' + message + '</div></caption>');
        var table = $('#example').DataTable({
            "order": order,
            colReorder: true,
            realtime: true,
            responsive: false,
            "scrollX": true,
            dom: 'lBfrtip',
            "iDisplayLength": -1,
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            fnInitComplete: function () {
                var div = $('<div class="ReportHeader"></div>')
                div.append($('#ReportHeader').html());
                $(div).insertBefore($("#example_wrapper"));
                setTimeout(function () { $('#cover-spin').attr('style', 'display:block;'); setTimeout(getBase64Image, 500); }, 100);
            },
            buttons: [
                {
                    extend: 'copyHtml5',
                    titleAttr: 'Copy',
                    //messageTop: message,
                    exportOptions: {
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    }
                },
                {
                    extend: 'csvHtml5',
                    titleAttr: 'CSV',
                    //messageTop: message,
                    exportOptions: {
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    }
                },
                {
                    extend: 'excelHtml5',
                    titleAttr: 'Excel',
                    //messageTop: message,
                    exportOptions: {
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    },
                    customize: function (xlsx) {
                        var sheet = xlsx.xl['styles.xml'];
                        var tagName = sheet.getElementsByTagName('sz');
                        for (i = 0; i < tagName.length; i++) {
                            tagName[i].setAttribute("val", fontSize)
                        }
                    }
                },
                //{
                //    extend: 'pdfHtml5',
                //    titleAttr: 'PDF',
                //    //messageTop: message,
                //    exportOptions: {
                //        columns: function (idx, data, node) {

                //            return table.column(idx).visible();
                //        }
                //    },
                //    customize: function (doc) {
                //        doc.defaultStyle.fontSize = fontSize;
                //        //Remove the title created by datatTables
                //        //doc.content.splice(1, 0);
                //        //Create a date string that we use in the footer. Format is dd-mm-yyyy
                //        doc.content.splice(1, 0);
                //        var now = new Date();
                //        var jsDate = now.getDate() + '-' + (now.getMonth() + 1) + '-' + now.getFullYear();
                //        // Logo converted to base64
                //        doc.styles.tableHeader.alignment = 'left';
                //        //var col = $('#example').DataTable().columns(':visible').nodes().length;
                //        //var widths = ["*"];
                //        //for (var i = 1; i < col; i++) {
                //        //    widths.push("*");
                //        //}
                //        //doc.content[1].table.widths = widths;
                //        //var imgs = $('.ReportHeader').find('img');
                //        //var base64 = getBase64Image(document.getElementById("imageid"));
                //        //var image1 = getBase64ImageUsingImage(imgs[0]);

                //        // The above call should work, but not when called from codepen.io
                //        // So we use a online converter and paste the string in.
                //        // Done on http://codebeautify.org/image-to-base64-converter
                //        // It's a LONG string scroll down to see the rest of the code !!!



                //        // A documentation reference can be found at
                //        // https://github.com/bpampuch/pdfmake#getting-started
                //        // Set page margins [left,top,right,bottom] or [horizontal,vertical]
                //        // or one number for equal spread
                //        // It's important to create enough space at the top for a header !!!
                //        doc.pageMargins = [10, 100, 20, 20];

                //        // Set the font size fot the entire document
                //        //doc.defaultStyle.fontSize = 7;
                //        // Set the fontsize for the table header
                //        //doc.styles.tableHeader.fontSize = 7;
                //        // Create a header object with 3 columns
                //        // Left side: Logo
                //        // Middle: brandname
                //        // Right side: A document title
                //        //alert(logo)
                //        doc['header'] = (function () {
                //            return {
                //                columns: [
                //                    //{
                //                    //    image: image1,
                //                    //    width: 50
                //                    //},
                //                    {
                //                        margin: [0, 30, 0, 0],
                //                        alignment: 'center',
                //                        image: logo,
                //                        width: 600
                //                    }
                //                    //{
                //                    //    alignment: 'right',
                //                    //    fontSize: 14,
                //                    //    text: 'Custom PDF export with dataTables'
                //                    //}
                //                ]

                //            }
                //        });
                //        // Create a footer object with 2 columns
                //        // Left side: report creation date
                //        // Right side: current page and total pages
                //        doc['footer'] = (function (page, pages) {
                //            return {
                //                columns: [
                //                    {
                //                        margin: [20, 0, 0, 0],
                //                        alignment: 'left',
                //                        text: ['Created on: ', { text: jsDate.toString() }]
                //                    },
                //                    {
                //                        margin: [0, 0, 20, 0],
                //                        alignment: 'right',
                //                        text: ['page ', { text: page.toString() }, ' of ', { text: pages.toString() }]
                //                    }
                //                ]
                //            }
                //        });


                //        // Change dataTable layout (Table styling)
                //        // To use predefined layouts uncomment the line below and comment the custom lines below
                //        // doc.content[0].layout = 'lightHorizontalLines'; // noBorders , headerLineOnly
                //        //var objLayout = {};
                //        //objLayout['hLineWidth'] = function (i) { return .5; };
                //        //objLayout['vLineWidth'] = function (i) { return .5; };
                //        //objLayout['hLineColor'] = function (i) { return '#aaa'; };
                //        //objLayout['vLineColor'] = function (i) { return '#aaa'; };
                //        //objLayout['paddingLeft'] = function (i) { return 4; };
                //        //objLayout['paddingRight'] = function (i) { return 4; };
                //        //doc.content[0].layout = objLayout;
                //    }
                //},
                {
                    extend: 'print',
                    titleAttr: 'Print',
                    messageTop: message,
                    autoPrint: true,
                    footer: addfunfoot == 1 ? true : false,
                    exportOptions: {
                        stripHtml: false,
                        columns: function (idx, data, node) {
                            return table.column(idx).visible();
                        }
                    },
                    customize: function (win) {
                        var url = window.location.href.replace(window.location.pathname, '');
                        var title = $(win.document.head).find('title'); 
                        $(win.document.head).html('').append(title).append('<link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" rel="stylesheet" />').append('<link href="../Content/plugins/assets/css/print/print-main.css" rel="stylesheet" />');

                        $(win.document.head).append('<style>table.dataTable thead .sorting:before, table.dataTable thead .sorting_asc:before, table.dataTable thead .sorting_desc:before, table.dataTable thead .sorting_asc_disabled:before, table.dataTable thead .sorting_desc_disabled:before {opacity: 0;}table.dataTable thead .sorting:after, table.dataTable thead .sorting_asc:after, table.dataTable thead .sorting_desc:after, table.dataTable thead .sorting_asc_disabled:after, table.dataTable thead .sorting_desc_disabled:after {opacity: 0;}</style>');

                        $(win.document.head).append('<script>var x = document.getElementsByTagName("img");for (var i = 0; i < x.length-1; i++) {var src=x[i].src; x[i].src = src;};</script>');
                        var div = $('<div class="ReportHeader"></div>')

                        div.append($('#ReportHeader').html());
                        $(win.document.body).prepend(div);
                        //$(win.document.body)
                        //    .prepend('<img src=' + logo + ' style="width:100%" />');

                        $(win.document.body).find('table')
                            .addClass('compact')
                            .css('font-size', 'inherit');

                        $(win.document.body).find('table tbody td')
                            .css('font-size', fontSize);

                        $(win.document.body).find('table thead th')
                            .css('font-size', fontSize);

                        var setFilterSize = Number(fontSize) + 3;

                        $(win.document.body).find('div').css('font-size', setFilterSize);
                        $(win.document.body).find('div').addClass('filter-toggle');

                        var tbl = $('.dataTables_scrollHeadInner').find('table');
                        var thead = $(tbl).find('thead');
                        $(win.document.body).find('thead').html($(thead).html());

                        var tbl1 = $('.dataTables_scrollBody').find('table');
                        var tbody = $(tbl1).find('tbody');
                        $(win.document.body).find('table.dataTable tbody').html($(tbody).html());

                        var tbl2 = $('.dataTables_scrollFootInner').find('table');
                        var tfoot = $(tbl2).find('tfoot');
                        $(win.document.body).find('table.dataTable tfoot').html($(tfoot).html());

                    }
                }
            ],
            select: true
        });
    }

    var iframeBoxHeight = $(".autoheightset").height();
    var iframeBoxWidth = $(".autoheightset").width();


    var TabAddHeight = $("#TabAddHeight").attr("TabAddHeight");
    var AddHeight = isNaN(TabAddHeight) ? 0 : parseInt(TabAddHeight);

    if (iframeBoxWidth > 640) {
        var DataTablesHeight = iframeBoxHeight - (255 + AddHeight);  //228
        $("#example_wrapper .dataTables_scroll").find(".dataTables_scrollBody").css("max-height", DataTablesHeight);
        $('.dataTables_length').addClass('bs-select');
    }
    else if ((iframeBoxWidth <= 640) && (iframeBoxWidth > 480)) {
        var DataTablesHeight = iframeBoxHeight - (290 + AddHeight);  //228
        $("#example_wrapper .dataTables_scroll").find(".dataTables_scrollBody").css("max-height", DataTablesHeight);
        $('.dataTables_length').addClass('bs-select');
    }
    else if ((iframeBoxWidth <= 480) && (iframeBoxWidth >= 412)) {
        var DataTablesHeight = iframeBoxHeight - (335 + AddHeight);  //228
        $("#example_wrapper .dataTables_scroll").find(".dataTables_scrollBody").css("max-height", DataTablesHeight);
        $('.dataTables_length').addClass('bs-select');
    }
    else {
        var DataTablesHeight = iframeBoxHeight - 330;  //228
        $("#example_wrapper .dataTables_scroll").find(".dataTables_scrollBody").css("max-height", DataTablesHeight);
        $('.dataTables_length').addClass('bs-select');
    }



    if ($('#example thead th').length <= 1) {
        $('#example thead').attr("style", "display: none;");
        $('#example tfoot').attr("style", "display: none;");
    }
    //Apply the search
    table.columns().every(function () {
        var that = this;

        $('input', this.footer()).on('keyup change', function () {
            if (that.search() !== this.value) {
                that
                    .search(this.value)
                    .draw();
            }
        });
    });

    $('input.toggle-vis').on('change', function (e) {

        e.preventDefault();

        //Get the column API object
        var column = table.column($(this).attr('data-column'));

        //Toggle the visibility
        column.visible(!column.visible());
    });

    $('#example thead').on('click', 'th', function (e) {

        e.preventDefault();

        colIndex = $(this).index();

        if (colOrder == "desc") {
            colOrder = "asc"
        }
        else {
            colOrder = "desc"
        }
    });

    //$('#example tbody').on('click', 'td', function (e) {
    //    e.preventDefault();
    //    var tfootinput = $('#example tfoot tr th input');
    //    tfootinput[$(this).index()].focus();
    //});
    //$("#example").colResizable({
    //    liveDrag: true,
    //    gripInnerHtml: "<div class='grip'></div>",
    //    draggingClass: "dragging",
    //    resizeMode: 'fit'
    //});

    setTimeout(function () {
        $('#example').DataTable().columns.adjust().draw();
    }, 500);

    if (tooglecount == 0) {
        $(".section-toggle").slideToggle('slow');
        $(".filter-toggle").css("display", "block");
        if (backward == null)
            backward = 0;
        if (backward == 1) {
            if ($(document).find('#backward').length == 0)
                $('.pull-right.float-right').prepend('<a id="backward" href="#" class="pull-left inline-block mr-15"><i class="fa fa-backward" aria-hidden="true" onclick="angular.element(document).scope().MoveBack();"></i></a>')
        }
    }


    $('.refresh-container').fadeOut(2000);
}
//------End JS for DataTable--------------//
//------Start JS for Search DropDownList && Widget--------------//
function a() {
    $(".chzn-select").select2(), $("#destination").mask("99999"), $("#credit").mask("9999-9999-9999-9999"), $("#expiration-date").datetimepicker({
        format: !1
    }), $(".widget").widgster()
}
//------End JS for Search DropDownList && Widget--------------//
function MergeCommonRows(tableid) {
    //alert(table.find('th').length);

    var table = $(tableid);
    var firstColumnBrakes = [];
    // iterate through the columns instead of passing each column as function parameter:

    for (var i = 1; i <= table.find('th').length; i++) {
        var previous = null, cellToExtend = null, rowspan = 1;
        table.find("td:nth-child(" + i + ")").each(function (index, e) {
            var jthis = $(this), content = jthis.text();
            // check if current row "break" exist in the array. If not, then extend rowspan:
            if (previous == content && content !== "" && $.inArray(index, firstColumnBrakes) === -1) {
                // hide the row instead of remove(), so the DOM index won't "move" inside loop.
                jthis.addClass('hidden');
                cellToExtend.attr("rowspan", (rowspan = rowspan + 1));
            } else {
                // store row breaks only for the first column:
                if (i === 1) firstColumnBrakes.push(index);
                rowspan = 1;
                previous = content;
                cellToExtend = jthis;
            }
        });
    }
    // now remove hidden td's (or leave them hidden if you wish):
    $('td.hidden').remove();
}

//------Start JS for Virtual table--------------//
function loadPDataTable(tblconid, tblid, tblheader, tblrows, showColumn, imageColumn) {

    var tab = $('<table id=' + tblid + ' class="table table-striped table-bordered nowrap" style="width:100%"></table>');
    var thead = $('<thead></thead>');
    var theadrow = $('<tr></tr>');

    //var tfoot = $('<tfoot></tfoot>');
    //var tfootrow = $('<tr></tr>');

    var l = tblheader.length;
    for (var i = 0; i < l; i++) {
        var val = tblheader[i]
        var flag = true;
        if (showColumn != null) { flag = jQuery.inArray(i, showColumn) == -1 ? false : true; }
        if (flag) {
            if ($('#anchor label').text() != '') {
                if ($('#anchor label').text().indexOf(val.Header) == -1) {
                    $("#anchor").append('<input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="lbl-padding-25">' + val.Header + '</label>');
                }
            }
            else {
                $("#anchor").append('<input type="checkbox" class="toggle-vis" data-column=' + i + ' checked><label class="lbl-padding-25">' + val.Header + '</label>');
            }

        }
        else {
            if ($('#anchor label').text().indexOf(val.Header) == -1) {
                $("#anchor").append('<input type="checkbox" class="toggle-vis" data-column=' + i + '><label class="lbl-padding-25">' + val.Header + '</label>');
            }
        }
        // Append header here
        theadrow.append('<th>' + val.Header + '</th>');
        // Append footerrow here
        //tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + val.Header + '" /></th>');
    }

    thead.append(theadrow);
    tab.append(thead);

    var p = tblrows.length;
    for (var i = 0; i < p; i++) {
        var val = tblrows[i]
        var trow = $('<tr></tr>');
        for (var key in val) {
            if (key == "Id" || key == "#") {
                trow.append('<td>' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + val[key] + ' /></td>');
            }
            else {
                if (imageColumn != null) {
                    var showImage = jQuery.inArray(key, imageColumn) == -1 ? false : true;

                    if (showImage) {
                        trow.append('<td><img src="../' + (val[key] == null ? '../content/photos/default-user.png' : ("https://testeesassin.co.in/Uploading/" + val[key])) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        trow.append('<td>' + val[key] + '</td>');
                    }
                }
                else {
                    trow.append('<td>' + val[key] + '</td>');
                }
            }
        };
        tab.append(trow);
    };

    //tfoot.append(tfootrow);
    //tab.append(tfoot);
    $("#" + tblconid).html(tab);


    var hideColumn = [];
    var m = $('#anchor input[type="checkbox"]');
    for (var i = 0; i < m.length; i++) {

        if (!$(m[i]).prop('checked')) {
            hideColumn.push(i);
        }
    }

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.append("datatable('" + hideColumn + "')");
    $("#" + tblconid).append(script);


    angular.element(document).scope().hideLoader();
};
function loadPSDataTable(tblid, tblrows, showColumn, imageColumn) {
    var p = tblrows.length;
    for (var i = 0; i < p; i++) {
        var val = tblrows[i]
        var trow = $('<tr></tr>');
        for (var key in val) {
            if (key == "Id" || key == "#") {
                trow.append('<td>' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + val[key] + ' /></td>');
            }
            else {
                if (imageColumn != null) {
                    var showImage = jQuery.inArray(key, imageColumn) == -1 ? false : true;

                    if (showImage) {
                        trow.append('<td><img src="../' + (val[key] == null ? '../content/photos/default-user.png' : val[key]) + '" width="50px" height="50px"></td>');
                    }
                    else {
                        trow.append('<td>' + val[key] + '</td>');
                    }
                }
                else {
                    trow.append('<td>' + val[key] + '</td>');
                }
            }
        };
        $("#" + tblid + " tbody").append(trow);
    };

    angular.element(document).scope().hideLoader();
};
function loadVirtualDataTablesUsingPreDefinedColumnOnPage(tblheader, data, displayid, tableid) {
    if (tableid == null) {
        tableid = 'vitual';
    }
    var tab = $('<table id=' + tableid + ' class="table compact table-hover table-striped table-bordered nowrap" ></table>');
    var thead = $('<thead></thead>');
    var theadrow = $('<tr></tr>');

    //var tfoot = $('<tfoot></tfoot>');
    //var tfootrow = $('<tr></tr>');

    var l = tblheader.length;
    for (var i = 0; i < l; i++) {
        var val = tblheader[i]
        // Append header here
        theadrow.append('<th>' + val.HeaderText + '</th>');
        // Append footerrow here
        //tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + val.HeaderText + '" /></th>');
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
                trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + obj[val.Value] + ' /></td>');
            }
            else {
                if (val.ImageColumn == "Yes") {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                }
                else {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value)) + '</td>');
                }
            }
        });
        tbody.append(trow);
    });
    tab.append(tbody);

    //tfoot.append(tfootrow);
    //tab.append(tfoot);
    if (displayid == null)
        $("#VUpdatePanel").html(tab);
    else
        $(displayid).html(tab);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.append("BasicDatatable('" + tableid + "')");

    if (displayid == null)
        $("#VUpdatePanel").append(script);
    else
        $(displayid).append(script);

    angular.element(document).scope().hideLoader();
};
//------End JS for Virtual table--------------//
function loadVirtualDataTablesUsingPreDefinedColumnOnPage(tblheader, data, displayid, tableid) {
    if (tableid == null) {
        tableid = 'vitual';
    }
    var tab = $('<table id=' + tableid + ' class="table compact table-hover table-striped table-bordered nowrap" ></table>');
    var thead = $('<thead></thead>');
    var theadrow = $('<tr></tr>');

    //var tfoot = $('<tfoot></tfoot>');
    //var tfootrow = $('<tr></tr>');

    var l = tblheader.length;
    for (var i = 0; i < l; i++) {
        var val = tblheader[i]
        // Append header here
        theadrow.append('<th>' + val.HeaderText + '</th>');
        // Append footerrow here
        //tfootrow.append('<th><input type="text" class="form-control form-control-sm" style="width:' + val.Width + '" placeholder="' + val.HeaderText + '" /></th>');
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
                trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (i + 1) + '<input type="hidden" id="hdId_' + i + '" name="Id" value=' + obj[val.Value] + ' /></td>');
            }
            else {
                if (val.ImageColumn == "Yes") {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();"><img src="../' + ((value == null || value == "") ? '../content/photos/default-user.png' : value) + '" width="50px" height="50px"></td>');
                }
                else {
                    trow.append('<td ondblclick="angular.element(this).scope().dbClick();">' + (typeof (value) == 'boolean' ? (value == true ? "Yes" : "No") : Replace(value)) + '</td>');
                }
            }
        });
        tbody.append(trow);
    });
    tab.append(tbody);

    //tfoot.append(tfootrow);
    //tab.append(tfoot);
    if (displayid == null)
        $("#VUpdatePanel").html(tab);
    else
        $(displayid).html(tab);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.append("BasicDatatable('" + tableid + "')");

    if (displayid == null)
        $("#VUpdatePanel").append(script);
    else
        $(displayid).append(script);

    angular.element(document).scope().hideLoader();
};
function Print(title, print) {

    var print = print;
    var popupWin = window.open('', '_blank');
    popupWin.document.open();
    var head = '<html><head><title>' + title + '</title><meta charset="utf-8" /><script src="../scripts/jquery-1.12.4.js"></script><link href="../Content/plugins/assets/css/print/print-bootstrap.min.css" media="all" rel="stylesheet" /><link href="../Content/plugins/assets/css/print/print-main.css" media="all" rel="stylesheet" /></head><body onload="window.print()" style="background:#fff;">' + print + '</body></html>';
    popupWin.document.write(head);
    setTimeout(function () { popupWin.document.close(); }, 1000);
}


function convertNumberToWords(amount) {
    var words = new Array();
    words[0] = '';
    words[1] = 'One';
    words[2] = 'Two';
    words[3] = 'Three';
    words[4] = 'Four';
    words[5] = 'Five';
    words[6] = 'Six';
    words[7] = 'Seven';
    words[8] = 'Eight';
    words[9] = 'Nine';
    words[10] = 'Ten';
    words[11] = 'Eleven';
    words[12] = 'Twelve';
    words[13] = 'Thirteen';
    words[14] = 'Fourteen';
    words[15] = 'Fifteen';
    words[16] = 'Sixteen';
    words[17] = 'Seventeen';
    words[18] = 'Eighteen';
    words[19] = 'Nineteen';
    words[20] = 'Twenty';
    words[30] = 'Thirty';
    words[40] = 'Forty';
    words[50] = 'Fifty';
    words[60] = 'Sixty';
    words[70] = 'Seventy';
    words[80] = 'Eighty';
    words[90] = 'Ninety';
    amount = amount.toString();
    var atemp = amount.split(".");
    var number = atemp[0].split(",").join("");
    var n_length = number.length;
    var words_string = "";
    if (n_length <= 9) {
        var n_array = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0);
        var received_n_array = new Array();
        for (var i = 0; i < n_length; i++) {
            received_n_array[i] = number.substr(i, 1);
        }
        for (var i = 9 - n_length, j = 0; i < 9; i++, j++) {
            n_array[i] = received_n_array[j];
        }
        for (var i = 0, j = 1; i < 9; i++, j++) {
            if (i == 0 || i == 2 || i == 4 || i == 7) {
                if (n_array[i] == 1) {
                    n_array[j] = 10 + parseInt(n_array[j]);
                    n_array[i] = 0;
                }
            }
        }
        value = "";
        for (var i = 0; i < 9; i++) {
            if (i == 0 || i == 2 || i == 4 || i == 7) {
                value = n_array[i] * 10;
            } else {
                value = n_array[i];
            }
            if (value != 0) {
                words_string += words[value] + " ";
            }
            if ((i == 1 && value != 0) || (i == 0 && value != 0 && n_array[i + 1] == 0)) {
                words_string += "Crores ";
            }
            if ((i == 3 && value != 0) || (i == 2 && value != 0 && n_array[i + 1] == 0)) {
                words_string += "Lakhs ";
            }
            if ((i == 5 && value != 0) || (i == 4 && value != 0 && n_array[i + 1] == 0)) {
                words_string += "Thousand ";
            }
            if (i == 6 && value != 0 && (n_array[i + 1] != 0 && n_array[i + 2] != 0)) {
                words_string += "Hundred and ";
            } else if (i == 6 && value != 0) {
                words_string += "Hundred ";
            }
        }
        words_string = words_string.split("  ").join(" ");
    }
    return words_string;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function looselyMatch(requiredText, extractedText) {

    if (!requiredText || !extractedText) {
        return false;
    }

    const normalize = text => text
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')  // remove punctuation
        .split(/\s+/);             // split into words

    const requiredWords = normalize(requiredText);
    const extractedWords = normalize(extractedText);

    let matchedCount = 0;

    requiredWords.forEach(reqWord => {
        for (let word of extractedWords) {
            // basic stemming: match if startsWith or difference is 1 character (like THANK/THANKS)
            if (word.startsWith(reqWord)) {
                matchedCount++;
                break;
            }
        }
    });

    // if at least 70% of required words matched, consider valid
    return matchedCount / requiredWords.length >= 0.7;
}
//-----------------------------------------------------------get match text
 
 


//---------------------------------------------validation for file-----------------------





function getdetail(file, FileName, ocrText, callback) {
    debugger;
    const fileType = file.type;

    const isPDF = fileType === "application/pdf";
    const isImage = fileType.startsWith("image/");

    if (!isPDF && !isImage) {
        alert("Only PDF and Image files are allowed.");
        callback(false);
        return;
    }

    function validateText(text) {
        debugger;
        text = text.toUpperCase();

        let isValid = false;
        let data = {};

        //================== AADHAAR ==================
        if (FileName == "Aadhaar Card")
        {
            debugger;
            alert('Aadhaar');
            alert(text);
            data.AadhaarNo = (text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/) || [])[0] || "";

            data.DOB = (text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/) || [])[0] || "";
            const nameMatch = text.match(/([A-Za-z ]+)\s*(?:DOB|YEAR OF BIRTH|YOB)/i);

            if (nameMatch) {
                data.Name = nameMatch[1].trim();
            }
            data.Address = "";

            const pinMatch = text.match(/\b\d{6}\b/);

            if (pinMatch) {

                let pin = pinMatch[0];

                // PIN code ki position
                let pinIndex = text.indexOf(pin);

                // PIN se 250 characters pehle ka text lo
                let start = Math.max(0, pinIndex - 250);

                let addressText = text.substring(start, pinIndex + 6);

                // Unwanted words hatao
                addressText = addressText
                    .replace(/UNIQUE IDENTIFICATION AUTHORITY OF INDIA/gi, "")
                    .replace(/GOVERNMENT OF INDIA/gi, "")
                    .replace(/AADHAAR/gi, "")
                    .replace(/VID\s*:\s*\d+/gi, "")
                    .replace(/\d{4}\s?\d{4}\s?\d{4}/g, "") // Aadhaar Number
                    .replace(/\b\d{6}\b/g, "")             // PIN remove
                    .replace(/\s+/g, " ")
                    .trim();

                data.Address = addressText;
            }

            data.Name = ""; // OCR se extract kar sakte ho

            isValid = data.AadhaarNo != "" &&
                data.DOB != "" &&
                data.HasAddress;
        }

        //================== PAN ==================
        else if (FileName == "PAN Card") {

            data.PANNo = (text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/) || [])[0] || "";

            data.HasName = text.includes("NAME");
            data.HasFather = text.includes("FATHER");

            isValid = data.PANNo != "" && data.HasName;
        }

        //================== ESIC ==================
        else if (FileName == "ESIC Card") {

            // ESIC IP Number (10–17 digits)
            data.ESICNo = (text.match(/\b\d{10,17}\b/) || [])[0] || "";

            data.HasName = text.includes("NAME");

            isValid = data.ESICNo != "" && data.HasName;
        }

        //================== UAN ==================
        else if (FileName == "UAN") {

            // UAN = 12 digits
            data.UANNo = (text.match(/\b\d{12}\b/) || [])[0] || "";

            data.HasName =
                text.includes("NAME") ||
                text.includes("MEMBER");

            isValid = data.UANNo != "" && data.HasName;
        }

        console.log(data);

        callback(isValid, data);
    }

    validateText(ocrText); 
    return;
}


function validateDocument(file, SelectedColumn, callback) {
    var collectionobj = {
        Action: 5,
        SelectedColumn: SelectedColumn
    };
   
    $.ajax({
        url: "../Retail/SearchRetailFileMatching",
        method: "POST",
        data: JSON.stringify(collectionobj),
        contentType: "application/json",
        success: function (response) {
            debugger;
            var response = typeof response === 'string' ? JSON.parse(response) : response;

            if (response && response.Result) {

                if (!response.Result.length) {
                    callback(true);
                    return;
                }
                const requiredText = response.Result[0].MatchingText.toUpperCase();
                const fileType = file.type;

                const isPDF = fileType === 'application/pdf';
                const isImage = fileType.startsWith('image/');
                const isExcel = fileType === "application/vnd.ms-excel" ||
                    fileType ===   'text/csv' ||
                    fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                if (!isPDF && !isImage && !isExcel) {
                    alert("Only PDF, Image, or Excel files are allowed.");
                    callback(false);
                    return;
                }

                // ========== PDF HANDLING ================
                //if (isPDF) {
                //    const reader = new FileReader();
                //    reader.onload = function () {
                //        const typedarray = new Uint8Array(reader.result);
                //        pdfjsLib.getDocument({ data: typedarray }).promise.then(function (pdf) {
                //            let matched = false;
                //            let processedPages = 0;

                //            for (let i = 1; i <= pdf.numPages; i++) {
                //                pdf.getPage(i).then(function (page) {
                //                    page.getTextContent().then(function (textContent) {
                //                        let text = '';
                //                        for (let item of textContent.items) {
                //                            text += item.str + ' ';
                //                        }

                //                        if (text.trim().length > 20 && text.toUpperCase().includes(requiredText)) {
                //                            matched = true;
                //                            callback(true);
                //                            return;
                //                        } else {
                //                            // Fallback to OCR
                //                            pdf.getPage(1).then(function (page) {
                //                                const viewport = page.getViewport({ scale: 1.5 }); // Lower scale = faster rendering
                //                                const canvas = document.createElement('canvas');
                //                                const context = canvas.getContext('2d');
                //                                canvas.width = viewport.width;
                //                                canvas.height = viewport.height;

                //                                page.render({ canvasContext: context, viewport: viewport }).promise.then(function () {
                //                                    Tesseract.recognize(canvas, 'eng', { tessjs_create_pdf: '0' }).then(function (result) {
                //                                        // Extract only the top part
                //                                        debugger;
                                                     
                //                                        let extractedText = result.data.text.trim().toUpperCase().slice(0, 500); // 3-4 lines max
                                                      
                //                                       if (looselyMatch(requiredText, extractedText)) {
                //                                            callback(true);
                //                                        } else {
                //                                            callback(false);
                //                                        } 
                //                                    }).catch(function () {
                //                                        alert("OCR failed");
                //                                        callback(false);
                //                                    });
                //                                });
                //                            });

                //                        }

                //                        //// Handle case where all pages processed but not matched
                //                        //if (++processedPages === pdf.numPages && !matched) {
                //                        //    callback(false);
                //                        //}
                //                    });
                //                });
                //            }
                //        }).catch(function () {
                //            alert("Error reading PDF file.");
                //            callback(false);
                //        });
                //    };
                //    reader.readAsArrayBuffer(file);
                //}
                if (isPDF) {
                    const reader = new FileReader();
                    reader.onload = function () {
                        const typedarray = new Uint8Array(reader.result);

                        pdfjsLib.getDocument({ data: typedarray }).promise.then(async function (pdf) {

                            let fullText = '';

                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();

                                textContent.items.forEach(item => {
                                    fullText += item.str + ' ';
                                });
                            }

                            fullText = fullText.trim().toUpperCase();

                            // 🚫 IMAGE BASED PDF CHECK
                            if (fullText.length < 50) {
                                swal("Invalid File", "This PDF is scanned or image-based. Text extraction failed. Please verify the file.", "error");
                               
                                callback(true);
                                return;
                            }

                            // ✅ TEXT MATCH CHECK
                            if (fullText.includes(requiredText)) {
                                callback(true);
                            } else {
                                callback(false);
                            }

                        }).catch(function () {
                            alert("Error reading PDF file.");
                            callback(false);
                        });
                    };
                    reader.readAsArrayBuffer(file);
                }


                // ========== IMAGE HANDLING ================
                else if (isImage) {
                    const reader = new FileReader();
                    reader.onload = function () {
                        Tesseract.recognize(reader.result, 'eng')
                            .then(function (result) {
                                const extractedText = result.data.text.toUpperCase();
                                if (extractedText.includes(requiredText)) {
                                    callback(true);
                                } else {
                                  //  alert("The file you uploaded doesn't seem to be correct. Are you sure this is the right file?");
                                    callback(false);
                                    return;
                                }
                            })
                            .catch(function () {
                                alert("Image OCR failed.");
                                callback(false);
                                return;
                            });
                    };
                    reader.readAsDataURL(file);
                }

                // ========== EXCEL HANDLING ================
                else if (isExcel) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });

                            let allText = '';
                            workbook.SheetNames.forEach(function (sheetName) {
                                const sheet = workbook.Sheets[sheetName];
                                const sheetText = XLSX.utils.sheet_to_csv(sheet);
                                allText += sheetText + ' ';
                            });

                            if (allText.toUpperCase().includes(requiredText)) {
                                callback(true);
                                return;
                            } else {
                                 alert("The file you uploaded doesn't seem to be correct. Upload anyway");
                                callback(true);
                                return;
                            }
                        } catch (err) {
                            alert("Error processing Excel file. Upload anyway");
                            callback(true);
                            return;
                        }
                    };
                    reader.readAsArrayBuffer(file);
                }

            } else {
                alert("Unable to fetch matching text from server. Upload anyway");
                callback(true);
                return;
            }
        },
        error: function () {
            alert("Server error occurred while fetching required text. Upload anyway");
            callback(true);
            return;
        }
    });
}


    //---------------------------------------------------------------