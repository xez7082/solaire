import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. L'ÉDITEUR VISUEL COMPLET ---
class SolaireCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    const value = ev.detail ? ev.detail.value : target.value;

    const newConfig = { ...this._config, [configValue]: value };
    
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <div class="card-config">
        <h3>🖼️ Image & Titre</h3>
        <paper-input label="Titre de la carte" .value="${this._config.card_title}" .configValue="${"card_title"}" @value-changed="${this._valueChanged}"></paper-input>
        <paper-input label="URL Image de fond (ex: /local/post.png)" .value="${this._config.background_image}" .configValue="${"background_image"}" @value-changed="${this._valueChanged}"></paper-input>
        
        <h3>☀️ Production Solaire (W)</h3>
        <ha-entity-picker label="PV Maison" .hass="${this.hass}" .value="${this._config.sensor_pv1}" .configValue="${"sensor_pv1"}" @value-changed="${this._valueChanged}"></ha-entity-picker>
        <ha-entity-picker label="PV Spa" .hass="${this.hass}" .value="${this._config.sensor_pv2}" .configValue="${"sensor_pv2"}" @value-changed="${this._valueChanged}"></ha-entity-picker>
        <ha-entity-picker label="PV IBC" .hass="${this.hass}" .value="${this._config.sensor_pv3}" .configValue="${"sensor_pv3"}" @value-changed="${this._valueChanged}"></ha-entity-picker>

        <h3>🔋 Batterie & Consommation</h3>
        <ha-entity-picker label="Batterie SoC (%)" .hass="${this.hass}" .value="${this._config.sensor_bat1_soc}" .configValue="${"sensor_bat1_soc"}" @value-changed="${this._valueChanged}"></ha-entity-picker>
        <ha-entity-picker label="Puissance Batterie (W)" .hass="${this.hass}" .value="${this._config.sensor_bat1_power}" .configValue="${"sensor_bat1_power"}" @value-changed="${this._valueChanged}"></ha-entity-picker>
        <ha-entity-picker label="Consommation Maison (W)" .hass="${this.hass}" .value="${this._config.sensor_home_load}" .configValue="${"sensor_home_load"}" @value-changed="${this._valueChanged}"></ha-entity-picker>
        <ha-entity-picker label="Réseau / Grid (W)" .hass="${this.hass}" .value="${this._config.sensor_grid_power}" .configValue="${"sensor_grid_power"}" @value-changed="${this._valueChanged}"></ha-entity-picker>

        <h3>🌀 Paramètres Flux & Design</h3>
        <paper-input label="Couleur Néon (Hex)" .value="${this._config.border_color}" .configValue="${"border_color"}" @value-changed="${this._valueChanged}"></paper-input>
        <label>Vitesse d'animation</label>
        <ha-slider pin min="0.1" max="2" step="0.1" .value="${this._config.animation_speed}" .configValue="${"animation_speed"}" @value-changed="${this._valueChanged}"></ha-slider>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config h3 { color: #00ffff; border-bottom: 1px solid #444; padding-top: 10px; }
      ha-entity-picker, paper-input { display: block; margin-bottom: 5px; }
    `;
  }
}
customElements.define("solaire-card-editor", SolaireCardEditor);

// --- 2. LA CARTE SOLAIRE ---
class SolaireCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  static getConfigElement() { return document.createElement("solaire-card-editor"); }

  static getStubConfig() {
    return {
      card_title: "Solaire",
      background_image: "/local/post.png",
      border_color: "#00ffff",
      animation_speed: 0.5,
      sensor_pv1: "",
      sensor_home_load: ""
    };
  }

  setConfig(config) { this.config = config; }

  render() {
    if (!this.hass || !this.config) return html``;

    const pv1 = this.hass.states[this.config.sensor_pv1]?.state || "0";
    const home = this.hass.states[this.config.sensor_home_load]?.state || "0";
    const soc = this.hass.states[this.config.sensor_bat1_soc]?.state || "0";

    return html`
      <ha-card style="border: 2px solid ${this.config.border_color}; background-image: url('${this.config.background_image}'); background-size: cover;">
        <div class="overlay">
          <div class="header">${this.config.card_title}</div>
          <div class="stats-grid">
            <div class="stat-item">☀️ ${pv1} W</div>
            <div class="stat-item">🏠 ${home} W</div>
            <div class="stat-item">🔋 ${soc} %</div>
          </div>
          </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        height: 400px;
        position: relative;
        overflow: hidden;
        border-radius: 15px;
        color: white;
      }
      .overlay {
        background: rgba(0, 0, 0, 0.4);
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 15px;
      }
      .header { font-size: 24px; font-weight: bold; color: #00ffff; text-shadow: 0 0 10px #00ffff; text-align: center; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 1.2em; font-weight: bold; }
      .stat-item { background: rgba(0,0,0,0.6); margin: 5px; padding: 10px; border-radius: 8px; border: 1px solid rgba(0,255,255,0.3); }
    `;
  }
}
customElements.define("solaire-card", SolaireCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solaire-card",
  name: "Solaire Card",
  description: "Dashboard complet avec image de fond et tous les capteurs.",
});
