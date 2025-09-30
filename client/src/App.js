import React, { useState, useEffect } from "react";
import "./App.css";
import logo from "./images/logo-removebg-preview.png";

// FIXED: Removed the trailing slash to prevent the 404 double-slash error (//register)
const API_BASE_URL = "https://support-ticket-system-igce.onrender.com";

function App() {
    const [message, setMessage] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState(""); // "User" or "Admin"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginTitle, setLoginTitle] = useState("Welcome to our Support Portal");

    // User state
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [priority, setPriority] = useState("Low");
    const [product, setProduct] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
    const [showQuickActions, setShowQuickActions] = useState(false); // New state for quick actions on user side
    const [userView, setUserView] = useState("tickets"); // "tickets" or "passwordChange"

    // Admin state
    const [allTickets, setAllTickets] = useState([]);
    const [filterStatus, setFilterStatus] = useState("All");
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [actionTaken, setActionTaken] = useState("");
    const [newStatus, setNewStatus] = useState("");
    const [adminView, setAdminView] = useState("list"); // 'list' or 'details'

    // Admin Email Constant
    const adminEmail = "kgomotsosele80@gmail.com";

    // Helper Functions
    const getUser = async (userEmail) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userEmail}`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    };

    const getPriorityDotClass = (priority) => {
        switch (priority) {
            case "High":
                return "priority-high";
            case "Medium":
                return "priority-medium";
            case "Low":
                return "priority-low";
            default:
                return "";
        }
    };

    // -----------------------------------------------------------------------
    // AUTHENTICATION LOGIC
    // -----------------------------------------------------------------------

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setLoginTitle("Signing In...");

        try {
            const loginUrl = email === adminEmail
                ? `${API_BASE_URL}/admin/login`
                : `${API_BASE_URL}/login`;

            const response = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                setIsLoggedIn(true);
                setRole(data.role);
                setMessage(`Welcome back, ${email}!`);
                setLoginTitle(data.role === "Admin" ? "Admin Portal" : "User Dashboard");
                if (data.role === "User") {
                    fetchUserTickets(email);
                } else if (data.role === "Admin") {
                    fetchAllTickets();
                }
            } else {
                setLoginError("Invalid email or password");
                setLoginTitle("Welcome to our Support Portal");
            }
        } catch (error) {
            setLoginError("Network error. Please check your connection and the server status.");
            setLoginTitle("Welcome to our Support Portal");
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setRole("");
        setEmail("");
        setPassword("");
        setLoginError("");
        setLoginTitle("Welcome to our Support Portal");
        setMessage("");
        // Clear all states specific to views/roles
        setTickets([]);
        setAllTickets([]);
        setSelectedTicket(null);
    };

    // -----------------------------------------------------------------------
    // PASSWORD CHANGE LOGIC (User)
    // -----------------------------------------------------------------------

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordChangeMessage("");

        if (newPassword.length < 6) {
            setPasswordChangeMessage("New password must be at least 6 characters.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/password-change`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, currentPassword, newPassword }),
            });

            if (response.ok) {
                setPasswordChangeMessage("✅ Password changed successfully!");
                setCurrentPassword("");
                setNewPassword("");
            } else {
                const error = await response.json();
                setPasswordChangeMessage(`❌ Error: ${error.message || "Could not change password."}`);
            }
        } catch (error) {
            setPasswordChangeMessage("Network error during password change.");
        }
    };

    // -----------------------------------------------------------------------
    // USER TICKET LOGIC
    // -----------------------------------------------------------------------

    const fetchUserTickets = async (userEmail) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${userEmail}`);
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
            } else {
                console.error("Failed to fetch user tickets");
            }
        } catch (error) {
            console.error("Network error fetching user tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTicketSubmit = async (e) => {
        e.preventDefault();
        setConfirmation("");

        const newTicket = {
            createdBy: email,
            title,
            description,
            category,
            priority,
            product,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTicket),
            });

            if (response.ok) {
                const data = await response.json();
                setConfirmation(`✅ Ticket #${data.id} submitted successfully!`);
                setTitle("");
                setDescription("");
                setCategory("General");
                setPriority("Low");
                setProduct("");
                fetchUserTickets(email); // Refresh the list
            } else {
                setConfirmation("❌ Failed to submit ticket.");
            }
        } catch (error) {
            setConfirmation("Network error during ticket submission.");
        }
    };

    // -----------------------------------------------------------------------
    // ADMIN TICKET LOGIC
    // -----------------------------------------------------------------------

    const fetchAllTickets = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/tickets`);
            if (response.ok) {
                const data = await response.json();
                setAllTickets(data);
            } else {
                console.error("Failed to fetch all tickets");
            }
        } catch (error) {
            console.error("Network error fetching all tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTicket = async (e) => {
        e.preventDefault();
        if (!selectedTicket || !newStatus) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/tickets/${selectedTicket.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, actionTaken: actionTaken }),
            });

            if (response.ok) {
                alert(`Ticket #${selectedTicket.id} updated successfully to ${newStatus}.`);
                // Clear state and refresh list
                setAdminView("list");
                setSelectedTicket(null);
                fetchAllTickets();
            } else {
                alert("Failed to update ticket.");
            }
        } catch (error) {
            alert("Network error updating ticket.");
        }
    };

    const filteredTickets = allTickets.filter(
        (t) => filterStatus === "All" || t.status === filterStatus
    );

    // -----------------------------------------------------------------------
    // RENDER LOGIC
    // -----------------------------------------------------------------------

    if (!isLoggedIn) {
        return (
            <div className="app-container">
                <header className="header">
                    <img src={logo} alt="Capaciti Logo" className="logo" />
                    <h1>{loginTitle}</h1>
                </header>

                <main className="login-container">
                    <form onSubmit={handleLogin} className="login-form">
                        <h2>Login</h2>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit">Login</button>
                        {loginError && <p className="error-message">{loginError}</p>}
                    </form>
                    
                    {/* The Register/Get Hash button has been REMOVED here */}

                </main>

                <footer className="footer">
                    <p>&copy; 2025 Capaciti. All Rights Reserved.</p>
                </footer>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // ADMIN VIEW
    // -----------------------------------------------------------------------

    if (role === "Admin") {
        const TicketList = () => (
            <>
                <h2>All Tickets ({allTickets.length})</h2>
                <div className="filter-controls">
                    <label>Filter Status:</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>

                <ul className="ticket-list">
                    {loading ? (
                        <p>Loading tickets...</p>
                    ) : (
                        filteredTickets.map((t) => (
                            <li
                                key={t.id}
                                className={`ticket-item ${t.status.toLowerCase().replace(" ", "-")}`}
                                onClick={() => {
                                    setSelectedTicket(t);
                                    setNewStatus(t.status);
                                    setActionTaken(t.actionTaken || "");
                                    setAdminView("details");
                                }}
                            >
                                <p style={{ fontWeight: "bold" }}>
                                    <span className={`priority-dot ${getPriorityDotClass(t.priority)}`}></span>
                                    Ticket Ref #{t.id} | Status: {t.status}
                                </p>
                                <p>
                                    **Title:** {t.title}
                                </p>
                                <small style={{ display: "block", marginTop: "5px", color: "#718096" }}>
                                    Booked by: **{t.createdBy}** on {new Date(t.createdAt).toLocaleString()}
                                </small>
                            </li>
                        ))
                    )}
                </ul>
            </>
        );

        const TicketDetails = () => (
            <div className="ticket-details">
                <button onClick={() => setAdminView("list")} className="back-button">
                    &larr; Back to List
                </button>
                <h2>Ticket Details (Ref #{selectedTicket.id})</h2>
                <div className="details-card">
                    <p>
                        <strong>Title:</strong> {selectedTicket.title}
                    </p>
                    <p>
                        <strong>Description:</strong> {selectedTicket.description}
                    </p>
                    <p>
                        <strong>Category:</strong> {selectedTicket.category}
                    </p>
                    <p>
                        <strong>Priority:</strong> <span className={`priority-dot ${getPriorityDotClass(selectedTicket.priority)}`}></span> {selectedTicket.priority}
                    </p>
                    <p>
                        <strong>Product/Service:</strong> {selectedTicket.product}
                    </p>
                    <p>
                        <strong>Created By:</strong> {selectedTicket.createdBy}
                    </p>
                    <p>
                        <strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                    <p>
                        <strong>Current Status:</strong> {selectedTicket.status}
                    </p>
                    <p className="admin-action-taken">
                        <strong>Action Taken (Fix):</strong> {selectedTicket.actionTaken || "N/A"}
                    </p>
                </div>

                {/* Update Form */}
                <h3>Update Ticket Status</h3>
                <form onSubmit={handleUpdateTicket} className="update-form">
                    <label>New Status:</label>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required>
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>

                    <label>Action Taken (Details of the Fix):</label>
                    <textarea
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        placeholder="Detail the steps taken to resolve the ticket..."
                        rows="4"
                    ></textarea>

                    <button type="submit">Update Ticket</button>
                </form>

                {/* Messages/History Section (Simplified) */}
                <div className="message-history">
                    <h3>Messages</h3>
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                        <ul className="message-list">
                            {selectedTicket.messages.map((m, index) => (
                                <li key={index}>
                                    <small>{new Date(m.timestamp).toLocaleString()}:</small>
                                    <p>{m.text}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No messages yet.</p>
                    )}
                </div>
            </div>
        );

        return (
            <div className="app-container">
                <header className="header admin-header">
                    <img src={logo} alt="Capaciti Logo" className="logo" />
                    <h1>Admin Portal</h1>
                    <div className="header-controls">
                        <p>Logged in as: <strong>{email}</strong></p>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </div>
                </header>

                <main className="admin-dashboard">
                    {adminView === "list" && <TicketList />}
                    {adminView === "details" && selectedTicket && <TicketDetails />}
                </main>

                <footer className="footer">
                    <p>&copy; 2025 Capaciti. All Rights Reserved.</p>
                </footer>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // USER VIEW
    // -----------------------------------------------------------------------

    return (
        <div className="app-container">
            <header className="header user-header">
                <img src={logo} alt="Capaciti Logo" className="logo" />
                <h1>User Dashboard</h1>
                <div className="header-controls">
                    <p>Logged in as: <strong>{email}</strong></p>
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
            </header>

            <div className="quick-actions-bar">
                <button onClick={() => setUserView("tickets")} className={userView === "tickets" ? "active" : ""}>My Tickets</button>
                <button onClick={() => setUserView("passwordChange")} className={userView === "passwordChange" ? "active" : ""}>Change Password</button>
                <button onClick={() => setShowQuickActions(!showQuickActions)}>{showQuickActions ? 'Hide Actions' : 'Show Actions'}</button>
            </div>

            {userView === "passwordChange" && (
                <main className="content-container password-change-container">
                    <h2>Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="password-form">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />

                        <label>New Password (min 6 chars)</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button type="submit">Change Password</button>
                        {passwordChangeMessage && <p className="message">{passwordChangeMessage}</p>}
                    </form>
                </main>
            )}

            {userView === "tickets" && (
                <div className="content-container user-view">
                    {showQuickActions && (
                        <div className="submit-ticket-form">
                            <h2>Submit New Ticket</h2>
                            <form onSubmit={handleTicketSubmit}>
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />

                                <label>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    rows="4"
                                />

                                <label>Product/Service</label>
                                <input
                                    type="text"
                                    value={product}
                                    onChange={(e) => setProduct(e.target.value)}
                                    required
                                />

                                <label>Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="General">General</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Billing">Billing</option>
                                </select>

                                <label>Priority</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>

                                <button type="submit">Submit Ticket</button>
                                {confirmation && <p className="message">{confirmation}</p>}
                            </form>
                        </div>
                    )}

                    <div className="ticket-history">
                        <h2>My Ticket History</h2>
                        <button onClick={() => fetchUserTickets(email)} className="refresh-button">Refresh Tickets</button>
                        <ul className="ticket-list">
                            {loading ? (
                                <p>Loading tickets...</p>
                            ) : tickets.length === 0 ? (
                                <p>You have no tickets logged.</p>
                            ) : (
                                tickets.map((h) => (
                                    <li
                                        key={h.id}
                                        className={`ticket-item ${h.status.toLowerCase().replace(" ", "-")}`}
                                    >
                                        <p style={{ fontWeight: 'bold' }}>
                                            <span className={`priority-dot ${getPriorityDotClass(h.priority)}`}></span>
                                            Ticket Ref #{h.id} | Status: {h.status}
                                        </p>
                                        <p>
                                            **Problem (Description):** *{h.description}*
                                        </p>
                                        {h.actionTaken && (
                                            <p style={{ marginTop: '5px', color: '#3182ce' }}>
                                                **Fix/Action Taken:** {h.actionTaken}
                                            </p>
                                        )}
                                        <small style={{ display: 'block', marginTop: '5px', color: '#718096' }}>
                                            Booked on: {new Date(h.createdAt).toLocaleString()} by **{h.createdBy}**
                                        </small>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            )}

            <footer className="footer">
                <p>&copy; 2025 Capaciti. All Rights Reserved.</p>
            </footer>
        </div>
    );
}

export default App;
