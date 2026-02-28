class SolaireCard extends HTMLElement {

  constructor(){
    super();
    this._raf=null;
  }

  setConfig(config){
    this._config={...config};
  }

  set hass(hass){
    this._hass=hass;
    this._render();
  }

  connectedCallback(){
    this.style.display="block";
    this._animate();
  }

  disconnectedCallback(){
    cancelAnimationFrame(this._raf);
  }

  /* ===============================
     ANIMATION SAFE LOOP
  =============================== */

  _animate(){

    const canvas=this.querySelector("canvas");

    if(canvas && this._hass){

      const ctx=canvas.getContext("2d");
      const c=this._config||{};

      ctx.clearRect(0,0,canvas.width,canvas.height);

      for(let i=1;i<=20;i++){

        const path=c[`f${i}_p`];
        const entity=c[`f${i}_s`];

        if(!path || !entity) continue;

        const state=parseFloat(
          this._hass.states[entity]?.state
        )||0;

        const color=state>=0 ? "#00ff88" : "#ff4444";

        try{

          const svgPath=new Path2D(path);

          ctx.save();

          ctx.strokeStyle=color;
          ctx.lineWidth=3;
          ctx.shadowBlur=12;
          ctx.shadowColor=color;
          ctx.globalAlpha=0.9;

          ctx.stroke(svgPath);

          ctx.restore();

        }catch{}
      }
    }

    this._raf=requestAnimationFrame(()=>this._animate());
  }

  /* ===============================
     RENDER CARD
  =============================== */

  _render(){

    if(!this._hass || !this._config) return;

    const c=this._config;

    const width=c.card_width||1200;
    const height=c.card_height||600;

    this.innerHTML=`
    <ha-card style="
      width:${width}px;
      height:${height}px;
      position:relative;
      overflow:hidden;
      border-radius:18px;
      background:black;
      --ha-card-background:transparent !important;
    ">

      <img src="${c.background_image||''}"
        style="
        position:absolute;
        width:100%;
        height:100%;
        object-fit:cover;
      ">

      <canvas width="${width}"
              height="${height}"
              style="position:absolute;z-index:5">
      </canvas>

      <div style="
        position:absolute;
        inset:0;
        backdrop-filter:blur(10px);
        background:rgba(0,0,0,.35);
        z-index:8;
      "></div>

      <div style="
        position:absolute;
        inset:0;
        z-index:15;
      ">
        ${this._renderObjects()}
      </div>

    </ha-card>
    `;
  }

  /* ===============================
     OBJECT RENDERER
  =============================== */

  _renderObjects(){

    const c=this._config||{};
    const hass=this._hass;

    if(!hass) return "";

    let html="";

    for(let i=1;i<=10;i++){

      const entity=c[`s${i}_ent`];
      if(!entity) continue;

      const state=hass.states[entity];
      if(!state) continue;

      html+=`
      <div style="
        position:absolute;
        left:${c[`s${i}_x`]||0}px;
        top:${c[`s${i}_y`]||0}px;
        width:${c[`s${i}_w_box`]||120}px;
        height:${c[`s${i}_h_box`]||60}px;
        backdrop-filter:blur(12px);
        background:rgba(20,20,20,.55);
        border-radius:14px;
        padding:8px;
        text-align:center;
        z-index:20;
      ">

        <div style="
          color:${c[`s${i}_tc`]||"#aaa"};
          font-size:${c[`s${i}_fs_l`]||10}px;
        ">
          ${c[`s${i}_name`]||""}
        </div>

        <div style="
          color:${c[`s${i}_vc`]||"#fff"};
          font-size:${c[`s${i}_fs_v`]||16}px;
          font-weight:900;
        ">
          ${state.state}${c[`s${i}_u`]||""}
        </div>

      </div>
      `;
    }

    return html;
  }
}

/* ===============================
   EDITOR VISUAL SIMPLE
=============================== */

class SolaireCardEditor extends HTMLElement {

  setConfig(config){
    this._config=config;
    this._render();
  }

  _render(){

    const c=this._config||{};

    this.innerHTML=`
    <div style="padding:16px;background:#111;color:white;border-radius:14px;font-family:sans-serif">

      <h3 style="margin-top:0">Éditeur Solaire</h3>

      Fond image
      <input style="width:100%"
        value="${c.background_image||""}"
        oninput="this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...${JSON.stringify(c)},background_image:this.value}},bubbles:true,composed:true}))">

    </div>
    `;
  }
}

/* ===============================
   REGISTER COMPONENT
=============================== */

customElements.define("solaire-card", SolaireCard);
customElements.define("solaire-card-editor", SolaireCardEditor);

window.customCards = window.customCards || [];

window.customCards.push({
  type:"solaire-card",
  name:"Solaire Card V5 Pro Stable"
});
