const firebaseConfig={
  "apiKey": "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  "authDomain": "rewords-45ccf.firebaseapp.com",
  "projectId": "rewords-45ccf",
  "storageBucket": "rewords-45ccf.firebasestorage.app",
  "messagingSenderId": "324257034049",
  "appId": "1:324257034049:web:2e75279382793007683bc0",
  "measurementId": "G-5LNDESBVST"
};
firebase.initializeApp(firebaseConfig);const auth=firebase.auth(),db=firebase.firestore();
const state={user:null,profile:null,rates:{USD_MAD:10},maintenance:false,orders:[],selectedTicket:null};
const $=id=>document.getElementById(id),money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const ts=v=>(v?.toDate?v.toDate():new Date(v||0)).toLocaleString('ar-MA',{dateStyle:'medium',timeStyle:'short'});
function toast(m){$('toast').textContent=m;$('toast').classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>$('toast').classList.remove('show'),2500)}
const pageNames={home:'الرئيسية',bonus:'المكافأة اليومية',ads:'الإعلانات',rewards:'المكافآت',transfers:'التحويلات',orders:'الطلبات',support:'الدعم',profile:'الملف الشخصي',maintenance:'الصيانة'};
const ads={
'adsterra-468':{name:'Adsterra 468×60',provider:'Adsterra',type:'script',html:`<script>atOptions={key:'c351ac7c1200d215d77a5b0a74a395fe',format:'iframe',height:60,width:468,params:{}};<\/script><script src="https://www.highperformanceformat.com/c351ac7c1200d215d77a5b0a74a395fe/invoke.js"><\/script>`},
'adsterra-native':{name:'Adsterra Native Banner',provider:'Adsterra',type:'script',html:`<script async data-cfasync="false" src="https://pl30913455.effectivecpmnetwork.com/df7130eb24354334e85ee01b5be086f2/invoke.js"><\/script><div id="container-df7130eb24354334e85ee01b5be086f2"></div>`},
'adsterra-popunder':{name:'Adsterra Popunder',provider:'Adsterra',type:'script',html:`<script src="https://pl30913454.effectivecpmnetwork.com/2e/8e/1d/2e8e1d21821e52cabb4dca2fb31ae1ed.js"><\/script>`},
'adsterra-smartlink':{name:'Adsterra Smartlink',provider:'Adsterra',type:'link',url:'https://www.effectivecpmnetwork.com/z4tps2vcr?key=4f9ed7a11b0bab57c48fbe6c874b5a18'},
'adsterra-socialbar':{name:'Adsterra SocialBar',provider:'Adsterra',type:'script',html:`<script src="https://pl30913456.effectivecpmnetwork.com/32/aa/62/32aa624c58a1d6ea82421be6e9c8d4b4.js"><\/script>`},
'monetag-multitag':{name:'Monetag MultiTag',provider:'Monetag',type:'script',html:`<script src="https://quge5.com/88/tag.min.js" data-zone="271240" async data-cfasync="false"><\/script>`},
'monetag-direct':{name:'Monetag Direct Link',provider:'Monetag',type:'link',url:'https://omg10.com/4/11605558'},
'hilltop-popunder':{name:'HilltopAds Popunder',provider:'HilltopAds',type:'script',html:`<script>(function(krn){var d=document,s=d.createElement('script'),l=d.scripts[d.scripts.length-1];s.settings=krn||{};s.src="//infamous-maximum.com/cKDd9O6.bL2T5/lZS/WQQe9INdzOM/z/MjzNYv0qM/S/0_3FMhzmMwz/NdjIQ/1U";s.async=true;s.referrerPolicy='no-referrer-when-downgrade';l.parentNode.insertBefore(s,l);})({});<\/script>`}
};
const rewards=[
{id:'google-play',name:'Google Play',min:5},{id:'game-topup',name:'Game Top-Up',min:3},
{id:'cash-plus',name:'Cash Plus Morocco',min:10},{id:'usd-withdrawal',name:'USD Withdrawal',min:15},{id:'mad-withdrawal',name:'MAD Withdrawal',min:15}
];
function setBusy(b,x){if(!b)return;b.disabled=x;if(x){b.dataset.old=b.textContent;b.textContent='جارٍ التنفيذ...'}else b.textContent=b.dataset.old||b.textContent}
async function ensureProfile(){
 const r=db.collection('users').doc(state.user.uid),s=await r.get();
 if(s.exists){state.profile=s.data();return}
 const u=state.user,name=u.displayName||u.email.split('@')[0],code=('RWD-'+u.uid.slice(0,8)).toUpperCase();
 const d={uid:u.uid,name,email:u.email,referralCode:code,referredBy:null,balanceUsd:0,totalEarnedUsd:0,totalWithdrawnUsd:0,referralEarningsUsd:0,accountStatus:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
 await r.set(d);state.profile=d
}
function renderProfile(){
 const p=state.profile||{},name=p.name||'مستخدم',letter=name.trim()[0]?.toUpperCase()||'R';
 ['avatar','profileAvatar'].forEach(id=>$(id).textContent=letter);$('userName').textContent=name;$('userEmail').textContent=state.user.email;
 $('profileName').textContent=name;$('profileEmail').textContent=state.user.email;$('profileNameInput').value=name;
 $('refCode').textContent=p.referralCode||'—';$('homeBalance').textContent=money(p.balanceUsd);$('sideBalance').textContent=money(p.balanceUsd);
 $('totalEarned').textContent=money(p.totalEarnedUsd);$('totalWithdrawn').textContent=money(p.totalWithdrawnUsd);$('refEarnings').textContent=money(p.referralEarningsUsd);
 $('profileRefEarn').textContent=money(p.referralEarningsUsd);$('homeMad').textContent='≈ '+Math.round(Number(p.balanceUsd||0)*state.rates.USD_MAD)+' MAD';
 db.collection('users').where('referredBy','==',state.user.uid).get().then(s=>{$('refCount').textContent=s.size;$('profileRefCount').textContent=s.size})
}
async function loadSettings(){try{const s=await db.collection('settings').doc('public').get();if(s.exists)state.rates.USD_MAD=Number(s.data()?.currency?.USD_MAD||10)}catch(e){}}
async function loadMaintenance(){
 try{const s=await db.collection('maintenance').doc('state').get(),d=s.exists?s.data():{};state.maintenance=d.enabled===true;
 $('maintenanceBanner').textContent=state.maintenance?'الموقع في وضع الصيانة':'';$('maintenanceTitle').textContent=d.title||'الموقع في الصيانة';$('maintenanceDescription').textContent=d.description||'سنعود قريبًا';$('maintenanceReturn').textContent=d.estimatedReturn||''
 }catch(e){state.maintenance=false}
}
async function loadAds(){
 let enabled={};try{const s=await db.collection('ads').get();s.forEach(d=>enabled[d.id]=d.data())}catch(e){}
 const keys=Object.keys(ads).filter(k=>enabled[k]?.enabled!==false);
 $('adGrid').innerHTML=keys.map(k=>`<article class="ad-card"><span class="badge ok">${esc(ads[k].provider)}</span><h3>${esc(ads[k].name)}</h3><div class="ad-frame" data-ad="${esc(k)}">${ads[k].type==='link'?`<a class="btn ghost" href="${ads[k].url}" target="_blank" rel="nofollow sponsored noopener">فتح العرض ↗</a>`:''}</div></article>`).join('')||'<div class="panel">لا توجد placements مفعلة.</div>';
 $('homeAdSlots').innerHTML=keys.slice(0,2).map(k=>`<div class="ad-mini">${esc(ads[k].name)} <span class="badge">مفعّل</span></div>`).join('')||'<div class="ad-mini">لا توجد placements.</div>';
 document.querySelectorAll('[data-ad]').forEach(el=>{const a=ads[el.dataset.ad];if(a.type==='script'){const t=document.createElement('div');t.innerHTML=a.html;[...t.children].forEach(n=>{const s=document.createElement('script');[...n.attributes].forEach(x=>s.setAttribute(x.name,x.value));s.text=n.textContent;el.appendChild(s)})}})
}
async function loadOrders(){
 const s=await db.collection('orders').where('userId','==',state.user.uid).limit(100).get().catch(()=>null);
 state.orders=s?s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)):[];
 renderOrders('all')
}
function renderOrders(filter){const a=filter==='all'?state.orders:state.orders.filter(x=>x.status===filter);$('ordersList').innerHTML=a.length?a.map(o=>`<div class="tx-item"><div><b>${esc(o.type||'طلب')}</b><small>${ts(o.createdAt)} • $${Number(o.amountUsd||0).toFixed(2)}</small></div><span class="badge ${o.status==='completed'?'ok':'warn'}">${esc(o.status||'pending')}</span></div>`).join(''):'<div class="list empty">لا توجد طلبات.</div>'}
async function loadRecent(){const s=await db.collection('transactions').where('userId','==',state.user.uid).limit(5).get().catch(()=>null);const a=s?s.docs.map(d=>d.data()):[];$('recentTx').innerHTML=a.length?a.map(t=>`<div class="tx-item"><div><b>${esc(t.type||'عملية')}</b><small>${ts(t.createdAt)}</small></div><b class="positive">+${money(t.amountUsd||0)}</b></div>`).join(''):'<div class="list empty">لا توجد عمليات.</div>'}
async function loadTransfers(){const s=await db.collection('transfers').where('senderId','==',state.user.uid).limit(50).get().catch(()=>null);const a=s?s.docs.map(d=>d.data()):[];$('transferHistory').innerHTML=a.length?a.map(t=>`<div class="tx-item"><div><b>${esc(t.receiverEmail||'مستلم')}</b><small>${ts(t.createdAt)}</small></div><span class="badge warn">${esc(t.status||'pending')}</span></div>`).join(''):'<div class="list empty">لا توجد تحويلات.</div>'}
async function loadTickets(){
 const s=await db.collection('tickets').where('userId','==',state.user.uid).limit(50).get().catch(()=>null),a=s?s.docs.map(d=>({id:d.id,...d.data()})):[];
 $('ticketList').innerHTML=a.length?a.map(t=>`<button class="ticket-item" data-ticket="${t.id}"><div><b>${esc(t.subject)}</b><small>${esc(t.status||'open')}</small></div>›</button>`).join(''):'<div class="list empty">لا توجد تذاكر.</div>';
 document.querySelectorAll('[data-ticket]').forEach(b=>b.onclick=()=>selectTicket(b.dataset.ticket))
}
async function selectTicket(id){state.selectedTicket=id;const s=await db.collection('tickets').doc(id).get();if(!s.exists)return; $('chatHeader').innerHTML='<h3>'+esc(s.data().subject)+'</h3>'; $('messageForm').classList.remove('hidden');renderMessages()}
async function renderMessages(){const s=await db.collection('messages').where('ticketId','==',state.selectedTicket).limit(100).get().catch(()=>null),now=Date.now();const a=s?s.docs.map(d=>d.data()).filter(m=>now-(m.createdAt?.toDate()?.getTime()||0)<86400000):[];$('chatMessages').innerHTML=a.length?a.sort((x,y)=>(x.createdAt?.seconds||0)-(y.createdAt?.seconds||0)).map(m=>`<div class="message ${m.senderId===state.user.uid?'mine':''}">${esc(m.text)}<small>${ts(m.createdAt)}</small></div>`).join(''):'<div class="list empty">لا توجد رسائل حديثة.</div>'}
async function createOrder(type,extra={}){return db.collection('orders').add({userId:state.user.uid,type,status:'pending',amountUsd:Number(extra.amountUsd||0),destination:extra.destination||'',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),meta:extra})}
async function claimBonus(){const b=$('claimBonusBtn');setBusy(b,true);try{const key=new Date().toISOString().slice(0,10),ref=db.collection('spins').doc(state.user.uid+'_'+key),s=await ref.get();if(s.exists)throw new Error('تم إنشاء طلب اليوم بالفعل.');await ref.set({userId:state.user.uid,kind:'daily_bonus',status:'pending',dateKey:key,createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast('تم إنشاء طلب المكافأة للمراجعة.');$('bonusHistory').innerHTML='<div class="tx-item"><div><b>المكافأة اليومية</b><small>قيد المراجعة</small></div><span class="badge warn">pending</span></div>';loadOrders()}catch(e){toast(e.message)}finally{setBusy(b,false)}}
function renderRewards(){$('rewardGrid').innerHTML=rewards.map(r=>`<article class="reward-card"><span class="badge">${r.min} USD+</span><h3>${esc(r.name)}</h3><p class="muted">طلب صرف/تسليم بعد المراجعة.</p><button class="btn primary wide" data-reward="${r.id}">طلب المكافأة</button></article>`).join('');document.querySelectorAll('[data-reward]').forEach(b=>b.onclick=()=>openReward(b.dataset.reward))}
function openReward(id){const r=rewards.find(x=>x.id===id);if(!r)return;if(Number(state.profile?.balanceUsd||0)<r.min)return toast('الرصيد أقل من الحد الأدنى.');$('modalTitle').textContent='طلب '+r.name;$('modalBody').innerHTML=`<form id="rewardForm" class="stack"><div class="field"><label>بيانات التسليم</label><input id="rewardDestination" maxlength="200" required></div><button class="btn primary">إنشاء الطلب</button></form>`;openModal();$('rewardForm').onsubmit=async e=>{e.preventDefault();try{await createOrder('reward_'+id,{rewardId:id,amountUsd:r.min,destination:$('rewardDestination').value.trim()});closeModal();toast('تم إنشاء الطلب.');loadOrders()}catch(x){toast(x.message)}}}
async function submitTransfer(e){e.preventDefault();const email=$('receiverInput').value.trim().toLowerCase(),amount=Number($('transferAmount').value);if(email===state.user.email.toLowerCase())return toast('لا يمكنك التحويل إلى نفسك.');const q=await db.collection('users').where('email','==',email).limit(1).get();if(q.empty)return toast('المستلم غير موجود.');await db.collection('transfers').add({senderId:state.user.uid,receiverId:q.docs[0].id,receiverEmail:email,amountUsd:amount,status:'pending',createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast('تم إنشاء طلب التحويل.');e.target.reset();loadTransfers()}
async function newTicket(){ $('modalTitle').textContent='تذكرة جديدة';$('modalBody').innerHTML='<form id="ticketForm" class="stack"><div class="field"><label>العنوان</label><input id="ticketSubject" required maxlength="100"></div><div class="field"><label>الرسالة</label><textarea id="ticketText" rows="5" required maxlength="1000"></textarea></div><button class="btn primary">إنشاء</button></form>';openModal();$('ticketForm').onsubmit=async e=>{e.preventDefault();const ref=await db.collection('tickets').add({userId:state.user.uid,subject:$('ticketSubject').value.trim(),status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await db.collection('messages').add({ticketId:ref.id,senderId:state.user.uid,text:$('ticketText').value.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp(),expiresAt:firebase.firestore.Timestamp.fromDate(new Date(Date.now()+86400000))});closeModal();loadTickets();selectTicket(ref.id);toast('تم إنشاء التذكرة.')}}
async function sendMessage(e){e.preventDefault();if(!state.selectedTicket)return;const text=$('messageInput').value.trim();if(!text)return;await db.collection('messages').add({ticketId:state.selectedTicket,senderId:state.user.uid,text,createdAt:firebase.firestore.FieldValue.serverTimestamp(),expiresAt:firebase.firestore.Timestamp.fromDate(new Date(Date.now()+86400000))});$('messageInput').value='';renderMessages()}
function go(section){if(state.maintenance&&section!=='maintenance')section='maintenance';document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===section));document.querySelectorAll('[data-section]').forEach(n=>n.classList.toggle('active',n.dataset.section===section));$('pageTitle').textContent=pageNames[section]||'Rewords';$('sidebar').classList.remove('open');if(section==='rewards')renderRewards();if(section==='orders')renderOrders('all')}
function openModal(){$('modalBackdrop').classList.remove('hidden')}function closeModal(){$('modalBackdrop').classList.add('hidden')}

$('authForm').onsubmit=async e=>{e.preventDefault();try{if(e.target.dataset.mode==='signup'){const p=$('passwordInput').value;if(p!==$('confirmInput').value)throw new Error('كلمتا المرور غير متطابقتين.');const c=await auth.createUserWithEmailAndPassword($('emailInput').value.trim(),p);await db.collection('users').doc(c.user.uid).set({uid:c.user.uid,name:$('nameInput').value.trim()||'مستخدم',email:c.user.email,referralCode:('RWD-'+c.user.uid.slice(0,8)).toUpperCase(),balanceUsd:0,totalEarnedUsd:0,totalWithdrawnUsd:0,referralEarningsUsd:0,accountStatus:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()})}else await auth.signInWithEmailAndPassword($('emailInput').value.trim(),$('passwordInput').value)}catch(x){toast(x.message)}};
$('toggleAuth').onclick=()=>{const s=$('authForm').dataset.mode==='signup'?'login':'signup';$('authForm').dataset.mode=s;const y=s==='signup';$('nameField').classList.toggle('hidden',!y);$('confirmField').classList.toggle('hidden',!y);$('refField').classList.toggle('hidden',!y);$('forgotBtn').classList.toggle('hidden',y);$('authTitle').textContent=y?'إنشاء حساب Rewords':'مرحبًا بك في Rewords';$('authSubmit').textContent=y?'إنشاء الحساب':'تسجيل الدخول'};
$('forgotBtn').onclick=async()=>{const e=$('emailInput').value.trim();if(!e)return toast('اكتب بريدك.');try{await auth.sendPasswordResetEmail(e);toast('تم إرسال رابط إعادة التعيين.')}catch(x){toast(x.message)}};
$('logoutBtn').onclick=()=>auth.signOut();$('claimBonusBtn').onclick=claimBonus;$('transferForm').onsubmit=submitTransfer;$('newTicketBtn').onclick=newTicket;$('messageForm').onsubmit=sendMessage;$('profileForm').onsubmit=async e=>{e.preventDefault();const name=$('profileNameInput').value.trim();await db.collection('users').doc(state.user.uid).update({name});state.profile.name=name;renderProfile();toast('تم الحفظ')};
$('modalClose').onclick=closeModal;$('modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal()};$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');
$('copyRefBtn').onclick=async()=>{const v=location.origin+location.pathname+'?ref='+state.profile.referralCode;try{await navigator.clipboard.writeText(v);toast('تم نسخ الرابط.')}catch(e){toast(v)}};
$('currencyToggle').onclick=()=>{const t=$('currencyToggle');t.textContent=t.textContent==='USD'?'MAD':'USD';renderProfile()};
document.addEventListener('click',e=>{const n=e.target.closest('[data-section]');if(n)go(n.dataset.section);const g=e.target.closest('[data-go]');if(g)go(g.dataset.go);const f=e.target.closest('[data-filter]');if(f){document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));f.classList.add('active');renderOrders(f.dataset.filter)}});
auth.onAuthStateChanged(async u=>{state.user=u;if(!u){$('authView').classList.remove('hidden');$('appView').classList.add('hidden');$('authForm').dataset.mode='login';return}$('authView').classList.add('hidden');$('appView').classList.remove('hidden');await ensureProfile();await loadSettings();await loadMaintenance();renderProfile();await Promise.all([loadAds(),loadOrders(),loadRecent(),loadTransfers(),loadTickets()]);go(state.maintenance?'maintenance':'home')});
renderRewards();