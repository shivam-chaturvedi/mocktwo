/**
 * Equation Tokenizer for Info Modals
 *
 * Tokenizes mathematical and telemetry formulas into colored spans with soft-wrap opportunities (<wbr/>)
 * at operators and commas, guaranteeing that:
 * 1. The rendered text byte-for-byte concatenates to the EXACT original formula string.
 * 2. Variables, function names, numbers, and operators receive distinct visual weights and colors.
 * 3. Expressions never break mid-variable or mid-number.
 */

export type EquationTokenType =
  | "function"
  | "variable"
  | "number"
  | "operator"
  | "whitespace"
  | "text";

export interface EquationToken {
  text: string;
  type: EquationTokenType;
}

const KNOWN_FUNCTIONS = new Set([
  "clamp",
  "max",
  "round",
  "Time",
  "sqrt",
  "Rolling12sMean",
]);

const KNOWN_PROSE_WORDS = new Set([
  "where",
  "is",
  "and",
  "in",
  "per",
  "valid",
  "range",
  "mode",
  "interval",
  "spread",
  "amplitude",
  "seconds",
  "second",
  "window",
  "Window",
  "cycles",
  "Cycles",
  "edges",
  "Edges",
  "rising",
  "Rising",
  "closure",
  "Closure",
  "eyelid",
  "Eyelid",
  "debounced",
  "Debounced",
  "telemetry",
  "steady",
  "optical",
  "continuous",
  "requires",
  "Requires",
  "sessions",
  "active",
  "baseline",
  "with",
  "lighting",
  "studio",
  "direct",
  "when",
  "dim",
  "uncalibrated",
  "displays",
  "unmeasured",
  "prevent",
  "false",
  "estimations",
]);

export function tokenizeEquation(formula: string): EquationToken[] {
  const tokens: EquationToken[] = [];
  // Token matching pattern:
  // 1: Numbers (including decimals)
  // 2: Words / Identifiers (letters, underscores, %, +, -)
  // 3: Operators & Punctuation (+, -, *, /, ×, =, <, >, <=, >=, (, ), ,, etc.)
  // 4: Whitespace (including newlines)
  // 5: Any other single character
  const regex = /(\s+)|([0-9]+(?:\.[0-9]+)?)|([a-zA-Z_][a-zA-Z0-9_%]*)|(<=|>=|==|!=|[+\-×*/=<>(),:;Σ²])|([^a-zA-Z0-9_\s+\-×*/=<>(),:;Σ²]+)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(formula)) !== null) {
    const [full] = match;
    if (match[1]) {
      tokens.push({ text: full, type: "whitespace" });
    } else if (match[2]) {
      tokens.push({ text: full, type: "number" });
    } else if (match[3]) {
      if (KNOWN_FUNCTIONS.has(full)) {
        tokens.push({ text: full, type: "function" });
      } else if (KNOWN_PROSE_WORDS.has(full.toLowerCase())) {
        tokens.push({ text: full, type: "text" });
      } else {
        tokens.push({ text: full, type: "variable" });
      }
    } else if (match[4]) {
      tokens.push({ text: full, type: "operator" });
    } else {
      tokens.push({ text: full, type: "text" });
    }
  }

  return tokens;
}

/**
 * Asserts copy parity: tokenized string must equal original string exactly.
 */
export function verifyEquationParity(original: string): boolean {
  const tokens = tokenizeEquation(original);
  const reconstructed = tokens.map((t) => t.text).join("");
  return reconstructed === original;
}
