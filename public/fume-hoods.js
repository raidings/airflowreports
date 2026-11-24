/* Simple fume hood records share the existing saved/cloud workspace. */
function isFumeHood(r){return r?.type==='Chemical Fume Hood';}
function fumeValues(r){
 const tokens=String(r.inReadings||'').trim().split(/[\s,;]+/).filter(Boolean),values=tokens.map(Number);
 const valid=values.length>0&&values.every(v=>Number.isFinite(v)&&v>=0),width=Number(r.width),height=Number(r.sash);
 const area=Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0?width*height/144:null;
 const average=valid?values.reduce((s,v)=>s+v,0)/values.length:null;
 return {valid,count:values.length,area,average,cfm:area!==null&&average!==null?area*average:null};
}
function newFumeHood(values={}){return Object.assign(blank(),{type:'Chemical Fume Hood',reportNo:'FH-'+Date.now(),inMethod:'Face velocity (FPM)',dfApplicable:'N/A',supplyHepaType:'N/A',exhaustHepaType:'N/A',fumeSmoke:'Not tested'},values);}
function photoFumeHoods(){return [
 {asset:'374-1',manufacturer:'AirClean',model:'AC4000HLF',serial:'AC4000HLF-943',width:'42',sash:'19.5',inReadings:'95, 67, 73, 82, 122, 80'},
 {asset:'374-2',manufacturer:'Kewaunee',width:'38',sash:'18',inReadings:'79, 81, 93, 79, 110, 102'},
 {asset:'3215-1',width:'64',sash:'18',inReadings:'88, 83, 93, 94, 96, 88'},
 {asset:'3234-1',width:'40',sash:'18',inReadings:'87, 79, 84, 114, 111, 99'},
 {asset:'3236-1',width:'40',sash:'18',inReadings:'124, 110, 130, 120, 115, 114'}
 ].map(r=>newFumeHood({...r,date:'2026-11-23',due:'2027-11-30',reportNo:'FH-2026-11-23-'+r.asset,fumeSmoke:'Pass'}));}
const beforeFumeRender=render;
render=function(){if(isFumeHood(report())&&tab>=0&&tab<=3)tab=6;beforeFumeRender();
 const nav=document.createElement('button');nav.textContent='Fume hoods';nav.className=tab===6?'active':'';nav.onclick=()=>{tab=6;render()};$('#tabs').append(nav);if(tab!==6)return;
 const r=report(),hoods=data.filter(isFumeHood);
 $('#editor').innerHTML=`<section><h2>Fume hoods</h2><p class="hint">Simple face velocity and smoke-test reports.</p><div class="grid"><label>Saved fume hood<select id="fumeSelect"><option value="">Select a hood</option>${hoods.map(h=>`<option value="${esc(h.id)}" ${h.id===current?'selected':''}>${esc(h.asset||h.reportNo||'Untitled hood')} · ${esc(h.date||'No date')}</option>`).join('')}</select></label><div style="align-self:end;display:flex;gap:8px;flex-wrap:wrap"><button id="fumeNew">New fume hood</button><button id="fumePhoto">Add 5 hoods from photo</button></div></div></section>${isFumeHood(r)?`<section><h2>Fume hood details</h2><div class="grid">${field('Hood ID / location','asset')}${field('Make','manufacturer')}${field('Model','model')}${field('Serial number','serial')}${field('Test date','date','date')}${field('Due date','due','date')}${field('Opening width (in)','width','number')}${field('Sash opening height (in)','sash','number')}${field('Face velocity readings (FPM)','inReadings','textarea',true)}${select('Smoke test','fumeSmoke',['Not tested','Pass','Fail','N/A'])}</div><div class="summary" id="fumeSummary" aria-live="polite"></div><p id="fumeError" class="hint"></p><button id="fumePdf" class="primary">Download fume hood PDF</button><p class="hint" style="margin-top:12px;margin-bottom:0">CFM = average FPM × opening width × sash height ÷ 144. Exact readings and dimensions are used; rounded handwritten totals may differ.</p></section>`:''}`;
 $('#fumeSelect').onchange=()=>{const id=$('#fumeSelect').value;if(hoods.some(h=>h.id===id)){current=id;render();}};
 $('#fumeNew').onclick=()=>{const h=newFumeHood();data.unshift(h);current=h.id;save();render();};
 $('#fumePhoto').onclick=()=>{const existing=new Set(data.filter(isFumeHood).map(h=>(h.asset||'')+'|'+h.date));const added=photoFumeHoods().filter(h=>!existing.has(h.asset+'|'+h.date));if(!added.length)return toast('These five hoods are already in this workspace.');data.unshift(...added);current=added[0].id;save();render();toast('Added '+added.length+' hoods. Review make, model and serial details; unclear entries were left blank.');};
 if(!isFumeHood(r))return;
 const update=()=>{const v=fumeValues(r);$('#fumeSummary').innerHTML=`<div><strong>${fmt(v.area,3)} ft²</strong><span>Opening area</span></div><div><strong>${fmt(v.average,1)} FPM</strong><span>Average · ${v.count} readings</span></div><div><strong>${fmt(v.cfm,1)} CFM</strong><span>Calculated air volume</span></div>`;$('#fumeError').textContent=v.valid?'':'Enter nonnegative numeric readings separated by commas, spaces or new lines.';};
 $('#editor').querySelectorAll('[data-k]').forEach(el=>el.oninput=()=>{r[el.dataset.k]=el.value;save();update();});$('#fumePdf').onclick=()=>downloadFumeHoodPdf(r);update();
};
async function buildFumeHoodPdf(r){
 const v=fumeValues(r);if(!v.valid||v.area===null)throw Error('Enter valid readings, opening width and sash height.');
 const {PDFDocument,StandardFonts,rgb}=PDFLib,doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let page,y;
 const fresh=()=>{page=doc.addPage([612,792]);y=744;};fresh();
 const clean=s=>pdfSafe(String(s??''));
 const lines=(value,width,size)=>{const out=[];let line='';for(let word of clean(value).split(/\s+/)){while(font.widthOfTextAtSize(word,size)>width){let part='';for(const char of word){if(font.widthOfTextAtSize(part+char,size)>width)break;part+=char;}if(line){out.push(line);line='';}out.push(part);word=word.slice(part.length);}if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out.length?out:['-'];};
 const text=(value,x,top,size=11,strong=false)=>page.drawText(clean(value),{x,y:top-size,size,font:strong?bold:font,color:rgb(0,0,0)});
 text('Fume Hood Test Report',48,y,20,true);y-=46;
 const row=(label,value)=>{const wrapped=lines(value||'—',325,11),h=Math.max(36,wrapped.length*15+16);if(y-h<48)fresh();page.drawRectangle({x:48,y:y-h,width:516,height:h,borderWidth:0.6,borderColor:rgb(0,0,0)});text(label,58,y-10,10,true);wrapped.forEach((s,i)=>text(s,225,y-10-i*15,11));y-=h;};
 for(const [label,value] of [['Hood ID / location',r.asset],['Make',r.manufacturer],['Model',r.model],['Serial number',r.serial],['Test date',r.date],['Due date',r.due],['Opening width',r.width+' in'],['Sash opening height',r.sash+' in'],['Opening area',fmt(v.area,3)+' ft²'],['Readings (FPM)',r.inReadings],['Average face velocity',fmt(v.average,1)+' FPM'],['Air volume',fmt(v.cfm,1)+' CFM'],['Smoke test',r.fumeSmoke||'Not tested']])row(label,value);
 doc.setTitle('Fume Hood Test Report - '+(r.asset||''));return doc.save();
}
async function downloadFumeHoodPdf(r){try{const bytes=await buildFumeHoodPdf(r),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=('Fume-Hood-'+(r.asset||'report')+'-'+(r.date||'undated')).replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Fume hood PDF downloaded.');}catch(e){toast(e.message);}}
const beforeFumePrint=printReport;printReport=function(){if(isFumeHood(report()))return downloadFumeHoodPdf(report());return beforeFumePrint();};$('#print').onclick=()=>printReport();render();
