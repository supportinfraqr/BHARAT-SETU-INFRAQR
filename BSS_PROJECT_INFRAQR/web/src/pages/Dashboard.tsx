import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import './Dashboard.css';

interface SubMenu { SubMenuId: string; SubMenuName: string; SubMenuUrl: string; }
interface Menu { MenuId: string; MenuName: string; submenu: SubMenu[]; }
interface Module { ModuleId: string; ModuleName: string; ModuleIcon: string; menu: Menu[]; }

export default function Dashboard() {
  const navigate = useNavigate();
  const [nav, setNav] = useState<Module[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [openModule, setOpenModule] = useState<number>(0);
  const [openMenu, setOpenMenu] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('bss_user') || '{}');

  const load = useCallback(async () => {
    try {
      const [navRes, dashRes] = await Promise.all([
        api.post('/Dashboard/NavMenuList', {}),
        api.get('/qr/dashboard/'),
      ]);
      setNav(navRes.data || []);
      setStats(dashRes.data?.Data);
    } catch (e) {
      console.error('load failed', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const logout = () => {
    localStorage.removeItem('bss_token');
    localStorage.removeItem('bss_user');
    navigate('/');
  };

  return (
    <div className="app-shell">
      <div className={`mobile-overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/legacy/NewLogin/images/bharatshramsetu-logo.png" alt="" style={{ width: 34, height: 34 }} />
          <span>BharatShramSetu</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((mod, mi) => (
            <div key={mod.ModuleId} className="nav-module">
              <div
                className={`nav-module-head ${openModule === mi ? 'active' : ''}`}
                onClick={() => setOpenModule(openModule === mi ? -1 : mi)}
              >
                <i className={`${mod.ModuleIcon}`}></i>
                <span>{mod.ModuleName}</span>
                <i className="fa fa-chevron-down nav-arrow"></i>
              </div>
              {openModule === mi && mod.menu?.map((men, mei) => (
                <div key={men.MenuId} className="nav-menu">
                  <div
                    className={`nav-menu-head ${openMenu === mei ? 'active' : ''}`}
                    onClick={() => setOpenMenu(openMenu === mei ? -1 : mei)}
                  >
                    <span>{men.MenuName}</span>
                    <i className="fa fa-chevron-right nav-arrow"></i>
                  </div>
                  {openMenu === mei && men.submenu?.map((sub) => (
                    <a
                      key={sub.SubMenuId}
                      href={`#/module/${encodeURIComponent(sub.SubMenuUrl.replace(/^\//, ''))}`}
                      className="nav-submenu"
                      onClick={() => navigate(`/module/${encodeURIComponent(sub.SubMenuUrl.replace(/^\//, ''))}`)}
                    >
                      <i className="mdi mdi-chevron-right"></i>
                      {sub.SubMenuName}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
              ☰
            </button>
            <h1>Dashboard</h1>
          </div>
          <div className="topbar-user">
            <span className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            <span>{user?.username || 'User'}</span>
          </div>
        </header>

        <div className="content">
          <div className="qr-quick-row">
            <a href="#/qr/scan" className="qr-quick-card scan" onClick={() => navigate('/qr/scan')}>
              <span className="qr-quick-icon">▣</span>
              <div><h4>Scan Worker QR</h4><p>Geo-verified attendance</p></div>
            </a>
            <a href="#/qr/workers" className="qr-quick-card workers" onClick={() => navigate('/qr/workers')}>
              <span className="qr-quick-icon">👷</span>
              <div><h4>Workers</h4><p>Profiles & ID cards</p></div>
            </a>
          </div>

          <div className="stat-cards">
            <div className="stat-card" style={{ background: '#022B5E' }}>
              <h3>{stats?.total_workers ?? '—'}</h3>
              <p>Total Workers</p>
            </div>
            <div className="stat-card" style={{ background: '#148f77' }}>
              <h3>{stats?.total_scans ?? '—'}</h3>
              <p>Total Scans</p>
            </div>
            <div className="stat-card" style={{ background: '#b9770e' }}>
              <h3>{stats?.active_sites ?? '—'}</h3>
              <p>Active Sites</p>
            </div>
            <div className="stat-card" style={{ background: '#7d3c98' }}>
              <h3>{stats?.scan_activity?.today ?? '—'}</h3>
              <p>Scans Today</p>
            </div>
          </div>

          <div className="panel">
            <h2>Scan Activity</h2>
            <div className="activity-row">
              <div className="activity-item"><span>Today</span><b>{stats?.scan_activity?.today ?? 0}</b></div>
              <div className="activity-item"><span>This Week</span><b>{stats?.scan_activity?.this_week ?? 0}</b></div>
              <div className="activity-item"><span>This Month</span><b>{stats?.scan_activity?.this_month ?? 0}</b></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
