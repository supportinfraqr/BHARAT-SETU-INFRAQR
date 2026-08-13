Datepicker.language['en'] = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'dd/mm/yy',
    firstDay: 0
};


$(document).ready(function () {
    $("select").change(function () {
        $("select option:selected").each(function () {
            if ($(this).attr("value") == "personal") {
                $(".customwell").hide();
                $(".personal").show();
            }
            if ($(this).attr("value") == "conference") {
                $(".customwell").hide();
                $(".conference").show();
            }
            //if($(this).attr("value")=="blue"){
            //                    $(".box").hide();
            //                    $(".blue").show();
            //                }
            if ($(this).attr("value") == "choose") {
                $(".customwell").hide();
                $(".choose").show();
            }
        });
    }).change();
});