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
      const entities = Object.keys(this.hass.states).sort();
      return html`
        <div class="editor-container">
          <div class="nav-tabs">
            ${['solar','house','bat','flow','gen'].map(t => html`
              <button class="${this._tab === t ? 'active' : ''}" @click="${() => this._tab = t}">${t.toUpperCase()}</button>
            `)}
          </div>
          <div class="content">${this._renderTabContent(entities)}</div>
        </div>
      `;
    }
    _renderTabContent(entities) {
      if (this._tab === 'flow') {
        return html`<div class="section-title">FLUX (SVG)</div>
          ${[1,2,3,4,5].map(i => html`
            <div class="group-box" style="padding:8px; margin-bottom:5px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Flux #${i}</span>
                <input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}">
              </div>
              <input type="text" placeholder="Tracé (ex: M 10 10 L 100 100)" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}" style="width:100%; margin:4px 0;">
              <input list="ents" placeholder="Entité Puissance (W)" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}" style="width:100%;">
              <div style="display:flex; gap:5px; margin-top:4px;">
                <input type="color" .value="${this._config['f'+i+'_c'] || '#00ffff'}" @input="${e => this._up('f'+i+'_c', e.target.value)}">
                <input type="number" placeholder="Épaisseur" .value="${this._config['f'+i+'_w'] || 3}" @input="${e => this._up('f'+i+'_w', e.target.value)}" style="width:50px;">
              </div>
            </div>
          `)}<datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>`;
      }
      if (this._tab === 'gen') {
        return html`<div class="section-title">CARTE</div>
          <div class="row">${this._renderField("Largeur", "card_width", "number")}${this._renderField("Hauteur", "card_height", "number")}</div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}`;
      }
      const groups = { solar: ['s1','s2','s3'], house: ['h1','h2','h3'], bat: ['b1'] };
      return html`<div class="section-title">${this._tab}</div>${(groups[this._tab]||[]).map(p => this._renderGroup(p, entities))}`;
    }
    _renderGroup(p, entities) {
      return html`<div class="group-box" style="padding:8px; margin-bottom:5px;">
        <label>${p.toUpperCase()}</label>
        <input list="ents" .value="${this._config[p+'_entity'] || ''}" @input="${e => this._up(p+'_entity', e.target.value)}" style="width:100%; margin-bottom:4px;">
        <div class="row">
          <input type="number" placeholder="X" .value="${this._config[p+'_x'] || 0}" @input="${e => this._up(p+'_x', e.target.value)}">
          <input type="number" placeholder="Y" .value="${this._config[p+'_y'] || 0}" @input="${e => this._up(p+'_y', e.target.value)}">
        </div>
      </div>`;
    }
    _renderField(l, k, t) {
      return html`<div class="field"><label>${l}</label><input type="${t}" .value="${this._config[k]||''}" @input="${e => this._up(k, e.target.value)}"></div>`;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    static get styles() { return css`.editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}.nav-tabs{display:flex;gap:4px;margin-bottom:10px}button{background:#333;color:#eee;border:none;padding:8px;cursor:pointer;flex:1;font-size:0.7em}button.active{background:#00ffff;color:black}.group-box{background:#252525;border:1px solid #444}.field{margin-bottom:5px;display:flex;flex-direction:column}label{font-size:0.65em;color:#aaa}input{background:#222;border:1px solid #555;color:white;padding:4px}.row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.section-title{color:#ff00ff;font-weight:bold;font-size:0.8em;text-transform:uppercase}`; }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      const w = c.card_width || 500;
      const h = c.card_height || 400;

      return html`
        <ha-card style="width:${w}px; height:${h}px; position:relative; overflow:hidden; background:#000;">
          <div style="position:absolute; width:100%; height:100%; background: url('${c.background_image}') no-repeat center; background-size: contain; z-index:1;"></div>

          <svg style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;" viewBox="0 0 ${w} ${h}">
            ${[1,2,3,4,5].map(i => this._drawFlow(i))}
          </svg>

          <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:20; pointer-events:none;">
            ${['s1','s2','s3','h1','h2','h3','b1'].map(p => this._renderItem(p))}
          </div>
        </ha-card>
      `;
    }

    _drawFlow(i) {
      const c = this.config;
      if (!c['f'+i+'_en'] || !c['f'+i+'_p']) return html``;
      
      const sensor = c['f'+i+'_s'];
      let val = 500;
      if (sensor && this.hass.states[sensor]) {
        val = parseFloat(this.hass.states[sensor].state) || 0;
      }
      if (val === 0 && sensor) return html``;

      const color = c['f'+i+'_c'] || '#00ffff';
      const width = c['f'+i+'_w'] || 3;
      const isReverse = val < 0;
      
      // Vitesse : plus c'est petit, plus c'est rapide
      const duration = Math.max(0.5, 5 - (Math.abs(val) / 500));

      return html`
        <path d="${c['f'+i+'_p']}" 
              fill="none" 
              stroke="${color}" 
              stroke-width="${width}" 
              stroke-linecap="round" 
              class="flow-line"
              style="--duration: ${duration}s; stroke-dasharray: 10, 20; animation: dash ${duration}s linear infinite ${isReverse ? 'reverse' : 'normal'}; opacity: 0.9;">
        </path>
      `;
    }

    _renderItem(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      return html`<div class="data-text" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px;">
        ${s.state} <small>${s.attributes.unit_of_measurement || ''}</small>
      </div>`;
    }

    static get styles() { return css`
      .data-text { position:absolute; color:white; font-weight:bold; text-shadow: 2px 2px 2px black; pointer-events:none; }
      .flow-line { filter: drop-shadow(0px 0px 2px black); }
      @keyframes dash {
        from { stroke-dashoffset: 30; }
        to { stroke-dashoffset: 0; }
      }
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V20", preview: true });
})();
