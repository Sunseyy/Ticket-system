import { useAuth } from "../context/AuthContext";

export default function Topbar() {
  const { user, logout } = useAuth();

  const displayName = user?.full_name || user?.name || "User";

  return (
    <div className="topbar">
      <div className="topbar-left"></div>
      <div className="topbar-center">
        <h3>Welcome, {displayName}</h3>
      </div>
      <div className="topbar-right">
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}
