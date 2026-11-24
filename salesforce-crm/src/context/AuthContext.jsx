import {
  createContext,
  useContext,
  useState
} from "react";

import {
  ROLES,
  ROLE_LABELS
} from "../config/roles";

const AuthContext = createContext(null);

const ROLE_USERS = {
  [ROLES.ADMIN]: {
    id: "u1",
    name: "Morgan Admin",
    initials: "MA",
    color: "#7367e8"
  },

  [ROLES.SALES_REP]: {
    id: "u2",
    name: "Riya Sales",
    initials: "RS",
    color: "#1583bb"
  },

  [ROLES.SALES_MANAGER]: {
    id: "u3",
    name: "Daniel Manager",
    initials: "DM",
    color: "#b36e17"
  },

  [ROLES.SUPPORT_AGENT]: {
    id: "u4",
    name: "Sam Support",
    initials: "SS",
    color: "#15957e"
  }
};

function buildUser(role) {
  const selectedUser = ROLE_USERS[role];

  if (!selectedUser) return null;

  return {
    ...selectedUser,
    role,
    roleLabel: ROLE_LABELS[role]
  };
}

function getSavedUser() {
  try {
    const saved = localStorage.getItem("crmUser");

    if (!saved) return null;

    const user = JSON.parse(saved);

    return buildUser(user.role);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);

  const login = role => {
    if (!Object.values(ROLES).includes(role)) {
      return;
    }

    const selectedUser = buildUser(role);

    if (!selectedUser) return;

    localStorage.setItem(
      "crmUser",
      JSON.stringify(selectedUser)
    );

    setUser(selectedUser);
  };

  const logout = () => {
    localStorage.removeItem("crmUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}