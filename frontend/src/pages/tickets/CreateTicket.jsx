import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";
import MainLayout from "../../layout/MainLayout";
import "./CreateTicket.css";

export default function CreateTicket() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    product: "",
    priority: "MEDIUM",
    category: "",
    department: "",
    productId: null,
  });

  // NEW: State for file upload
  const [selectedFile, setSelectedFile] = useState(null);

  // NEW: State for products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await fetch(`${API_URL}/products`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.data || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

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
      productId: formData.productId ? parseInt(formData.productId) : null,
    };

    try {
      // 1. Create the Ticket
      const res = await fetch(`${API_URL}/tickets`, {
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

        const attachRes = await fetch(`${API_URL}/tickets/${data.id}/attachments`, {
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

          {/* NEW: Product Selection from Catalog */}
          <div className="form-group">
            <label>Product / Service (from catalog):</label>
            <select
              name="productId"
              value={formData.productId || ""}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                  const selected = products.find(p => p.id === parseInt(selectedId));
                  setFormData({
                    ...formData,
                    productId: selectedId,
                    product: selected ? selected.name : "",
                  });
                } else {
                  setFormData({
                    ...formData,
                    productId: null,
                    product: "",
                  });
                }
              }}
              className="form-input"
              disabled={productsLoading}
            >
              <option value="">
                {productsLoading ? "Loading products..." : "Select a product"}
              </option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({prod.vendor})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Product Name (custom):</label>
            <input
              type="text"
              name="product"
              value={formData.product}
              onChange={handleChange}
              className="form-input"
              placeholder="Or enter custom product name"
              required
            />
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