import { NextRequest, NextResponse } from "next/server";

import {
  buyStock,
  getPaperPortfolio,
  resetPaperPortfolio,
  sellStock,
} from  "@/lib/supabase/paperTrading";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const portfolio = getPaperPortfolio();

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Unable to load portfolio.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      action,
      symbol,
      company,
      shares,
      price,
    } = body;

    if (action === "BUY") {
      const portfolio = buyStock(
        symbol,
        company,
        Number(shares),
        Number(price)
      );

      return NextResponse.json(portfolio);
    }

    if (action === "SELL") {
      const portfolio = sellStock(
        symbol,
        Number(shares),
        Number(price)
      );

      return NextResponse.json(portfolio);
    }

    if (action === "RESET") {
      const portfolio = resetPaperPortfolio();

      return NextResponse.json(portfolio);
    }

    return NextResponse.json(
      {
        error: "Invalid action.",
      },
      {
        status: 400,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ??
          "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}