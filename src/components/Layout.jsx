import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Layers, Plus, Clock, AlertTriangle,
} from 'lucide-react'

export default function Layout() {
  return (
    <>
      <header className="app-header">
        <div className="app-logo">💊</div>
        <span className="app-name">Sequell</span>
        <span className="app-tagline">AI Supplement Tracker</span>
      </header>

      <main>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>

        <NavLink to="/stack" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Layers size={20} />
          My Stack
        </NavLink>

        <NavLink to="/add" className={({ isActive }) => `nav-add${isActive ? ' active' : ''}`}>
          <div className="nav-add-circle">
            <Plus size={22} color="white" strokeWidth={2.5} />
          </div>
          Add
        </NavLink>

        <NavLink to="/schedule" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Clock size={20} />
          Schedule
        </NavLink>

        <NavLink to="/gaps" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <AlertTriangle size={20} />
          Gaps
        </NavLink>
      </nav>
    </>
  )
}
