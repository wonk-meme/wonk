// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title WonkVoting
 * @dev Smart contract for WONK decentralized voting system with points management
 */
contract WonkVoting is ReentrancyGuard, Ownable, Pausable {
    
    // Events
    event VoteCast(address indexed voter, string cryptoName, uint256 pointsSpent, uint256 timestamp);
    event PointsPurchased(address indexed user, uint256 points, uint256 cost, uint256 timestamp);
    event CryptoAdded(string name, address indexed addedBy, uint256 timestamp);
    event CryptoRemoved(string name, address indexed removedBy, uint256 timestamp);
    event PointsTransferred(address indexed from, address indexed to, uint256 amount);
    event AdminWithdrawal(address indexed admin, uint256 amount, uint256 timestamp);
    event VotingStatusChanged(bool enabled, address indexed changedBy);
    
    // Structs
    struct User {
        uint256 points;
        uint256 totalVotes;
        uint256 totalSpent;
        uint256 joinDate;
        bool isActive;
        mapping(string => uint256) votesPerCrypto;
    }
    
    struct Crypto {
        string name;
        uint256 totalVotes;
        bool isActive;
        uint256 createdAt;
        mapping(address => uint256) userVotes;
    }
    
    struct Vote {
        address voter;
        string cryptoName;
        uint256 pointsSpent;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    // State variables
    mapping(address => User) public users;
    mapping(string => Crypto) public cryptos;
    mapping(uint256 => Vote) public votes;
    
    string[] public cryptoNames;
    address[] public userAddresses;
    uint256 public totalVotes;
    uint256 public voteCounter;
    
    // System settings
    uint256 public constant DEFAULT_POINTS = 1000;
    uint256 public constant VOTE_COST = 10;
    uint256 public pointPrice = 0.001 ether; // Price per point in ETH/SOL
    bool public votingEnabled = true;
    
    // Admin settings
    address public adminWallet;
    uint256 public totalRevenue;
    
    // Modifiers
    modifier onlyActiveUser() {
        require(users[msg.sender].isActive, "User not active");
        _;
    }
    
    modifier validCrypto(string memory _cryptoName) {
        require(cryptos[_cryptoName].isActive, "Crypto not active or doesn't exist");
        _;
    }
    
    modifier votingIsEnabled() {
        require(votingEnabled, "Voting is currently disabled");
        _;
    }
    
    modifier hasEnoughPoints(uint256 _pointsRequired) {
        require(users[msg.sender].points >= _pointsRequired, "Insufficient points");
        _;
    }
    
    constructor(address _adminWallet) {
        adminWallet = _adminWallet;
        
        // Initialize default cryptos
        _addCrypto("MOONSHOT");
        _addCrypto("DIAMOND");
        _addCrypto("LIGHTNING");
        _addCrypto("ROCKET");
        _addCrypto("FIRE");
        _addCrypto("STAR");
    }
    
    /**
     * @dev Register a new user with default points
     */
    function registerUser() external {
        require(!users[msg.sender].isActive, "User already registered");
        
        users[msg.sender].points = DEFAULT_POINTS;
        users[msg.sender].totalVotes = 0;
        users[msg.sender].totalSpent = 0;
        users[msg.sender].joinDate = block.timestamp;
        users[msg.sender].isActive = true;
        
        userAddresses.push(msg.sender);
        
        emit PointsPurchased(msg.sender, DEFAULT_POINTS, 0, block.timestamp);
    }
    
    /**
     * @dev Cast a vote for a specific crypto
     */
    function vote(string memory _cryptoName) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyActiveUser 
        validCrypto(_cryptoName) 
        votingIsEnabled 
        hasEnoughPoints(VOTE_COST) 
    {
        // Deduct points
        users[msg.sender].points -= VOTE_COST;
        users[msg.sender].totalVotes += 1;
        users[msg.sender].totalSpent += VOTE_COST;
        users[msg.sender].votesPerCrypto[_cryptoName] += 1;
        
        // Update crypto votes
        cryptos[_cryptoName].totalVotes += 1;
        cryptos[_cryptoName].userVotes[msg.sender] += 1;
        
        // Record vote
        votes[voteCounter] = Vote({
            voter: msg.sender,
            cryptoName: _cryptoName,
            pointsSpent: VOTE_COST,
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        
        totalVotes += 1;
        voteCounter += 1;
        
        emit VoteCast(msg.sender, _cryptoName, VOTE_COST, block.timestamp);
    }
    
    /**
     * @dev Purchase points with ETH/SOL
     */
    function purchasePoints(uint256 _points) external payable nonReentrant whenNotPaused {
        require(_points > 0, "Points must be greater than 0");
        
        uint256 cost = _points * pointPrice;
        require(msg.value >= cost, "Insufficient payment");
        
        // Register user if not already registered
        if (!users[msg.sender].isActive) {
            users[msg.sender].joinDate = block.timestamp;
            users[msg.sender].isActive = true;
            userAddresses.push(msg.sender);
        }
        
        // Add points to user
        users[msg.sender].points += _points;
        
        // Update revenue
        totalRevenue += cost;
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
        
        emit PointsPurchased(msg.sender, _points, cost, block.timestamp);
    }
    
    /**
     * @dev Transfer points between users
     */
    function transferPoints(address _to, uint256 _amount) 
        external 
        nonReentrant 
        onlyActiveUser 
        hasEnoughPoints(_amount) 
    {
        require(_to != address(0), "Invalid recipient address");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Register recipient if not already registered
        if (!users[_to].isActive) {
            users[_to].joinDate = block.timestamp;
            users[_to].isActive = true;
            userAddresses.push(_to);
        }
        
        // Transfer points
        users[msg.sender].points -= _amount;
        users[_to].points += _amount;
        
        emit PointsTransferred(msg.sender, _to, _amount);
    }
    
    /**
     * @dev Add a new crypto for voting (Admin only)
     */
    function addCrypto(string memory _name) external onlyOwner {
        _addCrypto(_name);
    }
    
    /**
     * @dev Internal function to add crypto
     */
    function _addCrypto(string memory _name) internal {
        require(bytes(_name).length > 0, "Crypto name cannot be empty");
        require(!cryptos[_name].isActive, "Crypto already exists");
        
        cryptos[_name].name = _name;
        cryptos[_name].totalVotes = 0;
        cryptos[_name].isActive = true;
        cryptos[_name].createdAt = block.timestamp;
        
        cryptoNames.push(_name);
        
        emit CryptoAdded(_name, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Remove a crypto from voting (Admin only)
     */
    function removeCrypto(string memory _name) external onlyOwner {
        require(cryptos[_name].isActive, "Crypto doesn't exist or already inactive");
        
        cryptos[_name].isActive = false;
        
        // Remove from cryptoNames array
        for (uint256 i = 0; i < cryptoNames.length; i++) {
            if (keccak256(bytes(cryptoNames[i])) == keccak256(bytes(_name))) {
                cryptoNames[i] = cryptoNames[cryptoNames.length - 1];
                cryptoNames.pop();
                break;
            }
        }
        
        emit CryptoRemoved(_name, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Toggle voting status (Admin only)
     */
    function toggleVoting() external onlyOwner {
        votingEnabled = !votingEnabled;
        emit VotingStatusChanged(votingEnabled, msg.sender);
    }
    
    /**
     * @dev Update point price (Admin only)
     */
    function updatePointPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        pointPrice = _newPrice;
    }
    
    /**
     * @dev Update admin wallet (Admin only)
     */
    function updateAdminWallet(address _newAdmin) external onlyOwner {
        require(_newAdmin != address(0), "Invalid admin address");
        adminWallet = _newAdmin;
    }
    
    /**
     * @dev Withdraw contract balance to admin wallet (Admin only)
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(adminWallet).transfer(balance);
        
        emit AdminWithdrawal(adminWallet, balance, block.timestamp);
    }
    
    /**
     * @dev Emergency pause (Admin only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause (Admin only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Reset all votes (Admin only) - Use with caution
     */
    function resetAllVotes() external onlyOwner {
        for (uint256 i = 0; i < cryptoNames.length; i++) {
            cryptos[cryptoNames[i]].totalVotes = 0;
        }
        
        totalVotes = 0;
        voteCounter = 0;
    }
    
    // View functions
    
    /**
     * @dev Get user information
     */
    function getUserInfo(address _user) external view returns (
        uint256 points,
        uint256 totalVotes,
        uint256 totalSpent,
        uint256 joinDate,
        bool isActive
    ) {
        User storage user = users[_user];
        return (
            user.points,
            user.totalVotes,
            user.totalSpent,
            user.joinDate,
            user.isActive
        );
    }
    
    /**
     * @dev Get crypto information
     */
    function getCryptoInfo(string memory _name) external view returns (
        string memory name,
        uint256 totalVotes,
        bool isActive,
        uint256 createdAt
    ) {
        Crypto storage crypto = cryptos[_name];
        return (
            crypto.name,
            crypto.totalVotes,
            crypto.isActive,
            crypto.createdAt
        );
    }
    
    /**
     * @dev Get all active crypto names
     */
    function getActiveCryptos() external view returns (string[] memory) {
        uint256 activeCount = 0;
        
        // Count active cryptos
        for (uint256 i = 0; i < cryptoNames.length; i++) {
            if (cryptos[cryptoNames[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active cryptos
        string[] memory activeCryptos = new string[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < cryptoNames.length; i++) {
            if (cryptos[cryptoNames[i]].isActive) {
                activeCryptos[index] = cryptoNames[i];
                index++;
            }
        }
        
        return activeCryptos;
    }
    
    /**
     * @dev Get user's votes for a specific crypto
     */
    function getUserVotesForCrypto(address _user, string memory _cryptoName) 
        external 
        view 
        returns (uint256) 
    {
        return users[_user].votesPerCrypto[_cryptoName];
    }
    
    /**
     * @dev Get recent votes (last N votes)
     */
    function getRecentVotes(uint256 _count) external view returns (
        address[] memory voters,
        string[] memory cryptoNames_,
        uint256[] memory pointsSpent,
        uint256[] memory timestamps
    ) {
        uint256 count = _count > voteCounter ? voteCounter : _count;
        
        voters = new address[](count);
        cryptoNames_ = new string[](count);
        pointsSpent = new uint256[](count);
        timestamps = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 voteIndex = voteCounter - 1 - i;
            Vote storage vote = votes[voteIndex];
            
            voters[i] = vote.voter;
            cryptoNames_[i] = vote.cryptoName;
            pointsSpent[i] = vote.pointsSpent;
            timestamps[i] = vote.timestamp;
        }
        
        return (voters, cryptoNames_, pointsSpent, timestamps);
    }
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalUsers,
        uint256 totalVotes_,
        uint256 totalCryptos,
        uint256 totalRevenue_,
        bool votingEnabled_
    ) {
        return (
            userAddresses.length,
            totalVotes,
            cryptoNames.length,
            totalRevenue,
            votingEnabled
        );
    }
    
    /**
     * @dev Get top voted cryptos
     */
    function getTopCryptos(uint256 _limit) external view returns (
        string[] memory names,
        uint256[] memory votes_
    ) {
        uint256 limit = _limit > cryptoNames.length ? cryptoNames.length : _limit;
        
        // Create arrays for sorting
        string[] memory tempNames = new string[](cryptoNames.length);
        uint256[] memory tempVotes = new uint256[](cryptoNames.length);
        uint256 activeCount = 0;
        
        // Get active cryptos
        for (uint256 i = 0; i < cryptoNames.length; i++) {
            if (cryptos[cryptoNames[i]].isActive) {
                tempNames[activeCount] = cryptoNames[i];
                tempVotes[activeCount] = cryptos[cryptoNames[i]].totalVotes;
                activeCount++;
            }
        }
        
        // Simple bubble sort (for small arrays)
        for (uint256 i = 0; i < activeCount - 1; i++) {
            for (uint256 j = 0; j < activeCount - i - 1; j++) {
                if (tempVotes[j] < tempVotes[j + 1]) {
                    // Swap votes
                    uint256 tempVote = tempVotes[j];
                    tempVotes[j] = tempVotes[j + 1];
                    tempVotes[j + 1] = tempVote;
                    
                    // Swap names
                    string memory tempName = tempNames[j];
                    tempNames[j] = tempNames[j + 1];
                    tempNames[j + 1] = tempName;
                }
            }
        }
        
        // Return top results
        uint256 resultCount = limit > activeCount ? activeCount : limit;
        names = new string[](resultCount);
        votes_ = new uint256[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            names[i] = tempNames[i];
            votes_[i] = tempVotes[i];
        }
        
        return (names, votes_);
    }
    
    /**
     * @dev Check if user can vote
     */
    function canUserVote(address _user) external view returns (bool) {
        return users[_user].isActive && 
               users[_user].points >= VOTE_COST && 
               votingEnabled && 
               !paused();
    }
    
    /**
     * @dev Calculate points cost for purchase
     */
    function calculatePointsCost(uint256 _points) external view returns (uint256) {
        return _points * pointPrice;
    }
    
    // Fallback function to receive ETH
    receive() external payable {
        // Allow contract to receive ETH
    }
    
    fallback() external payable {
        // Allow contract to receive ETH
    }
}

