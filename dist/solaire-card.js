(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    
    constructor() {
      super();
      this._tab = 'solar'; 
    }

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
            <button class="${this._tab === 'grid' ? 'active' : ''}" @click="${() => this._tab = 'grid'}">⚡ Linky</button>
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
            <div class="section-title">PANNEAUX SOLAIRES</div>
            ${this._renderGroup("Panneaux MAISON", "pv_m", entities)}
            ${this._renderGroup("Panneaux SPA", "pv_s", entities)}
            ${this._renderGroup("Panneaux IBC", "pv_i", entities)}
          `;
        case 'house':
          return html`
            <div class="section-title">CONSOMMATION MAISON</div>
            ${this._renderGroup("Appareils / Ecojoko", "home", entities)}
            ${this._renderGroup("Pompe à Chaleur", "pac", entities)}
          `;
        case 'battery':
          return html`
            <div class="section-title">BATTERIES (VENUS / STORCUBE)</div>
            ${this._renderGroup("Batterie Principale", "bat1", entities)}
            ${this._renderGroup("Batterie Secondaire", "bat2", entities)}
          `;
        case 'grid':
          return html`
            <div class="section-title">RÉSEAU ÉLECTRIQUE (LINKY)</div>
            ${this._renderGroup("Import / Export", "grid", entities)}
          `;
        case 'gen':
          return html`
            <div class="section-title">DESIGN GÉNÉRAL</div>
            ${this._renderField("Titre", "card_title", "text")}
            ${this._renderField("Image de fond", "background_image", "text")}
            ${this._renderField("Couleur Bordure", "border_color", "color")}
            <div class="field">
                <label>Effet Bordure</label>
                <select .value="${this._config.border_effect || 'none'}" data-config="border_effect" @change="${this._handleChanged}">
                    <option value="none">Aucun</option>
                    <option value="shimmer">Scintillant</option>
                    <option value="roller">Roller (Néon tournant)</option>
                </select>
            </div>
          `;
      }
    }

    _renderGroup(title, prefix, entities) {
      return html`
        <details class="group-box">
          <summary>${title}</summary>
          <div class="group-content">
            ${this._renderEntityPicker("Capteur Puissance (W)", `${prefix}_entity`, entities)}
            <div class="row">
              ${this._renderField("Pos X (px)", `${prefix}_x`, "number")}
              ${this._renderField("Pos Y (px)", `${prefix}_y`, "number")}
            </div>
            <div class="row">
              ${this._renderField("Taille", `${prefix}_size`, "number")}
              ${this._renderField("Couleur", `${prefix}_color`, "color")}
            </div>
          </div>
        </details>
      `;
    }

    _renderEntityPicker(label, configKey, entities) {
      return html`
        <div class="field">
          <label>${label}</label>
          <input list="ent-list" .value="${this._config[configKey] || ''}" data-config="${configKey}" @input="${this._handleChanged}">
          <datalist id="ent-list">${entities.map(e => html`<option value="${e}">`)}</datalist>
        </div>`;
    }

    _renderField(label, configKey, type) {
      return html`
        <div class="field">
          <label>${label}</label>
          <input type="${type}" .value="${this._config[configKey] || ''}" data-config="${configKey}" @input="${this._handleChanged}">
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
        .editor-container { background: #1c1c1c; color: white; padding: 10px; font-family: sans-serif; }
        .nav-tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 2px solid #444; padding-bottom: 8px; margin-bottom: 10px; }
        .nav-tabs button { background: #333; color: #ccc; border: none; padding: 8px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
        .nav-tabs button.active { background: #00ffff; color: black; font-weight: bold; }
        .section-title { color: #00ffff; font-weight: bold; margin: 15px 0 5px 0; text-transform: uppercase; font-size: 0.9em; }
        .group-box { background: #2a2a2a; border: 1px solid #444; border-radius: 5px; margin-bottom: 8px; }
        summary { padding: 8px; cursor: pointer; font-weight: bold; color: #00f9f9; list-style: none; }
        summary::before { content: "▶ "; font-size: 0.8em; }
        details[open] summary::before { content: "▼ "; }
        .group-content { padding: 10px; border-top: 1px solid #444; }
        .field { margin-bottom: 10px; display: flex; flex-direction: column; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        label { font-size: 0.8em; color: #aaa; margin-bottom: 3px; }
        input, select { background: #111; border: 1px solid #555; color: white; padding: 6px; border-radius: 4px; width: 100%; box-sizing: border-box; }
        input:focus { border-color: #00ffff; outline: none; }
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LA CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    
    setConfig(config) { this.config = config; }

    _renderValue(prefix) {
        const entity = this.config[`${prefix}_entity`];
        const state = this.hass.states[entity]?.state || "0";
        const x = this.config[`${prefix}_x`] || 0;
        const y = this.config[`${prefix}_y`] || 0;
        const color = this.config[`${prefix}_color`] || "#ffffff";
        const size = this.config[`${prefix}_size`] || 14;

        if (!entity) return html``;

        return html`
          <div class="data-text" style="left:${x}px; top:${y}px; color:${color}; font-size:${size}px;">
            ${state} W
          </div>
        `;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      
      return html`
        <ha-card class="${this.config.border_effect}" style="border: 2px solid ${this.config.border_color}; background-image: url('${this.config.background_image}'); background-size: cover; height: 450px;">
          <div class="main-overlay">
            <div class="title">${this.config.card_title}</div>
            ${this._renderValue("pv_m")}
            ${this._renderValue("pv_s")}
            ${this._renderValue("pv_i")}
            ${this._renderValue("home")}
            ${this._renderValue("pac")}
            ${this._renderValue("bat1")}
            ${this._renderValue("bat2")}
            ${this._renderValue("grid")}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        ha-card { position: relative; overflow: hidden; border-radius: 12px; }
        .main-overlay { width: 100%; height: 100%; background: rgba(0,0,0,0.2); position: relative; }
        .title { text-align: center; color: #00ffff; font-size: 20px; font-weight: bold; padding: 10px; text-shadow: 0 0 10px #00ffff; }
        .data-text { position: absolute; font-weight: bold; text-shadow: 1px 1px 4px black; white-space: nowrap; transition: all 0.3s; }
        
        .shimmer { animation: shimmer 1.5s infinite alternate; }
        @keyframes shimmer { from { box-shadow: 0 0 5px #00ffff; } to { box-shadow: 0 0 25px #00ffff; } }
        
        .roller { border-image: conic-gradient(from var(--angle), #00ffff, #ff00ff, #00ffff) 1; animation: rotate 4s linear infinite; }
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes rotate { to { --angle: 360deg; } }
      `;
    }
  }
  customElements.define("solaire-card", SolaireCard);

  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Pro (Onglets)", preview: true });
})();
