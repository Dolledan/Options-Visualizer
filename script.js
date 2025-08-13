function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1) * t * Math.exp(-x*x);
  return sign * y;
}
function normCDF(x){ return 0.5 * (1 + erf(x/Math.SQRT2)); }
function bsPrice(S, K, r, T, sigma, type){
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
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      scales:{
        x:{ title:{display:true,text:'Strike price (K)'} },
        y:{ title:{display:true,text:'Option fair price'} }
      }
    }
  });

  const c2 = document.getElementById('pnlChart').getContext('2d');
  pnlChart = new Chart(c2, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Profit', data: [], borderWidth: 2, pointRadius: 0, tension: 0.2, borderColor: '#0ea5b7' }
    ] },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      scales:{
        x:{ title:{display:true,text:'Strike price (K)'} },
        y:{ title:{display:true,text:'Profit'} }
      }
    }
  });
}

function calcPrices(s0, sigma, days, rPct, type, centerK){
  const T = Math.max(0, days) / 365.0;
  const r = rPct / 100.0;
  const minK = Math.max(0.0001, centerK * 0.25);
  const maxK = Math.max(centerK * 0.6, centerK * 3.0);
  const steps = 220;
  const xs = [], prices = [];
  for (let i = 0; i <= steps; i++){
    const K = minK + (maxK - minK) * (i / steps);
    xs.push(formatNumber(K));
    let price = bsPrice(s0, K, r, T, sigma, type);
    if (price < 0) price = 0; // Ensure no negative prices
    prices.push(price);
  }
  return { xs, prices };
}

function calcPnL(s0, sigma, days, rPct, type,
                 s0b, sigmaB, daysB, rPctB, typeB) {
  const T1 = Math.max(0, days) / 365.0;
  const r1 = rPct / 100.0;
  const T2 = Math.max(0, daysB) / 365.0;
  const r2 = rPctB / 100.0;

  const minK = Math.max(0.01, s0 * 0.25);
  const maxK = s0 * 3.0; 
  const steps = 220;
  const xs = [], pnl = [];

  for (let i = 0; i <= steps; i++) {
    const K = minK + (maxK - minK) * (i / steps);
    xs.push(formatNumber(K));


    const price1 = bsPrice(s0, K, r1, T1, sigma, type);
    const price2 = bsPrice(s0b, K, r2, T2, sigmaB, typeB);
    const minPrice = 1e-10;
    if (price1 <= minPrice || price2 <= minPrice) {
      pnl.push(null);
    } else {
      pnl.push(price2 / price1);
    }
  }

  return { xs, pnl };
}


function updateValues(){
  const s0 = parseFloat(s0El.value) || 1;
  const iv = parseFloat(ivEl.value) || 40;
  const days = parseFloat(daysEl.value) || 30;
  const rPct = parseFloat(rEl.value) || 2;
  const type = otypeEl.value;

  const s02 = parseFloat(s0El2.value) || 1;
  const iv2 = parseFloat(ivEl2.value) || 40;
  const days2 = parseFloat(daysEl2.value) || 30;
  const rPct2 = parseFloat(rEl2.value) || 2;

  s0Val.textContent = formatNumber(s0);
  ivVal.textContent = formatNumber(iv);
  daysVal.textContent = days;
  rVal.textContent = formatNumber(rPct) + '%';
  s0Val2.textContent = formatNumber(s02);
  ivVal2.textContent = formatNumber(iv2);
  daysVal2.textContent = days2;
  rVal2.textContent = formatNumber(rPct2) + '%';

  const res1 = calcPrices(s0, iv/100, days, rPct, type, s0);
  const res2 = calcPrices(s02, iv2/100, days2, rPct2, type, s0);

  priceChart.data.labels = res1.xs;
  priceChart.data.datasets[0].data = res1.prices;
  priceChart.data.datasets[1].data = res2.prices;
  priceChart.update();

  const pnlRes = calcPnL(s0, iv/100, days, rPct, type,
                        s02, iv2/100, days2, rPct2, type);

  pnlChart.data.labels = pnlRes.xs.map(k => formatNumber(k));
  pnlChart.data.datasets[0].data = pnlRes.pnl;
  pnlChart.update();
}

const s0El = document.getElementById('s0');
const s0Val = document.getElementById('s0-val');
const ivEl = document.getElementById('iv');
const ivVal = document.getElementById('iv-val');
const daysEl = document.getElementById('days');
const daysVal = document.getElementById('days-val');
const rEl = document.getElementById('r');
const rVal = document.getElementById('r-val');
const otypeEl = document.getElementById('otype');

const s0El2 = document.getElementById('s02');
const s0Val2 = document.getElementById('s0-val2');
const ivEl2 = document.getElementById('iv2');
const ivVal2 = document.getElementById('iv-val2');
const daysEl2 = document.getElementById('days2');
const daysVal2 = document.getElementById('days-val2');
const rEl2 = document.getElementById('r2');
const rVal2 = document.getElementById('r-val2');

window.addEventListener('DOMContentLoaded', () => {
  initChart();
  document.querySelectorAll('input,select').forEach(el => el.addEventListener('input', updateValues));
  updateValues();
});