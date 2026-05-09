import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";
import tndLogo from "../assets/TnD logo.png";

export default function Sidebar() {
  const { user } = useAuth();
  const [logoError, setLogoError] = useState(false);

  const clientLinks = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" },
    { name: "My Tickets", path: "/dashboard/client", icon: "📄" },
    { name: "Create Ticket", path: "/create-ticket", icon: "➕" },
  ];

  const agentLinks = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" },
    { name: "All Tickets", path: "/dashboard/tickets", icon: "📂" },
    { name: "Create Ticket", path: "/create-ticket", icon: "➕" },
  ];

  const adminLinks = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" },
    { name: "Manage Users", path: "/dashboard/admin/manage-users", icon: "👥" },
    { name: "Manage Products", path: "/dashboard/admin/manage-products", icon: "📦" },
    { name: "All Tickets", path: "/dashboard/admin/all-tickets", icon: "🎫" },
    { name: "Manage Companies", path: "/dashboard/admin/manage-companies", icon: "🏢" },
  ];

  const links =
    user.role === "CLIENT"
      ? clientLinks
      : user.role === "AGENT"
        ? agentLinks
        : adminLinks;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {!logoError && (
          <img
            src={tndLogo}
            alt="TnD Logo"
            className="sidebar-logo"
            onError={() => setLogoError(true)}
          />
        )}
        {logoError && (
          <div className="sidebar-logo-placeholder">T&D</div>
        )}
      </div>
      <ul className="sidebar-links">
        {links.map((link) => (
          <li key={link.path} className="sidebar-item">
            <Link to={link.path} className="sidebar-link">
              <span className="sidebar-icon">{link.icon}</span>
              <span className="sidebar-text">{link.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
