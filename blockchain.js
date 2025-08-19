// Blockchain Integration for WONK Voting
class BlockchainVoting {
    constructor() {
        this.contractAddress = null; // Will be set after deployment
        this.contract = null;
        this.web3 = null;
        this.isConnected = false;
    }

    // Initialize Web3 connection
    async initialize() {
        try {
            // Check if Web3 is available
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                console.log('Web3 initialized with MetaMask');
                return true;
            } else if (typeof window.solana !== 'undefined') {
                // For Solana/Phantom integration
                console.log('Solana wallet detected');
                return await this.initializeSolana();
            } else {
                console.warn('No Web3 provider found');
                return false;
            }
        } catch (error) {
            console.error('Error initializing blockchain:', error);
            return false;
        }
    }

    // Initialize Solana connection
    async initializeSolana() {
        try {
            if (window.solana && window.solana.isPhantom) {
                await window.solana.connect();
                this.isConnected = true;
                console.log('Connected to Solana via Phantom');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error connecting to Solana:', error);
            return false;
        }
    }

    // Cast vote on blockchain
    async castVote(cryptoName, userAddress) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            // For demo purposes, we'll simulate blockchain interaction
            const voteData = {
                voter: userAddress,
                cryptoName: cryptoName,
                timestamp: Date.now(),
                pointsSpent: 10,
                transactionHash: this.generateTransactionHash(),
                blockNumber: Math.floor(Math.random() * 1000000) + 1000000
            };

            // Simulate blockchain delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Store vote data locally for demo
            this.storeVoteLocally(voteData);

            console.log('Vote cast on blockchain:', voteData);
            return voteData;
        } catch (error) {
            console.error('Error casting vote on blockchain:', error);
            throw error;
        }
    }

    // Generate mock transaction hash
    generateTransactionHash() {
        const chars = '0123456789abcdef';
        let hash = '0x';
        for (let i = 0; i < 64; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }

    // Store vote locally for demo
    storeVoteLocally(voteData) {
        let votes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
        votes.push(voteData);
        
        // Keep only last 100 votes
        if (votes.length > 100) {
            votes = votes.slice(-100);
        }
        
        localStorage.setItem('blockchain_votes', JSON.stringify(votes));
    }

    // Get recent blockchain votes
    getRecentVotes(limit = 20) {
        const votes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
        return votes.slice(-limit).reverse();
    }

    // Verify vote on blockchain
    async verifyVote(transactionHash) {
        try {
            // Simulate blockchain verification
            const votes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
            const vote = votes.find(v => v.transactionHash === transactionHash);
            
            if (vote) {
                return {
                    verified: true,
                    vote: vote,
                    confirmations: Math.floor(Math.random() * 100) + 1
                };
            }
            
            return { verified: false };
        } catch (error) {
            console.error('Error verifying vote:', error);
            return { verified: false, error: error.message };
        }
    }

    // Get voting statistics from blockchain
    async getVotingStats() {
        try {
            const votes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
            const stats = {};
            
            votes.forEach(vote => {
                if (!stats[vote.cryptoName]) {
                    stats[vote.cryptoName] = 0;
                }
                stats[vote.cryptoName]++;
            });
            
            return {
                totalVotes: votes.length,
                cryptoStats: stats,
                lastUpdate: Date.now()
            };
        } catch (error) {
            console.error('Error getting voting stats:', error);
            return { totalVotes: 0, cryptoStats: {}, lastUpdate: Date.now() };
        }
    }

    // Get winning crypto
    async getWinningCrypto() {
        try {
            const stats = await this.getVotingStats();
            let winner = { name: '', votes: 0 };
            
            Object.entries(stats.cryptoStats).forEach(([name, votes]) => {
                if (votes > winner.votes) {
                    winner = { name, votes };
                }
            });
            
            return winner;
        } catch (error) {
            console.error('Error getting winning crypto:', error);
            return { name: '', votes: 0 };
        }
    }

    // Check if user has sufficient points for voting
    async checkUserPoints(userAddress) {
        try {
            // In a real implementation, this would check the smart contract
            // For demo, we'll use the current user's points from the app
            return currentUser ? userPoints >= 10 : false;
        } catch (error) {
            console.error('Error checking user points:', error);
            return false;
        }
    }

    // Add points to user (admin function)
    async addPointsToUser(userAddress, points) {
        try {
            // This would interact with the smart contract in a real implementation
            console.log(`Adding ${points} points to user ${userAddress}`);
            return true;
        } catch (error) {
            console.error('Error adding points:', error);
            return false;
        }
    }

    // Get transaction details
    async getTransactionDetails(transactionHash) {
        try {
            const votes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
            const vote = votes.find(v => v.transactionHash === transactionHash);
            
            if (vote) {
                return {
                    hash: vote.transactionHash,
                    blockNumber: vote.blockNumber,
                    from: vote.voter,
                    timestamp: vote.timestamp,
                    data: vote,
                    status: 'confirmed'
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error getting transaction details:', error);
            return null;
        }
    }
}

// Initialize blockchain voting instance
const blockchainVoting = new BlockchainVoting();

// Export for global use
window.blockchainVoting = blockchainVoting;

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await blockchainVoting.initialize();
        console.log('Blockchain voting system initialized');
    } catch (error) {
        console.error('Failed to initialize blockchain voting:', error);
    }
});
