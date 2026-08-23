import {
  createContext,
  useContext,
  useState,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // =====================================================
  // RESTORE USER FROM LOCAL STORAGE
  // =====================================================

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem("roxiler_user");

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch (error) {
      console.error(
        "Failed to restore user:",
        error
      );

      localStorage.removeItem("roxiler_user");
      localStorage.removeItem("roxiler_token");

      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("roxiler_token");
  });

  // =====================================================
  // LOGIN
  // =====================================================

  const login = (userData, userToken) => {
    localStorage.setItem(
      "roxiler_token",
      userToken
    );

    localStorage.setItem(
      "roxiler_user",
      JSON.stringify(userData)
    );

    setToken(userToken);
    setUser(userData);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    localStorage.removeItem("roxiler_token");
    localStorage.removeItem("roxiler_user");

    setToken(null);
    setUser(null);
  };

  // =====================================================
  // AUTH STATE
  // =====================================================

  const isAuthenticated =
    !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// useAuth
// =====================================================

export function useAuth() {
  return useContext(AuthContext);
}