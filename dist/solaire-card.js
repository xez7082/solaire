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
            ${['solar','house','bat','flow','forecast','gen'].map(t => html`
              <button class="${this._tab === t ? 'active' : ''}" @click="${() => this._tab = t}">${t.toUpperCase()}</button>
            `)}
          </div>
          <div class="content">${this._renderTabContent(entities)}</div>
        </div>
      `;
    }
    _renderTabContent(entities) {
      if (this._tab === 'flow') {
        return html`<div class="section-title">FLUX (SVG PATH)</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>${this._config['f'+i+'_en'] ? '🔵' : '⚪'} Flux #${i}</summary>
              <div class="group-content">
                <label>Activer</label><input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}">
                <div class="field"><label>Tracé (ex: M 10 10 L 200 200)</label><input type="text" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}"></div>
                <div class="field"><label>Sensor (W)</label><input list="ents" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}"></div>
                <div class="row">
                  <div class="field"><label>Couleur</label><input type="color" .value="${this._config['f'+i+'_c'] || '#00ffff'}" @input="${e => this._up('f'+i+'_c', e.target.value)}"></div>
                  <div class="field"><label>Épaisseur</label><input type="number" .value="${this._config['f'+i+'_w'] || 3}" @input="${e => this._up('f'+i+'_w', e.target.value)}"></div>
                </div>
              </div>
            </details>
          `)}<datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>`;
      }
      if (this._tab === 'gen') {
        return html`<div class="section-title">CARTE</div>
          <div class="row">${this._renderField("Largeur", "card_width", "number")}${this._renderField("Hauteur", "card_height", "number")}</div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}`;
      }
      const groups = { solar: ['s1','s2','s3','s4','s5'], house: ['h1','h2','h3','h4','h5'], bat: ['b1','b2','b3'] };
      return html`<div class="section-title">${this._tab}</div>${(groups[this._tab]||[]).map(p => this._renderGroup(p, entities, this._tab === 'bat'))}`;
    }
    _renderGroup(p, entities, isBat) {
      return html`<details class="group-box"><summary>${this._config[p+'_entity']?'✔️':'⚪'} ${this._config[p+'_name']||p}</summary>
        <div class="group-content">
          ${this._renderField("Nom", p+"_name", "text")}
          ${this._renderField("Sensor", p+"_entity", "text", entities)}
          <div class="row">${this._renderField("X", p+"_x", "number")}${this._renderField("Y", p+"_y", "number")}</div>
          <div class="row">${this._renderField("Taille", p+"_size", "number")}${this._renderField("Rot", p+"_rot", "number")}</div>
          ${isBat ? html`<div class="row">${this._renderField("W Jauge", p+"_w", "number")}${this._renderField("H Jauge", p+"_h", "number")}</div>`:''}
        </div></details>`;
    }
    _renderField(l, k, t, ents = null) {
      return html`<div class="field"><label>${l}</label><input type="${t}" list="${ents ? 'elists' : ''}" .value="${this._config[k]||''}" @input="${e => this._up(k, e.target.value)}">${ents ? html`<datalist id="elists">${ents.map(e => html`<option value="${e}">`)}</datalist>` : ''}</div>`;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    static get styles() { return css`.editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}.nav-tabs{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px}button{background:#333;color:#eee;border:none;padding:5px;cursor:pointer;flex:1 1 30%;font-size:0.7em}button.active{background:#00ffff;color:black}.group-box{background:#252525;border:1px solid #444;margin-bottom:5px}summary{padding:5px;cursor:pointer;color:#00ffff;font-size:0.8em}.group-content{padding:5px;background:#111}.field{margin-bottom:5px;display:flex;flex-direction:column}label{font-size:0.65em;color:#aaa}input{background:#222;border:1px solid #555;color:white;padding:4px;width:100%;box-sizing:border-box}.row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.section-title{color:#ff00ff;font-weight:bold;font-size:0.8em;text-transform:uppercase}`; }
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
        <ha-card style="width:${w}px; height:${h}px; border:1px solid ${c.border_color||'#333'}; position:relative; overflow:hidden; background:#000;">
          <img src="${c.background_image}" style="width:100%; height:100%; object-fit:contain; position:absolute; z-index:1;">
          
          <svg style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:5; pointer-events:none;" viewBox="0 0 ${w} ${h}">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => this._drawFlow(i))}
          </svg>

          <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
          </div>
        </ha-card>
      `;
    }

    _drawFlow(i) {
      const c = this.config;
      if (!c['f'+i+'_en'] || !c['f'+i+'_p']) return html``;
      const s = c['f'+i+'_s'];
      const val = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 500;
      if (val === 0 && s) return html``;

      const dur = Math.max(0.5, 6 - (Math.abs(val) / 500));
      const color = c['f'+i+'_c'] || '#00ffff';
      const thick = c['f'+i+'_w'] || 3;

      return html`
        <path id="path${i}" d="${c['f'+i+'_p']}" fill="none" stroke="${color}" stroke-width="${thick}" opacity="0.1" />
        <path d="${c['f'+i+'_p']}" fill="none" stroke="${color}" stroke-width="${thick}" stroke-dasharray="10,20" stroke-linecap="round">
          <animate attributeName="stroke-dashoffset" from="${val < 0 ? -100 : 100}" to="0" dur="${dur}s" repeatCount="indefinite" />
        </path>
      `;
    }

    _renderItem(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      const isBat = p.startsWith('b');
      
      return html`<div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_color']||'#fff'}; transform:rotate(${c[p+'_rot']||0}deg);">
          <div class="label">${c[p+'_name']||p}</div>
          <div class="val">${s.state} ${isBat ? '%' : s.attributes.unit_of_measurement}</div>
          ${isBat ? html`<div class="gauge"><div style="width:${s.state}%; background:${s.state>20?'#0f0':'#f00'}; height:100%;"></div></div>` : ''}
      </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 2px 2px 2px #000;}
      .label{font-size:0.7em; opacity:0.8; text-transform:uppercase;}
      .val{font-weight:bold;}
      .gauge{width:60px; height:6px; border:1px solid #fff; background:rgba(0,0,0,0.5); margin-top:2px;}
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V19", preview: true });
})();
