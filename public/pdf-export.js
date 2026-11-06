/* Direct vector PDF export. Every table row is laid out before drawing. */
const pdfSafe=value=>String(value??'').replace(/µ/g,'u').replace(/³/g,'^3').replace(/²/g,'^2').replace(/[–—]/g,'-').replace(/×/g,'x').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'?');
async function buildReportPdf(r,c){
 const {PDFDocument,StandardFonts,rgb}=PDFLib;
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=612,H=792,M=36,B=42,CW=W-M*2;let page,y;
 function newPage(){page=doc.addPage([W,H]);y=H-M;}
 newPage();
 const text=(s,x,top,size=9,isBold=false)=>page.drawText(pdfSafe(s),{x,y:top-size,size,font:isBold?bold:font,color:rgb(0,0,0)});
 function wrap(value,width,size=9,isBold=false){let f=isBold?bold:font,out=[];for(let line of pdfSafe(value).split(/\r?\n/)){let current='';for(let word of line.split(/\s+/)){if(!word)continue;while(f.widthOfTextAtSize(word,size)>width){let part='';for(let ch of word){if(f.widthOfTextAtSize(part+ch,size)>width)break;part+=ch;}if(current){out.push(current);current='';}out.push(part);word=word.slice(part.length);}if(f.widthOfTextAtSize((current?current+' ':'')+word,size)>width){out.push(current);current=word;}else current+=(current?' ':'')+word;}out.push(current);}return out.length?out:[''];}
 function need(h){if(y-h<B)newPage();}
 function title(){need(35);text('BSC Certification Report',M,y,17,true);y-=30;}
 function heading(s){need(35);y-=8;text(s,M,y,11,true);y-=18;}
 function paragraph(label,value){let lines=wrap((label?label+': ':'')+(value===''||value===undefined?'—':value),CW,9);for(let line of lines){need(12);text(line,M,y,9);y-=12;}y-=5;}
 function table(headers,rows,widths){
  const size=8,pad=4,line=10;
  function layout(row,isHead=false){let cells=row.map((v,i)=>wrap(v,widths[i]-pad*2,size,isHead));return {cells,height:Math.max(...cells.map(a=>a.length))*line+pad*2};}
  const head=headers?layout(headers,true):null,body=rows.map(a=>layout(a));
  let total=(head?.height||0)+body.reduce((n,a)=>n+a.height,0);
  // Move a whole table onto the next page whenever it can fit on one page.
  if(total<=H-M-B&&y-total<B)newPage();
  function draw(row,isHead=false){let x=M;for(let i=0;i<widths.length;i++){page.drawRectangle({x,y:y-row.height,width:widths[i],height:row.height,borderWidth:.5,borderColor:rgb(0,0,0)});row.cells[i].forEach((t,j)=>text(t,x+pad,y-pad-j*line,size,isHead));x+=widths[i];}y-=row.height;}
  if(head){need(head.height+(body[0]?.height||0));draw(head,true);}
  for(let row of body){if(row.height>H-M-B-(head?.height||0))throw Error('One table row is too long for a page. Shorten that field before exporting.');if(y-row.height<B){newPage();if(head)draw(head,true);}draw(row);}
  y-=8;
 }
 const v=x=>x===''||x===undefined||x===null?'—':x;
 title();
 table(null,[['Facility: '+v(r.client),'Equipment ID: '+v(r.asset)],['Address: '+v(r.address),'Make: '+v(r.manufacturer)],['Contact: '+v(r.contact),'Model: '+v(r.model)],['Phone: '+v(r.phone),'Serial number: '+v(r.serial)],['Building / room: '+v([r.building,r.room].filter(Boolean).join(' / ')),'Class / type: '+v(r.type)]],[270,270]);
 paragraph('Test standard / procedure',r.standard);
 const cols=[266,51,51,89,83],header=['Inspected','Min','Max','Measured','Result'];
 const row=(label,i)=>[label,v(r.refRows[i].min),v(r.refRows[i].max),v(r.refRows[i].measured),v(r.refRows[i].result)];
 table(header,inspectionLabels.map((n,i)=>row(n,i)),cols);
 heading('Supply HEPA'+(r.supplyHepaType&&r.supplyHepaType!=='Select method'?' - '+r.supplyHepaType:''));
 table(['Supply','Min','Max','Measured','Result'],hepaLabels.map((n,i)=>row(n,i+16)),cols);
 heading('Exhaust HEPA'+(r.exhaustHepaType&&r.exhaustHepaType!=='Select method'?' - '+r.exhaustHepaType:''));
 table(['Exhaust','Min','Max','Measured','Result'],hepaLabels.map((n,i)=>row(n,i+20)),cols);
 newPage();title();heading('Test equipment');
 table(['Equipment ID','Manufacturer','Model','Serial number','Calibration due','Used (Y/N)'],reportEquipment(r).map(a=>a.map(v)),[65,100,90,125,100,60]);
 if(r.instruments)paragraph('Additional instruments / calibration',r.instruments);
 if(r.type==='Class II Type B2'){heading('B2 total cabinet exhaust');table(['Observed exhaust (CFM)','Minimum (CFM)','Maximum (CFM)','Comparison'],[[v(r.b2Exhaust),v(r.b2ExhaustMin),v(r.b2ExhaustMax),b2ExhaustStatus(r)]],[150,100,100,190]);paragraph('Exhaust measurement method',r.b2ExhaustMethod);paragraph('Exhaust readings / observations',r.b2ExhaustNotes);}
 heading('Inflow');table(['Method / units','Workface','Area (ft^2)','Volume (CFM)','Velocity (FPM)'],[[r.inMethod,`${v(r.width)} x ${v(r.sash)} in`,fmt(c.area,3),fmt(c.cfm),fmt(c.fpm)]],[120,130,85,100,105]);
 paragraph('Inflow limits (FPM)',`${v(r.inMin)} - ${v(r.inMax)}`);paragraph('Inflow readings',r.inReadings);
 heading('Supply airflow');table(['Dimensions','Area (ft^2)','Average (FPM)','Volume (CFM)'],[[`${v(r.dfWidth)} x ${v(r.dfDepth)} in`,fmt(c.dfArea,3),fmt(c.d.avg),fmt(c.dfArea&&c.d.avg!==null?c.dfArea*c.d.avg:null)]],[160,110,135,135]);
 paragraph('Supply limits (FPM)',`${v(r.dfMin)} - ${v(r.dfMax)}`);paragraph('Supply readings (FPM)',r.dfReadings);
 heading('Site assessment');table(['Check','Result / observation'],['Sash Alarm','Exhaust Alarm','Exhaust System Interlock','Supply Alarm'].map((n,i)=>[n,v(r['site'+i])]),[220,320]);
 paragraph('Comments / conditions',r.notes);paragraph('Corrective actions / limitations',r.corrective);
 if(r.challengeEnabled==='Yes'){let a=challengeValues(r);paragraph('Calculated aerosol challenge',`(13,500 x ${r.nozzles}) / ${fmt(a.q,2)} CFM = ${fmt(a.value,2)} ug/L. Q source: ${r.challengeQMode}. Calculated, not a measured upstream concentration.`);}
 need(signatureData(r.signatureImage)?170:130);heading('Signature and approval');paragraph('','I certify that this record is a true and accurate representation of the work performed.');table(null,[['Performed by: '+v(r.tech),'Date certified: '+v(r.date)],['Certification due: '+v(r.due),'Determination: '+v(r.decision)]],[270,270]);if(signatureData(r.signatureImage)){const image=await doc.embedPng(r.signatureImage);const scale=Math.min(230/image.width,45/image.height);need(90);text('Signature:',M,y,9,true);y-=18;page.drawImage(image,{x:M,y:y-image.height*scale,width:image.width*scale,height:image.height*scale});y-=image.height*scale+8;}else paragraph('Signature','____________________________________');
 let pages=doc.getPages();for(let i=0;i<pages.length;i++){let pg=pages[i];pg.drawText(pdfSafe('Report: '+v(r.reportNo)),{x:M,y:22,size:8,font});let label=`Page ${i+1} of ${pages.length}`;pg.drawText(label,{x:W-M-font.widthOfTextAtSize(label,8),y:22,size:8,font});}
 doc.setTitle('BSC Certification Report');doc.setSubject('Cabinet certification test results');doc.setProducer('BSC Report Builder');
 return await doc.save();
}
let readyPdfUrl;
async function downloadReportPdf(){let button=$('#savePdf'),label=button.textContent;try{
 button.disabled=true;button.textContent='Creating PDF…';
 let r=ensureReference();syncChallenge(r);applyHepaDefaults(r);
 if(readingErrors().length)throw Error('Fix invalid airflow readings before exporting.');
 if(r.challengeEnabled==='Yes'&&challengeValues(r).value===null)throw Error('Enter a positive nozzle amount and valid Q.');
 const bytes=await buildReportPdf(r,calc(r));if(readyPdfUrl)URL.revokeObjectURL(readyPdfUrl);let url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));readyPdfUrl=url;let ready=$('#readyPdf');if(!ready){ready=document.createElement('a');ready.id='readyPdf';ready.style.cssText='color:white;align-self:center;text-decoration:underline';$('#previewActions').append(ready);}ready.href=url;ready.target='_blank';ready.rel='noopener';ready.textContent='Open PDF';
 let a=document.createElement('a');a.href=url;a.download=(r.reportNo||'BSC-report').replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';document.body.append(a);a.click();a.remove();toast('PDF created. Use Open PDF to view or share it.');
 }catch(e){toast('PDF could not be created: '+e.message);}finally{button.disabled=false;button.textContent=label;}
}
$('#savePdf').textContent='Download PDF';$('#savePdf').onclick=downloadReportPdf;
$('#previewActions span').textContent='Direct PDF download • no browser URL or export timestamp';
