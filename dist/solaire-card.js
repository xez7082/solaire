import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- L'ÉDITEUR (INTERFACE VISUELLE) ---
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
      <div style="padding: 20px;">
        <p style="color: #00ffff; font-weight: bold;">⚙️ CONFIGURATION SOLAIRE</p>
        <ha-entity-picker 
          label="Capteur PV Principal"
          .hass="${this.hass}" 
          .value="${this._config.sensor_pv1}" 
          .configValue="${"sensor_pv1"}" 
          @value-changed="${this._valueChanged}">
        </ha-entity-picker>
        <paper-input 
          label="Image de fond (/local/...)" 
          .value="${this._config.background_image}" 
          .configValue="${"background_image"}" 
          @value-changed="${this._valueChanged}">
        </paper-input>
        <paper-input 
          label="Couleur Néon" 
          .value="${this._config.border_color}" 
          .configValue="${"border_color"}" 
          @value-changed="${this._valueChanged}">
        </paper-input>
      </div>
    `;
  }
}
customElements.define("solaire-card-editor", SolaireCardEditor);

// --- LA CARTE (LOGIQUE) ---
class SolaireCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  // CETTE FONCTION FAIT LE LIEN AVEC L'ÉDITEUR
  static getConfigElement() {
    return document.createElement("solaire-card-editor");
  }

  static getStubConfig() {
    return { sensor_pv1: "", background_image: "/local/post.png", border_color: "#00ffff" };
  }

  setConfig(config) { this.config = config; }

  render() {
    if (!this.hass || !this.config) return html``;
    const state = this.hass.states[this.config.sensor_pv1]?.state || "0";
    return html`
      <ha-card style="border: 2px solid ${this.config.border_color}; background-image: url('${this.config.background_image}'); background-size: cover; height: 200px;">
        <div style="background: rgba(0,0,0,0.5); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2em;">
          ${state} W
        </div>
      </ha-card>
    `;
  }
}
customElements.define("solaire-card", SolaireCard);

// --- ENREGISTREMENT DANS LE SÉLECTEUR DE CARTES ---
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solaire-card",
  name: "Solaire Card",
  preview: true,
  description: "Carte Solaire avec Editeur Visuel",
});
