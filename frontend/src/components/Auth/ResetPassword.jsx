import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Alert } from '@mui/material';
import { authAPI } from '../../services/api';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const uid = searchParams.get('uid') || '';

  const [formData, setFormData] = useState({ new_password: '', new_password_confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.new_password !== formData.new_password_confirm) {
      setError("Passwords don't match.");
      return;
    }

    if (!token || !uid) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.passwordResetConfirm({ token, uid, ...formData });
      navigate('/login', { state: { successMessage: 'Password reset successfully. You can now log in.' } });
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(Array.isArray(msg) ? msg.join(' ') : (msg || 'Password reset failed. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>Reset Password</Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="New password"
            name="new_password"
            type="password"
            value={formData.new_password}
            onChange={handleChange}
            helperText="Minimum 8 characters"
            autoFocus
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm new password"
            name="new_password_confirm"
            type="password"
            value={formData.new_password_confirm}
            onChange={handleChange}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </Button>
          <Typography align="center">
            <Link to="/forgot-password">Request a new link</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default ResetPassword;
