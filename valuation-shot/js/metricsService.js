// metricsService.js – cocina las métricas clave
import { CAGR, percentile } from './utils.js';

export function computeMetrics(raw) {
  const { quote, income, balance, cash } = raw;
  const latestIncome = income[0];
  const latestBalance = balance[0];
  const latestCash = cash[0];

  // Precio & tamaño
  const price = quote.c;
  const marketCap = latestBalance.marketCap || (latestBalance.totalAssets * price / latestBalance.sharesOutstanding);
  const ev = marketCap + (latestBalance.totalDebt || 0) - (latestBalance.cashAndCashEquivalents || 0);

  const metrics = {
    price,
    '52wHigh': quote.h,
    '52wLow': quote.l,
    marketCap,
    enterpriseValue: ev,
    // Ejemplos de márgenes
    grossMargin: latestIncome.grossProfit / latestIncome.revenue,
    ebitdaMargin: latestIncome.ebitda / latestIncome.revenue,
    netMargin: latestIncome.netIncome / latestIncome.revenue,
    // ROE/ROA/ROIC simplificados
    roe: latestIncome.netIncome / latestBalance.totalStockholdersEquity,
    roa: latestIncome.netIncome / latestBalance.totalAssets,
  };

  // TODO: completar el resto de métricas (CAGR, WACC...) usando helpers y varios años
  return metrics;
}
