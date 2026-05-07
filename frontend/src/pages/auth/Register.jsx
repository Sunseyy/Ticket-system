import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_URL } from "../../config/api";

function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [societies, setSocieties] = useState([]);
  const [selectedSociety, setSelectedSociety] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify and try again.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const payload = {
      full_name: fullName,
      email,
      password,
      role,
      societyId: role === "CLIENT" ? selectedSociety : null,
    };

    console.log("Sending payload:", payload);

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Registered:", data);

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      // Redirect to login with success message
      navigate("/login?registered=true");
    } catch (err) {
      console.error("Register error:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch societies ONLY when role = CLIENT
useEffect(() => {
  if (role === "CLIENT") {
    fetch(`${API_URL}/societies?type=${role}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Societies:", data);
        setSocieties(data);
      })
      .catch((err) => console.error("Fetch error:", err));
  } else {
    setSocieties([]);
    setSelectedSociety("");
  }
}, [role]);


  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.brandingSectionSmall}>
          <h1 style={styles.brandingTitle}>TUSNA & DATA</h1>
          <p style={styles.brandingTagline}>Smart IT Solutions & Support</p>
        </div>

        <div style={styles.formSectionSmall}>
          <h2 style={styles.formTitle}>Create Account</h2>

          {error && <div style={styles.errorBanner}>{error}</div>}

          <form style={styles.form} onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              style={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

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

            <input
              type="password"
              placeholder="Confirm Password"
              style={{
                ...styles.input,
                borderColor: confirmPassword && password !== confirmPassword ? "#dc2626" : styles.input.borderColor
              }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {confirmPassword && password !== confirmPassword && (
              <p style={styles.validationError}>❌ Passwords do not match</p>
            )}

            {/* Role selection */}
            <select
              style={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">Select Role</option>
              <option value="CLIENT">Client</option>
              <option value="AGENT">Agent</option>
            </select>

            {/* Society dropdown ONLY for CLIENT */}
            {role === "CLIENT" && (
              <select
                style={styles.input}
                value={selectedSociety}
                onChange={(e) => setSelectedSociety(e.target.value)}
                required
              >
                <option value="">Select Your Society</option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <button
              style={styles.button}
              type="submit"
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#174263";
                  e.target.style.boxShadow = "0 8px 16px rgba(37, 99, 235, 0.2)";
                  e.target.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#1a3a52";
                e.target.style.boxShadow = "none";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <p style={styles.loginLink}>
            Already have an account?{" "}
            <Link to="/" style={styles.link}>
              Login
            </Link>
          </p>

          <p>ROLE STATE: {role}</p>
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
    boxSizing: "border-box",
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
    marginTop: "8px",
    transition: "all 0.2s ease",
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
  validationError: {
    color: "#dc2626",
    fontSize: "12px",
    margin: "-8px 0 4px 0",
  },
};

export default Register;
