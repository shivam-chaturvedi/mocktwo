import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context";
import { Button } from "../components/common/Button";
import {
  Layers,
  ArrowRight,
  Fingerprint,
  Building2,
  KeyRound,
  RefreshCw
} from "lucide-react";

export const SignInScreen: React.FC = () => {
  const { signIn, user } = useApp();

  const [authStep, setAuthStep] = useState<"welcome" | "sso-or-code" | "enter-code">("welcome");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(45);
  const [isReturningUser, setIsReturningUser] = useState(Boolean(user?.email && user.name));

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resending one-time code
  useEffect(() => {
    if (authStep !== "enter-code" || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [authStep, resendTimer]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid work email.");
      return;
    }
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setAuthStep("sso-or-code");
    }, 400);
  };

  const handleSSOLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn(email || "user@work.com");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication service is unavailable offline. A connected mocktwo workspace backend is required."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = () => {
    setIsLoading(true);
    setError("");
    setResendTimer(45);
    setTimeout(() => {
      setIsLoading(false);
      setAuthStep("enter-code");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, 400);
  };

  const handleTouchIDUnlock = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn(user.email || "user@work.com");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication service is unavailable offline. A connected mocktwo workspace backend is required."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      setIsLoading(true);
      setError("");
      signIn(email)
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "Authentication service is unavailable offline. A connected mocktwo workspace backend is required."
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteCode = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...codeDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setCodeDigits(newDigits);

    if (pasted.length >= 6) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        signIn(email);
      }, 500);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-window)",
        background: "radial-gradient(ellipse at 50% 30%, rgba(10, 132, 255, 0.06) 0%, transparent 60%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Top native draggable area with traffic light clearance */}
      <div
        className="titlebar-drag"
        style={{
          height: "52px",
          minHeight: "52px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          paddingLeft: "78px",
          borderBottom: "1px solid var(--separator)"
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-tertiary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          }}
        >
          mocktwo
        </span>
      </div>

      {/* Centered Authentication Form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }}
      >
        {/* Brand Icon & Tagline */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              backgroundColor: "var(--accent-blue)",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(10, 132, 255, 0.35)",
              margin: "0 auto 16px auto"
            }}
          >
            <Layers size={26} strokeWidth={2.2} />
          </div>

          <h1
            className="font-serif-luxury"
            style={{
              fontSize: "26px",
              fontWeight: 650,
              color: "var(--text-primary)",
              margin: "0 0 6px 0",
              letterSpacing: "-0.02em"
            }}
          >
            mocktwo
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--text-secondary)",
              margin: 0,
              letterSpacing: "-0.01em"
            }}
          >
            Rehearse high-pressure conversations before they happen.
          </p>
        </div>

        {/* Card Case 1: Returning User Lock Screen (Touch ID) */}
        {isReturningUser && authStep === "welcome" && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "380px",
              borderRadius: "var(--radius-xl)",
              padding: "28px 24px",
              boxShadow: "var(--shadow-modal)",
              textAlign: "center",
              border: "1px solid var(--separator)"
            }}
          >
            {/* User Avatar */}
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "var(--bg-control)",
                border: "1.5px solid var(--separator)",
                display: "grid",
                placeItems: "center",
                fontSize: "20px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 auto 12px auto",
                boxShadow: "var(--shadow-card)"
              }}
            >
              {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
            </div>

            <h3
              style={{
                fontSize: "16px",
                fontWeight: 650,
                color: "var(--text-primary)",
                margin: "0 0 4px 0"
              }}
            >
              {user.name}
            </h3>
            <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "22px" }}>
              {user.role} • {user.team}
            </div>

            <Button
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={<Fingerprint size={17} />}
              onClick={handleTouchIDUnlock}
              style={{ width: "100%", justifyContent: "center", marginBottom: "14px" }}
            >
              Unlock with Touch ID
            </Button>

            <button
              type="button"
              onClick={() => setIsReturningUser(false)}
              style={{
                fontSize: "12px",
                color: "var(--accent-blue)",
                fontWeight: 500
              }}
            >
              Use a different account
            </button>
          </div>
        )}

        {/* Card Case 2: Step 1 Work Email Input */}
        {!isReturningUser && authStep === "welcome" && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "380px",
              borderRadius: "var(--radius-xl)",
              padding: "28px 24px",
              boxShadow: "var(--shadow-modal)",
              border: "1px solid var(--separator)"
            }}
          >
            <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 550,
                    color: "var(--text-secondary)",
                    marginBottom: "6px"
                  }}
                >
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="name@company.com"
                  autoComplete="email"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    backgroundColor: "var(--bg-control)",
                    border: error ? "1px solid var(--accent-red)" : "1px solid var(--separator)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "13.5px",
                    outline: "none"
                  }}
                />
                {error && (
                  <p style={{ fontSize: "12px", color: "var(--accent-red)", marginTop: "6px", margin: 0 }}>
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                icon={<ArrowRight size={14} />}
                iconPosition="right"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Continue
              </Button>
            </form>

            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setIsReturningUser(true)}
                style={{ fontSize: "12px", color: "var(--text-tertiary)" }}
              >
                Return to saved profile
              </button>
            </div>
          </div>
        )}

        {/* Card Case 3: Step 2 SSO or Code choice */}
        {authStep === "sso-or-code" && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "380px",
              borderRadius: "var(--radius-xl)",
              padding: "28px 24px",
              boxShadow: "var(--shadow-modal)",
              border: "1px solid var(--separator)"
            }}
          >
            <div style={{ marginBottom: "18px", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "block" }}>
                Identified Organization:
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                Enterprise SSO Identity
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Button
                variant="primary"
                size="lg"
                isLoading={isLoading}
                icon={<Building2 size={16} />}
                onClick={handleSSOLogin}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Continue with Company SSO
              </Button>

              <Button
                variant="secondary"
                size="md"
                icon={<KeyRound size={15} />}
                onClick={handleSendCode}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Send One-Time Code
              </Button>
            </div>

            <div style={{ marginTop: "18px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setAuthStep("welcome")}
                style={{ fontSize: "12px", color: "var(--text-tertiary)" }}
              >
                Change work email
              </button>
            </div>
          </div>
        )}

        {/* Card Case 4: Step 3 Enter 6-digit code */}
        {authStep === "enter-code" && (
          <div
            className="glass-surface animate-sheet-in"
            style={{
              width: "100%",
              maxWidth: "400px",
              borderRadius: "var(--radius-xl)",
              padding: "28px 24px",
              boxShadow: "var(--shadow-modal)",
              border: "1px solid var(--separator)",
              textAlign: "center"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 650, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
              Enter Security Code
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: "0 0 20px 0" }}>
              We sent a 6-digit code to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
            </p>

            {/* 6 Digit Input Boxes */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }} onPaste={handlePasteCode}>
              {codeDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  style={{
                    width: "42px",
                    height: "48px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-control)",
                    border: digit ? "1.5px solid var(--accent-blue)" : "1px solid var(--separator)",
                    color: "var(--text-primary)",
                    fontSize: "20px",
                    fontWeight: 700,
                    textAlign: "center",
                    outline: "none"
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "var(--text-tertiary)" }}>
              {resendTimer > 0 ? (
                <span>Resend code in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendCode}
                  style={{ color: "var(--accent-blue)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <RefreshCw size={12} /> Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
