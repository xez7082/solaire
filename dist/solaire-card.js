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
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
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
        <div class="item ${c.w_box?'box':''}" style="left:${c.w_x||10}px; top:${c.w_y||10}px; border:none; background:none; display:block;">
          <ha-state-icon .hass=${this.hass} .stateObj=${s} 
            style="position:absolute; left:${c.w_img_x||0}px; top:${c.w_img_y||-50}px; --mdc-icon-size:${c.w_is||50}px; color:${glowColor}; filter: drop-shadow(0 0 10px ${glowColor});">
          </ha-state-icon>
          <div class="lumina-text" style="font-size:${c.w_fs||0.9}em; color:#fff; font-weight:300; letter-spacing:1px; white-space:nowrap;">
            ${stateFr.toUpperCase()}
          </div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent'] || !this.hass.states[c[p+'_ent']]) return '';
      const s1 = this.hass.states[c[p+'_ent']];
      const s2 = c[p+'_ent2'] ? this.hass.states[c[p+'_ent2']] : null;
      const val = parseFloat(s1.state);
      const active = val > (c[p+'_th'] || 5);
      const animType = c[p+'_anim'] || 'none';
      const borderClass = active ? (animType === 'spin' ? 'border-prod' : (animType === 'blink' ? 'border-blink' : 'border-fixe')) : 'border-noprod';

      return html`
        <div class="item ${c[p+'_box']?'box':''} ${c[p+'_box'] ? borderClass : ''}" 
             style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; width:${c[p+'_w_box']||80}px; height:${c[p+'_h_box']||90}px; transform:rotate(${c[p+'_rot']||0}deg);"
             @click="${() => { const e = new CustomEvent('hass-action', { detail: { config: { entity: c[p+'_ent'] }, action: 'more-info' }, bubbles: true, composed: true }); this.dispatchEvent(e); }}">
          ${active && animType === 'spin' && c[p+'_box'] ? html`<div class="dot-follower"></div>` : ''}
          
          <div style="display:flex; align-items:center; gap:8px;">
            ${p.startsWith('b') ? html`<div class="gauge-v"><div style="height:${val}%; background:${val>50?'#4caf50':(val>20?'#ff9800':'#f44336')};"></div></div>` : ''}
            
            <div style="display:flex; flex-direction:column; align-items:center;">
               ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px; transform:rotate(${c[p+'_img_rot']||0}deg); margin-bottom:4px;">` : ''}
               <div class="label" style="color:${c[p+'_tc']||'#eee'}; font-size:${c[p+'_fs_l']||0.65}em;">${c[p+'_name']||''}</div>
               <div class="val" style="color:${c[p+'_vc']||'#fff'}; font-size:${c[p+'_fs_v']||1}em;">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
               ${s2 ? html`<div style="color:${c[p+'_v2c']||'#0f0'}; font-size:0.65em; font-weight:bold;">${s2.state}${c[p+'_u2']||''}</div>` : ''}
            </div>
          </div>
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 1px 1px 3px #000; cursor:pointer; border-radius:12px; justify-content:center;}
      .box{background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); backdrop-filter:blur(8px);}
      .lumina-text { text-shadow: 0 0 5px rgba(255,255,255,0.4); }
      .gauge-v{width:8px; height:45px; background:#222; border-radius:3px; display:flex; flex-direction:column-reverse; overflow:hidden; border:1px solid #555; flex-shrink:0;}
      .label{font-weight:600; text-transform:uppercase; text-align:center;}
      .val{font-weight:900; text-align:center;}
      .border-prod, .border-fixe { border: 2px solid #4caf50 !important; }
      .border-noprod { border: 2px solid #f44336 !important; }
      .border-blink { border: 2px solid #4caf50 !important; animation: blink 1.5s infinite; }
      .dot-follower { position: absolute; width: 8px; height: 8px; background: #fff; border-radius: 50%; box-shadow: 0 0 10px #fff; offset-path: rect(0% 100% 100% 0% round 12px); animation: orbit 3s linear infinite; }
      @keyframes orbit { from { offset-distance: 0%; } to { offset-distance: 100%; } }
      @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const tabs = [{id:'solar',n:'Solar'},{id:'house',n:'House'},{id:'bat',n:'Bat'},{id:'weather',n:'Météo'},{id:'flow',n:'Flux'},{id:'gen',n:'Gen'}];
      const ents = Object.keys(this.hass.states).sort();
      return html`<div style="background:#1c1c1c; color:white; padding:10px; font-family:sans-serif;">
        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:8px; font-size:9px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; border-radius:4px; cursor:pointer; color:white;">${t.n.toUpperCase()}</button>`)}
        </div>
        <datalist id="ha-entities">${ents.map(e => html`<option value="${e}">`)}</datalist>
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
            W Box <input type="number" .value="${c[p+'_w_box']||80}" @input="${e=>this._up(p+'_w_box',e.target.value)}"> H Box <input type="number" .value="${c[p+'_h_box']||90}" @input="${e=>this._up(p+'_h_box',e.target.value)}">
            Taille Nom <input type="number" step="0.05" .value="${c[p+'_fs_l']||0.65}" @input="${e=>this._up(p+'_fs_l',e.target.value)}">
            Taille Val <input type="number" step="0.05" .value="${c[p+'_fs_v']||1}" @input="${e=>this._up(p+'_fs_v',e.target.value)}">
            Rotation <input type="number" .value="${c[p+'_rot']||0}" @input="${e=>this._up(p+'_rot',e.target.value)}">
            Entité 1 <input list="ha-entities" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
            Entité 2 <input list="ha-entities" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}">
            Unité 2 <input type="text" .value="${c[p+'_u2']||'%'}" @input="${e=>this._up(p+'_u2',e.target.value)}">
            Cadre <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}">
            Anim <select @change="${e=>this._up(p+'_anim',e.target.value)}">
              <option value="none" ?selected="${c[p+'_anim']==='none'}">Fixe</option>
              <option value="blink" ?selected="${c[p+'_anim']==='blink'}">Scintiller</option>
              <option value="spin" ?selected="${c[p+'_anim']==='spin'}">Bille</option>
            </select>
            Img URL <input type="text" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}">
            Img Size <input type="number" .value="${c[p+'_img_w']||40}" @input="${e=>this._up(p+'_img_w',e.target.value)}">
          </div>
        </details>`);
      if (t === 'weather') return html`<div style="background:#2b2b2b; padding:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        Entité <input list="ha-entities" style="grid-column:span 2" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}">
        Cadre <input type="checkbox" .checked="${c.w_box}" @change="${e=>this._up('w_box',e.target.checked)}">
        X Texte <input type="number" .value="${c.w_x}" @input="${e=>this._up('w_x',e.target.value)}"> Y Texte <input type="number" .value="${c.w_y}" @input="${e=>this._up('w_y',e.target.value)}">
        X Icône <input type="number" .value="${c.w_img_x||0}" @input="${e=>this._up('w_img_x',e.target.value)}"> Y Icône <input type="number" .value="${c.w_img_y||-50}" @input="${e=>this._up('w_img_y',e.target.value)}">
        Taille Icône <input type="number" .value="${c.w_is||50}" @input="${e=>this._up('w_is',e.target.value)}"> Taille Texte <input type="number" step="0.1" .value="${c.w_fs||0.9}" @input="${e=>this._up('w_fs',e.target.value)}">
      </div>`;
      if (t === 'flow') return html`<div style="background:#2b2b2b; padding:10px;">${[1,2,3,4,5,6,7,8,9,10].map(i => html`
        <details style="margin-bottom:5px;"><summary>Flux ${i}</summary>
          Path <input type="text" style="width:100%" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}">
          Sensor <input list="ha-entities" .value="${c['f'+i+'_s']||''}" @input="${e=>this._up('f'+i+'_s',e.target.value)}">
          Couleur <input type="color" .value="${c['f'+i+'_c']||'#ffff00'}" @change="${e=>this._up('f'+i+'_c',e.target.value)}">
        </details>`)}</div>`;
      if (t === 'gen') return html`<div style="padding:10px; background:#2b2b2b; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        Fond URL <input type="text" style="grid-column:span 2" .value="${c.background_image}" @input="${e=>this._up('background_image',e.target.value)}">
        Card W <input type="number" .value="${c.card_width||500}" @input="${e=>this._up('card_width',e.target.value)}"> 
        Card H <input type="number" .value="${c.card_height||400}" @input="${e=>this._up('card_height',e.target.value)}">
        Vitesse <input type="number" .value="${c.flow_speed||3}" @input="${e=>this._up('flow_speed',e.target.value)}">
        Dash <input type="number" .value="${c.dash_size||10}" @input="${e=>this._up('dash_size',e.target.value)}">
      </div>`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card Ultimate V53" });
})();
