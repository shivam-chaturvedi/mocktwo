import React from "react";
import type { InteractionType } from "../../types";
import {
  AlertTriangle,
  Compass,
  Crown,
  Building,
  HeartHandshake
} from "lucide-react";

interface CategoryIconProps {
  type?: InteractionType;
  category?: InteractionType;
  size?: number; // default 28
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ type, category, size = 28 }) => {
  const actualType = category || type || "Front Desk";

  const getCategoryConfig = () => {
    switch (actualType) {
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
      case "Guest Services":
      default:
        return {
          bg: "var(--accent-pink)",
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

