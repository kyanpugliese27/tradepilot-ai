"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me to explain a company, market event, or portfolio concept." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ question })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "The AI endpoint is not connected yet. Add your OpenAI API key to activate it."
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" id="research">
      <h3>AI Research Assistant</h3>
      <div style={{display:"grid",gap:9,maxHeight:280,overflow:"auto",marginBottom:14}}>
        {messages.map((m, i) => (
          <div key={i} style={{
            padding:12,borderRadius:12,
            background:m.role === "user" ? "rgba(44,232,120,.14)" : "#0a160f",
            marginLeft:m.role === "user" ? 40 : 0
          }}>{m.content}</div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input className="input" value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about a stock or market concept..." />
        <button className="button" onClick={send}>{loading ? "..." : "Send"}</button>
      </div>
      <p className="disclaimer">Responses are educational and should not be treated as personalized investment advice.</p>
    </div>
  );
}
