const fs = require('fs');
const path = require('path');

class ConversationManager {
    constructor() {
        this.userSessions = new Map(); // Store user conversation states
        this.conversationTree = this.loadConversationTree();
    }

    loadConversationTree() {
        try {
            const treePath = path.join(process.cwd(), 'conversation-tree.json');
            const treeData = fs.readFileSync(treePath, 'utf8');
            return JSON.parse(treeData);
        } catch (error) {
            console.error('Error loading conversation tree:', error);
            return null;
        }
    }

    // Get or create user session
    getUserSession(userId) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, {
                currentState: 'main_menu',
                history: [],
                lastActivity: new Date()
            });
        }
        return this.userSessions.get(userId);
    }

    // Update user session state
    updateUserState(userId, newState) {
        const session = this.getUserSession(userId);
        session.history.push(session.currentState);
        session.currentState = newState;
        session.lastActivity = new Date();
        
        // Keep history limited to last 10 states
        if (session.history.length > 10) {
            session.history.shift();
        }
    }

    // Get current conversation node
    getCurrentNode(userId) {
        const session = this.getUserSession(userId);
        return this.conversationTree.conversationTree[session.currentState];
    }

    // Process user input and determine next state
    processUserInput(userId, userInput) {
        const session = this.getUserSession(userId);
        const currentNode = this.getCurrentNode(userId);
        
        if (!currentNode) {
            console.error(`Invalid state: ${session.currentState}`);
            this.updateUserState(userId, 'main_menu');
            return this.getCurrentNode(userId);
        }

        const normalizedInput = userInput.toLowerCase().trim();

        // Check if input matches any triggers for main menu (global reset)
        const mainMenuNode = this.conversationTree.conversationTree.main_menu;
        if (this.matchesInput(normalizedInput, mainMenuNode.triggers)) {
            this.updateUserState(userId, 'main_menu');
            return this.getCurrentNode(userId);
        }

        // Process current node options using if/else logic
        const nextState = this.findNextState(currentNode, normalizedInput);
        
        if (nextState) {
            // If statement: exact match found
            this.updateUserState(userId, nextState);
            return this.getCurrentNode(userId);
        } else if (normalizedInput === 'back' || normalizedInput === 'return') {
            // Else if statement: handle back navigation
            return this.handleBackNavigation(userId);
        } else {
            // Else statement: no match found, return current node with error
            return {
                ...currentNode,
                message: currentNode.message + '\n\n' + this.conversationTree.fallback.message,
                isError: true
            };
        }
    }

    // Find next state based on current node options
    findNextState(currentNode, userInput) {
        if (!currentNode.options) return null;

        for (const option of currentNode.options) {
            if (this.matchesInput(userInput, option.input)) {
                return option.goto;
            }
        }
        return null;
    }

    // Check if user input matches any of the trigger words
    matchesInput(userInput, triggers) {
        if (!triggers || triggers.length === 0) return false;
        
        return triggers.some(trigger => {
            const normalizedTrigger = trigger.toLowerCase();
            // Exact match or contains match
            return userInput === normalizedTrigger || userInput.includes(normalizedTrigger);
        });
    }

    // Handle back navigation
    handleBackNavigation(userId) {
        const session = this.getUserSession(userId);
        const currentNode = this.getCurrentNode(userId);

        // If current node has a parent, go to parent
        if (currentNode.parent) {
            this.updateUserState(userId, currentNode.parent);
            return this.getCurrentNode(userId);
        }
        
        // If no parent but has history, go to previous state
        if (session.history.length > 0) {
            const previousState = session.history.pop();
            session.currentState = previousState;
            session.lastActivity = new Date();
            return this.getCurrentNode(userId);
        }

        // Default to main menu
        this.updateUserState(userId, 'main_menu');
        return this.getCurrentNode(userId);
    }

    // Get conversation response for user
    getResponse(userId, userInput) {
        try {
            const responseNode = this.processUserInput(userId, userInput);
            
            if (!responseNode) {
                // Fallback to main menu if something goes wrong
                this.updateUserState(userId, 'main_menu');
                return this.getCurrentNode(userId).message;
            }

            return {
                message: responseNode.message,
                state: responseNode.id,
                isError: responseNode.isError || false,
                options: responseNode.options || []
            };
        } catch (error) {
            console.error('Error processing conversation:', error);
            this.updateUserState(userId, 'main_menu');
            return {
                message: "Sorry, something went wrong. Let's start over.\n\n" + this.getCurrentNode(userId).message,
                state: 'main_menu',
                isError: true
            };
        }
    }

    // Reset user session
    resetUserSession(userId) {
        this.userSessions.delete(userId);
    }

    // Clean up old sessions (older than 1 hour)
    cleanupOldSessions() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        for (const [userId, session] of this.userSessions.entries()) {
            if (session.lastActivity < oneHourAgo) {
                this.userSessions.delete(userId);
            }
        }
    }

    // Get session statistics
    getSessionStats() {
        return {
            activeSessions: this.userSessions.size,
            sessions: Array.from(this.userSessions.entries()).map(([userId, session]) => ({
                userId: userId.substring(0, 10) + '...', // Partial ID for privacy
                currentState: session.currentState,
                historyLength: session.history.length,
                lastActivity: session.lastActivity
            }))
        };
    }
}

module.exports = ConversationManager; 