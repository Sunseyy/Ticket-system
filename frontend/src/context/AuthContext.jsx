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

<<<<<<< Updated upstream
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
=======
  // Restore session on mount
  useEffect(() => {
    console.log("🔄 AuthContext: Initializing...");
    const storedUser = getStorageItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("✅ AuthContext: User restored from localStorage");
      } catch (err) {
        console.error("❌ AuthContext: Failed to parse stored user:", err);
        removeStorageItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  // Listen for storage changes from other tabs to prevent concurrent logins
  useEffect(() => {
    const handleStorageChange = (e) => {
      console.log("🔄 AuthContext: Storage change detected from another tab");
      
      if (e.key === "user") {
        // Another tab logged in or out
        if (e.newValue) {
          // Another tab logged in - log out current tab to prevent concurrent logins
          try {
            const newUser = JSON.parse(e.newValue);
            console.warn("⚠️  AuthContext: Another tab logged in. Logging out current session.");
            setUser(null);
            removeStorageItem("user");
          } catch (err) {
            console.error("Failed to parse user from storage event:", err);
          }
        } else {
          // Another tab logged out
          console.log("✅ AuthContext: Another tab logged out. Clearing session.");
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
>>>>>>> Stashed changes
  }, []);

  const login = (userData) => {
    if (userData && typeof userData === "object") {
<<<<<<< Updated upstream
      setUser(userData);
      setStorageItem("user", JSON.stringify(userData));
      console.log("✅ AuthContext: User logged in and stored:", userData);
    } else {
      console.error("❌ AuthContext: Invalid userData passed to login:", userData);
=======
      // Clear any existing session first
      setUser(null);
      removeStorageItem("user");
      
      // Set new session
      setTimeout(() => {
        setUser(userData);
        setStorageItem("user", JSON.stringify(userData));
        console.log("✅ AuthContext: User logged in:", userData.email);
      }, 0);
    } else {
      console.error("❌ AuthContext: Invalid userData:", userData);
>>>>>>> Stashed changes
    }
  };

  const logout = () => {
    setUser(null);
    removeStorageItem("user");
<<<<<<< Updated upstream
    console.log("✅ AuthContext: User logged out and cleared from localStorage");
=======
    console.log("✅ AuthContext: User logged out");
>>>>>>> Stashed changes
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
