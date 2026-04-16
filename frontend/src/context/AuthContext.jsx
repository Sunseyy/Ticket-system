import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // On mount, restore user from localStorage if it exists
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("✅ User restored from localStorage:", userData);
      } catch (err) {
        console.error("Failed to restore user from localStorage:", err);
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Real login: expects the backend user object
  const login = (userData) => {
    if (userData && typeof userData === "object") {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ User stored in context and localStorage:", userData);
    } else {
      console.error("Invalid userData passed to login:", userData);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    console.log("✅ User logged out and cleared from localStorage");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
