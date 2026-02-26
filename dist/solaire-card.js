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
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Général</button>
          </div>

          <div class="content">
            ${this._renderTabContent(entities)}
          </div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      const categories = { solar: 'Solaire', house: 'Maison', battery: 'Batterie' };
      if (this._tab === 'gen') {
        return html`
          <div class="section-title">DIMENSIONS & IMAGE</div>
          <div class="row">
            ${this._renderField("Largeur (px)", "card_width", "number")}
            ${this._renderField("Hauteur (px)", "card_height", "number")}
          </div>
          ${this._renderField("Image de fond (/local/...)", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}
        `;
      }

      // Pour les autres onglets, on affiche les groupes prédéfinis (3 par onglet pour l'exemple, extensible)
      const prefixes = {
        solar: ['pv1', 'pv2', 'pv3', 'pv4'],
        house: ['h1', 'h2', 'h3', 'h4'],
        battery: ['b1', 'b2', 'b3']
      };

      return html`
        <div class="section-title">CONFIGURER ${categories[this._tab]}</div>
        ${prefixes[this._tab].map(p => this._renderGroup(p, entities))}
      `;
    }

    _renderGroup(prefix, entities) {
      return html`
        <details class="group-box">
          <summary>${this._config[prefix + '_name'] || 'Capteur vide (' + prefix + ')'}</summary>
          <div class="group-content">
            ${this._renderField("Nom à afficher", prefix + "_name", "text")}
            ${this._renderEntityPicker("Entité (Sensor)", prefix + "_entity", entities)}
            <div class="row">
              ${this._renderField("Pos X", prefix + "_x", "number")}
              ${this._renderField("Pos Y", prefix + "_y", "number")}
            </div>
            <div class="row">
              ${this._renderField("Taille", prefix + "_size", "number")}
              ${this._renderField("Inclinaison (°)", prefix + "_rot", "number")}
            </div>
            ${this._renderField("Couleur", prefix + "_color", "color")}
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
        .nav-tabs { display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 10px; }
        button { background: #333; color: #eee; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; }
        button.active { background: #00ffff; color: black; font-weight: bold; }
        .group-box { background: #252525; border: 1px solid #444; border-radius: 4px; margin-bottom: 5px; }
        summary { padding: 8px; cursor: pointer; color: #00ffff; font-size: 0.9em; }
        .group-content { padding: 10px; border-top: 1px solid #444; }
        .field { margin-bottom: 8px; display: flex; flex-direction: column; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        label { font-size: 0.75em; color: #aaa; }
        input { background: #000; border: 1px solid #555; color: white; padding: 5px; border-radius: 4px; width: 100%; }
        .section-title { font-weight: bold; margin-bottom: 10px; color: #ff00ff; }
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LOGIQUE CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    _renderData(prefix) {
      const entity = this.config[prefix + "_entity"];
      if (!entity || !this.hass.states[entity]) return html``;
      
      const state = this.hass.states[entity].state;
      const name = this.config[prefix + "_name"] || "";
      const unit = this.hass.states[entity].attributes.unit_of_measurement || "";
      const rotation = this.config[prefix + "_rot"] || 0;

      return html`
        <div class="sensor-block" style="
          left: ${this.config[prefix + '_x']}px; 
          top: ${this.config[prefix + '_y']}px; 
          color: ${this.config[prefix + '_color'] || 'white'};
          font-size: ${this.config[prefix + '_size'] || 14}px;
          transform: rotate(${rotation}deg);
        ">
          <div class="sensor-name">${name}</div>
          <div class="sensor-value">${state} <small>${unit}</small></div>
        </div>
      `;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const prefixes = ['pv1','pv2','pv3','pv4','h1','h2','h3','h4','b1','b2','b3'];

      return html`
        <ha-card style="
          width: ${this.config.card_width || 500}px; 
          height: ${this.config.card_height || 400}px; 
          border: 2px solid ${this.config.border_color || '#00ffff'};
          background-image: url('${this.config.background_image}');
          background-size: 100% 100%;
        ">
          <div class="overlay">
            ${prefixes.map(p => this._renderData(p))}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        ha-card { position: relative; overflow: hidden; border-radius: 15px; }
        .overlay { width: 100%; height: 100%; background: rgba(0,0,0,0.1); position: relative; }
        .sensor-block { position: absolute; font-weight: bold; text-shadow: 2px 2px 4px black; transform-origin: center left; pointer-events: none; }
        .sensor-name { font-size: 0.65em; opacity: 0.8; }
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master", preview: true });
})();
