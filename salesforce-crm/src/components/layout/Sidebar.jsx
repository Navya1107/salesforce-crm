import { NAVIGATION } from "../../config/navigation";
import { usePermissions } from "../../hooks/usePermissions";

export default function Sidebar({ selected, onSelect }) {
  const { canView } = usePermissions();

  const visibleItems = NAVIGATION.filter(
    item => item.id === "dashboard" || canView(item.id)
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h3>Salesforce</h3>
        <span>CRM Workspace</span>
      </div>

      <p className="sidebar-label">WORKSPACE</p>

      <nav>
        {visibleItems.map(item => (
          <button
            key={item.id}
            className={selected === item.id ? "selected" : ""}
            onClick={() => onSelect(item.id)}
          >
            <span>{item.label}</span>
            <span>›</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}