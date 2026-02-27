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
    static get properties() { return { hass: {}, config: {}, _mouseX: {type: Number}, _mouseY: {type: Number} }; }
    
    setConfig(config) { 
      this.config = config; 
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
      const scaleX = (this.config.card_width || 1540) / rect.width;
      const scaleY = (this.config.card_height || 580) / rect.height;
      this._mouseX = Math.round((e.clientX - rect.left) * scaleX);
      this._mouseY = Math.round((e.clientY - rect.top) * scaleY);
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

        try {
            const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            tempPath.setAttribute("d", pD);
            const pathLen = tempPath.getTotalLength();
            const progress = (this._offset * (c.flow_speed || 3) * 2) % pathLen;
            const finalPos = v < 0 ? pathLen - progress : progress;
            const pt = tempPath.getPointAtLength(finalPos);

            ctx.save();
            ctx.beginPath();
            ctx.shadowBlur = 15;
            ctx.shadowColor = c['f'+i+'_c'] || '#ff0';
            ctx.fillStyle = "#fff";
            ctx.arc(pt.x, pt.y, (c['f'+i+'_w'] || 3) * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } catch(e) { /* Path invalide ignoré */ }
      }
    }

    render() {
      const c = this.config;
      if (!this.hass) return html``;
      return html`
        <ha-card style="width:${c.card_width||1540}px; height:${c.card_height||580}px; position:relative; overflow:hidden; background:#000;" @mousemove="${this._handleMouseMove}">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||1540}" height="${c.card_height||580}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          
          <div class="coord-tool">X: ${this._mouseX || 0} | Y: ${this._mouseY || 0}</div>

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
      return html`
        <div class="item weather-box" style="left:${c.w_x||10}px; top:${c.w_y||10}px;">
          <ha-state-icon .hass=${this.hass} .stateObj=${s} style="--mdc-icon-size:${c.w_is||40}px; color:#fff; filter:drop-shadow(0 0 5px #fff);"></ha-state-icon>
          <div style="font-size:${c.w_fs||0.9}em; color:#fff; display:flex; gap:8px; align-items:center; text-shadow: 1px 1px 3px #000;">
            <span>${stateFr.toUpperCase()}</span>
            ${temp ? html`<span style="opacity:0.4;">|</span><span style="font-weight:bold;">${temp}°C</span>` : ''}
            ${hum ? html`<span style="opacity:0.4;">|</span><span style="color:#81d4fa;">${hum}%</span>` : ''}
          </div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent'] || !this.hass.states[c[p+'_ent']]) return '';
      const s1 = this.hass.states[c[p+'_ent']];
      const val = parseFloat(s1.state);
      const bgColor = c[p+'_bg'] || 'rgba(0,0,0,0.6)';
      const borderColor = c[p+'_bc'] || 'rgba(255,255,255,0.15)';

      return html`
        <div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; width:${c[p+'_w_box']||90}px; height:${c[p+'_h_box']||100}px; transform:rotate(${c[p+'_rot']||0}deg); background:${bgColor}; border:1px solid ${borderColor}; border-radius:${c[p+'_br']||12}px; backdrop-filter:blur(3px);">
          ${p.startsWith('b') ? html`
            <div class="gauge-frame" style="margin-right:8px; border-color:${val > 20 ? '#4caf50' : '#f44336'};">
              <div style="height:${val}%; background:${val > 20 ? '#4caf50' : '#f44336'}; width:100%;"></div>
            </div>` : ''}
          <div style="text-align:center; flex-grow:1;">
             ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px; transform:rotate(${c[p+'_img_rot']||0}deg); margin-bottom:4px;">` : ''}
             <div style="font-size:${c[p+'_fs_l']||0.65}em; color:#bbb; text-transform:uppercase; font-weight:bold;">${c[p+'_name']||''}</div>
             <div style="font-size:${c[p+'_fs_v']||1}em; color:#fff; font-weight:900;">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
             ${c[p+'_ent2'] && this.hass.states[c[p+'_ent2']] ? html`<div style="font-size:0.7em; color:#4caf50;">${this.hass.states[c[p+'_ent2']].state}%</div>` : ''}
          </div>
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; align-items:center; justify-content:center; box-sizing:border-box; transition:0.3s; padding:8px; z-index:20;}
      .weather-box{background:rgba(0,0,0,0.7); padding:8px 15px; border-radius:25px; border:1px solid rgba(255,255,255,0.2); gap:12px; backdrop-filter:blur(5px);}
      .coord-tool{position:absolute; bottom:15px; right:15px; z-index:100; background:rgba(255,0,0,0.85); color:white; padding:4px 10px; font-family:monospace; font-size:13px; border-radius:5px; pointer-events:none; font-weight:bold; box-shadow: 0 0 10px rgba(0,0,0,0.5);}
      .gauge-frame{width:14px; height:80%; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); display:flex; flex-direction:column-reverse; padding:1px; border-radius:3px;}
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    
    render() {
      const tabs = [{id:'solar',n:'Solaire'},{id:'house',n:'Maison'},{id:'bat',n:'Batterie'},{id:'weather',n:'Météo'},{id:'flow',n:'Flux'},{id:'gen',n:'Général'}];
      const ents = Object.keys(this.hass.states).sort();
      return html`<div style="background:#1c1c1c; color:white; padding:15px; font-family:sans-serif;">
        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:15px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:10px; font-size:10px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; border-radius:4px; cursor:pointer; color:white; font-weight:bold;">${t.n.toUpperCase()}</button>`)}
        </div>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
            ${this._renderTabContent(ents)}
        </div>
      </div>`;
    }

    _renderTabContent(ents) {
      const c = this._config, t = this._tab;
      const pfx = {solar:['s1','s2','s3'], house:['h1','h2','h3'], bat:['b1','b2']}[t];
      
      if (pfx) return pfx.map(p => html`<details style="background:#2b2b2b; margin-bottom:8px; padding:12px; border-radius:8px;"><summary style="cursor:pointer; font-weight:bold;">📦 OBJET ${p.toUpperCase()}</summary>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px;">
          Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
          X <input type="number" .value="${c[p+'_x']||0}" @input="${e=>this._up(p+'_x',e.target.value)}"> 
          Y <input type="number" .value="${c[p+'_y']||0}" @input="${e=>this._up(p+'_y',e.target.value)}">
          Entité Princ. <input list="ents" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
          Entité Second. <input list="ents" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}">
          Image URL <input type="text" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}">
          Largeur Boite <input type="number" .value="${c[p+'_w_box']||90}" @input="${e=>this._up(p+'_w_box',e.target.value)}">
          Rotation <input type="number" .value="${c[p+'_rot']||0}" @input="${e=>this._up(p+'_rot',e.target.value)}">
        </div></details><datalist id="ents">${ents.map(e => html`<option value="${e}">`)}</datalist>`);

      if (t === 'weather') return html`<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#2b2b2b; padding:15px; border-radius:8px;">
        <span style="grid-column: span 2;">Entité Météo</span>
        <input list="ents" style="grid-column:span 2" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}">
        Température <input list="ents" .value="${c.w_temp_ent||''}" @input="${e=>this._up('w_temp_ent',e.target.value)}">
        Humidité <input list="ents" .value="${c.w_hum_ent||''}" @input="${e=>this._up('w_hum_ent',e.target.value)}">
        Position X <input type="number" .value="${c.w_x||10}" @input="${e=>this._up('w_x',e.target.value)}"> 
        Position Y <input type="number" .value="${c.w_y||10}" @input="${e=>this._up('w_y',e.target.value)}">
      </div>`;

      if (t === 'flow') return html`<div>${[1,2,3,4,5,6].map(i => html`<details style="margin-bottom:8px; background:#2b2b2b; padding:12px; border-radius:8px;"><summary style="cursor:pointer;">⚡ FLUX ${i}</summary>
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
            Path (SVG) <input type="text" style="width:100%" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}">
            Capteur (W) <input list="ents" .value="${c['f'+i+'_s']||''}" @input="${e=>this._up('f'+i+'_s',e.target.value)}">
            Couleur <input type="color" .value="${c['f'+i+'_c']||'#ffff00'}" @change="${e=>this._up('f'+i+'_c',e.target.value)}">
            Largeur Bille <input type="number" .value="${c['f'+i+'_w']||3}" @input="${e=>this._up('f'+i+'_w',e.target.value)}">
        </div>
      </details>`)}</div>`;

      if (t === 'gen') return html`<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#2b2b2b; padding:15px; border-radius:8px;">
        <span style="grid-column: span 2;">URL Image Arrière-plan</span>
        <input type="text" style="grid-column:span 2" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}">
        Largeur Carte <input type="number" .value="${c.card_width||1540}" @input="${e=>this._up('card_width',e.target.value)}">
        Hauteur Carte <input type="number" .value="${c.card_height||580}" @input="${e=>this._up('card_height',e.target.value)}">
        Vitesse Flux <input type="number" .value="${c.flow_speed||3}" @input="${e=>this._up('flow_speed',e.target.value)}">
        Seuil Mini (W) <input type="number" .value="${c.flow_th||2}" @input="${e=>this._up('flow_th',e.target.value)}">
      </div>`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card FINAL V69" });
})();
