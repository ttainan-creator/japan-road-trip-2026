const data=window.TRIP_DATA||[], hotels=window.HOTELS||[], ref=window.REFERENCE_DATA||{cards:[],networkPromos:[],guides:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], pad=n=>String(n).padStart(2,'0');
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2);
const dt=s=>new Date(String(s).replace(' ','T')); const dateOf=r=>r.日期時間?.slice(0,10)||''; const timeOf=r=>r.日期時間?.slice(11,16)||'';
const days=[...new Set(data.map(r=>r.Day))].sort((a,b)=>parseInt(a.slice(1))-parseInt(b.slice(1))); const dayDates={}; days.forEach(d=>{const r=data.find(x=>x.Day===d&&x.日期時間);dayDates[d]=r?dateOf(r):''});
function go(name){$$('.view').forEach(v=>v.classList.remove('active')); const v=$('#'+name+'View'); if(v)v.classList.add('active'); $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===name)); window.scrollTo({top:0,behavior:'smooth'}); if(name==='expenses')renderExpenses(); if(name==='shopping')renderShopping(); if(name==='notes')renderNotes(); if(name==='hotels')renderHotels(); if(name==='wallet')refreshRateUI();}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
function mapBtn(url){return url?`<a href="${esc(url)}" target="_blank" rel="noopener">📍 導航</a>`:''} function mapCode(code){return code?`<button onclick="copyText('${esc(code)}')">🗺 ${esc(code)}</button>`:''}
window.copyText=async t=>{try{await navigator.clipboard.writeText(t);toast('已複製 '+t)}catch{prompt('複製',t)}};
function toast(t){const d=document.createElement('div');d.textContent=t;d.style='position:fixed;left:50%;bottom:95px;transform:translateX(-50%);background:#28231e;color:white;padding:10px 14px;border-radius:999px;font-size:12px;z-index:99';document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function itemHTML(r){const notes=[r['車程／保留'],r['停車'],r['Plan B'],r['備註']].filter(Boolean).slice(0,3);return `<article class="item"><div class="time">${esc(timeOf(r))}</div><div><h3>${esc(r['名稱'])}</h3><div class="meta">${r['類型']?`<span class="pill">${esc(r['類型'])}</span>`:''}${r['地區']?`<span class="pill">${esc(r['地區'])}</span>`:''}</div>${notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}<div class="actions">${mapBtn(r['Google Maps'])}${mapCode(r['Map Code'])}</div></div></article>`}
function renderList(el,rows){el.innerHTML=rows.length?rows.map(itemHTML).join(''):'<div class="empty">目前沒有資料</div>'}
function currentTripDay(){const now=new Date(),key=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;return days.find(d=>dayDates[d]===key)||'D01'}
// countdown/home
(function(){const start=new Date('2026-11-21T00:00:00+08:00'),now=new Date(),diff=Math.ceil((start-now)/86400000);$('#countdown').textContent=diff>0?`距離出發 ${diff} 天`:diff>-10?'TRIP MODE':'JOURNEY ARCHIVE';})();
const sel=$('#todaySelect');days.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=`${d} · ${dayDates[d].slice(5).replace('-','/')}`;sel.appendChild(o)});sel.value=currentTripDay();sel.addEventListener('change',renderToday);
function renderToday(){const d=sel.value;renderList($('#todayList'),data.filter(r=>r.Day===d&&r['類型']!=='備案'));}
renderToday(); const tabs=$('#daysTabs');days.forEach((d,i)=>{const b=document.createElement('button');b.textContent=`${d} ${dayDates[d].slice(5).replace('-','/')}`;b.dataset.day=d;b.className=i===0?'active':'';tabs.appendChild(b)});function renderDay(d){$$('#daysTabs button').forEach(b=>b.classList.toggle('active',b.dataset.day===d));renderList($('#daysList'),data.filter(r=>r.Day===d))}$$('#daysTabs button').forEach(b=>b.addEventListener('click',()=>renderDay(b.dataset.day)));renderDay('D01');
renderList($('#driveList'),data.filter(r=>['移動','SA・PA'].includes(r['類型'])));renderList($('#planbList'),data.filter(r=>r['類型']==='備案'));
$('#parkingList').innerHTML=data.filter(r=>r['類型']==='停車').map(r=>`<article class="card"><div class="big">${esc(r.Day)} · ${esc(dateOf(r).slice(5).replace('-','/'))} ${esc(timeOf(r))}</div><h3>${esc(r['名稱'])}</h3>${r['停車']?`<p class="note">${esc(r['停車'])}</p>`:''}${r['Plan B']?`<p class="note"><b>Plan B：</b>${esc(r['Plan B'])}</p>`:''}<div class="actions">${mapBtn(r['Google Maps'])}${mapCode(r['Map Code'])}</div></article>`).join('');
function nextItem(){const now=new Date();let future=data.filter(r=>r.日期時間&&dt(r.日期時間)>=now&&r['類型']!=='備案').sort((a,b)=>dt(a.日期時間)-dt(b.日期時間));if(!future.length)future=data;$('#nextItem').innerHTML=itemHTML(future[0]);$('#homeTodayText').textContent=`${currentTripDay()} · ${dayDates[currentTripDay()].slice(5).replace('-','/')}`;const h=hotels.find(x=>x.dates.includes(dayDates[currentTripDay()].slice(5).replace('-','/')))||hotels[0];if(h)$('#homeHotelText').textContent=h.name;}
nextItem();
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
          <button onclick="pickHotelCover('${id}')">🖼 更換封面</button>
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
function renderCards(filter='all'){const list=[];if(filter!=='network')ref.cards.filter(c=>filter==='5'?c.score>=5:true).forEach(c=>list.push(`<article class="card"><div class="big">${'★'.repeat(c.score)} · ${esc(c.issuer)}</div><h3>${esc(c.name)}</h3><p><b>${esc(c.best)}</b></p><p class="note">${esc(c.summary)}</p>${c.conditions.map(x=>`<p class="note">• ${esc(x)}</p>`).join('')}<div class="actions"><a href="${esc(c.source)}" target="_blank">官方來源 ↗</a></div></article>`));if(filter==='all'||filter==='network')ref.networkPromos.forEach(p=>list.push(`<article class="card"><div class="big">${esc(p.network)} · ${esc(p.valid)}</div><h3>${esc(p.title)}</h3><p class="note">${esc(p.detail)}</p><div class="actions"><a href="${esc(p.source)}" target="_blank">活動頁 ↗</a></div></article>`));$('#cardsList').innerHTML=list.join('')}
renderCards();$$('#cardFilters button').forEach(b=>b.addEventListener('click',()=>{$$('#cardFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderCards(b.dataset.filter)}));
// Shopping
let shopCat='all';$('#addShoppingBtn').addEventListener('click',()=>openDialog('新增必買',[['name','商品','text',''],['category','分類','select','食品',['食品','電器','藥妝','雜貨']],['place','想在哪裡買','text',''],['budget','預算（日圓）','number',''],['note','備註','textarea','']],async v=>{await TripDB.put('shopping',{id:uid(),...v,bought:false,createdAt:new Date().toISOString()});renderShopping()}));
async function renderShopping(){const rows=(await TripDB.all('shopping')).filter(x=>shopCat==='all'||x.category===shopCat);$('#shoppingList').innerHTML=rows.length?rows.map(x=>`<article class="card shop-row"><input type="checkbox" ${x.bought?'checked':''} onchange="toggleShop('${x.id}',this.checked)"><div class="grow"><h3>${esc(x.name)}</h3><div class="meta"><span class="pill">${esc(x.category)}</span>${x.place?`<span class="pill">${esc(x.place)}</span>`:''}</div>${x.budget?`<p class="note">預算 ¥${esc(x.budget)}</p>`:''}${x.note?`<p class="note">${esc(x.note)}</p>`:''}</div><button onclick="deleteShop('${x.id}')">×</button></article>`).join(''):'<div class="empty">還沒有必買品。想到什麼就按右上角 ＋。</div>'}
window.toggleShop=async(id,v)=>{const x=await TripDB.get('shopping',id);x.bought=v;await TripDB.put('shopping',x);renderShopping()};window.deleteShop=async id=>{if(confirm('刪除這項？')){await TripDB.del('shopping',id);renderShopping()}};$$('#shoppingFilters button').forEach(b=>b.addEventListener('click',()=>{$$('#shoppingFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');shopCat=b.dataset.cat;renderShopping()}));
// Expenses
$('#addExpenseBtn').addEventListener('click',()=>openDialog('新增支出',[['date','日期','date',new Date().toISOString().slice(0,10)],['merchant','店家／項目','text',''],['category','分類','select','餐飲',['餐飲','住宿','購物','交通','景點','其他']],['jpy','日幣金額','number',''],['twd','台幣金額（可空白）','number',''],['card','付款方式／卡片','text',''],['note','備註','textarea','']],async v=>{if(v.jpy&&!v.twd)v.twd=Math.round(Number(v.jpy)*rate);await TripDB.put('expenses',{id:uid(),...v,createdAt:new Date().toISOString()});renderExpenses()}));
async function renderExpenses(){const rows=(await TripDB.all('expenses')).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const j=rows.reduce((s,x)=>s+Number(x.jpy||0),0),t=rows.reduce((s,x)=>s+Number(x.twd||0),0);$('#expenseSummary').innerHTML=`<div class="summary"><small>本趟日幣</small><b>¥${j.toLocaleString()}</b></div><div class="summary"><small>約台幣</small><b>NT$${Math.round(t).toLocaleString()}</b></div><div class="summary"><small>筆數</small><b>${rows.length}</b></div><div class="summary"><small>匯率</small><b>${rate.toFixed(4)}</b></div>`;$('#homeSpendText').textContent=`本趟 ¥${j.toLocaleString()}`;$('#expenseList').innerHTML=rows.length?rows.map(x=>`<article class="card expense-row"><div class="grow"><div class="big">${esc(x.date||'')} · ${esc(x.category||'')}</div><h3>${esc(x.merchant||'未命名')}</h3>${x.card?`<p class="note">💳 ${esc(x.card)}</p>`:''}${x.note?`<p class="note">${esc(x.note)}</p>`:''}</div><div><div class="money">¥${Number(x.jpy||0).toLocaleString()}</div><p class="note">NT$${Number(x.twd||0).toLocaleString()}</p><button onclick="deleteExpense('${x.id}')">×</button></div></article>`).join(''):'<div class="empty">還沒有支出。旅行時按右上角 ＋ 記一筆。</div>'}
window.deleteExpense=async id=>{if(confirm('刪除這筆支出？')){await TripDB.del('expenses',id);renderExpenses()}};$('#exportExpenses').addEventListener('click',async()=>{const rows=await TripDB.all('expenses');const cols=['date','merchant','category','jpy','twd','card','note'];const csv=[cols.join(','),...rows.map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(','))].join('\n');downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv'}),'JapanTrip-expenses.csv')});
// Notes
$('#addNoteBtn').addEventListener('click',()=>openDialog('新增旅行日記',[['date','日期','date',new Date().toISOString().slice(0,10)],['place','地點','text',''],['text','今天想記住什麼？','textarea',''],['rating','評分','select','5',['5','4','3','2','1']],['photo','照片（選填）','file','']],async v=>{let photo='';if(v.photoFile)photo=await compressImage(v.photoFile,1400,.72);delete v.photoFile;await TripDB.put('notes',{id:uid(),...v,photo,createdAt:new Date().toISOString()});renderNotes()}));
async function renderNotes(){const rows=(await TripDB.all('notes')).sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('#notesList').innerHTML=rows.length?rows.map(x=>`<article class="journal">${x.photo?`<img src="${x.photo}" alt="">`:''}<div class="journal-body"><div class="big">${esc(x.date||'')} · ${esc(x.place||'')}</div><h3>${'★'.repeat(Number(x.rating||0))}</h3><p>${esc(x.text||'')}</p><div class="actions"><button onclick="deleteNote('${x.id}')">刪除</button></div></div></article>`).join(''):'<div class="empty">旅行日記還是空白。出發後，每天留一句話也很值得。</div>'}
window.deleteNote=async id=>{if(confirm('刪除這篇日記？')){await TripDB.del('notes',id);renderNotes()}};
$('#makeMemoir').addEventListener('click',async()=>{const notes=(await TripDB.all('notes')).sort((a,b)=>String(a.date).localeCompare(String(b.date))),expenses=await TripDB.all('expenses');const total=expenses.reduce((s,x)=>s+Number(x.jpy||0),0);const w=window.open('','_blank');w.document.write(`<html><head><title>Japan Road Trip 2026 回憶錄</title><style>body{font-family:serif;max-width:760px;margin:50px auto;color:#29231d;line-height:1.8;padding:0 20px}h1{font-size:36px}article{page-break-inside:avoid;margin:36px 0}img{max-width:100%;border-radius:14px}.meta{color:#8a6a55}button{padding:10px 14px}</style></head><body><h1>🇯🇵 Japan Road Trip 2026</h1><p>2026/11/21–11/30 · 10 Days 9 Nights</p><p><b>旅行記帳累計：</b>¥${total.toLocaleString()}</p><button onclick="print()">列印／另存 PDF</button>${notes.map(n=>`<article><p class="meta">${esc(n.date)} · ${esc(n.place)} · ${'★'.repeat(Number(n.rating||0))}</p>${n.photo?`<img src="${n.photo}">`:''}<p>${esc(n.text).replace(/\n/g,'<br>')}</p></article>`).join('')}</body></html>`);w.document.close()});
// Guides
$('#guideList').innerHTML=ref.guides.map(g=>`<article class="card"><div class="big">${esc(g.day)} · 約 ${g.minutes} 分鐘</div><h3>${esc(g.title)}</h3><p class="note">${esc(g.intro.slice(0,75))}…</p><div class="actions"><button onclick="openGuide('${g.id}')">開始閱讀 →</button></div></article>`).join('');window.openGuide=id=>{const g=ref.guides.find(x=>x.id===id);$('#guideTitle').textContent=g.title;$('#guideBody').innerHTML=`<p class="lead">${esc(g.intro)}</p><h3>現場請特別看</h3><ul>${g.points.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><blockquote><b>帶著這個問題去看：</b><br>${esc(g.question)}</blockquote>`;go('guideDetail')};
// Checklist
const checks=['護照','台灣駕照','國際駕照／日文譯本','租車訂單','ETC／高速公路方案確認','住宿訂單','Suzuki 歷史館預約','行動網路／eSIM','Google Maps 離線地圖','重要飯店／停車場 Map Code','信用卡／旅遊保險','行李與行動電源','成田機場還車時間確認','11/29 ART HOTEL 晚上泡湯提醒'];let checkState=JSON.parse(localStorage.getItem('trip-checks')||'{}');function renderChecks(){$('#checklist').innerHTML=checks.map((c,i)=>`<label class="check-row ${checkState[i]?'done':''}"><input type="checkbox" data-i="${i}" ${checkState[i]?'checked':''}><span>${esc(c)}</span></label>`).join('');$$('#checklist input').forEach(x=>x.addEventListener('change',e=>{checkState[e.target.dataset.i]=e.target.checked;localStorage.setItem('trip-checks',JSON.stringify(checkState));renderChecks()}))}renderChecks();$('#resetChecklist').addEventListener('click',()=>{localStorage.removeItem('trip-checks');checkState={};renderChecks()});
// Dialog generic
let dialogSaveFn=null;function openDialog(title,fields,onSave){$('#dialogTitle').textContent=title;dialogSaveFn=onSave;$('#dialogFields').innerHTML='<div class="form-grid">'+fields.map(f=>{const[n,l,t,v,opts]=f;if(t==='textarea')return `<label>${l}<textarea name="${n}">${esc(v)}</textarea></label>`;if(t==='select')return `<label>${l}<select name="${n}">${opts.map(o=>`<option ${o==v?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;if(t==='file')return `<label>${l}<input name="${n}" type="file" accept="image/*"></label>`;return `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}"></label>`}).join('')+'</div>';$('#editDialog').showModal()}
$('#editForm').addEventListener('submit',async e=>{if(e.submitter?.value==='cancel')return; e.preventDefault();const fd=new FormData(e.currentTarget),v={};for(const[k,val]of fd.entries()){if(val instanceof File){if(val.size)v[k+'File']=val}else v[k]=val}await dialogSaveFn?.(v);$('#editDialog').close()});
async function compressImage(file,max=1280,quality=.72){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{let w=img.width,h=img.height;if(Math.max(w,h)>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s)}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',quality))};img.onerror=rej;img.src=url})}
// Backup/import
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
$('#exportBackupBtn').addEventListener('click',async()=>{const payload=await TripDB.exportAll();downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'JapanTrip-private-backup.json')});
$('#importPrivateBtn').addEventListener('click',()=>$('#importFile').click());$('#importBackupBtn').addEventListener('click',()=>$('#backupFile').click());async function handleImport(file){const j=JSON.parse(await file.text());await TripDB.importAll(j);toast('私人資料已匯入');renderHotels();renderExpenses();renderShopping();renderNotes()}$('#importFile').addEventListener('change',e=>e.target.files[0]&&handleImport(e.target.files[0]));$('#backupFile').addEventListener('change',e=>e.target.files[0]&&handleImport(e.target.files[0]));
// PWA
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'));
TripDB.open();renderHotels();renderShopping();renderExpenses();renderNotes();
