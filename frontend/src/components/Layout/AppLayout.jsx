import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconButton, Collapse, Avatar } from '@mui/material';
import {
  SmartToy, BarChart, Settings,
  ChevronLeft, ChevronRight, ExpandMore, ExpandLess,
} from '@mui/icons-material';
import styles from './AppLayout.module.css';

const NAV = [
  { label: 'Agents',    Icon: SmartToy, path: '/dashboard' },
  { label: 'Analytics', Icon: BarChart,  path: '/analytics' },
];

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed]     = useState(false);
  const onSettingsPath = location.pathname.startsWith('/settings');
  const [settingOpen, setSettingOpen] = useState(onSettingsPath);

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
        || location.pathname === '/create-chatbot'
        || location.pathname.startsWith('/chatbot')
        || location.pathname.startsWith('/chat/');
    }
    return location.pathname === path;
  };

  const displayName = user?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className={styles.layout}>

      {/* ── Navbar ── */}
      <header className={styles.navbar}>
        <div className={styles.navbarLeft}>
          <img src="/cs-logo.png" alt="SmartChat" className={styles.logo} />
          <span className={styles.planLabel}>
            {user?.plan === 'pro' ? 'Pro Plan' : 'Free plan'}
          </span>
          <button className={styles.upgradeBtn} onClick={() => navigate('/settings/plans')}>Upgrade</button>
        </div>

        <div className={styles.navbarRight}>
          <span className={styles.userName}>{displayName}</span>
          <Avatar src={user?.gravatar_url} alt={displayName} sx={{ width: 32, height: 32 }} />
        </div>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* Sidebar */}
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

            {/* Setting — expandable */}
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

          {/* Collapse `<` */}
          <div className={styles.collapseBtn}>
            <IconButton size="small" onClick={() => setCollapsed(true)}>
              <ChevronLeft sx={{ fontSize: 18, color: '#888' }} />
            </IconButton>
          </div>
        </nav>

        {/* Re-expand when collapsed */}
        {collapsed && (
          <button className={styles.expandBtn} onClick={() => setCollapsed(false)}>
            <ChevronRight sx={{ fontSize: 18, color: '#888' }} />
          </button>
        )}

        {/* Main content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={`${styles.footerBrand} ${collapsed ? styles.footerBrandCollapsed : ''}`}>
          Smart Chat
        </div>
        <span className={styles.footerCopy}>© 2025 All rights reserved.</span>
      </footer>

    </div>
  );
}
