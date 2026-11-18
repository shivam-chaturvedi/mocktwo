import React from "react";
import {
  InfoModal,
  InfoModalLead,
  InfoModalSection,
  InfoModalSteps,
  InfoModalDisclaimer,
} from "./InfoModal.tsx";
import { TIMELINE_MODAL_DATA } from "../../data/infoModalContent.ts";

export interface TimelineExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const TimelineExplainerModal: React.FC<TimelineExplainerModalProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  if (!isOpen) return null;

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={TIMELINE_MODAL_DATA.title}
      subtitle={TIMELINE_MODAL_DATA.subtitle}
      accentColor={TIMELINE_MODAL_DATA.accent}
      triggerRef={triggerRef}
    >
      {/* Section 1: What this graph denotes */}
      <InfoModalSection header={TIMELINE_MODAL_DATA.whatThisGraphSectionTitle}>
        <InfoModalLead>{TIMELINE_MODAL_DATA.whatThisGraphParagraph}</InfoModalLead>
      </InfoModalSection>

      {/* Section 2: How Readings are Calculated */}
      <InfoModalSection header={TIMELINE_MODAL_DATA.howCalculatedSectionTitle}>
        <InfoModalSteps
          steps={[
            {
              number: 1,
              title: "Pulse Curve (Solid Blue Line):",
              description: TIMELINE_MODAL_DATA.step1Description,
              formula: TIMELINE_MODAL_DATA.step1Formula,
            },
            {
              number: 2,
              title: "Sensor Warm-Up (0:00 to 0:12 Shaded Region):",
              description: TIMELINE_MODAL_DATA.step2Description,
            },
            {
              number: 3,
              title: "Speaking Bands (Light Blue Shaded Columns):",
              description: TIMELINE_MODAL_DATA.step3Description,
            },
            {
              number: 4,
              title: "Peak Stress Moments (Purple Markers):",
              description: TIMELINE_MODAL_DATA.step4Description,
              formula: TIMELINE_MODAL_DATA.step4Formula,
              note: TIMELINE_MODAL_DATA.step4Note,
            },
            {
              number: 5,
              title: "Resting Baseline (Dashed Line):",
              description: TIMELINE_MODAL_DATA.step5Description,
            },
          ]}
        />
      </InfoModalSection>

      {/* Section 3: Privacy & Wellness Footnote */}
      <InfoModalDisclaimer text={TIMELINE_MODAL_DATA.disclaimer} />
    </InfoModal>
  );
};
