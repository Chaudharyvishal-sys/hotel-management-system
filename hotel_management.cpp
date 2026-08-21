#include <iostream>
#include <string>
#include <memory>
#include <limits>
#include <mysql/jdbc.h>

using namespace std;

// ============================================================
// MYSQL DATABASE CONNECTION
// ============================================================

sql::Connection* connectDatabase() {
    try {
        cout << "Connecting to MySQL database..." << endl;

        sql::mysql::MySQL_Driver* driver =
            sql::mysql::get_mysql_driver_instance();

        sql::Connection* con = driver->connect(
            "tcp://127.0.0.1:3306",
            "root",
            "9918335774"
        );

        con->setSchema("hotel_management");

        cout << "Database connected successfully!" << endl;

        return con;
    }
    catch (sql::SQLException& e) {
        cout << "\nDatabase connection failed!" << endl;
        cout << "Error: " << e.what() << endl;
        cout << "Error code: " << e.getErrorCode() << endl;
        return nullptr;
    }
}

// ============================================================
// CLEAR INPUT
// ============================================================

void clearInput() {
    cin.clear();
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
}

// ============================================================
// ADD GUEST
// ============================================================

void addGuest(sql::Connection* con) {

    string name, phone, email, address;

    clearInput();

    cout << "\n========== ADD GUEST ==========\n";

    cout << "Enter guest name: ";
    getline(cin, name);

    cout << "Enter phone: ";
    getline(cin, phone);

    cout << "Enter email: ";
    getline(cin, email);

    cout << "Enter address: ";
    getline(cin, address);

    if (name.empty()) {
        cout << "Guest name cannot be empty.\n";
        return;
    }

    try {
        unique_ptr<sql::PreparedStatement> stmt(
            con->prepareStatement(
                "INSERT INTO Guest "
                "(name, phone, email, address) "
                "VALUES (?, ?, ?, ?)"
            )
        );

        stmt->setString(1, name);
        stmt->setString(2, phone);
        stmt->setString(3, email);
        stmt->setString(4, address);

        stmt->executeUpdate();

        cout << "\nGuest added successfully!\n";
    }
    catch (sql::SQLException& e) {
        cout << "\nError adding guest: " << e.what() << endl;
    }
}

// ============================================================
// DISPLAY GUESTS
// ============================================================

void displayGuests(sql::Connection* con) {

    try {
        unique_ptr<sql::Statement> stmt(
            con->createStatement()
        );

        unique_ptr<sql::ResultSet> res(
            stmt->executeQuery(
                "SELECT * FROM Guest ORDER BY guest_id"
            )
        );

        cout << "\n========== GUESTS ==========\n";

        bool found = false;

        while (res->next()) {

            found = true;

            cout << "----------------------------------------\n";

            cout << "Guest ID : "
                 << res->getInt("guest_id") << endl;

            cout << "Name     : "
                 << res->getString("name") << endl;

            cout << "Phone    : "
                 << res->getString("phone") << endl;

            cout << "Email    : "
                 << res->getString("email") << endl;

            cout << "Address  : "
                 << res->getString("address") << endl;
        }

        if (!found) {
            cout << "No guests found.\n";
        }
    }
    catch (sql::SQLException& e) {
        cout << "Error displaying guests: "
             << e.what() << endl;
    }
}

// ============================================================
// DISPLAY ROOMS
// ============================================================

void displayRooms(sql::Connection* con) {

    try {
        unique_ptr<sql::Statement> stmt(
            con->createStatement()
        );

        unique_ptr<sql::ResultSet> res(
            stmt->executeQuery(
                "SELECT * FROM Room ORDER BY room_id"
            )
        );

        cout << "\n========== ROOMS ==========\n";

        bool found = false;

        while (res->next()) {

            found = true;

            cout << "----------------------------------------\n";

            cout << "Room ID      : "
                 << res->getInt("room_id") << endl;

            cout << "Room Number  : "
                 << res->getString("room_number") << endl;

            cout << "Room Type    : "
                 << res->getString("room_type") << endl;

            cout << "Price/Night  : Rs. "
                 << res->getDouble("price_per_night") << endl;

            cout << "Status       : "
                 << res->getString("status") << endl;
        }

        if (!found) {
            cout << "No rooms found.\n";
        }
    }
    catch (sql::SQLException& e) {
        cout << "Error displaying rooms: "
             << e.what() << endl;
    }
}

// ============================================================
// MAKE RESERVATION
// ============================================================

void makeReservation(sql::Connection* con) {

    int guestId;
    int roomId;

    string checkIn;
    string checkOut;

    cout << "\n========== MAKE RESERVATION ==========\n";

    cout << "Enter guest ID: ";

    if (!(cin >> guestId)) {
        clearInput();
        cout << "Invalid guest ID.\n";
        return;
    }

    cout << "Enter room ID: ";

    if (!(cin >> roomId)) {
        clearInput();
        cout << "Invalid room ID.\n";
        return;
    }

    cout << "Enter check-in date (YYYY-MM-DD): ";
    cin >> checkIn;

    cout << "Enter check-out date (YYYY-MM-DD): ";
    cin >> checkOut;

    try {

        // ----------------------------------------------------
        // CHECK GUEST
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> guestCheck(
            con->prepareStatement(
                "SELECT guest_id FROM Guest "
                "WHERE guest_id = ?"
            )
        );

        guestCheck->setInt(1, guestId);

        unique_ptr<sql::ResultSet> guestResult(
            guestCheck->executeQuery()
        );

        if (!guestResult->next()) {
            cout << "\nGuest not found.\n";
            return;
        }

        // ----------------------------------------------------
        // CHECK ROOM
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> roomCheck(
            con->prepareStatement(
                "SELECT status FROM Room "
                "WHERE room_id = ?"
            )
        );

        roomCheck->setInt(1, roomId);

        unique_ptr<sql::ResultSet> roomResult(
            roomCheck->executeQuery()
        );

        if (!roomResult->next()) {
            cout << "\nRoom not found.\n";
            return;
        }

        string roomStatus =
            roomResult->getString("status");

        if (roomStatus != "Available") {
            cout << "\nRoom is currently "
                 << roomStatus << ".\n";
            return;
        }

        // ----------------------------------------------------
        // CREATE RESERVATION
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> stmt(
            con->prepareStatement(
                "INSERT INTO Reservation "
                "(guest_id, room_id, check_in, check_out, status) "
                "VALUES (?, ?, ?, ?, 'Booked')"
            )
        );

        stmt->setInt(1, guestId);
        stmt->setInt(2, roomId);
        stmt->setString(3, checkIn);
        stmt->setString(4, checkOut);

        stmt->executeUpdate();

        // ----------------------------------------------------
        // UPDATE ROOM STATUS
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> updateRoom(
            con->prepareStatement(
                "UPDATE Room "
                "SET status = 'Occupied' "
                "WHERE room_id = ?"
            )
        );

        updateRoom->setInt(1, roomId);

        updateRoom->executeUpdate();

        cout << "\nReservation created successfully!\n";
    }
    catch (sql::SQLException& e) {
        cout << "\nReservation failed: "
             << e.what() << endl;
    }
}

// ============================================================
// DISPLAY RESERVATIONS
// ============================================================

void displayReservations(sql::Connection* con) {

    try {

        unique_ptr<sql::Statement> stmt(
            con->createStatement()
        );

        unique_ptr<sql::ResultSet> res(
            stmt->executeQuery(
                "SELECT "
                "r.reservation_id, "
                "g.name, "
                "rm.room_number, "
                "r.check_in, "
                "r.check_out, "
                "r.status "
                "FROM Reservation r "
                "JOIN Guest g "
                "ON r.guest_id = g.guest_id "
                "JOIN Room rm "
                "ON r.room_id = rm.room_id "
                "ORDER BY r.reservation_id"
            )
        );

        cout << "\n========== RESERVATIONS ==========\n";

        bool found = false;

        while (res->next()) {

            found = true;

            cout << "----------------------------------------\n";

            cout << "Reservation ID : "
                 << res->getInt("reservation_id")
                 << endl;

            cout << "Guest          : "
                 << res->getString("name")
                 << endl;

            cout << "Room           : "
                 << res->getString("room_number")
                 << endl;

            cout << "Check-in       : "
                 << res->getString("check_in")
                 << endl;

            cout << "Check-out      : "
                 << res->getString("check_out")
                 << endl;

            cout << "Status         : "
                 << res->getString("status")
                 << endl;
        }

        if (!found) {
            cout << "No reservations found.\n";
        }
    }
    catch (sql::SQLException& e) {
        cout << "Error displaying reservations: "
             << e.what() << endl;
    }
}

// ============================================================
// CANCEL RESERVATION
// ============================================================

void cancelReservation(sql::Connection* con) {

    int reservationId;

    cout << "\n========== CANCEL RESERVATION ==========\n";

    cout << "Enter reservation ID to cancel: ";

    if (!(cin >> reservationId)) {
        clearInput();
        cout << "Invalid reservation ID.\n";
        return;
    }

    try {

        // ----------------------------------------------------
        // FIND RESERVATION
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> find(
            con->prepareStatement(
                "SELECT room_id "
                "FROM Reservation "
                "WHERE reservation_id = ? "
                "AND status = 'Booked'"
            )
        );

        find->setInt(1, reservationId);

        unique_ptr<sql::ResultSet> res(
            find->executeQuery()
        );

        if (!res->next()) {
            cout << "\nActive reservation not found.\n";
            return;
        }

        int roomId = res->getInt("room_id");

        // ----------------------------------------------------
        // CANCEL RESERVATION
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> cancel(
            con->prepareStatement(
                "UPDATE Reservation "
                "SET status = 'Cancelled' "
                "WHERE reservation_id = ?"
            )
        );

        cancel->setInt(1, reservationId);

        cancel->executeUpdate();

        // ----------------------------------------------------
        // MAKE ROOM AVAILABLE
        // ----------------------------------------------------

        unique_ptr<sql::PreparedStatement> updateRoom(
            con->prepareStatement(
                "UPDATE Room "
                "SET status = 'Available' "
                "WHERE room_id = ?"
            )
        );

        updateRoom->setInt(1, roomId);

        updateRoom->executeUpdate();

        cout << "\nReservation cancelled successfully!\n";
    }
    catch (sql::SQLException& e) {
        cout << "Error cancelling reservation: "
             << e.what() << endl;
    }
}

// ============================================================
// SEARCH GUEST
// ============================================================

void searchGuest(sql::Connection* con) {

    string name;

    clearInput();

    cout << "\n========== SEARCH GUEST ==========\n";

    cout << "Enter guest name to search: ";

    getline(cin, name);

    if (name.empty()) {
        cout << "Search name cannot be empty.\n";
        return;
    }

    try {

        unique_ptr<sql::PreparedStatement> stmt(
            con->prepareStatement(
                "SELECT * FROM Guest "
                "WHERE name LIKE ?"
            )
        );

        stmt->setString(
            1,
            "%" + name + "%"
        );

        unique_ptr<sql::ResultSet> res(
            stmt->executeQuery()
        );

        cout << "\n========== SEARCH RESULTS ==========\n";

        bool found = false;

        while (res->next()) {

            found = true;

            cout << "----------------------------------------\n";

            cout << "Guest ID : "
                 << res->getInt("guest_id")
                 << endl;

            cout << "Name     : "
                 << res->getString("name")
                 << endl;

            cout << "Phone    : "
                 << res->getString("phone")
                 << endl;

            cout << "Email    : "
                 << res->getString("email")
                 << endl;

            cout << "Address  : "
                 << res->getString("address")
                 << endl;
        }

        if (!found) {
            cout << "No guest found with that name.\n";
        }
    }
    catch (sql::SQLException& e) {
        cout << "Search failed: "
             << e.what() << endl;
    }
}

// ============================================================
// MAIN MENU
// ============================================================

int main() {

    cout << "\n";
    cout << "========================================\n";
    cout << "       HOTEL MANAGEMENT SYSTEM\n";
    cout << "========================================\n";
    cout << "Program started successfully.\n\n";

    sql::Connection* con = connectDatabase();

    if (con == nullptr) {

        cout << "\nUnable to connect to the database.\n";
        cout << "Please check MySQL Server and your database.\n";

        cout << "\nPress Enter to exit...";
        cin.get();

        return 1;
    }

    int choice = 0;

    do {

        cout << "\n";
        cout << "========================================\n";
        cout << "       HOTEL MANAGEMENT SYSTEM\n";
        cout << "========================================\n";
        cout << "1. Add Guest\n";
        cout << "2. Display Guests\n";
        cout << "3. Display Rooms\n";
        cout << "4. Make Reservation\n";
        cout << "5. Display Reservations\n";
        cout << "6. Cancel Reservation\n";
        cout << "7. Search Guest\n";
        cout << "8. Exit\n";
        cout << "========================================\n";
        cout << "Enter your choice: ";

        if (!(cin >> choice)) {

            cout << "\nInvalid input. Please enter a number.\n";

            clearInput();

            continue;
        }

        try {

            switch (choice) {

                case 1:
                    addGuest(con);
                    break;

                case 2:
                    displayGuests(con);
                    break;

                case 3:
                    displayRooms(con);
                    break;

                case 4:
                    makeReservation(con);
                    break;

                case 5:
                    displayReservations(con);
                    break;

                case 6:
                    cancelReservation(con);
                    break;

                case 7:
                    searchGuest(con);
                    break;

                case 8:
                    cout << "\nThank you for using "
                         << "Hotel Management System!\n";
                    break;

                default:
                    cout << "\nInvalid choice. "
                         << "Please select 1-8.\n";
            }

        }
        catch (sql::SQLException& e) {

            cout << "\nSQL Error: "
                 << e.what() << endl;

            cout << "Error Code: "
                 << e.getErrorCode() << endl;
        }
        catch (exception& e) {

            cout << "\nUnexpected error: "
                 << e.what() << endl;
        }

    } while (choice != 8);

    // ========================================================
    // CLOSE DATABASE
    // ========================================================

    delete con;
    con = nullptr;

    cout << "\nDatabase connection closed.\n";

    return 0;
}