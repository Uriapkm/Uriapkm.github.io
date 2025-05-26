// tableView.js – pinta DataTable y aplica colores
import thresholds from './thresholds.json' assert { type: 'json' };

let dataTable = null;

export function renderTable(metrics) {
  const headerRow = document.getElementById('metricsHeader');
  const body = document.getElementById('metricsBody');

  headerRow.innerHTML = '';
  body.innerHTML = '';

  Object.keys(metrics).forEach((key) => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });

  const tr = document.createElement('tr');
  Object.values(metrics).forEach((val) => {
    const td = document.createElement('td');
    td.textContent = typeof val === 'number' ? val.toFixed(2) : val;
    tr.appendChild(td);
  });
  body.appendChild(tr);

  if (dataTable) dataTable.destroy();
  dataTable = new DataTable('#metricsTable', {
    paging: false,
    info: false,
    searching: false,
    scrollX: true,
  });
}

export function colourRows(metrics, thresholds) {
  const tableRow = document.querySelector('#metricsBody tr');
  if (!tableRow) return;
  if ('marginOfSafety' in metrics) {
    const mos = metrics.marginOfSafety;
    tableRow.classList.remove('green', 'amber', 'red');
    if (mos >= thresholds.marginOfSafety.green) tableRow.classList.add('green');
    else if (mos >= thresholds.marginOfSafety.amber) tableRow.classList.add('amber');
    else tableRow.classList.add('red');
  }
}

export function clearTable() {
  document.getElementById('metricsHeader').innerHTML = '';
  document.getElementById('metricsBody').innerHTML = '';
  if (dataTable) dataTable.destroy();
  dataTable = null;
}
