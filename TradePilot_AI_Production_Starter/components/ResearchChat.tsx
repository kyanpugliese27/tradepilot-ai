"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SuggestedQuestions from "@/components/SuggestedQuestions";

type ResearchMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type SavedConversation = {
  id: string;
  title: string;
  messages: ResearchMessage[];
  createdAt: string;
  updatedAt: string;
};

type ResearchResponse = {
  answer?: string;
  error?: string;
  context?: {
    holdingsIncluded?: number;
    watchlistIncluded?: number;
    liveSymbolsIncluded?: string[];
  };
};

const welcomeMessage: ResearchMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to TradePilot AI Research. Ask about a company, compare stocks, learn an investing concept, or review your paper-trading portfolio.",
  createdAt: new Date().toISOString(),
};

export default function ResearchChat() {
  const [messages, setMessages] = useState<
    ResearchMessage[]
  >([welcomeMessage]);

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] =
    useState(false);
  const [error, setError] = useState("");

  const [conversations, setConversations] =
    useState<SavedConversation[]>([]);
  const [
    currentConversationId,
    setCurrentConversationId,
  ] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] =
    useState(true);
  const [savingConversation, setSavingConversation] =
    useState(false);
  const [conversationError, setConversationError] =
    useState("");

  const [lastContext, setLastContext] =
    useState<ResearchResponse["context"] | null>(
      null
    );

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(
    () =>
      input.trim().length > 0 && !isThinking,
    [input, isThinking]
  );

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isThinking]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  }, [input]);

  async function loadConversations() {
    try {
      setLoadingConversations(true);
      setConversationError("");

      const response = await fetch(
        "/api/research-conversations",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load saved conversations."
        );
      }

      setConversations(
        Array.isArray(data.conversations)
          ? data.conversations
          : []
      );
    } catch (loadError) {
      setConversationError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load saved conversations."
      );
    } finally {
      setLoadingConversations(false);
    }
  }

  async function saveConversation(
    nextMessages: ResearchMessage[],
    existingId = currentConversationId
  ) {
    const messagesToSave = nextMessages.filter(
      (message) => message.id !== "welcome"
    );

    if (messagesToSave.length === 0) {
      return null;
    }

    try {
      setSavingConversation(true);
      setConversationError("");

      const currentConversation =
        conversations.find(
          (conversation) =>
            conversation.id === existingId
        );

      const response = await fetch(
        "/api/research-conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            id: existingId,
            title: currentConversation?.title,
            messages: messagesToSave,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.conversation) {
        throw new Error(
          data.error ||
            "Unable to save this conversation."
        );
      }

      const saved =
        data.conversation as SavedConversation;

      setCurrentConversationId(saved.id);

      setConversations((current) => [
        saved,
        ...current.filter(
          (conversation) =>
            conversation.id !== saved.id
        ),
      ]);

      return saved;
    } catch (saveError) {
      setConversationError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this conversation."
      );

      return null;
    } finally {
      setSavingConversation(false);
    }
  }

  async function submitQuestion(
    question: string
  ) {
    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion || isThinking) {
      return;
    }

    const userMessage: ResearchMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setError("");

    try {
      const response = await fetch(
        "/api/research",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            messages: nextMessages
              .filter(
                (message) =>
                  message.id !== "welcome"
              )
              .map((message) => ({
                role: message.role,
                content: message.content,
              })),
          }),
        }
      );

      const data =
        (await response.json()) as ResearchResponse;

      if (!response.ok || !data.answer) {
        throw new Error(
          data.error ||
            "Unable to complete the research request."
        );
      }

      const assistantMessage: ResearchMessage =
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          createdAt:
            new Date().toISOString(),
        };

      const completedMessages = [
        ...nextMessages,
        assistantMessage,
      ];

      setMessages(completedMessages);
      setLastContext(data.context ?? null);

      await saveConversation(
        completedMessages
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete the research request."
      );
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    submitQuestion(input);
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
        submitQuestion(input);
      }
    }
  }

  function startNewChat() {
    setMessages([welcomeMessage]);
    setCurrentConversationId(null);
    setInput("");
    setError("");
    setConversationError("");
    setLastContext(null);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  function openConversation(
    conversation: SavedConversation
  ) {
    setCurrentConversationId(conversation.id);

    setMessages([
      welcomeMessage,
      ...conversation.messages,
    ]);

    setInput("");
    setError("");
    setLastContext(null);
  }

  async function renameConversation(
    conversation: SavedConversation
  ) {
    const newTitle = window.prompt(
      "Rename this research conversation:",
      conversation.title
    );

    if (!newTitle?.trim()) {
      return;
    }

    try {
      setConversationError("");

      const response = await fetch(
        "/api/research-conversations",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: conversation.id,
            title: newTitle.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.conversation) {
        throw new Error(
          data.error ||
            "Unable to rename this conversation."
        );
      }

      const updated =
        data.conversation as SavedConversation;

      setConversations((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item
        )
      );
    } catch (renameError) {
      setConversationError(
        renameError instanceof Error
          ? renameError.message
          : "Unable to rename this conversation."
      );
    }
  }

  async function deleteConversation(
    conversation: SavedConversation
  ) {
    const confirmed = window.confirm(
      `Delete "${conversation.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setConversationError("");

      const response = await fetch(
        `/api/research-conversations?id=${encodeURIComponent(
          conversation.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete this conversation."
        );
      }

      setConversations((current) =>
        current.filter(
          (item) =>
            item.id !== conversation.id
        )
      );

      if (
        currentConversationId ===
        conversation.id
      ) {
        startNewChat();
      }
    } catch (deleteError) {
      setConversationError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this conversation."
      );
    }
  }

  return (
    <div
      className="research-layout"
      style={{
        display: "grid",
        gridTemplateColumns:
          "250px minmax(0, 1fr) 310px",
        gap: "14px",
        alignItems: "start",
      }}
    >
      <aside
        className="card conversation-sidebar"
        style={{
          position: "sticky",
          top: "18px",
          maxHeight: "760px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom:
              "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            type="button"
            onClick={startNewChat}
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "none",
              borderRadius: "10px",
              background: "#2563eb",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            + New Chat
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
          }}
        >
          <p
            className="muted"
            style={{
              margin: "0 0 10px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Saved research
          </p>

          {loadingConversations ? (
            <p className="muted">
              Loading conversations...
            </p>
          ) : conversations.length === 0 ? (
            <p
              className="muted"
              style={{
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              Your saved research chats will
              appear here.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              {conversations.map(
                (conversation) => {
                  const active =
                    conversation.id ===
                    currentConversationId;

                  return (
                    <div
                      key={conversation.id}
                      style={{
                        padding: "10px",
                        border: active
                          ? "1px solid rgba(96,165,250,0.42)"
                          : "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "10px",
                        background: active
                          ? "rgba(37,99,235,0.1)"
                          : "rgba(255,255,255,0.025)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openConversation(
                            conversation
                          )
                        }
                        style={{
                          width: "100%",
                          padding: 0,
                          border: "none",
                          background:
                            "transparent",
                          color: "inherit",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                            fontSize: "13px",
                          }}
                        >
                          {conversation.title}
                        </strong>

                        <span
                          className="muted"
                          style={{
                            display: "block",
                            marginTop: "5px",
                            fontSize: "10px",
                          }}
                        >
                          {formatConversationDate(
                            conversation.updatedAt
                          )}
                        </span>
                      </button>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            renameConversation(
                              conversation
                            )
                          }
                          style={smallActionStyle}
                        >
                          Rename
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteConversation(
                              conversation
                            )
                          }
                          style={{
                            ...smallActionStyle,
                            color: "#ff8a8a",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {conversationError && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px",
                borderRadius: "9px",
                background:
                  "rgba(255,107,107,0.08)",
                color: "#ff8a8a",
                fontSize: "11px",
                lineHeight: 1.45,
              }}
            >
              {conversationError}
            </div>
          )}
        </div>
      </aside>

      <section
        className="card"
        style={{
          minHeight: "720px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "18px 20px",
            borderBottom:
              "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "19px",
              }}
            >
              Research conversation
            </h2>

            <p
              className="muted"
              style={{
                margin: "5px 0 0",
                fontSize: "12px",
              }}
            >
              {savingConversation
                ? "Saving..."
                : currentConversationId
                  ? "Saved to your account"
                  : "New unsaved chat"}
            </p>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            style={{
              padding: "8px 11px",
              border:
                "1px solid rgba(255,255,255,0.1)",
              borderRadius: "9px",
              background: "transparent",
              color: "#d1d5db",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            New Chat
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}

            {isThinking && (
              <ThinkingBubble />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              margin: "0 16px 12px",
              padding: "13px",
              border:
                "1px solid rgba(255,107,107,0.3)",
              borderRadius: "10px",
              background:
                "rgba(255,107,107,0.08)",
              color: "#ff8a8a",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            padding: "16px",
            borderTop:
              "1px solid rgba(255,255,255,0.08)",
            background: "#0b1524",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "10px",
              padding: "10px",
              border:
                "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              background: "#07111f",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask about a stock, market concept, company comparison, or your portfolio..."
              rows={1}
              disabled={isThinking}
              style={{
                flex: 1,
                minHeight: "42px",
                maxHeight: "180px",
                resize: "none",
                overflowY: "auto",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#f9fafb",
                fontSize: "15px",
                lineHeight: 1.5,
                fontFamily: "inherit",
                padding: "9px 8px",
              }}
            />

            <button
              type="submit"
              disabled={!canSend}
              style={{
                minWidth: "76px",
                padding: "11px 15px",
                border: "none",
                borderRadius: "10px",
                background: canSend
                  ? "#2563eb"
                  : "#374151",
                color: "white",
                fontWeight: 800,
                cursor: canSend
                  ? "pointer"
                  : "not-allowed",
                opacity: canSend ? 1 : 0.7,
              }}
            >
              Send
            </button>
          </div>

          <p
            className="muted"
            style={{
              margin: "9px 4px 0",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            Conversations save automatically
            after each AI response.
          </p>
        </form>
      </section>

      <aside
        className="card suggestion-sidebar"
        style={{
          position: "sticky",
          top: "18px",
          padding: "18px",
        }}
      >
        <SuggestedQuestions
          onSelect={(question) => {
            setInput(question);

            window.setTimeout(() => {
              textareaRef.current?.focus();
            }, 0);
          }}
        />

        {lastContext && (
          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              borderRadius: "12px",
              border:
                "1px solid rgba(96,165,250,0.18)",
              background:
                "rgba(37,99,235,0.06)",
            }}
          >
            <h4 style={{ margin: 0 }}>
              Context used
            </h4>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {lastContext.holdingsIncluded ??
                0}{" "}
              holdings ·{" "}
              {lastContext.watchlistIncluded ??
                0}{" "}
              watchlist stocks
            </p>

            {(lastContext
              .liveSymbolsIncluded?.length ??
              0) > 0 && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#93c5fd",
                  fontSize: "12px",
                }}
              >
                Live data:{" "}
                {lastContext.liveSymbolsIncluded?.join(
                  ", "
                )}
              </p>
            )}
          </div>
        )}
      </aside>

      <style jsx>{`
        @media (max-width: 1180px) {
          .research-layout {
            grid-template-columns:
              230px minmax(0, 1fr) !important;
          }

          .suggestion-sidebar {
            position: static !important;
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 820px) {
          .research-layout {
            grid-template-columns: 1fr !important;
          }

          .conversation-sidebar,
          .suggestion-sidebar {
            position: static !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const smallActionStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  color: "#93c5fd",
  fontSize: "10px",
  fontWeight: 700,
  cursor: "pointer",
};

function MessageBubble({
  message,
}: {
  message: ResearchMessage;
}) {
  const isUser =
    message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser
          ? "flex-end"
          : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "86%",
          padding: "14px 16px",
          borderRadius: isUser
            ? "16px 16px 4px 16px"
            : "16px 16px 16px 4px",
          border: isUser
            ? "1px solid rgba(96,165,250,0.28)"
            : "1px solid rgba(255,255,255,0.08)",
          background: isUser
            ? "rgba(37,99,235,0.14)"
            : "rgba(255,255,255,0.04)",
        }}
      >
        <ResearchText
          content={message.content}
        />

        <p
          className="muted"
          style={{
            margin: "9px 0 0",
            fontSize: "10px",
            textAlign: isUser
              ? "right"
              : "left",
          }}
        >
          {isUser
            ? "You"
            : "TradePilot AI"}{" "}
          ·{" "}
          {new Date(
            message.createdAt
          ).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function ResearchText({
  content,
}: {
  content: string;
}) {
  const lines = content.split("\n");

  return (
    <div
      style={{
        color: "#f3f4f6",
        lineHeight: 1.65,
        overflowWrap: "anywhere",
      }}
    >
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (
          trimmed.startsWith("### ")
        ) {
          return (
            <h4
              key={index}
              style={{
                margin:
                  index === 0
                    ? "0 0 8px"
                    : "16px 0 8px",
                fontSize: "16px",
              }}
            >
              {trimmed.slice(4)}
            </h4>
          );
        }

        if (
          trimmed.startsWith("## ")
        ) {
          return (
            <h3
              key={index}
              style={{
                margin:
                  index === 0
                    ? "0 0 9px"
                    : "18px 0 9px",
                fontSize: "18px",
              }}
            >
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (
          trimmed.startsWith("# ")
        ) {
          return (
            <h2
              key={index}
              style={{
                margin:
                  index === 0
                    ? "0 0 10px"
                    : "20px 0 10px",
                fontSize: "20px",
              }}
            >
              {trimmed.slice(2)}
            </h2>
          );
        }

        if (
          /^[-*]\s+/.test(trimmed)
        ) {
          return (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "9px",
                margin: "5px 0",
              }}
            >
              <span
                style={{
                  color: "#60a5fa",
                  fontWeight: 800,
                }}
              >
                •
              </span>

              <span>
                {trimmed.replace(
                  /^[-*]\s+/,
                  ""
                )}
              </span>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "9px",
                margin: "5px 0",
              }}
            >
              <span
                style={{
                  color: "#60a5fa",
                  fontWeight: 800,
                }}
              >
                {trimmed.match(
                  /^\d+\./
                )?.[0]}
              </span>

              <span>
                {trimmed.replace(
                  /^\d+\.\s+/,
                  ""
                )}
              </span>
            </div>
          );
        }

        if (!trimmed) {
          return (
            <div
              key={index}
              style={{ height: "9px" }}
            />
          );
        }

        return (
          <p
            key={index}
            style={{
              margin:
                index === 0
                  ? 0
                  : "7px 0 0",
            }}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "14px 16px",
          border:
            "1px solid rgba(255,255,255,0.08)",
          borderRadius:
            "16px 16px 16px 4px",
          background:
            "rgba(255,255,255,0.04)",
        }}
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#60a5fa",
              opacity:
                0.45 + index * 0.2,
            }}
          />
        ))}

        <span
          className="muted"
          style={{
            marginLeft: "4px",
            fontSize: "12px",
          }}
        >
          Researching...
        </span>
      </div>
    </div>
  );
}

function formatConversationDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}