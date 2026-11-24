
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div>
        <span className="header-label">CRM Workspace</span>
      </div>

      <div className="header-user">
        <div className="user-avatar">
          {user?.name?.charAt(0)}
        </div>

        <div className="user-details">
          <strong>{user?.name}</strong>
          <span>Active session</span>
        </div>

        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
