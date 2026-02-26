(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    constructor() { super(); this._tab = 'solar'; }
    setConfig(config) { this._config = config; }

    render() {
      if (!this.hass || !this._config) return html``;
      const entities = Object.keys(this.hass.states).filter(e => e.startsWith('sensor.')).sort();

      return html`
        <div class="editor-container">
          <div class="nav-tabs">
            <button class="${this._tab === 'solar' ? 'active' : ''}" @click="${() => this._tab = 'solar'}">☀️ Solaire</button>
            <button class="${this._tab === 'house' ? 'active' : ''}" @click="${() => this._tab = 'house'}">🏠 Maison</button>
            <button class="${this._tab === 'battery' ? 'active' : ''}" @click="${() => this._tab = 'battery'}">🔋 Batterie</button>
            <button class="${this._tab === 'grid' ? 'active' : ''}" @click="${() => this._tab = 'grid'}">⚡ Réseau</button>
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Général</button>
          </div>

          <div class="content">
            ${this._renderTabContent(entities)}
          </div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      switch(this._tab) {
        case 'solar':
          return html`
            <div class="section-title">PRODUCTION SOLAIRE</div>
            ${this._renderGroup("Champ Solaire 1", "pv1", entities)}
            ${this._renderGroup("Champ Solaire 2", "pv2", entities)}
            ${this._renderGroup("Champ Solaire 3", "pv3", entities)}
          `;
        case 'house':
          return html`
            <div class="section-title">CONSOMMATION</div>
            ${this._renderGroup("Consommation Totale", "h1", entities)}
            ${this._renderGroup("Pompe à Chaleur", "h2", entities)}
            ${this._renderGroup("Appareil Divers", "h3", entities)}
          `;
        case 'battery':
          return html`
            <div class="section-title">STOCKAGE</div>
            ${this._renderGroup("Batterie 1 (SoC)", "b1", entities)}
            ${this._renderGroup("Batterie 2 (SoC)", "b2", entities)}
          `;
        case 'grid':
          return html`
            <div class="section-title">RÉSEAU LINKY</div>
            ${this._renderGroup("Importation", "g1", entities)}
            ${this._renderGroup("Exportation", "g2", entities)}
          `;
        case 'gen':
          return html`
            <div class="section-title">DIMENSIONS & DESIGN</div>
            <div class="row">
                ${this._renderField("Largeur (px)", "card_width", "number")}
                ${this._renderField("Hauteur (px)", "card_height", "number")}
            </div>
            ${this._renderField("Image de fond", "background_image", "text")}
            ${this._renderField("Couleur Bordure", "border_color", "color")}
            <div class="field">
                <label>Effet de Scintillement</label>
                <select .value="${this._config.border_effect || 'none'}" data-config="border_effect" @change="${this._handleChanged}">
                    <option value="none">Aucun</option>
                    <option value="shimmer">Scintillant</option>
                    <option value="roller">Néon Tournant</option>
                </select>
            </div>
          `;
      }
    }

    _renderGroup(label, prefix, entities) {
      return html`
        <details class="group-box">
          <summary>${this._config[prefix + '_name'] || label}</summary>
          <div class="group-content">
            ${this._renderField("Nom à afficher", prefix + "_name", "text")}
            ${this._renderEntityPicker("Entité (Sensor)", prefix + "_entity", entities)}
            <div class="row">
              ${this._renderField("Position X", prefix + "_x", "number")}
              ${this._renderField("Position Y", prefix + "_y", "number")}
            </div>
            <div class="row">
              ${this._renderField("Taille Texte", prefix + "_size", "number")}
              ${this._renderField("Couleur", prefix + "_color", "color")}
            </div>
          </div>
        </details>
      `;
    }

    _renderField(label, configKey, type) {
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
      this.dispatchEvent(new CustomEvent("config-changed", { 
          detail: { config: { ...this._config, [configKey]: value } }, 
          bubbles: true, composed: true 
      }));
    }

    static get styles() {
      return css`
        .editor-container { background: #1a1a1a; color: white; padding: 10px; font-family: sans-serif; }
        .nav-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 10px; }
        button { background: #333; color: #eee; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        button.active { background: #00ffff; color: black; font-weight: bold; }
        .group-box { background: #252525; border: 1px solid #444; border-radius: 4px; margin-bottom: 10px; }
        summary { padding: 8px; cursor: pointer; color: #00ffff; font-weight: bold; }
        .group-content { padding: 10px; border-top: 1px solid #444; }
        .field { margin-bottom: 8px; display: flex; flex-direction: column; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        label { font-size: 0.8em; color: #aaa; margin-bottom: 2px; }
        input, select { background: #000; border: 1px solid #555; color: white; padding: 6px; border-radius: 4px; width: 100%; box-sizing: border-box; }
        .section-title { font-weight: bold; margin-bottom: 10px; color: #ff00ff; border-left: 3px solid #ff00ff; padding-left: 10px; }
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LOGIQUE DE LA CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    _renderData(prefix) {
      const entity = this.config[prefix + "_entity"];
      if (!entity) return html``;
      const state = this.hass.states[entity]?.state || "---";
      const name = this.config[prefix + "_name"] || "";
      const unit = this.hass.states[entity]?.attributes.unit_of_measurement || "";

      return html`
        <div class="sensor-block" style="
          left: ${this.config[prefix + '_x']}px; 
          top: ${this.config[prefix + '_y']}px; 
          color: ${this.config[prefix + '_color'] || 'white'};
          font-size: ${this.config[prefix + '_size'] || 14}px;
        ">
          <div class="sensor-name">${name}</div>
          <div class="sensor-value">${state} <small>${unit}</small></div>
        </div>
      `;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const width = this.config.card_width || 500;
      const height = this.config.card_height || 400;

      return html`
        <ha-card class="${this.config.border_effect}" style="
          width: ${width}px; 
          height: ${height}px; 
          border: 2px solid ${this.config.border_color || '#00ffff'};
          background-image: url('${this.config.background_image}');
          background-size: 100% 100%;
        ">
          <div class="overlay">
            ${['pv1','pv2','pv3','h1','h2','h3','b1','b2','g1','g2'].map(p => this._renderData(p))}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        ha-card { position: relative; overflow: hidden; border-radius: 15px; background-repeat: no-repeat; }
        .overlay { width: 100%; height: 100%; background: rgba(0,0,0,0.2); position: relative; }
        .sensor-block { position: absolute; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.9); line-height: 1.1; pointer-events: none; }
        .sensor-name { font-size: 0.7em; opacity: 0.9; text-transform: uppercase; }
        .sensor-value { white-space: nowrap; }

        .shimmer { animation: glow 2s infinite alternate; }
        @keyframes glow { from { box-shadow: 0 0 5px #00ffff; } to { box-shadow: 0 0 20px #00ffff; } }
        
        .roller { border-image: conic-gradient(from var(--angle), #00ffff, #ff00ff, #00ffff) 1; animation: rot 3s linear infinite; }
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes rot { to { --angle: 360deg; } }
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card Ultra", preview: true });
})();
