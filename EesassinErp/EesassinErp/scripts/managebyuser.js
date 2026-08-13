let interval, popupInterval;
let countdown = 300;
let $timer = $('.timer');

function startCountdown() {
    clearInterval(interval);
    countdown = 900;
    $timer.text(countdown);

    interval = setInterval(function () {
        $timer.text(--countdown);

        if (countdown === 0) {
            clearInterval(interval);

            let popupCountdown = 10;

            swal({
                title: "Session Expire",
                text: "User Logout, Please Login Again",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: `Yes, Logout (${popupCountdown})`,
                cancelButtonText: "No",
                closeOnConfirm: false,
                closeOnCancel: true
            }, function (isConfirm) {
                if (isConfirm) {
                    logout();
                } else {
                    clearInterval(popupInterval);
                }
            });

            popupInterval = setInterval(function () {
                popupCountdown--;
                $(".confirm").text(`Yes, Logout (${popupCountdown})`);

                if (popupCountdown === 0) {
                    clearInterval(popupInterval);
                    logout();
                }
            }, 1000);
        }
    }, 1000);
}

// ✅ Register only once
$(document).on('mousemove keydown keypress keyup click mouseenter mouseover', function () {
    startCountdown();
});

// Start initially
startCountdown();

// Prevent right-click
document.addEventListener('contextmenu', event => event.preventDefault());


function logout() {
    window.top.location.href = '../Login/Login';    
}
