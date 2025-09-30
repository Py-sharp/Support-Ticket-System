// server/index.js
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// ----------------------------------------------------
// FIREBASE INITIALIZATION: Use SERVICE_ACCOUNT_KEY ENV VAR
// ----------------------------------------------------
const serviceAccountJson = process.env.SERVICE_ACCOUNT_KEY;

if (serviceAccountJson) {
    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase initialized using SERVICE_ACCOUNT_KEY environment variable.");
    } catch (e) {
        console.error("❌ FATAL: Failed to parse SERVICE_ACCOUNT_KEY JSON:", e);
    }
} else {
    // This warning/error will show if SERVICE_ACCOUNT_KEY isn't set on Render
    console.error("❌ FATAL: SERVICE_ACCOUNT_KEY environment variable is missing! Server cannot run without Firebase.");
}

const db = admin.firestore();
const app = express();
// Use dynamic port provided by hosting environment (Render), fall back to 5000 for local dev
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------
// EMAIL CONFIG: Use EMAIL_USERNAME and EMAIL_PASSWORD ENV VARS
// ---------------------------
const emailConfig = {
    Username: process.env.EMAIL_USERNAME, // Admin sender
    Password: process.env.EMAIL_PASSWORD, // Gmail App Password
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
        console.error("Email credentials missing. Skipping email sending.");
        return;
    }
    return transporter.sendMail({
        from: `"Support Ticket System" <${emailConfig.Username}>`,
        to,
        subject,
        text,
    });
}

// ---------------------------
// FIRESTORE REFERENCES
// ---------------------------
const usersRef = db.collection("users");
const ticketsRef = db.collection("tickets");

// Helper functions
async function getUser(email) {
    const doc = await usersRef.doc(email).get();
    return doc.exists ? doc.data() : null;
}
async function saveUser(user) {
    await usersRef.doc(user.email).set(user, { merge: true });
    return user;
}

// ---------------------------
// ROUTES
// ---------------------------
app.get("/", (req, res) => res.send("✅ Firebase Support System Backend Running"));

// LOGIN (User)
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await getUser(email);
    if (!user || user.password !== password || user.role !== "User")
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    res.json({ success: true, user: { email: user.email, role: user.role } });
});

// LOGIN (Admin)
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await getUser(email);
    if (!user || user.password !== password || user.role !== "Admin")
        return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    res.json({ success: true, user: { email: user.email, role: user.role } });
});

// REGISTER NEW USER (Admin only)
app.post("/admin/register", async (req, res) => {
    const { email, password } = req.body;
    const existing = await getUser(email);
    if (existing)
        return res.status(400).json({ success: false, message: "User already exists" });

    const newUser = { email, password, role: "User" };
    await saveUser(newUser);

    await sendMail({
        to: email,
        subject: "Account Created",
        text: `Hello,\nYour support portal account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in at the portal.`,
    });

    res.json({ success: true, user: newUser });
});

// GET ALL USERS (Admin)
app.get("/admin/users", async (req, res) => {
    const snapshot = await usersRef.get();
    const users = snapshot.docs.map((d) => d.data());
    res.json(users.filter((u) => u.role !== "Admin"));
});

// DELETE USER (Admin)
app.delete("/admin/users/:email", async (req, res) => {
    const { email } = req.params;
    await usersRef.doc(email).delete();

    const userTickets = await ticketsRef.where("createdBy", "==", email).get();
    const batch = db.batch();
    userTickets.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true, message: "User and their tickets deleted" });
});

// UPDATE PASSWORD
app.put("/user/update-password", async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    const user = await getUser(email);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.password !== currentPassword)
        return res.status(401).json({ success: false, message: "Incorrect password" });

    await usersRef.doc(email).update({ password: newPassword });
    res.json({ success: true, message: "Password updated successfully" });
});

// CREATE TICKET
app.post("/tickets", async (req, res) => {
    const { title, description, category, priority, email, product } = req.body;
    const user = await getUser(email);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const newTicket = {
        title,
        description,
        category,
        priority,
        product,
        status: "Open",
        createdBy: email,
        createdAt: new Date().toISOString(),
        messages: [],
        actionTaken: "",
    };

    const ref = await ticketsRef.add(newTicket);
    newTicket.id = ref.id;
    await ref.update({ id: ref.id });

    await sendMail({
        to: email,
        subject: `Ticket Created (Ref #${ref.id})`,
        text: `Hello,\nYour ticket '${title}' has been created.\nReference #: ${ref.id}\nStatus: Open`,
    });

    res.json({ success: true, ticket: newTicket });
});

// GET USER TICKETS
app.get("/tickets/:email", async (req, res) => {
    const snapshot = await ticketsRef.where("createdBy", "==", req.params.email).get();
    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: GET ALL TICKETS
app.get("/admin/tickets", async (req, res) => {
    const snapshot = await ticketsRef.get();
    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: GET SINGLE TICKET
app.get("/ticket/:id", async (req, res) => {
    const doc = await ticketsRef.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Ticket not found" });
    res.json(doc.data());
});

// ADMIN: GET TICKETS BY PRODUCT (Requires a composite index in Firebase!)
app.get("/admin/tickets/product/:productName", async (req, res) => {
    const { productName } = req.params;
    
    // NOTE: This query requires a composite index on (product ASC, createdAt DESC) in Firestore!
    const snapshot = await ticketsRef
        .where("product", "==", decodeURIComponent(productName))
        .orderBy("createdAt", "desc")
        .get();

    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: UPDATE TICKET STATUS
app.put("/admin/tickets/:id", async (req, res) => {
    const { id } = req.params;
    const { status, actionTaken } = req.body;
    const doc = ticketsRef.doc(id);

    await doc.update({ status, actionTaken });

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

    await sendMail({
        to: ticket.createdBy,
        subject: `New Message on Your Ticket (Ref #${id})`,
        text: message,
    });

    res.json({ success: true });
});

app.listen(port, () =>
    console.log(`✅ Server running with Firestore on port ${port}`)
);
