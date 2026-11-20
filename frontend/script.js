console.log("RailConnect website loaded!");

fetch("http://localhost:8080/api/test")
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error("Backend connection failed:", error));