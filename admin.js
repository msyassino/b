const firebaseConfig={
  apiKey:"AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain:"rewords-45ccf.firebaseapp.com",
  projectId:"rewords-45ccf",
  storageBucket:"rewords-45ccf.firebasestorage.app",
  messagingSenderId:"324257034049",
  appId:"1:324257034049:web:2e75279382793007683bc0",
  measurementId:"G-5LNDESBVST"
};

firebase.initializeApp(firebaseConfig);
const auth=firebase.auth();
const db=firebase.firestore();
const $=id=>document.getElementById(id);

function toast(message){
  const el=$('toast');
  if(!el)return;
  el.textContent=message;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}

async function isAdmin(user){
  const snap=await db.collection('users').doc(user.uid).get();
  if(!snap.exists)return false;
  return String(snap.data()?.role||'user').toLowerCase()==='admin';
}

auth.onAuthStateChanged(async user=>{
  if(!user){
    $('gate').classList.remove('hidden');
    $('dash').classList.add('hidden');
    return;
  }

  try{
    if(!await isAdmin(user)){
      toast('هذا الحساب ليس Admin.');
      await auth.signOut();
      return;
    }

    $('gate').classList.add('hidden');
    $('dash').classList.remove('hidden');
    await loadAll();
  }catch(error){
    console.error(error);
    toast('تعذر التحقق من صلاحيات الأدمن.');
    await auth.signOut();
  }
});

$('login').onsubmit=async event=>{
  event.preventDefault();
  try{
    await auth.signInWithEmailAndPassword($('email').value.trim(),$('pass').value);
  }catch(error){
    toast(error.message||'تعذر تسجيل الدخول.');
  }
};

$('logout').onclick=()=>auth.signOut();

document.querySelectorAll('[data-tab]').forEach(button=>{
  button.onclick=()=>{
    document.querySelectorAll('.tab').forEach(tab=>tab.classList.add('hidden'));
    $('tab-'+button.dataset.tab).classList.remove('hidden');
  };
});

async function loadAll(){
  await Promise.all([stats(),users(),orders(),ads(),settings(),maintenance()]);
}

async function stats(){
  const usersSnap=await db.collection('users').limit(500).get();
  const ordersSnap=await db.collection('orders').limit(500).get();
  $('stats').innerHTML=
    '<div class="stat-card"><span>المستخدمون</span><strong>'+usersSnap.size+ '</strong></div>'+
    '<div class="stat-card"><span>الطلبات</span><strong>'+ordersSnap.size+'</strong></div>';
}

async function users(){
  const snap=await db.collection('users').limit(500).get();
  $('usersTable').innerHTML=
    '<table class="table"><tr><th>المستخدم</th><th>الدور</th><th>الرصيد</th><th>الحالة</th></tr>'+
    snap.docs.map(doc=>{
      const x=doc.data();
      return '<tr><td>'+esc(x.name)+'<br>'+esc(x.email)+'</td><td>'+esc(x.role||'user')+'</td><td>'+Number(x.balanceUsd||0).toFixed(2)+'</td><td>'+esc(x.accountStatus||'active')+'</td></tr>';
    }).join('')+
    '</table>';
}

async function orders(){
  const snap=await db.collection('orders').limit(500).get();
  $('ordersTable').innerHTML=
    '<table class="table"><tr><th>النوع</th><th>المبلغ</th><th>الحالة</th></tr>'+
    snap.docs.map(doc=>{
      const x=doc.data();
      return '<tr><td>'+esc(x.type)+'</td><td>'+Number(x.amountUsd||0).toFixed(2)+'</td><td>'+esc(x.status)+'</td></tr>';
    }).join('')+
    '</table>';
}

const placements=[
  'adsterra-468',
  'adsterra-native',
  'adsterra-popunder',
  'adsterra-smartlink',
  'adsterra-socialbar',
  'monetag-multitag',
  'monetag-direct',
  'hilltop-popunder'
];

async function ads(){
  const snap=await db.collection('ads').get();
  const map={};
  snap.forEach(doc=>map[doc.id]=doc.data());

  $('adsTable').innerHTML=
    '<table class="table"><tr><th>Placement</th><th>الحالة</th><th>إجراء</th></tr>'+
    placements.map(id=>{
      const enabled=map[id]?.enabled!==false;
      return '<tr><td>'+esc(id)+'</td><td>'+(enabled?'مفعّل':'متوقف')+'</td><td><button class="btn ghost" data-ad="'+esc(id)+'">'+(enabled?'إيقاف':'تفعيل')+'</button></td></tr>';
    }).join('')+
    '</table>';

  document.querySelectorAll('[data-ad]').forEach(button=>{
    button.onclick=async()=>{
      const id=button.dataset.ad;
      await db.collection('ads').doc(id).set({
        enabled:map[id]?.enabled===false,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      await ads();
    };
  });
}

async function settings(){
  const snap=await db.collection('settings').doc('public').get();
  $('usdMad').value=snap.exists?Number(snap.data()?.currency?.USD_MAD||10):10;
}

$('settingsForm').onsubmit=async event=>{
  event.preventDefault();
  try{
    await db.collection('settings').doc('public').set({
      currency:{USD_MAD:Number($('usdMad').value)},
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    toast('تم الحفظ');
  }catch(error){
    console.error(error);
    toast('تعذر حفظ الإعدادات.');
  }
};

async function maintenance(){
  const snap=await db.collection('maintenance').doc('state').get();
  const data=snap.exists?snap.data():{};
  $('maintEnabled').checked=!!data.enabled;
  $('maintTitle').value=data.title||'';
  $('maintDescription').value=data.description||'';
  $('maintReturn').value=data.estimatedReturn||'';
}

$('maintForm').onsubmit=async event=>{
  event.preventDefault();
  try{
    await db.collection('maintenance').doc('state').set({
      enabled:$('maintEnabled').checked,
      title:$('maintTitle').value,
      description:$('maintDescription').value,
      estimatedReturn:$('maintReturn').value,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    toast('تم الحفظ');
  }catch(error){
    console.error(error);
    toast('تعذر حفظ وضع الصيانة.');
  }
};

async function exportCol(collectionName){
  const snap=await db.collection(collectionName).limit(5000).get();
  const data=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
  const blob=new Blob([
    JSON.stringify(data,(key,value)=>value?.toDate?value.toDate().toISOString():value,2)
  ],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='rewords-'+collectionName+'.json';
  link.click();
  URL.revokeObjectURL(url);
}

$('exportUsers').onclick=()=>exportCol('users');
$('exportOrders').onclick=()=>exportCol('orders');

function esc(value){
  return String(value??'').replace(/[&<>"']/g,char=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]
  ));
}
