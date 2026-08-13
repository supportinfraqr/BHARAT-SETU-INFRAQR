var app = angular.module('myApp', ['angular.filter', 'ui', 'ui.tinymce', 'ngSanitize'  ]);
 
 
 
$(document).ready(function () {
    function openStoreMaster() {
        $("a[href*='StoreMaster']").trigger("click");
    } 
});


document.addEventListener("keydown", function (e) {
    if (e.key === "PrintScreen") {
        alert("Screenshots are not allowed!");
        e.preventDefault();
    }
});
 
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});
 
document.addEventListener("copy", function (e) {
    alert("Copying is not allowed!");
    e.preventDefault();
});
