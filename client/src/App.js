import React, { useState, useEffect } from "react";
import "./App.css";
import logo from "./images/logo-removebg-preview.png";

// Add your live backend URL here (Remember to replace this with your actual Render URL later)
const API_BASE_URL = "http://localhost:5000";

function App() {
    const [message, setMessage] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState(""); // "User" or "Admin"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginTitle, setLoginTitle] = useState("Welcome to our Support Portal");

    // NEW STATES FOR REGISTRATION (Temporary fix for password hashing)
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirmation, setRegConfirmation] = useState("");
    const [isRegistering, setIsRegistering] = useState(false); // Toggle view

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
    // const [groupedTickets, setGroupedTickets] = useState({}); // REMOVED: No longer grouping in main view
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
        fetch(`${API_BASE_URL}/`)
            .then((res) => res.text())
            .then((data) => setMessage(data));
    }, []);

    // RESTORED useEffect: Filters tickets and sets unread count (no grouping)
    useEffect(() => {
        let filtered = [...allTickets];

        if (searchQuery) {
            // Filter by product only if it exists
            filtered = filtered.filter(t => t.product && t.product.toLowerCase().includes(searchQuery.toLowerCase()));
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
        const loginUrl = email === adminEmail
            ? `${API_BASE_URL}/admin/login`
            : `${API_BASE_URL}/login`;

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
        fetch(`${API_BASE_URL}/tickets/${userEmail}`)
            .then((res) => res.json())
            .then((data) => setTickets(data));
    };

    const fetchAllTickets = () => {
        fetch(`${API_BASE_URL}/admin/tickets`)
            .then((res) => res.json())
            .then((data) => {
                setAllTickets(data);
            });
    };

    const fetchUsers = () => {
        fetch(`${API_BASE_URL}/admin/users`)
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
        // setGroupedTickets({}); // Removed
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
        // NEW: Reset temporary registration states
        setRegEmail("");
        setRegPassword("");
        setRegConfirmation("");
        setIsRegistering(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordChangeMessage("");

        if (newPassword.length < 4) {
            setPasswordChangeMessage("New password must be at least 4 characters.");
            return;
        }

        const res = await fetch(`${API_BASE_URL}/user/update-password`, {
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

    // ------------------- LOGIN/REGISTRATION TEMP FIX -------------------

    // NEW: Function to handle temporary registration
    const handleRegister = async (e) => {
        e.preventDefault();
        setRegConfirmation("");
        setLoginError(""); // Clear login errors when registering

        if (regPassword.length < 4) {
             setRegConfirmation("❌ Password must be at least 4 characters.");
             return;
        }

        const res = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: regEmail, password: regPassword }),
        });

        const data = await res.json();

        if (data.success) {
            setRegConfirmation("✅ Registration successful! The password hash is now in Firestore. You can now copy it. Go back to Login.");
            setRegEmail("");
            setRegPassword("");
        } else {
            setRegConfirmation(`❌ Registration failed: ${data.message}`);
        }
    };

    // ------------------- USER -------------------
    const handleCreateTicket = async (e) => {
        e.preventDefault();
        setLoading(true);

        const res = await fetch(`${API_BASE_URL}/tickets`, {
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

    // FIXED: Now uses URL encoding for robustness and includes error handling for the index issue
    const openAdminProductHistoryPopup = async (productName) => {
        setHistoryProductName(productName);
        setProductHistory([]); // Clear previous history
        setProductHistoryPopup(true); // Open the popup immediately with a loading state

        try {
            // CRITICAL FIX: Encode the product name for the URL to handle spaces/special characters
            const encodedProductName = encodeURIComponent(productName);
            const res = await fetch(`${API_BASE_URL}/admin/tickets/product/${encodedProductName}`);

            if (!res.ok) {
                // Throw error if response status is not 2xx
                const errorText = await res.text();
                throw new Error(`Failed to fetch history (Status: ${res.status}): ${errorText}`);
            }

            const data = await res.json();
            setProductHistory(data);

        } catch (error) {
            console.error("Failed to fetch product history:", error);
            // CRITICAL FIX: Alert the user about the most common failure (Firebase Index)
            window.alert(`Failed to load product history for "${productName}". Please check the console for details.\n\nNOTE: If the error mentions 'FAILED_PRECONDITION', you need to create a composite index in your Firebase console.`);
            setProductHistoryPopup(false); // Close popup on failure
            setProductHistory([]); // Clear history on failure
        }
    };

    const openTicketDetailsPopup = async (ticket) => {
        // For Admin, it's better to fetch the latest details
        if (role === "Admin" && ticket.id) {
            const res = await fetch(`${API_BASE_URL}/ticket/${ticket.id}`);
            if (res.ok) {
                const latestTicket = await res.json();
                setSelectedTicket(latestTicket);
                return;
            }
        }
        setSelectedTicket(ticket);
    };

    // ------------------- ADMIN -------------------
    const handleAdminSearch = (e) => {
        e.preventDefault();
        // Search logic is handled in the useEffect based on searchQuery state
    };

    const closeTicketDetailsPopup = () => {
        setSelectedTicket(null);
    };

    // Unified function to handle status updates
    const handleUpdateTicket = async (id, status, actionTaken = "") => {
        // Prompt for action taken if status is 'In Progress', 'Collected', or 'Closed'
        let finalActionTaken = actionTaken;
        if ((status === 'In Progress' || status === 'Collected' || status === 'Closed' || status === 'Ready for Collection') && !actionTaken) {
            finalActionTaken = window.prompt(`Enter action taken (the fix) for status: ${status}:`);
            if (finalActionTaken === null || finalActionTaken.trim() === "") {
                // If user cancels or enters empty string, use a default message.
                finalActionTaken = `Ticket status updated to ${status}.`;
            }
        }

        await fetch(`${API_BASE_URL}/admin/tickets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, actionTaken: finalActionTaken }),
        });
        fetchAllTickets(); // Reloads all tickets, triggering the filtering
        if (selectedTicket && selectedTicket.id === id) {
            const res = await fetch(`${API_BASE_URL}/ticket/${id}`);
            const updatedTicket = await res.json();
            setSelectedTicket(updatedTicket);
        }
    };

    const handleCommunicate = async (id) => {
        const message = window.prompt("Enter custom message to user:");
        if (!message) return;
        await fetch(`${API_BASE_URL}/admin/tickets/${id}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        fetchAllTickets();
        if (selectedTicket && selectedTicket.id === id) {
            const res = await fetch(`${API_BASE_URL}/ticket/${id}`);
            const updatedTicket = await res.json();
            setSelectedTicket(updatedTicket);
        }
    };

    const handleRegisterUser = async () => {
        const userEmail = window.prompt("Enter new user's email:");
        if (!userEmail) return;

        const autoPassword = Math.random().toString(36).slice(-8);

        try {
            const res = await fetch(`${API_BASE_URL}/admin/register`, {
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
            const res = await fetch(`${API_BASE_URL}/admin/users/${userEmail}`, {
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

    // THE handleForgotPassword FUNCTION WAS REMOVED HERE

    // ------------------- RENDER -------------------
    if (!isLoggedIn) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <h1 className="system-title">Support Ticket System</h1>
                    <p className="system-subtitle">Manage your support requests efficiently.</p>
                    {/* UPDATED: Title changes based on registration state */}
                    <h2 className="login-title">{isRegistering ? "Register New User (Admin Fix)" : loginTitle}</h2>

                    {/* UPDATED: Show Login/Registration messages */}
                    {!isRegistering && loginError && <div className="error-message">{loginError}</div>}
                    {regConfirmation && <div className={`message ${regConfirmation.startsWith('❌') ? 'error-message' : 'success-message'}`}>{regConfirmation}</div>}


                    {/* --- Login Form (Displayed when NOT registering) --- */}
                    {!isRegistering && (
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
                    )}

                    {/* --- Registration Form (Displayed when registering) --- */}
                    {isRegistering && (
                        <form className="login-form" onSubmit={handleRegister}>
                            <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>
                                **USE THIS TO GENERATE A HASHED PASSWORD ONLY**
                            </p>
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="New User Email (e.g., temp@test.com)"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    required
                                />
                                <span className="form-input-icon">✉️</span>
                            </div>
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Password to hash (e.g., admin123)"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    required
                                />
                                <span className="form-input-icon">🔒</span>
                            </div>
                            <button className="login-button" type="submit">
                                Register and Get Hash
                            </button>
                        </form>
                    )}

                    <div className="login-footer">
                        <button
                            className="toggle-button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setLoginError("");
                                setRegConfirmation("");
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#007bff',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {isRegistering ? "← Back to Login" : "Fix Admin Login? Register/Get Hash"}
                        </button>
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
                                {/* UPDATED: Show count of individual tickets */}
                                {adminView === "tickets" ? `Tickets (${displayedTickets.length})` : "User Management"}
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
                                {/* RESTORED: Table now lists individual tickets using displayedTickets */}
                                <div className="admin-table-wrapper">
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
                                                        {/* History button remains, but now works from individual ticket */}
                                                        <button onClick={() => openAdminProductHistoryPopup(t.product)}>View History</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {displayedTickets.length === 0 && (
                                    <p style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                                        No tickets match the current filter/search.
                                    </p>
                                )}
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
                        <p><strong>Product:</strong> {selectedTicket.product || 'N/A'}</p>
                        <p><strong>Created By:</strong> {selectedTicket.createdBy}</p>

                        {/* Show Fix/Action Taken if available */}
                        {selectedTicket.actionTaken && (
                            <p style={{ marginTop: '10px', padding: '10px', background: '#f0f4f8', borderRadius: '4px' }}>
                                <strong>Admin Action/Fix:</strong> {selectedTicket.actionTaken}
                            </p>
                        )}

                        {/* Conditionally render actions for admin only */}
                        {role === "Admin" && (
                            <>
                                <h4>Actions</h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "Collected")}
                                        className="action-button-collected"
                                    >
                                        Mark Collected
                                    </button>

                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "In Progress")}
                                        className="action-button-inprogress"
                                    >
                                        Mark In Progress
                                    </button>

                                    <button
                                        onClick={() => handleUpdateTicket(selectedTicket.id, "Ready for Collection")}
                                        className="action-button-ready"
                                    >
                                        Mark Ready for Collection
                                    </button>

                                    <button
                                        onClick={() => handleCommunicate(selectedTicket.id)}
                                        className="action-button-communicate"
                                    >
                                        Communicate
                                    </button>

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
                            {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
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
                    <div className="popup" style={{ maxWidth: '600px' }}>
                        <div className="popup-header">
                            {/* UPDATED: Show count of history tickets */}
                            <h3>Booking History for **{historyProductName}** ({productHistory.length} times)</h3>
                            <button className="close-button" onClick={() => setProductHistoryPopup(false)}>&times;</button>
                        </div>
                        <ul className="history-list">
                            {productHistory.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                                    Loading history... (If this persists, check your server logs.)
                                </p>
                            ) : (
                                productHistory.map((h, index) => (
                                    <li key={h.id} style={{ borderBottom: index < productHistory.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>

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
