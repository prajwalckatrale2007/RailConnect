
document.addEventListener("DOMContentLoaded", function () {

    const API = "https://railconnect-backend-63jy.onrender.com";

    const token = localStorage.getItem("railconnectToken");
    const username = localStorage.getItem("railconnectUser");
    const savedEmail = localStorage.getItem("railconnectEmail");

    // Protect profile page
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const emailInput = document.getElementById("email");
    const otpSection = document.getElementById("otpSection");
    const passwordSection = document.getElementById("passwordSection");
    const openPasswordButton =
        document.getElementById("openPasswordButton");

    const message = document.getElementById("message");

    // Display profile information
    document.getElementById("profileName").textContent =
        username || "User";

    document.getElementById("profileEmail").textContent =
        savedEmail || "Email not available";

    emailInput.value = savedEmail || "";

    // Show change password section only after clicking
    openPasswordButton.addEventListener("click", function () {

        if (!savedEmail) {
            showMessage("Your registered email is not available. Please log in again.");
            return;
        }

        passwordSection.hidden = false;
        openPasswordButton.hidden = true;

    });

    function showMessage(text, success = false) {
        message.textContent = text;
        message.style.color = success ? "#16803c" : "#d62828";
    }

    async function readResponse(response) {

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    }

    // GET DEMO OTP
    document.getElementById("sendOtpButton")
        .addEventListener("click", async function () {

            const email = emailInput.value.trim().toLowerCase();

            if (!email) {
                showMessage("Registered email is missing.");
                return;
            }

            try {

                this.disabled = true;
                this.textContent = "Generating OTP...";

                const response = await fetch(
                    API + "/api/auth/forgot-password",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: email
                        })
                    }
                );

                const data = await readResponse(response);

                document.getElementById("demoOtp").textContent =
                    data.demoOtp;

                otpSection.hidden = false;

                showMessage(
                    "Demo OTP generated successfully!",
                    true
                );

            } catch (error) {

                showMessage(error.message);

            } finally {

                this.disabled = false;
                this.textContent = "Get Demo OTP";

            }

        });

    // CHANGE PASSWORD
    document.getElementById("changePasswordButton")
        .addEventListener("click", async function () {

            const email = emailInput.value.trim().toLowerCase();

            const otp =
                document.getElementById("otp").value.trim();

            const newPassword =
                document.getElementById("newPassword").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;

            if (!/^\d{4}$/.test(otp)) {
                showMessage("Enter a valid 4-digit OTP.");
                return;
            }

            if (newPassword.length < 4) {
                showMessage("Password must contain at least 4 characters.");
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage("Passwords do not match.");
                return;
            }

            try {

                this.disabled = true;
                this.textContent = "Updating Password...";

                const response = await fetch(
                    API + "/api/auth/reset-password",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: email,
                            otp: otp,
                            newPassword: newPassword
                        })
                    }
                );

                const data = await readResponse(response);

                showMessage(
                    data.message + " Redirecting to login...",
                    true
                );

                localStorage.removeItem("railconnectToken");
                localStorage.removeItem("railconnectUser");
                localStorage.removeItem("railconnectEmail");

                setTimeout(function () {
                    window.location.href = "login.html";
                }, 2000);

            } catch (error) {

                showMessage(error.message);

                this.disabled = false;
                this.textContent = "Confirm Password Change";

            }

        });

    // LOGOUT
    document.getElementById("logoutButton")
        .addEventListener("click", function () {

            localStorage.removeItem("railconnectToken");
            localStorage.removeItem("railconnectUser");
            localStorage.removeItem("railconnectEmail");

            window.location.href = "login.html";

        });

});
