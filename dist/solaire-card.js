(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; }

    render() {
      if (!this.hass || !this._config) return html``;
      const entities = Object.keys(this.hass.states).filter(e => e.startsWith('sensor.')).sort();
      return html`
        <div class="editor-container">
          <div class="nav-tabs">
            <button @click="${() => this._tab = 'flow'}">🌊 Flux</button>
            <button @click="${() => this._tab = 'solar'}">☀️ Sensors</button>
            <button @click="${() => this._tab = 'gen'}">⚙️ Gen</button>
          </div>
          ${this._tab === 'flow' ? html`
            <div class="section-title">FLUX SVG</div>
            ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
              <div style="border:1px solid #444; padding:5px; margin-bottom:5px;">
                <label>Flux ${i} activé : </label>
                <input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}"><br>
                <input type="text" placeholder="Path (M...)" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}">
                <input type="color" .value="${this._config['f'+i+'_c'] || '#ff0000'}" @input="${e => this._up('f'+i+'_c', e.target.value)}">
              </div>
            `)}
          ` : html`
            <div class="section-title">AUTRES RÉGLAGES</div>
            <p>Utilisez les anciens menus ou réglez l'image ici :</p>
            <input type="text" placeholder="URL Image" .value="${this._config.background_image || ''}" @input="${e => this._up('background_image', e.target.value)}">
            <div class="row">
                <input type="number" placeholder="Largeur" .value="${this._config.card_width || 500}" @input="${e => this._up('card_width', e.target.value)}">
                <input type="number" placeholder="Hauteur" .value="${this._config.card_height || 400}" @input="${e => this._up('card_height', e.target.value)}">
            </div>
          `}
        </div>
      `;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    setConfig(config) { this.config = config; }

    render() {
      if (!this.hass || !this.config) return html``;
      const conf = this.config;
      const w = conf.card_width || 500;
      const h = conf.card_height || 400;

      return html`
        <ha-card style="width:${w}px; height:${h}px; position:relative; overflow:hidden; background: url('${conf.background_image}') no-repeat center center; background-size: 100% 100%;">
          
          <svg style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1000; pointer-events:none;" viewBox="0 0 ${w} ${h}">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => {
              if (!conf['f'+i+'_en'] || !conf['f'+i+'_p']) return '';
              return html`
                <g>
                  <path d="${conf['f'+i+'_p']}" fill="none" stroke="${conf['f'+i+'_c'] || 'red'}" stroke-width="5" stroke-linecap="round" />
                  <path d="${conf['f'+i+'_p']}" fill="none" stroke="white" stroke-width="2" stroke-dasharray="5,15">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                  </path>
                </g>
              `;
            })}
          </svg>

          <div style="position:relative; z-index:10;">
             ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderData(p))}
          </div>
        </ha-card>
      `;
    }

    _renderData(p) {
        const e = this.config[p+'_entity'];
        if(!e || !this.hass.states[e]) return html``;
        return html`<div style="position:absolute; left:${this.config[p+'_x']}px; top:${this.config[p+'_y']}px; color:white; font-weight:bold; text-shadow:1px 1px 2px black;">
            ${this.hass.states[e].state}
        </div>`;
    }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire DEBUG SVG", preview: true });
})();
