export default function PaceLogo({ size = 36, variant = "tile", className = "" }) {
  if (variant === "glyph") {
    return (
      <svg
        className={`pace-logo-glyph ${className}`}
        width={size}
        height={size}
        viewBox="110 88 312 336"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="PACE Logo"
      >
        <defs>
          <linearGradient id="stemGradGlyph" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="loopGradGlyph" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="38%" stopColor="#10b981" />
            <stop offset="78%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        <rect x="130" y="108" width="62" height="296" rx="31" fill="url(#stemGradGlyph)" />
        <path
          d="M192 108H288C350.96 108 402 159.04 402 222C402 284.96 350.96 336 288 336H206C197.163 336 190 328.837 190 320V294C190 285.163 197.163 278 206 278H284C314.928 278 340 252.928 340 222C340 191.072 314.928 166 284 166H192V108Z"
          fill="url(#loopGradGlyph)"
        />
        <circle cx="262" cy="222" r="14" fill="#34d399" />
        <path
          d="M262 198L265.5 218.5L286 222L265.5 225.5L262 246L258.5 225.5L238 222L258.5 218.5L262 198Z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  // Default: Tile variant (with squircle container and ambient fintech glow)
  return (
    <svg
      className={`pace-logo-tile ${className}`}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PACE Logo"
    >
      <defs>
        <linearGradient id="bgGradTile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#181920" />
          <stop offset="50%" stopColor="#0f1015" />
          <stop offset="100%" stopColor="#08080b" />
        </linearGradient>

        <linearGradient id="rimGradTile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="stemGradTile" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="loopGradTile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="38%" stopColor="#10b981" />
          <stop offset="78%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        <radialGradient id="ambGlowTile" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#06b6d4" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="beaconHaloTile" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="20" y="20" width="472" height="472" rx="114" fill="url(#bgGradTile)" />
      <rect x="20" y="20" width="472" height="472" rx="114" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <rect x="22" y="22" width="468" height="468" rx="112" stroke="url(#rimGradTile)" strokeWidth="1.5" />

      <circle cx="268" cy="224" r="150" fill="url(#ambGlowTile)" />

      <rect x="130" y="108" width="62" height="296" rx="31" fill="url(#stemGradTile)" />

      <path
        d="M192 108H288C350.96 108 402 159.04 402 222C402 284.96 350.96 336 288 336H206C197.163 336 190 328.837 190 320V294C190 285.163 197.163 278 206 278H284C314.928 278 340 252.928 340 222C340 191.072 314.928 166 284 166H192V108Z"
        fill="url(#loopGradTile)"
      />

      <circle cx="262" cy="222" r="28" fill="url(#beaconHaloTile)" />
      <circle cx="262" cy="222" r="14" fill="#34d399" />
      <path
        d="M262 198L265.5 218.5L286 222L265.5 225.5L262 246L258.5 225.5L238 222L258.5 218.5L262 198Z"
        fill="#ffffff"
      />
    </svg>
  );
}
