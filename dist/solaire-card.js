(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  // --- L'ÉDITEUR ---
  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {} }; }
    setConfig(config) { this._config = config; }
    
    render() {
      return html`
        <div style="padding: 20px; background: #2c3e50; color: white; border-radius: 10px;">
          <h2 style="color: #00ffff;">⚙️ ÉDITEUR SOLAIRE</h2>
          <ha-entity-picker
            .label="${"Choisir un capteur PV"}"
            .hass="${this.hass}"
            .value="${this._config.sensor_pv1}"
            .configValue="${"sensor_pv1"}"
            @value-changed="${this._handleChanged}"
          ></ha-entity-picker>
          <paper-input
            label="Image de fond"
            .value="${this._config.background_image}"
            .configValue="${"background_image"}"
            @value-changed="${this._handleChanged}"
          ></paper-input>
        </div>
      `;
    }

    _handleChanged(ev) {
      const target = ev.target;
      const value = ev.detail ? ev.detail.value : target.value;
      const newConfig = { ...this._config, [target.configValue]: value };
      const event = new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true });
      this.dispatchEvent(event);
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LA CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    static getStubConfig() { return { sensor_pv1: "", background_image: "/local/post.png" }; }
    
    setConfig(config) { this.config = config; }
    
    render() {
      const state = this.hass.states[this.config.sensor_pv1]?.state || "---";
      return html`
        <ha-card style="background-image: url('${this.config.background_image}'); background-size: cover; height: 150px; border: 2px solid #00ffff;">
          <div style="background: rgba(0,0,0,0.6); height: 100%; display: flex; align-items: center; justify-content: center; color: #00ffff; font-size: 25px; font-weight: bold;">
            ${state} W
          </div>
        </ha-card>
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);

  // Enregistrement manuel
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "solaire-card",
    name: "Solaire Card",
    preview: true,
    description: "Version avec éditeur visuel forcé"
  });
  
  console.info("%c SOLAIRE CARD %c VERSION 1.1.0 CHARGÉE ", "color: white; background: #00ffff; font-weight: bold;", "color: #00ffff; background: #2c3e50; font-weight: bold;");
})();
