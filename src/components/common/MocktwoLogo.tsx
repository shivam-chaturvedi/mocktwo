import React from "react";
import { MOCKTWO_LOGO_SRC } from "../../assets/logoBase64";

interface MocktwoLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const MocktwoLogo: React.FC<MocktwoLogoProps> = ({
  size = 20,
  className = "",
  style = {},
}) => {
  const borderRadius = Math.max(3, Math.round(size * 0.22));

  return (
    <img
      src={MOCKTWO_LOGO_SRC}
      alt="mocktwo logo"
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
        ...style,
      }}
    />
  );
};
