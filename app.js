const GRAD=['#1a9850','#91cf60','#d9ef8b','#fee08b','#fc8d59','#d73027'];
const LAYERS={
 score:{i:'★',n:'Общая оценка места',s:'0–10: шум, воздух, зелень, жара, промзоны',stops:[2,4,5,6,7,8.5],rev:true,u:'',
   note:'Сводный балл. Зелёный — комфортно жить, красный — шумно, жарко или рядом промзона.'},
 noise:{i:'🔊',n:'Шум от дорог и ж/д',s:'Оценка Lden с учётом экранов и домов',stops:[40,45,50,55,62,70],u:' дБ',
   note:'Норма для жилой застройки днём — 55 дБ. Выше 65 дБ — шумно даже при закрытых окнах в старых домах.'},
 lst:{i:'🌡',n:'Жара летом',s:'Температура поверхности, Landsat, ясный день',stops:[25,28,30,32,35,38],u:' °C',
   note:'Нагрев земли и крыш в полдень. Лес держит ~25 °C, асфальт и промзоны — до 45 °C.'},
 green:{i:'🌲',n:'Зелень рядом',s:'Доля леса и парков в квартале',stops:[60,40,25,12,5,0],rev:true,u:' %',
   note:'Сколько территории в радиусе ~200 м занимают лес и парки (OpenStreetMap).'},
 pm25:{i:'💨',n:'Воздух: мелкая пыль PM2.5',s:'Среднее за 2025 г., Copernicus CAMS',stops:[10,11,12,13,15,18],u:' мкг/м³',
   note:'Рекомендация ВОЗ — до 5, норма РФ — 25 мкг/м³. Данные грубые (сетка ~10 км): видна тенденция, не улица.'},
 no2:{i:'🚗',n:'Воздух: NO₂ от машин',s:'Среднее за 2025 г., Copernicus CAMS',stops:[12,15,18,22,26,32],u:' мкг/м³',
   note:'ВОЗ — до 10, норма РФ — 40 мкг/м³. Растёт к МКАД и Калужскому шоссе.'}
};
let cur='score',D=null,P=[],is3d=true,sel=null;
const $=s=>document.querySelector(s);
const fmt=(v,u='')=>v==null?'—':(Math.round(v*10)/10)+u;
// цвет: для rev (больше = лучше) шкала идёт от красного к зелёному
function expr(k){const L=LAYERS[k],s=[...L.stops].sort((x,y)=>x-y);
 const cols=L.rev?[...GRAD].reverse():GRAD; const e=['step',['coalesce',['get',k],0],cols[0]];
 for(let i=1;i<s.length;i++)e.push(s[i],cols[i]);return e}
function colorOf(k,v){const L=LAYERS[k],s=[...L.stops].sort((x,y)=>x-y),cols=L.rev?[...GRAD].reverse():GRAD;let i=0;while(i<s.length-1&&v>=s[i+1])i++;return cols[i]}
function legend(){const L=LAYERS[cur],s=[...L.stops].sort((x,y)=>x-y),cols=L.rev?[...GRAD].reverse():GRAD;
 $('#legend').innerHTML=`<b>${L.n}</b><div class="bar">${cols.map(c=>`<div style="background:${c}"></div>`).join('')}</div>
  <div class="lb">${s.map(x=>`<span>${x}</span>`).join('')}</div><div class="nt">${L.note}</div>`}
function buildLayers(){$('#layers').innerHTML=Object.entries(LAYERS).map(([k,L])=>
 `<div class="ly ${k===cur?'on':''}" data-k="${k}"><i>${L.i}</i><div><b>${L.n}</b><span>${L.s}</span></div></div>`).join('');
 document.querySelectorAll('.ly').forEach(el=>el.onclick=()=>{cur=el.dataset.k;buildLayers();legend();paint()})}
const OSM={type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap'};
const SAT={type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Снимок © Esri, Maxar'};
const map=new maplibregl.Map({container:'map',center:[37.485,55.553],zoom:13,pitch:50,bearing:-15,maxPitch:70,
 maxBounds:[[37.30,55.46],[37.68,55.65]],attributionControl:{compact:true},
 style:{version:8,glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',sources:{osm:OSM,sat:SAT},
  layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-saturation':-0.6,'raster-opacity':0.9}},
          {id:'sat',type:'raster',source:'sat',layout:{visibility:'none'}}]}});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
map.addControl(new maplibregl.ScaleControl(),'bottom-left');
const LST_KEYS={score:'s',noise:'n'};
function paint(){if(!map.getLayer('hex'))return;const op=+$('#o-op').value/100;
 map.setPaintProperty('hex','fill-color',expr(cur));map.setPaintProperty('hex','fill-opacity',op);
 map.setLayoutProperty('heat','visibility',cur==='lst'?'visible':'none');
 map.setPaintProperty('heat','raster-opacity',Math.min(op+0.15,1));
 if(cur==='lst')map.setPaintProperty('hex','fill-opacity',0);
 const bk=cur==='noise'?'n':'s',L=LAYERS[cur==='noise'?'noise':'score'],st=[...L.stops].sort((x,y)=>x-y),cols=L.rev?[...GRAD].reverse():GRAD;
 const e=['step',['get',bk],cols[0]];for(let i=1;i<st.length;i++)e.push(st[i],cols[i]);
 map.setPaintProperty('bld','fill-extrusion-color',e)}
map.on('load',async()=>{
 const [hex,bld,scr,pl]=await Promise.all(['hex.geojson','buildings.geojson','screens.geojson','places.json'].map(f=>fetch('data/'+f).then(r=>r.json())));
 D=hex;P=pl;
 map.addSource('heat',{type:'image',url:'data/heat.png',coordinates:[[37.37,55.615],[37.61,55.615],[37.61,55.495],[37.37,55.495]]});
 map.addLayer({id:'heat',type:'raster',source:'heat',layout:{visibility:'none'},paint:{'raster-opacity':0.8,'raster-resampling':'linear'}});
 map.addSource('hex',{type:'geojson',data:hex});
 map.addLayer({id:'hex',type:'fill',source:'hex',paint:{'fill-color':expr(cur),'fill-opacity':0.65}});
 map.addLayer({id:'hex-line',type:'line',source:'hex',minzoom:14,paint:{'line-color':'#fff','line-width':0.4,'line-opacity':0.5}});
 map.addLayer({id:'hex-sel',type:'line',source:'hex',filter:['==',['get','h'],''],paint:{'line-color':'#111','line-width':3}});
 map.addSource('bld',{type:'geojson',data:bld});
 map.addLayer({id:'bld',type:'fill-extrusion',source:'bld',minzoom:13.5,paint:{'fill-extrusion-color':'#ddd','fill-extrusion-height':['get','H'],'fill-extrusion-opacity':0.9}});
 map.addSource('scr',{type:'geojson',data:scr});
 map.addLayer({id:'scr',type:'line',source:'scr',paint:{'line-color':'#c026d3','line-width':['interpolate',['linear'],['zoom'],12,2,16,6]}});
 map.addSource('pl',{type:'geojson',data:{type:'FeatureCollection',features:pl.map(p=>({type:'Feature',properties:p,geometry:{type:'Point',coordinates:[p.lon,p.lat]}}))}});
 map.addLayer({id:'pl',type:'symbol',source:'pl',minzoom:12.5,layout:{'text-field':['get','name'],'text-font':['Open Sans Semibold'],'text-size':12,'text-allow-overlap':false,'text-padding':6},
  paint:{'text-color':'#111','text-halo-color':'#fff','text-halo-width':1.8}});
 paint();rank('all');
 map.on('click',e=>{const f=map.queryRenderedFeatures(e.point,{layers:['hex']})[0]||D.features.find(x=>inHex(x,e.lngLat));if(f)card(f.properties,e.lngLat)});
 map.on('mousemove','hex',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','hex',()=>map.getCanvas().style.cursor='');
 const u=new URLSearchParams(location.hash.slice(1));if(u.get('p')){const[lo,la]=u.get('p').split(',').map(Number);go(lo,la)}
});
function inHex(f,ll){const c=f.geometry.coordinates[0];let ins=false;for(let i=0,j=c.length-1;i<c.length;j=i++){const[xi,yi]=c[i],[xj,yj]=c[j];
 if((yi>ll.lat)!=(yj>ll.lat)&&ll.lng<(xj-xi)*(ll.lat-yi)/(yj-yi)+xi)ins=!ins}return ins}
const VERD=s=>s>=8?'Отличное место':s>=6.5?'Хорошее место':s>=5?'Средне':s>=3.5?'Есть проблемы':'Неблагоприятно';
const SCORE_C=s=>colorOf('score',s);
function nearest(lo,la){let b=null,bd=1e9;P.forEach(p=>{const d=Math.hypot(p.lon-lo,(p.lat-la)*1.78);if(d<bd){bd=d;b=p}});return bd<0.02?b:null}
function row(t,val,score,desc){const c=score>=7?'#1a9850':score>=5?'#d9b400':score>=3?'#fc8d59':'#d73027';
 return `<div class="row"><div class="t"><span>${t}</span><b>${val}</b></div><div class="meter"><div style="width:${Math.max(score,0.4)*10}%;background:${c}"></div></div><div class="d">${desc}</div></div>`}
function card(p,ll){sel=p.h;map.setFilter('hex-sel',['==',['get','h'],p.h]);
 const nb=nearest(ll.lng,ll.lat),dn=p.noise_open-p.noise;
 const noiseD=p.noise<45?'Тихо, как в жилом дворе ночью':p.noise<55?'В пределах дневной нормы (55 дБ)':p.noise<65?'Выше нормы: слышен поток машин':'Очень шумно: магистраль рядом';
 const heatD=p.lst<27?'Прохладно: тень леса':p.lst<31?'Умеренно':p.lst<35?'Жарко: мало тени':'Остров тепла: асфальт и крыши';
 const km=m=>m<1000?Math.round(m/10)*10+' м':(m/1000).toFixed(1)+' км';
 $('#card').innerHTML=`<button class="x" onclick="closeCard()">×</button>
 <h2>${nb?nb.name:'Точка на карте'}</h2><div class="sub">${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</div>
 <div class="big"><div class="sc" style="background:${SCORE_C(p.score)}">${p.score.toFixed(1)}</div><div><b>${VERD(p.score)}</b><br><span class="sub">из 10 по пяти факторам</span></div></div>
 ${row('🔊 Шум',fmt(p.noise,' дБ'),p.s_noise,noiseD+(dn>=3?` · дома и экраны глушат ещё ${Math.round(dn)} дБ`:''))}
 ${row('🌲 Зелень',fmt(p.green,' %'),p.s_green,p.d_forest<30?'Лес прямо здесь':'До леса '+km(p.d_forest))}
 ${row('🌡 Жара летом',fmt(p.lst,' °C'),p.s_heat,heatD)}
 ${row('💨 Воздух',`PM2.5 ${fmt(p.pm25)} · NO₂ ${fmt(p.no2)}`,p.s_air,'мкг/м³, среднее за 2025 год')}
 ${row('🏭 Промзона',km(p.d_ind),p.s_ind,'Расстояние до ближайшей промзоны или полигона')}
 <div class="row d">До МКАД/Калужского/Киевского ш.: <b>${km(p.d_big)}</b> · до воды: <b>${km(p.d_water)}</b><br>
 Застройка ${fmt(p.bld,' %')}, средняя высота ${fmt(p.bld_h,' м')} · июль ${fmt(p.t_jul,' °C')} (воздух)</div>
 <div class="row"><a href="#p=${ll.lng.toFixed(5)},${ll.lat.toFixed(5)}" onclick="navigator.clipboard&&navigator.clipboard.writeText(location.href.split('#')[0]+this.getAttribute('href'))">🔗 Скопировать ссылку на точку</a></div>`;
 $('#card').classList.remove('hidden')}
function closeCard(){$('#card').classList.add('hidden');map.setFilter('hex-sel',['==',['get','h'],''])}
function go(lo,la,z=15.2){map.flyTo({center:[lo,la],zoom:z,pitch:is3d?55:0,duration:1400});
 map.once('moveend',()=>{const f=D.features.find(x=>inHex(x,{lng:lo,lat:la}));if(f)card(f.properties,{lng:lo,lat:la})})}
function rank(k){document.querySelectorAll('.rf button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
 const L=P.filter(p=>k==='all'||p.kind===k);
 $('#rank').innerHTML=L.map((p,i)=>`<li data-i="${P.indexOf(p)}"><div class="sc" style="background:${SCORE_C(p.score)}">${p.score.toFixed(1)}</div>
  <div class="nm">${p.name}<small>🔊 ${p.noise} дБ · 🌡 ${p.lst} °C · 🌲 ${p.green}%</small></div></li>`).join('');
 document.querySelectorAll('#rank li').forEach(li=>li.onclick=()=>{const p=P[+li.dataset.i];go(p.lon,p.lat)})}
document.querySelectorAll('.rf button').forEach(b=>b.onclick=()=>rank(b.dataset.k));
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#t-'+b.dataset.t).classList.add('on')});
$('#q').oninput=e=>{const q=e.target.value.trim().toLowerCase();if(q.length<2){$('#sug').innerHTML='';return}
 $('#sug').innerHTML=P.filter(p=>p.name.toLowerCase().includes(q)).slice(0,8).map(p=>`<div data-i="${P.indexOf(p)}">${p.name} <small>оценка ${p.score}</small></div>`).join('')||'<div><small>Не найдено</small></div>';
 document.querySelectorAll('#sug div[data-i]').forEach(d=>d.onclick=()=>{const p=P[+d.dataset.i];$('#sug').innerHTML='';$('#q').value=p.name;go(p.lon,p.lat)})};
$('#o-bld').onchange=e=>map.setLayoutProperty('bld','visibility',e.target.checked?'visible':'none');
$('#o-scr').onchange=e=>map.setLayoutProperty('scr','visibility',e.target.checked?'visible':'none');
$('#o-sat').onchange=e=>{map.setLayoutProperty('sat','visibility',e.target.checked?'visible':'none');map.setLayoutProperty('osm','visibility',e.target.checked?'none':'visible')};
$('#o-op').oninput=paint;
$('#b3d').onclick=()=>{is3d=!is3d;$('#b3d').textContent=is3d?'3D':'2D';map.easeTo({pitch:is3d?55:0,bearing:is3d?-15:0});map.setLayoutProperty('bld','visibility',is3d&&$('#o-bld').checked?'visible':'none')};
$('#bloc').onclick=()=>navigator.geolocation&&navigator.geolocation.getCurrentPosition(p=>go(p.coords.longitude,p.coords.latitude),()=>alert('Не удалось определить местоположение'));
$('#t-about').innerHTML=`<h3>Как считается</h3>
<p><b>Шум</b> — расчётная оценка, не замер. Источник — каждые 50 м дорог и ж/д из OpenStreetMap; уровень падает с расстоянием, экраны снижают на 10 дБ, дома на пути звука — на 5–25 дБ. Интенсивность движения не учтена.</p>
<p><b>Жара</b> — температура поверхности по тепловому каналу Landsat 8/9, среднее трёх ясных летних дней (2024–2026), разрешение 30–100 м.</p>
<p><b>Воздух</b> — Copernicus CAMS, среднее за 2025 г. Сетка ~10 км: показывает тенденцию «к МКАД хуже», но не разницу между соседними домами.</p>
<p><b>Зелень</b> — лес и парки OpenStreetMap в ячейке ~0,1 км² и расстояние до леса.</p>
<p><b>Оценка 0–10</b> = шум 30% + зелень 25% + воздух 20% + жара 15% + промзоны 10%.</p>
<h3>Источники</h3><p>© участники OpenStreetMap (ODbL) · Copernicus CAMS и ERA5 через Open-Meteo · USGS Landsat через Microsoft Planetary Computer · снимки Esri World Imagery.</p>
<p><a href="data/kommunarka_grid.csv">Скачать данные (CSV)</a></p>`;
buildLayers();legend();
