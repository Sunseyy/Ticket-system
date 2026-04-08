import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../config/api";
import "./ManageCompanies.css";

const normalizeRoleValue = (role) => (role || "").toUpperCase().trim();

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const formatTypeLabel = (value) => {
  if (!value) return "General";
  return value
    .toString()
    .trim()
    .split(/[-_\s]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
};

function ManageCompanies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [nameInput, setNameInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [contactEmailInput, setContactEmailInput] = useState("");

  const adminId = user?.id;

  const fetchCompanies = useCallback(async () => {
    if (!adminId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/companies?adminId=${encodeURIComponent(adminId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load companies");
      }

      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ManageCompanies fetch error:", err);
      setError(err.message || "Unable to load companies right now.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    if (normalizeRoleValue(user?.role) !== "ADMIN") {
      return;
    }

    fetchCompanies();
  }, [user, fetchCompanies]);

  const typeOptions = useMemo(() => {
    const unique = new Set();
    companies.forEach((company) => {
      const type = (company.type || "").trim();
      if (type) {
        unique.add(type);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return companies
      .filter((company) => {
        if (typeFilter !== "all") {
          const type = (company.type || "").trim();
          if (type.toLowerCase() !== typeFilter.toLowerCase()) {
            return false;
          }
        }

        if (!query) return true;

        const haystack = [company.id, company.name, company.contact_email, company.type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const left = new Date(a.created_at || 0).getTime();
        const right = new Date(b.created_at || 0).getTime();
        return right - left;
      });
  }, [companies, searchTerm, typeFilter]);

  const handleRefresh = () => {
    setInfo("");
    fetchCompanies();
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleCreateCompany = async (event) => {
    event.preventDefault();

    if (!adminId) return;

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setError("Company name is required.");
      return;
    }

    setCreating(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch(`${API_URL}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          name: nameInput,
          contactEmail: contactEmailInput,
          type: typeInput,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to create company");
      }

      const created = await response.json();
      setInfo(`Company "${created.name}" created.`);
      setCompanies((prev) => [created, ...prev]);
      setNameInput("");
      setTypeInput("");
      setContactEmailInput("");

      if (typeof outletContext.refetchTickets === "function") {
        outletContext.refetchTickets();
      }
    } catch (err) {
      console.error("ManageCompanies create error:", err);
      setError(err.message || "Unable to create company.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!adminId || !company) return;

    const confirmed = window.confirm(
      `Delete company "${company.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(company.id);
    setError("");
    setInfo("");

    try {
      const response = await fetch(`${API_URL}/companies/${company.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete company");
      }

      setInfo(`Company "${company.name}" deleted.`);
      setCompanies((prev) => prev.filter((record) => record.id !== company.id));

      if (typeof outletContext.refetchTickets === "function") {
        outletContext.refetchTickets();
      }
    } catch (err) {
      console.error("ManageCompanies delete error:", err);
      setError(err.message || "Unable to delete company.");
    } finally {
      setDeletingId(null);
    }
  };

  if (normalizeRoleValue(user?.role) !== "ADMIN") {
    return (
      <div className="manage-companies-page">
        <div className="companies-loading">Access restricted. Administrator role required.</div>
      </div>
    );
  }

  return (
    <div className="manage-companies-page">
      <div className="companies-heading">
        <div>
          <h2>Manage Companies</h2>
          <p className="companies-subtitle">
            Keep your corporate directory up to date and ensure every organization is ready to file tickets.
          </p>
        </div>
        <div className="companies-actions">
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

      <div className="creation-card">
        <form className="creation-form" onSubmit={handleCreateCompany}>
          <div>
            <label htmlFor="company-name">Company Name</label>
            <input
              id="company-name"
              type="text"
              placeholder="e.g. Sunrise Logistics"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="company-type">Type</label>
            <select
              id="company-type"
              value={typeInput}
              onChange={(event) => setTypeInput(event.target.value)}
              required
            >
              <option value="">Select type</option>
              <option value="client">Client</option>
              <option value="tech">Tech</option>
            </select>
          </div>
          <div>
            <label htmlFor="company-contact">Contact Email</label>
            <input
              id="company-contact"
              type="email"
              placeholder="ops@sunrise-logistics.com"
              value={contactEmailInput}
              onChange={(event) => setContactEmailInput(event.target.value)}
            />
          </div>
          <button className="primary-button" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Add Company"}
          </button>
        </form>
      </div>

      <div className="companies-filter-bar">
        <div className="search-field">
          <input
            type="search"
            placeholder="Search by name, type, or contact"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>
            Type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatTypeLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="companies-loading">Loading companies…</div>
      ) : filteredCompanies.length === 0 ? (
        <div className="companies-empty">No companies match the selected filters.</div>
      ) : (
        <div className="companies-table-wrapper">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Contact Email</th>
                <th>Created</th>
                <th>Updated</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id}>
                  <td>
                    {company.name ? (
                      company.name
                    ) : (
                      <span className="text-muted">Unnamed</span>
                    )}
                  </td>
                  <td>
                    {company.type ? (
                      formatTypeLabel(company.type)
                    ) : (
                      <span className="text-muted">Unspecified</span>
                    )}
                  </td>
                  <td>
                    {company.contact_email ? (
                      <a className="company-email" href={`mailto:${company.contact_email}`}>
                        {company.contact_email}
                      </a>
                    ) : (
                      <span className="text-muted">No email</span>
                    )}
                  </td>
                  <td>{formatDate(company.created_at)}</td>
                  <td>{formatDateTime(company.updated_at || company.created_at)}</td>
                  <td className="actions-column">
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => handleDeleteCompany(company)}
                      disabled={deletingId === company.id}
                    >
                      {deletingId === company.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageCompanies;
