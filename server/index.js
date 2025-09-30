// server/index.js

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Reads service account key from Render environment variable (FIREBASE_SERVICE_ACCOUNT)
// NOTE: I'm using the JSON.parse approach based on our previous conversation for Render deployment.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); 

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const usersRef = db.collection("users");
const ticketsRef = db.collection("tickets");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// ---------------------------
// EMAIL CONFIG
// ---------------------------
// Reads email config from Render environment variables (USERNAME and PASSWORD)
const emailConfig = {
    Username: process.env.USERNAME,
    Password: process.env.PASSWORD,
    SmtpServer: "smtp.gmail.com",
    Port: 587,
};

const transporter = nodemailer.createTransport({
    host: emailConfig.SmtpServer,
    port: emailConfig.Port,
    secure: false,
    auth: { user: emailConfig.Username, pass: emailConfig.Password },
    tls: { rejectUnauthorized: false },
});

async function sendMail({ to, subject, text }) {
    if (!emailConfig.Username || !emailConfig.Password) {
        console.warn("Email credentials not set. Skipping email.");
        return;
    }
    return transporter.sendMail({
        from: `\"Support Ticket System\" <${emailConfig.Username}>`,
        to,
        subject,
        text,
    });
}

// ---------------------------
// PUBLIC ENDPOINTS
// ---------------------------

// Health Check
app.get("/", (req, res) => {
    res.send("Support Ticket System Backend is Running!");
});

// USER LOGIN
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await usersRef.doc(email).get();
    
    // Simple password comparison against Firestore document field
    if (!userDoc.exists || userDoc.data().password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ success: true, user: userDoc.data() });
});

// REMOVED FORGOT-PASSWORD ENDPOINT HERE

// CREATE TICKET
app.post("/tickets", async (req, res) => {
    const { title, description, category, priority, email: createdBy, product } = req.body;
    const newId = (Math.floor(Math.random() * 90000000) + 10000000).toString(); // 8 digit ID

    const newTicket = {
        id: newId,
        title,
        description,
        category,
        priority,
        product,
        status: "Open",
        createdBy,
        createdAt: new Date().toISOString(),
        messages: [],
        actionTaken: null,
    };

    await ticketsRef.doc(newId).set(newTicket);

    // Notify user of ticket creation
    await sendMail({
        to: createdBy,
        subject: `Ticket Created (Ref #${newId})`,
        text: `Your support ticket has been successfully created. Ref #: ${newId}. We will review it shortly.`,
    });

    res.json({ success: true, ticket: newTicket });
});

// GET USER'S TICKETS
app.get("/tickets/:email", async (req, res) => {
    const { email } = req.params;
    const snapshot = await ticketsRef.where("createdBy", "==", email).get();
    res.json(snapshot.docs.map((d) => d.data()));
});

// GET SINGLE TICKET
app.get("/ticket/:id", async (req, res) => {
    const { id } = req.params;
    const doc = await ticketsRef.doc(id).get();
    if (!doc.exists) {
        return res.status(404).json({ error: "Ticket not found" });
    }
    res.json(doc.data());
});

// UPDATE USER PASSWORD 
app.put("/user/update-password", async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    const userDoc = await usersRef.doc(email).get();

    if (!userDoc.exists || userDoc.data().password !== currentPassword) {
        return res.status(401).json({ success: false, message: "Invalid current password." });
    }

    try {
        // Updates the plain-text password in Firestore
        await usersRef.doc(email).update({ password: newPassword });
        res.json({ success: true, message: "Password updated successfully." });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to update password." });
    }
});


// ---------------------------
// ADMIN ENDPOINTS
// ---------------------------

// ADMIN LOGIN
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await usersRef.doc(email).get();

    if (!userDoc.exists || userDoc.data().role !== "Admin") {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // THIS IS THE CRITICAL LINE: Must match the PLAIN TEXT password in Firestore
    if (userDoc.data().password !== password) {
        // This log helps debug by showing what password was attempted
        console.log(`Failed admin login attempt for ${email}. Stored (Firestore): ${userDoc.data().password}, Attempted: ${password}`);
        return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ success: true, user: userDoc.data() });
});

// ADMIN: REGISTER NEW USER
app.post("/admin/register", async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await usersRef.doc(email).get();

    if (userDoc.exists) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Saves plain text password to Firestore
    const newUser = { email, password, role: "User" }; 
    await usersRef.doc(email).set(newUser);

    // Notify user of registration
    await sendMail({
        to: email,
        subject: "Welcome to the Support Portal",
        text: `Your account has been created. Your temporary password is: ${password}. Please login and change it.`,
    });

    res.json({ success: true, user: newUser });
});

// ADMIN: DEREGISTER USER
app.delete("/admin/users/:email", async (req, res) => {
    const { email } = req.params;
    const userDoc = await usersRef.doc(email).get();

    if (!userDoc.exists || userDoc.data().role === "Admin") {
        return res.status(400).json({ success: false, message: "User not found or cannot deregister admin" });
    }

    await usersRef.doc(email).delete();

    // Optionally delete all their tickets (or update the status)
    const ticketsSnapshot = await ticketsRef.where("createdBy", "==", email).get();
    const batch = db.batch();
    ticketsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ success: true, message: "User and associated tickets deleted." });
});

// ADMIN: GET ALL USERS
app.get("/admin/users", async (req, res) => {
    const snapshot = await usersRef.get();
    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: GET ALL TICKETS
app.get("/admin/tickets", async (req, res) => {
    const snapshot = await ticketsRef.get();
    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: GET PRODUCT HISTORY
app.get("/admin/tickets/product/:productName", async (req, res) => {
    const { productName } = req.params;
    const snapshot = await ticketsRef.where("product", "==", productName).get();
    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: UPDATE TICKET STATUS
app.put("/admin/tickets/:id", async (req, res) => {
    const { id } = req.params;
    const { status, actionTaken } = req.body;
    const doc = ticketsRef.doc(id);
    await doc.update({ status, actionTaken: actionTaken || null });

    const updated = (await doc.get()).data();
    await sendMail({
        to: updated.createdBy,
        subject: `Ticket Updated (Ref #${id})`,
        text: `Your ticket has been updated.\nNew Status: ${status}\nAction Taken: ${actionTaken || "None"}`,
    });

    res.json({ success: true, ticket: updated });
});

// ADMIN: ADD MESSAGE
app.post("/admin/tickets/:id/message", async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const doc = ticketsRef.doc(id);
    const ticket = (await doc.get()).data();

    const newMsg = { text: message, timestamp: new Date().toISOString() };
    await doc.update({
        messages: admin.firestore.FieldValue.arrayUnion(newMsg),
    });

    // Notify user of new message
    await sendMail({
        to: ticket.createdBy,
        subject: `New Message on Ticket (Ref #${id})`,
        text: `A new message has been added to your ticket:\n\n${message}`,
    });

    res.json({ success: true, message: newMsg });
});


app.listen(process.env.PORT || port, () => {
    console.log(`Server listening on port ${process.env.PORT || port}`);
});
