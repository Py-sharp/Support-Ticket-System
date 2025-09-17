import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function TicketDetails() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:5000/ticket/${id}`)
            .then(res => res.json())
            .then(data => setTicket(data))
            .catch(err => console.error(err));
    }, [id]);

    if (!ticket) return <p>Loading ticket...</p>;

    return (
        <div style={{ padding: "20px" }}>
            <h2>Ticket Details</h2>
            <p><strong>ID:</strong> {ticket.id}</p>
            <p><strong>Title:</strong> {ticket.title}</p>
            <p><strong>Description:</strong> {ticket.description}</p>
            <p><strong>Category:</strong> {ticket.category}</p>
            <p><strong>Priority:</strong> {ticket.priority}</p>
            <p><strong>Status:</strong> {ticket.status}</p>
            <p><strong>Created At:</strong> {new Date(ticket.createdAt).toLocaleString()}</p>
            <p><strong>Created By:</strong> {ticket.createdBy}</p>

            <Link to="/">⬅ Back to Dashboard</Link>
        </div>
    );
}

export default TicketDetails;
