import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./ClientTickets.css";

const normalizeStatus = (status) => {
  const normalized = (status || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();

  return normalized || "unknown";
};

const formatStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const statusClassName = (status) => {
  const normalized = normalizeStatus(status);
  return `status-pill status-${normalized}`;
};

const urgencyClassName = (priority) => {
  const normalized = (priority || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .trim();

  if (!normalized) return "urgency-pill urgency-unknown";
  return `urgency-pill urgency-${normalized}`;
};

const formatUrgency = (priority) => {
  if (!priority) return "Unknown";
  return priority
    .toLowerCase()
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

export default function ClientTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletData = useOutletContext() || {};
  const { tickets = [], loading = false, error = "", refetch } = outletData;

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (typeof refetch === "function" && tickets.length === 0 && !loading) {
      refetch();
    }
  }, [refetch, tickets.length, loading]);

  if (!user) {
    return null;
  }

  if (user.role?.toUpperCase() !== "CLIENT") {
    return <Navigate to="/dashboard" replace />;
  }

  const statusOptions = useMemo(() => {
    const counts = tickets.reduce((acc, ticket) => {
      const key = normalizeStatus(ticket.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(counts).map(([key, count]) => ({
      value: key,
      label: `${formatStatusLabel(key)} (${count})`,
    }));

    return [
      { value: "all", label: `All (${tickets.length})` },
      ...entries.sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const statusKey = normalizeStatus(ticket.status);
      const matchesFilter = activeFilter === "all" || statusKey === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchable = [
        ticket.id && String(ticket.id),
        ticket.title,
        ticket.description,
        ticket.product,
        ticket.category,
        ticket.department,
        ticket.urgency,
        ticket.urgency,
        ticket.created_by_name,
        ticket.assigned_agent_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [tickets, activeFilter, searchTerm]);

  return (
    <div className="client-tickets-page">
      <header className="client-tickets-header">
        <div>
          <h1>My Tickets</h1>
          <p className="client-tickets-subtitle">
            Review every request you have submitted and follow their progress in one place.
          </p>
        </div>
        <button className="cta-button" onClick={() => navigate("/create-ticket")}>
          New Ticket
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="client-tickets-toolbar">
        <div className="filter-group">
          {statusOptions.map((filter) => (
            <button
              key={filter.value}
              className={`filter-chip${activeFilter === filter.value ? " active" : ""}`}
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="search-field">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by keyword, ID, or person"
            aria-label="Search my tickets"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading tickets…</div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">
          <h3>No tickets to show</h3>
          <p>Try a different filter or create a new ticket.</p>
        </div>
      ) : (
        <div className="client-tickets-table-wrapper">
          <table className="client-tickets-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Status</th>
                <th>Urgency</th>
                <th>Category</th>
                <th>Product</th>
                <th>Department</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Updated</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => {
                const statusKey = normalizeStatus(ticket.status);
                return (
                  <tr key={ticket.id}>
                    <td>
                      <div className="ticket-title">{ticket.title}</div>
                      {ticket.description && (
                        <div className="ticket-description" title={ticket.description}>
                          {ticket.description}
                        </div>
                      )}
                      <div className="ticket-meta-small">Created by {ticket.created_by_name || "Unknown"}</div>
                    </td>
                    <td>
                      <span className={statusClassName(statusKey)}>{formatStatusLabel(statusKey)}</span>
                    </td>
                    <td>
                      <span className={urgencyClassName(ticket.urgency)}>{formatUrgency(ticket.urgency)}</span>
                    </td>
                    <td>{ticket.category || <span className="text-muted">-</span>}</td>
                    <td>{ticket.product || <span className="text-muted">-</span>}</td>
                    <td>{ticket.department || <span className="text-muted">-</span>}</td>
                    <td>{ticket.assigned_agent_name || <span className="text-muted">Unassigned</span>}</td>
                    <td>{formatDateTime(ticket.created_at)}</td>
                    <td>{formatDateTime(ticket.updated_at)}</td>
                    <td className="actions-column">
                      <button
                        className="action-button"
                        onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
