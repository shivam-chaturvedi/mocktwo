import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Empty State Duplicate CTA Prevention", () => {
  it("ScenariosScreen contains guards preventing duplicate primary CTAs", () => {
    const file = path.join(process.cwd(), "src/screens/ScenariosScreen.tsx");
    const content = fs.readFileSync(file, "utf8");

    // 1. Must check isCurrentTabEmpty to switch between full-width centered empty state and split view
    assert.ok(content.includes("isCurrentTabEmpty"), "Must define isCurrentTabEmpty check");

    // 2. Toolbar New button must only render when !isCurrentTabEmpty
    assert.ok(
      content.includes("!isCurrentTabEmpty &&"),
      "Toolbar New button must be hidden when tab is empty"
    );

    // 3. Sub-tabs must never render '(0)'
    assert.ok(
      !content.includes("Library (0)"),
      "Must not hardcode Library (0)"
    );
    assert.ok(
      !content.includes("Mine (0)"),
      "Must not hardcode Mine (0)"
    );
    assert.ok(
      !content.includes("Personas (0)"),
      "Must not hardcode Personas (0)"
    );

    // 4. In search/filter 0 matches state, right pane placeholder must be quiet and non-interactive (no button)
    // The placeholder should render an icon and a text line, never an action button
    const quietPlaceholderMatches = content.match(/No scenario selected|No persona selected/g);
    assert.ok(quietPlaceholderMatches && quietPlaceholderMatches.length >= 2);

    // Ensure the quiet placeholder doesn't have an action button or EmptyState with primaryAction
    assert.ok(
      !content.includes('<EmptyState\n                icon={<Compass size={24} />}\n                title="No scenario selected"'),
      "Must not render interactive EmptyState with primaryAction for right pane placeholder"
    );
  });

  it("QuickPracticeModal has Describe and Scenarios modes with proper CTA hierarchy", () => {
    const file = path.join(process.cwd(), "src/components/common/QuickPracticeModal.tsx");
    const content = fs.readFileSync(file, "utf8");

    // Must have Describe and Scenarios modes
    assert.ok(content.includes('mode === "describe"'));
    assert.ok(content.includes('mode === "scenarios"'));

    // Must call createAdHoc
    assert.ok(content.includes("createAdHoc"));

    // Suggestion chips must NOT auto-submit (must just set draftText and focus)
    assert.ok(!content.includes("handleLaunchQuickTopic(sug)"));
  });
});
