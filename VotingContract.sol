// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WonkVoting {
    struct Vote {
        address voter;
        string cryptoName;
        uint256 timestamp;
        uint256 pointsSpent;
    }
    
    struct Crypto {
        string name;
        uint256 totalVotes;
        bool isActive;
        uint256 createdAt;
    }
    
    address public owner;
    uint256 public constant VOTE_COST = 10; // 10 points per vote
    
    mapping(string => Crypto) public cryptos;
    mapping(address => uint256) public userPoints;
    mapping(address => uint256) public userTotalVotes;
    
    Vote[] public votes;
    string[] public cryptoNames;
    
    event VoteCast(address indexed voter, string cryptoName, uint256 pointsSpent, uint256 timestamp);
    event CryptoAdded(string name, uint256 timestamp);
    event CryptoStatusChanged(string name, bool isActive);
    event PointsAdded(address indexed user, uint256 points);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier validCrypto(string memory _cryptoName) {
        require(cryptos[_cryptoName].isActive, "Crypto is not active for voting");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize default cryptos
        addCrypto("MOONSHOT");
        addCrypto("DIAMOND");
        addCrypto("LIGHTNING");
        addCrypto("ROCKET");
        addCrypto("FIRE");
        addCrypto("STAR");
    }
    
    function addCrypto(string memory _name) public onlyOwner {
        require(bytes(_name).length > 0, "Crypto name cannot be empty");
        require(cryptos[_name].createdAt == 0, "Crypto already exists");
        
        cryptos[_name] = Crypto({
            name: _name,
            totalVotes: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        cryptoNames.push(_name);
        emit CryptoAdded(_name, block.timestamp);
    }
    
    function setCryptoStatus(string memory _name, bool _isActive) public onlyOwner {
        require(cryptos[_name].createdAt > 0, "Crypto does not exist");
        cryptos[_name].isActive = _isActive;
        emit CryptoStatusChanged(_name, _isActive);
    }
    
    function addPoints(address _user, uint256 _points) public onlyOwner {
        userPoints[_user] += _points;
        emit PointsAdded(_user, _points);
    }
    
    function vote(string memory _cryptoName) public validCrypto(_cryptoName) {
        require(userPoints[msg.sender] >= VOTE_COST, "Insufficient points");
        
        // Deduct points
        userPoints[msg.sender] -= VOTE_COST;
        
        // Record vote
        votes.push(Vote({
            voter: msg.sender,
            cryptoName: _cryptoName,
            timestamp: block.timestamp,
            pointsSpent: VOTE_COST
        }));
        
        // Update crypto vote count
        cryptos[_cryptoName].totalVotes += 1;
        
        // Update user total votes
        userTotalVotes[msg.sender] += 1;
        
        emit VoteCast(msg.sender, _cryptoName, VOTE_COST, block.timestamp);
    }
    
    function getUserPoints(address _user) public view returns (uint256) {
        return userPoints[_user];
    }
    
    function getCryptoVotes(string memory _cryptoName) public view returns (uint256) {
        return cryptos[_cryptoName].totalVotes;
    }
    
    function getTotalVotes() public view returns (uint256) {
        return votes.length;
    }
    
    function getRecentVotes(uint256 _limit) public view returns (Vote[] memory) {
        uint256 totalVotes = votes.length;
        uint256 limit = _limit > totalVotes ? totalVotes : _limit;
        
        Vote[] memory recentVotes = new Vote[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            recentVotes[i] = votes[totalVotes - 1 - i];
        }
        
        return recentVotes;
    }
    
    function getAllCryptos() public view returns (string[] memory) {
        return cryptoNames;
    }
    
    function getCryptoInfo(string memory _name) public view returns (Crypto memory) {
        return cryptos[_name];
    }
    
    function getWinningCrypto() public view returns (string memory winnerName, uint256 maxVotes) {
        maxVotes = 0;
        winnerName = "";
        
        for (uint256 i = 0; i < cryptoNames.length; i++) {
            string memory name = cryptoNames[i];
            if (cryptos[name].isActive && cryptos[name].totalVotes > maxVotes) {
                maxVotes = cryptos[name].totalVotes;
                winnerName = name;
            }
        }
    }
    
    // Emergency functions
    function withdrawFunds() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        owner = _newOwner;
    }
}

