
const API = "http://localhost:8080/api";

const searchForm = document.getElementById("searchForm");
const results = document.getElementById("trainResults");
const message = document.getElementById("message");
const dateInput = document.getElementById("journeyDate");

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

dateInput.min = getLocalDate();
dateInput.value = getLocalDate();

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

searchForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const source = document.getElementById("source").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const journeyDate = dateInput.value;

    if (!journeyDate) {
        message.textContent = "Please select a journey date.";
        return;
    }

    if (source && destination &&
        source.toLowerCase() === destination.toLowerCase()) {
        message.textContent = "Source and destination cannot be the same.";
        return;
    }

    message.textContent = "Searching trains...";
    results.innerHTML = "";

    try {
        const params = new URLSearchParams();

        if (source) params.append("source", source);
        if (destination) params.append("destination", destination);

        const response = await fetch(`${API}/trains?${params.toString()}`);

        if (!response.ok) {
            throw new Error("Unable to load trains.");
        }

        const trains = await response.json();

        if (!Array.isArray(trains) || trains.length === 0) {
            message.textContent = "No trains found.";
            return;
        }

        message.textContent = `Found ${trains.length} train(s). Loading availability...`;

        const trainCards = await Promise.all(trains.map(async train => {
            try {
                const availabilityResponse = await fetch(
                    `${API}/trains/${train.id}/availability?journeyDate=${encodeURIComponent(journeyDate)}`
                );

                if (!availabilityResponse.ok) {
                    throw new Error("Availability unavailable");
                }

                const availability = await availabilityResponse.json();

                return createTrainCard(train, availability, journeyDate);
            } catch (error) {
                return `
                    <div class="train-card">
                        <h3>${escapeHTML(train.trainName)}</h3>
                        <p>Availability could not be loaded. Please try again.</p>
                    </div>`;
            }
        }));

        results.innerHTML = trainCards.join("");
        message.textContent = `Showing ${trains.length} train(s) for ${journeyDate}.`;

    } catch (error) {
        message.textContent = "Backend connection failed. Check whether Spring Boot is running on port 8080.";
        console.error(error);
    }
});

function createTrainCard(train, availability, journeyDate) {
    const classes = availability.classes || [];

    const classCards = classes.map(item => {
        const available = Number(item.availableSeats || 0);
        const classCode = escapeHTML(item.classCode);
        const className = escapeHTML(item.className);
        const fare = Number(item.fare || 0);

        return `
            <div class="class-box">
                <strong>${className} (${classCode})</strong>
                <div class="${available > 0 ? "available" : "unavailable"}">
                    ${available > 0 ? available + " Seats Available" : "Not Available"}
                </div>
                <div class="fare">Fare: ₹${fare.toFixed(2)}</div>
                <button
                    ${available <= 0 ? "disabled" : ""}
                    onclick="goToBooking(${Number(train.id)}, '${encodeURIComponent(journeyDate)}', '${classCode}', ${fare})">
                    ${available > 0 ? "Book Now" : "Full"}
                </button>
            </div>
        `;
    }).join("");

    return `
        <article class="train-card">
            <div class="train-top">
                <div>
                    <h2 class="train-name">${escapeHTML(train.trainName)}</h2>
                    <p class="train-number">Train No: ${escapeHTML(train.trainNumber)}</p>
                </div>
                <strong>${escapeHTML(train.departureTime || "Time not available")}</strong>
            </div>
            <p class="route">
                ${escapeHTML(train.source)} → ${escapeHTML(train.destination)}
            </p>
            <hr>
            <h3 style="margin-top:15px;">Available Classes</h3>
            <div class="classes">${classCards}</div>
        </article>
    `;
}

function goToBooking(trainId, journeyDate, classCode, fare) {
    const params = new URLSearchParams({
        trainId,
        journeyDate: decodeURIComponent(journeyDate),
        classCode,
        fare
    });

    window.location.href = `booking.html?${params.toString()}`;
}
