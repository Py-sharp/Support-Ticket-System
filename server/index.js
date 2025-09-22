// server/index.js
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// ---------------------
// CONFIG
// ---------------------
const emailConfig = {
    Username: "kgomotsosele80@gmail.com", // Admin / sender
    Password: "ensfuzffghnszohk",        // Gmail App Password
    SmtpServer: "smtp.gmail.com",
    Port: 587
};

// ---------------------
// In-memory "DB"
// ---------------------
let tickets = []; // { id, title, description, category, priority, product, status, createdBy(email), createdAt, actionTaken, messages }
let users = [
    // hardcoded admin and user for initial testing
    { email: emailConfig.Username, password: "admin123", role: "Admin" },
    { email: "selekeamogetsoe@gmail.com", password: "1234", role: "User" },
    { email: "keamogetsoeforex@gmail.com", password: "1234", role: "User" }
];

// ---------------------
// Nodemailer transporter
// ---------------------
const transporter = nodemailer.createTransport({
    host: emailConfig.SmtpServer,
    port: emailConfig.Port,
    secure: false, // STARTTLS
    auth: {
        user: emailConfig.Username,
        pass: emailConfig.Password
    },
    tls: { rejectUnauthorized: false }
});

// helper to send mail
async function sendMail({ to, subject, text, html }) {
    const mail = {
        from: `"Support System" <${emailConfig.Username}>`,
        to,
        subject,
        text,
        html
    };
    return transporter.sendMail(mail);
}

// ---------------------
// ROUTES
// ---------------------

// simple root
app.get("/", (req, res) => res.send(""));

// ---------------------
// Authentication
// ---------------------

// User login (email + password)
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Missing email/password" });

    const user = users.find(u => u.email === email && u.password === password && u.role === "User");
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    return res.json({ success: true, user: { email: user.email, role: user.role } });
});

// Admin login
app.post("/admin/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Missing email/password" });

    const admin = users.find(u => u.email === email && u.password === password && u.role === "Admin");
    if (!admin) return res.status(401).json({ success: false, message: "Invalid admin credentials" });

    return res.json({ success: true, user: { email: admin.email, role: admin.role } });
});

// ---------------------
// Ticket endpoints
// ---------------------

// Create ticket
app.post("/tickets", async (req, res) => {
    const { title, description, category, priority, email, product } = req.body;
    if (!title || !description || !category || !priority || !email || !product) {
        return res.status(400).json({ success: false, message: "All fields required: title, description, category, priority, email, product" });
    }

    // basic user existence check (since registration exists)
    const user = users.find(u => u.email === email && u.role === "User");
    if (!user) {
        return res.status(400).json({ success: false, message: "User not found. Ask admin to register the user first." });
    }

    const newTicket = {
        id: tickets.length + 1,
        title,
        description,
        category,
        priority,
        product,
        status: "Open",
        createdBy: email,
        createdAt: new Date().toISOString(),
        actionTaken: null,
        messages: [] // New field to store admin communication
    };

    tickets.push(newTicket);

    // Email admin and user
    try {
        // admin
        await sendMail({
            to: emailConfig.Username,
            subject: `New Ticket Created (Ref #${newTicket.id})`,
            text: `A new ticket was created.\n\nRef #: ${newTicket.id}\nProduct: ${product}\nTitle: ${title}\nDescription: ${description}\nPriority: ${priority}\nCategory: ${category}\nCreated By: ${email}`
        });

        // user confirmation
        await sendMail({
            to: email,
            subject: `Ticket Confirmation - Ref #${newTicket.id}`,
            text: `Hello,\n\nYour ticket has been created.\nRef #: ${newTicket.id}\nProduct: ${product}\nTitle: ${title}\nStatus: Open\n\nWe will update you when it is addressed.`
        });

        console.log(`Emails sent: admin->${emailConfig.Username}, user->${email}`);
    } catch (err) {
        console.error("Email error on ticket creation:", err);
    }

    return res.json({ success: true, ticket: newTicket });
});

// Get all tickets for a user
app.get("/tickets/:email", (req, res) => {
    const { email } = req.params;
    const userTickets = tickets.filter(t => t.createdBy === email);
    return res.json(userTickets);
});

// Get ticket details by id
app.get("/ticket/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    return res.json(ticket);
});

// Get all tickets for a user filtered by product name (for history popup)
app.get("/tickets/:email/product/:productName", (req, res) => {
    const { email, productName } = req.params;
    const userTickets = tickets.filter(t => t.createdBy === email && t.product.toLowerCase() === productName.toLowerCase());
    return res.json(userTickets);
});

// Admin: get all tickets
app.get("/admin/tickets", (req, res) => {
    // in real-world you'd authenticate admin; here we trust caller
    return res.json(tickets);
});

// Admin: get all tickets for a specific product
app.get("/admin/tickets/product/:productName", (req, res) => {
    const { productName } = req.params;
    const productTickets = tickets.filter(t => t.product.toLowerCase() === productName.toLowerCase());
    return res.json(productTickets);
});

// Admin: update ticket (actionTaken, status)
app.put("/admin/tickets/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { actionTaken, status } = req.body;

    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    if (actionTaken !== undefined) ticket.actionTaken = actionTaken;
    if (status) ticket.status = status;

    // Notify user about status change / action
    try {
        const userEmail = ticket.createdBy;
        const subject = `Update on Ticket Ref #${ticket.id} — ${ticket.status}`;
        const text = `Hello,\n\nYour ticket (Ref #${ticket.id}) has been updated by admin.\n\nStatus: ${ticket.status}\nAction Taken: ${ticket.actionTaken || "No action written"}\n\nIf you have questions reply to this email.\n\nSupport Team`;

        await sendMail({ to: userEmail, subject, text });
        console.log(`Status update email sent to ${userEmail}`);
    } catch (err) {
        console.error("Email error on update:", err);
    }

    return res.json({ success: true, ticket });
});

// Admin: mark collect (sends collection email to user)
app.post("/admin/tickets/:id/collect", async (req, res) => {
    const id = parseInt(req.params.id);
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    // Optionally update status
    ticket.status = "Ready for Collection";

    try {
        const userEmail = ticket.createdBy;
        const subject = `Item Ready for Collection - Ref #${ticket.id}`;
        const text = `Hello,\n\nYour item related to ticket Ref #${ticket.id} (Product: ${ticket.product}) is ready for collection.\n\nPlease collect it at your earliest convenience.\n\nSupport Team`;

        await sendMail({ to: userEmail, subject, text });
        console.log(`Collect email sent to ${userEmail}`);
    } catch (err) {
        console.error("Email error on collect:", err);
    }

    return res.json({ success: true, ticket });
});

// Admin: send custom message to user about a ticket
app.post("/admin/tickets/:id/message", async (req, res) => {
    const id = parseInt(req.params.id);
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message required" });

    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    const newMessage = {
        text: message,
        timestamp: new Date().toISOString()
    };
    ticket.messages.push(newMessage); // Store the message

    try {
        const userEmail = ticket.createdBy;
        const subject = `Message from Support — Ref #${ticket.id}`;
        const text = `Hello,\n\nAdmin sent the following message regarding your ticket Ref #${ticket.id}:\n\n${message}\n\nSupport Team`;

        await sendMail({ to: userEmail, subject, text });
        console.log(`Custom message email sent to ${userEmail}`);
    } catch (err) {
        console.error("Email error on custom message:", err);
    }

    return res.json({ success: true });
});

// Admin: register user (admin creates users)
app.post("/admin/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const exists = users.find(u => u.email === email);
    if (exists) return res.status(400).json({ success: false, message: "User already exists" });

    const newUser = { email, password, role: "User" };
    users.push(newUser);

    try {
        await sendMail({
            to: email,
            subject: "Your account has been created",
            text: `Hello,\n\nAn account was created for you.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in at the support portal.`
        });
        console.log(`Registration email sent to ${email}`);
    } catch (err) {
        console.error("Email error on registration:", err);
    }

    return res.json({ success: true, user: { email: newUser.email } });
});

// ---------------------
// Start server
// ---------------------
app.listen(port, () => {
    console.log(`✅ Server listening on http://localhost:${port}`);
});
