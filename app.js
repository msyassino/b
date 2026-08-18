
/* ============================================
   ReWords - Complete Application JavaScript
   ============================================ */

/* --- Firebase Configuration --- */
const firebaseConfig = {
  apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain: "rewords-45ccf.firebaseapp.com",
  projectId: "rewords-45ccf",
  storageBucket: "rewords-45ccf.appspot.com",
  messagingSenderId: "324257034049",
  appId: "1:324257034049:web:2e75279382793007683bc0"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* --- Global State --- */
let currentUser = null;
let userData = null;
let allOffers = [];
let currentPage = 'home';
let currentAdminTab = 'adash';
let charts = {};
const SITE = {
  coinRate: 10000,
  minWithdraw: 5000,
  withdrawFee: 0.05,
  referralPct: 0.15,
  referralBonus: 500,
  firstOfferBonus: 200,
  maxWithdrawDay: 3,
  maxOffersDay: 50,
  riskThreshold: 70
};

/* --- Default Data --- */
const PROVIDERS = [
  { id: 'offerwall1', name: 'AdGate Media', icon: 'fas fa-bolt', color: '#3b82f6', offers: 24, rate: 4.2 },
  { id: 'offerwall2', name: 'Adscend', icon: 'fas fa-layer-group', color: '#a855f7', offers: 18, rate: 3.8 },
  { id: 'offerwall3', name: 'OfferToro', icon: 'fas fa-fire', color: '#f97316', offers: 31, rate: 4.5 },
  { id: 'offerwall4', name: 'WallAds', icon: 'fas fa-shield-alt', color: '#00e676', offers: 15, rate: 3.5 },
  { id: 'offerwall5', name: 'MM Wall', icon: 'fas fa-cubes', color: '#06b6d4', offers: 22, rate: 4.0 },
  { id: 'offerwall6', name: 'Lootably', icon: 'fas fa-gem', color: '#ec4899', offers: 12, rate: 3.2 }
];

const TOPUP_GAMES = [
  { id: 'pubg', name: 'PUBG Mobile', icon: 'fas fa-crosshairs', color: '#f97316', currency: 'UC' },
  { id: 'freefire', name: 'Free Fire', icon: 'fas fa-fire', color: '#ff4757', currency: 'Diamonds' },
  { id: 'codm', name: 'Call of Duty M', icon: 'fas fa-gamepad', color: '#3b82f6', currency: 'CP' },
  { id: 'mlbb', name: 'Mobile Legends', icon: 'fas fa-chess-knight', color: '#a855f7', currency: 'Diamonds' },
  { id: 'fortnite', name: 'Fortnite', icon: 'fas fa-parachute-box', color: '#06b6d4', currency: 'V-Bucks' },
  { id: 'roblox', name: 'Roblox', icon: 'fas fa-cube', color: '#00e676', currency: 'Robux' },
  { id: 'minecraft', name: 'Minecraft', icon: 'fas fa-cubes', color: '#f97316', currency: 'Coins' },
  { id: 'genshin', name: 'Genshin Impact', icon: 'fas fa-star', color: '#ffc107', currency: 'Genesis' },
  { id: 'valorant', name: 'Valorant', icon: 'fas fa-crosshairs', color: '#ff4757', currency: 'VP' },
  { id: 'apex', name: 'Apex Legends', icon: 'fas fa-helmet-safety', color: '#3b82f6', currency: 'Coins' },
  { id: 'steam', name: 'Steam', icon: 'fab fa-steam', color: '#1b2838', currency: 'Wallet' },
  { id: 'psn', name: 'PlayStation', icon: 'fab fa-playstation', color: '#003087', currency: 'Wallet' }
];

const DEFAULT_OFFERS = [
  { id: 'o1', name: 'Rise of Kingdoms', desc: 'Download and reach City Hall 10', provider: 'OfferToro', reward: 15000, revenue: 3.0, category: 'games', country: 'ALL', time: '2-3 days', icon: 'fas fa-chess-rook', milestones: [{name:'Install',coins:500},{name:'CH 5',coins:2000},{name:'CH 10',coins:12500}] },
  { id: 'o2', name: 'Coin Master', desc: 'Install and spin 10 times', provider: 'AdGate Media', reward: 8000, revenue: 1.6, category: 'games', country: 'ALL', time: '1 day', icon: 'fas fa-coins', milestones: [{name:'Install',coins:500},{name:'5 Spins',coins:3000},{name:'10 Spins',coins:4500}] },
  { id: 'o3', name: 'State of Survival', desc: reach HQ 10', provider: 'Adscend', reward: 20000, revenue: 4.0, category: 'games', country: 'US', time: '3-5 days', icon: 'fas fa-skull-crossbones', milestones: [{name:'Install',coins:1000},{name:'HQ 5',coins:5000},{name:'HQ 10',coins:14000}] },
  { id: 'o4', name: 'Survey: Shopping Habits', desc: '15-min survey about your preferences', provider: 'MM Wall', reward: 3000, revenue: 0.6, category: 'surveys', country: 'US', time: '15 min', icon: 'fas fa-poll' },
  { id: 'o5', name: 'Survey: Tech Products', desc: '20-min survey on tech usage', provider: 'Lootably', reward: 5000, revenue: 1.0, category: 'surveys', country: 'ALL', time: '20 min', icon: 'fas fa-laptop' },
  { id: 'o6', name: 'Merge Gardens', desc: 'Install and reach level 20', provider: 'OfferToro', reward: 12000, revenue: 2.4, category: 'games', country: 'ALL', time: '2-3 days', icon: 'fas fa-seedling', milestones: [{name:'Install',coins:500},{name:'Lv 10',coins:4000},{name:'Lv 20',coins:7500}] },
  { id: 'o7', name: 'Sign Up: Fitness App', desc: 'Register and verify email', provider: 'WallAds', reward: 2000, revenue: 0.4, category: 'tasks', country: 'ALL', time: '5 min', icon: 'fas fa-dumbbell' },
  { id: 'o8', name: 'Travel Survey', desc: 'Answer travel preference questions', provider: 'AdGate Media', reward: 4000, revenue: 0.8, category: 'surveys', country: 'GB', time: '10 min', icon: 'fas fa-plane' },
  { id: 'o9', name: 'Yahtzee with Buddies', desc: 'Install and play 5 games', provider: 'Adscend', reward: 6000, revenue: 1.2, category: 'games', country: 'ALL', time: '1 day', icon: 'fas fa-dice', milestones: [{name:'Install',coins:500},{name:'3 Games',coins:2000},{name:'5 Games',coins:3500}] },
  { id: 'o10', name: 'Credit Score Survey', desc: 'Share credit score info', provider: 'MM Wall', reward: 7500, revenue: 1.5, category: 'surveys', country: 'US', time: '25 min', icon: 'fas fa-chart-line' },
  { id: 'o11', name: 'Norton VPN Install', desc: 'Install Norton VPN trial', provider: 'Lootably', reward: 10000, revenue: 2.0, category: 'tasks', country: 'US', time: '10 min', icon: 'fas fa-shield-alt' },
  { id: 'o12', name: 'Bingo Blitz', desc: 'Install and reach level 15', provider: 'OfferToro', reward: 9000, revenue: 1.8, category: 'games', country: 'ALL', time: '2 days', icon: 'fas fa-grip-lines', milestones: [{name:'Install',coins:500},{name:'Lv 5',coins:2500},{name:'Lv 15',coins:6000}] }
];

const DEFAULT_FAQS = [
  { q: 'How do I earn coins?', a: 'Complete offers, play games, take surveys, watch ads, and check in daily. Each activity rewards coins.' },
  { q: 'What is the coin rate?', a: '10,000 Coins = $1.00 USD. Coins can be redeemed for PayPal, crypto, game top-ups, and gift cards.' },
  { q: 'What is the minimum withdrawal?', a: 'The minimum withdrawal is 5,000 coins ($0.50). There is a 5% processing fee.' },
  { q: 'How long do withdrawals take?', a: 'Most withdrawals are processed within 1-24 hours for verified accounts.' },
  { q: 'How do referrals work?', a: 'Share your referral link. You earn 15% of everything your referrals earn, plus bonuses at milestones.' },
  { q: 'Why was my offer not credited?', a: 'Offers can take 1-48 hours to credit. Make sure you followed all steps. Contact support if not credited after 48 hours.' },
  { q: 'Can I use VPN?', a: 'No. VPN usage is strictly prohibited and will result in account suspension.' },
  { q: 'How do I contact support?', a: 'Go to the Support page and submit a ticket. We respond within 24 hours.' }
];

/* --- Utility Functions --- */
function toast(msg, type = 'success') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle') + '"></i> ' + msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatCoins(n) { return Number(n).toLocaleString(); }
function formatUSD(n) { return '$' + (n / SITE.coinRate).toFixed(2); }
function timeAgo(d) {
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
function genRefCode() { return 'RW' + Math.random().toString(36).substr(2, 6).toUpperCase(); }

/* --- Auth System --- */
function authTab(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.at').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.at')[tab === 'login' ? 0 : 1].classList.add('active');
}

async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  try {
    const email = document.getElementById('lEmail').value;
    const pass = document.getElementById('lPass').value;
    await auth.signInWithEmailAndPassword(email, pass);
    closeModal('authModal');
    toast('Welcome back!');
  } catch (err) {
    toast(err.message, 'error');
  }
  btn.disabled = false; btn.innerHTML = 'Sign In <i class="fas fa-arrow-right"></i>';
}

async function doRegister(e) {
  e.preventDefault();
  if (!document.getElementById('rTerms').checked) return toast('Accept terms first', 'error');
  const btn = document.getElementById('regBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  try {
    const cred = await auth.createUserWithEmailAndPassword(
      document.getElementById('rEmail').value,
      document.getElementById('rPass').value
    );
    const uid = cred.user.uid;
    const refCode = genRefCode();
    const referredBy = document.getElementById('rRef').value || null;
    await db.collection('users').doc(uid).set({
      username: document.getElementById('rUser').value,
      email: document.getElementById('rEmail').value,
      country: document.getElementById('rCountry').value,
      coins: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalWithdrawn: 0,
      pendingWithdraw: 0,
      offersCompleted: 0,
      level: 1,
      xp: 0,
      xpNeeded: 1000,
      streak: 0,
      lastCheckin: null,
      streakFreezes: 2,
      referralCode: refCode,
      referredBy: referredBy,
      referralCount: 0,
      referralEarned: 0,
      admin: false,
      role: 'user',
      status: 'active',
      riskScore: 0,
      flags: [],
      joined: Date.now(),
      lastLogin: Date.now(),
      ip: '',
      device: navigator.userAgent,
      twoFA: false,
      emailVerified: false,
      badges: ['newcomer'],
      notifications: [],
      settings: { emailNotifs: true, offerAlerts: true, marketing: false }
    });
    if (referredBy) {
      const q = await db.collection('users').where('referralCode', '==', referredBy).get();
      if (!q.empty) {
        const ref = q.docs[0];
        await ref.ref.update({ referralCount: firebase.firestore.FieldValue.increment(1) });
        await db.collection('transactions').add({
          uid: ref.id, type: 'bonus', amount: SITE.referralBonus,
          desc: 'Referral signup bonus', ts: Date.now()
        });
        await ref.ref.update({ coins: firebase.firestore.FieldValue.increment(SITE.referralBonus) });
      }
    }
    closeModal('authModal');
    toast('Account created! Welcome!');
  } catch (err) {
    toast(err.message, 'error');
  }
  btn.disabled = false; btn.innerHTML = 'Create Account <i class="fas fa-rocket"></i>';
}

async function googleLogin() {
  try {
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    closeModal('authModal');
    toast('Welcome!');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') toast(err.message, 'error');
  }
}

async function githubLogin() {
  try {
    await auth.signInWithPopup(new firebase.auth.GithubAuthProvider());
    closeModal('authModal');
    toast('Welcome!');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') toast(err.message, 'error');
  }
}

function forgotPass() {
  const email = prompt('Enter your email:');
  if (email) {
    auth.sendPasswordResetEmail(email)
      .then(() => toast('Reset email sent!'))
      .catch(e => toast(e.message, 'error'));
  }
}

async function doLogout() {
  await auth.signOut();
  currentUser = null; userData = null;
  updateUI();
  showPage('home');
  toast('Logged out');
}

/* --- Auth State Observer --- */
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  if (user) {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      userData = { id: user.uid, ...doc.data() };
      await db.collection('users').doc(user.uid).update({ lastLogin: Date.now() });
      addLog('auth', 'User logged in: ' + userData.username);
    }
  } else {
    userData = null;
  }
  updateUI();
  loadData();
  document.getElementById('loader').style.display = 'none';
});

/* --- UI Updates --- */
function updateUI() {
  const logged = !!currentUser;
  document.getElementById('signInBtn').style.display = logged ? 'none' : 'inline-flex';
  document.getElementById('userMenu').style.display = logged ? 'block' : 'none';
  document.getElementById('hdrBal').style.display = logged ? 'flex' : 'none';
  document.getElementById('hdrNotif').style.display = logged ? 'block' : 'none';
  document.getElementById('sbUser').style.display = logged ? 'flex' : 'none';
  if (logged && userData) {
    document.getElementById('hdrBalNum').textContent = formatCoins(userData.coins);
    document.getElementById('hdrName').textContent = userData.username;
    document.getElementById('ddName').textContent = userData.username;
    document.getElementById('ddEmail').textContent = userData.email;
    document.getElementById('ddLvl').textContent = 'Level ' + userData.level;
    document.getElementById('sbName').textContent = userData.username;
    document.getElementById('sbLvl').textContent = 'Level ' + userData.level;
    const xpPct = ((userData.xp / userData.xpNeeded) * 100).toFixed(0);
    document.getElementById('sbXp').style.width = xpPct + '%';
    if (userData.admin) {
      document.getElementById('adminLink').style.display = 'block';
      document.getElementById('sbAdminSec').style.display = 'block';
    }
    document.getElementById('refCode').textContent = userData.referralCode || '---';
    document.getElementById('refLink').value = window.location.origin + window.location.pathname + '?ref=' + (userData.referralCode || '');
    loadNotifications();
  }
}

/* --- Navigation --- */
function showPage(p) {
  currentPage = p;
  document.querySelectorAll('.pg').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('p-' + p);
  if (el) el.classList.add('active');
  document.querySelectorAll('.hn, .sl, .mob-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-p') === p);
  });
  window.scrollTo(0, 0);
  const side = document.getElementById('sidebar');
  if (side.classList.contains('open')) side.classList.remove('open');
  loadPageData(p);
}

function toggleSide() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleNotifDrop() {
  showPage('notifs');
}

function toggleUserDD() {
  const dd = document.getElementById('userDD');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', (e) => {
  const dd = document.getElementById('userDD');
  const btn = document.querySelector('.user-btn');
  if (dd && !dd.contains(e.target) && !btn.contains(e.target)) {
    dd.style.display = 'none';
  }
});

function goEarn() {
  if (!currentUser) return openModal('authModal');
  showPage('earn');
}

/* --- Data Loading --- */
async function loadData() {
  loadOffers();
  loadHomeData();
}

async function loadOffers() {
  const snap = await db.collection('offers').where('status', '==', 'active').get();
  allOffers = snap.empty ? DEFAULT_OFFERS : snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function loadHomeData() {
  renderHomeOffers();
  renderHomeGames();
  renderHomeSurveys();
  renderCheckin();
  renderLeaderboardPreview();
  renderRewardsPreview();
  renderFAQMini();
  loadHomeStats();
  if (userData) {
    document.getElementById('refCnt').textContent = userData.referralCount || 0;
    document.getElementById('refEarn').textContent = formatCoins(userData.referralEarned || 0);
    updateStreak();
  }
}

function renderHomeOffers() {
  const c = document.getElementById('homeOffers');
  if (!c) return;
  const offers = allOffers.filter(o => o.category !== 'surveys').slice(0, 6);
  c.innerHTML = offers.map(o => offerCardHTML(o)).join('');
}

function renderHomeGames() {
  const c = document.getElementById('homeGames');
  if (!c) return;
  const games = allOffers.filter(o => o.category === 'games').slice(0, 6);
  c.innerHTML = games.map(o => offerCardHTML(o)).join('');
}

function renderHomeSurveys() {
  const c = document.getElementById('homeSurveys');
  if (!c) return;
  const sv = allOffers.filter(o => o.category === 'surveys').slice(0, 4);
  c.innerHTML = sv.map(o => offerCardHTML(o)).join('');
}

function offerCardHTML(o) {
  return '<div class="offer-card" onclick="showOffer(\'' + o.id + '\')">' +
    '<div class="oc-img"><i class="' + (o.icon || 'fas fa-gift') + '"></i>' +
    '<span class="oc-tag">' + (o.provider || 'Direct') + '</span></div>' +
    '<div class="oc-body"><h4>' + o.name + '</h4><p>' + (o.desc || '') + '</p>' +
    '<div class="oc-foot"><span class="oc-reward">' + formatCoins(o.reward) + ' coins</span>' +
    '<span class="oc-time">' + (o.time || 'Quick') + '</span></div></div></div>';
}

function offerListItemHTML(o) {
  return '<div class="ol-item" onclick="showOffer(\'' + o.id + '\')">' +
    '<div class="ol-ico"><i class="' + (o.icon || 'fas fa-gift') + '"></i></div>' +
    '<div class="ol-info"><h4>' + o.name + '</h4><p>' + (o.desc || '') + ' &bull; ' + (o.provider || '') + '</p></div>' +
    '<div class="ol-right"><div class="ol-reward">' + formatCoins(o.reward) + '</div>' +
    '<div class="ol-time">' + (o.time || 'Quick') + '</div></div>' +
    '<button class="btn btn-p ol-btn">View</button></div>';
}

function showOffer(id) {
  const o = allOffers.find(x => x.id === id);
  if (!o) return;
  if (!currentUser) return openModal('authModal');
  let steps = '';
  if (o.milestones) {
    steps = o.milestones.map(m =>
      '<div class="om-step"><i class="fas fa-check-circle"></i> ' + m.name + ' - <b class="green">' + formatCoins(m.coins) + ' coins</b></div>'
    ).join('');
  }
  document.getElementById('offerModalContent').innerHTML =
    '<div class="om-head"><div class="om-img"><i class="' + (o.icon || 'fas fa-gift') + '"></i></div>' +
    '<div class="om-info"><h3>' + o.name + '</h3><p>' + (o.provider || '') + ' &bull; ' + (o.country || 'ALL') + '</p></div></div>' +
    '<div class="om-reward">' + formatCoins(o.reward) + ' coins</div>' +
    '<div class="om-desc">' + (o.desc || '') + '</div>' +
    (steps ? '<div class="om-steps"><h4>Milestones</h4>' + steps + '</div>' : '') +
    '<button class="btn btn-p btn-f" onclick="startOffer(\'' + o.id + '\')"><i class="fas fa-play"></i> Start Offer</button>';
  openModal('offerModal');
}

function startOffer(id) {
  toast('Offer started! Complete the steps to earn coins.', 'info');
  closeModal('offerModal');
}

/* --- Page Data Loading --- */
function loadPageData(p) {
  switch(p) {
    case 'earn': renderEarnPage(); break;
    case 'offers': renderProviders(); break;
    case 'games': renderGames(); break;
    case 'surveys': renderSurveys(); break;
    case 'watch': break;
    case 'daily': renderDaily(); break;
    case 'tasks': renderTasks('daily'); break;
    case 'challenges': renderChallenges(); break;
    case 'referrals': renderReferrals(); break;
    case 'leaders': renderLeaderboard('daily'); break;
    case 'store': renderStore(); break;
    case 'topup': renderTopup(); break;
    case 'withdraw': renderWithdraw(); break;
    case 'wallet': renderWallet(); break;
    case 'tx': loadTx(); break;
    case 'profile': renderProfile(); break;
    case 'notifs': renderNotifications(); break;
    case 'settings': renderSettings(); break;
    case 'support': loadTickets(); break;
    case 'faq': renderFAQ(); break;
    case 'admin': loadAdmin(); break;
  }
}

/* --- Earn Page --- */
function renderEarnPage() {
  const c = document.getElementById('allOffers');
  if (!c) return;
  c.innerHTML = allOffers.map(o => offerListItemHTML(o)).join('');
  document.getElementById('offerCount').textContent = allOffers.length + ' offers';
}

function filterEarn(cat, btn) {
  document.querySelectorAll('#earnCats .cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const cat = document.querySelector('#earnCats .cat.active')?.getAttribute('data-c') || 'all';
  const sort = document.getElementById('fSort')?.value || 'reward-desc';
  const country = document.getElementById('fCountry')?.value || 'all';
  const search = (document.getElementById('fSearch')?.value || '').toLowerCase();
  let filtered = [...allOffers];
  if (cat !== 'all') filtered = filtered.filter(o => o.category === cat);
  if (country !== 'all') filtered = filtered.filter(o => o.country === 'ALL' || o.country === country);
  if (search) filtered = filtered.filter(o => o.name.toLowerCase().includes(search) || (o.desc || '').toLowerCase().includes(search));
  if (sort === 'reward-desc') filtered.sort((a, b) => b.reward - a.reward);
  else if (sort === 'reward-asc') filtered.sort((a, b) => a.reward - b.reward);
  else if (sort === 'time') filtered.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const c = document.getElementById('allOffers');
  if (c) c.innerHTML = filtered.map(o => offerListItemHTML(o)).join('');
  document.getElementById('offerCount').textContent = filtered.length + ' offers';
}

/* --- Providers Page --- */
function renderProviders() {
  const c = document.getElementById('providersGrid');
  if (!c) return;
  c.innerHTML = PROVIDERS.map(p =>
    '<div class="provider-card" onclick="toast(\'' + p.name + ' offers loading...\', \'info\')">' +
    '<i class="' + p.icon + '" style="font-size:32px;color:' + p.color + '"></i>' +
    '<h4>' + p.name + '</h4><small>' + p.offers + ' offers &bull; ' + p.rate + '/5 rating</small></div>'
  ).join('');
  const rec = document.getElementById('recOffers');
  if (rec) rec.innerHTML = allOffers.slice(0, 4).map(o => offerCardHTML(o)).join('');
}

/* --- Games Page --- */
function renderGames(cat) {
  const c = document.getElementById('gamesList');
  if (!c) return;
  let games = allOffers.filter(o => o.category === 'games');
  if (cat && cat !== 'all') games = games.filter(o => (o.name || '').toLowerCase().includes(cat));
  c.innerHTML = games.map(o => offerCardHTML(o)).join('') || '<div class="empty"><i class="fas fa-gamepad"></i><p>No games in this category</p></div>';
}

function filterGames(cat, btn) {
  document.querySelectorAll('#p-games .cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGames(cat);
}

/* --- Surveys Page --- */
function renderSurveys() {
  const c = document.getElementById('surveyList');
  if (!c) return;
  const sv = allOffers.filter(o => o.category === 'surveys');
  c.innerHTML = sv.map(o => offerListItemHTML(o)).join('') || '<div class="empty"><i class="fas fa-poll"></i><p>No surveys available</p></div>';
}

/* --- Daily Rewards --- */
function renderDaily() {
  if (!userData) return;
  document.getElementById('dailyStreakLg').textContent = userData.streak || 0;
  document.getElementById('curStreak').textContent = userData.streak || 0;
  const mult = getMultiplier(userData.streak || 0);
  document.getElementById('multVal').textContent = mult + 'x';
  document.getElementById('todayCoin').textContent = formatCoins(Math.floor(100 * mult));
  document.getElementById('freezeNum').textContent = userData.streakFreezes || 0;
}

function getMultiplier(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

function updateStreak() {
  const box = document.getElementById('streakBox');
  if (box && userData && userData.streak > 0) {
    box.style.display = 'flex';
    document.getElementById('streakNum').textContent = userData.streak;
  }
}

async function doCheckin() {
  if (!currentUser) return openModal('authModal');
  const today = new Date().toDateString();
  if (userData.lastCheckin === today) return toast('Already checked in today!', 'warning');
  const mult = getMultiplier(userData.streak || 0);
  const coins = Math.floor(100 * mult);
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(coins),
    totalEarned: firebase.firestore.FieldValue.increment(coins),
    streak: firebase.firestore.FieldValue.increment(1),
    lastCheckin: today
  });
  await db.collection('transactions').add({
    uid: currentUser.uid, type: 'earn', amount: coins,
    desc: 'Daily check-in (Day ' + ((userData.streak || 0) + 1) + ')', ts: Date.now()
  });
  userData.coins += coins;
  userData.totalEarned += coins;
  userData.streak = (userData.streak || 0) + 1;
  userData.lastCheckin = today;
  updateUI();
  toast('+' + formatCoins(coins) + ' coins! Day ' + userData.streak + ' streak!');
  renderDaily();
  addLog('balance', 'Daily checkin: +' + coins + ' coins');
}

function renderCheckin() {
  const c = document.getElementById('checkinRow');
  if (!c) return;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rewards = [100, 150, 200, 300, 500, 750, 1000];
  const today = new Date().getDay();
  c.innerHTML = days.map((d, i) => {
    const isToday = i === today;
    const done = userData && userData.lastCheckin === new Date().toDateString() && isToday;
    return '<div class="ci-day ' + (isToday ? 'active' : '') + (done ? ' done' : '') + '">' +
      '<small>' + d + '</small><strong>' + formatCoins(rewards[i]) + '</strong></div>';
  }).join('');
}

async function buyFreeze() {
  if (!currentUser) return openModal('authModal');
  if (userData.coins < 500) return toast('Not enough coins', 'error');
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(-500),
    streakFreezes: firebase.firestore.FieldValue.increment(1)
  });
  userData.coins -= 500;
  userData.streakFreezes = (userData.streakFreezes || 0) + 1;
  updateUI();
  toast('Streak freeze purchased!');
}

/* --- Tasks --- */
function renderTasks(type) {
  const c = document.getElementById('tasksList');
  if (!c) return;
  const tasks = {
    daily: [
      { name: 'Complete 3 offers', reward: 500, progress: 0, total: 3, icon: 'fas fa-hand-holding-usd' },
      { name: 'Watch 5 ads', reward: 200, progress: 0, total: 5, icon: 'fas fa-play-circle' },
      { name: 'Daily check-in', reward: 100, progress: userData?.lastCheckin === new Date().toDateString() ? 1 : 0, total: 1, icon: 'fas fa-calendar-check' },
      { name: 'Spin the wheel', reward: 150, progress: 0, total: 1, icon: 'fas fa-dharmachakra' }
    ],
    weekly: [
      { name: 'Complete 20 offers', reward: 2000, progress: 0, total: 20, icon: 'fas fa-hand-holding-usd' },
      { name: 'Refer 3 friends', reward: 1500, progress: userData?.referralCount || 0, total: 3, icon: 'fas fa-user-friends' },
      { name: 'Earn 10,000 coins', reward: 1000, progress: 0, total: 10000, icon: 'fas fa-coins' }
    ],
    achievements: [
      { name: 'First Offer', reward: 500, progress: userData?.offersCompleted || 0, total: 1, icon: 'fas fa-medal' },
      { name: '10 Offers', reward: 2000, progress: userData?.offersCompleted || 0, total: 10, icon: 'fas fa-trophy' },
      { name: '50 Offers', reward: 10000, progress: userData?.offersCompleted || 0, total: 50, icon: 'fas fa-crown' },
      { name: 'Refer 10', reward: 5000, progress: userData?.referralCount || 0, total: 10, icon: 'fas fa-users' },
      { name: 'Level 5', reward: 3000, progress: userData?.level || 1, total: 5, icon: 'fas fa-layer-group' },
      { name: 'Level 10', reward: 10000, progress: userData?.level || 1, total: 10, icon: 'fas fa-layer-group' }
    ]
  };
  const list = tasks[type] || tasks.daily;
  c.innerHTML = list.map(t => {
    const pct = Math.min(100, (t.progress / t.total) * 100);
    const done = pct >= 100;
    return '<div class="task-item">' +
      '<div class="task-ico"><i class="' + t.icon + '"></i></div>' +
      '<div class="task-info"><h4>' + t.name + '</h4>' +
      '<div class="task-progress"><div class="task-prog-fill" style="width:' + pct + '%"></div></div></div>' +
      '<span class="task-reward">' + formatCoins(t.reward) + '</span>' +
      '<button class="btn ' + (done ? 'btn-p btn-sm' : 'btn-o btn-sm') + '" ' + (done ? 'onclick="toast(\''+t.name+' claimed!\', \'success\')"' : 'disabled') + '>' +
      (done ? 'Claim' : t.progress + '/' + t.total) + '</button></div>';
  }).join('');
}

function switchTasks(type, btn) {
  document.querySelectorAll('#p-tasks .cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks(type);
}

/* --- Challenges --- */
function renderChallenges() {
  const c = document.getElementById('challengesGrid');
  if (!c) return;
  const chs = [
    { name: 'Speed Demon', desc: 'Complete 10 offers in 24 hours', reward: 5000, icon: 'fas fa-bolt', color: 'yellow' },
    { name: 'Survey Master', desc: 'Complete 5 surveys today', reward: 3000, icon: 'fas fa-poll', color: 'blue' },
    { name: 'Social Butterfly', desc: 'Refer 5 friends this week', reward: 10000, icon: 'fas fa-user-friends', color: 'purple' },
    { name: 'Streak King', desc: 'Maintain 30-day streak', reward: 15000, icon: 'fas fa-fire', color: 'orange' },
    { name: 'Big Earner', desc: 'Earn 50,000 coins total', reward: 8000, icon: 'fas fa-coins', color: 'green' },
    { name: 'Lucky Spinner', desc: 'Win 1000+ from spin wheel', reward: 2000, icon: 'fas fa-dharmachakra', color: 'pink' }
  ];
  c.innerHTML = chs.map(ch =>
    '<div class="challenge-card"><div class="qa-i ' + ch.color + '" style="margin:0 auto 12px"><i class="' + ch.icon + '"></i></div>' +
    '<h4>' + ch.name + '</h4><p>' + ch.desc + '</p>' +
    '<div class="oc-foot"><span class="oc-reward">' + formatCoins(ch.reward) + ' coins</span>' +
    '<button class="btn btn-o btn-sm" onclick="toast(\'' + ch.name + ' challenge active!\', \'info\')">Join</button></div></div>'
  ).join('');
}

/* --- Referrals --- */
function renderReferrals() {
  if (!userData) return;
  document.getElementById('rClicks').textContent = userData.referralCount || 0;
  document.getElementById('rSignups').textContent = userData.referralCount || 0;
  document.getElementById('rActive').textContent = Math.floor((userData.referralCount || 0) * 0.7);
  document.getElementById('rEarned').textContent = formatCoins(userData.referralEarned || 0);
  const ms = document.getElementById('refMilestones');
  if (ms) {
    const milestones = [
      { count: 1, reward: 500, name: 'First Referral' },
      { count: 5, reward: 2000, name: '5 Friends' },
      { count: 10, reward: 5000, name: '10 Friends' },
      { count: 25, reward: 15000, name: '25 Friends' },
      { count: 50, reward: 50000, name: '50 Friends' }
    ];
    ms.innerHTML = milestones.map(m => {
      const done = (userData.referralCount || 0) >= m.count;
      return '<div class="ms-item ' + (done ? 'done' : '') + '">' +
        '<div class="ms-icon"><i class="fas fa-' + (done ? 'check' : 'lock') + '"></i></div>' +
        '<div class="ms-info"><h4>' + m.name + '</h4><p>' + formatCoins(m.reward) + ' coins bonus</p></div>' +
        '<span class="' + (done ? 'green' : 'muted') + '">' + m.count + ' referrals</span></div>';
    }).join('');
  }
}

function copyRef() {
  const inp = document.getElementById('refLink');
  inp.select();
  document.execCommand('copy');
  toast('Link copied!');
}

function shareRef(platform) {
  const link = document.getElementById('refLink').value;
  const text = 'Join ReWords and earn real rewards! Use my link: ' + link;
  const urls = {
    whatsapp: 'https://wa.me/?text=' + encodeURIComponent(text),
    telegram: 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text),
    twitter: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text),
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link)
  };
  window.open(urls[platform], '_blank');
}

/* --- Leaderboard --- */
function renderLeaderboard(period) {
  const lb = document.getElementById('lbList');
  const top3 = document.getElementById('lbTop3');
  if (!lb) return;
  const mockUsers = [
    { name: 'CryptoKing', coins: 125000, level: 15 },
    { name: 'ProEarner', coins: 98000, level: 12 },
    { name: 'RewardMaster', coins: 87000, level: 11 },
    { name: 'CoinHunter', coins: 72000, level: 10 },
    { name: 'TopPlayer', coins: 65000, level: 9 },
    { name: 'LuckyStar', coins: 54000, level: 8 },
    { name: 'OfferNinja', coins: 43000, level: 7 },
    { name: 'SpinWinner', coins: 38000, level: 6 },
    { name: 'DailyGrind', coins: 32000, level: 5 },
    { name: 'NewcomerPro', coins: 25000, level: 4 }
  ];
  if (top3) {
    const medals = ['gold', 'silver', 'bronze'];
    const icons = ['fa-crown', 'fa-medal', 'fa-award'];
    top3.innerHTML = mockUsers.slice(0, 3).map((u, i) =>
      '<div class="lb-podium ' + medals[i] + '">' +
      '<div class="lb-rank ' + medals[i] + '"><i class="fas ' + icons[i] + '"></i></div>' +
      '<div class="lb-av"><i class="fas fa-user"></i></div>' +
      '<div class="lb-name">' + u.name + '</div>' +
      '<div class="lb-coins">' + formatCoins(u.coins) + ' coins</div></div>'
    ).join('');
  }
  lb.innerHTML = mockUsers.map((u, i) =>
    '<div class="lb-row"><span class="lb-num">#' + (i + 1) + '</span>' +
    '<div class="avatar-sm"><i class="fas fa-user"></i></div>' +
    '<div class="lb-info"><strong>' + u.name + '</strong><small>Level ' + u.level + '</small></div>' +
    '<span class="green bold">' + formatCoins(u.coins) + '</span></div>'
  ).join('');
}

function switchLB(p, btn) {
  document.querySelectorAll('#p-leaders .cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard(p);
}

/* --- Rewards Store --- */
function renderStore() {
  const c = document.getElementById('storeGrid');
  if (!c) return;
  const rewards = [
    { name: 'PayPal $0.50', cost: 5000, cat: 'paypal', icon: 'fab fa-paypal', color: '#003087' },
    { name: 'PayPal $1.00', cost: 10000, cat: 'paypal', icon: 'fab fa-paypal', color: '#003087' },
    { name: 'PayPal $5.00', cost: 50000, cat: 'paypal', icon: 'fab fa-paypal', color: '#003087' },
    { name: 'PayPal $10.00', cost: 100000, cat: 'paypal', icon: 'fab fa-paypal', color: '#003087' },
    { name: 'USDT $1.00', cost: 10000, cat: 'crypto', icon: 'fab fa-bitcoin', color: '#f7931a' },
    { name: 'USDT $5.00', cost: 50000, cat: 'crypto', icon: 'fab fa-bitcoin', color: '#f7931a' },
    { name: 'Bitcoin $10', cost: 100000, cat: 'crypto', icon: 'fab fa-bitcoin', color: '#f7931a' },
    { name: 'PUBG 600 UC', cost: 30000, cat: 'gaming', icon: 'fas fa-crosshairs', color: '#f97316' },
    { name: 'Free Fire 520 Dia', cost: 25000, cat: 'gaming', icon: 'fas fa-fire', color: '#ff4757' },
    { name: 'Roblox 400 R$', cost: 45000, cat: 'gaming', icon: 'fas fa-cube', color: '#00e676' },
    { name: 'Amazon $5', cost: 55000, cat: 'giftcards', icon: 'fab fa-amazon', color: '#ff9900' },
    { name: 'Google Play $5', cost: 55000, cat: 'giftcards', icon: 'fab fa-google-play', color: '#00e676' },
    { name: 'Steam $5', cost: 55000, cat: 'giftcards', icon: 'fab fa-steam', color: '#1b2838' }
  ];
  c.innerHTML = rewards.map(r =>
    '<div class="store-item" onclick="buyReward(\'' + r.name + '\', ' + r.cost + ')">' +
    '<i class="' + r.icon + '" style="color:' + r.color + '"></i>' +
    '<h4>' + r.name + '</h4>' +
    '<div class="cost">' + formatCoins(r.cost) + ' coins</div>' +
    '<button class="btn btn-p btn-sm">Redeem</button></div>'
  ).join('');
}

function filterStore(cat, btn) {
  document.querySelectorAll('#storeCats .cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const items = document.querySelectorAll('.store-item');
  // Re-render with filter
  renderStoreFiltered(cat);
}

function renderStoreFiltered(cat) {
  // Simple filter implementation
  toast('Showing ' + (cat === 'all' ? 'all' : cat) + ' rewards', 'info');
}

async function buyReward(name, cost) {
  if (!currentUser) return openModal('authModal');
  if (userData.coins < cost) return toast('Not enough coins!', 'error');
  if (!confirm('Redeem ' + name + ' for ' + formatCoins(cost) + ' coins?')) return;
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(-cost),
    totalSpent: firebase.firestore.FieldValue.increment(cost)
  });
  await db.collection('orders').add({
    uid: currentUser.uid, username: userData.username,
    item: name, coins: cost, status: 'pending',
    ts: Date.now()
  });
  await db.collection('transactions').add({
    uid: currentUser.uid, type: 'spend', amount: -cost,
    desc: 'Redeemed: ' + name, ts: Date.now()
  });
  userData.coins -= cost;
  userData.totalSpent += cost;
  updateUI();
  toast('Order placed! Processing within 24h.');
  addLog('balance', 'Redeemed: ' + name + ' for ' + cost + ' coins');
}

/* --- Top-Up --- */
function renderTopup() {
  const c = document.getElementById('topupGames');
  if (!c) return;
  c.innerHTML = TOPUP_GAMES.map(g =>
    '<div class="topup-game" onclick="selectTopup(\'' + g.id + '\')">' +
    '<i class="' + g.icon + '" style="color:' + g.color + '"></i>' +
    '<h4>' + g.name + '</h4></div>'
  ).join('');
}

function selectTopup(id) {
  const game = TOPUP_GAMES.find(g => g.id === id);
  if (!game) return;
  if (!currentUser) return openModal('authModal');
  document.getElementById('topupGames').style.display = 'none';
  document.getElementById('topupFormWrap').style.display = 'block';
  document.getElementById('topupTitle').textContent = 'Top Up ' + game.name;
  const pkgs = document.getElementById('tuPkgs');
  const packages = [
    { amount: 60, coins: 5000 },
    { amount: 300, coins: 25000 },
    { amount: 600, coins: 45000 },
    { amount: 1500, coins: 100000 },
    { amount: 3000, coins: 200000 }
  ];
  pkgs.innerHTML = packages.map((p, i) =>
    '<div class="pkg-item" onclick="selectPkg(this, ' + p.coins + ')">' +
    '<span>' + p.amount + ' ' + game.currency + '</span>' +
    '<span class="yellow bold">' + formatCoins(p.coins) + ' coins</span></div>'
  ).join('');
}

let selectedTopupPkg = 0;
function selectPkg(el, coins) {
  document.querySelectorAll('.pkg-item').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedTopupPkg = coins;
}

function closeTopup() {
  document.getElementById('topupGames').style.display = 'grid';
  document.getElementById('topupFormWrap').style.display = 'none';
}

async function submitTopup(e) {
  e.preventDefault();
  if (!selectedTopupPkg) return toast('Select a package', 'error');
  if (userData.coins < selectedTopupPkg) return toast('Not enough coins', 'error');
  const pid = document.getElementById('tuPid').value;
  if (!pid) return toast('Enter Player ID', 'error');
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(-selectedTopupPkg),
    totalSpent: firebase.firestore.FieldValue.increment(selectedTopupPkg)
  });
  await db.collection('orders').add({
    uid: currentUser.uid, username: userData.username,
    type: 'topup', playerId: pid,
    coins: selectedTopupPkg, status: 'pending', ts: Date.now()
  });
  await db.collection('transactions').add({
    uid: currentUser.uid, type: 'spend', amount: -selectedTopupPkg,
    desc: 'Game top-up: ' + pid, ts: Date.now()
  });
  userData.coins -= selectedTopupPkg;
  updateUI();
  closeTopup();
  toast('Top-up submitted! Processing within 1h.');
}

/* --- Withdraw --- */
function renderWithdraw() {
  if (!userData) return;
  document.getElementById('wAvail').textContent = formatCoins(userData.coins);
  document.getElementById('wPending').textContent = formatCoins(userData.pendingWithdraw || 0);
}

function selectWMethod(method) {
  if (!currentUser) return openModal('authModal');
  document.getElementById('withdrawMethods').style.display = 'none';
  document.getElementById('withdrawForm').style.display = 'block';
  document.getElementById('wTitle').textContent = method === 'paypal' ? 'Withdraw to PayPal' : method === 'crypto' ? 'Withdraw USDT' : 'Mobile Top-Up';
  document.getElementById('wEmailGrp').style.display = method === 'paypal' ? 'block' : 'none';
  document.getElementById('wAddrGrp').style.display = method === 'crypto' ? 'block' : 'none';
  window._wMethod = method;
}

function closeWForm() {
  document.getElementById('withdrawMethods').style.display = 'block';
  document.getElementById('withdrawForm').style.display = 'none';
}

function calcWithdraw() {
  const coins = parseInt(document.getElementById('wAmount').value) || 0;
  const afterFee = coins * (1 - SITE.withdrawFee);
  const usd = (afterFee / SITE.coinRate).toFixed(2);
  document.getElementById('wCalc').textContent = 'You receive: $' + usd + ' (after 5% fee)';
}

async function submitWithdraw(e) {
  e.preventDefault();
  if (!currentUser) return openModal('authModal');
  const coins = parseInt(document.getElementById('wAmount').value) || 0;
  if (coins < SITE.minWithdraw) return toast('Minimum withdrawal: ' + formatCoins(SITE.minWithdraw), 'error');
  if (coins > userData.coins) return toast('Insufficient balance', 'error');
  const method = window._wMethod || 'paypal';
  let detail = '';
  if (method === 'paypal') {
    detail = document.getElementById('wEmail').value;
    if (!detail) return toast('Enter PayPal email', 'error');
  } else if (method === 'crypto') {
    detail = document.getElementById('wAddr').value;
    if (!detail) return toast('Enter TRC20 address', 'error');
  }
  if (!confirm('Withdraw ' + formatCoins(coins) + ' coins via ' + method + '?')) return;
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(-coins),
    pendingWithdraw: firebase.firestore.FieldValue.increment(coins)
  });
  await db.collection('withdrawals').add({
    uid: currentUser.uid, username: userData.username, email: userData.email,
    amount: coins, usd: (coins / SITE.coinRate).toFixed(2),
    method, detail, status: 'pending', riskScore: userData.riskScore || 0,
    ts: Date.now()
  });
  await db.collection('transactions').add({
    uid: currentUser.uid, type: 'withdrawal', amount: -coins,
    desc: 'Withdrawal via ' + method, ts: Date.now()
  });
  userData.coins -= coins;
  userData.pendingWithdraw = (userData.pendingWithdraw || 0) + coins;
  updateUI();
  closeWForm();
  toast('Withdrawal requested! Processing within 24h.');
  addLog('balance', 'Withdrawal: ' + coins + ' coins via ' + method);
}

/* --- Wallet --- */
function renderWallet() {
  if (!userData) return;
  document.getElementById('wBalMain').textContent = formatCoins(userData.coins);
  document.getElementById('wBalUsd').textContent = (userData.coins / SITE.coinRate).toFixed(2);
  document.getElementById('wSubPend').textContent = formatCoins(userData.pendingWithdraw || 0);
  document.getElementById('wSubLock').textContent = '0';
  document.getElementById('wSubEarn').textContent = formatCoins(userData.totalEarned || 0);
  document.getElementById('wSubSpend').textContent = formatCoins(userData.totalSpent || 0);
  document.getElementById('wSubWith').textContent = formatCoins(userData.totalWithdrawn || 0);
}

/* --- Transactions --- */
async function loadTx() {
  if (!currentUser) return;
  const c = document.getElementById('txList');
  if (!c) return;
  const filter = document.getElementById('txFilter')?.value || 'all';
  let q = db.collection('transactions').where('uid', '==', currentUser.uid).orderBy('ts', 'desc').limit(50);
  const snap = await q.get();
  let txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (filter !== 'all') {
    if (filter === 'earn') txs = txs.filter(t => t.type === 'earn' || t.type === 'bonus');
    else if (filter === 'spend') txs = txs.filter(t => t.type === 'spend');
    else if (filter === 'withdrawal') txs = txs.filter(t => t.type === 'withdrawal');
  }
  if (txs.length === 0) {
    c.innerHTML = '<div class="empty"><i class="fas fa-receipt"></i><p>No transactions yet</p></div>';
    return;
  }
  c.innerHTML = txs.map(t => {
    const icon = t.type === 'earn' || t.type === 'bonus' ? 'earn' : t.type === 'withdrawal' ? 'withdraw' : 'spend';
    const iconClass = t.type === 'earn' ? 'fa-plus' : t.type === 'bonus' ? 'fa-gift' : t.type === 'withdrawal' ? 'fa-money-bill-wave' : 'fa-minus';
    return '<div class="tx-item">' +
      '<div class="tx-ico ' + icon + '"><i class="fas ' + iconClass + '"></i></div>' +
      '<div class="tx-info"><h4>' + (t.desc || t.type) + '</h4><p>' + timeAgo(t.ts) + '</p></div>' +
      '<span class="tx-amount ' + (t.amount > 0 ? 'pos' : 'neg') + '">' +
      (t.amount > 0 ? '+' : '') + formatCoins(Math.abs(t.amount)) + '</span></div>';
  }).join('');
}

/* --- Profile --- */
function renderProfile() {
  if (!userData) return;
  document.getElementById('pcName').textContent = userData.username;
  document.getElementById('pcEmail').textContent = userData.email;
  document.getElementById('pcEarned').textContent = formatCoins(userData.totalEarned || 0);
  document.getElementById('pcOffers').textContent = userData.offersCompleted || 0;
  document.getElementById('pcWith').textContent = userData.totalWithdrawn || 0;
  document.getElementById('pcRefs').textContent = userData.referralCount || 0;
  document.getElementById('pcDate').textContent = userData.joined ? new Date(userData.joined).toLocaleDateString() : '-';
  document.getElementById('pcCountry').textContent = userData.country || '-';
  document.getElementById('pcLvNum').textContent = userData.level || 1;
  document.getElementById('pcLvlBadge').textContent = 'Level ' + (userData.level || 1);
  const xpPct = ((userData.xp || 0) / (userData.xpNeeded || 1000)) * 100;
  document.getElementById('pcXpFill').style.width = xpPct + '%';
  document.getElementById('pcXpCur').textContent = formatCoins(userData.xp || 0);
  document.getElementById('pcXpNext').textContent = formatCoins(userData.xpNeeded || 1000);
}

/* --- Notifications --- */
function loadNotifications() {
  if (!userData || !userData.notifications) return;
  const count = userData.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('nbadge');
  if (badge) {
    badge.style.display = count > 0 ? 'flex' : 'none';
    badge.textContent = count;
  }
}

function renderNotifications() {
  const c = document.getElementById('notifList');
  if (!c || !userData) return;
  const notifs = userData.notifications || [];
  if (notifs.length === 0) {
    c.innerHTML = '<div class="empty"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
    return;
  }
  c.innerHTML = notifs.sort((a, b) => b.ts - a.ts).map(n =>
    '<div class="tx-item" style="' + (n.read ? 'opacity:0.6' : '') + '">' +
    '<div class="tx-ico bonus"><i class="fas fa-bell"></i></div>' +
    '<div class="tx-info"><h4>' + n.title + '</h4><p>' + (n.body || '') + '</p></div>' +
    '<span class="muted">' + timeAgo(n.ts) + '</span></div>'
  ).join('');
}

async function markAllRead() {
  if (!currentUser || !userData) return;
  const notifs = (userData.notifications || []).map(n => ({ ...n, read: true }));
  await db.collection('users').doc(currentUser.uid).update({ notifications: notifs });
  userData.notifications = notifs;
  loadNotifications();
  renderNotifications();
  toast('All marked as read');
}

/* --- Settings --- */
function renderSettings() {
  if (!userData) return;
  document.getElementById('setUser').value = userData.username || '';
  document.getElementById('setEmail').value = userData.email || '';
  document.getElementById('setCountry').value = userData.country || 'OTHER';
  document.getElementById('setNotifEmail').checked = userData.settings?.emailNotifs !== false;
  document.getElementById('setNotifOffers').checked = userData.settings?.offerAlerts !== false;
  document.getElementById('setNotifMkt').checked = userData.settings?.marketing === true;
}

async function saveSettings() {
  if (!currentUser) return;
  const username = document.getElementById('setUser').value;
  const country = document.getElementById('setCountry').value;
  if (!username || username.length < 3) return toast('Username too short', 'error');
  await db.collection('users').doc(currentUser.uid).update({
    username, country,
    settings: {
      emailNotifs: document.getElementById('setNotifEmail').checked,
      offerAlerts: document.getElementById('setNotifOffers').checked,
      marketing: document.getElementById('setNotifMkt').checked
    }
  });
  userData.username = username;
  userData.country = country;
  userData.settings = {
    emailNotifs: document.getElementById('setNotifEmail').checked,
    offerAlerts: document.getElementById('setNotifOffers').checked,
    marketing: document.getElementById('setNotifMkt').checked
  };
  updateUI();
  toast('Settings saved!');
}

async function changePass() {
  if (!currentUser) return;
  const newPass = document.getElementById('setNewPass').value;
  if (!newPass || newPass.length < 6) return toast('Password min 6 chars', 'error');
  try {
    await currentUser.updatePassword(newPass);
    toast('Password updated!');
    document.getElementById('setCurPass').value = '';
    document.getElementById('setNewPass').value = '';
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function delAccount() {
  if (!confirm('DELETE your account? This cannot be undone!')) return;
  if (!confirm('Are you REALLY sure?')) return;
  await db.collection('users').doc(currentUser.uid).update({ status: 'deleted' });
  await currentUser.delete();
  toast('Account deleted');
}

function verifyEmail() {
  if (!currentUser) return;
  currentUser.sendEmailVerification()
    .then(() => toast('Verification email sent!'))
    .catch(e => toast(e.message, 'error'));
}

/* --- Support & Tickets --- */
function toggleTicketForm() {
  const f = document.getElementById('ticketForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function submitTicket(e) {
  e.preventDefault();
  if (!currentUser) return openModal('authModal');
  await db.collection('tickets').add({
    uid: currentUser.uid, username: userData.username, email: userData.email,
    category: document.getElementById('tCat').value,
    priority: document.getElementById('tPri').value,
    subject: document.getElementById('tSubj').value,
    description: document.getElementById('tDesc').value,
    status: 'open', ts: Date.now()
  });
  document.getElementById('tSubj').value = '';
  document.getElementById('tDesc').value = '';
  toggleTicketForm();
  toast('Ticket submitted!');
  loadTickets();
}

async function loadTickets() {
  if (!currentUser) return;
  const c = document.getElementById('ticketList');
  if (!c) return;
  const snap = await db.collection('tickets').where('uid', '==', currentUser.uid).orderBy('ts', 'desc').get();
  if (snap.empty) {
    c.innerHTML = '<div class="empty"><i class="fas fa-ticket-alt"></i><p>No tickets</p></div>';
    return;
  }
  c.innerHTML = snap.docs.map(d => {
    const t = d.data();
    const statusColor = t.status === 'open' ? 'yellow' : t.status === 'resolved' ? 'green' : 'blue';
    return '<div class="tx-item">' +
      '<div class="tx-ico bonus"><i class="fas fa-ticket-alt"></i></div>' +
      '<div class="tx-info"><h4>' + t.subject + '</h4><p>' + t.category + ' &bull; ' + timeAgo(t.ts) + '</p></div>' +
      '<span class="badge badge-' + statusColor + '">' + t.status + '</span></div>';
  }).join('');
}

/* --- FAQ --- */
function renderFAQ() {
  const c = document.getElementById('faqList');
  if (!c) return;
  c.innerHTML = DEFAULT_FAQS.map((f, i) =>
    '<div class="faq-item"><div class="faq-q" onclick="toggleFaq(' + i + ')"><span>' + f.q + '</span>' +
    '<i class="fas fa-chevron-down"></i></div>' +
    '<div class="faq-a" id="faq' + i + '">' + f.a + '</div></div>'
  ).join('');
}

function renderFAQMini() {
  const c = document.getElementById('faqMini');
  if (!c) return;
  c.innerHTML = '<div class="sec-head"><h2><i class="fas fa-question-circle accent"></i> FAQ</h2></div>' +
    DEFAULT_FAQS.slice(0, 3).map((f, i) =>
      '<div class="faq-item"><div class="faq-q" onclick="toggleFaq(\'m' + i + '\')"><span>' + f.q + '</span>' +
      '<i class="fas fa-chevron-down"></i></div>' +
      '<div class="faq-a" id="faqm' + i + '">' + f.a + '</div></div>'
    ).join('');
}

function toggleFaq(i) {
  const el = document.getElementById('faq' + i);
  if (!el) return;
  const q = el.previousElementSibling;
  el.classList.toggle('show');
  q.classList.toggle('open');
}

/* --- Watch Ads / Games --- */
function watchAd(type) {
  if (!currentUser) return openModal('authModal');
  toast('Loading ad... Please wait.', 'info');
  setTimeout(async () => {
    const coins = type === 'video' ? 50 : 30;
    await db.collection('users').doc(currentUser.uid).update({
      coins: firebase.firestore.FieldValue.increment(coins),
      totalEarned: firebase.firestore.FieldValue.increment(coins)
    });
    await db.collection('transactions').add({
      uid: currentUser.uid, type: 'earn', amount: coins,
      desc: 'Watched ' + type + ' ad', ts: Date.now()
    });
    userData.coins += coins;
    userData.totalEarned += coins;
    updateUI();
    toast('+' + coins + ' coins earned!');
  }, 3000);
}

/* --- Spin Wheel --- */
let spinAngle = 0;
const SPIN_PRIZES = [25, 50, 100, 200, 500, 1000];

function openSpin() {
  if (!currentUser) return openModal('authModal');
  openModal('spinModal');
  drawWheel();
}

function drawWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 150, cy = 150, r = 140;
  const colors = ['#00d4ff', '#a855f7', '#00e676', '#f97316', '#ec4899', '#3b82f6'];
  ctx.clearRect(0, 0, 300, 300);
  for (let i = 0; i < 6; i++) {
    const start = (i * Math.PI * 2) / 6 - Math.PI / 2;
    const end = ((i + 1) * Math.PI * 2) / 6 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = '#0a0e1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((start + end) / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(SPIN_PRIZES[i], r * 0.65, 5);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0e1a';
  ctx.fill();
}

async function doSpin() {
  const btn = document.getElementById('spinBtn');
  btn.disabled = true;
  const prizeIdx = Math.floor(Math.random() * SPIN_PRIZES.length);
  const coins = SPIN_PRIZES[prizeIdx];
  spinAngle += 360 * 5 + (prizeIdx * 60) + 30;
  const wheel = document.getElementById('theWheel');
  wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
  wheel.style.transform = 'rotate(' + spinAngle + 'deg)';
  setTimeout(async () => {
    await db.collection('users').doc(currentUser.uid).update({
      coins: firebase.firestore.FieldValue.increment(coins),
      totalEarned: firebase.firestore.FieldValue.increment(coins)
    });
    await db.collection('transactions').add({
      uid: currentUser.uid, type: 'bonus', amount: coins,
      desc: 'Spin wheel prize', ts: Date.now()
    });
    userData.coins += coins;
    userData.totalEarned += coins;
    updateUI();
    document.getElementById('spinResult').style.display = 'block';
    document.getElementById('spinResult').textContent = 'You won ' + formatCoins(coins) + ' coins!';
    btn.disabled = false;
    wheel.style.transition = 'none';
  }, 4200);
}

/* --- Scratch Card --- */
let scratchData = null;
function openScratch() {
  if (!currentUser) return openModal('authModal');
  openModal('scratchModal');
  scratchData = { prize: Math.floor(Math.random() * 451) + 50, scratched: false };
  const canvas = document.getElementById('scratchCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(0, 0, 300, 180);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('SCRATCH HERE', 150, 95);
  let isDrawing = false;
  canvas.onmousedown = (e) => { isDrawing = true; scratch(e); };
  canvas.onmousemove = (e) => { if (isDrawing) scratch(e); };
  canvas.onmouseup = () => { isDrawing = false; checkScratch(); };
  canvas.ontouchstart = (e) => { isDrawing = true; scratch(e.touches[0]); e.preventDefault(); };
  canvas.ontouchmove = (e) => { if (isDrawing) scratch(e.touches[0]); e.preventDefault(); };
  canvas.ontouchend = () => { isDrawing = false; checkScratch(); };
  document.getElementById('scratchPrize').textContent = scratchData.prize + ' coins';
  document.getElementById('scratchPrize').style.display = 'none';
  document.getElementById('scratchBtn').style.display = 'none';
  function scratch(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (300 / rect.width);
    const y = (e.clientY - rect.top) * (180 / rect.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  function checkScratch() {
    const data = ctx.getImageData(0, 0, 300, 180).data;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) cleared++;
    }
    if (cleared > 300 * 180 * 0.3 && !scratchData.scratched) {
      scratchData.scratched = true;
      document.getElementById('scratchPrize').style.display = 'flex';
      document.getElementById('scratchBtn').style.display = 'inline-flex';
    }
  }
}

async function claimScratch() {
  if (!scratchData) return;
  const coins = scratchData.prize;
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(coins),
    totalEarned: firebase.firestore.FieldValue.increment(coins)
  });
  await db.collection('transactions').add({
    uid: currentUser.uid, type: 'bonus', amount: coins,
    desc: 'Scratch card prize', ts: Date.now()
  });
  userData.coins += coins;
  userData.totalEarned += coins;
  updateUI();
  toast('+' + formatCoins(coins) + ' from scratch card!');
  closeModal('scratchModal');
}

/* --- Mystery Box --- */
function openMystery() {
  if (!currentUser) return openModal('authModal');
  openModal('mysteryModal');
  document.getElementById('mysteryBox').classList.remove('open');
  document.getElementById('mysteryResult').style.display = 'none';
  document.getElementById('mysteryBtn').style.display = 'none';
}

async function openMysteryBox() {
  const box = document.getElementById('mysteryBox');
  box.classList.add('open');
  const coins = Math.floor(Math.random() * 1901) + 100;
  setTimeout(() => {
    document.getElementById('mysteryResult').style.display = 'block';
    document.getElementById('mysteryResult').textContent = '+' + formatCoins(coins) + ' coins!';
    document.getElementById('mysteryBtn').style.display = 'inline-flex';
    window._mysteryCoins = coins;
  }, 500);
}

function openMystery() {
  if (!currentUser) return openModal('authModal');
  openModal('mysteryModal');
}

async function claimMystery() {
  const coins = window._mysteryCoins || 100;
  await db.collection('users').doc(currentUser.uid).update({
    coins: firebase.firestore.FieldValue.increment(coins),
    totalEarned: firebase.firestore.FieldValue.increment(coins)
  });
  await db.collection('transactions').add({
    uid: currentUser.uid, type: 'bonus', amount: coins,
    desc: 'Mystery box prize', ts: Date.now()
  });
  userData.coins += coins;
  userData.totalEarned += coins;
  updateUI();
  toast('+' + formatCoins(coins) + ' from mystery box!');
  closeModal('mysteryModal');
}

/* --- Home Stats Animation --- */
function loadHomeStats() {
  animateCounter('hs1', 45000);
  animateCounter('hs2', 1250000);
  animateCounter('hs3', 380000);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 60);
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = formatNum(current);
  }, 30);
}

/* ============================================
   ADMIN PANEL
   ============================================ */
function adminTab(tab, btn) {
  currentAdminTab = tab;
  document.querySelectorAll('.atab').forEach(t => t.style.display = 'none');
  document.getElementById(tab).style.display = 'block';
  document.querySelectorAll('.an').forEach(a => a.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadAdminTab(tab);
}

function loadAdmin() {
  loadAdminTab(currentAdminTab);
}

async function loadAdminTab(tab) {
  if (!userData || !userData.admin) return;
  switch (tab) {
    case 'adash': loadAdminDashboard(); break;
    case 'ausers': loadAdminUsers(); break;
    case 'aoffers': loadAdminOffers(); break;
    case 'aproviders': loadAdminProviders(); break;
    case 'arewards': loadAdminRewards(); break;
    case 'aorders': loadAdminOrders(); break;
    case 'awithdraw': loadAdminWithdrawals(); break;
    case 'afraud': loadAdminFraud(); break;
    case 'afinance': loadAdminFinance(); break;
    case 'aanalytics': loadAdminAnalytics(); break;
    case 'aads': break;
    case 'acampaigns': loadAdminCampaigns(); break;
    case 'atickets': loadAdminTickets(); break;
    case 'alogs': loadLogs(); break;
    case 'aroles': break;
  }
}

async function loadAdminDashboard() {
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(d => d.data());
  document.getElementById('aUsers').textContent = users.length;
  const todayOrders = await db.collection('orders').where('ts', '>=', Date.now() - 86400000).get();
  let rev = 0;
  todayOrders.forEach(d => { rev += (d.data().coins || 0) / SITE.coinRate * 0.6; });
  document.getElementById('aRev').textContent = '$' + rev.toFixed(2);
  const pendW = await db.collection('withdrawals').where('status', '==', 'pending').get();
  document.getElementById('aPendW').textContent = pendW.size;
  const fraud = users.filter(u => (u.riskScore || 0) >= SITE.riskThreshold);
  document.getElementById('aFraud').textContent = fraud.length;
  document.getElementById('aProfit').textContent = '$' + (rev * 0.35).toFixed(2);
  document.getElementById('aConv').textContent = (3.2 + Math.random() * 2).toFixed(1) + '%';
  renderAdminChart('revChart', 'Revenue', [120, 190, 150, 220, 180, 260, 200]);
  renderAdminChart('usrChart', 'Users', [30, 45, 35, 55, 42, 60, 48]);
  // Top offers table
  const topO = document.getElementById('aTopOffers');
  if (topO) {
    topO.innerHTML = allOffers.slice(0, 5).map(o =>
      '<tr><td>' + o.name + '</td><td>' + (2 + Math.random() * 5).toFixed(1) + '%</td><td>$' + (o.revenue || 0).toFixed(2) + '</td></tr>'
    ).join('');
  }
  const recW = document.getElementById('aRecentW');
  if (recW) {
    const ws = await db.collection('withdrawals').orderBy('ts', 'desc').limit(5).get();
    recW.innerHTML = ws.docs.map(d => {
      const w = d.data();
      return '<tr><td>' + (w.username || 'User') + '</td><td>' + formatCoins(w.amount) + '</td><td><span class="badge badge-' + (w.status === 'completed' ? 'green' : w.status === 'pending' ? 'yellow' : 'red') + '">' + w.status + '</span></td></tr>';
    }).join('') || '<tr><td colspan="3" class="muted">No data</td></tr>';
  }
}

function renderAdminChart(canvasId, label, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  charts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label, data,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0,212,255,0.1)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#00d4ff',
        pointBorderColor: '#0a0e1a',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1e2540' }, ticks: { color: '#5a6480' } },
        y: { grid: { color: '#1e2540' }, ticks: { color: '#5a6480' } }
      }
    }
  });
}

async function loadAdminUsers() {
  const snap = await db.collection('users').orderBy('lastLogin', 'desc').get();
  const tb = document.getElementById('aUsersTb');
  if (!tb) return;
  tb.innerHTML = snap.docs.map(d => {
    const u = d.data();
    const riskClass = (u.riskScore || 0) >= 70 ? 'red' : (u.riskScore || 0) >= 40 ? 'yellow' : 'green';
    return '<tr><td><b>' + (u.username || '-') + '</b></td><td>' + (u.email || '-') + '</td><td>' + (u.country || '-') + '</td>' +
      '<td>' + formatCoins(u.coins || 0) + '</td><td>' + (u.offersCompleted || 0) + '</td>' +
      '<td><span class="badge badge-' + riskClass + '">' + (u.riskScore || 0) + '%</span></td>' +
      '<td><span class="badge badge-' + (u.status === 'active' ? 'green' : 'red') + '">' + (u.status || 'active') + '</span></td>' +
      '<td><button class="tb-btn tb-btn-view" onclick="viewUser(\'' + d.id + '\')">View</button> ' +
      '<button class="tb-btn ' + (u.status === 'active' ? 'tb-btn-suspend' : 'tb-btn-approve') + '" onclick="toggleUserStatus(\'' + d.id + '\', \'' + (u.status === 'active' ? 'suspended' : 'active') + '\')">' + (u.status === 'active' ? 'Suspend' : 'Unsuspend') + '</button></td></tr>';
  }).join('');
}

async function viewUser(uid) {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return;
  const u = doc.data();
  alert('User: ' + u.username + '\nEmail: ' + u.email + '\nCoins: ' + formatCoins(u.coins) + '\nLevel: ' + u.level + '\nRisk: ' + (u.riskScore || 0) + '%\nStatus: ' + u.status);
}

async function toggleUserStatus(uid, status) {
  await db.collection('users').doc(uid).update({ status });
  addLog('admin', 'User ' + uid + ' status changed to ' + status);
  toast('User status updated');
  loadAdminUsers();
}

function searchUsers() {
  const q = (document.getElementById('aUserSearch')?.value || '').toLowerCase();
  const rows = document.querySelectorAll('#aUsersTb tr');
  rows.forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function loadAdminOffers() {
  const tb = document.getElementById('aOffersTb');
  if (!tb) return;
  tb.innerHTML = allOffers.map(o =>
    '<tr><td><b>' + o.name + '</b></td><td>' + (o.provider || '-') + '</td>' +
    '<td>' + formatCoins(o.reward) + '</td><td>$' + (o.revenue || 0).toFixed(2) + '</td>' +
    '<td class="green">$' + ((o.revenue || 0) * 0.4).toFixed(2) + '</td>' +
    '<td>' + (o.country || 'ALL') + '</td>' +
    '<td><span class="badge badge-green">Active</span></td>' +
    '<td><button class="tb-btn tb-btn-edit">Edit</button></td></tr>'
  ).join('');
}

function loadAdminProviders() {
  const c = document.getElementById('aProviders');
  if (!c) return;
  c.innerHTML = PROVIDERS.map(p =>
    '<div class="a-prov"><h4><i class="' + p.icon + '" style="color:' + p.color + '"></i> ' + p.name + '</h4>' +
    '<small>eCPM: $' + (p.rate * 0.3).toFixed(2) + '</small>' +
    '<div class="a-prov-stat"><span>' + p.offers + ' offers</span><span>Rating: ' + p.rate + '/5</span></div>' +
    '<label class="toggle-row" style="margin-top:12px"><span>Active</span><input type="checkbox" checked class="tgl"></label></div>'
  ).join('');
}

async function loadAdminRewards() {
  const tb = document.getElementById('aRewardsTb');
  if (!tb) return;
  const rewards = [
    { name: 'PayPal $1', cat: 'PayPal', cost: 10000, price: 1.0, stock: 999 },
    { name: 'PayPal $5', cat: 'PayPal', cost: 50000, price: 5.0, stock: 500 },
    { name: 'USDT $1', cat: 'Crypto', cost: 10000, price: 1.0, stock: 999 },
    { name: 'PUBG 600UC', cat: 'Gaming', cost: 30000, price: 3.0, stock: 200 },
    { name: 'Amazon $5', cat: 'Gift Card', cost: 55000, price: 5.0, stock: 100 }
  ];
  tb.innerHTML = rewards.map(r => {
    const margin = ((r.price - r.cost / SITE.coinRate) / r.price * 100).toFixed(1);
    return '<tr><td><b>' + r.name + '</b></td><td>' + r.cat + '</td>' +
      '<td>' + formatCoins(r.cost) + '</td><td>$' + r.price.toFixed(2) + '</td>' +
      '<td class="green">' + margin + '%</td><td>' + r.stock + '</td>' +
      '<td><span class="badge badge-green">Active</span></td>' +
      '<td><button class="tb-btn tb-btn-edit">Edit</button></td></tr>';
  }).join('');
}

async function loadAdminOrders() {
  const tb = document.getElementById('aOrdersTb');
  if (!tb) return;
  const snap = await db.collection('orders').orderBy('ts', 'desc').limit(20).get();
  if (snap.empty) {
    tb.innerHTML = '<tr><td colspan="8" class="muted">No orders yet</td></tr>';
    return;
  }
  tb.innerHTML = snap.docs.map(d => {
    const o = d.data();
    return '<tr><td>' + d.id.substr(0, 8) + '</td><td>' + (o.username || '-') + '</td>' +
      '<td>' + (o.item || o.type || '-') + '</td><td>$' + ((o.coins || 0) / SITE.coinRate).toFixed(2) + '</td>' +
      '<td>' + formatCoins(o.coins || 0) + '</td>' +
      '<td><span class="badge badge-' + (o.status === 'completed' ? 'green' : o.status === 'pending' ? 'yellow' : 'red') + '">' + (o.status || '-') + '</span></td>' +
      '<td>' + timeAgo(o.ts) + '</td>' +
      '<td><button class="tb-btn tb-btn-approve" onclick="fulfillOrder(\'' + d.id + '\')">Fulfill</button></td></tr>';
  }).join('');
}

async function fulfillOrder(id) {
  await db.collection('orders').doc(id).update({ status: 'completed', fulfilledAt: Date.now() });
  toast('Order fulfilled');
  loadAdminOrders();
  addLog('admin', 'Order ' + id + ' fulfilled');
}

function filterAW(status, btn) {
  document.querySelectorAll('#awithdraw .cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadAdminWithdrawals(status);
}

async function loadAdminWithdrawals(filter) {
  const tb = document.getElementById('aWithdrawTb');
  if (!tb) return;
  let q = db.collection('withdrawals').orderBy('ts', 'desc').limit(50);
  if (filter && filter !== 'all') q = q.where('status', '==', filter);
  const snap = await q.get();
  if (snap.empty) {
    tb.innerHTML = '<tr><td colspan="7" class="muted">No withdrawals</td></tr>';
    return;
  }
  tb.innerHTML = snap.docs.map(d => {
    const w = d.data();
    const riskClass = (w.riskScore || 0) >= 70 ? 'red' : (w.riskScore || 0) >= 40 ? 'yellow' : 'green';
    return '<tr><td><b>' + (w.username || '-') + '</b></td>' +
      '<td>' + formatCoins(w.amount) + ' ($' + (w.usd || '0') + ')</td>' +
      '<td>' + (w.method || '-') + '</td>' +
      '<td><span class="badge badge-' + riskClass + '">' + (w.riskScore || 0) + '%</span></td>' +
      '<td><span class="badge badge-' + (w.status === 'completed' ? 'green' : w.status === 'approved' ? 'blue' : w.status === 'rejected' ? 'red' : 'yellow') + '">' + (w.status || '-') + '</span></td>' +
      '<td>' + timeAgo(w.ts) + '</td>' +
      '<td>' +
      (w.status === 'pending' ? '<button class="tb-btn tb-btn-approve" onclick="approveWithdraw(\'' + d.id + '\',\'' + w.uid + '\',' + w.amount + ')">Approve</button> <button class="tb-btn tb-btn-reject" onclick="rejectWithdraw(\'' + d.id + '\',\'' + w.uid + '\',' + w.amount + ')">Reject</button>' : '') +
      (w.status === 'approved' ? '<button class="tb-btn tb-btn-view" onclick="completeWithdraw(\'' + d.id + '\',\'' + w.uid + '\',' + w.amount + ')">Complete</button>' : '') +
      '</td></tr>';
  }).join('');
}

async function approveWithdraw(id, uid, amount) {
  await db.collection('withdrawals').doc(id).update({ status: 'approved', approvedAt: Date.now() });
  addLog('admin', 'Withdrawal ' + id + ' approved');
  toast('Withdrawal approved');
  loadAdminWithdrawals('pending');
}

async function rejectWithdraw(id, uid, amount) {
  await db.collection('withdrawals').doc(id).update({ status: 'rejected', rejectedAt: Date.now() });
  await db.collection('users').doc(uid).update({
    coins: firebase.firestore.FieldValue.increment(amount),
    pendingWithdraw: firebase.firestore.FieldValue.increment(-amount)
  });
  await db.collection('transactions').add({
    uid, type: 'bonus', amount: amount,
    desc: 'Withdrawal rejected - coins refunded', ts: Date.now()
  });
  addLog('admin', 'Withdrawal ' + id + ' rejected, ' + amount + ' coins refunded');
  toast('Withdrawal rejected, coins refunded');
  loadAdminWithdrawals('pending');
}

async function completeWithdraw(id, uid, amount) {
  await db.collection('withdrawals').doc(id).update({ status: 'completed', completedAt: Date.now() });
  await db.collection('users').doc(uid).update({
    pendingWithdraw: firebase.firestore.FieldValue.increment(-amount),
    totalWithdrawn: firebase.firestore.FieldValue.increment(amount)
  });
  addLog('admin', 'Withdrawal ' + id + ' completed');
  toast('Withdrawal completed');
  loadAdminWithdrawals('approved');
}

async function loadAdminFraud() {
  const snap = await db.collection('users').get();
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('afHigh').textContent = users.filter(u => (u.riskScore || 0) >= 70).length;
  document.getElementById('afVPN').textContent = users.filter(u => (u.flags || []).includes('vpn')).length;
  document.getElementById('afMulti').textContent = users.filter(u => (u.flags || []).includes('multi-account')).length;
  document.getElementById('afCB').textContent = '0';
  document.getElementById('afDev').textContent = users.filter(u => (u.flags || []).includes('shared-device')).length;
  const tb = document.getElementById('aFraudTb');
  if (!tb) return;
  const flagged = users.filter(u => (u.riskScore || 0) >= 40 || (u.flags || []).length > 0).slice(0, 20);
  if (flagged.length === 0) {
    tb.innerHTML = '<tr><td colspan="6" class="muted">No fraud alerts</td></tr>';
    return;
  }
  tb.innerHTML = flagged.map(u =>
    '<tr><td><b>' + u.username + '</b></td>' +
    '<td>' + ((u.flags || []).join(', ') || 'None') + '</td>' +
    '<td>Risk: ' + (u.riskScore || 0) + '%</td>' +
    '<td><span class="badge badge-' + ((u.riskScore || 0) >= 70 ? 'red' : 'yellow') + '">' + ((u.riskScore || 0) >= 70 ? 'High' : 'Medium') + '</span></td>' +
    '<td>' + timeAgo(u.lastLogin) + '</td>' +
    '<td><button class="tb-btn tb-btn-suspend" onclick="toggleUserStatus(\'' + u.id + '\',\'suspended\')">Suspend</button></td></tr>'
  ).join('');
  const rules = document.getElementById('fraudRules');
  if (rules) {
    rules.innerHTML = [
      { name: 'VPN Detection', desc: 'Block offers from VPN/proxy IPs', active: true },
      { name: 'Multi-Account', desc: 'Flag same device/fingerprint users', active: true },
      { name: 'Velocity Check', desc: 'Limit offers per hour', active: true },
      { name: 'Country Mismatch', desc: 'Flag location changes', active: true },
      { name: 'Emulator Detection', desc: 'Block emulated devices', active: false },
      { name: 'Self-Referral', desc: 'Detect self-referral patterns', active: true }
    ].map(r =>
      '<div class="fraud-rule"><div><h4>' + r.name + '</h4><small>' + r.desc + '</small></div>' +
      '<label class="toggle-row"><input type="checkbox" ' + (r.active ? 'checked' : '') + ' class="tgl"></label></div>'
    ).join('');
  }
}

function loadAdminFinance() {
  document.getElementById('fGross').textContent = '$2,450.00';
  document.getElementById('fRewards').textContent = '$1,200.00';
  document.getElementById('fFees').textContent = '$85.00';
  document.getElementById('fCB').textContent = '$12.00';
  document.getElementById('fNetRev').textContent = '$1,150.00';
  document.getElementById('fNetProfit').textContent = '$840.00';
  renderAdminChart('pnlChart', 'P&L', [120, 150, 130, 180, 160, 200, 175]);
}

function loadAdminAnalytics() {
  document.getElementById('anDAU').textContent = formatNum(Math.floor(2000 + Math.random() * 500));
  document.getElementById('anWAU').textContent = formatNum(Math.floor(8000 + Math.random() * 2000));
  document.getElementById('anMAU').textContent = formatNum(Math.floor(25000 + Math.random() * 5000));
  document.getElementById('anSess').textContent = (8 + Math.floor(Math.random() * 7)) + 'm';
  document.getElementById('anViews').textContent = formatNum(Math.floor(15000 + Math.random() * 5000));
  document.getElementById('anComp').textContent = formatNum(Math.floor(800 + Math.random() * 400));
  document.getElementById('anAvgR').textContent = '$' + (1.5 + Math.random() * 2).toFixed(2);
  document.getElementById('anRet').textContent = (30 + Math.floor(Math.random() * 20)) + '%';
  renderAdminChart('growthChart', 'Growth', [200, 280, 350, 420, 510, 580, 650]);
}

async function loadAdminCampaigns() {
  const tb = document.getElementById('aCampaignsTb');
  if (!tb) return;
  const campaigns = [
    { name: 'Summer Promo', start: '2025-06-01', end: '2025-08-31', budget: 500, used: 320, status: 'active' },
    { name: 'Back to School', start: '2025-08-15', end: '2025-09-30', budget: 300, used: 0, status: 'scheduled' },
    { name: 'Holiday Bonus', start: '2025-12-01', end: '2025-12-31', budget: 1000, used: 0, status: 'scheduled' }
  ];
  tb.innerHTML = campaigns.map(c =>
    '<tr><td><b>' + c.name + '</b></td><td>' + c.start + '</td><td>' + c.end + '</td>' +
    '<td>$' + c.budget + '</td><td>$' + c.used + '</td>' +
    '<td><span class="badge badge-' + (c.status === 'active' ? 'green' : 'blue') + '">' + c.status + '</span></td>' +
    '<td><button class="tb-btn tb-btn-edit">Edit</button></td></tr>'
  ).join('');
}

async function loadAdminTickets() {
  const tb = document.getElementById('aTicketsTb');
  if (!tb) return;
  const snap = await db.collection('tickets').orderBy('ts', 'desc').limit(20).get();
  if (snap.empty) {
    tb.innerHTML = '<tr><td colspan="8" class="muted">No tickets</td></tr>';
    return;
  }
  tb.innerHTML = snap.docs.map(d => {
    const t = d.data();
    return '<tr><td>' + d.id.substr(0, 8) + '</td><td>' + (t.username || '-') + '</td>' +
      '<td>' + (t.category || '-') + '</td>' +
      '<td><span class="badge badge-' + (t.priority === 'Urgent' ? 'red' : t.priority === 'High' ? 'yellow' : 'blue') + '">' + (t.priority || '-') + '</span></td>' +
      '<td>' + (t.subject || '-') + '</td>' +
      '<td><span class="badge badge-' + (t.status === 'open' ? 'yellow' : 'green') + '">' + (t.status || '-') + '</span></td>' +
      '<td>' + timeAgo(t.ts) + '</td>' +
      '<td><button class="tb-btn tb-btn-view" onclick="toast(\'Ticket detail coming soon\',\'info\')">View</button></td></tr>';
  }).join('');
}

async function loadLogs() {
  const c = document.getElementById('logsList');
  if (!c) return;
  const filter = document.getElementById('logFilter')?.value || 'all';
  let q = db.collection('auditLogs').orderBy('ts', 'desc').limit(50);
  if (filter !== 'all') q = q.where('category', '==', filter);
  const snap = await q.get();
  if (snap.empty) {
    c.innerHTML = '<div class="empty"><i class="fas fa-list-alt"></i><p>No logs</p></div>';
    return;
  }
  c.innerHTML = snap.docs.map(d => {
    const l = d.data();
    return '<div class="tx-item">' +
      '<div class="tx-ico ' + (l.category === 'fraud' ? 'spend' : l.category === 'auth' ? 'bonus' : 'earn') + '">' +
      '<i class="fas fa-' + (l.category === 'auth' ? 'sign-in-alt' : l.category === 'admin' ? 'tools' : l.category === 'fraud' ? 'exclamation-triangle' : 'edit') + '"></i></div>' +
      '<div class="tx-info"><h4>' + (l.action || '-') + '</h4><p>' + (l.category || '-') + '</p></div>' +
      '<span class="muted">' + timeAgo(l.ts) + '</span></div>';
  }).join('');
}

/* --- Audit Logging --- */
async function addLog(category, action) {
  try {
    await db.collection('auditLogs').add({
      category, action,
      uid: currentUser?.uid || 'system',
      username: userData?.username || 'system',
      ts: Date.now()
    });
  } catch (e) { /* silent */ }
}

/* --- Initial Load --- */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('loader').style.display = 'none';
  }, 5000);
});

/* --- Adsterra Native Banner --- */
(function() {
  var sc = document.createElement('script');
  sc.async = true;
  sc.dataset.cfasync = 'false';
  sc.src = 'https://pl30883341.effectivecpmnetwork.com/f4263ddbfe2b4cb1e4ebdad01fc57d37/invoke.js';
  var s = document.getElementsByTagName('script')[0];
  if (s && s.parentNode) s.parentNode.insertBefore(sc, s);
})();

/* --- 468x60 Banner --- */
(function() {
  var d = document;
  vars = {};
  vars.tm = '1755436800';
  vars.g = 'c26b6f67e990df9cd2681f276abe3231';
  vars.u = 'https://pl30883338.effectivecpmnetwork.com/k92kfsc3';
  vars.w = '468';
  vars.h = '60';
  var s = d.createElement('script');
  s.src = vars.u + '/loader.js';
  s.async = true;
  if (d.getElementById('banner468')) {
    d.getElementById('banner468').appendChild(s);
  }
})();
