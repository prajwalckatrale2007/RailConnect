
const API_URL = "https://railconnect-backend-63jy.onrender.com/api";

const pnrForm = document.getElementById("pnrForm");
const pnrInput = document.getElementById("pnrInput");
const searchButton = document.getElementById("searchButton");
const message = document.getElementById("message");
const resultSection = document.getElementById("resultSection");
const newSearchButton = document.getElementById("newSearchButton");

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

    const date = String(value).substring(0, 10);
    const parts = date.split("-");

    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return value;
}

function formatDateTime(value) {
    if (!value || value === "-") return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-IN");
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}

function showBooking(data) {
    document.getElementById("resultPnr").textContent =
        getValue(data, "pnr");

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

    const age = getValue(data, "age");
    const gender = getValue(data, "gender");

    document.getElementById("ageGender").textContent =
        `${age} / ${gender}`;

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

    document.getElementById("bookingTime").textContent =
        formatDateTime(getValue(data, "booking_time", "bookingTime"));

    const status = String(getValue(data, "status")).toUpperCase();
    const statusBadge = document.getElementById("statusBadge");
    const cancelledNotice = document.getElementById("cancelledNotice");

    statusBadge.textContent = status;
    statusBadge.className = "status-badge";

    if (status === "CONFIRMED") {
        statusBadge.classList.add("status-confirmed");
        cancelledNotice.hidden = true;
    } else if (status === "CANCELLED") {
        statusBadge.classList.add("status-cancelled");
        cancelledNotice.hidden = false;
    } else {
        statusBadge.classList.add("status-other");
        cancelledNotice.hidden = true;
    }

    resultSection.hidden = false;
}

pnrForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const pnr = pnrInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{10}$/.test(pnr)) {
        resultSection.hidden = true;
        showMessage("Please enter a valid 10-character PNR number.", "error");
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Checking...";
    resultSection.hidden = true;
    showMessage("", "");

    try {
        const response = await fetch(
            `${API_URL}/bookings/${encodeURIComponent(pnr)}`
        );

        if (response.status === 404) {
            showMessage("PNR not found. Please check your PNR number.", "error");
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to check PNR status.");
        }

        const data = await response.json();

        showBooking(data);
        showMessage("PNR details loaded successfully.", "success");

    } catch (error) {
        console.error("PNR Error:", error);

        showMessage(
            "Unable to connect to the server. Please make sure the backend is running.",
            "error"
        );

    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Check PNR Status";
    }
});

newSearchButton.addEventListener("click", function () {
    pnrForm.reset();
    resultSection.hidden = true;
    message.textContent = "";
    message.className = "message";
    pnrInput.focus();
});
