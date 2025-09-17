const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// In-memory tickets
let tickets = [];

// 🔹 Email config
const emailConfig = {
    Username: "kgomotsosele80@gmail.com", // admin sender
    Password: "ensfuzffghnszohk", // Gmail App Password
    SmtpServer: "smtp.gmail.com",
    Port: 587
};

// 🔹 Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: emailConfig.SmtpServer,
    port: emailConfig.Port,
    secure: false,
    auth: {
        user: emailConfig.Username,
        pass: emailConfig.Password
    },
    tls: { rejectUnauthorized: false }
});

// ✅ Login route (email = username)
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Hardcoded single user
    if (email === "selekeamogetsoe@gmail.com" && password === "1234") {
        res.json({ success: true, user: { email, role: "User" } });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

// ✅ Create new ticket
app.post("/tickets", async (req, res) => {
    const { title, description, category, priority, email } = req.body;

    if (!title || !description || !category || !priority || !email) {
        return res.status(400).json({ success: false, message: "All fields required" });
    }

    const newTicket = {
        id: tickets.length + 1,
        title,
        description,
        category,
        priority,
        status: "Open",
        createdBy: email,
        createdAt: new Date().toISOString()
    };

    tickets.push(newTicket);

    try {
        // 📧 Send to admin
        await transporter.sendMail({
            from: `"Support System" <${emailConfig.Username}>`,
            to: emailConfig.Username,
            subject: `New Ticket Created (Ref #${newTicket.id})`,
            text: `A new ticket has been created.\n\nRef #: ${newTicket.id}\nTitle: ${title}\nDescription: ${description}\nCategory: ${category}\nPriority: ${priority}\nCreated By: ${email}\nStatus: Open`
        });
        console.log(`📧 Ticket email sent to Admin (${emailConfig.Username})`);

        // 📧 Send confirmation to user
        await transporter.sendMail({
            from: `"Support System" <${emailConfig.Username}>`,
            to: email,
            subject: `Ticket Confirmation - Ref #${newTicket.id}`,
            text: `Hello,\n\nYour ticket has been created successfully.\n\nRef #: ${newTicket.id}\nTitle: ${title}\nStatus: Open\n\nWe will get back to you soon.\n\nSupport Team`
        });
        console.log(`📧 Confirmation email sent to User (${email})`);
    } catch (err) {
        console.error("❌ Email error:", err);
    }

    res.json({ success: true, ticket: newTicket });
});

// ✅ Get all tickets for user
app.get("/tickets/:email", (req, res) => {
    const { email } = req.params;
    const userTickets = tickets.filter(ticket => ticket.createdBy === email);
    res.json(userTickets);
});

// ✅ Get ticket details
app.get("/ticket/:id", (req, res) => {
    const ticketId = parseInt(req.params.id);
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) {
        return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    res.json(ticket);
});

app.listen(port, () => {
    console.log(`✅ Server listening on http://localhost:${port}`);
});
