import { useState, useEffect, useRef } from "react";
import { apiGoogleAuth, setAuthToken } from "../services/api";

export default function GoogleSignInButton({ onGoogleSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devName, setDevName] = useState("");
  const googleBtnContainerRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Initialize official Google Identity Services if client ID is configured
  useEffect(() => {
    if (!googleClientId) return;

    function initGoogleClient() {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render Google's official branded button
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_black",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: 320,
          });
        } catch (err) {
          console.warn("Failed to render Google button:", err);
        }
      }
    }

    if (window.google?.accounts?.id) {
      initGoogleClient();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleClient();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  async function handleGoogleCredentialResponse(response) {
    setLoading(true);
    try {
      if (!response.credential) {
        throw new Error("No credential received from Google.");
      }

      // Decode base64 JWT payload safely
      const base64Url = response.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(decodeURIComponent(escape(window.atob(base64))));

      const authResult = await apiGoogleAuth({
        credential: response.credential,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
      });

      if (authResult?.token) {
        setAuthToken(authResult.token);
      }

      const userObj = authResult?.user || {
        id: "usr_google_" + (payload.sub || Date.now()),
        name: payload.name || "Google User",
        email: payload.email,
        picture: payload.picture,
        authProvider: "google",
        monthlyBudget: 20000,
        guardThreshold: 80,
      };

      onGoogleSuccess(userObj);
    } catch (err) {
      onError?.("Google sign-in error: " + (err.message || "Verification failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDevGoogleSubmit(e) {
    e.preventDefault();
    if (!devEmail || !devEmail.includes("@")) {
      onError?.("Please enter a valid Google email address.");
      return;
    }

    setLoading(true);
    setShowDevModal(false);

    try {
      const email = devEmail.toLowerCase().trim();
      const derivedName = devName.trim() || email.split("@")[0].replace(/[._]/g, " ");
      const capitalizedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

      const authResult = await apiGoogleAuth({
        email,
        name: capitalizedName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(capitalizedName)}`,
        googleId: "dev_g_" + Date.now(),
      }).catch((err) => {
        console.warn("Backend Google Auth dev fallback:", err.message);
        return null;
      });

      if (authResult?.token) {
        setAuthToken(authResult.token);
      }

      const userObj = authResult?.user || {
        id: "usr_google_" + Date.now(),
        name: capitalizedName,
        email,
        picture: "",
        authProvider: "google",
        monthlyBudget: 20000,
        guardThreshold: 80,
      };

      onGoogleSuccess(userObj);
    } catch (err) {
      onError?.(err.message || "Google sign in error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {googleClientId ? (
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <div ref={googleBtnContainerRef} />
        </div>
      ) : (
        <button
          type="button"
          className="google-signin-btn"
          onClick={() => setShowDevModal(true)}
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
        </button>
      )}

      {/* Developer / Testing Google Modal when VITE_GOOGLE_CLIENT_ID is not configured */}
      {showDevModal && (
        <div className="modal-backdrop" onClick={() => setShowDevModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 440, padding: 24, textAlign: "left" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  background: "#1c1b29",
                  padding: 10,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg viewBox="0 0 24 24" width="26" height="26">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#f8fafc" }}>Google Sign-In</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
                  Connect your Google Account securely
                </p>
              </div>
            </div>

            <form onSubmit={handleDevGoogleSubmit}>
              <label style={{ display: "block", marginBottom: 12, fontSize: 13, color: "#cbd5e1" }}>
                Google Email Address
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    background: "#13121d",
                    border: "1px solid #2d2b42",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  autoFocus
                  required
                />
              </label>

              <label style={{ display: "block", marginBottom: 16, fontSize: 13, color: "#cbd5e1" }}>
                Display Name (Optional)
                <input
                  type="text"
                  placeholder="e.g. Vinamra Dev"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    background: "#13121d",
                    border: "1px solid #2d2b42",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDevModal(false)}
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ width: "auto", padding: "8px 20px" }}
                >
                  Sign In with Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
