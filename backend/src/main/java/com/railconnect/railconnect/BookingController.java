
package com.railconnect.railconnect;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    private final JdbcTemplate jdbc;

    public BookingController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Book a ticket and allocate the first available seat
    @PostMapping
    @Transactional
    public ResponseEntity<?> bookTicket(@RequestBody Map<String, Object> data) {

        try {
            int trainId = Integer.parseInt(data.get("trainId").toString());
            int age = Integer.parseInt(data.get("age").toString());

            String passengerName = text(data, "passengerName");
            String classCode = text(data, "classCode").toUpperCase();
            String gender = text(data, "gender");
            String mobile = text(data, "mobileNumber");
            String email = text(data, "email").toLowerCase();
            String accountEmail = text(data, "accountEmail").toLowerCase();
            LocalDate journeyDate = LocalDate.parse(text(data, "journeyDate"));

            if (trainId <= 0 || age < 1 || age > 120 ||
                passengerName.isBlank() || accountEmail.isBlank() ||
                !Set.of("1A", "2A", "3A", "SL").contains(classCode)) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Please enter valid passenger and journey details.")
                );
            }

            if (journeyDate.isBefore(LocalDate.now())) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Journey date cannot be in the past.")
                );
            }

            List<Map<String, Object>> classRows = jdbc.queryForList(
                "SELECT total_seats, fare FROM train_classes " +
                "WHERE train_id = ? AND class_code = ? FOR UPDATE",
                trainId, classCode
            );

            if (classRows.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "This class is not available for the selected train.")
                );
            }

            int capacity = ((Number) classRows.get(0).get("total_seats")).intValue();
            Object fare = classRows.get(0).get("fare");

            List<Integer> occupiedSeats = jdbc.query(
                "SELECT seat_number FROM reservations " +
                "WHERE train_id = ? AND class_code = ? AND journey_date = ? " +
                "AND status = 'CONFIRMED' AND seat_number IS NOT NULL",
                (rs, rowNum) -> rs.getInt("seat_number"),
                trainId, classCode, journeyDate
            );

            Set<Integer> occupied = new HashSet<>(occupiedSeats);
            int seatNumber = 0;

            for (int seat = 1; seat <= capacity; seat++) {
                if (!occupied.contains(seat)) {
                    seatNumber = seat;
                    break;
                }
            }

            if (seatNumber == 0) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Sorry, no seats are available in this class for this date.")
                );
            }

            String pnr = UUID.randomUUID()
                .toString().replace("-", "")
                .substring(0, 10).toUpperCase();

            jdbc.update(
                "INSERT INTO reservations " +
                "(pnr, train_id, passenger_name, age, gender, mobile_number, " +
                "email, account_email, class_code, seat_number, journey_date, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')",
                pnr, trainId, passengerName, age, gender, mobile,
                email, accountEmail, classCode, seatNumber, journeyDate
            );

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Ticket booked successfully.");
            response.put("pnr", pnr);
            response.put("trainId", trainId);
            response.put("passengerName", passengerName);
            response.put("classCode", classCode);
            response.put("seatNumber", seatNumber);
            response.put("journeyDate", journeyDate.toString());
            response.put("status", "CONFIRMED");
            response.put("fare", fare);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Booking failed: " + e.getMessage())
            );
        }
    }

    // PNR enquiry
    @GetMapping("/{pnr}")
    public ResponseEntity<?> getBookingByPnr(@PathVariable String pnr) {

        List<Map<String, Object>> bookings = jdbc.queryForList(
            "SELECT r.*, t.train_number, t.train_name, t.source, " +
            "t.destination, t.departure_time, c.class_name, c.fare " +
            "FROM reservations r " +
            "JOIN trains t ON r.train_id = t.id " +
            "JOIN train_classes c ON r.train_id = c.train_id " +
            "AND r.class_code = c.class_code " +
            "WHERE r.pnr = ?",
            pnr.trim().toUpperCase()
        );

        if (bookings.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(bookings.get(0));
    }

    // My Bookings: return ALL confirmed and cancelled tickets
    @GetMapping("/my")
    public ResponseEntity<?> getMyBookings(@RequestParam String email) {

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Account email is required.")
            );
        }

        List<Map<String, Object>> bookings = jdbc.queryForList(
            "SELECT " +
            "r.id, r.pnr, r.train_id AS trainId, " +
            "r.passenger_name AS passengerName, r.age, r.gender, " +
            "r.mobile_number AS mobileNumber, r.email, " +
            "r.account_email AS accountEmail, " +
            "r.class_code AS classCode, r.seat_number AS seatNumber, " +
            "r.journey_date AS journeyDate, r.status, " +
            "r.booking_time AS bookingTime, " +
            "t.train_number AS trainNumber, " +
            "t.train_name AS trainName, " +
            "t.source, t.destination, " +
            "t.departure_time AS departureTime, " +
            "c.class_name AS className, c.fare " +
            "FROM reservations r " +
            "INNER JOIN trains t ON r.train_id = t.id " +
            "INNER JOIN train_classes c " +
            "ON r.train_id = c.train_id " +
            "AND r.class_code = c.class_code " +
            "WHERE LOWER(r.account_email) = LOWER(?) " +
            "ORDER BY r.booking_time DESC",
            email.trim()
        );

        return ResponseEntity.ok(bookings);
    }

    // Cancel ticket and release seat
    @PutMapping("/{pnr}/cancel")
    @Transactional
    public ResponseEntity<?> cancelBooking(@PathVariable String pnr) {

        List<Map<String, Object>> bookings = jdbc.queryForList(
            "SELECT id, train_id, class_code, journey_date, status " +
            "FROM reservations WHERE pnr = ? FOR UPDATE",
            pnr.trim().toUpperCase()
        );

        if (bookings.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> booking = bookings.get(0);

        if (!"CONFIRMED".equalsIgnoreCase(
                String.valueOf(booking.get("status")))) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "This ticket is already cancelled.")
            );
        }

        jdbc.update(
            "UPDATE reservations SET status = 'CANCELLED', seat_number = NULL " +
            "WHERE pnr = ?",
            pnr.trim().toUpperCase()
        );

        return ResponseEntity.ok(
            Map.of(
                "message", "Ticket cancelled successfully. Seat released.",
                "pnr", pnr.trim().toUpperCase(),
                "status", "CANCELLED"
            )
        );
    }

    private String text(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value == null ? "" : value.toString().trim();
    }
}
