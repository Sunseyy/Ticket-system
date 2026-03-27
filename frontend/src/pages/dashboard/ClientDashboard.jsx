import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import "./ClientDashboard.css";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

const formatStatus = (status) => {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
};

const statusClassName = (status) => {
  const normalized = (status || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .trim();

  if (!normalized) {
    return "status-pill status-unknown";
  }

  return `status-pill status-${normalized}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
        console.error("Client tickets fetch error:", err);
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

  const isRootView = location.pathname === "/dashboard";

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate("/");
  };

  const handleCreateTicket = () => navigate("/create-ticket");
  const handleViewAll = () => navigate("/dashboard/client");
  const handleViewTicket = (ticketId) => navigate(`/dashboard/tickets/${ticketId}`);

  if (!user) {
    return null;
  }

  return (
    <MainLayout
      topbarContent={{
        userName: user.full_name || user.name || "Client",
        userRole: user.role || "Client",
        onLogout: handleLogout,
      }}
    >
      {isRootView && (
        <div className="dashboard-container">
          <div className="dashboard-heading">
            <div>
              <h1>Welcome back!</h1>
              <p className="dashboard-subtitle">
                Track the latest updates on your support requests at a glance.
              </p>
            </div>
            <button className="cta-button" onClick={handleCreateTicket}>
              New Ticket
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
              <span className="summary-label">Closed</span>
              <span className="summary-value status-closed">{statusCounts.closed}</span>
            </div>
          </div>

          <div className="latest-section">
            <div className="latest-header">
              <h2>Recent Tickets</h2>
              <button className="link-button" onClick={handleViewAll}>
                View all
              </button>
            </div>

            {loading ? (
              <div className="loading-state">Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">No tickets found.</div>
            ) : (
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Owner</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th className="actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 4).map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.title}</td>
                      <td>{ticket.created_by_name || "-"}</td>
                      <td>{formatDate(ticket.created_at)}</td>
                      <td>
                        <span className={statusClassName(ticket.status)}>{formatStatus(ticket.status)}</span>
                      </td>
                      <td className="actions-column">
                        <button className="action-button" onClick={() => handleViewTicket(ticket.id)}>
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
