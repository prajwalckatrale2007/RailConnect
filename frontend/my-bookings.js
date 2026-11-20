
const API_URL = "http://localhost:8080/api";

let allBookings = [];
let currentTab = "upcoming";

const bookingsList = document.getElementById("bookingsList");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

function getValue(booking, camel, snake, fallback = "") {
    return booking[camel] ?? booking[snake] ?? fallback;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function todayString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function journeyDate(booking) {
    return String(getValue(booking, "journeyDate", "journey_date", "")).substring(0, 10);
}

function getGroups() {
    const upcoming = [];
    const completed = [];
    const today = todayString();

    allBookings.forEach((booking, index) => {
        const status = String(booking.status || "").toUpperCase();
        const date = journeyDate(booking);

        if (status === "CANCELLED") {
            completed.push({ booking, index, displayStatus: "CANCELLED" });
        } else if (status === "COMPLETED" || date < today) {
            completed.push({ booking, index, displayStatus: "COMPLETED" });
        } else if (status === "CONFIRMED" && date >= today) {
            upcoming.push({ booking, index, displayStatus: "CONFIRMED" });
        }
    });

    return { upcoming, completed };
}

function formatDate(value) {
    if (!value) return "N/A";

    const date = new Date(`${String(value).substring(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function renderSummary() {
    const groups = getGroups();

    document.getElementById("totalBookings").textContent = allBookings.length;
    document.getElementById("upcomingBookings").textContent = groups.upcoming.length;
    document.getElementById("completedBookings").textContent = groups.completed.length;
    document.getElementById("upcomingCount").textContent = groups.upcoming.length;
    document.getElementById("completedCount").textContent = groups.completed.length;
}

function renderBookings() {
    const groups = getGroups();
    const selected = currentTab === "upcoming" ? groups.upcoming : groups.completed;

    renderSummary();

    if (selected.length === 0) {
        bookingsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🚆</div>
                <h3>No ${currentTab === "upcoming" ? "Upcoming" : "Completed"} Bookings</h3>
                <p>Your tickets will appear here.</p>
                <a href="search-train.html" class="search-button">Search Trains</a>
            </div>`;
        return;
    }

    bookingsList.innerHTML = selected.map(item => {
        const b = item.booking;
        const statusClass = item.displayStatus === "CONFIRMED"
            ? "status-confirmed"
            : item.displayStatus === "CANCELLED"
                ? "status-cancelled"
                : "status-completed";

        return `
        <article class="booking-card">
            <div class="booking-header">
                <div>
                    <h3>${escapeHTML(getValue(b, "trainName", "train_name", "Train"))}</h3>
                    <p class="pnr">PNR: ${escapeHTML(b.pnr || "N/A")}</p>
                </div>
                <span class="status ${statusClass}">${item.displayStatus}</span>
            </div>

            <div class="booking-details">
                <div class="detail"><span>Passenger</span><strong>${escapeHTML(getValue(b, "passengerName", "passenger_name", "N/A"))}</strong></div>
                <div class="detail"><span>Train Number</span><strong>${escapeHTML(getValue(b, "trainNumber", "train_number", "N/A"))}</strong></div>
                <div class="detail"><span>Journey Date</span><strong>${escapeHTML(formatDate(journeyDate(b)))}</strong></div>
                <div class="detail"><span>From</span><strong>${escapeHTML(b.source || "N/A")}</strong></div>
                <div class="detail"><span>To</span><strong>${escapeHTML(b.destination || "N/A")}</strong></div>
                <div class="detail"><span>Class / Seat</span><strong>${escapeHTML(getValue(b, "classCode", "class_code", "N/A"))} / ${escapeHTML(getValue(b, "seatNumber", "seat_number", "N/A"))}</strong></div>
            </div>

            <div class="booking-footer">
                <div class="fare">₹${escapeHTML(getValue(b, "fare", "fare", 0))}</div>
                <button class="download-button" data-download-index="${item.index}" type="button">
                    ↓ Download PDF Ticket
                </button>
            </div>
        </article>`;
    }).join("");
}

async function loadBookings() {
    const email = localStorage.getItem("railconnectEmail");

    if (!email) {
        loadingMessage.hidden = true;
        errorMessage.textContent = "Please log in first.";
        errorMessage.hidden = false;
        return;
    }

    try {
        loadingMessage.hidden = false;
        errorMessage.hidden = true;

        const response = await fetch(
            `${API_URL}/bookings/my?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) throw new Error("Unable to load bookings.");

        const data = await response.json();
        allBookings = Array.isArray(data) ? data : [];

        loadingMessage.hidden = true;
        renderBookings();

    } catch (error) {
        loadingMessage.hidden = true;
        errorMessage.textContent = error.message;
        errorMessage.hidden = false;
    }
}

// Generate stylish ticket and open browser PDF printing
function downloadTicket(index) {
    const b = allBookings[index];

    if (!b) {
        alert("Ticket details not found.");
        return;
    }

    const status = String(b.status || "").toUpperCase();
    const date = journeyDate(b);

    const displayStatus = status === "CONFIRMED" && date < todayString()
        ? "COMPLETED"
        : status;

    const ticket = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>RailConnect Ticket - ${escapeHTML(b.pnr)}</title>
        <style>
            * { box-sizing: border-box; }
            body {
                font-family: Arial, sans-serif;
                background: #eef2f8;
                padding: 25px;
                color: #14233d;
            }
            .ticket {
                max-width: 750px;
                margin: auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                border: 1px solid #dce3ed;
            }
            .header {
                background: #071a36;
                color: white;
                padding: 28px;
                border-bottom: 6px solid #f58220;
            }
            .header h1 { margin: 0 0 8px; }
            .header p { margin: 0; color: #d5deed; }
            .pnr {
                margin-top: 20px;
                background: #f58220;
                padding: 12px;
                border-radius: 7px;
                font-weight: bold;
                display: inline-block;
            }
            .content { padding: 28px; }
            h2 { color: #071a36; font-size: 18px; }
            .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 22px 0;
            }
            .field span {
                display: block;
                color: #78849a;
                font-size: 12px;
                margin-bottom: 7px;
            }
            .field strong { font-size: 15px; overflow-wrap: anywhere; }
            .status {
                display: inline-block;
                padding: 9px 15px;
                border-radius: 20px;
                font-weight: bold;
                color: ${displayStatus === "CONFIRMED" ? "#168044" : displayStatus === "CANCELLED" ? "#c62828" : "#536078"};
                background: ${displayStatus === "CONFIRMED" ? "#e2f8eb" : displayStatus === "CANCELLED" ? "#ffe7e7" : "#e9edf4"};
            }
            .footer {
                border-top: 1px dashed #cbd3df;
                padding: 22px;
                text-align: center;
                color: #78849a;
                font-size: 12px;
            }
            .print {
                display: block;
                margin: 20px auto;
                padding: 13px 25px;
                background: #f58220;
                color: white;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
            }
            @media print {
                body { background: white; padding: 0; }
                .ticket { border: 1px solid #ddd; }
                .print { display: none; }
                * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="ticket">
            <div class="header">
                <h1>🚆 RailConnect</h1>
                <p>Electronic Railway Reservation Ticket</p>
                <div class="pnr">PNR: ${escapeHTML(b.pnr)}</div>
            </div>

            <div class="content">
                <h2>Journey Details</h2>
                <div class="grid">
                    <div class="field"><span>Train Name</span><strong>${escapeHTML(getValue(b, "trainName", "train_name", "N/A"))}</strong></div>
                    <div class="field"><span>Train Number</span><strong>${escapeHTML(getValue(b, "trainNumber", "train_number", "N/A"))}</strong></div>
                    <div class="field"><span>From</span><strong>${escapeHTML(b.source || "N/A")}</strong></div>
                    <div class="field"><span>To</span><strong>${escapeHTML(b.destination || "N/A")}</strong></div>
                    <div class="field"><span>Journey Date</span><strong>${escapeHTML(formatDate(date))}</strong></div>
                    <div class="field"><span>Class</span><strong>${escapeHTML(getValue(b, "classCode", "class_code", "N/A"))}</strong></div>
                </div>

                <h2>Passenger Details</h2>
                <div class="grid">
                    <div class="field"><span>Passenger Name</span><strong>${escapeHTML(getValue(b, "passengerName", "passenger_name", "N/A"))}</strong></div>
                    <div class="field"><span>Age / Gender</span><strong>${escapeHTML(getValue(b, "age", "age", "N/A"))} / ${escapeHTML(getValue(b, "gender", "gender", "N/A"))}</strong></div>
                    <div class="field"><span>Mobile</span><strong>${escapeHTML(getValue(b, "mobileNumber", "mobile_number", "N/A"))}</strong></div>
                    <div class="field"><span>Seat Number</span><strong>${escapeHTML(getValue(b, "seatNumber", "seat_number", "N/A"))}</strong></div>
                    <div class="field"><span>Fare</span><strong>₹${escapeHTML(getValue(b, "fare", "fare", 0))}</strong></div>
                    <div class="field"><span>Ticket Status</span><strong><span class="status">${escapeHTML(displayStatus)}</span></strong></div>
                </div>
            </div>

            <div class="footer">
                Thank you for choosing RailConnect.<br>
                This is a computer-generated ticket.
            </div>
        </div>

        <button class="print" onclick="window.print()">Download / Save as PDF</button>
        <script>
            window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
            };
        <\/script>
    </body>
    </html>`;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Please allow pop-ups for your RailConnect website.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(ticket);
    printWindow.document.close();
}

// Tabs
document.getElementById("upcomingTab").addEventListener("click", () => {
    currentTab = "upcoming";
    document.getElementById("upcomingTab").classList.add("active");
    document.getElementById("completedTab").classList.remove("active");
    renderBookings();
});

document.getElementById("completedTab").addEventListener("click", () => {
    currentTab = "completed";
    document.getElementById("completedTab").classList.add("active");
    document.getElementById("upcomingTab").classList.remove("active");
    renderBookings();
});

bookingsList.addEventListener("click", event => {
    const button = event.target.closest("[data-download-index]");
    if (button) downloadTicket(Number(button.dataset.downloadIndex));
});

loadBookings();
