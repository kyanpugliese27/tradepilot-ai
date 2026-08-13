const symbols = ["AAPL", "NVDA", "TSLA", "MSFT"];

type FinnhubQuote = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Finnhub API key is missing." },
      { status: 500 }
    );
  }

  try {
    const stocks = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Finnhub request failed for ${symbol}`);
        }

        const quote: FinnhubQuote = await response.json();

        return {
          symbol,
          price: quote.c,
          change: quote.d,
          changePercent: quote.dp,
          high: quote.h,
          low: quote.l,
          open: quote.o,
          previousClose: quote.pc,
          timestamp: quote.t,
        };
      })
    );

    return Response.json({ stocks });
  } catch (error) {
    console.error("Stock API error:", error);

    return Response.json(
      { error: "Unable to load stock prices." },
      { status: 500 }
    );
  }
}