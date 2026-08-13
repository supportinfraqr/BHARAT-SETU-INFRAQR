$(document).ready(function () {

    // DEFAULT VIEW
    $(".sitesGridView").show();
    $(".sitesTableView").hide();

    // TOGGLE BUTTON CLICK
    $(".viewToggleBtn").on("click", function () {

        const selectedView = $(this).attr("data-view");

        // ACTIVE BUTTON
        $(".viewToggleBtn").removeClass("active");
        $(this).addClass("active");

        // SWITCH VIEW
        if (selectedView === "grid") {

            $(".sitesGridView").show();
            $(".sitesTableView").hide();

        } else {

            $(".sitesGridView").hide();
            $(".sitesTableView").show();

        }

    });

});


//  This is for tabs inside the View site Modal 
$(document).on("click", ".siteSegment-btn", function () {

    var target = $(this).data("tab");

    $(".siteSegment-btn").removeClass("active");
    $(this).addClass("active");

    $(".employeeManualPanel").removeClass("active");
    $("#" + target).addClass("active");

});
