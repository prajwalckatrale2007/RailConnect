
const API_URL = "http://localhost:8080/api";

const cancelForm = document.getElementById("cancelForm");
const pnrInput = document.getElementById("pnrInput");
const searchButton = document.getElementById("searchButton");

const cancelButton = document.getElementById("cancelButton");
const newSearchButton = document.getElementById("newSearchButton");
const backToTicketButton = document.getElementById("backToTicketButton");

const otpForm = document.getElementById("otpForm");
const otpInput = document.getElementById("otpInput");
const verifyButton = document.getElementById("verifyButton");
const resendOtpButton = document.getElementById("resendOtpButton");

const message = document.getElementById("message");
const otpMessage = document.getElementById("otpMessage");

const ticketSection = document.getElementById("ticketSection");
const otpSection = document.getElementById("otpSection");

let currentPNR = "";
let currentStatus = "";
let generatedOTP = "";
let otpExpiry = 0;
let isCancelling = false;

function getValue(data, ...keys) {
    for (const key of keys) {
        if (data[key] !== undefined && data[key] !== null) {
            return data[key];
        }
    }
    return "-";
}

function formatDate(value) {
    if (!value || value === "-") return "-";

    const parts = String(value).substring(0, 10).split("-");

    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return value;
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.className = "message " + type;
}

function displayTicket(data) {
    currentPNR = String(getValue(data, "pnr")).toUpperCase();
    currentStatus = String(getValue(data, "status")).toUpperCase();

    document.getElementById("pnrNumber").textContent = currentPNR;
    document.getElementById("source").textContent =
        getValue(data, "source");
    document.getElementById("destination").textContent =
        getValue(data, "destination");
    document.getElementById("trainName").textContent =
        getValue(data, "train_name", "trainName");
    document.getElementById("trainNumber").textContent =
        getValue(data, "train_number", "trainNumber");
    document.getElementById("passengerName").textContent =
        getValue(data, "passenger_name", "passengerName");

    document.getElementById("ageGender").textContent =
        `${getValue(data, "age")} / ${getValue(data, "gender")}`;

    document.getElementById("mobileNumber").textContent =
        getValue(data, "mobile_number", "mobileNumber");

    document.getElementById("email").textContent =
        getValue(data, "email", "account_email", "accountEmail");

    document.getElementById("journeyDate").textContent =
        formatDate(getValue(data, "journey_date", "journeyDate"));

    document.getElementById("departureTime").textContent =
        getValue(data, "departure_time", "departureTime");

    document.getElementById("className").textContent =
        getValue(data, "class_name", "className", "class_code", "classCode");

    const seat = getValue(data, "seat_number", "seatNumber");

    document.getElementById("seatNumber").textContent =
        seat === "-" ? "Not Available" : seat;

    const fare = getValue(data, "fare");

    document.getElementById("fare").textContent =
        fare === "-" ? "-" : `₹${fare}`;

    const statusBadge = document.getElementById("statusBadge");
    const cancelledNotice = document.getElementById("cancelledNotice");
    const confirmedNotice = document.getElementById("confirmedNotice");

    statusBadge.textContent = currentStatus;
    statusBadge.className = "status-badge";

    if (currentStatus === "CONFIRMED") {
        statusBadge.classList.add("status-confirmed");

        cancelledNotice.hidden = true;
        confirmedNotice.hidden = false;
        cancelButton.hidden = false;
        cancelButton.disabled = false;
        cancelButton.textContent = "Cancel My Ticket";

    } else if (currentStatus === "CANCELLED") {
        statusBadge.classList.add("status-cancelled");

        cancelledNotice.hidden = false;
        confirmedNotice.hidden = true;
        cancelButton.hidden = true;

    } else {
        statusBadge.classList.add("status-other");

        cancelledNotice.hidden = true;
        confirmedNotice.hidden = true;
        cancelButton.hidden = true;
    }

    ticketSection.hidden = false;
}

// SEARCH PNR
cancelForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const pnr = pnrInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{10}$/.test(pnr)) {
        ticketSection.hidden = true;
        otpSection.hidden = true;

        showMessage(message, "Please enter a valid 10-character PNR.", "error");
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Searching...";

    ticketSection.hidden = true;
    otpSection.hidden = true;

    generatedOTP = "";
    currentPNR = "";

    showMessage(message, "", "");

    try {
        const response = await fetch(
            `${API_URL}/bookings/${encodeURIComponent(pnr)}`
        );

        if (response.status === 404) {
            showMessage(message, "PNR not found. Please check your PNR.", "error");
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to find ticket.");
        }

        const data = await response.json();

        displayTicket(data);

        showMessage(message, "Ticket details loaded successfully.", "success");

    } catch (error) {
        console.error(error);

        showMessage(
            message,
            "Unable to connect to backend. Please check Spring Boot.",
            "error"
        );

    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search Ticket";
    }
});

// GENERATE 4-DIGIT DEMO OTP
function generateDemoOTP() {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);

    generatedOTP = String(randomArray[0] % 10000).padStart(4, "0");
    otpExpiry = Date.now() + 5 * 60 * 1000;

    document.getElementById("demoOtp").textContent = generatedOTP;

    otpInput.value = "";
    showMessage(otpMessage, "Demo OTP generated. Valid for 5 minutes.", "success");

    otpSection.hidden = false;
    ticketSection.hidden = true;

    otpInput.focus();
}

// CLICK CANCEL BUTTON
cancelButton.addEventListener("click", function() {
    if (!currentPNR || currentStatus !== "CONFIRMED") {
        showMessage(message, "This ticket cannot be cancelled.", "error");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to cancel this ticket?\n\n" +
        "PNR: " + currentPNR + "\n\n" +
        "You must verify a Demo OTP before cancellation."
    );

    if (!confirmed) return;

    generateDemoOTP();
});

// VERIFY OTP AND CANCEL
otpForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (isCancelling) return;

    const enteredOTP = otpInput.value.trim();

    if (!/^[0-9]{4}$/.test(enteredOTP)) {
        showMessage(otpMessage, "Please enter a valid 4-digit OTP.", "error");
        return;
    }

    if (Date.now() > otpExpiry) {
        generatedOTP = "";
        showMessage(otpMessage, "OTP expired. Generate a new OTP.", "error");
        return;
    }

    if (enteredOTP !== generatedOTP) {
        showMessage(otpMessage, "Incorrect OTP. Please try again.", "error");
        return;
    }

    if (!currentPNR || currentStatus !== "CONFIRMED") {
        showMessage(otpMessage, "This ticket cannot be cancelled.", "error");
        return;
    }

    isCancelling = true;
    verifyButton.disabled = true;
    verifyButton.textContent = "Cancelling Ticket...";

    try {
        const response = await fetch(
            `${API_URL}/bookings/${encodeURIComponent(currentPNR)}/cancel`,
            {
                method: "PUT"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Ticket cancellation failed.");
        }

        // Clear OTP after successful cancellation
        generatedOTP = "";
        otpExpiry = 0;

        // Fetch updated ticket status
        const updatedResponse = await fetch(
            `${API_URL}/bookings/${encodeURIComponent(currentPNR)}`
        );

        if (!updatedResponse.ok) {
            throw new Error("Cancellation completed, but ticket details could not be refreshed.");
        }

        const updatedData = await updatedResponse.json();

        otpSection.hidden = true;
        displayTicket(updatedData);

        showMessage(
            message,
            "Ticket cancelled successfully! Your seat has been released.",
            "success"
        );

    } catch (error) {
        console.error(error);

        showMessage(otpMessage, error.message, "error");

    } finally {
        isCancelling = false;
        verifyButton.disabled = false;
        verifyButton.textContent = "Verify OTP & Cancel Ticket";
    }
});

// GENERATE A NEW OTP
resendOtpButton.addEventListener("click", function() {
    if (currentStatus !== "CONFIRMED" || !currentPNR) {
        showMessage(otpMessage, "Unable to generate OTP.", "error");
        return;
    }

    generateDemoOTP();
});

// BACK TO TICKET DETAILS
backToTicketButton.addEventListener("click", function() {
    generatedOTP = "";
    otpExpiry = 0;

    otpSection.hidden = true;
    ticketSection.hidden = false;

    otpInput.value = "";
    showMessage(otpMessage, "", "");
});

// SEARCH ANOTHER PNR
newSearchButton.addEventListener("click", function() {
    cancelForm.reset();

    ticketSection.hidden = true;
    otpSection.hidden = true;

    currentPNR = "";
    currentStatus = "";
    generatedOTP = "";
    otpExpiry = 0;

    showMessage(message, "", "");
    showMessage(otpMessage, "", "");

    pnrInput.focus();
});
