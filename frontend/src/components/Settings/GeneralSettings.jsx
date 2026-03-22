import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import styles from './GeneralSettings.module.css';

export default function GeneralSettings() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  // account info state
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [infoSaving,    setInfoSaving]    = useState(false);
  const [infoMsg,       setInfoMsg]       = useState('');
  const fileRef = useRef();

  // email change state
  const [email,        setEmail]        = useState('');
  const [otpSent,      setOtpSent]      = useState(false);
  const [otp,          setOtp]          = useState('');
  const [emailSaving,  setEmailSaving]  = useState(false);
  const [emailMsg,     setEmailMsg]     = useState('');

  // fill fields once user data arrives
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const avatarSrc = avatarPreview || user?.gravatar_url;

  function handleAvatarPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function saveInfo(e) {
    e.preventDefault();
    setInfoSaving(true);
    setInfoMsg('');
    try {
      const res = await authAPI.updateProfile({ first_name: firstName, last_name: lastName });
      setUser(res.data);
      setInfoMsg('Saved!');
    } catch (err) {
      console.error('[saveInfo] error:', err.response?.status, err.response?.data);
      setInfoMsg('Could not save changes.');
    } finally {
      setInfoSaving(false);
    }
  }

  async function sendOtp(e) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailMsg('');
    try {
      await authAPI.emailChangeRequest(email);
      setOtpSent(true);
      setEmailMsg('Code sent! Check your new email inbox.');
    } catch (err) {
      setEmailMsg(err.response?.data?.error || 'Could not send code.');
    } finally {
      setEmailSaving(false);
    }
  }

  async function confirmOtp(e) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailMsg('');
    try {
      const res = await authAPI.emailChangeConfirm(otp);
      setUser(res.data.user);
      setOtpSent(false);
      setOtp('');
      setEmailMsg('Email updated!');
    } catch (err) {
      setEmailMsg(err.response?.data?.error || 'Incorrect or expired code.');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await authAPI.deleteAccount();
      logout();
      navigate('/');
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid}>

        {/* ── Left: forms ── */}
        <div className={styles.left}>

          {/* Account info card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Account Information</h2>
            <p className={styles.cardSub}>Update your name and profile picture</p>
            <hr className={styles.divider} />

            <div className={styles.avatarRow}>
              <img src={avatarSrc} alt="avatar" className={styles.avatar} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarPick}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileRef.current.click()}
              >
                Upload
              </button>
            </div>

            <form onSubmit={saveInfo}>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>First Name</label>
                  <input
                    className={styles.input}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    className={styles.input}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              {infoMsg && (
                <p className={infoMsg === 'Saved!' ? styles.successMsg : styles.errorMsg}>
                  {infoMsg}
                </p>
              )}
              <div className={styles.cardFooter}>
                <button type="submit" className={styles.saveBtn} disabled={infoSaving}>
                  {infoSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Email card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Email Address</h2>
            <p className={styles.cardSub}>Update the email associated with your account</p>
            <hr className={styles.divider} />

            {!otpSent ? (
              <form onSubmit={sendOtp}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                {emailMsg && (
                  <p className={emailMsg === 'Code sent! Check your new email inbox.' ? styles.successMsg : styles.errorMsg}>
                    {emailMsg}
                  </p>
                )}
                {email !== user?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                  <div className={styles.cardFooter}>
                    <button type="submit" className={styles.saveBtn} disabled={emailSaving}>
                      {emailSaving ? 'Sending…' : 'Send Code'}
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={confirmOtp}>
                <p className={styles.cardSub} style={{ marginBottom: 12 }}>
                  A 6-digit code was sent to <strong>{email}</strong>
                </p>
                <label className={styles.label}>Verification Code</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                />
                {emailMsg && (
                  <p className={emailMsg === 'Email updated!' ? styles.successMsg : styles.errorMsg}>
                    {emailMsg}
                  </p>
                )}
                <div className={styles.cardFooter}>
                  <button type="button" className={styles.uploadBtn} onClick={() => { setOtpSent(false); setEmailMsg(''); }}>
                    Back
                  </button>
                  <button type="submit" className={styles.saveBtn} disabled={emailSaving || otp.length !== 6}>
                    {emailSaving ? 'Verifying…' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Delete account card */}
          <div className={`${styles.card} ${styles.dangerCard}`}>
            <h2 className={styles.dangerTitle}>Delete Account</h2>
            <p className={styles.cardSub}>
              Permanently remove your account and all associated data. This action cannot be undone.
            </p>
            <hr className={styles.divider} />
            <div className={styles.cardFooter}>
              {deleteConfirm && (
                <p className={styles.errorMsg}>Are you sure? Click again to confirm.</p>
              )}
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : deleteConfirm ? 'Confirm Delete' : 'Delete Account'}
              </button>
            </div>
          </div>

        </div>

        {/* ── Right: preview panel ── */}
        <div className={styles.right}>
          <h2 className={styles.previewTitle}>Preview</h2>
          <p className={styles.previewSub}>How others see your profile</p>
          <div className={styles.previewCard}>
            <img src={avatarSrc} alt="preview" className={styles.previewAvatar} />
            <p className={styles.previewName}>
              {firstName || lastName
                ? `${firstName} ${lastName}`.trim()
                : user?.email?.split('@')[0]}
            </p>
            <p className={styles.previewEmail}>{email}</p>
            <div className={styles.previewBadge}>
              {user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
