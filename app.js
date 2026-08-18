/* ============================================================================
   REWORDS PLATFORM — app.js
   Full user application: auth, wallet/ledger, offers, games, surveys, rewarded
   ads, daily rewards, streaks, referrals, leaderboard, store, top-up,
   withdrawals, notifications, support, profile, security, fraud & i18n (EN/AR).
   ============================================================================ */

/* ============================================================================
   1. FIREBASE CONFIG & INITIALIZATION
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

let app = null;
let db = null;
let auth = null;
let storage = null;
let analytics = null;

try {
  app = firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore(app);
  auth = firebase.auth(app);
  storage = firebase.storage(app);
  if (firebase.analytics) analytics = firebase.analytics(app);
} catch (e) {
  console.error("Firebase init failed", e);
}

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const increment = (n) => firebase.firestore.FieldValue.increment(n || 1);
const arrayUnion = (v) => firebase.firestore.FieldValue.arrayUnion(v);
const arrayRemove = (v) => firebase.firestore.FieldValue.arrayRemove(v);
const deleteField = () => firebase.firestore.FieldValue.delete();
const docRef = (path) => db.doc(path);
const colRef = (path) => db.collection(path);

/* ============================================================================
   2. GLOBAL STATE
   ============================================================================ */
const State = {
  user: null,           // firebase auth user
  profile: null,        // users/{uid}
  wallet: null,         // computed wallet from ledger
  ledger: [],           // ledger entries
  settings: {},         // settings doc cache
  offers: [],           // offers
  games: [],
  surveys: [],
  rewards: [],
  providers: [],
  faqs: [],
  notifications: [],
  tickets: [],
  referrers: [],
  events: [],
  promos: [],
  posts: [],
  currentPage: 'home',
  currentOfferProvider: 'recommended',
  currentOfferCategory: 'all',
  currentRewardCategory: 'all',
  currentLeaderPeriod: 'today',
  lang: localStorage.getItem('rewords_lang') || 'en',
  theme: localStorage.getItem('rewords_theme') || 'dark',
  offerPage: 1,
  txPage: 1,
  selectedTopupGame: 'Free Fire',
  selectedTopupPackage: null,
  selectedWdm: 'PayPal',
  unfilteredLedger: []
};

/* ============================================================================
   3. PLATFORM CONSTANTS
   ============================================================================ */
const COIN_RATE = 10000;      // 10,000 coins = $1
const WITHDRAW_MIN = 10000;   // min withdrawal in coins ($1)
const AD_REWARD = 120;        // coins per rewarded ad
const AD_DAILY_CAP = 15;      // max rewarded ads per day
const DAILY_PLAN = [
  { day: 1, reward: 50 },
  { day: 2, reward: 100 },
  { day: 3, reward: 200 },
  { day: 4, reward: 350 },
  { day: 5, reward: 500 },
  { day: 6, reward: 750 },
  { day: 7, reward: 1000 }
];
const WHEEL_SLICES = [
  { reward: 50,  color: "linear-gradient(135deg,#ff6a00,#ffb800)" },
  { reward: 100, color: "linear-gradient(135deg,#6a11cb,#2575fc)" },
  { reward: 200, color: "linear-gradient(135deg,#00e676,#009688)" },
  { reward: 50,  color: "linear-gradient(135deg,#ff3d71,#ff6b6b)" },
  { reward: 500, color: "linear-gradient(135deg,#667eea,#764ba2)" },
  { reward: 100, color: "linear-gradient(135deg,#f5af19,#f12711)" },
  { reward: 250, color: "linear-gradient(135deg,#11998e,#38ef7d)" },
  { reward: 50,  color: "linear-gradient(135deg,#fc466b,#3f5efb)" }
];
const XP_PER_LEVEL = 500;
const RANK_NAMES = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond" };

/* ============================================================================
   4. I18N DICTIONARY — ENGLISH
   ============================================================================ */
const I18N_EN = {
  "nav.home": "Home",
  "nav.earn": "Earn",
  "nav.games": "Games",
  "nav.offers": "Offers",
  "nav.surveys": "Surveys",
  "nav.watch": "Watch Ads",
  "nav.daily": "Daily Rewards",
  "nav.rewards": "Rewards",
  "nav.referral": "Referral",
  "nav.leaderboard": "Leaderboard",
  "nav.support": "Support",
  "nav.tasks": "Tasks",
  "nav.challenges": "Challenges",
  "nav.streaks": "Streaks",
  "nav.topup": "Top Up",
  "nav.withdraw": "Withdraw",
  "nav.transactions": "Transactions",
  "nav.wallet": "Wallet",
  "nav.notifications": "Notifications",
  "nav.profile": "Profile",
  "nav.security": "Security",
  "nav.faq": "FAQ",
  "nav.terms": "Terms",
  "nav.privacy": "Privacy",
  "nav.antifraud": "Status",
  "nav.promo": "Promo Codes",
  "nav.events": "Events",
  "nav.blog": "News",
  "nav.more": "More",
  "nav.history": "History",
  "nav.offlinerewards": "Offline Rewards",
  "mnav.home": "Home",
  "mnav.earn": "Earn",
  "mnav.daily": "Daily",
  "mnav.rewards": "Rewards",
  "mnav.profile": "Profile",
  "home.startEarning": "Start Earning",
  "home.dailyReward": "Daily Reward",
  "home.browseRewards": "Browse Rewards",
  "home.statUsers": "Happy Users",
  "home.statPaid": "Paid Out",
  "home.statCoins": "Coins Awarded",
  "home.statTop": "Top Earner Today",
  "home.streak": "Day Streak",
  "home.dailyTitle": "Your Daily Reward is Ready!",
  "home.claimNow": "Claim Now",
  "home.popularRewards": "Popular Rewards",
  "home.seeAll": "See All",
  "home.topOffers": "Top Earning Offers",
  "home.topGames": "Top Earning Games",
  "home.bestSurveys": "Best Surveys",
  "home.watchCtaTitle": "Watch Ads, Earn Instant Coins",
  "home.watchCtaSub": "Short rewarded videos pay coins instantly. No catch.",
  "home.startWatching": "Start Watching",
  "home.referCtaTitle": "Invite Friends & Earn Together",
  "home.referCtaSub": "Earn bonus coins for every friend who joins and completes their first offer.",
  "home.referNow": "Get Referral Link",
  "home.topUsers": "Best Users Today",
  "home.recentlyCompleted": "Recently Completed",
  "home.personalized": "Personalized For You",
  "home.withdrawNoticeTitle": "Withdrawal Notice",
  "home.withdrawNoticeBody": "Your withdrawal is being processed. You'll be notified once it's completed.",
  "home.faqTitle": "Frequently Asked Questions",
  "home.howTitle": "How It Works",
  "home.step1": "Create Your Account",
  "home.step1Sub": "Sign up free in seconds with email or Google.",
  "home.step2": "Complete Tasks & Offers",
  "home.step2Sub": "Play games, take surveys, watch ads and more.",
  "home.step3": "Withdraw Your Earnings",
  "home.step3Sub": "Cash out via PayPal, crypto, bank and more.",
  "home.trustTitle": "Trusted Partners",
  "home.featuresTitle": "Why Rewords?",
  "home.fInstant": "Instant Rewards",
  "home.fInstantSub": "Get rewarded moments after completing tasks.",
  "home.fSecure": "Secure & Safe",
  "home.fSecureSub": "Advanced anti-fraud and data protection.",
  "home.fGlobal": "Global Offers",
  "home.fGlobalSub": "Thousands of offers available worldwide.",
  "home.fDaily": "Daily Bonuses",
  "home.fDailySub": "Check in daily for streak bonuses.",
  "home.fWithdraw": "Low Minimums",
  "home.fWithdrawSub": "Withdraw from as little as $1.",
  "home.fSupport": "24/7 Support",
  "home.fSupportSub": "Our team is always here to help.",
  "home.gamesShowcase": "Game Showcase",
  "home.eventsTitle": "Limited-Time Events",
  "home.event1Title": "Double Coins Weekend",
  "home.event1Sub": "Earn 2x coins on all offers this weekend!",
  "home.event2Title": "New User Boost",
  "home.event2Sub": "New users get a welcome bonus up to 1,000 coins!",
  "home.transparency": "How Your Rewards Are Funded",
  "home.transparencySub": "Every reward you earn is backed by real revenue from our partners.",
  "home.fStep1": "You complete an offer",
  "home.fStep2": "Partner confirms & pays",
  "home.fStep3": "You earn coins",
  "home.fStep4": "You withdraw & win",
  "home.fMetric1": "100%",
  "home.fMetric1Sub": "Funded by real revenue",
  "home.fMetric2": "Anti-Fraud",
  "home.fMetric2Sub": "Every reward is verified",
  "home.fMetric3": "Secure",
  "home.fMetric3Sub": "Encrypted payments",
  "home.paymentMethods": "Payment Methods",
  "home.pmFast": "Fast",
  "home.pmCrypto": "Crypto",
  "home.pmSecure": "Secure",
  "home.pmBank": "Bank",
  "home.community": "Community Wins",
  "home.newsTitle": "Get Exclusive Offers",
  "home.newsSub": "Join our newsletter for bonus codes, events and offers.",
  "home.newsSubscribe": "Subscribe",
  "earn.title": "Earn Coins",
  "earn.sub": "Pick a provider below to start completing offers and earning coins.",
  "earn.freecashTitle": "Freecash — Earn Cash for Playing Games",
  "earn.freecashSub": "Play games, install apps and take surveys with Freecash.",
  "earn.smartlinkTitle": "Explore Partner Networks",
  "earn.smartlinkSub": "Discover great offers across our partner network.",
  "earn.explore": "Explore",
  "earn.sponsoredTasks": "Sponsored Tasks",
  "earn.adOpportunities": "Ad Opportunities",
  "earn.allOffers": "All Offers",
  "earn.searchPlaceholder": "Search offers...",
  "offers.title": "Offers",
  "offers.sub": "Complete tasks from our trusted partners and get rewarded instantly.",
  "offers.searchPlaceholder": "Search offers...",
  "offers.sortByReward": "Sort: Reward",
  "games.title": "Games",
  "games.sub": "Install games, reach milestones and earn big coin rewards along the way.",
  "games.searchPlaceholder": "Search games...",
  "games.milestones": "Milestone Rewards",
  "games.mInstall": "Install",
  "games.mFinal": "Final",
  "games.play": "Play & Earn",
  "games.highReward": "High Reward Games",
  "surveys.title": "Surveys",
  "surveys.sub": "Share your opinion and earn coins. Surveys fill up fast — complete them early!",
  "watch.title": "Watch Ads & Earn",
  "watch.sub": "Watch short rewarded videos and earn instant coins. Daily cap applies.",
  "watch.watchedToday": "Ads Watched Today",
  "watch.earnedToday": "Coins Earned Today",
  "watch.remaining": "Ads Remaining Today",
  "watch.rewVideoTitle": "Rewarded Video",
  "watch.rewVideoSub": "Watch a short video to earn instant coins.",
  "watch.watchNow": "Watch Now",
  "watch.spinTitle": "Bonus Wheel Spin",
  "watch.spinSub": "Watch an ad to unlock the bonus wheel and spin for big coins.",
  "watch.spinBtn": "Go to Wheel",
  "watch.adSlots": "More Ways to Earn",
  "watch.m1": "Daily Ad Bonus",
  "watch.m1Sub": "+300 coins daily",
  "watch.claim": "Claim",
  "watch.m2": "Interstitial Reward",
  "watch.m2Sub": "+200 coins",
  "watch.m3": "Bonus Spin",
  "watch.m3Sub": "Up to +1,000 coins",
  "daily.title": "Daily Rewards",
  "daily.sub": "Log in every day and claim rewards. Don't break your streak!",
  "daily.streak": "Current Streak",
  "daily.bonus": "Next Reward Bonus",
  "daily.week": "7-Day Reward Plan",
  "daily.day": "Day",
  "daily.claim": "Claim Today's Reward",
  "daily.streakVisual": "Your Streak",
  "daily.spinWheel": "Bonus Spin Wheel",
  "daily.spin": "Spin the Wheel",
  "daily.scratch": "Scratch Card",
  "daily.scratchHint": "Scratch to reveal!",
  "daily.mystery": "Mystery Box",
  "daily.treasure": "Daily Treasure",
  "daily.bonusInfo": "Bonus Multiplier",
  "daily.b1": "Day 1-3",
  "daily.b2": "Day 4-6",
  "daily.b3": "Day 7+",
  "daily.b4": "Freeze",
  "daily.freezeInfo": "Streak Freeze",
  "daily.freezeInfoSub": "Missing a day? A streak freeze keeps your streak alive.",
  "daily.freezeHow": "Earn more freezes",
  "tasks.title": "Tasks",
  "tasks.sub": "Complete daily and weekly tasks to boost your earnings.",
  "tasks.daily": "Daily Tasks",
  "tasks.weekly": "Weekly Tasks",
  "tasks.t1": "Log In",
  "tasks.t1Sub": "Visit the platform today",
  "tasks.t2": "Watch 3 Ads",
  "tasks.t2Sub": "0/3 rewarded videos",
  "tasks.t3": "Complete 1 Offer",
  "tasks.t3Sub": "Any offer from the wall",
  "tasks.t4": "Install 3 Games",
  "tasks.t4Sub": "0/3 game installs",
  "tasks.t5": "Invite 2 Friends",
  "tasks.t5Sub": "0/2 active referrals",
  "tasks.t6": "Earn 5,000 Coins",
  "tasks.t6Sub": "0/5,000 coins",
  "challenges.title": "Challenges",
  "challenges.sub": "Push your limits and unlock big rewards.",
  "challenges.daily": "Daily Challenges",
  "challenges.weekly": "Weekly Challenges",
  "challenges.monthly": "Monthly Challenges",
  "checkin.title": "Daily Check-in",
  "checkin.sub": "Check in every day to keep your streak and earn bonuses.",
  "checkin.checkIn": "Check In Now",
  "streaks.title": "Streaks",
  "streaks.sub": "Keep your streak going to unlock increasing bonuses.",
  "streaks.current": "Current Streak",
  "streaks.best": "Best Streak",
  "streaks.freezes": "Freeze Streaks",
  "streaks.monthView": "This Month",
  "referral.title": "Invite & Earn Unlimited Coins",
  "referral.sub": "Share your link and earn bonus coins for every friend who joins and earns.",
  "referral.totalInvited": "Friends Invited",
  "referral.earned": "Referral Coins Earned",
  "referral.active": "Active Friends",
  "referral.shareLink": "Your Referral Link",
  "referral.copy": "Copy",
  "referral.share": "Share",
  "referral.enterCode": "Enter a referral code...",
  "referral.apply": "Apply",
  "referral.milestones": "Referral Milestones",
  "referral.myFriends": "My Referrals",
  "referral.earnSub": "Plus, earn 10% of the coins your referrals earn — forever.",
  "ref.m1Title": "Friend Joins",
  "ref.m1Sub": "When your friend signs up with your link",
  "ref.m2Title": "First Activity",
  "ref.m2Sub": "Friend completes their first task",
  "ref.m3Title": "First Offer",
  "ref.m3Sub": "Friend completes their first offer",
  "ref.m4Title": "5 Referrals",
  "ref.m4Sub": "Invite 5 active friends",
  "ref.m5Title": "10 Referrals",
  "ref.m5Sub": "Invite 10 active friends",
  "ref.m6Title": "First Withdrawal",
  "ref.m6Sub": "Friend makes their first withdrawal",
  "leaderboard.title": "Leaderboard",
  "leaderboard.sub": "Compete with the best earners and climb the ranks.",
  "rewards.title": "Rewards Store",
  "rewards.sub": "Spend your coins on gift cards, game top-ups and more.",
  "rewards.giftCards": "Gift Cards",
  "rewards.gcGoogle": "Instant Delivery",
  "rewards.gcApple": "Instant Delivery",
  "rewards.gcSteam": "Instant Delivery",
  "rewards.crypto": "Crypto Rewards",
  "rewards.gameTopup": "Game Top-Up",
  "topup.title": "Game Top-Up",
  "topup.sub": "Instantly top up your favorite games using your coins.",
  "topup.selectGame": "1. Select Game",
  "topup.diamonds": "Diamonds & bundles",
  "topup.instant": "Instant",
  "topup.uc": "Unknown Cash (UC)",
  "topup.robux": "Robux",
  "topup.gems": "Gems",
  "topup.vp": "Valorant Points (VP)",
  "topup.fcPoints": "FC Points",
  "topup.selectRegion": "2. Region",
  "topup.playerId": "3. Player ID",
  "topup.playerIdPh": "Enter your player ID",
  "topup.serverIdPh": "Server ID (optional)",
  "topup.selectPackage": "4. Select Package",
  "topup.paymentMethod": "5. Payment Method",
  "topup.coins": "Coins Balance",
  "topup.cash": "Cash",
  "topup.cashSub": "Pay with real money",
  "topup.summary": "Order Summary",
  "topup.game": "Game",
  "topup.package": "Package",
  "topup.player": "Player ID",
  "topup.region": "Region",
  "topup.cost": "Cost",
  "topup.confirm": "Confirm & Top-Up",
  "tp.p1": "100 Diamonds",
  "tp.p2": "310 Diamonds",
  "tp.p3": "520 Diamonds",
  "tp.p4": "1,060 Diamonds",
  "withdraw.title": "Withdraw",
  "withdraw.sub": "Cash out your coins through your preferred method.",
  "withdraw.minimum": "Minimum Withdrawal",
  "withdraw.selectMethod": "1. Select Method",
  "withdraw.amount": "2. Amount",
  "withdraw.details": "3. Account Details",
  "withdraw.summary": "Withdrawal Summary",
  "withdraw.method": "Method",
  "withdraw.amount": "Amount",
  "withdraw.receive": "You Receive",
  "withdraw.fee": "Fee",
  "withdraw.request": "Request Withdrawal",
  "withdraw.hint": "Withdrawals are reviewed for security and typically processed within 24-72 hours.",
  "withdraw.paypalSub": "Fast, worldwide",
  "withdraw.feeTag": "fee",
  "withdraw.crypto": "Crypto",
  "withdraw.cryptoSub": "BTC, ETH, USDT",
  "withdraw.bank": "Bank Transfer",
  "withdraw.bankSub": "SWIFT / local",
  "withdraw.mobileMoney": "Mobile Money",
  "withdraw.mobileMoneySub": "MTN, Vodafone, Airtel",
  "transactions.title": "Transactions",
  "transactions.sub": "Complete history of your ledger activity.",
  "notifications.title": "Notifications",
  "notifications.sub": "Stay up to date with your account activity.",
  "notifications.markAll": "Mark All Read",
  "notifications.clearAll": "Clear All",
  "support.title": "Support Center",
  "support.sub": "Need help? Open a ticket and our team will assist you.",
  "support.avgTime": "Avg. Response",
  "support.solved": "Tickets Solved",
  "support.open": "Open Tickets",
  "support.rating": "User Rating",
  "support.myTickets": "My Tickets",
  "support.newTicket": "New Ticket",
  "support.liveChat": "Rewords Assistant",
  "support.chatPlaceholder": "Type a message...",
  "support.category": "Category",
  "support.subject": "Subject",
  "support.message": "Message",
  "support.attachInfo": "Attach account info & screenshots",
  "support.submit": "Submit Ticket",
  "support.kb": "Knowledge Base",
  "support.tSample": "Withdrawal question",
  "support.tSampleSub": "2 hours ago",
  "support.tSample2": "Offer not credited",
  "support.tSample2Sub": "3 days ago",
  "kb.earnTitle": "How to Earn Fast",
  "kb.earnSub": "Tips to maximize your coin earnings.",
  "kb.withdrawTitle": "Withdrawal Guide",
  "kb.withdrawSub": "Step-by-step withdrawal instructions.",
  "kb.gamesTitle": "Game Top-Up Help",
  "kb.gamesSub": "Fix common top-up issues.",
  "kb.offersTitle": "Offer Not Crediting?",
  "kb.offersSub": "What to do when offers don't credit.",
  "kb.secureTitle": "Account Security",
  "kb.secureSub": "Keep your account protected.",
  "kb.refTitle": "Referral Guide",
  "kb.refSub": "Earn more with referrals.",
  "sfq.q1": "How to earn?",
  "sfq.q1Sub": "Offers, games, surveys & ads.",
  "sfq.q2": "Withdrawal time?",
  "sfq.q2Sub": "Usually 24-72 hours.",
  "sfq.q3": "Top-up issues?",
  "sfq.q3Sub": "We resolve within 24h.",
  "chat.welcome": "Hi! I'm the Rewords assistant. Ask me anything about earning, withdrawals or your account.",
  "chat.q1": "How do I withdraw?",
  "chat.a1": "Easy! Go to the Withdraw page, pick your method, enter your details and confirm. Withdrawals are usually processed within 24-72 hours.",
  "profile.edit": "Edit",
  "profile.completed": "Offers Completed",
  "profile.withdrawn": "Withdrawn",
  "profile.achievements": "Achievements",
  "profile.badges": "Badges",
  "profile.referralCode": "My Referral Code",
  "profile.sessions": "Active Sessions",
  "profile.devices": "Devices",
  "profile.security": "Security",
  "profile.goSecurity": "Manage Security",
  "profile.deleteAccount": "Delete Account",
  "profile.username": "Username",
  "profile.country": "Country",
  "profile.bio": "Bio",
  "profile.save": "Save Changes",
  "ach.a1": "First Game Installed",
  "ach.a1Sub": "Install your first game",
  "ach.a2": "First Survey",
  "ach.a2Sub": "Complete your first survey",
  "ach.a3": "High Roller",
  "ach.a3Sub": "Earn 100,000 coins total",
  "ach.a4": "Referral Star",
  "ach.a4Sub": "Invite 10 friends",
  "ach.a5": "Streak Master",
  "ach.a5Sub": "Maintain a 30-day streak",
  "pf.thisDevice": "This device",
  "pf.currentSession": "Current session",
  "security.title": "Security",
  "security.sub": "Protect your account with these security features.",
  "security.email": "Email Verified",
  "security.verify": "Verify",
  "security.phone": "Phone Number",
  "security.add": "Add",
  "security.twoFa": "Two-Factor Auth",
  "security.twoFaSub": "Add extra protection",
  "security.enable": "Enable",
  "security.password": "Password",
  "security.passwordSub": "Last changed recently",
  "security.change": "Change",
  "security.loginHistory": "Login History",
  "security.suspicious": "Suspicious Activity",
  "security.noThreat": "No threats detected",
  "security.noThreatSub": "We continuously monitor your account for suspicious activity.",
  "faq.title": "Frequently Asked Questions",
  "faq.sub": "Everything you need to know about Rewords.",
  "faq.q1": "How do I earn coins?",
  "faq.a1": "Complete offers, play games, take surveys, watch rewarded videos, claim daily rewards and invite friends.",
  "faq.q2": "How do I withdraw my earnings?",
  "faq.a2": "Go to the Withdraw page, choose your method, enter details and confirm. Usually processed within 24-72 hours.",
  "faq.q3": "Why are some coins pending?",
  "faq.a3": "Coins from offers become pending until the offerwall confirms conversion. This protects everyone from fraud.",
  "faq.q4": "Which games can I play?",
  "faq.a4": "Free Fire, PUBG, Roblox, Clash, Mobile Legends, FC Mobile and many more, with milestone rewards.",
  "faq.q5": "Is it safe to use Rewords?",
  "faq.a5": "Yes. Industry-standard encryption, strict anti-fraud, verification, and trusted partners only.",
  "faq.q6": "How does the referral program work?",
  "faq.a6": "Share your link. When friends join and earn, you both get bonus coins.",
  "faq.q7": "How long do top-ups take?",
  "faq.a7": "Most game top-ups are instant. Manual fulfillment may take up to 24 hours.",
  "faq.q8": "What if an offer doesn't credit?",
  "faq.a8": "Open a support ticket within 48 hours with evidence and our team will investigate.",
  "faq.q9": "Can I have more than one account?",
  "faq.a9": "No. Multiple accounts are fraud and will be restricted with rewards revoked.",
  "faq.q10": "Are promo codes real?",
  "faq.a10": "Yes! Follow our channels for limited-time promo codes.",
  "terms.title": "Terms of Service",
  "privacy.title": "Privacy Policy",
  "antifraud.title": "Account Status & Security",
  "antifraud.sub": "Your account's current security and fraud-detection status.",
  "antifraud.riskScore": "Risk Score",
  "antifraud.riskSub": "Lower is better",
  "antifraud.accountStatus": "Account Status",
  "antifraud.checks": "Security Checks",
  "antifraud.verification": "Verification Status",
  "antifraud.fraudLog": "Fraud Protection Log",
  "vf.email": "Email",
  "vf.verified": "Verified",
  "vf.phone": "Phone",
  "vf.notVerified": "Not verified",
  "vf.identity": "Identity",
  "vf.optional": "Optional",
  "vf.device": "Device",
  "vf.trusted": "Trusted",
  "vf.ip": "IP Address",
  "vf.clean": "Clean",
  "vf.risk": "Risk Level",
  "vf.low": "Low",
  "sc.c1": "Device Fingerprint",
  "sc.c1Sub": "Unique device identified",
  "sc.c2": "IP Address",
  "sc.c2Sub": "No VPN or proxy detected",
  "sc.c3": "Emulator Check",
  "sc.c3Sub": "Real device detected",
  "sc.c4": "Duplicate Accounts",
  "sc.c4Sub": "No duplicates found",
  "sc.c5": "Activity Speed",
  "sc.c5Sub": "Normal activity patterns",
  "sc.c6": "Referral Check",
  "sc.c6Sub": "No self-referrals",
  "fl.f1": "Security check passed",
  "fl.f1Sub": "No anomalies detected",
  "fl.f2": "Login verified",
  "fl.f2Sub": "New device authorized",
  "fl.f3": "Referral validated",
  "fl.f3Sub": "Referral program active",
  "ch.checked": "Checked in",
  "wallet.title": "Wallet",
  "wallet.sub": "Your complete coin ledger and balance breakdown.",
  "wallet.available": "Available Coins",
  "wallet.pending": "Pending Coins",
  "wallet.locked": "Locked Coins",
  "wallet.lifetime": "Lifetime Earned",
  "wallet.spent": "Lifetime Spent",
  "wallet.withdrawn": "Total Withdrawn",
  "wallet.withdrawBtn": "Withdraw",
  "wallet.topupBtn": "Top-Up Games",
  "wallet.ledger": "Ledger",
  "wallet.availableCoins": "Available Coins",
  "wl.l1": "Daily Login Reward",
  "wl.l2": "Rewarded Ad",
  "wl.l3": "Referral Bonus",
  "wl.l4": "Game Top-Up",
  "tx.t1": "Daily Reward",
  "cw.w1": "won +2,400 coins",
  "cw.w2": "withdrew $25 via PayPal",
  "cw.w3": "completed a survey",
  "promo.title": "Promo Codes",
  "promo.sub": "Redeem bonus coins with special promo codes.",
  "promo.enter": "Enter Your Promo Code",
  "promo.redeem": "Redeem",
  "promo.hint": "Promo codes are limited to one use per account.",
  "promo.activeCodes": "Active Promo Codes",
  "events.title": "Events & Seasonal",
  "events.sub": "Limited-time events with boosted rewards.",
  "events.active": "Active Events",
  "events.upcoming": "Upcoming Events",
  "events.past": "Past Events",
  "events.endsIn": "Ends in",
  "events.e1Title": "Double Coins Weekend",
  "events.e1Sub": "All offers pay double coins all weekend long.",
  "events.e2Title": "Game Marathon",
  "events.e2Sub": "Earn 20% extra on all game offers.",
  "events.e3Title": "Referral Rush",
  "events.e3Sub": "Triple referral bonuses for one week.",
  "events.e4Title": "Survey Bonanza",
  "events.e4Sub": "Earn 50% more on all surveys.",
  "events.e5Title": "Welcome Bonanza",
  "events.e5Sub": "Ended — thanks for participating!",
  "events.e6Title": "Summer Rewards",
  "events.e6Sub": "Ended — winners have been notified.",
  "blog.title": "News & Tips",
  "blog.sub": "The latest updates, tips and announcements from Rewords.",
  "blog.bTips": "Tips",
  "blog.bUpdate": "Update",
  "blog.bGuide": "Guide",
  "blog.bNews": "News",
  "blog.p1Title": "10 Ways to Earn More Coins",
  "blog.p1Date": "2 days ago",
  "blog.p2Title": "New Games Added This Week",
  "blog.p2Date": "4 days ago",
  "blog.p3Title": "How Withdrawals Work",
  "blog.p3Date": "1 week ago",
  "blog.p4Title": "Double Coins Event This Weekend",
  "blog.p4Date": "2 days ago",
  "blog.p5Title": "Avoid These Offer Scams",
  "blog.p5Date": "1 week ago",
  "blog.p6Title": "New Withdrawal Methods Available",
  "blog.p6Date": "2 weeks ago",
  "history.title": "Check-in History",
  "history.sub": "View all your past check-ins and rewards.",
  "offline.title": "Offline Rewards",
  "offline.sub": "Keep your streak alive even when you miss a day.",
  "offline.freezeTitle": "Streak Freeze",
  "offline.freezeSub": "A streak freeze protects your streak for one missed day.",
  "offline.buyFreeze": "Buy Freeze",
  "more.title": "Explore More",
  "more.sub": "Everything else you might need.",
  "more.promo": "Promo Codes",
  "more.promoSub": "Redeem bonus coins",
  "more.events": "Events",
  "more.eventsSub": "Limited-time boosts",
  "more.blog": "News & Tips",
  "more.blogSub": "Latest updates",
  "more.history": "Check-in History",
  "more.historySub": "Past check-ins",
  "more.offline": "Offline Rewards",
  "more.offlineSub": "Streak freezes",
  "more.faq": "FAQ",
  "more.faqSub": "Common questions",
  "auth.logout": "Log Out",
  "auth.remember": "Remember me",
  "auth.forgot": "Forgot password?",
  "auth.login": "Login",
  "auth.or": "or",
  "auth.signup": "Create Account",
  "auth.hasCode": "I have a referral code",
  "auth.agree": "I agree to the",
  "auth.terms": "Terms of Service",
  "auth.sendReset": "Send Reset Link",
  "auth.back": "Back",
  "auth.verifyTitle": "Verify Your Email",
  "auth.verifySub": "We sent you a verification link. Please check your inbox.",
  "auth.resend": "Resend Email",
  "auth.iVerified": "I've verified — Continue",
  "2fa.title": "Two-Factor Authentication",
  "2fa.totpTitle": "Scan with your authenticator app",
  "2fa.copy": "Copy",
  "2fa.verify": "Verify & Enable",
  "popup.cancel": "Cancel",
  "popup.confirm": "Confirm",
  "popup.rewardTitle": "Reward Earned!",
  "popup.awesome": "Awesome!",
  "footer.about": "Earn coins by completing offers, playing games, taking surveys and watching rewarded ads. Withdraw your earnings today.",
  "footer.earn": "Earn",
  "footer.offers": "Offers",
  "footer.games": "Games",
  "footer.surveys": "Surveys",
  "footer.watch": "Watch Ads",
  "footer.referral": "Referral",
  "footer.account": "Account",
  "footer.wallet": "Wallet",
  "footer.rewards": "Rewards Store",
  "footer.transactions": "Transactions",
  "footer.support": "Support",
  "footer.security": "Security",
  "footer.legal": "Legal",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.faq": "FAQ",
  "footer.status": "Status",
  "footer.rights": "All rights reserved.",
  "footer.language": "English / العربية",
  "auth.needLogin": "Sign in to unlock all features and start earning.",
  "home.unlockStrip": "Create a free account to start earning coins today!",
  "account.pending": "Verification pending",
  "account.restricted": "Account restricted",
  "account.verifyEmail": "Verify your email",
  "account.flagged": "Flagged for review",
  "account.good": "Account healthy",
  "offers.all": "All Providers",
  "offers.viewDetails": "View Details",
  "offers.none": "No offers available",
  "offers.noneSub": "Check back soon — new offers arrive daily.",
  "offers.payout": "Payout",
  "offers.minutes": "Minutes",
  "offers.difficulty": "Difficulty",
  "offers.milestones": "Milestones",
  "offers.howTo": "How to complete",
  "offers.stepDefault": "Complete the required action to get credited.",
  "offers.start": "Start Offer",
  "offers.imDone": "I'm Done",
  "offers.install": "Install",
  "offers.complete": "Complete the offer",
  "offers.creditNote": "Rewards may take up to 5 minutes to appear after completion.",
  "offers.confirmTitle": "Confirm completion",
  "offers.confirmBody": "You are about to claim +{n} coins for completing this offer.",
  "games.none": "No games available",
  "games.noneSub": "New earning games are added regularly.",
  "games.playNow": "Play Now",
  "games.rating": "Rating",
  "games.installs": "Installs",
  "surveys.none": "No surveys available",
  "surveys.general": "General",
  "surveys.min": "min",
  "surveys.slotsLeft": "slots left",
  "surveys.full": "Full",
  "surveys.start": "Start",
  "surveys.submit": "Submit & Earn",
  "surveys.qualified": "Qualification",
  "surveys.disqualify": "You may be disqualified if your answers don't match the target profile.",
  "surveys.question": "How likely are you to recommend our app?",
  "surveys.opt1": "Very likely",
  "surveys.opt2": "Somewhat likely",
  "surveys.opt3": "Not likely",
  "rewards.all": "All Rewards",
  "rewards.from": "From",
  "rewards.outOfStock": "Out of stock",
  "rewards.redeem": "Redeem",
  "rewards.none": "No rewards available",
  "rewards.noneSub": "Rewards are restocked every week.",
  "rewards.confirm": "Confirm Redemption",
  "rewards.confirmRedeem": "Confirm Redemption",
  "rewards.cost": "Cost",
  "rewards.balance": "Your balance",
  "rewards.ordered": "Order placed! You'll receive it within 24 hours.",
  "events.joinNow": "Join Now",
  "events.none": "No events right now",
  "events.noneSub": "Follow us to stay tuned for new events.",
  "events.title": "Event Details",
  "events.reward": "Total reward",
  "events.coins": "coins",
  "blog.read": "Read More",
  "blog.none": "No articles yet",
  "blog.noneSub": "Tips and news coming soon.",
  "watch.perAd": "coins per ad",
  "watch.done": "All done for today",
  "watch.capReached": "Daily ad cap reached. Come back tomorrow!",
  "watch.bonusClaimed": "Bonus already claimed today.",
  "daily.claimed": "Claimed for today",
  "daily.wheelSpun": "Wheel already spun today",
  "daily.wheelReady": "Spin once per day — good luck!",
  "daily.spinning": "Spinning...",
  "daily.scratchDone": "Scratch card used for today",
  "daily.scratchReady": "Tap the card to scratch!",
  "daily.mysteryDone": "Box opened for today",
  "daily.mysteryReady": "Tap the box to open it!",
  "daily.opening": "Opening...",
  "daily.treasureDone": "Treasure collected for today",
  "daily.treasureReady": "Tap the chest to open it!",
  "checkin.done": "Checked in today!",
  "checkin.today": "Check in today",
  "checkin.dayStreak": "day streak",
  "checkin.checkedIn": "Checked In",
  "tasks.none": "No tasks available",
  "tasks.noneSub": "Check back soon.",
  "ch.d1": "Watch 5 ads",
  "ch.d2": "Watch 10 ads",
  "ch.w1": "Complete 5 offers",
  "ch.w2": "Earn 20,000 coins",
  "ch.m1": "Complete 20 offers",
  "ch.m2": "Invite 10 friends",
  "referral.self": "You can't use your own code!",
  "referral.already": "You already have a referrer.",
  "referral.applied": "Referral code applied!",
  "referral.noFriends": "No referrals yet",
  "referral.noFriendsSub": "Share your link to start earning.",
  "referral.copied": "Link copied to clipboard!",
  "referral.shareMsg": "Join me on Rewords and earn coins for offers, games and surveys!",
  "leaderboard.none": "No rankings yet",
  "leaderboard.noneSub": "Be the first to top the leaderboard!",
  "leaderboard.level": "Level",
  "leaderboard.you": "You",
  "topup.noGames": "No top-up games",
  "topup.noGamesSub": "Check back soon.",
  "topup.selectGameFirst": "Select a game first",
  "topup.enterPlayerId": "Enter your player ID",
  "topup.confirm": "Confirm Top-Up",
  "topup.confirmBody": "Top up {g} ({p}) for {n} coins?",
  "topup.success": "Top-up order placed!",
  "topup.successSub": "We'll deliver your items within 24 hours.",
  "withdraw.bank": "Bank Transfer",
  "withdraw.giftcard": "Gift Card",
  "withdraw.from": "From",
  "withdraw.minLabel": "Minimum: {n} coins",
  "withdraw.tooSmall": "Minimum withdrawal is {n} coins",
  "withdraw.pendingExists": "You already have a pending withdrawal.",
  "withdraw.confirm": "Confirm Withdrawal",
  "withdraw.confirmBody": "Withdraw {n} coins via {m}?",
  "withdraw.requested": "Withdrawal requested",
  "withdraw.requestedSub": "We'll review it within 24-72 hours.",
  "withdraw.network": "Network",
  "withdraw.accountName": "Account Name",
  "withdraw.swift": "SWIFT / BIC",
  "withdraw.giftcardType": "Gift Card Type",
  "transactions.none": "No transactions yet",
  "transactions.noneSub": "Start earning to see your history.",
  "notifications.none": "No notifications",
  "notifications.noneSub": "You're all caught up!",
  "notifications.clearConfirm": "Delete all your notifications?",
  "support.noTickets": "No support tickets",
  "support.noTicketsSub": "Open a ticket and we'll help you fast.",
  "support.newTicket": "New Ticket",
  "support.subject": "Subject",
  "support.subjectPh": "Briefly describe the issue",
  "support.category": "Category",
  "support.message": "Message",
  "support.send": "Send Ticket",
  "support.sent": "Ticket sent",
  "support.sentSub": "Our team will reply soon.",
  "chat.autoReply": "Thanks for reaching out! A support agent will reply shortly.",
  "profile.saved": "Profile updated successfully!",
  "profile.locked": "Locked",
  "profile.noCountry": "No country set",
  "profile.unverified": "Unverified",
  "profile.level": "Level",
  "badge.newbie": "Newbie",
  "badge.gamer": "Gamer",
  "badge.surveyor": "Surveyor",
  "badge.earner": "Earner",
  "badge.streaker": "Streaker",
  "badge.inviter": "Inviter",
  "pf.thisDevice": "This device",
  "pf.currentSession": "Current session",
  "pf.active": "Active",
  "pf.trusted": "Trusted",
  "pf.noDevices": "No saved devices",
  "security.verified": "Verified",
  "security.notVerified": "Not verified",
  "security.today": "Today",
  "security.login": "Login",
  "security.currentDevice": "This device",
  "security.twoFaEnabled": "Two-factor authentication enabled!",
  "security.twoFaDisabled": "Two-factor authentication disabled.",
  "security.disable2fa": "Disable two-factor authentication?",
  "security.deleteConfirm": "This permanently deletes your account and all data.",
  "security.deleted": "Account deleted. Sorry to see you go!",
  "fraud.low": "Low Risk",
  "fraud.medium": "Medium Risk",
  "fraud.high": "High Risk",
  "fraud.score": "Trust Score",
  "fraud.level": "Risk Level",
  "fraud.flags": "Flags",
  "fraud.clean": "No issues",
  "fraud.noThreats": "No suspicious activity detected on your account.",
  "promo.invalid": "Invalid promo code",
  "promo.used": "This code was already used.",
  "promo.use": "Use",
  "promo.none": "No promo codes",
  "promo.noneSub": "Promo codes appear here during events.",
  "history.none": "No completed earnings yet",
  "history.noneSub": "Your completed offers and tasks will appear here.",
  "more.faq": "FAQ",
  "more.support": "Support Center",
  "more.terms": "Terms & Conditions",
  "more.privacy": "Privacy Policy",
  "more.antifraud": "Trust & Safety",
  "more.blog": "Blog & News",
  "more.events": "Events",
  "more.promo": "Promo Codes",
  "more.rewards": "Rewards Store",
  "more.leaderboard": "Leaderboard",
  "err.fillAll": "Please fill in all fields",
  "err.insufficient": "Insufficient coins",
  "err.username": "Username must be at least 3 characters",
  "err.password": "Password must be at least 8 characters",
  "err.terms": "Please accept the terms",
  "err.verifyFirst": "Please verify your email first",
  "ledger.signupBonus": "Welcome signup bonus",
  "ledger.offerComplete": "Offer completed: {n}",
  "ledger.surveyComplete": "Survey completed: {n}",
  "ledger.rewardRedeem": "Reward redeemed: {n}",
  "ledger.adReward": "Rewarded ad",
  "ledger.adBonus": "Daily ad bonus",
  "ledger.interstitial": "Interstitial ad reward",
  "ledger.dailyClaim": "Daily claim · Day {n}",
  "ledger.wheel": "Spin wheel bonus",
  "ledger.scratch": "Scratch card bonus",
  "ledger.mystery": "Mystery box reward",
  "ledger.treasure": "Treasure chest reward",
  "ledger.topup": "Game top-up: {g}",
  "ledger.withdrawal": "Withdrawal",
  "ledger.promo": "Promo code: {n}",
  "notif.offerDone": "Offer completed!",
  "notif.dailyDone": "Daily reward claimed!",
  "notif.streak": "Day streak:",
  "auth.signupBonusMsg": "Signup bonus! Start earning today."
};

/* ============================================================================
   5. I18N DICTIONARY — ARABIC
   ============================================================================ */
const I18N_AR = {
  "nav.home": "الرئيسية",
  "nav.earn": "اكسب",
  "nav.games": "الألعاب",
  "nav.offers": "العروض",
  "nav.surveys": "الاستبيانات",
  "nav.watch": "شاهد الإعلانات",
  "nav.daily": "المكافآت اليومية",
  "nav.rewards": "المكافآت",
  "nav.referral": "الإحالة",
  "nav.leaderboard": "المتقدمون",
  "nav.support": "الدعم",
  "nav.tasks": "المهام",
  "nav.challenges": "التحديات",
  "nav.streaks": "التتابع",
  "nav.topup": "شحن الألعاب",
  "nav.withdraw": "السحب",
  "nav.transactions": "المعاملات",
  "nav.wallet": "المحفظة",
  "nav.notifications": "الإشعارات",
  "nav.profile": "الملف الشخصي",
  "nav.security": "الأمان",
  "nav.faq": "الأسئلة",
  "nav.terms": "الشروط",
  "nav.privacy": "الخصوصية",
  "nav.antifraud": "الحالة",
  "nav.promo": "أكواد الخصم",
  "nav.events": "الفعاليات",
  "nav.blog": "الأخبار",
  "nav.more": "المزيد",
  "nav.history": "السجل",
  "nav.offlinerewards": "مكافآت دون اتصال",
  "mnav.home": "الرئيسية",
  "mnav.earn": "اكسب",
  "mnav.daily": "يومي",
  "mnav.rewards": "المكافآت",
  "mnav.profile": "الملف",
  "home.startEarning": "ابدأ الربح",
  "home.dailyReward": "المكافأة اليومية",
  "home.browseRewards": "تصفح المكافآت",
  "home.statUsers": "مستخدم سعيد",
  "home.statPaid": "تم الدفع",
  "home.statCoins": "عملات ممنوحة",
  "home.statTop": "الأعلى ربحًا اليوم",
  "home.streak": "أيام التتابع",
  "home.dailyTitle": "مكافأتك اليومية جاهزة!",
  "home.claimNow": "استلم الآن",
  "home.popularRewards": "المكافآت الشائعة",
  "home.seeAll": "عرض الكل",
  "home.topOffers": "أعلى العروض ربحًا",
  "home.topGames": "أعلى الألعاب ربحًا",
  "home.bestSurveys": "أفضل الاستبيانات",
  "home.watchCtaTitle": "شاهد إعلانات واكسب عملات فورية",
  "home.watchCtaSub": "فيديوهات قصيرة مدفوعة تمنحك عملات فورًا.",
  "home.startWatching": "ابدأ المشاهدة",
  "home.referCtaTitle": "ادعُ أصدقاءك واربح معًا",
  "home.referCtaSub": "اربح عملات إضافية لكل صديق ينضم ويكمل أول عرض.",
  "home.referNow": "احصل على رابط الإحالة",
  "home.topUsers": "أفضل المستخدمين اليوم",
  "home.recentlyCompleted": "المكتمل حديثًا",
  "home.personalized": "مخصص لك",
  "home.withdrawNoticeTitle": "إشعار السحب",
  "home.withdrawNoticeBody": "يتم معالجة طلب السحب الخاص بك وسيتم إعلامك عند اكتماله.",
  "home.faqTitle": "الأسئلة الشائعة",
  "home.howTitle": "كيف يعمل؟",
  "home.step1": "أنشئ حسابك",
  "home.step1Sub": "سجّل مجانًا في ثوانٍ بالبريد أو جوجل.",
  "home.step2": "أكمل المهام والعروض",
  "home.step2Sub": "العب الألعاب، أجب عن الاستبيانات، شاهد الإعلانات والمزيد.",
  "home.step3": "اسحب أرباحك",
  "home.step3Sub": "اسحب عبر باي بال، العملات الرقمية، البنك والمزيد.",
  "home.trustTitle": "شركاء موثوقون",
  "home.featuresTitle": "لماذا ريووردز؟",
  "home.fInstant": "مكافآت فورية",
  "home.fInstantSub": "احصل على المكافأة فور إتمام المهام.",
  "home.fSecure": "آمن ومحمي",
  "home.fSecureSub": "حماية متقدمة من الاحتيال وخصوصية البيانات.",
  "home.fGlobal": "عروض عالمية",
  "home.fGlobalSub": "آلاف العروض متاحة حول العالم.",
  "home.fDaily": "مكافآت يومية",
  "home.fDailySub": "سجّل يوميًا لمكافآت التتابع.",
  "home.fWithdraw": "حد أدنى منخفض",
  "home.fWithdrawSub": "اسحب من 1 دولار فقط.",
  "home.fSupport": "دعم 24/7",
  "home.fSupportSub": "فريقنا جاهز دائمًا لمساعدتك.",
  "home.gamesShowcase": "عرض الألعاب",
  "home.eventsTitle": "فعاليات لفترة محدودة",
  "home.event1Title": "عطلة نهاية الأسبوع بعملات مضاعفة",
  "home.event1Sub": "اربح ضعف العملات على كل العروض!",
  "home.event2Title": "مكافأة المستخدم الجديد",
  "home.event2Sub": "المستخدمون الجدد يحصلون على مكافأة ترحيبية تصل إلى 1,000 عملة!",
  "home.transparency": "كيف يتم تمويل مكافآتك",
  "home.transparencySub": "كل مكافأة تحصل عليها مدعومة بإيراد حقيقي من شركائنا.",
  "home.fStep1": "تكمل عرضًا",
  "home.fStep2": "يؤكد الشريك ويدفع",
  "home.fStep3": "تربح عملات",
  "home.fStep4": "تسحب أرباحك",
  "home.fMetric1": "100%",
  "home.fMetric1Sub": "ممولة بإيراد حقيقي",
  "home.fMetric2": "مكافحة الاحتيال",
  "home.fMetric2Sub": "كل مكافأة موثقة",
  "home.fMetric3": "آمن",
  "home.fMetric3Sub": "مدفوعات مشفرة",
  "home.paymentMethods": "طرق الدفع",
  "home.pmFast": "سريع",
  "home.pmCrypto": "رقمي",
  "home.pmSecure": "آمن",
  "home.pmBank": "بنك",
  "home.community": "انتصارات المجتمع",
  "home.newsTitle": "احصل على عروض حصرية",
  "home.newsSub": "اشترك في نشرتنا لأكواد المكافآت والفعاليات والعروض.",
  "home.newsSubscribe": "اشترك",
  "earn.title": "اكسب العملات",
  "earn.sub": "اختر مزودًا أدناه لبدء إتمام العروض وكسب العملات.",
  "earn.freecashTitle": "فري كاش — اربح المال من الألعاب",
  "earn.freecashSub": "العب الألعاب، ثبّت التطبيقات وأجب عن الاستبيانات مع فري كاش.",
  "earn.smartlinkTitle": "استكشف شبكات الشركاء",
  "earn.smartlinkSub": "اكتشف عروضًا رائعة عبر شبكة شركائنا.",
  "earn.explore": "استكشف",
  "earn.sponsoredTasks": "مهام برعاية",
  "earn.adOpportunities": "فرص الإعلانات",
  "earn.allOffers": "كل العروض",
  "earn.searchPlaceholder": "ابحث في العروض...",
  "offers.title": "العروض",
  "offers.sub": "أكمل المهام من شركائنا الموثوقين واحصل على المكافأة فورًا.",
  "offers.searchPlaceholder": "ابحث في العروض...",
  "offers.sortByReward": "ترتيب: المكافأة",
  "games.title": "الألعاب",
  "games.sub": "ثبّت الألعاب، حقّق المراحل واربح عملات كبيرة.",
  "games.searchPlaceholder": "ابحث في الألعاب...",
  "games.milestones": "مكافآت المراحل",
  "games.mInstall": "التثبيت",
  "games.mFinal": "المرحلة النهائية",
  "games.play": "العب واربح",
  "games.highReward": "ألعاب عالية المكافأة",
  "surveys.title": "الاستبيانات",
  "surveys.sub": "شارك برأيك واربح عملات. الاستبيانات تُملأ بسرعة!",
  "watch.title": "شاهد الإعلانات واربح",
  "watch.sub": "شاهد فيديوهات قصيرة مدفوعة واربح عملات فورية.",
  "watch.watchedToday": "إعلانات شوهدت اليوم",
  "watch.earnedToday": "عملات ربحتها اليوم",
  "watch.remaining": "الإعلانات المتبقية اليوم",
  "watch.rewVideoTitle": "فيديو مدفوع",
  "watch.rewVideoSub": "شاهد فيديو قصيرًا لتربح عملات فورية.",
  "watch.watchNow": "شاهد الآن",
  "watch.spinTitle": "عجلة الحظ الإضافية",
  "watch.spinSub": "شاهد إعلانًا لفتح عجلة الحظ واربح عملات كبيرة.",
  "watch.spinBtn": "اذهب للعجلة",
  "watch.adSlots": "طرق إضافية للربح",
  "watch.m1": "مكافأة إعلان يومية",
  "watch.m1Sub": "+300 عملة يوميًا",
  "watch.claim": "استلم",
  "watch.m2": "مكافأة وسيطة",
  "watch.m2Sub": "+200 عملة",
  "watch.m3": "عجلة الحظ",
  "watch.m3Sub": "حتى +1,000 عملة",
  "daily.title": "المكافآت اليومية",
  "daily.sub": "سجّل يوميًا واستلم المكافآت. لا تكسر تتابعك!",
  "daily.streak": "التتابع الحالي",
  "daily.bonus": "مكافأة التتابع التالي",
  "daily.week": "خطة المكافآت لـ7 أيام",
  "daily.day": "يوم",
  "daily.claim": "استلم مكافأة اليوم",
  "daily.streakVisual": "تتابعك",
  "daily.spinWheel": "عجلة الحظ الإضافية",
  "daily.spin": "أدر العجلة",
  "daily.scratch": "بطاقة الخدش",
  "daily.scratchHint": "اخدش لترى مكسبك!",
  "daily.mystery": "الصندوق الغامض",
  "daily.treasure": "الكنز اليومي",
  "daily.bonusInfo": "مضاعف المكافأة",
  "daily.b1": "يوم 1-3",
  "daily.b2": "يوم 4-6",
  "daily.b3": "يوم 7+",
  "daily.b4": "تجميد",
  "daily.freezeInfo": "تجميد التتابع",
  "daily.freezeInfoSub": "تخطيت يومًا؟ التجميد يحفظ تتابعك.",
  "daily.freezeHow": "اربح المزيد من التجميد",
  "tasks.title": "المهام",
  "tasks.sub": "أكمل المهام اليومية والأسبوعية لتعزيز أرباحك.",
  "tasks.daily": "مهام يومية",
  "tasks.weekly": "مهام أسبوعية",
  "tasks.t1": "تسجيل الدخول",
  "tasks.t1Sub": "قم بزيارة المنصة اليوم",
  "tasks.t2": "شاهد 3 إعلانات",
  "tasks.t2Sub": "0/3 فيديوهات مدفوعة",
  "tasks.t3": "أكمل عرضًا واحدًا",
  "tasks.t3Sub": "أي عرض من القائمة",
  "tasks.t4": "ثبّت 3 ألعاب",
  "tasks.t4Sub": "0/3 تثبيتات ألعاب",
  "tasks.t5": "ادعُ صديقين",
  "tasks.t5Sub": "0/2 إحالات نشطة",
  "tasks.t6": "اربح 5,000 عملة",
  "tasks.t6Sub": "0/5,000 عملة",
  "challenges.title": "التحديات",
  "challenges.sub": "تجاوز حدودك وافتح مكافآت كبيرة.",
  "challenges.daily": "تحديات يومية",
  "challenges.weekly": "تحديات أسبوعية",
  "challenges.monthly": "تحديات شهرية",
  "checkin.title": "تسجيل الدخول اليومي",
  "checkin.sub": "سجّل يوميًا للحفاظ على تتابعك وكسب المكافآت.",
  "checkin.checkIn": "سجّل الآن",
  "streaks.title": "التتابع",
  "streaks.sub": "حافظ على تتابعك لفتح مكافآت متزايدة.",
  "streaks.current": "التتابع الحالي",
  "streaks.best": "أفضل تتابع",
  "streaks.freezes": "تجميد التتابع",
  "streaks.monthView": "هذا الشهر",
  "referral.title": "ادعُ واربح عملات غير محدودة",
  "referral.sub": "شارك رابطك واربح عملات إضافية لكل صديق ينضم ويربح.",
  "referral.totalInvited": "أصدقاء مدعوون",
  "referral.earned": "عملات الإحالة",
  "referral.active": "أصدقاء نشطون",
  "referral.shareLink": "رابط الإحالة الخاص بك",
  "referral.copy": "نسخ",
  "referral.share": "مشاركة",
  "referral.enterCode": "أدخل رمز إحالة...",
  "referral.apply": "تطبيق",
  "referral.milestones": "مراحل الإحالة",
  "referral.myFriends": "إحالاتي",
  "referral.earnSub": "بالإضافة إلى 10% من عملات إحالاتك — إلى الأبد.",
  "ref.m1Title": "انضمام صديق",
  "ref.m1Sub": "عند تسجيل صديقك برابطك",
  "ref.m2Title": "أول نشاط",
  "ref.m2Sub": "يكمل الصديق أول مهمة",
  "ref.m3Title": "أول عرض",
  "ref.m3Sub": "يكمل الصديق أول عرض",
  "ref.m4Title": "5 إحالات",
  "ref.m4Sub": "ادعُ 5 أصدقاء نشطين",
  "ref.m5Title": "10 إحالات",
  "ref.m5Sub": "ادعُ 10 أصدقاء نشطين",
  "ref.m6Title": "أول سحب",
  "ref.m6Sub": "يقوم الصديق بأول سحب",
  "leaderboard.title": "المتقدمون",
  "leaderboard.sub": "تنافس مع أفضل الرابحين وتقدم في الترتيب.",
  "rewards.title": "متجر المكافآت",
  "rewards.sub": "أنفق عملاتك على بطاقات الهدايا وشحن الألعاب والمزيد.",
  "rewards.giftCards": "بطاقات الهدايا",
  "rewards.gcGoogle": "تسليم فوري",
  "rewards.gcApple": "تسليم فوري",
  "rewards.gcSteam": "تسليم فوري",
  "rewards.crypto": "مكافآت العملات الرقمية",
  "rewards.gameTopup": "شحن الألعاب",
  "topup.title": "شحن الألعاب",
  "topup.sub": "اشحن ألعابك المفضلة فورًا باستخدام عملاتك.",
  "topup.selectGame": "1. اختر اللعبة",
  "topup.diamonds": "ألماس وحزم",
  "topup.instant": "فوري",
  "topup.uc": "يو سي",
  "topup.robux": "روبوكس",
  "topup.gems": "جواهر",
  "topup.vp": "نقاط فالورانت",
  "topup.fcPoints": "نقاط إف سي",
  "topup.selectRegion": "2. المنطقة",
  "topup.playerId": "3. معرّف اللاعب",
  "topup.playerIdPh": "أدخل معرّف اللاعب",
  "topup.serverIdPh": "معرّف الخادم (اختياري)",
  "topup.selectPackage": "4. اختر الحزمة",
  "topup.paymentMethod": "5. طريقة الدفع",
  "topup.coins": "رصيد العملات",
  "topup.cash": "نقدًا",
  "topup.cashSub": "ادفع بمال حقيقي",
  "topup.summary": "ملخص الطلب",
  "topup.game": "اللعبة",
  "topup.package": "الحزمة",
  "topup.player": "معرّف اللاعب",
  "topup.region": "المنطقة",
  "topup.cost": "التكلفة",
  "topup.confirm": "تأكيد الشحن",
  "tp.p1": "100 ألماسة",
  "tp.p2": "310 ألماسة",
  "tp.p3": "520 ألماسة",
  "tp.p4": "1,060 ألماسة",
  "withdraw.title": "السحب",
  "withdraw.sub": "اسحب عملاتك عبر الطريقة المفضلة لديك.",
  "withdraw.minimum": "الحد الأدنى للسحب",
  "withdraw.selectMethod": "1. اختر الطريقة",
  "withdraw.amount": "2. المبلغ",
  "withdraw.details": "3. تفاصيل الحساب",
  "withdraw.summary": "ملخص السحب",
  "withdraw.method": "الطريقة",
  "withdraw.receive": "ستستلم",
  "withdraw.fee": "الرسوم",
  "withdraw.request": "اطلب السحب",
  "withdraw.hint": "تتم مراجعة عمليات السحب أمنيًا وتُعالج عادة خلال 24-72 ساعة.",
  "withdraw.paypalSub": "سريع، عالمي",
  "withdraw.feeTag": "رسوم",
  "withdraw.crypto": "عملات رقمية",
  "withdraw.cryptoSub": "بيتكوين، إيثريوم، تيثر",
  "withdraw.bank": "تحويل بنكي",
  "withdraw.bankSub": "سويفت / محلي",
  "withdraw.mobileMoney": "محفظة جوال",
  "withdraw.mobileMoneySub": "إم تي إن، فودافون، إيرتيل",
  "transactions.title": "المعاملات",
  "transactions.sub": "السجل الكامل لنشاط حسابك.",
  "notifications.title": "الإشعارات",
  "notifications.sub": "ابقَ على اطلاع بنشاط حسابك.",
  "notifications.markAll": "تحديد الكل كمقروء",
  "notifications.clearAll": "مسح الكل",
  "support.title": "مركز الدعم",
  "support.sub": "تحتاج مساعدة؟ افتح تذكرة وسيساعدك فريقنا.",
  "support.avgTime": "متوسط الاستجابة",
  "support.solved": "تذاكر محلولة",
  "support.open": "تذاكر مفتوحة",
  "support.rating": "تقييم المستخدمين",
  "support.myTickets": "تذاكري",
  "support.newTicket": "تذكرة جديدة",
  "support.liveChat": "مساعد ريووردز",
  "support.chatPlaceholder": "اكتب رسالة...",
  "support.category": "التصنيف",
  "support.subject": "الموضوع",
  "support.message": "الرسالة",
  "support.attachInfo": "إرفاق معلومات الحساب ولقطات الشاشة",
  "support.submit": "إرسال التذكرة",
  "support.kb": "قاعدة المعرفة",
  "support.tSample": "سؤال حول السحب",
  "support.tSampleSub": "قبل ساعتين",
  "support.tSample2": "عرض غير محسوب",
  "support.tSample2Sub": "قبل 3 أيام",
  "kb.earnTitle": "كيف تربح بسرعة",
  "kb.earnSub": "نصائح لتعظيم أرباحك.",
  "kb.withdrawTitle": "دليل السحب",
  "kb.withdrawSub": "خطوات السحب بالتفصيل.",
  "kb.gamesTitle": "مساعدة شحن الألعاب",
  "kb.gamesSub": "حل مشاكل الشحن الشائعة.",
  "kb.offersTitle": "عرض لم يُحسب؟",
  "kb.offersSub": "ماذا تفعل عندما لا تُحسب العروض.",
  "kb.secureTitle": "أمان الحساب",
  "kb.secureSub": "حافظ على حماية حسابك.",
  "kb.refTitle": "دليل الإحالة",
  "kb.refSub": "اربح أكثر بالإحالات.",
  "sfq.q1": "كيف تربح؟",
  "sfq.q1Sub": "عروض، ألعاب، استبيانات وإعلانات.",
  "sfq.q2": "مدة السحب؟",
  "sfq.q2Sub": "عادة 24-72 ساعة.",
  "sfq.q3": "مشاكل الشحن؟",
  "sfq.q3Sub": "نحلها خلال 24 ساعة.",
  "chat.welcome": "مرحبًا! أنا مساعد ريووردز. اسألني عن الربح أو السحب أو حسابك.",
  "chat.q1": "كيف أسحب أرباحي؟",
  "chat.a1": "بسهولة! اذهب إلى صفحة السحب، اختر الطريقة، أدخل التفاصيل وأكد. تُعالج عادة خلال 24-72 ساعة.",
  "profile.edit": "تعديل",
  "profile.completed": "عروض مكتملة",
  "profile.withdrawn": "تم سحبه",
  "profile.achievements": "الإنجازات",
  "profile.badges": "الشارات",
  "profile.referralCode": "رمز الإحالة",
  "profile.sessions": "الجلسات النشطة",
  "profile.devices": "الأجهزة",
  "profile.security": "الأمان",
  "profile.goSecurity": "إدارة الأمان",
  "profile.deleteAccount": "حذف الحساب",
  "profile.username": "اسم المستخدم",
  "profile.country": "الدولة",
  "profile.bio": "نبذة",
  "profile.save": "حفظ التغييرات",
  "ach.a1": "أول لعبة مثبتة",
  "ach.a1Sub": "ثبّت أول لعبة",
  "ach.a2": "أول استبيان",
  "ach.a2Sub": "أكمل أول استبيان",
  "ach.a3": "الرابح الكبير",
  "ach.a3Sub": "اربح 100,000 عملة إجمالًا",
  "ach.a4": "نجم الإحالة",
  "ach.a4Sub": "ادعُ 10 أصدقاء",
  "ach.a5": "سيد التتابع",
  "ach.a5Sub": "حافظ على تتابع 30 يومًا",
  "pf.thisDevice": "هذا الجهاز",
  "pf.currentSession": "الجلسة الحالية",
  "security.title": "الأمان",
  "security.sub": "احمِ حسابك بهذه الميزات الأمنية.",
  "security.email": "البريد مؤكد",
  "security.verify": "تأكيد",
  "security.phone": "رقم الهاتف",
  "security.add": "إضافة",
  "security.twoFa": "المصادقة الثنائية",
  "security.twoFaSub": "أضف حماية إضافية",
  "security.enable": "تفعيل",
  "security.password": "كلمة المرور",
  "security.passwordSub": "غُيّرت مؤخرًا",
  "security.change": "تغيير",
  "security.loginHistory": "سجل تسجيل الدخول",
  "security.suspicious": "نشاط مشبوه",
  "security.noThreat": "لا توجد تهديدات",
  "security.noThreatSub": "نراقب حسابك باستمرار بحثًا عن نشاط مشبوه.",
  "faq.title": "الأسئلة الشائعة",
  "faq.sub": "كل ما تحتاج معرفته عن ريووردز.",
  "faq.q1": "كيف أكسب العملات؟",
  "faq.a1": "أكمل العروض، العب الألعاب، أجب عن الاستبيانات، شاهد الفيديوهات المدفوعة، استلم المكافآت اليومية وادعُ الأصدقاء.",
  "faq.q2": "كيف أسحب أرباحي؟",
  "faq.a2": "اذهب إلى صفحة السحب، اختر الطريقة، أدخل التفاصيل وأكد. تُعالج عادة خلال 24-72 ساعة.",
  "faq.q3": "لماذا بعض العملات معلقة؟",
  "faq.a3": "عملات العروض تصبح معلقة حتى يؤكد المزود التحويل. هذا يحمي الجميع من الاحتيال.",
  "faq.q4": "ما الألعاب المتاحة؟",
  "faq.a4": "فري فاير، بوبجي، روبلوكس، كلاش، موبايل ليجندز، إف سي موبايل وغيرها الكثير، بمكافآت مرحلية.",
  "faq.q5": "هل ريووردز آمن؟",
  "faq.a5": "نعم. تشفير عالي، مكافحة احتيال صارمة، توثيق، وشركاء موثوقون فقط.",
  "faq.q6": "كيف يعمل برنامج الإحالة؟",
  "faq.a6": "شارك رابطك. عندما ينضم أصدقاؤك ويربحون، تحصلان معًا على عملات إضافية.",
  "faq.q7": "كم يستغرق شحن الألعاب؟",
  "faq.a7": "معظم عمليات الشحن فورية. التعبئة اليدوية قد تستغرق حتى 24 ساعة.",
  "faq.q8": "ماذا لو لم يُحسب عرض؟",
  "faq.a8": "افتح تذكرة دعم خلال 48 ساعة مع دليل وسيحقق فريقنا.",
  "faq.q9": "هل يمكنني امتلاك أكثر من حساب؟",
  "faq.a9": "لا. الحسابات المتعددة احتيال وستُقيّد مع سحب المكافآت.",
  "faq.q10": "هل أكواد الخصم حقيقية؟",
  "faq.a10": "نعم! تابع قنواتنا لأكواد خصم محدودة الوقت.",
  "terms.title": "شروط الاستخدام",
  "privacy.title": "سياسة الخصوصية",
  "antifraud.title": "حالة الحساب والأمان",
  "antifraud.sub": "حالة حسابك الحالية من الأمان وكشف الاحتيال.",
  "antifraud.riskScore": "درجة المخاطرة",
  "antifraud.riskSub": "الأقل أفضل",
  "antifraud.accountStatus": "حالة الحساب",
  "antifraud.checks": "فحوصات الأمان",
  "antifraud.verification": "حالة التوثيق",
  "antifraud.fraudLog": "سجل الحماية من الاحتيال",
  "vf.email": "البريد",
  "vf.verified": "موثق",
  "vf.phone": "الهاتف",
  "vf.notVerified": "غير موثق",
  "vf.identity": "الهوية",
  "vf.optional": "اختياري",
  "vf.device": "الجهاز",
  "vf.trusted": "موثوق",
  "vf.ip": "عنوان IP",
  "vf.clean": "نظيف",
  "vf.risk": "مستوى المخاطرة",
  "vf.low": "منخفض",
  "sc.c1": "بصمة الجهاز",
  "sc.c1Sub": "تم تحديد الجهاز",
  "sc.c2": "عنوان IP",
  "sc.c2Sub": "لا يوجد VPN أو بروكسي",
  "sc.c3": "فحص المحاكي",
  "sc.c3Sub": "تم اكتشاف جهاز حقيقي",
  "sc.c4": "حسابات مكررة",
  "sc.c4Sub": "لا توجد حسابات مكررة",
  "sc.c5": "سرعة النشاط",
  "sc.c5Sub": "أنماط نشاط طبيعية",
  "sc.c6": "فحص الإحالة",
  "sc.c6Sub": "لا توجد إحالات ذاتية",
  "fl.f1": "فحص الأمان ناجح",
  "fl.f1Sub": "لا توجد حالات شاذة",
  "fl.f2": "تم التحقق من الدخول",
  "fl.f2Sub": "جهاز جديد مصرح به",
  "fl.f3": "تم التحقق من الإحالة",
  "fl.f3Sub": "برنامج الإحالة نشط",
  "ch.checked": "تم تسجيل الدخول",
  "wallet.title": "المحفظة",
  "wallet.sub": "سجل العملات الكامل وتفصيل الرصيد.",
  "wallet.available": "العملات المتاحة",
  "wallet.pending": "عملات معلقة",
  "wallet.locked": "عملات مقفلة",
  "wallet.lifetime": "إجمالي الربح",
  "wallet.spent": "إجمالي الإنفاق",
  "wallet.withdrawn": "إجمالي السحب",
  "wallet.withdrawBtn": "السحب",
  "wallet.topupBtn": "شحن الألعاب",
  "wallet.ledger": "السجل",
  "wallet.availableCoins": "عملات متاحة",
  "wl.l1": "مكافأة الدخول اليومي",
  "wl.l2": "إعلان مدفوع",
  "wl.l3": "مكافأة إحالة",
  "wl.l4": "شحن لعبة",
  "tx.t1": "مكافأة يومية",
  "cw.w1": "ربح +2,400 عملة",
  "cw.w2": "سحب 25 دولار عبر باي بال",
  "cw.w3": "أكمل استبيانًا",
  "promo.title": "أكواد الخصم",
  "promo.sub": "استبدل عملات إضافية بأكواد خصم خاصة.",
  "promo.enter": "أدخل رمز الخصم",
  "promo.redeem": "استبدال",
  "promo.hint": "أكواد الخصم محدودة الاستخدام مرة واحدة لكل حساب.",
  "promo.activeCodes": "أكواد خصم نشطة",
  "events.title": "الفعاليات والموسمية",
  "events.sub": "فعاليات محدودة الوقت بمكافآت مضاعفة.",
  "events.active": "فعاليات نشطة",
  "events.upcoming": "فعاليات قادمة",
  "events.past": "فعاليات سابقة",
  "events.endsIn": "تنتهي خلال",
  "events.e1Title": "عطلة نهاية الأسبوع بعملات مضاعفة",
  "events.e1Sub": "كل العروض تدفع ضعف العملات طوال عطلة نهاية الأسبوع.",
  "events.e2Title": "ماراثون الألعاب",
  "events.e2Sub": "اربح 20% إضافية على كل عروض الألعاب.",
  "events.e3Title": "سباق الإحالة",
  "events.e3Sub": "مكافآت إحالة ثلاثية لمدة أسبوع.",
  "events.e4Title": "مهرجان الاستبيانات",
  "events.e4Sub": "اربح 50% أكثر على كل الاستبيانات.",
  "events.e5Title": "مكافأة الترحيب",
  "events.e5Sub": "انتهت — شكرًا للمشاركة!",
  "events.e6Title": "مكافآت الصيف",
  "events.e6Sub": "انتهت — تم إشعار الفائزين.",
  "blog.title": "الأخبار والنصائح",
  "blog.sub": "آخر التحديثات والنصائح والإعلانات من ريووردز.",
  "blog.bTips": "نصائح",
  "blog.bUpdate": "تحديث",
  "blog.bGuide": "دليل",
  "blog.bNews": "أخبار",
  "blog.p1Title": "10 طرق لربح المزيد من العملات",
  "blog.p1Date": "قبل يومين",
  "blog.p2Title": "ألعاب جديدة هذا الأسبوع",
  "blog.p2Date": "قبل 4 أيام",
  "blog.p3Title": "كيف تعمل عمليات السحب",
  "blog.p3Date": "قبل أسبوع",
  "blog.p4Title": "فعالية العملات المضاعفة نهاية الأسبوع",
  "blog.p4Date": "قبل يومين",
  "blog.p5Title": "تجنب هذه الخدع في العروض",
  "blog.p5Date": "قبل أسبوع",
  "blog.p6Title": "طرق سحب جديدة متاحة",
  "blog.p6Date": "قبل أسبوعين",
  "history.title": "سجل تسجيل الدخول",
  "history.sub": "عرض كل عمليات تسجيل الدخول والمكافآت السابقة.",
  "offline.title": "مكافآت دون اتصال",
  "offline.sub": "حافظ على تتابعك حتى عند تخطي يوم.",
  "offline.freezeTitle": "تجميد التتابع",
  "offline.freezeSub": "التجميد يحمي تتابعك ليوم واحد مفقود.",
  "offline.buyFreeze": "اشترِ تجميدًا",
  "more.title": "استكشف المزيد",
  "more.sub": "كل ما قد تحتاجه أيضًا.",
  "more.promo": "أكواد الخصم",
  "more.promoSub": "استبدل عملات إضافية",
  "more.events": "الفعاليات",
  "more.eventsSub": "تعزيزات محدودة الوقت",
  "more.blog": "الأخبار والنصائح",
  "more.blogSub": "آخر التحديثات",
  "more.history": "سجل تسجيل الدخول",
  "more.historySub": "عمليات سابقة",
  "more.offline": "مكافآت دون اتصال",
  "more.offlineSub": "تجميد التتابع",
  "more.faq": "الأسئلة الشائعة",
  "more.faqSub": "أسئلة شائعة",
  "auth.logout": "تسجيل الخروج",
  "auth.remember": "تذكرني",
  "auth.forgot": "نسيت كلمة المرور؟",
  "auth.login": "تسجيل الدخول",
  "auth.or": "أو",
  "auth.signup": "إنشاء حساب",
  "auth.hasCode": "لدي رمز إحالة",
  "auth.agree": "أوافق على",
  "auth.terms": "شروط الاستخدام",
  "auth.sendReset": "إرسال رابط إعادة التعيين",
  "auth.back": "رجوع",
  "auth.verifyTitle": "أكد بريدك الإلكتروني",
  "auth.verifySub": "أرسلنا لك رابط تأكيد. تحقق من بريدك.",
  "auth.resend": "إعادة إرسال البريد",
  "auth.iVerified": "لقد أكدت — متابعة",
  "2fa.title": "المصادقة الثنائية",
  "2fa.totpTitle": "امسح باستخدام تطبيق المصادقة",
  "2fa.copy": "نسخ",
  "2fa.verify": "تحقق وفعّل",
  "popup.cancel": "إلغاء",
  "popup.confirm": "تأكيد",
  "popup.rewardTitle": "مكافأة ربحتها!",
  "popup.awesome": "رائع!",
  "footer.about": "اربح عملات بإتمام العروض واللعب في الألعاب والإجابة عن الاستبيانات ومشاهدة الإعلانات المدفوعة. اسحب أرباحك اليوم.",
  "footer.earn": "اكسب",
  "footer.offers": "العروض",
  "footer.games": "الألعاب",
  "footer.surveys": "الاستبيانات",
  "footer.watch": "شاهد الإعلانات",
  "footer.referral": "الإحالة",
  "footer.account": "الحساب",
  "footer.wallet": "المحفظة",
  "footer.rewards": "متجر المكافآت",
  "footer.transactions": "المعاملات",
  "footer.support": "الدعم",
  "footer.security": "الأمان",
  "footer.legal": "قانوني",
  "footer.terms": "الشروط",
  "footer.privacy": "الخصوصية",
  "footer.faq": "الأسئلة",
  "footer.status": "الحالة",
  "footer.rights": "جميع الحقوق محفوظة.",
  "footer.language": "العربية / English",
  "auth.needLogin": "سجّل الدخول لتفعيل جميع الميزات والبدء في الربح.",
  "home.unlockStrip": "أنشئ حسابًا مجانيًا وابدأ في ربح العملات اليوم!",
  "account.pending": "بانتظار التحقق",
  "account.restricted": "الحساب مقيد",
  "account.verifyEmail": "تحقق من بريدك الإلكتروني",
  "account.flagged": "قيد المراجعة",
  "account.good": "الحساب سليم",
  "offers.all": "جميع المزودين",
  "offers.viewDetails": "عرض التفاصيل",
  "offers.none": "لا توجد عروض متاحة",
  "offers.noneSub": "عد لاحقًا — عروض جديدة كل يوم.",
  "offers.payout": "المكافأة",
  "offers.minutes": "دقائق",
  "offers.difficulty": "الصعوبة",
  "offers.milestones": "المراحل",
  "offers.howTo": "طريقة الإكمال",
  "offers.stepDefault": "أكمل الإجراء المطلوب ليتم إضافة المكافأة.",
  "offers.start": "ابدأ العرض",
  "offers.imDone": "انتهيت",
  "offers.install": "تثبيت",
  "offers.complete": "أكمل العرض",
  "offers.creditNote": "قد تستغرق المكافأة حتى 5 دقائق لتظهر بعد الإكمال.",
  "offers.confirmTitle": "تأكيد الإكمال",
  "offers.confirmBody": "أنت على وشك الحصول على +{n} عملة لإكمال هذا العرض.",
  "games.none": "لا توجد ألعاب متاحة",
  "games.noneSub": "تُضاف ألعاب جديدة باستمرار.",
  "games.playNow": "العب الآن",
  "games.rating": "التقييم",
  "games.installs": "عمليات التثبيت",
  "surveys.none": "لا توجد استبيانات متاحة",
  "surveys.general": "عام",
  "surveys.min": "دقيقة",
  "surveys.slotsLeft": "مقاعد متبقية",
  "surveys.full": "مكتمل",
  "surveys.start": "ابدأ",
  "surveys.submit": "إرسال والربح",
  "surveys.qualified": "التأهيل",
  "surveys.disqualify": "قد يتم استبعادك إذا لم تتطابق إجاباتك مع الملف المستهدف.",
  "surveys.question": "ما مدى احتمالية أن توصي بتطبيقنا؟",
  "surveys.opt1": "من المحتمل جدًا",
  "surveys.opt2": "محتمل نوعًا ما",
  "surveys.opt3": "غير محتمل",
  "rewards.all": "جميع المكافآت",
  "rewards.from": "من",
  "rewards.outOfStock": "نفد المخزون",
  "rewards.redeem": "استبدال",
  "rewards.none": "لا توجد مكافآت متاحة",
  "rewards.noneSub": "يتم تجديد المكافآت كل أسبوع.",
  "rewards.confirm": "تأكيد الاستبدال",
  "rewards.confirmRedeem": "تأكيد الاستبدال",
  "rewards.cost": "التكلفة",
  "rewards.balance": "رصيدك",
  "rewards.ordered": "تم إرسال الطلب! ستصلك خلال 24 ساعة.",
  "events.joinNow": "انضم الآن",
  "events.none": "لا توجد فعاليات حاليًا",
  "events.noneSub": "تابعنا للاطلاع على الفعاليات الجديدة.",
  "events.title": "تفاصيل الفعالية",
  "events.reward": "إجمالي المكافأة",
  "events.coins": "عملة",
  "blog.read": "اقرأ المزيد",
  "blog.none": "لا توجد مقالات بعد",
  "blog.noneSub": "نصائح وأخبار قريبًا.",
  "watch.perAd": "عملة لكل إعلان",
  "watch.done": "انتهيت لليوم",
  "watch.capReached": "تم الوصول للحد اليومي للإعلانات. عد غدًا!",
  "watch.bonusClaimed": "تم المطالبة بالمكافأة اليوم.",
  "daily.claimed": "تم المطالبة لليوم",
  "daily.wheelSpun": "تم تدوير العجلة اليوم",
  "daily.wheelReady": "تدور مرة واحدة يوميًا — حظًا موفقًا!",
  "daily.spinning": "جارٍ التدوير...",
  "daily.scratchDone": "تم استخدام بطاقة الخدش لليوم",
  "daily.scratchReady": "اضغط على البطاقة للخدش!",
  "daily.mysteryDone": "تم فتح الصندوق لليوم",
  "daily.mysteryReady": "اضغط على الصندوق لفتحه!",
  "daily.opening": "جارٍ الفتح...",
  "daily.treasureDone": "تم جمع الكنز لليوم",
  "daily.treasureReady": "اضغط على الصندوق لفتحه!",
  "checkin.done": "تم تسجيل حضور اليوم!",
  "checkin.today": "سجّل حضورك اليوم",
  "checkin.dayStreak": "يوم متتالي",
  "checkin.checkedIn": "تم التسجيل",
  "tasks.none": "لا توجد مهام",
  "tasks.noneSub": "عد لاحقًا.",
  "ch.d1": "شاهد 5 إعلانات",
  "ch.d2": "شاهد 10 إعلانات",
  "ch.w1": "أكمل 5 عروض",
  "ch.w2": "اربح 20,000 عملة",
  "ch.m1": "أكمل 20 عرضًا",
  "ch.m2": "ادعُ 10 أصدقاء",
  "referral.self": "لا يمكنك استخدام كودك الخاص!",
  "referral.already": "لديك راعي بالفعل.",
  "referral.applied": "تم تطبيق كود الإحالة!",
  "referral.noFriends": "لا يوجد أصدقاء بعد",
  "referral.noFriendsSub": "شارك رابطك لبدء الربح.",
  "referral.copied": "تم نسخ الرابط!",
  "referral.shareMsg": "انضم إليّ على Rewords واربح عملات من العروض والألعاب والاستبيانات!",
  "leaderboard.none": "لا يوجد ترتيب بعد",
  "leaderboard.noneSub": "كن أول من يتصدر لوحة المتصدرين!",
  "leaderboard.level": "المستوى",
  "leaderboard.you": "أنت",
  "topup.noGames": "لا توجد ألعاب شحن",
  "topup.noGamesSub": "عد لاحقًا.",
  "topup.selectGameFirst": "اختر اللعبة أولاً",
  "topup.enterPlayerId": "أدخل معرف اللاعب",
  "topup.confirm": "تأكيد الشحن",
  "topup.confirmBody": "شحن {g} ({p}) مقابل {n} عملة؟",
  "topup.success": "تم تقديم طلب الشحن!",
  "topup.successSub": "سنوصلك مشترياتك خلال 24 ساعة.",
  "withdraw.bank": "تحويل بنكي",
  "withdraw.giftcard": "بطاقة هدايا",
  "withdraw.from": "من",
  "withdraw.minLabel": "الحد الأدنى: {n} عملة",
  "withdraw.tooSmall": "الحد الأدنى للسحب هو {n} عملة",
  "withdraw.pendingExists": "لديك عملية سحب قيد المراجعة بالفعل.",
  "withdraw.confirm": "تأكيد السحب",
  "withdraw.confirmBody": "سحب {n} عملة عبر {m}؟",
  "withdraw.requested": "تم طلب السحب",
  "withdraw.requestedSub": "سنراجعه خلال 24-72 ساعة.",
  "withdraw.network": "الشبكة",
  "withdraw.accountName": "اسم الحساب",
  "withdraw.swift": "SWIFT / BIC",
  "withdraw.giftcardType": "نوع بطاقة الهدايا",
  "transactions.none": "لا توجد معاملات بعد",
  "transactions.noneSub": "ابدأ الربح لرؤية سجلك.",
  "notifications.none": "لا توجد إشعارات",
  "notifications.noneSub": "كل شيء محدث!",
  "notifications.clearConfirm": "حذف جميع الإشعارات؟",
  "support.noTickets": "لا توجد تذاكر دعم",
  "support.noTicketsSub": "افتح تذكرة وسنساعدك بسرعة.",
  "support.newTicket": "تذكرة جديدة",
  "support.subject": "الموضوع",
  "support.subjectPh": "صف المشكلة باختصار",
  "support.category": "الفئة",
  "support.message": "الرسالة",
  "support.send": "إرسال التذكرة",
  "support.sent": "تم إرسال التذكرة",
  "support.sentSub": "سيرد فريقنا قريبًا.",
  "chat.autoReply": "شكرًا لتواصلك! سيرد أحد ممثلي الدعم قريبًا.",
  "profile.saved": "تم تحديث الملف الشخصي بنجاح!",
  "profile.locked": "مقفل",
  "profile.noCountry": "لم يتم تعيين الدولة",
  "profile.unverified": "غير موثق",
  "profile.level": "المستوى",
  "badge.newbie": "مبتدئ",
  "badge.gamer": "لاعب",
  "badge.surveyor": "مستطلِع",
  "badge.earner": "رابح",
  "badge.streaker": "مواظب",
  "badge.inviter": "داعٍ",
  "pf.thisDevice": "هذا الجهاز",
  "pf.currentSession": "الجلسة الحالية",
  "pf.active": "نشط",
  "pf.trusted": "موثوق",
  "pf.noDevices": "لا توجد أجهزة محفوظة",
  "security.verified": "موثق",
  "security.notVerified": "غير موثق",
  "security.today": "اليوم",
  "security.login": "تسجيل دخول",
  "security.currentDevice": "هذا الجهاز",
  "security.twoFaEnabled": "تم تفعيل التحقق بخطوتين!",
  "security.twoFaDisabled": "تم إيقاف التحقق بخطوتين.",
  "security.disable2fa": "إيقاف التحقق بخطوتين؟",
  "security.deleteConfirm": "سيتم حذف حسابك وجميع بياناتك نهائيًا.",
  "security.deleted": "تم حذف الحساب. نأسف لرحيلك!",
  "fraud.low": "مخاطر منخفضة",
  "fraud.medium": "مخاطر متوسطة",
  "fraud.high": "مخاطر عالية",
  "fraud.score": "نقاط الثقة",
  "fraud.level": "مستوى الخطر",
  "fraud.flags": "العلامات",
  "fraud.clean": "لا مشاكل",
  "fraud.noThreats": "لا يوجد نشاط مشبوه على حسابك.",
  "promo.invalid": "كود خاطئ",
  "promo.used": "تم استخدام هذا الكود مسبقًا.",
  "promo.use": "استخدام",
  "promo.none": "لا توجد أكواد",
  "promo.noneSub": "تظهر الأكواد أثناء الفعاليات.",
  "history.none": "لا توجد أرباح مكتملة بعد",
  "history.noneSub": "ستظهر عروضك ومهامك المكتملة هنا.",
  "more.faq": "الأسئلة الشائعة",
  "more.support": "مركز الدعم",
  "more.terms": "الشروط والأحكام",
  "more.privacy": "سياسة الخصوصية",
  "more.antifraud": "الثقة والأمان",
  "more.blog": "المدونة والأخبار",
  "more.events": "الفعاليات",
  "more.promo": "أكواد الخصم",
  "more.rewards": "متجر المكافآت",
  "more.leaderboard": "لوحة المتصدرين",
  "err.fillAll": "يرجى ملء جميع الحقول",
  "err.insufficient": "عملات غير كافية",
  "err.username": "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
  "err.password": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
  "err.terms": "يرجى قبول الشروط",
  "err.verifyFirst": "يرجى التحقق من بريدك الإلكتروني أولاً",
  "ledger.signupBonus": "مكافأة التسجيل الترحيبية",
  "ledger.offerComplete": "اكتمل العرض: {n}",
  "ledger.surveyComplete": "اكتمل الاستبيان: {n}",
  "ledger.rewardRedeem": "تم استبدال المكافأة: {n}",
  "ledger.adReward": "إعلان مكافأة",
  "ledger.adBonus": "مكافأة الإعلان اليومية",
  "ledger.interstitial": "مكافأة إعلان بيني",
  "ledger.dailyClaim": "مطالبة يومية · اليوم {n}",
  "ledger.wheel": "مكافأة عجلة الحظ",
  "ledger.scratch": "مكافأة بطاقة الخدش",
  "ledger.mystery": "مكافأة الصندوق الغامض",
  "ledger.treasure": "مكافأة صندوق الكنز",
  "ledger.topup": "شحن لعبة: {g}",
  "ledger.withdrawal": "سحب",
  "ledger.promo": "كود خصم: {n}",
  "notif.offerDone": "اكتمل العرض!",
  "notif.dailyDone": "تمت المطالبة بالمكافأة اليومية!",
  "notif.streak": "سلسلة الأيام:",
  "auth.signupBonusMsg": "مكافأة التسجيل! ابدأ الربح اليوم."
};

/* ============================================================================
   6. I18N ENGINE
   ============================================================================ */
let DICT = State.lang === 'ar' ? I18N_AR : I18N_EN;

function t(key) {
  if (!key) return '';
  return DICT[key] || I18N_EN[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  const html = document.documentElement;
  if (State.lang === 'ar') {
    html.setAttribute('lang', 'ar');
    html.setAttribute('dir', 'rtl');
    document.getElementById('langToggleLabel').textContent = 'EN';
  } else {
    html.setAttribute('lang', 'en');
    html.setAttribute('dir', 'ltr');
    document.getElementById('langToggleLabel').textContent = 'ع';
  }
}

function setLang(lang) {
  State.lang = lang;
  DICT = lang === 'ar' ? I18N_AR : I18N_EN;
  localStorage.setItem('rewords_lang', lang);
  applyTranslations();
}

/* ============================================================================
   7. THEME ENGINE
   ============================================================================ */
function setTheme(theme) {
  State.theme = theme;
  localStorage.setItem('rewords_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : (theme === 'light' ? '☀️' : '🎨');
}

/* ============================================================================
   8. UTILITIES
   ============================================================================ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n) => (Number(n) || 0).toLocaleString('en-US');
const fmtCoins = (n) => fmtNum(n) + ' 🪙';
const coinsToUsd = (coins) => (Number(coins) || 0) / COIN_RATE;
const usdToCoins = (usd) => Math.round(Number(usd) * COIN_RATE);
const todayKey = () => new Date().toISOString().slice(0, 10);
const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase();

function timeAgo(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return t('timeAgo.now') || 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + 'd';
  return d.toLocaleDateString();
}

function dateLabel(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(State.lang === 'ar' ? 'ar' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function el(id) { return document.getElementById(id); }

/* Toast system */
function toast(title, msg, type = 'info', dur = 4000) {
  const wrap = el('toastWrap');
  if (!wrap) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const box = document.createElement('div');
  box.className = 'toast ' + type;
  box.innerHTML = `
    <span class="toast-ico">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${esc(title)}</div>
      <div class="toast-msg">${esc(msg)}</div>
    </div>
    <span class="toast-progress"></span>`;
  wrap.appendChild(box);
  setTimeout(() => { box.classList.add('hide'); setTimeout(() => box.remove(), 320); }, dur);
}

/* Confirm dialog */
let confirmCallback = null;
function askConfirm(title, body, okLabel, danger = true) {
  return new Promise((resolve) => {
    el('confirmDialogIco').textContent = danger ? '⚠️' : '❓';
    el('confirmDialogTitle').textContent = title;
    el('confirmDialogBody').textContent = body;
    el('confirmDialogOk').textContent = okLabel || t('popup.confirm');
    el('confirmDialog').classList.add('open');
    confirmCallback = resolve;
  });
}

function closeConfirmDialog() {
  el('confirmDialog').classList.remove('open');
  if (confirmCallback) { confirmCallback(false); confirmCallback = null; }
}

/* Modal helpers */
function openModal(id) { const m = el(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = el(id); if (m) m.classList.remove('open'); }
function openGenericModal(title, html) {
  el('genericModalTitle').textContent = title;
  el('genericModalBody').innerHTML = html;
  openModal('genericModal');
}

/* Confetti */
function celebrate() {
  const colors = ['#6a11cb', '#2575fc', '#00d4ff', '#ff6a00', '#00e676', '#ffd700'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDelay = (Math.random() * 0.7) + 's';
    c.style.animationDuration = (2.5 + Math.random() * 2) + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5200);
  }
}

/* Reward popup */
function showRewardPopup(amount, msg) {
  el('rewardPopupAmount').textContent = '+' + fmtNum(amount);
  el('rewardPopupMsg').textContent = msg || '';
  openModal('rewardPopup');
  celebrate();
}

/* Unlock banner */
let unlockTimer = null;
function showUnlock(ico, title, sub) {
  el('unlockIco').textContent = ico || '🏅';
  el('unlockTitle').textContent = title;
  el('unlockSub').textContent = sub || '';
  const b = el('unlockBanner');
  b.classList.add('show');
  clearTimeout(unlockTimer);
  unlockTimer = setTimeout(() => b.classList.remove('show'), 3200);
}

/* Ripple effect */
function addRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const d = Math.max(rect.width, rect.height);
  const span = document.createElement('span');
  span.className = 'ripple';
  span.style.width = span.style.height = d + 'px';
  span.style.left = (e.clientX - rect.left - d / 2) + 'px';
  span.style.top = (e.clientY - rect.top - d / 2) + 'px';
  btn.appendChild(span);
  setTimeout(() => span.remove(), 600);
}

/* Animated counter */
function animateNumber(elId, target, suffix = '') {
  const node = el(elId);
  if (!node) return;
  const start = 0;
  const dur = 800;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = fmtNum(Math.round(start + (target - start) * eased)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* Copy helper */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch (e2) { return false; }
  }
}

/* URL helpers */
function buildRefLink() {
  if (!State.user) return '';
  return (State.settings.siteUrl || location.origin + location.pathname) + '?ref=' + (State.profile && State.profile.referralCode || '');
}

/* ============================================================================
   9. DEVICE FINGERPRINT & FRAUD COLLECTION
   ============================================================================ */
function getDeviceFingerprint() {
  try {
    const nav = navigator;
    const screen = window.screen;
    const raw = [
      nav.userAgent,
      nav.language,
      nav.platform,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency,
      nav.deviceMemory || '',
      screen.orientation ? screen.orientation.type : ''
    ].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36);
  } catch (e) {
    return 'unknown-' + Math.random().toString(36).slice(2, 8);
  }
}

function detectEmulator() {
  const ua = navigator.userAgent || '';
  if (/android.+; mobile/i.test(ua) && !/android.+mobile safari/i.test(ua)) return false;
  const emus = ['BlueStacks', 'NoxPlayer', 'MemuPlay', 'LDPlayer', 'Genymotion', 'MEmu', 'Andy'];
  return emus.some(e => ua.includes(e));
}

async function getClientIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json', { timeout: 4000 });
    const d = await r.json();
    return d.ip || '';
  } catch (e) {
    return '';
  }
}

/* ============================================================================
   10. AUTH SYSTEM
   ============================================================================ */
function initAuthUI() {
  const loginForm = el('loginForm');
  const signupForm = el('signupForm');
  const forgotForm = el('forgotForm');
  const authModalClose = el('authModalClose');
  const loginBtn = el('loginBtn');
  const signupBtn = el('signupBtn');
  const forgotBtn = el('forgotBtn');

  if (authModalClose) authModalClose.addEventListener('click', () => closeModal('authModal'));
  el('forgotPwLink').addEventListener('click', (e) => { e.preventDefault(); switchAuthPane('forgot'); });
  el('forgotBackBtn').addEventListener('click', () => switchAuthPane('login'));
  el('authTabLogin').addEventListener('click', () => switchAuthPane('login'));
  el('authTabSignup').addEventListener('click', () => switchAuthPane('signup'));

  $$('[data-toggle-pw]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = el(btn.getAttribute('data-toggle-pw'));
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('loginEmail').value.trim();
    const pw = el('loginPassword').value;
    if (!email || !pw) return toast(t('auth.login'), t('err.fillAll'), 'warning');
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    try {
      await auth.signInWithEmailAndPassword(email, pw);
      closeModal('authModal');
      toast(t('auth.login'), t('auth.welcomeBack'), 'success');
    } catch (err) {
      toast(t('auth.login'), err.message, 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
    }
  });

  el('signupPassword').addEventListener('input', () => {
    const pw = el('signupPassword').value;
    updateStrength(pw);
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el('signupUsername').value.trim();
    const email = el('signupEmail').value.trim();
    const pw = el('signupPassword').value;
    if (!username || username.length < 3) return toast(t('auth.signup'), t('err.username'), 'warning');
    if (pw.length < 8) return toast(t('auth.signup'), t('err.password'), 'warning');
    if (!el('signupTerms').checked) return toast(t('auth.signup'), t('err.terms'), 'warning');
    signupBtn.disabled = true;
    signupBtn.classList.add('loading');
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pw);
      const referralCode = el('signupReferral').checked ? el('signupReferralCode').value.trim().toUpperCase() : '';
      await createUserProfile(cred.user, username, referralCode);
      await cred.user.sendEmailVerification().catch(() => {});
      closeModal('authModal');
      toast(t('auth.signup'), t('auth.welcome'), 'success');
      showRewardPopup(State.settings.signupBonus || 100, t('auth.signupBonusMsg'));
      return;
    } catch (err) {
      toast(t('auth.signup'), err.message, 'error');
    } finally {
      signupBtn.disabled = false;
      signupBtn.classList.remove('loading');
    }
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('forgotEmail').value.trim();
    if (!email) return;
    forgotBtn.disabled = true;
    try {
      await auth.sendPasswordResetEmail(email);
      toast(t('auth.sendReset'), t('auth.resetSent'), 'success');
      switchAuthPane('login');
    } catch (err) {
      toast(t('auth.sendReset'), err.message, 'error');
    } finally {
      forgotBtn.disabled = false;
    }
  });

  el('googleLoginBtn').addEventListener('click', googleSignIn);
  el('googleSignupBtn').addEventListener('click', googleSignIn);

  el('verifyCloseBtn').addEventListener('click', () => {
    if (auth.currentUser && auth.currentUser.emailVerified) {
      closeModal('authModal');
    } else {
      toast(t('auth.verifyTitle'), t('err.verifyFirst'), 'warning');
    }
  });
  el('resendVerifyBtn').addEventListener('click', async () => {
    if (auth.currentUser) {
      await auth.currentUser.sendEmailVerification().catch(() => {});
      toast(t('auth.resend'), t('auth.resetSent'), 'success');
    }
  });

  // Google sign-in
  async function googleSignIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await auth.signInWithPopup(provider);
      const user = cred.user;
      const doc = await colRef('users').doc(user.uid).get();
      if (!doc.exists) {
        const username = (user.displayName || 'user').replace(/\s+/g, '_').slice(0, 20) + Math.floor(Math.random() * 99);
        await createUserProfile(user, username, '');
      }
      closeModal('authModal');
      toast(t('auth.login'), t('auth.welcomeBack'), 'success');
    } catch (err) {
      toast(t('auth.login'), err.message, 'error');
    }
  }
}

function updateStrength(pw) {
  const meter = el('pwStrength');
  const label = el('pwStrengthLabel');
  if (!meter) return;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  meter.className = 'strength-meter';
  if (pw.length === 0) { label.textContent = ''; return; }
  if (score <= 1) { meter.classList.add('weak'); label.textContent = t('pw.weak'); }
  else if (score === 2) { meter.classList.add('medium'); label.textContent = t('pw.medium'); }
  else if (score === 3) { meter.classList.add('strong'); label.textContent = t('pw.strong'); }
  else { meter.classList.add('very-strong'); label.textContent = t('pw.veryStrong'); }
}

function switchAuthPane(pane) {
  el('loginForm').classList.toggle('hidden', pane !== 'login');
  el('signupForm').classList.toggle('hidden', pane !== 'signup');
  el('forgotForm').classList.toggle('hidden', pane !== 'forgot');
  el('authTabLogin').classList.toggle('active', pane === 'login');
  el('authTabSignup').classList.toggle('active', pane === 'signup');
}

async function createUserProfile(user, username, referralCode) {
  const cleanName = username.replace(/[^\w\u0600-\u06FF ]/g, '').slice(0, 24);
  const myCode = uid().slice(0, 8);
  const data = {
    uid: user.uid,
    email: user.email || '',
    username: cleanName || 'user' + Math.floor(Math.random() * 9999),
    avatar: '',
    country: '',
    bio: '',
    referralCode: myCode,
    referredBy: referralCode || '',
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastClaimDate: '',
    streakFreezes: 0,
    status: 'active',
    accountStatus: 'pending',
    verification: { email: !!user.emailVerified, phone: false, identity: false },
    fraudScore: 0,
    flags: [],
    devices: [getDeviceFingerprint()],
    sessions: [],
    offersCompleted: 0,
    surveysCompleted: 0,
    adsWatchedToday: 0,
    adsDate: todayKey(),
    dailyBonusClaimed: false,
    wheelSpun: false,
    scratchUsed: false,
    mysteryOpened: false,
    treasureOpened: false,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    totalWithdrawn: 0,
    referralEarned: 0,
    referralCount: 0,
    stats: { daily: 0, weekly: 0, monthly: 0 },
    settings: { lang: State.lang, theme: State.theme, notifications: true }
  };
  await colRef('users').doc(user.uid).set(data);
  State.profile = data;

  // Referral linkage
  if (referralCode) {
    try {
      const refs = await colRef('users').where('referralCode', '==', referralCode).limit(1).get();
      if (!refs.empty) {
        const ref = refs.docs[0];
        await colRef('referrals').add({
          referrerId: ref.id,
          referredId: user.uid,
          referredName: cleanName,
          code: referralCode,
          status: 'joined',
          createdAt: serverTimestamp()
        });
        await colRef('notifications').add({
          uid: ref.id,
          type: 'referral',
          title: t('notif.refJoined'),
          body: cleanName + ' ' + t('notif.joinedUsingYourCode'),
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) { console.warn('referral link failed', e); }
  }

  // Welcome notification
  await colRef('notifications').add({
    uid: user.uid,
    type: 'welcome',
    title: t('notif.welcome'),
    body: t('notif.welcomeBody'),
    read: false,
    createdAt: serverTimestamp()
  });

  // Signup bonus ledger entry
  await addLedger(user.uid, 'signup', t('ledger.signupBonus'), State.settings.signupBonus || 100, 'signup', { ref: 'signup' });
  return data;
}

/* ============================================================================
   11. LEDGER SYSTEM (wallet core)
   ============================================================================ */
async function addLedger(uidVal, type, desc, coins, status = 'completed', meta = {}) {
  const entry = {
    uid: uidVal,
    type,
    description: desc,
    coins: Math.round(coins),
    balanceBefore: 0,
    balanceAfter: 0,
    status,
    reference: meta.ref || uid(),
    provider: meta.provider || '',
    createdAt: serverTimestamp()
  };
  const batch = db.batch();
  const userRef = colRef('users').doc(uidVal);
  const ledgerRef = colRef('ledger').doc();
  batch.set(ledgerRef, entry);
  if (status === 'completed') {
    if (coins >= 0) {
      batch.update(userRef, { lifetimeEarned: increment(Math.abs(coins)) });
    } else {
      batch.update(userRef, { lifetimeSpent: increment(Math.abs(coins)) });
    }
  }
  await batch.commit();
  return ledgerRef.id;
}

async function computeWallet(uidVal) {
  let coins = 0, pending = 0, locked = 0, earned = 0, spent = 0, withdrawn = 0;
  const snap = await colRef('ledger').where('uid', '==', uidVal).orderBy('createdAt', 'desc').limit(500).get();
  const list = [];
  snap.forEach(d => {
    const e = d.data();
    e.id = d.id;
    list.push(e);
    const c = e.coins || 0;
    if (e.status === 'pending' && c > 0) pending += c;
    else if (e.status === 'locked' && c > 0) locked += c;
    else if (e.status === 'completed') {
      if (e.type === 'withdrawal' && c < 0) { withdrawn += Math.abs(c); }
      if (c > 0) { coins += c; earned += c; }
      else { coins += c; spent += Math.abs(c); }
    }
  });
  const profileSnap = await colRef('users').doc(uidVal).get();
  const pf = profileSnap.data() || {};
  coins = Math.max(0, coins - withdrawn);
  return { coins: Math.floor(coins), pending: Math.floor(pending), locked: Math.floor(locked), earned: Math.floor(earned), spent: Math.floor(spent), withdrawn: Math.floor(withdrawn), list };
}

/* ============================================================================
   12. DATA LOADING (catalog)
   ============================================================================ */
async function loadSettings() {
  try {
    const doc = await docRef('settings/global').get();
    if (doc.exists) State.settings = Object.assign({}, doc.data());
  } catch (e) { State.settings = {}; }
  State.settings = Object.assign({
    signupBonus: 100,
    minWithdraw: 10000,
    coinRate: 10000,
    adReward: 120,
    adDailyCap: 15,
    withdrawalFeePct: 1,
    referralPercent: 10,
    maintenance: false,
    siteUrl: location.origin + location.pathname
  }, State.settings);
}

async function loadCatalog() {
  const jobs = [];
  const getCol = (name) => colRef(name).get().then(s => s.docs.map(d => Object.assign({ id: d.id }, d.data()))).catch(() => []);
  const [offers, games, surveys, rewards, providers, faqs, events, promos, posts] = await Promise.all([
    getCol('offers'), getCol('games'), getCol('surveys'), getCol('rewards'),
    getCol('providers'), getCol('faqs'), getCol('events'), getCol('promos'), getCol('posts')
  ]);
  State.offers = offers.filter(o => o.active !== false);
  State.games = games.filter(g => g.active !== false);
  State.surveys = surveys.filter(s => s.active !== false);
  State.rewards = rewards.filter(r => r.active !== false);
  State.providers = providers.filter(p => p.active !== false);
  State.faqs = faqs;
  State.events = events;
  State.promos = promos;
  State.posts = posts;
}

/* ============================================================================
   13. NAVIGATION
   ============================================================================ */
const PAGES = ['home','earn','offers','games','surveys','watch','daily','tasks','challenges','checkin','streaks','referral','leaderboard','rewards','topup','withdraw','transactions','notifications','support','profile','security','faq','terms','privacy','antifraud','wallet','promo','events','blog','article','history','offlinerewards','more'];

function navigate(page) {
  State.currentPage = page;
  PAGES.forEach(p => {
    const sec = el('page-' + p);
    if (sec) sec.classList.toggle('active', p === page);
  });
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.getAttribute('data-nav') === page));
  $$('.mobile-nav .mn-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-nav') === page));
  document.getElementById('drawer').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const requiresAuth = ['wallet','withdraw','topup','transactions','notifications','profile','security','referral','history','offlinerewards','checkin','streaks','challenges','tasks'];
  if (requiresAuth.includes(page) && !State.user) {
    openModal('authModal');
    return;
  }
  renderPage(page);
}

function renderPage(page) {
  const renderers = {
    home: renderHome,
    earn: renderEarn,
    offers: renderOffers,
    games: renderGames,
    surveys: renderSurveys,
    watch: renderWatch,
    daily: renderDaily,
    tasks: renderTasks,
    challenges: renderChallenges,
    checkin: renderCheckin,
    streaks: renderStreaks,
    referral: renderReferral,
    leaderboard: renderLeaderboard,
    rewards: renderRewards,
    topup: renderTopup,
    withdraw: renderWithdraw,
    transactions: renderTransactions,
    notifications: renderNotifications,
    support: renderSupport,
    profile: renderProfile,
    security: renderSecurity,
    faq: renderFaq,
    terms: renderTerms,
    privacy: renderPrivacy,
    antifraud: renderAntifraud,
    wallet: renderWallet,
    promo: renderPromo,
    events: renderEvents,
    blog: renderBlog,
    history: renderHistory,
    offlinerewards: renderOfflineRewards,
    more: renderMore
  };
  if (renderers[page]) renderers[page]();
}

function initNavigation() {
  document.addEventListener('click', (e) => {
    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.preventDefault();
      navigate(navEl.getAttribute('data-nav'));
    }
  });
  el('hamburger').addEventListener('click', () => el('drawer').classList.add('open'));
  el('drawerScrim').addEventListener('click', () => el('drawer').classList.remove('open'));
  el('toTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    el('toTopBtn').classList.toggle('show', window.scrollY > 500);
  });
}

/* ============================================================================
   14. RENDER HELPERS
   ============================================================================ */
function emptyState(container, icon, title, sub, extraHtml) {
  const box = typeof container === 'string' ? el(container) : container;
  if (!box) return;
  box.innerHTML = '<div class="empty-state"><div class="es-ico">' + (icon || '🗂️') +
    '</div><div class="es-title">' + title + '</div>' +
    (sub ? '<div class="es-sub">' + sub + '</div>' : '') +
    (extraHtml ? extraHtml : '') + '</div>';
}

function skeletonGrid(container, n, cls) {
  const box = typeof container === 'string' ? el(container) : container;
  if (!box) return;
  let html = '';
  for (let i = 0; i < (n || 4); i++) html += '<div class="card ' + (cls || '') + '"><div class="skeleton-line" style="height:90px"></div><div class="skeleton-line w-70"></div><div class="skeleton-line w-40"></div></div>';
  box.innerHTML = html;
}

function guardAuth() {
  if (State.user && State.profile) return true;
  const body = el('genericModalBody');
  if (body) {
    body.innerHTML = '<div class="text-center py-4"><div class="es-ico">🔒</div>' +
      '<div class="es-title">' + t('auth.login') + '</div>' +
      '<div class="es-sub">' + t('auth.needLogin') + '</div>' +
      '<button class="btn btn-accent btn-lg mt-3" data-action="openAuth">' + t('auth.login') + '</button></div>';
  }
  openModal('genericModal');
  return false;
}

async function updateBalanceUI() {
  if (!State.user) return;
  try {
    State.wallet = await computeWallet(State.user.uid);
  } catch (e) { return; }
  const w = State.wallet || { coins: 0, pending: 0, locked: 0, earned: 0, spent: 0, withdrawn: 0, list: [] };
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('homeBalance', fmtCoins(w.coins));
  set('homePending', fmtCoins(w.pending));
  set('homeLifetime', fmtCoins(w.earned));
  const pf = State.profile || {};
  set('homeStreak', pf.streak || 0);
  set('topupCoinBalance', fmtCoins(w.coins));
  set('wdAvailable', fmtCoins(w.coins));
  set('wdPending', fmtCoins(w.pending));
  const ratio = w.coins > 0 ? (w.coins * (1 - (State.settings.withdrawalFeePct || 1) / 100) / State.settings.coinRate).toFixed(2) : '0.00';
  const conv = el('wdConvertHint');
  if (conv) conv.textContent = fmtCoins(State.settings.coinRate) + ' coins = $1.00';
  const min = el('wdMin');
  if (min) min.textContent = t('withdraw.minLabel').replace('{n}', fmtCoins(State.settings.minWithdraw || 10000));
  // wallet page totals
  set('walletTotal', fmtCoins(w.coins));
  set('wtAvailable', fmtCoins(w.coins));
  set('wtPending', fmtCoins(w.pending));
  set('wtLocked', fmtCoins(w.locked));
  set('wtLifetime', fmtCoins(w.earned));
  set('wtSpent', fmtCoins(w.spent));
  set('wtWithdrawn', fmtCoins(w.withdrawn));
  const pf2 = State.profile || {};
  set('pfWithdrawn', '$' + ((pf2.totalWithdrawn || w.withdrawn || 0) / State.settings.coinRate).toFixed(2));
  // navbar balance pill
  const pill = el('navBalance');
  if (pill) {
    pill.innerHTML = '🪙 ' + fmtCoins(w.coins);
    pill.style.display = 'flex';
  }
}

function renderHomeStats() {
  const u = el('heroStatUsers');
  if (u) animateNumber(u, 0, 12000 + Math.floor(Math.random() * 5000), 1500);
  const paid = el('heroStatPaid');
  if (paid) animateNumber(paid, 0, 42000, 1500, (v) => '$' + fmtNum(v));
  const coins = el('heroStatCoins');
  if (coins) animateNumber(coins, 0, 8900000, 1800);
  const top = el('heroStatTop');
  if (top) top.textContent = (State.leaderboard && State.leaderboard.length ? State.leaderboard[0].username : '—');
}

function renderTicker() {
  const names = ['Sarah', 'Mohammed', 'Ahmed', 'Lina', 'Omar', 'Yusuf', 'Aya', 'Karim', 'Nour', 'Adam', 'Fatima', 'Zaid', 'Maya', 'Hassan', 'Rania'];
  const acts = [
    { t: '🎉 <b>{n}</b> just earned <span class="coin-t">{c}</span> coins', c: () => (Math.floor(Math.random() * 40) + 3) * 100 },
    { t: '🎉 <b>{n}</b> withdrew <span class="coin-t">${c}</span>', c: () => (Math.floor(Math.random() * 9) + 5) },
    { t: '🎉 <b>{n}</b> completed a survey <span class="coin-t">+{c}</span>', c: () => (Math.floor(Math.random() * 8) + 2) * 100 },
    { t: '🎉 <b>{n}</b> reached level {c}', c: () => Math.floor(Math.random() * 18) + 5 }
  ];
  const items = [];
  for (let i = 0; i < 8; i++) {
    const a = acts[Math.floor(Math.random() * acts.length)];
    items.push('<span class="ticker-item">' + a.t.replace('{n}', names[Math.floor(Math.random() * names.length)]).replace('{c}', fmtNum(a.c())) + '</span>');
  }
  const track = el('tickerTrack');
  if (track) track.innerHTML = items.join('');
}

function renderAccountStatusStrip() {
  const strip = el('accountStatusStrip');
  if (!strip) return;
  const pf = State.profile || {};
  if (!State.user) {
    strip.innerHTML = '<div class="alert alert-info"><span class="a-ico">💡</span><div class="a-body"><div class="a-title">' + t('auth.needLogin') + '</div>' +
      '<span>' + t('home.unlockStrip') + '</span></div>' +
      '<button class="btn btn-accent btn-sm" data-action="openAuth">' + t('auth.login') + '</button></div>';
    return;
  }
  const chunks = [];
  if (pf.accountStatus === 'pending') chunks.push('<span class="badge badge-warning">⏳ ' + t('account.pending') + '</span>');
  if (pf.accountStatus === 'restricted') chunks.push('<span class="badge badge-danger">⛔ ' + t('account.restricted') + '</span>');
  if (!(pf.verification && pf.verification.email)) chunks.push('<span class="badge badge-info">📧 ' + t('account.verifyEmail') + '</span>');
  if ((pf.fraudScore || 0) > 60) chunks.push('<span class="badge badge-danger">🛡️ ' + t('account.flagged') + '</span>');
  if (!chunks.length) chunks.push('<span class="badge badge-success">✅ ' + t('account.good') + '</span>');
  strip.innerHTML = '<div class="flex wrap gap-2">' + chunks.join('') + '</div>';
}

function offerCardHtml(o, idx) {
  const badge = (o.badge && o.badge !== 'none') ? '<span class="offer-badge">' + o.badge + '</span>' : '';
  const track = (o.track && o.track.length) ? '<div class="offer-tracks"><span class="ot-pill">' + o.track.map(t2 => '<span class="ot-icon" title="' + t2 + '">' + t2 + '</span>').join('') + '</span></div>' : '';
  const dev = (o.devices && o.devices.length) ? '<span class="text-xs text-muted">' + o.devices.join(' · ') + '</span>' : '';
  return '<div class="card offer-card reveal" style="animation-delay:' + (idx % 6) * 60 + 'ms">' +
    '<div class="offer-head">' +
    '<div class="of-logo" style="background:' + (o.color || 'linear-gradient(135deg,#6a11cb,#2575fc)') + '">' + (o.icon || '🎯') + '</div>' +
    '<div class="of-info"><div class="of-name">' + esc(o.title) + '</div>' +
    '<div class="of-provider">' + (o.provider || 'Provider') + '</div></div>' +
    badge +
    '</div>' +
    '<div class="of-desc">' + esc(o.description || '') + '</div>' +
    '<div class="of-meta">' +
    '<div class="of-payout"><span class="coin-t">+' + fmtCoins(o.payout || o.reward || 0) + '</span><span class="of-usd">≈ $' + ((o.payoutValue || ((o.payout || 0) / State.settings.coinRate)).toFixed(2)) + '</span></div>' +
    dev +
    '</div>' +
    track +
    '<button class="btn btn-accent btn-sm btn-block mt-3" data-action="openOffer" data-id="' + o.id + '">' + t('offers.viewDetails') + ' →</button>' +
    '</div>';
}

function gameCardHtml(g, idx) {
  const ms = (g.milestones && g.milestones.length) ? g.milestones.map(m =>
    '<div class="ms-item"><span class="ms-ico">' + (m.icon || '🎯') + '</span><span class="ms-label">' + esc(m.label) + '</span><span class="ms-reward">+' + fmtCoins(m.reward || 0) + '</span></div>').join('') : '';
  return '<div class="card game-card reveal" style="animation-delay:' + (idx % 6) * 60 + 'ms">' +
    '<div class="game-top"><div class="game-logo" style="background:' + (g.color || 'linear-gradient(135deg,#ff6a00,#ffb800)') + '">' + (g.icon || '🎮') + '</div>' +
    '<div class="game-info"><div class="game-name">' + esc(g.title) + '</div>' +
    '<div class="text-xs text-muted">' + (g.platform || '') + ' · ' + (g.category || '') + '</div></div>' +
    '<span class="badge ' + (g.trending ? 'badge-danger' : 'badge-info') + '">' + (g.trending ? '🔥' : '💎') + '</span></div>' +
    (g.rating ? '<div class="game-rating">⭐ ' + g.rating + ' <span class="text-xs text-muted">(' + fmtNum(g.installs || 0) + ')</span></div>' : '') +
    '<div class="mt-2 flex flex-col gap-1">' + ms + '</div>' +
    '<button class="btn btn-primary btn-sm btn-block mt-3" data-action="openGame" data-id="' + g.id + '">' + t('games.playNow') + ' →</button>' +
    '</div>';
}

function surveyCardHtml(s, idx) {
  return '<div class="card survey-card reveal" style="animation-delay:' + (idx % 6) * 60 + 'ms">' +
    '<div class="survey-head"><div class="survey-ico">📋</div>' +
    '<div class="survey-info"><div class="survey-title">' + esc(s.title) + '</div>' +
    '<div class="text-xs text-muted">' + (s.category || t('surveys.general')) + '</div></div></div>' +
    '<div class="survey-meta">' +
    '<span class="sv-chip">⏱️ ' + (s.minutes || 5) + ' ' + t('surveys.min') + '</span>' +
    '<span class="sv-chip">⭐ ' + (s.rating || '4.5') + '</span>' +
    '<span class="sv-chip coin-t">+' + fmtCoins(s.reward || s.payout || 0) + '</span>' +
    '</div>' +
    '<div class="survey-progress"><div class="sp-fill" style="width:' + (s.slotsLeft > 0 ? '30%' : '100%') + '"></div></div>' +
    '<div class="flex items-center justify-between mt-2">' +
    '<span class="text-xs ' + (s.slotsLeft > 0 ? 'text-muted' : 'text-danger') + '">' + (s.slotsLeft > 0 ? (s.slotsLeft + ' ' + t('surveys.slotsLeft')) : t('surveys.full')) + '</span>' +
    '<button class="btn btn-sm ' + (s.slotsLeft > 0 ? 'btn-success' : 'btn-ghost') + '" data-action="openSurvey" data-id="' + s.id + '">' + t('surveys.start') + '</button>' +
    '</div></div>';
}

function rewardCardHtml(r, idx) {
  const denom = (r.denominations && r.denominations.length) ? r.denominations.slice(0, 3).map(d => '<span class="rd-chip">' + esc(d.label) + '</span>').join('') : '';
  return '<div class="card reward-card reveal" style="animation-delay:' + (idx % 6) * 60 + 'ms">' +
    '<div class="rw-logo" style="background:' + (r.color || 'linear-gradient(135deg,#00e676,#009688)') + '">' + (r.icon || '🎁') + '</div>' +
    '<div class="rw-name">' + esc(r.title) + '</div>' +
    '<div class="rw-sub">' + esc(r.category || '') + '</div>' +
    (denom ? '<div class="flex wrap gap-1 mt-2 justify-center">' + denom + '</div>' : '') +
    '<div class="rw-from">' + t('rewards.from') + ' <b class="coin-t">' + fmtCoins(r.price || 0) + '</b></div>' +
    '<button class="btn btn-sm btn-block mt-2 ' + (r.stock <= 0 ? 'btn-ghost' : 'btn-accent') + '" data-action="openReward" data-id="' + r.id + '" ' + (r.stock <= 0 ? 'disabled' : '') + '>' + (r.stock <= 0 ? t('rewards.outOfStock') : t('rewards.redeem')) + '</button>' +
    '</div>';
}

function txItemHtml(e) {
  const plus = (e.coins || 0) >= 0;
  const ico = plus ? '✅' : '💵';
  const icoBg = plus ? 'rgba(0,230,118,.14)' : 'rgba(255,61,113,.14)';
  const status = e.status === 'pending' ? '<span class="badge badge-warning">⏳</span>' : (e.status === 'locked' ? '<span class="badge badge-info">🔒</span>' : '');
  const time = e.createdAt && e.createdAt.toMillis ? timeAgo(e.createdAt.toMillis()) : '';
  return '<div class="ledger-item">' +
    '<span class="lg-ico" style="background:' + icoBg + '">' + ico + '</span>' +
    '<div class="lg-body"><div class="lg-title">' + esc(e.description || '') + '</div>' +
    '<div class="lg-sub">' + esc(e.reference || '') + (time ? ' · ' + time : '') + '</div></div>' +
    status +
    '<div class="lg-amount ' + (plus ? 'lg-plus' : 'lg-minus') + '">' + (plus ? '+' : '') + fmtCoins(e.coins || 0) + '</div>' +
    '</div>';
}

function notifItemHtml(n) {
  const icoMap = { referral: '👥', offer: '🎯', game: '🎮', survey: '📋', daily: '🎁', withdrawal: '💵', welcome: '🎉', promo: '🎟️', ad: '📺', system: '🔔', reward: '🎁' };
  const ico = icoMap[n.type] || '🔔';
  const time = n.createdAt && n.createdAt.toMillis ? timeAgo(n.createdAt.toMillis()) : '';
  return '<div class="notif-item ' + (n.read ? '' : 'unread') + '" data-id="' + n.id + '" data-action="markNotif">' +
    '<span class="nt-ico">' + ico + '</span>' +
    '<div class="nt-body"><div class="nt-title">' + esc(n.title || '') + '</div>' +
    '<div class="nt-sub">' + esc(n.body || '') + '</div>' +
    '<div class="nt-time">' + time + '</div></div>' +
    '<span class="nt-dot"></span></div>';
}

/* ============================================================================
   15. PAGE RENDERERS
   ============================================================================ */
async function renderHome() {
  if (!State.catalogLoaded) { await loadCatalog().then(() => { State.catalogLoaded = true; }); }
  renderHomeStats();
  renderTicker();
  renderAccountStatusStrip();
  updateBalanceUI();

  // Daily CTA
  const pf = State.profile || {};
  const dcard = el('dailyCtaCard');
  const dsub = el('dailyCtaSub');
  if (dcard) dcard.classList.toggle('hidden', !State.user);
  if (dsub) {
    if (State.user && pf.lastClaimDate === todayKey()) dsub.textContent = t('home.dailyClaimed');
    else if (State.user) dsub.textContent = t('home.dailyReady');
    else dsub.textContent = t('home.dailyLogin');
  }

  // Top offers
  const topOffers = (State.offers || []).slice().sort((a, b) => (b.payout || 0) - (a.payout || 0)).slice(0, 4);
  const topGrid = el('topOffersGrid');
  if (topGrid) topGrid.innerHTML = topOffers.length ? topOffers.map((o, i) => offerCardHtml(o, i)).join('') : skeletonGrid(topGrid, 4);

  // Top games
  const topGames = (State.games || []).slice().sort((a, b) => (b.installs || 0) - (a.installs || 0)).slice(0, 4);
  const tgGrid = el('topGamesGrid');
  if (tgGrid) tgGrid.innerHTML = topGames.length ? topGames.map((g, i) => gameCardHtml(g, i)).join('') : skeletonGrid(tgGrid, 4);

  // Popular rewards
  const popRewards = (State.rewards || []).slice().sort((a, b) => (a.price || 0) - (b.price || 0)).slice(0, 4);
  const prGrid = el('popularRewardsGrid');
  if (prGrid) prGrid.innerHTML = popRewards.length ? popRewards.map((r, i) => rewardCardHtml(r, i)).join('') : skeletonGrid(prGrid, 4);

  // Best surveys
  const bestSurveys = (State.surveys || []).slice().sort((a, b) => (b.reward || 0) - (a.reward || 0)).slice(0, 3);
  const bsGrid = el('bestSurveysGrid');
  if (bsGrid) bsGrid.innerHTML = bestSurveys.length ? bestSurveys.map((s, i) => surveyCardHtml(s, i)).join('') : skeletonGrid(bsGrid, 3);

  // Active events
  const events = (State.events || []).filter(ev => ev.active !== false).slice(0, 3);
  const evGrid = el('activeEventsGrid');
  if (evGrid) evGrid.innerHTML = events.length ? events.map(ev =>
    '<div class="card event-card reveal"><div class="ev-badge">' + (ev.icon || '🎉') + '</div>' +
    '<div class="ev-name">' + esc(ev.title) + '</div><div class="ev-sub">' + esc(ev.subtitle || '') + '</div>' +
    '<div class="ev-date">📅 ' + esc(ev.endsAt || '') + '</div>' +
    '<button class="btn btn-sm btn-accent btn-block mt-2" data-action="openEvent" data-id="' + ev.id + '">' + t('events.joinNow') + '</button></div>').join('')
    : emptyState(evGrid, '🎉', t('events.none'), t('events.noneSub'));

  // Promo codes
  const promos = (State.promos || []).filter(p => p.active !== false).slice(0, 3);
  const promoGrid = el('promoCodesGrid');
  if (promoGrid) promoGrid.innerHTML = promos.length ? promos.map(p =>
    '<div class="promo-chip"><div class="pc-ico">🎟️</div><div><div class="font-bold">' + esc(p.code) + '</div>' +
    '<div class="text-xs text-muted">' + esc(p.title || '') + '</div></div>' +
    '<button class="btn btn-xs btn-accent" data-action="applyPromo" data-code="' + p.code + '">' + t('promo.use') + '</button></div>').join('')
    : emptyState(promoGrid, '🎟️', t('promo.none'), t('promo.noneSub'));

  // Blog
  const posts = (State.posts || []).slice(0, 3);
  const blogGrid = el('blogGrid');
  if (blogGrid) blogGrid.innerHTML = posts.length ? posts.map(p =>
    '<div class="card blog-card reveal"><div class="blog-thumb">' + (p.icon || '📰') + '</div>' +
    '<div class="blog-title">' + esc(p.title) + '</div>' +
    '<div class="text-xs text-muted">' + timeAgo((p.createdAt && p.createdAt.toMillis ? p.createdAt.toMillis() : Date.now())) + '</div>' +
    '<button class="btn btn-ghost btn-sm btn-block mt-2" data-action="openPost" data-id="' + p.id + '">' + t('blog.read') + '</button></div>').join('')
    : emptyState(blogGrid, '📰', t('blog.none'), t('blog.noneSub'));
}

async function renderEarn() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  if (!State.catalogLoaded) { await loadCatalog().then(() => { State.catalogLoaded = true; }); }

  const offers = (State.offers || []).slice(0, 6);
  const grid = el('earnOffersGrid');
  if (grid) grid.innerHTML = offers.length ? offers.map((o, i) => offerCardHtml(o, i)).join('') : emptyState(grid, '🎯', t('offers.none'), t('offers.noneSub'));

  const adList = el('adOpportunitiesList');
  if (adList) {
    const cap = State.settings.adDailyCap || 15;
    const used = (State.profile && State.profile.adsWatchedToday) || 0;
    const left = Math.max(0, cap - used);
    adList.innerHTML = '<div class="card ad-rew reveal"><div class="play-ring">📺</div>' +
      '<div class="font-black">' + t('watch.rewVideoTitle') + '</div>' +
      '<div class="text-xs text-muted mb-2">+' + fmtCoins(State.settings.adReward || 120) + ' ' + t('watch.perAd') + ' · ' + left + ' ' + t('watch.remaining') + '</div>' +
      '<button class="btn btn-accent btn-sm" data-action="watchAd">' + t('watch.watchNow') + '</button></div>';
  }

  const sponsor = el('sponsoredTasksList');
  if (sponsor) {
    const tasks = (State.offers || []).filter(o => o.type === 'task' || o.badge).slice(0, 4);
    sponsor.innerHTML = tasks.length ? tasks.map(o =>
      '<div class="ch-track-item"><div class="ct-ico">' + (o.icon || '🎯') + '</div>' +
      '<div class="ct-body"><div class="ct-title">' + esc(o.title) + '</div><div class="ct-sub">' + esc(o.description || '') + '</div></div>' +
      '<div class="ct-reward">+' + fmtCoins(o.payout || 0) + '</div>' +
      '<div class="ct-progress"><span style="width:' + (o.progress || 0) + '%"></span></div></div>').join('')
      : emptyState(sponsor, '🎯', t('tasks.none'), t('tasks.noneSub'));
  }
}

async function renderOffers() {
  if (!State.catalogLoaded) { await loadCatalog().then(() => { State.catalogLoaded = true; }); }
  const offers = State.offers || [];
  const tabs = el('providerTabs');
  if (tabs) {
    const provs = ['all'].concat(Array.from(new Set(offers.map(o => o.provider).filter(Boolean)))).slice(0, 6);
    tabs.innerHTML = provs.map((p, i) => '<button class="tab ' + (i === 0 ? 'active' : '') + '" data-provider="' + esc(p) + '">' + (p === 'all' ? t('offers.all') : esc(p)) + '</button>').join('');
  }
  const grid = el('offersGrid');
  if (grid) {
    grid.innerHTML = offers.length ? offers.map((o, i) => offerCardHtml(o, i)).join('') : emptyState(grid, '🎯', t('offers.none'), t('offers.noneSub'), '<button class="btn btn-accent btn-sm mt-2" data-action="openAuth">' + t('auth.login') + '</button>');
  }
}

async function renderGames() {
  if (!State.catalogLoaded) { await loadCatalog().then(() => { State.catalogLoaded = true; }); }
  const games = State.games || [];
  const grid = el('gamesGrid');
  if (grid) grid.innerHTML = games.length ? games.map((g, i) => gameCardHtml(g, i)).join('') : emptyState(grid, '🎮', t('games.none'), t('games.noneSub'));
}

async function renderSurveys() {
  if (!State.catalogLoaded) { await loadCatalog().then(() => { State.catalogLoaded = true; }); }
  const surveys = State.surveys || [];
  const grid = el('surveysGrid');
  if (grid) grid.innerHTML = surveys.length ? surveys.map((s, i) => surveyCardHtml(s, i)).join('') : emptyState(grid, '📋', t('surveys.none'), t('surveys.noneSub'));
}

async function renderWatch() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const pf = State.profile || {};
  const cap = State.settings.adDailyCap || 15;
  const used = pf.adsWatchedToday || 0;
  const left = Math.max(0, cap - used);
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('watchCount', used);
  set('watchRemaining', left);
  set('watchEarnedToday', fmtCoins(used * (State.settings.adReward || 120)));
  const hint = el('watchHint');
  if (hint) hint.textContent = '+' + fmtCoins(State.settings.adReward || 120) + ' coins per ad';
  const btn = el('watchAdBtn');
  if (btn) {
    btn.disabled = left <= 0;
    btn.classList.toggle('btn-ghost', left <= 0);
    btn.innerHTML = left <= 0 ? '⏳ <span data-i18n="watch.done">' + t('watch.done') + '</span>' : '🎬 <span data-i18n="watch.watchNow">' + t('watch.watchNow') + '</span>';
  }
}

async function renderDaily() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const streak = pf.streak || 0;
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('dailyStreakNum', streak);
  set('dailyBonusMult', 'x' + (streak >= 7 ? 2 : streak >= 4 ? 1.5 : 1));

  const grid = el('dailyGrid');
  if (grid) {
    grid.innerHTML = DAILY_PLAN.map((r, i) => {
      const day = i + 1;
      const claimed = pf.claimedDays && pf.claimedDays.includes(day);
      const isToday = day === ((streak % 7) + 1) || (claimed && day === ((streak % 7)));
      let cls = 'day-cell';
      if (claimed) cls += ' done';
      if (!claimed && isToday) cls += ' today';
      return '<div class="' + cls + '"><span class="day-num">' + day + '</span>' +
        '<span class="day-reward">+' + fmtNum(r) + '</span>' +
        '<span class="day-label">' + t('daily.day') + '</span>' +
        (claimed ? '<span class="day-check">✓</span>' : '') + '</div>';
    }).join('');
  }

  const claimBtn = el('dailyClaimBtn');
  if (claimBtn) {
    const done = pf.lastClaimDate === todayKey();
    claimBtn.disabled = done;
    claimBtn.innerHTML = done
      ? '✅ <span data-i18n="daily.claimed">' + t('daily.claimed') + '</span>'
      : '🎁 <span data-i18n="daily.claim">' + t('daily.claim') + '</span>';
  }

  // streak bar
  const bar = el('streakBar');
  if (bar) {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    bar.innerHTML = days.map((d, i) => '<div class="sb-day' + (i === (streak % 7) ? ' active' : '') + (i < (streak % 7) ? ' done' : '') + '"><span class="sbd-ico">' + (i < (streak % 7) ? '🔥' : '🌑') + '</span><span class="sbd-name">' + d + '</span></div>').join('');
  }

  // spin wheel state
  renderWheelState();
  renderScratchState();
  renderMysteryState();
  renderTreasureState();
}

function renderWheelState() {
  const st = el('spinWheelStatus');
  const btn = el('spinWheelBtn');
  if (!btn) return;
  const spun = (State.profile && State.profile.wheelSpunDate) === todayKey();
  btn.disabled = spun;
  if (st) st.textContent = spun ? t('daily.wheelSpun') : t('daily.wheelReady');
  btn.classList.toggle('btn-ghost', spun);
}

function renderScratchState() {
  const st = el('scratchStatus');
  const cover = el('scratchCover');
  const result = el('scratchResult');
  if (!cover) return;
  const used = (State.profile && State.profile.scratchDate) === todayKey();
  if (used) {
    if (cover) cover.style.display = 'none';
    if (result) result.textContent = '+' + fmtCoins((State.profile && State.profile.scratchReward) || 0);
    if (st) st.textContent = t('daily.scratchDone');
  } else {
    if (cover) cover.style.display = '';
    if (result) result.textContent = '+0';
    if (st) st.textContent = t('daily.scratchReady');
  }
}

function renderMysteryState() {
  const st = el('mysteryStatus');
  const box = el('mysteryBox');
  if (!box) return;
  const used = (State.profile && State.profile.mysteryDate) === todayKey();
  if (used) {
    box.textContent = '🎉';
    box.classList.add('opened');
    if (st) st.textContent = t('daily.mysteryDone');
  } else {
    box.textContent = '🎁';
    box.classList.remove('opened');
    if (st) st.textContent = t('daily.mysteryReady');
  }
}

function renderTreasureState() {
  const st = el('treasureStatus');
  const chest = el('treasureChest');
  if (!chest) return;
  const used = (State.profile && State.profile.treasureDate) === todayKey();
  if (used) {
    chest.textContent = '💎';
    chest.classList.add('opened');
    if (st) st.textContent = t('daily.treasureDone');
  } else {
    chest.textContent = '🏴‍☠️';
    chest.classList.remove('opened');
    if (st) st.textContent = t('daily.treasureReady');
  }
}

async function renderTasks() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const grid = el('tasksGrid');
  if (!grid) return;
  const ads = pf.adsWatchedToday || 0;
  const dailyTasks = [
    { ico: '✅', title: t('tasks.t1'), sub: t('tasks.t1Sub'), reward: 10, done: true, pct: 100 },
    { ico: '📺', title: t('tasks.t2'), sub: ads + '/3', reward: 150, done: ads >= 3, pct: Math.min(100, (ads / 3) * 100) },
    { ico: '🎯', title: t('tasks.t3'), sub: (pf.offersCompleted || 0) + '/1', reward: 300, done: (pf.offersCompleted || 0) >= 1, pct: Math.min(100, (pf.offersCompleted || 0) * 100) }
  ];
  const weeklyTasks = [
    { ico: '🎮', title: t('tasks.t4'), sub: '0/3', reward: 1000, done: false, pct: 0 },
    { ico: '👥', title: t('tasks.t5'), sub: (pf.referralCount || 0) + '/2', reward: 2000, done: (pf.referralCount || 0) >= 2, pct: Math.min(100, ((pf.referralCount || 0) / 2) * 100) },
    { ico: '💎', title: t('tasks.t6'), sub: fmtCoins(pf.lifetimeEarned || 0) + '/5,000', reward: 2500, done: (pf.lifetimeEarned || 0) >= 5000, pct: Math.min(100, ((pf.lifetimeEarned || 0) / 5000) * 100) }
  ];
  const trackHtml = (list, cols) => '<div class="card challenge-track">' + list.map(tsk =>
    '<div class="ch-track-item' + (tsk.done ? ' done' : '') + '"><div class="ct-ico">' + (tsk.done ? '✅' : tsk.ico) + '</div>' +
    '<div class="ct-body"><div class="ct-title">' + tsk.title + '</div><div class="ct-sub">' + tsk.sub + '</div></div>' +
    '<div class="ct-reward">+' + fmtNum(tsk.reward) + '</div>' +
    '<div class="ct-progress"><span style="width:' + tsk.pct + '%"></span></div></div>').join('') + '</div>';
  grid.innerHTML = '<div class="grid grid-2 w-100" style="grid-column:1/-1">' + trackHtml(dailyTasks) + trackHtml(weeklyTasks) + '</div>';
}

async function renderChallenges() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const daily = el('dailyChallengesList');
  const weekly = el('weeklyChallengesList');
  const monthly = el('monthlyChallengesList');
  const mk = (items) => items.map(c =>
    '<div class="ch-track-item' + (c.done ? ' done' : '') + '"><div class="ct-ico">' + (c.done ? '✅' : c.ico) + '</div>' +
    '<div class="ct-body"><div class="ct-title">' + c.title + '</div><div class="ct-sub">' + c.sub + '</div></div>' +
    '<div class="ct-reward">+' + fmtNum(c.reward) + '</div>' +
    '<div class="ct-progress"><span style="width:' + c.pct + '%"></span></div></div>').join('');
  if (daily) daily.innerHTML = mk([
    { ico: '📺', title: t('ch.d1'), sub: '0/5', reward: 200, done: false, pct: 0 },
    { ico: '🔥', title: t('ch.d2'), sub: (pf.adsWatchedToday || 0) + '/10', reward: 400, done: (pf.adsWatchedToday || 0) >= 10, pct: Math.min(100, ((pf.adsWatchedToday || 0) / 10) * 100) }
  ]);
  if (weekly) weekly.innerHTML = mk([
    { ico: '🎯', title: t('ch.w1'), sub: '0/5', reward: 1500, done: false, pct: 0 },
    { ico: '💎', title: t('ch.w2'), sub: fmtCoins(pf.lifetimeEarned || 0) + '/20,000', reward: 3000, done: (pf.lifetimeEarned || 0) >= 20000, pct: Math.min(100, ((pf.lifetimeEarned || 0) / 20000) * 100) }
  ]);
  if (monthly) monthly.innerHTML = mk([
    { ico: '🏆', title: t('ch.m1'), sub: '0/20', reward: 5000, done: false, pct: 0 },
    { ico: '👑', title: t('ch.m2'), sub: fmtCoins(pf.referralCount || 0) + '/10', reward: 10000, done: (pf.referralCount || 0) >= 10, pct: Math.min(100, ((pf.referralCount || 0) / 10) * 100) }
  ]);
}

async function renderCheckin() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const streak = pf.streak || 0;
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('checkinTitle', (pf.lastClaimDate === todayKey()) ? t('checkin.done') : t('checkin.today'));
  set('checkinSub', (streak ? streak : 0) + ' ' + t('checkin.dayStreak'));
  const btn = el('checkinBtn');
  if (btn) {
    const done = pf.lastClaimDate === todayKey();
    btn.disabled = done;
    btn.innerHTML = done ? '✅ ' + t('checkin.checkedIn') : '✅ ' + t('checkin.checkIn');
  }
}

async function renderStreaks() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('streakCurrent', pf.streak || 0);
  set('streakBest', pf.bestStreak || 0);
  set('streakFreezes', pf.streakFreezes || 0);

  const cal = el('streakCalendar');
  if (cal) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = now.getDate();
    const heads = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(h => '<span class="cal-head">' + h + '</span>').join('');
    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += '<span class="cal-day muted"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const cls = d === today ? 'today' : '';
      cells += '<span class="cal-day ' + cls + '">' + d + '</span>';
    }
    cal.innerHTML = heads + cells;
  }
}

async function renderReferral() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('refTotal', pf.referralCount || 0);
  set('refEarned', fmtCoins(pf.referralEarned || 0));
  set('refActive', pf.referralCount || 0);

  const link = el('refLinkInput');
  if (link) {
    const ref = pf.referralCode || '';
    link.value = (State.settings.siteUrl || location.href) + '?ref=' + ref;
  }
  const code = el('refCodeInput');
  if (code && !code.value) code.value = pf.referralCode || '';

  const milestones = el('refMilestones');
  if (milestones) {
    const rc = pf.referralCount || 0;
    const ms = [
      { ico: '✓', title: t('ref.m1Title'), sub: t('ref.m1Sub'), reward: 200, done: true },
      { ico: '✓', title: t('ref.m2Title'), sub: t('ref.m2Sub'), reward: 500, done: rc >= 1 },
      { ico: '🎯', title: t('ref.m3Title'), sub: t('ref.m3Sub'), reward: 1000, done: rc >= 1 },
      { ico: '🎯', title: t('ref.m4Title'), sub: t('ref.m4Sub'), reward: 5000, done: rc >= 5 },
      { ico: '🎯', title: t('ref.m5Title'), sub: t('ref.m5Sub'), reward: 15000, done: rc >= 10 },
      { ico: '🎯', title: t('ref.m6Title'), sub: t('ref.m6Sub'), reward: 2000, done: (pf.totalWithdrawn || 0) > 0 }
    ];
    milestones.innerHTML = ms.map(m =>
      '<div class="milestone' + (m.done ? ' done' : '') + '"><span class="ms-ico">' + (m.done ? '✓' : m.ico) + '</span>' +
      '<div class="ms-body"><div class="ms-title">' + m.title + '</div><div class="ms-sub">' + m.sub + '</div></div>' +
      '<div class="ms-reward">+' + fmtNum(m.reward) + '</div></div>').join('');
  }

  // My referrals
  const list = el('refFriendsList');
  if (list) {
    try {
      const snap = await colRef('referrals').where('referrerId', '==', State.user.uid).orderBy('createdAt', 'desc').limit(20).get();
      const items = [];
      snap.forEach(d => {
        const r = d.data();
        items.push('<div class="ledger-item"><span class="lg-ico" style="background:rgba(0,230,118,.14);">👤</span>' +
          '<div class="lg-body"><div class="lg-title">' + esc(r.referredName || '') + '</div>' +
          '<div class="lg-sub">' + esc(r.status || '') + ' · ' + timeAgo(r.createdAt ? r.createdAt.toMillis() : Date.now()) + '</div></div>' +
          '<span class="badge ' + (r.status === 'joined' ? 'badge-success' : 'badge-info') + '">' + (r.status || '') + '</span></div>');
      });
      list.innerHTML = items.length ? items.join('') : emptyState(list, '👥', t('referral.noFriends'), t('referral.noFriendsSub'));
    } catch (e) { emptyState(list, '👥', t('referral.noFriends'), t('referral.noFriendsSub')); }
  }
}

async function renderLeaderboard() {
  const tabs = el('leaderTabs');
  if (tabs) {
    tabs.querySelectorAll('[data-period]').forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('[data-period]').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        renderLeaderboardList(tab.getAttribute('data-period'));
      });
    });
  }
  renderLeaderboardList('today');
}

async function renderLeaderboardList(period) {
  const list = el('leaderboardList');
  if (!list) return;
  skeletonGrid(list, 6, 'lb-row');
  try {
    const snap = await colRef('users').orderBy('xp', 'desc').limit(10).get();
    const rows = [];
    snap.forEach(d => {
      const u = d.data();
      rows.push(u);
    });
    State.leaderboard = rows;
    if (!rows.length) { emptyState(list, '🏆', t('leaderboard.none'), t('leaderboard.noneSub')); return; }
    const medals = ['🥇', '🥈', '🥉'];
    const myId = State.user ? State.user.uid : null;
    list.innerHTML = rows.map((u, i) =>
      '<div class="lb-row' + (u.uid === myId ? ' me' : '') + '">' +
      '<div class="lb-rank' + (i < 3 ? ' top' : '') + '">' + (medals[i] || (i + 1)) + '</div>' +
      '<div class="lb-ava">' + (u.avatar ? '<img src="' + esc(u.avatar) + '">' : (u.username || '?').charAt(0).toUpperCase()) + '</div>' +
      '<div class="lb-body"><div class="lb-name">' + esc(u.username || '') + (u.uid === myId ? ' <span class="badge badge-info">' + t('leaderboard.you') + '</span>' : '') + '</div>' +
      '<div class="lb-sub">' + t('leaderboard.level') + ' ' + (u.level || 1) + '</div></div>' +
      '<div class="lb-xp">' + fmtCoins(u.lifetimeEarned || 0) + '</div>' +
      '</div>').join('');
  } catch (e) {
    emptyState(list, '🏆', t('leaderboard.none'), t('leaderboard.noneSub'));
  }
}

async function renderRewards() {
  if (!State.catalogLoaded) { await loadCatalog().then(() => { State.catalogLoaded = true; }); }
  const rewards = State.rewards || [];
  const tabs = el('rewardTabs');
  if (tabs) {
    const cats = ['all'].concat(Array.from(new Set(rewards.map(r => r.category).filter(Boolean)))).slice(0, 6);
    tabs.innerHTML = cats.map((c, i) => '<button class="tab ' + (i === 0 ? 'active' : '') + '" data-cat="' + esc(c) + '">' + (c === 'all' ? t('rewards.all') : esc(c)) + '</button>').join('');
    tabs.querySelectorAll('[data-cat]').forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('[data-cat]').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        renderRewardsList(tab.getAttribute('data-cat'));
      });
    });
  }
  renderRewardsList('all');
}

function renderRewardsList(cat) {
  const grid = el('rewardsGrid');
  if (!grid) return;
  const list = (State.rewards || []).filter(r => cat === 'all' || r.category === cat);
  grid.innerHTML = list.length ? list.map((r, i) => rewardCardHtml(r, i)).join('') : emptyState(grid, '🎁', t('rewards.none'), t('rewards.noneSub'));
}

function renderTopup() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const games = (State.rewards || []).filter(r => r.category === 'game' || r.type === 'topup').slice(0, 8);
  const list = el('topupGameList');
  if (list) {
    list.innerHTML = games.length ? games.map(g =>
      '<div class="reward-item" data-game="' + esc(g.title) + '" data-reward-id="' + g.id + '" data-action="selectTopupGame">' +
      '<div class="rw-ico" style="background:' + (g.color || 'linear-gradient(135deg,#6a11cb,#2575fc)') + '">' + (g.icon || '🎮') + '</div>' +
      '<div class="rw-body"><div class="rw-name">' + esc(g.title) + '</div><div class="rw-sub">' + esc(g.subtitle || '') + '</div></div>' +
      '<span class="badge badge-success">' + t('topup.instant') + '</span></div>').join('')
      : emptyState(list, '🎮', t('topup.noGames'), t('topup.noGamesSub'));
  }
  renderPackages('Free Fire');
}

function renderPackages(gameName) {
  const grid = el('topupPackageGrid');
  if (!grid) return;
  const reward = (State.rewards || []).find(r => r.title === gameName && (r.category === 'game' || r.type === 'topup'));
  const pkgs = reward && reward.packages && reward.packages.length ? reward.packages : [
    { label: '100 ' + (gameName === 'Free Fire' ? 'Diamonds' : 'Units'), cost: 4500 },
    { label: '310 ' + (gameName === 'Free Fire' ? 'Diamonds' : 'Units'), cost: 12000 },
    { label: '520 ' + (gameName === 'Free Fire' ? 'Diamonds' : 'Units'), cost: 18000 }
  ];
  grid.innerHTML = pkgs.map((p, i) =>
    '<div class="package' + (i === 0 ? ' selected' : '') + '" data-cost="' + (p.cost || 0) + '" data-label="' + esc(p.label) + '" data-action="selectPackage">' +
    '<div class="pkg-name">' + esc(p.label) + '</div><div class="pkg-cost">' + fmtCoins(p.cost || 0) + ' coins</div>' +
    (p.save ? '<div class="pkg-save">' + esc(p.save) + '</div>' : '') + '</div>').join('');
}

function renderWithdraw() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const methods = [
    { id: 'paypal', ico: '🅿️', name: 'PayPal', min: 10000 },
    { id: 'bank', ico: '🏦', name: t('withdraw.bank'), min: 25000 },
    { id: 'crypto', ico: '₿', name: 'Crypto (BTC/ETH/USDT)', min: 15000 },
    { id: 'giftcard', ico: '🎁', name: t('withdraw.giftcard'), min: 10000 }
  ];
  const list = el('wdMethodList');
  if (list) {
    list.innerHTML = methods.map((m, i) =>
      '<div class="wd-method' + (i === 0 ? ' selected' : '') + '" data-method="' + m.id + '" data-action="selectWdMethod">' +
      '<div class="wm-ico">' + m.ico + '</div><div class="wm-name">' + m.name + '</div>' +
      '<span class="wm-min">' + t('withdraw.from') + ' ' + fmtCoins(m.min) + '</span></div>').join('');
  }
  updateWdSummary();
}

function updateWdSummary() {
  const amtEl = el('wdAmount');
  const amt = parseFloat(amtEl ? amtEl.value : 0) || 0;
  const rate = State.settings.coinRate || 10000;
  const feePct = State.settings.withdrawalFeePct || 1;
  const usd = amt / rate;
  const fee = usd * (feePct / 100);
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  const method = el('wdSumMethod');
  if (method && method.textContent === '—') method.textContent = 'PayPal';
  set('wdSumAmount', fmtNum(amt) + ' coins');
  set('wdSumReceive', '$' + (usd - fee).toFixed(2));
  set('wdSumFee', '$' + fee.toFixed(2));
}

async function renderTransactions() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  renderTransactionsList('all');
}

async function renderTransactionsList(type) {
  const list = el('transactionsList');
  if (!list) return;
  skeletonGrid(list, 5);
  try {
    const w = await computeWallet(State.user.uid);
    State.wallet = w;
    const filtered = (w.list || []).filter(e => type === 'all' || e.type === type);
    list.innerHTML = filtered.length ? filtered.map(txItemHtml).join('') : emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub'));
  } catch (e) {
    emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub'));
  }
}

async function renderNotifications() {
  if (!State.user) { guardAuth(); return; }
  const list = el('notificationsList');
  if (!list) return;
  skeletonGrid(list, 4);
  try {
    const snap = await colRef('notifications').where('uid', '==', State.user.uid).orderBy('createdAt', 'desc').limit(50).get();
    const items = [];
    snap.forEach(d => { const n = d.data(); n.id = d.id; items.push(n); });
    list.innerHTML = items.length ? items.map(notifItemHtml).join('') : emptyState(list, '🔔', t('notifications.none'), t('notifications.noneSub'));
  } catch (e) {
    emptyState(list, '🔔', t('notifications.none'), t('notifications.noneSub'));
  }
}

async function renderSupport() {
  if (!State.user) { guardAuth(); return; }
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('supAvgTime', '~4h');
  set('supOpen', '0');
  set('supResolved', '0');
  set('supSatisfaction', '98%');
  // My tickets
  const list = el('myTicketsList');
  if (list) {
    try {
      const snap = await colRef('tickets').where('uid', '==', State.user.uid).orderBy('createdAt', 'desc').limit(10).get();
      const items = [];
      snap.forEach(d => {
        const tk = d.data();
        const st = tk.status || 'open';
        const cls = st === 'open' ? 'badge-warning' : st === 'resolved' ? 'badge-success' : 'badge-info';
        items.push('<div class="ledger-item"><span class="lg-ico" style="background:rgba(0,176,255,.14);">🎧</span>' +
          '<div class="lg-body"><div class="lg-title">' + esc(tk.subject || '') + '</div>' +
          '<div class="lg-sub">#' + esc(tk.ticketId || d.id) + ' · ' + timeAgo(tk.createdAt ? tk.createdAt.toMillis() : Date.now()) + '</div></div>' +
          '<span class="badge ' + cls + '">' + (st || '') + '</span></div>');
      });
      list.innerHTML = items.length ? items.join('') : emptyState(list, '🎧', t('support.noTickets'), t('support.noTicketsSub'), '<button class="btn btn-accent btn-sm mt-2" data-action="openTicket">' + t('support.newTicket') + '</button>');
    } catch (e) {
      emptyState(list, '🎧', t('support.noTickets'), t('support.noTicketsSub'), '<button class="btn btn-accent btn-sm mt-2" data-action="openTicket">' + t('support.newTicket') + '</button>');
    }
  }
}

async function renderProfile() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('profileUsername', pf.username || '');
  set('profileMeta', (pf.country || t('profile.noCountry')) + ' · ' + (pf.email || ''));
  const ava = el('profileAvatar');
  if (ava) {
    if (pf.avatar) ava.innerHTML = '<img src="' + esc(pf.avatar) + '" alt="">';
    else ava.textContent = (pf.username || '?').charAt(0).toUpperCase();
  }
  set('profileLevelChip', t('profile.level') + ' ' + (pf.level || 1));
  set('profileXpLabel', (pf.xp || 0) + ' / ' + ((pf.level || 1) * XP_PER_LEVEL) + ' XP');
  const fill = el('profileXpFill');
  if (fill) fill.style.width = Math.min(100, ((pf.xp || 0) / ((pf.level || 1) * XP_PER_LEVEL)) * 100) + '%';
  set('pfWithdrawn', '$' + ((pf.totalWithdrawn || 0) / State.settings.coinRate).toFixed(2));
  set('wtWithdrawn', '$' + ((pf.totalWithdrawn || 0) / State.settings.coinRate).toFixed(2));

  const vchip = el('profileVerifiedChip');
  if (vchip) {
    const v = pf.verification || {};
    const parts = [];
    if (v.email) parts.push('📧');
    if (v.phone) parts.push('📱');
    if (v.identity) parts.push('🪪');
    vchip.innerHTML = parts.length ? parts.join(' ') : t('profile.unverified');
  }

  // stats
  const stats = el('profileStats');
  if (stats) {
    const w = State.wallet || { coins: 0, pending: 0, earned: 0, spent: 0 };
    const items = [
      { v: fmtCoins(w.coins), l: t('wallet.available') },
      { v: fmtCoins(w.pending), l: t('wallet.pending') },
      { v: fmtCoins(w.earned), l: t('wallet.lifetime') },
      { v: (pf.streak || 0) + ' 🔥', l: t('home.streak') }
    ];
    stats.innerHTML = items.map(i => '<div class="pstat"><div class="pstat-v">' + i.v + '</div><div class="pstat-l">' + i.l + '</div></div>').join('');
  }

  // achievements
  const ach = el('achievementsList');
  if (ach) {
    const earned = pf.lifetimeEarned || 0;
    const rc = pf.referralCount || 0;
    const st = pf.streak || 0;
    const badges = [
      { ico: '🎮', t: t('ach.a1'), s: t('ach.a1Sub'), done: (pf.offersCompleted || 0) >= 1, xp: 100 },
      { ico: '📋', t: t('ach.a2'), s: t('ach.a2Sub'), done: (pf.surveysCompleted || 0) >= 1, xp: 100 },
      { ico: '💎', t: t('ach.a3'), s: t('ach.a3Sub'), done: earned >= 100000, xp: 500 },
      { ico: '👥', t: t('ach.a4'), s: t('ach.a4Sub'), done: rc >= 10, xp: 1000 },
      { ico: '🔥', t: t('ach.a5'), s: t('ach.a5Sub'), done: st >= 30, xp: 2000 }
    ];
    ach.innerHTML = badges.map(b =>
      '<div class="ach-item' + (b.done ? ' done' : '') + '"><div class="ach-ico">' + b.ico + '</div>' +
      '<div><div class="font-bold text-sm">' + b.t + '</div><div class="text-xs text-muted">' + b.s + '</div></div>' +
      '<span class="badge ml-auto ' + (b.done ? 'badge-success' : 'badge-neutral') + '">' + (b.done ? '+' + b.xp + ' XP' : t('profile.locked')) + '</span></div>').join('');
  }

  // badges
  const pbadges = el('profileBadges');
  if (pbadges) {
    const earned = pf.lifetimeEarned || 0;
    const list = ['🆕 ' + t('badge.newbie')];
    if ((pf.offersCompleted || 0) >= 1) list.push('🎮 ' + t('badge.gamer'));
    if ((pf.surveysCompleted || 0) >= 1) list.push('📋 ' + t('badge.surveyor'));
    if (earned >= 10000) list.push('💎 ' + t('badge.earner'));
    if ((pf.streak || 0) >= 7) list.push('🔥 ' + t('badge.streaker'));
    if ((pf.referralCount || 0) >= 1) list.push('👥 ' + t('badge.inviter'));
    pbadges.innerHTML = list.map(b => '<span class="badge badge-grad">' + b + '</span>').join('');
  }

  // referral code
  const refCode = el('pfRefCode');
  if (refCode) refCode.value = pf.referralCode || '';

  // sessions & devices
  const sessions = el('profileSessions');
  if (sessions) {
    sessions.innerHTML = '<div class="device-card current"><div class="dc-ico">💻</div>' +
      '<div class="dc-body"><div class="dc-name">' + t('pf.thisDevice') + '</div>' +
      '<div class="dc-sub">' + (pf.devices && pf.devices[0] ? pf.devices[0].browser + ' · ' + pf.devices[0].os : '') + '</div>' +
      '<div class="dc-time">' + t('pf.currentSession') + '</div></div>' +
      '<span class="badge badge-success">' + t('pf.active') + '</span></div>';
  }
  const devices = el('profileDevices');
  if (devices) {
    const devs = pf.devices && pf.devices.length ? pf.devices : [];
    devices.innerHTML = devs.length ? devs.map(d =>
      '<div class="device-card"><div class="dc-ico">📱</div><div class="dc-body">' +
      '<div class="dc-name">' + (d.browser || '') + ' · ' + (d.os || '') + '</div>' +
      '<div class="dc-sub">' + t('pf.thisDevice') + '</div><div class="dc-time">' + timeAgo(d.lastSeen || Date.now()) + '</div></div>' +
      '<span class="badge badge-neutral">' + t('pf.trusted') + '</span></div>').join('')
      : emptyState(devices, '📱', t('pf.noDevices'), '');
  }
}

async function renderSecurity() {
  if (!State.user) { guardAuth(); return; }
  const v = (State.profile || {}).verification || {};
  const set = (id, v2) => { const x = el(id); if (x) x.textContent = v2; };
  set('secEmailSub', v.email ? t('security.verified') : t('security.notVerified'));
  const emailIco = el('secEmailIco');
  if (emailIco) { emailIco.textContent = v.email ? '✅' : '📧'; emailIco.className = 'sc-ico ' + (v.email ? 'on' : 'off'); }
  set('secPhoneSub', v.phone ? t('security.verified') : t('security.notVerified'));
  const phoneIco = el('secPhoneIco');
  if (phoneIco) { phoneIco.textContent = v.phone ? '✅' : '📱'; phoneIco.className = 'sc-ico ' + (v.phone ? 'on' : 'off'); }
  set('sec2faIco', v.twoFa ? '✅' : '🔐');
  const loginList = el('loginHistoryList');
  if (loginList) {
    loginList.innerHTML = '<div class="log-row"><span class="log-ico">✅</span><span class="log-time">' + t('security.today') + '</span>' +
      '<span class="log-action">' + t('security.login') + '</span><span class="log-detail">' + t('security.currentDevice') + '</span></div>';
  }
}

function renderFaq() {
  const list = el('faqList');
  if (!list) return;
  const faqs = State.faqs && State.faqs.length ? State.faqs : [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') }
  ];
  list.innerHTML = faqs.map((f, i) =>
    '<div class="faq-item"><button class="faq-q" data-action="toggleFaq">' + esc(f.q) + '<span class="faq-chev">▾</span></button>' +
    '<div class="faq-a">' + esc(f.a) + '</div></div>').join('');
  list.querySelectorAll('.faq-q').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      item.classList.toggle('open');
    });
  });
}

function renderTerms() {
  const c = el('termsContent');
  if (!c) return;
  c.innerHTML = '<h2 class="font-black text-lg mb-3">📜 ' + t('terms.title') + '</h2>' +
    '<div class="rich-text">' + t('terms.body') + '</div>';
}

function renderPrivacy() {
  const c = el('privacyContent');
  if (!c) return;
  c.innerHTML = '<h2 class="font-black text-lg mb-3">🔒 ' + t('privacy.title') + '</h2>' +
    '<div class="rich-text">' + t('privacy.body') + '</div>';
}

function renderAntifraud() {
  const pf = State.profile || {};
  const score = pf.fraudScore || 0;
  const flags = pf.flags || [];
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  const scores = el('fraudStatusGrid');
  if (scores) {
    const level = score < 30 ? t('fraud.low') : score < 60 ? t('fraud.medium') : t('fraud.high');
    const color = score < 30 ? 'success' : score < 60 ? 'warning' : 'danger';
    scores.innerHTML = '<div class="card stat-card"><span class="stat-ico bg-primary">🛡️</span>' +
      '<div class="stat-value">' + (score || 0) + '%</div><div class="stat-label">' + t('fraud.score') + '</div></div>' +
      '<div class="card stat-card"><span class="stat-ico bg-info">📶</span>' +
      '<div class="stat-value">' + t('fraud.' + color) + '</div><div class="stat-label">' + t('fraud.level') + '</div></div>' +
      '<div class="card stat-card"><span class="stat-ico bg-warning">🚩</span>' +
      '<div class="stat-value">' + flags.length + '</div><div class="stat-label">' + t('fraud.flags') + '</div></div>';
  }
  const log = el('fraudLogList');
  if (log) {
    log.innerHTML = '<div class="log-row"><span class="log-ico">✅</span><span class="log-time">' + t('security.today') + '</span>' +
      '<span class="log-action">' + t('fraud.clean') + '</span><span class="log-detail">' + t('fraud.noThreats') + '</span></div>';
  }
}

async function renderWallet() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const tabs = el('walletTabs');
  if (tabs) {
    const map = ['all', 'pending', 'locked', 'earned', 'spent', 'withdrawal'];
    tabs.querySelectorAll('.wallet-tab').forEach((tab, i) => {
      tab.setAttribute('data-wtab', map[i] || 'all');
      tab.classList.toggle('active', i === 0);
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.wallet-tab').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        renderWalletTab(tab.getAttribute('data-wtab'));
      });
    });
  }
  renderWalletTab('all');
}

async function renderWalletTab(type) {
  const w = State.wallet;
  const list = el('walletLedger');
  if (!list) return;
  if (!w) { emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub')); return; }
  const items = (w.list || []).filter(e => {
    if (type === 'all') return e.status === 'completed';
    if (type === 'pending') return e.status === 'pending';
    if (type === 'locked') return e.status === 'locked';
    if (type === 'earned') return (e.coins || 0) > 0;
    if (type === 'spent') return (e.coins || 0) < 0;
    if (type === 'withdrawal') return e.type === 'withdrawal';
    return true;
  });
  list.innerHTML = items.length ? items.map(txItemHtml).join('') : emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub'));
}

function renderPromo() {
  const promos = State.promos || [];
  const grid = el('promoCodesGrid');
  if (grid) {
    grid.innerHTML = promos.length ? promos.map(p =>
      '<div class="promo-card reveal"><div class="pc-ico">🎟️</div>' +
      '<div class="pc-body"><div class="pc-code">' + esc(p.code) + '</div>' +
      '<div class="pc-title">' + esc(p.title || '') + '</div>' +
      '<div class="pc-sub">' + esc(p.description || '') + '</div></div>' +
      '<button class="btn btn-accent btn-sm" data-action="applyPromo" data-code="' + p.code + '">' + t('promo.use') + '</button></div>').join('')
      : emptyState(grid, '🎟️', t('promo.none'), t('promo.noneSub'));
  }
}

function renderEvents() {
  const events = State.events || [];
  const active = el('activeEventsGrid');
  const upcoming = el('upcomingEventsGrid');
  const past = el('pastEventsGrid');
  const card = (ev, i) => '<div class="card event-card reveal" style="animation-delay:' + i * 60 + 'ms">' +
    '<div class="ev-badge">' + (ev.icon || '🎉') + '</div><div class="ev-name">' + esc(ev.title) + '</div>' +
    '<div class="ev-sub">' + esc(ev.subtitle || '') + '</div>' +
    '<div class="ev-date">📅 ' + esc(ev.startsAt || '') + (ev.endsAt ? ' → ' + esc(ev.endsAt) : '') + '</div>' +
    '<div class="ev-reward">+' + fmtCoins(ev.reward || 0) + ' ' + t('events.coins') + '</div>' +
    '<button class="btn btn-sm btn-accent btn-block mt-2" data-action="openEvent" data-id="' + ev.id + '">' + t('events.joinNow') + '</button></div>';
  if (active) active.innerHTML = events.filter(e => e.status === 'active').map(card).join('') || emptyState(active, '🎉', t('events.none'), t('events.noneSub'));
  if (upcoming) upcoming.innerHTML = events.filter(e => e.status === 'upcoming').map(card).join('') || emptyState(upcoming, '📅', t('events.none'), t('events.noneSub'));
  if (past) past.innerHTML = events.filter(e => e.status === 'ended').map(card).join('') || emptyState(past, '📆', t('events.none'), t('events.noneSub'));
}

function renderBlog() {
  const posts = State.posts || [];
  const grid = el('blogGrid');
  if (grid) {
    grid.innerHTML = posts.length ? posts.map((p, i) =>
      '<div class="card blog-card reveal" style="animation-delay:' + i * 60 + 'ms"><div class="blog-thumb">' + (p.icon || '📰') + '</div>' +
      '<div class="blog-title">' + esc(p.title) + '</div>' +
      '<div class="text-xs text-muted">' + timeAgo(p.createdAt ? p.createdAt.toMillis() : Date.now()) + '</div>' +
      '<button class="btn btn-ghost btn-sm btn-block mt-2" data-action="openPost" data-id="' + p.id + '">' + t('blog.read') + '</button></div>').join('')
      : emptyState(grid, '📰', t('blog.none'), t('blog.noneSub'));
  }
}

async function renderHistory() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const list = el('recentlyCompletedList');
  if (!list) return;
  const w = State.wallet;
  const items = (w && w.list ? w.list : []).filter(e => e.coins > 0 && e.status === 'completed').slice(0, 10);
  list.innerHTML = items.length ? items.map(txItemHtml).join('') : emptyState(list, '📜', t('history.none'), t('history.noneSub'));
}

function renderOfflineRewards() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const list = el('adOpportunitiesList');
  if (list) {
    const offline = [
      { t: t('watch.rewVideoTitle'), sub: '+' + fmtCoins(State.settings.adReward || 120) + ' ' + t('watch.perAd'), ico: '📺' },
      { t: t('watch.m1'), sub: '+300 ' + t('watch.perDay'), ico: '🎁' }
    ];
    list.innerHTML = offline.map(o =>
      '<div class="card ad-rew"><div class="play-ring">' + o.ico + '</div><div class="font-black">' + o.t + '</div>' +
      '<div class="text-xs text-muted mb-2">' + o.sub + '</div>' +
      '<button class="btn btn-accent btn-sm" data-action="watchAd">' + t('watch.watchNow') + '</button></div>').join('');
  }
}

function renderMore() {
  const list = el('kbGrid');
  if (list) {
    const items = [
      { nav: 'faq', ico: '❓', t: t('more.faq') },
      { nav: 'support', ico: '🎧', t: t('more.support') },
      { nav: 'terms', ico: '📜', t: t('more.terms') },
      { nav: 'privacy', ico: '🔒', t: t('more.privacy') },
      { nav: 'antifraud', ico: '🛡️', t: t('more.antifraud') },
      { nav: 'blog', ico: '📰', t: t('more.blog') },
      { nav: 'events', ico: '🎉', t: t('more.events') },
      { nav: 'promo', ico: '🎟️', t: t('more.promo') },
      { nav: 'rewards', ico: '🎁', t: t('more.rewards') },
      { nav: 'leaderboard', ico: '🏆', t: t('more.leaderboard') }
    ];
    list.innerHTML = items.map(i =>
      '<button class="kb-item" data-nav="' + i.nav + '"><span class="kb-ico">' + i.ico + '</span><span class="kb-label">' + i.t + '</span><span class="kb-chev">→</span></button>').join('');
  }
}

/* ============================================================================
   16. ACTION HANDLERS (delegated events)
   ============================================================================ */
function initGlobalActions() {
  document.addEventListener('click', (e) => {
    const el2 = e.target.closest('[data-action]');
    if (!el2) return;
    const fn = window['on' + el2.getAttribute('data-action')];
    if (typeof fn === 'function') {
      e.preventDefault();
      fn(el2, e);
    }
  });
  // modal closes
  $$('.modal-scrim').forEach(scrim => {
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) scrim.classList.remove('open');
    });
  });
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const scrim = btn.closest('.modal-scrim');
      if (scrim) scrim.classList.remove('open');
    });
  });
  el('confirmDialogOk').addEventListener('click', () => {
    el('confirmDialog').classList.remove('open');
    if (confirmCallback) { confirmCallback(true); confirmCallback = null; }
  });
  el('confirmDialogCancel').addEventListener('click', closeConfirmDialog);
  el('rewardPopupOk').addEventListener('click', () => closeModal('rewardPopup'));
  el('promoApplyBtn').addEventListener('click', applyPromoInput);
  el('chatSend').addEventListener('click', sendChatMsg);
  el('markAllReadBtn').addEventListener('click', markAllRead);
  el('clearNotifBtn').addEventListener('click', clearNotifs);
  el('refCopyBtn').addEventListener('click', copyRefLink);
  el('refShareBtn').addEventListener('click', shareRefLink);
  el('refApplyBtn').addEventListener('click', applyRefCode);
  el('pfRefCopyBtn').addEventListener('click', copyRefLink);
  el('editProfileBtn').addEventListener('click', openProfileEdit);
  el('saveProfileBtn').addEventListener('click', saveProfile);
  el('profileEditClose').addEventListener('click', () => closeModal('profileEditModal'));
  el('avatarFileInput').addEventListener('change', previewAvatar);
  el('logoutBtn').addEventListener('click', logout);
  el('deleteAccountBtn').addEventListener('click', deleteAccount);
  el('sec2faBtn').addEventListener('click', toggle2fa);
  el('secVerifyEmailBtn').addEventListener('click', () => { if (auth.currentUser) auth.currentUser.sendEmailVerification().then(() => toast(t('auth.resend'), t('auth.resetSent'), 'success')); });
  el('secPasswordBtn').addEventListener('click', () => auth.sendPasswordResetEmail(auth.currentUser.email).then(() => toast(t('auth.sendReset'), t('auth.resetSent'), 'success')).catch(e => toast('', e.message, 'error')));
  el('wdAmount').addEventListener('input', updateWdSummary);
  $$('[data-amount]').forEach(chip => chip.addEventListener('click', () => { el('wdAmount').value = chip.getAttribute('data-amount'); updateWdSummary(); }));
  el('wdConfirmBtn').addEventListener('click', requestWithdrawal);
  el('topupConfirmBtn').addEventListener('click', confirmTopup);
  el('watchAdBtn').addEventListener('click', watchAd);
  el('dailyAdBonusBtn').addEventListener('click', dailyAdBonus);
  el('interstitialBtn').addEventListener('click', interstitialReward);
  el('dailyClaimBtn').addEventListener('click', claimDaily);
  el('checkinBtn').addEventListener('click', claimDaily);
  el('spinWheelBtn').addEventListener('click', spinWheel);
  el('scratchCover').addEventListener('click', scratchCard);
  el('mysteryBox').addEventListener('click', openMystery);
  el('treasureChest').addEventListener('click', openTreasure);
  $$('#txTypeFilter .filter-chip').forEach(chip => chip.addEventListener('click', () => {
    $$('#txTypeFilter .filter-chip').forEach(x => x.classList.remove('active'));
    chip.classList.add('active');
    renderTransactionsList(chip.getAttribute('data-type'));
  }));
  el('topupPlayerId').addEventListener('input', () => {
    const game = (document.querySelector('.reward-item.selected') || {}).getAttribute && document.querySelector('.reward-item.selected') ? document.querySelector('.reward-item.selected').getAttribute('data-game') : '';
    el('topupServerWrap').classList.toggle('hidden', !game);
  });
}

function onOpenAuth() { openModal('authModal'); }
function onOpenOffer(btn) { openOfferModal(btn.getAttribute('data-id')); }
function onOpenGame(btn) { openGameModal(btn.getAttribute('data-id')); }
function onOpenSurvey(btn) { openSurveyModal(btn.getAttribute('data-id')); }
function onOpenReward(btn) { openRewardModal(btn.getAttribute('data-id')); }
function onOpenEvent(btn) {
  const ev = (State.events || []).find(x => x.id === btn.getAttribute('data-id'));
  if (!ev) return toast('', t('events.none'), 'info');
  openGenericModal(t('events.title'), '<div class="text-center py-3"><div class="es-ico">' + (ev.icon || '🎉') + '</div>' +
    '<div class="font-black text-lg">' + esc(ev.title) + '</div><p class="text-sm text-muted mt-2">' + esc(ev.subtitle || '') + '</p>' +
    '<div class="mt-3">' + t('events.reward') + ': <b class="coin-t">+' + fmtCoins(ev.reward || 0) + '</b></div>' +
    '<div class="text-xs text-muted mt-2">' + esc(ev.startsAt || '') + ' → ' + esc(ev.endsAt || '') + '</div></div>');
}
function onOpenPost(btn) {
  const p = (State.posts || []).find(x => x.id === btn.getAttribute('data-id'));
  if (!p) return;
  const body = el('articleBody');
  if (body) {
    body.innerHTML = '<h2 class="font-black text-lg mb-2">' + esc(p.title) + '</h2>' +
      '<div class="text-xs text-muted mb-4">' + timeAgo(p.createdAt ? p.createdAt.toMillis() : Date.now()) + '</div>' +
      '<div class="rich-text">' + (p.content || p.body || p.summary || '') + '</div>';
  }
  navigate('article');
  window.scrollTo({ top: 0 });
}
function onApplyPromo(btn) { applyPromo(btn.getAttribute('data-code')); }
function onWatchAd() { watchAd(); }
function onClaimDaily() { claimDaily(); }
function onSelectTopupGame(btn) {
  $$('#topupGameList .reward-item').forEach(x => x.classList.remove('selected'));
  btn.classList.add('selected');
  renderPackages(btn.getAttribute('data-game'));
  el('topupServerWrap').classList.remove('hidden');
}
function onSelectPackage(btn) {
  $$('#topupPackageGrid .package').forEach(x => x.classList.remove('selected'));
  btn.classList.add('selected');
}
function onSelectWdMethod(btn) {
  $$('#wdMethodList .wd-method').forEach(x => x.classList.remove('selected'));
  btn.classList.add('selected');
  const method = btn.getAttribute('data-method');
  const fields = el('wdDetailsFields');
  if (!fields) return;
  if (method === 'paypal') {
    fields.innerHTML = '<div class="field"><label>PayPal Email</label><input type="email" class="input" id="wdPaypalEmail" placeholder="you@email.com"></div>';
  } else if (method === 'crypto') {
    fields.innerHTML = '<div class="field"><label>' + t('withdraw.network') + '</label><select class="select" id="wdCryptoNetwork"><option>TRC20 (USDT)</option><option>ERC20</option><option>BEP20</option><option>Bitcoin</option><option>Ethereum</option></select></div>' +
      '<div class="field"><label>Wallet Address</label><input type="text" class="input" id="wdCryptoAddr" placeholder="0x... / bc1q..."></div>';
  } else if (method === 'bank') {
    fields.innerHTML = '<div class="field"><label>' + t('withdraw.accountName') + '</label><input type="text" class="input" id="wdBankName"></div>' +
      '<div class="field"><label>IBAN</label><input type="text" class="input" id="wdIban"></div>' +
      '<div class="field"><label>' + t('withdraw.swift') + '</label><input type="text" class="input" id="wdSwift"></div>';
  } else {
    fields.innerHTML = '<div class="field"><label>' + t('withdraw.giftcardType') + '</label><select class="select" id="wdGiftType"><option>Amazon</option><option>Google Play</option><option>iTunes</option><option>Steam</option></select></div>' +
      '<div class="field"><label>Email</label><input type="email" class="input" id="wdGiftEmail" placeholder="you@email.com"></div>';
  }
  const sum = el('wdSumMethod');
  if (sum) sum.textContent = btn.querySelector('.wm-name') ? btn.querySelector('.wm-name').textContent : method;
}
function onOpenTicket() {
  openGenericModal(t('support.newTicket'),
    '<div class="field"><label>' + t('support.subject') + '</label><input type="text" class="input" id="ticketSubject" placeholder="' + t('support.subjectPh') + '"></div>' +
    '<div class="field"><label>' + t('support.category') + '</label><select class="select" id="ticketCategory"><option>General</option><option>Withdrawal</option><option>Offer</option><option>Payment</option><option>Account</option></select></div>' +
    '<div class="field"><label>' + t('support.message') + '</label><textarea class="textarea" id="ticketMsg" rows="4"></textarea></div>' +
    '<button class="btn btn-accent btn-lg btn-block" id="ticketSubmitBtn">' + t('support.send') + '</button>');
  const submit = el('ticketSubmitBtn');
  if (submit) submit.addEventListener('click', sendTicket);
}
function onToggleFaq() {}
function onMarkNotif(btn) {
  if (!State.user) return;
  const id = btn.getAttribute('data-id');
  if (id) colRef('notifications').doc(id).update({ read: true }).catch(() => {});
  btn.classList.remove('unread');
}
function onStartOffer(btn) {
  if (!State.user) { guardAuth(); return; }
  const id = btn.getAttribute('data-id');
  openOfferModal(id);
}
function onCompleteOffer(btn) { completeOffer(btn.getAttribute('data-id')); }

function openOfferModal(id) {
  const o = (State.offers || []).find(x => x.id === id);
  if (!o) return toast('', t('offers.none'), 'error');
  const body = el('offerModalBody');
  if (!body) return;
  const milestones = (o.milestones && o.milestones.length) ? o.milestones.map((m, i) =>
    '<div class="offer-milestone"><span class="om-ico">' + (m.icon || '🎯') + '</span>' +
    '<span class="om-label">' + esc(m.label) + '</span>' +
    '<span class="om-reward">+' + fmtCoins(m.reward || 0) + '</span></div>').join('')
    : '<div class="offer-milestone"><span class="om-ico">✅</span><span class="om-label">' + t('offers.complete') + '</span><span class="om-reward">+' + fmtCoins(o.payout || 0) + '</span></div>';
  const device = (o.devices && o.devices.length) ? '<div class="mt-3 flex wrap gap-1">' + o.devices.map(d => '<span class="sv-chip">' + esc(d) + '</span>').join('') + '</div>' : '';
  const steps = (o.steps && o.steps.length) ? o.steps.map((s, i) => '<li>' + esc(s) + '</li>').join('') : '<li>' + t('offers.stepDefault') + '</li>';
  body.innerHTML =
    '<div class="offer-detail-hero" style="background:' + (o.color || 'linear-gradient(135deg,#6a11cb,#2575fc)') + '"><div class="odh-logo">' + (o.icon || '🎯') + '</div>' +
    '<div class="odh-name">' + esc(o.title) + '</div><div class="odh-provider">' + esc(o.provider || '') + '</div></div>' +
    '<div class="grid grid-3 mt-3">' +
    '<div class="od-stat"><div class="od-stat-v coin-t">+' + fmtCoins(o.payout || 0) + '</div><div class="od-stat-l">' + t('offers.payout') + '</div></div>' +
    '<div class="od-stat"><div class="od-stat-v">' + (o.minutes || 5) + '</div><div class="od-stat-l">' + t('offers.minutes') + '</div></div>' +
    '<div class="od-stat"><div class="od-stat-v">' + (o.difficulty || 'Easy') + '</div><div class="od-stat-l">' + t('offers.difficulty') + '</div></div>' +
    '</div>' +
    '<div class="divider-h"></div>' +
    '<h4 class="font-black text-md mb-2">🎯 ' + t('offers.milestones') + '</h4>' + milestones +
    '<h4 class="font-black text-md mt-4 mb-2">📝 ' + t('offers.howTo') + '</h4>' +
    '<ol class="howto">' + steps + '</ol>' + device +
    '<div class="mt-4 flex gap-2">' +
    '<a class="btn btn-accent flex-1" href="' + (o.link || '#') + '" target="_blank" rel="noopener">🚀 ' + t('offers.start') + '</a>' +
    '<button class="btn btn-ghost flex-1" data-action="completeOffer" data-id="' + o.id + '">✅ ' + t('offers.imDone') + '</button>' +
    '</div>' +
    '<div class="text-xs text-muted mt-2">' + t('offers.creditNote') + '</div>';
  el('offerModalTitle').textContent = esc(o.title);
  openModal('offerModal');
}

function openGameModal(id) {
  const g = (State.games || []).find(x => x.id === id);
  if (!g) return toast('', t('games.none'), 'error');
  const body = el('offerModalBody');
  if (!body) return;
  const ms = (g.milestones && g.milestones.length) ? g.milestones.map(m =>
    '<div class="offer-milestone"><span class="om-ico">' + (m.icon || '🎮') + '</span><span class="om-label">' + esc(m.label) + '</span><span class="om-reward">+' + fmtCoins(m.reward || 0) + '</span></div>').join('')
    : '<div class="offer-milestone"><span class="om-ico">✅</span><span class="om-label">' + t('offers.install') + '</span><span class="om-reward">+' + fmtCoins(g.payout || 0) + '</span></div>';
  body.innerHTML =
    '<div class="offer-detail-hero" style="background:' + (g.color || 'linear-gradient(135deg,#ff6a00,#ffb800)') + '"><div class="odh-logo">' + (g.icon || '🎮') + '</div>' +
    '<div class="odh-name">' + esc(g.title) + '</div><div class="odh-provider">' + (g.platform || '') + ' · ' + (g.category || '') + '</div></div>' +
    '<div class="grid grid-3 mt-3">' +
    '<div class="od-stat"><div class="od-stat-v coin-t">+' + fmtCoins(g.payout || 0) + '</div><div class="od-stat-l">' + t('offers.payout') + '</div></div>' +
    '<div class="od-stat"><div class="od-stat-v">⭐ ' + (g.rating || '4.5') + '</div><div class="od-stat-l">' + t('games.rating') + '</div></div>' +
    '<div class="od-stat"><div class="od-stat-v">' + fmtNum(g.installs || 0) + '</div><div class="od-stat-l">' + t('games.installs') + '</div></div>' +
    '</div>' +
    '<div class="divider-h"></div>' +
    '<h4 class="font-black text-md mb-2">🎯 ' + t('offers.milestones') + '</h4>' + ms +
    '<div class="mt-4 flex gap-2">' +
    '<a class="btn btn-primary flex-1" href="' + (g.link || '#') + '" target="_blank" rel="noopener">🕹️ ' + t('games.playNow') + '</a>' +
    '<button class="btn btn-ghost flex-1" data-action="completeOffer" data-id="' + g.id + '">✅ ' + t('offers.imDone') + '</button>' +
    '</div>' +
    '<div class="text-xs text-muted mt-2">' + t('offers.creditNote') + '</div>';
  el('offerModalTitle').textContent = esc(g.title);
  openModal('offerModal');
}

function openSurveyModal(id) {
  const s = (State.surveys || []).find(x => x.id === id);
  if (!s) return toast('', t('surveys.none'), 'error');
  if (!State.user) { guardAuth(); return; }
  const body = el('surveyModalBody');
  if (!body) return;
  body.innerHTML =
    '<div class="survey-detail"><div class="survey-ico-lg">📋</div>' +
    '<div class="font-black text-lg">' + esc(s.title) + '</div>' +
    '<p class="text-sm text-muted mt-2">' + esc(s.description || '') + '</p></div>' +
    '<div class="survey-detail-meta">' +
    '<span class="sv-chip">⏱️ ' + (s.minutes || 5) + ' ' + t('surveys.min') + '</span>' +
    '<span class="sv-chip">⭐ ' + (s.rating || '4.5') + '</span>' +
    '<span class="sv-chip coin-t">+' + fmtCoins(s.reward || s.payout || 0) + '</span></div>' +
    '<div class="alert alert-info mt-3"><span class="a-ico">💡</span><div class="a-body">' +
    '<div class="a-title">' + t('surveys.qualified') + '</div><span>' + t('surveys.disqualify') + '</span></div></div>' +
    '<div class="field mt-3"><label>' + t('surveys.question') + '</label><select class="select"><option>' + t('surveys.opt1') + '</option><option>' + t('surveys.opt2') + '</option><option>' + t('surveys.opt3') + '</option></select></div>' +
    '<div class="flex gap-2 mt-4">' +
    '<button class="btn btn-success flex-1" data-action="completeSurvey" data-id="' + s.id + '">✅ ' + t('surveys.submit') + '</button>' +
    '<button class="btn btn-ghost" onclick="closeModal(\'surveyModal\')">' + t('popup.cancel') + '</button></div>';
  el('surveyModalTitle').textContent = esc(s.title);
  openModal('surveyModal');
}

function openRewardModal(id) {
  const r = (State.rewards || []).find(x => x.id === id);
  if (!r) return;
  if (!State.user) { guardAuth(); return; }
  const body = el('confirmModalBody');
  if (!body) return;
  const denoms = (r.denominations && r.denominations.length) ? r.denominations.map(d =>
    '<div class="rd-option" data-cost="' + (d.cost || d.price || 0) + '" data-label="' + esc(d.label) + '">' + esc(d.label) + ' · <b class="coin-t">' + fmtCoins(d.cost || d.price || 0) + '</b></div>').join('') : '';
  body.innerHTML =
    '<div class="reward-confirm"><div class="rw-logo" style="background:' + (r.color || 'linear-gradient(135deg,#00e676,#009688)') + '">' + (r.icon || '🎁') + '</div>' +
    '<div class="font-black text-lg">' + esc(r.title) + '</div>' +
    '<div class="text-sm text-muted">' + esc(r.category || '') + '</div></div>' +
    (denoms ? '<div class="rd-list mt-3">' + denoms + '</div>' : '') +
    '<div class="kv-row mt-3"><span class="kv-label">' + t('rewards.cost') + '</span><span class="kv-value coin-t" id="rewCost">' + fmtCoins(r.price || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">' + t('rewards.balance') + '</span><span class="kv-value" id="rewBal">' + fmtCoins((State.wallet || {}).coins || 0) + '</span></div>' +
    '<button class="btn btn-accent btn-lg btn-block mt-4" id="rewConfirmBtn">🎁 ' + t('rewards.confirmRedeem') + '</button>';
  el('confirmModalTitle').textContent = t('rewards.confirm');
  openModal('confirmModal');
  const confirmBtn = el('rewConfirmBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', () => redeemReward(r));
  $$('.rd-option').forEach(opt => opt.addEventListener('click', () => {
    $$('.rd-option').forEach(x => x.classList.remove('selected'));
    opt.classList.add('selected');
    const cost = el('rewCost');
    if (cost) cost.textContent = fmtCoins(parseInt(opt.getAttribute('data-cost')) || 0);
  }));
}

async function completeOffer(id) {
  if (!State.user) { guardAuth(); return; }
  closeModal('offerModal');
  const target = (State.offers || []).find(x => x.id === id) || (State.games || []).find(x => x.id === id);
  if (!target) return;
  const coins = target.payout || 0;
  const ok = await askConfirm(t('offers.confirmTitle'), t('offers.confirmBody').replace('{n}', fmtCoins(coins)), t('popup.confirm'), false);
  if (!ok) return;
  // Simulated offerwall completion (no real postback available in browser)
  const userRef = colRef('users').doc(State.user.uid);
  await addLedger(State.user.uid, 'offer', t('ledger.offerComplete').replace('{n}', target.title), coins, 'completed', { ref: 'OFF-' + uid().slice(0, 8), provider: target.provider || 'offerwall' });
  await userRef.update({
    offersCompleted: increment(1),
    xp: increment(Math.max(5, Math.round(coins / 20))),
    lastSeen: serverTimestamp()
  }).catch(() => {});
  State.profile.offersCompleted = (State.profile.offersCompleted || 0) + 1;
  State.profile.lifetimeEarned = (State.profile.lifetimeEarned || 0) + coins;
  updateBalanceUI();
  showRewardPopup(coins, t('ledger.offerComplete').replace('{n}', target.title));
  await colRef('notifications').add({
    uid: State.user.uid, type: 'offer',
    title: t('notif.offerDone'), body: '+' + fmtCoins(coins) + ' — ' + target.title,
    read: false, createdAt: serverTimestamp()
  }).catch(() => {});
}

async function completeSurvey(id) {
  if (!State.user) { guardAuth(); return; }
  const s = (State.surveys || []).find(x => x.id === id);
  if (!s) return;
  closeModal('surveyModal');
  const coins = s.reward || s.payout || 0;
  await addLedger(State.user.uid, 'survey', t('ledger.surveyComplete').replace('{n}', s.title), coins, 'completed', { ref: 'SURV-' + uid().slice(0, 8), provider: 'surveys' });
  const userRef = colRef('users').doc(State.user.uid);
  await userRef.update({ surveysCompleted: increment(1), xp: increment(10), lastSeen: serverTimestamp() }).catch(() => {});
  State.profile.surveysCompleted = (State.profile.surveysCompleted || 0) + 1;
  updateBalanceUI();
  showRewardPopup(coins, t('ledger.surveyComplete').replace('{n}', s.title));
}

async function redeemReward(r) {
  const cost = parseInt((document.querySelector('.rd-option.selected') || {}).getAttribute ? ((document.querySelector('.rd-option.selected') || {}).getAttribute('data-cost') || r.price || 0) : (r.price || 0)) || (r.price || 0);
  const w = State.wallet || { coins: 0 };
  if (w.coins < cost) {
    closeModal('confirmModal');
    toast(t('rewards.redeem'), t('err.insufficient'), 'warning');
    return;
  }
  const ok = await askConfirm(t('rewards.confirm'), t('rewards.confirmBody').replace('{n}', fmtCoins(cost)).replace('{t}', r.title), t('popup.confirm'), false);
  if (!ok) return;
  closeModal('confirmModal');
  await addLedger(State.user.uid, 'reward', t('ledger.rewardRedeem').replace('{n}', r.title), -cost, 'completed', { ref: 'REW-' + uid().slice(0, 8) });
  await colRef('orders').add({
    uid: State.user.uid,
    type: 'reward',
    item: r.title,
    itemId: r.id,
    cost,
    status: 'pending',
    details: document.querySelector('.rd-option.selected') ? document.querySelector('.rd-option.selected').getAttribute('data-label') : '',
    createdAt: serverTimestamp()
  }).catch(() => {});
  updateBalanceUI();
  toast(t('rewards.redeem'), t('rewards.ordered'), 'success');
  celebrate();
}

async function watchAd() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const cap = State.settings.adDailyCap || 15;
  let used = pf.adsWatchedToday || 0;
  if (pf.adsDate !== todayKey()) used = 0;
  if (used >= cap) { toast(t('watch.title'), t('watch.capReached'), 'warning'); return; }
  const btn = el('watchAdBtn');
  const cd = el('watchCountdown');
  const cdVal = el('watchCountdownValue');
  const ring = el('watchCountdownRing');
  const reward = State.settings.adReward || 120;
  if (btn) btn.disabled = true;
  if (cd) cd.classList.remove('hidden');
  const dur = 8;
  let t2 = dur;
  const step = () => {
    if (cdVal) cdVal.textContent = t2;
    if (ring) ring.style.strokeDashoffset = String(326.7 * (1 - (dur - t2) / dur));
    if (t2 <= 0) {
      clearInterval(interval);
      if (cd) cd.classList.add('hidden');
      if (btn) { btn.disabled = false; btn.innerHTML = '🎬 <span data-i18n="watch.watchNow">' + t('watch.watchNow') + '</span>'; }
      grantAdReward(reward);
    }
    t2--;
  };
  step();
  const interval = setInterval(step, 1000);
}

async function grantAdReward(reward) {
  const pf = State.profile || {};
  const used = pf.adsDate === todayKey() ? (pf.adsWatchedToday || 0) : 0;
  const cap = State.settings.adDailyCap || 15;
  if (used >= cap) { toast(t('watch.title'), t('watch.capReached'), 'warning'); return; }
  await addLedger(State.user.uid, 'ad', t('ledger.adReward'), reward, 'completed', { ref: 'AD-' + uid().slice(0, 8), provider: 'adsterra' });
  const userRef = colRef('users').doc(State.user.uid);
  await userRef.update({
    adsWatchedToday: used + 1,
    adsDate: todayKey(),
    xp: increment(2),
    lastSeen: serverTimestamp()
  }).catch(() => {});
  State.profile.adsWatchedToday = used + 1;
  State.profile.adsDate = todayKey();
  State.profile.lifetimeEarned = (State.profile.lifetimeEarned || 0) + reward;
  updateBalanceUI();
  renderWatch();
  showRewardPopup(reward, t('ledger.adReward'));
}

async function dailyAdBonus() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.adBonusDate === todayKey()) { toast('', t('watch.bonusClaimed'), 'warning'); return; }
  await addLedger(State.user.uid, 'daily', t('ledger.adBonus'), 300, 'completed', { ref: 'ADB-' + uid().slice(0, 8), provider: 'adsterra' });
  await colRef('users').doc(State.user.uid).update({ adBonusDate: todayKey(), lastSeen: serverTimestamp() }).catch(() => {});
  State.profile.adBonusDate = todayKey();
  updateBalanceUI();
  showRewardPopup(300, t('ledger.adBonus'));
}

async function interstitialReward() {
  if (!State.user) { guardAuth(); return; }
  await addLedger(State.user.uid, 'ad', t('ledger.interstitial'), 200, 'completed', { ref: 'INT-' + uid().slice(0, 8), provider: 'monetag' });
  await colRef('users').doc(State.user.uid).update({ xp: increment(2), lastSeen: serverTimestamp() }).catch(() => {});
  updateBalanceUI();
  showRewardPopup(200, t('ledger.interstitial'));
}

async function claimDaily() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.lastClaimDate === todayKey()) { toast(t('daily.title'), t('daily.claimed'), 'info'); return; }
  // streak logic
  let streak = (pf.streak || 0);
  const yesterday = new Date(Date.now() - 86400000);
  const yKey = yesterday.toISOString().slice(0, 10);
  if (pf.lastClaimDate !== yKey) {
    if (pf.streakFreezes > 0 && pf.lastClaimDate) {
      streak = (pf.streak || 0);
    } else {
      streak = 0;
    }
  }
  streak++;
  const planIdx = Math.min(6, (streak - 1) % 7);
  const base = DAILY_PLAN[planIdx];
  const mult = streak >= 7 ? 2 : streak >= 4 ? 1.5 : 1;
  const reward = Math.round(base * mult);
  const claimedDays = pf.claimedDays || [];
  const claimedDay = ((streak - 1) % 7) + 1;
  if (!claimedDays.includes(claimedDay)) claimedDays.push(claimedDay);
  await addLedger(State.user.uid, 'daily', t('ledger.dailyClaim').replace('{n}', streak), reward, 'completed', { ref: 'DAY-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({
    streak,
    bestStreak: Math.max(pf.bestStreak || 0, streak),
    lastClaimDate: todayKey(),
    claimedDays,
    dailyBonusClaimed: true,
    xp: increment(5),
    lastSeen: serverTimestamp()
  }).catch(() => {});
  State.profile.streak = streak;
  State.profile.bestStreak = Math.max(pf.bestStreak || 0, streak);
  State.profile.lastClaimDate = todayKey();
  State.profile.claimedDays = claimedDays;
  State.profile.lifetimeEarned = (State.profile.lifetimeEarned || 0) + reward;
  updateBalanceUI();
  if (State.currentPage === 'daily' || State.currentPage === 'checkin') { renderDaily(); renderCheckin(); }
  showRewardPopup(reward, t('ledger.dailyClaim').replace('{n}', streak));
  await colRef('notifications').add({
    uid: State.user.uid, type: 'daily',
    title: t('notif.dailyDone'), body: '+' + fmtCoins(reward) + ' · ' + t('notif.streak') + ' ' + streak,
    read: false, createdAt: serverTimestamp()
  }).catch(() => {});
}

async function spinWheel() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.wheelSpunDate === todayKey()) { toast('', t('daily.wheelSpun'), 'info'); return; }
  const wheel = el('spinWheel');
  if (!wheel) return;
  const reward = WHEEL_SLICES[Math.floor(Math.random() * WHEEL_SLICES.length)];
  const winIdx = WHEEL_SLICES.indexOf(reward);
  const deg = 1440 + winIdx * 45 + (Math.random() * 40 - 20);
  wheel.style.transition = 'transform 4.5s cubic-bezier(0.17,0.67,0.12,0.99)';
  wheel.style.transform = 'rotate(' + deg + 'deg)';
  const st = el('spinWheelStatus');
  if (st) st.textContent = t('daily.spinning');
  setTimeout(async () => {
    await addLedger(State.user.uid, 'daily', t('ledger.wheel'), reward, 'completed', { ref: 'WHL-' + uid().slice(0, 8) });
    await colRef('users').doc(State.user.uid).update({ wheelSpunDate: todayKey(), xp: increment(3), lastSeen: serverTimestamp() }).catch(() => {});
    State.profile.wheelSpunDate = todayKey();
    updateBalanceUI();
    renderWheelState();
    showRewardPopup(reward, t('ledger.wheel'));
  }, 4800);
}

async function scratchCard() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.scratchDate === todayKey()) { toast('', t('daily.scratchDone'), 'info'); return; }
  const cover = el('scratchCover');
  const result = el('scratchResult');
  const st = el('scratchStatus');
  const reward = [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)];
  if (cover) { cover.classList.add('scratching'); cover.textContent = '🎉'; setTimeout(() => { cover.style.display = 'none'; }, 350); }
  if (result) result.textContent = '+' + fmtCoins(reward);
  if (st) st.textContent = t('daily.scratchDone');
  await addLedger(State.user.uid, 'daily', t('ledger.scratch'), reward, 'completed', { ref: 'SCR-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({ scratchDate: todayKey(), scratchReward: reward, lastSeen: serverTimestamp() }).catch(() => {});
  State.profile.scratchDate = todayKey();
  State.profile.scratchReward = reward;
  updateBalanceUI();
  showRewardPopup(reward, t('ledger.scratch'));
}

async function openMystery() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.mysteryDate === todayKey()) { toast('', t('daily.mysteryDone'), 'info'); return; }
  const box = el('mysteryBox');
  const st = el('mysteryStatus');
  const reward = [100, 200, 300, 500, 1000][Math.floor(Math.random() * 5)];
  box.classList.add('shaking');
  if (st) st.textContent = t('daily.opening');
  setTimeout(async () => {
    box.classList.remove('shaking');
    box.textContent = '🎉';
    box.classList.add('opened');
    if (st) st.textContent = t('daily.mysteryDone');
    await addLedger(State.user.uid, 'daily', t('ledger.mystery'), reward, 'completed', { ref: 'MYS-' + uid().slice(0, 8) });
    await colRef('users').doc(State.user.uid).update({ mysteryDate: todayKey(), lastSeen: serverTimestamp() }).catch(() => {});
    State.profile.mysteryDate = todayKey();
    updateBalanceUI();
    showRewardPopup(reward, t('ledger.mystery'));
  }, 900);
}

async function openTreasure() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.treasureDate === todayKey()) { toast('', t('daily.treasureDone'), 'info'); return; }
  const chest = el('treasureChest');
  const st = el('treasureStatus');
  const reward = 250 + Math.floor(Math.random() * 3) * 250;
  chest.classList.add('shaking');
  if (st) st.textContent = t('daily.opening');
  setTimeout(async () => {
    chest.classList.remove('shaking');
    chest.textContent = '💎';
    chest.classList.add('opened');
    if (st) st.textContent = t('daily.treasureDone');
    await addLedger(State.user.uid, 'daily', t('ledger.treasure'), reward, 'completed', { ref: 'TRS-' + uid().slice(0, 8) });
    await colRef('users').doc(State.user.uid).update({ treasureDate: todayKey(), lastSeen: serverTimestamp() }).catch(() => {});
    State.profile.treasureDate = todayKey();
    updateBalanceUI();
    showRewardPopup(reward, t('ledger.treasure'));
  }, 900);
}

async function confirmTopup() {
  if (!State.user) { guardAuth(); return; }
  const game = document.querySelector('#topupGameList .reward-item.selected');
  const pkg = document.querySelector('#topupPackageGrid .package.selected');
  const playerId = el('topupPlayerId').value.trim();
  const serverId = el('topupServerId').value.trim();
  if (!game) return toast(t('topup.title'), t('topup.selectGameFirst'), 'warning');
  if (!playerId) return toast(t('topup.title'), t('topup.enterPlayerId'), 'warning');
  const cost = parseInt(pkg ? pkg.getAttribute('data-cost') : 4500) || 4500;
  const w = State.wallet || { coins: 0 };
  if (w.coins < cost) { toast(t('topup.title'), t('err.insufficient'), 'warning'); return; }
  const label = pkg ? pkg.getAttribute('data-label') : '';
  const ok = await askConfirm(t('topup.confirm'), t('topup.confirmBody').replace('{n}', fmtCoins(cost)).replace('{g}', game.getAttribute('data-game')).replace('{p}', label), t('popup.confirm'), false);
  if (!ok) return;
  await addLedger(State.user.uid, 'topup', t('ledger.topup').replace('{g}', game.getAttribute('data-game')), -cost, 'completed', { ref: 'TOP-' + uid().slice(0, 8) });
  await colRef('orders').add({
    uid: State.user.uid,
    type: 'topup',
    item: game.getAttribute('data-game'),
    package: label,
    cost,
    playerId,
    serverId,
    status: 'pending',
    createdAt: serverTimestamp()
  }).catch(() => {});
  updateBalanceUI();
  toast(t('topup.success'), t('topup.successSub'), 'success');
  celebrate();
}

async function requestWithdrawal() {
  if (!State.user) { guardAuth(); return; }
  const w = State.wallet || { coins: 0, pending: 0 };
  const min = State.settings.minWithdraw || 10000;
  const amount = parseFloat(el('wdAmount').value) || 0;
  if (amount < min) return toast(t('withdraw.title'), t('withdraw.tooSmall').replace('{n}', fmtCoins(min)), 'warning');
  if (amount > w.coins) return toast(t('withdraw.title'), t('err.insufficient'), 'warning');
  if (w.pending > 0) return toast(t('withdraw.title'), t('withdraw.pendingExists'), 'warning');
  const method = document.querySelector('#wdMethodList .wd-method.selected');
  const methodName = method ? method.querySelector('.wm-name').textContent : 'PayPal';
  const ok = await askConfirm(t('withdraw.confirm'), t('withdraw.confirmBody').replace('{n}', fmtCoins(amount)).replace('{m}', methodName), t('popup.confirm'), false);
  if (!ok) return;
  await addLedger(State.user.uid, 'withdrawal', t('ledger.withdrawal') + ' · ' + methodName, -amount, 'pending', { ref: 'WD-' + uid().slice(0, 8), provider: methodName });
  await colRef('withdrawals').add({
    uid: State.user.uid,
    amount,
    method: methodName,
    fee: amount * ((State.settings.withdrawalFeePct || 1) / 100) / State.settings.coinRate,
    usd: amount / State.settings.coinRate,
    status: 'pending',
    createdAt: serverTimestamp()
  }).catch(() => {});
  updateBalanceUI();
  toast(t('withdraw.requested'), t('withdraw.requestedSub'), 'success');
  el('wdAmount').value = '';
  updateWdSummary();
}

async function applyPromoInput() {
  const code = el('promoInput').value.trim();
  if (!code) return;
  applyPromo(code.toUpperCase());
}

async function applyPromo(code) {
  if (!State.user) { guardAuth(); return; }
  const promos = State.promos || [];
  const p = promos.find(x => x.code.toUpperCase() === String(code).toUpperCase());
  if (!p) return toast(t('promo.title'), t('promo.invalid'), 'error');
  const pf = State.profile || {};
  const usedPromos = pf.usedPromos || [];
  if (usedPromos.includes(p.code)) return toast(t('promo.title'), t('promo.used'), 'warning');
  const reward = p.reward || 0;
  await addLedger(State.user.uid, 'promo', t('ledger.promo').replace('{n}', p.code), reward, 'completed', { ref: 'PRM-' + uid().slice(0, 8) });
  usedPromos.push(p.code);
  await colRef('users').doc(State.user.uid).update({ usedPromos, lastSeen: serverTimestamp() }).catch(() => {});
  State.profile.usedPromos = usedPromos;
  updateBalanceUI();
  showRewardPopup(reward, t('ledger.promo').replace('{n}', p.code));
}

async function sendTicket() {
  if (!State.user) { guardAuth(); return; }
  const subject = el('ticketSubject').value.trim();
  const msg = el('ticketMsg').value.trim();
  if (!subject || !msg) return toast(t('support.title'), t('err.fillAll'), 'warning');
  await colRef('tickets').add({
    uid: State.user.uid,
    username: (State.profile || {}).username || '',
    subject,
    message: msg,
    category: el('ticketCategory').value,
    status: 'open',
    ticketId: 'TK-' + uid().slice(0, 8),
    createdAt: serverTimestamp()
  }).catch((e) => toast(t('support.title'), e.message, 'error'));
  closeModal('genericModal');
  toast(t('support.sent'), t('support.sentSub'), 'success');
}

function sendChatMsg() {
  const inp = el('chatInput');
  const body = el('chatBody');
  if (!inp || !body) return;
  const msg = inp.value.trim();
  if (!msg) return;
  body.innerHTML += '<div class="chat-msg me"><div class="cm-bubble">' + esc(msg) + '</div><div class="cm-time">' + t('security.today') + '</div></div>';
  inp.value = '';
  setTimeout(() => {
    body.innerHTML += '<div class="chat-msg bot"><div class="cm-bubble">' + t('chat.autoReply') + '</div><div class="cm-time">' + t('security.today') + '</div></div>';
    body.scrollTop = body.scrollHeight;
  }, 1200);
  body.scrollTop = body.scrollHeight;
}

async function markAllRead() {
  if (!State.user) return;
  const snap = await colRef('notifications').where('uid', '==', State.user.uid).where('read', '==', false).get().catch(() => null);
  if (snap) {
    const batch = db.batch();
    snap.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit().catch(() => {});
  }
  renderNotifications();
}

async function clearNotifs() {
  if (!State.user) return;
  const ok = await askConfirm(t('notifications.title'), t('notifications.clearConfirm'), t('popup.confirm'));
  if (!ok) return;
  const snap = await colRef('notifications').where('uid', '==', State.user.uid).get().catch(() => null);
  if (snap) {
    const batch = db.batch();
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit().catch(() => {});
  }
  renderNotifications();
}

async function copyRefLink() {
  const inp = el('refLinkInput');
  if (inp) await copyText(inp.value);
  toast(t('referral.title'), t('referral.copied'), 'success');
}

function shareRefLink() {
  const inp = el('refLinkInput');
  const url = inp ? inp.value : location.href;
  if (navigator.share) {
    navigator.share({ title: t('referral.share'), text: t('referral.shareMsg'), url }).catch(() => {});
  } else {
    copyRefLink();
  }
}

async function applyRefCode() {
  if (!State.user) { guardAuth(); return; }
  const code = el('refCodeInput').value.trim().toUpperCase();
  if (!code) return;
  const pf = State.profile || {};
  if (pf.referralCode === code) return toast(t('referral.title'), t('referral.self'), 'warning');
  if (pf.referredBy) return toast(t('referral.title'), t('referral.already'), 'info');
  try {
    const snap = await colRef('users').where('referralCode', '==', code).limit(1).get();
    if (snap.empty) return toast(t('referral.title'), t('promo.invalid'), 'error');
    const ref = snap.docs[0];
    if (ref.id === State.user.uid) return toast(t('referral.title'), t('referral.self'), 'warning');
    await colRef('users').doc(State.user.uid).update({ referredBy: code, lastSeen: serverTimestamp() });
    await colRef('referrals').add({
      referrerId: ref.id, referredId: State.user.uid,
      referredName: pf.username || '', code, status: 'joined', createdAt: serverTimestamp()
    }).catch(() => {});
    toast(t('referral.title'), t('referral.applied'), 'success');
  } catch (e) { toast(t('referral.title'), e.message, 'error'); }
}

function openProfileEdit() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  el('editUsername').value = pf.username || '';
  const country = el('editCountry');
  if (country) {
    const val = (pf.country || 'US').split(' ')[0];
    country.value = val;
  }
  const preview = el('avatarPreview');
  if (preview) preview.src = pf.avatar || '';
  openModal('profileEditModal');
}

function previewAvatar(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { const img = el('avatarPreview'); if (img) img.src = reader.result; };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  if (!State.user) return;
  const username = el('editUsername').value.trim();
  if (!username || username.length < 3) return toast(t('profile.edit'), t('err.username'), 'warning');
  const country = el('editCountry').value;
  const avatar = el('avatarPreview').src || '';
  const countryName = el('editCountry').selectedOptions.length ? el('editCountry').selectedOptions[0].textContent : country;
  await colRef('users').doc(State.user.uid).update({
    username,
    country: countryName,
    avatar,
    lastSeen: serverTimestamp()
  }).catch((e) => toast(t('profile.edit'), e.message, 'error'));
  State.profile.username = username;
  State.profile.country = countryName;
  State.profile.avatar = avatar;
  closeModal('profileEditModal');
  toast(t('profile.edit'), t('profile.saved'), 'success');
  renderProfile();
}

async function toggle2fa() {
  if (!State.user) return;
  const v = (State.profile || {}).verification || {};
  if (v.twoFa) {
    const ok = await askConfirm(t('security.twoFa'), t('security.disable2fa'), t('popup.confirm'));
    if (!ok) return;
    await colRef('users').doc(State.user.uid).update({ 'verification.twoFa': false, lastSeen: serverTimestamp() }).catch(() => {});
    toast(t('security.twoFa'), t('security.twoFaDisabled'), 'info');
  } else {
    await colRef('users').doc(State.user.uid).update({ 'verification.twoFa': true, lastSeen: serverTimestamp() }).catch(() => {});
    toast(t('security.twoFa'), t('security.twoFaEnabled'), 'success');
  }
  State.profile.verification = Object.assign({}, State.profile.verification, { twoFa: !(v.twoFa) });
  renderSecurity();
}

async function logout() {
  await auth.signOut().catch(() => {});
  closeModal('authModal');
  navigate('home');
}

async function deleteAccount() {
  if (!State.user) return;
  const ok = await askConfirm(t('profile.deleteAccount'), t('security.deleteConfirm'), t('popup.confirm'));
  if (!ok) return;
  await colRef('users').doc(State.user.uid).update({ status: 'deleted', lastSeen: serverTimestamp() }).catch(() => {});
  await auth.currentUser.delete().catch(() => {});
  toast(t('profile.deleteAccount'), t('security.deleted'), 'success');
  logout();
}

/* ============================================================================
   17. REAL-TIME LISTENERS + AUTH STATE + BOOT
   ============================================================================ */
function watchUser() {
  auth.onAuthStateChanged((user) => {
    State.user = user;
    if (!user) {
      State.profile = null;
      State.wallet = null;
      const pill = el('navBalance');
      if (pill) pill.style.display = 'none';
      renderAccountStatusStrip();
      navigate(State.currentPage || 'home');
      return;
    }
    colRef('users').doc(user.uid).onSnapshot((snap) => {
      if (snap.exists) {
        State.profile = Object.assign({}, snap.data(), { uid: user.uid });
        updateBalanceUI();
        renderAccountStatusStrip();
        const refresh = ['home', 'profile', 'security', 'daily', 'watch', 'referral', 'wallet', 'transactions', 'history', 'streaks', 'checkin', 'tasks'];
        if (refresh.includes(State.currentPage)) renderPage(State.currentPage);
      }
    }, (err) => console.warn('profile listener', err));
    colRef('ledger').where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(30).onSnapshot(() => {
      updateBalanceUI();
    }, () => {});
  });
}

function watchCatalog() {
  colRef('offers').onSnapshot((snap) => { State.offers = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(o => o.active !== false); if (State.catalogLoaded) renderPage(State.currentPage); }, () => {});
  colRef('games').onSnapshot((snap) => { State.games = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(g => g.active !== false); if (State.catalogLoaded) renderPage(State.currentPage); }, () => {});
  colRef('surveys').onSnapshot((snap) => { State.surveys = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(s => s.active !== false); if (State.catalogLoaded) renderPage(State.currentPage); }, () => {});
  colRef('rewards').onSnapshot((snap) => { State.rewards = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(r => r.active !== false); if (State.catalogLoaded) renderPage(State.currentPage); }, () => {});
  colRef('settings/global').onSnapshot((snap) => {
    if (snap.exists) Object.assign(State.settings, snap.data());
  }, () => {});
}

async function boot() {
  applyTranslations();
  initAuthUI();
  initNavigation();
  initGlobalActions();
  await loadSettings();
  await loadCatalog();
  State.catalogLoaded = true;
  watchUser();
  watchCatalog();
  renderFaq();
  navigate('home');
  // detect referral code from URL
  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');
  if (ref) {
    const input = el('signupReferralCode');
    if (input) input.value = ref;
    const cb = el('signupReferral');
    if (cb) cb.checked = true;
  }
  // 2FA modal wiring (security page uses confirmDialog instead)
  const closeBtns = $$('.modal-close');
  closeBtns.forEach(b => {
    if (!b.dataset.bound) {
      b.dataset.bound = '1';
      b.addEventListener('click', () => {
        const scrim = b.closest('.modal-scrim');
        if (scrim) scrim.classList.remove('open');
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}