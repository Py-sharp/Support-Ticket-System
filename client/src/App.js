import React, { useState, useEffect } from "react";

function App() {
    const [message, setMessage] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [priority, setPriority] = useState("Low");
    const [tickets, setTickets] = useState([]);
    const [confirmation, setConfirmation] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000/")
            .then((res) => res.text())
            .then((data) => setMessage(data))
            .catch((err) => console.error("Error:", err));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) throw new Error("Invalid credentials");
            const data = await res.json();
            setIsLoggedIn(true);
            setLoginError("");
            setEmail(data.user.email);

            // Load tickets
            fetch(`http://localhost:5000/tickets/${data.user.email}`)
                .then((res) => res.json())
                .then((data) => setTickets(data));
        } catch (err) {
            setLoginError("Invalid email or password");
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        const res = await fetch("http://localhost:5000/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, category, priority, email })
        });

        const data = await res.json();
        if (data.success) {
            setTickets([...tickets, data.ticket]);
            setConfirmation(`Ticket created successfully! Ref #: ${data.ticket.id}`);
            setTitle("");
            setDescription("");
            setCategory("General");
            setPriority("Low");
        }
    };

    // ✅ New logout function
    const handleLogout = () => {
        setIsLoggedIn(false);
        setEmail("");
        setPassword("");
        setTickets([]);
        setConfirmation("");
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1>Support Ticket System</h1>
            <p>{message}</p>

            {!isLoggedIn ? (
                <form onSubmit={handleLogin}>
                    <h2>Login</h2>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <br />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <br />
                    <button type="submit">Login</button>
                    {loginError && <p style={{ color: "red" }}>{loginError}</p>}
                </form>
            ) : (
                <>
                    <h2>Welcome, {email}</h2>
                    {/* ✅ Logout button */}
                    <button onClick={handleLogout} style={{ marginBottom: "20px" }}>
                        Logout
                    </button>

                    {confirmation && (
                        <p style={{ color: "green", fontWeight: "bold" }}>{confirmation}</p>
                    )}

                    <h3>Create Ticket</h3>
                    <form onSubmit={handleCreateTicket}>
                        <input
                            type="text"
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <br />
                        <textarea
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        ></textarea>
                        <br />
                        <label>
                            Category:
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="General">General</option>
                                <option value="Technical">Technical</option>
                                <option value="Billing">Billing</option>
                            </select>
                        </label>
                        <br />
                        <label>
                            Priority:
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </label>
                        <br />
                        <button type="submit">Submit Ticket</button>
                    </form>

                    <h3>My Tickets</h3>
                    <ul>
                        {tickets.map((ticket) => (
                            <li key={ticket.id}>
                                <strong>Ref #{ticket.id}:</strong> {ticket.title} ({ticket.status})
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

export default App;
