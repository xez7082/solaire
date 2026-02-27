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
        const s = c[`f${i}_s`], stateObj = this.hass.states[s];
        if (!stateObj) continue;
        const v = parseFloat(stateObj.state);
        if (Math.abs(v) <= (c.flow_th || 2)) continue;

        try {
          const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          tempPath.setAttribute("d", pD);
          const pathLen = tempPath.getTotalLength();
          const progress = (this._offset * (c.flow_speed || 3) * 2) % pathLen;
          const finalPos = v < 0 ? pathLen - progress : progress;
          const pt = tempPath.getPointAtLength(finalPos);

          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = c[`f${i}_c`] || '#ff0';
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (parseFloat(c[`f${i}_w`]) || 3), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } catch (e) {}
      }
    }

    render() {
      const c = this.config;
      if (!this.hass) return html``;
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
      const hum = c.w_hum_ent && this.hass.states[c.w_hum_ent] ? this.hass.states[c.w_hum_ent].state : null;
      return html`
        <div class="weather-box" style="left:${c.w_x || 20}px; top:${c.w_y || 20}px; font-size:${c.w_fs || 0.9}em;">
          <ha-state-icon .hass=${this.hass} .stateObj=${s} style="--mdc-icon-size:${c.w_is || 32}px;"></ha-state-icon>
          <div class="w-info">
            <span class="w-state">${(WEATHER_MAP[s.state] || s.state).toUpperCase()}</span>
            <span class="w-temp">${temp}°C ${hum ? html`| ${hum}%` : ''}</span>
          </div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if (!c[p + '_ent'] || !this.hass.states[c[p + '_ent']]) return '';
      const s = this.hass.states[c[p + '_ent']];
      const val = parseFloat(s.state) || 0;
      const s2 = c[p + '_ent2'] && this.hass.states[c[p + '_ent2']] ? this.hass.states[c[p + '_ent2']].state : null;

      return html`
        <div class="item-box" style="
          left:${c[p + '_x'] || 0}px; 
          top:${c[p + '_y'] || 0}px; 
          width:${c[p + '_w_box'] || 100}px; 
          height:${c[p + '_h_box'] || 'auto'}px;
          background:${c[p + '_bg'] || 'rgba(0,0,0,0.65)'};
          border:1px solid ${c[p + '_bc'] || 'rgba(255,255,255,0.15)'};
          border-radius:${c[p + '_br'] || 12}px;
          transform:rotate(${c[p + '_rot'] || 0}deg);
        ">
          ${p.startsWith('b') ? html`
            <div class="battery-gauge"><div style="height:${s2 || 0}%; background:${(s2 || 0) < 20 ? '#f44336' : '#4caf50'};"></div></div>
          ` : ''}
          <div class="content">
            ${c[p + '_img'] ? html`<img src="${c[p + '_img']}" width="${c[p + '_img_w'] || 40}" style="transform:rotate(${c[p + '_img_rot'] || 0}deg);">` : ''}
            <div class="label" style="color:${c[p+'_tc'] || '#aaa'}; font-size:${c[p+'_fs_l'] || 11}px;">${c[p + '_name'] || ''}</div>
            <div class="value" style="color:${c[p+'_vc'] || '#fff'}; font-size:${c[p+'_fs_v'] || 16}px;">${val.toFixed(0)}${c[p + '_u'] || 'W'}</div>
            ${s2 ? html`<div class="value2" style="color:${c[p+'_v2c'] || '#4caf50'};">${s2}%</div>` : ''}
          </div>
        </div>`;
    }

    static get styles() { return css`
      ha-card { position: relative; overflow: hidden; background: #000; border: none; }
      .bg-img { position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
      #flowCanvas { position: absolute; z-index: 5; pointer-events: none; }
      .layer { position: absolute; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
      .coord-tool { position: absolute; bottom: 10px; right: 10px; z-index: 100; background: rgba(255,0,0,0.8); color: #fff; padding: 4px 8px; font-family: monospace; font-size: 12px; border-radius: 4px; pointer-events: none; }
      .item-box { position: absolute; display: flex; align-items: center; padding: 10px; backdrop-filter: blur(8px); pointer-events: auto; }
      .content { flex-grow: 1; text-align: center; }
      .label { font-weight: bold; text-transform: uppercase; }
      .value { font-weight: 900; }
      .battery-gauge { width: 12px; height: 45px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-right: 10px; display: flex; flex-direction: column-reverse; border-radius: 2px; overflow: hidden; }
      .weather-box { position: absolute; display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.25); backdrop-filter: blur(10px); pointer-events: auto; }
      .w-info { display: flex; flex-direction: column; }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = 'gen'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    
    render() {
      const tabs = [{id:'gen',n:'Global'},{id:'solar',n:'Solar'},{id:'house',n:'Maison'},{id:'bat',n:'Bat'},{id:'flow',n:'Flux'},{id:'w',n:'Météo'}];
      const ents = Object.keys(this.hass.states).sort();
      return html`<div style="background:#1a1a1a; color:#eee; padding:20px;">
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:20px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:10px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:10px;">${t.n.toUpperCase()}</button>`)}
        </div>
        <div style="max-height: 500px; overflow-y: auto;">
          ${this._renderContent(ents)}
        </div>
      </div>`;
    }

    _renderContent(ents) {
      const c = this._config, t = this._tab;
      if (t === 'gen') return html`<div style="display:grid; gap:10px;">
          Image Fond URL: <input type="text" style="width:100%" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}">
          Largeur Carte: <input type="number" .value="${c.card_width}" @input="${e=>this._up('card_width',e.target.value)}">
          Hauteur Carte: <input type="number" .value="${c.card_height}" @input="${e=>this._up('card_height',e.target.value)}">
          Vitesse Flux: <input type="number" .value="${c.flow_speed}" @input="${e=>this._up('flow_speed',e.target.value)}">
        </div>`;
      
      const pfx = {solar:['s1','s2','s3'], house:['h1','h2','h3'], bat:['b1','b2']}[t];
      if (pfx) return pfx.map(p => html`<details style="margin-bottom:10px; background:#252525; padding:10px; border-radius:8px;"><summary>Objet ${p.toUpperCase()} : ${c[p+'_name']||'Sans nom'}</summary>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
            Nom: <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
            Entity: <input list="e" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
            X: <input type="number" .value="${c[p+'_x']||0}" @input="${e=>this._up(p+'_x',e.target.value)}">
            Y: <input type="number" .value="${c[p+'_y']||0}" @input="${e=>this._up(p+'_y',e.target.value)}">
            W Boite: <input type="number" .value="${c[p+'_w_box']||100}" @input="${e=>this._up(p+'_w_box',e.target.value)}">
            H Boite: <input type="number" .value="${c[p+'_h_box']||''}" @input="${e=>this._up(p+'_h_box',e.target.value)}">
            FS Label: <input type="number" .value="${c[p+'_fs_l']||11}" @input="${e=>this._up(p+'_fs_l',e.target.value)}">
            FS Val: <input type="number" .value="${c[p+'_fs_v']||16}" @input="${e=>this._up(p+'_fs_v',e.target.value)}">
            Col Label: <input type="color" .value="${c[p+'_tc']||'#aaaaaa'}" @change="${e=>this._up(p+'_tc',e.target.value)}">
            Col Val: <input type="color" .value="${c[p+'_vc']||'#ffffff'}" @change="${e=>this._up(p+'_vc',e.target.value)}">
            Fond: <input type="text" .value="${c[p+'_bg']||''}" @input="${e=>this._up(p+'_bg',e.target.value)}">
            Unité: <input type="text" .value="${c[p+'_u']||'W'}" @input="${e=>this._up(p+'_u',e.target.value)}">
            ${t==='bat'?html`Entity %: <input list="e" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}">`:''}
          </div></details><datalist id="e">${ents.map(e => html`<option value="${e}">`)}</datalist>`);
      
      if (t === 'flow') return html`${[1,2,3,4,5,6,7,8,9,10].map(i => html`<details style="margin-bottom:8px; background:#252525; padding:10px; border-radius:8px;"><summary>Flux ${i}</summary>
            Path: <input type="text" style="width:100%" .value="${c[`f${i}_p`]||''}" @input="${e=>this._up(`f${i}_p`,e.target.value)}">
            Sensor: <input list="e" .value="${c[`f${i}_s`]||''}" @input="${e=>this._up(`f${i}_s`,e.target.value)}">
            Couleur: <input type="color" .value="${c[`f${i}_c`]||'#ffff00'}" @change="${e=>this._up(`f${i}_c`,e.target.value)}">
            Largeur: <input type="number" .value="${c[`f${i}_w`]||3}" @input="${e=>this._up(`f${i}_w`,e.target.value)}">
          </details>`)}`;

      if (t === 'w') return html`<div style="display:grid; gap:10px; background:#252525; padding:15px; border-radius:8px;">
          Entité: <input list="e" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}">
          X/Y: <div style="display:flex;gap:5px;"><input type="number" .value="${c.w_x||20}" @input="${e=>this._up('w_x',e.target.value)}"><input type="number" .value="${c.w_y||20}" @input="${e=>this._up('w_y',e.target.value)}"></div>
          FS: <input type="number" .value="${c.w_fs||0.9}" @input="${e=>this._up('w_fs',e.target.value)}" step="0.1">
        </div>`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire V80 Ultra Config" });
})();
