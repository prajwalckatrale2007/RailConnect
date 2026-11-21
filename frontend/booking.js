
const API = "https://railconnect-backend-63jy.onrender.com/api";

const params = new URLSearchParams(window.location.search);

const trainId = Number(params.get("trainId"));
const journeyDate = params.get("journeyDate");
const classCode = params.get("classCode");
const fare = Number(params.get("fare"));

const tripInfo = document.getElementById("tripInfo");
const bookingForm = document.getElementById("bookingForm");
const message = document.getElementById("message");
const bookButton = document.getElementById("bookButton");

const validClasses = ["1A", "2A", "3A", "SL"];

if (
    !Number.isInteger(trainId) ||
    trainId <= 0 ||
    !journeyDate ||
    !validClasses.includes(classCode) ||
    !Number.isFinite(fare) ||
    fare < 0
) {
    tripInfo.textContent = "Invalid journey details. Please search for a train again.";
    bookingForm.style.display = "none";
} else {
    tripInfo.innerHTML = `
        <div><strong>Train ID:</strong> ${trainId}</div>
        <div><strong>Journey Date:</strong> ${journeyDate}</div>
        <div><strong>Travel Class:</strong> ${classCode}</div>
        <div><strong>Fare:</strong> ₹${fare.toFixed(2)}</div>
    `;
}

bookingForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!validClasses.includes(classCode) || !trainId || !journeyDate) {
        message.textContent = "Invalid journey. Please search again.";
        message.className = "error";
        return;
    }

    const passengerEmail = document.getElementById("email").value.trim();

    // Use the signed-in account email when available.
    // Otherwise use the passenger email entered in the form.
    const accountEmail =
        localStorage.getItem("railconnectEmail") || passengerEmail;

    const bookingData = {
        trainId: trainId,
        passengerName: document.getElementById("passengerName").value.trim(),
        age: Number(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        mobileNumber: document.getElementById("mobileNumber").value.trim(),
        email: passengerEmail,
        accountEmail: accountEmail,
        classCode: classCode,
        journeyDate: journeyDate
    };

    bookButton.disabled = true;
    bookButton.textContent = "Booking...";
    message.textContent = "Please wait. Processing your ticket...";

    try {
        const response = await fetch(`${API}/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Booking failed.");
        }

        bookingForm.style.display = "none";

        message.className = "success";
        message.innerHTML = `
            <h2>🎉 Ticket Booked Successfully!</h2>
            <p><strong>PNR:</strong> ${escapeHTML(result.pnr)}</p>
            <p><strong>Passenger:</strong> ${escapeHTML(result.passengerName)}</p>
            <p><strong>Class:</strong> ${escapeHTML(result.classCode)}</p>
            <p><strong>Seat Number:</strong> ${escapeHTML(result.seatNumber)}</p>
            <p><strong>Journey Date:</strong> ${escapeHTML(result.journeyDate)}</p>
            <p><strong>Fare:</strong> ₹${Number(result.fare).toFixed(2)}</p>
            <p><strong>Status:</strong> ${escapeHTML(result.status)}</p>
            <button onclick="window.location.href='dashboard.html'">
                Back to Dashboard
            </button>
            <button onclick="window.location.href='search-train.html'">
                Book Another Ticket
            </button>
        `;

    } catch (error) {
        message.className = "error";
        message.textContent = error.message;
        bookButton.disabled = false;
        bookButton.textContent = "Confirm & Book Ticket";
    }
});

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}
