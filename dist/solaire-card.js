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
            <button class="${this._tab === 'bat' ? 'active' : ''}" @click="${() => this._tab = 'bat'}">🔋 Batterie</button>
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Général</button>
          </div>

          <div class="content">
            ${this._renderTabContent(entities)}
          </div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      if (this._tab === 'gen') {
        return html`
          <div class="section-title">CARTE ET IMAGE</div>
          <div class="row">${this._renderField("Largeur (px)", "card_width", "number")}${this._renderField("Hauteur (px)", "card_height", "number")}</div>
          ${this._renderField("Image de fond", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}
        `;
      }

      // Listes de préfixes pour chaque onglet
      const mapping = {
        solar: ['s1', 's2', 's3', 's4', 's5'],
        house: ['h1', 'h2', 'h3', 'h4'],
        bat: ['b1', 'b2', 'b3']
      };

      return html`
        <div class="section-title">CAPTEURS DISPONIBLES</div>
        <p style="font-size:0.8em; color:#aaa; margin-bottom:10px;">Remplissez l'entité pour activer le capteur.</p>
        ${mapping[this._tab].map(p => this._renderGroup(p, entities))}
      `;
    }

    _renderGroup(prefix, entities) {
      const isUsed = this._config[prefix + '_entity'] ? '✔️' : '⚪';
      return html`
        <details class="group-box">
          <summary>${isUsed} ${this._config[prefix + '_name'] || 'Nouveau Capteur ('+prefix+')'}</summary>
          <div class="group-content">
            ${this._renderField("Nom (ex: Spa, IBC...)", prefix + "_name", "text")}
            ${this._renderEntityPicker("Entité (Sensor)", prefix + "_entity", entities)}
            <div class="row">
              ${this._renderField("Pos X", prefix + "_x", "number")}
              ${this._renderField("Pos Y", prefix + "_y", "number")}
            </div>
            <div class="row">
              ${this._renderField("Taille", prefix + "_size", "number")}
              ${this._renderField("Rotation (°)", prefix + "_rot", "number")}
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
        .nav-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
        button { background: #333; color: #eee; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; font-size: 0.8em; }
        button.active { background: #00ffff; color: black; font-weight: bold; }
        .group-box { background: #252525; border: 1px solid #444; border-radius: 4px; margin-bottom: 5px; }
        summary { padding: 8px; cursor: pointer; color: #00ffff; font-size: 0.9em; list-style: none; }
        .group-content { padding: 10px; border-top: 1px solid #444; background: #111; }
        .field { margin-bottom: 8px; display: flex; flex-direction: column; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        label { font-size: 0.7em; color: #aaa; }
        input { background: #222; border: 1px solid #555; color: white; padding: 5px; border-radius: 4px; width: 100%; box-sizing: border-box; }
        .section-title { font-weight: bold; margin-bottom: 10px; color: #ff00ff; text-transform: uppercase; }
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

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

      return html`
        <div class="sensor-block" style="
          left: ${this.config[prefix + '_x']}px; 
          top: ${this.config[prefix + '_y']}px; 
          color: ${this.config[prefix + '_color'] || 'white'};
          font-size: ${this.config[prefix + '_size'] || 14}px;
          transform: rotate(${this.config[prefix + '_rot'] || 0}deg);
        ">
          <div class="sensor-name">${name}</div>
          <div class="sensor-value">${state} <small>${unit}</small></div>
        </div>
      `;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const prefixes = ['s1','s2','s3','s4','s5','h1','h2','h3','h4','b1','b2','b3'];

      return html`
        <ha-card style="
          width: ${this.config.card_width || 500}px; 
          height: ${this.config.card_height || 400}px; 
          border: 2px solid ${this.config.border_color || '#00ffff'};
          background-image: url('${this.config.background_image}');
          background-size: 100% 100%;
          position: relative;
        ">
          ${prefixes.map(p => this._renderData(p))}
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        ha-card { overflow: hidden; border-radius: 15px; background-repeat: no-repeat; }
        .sensor-block { position: absolute; font-weight: bold; text-shadow: 2px 2px 4px black; pointer-events: none; white-space: nowrap; }
        .sensor-name { font-size: 0.65em; opacity: 0.8; text-transform: uppercase; line-height: 1; }
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V3", preview: true });
})();
