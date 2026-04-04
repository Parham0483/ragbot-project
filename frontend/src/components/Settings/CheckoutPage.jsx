import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CheckoutPage.module.css';

const PRO_FEATURES = [
  'Up to 3 AI Agents',
  'Unlimited Messages',
  'Choose from 3 AI Models',
  'Advance Reports (up to 1 year)',
  'Up to 4 Actions',
];

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry]         = useState('');
  const [cvv, setCvv]               = useState('');
  const [name, setName]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // basic validation
    const rawCard = cardNumber.replace(/\s/g, '');
    if (rawCard.length !== 16) { setError('Enter a valid 16-digit card number.'); return; }
    if (expiry.length < 5)     { setError('Enter a valid expiry date (MM/YY).'); return; }
    if (cvv.length < 3)        { setError('Enter a valid CVV.'); return; }
    if (!name.trim())          { setError('Enter the cardholder name.'); return; }

    setSubmitting(true);
    // simulate payment processing
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Payment Successful</h2>
          <p className={styles.successMsg}>
            Welcome to Pro! Your account has been upgraded.
          </p>
          <button className={styles.dashBtn} onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>

        {/* Left — order summary */}
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>

          <div className={styles.planRow}>
            <span className={styles.planName}>Smart Chat Pro</span>
            <span className={styles.planPrice}>£10 / month</span>
          </div>

          <ul className={styles.featureList}>
            {PRO_FEATURES.map(f => (
              <li key={f} className={styles.featureItem}>
                <span className={styles.check}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <div className={styles.divider} />

          <div className={styles.totalRow}>
            <span>Total today</span>
            <span className={styles.totalPrice}>£10.00</span>
          </div>

          <p className={styles.billingNote}>
            Billed monthly. Cancel anytime.
          </p>
        </div>

        {/* Right — payment form */}
        <div className={styles.formBox}>
          <h2 className={styles.formTitle}>Payment Details</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Cardholder Name
              <input
                className={styles.input}
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              Card Number
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.label}>
                Expiry
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                />
              </label>

              <label className={styles.label}>
                CVV
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  maxLength={4}
                  value={cvv}
                  onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </label>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              type="submit"
              className={styles.payBtn}
              disabled={submitting}
            >
              {submitting ? 'Processing…' : 'Pay £10.00'}
            </button>

            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </form>

          <p className={styles.secureNote}>
             This is a demo payment form. No real charges will be made.
          </p>
        </div>

      </div>
    </div>
  );
}
