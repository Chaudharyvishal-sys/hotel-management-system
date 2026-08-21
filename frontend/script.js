// =====================================================
// HOTEL MANAGEMENT SYSTEM - FRONTEND
// Connected to Node.js + MySQL Backend
// =====================================================

const API_BASE = "http://localhost:8080/api";


// =====================================================
// GLOBAL DATA
// =====================================================

let guests = [];
let rooms = [];
let reservations = [];
let payments = [];


// =====================================================
// API HELPER
// =====================================================

async function apiRequest(url, options = {}) {

    const response = await fetch(API_BASE + url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { error: text || "Invalid server response" };
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            "Server request failed"
        );
    }

    return data;
}


// =====================================================
// DOM INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("Hotel Management System loaded");

    const loginPage = document.getElementById("loginPage");
    const app = document.getElementById("app");
    const loginForm = document.getElementById("loginForm");

    // -------------------------------------------------
    // INITIAL PAGE STATE
    // -------------------------------------------------

    if (sessionStorage.getItem("hotel_logged") === "1") {

        showApp();

        loadAllData();

    } else {

        showLogin();

    }


    // -------------------------------------------------
    // LOGIN
    // -------------------------------------------------

    if (loginForm) {

        loginForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            console.log("Login button clicked");

            sessionStorage.setItem("hotel_logged", "1");

            showApp();

            await loadAllData();

        });

    }


    // -------------------------------------------------
    // LOGOUT
    // -------------------------------------------------

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", logout);

    }


    // -------------------------------------------------
    // SIDEBAR NAVIGATION
    // -------------------------------------------------

    document
        .querySelectorAll(".nav-btn")
        .forEach(button => {

            button.addEventListener("click", function () {

                const page =
                    this.getAttribute("data-page");

                showPage(page, this);

            });

        });


    // -------------------------------------------------
    // ADD GUEST BUTTON
    // -------------------------------------------------

    const addGuestBtn =
        document.getElementById("addGuestBtn");

    if (addGuestBtn) {

        addGuestBtn.addEventListener("click", function () {

            openModal("guestModal");

        });

    }


    // -------------------------------------------------
    // NEW RESERVATION BUTTON
    // -------------------------------------------------

    const newReservationBtn =
        document.getElementById(
            "newReservationBtn"
        );

    if (newReservationBtn) {

        newReservationBtn.addEventListener(
            "click",
            openReservationModal
        );

    }


    // -------------------------------------------------
    // GUEST SEARCH
    // -------------------------------------------------

    const guestSearch =
        document.getElementById("guestSearch");

    if (guestSearch) {

        guestSearch.addEventListener(
            "input",
            renderGuests
        );

    }


    // -------------------------------------------------
    // CLOSE BUTTONS
    // -------------------------------------------------

    document
        .querySelectorAll("[data-close]")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    closeModal(
                        this.getAttribute("data-close")
                    );

                }
            );

        });

});


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

    const loginPage =
        document.getElementById("loginPage");

    const app =
        document.getElementById("app");


    if (loginPage) {

        loginPage.style.display = "grid";

    }


    if (app) {

        app.classList.remove("show-app");

        app.classList.remove("hidden");

        app.style.display = "none";

    }

}


// =====================================================
// SHOW APPLICATION
// =====================================================

function showApp() {

    const loginPage =
        document.getElementById("loginPage");

    const app =
        document.getElementById("app");


    if (loginPage) {

        loginPage.style.display = "none";

    }


    if (app) {

        // VERY IMPORTANT
        // Remove hidden class before displaying app

        app.classList.remove("hidden");

        app.classList.add("show-app");

        app.style.display = "flex";

    }

}


// =====================================================
// LOAD ALL DATA
// =====================================================

async function loadAllData() {

    console.log("Loading hotel data...");

    try {

        await Promise.all([
            loadGuests(),
            loadRooms(),
            loadReservations(),
            loadPayments()
        ]);

        renderDashboard();

        populateReservationForm();

        console.log("All hotel data loaded successfully");

    } catch (error) {

        console.error(
            "Failed to load application data:",
            error
        );

        alert(
            "The dashboard opened, but some database data could not be loaded.\n\n" +
            error.message
        );

    }

}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    sessionStorage.removeItem("hotel_logged");

    showLogin();

    console.log("Logged out");

}


// =====================================================
// NAVIGATION
// =====================================================

function showPage(pageId, button) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });


    const selectedPage =
        document.getElementById(pageId);


    if (selectedPage) {

        selectedPage.classList.add("active");

    }


    document
        .querySelectorAll(".nav-btn")
        .forEach(btn => {

            btn.classList.remove("active");

        });


    if (button) {

        button.classList.add("active");

    }


    if (pageId === "dashboard") {

        renderDashboard();

    }


    if (pageId === "guests") {

        renderGuests();

    }


    if (pageId === "rooms") {

        renderRooms();

    }


    if (pageId === "reservations") {

        renderReservations();

        populateReservationForm();

    }


    if (pageId === "payments") {

        renderPayments();

    }

}


// =====================================================
// MODALS
// =====================================================

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.add("show");

    }

}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.remove("show");

    }

}


// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function esc(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );

}


function money(value) {

    return "₹" +
        Number(value || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2
            }
        );

}


function cls(value) {

    return String(
        value || ""
    ).toLowerCase();

}


// =====================================================
// GUESTS
// =====================================================

async function loadGuests() {

    guests = await apiRequest("/guests");

    if (!Array.isArray(guests)) {
        guests = [];
    }

    renderGuests();

}


function renderGuests() {

    const table =
        document.getElementById("guestTable");

    if (!table) {
        return;
    }


    const searchInput =
        document.getElementById("guestSearch");


    const search =
        (searchInput?.value || "").toLowerCase();


    const filtered =
        guests.filter(guest => {

            return (

                String(guest.name || "")
                    .toLowerCase()
                    .includes(search)

                ||

                String(guest.phone || "")
                    .toLowerCase()
                    .includes(search)

                ||

                String(guest.email || "")
                    .toLowerCase()
                    .includes(search)

            );

        });


    table.innerHTML =
        filtered.map(guest => `

            <tr>

                <td>${esc(guest.id)}</td>

                <td>
                    <strong>
                        ${esc(guest.name)}
                    </strong>
                </td>

                <td>
                    ${esc(guest.phone)}
                </td>

                <td>
                    ${esc(guest.email)}
                </td>

                <td>
                    ${esc(guest.address)}
                </td>

            </tr>

        `).join("");


    if (filtered.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="muted">
                    No guests found.
                </td>
            </tr>
        `;

    }

}


// =====================================================
// ADD GUEST
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const guestForm =
        document.getElementById("guestForm");


    if (!guestForm) {
        return;
    }


    guestForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document.getElementById(
                    "guestName"
                ).value.trim();


            const phone =
                document.getElementById(
                    "guestPhone"
                ).value.trim();


            const email =
                document.getElementById(
                    "guestEmail"
                ).value.trim();


            const address =
                document.getElementById(
                    "guestAddress"
                ).value.trim();


            if (!name || !phone) {

                alert(
                    "Name and phone are required."
                );

                return;

            }


            try {

                await apiRequest(
                    "/guests",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            name,
                            phone,
                            email,
                            address
                        })
                    }
                );


                alert(
                    "Guest added successfully!"
                );


                guestForm.reset();

                closeModal("guestModal");

                await loadGuests();

                populateReservationForm();

                renderDashboard();


            } catch (error) {

                console.error(error);

                alert(
                    error.message ||
                    "Failed to add guest."
                );

            }

        }
    );

});


// =====================================================
// ROOMS
// =====================================================

async function loadRooms() {

    rooms = await apiRequest("/rooms");

    if (!Array.isArray(rooms)) {
        rooms = [];
    }

    renderRooms();

}


function renderRooms() {

    const cards =
        document.getElementById("roomCards");

    const table =
        document.getElementById("roomTable");


    if (cards) {

        cards.innerHTML =
            rooms.map(room => `

                <div class="room-card">

                    <h3>
                        Room ${esc(room.number)}
                    </h3>

                    <p>
                        ${esc(room.type)}
                        ·
                        ${money(room.price)}
                        /night
                    </p>

                    <span class="badge ${cls(room.status)}">
                        ${esc(room.status)}
                    </span>

                </div>

            `).join("");

    }


    if (table) {

        table.innerHTML =
            rooms.map(room => `

                <tr>

                    <td>
                        ${esc(room.id)}
                    </td>

                    <td>
                        <strong>
                            ${esc(room.number)}
                        </strong>
                    </td>

                    <td>
                        ${esc(room.type)}
                    </td>

                    <td>
                        ${money(room.price)}
                    </td>

                    <td>
                        <span class="badge ${cls(room.status)}">
                            ${esc(room.status)}
                        </span>
                    </td>

                </tr>

            `).join("");

    }

}


// =====================================================
// RESERVATIONS
// =====================================================

async function loadReservations() {

    reservations =
        await apiRequest("/reservations");

    if (!Array.isArray(reservations)) {
        reservations = [];
    }

    renderReservations();

}


function renderReservations() {

    const table =
        document.getElementById(
            "reservationTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML =
        reservations.map(reservation => `

            <tr>

                <td>
                    ${esc(reservation.id)}
                </td>

                <td>
                    ${esc(reservation.guest)}
                </td>

                <td>
                    ${esc(reservation.room)}
                </td>

                <td>
                    ${esc(reservation.checkIn)}
                </td>

                <td>
                    ${esc(reservation.checkOut)}
                </td>

                <td>

                    <span class="badge ${cls(reservation.status)}">

                        ${esc(reservation.status)}

                    </span>

                </td>

                <td>

                    ${
                        reservation.status === "Booked"

                        ?

                        `<button
                            class="btn"
                            onclick="cancelReservation(${reservation.id})">
                            Cancel
                        </button>`

                        :

                        "—"
                    }

                </td>

            </tr>

        `).join("");


    if (reservations.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7" class="muted">
                    No reservations found.
                </td>
            </tr>
        `;

    }

}


// =====================================================
// RESERVATION FORM
// =====================================================

function populateReservationForm() {

    const guestSelect =
        document.getElementById(
            "reservationGuest"
        );


    const roomSelect =
        document.getElementById(
            "reservationRoom"
        );


    if (!guestSelect || !roomSelect) {
        return;
    }


    guestSelect.innerHTML =
        guests.map(guest => `

            <option value="${esc(guest.id)}">

                ${esc(guest.name)}

            </option>

        `).join("");


    const availableRooms =
        rooms.filter(room =>
            String(room.status).toLowerCase() ===
            "available"
        );


    roomSelect.innerHTML =
        availableRooms.map(room => `

            <option value="${esc(room.id)}">

                ${esc(room.number)}
                —
                ${esc(room.type)}
                —
                ${money(room.price)}

            </option>

        `).join("");


    if (guests.length === 0) {

        guestSelect.innerHTML = `
            <option value="">
                No guests available
            </option>
        `;

    }


    if (availableRooms.length === 0) {

        roomSelect.innerHTML = `
            <option value="">
                No rooms available
            </option>
        `;

    }

}


// =====================================================
// OPEN RESERVATION MODAL
// =====================================================

function openReservationModal() {

    populateReservationForm();

    openModal("reservationModal");

}


// =====================================================
// CREATE RESERVATION
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const reservationForm =
        document.getElementById(
            "reservationForm"
        );


    if (!reservationForm) {
        return;
    }


    reservationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const guestId =
                document.getElementById(
                    "reservationGuest"
                ).value;


            const roomId =
                document.getElementById(
                    "reservationRoom"
                ).value;


            const checkIn =
                document.getElementById(
                    "checkIn"
                ).value;


            const checkOut =
                document.getElementById(
                    "checkOut"
                ).value;


            if (
                !guestId ||
                !roomId ||
                !checkIn ||
                !checkOut
            ) {

                alert(
                    "Please fill all reservation fields."
                );

                return;

            }


            if (
                new Date(checkOut) <=
                new Date(checkIn)
            ) {

                alert(
                    "Check-out must be after check-in."
                );

                return;

            }


            try {

                await apiRequest(
                    "/reservations",
                    {
                        method: "POST",

                        body: JSON.stringify({

                            guestId:
                                Number(guestId),

                            roomId:
                                Number(roomId),

                            checkIn,
                            checkOut

                        })
                    }
                );


                alert(
                    "Reservation created successfully!"
                );


                reservationForm.reset();

                closeModal(
                    "reservationModal"
                );


                await loadRooms();

                await loadReservations();

                await loadPayments();

                populateReservationForm();

                renderDashboard();


            } catch (error) {

                console.error(error);

                alert(
                    error.message ||
                    "Failed to create reservation."
                );

            }

        }
    );

});


// =====================================================
// CANCEL RESERVATION
// =====================================================

async function cancelReservation(id) {

    const confirmed =
        confirm(
            "Cancel this reservation?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/reservations/${id}/cancel`,
            {
                method: "PUT"
            }
        );


        alert(
            "Reservation cancelled successfully!"
        );


        await loadRooms();

        await loadReservations();

        await loadPayments();

        populateReservationForm();

        renderDashboard();


    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Failed to cancel reservation."
        );

    }

}


// =====================================================
// PAYMENTS
// =====================================================

async function loadPayments() {

    payments =
        await apiRequest("/payments");

    if (!Array.isArray(payments)) {
        payments = [];
    }

    renderPayments();

}


function renderPayments() {

    const table =
        document.getElementById(
            "paymentTable"
        );


    const count =
        document.getElementById(
            "paymentCount"
        );


    const paidAmount =
        document.getElementById(
            "paidAmount"
        );


    const pendingAmount =
        document.getElementById(
            "pendingAmount"
        );


    if (count) {

        count.textContent =
            payments.length;

    }


    const paid =
        payments
            .filter(payment =>
                String(payment.status).toLowerCase() ===
                "paid"
            )
            .reduce(
                (total, payment) =>
                    total +
                    Number(payment.amount || 0),
                0
            );


    const pending =
        payments
            .filter(payment =>
                String(payment.status).toLowerCase() ===
                "pending"
            )
            .reduce(
                (total, payment) =>
                    total +
                    Number(payment.amount || 0),
                0
            );


    if (paidAmount) {

        paidAmount.textContent =
            money(paid);

    }


    if (pendingAmount) {

        pendingAmount.textContent =
            money(pending);

    }


    if (!table) {
        return;
    }


    table.innerHTML =
        payments.map(payment => `

            <tr>

                <td>
                    ${esc(payment.id)}
                </td>

                <td>
                    ${esc(payment.guest)}
                </td>

                <td>
                    #${esc(payment.reservationId)}
                </td>

                <td>
                    ${money(payment.amount)}
                </td>

                <td>
                    ${esc(payment.date)}
                </td>

                <td>
                    ${esc(payment.method)}
                </td>

                <td>

                    <span class="badge ${cls(payment.status)}">

                        ${esc(payment.status)}

                    </span>

                </td>

            </tr>

        `).join("");


    if (payments.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7" class="muted">
                    No payments found.
                </td>
            </tr>
        `;

    }

}


// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard() {

    const today =
        document.getElementById("today");


    if (today) {

        today.textContent =
            new Date().toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    const totalGuests =
        document.getElementById(
            "totalGuests"
        );


    const totalRooms =
        document.getElementById(
            "totalRooms"
        );


    const availableRooms =
        document.getElementById(
            "availableRooms"
        );


    const occupiedRooms =
        document.getElementById(
            "occupiedRooms"
        );


    if (totalGuests) {

        totalGuests.textContent =
            guests.length;

    }


    if (totalRooms) {

        totalRooms.textContent =
            rooms.length;

    }


    if (availableRooms) {

        availableRooms.textContent =
            rooms.filter(room =>
                String(room.status).toLowerCase() ===
                "available"
            ).length;

    }


    if (occupiedRooms) {

        occupiedRooms.textContent =
            rooms.filter(room =>
                String(room.status).toLowerCase() ===
                "occupied"
            ).length;

    }


    // -------------------------------------------------
    // ROOM OVERVIEW
    // -------------------------------------------------

    const roomOverview =
        document.getElementById(
            "roomOverview"
        );


    if (roomOverview) {

        roomOverview.innerHTML =
            rooms
                .slice(0, 6)
                .map(room => `

                    <div class="room-mini">

                        <strong>
                            Room ${esc(room.number)}
                        </strong>

                        <small>
                            ${esc(room.type)}
                            ·
                            ${money(room.price)}
                        </small>

                        <span class="badge ${cls(room.status)}">

                            ${esc(room.status)}

                        </span>

                    </div>

                `)
                .join("");

    }


    // -------------------------------------------------
    // RECENT RESERVATIONS
    // -------------------------------------------------

    const recent =
        document.getElementById(
            "recentReservations"
        );


    if (recent) {

        recent.innerHTML =
            reservations
                .slice(0, 5)
                .map(reservation => `

                    <div class="reservation-row">

                        <div>

                            <strong>
                                ${esc(
                                    reservation.guest
                                )}
                            </strong>

                            <small>
                                Room
                                ${esc(
                                    reservation.room
                                )}
                                ·
                                ${esc(
                                    reservation.checkIn
                                )}
                            </small>

                        </div>

                        <span class="badge ${cls(
                            reservation.status
                        )}">

                            ${esc(
                                reservation.status
                            )}

                        </span>

                    </div>

                `)
                .join("") ||

            "<p class='muted'>No reservations.</p>";

    }

}


// =====================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================================

window.addEventListener("click", function (event) {

    if (
        event.target.classList.contains("modal")
    ) {

        event.target.classList.remove("show");

    }

});