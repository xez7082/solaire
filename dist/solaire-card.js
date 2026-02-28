(function() {

/* =====================================================
   CARD PRINCIPALE
===================================================== */

class SolaireCard extends LitElement {

  static get properties(){
    return { hass:{}, config:{} };
  }

  setConfig(config){
    this.config={ card_width:1540, card_height:580, flow_speed:3, flow_th:2, ...config };
  }

  static getConfigElement(){
    return document.createElement("solaire-card-editor");
  }

  firstUpdated(){
    this._run();
  }

  disconnectedCallback(){
    super.disconnectedCallback();
    cancelAnimationFrame(this._raf);
  }

  _run(){

    const baseSpeed=(parseFloat(this.config.flow_speed)/10)||0.3;

    this._offset=(this._offset||0)+baseSpeed;

    if(this._offset>1000) this._offset=0;

    this._draw();

    this._raf=requestAnimationFrame(()=>this._run());
  }

  _draw(){

    const cv=this.renderRoot?.querySelector("#flowCanvas");
    if(!cv) return;

    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);

  }

  render(){

    const c=this.config||{};

    return html`
    <ha-card style="
      width:${c.card_width}px;
      height:${c.card_height}px;
      position:relative;
      overflow:hidden;
      background:black;
      border-radius:14px;
    ">

      <img src="${c.background_image||''}" class="bg-img">

      <canvas id="flowCanvas"
        width="${c.card_width}"
        height="${c.card_height}">
      </canvas>

      <div style="position:absolute;width:100%;height:100%;z-index:10;">
        ${this._renderItems()}
      </div>

    </ha-card>
    `;
  }

  _renderItems(){

    const c=this.config||{};

    const keys=[];

    for(let i=1;i<=10;i++){
      keys.push(`s${i}`,`h${i}`);
      if(i<=5) keys.push(`b${i}`,`w${i}`);
    }

    return keys.map(p=>this._renderItem(p));
  }

  _renderItem(p){

    const c=this.config||{};

    if(c[p+"_x"]===undefined) return "";

    const entity=this.hass?.states?.[c[p+"_ent"]];
    const val=entity?entity.state:"0";

    const textColor=c[p+"_tc"]||"#aaa";
    const valueColor=c[p+"_vc"]||"#fff";

    return html`
    <div style="
      position:absolute;
      left:${c[p+"_x"]||0}px;
      top:${c[p+"_y"]||0}px;
      width:${c[p+"_w_box"]||120}px;
      height:${c[p+"_h_box"]||60}px;
      backdrop-filter:blur(12px);
      background:rgba(15,15,15,.55);
      border-radius:12px;
      padding:8px;
      box-sizing:border-box;
    ">

      <div style="color:${textColor};
        font-size:${c[p+"_fs_l"]||10}px;
        text-align:center;">
        ${c[p+"_name"]||""}
      </div>

      <div style="color:${valueColor};
        font-size:${c[p+"_fs_v"]||15}px;
        text-align:center;
        font-weight:bold;">
        ${val}${c[p+"_u"]||""}
      </div>

    </div>
    `;
  }
}

/* =====================================================
   EDITOR PREMIUM
===================================================== */

class SolaireCardEditor extends LitElement {

  static get properties(){
    return { _config:{}, _tab:{type:String} };
  }

  constructor(){
    super();
    this._tab="gen";
  }

  setConfig(config){
    this._config=config;
  }

  _up(k,v){
    this.dispatchEvent(new CustomEvent("config-changed",{
      detail:{config:{...this._config,[k]:v}},
      bubbles:true,
      composed:true
    }));
  }

  render(){

    const tabs=[
      {id:"gen",n:"Global"},
      {id:"flow",n:"Flux"},
      {id:"solar",n:"Solar"},
      {id:"house",n:"Maison"},
      {id:"bat",n:"Batterie"}
    ];

    const ents=Object.keys(this.hass?.states||{}).sort();

    return html`

    <div style="
      background:#111;
      color:white;
      padding:16px;
      border-radius:14px;
      font-family:sans-serif;
    ">

      <div style="display:flex;gap:6px;margin-bottom:14px;">
        ${tabs.map(t=>html`
        <button @click=${()=>this._tab=t.id}
          style="
          flex:1;
          padding:10px;
          border:none;
          border-radius:8px;
          background:${this._tab===t.id?"#00ff88":"#222"};
          font-weight:bold;
          cursor:pointer;">
          ${t.n}
        </button>
        `)}
      </div>

      <div style="max-height:520px;overflow:auto;">
        ${this._renderTabContent(ents)}
      </div>

      <datalist id="e">
        ${ents.map(e=>html`<option value="${e}">`)}
      </datalist>

    </div>
    `;
  }

  _renderTabContent(ents){

    const c=this._config||{};
    const t=this._tab;

    if(t==="gen") return html`

      <div style="display:grid;gap:10px;">

        Fond URL
        <input .value=${c.background_image||""}
          @input=${e=>this._up("background_image",e.target.value)}>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <input type="number"
            placeholder="Largeur"
            .value=${c.card_width}
            @input=${e=>this._up("card_width",e.target.value)}>

          <input type="number"
            placeholder="Hauteur"
            .value=${c.card_height}
            @input=${e=>this._up("card_height",e.target.value)}>
        </div>

      </div>
    `;

    if(t==="flow") return html`
      ${Array.from({length:20},(_,i)=>i+1).map(i=>html`
        <details style="background:#222;padding:10px;border-radius:8px;margin-bottom:6px;">
          <summary>Flux ${i}</summary>

          Path SVG
          <input list="e"
            style="width:100%"
            .value=${c[`f${i}_p`]||""}
            @input=${e=>this._up(`f${i}_p`,e.target.value)}>

          Entité
          <input list="e"
            .value=${c[`f${i}_s`]||""}
            @input=${e=>this._up(`f${i}_s`,e.target.value)}>

        </details>
      `)}
    `;

    return "";
  }
}

/* =====================================================
   REGISTER CARD
===================================================== */

customElements.define("solaire-card", SolaireCard);
customElements.define("solaire-card-editor", SolaireCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:"solaire-card",
  name:"Solaire Card V2.1 Premium"
});

})();
