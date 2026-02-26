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
            ${['solar','house','bat','flow','forecast','gen'].map(t => html`
              <button class="${this._tab === t ? 'active' : ''}" @click="${() => this._tab = t}">${t}</button>
            `)}
          </div>
          <div class="content">${this._renderTabContent(entities)}</div>
        </div>
      `;
    }
    _renderTabContent(entities) {
      if (this._tab === 'flow') {
        return html`<div class="section-title">FLUX (10 Max)</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>${this._config['f'+i+'_en'] ? '🔵' : '⚪'} Flux #${i}</summary>
              <div class="group-content">
                <label>Activer</label><input type="checkbox" .checked="${this._config['f'+i+'_en']}" @change="${e => this._up('f'+i+'_en', e.target.checked)}">
                <div class="field"><label>Tracé SVG (ex: M 193 201 L 415 270)</label><input type="text" .value="${this._config['f'+i+'_p'] || ''}" @input="${e => this._up('f'+i+'_p', e.target.value)}"></div>
                <div class="field"><label>Sensor Puissance (W)</label><input list="ents" .value="${this._config['f'+i+'_s'] || ''}" @input="${e => this._up('f'+i+'_s', e.target.value)}"></div>
                <div class="field"><label>Couleur</label><input type="color" .value="${this._config['f'+i+'_c'] || '#00ffff'}" @input="${e => this._up('f'+i+'_c', e.target.value)}"></div>
                <div class="field"><label>Épaisseur</label><input type="number" min="1" max="10" .value="${this._config['f'+i+'_w'] || 3}" @input="${e => this._up('f'+i+'_w', e.target.value)}"></div>
              </div>
            </details>
          `)}<datalist id="ents">${entities.map(e => html`<option value="${e}">`)}</datalist>`;
      }
      if (this._tab === 'gen') {
        return html`<div class="section-title">CARTE</div>
          <div class="row">${this._renderField("Largeur", "card_width", "number")}${this._renderField("Hauteur", "card_height", "number")}</div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}`;
      }
      const groups = { solar: ['s1','s2','s3','s4','s5'], house: ['h1','h2','h3','h4','h5'], bat: ['b1','b2','b3'], forecast: [] };
      if (this._tab === 'forecast') {
        return html`<div class="section-title">MÉTÉO</div>
          <label>Activer</label><input type="checkbox" .checked="${this._config.solar_forecast_enabled}" @change="${e => this._up('solar_forecast_enabled', e.target.checked)}">
          ${this._renderField("Entité Météo", "weather_entity", "text", entities.filter(e => e.startsWith('weather.')))}
          ${this._renderField("Sensor Prévision", "sensor_solar_forecast", "text", entities.filter(e => e.startsWith('sensor.')))}
          <div class="row">${this._renderField("X", "solar_forecast_x", "number")}${this._renderField("Y", "solar_forecast_y", "number")}</div>
          <div class="row">${this._renderField("Icône Size", "weather_icon_size", "number")}${this._renderField("Texte Size", "solar_forecast_size", "number")}</div>`;
      }
      return html`<div class="section-title">${this._tab}</div>${groups[this._tab].map(p => this._renderGroup(p, entities, this._tab === 'bat'))}`;
    }
    _renderGroup(p, entities, isBat) {
      return html`<details class="group-box"><summary>${this._config[p+'_entity']?'✔️':'⚪'} ${this._config[p+'_name']||p}</summary>
        <div class="group-content">
          ${this._renderField("Nom", p+"_name", "text")}
          ${this._renderField("Sensor", p+"_entity", "text", entities)}
          <div class="row">${this._renderField("X", p+"_x", "number")}${this._renderField("Y", p+"_y", "number")}</div>
          <div class="row">${this._renderField("Taille", p+"_size", "number")}${this._renderField("Rot", p+"_rot", "number")}</div>
          ${isBat ? html`<div class="row">${this._renderField("W Jauge", p+"_w", "number")}${this._renderField("H Jauge", p+"_h", "number")}</div>`:''}
          ${this._renderField("Couleur", p+"_color", "color")}
        </div></details>`;
    }
    _renderField(l, k, t, ents = null) {
      return html`<div class="field"><label>${l}</label><input type="${t}" list="${ents ? 'elists' : ''}" .value="${this._config[k]||''}" @input="${e => this._up(k, e.target.value)}">${ents ? html`<datalist id="elists">${ents.map(e => html`<option value="${e}">`)}</datalist>` : ''}</div>`;
    }
    _up(k, v) { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [k]: v } }, bubbles: true, composed: true })); }
    static get styles() { return css`.editor-container{background:#1a1a1a;color:white;padding:10px;font-family:sans-serif}.nav-tabs{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px}button{background:#333;color:#eee;border:none;padding:5px;cursor:pointer;flex:1 1 30%;font-size:0.7em}button.active{background:#00ffff;color:black}.group-box{background:#252525;border:1px solid #444;margin-bottom:5px}summary{padding:5px;cursor:pointer;color:#00ffff;font-size:0.8em}.group-content{padding:5px;background:#111}.field{margin-bottom:5px;display:flex;flex-direction:column}label{font-size:0.65em;color:#aaa}input{background:#222;border:1px solid #555;color:white;padding:4px}.row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.section-title{color:#ff00ff;font-weight:bold;font-size:0.8em;text-transform:uppercase}`; }
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
        <ha-card style="width:${w}px; height:${h}px; border:1px solid ${c.border_color||'#00ffff'}; background: url('${c.background_image}') no-repeat center center; background-size:cover; position:relative; overflow:hidden;">
          
          <!-- Couche SVG pour les flux (en dessous) -->
          <svg style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none;" viewBox="0 0 ${w} ${h}">
            <defs>
              <!-- Flèches directionnelles -->
              <marker id="arrowEnd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
              
              <!-- Effet glow -->
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            ${[1,2,3,4,5,6,7,8,9,10].map(i => this._drawFlow(i))}
          </svg>

          <!-- Couche données (au-dessus) -->
          <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">
            ${['s1','s2','s3','s4','s5','h1','h2','h3','h4','h5'].map(p => this._renderData(p))}
            ${['b1','b2','b3'].map(p => this._renderBat(p))}
            ${this._renderWeather()}
          </div>
        </ha-card>
      `;
    }

    _drawFlow(i) {
      const c = this.config;
      if (!c['f'+i+'_en'] || !c['f'+i+'_p']) return html``;
      
      const pathData = c['f'+i+'_p'];
      const sensorId = c['f'+i+'_s'];
      const color = c['f'+i+'_c'] || '#00ffff';
      const width = parseFloat(c['f'+i+'_w']) || 3;
      
      // Récupérer la valeur du sensor
      let val = 0;
      let hasData = false;
      if (sensorId && this.hass.states[sensorId]) {
        const state = this.hass.states[sensorId];
        val = parseFloat(state.state);
        if (isNaN(val)) val = 0;
        hasData = true;
      }
      
      // Si pas de sensor configuré, afficher animation de démo
      if (!hasData) val = 500;
      
      // Ne rien afficher si le sensor existe mais vaut 0
      if (hasData && val === 0) return html``;
      
      // Calcul de la vitesse basée sur la puissance
      // Plus la puissance est élevée, plus c'est rapide
      const absVal = Math.abs(val);
      const speed = Math.max(1, 8 - (absVal / 400));
      
      // Direction : si négatif, inverser le sens
      const isReverse = val < 0;
      
      // Taille des particules
      const dashLength = 12;
      const gapLength = 35;
      const totalDash = dashLength + gapLength;
      
      return html`
        <g>
          <!-- Ligne de base (statique, semi-transparente) -->
          <path 
            d="${pathData}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="${width * 0.6}" 
            stroke-opacity="0.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          
          <!-- Ligne animée (particules en mouvement) -->
          <path 
            d="${pathData}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="${width}" 
            stroke-dasharray="${dashLength},${gapLength}" 
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#glow)"
            marker-end="url(#arrowEnd)"
          >
            <!-- Animation du déplacement -->
            <animate 
              attributeName="stroke-dashoffset" 
              from="${isReverse ? -totalDash : totalDash}" 
              to="${isReverse ? totalDash : -totalDash}" 
              dur="${speed}s" 
              repeatCount="indefinite" 
            />
            
            <!-- Pulsation de l'opacité pour effet vivant -->
            <animate
              attributeName="stroke-opacity"
              values="0.8;1;0.8"
              dur="${speed * 0.5}s"
              repeatCount="indefinite"
            />
          </path>
          
          <!-- Affichage de la puissance au milieu du tracé -->
          ${hasData ? html`
            <text 
              font-size="11" 
              font-weight="bold" 
              fill="${color}"
              text-anchor="middle"
              filter="url(#glow)"
            >
              <textPath href="#flowPath${i}" startOffset="50%">
                ${absVal.toFixed(0)} W ${isReverse ? '◄' : '►'}
              </textPath>
            </text>
            <path id="flowPath${i}" d="${pathData}" fill="none" stroke="none" />
          ` : ''}
        </g>
      `;
    }

    _renderWeather() {
      const c = this.config;
      if (!c.solar_forecast_enabled) return '';
      const w = c.weather_entity ? this.hass.states[c.weather_entity] : null;
      const f = c.sensor_solar_forecast ? this.hass.states[c.sensor_solar_forecast] : null;
      const icons = {'sunny':'mdi:weather-sunny','clear-night':'mdi:weather-night','cloudy':'mdi:weather-cloudy','fog':'mdi:weather-fog','hail':'mdi:weather-hail','lightning':'mdi:weather-lightning','lightning-rainy':'mdi:weather-lightning-rainy','partlycloudy':'mdi:weather-partly-cloudy','pouring':'mdi:weather-pouring','rainy':'mdi:weather-rainy','snowy':'mdi:weather-snowy','snowy-rainy':'mdi:weather-snowy-rainy','windy':'mdi:weather-windy','windy-variant':'mdi:weather-windy-variant'};
      return html`<div class="sensor-block" style="left:${c.solar_forecast_x}px; top:${c.solar_forecast_y}px; color:${c.solar_forecast_color || '#00FFFF'}; text-align:center;">
          ${w ? html`<ha-icon icon="${icons[w.state]||'mdi:weather-cloudy'}" style="--mdc-icon-size:${c.weather_icon_size||40}px;"></ha-icon><div style="font-size:0.7em;">${w.attributes.temperature}°C</div>`:''}
          ${f ? html`<div style="font-size:${c.solar_forecast_size||16}px; font-weight:bold;">${f.state} W</div>`:''}
      </div>`;
    }

    _renderBat(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const soc = parseFloat(this.hass.states[c[p+'_entity']].state);
      const clampedSoc = Math.max(0, Math.min(100, soc));
      return html`<div class="sensor-block" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; transform:rotate(${c[p+'_rot']||0}deg); transform-origin:top left;">
          <div class="sensor-name">${c[p+'_name']||p}: ${soc.toFixed(0)}%</div>
          <div class="bar" style="width:${c[p+'_w']||80}px; height:${c[p+'_h']||10}px; border:1px solid ${c[p+'_color']||'white'}">
            <div style="width:${clampedSoc}%; background:${soc>20?'#4caf50':'#f44336'}; height:100%; transition:width 0.5s ease"></div>
          </div>
      </div>`;
    }

    _renderData(p) {
      const c = this.config;
      if(!c[p+'_entity'] || !this.hass.states[c[p+'_entity']]) return '';
      const s = this.hass.states[c[p+'_entity']];
      return html`<div class="sensor-block" style="left:${c[p+'_x']}px; top:${c[p+'_y']}px; color:${c[p+'_color']||'white'}; font-size:${c[p+'_size']||14}px; transform:rotate(${c[p+'_rot']||0}deg); transform-origin:top left;">
          <div class="sensor-name">${c[p+'_name']||p}</div><div>${s.state} <small>${s.attributes.unit_of_measurement||''}</small></div>
      </div>`;
    }

    static get styles() { return css`.sensor-block{position:absolute;font-weight:bold;text-shadow:2px 2px 4px rgba(0,0,0,0.8);white-space:nowrap;line-height:1.2;display:flex;flex-direction:column;pointer-events:none}.sensor-name{font-size:0.65em;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px}.bar{background:rgba(0,0,0,0.6);border-radius:3px;overflow:hidden;margin-top:2px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.5)}`; }
  }
  customElements.define("solaire-card", SolaireCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "solaire-card", name: "Solaire Master V15", preview: true });
  console.info('%c SOLAIRE-CARD %c v15 ', 'color:white;background:#00d4ff;font-weight:bold', 'color:#00d4ff;background:white;font-weight:bold');
})();
