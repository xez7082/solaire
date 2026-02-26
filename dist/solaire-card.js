(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {} }; }
    setConfig(config) { this._config = config; }

    render() {
      if (!this.hass || !this._config) return html``;
      
      // On crée une liste de tous les capteurs pour aider l'utilisateur
      const entities = Object.keys(this.hass.states).filter(e => e.startsWith('sensor.')).sort();

      return html`
        <div class="editor-container">
          <h2 class="editor-title">⚙️ CONFIGURATION SOLAIRE</h2>
          
          <div class="field">
            <label>Capteur PV Principal (sensor.xxx) :</label>
            <input 
              list="entities"
              .value="${this._config.sensor_pv1 || ''}" 
              data-config="sensor_pv1" 
              @input="${this._handleChanged}">
            <datalist id="entities">
              ${entities.map(ent => html`<option value="${ent}">${ent}</option>`)}
            </datalist>
          </div>

          <div class="field">
            <label>Image de fond (URL ou /local/...) :</label>
            <input 
              type="text" 
              .value="${this._config.background_image || '/local/post.png'}" 
              data-config="background_image" 
              @input="${this._handleChanged}">
          </div>

          <div class="field">
            <label>Couleur Néon (ex: #00ffff) :</label>
            <input 
              type="color" 
              .value="${this._config.border_color || '#00ffff'}" 
              data-config="border_color" 
              @input="${this._handleChanged}">
          </div>

          <p style="font-size: 0.8em; color: #aaa; margin-top: 10px;">
            Note : Tapez le nom de votre capteur s'il n'apparaît pas dans la liste.
          </p>
        </div>
      `;
    }

    _handleChanged(ev) {
      const configValue = ev.target.getAttribute('data-config');
      const value = ev.target.value;
      const newConfig = { ...this._config, [configValue]: value };
      const event = new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true });
      this.dispatchEvent(event);
    }

    static get styles() {
      return css`
        .editor-container { padding: 15px; background: #1c1c1c; color: white; font-family: sans-serif; }
        .editor-title { color: #00ffff; font-size: 1.2em; margin-bottom: 15px; border-bottom: 1px solid #00ffff; }
        .field { margin-bottom: 15px; display: flex; flex-direction: column; }
        label { font-weight: bold; margin-bottom: 5px; color: #ddd; }
        input { 
          padding: 8px; 
          background: #2a2a2a; 
          border: 1px solid #444; 
          color: white; 
          border-radius: 4px;
        }
        input:focus { border-color: #00ffff; outline: none; }
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    static getStubConfig() { return { sensor_pv1: "", background_image: "/local/post.png", border_color: "#00ffff" }; }
    
    setConfig(config) { this.config = config; }
    
    render() {
      if (!this.hass || !this.config) return html``;
      const state = this.hass.states[this.config.sensor_pv1]?.state || "0";
      return html`
        <ha-card style="border: 2px solid ${this.config.border_color}; background-image: url('${this.config.background_image}'); background-size: cover; height: 180px; position: relative;">
          <div style="background: rgba(0,0,0,0.6); height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #00ffff; text-shadow: 0 0 5px #00ffff;">
             <div style="font-size: 12px; color: white;">PRODUCTION ACTUELLE</div>
             <div style="font-size: 32px; font-weight: bold;">${state} W</div>
          </div>
        </ha-card>
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);

  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card", preview: true });
})();
