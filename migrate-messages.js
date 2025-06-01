const fs = require('fs');
const path = require('path');
const moment = require('moment');

function migrateToNewSchema() {
    console.log('🔄 Starting migration to new paired conversation schema...');
    
    try {
        // Read existing messages
        const messagesPath = path.resolve('messages.json');
        let existingMessages = [];
        
        if (fs.existsSync(messagesPath)) {
            const fileContent = fs.readFileSync(messagesPath, 'utf8');
            if (fileContent.trim()) {
                existingMessages = JSON.parse(fileContent);
            }
        }
        
        console.log(`📊 Found ${existingMessages.length} existing messages`);
        
        // Group by conversation (phone number)
        const conversations = {};
        
        existingMessages.forEach(msg => {
            const phoneNumber = msg.fromMe ? msg.to : msg.from;
            const cleanPhone = phoneNumber.replace('@c.us', '');
            
            if (!conversations[cleanPhone]) {
                conversations[cleanPhone] = {
                    userMessages: [],
                    botMessages: []
                };
            }
            
            if (msg.fromMe) {
                conversations[cleanPhone].botMessages.push(msg);
            } else {
                conversations[cleanPhone].userMessages.push(msg);
            }
        });
        
        // Create paired conversations
        const pairedConversations = [];
        
        Object.keys(conversations).forEach(phone => {
            const { userMessages, botMessages } = conversations[phone];
            
            // Sort by timestamp
            userMessages.sort((a, b) => {
                const timeA = moment(a.timestamp, 'DD/MM/YYYY HH:mm');
                const timeB = moment(b.timestamp, 'DD/MM/YYYY HH:mm');
                return timeA - timeB;
            });
            
            botMessages.sort((a, b) => {
                const timeA = moment(a.timestamp, 'DD/MM/YYYY HH:mm');
                const timeB = moment(b.timestamp, 'DD/MM/YYYY HH:mm');
                return timeA - timeB;
            });
            
            // Pair each user message with corresponding bot response
            userMessages.forEach((userMsg, index) => {
                const userTime = moment(userMsg.timestamp, 'DD/MM/YYYY HH:mm');
                
                // Find closest bot response after user message
                let correspondingBot = null;
                for (let bot of botMessages) {
                    const botTime = moment(bot.timestamp, 'DD/MM/YYYY HH:mm');
                    if (botTime >= userTime) {
                        correspondingBot = bot;
                        break;
                    }
                }
                
                // Create paired conversation object
                const pairedConversation = {
                    senderName: (userMsg._data && userMsg._data.notifyName) || 'Unknown',
                    dateTime: userMsg.timestamp,
                    request: correspondingBot ? correspondingBot.body : 'No Response',
                    messageContent: userMsg.body,
                    senderPhone: phone,
                    messageId: `paired_${userMsg.id._serialized}`,
                    deviceType: userMsg.deviceType || 'unknown',
                    messageType: userMsg.type || 'chat',
                    // Keep original data for reference
                    _original: {
                        userMessage: userMsg,
                        botMessage: correspondingBot
                    }
                };
                
                pairedConversations.push(pairedConversation);
            });
        });
        
        // Backup old file
        if (existingMessages.length > 0) {
            const backupPath = `messages_backup_${Date.now()}.json`;
            fs.writeFileSync(backupPath, JSON.stringify(existingMessages, null, 2));
            console.log(`📦 Backup created: ${backupPath}`);
        }
        
        // Write new schema
        fs.writeFileSync(messagesPath, JSON.stringify(pairedConversations, null, 2));
        
        console.log(`✅ Migration completed! ${pairedConversations.length} paired conversations created.`);
        console.log('🎯 New schema: Each object now contains both user message and bot response');
        
        return pairedConversations;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateToNewSchema();
}

module.exports = { migrateToNewSchema }; 