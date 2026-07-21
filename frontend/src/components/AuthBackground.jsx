export default function AuthBackground({ imageUrl, children }) {
  return (
    <div className="auth-bg-wrapper">
      {imageUrl ? (
        <div className="auth-bg-image" style={{ backgroundImage: `url(${imageUrl})` }} />
      ) : (
        <div className="auth-bg-fallback" />
      )}
      <div className="auth-bg-overlay" />
      <div className="auth-bg-content">{children}</div>
    </div>
  );
}
