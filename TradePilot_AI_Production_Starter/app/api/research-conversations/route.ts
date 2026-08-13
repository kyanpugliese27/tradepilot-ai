import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ConversationRow = {
  id: string;
  title: string;
  messages: StoredMessage[];
  created_at: string;
  updated_at: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("research_conversations")
      .select("id, title, messages, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        conversations: ((data || []) as ConversationRow[]).map(
          (conversation) => ({
            id: conversation.id,
            title: conversation.title,
            messages: sanitizeMessages(conversation.messages),
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at,
          })
        ),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Research conversation list error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load saved conversations.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id =
      typeof body.id === "string" && body.id.trim()
        ? body.id.trim()
        : null;

    const messages = sanitizeMessages(body.messages);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "A conversation must contain at least one message." },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 100)
        : createTitle(messages);

    const now = new Date().toISOString();

    if (id) {
      const { data, error } = await supabase
        .from("research_conversations")
        .update({
          title,
          messages,
          updated_at: now,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, title, messages, created_at, updated_at")
        .single<ConversationRow>();

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json(
        {
          conversation: mapConversation(data),
        },
        {
          headers: noStoreHeaders(),
        }
      );
    }

    const { data, error } = await supabase
      .from("research_conversations")
      .insert({
        user_id: user.id,
        title,
        messages,
        updated_at: now,
      })
      .select("id, title, messages, created_at, updated_at")
      .single<ConversationRow>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        conversation: mapConversation(data),
      },
      {
        status: 201,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Research conversation save error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save this conversation.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id =
      typeof body.id === "string" ? body.id.trim() : "";

    const title =
      typeof body.title === "string"
        ? body.title.trim().slice(0, 100)
        : "";

    if (!id || !title) {
      return NextResponse.json(
        { error: "Conversation id and title are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("research_conversations")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, title, messages, created_at, updated_at")
      .single<ConversationRow>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        conversation: mapConversation(data),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Research conversation rename error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to rename this conversation.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const id = new URL(request.url).searchParams
      .get("id")
      ?.trim();

    if (!id) {
      return NextResponse.json(
        { error: "A conversation id is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("research_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { success: true },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Research conversation delete error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete this conversation.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

function mapConversation(conversation: ConversationRow) {
  return {
    id: conversation.id,
    title: conversation.title,
    messages: sanitizeMessages(conversation.messages),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}

function sanitizeMessages(value: unknown): StoredMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (message): message is StoredMessage =>
        Boolean(message) &&
        typeof message === "object" &&
        typeof message.id === "string" &&
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string" &&
        typeof message.createdAt === "string"
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content.slice(0, 20_000),
      createdAt: message.createdAt,
    }))
    .slice(-40);
}

function createTitle(messages: StoredMessage[]) {
  const firstUserMessage = messages.find(
    (message) => message.role === "user"
  );

  if (!firstUserMessage) {
    return "New Research Chat";
  }

  const cleaned = firstUserMessage.content
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 55
    ? `${cleaned.slice(0, 55)}…`
    : cleaned;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}