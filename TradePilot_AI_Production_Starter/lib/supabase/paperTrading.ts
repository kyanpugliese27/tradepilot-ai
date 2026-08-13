export type PaperPosition = {
  symbol: string;
  company: string;
  shares: number;
  averagePrice: number;
};

export type PaperTrade = {
  id: string;
  symbol: string;
  company: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  total: number;
  createdAt: string;
};

export type PaperPortfolio = {
  cash: number;
  positions: PaperPosition[];
  history: PaperTrade[];
};

export const STARTING_CASH = 100000;

declare global {
  // eslint-disable-next-line no-var
  var paperPortfolio:
    | PaperPortfolio
    | undefined;
}

export function getPaperPortfolio(): PaperPortfolio {
  if (!global.paperPortfolio) {
    global.paperPortfolio = {
      cash: STARTING_CASH,
      positions: [],
      history: [],
    };
  }

  return global.paperPortfolio;
}

export function resetPaperPortfolio() {
  global.paperPortfolio = {
    cash: STARTING_CASH,
    positions: [],
    history: [],
  };

  return global.paperPortfolio;
}

export function buyStock(
  symbol: string,
  company: string,
  shares: number,
  price: number
) {
  const portfolio = getPaperPortfolio();

  const total = shares * price;

  if (portfolio.cash < total) {
    throw new Error("Not enough buying power.");
  }

  portfolio.cash -= total;

  const existing = portfolio.positions.find(
    (p) => p.symbol === symbol
  );

  if (existing) {
    const oldValue =
      existing.averagePrice * existing.shares;

    const newValue = price * shares;

    existing.averagePrice =
      (oldValue + newValue) /
      (existing.shares + shares);

    existing.shares += shares;
  } else {
    portfolio.positions.push({
      symbol,
      company,
      shares,
      averagePrice: price,
    });
  }

  portfolio.history.unshift({
    id: crypto.randomUUID(),
    symbol,
    company,
    side: "BUY",
    shares,
    price,
    total,
    createdAt: new Date().toISOString(),
  });

  return portfolio;
}

export function sellStock(
  symbol: string,
  shares: number,
  price: number
) {
  const portfolio = getPaperPortfolio();

  const position = portfolio.positions.find(
    (p) => p.symbol === symbol
  );

  if (!position) {
    throw new Error("Position not found.");
  }

  if (shares > position.shares) {
    throw new Error(
      "Not enough shares to sell."
    );
  }

  const total = shares * price;

  portfolio.cash += total;

  position.shares -= shares;

  portfolio.history.unshift({
    id: crypto.randomUUID(),
    symbol,
    company: position.company,
    side: "SELL",
    shares,
    price,
    total,
    createdAt: new Date().toISOString(),
  });

  if (position.shares === 0) {
    portfolio.positions =
      portfolio.positions.filter(
        (p) => p.symbol !== symbol
      );
  }

  return portfolio;
}