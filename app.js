/* ============================================================================
   REWORDS — app.js (FIXED FINAL BUILD)
   Clean syntax, real Firestore, reveal-safe rendering, no composite indexes.
============================================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain: "rewords-45ccf.firebaseapp.com",
  projectId: "rewords-45ccf",
  storageBucket: "rewords-45ccf.firebasestorage.app",
  messagingSenderId: "324257034049",
  appId: "1:324257034049:web:2e75279382793007683bc0",
  measurementId: "G-5LNDESBVST"
};
let app = null, db = null, auth = null;
try {
  app = firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore(app);
  auth = firebase.auth(app);
} catch (e) { console.error("Firebase init failed", e); }

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const increment = (n) => firebase.firestore.FieldValue.increment(n || 1);
const colRef = (p) => db.collection(p);

const State = {
  user: null, profile: null, wallet: null, settings: {},
  offers: [], games: [], surveys: [], rewards: [], providers: [],
  faqs: [], events: [], promos: [], posts: [], leaderboard: [],
  currentPage: 'home', catalogLoaded: false,
  lang: localStorage.getItem('rewords_lang') || 'ar',
  theme: localStorage.getItem('rewords_theme') || 'dark',
  selectedTopupPackage: null, selectedWdMethod: 'PayPal'
};

const COIN_RATE = 10000;
const DAILY_PLAN = [50, 100, 200, 350, 500, 750, 1000];
const WHEEL_SLICES = [50, 100, 200, 50, 500, 100, 250, 50];

/* ---------------- I18N ---------------- */
const I18N_EN = {
  'nav.home':'Home','nav.earn':'Earn','nav.offers':'Offers','nav.games':'Games','nav.surveys':'Surveys','nav.watch':'Watch Ads','nav.daily':'Daily','nav.rewards':'Rewards','nav.referral':'Referral','nav.leaderboard':'Leaderboard','nav.support':'Support','nav.tasks':'Tasks','nav.challenges':'Challenges','nav.streaks':'Streaks','nav.topup':'Top Up','nav.withdraw':'Withdraw','nav.transactions':'Transactions','nav.wallet':'Wallet','nav.notifications':'Notifications','nav.profile':'Profile','nav.security':'Security','nav.faq':'FAQ','nav.terms':'Terms','nav.privacy':'Privacy','nav.antifraud':'Status','nav.promo':'Promo Codes','nav.events':'Events','nav.blog':'News','nav.more':'More','nav.history':'History','nav.offlinerewards':'Offline Rewards',
  'auth.login':'Login','auth.logout':'Log Out','auth.signup':'Create Account','auth.needLogin':'Sign in to unlock all features and start earning.',
  'home.heroTitle':'Earn Coins Doing What You Love','home.heroSub':'Play games, complete offers, take surveys and watch rewarded ads.','home.startEarning':'Start Earning','home.dailyReward':'Daily Reward','home.browseRewards':'Browse Rewards','home.claimNow':'Claim Now','home.seeAll':'See All','home.popularRewards':'Popular Rewards','home.topOffers':'Top Earning Offers','home.topGames':'Top Earning Games','home.bestSurveys':'Best Surveys','home.topUsers':'Best Users Today','home.recentlyCompleted':'Recently Completed','home.faqTitle':'Frequently Asked Questions',
  'offers.none':'No offers available','offers.noneSub':'Open the Admin Panel → System Settings → Seed Sample Data.','games.none':'No games available','games.noneSub':'Seed data from the Admin Panel.','surveys.none':'No surveys available','rewards.none':'No rewards available','events.none':'No events right now','blog.none':'No articles yet','promo.none':'No promo codes',
  'popup.confirm':'Confirm','popup.cancel':'Cancel','popup.rewardTitle':'Reward Earned!','popup.awesome':'Awesome!',
  'err.fillAll':'Please fill in all fields','err.insufficient':'Insufficient coins','err.username':'Username must be at least 3 characters','err.password':'Password must be at least 8 characters',
  'ledger.signupBonus':'Welcome signup bonus','ledger.offerComplete':'Offer completed: {n}','ledger.surveyComplete':'Survey completed: {n}','ledger.rewardRedeem':'Reward redeemed: {n}','ledger.adReward':'Rewarded ad','ledger.adBonus':'Daily ad bonus','ledger.interstitial':'Interstitial ad reward','ledger.dailyClaim':'Daily claim · Day {n}','ledger.wheel':'Spin wheel bonus','ledger.scratch':'Scratch card bonus','ledger.mystery':'Mystery box reward','ledger.treasure':'Treasure chest reward','ledger.topup':'Game top-up: {g}','ledger.withdrawal':'Withdrawal','ledger.promo':'Promo code: {n}',
  'watch.capReached':'Daily ad cap reached. Come back tomorrow!','daily.claimed':'Claimed for today','daily.wheelSpun':'Wheel already spun today','daily.scratchDone':'Scratch card used for today','daily.mysteryDone':'Box opened for today','daily.treasureDone':'Treasure collected for today',
  'withdraw.tooSmall':'Minimum withdrawal is {n} coins','withdraw.pendingExists':'You already have a pending withdrawal.','withdraw.requested':'Withdrawal requested','withdraw.requestedSub':'We will review it within 24-72 hours.',
  'topup.success':'Top-up order placed!','topup.selectGameFirst':'Select a game first','topup.enterPlayerId':'Enter your player ID',
  'rewards.ordered':'Order placed! You will receive it within 24 hours.','rewards.confirm':'Confirm Redemption',
  'promo.invalid':'Invalid promo code','promo.used':'This code was already used.',
  'referral.copied':'Link copied to clipboard!','referral.self':'You cannot use your own code!','referral.already':'You already have a referrer.','referral.applied':'Referral code applied!',
  'support.sent':'Ticket sent','profile.saved':'Profile updated successfully!','transactions.none':'No transactions yet','transactions.noneSub':'Start earning to see your history.','notifications.none':'No notifications'
};
const I18N_AR = {
  'nav.home':'الرئيسية','nav.earn':'اكسب','nav.offers':'العروض','nav.games':'الألعاب','nav.surveys':'الاستبيانات','nav.watch':'شاهد الإعلانات','nav.daily':'المكافآت اليومية','nav.rewards':'المكافآت','nav.referral':'الإحالة','nav.leaderboard':'المتقدمون','nav.support':'الدعم','nav.tasks':'المهام','nav.challenges':'التحديات','nav.streaks':'التتابع','nav.topup':'شحن الألعاب','nav.withdraw':'السحب','nav.transactions':'المعاملات','nav.wallet':'المحفظة','nav.notifications':'الإشعارات','nav.profile':'الملف الشخصي','nav.security':'الأمان','nav.faq':'الأسئلة','nav.terms':'الشروط','nav.privacy':'الخصوصية','nav.antifraud':'الحالة','nav.promo':'أكواد الخصم','nav.events':'الفعاليات','nav.blog':'الأخبار','nav.more':'المزيد','nav.history':'السجل','nav.offlinerewards':'مكافآت دون اتصال',
  'auth.login':'تسجيل الدخول','auth.logout':'تسجيل الخروج','auth.signup':'إنشاء حساب','auth.needLogin':'سجّل الدخول لتفعيل جميع الميزات والبدء في الربح.',
  'home.heroTitle':'اربح عملات بفعل ما تحب','home.heroSub':'العب الألعاب، أكمل العروض، أجب عن الاستبيانات وشاهد الإعلانات المدفوعة.','home.startEarning':'ابدأ الربح','home.dailyReward':'المكافأة اليومية','home.browseRewards':'تصفح المكافآت','home.claimNow':'استلم الآن','home.seeAll':'عرض الكل','home.popularRewards':'المكافآت الشائعة','home.topOffers':'أعلى العروض ربحًا','home.topGames':'أعلى الألعاب ربحًا','home.bestSurveys':'أفضل الاستبيانات','home.topUsers':'أفضل المستخدمين اليوم','home.recentlyCompleted':'المكتمل حديثًا','home.faqTitle':'الأسئلة الشائعة',
  'offers.none':'لا توجد عروض متاحة','offers.noneSub':'افتح لوحة الأدمن → System Settings → Seed Sample Data.','games.none':'لا توجد ألعاب متاحة','games.noneSub':'أضف البيانات من لوحة الأدمن.','surveys.none':'لا توجد استبيانات متاحة','rewards.none':'لا توجد مكافآت متاحة','events.none':'لا توجد فعاليات حاليًا','blog.none':'لا توجد مقالات بعد','promo.none':'لا توجد أكواد',
  'popup.confirm':'تأكيد','popup.cancel':'إلغاء','popup.rewardTitle':'مكافأة ربحتها!','popup.awesome':'رائع!',
  'err.fillAll':'يرجى ملء جميع الحقول','err.insufficient':'عملات غير كافية','err.username':'اسم المستخدم 3 أحرف على الأقل','err.password':'كلمة المرور 8 أحرف على الأقل',
  'ledger.signupBonus':'مكافأة التسجيل الترحيبية','ledger.offerComplete':'اكتمل العرض: {n}','ledger.surveyComplete':'اكتمل الاستبيان: {n}','ledger.rewardRedeem':'تم استبدال: {n}','ledger.adReward':'إعلان مكافأة','ledger.adBonus':'مكافأة الإعلان اليومية','ledger.interstitial':'مكافأة إعلان بيني','ledger.dailyClaim':'مطالبة يومية · يوم {n}','ledger.wheel':'مكافأة العجلة','ledger.scratch':'مكافأة بطاقة الخدش','ledger.mystery':'مكافأة الصندوق الغامض','ledger.treasure':'مكافأة الكنز','ledger.topup':'شحن لعبة: {g}','ledger.withdrawal':'سحب','ledger.promo':'كود خصم: {n}',
  'watch.capReached':'تم الوصول للحد اليومي. عد غدًا!','daily.claimed':'تم الاستلام لليوم','daily.wheelSpun':'تم التدوير اليوم','daily.scratchDone':'استُخدمت البطاقة اليوم','daily.mysteryDone':'فُتح الصندوق اليوم','daily.treasureDone':'جُمع الكنز اليوم',
  'withdraw.tooSmall':'الحد الأدنى للسحب {n} عملة','withdraw.pendingExists':'لديك سحب قيد المراجعة بالفعل.','withdraw.requested':'تم طلب السحب','withdraw.requestedSub':'سنراجعه خلال 24-72 ساعة.',
  'topup.success':'تم تقديم طلب الشحن!','topup.selectGameFirst':'اختر اللعبة أولاً','topup.enterPlayerId':'أدخل معرف اللاعب',
  'rewards.ordered':'تم إرسال الطلب! ستصلك خلال 24 ساعة.','rewards.confirm':'تأكيد الاستبدال',
  'promo.invalid':'كود خاطئ','promo.used':'استُخدم هذا الكود مسبقًا.',
  'referral.copied':'تم نسخ الرابط!','referral.self':'لا يمكنك استخدام كودك الخاص!','referral.already':'لديك راعي بالفعل.','referral.applied':'تم تطبيق كود الإحالة!',
  'support.sent':'تم إرسال التذكرة','profile.saved':'تم تحديث الملف الشخصي!','transactions.none':'لا توجد معاملات بعد','transactions.noneSub':'ابدأ الربح لرؤية سجلك.','notifications.none':'لا توجد إشعارات'
};
let DICT = I18N_EN;
function t(key) { return DICT[key] || I18N_EN[key] || key; }
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(function (n) {
    const v = DICT[n.getAttribute('data-i18n')];
    if (v) n.textContent = v;
  });
  const html = document.documentElement;
  if (State.lang === 'ar') { html.setAttribute('lang', 'ar'); html.setAttribute('dir', 'rtl'); }
  else { html.setAttribute('lang', 'en'); html.setAttribute('dir', 'ltr'); }
  const lbl = el('langToggleLabel'); if (lbl) lbl.textContent = State.lang === 'ar' ? 'EN' : 'ع';
}
function setLang(l) { State.lang = l; DICT = l === 'ar' ? I18N_AR : I18N_EN; localStorage.setItem('rewords_lang', l); applyTranslations(); renderPage(State.currentPage); }
function setTheme(th) { State.theme = th; localStorage.setItem('rewords_theme', th); document.documentElement.setAttribute('data-theme', th); const b = el('themeToggle'); if (b) b.textContent = th === 'dark' ? '🌙' : '☀️'; }

/* ---------------- UTILS ---------------- */
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.from(document.querySelectorAll(s)); }
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtNum(n) { return (Number(n) || 0).toLocaleString('en-US'); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function uid() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase(); }
function timeAgo(ts) {
  if (!ts) return '';
  const d = (typeof ts.toDate === 'function') ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}
function toast(title, msg, type) {
  type = type || 'info';
  const wrap = el('toastWrap'); if (!wrap) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const box = document.createElement('div');
  box.className = 'toast ' + type;
  box.innerHTML = '<span class="toast-ico">' + icons[type] + '</span><div class="toast-body"><div class="toast-title">' + esc(title) + '</div><div class="toast-msg">' + esc(msg) + '</div></div><span class="toast-progress"></span>';
  wrap.appendChild(box);
  setTimeout(function () { box.classList.add('hide'); setTimeout(function () { box.remove(); }, 320); }, 4000);
}
let confirmCb = null;
function askConfirm(title, body, okLabel) {
  return new Promise(function (res) {
    el('confirmDialogTitle').textContent = title;
    el('confirmDialogBody').textContent = body;
    el('confirmDialogOk').textContent = okLabel || t('popup.confirm');
    el('confirmDialog').classList.add('open');
    confirmCb = res;
  });
}
function openModal(id) { const m = el(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = el(id); if (m) m.classList.remove('open'); }
function openGenericModal(title, html) { el('genericModalTitle').textContent = title; el('genericModalBody').innerHTML = html; openModal('genericModal'); }
function celebrate() {
  const colors = ['#6a11cb', '#2575fc', '#00d4ff', '#ff6a00', '#00e676', '#ffd700'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[i % colors.length];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDelay = (Math.random() * 0.7) + 's';
    document.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 5000);
  }
}
function showRewardPopup(amount, msg) {
  el('rewardPopupAmount').textContent = '+' + fmtNum(amount);
  el('rewardPopupMsg').textContent = msg || '';
  openModal('rewardPopup'); celebrate();
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; }
  catch (e) { return false; }
}
function revealFix() {
  document.querySelectorAll('.page.active .reveal, .reveal').forEach(function (x) { x.classList.add('in'); });
}
function emptyState(box, icon, title, sub) {
  if (typeof box === 'string') box = el(box);
  if (!box) return;
  box.innerHTML = '<div class="empty-state"><div class="es-ico">' + icon + '</div><div class="es-title">' + esc(title) + '</div><div class="es-sub">' + esc(sub || '') + '</div></div>';
}
function set(id, v) { const x = el(id); if (x) x.textContent = v; }

/* ---------------- FRAUD / DEVICE ---------------- */
function getDeviceFingerprint() {
  try {
    const raw = [navigator.userAgent, navigator.language, screen.width + 'x' + screen.height, new Date().getTimezoneOffset(), navigator.hardwareConcurrency].join('|');
    let h = 0;
    for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
    return (h >>> 0).toString(36);
  } catch (e) { return 'unknown'; }
}

/* ---------------- AUTH ---------------- */
function switchAuthPane(p) {
  el('loginForm').classList.toggle('hidden', p !== 'login');
  el('signupForm').classList.toggle('hidden', p !== 'signup');
  el('forgotForm').classList.toggle('hidden', p !== 'forgot');
  el('authTabLogin').classList.toggle('active', p === 'login');
  el('authTabSignup').classList.toggle('active', p === 'signup');
}
function initAuthUI() {
  el('authModalClose').addEventListener('click', function () { closeModal('authModal'); });
  el('authTabLogin').addEventListener('click', function () { switchAuthPane('login'); });
  el('authTabSignup').addEventListener('click', function () { switchAuthPane('signup'); });
  el('forgotPwLink').addEventListener('click', function (e) { e.preventDefault(); switchAuthPane('forgot'); });
  el('forgotBackBtn').addEventListener('click', function () { switchAuthPane('login'); });
  el('signupReferral').addEventListener('change', function () { el('referralCodeWrap').classList.toggle('hidden', !this.checked); });

  el('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = el('loginEmail').value.trim(), pw = el('loginPassword').value;
    if (!email || !pw) return toast(t('auth.login'), t('err.fillAll'), 'warning');
    try { await auth.signInWithEmailAndPassword(email, pw); closeModal('authModal'); toast('✅', t('auth.logout') === 'Log Out' ? 'Welcome back!' : 'مرحبًا بعودتك!', 'success'); }
    catch (err) { toast('❌', err.message, 'error'); }
  });

  el('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const un = el('signupUsername').value.trim(), em = el('signupEmail').value.trim(), pw = el('signupPassword').value;
    if (un.length < 3) return toast(t('auth.signup'), t('err.username'), 'warning');
    if (pw.length < 8) return toast(t('auth.signup'), t('err.password'), 'warning');
    try {
      const cred = await auth.createUserWithEmailAndPassword(em, pw);
      const refCode = el('signupReferral').checked ? el('signupReferralCode').value.trim().toUpperCase() : '';
      await createUserProfile(cred.user, un, refCode);
      closeModal('authModal');
      showRewardPopup(State.settings.signupBonus || 100, t('ledger.signupBonus'));
    } catch (err) { toast('❌', err.message, 'error'); }
  });

  el('forgotForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const em = el('forgotEmail').value.trim();
    if (!em) return;
    try { await auth.sendPasswordResetEmail(em); toast('📩', 'Reset link sent', 'success'); switchAuthPane('login'); }
    catch (err) { toast('❌', err.message, 'error'); }
  });

  el('googleLoginBtn').addEventListener('click', async function () {
    try {
      const prov = new firebase.auth.GoogleAuthProvider();
      const cred = await auth.signInWithPopup(prov);
      const doc = await colRef('users').doc(cred.user.uid).get();
      if (!doc.exists) await createUserProfile(cred.user, (cred.user.displayName || 'user').replace(/\s+/g, '_').slice(0, 20), '');
      closeModal('authModal');
    } catch (err) { toast('❌', err.message, 'error'); }
  });

  el('verifyContinueBtn').addEventListener('click', async function () {
    if (auth.currentUser) { await auth.currentUser.reload(); if (auth.currentUser.emailVerified) { closeModal('verifyModal'); closeModal('authModal'); } }
  });
  el('resendVerifyBtn').addEventListener('click', async function () {
    if (auth.currentUser) { await auth.currentUser.sendEmailVerification().catch(function () {}); toast('📧', 'Sent', 'success'); }
  });
}

async function createUserProfile(user, username, referralCode) {
  const myCode = uid().slice(0, 8);
  const data = {
    uid: user.uid, email: user.email || '', username: username, avatar: '', country: '',
    referralCode: myCode, referredBy: referralCode || '',
    createdAt: serverTimestamp(), ts: Date.now(), lastSeen: serverTimestamp(),
    xp: 0, level: 1, streak: 0, bestStreak: 0, lastClaimDate: '', claimedDays: [], streakFreezes: 0,
    status: 'active', verification: { email: !!user.emailVerified, phone: false, twoFa: false },
    fraudScore: 0, flags: [], devices: [getDeviceFingerprint()],
    offersCompleted: 0, surveysCompleted: 0, adsWatchedToday: 0, adsDate: todayKey(),
    wheelSpunDate: '', scratchDate: '', scratchReward: 0, mysteryDate: '', treasureDate: '', adBonusDate: '',
    usedPromos: [], lifetimeEarned: 0, lifetimeSpent: 0, totalWithdrawn: 0, referralEarned: 0, referralCount: 0
  };
  await colRef('users').doc(user.uid).set(data);
  State.profile = data;
  if (referralCode) {
    try {
      const refs = await colRef('users').where('referralCode', '==', referralCode).limit(1).get();
      if (!refs.empty) {
        await colRef('referrals').add({ referrerId: refs.docs[0].id, referredId: user.uid, referredName: username, code: referralCode, status: 'joined', ts: Date.now(), createdAt: serverTimestamp() });
        await colRef('users').doc(refs.docs[0].id).update({ referralCount: increment(1) });
      }
    } catch (e) { console.warn(e); }
  }
  await colRef('notifications').add({ uid: user.uid, type: 'welcome', title: '🎉 Welcome to Rewords!', body: 'Start earning coins now.', read: false, ts: Date.now(), createdAt: serverTimestamp() });
  await addLedger(user.uid, 'signup', t('ledger.signupBonus'), State.settings.signupBonus || 100, 'completed', 'SIGNUP');
  return data;
}

/* ---------------- LEDGER / WALLET ---------------- */
async function addLedger(uidVal, type, desc, coins, status, ref) {
  status = status || 'completed';
  const entry = { uid: uidVal, type: type, description: desc, coins: Math.round(coins), status: status, reference: ref || uid(), ts: Date.now(), createdAt: serverTimestamp() };
  const batch = db.batch();
  batch.set(colRef('ledger').doc(), entry);
  if (status === 'completed') {
    if (coins >= 0) batch.update(colRef('users').doc(uidVal), { lifetimeEarned: increment(coins) });
    else batch.update(colRef('users').doc(uidVal), { lifetimeSpent: increment(Math.abs(coins)) });
  }
  await batch.commit();
}
async function computeWallet(uidVal) {
  let coins = 0, pending = 0, locked = 0, earned = 0, spent = 0, withdrawn = 0;
  const list = [];
  const snap = await colRef('ledger').where('uid', '==', uidVal).limit(500).get();
  snap.forEach(function (d) { const e = d.data(); e.id = d.id; list.push(e); });
  list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  list.forEach(function (e) {
    const c = e.coins || 0;
    if (e.status === 'pending' && c > 0) pending += c;
    else if (e.status === 'locked' && c > 0) locked += c;
    else if (e.status === 'completed') {
      if (e.type === 'withdrawal' && c < 0) withdrawn += Math.abs(c);
      if (c > 0) { coins += c; earned += c; } else { coins += c; spent += Math.abs(c); }
    }
  });
  return { coins: Math.max(0, coins), pending: pending, locked: locked, earned: earned, spent: spent, withdrawn: withdrawn, list: list };
}
async function updateBalanceUI() {
  if (!State.user) return;
  try { State.wallet = await computeWallet(State.user.uid); } catch (e) { return; }
  const w = State.wallet, pf = State.profile || {};
  set('homeBalance', fmtNum(w.coins)); set('homePending', fmtNum(w.pending)); set('homeLifetime', fmtNum(w.earned));
  set('homeStreak', pf.streak || 0); set('navBalanceText', fmtNum(w.coins));
  const pill = el('navBalance'); if (pill) pill.style.display = 'flex';
  set('topupCoinBalance', fmtNum(w.coins)); set('wdAvailable', fmtNum(w.coins)); set('wdPending', fmtNum(w.pending));
  set('wtAvailable', fmtNum(w.coins)); set('wtPending', fmtNum(w.pending)); set('wtLocked', fmtNum(w.locked));
  set('wtLifetime', fmtNum(w.earned)); set('wtSpent', fmtNum(w.spent)); set('wtWithdrawn', fmtNum(w.withdrawn));
  set('pfBalance', fmtNum(w.coins)); set('pfLifetime', fmtNum(w.earned)); set('pfOffers', pf.offersCompleted || 0);
  set('refTotal', pf.referralCount || 0); set('refEarned', fmtNum(pf.referralEarned || 0)); set('refActive', pf.referralCount || 0);
}

/* ---------------- DATA ---------------- */
async function loadSettings() {
  try {
    const d = await db.collection('settings').doc('global').get();
    if (d.exists) State.settings = d.data();
  } catch (e) { }
  State.settings = Object.assign({ signupBonus: 100, minWithdraw: 10000, coinRate: 10000, adReward: 120, adDailyCap: 15, withdrawalFeePct: 1, referralPercent: 10, siteUrl: location.origin + location.pathname }, State.settings);
}
async function loadCatalog() {
  function get(n) { return colRef(n).get().then(function (s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }).catch(function () { return []; }); }
  const r = await Promise.all([get('offers'), get('games'), get('surveys'), get('rewards'), get('providers'), get('faqs'), get('events'), get('promos'), get('posts')]);
  State.offers = r[0].filter(function (o) { return o.active !== false; });
  State.games = r[1].filter(function (g) { return g.active !== false; });
  State.surveys = r[2].filter(function (s) { return s.active !== false; });
  State.rewards = r[3].filter(function (x) { return x.active !== false; });
  State.providers = r[4]; State.faqs = r[5]; State.events = r[6]; State.promos = r[7]; State.posts = r[8];
  State.catalogLoaded = true;
}

/* ---------------- NAVIGATION ---------------- */
const PAGES = ['home','earn','offers','games','surveys','watch','daily','tasks','challenges','checkin','streaks','referral','leaderboard','rewards','topup','withdraw','transactions','notifications','support','profile','security','faq','terms','privacy','antifraud','wallet','promo','events','blog','article','history','offlinerewards','more'];
function navigate(page) {
  State.currentPage = page;
  PAGES.forEach(function (p) { const s = el('page-' + p); if (s) s.classList.toggle('active', p === page); });
  $$('[data-nav]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === page); });
  const drawer = el('drawer'); if (drawer) drawer.classList.remove('open');
  window.scrollTo({ top: 0 });
  const needsAuth = ['wallet','withdraw','topup','transactions','notifications','profile','security','referral','history','checkin','streaks','challenges','tasks','daily','watch','offlinerewards'];
  if (needsAuth.indexOf(page) !== -1 && !State.user) { openModal('authModal'); return; }
  renderPage(page);
}
function renderPage(page) {
  const R = { home: renderHome, earn: renderEarn, offers: renderOffers, games: renderGames, surveys: renderSurveys, watch: renderWatch, daily: renderDaily, tasks: renderTasks, challenges: renderChallenges, checkin: renderCheckin, streaks: renderStreaks, referral: renderReferral, leaderboard: renderLeaderboard, rewards: renderRewards, topup: renderTopup, withdraw: renderWithdraw, transactions: renderTransactions, notifications: renderNotifications, support: renderSupport, profile: renderProfile, security: renderSecurity, faq: renderFaq, terms: renderTerms, privacy: renderPrivacy, antifraud: renderAntifraud, wallet: renderWallet, promo: renderPromo, events: renderEvents, blog: renderBlog, history: renderHistory, offlinerewards: renderOffline, more: renderMore, article: function () {} };
  if (R[page]) R[page]();
  revealFix();
}
function initNavigation() {
  document.addEventListener('click', function (e) {
    const n = e.target.closest('[data-nav]');
    if (n) { e.preventDefault(); navigate(n.getAttribute('data-nav')); }
  });
  const hb = el('hamburger'); if (hb) hb.addEventListener('click', function () { el('drawer').classList.add('open'); });
  const ds = el('drawerScrim'); if (ds) ds.addEventListener('click', function () { el('drawer').classList.remove('open'); });
  const tt = el('toTopBtn'); if (tt) tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

/* ---------------- CARD BUILDERS ---------------- */
function offerCardHtml(o) {
  return '<div class="card offer-card reveal in"><div class="offer-top"><div class="offer-logo" style="background:' + (o.color || 'var(--grad-primary)') + '">' + (o.icon || '🎯') + '</div><div><div class="offer-name">' + esc(o.title) + '</div><div class="text-xs text-muted">' + esc(o.provider || '') + '</div></div></div><div class="text-sm text-muted">' + esc(o.description || '') + '</div><div class="offer-reward">🪙 +' + fmtNum(o.payout || 0) + '</div><button class="btn btn-accent btn-sm btn-block" data-action="openOffer" data-id="' + o.id + '">→</button></div>';
}
function gameCardHtml(g) {
  const ms = (g.milestones || []).map(function (m) { return '<div class="milestone"><span class="ms-ico">' + (m.icon || '🎯') + '</span><div class="ms-body"><div class="ms-title">' + esc(m.label) + '</div></div><div class="ms-reward">+' + fmtNum(m.reward || 0) + '</div></div>'; }).join('');
  return '<div class="card game-card reveal in"><div class="game-cover" style="background:' + (g.color || 'var(--grad-primary)') + '">' + (g.icon || '🎮') + '</div><div class="font-bold">' + esc(g.title) + '</div><div class="text-xs text-muted">' + esc(g.platform || '') + ' · ' + esc(g.category || '') + '</div><div class="game-milestones">' + ms + '</div><button class="btn btn-primary btn-sm btn-block mt-2" data-action="openOffer" data-id="' + g.id + '" data-kind="game">🎮</button></div>';
}
function surveyCardHtml(s) {
  return '<div class="card survey-card reveal in"><div class="sv-icon">📋</div><div class="sv-title">' + esc(s.title) + '</div><div class="sv-meta"><span class="sv-chip">⏱️ ' + (s.minutes || 5) + '</span><span class="sv-chip">⭐ ' + (s.rating || '4.5') + '</span><span class="sv-chip coin-t">+' + fmtNum(s.reward || 0) + '</span></div><button class="btn btn-success btn-sm btn-block" data-action="openSurvey" data-id="' + s.id + '">▶</button></div>';
}
function rewardCardHtml(r) {
  return '<div class="card reward-card reveal in"><div class="rw-logo" style="background:' + (r.color || 'var(--grad-success)') + '">' + (r.icon || '🎁') + '</div><div class="rw-name">' + esc(r.title) + '</div><div class="rw-sub">' + esc(r.category || '') + '</div><div class="rw-from">🪙 ' + fmtNum(r.price || 0) + '</div><button class="btn btn-accent btn-sm btn-block" data-action="openReward" data-id="' + r.id + '">🎁</button></div>';
}
function txItemHtml(e) {
  const plus = (e.coins || 0) >= 0;
  return '<div class="ledger-item"><span class="lg-ico" style="background:' + (plus ? 'rgba(0,230,118,.14)' : 'rgba(255,61,113,.14)') + '">' + (plus ? '✅' : '💸') + '</span><div class="lg-body"><div class="lg-title">' + esc(e.description || '') + '</div><div class="lg-sub">' + esc(e.reference || '') + ' · ' + timeAgo(e.ts) + '</div></div><div class="lg-amount ' + (plus ? 'lg-plus' : 'lg-minus') + '">' + (plus ? '+' : '') + fmtNum(e.coins || 0) + '</div></div>';
}

/* ---------------- RENDERERS ---------------- */
async function renderHome() {
  if (!State.catalogLoaded) await loadCatalog();
  updateBalanceUI();
  renderAccountStatusStrip();
  const dcard = el('dailyCtaCard'); if (dcard) dcard.classList.toggle('hidden', !State.user);
  const top = State.offers.slice().sort(function (a, b) { return (b.payout || 0) - (a.payout || 0); }).slice(0, 4);
  el('topOffersGrid').innerHTML = top.length ? top.map(offerCardHtml).join('') : '';
  if (!top.length) emptyState('topOffersGrid', '🎯', t('offers.none'), t('offers.noneSub'));
  const tg = State.games.slice(0, 4);
  el('topGamesGrid').innerHTML = tg.length ? tg.map(gameCardHtml).join('') : '';
  if (!tg.length) emptyState('topGamesGrid', '🎮', t('games.none'), t('games.noneSub'));
  const pr = State.rewards.slice().sort(function (a, b) { return (a.price || 0) - (b.price || 0); }).slice(0, 4);
  el('popularRewardsGrid').innerHTML = pr.length ? pr.map(rewardCardHtml).join('') : '';
  if (!pr.length) emptyState('popularRewardsGrid', '🎁', t('rewards.none'), t('rewards.noneSub'));
  const bs = State.surveys.slice(0, 3);
  el('bestSurveysGrid').innerHTML = bs.length ? bs.map(surveyCardHtml).join('') : '';
  if (!bs.length) emptyState('bestSurveysGrid', '📋', t('surveys.none'), '');
  const ev = State.events.filter(function (x) { return x.status === 'active'; }).slice(0, 3);
  el('activeEventsGrid').innerHTML = ev.map(function (x) { return '<div class="card event-card reveal in"><div class="ev-badge">' + (x.icon || '🎉') + '</div><div class="ev-name">' + esc(x.title) + '</div><div class="ev-sub">' + esc(x.subtitle || '') + '</div></div>'; }).join('');
  const gs = el('gameShowcaseScroll');
  if (gs) gs.innerHTML = State.games.slice(0, 8).map(function (g) { return '<div class="card text-center" style="min-width:160px"><div style="font-size:2rem">' + (g.icon || '🎮') + '</div><div class="font-bold text-sm">' + esc(g.title) + '</div></div>'; }).join('');
  const fq = State.faqs.slice(0, 4);
  el('homeFaqList').innerHTML = fq.map(function (f) { return '<div class="faq-item"><button class="faq-q" data-action="toggleFaq">' + esc(f.q) + '<span class="faq-ico">＋</span></button><div class="faq-a"><div class="faq-a-inner">' + esc(f.a) + '</div></div></div>'; }).join('');
  renderLeaderList('topUsersList', 5);
  renderTicker();
}
function renderTicker() {
  const names = ['Sarah', 'Mohammed', 'Ahmed', 'Lina', 'Omar', 'Aya'];
  const tr = el('tickerTrack'); if (!tr) return;
  let html = '';
  for (let i = 0; i < 6; i++) html += '<span class="ticker-item">🎉 <b>' + names[i % names.length] + '</b> earned <span class="coin-t">' + fmtNum((Math.floor(Math.random() * 20) + 5) * 100) + '</span></span>';
  tr.innerHTML = html;
}
function renderAccountStatusStrip() {
  const strip = el('accountStatusStrip'); if (!strip) return;
  const pf = State.profile || {};
  if (!State.user) { strip.innerHTML = '<div class="alert alert-info"><span class="a-ico">💡</span><div class="a-body">' + esc(t('auth.needLogin')) + '</div><button class="btn btn-accent btn-sm" data-action="openAuth">' + t('auth.login') + '</button></div>'; return; }
  const chunks = [];
  if (!(pf.verification && pf.verification.email)) chunks.push('<span class="badge badge-info">📧 Verify email</span>');
  if ((pf.fraudScore || 0) > 60) chunks.push('<span class="badge badge-danger">🛡️ Flagged</span>');
  if (!chunks.length) chunks.push('<span class="badge badge-success">✅ Account healthy</span>');
  strip.innerHTML = '<div class="flex wrap gap-2">' + chunks.join('') + '</div>';
}
async function renderEarn() {
  if (!State.user) return;
  if (!State.catalogLoaded) await loadCatalog();
  updateBalanceUI();
  el('earnOffersGrid').innerHTML = State.offers.slice(0, 6).map(offerCardHtml).join('') || '';
  if (!State.offers.length) emptyState('earnOffersGrid', '🎯', t('offers.none'), t('offers.noneSub'));
  const al = el('adOpportunitiesList');
  if (al) al.innerHTML = '<div class="card ad-rew reveal in"><div class="play-ring">📺</div><div class="font-black">' + fmtNum(State.settings.adReward || 120) + '</div><button class="btn btn-accent btn-sm" data-action="watchAd">▶</button></div>';
}
async function renderOffers() {
  if (!State.catalogLoaded) await loadCatalog();
  el('offersGrid').innerHTML = State.offers.map(offerCardHtml).join('') || '';
  if (!State.offers.length) emptyState('offersGrid', '🎯', t('offers.none'), t('offers.noneSub'));
}
async function renderGames() {
  if (!State.catalogLoaded) await loadCatalog();
  el('gamesGrid').innerHTML = State.games.map(gameCardHtml).join('') || '';
  if (!State.games.length) emptyState('gamesGrid', '🎮', t('games.none'), t('games.noneSub'));
}
async function renderSurveys() {
  if (!State.catalogLoaded) await loadCatalog();
  el('surveysGrid').innerHTML = State.surveys.map(surveyCardHtml).join('') || '';
  if (!State.surveys.length) emptyState('surveysGrid', '📋', t('surveys.none'), '');
}
function renderWatch() {
  if (!State.user) return;
  const pf = State.profile || {};
  const cap = State.settings.adDailyCap || 15;
  const used = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  set('watchCount', used); set('watchRemaining', Math.max(0, cap - used)); set('watchEarnedToday', fmtNum(used * (State.settings.adReward || 120)));
  set('watchHint', '+' + fmtNum(State.settings.adReward || 120));
}
function renderDaily() {
  if (!State.user) return;
  const pf = State.profile || {};
  set('dailyStreakNum', pf.streak || 0);
  set('dailyBonusMult', 'x' + ((pf.streak || 0) >= 7 ? 2 : (pf.streak || 0) >= 4 ? 1.5 : 1));
  const grid = el('dailyGrid');
  if (grid) {
    grid.innerHTML = DAILY_PLAN.map(function (r, i) {
      const day = i + 1;
      const claimed = (pf.claimedDays || []).indexOf(day) !== -1;
      const today = day === (((pf.streak || 0) % 7) + 1);
      return '<div class="day-cell' + (claimed ? ' claimed' : '') + (today && !claimed ? ' today' : '') + '"><span class="day-num">' + day + '</span><span class="day-reward">+' + fmtNum(r) + '</span>' + (claimed ? '<span class="check-mark">✓</span>' : '') + '</div>';
    }).join('');
  }
  const btn = el('dailyClaimBtn');
  if (btn) { const done = pf.lastClaimDate === todayKey(); btn.disabled = done; }
  renderWheelState(); renderScratchState(); renderMysteryState(); renderTreasureState();
}
function renderWheelState() { const b = el('spinWheelBtn'); if (b) b.disabled = (State.profile && State.profile.wheelSpunDate) === todayKey(); }
function renderScratchState() { const used = (State.profile && State.profile.scratchDate) === todayKey(); const c = el('scratchCover'); if (c) c.style.display = used ? 'none' : ''; if (used) set('scratchResult', '+' + fmtNum((State.profile || {}).scratchReward || 0)); }
function renderMysteryState() { const used = (State.profile && State.profile.mysteryDate) === todayKey(); const b = el('mysteryBox'); if (b) b.textContent = used ? '🎉' : '🎁'; }
function renderTreasureState() { const used = (State.profile && State.profile.treasureDate) === todayKey(); const c = el('treasureChest'); if (c) c.textContent = used ? '💎' : '🏴‍☠️'; }
function renderTasks() {
  if (!State.user) return;
  const pf = State.profile || {};
  const ads = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  const items = [
    { ico: '✅', t: 'Log In', sub: '1/1', r: 10, p: 100, d: true },
    { ico: '📺', t: 'Watch 3 Ads', sub: ads + '/3', r: 150, p: Math.min(100, ads / 3 * 100), d: ads >= 3 },
    { ico: '🎯', t: 'Complete 1 Offer', sub: (pf.offersCompleted || 0) + '/1', r: 300, p: Math.min(100, (pf.offersCompleted || 0) * 100), d: (pf.offersCompleted || 0) >= 1 }
  ];
  el('tasksGrid').innerHTML = items.map(function (x) { return '<div class="ch-track-item' + (x.d ? ' done' : '') + '"><div class="ct-ico">' + (x.d ? '✅' : x.ico) + '</div><div class="ct-body"><div class="ct-title">' + x.t + '</div><div class="ct-sub">' + x.sub + '</div></div><div class="ct-reward">+' + fmtNum(x.r) + '</div><div class="ct-progress"><span style="width:' + x.p + '%"></span></div></div>'; }).join('');
}
function renderChallenges() {
  if (!State.user) return;
  const pf = State.profile || {};
  const mk = function (arr) { return arr.map(function (x) { return '<div class="ch-track-item' + (x.d ? ' done' : '') + '"><div class="ct-ico">' + (x.d ? '✅' : x.ico) + '</div><div class="ct-body"><div class="ct-title">' + x.t + '</div><div class="ct-sub">' + x.sub + '</div></div><div class="ct-reward">+' + fmtNum(x.r) + '</div><div class="ct-progress"><span style="width:' + x.p + '%"></span></div></div>'; }).join(''); };
  const ads = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  set2('dailyChallengesList', mk([{ ico: '📺', t: 'Watch 5 ads', sub: ads + '/5', r: 200, p: Math.min(100, ads / 5 * 100), d: ads >= 5 }, { ico: '🔥', t: 'Watch 10 ads', sub: ads + '/10', r: 400, p: Math.min(100, ads / 10 * 100), d: ads >= 10 }]));
  set2('weeklyChallengesList', mk([{ ico: '🎯', t: 'Complete 5 offers', sub: (pf.offersCompleted || 0) + '/5', r: 1500, p: Math.min(100, (pf.offersCompleted || 0) / 5 * 100), d: (pf.offersCompleted || 0) >= 5 }]));
  set2('monthlyChallengesList', mk([{ ico: '🏆', t: 'Complete 20 offers', sub: (pf.offersCompleted || 0) + '/20', r: 5000, p: Math.min(100, (pf.offersCompleted || 0) / 20 * 100), d: (pf.offersCompleted || 0) >= 20 }]));
  function set2(id, html) { const x = el(id); if (x) x.innerHTML = html; }
}
function renderCheckin() {
  if (!State.user) return;
  const pf = State.profile || {};
  set('checkinSub', (pf.streak || 0) + ' day streak');
  const b = el('checkinBtn'); if (b) b.disabled = pf.lastClaimDate === todayKey();
}
function renderStreaks() {
  if (!State.user) return;
  const pf = State.profile || {};
  set('streakCurrent', pf.streak || 0); set('streakBest', pf.bestStreak || 0); set('streakFreezes', pf.streakFreezes || 0);
  const cal = el('streakCalendar');
  if (cal) {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let html = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(function (h) { return '<span class="cal-head">' + h + '</span>'; }).join('');
    for (let i = 0; i < first; i++) html += '<span class="cal-day muted"></span>';
    for (let d = 1; d <= days; d++) html += '<span class="cal-day' + (d === now.getDate() ? ' today' : '') + '">' + d + '</span>';
    cal.innerHTML = html;
  }
}
function renderReferral() {
  if (!State.user) return;
  const pf = State.profile || {};
  const link = el('refLinkInput'); if (link) link.value = (State.settings.siteUrl || location.href) + '?ref=' + (pf.referralCode || '');
  const code = el('pfRefCode'); if (code) code.value = pf.referralCode || '';
  const ms = el('refMilestones');
  if (ms) {
    const rc = pf.referralCount || 0;
    const arr = [{ t: 'Friend Joins', r: 200, d: true }, { t: 'First Activity', r: 500, d: rc >= 1 }, { t: 'First Offer', r: 1000, d: rc >= 1 }, { t: '5 Referrals', r: 5000, d: rc >= 5 }];
    ms.innerHTML = arr.map(function (x) { return '<div class="milestone' + (x.d ? ' done' : '') + '"><span class="ms-ico">' + (x.d ? '✓' : '🎯') + '</span><div class="ms-body"><div class="ms-title">' + x.t + '</div></div><div class="ms-reward">+' + fmtNum(x.r) + '</div></div>'; }).join('');
  }
  renderRefList();
}
async function renderRefList() {
  const list = el('refFriendsList'); if (!list || !State.user) return;
  try {
    const snap = await colRef('referrals').where('referrerId', '==', State.user.uid).get();
    const items = [];
    snap.forEach(function (d) { const r = d.data(); items.push('<div class="ledger-item"><span class="lg-ico">👤</span><div class="lg-body"><div class="lg-title">' + esc(r.referredName || '') + '</div><div class="lg-sub">' + esc(r.status || '') + '</div></div></div>'); });
    list.innerHTML = items.join('') || '<div class="text-muted text-sm p-3">No referrals yet — share your link!</div>';
  } catch (e) { list.innerHTML = ''; }
}
async function renderLeaderList(id, limit) {
  const list = el(id); if (!list) return;
  try {
    const snap = await colRef('users').orderBy('lifetimeEarned', 'desc').limit(limit || 10).get();
    const rows = [];
    snap.forEach(function (d) { rows.push(d.data()); });
    State.leaderboard = rows;
    const medals = ['🥇', '🥈', ''];
    list.innerHTML = rows.length ? rows.map(function (u, i) { return '<div class="leader-item' + (State.user && u.uid === State.user.uid ? ' me' : '') + '"><div class="rank' + (i === 0 ? ' r1' : i === 1 ? ' r2' : i === 2 ? ' r3' : '') + '">' + (medals[i] || (i + 1)) + '</div><div class="avatar-sm">' + (u.username || '?').charAt(0).toUpperCase() + '</div><div class="flex-1"><div class="font-bold text-sm">' + esc(u.username || '') + '</div></div><div class="lb-xp">🪙 ' + fmtNum(u.lifetimeEarned || 0) + '</div></div>'; }).join('') : '<div class="text-muted text-sm p-3">No rankings yet.</div>';
  } catch (e) { list.innerHTML = '<div class="text-muted text-sm p-3">Leaderboard unavailable.</div>'; }
}
function renderLeaderboard() { renderLeaderList('leaderboardList', 10); }
function renderRewards() {
  if (!State.catalogLoaded) return;
  el('rewardsGrid').innerHTML = State.rewards.map(rewardCardHtml).join('') || '';
  if (!State.rewards.length) emptyState('rewardsGrid', '🎁', t('rewards.none'), t('offers.noneSub'));
}
function renderTopup() {
  if (!State.user) return;
  updateBalanceUI();
  const games = State.rewards.filter(function (r) { return r.type === 'topup' || r.category === 'Game Top-Up'; });
  const list = el('topupGameList');
  if (list) list.innerHTML = games.map(function (g) { return '<div class="reward-item" data-game="' + esc(g.title) + '" data-action="selectTopupGame"><div class="rw-ico" style="background:' + (g.color || 'var(--grad-primary)') + '">' + (g.icon || '🎮') + '</div><div class="rw-body"><div class="rw-name">' + esc(g.title) + '</div></div><span class="badge badge-success">⚡</span></div>'; }).join('') || '<div class="text-muted text-sm p-3">' + t('games.none') + '</div>';
  renderPackages(games[0]);
}
function renderPackages(game) {
  const grid = el('topupPackageGrid'); if (!grid) return;
  const pkgs = (game && game.packages && game.packages.length) ? game.packages : [{ label: '100 Units', cost: 4500 }, { label: '310 Units', cost: 12000 }, { label: '520 Units', cost: 18000 }];
  State.selectedTopupPackage = pkgs[0];
  grid.innerHTML = pkgs.map(function (p, i) { return '<div class="package' + (i === 0 ? ' selected' : '') + '" data-cost="' + (p.cost || 0) + '" data-label="' + esc(p.label) + '" data-action="selectPackage"><div class="pkg-name">' + esc(p.label) + '</div><div class="pkg-cost">' + fmtNum(p.cost || 0) + '</div></div>'; }).join('');
  set('topupSumCost', fmtNum(pkgs[0].cost || 0)); set('topupSumPackage', pkgs[0].label);
  if (game) set('topupSumGame', game.title);
}
function renderWithdraw() {
  if (!State.user) return;
  updateBalanceUI();
  set('wdMin', fmtNum(State.settings.minWithdraw || 10000));
  const list = el('wdMethodList');
  if (list && !list.children.length) {
    list.innerHTML = ['PayPal', 'Crypto', 'Bank', 'Gift Card'].map(function (m, i) { return '<div class="wd-method' + (i === 0 ? ' selected' : '') + '" data-method="' + m + '" data-action="selectWdMethod"><div class="wm-ico">' + ['🅿️','₿','🏦','🎁'][i] + '</div><div class="wm-name">' + m + '</div></div>'; }).join('');
  }
  updateWdSummary();
}
function updateWdSummary() {
  const amt = parseFloat((el('wdAmount') || {}).value) || 0;
  const rate = State.settings.coinRate || 10000;
  const usd = amt / rate, fee = usd * ((State.settings.withdrawalFeePct || 1) / 100);
  set('wdSumAmount', fmtNum(amt) + ' coins'); set('wdSumReceive', '$' + (usd - fee).toFixed(2)); set('wdSumFee', '$' + fee.toFixed(2)); set('wdSumMethod', State.selectedWdMethod);
}
async function renderTransactions() { if (!State.user) return; updateBalanceUI(); renderTxList('all'); }
async function renderTxList(type) {
  const list = el('transactionsList'); if (!list) return;
  if (!State.wallet) State.wallet = await computeWallet(State.user.uid);
  const items = State.wallet.list.filter(function (e) { return type === 'all' || e.type === type; });
  list.innerHTML = items.length ? items.map(txItemHtml).join('') : '';
  if (!items.length) emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub'));
}
async function renderNotifications() {
  if (!State.user) return;
  const list = el('notificationsList'); if (!list) return;
  try {
    const snap = await colRef('notifications').where('uid', '==', State.user.uid).limit(50).get();
    const items = [];
    snap.forEach(function (d) { items.push(d.data()); });
    items.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    list.innerHTML = items.length ? items.map(function (n) { return '<div class="notif-item' + (n.read ? '' : ' unread') + '" data-id="' + n.id + '" data-action="markNotif"><span class="nt-ico">🔔</span><div class="nt-body"><div class="nt-title">' + esc(n.title || '') + '</div><div class="nt-sub">' + esc(n.body || '') + '</div></div></div>'; }).join('') : '';
    if (!items.length) emptyState(list, '🔔', t('notifications.none'), '');
  } catch (e) { emptyState(list, '🔔', t('notifications.none'), ''); }
}
async function renderSupport() {
  if (!State.user) return;
  const list = el('myTicketsList'); if (!list) return;
  try {
    const snap = await colRef('tickets').where('uid', '==', State.user.uid).limit(10).get();
    const items = [];
    snap.forEach(function (d) { const tk = d.data(); items.push('<div class="ledger-item"><span class="lg-ico">🎫</span><div class="lg-body"><div class="lg-title">' + esc(tk.subject || '') + '</div><div class="lg-sub">' + esc(tk.status || 'open') + '</div></div></div>'); });
    list.innerHTML = items.join('') || '<div class="text-muted text-sm p-3">No tickets.</div>';
  } catch (e) { list.innerHTML = ''; }
}
function renderProfile() {
  if (!State.user) return;
  const pf = State.profile || {};
  updateBalanceUI();
  set('profileUsername', pf.username || '');
  set('profileMeta', (pf.country || '') + ' · ' + (pf.email || ''));
  set('profileLevelChip', 'Lv ' + (pf.level || 1));
  const ava = el('profileAvatar'); if (ava) ava.textContent = (pf.username || '?').charAt(0).toUpperCase();
  set('profileXpLabel', (pf.xp || 0) + ' / ' + ((pf.level || 1) * 500) + ' XP');
  const fill = el('profileXpFill'); if (fill) fill.style.width = Math.min(100, ((pf.xp || 0) / ((pf.level || 1) * 500)) * 100) + '%';
  const ach = el('achievementsList');
  if (ach) {
    const arr = [{ i: '🎮', t: 'First Offer', d: (pf.offersCompleted || 0) >= 1 }, { i: '📋', t: 'First Survey', d: (pf.surveysCompleted || 0) >= 1 }, { i: '💎', t: 'High Roller', d: (pf.lifetimeEarned || 0) >= 100000 }, { i: '🔥', t: 'Streak Master', d: (pf.streak || 0) >= 30 }];
    ach.innerHTML = arr.map(function (x) { return '<div class="ach-item' + (x.d ? ' done' : ' locked') + '"><div class="ach-ico">' + x.i + '</div><div class="font-bold text-sm">' + x.t + '</div></div>'; }).join('');
  }
  const bd = el('profileBadges');
  if (bd) bd.innerHTML = ['🆕 Newbie', '🎮 Gamer', '💎 Earner'].map(function (x) { return '<span class="badge badge-grad">' + x + '</span>'; }).join('');
  const rc = el('pfRefCode'); if (rc) rc.value = pf.referralCode || '';
}
function renderSecurity() {
  if (!State.user) return;
  const v = (State.profile || {}).verification || {};
  set('secEmailSub', v.email ? 'Verified' : 'Not verified');
  set('secPhoneSub', v.phone ? 'Verified' : 'Not verified');
  const lh = el('loginHistoryList');
  if (lh) lh.innerHTML = '<div class="log-row"><span class="log-ico">✅</span><span class="log-time">Today</span><span class="log-action">Login</span><span class="log-detail">This device</span></div>';
}
function renderFaq() {
  const list = el('faqList'); if (!list) return;
  const faqs = State.faqs.length ? State.faqs : [{ q: 'How do I earn coins?', a: 'Complete offers, games, surveys and ads.' }, { q: 'How do I withdraw?', a: 'Go to Withdraw page and choose a method.' }];
  list.innerHTML = faqs.map(function (f) { return '<div class="faq-item"><button class="faq-q" data-action="toggleFaq">' + esc(f.q) + '<span class="faq-ico">＋</span></button><div class="faq-a"><div class="faq-a-inner">' + esc(f.a) + '</div></div></div>'; }).join('');
}
function renderTerms() { const c = el('termsContent'); if (c) c.innerHTML = '<h2 class="font-black text-xl mb-3">📜 Terms of Service</h2><p class="text-sm">By using Rewords you agree to earn rewards through legitimate activities only. Fraudulent activity leads to bans and reward revocation. Withdrawals are subject to verification.</p>'; }
function renderPrivacy() { const c = el('privacyContent'); if (c) c.innerHTML = '<h2 class="font-black text-xl mb-3">🔒 Privacy Policy</h2><p class="text-sm">We collect account and device data to operate the platform and prevent fraud. We never sell your personal data.</p>'; }
function renderAntifraud() {
  const pf = State.profile || {};
  const g = el('fraudStatusGrid');
  if (g) g.innerHTML = '<div class="card stat-card"><div class="stat-value">' + (100 - (pf.fraudScore || 0)) + '%</div><div class="stat-label">Trust Score</div></div><div class="card stat-card"><div class="stat-value">Low</div><div class="stat-label">Risk Level</div></div><div class="card stat-card"><div class="stat-value">' + (pf.flags || []).length + '</div><div class="stat-label">Flags</div></div>';
  const l = el('fraudLogList');
  if (l) l.innerHTML = '<div class="log-row"><span class="log-ico">✅</span><span class="log-time">Today</span><span class="log-action">Security check passed</span><span class="log-detail">No anomalies</span></div>';
}
function renderWallet() { if (!State.user) return; updateBalanceUI(); renderWalletTab('all'); }
async function renderWalletTab(type) {
  const list = el('walletLedger'); if (!list) return;
  if (!State.wallet) State.wallet = await computeWallet(State.user.uid);
  const items = State.wallet.list.filter(function (e) {
    if (type === 'all') return true;
    if (type === 'pending') return e.status === 'pending';
    if (type === 'earned') return (e.coins || 0) > 0;
    if (type === 'spent') return (e.coins || 0) < 0;
    return true;
  });
  list.innerHTML = items.length ? items.map(txItemHtml).join('') : '';
  if (!items.length) emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub'));
}
function renderPromo() {
  const grid = el('promoCodesGrid'); if (!grid) return;
  grid.innerHTML = State.promos.map(function (p) { return '<div class="promo-card"><div class="pc-ico">🎟️</div><div class="pc-body"><div class="pc-code">' + esc(p.code) + '</div><div class="pc-sub">' + esc(p.title || '') + '</div></div><button class="btn btn-accent btn-sm" data-action="applyPromo" data-code="' + esc(p.code) + '">✓</button></div>'; }).join('') || '';
  if (!State.promos.length) emptyState(grid, '🎟️', t('promo.none'), '');
}
function renderEvents() {
  const card = function (ev) { return '<div class="card event-card reveal in"><div class="ev-badge">' + (ev.icon || '🎉') + '</div><div class="ev-name">' + esc(ev.title) + '</div><div class="ev-sub">' + esc(ev.subtitle || '') + '</div></div>'; };
  el('activeEventsGrid').innerHTML = State.events.filter(function (e) { return e.status === 'active'; }).map(card).join('') || '';
  el('upcomingEventsGrid').innerHTML = State.events.filter(function (e) { return e.status === 'upcoming'; }).map(card).join('') || '';
  el('pastEventsGrid').innerHTML = State.events.filter(function (e) { return e.status === 'ended'; }).map(card).join('') || '';
}
function renderBlog() {
  const grid = el('blogGrid'); if (!grid) return;
  grid.innerHTML = State.posts.map(function (p) { return '<div class="card blog-card reveal in"><div class="blog-thumb">' + (p.icon || '📰') + '</div><div class="blog-title">' + esc(p.title) + '</div><button class="btn btn-ghost btn-sm btn-block mt-2" data-action="openPost" data-id="' + p.id + '">📖</button></div>'; }).join('') || '';
  if (!State.posts.length) emptyState(grid, '📰', t('blog.none'), '');
}
function renderHistory() { if (!State.user) return; renderTxList('all'); }
function renderOffline() { if (!State.user) return; }
function renderMore() {
  const g = el('kbGrid');
  if (g) g.innerHTML = [['faq','❓'],['support','🎧'],['terms','📜'],['privacy','🔒'],['antifraud','🛡️'],['blog','📰'],['events','🎉'],['promo','🎟️']].map(function (x) { return '<button class="kb-item" data-nav="' + x[0] + '"><span class="kb-ico">' + x[1] + '</span><span class="kb-label">' + x[0] + '</span></button>'; }).join('');
}

/* ---------------- MODALS (offer/survey/reward) ---------------- */
function openOfferModal(id) {
  const o = State.offers.find(function (x) { return x.id === id; }) || State.games.find(function (x) { return x.id === id; });
  if (!o) return;
  const ms = (o.milestones || []).map(function (m) { return '<div class="milestone"><span class="ms-ico">' + (m.icon || '🎯') + '</span><div class="ms-body"><div class="ms-title">' + esc(m.label) + '</div></div><div class="ms-reward">+' + fmtNum(m.reward || 0) + '</div></div>'; }).join('') || '<div class="milestone"><span class="ms-ico">✅</span><div class="ms-body"><div class="ms-title">Complete</div></div><div class="ms-reward">+' + fmtNum(o.payout || 0) + '</div></div>';
  el('offerModalBody').innerHTML = '<div class="offer-detail-hero" style="background:' + (o.color || 'var(--grad-primary)') + '"><div class="odh-logo">' + (o.icon || '🎯') + '</div><div class="odh-name">' + esc(o.title) + '</div><div class="odh-provider">' + esc(o.provider || '') + '</div></div>' + ms + '<div class="flex gap-2 mt-3"><a class="btn btn-accent flex-1" href="' + (o.link || '#') + '" target="_blank" rel="noopener">🚀 Start</a><button class="btn btn-ghost flex-1" data-action="completeOffer" data-id="' + o.id + '">✅ Done</button></div>';
  el('offerModalTitle').textContent = o.title || '';
  openModal('offerModal');
}
function openSurveyModal(id) {
  const s = State.surveys.find(function (x) { return x.id === id; });
  if (!s) return;
  el('surveyModalBody').innerHTML = '<div class="text-center"><div class="survey-ico-lg">📋</div><div class="font-black text-lg">' + esc(s.title) + '</div><div class="survey-detail-meta"><span class="sv-chip">⏱️ ' + (s.minutes || 5) + '</span><span class="sv-chip coin-t">+' + fmtNum(s.reward || 0) + '</span></div><button class="btn btn-success btn-lg btn-block mt-3" data-action="completeSurvey" data-id="' + s.id + '">✅ Submit & Earn</button></div>';
  el('surveyModalTitle').textContent = s.title || '';
  openModal('surveyModal');
}
function openRewardModal(id) {
  const r = State.rewards.find(function (x) { return x.id === id; });
  if (!r) return;
  el('confirmModalBody').innerHTML = '<div class="text-center"><div class="rw-logo mx-auto" style="background:' + (r.color || 'var(--grad-success)') + '">' + (r.icon || '🎁') + '</div><div class="font-black text-lg mt-2">' + esc(r.title) + '</div><div class="kv-row mt-3"><span class="kv-label">Cost</span><span class="kv-value">' + fmtNum(r.price || 0) + ' 🪙</span></div><div class="kv-row"><span class="kv-label">Balance</span><span class="kv-value">' + fmtNum((State.wallet || { coins: 0 }).coins) + ' 🪙</span></div><button class="btn btn-accent btn-lg btn-block mt-3" data-action="redeemReward" data-id="' + r.id + '">🎁 Confirm</button></div>';
  el('confirmModalTitle').textContent = t('rewards.confirm');
  openModal('confirmModal');
}

/* ---------------- EARNING ACTIONS ---------------- */
async function completeOffer(id) {
  if (!State.user) return;
  closeModal('offerModal');
  const o = State.offers.find(function (x) { return x.id === id; }) || State.games.find(function (x) { return x.id === id; });
  if (!o) return;
  const coins = o.payout || 0;
  const ok = await askConfirm('Confirm', '+' + fmtNum(coins) + ' for "' + (o.title || '') + '"?');
  if (!ok) return;
  await addLedger(State.user.uid, 'offer', t('ledger.offerComplete').replace('{n}', o.title || ''), coins, 'completed', 'OFF-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ offersCompleted: increment(1), xp: increment(Math.max(5, Math.round(coins / 20))), lastSeen: serverTimestamp() }).catch(function () {});
  updateBalanceUI();
  showRewardPopup(coins, o.title || '');
}
async function completeSurvey(id) {
  if (!State.user) return;
  closeModal('surveyModal');
  const s = State.surveys.find(function (x) { return x.id === id; });
  if (!s) return;
  const coins = s.reward || 0;
  await addLedger(State.user.uid, 'survey', t('ledger.surveyComplete').replace('{n}', s.title || ''), coins, 'completed', 'SURV-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ surveysCompleted: increment(1), xp: increment(10) }).catch(function () {});
  updateBalanceUI();
  showRewardPopup(coins, s.title || '');
}
async function redeemReward(id) {
  if (!State.user) return;
  const r = State.rewards.find(function (x) { return x.id === id; });
  if (!r) return;
  const cost = r.price || 0;
  const w = State.wallet || { coins: 0 };
  if (w.coins < cost) { closeModal('confirmModal'); return toast('⚠️', t('err.insufficient'), 'warning'); }
  closeModal('confirmModal');
  await addLedger(State.user.uid, 'reward', t('ledger.rewardRedeem').replace('{n}', r.title || ''), -cost, 'completed', 'REW-' + uid().slice(0, 6));
  await colRef('orders').add({ uid: State.user.uid, type: 'reward', item: r.title, cost: cost, status: 'pending', ts: Date.now(), createdAt: serverTimestamp() }).catch(function () {});
  updateBalanceUI();
  toast('🎁', t('rewards.ordered'), 'success'); celebrate();
}
async function watchAd() {
  if (!State.user) return;
  const pf = State.profile || {};
  const cap = State.settings.adDailyCap || 15;
  const used = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  if (used >= cap) return toast('⚠️', t('watch.capReached'), 'warning');
  const btn = el('watchAdBtn'); if (btn) btn.disabled = true;
  const cd = el('watchCountdownValue');
  let n = 5;
  const iv = setInterval(async function () {
    if (cd) cd.textContent = n;
    if (n <= 0) {
      clearInterval(iv);
      if (btn) btn.disabled = false;
      const reward = State.settings.adReward || 120;
      await addLedger(State.user.uid, 'ad', t('ledger.adReward'), reward, 'completed', 'AD-' + uid().slice(0, 6));
      await colRef('users').doc(State.user.uid).update({ adsWatchedToday: used + 1, adsDate: todayKey(), xp: increment(2) }).catch(function () {});
      updateBalanceUI(); renderWatch();
      showRewardPopup(reward, t('ledger.adReward'));
    }
    n--;
  }, 1000);
}
async function claimDaily() {
  if (!State.user) return;
  const pf = State.profile || {};
  if (pf.lastClaimDate === todayKey()) return toast('ℹ️', t('daily.claimed'), 'info');
  let streak = pf.streak || 0;
  const yKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (pf.lastClaimDate !== yKey) streak = 0;
  streak++;
  const base = DAILY_PLAN[Math.min(6, (streak - 1) % 7)];
  const mult = streak >= 7 ? 2 : streak >= 4 ? 1.5 : 1;
  const reward = Math.round(base * mult);
  const claimedDays = (pf.claimedDays || []).slice();
  const day = ((streak - 1) % 7) + 1;
  if (claimedDays.indexOf(day) === -1) claimedDays.push(day);
  await addLedger(State.user.uid, 'daily', t('ledger.dailyClaim').replace('{n}', streak), reward, 'completed', 'DAY-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ streak: streak, bestStreak: Math.max(pf.bestStreak || 0, streak), lastClaimDate: todayKey(), claimedDays: claimedDays, xp: increment(5) }).catch(function () {});
  updateBalanceUI(); renderDaily(); renderCheckin();
  showRewardPopup(reward, 'Day ' + streak);
}
async function spinWheel() {
  if (!State.user) return;
  const pf = State.profile || {};
  if (pf.wheelSpunDate === todayKey()) return toast('ℹ️', t('daily.wheelSpun'), 'info');
  const wheel = el('spinWheel');
  const idx = Math.floor(Math.random() * WHEEL_SLICES.length);
  const reward = WHEEL_SLICES[idx];
  if (wheel) { wheel.style.transition = 'transform 4s cubic-bezier(.12,.7,.05,1)'; wheel.style.transform = 'rotate(' + (1440 + idx * 45) + 'deg)'; }
  setTimeout(async function () {
    await addLedger(State.user.uid, 'daily', t('ledger.wheel'), reward, 'completed', 'WHL-' + uid().slice(0, 6));
    await colRef('users').doc(State.user.uid).update({ wheelSpunDate: todayKey() }).catch(function () {});
    updateBalanceUI(); renderWheelState();
    showRewardPopup(reward, t('ledger.wheel'));
  }, 4200);
}
async function scratchCard() {
  if (!State.user) return;
  const pf = State.profile || {};
  if (pf.scratchDate === todayKey()) return toast('ℹ️', t('daily.scratchDone'), 'info');
  const reward = [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)];
  const c = el('scratchCover'); if (c) c.style.display = 'none';
  set('scratchResult', '+' + fmtNum(reward));
  await addLedger(State.user.uid, 'daily', t('ledger.scratch'), reward, 'completed', 'SCR-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ scratchDate: todayKey(), scratchReward: reward }).catch(function () {});
  updateBalanceUI(); showRewardPopup(reward, t('ledger.scratch'));
}
async function openMystery() {
  if (!State.user) return;
  const pf = State.profile || {};
  if (pf.mysteryDate === todayKey()) return toast('ℹ️', t('daily.mysteryDone'), 'info');
  const reward = [100, 200, 300, 500, 1000][Math.floor(Math.random() * 5)];
  const b = el('mysteryBox'); if (b) { b.textContent = '🎉'; b.classList.add('opened'); }
  await addLedger(State.user.uid, 'daily', t('ledger.mystery'), reward, 'completed', 'MYS-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ mysteryDate: todayKey() }).catch(function () {});
  updateBalanceUI(); showRewardPopup(reward, t('ledger.mystery'));
}
async function openTreasure() {
  if (!State.user) return;
  const pf = State.profile || {};
  if (pf.treasureDate === todayKey()) return toast('ℹ️', t('daily.treasureDone'), 'info');
  const reward = 250 + Math.floor(Math.random() * 3) * 250;
  const c = el('treasureChest'); if (c) { c.textContent = '💎'; c.classList.add('opened'); }
  await addLedger(State.user.uid, 'daily', t('ledger.treasure'), reward, 'completed', 'TRS-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ treasureDate: todayKey() }).catch(function () {});
  updateBalanceUI(); showRewardPopup(reward, t('ledger.treasure'));
}
async function dailyAdBonus() {
  if (!State.user) return;
  const pf = State.profile || {};
  if (pf.adBonusDate === todayKey()) return toast('ℹ️', 'Already claimed', 'info');
  await addLedger(State.user.uid, 'daily', t('ledger.adBonus'), 300, 'completed', 'ADB-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ adBonusDate: todayKey() }).catch(function () {});
  updateBalanceUI(); showRewardPopup(300, t('ledger.adBonus'));
}
async function interstitialReward() {
  if (!State.user) return;
  await addLedger(State.user.uid, 'ad', t('ledger.interstitial'), 200, 'completed', 'INT-' + uid().slice(0, 6));
  updateBalanceUI(); showRewardPopup(200, t('ledger.interstitial'));
}
async function confirmTopup() {
  if (!State.user) return;
  const game = document.querySelector('#topupGameList .reward-item.selected');
  const pkg = document.querySelector('#topupPackageGrid .package.selected');
  const pid = (el('topupPlayerId') || {}).value || '';
  if (!game) return toast('⚠️', t('topup.selectGameFirst'), 'warning');
  if (!pid.trim()) return toast('⚠️', t('topup.enterPlayerId'), 'warning');
  const cost = parseInt(pkg ? pkg.getAttribute('data-cost') : 4500) || 4500;
  if ((State.wallet || { coins: 0 }).coins < cost) return toast('⚠️', t('err.insufficient'), 'warning');
  await addLedger(State.user.uid, 'topup', t('ledger.topup').replace('{g}', game.getAttribute('data-game')), -cost, 'completed', 'TOP-' + uid().slice(0, 6));
  await colRef('orders').add({ uid: State.user.uid, type: 'topup', item: game.getAttribute('data-game'), package: pkg ? pkg.getAttribute('data-label') : '', playerId: pid.trim(), cost: cost, status: 'pending', ts: Date.now(), createdAt: serverTimestamp() }).catch(function () {});
  updateBalanceUI(); toast('⚡', t('topup.success'), 'success'); celebrate();
}
async function requestWithdrawal() {
  if (!State.user) return;
  const w = State.wallet || { coins: 0, pending: 0 };
  const min = State.settings.minWithdraw || 10000;
  const amount = parseFloat((el('wdAmount') || {}).value) || 0;
  if (amount < min) return toast('⚠️', t('withdraw.tooSmall').replace('{n}', fmtNum(min)), 'warning');
  if (amount > w.coins) return toast('⚠️', t('err.insufficient'), 'warning');
  if (w.pending > 0) return toast('⚠️', t('withdraw.pendingExists'), 'warning');
  await addLedger(State.user.uid, 'withdrawal', t('ledger.withdrawal') + ' · ' + State.selectedWdMethod, -amount, 'pending', 'WD-' + uid().slice(0, 6));
  await colRef('withdrawals').add({ uid: State.user.uid, amount: amount, method: State.selectedWdMethod, usd: amount / (State.settings.coinRate || 10000), status: 'pending', ts: Date.now(), createdAt: serverTimestamp() }).catch(function () {});
  updateBalanceUI(); toast('💵', t('withdraw.requested'), 'success');
  const a = el('wdAmount'); if (a) a.value = '';
  updateWdSummary();
}
async function applyPromo(code) {
  if (!State.user) return;
  const p = State.promos.find(function (x) { return String(x.code).toUpperCase() === String(code).toUpperCase(); });
  if (!p) return toast('❌', t('promo.invalid'), 'error');
  const pf = State.profile || {};
  const used = pf.usedPromos || [];
  if (used.indexOf(p.code) !== -1) return toast('⚠️', t('promo.used'), 'warning');
  used.push(p.code);
  await addLedger(State.user.uid, 'promo', t('ledger.promo').replace('{n}', p.code), p.reward || 0, 'completed', 'PRM-' + uid().slice(0, 6));
  await colRef('users').doc(State.user.uid).update({ usedPromos: used }).catch(function () {});
  updateBalanceUI(); showRewardPopup(p.reward || 0, p.code);
}
async function sendTicket() {
  if (!State.user) return;
  const s = (el('ticketSubject') || {}).value || '', m = (el('ticketMsg') || {}).value || '';
  if (!s || !m) return toast('⚠️', t('err.fillAll'), 'warning');
  await colRef('tickets').add({ uid: State.user.uid, username: (State.profile || {}).username || '', subject: s, message: m, category: (el('ticketCategory') || {}).value || 'General', status: 'open', ts: Date.now(), createdAt: serverTimestamp() });
  closeModal('genericModal'); toast('🎫', t('support.sent'), 'success');
}
async function markAllRead() {
  if (!State.user) return;
  const snap = await colRef('notifications').where('uid', '==', State.user.uid).where('read', '==', false).get().catch(function () { return null; });
  if (snap) { const b = db.batch(); snap.forEach(function (d) { b.update(d.ref, { read: true }); }); await b.commit().catch(function () {}); }
  renderNotifications();
}
async function clearNotifs() {
  if (!State.user) return;
  const snap = await colRef('notifications').where('uid', '==', State.user.uid).get().catch(function () { return null; });
  if (snap) { const b = db.batch(); snap.forEach(function (d) { b.delete(d.ref); }); await b.commit().catch(function () {}); }
  renderNotifications();
}
async function copyRefLink() { const i = el('refLinkInput'); if (i) await copyText(i.value); toast('🔗', t('referral.copied'), 'success'); }
async function applyRefCode() {
  if (!State.user) return;
  const code = ((el('refCodeInput') || {}).value || '').trim().toUpperCase();
  if (!code) return;
  const pf = State.profile || {};
  if (pf.referralCode === code) return toast('⚠️', t('referral.self'), 'warning');
  if (pf.referredBy) return toast('ℹ️', t('referral.already'), 'info');
  const snap = await colRef('users').where('referralCode', '==', code).limit(1).get();
  if (snap.empty) return toast('❌', t('promo.invalid'), 'error');
  await colRef('users').doc(State.user.uid).update({ referredBy: code });
  await colRef('referrals').add({ referrerId: snap.docs[0].id, referredId: State.user.uid, referredName: pf.username || '', code: code, status: 'joined', ts: Date.now(), createdAt: serverTimestamp() }).catch(function () {});
  toast('✅', t('referral.applied'), 'success');
}
function openProfileEdit() {
  if (!State.user) return;
  const pf = State.profile || {};
  const u = el('editUsername'); if (u) u.value = pf.username || '';
  openModal('profileEditModal');
}
async function saveProfile() {
  if (!State.user) return;
  const un = ((el('editUsername') || {}).value || '').trim();
  if (un.length < 3) return toast('⚠️', t('err.username'), 'warning');
  await colRef('users').doc(State.user.uid).update({ username: un, country: (el('editCountry') || {}).value || '' });
  State.profile.username = un;
  closeModal('profileEditModal'); toast('✅', t('profile.saved'), 'success'); renderProfile();
}
async function toggle2fa() {
  if (!State.user) return;
  const v = (State.profile || {}).verification || {};
  await colRef('users').doc(State.user.uid).update({ 'verification.twoFa': !v.twoFa }).catch(function () {});
  toast('🔐', '2FA ' + (!v.twoFa ? 'enabled' : 'disabled'), 'success');
}
async function logout() { await auth.signOut().catch(function () {}); navigate('home'); }
async function deleteAccount() {
  if (!State.user) return;
  const ok = await askConfirm('Delete Account', 'This permanently deletes your account and data.');
  if (!ok) return;
  await colRef('users').doc(State.user.uid).update({ status: 'deleted' }).catch(function () {});
  await auth.currentUser.delete().catch(function () {});
  logout();
}

/* ---------------- GLOBAL ACTIONS ---------------- */
function initGlobalActions() {
  document.addEventListener('click', function (e) {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.getAttribute('data-action');
    const id = a.getAttribute('data-id') || '';
    e.preventDefault();
    if (act === 'openAuth') openModal('authModal');
    else if (act === 'openOffer') openOfferModal(id);
    else if (act === 'openSurvey') openSurveyModal(id);
    else if (act === 'openReward') openRewardModal(id);
    else if (act === 'completeOffer') completeOffer(id);
    else if (act === 'completeSurvey') completeSurvey(id);
    else if (act === 'redeemReward') redeemReward(id);
    else if (act === 'watchAd') watchAd();
    else if (act === 'applyPromo') applyPromo(a.getAttribute('data-code'));
    else if (act === 'markNotif') { colRef('notifications').doc(a.getAttribute('data-id')).update({ read: true }).catch(function () {}); a.classList.remove('unread'); }
    else if (act === 'selectTopupGame') { $$('#topupGameList .reward-item').forEach(function (x) { x.classList.remove('selected'); }); a.classList.add('selected'); set('topupSumGame', a.getAttribute('data-game')); const g = State.rewards.find(function (r) { return r.title === a.getAttribute('data-game'); }); renderPackages(g); }
    else if (act === 'selectPackage') { $$('#topupPackageGrid .package').forEach(function (x) { x.classList.remove('selected'); }); a.classList.add('selected'); State.selectedTopupPackage = { cost: parseInt(a.getAttribute('data-cost')) || 0, label: a.getAttribute('data-label') }; set('topupSumCost', fmtNum(parseInt(a.getAttribute('data-cost')) || 0)); set('topupSumPackage', a.getAttribute('data-label')); }
    else if (act === 'selectWdMethod') { $$('#wdMethodList .wd-method').forEach(function (x) { x.classList.remove('selected'); }); a.classList.add('selected'); State.selectedWdMethod = a.getAttribute('data-method'); updateWdSummary(); }
    else if (act === 'toggleFaq') { const item = a.closest('.faq-item'); if (item) item.classList.toggle('open'); }
    else if (act === 'openTicket') { openGenericModal('New Ticket', '<div class="field"><label>Subject</label><input class="input" id="ticketSubject"></div><div class="field"><label>Category</label><select class="select" id="ticketCategory"><option>General</option><option>Withdrawal</option><option>Offer</option></select></div><div class="field"><label>Message</label><textarea class="textarea" id="ticketMsg" rows="4"></textarea></div><button class="btn btn-accent btn-block" id="ticketSubmitBtn">📨 Send</button>'); setTimeout(function () { const b = el('ticketSubmitBtn'); if (b) b.addEventListener('click', sendTicket); }, 80); }
    else if (act === 'openPost') { const p = State.posts.find(function (x) { return x.id === id; }); if (p) { const b = el('articleBody'); if (b) b.innerHTML = '<h2 class="font-black text-xl mb-2">' + esc(p.title) + '</h2><div class="rich-text">' + esc(p.content || p.title) + '</div>'; navigate('article'); } }
    else if (act === 'logout') logout();
  });
  $$('.modal-scrim').forEach(function (s) { s.addEventListener('click', function (e) { if (e.target === s) s.classList.remove('open'); }); });
  $$('.modal-close').forEach(function (b) { b.addEventListener('click', function () { const s = b.closest('.modal-scrim'); if (s) s.classList.remove('open'); }); });
  el('confirmDialogOk').addEventListener('click', function () { closeModal('confirmDialog'); if (confirmCb) { confirmCb(true); confirmCb = null; } });
  el('confirmDialogCancel').addEventListener('click', function () { closeModal('confirmDialog'); if (confirmCb) { confirmCb(false); confirmCb = null; } });
  el('rewardPopupOk').addEventListener('click', function () { closeModal('rewardPopup'); });
  const pa = el('promoApplyBtn'); if (pa) pa.addEventListener('click', function () { applyPromo(((el('promoInput') || {}).value || '').trim()); });
  const cs = el('chatSend'); if (cs) cs.addEventListener('click', sendChat);
  const mar = el('markAllReadBtn'); if (mar) mar.addEventListener('click', markAllRead);
  const cn = el('clearNotifBtn'); if (cn) cn.addEventListener('click', clearNotifs);
  const rcb = el('refCopyBtn'); if (rcb) rcb.addEventListener('click', copyRefLink);
  const prc = el('pfRefCopyBtn'); if (prc) prc.addEventListener('click', copyRefLink);
  const rsb = el('refShareBtn'); if (rsb) rsb.addEventListener('click', copyRefLink);
  const rab = el('refApplyBtn'); if (rab) rab.addEventListener('click', applyRefCode);
  const epb = el('editProfileBtn'); if (epb) epb.addEventListener('click', openProfileEdit);
  const spb = el('saveProfileBtn'); if (spb) spb.addEventListener('click', saveProfile);
  const pec = el('profileEditClose'); if (pec) pec.addEventListener('click', function () { closeModal('profileEditModal'); });
  const dab = el('deleteAccountBtn'); if (dab) dab.addEventListener('click', deleteAccount);
  const s2 = el('sec2faBtn'); if (s2) s2.addEventListener('click', toggle2fa);
  const sev = el('secVerifyEmailBtn'); if (sev) sev.addEventListener('click', function () { if (auth.currentUser) auth.currentUser.sendEmailVerification().catch(function () {}); toast('📧', 'Sent', 'success'); });
  const wa = el('wdAmount'); if (wa) wa.addEventListener('input', updateWdSummary);
  const wc = el('wdConfirmBtn'); if (wc) wc.addEventListener('click', requestWithdrawal);
  const tc = el('topupConfirmBtn'); if (tc) tc.addEventListener('click', confirmTopup);
  const wab = el('watchAdBtn'); if (wab) wab.addEventListener('click', watchAd);
  const dab2 = el('dailyAdBonusBtn'); if (dab2) dab2.addEventListener('click', dailyAdBonus);
  const ib = el('interstitialBtn'); if (ib) ib.addEventListener('click', interstitialReward);
  const dcb = el('dailyClaimBtn'); if (dcb) dcb.addEventListener('click', claimDaily);
  const cb = el('checkinBtn'); if (cb) cb.addEventListener('click', claimDaily);
  const swb = el('spinWheelBtn'); if (swb) swb.addEventListener('click', spinWheel);
  const sc = el('scratchCover'); if (sc) sc.addEventListener('click', scratchCard);
  const mb = el('mysteryBox'); if (mb) mb.addEventListener('click', openMystery);
  const tcb = el('treasureChest'); if (tcb) tcb.addEventListener('click', openTreasure);
  const lt = el('langToggle'); if (lt) lt.addEventListener('click', function () { setLang(State.lang === 'ar' ? 'en' : 'ar'); });
  const th = el('themeToggle'); if (th) th.addEventListener('click', function () { setTheme(State.theme === 'dark' ? 'light' : 'dark'); });
  const nb = el('notifBtn'); if (nb) nb.addEventListener('click', function () { navigate('notifications'); });
  const lb = el('loginBtn'); if (lb) lb.addEventListener('click', function () { if (State.user) logout(); else openModal('authModal'); });
  const lm = el('logoutBtnMobile'); if (lm) lm.addEventListener('click', logout);
  $$('#txTypeFilter .filter-chip').forEach(function (c) { c.addEventListener('click', function () { $$('#txTypeFilter .filter-chip').forEach(function (x) { x.classList.remove('active'); }); c.classList.add('active'); renderTxList(c.getAttribute('data-type')); }); });
  $$('#walletTabs .wallet-tab').forEach(function (c) { c.addEventListener('click', function () { $$('#walletTabs .wallet-tab').forEach(function (x) { x.classList.remove('active'); }); c.classList.add('active'); renderWalletTab(c.getAttribute('data-wtab') || 'all'); }); });
}
function sendChat() {
  const inp = el('chatInput'), body = el('chatBody');
  if (!inp || !body || !inp.value.trim()) return;
  body.innerHTML += '<div class="msg user">' + esc(inp.value.trim()) + '</div>';
  inp.value = '';
  setTimeout(function () { body.innerHTML += '<div class="msg admin">Thanks! A support agent will reply shortly.</div>'; body.scrollTop = body.scrollHeight; }, 900);
  body.scrollTop = body.scrollHeight;
}

/* ---------------- AUTH STATE + BOOT ---------------- */
function watchUser() {
  auth.onAuthStateChanged(function (user) {
    State.user = user;
    const lb = el('loginBtn');
    if (lb) lb.innerHTML = user ? '🚪 ' + t('auth.logout') : '🔓 ' + t('auth.login');
    if (!user) { State.profile = null; State.wallet = null; const p = el('navBalance'); if (p) p.style.display = 'none'; renderAccountStatusStrip(); renderPage(State.currentPage); return; }
    colRef('users').doc(user.uid).onSnapshot(function (snap) {
      if (snap.exists) {
        State.profile = Object.assign({}, snap.data(), { uid: user.uid });
        updateBalanceUI(); renderAccountStatusStrip();
        renderPage(State.currentPage);
      }
    }, function () {});
  });
}
function watchCatalog() {
  ['offers', 'games', 'surveys', 'rewards'].forEach(function (n) {
    colRef(n).onSnapshot(function (snap) {
      const arr = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (x) { return x.active !== false; });
      if (n === 'offers') State.offers = arr;
      if (n === 'games') State.games = arr;
      if (n === 'surveys') State.surveys = arr;
      if (n === 'rewards') State.rewards = arr;
      State.catalogLoaded = true;
      if (['home', 'earn', 'offers', 'games', 'surveys', 'rewards', 'topup'].indexOf(State.currentPage) !== -1) renderPage(State.currentPage);
    }, function () {});
  });
}
async function boot() {
  DICT = State.lang === 'ar' ? I18N_AR : I18N_EN;
  setTheme(State.theme);
  applyTranslations();
  initAuthUI();
  initNavigation();
  initGlobalActions();
  await loadSettings();
  await loadCatalog();
  watchUser();
  watchCatalog();
  navigate('home');
  revealFix();
  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');
  if (ref) { const i = el('signupReferralCode'); if (i) i.value = ref; const c = el('signupReferral'); if (c) c.checked = true; const w = el('referralCodeWrap'); if (w) w.classList.remove('hidden'); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
