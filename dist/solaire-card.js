(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  const WEATHER_MAP = {
    'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle', 
    'lightning': 'Orage', 'lightning-rainy': 'Orage Pluvieux', 'partlycloudy': 'Peu Nuageux', 
    'pouring': 'Averses', 'rainy': 'Pluie', 'snowy': 'Neige', 'sunny': 'Soleil', 'windy': 'Venté'
  };

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {}, _mouseX: {type: Number}, _mouseY: {type: Number} }; }

    setConfig(config) {
      if (!config.background_image) throw new Error("Image de fond manquante");
      this.config = {
        card_width: 1540, card_height: 580,
        flow_speed: 3, flow_th: 2,
        ...config
      };
      this._offset = 0;
    }

    static getConfigElement() { return document.createElement("solaire-card-editor"); }

    _run() {
      this._offset = (this._offset || 0) + 0.5;
      if (this._offset > 100) this._offset = 0;
      this._draw();
      this._f = requestAnimationFrame(() => this._run());
    }

    _handleMouseMove(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = (this.config.card_width) / rect.width;
      const scaleY = (this.config.card_height) / rect.height;
      this._mouseX = Math.round((e.clientX - rect.left) * scaleX);
      this._mouseY = Math.round((e.clientY - rect.top) * scaleY);
    }

    firstUpdated() { this._run(); }
    disconnectedCallback() { cancelAnimationFrame(this._f); }

    _draw() {
      const cv = this.renderRoot.querySelector('#flowCanvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      const c = this.config;

      for (let i = 1; i <= 10; i++) {
        const pD = c[`f${i}_p`]; if (!pD) continue;
        const s = c[`f${i}_s`], v = (this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 0;
        if (Math.abs(v) <= c.flow_th) continue;

        try {
          const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          tempPath.setAttribute("d", pD);
          const pathLen = tempPath.getTotalLength();
          const progress = (this._offset * c.flow_speed * 2) % pathLen;
          const finalPos = v < 0 ? pathLen - progress : progress;
          const pt = tempPath.getPointAtLength(finalPos);

          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = c[`f${i}_c`] || '#ff0';
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (c[`f${i}_w`] || 3), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } catch (e) {}
      }
    }

    render() {
      const c = this.config;
      return html`
        <ha-card style="width:${c.card_width}px; height:${c.card_height}px;" @mousemove="${this._handleMouseMove}">
          <img src="${c.background_image}" class="bg-img">
          <canvas id="flowCanvas" width="${c.card_width}" height="${c.card_height}"></canvas>
          
          <div class="coord-tool">X: ${this._mouseX || 0} | Y: ${this._mouseY || 0}</div>

          <div class="layer">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>`;
    }

    _renderWeather() {
      const c = this.config; if (!c.w_ent || !this.hass.states[c.w_ent]) return '';
      const s = this.hass.states[c.w_ent];
      const temp = c.w_temp_ent && this.hass.states[c.w_temp_ent] ? this.hass.states[c.w_temp_ent].state : '--';
      return html`
        <div class="weather-box" style="left:${c.w_x || 20}px; top:${c.w_y || 20}px;">
          <ha-state-icon .hass=${this.hass} .stateObj=${s}></ha-state-icon>
          <div class="w-info">
            <span class="w-state">${(WEATHER_MAP[s.state] || s.state).toUpperCase()}</span>
            <span class="w-temp">${temp}°C</span>
          </div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if (!c[p + '_ent'] || !this.hass.states[c[p + '_ent']]) return '';
      const s = this.hass.states[c[p + '_ent']];
      const val = parseFloat(s.state) || 0;
      const s2 = c[p + '_ent2'] && this.hass.states[c[p + '_ent2']] ? this.hass.states[c[p + '_ent2']].state : null;

      return html`
        <div class="item-box" style="left:${c[p + '_x']}px; top:${c[p + '_y']}px; width:${c[p + '_w_box'] || 100}px; transform:rotate(${c[p + '_rot'] || 0}deg);">
          ${p.startsWith('b') ? html`
            <div class="battery-gauge"><div style="height:${val}%; background:${val < 20 ? '#f44336' : '#4caf50'};"></div></div>
          ` : ''}
          <div class="content">
            ${c[p + '_img'] ? html`<img src="${c[p + '_img']}" width="${c[p + '_img_w'] || 40}">` : ''}
            <div class="label">${c[p + '_name'] || ''}</div>
            <div class="value">${val.toFixed(0)}${c[p + '_u'] || 'W'}</div>
            ${s2 ? html`<div class="value2">${s2}%</div>` : ''}
          </div>
        </div>`;
    }

    static get styles() { return css`
      ha-card { position: relative; overflow: hidden; background: #000; border: none; }
      .bg-img { position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
      #flowCanvas { position: absolute; z-index: 5; pointer-events: none; }
      .layer { position: absolute; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
      .coord-tool { position: absolute; bottom: 10px; right: 10px; z-index: 100; background: rgba(255,0,0,0.8); color: #fff; padding: 4px 8px; font-family: monospace; font-size: 12px; border-radius: 4px; pointer-events: none; }
      .item-box { position: absolute; display: flex; align-items: center; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px; backdrop-filter: blur(5px); pointer-events: auto; }
      .content { flex-grow: 1; text-align: center; }
      .label { font-size: 10px; color: #aaa; text-transform: uppercase; }
      .value { font-size: 14px; color: #fff; font-weight: bold; }
      .value2 { font-size: 11px; color: #4caf50; font-weight: bold; }
      .battery-gauge { width: 10px; height: 40px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-right: 8px; display: flex; flex-direction: column-reverse; }
      .weather-box { position: absolute; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.7); padding: 10px 15px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(5px); pointer-events: auto; }
      .w-info { display: flex; flex-direction: column; }
      .w-state { font-size: 12px; color: #fff; font-weight: bold; }
      .w-temp { font-size: 14px; color: #4caf50; }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = 'gen'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    render() {
      const tabs = [{id:'gen',n:'Général'},{id:'solar',n:'Solaire'},{id:'house',n:'Maison'},{id:'bat',n:'Batterie'},{id:'flow',n:'Flux'},{id:'w',n:'Météo'}];
      return html`<div style="background:#222; color:#fff; padding:15px; font-family: sans-serif;">
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:15px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:10px; background:${this._tab===t.id?'#4caf50':'#444'}; border:none; color:#fff; border-radius:4px; cursor:pointer;">${t.n}</button>`)}
        </div>
        ${this._renderContent()}
      </div>`;
    }
    _renderContent() {
      const c = this._config, t = this._tab;
      if (t === 'gen') return html`
        Image Fond: <input type="text" style="width:100%" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}">
        Largeur: <input type="number" .value="${c.card_width}" @input="${e=>this._up('card_width',e.target.value)}">
        Hauteur: <input type="number" .value="${c.card_height}" @input="${e=>this._up('card_height',e.target.value)}">
      `;
      if (t === 'flow') return html`
        ${[1,2,3,4,5].map(i => html`
          <details style="margin-bottom:10px;"><summary>Flux ${i}</summary>
            Path: <input type="text" style="width:100%" .value="${c[`f${i}_p`]||''}" @input="${e=>this._up(`f${i}_p`,e.target.value)}">
            Sensor: <input type="text" style="width:100%" .value="${c[`f${i}_s`]||''}" @input="${e=>this._up(`f${i}_s`,e.target.value)}">
            Couleur: <input type="color" .value="${c[`f${i}_c`]||'#ffff00'}" @change="${e=>this._up(`f${i}_c`,e.target.value)}">
          </details>
        `)}
      `;
      const pfx = {solar:['s1','s2'], house:['h1','h2'], bat:['b1']}[t];
      if (pfx) return pfx.map(p => html`
        <details style="margin-bottom:10px;"><summary>Objet ${p}</summary>
          X: <input type="number" .value="${c[p+'_x']||0}" @input="${e=>this._up(p+'_x',e.target.value)}"> 
          Y: <input type="number" .value="${c[p+'_y']||0}" @input="${e=>this._up(p+'_y',e.target.value)}">
          Nom: <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
          Entity: <input type="text" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
        </details>
      `);
      return html`Bientôt disponible...`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire V70 Intégrale" });
})();
