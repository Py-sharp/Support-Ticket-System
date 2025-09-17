import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Dashboard({ user }) {
    const [tickets, setTickets] = useState([]);
    const [newTicket, setNewTicket] = useState({
        title: "",
        description: "",
        category: "General",
        priority: "Low"
    });

    useEffect(() => {
        fetch(`http://localhost:5000/tickets/${user.username}`)
            .then(res => res.json())
            .then(data => setTickets(data))
            .catch(err => console.error(err));
    }, [user.username]);

    const handleChange = (e) => {
        setNewTicket({ ...newTicket, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        fetch("http://localhost:5000/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...newTicket, username: user.username })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setTickets([...tickets, data.ticket]);
                    setNewTicket({ title: "", description: "", category: "General", priority: "Low" });
                } else {
                    alert(data.message);
                }
            })
            .catch(err => console.error(err));
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Welcome, {user.username} 👋</h2>

            <h3>Create New Ticket</h3>
            <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    value={newTicket.title}
                    onChange={handleChange}
                    required
                /><br />
                <textarea
                    name="description"
                    placeholder="Description"
                    value={newTicket.description}
                    onChange={handleChange}
                    required
                /><br />
                <select name="category" value={newTicket.category} onChange={handleChange}>
                    <option>General</option>
                    <option>Technical</option>
                    <option>Billing</option>
                </select><br />
                <select name="priority" value={newTicket.priority} onChange={handleChange}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                </select><br />
                <button type="submit">Submit Ticket</button>
            </form>

            <h3>My Tickets</h3>
            <ul>
                {tickets.map(ticket => (
                    <li key={ticket.id}>
                        <Link to={`/ticket/${ticket.id}`}>
                            <strong>{ticket.title}</strong>
                        </Link>{" "}
                        ({ticket.status}) - {ticket.priority}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Dashboard;
