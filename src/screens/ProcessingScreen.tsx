import React, { useState, useEffect } from "react";
import { useApp } from "../context";
import { Card } from "../components/common/Card";
import { Check, Loader2 } from "lucide-react";

export const ProcessingScreen: React.FC = () => {
  const { navigateTo, selectedScenario } = useApp();
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    "Transcribing conversational dialogue",
    "Evaluating core communication competencies",
    "Synthesizing guest resolution indicators",
    "Compiling performance report"
  ];

  useEffect(() => {
    if (currentStage < stages.length) {
      const timer = setTimeout(() => {
        setCurrentStage((prev) => prev + 1);
      }, 550);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        navigateTo("recordings");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentStage, stages.length, navigateTo]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "var(--bg-window)"
      }}
    >
      <div style={{ maxWidth: "460px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: "0 0 6px 0"
            }}
          >
            Processing Session
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0 }}>
            Analyzing coaching dialogue with {selectedScenario.guestName}
          </p>
        </div>

        <Card style={{ padding: "22px 26px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {stages.map((stage, index) => {
              const isDone = index < currentStage;
              const isCurrent = index === currentStage;

              return (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "18px", height: "18px", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {isDone ? (
                      <Check size={16} strokeWidth={2.2} style={{ color: "var(--accent-green)" }} />
                    ) : isCurrent ? (
                      <Loader2 size={16} className="spin" style={{ color: "var(--accent-blue)" }} />
                    ) : (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "var(--separator)"
                        }}
                      />
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: "13.5px",
                      fontWeight: isCurrent ? 550 : 450,
                      color: isDone || isCurrent ? "var(--text-primary)" : "var(--text-tertiary)"
                    }}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
