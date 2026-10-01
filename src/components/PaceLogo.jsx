export default function PaceLogo({ size = 36, className = "logo-png" }) {
  return (
    <img
      src="/pace-icon-192x192.png"
      alt="Logo"
      width={size}
      height={size}
      className={`pace-logo-tile ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}