function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1) * t * Math.exp(-x*x);
  return sign * y;
}
function normCDF(x){ return 0.5 * (1 + erf(x/Math.SQRT2)); }
function bsPrice(S, K, rPct, days, iv, type){
  // S: spot price, K: strike price, r: risk-free rate (decimal), T: time to maturity (years), sigma: volatility (decimal), type: 'call' or 'put'
  const T = Math.max(0, days) / 365.0;
  const r = rPct / 100.0;
  const sigma = iv / 100.0;


  if (T <= 0 || sigma <= 0) {
    return (type === 'call') ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === 'call') {
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
  }
}

// -----------------------------------------------------------------------------------
let priceChart = null;
let pnlChart = null;
function formatNumber(x){ return Math.round(x*100)/100; }

function initChart(){
  const c1 = document.getElementById('priceChart').getContext('2d');
  priceChart = new Chart(c1, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Buy', data: [], borderWidth: 2, pointRadius: 0, tension: 0.2, borderColor: '#0eb70eff' },
      { label: 'Sell', data: [], borderWidth: 2, pointRadius: 0, tension: 0.2, borderColor: '#ef4444' }
    ] },
    options: {
      plugins: {
        legend: {
          labels: {
            filter: (legendItem) => legendItem.text !== undefined && legendItem.text !== ""
          }
        }
      },
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      scales:{
        x:{ title:{display:true,text:'Spot price'} },
        y:{ title:{display:true,text:'Option fair price'} }
      }
    }
  });


  const c2 = document.getElementById('pnlChart').getContext('2d');
  pnlChart = new Chart(c2, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Total PnL', data: [], borderWidth: 2, pointRadius: 0, tension: 0.2, 
        borderColor: getOptionColor(1, 2, 1), borderDash: [5, 2]},
      { data: [], borderWidth: 2, pointRadius: 0, tension: 0.2, 
        borderColor: getOptionColor(1, 2, 0)}
    ] },
    options: {
      plugins: {
        legend: {
          labels: {
            filter: (legendItem) => legendItem.text !== undefined && legendItem.text !== ""
          }
        }
      },
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      scales:{
        x:{ title:{display:true,text:'Spot price'} },
        y:{ title:{display:true,text:'Profit'} }
      }
    }
  });
}

// -----------------------------------------------------------

let optionCount = 0;
function addOption(type='call', strike=1.00, days=100){
  optionCount++;

  const container = document.getElementById("options-container");
  const optionDiv = document.createElement("div");
  optionDiv.className = "controls option-block";
  optionDiv.style.marginTop = "20px";
  optionDiv.id = `option-${optionCount}`;

  optionDiv.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h4>Option ${optionCount}</h4>
      <button class="remove-btn" data-id="${optionCount}">x</button>
    </div>
    <div class="control">
      <label>Option type</label>
      <select id="otype-${optionCount}">
        <option value="call">Call</option>
        <option value="put">Put</option>
      </select>
    </div>
    <div class="control">
      <label>Strike price <span id="strike-val-${optionCount}" class="small">1.00</span></label>
      <input id="strike-${optionCount}" type="number" step="0.01" min="0.01" value="${strike}">
    </div>
    <div class="control">
      <label>Days to expiry <span id="days-val-${optionCount}" class="small">30</span></label>
      <input id="days-${optionCount}" type="range" min="0" max="365" step="1" value="${days}">
    </div>
  `;

  container.appendChild(optionDiv);
  document.getElementById(`otype-${optionCount}`).value = type;
  
  // attach remove button handler
  optionDiv.querySelector(".remove-btn").addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    document.getElementById(`option-${id}`).remove();
    updateValues();
  });

  updateValues();
};


document.getElementById("addOptionBtn").addEventListener("click", () => {
  addOption();
});

// Gather all options that are still in the DOM
function getOptions() {
  const optionDivs = document.querySelectorAll(".option-block");
  const options = [];

  optionDivs.forEach(div => {
    const id = div.id.split("-")[1];
    const type = document.getElementById(`otype-${id}`).value;
    const strike = parseFloat(document.getElementById(`strike-${id}`).value);
    const days = parseInt(document.getElementById(`days-${id}`).value);
    options.push({ id, type, strike, days });
  });

  return options;
}

function updateOptionLabels() {
  const optionDivs = document.querySelectorAll(".option-block");

  optionDivs.forEach(div => {
    const id = div.id.split("-")[1];

    const strikeInput = document.getElementById(`strike-${id}`);
    const strikeVal = document.getElementById(`strike-val-${id}`);
    strikeVal.textContent = strikeInput.value;

    const daysInput = document.getElementById(`days-${id}`);
    const daysVal = document.getElementById(`days-val-${id}`);
    daysVal.textContent = daysInput.value;
  });
}











// -----------------------------------------------------
function calcPrices(strike, iv, days, rPct, type, centerSpot){
  const minSpot = Math.max(0.0001, centerSpot * 0.5);
  const maxSpot = Math.max(centerSpot * 0.6, centerSpot * 2.0);
  const steps = 128;
  const xs = [], prices = [];
  for (let i = 0; i <= steps; i++){
    const spot = minSpot + (maxSpot - minSpot) * (i / steps);
    xs.push(formatNumber(spot));
    let price = bsPrice(spot, strike, rPct, days, iv, type);
    if (price < 0) price = 0; // Ensure no negative prices
    prices.push(price);
  }
  return { xs, prices };
}

function getStockParameters(){
  // Read input values
  const spot = parseFloat(spotEl.value) || 1;
  const iv = parseFloat(ivEl.value) || 40;
  const rPct = parseFloat(rEl.value);
  const ivSell = parseFloat(ivSellEl.value) || 40;
  const daysSell = parseFloat(daysSellEl.value);
  const rPctSell = parseFloat(rSellEl.value);

  // Update display values
  spotVal.textContent = formatNumber(spot);
  ivVal.textContent = formatNumber(iv);
  rVal.textContent = formatNumber(rPct) + '%';
  ivSellVal.textContent = formatNumber(ivSell);
  daysSellVal.textContent = daysSell;
  rSellVal.textContent = formatNumber(rPctSell) + '%';
  return { spot, iv, rPct, ivSell, daysSell, rPctSell };
}








function getOptionColor(i, count, variant = 0) {
  const hue = i * 360 / count; // spread hues evenly (60° apart, adjust as needed)
  const lightness = variant === 0 ? 40 : 60; // first dataset darker, second lighter
  return `hsl(${hue}, 70%, ${lightness}%)`;
}

function updateChartData(spot, iv, rPct, ivSell, daysSell, rPctSell) {
  const options = getOptions();

  // Each option will now have 2 datasets → total = options.length * 2
  if (options.length * 2 !== priceChart.data.datasets.length) {
    priceChart.data.datasets = options.flatMap((_, i) => [
      {
        data: [],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
        borderColor: getOptionColor(i, options.length, 1), // secondary line (same hue, diff lightness)
        borderDash: [5, 2] // optional: dashed to differentiate
      },
      {
        data: [],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
        borderColor: getOptionColor(i, options.length, 0), // primary line
      }
    ]);
  }

  
  let combined = []; // will hold sum across all options
  let combinedSell = []; // will hold sum across all options

  options.forEach((element, i) => {
    let { id, strike, type, days } = element;

    // premium based on buy side
    let premium = bsPrice(spot, strike, rPct, days, iv, type);

    // Chart 1: initial (buy side)
    let resBuy = calcPrices(strike, iv, 0, rPct, type, spot);
    let pnlBuy = resBuy.prices.map(p => p - premium);
    priceChart.data.datasets[i*2].data = pnlBuy;
    priceChart.data.datasets[i*2].label = `Option ${id} (${type})`;

    // Chart 1: after sell side
    let resSell = calcPrices(strike, ivSell, days - daysSell, rPctSell, type, spot);
    let pnlSell = resSell.prices.map(p => p - premium);
    priceChart.data.datasets[i*2+1].data = pnlSell;
    

    if (combined.length === 0) {
      combined = pnlSell.slice(); 
    } else {
      combined = combined.map((val, idx) => val + pnlSell[idx]);
    }

    if (combinedSell.length === 0) {
      combinedSell = pnlBuy.slice(); 
    } else {
      combinedSell = combinedSell.map((val, idx) => val + pnlBuy[idx]);
    }


    priceChart.data.labels = resBuy.xs;
  });

  // --- update pnlChart with the combined sum ---
  pnlChart.data.labels = priceChart.data.labels;
  pnlChart.data.datasets[0].data = combinedSell;
  pnlChart.data.datasets[1].data = combined;


  priceChart.update();
  pnlChart.update();
}


function updateValues(){
  updateOptionLabels();
  const { spot, iv, rPct, ivSell, daysSell, rPctSell } = getStockParameters();
  updateChartData(spot, iv, rPct, ivSell, daysSell, rPctSell);
}


window.addEventListener('DOMContentLoaded', () => {
  initChart();
  addOption("put", 0.80, 100);
  addOption("call", 1.20, 100);

  // attach to static inputs
  document.querySelectorAll('input,select').forEach(el => 
    el.addEventListener('input', updateValues)
  );

  // also catch dynamically added ones
  document.getElementById("options-container").addEventListener("input", (e) => {
    if (e.target.matches("input, select")) {
      updateValues();
    }
  });
});


const spotEl = document.getElementById('spot');
const spotVal = document.getElementById('spot-val');
const ivEl = document.getElementById('iv');
const ivVal = document.getElementById('iv-val');
const rEl = document.getElementById('r');
const rVal = document.getElementById('r-val');

const ivSellEl = document.getElementById('iv2');
const ivSellVal = document.getElementById('iv-val2');
const daysSellEl = document.getElementById('days2');
const daysSellVal = document.getElementById('days-val2');
const rSellEl = document.getElementById('r2');
const rSellVal = document.getElementById('r-val2');
