(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    
    constructor() {
      super();
      this._tab = 'general'; // Onglet par défaut
    }

    setConfig(config) { this._config = config; }

    render() {
      if (!this.hass || !this._config) return html``;
      const entities = Object.keys(this.hass.states).filter(e => e.startsWith('sensor.')).sort();

      return html`
        <div class="editor-container">
          <div class="toolbar">
            <button class="${this._tab === 'general' ? 'active' : ''}" @click="${() => this._tab = 'general'}">⚙️ Général</button>
            <button class="${this._tab === 'solar' ? 'active' : ''}" @click="${() => this._tab = 'solar'}">☀️ Panneaux</button>
            <button class="${this._tab === 'house' ? 'active' : ''}" @click="${() => this._tab = 'house'}">🏠 Maison</button>
            <button class="${this._tab === 'battery' ? 'active' : ''}" @click="${() => this._tab = 'battery'}">🔋 Batterie</button>
            <button class="${this._tab === 'grid' ? 'active' : ''}" @click="${() => this._tab = 'grid'}">⚡ Linky</button>
          </div>

          <div class="content">
            ${this._renderTabContent(entities)}
          </div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      switch(this._tab) {
        case 'general':
          return html`
            <div class="tab-pane">
              <h3>Réglages Généraux</h3>
              ${this._renderInput("Titre", "card_title")}
              ${this._renderInput("Image de fond (/local/...)", "background_image")}
              ${this._renderInput("Couleur Bordure", "border_color", "color")}
              <label>Effet de bordure</label>
              <select .value="${this._config.border_effect || 'none'}" data-config="border_effect" @change="${this._handleChanged}">
                <option value="none">Fixe</option>
                <option value="shimmer">Scintillant (Shimmer)</option>
                <option value="roller">Rotation (Roller)</option>
              </select>
            </div>`;
        
        case 'solar':
          return html`
            <div class="tab-pane">
              <h3>Panneaux Solaires</h3>
              ${this._renderEntityPicker("Capteur PV 1", "sensor_pv1", entities)}
              ${this._renderInput("Position X (px)", "pv1_x", "number")}
              ${this._renderInput("Position Y (px)", "pv1_y", "number")}
              ${this._renderInput("Couleur Texte", "pv1_color", "color")}
              <hr>
              ${this._renderEntityPicker("Capteur PV 2 (Spa)", "sensor_pv2", entities)}
              ${this._renderInput("Position X (px)", "pv2_x", "number")}
            </div>`;

        case 'house':
          return html`
            <div class="tab-pane">
              <h3>Consommation Maison</h3>
              ${this._renderEntityPicker("Capteur Maison", "sensor_home", entities)}
              ${this._renderInput("Position X", "home_x", "number")}
              ${this._renderInput("Position Y", "home_y", "number")}
            </div>`;

        case 'battery':
          return html`
            <div class="tab-pane">
              <h3>Batteries (Venus/Storcube)</h3>
              ${this._renderEntityPicker("Niveau SoC %", "sensor_bat_soc", entities)}
              ${this._renderEntityPicker("Puissance W", "sensor_bat_pwr", entities)}
              ${this._renderInput("Position X", "bat_x", "number")}
            </div>`;

        case 'grid':
          return html`
            <div class="tab-pane">
              <h3>Réseau Linky</h3>
              ${this._renderEntityPicker("Capteur Linky", "sensor_grid", entities)}
              ${this._renderInput("Position X", "grid_x", "number")}
            </div>`;
      }
    }

    _renderInput(label, configKey, type = "text") {
      return html`
        <div class="field">
          <label>${label}</label>
          <input type="${type}" .value="${this._config[configKey] || ''}" data-config="${configKey}" @input="${this._handleChanged}">
        </div>`;
    }

    _renderEntityPicker(label, configKey, entities) {
      return html`
        <div class="field">
          <label>${label}</label>
          <input list="ent-list" .value="${this._config[configKey] || ''}" data-config="${configKey}" @input="${this._handleChanged}">
          <datalist id="ent-list">${entities.map(e => html`<option value="${e}">`)}</datalist>
        </div>`;
    }

    _handleChanged(ev) {
      const configKey = ev.target.getAttribute('data-config');
      const value = ev.target.value;
      const newConfig = { ...this._config, [configKey]: value };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
    }

    static get styles() {
      return css`
        .editor-container { background: #1a1a1a; color: white; padding: 10px; font-family: system-ui; }
        .toolbar { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px; }
        button { background: #333; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; transition: 0.3s; }
        button.active { background: #00ffff; color: black; font-weight: bold; box-shadow: 0 0 10px #00ffff; }
        .tab-pane { animation: fadeIn 0.3s; }
        .field { margin-bottom: 10px; display: flex; flex-direction: column; }
        label { font-size: 0.9em; margin-bottom: 4px; color: #00ffff; }
        input, select { background: #252525; border: 1px solid #444; color: white; padding: 8px; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LA CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    
    setConfig(config) { this.config = config; }

    render() {
      if (!this.hass || !this.config) return html``;
      const pv1 = this.hass.states[this.config.sensor_pv1]?.state || "0";
      
      return html`
        <ha-card class="${this.config.border_effect}" style="border: 2px solid ${this.config.border_color}; background-image: url('${this.config.background_image}'); background-size: cover;">
          <div class="main-container">
             <div class="pv1-text" style="left: ${this.config.pv1_x}px; top: ${this.config.pv1_y}px; color: ${this.config.pv1_color};">
               ${pv1} W
             </div>
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        ha-card { height: 400px; position: relative; overflow: hidden; transition: 0.3s; }
        .main-container { width: 100%; height: 100%; background: rgba(0,0,0,0.3); position: relative; }
        .pv1-text { position: absolute; font-weight: bold; font-size: 1.2em; text-shadow: 1px 1px 3px black; }

        /* EFFET SCINTILLANT */
        .shimmer { animation: shimmer-box 2s infinite alternate; }
        @keyframes shimmer-box { from { box-shadow: 0 0 5px #00ffff; } to { box-shadow: 0 0 20px #00ffff; } }

        /* EFFET ROLLER (BORDER ANIMATION) */
        .roller { border-image: conic-gradient(from var(--angle), #00ffff, #ff00ff, #00ffff) 1; animation: rotate 3s linear infinite; }
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes rotate { to { --angle: 360deg; } }
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);

  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card Pro", preview: true });
})();
