import React from "react";
import {
  Activity,
  Heart,
  Clock,
  Gauge,
  Wind,
  Eye,
  Mic,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  InfoModal,
  InfoModalLead,
  InfoModalSection,
  InfoModalCallout,
  InfoModalEquation,
  InfoModalBenchmark,
  InfoModalDisclaimer,
} from "./InfoModal.tsx";
import {
  type MetricType,
  METRIC_MODAL_DEFINITIONS,
} from "../../data/infoModalContent.ts";
import { WELLNESS_DISCLAIMER } from "../../services/biometrics.ts";

export type { MetricType };

export interface MetricExplainerModalProps {
  isOpen: boolean;
  metricType: MetricType | null;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const METRIC_ICONS: Record<MetricType, React.ReactNode> = {
  recovery: <Clock size={16} />,
  pulse: <Heart size={16} />,
  hrv: <Activity size={16} />,
  baevsky: <Gauge size={16} />,
  breathing: <Wind size={16} />,
  blinks: <Eye size={16} />,
  speaking: <Mic size={16} />,
  composure: <Activity size={16} />,
  autonomic_balance: <Activity size={16} />,
  expression_calm: <Eye size={16} />,
};

export const MetricExplainerModal: React.FC<MetricExplainerModalProps> = ({
  isOpen,
  metricType,
  onClose,
  triggerRef,
}) => {
  if (!isOpen || !metricType || !METRIC_MODAL_DEFINITIONS[metricType]) return null;

  const content = METRIC_MODAL_DEFINITIONS[metricType];

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={content.title}
      subtitle={content.category}
      accentColor={content.accent}
      icon={METRIC_ICONS[metricType]}
      triggerRef={triggerRef}
    >
      {/* Section 1: In Simple Words */}
      <InfoModalSection header="What It Means in Simple Terms">
        <InfoModalLead>{content.simpleExplanation}</InfoModalLead>
      </InfoModalSection>

      {/* Section 2: Why It Matters in Real Conversations */}
      <InfoModalCallout
        title="Why It Matters"
        icon={<Target size={14} style={{ color: "var(--text-secondary)" }} />}
      >
        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {content.whyItMatters}
        </p>
      </InfoModalCallout>

      {/* Section 3: Mathematical Formula */}
      <InfoModalSection header={content.formulaLabel}>
        <InfoModalEquation formula={content.formula} />
      </InfoModalSection>

      {/* Section 4: What Numbers Mean & Target Range */}
      <InfoModalSection header="Target Benchmark">
        <InfoModalBenchmark
          targetRange={content.targetRange}
          targetDescription={content.targetDescription}
        />
      </InfoModalSection>

      {/* Section 5: How To Improve */}
      <InfoModalCallout
        title="How to Improve in Practice"
        icon={<TrendingUp size={14} style={{ color: "var(--accent-blue)" }} />}
      >
        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {content.howToImprove}
        </p>
      </InfoModalCallout>

      {/* Footnote */}
      <InfoModalDisclaimer text={WELLNESS_DISCLAIMER} />
    </InfoModal>
  );
};
