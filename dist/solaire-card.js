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

      for (let i = 1; i <= 15; i++) {
        const pD = c['f'+i+'_p'];
        if (!c['f'+i+'_en'] || !pD) continue;
        const s = c['f'+i+'_s'], v = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 0;
        if (v === 0 && s) continue;
        ctx.save();
        ctx.strokeStyle = c['f'+i+'_c'] || '#ff0';
        ctx.lineWidth = c['f'+i+'_w'] || 3;
        ctx.setLineDash([c.dash_size || 10, c.dash_gap || 20]);
        const speedFactor = (c.flow_speed || 3) / 20; 
        ctx.lineDashOffset = this._offset * speedFactor * (1 + Math.min(Math.abs(v)/1000, 2)) * (v < 0 ? 1 : -1) * 10;
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

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      return html`
        <ha-card @mousemove="${this._handleMouseMove}" style="width:${c.card_width||500}px; height:${c.card_height||400}px; position:relative; overflow:hidden; background:#000; border:2px solid ${c.border_color||'#333'}; border-radius:15px;">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||500}" height="${c.card_height||400}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          ${c.show_grid ? html`<div style="position:absolute; top:5px; left:5px; background:red; color:white; padding:2px 5px; z-index:20; font-size:10px;">X: ${this._mX} Y: ${this._mY}</div>` : ''}
          <div style="position:absolute; width:100%; height:100%; z-index:10; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3','g1','g2'].map(p => this._renderItem(p))}
          </div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent']) return '';
      const s = this.hass.states[c[p+'_ent']]; if(!s) return '';
      const isB = p.startsWith('b');
      const imgUrl = isB ? c[p+'_img'] : null;
      const imgW = c[p+'_img_w'] || 40;

      return html`
        <div class="item ${c[p+'_box']?'box-style':''}" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; transform:rotate(${c[p+'_rot']||0}deg);">
          ${imgUrl ? html`<img src="${imgUrl}" style="width:${imgW}px; margin-bottom:5px;">` : ''}
          <div class="label" style="color:${c[p+'_tc']||'#aaa'}">${c[p+'_name']||''}</div>
          <div class="val" style="color:${c[p+'_vc']||'#fff'}">${parseFloat(s.state).toFixed(0)} ${isB ? '%' : 'W'}</div>
          ${isB ? html`<div class="gauge" style="width:50px; height:6px; border:1px solid #fff; margin-top:2px;"><div style="width:${s.state}%; background:#0f0; height:100%;"></div></div>` : ''}
        </div>`;
    }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; if(!this._tab) this._tab = 'bat'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const c = this._config;
      return html`
        <div style="background:#121212; color:#fff; padding:10px; font-family: sans-serif;">
          <div style="display:flex; gap:5px; margin-bottom:10px;">
            ${['solar','house','bat','flow','gen'].map(t => html`<button @click="${() => this._tab=t}" style="flex:1; padding:8px; background:${this._tab===t?'#4caf50':'#333'}; color:white; border:none; border-radius:4px;">${t.toUpperCase()}</button>`)}
          </div>
          ${this._tab === 'bat' ? html`
            ${[1,2,3].map(i => html`
              <details style="background:#252525; margin-bottom:5px; padding:5px;">
                <summary>BATTERIE ${i}</summary>
                Nom <input type="text" .value="${c['b'+i+'_name']||''}" @input="${e=>this._up('b'+i+'_name', e.target.value)}"><br>
                X <input type="number" .value="${c['b'+i+'_x']}" @input="${e=>this._up('b'+i+'_x', e.target.value)}"> 
                Y <input type="number" .value="${c['b'+i+'_y']}" @input="${e=>this._up('b'+i+'_y', e.target.value)}"><br>
                <b>🖼️ Image URL</b> <input type="text" style="width:100%" .value="${c['b'+i+'_img']||''}" @input="${e=>this._up('b'+i+'_img', e.target.value)}">
                Largeur Image <input type="number" .value="${c['b'+i+'_img_w']||40}" @input="${e=>this._up('b'+i+'_img_w', e.target.value)}"><br>
                Entité <input type="text" .value="${c['b'+i+'_ent']||''}" @input="${e=>this._up('b'+i+'_ent', e.target.value)}">
              </details>
            `)}
          ` : html`<p>Utilisez les autres onglets pour le reste.</p>`}
        </div>`;
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
})();
