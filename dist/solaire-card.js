class SolaireCardEditor extends LitElement {

  static get properties(){
    return { _config:{}, _tab:{type:String}, _preview:{} };
  }

  constructor(){
    super();
    this._tab='gen';
    this._preview=null;
  }

  setConfig(config){
    this._config=config;
  }

  updated(){
    this._updatePreview();
  }

  _up(k,v){
    this.dispatchEvent(new CustomEvent("config-changed",{
      detail:{config:{...this._config,[k]:v}},
      bubbles:true,
      composed:true
    }));
  }

  /* -----------------------------
     LIVE PREVIEW ENGINE
  ----------------------------- */

  _updatePreview(){
    if(!this.shadowRoot) return;

    const card=this.shadowRoot.querySelector("#preview-card");
    if(!card) return;

    const c=this._config||{};

    card.style.width=(c.card_width||400)+"px";
    card.style.height=(c.card_height||250)+"px";

    card.style.backgroundImage=`url(${c.background_image||''})`;
  }

  /* -----------------------------
     RENDER
  ----------------------------- */

  render(){

    const tabs=[
      {id:'gen',n:'⚙️ Global'},
      {id:'flow',n:'⚡ Flux'},
      {id:'solar',n:'☀️ Solar'},
      {id:'house',n:'🏠 Maison'},
      {id:'bat',n:'🔋 Batterie'},
      {id:'meteo',n:'🌦️ Météo'}
    ];

    const ents=Object.keys(this.hass?.states||{}).sort();

    return html`
    <div class="editor-root">

      <div class="editor-header">
        Dashboard Solaire V2 Ultra Premium
      </div>

      <div class="editor-body">

        <div class="editor-left">

          <div class="tab-grid">
            ${tabs.map(t=>html`
              <button class="tab-btn ${this._tab===t.id?'active':''}"
                @click=${()=>this._tab=t.id}>
                ${t.n}
              </button>
            `)}
          </div>

          <div class="editor-scroll">
            ${this._renderTabContent(ents)}
          </div>

        </div>

        <div class="editor-right">

          <div id="preview-card" class="preview-card"></div>

        </div>

      </div>

      <datalist id="e">
        ${ents.map(e=>html`<option value="${e}">`)}
      </datalist>

    </div>
    `;
  }

  /* -----------------------------
     SECTION BUILDER
  ----------------------------- */

  _section(title,content){
    return html`
    <div class="section-box">
      <div class="section-title">${title}</div>
      ${content}
    </div>
    `;
  }

  _input(label,field,type='text',extra=''){

    const c=this._config||{};

    return html`
    <div class="input-group">
      <span class="input-label">${label}</span>

      <input
        ${extra}
        type=${type}
        .value=${c[field]||''}
        @input=${e=>this._up(field,e.target.value)}
      >
    </div>
    `;
  }

  /* -----------------------------
     TAB CONTENT
  ----------------------------- */

  _renderTabContent(ents){

    const c=this._config||{};
    const t=this._tab;

    /* Global */
    if(t==='gen') return this._section("Configuration générale",html`

      ${this._input("Fond d'écran URL","background_image")}

      <div class="grid-2">
        ${this._input("Largeur carte","card_width","number")}
        ${this._input("Hauteur carte","card_height","number")}
      </div>

    `);

    /* Flux */
    if(t==='flow') return this._section("Flux énergétiques",html`

      ${Array.from({length:20},(_,i)=>i+1).map(i=>html`

        <details class="accordion-box">
          <summary>Flux ${i}</summary>

          ${this._input("Path SVG",`f${i}_p`,`text`,'list="e" style="width:100%"')}
          ${this._input("Entité",`f${i}_s`,`text`,'list="e"')}

        </details>

      `)}

    `);

    const groups={
      solar:Array.from({length:10},(_,i)=>`s${i+1}`),
      house:Array.from({length:10},(_,i)=>`h${i+1}`),
      bat:Array.from({length:5},(_,i)=>`b${i+1}`),
      meteo:Array.from({length:5},(_,i)=>`w${i+1}`)
    };

    const pfx=groups[t];

    if(!pfx) return '';

    return this._section("Configuration objets",html`

      ${pfx.map(p=>html`

      <details class="accordion-box">

        <summary>${p.toUpperCase()}</summary>

        ${this._input("Nom",`${p}_name`)}
        ${this._input("Couleur texte",`${p}_tc`,`color`)}
        ${this._input("Couleur valeur",`${p}_vc`,`color`)}

        <div class="grid-2">
          ${this._input("X",`${p}_x`,`number`)}
          ${this._input("Y",`${p}_y`,`number`)}
        </div>

        <div class="grid-2">
          ${this._input("Police label",`${p}_fs_l`,`number`)}
          ${this._input("Police valeur",`${p}_fs_v`,`number`)}
        </div>

        ${this._input("Largeur boite",`${p}_w_box`,`number`)}
        ${this._input("Hauteur boite",`${p}_h_box`,`number`)}

        <div class="grid-2">
          ${this._input("Entité 1",`${p}_ent`,`text`,'list="e"')}
          ${this._input("Entité 2",`${p}_ent2`,`text`,'list="e"')}
        </div>

        <div class="grid-2">
          ${this._input("Unité 1",`${p}_u`)}
          ${this._input("Unité 2",`${p}_u2`)}
        </div>

        ${this._input("Fond",`${p}_bg`)}
        ${this._input("Néon",`${p}_bc`)}
        ${this._input("Taille icône",`${p}_img_w`,`number`)}

      </details>

      `)}

    `);
  }

  /* -----------------------------
     STYLE ULTRA PREMIUM
  ----------------------------- */

  static get styles(){
    return css`

    .editor-root{
      background:#0f0f0f;
      color:#fff;
      border-radius:16px;
      padding:18px;
      font-family:sans-serif;
    }

    .editor-header{
      text-align:center;
      font-size:20px;
      font-weight:bold;
      margin-bottom:18px;
      letter-spacing:1px;
    }

    .editor-body{
      display:grid;
      grid-template-columns:320px 1fr;
      gap:18px;
    }

    .editor-left{
      border-right:1px solid #222;
      padding-right:12px;
    }

    .editor-right{
      display:flex;
      justify-content:center;
      align-items:center;
    }

    .preview-card{
      background-size:cover;
      background-position:center;
      border-radius:14px;
      box-shadow:0 0 40px rgba(0,255,136,0.2);
      transition:all .4s ease;
    }

    .tab-grid{
      display:grid;
      gap:6px;
      margin-bottom:16px;
    }

    .tab-btn{
      padding:10px;
      border:none;
      border-radius:8px;
      background:#222;
      color:white;
      cursor:pointer;
      transition:.2s;
      font-weight:bold;
    }

    .tab-btn:hover{
      background:#333;
    }

    .tab-btn.active{
      background:#00ff88;
      color:black;
    }

    .editor-scroll{
      max-height:520px;
      overflow-y:auto;
      padding-right:6px;
    }

    .section-box{
      background:#151515;
      padding:14px;
      border-radius:12px;
      margin-bottom:12px;
    }

    .section-title{
      color:#00ff88;
      font-weight:bold;
      margin-bottom:12px;
    }

    .input-group{
      display:flex;
      flex-direction:column;
      gap:4px;
      font-size:12px;
      margin-bottom:10px;
    }

    .input-label{
      opacity:.8;
    }

    input{
      padding:7px;
      border-radius:8px;
      border:none;
      background:#222;
      color:white;
      outline:none;
    }

    .grid-2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
    }

    .accordion-box{
      background:#222;
      padding:10px;
      border-radius:10px;
      margin-bottom:8px;
    }

    summary{
      cursor:pointer;
      font-weight:bold;
      color:#00ff88;
    }

    `;

  }

}

customElements.define("solaire-card-editor", SolaireCardEditor);
