import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import LandingNavbar from '../Landing/LandingNavbar';
import WebsiteChat from './WebsiteChat';
import styles from './Register.module.css';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      // Derive username from email prefix
      const username = formData.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      await register({
        email: formData.email,
        username,
        first_name: '',
        last_name: '',
        password: formData.password,
        password_confirm: formData.password_confirm,
      });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data || {};
      setError(
        data.email?.[0] ||
        data.password?.[0] ||
        data.username?.[0] ||
        data.non_field_errors?.[0] ||
        'Registration failed. Please check all fields.'
      );
    } finally {
      setLoading(false);
    }
  };

  const googleSignup = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setError('');
      setGoogleLoading(true);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.error || 'Google sign-up failed. Please try again.');
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-up was cancelled or failed.');
      setGoogleLoading(false);
    },
  });

  return (
    <div className={styles.page}>

      <LandingNavbar />

      <main className={styles.main}>
        <h1 className={styles.heading}>Let's get you started</h1>
        <p className={styles.subheading}>create your account in seconds.</p>

        <div className={styles.card}>

          {/* left: sign-up form */}
          <div className={styles.left}>
            <span className={styles.watermark}>SIGNUP</span>

            <button
              type="button"
              className={styles.googleBtn}
              onClick={() => googleSignup()}
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
              {googleLoading ? 'Signing up…' : 'Sign up with Google'}
            </button>

            <hr className={styles.divider} />

            {success ? (
              <div className={styles.successAlert}>
                Account created! Check your email to verify your account before logging in.
                <br /><br />
                <Link to="/login" className={styles.loginLink}>Back to Login →</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className={styles.errorAlert}>{error}</div>}

                <label className={styles.fieldLabel} htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  className={`${styles.fieldInput}${error ? ' ' + styles.error : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />

                <label className={styles.fieldLabel} htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  className={styles.fieldInput}
                  type="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />

                <label className={styles.fieldLabel} htmlFor="password_confirm">Confirm Password</label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  className={styles.fieldInput}
                  type="password"
                  placeholder="••••••••"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading || googleLoading}
                >
                  {loading ? 'Creating account…' : 'Sign up'}
                </button>

                <p className={styles.loginPrompt}>
                  Already have an account?
                  <Link to="/login" className={styles.loginLink}>Log in</Link>
                </p>
              </form>
            )}
          </div>

          {/* right: dotted purple panel + chat */}
          <div className={styles.right}>
            <Link to="/login" className={styles.loginBtn}>Login</Link>
            <div className={styles.chatBox}>
              <WebsiteChat />
            </div>
          </div>

        </div>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Smart Chat</span>
        <span className={styles.footerCopy}>© 2025 All rights reserved.</span>
      </footer>

    </div>
  );
}
