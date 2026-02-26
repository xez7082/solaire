(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    setConfig(config) { this.config = config; this._offset = 0; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }

    firstUpdated() { this._runAnim(); }
    _runAnim() {
      this._offset = (this._offset || 0) + 0.6;
      if (this._offset > 100) this._offset = 0;
      this._draw();
      this._frame = requestAnimationFrame(() => this._runAnim());
    }
    disconnectedCallback() { super.disconnectedCallback(); cancelAnimationFrame(this._frame); }

    _draw() {
      const cv = this.renderRoot.querySelector('#flowCanvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 1; i <= 15; i++) {
        const pD = this.config['f'+i+'_p'];
        if (!this.config['f'+i+'_en'] || !pD) continue;
        const s = this.config['f'+i+'_s'], v = (s && this.hass.states[s]) ? parseFloat(this.hass.states[s].state) : 500;
        if (v === 0 && s) continue;
        ctx.save();
        ctx.strokeStyle = this.config['f'+i+'_c'] || '#ff0';
        ctx.lineWidth = this.config['f'+i+'_w'] || 3;
        ctx.lineCap = "round";
        ctx.setLineDash([10, 20]);
        ctx.lineDashOffset = this._offset * 12 * ((Math.abs(v)/500)+0.3) * (v < 0 ? 1 : -1);
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
        ctx.stroke(new Path2D(pD));
        ctx.restore();
      }
    }

    _fmt(val, unit, forceKW = false) {
      let v = parseFloat(val);
      if (isNaN(v)) return val;
      if (forceKW || (Math.abs(v) >= 1000 && unit === 'W')) {
        return (v / 1000).toFixed(2) + ' kW';
      }
      return v.toFixed(0) + ' ' + unit;
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      return html`
        <ha-card style="width:${c.card_width||500}px; height:${c.card_height||400}px; position:relative; overflow:hidden; background:#000; border:1px solid ${c.border_color||'#333'};">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:contain; z-index:1;">
          <canvas id="flowCanvas" width="${c.card_width||500}" height="${c.card_height||400}" style="position:absolute; z-index:5; pointer-events:none;"></canvas>
          <div style="position:absolute; width:100%; height:100%; z-index:10; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3','g1','g2'].map(p => this._renderItem(p))}
            ${this._renderFullWeather()}
          </div>
        </ha-card>`;
    }

    _renderItem(p) {
      const c = this.config; if(!c[p+'_ent']) return '';
      const s = this.hass.states[c[p+'_ent']], eDay = c[p+'_ent_day'] ? this.hass.states[c[p+'_ent_day']] : null;
      if(!s) return '';
      const isB = p.startsWith('b'), rot = c[p+'_rot'] || 0;
      return html`
        <div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_c']||'#fff'}; transform:rotate(${rot}deg);">
          <div class="label">${c[p+'_name']||''}</div>
          <div class="val">${this._fmt(s.state, isB ? '%' : (s.attributes.unit_of_measurement||'W'))}</div>
          ${eDay ? html`<div class="sub">Jour: ${eDay.state} kWh</div>` : ''}
          ${isB ? html`<div class="gauge" style="width:${c[p+'_w']||60}px; height:${c[p+'_h']||8}px;"><div style="width:${s.state}%; background:${s.state>20?'#0f0':'#f00'}; height:100%;"></div></div>` : ''}
        </div>`;
    }

    _renderFullWeather() {
      const c = this.config; if (!c.weather_en) return '';
      const w = this.hass.states[c.w_ent], f = this.hass.states[c.f_ent]; if(!w) return '';
      const map = {'sunny':'sunny','rainy':'rainy','cloudy':'cloudy','partlycloudy':'partly-cloudy','pouring':'pouring','lightning':'lightning','clear-night':'night'};
      const state = w.state.toLowerCase().replace(/-/g,'');
      return html`
        <div class="item" style="left:${c.w_x}px; top:${c.w_y}px; color:${c.w_c||'#0cf'}; transform:rotate(${c.w_rot||0}deg);">
          <div style="display:flex; align-items:center; gap:5px;">
             <ha-icon icon="mdi:weather-${map[state]||'cloud'}" style="--mdc-icon-size:35px;"></ha-icon>
             <span style="font-size:1.2em; font-weight:bold;">${w.attributes.temperature}°C</span>
          </div>
          <div style="font-weight:bold; font-size:0.8em;">${w.state.toUpperCase()} | Hum: ${w.attributes.humidity}%</div>
          ${f ? html`<div class="val" style="color:#ff0">Prev: ${this._fmt(f.state,'W')}</div>` : ''}
        </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 2px 2px 3px #000; white-space:nowrap; font-family:sans-serif;}
      .label{font-size:0.7em; opacity:0.9; font-weight:bold; text-transform:uppercase;}
      .val{font-weight:bold; font-size:1.1em;}
      .sub{font-size:0.6em; color:#aaa;}
      .gauge{border:1px solid #fff; background:rgba(0,0,0,0.5); border-radius:2px; overflow:hidden; margin-top:3px;}
    `; }
  }

  // EDITEUR INTEGRAL
  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; if(!this._tab) this._tab = 'solar'; }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    
    render() {
      const c = this._config;
      const tabs = ['solar','house','bat','flow','weather','gen'];
      return html`
        <div style="background:#1a1a1a; color:white; padding:10px; font-family:sans-serif; font-size:12px;">
          <div style="display:flex; flex-wrap:wrap; gap:2px; margin-bottom:10px;">
            ${tabs.map(t => html`<button @click="${() => this._tab=t}" style="flex:1; padding:8px; background:${this._tab===t?'#0cf':'#333'}; border:none; cursor:pointer; font-size:9px; font-weight:bold;">${t.toUpperCase()}</button>`)}
          </div>
          <div style="background:#111; padding:10px; border-radius:4px;">
            ${this._renderTab()}
          </div>
        </div>`;
    }

    _renderTab() {
      const c = this._config, t = this._tab;
      if(t === 'flow') return html`15 FLUX ANIMÉS:<br>${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => html`
        <details style="border:1px solid #444; margin-top:2px;"><summary>Flux #${i} ${c['f'+i+'_en']?'✔️':''}</summary>
          <div style="padding:5px;">
            Activer <input type="checkbox" .checked="${c['f'+i+'_en']}" @change="${e=>this._up('f'+i+'_en',e.target.checked)}">
            Color <input type="color" .value="${c['f'+i+'_c']||'#ff0'}" @input="${e=>this._up('f'+i+'_c',e.target.value)}"><br>
            Tracé <input type="text" .value="${c['f'+i+'_p']||''}" @input="${e=>this._up('f'+i+'_p',e.target.value)}" style="width:100%"><br>
            Sensor Watts <input list="el" .value="${c['f'+i+'_s']||''}" @input="${e=>this._up('f'+i+'_s',e.target.value)}" style="width:100%">
          </div></details>`)}`;
      
      if(t === 'weather') return html`
        Activer <input type="checkbox" .checked="${c.weather_en}" @change="${e=>this._up('weather_en',e.target.checked)}"><br>
        Entité Météo <input list="el" .value="${c.w_ent||''}" @input="${e=>this._up('w_ent',e.target.value)}" style="width:100%"><br>
        Entité Prévision Watts <input list="el" .value="${c.f_ent||''}" @input="${e=>this._up('f_ent',e.target.value)}" style="width:100%"><br>
        X <input type="number" .value="${c.w_x}" @input="${e=>this._up('w_x',e.target.value)}"> Y <input type="number" .value="${c.w_y}" @input="${e=>this._up('w_y',e.target.value)}"><br>
        Rotation <input type="number" .value="${c.w_rot}" @input="${e=>this._up('w_rot',e.target.value)}">
      `;

      if(t === 'gen') return html`
        Largeur <input type="number" .value="${c.card_width||500}" @input="${e=>this._up('card_width',e.target.value)}">
        Hauteur <input type="number" .value="${c.card_height||400}" @input="${e=>this._up('card_height',e.target.value)}"><br>
        URL Fond <input type="text" .value="${c.background_image||''}" @input="${e=>this._up('background_image',e.target.value)}" style="width:100%"><br>
        Bordure <input type="color" .value="${c.border_color||'#333'}" @input="${e=>this._up('border_color',e.target.value)}">
      `;

      const g = {solar:['s1','s2','s3','s4','s5'], house:['h1','h2','h3','h4','h5'], bat:['b1','b2','b3']}[t];
      return (g||[]).map(p => html`
        <details style="border:1px solid #444; margin-top:2px;"><summary>${p.toUpperCase()} ${c[p+'_ent']?'✔️':''}</summary>
          <div style="padding:5px;">
            Nom <input type="text" .value="${c[p+'_name']||''}" @input="${e=>this._up(p+'_name',e.target.value)}"><br>
            Entité Instantanée <input list="el" .value="${c[p+'_ent']||''}" @input="${e=>this._up(p+'_ent',e.target.value)}" style="width:100%"><br>
            Entité Énergie Jour (kWh) <input list="el" .value="${c[p+'_ent_day']||''}" @input="${e=>this._up(p+'_ent_day',e.target.value)}" style="width:100%"><br>
            X <input type="number" .value="${c[p+'_x']}" @input="${e=>this._up(p+'_x',e.target.value)}"> Y <input type="number" .value="${c[p+'_y']}" @input="${e=>this._up(p+'_y',e.target.value)}"><br>
            Rotation <input type="number" .value="${c[p+'_rot']}" @input="${e=>this._up(p+'_rot',e.target.value)}"><br>
            ${p.startsWith('b')?html`Jauge W <input type="number" .value="${c[p+'_w']}" @input="${e=>this._up(p+'_w',e.target.value)}"> H <input type="number" .value="${c[p+'_h']}" @input="${e=>this._up(p+'_h',e.target.value)}">`:''}
          </div></details>`);
    }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V28 ULTIMATE", preview: true });
})();
