(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  class SolaireCardEditor extends LitElement {
    static get properties() { return { hass: {}, _config: {}, _tab: {} }; }
    constructor() { super(); this._tab = 'solar'; }
    setConfig(config) { this._config = config; }

    render() {
      if (!this.hass || !this._config) return html``;
      const entities = Object.keys(this.hass.states).sort();

      return html`
        <div class="editor-container">
          <div class="nav-tabs">
            <button class="${this._tab === 'solar' ? 'active' : ''}" @click="${() => this._tab = 'solar'}">☀️ Solaire</button>
            <button class="${this._tab === 'house' ? 'active' : ''}" @click="${() => this._tab = 'house'}">🏠 Maison</button>
            <button class="${this._tab === 'bat' ? 'active' : ''}" @click="${() => this._tab = 'bat'}">🔋 Bat</button>
            <button class="${this._tab === 'flow' ? 'active' : ''}" @click="${() => this._tab = 'flow'}">🌊 Flux</button>
            <button class="${this._tab === 'forecast' ? 'active' : ''}" @click="${() => this._tab = 'forecast'}">☁️ Météo</button>
            <button class="${this._tab === 'gen' ? 'active' : ''}" @click="${() => this._tab = 'gen'}">⚙️ Gen</button>
          </div>
          <div class="content">
            ${this._renderTabContent(entities)}
          </div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      if (this._tab === 'flow') {
        return html`<div class="section-title">TRAJETS DES FLUX</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>${this._config['f'+i+'_en'] ? '🔵' : '⚪'} Flux #${i}</summary>
              <div class="group-content">
                <div class="field"><label>Activer</label><input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}"></div>
                <div class="field"><label>Tracé SVG (Path)</label><input type="text" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}"></div>
                <div class="field"><label>Sensor (Vitesse)</label><input list="ents" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}"></div>
                <div class="field"><label>Couleur</label><input type="color" .value="${this._config['f'+i+'_c'] || '#00ffff'}" @input="${e => this._up('f'+i+'_c', e.target.value)}"></div>
              </div>
            </details>
          `)}<datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>`;
      }

      if (this._tab === 'forecast') {
        return html`<div class="section-title">MÉTÉO & PRÉVISIONS</div>
          <div class="field"><label>Activer</label><input type="checkbox" .checked="${this._config.solar_forecast_enabled}" @change="${e => this._up('solar_forecast_enabled', e.target.checked)}"></div>
          ${this._renderField("Entité Météo", "weather_entity", "text", entities.filter(e => e.startsWith('weather.')))}
          ${this._renderField("Sensor Prévision (W)", "sensor_solar_forecast", "text", entities.filter(e => e.startsWith('sensor.')))}
          <div class="row">${this._renderField("X", "solar_forecast_x", "number")}${this._renderField("Y", "solar_forecast_y", "number")}</div>
          <div class="row">${this._renderField("Taille Icône", "weather_icon_size", "number")}${this._renderField("Taille Texte", "solar_forecast_size", "number")}</div>
          ${this._renderField("Couleur", "solar_forecast_color", "color")}`;
      }

      if (this._tab === 'gen') {
        return html`<div class="section-title">DIMENSIONS & FOND</div>
          <div class="row">${this._renderField("Largeur Carte", "card_width", "number")}${this._renderField("Hauteur Carte", "card_height", "number")}</div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}`;
      }

      const groups = { solar: ['s1','s2','s3','s4','s5'], house: ['h1','h2','h3','h4','h5'], bat: ['b1','b2','b3'] };
      return html`<div class="section-title">${this._tab.toUpperCase()}</div>
        ${groups[this._tab].map(p => this._renderGroup(p, entities, this._tab === 'bat'))}`;
    }

    _renderGroup(p, entities, isBat) {
      return html`
        <details class="group-box">
          <summary>${this._config[p+'_entity']?'✔️':'⚪'} ${this._config[p+'_name']||p}</summary>
          <div class="group-content">
            ${this._renderField("Nom Personnalisé", p+"_name", "text")}
            ${this._renderField("Capteur (Sensor)", p+"_entity", "text", entities)}
            <div class="row">${this._renderField("Position X", p+"_x", "number")}${this._renderField("Position Y", p+"_y", "number")}</div>
            <div class="row">${this._renderField("Taille Police", p+"_size", "number")}${this._renderField("Rotation (°)", p+"_rot", "number")}</div>
            ${isBat ? html`<div class="row">${this._renderField("Largeur Jauge", p+"_w", "number")}${this._renderField("Hauteur Jauge", p+"_h", "number")}</div>`:''}
            ${this._renderField("Couleur Texte/Jauge", p+"_color", "color")}
          </div>
        </details>`;
    }

    _renderField(l, k, t, ents = null) {
      return html`<div class="field"><label>${l}</label><input type="${t}" list="${ents ? 'elists' : ''}" .value="${this._config[k]||''}" @input="${e => this._up(k, e.target.value)}">${ents ? html`<datalist id="elists">${ents.map(e => html`<option value="${e}">`)}</datalist>` : ''}</div>`;
    }

    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }

    static get styles() { return css`
      .editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}
      .nav-tabs{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:10px}
      button{background:#333;color:#eee;border:none;padding:8px;border-radius:4px;cursor:pointer;flex:1 1 30%;font-size:0.75em}
      button.active{background:#00ffff;color:black;font-weight:bold}
      .group-box{background:#252525;border:1px solid #444;margin-bottom:5px;border-radius:4px}
      summary{padding:10px;cursor:pointer;color:#00ffff;font-size:0.85em}
      .group-content{padding:10px;background:#111}
      .field{margin-bottom:10px;display:flex;flex-direction:column}
      label{font-size:0.7em;color:#aaa;margin-bottom:3px}
      input{background:#222;border:1px solid #555;color:white;padding:6px;width:100%;box-sizing:border-box}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .section-title{color:#ff00ff;font-weight:bold;margin-bottom:10px;text-transform:uppercase;font-size:0.9em}`; }
  }
  customElements.define("solaire-card-editor", SolaireCardEditor);

  class SolaireCard extends LitElement {
    static get properties() { return { hass: {}, config: {} }; }
    static getConfigElement() { return document.createElement("solaire-card-editor"); }
    setConfig(config) { this.config = config; }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      const w = c.card_width || 500;
      const h = c.card_height || 400;

      return html`
        <ha-card style="width:${w}px; height:${h}px; border:2px solid ${c.border_color||'#00ffff'}; background: url('${c.background_image}') no-repeat; background-size:100% 100%; position:relative; overflow:hidden;">
          
          <svg viewBox="0 0 ${w} ${h}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none;">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => {
              if (!c['f'+i+'_en'] || !c['f'+i+'_p']) return '';
              const s = c['f'+i+'_s'];
              const val = s && this.hass.states[s] ? parseFloat(this.hass.states[s].state) : 0;
              if (val === 0 && s) return '';
              const dur = Math.max(0.5, 12 - (Math.abs(val)/150));
              return html`<g>
                <path d="${c['f'+i+'_p']}" fill="none" stroke="${c['f'+i+'_c']}" stroke-width="4" stroke-dasharray="5,20" stroke-linecap="round">
                  <animate attributeName="stroke-dashoffset" from="${val > 0 ? 100 : 0}" to="${val > 0 ? 0 : 100}" dur="${dur}s" repeatCount="indefinite" />
                </path></g>`;
            })}
          </svg>

          <div style="position:relative; z-index:2; width:100%; height:100%;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5'].map(p => this._renderData(p))}
            ${['b1','b2','b3'].map(p => this._renderBat(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>
      `;
    }

    _renderWeather() {
      const c = this.config;
      if (!c.solar_forecast_enabled) return '';
      const w = c.weather_entity ? this.hass.states[c.weather_entity] : null;
      const f = c.sensor_solar_forecast ? this.hass.states[c.sensor_solar_forecast] : null;
      const icons = {'sunny':'mdi:weather-sunny','clear-night':'mdi:weather-night','cloudy':'mdi:weather-cloudy','fog':'mdi:weather-fog','hail':'mdi:weather-hail','lightning':'mdi:weather-lightning','lightning-rainy':'mdi:weather-lightning-rainy','partlycloudy':'mdi:weather-partly-cloudy','pouring':'mdi:weather-pouring','rainy':'mdi:weather-rainy','snowy':'mdi:weather-snowy','snowy-rainy':'mdi:weather-snowy-rainy','windy':'mdi:weather-windy'};
      
      return html`
        <div class="sensor-block" style="left:${c.solar_forecast_x}px; top:${c.solar_forecast_y}px; color:${c.solar_forecast_color || '#00FFFF'};">
          ${w ? html`<ha-icon icon="${icons[w.state] || 'mdi:weather-cloudy'}" style="--mdc-icon-size: ${c.weather_icon_size || 40}px;"></ha-icon>
          <div style="font-size:0.7em; text-align:center;">${w.attributes.temperature}°C | ${w.attributes.humidity}%</div>` : ''}
          ${f ? html`<div style="font-size:${c.solar_forecast_size || 16}px; font-weight:bold; text-align:center;">${f.state} W</div>` : ''}
        </div>`;
    }

    _renderBat(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const soc = parseFloat(this.hass.states[c[p+'_entity']].state);
      return html`<div class="sensor-block" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; transform:rotate(${c[p+'_rot']||0}deg); transform-origin: top left;">
          <div class="sensor-name">${c[p+'_name']||p}: ${soc}%</div>
          <div class="bar" style="width:${c[p+'_w']||100}px; height:${c[p+'_h']||10}px; border:1px solid ${c[p+'_color']||'white'}">
            <div style="width:${soc}%; background:${soc>20?'#4caf50':'#f44336'}; height:100%"></div>
          </div>
      </div>`;
    }

    _renderData(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      return html`<div class="sensor-block" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_color']||'white'}; font-size:${c[p+'_size']||14}px; transform:rotate(${c[p+'_rot']||0}deg); transform-origin: top left;">
          <div class="sensor-name">${c[p+'_name']||p}</div>
          <div>${s.state} <small>${s.attributes.unit_of_measurement || ''}</small></div>
      </div>`;
    }

    static get styles() { return css`
      .sensor-block{position:absolute;font-weight:bold;text-shadow:2px 2px 4px black;white-space:nowrap;line-height:1.1;display:flex;flex-direction:column;pointer-events:none}
      .sensor-name{font-size:0.65em;opacity:0.8;text-transform:uppercase}
      .bar{background:rgba(0,0,0,0.5);border-radius:2px;overflow:hidden;margin-top:2px}
    `; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V13", preview: true });
})();
