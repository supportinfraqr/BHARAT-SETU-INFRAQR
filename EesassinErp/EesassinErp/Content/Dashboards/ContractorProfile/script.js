$(document).ready(function () {

    $(".contractorProfile .contractorProfileMenuBtn").on("click", function () {

        var target = $(this).data("target");

        $(".contractorProfile .contractorProfileMenuBtn")
            .removeClass("active");

        $(this).addClass("active");

        $(".contractorProfile .contractorProfileTab")
            .removeClass("active");

        $("#" + target).addClass("active");

    });

});