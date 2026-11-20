package com.railconnect.railconnect;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    private final Map<String, String> otpStore = new ConcurrentHashMap<>();
    private final Map<String, Long> otpExpiry = new ConcurrentHashMap<>();

    public AuthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;

        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            )
        """);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> data) {
        String username = data.getOrDefault("username", "").trim();
        String email = data.getOrDefault("email", "").trim().toLowerCase();
        String password = data.getOrDefault("password", "");

        if (username.isEmpty() || email.isEmpty() || password.length() < 4) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Enter username, email and a password of at least 4 characters.")
            );
        }

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?",
            Integer.class, email
        );

        if (count != null && count > 0) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "This email is already registered.")
            );
        }

        jdbc.update(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            username, email, encoder.encode(password)
        );

        return ResponseEntity.ok(Map.of("message", "Registration successful. Please log in."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> data) {
        String login = data.getOrDefault("usernameOrEmail", "").trim();
        String password = data.getOrDefault("password", "");

        var users = jdbc.queryForList(
            "SELECT * FROM users WHERE email = ? OR username = ?",
            login.toLowerCase(), login
        );

        if (users.isEmpty()) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Account not found.")
            );
        }

        Map<String, Object> user = users.get(0);
        String savedPassword = (String) user.get("password");

        if (!encoder.matches(password, savedPassword)) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Incorrect password.")
            );
        }

        String token = UUID.randomUUID().toString();

        return ResponseEntity.ok(Map.of(
            "message", "Login successful.",
            "token", token,
            "username", user.get("username"),
            "email", user.get("email")
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> data) {
        String email = data.getOrDefault("email", "").trim().toLowerCase();

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?",
            Integer.class, email
        );

        if (count == null || count == 0) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "This email is not registered.")
            );
        }

        String otp = String.valueOf(1000 + random.nextInt(9000));

        otpStore.put(email, otp);
        otpExpiry.put(email, Instant.now().plusSeconds(300).getEpochSecond());

        // DEMO ONLY: return the OTP in the response instead of emailing it.
        return ResponseEntity.ok(Map.of(
            "message", "Demo OTP generated. It is valid for 5 minutes.",
            "demoOtp", otp
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> data) {
        String email = data.getOrDefault("email", "").trim().toLowerCase();
        String otp = data.getOrDefault("otp", "").trim();
        String newPassword = data.getOrDefault("newPassword", "");

        String savedOtp = otpStore.get(email);
        Long expiry = otpExpiry.get(email);

        if (savedOtp == null || expiry == null ||
            Instant.now().getEpochSecond() > expiry ||
            !savedOtp.equals(otp)) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Invalid or expired OTP.")
            );
        }

        if (newPassword.length() < 4) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Password must contain at least 4 characters.")
            );
        }

        jdbc.update(
            "UPDATE users SET password = ? WHERE email = ?",
            encoder.encode(newPassword), email
        );

        otpStore.remove(email);
        otpExpiry.remove(email);

        return ResponseEntity.ok(
            Map.of("message", "Password reset successful. Please log in.")
        );
    }
}