import React, { useState } from 'react';
import LandingNavbar from './LandingNavbar';
import styles from './ContactPage.module.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    // just show success, no backend needed
    setSent(true);
  }

  return (
    <div className={styles.page}>
      <LandingNavbar />

      <main className={styles.main}>
        <div className={styles.container}>

          {/* left side - contact info */}
          <div className={styles.info}>
            <h1 className={styles.title}>Get in touch</h1>
            <p className={styles.subtitle}>Have a question? We'd love to hear from you.</p>

            <div className={styles.cards}>
              <div className={styles.card}>
                <span className={styles.icon}>✉</span>
                <div>
                  <p className={styles.cardLabel}>Email</p>
                  <p className={styles.cardValue}>parham.g1383@gmail.com</p>
                </div>
              </div>

              <div className={styles.card}>
                <div>
                  <p className={styles.cardLabel}>Location</p>
                  <p className={styles.cardValue}>London, UK</p>
                </div>
              </div>

              <div className={styles.card}>
                <div>
                  <p className={styles.cardLabel}>Response Time</p>
                  <p className={styles.cardValue}>We reply within 24 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* right side - contact form */}
          <div className={styles.formWrap}>
            {sent ? (
              <div className={styles.success}>
                <span className={styles.successIcon}>✓</span>
                <h3>Message sent!</h3>
                <p>Thanks for reaching out. We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <h2 className={styles.formTitle}>Send a message</h2>

                <label className={styles.label}>Name</label>
                <input
                  className={styles.input}
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                />

                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                />

                <label className={styles.label}>Message</label>
                <textarea
                  className={styles.textarea}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  rows={5}
                  required
                />

                <button className={styles.btn} type="submit">Send Message</button>
              </form>
            )}
          </div>

        </div>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerCopy}>© 2025 All rights reserved.</span>
      </footer>
    </div>
  );
}
