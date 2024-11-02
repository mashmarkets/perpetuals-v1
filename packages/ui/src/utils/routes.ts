export const getTradeRouteFromSymbol = (symbol: string) => {
  return `/trade/${symbol.toUpperCase()}`;
};
