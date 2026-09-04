
const data = window.TRIP_DATA || [];
const hotels = window.HOTELS || [];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2,'0');
const dt = s => new Date(s.replace(' ','T'));
const dayOf = r => r.Day;
const timeOf = r => r.日期時間 ? r.日期時間.slice(11,16) : '';
const dateOf = r => r.日期時間 ? r.日期時間.slice(0,10) : '';

const days = [...new Set(data.map(dayOf))].sort((a,b)=>parseInt(a.slice(1))-parseInt(b.slice(1)));
const dayDates = {};
days.forEach(d => {
  const row = data.find(x=>x.Day===d && x.日期時間);
  dayDates[d] = row ? dateOf(row) : '';
});

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mapBtn(url){return url ? `<a class="action" href="${esc(url)}" target="_blank" rel="noopener">📍 導航</a>` : ''}
function mapcodeBtn(code){return code ? `<button class="action" onclick="copyText('${esc(code)}')">🗺 ${esc(code)}</button>` : ''}
window.copyText = async t => { try{await navigator.clipboard.writeText(t); alert('已複製 Map Code：'+t)}catch(e){prompt('複製 Map Code',t)} };

function itemHTML(r){
  const notes = [r['車程／保留'], r['停車'], r['Plan B'], r['備註']].filter(Boolean).slice(0,3);
  return `<article class="item">
    <div class="time">${esc(timeOf(r))}</div>
    <div>
      <h3>${esc(r['名稱'])}</h3>
      <div class="meta">
        ${r['類型']?`<span class="pill">${esc(r['類型'])}</span>`:''}
        ${r['地區']?`<span class="pill">${esc(r['地區'])}</span>`:''}
        ${r['優先度']?`<span class="pill">${esc(r['優先度'].replace('★★★★★ ','').replace('★★★★ ','').replace('★★★ ',''))}</span>`:''}
      </div>
      ${notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}
      <div class="actions">${mapBtn(r['Google Maps'])}${mapcodeBtn(r['Map Code'])}</div>
    </div>
  </article>`;
}
function renderList(el, rows){el.innerHTML = rows.length?rows.map(itemHTML).join(''):`<div class="empty">目前沒有資料</div>`}

function go(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+name+'View').classList.add('active');
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===name));
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

function defaultTripDay(){
  const now = new Date();
  const key = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const found = days.find(d=>dayDates[d]===key);
  return found || 'D01';
}

// Today
const todaySelect = $('#todaySelect');
days.forEach(d=>{
  const o=document.createElement('option');
  o.value=d; o.textContent=`${d} · ${dayDates[d].slice(5).replace('-','/')}`;
  todaySelect.appendChild(o);
});
todaySelect.value=defaultTripDay();
function renderToday(){
  const d=todaySelect.value;
  const rows=data.filter(r=>r.Day===d && r['類型']!=='備案');
  renderList($('#todayList'),rows);
}
todaySelect.addEventListener('change',renderToday); renderToday();

// Days
const tabs=$('#daysTabs');
days.forEach((d,i)=>{
  const b=document.createElement('button'); b.className='day-tab'+(i===0?' active':'');
  b.textContent=`${d} ${dayDates[d].slice(5).replace('-','/')}`; b.dataset.day=d; tabs.appendChild(b);
});
function renderDay(d){
  $$('.day-tab').forEach(b=>b.classList.toggle('active',b.dataset.day===d));
  renderList($('#daysList'),data.filter(r=>r.Day===d));
}
$$('.day-tab').forEach(b=>b.addEventListener('click',()=>renderDay(b.dataset.day))); renderDay('D01');

// Drive
renderList($('#driveList'), data.filter(r=>['移動','SA・PA'].includes(r['類型'])));

// Parking
const pRows=data.filter(r=>r['類型']==='停車');
$('#parkingList').innerHTML=pRows.map(r=>`<article class="card">
  <div class="big">${esc(r.Day)} · ${esc(dateOf(r).slice(5).replace('-','/'))} ${esc(timeOf(r))}</div>
  <h3>${esc(r['名稱'])}</h3>
  ${r['停車']?`<p class="note">${esc(r['停車'])}</p>`:''}
  ${r['Plan B']?`<p class="note"><strong>Plan B：</strong>${esc(r['Plan B'])}</p>`:''}
  <div class="actions">${mapBtn(r['Google Maps'])}${mapcodeBtn(r['Map Code'])}</div>
</article>`).join('');

// Hotels
$('#hotelList').innerHTML=hotels.map(h=>`<article class="card">
  <div class="big">${esc(h.dates)} · ${esc(h.area)}</div>
  <h3>${esc(h.name)}</h3>
  <p class="note">🅿️ ${esc(h.parking)}</p>
  <p class="note">${esc(h.note)}</p>
  <div class="actions">${mapBtn(h.map)}${mapcodeBtn(h.mapcode)}</div>
</article>`).join('');

// Plan B
renderList($('#planbList'), data.filter(r=>r['類型']==='備案'));

// Checklist
const checks=[
  '護照','台灣駕照','國際駕照／日文譯本','租車訂單','ETC／高速公路方案確認','住宿訂單',
  'Suzuki 歷史館預約','行動網路／eSIM','Google Maps 離線地圖','重要飯店／停車場 Map Code',
  '信用卡／旅遊保險','行李與行動電源','成田機場還車時間確認','11/29 ART HOTEL 晚上泡湯提醒'
];
const stored=JSON.parse(localStorage.getItem('trip-checks')||'{}');
function renderChecks(){
  $('#checklist').innerHTML=checks.map((c,i)=>`<label class="check-row ${stored[i]?'done':''}">
    <input type="checkbox" data-i="${i}" ${stored[i]?'checked':''}><span>${esc(c)}</span>
  </label>`).join('');
  $$('#checklist input').forEach(x=>x.addEventListener('change',e=>{
    stored[e.target.dataset.i]=e.target.checked; localStorage.setItem('trip-checks',JSON.stringify(stored)); renderChecks();
  }));
}
renderChecks();
$('#resetChecklist').addEventListener('click',()=>{localStorage.removeItem('trip-checks'); location.reload()});

// Home next item based on trip day; before trip shows first item.
function nextItem(){
  const now=new Date();
  let future=data.filter(r=>dt(r['日期時間'])>=now).sort((a,b)=>dt(a['日期時間'])-dt(b['日期時間']));
  if(!future.length) future=data;
  const r=future[0];
  $('#nextDayTag').textContent=r.Day;
  $('#nextItem').innerHTML=itemHTML(r);
}
nextItem();

// Install PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e; $('#installBtn').hidden=false;
});
$('#installBtn').addEventListener('click',async()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $('#installBtn').hidden=true;
});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'));
}
