(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {}, _mX: {type: Number}, _mY: {type: Number} }; }
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
      return html`
        <div class="item box weather-card" style="left:${c.w_x||10}px; top:${c.w_y||10}px;">
          <ha-state-icon .hass=${this.hass} .stateObj=${s} style="--mdc-icon-size:30px; color:#ff9800;"></ha-state-icon>
          <div class="val">${s.attributes.temperature}°C</div>
          <div class="label">${s.state.replace(/_/g, ' ')}</div>
          <div style="font-size:0.6em; opacity:0.8;">💧 ${s.attributes.humidity}%</div>
        </div>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent'] || !this.hass.states[c[p+'_ent']]) return '';
      const s1 = this.hass.states[c[p+'_ent']];
      const s2 = c[p+'_ent2'] ? this.hass.states[c[p+'_ent2']] : null;
      const val = parseFloat(s1.state);
      const isS = p.startsWith('s');
      const isB = p.startsWith('b');
      const prodActive = isS && val > 5;

      const w = c[p+'_w_box'] || 80;
      const h = c[p+'_h_box'] || 90;

      return html`
        <div class="item ${c[p+'_box']?'box':''} ${isS ? (prodActive ? 'border-prod' : 'border-noprod') : ''}" 
             style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; width:${w}px; height:${h}px; transform:rotate(${c[p+'_rot']||0}deg);" 
             @click="${() => this._fireAction(c[p+'_ent'])}">
          
          ${prodActive ? html`<div class="dot-follower"></div>` : ''}

          <div style="display:flex; align-items:center; gap:5px; margin-top:5px;">
            ${isB ? html`<div class="gauge-v"><div style="height:${val}%; background:${val>50?'#4caf50':(val>20?'#ff9800':'#f44336')};"></div></div>` : ''}
            ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px; transform:rotate(${c[p+'_img_rot']||0}deg);">` : ''}
          </div>
          <div class="label" style="color:${c[p+'_tc']||'#eee'}">${c[p+'_name']||''}</div>
          <div class="val" style="color:${c[p+'_vc']||'#fff'}">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
          ${s2 ? html`<div style="color:${c[p+'_v2c']||'#0f0'}; font-size:0.65em; font-weight:bold;">${s2.state}${c[p+'_u2']||''}</div>` : ''}
        </div>`;
    }

    _fireAction(ent) {
      const e = new CustomEvent("hass-action", { detail: { config: { entity: ent }, action: "more-info" }, bubbles: true, composed: true });
      this.dispatchEvent(e);
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 1px 1px 2px #000; cursor:pointer; border-radius:10px; transition: all 0.3s; white-space:nowrap; box-sizing: border-box; justify-content: center; overflow: visible;}
      .box{background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(4px);}
      .weather-card{padding:10px; text-align:center; border: 1px solid rgba(0, 200, 255, 0.4); width: auto !important; height: auto !important;}
      .gauge-v{width:6px; height:30px; background:#333; border-radius:2px; display:flex; flex-direction:column-reverse; overflow:hidden; border:1px solid #555;}
      .label{font-weight:bold; text-transform:uppercase; font-size:0.65em; margin-top:2px;}
      .val{font-weight:900; font-size:1em;}
      
      .border-noprod { border: 2px solid #f44336 !important; }
      .border-prod { border: 2px solid #4caf50 !important; box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }

      /* LE POINT QUI TOURNE */
      .dot-follower {
        position: absolute;
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 8px #fff, 0 0 12px #4caf50;
        offset-path: border-box; /* Utilise le bord du cadre */
        offset-path: rect(0% 100% 100% 0% round 10px);
        animation: orbit 3s linear infinite;
        z-index: 100;
      }

      @keyframes orbit {
        from { offset-distance: 0%; }
        to { offset-distance: 100%; }
      }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const ents = Object.keys(this.hass.states).sort();
      const tabs = [{id:'solar',n:'Solaire'},{id:'house',n:'Maison'},{id:'bat',n:'Bat'},{id:'weather',n:'Météo'},{id:'flow',n:'Flux'},{id:'gen',n:'Gen'}];
      return html`<div style="background:#1c1c1c; color:white; padding:10px; font-family:sans-serif;">
        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">
          ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:8px; font-size:9px; background:${this._tab===t.id?'#4caf50':'#333'}; color:white; border:none; border-radius:4px; cursor:pointer;">${t.n.toUpperCase()}</button>`)}
        </div>
        <datalist id="ha-entities">${ents.map(e => html`<option value="${e}">`)}</datalist>
        ${this._renderTabContent()}
      </div>`;
    }

    _renderTabContent() {
      const c = this._config, t = this._tab;
      const pfx = {solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3']}[t];
      if (pfx) return pfx.map(p => html`
        <details style="background:#2b2b2b; margin-bottom:5px; padding:10px; border-radius:5px;">
          <summary>📦 ${p.toUpperCase()} : ${c[p+'_name']||''}</summary>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
            Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
            X <input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}">
            Y <input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}">
            <b>Largeur Cadre</b> <input type="number" .value="${c[p+'_w_box']||80}" @input="${e=>this._up(p+'_w_box',e.target.value)}">
            <b>Hauteur Cadre</b> <input type="number" .value="${c[p+'_h_box']||90}" @input="${e=>this._up(p+'_h_box',e.target.value)}">
            Entité 1 <input list="ha-entities" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
            Img URL <input type="text" style="grid-column:span 2" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}">
            Rotation <input type="number" .value="${c[p+'_rot']||0}" @input="${e=>this._up(p+'_rot',e.target.value)}">
            Cadre ON <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}">
          </div>
        </details>`);
      if (t === 'weather') return html`<div style="background:#2b2b2b; padding:10px;">Entité Météo <input list="ha-entities" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}"></div>`;
      if (t === 'flow') return html`<div style="background:#2b2b2b; padding:10px;">${[1,2,3,4,5].map(i => html`Flux ${i} Tracé <input type="text" style="width:100%" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}"><br>`)}</div>`;
      if (t === 'gen') return html`<div style="padding:10px; background:#2b2b2b;">Fond URL <input type="text" style="width:100%" .value="${c.background_image}" @input="${e=>this._up('background_image',e.target.value)}"></div>`;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Card Precision V44", description: "Cadres ajustables et point orbital." });
})();
