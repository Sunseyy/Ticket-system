import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

import tndLogo from "../../assets/TnD logo.png";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for registration success param
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setShowSuccess(true);
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
    e.target.style.transform = "translateY(-2px)";
    setTimeout(() => (e.target.style.transform = "translateY(0)"), 100);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.brandingSectionSmall}>
          <img src={tndLogo} alt="TnD Logo" style={styles.brandingLogo} />
          <p style={styles.brandingTagline}>Smart IT Solutions & Support</p>
        </div>

        <div style={styles.formSectionSmall}>
          <h2 style={styles.formTitle}>Login</h2>

          {showSuccess && (
            <div style={styles.successBanner}>
              ✓ Registration successful! Please log in with your credentials.
            </div>
          )}

          {error && <div style={styles.errorBanner}>{error}</div>}

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
              onMouseEnter={(e) => {
                e.target.style.background = "#008CD9";
                e.target.style.boxShadow = "0 8px 16px rgba(0, 163, 255, 0.3)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#00A3FF";
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
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
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  brandingSectionSmall: {
    flex: 1,
    background: "#00A3FF",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    padding: "20px",
  },
  brandingLogo: {
    maxWidth: "80%",
    maxHeight: "150px",
    objectFit: "contain",
    marginBottom: "16px",
    filter: "drop-shadow(0px 4px 6px rgba(255,255,255,0.4)) brightness(1.2)",
  },
  brandingTagline: {
    fontSize: "15px",
    fontWeight: "400",
    margin: 0,
    color: "#ffffff",
    letterSpacing: "0.5px",
    textAlign: "center",
    textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
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
    background: "#00A3FF",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "8px",
  },
  loginLink: {
    textAlign: "center",
    margin: "16px 0 0 0",
    fontSize: "14px",
    color: "#666",
  },
  link: {
    color: "#00A3FF",
    textDecoration: "none",
    fontWeight: "600",
    transition: "color 0.3s ease",
    cursor: "pointer",
  },
  successBanner: {
    padding: "10px 14px",
    backgroundColor: "#dcfce7",
    border: "1px solid #86efac",
    borderRadius: "8px",
    color: "#166534",
    fontSize: "13px",
    marginBottom: "12px",
    width: "100%",
    boxSizing: "border-box",
  },
  errorBanner: {
    padding: "10px 14px",
    backgroundColor: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#b91c1c",
    fontSize: "13px",
    marginBottom: "12px",
    width: "100%",
    boxSizing: "border-box",
  },
};

export default Login;
