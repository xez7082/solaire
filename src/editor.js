import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

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

  // Envoie les modifications à Home Assistant
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) return;

    if (target.configValue) {
      if (target.value === "") {
        const newConfig = { ...this._config };
        delete newConfig[target.configValue];
        this._config = newConfig;
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <h3>🏠 Configuration Générale</h3>
        <paper-input
          label="Titre de la carte"
          .value="${this._config.card_title}"
          .configValue="${"card_title"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>

        <h3>☀️ Production Solaire (W)</h3>
        <ha-entity-picker
          label="Capteur PV Maison"
          .hass="${this.hass}"
          .value="${this._config.sensor_pv1}"
          .configValue="${"sensor_pv1"}"
          @value-changed="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>

        <ha-entity-picker
          label="Capteur PV Spa"
          .hass="${this.hass}"
          .value="${this._config.sensor_pv2}"
          .configValue="${"sensor_pv2"}"
          @value-changed="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>

        <ha-entity-picker
          label="Capteur PV IBC"
          .hass="${this.hass}"
          .value="${this._config.sensor_pv3}"
          .configValue="${"sensor_pv3"}"
          @value-changed="${this._valueChanged}"
          allow-custom-entity
        ></ha-entity-picker>

        <h3>🔋 Stockage & Réseau</h3>
        <ha-entity-picker
          label="Batterie (SoC %)"
          .hass="${this.hass}"
          .value="${this._config.sensor_bat1_soc}"
          .configValue="${"sensor_bat1_soc"}"
          @value-changed="${this._valueChanged}"
        ></ha-entity-picker>

        <ha-entity-picker
          label="Consommation Maison (W)"
          .hass="${this.hass}"
          .value="${this._config.sensor_home_load}"
          .configValue="${"sensor_home_load"}"
          @value-changed="${this._valueChanged}"
        ></ha-entity-picker>

        <h3>🎨 Style & Animation</h3>
        <div class="side-by-side">
          <paper-input
            label="Couleur Néon (Hex)"
            .value="${this._config.border_color || '#00ffff'}"
            .configValue="${"border_color"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>

          <label>Vitesse Flux</label>
          <ha-slider
            pin
            min="0.1"
            max="3"
            step="0.1"
            .value="${this._config.animation_speed || 0.5}"
            .configValue="${"animation_speed"}"
            @value-changed="${this._valueChanged}"
          ></ha-slider>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        padding: 10px;
      }
      h3 {
        border-bottom: 1px solid #555;
        padding-bottom: 5px;
        color: #00ffff;
      }
      ha-entity-picker, paper-input {
        display: block;
        margin-bottom: 15px;
      }
      .side-by-side {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      ha-slider {
        width: 100%;
      }
    `;
  }
}

customElements.define("solaire-card-editor", SolaireCardEditor);
