function geoffSharePicks(){
 const s=lateMail?.selections?.[String(race.number)],live=s&&(s.revisedTip?.reliable!==false?s.revisedTip:s.provisionalLeader);
 const ordered=live?[live,...(s.topThree||[]).filter(h=>h.name!==live.name)]:baseline.filter(h=>h.eligible);
 return ordered.slice(0,3).map(h=>h.display);
}
function geoffShareText(){const picks=geoffSharePicks();return `I bet with Geoff · Flemington R${race.number}\n${picks.map((p,i)=>`${i+1}. ${p}`).join('\n')}\n${location.origin}/#race-${race.number}/form`}
async function geoffShareCard(){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');
 c.fillStyle='#171717';c.fillRect(0,0,1080,1350);c.fillStyle='#e53b35';c.fillRect(0,0,1080,28);
 const img=new Image();img.src='assets/geoff-source.jpg';await img.decode();c.drawImage(img,0,28,430,1322);
 const fade=c.createLinearGradient(300,0,640,0);fade.addColorStop(0,'rgba(23,23,23,0)');fade.addColorStop(1,'#171717');c.fillStyle=fade;c.fillRect(300,28,340,1322);
 c.fillStyle='#e53b35';c.font='800 34px Arial';c.fillText('GEOFFS GUIDE',480,120);c.fillStyle='#fff';c.font='800 76px Arial';c.fillText('I bet with',480,235);c.fillText('Geoff.',480,315);
 c.fillStyle='#aaa';c.font='700 25px Arial';c.fillText(`FLEMINGTON · RACE ${race.number}`,480,400);c.fillStyle='#fff';
 geoffSharePicks().forEach((p,i)=>{c.fillStyle=i===0?'#e53b35':'#fff';c.font='900 33px Arial';c.fillText(`#${i+1}`,480,525+i*155);c.fillStyle='#fff';c.font='800 48px Arial';c.fillText(p,550,525+i*155)});
 c.fillStyle='#aaa';c.font='24px Arial';c.fillText('Form opinion · check late mail before the race',480,1050);c.fillStyle='#fff';c.font='700 25px Arial';c.fillText(location.host,480,1110);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));return new File([blob],`geoffs-guide-r${race.number}.png`,{type:'image/png'});
}
async function shareGeoff(){
 const status=document.getElementById('shareStatus');try{const file=await geoffShareCard(),payload={title:'I bet with Geoff',text:geoffShareText(),url:`${location.origin}/#race-${race.number}/form`};if(navigator.canShare?.({files:[file]}))payload.files=[file];if(navigator.share){await navigator.share(payload);status.textContent='Shared.'}else{const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();status.textContent='Share card downloaded.'}}catch(e){if(e.name!=='AbortError')status.textContent='Share was not available. Try WhatsApp or Message.'}
}
document.getElementById('shareGeoff').onclick=shareGeoff;
document.getElementById('shareWhatsApp').onclick=()=>location.href=`https://wa.me/?text=${encodeURIComponent(geoffShareText())}`;
document.getElementById('shareMessage').onclick=()=>location.href=`sms:?&body=${encodeURIComponent(geoffShareText())}`;
