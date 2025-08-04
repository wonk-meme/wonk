// Admin Dashboard JavaScript
let currentSection = 'dashboard';
let contracts = [];
let users = [];
let votingStats = {};

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
  initializeAdmin();
  loadDashboardData();
});

// Initialize admin functionality
function initializeAdmin() {
  // Check admin authentication (simplified for demo)
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (!isAdmin) {
    // In production, implement proper admin authentication
    localStorage.setItem('isAdmin', 'true'); // For demo purposes
  }
  
  setupEventListeners();
  loadContracts();
  loadUsers();
  loadVotingStats();
}

// Setup event listeners
function setupEventListeners() {
  // Add contract form
  const addContractForm = document.getElementById('addContractForm');
  if (addContractForm) {
    addContractForm.addEventListener('submit', handleAddContract);
  }
}

// Show specific section
function showSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => section.classList.add('hidden'));
  
  // Show selected section
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
  
  // Update sidebar active state
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => item.classList.remove('active'));
  
  const activeItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  
  currentSection = sectionName;
  
  // Load section-specific data
  switch(sectionName) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'contracts':
      loadContracts();
      break;
    case 'voting':
      loadVotingStats();
      break;
    case 'users':
      loadUsers();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    let stats = {
      totalContracts: 0,
      activeVotes: 0,
      totalUsers: 0,
      totalTransactions: 0
    };
    
    if (window.wonkDB) {
      const [cryptos, globalStats] = await Promise.all([
        wonkDB.getCryptos(),
        wonkDB.getGlobalStats()
      ]);
      
      stats = {
        totalContracts: cryptos.length,
        activeVotes: globalStats.totalVotes || 0,
        totalUsers: globalStats.totalUsers || 0,
        totalTransactions: globalStats.totalTransactions || 0
      };
    } else {
      // Fallback data
      stats = {
        totalContracts: contracts.length || 6,
        activeVotes: 1250,
        totalUsers: 847,
        totalTransactions: 2156
      };
    }
    
    // Update dashboard stats
    document.getElementById('totalContracts').textContent = stats.totalContracts;
    document.getElementById('activeVotes').textContent = stats.activeVotes.toLocaleString();
    document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
    document.getElementById('totalTransactions').textContent = stats.totalTransactions.toLocaleString();
    
    // Load recent activity
    loadRecentActivity();
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load recent activity
function loadRecentActivity() {
  const recentActivity = document.getElementById('recentActivity');
  if (!recentActivity) return;
  
  const activities = [
    { type: 'contract', message: 'New contract BITCOIN added', time: '2 minutes ago', icon: 'fas fa-plus-circle', color: 'text-green-400' },
    { type: 'vote', message: 'User voted for ETHEREUM', time: '5 minutes ago', icon: 'fas fa-vote-yea', color: 'text-blue-400' },
    { type: 'user', message: 'New user registered', time: '8 minutes ago', icon: 'fas fa-user-plus', color: 'text-purple-400' },
    { type: 'transaction', message: 'Points purchase completed', time: '12 minutes ago', icon: 'fas fa-coins', color: 'text-yellow-400' },
    { type: 'vote', message: 'User voted for SOLANA', time: '15 minutes ago', icon: 'fas fa-vote-yea', color: 'text-blue-400' }
  ];
  
  recentActivity.innerHTML = activities.map(activity => `
    <div class="flex items-center space-x-3 p-3 bg-black bg-opacity-30 rounded-lg">
      <i class="${activity.icon} ${activity.color}"></i>
      <div class="flex-1">
        <div class="text-sm">${activity.message}</div>
        <div class="text-xs text-gray-400">${activity.time}</div>
      </div>
    </div>
  `).join('');
}

// Load contracts
async function loadContracts() {
  try {
    if (window.wonkDB) {
      contracts = await wonkDB.getCryptos();
    } else {
      // Fallback contracts data
      contracts = [
        { name: 'BITCOIN', icon: '₿', color: 'orange', totalVotes: 1250, active: true, contractAddress: '0x1234...5678' },
        { name: 'ETHEREUM', icon: 'Ξ', color: 'blue', totalVotes: 980, active: true, contractAddress: '0x2345...6789' },
        { name: 'SOLANA', icon: '◎', color: 'purple', totalVotes: 750, active: true, contractAddress: '0x3456...7890' },
        { name: 'CARDANO', icon: '₳', color: 'green', totalVotes: 650, active: false, contractAddress: '0x4567...8901' },
        { name: 'POLKADOT', icon: '●', color: 'red', totalVotes: 420, active: true, contractAddress: '0x5678...9012' },
        { name: 'CHAINLINK', icon: '⬢', color: 'blue', totalVotes: 380, active: true, contractAddress: '0x6789...0123' }
      ];
    }
    
    displayContracts();
    
    // Update primary token options if we're on the settings page
    if (currentSection === 'settings') {
      loadPrimaryTokenOptions();
    }
  } catch (error) {
    console.error('Error loading contracts:', error);
  }
}

// Display contracts
function displayContracts() {
  const contractsGrid = document.getElementById('contractsGrid');
  if (!contractsGrid) return;
  
  contractsGrid.innerHTML = contracts.map(contract => `
    <div class="crypto-card glass-panel p-6 rounded-2xl">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-gradient-to-br from-${contract.color}-400 to-${contract.color}-600 rounded-full flex items-center justify-center text-xl font-bold">
            ${contract.icon}
          </div>
          <div>
            <h3 class="text-lg font-bold">${contract.name}</h3>
            <p class="text-sm text-gray-400">${contract.contractAddress || 'No address'}</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-400">Status</div>
          <div class="${contract.active ? 'status-active' : 'status-inactive'} font-bold">
            ${contract.active ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <div class="flex justify-between text-sm mb-2">
          <span>Total Votes</span>
          <span class="font-bold">${(contract.totalVotes || 0).toLocaleString()}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div class="bg-gradient-to-r from-${contract.color}-400 to-${contract.color}-600 h-2 rounded-full" style="width: ${Math.min((contract.totalVotes || 0) / 20, 100)}%"></div>
        </div>
      </div>
      
      <div class="flex space-x-2">
        <button onclick="editContract('${contract.name}')" class="action-btn flex-1 text-sm">
          <i class="fas fa-edit mr-1"></i>
          Edit
        </button>
        <button onclick="toggleContractStatus('${contract.name}')" class="action-btn ${contract.active ? 'danger-btn' : ''} flex-1 text-sm">
          <i class="fas fa-${contract.active ? 'pause' : 'play'} mr-1"></i>
          ${contract.active ? 'Disable' : 'Enable'}
        </button>
        <button onclick="deleteContract('${contract.name}')" class="action-btn danger-btn flex-1 text-sm">
          <i class="fas fa-trash mr-1"></i>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Show add contract modal
function showAddContractModal() {
  const modal = document.getElementById('addContractModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// Hide add contract modal
function hideAddContractModal() {
  const modal = document.getElementById('addContractModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  
  // Reset form
  const form = document.getElementById('addContractForm');
  if (form) {
    form.reset();
  }
}

// Handle add contract form submission
async function handleAddContract(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const contractData = {
    name: document.getElementById('contractName').value.toUpperCase(),
    contractAddress: document.getElementById('contractAddress').value,
    icon: document.getElementById('contractIcon').value || '🪙',
    color: document.getElementById('contractColor').value,
    description: document.getElementById('contractDescription').value,
    totalVotes: 0,
    active: true,
    createdAt: new Date()
  };
  
  try {
    if (window.wonkDB) {
      // Add to database
      await wonkDB.cryptos.doc(contractData.name).set(contractData);
    } else {
      // Add to local array
      contracts.push(contractData);
    }
    
    showSuccessMessage('Contract added successfully!');
    hideAddContractModal();
    loadContracts();
    
  } catch (error) {
    console.error('Error adding contract:', error);
    showErrorMessage('Failed to add contract. Please try again.');
  }
}

// Edit contract
function editContract(contractName) {
  const contract = contracts.find(c => c.name === contractName);
  if (!contract) return;
  
  // Pre-fill the form with existing data
  document.getElementById('contractName').value = contract.name;
  document.getElementById('contractAddress').value = contract.contractAddress || '';
  document.getElementById('contractIcon').value = contract.icon;
  document.getElementById('contractColor').value = contract.color;
  document.getElementById('contractDescription').value = contract.description || '';
  
  showAddContractModal();
}

// Toggle contract status
async function toggleContractStatus(contractName) {
  try {
    const contract = contracts.find(c => c.name === contractName);
    if (!contract) return;
    
    const newStatus = !contract.active;
    
    if (window.wonkDB) {
      await wonkDB.cryptos.doc(contractName).update({ active: newStatus });
    } else {
      contract.active = newStatus;
    }
    
    showSuccessMessage(`Contract ${newStatus ? 'enabled' : 'disabled'} successfully!`);
    loadContracts();
    
  } catch (error) {
    console.error('Error toggling contract status:', error);
    showErrorMessage('Failed to update contract status.');
  }
}

// Delete contract
async function deleteContract(contractName) {
  if (!confirm(`Are you sure you want to delete the contract "${contractName}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    if (window.wonkDB) {
      await wonkDB.cryptos.doc(contractName).delete();
    } else {
      contracts = contracts.filter(c => c.name !== contractName);
    }
    
    showSuccessMessage('Contract deleted successfully!');
    loadContracts();
    
  } catch (error) {
    console.error('Error deleting contract:', error);
    showErrorMessage('Failed to delete contract.');
  }
}

// Load voting statistics
async function loadVotingStats() {
  try {
    if (window.wonkDB) {
      const cryptos = await wonkDB.getCryptos();
      votingStats = cryptos.reduce((stats, crypto) => {
        stats[crypto.name] = crypto.totalVotes || 0;
        return stats;
      }, {});
    } else {
      votingStats = {
        'BITCOIN': 1250,
        'ETHEREUM': 980,
        'SOLANA': 750,
        'CARDANO': 650,
        'POLKADOT': 420,
        'CHAINLINK': 380
      };
    }
    
    displayVotingStats();
  } catch (error) {
    console.error('Error loading voting stats:', error);
  }
}

// Display voting statistics
function displayVotingStats() {
  const votingStatsContainer = document.getElementById('votingStats');
  if (!votingStatsContainer) return;
  
  const totalVotes = Object.values(votingStats).reduce((sum, votes) => sum + votes, 0);
  
  votingStatsContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      ${Object.entries(votingStats).map(([name, votes]) => {
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
        return `
          <div class="bg-black bg-opacity-30 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-bold">${name}</h3>
              <span class="text-blue-400">${votes.toLocaleString()}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2 mb-1">
              <div class="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
            </div>
            <div class="text-xs text-gray-400">${percentage}% of total votes</div>
          </div>
        `;
      }).join('')}
    </div>
    
    <div class="text-center">
      <div class="text-2xl font-bold glow-gold">${totalVotes.toLocaleString()}</div>
      <div class="text-gray-400">Total Votes Cast</div>
    </div>
  `;
}

// Voting control functions
async function enableVoting() {
  try {
    // In a real implementation, this would update a global setting
    localStorage.setItem('votingEnabled', 'true');
    showSuccessMessage('Voting has been enabled!');
  } catch (error) {
    console.error('Error enabling voting:', error);
    showErrorMessage('Failed to enable voting.');
  }
}

async function disableVoting() {
  try {
    localStorage.setItem('votingEnabled', 'false');
    showSuccessMessage('Voting has been disabled!');
  } catch (error) {
    console.error('Error disabling voting:', error);
    showErrorMessage('Failed to disable voting.');
  }
}

async function resetVotes() {
  if (!confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
    return;
  }
  
  try {
    if (window.wonkDB) {
      const batch = wonkDB.db.batch();
      contracts.forEach(contract => {
        const contractRef = wonkDB.cryptos.doc(contract.name);
        batch.update(contractRef, { totalVotes: 0 });
      });
      await batch.commit();
    } else {
      contracts.forEach(contract => {
        contract.totalVotes = 0;
      });
    }
    
    showSuccessMessage('All votes have been reset!');
    loadVotingStats();
    loadContracts();
    
  } catch (error) {
    console.error('Error resetting votes:', error);
    showErrorMessage('Failed to reset votes.');
  }
}

// Load users
async function loadUsers() {
  try {
    if (window.wonkDB) {
      // In a real implementation, you'd load users from the database
      users = []; // This would be populated from the database
    } else {
      // Demo users data
      users = [
        { uid: 'user001', displayName: 'Alice Johnson', loginMethod: 'google', points: 1500, totalVotes: 15 },
        { uid: 'user002', displayName: 'Bob Smith', loginMethod: 'phantom', points: 2300, totalVotes: 23 },
        { uid: 'user003', displayName: 'Charlie Brown', loginMethod: 'google', points: 800, totalVotes: 8 },
        { uid: 'user004', displayName: 'Diana Prince', loginMethod: 'phantom', points: 3200, totalVotes: 32 },
        { uid: 'user005', displayName: 'Eve Wilson', loginMethod: 'google', points: 1200, totalVotes: 12 }
      ];
    }
    
    displayUsers();
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Display users
function displayUsers() {
  const usersTable = document.getElementById('usersTable');
  if (!usersTable) return;
  
  usersTable.innerHTML = users.map(user => `
    <tr class="border-b border-gray-700 border-opacity-30">
      <td class="py-3">${user.uid.substring(0, 12)}...</td>
      <td class="py-3">${user.displayName}</td>
      <td class="py-3">
        <span class="px-2 py-1 rounded text-xs ${user.loginMethod === 'phantom' ? 'bg-purple-600' : 'bg-blue-600'}">
          ${user.loginMethod}
        </span>
      </td>
      <td class="py-3">${user.points.toLocaleString()}</td>
      <td class="py-3">${user.totalVotes}</td>
      <td class="py-3">
        <button onclick="editUser('${user.uid}')" class="text-blue-400 hover:text-blue-300 mr-2">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteUser('${user.uid}')" class="text-red-400 hover:text-red-300">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Load analytics
function loadAnalytics() {
  // Placeholder for analytics implementation
  console.log('Loading analytics...');
}

// Load settings
function loadSettings() {
  const voteCost = localStorage.getItem('voteCost') || '10';
  const defaultPoints = localStorage.getItem('defaultPoints') || '1000';
  const votingEnabled = localStorage.getItem('votingEnabled') || 'true';
  const primaryToken = localStorage.getItem('primaryToken') || '';
  const primaryTokenContract = localStorage.getItem('primaryTokenContract') || '';
  const primaryTokenDescription = localStorage.getItem('primaryTokenDescription') || '';
  
  document.getElementById('voteCost').value = voteCost;
  document.getElementById('defaultPoints').value = defaultPoints;
  document.getElementById('votingEnabled').value = votingEnabled;
  document.getElementById('primaryTokenContract').value = primaryTokenContract;
  document.getElementById('primaryTokenDescription').value = primaryTokenDescription;
  
  // Populate primary token dropdown
  loadPrimaryTokenOptions();
  document.getElementById('primaryToken').value = primaryToken;
}

// Load primary token options
function loadPrimaryTokenOptions() {
  const primaryTokenSelect = document.getElementById('primaryToken');
  if (!primaryTokenSelect) return;
  
  // Clear existing options except the first one
  primaryTokenSelect.innerHTML = '<option value="">Select Primary Token</option>';
  
  // Add WONK as default option
  const wonkOption = document.createElement('option');
  wonkOption.value = 'WONK';
  wonkOption.textContent = 'WONK (Default)';
  primaryTokenSelect.appendChild(wonkOption);
  
  // Add other contracts as options
  contracts.forEach(contract => {
    if (contract.name !== 'WONK') {
      const option = document.createElement('option');
      option.value = contract.name;
      option.textContent = contract.name;
      primaryTokenSelect.appendChild(option);
    }
  });
}

// Save settings
function saveSettings() {
  const voteCost = document.getElementById('voteCost').value;
  const defaultPoints = document.getElementById('defaultPoints').value;
  const votingEnabled = document.getElementById('votingEnabled').value;
  const primaryToken = document.getElementById('primaryToken').value;
  const primaryTokenContract = document.getElementById('primaryTokenContract').value;
  const primaryTokenDescription = document.getElementById('primaryTokenDescription').value;
  
  localStorage.setItem('voteCost', voteCost);
  localStorage.setItem('defaultPoints', defaultPoints);
  localStorage.setItem('votingEnabled', votingEnabled);
  localStorage.setItem('primaryToken', primaryToken);
  localStorage.setItem('primaryTokenContract', primaryTokenContract);
  localStorage.setItem('primaryTokenDescription', primaryTokenDescription);
  
  // Update primary token data in database if available
  if (window.wonkDB && primaryToken) {
    const primaryTokenData = {
      name: primaryToken,
      contractAddress: primaryTokenContract,
      description: primaryTokenDescription,
      isPrimary: true
    };
    
    wonkDB.updateSystemSettings({
      primaryToken: primaryTokenData,
      voteCost: parseInt(voteCost),
      defaultPoints: parseInt(defaultPoints),
      votingEnabled: votingEnabled === 'true'
    }).catch(console.error);
  }
  
  showSuccessMessage('Settings saved successfully!');
}

// Get primary token data for main website
function getPrimaryTokenData() {
  const primaryToken = localStorage.getItem('primaryToken') || 'WONK';
  const primaryTokenContract = localStorage.getItem('primaryTokenContract') || '';
  const primaryTokenDescription = localStorage.getItem('primaryTokenDescription') || 'The Community Whale Revolution';
  
  return {
    name: primaryToken,
    contractAddress: primaryTokenContract,
    description: primaryTokenDescription
  };
}

// Edit user
function editUser(userId) {
  // Placeholder for user editing functionality
  console.log('Editing user:', userId);
}

// Delete user
function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) {
    return;
  }
  
  // Placeholder for user deletion functionality
  console.log('Deleting user:', userId);
}

// Logout
function logout() {
  localStorage.removeItem('isAdmin');
  window.location.href = 'index.html';
}

// Utility functions
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

