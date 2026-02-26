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
      if (c.show_grid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        for (let x=0; x<=cv.width; x+=50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cv.height); ctx.stroke(); }
        for (let y=0; y<=cv.height; y+=50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cv.width,y); ctx.stroke(); }
      }
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
      return html`
        <ha-card style="width:${c.card_width||500}px; height:${c.card_height||400}px; position:relative; overflow:hidden; background:#000;">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||500}" height="${c.card_height||400}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          <div @mousemove="${e => { const r = e.currentTarget.getBoundingClientRect(); this._mX = Math.round(e.clientX - r.left); this._mY = Math.round(e.clientY - r.top); }}" style="position:absolute; width:100%; height:100%; z-index:10;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3','g1','g2'].map(p => this._renderItem(p))}
          </div>
          ${c.show_grid ? html`<div style="position:absolute; top:5px; left:5px; background:red; color:white; font-size:10px; z-index:30; padding:2px;">X:${this._mX} Y:${this._mY}</div>` : ''}
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; const s1 = this.hass.states[c[p+'_ent']]; if(!s1) return '';
      const s2 = c[p+'_ent2'] ? this.hass.states[c[p+'_ent2']] : null;
      const val = parseFloat(s1.state);
      const isBat = p.startsWith('b');
      const gaugeCol = val > 50 ? '#4caf50' : (val > 20 ? '#ff9800' : '#f44336');

      return html`
        <div class="item ${c[p+'_box']?'box':''}" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; transform:rotate(${c[p+'_rot']||0}deg);" @click="${() => { const e = new CustomEvent('hass-action', { detail: { config: { entity: c[p+'_ent'] }, action: 'more-info' }, bubbles: true, composed: true }); this.dispatchEvent(e); }}">
          <div style="display:flex; align-items:center; gap:8px;">
            ${isBat ? html`<div class="gauge-v"><div style="height:${val}%; background:${gaugeCol}; transition: height 0.5s;"></div></div>` : ''}
            ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px; transform:rotate(${c[p+'_img_rot']||0}deg);">` : ''}
          </div>
          <div class="label" style="color:${c[p+'_tc']||'#eee'}; font-size:${c[p+'_fs_t']||0.7}em;">${c[p+'_name']||''}</div>
          <div class="val" style="color:${c[p+'_vc']||'#fff'}; font-size:${c[p+'_fs_v']||1.1}em;">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
          ${s2 ? html`<div style="color:${c[p+'_v2c']||'#0f0'}; font-size:0.65em; font-weight:bold;">${s2.state}${c[p+'_u2']||''}</div>` : ''}
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 1px 1px 2px #000; cursor:pointer; white-space:nowrap;}
      .box{background:rgba(0,0,0,0.6); padding:8px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(4px);}
      .gauge-v{width:6px; height:35px; background:#333; border:1px solid #777; border-radius:2px; display:flex; flex-direction:column-reverse; overflow:hidden;}
      .label{font-weight:bold; text-transform:uppercase; margin-top:2px;}
      .val{font-weight:900;}
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const ents = Object.keys(this.hass.states).sort();
      const tabs = [{id:'solar',n:'Solar'},{id:'house',n:'House'},{id:'bat',n:'Bat'},{id:'grid',n:'Grid'},{id:'flow',n:'Flow'},{id:'gen',n:'Gen'}];
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
      const pfx = {solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3'], grid:['g1','g2']}[t];
      if (pfx) return pfx.map(p => html`
        <details style="background:#2b2b2b; margin-bottom:5px; padding:10px; border-radius:5px;">
          <summary>⚙️ ${p.toUpperCase()} : ${c[p+'_name']||'Sans nom'}</summary>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
            Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
            Cadre <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}">
            Entité 1 <input list="ha-entities" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
            Unité 1 <input type="text" .value="${c[p+'_u']||'W'}" @input="${e=>this._up(p+'_u',e.target.value)}">
            Entité 2 <input list="ha-entities" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}">
            Unité 2 <input type="text" .value="${c[p+'_u2']||''}" @input="${e=>this._up(p+'_u2',e.target.value)}">
            X <input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}">
            Y <input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}">
            Rot Bloc <input type="number" .value="${c[p+'_rot']||0}" @input="${e=>this._up(p+'_rot',e.target.value)}">
            Taille Texte <input type="number" step="0.1" .value="${c[p+'_fs_v']||1.1}" @input="${e=>this._up(p+'_fs_v',e.target.value)}">
            Image URL <input type="text" style="grid-column:span 2" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}">
            Taille Img <input type="number" .value="${c[p+'_img_w']||40}" @input="${e=>this._up(p+'_img_w',e.target.value)}">
            Rot Img <input type="number" .value="${c[p+'_img_rot']||0}" @input="${e=>this._up(p+'_img_rot',e.target.value)}">
          </div>
        </details>
      `);
      if (t === 'flow') return html`
        <div style="background:#2b2b2b; padding:10px; border-radius:5px;">
          Vitesse <input type="range" min="1" max="10" .value="${c.flow_speed||3}" @change="${e=>this._up('flow_speed',e.target.value)}">
          Taille Point <input type="number" style="width:50px" .value="${c.dash_size||10}" @input="${e=>this._up('dash_size',e.target.value)}">
          <hr style="opacity:0.2; margin:10px 0;">
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details style="margin-bottom:5px;"><summary>Flux ${i}</summary>
              Tracé SVG <input type="text" style="width:100%" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}">
              Entité Watts <input list="ha-entities" style="width:100%" .value="${c['f'+i+'_s']||''}" @input="${e=>this._up('f'+i+'_s',e.target.value)}">
              Couleur <input type="color" .value="${c['f'+i+'_c']||'#ff0'}" @input="${e=>this._up('f'+i+'_c',e.target.value)}">
            </details>
          `)}
        </div>
      `;
      if (t === 'gen') return html`<div style="padding:10px; background:#2b2b2b;">
        Fond URL <input type="text" style="width:100%" .value="${c.background_image}" @input="${e=>this._up('background_image',e.target.value)}"><br>
        Grille <input type="checkbox" .checked="${c.show_grid}" @change="${e=>this._up('show_grid',e.target.checked)}">
      </div>`;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
})();
