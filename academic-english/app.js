const KEY='academicLegalEnglishPL_v1';
let state={known:[],review:[],direction:'enpl',index:0,correct:0,total:0};
try{const s=JSON.parse(localStorage.getItem(KEY)); if(s) state={...state,...s}}catch(e){}
let view='cards', qItem=null, qLocked=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function pool(){const c=$('#category').value; return DATA.map((x,i)=>({...x,i})).filter(x=>c==='Wszystkie'||x.cat===c)}
function updateStats(){const p=pool(); $('#known').textContent=state.known.length; $('#reviewCount').textContent=state.review.length; $('#poolCount').textContent=p.length; $('#score').textContent=state.correct+' / '+state.total; const pct=p.length?Math.round(100*p.filter(x=>state.known.includes(x.i)).length/p.length):0; $('#progressBar').style.width=pct+'%'}
function current(){const p=pool(); if(!p.length)return null; if(!p.some(x=>x.i===state.index))state.index=p[0].i; return DATA[state.index]}
function whyExplanation(x){
  const sentence=x.e||'';
  const term=x.en||'';
  if (/\bexamines?\b/i.test(sentence)) return '„Examine” to czasownik: examine = badać / analizować. W zdaniu potrzebujemy orzeczenia po podmiocie „The article”, dlatego: „The article examines…”. „Analysis” jest rzeczownikiem, więc nie może stać tu bez dodatkowego czasownika. Poprawna wersja z „analysis”: „The article provides an analysis of legal liability…” = „Artykuł przedstawia analizę odpowiedzialności prawnej.”';
  if (/\banalysis\b/i.test(term) || /\banalysis\b/i.test(sentence)) return '„Analysis” to rzeczownik: analiza. Gdy chcemy powiedzieć, że ktoś coś analizuje, używamy czasownika „analyse/analyze” albo „examine”. Porównaj: „The article analyses the problem” oraz „The article provides an analysis of the problem”.';
  if (/\bsuggests?\b/i.test(sentence)) return '„Suggest” jest tu czasownikiem i znaczy „sugerować / wskazywać na”. Po „findings” potrzebujemy orzeczenia: „The findings suggest…”. Rzeczownik „suggestion” oznacza raczej sugestię/propozycję i nie pasuje do tej konstrukcji.';
  if (/\bindicates?\b/i.test(sentence)) return '„Indicate” jest czasownikiem: „wskazywać”. Po podmiocie „findings/results” pełni funkcję orzeczenia. Rzeczownik „indication” wymagałby innej konstrukcji, np. „The findings provide an indication of…”.';
  if (/\bdemonstrates?\b/i.test(sentence)) return '„Demonstrate” jest czasownikiem: wykazywać / dowodzić. Tutaj opisuje czynność wykonywaną przez „study”. Rzeczownik „demonstration” wymagałby konstrukcji typu „The study provides a demonstration of…”.';
  if (/\bimplies?\b/i.test(sentence)) return '„Imply” to czasownik: implikować / sugerować jako konsekwencję. „Implication” jest rzeczownikiem. Dlatego: „This distinction implies…” ale „This distinction has important implications…”.';
  if (/\bentails?\b/i.test(sentence)) return '„Entail” to czasownik znaczący „pociągać za sobą / wiązać się koniecznie z”. Jest mocniejsze niż „may lead to”. W tym zdaniu mówi o konsekwencji wynikającej z użycia AI.';
  if (/\bconcerns?\b/i.test(sentence)) return '„Concern” jest tu czasownikiem: „dotyczyć”. Konstrukcja „X concerns Y” jest bardzo typowa w tekstach akademickich. Rzeczownik „concern” oznacza m.in. obawę lub kwestię i wymaga innej składni.';
  if (/\bconstitutes?\b/i.test(sentence)) return '„Constitute” jest czasownikiem: „stanowić”. W stylu naukowym często zastępuje prostsze „is”. „Synthetic media constitute an emerging research area” = „Media syntetyczne stanowią rozwijający się obszar badawczy”.';
  if (/\bremains?\b/i.test(sentence)) return '„Remain” działa tu jako czasownik łączący, podobnie jak „be”: „pozostawać”. Po nim występuje przymiotnik lub imiesłów, np. „remains fragmented”, „remains underexplored”.';
  if (/\brequires?\b/i.test(sentence)) return '„Require” to czasownik „wymagać”. Po nim może wystąpić rzeczownik: „requires a reconceptualization”. Dlatego użyto rzeczownika „reconceptualization”, a nie czasownika.';
  if (/\bmay\b/i.test(sentence)) return '„May” jest czasownikiem modalnym i wyraża możliwość, a nie pewność. Po „may” zawsze używamy podstawowej formy czasownika, np. „may contribute”, „may be required”. To typowy akademicki hedging.';
  if (/\bshould\b/i.test(sentence)) return '„Should” jest czasownikiem modalnym. Po nim używamy podstawowej formy czasownika, np. „should be tested”. W tekstach naukowych często służy do ostrożnego formułowania rekomendacji.';
  if (/\bwithin the meaning of\b/i.test(sentence) || term==='within the meaning of') return '„Within the meaning of” to ustalona konstrukcja prawnicza oznaczająca „w rozumieniu” danego przepisu. Nie tłumaczy się jej dosłownie jako „wewnątrz znaczenia”.';
  if (/\bpursuant to\b/i.test(sentence) || term==='pursuant to') return '„Pursuant to” to formalna konstrukcja prawnicza: „zgodnie z / na podstawie”. Jest bardziej formalna niż „according to” i typowa dla ustaw, umów oraz artykułów prawniczych.';
  if (/\bunder EU law\b/i.test(sentence) || term==='under EU law') return '„Under EU law” oznacza „na gruncie prawa UE / zgodnie z prawem UE”. „Under” w języku prawniczym często znaczy „w ramach danego reżimu prawnego”, a nie dosłownie „pod”.';
  if (/\bgive rise to\b/i.test(sentence) || term==='give rise to') return '„Give rise to” to stała konstrukcja: „powodować / rodzić”. W tekstach prawniczych często łączy się z „liability”, „obligations”, „claims” lub „rights”.';
  if (/\bsubject to\b/i.test(sentence) || term==='subject to') return '„Be subject to” to stała konstrukcja prawnicza: „podlegać”. „The provider is subject to obligations” znaczy „Dostawca podlega obowiązkom”, a nie „jest przedmiotem obowiązków”.';
  if (/\bfrom a .* perspective\b/i.test(sentence)) return '„From a … perspective” to standardowa konstrukcja akademicka: „z perspektywy…”. Po „from” używamy rzeczownika „perspective”, nie przymiotnika.';
  if (/\bin light of\b/i.test(sentence) || term==='in light of') return '„In light of” to idiomatyczny łącznik akademicki: „w świetle / biorąc pod uwagę”. Nie tłumaczy się go dosłownie jako „w świetle lampy”; sygnalizuje wniosek wynikający z wcześniejszych ustaleń.';
  if (/\bagainst this background\b/i.test(sentence) || term==='against this background') return '„Against this background” to formalny łącznik: „na tym tle / w tym kontekście”. Wprowadza kolejny krok argumentacji na podstawie wcześniej przedstawionych informacji.';
  if (/\bwith regard to\b/i.test(sentence) || term==='with regard to') return '„With regard to” to formalne „w odniesieniu do / jeśli chodzi o”. Jest częste w tekstach naukowych i prawniczych, bo precyzyjnie ogranicza zakres zdania.';
  if (/\bthe\b/i.test(sentence) && term.includes(' ')) return 'To jest utrwalona konstrukcja akademicka lub prawnicza. Warto uczyć się jej jako całego zwrotu, ponieważ dosłowne tłumaczenie pojedynczych słów często brzmi nienaturalnie po polsku.';
  return 'W tym przykładzie hasło jest użyte w typowej dla angielskiego akademickiego konstrukcji. Zwróć uwagę przede wszystkim na część mowy i miejsce w zdaniu: angielski często wymaga innej formy wyrazu niż polski odpowiednik.';
}
function showCard(){const x=current(); if(!x)return; $('#cardCat').textContent=x.cat; $('#front').textContent=state.direction==='enpl'?x.en:x.pl; $('#back').textContent=state.direction==='enpl'?x.pl:x.en; $('#exEn').textContent=x.e; $('#exPl').textContent=x.p; const wb=$('#whyBox'); if(wb){wb.textContent=whyExplanation(x);wb.classList.add('hidden')} const wbtn=$('#whyBtn'); if(wbtn)wbtn.textContent='Dlaczego tak?'; $('#backArea').classList.add('hidden'); $('#reveal').classList.remove('hidden'); updateStats(); save()}
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
if($('#whyBtn')) $('#whyBtn').addEventListener('click',()=>{const box=$('#whyBox'); const open=!box.classList.contains('hidden'); box.classList.toggle('hidden',open); $('#whyBtn').textContent=open?'Dlaczego tak?':'Ukryj wyjaśnienie';});
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
