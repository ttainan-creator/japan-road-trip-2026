const TripDB = (() => {
  const DB_NAME = 'JapanRoadTrip2026';
  const VERSION = 2;
  const stores = ['shopping','notes','expenses','hotelPrivate','hotelCovers','settings'];
  let dbp;
  function open(){
    if(dbp) return dbp;
    dbp = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = e => {
        const db=e.target.result;
        stores.forEach(s=>{ if(!db.objectStoreNames.contains(s)) db.createObjectStore(s,{keyPath:'id'}); });
      };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
    return dbp;
  }
  async function store(name, mode='readonly'){ const db=await open(); return db.transaction(name,mode).objectStore(name); }
  function promisify(req){ return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error)}); }
  async function all(name){ return promisify((await store(name)).getAll()); }
  async function get(name,id){ return promisify((await store(name)).get(id)); }
  async function put(name,obj){ return promisify((await store(name,'readwrite')).put(obj)); }
  async function del(name,id){ return promisify((await store(name,'readwrite')).delete(id)); }
  async function clear(name){ return promisify((await store(name,'readwrite')).clear()); }
  async function exportAll(){ const out={version:2, exportedAt:new Date().toISOString()}; for(const s of stores) out[s]=await all(s); return out; }
  async function importAll(payload){
    for(const s of stores){ if(!Array.isArray(payload[s])) continue; for(const item of payload[s]) await put(s,item); }
    if(payload.hotelPrivate && !Array.isArray(payload.hotelPrivate)){
      for(const [id,val] of Object.entries(payload.hotelPrivate)) await put('hotelPrivate',{id,...val});
    }
    if(payload.settings && !Array.isArray(payload.settings)){
      for(const [id,val] of Object.entries(payload.settings)) await put('settings',{id,value:val});
    }
  }
  return {open,all,get,put,del,clear,exportAll,importAll};
})();