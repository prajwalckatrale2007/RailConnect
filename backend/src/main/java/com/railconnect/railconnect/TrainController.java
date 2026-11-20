
package com.railconnect.railconnect;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/trains")
@CrossOrigin(origins = "*")
public class TrainController {

    private final JdbcTemplate jdbc;

    public TrainController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Search all trains or filter by source and destination
    @GetMapping
    public ResponseEntity<?> searchTrains(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String destination) {

        StringBuilder sql = new StringBuilder(
            "SELECT id, train_number AS trainNumber, " +
            "train_name AS trainName, source, destination, " +
            "departure_time AS departureTime, total_seats AS totalSeats " +
            "FROM trains WHERE 1=1"
        );

        List<Object> params = new ArrayList<>();

        if (source != null && !source.trim().isEmpty()) {
            sql.append(" AND LOWER(source) LIKE LOWER(?)");
            params.add("%" + source.trim() + "%");
        }

        if (destination != null && !destination.trim().isEmpty()) {
            sql.append(" AND LOWER(destination) LIKE LOWER(?)");
            params.add("%" + destination.trim() + "%");
        }

        sql.append(" ORDER BY departure_time");

        List<Map<String, Object>> trains =
            jdbc.queryForList(sql.toString(), params.toArray());

        return ResponseEntity.ok(trains);
    }

    // Get class-wise availability for one selected journey date
    @GetMapping("/{trainId}/availability")
    public ResponseEntity<?> getAvailability(
            @PathVariable int trainId,
            @RequestParam LocalDate journeyDate) {

        if (journeyDate.isBefore(LocalDate.now())) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Journey date cannot be in the past.")
            );
        }

        List<Map<String, Object>> trains = jdbc.queryForList(
            "SELECT id, train_number, train_name, source, destination, " +
            "departure_time FROM trains WHERE id = ?",
            trainId
        );

        if (trains.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> classes = jdbc.queryForList(
            "SELECT class_code AS classCode, class_name AS className, " +
            "total_seats AS totalSeats, fare " +
            "FROM train_classes WHERE train_id = ? ORDER BY " +
            "CASE class_code WHEN '1A' THEN 1 WHEN '2A' THEN 2 " +
            "WHEN '3A' THEN 3 WHEN 'SL' THEN 4 ELSE 5 END",
            trainId
        );

        for (Map<String, Object> travelClass : classes) {
            String classCode = (String) travelClass.get("classCode");
            int totalSeats = ((Number) travelClass.get("totalSeats")).intValue();

            Integer booked = jdbc.queryForObject(
                "SELECT COUNT(*) FROM reservations " +
                "WHERE train_id = ? AND class_code = ? " +
                "AND journey_date = ? AND status = 'CONFIRMED'",
                Integer.class,
                trainId, classCode, journeyDate
            );

            int bookedSeats = booked == null ? 0 : booked;
            travelClass.put("bookedSeats", bookedSeats);
            travelClass.put("availableSeats",
                Math.max(0, totalSeats - bookedSeats));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("train", trains.get(0));
        result.put("journeyDate", journeyDate.toString());
        result.put("classes", classes);

        return ResponseEntity.ok(result);
    }
}
