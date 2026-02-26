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

      for (let i = 1; i <= 15; i++) {
        const pD = c['f'+i+'_p'];
        if (!c['f'+i+'_en'] || !pD) continue;
        const s = c['f'+i+'_s'], v = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 0;
        if (v === 0 && s) continue;
        ctx.save();
        ctx.strokeStyle = c['f'+i+'_c'] || '#ff0';
        ctx.lineWidth = c['f'+i+'_w'] || 3;
        ctx.setLineDash([c.dash_size || 10, c.dash_gap || 20]);
        const speed = (c.flow_speed || 3) / 10;
        ctx.lineDashOffset = this._offset * speed * (v < 0 ? 1 : -1) * 10;
        ctx.stroke(new Path2D(pD));
        ctx.restore();
      }
    }

    _fire(ent) {
      const e = new CustomEvent("hass-action", { detail: { config: { entity: ent }, action: "more-info" }, bubbles: true, composed: true });
      this.dispatchEvent(e);
    }

    render() {
      const c = this.config;
      return html`
        <ha-card style="width:${c.card_width||500}px; height:${c.card_height||400}px; position:relative; overflow:hidden; background:#000;">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||500}" height="${c.card_height||400}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          ${c.show_grid ? html`<div style="position:absolute; top:5px; left:5px; background:red; color:white; z-index:20; font-size:10px; padding:2px;">X: ${this._mX} Y: ${this._mY}</div>` : ''}
          <div @mousemove="${e => { const r = e.currentTarget.getBoundingClientRect(); this._mX = Math.round(e.clientX - r.left); this._mY = Math.round(e.clientY - r.top); }}" style="position:absolute; width:100%; height:100%; z-index:10;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3','g1','g2'].map(p => this._renderItem(p))}
          </div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent']) return '';
      const s = this.hass.states[c[p+'_ent']]; if(!s) return '';
      return html`
        <div class="item ${c[p+'_box']?'box':''}" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; cursor:pointer;" @click="${() => this._fire(c[p+'_ent'])}">
          ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" style="width:${c[p+'_img_w']||40}px;">` : ''}
          <div style="color:${c[p+'_tc']||'#eee'}; font-size:0.7em; font-weight:bold;">${c[p+'_name']||''}</div>
          <div style="color:${c[p+'_vc']||'#fff'}; font-weight:900;">${parseFloat(s.state).toFixed(0)}${p.startsWith('b')?'%':'W'}</div>
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 1px 1px 2px #000; text-align:center;}
      .box{background:rgba(0,0,0,0.6); padding:5px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(2px);}
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; this._tab = this._tab || 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const c = this._config;
      const tabs = [
        {id:'solar',n:'Solaire'}, {id:'house',n:'Maison'}, 
        {id:'bat',n:'Batterie'}, {id:'grid',n:'Réseau'},
        {id:'flow',n:'Flux'}, {id:'gen',n:'Général'}
      ];
      return html`
        <div style="background:#1c1c1c; color:white; padding:10px; font-family:sans-serif;">
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">
            ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:8px; font-size:9px; background:${this._tab===t.id?'#4caf50':'#333'}; color:white; border:none; border-radius:4px; cursor:pointer;">${t.n.toUpperCase()}</button>`)}
          </div>
          ${this._renderTabContent()}
        </div>`;
    }

    _renderTabContent() {
      const c = this._config, t = this._tab;
      const pfx = {solar:['s1','s2','s3'], house:['h1','h2','h3'], bat:['b1','b2'], grid:['g1','g2']}[t];
      if (pfx) {
        return pfx.map(p => html`
          <details style="background:#2b2b2b; margin-bottom:5px; padding:8px; border-radius:4px;">
            <summary style="font-weight:bold; color:#4caf50; cursor:pointer;">Configuration ${p.toUpperCase()}</summary>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
              <div>Nom: <input type="text" style="width:100%" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}"></div>
              <div>Entité: <input type="text" style="width:100%" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}"></div>
              <div>X: <input type="number" style="width:100%" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}"></div>
              <div>Y: <input type="number" style="width:100%" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}"></div>
              <div style="grid-column: span 2;">Image URL: <input type="text" style="width:100%" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}"></div>
              <div>Taille Image: <input type="number" style="width:100%" .value="${c[p+'_img_w']||40}" @input="${e=>this._up(p+'_img_w',e.target.value)}"></div>
              <div>Cadre: <input type="checkbox" .checked="${c[p+'_box']}" @change="${e=>this._up(p+'_box',e.target.checked)}"></div>
            </div>
          </details>
        `);
      }
      if (t === 'gen') return html`
        Fond Image URL: <input type="text" style="width:100%" .value="${c.background_image}" @input="${e=>this._up('background_image',e.target.value)}"><br><br>
        Largeur: <input type="number" .value="${c.card_width||500}" @input="${e=>this._up('card_width',e.target.value)}"> 
        Hauteur: <input type="number" .value="${c.card_height||400}" @input="${e=>this._up('card_height',e.target.value)}"><br><br>
        Afficher Grille: <input type="checkbox" .checked="${c.show_grid}" @change="${e=>this._up('show_grid',e.target.checked)}">
      `;
      if (t === 'flow') return html`
        Vitesse: <input type="range" min="1" max="10" .value="${c.flow_speed||3}" @change="${e=>this._up('flow_speed',e.target.value)}">
        <br><br>${[1,2,3,4,5].map(i => html`Flux ${i} Tracé: <input type="text" style="width:100%" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}"><br>`)}
      `;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
})();
