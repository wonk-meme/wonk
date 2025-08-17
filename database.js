// Database Management System
class WonkDatabase {
  constructor() {
    this.db = firebase.firestore();
    this.users = this.db.collection('users');
    this.votes = this.db.collection('votes');
    this.transactions = this.db.collection('transactions');
    this.cryptos = this.db.collection('cryptos');
  }

  // User Management
  async createUser(userId, userData) {
    try {
      const userRef = this.users.doc(userId);
      const defaultUserData = {
        userId: userId,
        email: userData.email || null,
        displayName: userData.displayName || `User${userId.substring(0, 8)}`,
        photoURL: userData.photoURL || null,
        walletAddress: userData.walletAddress || null,
        points: 1000,
        totalVotes: 0,
        totalSpent: 0,
        joinDate: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        loginMethod: userData.loginMethod || 'unknown',
        isActive: true,
        level: 1,
        achievements: []
      };

      await userRef.set(defaultUserData, { merge: true });
      console.log('User created successfully:', userId);
      return defaultUserData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUser(userId) {
    try {
      const userDoc = await this.users.doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      await this.users.doc(userId).update({
        ...updateData,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('User updated successfully:', userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async updateUserPoints(userId, newPoints) {
    try {
      await this.users.doc(userId).update({
        points: newPoints,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user points:', error);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      await this.users.doc(userId).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Voting System
  async recordVote(userId, cryptoName, pointsCost) {
    try {
      const batch = this.db.batch();
      
      // Add vote record
      const voteRef = this.votes.doc();
      batch.set(voteRef, {
        userId: userId,
        cryptoName: cryptoName,
        pointsCost: pointsCost,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        voteId: voteRef.id
      });

      // Update user stats
      const userRef = this.users.doc(userId);
      batch.update(userRef, {
        totalVotes: firebase.firestore.FieldValue.increment(1),
        totalSpent: firebase.firestore.FieldValue.increment(pointsCost),
        points: firebase.firestore.FieldValue.increment(-pointsCost)
      });

      // Update crypto vote count
      const cryptoRef = this.cryptos.doc(cryptoName);
      batch.update(cryptoRef, {
        totalVotes: firebase.firestore.FieldValue.increment(1),
        lastVoted: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await batch.commit();
      console.log('Vote recorded successfully');
      return voteRef.id;
    } catch (error) {
      console.error('Error recording vote:', error);
      throw error;
    }
  }

  async getRecentVotes(limit = 50) {
    try {
      const votesSnapshot = await this.votes
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return votesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting recent votes:', error);
      throw error;
    }
  }

  // Transaction Management
  async recordTransaction(userId, type, amount, details) {
    try {
      const transactionRef = this.transactions.doc();
      await transactionRef.set({
        userId: userId,
        type: type,
        amount: amount,
        details: details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        transactionId: transactionRef.id,
        status: 'completed'
      });

      console.log('Transaction recorded:', transactionRef.id);
      return transactionRef.id;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  async getUserTransactions(userId, limit = 20) {
    try {
      const transactionsSnapshot = await this.transactions
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  // Crypto Management
  async initializeCryptos() {
    try {
      const cryptos = [
        { name: 'MOONSHOT', icon: '🚀', color: 'blue', totalVotes: 0, active: true },
        { name: 'DIAMOND', icon: '💎', color: 'green', totalVotes: 0, active: true },
        { name: 'LIGHTNING', icon: '⚡', color: 'purple', totalVotes: 0, active: true },
        { name: 'ROCKET', icon: '🌙', color: 'yellow', totalVotes: 0, active: true },
        { name: 'FIRE', icon: '🔥', color: 'red', totalVotes: 0, active: true },
        { name: 'STAR', icon: '⭐', color: 'orange', totalVotes: 0, active: true }
      ];

      const batch = this.db.batch();
      
      for (const crypto of cryptos) {
        const cryptoRef = this.cryptos.doc(crypto.name);
        batch.set(cryptoRef, {
          ...crypto,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      console.log('Cryptos initialized successfully');
    } catch (error) {
      console.error('Error initializing cryptos:', error);
      throw error;
    }
  }

  async getCryptos() {
    try {
      const cryptosSnapshot = await this.cryptos
        .where('active', '==', true)
        .orderBy('totalVotes', 'desc')
        .get();
      
      return cryptosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting cryptos:', error);
      throw error;
    }
  }

  // Statistics
  async getGlobalStats() {
    try {
      const [usersSnapshot, votesSnapshot, transactionsSnapshot] = await Promise.all([
        this.users.get(),
        this.votes.get(),
        this.transactions.where('type', '==', 'purchase').get()
      ]);

      return {
        totalUsers: usersSnapshot.size,
        totalVotes: votesSnapshot.size,
        totalTransactions: transactionsSnapshot.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting global stats:', error);
      throw error;
    }
  }

  // Real-time listeners
  listenToRecentVotes(callback, limit = 20) {
    return this.votes
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .onSnapshot(snapshot => {
        const votes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(votes);
      });
  }

  listenToUserData(userId, callback) {
    return this.users.doc(userId).onSnapshot(doc => {
      if (doc.exists) {
        callback(doc.data());
      }
    });
  }

  listenToCryptoStats(callback) {
    return this.cryptos
      .where('active', '==', true)
      .onSnapshot(snapshot => {
        const cryptos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(cryptos);
      });
  }

  // Leaderboard
  async getTopVoters(limit = 10) {
    try {
      const topVotersSnapshot = await this.users
        .where('totalVotes', '>', 0)
        .orderBy('totalVotes', 'desc')
        .limit(limit)
        .get();
      
      return topVotersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting top voters:', error);
      throw error;
    }
  }

  // Data cleanup and maintenance
  async cleanupOldVotes(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const oldVotesSnapshot = await this.votes
        .where('timestamp', '<', cutoffDate)
        .get();
      
      const batch = this.db.batch();
      oldVotesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Cleaned up ${oldVotesSnapshot.size} old votes`);
    } catch (error) {
      console.error('Error cleaning up old votes:', error);
    }
  }

  // Backup user data
  async exportUserData(userId) {
    try {
      const [user, votes, transactions] = await Promise.all([
        this.getUser(userId),
        this.votes.where('userId', '==', userId).get(),
        this.transactions.where('userId', '==', userId).get()
      ]);

      return {
        user: user,
        votes: votes.docs.map(doc => doc.data()),
        transactions: transactions.docs.map(doc => doc.data()),
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }
}

// Initialize database instance
const wonkDB = new WonkDatabase();

// Initialize cryptos on first load
wonkDB.initializeCryptos().catch(console.error);

// Export for global use
window.wonkDB = wonkDB;
	
