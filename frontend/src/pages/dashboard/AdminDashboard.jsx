import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import "./AdminDashboard.css";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

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

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isRootDashboard = location.pathname === "/dashboard";

  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTickets = useCallback(
    async ({ signal } = {}) => {
      setTicketsLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_URL}/tickets?role=ADMIN`, {
          signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tickets");
        }

        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Admin tickets fetch error:", err);
        setTickets([]);
        setError(err.message || "Unable to load tickets right now.");
      } finally {
        if (!signal || !signal.aborted) {
          setTicketsLoading(false);
        }
      }
    },
    []
  );

  const fetchAgents = useCallback(
    async ({ signal } = {}) => {
      setAgentsLoading(true);
      try {
        const response = await fetch(`${API_URL}/agents`, { signal });

        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }

        const data = await response.json();
        setAgents(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Agents fetch error:", err);
        setAgents([]);
        setError((prev) => prev || err.message || "Unable to load agents.");
      } finally {
        if (!signal || !signal.aborted) {
          setAgentsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const ticketController = new AbortController();
    const agentController = new AbortController();

    fetchTickets({ signal: ticketController.signal });
    fetchAgents({ signal: agentController.signal });

    return () => {
      ticketController.abort();
      agentController.abort();
    };
  }, [fetchTickets, fetchAgents]);

  const statusCounts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        const normalized = (ticket.status || "").toUpperCase();
        if (normalized === "OPEN") acc.open += 1;
        else if (normalized === "IN_PROGRESS") acc.inProgress += 1;
        else if (normalized === "CLOSED") acc.closed += 1;
        else acc.other += 1;
        return acc;
      },
      { open: 0, inProgress: 0, closed: 0, other: 0 }
    );
  }, [tickets]);

  const unassignedCount = useMemo(
    () => tickets.filter((ticket) => !ticket.assigned_agent_name).length,
    [tickets]
  );

  const handleAssign = async (ticketId) => {
    const agentId = assignments[ticketId];

    if (!agentId) {
      setError("Please select an agent before assigning.");
      setInfo("");
      return;
    }

    setAssigningId(ticketId);
    setError("");
    setInfo("");

    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to assign ticket.");
      }

      const agent = agents.find((a) => String(a.id) === String(agentId));
      setInfo(`Ticket assigned to ${agent?.full_name || "selected agent"}.`);
      setAssignments((prev) => ({ ...prev, [ticketId]: "" }));
      fetchTickets();
    } catch (err) {
      console.error("Assign ticket error:", err);
      setError(err.message || "Failed to assign ticket.");
    } finally {
      setAssigningId(null);
    }
  };

  const handleDelete = async (ticketId) => {
    if (!user?.id) {
      setError("Missing administrator credentials to delete this ticket.");
      return;
    }

    const confirmDelete = window.confirm("Delete this ticket? This cannot be undone.");
    if (!confirmDelete) return;

    setDeletingId(ticketId);
    setError("");
    setInfo("");

    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete ticket.");
      }

      setInfo("Ticket deleted successfully.");
      fetchTickets();
    } catch (err) {
      console.error("Delete ticket error:", err);
      setError(err.message || "Failed to delete ticket.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate("/");
  };

  const handleRefresh = () => {
    fetchTickets();
    fetchAgents();
  };

  const handleManageUsers = () => {
    navigate("/dashboard/admin/manage-users");
  };

  const handleManageCompanies = () => {
    navigate("/dashboard/admin/manage-companies");
  };

  return (
    <MainLayout
      topbarContent={{
        userName: user?.full_name || user?.name || "Administrator",
        userRole: user?.role || "Admin",
        onLogout: handleLogout,
      }}
    >
      {isRootDashboard && (
        <div className="admin-dashboard-container">
          <div className="dashboard-heading">
            <div>
              <h1>Admin Control Center</h1>
              <p className="dashboard-subtitle">
                Monitor ticket flow, track agent workload, and take action instantly.
              </p>
            </div>
            <div className="heading-actions">
              <button className="primary-button" onClick={handleManageCompanies}>
                Manage Companies
              </button>
              <button className="primary-button" onClick={handleManageUsers}>
                Manage Users
              </button>
              <button className="ghost-button" onClick={handleRefresh} disabled={ticketsLoading || agentsLoading}>
                {ticketsLoading || agentsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {info && <div className="banner banner-success">{info}</div>}
          {error && <div className="banner banner-error">{error}</div>}

          <div className="summary-section">
            <div className="summary-card hoverable">
              <span className="summary-label">Total Tickets</span>
              <span className="summary-value">{tickets.length}</span>
            </div>
            <div className="summary-card hoverable">
              <span className="summary-label">Open</span>
              <span className="summary-value status-open">{statusCounts.open}</span>
            </div>
            <div className="summary-card hoverable">
              <span className="summary-label">In Progress</span>
              <span className="summary-value status-in-progress">{statusCounts.inProgress}</span>
            </div>
            <div className="summary-card hoverable">
              <span className="summary-label">Closed</span>
              <span className="summary-value status-closed">{statusCounts.closed}</span>
            </div>
            <div className="summary-card hoverable">
              <span className="summary-label">Unassigned</span>
              <span className="summary-value">{unassignedCount}</span>
            </div>
          </div>

          <div className="latest-tickets-section">
            <div className="latest-header">
              <h2>All Tickets</h2>
              <span className="latest-meta">
                Showing {tickets.length} records · {agents.length} agents available
              </span>
            </div>

            {ticketsLoading ? (
              <div className="loading-state">Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">No tickets found.</div>
            ) : (
              <div className="table-wrapper">
                <table className="ticket-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Category</th>
                      <th>Assigned To</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Assign</th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => {
                      const statusKey = normalizeStatus(ticket.status);
                      const priorityKey = priorityClassName(ticket.priority);
                      return (
                        <tr key={ticket.id}>
                          <td>
                            <div className="ticket-title">{ticket.title}</div>
                            {ticket.description && (
                              <div className="ticket-description" title={ticket.description}>
                                {ticket.description}
                              </div>
                            )}
                            <div className="ticket-meta-small">
                              Raised by {ticket.created_by_name || "Unknown"}
                            </div>
                          </td>
                          <td>
                            <span className={statusClassName(statusKey)}>{formatStatusLabel(statusKey)}</span>
                          </td>
                          <td>
                            <span className={priorityKey}>{formatPriorityLabel(ticket.priority)}</span>
                          </td>
                          <td>{ticket.category || <span className="text-muted">-</span>}</td>
                          <td>{ticket.assigned_agent_name || <span className="text-muted">Unassigned</span>}</td>
                          <td>{formatDateTime(ticket.created_at)}</td>
                          <td>{formatDateTime(ticket.updated_at)}</td>
                          <td>
                            <div className="assign-controls">
                              <select
                                className="assign-select"
                                value={assignments[ticket.id] || ""}
                                onChange={(event) =>
                                  setAssignments((prev) => ({
                                    ...prev,
                                    [ticket.id]: event.target.value,
                                  }))
                                }
                                disabled={assigningId === ticket.id || agentsLoading}
                              >
                                <option value="">Select agent</option>
                                {agents.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.full_name}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="admin-btn admin-btn--assign"
                                onClick={() => handleAssign(ticket.id)}
                                disabled={assigningId === ticket.id}
                              >
                                {assigningId === ticket.id ? "Assigning…" : "Assign"}
                              </button>
                            </div>
                          </td>
                          <td className="actions-column">
                            <div className="admin-action-group">
                              <button
                                className="admin-btn admin-btn--view"
                                onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                              >
                                View
                              </button>
                              <button
                                className="admin-btn admin-btn--danger"
                                onClick={() => handleDelete(ticket.id)}
                                disabled={deletingId === ticket.id}
                              >
                                {deletingId === ticket.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <Outlet
        context={{
          tickets,
          agents,
          ticketsLoading,
          agentsLoading,
          refetchTickets: () => fetchTickets(),
          refetchAgents: () => fetchAgents(),
        }}
      />
    </MainLayout>
  );
}

export default AdminDashboard;
