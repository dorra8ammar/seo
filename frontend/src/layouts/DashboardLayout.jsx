import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ profile, onLogout, message, messageType, isLoading, kpis, onRefresh }) {
  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} onLogout={onLogout} />

      <main className="main-content">
        {message ? <p className={`message ${messageType}`}>{message}</p> : null}
        <Outlet context={{ profile, isLoading, kpis, onRefresh }} />
      </main>
    </div>
  );
}
