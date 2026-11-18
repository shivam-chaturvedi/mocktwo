import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Calculates WCAG 2.2 Relative Luminance for sRGB channel (0-255).
 */
function channelLuminance(val: number): number {
  const s = val / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * Composite an RGBA foreground over an RGB opaque background.
 */
function composite(
  fg: [number, number, number, number],
  bg: [number, number, number]
): [number, number, number] {
  const [r1, g1, b1, a] = fg;
  const [r2, g2, b2] = bg;
  return [
    Math.round(r1 * a + r2 * (1 - a)),
    Math.round(g1 * a + g2 * (1 - a)),
    Math.round(b1 * a + b2 * (1 - a)),
  ];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb;
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(
  fg: [number, number, number, number],
  bgHex: string
): number {
  const bgRgb = hexToRgb(bgHex);
  const compositeRgb = composite(fg, bgRgb);
  const l1 = relativeLuminance(compositeRgb);
  const l2 = relativeLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Info Modal Token Contrast Ratios (WCAG 2.2 Numerical Proof)", () => {
  // Theme Surfaces
  const DARK_SURFACE = "#1e1e20"; // Modal elevated surface (dark)
  const DARK_INSET = "#2e2e30"; // Inset surface for equation/steps (dark)
  const LIGHT_SURFACE = "#ffffff"; // Modal elevated surface (light)
  const LIGHT_INSET = "#f2f2f6"; // Inset surface for equation/steps (light)

  // Typography Tokens
  const DARK_PRIMARY: [number, number, number, number] = [255, 255, 255, 0.95];
  const DARK_SECONDARY: [number, number, number, number] = [255, 255, 255, 0.70];
  const LIGHT_PRIMARY: [number, number, number, number] = [0, 0, 0, 0.92];
  const LIGHT_SECONDARY: [number, number, number, number] = [0, 0, 0, 0.68];

  it("Dark Theme Primary Text achieves AAA (>= 7:1) on modal surface", () => {
    const ratio = contrastRatio(DARK_PRIMARY, DARK_SURFACE);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0, got ${ratio.toFixed(2)}`);
  });

  it("Dark Theme Primary Text achieves AAA (>= 7:1) on inset level", () => {
    const ratio = contrastRatio(DARK_PRIMARY, DARK_INSET);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0, got ${ratio.toFixed(2)}`);
  });

  it("Dark Theme Secondary Text achieves AA (>= 4.5:1) on modal surface", () => {
    const ratio = contrastRatio(DARK_SECONDARY, DARK_SURFACE);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5, got ${ratio.toFixed(2)}`);
  });

  it("Dark Theme Secondary Text achieves AA (>= 4.5:1) on inset level", () => {
    const ratio = contrastRatio(DARK_SECONDARY, DARK_INSET);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5, got ${ratio.toFixed(2)}`);
  });

  it("Light Theme Primary Text achieves AAA (>= 7:1) on modal surface", () => {
    const ratio = contrastRatio(LIGHT_PRIMARY, LIGHT_SURFACE);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0, got ${ratio.toFixed(2)}`);
  });

  it("Light Theme Primary Text achieves AAA (>= 7:1) on inset level", () => {
    const ratio = contrastRatio(LIGHT_PRIMARY, LIGHT_INSET);
    assert.ok(ratio >= 7.0, `Expected ratio >= 7.0, got ${ratio.toFixed(2)}`);
  });

  it("Light Theme Secondary Text achieves AA (>= 4.5:1) on modal surface", () => {
    const ratio = contrastRatio(LIGHT_SECONDARY, LIGHT_SURFACE);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5, got ${ratio.toFixed(2)}`);
  });

  it("Light Theme Secondary Text achieves AA (>= 4.5:1) on inset level", () => {
    const ratio = contrastRatio(LIGHT_SECONDARY, LIGHT_INSET);
    assert.ok(ratio >= 4.5, `Expected ratio >= 4.5, got ${ratio.toFixed(2)}`);
  });
});
