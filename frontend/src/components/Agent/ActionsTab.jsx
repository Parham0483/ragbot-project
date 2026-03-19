import React from 'react';
import { Bolt } from '@mui/icons-material';
import styles from './PlaceholderTab.module.css';

export default function ActionsTab() {
  return (
    <div className={styles.page}>
      <Bolt className={styles.icon} />
      <h3 className={styles.heading}>Actions</h3>
      <p className={styles.sub}>Connect external tools and APIs to extend your agent's capabilities.</p>
      <span className={styles.badge}>Coming soon</span>
    </div>
  );
}
