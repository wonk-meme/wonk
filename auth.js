// User State
let currentUser = null;
let userPoints = 0;

// DOM Elements
let authModal, userDashboard, phantomLoginBtn, googleLoginBtn, closeAuthBtn;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  authModal = document.getElementById('authModal');
  userDashboard = document.getElementById('userDashboard');
  phantomLoginBtn = document.getElementById('phantomLogin');
  googleLoginBtn = document.getElementById('googleLogin');
  closeAuthBtn = document.getElementById('closeAuth');
  
  console.log('Auth elements loaded:', {
    authModal: !!authModal,
    userDashboard: !!userDashboard,
    phantomLoginBtn: !!phantomLoginBtn,
    googleLoginBtn: !!googleLoginBtn,
    closeAuthBtn: !!closeAuthBtn
  });
  
  setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
  if (phantomLoginBtn) {
    phantomLoginBtn.addEventListener('click', loginWithPhantom);
  }
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', loginWithGoogle);
  }
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', hideAuthModal);
  }
  
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        hideAuthModal();
      }
    });
  }
}

// Phantom Wallet Login
async function loginWithPhantom() {
  try {
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, try to open Phantom app
      const phantomAppUrl = 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href);
      window.open(phantomAppUrl, '_blank');
      showInfoMessage('Opening Phantom app... Please connect your wallet there.');
      return;
    }
    
    // Desktop: Check for Phantom extension
    if (!window.solana || !window.solana.isPhantom) {
      showInfoMessage('Phantom Wallet not detected. Please install the Phantom extension.');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    // Connect to Phantom
    const response = await window.solana.connect();
    const publicKey = response.publicKey.toString();
    
    currentUser = {
      uid: publicKey,
      email: null,
      displayName: `Phantom-${publicKey.substring(0, 8)}`,
      photoURL: null,
      walletAddress: publicKey,
      loginMethod: 'phantom'
    };
    
    loadUserDashboard();
    hideAuthModal();
    showSuccessMessage('Successfully logged in with Phantom');
  } catch (error) {
    console.error('Phantom login error:', error);
    if (error.code === 4001) {
      showErrorMessage('Connection cancelled by user');
    } else {
      showErrorMessage('Failed to connect to Phantom wallet');
    }
  }
}

// Google Login
async function loginWithGoogle() {
  try {
    // Initialize Firebase Auth if not already done
    if (!firebase.auth().currentUser) {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Google User',
        photoURL: user.photoURL,
        walletAddress: null,
        loginMethod: 'google'
      };
    } else {
      // User already signed in
      const user = firebase.auth().currentUser;
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Google User',
        photoURL: user.photoURL,
        walletAddress: null,
        loginMethod: 'google'
      };
    }
    
    loadUserDashboard();
    hideAuthModal();
    showSuccessMessage('Successfully logged in with Google');
  } catch (error) {
    console.error('Google login error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      showErrorMessage('Login cancelled by user');
    } else if (error.code === 'auth/popup-blocked') {
      showErrorMessage('Popup blocked. Please allow popups for this site.');
    } else {
      showErrorMessage('Error logging in with Google. Please try again.');
    }
  }
}

// Load User Dashboard
function loadUserDashboard() {
  if (!userDashboard) return;
  
  userDashboard.innerHTML = `
    <div class="fixed top-0 left-0 w-full h-full bg-gradient-to-b from-gray-900 to-black z-40">
      <!-- Header -->
      <header class="cyber-header w-full">
        <div class="container mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <!-- Logo & Title -->
            <div class="flex items-center">
              <div class="logo-glow">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xl font-bold">W</div>
              </div>
              <span class="ml-3 text-2xl font-bold glow-blue font-mono">WONK VOTE</span>
            </div>

            <!-- User Info & Points -->
            <div class="flex items-center space-x-4">
              <div class="glass-panel px-6 py-2 rounded-full">
                <div class="flex items-center space-x-3">
                  <div class="text-right">
                    <div class="text-sm text-gray-400">Your Points</div>
                    <div class="text-xl font-bold glow-gold" id="userPointsDisplay">${userPoints.toLocaleString()}</div>
                  </div>
                  <div class="w-10 h-10 bg-gradient-to-br from-gold-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-coins text-lg"></i>
                  </div>
                </div>
              </div>
              
              <button onclick="buyPoints()" class="action-btn">
                <i class="fas fa-plus mr-2"></i>
                Buy Points
              </button>
              
              <button onclick="logout()" class="nav-item">
                <i class="fas fa-sign-out-alt mr-2"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="pt-24 pb-20 px-6">
        <div class="container mx-auto max-w-6xl">
          <!-- Voting Section -->
          <div class="mb-12">
            <h1 class="text-4xl font-bold text-center mb-4 glow-blue font-mono">CRYPTO VOTING ARENA</h1>
            <p class="text-center text-xl mb-8 text-gray-300">Vote for your favorite crypto - Each vote costs 10 points</p>
            
            <!-- Voting Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12" id="votingCards">
              <!-- Voting cards will be loaded here -->
            </div>
          </div>

          <!-- Live Votes Feed -->
          <div class="glass-panel p-6 rounded-3xl">
            <h2 class="text-2xl font-bold text-center mb-6 glow-gold">LIVE VOTES FEED</h2>
            <div class="h-96 overflow-y-auto" id="liveVotesFeed">
              <!-- Live votes will be loaded here -->
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  
  userDashboard.classList.remove('hidden');
  loadVotingCards();
  startLiveVotesFeed();
  loadUserPoints();
}

// Hide Dashboard
function hideDashboard() {
  if (userDashboard) {
    userDashboard.classList.add('hidden');
  }
}

// Show Auth Modal
function showAuthModal() {
  if (authModal) {
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');
  }
}

// Hide Auth Modal
function hideAuthModal() {
  if (authModal) {
    authModal.classList.add('hidden');
    authModal.classList.remove('flex');
  }
}

// Load User Points
async function loadUserPoints() {
  try {
    if (window.wonkDB && currentUser) {
      let userData = await wonkDB.getUser(currentUser.uid);
      
      if (!userData) {
        userData = await wonkDB.createUser(currentUser.uid, {
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          walletAddress: currentUser.walletAddress || null,
          loginMethod: currentUser.loginMethod || 'unknown'
        });
      } else {
        await wonkDB.updateLastLogin(currentUser.uid);
      }
      
      userPoints = userData.points || 1000;
      
      const pointsDisplay = document.getElementById('userPointsDisplay');
      if (pointsDisplay) {
        pointsDisplay.textContent = userPoints.toLocaleString();
      }

      startUserDataListener();
    } else {
      const savedPoints = localStorage.getItem(`user_points_${currentUser.uid}`);
      userPoints = savedPoints ? parseInt(savedPoints) : 1000;
      
      const pointsDisplay = document.getElementById('userPointsDisplay');
      if (pointsDisplay) {
        pointsDisplay.textContent = userPoints.toLocaleString();
      }
    }
  } catch (error) {
    console.error('Error loading user points:', error);
    userPoints = 1000;
    
    const pointsDisplay = document.getElementById('userPointsDisplay');
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
  }
}

// Save User Points
async function saveUserPoints() {
  try {
    if (window.wonkDB && currentUser) {
      await wonkDB.updateUserPoints(currentUser.uid, userPoints);
    } else {
      localStorage.setItem(`user_points_${currentUser?.uid || 'demo'}`, userPoints.toString());
    }
  } catch (error) {
    console.error('Error saving user points:', error);
    localStorage.setItem(`user_points_${currentUser?.uid || 'demo'}`, userPoints.toString());
  }
}

// Load Voting Cards
async function loadVotingCards() {
  try {
    let cryptos;
    
    if (window.wonkDB) {
      cryptos = await wonkDB.getCryptos();
    }
    
    if (!cryptos || cryptos.length === 0) {
      cryptos = [
        { name: 'MOONSHOT', icon: '🚀', color: 'blue', totalVotes: 2150 },
        { name: 'DIAMOND', icon: '💎', color: 'green', totalVotes: 1250 },
        { name: 'LIGHTNING', icon: '⚡', color: 'purple', totalVotes: 750 },
        { name: 'ROCKET', icon: '🌙', color: 'yellow', totalVotes: 890 },
        { name: 'FIRE', icon: '🔥', color: 'red', totalVotes: 1120 },
        { name: 'STAR', icon: '⭐', color: 'orange', totalVotes: 680 }
      ];
    }

    const votingCards = document.getElementById('votingCards');
    if (!votingCards) return;

    votingCards.innerHTML = cryptos.map(crypto => `
      <div class="glass-panel p-6 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer" onclick="voteForCrypto('${crypto.name}', 10)">
        <div class="text-center mb-4">
          <div class="w-16 h-16 bg-gradient-to-br from-${crypto.color}-400 to-${crypto.color}-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
            ${crypto.icon}
          </div>
          <h4 class="text-xl font-bold text-${crypto.color}-400">${crypto.name}</h4>
          <p class="text-gray-400 text-sm">Community Choice</p>
        </div>
        
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-2">
            <span>Total Votes: ${(crypto.totalVotes || 0).toLocaleString()}</span>
            <span class="text-${crypto.color}-400 font-bold">ACTIVE</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-3">
            <div class="bg-gradient-to-r from-${crypto.color}-400 to-${crypto.color}-600 h-3 rounded-full transition-all duration-500" style="width: ${Math.min((crypto.totalVotes || 0) / 30, 100)}%"></div>
          </div>
        </div>

        <div class="bg-black bg-opacity-50 p-3 rounded-lg mb-4">
          <div class="text-xs text-gray-400 mb-1">VOTE COST:</div>
          <div class="flex items-center justify-between">
            <span class="text-${crypto.color}-400 font-bold">10 POINTS</span>
            <i class="fas fa-coins text-gold-400"></i>
          </div>
        </div>

        <div class="action-btn w-full bg-gradient-to-r from-${crypto.color}-400 to-${crypto.color}-600 text-center">
          <i class="fas fa-vote-yea mr-2"></i>
          VOTE NOW
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading voting cards:', error);
  }
}

// Vote for Crypto
async function voteForCrypto(cryptoName, cost) {
  if (userPoints < cost) {
    showErrorMessage('Insufficient points! Please buy more points.');
    return;
  }

  try {
    if (window.wonkDB && currentUser) {
      await wonkDB.recordVote(currentUser.uid, cryptoName, cost);
      await wonkDB.recordTransaction(currentUser.uid, 'vote', cost, {
        cryptoName: cryptoName,
        action: 'vote_cast'
      });
    }
    
    userPoints -= cost;
    await saveUserPoints();
    
    const pointsDisplay = document.getElementById('userPointsDisplay');
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
    
    addVoteToFeed(currentUser.uid, cryptoName);
    showSuccessMessage(`Successfully voted for ${cryptoName}!`);
    
    setTimeout(() => {
      loadVotingCards();
    }, 1000);
    
  } catch (error) {
    console.error('Error voting:', error);
    showErrorMessage('Failed to cast vote. Please try again.');
  }
}

// Start Live Votes Feed
function startLiveVotesFeed() {
  const liveVotesFeed = document.getElementById('liveVotesFeed');
  if (!liveVotesFeed) return;
  
  if (window.wonkDB) {
    const unsubscribe = wonkDB.listenToRecentVotes((votes) => {
      liveVotesFeed.innerHTML = votes.map(vote => `
        <div class="flex items-center justify-between p-3 mb-2 bg-black bg-opacity-30 rounded-lg animate-fade-in">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <i class="fas fa-user text-xs"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-blue-400">${vote.userId.substring(0, 8)}...</div>
              <div class="text-xs text-gray-400">Voted successfully</div>
            </div>
          </div>
          <div class="text-xs text-gray-400">
            ${vote.timestamp ? formatTimeAgo(vote.timestamp.toDate ? vote.timestamp.toDate().getTime() : Date.now()) : 'Just now'}
          </div>
        </div>
      `).join('');
    }, 20);

    window.votesListener = unsubscribe;
  } else {
    const initialVotes = [
      { userId: 'user001', timestamp: Date.now() - 300000 },
      { userId: 'user002', timestamp: Date.now() - 250000 },
      { userId: 'user003', timestamp: Date.now() - 200000 },
      { userId: 'user004', timestamp: Date.now() - 150000 },
      { userId: 'user005', timestamp: Date.now() - 100000 }
    ];

    liveVotesFeed.innerHTML = initialVotes.map(vote => `
      <div class="flex items-center justify-between p-3 mb-2 bg-black bg-opacity-30 rounded-lg animate-fade-in">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <i class="fas fa-user text-xs"></i>
          </div>
          <div>
            <div class="text-sm font-bold text-blue-400">${vote.userId}</div>
            <div class="text-xs text-gray-400">Voted successfully</div>
          </div>
        </div>
        <div class="text-xs text-gray-400">
          ${formatTimeAgo(vote.timestamp)}
        </div>
      </div>
    `).join('');

    setInterval(() => {
      const randomUserId = 'user' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      addVoteToFeed(randomUserId);
    }, Math.random() * 10000 + 5000);
  }
}

// Add Vote to Live Feed
function addVoteToFeed(userId, cryptoName = null) {
  const liveVotesFeed = document.getElementById('liveVotesFeed');
  if (!liveVotesFeed) return;
  
  const voteElement = document.createElement('div');
  voteElement.className = 'flex items-center justify-between p-3 mb-2 bg-black bg-opacity-30 rounded-lg animate-fade-in';
  voteElement.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
        <i class="fas fa-user text-xs"></i>
      </div>
      <div>
        <div class="text-sm font-bold text-blue-400">${userId.substring(0, 8)}...</div>
        <div class="text-xs text-gray-400">Voted successfully</div>
      </div>
    </div>
    <div class="text-xs text-gray-400">
      Just now
    </div>
  `;
  
  liveVotesFeed.insertBefore(voteElement, liveVotesFeed.firstChild);
  
  const votes = liveVotesFeed.children;
  if (votes.length > 20) {
    liveVotesFeed.removeChild(votes[votes.length - 1]);
  }
}

// Buy Points Function
function buyPoints() {
  showBuyPointsModal();
}

// Show Buy Points Modal
function showBuyPointsModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
  modal.innerHTML = `
    <div class="glass-panel p-8 rounded-3xl max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold text-center mb-6 glow-gold">Buy Points</h2>
      <div class="space-y-4">
        <div class="glass-dark p-4 rounded-lg cursor-pointer hover:scale-105 transition-all" onclick="purchasePoints(1000, 0.1)">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-lg font-bold text-blue-400">1,000 Points</div>
              <div class="text-sm text-gray-400">Basic Package</div>
            </div>
            <div class="text-xl font-bold glow-gold">0.1 SOL</div>
          </div>
        </div>
        
        <div class="glass-dark p-4 rounded-lg cursor-pointer hover:scale-105 transition-all" onclick="purchasePoints(5000, 0.45)">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-lg font-bold text-green-400">5,000 Points</div>
              <div class="text-sm text-gray-400">Popular Choice</div>
            </div>
            <div class="text-xl font-bold glow-gold">0.45 SOL</div>
          </div>
        </div>
        
        <div class="glass-dark p-4 rounded-lg cursor-pointer hover:scale-105 transition-all" onclick="purchasePoints(10000, 0.8)">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-lg font-bold text-purple-400">10,000 Points</div>
              <div class="text-sm text-gray-400">Best Value</div>
            </div>
            <div class="text-xl font-bold glow-gold">0.8 SOL</div>
          </div>
        </div>
      </div>
      <button onclick="closeBuyPointsModal()" class="text-gray-400 hover:text-white mt-6 w-full text-center">
        Cancel
      </button>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  document.body.appendChild(modal);
  window.currentBuyModal = modal;
}

// Close Buy Points Modal
function closeBuyPointsModal() {
  if (window.currentBuyModal) {
    document.body.removeChild(window.currentBuyModal);
    window.currentBuyModal = null;
  }
}

// Purchase Points
async function purchasePoints(points, solAmount) {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      alert('Phantom Wallet is required for purchases');
      return;
    }

    showSuccessMessage(`Successfully purchased ${points.toLocaleString()} points!`);
    
    userPoints += points;
    
    if (window.wonkDB && currentUser) {
      await wonkDB.updateUserPoints(currentUser.uid, userPoints);
      await wonkDB.recordTransaction(currentUser.uid, 'purchase', points, {
        solAmount: solAmount,
        package: `${points.toLocaleString()} Points`,
        paymentMethod: 'phantom'
      });
    } else {
      await saveUserPoints();
    }
    
    const pointsDisplay = document.getElementById('userPointsDisplay');
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
    
    closeBuyPointsModal();
  } catch (error) {
    console.error('Purchase error:', error);
    showErrorMessage('Purchase failed. Please try again.');
  }
}

// Logout Function
function logout() {
  cleanupListeners();
  currentUser = null;
  hideDashboard();
  showAuthModal();
  showSuccessMessage('Logged out successfully');
}

// Start user data listener
function startUserDataListener() {
  if (window.wonkDB && currentUser) {
    const unsubscribe = wonkDB.listenToUserData(currentUser.uid, (userData) => {
      if (userData && userData.points !== userPoints) {
        userPoints = userData.points;
        const pointsDisplay = document.getElementById('userPointsDisplay');
        if (pointsDisplay) {
          pointsDisplay.classList.add('points-update');
          pointsDisplay.textContent = userPoints.toLocaleString();
          setTimeout(() => {
            pointsDisplay.classList.remove('points-update');
          }, 500);
        }
      }
    });
    
    window.userDataListener = unsubscribe;
  }
}

// Cleanup listeners when user logs out
function cleanupListeners() {
  if (window.votesListener) {
    window.votesListener();
    window.votesListener = null;
  }
  if (window.userDataListener) {
    window.userDataListener();
    window.userDataListener = null;
  }
}

// Utility Functions
function showSuccessMessage(message) {
  showToast(message, 'success');
}

function showErrorMessage(message) {
  showToast(message, 'error');
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-[9999] p-4 rounded-lg text-white font-bold transition-all duration-300 ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  }`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// CSS Animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.5s ease-out;
  }

  .points-update {
    animation: pointsGlow 0.5s ease-in-out;
  }

  @keyframes pointsGlow {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); filter: brightness(1.3); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);
	


// New Login Button Event Listeners
const desktopLoginBtn = document.getElementById("loginBtn");
const mobileLoginBtn = document.getElementById("mobileLoginBtn");

if (desktopLoginBtn) {
  desktopLoginBtn.addEventListener("click", showAuthModal);
}

if (mobileLoginBtn) {
  mobileLoginBtn.addEventListener("click", showAuthModal);
}



// Helper function to show info messages
function showInfoMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-[10000] animate-fade-in';
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas fa-info-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Update existing message functions to be more consistent
function showSuccessMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[10000] animate-fade-in';
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showErrorMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-[10000] animate-fade-in';
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

