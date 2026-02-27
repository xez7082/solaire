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
        ctx.save();
        ctx.strokeStyle = c['f'+i+'_c'] || '#ff0'; ctx.lineWidth = c['f'+i+'_w'] || 3;
        ctx.setLineDash([c.dash_size || 10, c.dash_gap || 20]);
        ctx.lineDashOffset = this._offset * ((c.flow_speed||3)/10) * (v < 0 ? 1 : -1) * 10;
        ctx.stroke(new Path2D(pD)); ctx.restore();
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
            ${['s1','s2','s3','s4','s5', 'h1','h2', 'h3','h4','h5', 'b1','b2','b3'].map(p => this._renderItem(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>`;
    }

    _renderWeather() {
      const c = this.config; if(!c.w_ent || !this.hass.states[c.w_ent]) return '';
      const s = this.hass.states[c.w_ent];
      const stateFr = WEATHER_TRAD[s.state] || s.state;
      const glowColor = s.state === 'sunny' ? '#ffeb3b' : (s.state.includes('rain') ? '#00bfff' : '#ffffff');

      return html`
        <div class="item ${c.w_box?'box':''}" 
             style="left:${c.w_x||10}px; top:${c.w_y||10}px; border:none; background:none; display:block;">
          
          <ha-state-icon .hass=${this.hass} .stateObj=${s} 
            style="position:absolute; 
                   left:${c.w_img_x||0}px; 
                   top:${c.w_img_y||-50}px; 
                   --mdc-icon-size:${c.w_is||50}px; 
                   color:${glowColor}; 
                   filter: drop-shadow(0 0 10px ${glowColor});">
          </ha-state-icon>

          <div class="lumina-text" style="font-size:${c.w_fs||0.9}em; color:#fff; font-weight:300; letter-spacing:1px; white-space:nowrap;">
            ${stateFr.toUpperCase()}
          </div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent'] || !this.hass.states[c[p+'_ent']]) return '';
      const s1 = this.hass.states[c[p+'_ent']];
      const val = parseFloat(s1.state);
      const active = val > 5;
      const animType = c[p+'_anim'] || 'none';
      const borderClass = active ? (animType === 'spin' ? 'border-prod' : (animType === 'blink' ? 'border-blink' : 'border-fixe')) : 'border-noprod';

      return html`
        <div class="item ${c[p+'_box']?'box':''} ${c[p+'_box'] ? borderClass : ''}" 
             style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; width:${c[p+'_w_box']||80}px; height:${c[p+'_h_box']||90}px; transform:rotate(${c[p+'_rot']||0}deg);">
          ${active && animType === 'spin' && c[p+'_box'] ? html`<div class="dot-follower"></div>` : ''}
          <div style="display:flex; align-items:center; gap:5px;">
            ${p.startsWith('b') ? html`<div class="gauge-v"><div style="height:${val}%; background:${val>50?'#4caf50':(val>20?'#ff9800':'#f44336')};"></div></div>` : ''}
            ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px;">` : ''}
          </div>
          <div class="label" style="font-size:${c[p+'_fs_l']||0.65}em;">${c[p+'_name']||''}</div>
          <div class="val" style="font-size:${c[p+'_fs_v']||1}em;">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 1px 1px 3px #000; cursor:pointer; border-radius:12px;}
      .box{background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); backdrop-filter:blur(8px);}
      .lumina-text { text-shadow: 0 0 5px rgba(255,255,255,0.4); }
      .label{font-weight:600; text-transform:uppercase;}
      .val{font-weight:900;}
      .border-prod, .border-fixe { border: 2px solid #4caf50 !important; }
      .border-noprod { border: 2px solid #f44336 !important; }
      .border-blink { border: 2px solid #4caf50 !important; animation: blink 1.5s infinite; }
      .dot-follower {
        position: absolute; width: 8px; height: 8px; background: #fff; border-radius: 50%;
        offset-path: rect(0% 100% 100% 0% round 12px);
        animation: orbit 3s linear infinite;
      }
      @keyframes orbit { from { offset-distance: 0%; } to { offset-distance: 100%; } }
      @keyframes blink { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const tabs = [{id:'solar',n:'Solaire'},{id:'house',n:'Maison'},{id:'bat',n:'Bat'},{id:'weather',n:'Météo'},{id:'flow',n:'Flux'},{id:'gen',n:'Gen'}];
      return html`<div style="background:#1c1c1c; color:white; padding:10px; font-family:sans-serif;">
        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:8px; font-size:9px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; border-radius:4px; cursor:pointer; color:white;">${t.n.toUpperCase()}</button>`)}
        </div>
        ${this._renderTabContent()}
      </div>`;
    }

    _renderTabContent() {
      const c = this._config, t = this._tab;
      const ents = Object.keys(this.hass.states).sort();
      const pfx = {solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3']}[t];
      if (pfx) return pfx.map(p => html`
        <details style="background:#2b2b2b; margin-bottom:5px; padding:10px; border-radius:5px;">
          <summary>📦 ${p.toUpperCase()} : ${c[p+'_name']||''}</summary>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
            Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
            X <input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}"> Y <input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}">
            W <input type="number" .value="${c[p+'_w_box']||80}" @input="${e=>this._up(p+'_w_box',e.target.value)}"> H <input type="number" .value="${c[p+'_h_box']||90}" @input="${e=>this._up(p+'_h_box',e.target.value)}">
            Cadre <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}">
          </div>
        </details>`);
      if (t === 'weather') return html`<div style="background:#2b2b2b; padding:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <span style="grid-column:span 2">Entité</span>
        <input list="ha-entities" style="grid-column:span 2" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}">
        
        <span style="grid-column:span 2; color:#4caf50; font-weight:bold; margin-top:10px;">📍 Position du Texte</span>
        X <input type="number" .value="${c.w_x}" @input="${e=>this._up('w_x',e.target.value)}"> 
        Y <input type="number" .value="${c.w_y}" @input="${e=>this._up('w_y',e.target.value)}">
        
        <span style="grid-column:span 2; color:#4caf50; font-weight:bold; margin-top:10px;">☁️ Position de l'Icône (Décalage)</span>
        Icône X <input type="number" .value="${c.w_img_x||0}" @input="${e=>this._up('w_img_x',e.target.value)}"> 
        Icône Y <input type="number" .value="${c.w_img_y||-50}" @input="${e=>this._up('w_img_y',e.target.value)}">
        
        Taille Icône <input type="number" .value="${c.w_is||50}" @input="${e=>this._up('w_is',e.target.value)}">
        Taille Texte <input type="number" step="0.1" .value="${c.w_fs||0.9}" @input="${e=>this._up('w_fs',e.target.value)}">
        <datalist id="ha-entities">${ents.map(e => html`<option value="${e}">`)}</datalist>
      </div>`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card Liberty V51", description: "Météo placement libre icône et texte." });
})();
