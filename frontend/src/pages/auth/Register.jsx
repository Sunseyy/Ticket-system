import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_URL } from "../../config/api";

function Register() {
  const [role, setRole] = useState("");
  const [societies, setSocieties] = useState([]);
  const [selectedSociety, setSelectedSociety] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      full_name: fullName,
      email,
      password,
      role,
      societyId: role === "CLIENT" ? selectedSociety : null,
    };

    console.log("Sending payload:", payload);

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Registered:", data);
    } catch (err) {
      console.error("Register error:", err);
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

            <button style={styles.button} type="submit">
              Register
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
};

export default Register;
