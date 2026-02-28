(function() {
  const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")).prototype.constructor;
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  const METEO_FR = {
    'clear-night':'Nuit claire','cloudy':'Nuageux','fog':'Brouillard','hail':'Grêle',
    'lightning':'Orages','lightning-rain':'Orages pluvieux','partlycloudy':'Partiellement nuageux',
    'pouring':'Averses','rainy':'Pluvieux','snowy':'Neigeux','snowy-rainy':'Pluie et neige',
    'sunny':'Ensoleillé','windy':'Venteux','windy-variant':'Venteux','exceptional':'Exceptionnel'
  };

  class SolaireCard extends LitElement {

    static get properties(){ return { hass:{}, config:{} }; }

    setConfig(config){
      this.config = { card_width:1540, card_height:580, flow_speed:3, flow_th:2, ...config };
    }

    static getConfigElement(){
      return document.createElement("solaire-card-editor");
    }

    firstUpdated(){ this._run(); }

    disconnectedCallback(){
      super.disconnectedCallback();
      cancelAnimationFrame(this._f);
    }

    _run(){

      const baseSpeed=(parseFloat(this.config.flow_speed)/10)||0.3;
      const randomDrift=(Math.random()-0.5)*0.2;

      let surge=0;
      if(Math.random()<0.02) surge=Math.random()*4;

      let drop=1;
      if(Math.random()<0.01) drop=0;

      this._offset=(this._offset||0)+(baseSpeed+randomDrift+surge)*drop;

      if(this._offset>1000||this._offset<-1000) this._offset=0;

      this._draw();

      this._f=requestAnimationFrame(()=>this._run());
    }

    _draw(){

      const cv=this.renderRoot.querySelector('#flowCanvas');
      if(!cv) return;

      const ctx=cv.getContext('2d');
      ctx.clearRect(0,0,cv.width,cv.height);

      const c=this.config;

      for(let i=1;i<=20;i++){

        const pD=c[`f${i}_p`];
        const s=c[`f${i}_s`];

        if(!pD || !this.hass?.states?.[s]) continue;

        const v=parseFloat(this.hass.states[s].state)||0;
        if(Math.abs(v)<=(c.flow_th||2)) continue;

        const tempPath=document.createElementNS("http://www.w3.org/2000/svg","path");
        tempPath.setAttribute("d",pD);

        try{

          const pathLen=tempPath.getTotalLength();
          const speedFactor=Math.min(Math.abs(v)/1000,3);

          const progress=(this._offset*(15+speedFactor*10))%pathLen;

          const dir=v<0?-1:1;
          const basePos=dir<0?pathLen-progress:progress;

          let color=c[`f${i}_c`]||'#00ffff';

          if(!c[`f${i}_c`]){
            if(v>0) color='#00ff88';
            if(v<0) color='#ff4444';
          }

          const flicker=0.7+Math.random()*0.6;

          ctx.save();

          for(let t=0;t<6;t++){

            const trailOffset=t*12;
            const trailPos=dir<0?basePos-trailOffset:basePos+trailOffset;

            if(trailPos<0||trailPos>pathLen) continue;

            const pt=tempPath.getPointAtLength(trailPos);

            ctx.globalAlpha=(1-t/6)*flicker;

            ctx.shadowBlur=(c[`f${i}_w`]||4)*6;
            ctx.shadowColor=color;

            ctx.fillStyle=color;

            ctx.beginPath();
            ctx.arc(pt.x,pt.y,(c[`f${i}_w`]||4)-t*0.5,0,Math.PI*2);
            ctx.fill();
          }

          ctx.restore();

        }catch{}
      }
    }

    render(){

      const c=this.config;
      const keys=[];

      for(let i=1;i<=10;i++){
        keys.push(`s${i}`,`h${i}`);
        if(i<=5) keys.push(`b${i}`,`w${i}`);
      }

      return html`
        <ha-card style="width:${c.card_width}px;height:${c.card_height}px;background:#000;position:relative;overflow:hidden;border:none;">
          <img src="${c.background_image}" class="bg-img">
          <canvas id="flowCanvas" width="${c.card_width}" height="${c.card_height}"></canvas>

          <div class="layer">
            ${keys.map(p=>this._renderItem(p))}
          </div>
        </ha-card>
      `;
    }

    _renderItem(p){

      const c=this.config;

      if(c[p+'_x']===undefined||c[p+'_y']===undefined) return '';

      const s1=this.hass?.states?.[c[p+'_ent']];
      const s2=this.hass?.states?.[c[p+'_ent2']];

      let val1=s1?s1.state:'0';
      let iconMeteo=null;

      if(p.startsWith('w')&&s1){
        const rawState=val1.toLowerCase().replace('-','');
        val1=METEO_FR[rawState]||METEO_FR[val1]||val1;
        iconMeteo=`hass:weather-${s1.state.replace('partlycloudy','partly-cloudy')}`;
      }

      const val2=s2?s2.state:null;

      const isProduction=!p.startsWith('w')&&parseFloat(val1)>0;

      const bCol=c[p+'_bc']||'#4caf50';
      const isTransBorder=bCol==='transparent'||bCol==='none';

      return html`
        <div class="item-box"
          style="
            left:${c[p+'_x']}px;
            top:${c[p+'_y']}px;
            width:${c[p+'_w_box']||120}px;
            height:${c[p+'_h_box']||'auto'}px;
            --neon-color:${bCol};
            --border-thickness:${isTransBorder?0:(c[p+'_b_w']||2)}px;
            border-radius:${c[p+'_br']||12}px;
          ">

          <div class="inner-card"
            style="background:${c[p+'_bg']||'rgba(15,15,15,0.55)'};border-radius:${c[p+'_br']||12}px;">

            ${!p.startsWith('w')?html`
              <div class="production-dot ${isProduction?'prod-on':'prod-off'}"></div>
            `:''}

            ${iconMeteo?html`
              <ha-icon icon="${iconMeteo}"
                style="margin-right:12px;--mdc-icon-size:${c[p+'_img_w']||35}px;color:#fff;flex-shrink:0;">
              </ha-icon>
            `:''}

            <div class="content">

              ${c[p+'_img']&&!p.startsWith('w')
                ?html`<img src="${c[p+'_img']}" width="${c[p+'_img_w']||35}" style="margin-bottom:4px;">`
                :''}

              <div class="label"
                style="color:${c[p+'_tc']||'#aaa'};font-size:${c[p+'_fs_l']||10}px;">
                ${c[p+'_name']||''}
              </div>

              <div class="value"
                style="color:${c[p+'_vc']||'#fff'};font-size:${c[p+'_fs_v']||15}px;">
                ${val1}${c[p+'_u']||''}
              </div>

              ${val2!==null?html`
                <div class="value2"
                  style="color:${c[p+'_v2c']||'#4caf50'};font-size:${c[p+'_fs_v2']||12}px;">
                  ${val2}${c[p+'_u2']||''}
                </div>
              `:''}

            </div>
          </div>
        </div>
      `;
    }

    static get styles(){
      return css`

      ha-card{
        position:relative;
        overflow:hidden;
      }

      .bg-img{
        position:absolute;
        width:100%;
        height:100%;
        object-fit:cover;
        z-index:1;
      }

      #flowCanvas{
        position:absolute;
        z-index:5;
        pointer-events:none;
      }

      .layer{
        position:absolute;
        width:100%;
        height:100%;
        z-index:10;
        pointer-events:none;
      }

      .item-box{
        position:absolute;
        padding:var(--border-thickness);
        display:flex;
        box-sizing:border-box;
        pointer-events:auto;
      }

      .inner-card{
        display:flex;
        align-items:center;
        justify-content:center;
        padding:10px;
        width:100%;
        height:100%;
        box-sizing:border-box;

        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);

        background:rgba(15,15,15,0.55);
      }

      .production-dot{
        position:absolute;
        top:6px;
        right:6px;
        width:10px;
        height:10px;
        border-radius:50%;
      }

      .prod-on{
        background:#00ff88;
        animation:blink 1s infinite alternate;
      }

      .prod-off{
        background:#ff4444;
        animation:blink 1s infinite alternate;
      }

      @keyframes blink{
        from{opacity:1;}
        to{opacity:0.3;}
      }

      `;
    }
  }

  class SolaireCardEditor extends LitElement {

    static get properties(){
      return { _config:{}, _tab:{type:String} };
    }

    constructor(){
      super();
      this._tab='gen';
    }

    setConfig(config){ this._config=config; }

    _up(k,v){
      this.dispatchEvent(new CustomEvent("config-changed",{
        detail:{config:{...this._config,[k]:v}},
        bubbles:true,
        composed:true
      }));
    }

    render(){

      const tabs=[
        {id:'gen',n:'Global'},
        {id:'flow',n:'Câbles'},
        {id:'solar',n:'Panneaux'},
        {id:'house',n:'Charges'},
        {id:'bat',n:'Batteries'},
        {id:'meteo',n:'Météo'}
      ];

      const ents=Object.keys(this.hass?.states||{}).sort();

      return html`
        <div style="background:#1a1a1a;color:#eee;padding:15px;font-family:sans-serif;">

          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:15px;">
            ${tabs.map(t=>html`
              <button @click=${()=>this._tab=t.id}
                style="flex:1;min-width:80px;padding:10px;
                background:${this._tab===t.id?'#4caf50':'#333'};
                border:none;color:#fff;border-radius:4px;
                cursor:pointer;font-size:10px;font-weight:bold;">
                ${t.n.toUpperCase()}
              </button>
            `)}
          </div>

          <div style="max-height:550px;overflow-y:auto">
            ${this._renderTabContent(ents)}
          </div>

          <datalist id="e">
            ${ents.map(e=>html`<option value="${e}">`)}
          </datalist>

        </div>
      `;
    }

    _renderTabContent(ents){

      const c=this._config;
      const t=this._tab;

      if(t==='gen') return html`
        <div style="display:grid;gap:10px;">
          Fond URL:
          <input type="text"
            .value=${c.background_image||''}
            @input=${e=>this._up('background_image',e.target.value)}>

          W/H Carte:
          <div style="display:flex;gap:5px;">
            <input type="number"
              .value=${c.card_width}
              @input=${e=>this._up('card_width',e.target.value)}>

            <input type="number"
              .value=${c.card_height}
              @input=${e=>this._up('card_height',e.target.value)}>
          </div>
        </div>
      `;

      if(t==='flow') return html`
        ${Array.from({length:20},(_,i)=>i+1).map(i=>html`
          <details style="background:#222;margin-bottom:5px;padding:8px;">
            <summary>Flux ${i}</summary>

            Path SVG:
            <input style="width:100%" list="e"
              .value=${c[`f${i}_p`]||''}
              @input=${e=>this._up(`f${i}_p`,e.target.value)}>

            Entité:
            <input list="e"
              .value=${c[`f${i}_s`]||''}
              @input=${e=>this._up(`f${i}_s`,e.target.value)}>
          </details>
        `)}
      `;

      const pfx={
        solar:Array.from({length:10},(_,i)=>`s${i+1}`),
        house:Array.from({length:10},(_,i)=>`h${i+1}`),
        bat:Array.from({length:5},(_,i)=>`b${i+1}`),
        meteo:Array.from({length:5},(_,i)=>`w${i+1}`)
      }[t];

      return pfx.map(p=>html`
        <details style="background:#222;margin-bottom:5px;padding:8px;border-radius:4px;">
          <summary>Objet ${p.toUpperCase()}</summary>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">

            Nom:
            <input type="text"
              .value=${c[p+'_name']||''}
              @input=${e=>this._up(p+'_name',e.target.value)}>

            X / Y:
            <div style="display:flex;gap:2px;">
              <input type="number"
                .value=${c[p+'_x']}
                @input=${e=>this._up(p+'_x',e.target.value)}>

              <input type="number"
                .value=${c[p+'_y']}
                @input=${e=>this._up(p+'_y',e.target.value)}>
            </div>

            Taille Police:
            <div style="display:flex;gap:2px;">
              <input type="number" .value=${c[p+'_fs_l']||10}
                @input=${e=>this._up(p+'_fs_l',e.target.value)}>

              <input type="number" .value=${c[p+'_fs_v']||15}
                @input=${e=>this._up(p+'_fs_v',e.target.value)}>

              <input type="number" .value=${c[p+'_fs_v2']||12}
                @input=${e=>this._up(p+'_fs_v2',e.target.value)}>
            </div>

            W / H Boite:
            <div style="display:flex;gap:2px;">
              <input type="number"
                .value=${c[p+'_w_box']||120}
                @input=${e=>this._up(p+'_w_box',e.target.value)}>

              <input type="number"
                .value=${c[p+'_h_box']||''}
                @input=${e=>this._up(p+'_h_box',e.target.value)}>
            </div>

            Entité 1 / 2:
            <div style="display:flex;gap:2px;">
              <input list="e"
                .value=${c[p+'_ent']||''}
                @input=${e=>this._up(p+'_ent',e.target.value)}>

              <input list="e"
                .value=${c[p+'_ent2']||''}
                @input=${e=>this._up(p+'_ent2',e.target.value)}>
            </div>

            Unités:
            <div style="display:flex;gap:2px;">
              <input type="text"
                .value=${c[p+'_u']||''}
                @input=${e=>this._up(p+'_u',e.target.value)}>

              <input type="text"
                .value=${c[p+'_u2']||''}
                @input=${e=>this._up(p+'_u2',e.target.value)}>
            </div>

            Fond / Néon:
            <div style="display:flex;gap:2px;">
              <input type="text" placeholder="Fond"
                .value=${c[p+'_bg']||''}
                @input=${e=>this._up(p+'_bg',e.target.value)}>

              <input type="text" placeholder="Néon"
                .value=${c[p+'_bc']||''}
                @input=${e=>this._up(p+'_bc',e.target.value)}>
            </div>

            Taille Icône:
            <input type="number"
              .value=${c[p+'_img_w']||35}
              @input=${e=>this._up(p+'_img_w',e.target.value)}>

          </div>
        </details>
      `);
    }
  }

  customElements.define("solaire-card-editor", SolaireCardEditor);
  customElements.define("solaire-card", SolaireCard);

  window.customCards=window.customCards||[];
  window.customCards.push({type:"solaire-card",name:"Solaire V210 French"});

})();
