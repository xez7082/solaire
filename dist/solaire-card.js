(function () {

  const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
  ).prototype.constructor;

  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  /* =========================================================
     EDITOR
  ========================================================= */

  class SolaireCardEditor extends LitElement {

    static get properties() {
      return { hass: {}, _config: {}, _tab: {} };
    }

    constructor() {
      super();
      this._tab = "solar";
    }

    setConfig(config) {
      this._config = config || {};
    }

    render() {
      if (!this.hass || !this._config) return html``;

      const entities = Object.keys(this.hass.states).sort();

      return html`
        <div class="editor-container">

          <div class="nav-tabs">
            ${["solar","house","bat","flow","forecast","gen"].map(t => html`
              <button
                class="${this._tab === t ? "active" : ""}"
                @click="${() => this._tab = t}">
                ${t}
              </button>
            `)}
          </div>

          <div class="content">
            ${this._renderTabContent(entities)}
          </div>

        </div>
      `;
    }

    _renderTabContent(entities) {

      /* ---------- FLOW ---------- */

      if (this._tab === "flow") {
        return html`
          <div class="section-title">FLUX (10 Max)</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(i => html`
            <details class="group-box">
              <summary>${this._config["f"+i+"_en"] ? "🔵" : "⚪"} Flux #${i}</summary>
              <div class="group-content">

                <label>Activer</label>
                <input type="checkbox"
                  .checked="${this._config["f"+i+"_en"]}"
                  @change="${e => this._up("f"+i+"_en", e.target.checked)}">

                ${this._field("Tracé SVG", "f"+i+"_p", "text")}
                ${this._field("Sensor Puissance", "f"+i+"_s", "text", entities)}
                ${this._field("Couleur", "f"+i+"_c", "color")}

              </div>
            </details>
          `)}
        `;
      }

      /* ---------- GENERAL ---------- */

      if (this._tab === "gen") {
        return html`
          <div class="section-title">CARTE</div>
          <div class="row">
            ${this._field("Largeur", "card_width", "number")}
            ${this._field("Hauteur", "card_height", "number")}
          </div>
          ${this._field("Image de fond", "background_image", "text")}
          ${this._field("Couleur Bordure", "border_color", "color")}
        `;
      }

      /* ---------- FORECAST ---------- */

      if (this._tab === "forecast") {
        return html`
          <div class="section-title">MÉTÉO</div>

          <label>Activer</label>
          <input type="checkbox"
            .checked="${this._config.solar_forecast_enabled}"
            @change="${e => this._up("solar_forecast_enabled", e.target.checked)}">

          ${this._field("Entité Météo", "weather_entity", "text",
            entities.filter(e => e.startsWith("weather.")))}

          ${this._field("Sensor Prévision", "sensor_solar_forecast", "text",
            entities.filter(e => e.startsWith("sensor.")))}

          <div class="row">
            ${this._field("X", "solar_forecast_x", "number")}
            ${this._field("Y", "solar_forecast_y", "number")}
          </div>

          <div class="row">
            ${this._field("Icône Size", "weather_icon_size", "number")}
            ${this._field("Texte Size", "solar_forecast_size", "number")}
          </div>
        `;
      }

      /* ---------- GROUPS ---------- */

      const groups = {
        solar: ["s1","s2","s3","s4","s5"],
        house: ["h1","h2","h3","h4","h5"],
        bat: ["b1","b2","b3"]
      };

      return html`
        <div class="section-title">${this._tab}</div>
        ${groups[this._tab].map(p =>
          this._group(p, entities, this._tab === "bat")
        )}
      `;
    }

    _group(p, entities, isBat) {
      return html`
        <details class="group-box">
          <summary>${this._config[p+"_entity"] ? "✔️" : "⚪"} ${this._config[p+"_name"] || p}</summary>
          <div class="group-content">

            ${this._field("Nom", p+"_name", "text")}
            ${this._field("Sensor", p+"_entity", "text", entities)}

            <div class="row">
              ${this._field("X", p+"_x", "number")}
              ${this._field("Y", p+"_y", "number")}
            </div>

            <div class="row">
              ${this._field("Taille", p+"_size", "number")}
              ${this._field("Rot", p+"_rot", "number")}
            </div>

            ${isBat ? html`
              <div class="row">
                ${this._field("W Jauge", p+"_w", "number")}
                ${this._field("H Jauge", p+"_h", "number")}
              </div>
            ` : ""}

            ${this._field("Couleur", p+"_color", "color")}

          </div>
        </details>
      `;
    }

    _field(label, key, type, entities = null) {
      return html`
        <div class="field">
          <label>${label}</label>
          <input type="${type}"
            list="${entities ? "entitylist" : ""}"
            .value="${this._config[key] || ""}"
            @input="${e => this._up(key, e.target.value)}">
          ${entities ? html`
            <datalist id="entitylist">
              ${entities.map(e => html`<option value="${e}">`)}
            </datalist>
          ` : ""}
        </div>
      `;
    }

    _up(k, v) {
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: { ...this._config, [k]: v } },
        bubbles: true,
        composed: true
      }));
    }

    static get styles() {
      return css`
        .editor-container { padding:10px; font-size:0.8em }
        button.active { background:#00ffff }
      `;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);

  /* =========================================================
     CARD
  ========================================================= */

  class SolaireCard extends LitElement {

    static get properties() {
      return { hass: {}, config: {} };
    }

    static getConfigElement() {
      return document.createElement("solaire-card-editor");
    }

    setConfig(config) {
      this.config = config || {};
    }

    render() {
      if (!this.hass || !this.config) return html``;

      const c = this.config;
      const w = parseInt(c.card_width) || 500;
      const h = parseInt(c.card_height) || 400;

      return html`
        <ha-card style="
          width:${w}px;
          height:${h}px;
          border:1px solid ${c.border_color || "#00ffff"};
          background:${c.background_image ? `url('${c.background_image}')` : "none"};
          background-size:100% 100%;
          position:relative;
          overflow:hidden;
        ">

          <div style="position:absolute;width:100%;height:100%;z-index:2;">
            ${["s1","s2","s3","s4","s5","h1","h2","h3","h4","h5"].map(p => this._renderData(p))}
            ${["b1","b2","b3"].map(p => this._renderBat(p))}
            ${this._renderWeather()}
          </div>

          <svg style="position:absolute;width:100%;height:100%;z-index:10;"
            viewBox="0 0 ${w} ${h}">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => this._drawFlow(i))}
          </svg>

        </ha-card>
      `;
    }

    _drawFlow(i) {
      const c = this.config;
      if (!c["f"+i+"_en"] || !c["f"+i+"_p"]) return html``;

      const sensor = c["f"+i+"_s"];
      const val = sensor && this.hass.states[sensor]
        ? parseFloat(this.hass.states[sensor].state)
        : 0;

      if (!val) return html``;

      const speed = Math.max(0.5, 12 - Math.abs(val)/150);
      const color = c["f"+i+"_c"] || "#00ffff";

      return html`
        <path d="${c["f"+i+"_p"]}"
          fill="none"
          stroke="${color}"
          stroke-width="3"
          stroke-dasharray="6,20">
          <animate attributeName="stroke-dashoffset"
            from="${val >= 0 ? 100 : 0}"
            to="${val >= 0 ? 0 : 100}"
            dur="${speed}s"
            repeatCount="indefinite"/>
        </path>
      `;
    }

    _renderWeather() {
      const c = this.config;
      if (!c.solar_forecast_enabled) return html``;

      const w = c.weather_entity ? this.hass.states[c.weather_entity] : null;
      const f = c.sensor_solar_forecast ? this.hass.states[c.sensor_solar_forecast] : null;

      return html`
        <div style="position:absolute;
          left:${c.solar_forecast_x || 0}px;
          top:${c.solar_forecast_y || 0}px;
          color:#00ffff;
          font-weight:bold;">
          ${w ? html`<div>${w.state} ${w.attributes.temperature || ""}°C</div>` : ""}
          ${f ? html`<div>${f.state} W</div>` : ""}
        </div>
      `;
    }

    _renderBat(p) {
      const c = this.config;
      if (!c[p+"_entity"] || !this.hass.states[c[p+"_entity"]]) return html``;

      const soc = parseFloat(this.hass.states[c[p+"_entity"]].state) || 0;

      return html`
        <div style="position:absolute;
          left:${c[p+"_x"] || 0}px;
          top:${c[p+"_y"] || 0}px;">
          <div>${c[p+"_name"] || p}: ${soc}%</div>
          <div style="width:${c[p+"_w"] || 80}px;
            height:${c[p+"_h"] || 10}px;
            border:1px solid white;">
            <div style="width:${soc}%;
              height:100%;
              background:${soc > 20 ? "#4caf50" : "#f44336"};">
            </div>
          </div>
        </div>
      `;
    }

    _renderData(p) {
      const c = this.config;
      if (!c[p+"_entity"] || !this.hass.states[c[p+"_entity"]]) return html``;

      const s = this.hass.states[c[p+"_entity"]];

      return html`
        <div style="position:absolute;
          left:${c[p+"_x"] || 0}px;
          top:${c[p+"_y"] || 0}px;
          color:${c[p+"_color"] || "white"};
          font-size:${c[p+"_size"] || 14}px;">
          <div>${c[p+"_name"] || p}</div>
          <div>${s.state} ${s.attributes.unit_of_measurement || ""}</div>
        </div>
      `;
    }
  }

  customElements.define("solaire-card", SolaireCard);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "solaire-card",
    name: "Solaire Master V14",
    preview: true
  });

})();
