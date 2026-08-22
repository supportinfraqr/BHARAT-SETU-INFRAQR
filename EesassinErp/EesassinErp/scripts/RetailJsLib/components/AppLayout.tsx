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
  const [idCardDataUrl, setIdCardDataUrl] = useState<string>('');
  const user = JSON.parse(localStorage.getItem('bss_user') || localStorage.getItem('bss_legacy_user') || '{}');
  // LoginType: 1=Admin/SA, 5=PE, 6=Contractor, 7=Worker
  const loginType = String(user.LoginType || user.role || '1');
  const isAdmin = loginType === '1';
  const isEmployer = loginType === '5';
  const isContractor = loginType === '2' || loginType === '6';
  const isWorker = loginType === '7';
  const displayName = user?.username || user?.UserName || user?.Name || 'User';

  useEffect(() => {
    api.post('/Dashboard/NavMenuList', {}).then((r) => setNav(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    loadQr();
  }, [userMenuOpen]);

  useEffect(() => {
    if (isWorker) loadQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQr = () => {
    api.get('/qr/qr/me/', { responseType: 'blob' }).then((r) => {
      const reader = new FileReader();
      reader.onloadend = () => setQrDataUrl(reader.result as string);
      reader.readAsDataURL(r.data);
    }).catch(() => setQrDataUrl(''));
  };

  const openIdCard = async () => {
    setQrModalOpen(true);
    setIdCardDataUrl('');
    try {
      const r = await api.get('/qr/qr/my-card/?fmt=png', { responseType: 'blob' });
      const reader = new FileReader();
      reader.onloadend = () => setIdCardDataUrl(reader.result as string);
      reader.readAsDataURL(r.data);
    } catch (e) {
      setIdCardDataUrl('');
    }
  };

  const printId = () => {
    if (!idCardDataUrl) return;
    // Use the already-authenticated card dataURL so the print window needs no token.
    const w = window.open('', '_blank', 'width=900,height=640');
    if (!w) return;
    w.document.write(
      `<html><head><title>My Identity Card</title></head>` +
      `<body style="margin:0;display:flex;justify-content:center;align-items:flex-start;background:#fff">` +
      `<img id="bss-card" src="${idCardDataUrl}" style="width:100%;max-width:780px;height:auto" ` +
      `onload="setTimeout(function(){ window.focus(); window.print(); }, 300);" />` +
      `</body></html>`,
    );
    w.document.close();
    w.focus();
  };

  const downloadPdf = async () => {
    try {
      const r = await api.get('/qr/qr/my-card/?fmt=pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'identity-card.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not download ID card. Please try again.');
    }
  };

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
            {isAdmin ? (
              <>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/workers" onClick={() => navigate('/qr/workers')}>
                  <i className="mdi mdi-chevron-right"></i> Workers
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/contractors" onClick={() => navigate('/qr/contractors')}>
                  <i className="mdi mdi-chevron-right"></i> Contractors
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/management/employers" onClick={() => navigate('/qr/management/employers')}>
                  <i className="mdi mdi-chevron-right"></i> Employers
                </a>
              </>
            ) : isEmployer ? (
              <>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/binding-requests" onClick={() => navigate('/qr/binding-requests')}>
                  <i className="mdi mdi-chevron-right"></i> Binding Requests
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/workers" onClick={() => navigate('/qr/workers')}>
                  <i className="mdi mdi-chevron-right"></i> My Workers
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/contractors" onClick={() => navigate('/qr/contractors')}>
                  <i className="mdi mdi-chevron-right"></i> My Contractors
                </a>
              </>
            ) : isContractor ? (
              <>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/workers" onClick={() => navigate('/qr/workers')}>
                  <i className="mdi mdi-chevron-right"></i> My Workers
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/binding-requests" onClick={() => navigate('/qr/binding-requests')}>
                  <i className="mdi mdi-chevron-right"></i> Binding Requests
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/my-employers" onClick={() => navigate('/qr/my-employers')}>
                  <i className="mdi mdi-chevron-right"></i> My Employers
                </a>
              </>
            ) : isWorker ? (
              <>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/binding-requests" onClick={() => navigate('/qr/binding-requests')}>
                  <i className="mdi mdi-chevron-right"></i> Binding Requests
                </a>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/my-contractor" onClick={() => navigate('/qr/my-contractor')}>
                  <i className="mdi mdi-chevron-right"></i> My Contractor
                </a>
              </>
            ) : (
              <>
                <a className="nav-submenu qr-mgmt-link" href="#/qr/workers" onClick={() => navigate('/qr/workers')}>
                  <i className="mdi mdi-chevron-right"></i> All Workers
                </a>
              </>
            )}
          </div>
          {isWorker && (
            <div className="sidebar-qr-block">
              <div className="nav-section-title">MY QR</div>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="My QR" className="sidebar-qr-img" />
              ) : (
                <div className="sidebar-qr-loading">Loading QR...</div>
              )}
            </div>
          )}
          {isAdmin && (
            <>
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
            </>
          )}
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
            <span className="avatar">{displayName?.[0]?.toUpperCase() || 'U'}</span>
            <span>{displayName}</span>
            <i className="fa fa-chevron-down nav-arrow" style={{ fontSize: 10, marginLeft: 4 }}></i>
          </div>
          {userMenuOpen && (
            <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="user-dropdown-header">
                <div className="avatar">{displayName?.[0]?.toUpperCase() || 'U'}</div>
                <div>
                  <div className="user-dropdown-name">{displayName}</div>
                  <div className="user-dropdown-role">{user?.role || user?.LoginType || ''}</div>
                </div>
              </div>
              <div className="user-dropdown-qr" onClick={() => openIdCard()} style={{ cursor: 'pointer' }}>
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
              <div className="qr-modal" style={{ width: 'min(820px, 96vw)', maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>
                <button className="qr-modal-close" onClick={() => setQrModalOpen(false)}>✕</button>
                <div className="qr-modal-title">My Identity Card</div>

                {idCardDataUrl ? (
                  <img src={idCardDataUrl} alt="Identity Card" style={{ width: '100%', maxWidth: 780, height: 'auto', borderRadius: 10, border: '1px solid #e5e9f0' }} />
                ) : (
                  <div className="user-qr-loading" style={{ padding: 24 }}>Loading ID card...</div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={printId} disabled={!idCardDataUrl}>
                    🖨 Print ID Card
                  </button>
                  <button className="btn-primary" onClick={downloadPdf} disabled={!idCardDataUrl}>
                    ⬇ Download PDF
                  </button>
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
