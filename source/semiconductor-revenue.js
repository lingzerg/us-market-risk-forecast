(()=>{
 const dataset = globalThis.__SEMICONDUCTOR_REVENUE__;

 const root=document.getElementById('semiconductor-two-years'),companySelect=root.querySelector('#semi-company'),modeSelect=root.querySelector('#semi-mode'),plot=root.querySelector('.plot'),tip=root.querySelector('.tooltip');
 if (!dataset || typeof d3 === 'undefined') {
  root.querySelector('.chart-status').textContent='图表资源加载失败，请刷新页面重试。';
  return;
 }
 companySelect.innerHTML=dataset.companies.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
 const modes={qoq:{keys:['qoq','aq'],names:['环比增长率','环比增速变化'],units:['%','百分点']},yoy:{keys:['yoy','ay'],names:['同比增长率','同比增速变化'],units:['%','百分点']},difference:{keys:['d1','d2'],names:['一阶差分','二阶差分']}};
 const visible=[true,true,true],finite=v=>typeof v==='number'&&Number.isFinite(v),format=(v,s=false)=>finite(v)?(s&&v>0?'+':'')+v.toFixed(2):'—';
 // Keep missing observations null for every calculation; zero is display-only.
 function prepare(c){
  const n=Math.max(13,c.revenues.length),offset=n-c.revenues.length,rows=[];
  for(let i=0;i<n;i++){
   const j=i-offset,qIndex=c.startYear*4+c.startQuarter-1+j,year=Math.floor(qIndex/4),quarter=qIndex%4+1;
   const raw=j<0?null:c.revenues[j],r=finite(raw)?raw:null,prev=rows[i-1],prior=rows[i-4],prev2=rows[i-2];
   const row={q:`${c.fiscal?'FY':''}${year} Q${quarter}`,end:c.ends[j]||'未知',raw:r,rev:r===null?0:r/c.divisor,missing:r===null,source:c.sourceRefs?.[j]??0};
   row.qoq=r!==null&&finite(prev?.raw)&&prev.raw!==0?100*(r/prev.raw-1):null;
   row.yoy=r!==null&&finite(prior?.raw)&&prior.raw!==0?100*(r/prior.raw-1):null;
   row.aq=finite(row.qoq)&&finite(prev?.qoq)?row.qoq-prev.qoq:null;
   row.ay=finite(row.yoy)&&finite(prev?.yoy)?row.yoy-prev.yoy:null;
   row.d1=r!==null&&finite(prev?.raw)?(r-prev.raw)/c.divisor:null;
   row.d2=r!==null&&finite(prev?.raw)&&finite(prev2?.raw)?(r-2*prev.raw+prev2.raw)/c.divisor:null;
   rows.push(row);
  }
  return {all:rows,data:rows.slice(-8).map((d,x)=>({...d,x}))};
 }
 const svg=d3.select(plot).append('svg').attr('class','line-chart').attr('role','img');
 const colors=['var(--viz-series-1)','var(--viz-series-2)','var(--viz-series-3)'],dashes=[null,'7 4','2 4'];
 function restore(state){const s=state?.privateContent;if(dataset.companies.some(c=>c.id===s?.company))companySelect.value=s.company;if(modes[s?.mode])modeSelect.value=s.mode;if(Array.isArray(s?.visible)&&s.visible.length===3)s.visible.forEach((v,i)=>visible[i]=!!v);}
 const storageKey='market-risk:semiconductor-chart:v1';
 try { restore({privateContent:JSON.parse(localStorage.getItem(storageKey))}); } catch {}
 function save(){try {localStorage.setItem(storageKey,JSON.stringify({company:companySelect.value,mode:modeSelect.value,visible}));} catch {}}
 function render(animate=false){
  tip.hidden=true;
  const c=dataset.companies.find(c=>c.id===companySelect.value),{all,data}=prepare(c),m=modes[modeSelect.value],units=m.units||[c.unit+'/季',c.unit+'/季²'];
  const series=[{key:'rev',name:'营收',unit:c.unit},...m.keys.map((key,i)=>({key,name:m.names[i],unit:units[i]}))];
  const missing=data.filter(d=>d.missing).length;
  root.querySelector('.period').textContent=`${c.name} · ${data[0].q}—${data[7].q} · 8 季度 · ${missing?missing+' 季缺失补 0':'营收数据完整'}`;
  root.querySelector('.company-note').textContent=c.note;
  const w=plot.getBoundingClientRect().width,h=440,L=68,R=w-58,T=54,B=380;
  const x=d3.scaleLinear().domain([0,7]).range([L+10,R-10]);
  function scale(values){const [a,b]=d3.extent([0,...values.filter(finite)]),p=Math.max(b-a,1)*.16;return d3.scaleLinear().domain([a<0?a-p:0,b+p]).nice().range([B,T]);}
  const yl=scale(data.map(d=>d.rev)),yr=scale(data.flatMap(d=>m.keys.map(k=>d[k]))),ys=[yl,yr,yr];
  svg.attr('viewBox',`0 0 ${w} ${h}`).attr('height',h).attr('aria-label',`${c.name} 最近八季营收与两项增长指标合并折线图。营收单位${c.unit}，见左轴；两项变化见右轴。具体数值及缺失状态见下方表格。`);
  svg.selectAll('rect[data-chart-frame]').data([0]).join('rect').attr('data-chart-frame','').attr('x',L).attr('y',T).attr('width',R-L).attr('height',B-T).attr('fill','none').attr('stroke','var(--border)');
  svg.selectAll('g.left').data([0]).join('g').attr('class','left').attr('transform',`translate(${L},0)`).call(d3.axisLeft(yl).ticks(5).tickSize(-(R-L)).tickFormat(d3.format('~g'))).select('.domain').remove();
  svg.selectAll('g.right').data([0]).join('g').attr('class','right').attr('transform',`translate(${R},0)`).call(d3.axisRight(yr).ticks(5).tickSize(0).tickPadding(8).tickFormat(d3.format('~g'))).select('.domain').remove();
  const ticks=w<300?[0,7]:w<440?[0,3,7]:w<620?[0,2,4,7]:data.map(d=>d.x);
  const bottom=svg.selectAll('g.bottom').data([0]).join('g').attr('class','bottom').attr('transform',`translate(0,${B})`).call(d3.axisBottom(x).tickValues(ticks).tickFormat(i=>data[i].end.slice(2)).tickSize(0).tickPadding(14));bottom.select('.domain').remove();
  bottom.selectAll('text').attr('text-anchor',d=>d===0?'start':d===7?'end':'middle');
  const rightTitle=modeSelect.value==='difference'?(w<440?'一阶 / 二阶差分（单位见图例）':`差分 / ${c.unit}/季 · ${c.unit}/季²`):'增长率 % / 增速变化 百分点';
  const titles=[{id:'left',x:L,y:16,text:'营收 / '+c.unit,anchor:'start',axis:'y'},{id:'right',x:R,y:35,text:rightTitle,anchor:'end',axis:'y'},{id:'bottom',x:R,y:431,text:'财报截止月份（年-月）',anchor:'end',axis:'x'}];
  svg.selectAll('text.axis-title').data(titles,d=>d.id).join('text').attr('class','axis-title').attr('data-axis',d=>d.axis).attr('x',d=>d.x).attr('y',d=>d.y).attr('text-anchor',d=>d.anchor).text(d=>d.text);
  svg.selectAll('line.zero').data([0]).join('line').attr('class','zero').attr('x1',L).attr('x2',R).attr('y1',yr(0)).attr('y2',yr(0)).attr('stroke','var(--muted-foreground)').attr('stroke-width',1);
  const groups=svg.selectAll('g.series').data(series).join('g').attr('class','series').style('display',(d,i)=>visible[i]?null:'none');
  groups.each(function(s,i){
   const g=d3.select(this),line=d3.line().defined(d=>finite(d[s.key])).x(d=>x(d.x)).y(d=>ys[i](d[s.key]));
   const path=g.selectAll('path.trend').data([data]).join('path').attr('class','trend').attr('fill','none').attr('stroke',colors[i]).attr('stroke-width',2.5).attr('stroke-dasharray',dashes[i]);path.interrupt();
   const target=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?path.transition().duration(240):path;target.attr('d',line);
   g.selectAll('circle.point').data(data.filter(d=>finite(d[s.key])&&!(i===0&&d.missing))).join('circle').attr('class','point').attr('cx',d=>x(d.x)).attr('cy',d=>ys[i](d[s.key])).attr('r',3.5).attr('fill',colors[i]);
   g.selectAll('rect.missing').data(i===0?data.filter(d=>d.missing):[]).join('rect').attr('class','missing').attr('x',d=>x(d.x)-4).attr('y',yl(0)-4).attr('width',8).attr('height',8).attr('fill','var(--background)').attr('stroke',colors[i]).attr('stroke-width',2);
  });
  const legend=d3.select(root.querySelector('.legend')).selectAll('button').data(series).join('button').attr('type','button').attr('class','cursor-interaction').attr('aria-pressed',(d,i)=>String(visible[i])).on('click',(event,d)=>{const i=series.indexOf(d);visible[i]=!visible[i];save();render();});
  legend.html((s,i)=>`<span class="swatch" style="border-color:${colors[i]};border-top-style:${i===1?'dashed':i===2?'dotted':'solid'}"></span>${s.name}（${s.unit}，${i?'右':'左'}轴）`);
  const labels=series.map((s,i)=>({...s,i,py:ys[i](data[7][s.key])})).filter(s=>visible[s.i]&&finite(data[7][s.key])).sort((a,b)=>a.py-b.py);
  labels.forEach((s,i)=>s.ly=Math.max(T+14,s.py-9,i?labels[i-1].ly+18:T+14));
  if(labels.length&&labels.at(-1).ly>B-8){const shift=labels.at(-1).ly-(B-8);labels.forEach(s=>s.ly-=shift);}
  svg.selectAll('text.latest').data(labels,d=>d.i).join('text').attr('class','latest').attr('x',x(7)-8).attr('y',d=>d.ly).attr('text-anchor','end').text(s=>s.i===0&&data[7].missing?'0（缺失）':format(data[7][s.key],s.i>0)+(s.unit==='%'?'%':''));
  const guide=svg.selectAll('line.guide').data([0]).join('line').attr('class','guide').attr('data-chart-hover-guide','').attr('y1',T).attr('y2',B).attr('stroke','var(--muted-foreground)').style('display','none');
  const hover=svg.selectAll('g.hover-marks').data([0]).join('g').attr('class','hover-marks');hover.selectAll('*').remove();let pinned=false;
  const overlay=svg.selectAll('rect.overlay').data([0]).join('rect').attr('class','overlay').attr('data-chart-hit','').attr('data-chart-hover-overlay','cross-series').attr('x',L).attr('y',T).attr('width',R-L).attr('height',B-T).attr('fill','transparent');
  function show(event){
   const [px]=d3.pointer(event,svg.node()),cx=Math.max(x(0),Math.min(x(7),px)),v=x.invert(cx),a=Math.min(6,Math.floor(v)),t=v-a,nearest=Math.round(v),exact=Math.abs(v-nearest)<.015;
   guide.style('display',null).attr('x1',cx).attr('x2',cx);
   const rows=series.map((s,i)=>({...s,i,value:exact?data[nearest][s.key]:finite(data[a][s.key])&&finite(data[a+1][s.key])?data[a][s.key]*(1-t)+data[a+1][s.key]*t:null,missing:exact?data[nearest].missing:data[a].missing||data[a+1].missing})).filter(s=>visible[s.i]);
   hover.selectAll('circle').data(rows.filter(s=>finite(s.value)),d=>d.i).join('circle').attr('data-chart-hover-marker','').attr('cx',cx).attr('cy',d=>ys[d.i](d.value)).attr('r',5).attr('fill',d=>colors[d.i]);
   tip.innerHTML=`<div>${exact?data[nearest].q+' · '+data[nearest].end:data[a].q+' → '+data[a+1].q+'（插值）'}</div>`+rows.map(s=>`<div>${s.name}：${format(s.value,s.i>0)} ${s.unit}${s.i===0&&s.missing?' · 含缺失补 0':''}</div>`).join('');tip.hidden=false;
   const sr=svg.node().getBoundingClientRect(),rr=root.getBoundingClientRect();tip.style.left=Math.max(0,Math.min(w-tip.offsetWidth,cx+10))+'px';tip.style.top=(sr.top-rr.top+T+8)+'px';
  }
  overlay.on('pointermove',e=>{if(!pinned)show(e);}).on('pointerleave',()=>{if(!pinned){tip.hidden=true;guide.style('display','none');hover.selectAll('*').remove();}}).on('click',e=>{pinned=!pinned;show(e);});
  root.querySelector('.revenue-head').textContent='营收 / '+c.unit;root.querySelector('.rate-head').textContent=m.names[0]+' / '+units[0];root.querySelector('.accel-head').textContent=m.names[1]+' / '+units[1];
  root.querySelector('.values').innerHTML=data.map(d=>`<tr><td>${d.q}</td><td>${d.end}</td><td class="text-end">${format(d.rev)}</td><td class="text-end">${format(d[m.keys[0]],true)}</td><td class="text-end">${format(d[m.keys[1]],true)}</td><td>${d.missing?'缺失补 0':'已报告'}</td></tr>`).join('');
  root.querySelector('.raw-head').textContent='原始营收 / 百万 '+c.currency;
  root.querySelector('.source-values').innerHTML=all.map(d=>`<tr><td>${d.q}</td><td>${d.end}</td><td class="text-end">${d.missing?'0（缺失）':d.raw.toLocaleString('en-US')}</td><td>${d.missing?'缺失补 0':`<a href="${c.sources[d.source][1]}" target="_blank" rel="noopener noreferrer">${c.sources[d.source][0]}</a>`}</td></tr>`).join('');
  root.querySelector('.source-links').innerHTML=c.sources.map(s=>`<a href="${s[1]}" target="_blank" rel="noopener noreferrer">${s[0]}</a>`).join('');
  root.querySelector('.axis-note').textContent='左轴为营收，右轴为两项变化；单位见图例。两轴刻度独立，曲线交点不表示数值相等。'+(missing?' 空心方块表示缺失补 0。':'');
  // Keep text legible on narrow screens; secondary ticks can be removed if labels collide.
  const valueBounds=svg.selectAll('text.latest').nodes().map(n=>n.getBoundingClientRect());
  svg.selectAll('g.left .tick,g.right .tick').each(function(){const b=this.querySelector('text').getBoundingClientRect();if(valueBounds.some(a=>a.left<b.right+4&&a.right>b.left-4&&a.top<b.bottom+4&&a.bottom>b.top-4))d3.select(this).remove();});
 }
 companySelect.addEventListener('change',()=>{save();render(true);});modeSelect.addEventListener('change',()=>{save();render(true);});
 let oldWidth=0;new ResizeObserver(()=>{const width=plot.getBoundingClientRect().width;if(width!==oldWidth){oldWidth=width;render();}}).observe(plot);render();root.querySelector('.chart-status').hidden=true;
})();
