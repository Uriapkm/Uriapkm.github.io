// fetchService.js – consigue datos, cachea 24h en localStorage
import { API_KEYS } from './config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function cacheKey(ticker) {
  return `fs_cache_${ticker}`;
}

export async function fetchFinancials(ticker) {
  const cached = localStorage.getItem(cacheKey(ticker));
  if (cached) {
    const { ts, data } = JSON.parse(cached);
    if (Date.now() - ts < DAY_MS) return data;
  }

  // --- Finnhub quote ---
  const quoteRes = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEYS.FINNHUB}`
  );
  if (!quoteRes.ok) throw new Error('Error Finnhub quote');
  const quote = await quoteRes.json();

  // --- FMP financial statements ---
  const incomeRes = await fetch(
    `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?apikey=${API_KEYS.FMP}`
  );
  if (!incomeRes.ok) throw new Error('Error FMP income');
  const income = await incomeRes.json();

  const balanceRes = await fetch(
    `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?apikey=${API_KEYS.FMP}`
  );
  if (!balanceRes.ok) throw new Error('Error FMP balance');
  const balance = await balanceRes.json();

  const cashRes = await fetch(
    `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?apikey=${API_KEYS.FMP}`
  );
  if (!cashRes.ok) throw new Error('Error FMP cashflow');
  const cash = await cashRes.json();

  const data = { quote, income, balance, cash };
  localStorage.setItem(cacheKey(ticker), JSON.stringify({ ts: Date.now(), data }));
  return data;
}
