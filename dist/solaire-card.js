(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    setConfig(config) { this.config = { card_width: 1540, card_height: 580, flow_speed: 3, flow_th: 2, ...config }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }

    _run() {
      this._offset = (this._offset || 0) + (parseFloat(this.config.flow_speed) / 10 || 0.3);
      if (this._offset > 100) this._offset = 0;
      this._draw();
      this._f = requestAnimationFrame(() => this._run());
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
        const pD = c[`f${i}_p`], s = c[`f${i}_s`];
        if (!pD || !this.hass.states[s]) continue;
        const v = parseFloat(this.hass.states[s].state);
        if (Math.abs(v) <= (c.flow_th || 2)) continue;
        const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tempPath.setAttribute("d", pD);
        const pathLen = tempPath.getTotalLength();
        const progress = (this._offset * 25) % pathLen;
        const pt = tempPath.getPointAtLength(v < 0 ? pathLen - progress : progress);
        ctx.save();
        ctx.shadowBlur = (c[`f${i}_w`]||3)*4; ctx.shadowColor = c[`f${i}_c`]||'#ff0';
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(pt.x, pt.y, c[`f${i}_w`]||3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    render() {
      const c = this.config;
      return html`
        <ha-card style="width:${c.card_width}px; height:${c.card_height}px;">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:cover;">
          <canvas id="flowCanvas" width="${c.card_width}" height="${c.card_height}" style="position:absolute; z-index:5;"></canvas>
          <div style="position:absolute; width:100%; height:100%; z-index:10;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
          </div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; if (!c[p + '_ent'] || !this.hass.states[c[p + '_ent']]) return '';
      const val = parseFloat(this.hass.states[c[p + '_ent']].state);
      const isActive = Math.abs(val) > (c.flow_th || 2);
      return html`
        <div class="item-box ${isActive ? 'animated-border' : ''}" style="
          left:${c[p+'_x']||0}px; top:${c[p+'_y']||0}px; width:${c[p+'_w_box']||110}px;
          --neon-color:${c[p+'_bc']||'#4caf50'}; --border-thickness:${c[p+'_b_w']||2}px;
          --anim-speed:${c[p+'_as']||3}s; border-radius:${c[p+'_br']||12}px;">
          <div class="inner-card" style="background:${c[p+'_bg']||'rgba(15,15,15,0.85)'}; border-radius:${c[p+'_br']||12}px;">
            <div class="content">
              <div class="label" style="color:${c[p+'_tc']||'#aaa'}; font-size:${c[p+'_fs_l']||10}px;">${c[p+'_name']||''}</div>
              <div class="value" style="color:${c[p+'_vc']||'#fff'}; font-size:${c[p+'_fs_v']||16}px;">${val.toFixed(0)}${c[p+'_u']||'W'}</div>
            </div>
          </div>
        </div>`;
    }

    static get styles() { return css`
      .item-box { position: absolute; padding: var(--border-thickness); overflow: hidden; display: flex; }
      .inner-card { display: flex; align-items: center; padding: 10px; width: 100%; z-index: 2; backdrop-filter: blur(10px); }
      .animated-border::before { content: ''; position: absolute; z-index: 1; left: -50%; top: -50%; width: 200%; height: 200%; background-image: conic-gradient(transparent, transparent, transparent, var(--neon-color)); animation: rotate var(--anim-speed) linear infinite; }
      @keyframes rotate { 100% { transform: rotate(1turn); } }
      .content { flex-grow: 1; text-align: center; }
      .label { font-weight: bold; text-transform: uppercase; }
      .value { font-weight: 900; }
    `; }
  }

  // --- EDITEUR AVEC MEMOIRE D'ONGLET ---
  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _activeTab: {type: String} }; }
    
    constructor() {
      super();
      this._activeTab = 'gen'; // Onglet par défaut
    }

    setConfig(config) { this._config = config; }

    _up(k, v) {
      this.dispatchEvent(new CustomEvent("config-changed", { 
        detail: { config: { ...this._config, [k]: v } }, 
        bubbles: true, composed: true 
      }));
    }

    render() {
      const tabs = [{id:'gen',n:'Global'},{id:'flow',n:'Câbles'},{id:'solar',n:'Solar'},{id:'house',n:'Maison'},{id:'bat',n:'Bat'}];
      const ents = Object.keys(this.hass.states).sort();

      return html`
        <div style="background:#1a1a1a; color:#eee; padding:20px;">
          <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:20px;">
            ${tabs.map(t => html`
              <button @click="${() => this._activeTab = t.id}" 
                style="flex:1; padding:10px; background:${this._activeTab === t.id ? '#4caf50' : '#333'}; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">
                ${t.n.toUpperCase()}
              </button>`)}
          </div>
          <div style="max-height: 500px; overflow-y: auto;">
            ${this._renderContent(ents)}
          </div>
        </div>`;
    }

    _renderContent(ents) {
      const c = this._config, t = this._activeTab;
      if (t === 'gen') return html`<div style="display:grid; gap:10px;">
        Image Fond: <input type="text" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}">
        Largeur/Hauteur: <div style="display:flex;gap:5px;"><input type="number" .value="${c.card_width}" @input="${e=>this._up('card_width',e.target.value)}"><input type="number" .value="${c.card_height}" @input="${e=>this._up('card_height',e.target.value)}"></div>
      </div>`;

      if (t === 'flow') return html`${[1,2,3,4,5,6,7,8,9,10].map(i => html`<details style="background:#222; margin-bottom:5px; padding:10px;"><summary>Câble ${i}</summary>
        Path: <input type="text" style="width:100%" .value="${c[`f${i}_p`]||''}" @input="${e=>this._up(`f${i}_p`,e.target.value)}">
        Capteur: <input list="ents" .value="${c[`f${i}_s`]||''}" @input="${e=>this._up(`f${i}_s`,e.target.value)}">
        Couleur/Taille: <div style="display:flex;gap:5px;"><input type="color" .value="${c[`f${i}_c`]||'#ffff00'}" @change="${e=>this._up(`f${i}_c`,e.target.value)}"><input type="number" .value="${c[`f${i}_w`]||3}" @input="${e=>this._up(`f${i}_w`,e.target.value)}"></div>
      </details>`)}<datalist id="ents">${ents.map(e => html`<option value="${e}">`)}</datalist>`;

      const pfx = {solar:['s1','s2','s3'], house:['h1','h2','h3'], bat:['b1','b2']}[t];
      if (pfx) return pfx.map(p => html`<details style="background:#222; margin-bottom:5px; padding:10px;"><summary>Objet ${p.toUpperCase()}</summary>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          Nom: <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
          X/Y: <div style="display:flex;gap:2px;"><input type="number" .value="${c[p+'_x']||0}" @input="${e=>this._up(p+'_x',e.target.value)}"><input type="number" .value="${c[p+'_y']||0}" @input="${e=>this._up(p+'_y',e.target.value)}"></div>
          Bordure (Couleur/Ep): <div style="display:flex;gap:2px;"><input type="color" .value="${c[p+'_bc']||'#4caf50'}" @change="${e=>this._up(p+'_bc',e.target.value)}"><input type="number" .value="${c[p+'_b_w']||2}" @input="${e=>this._up(p+'_b_w',e.target.value)}"></div>
          Vitesse Néon(s): <input type="number" .value="${c[p+'_as']||3}" @input="${e=>this._up(p+'_as',e.target.value)}">
          Rayon Angle: <input type="number" .value="${c[p+'_br']||12}" @input="${e=>this._up(p+'_br',e.target.value)}">
          Entité: <input list="ents" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
        </div></details><datalist id="ents">${ents.map(e => html`<option value="${e}">`)}</datalist>`);
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire V115 Stable" });
})();
