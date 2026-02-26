(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  // --- ÉDITEUR DE LA CARTE ---
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
            <button class="${this._tab === 'bat' ? 'active' : ''}" @click="${() => this._tab = 'bat'}">🔋 Batteries</button>
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Général</button>
          </div>
          <div class="content">${this._renderTabContent(entities)}</div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      // Mapping des capteurs : 5 Solaire, 5 Maison, 3 Batteries
      const mapping = { 
        solar: ['s1','s2','s3','s4','s5'], 
        house: ['h1','h2','h3','h4','h5'], 
        bat: ['b1','b2','b3'] 
      };

      if (this._tab === 'gen') {
        return html`
          <div class="section-title">CARTE ET IMAGE</div>
          <div class="row">${this._renderField("Largeur Carte (px)", "card_width", "number")}${this._renderField("Hauteur Carte (px)", "card_height", "number")}</div>
          ${this._renderField("URL Image de fond", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}
        `;
      }
      return html`
        <div class="section-title">${this._tab.toUpperCase()}</div>
        <p style="font-size:0.75em; color:gray; margin-bottom:10px;">Configurez vos capteurs ci-dessous :</p>
        ${mapping[this._tab].map(p => this._renderGroup(p, entities, this._tab === 'bat'))}
      `;
    }

    _renderGroup(prefix, entities, isBattery) {
      const active = this._config[prefix + '_entity'] ? '✔️' : '⚪';
      return html`
        <details class="group-box">
          <summary>${active} ${this._config[prefix + '_name'] || 'Capteur ' + prefix}</summary>
          <div class="group-content">
            ${this._renderField("Nom personnalisé", prefix + "_name", "text")}
            ${this._renderEntityPicker("Entité Home Assistant", prefix + "_entity", entities)}
            <div class="row">${this._renderField("Position X", prefix + "_x", "number")}${this._renderField("Position Y", prefix + "_y", "number")}</div>
            <div class="row">${this._renderField("Taille Texte", prefix + "_size", "number")}${this._renderField("Rotation (°)", prefix + "_rot", "number")}</div>
            ${isBattery ? html`
              <div class="row">${this._renderField("Largeur Jauge", prefix + "_w", "number")}${this._renderField("Hauteur Jauge", prefix + "_h", "number")}</div>
            ` : ''}
            ${this._renderField("Couleur", prefix + "_color", "color")}
          </div>
        </details>
      `;
    }

    _renderField(label, configKey, type) {
      return html`<div class="field"><label>${label}</label><input type="${type}" .value="${this._config[configKey] || ''}" data-config="${configKey}" @input="${this._handleChanged}"></div>`;
    }

    _renderEntityPicker(label, configKey, entities) {
      return html`<div class="field"><label>${label}</label><input list="ent-list" .value="${this._config[configKey] || ''}" data-config="${configKey}" @input="${this._handleChanged}"><datalist id="ent-list">${entities.map(e => html`<option value="${e}">`)}</datalist></div>`;
    }

    _handleChanged(ev) {
      const configKey = ev.target.getAttribute('data-config');
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [configKey]: ev.target.value } }, bubbles: true, composed: true }));
    }

    static get styles() { return css`.editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}.nav-tabs{display:flex;gap:4px;margin-bottom:10px}button{background:#333;color:#eee;border:none;padding:8px;border-radius:4px;cursor:pointer;flex:1;font-size:0.75em}button.active{background:#00ffff;color:black;font-weight:bold}.group-box{background:#252525;border:1px solid #444;margin-bottom:5px}summary{padding:8px;cursor:pointer;color:#00ffff;font-size:0.9em}.group-content{padding:10px;background:#111}.field{margin-bottom:8px;display:flex;flex-direction:column}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}label{font-size:0.7em;color:#aaa}input{background:#222;border:1px solid #555;color:white;padding:5px;width:100%;box-sizing:border-box}.section-title{font-weight:bold;margin-bottom:5px;color:#ff00ff;text-transform:uppercase}`; }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LOGIQUE DE LA CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    _renderBattery(prefix) {
      const entity = this.config[prefix + "_entity"];
      if (!entity || !this.hass.states[entity]) return html``;
      const soc = parseFloat(this.hass.states[entity].state) || 0;
      const w = this.config[prefix + "_w"] || 100;
      const h = this.config[prefix + "_h"] || 12;
      const rot = this.config[prefix + "_rot"] || 0;
      const colorFill = soc > 50 ? '#4caf50' : soc > 20 ? '#ffeb3b' : '#f44336';
      
      return html`
        <div class="sensor-block" style="left:${this.config[prefix+'_x']}px; top:${this.config[prefix+'_y']}px; transform:rotate(${rot}deg); transform-origin: center left;">
          <div class="sensor-name" style="color:white; font-size:${this.config[prefix+'_size'] || 12}px;">${this.config[prefix + "_name"]}: ${soc}%</div>
          <div class="battery-bar-container" style="width:${w}px; height:${h}px; border: 1px solid ${this.config[prefix+'_color'] || '#00ffff'}">
            <div class="battery-bar-fill" style="width:${soc}%; background: ${colorFill}"></div>
          </div>
        </div>
      `;
    }

    _renderData(prefix) {
      const entity = this.config[prefix + "_entity"];
      if (!entity || !this.hass.states[entity]) return html``;
      const state = this.hass.states[entity].state;
      const unit = this.hass.states[entity].attributes.unit_of_measurement || "";
      return html`
        <div class="sensor-block" style="left:${this.config[prefix+'_x']}px; top:${this.config[prefix+'_y']}px; color:${this.config[prefix+'_color']||'white'}; font-size:${this.config[prefix+'_size']||14}px; transform:rotate(${this.config[prefix+'_rot']||0}deg); transform-origin: center left;">
          <div class="sensor-name">${this.config[prefix+"_name"]}</div>
          <div class="sensor-value">${state} <small>${unit}</small></div>
        </div>
      `;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      return html`
        <ha-card style="width:${this.config.card_width||500}px; height:${this.config.card_height||400}px; border:2px solid ${this.config.border_color||'#00ffff'}; background-image:url('${this.config.background_image}'); background-size:100% 100%">
          ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5'].map(p => this._renderData(p))}
          ${['b1','b2','b3'].map(p => this._renderBattery(p))}
        </ha-card>
      `;
    }

    static get styles() { return css`ha-card{overflow:hidden;border-radius:15px;background-repeat:no-repeat;position:relative}.sensor-block{position:absolute;font-weight:bold;text-shadow:2px 2px 4px black;pointer-events:none;white-space:nowrap;line-height:1.1}.sensor-name{font-size:0.65em;opacity:0.8;text-transform:uppercase}.battery-bar-container{background:rgba(0,0,0,0.5);border-radius:3px;overflow:hidden;margin-top:2px}.battery-bar-fill{height:100%;transition:width 0.5s ease-in-out}`; }
  }
  customElements.define("solaire-card", SolaireCard);

  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V6", preview: true });
})();
