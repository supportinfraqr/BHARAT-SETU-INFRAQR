var app = angular.module('myApp', ['angular.filter', 'ui', 'ui.tinymce', 'ngSanitize']);

$(document).ready(function () {
    function openStoreMaster() {
        $("a[href*='StoreMaster']").trigger("click");
    }
});