-- HOTEL MANAGEMENT SYSTEM
-- MySQL Database Script
-- Compatible with MySQL Workbench

DROP DATABASE IF EXISTS hotel_management;
CREATE DATABASE hotel_management;
USE hotel_management;

-- =========================
-- GUEST TABLE
-- =========================
CREATE TABLE Guest (
    guest_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address VARCHAR(255)
);

-- =========================
-- ROOM TABLE
-- =========================
CREATE TABLE Room (
    room_id INT PRIMARY KEY AUTO_INCREMENT,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type ENUM('Single', 'Double', 'Deluxe', 'Suite') NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    status ENUM('Available', 'Occupied', 'Maintenance') DEFAULT 'Available'
);

-- =========================
-- RESERVATION TABLE
-- =========================
CREATE TABLE Reservation (
    reservation_id INT PRIMARY KEY AUTO_INCREMENT,
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status ENUM('Booked', 'Cancelled', 'Completed') DEFAULT 'Booked',

    FOREIGN KEY (guest_id) REFERENCES Guest(guest_id),
    FOREIGN KEY (room_id) REFERENCES Room(room_id)
);

-- =========================
-- PAYMENT TABLE
-- =========================
CREATE TABLE Payment (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    reservation_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('Cash', 'Card', 'UPI') NOT NULL,
    payment_status ENUM('Paid', 'Pending') DEFAULT 'Pending',

    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id)
);

-- =========================
-- SAMPLE GUESTS
-- =========================
INSERT INTO Guest (name, phone, email, address) VALUES
('Rahul Sharma', '9876543210', 'rahul@gmail.com', 'Lucknow'),
('Priya Singh', '9876501234', 'priya@gmail.com', 'Kanpur'),
('Aman Verma', '9123456780', 'aman@gmail.com', 'Delhi'),
('Sneha Rathore', '9988776655', 'sneha@gmail.com', 'Noida');

-- =========================
-- SAMPLE ROOMS
-- =========================
INSERT INTO Room (room_number, room_type, price_per_night, status) VALUES
('101', 'Single', 1500.00, 'Available'),
('102', 'Single', 1500.00, 'Available'),
('201', 'Double', 2500.00, 'Available'),
('202', 'Double', 2500.00, 'Available'),
('301', 'Deluxe', 4000.00, 'Available'),
('302', 'Deluxe', 4000.00, 'Available'),
('401', 'Suite', 6000.00, 'Available');

-- =========================
-- SAMPLE RESERVATIONS
-- =========================
INSERT INTO Reservation
(guest_id, room_id, check_in, check_out, status)
VALUES
(1, 3, '2026-08-20', '2026-08-22', 'Booked'),
(2, 5, '2026-08-21', '2026-08-24', 'Booked');

-- Update room status for sample reservations
UPDATE Room SET status = 'Occupied' WHERE room_id IN (3, 5);

-- =========================
-- SAMPLE PAYMENTS
-- =========================
INSERT INTO Payment
(reservation_id, amount, payment_date, payment_method, payment_status)
VALUES
(1, 5000.00, '2026-08-19', 'UPI', 'Paid'),
(2, 12000.00, '2026-08-19', 'Card', 'Paid');

-- =========================
-- USEFUL QUERIES
-- =========================

-- Show all guests
SELECT * FROM Guest;

-- Show all rooms
SELECT * FROM Room;

-- Show available rooms
SELECT * FROM Room
WHERE status = 'Available';

-- Show all reservations with guest and room details
SELECT
    r.reservation_id,
    g.name AS guest_name,
    rm.room_number,
    rm.room_type,
    r.check_in,
    r.check_out,
    r.status
FROM Reservation r
JOIN Guest g ON r.guest_id = g.guest_id
JOIN Room rm ON r.room_id = rm.room_id;

-- Show payment information
SELECT
    p.payment_id,
    g.name AS guest_name,
    p.amount,
    p.payment_date,
    p.payment_method,
    p.payment_status
FROM Payment p
JOIN Reservation r ON p.reservation_id = r.reservation_id
JOIN Guest g ON r.guest_id = g.guest_id;
