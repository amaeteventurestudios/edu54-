// Money in lessons: the learner picks a currency, lessons write prices in it.
// Rates are rough examples (US dollars per unit, October 2026), only there so that prices look sensible in every currency.
// A lesson with money sets `money: true`, writes prices with S.money (see below) and redraws in M.currency().
//   S.money.nice(usd)       a round number near that many dollars in the chosen currency (for axis steps, prices)
//   S.money.fmt(v)          v (already in the chosen currency) with its symbol: ₦1,500 · KSh 120 · 500 CFA
//   S.money.of(usd)         convert and round to two significant figures, then fmt
//   S.money.cur             { code, name, many, sym, per } of the chosen currency
export const CURRENCIES = [
  { code: 'USD', name: 'US dollar', many: 'US dollars', sym: '$', per: 1, dp: 2 },
  { code: 'EUR', name: 'Euro', many: 'euros', sym: '€', per: 0.92, dp: 2 },
  { code: 'GBP', name: 'British pound', many: 'British pounds', sym: '£', per: 0.78, dp: 2 },
  { code: 'NGN', name: 'Nigerian naira', many: 'naira', sym: '₦', per: 1550 },
  { code: 'GHS', name: 'Ghanaian cedi', many: 'cedis', sym: 'GH₵', per: 15 },
  { code: 'XOF', name: 'West African CFA franc', many: 'CFA francs', sym: 'CFA', per: 605, after: true },
  { code: 'KES', name: 'Kenyan shilling', many: 'Kenyan shillings', sym: 'KSh ', per: 129 },
  { code: 'TZS', name: 'Tanzanian shilling', many: 'Tanzanian shillings', sym: 'TSh ', per: 2600 },
  { code: 'UGX', name: 'Ugandan shilling', many: 'Ugandan shillings', sym: 'USh ', per: 3700 },
  { code: 'RWF', name: 'Rwandan franc', many: 'Rwandan francs', sym: 'FRw ', per: 1400 },
  { code: 'ETB', name: 'Ethiopian birr', many: 'birr', sym: 'Br ', per: 125, dp: 2 },
  { code: 'EGP', name: 'Egyptian pound', many: 'Egyptian pounds', sym: 'E£', per: 49, dp: 2 },
  { code: 'MAD', name: 'Moroccan dirham', many: 'dirhams', sym: 'DH', per: 9.9, after: true, dp: 2 },
  { code: 'ZAR', name: 'South African rand', many: 'rand', sym: 'R', per: 18, dp: 2 },
];
const BY = Object.fromEntries(CURRENCIES.map(c => [c.code, c]));
const REGION = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', TZ: 'TZS', UG: 'UGX', RW: 'RWF', ET: 'ETB', EG: 'EGP', MA: 'MAD', ZA: 'ZAR', GB: 'GBP',
  SN: 'XOF', CI: 'XOF', BJ: 'XOF', TG: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', GW: 'XOF',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
};

function guess() {
  for (const l of navigator.languages || [navigator.language || '']) {
    const r = (l.split('-')[1] || '').toUpperCase();
    if (REGION[r]) return REGION[r];
  }
  return 'USD';
}
let code = (() => { try { return BY[localStorage.getItem('ab-cur')] ? localStorage.getItem('ab-cur') : guess(); } catch { return guess(); } })();

const STEPS = [1, 2, 2.5, 5, 10];
export const money = {
  get cur() { return BY[code]; },
  get code() { return code; },
  set(c) { if (!BY[c]) return; code = c; try { localStorage.setItem('ab-cur', c); } catch { } },
  // round to 1, 2, 2.5 or 5 times a power of ten
  nice(usd) {
    const v = usd * BY[code].per, p = 10 ** Math.floor(Math.log10(v));
    return STEPS.reduce((b, s) => Math.abs(s * p - v) < Math.abs(b - v) ? s * p : b, p);
  },
  fmt(v) {
    const c = BY[code], small = Math.abs(v) < 10 && c.dp && Math.round(v) !== v;
    const n = Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: small ? 2 : 0, maximumFractionDigits: small ? 2 : 0 });
    return (v < 0 ? '−' : '') + (c.after ? `${n} ${c.sym}` : `${c.sym}${n}`);
  },
  of(usd) {
    const v = usd * BY[code].per;
    if (Math.abs(v) < 10) return money.fmt(Math.round(v * 100) / 100);
    const p = 10 ** (Math.floor(Math.log10(Math.abs(v))) - 1);
    return money.fmt(Math.round(v / p) * p);
  },
};
