import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import "./TicketDetails.css";

function TicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  
  // NEW: Added attachments state
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [statusDraft, setStatusDraft] = useState("OPEN");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusFeedback, setStatusFeedback] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase?.().trim() === "ADMIN";
  const userRole = user?.role?.toUpperCase?.().trim();

  useEffect(() => {
    fetch(`http://localhost:5000/tickets/${ticketId}`)
      .then((res) => res.json())
      .then((data) => setTicket(data))
      .catch((err) => console.error(err));
  }, [ticketId]);

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  // UPDATED: Now expects { comments: [], attachments: [] }
  const fetchComments = async () => {
    try {
      const res = await fetch(`http://localhost:5000/tickets/${ticketId}/comments`);
      const data = await res.json();
      
      if (data.comments && Array.isArray(data.comments)) {
        setComments(
          data.comments.map((comment) => ({
            ...comment,
            content: comment.content || comment.text || comment.comment || "",
          }))
        );
      } else {
        setComments([]);
      }

      if (data.attachments && Array.isArray(data.attachments)) {
        setAttachments(data.attachments);
      } else {
        setAttachments([]);
      }

    } catch (err) {
      console.error(err);
      setComments([]);
      setAttachments([]);
    }
  };

  useEffect(() => {
    if (ticket?.status) {
      setStatusDraft(ticket.status.toUpperCase());
    }
  }, [ticket]);

  const isAssignedAgent =
    userRole === "AGENT" && ticket?.assigned_agent_id && Number(ticket.assigned_agent_id) === Number(user?.id);
  const isTicketOwner =
    userRole === "CLIENT" && ticket?.created_by && Number(ticket.created_by) === Number(user?.id);
  const canComment = Boolean(ticket) && ((userRole === "CLIENT" && isTicketOwner) || isAssignedAgent);
  const commentRestrictionMessage = (() => {
    if (!ticket) return "";
    if (userRole === "ADMIN") return "Admins cannot add comments.";
    if (userRole === "AGENT" && !isAssignedAgent) return "Only the assigned agent can comment on this ticket.";
    if (userRole === "CLIENT" && !isTicketOwner) return "Only the ticket owner can comment.";
    return "";
  })();

  const canUpdateStatus = Boolean(ticket) && (isAssignedAgent || userRole === "ADMIN");
  const statusOptions = [
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "WAITING_ON_CLIENT", label: "Waiting on Client" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
  ];

  // UPDATED: Handles both text comments and file uploads
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!ticket || !user?.id) return;
    if (!canComment) {
      setCommentError(commentRestrictionMessage || "You are not allowed to comment on this ticket.");
      return;
    }
    if (!newComment.trim() && !selectedFile) return; // Must have either text or a file

    setCommentSubmitting(true);
    setCommentError("");

    try {
      // 1. Upload text comment if it exists
      if (newComment.trim()) {
        const res = await fetch(`http://localhost:5000/tickets/${ticketId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            content: newComment,
          }),
        });
        if (!res.ok) throw new Error("Failed to add comment");
      }

      // 2. Upload file if it exists
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("userId", user?.id);

        const fileRes = await fetch(`http://localhost:5000/tickets/${ticketId}/attachments`, {
          method: "POST",
          body: formData, // No Content-Type header needed for FormData
        });
        if (!fileRes.ok) throw new Error("Failed to upload attachment");
      }

      // 3. Reset UI and refresh data
      setNewComment("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
      fetchComments();

    } catch (err) {
      console.error(err);
      setCommentError("Failed to add reply or upload file.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!ticket || !user?.id || !canUpdateStatus) return;

    setStatusSaving(true);
    setStatusError("");
    setStatusFeedback("");

    try {
      const res = await fetch(`http://localhost:5000/tickets/${ticket.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(user.id), status: statusDraft }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      const data = await res.json();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: data.status || statusDraft,
              updated_at: data.updated_at || prev.updated_at,
            }
          : prev
      );
      setStatusFeedback("Status updated successfully.");
      setTimeout(() => setStatusFeedback(""), 4000);
    } catch (err) {
      console.error("Status update error:", err);
      setStatusError(err.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket || !user?.id || userRole !== "ADMIN") return;
    const confirmed = window.confirm("Are you sure you want to delete this ticket?");
    if (!confirmed) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await fetch(`http://localhost:5000/tickets/${ticket.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(user.id) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete ticket");
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Delete ticket error:", err);
      setDeleteError(err.message || "Failed to delete ticket");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignToMe = async () => {
    try {
      const res = await fetch(`http://localhost:5000/tickets/${ticketId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: user.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to claim ticket");
      }

      const updatedTicket = await res.json();
      
      // Update the UI immediately to unlock the comment box and status dropdown
      setTicket((prev) => ({
        ...prev,
        assigned_agent_id: updatedTicket.assigned_agent_id,
        assigned_agent_name: user.full_name || user.name,
      }));
      
    } catch (err) {
      console.error("Assignment error:", err);
      alert("Could not assign ticket to you.");
    }
  };

  const formatStatusLabel = (value) => {
    if (!value || typeof value !== "string") return "Unknown";
    const normalized = value.toLowerCase().replace(/_/g, " ");
    return normalized.replace(/(^|\s)([a-z])/g, (match) => match.toUpperCase());
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return `${parsed.toLocaleDateString()} • ${parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const normalizeForClass = (value) => {
    if (!value || typeof value !== "string") return "unknown";
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  if (!ticket) {
    return (
      <div className="ticket-page ticket-loading">
        <div className="panel-card">Loading ticket…</div>
      </div>
    );
  }

  const statusLabel = formatStatusLabel(ticket.status);
  const statusClass = normalizeForClass(ticket.status);
  const priorityLabel = ticket.priority ? formatStatusLabel(ticket.priority) : null;
  const priorityClass = normalizeForClass(ticket.priority);
  const ticketCode =
    ticket.ticket_code ||
    ticket.reference ||
    (ticket.id ? `T-${String(ticket.id).padStart(4, "0")}` : "Ticket");

  const detailFields = [
    { label: "Priority", value: ticket.priority || "Not set" },
    { label: "Assigned To", value: ticket.assigned_agent_name || "Unassigned" },
    { label: "Reporter", value: ticket.created_by_name || "Unknown" },
    { label: "Status", value: statusLabel },
    { label: "Created", value: formatDateTime(ticket.created_at) },
    { label: "Urgency", value: ticket.urgency || "Not set" },
  ];

  return (
    <div className="ticket-page">
      <section className="ticket-main">
        <header className="ticket-header-card">
          <div className="ticket-header-text">
            <div className="ticket-header-top">
              <span className="ticket-code">{ticketCode}</span>
              <span className={`ticket-chip status ${statusClass}`}>{statusLabel}</span>
              {priorityLabel && (
                <span className={`ticket-chip priority ${priorityClass}`}>
                  {priorityLabel}
                </span>
              )}
            </div>
            <h1>{ticket.title}</h1>
            <p className="ticket-subtitle">
              Created {formatDateTime(ticket.created_at)} · {ticket.created_by_name || "Unknown reporter"}
            </p>
          </div>
          <div className="ticket-header-actions">
            <button type="button" className="ghost-button">Add to KB</button>
            <button type="button" className="ghost-button">Merge</button>
            {userRole === "ADMIN" && (
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteTicket}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            )}
            {userRole === "AGENT" && !isAssignedAgent && (
              <button 
                type="button" 
                className="primary-button" 
                onClick={handleAssignToMe}
              >
                Claim Ticket
              </button>
            )}
          </div>
        </header>

        {deleteError && <div className="ticket-error-banner compact">{deleteError}</div>}

        <section className="ticket-description-card">
          <h2>Summary</h2>
          <p>{ticket.description || "No description provided."}</p>
        </section>

        {canUpdateStatus && (
          <section className="status-control-card">
            <h2>Status</h2>
            <form onSubmit={handleStatusUpdate} className="status-control-form">
              <label className="status-control-label" htmlFor="ticket-status-select">
                Update ticket status
              </label>
              <select
                id="ticket-status-select"
                className="status-control-select"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                disabled={statusSaving}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="primary-button" disabled={statusSaving}>
                {statusSaving ? "Saving…" : "Save Status"}
              </button>
            </form>
            {statusError && <div className="ticket-error-banner compact">{statusError}</div>}
            {statusFeedback && <div className="ticket-success-banner compact">{statusFeedback}</div>}
          </section>
        )}

        {/* Attachments Display Section */}
        {attachments.length > 0 && (
          <section className="attachments-card">
            <h2>Attachments</h2>
            <div className="attachments-grid">
              {attachments.map((file) => {
                const isImage = file.content_type?.startsWith('image/');
                const fileUrl = `http://localhost:5000${file.file_path}`;
                return (
                  <div key={file.id} className="attachment-item">
                    {isImage ? (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="attachment-preview">
                        <img src={fileUrl} alt={file.file_name} />
                      </a>
                    ) : (
                      <div className="attachment-icon">
                        📄
                      </div>
                    )}
                    <div className="attachment-info">
                      <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="attachment-name"
                      >
                        {file.file_name}
                      </a>
                      <span className="attachment-size">
                        {Math.round(file.file_size / 1024)} KB
                      </span>
                    </div>
                    <a 
                      href={fileUrl} 
                      download={file.file_name}
                      className="attachment-download"
                      title="Download"
                    >
                      ⬇
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="comments-thread">
          <h2>Conversation</h2>
          {Array.isArray(comments) && comments.length > 0 ? (
            comments.map((c) => (
              <article key={c.id} className="comment-card">
                <header className="comment-header">
                  <span className="comment-author">
                    {c.author_name || c.author || c.authorName || "Unknown"}
                  </span>
                  <span className="comment-date">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                  </span>
                </header>
                <p className="comment-text">{c.content || c.text || c.comment || ""}</p>
              </article>
            ))
          ) : (
            <div className="empty-thread">No comments yet.</div>
          )}
        </section>

        <section className="reply-panel">
          <div className="reply-meta">Replying as {user?.full_name || user?.name || "Agent"}</div>

          {canComment ? (
            <form onSubmit={handleAddComment} className="comment-composer">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a reply..."
                disabled={commentSubmitting}
              />
              <div className="comment-toolbar">
                <div className="toolbar-buttons">
                  <label className="file-upload-btn">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      disabled={commentSubmitting}
                      className="file-input-hidden"
                    />
                    📎 Attach File
                  </label>
                  {selectedFile && (
                    <div className="selected-file-badge">
                      <span className="selected-file-name">{selectedFile.name}</span>
                      <button 
                        type="button" 
                        className="remove-file-btn"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div className="toolbar-actions">
                  <button type="submit" className="primary-button" disabled={commentSubmitting || (!newComment.trim() && !selectedFile)}>
                    {commentSubmitting ? "Sending…" : "Send Reply"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="composer-disabled">{commentRestrictionMessage}</div>
          )}

          {commentError && <div className="ticket-error-banner compact">{commentError}</div>}
        </section>
      </section>

      <aside className="ticket-side-panel">
        <div className="panel-card">
          <h3>Ticket Details</h3>
          <dl>
            {detailFields.map((field) => (
              <div key={field.label} className="panel-field">
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="panel-card">
          <h3>Tags</h3>
          <div className="tag-collection">
            <span className="tag-pill">Support</span>
            <span className="tag-pill">{statusLabel}</span>
            {priorityLabel && <span className="tag-pill">{priorityLabel}</span>}
          </div>
        </div>

        <div className="panel-card">
          <h3>History</h3>
          <ul className="history-list">
            <li>Created {formatDateTime(ticket.created_at)}</li>
            {comments.map((c) => (
              <li key={`history-${c.id}`}>
                Comment by {c.author_name || c.author || "User"}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default TicketDetails;