import React, { useState, useEffect } from "react";
import "./App.css";
import logo from "./images/logo-removebg-preview.png"

function App() {
    const [message, setMessage] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState(""); // "User" or "Admin"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

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

    // Admin state
    const [allTickets, setAllTickets] = useState([]); // Master list of all tickets
    const [displayedTickets, setDisplayedTickets] = useState([]); // Filtered list for display
    const [filterStatus, setFilterStatus] = useState("All"); // Admin status filter
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null); // For admin ticket details popup
    const [productHistoryPopup, setProductHistoryPopup] = useState(false);
    const [productHistory, setProductHistory] = useState([]);
    const [historyProductName, setHistoryProductName] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000/")
            .then((res) => res.text())
            .then((data) => setMessage(data));
    }, []);

    // Effect to handle filtering when tickets, search query, or filter status changes
    useEffect(() => {
        let filtered = [...allTickets];

        // Apply search filter first
        if (searchQuery) {
            filtered = filtered.filter(t => t.product.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Apply status filter
        if (filterStatus !== "All") {
            filtered = filtered.filter(t => t.status === filterStatus);
        }

        setDisplayedTickets(filtered);
    }, [allTickets, searchQuery, filterStatus]);


    // ------------------- LOGIN -------------------
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setPasswordChangeMessage("");

        const adminEmail = "kgomotsosele80@gmail.com";
        const loginUrl = email === adminEmail
            ? "http://localhost:5000/admin/login"
            : "http://localhost:5000/login";

        try {
            const res = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) throw new Error("Invalid credentials");
            const data = await res.json();

            setIsLoggedIn(true);
            setRole(data.user.role);
            setEmail(data.user.email);

            // Load tickets based on role
            if (data.user.role === "User") {
                fetchTickets(data.user.email);
            } else { // Admin
                fetchAllTickets();
            }
        } catch (err) {
            setLoginError("Invalid email or password");
        }
    };

    const fetchTickets = (userEmail) => {
        fetch(`http://localhost:5000/tickets/${userEmail}`)
            .then((res) => res.json())
            .then((data) => setTickets(data));
    };

    const fetchAllTickets = () => {
        fetch(`http://localhost:5000/admin/tickets`)
            .then((res) => res.json())
            .then((data) => {
                setAllTickets(data);
            });
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setRole("");
        setEmail("");
        setPassword("");
        setTickets([]);
        setAllTickets([]);
        setDisplayedTickets([]);
        setConfirmation("");
        setLoginError("");
        setFilterStatus("All");
        setSearchQuery("");
        setSelectedTicket(null);
        setProductHistoryPopup(false);
        setProductHistory([]);
        setHistoryProductName("");
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordChangeMessage("");

        if (newPassword.length < 4) {
            setPasswordChangeMessage("New password must be at least 4 characters.");
            return;
        }

        const res = await fetch("http://localhost:5000/user/update-password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, currentPassword, newPassword }),
        });
        const data = await res.json();
        if (data.success) {
            setPasswordChangeMessage("Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setPassword(newPassword); // Update state to prevent re-login issue
        } else {
            setPasswordChangeMessage(data.message);
        }
    };

    // ------------------- USER -------------------
    const handleCreateTicket = async (e) => {
        e.preventDefault();
        setLoading(true);

        const res = await fetch("http://localhost:5000/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, category, priority, email, product }),
        });
        const data = await res.json();
        setLoading(false);

        if (data.success) {
            setTickets([...tickets, data.ticket]);
            setConfirmation(`Ticket created successfully! Ref #: ${data.ticket.id}`);
            setTitle("");
            setDescription("");
            setCategory("General");
            setPriority("Low");
            setProduct("");
        }
    };

    // This function is now only for admin use
    const openAdminProductHistoryPopup = async (productName) => {
        setHistoryProductName(productName);
        setProductHistoryPopup(true);
        setProductHistory([]);

        const res = await fetch(`http://localhost:5000/admin/tickets/product/${productName}`);
        const data = await res.json();
        setProductHistory(data);
    };

    const openTicketDetailsPopup = async (ticket) => {
        setSelectedTicket(ticket);
    };

    // ------------------- ADMIN -------------------
    const handleAdminSearch = (e) => {
        e.preventDefault();
        // The useEffect hook now handles the filtering based on searchQuery state.
        // We just need to trigger a state update.
        setSearchQuery(searchQuery);
    };

    const closeTicketDetailsPopup = () => {
        setSelectedTicket(null);
    };

    const handleUpdateTicket = async (id, status, actionTaken) => {
        await fetch(`http://localhost:5000/admin/tickets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, actionTaken }),
        });
        fetchAllTickets(); // Refresh all tickets
        if (selectedTicket && selectedTicket.id === id) {
            // Re-fetch the single ticket to update the popup
            const res = await fetch(`http://localhost:5000/ticket/${id}`);
            const updatedTicket = await res.json();
            setSelectedTicket(updatedTicket);
        }
    };

    const handleCollect = async (id) => {
        await fetch(`http://localhost:5000/admin/tickets/${id}/collect`, {
            method: "POST",
        });
        fetchAllTickets(); // Refresh all tickets
    };

    const handleCommunicate = async (id) => {
        const message = prompt("Enter custom message to user:");
        if (!message) return;
        await fetch(`http://localhost:5000/admin/tickets/${id}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        fetchAllTickets(); // Refresh all tickets
        if (selectedTicket && selectedTicket.id === id) {
            const res = await fetch(`http://localhost:5000/ticket/${id}`);
            const updatedTicket = await res.json();
            setSelectedTicket(updatedTicket);
        }
    };

    const handleRegisterUser = async () => {
        const userEmail = prompt("Enter new user's email:");
        if (!userEmail) return;

        const res = await fetch("http://localhost:5000/admin/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
        });
        const data = await res.json();
        if (data.success) {
            alert(`User ${userEmail} registered successfully! An auto-generated password has been emailed to them.`);
        } else {
            alert(`Error: ${data.message}`);
        }
    };

    // ------------------- RENDER -------------------
    if (!isLoggedIn) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <h1 className="system-title">Support Ticket System</h1>
                    <p className="system-subtitle">Manage your support requests efficiently</p>
                    <h2 className="login-title">Welcome Back</h2>
                    {loginError && <div className="error-message">{loginError}</div>}
                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <input
                                className="form-input"
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <span className="form-input-icon">✉️</span>
                        </div>
                        <div className="form-group">
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <span className="form-input-icon">🔒</span>
                        </div>
                        <button className="login-button" type="submit">
                            Sign In
                        </button>
                    </form>
                    <div className="login-footer">
                        <p>Need help? Contact system administrator</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-content">
            <header className="header">
                        <img src={logo} alt="Company Logo" className="header-logo" />
                        <div className="header-user-info">
                            <span>Welcome, {email} [{role}]</span>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    </header>

            <main className="dashboard-container">
                {/* ------------------- USER VIEW ------------------- */}
                {role === "User" && (
                    <div className="user-dashboard">
                        {confirmation && <p style={{ color: "green" }}>{confirmation}</p>}

                        <h3>Create Ticket</h3>
                        <form onSubmit={handleCreateTicket}>
                            <div className="form-group">
                                <label htmlFor="product">Product</label>
                                <input id="product" type="text" value={product} onChange={(e) => setProduct(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="title">Title</label>
                                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="category">Category</label>
                                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option>General</option>
                                    <option>Technical</option>
                                    <option>Billing</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="priority">Priority</label>
                                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <button className="submit-button" type="submit" disabled={loading}>{loading ? "Loading..." : "Submit Ticket"}</button>
                        </form>

                        <hr style={{ margin: "20px 0" }} />

                        <h3>Change Password</h3>
                        <form onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                            </div>
                            <button className="submit-button" type="submit">Update Password</button>
                            {passwordChangeMessage && <p style={{ color: "red" }}>{passwordChangeMessage}</p>}
                        </form>

                        <hr style={{ margin: "20px 0" }} />

                        <h3>My Tickets</h3>
                        <ul className="user-ticket-list">
                            {tickets.map((t) => (
                                <li key={t.id}>
                                    <div>
                                        <strong>Ref #{t.id}</strong> | {t.product} | {t.title} ({t.status})
                                    </div>
                                    <button onClick={() => openTicketDetailsPopup(t)}>View Details</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ------------------- ADMIN VIEW ------------------- */}
                {role === "Admin" && (
                    <>
                        <h3>Admin Dashboard</h3>
                        <div className="admin-controls">
                            <button onClick={handleRegisterUser}>Register New User</button>
                            <button className={filterStatus === "All" ? "active" : ""} onClick={() => setFilterStatus("All")}>All</button>
                            <button className={filterStatus === "Open" ? "active" : ""} onClick={() => setFilterStatus("Open")}>Open</button>
                            <button className={filterStatus === "In Progress" ? "active" : ""} onClick={() => setFilterStatus("In Progress")}>In Progress</button>
                            <button className={filterStatus === "Closed" ? "active" : ""} onClick={() => setFilterStatus("Closed")}>Closed</button>
                            <button className={filterStatus === "Ready for Collection" ? "active" : ""} onClick={() => setFilterStatus("Ready for Collection")}>Ready for Collection</button>
                            <form onSubmit={handleAdminSearch}>
                                <input
                                    type="text"
                                    placeholder="Search by product..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button type="submit">Search</button>
                            </form>
                        </div>

                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Ref #</th>
                                    <th>From</th>
                                    <th>Title</th>
                                    <th>Product</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedTickets.map((t) => (
                                    <tr key={t.id}>
                                        <td>{t.id}</td>
                                        <td>{t.createdBy}</td>
                                        <td>{t.title}</td>
                                        <td>{t.product}</td>
                                        <td>{t.status}</td>
                                        <td>
                                            <button onClick={() => openTicketDetailsPopup(t)}>View Details</button>
                                            <button onClick={() => openAdminProductHistoryPopup(t.product)}>View History</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </main>

            {/* ------------------- ADMIN HISTORY POPUP ------------------- */}
            {productHistoryPopup && role === "Admin" && (
                <div className="popup-overlay">
                    <div className="popup">
                        <div className="popup-header">
                            <h3>History for {historyProductName}</h3>
                            <button className="close-button" onClick={() => setProductHistoryPopup(false)}>Close</button>
                        </div>
                        <ul className="history-list">
                            {productHistory.map((h) => (
                                <li key={h.id}>
                                    <strong>Ticket Ref #{h.id}</strong> | from **{h.createdBy}**
                                    <br />
                                    <span>Title: {h.title}</span> | <span>Status: {h.status}</span>
                                    <br />
                                    <em>{h.description}</em>
                                    <br />
                                    <small>{new Date(h.createdAt).toLocaleString()}</small>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ------------------- TICKET DETAILS POPUP (FOR BOTH USERS AND ADMINS) ------------------- */}
            {selectedTicket && (
                <div className="popup-overlay">
                    <div className="popup">
                        <h3>Ticket Ref #{selectedTicket.id}</h3>
                        <p><strong>Status:</strong> {selectedTicket.status}</p>
                        <p><strong>Title:</strong> {selectedTicket.title}</p>
                        <p><strong>Description:</strong> {selectedTicket.description}</p>
                        <p><strong>Product:</strong> {selectedTicket.product}</p>
                        <p><strong>Created By:</strong> {selectedTicket.createdBy}</p>

                        {/* Conditionally render actions for admin only */}
                        {role === "Admin" && (
                            <>
                                <h4>Actions</h4>
                                <button onClick={() => handleUpdateTicket(selectedTicket.id, "In Progress")}>Mark In Progress</button>
                                <button onClick={() => handleUpdateTicket(selectedTicket.id, "Closed", prompt("Enter action taken:"))}>Close Ticket</button>
                                <button onClick={() => handleCommunicate(selectedTicket.id)}>Communicate</button>
                                <button onClick={() => handleCollect(selectedTicket.id)}>Mark for Collection</button>
                            </>
                        )}

                        <h4>Communication History</h4>
                        <ul>
                            {selectedTicket.messages.length > 0 ? (
                                selectedTicket.messages.map((msg, index) => (
                                    <li key={index}>
                                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                                        <p><em>{msg.text}</em></p>
                                    </li>
                                ))
                            ) : (
                                <li>No messages yet.</li>
                            )}
                        </ul>
                        <button onClick={closeTicketDetailsPopup}>Close</button>
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