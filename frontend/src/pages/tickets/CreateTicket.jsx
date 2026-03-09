import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MainLayout from "../../layout/MainLayout";
import "./CreateTicket.css";

export default function CreateTicket() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    product: "",
    priority: "Low",
    category: "",
    urgency: "",
    department: "",
  });

  // NEW: State for file upload
  const [selectedFile, setSelectedFile] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔒 Protect route
  if (!user) {
    navigate("/");
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      ...formData,
      userId: user.id,
      userRole: user.role,
      userSocietyId: user.society_id,
    };

    try {
      // 1. Create the Ticket
      const res = await fetch("http://localhost:5000/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create ticket");
      }

      const data = await res.json();
      console.log("Ticket created:", data);

      // 2. Upload file if one was selected
      if (selectedFile && data.id) {
        const fileData = new FormData();
        fileData.append("file", selectedFile);
        fileData.append("userId", user.id);

        const attachRes = await fetch(`http://localhost:5000/tickets/${data.id}/attachments`, {
          method: "POST",
          body: fileData,
        });

        if (!attachRes.ok) {
          console.error("Ticket created, but attachment failed to upload.");
          // We don't throw here so they still go to the dashboard since the ticket was created
        }
      }

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <MainLayout
      topbarContent={{
        userName: user.full_name,
        userRole: user.role,
        onLogout: logout,
      }}
    >
      <div className="create-ticket-container">
        <div className="create-ticket-header">
          <h1>Create a New Ticket</h1>
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-ticket-form">
          {error && <p className="error-message">{error}</p>}

          <div className="form-group">
            <label>Title / Subject:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Description / Details:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              required
            />
          </div>

          {/* NEW: File Upload Field */}
          <div className="form-group" style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px dashed #ccc' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Attach a File (Logs, Errors, etc.):</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
          </div>

          <div className="form-group">
            <label>Product / Service:</label>
            <select
              name="product"
              value={formData.product}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select a product</option>
              <option value="Fortinet">Fortinet</option>
              <option value="Cisco">Cisco</option>
            </select>
          </div>

          <div className="form-group">
            <label>Priority:</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="form-input"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label>Category:</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Urgency:</label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">Select urgency</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="form-group">
            <label>Department:</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}