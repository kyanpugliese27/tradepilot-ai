"use client";

type SuggestedQuestionsProps = {
  onSelect: (question: string) => void;
};

const questions = [
  {
    category: "Compare",
    title: "Compare Apple vs Microsoft",
    prompt:
      "Compare Apple and Microsoft as businesses. Explain their strengths, risks, and major differences in simple language.",
  },
  {
    category: "Portfolio",
    title: "Analyze my portfolio",
    prompt:
      "Analyze my paper-trading portfolio for concentration, diversification, visible risk, and cash allocation.",
  },
  {
    category: "Learn",
    title: "Teach me P/E ratio",
    prompt:
      "Explain the P/E ratio like I am a beginner. Include a simple example and explain its limitations.",
  },
  {
    category: "Research",
    title: "Research NVIDIA",
    prompt:
      "Give me an educational research checklist for NVIDIA, including business model, risks, competitors, valuation questions, and what to monitor.",
  },
  {
    category: "Markets",
    title: "Why does the market fall?",
    prompt:
      "Explain the main reasons the stock market can fall in a day, using beginner-friendly examples.",
  },
  {
    category: "Earnings",
    title: "Explain an earnings report",
    prompt:
      "Teach me how to read a company earnings report, including revenue, EPS, guidance, margins, and cash flow.",
  },
];

export default function SuggestedQuestions({
  onSelect,
}: SuggestedQuestionsProps) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            className="muted"
            style={{
              margin: "0 0 5px",
              fontSize: "12px",
              fontWeight: 750,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Start exploring
          </p>

          <h3 style={{ margin: 0 }}>Suggested questions</h3>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
          marginTop: "14px",
        }}
      >
        {questions.map((question) => (
          <button
            key={question.title}
            type="button"
            onClick={() => onSelect(question.prompt)}
            style={{
              padding: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.03)",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
              transition:
                "transform 160ms ease, border-color 160ms ease, background 160ms ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform =
                "translateY(-2px)";
              event.currentTarget.style.borderColor =
                "rgba(96,165,250,0.35)";
              event.currentTarget.style.background =
                "rgba(96,165,250,0.06)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform =
                "translateY(0)";
              event.currentTarget.style.borderColor =
                "rgba(255,255,255,0.08)";
              event.currentTarget.style.background =
                "rgba(255,255,255,0.03)";
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "4px 7px",
                borderRadius: "999px",
                background: "rgba(37,99,235,0.12)",
                color: "#93c5fd",
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {question.category}
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                fontSize: "14px",
              }}
            >
              {question.title}
            </strong>
          </button>
        ))}
      </div>
    </section>
  );
}