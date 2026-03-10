import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../../layout/MainLayout";
import "./AgentDashboard.css";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

const normalizeStatus = (status) => {
  return (status || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
};

const formatStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "Unknown";
  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const statusClassName = (status) => {
  const normalized = normalizeStatus(status) || "unknown";
  return `status-pill status-${normalized}`;
};

const priorityClassName = (priority) => {
  const normalized = (priority || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .trim();

  if (!normalized) return "priority-pill priority-unknown";
  return `priority-pill priority-${normalized}`;
};

const formatPriority = (priority) => {
  if (!priority) return "Unknown";
  return priority
    .toLowerCase()
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
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

function AgentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(
    async ({ signal } = {}) => {
      if (!user?.id || !user?.role) {
        setTickets([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/tickets?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role)}`,
          { signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch tickets");
        }

        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching tickets for agent dashboard:", err);
        setError("Unable to load tickets right now.");
        setTickets([]);
      } finally {
        if (!signal || !signal.aborted) {
          setLoading(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchTickets({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchTickets]);

  const statusCounts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        const key = (ticket.status || "").toUpperCase();
        if (key === "OPEN") acc.open += 1;
        else if (key === "IN_PROGRESS") acc.inProgress += 1;
        else if (key === "CLOSED") acc.closed += 1;
        else acc.other += 1;
        return acc;
      },
      { open: 0, inProgress: 0, closed: 0, other: 0 }
    );
  }, [tickets]);

  const agentName = user?.full_name || user?.name || "";

  const assignmentStats = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        const assignedTo = ticket.assigned_agent_name || "";
        if (!assignedTo) {
          acc.unassigned += 1;
        } else if (agentName && assignedTo === agentName) {
          acc.mine += 1;
        } else {
          acc.others += 1;
        }
        return acc;
      },
      { mine: 0, unassigned: 0, others: 0 }
    );
  }, [tickets, agentName]);

  const isRootView = location.pathname === "/dashboard";

  const handleViewAll = () => navigate("/dashboard/tickets");
  const handleViewTicket = (ticketId) => navigate(`/dashboard/tickets/${ticketId}`);

  if (!user) {
    return null;
  }

  return (
    <MainLayout
      topbarContent={{
        userName: agentName || "Agent",
        userRole: user.role || "Agent",
        onLogout: logout,
      }}
    >
      {isRootView && (
        <div className="agent-dashboard-container">
          <div className="dashboard-heading">
            <div>
              <h1>Agent Dashboard</h1>
              <p className="dashboard-subtitle">
                Monitor assignment load, respond to new tickets, and keep clients updated.
              </p>
            </div>
            <button className="cta-button" onClick={handleViewAll}>
              View All Tickets
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

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
              <span className="summary-label">Assigned To Me</span>
              <span className="summary-value status-assigned">{assignmentStats.mine}</span>
            </div>
          </div>

          <div className="latest-section">
            <div className="latest-header">
              <h2>Queue Snapshot</h2>
              <div className="latest-meta">
                <span className="meta-item">Unassigned: {assignmentStats.unassigned}</span>
                <span className="meta-item">Closed: {statusCounts.closed}</span>
                <button className="link-button" onClick={handleViewAll}>
                  Open full queue
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">No tickets available.</div>
            ) : (
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Client</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th className="actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 6).map((ticket) => {
                    const normalizedStatus = normalizeStatus(ticket.status);
                    return (
                      <tr key={ticket.id}>
                        <td>
                          <div className="ticket-title">{ticket.title}</div>
                          {ticket.description && (
                            <div className="ticket-description" title={ticket.description}>
                              {ticket.description}
                            </div>
                          )}
                        </td>
                        <td>{ticket.created_by_name || "-"}</td>
                        <td>
                          <span className={priorityClassName(ticket.priority)}>
                            {formatPriority(ticket.priority)}
                          </span>
                        </td>
                        <td>
                          <span className={statusClassName(normalizedStatus)}>
                            {formatStatusLabel(normalizedStatus)}
                          </span>
                        </td>
                        <td>{ticket.assigned_agent_name || <span className="text-muted">Unassigned</span>}</td>
                        <td>{formatDate(ticket.created_at)}</td>
                        <td className="actions-column">
                          <button className="action-button" onClick={() => handleViewTicket(ticket.id)}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Outlet
        context={{
          tickets,
          loading,
          error,
          refetch: () => fetchTickets(),
        }}
      />
    </MainLayout>
  );
}

export default AgentDashboard;
