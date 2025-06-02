const fs = require('fs');
const path = require('path');

class RealEstateLeadBot {
    constructor() {
        this.userSessions = new Map(); // Store user conversation states
        this.config = this.loadConfig();
        this.templates = this.config.templates;
        this.keywords = this.config.keywords;
        this.transactionKeywords = this.config.transactionKeywords || this.getDefaultTransactionKeywords();
        this.enabled = this.config.botConfig.enabled;
    }

    loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'real-estate-bot-config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(configData);
                console.log(`🏢 Real Estate Bot config loaded: ${config.botConfig.name} v${config.botConfig.version}`);
                return config;
            } else {
                console.warn('⚠️ Real Estate Bot config file not found, using default configuration');
                return this.getDefaultConfig();
            }
        } catch (error) {
            console.error('❌ Error loading Real Estate Bot config:', error);
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            botConfig: {
                name: "Real Estate Lead Qualification Bot",
                version: "1.0",
                enabled: true,
                fallbackToGeneralBot: true,
                sessionTimeoutMinutes: 1440
            },
            templates: {
                initial_question: {
                    "AR": "هل أنت متأكد أنك صاحب عقار ترغب في بيعه أو تأجيره؟",
                    "EN": "Are you sure you are a property owner looking to sell or rent your property?"
                },
                step1_yes_reply: {
                    AR: "ممتاز! لدينا عميل محتمل مهتمّ في عقارك. هل ترغب في بيعه أم تأجيره؟",
                    EN: "Great! We have a potential client interested in your property. Are you interested in selling it or renting it?"
                },
                step1_no_reply: {
                    AR: "حسنًا. هل لديك أي عقار ترغب في بيعه أو تأجيره؟",
                    EN: "Okay. Do you have any property you'd like to sell or rent?"
                },
                final_message: {
                    AR: "سنقوم بالرد عليك في أقرب وقت ممكن\nنتمنى لك يوماً سعيداً",
                    EN: "We will get back to you as soon as possible.\nHave a nice day."
                },
                fallback_message: {
                    AR: "سيتم الرد عليك بأقرب وقت ممكن\nنتمنى لك يوماً سعيداً",
                    EN: "We will get back to you as soon as possible.\nHave a nice day."
                }
            },
            keywords: {
                EN: {
                    affirmative: ["yes", "y", "yeah", "ye", "yup", "ok", "okay"],
                    negative: ["no", "n", "nope", "nah"]
                },
                AR: {
                    affirmative: ["نعم", "اه", "ايوة", "ايوه", "أيوة", "آه", "صح"],
                    negative: ["لا", "لأ", "لّا", "مش"]
                }
            },
            transactionKeywords: {
                EN: {
                    sell: ["sell", "selling", "sale"],
                    rent: ["rent", "renting", "lease", "leasing"]
                },
                AR: {
                    sell: ["بيع", "ابيع", "أبيع"],
                    rent: ["تأجير", "تاجير", "ايجار", "أؤجر"]
                }
            }
        };
    }

    // Language Detection based on Unicode characters
    detectLanguage(text) {
        // Check for Arabic script (U+0600–U+06FF)
        const arabicRegex = /[\u0600-\u06FF]/;
        
        // Check for English alphabet
        const englishRegex = /[A-Za-z]/;
        
        if (arabicRegex.test(text)) {
            return 'AR';
        } else if (englishRegex.test(text)) {
            return 'EN';
        } else {
            // Default to English for numbers-only or emoji-only
            return this.config.languageSettings?.defaultLanguage || 'EN';
        }
    }

    // Get or create user session
    getUserSession(userId) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, {
                conversationId: this.generateConversationId(),
                currentStep: 0, // 0 = initial, 1 = awaiting step 1, 2 = awaiting step 2, -1 = completed
                detectedLanguage: null,
                firstInterested: null,
                secondInterested: null,
                interested: null,
                transactionType: null,
                lastActivity: new Date(),
                messageLog: [],
                leadScore: 0
            });
        }
        return this.userSessions.get(userId);
    }

    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Keyword matching using "contains" logic
    matchKeywords(text, language) {
        const normalizedText = text.toLowerCase().trim();
        const keywords = this.keywords[language];

        if (!keywords) {
            console.warn(`⚠️ No keywords found for language: ${language}`);
            return 'unrecognized';
        }

        // Check affirmative keywords
        for (const keyword of keywords.affirmative) {
            if (normalizedText.includes(keyword.toLowerCase())) {
                return 'yes';
            }
        }

        // Check negative keywords
        for (const keyword of keywords.negative) {
            if (normalizedText.includes(keyword.toLowerCase())) {
                return 'no';
            }
        }

        return 'unrecognized';
    }

    // New helper to match transaction intent (sell/rent)
    matchTransaction(text, language) {
        const normalizedText = text.toLowerCase().trim();
        if (language === 'EN') {
            if (/\b(sell|selling|sale|for sale)\b/.test(normalizedText)) return 'sell';
            if (/\b(rent|renting|lease|leasing|for rent)\b/.test(normalizedText)) return 'rent';
        } else if (language === 'AR') {
            // Arabic: any word containing the root "بيع" -> sell
            if (/بيع|ابيع|بيعه|ابيعها|بيعها/iu.test(normalizedText)) return 'sell';
            // Arabic rent roots: ايجار، تأجير، تاجير، أؤجر، تأجيرها، ايجارها
            if (/ايجار|تأجير|تاجير|أؤجر|تأجيره|تأجيرها|ايجاره|ايجارها/iu.test(normalizedText)) return 'rent';
        }
        // Fallback to keyword arrays for extensibility
        const tkw = this.transactionKeywords[language] || {};
        for (const kw of tkw.sell || []) {
            if (normalizedText.includes(kw.toLowerCase())) return 'sell';
        }
        for (const kw of tkw.rent || []) {
            if (normalizedText.includes(kw.toLowerCase())) return 'rent';
        }
        return 'unknown';
    }

    // Calculate lead score based on responses
    calculateLeadScore(session) {
        const scoring = this.config.leadScoring?.priorityLevels;
        if (!scoring) return 0;

        const first = session.firstInterested;
        const second = session.secondInterested;

        if (first === 'yes' && second === 'yes') {
            return scoring.high?.score || 100;
        } else if (first === 'yes' && second === 'no') {
            return scoring.medium?.score || 75;
        } else if (first === 'no' && second === 'yes') {
            return scoring.low?.score || 50;
        } else {
            return scoring.none?.score || 0;
        }
    }

    // Log message for auditing
    logMessage(session, direction, content, matchedIntent = null, matchedStep = 0) {
        const messageEntry = {
            messageId: this.generateMessageId(),
            direction: direction, // 'INBOUND' or 'OUTBOUND'
            content: content,
            matchedIntent: matchedIntent, // 'yes', 'no', 'fallback', 'null'
            matchedStep: matchedStep, // 0, 1, 2
            timestamp: new Date()
        };
        
        session.messageLog.push(messageEntry);
        
        if (this.config.botConfig?.logLevel !== 'silent') {
            console.log(`📝 Message logged: ${direction} - "${content.substring(0, 50)}..." - Intent: ${matchedIntent}`);
        }
    }

    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Check if bot is enabled
    isEnabled() {
        return this.enabled && this.config.botConfig.enabled;
    }

    // Main conversation processing function
    processUserInput(userId, userInput) {
        if (!this.isEnabled()) {
            return null; // Bot is disabled
        }

        const session = this.getUserSession(userId);
        session.lastActivity = new Date();

        // If this is the first message, detect language and start conversation
        if (session.currentStep === 0) {
            session.detectedLanguage = this.detectLanguage(userInput);
            session.currentStep = 1;
            
            // Log the initial inbound message
            this.logMessage(session, 'INBOUND', userInput, 'null', 0);
            
            // Send initial question
            const initialQuestion = this.templates.initial_question[session.detectedLanguage];
            this.logMessage(session, 'OUTBOUND', initialQuestion, 'null', 0);
            
            console.log(`🌍 Language detected: ${session.detectedLanguage} for user ${userId}`);
            console.log(`❓ Sending initial question: "${initialQuestion}"`);
            
            return {
                message: initialQuestion,
                conversationComplete: false,
                sessionData: this.getSessionData(session)
            };
        }

        // Process Step 1 or Step 2
        return this.processStepInput(session, userInput);
    }

    processStepInput(session, userInput) {
        const intent = this.matchKeywords(userInput, session.detectedLanguage);

        // Log inbound
        this.logMessage(session, 'INBOUND', userInput, intent, session.currentStep);

        if (session.currentStep === 1) {
            // Step1 expects explicit yes/no
            if (intent === 'unrecognized') {
                return this.handleFallback(session);
            }
            return this.handleStep1(session, intent);
        }

        if (session.currentStep === 2) {
            // If owner == yes we allow sell/rent words; so we don't auto-fallback
            if (session.firstInterested !== 'yes' && intent === 'unrecognized') {
                return this.handleFallback(session);
            }
            return this.handleStep2(session, userInput, intent);
        }

        // This shouldn't happen, but handle gracefully
        return this.handleFallback(session);
    }

    handleStep1(session, intent) {
        session.firstInterested = intent;
        session.currentStep = 2;

        let responseTemplate;
        if (intent === 'yes') {
            responseTemplate = this.templates.step1_yes_reply[session.detectedLanguage];
        } else {
            responseTemplate = this.templates.step1_no_reply[session.detectedLanguage];
        }

        // Log the outbound message
        this.logMessage(session, 'OUTBOUND', responseTemplate, intent, 1);

        console.log(`✅ Step 1 processed: firstInterested = ${intent}`);
        console.log(`📤 Sending step 1 reply: "${responseTemplate.substring(0, 50)}..."`);

        return {
            message: responseTemplate,
            conversationComplete: false,
            sessionData: this.getSessionData(session)
        };
    }

    handleStep2(session, userInputRaw, yesNoIntent) {
        // Branch based on whether the user is a property owner (firstInterested)
        if (session.firstInterested === 'yes') {
            // Expect sell / rent keywords
            const transactionIntent = this.matchTransaction(userInputRaw, session.detectedLanguage);
            if (transactionIntent === 'sell' || transactionIntent === 'rent' || transactionIntent === 'unknown' || transactionIntent === 'بيع' || transactionIntent === 'تأجير' || transactionIntent === 'ابيع' || transactionIntent === 'ايجار' || transactionIntent === 'بيعه' || transactionIntent === 'تأجيره' || transactionIntent === 'ابيعه' || transactionIntent === 'ايجاره' || transactionIntent === 'بيعها' || transactionIntent === 'تأجيرها' || transactionIntent === 'ابيعها' || transactionIntent === 'ايجارها' ) {
                // For now we simply send final_message; you could extend to ask for details here
                session.secondInterested = 'yes'; // Treat as interested
                session.transactionType = transactionIntent;
            } else {
                return this.handleFallback(session);
            }
        } else {
            // Original yes/no logic for users without property owner status
            session.secondInterested = yesNoIntent; // yes / no
            session.transactionType = null;
        }

        // Compute interested flag as before
        session.interested = (session.firstInterested === 'yes' || session.secondInterested === 'yes') ? 'yes' : 'no';
        session.leadScore = this.calculateLeadScore(session);
        session.currentStep = -1; // completed

        const finalMessage = this.templates.final_message[session.detectedLanguage];
        const outboundIntent = session.transactionType ? session.transactionType : yesNoIntent;
        this.logMessage(session, 'OUTBOUND', finalMessage, outboundIntent, 2);

        return {
            message: finalMessage,
            conversationComplete: true,
            sessionData: this.getSessionData(session)
        };
    }

    handleFallback(session) {
        const fallbackMessage = this.templates.fallback_message[session.detectedLanguage];
        
        // Set data based on current step
        if (session.currentStep === 1) {
            session.firstInterested = null;
            session.secondInterested = null;
            session.interested = 'no';
        } else if (session.currentStep === 2) {
            session.secondInterested = null;
            session.interested = session.firstInterested === 'yes' ? 'yes' : 'no';
        }
        
        // Calculate lead score for fallback
        session.leadScore = this.calculateLeadScore(session);
        session.currentStep = -1; // Mark as completed
        
        // Log the outbound fallback message
        this.logMessage(session, 'OUTBOUND', fallbackMessage, 'fallback', session.currentStep === 1 ? 1 : 2);

        console.log(`❌ Fallback triggered at step ${session.currentStep}`);
        console.log(`📤 Sending fallback: "${fallbackMessage}"`);

        return {
            message: fallbackMessage,
            conversationComplete: true,
            sessionData: this.getSessionData(session)
        };
    }

    getSessionData(session) {
        return {
            conversationId: session.conversationId,
            detectedLanguage: session.detectedLanguage,
            firstInterested: session.firstInterested,
            secondInterested: session.secondInterested,
            interested: session.interested,
            transactionType: session.transactionType || null,
            currentStep: session.currentStep,
            leadScore: session.leadScore,
            messageLog: session.messageLog
        };
    }

    // Get response for user input (main entry point)
    getResponse(userId, userInput) {
        try {
            if (!this.isEnabled()) {
                return null; // Let other bots handle the message
            }

            const result = this.processUserInput(userId, userInput);
            
            if (!result) {
                return null;
            }
            
            return {
                message: result.message,
                conversationComplete: result.conversationComplete,
                sessionData: result.sessionData,
                isError: false
            };
        } catch (error) {
            console.error('❌ Error in Real Estate Lead Bot:', error);
            
            // Return fallback on error
            const session = this.getUserSession(userId);
            const fallbackMessage = session.detectedLanguage 
                ? this.templates.fallback_message[session.detectedLanguage]
                : this.templates.fallback_message['EN'];
            
            return {
                message: fallbackMessage,
                conversationComplete: true,
                sessionData: this.getSessionData(session),
                isError: true
            };
        }
    }

    // Clean up old sessions based on config timeout
    cleanupOldSessions() {
        const timeoutMinutes = this.config.botConfig?.sessionTimeoutMinutes || 1440; // Default 24 hours
        const timeoutAgo = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        
        for (const [userId, session] of this.userSessions.entries()) {
            if (session.lastActivity < timeoutAgo) {
                this.userSessions.delete(userId);
            }
        }
    }

    // Get session statistics
    getSessionStats() {
        const stats = {
            activeSessions: this.userSessions.size,
            enabled: this.isEnabled(),
            configVersion: this.config.botConfig?.version || 'unknown',
            sessions: Array.from(this.userSessions.entries()).map(([userId, session]) => ({
                userId: userId.substring(0, 10) + '...', // Partial ID for privacy
                currentStep: session.currentStep,
                detectedLanguage: session.detectedLanguage,
                interested: session.interested,
                leadScore: session.leadScore,
                lastActivity: session.lastActivity
            }))
        };
        
        return stats;
    }

    // Export conversation data for CRM integration
    exportLeads() {
        const leads = [];
        
        for (const [userId, session] of this.userSessions.entries()) {
            if (session.currentStep === -1) { // Only completed conversations
                leads.push({
                    userId: userId,
                    conversationId: session.conversationId,
                    detectedLanguage: session.detectedLanguage,
                    firstInterested: session.firstInterested,
                    secondInterested: session.secondInterested,
                    interested: session.interested,
                    leadScore: session.leadScore,
                    completedAt: session.lastActivity,
                    messageCount: session.messageLog.length
                });
            }
        }
        
        return leads;
    }

    // Reset user session (for testing)
    resetUserSession(userId) {
        this.userSessions.delete(userId);
        console.log(`🔄 Reset session for user ${userId}`);
    }

    // Reload configuration
    reloadConfig() {
        try {
            this.config = this.loadConfig();
            this.templates = this.config.templates;
            this.keywords = this.config.keywords;
            this.transactionKeywords = this.config.transactionKeywords || this.getDefaultTransactionKeywords();
            this.enabled = this.config.botConfig.enabled;
            console.log('🔄 Real Estate Bot configuration reloaded');
            return true;
        } catch (error) {
            console.error('❌ Error reloading config:', error);
            return false;
        }
    }
}

module.exports = RealEstateLeadBot; 