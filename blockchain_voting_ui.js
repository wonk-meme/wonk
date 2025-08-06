// Blockchain Voting UI Management
class BlockchainVotingUI {
    constructor() {
        this.isBlockchainMode = false;
        this.userAccount = null;
        this.userPoints = 0;
        this.contractStats = null;
        this.eventListeners = [];
        
        // UI Elements
        this.votingModeToggle = null;
        this.blockchainStatus = null;
        this.connectWalletBtn = null;
        this.userPointsDisplay = null;
        this.votingCards = null;
        
        this.init();
    }

    // Initialize the UI
    async init() {
        try {
            console.log('Initializing Blockchain Voting UI...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupUI());
            } else {
                this.setupUI();
            }
            
        } catch (error) {
            console.error('Error initializing Blockchain Voting UI:', error);
        }
    }

    // Setup UI elements and event listeners
    setupUI() {
        try {
            // Get UI elements
            this.votingModeToggle = document.getElementById('votingModeToggle');
            this.blockchainStatus = document.getElementById('blockchainStatus');
            this.connectWalletBtn = document.getElementById('connectWalletBtn');
            this.userPointsDisplay = document.getElementById('userPointsDisplay');
            this.votingCards = document.getElementById('votingCards');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize blockchain status
            this.updateBlockchainStatus();
            
            console.log('Blockchain Voting UI setup complete');
        } catch (error) {
            console.error('Error setting up UI:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Voting mode toggle
        if (this.votingModeToggle) {
            this.votingModeToggle.addEventListener('change', (e) => {
                this.toggleVotingMode(e.target.checked);
            });
        }

        // Connect wallet button
        if (this.connectWalletBtn) {
            this.connectWalletBtn.addEventListener('click', () => {
                this.connectWallet();
            });
        }

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountChange(accounts);
            });

            window.ethereum.on('chainChanged', (chainId) => {
                this.handleChainChange(chainId);
            });
        }
    }

    // Toggle between traditional and blockchain voting
    async toggleVotingMode(useBlockchain) {
        try {
            this.isBlockchainMode = useBlockchain;
            
            if (useBlockchain) {
                console.log('Switching to blockchain voting mode...');
                
                // Check if blockchain integration is available
                if (!window.blockchainIntegration) {
                    throw new Error('Blockchain integration not available');
                }
                
                // Initialize blockchain if not already done
                if (!window.blockchainIntegration.isConnected()) {
                    await this.connectWallet();
                }
                
                // Load blockchain data
                await this.loadBlockchainData();
                
                this.showBlockchainUI();
            } else {
                console.log('Switching to traditional voting mode...');
                this.showTraditionalUI();
            }
            
            // Update voting cards
            await this.updateVotingCards();
            
        } catch (error) {
            console.error('Error toggling voting mode:', error);
            this.showError('Failed to switch voting mode: ' + error.message);
            
            // Revert toggle
            if (this.votingModeToggle) {
                this.votingModeToggle.checked = !useBlockchain;
            }
            this.isBlockchainMode = !useBlockchain;
        }
    }

    // Connect to Web3 wallet
    async connectWallet() {
        try {
            console.log('Connecting to wallet...');
            
            if (!window.blockchainIntegration) {
                throw new Error('Blockchain integration not available');
            }
            
            // Initialize blockchain integration
            await window.blockchainIntegration.initialize();
            
            this.userAccount = window.blockchainIntegration.userAccount;
            
            // Check if user is registered on blockchain
            await this.checkUserRegistration();
            
            // Load user data from blockchain
            await this.loadUserBlockchainData();
            
            // Update UI
            this.updateWalletUI();
            this.updateBlockchainStatus();
            
            this.showSuccess('Wallet connected successfully!');
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showError('Failed to connect wallet: ' + error.message);
        }
    }

    // Check if user is registered on blockchain
    async checkUserRegistration() {
        try {
            if (!window.blockchainIntegration || !this.userAccount) {
                return;
            }
            
            const userInfo = await window.blockchainIntegration.getUserInfo();
            
            if (!userInfo.isActive) {
                console.log('User not registered on blockchain, registering...');
                
                // Show registration modal or auto-register
                const shouldRegister = confirm('You need to register on the blockchain to use blockchain voting. Register now?');
                
                if (shouldRegister) {
                    await this.registerUserOnBlockchain();
                }
            } else {
                console.log('User already registered on blockchain');
            }
            
        } catch (error) {
            console.error('Error checking user registration:', error);
            // User might not be registered, which is fine
        }
    }

    // Register user on blockchain
    async registerUserOnBlockchain() {
        try {
            console.log('Registering user on blockchain...');
            
            this.showLoading('Registering on blockchain...');
            
            const result = await window.blockchainIntegration.registerUser();
            
            console.log('User registered successfully:', result.transactionHash);
            this.showSuccess('Successfully registered on blockchain!');
            
            // Load user data after registration
            await this.loadUserBlockchainData();
            
        } catch (error) {
            console.error('Error registering user:', error);
            this.showError('Failed to register on blockchain: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Load user data from blockchain
    async loadUserBlockchainData() {
        try {
            if (!window.blockchainIntegration || !this.userAccount) {
                return;
            }
            
            const userInfo = await window.blockchainIntegration.getUserInfo();
            
            this.userPoints = userInfo.points;
            
            // Update UI
            if (this.userPointsDisplay) {
                this.userPointsDisplay.textContent = this.userPoints.toLocaleString();
            }
            
            // Update user stats if elements exist
            const totalVotesElement = document.getElementById('userTotalVotes');
            const pointsSpentElement = document.getElementById('userPointsSpent');
            const joinDateElement = document.getElementById('userJoinDate');
            
            if (totalVotesElement) {
                totalVotesElement.textContent = userInfo.totalVotes.toLocaleString();
            }
            if (pointsSpentElement) {
                pointsSpentElement.textContent = userInfo.totalSpent.toLocaleString();
            }
            if (joinDateElement) {
                joinDateElement.textContent = userInfo.joinDate.toLocaleDateString();
            }
            
        } catch (error) {
            console.error('Error loading user blockchain data:', error);
        }
    }

    // Load blockchain data (stats, cryptos, etc.)
    async loadBlockchainData() {
        try {
            if (!window.blockchainIntegration) {
                return;
            }
            
            // Load contract stats
            this.contractStats = await window.blockchainIntegration.getContractStats();
            
            console.log('Contract stats loaded:', this.contractStats);
            
        } catch (error) {
            console.error('Error loading blockchain data:', error);
        }
    }

    // Update voting cards based on current mode
    async updateVotingCards() {
        try {
            let cryptos = [];
            
            if (this.isBlockchainMode && window.blockchainIntegration) {
                // Load cryptos from blockchain
                const cryptoNames = await window.blockchainIntegration.getActiveCryptos();
                
                cryptos = await Promise.all(cryptoNames.map(async (name) => {
                    const info = await window.blockchainIntegration.getCryptoInfo(name);
                    return {
                        name: info.name,
                        totalVotes: info.totalVotes,
                        icon: this.getCryptoIcon(info.name),
                        color: this.getCryptoColor(info.name),
                        isBlockchain: true
                    };
                }));
            } else {
                // Load cryptos from traditional database or default
                if (window.wonkDB) {
                    cryptos = await window.wonkDB.getCryptos();
                } else {
                    // Default cryptos
                    cryptos = [
                        { name: "MOONSHOT", icon: "🚀", color: "blue", totalVotes: 2150 },
                        { name: "DIAMOND", icon: "💎", color: "green", totalVotes: 1250 },
                        { name: "LIGHTNING", icon: "⚡", color: "purple", totalVotes: 750 },
                        { name: "ROCKET", icon: "🌙", color: "yellow", totalVotes: 890 },
                        { name: "FIRE", icon: "🔥", color: "red", totalVotes: 1120 },
                        { name: "STAR", icon: "⭐", color: "orange", totalVotes: 680 }
                    ];
                }
            }
            
            this.renderVotingCards(cryptos);
            
        } catch (error) {
            console.error('Error updating voting cards:', error);
        }
    }

    // Render voting cards
    renderVotingCards(cryptos) {
        if (!this.votingCards) {
            this.votingCards = document.getElementById('votingCards');
        }
        
        if (!this.votingCards) return;

        this.votingCards.innerHTML = cryptos.map(crypto => `
            <div class="voting-card glass-panel p-6 rounded-2xl" onclick="blockchainVotingUI.voteForCrypto('${crypto.name}', 10)">
                <div class="text-center mb-4">
                    <div class="w-16 h-16 bg-gradient-to-br from-${crypto.color}-400 to-${crypto.color}-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                        ${crypto.icon}
                    </div>
                    <h4 class="text-xl font-bold text-${crypto.color}-400">${crypto.name}</h4>
                    <p class="text-gray-400 text-sm">
                        ${this.isBlockchainMode ? 'Blockchain Verified' : 'Community Choice'}
                    </p>
                </div>
                
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-2">
                        <span>Total Votes: ${(crypto.totalVotes || 0).toLocaleString()}</span>
                        <span class="text-${crypto.color}-400 font-bold">
                            ${this.isBlockchainMode ? 'ON-CHAIN' : 'ACTIVE'}
                        </span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-3">
                        <div class="bg-gradient-to-r from-${crypto.color}-400 to-${crypto.color}-600 h-3 rounded-full transition-all duration-500" 
                             style="width: ${Math.min((crypto.totalVotes || 0) / 30, 100)}%"></div>
                    </div>
                </div>

                <div class="bg-black bg-opacity-50 p-3 rounded-lg mb-4">
                    <div class="text-xs text-gray-400 mb-1">VOTE COST:</div>
                    <div class="flex items-center justify-between">
                        <span class="text-${crypto.color}-400 font-bold">10 POINTS</span>
                        <div class="flex items-center space-x-1">
                            <i class="fas fa-coins text-gold-400"></i>
                            ${this.isBlockchainMode ? '<i class="fas fa-link text-blue-400" title="Blockchain"></i>' : ''}
                        </div>
                    </div>
                </div>

                <div class="action-btn w-full bg-gradient-to-r from-${crypto.color}-400 to-${crypto.color}-600 text-center">
                    <i class="fas fa-vote-yea mr-2"></i>
                    ${this.isBlockchainMode ? 'VOTE ON-CHAIN' : 'VOTE NOW'}
                </div>
            </div>
        `).join("");
    }

    // Vote for crypto (handles both traditional and blockchain)
    async voteForCrypto(cryptoName, cost) {
        try {
            console.log(`Voting for ${cryptoName} in ${this.isBlockchainMode ? 'blockchain' : 'traditional'} mode`);
            
            // Check if user has enough points
            if (this.userPoints < cost) {
                this.showError("Insufficient points! Please buy more points.");
                this.showBuyPointsModal();
                return;
            }
            
            if (this.isBlockchainMode) {
                await this.voteOnBlockchain(cryptoName, cost);
            } else {
                await this.voteTraditional(cryptoName, cost);
            }
            
        } catch (error) {
            console.error('Error voting:', error);
            this.showError('Failed to cast vote: ' + error.message);
        }
    }

    // Vote on blockchain
    async voteOnBlockchain(cryptoName, cost) {
        try {
            if (!window.blockchainIntegration || !this.userAccount) {
                throw new Error('Blockchain not connected');
            }
            
            this.showLoading('Casting vote on blockchain...');
            
            const result = await window.blockchainIntegration.vote(cryptoName);
            
            console.log('Blockchain vote successful:', result.transactionHash);
            
            // Update user points from blockchain
            await this.loadUserBlockchainData();
            
            // Update voting cards
            await this.updateVotingCards();
            
            this.showSuccess(`Successfully voted for ${cryptoName} on blockchain!`);
            
            // Add to live feed
            this.addVoteToFeed(this.userAccount, cryptoName, true);
            
        } catch (error) {
            console.error('Error voting on blockchain:', error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    // Vote traditional
    async voteTraditional(cryptoName, cost) {
        try {
            if (window.wonkDB && window.currentUser) {
                await window.wonkDB.recordVote(window.currentUser.uid, cryptoName, cost);
                await window.wonkDB.recordTransaction(window.currentUser.uid, "vote", cost, {
                    cryptoName: cryptoName,
                    action: "vote_cast"
                });
            }
            
            // Update local points
            this.userPoints -= cost;
            
            // Update UI
            if (this.userPointsDisplay) {
                this.userPointsDisplay.textContent = this.userPoints.toLocaleString();
            }
            
            // Save points
            if (window.saveUserPoints) {
                await window.saveUserPoints();
            }
            
            this.showSuccess(`Successfully voted for ${cryptoName}!`);
            
            // Add to live feed
            this.addVoteToFeed(window.currentUser?.uid || 'user', cryptoName, false);
            
            // Update voting cards
            setTimeout(() => {
                this.updateVotingCards();
            }, 1000);
            
        } catch (error) {
            console.error('Error voting traditional:', error);
            throw error;
        }
    }

    // Purchase points on blockchain
    async purchasePointsOnBlockchain(points, ethAmount) {
        try {
            if (!window.blockchainIntegration || !this.userAccount) {
                throw new Error('Blockchain not connected');
            }
            
            this.showLoading('Purchasing points on blockchain...');
            
            const result = await window.blockchainIntegration.purchasePoints(points, ethAmount);
            
            console.log('Points purchased on blockchain:', result.transactionHash);
            
            // Update user points from blockchain
            await this.loadUserBlockchainData();
            
            this.showSuccess(`Successfully purchased ${points} points on blockchain!`);
            
        } catch (error) {
            console.error('Error purchasing points on blockchain:', error);
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    // Show blockchain UI elements
    showBlockchainUI() {
        // Show blockchain-specific elements
        const blockchainElements = document.querySelectorAll('.blockchain-only');
        blockchainElements.forEach(el => el.classList.remove('hidden'));
        
        // Hide traditional elements
        const traditionalElements = document.querySelectorAll('.traditional-only');
        traditionalElements.forEach(el => el.classList.add('hidden'));
        
        // Update voting mode info
        this.updateVotingModeInfo(true);
    }

    // Show traditional UI elements
    showTraditionalUI() {
        // Hide blockchain-specific elements
        const blockchainElements = document.querySelectorAll('.blockchain-only');
        blockchainElements.forEach(el => el.classList.add('hidden'));
        
        // Show traditional elements
        const traditionalElements = document.querySelectorAll('.traditional-only');
        traditionalElements.forEach(el => el.classList.remove('hidden'));
        
        // Update voting mode info
        this.updateVotingModeInfo(false);
    }

    // Update voting mode info
    updateVotingModeInfo(isBlockchain) {
        const infoTitle = document.getElementById('votingModeTitle');
        const infoDesc = document.getElementById('votingModeDescription');
        
        if (infoTitle && infoDesc) {
            if (isBlockchain) {
                infoTitle.textContent = 'Blockchain Voting Mode';
                infoDesc.textContent = 'Votes are recorded on the blockchain for maximum transparency and security.';
            } else {
                infoTitle.textContent = 'Traditional Voting Mode';
                infoDesc.textContent = 'Votes are stored in our secure database. Fast and reliable.';
            }
        }
    }

    // Update wallet UI
    updateWalletUI() {
        if (this.userAccount) {
            // Update wallet address display
            const walletElements = document.querySelectorAll('.wallet-address');
            walletElements.forEach(el => {
                el.textContent = this.formatAddress(this.userAccount);
            });
            
            // Update connect button
            if (this.connectWalletBtn) {
                this.connectWalletBtn.textContent = 'Wallet Connected';
                this.connectWalletBtn.disabled = true;
                this.connectWalletBtn.classList.add('bg-green-500');
            }
        }
    }

    // Update blockchain status
    updateBlockchainStatus() {
        if (this.blockchainStatus) {
            if (window.blockchainIntegration && window.blockchainIntegration.isConnected()) {
                this.blockchainStatus.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span class="text-green-400">Blockchain Connected</span>
                    </div>
                `;
            } else {
                this.blockchainStatus.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span class="text-red-400">Blockchain Disconnected</span>
                    </div>
                `;
            }
        }
    }

    // Handle account change
    handleAccountChange(accounts) {
        if (accounts.length === 0) {
            console.log('Wallet disconnected');
            this.userAccount = null;
            this.updateWalletUI();
            this.updateBlockchainStatus();
        } else {
            console.log('Account changed to:', accounts[0]);
            this.userAccount = accounts[0];
            this.loadUserBlockchainData();
            this.updateWalletUI();
        }
    }

    // Handle chain change
    handleChainChange(chainId) {
        console.log('Chain changed to:', chainId);
        // Reload page or update UI accordingly
        window.location.reload();
    }

    // Add vote to live feed
    addVoteToFeed(userId, cryptoName, isBlockchain) {
        const liveVotesFeed = document.getElementById("liveVotesFeed");
        if (!liveVotesFeed) return;
        
        const voteElement = document.createElement("div");
        voteElement.className = "flex items-center justify-between p-3 mb-2 bg-black bg-opacity-30 rounded-lg animate-fade-in";
        voteElement.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-xs"></i>
                </div>
                <div>
                    <div class="text-sm font-bold text-blue-400">${this.formatAddress(userId)}</div>
                    <div class="text-xs text-gray-400 flex items-center space-x-1">
                        <span>Voted for ${cryptoName}</span>
                        ${isBlockchain ? '<i class="fas fa-link text-blue-400" title="Blockchain"></i>' : ''}
                    </div>
                </div>
            </div>
            <div class="text-xs text-gray-400">
                Just now
            </div>
        `;
        
        if (liveVotesFeed.firstChild) {
            liveVotesFeed.insertBefore(voteElement, liveVotesFeed.firstChild);
        } else {
            liveVotesFeed.appendChild(voteElement);
        }

        // Keep only the last 20 votes
        while (liveVotesFeed.children.length > 20) {
            liveVotesFeed.removeChild(liveVotesFeed.lastChild);
        }
    }

    // Utility functions
    getCryptoIcon(name) {
        const icons = {
            'MOONSHOT': '🚀',
            'DIAMOND': '💎',
            'LIGHTNING': '⚡',
            'ROCKET': '🌙',
            'FIRE': '🔥',
            'STAR': '⭐',
            'BITCOIN': '₿',
            'ETHEREUM': 'Ξ',
            'SOLANA': '◎'
        };
        return icons[name] || '🪙';
    }

    getCryptoColor(name) {
        const colors = {
            'MOONSHOT': 'blue',
            'DIAMOND': 'green',
            'LIGHTNING': 'purple',
            'ROCKET': 'yellow',
            'FIRE': 'red',
            'STAR': 'orange',
            'BITCOIN': 'orange',
            'ETHEREUM': 'blue',
            'SOLANA': 'purple'
        };
        return colors[name] || 'blue';
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // UI feedback functions
    showSuccess(message) {
        console.log('SUCCESS:', message);
        // In a real app, show toast notification
        if (window.showSuccessMessage) {
            window.showSuccessMessage(message);
        }
    }

    showError(message) {
        console.error('ERROR:', message);
        // In a real app, show toast notification
        if (window.showErrorMessage) {
            window.showErrorMessage(message);
        }
    }

    showLoading(message) {
        console.log('LOADING:', message);
        // In a real app, show loading spinner
    }

    hideLoading() {
        console.log('Loading hidden');
        // In a real app, hide loading spinner
    }

    showBuyPointsModal() {
        const modal = document.getElementById('buyPointsModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
}

// Initialize global instance
const blockchainVotingUI = new BlockchainVotingUI();

// Export for global use
window.blockchainVotingUI = blockchainVotingUI;

console.log('Blockchain Voting UI module loaded successfully');

