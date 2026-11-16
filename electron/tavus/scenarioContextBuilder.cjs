const MAX_WORDS = 750;

const asList = (v) => {
  try {
    const a = Array.isArray(v) ? v : JSON.parse(v || "[]");
    return (Array.isArray(a) ? a : []).filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  } catch {
    return [];
  }
};

const countWords = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function buildScenarioContext(scenario) {
  const title = String(scenario?.title ?? "").trim() || "Untitled scenario";
  const challenges = asList(scenario?.keyChallenges).slice(0, 5);
  const objectives = asList(scenario?.learningObjectives).slice(0, 5);

  const header = [
    `# SCENARIO: ${title}`,
    `Category: ${scenario?.interactionType || "General"}`,
    `Difficulty: ${scenario?.difficulty || "Intermediate"}`,
  ].join("\n");

  const tail = [];
  if (challenges.length) {
    tail.push(
      `## HOW YOU CHALLENGE THE USER\nRaise these naturally during the conversation:\n${challenges
        .map((c) => `- ${c}`)
        .join("\n")}`
    );
  }
  if (objectives.length) {
    tail.push(
      `## WHAT THE USER IS PRACTICING\n${objectives
        .map((o) => `- ${o}`)
        .join("\n")}\nTest these thoroughly. Do not concede until the user shows them clearly.`
    );
  }

  const budget = Math.max(0, MAX_WORDS - countWords([header, ...tail].join("\n\n")) - 4);
  const sitWords = String(scenario?.context ?? "").trim().split(/\s+/).filter(Boolean);
  const truncated = sitWords.length > budget;
  const situation = (truncated ? sitWords.slice(0, budget) : sitWords).join(" ");
  const context = [header, situation ? `## SITUATION\n${situation}` : null, ...tail].filter(Boolean).join("\n\n");

  return {
    context,
    wordCount: countWords(context),
    truncated,
    greeting: scenario?.openingLine?.trim() || null,
  };
}

module.exports = {
  buildScenarioContext,
  MAX_WORDS,
  asList,
  countWords,
};
