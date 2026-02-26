import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- PARTIE 1 : L'ÉDITEUR VISUEL ---
class SolaireCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    const newConfig = { ...this._config, [target.configValue]: target.value };
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
        <paper-input label="Titre" .value="${this._config.card_title}" .configValue="${"card_title"}" @value-changed="${this._valueChanged}"></paper-input>
        <ha-entity-picker label="Capteur PV" .hass="${this.hass}" .value="${this._config.sensor_pv1}" .configValue="${"sensor_pv1"}" @value-changed="${this._valueChanged}"></ha-entity-picker>
        <paper-input label="Couleur (Hex)" .value="${this._config.border_color}" .configValue="${"border_color"}" @value-changed="${this._valueChanged}"></paper-input>
      </div>
    `;
  }
}
customElements.define("solaire-card-editor", SolaireCardEditor);

// --- PARTIE 2 : LA CARTE PRINCIPALE ---
class SolaireCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  // CETTE LIGNE EST CRUCIALE POUR L'ÉDITEUR VISUEL
  static getConfigElement() {
    return document.createElement("solaire-card-editor");
  }

  static getStubConfig() {
    return { card_title: "Solaire", sensor_pv1: "", border_color: "#00ffff", animation_speed: 0.5 };
  }

  setConfig(config) { this.config = config; }

  render() {
    if (!this.hass || !this.config) return html``;
    const state = this.hass.states[this.config.sensor_pv1];
    return html`
      <ha-card style="border: 2px solid ${this.config.border_color}">
        <div style="padding: 16px; text-align: center;">
          <h2>${this.config.card_title}</h2>
          <div style="font-size: 2em;">${state ? state.state : '0'} W</div>
        </div>
      </ha-card>
    `;
  }
}
customElements.define("solaire-card", SolaireCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solaire-card",
  name: "Solaire Card",
  description: "Carte avec éditeur visuel",
});
