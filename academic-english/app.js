const KEY='academicLegalEnglishPL_v1';
let state={known:[],review:[],direction:'enpl',index:0,correct:0,total:0};
try{const s=JSON.parse(localStorage.getItem(KEY)); if(s) state={...state,...s}}catch(e){}
let view='cards', qItem=null, qLocked=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function pool(){const c=$('#category').value; return DATA.map((x,i)=>({...x,i})).filter(x=>c==='Wszystkie'||x.cat===c)}
function updateStats(){const p=pool(); $('#known').textContent=state.known.length; $('#reviewCount').textContent=state.review.length; $('#poolCount').textContent=p.length; $('#score').textContent=state.correct+' / '+state.total; const pct=p.length?Math.round(100*p.filter(x=>state.known.includes(x.i)).length/p.length):0; $('#progressBar').style.width=pct+'%'}
function current(){const p=pool(); if(!p.length)return null; if(!p.some(x=>x.i===state.index))state.index=p[0].i; return DATA[state.index]}
function showCard(){const x=current(); if(!x)return; $('#cardCat').textContent=x.cat; $('#front').textContent=state.direction==='enpl'?x.en:x.pl; $('#back').textContent=state.direction==='enpl'?x.pl:x.en; $('#exEn').textContent=x.e; $('#exPl').textContent=x.p; $('#backArea').classList.add('hidden'); $('#reveal').classList.remove('hidden'); updateStats(); save()}
function nextCard(){const p=pool(); if(!p.length)return; let n=p[Math.floor(Math.random()*p.length)]; if(p.length>1&&n.i===state.index) n=p[(p.findIndex(x=>x.i===n.i)+1)%p.length]; state.index=n.i; showCard()}
function setView(v){view=v; ['cards','quiz','list'].forEach(id=>$('#'+id).classList.toggle('hidden',id!==v)); $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v)); if(v==='cards')showCard(); if(v==='quiz')newQuiz(); if(v==='list')renderList()}
function newQuiz(){const p=pool(); if(!p.length)return; qLocked=false; $('#feedback').textContent=''; $('#feedback').className='feedback'; $('#qNext').classList.add('hidden'); qItem=p[Math.floor(Math.random()*p.length)]; $('#qWord').textContent=state.direction==='enpl'?qItem.en:qItem.pl; const correct=state.direction==='enpl'?qItem.pl:qItem.en; const wrong=p.filter(x=>x.i!==qItem.i).sort(()=>Math.random()-.5).slice(0,3).map(x=>state.direction==='enpl'?x.pl:x.en); const opts=[correct,...wrong].sort(()=>Math.random()-.5); const box=$('#qOptions'); box.innerHTML=''; opts.forEach(t=>{const b=document.createElement('button'); b.textContent=t; b.addEventListener('click',()=>answerQuiz(t,correct,b)); box.appendChild(b)})}
function answerQuiz(chosen,correct,btn){if(qLocked)return; qLocked=true; state.total++; if(chosen===correct){state.correct++; if(!state.known.includes(qItem.i))state.known.push(qItem.i); state.review=state.review.filter(i=>i!==qItem.i); $('#feedback').textContent='Dobrze.'; $('#feedback').className='feedback good'}else{if(!state.review.includes(qItem.i))state.review.push(qItem.i); state.known=state.known.filter(i=>i!==qItem.i); $('#feedback').textContent='Nie. Poprawnie: '+correct; $('#feedback').className='feedback bad'} [...$('#qOptions').children].forEach(b=>{b.disabled=true;if(b.textContent===correct)b.style.borderColor='var(--good)'}); $('#qNext').classList.remove('hidden'); updateStats(); save()}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function renderList(){const q=$('#search').value.trim().toLowerCase(); const arr=pool().filter(x=>!q||[x.en,x.pl,x.e,x.p].some(v=>v.toLowerCase().includes(q))); $('#results').innerHTML=arr.map(x=>`<div class="item"><div class="tag">${esc(x.cat)}</div><div class="pair">${esc(x.en)} → ${esc(x.pl)}</div><div class="small"><b>EN:</b> ${esc(x.e)}<br><b>PL:</b> ${esc(x.p)}</div></div>`).join('')||'<div class="small">Brak wyników.</div>'; updateStats()}
$$('.tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#category').addEventListener('change',()=>{if(view==='cards')showCard();if(view==='quiz')newQuiz();if(view==='list')renderList()});
$('#direction').addEventListener('click',()=>{state.direction=state.direction==='enpl'?'plen':'enpl'; $('#direction').textContent=state.direction==='enpl'?'EN → PL':'PL → EN'; save(); if(view==='cards')showCard(); if(view==='quiz')newQuiz()});
$('#random').addEventListener('click',()=>{if(view==='cards')nextCard();if(view==='quiz')newQuiz()});
$('#reveal').addEventListener('click',()=>{$('#reveal').classList.add('hidden');$('#backArea').classList.remove('hidden')});
$('#next').addEventListener('click',nextCard);
$('#again').addEventListener('click',()=>{if(!state.review.includes(state.index))state.review.push(state.index); state.known=state.known.filter(i=>i!==state.index); save(); nextCard()});
$('#master').addEventListener('click',()=>{if(!state.known.includes(state.index))state.known.push(state.index); state.review=state.review.filter(i=>i!==state.index); save(); nextCard()});
$('#qNext').addEventListener('click',newQuiz);
$('#search').addEventListener('input',renderList);
$('#reset').addEventListener('click',()=>{if(confirm('Wyzerować postęp nauki?')){state.known=[];state.review=[];state.correct=0;state.total=0;save();updateStats();if(view==='cards')showCard();if(view==='quiz')newQuiz()}});
$('#direction').textContent=state.direction==='enpl'?'EN → PL':'PL → EN';
showCard();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
let deferredInstallPrompt=null;
const installBtn=document.querySelector('#installApp');
const installStatus=document.querySelector('#installStatus');
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true}
function refreshInstallUi(){
  if(isStandalone()){
    if(installBtn) installBtn.classList.add('hidden');
    if(installStatus) installStatus.textContent='Aplikacja jest już uruchomiona w trybie aplikacji.';
    return;
  }
  if(installBtn){
    installBtn.disabled=!deferredInstallPrompt;
    installBtn.style.opacity=deferredInstallPrompt?'1':'.6';
  }
  if(installStatus){
    installStatus.textContent=deferredInstallPrompt
      ? 'Gotowe do instalacji. Naciśnij przycisk.'
      : 'Chrome jeszcze nie udostępnił instalacji. Otwórz tę stronę bezpośrednio w Chrome i odśwież ją raz.';
  }
}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  refreshInstallUi();
});
if(installBtn){
  installBtn.addEventListener('click',async()=>{
    if(!deferredInstallPrompt){
      refreshInstallUi();
      return;
    }
    deferredInstallPrompt.prompt();
    try{
      const choice=await deferredInstallPrompt.userChoice;
      if(installStatus) installStatus.textContent=choice.outcome==='accepted'?'Instalacja została zaakceptowana.':'Instalacja została anulowana.';
    }catch(e){}
    deferredInstallPrompt=null;
    refreshInstallUi();
  });
}
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  if(installStatus) installStatus.textContent='Aplikacja została zainstalowana.';
  refreshInstallUi();
});
refreshInstallUi();
