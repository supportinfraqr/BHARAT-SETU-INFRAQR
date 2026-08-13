// JavaScript Document
$(document).ready(function () {
$(".profileicon").click(function(){
  //$(".contentwraper").toggleClass("marginleft");
  $(".sidebar").toggleClass("sidebar-width");
  $(".header").toggleClass("header-width");
});
$(".sidemenutoggle").click(function () {
  $(".contentwraper").toggleClass("menumarginleft");
  $(".menusidebar").toggleClass("menusidebar-width");
  $(".header").toggleClass("menuheader-width");
});
$("ul > li.submenu").click(function(){
  $("ul > li > .collapse").toggleClass("show");
});

$(".searchbtn").click(function(){
  $(".searchbox").toggleClass("search-show");
});

$(".addnote").click(function(){
  $(".addtext-box").slideToggle();
});
$(".shownbook").click(function(){
  $(".notebook-box").slideToggle();
});

$(".scrollwrap").nanoScroller();
$(".n-list-scroll").nanoScroller();
$(".popup-content-scroll").nanoScroller();
$(".left-sidebar").nanoScroller();
$("#create,#toolbox,#create-college").modal({
show:false,
backdrop:'static'
});

$('.datatable').DataTable( {
        //"scrollY":"200px",
        "scrollCollapse": true,
        "paging":true,
		aLengthMenu: [
        [10, 25, 50, 100, 200, -1],
        [10, 25, 50, 100, 200, "All"]
    ],
	
    iDisplayLength: 25
		//"scrollX": true,
    } );
	 $('.datatable').wrap('<div class="table-responsive">'); 	
	 //$(".table").wrap('<div class="table-responsive">');
	 //$("td,th").removeAttr("style");
 
 var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})
});


 
// Example starter JavaScript for disabling form submissions if there are invalid fields
(function () {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.prototype.slice.call(forms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })
})()

 
function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function filterFunction() {
  var input, filter, ul, li, a, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  div = document.getElementById("myDropdown");
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }
}

function savemsg() {
    Swal.fire(
        'Successful',
        'Your data has been saved successfully',
        'success'
    )
}