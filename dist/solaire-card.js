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
      const tabs = [
        {id:'solar', n:'Solaire'}, {id:'house', n:'Maison'}, 
        {id:'bat', n:'Batterie'}, {id:'flow', n:'Flux'}, 
        {id:'forecast', n:'Météo'}, {id:'gen', n:'Général'}
      ];

      return html`
        <div class="editor-container">
          <div class="nav-tabs">
            ${tabs.map(t => html`
              <button class="${this._tab === t.id ? 'active' : ''}" @click="${() => this._tab = t.id}">${t.n}</button>
            `)}
          </div>
          <div class="content">${this._renderTabContent(entities)}</div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      if (this._tab === 'flow') {
        return html`<div class="section-title">CONFIGURATION DES FLUX</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>${this._config['f'+i+'_en'] ? '🔵' : '⚪'} Flux #${i}</summary>
              <div class="group-content">
                <div class="field-inline"><label>Activer</label><input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}"></div>
                <div class="field"><label>Tracé SVG (ex: M 10 10 L 200 200)</label><input type="text" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}"></div>
                <div class="field"><label>Entité Puissance (W)</label><input list="ents" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}"></div>
                <div class="row">
                  <div class="field"><label>Couleur</label><input type="color" .value="${this._config['f'+i+'_c'] || '#00ffff'}" @input="${e => this._up('f'+i+'_c', e.target.value)}"></div>
                  <div class="field"><label>Épaisseur</label><input type="number" .value="${this._config['f'+i+'_w'] || 3}" @input="${e => this._up('f'+i+'_w', e.target.value)}"></div>
                </div>
              </div>
            </details>
          `)}<datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>`;
      }
      
      if (this._tab === 'gen') {
        return html`<div class="section-title">PARAMÈTRES CARTE</div>
          <div class="row">${this._renderField("Largeur (px)", "card_width", "number")}${this._renderField("Hauteur (px)", "card_height", "number")}</div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}`;
      }

      const groups = { solar: ['s1','s2','s3','s4','s5'], house: ['h1','h2','h3','h4','h5'], bat: ['b1','b2','b3'], forecast: [] };
      return html`<div class="section-title">${this._tab.toUpperCase()}</div>
        ${(groups[this._tab] || []).map(p => this._renderGroup(p, entities, this._tab === 'bat'))}`;
    }

    _renderGroup(p, entities, isBat) {
      return html`<details class="group-box">
        <summary>${this._config[p+'_entity']?'✔️':'⚪'} ${this._config[p+'_name']||p}</summary>
        <div class="group-content">
          ${this._renderField("Nom Personnalisé", p+"_name", "text")}
          ${this._renderField("Entité", p+"_entity", "text", entities)}
          <div class="row">${this._renderField("X", p+"_x", "number")}${this._renderField("Y", p+"_y", "number")}</div>
          <div class="row">${this._renderField("Taille", p+"_size", "number")}${this._renderField("Rotation (°)", p+"_rot", "number")}</div>
          ${isBat ? html`<div class="row">${this._renderField("Largeur Jauge", p+"_w", "number")}${this._renderField("Hauteur Jauge", p+"_h", "number")}</div>`:''}
          ${this._renderField("Couleur", p+"_color", "color")}
        </div></details>`;
    }

    _renderField(l, k, t, ents = null) {
      return html`<div class="field"><label>${l}</label><input type="${t}" list="${ents?'elists':''}" .value="${this._config[k]||''}" @input="${e => this._up(k, e.target.value)}">${ents?html`<datalist id="elists">${ents.map(e => html`<option value="${e}">`)}</datalist>`:''}</div>`;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    static get styles() { return css`
      .editor-container{background:#1c1c1c; color:#ddd; padding:12px; font-family: sans-serif;}
      .nav-tabs{display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px;}
      button{background:#333; color:#eee; border:none; padding:8px; border-radius:4px; cursor:pointer; flex:1 1 30%; font-size:0.8em; transition: 0.2s;}
      button.active{background:#00d4ff; color:#000; font-weight:bold;}
      .group-box{background:#2a2a2a; border:1px solid #444; margin-bottom:6px; border-radius:4px;}
      summary{padding:10px; cursor:pointer; color:#00d4ff; font-weight: bold;}
      .group-content{padding:10px; background:#181818; display:flex; flex-direction:column; gap:8px;}
      .field{display:flex; flex-direction:column; gap:3px;}
      .field-inline{display:flex; align-items:center; gap:10px;}
      label{font-size:0.75em; color:#999;}
      input{background:#222; border:1px solid #555; color:#fff; padding:6px; border-radius:3px;}
      .row{display:grid; grid-template-columns: 1fr 1fr; gap:10px;}
      .section-title{color:#ff00ff; font-size:0.9em; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #333;}
    `; }
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
          
          <div class="main-container" style="width:100%; height:100%; position:relative;">
            
            <img src="${c.background_image}" style="width:100%; height:100%; object-fit:contain; position:absolute; z-index:1;">

            <svg style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:5; pointer-events:none;" viewBox="0 0 ${w} ${h}">
              ${[1,2,3,4,5,6,7,8,9,10].map(i => this._drawFlow(i))}
            </svg>

            <div class="data-layer" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;">
              ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5'].map(p => this._renderData(p))}
              ${['b1','b2','b3'].map(p => this._renderBat(p))}
            </div>

          </div>
        </ha-card>
      `;
    }

    _drawFlow(i) {
      const c = this.config;
      if (!c['f'+i+'_en'] || !c['f'+i+'_p']) return html``;
      
      const sensor = c['f'+i+'_s'];
      let val = 500; // Mode démo
      if (sensor && this.hass.states[sensor]) {
        val = parseFloat(this.hass.states[sensor].state) || 0;
      }
      
      if (val === 0 && sensor) return html``;

      const speed = Math.max(0.2, 8 - (Math.abs(val) / 400));
      const color = c['f'+i+'_c'] || '#00ffff';
      const width = c['f'+i+'_w'] || 3;
      const isReverse = val < 0;

      return html`
        <g>
          <path d="${c['f'+i+'_p']}" fill="none" stroke="${color}" stroke-width="${width}" opacity="0.15" stroke-linecap="round"/>
          <path d="${c['f'+i+'_p']}" fill="none" stroke="${color}" stroke-width="${width}" 
                stroke-dasharray="10, 25" stroke-linecap="round"
                style="animation: dash ${speed}s linear infinite ${isReverse?'reverse':'normal'}; shadow: 0 0 5px ${color};">
          </path>
        </g>
      `;
    }

    _renderBat(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const soc = parseFloat(this.hass.states[c[p+'_entity']].state) || 0;
      return html`<div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; transform:rotate(${c[p+'_rot']||0}deg);">
          <div class="label">${c[p+'_name']||p}: ${soc}%</div>
          <div class="gauge-bg" style="width:${c[p+'_w']||80}px; height:${c[p+'_h']||10}px;">
            <div class="gauge-fill" style="width:${soc}%; background:${soc>20?'#4caf50':'#f44336'};"></div>
          </div>
      </div>`;
    }

    _renderData(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      return html`<div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_color']||'#fff'}; font-size:${c[p+'_size']||14}px; transform:rotate(${c[p+'_rot']||0}deg);">
          <div class="label">${c[p+'_name']||p}</div>
          <div class="val">${s.state} <small>${s.attributes.unit_of_measurement||''}</small></div>
      </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; transform-origin: center; text-shadow: 2px 2px 3px rgba(0,0,0,0.9);}
      .label{font-size: 0.65em; text-transform: uppercase; font-weight: bold; opacity: 0.9;}
      .val{font-weight: bold;}
      .gauge-bg{background: rgba(0,0,0,0.5); border: 1px solid #fff; border-radius: 2px; overflow: hidden; margin-top:2px;}
      .gauge-fill{height: 100%; transition: width 0.5s ease-in-out;}
      @keyframes dash { from { stroke-dashoffset: 35; } to { stroke-dashoffset: 0; } }
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V18", preview: true });
})();
