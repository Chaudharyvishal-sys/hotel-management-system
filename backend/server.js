const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// MYSQL CONNECTION
// =====================================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "9918335774",
    database: process.env.DB_NAME || "hotel_management",
    port: Number(process.env.DB_PORT || 3306),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// =====================================================
// TEST DATABASE CONNECTION
// =====================================================

async function testDatabase() {

    try {

        const connection = await pool.getConnection();

        console.log("MySQL connection successful!");
        console.log(
            "Database:",
            process.env.DB_NAME || "hotel_management"
        );

        connection.release();

    } catch (error) {

        console.error("MySQL connection failed!");
        console.error(error.message);

    }

}


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

    res.json({
        message: "Hotel Management Server is running",
        status: "OK"
    });

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({
            status: "OK",
            database: "Connected"
        });

    } catch (error) {

        console.error("Health check:", error.message);

        res.status(500).json({
            status: "ERROR",
            database: "Disconnected",
            details: error.message
        });

    }

});


// =====================================================
// GET GUESTS
// =====================================================

app.get("/api/guests", async (req, res) => {

    try {

        const [rows] = await pool.query(`
            SELECT
                guest_id AS id,
                name,
                phone,
                email,
                address
            FROM guest
            ORDER BY guest_id DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            "GET /api/guests:",
            error.message
        );

        res.status(500).json({
            error: "Failed to load guests",
            details: error.message
        });

    }

});


// =====================================================
// ADD GUEST
// =====================================================

app.post("/api/guests", async (req, res) => {

    try {

        const {
            name,
            phone,
            email,
            address
        } = req.body;

        if (!name || !phone) {

            return res.status(400).json({
                error: "Name and phone are required"
            });

        }

        const [result] = await pool.query(
            `
            INSERT INTO guest
            (name, phone, email, address)
            VALUES (?, ?, ?, ?)
            `,
            [
                name.trim(),
                phone.trim(),
                email ? email.trim() : null,
                address ? address.trim() : null
            ]
        );

        const [rows] = await pool.query(
            `
            SELECT
                guest_id AS id,
                name,
                phone,
                email,
                address
            FROM guest
            WHERE guest_id = ?
            `,
            [result.insertId]
        );

        res.status(201).json(rows[0]);

    } catch (error) {

        console.error(
            "POST /api/guests:",
            error.message
        );

        res.status(500).json({
            error: "Failed to add guest",
            details: error.message
        });

    }

});


// =====================================================
// GET ROOMS
// =====================================================

app.get("/api/rooms", async (req, res) => {

    try {

        const [rows] = await pool.query(`
            SELECT
                room_id AS id,
                room_number AS number,
                room_type AS type,
                price_per_night AS price,
                status
            FROM room
            ORDER BY room_id
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            "GET /api/rooms:",
            error.message
        );

        res.status(500).json({
            error: "Failed to load rooms",
            details: error.message
        });

    }

});


// =====================================================
// GET RESERVATIONS
// =====================================================

app.get("/api/reservations", async (req, res) => {

    try {

        const [rows] = await pool.query(`
            SELECT
                r.reservation_id AS id,

                r.guest_id AS guestId,
                g.name AS guest,

                r.room_id AS roomId,
                rm.room_number AS room,

                DATE_FORMAT(
                    r.check_in,
                    '%Y-%m-%d'
                ) AS checkIn,

                DATE_FORMAT(
                    r.check_out,
                    '%Y-%m-%d'
                ) AS checkOut,

                r.status

            FROM reservation r

            INNER JOIN guest g
                ON r.guest_id = g.guest_id

            INNER JOIN room rm
                ON r.room_id = rm.room_id

            ORDER BY r.reservation_id DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            "GET /api/reservations:",
            error.message
        );

        res.status(500).json({
            error: "Failed to load reservations",
            details: error.message
        });

    }

});


// =====================================================
// CREATE RESERVATION
// =====================================================

app.post("/api/reservations", async (req, res) => {

    const connection =
        await pool.getConnection();

    try {

        const {
            guestId,
            roomId,
            checkIn,
            checkOut
        } = req.body;

        if (
            !guestId ||
            !roomId ||
            !checkIn ||
            !checkOut
        ) {

            connection.release();

            return res.status(400).json({
                error:
                    "Guest, room, check-in and check-out are required"
            });

        }

        if (
            new Date(checkOut) <=
            new Date(checkIn)
        ) {

            connection.release();

            return res.status(400).json({
                error:
                    "Check-out must be after check-in"
            });

        }

        await connection.beginTransaction();


        // -------------------------------------------------
        // CHECK GUEST
        // -------------------------------------------------

        const [guestRows] =
            await connection.query(
                `
                SELECT
                    guest_id,
                    name
                FROM guest
                WHERE guest_id = ?
                `,
                [guestId]
            );

        if (guestRows.length === 0) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                error: "Guest not found"
            });

        }


        // -------------------------------------------------
        // CHECK ROOM
        // -------------------------------------------------

        const [roomRows] =
            await connection.query(
                `
                SELECT
                    room_id,
                    room_number,
                    status
                FROM room
                WHERE room_id = ?
                FOR UPDATE
                `,
                [roomId]
            );

        if (roomRows.length === 0) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                error: "Room not found"
            });

        }


        if (
            roomRows[0].status !==
            "Available"
        ) {

            await connection.rollback();
            connection.release();

            return res.status(400).json({
                error:
                    "This room is not available"
            });

        }


        // -------------------------------------------------
        // CREATE RESERVATION
        // -------------------------------------------------

        const [result] =
            await connection.query(
                `
                INSERT INTO reservation
                (
                    guest_id,
                    room_id,
                    check_in,
                    check_out,
                    status
                )
                VALUES (?, ?, ?, ?, 'Booked')
                `,
                [
                    guestId,
                    roomId,
                    checkIn,
                    checkOut
                ]
            );


        // -------------------------------------------------
        // MARK ROOM OCCUPIED
        // -------------------------------------------------

        await connection.query(
            `
            UPDATE room
            SET status = 'Occupied'
            WHERE room_id = ?
            `,
            [roomId]
        );


        await connection.commit();


        // -------------------------------------------------
        // RETURN CREATED RESERVATION
        // -------------------------------------------------

        const [reservationRows] =
            await connection.query(
                `
                SELECT
                    r.reservation_id AS id,

                    r.guest_id AS guestId,
                    g.name AS guest,

                    r.room_id AS roomId,
                    rm.room_number AS room,

                    DATE_FORMAT(
                        r.check_in,
                        '%Y-%m-%d'
                    ) AS checkIn,

                    DATE_FORMAT(
                        r.check_out,
                        '%Y-%m-%d'
                    ) AS checkOut,

                    r.status

                FROM reservation r

                INNER JOIN guest g
                    ON r.guest_id = g.guest_id

                INNER JOIN room rm
                    ON r.room_id = rm.room_id

                WHERE r.reservation_id = ?
                `,
                [result.insertId]
            );


        connection.release();

        res.status(201).json(
            reservationRows[0]
        );

    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error(
                "Rollback error:",
                rollbackError.message
            );
        }

        connection.release();

        console.error(
            "POST /api/reservations:",
            error.message
        );

        res.status(500).json({
            error:
                "Failed to create reservation",
            details:
                error.message
        });

    }

});


// =====================================================
// CANCEL RESERVATION
// =====================================================

app.put(
    "/api/reservations/:id/cancel",
    async (req, res) => {

        const connection =
            await pool.getConnection();

        try {

            const reservationId =
                Number(req.params.id);

            if (!reservationId) {

                connection.release();

                return res.status(400).json({
                    error:
                        "Invalid reservation ID"
                });

            }

            await connection.beginTransaction();


            // -------------------------------------------------
            // FIND RESERVATION
            // -------------------------------------------------

            const [reservationRows] =
                await connection.query(
                    `
                    SELECT
                        reservation_id,
                        room_id,
                        status
                    FROM reservation
                    WHERE reservation_id = ?
                    FOR UPDATE
                    `,
                    [reservationId]
                );


            if (
                reservationRows.length === 0
            ) {

                await connection.rollback();
                connection.release();

                return res.status(404).json({
                    error:
                        "Reservation not found"
                });

            }


            const reservation =
                reservationRows[0];


            if (
                reservation.status ===
                "Cancelled"
            ) {

                await connection.rollback();
                connection.release();

                return res.status(400).json({
                    error:
                        "Reservation is already cancelled"
                });

            }


            // -------------------------------------------------
            // CANCEL RESERVATION
            // -------------------------------------------------

            await connection.query(
                `
                UPDATE reservation
                SET status = 'Cancelled'
                WHERE reservation_id = ?
                `,
                [reservationId]
            );


            // -------------------------------------------------
            // MAKE ROOM AVAILABLE
            // -------------------------------------------------

            await connection.query(
                `
                UPDATE room
                SET status = 'Available'
                WHERE room_id = ?
                `,
                [reservation.room_id]
            );


            await connection.commit();

            connection.release();

            res.json({
                message:
                    "Reservation cancelled successfully"
            });

        } catch (error) {

            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError.message
                );
            }

            connection.release();

            console.error(
                "Cancel reservation:",
                error.message
            );

            res.status(500).json({
                error:
                    "Failed to cancel reservation",
                details:
                    error.message
            });

        }

    }
);


// =====================================================
// GET PAYMENTS
// =====================================================

app.get("/api/payments", async (req, res) => {

    try {

        const [rows] = await pool.query(`
            SELECT

                p.payment_id AS id,

                p.reservation_id AS reservationId,

                g.name AS guest,

                p.amount AS amount,

                DATE_FORMAT(
                    p.payment_date,
                    '%Y-%m-%d'
                ) AS date,

                p.payment_method AS method,

                p.payment_status AS status

            FROM payment p

            INNER JOIN reservation r
                ON p.reservation_id =
                   r.reservation_id

            INNER JOIN guest g
                ON r.guest_id =
                   g.guest_id

            ORDER BY
                p.payment_id DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            "GET /api/payments:",
            error.message
        );

        res.status(500).json({
            error:
                "Failed to load payments",
            details:
                error.message
        });

    }

});


// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    res.status(404).json({
        error:
            "Endpoint not found"
    });

});


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    async () => {

        console.log("");
        console.log(
            "========================================"
        );
        console.log(
            "       HOTEL MANAGEMENT SERVER"
        );
        console.log(
            "========================================"
        );
        console.log("");

        console.log(
            "Server running on port " +
            PORT
        );

        console.log(
            "http://localhost:" +
            PORT
        );

        console.log("");

        console.log(
            "Connecting to MySQL..."
        );

        await testDatabase();

        console.log("");

        console.log(
            "Available endpoints:"
        );

        console.log(
            "GET  /api/guests"
        );

        console.log(
            "POST /api/guests"
        );

        console.log(
            "GET  /api/rooms"
        );

        console.log(
            "GET  /api/reservations"
        );

        console.log(
            "POST /api/reservations"
        );

        console.log(
            "PUT  /api/reservations/:id/cancel"
        );

        console.log(
            "GET  /api/payments"
        );

        console.log(
            "GET  /api/health"
        );

        console.log("");

    }
);