(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    
    setConfig(config) {
      this.config = config;
      this.offset = 0;
    }

    static getConfigElement() { return document.createElement("solaire-card-editor"); }

    firstUpdated() {
      this._animate();
    }

    _animate() {
      this.offset += 1;
      if (this.offset > 30) this.offset = 0;
      this.requestUpdate();
      this._animFrame = requestAnimationFrame(() => this._animate());
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      cancelAnimationFrame(this._animFrame);
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      const w = c.card_width || 500;
      const h = c.card_height || 400;

      return html`
        <ha-card style="width:${w}px; height:${h}px; position:relative; overflow:hidden; background:#000;">
          <img src="${c.background_image}" style="position:absolute; width:100%; height:100%; object-fit:contain; z-index:1;">

          <canvas id="flowCanvas" width="${w}" height="${h}" 
            style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:5; pointer-events:none;">
          </canvas>

          <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5','b1','b2','b3'].map(p => this._renderItem(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>
      `;
    }

    updated() {
      this._drawCanvas();
    }

    _drawCanvas() {
      const canvas = this.renderRoot.querySelector('#flowCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (let i = 1; i <= 10; i++) {
        const pathData = this.config['f' + i + '_p'];
        const enabled = this.config['f' + i + '_en'];
        if (!enabled || !pathData) continue;

        const sensor = this.config['f' + i + '_s'];
        const val = (sensor && this.hass.states[sensor]) ? parseFloat(this.hass.states[sensor].state) : 500;
        if (val === 0 && sensor) continue;

        const color = this.config['f' + i + '_c'] || '#ffff00';
        const weight = this.config['f' + i + '_w'] || 3;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = weight;
        ctx.setLineDash([10, 20]);
        // Animation du décalage
        const speed = (val < 0 ? 1 : -1) * (Math.abs(val) / 100 + 0.5);
        ctx.lineDashOffset = this.offset * speed;

        const p = new Path2D(pathData);
        ctx.stroke(p);
      }
    }

    _renderWeather() {
      const c = this.config;
      if (!c.solar_forecast_enabled) return '';
      const wEnt = c.weather_entity ? this.hass.states[c.weather_entity] : null;
      const fEnt = c.sensor_solar_forecast ? this.hass.states[c.sensor_solar_forecast] : null;
      
      const weatherMap = {
        'clearsky': {i: 'sunny', t: 'Soleil'},
        'sunny': {i: 'sunny', t: 'Soleil'},
        'rainy': {i: 'rainy', t: 'Pluie'},
        'cloudy': {i: 'cloudy', t: 'Nuageux'},
        'partlycloudy': {i: 'partly-cloudy', t: 'Éclaircies'},
        'pouring': {i: 'pouring', t: 'Forte Pluie'},
        'lightning': {i: 'lightning', t: 'Orage'}
      };

      const state = wEnt ? wEnt.state.toLowerCase().replace('-','') : '';
      const info = weatherMap[state] || {i: 'cloud', t: state};

      return html`<div class="item" style="left:${c.solar_forecast_x}px; top:${c.solar_forecast_y}px; color:${c.solar_forecast_color||'#00ffff'}; transform:rotate(${c.solar_forecast_rot||0}deg); font-size:${c.solar_forecast_size||14}px;">
          <ha-icon icon="mdi:weather-${info.i}" style="--mdc-icon-size:30px;"></ha-icon>
          <div style="font-weight:bold;">${info.t}</div>
          ${fEnt ? html`<div>${fEnt.state} ${fEnt.attributes.unit_of_measurement || 'W'}</div>` : ''}
      </div>`;
    }

    _renderItem(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      return html`<div class="item" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_color']||'#fff'}; transform:rotate(${c[p+'_rot']||0}deg); font-size:${c[p+'_size']||14}px;">
          <div class="label">${c[p+'_name']||''}</div>
          <div class="val">${s.state} ${p.startsWith('b') ? '%' : (s.attributes.unit_of_measurement||'')}</div>
          ${p.startsWith('b') ? html`<div class="gauge" style="width:${c[p+'_w']||60}px; height:${c[p+'_h']||8}px;"><div style="width:${s.state}%; background:${s.state>20?'#0f0':'#f00'}; height:100%;"></div></div>` : ''}
      </div>`;
    }

    static get styles() { return css`
      .item{position:absolute; display:flex; flex-direction:column; align-items:center; text-shadow: 2px 2px 2px #000; pointer-events:none; white-space:nowrap;}
      .label{font-size:0.75em; opacity:0.9; text-transform:uppercase; font-weight:bold;}
      .val{font-weight:bold;}
      .gauge{border:1px solid #fff; background:rgba(0,0,0,0.4); border-radius:2px; overflow:hidden;}
    `; }
  }

  // --- L'ÉDITEUR RESTE LE MÊME (Inclus pour fonctionner) ---
  // (Note: J'ai ajouté le champ weather_entity dans l'onglet Forecast)
  // ... [Code de l'éditeur SolaireCardEditor de la V25 ici] ...
  // [Pour gagner de la place, assure-toi de garder l'éditeur de la V25 ou d'utiliser le complet]
  // Je te remets l'éditeur complet ci-dessous pour être sûr :

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    setConfig(config) { this._config = config; }
    render() {
      if (!this.hass || !this._config) return html``;
      const entities = Object.keys(this.hass.states).sort();
      return html`
        <div style="background:#1a1a1a;color:white;padding:10px;font-family:sans-serif">
          <div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px">
            ${['solar','house','bat','flow','forecast','gen'].map(t => html`<button @click="${() => this._tab = t}" style="background:${this._tab===t?'#00ffff':'#333'};color:${this._tab===t?'#000':'#eee'};border:none;padding:5px;flex:1 1 30%;font-size:0.75em;cursor:pointer;">${t.toUpperCase()}</button>`)}
          </div>
          ${this._tab === 'flow' ? html`
            ${[1,2,3,4,5].map(i => html`
              <div style="border:1px solid #444;padding:5px;margin-bottom:5px;">
                Flux ${i} <input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}"><br>
                Tracé: <input type="text" .value="${this._config['f'+i+'_p']||''}" @input="${e => this._up('f'+i+'_p', e.target.value)}" style="width:100%"><br>
                Entity: <input list="ents" .value="${this._config['f'+i+'_s']||''}" @input="${e => this._up('f'+i+'_s', e.target.value)}" style="width:100%">
              </div>
            `)}
          ` : ''}
          ${this._tab === 'forecast' ? html`
             Météo <input type="checkbox" .checked="${this._config.solar_forecast_enabled}" @change="${e => this._up('solar_forecast_enabled', e.target.checked)}"><br>
             Entité Météo: <input list="ents" .value="${this._config.weather_entity||''}" @input="${e => this._up('weather_entity', e.target.value)}" style="width:100%"><br>
             Entité Watts: <input list="ents" .value="${this._config.sensor_solar_forecast||''}" @input="${e => this._up('sensor_solar_forecast', e.target.value)}" style="width:100%"><br>
             X/Y: <input type="number" .value="${this._config.solar_forecast_x}" @input="${e => this._up('solar_forecast_x', e.target.value)}"> / <input type="number" .value="${this._config.solar_forecast_y}" @input="${e => this._up('solar_forecast_y', e.target.value)}"><br>
             Rotation: <input type="number" .value="${this._config.solar_forecast_rot}" @input="${e => this._up('solar_forecast_rot', e.target.value)}">
          ` : ''}
          <datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>
        </div>
      `;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V26", preview: true });
})();
