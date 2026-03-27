import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../config/api";
import "./ManageUsers.css";

const normalizeRoleValue = (role) => (role || "").toUpperCase().trim();

const formatRoleLabel = (role) => {
  const normalized = normalizeRoleValue(role);
  if (!normalized) return "Unknown";
  return normalized
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const normalizeStatus = (status) =>
  (status || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .trim();

const statusClassName = (status) => {
  const normalized = normalizeStatus(status);
  return normalized ? `status-pill status-${normalized}` : "status-pill status-unknown";
};

const formatStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "Unknown";
  return normalized
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const priorityClassName = (priority) => {
  const normalized = (priority || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .trim();

  return normalized ? `priority-pill priority-${normalized}` : "priority-pill priority-unknown";
};

const formatPriorityLabel = (priority) => {
  if (!priority) return "Unknown";
  return priority
    .toLowerCase()
    .split(/[-_\s]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

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

function ManageUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [userTickets, setUserTickets] = useState({ created: [], assigned: [] });
  const [deletingId, setDeletingId] = useState(null);

  const adminId = user?.id;

  const fetchUsers = useCallback(async () => {
    if (!adminId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/users?adminId=${encodeURIComponent(adminId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ManageUsers fetch error:", err);
      setError(err.message || "Unable to load users right now.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  const fetchUserTickets = useCallback(
    async (targetUser) => {
      if (!adminId || !targetUser?.id) return;

      setDetailLoading(true);
      setDetailError("");
      setUserTickets({ created: [], assigned: [] });

      try {
        const response = await fetch(
          `${API_URL}/users/${encodeURIComponent(
            targetUser.id
          )}/tickets?adminId=${encodeURIComponent(adminId)}`
        );

        if (!response.ok) {
          throw new Error("Failed to load user tickets");
        }

        const data = await response.json();
        setUserTickets({
          created: Array.isArray(data.created) ? data.created : [],
          assigned: Array.isArray(data.assigned) ? data.assigned : [],
        });
      } catch (err) {
        console.error("ManageUsers ticket fetch error:", err);
        setDetailError(err.message || "Unable to load user tickets.");
        setUserTickets({ created: [], assigned: [] });
      } finally {
        setDetailLoading(false);
      }
    },
    [adminId]
  );

  useEffect(() => {
    if (normalizeRoleValue(user?.role) !== "ADMIN") {
      return;
    }

    fetchUsers();
  }, [user, fetchUsers]);

  const roleOptions = useMemo(() => {
    const unique = new Set();
    users.forEach((record) => {
      const normalized = normalizeRoleValue(record.role);
      if (normalized) {
        unique.add(normalized);
      }
    });
    return Array.from(unique).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users
      .filter((record) => {
        if (roleFilter !== "all" && normalizeRoleValue(record.role) !== roleFilter) {
          return false;
        }

        if (!query) return true;

        const haystack = [
          record.id,
          record.full_name,
          record.email,
          record.role,
          record.society_id,
        ]
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
  }, [users, searchTerm, roleFilter]);

  const handleRefresh = () => {
    setInfo("");
    fetchUsers();
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleViewTickets = (targetUser) => {
    setSelectedUser(targetUser);
    fetchUserTickets(targetUser);
  };

  const handleOpenTicket = (ticketId) => {
    if (!ticketId) return;
    navigate(`/dashboard/tickets/${ticketId}`);
  };

  const handleCloseDetails = () => {
    setSelectedUser(null);
    setUserTickets({ created: [], assigned: [] });
    setDetailError("");
  };

  const handleDeleteUser = async (targetUser) => {
    if (!adminId || !targetUser) return;

    const confirmed = window.confirm(
      `Delete user "${targetUser.full_name}"? This will remove their tickets and comments.`
    );

    if (!confirmed) return;

    setError("");
    setInfo("");
    setDeletingId(targetUser.id);

    try {
      const response = await fetch(`${API_URL}/users/${targetUser.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete user");
      }

      setInfo(`User ${targetUser.full_name} deleted.`);
      if (selectedUser?.id === targetUser.id) {
        handleCloseDetails();
      }

      fetchUsers();
      if (typeof outletContext.refetchTickets === "function") {
        outletContext.refetchTickets();
      }
      if (typeof outletContext.refetchAgents === "function") {
        outletContext.refetchAgents();
      }
    } catch (err) {
      console.error("ManageUsers delete error:", err);
      setError(err.message || "Unable to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  if (normalizeRoleValue(user?.role) !== "ADMIN") {
    return (
      <div className="manage-users-page">
        <div className="users-loading">Access restricted. Administrator role required.</div>
      </div>
    );
  }

  return (
    <div className="manage-users-page">
      <div className="users-heading">
        <div>
          <h2>User Management</h2>
          <p className="users-subtitle">
            Audit every account, review their workload, and take corrective actions when needed.
          </p>
        </div>
        <div className="users-actions">
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

      <div className="users-filter-bar">
        <div className="search-field">
          <input
            type="search"
            placeholder="Search by name, email, role, or ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>
            Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="users-loading">Loading users…</div>
      ) : filteredUsers.length === 0 ? (
        <div className="users-empty">No users match the selected filters.</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tickets Created</th>
                <th>Tickets Assigned</th>
                <th>Joined</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="user-name">{record.full_name}</div>
                    <div className="user-meta">ID #{record.id}</div>
                    {record.society_id && (
                      <div className="user-meta">Society #{record.society_id}</div>
                    )}
                  </td>
                  <td>
                    <div className="user-email">{record.email}</div>
                  </td>
                  <td>
                    <span
                      className={`role-pill role-${normalizeRoleValue(record.role).toLowerCase()}`}
                    >
                      {formatRoleLabel(record.role)}
                    </span>
                  </td>
                  <td>
                    <div className="metric-line">
                      <strong>{record.created_total}</strong> total
                    </div>
                    <div className="metric-subline">
                      Open {record.created_open} · In Progress {record.created_in_progress} · Closed {record.created_closed}
                    </div>
                  </td>
                  <td>
                    <div className="metric-line">
                      <strong>{record.assigned_total}</strong> total
                    </div>
                    <div className="metric-subline">
                      Open {record.assigned_open} · In Progress {record.assigned_in_progress} · Closed {record.assigned_closed}
                    </div>
                  </td>
                  <td>{formatDate(record.created_at)}</td>
                  <td className="actions-column">
                    <div className="admin-action-group">
                      <button
                        className="admin-btn admin-btn--view"
                        onClick={() => handleViewTickets(record)}
                      >
                        View Tickets
                      </button>
                      <button
                        className="admin-btn admin-btn--danger"
                        onClick={() => handleDeleteUser(record)}
                        disabled={deletingId === record.id || record.id === adminId}
                      >
                        {deletingId === record.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <div className="user-details-panel">
          <div className="panel-header">
            <div>
              <h3>{selectedUser.full_name}</h3>
              <p className="panel-subtitle">
                {formatRoleLabel(selectedUser.role)} · Joined {formatDate(selectedUser.created_at)}
              </p>
            </div>
            <button className="ghost-button" onClick={handleCloseDetails}>
              Close
            </button>
          </div>

          {detailError && <div className="banner banner-error">{detailError}</div>}

          {detailLoading ? (
            <div className="users-loading">Loading ticket history…</div>
          ) : (
            <div className="panel-columns">
              <div className="panel-column">
                <h4>Tickets Created</h4>
                {userTickets.created.length === 0 ? (
                  <div className="panel-empty">No tickets created.</div>
                ) : (
                  <table className="tickets-table">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Updated</th>
                        <th className="actions-column">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTickets.created.map((ticket) => (
                        <tr key={`created-${ticket.id}`}>
                          <td>
                            <div className="ticket-title">{ticket.title}</div>
                            {ticket.description && (
                              <div className="ticket-description" title={ticket.description}>
                                {ticket.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={statusClassName(ticket.status)}>
                              {formatStatusLabel(ticket.status)}
                            </span>
                          </td>
                          <td>
                            <span className={priorityClassName(ticket.priority)}>
                              {formatPriorityLabel(ticket.priority)}
                            </span>
                          </td>
                          <td>{formatDateTime(ticket.updated_at || ticket.created_at)}</td>
                          <td className="actions-column">
                            <button
                              className="admin-btn admin-btn--view"
                              onClick={() => handleOpenTicket(ticket.id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="panel-column">
                <h4>Tickets Assigned</h4>
                {userTickets.assigned.length === 0 ? (
                  <div className="panel-empty">No tickets assigned.</div>
                ) : (
                  <table className="tickets-table">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th className="actions-column">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTickets.assigned.map((ticket) => (
                        <tr key={`assigned-${ticket.id}`}>
                          <td>
                            <div className="ticket-title">{ticket.title}</div>
                            {ticket.description && (
                              <div className="ticket-description" title={ticket.description}>
                                {ticket.description}
                              </div>
                            )}
                          </td>
                          <td>{ticket.created_by_name || <span className="text-muted">Unknown</span>}</td>
                          <td>
                            <span className={statusClassName(ticket.status)}>
                              {formatStatusLabel(ticket.status)}
                            </span>
                          </td>
                          <td>{formatDateTime(ticket.updated_at || ticket.created_at)}</td>
                          <td className="actions-column">
                            <button
                              className="admin-btn admin-btn--view"
                              onClick={() => handleOpenTicket(ticket.id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
