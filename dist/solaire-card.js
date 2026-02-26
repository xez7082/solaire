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
        return html`<div class="section-title">FLUX (DESSIN)</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>${this._config['f'+i+'_en'] ? '🔵' : '⚪'} Flux #${i}</summary>
              <div class="group-content">
                <div class="field-inline"><label>Activer</label><input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}"></div>
                <div class="field"><label>Tracé (ex: M 50 50 L 250 50)</label><input type="text" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}"></div>
                <div class="field"><label>Entité Watts (Optionnel)</label><input list="ents" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}"></div>
                <div class="row">
                   <div class="field"><label>Couleur</label><input type="color" .value="${this._config['f'+i+'_c'] || '#ffff00'}" @input="${e => this._up('f'+i+'_c', e.target.value)}"></div>
                   <div class="field"><label>Épaisseur</label><input type="number" .value="${this._config['f'+i+'_w'] || 3}" @input="${e => this._up('f'+i+'_w', e.target.value)}"></div>
                </div>
              </div>
            </details>
          `)}<datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>`;
      }
      if (this._tab === 'forecast') {
        return html`<div class="section-title">PRÉVISIONS SOLAIRES</div>
          <div class="field-inline"><label>Activer</label><input type="checkbox" .checked="${this._config.solar_forecast_enabled}" @change="${e => this._up('solar_forecast_enabled', e.target.checked)}"></div>
          ${this._renderField("Sensor Prévision (W)", "sensor_solar_forecast", "text", entities.filter(e => e.includes('forecast')))}
          <div class="row">${this._renderField("X", "solar_forecast_x", "number")}${this._renderField("Y", "solar_forecast_y", "number")}</div>
          <div class="row">${this._renderField("Taille Texte", "solar_forecast_size", "number")}${this._renderField("Inclinaison", "solar_forecast_rot", "number")}</div>
          <div class="field"><label>Couleur</label><input type="color" .value="${this._config.solar_forecast_color||'#00ffff'}" @input="${e => this._up('solar_forecast_color', e.target.value)}"></div>`;
      }
      if (this._tab === 'gen') {
         return html`<div class="section-title">CARTE</div>
          <div class="row">${this._renderField("Largeur", "card_width", "number")}${this._renderField("Hauteur", "card_height", "number")}</div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}`;
      }
      const groups = { solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3'] };
      return html`<div class="section-title">${this._tab}</div>${(groups[this._tab]||[]).map(p => this._renderGroup(p, entities, this._tab === 'bat'))}`;
    }
    _renderGroup(p, entities, isBat) {
      return html`<details class="group-box"><summary>${this._config[p+'_entity']?'✔️':'⚪'} ${this._config[p+'_name']||p}</summary>
        <div class="group-content">
          ${this._renderField("Nom", p+"_name", "text")}
          ${this._renderField("Entité", p+"_entity", "text", entities)}
          <div class="row">${this._renderField("X", p+"_x", "number")}${this._renderField("Y", p+"_y", "number")}</div>
          <div class="row">${this._renderField("Taille", p+"_size", "number")}${this._renderField("Rotation", p+"_rot", "number")}</div>
          <div class="field"><label>Couleur</label><input type="color" .value="${this._config[p+'_color']||'#ffffff'}" @input="${e => this._up(p+'_color', e.target.value)}"></div>
          ${isBat ? html`<div class="row">${this._renderField("Larg. Jauge", p+"_w", "number")}${this._renderField("Haut. Jauge", p+"_h", "number")}</div>`:''}
        </div></details>`;
    }
    _renderField(l, k, t, ents = null) {
      return html`<div class="field"><label>${l}</label><input type="${t}" .value="${this._config[k]||''}" @input="${e => this._up(k, e.target.value)}"></div>`;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    static get styles() { return css`.editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}.nav-tabs{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px}button{background:#333;color:#eee;border:none;padding:5px;cursor:pointer;flex:1 1 30%;font-size:0.75em}button.active{background:#00ffff;color:black}.group-box{background:#252525;border:1px solid #444;margin-bottom:5px}summary{padding:5px;cursor:pointer;color:#00ffff}.group-content{padding:10px;background:#111;display:flex;flex-direction:column;gap:5px}label{font-size:0.65em;color:#aaa}input{background:#222;border:1px solid #555;color:white;padding:6px;width:100%;box-sizing:border-box}.row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.section-title{color:#ff00ff;font-weight:bold;font-size:0.8em;text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #444}`; }
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
          <img src="${c.background_image}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:1;">

          <svg style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:5; pointer-events:none;" viewBox="0 0 ${w} ${h}">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => this._drawFlow(i))}
          </svg>

          <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
            ${this._renderForecast()}
          </div>
        </ha-card>
      `;
    }

    _drawFlow(i) {
      const c = this.config;
      if (!c['f'+i+'_en'] || !c['f'+i+'_p']) return html``;
      const s = c['f'+i+'_s'];
      const val = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 500;
      
      const color = c['f'+i+'_c'] || '#ffff00';
      const width = c['f'+i+'_w'] || 3;
      const dur = Math.max(0.5, 6 - (Math.abs(val) / 400));

      return html`
        <g>
          <path d="${c['f'+i+'_p']}" fill="none" stroke="${color}" stroke-width="${width}" opacity="0.1" stroke-linecap="round"/>
          <path d="${c['f'+i+'_p']}" fill="none" stroke="${color}" stroke-width="${width}" 
                stroke-dasharray="10,25" stroke-linecap="round" style="filter: drop-shadow(0px 0px 3px ${color});">
            <animate attributeName="stroke-dashoffset" from="${val < 0 ? -70 : 70}" to="0" dur="${dur}s" repeatCount="indefinite" />
          </path>
        </g>
      `;
    }

    _renderForecast() {
      const c = this.config;
      if (!c.solar_forecast_enabled || !c.sensor_solar_forecast) return '';
      const s = this.hass.states[c.sensor_solar_forecast];
      if (!s) return '';
      return html`<div class="item" style="left:${c.solar_forecast_x}px; top:${c.solar_forecast_y}px; color:${c.solar_forecast_color||'#00ffff'}; transform:rotate(${c.solar_forecast_rot||0}deg); font-size:${c.solar_forecast_size||14}px;">
          <div class="label">Forecast</div>
          <div class="val">${s.state} ${s.attributes.unit_of_measurement || 'W'}</div>
      </div>`;
    }

    _renderItem(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      return html`<div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_color']||'#fff'}; transform:rotate(${c[p+'_rot']||0}deg); font-size:${c[p+'_size']||14}px;">
          <div class="label">${c[p+'_name']||''}</div>
          <div class="val">${s.state} ${p.startsWith('b') ? '%' : (s.attributes.unit_of_measurement||'')}</div>
          ${p.startsWith('b') ? html`<div class="gauge" style="width:${c[p+'_w']||60}px; height:${c[p+'_h']||8}px;"><div style="width:${s.state}%; background:${s.state>20?'#0f0':'#f00'}; height:100%;"></div></div>` : ''}
      </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 2px 2px 2px #000; pointer-events:none; white-space:nowrap;}
      .label{font-size:0.7em; opacity:0.8; text-transform:uppercase; font-weight:bold;}
      .val{font-weight:bold;}
      .gauge{border:1px solid #fff; background:rgba(0,0,0,0.5); border-radius:2px; overflow:hidden;}
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V24", preview: true });
})();
