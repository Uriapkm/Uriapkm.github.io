import { fetchFinancials } from './fetchService.js';
import { computeMetrics } from './metricsService.js';
import { renderTable, colourRows, clearTable } from './tableView.js';

import thresholds from './thresholds.json' assert { type: 'json' };

const tickerInput = document.getElementById('tickerInput');
const fetchBtn = document.getElementById('fetchBtn');
const addWatchBtn = document.getElementById('addWatchBtn');
const watchlistUl = document.getElementById('watchlist');

let currentSnapshot = null;

function loadWatchlist() {
  const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
  watchlistUl.innerHTML = '';
  list.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.ticker} – Precio justo: ${item.fairPrice}`;
    watchlistUl.appendChild(li);
  });
}

async function handleFetch() {
  const ticker = tickerInput.value.trim().toUpperCase();
  if (!ticker) return;
  fetchBtn.disabled = true;
  clearTable();
  try {
    const raw = await fetchFinancials(ticker);
    const metrics = computeMetrics(raw);
    currentSnapshot = { ticker, ...metrics };
    renderTable(metrics);
    colourRows(metrics, thresholds);
    addWatchBtn.disabled = false;
  } catch (e) {
    alert(e.message || 'Error obteniendo datos');
  } finally {
    fetchBtn.disabled = false;
  }
}

function handleAddWatch() {
  if (!currentSnapshot) return;
  const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
  list.push(currentSnapshot);
  localStorage.setItem('watchlist', JSON.stringify(list));
  loadWatchlist();
}

document.addEventListener('DOMContentLoaded', () => {
  loadWatchlist();
  fetchBtn.addEventListener('click', handleFetch);
  addWatchBtn.addEventListener('click', handleAddWatch);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleFetch();
  });
});
