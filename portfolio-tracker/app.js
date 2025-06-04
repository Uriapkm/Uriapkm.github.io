// ------ CONSTANTS AND ELEMENT REFERENCES ------
const portfolioKey = 'userPortfolio';
const historyKey   = 'userHistory';

const API_KEY = 'd0q3969r01qmj4nhq740d0q3969r01qmj4nhq74g'; // Your Finnhub API key
const API_URL = 'https://finnhub.io/api/v1/quote';

const tableBody         = document.querySelector('#portfolio-table tbody');
const addStockForm      = document.getElementById('add-stock-form');
const exportBtn         = document.getElementById('export-portfolio-btn');
const importInput       = document.getElementById('import-portfolio-input');
const exportHistoryBtn  = document.getElementById('export-history-btn');
const refreshBtn        = document.getElementById('refresh-prices-btn');

const totalCostElem     = document.getElementById('total-cost');
const totalCurrentElem  = document.getElementById('total-current');
const totalReturnElem   = document.getElementById('total-return');
const lastUpdateElem    = document.getElementById('last-update');

const historyTableBody  = document.querySelector('#history-table tbody');

let isLoading = false;

// ------ LOCALSTORAGE FUNCTIONS ------
function loadPortfolio() {
  const data = localStorage.getItem(portfolioKey);
  return data ? JSON.parse(data) : [];
}

function savePortfolio(portfolio) {
  localStorage.setItem(portfolioKey, JSON.stringify(portfolio));
}

function loadHistory() {
  const data = localStorage.getItem(historyKey);
  return data ? JSON.parse(data) : [];
}

function saveHistory(history) {
  localStorage.setItem(historyKey, JSON.stringify(history));
}

// ------ EXPORT / IMPORT PORTFOLIO ------
function exportPortfolio() {
  const portfolio = loadPortfolio();
    if (portfolio.length === 0) {
      alert('There are no holdings to export.');
    return;
  }
  const jsonStr = JSON.stringify(portfolio, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
    a.download = 'portfolio.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
    alert('Portfolio exported successfully.');
}

function importPortfolio(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
    if (!Array.isArray(imported)) throw new Error('Invalid format: expected an array.');
      for (const item of imported) {
        if (
          typeof item.ticker !== 'string' ||
          typeof item.quantity !== 'number' ||
          typeof item.purchasePrice !== 'number'
        ) {
          throw new Error('Invalid structure in JSON.');
        }
      }
      savePortfolio(imported);
      renderPortfolio();
      alert('Portfolio imported successfully.');
    } catch (err) {
      console.error(err);
      alert('Error importing portfolio: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ------ EXPORT HISTORY ------
function exportHistory() {
  const history = loadHistory();
    if (history.length === 0) {
      alert('There is no history to export.');
    return;
  }
  const jsonStr = JSON.stringify(history, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
    a.download = 'history.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
    alert('History exported successfully.');
}

// ------ FETCH CURRENT PRICE WITH FINNHUB ------
async function fetchCurrentPrice(ticker) {
  try {
    const response = await fetch(`${API_URL}?symbol=${ticker}&token=${API_KEY}`);
    const data = await response.json();
      if (!data || typeof data.c !== 'number') {
        throw new Error('Invalid ticker or API limit reached');
    }
    return parseFloat(data.c);
  } catch (error) {
      console.error('Error fetching price:', error);
    return null;
  }
}

// ------ HANDLE SPINNER ON REFRESH BUTTON ------
function setLoading(state) {
  isLoading = state;
  if (state) {
    refreshBtn.textContent = 'Refreshing...';
    refreshBtn.disabled = true;
  } else {
    refreshBtn.textContent = 'Refresh Prices';
    refreshBtn.disabled = false;
  }
}

// ------ RENDER PORTFOLIO ROWS ------
/**
 * @param {Object} holding  — { ticker, quantity, purchasePrice }
 * @param {number} index    — index in the array
 * @returns {Object}        — { totalCost, totalValue } for this holding
 */
async function createRow(holding, index) {
  const { ticker, quantity, purchasePrice } = holding;
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>${ticker}</td>
    <td>${quantity}</td>
    <td>${purchasePrice.toFixed(2)}</td>
    <td class="current-price" aria-live="polite">—</td>
    <td class="current-value">—</td>
    <td class="return">—</td>
    <td><button class="delete-btn" aria-label="Eliminar ${ticker}">Eliminar</button></td>
  `;

  tr.querySelector('.delete-btn').addEventListener('click', () => {
    deleteHolding(index);
  });

  tableBody.appendChild(tr);

  const currentPrice = await fetchCurrentPrice(ticker);
  const totalCost = purchasePrice * quantity;
  let totalValue = 0;

  if (currentPrice === null) {
    tr.querySelector('.current-price').textContent = 'Error';
    tr.querySelector('.current-value').textContent = '—';
    tr.querySelector('.return').textContent = '—';
  } else {
    totalValue = currentPrice * quantity;
    const returnPct = ((totalValue - totalCost) / totalCost) * 100;

    tr.querySelector('.current-price').textContent = currentPrice.toFixed(2);
    tr.querySelector('.current-value').textContent = totalValue.toFixed(2);
    tr.querySelector('.return').textContent = returnPct.toFixed(2) + '%';
  }

  return { totalCost, totalValue };
}

// ------ FULL PORTFOLIO AND SUMMARY RENDER ------
async function renderPortfolio() {
  if (isLoading) return;
  setLoading(true);
  tableBody.innerHTML = '';
  const portfolio = loadPortfolio();

  let sumCost = 0;
  let sumCurrent = 0;

  for (let i = 0; i < portfolio.length; i++) {
    const { totalCost, totalValue } = await createRow(portfolio[i], i);
    sumCost += totalCost;
    sumCurrent += totalValue;
  }

  let totalReturnPct = 0;
  if (sumCost > 0) {
    totalReturnPct = ((sumCurrent - sumCost) / sumCost) * 100;
  }

  totalCostElem.textContent = sumCost.toFixed(2);
  totalCurrentElem.textContent = sumCurrent.toFixed(2);
  totalReturnElem.textContent = totalReturnPct.toFixed(2);

  const now = new Date();
  lastUpdateElem.textContent = now.toLocaleString('en-US');
  setLoading(false);
}

// ------ DELETE A HOLDING ------
function deleteHolding(index) {
  const portfolio = loadPortfolio();
  portfolio.splice(index, 1);
  savePortfolio(portfolio);
  renderPortfolio();
}

// ------ RENDER HISTORY TABLE ------
function renderHistory() {
  historyTableBody.innerHTML = '';
  const history = loadHistory();

  const sorted = history.slice().sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  for (const entry of sorted) {
    const tr = document.createElement('tr');
    const dateStr = new Date(entry.date).toLocaleString('en-US');
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${entry.ticker}</td>
      <td>${entry.quantity}</td>
      <td>${entry.price.toFixed(2)}</td>
    `;
    historyTableBody.appendChild(tr);
  }
}

// ------ ADD / UPDATE HOLDING AND SAVE TO HISTORY ------
addStockForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const tickerInput       = document.getElementById('ticker').value.trim().toUpperCase();
  const quantityInput     = parseInt(document.getElementById('quantity').value);
  const purchasePriceInput= parseFloat(document.getElementById('purchase-price').value);

  if (!tickerInput) {
    alert('You must enter a valid ticker.');
    return;
  }
  if (isNaN(quantityInput) || quantityInput <= 0) {
    alert('Quantity must be an integer greater than 0.');
    return;
  }
  if (isNaN(purchasePriceInput) || purchasePriceInput <= 0) {
    alert('Purchase price must be a number greater than 0.');
    return;
  }

  const portfolio = loadPortfolio();
  const existingIndex = portfolio.findIndex(h => h.ticker === tickerInput);

  let addedQuantity = quantityInput;
  let addedPrice    = purchasePriceInput;

  if (existingIndex !== -1) {
    const existing = portfolio[existingIndex];
    const totalShares = existing.quantity + quantityInput;
    const totalCost   = (existing.quantity * existing.purchasePrice) + (quantityInput * purchasePriceInput);
    const newAvgPrice = totalCost / totalShares;

    portfolio[existingIndex] = {
      ticker: tickerInput,
      quantity: totalShares,
      purchasePrice: newAvgPrice
    };
  } else {
    portfolio.push({
      ticker: tickerInput,
      quantity: quantityInput,
      purchasePrice: purchasePriceInput
    });
  }

  savePortfolio(portfolio);

  const history = loadHistory();
  history.push({
    date: new Date().toISOString(),
    ticker: tickerInput,
    quantity: addedQuantity,
    price: addedPrice
  });
  saveHistory(history);

  addStockForm.reset();
  await renderPortfolio();
  renderHistory();
});

// ------ EVENTS FOR EXPORT / IMPORT / HISTORY / REFRESH ------
exportBtn.addEventListener('click', exportPortfolio);
importInput.addEventListener('change', importPortfolio);
exportHistoryBtn.addEventListener('click', exportHistory);
refreshBtn.addEventListener('click', renderPortfolio);

// ------ AUTOMATIC UPDATE EVERY 15 MINUTES ------
setInterval(() => {
  renderPortfolio();
}, 15 * 60 * 1000);

// ------ ON PAGE LOAD ------
window.addEventListener('load', () => {
  renderPortfolio();
  renderHistory();
});
