import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-5-mini",
      instructions: `You are TradePilot AI, an educational market-research assistant.
Explain concepts clearly and neutrally. Do not claim to know live prices unless data is
provided. Do not tell users exactly what to buy, sell, or how much to invest. State key
uncertainties and risks. Keep answers under 300 words.`,
      input: question
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The AI request failed." }, { status: 500 });
  }
}
