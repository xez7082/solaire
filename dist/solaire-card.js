import { LitElement, html, css } from 'https://unpkg.com/lit-element@2.4.0/lit-element.js?module';

class SolaireCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  // Déclare l'éditeur visuel lié à cette carte
  static getConfigElement() {
    return document.createElement("solaire-card-editor");
  }

  static getStubConfig() {
    return {
      sensor_pv1: "sensor.beem_maison_puissance",
      border_color: "#00ffff",
      animation_speed: 0.5
    };
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    return html`
      <ha-card style="border: 2px solid ${this.config.border_color};">
        <div class="card-content">
          <div class="title">☀️ Solaire : ${this.hass.states[this.config.sensor_pv1].state} W</div>
          <div class="animation-container" style="animation-duration: ${1 / this.config.animation_speed}s">
             </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 15px;
        padding: 16px;
        color: white;
      }
      .title {
        font-size: 20px;
        text-align: center;
        color: #00ffff;
        text-shadow: 0 0 10px #00ffff;
      }
    `;
  }
}

customElements.define("solaire-card", SolaireCard);

// On ajoute la carte au sélecteur de cartes de Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solaire-card",
  name: "Solaire Card",
  description: "Dashboard énergétique personnalisé avec flux néon.",
});
