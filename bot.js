const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

class WonkProtocolBot {
    constructor(config) {
        this.config = config;
        this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.initGoogleSheets();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    async initGoogleSheets() {
        try {
            const serviceAccountAuth = new JWT({
                email: this.config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                key: this.config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.doc = new GoogleSpreadsheet(this.config.GOOGLE_SHEET_ID, serviceAccountAuth);
            await this.doc.loadInfo();
            console.log('✅ Google Sheets connected successfully');
        } catch (error) {
            console.error('❌ Google Sheets connection failed:', error);
        }
    }

    setupRoutes() {
        // Main telegram webhook
        this.app.post('/telegram-webhook', (req, res) => {
            this.handleTelegramUpdate(req.body);
            res.sendStatus(200);
        });

        // IP verification webhook
        this.app.post('/ip-verification', async (req, res) => {
            try {
                await this.handleIPVerification(req.body);
                res.json({ success: true });
            } catch (error) {
                console.error('IP verification error:', error);
                res.status(500).json({ error: 'Verification failed' });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Admin dashboard
        this.app.get('/admin', this.requireAuth.bind(this), (req, res) => {
            res.sendFile(__dirname + '/admin-dashboard.html');
        });
    }

    async handleTelegramUpdate(update) {
        try {
            if (update.message) {
                await this.handleMessage(update.message);
            } else if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            console.error('Error handling Telegram update:', error);
        }
    }

    async handleMessage(message) {
        const chatId = message.chat.id;
        const userId = message.from.id;
        const username = message.from.username;
        const text = message.text || '';

        console.log(`📨 Message from ${username} (${userId}): ${text}`);

        // Check if it's a private chat for admin commands
        if (message.chat.type === 'private') {
            if (text.startsWith('/create_proposal')) {
                await this.handleCreateProposal(chatId, userId, username);
                return;
            }

            if (text.startsWith('/admin')) {
                await this.handleAdminCommand(message);
                return;
            }
        }

        // Check for Solana contract addresses (works in both private and group)
        if (this.isSolanaAddress(text)) {
            await this.handleSolanaAddress(message);
            return;
        }

        // Check for bot mentions in groups
        if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
            if (text.includes(`@${this.config.BOT_USERNAME}`)) {
                await this.handleBotMention(message);
                return;
            }
        }

        // Handle reply messages for proposal creation flow
        if (message.reply_to_message && message.reply_to_message.from.id == this.bot.id) {
            await this.handleReplyMessage(message);
        }
    }

    async handleCallbackQuery(callbackQuery) {
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id;
        const username = callbackQuery.from.username || callbackQuery.from.first_name;

        console.log(`🔘 Callback from ${username} (${userId}): ${data}`);

        if (data.startsWith('vote_')) {
            await this.handleVote(callbackQuery);
        } else if (data.startsWith('info_')) {
            await this.handleInfoRequest(callbackQuery);
        }
    }

    async handleCreateProposal(chatId, userId, username) {
        // Check if user is authorized
        if (!this.isAuthorized(username)) {
            await this.bot.sendMessage(chatId, '❌ غير مصرح لك بإنشاء اقتراحات\n❌ You are not authorized to create proposals');
            return;
        }

        const proposalData = {
            creator_id: userId,
            creator_username: username,
            step: 'title',
            created_at: new Date().toISOString()
        };

        // Store in temporary storage (you might want to use Redis or database for production)
        this.tempProposals = this.tempProposals || {};
        this.tempProposals[userId] = proposalData;

        await this.bot.sendMessage(chatId, 
            '📋 **إنشاء اقتراح جديد** / **Create New Proposal**\n\n' +
            'أدخل عنوان الاقتراح:\nEnter proposal title:', {
            reply_markup: {
                force_reply: true,
                input_field_placeholder: 'عنوان الاقتراح / Proposal Title'
            },
            parse_mode: 'Markdown'
        });
    }

    async handleReplyMessage(message) {
        const userId = message.from.id;
        const tempProposal = this.tempProposals?.[userId];

        if (!tempProposal) return;

        if (tempProposal.step === 'title') {
            tempProposal.title = message.text;
            tempProposal.step = 'contracts';

            await this.bot.sendMessage(message.chat.id,
                '📝 **عناوين العقود** / **Contract Addresses**\n\n' +
                'أدخل عناوين العقود (عقدان على الأقل، كل عقد في سطر منفصل):\n' +
                'Enter contract addresses (minimum 2, each on a new line):', {
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Contract1\nContract2\n...'
                },
                parse_mode: 'Markdown'
            });

        } else if (tempProposal.step === 'contracts') {
            const contracts = message.text.split('\n').filter(c => c.trim());
            
            if (contracts.length < 2) {
                await this.bot.sendMessage(message.chat.id, '❌ يجب إدخال عقدين على الأقل\n❌ Minimum 2 contracts required');
                return;
            }

            tempProposal.contracts = contracts;
            await this.createProposal(tempProposal);
            delete this.tempProposals[userId];
        }
    }

    async createProposal(tempProposal) {
        const proposalId = 'wonk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (12 * 60 * 60 * 1000)); // 12 hours

        const proposal = {
            id: proposalId,
            title: tempProposal.title,
            contracts: tempProposal.contracts,
            creator_id: tempProposal.creator_id,
            creator_username: tempProposal.creator_username,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'active'
        };

        // Save to Google Sheets
        try {
            const sheet = this.doc.sheetsByTitle['Proposals'] || await this.doc.addSheet({ title: 'Proposals' });
            await sheet.addRow({
                id: proposal.id,
                title: proposal.title,
                contracts: JSON.stringify(proposal.contracts),
                creator_id: proposal.creator_id,
                creator_username: proposal.creator_username,
                start_time: proposal.start_time,
                end_time: proposal.end_time,
                status: proposal.status
            });

            // Publish to group
            await this.publishProposalToGroup(proposal);

        } catch (error) {
            console.error('Error creating proposal:', error);
            await this.bot.sendMessage(tempProposal.creator_id, '❌ خطأ في إنشاء الاقتراح\n❌ Error creating proposal');
        }
    }

    async publishProposalToGroup(proposal) {
        const keyboard = this.generateVotingKeyboard(proposal);
        
        const message = 
            `🗳️ **اقتراح جديد للتصويت** / **New Voting Proposal**\n\n` +
            `📋 **العنوان**: ${proposal.title}\n` +
            `📋 **Title**: ${proposal.title}\n\n` +
            `⏰ **مدة التصويت**: 12 ساعة\n` +
            `⏰ **Voting Duration**: 12 hours\n\n` +
            `🔒 **للحصول على معرف IP آمن، اضغط على زر التحقق أدناه**\n` +
            `🔒 **For secure IP verification, click the verification button below**\n\n` +
            `⚠️ **إخلاء مسؤولية**: هذا المحتوى للأغراض الإعلامية فقط وليس نصيحة مالية.\n` +
            `**Disclaimer**: For informational purposes only - not financial advice.`;

        await this.bot.sendMessage(this.config.GROUP_CHAT_ID, message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }

    generateVotingKeyboard(proposal) {
        const buttons = [];
        const contracts = proposal.contracts;

        // Create voting buttons (2 per row)
        const contractRows = [];
        for (let i = 0; i < contracts.length; i++) {
            const letter = String.fromCharCode(65 + i); // A, B, C, etc.
            const button = {
                text: `صوت ${letter} ✅ | Vote ${letter} ✅`,
                callback_data: `vote_${proposal.id}_${i}`
            };

            if (contractRows.length === 0 || contractRows[contractRows.length - 1].length === 2) {
                contractRows.push([button]);
            } else {
                contractRows[contractRows.length - 1].push(button);
            }
        }

        // Add info and verification buttons
        contractRows.push([{
            text: "معلومات العقود ℹ️ | Contract Info ℹ️",
            callback_data: `info_${proposal.id}`
        }]);

        contractRows.push([{
            text: "🔒 التحقق من الهوية | Identity Verification",
            url: `${this.config.VERIFICATION_URL}/verify?proposal=${proposal.id}`
        }]);

        return contractRows;
    }

    async handleVote(callbackQuery) {
        const data = callbackQuery.data;
        const parts = data.split('_');
        const proposalId = parts.slice(1, -1).join('_');
        const contractIndex = parseInt(parts[parts.length - 1]);
        const voter = callbackQuery.from;

        // Check for existing vote
        const existingVote = await this.checkExistingVote(proposalId, voter.id);
        
        if (existingVote) {
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: '⚠️ لقد قمت بالتصويت مسبقاً! | You have already voted!',
                show_alert: true
            });
            return;
        }

        // Record vote
        await this.recordVote(proposalId, voter, contractIndex);

        await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '✅ تم تسجيل صوتك بنجاح! | Vote recorded successfully!',
            show_alert: true
        });
    }

    async recordVote(proposalId, voter, contractIndex) {
        try {
            const sheet = this.doc.sheetsByTitle['Votes'] || await this.doc.addSheet({ title: 'Votes' });
            
            await sheet.addRow({
                proposal_id: proposalId,
                voter_id: voter.id,
                voter_username: voter.username || 'anonymous',
                voter_first_name: voter.first_name || '',
                contract_index: contractIndex,
                timestamp: new Date().toISOString(),
                ip_address: 'pending_verification',
                user_agent: 'telegram_client'
            });

        } catch (error) {
            console.error('Error recording vote:', error);
        }
    }

    async checkExistingVote(proposalId, voterId) {
        try {
            const sheet = this.doc.sheetsByTitle['Votes'];
            if (!sheet) return false;

            const rows = await sheet.getRows();
            return rows.find(row => 
                row.get('proposal_id') === proposalId && 
                row.get('voter_id') == voterId
            );
        } catch (error) {
            console.error('Error checking existing vote:', error);
            return false;
        }
    }

    async handleIPVerification(data) {
        try {
            const sheet = this.doc.sheetsByTitle['IPVerifications'] || 
                         await this.doc.addSheet({ title: 'IPVerifications' });
            
            await sheet.addRow({
                proposal_id: data.proposal_id,
                user_id: data.user_id,
                ip_address: data.ip_address,
                user_agent: data.user_agent,
                timestamp: data.timestamp,
                screen_resolution: data.screen_resolution,
                timezone: data.timezone,
                language: data.language,
                verification_id: data.verification_id
            });

            console.log(`✅ IP verification recorded: ${data.ip_address} for user ${data.user_id}`);
        } catch (error) {
            console.error('Error saving IP verification:', error);
            throw error;
        }
    }

    async handleSolanaAddress(message) {
        const address = message.text.trim();
        const userId = message.from.id;

        try {
            await this.bot.sendMessage(userId, 
                '🔍 **جاري تحليل الرمز المميز...** | **Analyzing token...**\n\n' +
                'يرجى الانتظار...\nPlease wait...', {
                parse_mode: 'Markdown'
            });

            // This would typically call your token analysis service
            const tokenInfo = await this.analyzeToken(address);
            
            const report = this.generateTokenReport(tokenInfo, address);
            
            await this.bot.sendMessage(userId, report, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true });

        } catch (error) {
            console.error('Token analysis error:', error);
            await this.bot.sendMessage(userId, 
                '❌ **خطأ في تحليل الرمز المميز** | **Token analysis error**\n\n' +
                'يرجى التحقق من صحة عنوان العقد والمحاولة مرة أخرى.\n' +
                'Please verify the contract address and try again.', {
                parse_mode: 'Markdown'
            });
        }
    }

    async analyzeToken(address) {
        try {
            // Mock analysis - replace with actual API calls
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/solana/contract/${address}`);
            const data = await response.json();
            
            return {
                name: data.name || 'Unknown Token',
                symbol: data.symbol || 'N/A',
                current_price: data.market_data?.current_price?.usd || 0,
                market_cap: data.market_data?.market_cap?.usd || 0,
                price_change_24h: data.market_data?.price_change_percentage_24h || 0,
                description: data.description?.en || 'No description available',
                image: data.image?.large || null,
                links: data.links || {}
            };
        } catch (error) {
            console.error('CoinGecko API error:', error);
            return {
                name: 'Unknown Token',
                symbol: 'N/A',
                current_price: 0,
                market_cap: 0,
                price_change_24h: 0,
                description: 'Token analysis failed',
                image: null,
                links: {}
            };
        }
    }

    generateTokenReport(tokenInfo, address) {
        const priceChangeEmoji = tokenInfo.price_change_24h >= 0 ? '📈' : '📉';
        const riskLevel = this.assessRiskLevel(tokenInfo);
        
        return `🔍 **تحليل الرمز المميز** | **Token Analysis**\n\n` +
               `**الاسم** | **Name**: ${tokenInfo.name}\n` +
               `**الرمز** | **Symbol**: ${tokenInfo.symbol}\n` +
               `**السعر الحالي** | **Current Price**: $${tokenInfo.current_price.toFixed(6)}\n` +
               `**القيمة السوقية** | **Market Cap**: $${this.formatNumber(tokenInfo.market_cap)}\n` +
               `**التغير 24 ساعة** | **24h Change**: ${priceChangeEmoji} ${tokenInfo.price_change_24h.toFixed(2)}%\n\n` +
               `🎯 **مستوى المخاطر** | **Risk Level**: ${riskLevel}\n\n` +
               `📊 **عنوان العقد** | **Contract Address**:\n\`${address}\`\n\n` +
               `🔗 **المصادر** | **Sources**: CoinGecko, Solana Explorer\n\n` +
               `⚠️ **تحذير**: هذا التحليل للأغراض الإعلامية فقط وليس نصيحة استثمارية. قم بأبحاثك الخاصة.\n` +
               `**Warning**: This analysis is for informational purposes only and not investment advice. DYOR.`;
    }

    assessRiskLevel(tokenInfo) {
        if (tokenInfo.market_cap > 10000000) return '🟢 منخفض | Low';
        if (tokenInfo.market_cap > 1000000) return '🟡 متوسط | Medium';
        return '🔴 عالي | High';
    }

    formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    async handleBotMention(message) {
        const text = message.text.replace(`@${this.config.BOT_USERNAME}`, '').trim();
        const userId = message.from.id;
        const chatId = message.chat.id;
        
        // Rate limiting check
        if (!this.canProcessMention(userId)) {
            return;
        }

        try {
            const response = await this.generateAIResponse(text, message.from);
            
            await this.bot.sendMessage(chatId, response, {
                reply_to_message_id: message.message_id,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('AI response error:', error);
        }
    }

    canProcessMention(userId) {
        // Simple rate limiting - 3 mentions per minute
        const now = Date.now();
        this.mentionLimits = this.mentionLimits || {};
        
        if (!this.mentionLimits[userId]) {
            this.mentionLimits[userId] = [];
        }

        // Clean old mentions
        this.mentionLimits[userId] = this.mentionLimits[userId].filter(
            time => now - time < 60000
        );

        if (this.mentionLimits[userId].length >= 3) {
            return false;
        }

        this.mentionLimits[userId].push(now);
        return true;
    }

    async generateAIResponse(text, user) {
        // Mock AI response - replace with actual OpenAI/HuggingFace call
        const responses = {
            ar: [
                'مرحباً! أنا Wonk، مساعدك في عالم العملات الرقمية. كيف يمكنني مساعدتك؟',
                'أهلاً بك! أنا هنا للإجابة على أسئلتك حول Wonk Protocol والعملات الرقمية.',
                'مرحباً! تذكر أن جميع المعلومات هنا للأغراض التعليمية فقط.'
            ],
            en: [
                'Hello! I\'m Wonk, your crypto assistant. How can I help you?',
                'Hi there! I\'m here to answer questions about Wonk Protocol and cryptocurrency.',
                'Hello! Remember that all information here is for educational purposes only.'
            ]
        };

        const isArabic = /[\u0600-\u06FF]/.test(text);
        const responseList = isArabic ? responses.ar : responses.en;
        const randomResponse = responseList[Math.floor(Math.random() * responseList.length)];

        return randomResponse + (text.toLowerCase().includes('buy') || text.includes('شراء') ? 
            '\n\n⚠️ تذكر: هذا ليس نصيحة مالية | Remember: This is not financial advice' : '');
    }

    async handleInfoRequest(callbackQuery) {
        const data = callbackQuery.data;
        const proposalId = data.replace('info_', '');
        
        try {
            const proposal = await this.getProposal(proposalId);
            if (!proposal) {
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'اقتراح غير موجود | Proposal not found',
                    show_alert: true
                });
                return;
            }

            const infoMessage = this.generateProposalInfo(proposal);
            
            await this.bot.sendMessage(callbackQuery.from.id, infoMessage, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });

            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: 'تم إرسال المعلومات إليك خاصياً | Info sent privately'
            });

        } catch (error) {
            console.error('Info request error:', error);
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: 'خطأ في جلب المعلومات | Error fetching info'
            });
        }
    }

    generateProposalInfo(proposal) {
        const contracts = JSON.parse(proposal.contracts);
        let contractsList = '';
        
        contracts.forEach((contract, index) => {
            const letter = String.fromCharCode(65 + index);
            contractsList += `**${letter}**: \`${contract}\`\n`;
        });

        return `📋 **معلومات الاقتراح** | **Proposal Info**\n\n` +
               `**العنوان** | **Title**: ${proposal.title}\n` +
               `**المنشئ** | **Creator**: @${proposal.creator_username}\n` +
               `**وقت البداية** | **Start Time**: ${new Date(proposal.start_time).toLocaleString()}\n` +
               `**وقت الانتهاء** | **End Time**: ${new Date(proposal.end_time).toLocaleString()}\n\n` +
               `**العقود** | **Contracts**:\n${contractsList}\n` +
               `⚠️ **تحذير**: تحقق دائماً من عناوين العقود قبل التفاعل معها.\n` +
               `**Warning**: Always verify contract addresses before interacting.`;
    }

    async getProposal(proposalId) {
        try {
            const sheet = this.doc.sheetsByTitle['Proposals'];
            if (!sheet) return null;

            const rows = await sheet.getRows();
            const proposal = rows.find(row => row.get('id') === proposalId);
            
            if (!proposal) return null;

            return {
                id: proposal.get('id'),
                title: proposal.get('title'),
                contracts: proposal.get('contracts'),
                creator_username: proposal.get('creator_username'),
                start_time: proposal.get('start_time'),
                end_time: proposal.get('end_time'),
                status: proposal.get('status')
            };
        } catch (error) {
            console.error('Error getting proposal:', error);
            return null;
        }
    }

    async handleAdminCommand(message) {
        const userId = message.from.id;
        const username = message.from.username;
        const command = message.text;

        if (!this.isAuthorized(username)) {
            await this.bot.sendMessage(userId, '❌ غير مصرح لك بالوصول للأوامر الإدارية\n❌ You are not authorized for admin commands');
            return;
        }

        const parts = command.split(' ');
        const action = parts[1];

        switch (action) {
            case 'stats':
                await this.sendAdminStats(userId);
                break;
            case 'export':
                await this.sendExportLinks(userId);
                break;
            case 'help':
                await this.sendAdminHelp(userId);
                break;
            default:
                await this.sendAdminHelp(userId);
        }
    }

    async sendAdminStats(userId) {
        try {
            const stats = await this.calculateStats();
            
            const message = `📊 **إحصائيات Wonk Protocol** | **Wonk Protocol Statistics**\n\n` +
                           `📈 **الإحصائيات العامة** | **General Stats**:\n` +
                           `• إجمالي الاقتراحات | Total Proposals: ${stats.totalProposals}\n` +
                           `• الاقتراحات النشطة | Active Proposals: ${stats.activeProposals}\n` +
                           `• الاقتراحات المكتملة | Completed Proposals: ${stats.completedProposals}\n\n` +
                           `🗳️ **إحصائيات التصويت** | **Voting Stats**:\n` +
                           `• إجمالي الأصوات | Total Votes: ${stats.totalVotes}\n` +
                           `• المصوتون الفريدون | Unique Voters: ${stats.uniqueVoters}\n` +
                           `• متوسط الأصوات لكل اقتراح | Avg Votes per Proposal: ${stats.avgVotesPerProposal}\n\n` +
                           `📅 **النشاط اليوم** | **Today's Activity**:\n` +
                           `• اقتراحات جديدة | New Proposals: ${stats.todayProposals}\n` +
                           `• أصوات جديدة | New Votes: ${stats.todayVotes}\n\n` +
                           `⏰ تم التحديث: ${new Date().toLocaleString('ar-EG')}\n` +
                           `Updated: ${new Date().toISOString()}`;

            await this.bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Stats error:', error);
            await this.bot.sendMessage(userId, '❌ خطأ في جلب الإحصائيات | Error fetching stats');
        }
    }

    async calculateStats() {
        const proposalsSheet = this.doc.sheetsByTitle['Proposals'];
        const votesSheet = this.doc.sheetsByTitle['Votes'];
        
        const proposalRows = proposalsSheet ? await proposalsSheet.getRows() : [];
        const voteRows = votesSheet ? await votesSheet.getRows() : [];
        
        const today = new Date().toDateString();
        
        return {
            totalProposals: proposalRows.length,
            activeProposals: proposalRows.filter(row => row.get('status') === 'active').length,
            completedProposals: proposalRows.filter(row => row.get('status') === 'completed').length,
            totalVotes: voteRows.length,
            uniqueVoters: new Set(voteRows.map(row => row.get('voter_id'))).size,
            avgVotesPerProposal: proposalRows.length > 0 ? Math.round(voteRows.length / proposalRows.length * 100) / 100 : 0,
            todayProposals: proposalRows.filter(row => {
                const startTime = new Date(row.get('start_time'));
                return startTime.toDateString() === today;
            }).length,
            todayVotes: voteRows.filter(row => {
                const timestamp = new Date(row.get('timestamp'));
                return timestamp.toDateString() === today;
            }).length
        };
    }

    async sendExportLinks(userId) {
        const message = `📤 **تصدير البيانات** | **Data Export**\n\n` +
                       `🔗 **روابط Google Sheets**:\n` +
                       `• الاقتراحات | Proposals: https://docs.google.com/spreadsheets/d/${this.config.GOOGLE_SHEET_ID}/edit#gid=0\n` +
                       `• الأصوات | Votes: https://docs.google.com/spreadsheets/d/${this.config.GOOGLE_SHEET_ID}/edit#gid=1\n` +
                       `• التحقق من IP | IP Verifications: https://docs.google.com/spreadsheets/d/${this.config.GOOGLE_SHEET_ID}/edit#gid=2\n\n` +
                       `💾 يمكنك تحميل البيانات بصيغة CSV أو Excel مباشرة من Google Sheets\n` +
                       `You can download data as CSV or Excel directly from Google Sheets\n\n` +
                       `⚠️ **أمان البيانات**: تأكد من حماية هذه الروابط\n` +
                       `**Data Security**: Ensure these links are protected`;

        await this.bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
    }

    async sendAdminHelp(userId) {
        const message = `🔧 **أوامر الإدارة** | **Admin Commands**\n\n` +
                       `/admin stats - إحصائيات النظام | System statistics\n` +
                       `/admin export - روابط تصدير البيانات | Data export links\n` +
                       `/admin help - هذه الرسالة | This message\n` +
                       `/create_proposal - إنشاء اقتراح جديد | Create new proposal\n\n` +
                       `📝 **ملاحظات** | **Notes**:\n` +
                       `• جميع الأوامر الإدارية تعمل في الرسائل الخاصة فقط\n` +
                       `• All admin commands work in private messages only\n` +
                       `• تأكد من أن البوت لديه الصلاحيات المناسبة في المجموعة\n` +
                       `• Ensure the bot has appropriate permissions in the group`;

        await this.bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
    }

    isSolanaAddress(text) {
        // Simple Solana address validation
        const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return solanaRegex.test(text.trim());
    }

    isAuthorized(username) {
        if (!username) return false;
        
        const ownerUsername = this.config.OWNER_USERNAME;
        const adminUsernames = (this.config.ADMIN_USERNAMES || '').split(',').map(u => u.trim());
        
        return username === ownerUsername || adminUsernames.includes(username);
    }

    requireAuth(req, res, next) {
        // Basic auth middleware for admin dashboard
        const auth = req.headers.authorization;
        
        if (!auth || !auth.startsWith('Basic ')) {
            res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
            return res.status(401).send('Authentication required');
        }

        const credentials = Buffer.from(auth.substring(6), 'base64').toString();
        const [username, password] = credentials.split(':');

        if (username === this.config.ADMIN_USERNAME && password === this.config.ADMIN_PASSWORD) {
            next();
        } else {
            res.status(401).send('Invalid credentials');
        }
    }

    async startServer() {
        const port = process.env.PORT || 3000;
        
        this.app.listen(port, () => {
            console.log(`🚀 Wonk Protocol Bot server running on port ${port}`);
            console.log(`📡 Webhook URL: ${this.config.WEBHOOK_URL}/telegram-webhook`);
            console.log(`🔐 Admin Panel: ${this.config.WEBHOOK_URL}/admin`);
        });

        // Set webhook
        try {
            await this.bot.setWebHook(`${this.config.WEBHOOK_URL}/telegram-webhook`);
            console.log('✅ Webhook set successfully');
        } catch (error) {
            console.error('❌ Failed to set webhook:', error);
        }
    }
}

// Configuration and startup
const config = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    BOT_USERNAME: process.env.BOT_USERNAME,
    GROUP_CHAT_ID: process.env.GROUP_CHAT_ID,
    ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
    OWNER_USERNAME: process.env.OWNER_USERNAME,
    ADMIN_USERNAMES: process.env.ADMIN_USERNAMES,
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    VERIFICATION_URL: process.env.VERIFICATION_URL || 'https://your-domain.com',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'secure_password_here'
};

// Validate required configuration
const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN', 'BOT_USERNAME', 'GROUP_CHAT_ID', 
    'OWNER_USERNAME', 'GOOGLE_SHEET_ID', 'WEBHOOK_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}

// Start the bot
const bot = new WonkProtocolBot(config);
bot.startServer().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});

module.exports = WonkProtocolBot;
