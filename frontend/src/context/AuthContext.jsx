import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

// Helper to safely use localStorage (may be unavailable in some environments)
const getStorageItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`Failed to read localStorage.${key}:`, err);
    return null;
  }
};

const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`Failed to write localStorage.${key}:`, err);
  }
};

const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to remove localStorage.${key}:`, err);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore user from localStorage if it exists
  useEffect(() => {
    console.log("🔄 AuthContext: Attempting to restore session from localStorage...");
    try {
      const storedUser = getStorageItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("✅ AuthContext: User restored from localStorage:", userData);
      } else {
        console.log("ℹ️ AuthContext: No stored user found in localStorage");
      }
    } catch (err) {
      console.error("❌ AuthContext: Failed to restore user from localStorage:", err);
      removeStorageItem("user");
    } finally {
      setIsLoading(false);
      console.log("✅ AuthContext: Auth initialization complete");
    }
  }, []);

  // Real login: expects the backend user object
  const login = (userData) => {
    if (userData && typeof userData === "object") {
      setUser(userData);
      setStorageItem("user", JSON.stringify(userData));
      console.log("✅ AuthContext: User logged in and stored:", userData);
    } else {
      console.error("❌ AuthContext: Invalid userData passed to login:", userData);
    }
  };

  const logout = () => {
    setUser(null);
    removeStorageItem("user");
    console.log("✅ AuthContext: User logged out and cleared from localStorage");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
