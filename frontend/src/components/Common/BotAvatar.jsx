import React from 'react';
import styles from './BotAvatar.module.css';

// deterministic color from name — same algorithm used by Intercom, Slack, Linear
const PALETTE = ['#E8543A', '#4361EE', '#3A0CA3', '#7209B7', '#F72585', '#2D6A4F', '#D62828', '#0077B6'];

function pickColor(name) {
  let hash = 0;
  for (const ch of (name || '')) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// size: number (px), name: string, avatarUrl: string|null
export default function BotAvatar({ name = '', avatarUrl = null, size = 36, className = '' }) {
  const style = { width: size, height: size, borderRadius: size * 0.28 };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${styles.avatar} ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`${styles.initials} ${className}`}
      style={{ ...style, background: pickColor(name), fontSize: size * 0.38 }}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
