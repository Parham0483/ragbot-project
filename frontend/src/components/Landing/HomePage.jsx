import React from 'react';
import { Link } from 'react-router-dom';
import LandingNavbar from './LandingNavbar';
import WebsiteChat from '../Auth/WebsiteChat';
import styles from './HomePage.module.css';

const STATS = [
  { value: 'PDF · DOCX · TXT', label: 'Supported file formats' },
  { value: '1,536-dim',        label: 'Vector embeddings (Ada-002)' },
  { value: 'Top-5 chunks',     label: 'Retrieved per query' },
  { value: '< 2s',             label: 'Benchmarked response time' },
];

const STEPS = [
  {
    num: '01',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    title: 'Upload Your Docs',
    desc: 'Drop in any PDF, DOCX, or TXT file. SmartChat processes and indexes your content automatically — no manual tagging required.',
  },
  {
    num: '02',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/>
      </svg>
    ),
    title: 'Configure Your Agent',
    desc: 'Set your chatbot name, tone, and branding. Choose which documents it knows about and how it should respond.',
  },
  {
    num: '03',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Go Live — Instantly',
    desc: 'Copy one line of code and embed your AI agent anywhere. It answers 24/7 from your actual documents, not generic training data.',
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: 'RAG-Powered Answers',
    desc: 'Retrieval-Augmented Generation finds the most relevant passage in your docs and answers from it — not from hallucinated guesses.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Conversation Memory',
    desc: 'Every session retains context so users never repeat themselves. Natural multi-turn conversations, just like a real support agent.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    title: 'One-Line Embed',
    desc: 'Add your chatbot to any website with a single script tag. No frameworks, no devops, no waiting — live in under 5 minutes.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Real-Time Analytics',
    desc: 'Track messages per day, helpfulness ratings, top questions, and response times. Know exactly how your chatbot is performing.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
    title: 'Multi-Format Ingestion',
    desc: 'Upload PDFs, Word documents, and plain text files. Chunked, embedded, and indexed automatically with OpenAI Ada-002.',
  },
];


export default function HomePage() {
  return (
    <div className={styles.page}>
      <LandingNavbar />

      {/* hero */}
      <section className={styles.hero}>
        <div className={styles.heroAurora} />
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              RAG-powered · Built on OpenAI · Embed with one line
            </div>
            <h1 className={styles.heroTitle}>
              Turn your docs into a<br />
              <span className={styles.heroAccent}>24/7 AI support agent</span>
            </h1>
            <p className={styles.heroSubtitle}>
              SmartChat reads your PDFs, help articles, and knowledge base — then answers every customer question instantly, accurately, and at any hour.
            </p>
            <div className={styles.ctaGroup}>
              <Link to="/register" className={styles.ctaPrimary}>
                Start for Free
              </Link>
              <Link to="/pricing" className={styles.ctaSecondary}>
                See pricing →
              </Link>
            </div>
            <p className={styles.trustLine}>
              No credit card required · Free tier available · Cancel anytime
            </p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.glow} />
            <div className={styles.chatBox}>
              <WebsiteChat />
            </div>
          </div>
        </div>
      </section>

      {/* stats strip */}
      <section className={styles.statsStrip}>
        {STATS.map(({ value, label }) => (
          <div key={label} className={styles.statItem}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </section>

      {/* how it works */}
      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>HOW IT WORKS</p>
          <h2 className={styles.sectionTitle}>From documents to deployed — in three steps</h2>
          <p className={styles.sectionSub}>No engineers. No training pipelines. No waiting.</p>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, i) => (
              <div key={step.num} className={styles.stepCard}>
                <span className={styles.stepWatermark}>{step.num}</span>
                <div className={styles.stepIconWrap}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
                {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>FEATURES</p>
          <h2 className={styles.sectionTitle}>Everything your support team needs — automated</h2>
          <p className={styles.sectionSub}>All core features available on the free tier.</p>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* dark demo section */}
      <section className={styles.demoSection}>
        <div className={styles.demoInner}>
          <p className={styles.demoEyebrow}>LIVE DEMO</p>
          <h2 className={styles.demoTitle}>See it answer from your documents</h2>
          <p className={styles.demoSub}>
            Ask the assistant anything about SmartChat — it's reading from our actual documentation in real time.
          </p>
          <div className={styles.demoChatWrap}>
            <div className={styles.demoBrowserBar}>
              <span className={styles.demoDot} style={{ background: '#ff5f56' }} />
              <span className={styles.demoDot} style={{ background: '#ffbd2e' }} />
              <span className={styles.demoDot} style={{ background: '#27c93f' }} />
              <span className={styles.demoUrl}>localhost:3000/widget/demo</span>
            </div>
            <div className={styles.demoChatBox}>
              <WebsiteChat />
            </div>
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Start answering questions on autopilot</h2>
        <p className={styles.ctaBannerSub}>Set up in 5 minutes. No code required. Free tier available.</p>
        <div className={styles.ctaBannerBtns}>
          <Link to="/register" className={styles.ctaBannerPrimary}>Get Started Free</Link>
          <Link to="/pricing" className={styles.ctaBannerSecondary}>View Pricing →</Link>
        </div>
        <p className={styles.ctaBannerTrust}>Built for small businesses and educators</p>
      </section>

      {/* footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src="/cs-logo.png" alt="SmartChat" className={styles.footerLogo} />
            <span className={styles.footerBrandName}>Smart Chat</span>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/" className={styles.footerLink}>Home</Link>
            <Link to="/pricing" className={styles.footerLink}>Pricing</Link>
            <Link to="/register" className={styles.footerLink}>Sign Up</Link>
            <Link to="/login" className={styles.footerLink}>Login</Link>
          </div>
          <span className={styles.footerCopy}>© 2025 Smart Chat. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
