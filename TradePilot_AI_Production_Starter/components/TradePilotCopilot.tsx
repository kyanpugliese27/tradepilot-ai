"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type CopilotResponse = {
  answer?: string;
  error?: string;
};

const storageKey =
  "Norvexa-copilot-session";

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I’m Norvexa Copilot. Ask me about your paper portfolio, a stock, today’s market, your watchlist, or an investing concept.",
  createdAt: new Date().toISOString(),
};

const suggestions = [
  "Summarize my paper portfolio.",
  "Why did my portfolio move today?",
  "Which holding is my largest risk?",
  "Summarize today's market.",
  "Compare NVDA and AMD.",
  "Explain P/E ratio simply.",
];

export default function NorvexaCopilot() {
  const pathname = usePathname();

  const [open, setOpen] =
    useState(false);

  const [messages, setMessages] =
    useState<Message[]>([
      welcomeMessage,
    ]);

  const [input, setInput] =
    useState("");

  const [thinking, setThinking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loaded, setLoaded] =
    useState(false);

  const endRef =
    useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const canSend = useMemo(
    () =>
      input.trim().length > 0 &&
      !thinking,
    [input, thinking]
  );

  useEffect(() => {
    try {
      const stored =
        window.sessionStorage.getItem(
          storageKey
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          setMessages(parsed);
        }
      }
    } catch {
      window.sessionStorage.removeItem(
        storageKey
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify(messages)
    );
  }, [loaded, messages]);

  useEffect(() => {
    if (!open) {
      return;
    }

    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, thinking, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [open]);

  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      130
    )}px`;
  }, [input]);

  async function sendMessage(
    question: string
  ) {
    const trimmed =
      question.trim();

    if (!trimmed || thinking) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt:
        new Date().toISOString(),
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setInput("");
    setThinking(true);
    setError("");

    try {
      const response = await fetch(
        "/api/copilot",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            pathname,
            messages: nextMessages
              .filter(
                (message) =>
                  message.id !== "welcome"
              )
              .map((message) => ({
                role: message.role,
                content:
                  message.content,
              })),
          }),
        }
      );

      const data =
        (await response.json()) as CopilotResponse;

      if (
        !response.ok ||
        !data.answer
      ) {
        throw new Error(
          data.error ||
            "Unable to complete the Copilot request."
        );
      }

      const assistantMessage: Message =
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          createdAt:
            new Date().toISOString(),
        };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete the Copilot request."
      );
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (canSend) {
        sendMessage(input);
      }
    }
  }

  function clearChat() {
    setMessages([welcomeMessage]);
    setInput("");
    setError("");

    window.sessionStorage.removeItem(
      storageKey
    );
  }

  return (
    <>
      {open && (
        <section
          aria-label="Norvexa Copilot"
          style={panelStyle}
        >
          <div style={headerStyle}>
            <div>
              <p style={eyebrowStyle}>
                Norvexa intelligence
              </p>

              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                AI Copilot
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#9ca3af",
                  fontSize: 11,
                }}
              >
                Context-aware across your app
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={clearChat}
                style={smallButtonStyle}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close Copilot"
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>
          </div>

          <div style={messagesStyle}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}

            {thinking && (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-start",
                }}
              >
                <div style={assistantBubbleStyle}>
                  Researching...
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {messages.length === 1 && (
            <div style={suggestionsStyle}>
              {suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      sendMessage(
                        suggestion
                      )
                    }
                    style={
                      suggestionButtonStyle
                    }
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          )}

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={formStyle}
          >
            <div style={inputWrapStyle}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                rows={1}
                disabled={thinking}
                placeholder="Ask Norvexa Copilot..."
                style={textareaStyle}
              />

              <button
                type="submit"
                disabled={!canSend}
                style={{
                  ...sendButtonStyle,
                  opacity: canSend
                    ? 1
                    : 0.55,
                  cursor: canSend
                    ? "pointer"
                    : "not-allowed",
                }}
              >
                Send
              </button>
            </div>

            <p
              style={{
                margin: "7px 2px 0",
                color: "#6b7280",
                fontSize: 10,
                lineHeight: 1.45,
              }}
            >
              Educational only. Not financial
              advice.
            </p>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={
          open
            ? "Close Norvexa Copilot"
            : "Open Norvexa Copilot"
        }
        onClick={() =>
          setOpen((current) => !current)
        }
        style={floatingButtonStyle}
      >
        {open ? "×" : "AI"}
      </button>

      <style jsx global>{`
        @media (max-width: 620px) {
          [aria-label="Norvexa Copilot"] {
            left: 10px !important;
            right: 10px !important;
            bottom: 78px !important;
            width: auto !important;
            height: min(
              72vh,
              650px
            ) !important;
          }
        }
      `}</style>
    </>
  );
}

function MessageBubble({
  message,
}: {
  message: Message;
}) {
  const user =
    message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: user
          ? "flex-end"
          : "flex-start",
      }}
    >
      <div
        style={
          user
            ? userBubbleStyle
            : assistantBubbleStyle
        }
      >
        <FormattedText
          content={message.content}
        />

        <p
          style={{
            margin: "7px 0 0",
            color: "#6b7280",
            fontSize: 9,
            textAlign: user
              ? "right"
              : "left",
          }}
        >
          {user
            ? "You"
            : "Norvexa"}{" "}
          ·{" "}
          {new Date(
            message.createdAt
          ).toLocaleTimeString(
            "en-US",
            {
              hour: "numeric",
              minute: "2-digit",
            }
          )}
        </p>
      </div>
    </div>
  );
}

function FormattedText({
  content,
}: {
  content: string;
}) {
  return (
    <div
      style={{
        lineHeight: 1.58,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {content}
    </div>
  );
}

const panelStyle = {
  position: "fixed" as const,
  right: 22,
  bottom: 88,
  zIndex: 10000,
  width: 390,
  height: 620,
  maxHeight: "75vh",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  border:
    "1px solid rgba(96,165,250,0.28)",
  borderRadius: 18,
  background: "#091321",
  color: "#f9fafb",
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.5)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: 16,
  borderBottom:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(255,255,255,0.02))",
};

const eyebrowStyle = {
  margin: "0 0 4px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
};

const messagesStyle = {
  flex: 1,
  overflowY: "auto" as const,
  display: "flex",
  flexDirection: "column" as const,
  gap: 11,
  padding: 15,
};

const userBubbleStyle = {
  maxWidth: "86%",
  padding: "11px 13px",
  border:
    "1px solid rgba(96,165,250,0.25)",
  borderRadius: "14px 14px 4px 14px",
  background:
    "rgba(37,99,235,0.14)",
  color: "#f3f4f6",
  fontSize: 13,
};

const assistantBubbleStyle = {
  maxWidth: "88%",
  padding: "11px 13px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px 14px 14px 4px",
  background:
    "rgba(255,255,255,0.04)",
  color: "#f3f4f6",
  fontSize: 13,
};

const suggestionsStyle = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap" as const,
  padding: "0 15px 12px",
};

const suggestionButtonStyle = {
  padding: "7px 9px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const formStyle = {
  padding: 13,
  borderTop:
    "1px solid rgba(255,255,255,0.08)",
  background: "#0b1524",
};

const inputWrapStyle = {
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  padding: 8,
  border:
    "1px solid rgba(255,255,255,0.11)",
  borderRadius: 12,
  background: "#07111f",
};

const textareaStyle = {
  flex: 1,
  minHeight: 38,
  maxHeight: 130,
  resize: "none" as const,
  overflowY: "auto" as const,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#f9fafb",
  font: "inherit",
  fontSize: 13,
  lineHeight: 1.5,
  padding: "8px 6px",
};

const sendButtonStyle = {
  padding: "9px 11px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
};

const floatingButtonStyle = {
  position: "fixed" as const,
  right: 22,
  bottom: 22,
  zIndex: 10001,
  width: 54,
  height: 54,
  border: "none",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, #2563eb, #60a5fa)",
  color: "white",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow:
    "0 12px 30px rgba(37,99,235,0.45)",
};

const smallButtonStyle = {
  padding: "6px 8px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  background: "transparent",
  color: "#9ca3af",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const closeButtonStyle = {
  width: 30,
  height: 30,
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  background:
    "rgba(255,255,255,0.04)",
  color: "#f3f4f6",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
};

const errorStyle = {
  margin: "0 13px 10px",
  padding: 10,
  border:
    "1px solid rgba(255,107,107,0.3)",
  borderRadius: 9,
  background:
    "rgba(255,107,107,0.08)",
  color: "#ff8a8a",
  fontSize: 11,
};