
document.addEventListener("DOMContentLoaded", function () {

    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");
    const logoutButton = document.getElementById("logoutButton");
    const welcomeUser = document.getElementById("welcomeUser");

    function isLoggedIn() {
        return Boolean(localStorage.getItem("railconnectToken"));
    }

    function updateDashboard() {

        const loggedIn = isLoggedIn();

        loginButton.hidden = loggedIn;
        registerButton.hidden = loggedIn;
        logoutButton.hidden = !loggedIn;

        const username =
            localStorage.getItem("railconnectUser") || "User";

        welcomeUser.textContent = loggedIn
            ? "Hi, " + username + "! 👋"
            : "";
    }

    document.querySelectorAll(".service-card").forEach(function (card) {

        card.addEventListener("click", function (event) {

            if (!isLoggedIn()) {
                event.preventDefault();
                window.location.href = "login.html";
            }

        });

    });

    window.logout = function () {

        localStorage.removeItem("railconnectToken");
        localStorage.removeItem("railconnectUser");
        localStorage.removeItem("railconnectEmail");

        window.location.href = "dashboard.html";
    };

    updateDashboard();

});
