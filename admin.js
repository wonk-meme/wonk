// Admin Panel for WONK DAO
class AdminPanel {
    constructor() {
        this.isAdminLoggedIn = false;
        this.adminUser = null;
        this.votingActive = true;
        this.votingEndTime = null;
        this.cryptoContracts = [];
    }

    // Check if user is admin
    isAdmin(userId) {
        const adminUsers = [
            'admin_wonk_2024',
            'phantom_admin_key',
            'google_admin_user'
        ];
        return adminUsers.includes(userId) || userId.includes('admin');
    }

    // Show admin panel
    showAdminPanel() {
        if (!currentUser || !this.isAdmin(currentUser.uid)) {
            showErrorMessage('Access denied. Admin privileges required.');
            return;
        }

        this.isAdminLoggedIn = true;
        this.adminUser = currentUser;

        const adminModal = document.createElement('div');
        adminModal.id = 'adminModal';
        adminModal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]';
        adminModal.innerHTML = `
            <div class="glass-panel p-8 rounded-3xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold glow-gold">WONK DAO Admin Panel</h2>
                    <button onclick="closeAdminPanel()" class="text-red-400 hover:text-red-300 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Admin Navigation -->
                <div class="flex space-x-4 mb-8">
                    <button onclick="showAdminSection('contracts')" class="admin-nav-btn active" id="contractsBtn">
                        <i class="fas fa-coins mr-2"></i>Crypto Contracts
                    </button>
                    <button onclick="showAdminSection('voting')" class="admin-nav-btn" id="votingBtn">
                        <i class="fas fa-vote-yea mr-2"></i>Voting Control
                    </button>
                    <button onclick="showAdminSection('users')" class="admin-nav-btn" id="usersBtn">
                        <i class="fas fa-users mr-2"></i>User Management
                    </button>
                    <button onclick="showAdminSection('analytics')" class="admin-nav-btn" id="analyticsBtn">
                        <i class="fas fa-chart-bar mr-2"></i>Analytics
                    </button>
                </div>

                <!-- Crypto Contracts Section -->
                <div id="contractsSection" class="admin-section">
                    <h3 class="text-2xl font-bold mb-4 glow-blue">Crypto Contracts Management</h3>
                    
                    <!-- Add New Contract -->
                    <div class="glass-dark p-6 rounded-2xl mb-6">
                        <h4 class="text-xl font-bold mb-4">Add New Crypto Contract</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <input type="text" id="newCryptoName" placeholder="Crypto Name" class="admin-input">
                            <input type="text" id="newCryptoSymbol" placeholder="Symbol" class="admin-input">
                            <input type="text" id="newCryptoContract" placeholder="Contract Address" class="admin-input">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <select id="newCryptoIcon" class="admin-input">
                                <option value="🚀">🚀 Rocket</option>
                                <option value="💎">💎 Diamond</option>
                                <option value="⚡">⚡ Lightning</option>
                                <option value="🌙">🌙 Moon</option>
                                <option value="🔥">🔥 Fire</option>
                                <option value="⭐">⭐ Star</option>
                                <option value="💰">💰 Money</option>
                                <option value="🎯">🎯 Target</option>
                            </select>
                            <select id="newCryptoColor" class="admin-input">
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="purple">Purple</option>
                                <option value="yellow">Yellow</option>
                                <option value="red">Red</option>
                                <option value="orange">Orange</option>
                                <option value="pink">Pink</option>
                                <option value="cyan">Cyan</option>
                            </select>
                        </div>
                        <button onclick="addNewCrypto()" class="action-btn">
                            <i class="fas fa-plus mr-2"></i>Add Crypto
                        </button>
                    </div>

                    <!-- Existing Contracts -->
                    <div class="glass-dark p-6 rounded-2xl">
                        <h4 class="text-xl font-bold mb-4">Existing Contracts</h4>
                        <div id="cryptoContractsList">
                            <!-- Contracts will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Voting Control Section -->
                <div id="votingSection" class="admin-section hidden">
                    <h3 class="text-2xl font-bold mb-4 glow-blue">Voting Control</h3>
                    
                    <!-- Voting Status -->
                    <div class="glass-dark p-6 rounded-2xl mb-6">
                        <h4 class="text-xl font-bold mb-4">Current Voting Status</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="text-center">
                                <div class="text-3xl font-bold ${this.votingActive ? 'text-green-400' : 'text-red-400'}" id="votingStatus">
                                    ${this.votingActive ? 'ACTIVE' : 'INACTIVE'}
                                </div>
                                <div class="text-gray-400">Voting Status</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-blue-400" id="totalVotesCount">0</div>
                                <div class="text-gray-400">Total Votes</div>
                            </div>
                            <div class="text-center">
                                <div class="text-3xl font-bold text-gold-400" id="activeUsersCount">0</div>
                                <div class="text-gray-400">Active Users</div>
                            </div>
                        </div>
                    </div>

                    <!-- Voting Controls -->
                    <div class="glass-dark p-6 rounded-2xl mb-6">
                        <h4 class="text-xl font-bold mb-4">Voting Controls</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <button onclick="toggleVoting()" class="action-btn" id="toggleVotingBtn">
                                <i class="fas ${this.votingActive ? 'fa-pause' : 'fa-play'} mr-2"></i>
                                ${this.votingActive ? 'Stop Voting' : 'Start Voting'}
                            </button>
                            <button onclick="resetVoting()" class="action-btn bg-red-600 hover:bg-red-700">
                                <i class="fas fa-redo mr-2"></i>Reset All Votes
                            </button>
                        </div>
                        
                        <!-- Timer Settings -->
                        <div class="border-t border-gray-600 pt-4">
                            <h5 class="text-lg font-bold mb-3">Set Voting Timer</h5>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <input type="number" id="votingHours" placeholder="Hours" min="0" max="23" class="admin-input">
                                <input type="number" id="votingMinutes" placeholder="Minutes" min="0" max="59" class="admin-input">
                                <input type="number" id="votingSeconds" placeholder="Seconds" min="0" max="59" class="admin-input">
                            </div>
                            <button onclick="setVotingTimer()" class="action-btn">
                                <i class="fas fa-clock mr-2"></i>Set Timer
                            </button>
                        </div>
                    </div>

                    <!-- Winner Display -->
                    <div class="glass-dark p-6 rounded-2xl">
                        <h4 class="text-xl font-bold mb-4">Current Winner</h4>
                        <div id="currentWinner" class="text-center">
                            <!-- Winner will be displayed here -->
                        </div>
                    </div>
                </div>

                <!-- User Management Section -->
                <div id="usersSection" class="admin-section hidden">
                    <h3 class="text-2xl font-bold mb-4 glow-blue">User Management</h3>
                    
                    <!-- User Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div class="glass-dark p-4 rounded-2xl text-center">
                            <div class="text-2xl font-bold text-blue-400" id="totalUsersCount">0</div>
                            <div class="text-gray-400">Total Users</div>
                        </div>
                        <div class="glass-dark p-4 rounded-2xl text-center">
                            <div class="text-2xl font-bold text-green-400" id="activeUsersToday">0</div>
                            <div class="text-gray-400">Active Today</div>
                        </div>
                        <div class="glass-dark p-4 rounded-2xl text-center">
                            <div class="text-2xl font-bold text-purple-400" id="totalPointsDistributed">0</div>
                            <div class="text-gray-400">Points Distributed</div>
                        </div>
                        <div class="glass-dark p-4 rounded-2xl text-center">
                            <div class="text-2xl font-bold text-gold-400" id="totalVotesAllTime">0</div>
                            <div class="text-gray-400">Total Votes</div>
                        </div>
                    </div>

                    <!-- Add Points to User -->
                    <div class="glass-dark p-6 rounded-2xl mb-6">
                        <h4 class="text-xl font-bold mb-4">Add Points to User</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <input type="text" id="userIdForPoints" placeholder="User ID" class="admin-input">
                            <input type="number" id="pointsToAdd" placeholder="Points to Add" min="1" class="admin-input">
                            <button onclick="addPointsToUser()" class="action-btn">
                                <i class="fas fa-plus mr-2"></i>Add Points
                            </button>
                        </div>
                    </div>

                    <!-- User List -->
                    <div class="glass-dark p-6 rounded-2xl">
                        <h4 class="text-xl font-bold mb-4">Recent Users</h4>
                        <div id="usersList" class="max-h-96 overflow-y-auto">
                            <!-- Users will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Analytics Section -->
                <div id="analyticsSection" class="admin-section hidden">
                    <h3 class="text-2xl font-bold mb-4 glow-blue">Analytics Dashboard</h3>
                    
                    <!-- Charts and Analytics -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="glass-dark p-6 rounded-2xl">
                            <h4 class="text-xl font-bold mb-4">Voting Distribution</h4>
                            <canvas id="votingChart" width="400" height="300"></canvas>
                        </div>
                        <div class="glass-dark p-6 rounded-2xl">
                            <h4 class="text-xl font-bold mb-4">User Activity</h4>
                            <canvas id="activityChart" width="400" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(adminModal);
        this.loadAdminData();
    }

    // Load admin data
    async loadAdminData() {
        try {
            await this.loadCryptoContracts();
            await this.loadVotingStats();
            await this.loadUserStats();
            this.updateWinnerDisplay();
        } catch (error) {
            console.error('Error loading admin data:', error);
        }
    }

    // Load crypto contracts
    async loadCryptoContracts() {
        try {
            let cryptos = [];
            
            if (window.wonkDB) {
                cryptos = await wonkDB.getCryptos();
            }
            
            if (!cryptos || cryptos.length === 0) {
                cryptos = [
                    { name: 'MOONSHOT', icon: '🚀', color: 'blue', totalVotes: 0, active: true, contractAddress: '0x1234...abcd' },
                    { name: 'DIAMOND', icon: '💎', color: 'green', totalVotes: 0, active: true, contractAddress: '0x5678...efgh' },
                    { name: 'LIGHTNING', icon: '⚡', color: 'purple', totalVotes: 0, active: true, contractAddress: '0x9abc...ijkl' },
                    { name: 'ROCKET', icon: '🌙', color: 'yellow', totalVotes: 0, active: true, contractAddress: '0xdef0...mnop' },
                    { name: 'FIRE', icon: '🔥', color: 'red', totalVotes: 0, active: true, contractAddress: '0x1357...qrst' },
                    { name: 'STAR', icon: '⭐', color: 'orange', totalVotes: 0, active: true, contractAddress: '0x2468...uvwx' }
                ];
            }

            this.cryptoContracts = cryptos;
            this.renderCryptoContracts();
        } catch (error) {
            console.error('Error loading crypto contracts:', error);
        }
    }

    // Render crypto contracts list
    renderCryptoContracts() {
        const contractsList = document.getElementById('cryptoContractsList');
        if (!contractsList) return;

        contractsList.innerHTML = this.cryptoContracts.map((crypto, index) => `
            <div class="flex items-center justify-between p-4 mb-3 bg-black bg-opacity-30 rounded-lg">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-${crypto.color}-400 to-${crypto.color}-600 rounded-full flex items-center justify-center text-xl">
                        ${crypto.icon}
                    </div>
                    <div>
                        <div class="text-lg font-bold text-${crypto.color}-400">${crypto.name}</div>
                        <div class="text-sm text-gray-400">Votes: ${crypto.totalVotes || 0}</div>
                        <div class="text-xs text-gray-500">${crypto.contractAddress || 'No contract'}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="toggleCryptoStatus(${index})" class="px-3 py-1 rounded-full text-xs font-bold ${crypto.active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
                        ${crypto.active ? 'Active' : 'Inactive'}
                    </button>
                    <button onclick="editCrypto(${index})" class="px-3 py-1 bg-blue-600 text-white rounded-full text-xs">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCrypto(${index})" class="px-3 py-1 bg-red-600 text-white rounded-full text-xs">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Load voting statistics
    async loadVotingStats() {
        try {
            let stats = { totalVotes: 0, activeUsers: 0 };
            
            if (window.wonkDB) {
                stats = await wonkDB.getGlobalStats();
            }

            const totalVotesElement = document.getElementById('totalVotesCount');
            const activeUsersElement = document.getElementById('activeUsersCount');
            
            if (totalVotesElement) totalVotesElement.textContent = stats.totalVotes || 0;
            if (activeUsersElement) activeUsersElement.textContent = stats.activeUsers || 0;
        } catch (error) {
            console.error('Error loading voting stats:', error);
        }
    }

    // Load user statistics
    async loadUserStats() {
        try {
            // This would normally fetch from database
            const userStats = {
                totalUsers: 150,
                activeToday: 45,
                totalPointsDistributed: 75000,
                totalVotesAllTime: 2340
            };

            const elements = {
                totalUsersCount: userStats.totalUsers,
                activeUsersToday: userStats.activeToday,
                totalPointsDistributed: userStats.totalPointsDistributed,
                totalVotesAllTime: userStats.totalVotesAllTime
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value.toLocaleString();
            });
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    // Update winner display
    async updateWinnerDisplay() {
        try {
            let winner = { name: '', votes: 0 };
            
            if (window.blockchainVoting) {
                winner = await window.blockchainVoting.getWinningCrypto();
            }
            
            if (!winner.name && this.cryptoContracts.length > 0) {
                // Find crypto with most votes
                winner = this.cryptoContracts.reduce((prev, current) => 
                    (current.totalVotes > prev.totalVotes) ? current : prev
                );
                winner = { name: winner.name, votes: winner.totalVotes };
            }

            const winnerElement = document.getElementById('currentWinner');
            if (winnerElement) {
                if (winner.name) {
                    const crypto = this.cryptoContracts.find(c => c.name === winner.name);
                    winnerElement.innerHTML = `
                        <div class="flex items-center justify-center space-x-4">
                            <div class="w-16 h-16 bg-gradient-to-br from-gold-400 to-yellow-500 rounded-full flex items-center justify-center text-2xl">
                                ${crypto ? crypto.icon : '🏆'}
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-gold-400">${winner.name}</div>
                                <div class="text-lg text-gray-400">${winner.votes} votes</div>
                            </div>
                        </div>
                    `;
                } else {
                    winnerElement.innerHTML = `
                        <div class="text-gray-400">No votes yet</div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error updating winner display:', error);
        }
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();

// Global admin functions
function showAdminPanel() {
    adminPanel.showAdminPanel();
}

function closeAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        adminModal.remove();
    }
}

function showAdminSection(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-nav-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected section
    document.getElementById(section + 'Section').classList.remove('hidden');
    document.getElementById(section + 'Btn').classList.add('active');
}

function addNewCrypto() {
    const name = document.getElementById('newCryptoName').value;
    const symbol = document.getElementById('newCryptoSymbol').value;
    const contract = document.getElementById('newCryptoContract').value;
    const icon = document.getElementById('newCryptoIcon').value;
    const color = document.getElementById('newCryptoColor').value;
    
    if (!name || !symbol) {
        alert('Please fill in name and symbol');
        return;
    }
    
    const newCrypto = {
        name: name.toUpperCase(),
        symbol: symbol.toUpperCase(),
        contractAddress: contract,
        icon: icon,
        color: color,
        totalVotes: 0,
        active: true
    };
    
    adminPanel.cryptoContracts.push(newCrypto);
    adminPanel.renderCryptoContracts();
    
    // Clear form
    document.getElementById('newCryptoName').value = '';
    document.getElementById('newCryptoSymbol').value = '';
    document.getElementById('newCryptoContract').value = '';
    
    showSuccessMessage('Crypto added successfully!');
}

function toggleCryptoStatus(index) {
    adminPanel.cryptoContracts[index].active = !adminPanel.cryptoContracts[index].active;
    adminPanel.renderCryptoContracts();
    showSuccessMessage('Crypto status updated!');
}

function editCrypto(index) {
    const crypto = adminPanel.cryptoContracts[index];
    const newName = prompt('Enter new name:', crypto.name);
    if (newName) {
        crypto.name = newName.toUpperCase();
        adminPanel.renderCryptoContracts();
        showSuccessMessage('Crypto updated!');
    }
}

function deleteCrypto(index) {
    if (confirm('Are you sure you want to delete this crypto?')) {
        adminPanel.cryptoContracts.splice(index, 1);
        adminPanel.renderCryptoContracts();
        showSuccessMessage('Crypto deleted!');
    }
}

function toggleVoting() {
    adminPanel.votingActive = !adminPanel.votingActive;
    
    const statusElement = document.getElementById('votingStatus');
    const toggleBtn = document.getElementById('toggleVotingBtn');
    
    if (statusElement) {
        statusElement.textContent = adminPanel.votingActive ? 'ACTIVE' : 'INACTIVE';
        statusElement.className = adminPanel.votingActive ? 'text-green-400' : 'text-red-400';
    }
    
    if (toggleBtn) {
        toggleBtn.innerHTML = `
            <i class="fas ${adminPanel.votingActive ? 'fa-pause' : 'fa-play'} mr-2"></i>
            ${adminPanel.votingActive ? 'Stop Voting' : 'Start Voting'}
        `;
    }
    
    showSuccessMessage(`Voting ${adminPanel.votingActive ? 'started' : 'stopped'}!`);
}

function resetVoting() {
    if (confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
        // Reset all vote counts
        adminPanel.cryptoContracts.forEach(crypto => crypto.totalVotes = 0);
        adminPanel.renderCryptoContracts();
        adminPanel.updateWinnerDisplay();
        
        // Clear blockchain votes
        localStorage.removeItem('blockchain_votes');
        
        showSuccessMessage('All votes have been reset!');
    }
}

function setVotingTimer() {
    const hours = parseInt(document.getElementById('votingHours').value) || 0;
    const minutes = parseInt(document.getElementById('votingMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('votingSeconds').value) || 0;
    
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    
    if (totalMs === 0) {
        alert('Please set a valid time');
        return;
    }
    
    adminPanel.votingEndTime = Date.now() + totalMs;
    
    setTimeout(() => {
        adminPanel.votingActive = false;
        showSuccessMessage('Voting time has ended!');
        adminPanel.updateWinnerDisplay();
    }, totalMs);
    
    showSuccessMessage(`Voting timer set for ${hours}h ${minutes}m ${seconds}s`);
}

function addPointsToUser() {
    const userId = document.getElementById('userIdForPoints').value;
    const points = parseInt(document.getElementById('pointsToAdd').value);
    
    if (!userId || !points || points < 1) {
        alert('Please enter valid user ID and points');
        return;
    }
    
    // This would normally update the database
    showSuccessMessage(`Added ${points} points to user ${userId}`);
    
    // Clear form
    document.getElementById('userIdForPoints').value = '';
    document.getElementById('pointsToAdd').value = '';
}

// Export for global use
window.adminPanel = adminPanel;

// Add admin styles
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .admin-nav-btn {
        padding: 12px 24px;
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 25px;
        color: #00d4ff;
        font-weight: 600;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .admin-nav-btn:hover, .admin-nav-btn.active {
        background: rgba(0, 212, 255, 0.2);
        border-color: #00d4ff;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
    }
    
    .admin-input {
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        color: white;
        font-size: 14px;
    }
    
    .admin-input:focus {
        outline: none;
        border-color: #00d4ff;
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
    }
    
    .admin-section {
        min-height: 400px;
    }
`;
document.head.appendChild(adminStyles);
