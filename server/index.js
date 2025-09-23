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

    return res.json({ success: true, user: newUser });
});

// Admin: Get all users (excluding admin)
app.get("/admin/users", (req, res) => {
    // Return all users except the admin
    const nonAdminUsers = users.filter(user => user.role !== "Admin");
    return res.json(nonAdminUsers);
});

// Admin: Deregister user
app.delete("/admin/users/:email", (req, res) => {
    const { email } = req.params;
    
    // Prevent admin from deregistering themselves
    if (email === emailConfig.Username) {
        return res.status(400).json({ success: false, message: "Cannot deregister admin user" });
    }

    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Remove user's tickets
    tickets = tickets.filter(ticket => ticket.createdBy !== email);
    
    // Remove user
    users.splice(userIndex, 1);

    console.log(`User ${email} deregistered successfully`);
    return res.json({ success: true, message: "User deregistered successfully" });
});

// User password update
app.put("/user/update-password", (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    
    // 1. Basic validation
    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 2. Find the user
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // 3. Verify the current password
    if (user.password !== currentPassword) {
        return res.status(401).json({ success: false, message: "Incorrect current password" });
    }

    // 4. Update the password
    user.password = newPassword;
    console.log(`Password for user ${email} updated successfully.`);
    
    // 5. Respond to the client
    return res.json({ success: true, message: "Password updated successfully" });
});

// User forgot password
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);

    if (!user) {
        // Send a generic message to prevent user enumeration
        return res.json({ success: true, message: "If an account with that email exists, a password reset email has been sent." });
    }

    // Generate a new temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8);
    user.password = temporaryPassword; // Update the in-memory password

    try {
        await sendMail({
            to: email,
            subject: "Your Temporary Password",
            text: `Hello,\n\nYour temporary password is: ${temporaryPassword}\n\nPlease use this to log in and change your password immediately.`
        });
        return res.json({ success: true, message: "A temporary password has been sent to your email." });
    } catch (err) {
        console.error("Email error on password reset:", err);
        return res.status(500).json({ success: false, message: "Failed to send reset email. Please try again." });
    }
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

    // Email admin and user...
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
    const { id } = req.params;
    const ticket = tickets.find(t => t.id === parseInt(id));
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    return res.json(ticket);
});

// Admin: Get all tickets
app.get("/admin/tickets", (req, res) => {
    return res.json(tickets);
});

// Admin: Get tickets by product name
app.get("/admin/tickets/product/:productName", (req, res) => {
    const { productName } = req.params;
    const productTickets = tickets.filter(t => t.product.toLowerCase().includes(productName.toLowerCase()));
    return res.json(productTickets);
});

// Admin: Update ticket status and action taken
app.put("/admin/tickets/:id", async (req, res) => {
    const { id } = req.params;
    const { status, actionTaken } = req.body;
    const ticket = tickets.find(t => t.id === parseInt(id));
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    ticket.status = status;
    ticket.actionTaken = actionTaken;
    console.log(`Ticket ${id} updated: Status=${status}, Action Taken=${actionTaken}`);

    try {
        await sendMail({
            to: ticket.createdBy,
            subject: `Ticket Update - Ref #${ticket.id}`,
            text: `Hello,\n\nYour ticket with reference number #${ticket.id} has been updated.\nNew Status: ${status}\nAction Taken: ${actionTaken}`
        });
        console.log(`Update email sent to user ${ticket.createdBy}`);
    } catch (err) {
        console.error("Email error on ticket update:", err);
    }

    return res.json({ success: true, ticket });
});

// Admin: Mark for collection and send email
app.post("/admin/tickets/:id/collect", async (req, res) => {
    const { id } = req.params;
    const ticket = tickets.find(t => t.id === parseInt(id));
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    
    ticket.status = "Ready for Collection";
    console.log(`Ticket ${id} marked for collection.`);

    try {
        await sendMail({
            to: ticket.createdBy,
            subject: `Ticket Ready for Collection - Ref #${ticket.id}`,
            text: `Hello,\n\nYour ticket with reference number #${ticket.id} is now Ready for Collection.`
        });
        console.log(`Collection email sent to user ${ticket.createdBy}`);
    } catch (err) {
        console.error("Email error on collection:", err);
    }

    return res.json({ success: true, ticket });
});

// Admin: Add a custom message
app.post("/admin/tickets/:id/message", async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const ticket = tickets.find(t => t.id === parseInt(id));
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    const newMessage = { text: message, timestamp: new Date().toISOString() };
    ticket.messages.push(newMessage);
    console.log(`Custom message added to ticket ${id}.`);
    
    try {
        const userEmail = ticket.createdBy;
        const subject = `New Message on your Ticket (Ref #${ticket.id})`;
        const text = `Hello,\n\nYou have a new message on your ticket Ref #${ticket.id}:\n\n${message}\n\nSupport Team`;
        await sendMail({ to: userEmail, subject, text });
        console.log(`Custom message email sent to ${userEmail}`);
    } catch (err) {
        console.error("Email error on custom message:", err);
    }

    return res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});