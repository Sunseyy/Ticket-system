import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import CreateTicket from "./pages/tickets/CreateTicket";
import AgentTickets from "./pages/dashboard/tickets/AgentTickets";
import ClientTickets from "./pages/dashboard/ClientTickets";
import TicketDetails from "./pages/tickets/TicketDetails";
import ManageUsers from "./pages/dashboard/admin/ManageUsers";
import ManageCompanies from "./pages/dashboard/admin/ManageCompanies";
import ManageProducts from "./pages/dashboard/admin/ManageProducts";
import AdminAllTickets from "./pages/dashboard/admin/AdminAllTickets";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route path="client" element={<ClientTickets />} />
          <Route path="tickets" element={<AgentTickets />} />
          <Route path="tickets/:ticketId" element={<TicketDetails />} />
          <Route path="admin/users" element={<ManageUsers />} />
          <Route path="admin/manage-users" element={<ManageUsers />} />
          <Route path="admin/manage-products" element={<ManageProducts />} />
          <Route path="admin/all-tickets" element={<AdminAllTickets />} />
          <Route path="admin/manage-companies" element={<ManageCompanies />} />
        </Route>

        {/* Protected create ticket route */}
        <Route
          path="/create-ticket"
          element={
            <ProtectedRoute>
              <CreateTicket />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
