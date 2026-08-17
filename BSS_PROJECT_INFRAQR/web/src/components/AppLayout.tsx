import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import '../pages/Dashboard.css';

interface SubMenu { SubMenuId: string; SubMenuName: string; SubMenuUrl: string; }
interface Menu { MenuId: string; MenuName: string; submenu: SubMenu[]; }
interface Module { ModuleId: string; ModuleName: string; ModuleIcon: string; menu: Menu[]; }

export default function AppLayout({ title, children }: { title?: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const [nav, setNav] = useState<Module[]>([]);
  const [openModule, setOpenModule] = useState<number>(0);
  const [openMenu, setOpenMenu] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  // LoginType: 1=Admin/SA, 5=PE, 6=Contractor, 7=Worker
  const loginType = String(user.LoginType || user.role || '1');
  const isAdmin = loginType === '1';
  const isEmployer = loginType === '5';

  useEffect(() => {
    api.post('/Dashboard/NavMenuList', {}).then((r) => setNav(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    api.get('/qr/qr/me/', { responseType: 'blob' }).then((r) => {
      const reader = new FileReader();
      reader.onloadend = () => setQrDataUrl(reader.result as string);
      reader.readAsDataURL(r.data);
    }).catch(() => setQrDataUrl(''));
  }, [userMenuOpen]);

  const logout = () => {
    localStorage.removeItem('bss_token');
    localStorage.removeItem('bss_user');
    localStorage.removeItem('bss_legacy_login');
    localStorage.removeItem('bss_legacy_user');
    navigate('/');
  };

  return (
    <div className="app-shell" onClick={() => userMenuOpen && setUserMenuOpen(false)}>
      <div className={`mobile-overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)}></div>
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src="/legacy/NewLogin/images/bharatshramsetu-logo.png" alt="" className="sidebar-logo" />
          <span>BharatShramSetu</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-title">QR MANAGEMENT SYSTEM</div>
          <div className="nav-module">
            <a className="nav-submenu qr-mgmt-link" href="#/qr/scan" onClick={() => navigate('/qr/scan')}>
              <i className="mdi mdi-chevron-right"></i> QR Scan
            </a>
            <a className="nav-submenu qr-mgmt-link" href="#/qr/binding" onClick={() => navigate('/qr/binding')}>
              <i className="mdi mdi-chevron-right"></i> Worker Binding
            </a>
            {isEmployer && (
              <a className="nav-submenu qr-mgmt-link" href="#/qr/binding-requests" onClick={() => navigate('/qr/binding-requests')}>
                <i className="mdi mdi-chevron-right"></i> Binding Requests
              </a>
            )}
            <a className="nav-submenu qr-mgmt-link" href="#/qr/workers" onClick={() => navigate('/qr/workers')}>
              <i className="mdi mdi-chevron-right"></i> All Workers
            </a>
            {isAdmin && (
              <>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/contractors" onClick={() => navigate('/qr/contractors')}>
                  <i className="mdi mdi-chevron-right"></i> All Contractors
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/management/employers" onClick={() => navigate('/qr/management/employers')}>
                  <i className="mdi mdi-chevron-right"></i> Employers
                </a>
              </>
            )}
            {isEmployer && (
              <a className="nav-submenu qr-mgmt-link" href="#/qr/contractors" onClick={() => navigate('/qr/contractors')}>
                <i className="mdi mdi-chevron-right"></i> My Contractors
              </a>
            )}
          </div>
          <div className="nav-section-title">LEGACY MODULES</div>
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
            <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">☰</button>
            <h1>{title || 'Dashboard'}</h1>
          </div>
          <div className="topbar-user" onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}>
            <span className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            <span>{user?.username || 'User'}</span>
            <i className="fa fa-chevron-down nav-arrow" style={{ fontSize: 10, marginLeft: 4 }}></i>
          </div>
          {userMenuOpen && (
            <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="user-dropdown-header">
                <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
                <div>
                  <div className="user-dropdown-name">{user?.username || 'User'}</div>
                  <div className="user-dropdown-role">{user?.role || user?.LoginType || ''}</div>
                </div>
              </div>
              <div className="user-dropdown-qr" onClick={() => setQrModalOpen(true)} style={{ cursor: 'pointer' }}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="My QR" className="user-qr-img" />
                ) : (
                  <div className="user-qr-loading">Loading QR...</div>
                )}
                <div className="user-dropdown-qr-label">View My ID →</div>
              </div>
              <button className="user-dropdown-item" onClick={() => navigate('/qr/my-profile')}>
                <i className="fa fa-user"></i> My Profile
              </button>
              <button className="user-dropdown-item logout" onClick={logout}>
                <i className="fa fa-sign-out-alt"></i> Logout
              </button>
            </div>
          )}

          {qrModalOpen && (
            <div className="qr-modal-overlay" onClick={() => setQrModalOpen(false)}>
              <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
                <button className="qr-modal-close" onClick={() => setQrModalOpen(false)}>✕</button>
                <div className="qr-modal-title">My Identity Card</div>
                <div className="qr-modal-brand">
                  <img src="/legacy/NewLogin/images/bharatshramsetu-logo.png" alt="" className="qr-modal-logo" />
                  <span>BharatShramSetu</span>
                </div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="My QR" className="qr-modal-img" />
                ) : (
                  <div className="user-qr-loading">Loading QR...</div>
                )}
                <div className="qr-modal-info">
                  <div><b>User:</b> {user?.username || '—'}</div>
                  <div><b>Role:</b> {user?.role || user?.LoginType || '—'}</div>
                  <div><b>Email:</b> {user?.email || user?.EmailId || '—'}</div>
                </div>
              </div>
            </div>
          )}
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
