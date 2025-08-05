// User State
let currentUser = null;
let userPoints = 0;

// DOM Elements
let authModal, userDashboard, phantomLoginBtn, googleLoginBtn, closeAuthBtn;

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function() {
  authModal = document.getElementById("authModal");
  userDashboard = document.getElementById("userDashboard");
  phantomLoginBtn = document.getElementById("phantomLogin");
  googleLoginBtn = document.getElementById("googleLogin");
  closeAuthBtn = document.getElementById("closeAuth");
  
  console.log("Auth elements loaded:", {
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
    phantomLoginBtn.addEventListener("click", loginWithPhantom);
  }
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", loginWithGoogle);
  }
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener("click", hideAuthModal);
  }

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", showAuthModal);
  }

  const mobileLoginBtn = document.getElementById("mobileLoginBtn");
  if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener("click", showAuthModal);
  }
  
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) {
        hideAuthModal();
      }
    });
  }
}

// Phantom Wallet Login
async function loginWithPhantom() {
  try {
    console.log("Attempting Phantom login...");
    // Check if we\"re on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log("Mobile device detected. Opening Phantom app.");
      // On mobile, try to open Phantom app
      const phantomAppUrl = "https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href);
      window.open(phantomAppUrl, "_blank");
      showInfoMessage("Opening Phantom app... Please connect your wallet there.");
      return;
    }
    
    // Desktop: Check for Phantom extension
    if (!window.solana || !window.solana.isPhantom) {
      console.warn("Phantom Wallet not detected.");
      showInfoMessage("Phantom Wallet not detected. Please install the Phantom extension.");
      window.open("https://phantom.app/", "_blank");
      return;
    }

    console.log("Phantom Wallet detected. Attempting to connect...");
    // Connect to Phantom
    const response = await window.solana.connect();
    const publicKey = response.publicKey.toString();
    console.log("Phantom connected. Public Key:", publicKey);
    
    currentUser = {
      uid: publicKey,
      email: null,
      displayName: `Phantom-${publicKey.substring(0, 8)}`,
      photoURL: null,
      walletAddress: publicKey,
      loginMethod: "phantom"
    };
    
    console.log("Current user set:", currentUser);
    loadUserDashboard();
    hideAuthModal();
    showSuccessMessage("Successfully logged in with Phantom");
  } catch (error) {
    console.error("Phantom login error:", error);
    if (error.code === 4001) {
      showErrorMessage("Connection cancelled by user");
    } else {
      showErrorMessage("Failed to connect to Phantom wallet");
    }
  }
}

// Google Login
async function loginWithGoogle() {
  try {
    console.log("Attempting Google login...");
    // Ensure Firebase Auth is initialized
    if (!firebase.auth) {
      console.error("Firebase Auth not initialized. Make sure Firebase SDK is loaded and initialized.");
      showErrorMessage("Firebase Auth not ready. Please try again later.");
      return;
    }

    if (!firebase.auth().currentUser) {
      console.log("No current Firebase user. Initiating Google sign-in popup.");
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");
      
      console.log("Calling signInWithPopup...");
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      console.log("Google login successful. User:", user);
      
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "Google User",
        photoURL: user.photoURL,
        walletAddress: null,
        loginMethod: "google"
      };

      // Attempt to create user in Firestore
      if (window.wonkDB) {
        console.log("Attempting to create/get user in Firestore...");
        await window.wonkDB.createUser(currentUser.uid, currentUser);
        console.log("User record in Firestore processed.");
      } else {
        console.warn("wonkDB not available. User will not be saved to Firestore.");
      }

    } else {
      console.log("Firebase user already signed in.");
      // User already signed in
      const user = firebase.auth().currentUser;
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "Google User",
        photoURL: user.photoURL,
        walletAddress: null,
        loginMethod: "google"
      };
    }
    
    console.log("Current user set:", currentUser);
    loadUserDashboard();
    hideAuthModal();
    showSuccessMessage("Successfully logged in with Google");
  } catch (error) {
    console.error("Google login error:", error);
    if (error.code === "auth/popup-closed-by-user") {
      showErrorMessage("Login cancelled by user");
    } else if (error.code === "auth/popup-blocked") {
      showErrorMessage("Popup blocked. Please allow popups for this site.");
    } else if (error.code === "auth/network-request-failed") {
      showErrorMessage("Network error. Please check your internet connection.");
    } else {
      showErrorMessage(`Error logging in with Google: ${error.message}. Please try again.`);
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
  
  userDashboard.classList.remove("hidden");
  loadVotingCards();
  startLiveVotesFeed();
  loadUserPoints();
}

// Hide Dashboard
function hideDashboard() {
  if (userDashboard) {
    userDashboard.classList.add("hidden");
  }
}

// Show Auth Modal
function showAuthModal() {
  if (authModal) {
    authModal.classList.remove("hidden");
    authModal.classList.add("flex");
  }
}

// Hide Auth Modal
function hideAuthModal() {
  if (authModal) {
    authModal.classList.add("hidden");
    authModal.classList.remove("flex");
  }
}

// Load User Points
async function loadUserPoints() {
  try {
    if (window.wonkDB && currentUser) {
      let userData = await window.wonkDB.getUser(currentUser.uid);
      
      if (!userData) {
        console.log("User not found in DB, creating new user.");
        userData = await window.wonkDB.createUser(currentUser.uid, {
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          walletAddress: currentUser.walletAddress || null,
          loginMethod: currentUser.loginMethod || "unknown"
        });
      } else {
        console.log("User found in DB, updating last login.");
        await window.wonkDB.updateLastLogin(currentUser.uid);
      }
      
      userPoints = userData.points || 1000;
      console.log("User points loaded:", userPoints);
      
      const pointsDisplay = document.getElementById("userPointsDisplay");
      if (pointsDisplay) {
        pointsDisplay.textContent = userPoints.toLocaleString();
      }

      startUserDataListener();
    } else {
      console.log("wonkDB or currentUser not available. Loading points from localStorage (demo mode).");
      const savedPoints = localStorage.getItem(`user_points_${currentUser?.uid}`);
      userPoints = savedPoints ? parseInt(savedPoints) : 1000;
      
      const pointsDisplay = document.getElementById("userPointsDisplay");
      if (pointsDisplay) {
        pointsDisplay.textContent = userPoints.toLocaleString();
      }
    }
  } catch (error) {
    console.error("Error loading user points:", error);
    userPoints = 1000;
    
    const pointsDisplay = document.getElementById("userPointsDisplay");
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
  }
}

// Save User Points
async function saveUserPoints() {
  try {
    if (window.wonkDB && currentUser) {
      console.log("Saving user points to DB:", userPoints);
      await window.wonkDB.updateUserPoints(currentUser.uid, userPoints);
    } else {
      console.log("wonkDB or currentUser not available. Saving points to localStorage (demo mode).");
      localStorage.setItem(`user_points_${currentUser?.uid || "demo"}`, userPoints.toString());
    }
  } catch (error) {
    console.error("Error saving user points:", error);
    localStorage.setItem(`user_points_${currentUser?.uid || "demo"}`, userPoints.toString());
  }
}

// Load Voting Cards
async function loadVotingCards() {
  try {
    let cryptos;
    
    if (window.wonkDB) {
      console.log("Loading cryptos from DB.");
      cryptos = await window.wonkDB.getCryptos();
    }
    
    if (!cryptos || cryptos.length === 0) {
      console.log("No cryptos found in DB or wonkDB not available. Using default cryptos.");
      cryptos = [
        { name: "MOONSHOT", icon: "🚀", color: "blue", totalVotes: 2150 },
        { name: "DIAMOND", icon: "💎", color: "green", totalVotes: 1250 },
        { name: "LIGHTNING", icon: "⚡", color: "purple", totalVotes: 750 },
        { name: "ROCKET", icon: "🌙", color: "yellow", totalVotes: 890 },
        { name: "FIRE", icon: "🔥", color: "red", totalVotes: 1120 },
        { name: "STAR", icon: "⭐", color: "orange", totalVotes: 680 }
      ];
    }

    const votingCards = document.getElementById("votingCards");
    if (!votingCards) return;

    votingCards.innerHTML = cryptos.map(crypto => `
      <div class="glass-panel p-6 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer" onclick="voteForCrypto(\'${crypto.name}\', 10)">
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
    `).join("");
  } catch (error) {
    console.error("Error loading voting cards:", error);
  }
}

// Vote for Crypto
async function voteForCrypto(cryptoName, cost) {
  if (userPoints < cost) {
    showErrorMessage("Insufficient points! Please buy more points.");
    return;
  }

  try {
    if (window.wonkDB && currentUser) {
      console.log(`Recording vote for ${cryptoName} by ${currentUser.uid}`);
      await window.wonkDB.recordVote(currentUser.uid, cryptoName, cost);
      await window.wonkDB.recordTransaction(currentUser.uid, "vote", cost, {
        cryptoName: cryptoName,
        action: "vote_cast"
      });
    }
    
    userPoints -= cost;
    await saveUserPoints();
    
    const pointsDisplay = document.getElementById("userPointsDisplay");
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
    
    addVoteToFeed(currentUser.uid, cryptoName);
    showSuccessMessage(`Successfully voted for ${cryptoName}!`);
    
    setTimeout(() => {
      loadVotingCards();
    }, 1000);
    
  } catch (error) {
    console.error("Error voting:", error);
    showErrorMessage("Failed to cast vote. Please try again.");
  }
}

// Start Live Votes Feed
function startLiveVotesFeed() {
  const liveVotesFeed = document.getElementById("liveVotesFeed");
  if (!liveVotesFeed) return;
  
  if (window.wonkDB) {
    console.log("Starting live votes listener from DB.");
    const unsubscribe = window.wonkDB.listenToRecentVotes((votes) => {
      liveVotesFeed.innerHTML = votes.map(vote => `
        <div class="flex items-center justify-between p-3 mb-2 bg-black bg-opacity-30 rounded-lg animate-fade-in">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-b
(Content truncated due to size limit. Use page ranges or line ranges to read remaining content)
