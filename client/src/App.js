import React, { useState, useEffect } from "react";
import "./App.css";
import logo from "./images/logo-removebg-preview.png";

function App() {

    const BACKEND_URL = 'https://support-ticket-system-igce.onrender.com/'; 
   

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
    const [allTickets, setAllTickets] = useState([]); // Master list of all tickets
    const [displayedTickets, setDisplayedTickets] = useState([]); // Filtered list for display
    const [filterStatus, setFilterStatus] = useState("All"); // Admin status filter
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null); // For admin ticket details popup
    const [productHistoryPopup, setProductHistoryPopup] = useState(false);
    const [productHistory, setProductHistory] = useState([]);
    const [historyProductName, setHistoryProductName] = useState("");

    const [users, setUsers] = useState([]);
    const [adminView, setAdminView] = useState("tickets"); // "tickets" or "userManagement"

    // New state for header enhancements
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const [unreadTickets, setUnreadTickets] = useState(0);

    // Helper function for priority dot color (Req 2)
    const getPriorityDotClass = (priority) => {
        const p = priority ? priority.toLowerCase() : "low";
        if (p === "high") return "dot-high"; // Red
        if (p === "medium") return "dot-medium"; // Amber
        return "dot-low"; // Green
    };

    // Helper function for category abbreviation (Req 3)
    const getCategoryAbbreviation = (category) => {
        if (!category) return "";
        const c = category.toLowerCase();
        if (c.includes("technical")) return "T";
        if (c.includes("general")) return "G";
        if (c.includes("billing")) return "B";
        return "";
    };


    useEffect(() => {
        // Updated URL
        fetch(`${BACKEND_URL}/`)
            .then((res) => res.text())
            .then((data) => setMessage(data));
    }, [BACKEND_URL]); // Added BACKEND_URL to dependency array for completeness

    useEffect(() => {
        let filtered = [...allTickets];

        if (searchQuery) {
            filtered = filtered.filter(t => t.product.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (filterStatus !== "All") {
            filtered = filtered.filter(t => t.status === filterStatus);
        }

        setDisplayedTickets(filtered);

        // Update unread tickets count for admin
        if (role === "Admin") {
            const newTickets = allTickets.filter(t => t.status === "Open").length;
            setUnreadTickets(newTickets);
        }
    }, [allTickets, searchQuery, filterStatus, role]);


    // ------------------- LOGIN -------------------
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setPasswordChangeMessage("");

        const adminEmail = "kgomotsosele80@gmail.com";
        // Updated URL
        const loginUrl = email === adminEmail
            ? `${BACKEND_URL}/admin/login`
            : `${BACKEND_URL}/login`;

        try {
            const res = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) throw new Error("Invalid credentials");
            const data = await res.json();

            if (data.user.role === "Admin") {
                setLoginTitle("Admin Login");
            } else {
                setLoginTitle("User Login");
            }

            setIsLoggedIn(true);
            setRole(data.user.role);
            setEmail(data.user.email);

            if (data.user.role === "User") {
                fetchTickets(data.user.email);
            } else {
                fetchAllTickets();
                fetchUsers();
            }
        } catch (err) {
            setLoginError("Invalid email or password");
        }
    };

    const fetchTickets = (userEmail) => {
        // Updated URL
        fetch(`${BACKEND_URL}/tickets/${userEmail}`)
            .then((res) => res.json())
            .then((data) => setTickets(data));
    };

    const fetchAllTickets = () => {
        // Updated URL
        fetch(`${BACKEND_URL}/admin/tickets`)
            .then((res) => res.json())
            .then((data) => {
                setAllTickets(data);
            });
    };

    const fetchUsers = () => {
        // Updated URL
        fetch(`${BACKEND_URL}/admin/users`)
            .then((res) => res.json())
            .then((data) => setUsers(data));
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
        setShowQuickMenu(false);
        setUnreadTickets(0);
        setShowQuickActions(false); // Reset user quick actions
        setUserView("tickets"); // Reset user view
        setAdminView("tickets"); // Reset admin view
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordChangeMessage("");

        if (newPassword.length < 4) {
            setPasswordChangeMessage("New password must be at least 4 characters.");
            return;
        }

        // Updated URL
        const res = await fetch(`${BACKEND_URL}/user/update-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, currentPassword, newPassword }),
        });
        const data = await res.json();
        if (data.success) {
            setPasswordChangeMessage("Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setPassword(newPassword);
        } else {
            setPasswordChangeMessage(data.message);
        }
    };

    // ------------------- USER -------------------
    const handleCreateTicket = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Updated URL
        const res = await fetch(`${BACKEND_URL}/tickets`, {
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

    const openAdminProductHistoryPopup = async (productName) => {
        setHistoryProductName(productName);
        setProductHistoryPopup(true);
        setProductHistory([]);

        // Updated URL
        const res = await fetch(`${BACKEND_URL}/admin/tickets/product/${productName}`);
        const data = await res.json();
        setProductHistory(data);
    };

    const openTicketDetailsPopup = async (ticket) => {
        setSelectedTicket(ticket);
    };

    // ------------------- ADMIN -------------------
    const handleAdminSearch = (e) => {
        e.preventDefault();
    };

    const closeTicketDetailsPopup = () => {
        setSelectedTicket(null);
    };

    // Unified function to handle status updates (Fix for CollectionA and In Progress)
    const handleUpdateTicket = async (id, status, actionTaken = "") => {
        // Prompt for action taken if status is 'In Progress', 'Collected', or 'Closed'
        let finalActionTaken = actionTaken;
        if ((status === 'In Progress' || status === 'Collected' || status === 'Closed') && !actionTaken) {
            finalActionTaken = window.prompt(`Enter action taken for status: ${status}:`);
            if (finalActionTaken === null || finalActionTaken.trim() === "") {
                // If user cancels or enters empty string, use a default message.
                finalActionTaken = `Ticket status updated to ${status}.`;
            }
        }

        // Updated URL
        await fetch(`${BACKEND_URL}/admin/tickets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, actionTaken: finalActionTaken }),
        });
        fetchAllTickets();
        if (selectedTicket && selectedTicket.id === id) {
            // Updated URL
            const res = await fetch(`${BACKEND_URL}/ticket/${id}`);
            const updatedTicket = await res.json();
            setSelectedTicket(updatedTicket);
        }
    };

    // Removed handleCollect as it's now covered by handleUpdateTicket(id, "Collected")

    const handleCommunicate = async (id) => {
        const message = window.prompt("Enter custom message to user:");
        if (!message) return;
        // Updated URL
        await fetch(`${BACKEND_URL}/admin/tickets/${id}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        fetchAllTickets();
        if (selectedTicket && selectedTicket.id === id) {
            // Updated URL
            const res = await fetch(`${BACKEND_URL}/ticket/${id}`);
            const updatedTicket = await res.json();
            setSelectedTicket(updatedTicket);
        }
    };

    const handleRegisterUser = async () => {
        const userEmail = window.prompt("Enter new user's email:");
        if (!userEmail) return;

        const autoPassword = Math.random().toString(36).slice(-8);

        try {
            // Updated URL
            const res = await fetch(`${BACKEND_URL}/admin/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, password: autoPassword }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server responded with an error: ${res.status} - ${errorText}`);
            }

            const data = await res.json();

            if (data.success) {
                window.alert(`User ${userEmail} registered successfully! An auto-generated password (${autoPassword}) has been emailed to them.`);
                fetchUsers();
            } else {
                window.alert(`Error: ${data.message}`);
            }
        } catch (err) {
            console.error("Failed to register user:", err);
            window.alert("Registration failed. Please check the console for details.");
        }
    };

    const handleDeregisterUser = async (userEmail) => {
        if (!window.confirm(`Are you sure you want to deregister ${userEmail}? This action cannot be undone.`)) {
            return;
        }

        try {
            // Updated URL
            const res = await fetch(`${BACKEND_URL}/admin/users/${userEmail}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server responded with an error: ${res.status} - ${errorText}`);
            }

            const data = await res.json();

            if (data.success) {
                window.alert(`User ${userEmail} deregistered successfully!`);
                fetchUsers();
                fetchAllTickets();
            } else {
                window.alert(`Error: ${data.message}`);
            }
        } catch (err) {
            console.error("Failed to deregister user:", err);
            window.alert("Deregistration failed. Please check the console for details.");
        }
    };

    const handleForgotPassword = async () => {
        const userEmail = window.prompt("Please enter your email to reset your password:");
        if (!userEmail) return;

        try {
            // Updated URL
            const res = await fetch(`${BACKEND_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail }),
            });

            const data = await res.json();
            if (res.ok) {
                window.alert(data.message);
            } else {
                window.alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error("Forgot password request failed:", error);
            window.alert("Could not connect to the server. Please try again later.");
        }
    };

    // ------------------- RENDER -------------------
    if (!isLoggedIn) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <h1 className="system-title">Support Ticket System</h1>
                    <p className="system-subtitle">Manage your support requests efficiently.</p>
                    <h2 className="login-title">{loginTitle}</h2>
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
                        <p>Forgot password? <a href="#" onClick={handleForgotPassword}>Click here to reset</a></p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-content">
            {/* Enhanced Header */}
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={logo} alt="Company Logo" className="header-logo" />
                    <div style={{ borderLeft: '2px solid #F25c54', height: '40px' }}></div>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: '#000035' }}>
                            Support Portal
                        </div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>
                            {role === 'Admin' ? 'Administrator Dashboard' : 'User Support Center'}
                        </div>
                    </div>
                </div>

                <div className="header-user-info">
                    <div className="header-welcome">
                        <div className="user-avatar">
                            {email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: '500' }}>{email}</div>
                            <span className="user-status-badge">{role}</span>
                        </div>
                    </div>

                    {/* Admin's Quick Actions Menu */}
                    {role === "Admin" && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {unreadTickets > 0 && (
                                <div style={{
                                    background: '#e53e3e',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {unreadTickets}
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setShowQuickMenu(!showQuickMenu);
                                    if (!showQuickMenu) setAdminView("tickets"); // Hide user management if menu is about to open
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: '#F25c54',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Quick Actions ▼
                            </button>

                            {showQuickMenu && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    minWidth: '200px'
                                }}>
                                    <button
                                        onClick={() => { handleRegisterUser(); setShowQuickMenu(false); }}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            textAlign: 'left',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f7fafc'}
                                        onMouseLeave={(e) => e.target.style.background = 'none'}
                                    >
                                        ➕ Register New User
                                    </button>
                                    <button
                                        onClick={() => { setAdminView("userManagement"); setShowQuickMenu(false); }}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            textAlign: 'left',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f7fafc'}
                                        onMouseLeave={(e) => e.target.style.background = 'none'}
                                    >
                                        👥 Manage Users
                                    </button>
                                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '5px 0' }}></div>
                                    <div style={{ padding: '8px', fontSize: '12px', color: '#718096' }}>
                                        Tickets: {allTickets.length} | Users: {users.filter(u => u.role === 'User').length}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* User's Quick Actions menu */}
                    {role === "User" && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    setShowQuickActions(!showQuickActions);
                                    if (!showQuickActions) setUserView("tickets"); // Hide password form if menu is about to open
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: '#F25c54',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Quick Actions ▼
                            </button>
                            {showQuickActions && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    minWidth: '200px'
                                }}>
                                    <button
                                        onClick={() => {
                                            setUserView("passwordChange");
                                            setShowQuickActions(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            textAlign: 'left',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f7fafc'}
                                        onMouseLeave={(e) => e.target.style.background = 'none'}
                                    >
                                        Change Password
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={handleLogout} style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: '2px solid #F25c54',
                        borderRadius: '8px',
                        color: '#F25c54',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>🚪</span> Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-container">
                {/* ------------------- USER VIEW ------------------- */}
                {role === "User" && (
                    <div className="user-dashboard">
                        {userView === "tickets" && (
                            <>
                                {confirmation && <p style={{ color: "green" }}>{confirmation}</p>}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <h2 className="section-title">My Tickets</h2>
                                </div>
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
                                <h3>My Tickets</h3>
                                <ul className="user-ticket-list">
                                    {tickets.map((t) => (
                                        <li key={t.id}>
                                            <div>
                                                {/* Priority Dot & Ref # */}
                                                <span className={`priority-dot ${getPriorityDotClass(t.priority)}`}></span>
                                                <strong>Ref #{t.id}</strong> | {t.product} |
                                                {/* Category Abbreviation & Title */}
                                                <span className="category-abbr">({getCategoryAbbreviation(t.category)})</span>
                                                {t.title} ({t.status})
                                            </div>
                                            <button onClick={() => openTicketDetailsPopup(t)}>View Details</button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {userView === "passwordChange" && (
                            <div className="password-change-section">
                                <h3>Change Password</h3>
                                <form onSubmit={handlePasswordChange}>
                                    {passwordChangeMessage && <p style={{ color: "red" }}>{passwordChangeMessage}</p>}
                                    <div className="form-group">
                                        <label htmlFor="currentPassword">Current Password</label>
                                        <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="newPassword">New Password</label>
                                        <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                                    </div>
                                    <button className="submit-button" type="submit">Update Password</button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* ------------------- ADMIN VIEW ------------------- */}
                {role === "Admin" && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 className="section-title">
                                {adminView === "tickets" ? `Tickets (${allTickets.length})` : "User Management"}
                            </h2>
                            {adminView === "userManagement" && (
                                <button
                                    onClick={() => setAdminView("tickets")}
                                    style={{
                                        padding: '8px 16px',
                                        border: '2px solid #F25c54',
                                        background: 'transparent',
                                        color: '#F25c54',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Back to Tickets
                                </button>
                            )}
                        </div>

                        {adminView === "tickets" && (
                            <>
                                <div className="admin-controls">
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
                                                <td>
                                                    <span className={`priority-dot ${getPriorityDotClass(t.priority)}`}></span>
                                                    {t.id}
                                                </td>
                                                <td>{t.createdBy}</td>
                                                <td>
                                                    <span className="category-abbr">({getCategoryAbbreviation(t.category)})</span>
                                                    {t.title}
                                                </td>
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

                        {adminView === "userManagement" && (
                            <div className="user-management">
                                <div className="user-count">
                                    <strong>Total Users: {users.filter(user => user.role === "User").length}</strong>
                                </div>

                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(user => user.role === "User").map((user) => (
                                            <tr key={user.email}>
                                                <td>{user.email}</td>
                                                <td>{user.role}</td>
                                                <td>
                                                    <button
                                                        className="danger-button"
                                                        onClick={() => handleDeregisterUser(user.email)}
                                                        title="Deregister user"
                                                    >
                                                        Deregister
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {users.filter(user => user.role === "User").length === 0 && (
                                    <p style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                                        No users registered yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ------------------- TICKET DETAILS POPUP (FOR BOTH USERS AND ADMINS) ------------------- */}
            {selectedTicket && (
                <div className="popup-overlay">
                    <div className="popup">
                        <div className="popup-header">
                            <h3>Ticket Ref #{selectedTicket.id}</h3>
                            <button className="close-button" onClick={closeTicketDetailsPopup}>&times;</button>
                        </div>
                        <p><strong>Status:</strong> {selectedTicket.status}</p>
                        <p>
                            <strong>Title:</strong>
                            <span className="category-abbr">({getCategoryAbbreviation(selectedTicket.category)})</span>
                            {selectedTicket.title}
                        </p>
                        <p>
                            <strong>Priority:</strong>
                            <span className={`priority-dot ${getPriorityDotClass(selectedTicket.priority)}`}></span>
                            {selectedTicket.priority}
                        </p>
                        <p><strong>Description:</strong> {selectedTicket.description}</p>
                        <p><strong>Product:</strong> {selectedTicket.product}</p>
                        <p><strong>Created By:</strong> {selectedTicket.createdBy}</p>

                        {/* Conditionally render actions for admin only */}
                        {role === "Admin" && (
                            <>
                                <h4>Actions</h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Mark Collected (Fix for "CollectionA" - initial review) */}
                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "Collected")}
                                        className="action-button-collected"
                                    >
                                        Mark Collected
                                    </button>

                                    {/* Mark In Progress (Fix for non-working status update) */}
                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "In Progress")}
                                        className="action-button-inprogress"
                                    >
                                        Mark In Progress
                                    </button>

                                    {/* NEW: Ready for Collection Status */}
                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "Ready for Collection")}
                                        className="action-button-ready" /* New CSS class for styling */
                                    >
                                        Mark Ready for Collection
                                    </button>

                                    {/* Communicate (Already works and sends email) */}
                                    <button
                                        onClick={() => handleCommunicate(selectedTicket.id)}
                                        className="action-button-communicate"
                                    >
                                        Communicate
                                    </button>

                                    {/* Close Ticket (Using unified function) */}
                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "Closed")}
                                        className="action-button-close"
                                    >
                                        Close Ticket
                                    </button>
                                </div>
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
                    </div>
                </div>
            )}

            {/* ------------------- ADMIN HISTORY POPUP ------------------- */}
            {productHistoryPopup && role === "Admin" && (
                <div className="popup-overlay">
                    <div className="popup">
                        <div className="popup-header">
                            <h3>History for {historyProductName}</h3>
                            <button className="close-button" onClick={() => setProductHistoryPopup(false)}>&times;</button>
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

            <footer className="footer">
                <p>&copy; 2025 Capaciti. All Rights Reserved.</p>
            </footer>
        </div>
    );
}

export default App;
