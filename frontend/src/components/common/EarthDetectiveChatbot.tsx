
import { useState, type FormEvent } from "react";
import {
  Bot,
  MessageCircle,
  Send,
  X,
  Sparkles,
} from "lucide-react";

type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

const suggestions = [
  "What is Earth System Fingerprints?",
  "Explain LST, NDVI and Soil Moisture",
  "What is a significant trend?",
  "Why are NASA datasets important?",
];

function getAnswer(question: string): string {
  const q = question.toLowerCase();

  if (
    q.includes("what is") ||
    q.includes("about") ||
    q.includes("project") ||
    q.includes("fingerprint")
  ) {
    return "Earth System Fingerprints is an Earth-observation research platform. It investigates environmental changes across Bangladesh, the Indo-Gangetic Plain and the Amazon Frontier using satellite-derived variables such as Land Surface Temperature (LST), vegetation health (NDVI) and soil moisture.";
  }

  if (
    q.includes("lst") ||
    q.includes("temperature") ||
    q.includes("heat")
  ) {
    return "LST means Land Surface Temperature. It measures how hot the Earth's surface is. In this project, MODIS MOD11A1 satellite observations are used to investigate long-term surface temperature trends.";
  }

  if (
    q.includes("ndvi") ||
    q.includes("vegetation") ||
    q.includes("plant")
  ) {
    return "NDVI stands for Normalized Difference Vegetation Index. It is derived from satellite observations and helps assess vegetation greenness and condition. This project uses MODIS MOD13Q1 data.";
  }

  if (
    q.includes("soil") ||
    q.includes("moisture") ||
    q.includes("smap")
  ) {
    return "Soil moisture describes the water contained in soil. This project uses NASA SMAP observations. Data availability and quality flags must be checked before interpreting a trend.";
  }

  if (
    q.includes("significant") ||
    q.includes("p-value") ||
    q.includes("p value") ||
    q.includes("mann")
  ) {
    return "The Mann–Kendall test is used to assess evidence of a monotonic trend. A p-value below a chosen significance threshold (often 0.05) indicates statistical evidence against the no-trend hypothesis. It does not prove causation or measure the size of the trend.";
  }

  if (
    q.includes("sen") ||
    q.includes("slope") ||
    q.includes("rate")
  ) {
    return "Sen's slope estimates the magnitude and direction of a trend over time. A positive slope indicates an increasing trend, while a negative slope indicates a decreasing trend. Always interpret the slope together with its variable-specific unit and statistical significance.";
  }

  if (
    q.includes("nasa") ||
    q.includes("satellite") ||
    q.includes("data")
  ) {
    return "NASA Earth-observation missions provide measurements of our changing planet. This project works with MODIS products for land surface temperature and vegetation, and SMAP for soil moisture. Data quality and missing observations must be considered during analysis.";
  }

  if (
    q.includes("region") ||
    q.includes("bangladesh") ||
    q.includes("amazon") ||
    q.includes("indo-gangetic") ||
    q.includes("igp")
  ) {
    return "The project focuses on three primary analysis regions: Bangladesh, the Indo-Gangetic Plain (IGP), and the Amazon Frontier. They provide contrasting geographical contexts for investigating environmental trends.";
  }

  return "I can help explain this project's regions, NASA datasets, LST, NDVI, soil moisture, Sen's slope and Mann–Kendall significance. Try asking one of these topics.";
}

export default function EarthDetectiveChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hello! I'm Earth Detective Assistant. Ask me about the project, NASA datasets, environmental variables or trend analysis.",
    },
  ]);

  function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    const answer = getAnswer(trimmed);

    setMessages((previous) => [
      ...previous,
      { role: "user", text: trimmed },
      { role: "bot", text: answer },
    ]);

    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div
      style={{
        position: "fixed",
        right: "26px",
        bottom: "24px",
        zIndex: 9999,
        fontFamily: "inherit",
      }}
    >
      {isOpen && (
        <div
          style={{
            width: "min(370px, calc(100vw - 32px))",
            height: "490px",
            maxHeight: "calc(100vh - 110px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(67,185,255,0.35)",
            borderRadius: "16px",
            background: "#081321",
            boxShadow: "0 15px 55px rgba(0,0,0,0.55)",
            marginBottom: "14px",
            color: "#e8f4ff",
          }}
        >
          <div
            style={{
              padding: "15px",
              display: "flex",
              alignItems: "center",
              gap: "11px",
              background: "#0c2034",
              borderBottom: "1px solid rgba(67,185,255,0.2)",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "rgba(67,185,255,0.15)",
                color: "#43b9ff",
              }}
            >
              <Bot size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>
                Earth Detective
              </div>
              <div style={{ fontSize: "11px", color: "#8ba8c0" }}>
                Project knowledge assistant
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
              style={{
                border: 0,
                background: "transparent",
                color: "#a9c4dc",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  background:
                    message.role === "user" ? "#123b5a" : "#122438",
                  border:
                    message.role === "bot"
                      ? "1px solid rgba(67,185,255,0.13)"
                      : "1px solid transparent",
                  color: "#e8f4ff",
                  fontSize: "12px",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.text}
              </div>
            ))}

            {messages.length === 1 && (
              <div style={{ marginTop: "5px" }}>
                <div
                  style={{
                    color: "#8ba8c0",
                    fontSize: "11px",
                    marginBottom: "9px",
                  }}
                >
                  <Sparkles size={12} style={{ verticalAlign: "middle" }} />{" "}
                  Suggested questions
                </div>

                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 10px",
                      marginBottom: "7px",
                      borderRadius: "9px",
                      border: "1px solid rgba(67,185,255,0.2)",
                      background: "#0d1d2e",
                      color: "#b9dfff",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              gap: "8px",
              padding: "12px",
              borderTop: "1px solid rgba(67,185,255,0.18)",
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about Earth science..."
              style={{
                flex: 1,
                minWidth: 0,
                padding: "11px",
                borderRadius: "9px",
                border: "1px solid #25415b",
                outline: "none",
                background: "#0c1b2b",
                color: "#ffffff",
                fontSize: "12px",
              }}
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim()}
              style={{
                width: "40px",
                border: 0,
                borderRadius: "9px",
                background: "#168bd0",
                color: "white",
                cursor: "pointer",
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Open Earth Detective Assistant"
        style={{
          marginLeft: "auto",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          border: "1px solid rgba(120,210,255,0.5)",
          background: "linear-gradient(135deg, #168bd0, #07518c)",
          color: "white",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          boxShadow: "0 5px 25px rgba(0,130,220,0.35)",
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={25} />}
      </button>
    </div>
  );
}
