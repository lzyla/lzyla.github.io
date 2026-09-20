// ---------------------------------------------------------------------------
// Sunny Mart — game configuration (data-driven)
// All balance numbers, products, upgrades and the store layout live here.
// ---------------------------------------------------------------------------

export const TILE = 64;
export const MAP_COLS = 30;
export const MAP_ROWS = 24;
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'sunny-mart-save-v1';

// Products ------------------------------------------------------------------
// price: money per unit; productionTime: seconds per unit at level 1;
// stationCapacity: units a station can hold before it stops producing.
export const PRODUCTS = {
  carrot: { id: 'carrot', name: 'Marchewki', price: 6,  productionTime: 2.0, stationCapacity: 6,  shelfBase: 8,  color: '#ff8a3d', accent: '#4caf50' },
  apple:  { id: 'apple',  name: 'Jabłka',    price: 9,  productionTime: 2.6, stationCapacity: 6,  shelfBase: 8,  color: '#e53935', accent: '#7cb342' },
  tomato: { id: 'tomato', name: 'Pomidory',  price: 12, productionTime: 3.2, stationCapacity: 6,  shelfBase: 8,  color: '#ef4136', accent: '#43a047' },
  milk:   { id: 'milk',   name: 'Mleko',     price: 18, productionTime: 4.0, stationCapacity: 5,  shelfBase: 6,  color: '#ffffff', accent: '#42a5f5' },
  eggs:   { id: 'eggs',   name: 'Jajka',     price: 24, productionTime: 4.6, stationCapacity: 5,  shelfBase: 6,  color: '#fff3d6', accent: '#c9a26b' },
  bread:  { id: 'bread',  name: 'Chleb',     price: 32, productionTime: 5.5, stationCapacity: 4,  shelfBase: 6,  color: '#d99a4e', accent: '#f5deb3' },
};

export const PRODUCT_ORDER = ['carrot', 'apple', 'tomato', 'milk', 'eggs', 'bread'];

// Upgrades (bought from the upgrade panel) -----------------------------------
// cost(level) = base * growth^level  (level = number already bought)
export const UPGRADES = {
  // player
  speed:        { group: 'player', name: 'Szybkość',        desc: 'Szybszy ruch gracza',            base: 40,  growth: 1.45, max: 8,  icon: 'boots' },
  capacity:     { group: 'player', name: 'Nośność',         desc: '+1 do stosu produktów',          base: 60,  growth: 1.45, max: 8,  icon: 'stack' },
  interaction:  { group: 'player', name: 'Zwinność',        desc: 'Szybsze zbieranie i kasa',       base: 50,  growth: 1.45, max: 6,  icon: 'hand' },
  // store
  production:   { group: 'store',  name: 'Produkcja',       desc: 'Stanowiska produkują szybciej',  base: 90,  growth: 1.5,  max: 8,  icon: 'sprout' },
  shelf:        { group: 'store',  name: 'Regały',          desc: '+2 miejsca na każdej półce',     base: 80,  growth: 1.5,  max: 6,  icon: 'shelf' },
  prices:       { group: 'store',  name: 'Marketing',       desc: 'Produkty warte +10%',            base: 150, growth: 1.55, max: 8,  icon: 'tag' },
  checkout:     { group: 'store',  name: 'Kasa',            desc: 'Szybsza obsługa klientów',       base: 100, growth: 1.5,  max: 6,  icon: 'till' },
  // workers
  workerSpeed:  { group: 'staff',  name: 'Tempo załogi',    desc: 'Pracownicy chodzą szybciej',     base: 120, growth: 1.5,  max: 6,  icon: 'boots', requires: 'anyWorker' },
  workerCarry:  { group: 'staff',  name: 'Nośność załogi',  desc: '+1 do stosu pracownika',         base: 140, growth: 1.5,  max: 6,  icon: 'stack', requires: 'anyWorker' },
};

export const BALANCE = {
  playerBaseSpeed: 230,          // px/s
  playerSpeedPerLevel: 0.11,     // +11% each level
  playerBaseCapacity: 4,
  interactionPerLevel: 0.2,
  collectInterval: 0.28,         // seconds between items picked
  deliverInterval: 0.2,
  productionPerLevel: 0.15,
  shelfPerLevel: 2,
  pricePerLevel: 0.10,
  checkoutBaseTime: 1.4,         // seconds to serve a customer
  checkoutPerLevel: 0.15,
  workerBaseSpeed: 150,
  workerSpeedPerLevel: 0.12,
  workerBaseCapacity: 3,
  customerSpeed: 120,
  customerPatience: 6,           // seconds waiting at empty shelf
  spawnBase: 5.5,                // seconds between customers at start
  spawnMin: 1.6,
  maxCustomersBase: 3,
  startMoney: 0,
};

// Store layout ---------------------------------------------------------------
// Everything is expressed in tiles. Sections are floor areas that can be
// unlocked; objects (stations, shelves, checkouts) belong to a section and
// appear either immediately (`builtIn`) or when their purchase zone is bought.
//
// Zone kinds: 'section' (unlock floor), 'station', 'shelf', 'checkout', 'hire'.
export const SECTIONS = {
  core:   { x: 9,  y: 6,  w: 10, h: 14, builtIn: true },
  walk:   { x: 9,  y: 20, w: 10, h: 4,  builtIn: true, outdoor: true },
  east:   { x: 19, y: 6,  w: 7,  h: 14 },
  west:   { x: 2,  y: 6,  w: 7,  h: 14 },
  north:  { x: 9,  y: 0,  w: 10, h: 6 },
  northWest: { x: 2, y: 0, w: 7, h: 6 },
  northEast: { x: 19, y: 0, w: 7, h: 6 },
};

// Objects. `facing` tells where customers/players interact from.
export const OBJECTS = [
  // --- core (given at start)
  { id: 'carrot_field',  kind: 'station', product: 'carrot', look: 'field',   section: 'core', x: 10, y: 7,  w: 3, h: 2, builtIn: true },
  { id: 'carrot_shelf',  kind: 'shelf',   product: 'carrot', section: 'core', x: 12, y: 12, w: 3, h: 1, builtIn: true },
  { id: 'checkout1',     kind: 'checkout', section: 'core', x: 15, y: 16, w: 2, h: 1, builtIn: true },
  // --- east
  { id: 'apple_tree',    kind: 'station', product: 'apple', look: 'tree',     section: 'east', x: 22, y: 7,  w: 2, h: 2 },
  { id: 'apple_shelf',   kind: 'shelf',   product: 'apple',  section: 'east', x: 21, y: 12, w: 3, h: 1 },
  { id: 'checkout2',     kind: 'checkout', section: 'east', x: 21, y: 16, w: 2, h: 1 },
  // --- west
  { id: 'tomato_field',  kind: 'station', product: 'tomato', look: 'bushes', section: 'west', x: 3,  y: 7,  w: 3, h: 2 },
  { id: 'tomato_shelf',  kind: 'shelf',   product: 'tomato', section: 'west', x: 4,  y: 12, w: 3, h: 1 },
  // --- north (milk)
  { id: 'milk_station',  kind: 'station', product: 'milk',   look: 'dairy',  section: 'north', x: 12, y: 1, w: 3, h: 2 },
  { id: 'milk_shelf',    kind: 'shelf',   product: 'milk',   section: 'north', x: 12, y: 4, w: 3, h: 1 },
  // --- north-west (eggs)
  { id: 'egg_station',   kind: 'station', product: 'eggs',   look: 'coop',   section: 'northWest', x: 4, y: 1, w: 3, h: 2 },
  { id: 'egg_shelf',     kind: 'shelf',   product: 'eggs',   section: 'northWest', x: 4, y: 4, w: 3, h: 1 },
  // --- north-east (bread)
  { id: 'bakery',        kind: 'station', product: 'bread',  look: 'bakery', section: 'northEast', x: 21, y: 1, w: 3, h: 2 },
  { id: 'bread_shelf',   kind: 'shelf',   product: 'bread',  section: 'northEast', x: 21, y: 4, w: 3, h: 1 },
];

// Purchase zones. `requires` = ids of zones that must be bought first.
// Zones for objects sit on the object's footprint; section zones sit at the
// border tile inside an already unlocked section.
export const ZONES = [
  { id: 'expand_east',  kind: 'section', target: 'east',  cost: 90,   x: 18, y: 10, w: 1, h: 2, label: 'Nowa sekcja', requires: [] },
  { id: 'apple_tree',   kind: 'object',  target: 'apple_tree',  cost: 70,  label: 'Jabłonka',      requires: ['expand_east'] },
  { id: 'apple_shelf',  kind: 'object',  target: 'apple_shelf', cost: 50,  label: 'Regał: jabłka', requires: ['expand_east'] },
  { id: 'hire_stocker', kind: 'hire',    role: 'stocker', cost: 260, x: 10, y: 16, w: 1, h: 1, label: 'Zatrudnij: magazynier', requires: ['apple_shelf'] },

  { id: 'expand_west',  kind: 'section', target: 'west',  cost: 220,  x: 9, y: 10, w: 1, h: 2, label: 'Nowa sekcja', requires: ['apple_tree'] },
  { id: 'tomato_field', kind: 'object',  target: 'tomato_field', cost: 140, label: 'Grządka pomidorów', requires: ['expand_west'] },
  { id: 'tomato_shelf', kind: 'object',  target: 'tomato_shelf', cost: 90,  label: 'Regał: pomidory',   requires: ['expand_west'] },

  { id: 'hire_cashier', kind: 'hire',    role: 'cashier', cost: 420, x: 17, y: 15, w: 1, h: 1, label: 'Zatrudnij: kasjer', requires: ['tomato_shelf'] },

  { id: 'expand_north', kind: 'section', target: 'north', cost: 480, x: 13, y: 6, w: 2, h: 1, label: 'Nowa sekcja', requires: ['tomato_field'] },
  { id: 'milk_station', kind: 'object',  target: 'milk_station', cost: 320, label: 'Obora mleczna', requires: ['expand_north'] },
  { id: 'milk_shelf',   kind: 'object',  target: 'milk_shelf',   cost: 180, label: 'Regał: mleko',  requires: ['expand_north'] },

  { id: 'checkout2',    kind: 'object',  target: 'checkout2', cost: 380, label: 'Druga kasa', requires: ['hire_cashier'] },
  { id: 'hire_stocker2',kind: 'hire',    role: 'stocker', cost: 650, x: 4, y: 16, w: 1, h: 1, label: 'Zatrudnij: magazynier', requires: ['milk_shelf'] },

  { id: 'expand_nw',    kind: 'section', target: 'northWest', cost: 800, x: 9, y: 2, w: 1, h: 2, label: 'Nowa sekcja', requires: ['milk_station'] },
  { id: 'egg_station',  kind: 'object',  target: 'egg_station', cost: 520, label: 'Kurnik',       requires: ['expand_nw'] },
  { id: 'egg_shelf',    kind: 'object',  target: 'egg_shelf',   cost: 300, label: 'Regał: jajka', requires: ['expand_nw'] },

  { id: 'expand_ne',    kind: 'section', target: 'northEast', cost: 1200, x: 18, y: 2, w: 1, h: 2, label: 'Nowa sekcja', requires: ['egg_station'] },
  { id: 'bakery',       kind: 'object',  target: 'bakery',      cost: 900, label: 'Piekarnia',     requires: ['expand_ne'] },
  { id: 'bread_shelf',  kind: 'object',  target: 'bread_shelf', cost: 480, label: 'Regał: chleb',  requires: ['expand_ne'] },
  { id: 'hire_cashier2',kind: 'hire',    role: 'cashier', cost: 1000, x: 23, y: 15, w: 1, h: 1, label: 'Zatrudnij: kasjer', requires: ['checkout2', 'bread_shelf'] },
  { id: 'hire_stocker3',kind: 'hire',    role: 'stocker', cost: 1500, x: 23, y: 2, w: 1, h: 1, label: 'Zatrudnij: magazynier', requires: ['bakery'] },
];

// Where customers appear / disappear (tile coordinates, center of tile).
export const SPAWN = { x: 13.5, y: 23.4 };
export const DOOR  = { x: 13.5, y: 19.5 };

// Decorations placed on the grass outside the store (purely visual).
export const DECOR = [
  { kind: 'tree', x: 0.7, y: 8.5 }, { kind: 'tree', x: 1.2, y: 15 }, { kind: 'tree', x: 28.5, y: 9 },
  { kind: 'tree', x: 28.3, y: 17 }, { kind: 'bush', x: 27.2, y: 12.5 }, { kind: 'bush', x: 0.9, y: 12 },
  { kind: 'bush', x: 6.5, y: 21.5 }, { kind: 'bush', x: 21.5, y: 21.5 }, { kind: 'tree', x: 4, y: 22.5 },
  { kind: 'tree', x: 25, y: 22.7 }, { kind: 'flowers', x: 7.5, y: 20.6 }, { kind: 'flowers', x: 19.6, y: 20.6 },
  { kind: 'bush', x: 27, y: 3 }, { kind: 'bush', x: 1, y: 3.5 }, { kind: 'tree', x: 27.5, y: 0.8 }, { kind: 'tree', x: 0.8, y: 0.8 },
];
