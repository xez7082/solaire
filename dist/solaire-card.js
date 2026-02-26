(function () {
  const LitElementBase = customElements.get("ha-panel-lovelace");
  const LitElement = LitElementBase
    ? Object.getPrototypeOf(LitElementBase.prototype).constructor
    : Object.getPrototypeOf(customElements.get("hui-view")).constructor;

  const html = LitElement.prototype.html || window.LitElement.prototype.html;
  const css = LitElement.prototype.css || window.LitElement.prototype.css;

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
            ${["solar", "house", "bat", "flow", "forecast", "gen"].map(
              (t) => html`
                <button
                  class="${this._tab === t ? "active" : ""}"
                  @click="${() => (this._tab = t)}"
                >
                  ${t}
                </button>
              `
            )}
          </div>
          <div class="content">
            ${this._renderTabContent(entities)}
          </div>
        </div>
      `;
    }

    _renderTabContent(entities) {
      if (this._tab === "flow") {
        return html`
          <div class="section-title">FLUX (10 Max)</div>
          ${[1,2,3,4,5,6,7,8,9,10].map(
            (i) => html`
              <details class="group-box">
                <summary>
                  ${this._config["f"+i+"_en"] ? "🔵" : "⚪"} Flux #${i}
                </summary>
                <div class="group-content">
                  <label>Activer</label>
                  <input
                    type="checkbox"
                    .checked="${this._config["f"+i+"_en"]}"
                    @change="${(e) =>
                      this._up("f"+i+"_en", e.target.checked)}"
                  />

                  ${this._renderField(
                    "Tracé SVG",
                    "f"+i+"_p",
                    "text"
                  )}

                  ${this._renderField(
                    "Sensor Puissance",
                    "f"+i+"_s",
                    "text",
                    entities
                  )}

                  ${this._renderField(
                    "Couleur",
                    "f"+i+"_c",
                    "color"
                  )}
                </div>
              </details>
            `
          )}
        `;
      }

      if (this._tab === "gen") {
        return html`
          <div class="section-title">CARTE</div>
          <div class="row">
            ${this._renderField("Largeur", "card_width", "number")}
            ${this._renderField("Hauteur", "card_height", "number")}
          </div>
          ${this._renderField("Image de fond (URL)", "background_image", "text")}
          ${this._renderField("Couleur Bordure", "border_color", "color")}
        `;
      }

      const groups = {
        solar: ["s1","s2","s3","s4","s5"],
        house: ["h1","h2","h3","h4","h5"],
        bat: ["b1","b2","b3"]
      };

      if (this._tab === "forecast") {
        return html`
          <div class="section-title">MÉTÉO</div>
          <label>Activer</label>
          <input
            type="checkbox"
            .checked="${this._config.solar_forecast_enabled}"
            @change="${(e) =>
              this._up("solar_forecast_enabled", e.target.checked)}"
          />
          ${this._renderField(
            "Entité Météo",
            "weather_entity",
            "text",
            entities.filter((e) => e.startsWith("weather."))
          )}
          ${this._renderField(
            "Sensor Prévision",
            "sensor_solar_forecast",
            "text",
            entities.filter((e) => e.startsWith("sensor."))
          )}
        `;
      }

      return html`
        <div class="section-title">${this._tab}</div>
        ${groups[this._tab].map((p) =>
          this._renderGroup(p, entities, this._tab === "bat")
        )}
      `;
    }

    _renderGroup(p, entities, isBat) {
      return html`
        <details class="group-box">
          <summary>
            ${this._config[p+"_entity"] ? "✔️" : "⚪"}
            ${this._config[p+"_name"] || p}
          </summary>
          <div class="group-content">
            ${this._renderField("Nom", p+"_name", "text")}
            ${this._renderField("Sensor", p+"_entity", "text", entities)}
            <div class="row">
              ${this._renderField("X", p+"_x", "number")}
              ${this._renderField("Y", p+"_y", "number")}
            </div>
            ${isBat
              ? html`
                  <div class="row">
                    ${this._renderField("W", p+"_w", "number")}
                    ${this._renderField("H", p+"_h", "number")}
                  </div>
                `
              : ""}
            ${this._renderField("Couleur", p+"_color", "color")}
          </div>
        </details>
      `;
    }

    _renderField(label, key, type, entities = null) {
      return html`
        <div class="field">
          <label>${label}</label>
          <input
            type="${type}"
            list="${entities ? "entitylist" : ""}"
            .value="${this._config[key] || ""}"
            @input="${(e) => this._up(key, e.target.value)}"
          />
          ${entities
            ? html`
                <datalist id="entitylist">
                  ${entities.map((e) => html`<option value="${e}">`)}
                </datalist>
              `
            : ""}
        </div>
      `;
    }

    _up(k, v) {
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: { ...this._config, [k]: v } },
          bubbles: true,
          composed: true,
        })
      );
    }

    static get styles() {
      return css`
        .editor-container { padding:10px }
        button.active { background:#00ffff }
      `;
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);

})();
