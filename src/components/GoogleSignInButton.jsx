import { useState, useEffect, useRef, useCallback } from "react";
import { apiGoogleAuth, setAuthToken } from "../services/api";

export default function GoogleSignInButton({ onGoogleSuccess, onError }) {
  const [, setLoading] = useState(false);
  const googleBtnContainerRef = useRef(null);

  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "236425816974-q2qfjok68p0333obphbs6qr1gn9f64g7.apps.googleusercontent.com";

  const handleGoogleCredentialResponse = useCallback(async (response) => {
    setLoading(true);

    try {
      if (!response || !response.credential) {
        throw new Error("No OAuth credential token received from Google.");
      }

      // Send the real Google ID token to the backend
      const authResult = await apiGoogleAuth({
        credential: response.credential,
      });

      if (authResult?.token) {
        setAuthToken(authResult.token);
      }

      // Do not create fake/default user data.
      const userObj = authResult?.user;

      if (!userObj) {
        throw new Error(
          "Google authentication succeeded but no user profile was returned."
        );
      }

      onGoogleSuccess(userObj);
    } catch (err) {
      onError?.(
        "Google sign-in error: " +
          (err.message || "OAuth verification failed")
      );
    } finally {
      setLoading(false);
    }
  }, [onGoogleSuccess, onError]);

  useEffect(() => {
    if (!googleClientId) return;

    function initGoogleClient() {
      if (!window.google?.accounts?.id || !googleBtnContainerRef.current) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Clear the container before rendering the official Google button.
        googleBtnContainerRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(
          googleBtnContainerRef.current,
          {
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: 250,
          }
        );
      } catch (err) {
        console.warn("[Google OAuth] Button render notice:", err);
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
      }, 200);

      return () => clearInterval(interval);
    }
  }, [googleClientId, handleGoogleCredentialResponse]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: 8,
      }}
    >
      <div
        ref={googleBtnContainerRef}
        style={{
          minHeight: 44,
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      />
    </div>
  );
}