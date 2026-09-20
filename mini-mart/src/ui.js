// DOM user interface: HUD, start screen, upgrade panel, settings, toasts.
import { UPGRADES, PRODUCTS } from './config.js';
import { formatMoney } from './utils.js';

const ICONS = {
  boots: '<svg viewBox="0 0 24 24"><path d="M5 4h6v7l7 3v4H5z" fill="#ffb74d"/><path d="M5 16h13v2H5z" fill="#6d4c41"/></svg>',
  stack: '<svg viewBox="0 0 24 24"><rect x="4" y="14" width="16" height="6" rx="1.5" fill="#d9a066"/><rect x="5" y="8" width="14" height="6" rx="1.5" fill="#e6b57a"/><rect x="7" y="3" width="10" height="5" rx="1.5" fill="#f0c98a"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-5a1.5 1.5 0 0 1 3 0v7m0-4a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7s-6-2-8-6l-2-4a1.5 1.5 0 0 1 2.6-1.4L7 12" fill="#ffd9b8" stroke="#a0522d" stroke-width="1.2"/></svg>',
  sprout: '<svg viewBox="0 0 24 24"><path d="M12 21V11" stroke="#43a047" stroke-width="2.5"/><path d="M12 12c-5 0-7-3-7-7 4 0 7 2 7 7zm0 0c5 0 7-3 7-7-4 0-7 2-7 7z" fill="#66bb6a"/></svg>',
  shelf: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="#c99a63"/><rect x="5" y="9" width="14" height="2" fill="#8d6e63"/><rect x="5" y="15" width="14" height="2" fill="#8d6e63"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 3h9l9 9-9 9-9-9z" fill="#ff7043"/><circle cx="8" cy="8" r="2" fill="#fff"/></svg>',
  till: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="10" rx="2" fill="#5c8fbf"/><rect x="6" y="4" width="12" height="6" rx="1.5" fill="#eceff1"/><rect x="8" y="6" width="8" height="2" fill="#69f0ae"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f2b91d" stroke="#b8860b" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#ffe28a" stroke-width="2"/></svg>',
};

export class UI {
  constructor(game) {
    this.g = game;
    this.$ = (id) => document.getElementById(id);
    this.money = this.$('hud-money');
    this.level = this.$('hud-level');
    this.next = this.$('hud-next');
    this.nextBar = this.$('hud-next-bar');
    this.stack = this.$('hud-stack');
    this.hint = this.$('hint');
    this.toasts = this.$('toasts');
    this.banner = this.$('banner');
    this.panel = this.$('panel-upgrades');
    this.panelList = this.$('upgrade-list');
    this.settings = this.$('panel-settings');
    this.start = this.$('screen-start');
    this.lastMoney = -1;
    this.bannerTimer = null;

    this.$('btn-upgrades').addEventListener('click', () => this.togglePanel(true));
    this.$('btn-close-upgrades').addEventListener('click', () => this.togglePanel(false));
    this.$('btn-settings').addEventListener('click', () => this.toggleSettings(true));
    this.$('btn-close-settings').addEventListener('click', () => this.toggleSettings(false));
    this.$('btn-mute').addEventListener('click', () => { game.toggleMute(); this.refreshSettings(); });
    this.$('btn-reset').addEventListener('click', () => this.confirmReset());
    this.$('btn-play').addEventListener('click', () => game.startNew());
    this.$('btn-continue').addEventListener('click', () => game.continueGame());
    this.panel.addEventListener('click', (e) => { if (e.target === this.panel) this.togglePanel(false); });
    this.settings.addEventListener('click', (e) => { if (e.target === this.settings) this.toggleSettings(false); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.togglePanel(false); this.toggleSettings(false); }
      if ((e.key === 'u' || e.key === 'U') && game.running) this.togglePanel(!this.panel.classList.contains('open'));
    });
  }

  showStart(hasSave) {
    this.start.classList.add('open');
    this.$('btn-continue').style.display = hasSave ? '' : 'none';
    this.$('hud').classList.remove('visible');
  }

  hideStart() {
    this.start.classList.remove('open');
    this.$('hud').classList.add('visible');
  }

  togglePanel(open) {
    this.panel.classList.toggle('open', open);
    this.g.paused = open || this.settings.classList.contains('open');
    if (open) this.renderUpgrades();
  }

  toggleSettings(open) {
    this.settings.classList.toggle('open', open);
    this.g.paused = open || this.panel.classList.contains('open');
    if (open) this.refreshSettings();
  }

  refreshSettings() {
    this.$('btn-mute').textContent = this.g.audio.muted ? 'Dźwięk: wyłączony' : 'Dźwięk: włączony';
    const s = this.g.stats;
    this.$('stats').innerHTML = `Obsłużeni klienci: <b>${s.customersServed}</b><br>Zarobione łącznie: <b>${formatMoney(this.g.eco.totalEarned)}</b><br>Czas gry: <b>${Math.floor(s.playTime / 60)} min</b>`;
  }

  confirmReset() {
    const btn = this.$('btn-reset');
    if (btn.dataset.armed === '1') {
      btn.dataset.armed = '0'; btn.textContent = 'Reset gry';
      this.g.resetGame();
      this.toggleSettings(false);
      return;
    }
    btn.dataset.armed = '1';
    btn.textContent = 'Na pewno? Kliknij ponownie, aby skasować postęp';
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => { btn.dataset.armed = '0'; btn.textContent = 'Reset gry'; }, 4000);
  }

  // Upgrade panel -----------------------------------------------------------
  renderUpgrades() {
    const g = this.g, eco = g.eco;
    const groups = { player: 'Gracz', store: 'Sklep', staff: 'Załoga' };
    let html = '';
    for (const [gk, gname] of Object.entries(groups)) {
      const items = Object.entries(UPGRADES).filter(([, u]) => u.group === gk && (!u.requires || (u.requires === 'anyWorker' && g.workers.length)));
      if (!items.length) continue;
      html += `<h3>${gname}</h3><div class="cards">`;
      for (const [id, u] of items) {
        const lvl = eco.level(id), maxed = lvl >= u.max, cost = eco.upgradeCost(id), can = eco.canUpgrade(id);
        html += `<button class="card ${can ? 'can' : ''} ${maxed ? 'maxed' : ''}" data-up="${id}" ${maxed || !can ? 'disabled' : ''}>
          <span class="icon">${ICONS[u.icon]}</span>
          <span class="info"><b>${u.name}</b><small>${u.desc}</small><span class="pips">${'<i class="on"></i>'.repeat(lvl)}${'<i></i>'.repeat(Math.max(0, u.max - lvl))}</span></span>
          <span class="price">${maxed ? 'MAX' : `${ICONS.coin}${formatMoney(cost)}`}</span></button>`;
      }
      html += '</div>';
    }
    this.panelList.innerHTML = html;
    this.panelList.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { g.buyUpgrade(b.dataset.up); this.renderUpgrades(); }));
    this.$('panel-money').innerHTML = `${ICONS.coin}<b>${formatMoney(eco.money)}</b>`;
  }

  // HUD ----------------------------------------------------------------------
  update() {
    const g = this.g, eco = g.eco;
    if (this.lastMoney !== Math.floor(eco.money)) {
      this.money.textContent = formatMoney(eco.money);
      if (eco.money > this.lastMoney && this.lastMoney >= 0) { this.money.parentElement.classList.remove('pop'); void this.money.offsetWidth; this.money.parentElement.classList.add('pop'); }
      this.lastMoney = Math.floor(eco.money);
    }
    const goal = g.nextGoal();
    const goalKey = `${g.storeLevel()}|${goal ? goal.id : ''}|${Math.floor(eco.money)}`;
    if (goalKey !== this.lastGoalKey) {
      this.lastGoalKey = goalKey;
      this.level.textContent = `Poziom ${g.storeLevel()}`;
      if (goal) {
        this.next.textContent = `${goal.label} · ${goal.cost}`;
        this.nextBar.style.width = `${Math.min(100, eco.money / goal.cost * 100)}%`;
        this.nextBar.parentElement.classList.toggle('ready', eco.money >= goal.cost);
      } else { this.next.textContent = 'Sklep w pełni rozbudowany!'; this.nextBar.style.width = '100%'; this.nextBar.parentElement.classList.remove('ready'); }
    }
    const p = g.player;
    const type = p.stackType;
    const stackKey = `${type}|${p.stackCount}|${p.stackCapacity}`;
    if (stackKey !== this.lastStackKey) {
      this.lastStackKey = stackKey;
      this.stack.innerHTML = `${type ? `<i class="dot" style="background:${PRODUCTS[type].color}"></i>` : ''}${p.stackCount}/${p.stackCapacity}`;
      this.stack.parentElement.classList.toggle('full', p.stackCount >= p.stackCapacity);
    }
    // upgrade button glow when something is affordable
    let can = false;
    for (const id of Object.keys(UPGRADES)) if (eco.canUpgrade(id) && (!UPGRADES[id].requires || g.workers.length)) { can = true; break; }
    this.$('btn-upgrades').classList.toggle('glow', can);
  }

  setHint(text) {
    if (this.hint.textContent === text) return;
    this.hint.textContent = text || '';
    this.hint.classList.toggle('show', !!text);
  }

  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2200);
  }

  showBanner(title, sub) {
    this.banner.querySelector('h2').textContent = title;
    this.banner.querySelector('p').textContent = sub || '';
    this.banner.classList.remove('show'); void this.banner.offsetWidth; this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.remove('show'), 2600);
  }

  flash() {
    const f = this.$('flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
}
