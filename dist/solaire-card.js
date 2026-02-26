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
            <button class="${this._tab === 'solar' ? 'active' : ''}" @click="${() => this._tab = 'solar'}">☀️ Sensors</button>
            <button class="${this._tab === 'flow' ? 'active' : ''}" @click="${() => this._tab = 'flow'}">🌊 Flux</button>
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Général</button>
          </div>

          <div class="content">
            ${this._tab === 'flow' ? this._renderFlowTab() : 
              this._tab === 'gen' ? this._renderGenTab() : 
              this._renderSensorsTab(entities)}
          </div>
        </div>
      `;
    }

    _renderFlowTab() {
      return html`
        <div class="section-title">FLUX D'ÉNERGIE (1-10)</div>
        ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
          <details class="group-box">
            <summary>Flux #${i} ${this._config['f'+i+'_en'] ? '✔️' : '⚪'}</summary>
            <div class="group-content">
              <label>Activer : </label><input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}">
              <div class="field"><label>Tracé SVG (M...)</label><input type="text" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}"></div>
              <div class="field"><label>Couleur</label><input type="color" .value="${this._config['f'+i+'_c'] || '#00ffff'}" @input="${e => this._up('f'+i+'_c', e.target.value)}"></div>
              <div class="field"><label>Sensor Vitesse (Facultatif)</label><input type="text" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}"></div>
            </div>
          </details>
        `)}
      `;
    }

    _renderGenTab() {
      return html`
        <div class="section-title">CARTE</div>
        <div class="field"><label>URL Image de fond</label><input type="text" .value="${this._config.background_image || ''}" @input="${e => this._up('background_image', e.target.value)}"></div>
        <div class="row">
          <div class="field"><label>Largeur (px)</label><input type="number" .value="${this._config.card_width || 500}" @input="${e => this._up('card_width', e.target.value)}"></div>
          <div class="field"><label>Hauteur (px)</label><input type="number" .value="${this._config.card_height || 400}" @input="${e => this._up('card_height', e.target.value)}"></div>
        </div>
      `;
    }

    _renderSensorsTab(entities) {
      const prefixes = ['s1','s2','s3','s4','s5','h1','h2','h3','h4','b1','b2','b3'];
      return html`
        <div class="section-title">CAPTEURS</div>
        ${prefixes.map(p => html`
          <details class="group-box">
            <summary>${this._config[p+'_entity'] ? '✔️' : '⚪'} ${this._config[p+'_name'] || p}</summary>
            <div class="group-content">
              <div class="field"><label>Nom</label><input type="text" .value="${this._config[p+'_name'] || ''}" @input="${e => this._up(p+'_name', e.target.value)}"></div>
              <div class="field"><label>Entité</label><input list="ents" .value="${this._config[p+'_entity'] || ''}" @input="${e => this._up(p+'_entity', e.target.value)}"></div>
              <div class="row">
                <div class="field"><label>X</label><input type="number" .value="${this._config[p+'_x'] || 0}" @input="${e => this._up(p+'_x', e.target.value)}"></div>
                <div class="field"><label>Y</label><input type="number" .value="${this._config[p+'_y'] || 0}" @input="${e => this._up(p+'_y', e.target.value)}"></div>
              </div>
            </div>
          </details>
        `)}
        <datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>
      `;
    }

    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    static get styles() { return css`
      .editor-container { background: #1c1c1c; color: white; padding: 10px; font-family: sans-serif; }
      .nav-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
      button { flex: 1; padding: 10px; border: none; border-radius: 4px; background: #333; color: white; cursor: pointer; }
      button.active { background: #00ffff; color: black; font-weight: bold; }
      .group-box { background: #2a2a2a; border: 1px solid #444; margin-bottom: 5px; border-radius: 4px; }
      summary { padding: 10px; cursor: pointer; color: #00ffff; }
      .group-content { padding: 10px; background: #111; }
      .field { margin-bottom: 10px; display: flex; flex-direction: column; }
      label { font-size: 0.8em; color: #aaa; margin-bottom: 4px; }
      input { background: #222; border: 1px solid #555; color: white; padding: 8px; border-radius: 4px; }
      .row { display: flex; gap: 10px; }
      .section-title { color: #ff00ff; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
    `; }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  // --- LA CARTE ---
  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    render() {
      if (!this.hass || !this.config) return html``;
      const conf = this.config;
      const w = conf.card_width || 500;
      const h = conf.card_height || 400;

      return html`
        <ha-card style="width:${w}px; height:${h}px; border:1px solid #00ffff; background: url('${conf.background_image}') no-repeat center center; background-size: 100% 100%; position:relative; overflow:hidden;">
          
          <svg viewBox="0 0 ${w} ${h}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1000; pointer-events:none;">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => {
              if (!conf['f'+i+'_en'] || !conf['f'+i+'_p']) return '';
              const val = conf['f'+i+'_s'] && this.hass.states[conf['f'+i+'_s']] ? parseFloat(this.hass.states[conf['f'+i+'_s']].state) : 500;
              const dur = val !== 0 ? Math.max(0.5, 10 - (Math.abs(val)/200)) : 0;
              return html`
                <g>
                  <path d="${conf['f'+i+'_p']}" fill="none" stroke="${conf['f'+i+'_c']}" stroke-width="4" stroke-linecap="round" opacity="0.3" />
                  <path d="${conf['f'+i+'_p']}" fill="none" stroke="${conf['f'+i+'_c']}" stroke-width="4" stroke-dasharray="8,20" stroke-linecap="round">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="${dur}s" repeatCount="indefinite" />
                  </path>
                </g>`;
            })}
          </svg>

          <div style="position:relative; z-index:10;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderSensor(p))}
          </div>
        </ha-card>
      `;
    }

    _renderSensor(p) {
      const c = this.config;
      if (!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const state = this.hass.states[c[p+'_entity']].state;
      return html`<div class="sensor" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px;">
        <div style="font-size:0.7em; opacity:0.8;">${c[p+'_name']}</div>
        <div>${state}</div>
      </div>`;
    }

    static get styles() { return css`
      ha-card { border-radius: 12px; font-family: sans-serif; }
      .sensor { position: absolute; color: white; font-weight: bold; text-shadow: 2px 2px 4px black; white-space: nowrap; pointer-events: none; }
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V8", preview: true });
})();
