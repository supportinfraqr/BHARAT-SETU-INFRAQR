var interval;
$(document).on('mousemove', function () {
    document.addEventListener('contextmenu',
              event => event.preventDefault());
    clearInterval(interval);
    var coutdown = 600 , $timer = $('.timer');  
    $timer.text(coutdown);
    interval = setInterval(function () {
        $timer.text(--coutdown);
      
        if (coutdown === 0) {
            swal({
                title: "Session Expire",
                text: "User Logout,Please Login Again",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, Logout ",
                cancelButtonText: "No",
                closeOnConfirm: false,
                closeOnCancel: true
            }, function (isConfirm) {
                if (isConfirm) {
                    logout();
                }
            });

        }

    }, 1000);
}).mousemove();

function logout() {
    window.top.location.href = '../Login/Login';
}

var interval;
$(document).on('keydown', function () {
    document.addEventListener('contextmenu',
              event => event.preventDefault());
    clearInterval(interval);
    var coutdown = 600, $timer = $('.timer');
    $timer.text(coutdown);
    interval = setInterval(function () {
        $timer.text(--coutdown);
      
        if (coutdown === 0) {
            swal({
                title: "Session Expire",
                text: "User Logout,Please Login Again",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, Logout ",
                cancelButtonText: "No",
                closeOnConfirm: false,
                closeOnCancel: true
            }, function (isConfirm) {
                if (isConfirm) {
                    logout();
                }  
            });
           
        }
    }, 1000);
}).mousemove();


$(document).on('keypress', function () {
    document.addEventListener('contextmenu',
              event => event.preventDefault());
    clearInterval(interval);
    var coutdown = 600, $timer = $('.timer');
    $timer.text(coutdown);
    interval = setInterval(function () {
        $timer.text(--coutdown);
      
        if (coutdown === 0) {
            swal({
                title: "Session Expire",
                text: "User Logout,Please Login Again",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, Logout ",
                cancelButtonText: "No",
                closeOnConfirm: false,
                closeOnCancel: true
            }, function (isConfirm) {
                if (isConfirm) {
                    logout();
                }
            });

        }
    }, 1000);
}).mousemove();


$(document).on('keyup', function () {
    document.addEventListener('contextmenu',
              event => event.preventDefault());
    clearInterval(interval);
    var coutdown = 600, $timer = $('.timer');
    $timer.text(coutdown);
    interval = setInterval(function () {
        $timer.text(--coutdown);
       
        if (coutdown === 0) {
            swal({
                title: "Session Expire",
                text: "User Logout,Please Login Again",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, Logout ",
                cancelButtonText: "No",
                closeOnConfirm: false,
                closeOnCancel: true
            }, function (isConfirm) {
                if (isConfirm) {
                    logout();
                }
                else {

                }
            });

        }
    }, 1000);
}).mousemove();