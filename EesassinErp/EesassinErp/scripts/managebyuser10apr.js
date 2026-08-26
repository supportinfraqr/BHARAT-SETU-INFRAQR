// Session kept alive until manual logout — no auto-logout timer.
// (Client-side session-expiry countdown removed per requirement.)

function logout() {
    window.top.location.href = '../Login/Login';
}