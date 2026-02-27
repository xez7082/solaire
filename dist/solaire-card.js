(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    
    setConfig(config) {
      this.config = { card_width: 1540, card_height: 580, flow_speed: 3, flow_th: 2, ...config };
    }

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

      for (let i = 1; i <= 20; i++) {
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
        const size = parseFloat(c[`f${i}_w`]) || 3;
        ctx.shadowBlur = size * 4; ctx.shadowColor = c[`f${i}_c`] || '#ff0';
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    render() {
      const c = this.config;
      const keys = [];
      for(let i=1; i<=10; i++) { keys.push(`s${i}`, `h${i}`); if(i<=5) keys.push(`b${i}`); }

      return html`
        <ha-card style="width:${c.card_width}px; height:${c.card_height}px;">
          <img src="${c.background_image}" class="bg-img">
          <canvas id="flowCanvas" width="${c.card_width}" height="${c.card_height}"></canvas>
          <div class="layer">${keys.map(p => this._renderItem(p))}</div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; if (!c[p + '_ent'] || !this.hass.states[c[p + '_ent']]) return '';
      const s1 = this.hass.states[c[p + '_ent']];
      const s2 = c[p + '_ent2'] && this.hass.states[c[p + '_ent2']] ? this.hass.states[c[p + '_ent2']] : null;
      
      const val1 = parseFloat(s1.state) || 0;
      const val2 = s2 ? parseFloat(s2.state) : null;
      const isActive = Math.abs(val1) > (c.flow_th || 2);

      return html`
        <div class="item-box ${isActive ? 'animated-border' : ''}" style="
          left:${c[p+'_x']||0}px; top:${c[p+'_y']||0}px; 
          width:${c[p+'_w_box']||120}px;
          --neon-color:${c[p+'_bc']||'#4caf50'}; --border-thickness:${c[p+'_b_w']||2}px;
          --anim-speed:${c[p+'_as']||3}s; border-radius:${c[p+'_br']||12}px;
          box-shadow: ${c[p+'_sh']||'0 8px 16px rgba(0,0,0,0.5)'};
        ">
          <div class="inner-card" style="background:${c[p+'_bg']||'rgba(15,15,15,0.85)'}; border-radius:${c[p+'_br']||12}px;">
            ${p.startsWith('b') ? html`
               <div class="battery-gauge"><div style="height:${val2 || 0}%; background:${(val2 || 0) < 20 ? '#f44336' : '#4caf50'}; shadow: 0 0 5px #fff;"></div></div>
            ` : ''}
            <div class="content">
              ${c[p+'_img'] ? html`<img src="${c[p+'_img']}" width="${c[p+'_img_w']||35}">` : ''}
              <div class="label" style="color:${c[p+'_tc']||'#aaa'}; font-size:${c[p+'_fs_l']||10}px;">${c[p+'_name']||''}</div>
              <div class="value" style="color:${c[p+'_vc']||'#fff'}; font-size:${c[p+'_fs_v']||15}px;">${val1.toFixed(0)}${c[p+'_u']||'W'}</div>
              ${val2 !== null ? html`<div class="value2" style="color:${c[p+'_v2c']||'#4caf50'}; font-size:${c[p+'_fs_v2']||13}px;">${val2.toFixed(1)}${c[p+'_u2']||'%'}</div>` : ''}
            </div>
          </div>
        </div>`;
    }

    static get styles() { return css`
      ha-card { position: relative; overflow: hidden; background: #000; border: none; }
      .bg-img { position: absolute; width: 100%; height: 100%; object-fit: cover; }
      #flowCanvas { position: absolute; z-index: 5; pointer-events: none; }
      .layer { position: absolute; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
      .item-box { position: absolute; padding: var(--border-thickness); overflow: hidden; pointer-events: auto; display: flex; box-sizing: border-box; }
      .inner-card { display: flex; align-items: center; padding: 10px; width: 100%; z-index: 2; backdrop-filter: blur(10px); }
      .animated-border::before { content: ''; position: absolute; z-index: 1; left: -50%; top: -50%; width: 200%; height: 200%; background-image: conic-gradient(transparent, transparent, transparent, var(--neon-color)); animation: rotate var(--anim-speed) linear infinite; }
      @keyframes rotate { 100% { transform: rotate(1turn); } }
      .content { flex-grow: 1; text-align: center; }
      .label { font-weight: bold; text-transform: uppercase; }
      .value { font-weight: 900; }
      .battery-gauge { width: 8px; height: 45px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-right: 8px; display: flex; flex-direction: column-reverse; overflow: hidden; border-radius: 2px; }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {type: String} }; }
    constructor() { super(); this._tab = 'gen'; }
    setConfig(config) { this._config = config; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const tabs = [{id:'gen',n:'Global'},{id:'flow',n:'Câbles'},{id:'solar',n:'Panneaux'},{id:'house',n:'Charges'},{id:'bat',n:'Batteries'}];
      const ents = Object.keys(this.hass.states).sort();
      return html`
        <div style="background:#1a1a1a; color:#eee; padding:15px; font-family:sans-serif;">
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:15px;">
            ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; padding:10px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:10px;">${t.n.toUpperCase()}</button>`)}
          </div>
          <div style="max-height: 500px; overflow-y: auto;">${this._renderTabContent(ents)}</div>
        </div>`;
    }

    _renderTabContent(ents) {
      const c = this._config, t = this._tab;
      if (t === 'gen') return html`<div style="display:grid; gap:10px;">
        Fond: <input type="text" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}">
        L/H: <div style="display:flex;gap:5px;"><input type="number" .value="${c.card_width}" @input="${e=>this._up('card_width',e.target.value)}"><input type="number" .value="${c.card_height}" @input="${e=>this._up('card_height',e.target.value)}"></div>
      </div>`;

      if (t === 'flow') return html`${Array.from({length:20},(_,i)=>i+1).map(i=>html`<details style="background:#222; margin-bottom:5px; padding:8px;"><summary>Flux ${i}</summary>
        Path: <input type="text" style="width:100%" .value="${c[`f${i}_p`]||''}" @input="${e=>this._up(`f${i}_p`,e.target.value)}">
        Entité: <input list="e" .value="${c[`f${i}_s`]||''}" @input="${e=>this._up(`f${i}_s`,e.target.value)}">
        Couleur/Taille: <div style="display:flex;gap:5px;"><input type="color" .value="${c[`f${i}_c`]||'#ffff00'}" @change="${e=>this._up(`f${i}_c`,e.target.value)}"><input type="number" .value="${c[`f${i}_w`]||3}" @input="${e=>this._up(`f${i}_w`,e.target.value)}"></div>
      </details>`)}<datalist id="e">${ents.map(e => html`<option value="${e}">`)}</datalist>`;

      const pfx = {solar:Array.from({length:10},(_,i)=>`s${i+1}`), house:Array.from({length:10},(_,i)=>`h${i+1}`), bat:Array.from({length:5},(_,i)=>`b${i+1}`)}[t];
      return pfx.map(p => html`<details style="background:#222; margin-bottom:5px; padding:8px;"><summary>Objet ${p.toUpperCase()}</summary>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
          Nom: <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
          X / Y: <div style="display:flex;gap:2px;"><input type="number" .value="${c[p+'_x']||0}" @input="${e=>this._up(p+'_x',e.target.value)}"><input type="number" .value="${c[p+'_y']||0}" @input="${e=>this._up(p+'_y',e.target.value)}"></div>
          Entité 1: <input list="e" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}">
          Unité 1: <input type="text" .value="${c[p+'_u']||'W'}" @input="${e=>this._up(p+'_u',e.target.value)}">
          Entité 2: <input list="e" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}">
          Unité 2: <input type="text" .value="${c[p+'_u2']||(t==='bat'?'%':'V')}" @input="${e=>this._up(p+'_u2',e.target.value)}">
          Couleur Néon: <input type="color" .value="${c[p+'_bc']||'#4caf50'}" @change="${e=>this._up(p+'_bc',e.target.value)}">
          Bordure/Arrondi: <div style="display:flex;gap:2px;"><input type="number" .value="${c[p+'_b_w']||2}" @input="${e=>this._up(p+'_b_w',e.target.value)}"><input type="number" .value="${c[p+'_br']||12}" @input="${e=>this._up(p+'_br',e.target.value)}"></div>
          Icone URL: <input type="text" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}">
          Couleur Val 2: <input type="color" .value="${c[p+'_v2c']||'#4caf50'}" @change="${e=>this._up(p+'_v2c',e.target.value)}">
        </div></details><datalist id="e">${ents.map(e => html`<option value="${e}">`)}</datalist>`);
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire V140 Dual-Sensor" });
})();
