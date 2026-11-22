
document.addEventListener("DOMContentLoaded", function () {

    const API = "https://railconnect-backend-63jy.onrender.com";

    const otpForm = document.getElementById("otpForm");
    const resetForm = document.getElementById("resetForm");
    const demoOtp = document.getElementById("demoOtp");
    const message = document.getElementById("message");

    function showMessage(text, success = false) {
        message.textContent = text;
        message.style.color = success ? "green" : "red";
    }

    async function getResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Request failed.");
        }

        return data;
    }

    // Generate Demo OTP
    otpForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value
            .trim().toLowerCase();

        const button = otpForm.querySelector("button");

        try {
            button.disabled = true;
            button.textContent = "Generating OTP...";

            const response = await fetch(
                API + "/api/auth/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email: email })
                }
            );

            const data = await getResponse(response);

            if (!data.demoOtp) {
                throw new Error("OTP was generated, but the server did not return the Demo OTP.");
            }

            // Display the actual 4-digit OTP
            demoOtp.textContent =
                "Your Demo OTP: " + data.demoOtp +
                " (Valid for 5 minutes)";

            demoOtp.style.display = "block";
            demoOtp.style.padding = "15px";
            demoOtp.style.marginTop = "15px";
            demoOtp.style.background = "#e8f5e9";
            demoOtp.style.color = "#166534";
            demoOtp.style.fontSize = "20px";
            demoOtp.style.fontWeight = "bold";
            demoOtp.style.textAlign = "center";
            demoOtp.style.borderRadius = "10px";

            document.getElementById("resetEmail").value = email;

            showMessage("Demo OTP generated successfully!", true);

        } catch (error) {
            showMessage(error.message);
        } finally {
            button.disabled = false;
            button.textContent = "Generate 4-Digit OTP";
        }
    });

    // Verify OTP and reset password
    resetForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("resetEmail").value;
        const otp = document.getElementById("otp").value.trim();
        const newPassword =
            document.getElementById("newPassword").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (!email) {
            showMessage("First generate OTP using your registered email.");
            return;
        }

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

        const button = resetForm.querySelector("button");

        try {
            button.disabled = true;
            button.textContent = "Resetting Password...";

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

            const data = await getResponse(response);

            showMessage(
                (data.message || "Password reset successfully!") +
                " Redirecting to login...",
                true
            );

            setTimeout(function () {
                window.location.href = "login.html";
            }, 2000);

        } catch (error) {
            showMessage(error.message);
            button.disabled = false;
            button.textContent = "Verify OTP & Reset Password";
        }
    });

});
