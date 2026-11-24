/* Simple fume hood records share the existing saved/cloud workspace. */
function isFumeHood(r){return r?.type==='Chemical Fume Hood';}
function fumeValues(r){
 const tokens=String(r.inReadings||'').trim().split(/[\s,;]+/).filter(Boolean),values=tokens.map(Number);
 const summary=r.fumeAverage!==''&&r.fumeAverage!==undefined&&Number.isFinite(Number(r.fumeAverage))&&Number(r.fumeAverage)>=0?Number(r.fumeAverage):null;
 const valid=values.length>0?values.every(v=>Number.isFinite(v)&&v>=0):summary!==null,width=Number(r.width),height=Number(r.sash);
 const area=Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0?width*height/144:null;
 const average=valid?(values.length?values.reduce((s,v)=>s+v,0)/values.length:summary):null;
 return {valid,count:values.length,area,average,cfm:area!==null&&average!==null?area*average:null};
}
function newFumeHood(values={}){return Object.assign(blank(),{type:'Chemical Fume Hood',reportNo:'FH-'+Date.now(),inMethod:'Face velocity (FPM)',dfApplicable:'N/A',supplyHepaType:'N/A',exhaustHepaType:'N/A',fumeSmoke:'Not tested'},values);}
function photoFumeHoods(){return [
 {asset:'374-1',manufacturer:'AirClean',model:'AC4000HLF',serial:'AC4000HLF-943',width:'42',sash:'19.5',inReadings:'95, 67, 73, 82, 122, 80'},
 {asset:'374-2',manufacturer:'Kewaunee',width:'38',sash:'18',inReadings:'79, 81, 93, 79, 110, 102'},
 {asset:'3215-1',width:'64',sash:'18',inReadings:'88, 83, 93, 94, 96, 88'},
 {asset:'3234-1',width:'40',sash:'18',inReadings:'87, 79, 84, 114, 111, 99'},
 {asset:'3236-1',width:'40',sash:'18',inReadings:'124, 110, 130, 120, 115, 114'},
 {asset:'3228-1',width:'64',sash:'13',inReadings:'102, 113, 121, 116, 125, 122, 125, 129, 125, 121, 122, 97'},
 {asset:'3225-1',width:'64',sash:'13',inReadings:'98, 105, 111, 114, 97, 97, 82, 88, 84, 89'},
 {asset:'3231B-1',width:'40',sash:'18',inReadings:'',fumeAverage:'83'},
 {asset:'3231B-2',width:'64',sash:'18',inReadings:'',fumeAverage:'104'}
 ].map(r=>newFumeHood({...r,date:'2026-11-23',due:'2027-11-30',reportNo:'FH-2026-11-23-'+r.asset,fumeSmoke:'Pass'}));}
const beforeFumeRender=render;
render=function(){if(isFumeHood(report())&&tab>=0&&tab<=3)tab=6;beforeFumeRender();
 const nav=document.createElement('button');nav.textContent='Fume hoods';nav.className=tab===6?'active':'';nav.onclick=()=>{tab=6;render()};$('#tabs').append(nav);if(tab!==6)return;
 const r=report(),hoods=data.filter(isFumeHood);
 $('#editor').innerHTML=`<section><h2>Fume hoods</h2><p class="hint">Simple face velocity and smoke-test reports.</p><div class="grid"><label>Saved fume hood<select id="fumeSelect"><option value="">Select a hood</option>${hoods.map(h=>`<option value="${esc(h.id)}" ${h.id===current?'selected':''}>${esc(h.asset||h.reportNo||'Untitled hood')} · ${esc(h.date||'No date')}</option>`).join('')}</select></label><div style="align-self:end;display:flex;gap:8px;flex-wrap:wrap"><button id="fumeNew">New fume hood</button><button id="fumePhoto">Add hoods from photos</button></div></div></section>${isFumeHood(r)?`<section><h2>Fume hood details</h2><div class="grid">${field('Hood ID / location','asset')}${field('Make','manufacturer')}${field('Model','model')}${field('Serial number','serial')}${field('Test date','date','date')}${field('Due date','due','date')}${field('Opening width (in)','width','number')}${field('Sash opening height (in)','sash','number')}${field('Face velocity readings (FPM)','inReadings','textarea',true)}${field('Recorded average FPM (only if readings are unavailable)','fumeAverage','number')}${select('Smoke test','fumeSmoke',['Not tested','Pass','Fail','N/A'])}</div><div class="summary" id="fumeSummary" aria-live="polite"></div><p id="fumeError" class="hint"></p><button id="fumePdf" class="primary">Download fume hood PDF</button><p class="hint" style="margin-top:12px;margin-bottom:0">CFM = average FPM × opening width × sash height ÷ 144. Individual readings take precedence over a recorded average. Exact dimensions are used; rounded handwritten totals may differ.</p></section>`:''}`;
 $('#fumeSelect').onchange=()=>{const id=$('#fumeSelect').value;if(hoods.some(h=>h.id===id)){current=id;render();}};
 $('#fumeNew').onclick=()=>{const h=newFumeHood();data.unshift(h);current=h.id;save();render();};
 $('#fumePhoto').onclick=()=>{const existing=new Set(data.filter(isFumeHood).map(h=>(h.asset||'')+'|'+h.date));const added=photoFumeHoods().filter(h=>!existing.has(h.asset+'|'+h.date));if(!added.length)return toast('All photographed hoods are already in this workspace.');data.unshift(...added);current=added[0].id;save();render();toast('Added '+added.length+' hoods. Review make, model and serial details; unclear entries were left blank.');};
 if(!isFumeHood(r))return;
 const approval=document.createElement('section');approval.id='fumeApproval';approval.innerHTML=`<h2>Signature and approval</h2><p class="hint">I certify that this record is a true and accurate representation of the work performed.</p><div class="grid">${field('Performed by / technician','tech')}<label>Signature image<input id="fumeSignature" type="file" accept="image/png,image/jpeg,image/webp"></label></div>${signatureData(r.signatureImage)?`<div class="signature-preview"><img src="${r.signatureImage}" alt="Technician signature"></div><button id="fumeRemoveSignature">Remove signature</button>`:'<p class="hint" style="margin-top:16px">Upload a dark signature on a light background. Without an image, the PDF includes a blank signature line.</p>'}<button id="fumeSignedPdf" class="primary" style="margin-left:8px">Download report PDF</button>`;$('#editor').append(approval);
 $('#fumeSignature').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const input=e.target;input.disabled=true;try{const value=await importSignature(file);r.signatureImage=value;save();render();toast('Signature saved to this report.');}catch(error){toast(error.message);input.disabled=false;input.value='';}};
 if($('#fumeRemoveSignature'))$('#fumeRemoveSignature').onclick=()=>{delete r.signatureImage;save();render();};$('#fumeSignedPdf').onclick=()=>downloadFumeHoodPdf(r);
 const update=()=>{const v=fumeValues(r);$('#fumeSummary').innerHTML=`<div><strong>${fmt(v.area,3)} ft²</strong><span>Opening area</span></div><div><strong>${fmt(v.average,1)} FPM</strong><span>${v.count?'Average · '+v.count+' readings':'Recorded average · no individual readings'}</span></div><div><strong>${fmt(v.cfm,1)} CFM</strong><span>Calculated air volume</span></div>`;$('#fumeError').textContent=v.valid?'':'Enter nonnegative numeric readings, or a recorded average if individual readings are unavailable.';};
 $('#editor').querySelectorAll('[data-k]').forEach(el=>el.oninput=()=>{r[el.dataset.k]=el.value;save();update();});$('#fumePdf').onclick=()=>downloadFumeHoodPdf(r);update();
};
async function buildFumeHoodPdf(r){
 const v=fumeValues(r);if(!v.valid||v.area===null)throw Error('Enter valid readings or a recorded average, opening width and sash height.');
 const {PDFDocument,StandardFonts,rgb}=PDFLib,doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let page,y;
 const fresh=()=>{page=doc.addPage([612,792]);y=744;};fresh();
 const clean=s=>pdfSafe(String(s??''));
 const lines=(value,width,size)=>{const out=[];let line='';for(let word of clean(value).split(/\s+/)){while(font.widthOfTextAtSize(word,size)>width){let part='';for(const char of word){if(font.widthOfTextAtSize(part+char,size)>width)break;part+=char;}if(line){out.push(line);line='';}out.push(part);word=word.slice(part.length);}if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out.length?out:['-'];};
 const text=(value,x,top,size=11,strong=false)=>page.drawText(clean(value),{x,y:top-size,size,font:strong?bold:font,color:rgb(0,0,0)});
 const rule=top=>page.drawLine({start:{x:48,y:top},end:{x:564,y:top},thickness:0.7,color:rgb(0,0,0)});
 const need=h=>{if(y-h<48)fresh();};
 const heading=label=>{need(32);text(label,48,y,10,true);y-=20;};
 const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.slice(5,7)+'/'+value.slice(8,10)+'/'+value.slice(0,4):value||'—';
 const table=(rows,widths)=>{for(const cells of rows){const wrapped=cells.map((c,i)=>lines(c,widths[i]-20,10)),h=Math.max(34,...wrapped.map(a=>a.length*14+16));if(h>680)throw Error('A report field is too long. Shorten it before exporting.');need(h);let x=48;for(let i=0;i<cells.length;i++){page.drawRectangle({x,y:y-h,width:widths[i],height:h,borderWidth:0.5,borderColor:rgb(0,0,0)});wrapped[i].forEach((s,j)=>text(s,x+10,y-8-j*14,10));x+=widths[i];}y-=h;}y-=18;};
 text('FUME HOOD',48,y,22,true);text('TEST REPORT',48,y-28,11,true);y-=56;rule(y);y-=22;
 heading('01   HOOD IDENTIFICATION');
 table([['Hood ID / location',r.asset||'—','Test date',date(r.date)],['Make',r.manufacturer||'—','Due date',date(r.due)],['Model',r.model||'—','Serial number',r.serial||'—']],[111,147,98,160]);
 heading('02   AIRFLOW RESULTS');
 table([['Opening width','Sash opening height','Opening area'],[r.width+' in',r.sash+' in',fmt(v.area,3)+' sq ft']],[172,172,172]);
 need(66);const top=y;for(const [i,label,value] of [[0,'AVERAGE FACE VELOCITY',fmt(v.average,1)+' FPM'],[1,'CALCULATED AIR VOLUME',fmt(v.cfm,1)+' CFM'],[2,'SMOKE TEST',r.fumeSmoke||'Not tested']]){const x=48+i*172;text(label,x+10,top,8,true);text(value,x+10,top-19,17,true);}y-=59;rule(y);y-=22;
 heading('03   FACE VELOCITY READINGS (FPM)');
 const readings=lines(v.count?r.inReadings:'Individual readings not recorded. Reported average: '+fmt(v.average,1)+' FPM.',496,10);for(const line of readings){need(15);text(line,58,y,10);y-=15;}y-=18;
 const statement='I certify that this record is a true and accurate representation of the work performed.';
 need(176);y=Math.min(y,224);rule(y);y-=18;heading('CERTIFICATION AND SIGNATURE');
 for(const line of lines(statement,516,10)){text(line,48,y,10);y-=14;}y-=12;
 const nameLines=lines(r.tech||'________________________________',260,11);for(const line of nameLines){text(line,48,y,11,true);y-=14;}text('Performed by / technician',48,y-3,8);const signatureTop=y+nameLines.length*14;
 if(signatureData(r.signatureImage)){const image=await doc.embedPng(r.signatureImage),scale=Math.min(220/image.width,48/image.height);page.drawImage(image,{x:330,y:signatureTop-42,width:image.width*scale,height:image.height*scale});}
 page.drawLine({start:{x:330,y:signatureTop-46},end:{x:564,y:signatureTop-46},thickness:0.5,color:rgb(0,0,0)});text('Signature',330,signatureTop-52,8);
 const pages=doc.getPages();for(let i=0;i<pages.length;i++)pages[i].drawText('Page '+(i+1)+' of '+pages.length,{x:510,y:24,size:8,font,color:rgb(0,0,0)});
 doc.setTitle('Fume Hood Test Report - '+(r.asset||''));return doc.save();
}
async function downloadFumeHoodPdf(r){try{const bytes=await buildFumeHoodPdf(r),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=('Fume-Hood-'+(r.asset||'report')+'-'+(r.date||'undated')).replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Fume hood PDF downloaded.');}catch(e){toast(e.message);}}
const beforeFumePrint=printReport;printReport=function(){if(isFumeHood(report()))return downloadFumeHoodPdf(report());return beforeFumePrint();};$('#print').onclick=()=>printReport();render();
