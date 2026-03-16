import React, { useState } from 'react';
import { useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconButton, Collapse, Avatar } from '@mui/material';
import {
  Science, Bolt, BarChart, CompareArrows, Settings,
  ChevronLeft, ChevronRight, ExpandMore, ExpandLess,
} from '@mui/icons-material';
import styles from './AgentLayout.module.css';

const NAV_ITEMS = [
  { label: 'Actions',   Icon: Bolt,           tab: 'actions'   },
  { label: 'Analytics', Icon: BarChart,        tab: 'analytics' },
  { label: 'Compare',   Icon: CompareArrows,   tab: 'compare'   },
];

const CONFIG_SUBS = [
  { label: 'General',    path: 'config/general'    },
  { label: 'UI Setting', path: 'config/ui-setting' },
  { label: 'AI Models',  path: 'config/ai-models'  },
];

export default function AgentLayout() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const base = `/chatbot/${id}`;
  const onConfig = location.pathname.includes('/config');
  const [collapsed, setCollapsed] = useState(false);
  const [configOpen, setConfigOpen] = useState(onConfig);

  const isActive = (tab) =>
    location.pathname === `${base}/${tab}` ||
    location.pathname.startsWith(`${base}/${tab}/`);

  const isPlayground = () =>
    location.pathname === base || location.pathname === `${base}/playground`;

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
          <button className={styles.upgradeBtn}>Upgrade</button>
        </div>
        <div className={styles.navbarRight}>
          <span className={styles.userName}>{displayName}</span>
          <Avatar src={user?.gravatar_url} alt={displayName} sx={{ width: 32, height: 32 }} />
        </div>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* Agent Sidebar */}
        <nav className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.navList}>

            {/* Playground */}
            <div
              onClick={() => navigate(`${base}/playground`)}
              className={`${styles.navItem} ${isPlayground() ? styles.navItemActive : ''}`}
            >
              <Science className={styles.navItemIcon} />
              <span>Playground</span>
            </div>

            {NAV_ITEMS.map(({ label, Icon, tab }) => (
              <div
                key={tab}
                onClick={() => navigate(`${base}/${tab}`)}
                className={`${styles.navItem} ${isActive(tab) ? styles.navItemActive : ''}`}
              >
                <Icon className={styles.navItemIcon} />
                <span>{label}</span>
              </div>
            ))}

            {/* Config — expandable */}
            <div
              className={`${styles.configRow} ${onConfig ? styles.navItemActive : ''}`}
              onClick={() => setConfigOpen(v => !v)}
            >
              <Settings className={styles.navItemIcon} />
              <span className={styles.configLabel}>Config</span>
              {configOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
            </div>
            <Collapse in={configOpen}>
              {CONFIG_SUBS.map(({ label, path }) => (
                <div
                  key={path}
                  onClick={() => navigate(`${base}/${path}`)}
                  className={`${styles.subItem} ${location.pathname === `${base}/${path}` ? styles.subItemActive : ''}`}
                >
                  <span className={styles.dot} />
                  {label}
                </div>
              ))}
            </Collapse>
          </div>

          <div className={styles.collapseBtn}>
            <IconButton size="small" onClick={() => setCollapsed(true)}>
              <ChevronLeft sx={{ fontSize: 18, color: '#888' }} />
            </IconButton>
          </div>
        </nav>

        {collapsed && (
          <button className={styles.expandBtn} onClick={() => setCollapsed(false)}>
            <ChevronRight sx={{ fontSize: 18, color: '#888' }} />
          </button>
        )}

        {/* Tab content via nested routes */}
        <main className={styles.content}>
          <Outlet />
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
