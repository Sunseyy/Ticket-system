import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  // Wait for auth restoration from localStorage
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8f9fa',
        flexDirection: 'column',
      }}>
        <div style={{ fontSize: '18px', color: '#333' }}>Loading...</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>Restoring session</div>
      </div>
    );
  }

  // Only redirect if we've verified there's no user
  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;
