import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../config/api";
import "./ManageProducts.css";

function ManageProducts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vendor: "",
    category: "",
    specification: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const adminId = user?.id;

  // Fetch all products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const payload = await response.json();
      setProducts(payload.data || payload || []);
    } catch (err) {
      console.error("Fetch products error:", err);
      setError(err.message || "Unable to fetch products.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products based on search and vendor filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = vendorFilter === "all" || product.vendor === vendorFilter;

    return matchesSearch && matchesVendor;
  });

  // Get unique vendors for filter dropdown
  const vendors = ["all", ...new Set(products.map((p) => p.vendor))];

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.vendor.trim() || !formData.category.trim()) {
      setFormError("Name, vendor, and category are required.");
      return;
    }

    setFormLoading(true);

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to create product");
      }

      setInfo("Product added successfully!");
      setFormData({
        name: "",
        description: "",
        vendor: "",
        category: "",
        specification: "",
      });
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      console.error("Create product error:", err);
      setFormError(err.message || "Unable to create product.");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (product) => {
    if (!product || !product.id) return;

    const confirmed = window.confirm(
      `Delete product "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setInfo("");
    setDeletingId(product.id);

    try {
      const response = await fetch(`${API_URL}/products/${product.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete product");
      }

      setInfo(`Product "${product.name}" deleted successfully.`);
      fetchProducts();
    } catch (err) {
      console.error("Delete product error:", err);
      setError(err.message || "Unable to delete product.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    setInfo("");
    setShowForm(false);
    setFormData({
      name: "",
      description: "",
      vendor: "",
      category: "",
      specification: "",
    });
    fetchProducts();
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if ((user?.role || "").toUpperCase() !== "ADMIN") {
    return (
      <div className="manage-products-page">
        <div className="products-loading">Access restricted. Administrator role required.</div>
      </div>
    );
  }

  return (
    <div className="manage-products-page">
      <div className="products-heading">
        <div>
          <h2>Product Management</h2>
          <p className="products-subtitle">
            Manage your product catalog for ticket creation and tracking.
          </p>
        </div>
        <div className="products-actions">
          <button className="ghost-button" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
          <button className="primary-button" onClick={handleRefresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {info && <div className="banner banner-success">{info}</div>}
      {error && <div className="banner banner-error">{error}</div>}

      {/* Add Product Form */}
      {showForm && (
        <div className="product-form-container">
          <div className="product-form-header">
            <h3>Add New Product</h3>
            <button
              className="close-button"
              onClick={() => {
                setShowForm(false);
                setFormError("");
                setFormData({
                  name: "",
                  description: "",
                  vendor: "",
                  category: "",
                  specification: "",
                });
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="product-form">
            {formError && <div className="form-error-banner">{formError}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Fortinet FortiGate 60F"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="vendor">Vendor *</label>
                <input
                  type="text"
                  id="vendor"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                  placeholder="e.g., Fortinet, Cisco"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Firewall, Network Switch"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the product"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="specification">Specification</label>
              <textarea
                id="specification"
                name="specification"
                value={formData.specification}
                onChange={handleInputChange}
                placeholder="Technical specifications, features, etc."
                rows={4}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                  setFormData({
                    name: "",
                    description: "",
                    vendor: "",
                    category: "",
                    specification: "",
                  });
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={formLoading}>
                {formLoading ? "Creating…" : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      {!showForm && (
        <div className="products-filter-bar">
          <div className="search-field">
            <input
              type="text"
              placeholder="Search by name, vendor, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="vendor-filter">Vendor</label>
            <select
              id="vendor-filter"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              {vendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor === "all" ? "All Vendors" : vendor}
                </option>
              ))}
            </select>
          </div>

          <button className="primary-button" onClick={() => setShowForm(true)}>
            + Add Product
          </button>
        </div>
      )}

      {/* Products Table */}
      {!showForm && (
        <div className="products-table-wrapper">
          {loading ? (
            <div className="products-loading">Loading products…</div>
          ) : filteredProducts.length === 0 ? (
            <div className="products-empty">
              <p>No products found.</p>
              {products.length === 0 ? (
                <button className="primary-button" onClick={() => setShowForm(true)}>
                  Create Your First Product
                </button>
              ) : (
                <p>Try adjusting your filters.</p>
              )}
            </div>
          ) : (
            <table className="products-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="product-name">{product.name}</td>
                    <td>{product.vendor}</td>
                    <td>{product.category}</td>
                    <td className="product-description" title={product.description}>
                      {product.description || "-"}
                    </td>
                    <td className="product-actions">
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deletingId === product.id}
                      >
                        {deletingId === product.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default ManageProducts;
