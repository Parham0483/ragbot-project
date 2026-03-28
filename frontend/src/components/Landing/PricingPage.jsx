import React from 'react';
import { Link } from 'react-router-dom';
import LandingNavbar from './LandingNavbar';
import styles from './PricingPage.module.css';

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <LandingNavbar />

      <main className={styles.main}>
        <h1 className={styles.title}>
          Choose the Plan That Fits Your Needs: Free or Pro
        </h1>

        <div className={styles.cards}>

          {/* Free */}
          <div className={styles.card}>
            <ul className={styles.features}>
              <li>1 AI Agent</li>
              <li>500 Messages / month</li>
              <li>Only ChatGPT</li>
              <li>
                Basic Reports
                <span className={styles.sub}>(up to 3 months)</span>
              </li>
              <li>Only one action</li>
            </ul>
            <hr className={styles.divider} />
            <span className={styles.price}>Free</span>
            <Link to="/register" className={styles.btn}>Try Now</Link>
          </div>

          {/* Pro */}
          <div className={`${styles.card} ${styles.cardPro}`}>
            <ul className={styles.features}>
              <li>Up to 3 AI Agents</li>
              <li>Unlimited Messages</li>
              <li>Choose from 3 AI Models</li>
              <li>
                Advance Reports
                <span className={styles.sub}>(up to 1 year)</span>
              </li>
              <li>Up to 4 actions</li>
            </ul>
            <hr className={styles.divider} />
            <span className={styles.price}>£10 / month</span>
            <Link to="/checkout" className={styles.btn}>Upgrade</Link>
          </div>

        </div>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerCopy}>© 2025 All rights reserved.</span>
      </footer>
    </div>
  );
}
