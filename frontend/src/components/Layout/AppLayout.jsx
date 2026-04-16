import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconButton, Collapse, Avatar } from '@mui/material';
import {
  SmartToy, BarChart, Settings,
  ChevronLeft, ChevronRight, ExpandMore, ExpandLess,
  Person, Logout,
} from '@mui/icons-material';
import styles from './AppLayout.module.css';

const NAV = [
  { label: 'Agents',    Icon: SmartToy, path: '/dashboard' },
  { label: 'Analytics', Icon: BarChart,  path: '/analytics' },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed]     = useState(false);
  const onSettingsPath = location.pathname.startsWith('/settings');
  const [settingOpen, setSettingOpen] = useState(onSettingsPath);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
        || location.pathname === '/create-chatbot'
        || location.pathname.startsWith('/chatbot')
        || location.pathname.startsWith('/chat/');
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    setProfileOpen(false);
    navigate('/settings/general');
  };

  const displayName = user?.first_name || user?.email?.split('@')[0] || 'User';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || displayName;

  return (
    <div className={styles.layout}>

      {/* navbar */}
      <header className={styles.navbar}>
        <div className={styles.navbarLeft}>
          <img src="/cs-logo.png" alt="SmartChat" className={styles.logo} onClick={() => navigate('/dashboard')} />
          <span className={styles.planLabel}>
            {user?.plan === 'pro' ? 'Pro Plan' : 'Free plan'}
          </span>
          <button className={styles.upgradeBtn} onClick={() => navigate('/settings/plans')}>Upgrade</button>
        </div>

        {/* profile trigger + dropdown */}
        <div className={styles.profileWrap} ref={profileRef}>
          <button className={styles.profileTrigger} onClick={() => setProfileOpen(v => !v)}>
            <span className={styles.userName}>{displayName}</span>
            <Avatar src={user?.gravatar_url} alt={displayName} sx={{ width: 32, height: 32 }} />
          </button>

          {profileOpen && (
            <div className={styles.profileDropdown}>
              {/* header */}
              <div className={styles.dropdownHeader}>
                <Avatar src={user?.gravatar_url} alt={displayName} sx={{ width: 40, height: 40 }} />
                <div className={styles.dropdownUserInfo}>
                  <span className={styles.dropdownName}>{fullName}</span>
                  <span className={styles.dropdownEmail}>{user?.email}</span>
                </div>
              </div>

              <div className={styles.dropdownDivider} />

              <button className={styles.dropdownItem} onClick={handleEditProfile}>
                <Person sx={{ fontSize: 17 }} />
                Edit Profile
              </button>

              <div className={styles.dropdownDivider} />

              <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                <Logout sx={{ fontSize: 17 }} />
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* body */}
      <div className={styles.body}>

        {/* sidebar */}
        <nav className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.navList}>
            {NAV.map(({ label, Icon, path }) => (
              <div
                key={label}
                onClick={() => navigate(path)}
                className={`${styles.navItem} ${isActive(path) ? styles.navItemActive : ''}`}
              >
                <Icon className={styles.navItemIcon} />
                <span>{label}</span>
              </div>
            ))}

            {/* settings - expandable */}
            <div
              className={`${styles.settingRow} ${onSettingsPath ? styles.navItemActive : ''}`}
              onClick={() => setSettingOpen(v => !v)}
            >
              <Settings className={styles.navItemIcon} />
              <span className={styles.settingLabel}>Setting</span>
              {settingOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
            </div>
            <Collapse in={settingOpen}>
              {[
                { label: 'General',  path: '/settings/general'  },
                { label: 'Plans',    path: '/settings/plans'    },
                { label: 'API Keys', path: '/settings/api-keys' },
              ].map(({ label, path }) => (
                <div
                  key={label}
                  onClick={() => navigate(path)}
                  className={`${styles.subItem} ${location.pathname === path ? styles.subItemActive : ''}`}
                >
                  {label}
                </div>
              ))}
            </Collapse>
          </div>

          {/* collapse button */}
          <div className={styles.collapseBtn}>
            <IconButton size="small" onClick={() => setCollapsed(true)}>
              <ChevronLeft sx={{ fontSize: 18, color: '#888' }} />
            </IconButton>
          </div>
        </nav>

        {/* expand button when sidebar is hidden */}
        {collapsed && (
          <button className={styles.expandBtn} onClick={() => setCollapsed(false)}>
            <ChevronRight sx={{ fontSize: 18, color: '#888' }} />
          </button>
        )}

        {/* main content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>

      {/* footer */}
      <footer className={styles.footer}>
        <div className={`${styles.footerBrand} ${collapsed ? styles.footerBrandCollapsed : ''}`}>
          Smart Chat
        </div>
        <span className={styles.footerCopy}>© 2025 All rights reserved.</span>
      </footer>

    </div>
  );
}
