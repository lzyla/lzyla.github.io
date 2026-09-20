// Money, upgrade levels and derived multipliers.
import { UPGRADES, BALANCE } from './config.js';

export class Economy {
  constructor() {
    this.money = BALANCE.startMoney;
    this.levels = {};
    for (const k of Object.keys(UPGRADES)) this.levels[k] = 0;
    this.totalEarned = 0;
  }

  level(id) { return this.levels[id] || 0; }

  upgradeCost(id) {
    const u = UPGRADES[id];
    return Math.round(u.base * Math.pow(u.growth, this.level(id)));
  }

  canUpgrade(id) { return this.level(id) < UPGRADES[id].max && this.money >= this.upgradeCost(id); }

  buyUpgrade(id) {
    if (!this.canUpgrade(id)) return false;
    this.money -= this.upgradeCost(id);
    this.levels[id]++;
    return true;
  }

  spend(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  add(amount) { this.money += amount; this.totalEarned += amount; }

  // derived stats ------------------------------------------------------------
  playerSpeed() { return BALANCE.playerBaseSpeed * (1 + BALANCE.playerSpeedPerLevel * this.level('speed')); }
  playerCapacity() { return BALANCE.playerBaseCapacity + this.level('capacity'); }
  interactionMult() { return 1 + BALANCE.interactionPerLevel * this.level('interaction'); }
  productionMult() { return 1 + BALANCE.productionPerLevel * this.level('production'); }
  priceMult() { return 1 + BALANCE.pricePerLevel * this.level('prices'); }
  checkoutTime() { return BALANCE.checkoutBaseTime / (1 + BALANCE.checkoutPerLevel * this.level('checkout')); }
  workerSpeedMult() { return 1 + BALANCE.workerSpeedPerLevel * this.level('workerSpeed'); }
  workerCapacity() { return BALANCE.workerBaseCapacity + this.level('workerCarry'); }
}
