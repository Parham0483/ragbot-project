import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Alert } from '@mui/material';
import { authAPI } from '../../services/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.passwordResetRequest({ email });
    } catch {
      // Intentionally swallowed — always show the same message
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>Forgot Password</Typography>

        {submitted ? (
          <>
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              If that email exists, a reset link has been sent. Check your inbox (and spam folder).
            </Alert>
            <Typography align="center">
              <Link to="/login">Back to Login</Link>
            </Typography>
          </>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
            <Typography align="center">
              <Link to="/login">Back to Login</Link>
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default ForgotPassword;
