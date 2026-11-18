import React, { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { MocktwoLogo } from "./MocktwoLogo.tsx";
import { tokenizeEquation } from "../../utils/equationTokenizer.ts";

export interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

function getAccentRgb(accent?: string): string {
  if (!accent) return "10, 132, 255";
  if (accent.includes("accent-green")) return "48, 209, 88";
  if (accent.includes("accent-red")) return "255, 69, 58";
  if (accent.includes("accent-orange")) return "255, 159, 10";
  if (accent.includes("accent-purple")) return "191, 90, 242";
  if (accent.includes("accent-teal")) return "100, 210, 255";
  if (accent.includes("accent-indigo")) return "94, 92, 230";
  return "10, 132, 255";
}

/**
 * Universal Info Modal Shell
 */
export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  accentColor = "var(--accent-blue)",
  icon,
  children,
  triggerRef,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descId = useId();

  const [isScrolled, setIsScrolled] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Store trigger for focus restoration
  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = (document.activeElement as HTMLElement) || null;
    }
  }, [isOpen]);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button initially
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 20);

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const triggerElement = triggerRef?.current;

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // Restore focus to trigger
      const toFocus = triggerElement || lastActiveElementRef.current;
      toFocus?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  // Track scroll position for dynamic dividers and fade cues
  const updateScrollState = () => {
    const el = scrollBodyRef.current;
    if (!el) return;
    const hasScroll = el.scrollTop > 4;
    setIsScrolled(hasScroll);
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  };

  useEffect(() => {
    if (isOpen) {
      updateScrollState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const accentRgb = getAccentRgb(accentColor);

  return createPortal(
    <div
      className="info-modal-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="info-modal-shell"
        style={
          {
            "--modal-accent": accentColor,
            "--modal-accent-rgb": accentRgb,
          } as React.CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Sticky Header */}
        <div className="info-modal-header" data-scrolled={isScrolled}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            {icon ? (
              <div className="info-modal-icon-tile">{icon}</div>
            ) : (
              <MocktwoLogo size={28} />
            )}
            <div style={{ minWidth: 0 }}>
              <h2 id={titleId} className="info-modal-title">
                {title}
              </h2>
              {subtitle && <span className="info-modal-subtitle">{subtitle}</span>}
            </div>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="info-modal-close-btn"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Body with Fade Indicators */}
        <div
          className="info-modal-body-container"
          data-can-scroll-up={canScrollUp}
          data-can-scroll-down={canScrollDown}
        >
          <div className="info-modal-fade-top" />
          <div
            ref={scrollBodyRef}
            id={descId}
            className="info-modal-body"
            onScroll={updateScrollState}
            tabIndex={0}
            role="region"
            aria-label="Modal scrollable content"
          >
            {children}
          </div>
          <div className="info-modal-fade-bottom" />
        </div>

        {/* Sticky Footer */}
        <div className="info-modal-footer" data-scrolled={canScrollDown}>
          <button
            onClick={onClose}
            className="mac-btn-primary focus-ring"
            style={{
              padding: "6px 20px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--accent-blue)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ========================================================================
   TYPED PRIMITIVES
   ======================================================================== */

/**
 * Lead Paragraph: First explanation under title (max 62ch)
 */
export const InfoModalLead: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <p className="info-modal-lead">{children}</p>;

/**
 * Section Header with Semantic Accent Dot
 */
export const InfoModalSectionHeader: React.FC<{
  title: string;
  icon?: React.ReactNode;
}> = ({ title, icon }) => (
  <div className="info-modal-section-header">
    {icon || <span className="info-modal-accent-dot" />}
    <span>{title}</span>
  </div>
);

/**
 * Section Wrapper
 */
export const InfoModalSection: React.FC<{
  header?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ header, icon, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    {header && <InfoModalSectionHeader title={header} icon={icon} />}
    {children}
  </div>
);

/**
 * Callout with Left Accent Bar
 */
export const InfoModalCallout: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="info-modal-callout">
    <div className="info-modal-callout-header">
      {icon}
      <span>{title}</span>
    </div>
    <div className="info-modal-callout-body">{children}</div>
  </div>
);

/**
 * Tokenized Formula Component
 * Ensures 100% byte-fidelity while rendering colored tokens with soft wrap opportunities (<wbr/>).
 */
export const InfoModalEquation: React.FC<{ formula: string }> = ({
  formula,
}) => {
  const tokens = tokenizeEquation(formula);

  return (
    <div className="info-modal-equation-box">
      {tokens.map((token, index) => {
        let className = "info-modal-eq-txt";
        if (token.type === "function") className = "info-modal-eq-fn";
        else if (token.type === "variable") className = "info-modal-eq-var";
        else if (token.type === "number") className = "info-modal-eq-num";
        else if (token.type === "operator") className = "info-modal-eq-op";

        if (token.type === "whitespace") {
          return <span key={index}>{token.text}</span>;
        }

        const isSoftBreakPoint =
          token.text === "=" ||
          token.text === "+" ||
          token.text === "-" ||
          token.text === "×" ||
          token.text === "*" ||
          token.text === "/" ||
          token.text === ",";

        return (
          <React.Fragment key={index}>
            <span className={className} style={{ whiteSpace: "nowrap" }}>
              {token.text}
            </span>
            {isSoftBreakPoint && <wbr />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Numbered Steps Container
 */
export interface StepItem {
  number: number;
  title: string;
  weight?: string;
  description: string;
  formula?: string;
  note?: string;
}

export const InfoModalSteps: React.FC<{ steps: StepItem[] }> = ({ steps }) => (
  <div className="info-modal-inset-box">
    <div className="info-modal-steps-container">
      {steps.map((step) => (
        <div key={step.number} className="info-modal-step-item">
          <div className="info-modal-step-left">
            <span className="info-modal-step-num">{step.number}</span>
            <div className="info-modal-step-line" />
          </div>
          <div className="info-modal-step-content">
            <div className="info-modal-step-title-row">
              <span className="info-modal-step-title">{step.title}</span>
              {step.weight && (
                <span className="info-modal-step-weight-chip">
                  {step.weight}
                </span>
              )}
            </div>
            <p className="info-modal-step-desc">{step.description}</p>
            {step.formula && <InfoModalEquation formula={step.formula} />}
            {step.note && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "2px",
                }}
              >
                {step.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Weights Bar Component (built only from text weights)
 */
export interface WeightSegment {
  label: string;
  weight: number;
  color: string;
}

export const InfoModalWeightsBar: React.FC<{ segments: WeightSegment[] }> = ({
  segments,
}) => (
  <div>
    <div className="info-modal-weights-bar">
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{
            width: `${seg.weight}%`,
            backgroundColor: seg.color,
          }}
          title={`${seg.label}: ${seg.weight}%`}
        />
      ))}
    </div>
    <div className="info-modal-weights-legend">
      {segments.map((seg, i) => (
        <div key={i} className="info-modal-weights-legend-item">
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: seg.color,
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {seg.weight}%
          </span>
          <span>{seg.label}</span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Benchmark Box with Target Range Chip
 */
export const InfoModalBenchmark: React.FC<{
  targetRange: string;
  targetDescription: string;
}> = ({ targetRange, targetDescription }) => (
  <div className="info-modal-benchmark-box">
    <div className="info-modal-target-chip">
      <CheckCircle2 size={13} />
      <span>{targetRange}</span>
    </div>
    <p className="info-modal-benchmark-desc">{targetDescription}</p>
  </div>
);

/**
 * 2x2 Grid for Tiers (Composure & Nervousness)
 */
export interface TierItem {
  name: string;
  range: string;
  color: string;
  description: string;
}

export const InfoModalTierGrid: React.FC<{ tiers: TierItem[] }> = ({
  tiers,
}) => (
  <div className="info-modal-grid-2x2">
    {tiers.map((tier) => (
      <div key={tier.name} className="info-modal-card-inset">
        <div className="info-modal-card-inset-header">
          <span
            className="info-modal-card-inset-name"
            style={{ color: tier.color }}
          >
            {tier.name}
          </span>
          <span className="info-modal-card-inset-range">{tier.range}</span>
        </div>
        <p className="info-modal-card-inset-desc">{tier.description}</p>
      </div>
    ))}
  </div>
);

/**
 * Disclaimer Footer Primitive
 */
export const InfoModalDisclaimer: React.FC<{ text: string }> = ({ text }) => (
  <div className="info-modal-disclaimer">
    <ShieldCheck size={16} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
    <span>{text}</span>
  </div>
);
