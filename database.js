// Enhanced Database Management System for WONK
class WonkDatabase {
  constructor() {
    this.db = null;
    this.users = null;
    this.votes = null;
    this.transactions = null;
    this.cryptos = null;
    this.settings = null;
    this.isInitialized = false;
    
    this.init();
  }

  // Initialize database connection
  init() {
    try {
      if (firebase.firestore) {
        this.db = firebase.firestore();
        this.users = this.db.collection('users');
        this.votes = this.db.collection('votes');
        this.transactions = this.db.collection('transactions');
        this.cryptos = this.db.collection('cryptos');
        this.settings = this.db.collection('settings');
        this.isInitialized = true;
        
        console.log('WonkDatabase initialized with Firebase Firestore');
        
        // Initialize default data
        this.initializeDefaultData();
      } else {
        console.warn('Firebase Firestore not available, using demo mode');
        this.initializeDemoMode();
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      this.initializeDemoMode();
    }
  }

  // Initialize demo mode with localStorage
  initializeDemoMode() {
    console.log('Initializing demo mode with localStorage');
    this.isInitialized = false;
    
    // Initialize demo data if not exists
    if (!localStorage.getItem('wonk_demo_initialized')) {
      this.initializeDemoData();
      localStorage.setItem('wonk_demo_initialized', 'true');
    }
  }

  // Initialize demo data
  initializeDemoData() {
    const defaultCryptos = [
      { name: 'MOONSHOT', icon: '🚀', color: 'blue', totalVotes: 2150, active: true },
      { name: 'DIAMOND', icon: '💎', color: 'green', totalVotes: 1250, active: true },
      { name: 'LIGHTNING', icon: '⚡', color: 'purple', totalVotes: 750, active: true },
      { name: 'ROCKET', icon: '🌙', color: 'yellow', totalVotes: 890, active: true },
      { name: 'FIRE', icon: '🔥', color: 'red', totalVotes: 1120, active: true },
      { name: 'STAR', icon: '⭐', color: 'orange', totalVotes: 680, active: true }
    ];
    
    localStorage.setItem('wonk_cryptos', JSON.stringify(defaultCryptos));
    
    const defaultSettings = {
      voteCost: 10,
      defaultPoints: 1000,
      votingEnabled: true,
      pointPrice: 0.001,
      adminWallet: null
    };
    
    localStorage.setItem('wonk_settings', JSON.stringify(defaultSettings));
    
    console.log('Demo data initialized');
  }

  // Initialize default data for Firebase
  async initializeDefaultData() {
    try {
      // Check if cryptos already exist
      const cryptosSnapshot = await this.cryptos.limit(1).get();
      if (cryptosSnapshot.empty) {
        await this.initializeCryptos();
      }
      
      // Check if settings exist
      const settingsDoc = await this.settings.doc('system').get();
      if (!settingsDoc.exists) {
        await this.initializeSystemSettings();
      }
      
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  // User Management
  async createUser(userId, userData) {
    try {
      if (!this.isInitialized) {
        return this.createUserDemo(userId, userData);
      }
      
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
        achievements: [],
        preferences: {
          notifications: true,
          emailUpdates: false,
          theme: 'dark'
        }
      };

      await userRef.set(defaultUserData, { merge: true });
      console.log('User created successfully:', userId);
      
      // Return the data with actual timestamp
      return {
        ...defaultUserData,
        joinDate: new Date(),
        lastLogin: new Date()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Demo mode user creation
  createUserDemo(userId, userData) {
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    
    const defaultUserData = {
      userId: userId,
      email: userData.email || null,
      displayName: userData.displayName || `User${userId.substring(0, 8)}`,
      photoURL: userData.photoURL || null,
      walletAddress: userData.walletAddress || null,
      points: 1000,
      totalVotes: 0,
      totalSpent: 0,
      joinDate: new Date(),
      lastLogin: new Date(),
      loginMethod: userData.loginMethod || 'unknown',
      isActive: true,
      level: 1,
      achievements: [],
      preferences: {
        notifications: true,
        emailUpdates: false,
        theme: 'dark'
      }
    };
    
    users[userId] = defaultUserData;
    localStorage.setItem('wonk_users', JSON.stringify(users));
    
    console.log('Demo user created:', userId);
    return defaultUserData;
  }

  async getUser(userId) {
    try {
      if (!this.isInitialized) {
        return this.getUserDemo(userId);
      }
      
      const userDoc = await this.users.doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Convert Firestore timestamps to Date objects
        if (userData.joinDate && userData.joinDate.toDate) {
          userData.joinDate = userData.joinDate.toDate();
        }
        if (userData.lastLogin && userData.lastLogin.toDate) {
          userData.lastLogin = userData.lastLogin.toDate();
        }
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Demo mode get user
  getUserDemo(userId) {
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    const userData = users[userId];
    
    if (userData) {
      // Convert string dates back to Date objects
      if (typeof userData.joinDate === 'string') {
        userData.joinDate = new Date(userData.joinDate);
      }
      if (typeof userData.lastLogin === 'string') {
        userData.lastLogin = new Date(userData.lastLogin);
      }
    }
    
    return userData || null;
  }

  async updateUser(userId, updateData) {
    try {
      if (!this.isInitialized) {
        return this.updateUserDemo(userId, updateData);
      }
      
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

  // Demo mode update user
  updateUserDemo(userId, updateData) {
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    if (users[userId]) {
      users[userId] = { ...users[userId], ...updateData, lastUpdated: new Date() };
      localStorage.setItem('wonk_users', JSON.stringify(users));
      console.log('Demo user updated:', userId);
    }
  }

  async updateUserPoints(userId, newPoints) {
    try {
      if (!this.isInitialized) {
        return this.updateUserPointsDemo(userId, newPoints);
      }
      
      await this.users.doc(userId).update({
        points: newPoints,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user points:', error);
      throw error;
    }
  }

  // Demo mode update user points
  updateUserPointsDemo(userId, newPoints) {
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    if (users[userId]) {
      users[userId].points = newPoints;
      users[userId].lastUpdated = new Date();
      localStorage.setItem('wonk_users', JSON.stringify(users));
    }
  }

  async updateLastLogin(userId) {
    try {
      if (!this.isInitialized) {
        return this.updateLastLoginDemo(userId);
      }
      
      await this.users.doc(userId).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Demo mode update last login
  updateLastLoginDemo(userId) {
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    if (users[userId]) {
      users[userId].lastLogin = new Date();
      localStorage.setItem('wonk_users', JSON.stringify(users));
    }
  }

  // Voting System
  async recordVote(userId, cryptoName, pointsCost) {
    try {
      if (!this.isInitialized) {
        return this.recordVoteDemo(userId, cryptoName, pointsCost);
      }
      
      const batch = this.db.batch();
      
      // Add vote record
      const voteRef = this.votes.doc();
      batch.set(voteRef, {
        userId: userId,
        cryptoName: cryptoName,
        pointsCost: pointsCost,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        voteId: voteRef.id,
        blockchainTx: null, // For blockchain votes
        voteType: 'traditional'
      });

      // Update user stats
      const userRef = this.users.doc(userId);
      batch.update(userRef, {
        totalVotes: firebase.firestore.FieldValue.increment(1),
        totalSpent: firebase.firestore.FieldValue.increment(pointsCost),
        points: firebase.firestore.FieldValue.increment(-pointsCost),
        lastVoted: firebase.firestore.FieldValue.serverTimestamp()
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

  // Demo mode record vote
  recordVoteDemo(userId, cryptoName, pointsCost) {
    // Update user
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    if (users[userId]) {
      users[userId].totalVotes = (users[userId].totalVotes || 0) + 1;
      users[userId].totalSpent = (users[userId].totalSpent || 0) + pointsCost;
      users[userId].points = (users[userId].points || 0) - pointsCost;
      users[userId].lastVoted = new Date();
      localStorage.setItem('wonk_users', JSON.stringify(users));
    }
    
    // Update crypto
    const cryptos = JSON.parse(localStorage.getItem('wonk_cryptos') || '[]');
    const crypto = cryptos.find(c => c.name === cryptoName);
    if (crypto) {
      crypto.totalVotes = (crypto.totalVotes || 0) + 1;
      crypto.lastVoted = new Date();
      localStorage.setItem('wonk_cryptos', JSON.stringify(cryptos));
    }
    
    // Record vote
    const votes = JSON.parse(localStorage.getItem('wonk_votes') || '[]');
    const voteId = 'vote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    votes.push({
      voteId: voteId,
      userId: userId,
      cryptoName: cryptoName,
      pointsCost: pointsCost,
      timestamp: new Date(),
      voteType: 'traditional'
    });
    
    // Keep only last 1000 votes
    if (votes.length > 1000) {
      votes.splice(0, votes.length - 1000);
    }
    
    localStorage.setItem('wonk_votes', JSON.stringify(votes));
    console.log('Demo vote recorded');
    return voteId;
  }

  async getRecentVotes(limit = 50) {
    try {
      if (!this.isInitialized) {
        return this.getRecentVotesDemo(limit);
      }
      
      const votesSnapshot = await this.votes
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return votesSnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamp to Date
        if (data.timestamp && data.timestamp.toDate) {
          data.timestamp = data.timestamp.toDate();
        }
        return {
          id: doc.id,
          ...data
        };
      });
    } catch (error) {
      console.error('Error getting recent votes:', error);
      throw error;
    }
  }

  // Demo mode get recent votes
  getRecentVotesDemo(limit = 50) {
    const votes = JSON.parse(localStorage.getItem('wonk_votes') || '[]');
    return votes
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(vote => ({
        id: vote.voteId,
        ...vote,
        timestamp: new Date(vote.timestamp)
      }));
  }

  // Transaction Management
  async recordTransaction(userId, type, amount, details) {
    try {
      if (!this.isInitialized) {
        return this.recordTransactionDemo(userId, type, amount, details);
      }
      
      const transactionRef = this.transactions.doc();
      await transactionRef.set({
        userId: userId,
        type: type,
        amount: amount,
        details: details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        transactionId: transactionRef.id,
        status: 'completed',
        blockchainTx: details.blockchainTx || null
      });

      console.log('Transaction recorded:', transactionRef.id);
      return transactionRef.id;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw error;
    }
  }

  // Demo mode record transaction
  recordTransactionDemo(userId, type, amount, details) {
    const transactions = JSON.parse(localStorage.getItem('wonk_transactions') || '[]');
    const transactionId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    transactions.push({
      transactionId: transactionId,
      userId: userId,
      type: type,
      amount: amount,
      details: details,
      timestamp: new Date(),
      status: 'completed'
    });
    
    // Keep only last 1000 transactions
    if (transactions.length > 1000) {
      transactions.splice(0, transactions.length - 1000);
    }
    
    localStorage.setItem('wonk_transactions', JSON.stringify(transactions));
    console.log('Demo transaction recorded:', transactionId);
    return transactionId;
  }

  async getUserTransactions(userId, limit = 20) {
    try {
      if (!this.isInitialized) {
        return this.getUserTransactionsDemo(userId, limit);
      }
      
      const transactionsSnapshot = await this.transactions
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamp to Date
        if (data.timestamp && data.timestamp.toDate) {
          data.timestamp = data.timestamp.toDate();
        }
        return {
          id: doc.id,
          ...data
        };
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  // Demo mode get user transactions
  getUserTransactionsDemo(userId, limit = 20) {
    const transactions = JSON.parse(localStorage.getItem('wonk_transactions') || '[]');
    return transactions
      .filter(tx => tx.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(tx => ({
        id: tx.transactionId,
        ...tx,
        timestamp: new Date(tx.timestamp)
      }));
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
      if (!this.isInitialized) {
        return this.getCryptosDemo();
      }
      
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

  // Demo mode get cryptos
  getCryptosDemo() {
    const cryptos = JSON.parse(localStorage.getItem('wonk_cryptos') || '[]');
    return cryptos
      .filter(crypto => crypto.active)
      .sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
  }

  // Statistics
  async getGlobalStats() {
    try {
      if (!this.isInitialized) {
        return this.getGlobalStatsDemo();
      }
      
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

  // Demo mode global stats
  getGlobalStatsDemo() {
    const users = JSON.parse(localStorage.getItem('wonk_users') || '{}');
    const votes = JSON.parse(localStorage.getItem('wonk_votes') || '[]');
    const transactions = JSON.parse(localStorage.getItem('wonk_transactions') || '[]');
    
    return {
      totalUsers: Object.keys(users).length,
      totalVotes: votes.length,
      totalTransactions: transactions.filter(tx => tx.type === 'purchase').length,
      timestamp: new Date()
    };
  }

  // Real-time listeners
  listenToRecentVotes(callback, limit = 20) {
    if (!this.isInitialized) {
      // Demo mode - simulate real-time updates
      const votes = this.getRecentVotesDemo(limit);
      callback(votes);
      
      // Simulate periodic updates
      setInterval(() => {
        const updatedVotes = this.getRecentVotesDemo(limit);
        callback(updatedVotes);
      }, 30000); // Update every 30 seconds
      
      return () => {}; // Return empty unsubscribe function
    }
    
    return this.votes
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .onSnapshot(snapshot => {
        const votes = snapshot.docs.map(doc => {
          const data = doc.data();
          if (data.timestamp && data.timestamp.toDate) {
            data.timestamp = data.timestamp.toDate();
          }
          return {
            id: doc.id,
            ...data
          };
        });
        callback(votes);
      });
  }

  listenToUserData(userId, callback) {
    if (!this.isInitialized) {
      // Demo mode - get user data and simulate updates
      const userData = this.getUserDemo(userId);
      if (userData) {
        callback(userData);
      }
      return () => {};
    }
    
    return this.users.doc(userId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        // Convert Firestore timestamps to Date objects
        if (data.joinDate && data.joinDate.toDate) {
          data.joinDate = data.joinDate.toDate();
        }
        if (data.lastLogin && data.lastLogin.toDate) {
          data.lastLogin = data.lastLogin.toDate();
        }
        callback(data);
      }
    });
  }

  listenToCryptoStats(callback) {
    if (!this.isInitialized) {
      // Demo mode
      const cryptos = this.getCryptosDemo();
      callback(cryptos);
      
      // Simulate periodic updates
      setInterval(() => {
        const updatedCryptos = this.getCryptosDemo();
        callback(updatedCryptos);
      }, 60000); // Update every minute
      
      return () => {};
    }
    
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

  // System Settings
  async initializeSystemSettings() {
    try {
      const defaultSettings = {
        voteCost: 10,
        defaultPoints: 1000,
        votingEnabled: true,
        pointPrice: 0.001,
        adminWallet: null,
        maintenanceMode: false,
        maxVotesPerUser: 1000,
        minPointsForVoting: 10
      };
      
      await this.settings.doc('system').set(defaultSettings);
      console.log('System settings initialized');
    } catch (error) {
      console.error('Error initializing system settings:', error);
    }
  }

  async updateSystemSettings(settings) {
    try {
      if (!this.isInitialized) {
        localStorage.setItem('wonk_settings', JSON.stringify(settings));
        return;
      }
      
      const settingsRef = this.settings.doc('system');
      await settingsRef.set({
        ...settings,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('System settings updated successfully');
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  async getSystemSettings() {
    try {
      if (!this.isInitialized) {
        const settings = localStorage.getItem('wonk_settings');
        return settings ? JSON.parse(settings) : {
          voteCost: 10,
          defaultPoints: 1000,
          votingEnabled: true,
          pointPrice: 0.001
        };
      }
      
      const settingsDoc = await this.settings.doc('system').get();
      if (settingsDoc.exists) {
        return settingsDoc.data();
      }
      return {
        voteCost: 10,
        defaultPoints: 1000,
        votingEnabled: true,
        pointPrice: 0.001
      };
    } catch (error) {
      console.error('Error getting system settings:', error);
      throw error;
    }
  }

  // Admin Functions
  async addCrypto(cryptoData) {
    try {
      if (!this.isInitialized) {
        const cryptos = JSON.parse(localStorage.getItem('wonk_cryptos') || '[]');
        cryptos.push({
          ...cryptoData,
          totalVotes: 0,
          active: true,
          createdAt: new Date()
        });
        localStorage.setItem('wonk_cryptos', JSON.stringify(cryptos));
        return cryptoData.name;
      }
      
      const cryptoRef = this.cryptos.doc(cryptoData.name);
      await cryptoRef.set({
        ...cryptoData,
        totalVotes: 0,
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Crypto added successfully:', cryptoData.name);
      return cryptoData.name;
    } catch (error) {
      console.error('Error adding crypto:', error);
      throw error;
    }
  }

  async updateCrypto(cryptoName, updateData) {
    try {
      if (!this.isInitialized) {
        const cryptos = JSON.parse(localStorage.getItem('wonk_cryptos') || '[]');
        const cryptoIndex = cryptos.findIndex(c => c.name === cryptoName);
        if (cryptoIndex !== -1) {
          cryptos[cryptoIndex] = { ...cryptos[cryptoIndex], ...updateData };
          localStorage.setItem('wonk_cryptos', JSON.stringify(cryptos));
        }
        return;
      }
      
      await this.cryptos.doc(cryptoName).update({
        ...updateData,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Crypto updated successfully:', cryptoName);
    } catch (error) {
      console.error('Error updating crypto:', error);
      throw error;
    }
  }

  async deleteCrypto(cryptoName) {
    try {
      if (!this.isInitialized) {
        const cryptos = JSON.parse(localStorage.getItem('wonk_cryptos') || '[]');
        const filteredCryptos = cryptos.filter(c => c.name !== cryptoName);
        localStorage.setItem('wonk_cryptos', JSON.stringify(filteredCryptos));
        return;
      }
      
      await this.cryptos.doc(cryptoName).delete();
      console.log('Crypto deleted successfully:', cryptoName);
    } catch (error) {
      console.error('Error deleting crypto:', error);
      throw error;
    }
  }

  // Utility functions
  isConnected() {
    return this.isInitialized;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isInitialized,
      mode: this.isInitialized ? 'firebase' : 'demo',
      timestamp: new Date()
    };
  }
}

// Initialize database instance
const wonkDB = new WonkDatabase();

// Export for global use
window.wonkDB = wonkDB;

console.log('Enhanced WonkDatabase loaded successfully');

