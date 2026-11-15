import React from "react";
import type { InteractionType } from "../../types";
import {
  Briefcase,
  TrendingUp,
  Presentation,
  Handshake,
  MessageCircleWarning,
  Headset,
  ConciergeBell,
  AlertTriangle,
  Compass,
  Crown,
  Building,
  HeartHandshake
} from "lucide-react";

interface CategoryIconProps {
  type?: InteractionType | string;
  category?: InteractionType | string;
  size?: number; // default 28
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ type, category, size = 28 }) => {
  const actualType = category || type || "Interviews";

  const getCategoryConfig = () => {
    switch (actualType) {
      case "Interviews":
        return {
          bg: "var(--accent-blue)",
          icon: <Briefcase size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Sales & Pitches":
        return {
          bg: "var(--accent-green)",
          icon: <TrendingUp size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Presentations":
        return {
          bg: "var(--accent-purple)",
          icon: <Presentation size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Negotiation":
        return {
          bg: "var(--accent-orange)",
          icon: <Handshake size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Difficult Conversations":
        return {
          bg: "var(--accent-red)",
          icon: <MessageCircleWarning size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Customer Service":
        return {
          bg: "var(--accent-teal)",
          icon: <Headset size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Hospitality":
        return {
          bg: "var(--accent-pink)",
          icon: <ConciergeBell size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      // Legacy fallbacks
      case "Escalation Management":
        return {
          bg: "var(--accent-orange)",
          icon: <AlertTriangle size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Concierge":
        return {
          bg: "var(--accent-teal)",
          icon: <Compass size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Executive Lounge":
        return {
          bg: "var(--accent-purple)",
          icon: <Crown size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      case "Front Desk":
        return {
          bg: "var(--accent-indigo)",
          icon: <Building size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
      default:
        return {
          bg: "var(--accent-blue)",
          icon: <HeartHandshake size={Math.round(size * 0.55)} strokeWidth={2} color="#ffffff" />
        };
    }
  };

  const { bg, icon } = getCategoryConfig();

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "7px",
        backgroundColor: bg,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)"
      }}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
};
