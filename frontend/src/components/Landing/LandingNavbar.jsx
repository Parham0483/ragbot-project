import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './LandingNavbar.module.css';

export default function LandingNavbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <Link to="/" className={styles.brand}>
        <img src="/cs-logo.png" alt="Smart Chat" className={styles.logo} />
        <span className={styles.brandName}>Smart Chat</span>
      </Link>

      <div className={styles.links}>
        <Link to="/" className={styles.link}>Home</Link>
        <Link to="/pricing" className={styles.link}>Pricing</Link>
        <Link to="/contact" className={styles.link}>Contact</Link>
      </div>

      <div className={styles.actions}>
        {user ? (
          <Link to="/dashboard" className={styles.loginBtn}>Dashboard</Link>
        ) : (
          <>
            <Link to="/register" className={styles.signup}>Sign up</Link>
            <Link to="/login" className={styles.loginBtn}>Login</Link>
          </>
        )}
      </div>
    </nav>
  );
}
