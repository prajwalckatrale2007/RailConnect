
const API = "http://localhost:8080/api/auth";
const DASHBOARD_URL = "http://127.0.0.1:5500/frontend/dashboard.html";
const LOGIN_URL = "http://127.0.0.1:5500/frontend/login.html";

document.addEventListener("DOMContentLoaded", function () {

    async function getData(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { message: text };
        }
    }

    function showMessage(message, error = false) {
        const element = document.getElementById("message");
        if (element) {
            element.textContent = message;
            element.style.color = error ? "red" : "green";
        }
    }

    // LOGIN
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("usernameOrEmail").value.trim();
            const password = document.getElementById("password").value;

            showMessage("Checking login...");

            try {
                const response = await fetch(API + "/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        usernameOrEmail: email,
                        password: password
                    })
                });

                const data = await getData(response);

                if (!response.ok) {
                    showMessage(data.message || data.error || "Invalid login.", true);
                    return;
                }

                if (!data.token) {
                    showMessage("Login response has no token. Check backend login response.", true);
                    return;
                }

                localStorage.setItem("railconnectToken", data.token);
                localStorage.setItem("railconnectUser", data.username || email);
                localStorage.setItem("railconnectEmail", data.email || email);

                showMessage("Login successful!");

                window.location.href = DASHBOARD_URL;

            } catch (error) {
                console.error(error);
                showMessage("Cannot connect to backend. Start Spring Boot on port 8080.", true);
            }
        });
    }

    // REGISTRATION
    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (password !== confirmPassword) {
                showMessage("Passwords do not match.", true);
                return;
            }

            showMessage("Creating account...");

            try {
                const response = await fetch(API + "/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await getData(response);

                if (!response.ok) {
                    showMessage(data.message || data.error || "Registration failed.", true);
                    return;
                }

                showMessage("Registration successful! Please login.");
                registerForm.reset();

                setTimeout(() => {
                    window.location.href = LOGIN_URL;
                }, 1200);

            } catch (error) {
                console.error(error);
                showMessage("Cannot connect to backend.", true);
            }
        });
    }

    // FORGOT PASSWORD - GENERATE OTP
    const otpForm = document.getElementById("otpForm");

    if (otpForm) {
        otpForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();

            showMessage("Generating OTP...");

            try {
                const response = await fetch(API + "/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });

                const data = await getData(response);

                if (!response.ok) {
                    showMessage(data.message || data.error || "OTP generation failed.", true);
                    return;
                }

                const resetEmail = document.getElementById("resetEmail");
                if (resetEmail) resetEmail.value = email;

                const demoOtp = document.getElementById("demoOtp");
                if (demoOtp && data.demoOtp !== undefined) {
                    demoOtp.textContent = "Your Demo OTP: " + data.demoOtp;
                }

                showMessage(data.message || "OTP generated successfully.");

            } catch (error) {
                console.error(error);
                showMessage("Cannot connect to backend.", true);
            }
        });
    }

    // RESET PASSWORD
    const resetForm = document.getElementById("resetForm");

    if (resetForm) {
        resetForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("resetEmail").value.trim();
            const otp = document.getElementById("otp").value.trim();
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (!/^\d{4}$/.test(otp)) {
                showMessage("Enter a valid 4-digit OTP.", true);
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage("Passwords do not match.", true);
                return;
            }

            showMessage("Resetting password...");

            try {
                const response = await fetch(API + "/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, otp, newPassword })
                });

                const data = await getData(response);

                if (!response.ok) {
                    showMessage(data.message || data.error || "Invalid or expired OTP.", true);
                    return;
                }

                showMessage("Password reset successfully!");

                setTimeout(() => {
                    window.location.href = LOGIN_URL;
                }, 1200);

            } catch (error) {
                console.error(error);
                showMessage("Cannot connect to backend.", true);
            }
        });
    }

});
