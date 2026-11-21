console.log("RailConnect website loaded!");

fetch("https://railconnect-backend-63jy.onrender.com/api/test")
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error("Backend connection failed:", error));