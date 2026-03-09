import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./AdminAllTickets.css";

const normalizeRole = (role) => (role || "").toUpperCase().trim();

const normalizeStatus = (status) =>
  (status || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .trim();

const statusClassName = (status) => {
  const normalized = normalizeStatus(status) || "unknown";
  return `status-pill status-${normalized}`;
};

const formatStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "Unknown";
  return normalized
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const normalizePriority = (priority) =>
  (priority || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .trim();

const priorityClassName = (priority) => {
  const normalized = normalizePriority(priority) || "unknown";
  return `priority-pill priority-${normalized}`;
};

const formatPriorityLabel = (priority) => {
  const normalized = normalizePriority(priority);
  if (!normalized) return "Unknown";
  return normalized
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

function AdminAllTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};

  const {
    tickets = [],
    agents = [],
    ticketsLoading = false,
    agentsLoading = false,
    refetchTickets,
    refetchAgents,
  } = outletContext;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [assignments, setAssignments] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

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

  const priorityOptions = useMemo(() => {
    const unique = new Set();
    tickets.forEach((ticket) => {
      const normalized = normalizePriority(ticket.priority);
      if (normalized) {
        unique.add(normalized);
      }
    });
    return Array.from(unique).sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const matchesSearch = (ticket) => {
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

    const matchesPriority = (ticket) => {
      if (priorityFilter === "all") return true;
      return normalizePriority(ticket.priority) === priorityFilter;
    };

    const matchesAssignment = (ticket) => {
      if (assignmentFilter === "all") return true;
      if (assignmentFilter === "unassigned") {
        return !ticket.assigned_agent_name;
      }
      if (assignmentFilter === "assigned") {
        return Boolean(ticket.assigned_agent_name);
      }
      return true;
    };

    return tickets
      .filter((ticket) => matchesSearch(ticket) && matchesStatus(ticket) && matchesPriority(ticket) && matchesAssignment(ticket))
      .sort((a, b) => {
        const left = new Date(a.updated_at || a.created_at || 0).getTime();
        const right = new Date(b.updated_at || b.created_at || 0).getTime();
        return right - left;
      });
  }, [tickets, searchTerm, statusFilter, priorityFilter, assignmentFilter]);

  const handleRefresh = () => {
    if (typeof refetchTickets === "function") {
      refetchTickets();
    }
    if (typeof refetchAgents === "function") {
      refetchAgents();
    }
  };

  const resolveSelectValue = (ticket) => {
    const stored = assignments[ticket.id];
    if (stored) {
      return stored;
    }
    if (!ticket.assigned_agent_name) {
      return "";
    }
    const matched = agents.find((agent) => agent.full_name === ticket.assigned_agent_name);
    return matched ? String(matched.id) : "";
  };

  const handleAssign = async (ticketId) => {
    let agentId = assignments[ticketId];

    if (!agentId) {
      const ticketRecord = tickets.find((record) => String(record.id) === String(ticketId));
      if (ticketRecord?.assigned_agent_name) {
        const existingAgent = agents.find(
          (candidate) => candidate.full_name === ticketRecord.assigned_agent_name
        );
        if (existingAgent) {
          agentId = existingAgent.id;
        }
      }
    }

    const numericAgentId = Number(agentId);

    if (!Number.isFinite(numericAgentId) || numericAgentId <= 0) {
      setFeedback({ type: "error", message: "Select an agent before assigning." });
      return;
    }

    setAssigningId(ticketId);
    setFeedback({ type: "", message: "" });

    try {
      const response = await fetch(`http://localhost:5000/tickets/${ticketId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: numericAgentId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to assign ticket.");
      }

      const agent = agents.find((candidate) => Number(candidate.id) === numericAgentId);
      setFeedback({
        type: "success",
        message: `Ticket assigned to ${agent?.full_name || "selected agent"}.`,
      });
      setAssignments((prev) => ({ ...prev, [ticketId]: "" }));

      if (typeof refetchTickets === "function") {
        refetchTickets();
      }
    } catch (err) {
      console.error("AdminAllTickets assign error:", err);
      setFeedback({ type: "error", message: err.message || "Unable to assign ticket." });
    } finally {
      setAssigningId(null);
    }
  };

  const handleDelete = async (ticketId) => {
    if (!user?.id) {
      setFeedback({ type: "error", message: "Administrator credentials required to delete." });
      return;
    }

    const confirmed = window.confirm("Delete this ticket? This action cannot be undone.");
    if (!confirmed) return;

    setDeletingId(ticketId);
    setFeedback({ type: "", message: "" });

    try {
      const response = await fetch(`http://localhost:5000/tickets/${ticketId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete ticket.");
      }

      setFeedback({ type: "success", message: "Ticket deleted successfully." });

      if (typeof refetchTickets === "function") {
        refetchTickets();
      }
    } catch (err) {
      console.error("AdminAllTickets delete error:", err);
      setFeedback({ type: "error", message: err.message || "Unable to delete ticket." });
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenTicket = (ticketId) => {
    if (!ticketId) return;
    navigate(`/dashboard/tickets/${ticketId}`);
  };

  if (normalizeRole(user?.role) !== "ADMIN") {
    return (
      <div className="tickets-page">
        <div className="tickets-loading">Access restricted. Administrator role required.</div>
      </div>
    );
  }

  return (
    <div className="tickets-page admin-all-tickets">
      <div className="tickets-heading">
        <div>
          <h2>Admin - All Tickets</h2>
          <p className="tickets-subtitle">
            Full queue oversight with assignment controls and quick access to every ticket.
          </p>
        </div>
        <div className="heading-actions">
          <span className="result-count">{filteredTickets.length} showing</span>
          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={ticketsLoading || agentsLoading}
          >
            {ticketsLoading || agentsLoading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`banner ${feedback.type === "error" ? "banner-error" : "banner-success"}`}>
          {feedback.message}
        </div>
      )}

      <div className="filters-bar">
        <div className="search-field">
          <input
            type="search"
            placeholder="Search by title, requester, department, or ID"
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
            Priority
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">All</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {formatPriorityLabel(priority)}
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
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </label>
        </div>
      </div>

      {ticketsLoading ? (
        <div className="tickets-loading">Loading tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="tickets-empty">No tickets match the selected filters.</div>
      ) : (
        <div className="tickets-table-wrapper">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Client</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignment</th>
                <th>Product</th>
                <th>Department</th>
                <th>Updated</th>
                <th>Created</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <div className="ticket-title">{ticket.title || "Untitled"}</div>
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
                  <td>
                    <span className={priorityClassName(ticket.priority)}>
                      {formatPriorityLabel(ticket.priority)}
                    </span>
                  </td>
                  <td>
                    {ticket.assigned_agent_name ? (
                      ticket.assigned_agent_name
                    ) : (
                      <span className="text-muted">Unassigned</span>
                    )}
                  </td>
                  <td>{ticket.product || <span className="text-muted">-</span>}</td>
                  <td>{ticket.department || <span className="text-muted">-</span>}</td>
                  <td>{formatDateTime(ticket.updated_at || ticket.created_at)}</td>
                  <td>{formatDateTime(ticket.created_at)}</td>
                  <td className="actions-column">
                    <div className="admin-action-group">
                      <div className="assign-controls">
                        <select
                          className="assign-select"
                          value={resolveSelectValue(ticket)}
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
                          disabled={assigningId === ticket.id || agentsLoading}
                        >
                          {assigningId === ticket.id ? "Assigning..." : "Assign"}
                        </button>
                      </div>
                      <button
                        className="admin-btn admin-btn--view"
                        onClick={() => handleOpenTicket(ticket.id)}
                      >
                        View
                      </button>
                      <button
                        className="admin-btn admin-btn--danger"
                        onClick={() => handleDelete(ticket.id)}
                        disabled={deletingId === ticket.id}
                      >
                        {deletingId === ticket.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
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

export default AdminAllTickets;
