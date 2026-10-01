export default function PaceLogo({ size = 36, className = "logo-png" }) {
  return (
    <img
      src="/my-logo.png"
      alt="Logo"
      width={size}
      height={size}
      className={`pace-logo-tile ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}