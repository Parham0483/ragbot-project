import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconButton, Collapse } from '@mui/material';
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
  const [settingOpen, setSettingOpen] = useState(false);

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
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <div className={styles.layout}>

      {/* ── Navbar ── */}
      <header className={styles.navbar}>
        <div className={styles.navbarLeft}>
          <img src="/cs-logo.png" alt="SmartChat" className={styles.logo} />
          <span className={styles.planLabel}>
            {user?.plan === 'pro' ? 'Pro Plan' : 'Free plan'}
          </span>
          <button className={styles.upgradeBtn}>Upgrade</button>
        </div>

        <div className={styles.navbarRight}>
          <span className={styles.userName}>{displayName}</span>
          <div className={styles.avatar}>{avatarLetter}</div>
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
            <div className={styles.settingRow} onClick={() => setSettingOpen(v => !v)}>
              <Settings className={styles.navItemIcon} />
              <span className={styles.settingLabel}>Setting</span>
              {settingOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
            </div>
            <Collapse in={settingOpen}>
              {['General', 'Plans', 'API Keys'].map(sub => (
                <div key={sub} className={styles.subItem}>{sub}</div>
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
