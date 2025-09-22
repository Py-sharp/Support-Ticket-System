import React, { useState, useEffect } from "react";
import "./App.css";

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

    const openUserHistoryPopup = (productName) => {
        setHistoryProductName(productName);
        setProductHistoryPopup(true);
        setProductHistory([]);

        fetch(`http://localhost:5000/tickets/${email}/product/${productName}`)
            .then((res) => res.json())
            .then((data) => setProductHistory(data));
    };

    // ------------------- ADMIN -------------------
    const handleAdminSearch = (e) => {
        e.preventDefault();
        // The useEffect hook now handles the filtering based on searchQuery state.
        // We just need to trigger a state update.
        setSearchQuery(searchQuery);
    };

    const openTicketDetailsPopup = async (ticket) => {
        setSelectedTicket(ticket);
    };

    const closeTicketDetailsPopup = () => {
        setSelectedTicket(null);
    };

    const openAdminProductHistoryPopup = async (productName) => {
        setHistoryProductName(productName);
        setProductHistoryPopup(true);
        setProductHistory([]);

        const res = await fetch(`http://localhost:5000/admin/tickets/product/${productName}`);
        const data = await res.json();
        setProductHistory(data);
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
            <div style={{ padding: "20px", fontFamily: "Arial" }}>
                <h1>Support Ticket System</h1>
                <p>{message}</p>
                <form onSubmit={handleLogin}>
                    <h2>Login</h2>
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <br />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <br />
                    <button type="submit">Login</button>
                    {loginError && <p style={{ color: "red" }}>{loginError}</p>}
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1>Support Ticket System</h1>
            <h2>Welcome, {email} ({role})</h2>
            <button onClick={handleLogout}>Logout</button>

            {/* ------------------- USER VIEW ------------------- */}
            {role === "User" && (
                <>
                    {confirmation && <p style={{ color: "green" }}>{confirmation}</p>}

                    <h3>Create Ticket</h3>
                    <form onSubmit={handleCreateTicket}>
                        <input placeholder="Product" value={product} onChange={(e) => setProduct(e.target.value)} required />
                        <br />
                        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <br />
                        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                        <br />
                        <label>Category:
                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option>General</option>
                                <option>Technical</option>
                                <option>Billing</option>
                            </select>
                        </label>
                        <br />
                        <label>Priority:
                            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </label>
                        <br />
                        <button type="submit" disabled={loading}>{loading ? "Loading..." : "Submit Ticket"}</button>
                    </form>

                    <hr style={{ margin: "20px 0" }} />

                    <h3>Change Password</h3>
                    <form onSubmit={handlePasswordChange}>
                        <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                        <br />
                        <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        <br />
                        <button type="submit">Update Password</button>
                        {passwordChangeMessage && <p style={{ color: "red" }}>{passwordChangeMessage}</p>}
                    </form>

                    <hr style={{ margin: "20px 0" }} />

                    <h3>My Tickets</h3>
                    <ul>
                        {tickets.map((t) => (
                            <li key={t.id}>
                                <strong>Ref #{t.id}</strong> | {t.product} | {t.title} ({t.status})
                                <button onClick={() => openUserHistoryPopup(t.product)}>View History</button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {/* ------------------- ADMIN VIEW ------------------- */}
            {role === "Admin" && (
                <>
                    <h3>Admin Dashboard</h3>
                    <button onClick={handleRegisterUser}>Register New User</button>
                    <div>
                        <button onClick={() => setFilterStatus("All")}>All</button>
                        <button onClick={() => setFilterStatus("Open")}>Open</button>
                        <button onClick={() => setFilterStatus("In Progress")}>In Progress</button>
                        <button onClick={() => setFilterStatus("Closed")}>Closed</button>
                        <button onClick={() => setFilterStatus("Ready for Collection")}>Ready for Collection</button>
                    </div>
                    <form onSubmit={handleAdminSearch} style={{ marginTop: "10px" }}>
                        <input
                            type="text"
                            placeholder="Search by product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit">Search</button>
                    </form>

                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f2f2f2" }}>
                                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Ref #</th>
                                <th style={{ padding: "8px", border: "1px solid #ddd" }}>From</th>
                                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Title</th>
                                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Product</th>
                                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Status</th>
                                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedTickets.map((t) => (
                                <tr key={t.id}>
                                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{t.id}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{t.createdBy}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{t.title}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{t.product}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>{t.status}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                                        <button onClick={() => openTicketDetailsPopup(t)}>View Details</button>
                                        <button onClick={() => openAdminProductHistoryPopup(t.product)}>Product History</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* ------------------- USER/ADMIN HISTORY POPUP ------------------- */}
            {productHistoryPopup && (
                <div className="popup-overlay">
                    <div className="popup">
                        <h3>History for {historyProductName}</h3>
                        <button onClick={() => setProductHistoryPopup(false)}>Close</button>
                        <ul>
                            {productHistory.map((h) => (
                                <li key={h.id}>
                                    <strong>Ref #{h.id}</strong> | {h.title} | {h.status}
                                    <br />
                                    <em>{h.description}</em>
                                    <br />
                                    <small>{new Date(h.createdAt).toLocaleString()}</small>
                                    <br />
                                    <button onClick={() => openTicketDetailsPopup(h)}>View Ticket Details</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ------------------- ADMIN TICKET DETAILS POPUP ------------------- */}
            {selectedTicket && (
                <div className="popup-overlay">
                    <div className="popup">
                        <h3>Ticket Ref #{selectedTicket.id}</h3>
                        <p><strong>Status:</strong> {selectedTicket.status}</p>
                        <p><strong>Title:</strong> {selectedTicket.title}</p>
                        <p><strong>Description:</strong> {selectedTicket.description}</p>
                        <p><strong>Product:</strong> {selectedTicket.product}</p>
                        <p><strong>Created By:</strong> {selectedTicket.createdBy}</p>

                        <h4>Actions</h4>
                        <button onClick={() => handleUpdateTicket(selectedTicket.id, "In Progress")}>Mark In Progress</button>
                        <button onClick={() => handleUpdateTicket(selectedTicket.id, "Closed", prompt("Enter action taken:"))}>Close Ticket</button>
                        <button onClick={() => handleCommunicate(selectedTicket.id)}>Communicate</button>
                        <button onClick={() => handleCollect(selectedTicket.id)}>Mark for Collection</button>

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
        </div>
    );
}

export default App;
