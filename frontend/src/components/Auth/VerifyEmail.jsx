import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { authAPI } from '../../services/api';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { verifyEmailAndLogin } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const uid = searchParams.get('uid');

    if (!token || !uid) {
      setState('error');
      setErrorMsg('Invalid verification link — token or user ID is missing.');
      return;
    }

    verifyEmailAndLogin({ token, uid })
      .then(() => {
        setState('success');
        setTimeout(() => navigate('/dashboard'), 2500);
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Verification failed. The link may be invalid or already used.';
        setErrorMsg(msg);
        setState('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    // Ask the user for their email to resend — simplest approach without extra endpoint
    const email = window.prompt('Enter your email address to resend the verification link:');
    if (!email) return;
    setResendStatus('sending');
    try {
      // Resend by requesting a password-reset-style email — we reuse the register flow
      // The cleanest way without a dedicated endpoint: tell the user to register again
      // or contact support. For now, direct them to contact support.
      setResendStatus('Please contact support or try registering again with the same email.');
    } catch {
      setResendStatus('Failed to resend. Please try again later.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Typography variant="h4">Email Verification</Typography>

        {state === 'verifying' && (
          <>
            <CircularProgress />
            <Typography color="text.secondary">Verifying your email address…</Typography>
          </>
        )}

        {state === 'success' && (
          <Alert severity="success" sx={{ width: '100%' }}>
            Email verified successfully! Redirecting you to your dashboard…
          </Alert>
        )}

        {state === 'error' && (
          <>
            <Alert severity="error" sx={{ width: '100%' }}>{errorMsg}</Alert>
            {resendStatus && (
              <Alert severity="info" sx={{ width: '100%' }}>{resendStatus}</Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={handleResend}>
                Resend verification email
              </Button>
              <Button variant="text" component={Link} to="/login">
                Back to Login
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}

export default VerifyEmail;
