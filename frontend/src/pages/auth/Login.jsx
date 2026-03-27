import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Send login request to backend
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Login failed");
      }

      const userData = await res.json();

      // Store full user object in AuthContext
      login(userData);

      console.log("Logged in user:", userData);

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    }
  };

  const handleButtonClick = (e) => {
    e.target.style.transform = "scale(0.95)";
    setTimeout(() => (e.target.style.transform = "scale(1)"), 150);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.brandingSectionSmall}>
          <h1 style={styles.brandingTitle}>TUSNA & DATA</h1>
          <p style={styles.brandingTagline}>Smart IT Solutions & Support</p>
        </div>

        <div style={styles.formSectionSmall}>
          <h2 style={styles.formTitle}>Login</h2>

          {error && <div style={{ color: "red" }}>{error}</div>}

          <form style={styles.form} onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              style={styles.button}
              onClick={handleButtonClick}
              onMouseEnter={(e) => (e.target.style.background = "#174263")}
              onMouseLeave={(e) => (e.target.style.background = "#1a3a52")}
            >
              Login
            </button>
          </form>

          <p style={styles.loginLink}>
            Don't have an account?{" "}
            <Link to="/register" style={styles.link}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}





const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f8f9fa",
  },
  container: {
    display: "flex",
    width: "800px",
    height: "500px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(26, 58, 82, 0.1)",
    overflow: "hidden",
  },
  brandingSectionSmall: {
    flex: 1,
    background: "#1a3a52",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    padding: "20px",
  },
  brandingTitle: {
    fontSize: "32px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    letterSpacing: "1.5px",
    color: "white",
  },
  brandingTagline: {
    fontSize: "14px",
    fontWeight: "300",
    margin: 0,
    color: "#b0d4f1",
    letterSpacing: "0.5px",
    textAlign: "center",
  },
  formSectionSmall: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    background: "#f8f9fa",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "300px",
  },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    fontFamily: "inherit",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    boxSizing: "border-box",
    color: "#333",
    outline: "none",
  },
  button: {
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    background: "#1a3a52",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.3s ease, transform 0.1s ease",
    marginTop: "8px",
  },
  loginLink: {
    textAlign: "center",
    margin: "16px 0 0 0",
    fontSize: "14px",
    color: "#666",
  },
  link: {
    color: "#1a3a52",
    textDecoration: "none",
    fontWeight: "600",
    transition: "color 0.3s ease",
    cursor: "pointer",
  },
};

export default Login;
