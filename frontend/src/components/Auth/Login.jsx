import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import LandingNavbar from '../Landing/LandingNavbar';
import styles from './Login.module.css';
import WebsiteChat from './WebsiteChat';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setError('');
      setGoogleLoading(true);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.error || 'Google login failed. Please try again.');
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.');
      setGoogleLoading(false);
    },
  });

  return (
    <div className={styles.page}>

      <LandingNavbar />

      {/* Main */}
      <main className={styles.main}>
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Log in to access your RAGBot account.</p>

        <div className={styles.card}>

          {/* left: login form */}
          <div className={styles.left}>
            <span className={styles.watermark}>LOGIN</span>

            <button
              type="button"
              className={styles.googleBtn}
              onClick={() => googleLogin()}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <span className={styles.googleSpinner} />
              ) : (
                <svg className={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {googleLoading ? 'Signing in…' : 'Login with Google'}
            </button>

            <hr className={styles.divider} />

            <form onSubmit={handleSubmit}>
              {successMessage && <div className={styles.successAlert}>{successMessage}</div>}
              {error && <div className={styles.errorAlert}>{error}</div>}

              <label className={styles.fieldLabel} htmlFor="email">Email</label>
              <input
                id="email"
                className={`${styles.fieldInput}${error ? ' ' + styles.error : ''}`}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <label className={styles.fieldLabel} htmlFor="password">Password</label>
              <input
                id="password"
                className={`${styles.fieldInput}${error ? ' ' + styles.error : ''}`}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Link to="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>

              <button type="submit" className={styles.loginBtn} disabled={loading || googleLoading}>
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>
          </div>

          {/* right: chat preview + sign up */}
          <div className={styles.right}>
            <Link to="/register" className={styles.signupBtn}>Sign up</Link>
            <WebsiteChat />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Smart Chat</span>
        <span className={styles.footerCopy}>© 2025 All rights reserved.</span>
      </footer>

    </div>
  );
}

export default Login;
