// Blockchain Integration for WONK Voting System
class BlockchainIntegration {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.userAccount = null;
        this.contractAddress = null; // Will be set after deployment
        this.contractABI = [
            // Contract ABI will be populated after compilation
            {
                "inputs": [{"internalType": "address", "name": "_adminWallet", "type": "address"}],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "admin", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "AdminWithdrawal",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
                    {"indexed": true, "internalType": "address", "name": "addedBy", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "CryptoAdded",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
                    {"indexed": true, "internalType": "address", "name": "removedBy", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "CryptoRemoved",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "points", "type": "uint256"},
                    {"indexed": false, "internalType": "uint256", "name": "cost", "type": "uint256"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "PointsPurchased",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
                    {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
                    {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
                ],
                "name": "PointsTransferred",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": true, "internalType": "address", "name": "voter", "type": "address"},
                    {"indexed": false, "internalType": "string", "name": "cryptoName", "type": "string"},
                    {"indexed": false, "internalType": "uint256", "name": "pointsSpent", "type": "uint256"},
                    {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "name": "VoteCast",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {"indexed": false, "internalType": "bool", "name": "enabled", "type": "bool"},
                    {"indexed": true, "internalType": "address", "name": "changedBy", "type": "address"}
                ],
                "name": "VotingStatusChanged",
                "type": "event"
            },
            {
                "inputs": [{"internalType": "string", "name": "_name", "type": "string"}],
                "name": "addCrypto",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_points", "type": "uint256"}],
                "name": "calculatePointsCost",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
                "name": "canUserVote",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getActiveCryptos",
                "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getContractStats",
                "outputs": [
                    {"internalType": "uint256", "name": "totalUsers", "type": "uint256"},
                    {"internalType": "uint256", "name": "totalVotes_", "type": "uint256"},
                    {"internalType": "uint256", "name": "totalCryptos", "type": "uint256"},
                    {"internalType": "uint256", "name": "totalRevenue_", "type": "uint256"},
                    {"internalType": "bool", "name": "votingEnabled_", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "_name", "type": "string"}],
                "name": "getCryptoInfo",
                "outputs": [
                    {"internalType": "string", "name": "name", "type": "string"},
                    {"internalType": "uint256", "name": "totalVotes", "type": "uint256"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_count", "type": "uint256"}],
                "name": "getRecentVotes",
                "outputs": [
                    {"internalType": "address[]", "name": "voters", "type": "address[]"},
                    {"internalType": "string[]", "name": "cryptoNames_", "type": "string[]"},
                    {"internalType": "uint256[]", "name": "pointsSpent", "type": "uint256[]"},
                    {"internalType": "uint256[]", "name": "timestamps", "type": "uint256[]"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_limit", "type": "uint256"}],
                "name": "getTopCryptos",
                "outputs": [
                    {"internalType": "string[]", "name": "names", "type": "string[]"},
                    {"internalType": "uint256[]", "name": "votes_", "type": "uint256[]"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
                "name": "getUserInfo",
                "outputs": [
                    {"internalType": "uint256", "name": "points", "type": "uint256"},
                    {"internalType": "uint256", "name": "totalVotes", "type": "uint256"},
                    {"internalType": "uint256", "name": "totalSpent", "type": "uint256"},
                    {"internalType": "uint256", "name": "joinDate", "type": "uint256"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "_user", "type": "address"},
                    {"internalType": "string", "name": "_cryptoName", "type": "string"}
                ],
                "name": "getUserVotesForCrypto",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_points", "type": "uint256"}],
                "name": "purchasePoints",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "registerUser",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "_to", "type": "address"},
                    {"internalType": "uint256", "name": "_amount", "type": "uint256"}
                ],
                "name": "transferPoints",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "_cryptoName", "type": "string"}],
                "name": "vote",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];
        
        this.isInitialized = false;
        this.networkConfig = {
            ethereum: {
                chainId: '0x1', // Mainnet
                chainName: 'Ethereum Mainnet',
                rpcUrls: ['https://mainnet.infura.io/v3/'],
                blockExplorerUrls: ['https://etherscan.io/']
            },
            polygon: {
                chainId: '0x89', // Polygon Mainnet
                chainName: 'Polygon Mainnet',
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/']
            },
            mumbai: {
                chainId: '0x13881', // Polygon Mumbai Testnet
                chainName: 'Polygon Mumbai Testnet',
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com/']
            }
        };
    }

    // Initialize Web3 connection
    async initialize() {
        try {
            console.log('Initializing blockchain integration...');
            
            // Check if Web3 is available
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                console.log('MetaMask detected');
            } else if (typeof window.web3 !== 'undefined') {
                this.web3 = new Web3(window.web3.currentProvider);
                console.log('Legacy Web3 provider detected');
            } else {
                throw new Error('No Web3 provider detected. Please install MetaMask or another Web3 wallet.');
            }
            
            // Request account access
            await this.connectWallet();
            
            // Initialize contract if address is set
            if (this.contractAddress) {
                await this.initializeContract();
            }
            
            this.isInitialized = true;
            console.log('Blockchain integration initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Error initializing blockchain integration:', error);
            throw error;
        }
    }

    // Connect to user's wallet
    async connectWallet() {
        try {
            console.log('Connecting to wallet...');
            
            if (window.ethereum) {
                // Request account access
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                
                this.userAccount = accounts[0];
                console.log('Connected to account:', this.userAccount);
                
                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    this.userAccount = accounts[0];
                    console.log('Account changed to:', this.userAccount);
                });
                
                // Listen for chain changes
                window.ethereum.on('chainChanged', (chainId) => {
                    console.log('Chain changed to:', chainId);
                    window.location.reload(); // Reload page on chain change
                });
                
                return this.userAccount;
            } else {
                throw new Error('No Ethereum wallet detected');
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw error;
        }
    }

    // Initialize smart contract
    async initializeContract() {
        try {
            if (!this.contractAddress) {
                throw new Error('Contract address not set');
            }
            
            console.log('Initializing contract at:', this.contractAddress);
            
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            console.log('Contract initialized successfully');
            
            return this.contract;
        } catch (error) {
            console.error('Error initializing contract:', error);
            throw error;
        }
    }

    // Set contract address (to be called after deployment)
    setContractAddress(address) {
        this.contractAddress = address;
        console.log('Contract address set to:', address);
        
        if (this.web3) {
            this.initializeContract();
        }
    }

    // Switch to specific network
    async switchNetwork(networkName) {
        try {
            const networkConfig = this.networkConfig[networkName];
            if (!networkConfig) {
                throw new Error(`Network ${networkName} not supported`);
            }
            
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: networkConfig.chainId }]
            });
            
            console.log(`Switched to ${networkName} network`);
        } catch (error) {
            // If network doesn't exist, add it
            if (error.code === 4902) {
                await this.addNetwork(networkName);
            } else {
                console.error('Error switching network:', error);
                throw error;
            }
        }
    }

    // Add network to wallet
    async addNetwork(networkName) {
        try {
            const networkConfig = this.networkConfig[networkName];
            if (!networkConfig) {
                throw new Error(`Network ${networkName} not supported`);
            }
            
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [networkConfig]
            });
            
            console.log(`Added ${networkName} network`);
        } catch (error) {
            console.error('Error adding network:', error);
            throw error;
        }
    }

    // Register user on blockchain
    async registerUser() {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            console.log('Registering user on blockchain...');
            
            const gasEstimate = await this.contract.methods.registerUser().estimateGas({
                from: this.userAccount
            });
            
            const result = await this.contract.methods.registerUser().send({
                from: this.userAccount,
                gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
            });
            
            console.log('User registered successfully:', result.transactionHash);
            return result;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    // Cast vote on blockchain
    async vote(cryptoName) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            console.log(`Casting vote for ${cryptoName}...`);
            
            // Check if user can vote
            const canVote = await this.contract.methods.canUserVote(this.userAccount).call();
            if (!canVote) {
                throw new Error('User cannot vote. Check points balance and voting status.');
            }
            
            const gasEstimate = await this.contract.methods.vote(cryptoName).estimateGas({
                from: this.userAccount
            });
            
            const result = await this.contract.methods.vote(cryptoName).send({
                from: this.userAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });
            
            console.log('Vote cast successfully:', result.transactionHash);
            return result;
        } catch (error) {
            console.error('Error casting vote:', error);
            throw error;
        }
    }

    // Purchase points on blockchain
    async purchasePoints(points, ethAmount) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            console.log(`Purchasing ${points} points for ${ethAmount} ETH...`);
            
            const weiAmount = this.web3.utils.toWei(ethAmount.toString(), 'ether');
            
            const gasEstimate = await this.contract.methods.purchasePoints(points).estimateGas({
                from: this.userAccount,
                value: weiAmount
            });
            
            const result = await this.contract.methods.purchasePoints(points).send({
                from: this.userAccount,
                value: weiAmount,
                gas: Math.floor(gasEstimate * 1.2)
            });
            
            console.log('Points purchased successfully:', result.transactionHash);
            return result;
        } catch (error) {
            console.error('Error purchasing points:', error);
            throw error;
        }
    }

    // Transfer points to another user
    async transferPoints(toAddress, amount) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            console.log(`Transferring ${amount} points to ${toAddress}...`);
            
            const gasEstimate = await this.contract.methods.transferPoints(toAddress, amount).estimateGas({
                from: this.userAccount
            });
            
            const result = await this.contract.methods.transferPoints(toAddress, amount).send({
                from: this.userAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });
            
            console.log('Points transferred successfully:', result.transactionHash);
            return result;
        } catch (error) {
            console.error('Error transferring points:', error);
            throw error;
        }
    }

    // Get user information from blockchain
    async getUserInfo(userAddress = null) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const address = userAddress || this.userAccount;
            const userInfo = await this.contract.methods.getUserInfo(address).call();
            
            return {
                points: parseInt(userInfo.points),
                totalVotes: parseInt(userInfo.totalVotes),
                totalSpent: parseInt(userInfo.totalSpent),
                joinDate: new Date(parseInt(userInfo.joinDate) * 1000),
                isActive: userInfo.isActive
            };
        } catch (error) {
            console.error('Error getting user info:', error);
            throw error;
        }
    }

    // Get crypto information
    async getCryptoInfo(cryptoName) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const cryptoInfo = await this.contract.methods.getCryptoInfo(cryptoName).call();
            
            return {
                name: cryptoInfo.name,
                totalVotes: parseInt(cryptoInfo.totalVotes),
                isActive: cryptoInfo.isActive,
                createdAt: new Date(parseInt(cryptoInfo.createdAt) * 1000)
            };
        } catch (error) {
            console.error('Error getting crypto info:', error);
            throw error;
        }
    }

    // Get all active cryptos
    async getActiveCryptos() {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const cryptos = await this.contract.methods.getActiveCryptos().call();
            return cryptos;
        } catch (error) {
            console.error('Error getting active cryptos:', error);
            throw error;
        }
    }

    // Get recent votes
    async getRecentVotes(count = 20) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const votes = await this.contract.methods.getRecentVotes(count).call();
            
            return votes.voters.map((voter, index) => ({
                voter: voter,
                cryptoName: votes.cryptoNames_[index],
                pointsSpent: parseInt(votes.pointsSpent[index]),
                timestamp: new Date(parseInt(votes.timestamps[index]) * 1000)
            }));
        } catch (error) {
            console.error('Error getting recent votes:', error);
            throw error;
        }
    }

    // Get contract statistics
    async getContractStats() {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const stats = await this.contract.methods.getContractStats().call();
            
            return {
                totalUsers: parseInt(stats.totalUsers),
                totalVotes: parseInt(stats.totalVotes_),
                totalCryptos: parseInt(stats.totalCryptos),
                totalRevenue: this.web3.utils.fromWei(stats.totalRevenue_, 'ether'),
                votingEnabled: stats.votingEnabled_
            };
        } catch (error) {
            console.error('Error getting contract stats:', error);
            throw error;
        }
    }

    // Get top voted cryptos
    async getTopCryptos(limit = 10) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const topCryptos = await this.contract.methods.getTopCryptos(limit).call();
            
            return topCryptos.names.map((name, index) => ({
                name: name,
                votes: parseInt(topCryptos.votes_[index])
            }));
        } catch (error) {
            console.error('Error getting top cryptos:', error);
            throw error;
        }
    }

    // Calculate points cost
    async calculatePointsCost(points) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const cost = await this.contract.methods.calculatePointsCost(points).call();
            return this.web3.utils.fromWei(cost, 'ether');
        } catch (error) {
            console.error('Error calculating points cost:', error);
            throw error;
        }
    }

    // Listen to contract events
    listenToEvents(eventName, callback) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            
            const eventSubscription = this.contract.events[eventName]({
                fromBlock: 'latest'
            });
            
            eventSubscription.on('data', (event) => {
                console.log(`${eventName} event received:`, event);
                callback(event);
            });
            
            eventSubscription.on('error', (error) => {
                console.error(`Error in ${eventName} event listener:`, error);
            });
            
            return eventSubscription;
        } catch (error) {
            console.error('Error setting up event listener:', error);
            throw error;
        }
    }

    // Get transaction receipt
    async getTransactionReceipt(txHash) {
        try {
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);
            return receipt;
        } catch (error) {
            console.error('Error getting transaction receipt:', error);
            throw error;
        }
    }

    // Get current gas price
    async getGasPrice() {
        try {
            const gasPrice = await this.web3.eth.getGasPrice();
            return this.web3.utils.fromWei(gasPrice, 'gwei');
        } catch (error) {
            console.error('Error getting gas price:', error);
            throw error;
        }
    }

    // Get user's ETH balance
    async getBalance(address = null) {
        try {
            const userAddress = address || this.userAccount;
            const balance = await this.web3.eth.getBalance(userAddress);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    // Utility function to format address
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Check if user is connected
    isConnected() {
        return this.userAccount !== null && this.isInitialized;
    }

    // Get current network
    async getCurrentNetwork() {
        try {
            const chainId = await this.web3.eth.getChainId();
            return chainId;
        } catch (error) {
            console.error('Error getting current network:', error);
            throw error;
        }
    }
}

// Initialize global blockchain integration instance
const blockchainIntegration = new BlockchainIntegration();

// Export for use in other files
window.blockchainIntegration = blockchainIntegration;

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Only initialize if Web3 is available
        if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
            console.log('Web3 detected, initializing blockchain integration...');
            // Don't auto-connect, wait for user action
        } else {
            console.log('No Web3 provider detected. Blockchain features will be unavailable.');
        }
    } catch (error) {
        console.error('Error during blockchain initialization:', error);
    }
});

console.log('Blockchain integration module loaded successfully');

