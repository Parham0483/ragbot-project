import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './PlansSettings.module.css';

// what the pro plan includes
const PRO_FEATURES = [
  'Up to 3 AI Agents',
  'Unlimited Messages',
  'Choose from 3 AI Models',
  'Advance Reports (up to 1 year)',
  'Up to 4 Actions',
];

export default function PlansSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise';

  // "remove branding" toggle — UI only for now
  const [brandingEnabled, setBrandingEnabled] = useState(isPro);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Plans</h1>

      {/* Pro plan card */}
      <div className={`${styles.card} ${isPro ? styles.cardActive : ''}`}>
        {isPro && <span className={styles.currentBadge}>Current Plan</span>}

        <ul className={styles.featureList}>
          {PRO_FEATURES.map(f => (
            <li key={f} className={styles.featureItem}>
              <span className={styles.featureDot} />
              {f}
            </li>
          ))}
        </ul>

        <div className={styles.price}>10$ / month</div>

        {isPro ? (
          <button className={styles.currentBtn} disabled>Current Plan</button>
        ) : (
          <button className={styles.upgradeBtn} onClick={() => navigate('/checkout')}>
            Upgrade
          </button>
        )}
      </div>

      {/* Remove branding add-on */}
      <div className={styles.addonCard}>
        <div className={styles.addonInfo}>
          <h2 className={styles.addonTitle}>Remove 'Powered By SmartChat'</h2>
          <p className={styles.addonPrice}>10$ / month</p>
        </div>
        <div className={styles.addonToggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={brandingEnabled}
              onChange={e => setBrandingEnabled(e.target.checked)}
              disabled={!isPro}
            />
            <span className={`${styles.toggleTrack} ${brandingEnabled ? styles.toggleTrackOn : ''}`}>
              <span className={styles.toggleThumb} />
            </span>
            <span className={styles.toggleText}>
              {brandingEnabled ? 'Enabled' : 'Enable'}
            </span>
          </label>
          {!isPro && (
            <span className={styles.addonHint}>Upgrade to Pro to enable this</span>
          )}
        </div>
      </div>
    </div>
  );
}
