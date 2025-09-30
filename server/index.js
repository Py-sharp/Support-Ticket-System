// server/index.js
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// ---------------------------
// EMAIL CONFIG
// ---------------------------
const emailConfig = {
    Username: "kgomotsosele80@gmail.com", // Admin sender
    Password: "ensfuzffghnszohk",        // Gmail App Password
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
        // actionTaken field is added here for consistency, though it's typically set on update
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

// ADMIN: GET SINGLE TICKET (Needed for Admin communication update logic in App.js)
app.get("/ticket/:id", async (req, res) => {
    const doc = await ticketsRef.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Ticket not found" });
    res.json(doc.data());
});

// ADMIN: GET TICKETS BY PRODUCT (For history feature: What was the problem/date/fix)
app.get("/admin/tickets/product/:productName", async (req, res) => {
    const { productName } = req.params;
    // Query for all tickets for the specified product, ordered by creation date (newest first)
    const snapshot = await ticketsRef
        .where("product", "==", productName)
        .orderBy("createdAt", "desc")
        .get();

    // The data() contains: title, description (the problem), status, createdBy, createdAt (date booked), and actionTaken (the fix)
    res.json(snapshot.docs.map((d) => d.data()));
});

// ADMIN: UPDATE TICKET STATUS
app.put("/admin/tickets/:id", async (req, res) => {
    const { id } = req.params;
    // 'actionTaken' is what you did to fix the problem.
    const { status, actionTaken } = req.body;
    const doc = ticketsRef.doc(id);

    // Ensure actionTaken is saved on update
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
    console.log(`✅ Server running with Firestore at http://localhost:${port}`)
);
