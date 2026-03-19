import React from 'react';
import { CompareArrows } from '@mui/icons-material';
import styles from './PlaceholderTab.module.css';

export default function CompareTab() {
  return (
    <div className={styles.page}>
      <CompareArrows className={styles.icon} />
      <h3 className={styles.heading}>Compare AI Models</h3>
      <p className={styles.sub}>Run the same prompt across multiple models side by side to find the best fit.</p>
      <span className={styles.badge}>Coming soon</span>
    </div>
  );
}
