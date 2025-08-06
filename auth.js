// Enhanced Authentication System for WONK
// User State
let currentUser = null;
let userPoints = 0;

// DOM Elements
let authModal, userDashboard, phantomLoginBtn, googleLoginBtn, closeAuthBtn;

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function() {
  console.log("Auth system initializing...");
  
  // Initialize Firebase if not already done
  initializeFirebase();
  
  // Get DOM elements
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
  checkExistingAuth();
});

// Initialize Firebase
function initializeFirebase() {
  try {
    if (!firebase.apps.length) {
      // Firebase configuration - replace with your actual config
      const firebaseConfig = {
        apiKey: "your-api-key",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "your-app-id"
      };
      
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    console.log("Firebase not available, using demo mode");
  }
}

// Check for existing authentication
function checkExistingAuth() {
  try {
    // Check localStorage for stored user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      console.log("Found stored user:", currentUser);
      
      // Check if we're on the main page and should redirect to dashboard
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        console.log("User already logged in, redirecting to dashboard...");
        window.location.href = 'dashboard.html';
        return;
      }
    }
    
    // Check Firebase auth state
    if (firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user && !currentUser) {
          console.log("Firebase user detected:", user);
          currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Google User",
            photoURL: user.photoURL,
            walletAddress: null,
            loginMethod: "google"
          };
          
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          
          // Redirect to dashboard if on main page
          if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
          }
        }
      });
    }
  } catch (error) {
    console.error("Error checking existing auth:", error);
  }
}

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
    
    // Check if Phantom is installed
    if (!window.solana || !window.solana.isPhantom) {
      console.warn("Phantom Wallet not detected.");
      showErrorMessage("Phantom Wallet not detected. Please install the Phantom extension to use this feature.");
      
      // Ask user if they want to install Phantom
      const shouldInstall = confirm("Would you like to visit the Phantom website to install the extension?");
      if (shouldInstall) {
        window.open("https://phantom.app/", "_blank");
      }
      return;
    }

    console.log("Phantom Wallet detected. Attempting to connect...");
    
    showLoadingMessage("Connecting to Phantom Wallet...");
    
    const response = await window.solana.connect();
    const publicKey = response.publicKey.toString();
    console.log("Phantom connected. Public Key:", publicKey);
    
    // Create user object for Phantom login
    currentUser = {
      uid: publicKey,
      email: null,
      displayName: `Phantom-${publicKey.substring(0, 8)}`,
      photoURL: null,
      walletAddress: publicKey,
      loginMethod: "phantom"
    };

    // Store user data
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Create user in database if available
    if (window.wonkDB) {
      try {
        let userData = await window.wonkDB.getUser(currentUser.uid);
        if (!userData) {
          await window.wonkDB.createUser(currentUser.uid, {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            walletAddress: currentUser.walletAddress,
            loginMethod: currentUser.loginMethod
          });
        }
      } catch (error) {
        console.error("Error creating user in database:", error);
      }
    }

    hideLoadingMessage();
    showSuccessMessage("Successfully connected to Phantom Wallet!");
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (error) {
    console.error("Phantom login error:", error);
    hideLoadingMessage();
    
    if (error.code === 4001) {
      showErrorMessage("Connection cancelled by user.");
    } else if (error.code === -32002) {
      showErrorMessage("Connection request already pending. Please check your Phantom wallet.");
    } else {
      showErrorMessage("Failed to connect to Phantom wallet. Please try again.");
    }
  }
}

// Google Login
async function loginWithGoogle() {
  try {
    console.log("Attempting Google login...");
    
    if (!firebase.auth) {
      throw new Error("Firebase authentication not available");
    }
    
    showLoadingMessage("Connecting to Google...");
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    
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
    
    // Store user data
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Create user in database if available
    if (window.wonkDB) {
      try {
        let userData = await window.wonkDB.getUser(currentUser.uid);
        if (!userData) {
          await window.wonkDB.createUser(currentUser.uid, {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            walletAddress: currentUser.walletAddress,
            loginMethod: currentUser.loginMethod
          });
        } else {
          await window.wonkDB.updateLastLogin(currentUser.uid);
        }
      } catch (error) {
        console.error("Error managing user in database:", error);
      }
    }
    
    hideLoadingMessage();
    showSuccessMessage("Successfully logged in with Google!");
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    console.error("Google login error:", error);
    hideLoadingMessage();
    
    if (error.code === "auth/popup-closed-by-user") {
      showErrorMessage("Login cancelled by user");
    } else if (error.code === "auth/popup-blocked") {
      showErrorMessage("Popup blocked. Please allow popups for this site and try again.");
    } else if (error.code === "auth/network-request-failed") {
      showErrorMessage("Network error. Please check your internet connection.");
    } else {
      showErrorMessage("Error logging in with Google. Please try again.");
    }
  }
}

// Show Auth Modal
function showAuthModal() {
  if (authModal) {
    authModal.classList.remove("hidden");
    authModal.classList.add("flex");
    
    // Add modal HTML if it doesn't exist
    if (!authModal.innerHTML.trim()) {
      authModal.innerHTML = `
        <div class="modal-content p-8 rounded-3xl max-w-md w-full mx-4">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              W
            </div>
            <h2 class="text-3xl font-bold glow-blue mb-2">Welcome to WONK</h2>
            <p class="text-gray-400">Choose your login method to start voting</p>
          </div>
          
          <div class="space-y-4">
            <button id="phantomLogin" class="action-btn w-full flex items-center justify-center space-x-3">
              <div class="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                <span class="text-xs font-bold">P</span>
              </div>
              <span>Connect with Phantom</span>
            </button>
            
            <button id="googleLogin" class="action-btn w-full flex items-center justify-center space-x-3">
              <i class="fab fa-google text-xl"></i>
              <span>Continue with Google</span>
            </button>
          </div>
          
          <div class="mt-6 text-center">
            <p class="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
          
          <button id="closeAuth" class="absolute top-4 right-4 text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      `;
      
      // Re-setup event listeners for the new elements
      setupModalEventListeners();
    }
  }
}

// Setup modal event listeners
function setupModalEventListeners() {
  const phantomBtn = document.getElementById("phantomLogin");
  const googleBtn = document.getElementById("googleLogin");
  const closeBtn = document.getElementById("closeAuth");
  
  if (phantomBtn) {
    phantomBtn.addEventListener("click", loginWithPhantom);
  }
  if (googleBtn) {
    googleBtn.addEventListener("click", loginWithGoogle);
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", hideAuthModal);
  }
}

// Hide Auth Modal
function hideAuthModal() {
  if (authModal) {
    authModal.classList.add("hidden");
    authModal.classList.remove("flex");
  }
}

// Logout function
function logout() {
  try {
    console.log("Logging out user...");
    
    // Clear local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem(`user_points_${currentUser?.uid}`);
    
    // Sign out from Firebase
    if (firebase.auth && firebase.auth().currentUser) {
      firebase.auth().signOut();
    }
    
    // Disconnect Phantom if connected
    if (window.solana && window.solana.isConnected) {
      window.solana.disconnect();
    }
    
    // Clear current user
    currentUser = null;
    userPoints = 0;
    
    showSuccessMessage("Successfully logged out!");
    
    // Redirect to main page
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
    
  } catch (error) {
    console.error("Error during logout:", error);
    // Force redirect even if there's an error
    window.location.href = 'index.html';
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
      
    } else {
      console.log("wonkDB or currentUser not available. Loading points from localStorage (demo mode).");
      const savedPoints = localStorage.getItem(`user_points_${currentUser?.uid}`);
      userPoints = savedPoints ? parseInt(savedPoints) : 1000;
    }
    
    // Update points display if element exists
    const pointsDisplay = document.getElementById("userPointsDisplay");
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
    
    return userPoints;
    
  } catch (error) {
    console.error("Error loading user points:", error);
    userPoints = 1000;
    
    const pointsDisplay = document.getElementById("userPointsDisplay");
    if (pointsDisplay) {
      pointsDisplay.textContent = userPoints.toLocaleString();
    }
    
    return userPoints;
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

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
  return currentUser !== null;
}

// Get user points
function getUserPoints() {
  return userPoints;
}

// Set user points
function setUserPoints(points) {
  userPoints = points;
  const pointsDisplay = document.getElementById("userPointsDisplay");
  if (pointsDisplay) {
    pointsDisplay.textContent = userPoints.toLocaleString();
  }
}

// Update user points
async function updateUserPoints(newPoints) {
  userPoints = newPoints;
  await saveUserPoints();
  
  const pointsDisplay = document.getElementById("userPointsDisplay");
  if (pointsDisplay) {
    pointsDisplay.textContent = userPoints.toLocaleString();
  }
}

// Helper functions for messages
function showInfoMessage(message) {
  console.log("INFO:", message);
  showNotification(message, 'info');
}

function showSuccessMessage(message) {
  console.log("SUCCESS:", message);
  showNotification(message, 'success');
}

function showErrorMessage(message) {
  console.error("ERROR:", message);
  showNotification(message, 'error');
}

function showLoadingMessage(message) {
  console.log("LOADING:", message);
  showNotification(message, 'loading');
}

function hideLoadingMessage() {
  hideNotification();
}

// Simple notification system
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.getElementById('auth-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'auth-notification';
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300`;
  
  // Set colors based on type
  switch (type) {
    case 'success':
      notification.className += ' bg-green-600 text-white';
      break;
    case 'error':
      notification.className += ' bg-red-600 text-white';
      break;
    case 'loading':
      notification.className += ' bg-blue-600 text-white';
      break;
    default:
      notification.className += ' bg-gray-600 text-white';
  }
  
  // Add icon based on type
  let icon = '';
  switch (type) {
    case 'success':
      icon = '<i class="fas fa-check-circle mr-2"></i>';
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle mr-2"></i>';
      break;
    case 'loading':
      icon = '<i class="fas fa-spinner fa-spin mr-2"></i>';
      break;
    default:
      icon = '<i class="fas fa-info-circle mr-2"></i>';
  }
  
  notification.innerHTML = `
    <div class="flex items-center">
      ${icon}
      <span>${message}</span>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-hide after 5 seconds (except for loading)
  if (type !== 'loading') {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
}

function hideNotification() {
  const notification = document.getElementById('auth-notification');
  if (notification) {
    notification.remove();
  }
}

// Export functions for global use
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.getUserPoints = getUserPoints;
window.setUserPoints = setUserPoints;
window.updateUserPoints = updateUserPoints;
window.loadUserPoints = loadUserPoints;
window.saveUserPoints = saveUserPoints;
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;
window.showInfoMessage = showInfoMessage;

console.log("Enhanced auth system loaded successfully");

