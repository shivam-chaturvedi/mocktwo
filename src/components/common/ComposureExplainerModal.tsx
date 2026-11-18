import React from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import {
  InfoModal,
  InfoModalLead,
  InfoModalSection,
  InfoModalCallout,
  InfoModalSteps,
  InfoModalWeightsBar,
  InfoModalTierGrid,
  InfoModalDisclaimer,
} from "./InfoModal.tsx";
import { COMPOSURE_MODAL_DATA } from "../../data/infoModalContent.ts";

export interface ComposureExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ComposureExplainerModal: React.FC<ComposureExplainerModalProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  if (!isOpen) return null;

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={COMPOSURE_MODAL_DATA.title}
      subtitle={COMPOSURE_MODAL_DATA.subtitle}
      accentColor={COMPOSURE_MODAL_DATA.accent}
      triggerRef={triggerRef}
    >
      {/* Section 1: In Plain Layman English */}
      <InfoModalSection header={COMPOSURE_MODAL_DATA.whatIsSectionTitle}>
        <InfoModalLead>{COMPOSURE_MODAL_DATA.whatIsParagraph}</InfoModalLead>
      </InfoModalSection>

      {/* Section 2: How It Gets Calculated & Formulae */}
      <InfoModalSection header={COMPOSURE_MODAL_DATA.howCalculatedSectionTitle}>
        <InfoModalWeightsBar
          segments={[
            {
              label: "Pulse Control",
              weight: 60,
              color: "var(--accent-blue)",
            },
            {
              label: "Autonomic Recovery",
              weight: 40,
              color: "var(--accent-green)",
            },
          ]}
        />
        <InfoModalSteps
          steps={[
            {
              number: 1,
              title: "Pulse Control (60% weight):",
              description: COMPOSURE_MODAL_DATA.step1Description,
              formula: COMPOSURE_MODAL_DATA.step1Formula,
            },
            {
              number: 2,
              title: "Autonomic Recovery (40% weight):",
              description: COMPOSURE_MODAL_DATA.step2Description,
              formula: COMPOSURE_MODAL_DATA.step2Formula,
            },
            {
              number: 3,
              title: "Composite Composure Score:",
              description: COMPOSURE_MODAL_DATA.step3Description,
              formula: COMPOSURE_MODAL_DATA.step3Formula,
            },
          ]}
        />
      </InfoModalSection>

      {/* Section 2.5: Nervousness Level Breakdown */}
      <InfoModalSection header={COMPOSURE_MODAL_DATA.nervousnessSectionTitle}>
        <p
          className="info-modal-lead"
          style={{ margin: "0 0 10px 0", fontSize: "12.5px" }}
        >
          {COMPOSURE_MODAL_DATA.nervousnessDescription}
        </p>
        <InfoModalTierGrid tiers={COMPOSURE_MODAL_DATA.nervousnessTiers} />
      </InfoModalSection>

      {/* Section 2.7: Stress & Pressure Moments Detection */}
      <InfoModalCallout
        title={COMPOSURE_MODAL_DATA.pressureDetectionSectionTitle}
        icon={<Zap size={14} style={{ color: "var(--accent-purple)" }} />}
      >
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "12.5px",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {COMPOSURE_MODAL_DATA.pressureDetectionP1}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "12.5px",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {COMPOSURE_MODAL_DATA.pressureDetectionP2}
        </p>
      </InfoModalCallout>

      {/* Section 3: Composure Tiers & What Steady Means */}
      <InfoModalSection header={COMPOSURE_MODAL_DATA.percentagesTiersSectionTitle}>
        <InfoModalTierGrid tiers={COMPOSURE_MODAL_DATA.percentagesTiers} />

        <div style={{ marginTop: "12px" }}>
          <InfoModalCallout
            title={COMPOSURE_MODAL_DATA.steadyHighlightTitle}
            icon={
              <CheckCircle2
                size={14}
                style={{ color: "var(--accent-blue)" }}
              />
            }
          >
            <p
              style={{
                margin: 0,
                fontSize: "12.5px",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
              }}
            >
              {COMPOSURE_MODAL_DATA.steadyHighlightBody}
            </p>
          </InfoModalCallout>
        </div>
      </InfoModalSection>

      {/* Privacy & Wellness Disclaimer */}
      <InfoModalDisclaimer text={COMPOSURE_MODAL_DATA.disclaimer} />
    </InfoModal>
  );
};
