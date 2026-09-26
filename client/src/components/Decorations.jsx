export function AcaiBerry({ className = '' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="22" r="14" fill="#4A1A5E" />
      <circle cx="20" cy="22" r="12" fill="#5C2470" />
      <ellipse cx="17" cy="18" rx="3" ry="2" fill="#7B3A90" opacity="0.6" />
      <path d="M20 8 C18 4, 16 2, 14 0" stroke="#4E9A3A" strokeWidth="2" fill="none" />
      <path d="M20 8 C22 4, 24 2, 26 0" stroke="#4E9A3A" strokeWidth="2" fill="none" />
      <ellipse cx="13" cy="2" rx="3" ry="5" fill="#4E9A3A" transform="rotate(-20 13 2)" />
      <ellipse cx="27" cy="2" rx="3" ry="5" fill="#4E9A3A" transform="rotate(20 27 2)" />
    </svg>
  );
}

export function LeafDecor({ className = '' }) {
  return (
    <svg viewBox="0 0 60 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 25 Q15 5 30 10 Q45 15 55 5" stroke="#4E9A3A" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M10 28 Q20 12 35 15" stroke="#5DB848" strokeWidth="1.5" fill="none" opacity="0.3" />
      <ellipse cx="30" cy="10" rx="8" ry="4" fill="#4E9A3A" opacity="0.15" transform="rotate(-15 30 10)" />
      <ellipse cx="50" cy="8" rx="6" ry="3" fill="#4E9A3A" opacity="0.15" transform="rotate(10 50 8)" />
    </svg>
  );
}
