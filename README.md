📌 Support Ticket System

A simple full-stack support ticketing system built with React (frontend) and Node.js + Express (backend).
Users can log in, submit support tickets, view their ticket history per product, and receive email confirmations. Admin also gets notified via email when a ticket is created.

🚀 Features

🔐 User login 
📝 Create support tickets with:

Product name

Title

Description

Category (General, Technical, Billing)

Priority (Low, Medium, High)

📩 Email notifications (sent to both user and admin)

🗂️ View ticket history by product (popup modal)

⏳ Loading spinner on ticket submission

👋 Logout option

🛠️ Tech Stack

Frontend: React (CRA), Fetch API

Backend: Node.js, Express.js, Nodemailer, Firebase

Email Service: Gmail SMTP

Styling: Basic CSS (custom spinner)

⚙️ Installation
1. Clone the repo
git clone https://github.com/Py-sharp/Support-Ticket-System.git
cd support-ticket-system

2. Setup backend
cd server
npm install


Run backend:

node index.js


Server should start at:
👉 http://localhost:3000

3. Setup frontend
cd ../client
npm install


Run frontend:

npm start


App should open at:
👉 http://localhost:3000

🔑 Login Credentials

For now, login is hardcoded (can be extended with DB):

User Email: selekeamogetsoe@gmail.com

Password: password123

📧 Email Configuration

Backend uses Nodemailer with Gmail.

Check server/config.json (or put in package.json for now):

"Email": {
  "Username": "kgomotsosele80@gmail.com",
  "Password": "ensfuzffghnszohk",
  "SmtpServer": "smtp.gmail.com",
  "Port": 587
}


Replace Username & Password with your Gmail and App Password.

Both admin and user get an email when a ticket is created.

🖼️ Screenshots

✅ Login page

✅ Create ticket form

✅ Ticket list with "View History" popup

✅ Spinner on submit

🚧 Future Enhancements

Database integration (MongoDB / SQL) for persistent tickets

User registration & authentication (JWT / OAuth)

Admin dashboard for managing tickets

File attachments
