import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// On importe l'éditeur (assure-hui que le fichier editor.js existe dans le même dossier)
import "./editor.js";

class SolaireCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  // Indique à Home Assistant quel éditeur utiliser
  static getConfigElement() {
    return document.createElement("solaire-card-editor");
  }

  // Configuration par défaut quand on ajoute la carte
  static getStubConfig() {
    return {
      card_title: "Mon Installation Solaire",
      sensor_pv1: "sensor.beem_maison_puissance",
      border_color: "#00ffff",
      animation_speed: 0.5,
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Configuration invalide");
    }
    this.config = config;
  }

  // La fonction principale qui dessine la carte
  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    // Récupération de l'état du capteur principal
    const statePV = this.hass.states[this.config.sensor_pv1];
    const pvValue = statePV ? statePV.state : "0";
    const unit = statePV ? statePV.attributes.unit_of_measurement || "W" : "W";

    return html`
      <ha-card style="border-color: ${this.config.border_color || '#00ffff'}">
        <div class="card-header">
          ${this.config.card_title || "Solaire"}
        </div>
        
        <div class="content">
          <div class="pv-display">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="value">${pvValue}</span>
            <span class="unit">${unit}</span>
          </div>

          <svg viewBox="0 0 200 100" class="flow-svg">
            <path d="M0,50 L200,50" 
                  stroke="${this.config.border_color || '#00ffff'}" 
                  stroke-width="2" 
                  fill="none" 
                  class="flow-line"
                  style="animation-duration: ${2 / (this.config.animation_speed || 1)}s" />
          </svg>
        </div>
      </ha-card>
    `;
  }

  // Le style CSS de la carte (Design Néon)
  static get styles() {
    return css`
      ha-card {
        background: rgba(10, 10, 10, 0.8);
        border: 2px solid #00ffff;
        border-radius: 12px;
        padding: 16px;
        color: white;
        transition: all 0.3s ease;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
      }
      .card-header {
        font-size: 1.2em;
        font-weight: bold;
        text-align: center;
        margin-bottom: 10px;
        color: #00ffff;
        text-shadow: 0 0 5px #00ffff;
      }
      .pv-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 2em;
      }
      .value {
        font-weight: bold;
      }
      .unit {
        font-size: 0.5em;
        color: #aaa;
      }
      .flow-svg {
        width: 100%;
        height: 60px;
      }
      .flow-line {
        stroke-dasharray: 4, 10;
        animation: flow 2s linear infinite;
      }
      @keyframes flow {
        from { stroke-dashoffset: 20; }
        to { stroke-dashoffset: 0; }
      }
    `;
  }
}

// Enregistrement de la carte dans le navigateur
customElements.define("solaire-card", SolaireCard);

// Ajout à la liste des cartes Lovelace
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solaire-card",
  name: "Solaire Card",
  description: "Carte solaire personnalisée avec éditeur visuel et flux néon.",
});
