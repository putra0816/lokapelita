'use strict';

const menuButton = document.querySelector('.menu-toggle');
const links = document.querySelector('#nav-utama');
const mobile = window.matchMedia('(max-width: 719px)');

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  links.hidden = mobile.matches && !open;
}

function syncMenu() {
  menuButton.hidden = !mobile.matches;
  setMenu(false);
}

syncMenu();
mobile.addEventListener('change', syncMenu);
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
links.addEventListener('click', (event) => {
  const anchor = event.target.closest('a');
  if (!anchor || !mobile.matches) return;
  setMenu(false);
  const destination = document.getElementById(anchor.hash.slice(1));
  if (destination) {
    destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobile.matches && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});

const form = document.querySelector('#calc-form');
const amount = document.querySelector('#biaya');
const statusSel = document.querySelector('#status');
const result = document.querySelector('#calc-result');
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const placeholder = 'Hasil simulasimu akan muncul di sini.';
form.hidden = false;

function clearResult() {
  amount.removeAttribute('aria-invalid');
  result.classList.remove('error', 'calculated');
  result.textContent = placeholder;
}

amount.addEventListener('input', clearResult);
statusSel.addEventListener('change', clearResult);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const entered = amount.value.trim();
  const validFormat = /^\d+$|^\d{1,3}(\.\d{3})+$/.test(entered);
  const expenses = Number(entered.replaceAll('.', ''));
  const married = statusSel.value === 'menikah';
  const [low, high] = married ? [6, 12] : [3, 6];
  if (!validFormat || !Number.isSafeInteger(expenses) || expenses < 1 || expenses > 999999999999) {
    result.textContent = 'Masukkan nominal Rp1 sampai Rp999.999.999.999, tanpa desimal.';
    result.classList.add('error');
    result.classList.remove('calculated');
    amount.setAttribute('aria-invalid', 'true');
    amount.focus();
    return;
  }
  const total = `${rupiah.format(expenses * low)} – ${rupiah.format(expenses * high)}`;
  const label = document.createElement('span');
  label.textContent = `Target dana darurat ${married ? 'menikah' : 'lajang'} (${low}–${high} bulan)`;
  const value = document.createElement('strong');
  value.textContent = total;
  const cta = document.createElement('a');
  cta.className = 'text-link result-cta';
  cta.href = '#mitra';
  cta.textContent = 'Target terasa besar? Diskusikan strategi bertahap lewat konsultasi keuangan';
  const note = document.createElement('p'); note.className = 'coach';
  const ph = document.createElement('img'); ph.src = 'assets/pelita-teaching.webp'; ph.alt = ''; ph.width = 40; ph.height = 40;
  const pt = document.createElement('span'); pt.textContent = 'Pelita: Belum terkumpul? Mulai dengan menyisihkan 10% penghasilan di awal bulan.';
  note.append(ph, pt);
  result.replaceChildren(label, value, cta, note);
  result.classList.remove('error');
  result.classList.add('calculated');
  amount.removeAttribute('aria-invalid');
});
