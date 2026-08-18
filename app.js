/* ============================================================================
   REWORDS PLATFORM — app.js  (FINAL CLEAN BUILD)
   Auth, Wallet/Ledger, Offers, Games, Surveys, Rewarded Ads, Daily Rewards,
   Streaks, Referrals, Leaderboard, Store, Top-Up, Withdrawals, Notifications,
   Support, Profile, Security, Anti-Fraud, i18n (EN/AR)
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

let app = null, db = null, auth = null, storage = null, analytics = null;

try {
  app = firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore(app);
  auth = firebase.auth(app);
  storage = firebase.storage(app);
  if (firebase.analytics) { try { analytics = firebase.analytics(app); } catch(e){} }
} catch (e) {
  console.error("Firebase init failed:", e);
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
  user: null,
  profile: null,
  wallet: null,
  ledger: [],
  settings: {},
  offers: [],
  games: [],
  surveys: [],
  rewards: [],
  providers: [],
  faqs: [],
  notifications: [],
  tickets: [],
  events: [],
  promos: [],
  posts: [],
  leaderboard: [],
  currentPage: 'home',
  catalogLoaded: false,
  lang: localStorage.getItem('rewords_lang') || 'en',
  theme: localStorage.getItem('rewords_theme') || 'dark',
  selectedTopupGame: null,
  selectedTopupPackage: null,
  selectedWdMethod: 'PayPal'
};

/* ============================================================================
   3. PLATFORM CONSTANTS
============================================================================ */
const COIN_RATE = 10000;
const WITHDRAW_MIN = 10000;
const AD_REWARD_DEFAULT = 120;
const AD_DAILY_CAP = 15;
const XP_PER_LEVEL = 500;

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
  { reward: 50,  color: 'linear-gradient(135deg,#ff6a00,#ffb800)' },
  { reward: 100, color: 'linear-gradient(135deg,#6a11cb,#2575fc)' },
  { reward: 200, color: 'linear-gradient(135deg,#00e676,#009688)' },
  { reward: 50,  color: 'linear-gradient(135deg,#ff3d71,#ff6b6b)' },
  { reward: 500, color: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { reward: 100, color: 'linear-gradient(135deg,#f5af19,#f12711)' },
  { reward: 250, color: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { reward: 50,  color: 'linear-gradient(135deg,#fc466b,#3f5efb)' }
];

/* ============================================================================
   4. I18N DICTIONARY — ENGLISH
============================================================================ */
const I18N_EN = {
  'nav.home':'Home','nav.earn':'Earn','nav.games':'Games','nav.offers':'Offers',
  'nav.surveys':'Surveys','nav.watch':'Watch Ads','nav.daily':'Daily Rewards',
  'nav.rewards':'Rewards','nav.referral':'Referral','nav.leaderboard':'Leaderboard',
  'nav.support':'Support','nav.tasks':'Tasks','nav.challenges':'Challenges',
  'nav.streaks':'Streaks','nav.topup':'Top Up','nav.withdraw':'Withdraw',
  'nav.transactions':'Transactions','nav.wallet':'Wallet','nav.notifications':'Notifications',
  'nav.profile':'Profile','nav.security':'Security','nav.faq':'FAQ','nav.terms':'Terms',
  'nav.privacy':'Privacy','nav.antifraud':'Status','nav.promo':'Promo Codes',
  'nav.events':'Events','nav.blog':'News','nav.more':'More','nav.history':'History',
  'nav.offlinerewards':'Offline Rewards',
  'home.heroTitle':'Earn Coins Doing What You Love',
  'home.heroSub':'Play games, complete offers, take surveys and watch rewarded ads. Turn your free time into real coins and rewards.',
  'home.startEarning':'Start Earning','home.dailyReward':'Daily Reward',
  'home.browseRewards':'Browse Rewards','home.statUsers':'Happy Users',
  'home.statPaid':'Paid Out','home.statCoins':'Coins Awarded',
  'home.streak':'Day Streak','home.dailyTitle':'Your Daily Reward is Ready!',
  'home.claimNow':'Claim Now','home.popularRewards':'Popular Rewards',
  'home.seeAll':'See All','home.topOffers':'Top Earning Offers',
  'home.topGames':'Top Earning Games','home.bestSurveys':'Best Surveys',
  'home.watchCtaTitle':'Watch Ads, Earn Instant Coins',
  'home.watchCtaSub':'Short rewarded videos pay coins instantly. No catch.',
  'home.startWatching':'Start Watching',
  'home.referCtaTitle':'Invite Friends & Earn Together',
  'home.referCtaSub':'Earn bonus coins for every friend who joins and completes their first offer.',
  'home.referNow':'Get Referral Link','home.topUsers':'Best Users Today',
  'home.recentlyCompleted':'Recently Completed',
  'home.faqTitle':'Frequently Asked Questions','home.howTitle':'How It Works',
  'home.step1':'Create Your Account','home.step1Sub':'Sign up free in seconds with email or Google.',
  'home.step2':'Complete Tasks & Offers','home.step2Sub':'Play games, take surveys, watch ads and more.',
  'home.step3':'Withdraw Your Earnings','home.step3Sub':'Cash out via PayPal, crypto, bank and more.',
  'home.trustTitle':'Trusted Partners','home.featuresTitle':'Why Rewords?',
  'home.fInstant':'Instant Rewards','home.fInstantSub':'Get rewarded moments after completing tasks.',
  'home.fSecure':'Secure & Safe','home.fSecureSub':'Advanced anti-fraud and data protection.',
  'home.fGlobal':'Global Offers','home.fGlobalSub':'Thousands of offers available worldwide.',
  'home.fDaily':'Daily Bonuses','home.fDailySub':'Check in daily for streak bonuses.',
  'home.fWithdraw':'Low Minimums','home.fWithdrawSub':'Withdraw from as little as $1.',
  'home.fSupport':'24/7 Support','home.fSupportSub':'Our team is always here to help.',
  'home.gamesShowcase':'Game Showcase',
  'home.transparency':'How Your Rewards Are Funded',
  'home.transparencySub':'Every reward you earn is backed by real revenue from our partners.',
  'home.fStep1':'You complete an offer','home.fStep2':'Partner confirms & pays',
  'home.fStep3':'You earn coins','home.fStep4':'You withdraw & win',
  'home.newsTitle':'Get Exclusive Offers',
  'home.newsSub':'Join our newsletter for bonus codes, events and offers.',
  'home.newsSubscribe':'Subscribe',
  'earn.title':'Earn Coins',
  'earn.sub':'Pick a provider below to start completing offers and earning coins.',
  'earn.freecashTitle':'Freecash — Earn Cash for Playing Games',
  'earn.freecashSub':'Play games, install apps and take surveys with Freecash.',
  'earn.smartlinkTitle':'Explore Partner Networks',
  'earn.smartlinkSub':'Discover great offers across our partner network.',
  'earn.explore':'Explore','earn.sponsoredTasks':'Sponsored Tasks',
  'earn.adOpportunities':'Ad Opportunities','earn.allOffers':'All Offers',
  'earn.searchPlaceholder':'Search offers...',
  'offers.title':'Offers',
  'offers.sub':'Complete tasks from our trusted partners and get rewarded instantly.',
  'offers.searchPlaceholder':'Search offers...','offers.sortByReward':'Sort: Reward',
  'games.title':'Games',
  'games.sub':'Install games, reach milestones and earn big coin rewards along the way.',
  'games.searchPlaceholder':'Search games...','games.milestones':'Milestone Rewards',
  'games.mInstall':'Install','games.mFinal':'Final','games.play':'Play & Earn',
  'games.highReward':'High Reward Games',
  'surveys.title':'Surveys',
  'surveys.sub':'Share your opinion and earn coins. Surveys fill up fast — complete them early!',
  'watch.title':'Watch Ads & Earn',
  'watch.sub':'Watch short rewarded videos and earn instant coins. Daily cap applies.',
  'watch.watchedToday':'Ads Watched Today','watch.earnedToday':'Coins Earned Today',
  'watch.remaining':'Ads Remaining Today','watch.rewVideoTitle':'Rewarded Video',
  'watch.rewVideoSub':'Watch a short video to earn instant coins.',
  'watch.watchNow':'Watch Now','watch.spinTitle':'Bonus Wheel Spin',
  'watch.spinSub':'Watch an ad to unlock the bonus wheel and spin for big coins.',
  'watch.spinBtn':'Go to Wheel','watch.adSlots':'More Ways to Earn',
  'watch.m1':'Daily Ad Bonus','watch.m1Sub':'+300 coins daily','watch.claim':'Claim',
  'watch.m2':'Interstitial Reward','watch.m2Sub':'+200 coins',
  'watch.m3':'Bonus Spin','watch.m3Sub':'Up to +1,000 coins',
  'daily.title':'Daily Rewards',
  'daily.sub':'Log in every day and claim rewards. Don\'t break your streak!',
  'daily.streak':'Current Streak','daily.bonus':'Next Reward Bonus',
  'daily.week':'7-Day Reward Plan','daily.day':'Day',
  'daily.claim':'Claim Today\'s Reward','daily.streakVisual':'Your Streak',
  'daily.spinWheel':'Bonus Spin Wheel','daily.spin':'Spin the Wheel',
  'daily.scratch':'Scratch Card','daily.scratchHint':'Scratch to reveal!',
  'daily.mystery':'Mystery Box','daily.treasure':'Daily Treasure',
  'daily.bonusInfo':'Bonus Multiplier',
  'tasks.title':'Tasks','tasks.sub':'Complete daily and weekly tasks to boost your earnings.',
  'tasks.daily':'Daily Tasks','tasks.weekly':'Weekly Tasks',
  'tasks.t1':'Log In','tasks.t1Sub':'Visit the platform today',
  'tasks.t2':'Watch 3 Ads','tasks.t3':'Complete 1 Offer','tasks.t3Sub':'Any offer from the wall',
  'tasks.t4':'Install 3 Games','tasks.t5':'Invite 2 Friends','tasks.t6':'Earn 5,000 Coins',
  'challenges.title':'Challenges','challenges.sub':'Push your limits and unlock big rewards.',
  'challenges.daily':'Daily Challenges','challenges.weekly':'Weekly Challenges',
  'challenges.monthly':'Monthly Challenges',
  'checkin.title':'Daily Check-in',
  'checkin.sub':'Check in every day to keep your streak and earn bonuses.',
  'checkin.checkIn':'Check In Now',
  'streaks.title':'Streaks','streaks.sub':'Keep your streak going to unlock increasing bonuses.',
  'streaks.current':'Current Streak','streaks.best':'Best Streak',
  'streaks.freezes':'Freeze Streaks','streaks.monthView':'This Month',
  'referral.title':'Invite & Earn Unlimited Coins',
  'referral.sub':'Share your link and earn bonus coins for every friend who joins and earns.',
  'referral.totalInvited':'Friends Invited','referral.earned':'Referral Coins Earned',
  'referral.active':'Active Friends','referral.shareLink':'Your Referral Link',
  'referral.copy':'Copy','referral.share':'Share',
  'referral.enterCode':'Enter a referral code...','referral.apply':'Apply',
  'referral.milestones':'Referral Milestones','referral.myFriends':'My Referrals',
  'referral.earnSub':'Plus, earn 10% of the coins your referrals earn — forever.',
  'ref.m1Title':'Friend Joins','ref.m1Sub':'When your friend signs up with your link',
  'ref.m2Title':'First Activity','ref.m2Sub':'Friend completes their first task',
  'ref.m3Title':'First Offer','ref.m3Sub':'Friend completes their first offer',
  'ref.m4Title':'5 Referrals','ref.m4Sub':'Invite 5 active friends',
  'ref.m5Title':'10 Referrals','ref.m5Sub':'Invite 10 active friends',
  'ref.m6Title':'First Withdrawal','ref.m6Sub':'Friend makes their first withdrawal',
  'leaderboard.title':'Leaderboard',
  'leaderboard.sub':'Compete with the best earners and climb the ranks.',
  'rewards.title':'Rewards Store',
  'rewards.sub':'Spend your coins on gift cards, game top-ups and more.',
  'rewards.giftCards':'Gift Cards','rewards.crypto':'Crypto Rewards',
  'rewards.gameTopup':'Game Top-Up',
  'topup.title':'Game Top-Up',
  'topup.sub':'Instantly top up your favorite games using your coins.',
  'topup.selectGame':'1. Select Game','topup.instant':'Instant',
  'topup.selectRegion':'2. Region','topup.playerId':'3. Player ID',
  'topup.playerIdPh':'Enter your player ID',
  'topup.serverIdPh':'Server ID (optional)',
  'topup.selectPackage':'4. Select Package','topup.paymentMethod':'5. Payment Method',
  'topup.coins':'Coins Balance','topup.cash':'Cash','topup.cashSub':'Pay with real money',
  'topup.summary':'Order Summary','topup.game':'Game','topup.package':'Package',
  'topup.player':'Player ID','topup.region':'Region','topup.cost':'Cost',
  'topup.confirm':'Confirm & Top-Up',
  'withdraw.title':'Withdraw',
  'withdraw.sub':'Cash out your coins through your preferred method.',
  'withdraw.minimum':'Minimum Withdrawal','withdraw.selectMethod':'1. Select Method',
  'withdraw.amount':'2. Amount','withdraw.details':'3. Account Details',
  'withdraw.summary':'Withdrawal Summary','withdraw.method':'Method',
  'withdraw.receive':'You Receive','withdraw.fee':'Fee',
  'withdraw.request':'Request Withdrawal',
  'withdraw.hint':'Withdrawals are reviewed for security and typically processed within 24-72 hours.',
  'transactions.title':'Transactions',
  'transactions.sub':'Complete history of your ledger activity.',
  'notifications.title':'Notifications',
  'notifications.sub':'Stay up to date with your account activity.',
  'notifications.markAll':'Mark All Read','notifications.clearAll':'Clear All',
  'support.title':'Support Center',
  'support.sub':'Need help? Open a ticket and our team will assist you.',
  'support.avgTime':'Avg. Response','support.solved':'Tickets Solved',
  'support.open':'Open Tickets','support.rating':'User Rating',
  'support.myTickets':'My Tickets','support.newTicket':'New Ticket',
  'support.liveChat':'Rewords Assistant','support.chatPlaceholder':'Type a message...',
  'support.category':'Category','support.subject':'Subject',
  'support.message':'Message','support.submit':'Submit Ticket',
  'support.kb':'Knowledge Base',
  'chat.welcome':'Hi! I\'m the Rewords assistant. Ask me anything about earning, withdrawals or your account.',
  'chat.autoReply':'Thanks for reaching out! A support agent will reply shortly.',
  'profile.edit':'Edit','profile.completed':'Offers Completed',
  'profile.withdrawn':'Withdrawn','profile.achievements':'Achievements',
  'profile.badges':'Badges','profile.referralCode':'My Referral Code',
  'profile.sessions':'Active Sessions','profile.devices':'Devices',
  'profile.security':'Security','profile.goSecurity':'Manage Security',
  'profile.deleteAccount':'Delete Account','profile.username':'Username',
  'profile.country':'Country','profile.save':'Save Changes',
  'ach.a1':'First Game Installed','ach.a1Sub':'Install your first game',
  'ach.a2':'First Survey','ach.a2Sub':'Complete your first survey',
  'ach.a3':'High Roller','ach.a3Sub':'Earn 100,000 coins total',
  'ach.a4':'Referral Star','ach.a4Sub':'Invite 10 friends',
  'ach.a5':'Streak Master','ach.a5Sub':'Maintain a 30-day streak',
  'security.title':'Security',
  'security.sub':'Protect your account with these security features.',
  'security.email':'Email Verified','security.verify':'Verify',
  'security.phone':'Phone Number','security.add':'Add',
  'security.twoFa':'Two-Factor Auth','security.twoFaSub':'Add extra protection',
  'security.enable':'Enable','security.password':'Password',
  'security.passwordSub':'Last changed recently','security.change':'Change',
  'security.loginHistory':'Login History','security.suspicious':'Suspicious Activity',
  'security.noThreat':'No threats detected',
  'security.noThreatSub':'We continuously monitor your account for suspicious activity.',
  'faq.title':'Frequently Asked Questions',
  'faq.sub':'Everything you need to know about Rewords.',
  'terms.title':'Terms of Service','privacy.title':'Privacy Policy',
  'antifraud.title':'Account Status & Security',
  'antifraud.sub':'Your account\'s current security and fraud-detection status.',
  'wallet.title':'Wallet',
  'wallet.sub':'Your complete coin ledger and balance breakdown.',
  'wallet.available':'Available','wallet.pending':'Pending','wallet.locked':'Locked',
  'wallet.lifetime':'Lifetime Earned','wallet.spent':'Lifetime Spent',
  'wallet.withdrawn':'Total Withdrawn','wallet.withdrawBtn':'Withdraw',
  'wallet.topupBtn':'Top-Up Games','wallet.ledger':'Ledger',
  'promo.title':'Promo Codes',
  'promo.sub':'Redeem bonus coins with special promo codes.',
  'promo.enter':'Enter Your Promo Code','promo.redeem':'Redeem',
  'promo.hint':'Promo codes are limited to one use per account.',
  'promo.activeCodes':'Active Promo Codes',
  'events.title':'Events & Seasonal',
  'events.sub':'Limited-time events with boosted rewards.',
  'events.active':'Active Events','events.upcoming':'Upcoming Events',
  'events.past':'Past Events',
  'blog.title':'News & Tips',
  'blog.sub':'The latest updates, tips and announcements from Rewords.',
  'blog.read':'Read More',
  'history.title':'Check-in History',
  'history.sub':'View all your past check-ins and rewards.',
  'offline.title':'Offline Rewards',
  'offline.sub':'Keep your streak alive even when you miss a day.',
  'more.title':'Explore More','more.sub':'Everything else you might need.',
  'auth.logout':'Log Out','auth.remember':'Remember me',
  'auth.forgot':'Forgot password?','auth.login':'Login','auth.or':'or',
  'auth.signup':'Create Account','auth.hasCode':'I have a referral code',
  'auth.agree':'I agree to the','auth.terms':'Terms of Service',
  'auth.sendReset':'Send Reset Link','auth.back':'Back',
  'auth.verifyTitle':'Verify Your Email',
  'auth.verifySub':'We sent you a verification link. Please check your inbox.',
  'auth.resend':'Resend Email','auth.iVerified':'I\'ve verified — Continue',
  'auth.welcome':'Welcome to Rewords!',
  'auth.welcomeBack':'Welcome back!',
  'auth.needLogin':'Sign in to unlock all features and start earning.',
  'auth.resetSent':'Email sent successfully!',
  'popup.cancel':'Cancel','popup.confirm':'Confirm',
  'popup.rewardTitle':'Reward Earned!','popup.awesome':'Awesome!',
  'footer.about':'Earn coins by completing offers, playing games, taking surveys and watching rewarded ads. Withdraw your earnings today.',
  'footer.earn':'Earn','footer.offers':'Offers','footer.games':'Games',
  'footer.surveys':'Surveys','footer.watch':'Watch Ads','footer.referral':'Referral',
  'footer.account':'Account','footer.wallet':'Wallet','footer.rewards':'Rewards Store',
  'footer.transactions':'Transactions','footer.support':'Support','footer.security':'Security',
  'footer.legal':'Legal','footer.terms':'Terms','footer.privacy':'Privacy',
  'footer.faq':'FAQ','footer.status':'Status','footer.rights':'All rights reserved.',
  'err.fillAll':'Please fill in all fields',
  'err.insufficient':'Insufficient coins',
  'err.username':'Username must be at least 3 characters',
  'err.password':'Password must be at least 8 characters',
  'err.terms':'Please accept the terms',
  'err.verifyFirst':'Please verify your email first',
  'ledger.signupBonus':'Welcome signup bonus',
  'ledger.offerComplete':'Offer completed: {n}',
  'ledger.surveyComplete':'Survey completed: {n}',
  'ledger.rewardRedeem':'Reward redeemed: {n}',
  'ledger.adReward':'Rewarded ad',
  'ledger.adBonus':'Daily ad bonus',
  'ledger.interstitial':'Interstitial ad reward',
  'ledger.dailyClaim':'Daily claim · Day {n}',
  'ledger.wheel':'Spin wheel bonus',
  'ledger.scratch':'Scratch card bonus',
  'ledger.mystery':'Mystery box reward',
  'ledger.treasure':'Treasure chest reward',
  'ledger.topup':'Game top-up: {g}',
  'ledger.withdrawal':'Withdrawal',
  'ledger.promo':'Promo code: {n}',
  'notif.offerDone':'Offer completed!',
  'notif.dailyDone':'Daily reward claimed!',
  'notif.streak':'Day streak:',
  'notif.welcome':'Welcome to Rewords!',
  'notif.welcomeBody':'Start earning coins by completing offers, games and surveys.',
  'notif.refJoined':'A friend joined!',
  'notif.joinedUsingYourCode':'joined using your referral code.',
  'account.pending':'Verification pending',
  'account.restricted':'Account restricted',
  'account.verifyEmail':'Verify your email',
  'account.flagged':'Flagged for review',
  'account.good':'Account healthy',
  'offers.all':'All Providers','offers.viewDetails':'View Details',
  'offers.none':'No offers available',
  'offers.noneSub':'Check back soon — new offers arrive daily.',
  'offers.payout':'Payout','offers.minutes':'Minutes',
  'offers.difficulty':'Difficulty','offers.milestones':'Milestones',
  'offers.howTo':'How to complete',
  'offers.stepDefault':'Complete the required action to get credited.',
  'offers.start':'Start Offer','offers.imDone':'I\'m Done',
  'offers.install':'Install','offers.complete':'Complete the offer',
  'offers.creditNote':'Rewards may take up to 5 minutes to appear after completion.',
  'offers.confirmTitle':'Confirm completion',
  'offers.confirmBody':'You are about to claim +{n} coins for completing this offer.',
  'games.none':'No games available',
  'games.noneSub':'New earning games are added regularly.',
  'games.playNow':'Play Now','games.rating':'Rating','games.installs':'Installs',
  'surveys.none':'No surveys available','surveys.general':'General',
  'surveys.min':'min','surveys.slotsLeft':'slots left','surveys.full':'Full',
  'surveys.start':'Start','surveys.submit':'Submit & Earn',
  'surveys.qualified':'Qualification',
  'surveys.disqualify':'You may be disqualified if your answers don\'t match the target profile.',
  'surveys.question':'How likely are you to recommend our app?',
  'surveys.opt1':'Very likely','surveys.opt2':'Somewhat likely','surveys.opt3':'Not likely',
  'rewards.all':'All Rewards','rewards.from':'From',
  'rewards.outOfStock':'Out of stock','rewards.redeem':'Redeem',
  'rewards.none':'No rewards available',
  'rewards.noneSub':'Rewards are restocked every week.',
  'rewards.confirm':'Confirm Redemption',
  'rewards.confirmRedeem':'Confirm Redemption',
  'rewards.cost':'Cost','rewards.balance':'Your balance',
  'rewards.ordered':'Order placed! You\'ll receive it within 24 hours.',
  'events.joinNow':'Join Now','events.none':'No events right now',
  'events.noneSub':'Follow us to stay tuned for new events.',
  'events.title':'Event Details','events.reward':'Total reward','events.coins':'coins',
  'blog.none':'No articles yet','blog.noneSub':'Tips and news coming soon.',
  'watch.perAd':'coins per ad','watch.done':'All done for today',
  'watch.capReached':'Daily ad cap reached. Come back tomorrow!',
  'watch.bonusClaimed':'Bonus already claimed today.',
  'daily.claimed':'Claimed for today',
  'daily.wheelSpun':'Wheel already spun today',
  'daily.wheelReady':'Spin once per day — good luck!',
  'daily.spinning':'Spinning...',
  'daily.scratchDone':'Scratch card used for today',
  'daily.scratchReady':'Tap the card to scratch!',
  'daily.mysteryDone':'Box opened for today',
  'daily.mysteryReady':'Tap the box to open it!',
  'daily.opening':'Opening...',
  'daily.treasureDone':'Treasure collected for today',
  'daily.treasureReady':'Tap the chest to open it!',
  'checkin.done':'Checked in today!',
  'checkin.today':'Check in today',
  'checkin.dayStreak':'day streak',
  'checkin.checkedIn':'Checked In',
  'tasks.none':'No tasks available','tasks.noneSub':'Check back soon.',
  'ch.d1':'Watch 5 ads','ch.d2':'Watch 10 ads',
  'ch.w1':'Complete 5 offers','ch.w2':'Earn 20,000 coins',
  'ch.m1':'Complete 20 offers','ch.m2':'Invite 10 friends',
  'referral.self':'You can\'t use your own code!',
  'referral.already':'You already have a referrer.',
  'referral.applied':'Referral code applied!',
  'referral.noFriends':'No referrals yet',
  'referral.noFriendsSub':'Share your link to start earning.',
  'referral.copied':'Link copied to clipboard!',
  'referral.shareMsg':'Join me on Rewords and earn coins for offers, games and surveys!',
  'leaderboard.none':'No rankings yet',
  'leaderboard.noneSub':'Be the first to top the leaderboard!',
  'leaderboard.level':'Level','leaderboard.you':'You',
  'topup.noGames':'No top-up games','topup.noGamesSub':'Check back soon.',
  'topup.selectGameFirst':'Select a game first',
  'topup.enterPlayerId':'Enter your player ID',
  'topup.confirm':'Confirm Top-Up',
  'topup.confirmBody':'Top up {g} ({p}) for {n} coins?',
  'topup.success':'Top-up order placed!',
  'topup.successSub':'We\'ll deliver your items within 24 hours.',
  'withdraw.bank':'Bank Transfer','withdraw.giftcard':'Gift Card',
  'withdraw.from':'From','withdraw.minLabel':'Minimum: {n} coins',
  'withdraw.tooSmall':'Minimum withdrawal is {n} coins',
  'withdraw.pendingExists':'You already have a pending withdrawal.',
  'withdraw.confirm':'Confirm Withdrawal',
  'withdraw.confirmBody':'Withdraw {n} coins via {m}?',
  'withdraw.requested':'Withdrawal requested',
  'withdraw.requestedSub':'We\'ll review it within 24-72 hours.',
  'withdraw.network':'Network','withdraw.accountName':'Account Name',
  'withdraw.swift':'SWIFT / BIC','withdraw.giftcardType':'Gift Card Type',
  'transactions.none':'No transactions yet',
  'transactions.noneSub':'Start earning to see your history.',
  'notifications.none':'No notifications',
  'notifications.noneSub':'You\'re all caught up!',
  'notifications.clearConfirm':'Delete all your notifications?',
  'support.noTickets':'No support tickets',
  'support.noTicketsSub':'Open a ticket and we\'ll help you fast.',
  'support.subject':'Subject','support.subjectPh':'Briefly describe the issue',
  'support.category':'Category','support.message':'Message',
  'support.send':'Send Ticket','support.sent':'Ticket sent',
  'support.sentSub':'Our team will reply soon.',
  'profile.saved':'Profile updated successfully!',
  'profile.locked':'Locked','profile.noCountry':'No country set',
  'profile.unverified':'Unverified','profile.level':'Level',
  'badge.newbie':'Newbie','badge.gamer':'Gamer','badge.surveyor':'Surveyor',
  'badge.earner':'Earner','badge.streaker':'Streaker','badge.inviter':'Inviter',
  'pf.thisDevice':'This device','pf.currentSession':'Current session',
  'pf.active':'Active','pf.trusted':'Trusted','pf.noDevices':'No saved devices',
  'security.verified':'Verified','security.notVerified':'Not verified',
  'security.today':'Today','security.login':'Login',
  'security.currentDevice':'This device',
  'security.twoFaEnabled':'Two-factor authentication enabled!',
  'security.twoFaDisabled':'Two-factor authentication disabled.',
  'security.disable2fa':'Disable two-factor authentication?',
  'security.deleteConfirm':'This permanently deletes your account and all data.',
  'security.deleted':'Account deleted. Sorry to see you go!',
  'fraud.low':'Low Risk','fraud.medium':'Medium Risk','fraud.high':'High Risk',
  'fraud.score':'Trust Score','fraud.level':'Risk Level',
  'fraud.flags':'Flags','fraud.clean':'No issues',
  'fraud.noThreats':'No suspicious activity detected on your account.',
  'promo.invalid':'Invalid promo code',
  'promo.used':'This code was already used.',
  'promo.use':'Use','promo.none':'No promo codes',
  'promo.noneSub':'Promo codes appear here during events.',
  'history.none':'No completed earnings yet',
  'history.noneSub':'Your completed offers and tasks will appear here.',
  'pw.weak':'Weak','pw.medium':'Medium','pw.strong':'Strong','pw.veryStrong':'Very strong'
};

/* ============================================================================
   5. I18N DICTIONARY — ARABIC
============================================================================ */
const I18N_AR = {
  'nav.home':'الرئيسية','nav.earn':'اكسب','nav.games':'الألعاب','nav.offers':'العروض',
  'nav.surveys':'الاستبيانات','nav.watch':'شاهد الإعلانات','nav.daily':'المكافآت اليومية',
  'nav.rewards':'المكافآت','nav.referral':'الإحالة','nav.leaderboard':'المتقدمون',
  'nav.support':'الدعم','nav.tasks':'المهام','nav.challenges':'التحديات',
  'nav.streaks':'التتابع','nav.topup':'شحن الألعاب','nav.withdraw':'السحب',
  'nav.transactions':'المعاملات','nav.wallet':'المحفظة','nav.notifications':'الإشعارات',
  'nav.profile':'الملف الشخصي','nav.security':'الأمان','nav.faq':'الأسئلة',
  'nav.terms':'الشروط','nav.privacy':'الخصوصية','nav.antifraud':'الحالة',
  'nav.promo':'أكواد الخصم','nav.events':'الفعاليات','nav.blog':'الأخبار',
  'nav.more':'المزيد','nav.history':'السجل','nav.offlinerewards':'مكافآت دون اتصال',
  'home.heroTitle':'اربح عملات بفعل ما تحب',
  'home.heroSub':'العب الألعاب، أكمل العروض، أجب عن الاستبيانات وشاهد الإعلانات المدفوعة. حوّل وقتك إلى عملات ومكافآت حقيقية.',
  'home.startEarning':'ابدأ الربح','home.dailyReward':'المكافأة اليومية',
  'home.browseRewards':'تصفح المكافآت','home.statUsers':'مستخدم سعيد',
  'home.statPaid':'تم الدفع','home.statCoins':'عملات ممنوحة',
  'home.streak':'أيام التتابع','home.dailyTitle':'مكافأتك اليومية جاهزة!',
  'home.claimNow':'استلم الآن','home.popularRewards':'المكافآت الشائعة',
  'home.seeAll':'عرض الكل','home.topOffers':'أعلى العروض ربحًا',
  'home.topGames':'أعلى الألعاب ربحًا','home.bestSurveys':'أفضل الاستبيانات',
  'home.watchCtaTitle':'شاهد إعلانات واكسب عملات فورية',
  'home.watchCtaSub':'فيديوهات قصيرة مدفوعة تمنحك عملات فورًا.',
  'home.startWatching':'ابدأ المشاهدة',
  'home.referCtaTitle':'ادعُ أصدقاءك واربح معًا',
  'home.referCtaSub':'اربح عملات إضافية لكل صديق ينضم ويكمل أول عرض.',
  'home.referNow':'احصل على رابط الإحالة',
  'home.topUsers':'أفضل المستخدمين اليوم',
  'home.recentlyCompleted':'المكتمل حديثًا',
  'home.faqTitle':'الأسئلة الشائعة','home.howTitle':'كيف يعمل؟',
  'home.step1':'أنشئ حسابك','home.step1Sub':'سجّل مجانًا في ثوانٍ بالبريد أو جوجل.',
  'home.step2':'أكمل المهام والعروض','home.step2Sub':'العب الألعاب، أجب عن الاستبيانات، شاهد الإعلانات والمزيد.',
  'home.step3':'اسحب أرباحك','home.step3Sub':'اسحب عبر باي بال، العملات الرقمية، البنك والمزيد.',
  'home.trustTitle':'شركاء موثوقون','home.featuresTitle':'لماذا ريووردز؟',
  'home.fInstant':'مكافآت فورية','home.fInstantSub':'احصل على المكافأة فور إتمام المهام.',
  'home.fSecure':'آمن ومحمي','home.fSecureSub':'حماية متقدمة من الاحتيال وخصوصية البيانات.',
  'home.fGlobal':'عروض عالمية','home.fGlobalSub':'آلاف العروض متاحة حول العالم.',
  'home.fDaily':'مكافآت يومية','home.fDailySub':'سجّل يوميًا لمكافآت التتابع.',
  'home.fWithdraw':'حد أدنى منخفض','home.fWithdrawSub':'اسحب من 1 دولار فقط.',
  'home.fSupport':'دعم 24/7','home.fSupportSub':'فريقنا جاهز دائمًا لمساعدتك.',
  'home.gamesShowcase':'عرض الألعاب',
  'home.transparency':'كيف يتم تمويل مكافآتك',
  'home.transparencySub':'كل مكافأة تحصل عليها مدعومة بإيراد حقيقي من شركائنا.',
  'home.fStep1':'تكمل عرضًا','home.fStep2':'يؤكد الشريك ويدفع',
  'home.fStep3':'تربح عملات','home.fStep4':'تسحب أرباحك',
  'home.newsTitle':'احصل على عروض حصرية',
  'home.newsSub':'اشترك في نشرتنا لأكواد المكافآت والفعاليات والعروض.',
  'home.newsSubscribe':'اشترك',
  'earn.title':'اكسب العملات',
  'earn.sub':'اختر مزودًا أدناه لبدء إتمام العروض وكسب العملات.',
  'earn.freecashTitle':'فري كاش — اربح المال من الألعاب',
  'earn.freecashSub':'العب الألعاب، ثبّت التطبيقات وأجب عن الاستبيانات مع فري كاش.',
  'earn.smartlinkTitle':'استكشف شبكات الشركاء',
  'earn.smartlinkSub':'اكتشف عروضًا رائعة عبر شبكة شركائنا.',
  'earn.explore':'استكشف','earn.sponsoredTasks':'مهام برعاية',
  'earn.adOpportunities':'فرص الإعلانات','earn.allOffers':'كل العروض',
  'earn.searchPlaceholder':'ابحث في العروض...',
  'offers.title':'العروض',
  'offers.sub':'أكمل المهام من شركائنا الموثوقين واحصل على المكافأة فورًا.',
  'offers.searchPlaceholder':'ابحث في العروض...','offers.sortByReward':'ترتيب: المكافأة',
  'games.title':'الألعاب',
  'games.sub':'ثبّت الألعاب، حقّق المراحل واربح عملات كبيرة.',
  'games.searchPlaceholder':'ابحث في الألعاب...','games.milestones':'مكافآت المراحل',
  'games.mInstall':'التثبيت','games.mFinal':'المرحلة النهائية',
  'games.play':'العب واربح','games.highReward':'ألعاب عالية المكافأة',
  'surveys.title':'الاستبيانات',
  'surveys.sub':'شارك برأيك واربح عملات. الاستبيانات تُملأ بسرعة!',
  'watch.title':'شاهد الإعلانات واربح',
  'watch.sub':'شاهد فيديوهات قصيرة مدفوعة واربح عملات فورية.',
  'watch.watchedToday':'إعلانات شوهدت اليوم','watch.earnedToday':'عملات ربحتها اليوم',
  'watch.remaining':'الإعلانات المتبقية اليوم','watch.rewVideoTitle':'فيديو مدفوع',
  'watch.rewVideoSub':'شاهد فيديو قصيرًا لتربح عملات فورية.',
  'watch.watchNow':'شاهد الآن','watch.spinTitle':'عجلة الحظ الإضافية',
  'watch.spinSub':'شاهد إعلانًا لفتح عجلة الحظ واربح عملات كبيرة.',
  'watch.spinBtn':'اذهب للعجلة','watch.adSlots':'طرق إضافية للربح',
  'watch.m1':'مكافأة إعلان يومية','watch.m1Sub':'+300 عملة يوميًا',
  'watch.claim':'استلم','watch.m2':'مكافأة وسيطة','watch.m2Sub':'+200 عملة',
  'watch.m3':'عجلة الحظ','watch.m3Sub':'حتى +1,000 عملة',
  'daily.title':'المكافآت اليومية',
  'daily.sub':'سجّل يوميًا واستلم المكافآت. لا تكسر تتابعك!',
  'daily.streak':'التتابع الحالي','daily.bonus':'مكافأة التتابع التالي',
  'daily.week':'خطة المكافآت لـ7 أيام','daily.day':'يوم',
  'daily.claim':'استلم مكافأة اليوم','daily.streakVisual':'تتابعك',
  'daily.spinWheel':'عجلة الحظ الإضافية','daily.spin':'أدر العجلة',
  'daily.scratch':'بطاقة الخدش','daily.scratchHint':'اخدش لترى مكسبك!',
  'daily.mystery':'الصندوق الغامض','daily.treasure':'الكنز اليومي',
  'daily.bonusInfo':'مضاعف المكافأة',
  'tasks.title':'المهام','tasks.sub':'أكمل المهام اليومية والأسبوعية لتعزيز أرباحك.',
  'tasks.daily':'مهام يومية','tasks.weekly':'مهام أسبوعية',
  'tasks.t1':'تسجيل الدخول','tasks.t1Sub':'قم بزيارة المنصة اليوم',
  'tasks.t2':'شاهد 3 إعلانات','tasks.t3':'أكمل عرضًا واحدًا',
  'tasks.t3Sub':'أي عرض من القائمة',
  'tasks.t4':'ثبّت 3 ألعاب','tasks.t5':'ادعُ صديقين','tasks.t6':'اربح 5,000 عملة',
  'challenges.title':'التحديات','challenges.sub':'تجاوز حدودك وافتح مكافآت كبيرة.',
  'challenges.daily':'تحديات يومية','challenges.weekly':'تحديات أسبوعية',
  'challenges.monthly':'تحديات شهرية',
  'checkin.title':'تسجيل الدخول اليومي',
  'checkin.sub':'سجّل يوميًا للحفاظ على تتابعك وكسب المكافآت.',
  'checkin.checkIn':'سجّل الآن',
  'streaks.title':'التتابع','streaks.sub':'حافظ على تتابعك لفتح مكافآت متزايدة.',
  'streaks.current':'التتابع الحالي','streaks.best':'أفضل تتابع',
  'streaks.freezes':'تجميد التتابع','streaks.monthView':'هذا الشهر',
  'referral.title':'ادعُ واربح عملات غير محدودة',
  'referral.sub':'شارك رابطك واربح عملات إضافية لكل صديق ينضم ويربح.',
  'referral.totalInvited':'أصدقاء مدعوون','referral.earned':'عملات الإحالة',
  'referral.active':'أصدقاء نشطون','referral.shareLink':'رابط الإحالة الخاص بك',
  'referral.copy':'نسخ','referral.share':'مشاركة',
  'referral.enterCode':'أدخل رمز إحالة...','referral.apply':'تطبيق',
  'referral.milestones':'مراحل الإحالة','referral.myFriends':'إحالاتي',
  'referral.earnSub':'بالإضافة إلى 10% من عملات إحالاتك — إلى الأبد.',
  'ref.m1Title':'انضمام صديق','ref.m1Sub':'عند تسجيل صديقك برابطك',
  'ref.m2Title':'أول نشاط','ref.m2Sub':'يكمل الصديق أول مهمة',
  'ref.m3Title':'أول عرض','ref.m3Sub':'يكمل الصديق أول عرض',
  'ref.m4Title':'5 إحالات','ref.m4Sub':'ادعُ 5 أصدقاء نشطين',
  'ref.m5Title':'10 إحالات','ref.m5Sub':'ادعُ 10 أصدقاء نشطين',
  'ref.m6Title':'أول سحب','ref.m6Sub':'يقوم الصديق بأول سحب',
  'leaderboard.title':'المتقدمون',
  'leaderboard.sub':'تنافس مع أفضل الرابحين وتقدم في الترتيب.',
  'rewards.title':'متجر المكافآت',
  'rewards.sub':'أنفق عملاتك على بطاقات الهدايا وشحن الألعاب والمزيد.',
  'rewards.giftCards':'بطاقات الهدايا','rewards.crypto':'مكافآت العملات الرقمية',
  'rewards.gameTopup':'شحن الألعاب',
  'topup.title':'شحن الألعاب',
  'topup.sub':'اشحن ألعابك المفضلة فورًا باستخدام عملاتك.',
  'topup.selectGame':'1. اختر اللعبة','topup.instant':'فوري',
  'topup.selectRegion':'2. المنطقة','topup.playerId':'3. معرّف اللاعب',
  'topup.playerIdPh':'أدخل معرّف اللاعب',
  'topup.serverIdPh':'معرّف الخادم (اختياري)',
  'topup.selectPackage':'4. اختر الحزمة','topup.paymentMethod':'5. طريقة الدفع',
  'topup.coins':'رصيد العملات','topup.cash':'نقدًا','topup.cashSub':'ادفع بمال حقيقي',
  'topup.summary':'ملخص الطلب','topup.game':'اللعبة','topup.package':'الحزمة',
  'topup.player':'معرّف اللاعب','topup.region':'المنطقة','topup.cost':'التكلفة',
  'topup.confirm':'تأكيد الشحن',
  'withdraw.title':'السحب',
  'withdraw.sub':'اسحب عملاتك عبر الطريقة المفضلة لديك.',
  'withdraw.minimum':'الحد الأدنى للسحب','withdraw.selectMethod':'1. اختر الطريقة',
  'withdraw.amount':'2. المبلغ','withdraw.details':'3. تفاصيل الحساب',
  'withdraw.summary':'ملخص السحب','withdraw.method':'الطريقة',
  'withdraw.receive':'ستستلم','withdraw.fee':'الرسوم',
  'withdraw.request':'اطلب السحب',
  'withdraw.hint':'تتم مراجعة عمليات السحب أمنيًا وتُعالج عادة خلال 24-72 ساعة.',
  'transactions.title':'المعاملات',
  'transactions.sub':'السجل الكامل لنشاط حسابك.',
  'notifications.title':'الإشعارات',
  'notifications.sub':'ابقَ على اطلاع بنشاط حسابك.',
  'notifications.markAll':'تحديد الكل كمقروء','notifications.clearAll':'مسح الكل',
  'support.title':'مركز الدعم',
  'support.sub':'تحتاج مساعدة؟ افتح تذكرة وسيساعدك فريقنا.',
  'support.avgTime':'متوسط الاستجابة','support.solved':'تذاكر محلولة',
  'support.open':'تذاكر مفتوحة','support.rating':'تقييم المستخدمين',
  'support.myTickets':'تذاكري','support.newTicket':'تذكرة جديدة',
  'support.liveChat':'مساعد ريووردز','support.chatPlaceholder':'اكتب رسالة...',
  'support.category':'التصنيف','support.subject':'الموضوع',
  'support.message':'الرسالة','support.submit':'إرسال التذكرة',
  'support.kb':'قاعدة المعرفة',
  'chat.welcome':'مرحبًا! أنا مساعد ريووردز. اسألني عن الربح أو السحب أو حسابك.',
  'chat.autoReply':'شكرًا لتواصلك! سيرد أحد ممثلي الدعم قريبًا.',
  'profile.edit':'تعديل','profile.completed':'عروض مكتملة',
  'profile.withdrawn':'تم سحبه','profile.achievements':'الإنجازات',
  'profile.badges':'الشارات','profile.referralCode':'رمز الإحالة',
  'profile.sessions':'الجلسات النشطة','profile.devices':'الأجهزة',
  'profile.security':'الأمان','profile.goSecurity':'إدارة الأمان',
  'profile.deleteAccount':'حذف الحساب','profile.username':'اسم المستخدم',
  'profile.country':'الدولة','profile.save':'حفظ التغييرات',
  'ach.a1':'أول لعبة مثبتة','ach.a1Sub':'ثبّت أول لعبة',
  'ach.a2':'أول استبيان','ach.a2Sub':'أكمل أول استبيان',
  'ach.a3':'الرابح الكبير','ach.a3Sub':'اربح 100,000 عملة إجمالًا',
  'ach.a4':'نجم الإحالة','ach.a4Sub':'ادعُ 10 أصدقاء',
  'ach.a5':'سيد التتابع','ach.a5Sub':'حافظ على تتابع 30 يومًا',
  'security.title':'الأمان',
  'security.sub':'احمِ حسابك بهذه الميزات الأمنية.',
  'security.email':'البريد مؤكد','security.verify':'تأكيد',
  'security.phone':'رقم الهاتف','security.add':'إضافة',
  'security.twoFa':'المصادقة الثنائية','security.twoFaSub':'أضف حماية إضافية',
  'security.enable':'تفعيل','security.password':'كلمة المرور',
  'security.passwordSub':'غُيّرت مؤخرًا','security.change':'تغيير',
  'security.loginHistory':'سجل تسجيل الدخول','security.suspicious':'نشاط مشبوه',
  'security.noThreat':'لا توجد تهديدات',
  'security.noThreatSub':'نراقب حسابك باستمرار بحثًا عن نشاط مشبوه.',
  'faq.title':'الأسئلة الشائعة',
  'faq.sub':'كل ما تحتاج معرفته عن ريووردز.',
  'terms.title':'شروط الاستخدام','privacy.title':'سياسة الخصوصية',
  'antifraud.title':'حالة الحساب والأمان',
  'antifraud.sub':'حالة حسابك الحالية من الأمان وكشف الاحتيال.',
  'wallet.title':'المحفظة',
  'wallet.sub':'سجل العملات الكامل وتفصيل الرصيد.',
  'wallet.available':'المتاح','wallet.pending':'معلق','wallet.locked':'مقفل',
  'wallet.lifetime':'إجمالي الربح','wallet.spent':'إجمالي الإنفاق',
  'wallet.withdrawn':'إجمالي السحب','wallet.withdrawBtn':'السحب',
  'wallet.topupBtn':'شحن الألعاب','wallet.ledger':'السجل',
  'promo.title':'أكواد الخصم',
  'promo.sub':'استبدل عملات إضافية بأكواد خصم خاصة.',
  'promo.enter':'أدخل رمز الخصم','promo.redeem':'استبدال',
  'promo.hint':'أكواد الخصم محدودة الاستخدام مرة واحدة لكل حساب.',
  'promo.activeCodes':'أكواد خصم نشطة',
  'events.title':'الفعاليات والموسمية',
  'events.sub':'فعاليات محدودة الوقت بمكافآت مضاعفة.',
  'events.active':'فعاليات نشطة','events.upcoming':'فعاليات قادمة',
  'events.past':'فعاليات سابقة',
  'blog.title':'الأخبار والنصائح',
  'blog.sub':'آخر التحديثات والنصائح والإعلانات من ريووردز.',
  'blog.read':'اقرأ المزيد',
  'history.title':'سجل تسجيل الدخول',
  'history.sub':'عرض كل عمليات تسجيل الدخول والمكافآت السابقة.',
  'offline.title':'مكافآت دون اتصال',
  'offline.sub':'حافظ على تتابعك حتى عند تخطي يوم.',
  'more.title':'استكشف المزيد','more.sub':'كل ما قد تحتاجه أيضًا.',
  'auth.logout':'تسجيل الخروج','auth.remember':'تذكرني',
  'auth.forgot':'نسيت كلمة المرور؟','auth.login':'تسجيل الدخول','auth.or':'أو',
  'auth.signup':'إنشاء حساب','auth.hasCode':'لدي رمز إحالة',
  'auth.agree':'أوافق على','auth.terms':'شروط الاستخدام',
  'auth.sendReset':'إرسال رابط إعادة التعيين','auth.back':'رجوع',
  'auth.verifyTitle':'أكد بريدك الإلكتروني',
  'auth.verifySub':'أرسلنا لك رابط تأكيد. تحقق من بريدك.',
  'auth.resend':'إعادة إرسال البريد','auth.iVerified':'لقد أكدت — متابعة',
  'auth.welcome':'مرحبًا بك في ريووردز!',
  'auth.welcomeBack':'مرحبًا بعودتك!',
  'auth.needLogin':'سجّل الدخول لتفعيل جميع الميزات والبدء في الربح.',
  'auth.resetSent':'تم إرسال البريد بنجاح!',
  'popup.cancel':'إلغاء','popup.confirm':'تأكيد',
  'popup.rewardTitle':'مكافأة ربحتها!','popup.awesome':'رائع!',
  'footer.about':'اربح عملات بإتمام العروض واللعب في الألعاب والإجابة عن الاستبيانات ومشاهدة الإعلانات المدفوعة. اسحب أرباحك اليوم.',
  'footer.earn':'اكسب','footer.offers':'العروض','footer.games':'الألعاب',
  'footer.surveys':'الاستبيانات','footer.watch':'شاهد الإعلانات',
  'footer.referral':'الإحالة','footer.account':'الحساب','footer.wallet':'المحفظة',
  'footer.rewards':'متجر المكافآت','footer.transactions':'المعاملات',
  'footer.support':'الدعم','footer.security':'الأمان','footer.legal':'قانوني',
  'footer.terms':'الشروط','footer.privacy':'الخصوصية','footer.faq':'الأسئلة',
  'footer.status':'الحالة','footer.rights':'جميع الحقوق محفوظة.',
  'err.fillAll':'يرجى ملء جميع الحقول',
  'err.insufficient':'عملات غير كافية',
  'err.username':'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
  'err.password':'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
  'err.terms':'يرجى قبول الشروط',
  'err.verifyFirst':'يرجى التحقق من بريدك الإلكتروني أولاً',
  'ledger.signupBonus':'مكافأة التسجيل الترحيبية',
  'ledger.offerComplete':'اكتمل العرض: {n}',
  'ledger.surveyComplete':'اكتمل الاستبيان: {n}',
  'ledger.rewardRedeem':'تم استبدال المكافأة: {n}',
  'ledger.adReward':'إعلان مكافأة',
  'ledger.adBonus':'مكافأة الإعلان اليومية',
  'ledger.interstitial':'مكافأة إعلان بيني',
  'ledger.dailyClaim':'مطالبة يومية · اليوم {n}',
  'ledger.wheel':'مكافأة عجلة الحظ',
  'ledger.scratch':'مكافأة بطاقة الخدش',
  'ledger.mystery':'مكافأة الصندوق الغامض',
  'ledger.treasure':'مكافأة صندوق الكنز',
  'ledger.topup':'شحن لعبة: {g}',
  'ledger.withdrawal':'سحب',
  'ledger.promo':'كود خصم: {n}',
  'notif.offerDone':'اكتمل العرض!',
  'notif.dailyDone':'تمت المطالبة بالمكافأة اليومية!',
  'notif.streak':'سلسلة الأيام:',
  'notif.welcome':'مرحبًا بك في ريووردز!',
  'notif.welcomeBody':'ابدأ ربح العملات بإكمال العروض والألعاب والاستبيانات.',
  'notif.refJoined':'انضم صديق!',
  'notif.joinedUsingYourCode':'انضم باستخدام رمز الإحالة الخاص بك.',
  'account.pending':'بانتظار التحقق',
  'account.restricted':'الحساب مقيد',
  'account.verifyEmail':'تحقق من بريدك الإلكتروني',
  'account.flagged':'قيد المراجعة',
  'account.good':'الحساب سليم',
  'offers.all':'جميع المزودين','offers.viewDetails':'عرض التفاصيل',
  'offers.none':'لا توجد عروض متاحة',
  'offers.noneSub':'عد لاحقًا — عروض جديدة كل يوم.',
  'offers.payout':'المكافأة','offers.minutes':'دقائق',
  'offers.difficulty':'الصعوبة','offers.milestones':'المراحل',
  'offers.howTo':'طريقة الإكمال',
  'offers.stepDefault':'أكمل الإجراء المطلوب ليتم إضافة المكافأة.',
  'offers.start':'ابدأ العرض','offers.imDone':'انتهيت',
  'offers.install':'تثبيت','offers.complete':'أكمل العرض',
  'offers.creditNote':'قد تستغرق المكافأة حتى 5 دقائق لتظهر بعد الإكمال.',
  'offers.confirmTitle':'تأكيد الإكمال',
  'offers.confirmBody':'أنت على وشك الحصول على +{n} عملة لإكمال هذا العرض.',
  'games.none':'لا توجد ألعاب متاحة',
  'games.noneSub':'تُضاف ألعاب جديدة باستمرار.',
  'games.playNow':'العب الآن','games.rating':'التقييم','games.installs':'عمليات التثبيت',
  'surveys.none':'لا توجد استبيانات متاحة','surveys.general':'عام',
  'surveys.min':'دقيقة','surveys.slotsLeft':'مقاعد متبقية','surveys.full':'مكتمل',
  'surveys.start':'ابدأ','surveys.submit':'إرسال والربح',
  'surveys.qualified':'التأهيل',
  'surveys.disqualify':'قد يتم استبعادك إذا لم تتطابق إجاباتك مع الملف المستهدف.',
  'surveys.question':'ما مدى احتمالية أن توصي بتطبيقنا؟',
  'surveys.opt1':'من المحتمل جدًا','surveys.opt2':'محتمل نوعًا ما','surveys.opt3':'غير محتمل',
  'rewards.all':'جميع المكافآت','rewards.from':'من',
  'rewards.outOfStock':'نفد المخزون','rewards.redeem':'استبدال',
  'rewards.none':'لا توجد مكافآت متاحة',
  'rewards.noneSub':'يتم تجديد المكافآت كل أسبوع.',
  'rewards.confirm':'تأكيد الاستبدال',
  'rewards.confirmRedeem':'تأكيد الاستبدال',
  'rewards.cost':'التكلفة','rewards.balance':'رصيدك',
  'rewards.ordered':'تم إرسال الطلب! ستصلك خلال 24 ساعة.',
  'events.joinNow':'انضم الآن','events.none':'لا توجد فعاليات حاليًا',
  'events.noneSub':'تابعنا للاطلاع على الفعاليات الجديدة.',
  'events.title':'تفاصيل الفعالية','events.reward':'إجمالي المكافأة','events.coins':'عملة',
  'blog.none':'لا توجد مقالات بعد','blog.noneSub':'نصائح وأخبار قريبًا.',
  'watch.perAd':'عملة لكل إعلان','watch.done':'انتهيت لليوم',
  'watch.capReached':'تم الوصول للحد اليومي للإعلانات. عد غدًا!',
  'watch.bonusClaimed':'تم المطالبة بالمكافأة اليوم.',
  'daily.claimed':'تم المطالبة لليوم',
  'daily.wheelSpun':'تم تدوير العجلة اليوم',
  'daily.wheelReady':'تدور مرة واحدة يوميًا — حظًا موفقًا!',
  'daily.spinning':'جارٍ التدوير...',
  'daily.scratchDone':'تم استخدام بطاقة الخدش لليوم',
  'daily.scratchReady':'اضغط على البطاقة للخدش!',
  'daily.mysteryDone':'تم فتح الصندوق لليوم',
  'daily.mysteryReady':'اضغط على الصندوق لفتحه!',
  'daily.opening':'جارٍ الفتح...',
  'daily.treasureDone':'تم جمع الكنز لليوم',
  'daily.treasureReady':'اضغط على الصندوق لفتحه!',
  'checkin.done':'تم تسجيل حضور اليوم!',
  'checkin.today':'سجّل حضورك اليوم',
  'checkin.dayStreak':'يوم متتالي',
  'checkin.checkedIn':'تم التسجيل',
  'tasks.none':'لا توجد مهام','tasks.noneSub':'عد لاحقًا.',
  'ch.d1':'شاهد 5 إعلانات','ch.d2':'شاهد 10 إعلانات',
  'ch.w1':'أكمل 5 عروض','ch.w2':'اربح 20,000 عملة',
  'ch.m1':'أكمل 20 عرضًا','ch.m2':'ادعُ 10 أصدقاء',
  'referral.self':'لا يمكنك استخدام كودك الخاص!',
  'referral.already':'لديك راعي بالفعل.',
  'referral.applied':'تم تطبيق كود الإحالة!',
  'referral.noFriends':'لا يوجد أصدقاء بعد',
  'referral.noFriendsSub':'شارك رابطك لبدء الربح.',
  'referral.copied':'تم نسخ الرابط!',
  'referral.shareMsg':'انضم إليّ على Rewords واربح عملات من العروض والألعاب والاستبيانات!',
  'leaderboard.none':'لا يوجد ترتيب بعد',
  'leaderboard.noneSub':'كن أول من يتصدر لوحة المتصدرين!',
  'leaderboard.level':'المستوى','leaderboard.you':'أنت',
  'topup.noGames':'لا توجد ألعاب شحن','topup.noGamesSub':'عد لاحقًا.',
  'topup.selectGameFirst':'اختر اللعبة أولاً',
  'topup.enterPlayerId':'أدخل معرف اللاعب',
  'topup.confirm':'تأكيد الشحن',
  'topup.confirmBody':'شحن {g} ({p}) مقابل {n} عملة؟',
  'topup.success':'تم تقديم طلب الشحن!',
  'topup.successSub':'سنوصلك مشترياتك خلال 24 ساعة.',
  'withdraw.bank':'تحويل بنكي','withdraw.giftcard':'بطاقة هدايا',
  'withdraw.from':'من','withdraw.minLabel':'الحد الأدنى: {n} عملة',
  'withdraw.tooSmall':'الحد الأدنى للسحب هو {n} عملة',
  'withdraw.pendingExists':'لديك عملية سحب قيد المراجعة بالفعل.',
  'withdraw.confirm':'تأكيد السحب',
  'withdraw.confirmBody':'سحب {n} عملة عبر {m}؟',
  'withdraw.requested':'تم طلب السحب',
  'withdraw.requestedSub':'سنراجعه خلال 24-72 ساعة.',
  'withdraw.network':'الشبكة','withdraw.accountName':'اسم الحساب',
  'withdraw.swift':'SWIFT / BIC','withdraw.giftcardType':'نوع بطاقة الهدايا',
  'transactions.none':'لا توجد معاملات بعد',
  'transactions.noneSub':'ابدأ الربح لرؤية سجلك.',
  'notifications.none':'لا توجد إشعارات',
  'notifications.noneSub':'كل شيء محدث!',
  'notifications.clearConfirm':'حذف جميع الإشعارات؟',
  'support.noTickets':'لا توجد تذاكر دعم',
  'support.noTicketsSub':'افتح تذكرة وسنساعدك بسرعة.',
  'support.subject':'الموضوع','support.subjectPh':'صف المشكلة باختصار',
  'support.category':'الفئة','support.message':'الرسالة',
  'support.send':'إرسال التذكرة','support.sent':'تم إرسال التذكرة',
  'support.sentSub':'سيرد فريقنا قريبًا.',
  'profile.saved':'تم تحديث الملف الشخصي بنجاح!',
  'profile.locked':'مقفل','profile.noCountry':'لم يتم تعيين الدولة',
  'profile.unverified':'غير موثق','profile.level':'المستوى',
  'badge.newbie':'مبتدئ','badge.gamer':'لاعب','badge.surveyor':'مستطلِع',
  'badge.earner':'رابح','badge.streaker':'مواظب','badge.inviter':'داعٍ',
  'pf.thisDevice':'هذا الجهاز','pf.currentSession':'الجلسة الحالية',
  'pf.active':'نشط','pf.trusted':'موثوق','pf.noDevices':'لا توجد أجهزة محفوظة',
  'security.verified':'موثق','security.notVerified':'غير موثق',
  'security.today':'اليوم','security.login':'تسجيل دخول',
  'security.currentDevice':'هذا الجهاز',
  'security.twoFaEnabled':'تم تفعيل التحقق بخطوتين!',
  'security.twoFaDisabled':'تم إيقاف التحقق بخطوتين.',
  'security.disable2fa':'إيقاف التحقق بخطوتين؟',
  'security.deleteConfirm':'سيتم حذف حسابك وجميع بياناتك نهائيًا.',
  'security.deleted':'تم حذف الحساب. نأسف لرحيلك!',
  'fraud.low':'مخاطر منخفضة','fraud.medium':'مخاطر متوسطة','fraud.high':'مخاطر عالية',
  'fraud.score':'نقاط الثقة','fraud.level':'مستوى الخطر',
  'fraud.flags':'العلامات','fraud.clean':'لا مشاكل',
  'fraud.noThreats':'لا يوجد نشاط مشبوه على حسابك.',
  'promo.invalid':'كود خاطئ',
  'promo.used':'تم استخدام هذا الكود مسبقًا.',
  'promo.use':'استخدام','promo.none':'لا توجد أكواد',
  'promo.noneSub':'تظهر الأكواد أثناء الفعاليات.',
  'history.none':'لا توجد أرباح مكتملة بعد',
  'history.noneSub':'ستظهر عروضك ومهامك المكتملة هنا.',
  'pw.weak':'ضعيف','pw.medium':'متوسط','pw.strong':'قوي','pw.veryStrong':'قوي جدًا'
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
  const html = document.documentElement;
  if (State.lang === 'ar') {
    html.setAttribute('lang', 'ar');
    html.setAttribute('dir', 'rtl');
    const lbl = el('langToggleLabel');
    if (lbl) lbl.textContent = 'EN';
  } else {
    html.setAttribute('lang', 'en');
    html.setAttribute('dir', 'ltr');
    const lbl = el('langToggleLabel');
    if (lbl) lbl.textContent = 'ع';
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
  const btn = el('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

/* ============================================================================
   8. UTILITIES
============================================================================ */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function el(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNum(n) { return (Number(n) || 0).toLocaleString('en-US'); }
function fmtCoins(n) { return fmtNum(n); }
function coinsToUsd(coins) { return (Number(coins) || 0) / COIN_RATE; }
function usdToCoins(usd) { return Math.round(Number(usd) * COIN_RATE); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function uid() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase(); }

function timeAgo(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
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
  return d.toLocaleDateString(State.lang === 'ar' ? 'ar' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function debounce(fn, ms) {
  let t2;
  return function() {
    const args = arguments;
    clearTimeout(t2);
    t2 = setTimeout(function() { fn.apply(null, args); }, ms || 300);
  };
}

function toast(title, msg, type, dur) {
  type = type || 'info';
  dur = dur || 4000;
  const wrap = el('toastWrap');
  if (!wrap) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const box = document.createElement('div');
  box.className = 'toast ' + type;
  box.innerHTML = '<span class="toast-ico">' + (icons[type] || 'ℹ️') + '</span>' +
    '<div class="toast-body">' +
    '<div class="toast-title">' + esc(title) + '</div>' +
    '<div class="toast-msg">' + esc(msg) + '</div>' +
    '</div><span class="toast-progress"></span>';
  wrap.appendChild(box);
  setTimeout(function() {
    box.classList.add('hide');
    setTimeout(function() { box.remove(); }, 320);
  }, dur);
}

let confirmCallback = null;

function askConfirm(title, body, okLabel, danger) {
  return new Promise(function(resolve) {
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

function openModal(id) {
  const m = el(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = el(id);
  if (m) m.classList.remove('open');
}

function openGenericModal(title, html) {
  el('genericModalTitle').textContent = title;
  el('genericModalBody').innerHTML = html;
  openModal('genericModal');
}

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
    setTimeout(function() { c.remove(); }, 5200);
  }
}

function showRewardPopup(amount, msg) {
  el('rewardPopupAmount').textContent = '+' + fmtNum(amount);
  el('rewardPopupMsg').textContent = msg || '';
  openModal('rewardPopup');
  celebrate();
}

let unlockTimer = null;
function showUnlock(ico, title, sub) {
  el('unlockIco').textContent = ico || '🏅';
  el('unlockTitle').textContent = title;
  el('unlockSub').textContent = sub || '';
  const b = el('unlockBanner');
  b.classList.add('show');
  clearTimeout(unlockTimer);
  unlockTimer = setTimeout(function() { b.classList.remove('show'); }, 3200);
}

function animateNumber(elId, target, suffix) {
  const node = el(elId);
  if (!node) return;
  suffix = suffix || '';
  const dur = 800;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = fmtNum(Math.round(target * eased)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function copyText(text) {
  return new Promise(function(resolve) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        resolve(true);
      }).catch(function() {
        resolve(false);
      });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        resolve(true);
      } catch (e) { resolve(false); }
    }
  });
}

function buildRefLink() {
  if (!State.user) return '';
  const base = State.settings.siteUrl || location.origin + location.pathname;
  return base + '?ref=' + ((State.profile && State.profile.referralCode) || '');
}

/* ============================================================================
   9. DEVICE FINGERPRINT & FRAUD
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
  const emus = ['BlueStacks', 'NoxPlayer', 'MemuPlay', 'LDPlayer', 'Genymotion', 'MEmu', 'Andy'];
  return emus.some(function(e) { return ua.includes(e); });
}

function getClientIP() {
  return fetch('https://api.ipify.org?format=json')
    .then(function(r) { return r.json(); })
    .then(function(d) { return d.ip || ''; })
    .catch(function() { return ''; });
}

/* ============================================================================
   10. AUTH SYSTEM
============================================================================ */
function initAuthUI() {
  const loginForm = el('loginForm');
  const signupForm = el('signupForm');
  const forgotForm = el('forgotForm');

  el('authModalClose').addEventListener('click', function() { closeModal('authModal'); });

  el('forgotPwLink').addEventListener('click', function(e) {
    e.preventDefault();
    switchAuthPane('forgot');
  });

  el('forgotBackBtn').addEventListener('click', function() { switchAuthPane('login'); });

  el('authTabLogin').addEventListener('click', function() { switchAuthPane('login'); });
  el('authTabSignup').addEventListener('click', function() { switchAuthPane('signup'); });

  $$('[data-toggle-pw]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const inp = el(btn.getAttribute('data-toggle-pw'));
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });
  });

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = el('loginEmail').value.trim();
    const pw = el('loginPassword').value;
    if (!email || !pw) return toast(t('auth.login'), t('err.fillAll'), 'warning');
    const btn = el('loginBtnSubmit');
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await auth.signInWithEmailAndPassword(email, pw);
      closeModal('authModal');
      toast(t('auth.login'), t('auth.welcomeBack'), 'success');
    } catch (err) {
      toast(t('auth.login'), err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });

  el('signupPassword').addEventListener('input', function() {
    updateStrength(el('signupPassword').value);
  });

  signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = el('signupUsername').value.trim();
    const email = el('signupEmail').value.trim();
    const pw = el('signupPassword').value;
    if (!username || username.length < 3) return toast(t('auth.signup'), t('err.username'), 'warning');
    if (pw.length < 8) return toast(t('auth.signup'), t('err.password'), 'warning');
    if (!el('signupTerms').checked) return toast(t('auth.signup'), t('err.terms'), 'warning');
    const btn = el('signupBtnSubmit');
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pw);
      const referralCode = el('signupReferral').checked ? el('signupReferralCode').value.trim().toUpperCase() : '';
      await createUserProfile(cred.user, username, referralCode);
      try { await cred.user.sendEmailVerification(); } catch (e2) {}
      closeModal('authModal');
      toast(t('auth.signup'), t('auth.welcome'), 'success');
      showRewardPopup(State.settings.signupBonus || 100, t('auth.signupBonusMsg') || '');
    } catch (err) {
      toast(t('auth.signup'), err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });

  forgotForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = el('forgotEmail').value.trim();
    if (!email) return;
    const btn = el('forgotBtnSubmit');
    btn.disabled = true;
    try {
      await auth.sendPasswordResetEmail(email);
      toast(t('auth.sendReset'), t('auth.resetSent'), 'success');
      switchAuthPane('login');
    } catch (err) {
      toast(t('auth.sendReset'), err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  el('googleLoginBtn').addEventListener('click', googleSignIn);

  el('verifyCloseBtn').addEventListener('click', function() {
    if (auth.currentUser && auth.currentUser.emailVerified) {
      closeModal('authModal');
    } else {
      toast(t('auth.verifyTitle'), t('err.verifyFirst'), 'warning');
    }
  });

  el('resendVerifyBtn').addEventListener('click', async function() {
    if (auth.currentUser) {
      try { await auth.currentUser.sendEmailVerification(); } catch (e2) {}
      toast(t('auth.resend'), t('auth.resetSent'), 'success');
    }
  });

  el('verifyContinueBtn').addEventListener('click', async function() {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        closeModal('verifyModal');
        closeModal('authModal');
        toast(t('auth.verifyTitle'), t('security.verified'), 'success');
        renderPage(State.currentPage);
      } else {
        toast(t('auth.verifyTitle'), t('err.verifyFirst'), 'warning');
      }
    }
  });

  el('signupReferral').addEventListener('change', function() {
    el('referralCodeWrap').classList.toggle('hidden', !this.checked);
  });
}

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
    claimedDays: [],
    streakFreezes: 0,
    status: 'active',
    accountStatus: 'active',
    verification: { email: !!user.emailVerified, phone: false, identity: false, twoFa: false },
    fraudScore: 0,
    flags: [],
    devices: [getDeviceFingerprint()],
    offersCompleted: 0,
    surveysCompleted: 0,
    adsWatchedToday: 0,
    adsDate: todayKey(),
    wheelSpunDate: '',
    scratchDate: '',
    scratchReward: 0,
    mysteryDate: '',
    treasureDate: '',
    adBonusDate: '',
    usedPromos: [],
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    totalWithdrawn: 0,
    referralEarned: 0,
    referralCount: 0
  };
  await colRef('users').doc(user.uid).set(data);
  State.profile = data;

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
        await colRef('users').doc(ref.id).update({ referralCount: increment(1) });
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

  await colRef('notifications').add({
    uid: user.uid,
    type: 'welcome',
    title: t('notif.welcome'),
    body: t('notif.welcomeBody'),
    read: false,
    createdAt: serverTimestamp()
  });

  await addLedger(user.uid, 'signup', t('ledger.signupBonus'), State.settings.signupBonus || 100, 'completed', { ref: 'SIGNUP' });
  return data;
}

/* ============================================================================
   11. LEDGER SYSTEM (wallet core)
============================================================================ */
async function addLedger(uidVal, type, desc, coins, status, meta) {
  status = status || 'completed';
  meta = meta || {};
  const entry = {
    uid: uidVal,
    type: type,
    description: desc,
    coins: Math.round(coins),
    status: status,
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
  const list = [];
  try {
    const snap = await colRef('ledger').where('uid', '==', uidVal).orderBy('createdAt', 'desc').limit(500).get();
    snap.forEach(function(d) {
      const e = d.data();
      e.id = d.id;
      list.push(e);
      const c = e.coins || 0;
      if (e.status === 'pending' && c > 0) pending += c;
      else if (e.status === 'locked' && c > 0) locked += c;
      else if (e.status === 'completed') {
        if (e.type === 'withdrawal' && c < 0) withdrawn += Math.abs(c);
        if (c > 0) { coins += c; earned += c; }
        else { coins += c; spent += Math.abs(c); }
      }
    });
  } catch (e) {
    console.warn('computeWallet error', e);
  }
  coins = Math.max(0, coins);
  return {
    coins: Math.floor(coins),
    pending: Math.floor(pending),
    locked: Math.floor(locked),
    earned: Math.floor(earned),
    spent: Math.floor(spent),
    withdrawn: Math.floor(withdrawn),
    list: list
  };
}

/* ============================================================================
   12. DATA LOADING
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
  function getCol(name) {
    return colRef(name).get().then(function(s) {
      return s.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    }).catch(function() { return []; });
  }
  const results = await Promise.all([
    getCol('offers'), getCol('games'), getCol('surveys'), getCol('rewards'),
    getCol('providers'), getCol('faqs'), getCol('events'), getCol('promos'), getCol('posts')
  ]);
  State.offers = results[0].filter(function(o) { return o.active !== false; });
  State.games = results[1].filter(function(g) { return g.active !== false; });
  State.surveys = results[2].filter(function(s) { return s.active !== false; });
  State.rewards = results[3].filter(function(r) { return r.active !== false; });
  State.providers = results[4].filter(function(p) { return p.active !== false; });
  State.faqs = results[5];
  State.events = results[6];
  State.promos = results[7];
  State.posts = results[8];
}

/* ============================================================================
   13. NAVIGATION
============================================================================ */
const PAGES = ['home','earn','offers','games','surveys','watch','daily','tasks',
  'challenges','checkin','streaks','referral','leaderboard','rewards','topup',
  'withdraw','transactions','notifications','support','profile','security','faq',
  'terms','privacy','antifraud','wallet','promo','events','blog','article',
  'history','offlinerewards','more'];

function navigate(page) {
  State.currentPage = page;
  PAGES.forEach(function(p) {
    const sec = el('page-' + p);
    if (sec) sec.classList.toggle('active', p === page);
  });
  $$('[data-nav]').forEach(function(a) {
    a.classList.toggle('active', a.getAttribute('data-nav') === page);
  });
  $$('.mobile-nav .mn-item').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-nav') === page);
  });
  const drawer = el('drawer');
  if (drawer) drawer.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const requiresAuth = ['wallet','withdraw','topup','transactions','notifications',
    'profile','security','referral','history','offlinerewards','checkin','streaks',
    'challenges','tasks','daily','watch'];
  if (requiresAuth.includes(page) && !State.user) {
    openModal('authModal');
    return;
  }
  renderPage(page);
}

function renderPage(page) {
  const renderers = {
    home: renderHome, earn: renderEarn, offers: renderOffers, games: renderGames,
    surveys: renderSurveys, watch: renderWatch, daily: renderDaily, tasks: renderTasks,
    challenges: renderChallenges, checkin: renderCheckin, streaks: renderStreaks,
    referral: renderReferral, leaderboard: renderLeaderboard, rewards: renderRewards,
    topup: renderTopup, withdraw: renderWithdraw, transactions: renderTransactions,
    notifications: renderNotifications, support: renderSupport, profile: renderProfile,
    security: renderSecurity, faq: renderFaq, terms: renderTerms, privacy: renderPrivacy,
    antifraud: renderAntifraud, wallet: renderWallet, promo: renderPromo,
    events: renderEvents, blog: renderBlog, history: renderHistory,
    offlinerewards: renderOfflineRewards, more: renderMore
  };
  if (renderers[page]) renderers[page]();
}

function initNavigation() {
  document.addEventListener('click', function(e) {
    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.preventDefault();
      navigate(navEl.getAttribute('data-nav'));
    }
  });
  el('hamburger').addEventListener('click', function() {
    el('drawer').classList.add('open');
  });
  el('drawerScrim').addEventListener('click', function() {
    el('drawer').classList.remove('open');
  });
  el('toTopBtn').addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', function() {
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

function skeletonGrid(container, n) {
  const box = typeof container === 'string' ? el(container) : container;
  if (!box) return;
  let html = '';
  n = n || 4;
  for (let i = 0; i < n; i++) {
    html += '<div class="card"><div class="skeleton-line" style="height:90px"></div>' +
      '<div class="skeleton-line w-70"></div><div class="skeleton-line w-40"></div></div>';
  }
  box.innerHTML = html;
}

function guardAuth() {
  if (State.user && State.profile) return true;
  openModal('authModal');
  return false;
}

async function updateBalanceUI() {
  if (!State.user) return;
  try {
    State.wallet = await computeWallet(State.user.uid);
  } catch (e) { return; }
  const w = State.wallet || { coins: 0, pending: 0, locked: 0, earned: 0, spent: 0, withdrawn: 0 };
  function set(id, v) {
    const x = el(id);
    if (x) x.textContent = v;
  }
  set('homeBalance', fmtCoins(w.coins));
  set('homePending', fmtCoins(w.pending));
  set('homeLifetime', fmtCoins(w.earned));
  const pf = State.profile || {};
  set('homeStreak', pf.streak || 0);
  set('topupCoinBalance', fmtCoins(w.coins));
  set('wdAvailable', fmtCoins(w.coins));
  set('wdPending', fmtCoins(w.pending));
  const conv = el('wdConvertHint');
  if (conv) conv.textContent = fmtCoins(State.settings.coinRate || 10000) + ' coins = $1.00';
  const min = el('wdMin');
  if (min) min.textContent = t('withdraw.minLabel').replace('{n}', fmtCoins(State.settings.minWithdraw || 10000));
  set('wtAvailable', fmtCoins(w.coins));
  set('wtPending', fmtCoins(w.pending));
  set('wtLocked', fmtCoins(w.locked));
  set('wtLifetime', fmtCoins(w.earned));
  set('wtSpent', fmtCoins(w.spent));
  set('wtWithdrawn', fmtCoins(w.withdrawn));
  set('pfBalance', fmtCoins(w.coins));
  set('pfLifetime', fmtCoins(w.earned));
  set('pfOffers', pf.offersCompleted || 0);
  set('pfWithdrawn', '$' + ((w.withdrawn || 0) / (State.settings.coinRate || 10000)).toFixed(2));
  const pill = el('navBalanceText');
  if (pill) pill.textContent = fmtCoins(w.coins);
  const pillWrap = el('navBalance');
  if (pillWrap) pillWrap.style.display = 'flex';
}

/* ============================================================================
   15. CARD BUILDERS
============================================================================ */
function offerCardHtml(o, idx) {
  const delay = (idx % 6) * 60;
  const payout = o.payout || o.reward || 0;
  const devices = (o.devices && o.devices.length) ? '<span class="text-xs text-muted">' + o.devices.join(' · ') + '</span>' : '';
  return '<div class="card offer-card reveal" style="animation-delay:' + delay + 'ms">' +
    '<div class="offer-top">' +
    '<div class="offer-logo" style="background:' + (o.color || 'var(--grad-primary)') + '">' + (o.icon || '🎯') + '</div>' +
    '<div><div class="offer-name">' + esc(o.title) + '</div>' +
    '<div class="text-xs text-muted">' + esc(o.provider || '') + '</div></div>' +
    '</div>' +
    '<div class="text-sm text-muted">' + esc(o.description || '') + '</div>' +
    '<div class="flex items-center justify-between mt-2">' +
    '<div class="offer-reward">🪙 +' + fmtNum(payout) + '</div>' + devices + '</div>' +
    '<button class="btn btn-accent btn-sm btn-block mt-3" data-action="openOffer" data-id="' + o.id + '">' + t('offers.viewDetails') + ' →</button>' +
    '</div>';
}

function gameCardHtml(g, idx) {
  const delay = (idx % 6) * 60;
  const ms = (g.milestones && g.milestones.length) ? g.milestones.map(function(m) {
    return '<div class="milestone"><span class="ms-ico">' + (m.icon || '🎯') + '</span>' +
      '<div class="ms-body"><div class="ms-title">' + esc(m.label) + '</div></div>' +
      '<div class="ms-reward">+' + fmtNum(m.reward || 0) + '</div></div>';
  }).join('') : '';
  return '<div class="card game-card reveal" style="animation-delay:' + delay + 'ms">' +
    '<div class="game-cover" style="background:' + (g.color || 'var(--grad-primary)') + '">' + (g.icon || '🎮') + '</div>' +
    '<div class="font-bold">' + esc(g.title) + '</div>' +
    '<div class="text-xs text-muted">' + esc(g.platform || '') + ' · ' + esc(g.category || '') + '</div>' +
    (g.rating ? '<div class="text-xs mt-1">⭐ ' + g.rating + ' · ' + fmtNum(g.installs || 0) + '</div>' : '') +
    '<div class="game-milestones">' + ms + '</div>' +
    '<button class="btn btn-primary btn-sm btn-block mt-3" data-action="openGame" data-id="' + g.id + '">' + t('games.playNow') + ' →</button>' +
    '</div>';
}

function surveyCardHtml(s, idx) {
  const delay = (idx % 6) * 60;
  const reward = s.reward || s.payout || 0;
  const slotsLeft = s.slotsLeft != null ? s.slotsLeft : 10;
  return '<div class="card survey-card reveal" style="animation-delay:' + delay + 'ms">' +
    '<div class="sv-icon">📋</div>' +
    '<div class="sv-title">' + esc(s.title) + '</div>' +
    '<div class="text-xs text-muted">' + esc(s.category || t('surveys.general')) + '</div>' +
    '<div class="sv-meta">' +
    '<span class="sv-chip">⏱️ ' + (s.minutes || 5) + ' ' + t('surveys.min') + '</span>' +
    '<span class="sv-chip">⭐ ' + (s.rating || '4.5') + '</span>' +
    '<span class="sv-chip coin-t">+' + fmtNum(reward) + '</span>' +
    '</div>' +
    '<div class="survey-progress"><div class="sp-fill" style="width:' + (slotsLeft > 0 ? '30%' : '100%') + '"></div></div>' +
    '<div class="flex items-center justify-between mt-2">' +
    '<span class="text-xs ' + (slotsLeft > 0 ? 'text-muted' : 'text-danger') + '">' + (slotsLeft > 0 ? (slotsLeft + ' ' + t('surveys.slotsLeft')) : t('surveys.full')) + '</span>' +
    '<button class="btn btn-sm ' + (slotsLeft > 0 ? 'btn-success' : 'btn-ghost') + '" data-action="openSurvey" data-id="' + s.id + '">' + t('surveys.start') + '</button>' +
    '</div></div>';
}

function rewardCardHtml(r, idx) {
  const delay = (idx % 6) * 60;
  return '<div class="card reward-card reveal" style="animation-delay:' + delay + 'ms">' +
    '<div class="rw-logo" style="background:' + (r.color || 'var(--grad-success)') + '">' + (r.icon || '🎁') + '</div>' +
    '<div class="rw-name">' + esc(r.title) + '</div>' +
    '<div class="rw-sub">' + esc(r.category || '') + '</div>' +
    '<div class="rw-from">' + t('rewards.from') + ' <b class="coin-t">' + fmtNum(r.price || 0) + ' 🪙</b></div>' +
    '<button class="btn btn-sm btn-block mt-2 ' + ((r.stock <= 0) ? 'btn-ghost' : 'btn-accent') + '" data-action="openReward" data-id="' + r.id + '" ' + ((r.stock <= 0) ? 'disabled' : '') + '>' + ((r.stock <= 0) ? t('rewards.outOfStock') : t('rewards.redeem')) + '</button>' +
    '</div>';
}

function txItemHtml(e) {
  const plus = (e.coins || 0) >= 0;
  const ico = plus ? '✅' : '💸';
  const icoBg = plus ? 'rgba(0,230,118,.14)' : 'rgba(255,61,113,.14)';
  const statusBadge = e.status === 'pending' ? '<span class="badge badge-warning">⏳</span>' : (e.status === 'locked' ? '<span class="badge badge-info">🔒</span>' : '');
  const time = e.createdAt ? timeAgo(e.createdAt) : '';
  return '<div class="ledger-item">' +
    '<span class="lg-ico" style="background:' + icoBg + '">' + ico + '</span>' +
    '<div class="lg-body"><div class="lg-title">' + esc(e.description || '') + '</div>' +
    '<div class="lg-sub">' + esc(e.reference || '') + (time ? ' · ' + time : '') + '</div></div>' +
    statusBadge +
    '<div class="lg-amount ' + (plus ? 'lg-plus' : 'lg-minus') + '">' + (plus ? '+' : '') + fmtNum(e.coins || 0) + '</div>' +
    '</div>';
}

function notifItemHtml(n) {
  const icoMap = { referral: '👥', offer: '🎯', game: '🎮', survey: '📋', daily: '🎁', withdrawal: '💵', welcome: '🎉', promo: '🎟️', ad: '📺', reward: '🎁' };
  const ico = icoMap[n.type] || '🔔';
  const time = n.createdAt ? timeAgo(n.createdAt) : '';
  return '<div class="notif-item ' + (n.read ? '' : 'unread') + '" data-id="' + n.id + '" data-action="markNotif">' +
    '<span class="nt-ico">' + ico + '</span>' +
    '<div class="nt-body"><div class="nt-title">' + esc(n.title || '') + '</div>' +
    '<div class="nt-sub">' + esc(n.body || '') + '</div>' +
    '<div class="nt-time">' + time + '</div></div>' +
    '<span class="nt-dot"></span></div>';
}

/* ============================================================================
   16. PAGE RENDERERS
============================================================================ */
async function renderHome() {
  if (!State.catalogLoaded) {
    await loadCatalog();
    State.catalogLoaded = true;
  }
  // Stats
  animateNumber('heroStatUsers', 12000 + Math.floor(Math.random() * 5000), '+');
  animateNumber('heroStatPaid', 42000, '$');
  animateNumber('heroStatCoins', 8900000);
  // Ticker
  renderTicker();
  renderAccountStatusStrip();
  updateBalanceUI();
  // Daily CTA
  const pf = State.profile || {};
  const dcard = el('dailyCtaCard');
  if (dcard) dcard.classList.toggle('hidden', !State.user);
  // Top offers
  const topOffers = State.offers.slice().sort(function(a, b) { return (b.payout || 0) - (a.payout || 0); }).slice(0, 4);
  const topGrid = el('topOffersGrid');
  if (topGrid) topGrid.innerHTML = topOffers.length ? topOffers.map(offerCardHtml).join('') : '<div class="card text-center text-muted p-4">' + t('offers.none') + '</div>';
  // Top games
  const topGames = State.games.slice().sort(function(a, b) { return (b.installs || 0) - (a.installs || 0); }).slice(0, 4);
  const tgGrid = el('topGamesGrid');
  if (tgGrid) tgGrid.innerHTML = topGames.length ? topGames.map(gameCardHtml).join('') : '<div class="card text-center text-muted p-4">' + t('games.none') + '</div>';
  // Popular rewards
  const popRewards = State.rewards.slice().sort(function(a, b) { return (a.price || 0) - (b.price || 0); }).slice(0, 4);
  const prGrid = el('popularRewardsGrid');
  if (prGrid) prGrid.innerHTML = popRewards.length ? popRewards.map(rewardCardHtml).join('') : '<div class="card text-center text-muted p-4">' + t('rewards.none') + '</div>';
  // Best surveys
  const bestSurveys = State.surveys.slice().sort(function(a, b) { return (b.reward || 0) - (a.reward || 0); }).slice(0, 3);
  const bsGrid = el('bestSurveysGrid');
  if (bsGrid) bsGrid.innerHTML = bestSurveys.length ? bestSurveys.map(surveyCardHtml).join('') : '<div class="card text-center text-muted p-4">' + t('surveys.none') + '</div>';
  // Active events
  const events = State.events.filter(function(ev) { return ev.active !== false; }).slice(0, 3);
  const evGrid = el('activeEventsGrid');
  if (evGrid) evGrid.innerHTML = events.length ? events.map(function(ev) {
    return '<div class="card event-card reveal"><div class="ev-badge">' + (ev.icon || '🎉') + '</div>' +
      '<div class="ev-name">' + esc(ev.title) + '</div><div class="ev-sub">' + esc(ev.subtitle || '') + '</div>' +
      '<div class="ev-date">📅 ' + esc(ev.endsAt || '') + '</div>' +
      '<button class="btn btn-sm btn-accent btn-block mt-2" data-action="openEvent" data-id="' + ev.id + '">' + t('events.joinNow') + '</button></div>';
  }).join('') : emptyState(evGrid, '🎉', t('events.none'), t('events.noneSub'));
  // Game showcase horizontal scroll
  const showcase = el('gameShowcaseScroll');
  if (showcase) showcase.innerHTML = State.games.slice(0, 8).map(function(g) {
    return '<div class="card" style="min-width:180px;text-align:center">' +
      '<div style="font-size:2rem">' + (g.icon || '🎮') + '</div>' +
      '<div class="font-bold text-sm">' + esc(g.title) + '</div>' +
      '<div class="text-xs coin-t">+' + fmtNum(g.payout || 0) + '</div></div>';
  }).join('');
  // FAQ preview
  const faqList = el('homeFaqList');
  if (faqList) {
    const faqs = State.faqs.slice(0, 4);
    faqList.innerHTML = faqs.map(function(f) {
      return '<div class="faq-item"><button class="faq-q" data-action="toggleFaq">' + esc(f.q) + '<span class="faq-ico">＋</span></button>' +
        '<div class="faq-a"><div class="faq-a-inner">' + esc(f.a) + '</div></div></div>';
    }).join('');
  }
  // Recently completed
  const rc = el('recentlyCompletedList');
  if (rc) {
    if (State.wallet && State.wallet.list && State.wallet.list.length) {
      rc.innerHTML = State.wallet.list.filter(function(e) { return e.coins > 0; }).slice(0, 5).map(txItemHtml).join('');
    } else {
      emptyState(rc, '✅', t('history.none'), t('history.noneSub'));
    }
  }
  // Top users (fake for demo)
  const tu = el('topUsersList');
  if (tu) {
    const fakeUsers = [
      { name: 'Ahmed R.', coins: 12450 }, { name: 'Sarah K.', coins: 10200 },
      { name: 'Mohammed A.', coins: 8750 }, { name: 'Lina T.', coins: 7300 }
    ];
    tu.innerHTML = fakeUsers.map(function(u, i) {
      const medals = ['🥇', '🥈', '🥉'];
      return '<div class="lb-row"><div class="lb-rank">' + (medals[i] || (i + 1)) + '</div>' +
        '<div class="lb-ava">' + u.name.charAt(0) + '</div>' +
        '<div class="lb-body"><div class="lb-name">' + u.name + '</div></div>' +
        '<div class="lb-xp">🪙 ' + fmtNum(u.coins) + '</div></div>';
    }).join('');
  }
}

function renderTicker() {
  const names = ['Sarah', 'Mohammed', 'Ahmed', 'Lina', 'Omar', 'Yusuf', 'Aya', 'Karim'];
  const track = el('tickerTrack');
  if (!track) return;
  const items = [];
  for (let i = 0; i < 8; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const coins = (Math.floor(Math.random() * 40) + 3) * 100;
    items.push('<span class="ticker-item">🎉 <b>' + name + '</b> just earned <span class="coin-t">' + fmtNum(coins) + '</span> coins</span>');
  }
  track.innerHTML = items.join('');
}

function renderAccountStatusStrip() {
  const strip = el('accountStatusStrip');
  if (!strip) return;
  const pf = State.profile || {};
  if (!State.user) {
    strip.innerHTML = '<div class="alert alert-info"><span class="a-ico">💡</span><div class="a-body"><div class="a-title">' + t('auth.needLogin') + '</div></div>' +
      '<button class="btn btn-accent btn-sm" data-action="openAuth">' + t('auth.login') + '</button></div>';
    return;
  }
  const chunks = [];
  if (!(pf.verification && pf.verification.email)) chunks.push('<span class="badge badge-info">📧 ' + t('account.verifyEmail') + '</span>');
  if ((pf.fraudScore || 0) > 60) chunks.push('<span class="badge badge-danger">🛡️ ' + t('account.flagged') + '</span>');
  if (!chunks.length) chunks.push('<span class="badge badge-success">✅ ' + t('account.good') + '</span>');
  strip.innerHTML = '<div class="flex wrap gap-2">' + chunks.join('') + '</div>';
}

async function renderEarn() {
  if (!State.user) { guardAuth(); return; }
  if (!State.catalogLoaded) { await loadCatalog(); State.catalogLoaded = true; }
  updateBalanceUI();
  const offers = State.offers.slice(0, 6);
  const grid = el('earnOffersGrid');
  if (grid) grid.innerHTML = offers.length ? offers.map(offerCardHtml).join('') : emptyState(grid, '🎯', t('offers.none'), t('offers.noneSub'));
  const sponsor = el('sponsoredTasksList');
  if (sponsor) {
    const tasks = State.offers.slice(0, 3);
    sponsor.innerHTML = tasks.length ? tasks.map(function(o) {
      return '<div class="ch-track-item"><div class="ct-ico">' + (o.icon || '🎯') + '</div>' +
        '<div class="ct-body"><div class="ct-title">' + esc(o.title) + '</div><div class="ct-sub">' + esc(o.description || '') + '</div></div>' +
        '<div class="ct-reward">+' + fmtNum(o.payout || 0) + '</div></div>';
    }).join('') : emptyState(sponsor, '🎯', t('tasks.none'), t('tasks.noneSub'));
  }
  const adList = el('adOpportunitiesList');
  if (adList) {
    const cap = State.settings.adDailyCap || 15;
    const used = (State.profile && State.profile.adsWatchedToday) || 0;
    const left = Math.max(0, cap - used);
    adList.innerHTML = '<div class="card ad-rew reveal"><div class="play-ring">📺</div>' +
      '<div class="font-black">' + t('watch.rewVideoTitle') + '</div>' +
      '<div class="text-xs text-muted mb-2">+' + fmtNum(State.settings.adReward || 120) + ' ' + t('watch.perAd') + ' · ' + left + ' left</div>' +
      '<button class="btn btn-accent btn-sm" data-action="watchAd">' + t('watch.watchNow') + '</button></div>';
  }
}

async function renderOffers() {
  if (!State.catalogLoaded) { await loadCatalog(); State.catalogLoaded = true; }
  const offers = State.offers;
  const tabs = el('providerTabs');
  if (tabs) {
    const provs = ['all'];
    offers.forEach(function(o) {
      if (o.provider && provs.indexOf(o.provider) === -1) provs.push(o.provider);
    });
    tabs.innerHTML = provs.slice(0, 6).map(function(p, i) {
      return '<button class="tab ' + (i === 0 ? 'active' : '') + '" data-provider="' + esc(p) + '">' + (p === 'all' ? t('offers.all') : esc(p)) + '</button>';
    }).join('');
    tabs.querySelectorAll('[data-provider]').forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.querySelectorAll('[data-provider]').forEach(function(x) { x.classList.remove('active'); });
        tab.classList.add('active');
        filterOffers(tab.getAttribute('data-provider'));
      });
    });
  }
  filterOffers('all');
}

function filterOffers(provider) {
  const grid = el('offersGrid');
  if (!grid) return;
  let list = State.offers;
  if (provider !== 'all') list = list.filter(function(o) { return o.provider === provider; });
  grid.innerHTML = list.length ? list.map(offerCardHtml).join('') : emptyState(grid, '🎯', t('offers.none'), t('offers.noneSub'));
}

async function renderGames() {
  if (!State.catalogLoaded) { await loadCatalog(); State.catalogLoaded = true; }
  const grid = el('gamesGrid');
  if (grid) grid.innerHTML = State.games.length ? State.games.map(gameCardHtml).join('') : emptyState(grid, '🎮', t('games.none'), t('games.noneSub'));
}

async function renderSurveys() {
  if (!State.catalogLoaded) { await loadCatalog(); State.catalogLoaded = true; }
  const grid = el('surveysGrid');
  if (grid) grid.innerHTML = State.surveys.length ? State.surveys.map(surveyCardHtml).join('') : emptyState(grid, '📋', t('surveys.none'), t('surveys.noneSub'));
}

async function renderWatch() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const pf = State.profile || {};
  const cap = State.settings.adDailyCap || 15;
  const used = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  const left = Math.max(0, cap - used);
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('watchCount', used);
  set('watchRemaining', left);
  set('watchEarnedToday', fmtNum(used * (State.settings.adReward || 120)));
  const hint = el('watchHint');
  if (hint) hint.textContent = '+' + fmtNum(State.settings.adReward || 120) + ' ' + t('watch.perAd');
  const btn = el('watchAdBtn');
  if (btn) {
    btn.disabled = left <= 0;
    btn.innerHTML = left <= 0 ? '⏳ ' + t('watch.done') : '🎬 ' + t('watch.watchNow');
  }
}

async function renderDaily() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const streak = pf.streak || 0;
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('dailyStreakNum', streak);
  set('dailyBonusMult', 'x' + (streak >= 7 ? 2 : streak >= 4 ? 1.5 : 1));
  // Daily grid
  const grid = el('dailyGrid');
  if (grid) {
    grid.innerHTML = DAILY_PLAN.map(function(r, i) {
      const day = i + 1;
      const claimedDays = pf.claimedDays || [];
      const claimed = claimedDays.indexOf(day) !== -1;
      const todayDay = ((streak % 7) + 1);
      const isToday = day === todayDay && !claimed;
      let cls = 'day-cell';
      if (claimed) cls += ' claimed';
      if (isToday) cls += ' today';
      return '<div class="' + cls + '"><span class="day-num">' + day + '</span>' +
        '<span class="day-reward">+' + fmtNum(r.reward) + '</span>' +
        '<span class="day-label">' + t('daily.day') + '</span>' +
        (claimed ? '<span class="check-mark">✓</span>' : '') + '</div>';
    }).join('');
  }
  // Claim button
  const claimBtn = el('dailyClaimBtn');
  if (claimBtn) {
    const done = pf.lastClaimDate === todayKey();
    claimBtn.disabled = done;
    claimBtn.innerHTML = done ? '✅ ' + t('daily.claimed') : '🎁 ' + t('daily.claim');
  }
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
  // Build wheel
  const wheel = el('spinWheel');
  if (wheel && !wheel.dataset.built) {
    wheel.dataset.built = '1';
    wheel.innerHTML = WHEEL_SLICES.map(function(s, i) {
      const deg = i * 45;
      return '<div class="wedge" style="background:' + s.color + ';transform:rotate(' + deg + 'deg) skewY(45deg)"><span class="wl">+' + s.reward + '</span></div>';
    }).join('');
  }
}

function renderScratchState() {
  const st = el('scratchStatus');
  const cover = el('scratchCover');
  const result = el('scratchResult');
  if (!cover) return;
  const used = (State.profile && State.profile.scratchDate) === todayKey();
  if (used) {
    cover.style.display = 'none';
    if (result) result.textContent = '+' + fmtNum((State.profile && State.profile.scratchReward) || 0);
    if (st) st.textContent = t('daily.scratchDone');
  } else {
    cover.style.display = '';
    if (result) result.textContent = '+0';
    if (st) st.textContent = t('daily.scratchReady');
  }
}

function renderMysteryState() {
  const st = el('mysteryStatus');
  const box = el('mysteryBox');
  if (!box) return;
  const used = (State.profile && State.profile.mysteryDate) === todayKey();
  box.textContent = used ? '🎉' : '🎁';
  box.classList.toggle('opened', used);
  if (st) st.textContent = used ? t('daily.mysteryDone') : t('daily.mysteryReady');
}

function renderTreasureState() {
  const st = el('treasureStatus');
  const chest = el('treasureChest');
  if (!chest) return;
  const used = (State.profile && State.profile.treasureDate) === todayKey();
  chest.textContent = used ? '💎' : '🏴‍☠️';
  chest.classList.toggle('opened', used);
  if (st) st.textContent = used ? t('daily.treasureDone') : t('daily.treasureReady');
}

async function renderTasks() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const grid = el('tasksGrid');
  if (!grid) return;
  const ads = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  const dailyTasks = [
    { ico: '✅', title: t('tasks.t1'), sub: t('tasks.t1Sub'), reward: 10, done: true, pct: 100 },
    { ico: '📺', title: t('tasks.t2'), sub: ads + '/3', reward: 150, done: ads >= 3, pct: Math.min(100, (ads / 3) * 100) },
    { ico: '🎯', title: t('tasks.t3'), sub: (pf.offersCompleted || 0) + '/1', reward: 300, done: (pf.offersCompleted || 0) >= 1, pct: Math.min(100, (pf.offersCompleted || 0) * 100) }
  ];
  grid.innerHTML = '<div class="grid grid-2" style="grid-column:1/-1">' +
    dailyTasks.map(function(tsk) {
      return '<div class="ch-track-item' + (tsk.done ? ' done' : '') + '">' +
        '<div class="ct-ico">' + (tsk.done ? '✅' : tsk.ico) + '</div>' +
        '<div class="ct-body"><div class="ct-title">' + tsk.title + '</div><div class="ct-sub">' + tsk.sub + '</div></div>' +
        '<div class="ct-reward">+' + fmtNum(tsk.reward) + '</div>' +
        '<div class="ct-progress"><span style="width:' + tsk.pct + '%"></span></div></div>';
    }).join('') + '</div>';
}

async function renderChallenges() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const daily = el('dailyChallengesList');
  const weekly = el('weeklyChallengesList');
  const monthly = el('monthlyChallengesList');
  function mk(items) {
    return items.map(function(c) {
      return '<div class="ch-track-item' + (c.done ? ' done' : '') + '">' +
        '<div class="ct-ico">' + (c.done ? '✅' : c.ico) + '</div>' +
        '<div class="ct-body"><div class="ct-title">' + c.title + '</div><div class="ct-sub">' + c.sub + '</div></div>' +
        '<div class="ct-reward">+' + fmtNum(c.reward) + '</div>' +
        '<div class="ct-progress"><span style="width:' + c.pct + '%"></span></div></div>';
    }).join('');
  }
  const ads = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  if (daily) daily.innerHTML = mk([
    { ico: '📺', title: t('ch.d1'), sub: ads + '/5', reward: 200, done: ads >= 5, pct: Math.min(100, (ads / 5) * 100) },
    { ico: '🔥', title: t('ch.d2'), sub: ads + '/10', reward: 400, done: ads >= 10, pct: Math.min(100, (ads / 10) * 100) }
  ]);
  if (weekly) weekly.innerHTML = mk([
    { ico: '🎯', title: t('ch.w1'), sub: (pf.offersCompleted || 0) + '/5', reward: 1500, done: (pf.offersCompleted || 0) >= 5, pct: Math.min(100, ((pf.offersCompleted || 0) / 5) * 100) },
    { ico: '💎', title: t('ch.w2'), sub: fmtNum(pf.lifetimeEarned || 0) + '/20,000', reward: 3000, done: (pf.lifetimeEarned || 0) >= 20000, pct: Math.min(100, ((pf.lifetimeEarned || 0) / 20000) * 100) }
  ]);
  if (monthly) monthly.innerHTML = mk([
    { ico: '🏆', title: t('ch.m1'), sub: (pf.offersCompleted || 0) + '/20', reward: 5000, done: (pf.offersCompleted || 0) >= 20, pct: Math.min(100, ((pf.offersCompleted || 0) / 20) * 100) },
    { ico: '👑', title: t('ch.m2'), sub: (pf.referralCount || 0) + '/10', reward: 10000, done: (pf.referralCount || 0) >= 10, pct: Math.min(100, ((pf.referralCount || 0) / 10) * 100) }
  ]);
}

async function renderCheckin() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const streak = pf.streak || 0;
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('checkinTitle', (pf.lastClaimDate === todayKey()) ? t('checkin.done') : t('checkin.today'));
  set('checkinSub', streak + ' ' + t('checkin.dayStreak'));
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
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
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
    const heads = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function(h) {
      return '<span class="cal-head">' + h + '</span>';
    }).join('');
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
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('refTotal', pf.referralCount || 0);
  set('refEarned', fmtNum(pf.referralEarned || 0));
  set('refActive', pf.referralCount || 0);
  const link = el('refLinkInput');
  if (link) link.value = buildRefLink();
  // Milestones
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
    milestones.innerHTML = ms.map(function(m) {
      return '<div class="milestone' + (m.done ? ' done' : '') + '"><span class="ms-ico">' + (m.done ? '✓' : m.ico) + '</span>' +
        '<div class="ms-body"><div class="ms-title">' + m.title + '</div><div class="ms-sub">' + m.sub + '</div></div>' +
        '<div class="ms-reward">+' + fmtNum(m.reward) + '</div></div>';
    }).join('');
  }
  // My referrals
  const list = el('refFriendsList');
  if (list) {
    try {
      const snap = await colRef('referrals').where('referrerId', '==', State.user.uid).orderBy('createdAt', 'desc').limit(20).get();
      const items = [];
      snap.forEach(function(d) {
        const r = d.data();
        items.push('<div class="ledger-item"><span class="lg-ico" style="background:rgba(0,230,118,.14)">👤</span>' +
          '<div class="lg-body"><div class="lg-title">' + esc(r.referredName || '') + '</div>' +
          '<div class="lg-sub">' + esc(r.status || '') + ' · ' + timeAgo(r.createdAt) + '</div></div>' +
          '<span class="badge badge-success">' + (r.status || '') + '</span></div>');
      });
      list.innerHTML = items.length ? items.join('') : emptyState(list, '👥', t('referral.noFriends'), t('referral.noFriendsSub'));
    } catch (e) {
      emptyState(list, '👥', t('referral.noFriends'), t('referral.noFriendsSub'));
    }
  }
}

async function renderLeaderboard() {
  const tabs = el('leaderTabs');
  if (tabs) {
    tabs.querySelectorAll('[data-period]').forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.querySelectorAll('[data-period]').forEach(function(x) { x.classList.remove('active'); });
        tab.classList.add('active');
      });
    });
  }
  const list = el('leaderboardList');
  if (!list) return;
  skeletonGrid(list, 6);
  try {
    const snap = await colRef('users').orderBy('lifetimeEarned', 'desc').limit(10).get();
    const rows = [];
    snap.forEach(function(d) { rows.push(d.data()); });
    State.leaderboard = rows;
    if (!rows.length) {
      emptyState(list, '🏆', t('leaderboard.none'), t('leaderboard.noneSub'));
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const myId = State.user ? State.user.uid : null;
    list.innerHTML = rows.map(function(u, i) {
      return '<div class="lb-row' + (u.uid === myId ? ' me' : '') + '">' +
        '<div class="lb-rank">' + (medals[i] || (i + 1)) + '</div>' +
        '<div class="lb-ava">' + (u.username || '?').charAt(0).toUpperCase() + '</div>' +
        '<div class="lb-body"><div class="lb-name">' + esc(u.username || '') + (u.uid === myId ? ' <span class="badge badge-info">' + t('leaderboard.you') + '</span>' : '') + '</div>' +
        '<div class="lb-sub">' + t('leaderboard.level') + ' ' + (u.level || 1) + '</div></div>' +
        '<div class="lb-xp">🪙 ' + fmtNum(u.lifetimeEarned || 0) + '</div></div>';
    }).join('');
  } catch (e) {
    emptyState(list, '🏆', t('leaderboard.none'), t('leaderboard.noneSub'));
  }
}

async function renderRewards() {
  if (!State.catalogLoaded) { await loadCatalog(); State.catalogLoaded = true; }
  const rewards = State.rewards;
  const tabs = el('rewardTabs');
  if (tabs) {
    const cats = ['all'];
    rewards.forEach(function(r) {
      if (r.category && cats.indexOf(r.category) === -1) cats.push(r.category);
    });
    tabs.innerHTML = cats.slice(0, 6).map(function(c, i) {
      return '<button class="tab ' + (i === 0 ? 'active' : '') + '" data-cat="' + esc(c) + '">' + (c === 'all' ? t('rewards.all') : esc(c)) + '</button>';
    }).join('');
    tabs.querySelectorAll('[data-cat]').forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.querySelectorAll('[data-cat]').forEach(function(x) { x.classList.remove('active'); });
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
  const list = State.rewards.filter(function(r) { return cat === 'all' || r.category === cat; });
  grid.innerHTML = list.length ? list.map(rewardCardHtml).join('') : emptyState(grid, '🎁', t('rewards.none'), t('rewards.noneSub'));
}

function renderTopup() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const games = State.rewards.filter(function(r) { return r.category === 'Game Top-Up' || r.type === 'topup'; });
  const list = el('topupGameList');
  if (list) {
    list.innerHTML = games.length ? games.map(function(g) {
      return '<div class="reward-item" data-game="' + esc(g.title) + '" data-reward-id="' + g.id + '" data-action="selectTopupGame">' +
        '<div class="rw-ico" style="background:' + (g.color || 'var(--grad-primary)') + '">' + (g.icon || '🎮') + '</div>' +
        '<div class="rw-body"><div class="rw-name">' + esc(g.title) + '</div><div class="rw-sub">' + esc(g.category || '') + '</div></div>' +
        '<span class="badge badge-success">' + t('topup.instant') + '</span></div>';
    }).join('') : emptyState(list, '🎮', t('topup.noGames'), t('topup.noGamesSub'));
  }
  renderPackages(null);
}

function renderPackages(gameName) {
  const grid = el('topupPackageGrid');
  if (!grid) return;
  let pkgs = [];
  if (gameName) {
    const reward = State.rewards.find(function(r) { return r.title === gameName && (r.packages && r.packages.length); });
    if (reward) pkgs = reward.packages;
  }
  if (!pkgs.length) {
    pkgs = [
      { label: '100 Units', cost: 4500 },
      { label: '310 Units', cost: 12000 },
      { label: '520 Units', cost: 18000 }
    ];
  }
  grid.innerHTML = pkgs.map(function(p, i) {
    return '<div class="package' + (i === 0 ? ' selected' : '') + '" data-cost="' + (p.cost || 0) + '" data-label="' + esc(p.label) + '" data-action="selectPackage">' +
      '<div class="pkg-name">' + esc(p.label) + '</div><div class="pkg-cost">' + fmtNum(p.cost || 0) + ' coins</div>' +
      (p.save ? '<div class="pkg-save">' + esc(p.save) + '</div>' : '') + '</div>';
  }).join('');
  // Update summary
  const firstPkg = pkgs[0];
  if (firstPkg) {
    State.selectedTopupPackage = firstPkg;
    const costEl = el('topupSumCost');
    if (costEl) costEl.textContent = fmtNum(firstPkg.cost) + ' coins';
    const pkgEl = el('topupSumPackage');
    if (pkgEl) pkgEl.textContent = firstPkg.label;
  }
}

function renderWithdraw() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const methods = [
    { id: 'PayPal', ico: '🅿️', name: 'PayPal', min: 10000, sub: 'Fast, worldwide' },
    { id: 'Crypto', ico: '₿', name: 'Crypto (BTC/ETH/USDT)', min: 15000, sub: 'BTC, ETH, USDT' },
    { id: 'Bank', ico: '🏦', name: t('withdraw.bank'), min: 25000, sub: 'SWIFT / local' },
    { id: 'Gift Card', ico: '🎁', name: t('withdraw.giftcard'), min: 10000, sub: 'Amazon, Google Play' }
  ];
  const list = el('wdMethodList');
  if (list) {
    list.innerHTML = methods.map(function(m, i) {
      return '<div class="wd-method' + (i === 0 ? ' selected' : '') + '" data-method="' + m.id + '" data-action="selectWdMethod">' +
        '<div class="wm-ico">' + m.ico + '</div><div class="wm-name">' + m.name + '</div>' +
        '<span class="wm-min">' + t('withdraw.from') + ' ' + fmtNum(m.min) + '</span></div>';
    }).join('');
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
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('wdSumAmount', fmtNum(amt) + ' coins');
  set('wdSumReceive', '$' + (usd - fee).toFixed(2));
  set('wdSumFee', '$' + fee.toFixed(2));
  set('wdSumMethod', State.selectedWdMethod || 'PayPal');
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
    const filtered = w.list.filter(function(e) { return type === 'all' || e.type === type; });
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
    snap.forEach(function(d) {
      const n = d.data();
      n.id = d.id;
      items.push(n);
    });
    const badge = el('notifBadge');
    const unreadCount = items.filter(function(n) { return !n.read; }).length;
    if (badge) {
      badge.textContent = unreadCount;
      badge.classList.toggle('hidden', unreadCount === 0);
    }
    list.innerHTML = items.length ? items.map(notifItemHtml).join('') : emptyState(list, '🔔', t('notifications.none'), t('notifications.noneSub'));
  } catch (e) {
    emptyState(list, '🔔', t('notifications.none'), t('notifications.noneSub'));
  }
}

async function renderSupport() {
  if (!State.user) { guardAuth(); return; }
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('supAvgTime', '~4h');
  set('supSolved', '0');
  set('supOpen', '0');
  set('supSatisfaction', '4.8');
  const list = el('myTicketsList');
  if (list) {
    try {
      const snap = await colRef('tickets').where('uid', '==', State.user.uid).orderBy('createdAt', 'desc').limit(10).get();
      const items = [];
      snap.forEach(function(d) {
        const tk = d.data();
        const st = tk.status || 'open';
        const cls = st === 'open' ? 'badge-warning' : st === 'resolved' ? 'badge-success' : 'badge-info';
        items.push('<div class="ledger-item"><span class="lg-ico" style="background:rgba(0,176,255,.14)">🎧</span>' +
          '<div class="lg-body"><div class="lg-title">' + esc(tk.subject || '') + '</div>' +
          '<div class="lg-sub">#' + esc(tk.ticketId || d.id.slice(0, 8)) + ' · ' + timeAgo(tk.createdAt) + '</div></div>' +
          '<span class="badge ' + cls + '">' + st + '</span></div>');
      });
      list.innerHTML = items.length ? items.join('') : emptyState(list, '🎧', t('support.noTickets'), t('support.noTicketsSub'),
        '<button class="btn btn-accent btn-sm mt-2" data-action="openTicket">' + t('support.newTicket') + '</button>');
    } catch (e) {
      emptyState(list, '🎧', t('support.noTickets'), t('support.noTicketsSub'),
        '<button class="btn btn-accent btn-sm mt-2" data-action="openTicket">' + t('support.newTicket') + '</button>');
    }
  }
}

async function renderProfile() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  function set(id, v) { const x = el(id); if (x) x.textContent = v; }
  set('profileUsername', pf.username || '');
  set('profileMeta', (pf.country || t('profile.noCountry')) + ' · ' + (pf.email || ''));
  const ava = el('profileAvatar');
  if (ava) {
    if (pf.avatar) ava.innerHTML = '<img src="' + esc(pf.avatar) + '" alt="">';
    else ava.textContent = (pf.username || '?').charAt(0).toUpperCase();
  }
  set('profileLevelChip', 'Lv ' + (pf.level || 1));
  const vchip = el('profileVerifiedChip');
  if (vchip) {
    const v = pf.verification || {};
    if (v.email) { vchip.innerHTML = '✓ Verified'; vchip.className = 'badge badge-success'; }
    else { vchip.innerHTML = t('profile.unverified'); vchip.className = 'badge badge-warning'; }
  }
  const xp = pf.xp || 0;
  const level = pf.level || 1;
  const xpNeeded = level * XP_PER_LEVEL;
  set('profileXpLabel', xp + ' / ' + xpNeeded + ' XP');
  const fill = el('profileXpFill');
  if (fill) fill.style.width = Math.min(100, (xp / xpNeeded) * 100) + '%';
  updateBalanceUI();
  // Achievements
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
    ach.innerHTML = badges.map(function(b) {
      return '<div class="ach-item' + (b.done ? ' done' : ' locked') + '"><div class="ach-ico">' + b.ico + '</div>' +
        '<div style="flex:1"><div class="font-bold text-sm">' + b.t + '</div><div class="text-xs text-muted">' + b.s + '</div></div>' +
        '<span class="badge ' + (b.done ? 'badge-success' : 'badge-neutral') + '">' + (b.done ? '+' + b.xp + ' XP' : t('profile.locked')) + '</span></div>';
    }).join('');
  }
  // Badges
  const pbadges = el('profileBadges');
  if (pbadges) {
    const earned = pf.lifetimeEarned || 0;
    const list2 = ['🆕 ' + t('badge.newbie')];
    if ((pf.offersCompleted || 0) >= 1) list2.push('🎮 ' + t('badge.gamer'));
    if ((pf.surveysCompleted || 0) >= 1) list2.push('📋 ' + t('badge.surveyor'));
    if (earned >= 10000) list2.push('💎 ' + t('badge.earner'));
    if ((pf.streak || 0) >= 7) list2.push('🔥 ' + t('badge.streaker'));
    if ((pf.referralCount || 0) >= 1) list2.push('👥 ' + t('badge.inviter'));
    pbadges.innerHTML = list2.map(function(b) { return '<span class="badge badge-grad">' + b + '</span>'; }).join('');
  }
  // Referral code
  const refCode = el('pfRefCode');
  if (refCode) refCode.value = pf.referralCode || '';
  // Sessions
  const sessions = el('profileSessions');
  if (sessions) {
    sessions.innerHTML = '<div class="device-card current"><div class="dc-ico">💻</div>' +
      '<div class="dc-body"><div class="dc-name">' + t('pf.thisDevice') + '</div>' +
      '<div class="dc-sub">' + (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') + ' · ' + navigator.userAgent.split(' ').pop() + '</div>' +
      '<div class="dc-time">' + t('pf.currentSession') + '</div></div>' +
      '<span class="badge badge-success">' + t('pf.active') + '</span></div>';
  }
  // Devices
  const devices = el('profileDevices');
  if (devices) {
    const isMobile = navigator.userAgent.includes('Mobile');
    devices.innerHTML = '<div class="device-card"><div class="dc-ico">' + (isMobile ? '📱' : '💻') + '</div>' +
      '<div class="dc-body"><div class="dc-name">' + (isMobile ? 'Mobile' : 'Desktop') + '</div>' +
      '<div class="dc-sub">' + t('pf.thisDevice') + '</div></div>' +
      '<span class="badge badge-neutral">' + t('pf.trusted') + '</span></div>';
  }
}

async function renderSecurity() {
  if (!State.user) { guardAuth(); return; }
  const v = (State.profile || {}).verification || {};
  function set(id, v2) { const x = el(id); if (x) x.textContent = v2; }
  set('secEmailSub', v.email ? t('security.verified') : t('security.notVerified'));
  const emailIco = el('secEmailIco');
  if (emailIco) { emailIco.textContent = v.email ? '✅' : '📧'; emailIco.className = 'sc-ico ' + (v.email ? 'on' : 'off'); }
  set('secPhoneSub', v.phone ? t('security.verified') : t('security.notVerified'));
  const phoneIco = el('secPhoneIco');
  if (phoneIco) { phoneIco.textContent = v.phone ? '✅' : '📱'; phoneIco.className = 'sc-ico ' + (v.phone ? 'on' : 'off'); }
  const twoFaIco = el('sec2faIco');
  if (twoFaIco) { twoFaIco.textContent = v.twoFa ? '✅' : '🔐'; twoFaIco.className = 'sc-ico ' + (v.twoFa ? 'on' : 'off'); }
  const twoFaBtn = el('sec2faBtn');
  if (twoFaBtn) twoFaBtn.textContent = v.twoFa ? t('security.disable2fa') : t('security.enable');
  const loginList = el('loginHistoryList');
  if (loginList) {
    loginList.innerHTML = '<div class="log-row"><span class="log-ico">✅</span><span class="log-time">' + t('security.today') + '</span>' +
      '<span class="log-action">' + t('security.login') + '</span><span class="log-detail">' + t('security.currentDevice') + '</span></div>';
  }
}

function renderFaq() {
  const list = el('faqList');
  if (!list) return;
  const faqs = State.faqs && State.faqs.length ? State.faqs : [];
  if (!faqs.length) {
    emptyState(list, '❓', t('faq.title'), '');
    return;
  }
  list.innerHTML = faqs.map(function(f) {
    return '<div class="faq-item"><button class="faq-q" data-action="toggleFaq">' + esc(f.q) + '<span class="faq-ico">＋</span></button>' +
      '<div class="faq-a"><div class="faq-a-inner">' + esc(f.a) + '</div></div></div>';
  }).join('');
}

function renderTerms() {
  const c = el('termsContent');
  if (!c) return;
  c.innerHTML = '<h2 class="font-black text-xl mb-3">📜 ' + t('terms.title') + '</h2>' +
    '<div class="rich-text"><p>Welcome to Rewords. By using this platform, you agree to our terms of service. Please read them carefully.</p>' +
    '<h3>1. Acceptance of Terms</h3><p>By accessing Rewords, you agree to be bound by these terms.</p>' +
    '<h3>2. Earning Coins</h3><p>Coins are earned through legitimate activities. Fraud is strictly prohibited.</p>' +
    '<h3>3. Withdrawals</h3><p>Withdrawals are subject to verification and minimum thresholds.</p>' +
    '<h3>4. Anti-Fraud</h3><p>Multiple accounts, VPNs, emulators and automated tools are prohibited.</p>' +
    '<h3>5. Termination</h3><p>We reserve the right to terminate accounts that violate these terms.</p></div>';
}

function renderPrivacy() {
  const c = el('privacyContent');
  if (!c) return;
  c.innerHTML = '<h2 class="font-black text-xl mb-3">🔒 ' + t('privacy.title') + '</h2>' +
    '<div class="rich-text"><p>Your privacy is important to us. This policy explains how we collect, use and protect your data.</p>' +
    '<h3>1. Data Collection</h3><p>We collect account info, device fingerprints and activity data.</p>' +
    '<h3>2. Data Usage</h3><p>Data is used to operate the platform and prevent fraud.</p>' +
    '<h3>3. Data Sharing</h3><p>We share data with offerwall partners only as needed.</p>' +
    '<h3>4. Data Security</h3><p>We use encryption and security measures to protect your data.</p>' +
    '<h3>5. Your Rights</h3><p>You may request deletion of your account and data at any time.</p></div>';
}

function renderAntifraud() {
  const pf = State.profile || {};
  const score = pf.fraudScore || 0;
  const scores = el('fraudStatusGrid');
  if (scores) {
    const level = score < 30 ? t('fraud.low') : score < 60 ? t('fraud.medium') : t('fraud.high');
    const cls = score < 30 ? 'bg-success' : score < 60 ? 'bg-warning' : 'bg-danger';
    scores.innerHTML = '<div class="card stat-card"><span class="stat-ico ' + cls + '">🛡️</span>' +
      '<div class="stat-value">' + (100 - score) + '%</div><div class="stat-label">' + t('fraud.score') + '</div></div>' +
      '<div class="card stat-card"><span class="stat-ico bg-info">📶</span>' +
      '<div class="stat-value">' + level + '</div><div class="stat-label">' + t('fraud.level') + '</div></div>' +
      '<div class="card stat-card"><span class="stat-ico bg-warning">🚩</span>' +
      '<div class="stat-value">' + (pf.flags || []).length + '</div><div class="stat-label">' + t('fraud.flags') + '</div></div>';
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
  renderWalletTab('all');
  const tabs = el('walletTabs');
  if (tabs) {
    tabs.querySelectorAll('.wallet-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.querySelectorAll('.wallet-tab').forEach(function(x) { x.classList.remove('active'); });
        tab.classList.add('active');
        renderWalletTab(tab.getAttribute('data-wtab') || 'all');
      });
    });
  }
}

async function renderWalletTab(type) {
  const list = el('walletLedger');
  if (!list) return;
  if (!State.wallet) {
    try { State.wallet = await computeWallet(State.user.uid); } catch (e) {}
  }
  const w = State.wallet;
  if (!w) { emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub')); return; }
  let items = w.list;
  if (type === 'pending') items = items.filter(function(e) { return e.status === 'pending'; });
  else if (type === 'earned') items = items.filter(function(e) { return (e.coins || 0) > 0; });
  else if (type === 'spent') items = items.filter(function(e) { return (e.coins || 0) < 0; });
  else if (type === 'withdrawal') items = items.filter(function(e) { return e.type === 'withdrawal'; });
  else items = items.filter(function(e) { return e.status === 'completed' || e.status === 'pending'; });
  list.innerHTML = items.length ? items.map(txItemHtml).join('') : emptyState(list, '💳', t('transactions.none'), t('transactions.noneSub'));
}

function renderPromo() {
  const promos = State.promos;
  const grid = el('promoCodesGrid');
  if (grid) {
    grid.innerHTML = promos.length ? promos.map(function(p) {
      return '<div class="promo-card reveal"><div class="pc-ico">🎟️</div>' +
        '<div class="pc-body"><div class="pc-code">' + esc(p.code) + '</div>' +
        '<div class="pc-title">' + esc(p.title || '') + '</div>' +
        '<div class="pc-sub">' + esc(p.description || '') + '</div></div>' +
        '<button class="btn btn-accent btn-sm" data-action="applyPromo" data-code="' + p.code + '">' + t('promo.use') + '</button></div>';
    }).join('') : emptyState(grid, '🎟️', t('promo.none'), t('promo.noneSub'));
  }
}

function renderEvents() {
  const events = State.events;
  const active = el('activeEventsGrid');
  const upcoming = el('upcomingEventsGrid');
  const past = el('pastEventsGrid');
  function card(ev, i) {
    return '<div class="card event-card reveal" style="animation-delay:' + i * 60 + 'ms">' +
      '<div class="ev-badge">' + (ev.icon || '🎉') + '</div><div class="ev-name">' + esc(ev.title) + '</div>' +
      '<div class="ev-sub">' + esc(ev.subtitle || '') + '</div>' +
      '<div class="ev-date">📅 ' + esc(ev.startsAt || '') + (ev.endsAt ? ' → ' + esc(ev.endsAt) : '') + '</div>' +
      '<div class="ev-reward">+' + fmtNum(ev.reward || 0) + ' ' + t('events.coins') + '</div>' +
      '<button class="btn btn-sm btn-accent btn-block mt-2" data-action="openEvent" data-id="' + ev.id + '">' + t('events.joinNow') + '</button></div>';
  }
  if (active) active.innerHTML = events.filter(function(e) { return e.status === 'active'; }).map(card).join('') || emptyState(active, '🎉', t('events.none'), t('events.noneSub'));
  if (upcoming) upcoming.innerHTML = events.filter(function(e) { return e.status === 'upcoming'; }).map(card).join('') || emptyState(upcoming, '📅', t('events.none'), t('events.noneSub'));
  if (past) past.innerHTML = events.filter(function(e) { return e.status === 'ended'; }).map(card).join('') || emptyState(past, '📆', t('events.none'), t('events.noneSub'));
}

function renderBlog() {
  const posts = State.posts;
  const grid = el('blogGrid');
  if (grid) {
    grid.innerHTML = posts.length ? posts.map(function(p, i) {
      return '<div class="card blog-card reveal" style="animation-delay:' + i * 60 + 'ms"><div class="blog-thumb">' + (p.icon || '📰') + '</div>' +
        '<div class="blog-title">' + esc(p.title) + '</div>' +
        '<div class="text-xs text-muted">' + timeAgo(p.createdAt) + '</div>' +
        '<button class="btn btn-ghost btn-sm btn-block mt-2" data-action="openPost" data-id="' + p.id + '">' + t('blog.read') + '</button></div>';
    }).join('') : emptyState(grid, '📰', t('blog.none'), t('blog.noneSub'));
  }
}

async function renderHistory() {
  if (!State.user) { guardAuth(); return; }
  updateBalanceUI();
  const list = el('historyList');
  if (!list) return;
  const w = State.wallet;
  if (w && w.list) {
    const items = w.list.filter(function(e) { return e.coins > 0 && e.status === 'completed'; }).slice(0, 20);
    list.innerHTML = items.length ? items.map(txItemHtml).join('') : emptyState(list, '📜', t('history.none'), t('history.noneSub'));
  } else {
    emptyState(list, '📜', t('history.none'), t('history.noneSub'));
  }
}

function renderOfflineRewards() {
  if (!State.user) { guardAuth(); return; }
}

function renderMore() {
  const list = el('kbGrid');
  if (list) {
    const items = [
      { nav: 'faq', ico: '❓', t: t('nav.faq') },
      { nav: 'support', ico: '🎧', t: t('nav.support') },
      { nav: 'terms', ico: '📜', t: t('nav.terms') },
      { nav: 'privacy', ico: '🔒', t: t('nav.privacy') },
      { nav: 'antifraud', ico: '🛡️', t: t('nav.antifraud') },
      { nav: 'blog', ico: '📰', t: t('nav.blog') },
      { nav: 'events', ico: '🎉', t: t('nav.events') },
      { nav: 'promo', ico: '🎟️', t: t('nav.promo') },
      { nav: 'rewards', ico: '🎁', t: t('nav.rewards') },
      { nav: 'leaderboard', ico: '🏆', t: t('nav.leaderboard') }
    ];
    list.innerHTML = items.map(function(i) {
      return '<button class="kb-item" data-nav="' + i.nav + '"><span class="kb-ico">' + i.ico + '</span><span class="kb-label">' + i.t + '</span><span class="kb-chev">→</span></button>';
    }).join('');
  }
}

/* ============================================================================
   17. ACTION HANDLERS
============================================================================ */
function initGlobalActions() {
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const fn = window['on' + action.charAt(0).toUpperCase() + action.slice(1)];
    if (typeof fn === 'function') {
      e.preventDefault();
      fn(target, e);
    }
  });

  $$('.modal-scrim').forEach(function(scrim) {
    scrim.addEventListener('click', function(e) {
      if (e.target === scrim) scrim.classList.remove('open');
    });
  });

  $$('.modal-close').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const scrim = btn.closest('.modal-scrim');
      if (scrim) scrim.classList.remove('open');
    });
  });

  el('confirmDialogOk').addEventListener('click', function() {
    el('confirmDialog').classList.remove('open');
    if (confirmCallback) { confirmCallback(true); confirmCallback = null; }
  });

  el('confirmDialogCancel').addEventListener('click', closeConfirmDialog);

  el('rewardPopupOk').addEventListener('click', function() { closeModal('rewardPopup'); });

  el('promoApplyBtn').addEventListener('click', function() {
    const code = el('promoInput').value.trim().toUpperCase();
    if (code) applyPromo(code);
  });

  el('chatSend').addEventListener('click', sendChatMsg);
  el('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendChatMsg();
  });

  el('markAllReadBtn').addEventListener('click', markAllRead);
  el('clearNotifBtn').addEventListener('click', clearNotifs);
  el('refCopyBtn').addEventListener('click', copyRefLink);
  el('refShareBtn').addEventListener('click', shareRefLink);
  el('refApplyBtn').addEventListener('click', applyRefCode);
  el('pfRefCopyBtn').addEventListener('click', copyRefLink);
  el('editProfileBtn').addEventListener('click', openProfileEdit);
  el('saveProfileBtn').addEventListener('click', saveProfile);
  el('profileEditClose').addEventListener('click', function() { closeModal('profileEditModal'); });
  el('avatarFileInput').addEventListener('change', previewAvatar);
  el('deleteAccountBtn').addEventListener('click', deleteAccount);
  el('sec2faBtn').addEventListener('click', toggle2fa);
  el('secVerifyEmailBtn').addEventListener('click', function() {
    if (auth.currentUser) auth.currentUser.sendEmailVerification().then(function() {
      toast(t('auth.resend'), t('auth.resetSent'), 'success');
    }).catch(function(e) { toast('', e.message, 'error'); });
  });
  el('secPasswordBtn').addEventListener('click', function() {
    if (auth.currentUser && auth.currentUser.email) {
      auth.sendPasswordResetEmail(auth.currentUser.email).then(function() {
        toast(t('auth.sendReset'), t('auth.resetSent'), 'success');
      }).catch(function(e) { toast('', e.message, 'error'); });
    }
  });

  el('wdAmount').addEventListener('input', updateWdSummary);
  $$('[data-amount]').forEach(function(chip) {
    chip.addEventListener('click', function() {
      el('wdAmount').value = chip.getAttribute('data-amount');
      updateWdSummary();
    });
  });
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

  $$('#txTypeFilter .filter-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      $$('#txTypeFilter .filter-chip').forEach(function(x) { x.classList.remove('active'); });
      chip.classList.add('active');
      renderTransactionsList(chip.getAttribute('data-type'));
    });
  });

  el('langToggle').addEventListener('click', function() {
    setLang(State.lang === 'en' ? 'ar' : 'en');
    renderPage(State.currentPage);
  });

  el('themeToggle').addEventListener('click', function() {
    setTheme(State.theme === 'dark' ? 'light' : 'dark');
  });

  el('notifBtn').addEventListener('click', function() {
    navigate('notifications');
  });

  el('loginBtn').addEventListener('click', function() {
    if (State.user) {
      logout();
    } else {
      openModal('authModal');
    }
  });

  el('logoutBtnMobile').addEventListener('click', logout);

  el('topupPlayerId').addEventListener('input', function() {
    const val = this.value.trim();
    el('topupSumPlayer').textContent = val || '—';
  });

  el('offersSearch').addEventListener('input', debounce(function() {
    const q = this.value.toLowerCase();
    const grid = el('offersGrid');
    if (!grid) return;
    const filtered = State.offers.filter(function(o) {
      return !q || (o.title && o.title.toLowerCase().includes(q));
    });
    grid.innerHTML = filtered.length ? filtered.map(offerCardHtml).join('') : emptyState(grid, '🎯', t('offers.none'), t('offers.noneSub'));
  }, 300));

  el('gamesSearch').addEventListener('input', debounce(function() {
    const q = this.value.toLowerCase();
    const grid = el('gamesGrid');
    if (!grid) return;
    const filtered = State.games.filter(function(g) {
      return !q || (g.title && g.title.toLowerCase().includes(q));
    });
    grid.innerHTML = filtered.length ? filtered.map(gameCardHtml).join('') : emptyState(grid, '🎮', t('games.none'), t('games.noneSub'));
  }, 300));

  el('earnSearch').addEventListener('input', debounce(function() {
    const q = this.value.toLowerCase();
    const grid = el('earnOffersGrid');
    if (!grid) return;
    const filtered = State.offers.filter(function(o) {
      return !q || (o.title && o.title.toLowerCase().includes(q));
    });
    grid.innerHTML = filtered.length ? filtered.map(offerCardHtml).join('') : emptyState(grid, '🎯', t('offers.none'), t('offers.noneSub'));
  }, 300));

  el('topupRegion').addEventListener('change', function() {
    el('topupSumRegion').textContent = this.value;
  });
}

// Action handler functions
function onOpenAuth() { openModal('authModal'); }
function onOpenOffer(btn) { openOfferModal(btn.getAttribute('data-id')); }
function onOpenGame(btn) { openGameModal(btn.getAttribute('data-id')); }
function onOpenSurvey(btn) { openSurveyModal(btn.getAttribute('data-id')); }
function onOpenReward(btn) { openRewardModal(btn.getAttribute('data-id')); }
function onOpenEvent(btn) {
  const ev = State.events.find(function(x) { return x.id === btn.getAttribute('data-id'); });
  if (!ev) return toast('', t('events.none'), 'info');
  openGenericModal(t('events.title'),
    '<div class="text-center py-3"><div style="font-size:3rem">' + (ev.icon || '🎉') + '</div>' +
    '<div class="font-black text-lg">' + esc(ev.title) + '</div>' +
    '<p class="text-sm text-muted mt-2">' + esc(ev.subtitle || '') + '</p>' +
    '<div class="mt-3">' + t('events.reward') + ': <b class="coin-t">+' + fmtNum(ev.reward || 0) + '</b></div>' +
    '<div class="text-xs text-muted mt-2">' + esc(ev.startsAt || '') + ' → ' + esc(ev.endsAt || '') + '</div></div>');
}
function onOpenPost(btn) {
  const p = State.posts.find(function(x) { return x.id === btn.getAttribute('data-id'); });
  if (!p) return;
  const body = el('articleBody');
  if (body) {
    body.innerHTML = '<h2 class="font-black text-xl mb-2">' + esc(p.title) + '</h2>' +
      '<div class="text-xs text-muted mb-4">' + timeAgo(p.createdAt) + '</div>' +
      '<div class="rich-text">' + (p.content || '') + '</div>';
  }
  navigate('article');
}
function onApplyPromo(btn) { applyPromo(btn.getAttribute('data-code')); }
function onWatchAd() { watchAd(); }
function onClaimDaily() { claimDaily(); }
function onSelectTopupGame(btn) {
  $$('#topupGameList .reward-item').forEach(function(x) { x.classList.remove('selected'); });
  btn.classList.add('selected');
  const gameName = btn.getAttribute('data-game');
  State.selectedTopupGame = gameName;
  el('topupSumGame').textContent = gameName;
  renderPackages(gameName);
}
function onSelectPackage(btn) {
  $$('#topupPackageGrid .package').forEach(function(x) { x.classList.remove('selected'); });
  btn.classList.add('selected');
  const cost = parseInt(btn.getAttribute('data-cost')) || 0;
  const label = btn.getAttribute('data-label');
  State.selectedTopupPackage = { cost: cost, label: label };
  el('topupSumCost').textContent = fmtNum(cost) + ' coins';
  el('topupSumPackage').textContent = label;
}
function onSelectWdMethod(btn) {
  $$('#wdMethodList .wd-method').forEach(function(x) { x.classList.remove('selected'); });
  btn.classList.add('selected');
  State.selectedWdMethod = btn.getAttribute('data-method');
  updateWdSummary();
}
function onOpenTicket() {
  openGenericModal(t('support.newTicket'),
    '<div class="field"><label>' + t('support.subject') + '</label>' +
    '<input type="text" class="input" id="ticketSubject" placeholder="' + t('support.subjectPh') + '"></div>' +
    '<div class="field"><label>' + t('support.category') + '</label>' +
    '<select class="select" id="ticketCategory"><option>General</option><option>Withdrawal</option><option>Offer</option><option>Payment</option><option>Account</option></select></div>' +
    '<div class="field"><label>' + t('support.message') + '</label>' +
    '<textarea class="textarea" id="ticketMsg" rows="4"></textarea></div>' +
    '<button class="btn btn-accent btn-lg btn-block" id="ticketSubmitBtn">' + t('support.send') + '</button>');
  setTimeout(function() {
    const submit = el('ticketSubmitBtn');
    if (submit) submit.addEventListener('click', sendTicket);
  }, 100);
}
function onToggleFaq(btn) {
  const item = btn.closest('.faq-item');
  if (item) {
    item.classList.toggle('open');
    const ico = btn.querySelector('.faq-ico');
    if (ico) ico.textContent = item.classList.contains('open') ? '−' : '＋';
  }
}
function onMarkNotif(btn) {
  if (!State.user) return;
  const id = btn.getAttribute('data-id');
  if (id) colRef('notifications').doc(id).update({ read: true }).catch(function() {});
  btn.classList.remove('unread');
}

function openOfferModal(id) {
  const o = State.offers.find(function(x) { return x.id === id; }) || State.games.find(function(x) { return x.id === id; });
  if (!o) return toast('', t('offers.none'), 'error');
  const body = el('offerModalBody');
  if (!body) return;
  const payout = o.payout || o.reward || 0;
  const milestones = (o.milestones && o.milestones.length) ? o.milestones.map(function(m) {
    return '<div class="offer-milestone"><span class="om-ico">' + (m.icon || '🎯') + '</span>' +
      '<span class="om-label">' + esc(m.label) + '</span>' +
      '<span class="om-reward">+' + fmtNum(m.reward || 0) + '</span></div>';
  }).join('') : '<div class="offer-milestone"><span class="om-ico">✅</span><span class="om-label">' + t('offers.complete') + '</span>' +
    '<span class="om-reward">+' + fmtNum(payout) + '</span></div>';
  body.innerHTML =
    '<div class="offer-detail-hero" style="background:' + (o.color || 'var(--grad-primary)') + '">' +
    '<div class="odh-logo">' + (o.icon || '🎯') + '</div>' +
    '<div class="odh-name">' + esc(o.title) + '</div>' +
    '<div class="odh-provider">' + esc(o.provider || '') + '</div></div>' +
    '<div class="grid grid-3 mt-3">' +
    '<div class="od-stat"><div class="od-stat-v coin-t">+' + fmtNum(payout) + '</div><div class="od-stat-l">' + t('offers.payout') + '</div></div>' +
    '<div class="od-stat"><div class="od-stat-v">' + (o.minutes || 5) + '</div><div class="od-stat-l">' + t('offers.minutes') + '</div></div>' +
    '<div class="od-stat"><div class="od-stat-v">' + (o.difficulty || 'Easy') + '</div><div class="od-stat-l">' + t('offers.difficulty') + '</div></div></div>' +
    '<div class="divider-h"></div>' +
    '<h4 class="font-black text-md mb-2">🎯 ' + t('offers.milestones') + '</h4>' + milestones +
    '<h4 class="font-black text-md mt-4 mb-2">📝 ' + t('offers.howTo') + '</h4>' +
    '<ol class="howto"><li>' + t('offers.stepDefault') + '</li></ol>' +
    '<div class="mt-4 flex gap-2">' +
    '<a class="btn btn-accent flex-1" href="' + (o.link || '#') + '" target="_blank" rel="noopener">🚀 ' + t('offers.start') + '</a>' +
    '<button class="btn btn-ghost flex-1" data-action="completeOffer" data-id="' + o.id + '">✅ ' + t('offers.imDone') + '</button></div>' +
    '<div class="text-xs text-muted mt-2">' + t('offers.creditNote') + '</div>';
  el('offerModalTitle').textContent = esc(o.title);
  openModal('offerModal');
}

function openGameModal(id) { openOfferModal(id); }

function openSurveyModal(id) {
  const s = State.surveys.find(function(x) { return x.id === id; });
  if (!s) return toast('', t('surveys.none'), 'error');
  if (!State.user) { guardAuth(); return; }
  const body = el('surveyModalBody');
  if (!body) return;
  const reward = s.reward || s.payout || 0;
  body.innerHTML =
    '<div class="survey-detail"><div class="survey-ico-lg">📋</div>' +
    '<div class="font-black text-lg">' + esc(s.title) + '</div>' +
    '<p class="text-sm text-muted mt-2">' + esc(s.description || '') + '</p></div>' +
    '<div class="survey-detail-meta">' +
    '<span class="sv-chip">⏱️ ' + (s.minutes || 5) + ' ' + t('surveys.min') + '</span>' +
    '<span class="sv-chip">⭐ ' + (s.rating || '4.5') + '</span>' +
    '<span class="sv-chip coin-t">+' + fmtNum(reward) + '</span></div>' +
    '<div class="alert alert-info mt-3"><span class="a-ico">💡</span><div class="a-body">' +
    '<div class="a-title">' + t('surveys.qualified') + '</div><span>' + t('surveys.disqualify') + '</span></div></div>' +
    '<div class="field mt-3"><label>' + t('surveys.question') + '</label>' +
    '<select class="select"><option>' + t('surveys.opt1') + '</option><option>' + t('surveys.opt2') + '</option><option>' + t('surveys.opt3') + '</option></select></div>' +
    '<div class="flex gap-2 mt-4">' +
    '<button class="btn btn-success flex-1" data-action="completeSurvey" data-id="' + s.id + '">✅ ' + t('surveys.submit') + '</button>' +
    '<button class="btn btn-ghost" onclick="closeModal(\'surveyModal\')">' + t('popup.cancel') + '</button></div>';
  el('surveyModalTitle').textContent = esc(s.title);
  openModal('surveyModal');
}

function openRewardModal(id) {
  const r = State.rewards.find(function(x) { return x.id === id; });
  if (!r) return;
  if (!State.user) { guardAuth(); return; }
  const body = el('confirmModalBody');
  if (!body) return;
  body.innerHTML =
    '<div class="reward-confirm"><div class="rw-logo" style="background:' + (r.color || 'var(--grad-success)') + '">' + (r.icon || '🎁') + '</div>' +
    '<div class="font-black text-lg">' + esc(r.title) + '</div>' +
    '<div class="text-sm text-muted">' + esc(r.category || '') + '</div></div>' +
    '<div class="kv-row mt-3"><span class="kv-label">' + t('rewards.cost') + '</span><span class="kv-value coin-t">' + fmtNum(r.price || 0) + ' 🪙</span></div>' +
    '<div class="kv-row"><span class="kv-label">' + t('rewards.balance') + '</span><span class="kv-value">' + fmtNum((State.wallet || {}).coins || 0) + ' 🪙</span></div>' +
    '<button class="btn btn-accent btn-lg btn-block mt-4" id="rewConfirmBtn">🎁 ' + t('rewards.confirmRedeem') + '</button>';
  el('confirmModalTitle').textContent = t('rewards.confirm');
  openModal('confirmModal');
  setTimeout(function() {
    const confirmBtn = el('rewConfirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', function() { redeemReward(r); });
  }, 100);
}

function onCompleteOffer(btn) { completeOffer(btn.getAttribute('data-id')); }
function onCompleteSurvey(btn) { completeSurvey(btn.getAttribute('data-id')); }

async function completeOffer(id) {
  if (!State.user) { guardAuth(); return; }
  closeModal('offerModal');
  const target = State.offers.find(function(x) { return x.id === id; }) || State.games.find(function(x) { return x.id === id; });
  if (!target) return;
  const coins = target.payout || target.reward || 0;
  const ok = await askConfirm(t('offers.confirmTitle'), t('offers.confirmBody').replace('{n}', fmtNum(coins)), t('popup.confirm'), false);
  if (!ok) return;
  await addLedger(State.user.uid, 'offer', t('ledger.offerComplete').replace('{n}', target.title), coins, 'completed', { ref: 'OFF-' + uid().slice(0, 8), provider: target.provider || 'offerwall' });
  await colRef('users').doc(State.user.uid).update({
    offersCompleted: increment(1),
    xp: increment(Math.max(5, Math.round(coins / 20))),
    lastSeen: serverTimestamp()
  }).catch(function() {});
  State.profile.offersCompleted = (State.profile.offersCompleted || 0) + 1;
  updateBalanceUI();
  showRewardPopup(coins, t('ledger.offerComplete').replace('{n}', target.title));
  await colRef('notifications').add({
    uid: State.user.uid, type: 'offer',
    title: t('notif.offerDone'), body: '+' + fmtNum(coins) + ' — ' + target.title,
    read: false, createdAt: serverTimestamp()
  }).catch(function() {});
}

async function completeSurvey(id) {
  if (!State.user) { guardAuth(); return; }
  const s = State.surveys.find(function(x) { return x.id === id; });
  if (!s) return;
  closeModal('surveyModal');
  const coins = s.reward || s.payout || 0;
  await addLedger(State.user.uid, 'survey', t('ledger.surveyComplete').replace('{n}', s.title), coins, 'completed', { ref: 'SURV-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({ surveysCompleted: increment(1), xp: increment(10), lastSeen: serverTimestamp() }).catch(function() {});
  State.profile.surveysCompleted = (State.profile.surveysCompleted || 0) + 1;
  updateBalanceUI();
  showRewardPopup(coins, t('ledger.surveyComplete').replace('{n}', s.title));
}

async function redeemReward(r) {
  const cost = r.price || 0;
  const w = State.wallet || { coins: 0 };
  if (w.coins < cost) {
    closeModal('confirmModal');
    toast(t('rewards.redeem'), t('err.insufficient'), 'warning');
    return;
  }
  const ok = await askConfirm(t('rewards.confirm'), t('rewards.confirmBody').replace('{n}', fmtNum(cost)).replace('{t}', r.title), t('popup.confirm'), false);
  if (!ok) return;
  closeModal('confirmModal');
  await addLedger(State.user.uid, 'reward', t('ledger.rewardRedeem').replace('{n}', r.title), -cost, 'completed', { ref: 'REW-' + uid().slice(0, 8) });
  await colRef('orders').add({
    uid: State.user.uid,
    type: 'reward',
    item: r.title,
    itemId: r.id,
    cost: cost,
    status: 'pending',
    createdAt: serverTimestamp()
  }).catch(function() {});
  updateBalanceUI();
  toast(t('rewards.redeem'), t('rewards.ordered'), 'success');
  celebrate();
}

async function watchAd() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  const cap = State.settings.adDailyCap || 15;
  let used = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  if (used >= cap) { toast(t('watch.title'), t('watch.capReached'), 'warning'); return; }
  const btn = el('watchAdBtn');
  const cdVal = el('watchCountdownValue');
  const ringBar = document.querySelector('#watchCountdownRing .acr-bar');
  const reward = State.settings.adReward || 120;
  if (btn) btn.disabled = true;
  const dur = 8;
  let t2 = dur;
  const circumference = 326.7;
  function step() {
    if (cdVal) cdVal.textContent = t2;
    if (ringBar) ringBar.style.strokeDashoffset = String(circumference * (1 - (dur - t2) / dur));
    if (t2 <= 0) {
      clearInterval(interval);
      if (btn) { btn.disabled = false; btn.innerHTML = '🎬 ' + t('watch.watchNow'); }
      grantAdReward(reward);
    }
    t2--;
  }
  step();
  const interval = setInterval(step, 1000);
}

async function grantAdReward(reward) {
  const pf = State.profile || {};
  const used = (pf.adsDate === todayKey()) ? (pf.adsWatchedToday || 0) : 0;
  const cap = State.settings.adDailyCap || 15;
  if (used >= cap) { toast(t('watch.title'), t('watch.capReached'), 'warning'); return; }
  await addLedger(State.user.uid, 'ad', t('ledger.adReward'), reward, 'completed', { ref: 'AD-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({
    adsWatchedToday: used + 1,
    adsDate: todayKey(),
    xp: increment(2),
    lastSeen: serverTimestamp()
  }).catch(function() {});
  State.profile.adsWatchedToday = used + 1;
  State.profile.adsDate = todayKey();
  updateBalanceUI();
  renderWatch();
  showRewardPopup(reward, t('ledger.adReward'));
}

async function dailyAdBonus() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.adBonusDate === todayKey()) { toast('', t('watch.bonusClaimed'), 'warning'); return; }
  await addLedger(State.user.uid, 'daily', t('ledger.adBonus'), 300, 'completed', { ref: 'ADB-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({ adBonusDate: todayKey(), lastSeen: serverTimestamp() }).catch(function() {});
  State.profile.adBonusDate = todayKey();
  updateBalanceUI();
  showRewardPopup(300, t('ledger.adBonus'));
}

async function interstitialReward() {
  if (!State.user) { guardAuth(); return; }
  await addLedger(State.user.uid, 'ad', t('ledger.interstitial'), 200, 'completed', { ref: 'INT-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({ xp: increment(2), lastSeen: serverTimestamp() }).catch(function() {});
  updateBalanceUI();
  showRewardPopup(200, t('ledger.interstitial'));
}

async function claimDaily() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.lastClaimDate === todayKey()) { toast(t('daily.title'), t('daily.claimed'), 'info'); return; }
  let streak = pf.streak || 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (pf.lastClaimDate !== yesterday) streak = 0;
  streak++;
  const planIdx = Math.min(6, (streak - 1) % 7);
  const base = DAILY_PLAN[planIdx].reward;
  const mult = streak >= 7 ? 2 : streak >= 4 ? 1.5 : 1;
  const reward = Math.round(base * mult);
  const claimedDays = (pf.claimedDays || []).slice();
  const claimedDay = ((streak - 1) % 7) + 1;
  if (claimedDays.indexOf(claimedDay) === -1) claimedDays.push(claimedDay);
  await addLedger(State.user.uid, 'daily', t('ledger.dailyClaim').replace('{n}', streak), reward, 'completed', { ref: 'DAY-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({
    streak: streak,
    bestStreak: Math.max(pf.bestStreak || 0, streak),
    lastClaimDate: todayKey(),
    claimedDays: claimedDays,
    xp: increment(5),
    lastSeen: serverTimestamp()
  }).catch(function() {});
  State.profile.streak = streak;
  State.profile.bestStreak = Math.max(pf.bestStreak || 0, streak);
  State.profile.lastClaimDate = todayKey();
  State.profile.claimedDays = claimedDays;
  updateBalanceUI();
  if (State.currentPage === 'daily' || State.currentPage === 'checkin') { renderDaily(); renderCheckin(); }
  showRewardPopup(reward, t('ledger.dailyClaim').replace('{n}', streak));
  await colRef('notifications').add({
    uid: State.user.uid, type: 'daily',
    title: t('notif.dailyDone'), body: '+' + fmtNum(reward) + ' · ' + t('notif.streak') + ' ' + streak,
    read: false, createdAt: serverTimestamp()
  }).catch(function() {});
}

async function spinWheel() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  if (pf.wheelSpunDate === todayKey()) { toast('', t('daily.wheelSpun'), 'info'); return; }
  const wheel = el('spinWheel');
  if (!wheel) return;
  const winIdx = Math.floor(Math.random() * WHEEL_SLICES.length);
  const reward = WHEEL_SLICES[winIdx].reward;
  const deg = 1440 + winIdx * 45 + (Math.random() * 40 - 20);
  wheel.style.transition = 'transform 4.5s cubic-bezier(0.17,0.67,0.12,0.99)';
  wheel.style.transform = 'rotate(' + deg + 'deg)';
  const st = el('spinWheelStatus');
  if (st) st.textContent = t('daily.spinning');
  const btn = el('spinWheelBtn');
  if (btn) btn.disabled = true;
  setTimeout(async function() {
    await addLedger(State.user.uid, 'daily', t('ledger.wheel'), reward, 'completed', { ref: 'WHL-' + uid().slice(0, 8) });
    await colRef('users').doc(State.user.uid).update({ wheelSpunDate: todayKey(), xp: increment(3), lastSeen: serverTimestamp() }).catch(function() {});
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
  const rewards = [50, 100, 150, 200, 300];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  if (cover) { cover.textContent = '🎉'; setTimeout(function() { cover.style.display = 'none'; }, 350); }
  if (result) result.textContent = '+' + fmtNum(reward);
  if (st) st.textContent = t('daily.scratchDone');
  await addLedger(State.user.uid, 'daily', t('ledger.scratch'), reward, 'completed', { ref: 'SCR-' + uid().slice(0, 8) });
  await colRef('users').doc(State.user.uid).update({ scratchDate: todayKey(), scratchReward: reward, lastSeen: serverTimestamp() }).catch(function() {});
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
  const rewards = [100, 200, 300, 500, 1000];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  box.classList.add('shaking');
  if (st) st.textContent = t('daily.opening');
  setTimeout(async function() {
    box.classList.remove('shaking');
    box.textContent = '🎉';
    box.classList.add('opened');
    if (st) st.textContent = t('daily.mysteryDone');
    await addLedger(State.user.uid, 'daily', t('ledger.mystery'), reward, 'completed', { ref: 'MYS-' + uid().slice(0, 8) });
    await colRef('users').doc(State.user.uid).update({ mysteryDate: todayKey(), lastSeen: serverTimestamp() }).catch(function() {});
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
  setTimeout(async function() {
    chest.classList.remove('shaking');
    chest.textContent = '💎';
    chest.classList.add('opened');
    if (st) st.textContent = t('daily.treasureDone');
    await addLedger(State.user.uid, 'daily', t('ledger.treasure'), reward, 'completed', { ref: 'TRS-' + uid().slice(0, 8) });
    await colRef('users').doc(State.user.uid).update({ treasureDate: todayKey(), lastSeen: serverTimestamp() }).catch(function() {});
    State.profile.treasureDate = todayKey();
    updateBalanceUI();
    showRewardPopup(reward, t('ledger.treasure'));
  }, 900);
}

async function confirmTopup() {
  if (!State.user) { guardAuth(); return; }
  const game = document.querySelector('#topupGameList .reward-item.selected');
  const pkg = State.selectedTopupPackage;
  const playerId = el('topupPlayerId').value.trim();
  if (!game) return toast(t('topup.title'), t('topup.selectGameFirst'), 'warning');
  if (!playerId) return toast(t('topup.title'), t('topup.enterPlayerId'), 'warning');
  const cost = pkg ? pkg.cost : 4500;
  const w = State.wallet || { coins: 0 };
  if (w.coins < cost) { toast(t('topup.title'), t('err.insufficient'), 'warning'); return; }
  const label = pkg ? pkg.label : '';
  const gameName = game.getAttribute('data-game');
  const ok = await askConfirm(t('topup.confirm'), t('topup.confirmBody').replace('{n}', fmtNum(cost)).replace('{g}', gameName).replace('{p}', label), t('popup.confirm'), false);
  if (!ok) return;
  await addLedger(State.user.uid, 'topup', t('ledger.topup').replace('{g}', gameName), -cost, 'completed', { ref: 'TOP-' + uid().slice(0, 8) });
  await colRef('orders').add({
    uid: State.user.uid,
    type: 'topup',
    item: gameName,
    package: label,
    cost: cost,
    playerId: playerId,
    serverId: el('topupServerId') ? el('topupServerId').value.trim() : '',
    status: 'pending',
    createdAt: serverTimestamp()
  }).catch(function() {});
  updateBalanceUI();
  toast(t('topup.success'), t('topup.successSub'), 'success');
  celebrate();
}

async function requestWithdrawal() {
  if (!State.user) { guardAuth(); return; }
  const w = State.wallet || { coins: 0, pending: 0 };
  const min = State.settings.minWithdraw || 10000;
  const amount = parseFloat(el('wdAmount').value) || 0;
  if (amount < min) return toast(t('withdraw.title'), t('withdraw.tooSmall').replace('{n}', fmtNum(min)), 'warning');
  if (amount > w.coins) return toast(t('withdraw.title'), t('err.insufficient'), 'warning');
  if (w.pending > 0) return toast(t('withdraw.title'), t('withdraw.pendingExists'), 'warning');
  const methodName = State.selectedWdMethod || 'PayPal';
  const ok = await askConfirm(t('withdraw.confirm'), t('withdraw.confirmBody').replace('{n}', fmtNum(amount)).replace('{m}', methodName), t('popup.confirm'), false);
  if (!ok) return;
  await addLedger(State.user.uid, 'withdrawal', t('ledger.withdrawal') + ' · ' + methodName, -amount, 'pending', { ref: 'WD-' + uid().slice(0, 8), provider: methodName });
  await colRef('withdrawals').add({
    uid: State.user.uid,
    amount: amount,
    method: methodName,
    usd: amount / (State.settings.coinRate || 10000),
    status: 'pending',
    createdAt: serverTimestamp()
  }).catch(function() {});
  updateBalanceUI();
  toast(t('withdraw.requested'), t('withdraw.requestedSub'), 'success');
  el('wdAmount').value = '';
  updateWdSummary();
}

async function applyPromo(code) {
  if (!State.user) { guardAuth(); return; }
  const promos = State.promos;
  const p = promos.find(function(x) { return x.code && x.code.toUpperCase() === String(code).toUpperCase(); });
  if (!p) return toast(t('promo.title'), t('promo.invalid'), 'error');
  const pf = State.profile || {};
  const usedPromos = pf.usedPromos || [];
  if (usedPromos.indexOf(p.code) !== -1) return toast(t('promo.title'), t('promo.used'), 'warning');
  const reward = p.reward || 0;
  await addLedger(State.user.uid, 'promo', t('ledger.promo').replace('{n}', p.code), reward, 'completed', { ref: 'PRM-' + uid().slice(0, 8) });
  usedPromos.push(p.code);
  await colRef('users').doc(State.user.uid).update({ usedPromos: usedPromos, lastSeen: serverTimestamp() }).catch(function() {});
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
    subject: subject,
    message: msg,
    category: el('ticketCategory').value,
    status: 'open',
    ticketId: 'TK-' + uid().slice(0, 8),
    createdAt: serverTimestamp()
  }).catch(function(e) { toast(t('support.title'), e.message, 'error'); });
  closeModal('genericModal');
  toast(t('support.sent'), t('support.sentSub'), 'success');
}

function sendChatMsg() {
  const inp = el('chatInput');
  const body = el('chatBody');
  if (!inp || !body) return;
  const msg = inp.value.trim();
  if (!msg) return;
  body.innerHTML += '<div class="msg user">' + esc(msg) + '</div>';
  inp.value = '';
  body.scrollTop = body.scrollHeight;
  setTimeout(function() {
    body.innerHTML += '<div class="msg admin">' + t('chat.autoReply') + '</div>';
    body.scrollTop = body.scrollHeight;
  }, 1200);
}

async function markAllRead() {
  if (!State.user) return;
  try {
    const snap = await colRef('notifications').where('uid', '==', State.user.uid).where('read', '==', false).get();
    const batch = db.batch();
    snap.forEach(function(d) { batch.update(d.ref, { read: true }); });
    await batch.commit();
  } catch (e) {}
  renderNotifications();
}

async function clearNotifs() {
  if (!State.user) return;
  const ok = await askConfirm(t('notifications.title'), t('notifications.clearConfirm'), t('popup.confirm'));
  if (!ok) return;
  try {
    const snap = await colRef('notifications').where('uid', '==', State.user.uid).get();
    const batch = db.batch();
    snap.forEach(function(d) { batch.delete(d.ref); });
    await batch.commit();
  } catch (e) {}
  renderNotifications();
}

async function copyRefLink() {
  const inp = el('refLinkInput');
  if (inp) {
    const ok = await copyText(inp.value);
    if (ok) toast(t('referral.title'), t('referral.copied'), 'success');
  }
}

function shareRefLink() {
  const inp = el('refLinkInput');
  const url = inp ? inp.value : location.href;
  if (navigator.share) {
    navigator.share({ title: t('referral.share'), text: t('referral.shareMsg'), url: url }).catch(function() {});
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
      referredName: pf.username || '', code: code, status: 'joined', createdAt: serverTimestamp()
    }).catch(function() {});
    toast(t('referral.title'), t('referral.applied'), 'success');
  } catch (e) { toast(t('referral.title'), e.message, 'error'); }
}

function openProfileEdit() {
  if (!State.user) { guardAuth(); return; }
  const pf = State.profile || {};
  el('editUsername').value = pf.username || '';
  const preview = el('avatarPreview');
  if (preview) preview.src = pf.avatar || '';
  openModal('profileEditModal');
}

function previewAvatar(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    const img = el('avatarPreview');
    if (img) img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  if (!State.user) return;
  const username = el('editUsername').value.trim();
  if (!username || username.length < 3) return toast(t('profile.edit'), t('err.username'), 'warning');
  const country = el('editCountry').value;
  const countryName = el('editCountry').selectedOptions.length ? el('editCountry').selectedOptions[0].textContent : country;
  const avatar = el('avatarPreview').src || '';
  await colRef('users').doc(State.user.uid).update({
    username: username,
    country: countryName,
    avatar: avatar,
    lastSeen: serverTimestamp()
  }).catch(function(e) { toast(t('profile.edit'), e.message, 'error'); });
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
    await colRef('users').doc(State.user.uid).update({ 'verification.twoFa': false, lastSeen: serverTimestamp() }).catch(function() {});
    toast(t('security.twoFa'), t('security.twoFaDisabled'), 'info');
  } else {
    await colRef('users').doc(State.user.uid).update({ 'verification.twoFa': true, lastSeen: serverTimestamp() }).catch(function() {});
    toast(t('security.twoFa'), t('security.twoFaEnabled'), 'success');
  }
  State.profile.verification = Object.assign({}, State.profile.verification, { twoFa: !(v.twoFa) });
  renderSecurity();
}

async function logout() {
  await auth.signOut().catch(function() {});
  closeModal('authModal');
  navigate('home');
  toast(t('auth.logout'), '', 'info');
}

async function deleteAccount() {
  if (!State.user) return;
  const ok = await askConfirm(t('profile.deleteAccount'), t('security.deleteConfirm'), t('popup.confirm'));
  if (!ok) return;
  await colRef('users').doc(State.user.uid).update({ status: 'deleted', lastSeen: serverTimestamp() }).catch(function() {});
  try { await auth.currentUser.delete(); } catch (e) {}
  toast(t('profile.deleteAccount'), t('security.deleted'), 'success');
  logout();
}

/* ============================================================================
   18. REAL-TIME LISTENERS + AUTH STATE + BOOT
============================================================================ */
function watchUser() {
  auth.onAuthStateChanged(function(user) {
    State.user = user;
    if (!user) {
      State.profile = null;
      State.wallet = null;
      const pill = el('navBalance');
      if (pill) pill.style.display = 'none';
      const loginBtn = el('loginBtn');
      if (loginBtn) loginBtn.innerHTML = '<span data-i18n="auth.login">' + t('auth.login') + '</span>';
      renderAccountStatusStrip();
      renderPage(State.currentPage || 'home');
      return;
    }
    // Update login button to show logout
    const loginBtn = el('loginBtn');
    if (loginBtn) loginBtn.innerHTML = '<span data-i18n="auth.logout">' + t('auth.logout') + '</span>';
    colRef('users').doc(user.uid).onSnapshot(function(snap) {
      if (snap.exists) {
        State.profile = Object.assign({}, snap.data(), { uid: user.uid });
        updateBalanceUI();
        renderAccountStatusStrip();
        const refresh = ['home', 'profile', 'security', 'daily', 'watch', 'referral', 'wallet', 'transactions', 'history', 'streaks', 'checkin', 'tasks'];
        if (refresh.indexOf(State.currentPage) !== -1) renderPage(State.currentPage);
      }
    }, function(err) { console.warn('profile listener', err); });
    colRef('ledger').where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(30).onSnapshot(function() {
      updateBalanceUI();
    }, function() {});
    colRef('notifications').where('uid', '==', user.uid).onSnapshot(function(snap) {
      let unread = 0;
      snap.forEach(function(d) {
        if (!d.data().read) unread++;
      });
      const badge = el('notifBadge');
      if (badge) {
        badge.textContent = unread;
        badge.classList.toggle('hidden', unread === 0);
      }
    }, function() {});
  });
}

function watchCatalog() {
  colRef('offers').onSnapshot(function(snap) {
    State.offers = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }).filter(function(o) { return o.active !== false; });
    State.catalogLoaded = true;
    if (['home', 'earn', 'offers'].indexOf(State.currentPage) !== -1) renderPage(State.currentPage);
  }, function() {});
  colRef('games').onSnapshot(function(snap) {
    State.games = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }).filter(function(g) { return g.active !== false; });
    if (['home', 'games'].indexOf(State.currentPage) !== -1) renderPage(State.currentPage);
  }, function() {});
  colRef('surveys').onSnapshot(function(snap) {
    State.surveys = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }).filter(function(s) { return s.active !== false; });
    if (['home', 'surveys'].indexOf(State.currentPage) !== -1) renderPage(State.currentPage);
  }, function() {});
  colRef('rewards').onSnapshot(function(snap) {
    State.rewards = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }).filter(function(r) { return r.active !== false; });
    if (['home', 'rewards', 'topup'].indexOf(State.currentPage) !== -1) renderPage(State.currentPage);
  }, function() {});
  colRef('settings/global').onSnapshot(function(snap) {
    if (snap.exists) Object.assign(State.settings, snap.data());
  }, function() {});
}

async function boot() {
  // Apply saved theme & lang
  setTheme(State.theme);
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
  // Build particles
  const particlesEl = el('particles');
  if (particlesEl) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      p.style.width = p.style.height = (4 + Math.random() * 6) + 'px';
      particlesEl.appendChild(p);
    }
  }
  // Scroll reveal observer
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  $$('.reveal').forEach(function(el2) { observer.observe(el2); });
  // Check referral code in URL
  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');
  if (ref) {
    const input = el('signupReferralCode');
    if (input) input.value = ref;
    const cb = el('signupReferral');
    if (cb) { cb.checked = true; el('referralCodeWrap').classList.remove('hidden'); }
  }
  navigate('home');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ============================================================================
   END OF APP.JS — ALL SYSTEMS OPERATIONAL
============================================================================ */
