import { useCallback, useEffect, useState } from "react";

import {
  Users,
  Building2,
  Contact,
  Target,
  Headset,
  ListChecks,
  RefreshCw
} from "lucide-react";

import Sidebar from "../layout/Sidebar";
import CRMPage from "../crm/CRMPage";

import { NAVIGATION } from "../../config/navigation";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import { crmService } from "../../services/crmService";

const MODULES = [
  {
    id: "leads",
    label: "Total Leads",
    icon: Users,
    color: "blue"
  },
  {
    id: "accounts",
    label: "Total Accounts",
    icon: Building2,
    color: "purple"
  },
  {
    id: "contacts",
    label: "Total Contacts",
    icon: Contact,
    color: "green"
  },
  {
    id: "opportunities",
    label: "Total Opportunities",
    icon: Target,
    color: "cyan"
  },
  {
    id: "cases",
    label: "Total Cases",
    icon: Headset,
    color: "orange"
  },
  {
    id: "tasks",
    label: "Total Tasks",
    icon: ListChecks,
    color: "red"
  }
];

// Reusable statistics card
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick
}) {
  return (
    <button
      type="button"
      className="overview-stat-card overview-clickable"
      onClick={onClick}
    >
      <div className={`overview-icon ${color}`}>
        <Icon size={24} />
      </div>

      <div className="overview-stat-content">
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </button>
  );
}

// Dashboard overview
function DashboardOverview({ onSelect }) {
  const { user } = useAuth();
  const { canView } = usePermissions();

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrors({});
    setData({});

    const allowedModules = MODULES.filter(
      module => canView(module.id)
    );

    const results = await Promise.allSettled(
      allowedModules.map(module =>
        crmService.getAll(module.id)
      )
    );

    const dashboardData = {};
    const dashboardErrors = {};

    results.forEach((result, index) => {
      const moduleId = allowedModules[index].id;

      if (
        result.status === "fulfilled" &&
        Array.isArray(result.value)
      ) {
        dashboardData[moduleId] = result.value;
      } else {
        dashboardErrors[moduleId] =
          result.reason?.message ||
          "Unable to load records";
      }
    });

    setData(dashboardData);
    setErrors(dashboardErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, [canView]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <section className="crm-dashboard">

      {/* Dashboard heading */}
      <div className="overview-header">
        <div>
          <h1>CRM Dashboard</h1>
          <p>Overview of your CRM workspace</p>
        </div>

        <button
          type="button"
          className="overview-refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Welcome section */}
      <div className="overview-welcome">
        <div>
          <h2>Welcome, {user?.name || "User"}</h2>

          <p>
            Here is an overview of your CRM workspace.
          </p>
        </div>

        <span className="overview-role">
          {user?.roleLabel || user?.role}
        </span>
      </div>

      {loading ? (
        <div className="overview-message">
          Loading dashboard statistics...
        </div>
      ) : (
        <>
          {/* API errors */}
          {Object.keys(errors).length > 0 && (
            <div className="overview-error">
              <strong>
                Some dashboard records could not be loaded.
              </strong>

              {Object.entries(errors).map(
                ([object, message]) => (
                  <p key={object}>
                    {object}: {message}
                  </p>
                )
              )}
            </div>
          )}

          {/* CRM summary cards */}
          <h2 className="overview-section-title">
            CRM Overview
          </h2>

          <div className="overview-card-grid">
            {MODULES.filter(module =>
              canView(module.id)
            ).map(module => (
              <StatCard
                key={module.id}
                label={module.label}
                value={
                  Array.isArray(data[module.id])
                    ? data[module.id].length
                    : "Unavailable"
                }
                icon={module.icon}
                color={module.color}
                onClick={() => onSelect(module.id)}
              />
            ))}
          </div>

          {/* Last refreshed time */}
          {lastUpdated && (
            <p className="overview-last-updated">
              Last refreshed:{" "}
              {lastUpdated.toLocaleString()}
            </p>
          )}
        </>
      )}
    </section>
  );
}

// Main dashboard layout
export default function Dashboard() {
  const { canView } = usePermissions();
  const { user } = useAuth();

  const visibleItems = NAVIGATION.filter(
    item =>
      item.id === "dashboard" || canView(item.id)
  );

  const [selected, setSelected] = useState("dashboard");

  const visibleIds = visibleItems
    .map(item => item.id)
    .join(",");

  useEffect(() => {
    if (!visibleIds.split(",").includes(selected)) {
      setSelected("dashboard");
    }
  }, [selected, visibleIds]);

  return (
    <div className="dashboard-layout">
      <Sidebar
        selected={selected}
        onSelect={setSelected}
      />

      <div className="dashboard-main">
        {selected === "dashboard" ? (
          <DashboardOverview
            key={user?.id || user?.role}
            onSelect={setSelected}
          />
        ) : canView(selected) ? (
          <CRMPage
            key={selected}
            object={selected}
          />
        ) : (
          <div className="empty-state">
            No CRM modules are available for this role.
          </div>
        )}
      </div>
    </div>
  );
}