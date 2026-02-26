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
            <button class="${this._tab === 'bat' ? 'active' : ''}" @click="${() => this._tab = 'bat'}">🔋 Bat</button>
            <button class="${this._tab === 'flow' ? 'active' : ''}" @click="${() => this._tab = 'flow'}">🌊 Flux</button>
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Gen</button>
          </div>
          <div class="content">${this._renderTabContent(entities)}</div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      if (this._tab === 'flow') {
        return html`
          <div class="section-title">FLUX D'ÉNERGIE (1-10)</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>Flux #${i} ${this._config['custom_flow_'+i+'_enabled'] ? '✔️' : '⚪'}</summary>
              <div class="group-content">
                <div class="field">
                    <label>Activer le flux</label>
                    <input type="checkbox" .checked="${this._config['custom_flow_'+i+'_enabled']}" @change="${e => this._toggleFlow(i, e)}">
                </div>
                ${this._renderField("Sensor (Vitesse)", "custom_flow_"+i+"_sensor", "text")}
                ${this._renderField("Tracé SVG (Path)", "custom_flow_"+i+"_path", "text")}
                ${this._renderField("Couleur", "custom_flow_"+i+"_color", "color")}
              </div>
            </details>
          `)}
        `;
      }
      const mapping = { solar: ['s1','s2','s3','s4','s5'], house: ['h1','h2','h3','h4','h5'], bat: ['b1','b2','b3'] };
      if (this._tab === 'gen') {
        return html`
          <div class="section-title">CARTE</div>
          <div class="row">${this._renderField("Largeur", "card_width", "number")}${this._renderField("Hauteur", "card_height", "number")}</div>
          ${this._renderField("Image", "background_image", "text")}${this._renderField("Bordure", "border_color", "color")}
        `;
      }
      return html`<div class="section-title">${this._tab}</div>${mapping[this._tab].map(p => this._renderGroup(p, entities, this._tab === 'bat'))}`;
    }

    _toggleFlow(i, ev) {
        const newConfig = { ...this._config, ['custom_flow_'+i+'_enabled']: ev.target.checked };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
    }

    _renderGroup(prefix, entities, isBattery) {
      return html`
        <details class="group-box">
          <summary>${this._config[prefix+'_entity']?'✔️':'⚪'} ${this._config[prefix+'_name']||prefix}</summary>
          <div class="group-content">
            ${this._renderField("Nom", prefix+"_name", "text")}
            ${this._renderEntityPicker("Sensor", prefix+"_entity", entities)}
            <div class="row">${this._renderField("X", prefix+"_x", "number")}${this._renderField("Y", prefix+"_y", "number")}</div>
            <div class="row">${this._renderField("Taille", prefix+"_size", "number")}${this._renderField("Rot", prefix+"_rot", "number")}</div>
            ${isBattery ? html`<div class="row">${this._renderField("W Jauge", prefix+"_w", "number")}${this._renderField("H Jauge", prefix+"_h", "number")}</div>`:''}
            ${this._renderField("Couleur", prefix+"_color", "color")}
          </div>
        </details>
      `;
    }

    _renderField(label, key, type) { return html`<div class="field"><label>${label}</label><input type="${type}" .value="${this._config[key]||''}" data-config="${key}" @input="${this._handleChanged}"></div>`; }
    _renderEntityPicker(label, key, entities) { return html`<div class="field"><label>${label}</label><input list="ent-list" .value="${this._config[key]||''}" data-config="${key}" @input="${this._handleChanged}"><datalist id="ent-list">${entities.map(e => html`<option value="${e}">`)}</datalist></div>`; }
    _handleChanged(ev) { const k = ev.target.getAttribute('data-config'); this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: ev.target.value } }, bubbles: true, composed: true })); }
    
    static get styles() { return css`
      .editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}
      .nav-tabs{display:flex;gap:3px;margin-bottom:10px}
      button{background:#333;color:#eee;border:none;padding:6px;border-radius:4px;cursor:pointer;flex:1;font-size:0.7em}
      button.active{background:#00ffff;color:black;font-weight:bold}
      .group-box{background:#252525;border:1px solid #444;margin-bottom:5px}
      summary{padding:8px;cursor:pointer;color:#00ffff;font-size:0.85em}
      .group-content{padding:10px;background:#111}
      .field{margin-bottom:8px;display:flex;flex-direction:column}
      label{font-size:0.7em;color:gray}
      input{background:#222;border:1px solid #555;color:white;padding:5px;width:100%}
      .section-title{color:#ff00ff;font-weight:bold;margin-bottom:8px}
    `; }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    _renderFlow(i) {
        if (!this.config['custom_flow_'+i+'_enabled']) return html``;
        const path = this.config['custom_flow_'+i+'_path'];
        if (!path) return html``;
        
        const color = this.config['custom_flow_'+i+'_color'] || '#00ffff';
        const sensor = this.config['custom_flow_'+i+'_sensor'];
        const val = this.hass.states[sensor] ? parseFloat(this.hass.states[sensor].state) : 100; // 100 par défaut pour tester
        
        // Calcul de la vitesse : plus de Watts = plus rapide
        const duration = val > 1 ? Math.max(0.5, 8 - (Math.abs(val) / 500)) : 0;

        return html`
          <g>
            <path d="${path}" fill="none" stroke="${color}" stroke-width="2" opacity="0.2" />
            ${duration > 0 ? html`
                <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="4,15" stroke-linecap="round">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="${duration}s" repeatCount="indefinite" />
                </path>
            ` : ''}
          </g>
        `;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const w = this.config.card_width || 500;
      const h = this.config.card_height || 400;
      
      return html`
        <ha-card style="width:${w}px; height:${h}px; border:2px solid ${this.config.border_color||'#00ffff'}; background-image:url('${this.config.background_image}'); background-size:100% 100%; position:relative; overflow:hidden;">
          
          <svg viewBox="0 0 ${w} ${h}" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => this._renderFlow(i))}
          </svg>

          <div style="position:relative; z-index:2; width:100%; height:100%;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5'].map(p => this._renderData(p))}
            ${['b1','b2','b3'].map(p => this._renderBattery(p))}
          </div>

        </ha-card>
      `;
    }

    _renderBattery(p) {
        const e = this.config[p+'_entity'];
        if(!e || !this.hass.states[e]) return html``;
        const soc = parseFloat(this.hass.states[e].state);
        return html`<div class="sensor-block" style="left:${this.config[p+'_x']}px; top:${this.config[p+'_y']}px; transform:rotate(${this.config[p+'_rot']||0}deg)">
            <div class="sensor-name">${this.config[p+'_name']}: ${soc}%</div>
            <div class="bar" style="width:${this.config[p+'_w']||100}px; height:${this.config[p+'_h']||10}px; border:1px solid ${this.config[p+'_color']}"><div style="width:${soc}%; background:${soc>20?'#4caf50':'#f44336'}; height:100%"></div></div>
        </div>`;
    }

    _renderData(p) {
        const e = this.config[p+'_entity'];
        if(!e || !this.hass.states[e]) return html``;
        return html`<div class="sensor-block" style="left:${this.config[p+'_x']}px; top:${this.config[p+'_y']}px; color:${this.config[p+'_color']}; font-size:${this.config[p+'_size']||14}px; transform:rotate(${this.config[p+'_rot']||0}deg)">
            <div class="sensor-name">${this.config[p+'_name']}</div><div>${this.hass.states[e].state} <small>${this.hass.states[e].attributes.unit_of_measurement || ''}</small></div>
        </div>`;
    }

    static get styles() { return css`
      ha-card{overflow:hidden;border-radius:15px;background-repeat:no-repeat;position:relative}
      .sensor-block{position:absolute;font-weight:bold;text-shadow:2px 2px 4px black;white-space:nowrap;line-height:1}
      .sensor-name{font-size:0.6em;opacity:0.8;text-transform:uppercase}
      .bar{background:rgba(0,0,0,0.5);border-radius:2px;overflow:hidden}
      svg { display: block; }
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V7.1 Flux", preview: true });
})();
