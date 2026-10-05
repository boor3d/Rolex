// Shared vocabulary: families, metals, dials, bezels, bracelets.
// Rendering hints (idx, hands, date…) are defaults the watch renderer falls back to.

export const FAMILIES = [
  { key: 'oyster-early', name: 'Oyster & Bubbleback', since: 1926, idx: 'explorer', hands: 'baton', date: false,
    blurb: 'The 1926 Oyster was the first waterproof wristwatch; the 1931 Perpetual rotor gave us the Bubbleback.' },
  { key: 'precision', name: 'Oyster Precision', since: 1950, idx: 'baton', hands: 'baton', date: 'name',
    blurb: 'Manual-wind Oysters — the honest, everyday Rolex of the 60s and 70s.' },
  { key: 'submariner', name: 'Submariner', since: 1953, idx: 'dive', hands: 'mercedes', date: 'name', guards: true,
    blurb: 'The archetypal dive watch. Unidirectional bezel, Mercedes hands, waterproof to 300 m.' },
  { key: 'turn-o-graph', name: 'Turn-O-Graph', since: 1953, idx: 'baton', hands: 'baton', date: true,
    blurb: 'The first Rolex with a rotating graduated bezel; later the Datejust “Thunderbird”.' },
  { key: 'explorer', name: 'Explorer', since: 1953, idx: 'explorer', hands: 'mercedes', date: false,
    blurb: 'Born from the 1953 Everest ascent. 3-6-9 dial, pure tool-watch restraint.' },
  { key: 'gmt-master', name: 'GMT-Master', since: 1954, idx: 'dive', hands: 'mercedes', date: true, gmt: true, guards: true,
    blurb: 'Developed with Pan Am for transatlantic crews. The 24-hour bezel started here.' },
  { key: 'gmt-master-ii', name: 'GMT-Master II', since: 1983, idx: 'dive', hands: 'mercedes', date: true, gmt: true, guards: true,
    blurb: 'An independently set hour hand for a true third time zone — and the two-colour Cerachrom bezels.' },
  { key: 'milgauss', name: 'Milgauss', since: 1956, idx: 'baton', hands: 'baton', date: false,
    blurb: 'Antimagnetic to 1,000 gauss for scientists at CERN. Lightning-bolt seconds hand.' },
  { key: 'day-date', name: 'Day-Date', since: 1956, idx: 'daydate', hands: 'baton', date: true, day: true,
    blurb: 'The “President”. Only ever in precious metal, with the day spelled out in full.' },
  { key: 'air-king', name: 'Air-King', since: 1945, idx: 'airking', hands: 'mercedes', date: false,
    blurb: 'A tribute to RAF pilots — now an aviation-dial icon.' },
  { key: 'oyster-perpetual', name: 'Oyster Perpetual', since: 1931, idx: 'baton', hands: 'baton', date: false,
    blurb: 'The purest expression of the Oyster: time only, bold colours, impeccable proportions.' },
  { key: 'date', name: 'Oyster Perpetual Date', since: 1962, idx: 'baton', hands: 'baton', date: true,
    blurb: 'The 34 mm Oyster with a date — the Datejust’s understated sibling.' },
  { key: 'datejust', name: 'Datejust', since: 1945, idx: 'baton', hands: 'baton', date: true,
    blurb: 'The first self-winding chronometer with a date window. The definitive Rolex.' },
  { key: 'lady-datejust', name: 'Lady-Datejust', since: 1957, idx: 'baton', hands: 'baton', date: true,
    blurb: 'The Datejust in 26–28 mm.' },
  { key: 'daytona', name: 'Cosmograph Daytona', since: 1963, idx: 'daytona', hands: 'baton', date: false, pushers: true,
    blurb: 'The racing chronograph. From Valjoux to Zenith to calibre 4131.' },
  { key: 'sea-dweller', name: 'Sea-Dweller', since: 1967, idx: 'dive', hands: 'mercedes', date: true, guards: true,
    blurb: 'Saturation-diving tool with a helium escape valve, developed with COMEX.' },
  { key: 'explorer-ii', name: 'Explorer II', since: 1971, idx: 'dive', hands: 'mercedes', date: true, gmt: true, guards: true,
    blurb: 'For speleologists and polar explorers — a fixed 24-hour bezel to tell day from night.' },
  { key: 'oysterquartz', name: 'Oysterquartz', since: 1977, idx: 'baton', hands: 'baton', date: true,
    blurb: 'Rolex’s answer to the quartz crisis, in a faceted integrated case.' },
  { key: 'deepsea', name: 'Deepsea', since: 2008, idx: 'dive', hands: 'mercedes', date: true, guards: true,
    blurb: 'Ringlock-system divers rated to 3,900 m — and 11,000 m for the Challenge.' },
  { key: 'yacht-master', name: 'Yacht-Master', since: 1992, idx: 'dive', hands: 'mercedes', date: true, guards: true,
    blurb: 'The nautical Rolex: bidirectional bezel with raised numerals, precious metals, Oysterflex.' },
  { key: 'pearlmaster', name: 'Pearlmaster', since: 1992, idx: 'baton', hands: 'baton', date: true,
    blurb: 'The jeweller’s Datejust with its own five-row bracelet.' },
  { key: 'yacht-master-ii', name: 'Yacht-Master II', since: 2007, idx: 'dive', hands: 'mercedes', date: false, guards: true,
    blurb: 'A regatta chronograph with a programmable countdown.' },
  { key: 'sky-dweller', name: 'Sky-Dweller', since: 2012, idx: 'sky', hands: 'baton', date: true,
    blurb: 'Annual calendar and dual time zone, all driven by the Ring Command bezel.' },
  { key: 'cellini', name: 'Cellini', since: 1968, idx: 'baton', hands: 'baton', date: 'name',
    blurb: 'Rolex’s classical dress collection, retired in 2023.' },
  { key: 'perpetual-1908', name: 'Perpetual 1908', since: 2023, idx: 'explorer', hands: 'baton', date: false,
    blurb: 'Named for the year Wilsdorf registered “Rolex”. Slim, gold, display back.' },
  { key: 'land-dweller', name: 'Land-Dweller', since: 2025, idx: 'baton', hands: 'baton', date: false,
    blurb: 'Integrated Flat Jubilee bracelet and the 5 Hz Dynapulse escapement.' },
];
export const FAMILY = Object.fromEntries(FAMILIES.map(f => [f.key, f]));

// tone: [highlight, mid, shadow]. Composite metals point at a base (case) and accent (bezel, crown, centre links).
export const METALS = {
  'steel':           { name: 'Oystersteel', tone: ['#f6f7f9', '#c3c7cd', '#7f858d'] },
  'white-gold':      { name: '18 ct white gold', tone: ['#fdfdfe', '#d6d8dd', '#9a9fa7'] },
  'yellow-gold':     { name: '18 ct yellow gold', tone: ['#fff0b8', '#d9b15a', '#97702a'] },
  'everose':         { name: '18 ct Everose gold', tone: ['#fde1d0', '#d79e83', '#9e604a'] },
  'rose-gold':       { name: '18 ct rose gold', tone: ['#fde1d0', '#d49a80', '#9b5e48'] },
  'platinum':        { name: '950 platinum', tone: ['#fbfbf9', '#dcdcd7', '#a2a39d'] },
  'titanium':        { name: 'RLX titanium', tone: ['#d2d4d6', '#94989c', '#5a5e62'] },
  'rolesor-yellow':  { name: 'Yellow Rolesor', base: 'steel', accent: 'yellow-gold' },
  'rolesor-white':   { name: 'White Rolesor', base: 'steel', accent: 'white-gold' },
  'rolesor-everose': { name: 'Everose Rolesor', base: 'steel', accent: 'everose' },
  'rolesium':        { name: 'Rolesium', base: 'steel', accent: 'platinum' },
};
export const metalBase = k => (METALS[k]?.base || (METALS[k] ? k : 'steel'));
export const metalAccent = k => (METALS[k]?.accent || (METALS[k] ? k : 'steel'));
export const metalName = k => METALS[k]?.name || k || '—';
// Colour that stands in for a metal in swatches (accent wins for two-tone).
export const metalSwatch = k => {
  const b = METALS[metalBase(k)].tone[1], a = METALS[metalAccent(k)].tone[1];
  return b === a ? b : `linear-gradient(135deg, ${b} 50%, ${a} 50%)`;
};

// Dial colours. sunray = brushed radial finish; subs = Daytona counter colour.
export const DIALS = {
  'black':        { name: 'Black', hex: '#141517' },
  'gilt':         { name: 'Gilt black', hex: '#121110', print: '#d8b66d' },
  'white':        { name: 'White', hex: '#f3f2ed' },
  'polar':        { name: 'Polar white', hex: '#f5f5f2' },
  'cream':        { name: 'Cream', hex: '#efe4c8' },
  'silver':       { name: 'Silver', hex: '#d2d4d6', sunray: true },
  'champagne':    { name: 'Champagne', hex: '#d8bf8a', sunray: true },
  'blue':         { name: 'Blue', hex: '#1e3f87', sunray: true },
  'bright-blue':  { name: 'Bright blue', hex: '#2563c4', sunray: true },
  'd-blue':       { name: 'D-Blue', hex: '#1a4fa3', fade: '#050608' },
  'z-blue':       { name: 'Z-Blue', hex: '#2b5ea8', sunray: true },
  'ice-blue':     { name: 'Ice blue', hex: '#cde4ec', sunray: true },
  'green':        { name: 'Green', hex: '#1d5a3a', sunray: true },
  'green-ceramic':{ name: 'Green ceramic', hex: '#1b4a33' },
  'green-ombre':  { name: 'Green ombré', hex: '#2f7a4f', fade: '#050b07' },
  'mint-green':   { name: 'Mint green', hex: '#a9d6c3', sunray: true },
  'olive':        { name: 'Olive green', hex: '#55602f', sunray: true },
  'pistachio':    { name: 'Pistachio', hex: '#c9dba8' },
  'slate':        { name: 'Slate', hex: '#4b5158', sunray: true },
  'dark-rhodium': { name: 'Dark rhodium', hex: '#3a3d42', sunray: true },
  'wimbledon':    { name: 'Wimbledon', hex: '#4a5056', sunray: true, roman: '#2f9a5a' },
  'meteorite':    { name: 'Meteorite', hex: '#8c8e91', pattern: 'meteorite' },
  'mop':          { name: 'Mother-of-pearl', hex: '#efebe6', pattern: 'mop' },
  'tiger-iron':   { name: 'Tiger iron', hex: '#6e4426', pattern: 'stone' },
  'enamel-white': { name: 'Grand Feu enamel', hex: '#f8f6f0' },
  'chocolate':    { name: 'Chocolate', hex: '#4b2c20', sunray: true },
  'brown':        { name: 'Brown', hex: '#57382a', sunray: true },
  'sundust':      { name: 'Sundust', hex: '#e2c0aa', sunray: true },
  'pink':         { name: 'Candy pink', hex: '#f1a6ba' },
  'coral':        { name: 'Coral red', hex: '#df5547' },
  'red-grape':    { name: 'Red grape', hex: '#6d2234', sunray: true },
  'aubergine':    { name: 'Aubergine', hex: '#4a2341', sunray: true },
  'lavender':     { name: 'Lavender', hex: '#c7bde0' },
  'turquoise':    { name: 'Turquoise', hex: '#3fb6b5' },
  'yellow':       { name: 'Yellow', hex: '#f3c22f' },
  'beige':        { name: 'Beige', hex: '#e6d7bd' },
  'panda':        { name: 'Panda', hex: '#f3f2ee', subs: '#151515' },
  'exotic':       { name: 'Exotic “Paul Newman”', hex: '#ece5d3', subs: '#141414', track: '#141414' },
};
export const dialName = k => DIALS[k]?.name || k || '—';

export const BEZEL_COLORS = {
  black: ['Black', '#17191b'], blue: ['Blue', '#1d3b8c'], red: ['Red', '#b8212f'], green: ['Green', '#1d6b44'],
  brown: ['Brown', '#5a3424'], grey: ['Grey', '#7c8085'], gold: ['Gold', null], steel: ['Steel', null],
  'white-gold': ['White gold', null], everose: ['Everose', null], platinum: ['Platinum', null],
};
const GMT_NICK = {
  'red/blue': 'Pepsi', 'black/blue': 'Batman', 'red/black': 'Coke', 'black/brown': 'Root Beer',
  'brown/gold': 'Root Beer', 'green/black': 'Sprite', 'black/grey': 'Bruce Wayne / Guinness',
};
export function parseBezel(code = 'smooth') {
  const [type, c = ''] = code.split(':');
  return { type, colors: c ? c.split('/') : [] };
}
const cname = c => (BEZEL_COLORS[c]?.[0] || c).toLowerCase();
export function bezelName(code) {
  const { type, colors } = parseBezel(code);
  switch (type) {
    case 'smooth': return 'Smooth';
    case 'fluted': return 'Fluted';
    case 'engine': return 'Engine-turned';
    case 'dive': return `Diver’s, ${cname(colors[0])}`;
    case 'gmt': {
      const nick = GMT_NICK[colors.join('/')];
      return `24-hour, ${colors.map(cname).join('/')}${nick ? ` “${nick}”` : ''}`;
    }
    case 'tachy': return `Tachymeter, ${cname(colors[0])}`;
    case 'e2': return 'Fixed 24-hour, steel';
    case 'ym': return `Bidirectional, ${cname(colors[0])}`;
    case 'regatta': return `Regatta countdown, ${cname(colors[0])}`;
    case 'turn': return `Rotating graduated, ${cname(colors[0])}`;
    default: return code;
  }
}
// Broad bezel group for coverage stats.
export function bezelGroup(code) {
  return { smooth: 'Smooth', fluted: 'Fluted', engine: 'Engine-turned', dive: 'Diver’s', gmt: '24-hour GMT',
    tachy: 'Tachymeter', e2: 'Fixed 24-hour', ym: 'Bidirectional', regatta: 'Regatta', turn: 'Turn-O-Graph' }[parseBezel(code).type] || 'Other';
}

export const BRACELETS = {
  'oyster': 'Oyster', 'jubilee': 'Jubilee', 'president': 'President', 'pearlmaster': 'Pearlmaster',
  'oysterflex': 'Oysterflex', 'leather': 'Leather strap', 'flat-jubilee': 'Flat Jubilee', 'rivet': 'Riveted Oyster',
};
export const braceletName = k => BRACELETS[k] || k || '—';

export const CONDITIONS = ['Unworn', 'Excellent', 'Very good', 'Good', 'Fair'];
export const SETS = { 'full': 'Box & papers', 'papers': 'Papers only', 'box': 'Box only', 'none': 'Watch only' };
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'HKD', 'SGD', 'AED'];
