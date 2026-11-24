
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES, ROLE_LABELS } from "../../config/roles";

export default function Login() {
  const [role, setRole] = useState(ROLES.ADMIN);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleContinue = () => {
    login(role);
    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Salesforce CRM</h1>
        <p>Composable CRM Management</p>

        <label>Select User Role</label>

        <select
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {Object.values(ROLES).map(item => (
            <option key={item} value={item}>
              {ROLE_LABELS[item]}
            </option>
          ))}
        </select>

        <button onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
