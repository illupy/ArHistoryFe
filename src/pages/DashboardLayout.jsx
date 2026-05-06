import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './DashboardLayout.css';

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <Header />
      <main className="dashboard-content">
        <div className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
