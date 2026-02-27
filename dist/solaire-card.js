(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  const WEATHER_TRAD = {
    'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orage',
    'lightning-rainy': 'Orage Pluvieux', 'partlycloudy': 'Peu Nuageux', 'pouring': 'Averses', 'rainy': 'Pluie',
    'snowy': 'Neige', 'snowy-rainy': 'Pluie Neigeuse', 'sunny': 'Soleil', 'windy': 'Venté', 'windy-variant': 'Grand Vent', 'exceptional': 'Exceptionnel'
  };

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    setConfig(config) { this.config = config; this._offset = 0; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }

    _run() {
      this._offset = (this._offset || 0) + 0.5;
      if (this._offset > 100) this._offset = 0;
      this._draw();
      this._f = requestAnimationFrame(() => this._run());
    }
    firstUpdated() { this._run(); }
    disconnectedCallback() { super.disconnectedCallback(); cancelAnimationFrame(this._f); }

    _draw() {
      const cv = this.renderRoot.querySelector('#flowCanvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      const c = this.config;
      
      for (let i = 1; i <= 10; i++) {
        const pD = c['f'+i+'_p']; if (!pD) continue;
        const s = c['f'+i+'_s'], v = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 0;
        if (Math.abs(v) <= (c.flow_th || 2)) continue;

        const path = new Path2D(pD);
        const color = c['f'+i+'_c'] || '#ff0';
        const width = parseFloat(c['f'+i+'_w']) || 3;
        const speed = (c.flow_speed || 3) * (v < 0 ? -1 : 1);
        
        ctx.save();
        // 1. Ligne de fond (tirets optionnels)
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash([c.dash_size || 10, c.dash_gap || 20]);
        ctx.lineDashOffset = -this._offset * speed;
        ctx.globalAlpha = 0.3; // Ligne plus discrète pour laisser briller la bille
        ctx.stroke(path);

        // 2. Les Billes (Orbs)
        ctx.globalAlpha = 1.0;
        const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tempPath.setAttribute("d", pD);
        const pathLen = tempPath.getTotalLength();
        
        // On dessine 3 billes qui se suivent pour un effet de flux continu
        for (let b = 0; b < 3; b++) {
            const spacing = (pathLen / 3) * b;
            const progress = (this._offset * (c.flow_speed || 3) * 2);
            const currentPos = (progress + spacing) % pathLen;
            const finalPos = v < 0 ? pathLen - currentPos : currentPos; // Inversion du sens si négatif
            
            const pt = tempPath.getPointAtLength(finalPos);

            ctx.beginPath();
            ctx.fillStyle = "#fff";
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.arc(pt.x, pt.y, width * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
      }
    }

    render() {
      const c = this.config;
      if (!this.hass) return html``;
      return html`
        <ha-card style="width:${c.card_width||500}px; height:${c.card_height||400}px; position:relative; overflow:hidden; background:#000;">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||500}" height="${c.card_height||400}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          <div style="position:absolute; width:100%; height:100%; z-index:10;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>`;
    }

    _renderWeather() {
      const c = this.config; if(!c.w_ent || !this.hass.states[c.w_ent]) return '';
      const s = this.hass.states[c.w_ent];
      const temp = c.w_temp_ent && this.hass.states[c.w_temp_ent] ? this.hass.states[c.w_temp_ent].state : null;
      const hum = c.w_hum_ent && this.hass.states[c.w_hum_ent] ? this.hass.states[c.w_hum_ent].state : null;
      const stateFr = WEATHER_TRAD[s.state] || s.state;
      const glowColor = s.state === 'sunny' ? '#ffeb3b' : (s.state.includes('rain') ? '#00bfff' : '#ffffff');
      return html`
        <div class="item" style="left:${c.w_x||10}px; top:${c.w_y||10}px; border:none; background:none;">
          <ha-state-icon .hass=${this.hass} .stateObj=${s} 
            style="position:absolute; left:${c.w_img_x||0}px; top:${c.w_img_y||-50}px; --mdc-icon-size:${c.w_is||50}px; color:${glowColor}; filter: drop-shadow(0 0 10px ${glowColor});">
          </ha-state-icon>
          <div class="lumina-text" style="font-size:${c.w_fs||0.9}em; color:#fff; font-weight:300; letter-spacing:1px; white-space:nowrap; display:flex; align-items:center; gap:8px;">
            <span>${stateFr.toUpperCase()}</span>
            ${temp ? html`<span style="color:rgba(255,255,255,0.4)">|</span><span style="color:${c.w_temp_c||'#fff'}; font-weight:bold;">${temp}°C</span>` : ''}
            ${hum ? html`<span style="color:rgba(255,255,255,0.4)">|</span><span style="color:${c.w_hum_c||'#81d4fa'};">${hum}%</span>` : ''}
          </div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent'] || !this.hass.states[c[p+'_ent']]) return '';
      const s1 = this.hass.states[c[p+'_ent']];
      const val = parseFloat(s1.state);
      const bgColor = c[p+'_bg'] ? c[p+'_bg'] : (c[p+'_box'] ? 'rgba(0,0,0,0.5)' : 'transparent');
      const borderColor = c[p+'_bc'] ? c[p+'_bc'] : (c[p+'_box'] ? 'rgba(255,255,255,0.15)' : 'transparent');
      const glowEffect = c[p+'_glow'] ? `box-shadow: 0 0 ${c[p+'_glow_s']||10}px ${c[p+'_glow_c']||'#4caf50'};` : '';
      let batteryColor = val > 50 ? '#4caf50' : (val > 15 ? '#ff9800' : '#f44336');

      return html`
        <div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; width:${c[p+'_w_box']||80}px; height:${c[p+'_h_box']||90}px; transform:rotate(${c[p+'_rot']||0}deg); background:${bgColor}; border:1px solid ${borderColor}; ${glowEffect} border-radius:${c[p+'_br']||12}px;">
          ${p.startsWith('b') ? html`
            <div class="gauge-frame ${val <= 15 ? 'gauge-alert' : ''}" style="margin-right:10px; border-color:${batteryColor};">
              <div style="height:${val}%; background:${batteryColor}; width:100%; border-radius:2px;"></div>
            </div>` : ''}
          <div style="display:flex; flex-direction:column; align-items:center; flex-grow:1;">
             ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px; transform:rotate(${c[p+'_img_rot']||0}deg);">` : ''}
             <div class="label" style="color:${c[p+'_tc']||'#eee'}; font-size:${c[p+'_fs_l']||0.65}em;">${c[p+'_name']||''}</div>
             <div class="val" style="color:${c[p+'_vc']||'#fff'}; font-size:${c[p+'_fs_v']||1}em;">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
             ${c[p+'_ent2'] && this.hass.states[c[p+'_ent2']] ? html`<div style="color:${c[p+'_v2c']||'#0f0'}; font-size:${c[p+'_fs_v2']||0.65}em; font-weight:bold;">${this.hass.states[c[p+'_ent2']].state}${c[p+'_u2']||''}</div>` : ''}
          </div>
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; align-items:center; text-shadow: 1px 1px 3px #000; cursor:pointer; justify-content:center; box-sizing: border-box; transition: all 0.3s;}
      .lumina-text { text-shadow: 0 0 5px rgba(255,255,255,0.4); }
      .gauge-frame{width:15px; height:85%; background:transparent; border:1.5px solid transparent; border-radius:4px; padding:1.5px; box-sizing:border-box; display:flex; flex-direction:column-reverse;}
      .gauge-alert { animation: blink-border-red 1s infinite; }
      .label{font-weight:600; text-transform:uppercase; text-align:center;}
      .val{font-weight:900; text-align:center;}
      @keyframes blink-border-red { 0%, 100% { border-color: #f44336; } 50% { border-color: transparent; } }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    render() {
      const tabs = [{id:'solar',n:'Solar'},{id:'house',n:'House'},{id:'bat',n:'Bat'},{id:'weather',n:'Météo'},{id:'flow',n:'Flux'},{id:'gen',n:'Gen'}];
      return html`<div style="background:#1c1c1c; color:white; padding:10px; font-family:sans-serif;">
        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:8px; font-size:9px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; border-radius:4px; cursor:pointer; color:white;">${t.n.toUpperCase()}</button>`)}
        </div>
        ${this._renderTabContent()}
      </div>`;
    }
    _renderTabContent() {
      const c = this._config, t = this._tab, ents = Object.keys(this.hass.states).sort();
      const pfx = {solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3']}[t];
      if (pfx) return pfx.map(p => html`<details style="background:#2b2b2b; margin-bottom:5px; padding:10px; border-radius:5px;"><summary>📦 ${p.toUpperCase()} : ${c[p+'_name']||''}</summary>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
          Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
          X <input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}"> Y <input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}">
          Rot Bloc <input type="number" .value="${c[p+'_rot']||0}" @input="${e=>this._up(p+'_rot',e.target.value)}"> Rot Img <input type="number" .value="${c[p+'_img_rot']||0}" @input="${e=>this._up(p+'_img_rot',e.target.value)}">
          Fond <input type="text" .value="${c[p+'_bg']||''}" @input="${e=>this._up(p+'_bg',e.target.value)}"> Bordure <input type="text" .value="${c[p+'_bc']||''}" @input="${e=>this._up(p+'_bc',e.target.value)}">
          Halo <input type="checkbox" .checked="${c[p+'_glow']}" @change="${e=>this._up(p+'_glow',e.target.checked)}"> Taille Halo <input type="number" .value="${c[p+'_glow_s']||10}" @input="${e=>this._up(p+'_glow_s',e.target.value)}">
          C. Halo <input type="color" .value="${c[p+'_glow_c']||'#4caf50'}" @change="${e=>this._up(p+'_glow_c',e.target.value)}">
          Entité 1 <input list="ents" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}"> Entité 2 <input list="ents" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}">
          Img URL <input type="text" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}"> Size <input type="number" .value="${c[p+'_img_w']||40}" @input="${e=>this._up(p+'_img_w',e.target.value)}">
          Cadre <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}">
        </div></details><datalist id="ents">${ents.map(e => html`<option value="${e}">`)}</datalist>`);
      if (t === 'weather') return html`<div style="background:#2b2b2b; padding:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        Météo <input list="ents" style="grid-column:span 2" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}">
        Temp <input list="ents" style="grid-column:span 2" .value="${c.w_temp_ent||''}" @input="${e=>this._up('w_temp_ent',e.target.value)}">
        Hum <input list="ents" style="grid-column:span 2" .value="${c.w_hum_ent||''}" @input="${e=>this._up('w_hum_ent',e.target.value)}">
        X <input type="number" .value="${c.w_x}" @input="${e=>this._up('w_x',e.target.value)}"> Y <input type="number" .value="${c.w_y}" @input="${e=>this._up('w_y',e.target.value)}">
      </div>`;
      if (t === 'flow') return html`<div style="background:#2b2b2b; padding:10px;">${[1,2,3,4,5,6,7,8,9,10].map(i => html`<details style="margin-bottom:5px;"><summary>Flux ${i}</summary>
        Path <input type="text" style="width:100%" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}">
        Sensor <input list="ents" .value="${c['f'+i+'_s']||''}" @input="${e=>this._up('f'+i+'_s',e.target.value)}">
        Couleur <input type="color" .value="${c['f'+i+'_c']||'#ffff00'}" @change="${e=>this._up('f'+i+'_c',e.target.value)}">
        Largeur <input type="number" .value="${c['f'+i+'_w']||3}" @input="${e=>this._up('f'+i+'_w',e.target.value)}">
      </details>`)}</div>`;
      if (t === 'gen') return html`<div style="padding:10px; background:#2b2b2b; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        Background URL <input type="text" style="grid-column:span 2" .value="${c.background_image}" @input="${e=>this._up('background_image',e.target.value)}">
        W <input type="number" .value="${c.card_width||500}" @input="${e=>this._up('card_width',e.target.value)}"> H <input type="number" .value="${c.card_height||400}" @input="${e=>this._up('card_height',e.target.value)}">
        Speed <input type="number" .value="${c.flow_speed||3}" @input="${e=>this._up('flow_speed',e.target.value)}">
      </div>`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card Multi-Orb V65" });
})();
