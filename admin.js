/* Rewords Admin Console — Firebase/Firestore role based admin (users/{uid}.role === "admin") */
(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
    authDomain: "rewords-45ccf.firebaseapp.com",
    projectId: "rewords-45ccf",
    storageBucket: "rewords-45ccf.firebasestorage.app",
    messagingSenderId: "324257034049",
    appId: "1:324257034049:web:2e75279382793007683bc0",
    measurementId: "G-5LNDESBVST"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const $ = (id) => document.getElementById(id);
  const toast = (msg, type = 'info') => {
    const el = $('toast'); if (!el) return;
    el.textContent = msg; el.className = `toast show ${type}`;
    clearTimeout(toast.t); toast.t = setTimeout(() => el.className = 'toast', 3200);
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = (n, c='USD') => `${c === 'MAD' ? '' : '$'}${Number(n || 0).toFixed(2)}${c === 'MAD' ? ' MAD' : ''}`;
  const dt = (v) => { const d = v?.toDate ? v.toDate() : new Date(v); return isNaN(d) ? '—' : d.toLocaleString('ar-MA'); };
  const nowTs = () => firebase.firestore.Timestamp.now();
  const download = (name, data, mime='application/json') => {
    const blob = new Blob([data], {type:mime}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const normalize = (doc) => ({id: doc.id, ...doc.data()});

  let currentUser = null;
  let currentAdminDoc = null;
  let activeTab = 'overview';
  let unsub = [];
  let cache = { users: [], orders: [], withdrawals: [], transfers: [], tickets: [], ads: [], settings: [], maintenance: null, transactions: [] };

  const TABS = ['overview','users','ads','rewards','orders','withdrawals','transfers','tickets','settings','maintenance','analytics','export'];

  async function isAdmin(user) {
    if (!user) return false;
    const snap = await db.collection('users').doc(user.uid).get();
    currentAdminDoc = snap.exists ? snap.data() : null;
    return Boolean(currentAdminDoc?.role === 'admin');
  }

  async function login(email, password) {
    await auth.signInWithEmailAndPassword(email, password);
  }

  async function logout() { await auth.signOut(); }

  function showDashboard(show) {
    $('gate')?.classList.toggle('hidden', show);
    $('dash')?.classList.toggle('hidden', !show);
    $('logout')?.classList.toggle('hidden', !show);
  }

  function renderNav() {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
    document.querySelectorAll('.admin-tab').forEach(s => s.classList.toggle('hidden', s.id !== `tab-${activeTab}`));
  }

  function setTab(tab) {
    if (!TABS.includes(tab)) return;
    activeTab = tab;
    history.replaceState(null, '', `#${tab}`);
    renderNav();
    renderIfNeeded();
  }

  // Backward-compatible global hook for any existing HTML handlers.
  window.loadTab = (tab) => setTab(tab);

  function clearListeners(){ unsub.forEach(fn => { try{fn();}catch{} }); unsub=[]; }

  function listenCollection(name, key, limit=250) {
    const ref = db.collection(name).limit(limit);
    const u = ref.onSnapshot(s => { cache[key] = s.docs.map(normalize); renderIfNeeded(); }, e => toast(`تعذر تحميل ${name}: ${e.message}`, 'error'));
    unsub.push(u);
  }

  function renderIfNeeded(){
    if(activeTab==='overview') renderOverview();
    if(activeTab==='users') renderUsers();
    if(activeTab==='orders') renderOrders();
    if(activeTab==='withdrawals') renderWithdrawals();
    if(activeTab==='transfers') renderTransfers();
    if(activeTab==='tickets') renderTickets();
    if(activeTab==='ads') renderAds();
    if(activeTab==='rewards') renderRewards();
    if(activeTab==='settings') renderSettings();
    if(activeTab==='maintenance') renderMaintenance();
    if(activeTab==='analytics') renderAnalytics();
  }

  async function refreshAll() {
    clearListeners();
    ['users','orders','withdrawals','transfers','tickets','ads','settings','transactions','rewards'].forEach((c) => {
      const key = c === 'rewards' ? 'rewards' : c;
      listenCollection(c, key, c==='users' ? 500 : 300);
    });
    const m = await db.collection('maintenance').doc('global').get();
    cache.maintenance = m.exists ? normalize(m) : null;
    renderIfNeeded();
  }

  function statCard(title,value,sub=''){return `<div class="stat-card"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></div>`}

  function renderOverview(){
    const users=cache.users, orders=cache.orders, wd=cache.withdrawals, tx=cache.transactions, tickets=cache.tickets;
    const totalBal=users.reduce((a,u)=>a+Number(u.balanceUsd||0),0);
    const totalEarn=users.reduce((a,u)=>a+Number(u.totalEarnedUsd||0),0);
    const pendingOrders=orders.filter(x=>['pending','processing'].includes(x.status)).length;
    const pendingWd=wd.filter(x=>['pending','processing'].includes(x.status)).length;
    const openTickets=tickets.filter(x=>!['closed','resolved'].includes(x.status)).length;
    $('stats').innerHTML = [
      statCard('المستخدمون', users.length, 'بيانات Firestore'),
      statCard('إجمالي الأرصدة', money(totalBal), 'Liability'),
      statCard('إجمالي المكتسب', money(totalEarn), 'مسجل على الحسابات'),
      statCard('طلبات معلقة', pendingOrders, 'Orders'),
      statCard('سحوبات معلقة', pendingWd, 'Withdrawals'),
      statCard('تذاكر مفتوحة', openTickets, 'Support'),
      statCard('العمليات', tx.length, 'Transactions'),
      statCard('الحالة', currentAdminDoc?.role === 'admin' ? 'ADMIN' : '—', currentUser?.email || '')
    ].join('');
    const recent = [...tx].sort((a,b)=>new Date(b.createdAt?.toDate?.()||b.createdAt||0)-new Date(a.createdAt?.toDate?.()||a.createdAt||0)).slice(0,12);
    $('recentActivity').innerHTML = recent.length ? recent.map(x=>`<div class="row"><div><b>${esc(x.type||'عملية')}</b><small>${esc(x.userId||'—')} • ${dt(x.createdAt)}</small></div><strong>${esc(x.amountUsd!=null?money(x.amountUsd):x.status||'—')}</strong></div>`).join('') : '<div class="empty">لا توجد عمليات مسجلة.</div>';
  }

  function table(headers, rows, empty='لا توجد بيانات'){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`}

  function renderUsers(){
    const q = ($('userSearch')?.value||'').toLowerCase().trim();
    const rows=cache.users.filter(u=>!q || [u.uid,u.email,u.name,u.role,u.accountStatus].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,300).map(u=>`<tr>
      <td><code>${esc(u.uid)}</code></td><td>${esc(u.name||'—')}<small>${esc(u.email||'')}</small></td><td>${esc(u.role||'user')}</td><td>${money(u.balanceUsd)}</td>
      <td>${esc(u.accountStatus||'active')}</td><td>${dt(u.createdAt)}</td>
      <td><button class="btn small" data-action="user-edit" data-id="${esc(u.uid)}">فتح</button></td></tr>`).join('');
    $('usersTable').innerHTML=table(['UID','المستخدم','الدور','الرصيد','الحالة','الإنشاء','إدارة'],rows);
  }

  function renderOrders(){ $('ordersTable').innerHTML=table(['ID','User','Type','Amount','Status','Date','إجراء'], cache.orders.map(o=>`<tr><td><code>${esc(o.id)}</code></td><td>${esc(o.userId||'—')}</td><td>${esc(o.type||'—')}</td><td>${money(o.amountUsd)}</td><td>${esc(o.status||'—')}</td><td>${dt(o.createdAt)}</td><td>${actionButtons('order',o.id,o.status)}</td></tr>`).join('')); }
  function renderWithdrawals(){ $('withdrawalsTable').innerHTML=table(['ID','User','Type','Amount','Destination','Status','Date','إجراء'], cache.withdrawals.map(o=>`<tr><td><code>${esc(o.id)}</code></td><td>${esc(o.userId||'—')}</td><td>${esc(o.type||'—')}</td><td>${money(o.amountUsd)}</td><td>${esc(o.destination||'—')}</td><td>${esc(o.status||'—')}</td><td>${dt(o.createdAt)}</td><td>${actionButtons('withdrawal',o.id,o.status)}</td></tr>`).join('')); }
  function renderTransfers(){ $('transfersTable').innerHTML=table(['ID','المرسل','المستلم','المبلغ','Status','Date','إجراء'], cache.transfers.map(o=>`<tr><td><code>${esc(o.id)}</code></td><td>${esc(o.senderId||'—')}</td><td>${esc(o.receiverId||'—')}</td><td>${money(o.amountUsd)}</td><td>${esc(o.status||'—')}</td><td>${dt(o.createdAt)}</td><td>${actionButtons('transfer',o.id,o.status)}</td></tr>`).join('')); }
  function renderTickets(){ $('ticketsTable').innerHTML=table(['ID','User','Subject','Status','Urgent','Last','إجراء'], cache.tickets.map(o=>`<tr><td><code>${esc(o.id)}</code></td><td>${esc(o.userId||'—')}</td><td>${esc(o.subject||'—')}</td><td>${esc(o.status||'open')}</td><td>${o.urgent?'نعم':'لا'}</td><td>${dt(o.updatedAt||o.createdAt)}</td><td><button class="btn small" data-action="ticket" data-id="${esc(o.id)}">فتح</button></td></tr>`).join('')); }

  function actionButtons(type,id,status){
    const next = status==='pending' ? ['processing','rejected'] : status==='processing' ? ['completed','failed'] : [];
    return next.map(s=>`<button class="btn xs" data-action="status" data-type="${type}" data-id="${esc(id)}" data-status="${s}">${esc(labelStatus(s))}</button>`).join(' ') || '<span class="muted">—</span>';
  }
  const labelStatus=s=>({pending:'معلق',processing:'معالجة',completed:'مكتمل',failed:'فشل',rejected:'مرفوض',cancelled:'ملغى',refunded:'مسترد'})[s]||s;

  function renderAds(){ $('adsTable').innerHTML=table(['ID','Name','Provider','Placement','Page','Priority','Enabled','إجراء'], cache.ads.map(a=>`<tr><td><code>${esc(a.id)}</code></td><td>${esc(a.name||'—')}</td><td>${esc(a.provider||'—')}</td><td>${esc(a.placement||'—')}</td><td>${esc(a.page||'—')}</td><td>${esc(a.priority??0)}</td><td>${a.enabled?'مفعل':'متوقف'}</td><td><button class="btn xs" data-action="ad-toggle" data-id="${esc(a.id)}">${a.enabled?'إيقاف':'تفعيل'}</button> <button class="btn xs" data-action="ad-edit" data-id="${esc(a.id)}">تعديل</button></td></tr>`).join('')); }
  function renderRewards(){ $('rewardsTable').innerHTML=table(['ID','Name','Type','Cost','Currency','Enabled','Limit','إجراء'], (cache.rewards||[]).map(r=>`<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.name||'—')}</td><td>${esc(r.type||'—')}</td><td>${esc(r.cost??r.coins??'—')}</td><td>${esc(r.currency||'USD')}</td><td>${r.enabled===false?'متوقف':'مفعل'}</td><td>${esc(r.dailyLimit??'—')}</td><td><button class="btn xs" data-action="reward-edit" data-id="${esc(r.id)}">تعديل</button></td></tr>`).join('')); }
  function renderSettings(){ $('settingsRows').innerHTML = cache.settings.map(s=>`<div class="setting-card"><div><b>${esc(s.id)}</b><small>Firestore/settings/${esc(s.id)}</small></div><button class="btn small" data-action="setting-edit" data-id="${esc(s.id)}">تعديل</button></div>`).join('') || '<div class="empty">لا توجد إعدادات. يمكنك إنشاء الإعداد العام.</div>'; }
  function renderMaintenance(){ const m=cache.maintenance||{}; $('maintEnabled').checked=Boolean(m.enabled); $('maintTitle').value=m.title||'الموقع تحت الصيانة'; $('maintDescription').value=m.description||''; $('maintReturn').value=m.estimatedReturn||''; }
  function renderAnalytics(){ const days={}; [...cache.transactions,...cache.orders,...cache.withdrawals].forEach(x=>{const d=(x.createdAt?.toDate?.()||new Date(x.createdAt||Date.now())).toISOString().slice(0,10); days[d]=(days[d]||0)+1;}); $('analyticsBox').innerHTML=Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0])).slice(-30).map(([d,n])=>`<div class="bar-row"><span>${d}</span><div><i style="width:${Math.min(100,n*5)}%"></i></div><b>${n}</b></div>`).join('')||'<div class="empty">لا توجد بيانات كافية.</div>'; }

  async function saveMaintenance(){
    const data={enabled:$('maintEnabled').checked,title:$('maintTitle').value.trim(),description:$('maintDescription').value.trim(),estimatedReturn:$('maintReturn').value.trim(),updatedAt:nowTs(),updatedBy:currentUser.uid};
    await db.collection('maintenance').doc('global').set(data,{merge:true}); cache.maintenance={id:'global',...data}; toast('تم حفظ وضع الصيانة','success');
  }

  async function saveSetting(){
    const id=$('settingId').value.trim(); if(!id) return toast('أدخل اسم الإعداد','error');
    let value; try{value=JSON.parse($('settingValue').value)}catch{value=$('settingValue').value;}
    await db.collection('settings').doc(id).set({value,updatedAt:nowTs(),updatedBy:currentUser.uid},{merge:true}); toast('تم حفظ الإعداد','success'); await refreshAll(); setTab('settings');
  }

  async function updateStatus(collection,id,status,note=''){
    await db.collection(collection).doc(id).set({status,adminNote:note,processedAt:nowTs(),processedBy:currentUser.uid},{merge:true});
    await db.collection('adminActions').add({adminUid:currentUser.uid,action:'status_update',collection,documentId:id,status,note,createdAt:nowTs()});
    toast('تم تحديث الحالة','success');
  }

  async function editUser(uid){
    const u=cache.users.find(x=>x.uid===uid); if(!u) return;
    const name=prompt('الاسم:',u.name||''); if(name===null) return;
    const role=prompt('الدور (user/admin):',u.role||'user'); if(role===null) return;
    const status=prompt('الحالة (active/restricted/suspended/banned):',u.accountStatus||'active'); if(status===null) return;
    await db.collection('users').doc(uid).set({name:name.trim(),role:role.trim()==='admin'?'admin':'user',accountStatus:status.trim(),updatedAt:nowTs(),updatedBy:currentUser.uid},{merge:true});
    await db.collection('adminActions').add({adminUid:currentUser.uid,action:'user_edit',targetUid:uid,changes:{name,role,status},createdAt:nowTs()});
    toast('تم تحديث المستخدم','success');
  }

  async function adjustBalance(uid){
    const amount=Number(prompt('التعديل بالدولار (مثال +1.50 أو -1.50):','0')); if(!Number.isFinite(amount)||amount===0) return;
    const reason=prompt('سبب التعديل الإلزامي:','تعديل إداري'); if(!reason?.trim()) return toast('السبب مطلوب','error');
    const ref=db.collection('users').doc(uid); const tx=db.collection('transactions').doc();
    await db.runTransaction(async t=>{
      const snap=await t.get(ref); if(!snap.exists) throw new Error('المستخدم غير موجود');
      const before=Number(snap.data().balanceUsd||0), after=before+amount; if(after<0) throw new Error('لا يمكن أن يصبح الرصيد سالبًا');
      t.update(ref,{balanceUsd:after,updatedAt:nowTs()});
      t.set(tx,{userId:uid,type:'admin_adjustment',amountUsd:amount,beforeUsd:before,afterUsd:after,reason,adminUid:currentUser.uid,createdAt:nowTs(),reference:tx.id});
    });
    await db.collection('adminActions').add({adminUid:currentUser.uid,action:'balance_adjustment',targetUid:uid,amountUsd:amount,reason,createdAt:nowTs()});
    toast('تم تعديل الرصيد مع تسجيل العملية','success');
  }

  async function saveAd(id){
    const existing=(cache.ads||[]).find(a=>a.id===id)||{};
    const enabled=confirm(`هل تريد ${existing.enabled===false?'تفعيل':'إيقاف'} الإعلان؟`);
    await db.collection('ads').doc(id).set({enabled,updatedAt:nowTs(),updatedBy:currentUser.uid},{merge:true}); toast('تم تحديث الإعلان','success');
  }

  async function inspectTicket(id){
    const t=cache.tickets.find(x=>x.id===id); if(!t) return;
    const action=prompt('اكتب: close أو open أو urgent أو normal',t.status==='closed'?'open':'close'); if(!action) return;
    const patch={updatedAt:nowTs(),updatedBy:currentUser.uid};
    if(action==='close') patch.status='closed'; else if(action==='open') patch.status='open'; else if(action==='urgent') patch.urgent=true; else if(action==='normal') patch.urgent=false; else return;
    await db.collection('tickets').doc(id).set(patch,{merge:true}); toast('تم تحديث التذكرة','success');
  }

  async function openSetting(id){ const s=cache.settings.find(x=>x.id===id); if(!s) return; const v=prompt(`قيمة ${id} (JSON أو نص):`,typeof s.value==='string'?s.value:JSON.stringify(s.value)); if(v===null)return; let value; try{value=JSON.parse(v)}catch{value=v}; await db.collection('settings').doc(id).set({value,updatedAt:nowTs(),updatedBy:currentUser.uid},{merge:true}); toast('تم حفظ الإعداد','success'); }
  async function openReward(id){ const r=(cache.rewards||[]).find(x=>x.id===id); if(!r)return; const name=prompt('اسم المكافأة',r.name||''); if(name===null)return; const cost=Number(prompt('التكلفة/القيمة',r.cost??r.coins??0)); if(!Number.isFinite(cost))return; await db.collection('rewards').doc(id).set({name,cost,updatedAt:nowTs(),updatedBy:currentUser.uid},{merge:true}); toast('تم حفظ المكافأة','success'); }

  async function exportCollection(name){ const snap=await db.collection(name).get(); const rows=snap.docs.map(d=>({id:d.id,...d.data()})); download(`rewords-${name}-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(rows,null,2)); toast(`تم تصدير ${name}`,'success'); }

  function bind(){
    $('login')?.addEventListener('submit',async e=>{e.preventDefault();try{await login($('email').value.trim(),$('pass').value)}catch(err){toast(err.message,'error')}});
    $('logout')?.addEventListener('click',logout);
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
    $('userSearch')?.addEventListener('input',renderUsers);
    $('saveMaintenance')?.addEventListener('click',()=>saveMaintenance().catch(e=>toast(e.message,'error')));
    $('saveSetting')?.addEventListener('click',()=>saveSetting().catch(e=>toast(e.message,'error')));
    $('newSetting')?.addEventListener('click',()=>{ $('settingEditor').classList.remove('hidden'); $('settingId').value=''; $('settingValue').value=''; });
    $('closeSetting')?.addEventListener('click',()=> $('settingEditor').classList.add('hidden'));
    $('refreshBtn')?.addEventListener('click',()=>refreshAll().then(()=>toast('تم التحديث','success')).catch(e=>toast(e.message,'error')));
    $('exportAll')?.addEventListener('click',async()=>{for(const n of ['users','transactions','orders','withdrawals','transfers','tickets','ads','rewards','settings','maintenance','adminActions']){await exportCollection(n)}});
    document.body.addEventListener('click',async e=>{
      const b=e.target.closest('[data-action]'); if(!b)return;
      try{
        const a=b.dataset.action;
        if(a==='user-edit'){await editUser(b.dataset.id); if(confirm('تعديل الرصيد أيضًا؟')) await adjustBalance(b.dataset.id);}
        else if(a==='ad-toggle') await saveAd(b.dataset.id);
        else if(a==='reward-edit') await openReward(b.dataset.id);
        else if(a==='setting-edit') await openSetting(b.dataset.id);
        else if(a==='ticket') await inspectTicket(b.dataset.id);
        else if(a==='status'){const map={order:'orders',withdrawal:'withdrawals',transfer:'transfers'}; await updateStatus(map[b.dataset.type],b.dataset.id,b.dataset.status,prompt('ملاحظة الإدارة:','')||'');}
      }catch(err){toast(err.message,'error')}
    });
  }

  auth.onAuthStateChanged(async user=>{
    currentUser=user;
    if(!user){ clearListeners(); showDashboard(false); return; }
    try{
      const ok=await isAdmin(user);
      if(!ok){ toast('هذا الحساب ليس مسؤولًا. أضف role=admin في users/{UID}.','error'); await auth.signOut(); return; }
      $('adminEmail').textContent=user.email||''; $('adminUid').textContent=user.uid; showDashboard(true);
      await refreshAll();
      setTab(location.hash.slice(1)||'overview');
    }catch(err){showDashboard(false); toast(err.message,'error');}
  });

  document.addEventListener('DOMContentLoaded',bind);
})();
