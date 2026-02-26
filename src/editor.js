import { LitElement, html } from 'https://unpkg.com/lit-element@2.4.0/lit-element.js?module';

export class SolaireCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  setConfig(config) {
    this._config = config;
  }

  // Fonction pour envoyer les changements à Home Assistant
  configChanged(newConfig) {
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  // C'est ici qu'on dessine les champs de l'éditeur
  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <h3>Configuration Solaire</h3>
        
        <ha-entity-picker
          .label="${"Capteur PV (W)"}"
          .hass="${this.hass}"
          .value="${this._config.sensor_pv1}"
          .configValue="${"sensor_pv1"}"
          @value-changed="${this._handleValueChanged}"
        ></ha-entity-picker>

        <paper-input
          label="Couleur de bordure (Hex)"
          .value="${this._config.border_color || '#00ffff'}"
          .configValue="${"border_color"}"
          @value-changed="${this._handleValueChanged}"
        ></paper-input>

        <label>Vitesse d'animation</label>
        <ha-slider
          pin
          min="0.1"
          max="2"
          step="0.1"
          .value="${this._config.animation_speed || 0.5}"
          .configValue="${"animation_speed"}"
          @value-changed="${this._handleValueChanged}"
        ></ha-slider>
      </div>
    `;
  }

  _handleValueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    const value = ev.detail ? ev.detail.value : target.value;

    const newConfig = { ...this._config, [configValue]: value };
    this.configChanged(newConfig);
  }
}

customElements.define("solaire-card-editor", SolaireCardEditor);
