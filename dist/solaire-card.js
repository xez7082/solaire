class SolaireCard extends HTMLElement {

  constructor(){
    super();
    this._raf=null;
    this._energyMap=new Map();
    this._frameTime=0;
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

  /* =========================
     SMOOTH ENERGY ENGINE
  ========================= */

  _lerp(a,b,t){
    return a+(b-a)*t;
  }

  _animate(){

    const canvas=this.querySelector("canvas");

    if(canvas && this._hass){

      const ctx=canvas.getContext("2d");
      const c=this._config||{};

      const now=performance.now();
      const dt=Math.min((now-this._frameTime)/16,1);
      this._frameTime=now;

      ctx.clearRect(0,0,canvas.width,canvas.height);

      for(let i=1;i<=20;i++){

        const path=c[`f${i}_p`];
        const entity=c[`f${i}_s`];

        if(!path || !entity) continue;

        const state=parseFloat(this._hass.states[entity]?.state)||0;

        const prev=this._energyMap.get(i)||0;
        const smooth=this._lerp(prev,state,0.08);

        this._energyMap.set(i,smooth);

        const glow=Math.min(Math.abs(smooth)/1000,1)*25+6;
        const color=smooth>=0 ? "#00ff88" : "#ff4444";

        try{

          const svgPath=new Path2D(path);

          ctx.save();

          ctx.strokeStyle=color;
          ctx.lineWidth=3;
          ctx.shadowBlur=glow;
          ctx.shadowColor=color;
          ctx.globalAlpha=0.95;

          ctx.stroke(svgPath);

          ctx.restore();

        }catch{}
      }
    }

    this._raf=requestAnimationFrame(()=>this._animate());
  }

  /* =========================
     RENDER CORE
  ========================= */

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
      border-radius:22px;
      background:black;
      box-shadow:0 0 50px rgba(0,255,136,.12);
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
              style="
              position:absolute;
              z-index:5;
              pointer-events:none">
      </canvas>

      <div style="
        position:absolute;
        inset:0;
        backdrop-filter:blur(18px);
        background:rgba(0,0,0,.38);
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

  /* =========================
     OBJECT RENDERER
  ========================= */

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

      const textColor=c[`s${i}_tc`]||"#aaa";
      const valueColor=c[`s${i}_vc`]||"#fff";

      html+=`
      <div style="
        position:absolute;
        left:${c[`s${i}_x`]||0}px;
        top:${c[`s${i}_y`]||0}px;
        width:${c[`s${i}_w_box`]||120}px;
        height:${c[`s${i}_h_box`]||60}px;
        backdrop-filter:blur(14px);
        background:rgba(25,25,25,.55);
        border-radius:16px;
        padding:8px;
        text-align:center;
        z-index:20;
        transition:transform .2s;
      ">

        <div style="
          color:${textColor};
          font-size:${c[`s${i}_fs_l`]||10}px;
        ">
          ${c[`s${i}_name`]||""}
        </div>

        <div style="
          color:${valueColor};
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

/* =========================
   REGISTER CARD
========================= */

customElements.define("solaire-card", SolaireCard);

window.customCards = window.customCards || [];

window.customCards.push({
  type:"solaire-card",
  name:"Solaire Card Absolute God Mode"
});
