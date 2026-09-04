const baseData=window.TRIP_DATA||[], hotels=window.HOTELS||[], flights=window.FLIGHTS||[], loungeData=window.LOUNGE_DATA||[], rental=window.RENTAL_DATA||{}, ref=window.REFERENCE_DATA||{cards:[],networkPromos:[],guides:[]};
const APP_META={version:'2.8',label:'FINAL QA',released:'2026-09-04'};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], pad=n=>String(n).padStart(2,'0');
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2);
const dt=s=>new Date(String(s).replace(' ','T')); const dateOf=r=>r.日期時間?.slice(0,10)||''; const timeOf=r=>r.日期時間?.slice(11,16)||'';

const ITIN_LOCAL_KEY='japan-trip-itinerary-custom-v1';
function loadItineraryLocal(){
  try{
    const x=JSON.parse(localStorage.getItem(ITIN_LOCAL_KEY)||'{}');
    return {overrides:x.overrides||{},hidden:x.hidden||{},added:Array.isArray(x.added)?x.added:[]};
  }catch{return {overrides:{},hidden:{},added:[]}}
}
let itineraryCustom=loadItineraryLocal();

function buildEffectiveData(){
  const built=baseData
    .filter(r=>!itineraryCustom.hidden[r._id])
    .map(r=>{
      const o=itineraryCustom.overrides[r._id];
      return o?{...r,...o,_edited:true}:{...r};
    });
  const added=itineraryCustom.added.map(r=>({...r,_custom:true}));
  return [...built,...added].sort((a,b)=>String(a.日期時間).localeCompare(String(b.日期時間)));
}
let data=buildEffectiveData();

const days=[...new Set(baseData.map(r=>r.Day))].sort((a,b)=>parseInt(a.slice(1))-parseInt(b.slice(1)));
const dayDates={};days.forEach(d=>{const r=baseData.find(x=>x.Day===d&&x.日期時間);dayDates[d]=r?dateOf(r):''});

async function saveItineraryCustom(){
  localStorage.setItem(ITIN_LOCAL_KEY,JSON.stringify(itineraryCustom));
  await TripDB.put('settings',{id:'itineraryCustom',value:itineraryCustom});
}
function refreshEffectiveData(){data=buildEffectiveData();}

function go(name){$$('.view').forEach(v=>v.classList.remove('active')); const v=$('#'+name+'View'); if(v)v.classList.add('active'); $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===name)); window.scrollTo({top:0,behavior:'smooth'}); if(name==='expenses')renderExpenses(); if(name==='shopping')renderShopping(); if(name==='notes')renderNotes(); if(name==='hotels')renderHotels(); if(name==='wallet')refreshRateUI(); if(name==='cards'){renderCards();renderCardCompare();} if(name==='trip')renderTripMode(); if(name==='flights')renderFlights(); if(name==='itineraryEdit')renderItineraryEditor(); if(name==='rental')renderRental(); if(name==='pretrip')renderPretrip(); if(name==='system')renderSystem(); if(name==='qa')runQa(false);}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
function mapBtn(url){return url?`<a href="${esc(url)}" target="_blank" rel="noopener">📍 導航</a>`:''}
function mapCode(code,status=''){
  if(code)return `<button class="mapcode-btn" onclick="copyText('${esc(code)}')" title="Mapion 核實">🗺 ${esc(code)}</button>`;
  if(status)return `<span class="mapcode-na" title="${esc(status)}">🗺 Map Code：—</span>`;
  return '';
}
function rowMapActions(r){return `${mapBtn(r['Google Maps'])}${r['Google Maps']?mapCode(r['Map Code'],r['Map Code Status']):mapCode(r['Map Code'])}`;}
window.copyText=async t=>{try{await navigator.clipboard.writeText(t);toast('已複製 '+t)}catch{prompt('複製',t)}};
function toast(t){const d=document.createElement('div');d.textContent=t;d.style='position:fixed;left:50%;bottom:95px;transform:translateX(-50%);background:#28231e;color:white;padding:10px 14px;border-radius:999px;font-size:12px;z-index:99';document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function itemHTML(r){const notes=[r['車程／保留'],r['停車'],r['Plan B'],r['備註']].filter(Boolean).slice(0,3);return `<article class="item"><div class="time">${esc(timeOf(r))}</div><div><h3>${esc(r['名稱'])}</h3><div class="meta">${r['類型']?`<span class="pill">${esc(r['類型'])}</span>`:''}${r['地區']?`<span class="pill">${esc(r['地區'])}</span>`:''}${r._custom?`<span class="pill custom-pill">＋自訂</span>`:r._edited?`<span class="pill custom-pill">✏️已修改</span>`:''}</div>${notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}<div class="actions">${rowMapActions(r)}</div></div></article>`}
function renderList(el,rows){el.innerHTML=rows.length?rows.map(itemHTML).join(''):'<div class="empty">目前沒有資料</div>'}
function currentTripDay(){const now=new Date(),key=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;return days.find(d=>dayDates[d]===key)||'D01'}
// countdown/home
(function(){const start=new Date('2026-11-21T00:00:00+08:00'),now=new Date(),diff=Math.ceil((start-now)/86400000);$('#countdown').textContent=diff>0?`距離出發 ${diff} 天`:diff>-10?'TRIP MODE':'JOURNEY ARCHIVE';})();
const sel=$('#todaySelect');days.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=`${d} · ${dayDates[d].slice(5).replace('-','/')}`;sel.appendChild(o)});sel.value=currentTripDay();sel.addEventListener('change',renderToday);
function renderToday(){const d=sel.value;renderList($('#todayList'),data.filter(r=>r.Day===d&&r['類型']!=='備案'));}
renderToday(); const tabs=$('#daysTabs');days.forEach((d,i)=>{const b=document.createElement('button');b.textContent=`${d} ${dayDates[d].slice(5).replace('-','/')}`;b.dataset.day=d;b.className=i===0?'active':'';tabs.appendChild(b)});function renderDay(d){$$('#daysTabs button').forEach(b=>b.classList.toggle('active',b.dataset.day===d));renderList($('#daysList'),data.filter(r=>r.Day===d))}$$('#daysTabs button').forEach(b=>b.addEventListener('click',()=>renderDay(b.dataset.day)));renderDay('D01');


// FLIGHTS
function flightSeatSettingId(f){return `flightSeat_${f.id}`}
async function flightSeatDone(f){
  if(f.seat==='已選位')return true;
  return !!(await TripDB.get('settings',flightSeatSettingId(f)))?.value;
}
function flightLocalDateTime(f){
  // for sorting by departure local date; only two fixed flights here
  const tz=f.id==='BR196'?'+08:00':'+09:00';
  return new Date(`${f.date}T${f.depart}:00${tz}`);
}
function seatCountdownText(f,done){
  if(done)return '✅ 已選位';
  if(!f.seatReminder)return '';
  const t=new Date(f.seatReminder), now=new Date(), ms=t-now;
  if(ms<=0)return '🔴 已進入起飛前 48 小時：請選位';
  const d=Math.floor(ms/86400000), h=Math.floor((ms%86400000)/3600000);
  return `⏳ 距選位提醒 ${d} 天 ${h} 小時`;
}
function flightMiniHTML(f){
  return `<article class="flight-mini">
    <div class="flight-code"><small>${esc(f.direction)}</small><b>${esc(f.flight)}</b></div>
    <div class="flight-route">
      <div><b>${esc(f.depart)}</b><span>${esc(f.from)}</span><small>${esc(f.fromTerminal)}</small></div>
      <i>→</i>
      <div><b>${esc(f.arrive)}</b><span>${esc(f.to)}</span><small>${esc(f.toTerminal)}</small></div>
    </div>
  </article>`;
}
async function renderFlights(){
  const seatMap={};
  for(const f of flights)seatMap[f.id]=await flightSeatDone(f);
  const out=flights.find(f=>f.id==='BR196');
  const outDone=out?seatMap[out.id]:true;
  const rem=$('#flightReminder');
  if(rem && out){
    rem.innerHTML=`<section class="paper flight-reminder ${outDone?'done':''}">
      <div><small>BR196 去程選位</small><b>${seatCountdownText(out,outDone)}</b>
      <p>提醒時間：2026/11/19 15:20（台灣時間，起飛前48小時）</p></div>
      <div class="actions">
        ${outDone?`<button id="undoSeatBtn">↺ 改成未選位</button>`:`<button class="primary" id="markSeatBtn">✓ 我已選位</button>`}
        <button id="seatIcsBtn">📅 加入行事曆提醒</button>
      </div>
    </section>`;
    $('#markSeatBtn')?.addEventListener('click',async()=>{await TripDB.put('settings',{id:flightSeatSettingId(out),value:true});renderFlights();toast('BR196 已標記完成選位')});
    $('#undoSeatBtn')?.addEventListener('click',async()=>{await TripDB.put('settings',{id:flightSeatSettingId(out),value:false});renderFlights()});
    $('#seatIcsBtn')?.addEventListener('click',()=>downloadSeatReminderICS(out));
  }
  $('#flightList').innerHTML=flights.map(f=>{
    const done=seatMap[f.id];
    const mapcode=f.mapcode?mapCode(f.mapcode):'';
    return `<article class="flight-card">
      <div class="flight-card-head"><div><small>${esc(f.direction)} · ${esc(f.airline)}</small><h3>${esc(f.flight)}</h3></div><span class="seat-tag ${done?'done':''}">${done?'已選位':'待選位'}</span></div>
      <div class="flight-route bigroute">
        <div><b>${esc(f.depart)}</b><span>${esc(f.from)}</span><small>${esc(f.fromTerminal)} · ${esc(f.departTZ)}</small></div>
        <i>✈</i>
        <div><b>${esc(f.arrive)}</b><span>${esc(f.to)}</span><small>${esc(f.toTerminal)} · ${esc(f.arriveTZ)}</small></div>
      </div>
      <div class="flight-notes"><p>📅 ${esc(f.date)}</p><p>🧳 ${esc(f.airportTarget)}</p>${f.id==='BR196'?`<p>💺 ${esc(seatCountdownText(f,done))}</p>`:'<p>💺 回程已選好座位</p>'}</div>
      <div class="actions">${mapBtn(f.map)}${mapcode}<button onclick="scrollToLounge('${f.id}')">🛋 貴賓室</button><button onclick="downloadFlightICS('${f.id}')">📅 航班加入行事曆</button></div>
    </article>`;
  }).join('');
  renderLounges();
}
function icsEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n')}
function dlICS(name,body){downloadBlob(new Blob([body],{type:'text/calendar;charset=utf-8'}),name)}
window.downloadFlightICS=id=>{
  const f=flights.find(x=>x.id===id);if(!f)return;
  const utc = id==='BR196'
    ? {s:'20261121T072000Z',e:'20261121T102000Z'}
    : {s:'20261130T112000Z',e:'20261130T152500Z'};
  const body=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Japan Road Trip 2026//Flight//ZH-TW\r\nBEGIN:VEVENT\r\nUID:${id}-2026@japantrip\r\nDTSTART:${utc.s}\r\nDTEND:${utc.e}\r\nSUMMARY:${icsEscape(`${f.airline} ${f.flight} ${f.from} → ${f.to}`)}\r\nDESCRIPTION:${icsEscape(`${f.fromTerminal} → ${f.toTerminal}。${f.airportTarget}。航班資訊以航空公司當日公告為準。`)}\r\nBEGIN:VALARM\r\nTRIGGER:-PT3H\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEscape(`${f.flight} 起飛前3小時提醒`)}\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
  dlICS(`${id}-2026.ics`,body);
}
function downloadSeatReminderICS(f){
  const body=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Japan Road Trip 2026//Seat Reminder//ZH-TW\r\nBEGIN:VEVENT\r\nUID:seat-${f.id}-2026@japantrip\r\nDTSTART:20261119T072000Z\r\nDTEND:20261119T075000Z\r\nSUMMARY:${icsEscape(`${f.id} 去程選位提醒`)}\r\nDESCRIPTION:${icsEscape('起飛前48小時。記得進入長榮航空完成BR196座位選擇。')}\r\nBEGIN:VALARM\r\nTRIGGER:PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEscape(`${f.id} 現在可以處理選位`)}\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
  dlICS(`BR196-seat-reminder.ics`,body);
}
function renderHomeFlight(){
  const el=$('#homeFlightText');if(!el||!flights.length)return;
  const now=new Date();
  const future=flights.filter(f=>flightLocalDateTime(f)>=now).sort((a,b)=>flightLocalDateTime(a)-flightLocalDateTime(b));
  const f=future[0]||flights[flights.length-1];
  el.textContent=`${f.flight} · ${f.date.slice(5).replace('-','/')} ${f.depart} ${f.from} → ${f.to}`;
}
renderHomeFlight();


async function loungeEligible(id){
  return !!(await TripDB.get('settings',`loungeEligible_${id}`))?.value;
}
window.toggleLoungeEligible=async(id)=>{
  const current=await loungeEligible(id);
  await TripDB.put('settings',{id:`loungeEligible_${id}`,value:!current});
  renderLounges();
};
window.scrollToLounge=flight=>{
  const el=document.querySelector(`[data-lounge-flight="${flight}"]`);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
};
async function renderLounges(){
  const el=$('#loungeList');if(!el)return;
  const cards=[];
  for(const l of loungeData){
    const ok=await loungeEligible(l.id);
    cards.push(`<article class="lounge-card" data-lounge-flight="${esc(l.flight)}">
      <div class="lounge-head">
        <div><small>${esc(l.flight)} · ${esc(l.airport)}</small><h3>${esc(l.title)}</h3></div>
        <button class="eligibility ${ok?'done':''}" onclick="toggleLoungeEligible('${esc(l.id)}')">${ok?'✓ 已確認資格':'○ 尚未確認資格'}</button>
      </div>
      <div class="lounge-rule"><b>使用資格</b><p>${esc(l.eligibility)}</p></div>
      <p class="note">${esc(l.usage)}</p>
      <div class="lounge-spots">${l.spots.map(s=>`<div class="lounge-spot"><b>${esc(s.name)}</b><span>${esc(s.location||'')}</span><span>${esc(s.hours||'')}</span>${s.services?`<span>${esc(s.services)}</span>`:''}</div>`).join('')}</div>
      <div class="actions">
        <a href="${esc(l.source)}" target="_blank">官方據點 ↗</a>
        ${l.project?`<a href="${esc(l.project)}" target="_blank">權益說明 ↗</a>`:''}
        ${l.airportOfficial?`<a href="${esc(l.airportOfficial)}" target="_blank">機場官方 ↗</a>`:''}
      </div>
      <p class="verified-note">最後查核：${esc(l.verified)}。合作據點及卡片資格可能異動，出發前建議再確認一次。</p>
    </article>`);
  }
  el.innerHTML=cards.join('');
}

// LIVE TRIP MODE
const tripSel=$('#tripDaySelect');
days.forEach(d=>{
  const o=document.createElement('option');
  o.value=d;o.textContent=`${d} · ${dayDates[d].slice(5).replace('-','/')}`;
  tripSel.appendChild(o)
});
tripSel.value=currentTripDay();
tripSel.addEventListener('change',renderTripMode);

const itemKey=r=>`${r.Day}|${r.日期時間}|${r['名稱']}`;
async function getTripDone(){
  return (await TripDB.get('settings','tripDone'))?.value||{};
}
async function setTripDone(map){
  await TripDB.put('settings',{id:'tripDone',value:map});
}
function hotelForDay(d){
  const mmdd=dayDates[d]?.slice(5).replace('-','/');
  return hotels.find(h=>h.dates.includes(mmdd))||null;
}
function tripCompact(r){
  if(!r)return '<p class="note">今天沒有資料</p>';
  return `<div class="trip-compact">
    <b>${esc(timeOf(r))} · ${esc(r['名稱'])}</b>
    ${r['車程／保留']?`<small>${esc(r['車程／保留'])}</small>`:''}
    ${r['備註']?`<small>${esc(r['備註'])}</small>`:''}
    <div class="actions">${rowMapActions(r)}</div>
  </div>`;
}
async function renderTripMode(){
  if(!tripSel)return;
  const d=tripSel.value||currentTripDay();
  const rows=data.filter(r=>r.Day===d&&r['類型']!=='備案').sort((a,b)=>dt(a.日期時間)-dt(b.日期時間));
  const backups=data.filter(r=>r.Day===d&&r['類型']==='備案').sort((a,b)=>dt(a.日期時間)-dt(b.日期時間));
  const parking=rows.filter(r=>r['類型']==='停車');
  const done=await getTripDone();
  const completed=rows.filter(r=>done[itemKey(r)]).length;
  const pct=rows.length?Math.round(completed/rows.length*100):0;
  const selectedDate=dayDates[d];
  const tripRentalSection=$('#tripRentalSection');
  if(tripRentalSection && (d==='D03'||d==='D10')){
    tripRentalSection.hidden=false;
    const office=d==='D03'?rental.pickup:rental.return;
    const title=d==='D03'?`12:00 取車｜${office.office}`:`目標16:00還車｜${office.office}`;
    $('#tripRentalCard').innerHTML=`<div class="trip-rental-mini"><b>${esc(title)}</b><small>${esc(office.address||'')}</small><small>🗺 ${esc(office.mapcode||'')}</small><div class="actions">${mapBtn(office.map)}${mapCode(office.mapcode)}</div></div>`;
  }else if(tripRentalSection){tripRentalSection.hidden=true;}

  const todaysFlight=flights.find(f=>f.date===selectedDate);
  const tripFlightSection=$('#tripFlightSection');
  if(todaysFlight && tripFlightSection){
    tripFlightSection.hidden=false;
    $('#tripFlightCard').innerHTML=flightMiniHTML(todaysFlight);
  }else if(tripFlightSection){tripFlightSection.hidden=true;}


  $('#tripDateLabel').textContent=`${selectedDate} · ${d}`;
  $('#tripDayTitle').textContent=rows[0]?.['地區']?`${d} · ${rows[0]['地區']}`:d;
  $('#tripProgressText').textContent=completed?`已完成 ${completed}/${rows.length} 項`:'從下一站開始，照著走就好';
  $('#tripProgressRing').style.setProperty('--p',pct);
  $('#tripProgressRing span').textContent=`${pct}%`;

  let next=rows.find(r=>!done[itemKey(r)])||rows[rows.length-1];
  const todayKey=new Date().toISOString().slice(0,10);
  if(selectedDate===todayKey){
    const notDone=rows.filter(r=>!done[itemKey(r)]);
    const upcoming=notDone.find(r=>dt(r.日期時間)>=new Date());
    if(upcoming)next=upcoming;
  }
  $('#tripNextItem').innerHTML=next?itemHTML(next):'<div class="empty">今天行程完成 🎉</div>';
  $('#tripQuickActions').innerHTML=next?`
    ${next['Google Maps']?`<a class="primary-action" href="${esc(next['Google Maps'])}" target="_blank">📍 導航下一站</a>`:''}
    ${next['Google Maps']?mapCode(next['Map Code'],next['Map Code Status']):''}
    <button onclick="toggleTripDoneByKey('${esc(itemKey(next))}')">${done[itemKey(next)]?'↺ 標為未完成':'✓ 完成這一站'}</button>
    <button data-go="cards">💳 刷哪張卡</button>`:'';
  $$('#tripQuickActions [data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

  const nextDrive=rows.find(r=>r['類型']==='移動'&&!done[itemKey(r)])||rows.find(r=>r['類型']==='移動');
  $('#tripDrive').innerHTML=tripCompact(nextDrive);

  const h=hotelForDay(d);
  if(h){
    const b=h.booking||{};
    $('#tripHotel').innerHTML=`<div class="trip-hotel" style="background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.62)),url('${h.image||''}')">
      <div><b>${esc(h.name)}</b><small>${esc(h.area)} · ${esc(h.dates)}</small>
      ${b.amount?`<small>${esc(b.platform||'')} · ${esc(b.amount)}</small>`:''}
      <div class="actions">${mapBtn(h.map)}${mapCode(h.mapcode)}</div></div>
    </div>`;
  }else $('#tripHotel').innerHTML='<p class="note">今天沒有住宿資料</p>';

  $('#tripParking').innerHTML=parking.length?parking.map(r=>`<div class="compact-row"><div><b>${esc(timeOf(r))} ${esc(r['名稱'])}</b><small>${esc(r['停車']||'')}</small></div><div class="actions">${rowMapActions(r)}</div></div>`).join(''):'<p class="note">今天沒有另外設定停車卡。</p>';

  $('#tripPlanB').innerHTML=backups.length?backups.map(r=>`<div class="compact-row backup"><div><b>${esc(r['名稱'])}</b><small>${esc(r['Plan B']||r['備註']||'')}</small></div></div>`).join(''):'<p class="note">今天沒有額外備案。</p>';

  $('#tripTimeline').innerHTML=rows.map(r=>{
    const key=itemKey(r),isDone=!!done[key];
    return `<article class="trip-line ${isDone?'done':''}">
      <button class="trip-check" onclick="toggleTripDoneByKey('${esc(key)}')">${isDone?'✓':'○'}</button>
      <div class="trip-line-time">${esc(timeOf(r))}</div>
      <div class="grow"><b>${esc(r['名稱'])}</b><div class="meta">${r['類型']?`<span class="pill">${esc(r['類型'])}</span>`:''}${r['地區']?`<span class="pill">${esc(r['地區'])}</span>`:''}</div>${r['備註']?`<small>${esc(r['備註'])}</small>`:''}</div>
      <div class="actions">${rowMapActions(r)}</div>
    </article>`
  }).join('');

  // Keep detailed itinerary selector in sync.
  sel.value=d;
}
window.toggleTripDoneByKey=async key=>{
  const done=await getTripDone();done[key]=!done[key];await setTripDone(done);renderTripMode();
};
$('#clearTripDone')?.addEventListener('click',async()=>{
  const d=tripSel.value;
  const done=await getTripDone();
  data.filter(r=>r.Day===d).forEach(r=>delete done[itemKey(r)]);
  await setTripDone(done);renderTripMode();toast('已清除這一天的完成狀態')
});
$('#tripFullTimeline')?.addEventListener('click',()=>{sel.value=tripSel.value;renderToday();go('today')});
$('#tripAddExpense')?.addEventListener('click',()=>$('#addExpenseBtn').click());
$('#tripScanReceipt')?.addEventListener('click',()=>$('#scanReceiptBtn').click());
$('#tripAddNote')?.addEventListener('click',()=>$('#addNoteBtn').click());
renderTripMode();



// RENTAL CAR
function yen(n){return `¥${Number(n||0).toLocaleString()}`}
function renderRental(){
  if(!rental?.company)return;
  $('#rentalHero').innerHTML=`<div><small>${esc(rental.company)}</small><h2>${esc(rental.vehicle)}</h2><p>${esc(rental.vehicleExample||'')}</p><div class="meta"><span class="pill">${esc(rental.payment||'')}</span><span class="pill">${esc(rental.bookingSource||'')}</span></div></div><div class="rental-total"><small>費用合計</small><b>${yen(rental.price?.total)}</b><span>含稅</span></div>`;
  const officeHTML=(o,label,time)=>`<div class="section-head"><h3>${label}</h3><span class="tag">${esc(time)}</span></div>
    <h4>${esc(o.office||'')}</h4><p class="note">${esc(o.address||'')}</p>
    ${o.access?`<p class="note">${esc(o.access)}</p>`:''}
    <p class="note">☎ ${esc(o.phone||'')} · ${esc(o.hours||'')}</p>
    <div class="mapcode-feature"><small>MAP CODE</small><b>${esc(o.mapcode||'—')}</b><button onclick="copyText('${esc(o.mapcode||'')}')">複製</button></div>
    <div class="actions">${mapBtn(o.map)}${mapCode(o.mapcode)}</div>`;
  $('#rentalPickup').innerHTML=officeHTML(rental.pickup,'📍 取車',`${rental.pickup.date} ${rental.pickup.time}`);
  $('#rentalReturn').innerHTML=officeHTML(rental.return,'🏁 還車',`${rental.return.date}｜預約 ${rental.return.bookedTime}／目標 ${rental.return.targetTime}`);
  const p=rental.price||{};
  const rows=[
    ['車輛基本費用',p.base],
    ['甲租乙還',p.oneWay],
    ['2026 Tabirai Deals 夏日特賣',p.discount],
    ['租借 ETC 卡',p.etcCard]
  ];
  $('#rentalCosts').innerHTML=rows.map(x=>`<div class="cost-row"><span>${esc(x[0])}</span><b class="${Number(x[1])<0?'discount':''}">${yen(x[1])}</b></div>`).join('')+`<div class="cost-row total"><span>費用合計</span><b>${yen(p.total)}</b></div>`;
  $('#rentalIncluded').innerHTML=[...(rental.included||[]).map(x=>`<span>✓ ${esc(x)}</span>`),...(rental.extras||[]).map(x=>`<span>＋ ${esc(x)}</span>`)].join('');
}

// EDITABLE ITINERARY
const editDaySel=$('#itineraryEditDay');
days.forEach(d=>{
  const o=document.createElement('option');
  o.value=d;o.textContent=`${d} · ${dayDates[d].slice(5).replace('-','/')}`;
  editDaySel.appendChild(o)
});
editDaySel.value=currentTripDay();
editDaySel.addEventListener('change',renderItineraryEditor);

function baseRow(id){return baseData.find(r=>r._id===id)}
function customRow(id){return itineraryCustom.added.find(r=>r._id===id)}
function effectiveRowForEditor(id){
  const b=baseRow(id);
  if(b)return {...b,...(itineraryCustom.overrides[id]||{})};
  return customRow(id);
}
function itemDayFromDate(date, fallback){
  const d=days.find(x=>dayDates[x]===date);
  return d||fallback||'D01';
}
function itineraryFormFields(r,defaultDay){
  const date=dateOf(r)||dayDates[defaultDay]||'2026-11-21';
  const time=timeOf(r)||'12:00';
  return [
    ['day','Day','select',r.Day||defaultDay,days],
    ['date','日期','date',date],
    ['time','時間','time',time],
    ['name','名稱','text',r['名稱']||''],
    ['type','類型','select',r['類型']||'景點',['景點','住宿','餐飲','移動','停車','SA・PA','購物','備案','參考資料']],
    ['priority','優先度','select',r['優先度']||'★★★★ 推薦',['★★★★★ 必去','★★★★ 推薦','★★★ 有時間','備案','']],
    ['area','地區','text',r['地區']||''],
    ['maps','Google Maps','url',r['Google Maps']||''],
    ['mapcode','Map Code','text',r['Map Code']||''],
    ['parking','停車','textarea',r['停車']||''],
    ['reserve','預約','select',r['預約']||'不需預約',['已預約','不需預約','需確認','未預約','']],
    ['drive','車程／保留','textarea',r['車程／保留']||''],
    ['planb','Plan B','textarea',r['Plan B']||''],
    ['note','備註','textarea',r['備註']||''],
    ['cost','費用','text',r['費用']||'']
  ];
}
function formToItinerary(v,old={}){
  const day=itemDayFromDate(v.date,v.day);
  return {
    ...old,
    Day:day,
    日期時間:`${v.date} ${v.time||'00:00'}`,
    名稱:v.name||'未命名行程',
    類型:v.type||'景點',
    優先度:v.priority||'',
    地區:v.area||'',
    'Google Maps':v.maps||'',
    'Map Code':v.mapcode||'',
    'Map Code Status':v.mapcode?'手動輸入':'',
    停車:v.parking||'',
    預約:v.reserve||'',
    '車程／保留':v.drive||'',
    'Plan B':v.planb||'',
    備註:v.note||'',
    費用:v.cost||''
  };
}
window.editItineraryItem=id=>{
  const r=effectiveRowForEditor(id);if(!r)return;
  openDialog(r._custom?'編輯自訂行程':'修改內建行程',itineraryFormFields(r,r.Day),async v=>{
    const updated=formToItinerary(v,r);
    if(r._custom){
      const i=itineraryCustom.added.findIndex(x=>x._id===id);
      itineraryCustom.added[i]={...updated,_id:id};
    }else{
      const b=baseRow(id);
      const copy={...updated};delete copy._edited;delete copy._custom;
      itineraryCustom.overrides[id]=copy;
    }
    await saveItineraryCustom();refreshItineraryEverywhere();toast('行程已儲存')
  })
};
$('#addItineraryBtn')?.addEventListener('click',()=>{
  const day=editDaySel.value||currentTripDay();
  const blank={Day:day,日期時間:`${dayDates[day]} 12:00`,類型:'景點',優先度:'★★★★ 推薦'};
  openDialog('新增行程',itineraryFormFields(blank,day),async v=>{
    const row=formToItinerary(v,blank);
    row._id=`custom-${uid()}`;
    itineraryCustom.added.push(row);
    await saveItineraryCustom();editDaySel.value=row.Day;refreshItineraryEverywhere();toast('已新增行程')
  })
});
window.toggleItineraryHidden=async id=>{
  itineraryCustom.hidden[id]=!itineraryCustom.hidden[id];
  await saveItineraryCustom();refreshItineraryEverywhere()
};
window.restoreItineraryItem=async id=>{
  delete itineraryCustom.overrides[id];delete itineraryCustom.hidden[id];
  await saveItineraryCustom();refreshItineraryEverywhere();toast('已恢復原始值')
};
window.deleteCustomItinerary=async id=>{
  if(!confirm('刪除這筆你自行新增的行程？'))return;
  itineraryCustom.added=itineraryCustom.added.filter(x=>x._id!==id);
  await saveItineraryCustom();refreshItineraryEverywhere()
};
function renderItineraryEditor(){
  if(!editDaySel)return;
  const day=editDaySel.value||currentTripDay();
  const baseRows=baseData.filter(r=>r.Day===day).map(r=>{
    const merged={...r,...(itineraryCustom.overrides[r._id]||{})};
    return {...merged,_source:'base',_hidden:!!itineraryCustom.hidden[r._id]};
  });
  const customs=itineraryCustom.added.filter(r=>r.Day===day).map(r=>({...r,_source:'custom'}));
  const rows=[...baseRows,...customs].sort((a,b)=>String(a.日期時間).localeCompare(String(b.日期時間)));
  $('#itineraryEditorList').innerHTML=rows.length?rows.map(r=>`
    <article class="editor-card ${r._hidden?'hidden-row':''}">
      <div class="editor-time">${esc(timeOf(r))}</div>
      <div class="grow">
        <div class="meta"><span class="pill">${esc(r['類型']||'')}</span>${r._source==='custom'?'<span class="pill custom-pill">＋自行新增</span>':itineraryCustom.overrides[r._id]?'<span class="pill custom-pill">✏️已修改</span>':'<span class="pill">原始</span>'}${r._hidden?'<span class="pill hidden-pill">👁 已隱藏</span>':''}</div>
        <h3>${esc(r['名稱'])}</h3>
        ${r['備註']?`<p class="note">${esc(r['備註'])}</p>`:''}
        <div class="actions">
          <button onclick="editItineraryItem('${esc(r._id)}')">✏️ 編輯</button>
          ${r._source==='base'?`<button onclick="toggleItineraryHidden('${esc(r._id)}')">${r._hidden?'👁 顯示':'🙈 隱藏'}</button><button onclick="restoreItineraryItem('${esc(r._id)}')">↺ 原始值</button>`:`<button onclick="deleteCustomItinerary('${esc(r._id)}')">🗑 刪除</button>`}
          ${rowMapActions(r)}
        </div>
      </div>
    </article>`).join(''):'<div class="empty">這一天沒有行程。</div>';
}
$('#resetItineraryDay')?.addEventListener('click',async()=>{
  const d=editDaySel.value;
  if(!confirm(`恢復 ${d} 的所有原始行程？這一天自行新增的項目也會刪除。`))return;
  baseData.filter(r=>r.Day===d).forEach(r=>{delete itineraryCustom.overrides[r._id];delete itineraryCustom.hidden[r._id]});
  itineraryCustom.added=itineraryCustom.added.filter(r=>r.Day!==d);
  await saveItineraryCustom();refreshItineraryEverywhere();toast(`${d} 已恢復原始行程`)
});
$('#resetAllItinerary')?.addEventListener('click',async()=>{
  if(!confirm('確定要清除全部行程修改與自行新增項目，恢復 GitHub 原始行程？'))return;
  itineraryCustom={overrides:{},hidden:{},added:[]};
  await saveItineraryCustom();refreshItineraryEverywhere();toast('全部行程已恢復')
});

function renderRoadViews(){
  renderList($('#driveList'),data.filter(r=>['移動','SA・PA'].includes(r['類型'])));
  renderList($('#planbList'),data.filter(r=>r['類型']==='備案'));
}
function renderParkingView(){
  renderParkingView();
}
function refreshItineraryEverywhere(){
  refreshEffectiveData();
  renderToday();
  const activeDay=$('#daysTabs button.active')?.dataset.day||'D01';
  renderDay(activeDay);
  renderRoadViews();
  renderParkingView();
  nextItem();
  if($('#itineraryEditView')?.classList.contains('active'))renderItineraryEditor();
  if($('#tripView')?.classList.contains('active'))renderTripMode();
}

renderRoadViews();
$('#parkingList').innerHTML=data.filter(r=>r['類型']==='停車').map(r=>`<article class="card"><div class="big">${esc(r.Day)} · ${esc(dateOf(r).slice(5).replace('-','/'))} ${esc(timeOf(r))}</div><h3>${esc(r['名稱'])}</h3>${r['停車']?`<p class="note">${esc(r['停車'])}</p>`:''}${r['Plan B']?`<p class="note"><b>Plan B：</b>${esc(r['Plan B'])}</p>`:''}<div class="actions">${rowMapActions(r)}</div></article>`).join('');
function nextItem(){const now=new Date();let future=data.filter(r=>r.日期時間&&dt(r.日期時間)>=now&&r['類型']!=='備案').sort((a,b)=>dt(a.日期時間)-dt(b.日期時間));if(!future.length)future=data;$('#nextItem').innerHTML=itemHTML(future[0]);$('#homeTodayText').textContent=`${currentTripDay()} · ${dayDates[currentTripDay()].slice(5).replace('-','/')}`;const h=hotels.find(x=>x.dates.includes(dayDates[currentTripDay()].slice(5).replace('-','/')))||hotels[0];if(h)$('#homeHotelText').textContent=h.name;}
nextItem();
function renderHomeBookingAlert(){
  const now=new Date();
  const upcoming=hotels
    .filter(h=>h.booking?.cancelDate)
    .map(h=>({h,d:new Date(String(h.booking.cancelDate).length===10?h.booking.cancelDate+'T23:59:00':h.booking.cancelDate)}))
    .filter(x=>x.d>=now)
    .sort((a,b)=>a.d-b.d)[0];
  const el=$('#homeBookingAlert');
  if(!el)return;
  if(!upcoming){el.innerHTML='<div class="section-head"><h3>🏨 訂房提醒</h3></div><p class="note">目前沒有即將到期的免費取消期限。</p>';return}
  const daysLeft=Math.ceil((upcoming.d-now)/86400000);
  const b=upcoming.h.booking;
  el.innerHTML=`<div class="section-head"><h3>⏳ 下一個取消期限</h3><button class="textlink" data-go="hotels">查看住宿 →</button></div>
  <div class="booking-alert-row"><div><b>${esc(upcoming.h.name)}</b><small>${esc(b.platform||'')} · ${esc(b.amount||'')}</small></div><strong>${daysLeft} 天</strong></div>
  <p class="note">免費取消至 ${esc(String(b.cancelDate).replace('T',' '))}</p>`;
  el.querySelector('[data-go]')?.addEventListener('click',()=>go('hotels'));
}
renderHomeBookingAlert();
// Hotels local private + cover
async function renderHotels(){
  const priv=Object.fromEntries((await TripDB.all('hotelPrivate')).map(x=>[x.id,x]));
  const covers=Object.fromEntries((await TripDB.all('hotelCovers')).map(x=>[x.id,x]));
  $('#hotelList').innerHTML=hotels.map((h,i)=>{
    const id=hotelId(h),p=priv[id],c=covers[id];
    const coverSrc=c?.dataUrl || h.image || '';
    const cover=coverSrc?`style="background-image:url('${coverSrc}')"`:'';
    const b=h.booking||null;
    const publicCancel=b?.cancelDate?cancelText(b.cancelDate):'';
    const publicBooking=b?`<div class="hotel-booking">
      <div class="big">BOOKING</div>
      <b>${esc(b.platform||'')}</b>
      ${b.amount?`<span> · ${esc(b.amount)}</span>`:''}
      ${b.meal?`<br>🍽 ${esc(b.meal)}`:''}
      ${b.payment?`<br>💳 ${esc(b.payment)}`:''}
      ${publicCancel?`<br>⏳ ${esc(publicCancel)}`:''}
      ${b.statusNote?`<br>ℹ️ ${esc(b.statusNote)}`:''}
    </div>`:'';
    const privateBits=[];
    if(p?.card) privateBits.push(`💳 使用卡片：${esc(p.card)}`);
    if(p?.bookingNo) privateBits.push(`預訂號碼：••••${esc(String(p.bookingNo).slice(-4))}`);
    if(p?.verifyCode) privateBits.push(`驗證碼：已儲存在本機`);
    if(p?.note) privateBits.push(esc(p.note));
    const privatePanel=privateBits.length?`<div class="hotel-private">🔐 <b>僅此裝置</b><br>${privateBits.join('<br>')}</div>`:'';
    return `<article class="hotel">
      <div class="hotel-cover" ${cover}><span class="dates">${esc(h.dates)} · ${esc(h.area)}</span></div>
      <div class="hotel-body">
        <h3>${esc(h.name)}</h3>
        <p class="note">🅿️ ${esc(h.parking)}</p>
        <p class="note">${esc(h.note)}</p>
        ${publicBooking}
        ${privatePanel}
        <div class="actions">
          ${mapBtn(h.map)}${mapCode(h.mapcode)}
          <button onclick="editHotelPrivate('${id}')">🔐 私人資料</button>
          <button onclick="pickHotelCover('${id}')">🖼 更換封面</button><button onclick="resetHotelCover('${id}')">↺ 內建封面</button>
        </div>
        <input id="cover-${id}" type="file" accept="image/*" hidden onchange="saveHotelCover('${id}',this.files[0])">
      </div>
    </article>`;
  }).join('');
}
function hotelId(h){return h.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,'-')}
function cancelText(s){const d=new Date(s.length===10?s+'T23:59:00':s),days=Math.ceil((d-new Date())/86400000);return days>=0?`免費取消期限 ${s.replace('T',' ')}（${days} 天後）`:`免費取消期限 ${s.replace('T',' ')}（已過）`}
window.editHotelPrivate=async id=>{const old=await TripDB.get('hotelPrivate',id)||{id};openDialog('私人訂房資料',[['platform','平台','text',old.platform||''],['amount','金額','number',old.amount||''],['currency','幣別','select',old.currency||'TWD',['TWD','JPY']],['payment','付款狀態','text',old.payment||''],['card','付款／擔保卡','text',old.card||''],['cancelDate','免費取消期限','datetime-local',old.cancelDate||''],['bookingNo','預訂號碼','text',old.bookingNo||''],['verifyCode','驗證碼','text',old.verifyCode||''],['note','備註','textarea',old.note||'']],async v=>{await TripDB.put('hotelPrivate',{id,...v});renderHotels()})};
window.pickHotelCover=id=>$('#cover-'+id).click();window.saveHotelCover=async(id,file)=>{if(!file)return;const dataUrl=await compressImage(file,1100,.75);await TripDB.put('hotelCovers',{id,dataUrl});renderHotels()};
// Rate
let rate=Number(localStorage.getItem('jpy-twd-rate')||'0.203115');function refreshRateUI(){rate=Number(localStorage.getItem('jpy-twd-rate')||rate);$('#rateInput').value=rate;$('#homeRateText').textContent=`¥1 ≈ NT$${rate.toFixed(4)}`;const stamp=localStorage.getItem('jpy-twd-stamp');$('#rateStamp').textContent=stamp||'參考值';calcFromJPY()}
$('#saveRate').addEventListener('click',()=>{const v=Number($('#rateInput').value);if(v>0){rate=v;localStorage.setItem('jpy-twd-rate',v);localStorage.setItem('jpy-twd-stamp','手動 '+new Date().toLocaleDateString('zh-TW'));refreshRateUI();toast('已儲存匯率')}});
$('#fetchRate').addEventListener('click',async()=>{try{$('#fetchRate').textContent='更新中…';const r=await fetch('https://open.er-api.com/v6/latest/JPY');const j=await r.json();if(!j?.rates?.TWD)throw 0;rate=Number(j.rates.TWD);localStorage.setItem('jpy-twd-rate',rate);localStorage.setItem('jpy-twd-stamp','線上 '+new Date().toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}));refreshRateUI();toast('匯率已更新')}catch{toast('無法線上更新，仍可手動輸入')}finally{$('#fetchRate').textContent='🌐 線上更新'}});
function calcFromJPY(){const v=Number($('#jpyInput').value||0);$('#twdInput').value=v?Math.round(v*rate):''}function calcFromTWD(){const v=Number($('#twdInput').value||0);$('#jpyInput').value=v?Math.round(v/rate):''}$('#jpyInput').addEventListener('input',calcFromJPY);$('#twdInput').addEventListener('input',calcFromTWD);refreshRateUI();
// Cards
const defaultCardProfile={
  mEbill:false,
  fubonRegistered:false,
  jihoMobileRegistered:false,
  jihoBill30k:false,
  kumamonPaypay:false,
  ubearOnlineFull:false,
  flygoEligible:false,
  kgiAutopay:false,
  visaSelectRegistered:false,
  jcbCouponReady:false,
  networks:{}
};
let cardProfile={...defaultCardProfile,networks:{}};

async function loadCardProfile(){
  const row=await TripDB.get('settings','cardProfile');
  cardProfile={...defaultCardProfile,...(row?.value||{}),networks:{...(row?.value?.networks||{})}};
}
async function saveCardProfile(){await TripDB.put('settings',{id:'cardProfile',value:cardProfile});}

function renderCards(filter='all'){
  const list=[];
  if(filter!=='network'){
    ref.cards.filter(c=>filter==='5'?c.score>=5:true).forEach(c=>{
      const net=cardProfile.networks?.[c.id]||'未設定';
      list.push(`<article class="card">
        <div class="big">${'★'.repeat(c.score)} · ${esc(c.issuer)} · ${esc(net)}</div>
        <h3>${esc(c.name)}</h3>
        <p><b>${esc(c.best)}</b></p>
        <p class="note">${esc(c.summary)}</p>
        ${c.conditions.map(x=>`<p class="note">• ${esc(x)}</p>`).join('')}
        ${c.calc?.compareNote?`<p class="calc-note">比較器：${esc(c.calc.compareNote)}</p>`:''}
        <div class="actions"><a href="${esc(c.source)}" target="_blank">官方來源 ↗</a></div>
      </article>`);
    });
  }
  if(filter==='all'||filter==='network'){
    ref.networkPromos.forEach(p=>list.push(`<article class="card network-card">
      <div class="big">${esc(p.network)} · ${esc(p.valid)}</div>
      <h3>${esc(p.title)}</h3><p class="note">${esc(p.detail)}</p>
      <div class="actions"><a href="${esc(p.source)}" target="_blank">活動頁 ↗</a></div>
    </article>`));
  }
  $('#cardsList').innerHTML=list.join('');
}
function cardRateFor(c,scenario){
  let r=c.calc?.rates?.[scenario];
  if(r==null)return null;
  const req=c.calc?.requires?.[scenario];
  if(req && !cardProfile[req])return null;
  if(c.id==='ubot-jiho' && scenario==='mobile'){
    r=2.5+(cardProfile.jihoMobileRegistered?1.5:0)+(cardProfile.jihoBill30k?1:0);
  }
  if(c.id==='kgi-eslite' && cardProfile.kgiAutopay)r=2.3;
  return r;
}
function networkExtra(c,scenario,amount){
  if(scenario!=='drugstore')return {score:0,label:''};
  const net=cardProfile.networks?.[c.id];
  if(net==='Visa' && cardProfile.visaSelectRegistered && amount>=20000){
    const pct=2000/amount*100;
    return {score:pct,label:`Visa Select：另回饋 ¥2,000（約 ${pct.toFixed(1)}%，需符合指定店/未稅門檻/上傳憑證）`};
  }
  if(net==='JCB' && cardProfile.jcbCouponReady && amount>=10000){
    const pct=amount>=50000?7:amount>=30000?5:3;
    return {score:pct,label:`JCB 指定藥妝：店頭約 ${pct}% OFF（需出示優惠券；指定品牌）`};
  }
  if(net==='Mastercard')return {score:0,label:'Mastercard Travel Rewards：商戶與回饋滾動更新，請點活動頁確認當期日本名單。'};
  return {score:0,label:''};
}
function renderCardCompare(){
  if(!$('#cardCompareResult'))return;
  const scenario=$('#cardScenario')?.value||'physical';
  const amount=Math.max(0,Number($('#cardAmount')?.value||0));
  const fee=Number($('#foreignFee')?.value||0);
  const rows=[];
  ref.cards.forEach(c=>{
    const ratePct=cardRateFor(c,scenario);
    if(ratePct==null)return;
    const extra=networkExtra(c,scenario,amount);
    const rewardTwd=amount*rate*(ratePct/100);
    const feeTwd=amount*rate*(fee/100);
    rows.push({c,ratePct,extra,rewardTwd,feeTwd,score:ratePct+extra.score});
  });
  rows.sort((a,b)=>b.score-a.score);
  const top=rows.slice(0,5);
  $('#cardCompareResult').innerHTML=top.length?top.map((x,i)=>`
    <article class="compare-row ${i===0?'winner':''}">
      <div class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      <div class="grow">
        <h4>${esc(x.c.name)}</h4>
        <p><b>卡片回饋約 ${x.ratePct.toFixed(1)}%</b> · 約 NT$${Math.round(x.rewardTwd).toLocaleString()}</p>
        ${x.extra.label?`<p class="network-extra">${esc(x.extra.label)}</p>`:''}
        <small>若以海外交易費 ${fee.toFixed(1)}% 粗估，費用約 NT$${Math.round(x.feeTwd).toLocaleString()}；此為比較用估算。</small>
      </div>
    </article>`).join(''):'<div class="empty">依目前資格設定，這個情境沒有可自動比較的卡片。請先按「資格 / 卡組織設定」。</div>';
}
async function editCardProfile(){
  await loadCardProfile();
  const fields=[
    ['mEbill','聯邦M卡：已使用電子化帳單','select',cardProfile.mEbill?'是':'否',['否','是']],
    ['fubonRegistered','富邦Costco：本月海外活動已登錄','select',cardProfile.fubonRegistered?'是':'否',['否','是']],
    ['jihoMobileRegistered','吉鶴：日本行動支付1.5%已登錄','select',cardProfile.jihoMobileRegistered?'是':'否',['否','是']],
    ['jihoBill30k','吉鶴：前月聯邦帳單滿3萬元','select',cardProfile.jihoBill30k?'是':'否',['否','是']],
    ['kumamonPaypay','熊本熊：PayPay方案已設定','select',cardProfile.kumamonPaypay?'是':'否',['否','是']],
    ['ubearOnlineFull','U Bear：網路最高3%資格已符合','select',cardProfile.ubearOnlineFull?'是':'否',['否','是']],
    ['flygoEligible','FlyGo/Richart：玩旅刷＋指定任務已完成','select',cardProfile.flygoEligible?'是':'否',['否','是']],
    ['kgiAutopay','凱基誠品：凱基帳戶自扣已設定','select',cardProfile.kgiAutopay?'是':'否',['否','是']],
    ['visaSelectRegistered','Visa Select：日本藥妝/電器活動已報名','select',cardProfile.visaSelectRegistered?'是':'否',['否','是']],
    ['jcbCouponReady','JCB：日本藥妝優惠券會使用','select',cardProfile.jcbCouponReady?'是':'否',['否','是']]
  ];
  ref.cards.forEach(c=>fields.push([`net__${c.id}`,`${c.name} 卡組織`,'select',cardProfile.networks?.[c.id]||'未設定',['未設定','Visa','Mastercard','JCB']]));
  openDialog('信用卡資格 / 卡組織設定',fields,async v=>{
    const boolKeys=['mEbill','fubonRegistered','jihoMobileRegistered','jihoBill30k','kumamonPaypay','ubearOnlineFull','flygoEligible','kgiAutopay','visaSelectRegistered','jcbCouponReady'];
    boolKeys.forEach(k=>cardProfile[k]=v[k]==='是');
    cardProfile.networks={...(cardProfile.networks||{})};
    ref.cards.forEach(c=>cardProfile.networks[c.id]=v[`net__${c.id}`]||'未設定');
    await saveCardProfile();renderCards();renderCardCompare();toast('信用卡設定已儲存於這台裝置');
  });
}
$('#cardProfileBtn')?.addEventListener('click',editCardProfile);
$('#compareCardsBtn')?.addEventListener('click',renderCardCompare);
$('#cardScenario')?.addEventListener('change',renderCardCompare);
$('#cardAmount')?.addEventListener('input',renderCardCompare);
$('#foreignFee')?.addEventListener('change',renderCardCompare);
$$('#cardFilters button').forEach(b=>b.addEventListener('click',()=>{$$('#cardFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderCards(b.dataset.filter)}));
loadCardProfile().then(()=>{renderCards();renderCardCompare()});
// Shopping
let shopCat='all';
$('#addShoppingBtn').addEventListener('click',()=>openDialog('新增必買',[
  ['name','商品','text',''],
  ['category','分類','select','食品',['食品','電器','藥妝','雜貨']],
  ['place','想在哪裡買','text',''],
  ['budget','預算（日圓）','number',''],
  ['note','備註','textarea','']
],async v=>{await TripDB.put('shopping',{id:uid(),...v,bought:false,actual:'',createdAt:new Date().toISOString()});renderShopping()}));

async function renderShopping(){
  const rows=(await TripDB.all('shopping')).filter(x=>shopCat==='all'||x.category===shopCat);
  $('#shoppingList').innerHTML=rows.length?rows.map(x=>`<article class="card shop-row ${x.bought?'bought':''}">
    <input type="checkbox" ${x.bought?'checked':''} onchange="toggleShop('${x.id}',this.checked)">
    <div class="grow">
      <h3>${esc(x.name)}</h3>
      <div class="meta"><span class="pill">${esc(x.category)}</span>${x.place?`<span class="pill">${esc(x.place)}</span>`:''}</div>
      ${x.budget?`<p class="note">預算 ¥${esc(x.budget)}</p>`:''}
      ${x.actual?`<p class="note"><b>實買 ¥${Number(x.actual).toLocaleString()}</b></p>`:''}
      ${x.note?`<p class="note">${esc(x.note)}</p>`:''}
      <div class="actions">
        ${x.bought?`<button onclick="shopToExpense('${x.id}')">🧾 加入記帳</button>`:''}
        <button onclick="editShop('${x.id}')">編輯</button>
      </div>
    </div>
    <button onclick="deleteShop('${x.id}')">×</button>
  </article>`).join(''):'<div class="empty">還沒有必買品。想到什麼就按右上角 ＋，不需要再改程式碼。</div>'
}
window.toggleShop=async(id,v)=>{
  const x=await TripDB.get('shopping',id);x.bought=v;
  if(v && !x.actual){
    const actual=prompt(`「${x.name}」實際買多少日圓？可先留空`,x.budget||'');
    if(actual!==null)x.actual=actual;
  }
  await TripDB.put('shopping',x);renderShopping()
};
window.editShop=async id=>{
  const x=await TripDB.get('shopping',id);
  openDialog('編輯必買',[
    ['name','商品','text',x.name||''],
    ['category','分類','select',x.category||'食品',['食品','電器','藥妝','雜貨']],
    ['place','購買地點','text',x.place||''],
    ['budget','預算（日圓）','number',x.budget||''],
    ['actual','實際金額（日圓）','number',x.actual||''],
    ['note','備註','textarea',x.note||'']
  ],async v=>{await TripDB.put('shopping',{...x,...v});renderShopping()})
};
window.shopToExpense=async id=>{
  const x=await TripDB.get('shopping',id);
  openDialog('把必買品加入記帳',[
    ['date','日期','date',new Date().toISOString().slice(0,10)],
    ['merchant','店家／項目','text',x.name||''],
    ['category','分類','select','購物',['餐飲','住宿','購物','交通','景點','其他']],
    ['jpy','日幣金額','number',x.actual||x.budget||''],
    ['card','付款方式／卡片','select','現金',['現金',...ref.cards.map(c=>c.name),'其他']],
    ['note','備註','textarea',x.place?`購買地點：${x.place}`:'']
  ],async v=>{
    v.twd=v.jpy?Math.round(Number(v.jpy)*rate):'';
    await TripDB.put('expenses',{id:uid(),...v,createdAt:new Date().toISOString()});
    toast('已加入旅行記帳');renderShopping();renderExpenses()
  })
};
window.deleteShop=async id=>{if(confirm('刪除這項？')){await TripDB.del('shopping',id);renderShopping()}};
$$('#shoppingFilters button').forEach(b=>b.addEventListener('click',()=>{$$('#shoppingFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');shopCat=b.dataset.cat;renderShopping()}));
// Expenses
const expenseCardOptions=['現金',...ref.cards.map(c=>c.name),'其他'];
$('#addExpenseBtn').addEventListener('click',()=>openDialog('新增支出',[
  ['date','日期','date',new Date().toISOString().slice(0,10)],
  ['merchant','店家／項目','text',''],
  ['category','分類','select','餐飲',['餐飲','住宿','購物','交通','景點','其他']],
  ['jpy','日幣金額','number',''],
  ['twd','台幣金額（可空白）','number',''],
  ['card','付款方式／卡片','select','現金',expenseCardOptions],
  ['receipt','收據照片（選填）','file',''],
  ['note','備註','textarea','']
],async v=>{
  if(v.jpy&&!v.twd)v.twd=Math.round(Number(v.jpy)*rate);
  let receipt='';if(v.receiptFile)receipt=await compressImage(v.receiptFile,1500,.72);delete v.receiptFile;
  await TripDB.put('expenses',{id:uid(),...v,receipt,createdAt:new Date().toISOString()});renderExpenses()
}));
function expenseCategoryHTML(rows,totalJpy){
  const cats=['餐飲','住宿','購物','交通','景點','其他'];
  const sums=Object.fromEntries(cats.map(c=>[c,rows.filter(x=>x.category===c).reduce((s,x)=>s+Number(x.jpy||0),0)]));
  const active=cats.filter(c=>sums[c]>0).sort((a,b)=>sums[b]-sums[a]);
  if(!active.length)return '<div class="section-head"><h3>分類統計</h3></div><p class="note">開始記帳後，這裡會自動整理餐飲、住宿、購物等比例。</p>';
  return `<div class="section-head"><h3>分類統計</h3></div>${active.map(c=>{
    const pct=totalJpy?sums[c]/totalJpy*100:0;
    return `<div class="break-row"><div><b>${esc(c)}</b><small>¥${sums[c].toLocaleString()} · ${pct.toFixed(0)}%</small></div><div class="bar"><i style="width:${Math.max(4,pct)}%"></i></div></div>`;
  }).join('')}`;
}
async function renderExpenses(){
  const rows=(await TripDB.all('expenses')).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const j=rows.reduce((s,x)=>s+Number(x.jpy||0),0),t=rows.reduce((s,x)=>s+Number(x.twd||0),0);
  $('#expenseSummary').innerHTML=`<div class="summary"><small>本趟日幣</small><b>¥${j.toLocaleString()}</b></div><div class="summary"><small>約台幣</small><b>NT$${Math.round(t).toLocaleString()}</b></div><div class="summary"><small>筆數</small><b>${rows.length}</b></div><div class="summary"><small>匯率</small><b>${rate.toFixed(4)}</b></div>`;
  $('#homeSpendText').textContent=`本趟 ¥${j.toLocaleString()}`;
  $('#expenseBreakdown').innerHTML=expenseCategoryHTML(rows,j);
  $('#expenseList').innerHTML=rows.length?rows.map(x=>`<article class="card expense-row">
    ${x.receipt?`<img class="receipt-thumb" src="${x.receipt}" alt="收據">`:''}
    <div class="grow"><div class="big">${esc(x.date||'')} · ${esc(x.category||'')}</div><h3>${esc(x.merchant||'未命名')}</h3>${x.card?`<p class="note">💳 ${esc(x.card)}</p>`:''}${x.note?`<p class="note">${esc(x.note)}</p>`:''}</div>
    <div><div class="money">¥${Number(x.jpy||0).toLocaleString()}</div><p class="note">NT$${Number(x.twd||0).toLocaleString()}</p><button onclick="deleteExpense('${x.id}')">×</button></div>
  </article>`).join(''):'<div class="empty">還沒有支出。可按 ＋ 手動記帳，或用「掃描收據 Beta」。</div>'
}
window.deleteExpense=async id=>{if(confirm('刪除這筆支出？')){await TripDB.del('expenses',id);renderExpenses()}};
$('#exportExpenses').addEventListener('click',async()=>{
  const rows=await TripDB.all('expenses');const cols=['date','merchant','category','jpy','twd','card','note'];
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(','))].join('\n');
  downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv'}),'JapanTrip-expenses.csv')
});
async function loadTesseract(){
  if(window.Tesseract)return window.Tesseract;
  $('#ocrStatus').textContent='正在下載 OCR 模組…';
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
  return window.Tesseract;
}
function parseReceiptText(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const bad=/お釣|おつり|釣銭|預り|預かり|CHANGE/i;
  const good=/合計|お買上|お支払|TOTAL|税込|現計|総額/i;
  let candidates=[];
  for(const line of lines){
    if(bad.test(line))continue;
    const nums=[...line.matchAll(/(?:¥|￥)?\s*([0-9]{1,3}(?:[,，][0-9]{3})+|[0-9]{3,7})/g)]
      .map(m=>Number(m[1].replace(/[,，]/g,''))).filter(n=>n>=50&&n<=5000000);
    nums.forEach(n=>candidates.push({n,score:(good.test(line)?10:0)+(line.includes('¥')||line.includes('￥')?2:0),line}));
  }
  candidates.sort((a,b)=>b.score-a.score||b.n-a.n);
  const amount=candidates[0]?.n||'';
  let date='';
  const dm=text.match(/(20\d{2})[\/\-.年]\s*(\d{1,2})[\/\-.月]\s*(\d{1,2})/);
  if(dm)date=`${dm[1]}-${String(dm[2]).padStart(2,'0')}-${String(dm[3]).padStart(2,'0')}`;
  const merchant=lines.find(l=>/[A-Za-z\u3040-\u30ff\u4e00-\u9fff]/.test(l)&&!good.test(l)&&l.length>=2&&l.length<=40)||'';
  return {amount,date,merchant};
}
$('#scanReceiptBtn')?.addEventListener('click',()=>$('#receiptInput').click());
$('#receiptInput')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  try{
    const receipt=await compressImage(file,1700,.78);
    const T=await loadTesseract();
    $('#ocrStatus').textContent='日文收據辨識中… 可能需要 20–60 秒';
    const result=await T.recognize(receipt,'jpn+eng',{logger:m=>{
      if(m.status==='recognizing text' && m.progress!=null)$('#ocrStatus').textContent=`辨識中 ${Math.round(m.progress*100)}%`;
    }});
    const parsed=parseReceiptText(result.data?.text||'');
    $('#ocrStatus').textContent='辨識完成：請核對金額與店名';
    openDialog('OCR 結果確認',[
      ['date','日期','date',parsed.date||new Date().toISOString().slice(0,10)],
      ['merchant','店家／項目','text',parsed.merchant||''],
      ['category','分類','select','購物',['餐飲','住宿','購物','交通','景點','其他']],
      ['jpy','辨識金額（日圓）','number',parsed.amount||''],
      ['card','付款方式／卡片','select','現金',expenseCardOptions],
      ['note','備註','textarea','OCR自動辨識，已人工確認']
    ],async v=>{
      v.twd=v.jpy?Math.round(Number(v.jpy)*rate):'';
      await TripDB.put('expenses',{id:uid(),...v,receipt,ocrText:result.data?.text||'',createdAt:new Date().toISOString()});
      renderExpenses();toast('收據已加入記帳')
    });
  }catch(err){
    console.error(err);
    $('#ocrStatus').textContent='OCR 無法使用；可改用 ＋ 手動記帳並附上收據照片。';
    toast('收據辨識失敗，請改手動記帳');
  }finally{e.target.value=''}
});
// Notes
$('#addNoteBtn').addEventListener('click',()=>openDialog('新增旅行日記',[
  ['date','日期','date',new Date().toISOString().slice(0,10)],
  ['place','地點','text',''],
  ['text','今天想記住什麼？','textarea',''],
  ['rating','評分','select','5',['5','4','3','2','1']],
  ['highlight','回憶錄','select','一般',['一般','⭐ 精選']],
  ['photo','照片（選填）','file','']
],async v=>{
  let photo='';if(v.photoFile)photo=await compressImage(v.photoFile,1500,.72);delete v.photoFile;
  await TripDB.put('notes',{id:uid(),...v,photo,createdAt:new Date().toISOString()});renderNotes()
}));

async function renderNotes(){
  const rows=(await TripDB.all('notes')).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const photos=rows.filter(x=>x.photo).length, highlights=rows.filter(x=>String(x.highlight||'').includes('精選')).length;
  $('#noteSummary').innerHTML=`<div class="summary"><small>日記</small><b>${rows.length} 篇</b></div><div class="summary"><small>小照片</small><b>${photos} 張</b></div><div class="summary"><small>精選回憶</small><b>${highlights}</b></div><div class="summary"><small>可匯出</small><b>HTML / PDF</b></div>`;
  $('#notesList').innerHTML=rows.length?rows.map(x=>`<article class="journal ${String(x.highlight||'').includes('精選')?'journal-highlight':''}">
    ${x.photo?`<img src="${x.photo}" alt="">`:''}
    <div class="journal-body">
      <div class="big">${esc(x.date||'')} · ${esc(x.place||'')} ${String(x.highlight||'').includes('精選')?'· ⭐ 精選':''}</div>
      <h3>${'★'.repeat(Number(x.rating||0))}</h3>
      <p>${esc(x.text||'')}</p>
      <div class="actions"><button onclick="editNote('${x.id}')">編輯</button><button onclick="deleteNote('${x.id}')">刪除</button></div>
    </div>
  </article>`).join(''):'<div class="empty">旅行日記還是空白。出發後每天留一句話，也能做成完整回憶錄。</div>'
}
window.editNote=async id=>{
  const x=await TripDB.get('notes',id);
  openDialog('編輯旅行日記',[
    ['date','日期','date',x.date||''],
    ['place','地點','text',x.place||''],
    ['text','想記住什麼？','textarea',x.text||''],
    ['rating','評分','select',x.rating||'5',['5','4','3','2','1']],
    ['highlight','回憶錄','select',x.highlight||'一般',['一般','⭐ 精選']],
    ['photo','更換照片（不選則保留原圖）','file','']
  ],async v=>{
    let photo=x.photo||'';if(v.photoFile)photo=await compressImage(v.photoFile,1500,.72);delete v.photoFile;
    await TripDB.put('notes',{...x,...v,photo});renderNotes()
  })
};
window.deleteNote=async id=>{if(confirm('刪除這篇日記？')){await TripDB.del('notes',id);renderNotes()}};

async function buildMemoirHTML(){
  const notes=(await TripDB.all('notes')).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const expenses=await TripDB.all('expenses');
  const shopping=await TripDB.all('shopping');
  const total=expenses.reduce((s,x)=>s+Number(x.jpy||0),0);
  const totalTwd=expenses.reduce((s,x)=>s+Number(x.twd||0),0);
  const cats=['餐飲','住宿','購物','交通','景點','其他'];
  const breakdown=cats.map(c=>[c,expenses.filter(x=>x.category===c).reduce((s,x)=>s+Number(x.jpy||0),0)]).filter(x=>x[1]>0);
  const bought=shopping.filter(x=>x.bought);
  const grouped=notes.reduce((o,n)=>{const k=n.date||'未分類';(o[k]??=[]).push(n);return o},{});
  const daySections=Object.entries(grouped).map(([date,arr])=>`<section class="day">
    <h2>${esc(date)}</h2>
    ${arr.map(n=>`<article class="${String(n.highlight||'').includes('精選')?'highlight':''}">
      <p class="meta">${esc(n.place||'')} · ${'★'.repeat(Number(n.rating||0))} ${String(n.highlight||'').includes('精選')?'· ⭐ 精選':''}</p>
      ${n.photo?`<img src="${n.photo}">`:''}
      <p>${esc(n.text||'').replace(/\n/g,'<br>')}</p>
    </article>`).join('')}
  </section>`).join('');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <title>Japan Road Trip 2026 回憶錄</title><style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif;max-width:820px;margin:0 auto;padding:44px 24px;color:#29231d;line-height:1.8;background:#faf7f1}
  .cover{padding:50px 0 35px;border-bottom:1px solid #dccfc0}.cover h1{font-family:Georgia,serif;font-size:42px;margin:0}.cover p{color:#75695e}
  .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:25px 0}.stat{background:white;border-radius:16px;padding:16px}.stat small{display:block;color:#806f60}.stat b{font-size:22px}
  .day{margin:48px 0}.day>h2{font-family:Georgia,serif;border-bottom:1px solid #dccfc0;padding-bottom:7px}
  article{page-break-inside:avoid;background:white;padding:16px;border-radius:18px;margin:16px 0}article.highlight{border:2px solid #bf7a53}
  img{width:100%;max-height:620px;object-fit:contain;border-radius:14px}.meta{font-size:13px;color:#8b684f}
  .small{font-size:13px;color:#75695e}.print{position:sticky;top:10px;float:right;padding:10px 14px;border:0;border-radius:10px;background:#9d5c3b;color:#fff}
  @media print{.print{display:none}body{background:white;padding:0}}
  </style></head><body>
  <button class="print" onclick="print()">列印／另存 PDF</button>
  <section class="cover"><p>2026/11/21–11/30 · 10 Days 9 Nights</p><h1>🇯🇵 Japan Road Trip 2026</h1><p>東京 · 富士 · 靜岡 · 濱松 · 江之島 · 鎌倉 · 成田</p></section>
  <div class="stats"><div class="stat"><small>旅行日記</small><b>${notes.length} 篇</b></div><div class="stat"><small>小照片</small><b>${notes.filter(n=>n.photo).length} 張</b></div><div class="stat"><small>累計日幣</small><b>¥${total.toLocaleString()}</b></div><div class="stat"><small>累計台幣</small><b>NT$${Math.round(totalTwd).toLocaleString()}</b></div></div>
  ${breakdown.length?`<p class="small"><b>花費分類：</b>${breakdown.map(x=>`${x[0]} ¥${x[1].toLocaleString()}`).join(' · ')}</p>`:''}
  ${bought.length?`<p class="small"><b>買到的東西：</b>${bought.map(x=>esc(x.name)).join('、')}</p>`:''}
  ${daySections||'<p>尚未建立旅行日記。</p>'}
  <hr><p class="small">由 Japan Road Trip 2026 PWA 產生。原始高畫質照片仍保留於手機相簿。</p>
  </body></html>`;
}
$('#previewMemoir')?.addEventListener('click',async()=>{
  const html=await buildMemoirHTML();const w=window.open('','_blank');
  if(!w){toast('瀏覽器阻擋新視窗，請改用下載 HTML');return}
  w.document.open();w.document.write(html);w.document.close()
});
$('#downloadMemoir')?.addEventListener('click',async()=>{
  const html=await buildMemoirHTML();
  downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),'Japan-Road-Trip-2026-Memoir.html');
  toast('回憶錄 HTML 已下載')
});
// Guides
$('#guideList').innerHTML=ref.guides.map(g=>`<article class="card"><div class="big">${esc(g.day)} · 約 ${g.minutes} 分鐘</div><h3>${esc(g.title)}</h3><p class="note">${esc(g.intro.slice(0,75))}…</p><div class="actions"><button onclick="openGuide('${g.id}')">開始閱讀 →</button></div></article>`).join('');window.openGuide=id=>{const g=ref.guides.find(x=>x.id===id);$('#guideTitle').textContent=g.title;$('#guideBody').innerHTML=`<p class="lead">${esc(g.intro)}</p><h3>現場請特別看</h3><ul>${g.points.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><blockquote><b>帶著這個問題去看：</b><br>${esc(g.question)}</blockquote>`;go('guideDetail')};
// Checklist
const checks=['護照','台灣駕照','國際駕照／日文譯本','租車訂單','ETC／高速公路方案確認','住宿訂單','Suzuki 歷史館預約','行動網路／eSIM','Google Maps 離線地圖','重要飯店／停車場 Map Code','信用卡／旅遊保險','行李與行動電源','成田機場還車時間確認','11/29 ART HOTEL 晚上泡湯提醒'];let checkState=JSON.parse(localStorage.getItem('trip-checks')||'{}');function renderChecks(){$('#checklist').innerHTML=checks.map((c,i)=>`<label class="check-row ${checkState[i]?'done':''}"><input type="checkbox" data-i="${i}" ${checkState[i]?'checked':''}><span>${esc(c)}</span></label>`).join('');$$('#checklist input').forEach(x=>x.addEventListener('change',e=>{checkState[e.target.dataset.i]=e.target.checked;localStorage.setItem('trip-checks',JSON.stringify(checkState));renderChecks()}))}renderChecks();$('#resetChecklist').addEventListener('click',()=>{localStorage.removeItem('trip-checks');checkState={};renderChecks()});
// Dialog generic
let dialogSaveFn=null;function openDialog(title,fields,onSave){$('#dialogTitle').textContent=title;dialogSaveFn=onSave;$('#dialogFields').innerHTML='<div class="form-grid">'+fields.map(f=>{const[n,l,t,v,opts]=f;if(t==='textarea')return `<label>${l}<textarea name="${n}">${esc(v)}</textarea></label>`;if(t==='select')return `<label>${l}<select name="${n}">${opts.map(o=>`<option ${o==v?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;if(t==='file')return `<label>${l}<input name="${n}" type="file" accept="image/*"></label>`;return `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}"></label>`}).join('')+'</div>';$('#editDialog').showModal()}
$('#editForm').addEventListener('submit',async e=>{if(e.submitter?.value==='cancel')return; e.preventDefault();const fd=new FormData(e.currentTarget),v={};for(const[k,val]of fd.entries()){if(val instanceof File){if(val.size)v[k+'File']=val}else v[k]=val}await dialogSaveFn?.(v);$('#editDialog').close()});
async function compressImage(file,max=1280,quality=.72){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{let w=img.width,h=img.height;if(Math.max(w,h)>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',quality))};img.onerror=rej;img.src=url})}

// PRE-TRIP / SYSTEM / QA
const REMINDER_STATE_KEY='japan-trip-reminder-state-v1';
let reminderState=JSON.parse(localStorage.getItem(REMINDER_STATE_KEY)||'{}');
let showDoneReminders=false;

function parseDeadline(v){
  if(!v)return null;
  return new Date(String(v).length===10?v+'T23:59:00':v);
}
function dayDiff(t){
  const now=new Date();
  return Math.ceil((t-now)/86400000);
}
function reminderTone(days){
  if(days<0)return 'past';
  if(days<=3)return 'urgent';
  if(days<=14)return 'soon';
  return 'normal';
}
function deadlineText(date){
  const d=parseDeadline(date); if(!d)return '';
  const days=dayDiff(d);
  if(days<0)return `已過 ${Math.abs(days)} 天`;
  if(days===0)return '今天到期';
  return `剩 ${days} 天`;
}
function buildReminders(){
  const rows=[];
  hotels.forEach(h=>{
    const b=h.booking||{};
    if(!b.cancelDate)return;
    rows.push({
      id:`cancel-${h.name}`,
      type:'住宿取消',
      title:h.name,
      due:String(b.cancelDate),
      detail:`${b.platform||'訂房'}${b.amount?' · '+b.amount:''}｜免費取消期限`,
      action:'hotels'
    });
  });
  const outbound=flights.find(f=>f.id==='BR196');
  if(outbound?.seatReminder) rows.push({
    id:'seat-BR196',
    type:'航班',
    title:'BR196 去程選位',
    due:'2026-11-19T15:20:00+08:00',
    detail:'起飛前48小時；目前去程尚待選位。',
    action:'flights'
  });
  rows.sort((a,b)=>parseDeadline(a.due)-parseDeadline(b.due));
  return rows;
}
const RECHECK_ITEMS=[
  {id:'recheck-cards',title:'重新確認11月信用卡權益',detail:'銀行回饋與 Visa / Mastercard / JCB 活動會變動；建議出發前約1週再更新一次。',action:'cards'},
  {id:'recheck-lounge',title:'確認 U.First / JCB 貴賓室資格',detail:'確認玉山國旅門檻、實際JCB卡等級及當日合作據點。',action:'flights'},
  {id:'recheck-maps',title:'下載 Google Maps 離線地圖',detail:'東京、富士五湖、靜岡、濱松、湘南／鎌倉、千葉／成田。',action:'checklist'},
  {id:'recheck-network',title:'確認 eSIM / 行動網路',detail:'建議保留一個可接收簡訊或備援網路方案。',action:'checklist'},
  {id:'recheck-backup',title:'出發前匯出一次完整備份',detail:'包含訂房私人資料、行程修改、記帳、日記、照片與設定。',action:'system'}
];

function saveReminderState(){
  localStorage.setItem(REMINDER_STATE_KEY,JSON.stringify(reminderState));
}
window.toggleReminderDone=id=>{
  reminderState[id]=!reminderState[id];
  saveReminderState();
  renderPretrip();
  renderHomeReminder();
};
function reminderRowHTML(r,isRecheck=false){
  const done=!!reminderState[r.id];
  const d=isRecheck?null:parseDeadline(r.due);
  const days=d?dayDiff(d):null;
  const tone=d?reminderTone(days):'normal';
  return `<article class="reminder-row ${done?'done':''} ${tone}">
    <button class="reminder-check" onclick="toggleReminderDone('${esc(r.id)}')">${done?'✓':'○'}</button>
    <div class="grow">
      <div class="meta"><span class="pill">${esc(r.type||'出發前確認')}</span>${d?`<span class="pill">${esc(String(r.due).replace('T',' ').replace('+08:00',''))}</span>`:''}</div>
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.detail||'')}</p>
    </div>
    <div class="reminder-side">
      ${d?`<b>${esc(deadlineText(r.due))}</b>`:''}
      ${r.action?`<button data-reminder-go="${esc(r.action)}">查看</button>`:''}
    </div>
  </article>`;
}
function wireReminderGo(){
  $$('[data-reminder-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.reminderGo)));
}
function renderPretrip(){
  const reminders=buildReminders();
  const active=reminders.filter(r=>!reminderState[r.id]);
  const doneCount=reminders.length-active.length;
  const next=active.find(r=>parseDeadline(r.due)>=new Date())||active[0];
  $('#pretripSummary').innerHTML=`
    <div class="summary"><small>重要期限</small><b>${reminders.length}</b></div>
    <div class="summary"><small>已完成</small><b>${doneCount}</b></div>
    <div class="summary"><small>下一個</small><b>${next?deadlineText(next.due):'完成'}</b></div>
    <div class="summary"><small>出發前複查</small><b>${RECHECK_ITEMS.filter(x=>!reminderState[x.id]).length}</b></div>`;
  const shown=reminders.filter(r=>showDoneReminders||!reminderState[r.id]);
  $('#reminderList').innerHTML=shown.length?shown.map(r=>reminderRowHTML(r,false)).join(''):'<div class="empty">重要期限都處理完成了。</div>';
  $('#recheckList').innerHTML=RECHECK_ITEMS.map(r=>reminderRowHTML(r,true)).join('');
  $('#toggleDoneReminders').textContent=showDoneReminders?'隱藏已完成':'顯示已完成';
  wireReminderGo();
}
$('#toggleDoneReminders')?.addEventListener('click',()=>{showDoneReminders=!showDoneReminders;renderPretrip()});

function renderHomeReminder(){
  const el=$('#homeReminderText'); if(!el)return;
  const pending=buildReminders().filter(r=>!reminderState[r.id]&&parseDeadline(r.due)>=new Date());
  const next=pending[0];
  el.textContent=next?`${next.title} · ${deadlineText(next.due)}`:'重要期限目前都已處理';
}
renderHomeReminder();

function remindersICS(){
  const rows=buildReminders().filter(r=>!reminderState[r.id]);
  const events=rows.map(r=>{
    const d=parseDeadline(r.due);
    const y=d.getFullYear(),m=pad(d.getMonth()+1),day=pad(d.getDate()),hh=pad(d.getHours()),mm=pad(d.getMinutes());
    const local=`${y}${m}${day}T${hh}${mm}00`;
    return `BEGIN:VEVENT\r\nUID:${r.id}@japantrip\r\nDTSTART;TZID=Asia/Taipei:${local}\r\nDTEND;TZID=Asia/Taipei:${local}\r\nSUMMARY:${icsEscape(r.title)}\r\nDESCRIPTION:${icsEscape(r.detail)}\r\nBEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEscape(r.title+' 明天到期')}\r\nEND:VALARM\r\nEND:VEVENT`;
  }).join('\r\n');
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Japan Road Trip 2026//Pretrip Reminders//ZH-TW\r\n${events}\r\nEND:VCALENDAR\r\n`;
}
$('#exportReminderIcs')?.addEventListener('click',()=>{
  downloadBlob(new Blob([remindersICS()],{type:'text/calendar;charset=utf-8'}),'JapanTrip-pretrip-reminders.ics');
  toast('重要期限行事曆已匯出')
});

// SYSTEM / BACKUP HEALTH
function fmtDateTime(v){
  if(!v)return '尚未';
  try{return new Date(v).toLocaleString('zh-TW',{hour12:false})}catch{return v}
}
async function collectHealth(){
  const [expenses,notes,shopping,hotelPrivate,hotelCovers,settings]=await Promise.all([
    TripDB.all('expenses'),TripDB.all('notes'),TripDB.all('shopping'),
    TripDB.all('hotelPrivate'),TripDB.all('hotelCovers'),TripDB.all('settings')
  ]);
  const lastBackup=settings.find(x=>x.id==='lastBackupAt')?.value||null;
  const itin=settings.find(x=>x.id==='itineraryCustom')?.value||itineraryCustom;
  const photoCount=notes.filter(x=>x.photo).length+hotelCovers.length+expenses.filter(x=>x.receipt).length;
  return {
    expenses:expenses.length, notes:notes.length, shopping:shopping.length,
    hotelPrivate:hotelPrivate.length, photos:photoCount,
    customItin:(itin?.added?.length||0)+Object.keys(itin?.overrides||{}).length,
    lastBackup
  };
}
async function renderSystem(){
  $('#systemVersion').textContent=`V${APP_META.version} · ${APP_META.label} · ${APP_META.released}`;
  const h=await collectHealth();
  const age=h.lastBackup?Math.floor((Date.now()-new Date(h.lastBackup))/86400000):null;
  const healthy=h.lastBackup&&age<=14;
  $('#backupHealthBadge').textContent=!h.lastBackup?'尚未備份':age===0?'今天已備份':`${age} 天前`;
  $('#backupHealthBadge').className=`tag ${healthy?'health-good':h.lastBackup?'health-warn':'health-bad'}`;
  $('#backupHealth').innerHTML=`
    <div><small>上次完整備份</small><b>${fmtDateTime(h.lastBackup)}</b></div>
    <div><small>私人住宿資料</small><b>${h.hotelPrivate} 間</b></div>
    <div><small>行程自訂／修改</small><b>${h.customItin} 筆</b></div>
    <div><small>記帳</small><b>${h.expenses} 筆</b></div>
    <div><small>旅行日記</small><b>${h.notes} 篇</b></div>
    <div><small>本機小照片／收據</small><b>${h.photos} 張</b></div>`;
  if(navigator.storage?.estimate){
    const s=await navigator.storage.estimate();
    const used=s.usage||0,quota=s.quota||0,pct=quota?used/quota*100:0;
    $('#storageHealth').innerHTML=`<b>${(used/1024/1024).toFixed(1)} MB</b> 已使用${quota?` ／ 約 ${(quota/1024/1024).toFixed(0)} MB 可用配額`:''}<div class="storage-bar"><i style="width:${Math.min(100,pct)}%"></i></div><p>${pct<70?'目前儲存空間充足。':'照片較多，建議先匯出備份。'}</p>`;
  }else{
    $('#storageHealth').innerHTML='<p>此瀏覽器未提供儲存空間估算；私人資料仍可正常使用與匯出。</p>';
  }
  await checkForUpdate(false);
}
$('#systemExportBackup')?.addEventListener('click',exportFullBackup);

async function checkForUpdate(showToast=true){
  const badge=$('#updateBadge'),status=$('#updateStatus');
  if(badge)badge.textContent='檢查中';
  try{
    const res=await fetch(`./version.json?ts=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)throw new Error('version fetch failed');
    const remote=await res.json();
    const same=String(remote.version)===APP_META.version;
    if(badge){badge.textContent=same?'已是最新版':`有新版 V${remote.version}`;badge.className=`system-badge ${same?'current':'update'}`;}
    if(status)status.innerHTML=`<b>${same?'目前已是 GitHub 上的最新版':'GitHub 已部署較新的版本'}</b><p>本機：V${APP_META.version} · GitHub：V${esc(remote.version||'?')} · 發布 ${esc(remote.released||'')}</p>`;
    if(showToast)toast(same?'目前已是最新版':`發現新版 V${remote.version}`);
    return {ok:true,same,remote};
  }catch(e){
    if(badge){badge.textContent='離線／無法檢查';badge.className='system-badge offline';}
    if(status)status.innerHTML='<b>目前無法連線檢查 GitHub 版本</b><p>不影響離線行程、記帳與私人資料使用。</p>';
    if(showToast)toast('目前無法檢查更新');
    return {ok:false};
  }
}
$('#checkUpdateBtn')?.addEventListener('click',()=>checkForUpdate(true));

async function safeReloadLatest(){
  if(!confirm('安全重新載入最新版？PWA 快取會重建，但不會清除你的 IndexedDB、記帳、日記、私人訂房資料或行程修改。'))return;
  try{
    if('serviceWorker'in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.update().catch(()=>null)));
    }
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('japan-road-trip-2026-')).map(k=>caches.delete(k)));
    location.href=location.pathname+'?refresh='+Date.now();
  }catch(e){
    location.reload();
  }
}
$('#reloadLatestBtn')?.addEventListener('click',safeReloadLatest);

// QA
function qaRow(status,title,detail){
  const icon=status==='pass'?'✓':status==='warn'?'!':'×';
  return `<article class="qa-row ${status}"><span>${icon}</span><div><b>${esc(title)}</b><p>${esc(detail)}</p></div></article>`;
}
async function runQa(force=true){
  const list=$('#qaList'); if(!list)return;
  if(!force && list.dataset.done==='1')return;
  list.innerHTML='<div class="empty">正在檢查…</div>';
  const results=[];
  // 1. JS / data
  results.push({status:baseData.length>=90?'pass':'warn',title:'核心行程資料',detail:`目前載入 ${baseData.length} 筆原始行程、${hotels.length} 間住宿、${flights.length} 個航班。`});
  // 2. IndexedDB read/write
  try{
    await TripDB.put('settings',{id:'qaProbe',value:new Date().toISOString()});
    const probe=await TripDB.get('settings','qaProbe');
    results.push({status:probe?'pass':'warn',title:'IndexedDB 私人資料庫',detail:probe?'可正常寫入與讀取。':'讀取結果異常。'});
    await TripDB.del('settings','qaProbe');
  }catch(e){
    results.push({status:'fail',title:'IndexedDB 私人資料庫',detail:'無法寫入；請勿開始大量記帳或日記。'});
  }
  // 3. service worker/cache
  const controlled=!!navigator.serviceWorker?.controller;
  const cacheKeys='caches'in window?await caches.keys():[];
  results.push({status:controlled?'pass':'warn',title:'PWA 離線控制',detail:controlled?`Service Worker 已控制頁面；找到 ${cacheKeys.length} 個快取。`:'目前頁面尚未被 Service Worker 控制；重新開啟 App 後再測一次。'});
  // 4. backup
  const health=await collectHealth();
  const backupAge=health.lastBackup?Math.floor((Date.now()-new Date(health.lastBackup))/86400000):null;
  results.push({status:health.lastBackup&&backupAge<=14?'pass':'warn',title:'完整備份',detail:health.lastBackup?`上次備份：${fmtDateTime(health.lastBackup)}（${backupAge}天前）。`:'尚未匯出完整備份。'});
  // 5. hotel private
  results.push({status:health.hotelPrivate>0?'pass':'warn',title:'住宿私人資料',detail:health.hotelPrivate>0?`已有 ${health.hotelPrivate} 間住宿私人資料存在本機。`:'目前偵測不到私人住宿資料；若你需要訂房號／驗證碼，請確認已匯入。'});
  // 6. Maps & Map Codes
  const maps=baseData.filter(r=>r['Google Maps']);
  const verified=maps.filter(r=>r['Map Code']);
  const critical=['NIPPON Rent-A-Car TX淺草｜取車','NIPPON Rent-A-Car 成田空港営業所｜還車'];
  const criticalOk=critical.every(n=>baseData.some(r=>r['名稱']===n&&r['Google Maps']&&r['Map Code']));
  results.push({status:criticalOk&&verified.length>=50?'pass':'warn',title:'Google Maps / Map Code',detail:`${maps.length} 個地圖項目；${verified.length} 個有 Map Code。租車取／還車關鍵點 ${criticalOk?'完整':'需檢查'}。`});
  // 7. itinerary editing storage
  const edits=(itineraryCustom.added?.length||0)+Object.keys(itineraryCustom.overrides||{}).length+Object.keys(itineraryCustom.hidden||{}).length;
  results.push({status:'pass',title:'行程編輯層',detail:`編輯功能可用；目前有 ${edits} 筆本機新增／修改／隱藏狀態。`});
  // 8. OCR
  results.push({status:window.Tesseract?'pass':navigator.onLine?'warn':'warn',title:'收據 OCR',detail:window.Tesseract?'OCR 模組本次已載入。':'OCR 第一次使用仍需網路下載 Tesseract 日文模組；旅行中辨識後仍需人工確認。'});
  // 9. Network
  results.push({status:navigator.onLine?'pass':'warn',title:'目前網路',detail:navigator.onLine?'目前在線，可測試匯率、OCR與更新檢查。':'目前離線；核心行程仍可使用。'});
  // 10. version
  const ver=await checkForUpdate(false);
  results.push({status:ver.ok&&ver.same?'pass':ver.ok?'warn':'warn',title:'App 版本',detail:ver.ok?(ver.same?`V${APP_META.version} 已是 GitHub 最新版。`:`本機 V${APP_META.version}，GitHub 有 V${ver.remote.version}。`):`無法線上確認；本機為 V${APP_META.version}。`});

  const pass=results.filter(x=>x.status==='pass').length;
  const score=Math.round(pass/results.length*100);
  $('#qaScore').textContent=`${score}%`;
  $('#qaSubtitle').textContent=score>=90?'已可作為旅行主工具':score>=70?'大致正常，請處理黃色項目':'建議先處理異常項目';
  $('#qaRing').style.setProperty('--p',score);
  $('#qaRing span').textContent=`${score}%`;
  list.innerHTML=results.map(x=>qaRow(x.status,x.title,x.detail)).join('');
  list.dataset.done='1';
}
$('#runQaBtn')?.addEventListener('click',()=>runQa(true));


// Backup/import
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
async function exportFullBackup(){
  const now=new Date().toISOString();
  await TripDB.put('settings',{id:'lastBackupAt',value:now});
  const payload=await TripDB.exportAll();
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`JapanTrip-private-backup-${now.slice(0,10)}.json`);
  toast('完整備份已匯出');
  if($('#systemView')?.classList.contains('active'))renderSystem();
}
$('#exportBackupBtn').addEventListener('click',exportFullBackup);
$('#importPrivateBtn').addEventListener('click',()=>$('#importFile').click());$('#importBackupBtn').addEventListener('click',()=>$('#backupFile').click());async function handleImport(file){
  const j=JSON.parse(await file.text());
  await TripDB.importAll(j);
  const itin=await TripDB.get('settings','itineraryCustom');
  if(itin?.value){
    itineraryCustom=itin.value;
    localStorage.setItem(ITIN_LOCAL_KEY,JSON.stringify(itineraryCustom));
    refreshItineraryEverywhere();
  }
  toast('私人資料已匯入');
  renderHotels();renderExpenses();renderShopping();renderNotes();
}$('#importFile').addEventListener('change',e=>e.target.files[0]&&handleImport(e.target.files[0]));$('#backupFile').addEventListener('change',e=>e.target.files[0]&&handleImport(e.target.files[0]));
// PWA
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'));
TripDB.open().then(async()=>{
  if(!localStorage.getItem(ITIN_LOCAL_KEY)){
    const itin=await TripDB.get('settings','itineraryCustom');
    if(itin?.value){
      itineraryCustom=itin.value;
      localStorage.setItem(ITIN_LOCAL_KEY,JSON.stringify(itineraryCustom));
      refreshItineraryEverywhere();
    }
  }
});
renderHotels();renderShopping();renderExpenses();renderNotes();renderHomeReminder();
