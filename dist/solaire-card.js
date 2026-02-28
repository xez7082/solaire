(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  const METEO_FR = {
    'clear-night': 'Nuit claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle',
    'lightning': 'Orages', 'lightning-rain': 'Orages pluvieux', 'partlycloudy': 'Partiellement nuageux',
    'pouring': 'Averses', 'rainy': 'Pluvieux', 'snowy': 'Neigeux', 'snowy-rainy': 'Pluie et neige',
    'sunny': 'Ensoleillé', 'windy': 'Venteux', 'windy-variant': 'Venteux', 'exceptional': 'Exceptionnel'
  };

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
        const v = parseFloat(this.hass.states[s].state) || 0;
        if (Math.abs(v) <= (c.flow_th || 2)) continue;
        const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tempPath.setAttribute("d", pD);
        try {
          const pathLen = tempPath.getTotalLength();
          const progress = (this._offset * 25) % pathLen;
          const pt = tempPath.getPointAtLength(v < 0 ? pathLen - progress : progress);
          ctx.save();
          ctx.shadowBlur = (c[`f${i}_w`]||3)*4; ctx.shadowColor = c[`f${i}_c`] || '#ff0';
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(pt.x, pt.y, c[`f${i}_w`]||3, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        } catch(e) {}
      }
    }

    render() {
      const c = this.config;
      const keys = [];
      for(let i=1; i<=10; i++) { 
        keys.push(`s${i}`, `h${i}`); 
        if(i<=5) { keys.push(`b${i}`, `w${i}`); }
      }
      return html`
        <ha-card style="width:${c.card_width}px; height:${c.card_height}px; background:#000; border:none;">
          <img src="${c.background_image}" class="bg-img">
          <canvas id="flowCanvas" width="${c.card_width}" height="${c.card_height}"></canvas>
          <div class="layer">${keys.map(p => this._renderItem(p))}</div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config;
      if (c[p + '_x'] === undefined || c[p + '_y'] === undefined) return '';
      
      const s1 = this.hass.states[c[p + '_ent']];
      const s2 = this.hass.states[c[p + '_ent2']];
      let val1 = s1 ? s1.state : '0';
      let iconMeteo = null;

      if (p.startsWith('w') && s1) {
          const rawState = val1.toLowerCase().replace('-', '');
          val1 = METEO_FR[rawState] || METEO_FR[val1] || val1;
          iconMeteo = `hass:weather-${s1.state.replace('partlycloudy', 'partly-cloudy')}`;
      }
      
      const val2 = s2 ? s2.state : null;
      const vNum = Math.abs(parseFloat(val1));
      const active = vNum > (c.flow_th || 2);
      
      // Logique d'effet
      let effect = c[p+'_effect'] || 'halo';
      if(p.startsWith('s')) effect = 'halo';
      if(p.startsWith('b')) effect = 'pulse';

      const bCol = c[p+'_bc'] || '#4caf50';
      const isTransBorder = bCol === 'transparent' || bCol === 'none';
      const borderRadius = c[p+'_br'] !== undefined ? c[p+'_br'] : 12;

      return html`
        <div class="item-box ${active && effect === 'halo' && !isTransBorder ? 'animated-border' : ''}" style="
          left:${c[p+'_x']}px; top:${c[p+'_y']}px; 
          width:${c[p+'_w_box'] || 120}px; height:${c[p+'_h_box'] || 'auto'}px;
          --neon-color:${bCol}; 
          --border-thickness:${(effect === 'halo' && !isTransBorder) ? (c[p+'_b_w'] || 2) : 0}px;
          border-radius:${borderRadius}px;
        ">
          ${active && effect === 'pulse' ? html`<div class="pulse-dot" style="background:${bCol}; box-shadow: 0 0 10px ${bCol};"></div>` : ''}
          
          <div class="inner-card" style="
            background:${c[p+'_bg'] || 'rgba(15,15,15,0.85)'}; 
            border-radius:${borderRadius}px;
            border: ${effect !== 'halo' && !isTransBorder ? `${c[p+'_b_w'] || 1}px solid ${bCol}` : 'none'};
          ">
            ${p.startsWith('b') && c[p+'_ent2'] ? html`
              <div class="battery-gauge"><div style="height:${val2}%; background:${val2 < 20 ? '#f44336' : '#4caf50'};"></div></div>
            ` : ''}

            ${iconMeteo ? html`
              <ha-icon icon="${iconMeteo}" style="margin-right:10px; --mdc-icon-size:${c[p+'_img_w'] || 35}px; color:#fff; flex-shrink:0;"></ha-icon>
            ` : ''}

            <div class="content">
              ${c[p+'_img'] && !p.startsWith('w') ? html`<img src="${c[p+'_img']}" width="${c[p+'_img_w'] || 35}" style="margin-bottom:4px;">` : ''}
              <div class="label" style="color:${c[p+'_tc'] || '#aaa'}; font-size:${c[p+'_fs_l'] || 10}px;">${c[p+'_name'] || ''}</div>
              <div class="value" style="color:${c[p+'_vc'] || '#fff'}; font-size:${c[p+'_fs_v'] || 15}px;">${val1}${c[p+'_u'] || ''}</div>
              ${val2 !== null ? html`<div class="value2" style="color:${c[p+'_v2c'] || '#4caf50'}; font-size:${c[p+'_fs_v2'] || 12}px;">${val2}${c[p+'_u2'] || ''}</div>` : ''}
            </div>
          </div>
        </div>`;
    }

    static get styles() { return css`
      ha-card { position: relative; overflow: hidden; }
      .bg-img { position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
      #flowCanvas { position: absolute; z-index: 5; pointer-events: none; }
      .layer { position: absolute; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
      .item-box { position: absolute; padding: var(--border-thickness); overflow: hidden; pointer-events: auto; display: flex; box-sizing: border-box; }
      .inner-card { display: flex; align-items: center; padding: 10px; width: 100%; z-index: 2; backdrop-filter: blur(5px); height: 100%; box-sizing: border-box; position: relative; }
      
      /* Animation HALO */
      .animated-border::before { content: ''; position: absolute; z-index: 1; left: -50%; top: -50%; width: 200%; height: 200%; background-image: conic-gradient(transparent, transparent, transparent, var(--neon-color)); animation: rotate 3s linear infinite; }
      @keyframes rotate { 100% { transform: rotate(1turn); } }
      
      /* Animation PULSE (Point) */
      .pulse-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; z-index: 20; animation: pulse-anim 1.5s infinite; }
      @keyframes pulse-anim { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
      
      .content { flex-grow: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; overflow: hidden; z-index: 3; }
      .label { font-weight: bold; text-transform: uppercase; white-space: nowrap; }
      .value { font-weight: 900; line-height: 1.1; }
      .battery-gauge { width: 8px; height: 100%; min-height: 35px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-right: 8px; display: flex; flex-direction: column-reverse; overflow: hidden; border-radius: 2px; flex-shrink: 0; }
    `; }
  }

  class SolaireCardEditor extends LitElement {
    static get properties() { return { _config: {}, _tab: {type: String} }; }
    constructor() { super(); this._tab = 'gen'; }
    setConfig(config) { this._config = config; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    render() {
      const tabs = [{id:'gen',n:'Global'},{id:'flow',n:'Câbles'},{id:'solar',n:'Panneaux'},{id:'house',n:'Charges'},{id:'bat',n:'Batteries'},{id:'meteo',n:'Météo'}];
      const ents = Object.keys(this.hass.states).sort();
      return html`
        <div style="background:#1a1a1a; color:#eee; padding:15px; font-family:sans-serif;">
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:15px;">
            ${tabs.map(t => html`<button @click="${()=>this._tab=t.id}" style="flex:1; min-width:80px; padding:10px; background:${this._tab===t.id?'#4caf50':'#333'}; border:none; color:#fff; border-radius:4px; cursor:pointer; font-size:10px; font-weight:bold;">${t.n.toUpperCase()}</button>`)}
          </div>
          <div style="max-height: 550px; overflow-y: auto;">${this._renderTabContent(ents)}</div>
        </div>`;
    }

    _renderTabContent(ents) {
      const c = this._config, t = this._tab;
      if (t === 'gen') return html`<div style="display:grid; gap:10px;">
        Fond URL: <input type="text" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}">
        W/H Carte: <div style="display:flex;gap:5px;"><input type="number" .value="${c.card_width}" @input="${e=>this._up('card_width',e.target.value)}"><input type="number" .value="${c.card_height}" @input="${e=>this._up('card_height',e.target.value)}"></div>
      </div>`;

      if (t === 'flow') return html`${Array.from({length:20},(_,i)=>i+1).map(i=>html`<details style="background:#222; margin-bottom:5px; padding:8px;"><summary>Flux ${i}</summary>
        Path SVG: <input type="text" style="width:100%" .value="${c[`f${i}_p`]||''}" @input="${e=>this._up(`f${i}_p`,e.target.value)}">
        Entité: <input list="e" .value="${c[`f${i}_s`]||''}" @input="${e=>this._up(`f${i}_s`,e.target.value)}">
      </details>`)}<datalist id="e">${ents.map(e => html`<option value="${e}">`)}</datalist>`;

      const pfx = {solar:Array.from({length:10},(_,i)=>`s${i+1}`), house:Array.from({length:10},(_,i)=>`h${i+1}`), bat:Array.from({length:5},(_,i)=>`b${i+1}`), meteo:Array.from({length:5},(_,i)=>`w${i+1}`)}[t];
      return pfx.map(p => html`<details style="background:#222; margin-bottom:5px; padding:8px; border-radius:4px;"><summary>Objet ${p.toUpperCase()}</summary>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
          Nom: <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}">
          X / Y: <div style="display:flex;gap:2px;"><input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}"><input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}"></div>
          
          <div style="grid-column: span 2; background: #333; padding: 4px; border-radius: 4px; font-size: 10px; text-align: center;">STYLE & EFFET</div>
          Effet: <select style="width:100%" @change="${e=>this._up(p+'_effect',e.target.value)}">
            <option value="halo" ?selected="${c[p+'_effect'] === 'halo'}">Halo Tournant (Solaire)</option>
            <option value="pulse" ?selected="${c[p+'_effect'] === 'pulse'}">Point Clignotant (Batterie)</option>
            <option value="none" ?selected="${c[p+'_effect'] === 'none'}">Aucun</option>
          </select>
          Arrondi / Ep: <div style="display:flex;gap:2px;"><input type="number" .value="${c[p+'_br']||12}" @input="${e=>this._up(p+'_br',e.target.value)}"><input type="number" .value="${c[p+'_b_w']||2}" @input="${e=>this._up(p+'_b_w',e.target.value)}"></div>
          Fond / Néon: <div style="display:flex;gap:2px;"><input type="text" .value="${c[p+'_bg']||''}" @input="${e=>this._up(p+'_bg',e.target.value)}"><input type="text" .value="${c[p+'_bc']||''}" @input="${e=>this._up(p+'_bc',e.target.value)}"></div>
          
          <div style="grid-column: span 2; background: #333; padding: 4px; border-radius: 4px; font-size: 10px; text-align: center;">TEXTES (Couleur / Taille)</div>
          Nom: <div style="display:flex;gap:2px;"><input type="text" .value="${c[p+'_tc']||'#aaa'}" @input="${e=>this._up(p+'_tc',e.target.value)}"><input type="number" .value="${c[p+'_fs_l']||10}" @input="${e=>this._up(p+'_fs_l',e.target.value)}"></div>
          Val 1: <div style="display:flex;gap:2px;"><input type="text" .value="${c[p+'_vc']||'#fff'}" @input="${e=>this._up(p+'_vc',e.target.value)}"><input type="number" .value="${c[p+'_fs_v']||15}" @input="${e=>this._up(p+'_fs_v',e.target.value)}"></div>
          Val 2: <div style="display:flex;gap:2px;"><input type="text" .value="${c[p+'_v2c']||'#4caf50'}" @input="${e=>this._up(p+'_v2c',e.target.value)}"><input type="number" .value="${c[p+'_fs_v2']||12}" @input="${e=>this._up(p+'_fs_v2',e.target.value)}"></div>
          
          <div style="grid-column: span 2; border-top: 1px solid #444; margin: 5px 0;"></div>
          Entité 1/2: <div style="display:flex;gap:2px;"><input list="e" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}"><input list="e" .value="${c[p+'_ent2']||''}" @input="${e=>this._up(p+'_ent2',e.target.value)}"></div>
          Unités 1/2: <div style="display:flex;gap:2px;"><input type="text" .value="${c[p+'_u']||''}" @input="${e=>this._up(p+'_u',e.target.value)}"><input type="text" .value="${c[p+'_u2']||''}" @input="${e=>this._up(p+'_u2',e.target.value)}"></div>
          Icone (URL/Taille): <div style="display:flex;gap:2px;"><input type="text" .value="${c[p+'_img']||''}" @input="${e=>this._up(p+'_img',e.target.value)}"><input type="number" .value="${c[p+'_img_w']||35}" @input="${e=>this._up(p+'_img_w',e.target.value)}"></div>
        </div></details><datalist id="e">${ents.map(e => html`<option value="${e}">`)}</datalist>`);
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire V230 Smart Effects" });
})();
