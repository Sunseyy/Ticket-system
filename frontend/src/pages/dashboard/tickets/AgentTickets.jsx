import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./tickets.css";

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

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

function AgentTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};
  const { tickets = [], loading, error, refetch } = outletContext;

  const agentName = user?.full_name || user?.name || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  const statusOptions = useMemo(() => {
    const unique = new Set();
    tickets.forEach((ticket) => {
      const normalized = normalizeStatus(ticket.status);
      if (normalized) {
        unique.add(normalized);
      }
    });
    return Array.from(unique).sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const matchesQuery = (ticket) => {
      if (!query) return true;
      const haystack = [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.department,
        ticket.product,
        ticket.created_by_name,
        ticket.assigned_agent_name,
        ticket.priority,
        ticket.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    };

    const matchesStatus = (ticket) => {
      if (statusFilter === "all") return true;
      return normalizeStatus(ticket.status) === statusFilter;
    };

    const matchesAssignment = (ticket) => {
      if (assignmentFilter === "all") return true;
      const assignedTo = ticket.assigned_agent_name || "";

      if (assignmentFilter === "mine") {
        if (!agentName) return false;
        return assignedTo === agentName;
      }

      if (assignmentFilter === "unassigned") {
        return !assignedTo;
      }

      if (assignmentFilter === "others") {
        if (!assignedTo) return false;
        if (!agentName) return true;
        return assignedTo !== agentName;
      }

      return true;
    };

    return tickets
      .filter((ticket) => matchesQuery(ticket) && matchesStatus(ticket) && matchesAssignment(ticket))
      .sort((a, b) => {
        const left = new Date(a.updated_at || a.created_at || 0).getTime();
        const right = new Date(b.updated_at || b.created_at || 0).getTime();
        return right - left;
      });
  }, [tickets, searchTerm, statusFilter, assignmentFilter, agentName]);

  const handleOpenTicket = (ticketId) => {
    if (!ticketId) return;
    navigate(`/dashboard/tickets/${ticketId}`);
  };

  return (
    <div className="tickets-page">
      <div className="tickets-heading">
        <div>
          <h2>All Tickets</h2>
          <p className="tickets-subtitle">
            Review every client request, manage assignments, and keep the queue moving.
          </p>
        </div>
        <div className="heading-actions">
          <span className="result-count">{filteredTickets.length} showing</span>
          <button className="refresh-button" onClick={refetch} disabled={loading}>
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="tickets-error">{error}</div>}

      <div className="filters-bar">
        <div className="search-field">
          <input
            type="search"
            placeholder="Search by title, client, department, or ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignment
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value)}
            >
              <option value="all">Everyone</option>
              <option value="mine" disabled={!agentName}>
                Assigned to me
              </option>
              <option value="unassigned">Unassigned</option>
              <option value="others" disabled={!agentName}>
                Assigned to others
              </option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="tickets-loading">
          <div className="loading-spinner"></div>
          <span>Loading tickets...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="tickets-empty">
          <div className="empty-icon">📭</div>
          <p>No tickets match the selected filters.</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map((ticket) => (
            <article
              key={ticket.id}
              className="ticket-card"
              onClick={() => handleOpenTicket(ticket.id)}
            >
              <header className="ticket-card-header">
                <span className="ticket-card-id">#{ticket.id}</span>
                <div className="ticket-card-badges">
                  <span className={statusClassName(ticket.status)}>
                    {formatStatusLabel(ticket.status)}
                  </span>
                  <span className={priorityClassName(ticket.priority)}>
                    {formatPriority(ticket.priority)}
                  </span>
                </div>
              </header>
              <h3 className="ticket-card-title">{ticket.title}</h3>
              {ticket.description && (
                <p className="ticket-card-desc">{ticket.description}</p>
              )}
              <div className="ticket-card-meta">
                <div className="meta-item">
                  <span className="meta-label">Client</span>
                  <span className="meta-value">{ticket.created_by_name || "Unknown"}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Department</span>
                  <span className="meta-value">{ticket.department || "-"}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Assigned</span>
                  <span className="meta-value">{ticket.assigned_agent_name || "Unassigned"}</span>
                </div>
              </div>
              <footer className="ticket-card-footer">
                <span className="ticket-card-date">
                  Updated {formatDateTime(ticket.updated_at || ticket.created_at)}
                </span>
                <button
                  className="view-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTicket(ticket.id);
                  }}
                >
                  View Details →
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentTickets;
