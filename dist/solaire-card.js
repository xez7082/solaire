(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {}, _mX: {type: Number}, _mY: {type: Number} }; }
    setConfig(config) { this.config = config; this._offset = 0; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }

    firstUpdated() { this._run(); }
    _run() {
      // Base de temps pour l'animation
      this._offset = (this._offset || 0) + 0.5;
      if (this._offset > 100) this._offset = 0;
      this._draw();
      this._f = requestAnimationFrame(() => this._run());
    }
    disconnectedCallback() { super.disconnectedCallback(); cancelAnimationFrame(this._f); }

    _draw() {
      const cv = this.renderRoot.querySelector('#flowCanvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      const c = this.config;

      if (c.show_grid) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= cv.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); ctx.stroke(); }
        for (let y = 0; y <= cv.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke(); }
        ctx.restore();
      }

      for (let i = 1; i <= 15; i++) {
        const pD = c['f'+i+'_p'];
        if (!c['f'+i+'_en'] || !pD) continue;
        const s = c['f'+i+'_s'], v = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 0;
        if (v === 0 && s) continue;
        
        ctx.save();
        ctx.strokeStyle = c['f'+i+'_c'] || '#ff0';
        ctx.lineWidth = c['f'+i+'_w'] || 3;
        ctx.lineCap = "round";
        ctx.setLineDash([c.dash_size || 10, c.dash_gap || 20]);
        
        // NOUVELLE FORMULE DE VITESSE ULTRA STABLE
        const speedFactor = (c.flow_speed || 6) / 20; 
        const powerImpact = Math.min(Math.abs(v) / 1000, 2); // Limite l'impact des grosses puissances
        ctx.lineDashOffset = this._offset * speedFactor * (1 + powerImpact) * (v < 0 ? 1 : -1) * 10;
        
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 4;
        ctx.stroke(new Path2D(pD));
        ctx.restore();
      }
    }

    _handleMouseMove(e) {
      if (!this.config.show_grid) return;
      const rect = e.currentTarget.getBoundingClientRect();
      this._mX = Math.round(e.clientX - rect.left);
      this._mY = Math.round(e.clientY - rect.top);
    }

    _fmt(val, unit) {
      let v = parseFloat(val);
      if (isNaN(v)) return val;
      if (Math.abs(v) >= 1000 && (unit === 'W' || unit === 'w')) return (v / 1000).toFixed(2) + ' kW';
      return v.toFixed(0) + ' ' + unit;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      return html`
        <ha-card @mousemove="${this._handleMouseMove}" style="width:${c.card_width||500}px; height:${c.card_height||400}px; position:relative; overflow:hidden; background:#000; border:2px solid ${c.border_color||'#333'}; border-radius:15px; cursor:${c.show_grid?'crosshair':'default'};">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover; object-position: center center; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||500}" height="${c.card_height||400}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          ${c.show_grid ? html`<div style="position:absolute; top:5px; left:5px; background:rgba(255,0,0,0.8); color:white; padding:2px 8px; border-radius:4px; z-index:20; font-size:10px; font-weight:bold; font-family:monospace;">X: ${this._mX} | Y: ${this._mY}</div>` : ''}
          <div style="position:absolute; width:100%; height:100%; z-index:10; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3','g1','g2'].map(p => this._renderItem(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent']) return '';
      const s = this.hass.states[c[p+'_ent']], eDay = c[p+'_ent_day'] ? this.hass.states[c[p+'_ent_day']] : null;
      if(!s) return '';
      return html`
        <div class="item ${c[p+'_box']?'box-style':''}" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; transform:rotate(${c[p+'_rot']||0}deg);">
          <div class="label" style="color:${c[p+'_tc']||'#aaa'}">${c[p+'_name']||''}</div>
          <div class="val" style="color:${c[p+'_vc']||'#fff'}">${this._fmt(s.state, p.startsWith('b') ? '%' : (s.attributes.unit_of_measurement||'W'))}</div>
          ${eDay ? html`<div class="sub">⚡ ${eDay.state} kWh</div>` : ''}
        </div>`;
    }

    _renderWeather() {
      const c = this.config; if (!c.weather_en) return '';
      const w = this.hass.states[c.w_ent]; if(!w) return '';
      const stateArr = {
        'sunny': 'Ensoleillé', 'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard',
        'hail': 'Grêle', 'lightning': 'Orageux', 'lightning-rainy': 'Orage/Pluie', 'partlycloudy': 'Partiellement Nuageux',
        'pouring': 'Forte Pluie', 'rainy': 'Pluie', 'snowy': 'Neige', 'snowy-rainy': 'Neige/Pluie', 'windy': 'Venteux'
      };
      const map = {'sunny':'sunny','rainy':'rainy','cloudy':'cloudy','partlycloudy':'partly-cloudy','pouring':'pouring','lightning':'lightning','clear-night':'night'};
      return html`
        <div class="item ${c.w_box?'box-style':''}" style="left:${c.w_x}px; top:${c.w_y}px; transform:rotate(${c.w_rot||0}deg);">
          <div style="display:flex; align-items:center; gap:8px;">
             <ha-icon icon="mdi:weather-${map[w.state.toLowerCase().replace(/-/g,'')]||'cloud'}" style="--mdc-icon-size:32px; color:${c.w_tc||'#0cf'};"></ha-icon>
             <span style="font-size:1.2em; font-weight:bold; color:${c.w_vc||'#fff'};">${w.attributes.temperature}°C</span>
          </div>
          <div style="font-size:0.8em; font-weight:bold; color:${c.w_tc||'#0cf'}; text-align:center;">${stateArr[w.state.toLowerCase()] || w.state}</div>
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 1px 1px 3px #000; white-space:nowrap; font-family: sans-serif;}
      .box-style{background: rgba(0,0,0,0.5); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(3px);}
      .label{font-size:0.75em; font-weight:bold; text-transform:uppercase;}
      .val{font-weight:900; font-size:1.1em;}
      .sub{font-size:0.65em; color: #0f0; font-weight: bold;}
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; if(!this._tab) this._tab = 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    
    render() {
      const ents = Object.keys(this.hass.states).sort();
      const tabs = [
        {id:'solar', label:'☀️ Solar', c:'#ffeb3b'}, {id:'house', label:'🏠 House', c:'#2196f3'},
        {id:'bat', label:'🔋 Bat', c:'#4caf50'}, {id:'flow', label:'〰️ Flow', c:'#e91e63'},
        {id:'weather', label:'☁️ Weather', c:'#00bcd4'}, {id:'gen', label:'⚙️ Gen', c:'#9c27b0'}
      ];
      return html`
        <div style="background:#121212; color:#fff; padding:15px; font-family: sans-serif; border-radius:10px;">
          <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:15px;">
            ${tabs.map(t => html`<button @click="${() => this._tab=t.id}" style="flex:1 1 30%; padding:10px; background:${this._tab===t.id?t.c:'#333'}; color:${this._tab===t.id?'#000':'#fff'}; border:none; cursor:pointer; font-size:11px; font-weight:bold; border-radius:5px;">${t.label}</button>`)}
          </div>
          <div style="background:#1e1e1e; padding:15px; border-left: 4px solid ${tabs.find(t=>t.id===this._tab).c}; border-radius:5px;">
            ${this._renderTab(ents)}
          </div>
          <datalist id="el">${ents.map(e => html`<option value="${e}">`)}</datalist>
        </div>`;
    }

    _renderTab(ents) {
      const c = this._config, t = this._tab;
      if(t === 'flow') return html`
        <div style="background:#252525; padding:10px; border-radius:5px; margin-bottom:10px;">
          <b>🛠️ RÉGLAGE VITESSE (1 = LENT)</b><br>
          <input type="range" min="0.5" max="10" step="0.5" .value="${c.flow_speed||3}" @change="${e=>this._up('flow_speed',e.target.value)}"> 
          <br>Point: <input type="number" style="width:50px" .value="${c.dash_size||10}" @input="${e=>this._up('dash_size',e.target.value)}"> 
          Espace: <input type="number" style="width:50px" .value="${c.dash_gap||20}" @input="${e=>this._up('dash_gap',e.target.value)}">
        </div>
        ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => html`<details style="background:#252525; margin-top:5px; border:1px solid #444;"><summary style="padding:8px; cursor:pointer; color:#e91e63">Flux #${i}</summary><div style="padding:10px; display:grid; gap:8px;">Activer <input type="checkbox" .checked="${c['f'+i+'_en']}" @change="${e=>this._up('f'+i+'_en',e.target.checked)}">Couleur <input type="color" .value="${c['f'+i+'_c']||'#ff0'}" @input="${e=>this._up('f'+i+'_c',e.target.value)}">Tracé <input type="text" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}">Watts <input list="el" .value="${c['f'+i+'_s']||''}" @input="${e=>this._up('f'+i+'_s',e.target.value)}" style="width:100%; background:#333; color:#fff; border:1px solid #555; padding:5px;">Épaisseur <input type="number" .value="${c['f'+i+'_w']||3}" @input="${e=>this._up('f'+i+'_w',e.target.value)}"></div></details>`)}`;
      if(t === 'weather') return html`Activer <input type="checkbox" .checked="${c.weather_en}" @change="${e=>this._up('weather_en',e.target.checked)}"> Cadre <input type="checkbox" .checked="${c.w_box}" @change="${e=>this._up('w_box',e.target.checked)}"><br><br>Entité Météo <input list="el" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}" style="width:100%; background:#333; color:#fff; padding:5px;"><br>X <input type="number" .value="${c.w_x}" @input="${e=>this._up('w_x',e.target.value)}"> Y <input type="number" .value="${c.w_y}" @input="${e=>this._up('w_y',e.target.value)}"> Rot <input type="number" .value="${c.w_rot}" @input="${e=>this._up('w_rot',e.target.value)}"><br>Couleur Titre/Icone <input type="color" .value="${c.w_tc||'#0cf'}" @input="${e=>this._up('w_tc',e.target.value)}"> Valeur Temp <input type="color" .value="${c.w_vc||'#fff'}" @input="${e=>this._up('w_vc',e.target.value)}">`;
      if(t === 'gen') return html`Dimensions <div style="display:flex; gap:5px;"><input type="number" .value="${c.card_width||500}" @input="${e=>this._up('card_width',e.target.value)}" style="width:50%"><input type="number" .value="${c.card_height||400}" @input="${e=>this._up('card_height',e.target.value)}" style="width:50%"></div><br>Image Fond <input type="text" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}" style="width:100%; background:#333; color:#fff; padding:5px;"><br>Bordure <input type="color" .value="${c.border_color||'#333'}" @input="${e=>this._up('border_color',e.target.value)}"><br><b>Afficher Grille Repère</b> <input type="checkbox" .checked="${c.show_grid}" @change="${e=>this._up('show_grid',e.target.checked)}">`;
      const g = {solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3']}[t];
      return (g||[]).map(p => html`<details style="background:#252525; margin-top:5px; border:1px solid #444;"><summary style="padding:8px; cursor:pointer;">${p.toUpperCase()} ${c[p+'_ent']?'✅':''}</summary><div style="padding:10px; display:grid; gap:8px;">Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}"> Watts <input list="el" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}" style="width:100%; background:#333; color:#fff; padding:5px;">kWh Jour <input list="el" .value="${c[p+'_ent_day']||''}" @input="${e=>this._up(p+'_ent_day',e.target.value)}" style="width:100%; background:#333; color:#fff; padding:5px;">X <input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}"> Y <input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}"> Rot <input type="number" .value="${c[p+'_rot']}" @input="${e=>this._up(p+'_rot',e.target.value)}"><br>Cadre <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}"> Titre <input type="color" .value="${c[p+'_tc']||'#aaa'}" @input="${e=>this._up(p+'_tc',e.target.value)}"> Valeur <input type="color" .value="${c[p+'_vc']||'#fff'}" @input="${e=>this._up(p+'_vc',e.target.value)}"></div></details>`);
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V35 FIXED", preview: true });
})();
