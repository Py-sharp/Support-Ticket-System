import React, { useState } from "react";
import "./Login.css"; // Import the CSS file

function Login({ setUser }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        fetch("http://localhost:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setUser(data.user);
                } else {
                    setError(data.message);
                }
            })
            .catch(err => console.error(err));
    };

    return (
        <div className="login-container">
            <h2 className="login-title">Login</h2>
            {error && <p className="error-message">{error}</p>}
            <form className="login-form" onSubmit={handleSubmit}>
                <input
                    className="form-input"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                />
                <input
                    className="form-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                <button className="login-button" type="submit">Login</button>
            </form>
        </div>
    );
}

export default Login;