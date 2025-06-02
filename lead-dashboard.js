#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const XLSX = require('xlsx');

class LeadDashboard {
    constructor() {
        this.leadsPath = path.resolve('leads.json');
        this.leads = this.loadLeads();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    loadLeads() {
        try {
            if (fs.existsSync(this.leadsPath)) {
                const data = fs.readFileSync(this.leadsPath, 'utf8');
                return JSON.parse(data);
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading leads:', error);
            return [];
        }
    }

    saveLeads() {
        try {
            fs.writeFileSync(this.leadsPath, JSON.stringify(this.leads, null, 2));
            console.log('✅ Leads data saved successfully');
        } catch (error) {
            console.error('❌ Error saving leads:', error);
        }
    }

    displayHeader() {
        console.clear();
        console.log('🏢 ===============================================');
        console.log('🏢    REAL ESTATE LEAD MANAGEMENT DASHBOARD');
        console.log('🏢 ===============================================\n');
    }

    displayMainMenu() {
        this.displayHeader();
        console.log('📋 Main Menu:');
        console.log('1️⃣  View All Leads');
        console.log('2️⃣  View Qualified Leads Only');
        console.log('3️⃣  View Unprocessed Leads');
        console.log('4️⃣  Mark Lead as Processed');
        console.log('5️⃣  Lead Statistics');
        console.log('6️⃣  Export Leads to EXCEL (.xlsx)');
        console.log('7️⃣  Export Leads to CSV');
        console.log('8️⃣  Search Leads');
        console.log('9️⃣  View Lead Details');
        console.log('🔟  Settings');
        console.log('0️⃣  Exit\n');
    }

    async getUserInput(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    formatLead(lead, index) {
        const status = lead.processed ? '✅' : '⏳';
        const qualified = lead.isQualifiedLead ? '🌟' : '❌';
        const lang = lead.detectedLanguage === 'AR' ? '🇸🇦' : '🇺🇸';
        
        return `${status} ${qualified} ${lang} ${index + 1}. ${lead.notifyName} (${lead.userPhone}) - Score: ${lead.leadScore || 0} - ${lead.timestamp}`;
    }

    displayLeads(leads, title = 'All Leads') {
        console.log(`\n📊 ${title} (${leads.length} total):`);
        console.log('─'.repeat(80));
        
        if (leads.length === 0) {
            console.log('   No leads found.');
            return;
        }

        leads.forEach((lead, index) => {
            console.log(this.formatLead(lead, index));
        });
        console.log('─'.repeat(80));
    }

    async viewAllLeads() {
        this.displayHeader();
        this.displayLeads(this.leads, 'All Leads');
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async viewQualifiedLeads() {
        this.displayHeader();
        const qualifiedLeads = this.leads.filter(lead => lead.isQualifiedLead);
        this.displayLeads(qualifiedLeads, 'Qualified Leads');
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async viewUnprocessedLeads() {
        this.displayHeader();
        const unprocessedLeads = this.leads.filter(lead => !lead.processed);
        this.displayLeads(unprocessedLeads, 'Unprocessed Leads');
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async markAsProcessed() {
        this.displayHeader();
        const unprocessedLeads = this.leads.filter(lead => !lead.processed);
        
        if (unprocessedLeads.length === 0) {
            console.log('✅ All leads have been processed!');
            await this.getUserInput('\nPress Enter to continue...');
            return;
        }

        this.displayLeads(unprocessedLeads, 'Unprocessed Leads');
        
        const selection = await this.getUserInput('\nEnter lead number to mark as processed (or 0 to cancel): ');
        const leadIndex = parseInt(selection) - 1;
        
        if (leadIndex >= 0 && leadIndex < unprocessedLeads.length) {
            const selectedLead = unprocessedLeads[leadIndex];
            const originalIndex = this.leads.findIndex(lead => lead.conversationId === selectedLead.conversationId);
            
            this.leads[originalIndex].processed = true;
            this.leads[originalIndex].processedAt = new Date().toISOString();
            
            this.saveLeads();
            console.log(`✅ Lead "${selectedLead.notifyName}" marked as processed!`);
        } else if (selection !== '0') {
            console.log('❌ Invalid selection!');
        }
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async showStatistics() {
        this.displayHeader();
        
        const total = this.leads.length;
        const qualified = this.leads.filter(lead => lead.isQualifiedLead).length;
        const processed = this.leads.filter(lead => lead.processed).length;
        const arabicLeads = this.leads.filter(lead => lead.detectedLanguage === 'AR').length;
        const englishLeads = this.leads.filter(lead => lead.detectedLanguage === 'EN').length;
        
        const averageScore = total > 0 ? 
            (this.leads.reduce((sum, lead) => sum + (lead.leadScore || 0), 0) / total).toFixed(1) : 0;
        
        console.log('📊 Lead Statistics:');
        console.log('═'.repeat(50));
        console.log(`📈 Total Leads: ${total}`);
        console.log(`🌟 Qualified Leads: ${qualified} (${total > 0 ? ((qualified/total)*100).toFixed(1) : 0}%)`);
        console.log(`✅ Processed Leads: ${processed} (${total > 0 ? ((processed/total)*100).toFixed(1) : 0}%)`);
        console.log(`⏳ Pending Leads: ${total - processed}`);
        console.log(`🇸🇦 Arabic Conversations: ${arabicLeads} (${total > 0 ? ((arabicLeads/total)*100).toFixed(1) : 0}%)`);
        console.log(`🇺🇸 English Conversations: ${englishLeads} (${total > 0 ? ((englishLeads/total)*100).toFixed(1) : 0}%)`);
        console.log(`📊 Average Lead Score: ${averageScore}`);
        console.log('═'.repeat(50));
        
        // Recent activity
        const recentLeads = this.leads
            .filter(lead => {
                const leadDate = new Date(lead.completedAt);
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return leadDate > oneDayAgo;
            });
        
        console.log(`\n🕐 Leads in Last 24 Hours: ${recentLeads.length}`);
        
        if (qualified > 0) {
            console.log('\n🏆 Top Qualified Leads:');
            const topLeads = this.leads
                .filter(lead => lead.isQualifiedLead)
                .sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0))
                .slice(0, 5);
            
            topLeads.forEach((lead, index) => {
                console.log(`   ${index + 1}. ${lead.notifyName} - Score: ${lead.leadScore}, Phone: ${lead.userPhone}`);
            });
        }
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async exportToExcel() {
        this.displayHeader();
        
        const wb = XLSX.utils.book_new();
        
        const rows = this.leads.map(lead => ({
            'Name': lead.notifyName || 'Unknown',
            'Phone': lead.userPhone || '',
            'Language': lead.detectedLanguage || '',
            'First Interested': lead.firstInterested || '',
            'Second Interested': lead.secondInterested || '',
            'Interested': lead.interested || '',
            'Transaction Type': lead.transactionType || '',
            'Lead Score': lead.leadScore || 0,
            'Qualified': lead.isQualifiedLead ? 'Yes' : 'No',
            'Processed': lead.processed ? 'Yes' : 'No',
            'Date': lead.timestamp || '',
            'Conversation ID': lead.conversationId || ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);

        // auto width
        const colWidths = Object.keys(rows[0] || {}).map(key => ({ wch: Math.max(key.length + 2, 15) }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        const filePath = path.resolve(`leads_${Date.now()}.xlsx`);
        XLSX.writeFile(wb, filePath);

        console.log(`✅ Leads exported to Excel: ${filePath}`);
        await this.getUserInput('\nPress Enter to continue...');
    }

    async exportToCSV() {
        this.displayHeader();
        
        const csvPath = path.resolve(`leads_export_${Date.now()}.csv`);
        
        const headers = [
            'Name', 'Phone', 'Language', 'First Interested', 'Second Interested', 
            'Interested', 'Transaction Type', 'Lead Score', 'Qualified', 'Processed', 'Date', 'Conversation ID'
        ];
        
        const rows = this.leads.map(lead => [
            lead.notifyName || 'Unknown',
            lead.userPhone || '',
            lead.detectedLanguage || '',
            lead.firstInterested || '',
            lead.secondInterested || '',
            lead.interested || '',
            lead.transactionType || '',
            lead.leadScore || 0,
            lead.isQualifiedLead ? 'Yes' : 'No',
            lead.processed ? 'Yes' : 'No',
            lead.timestamp || '',
            lead.conversationId || ''
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        try {
            fs.writeFileSync(csvPath, csvContent);
            console.log(`✅ Leads exported to: ${csvPath}`);
            console.log(`📊 ${this.leads.length} leads exported successfully!`);
        } catch (error) {
            console.error('❌ Error exporting leads:', error);
        }
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async searchLeads() {
        this.displayHeader();
        
        const searchTerm = await this.getUserInput('🔍 Enter search term (name, phone, or conversation ID): ');
        
        if (!searchTerm) {
            console.log('❌ Please enter a search term.');
            await this.getUserInput('\nPress Enter to continue...');
            return;
        }
        
        const results = this.leads.filter(lead => 
            (lead.notifyName && lead.notifyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (lead.userPhone && lead.userPhone.includes(searchTerm)) ||
            (lead.conversationId && lead.conversationId.includes(searchTerm))
        );
        
        this.displayLeads(results, `Search Results for "${searchTerm}"`);
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async viewLeadDetails() {
        this.displayHeader();
        
        if (this.leads.length === 0) {
            console.log('❌ No leads available.');
            await this.getUserInput('\nPress Enter to continue...');
            return;
        }

        this.displayLeads(this.leads.slice(0, 10), 'Recent Leads (showing first 10)');
        
        const selection = await this.getUserInput('\nEnter lead number to view details (or 0 to cancel): ');
        const leadIndex = parseInt(selection) - 1;
        
        if (leadIndex >= 0 && leadIndex < this.leads.length) {
            const lead = this.leads[leadIndex];
            
            console.log('\n' + '═'.repeat(60));
            console.log(`👤 Lead Details: ${lead.notifyName}`);
            console.log('═'.repeat(60));
            console.log(`📞 Phone: ${lead.userPhone}`);
            console.log(`🌍 Language: ${lead.detectedLanguage} ${lead.detectedLanguage === 'AR' ? '🇸🇦' : '🇺🇸'}`);
            console.log(`📊 Lead Score: ${lead.leadScore}/100`);
            console.log(`🎯 Qualified: ${lead.isQualifiedLead ? 'Yes 🌟' : 'No ❌'}`);
            console.log(`✅ Processed: ${lead.processed ? 'Yes' : 'No ⏳'}`);
            console.log(`📅 Date: ${lead.timestamp}`);
            console.log(`🆔 Conversation ID: ${lead.conversationId}`);
            console.log(`\n🗨️ Conversation Summary:`);
            console.log(`   First Question Response: ${lead.firstInterested || 'N/A'}`);
            console.log(`   Second Question Response: ${lead.secondInterested || 'N/A'}`);
            console.log(`   Final Interest Level: ${lead.interested}`);
            
            if (lead.messageLog && lead.messageLog.length > 0) {
                console.log(`\n💬 Message History (${lead.messageLog.length} messages):`);
                lead.messageLog.forEach((msg, index) => {
                    const direction = msg.direction === 'INBOUND' ? '👤' : '🤖';
                    console.log(`   ${index + 1}. ${direction} ${msg.content.substring(0, 50)}...`);
                });
            }
            
        } else if (selection !== '0') {
            console.log('❌ Invalid selection!');
        }
        
        await this.getUserInput('\nPress Enter to continue...');
    }

    async showSettings() {
        this.displayHeader();
        console.log('⚙️ Settings:');
        console.log('═'.repeat(40));
        console.log('1️⃣  Reload Leads Data');
        console.log('2️⃣  Clear All Processed Leads');
        console.log('3️⃣  Reset All Lead Status');
        console.log('4️⃣  Back to Main Menu');
        
        const choice = await this.getUserInput('\nSelect option: ');
        
        switch (choice) {
            case '1':
                this.leads = this.loadLeads();
                console.log('✅ Leads data reloaded!');
                break;
            case '2':
                const confirm = await this.getUserInput('⚠️  Are you sure you want to clear all processed leads? (yes/no): ');
                if (confirm.toLowerCase() === 'yes') {
                    this.leads = this.leads.filter(lead => !lead.processed);
                    this.saveLeads();
                    console.log('✅ Processed leads cleared!');
                } else {
                    console.log('❌ Operation cancelled.');
                }
                break;
            case '3':
                const confirmReset = await this.getUserInput('⚠️  Are you sure you want to reset all lead status? (yes/no): ');
                if (confirmReset.toLowerCase() === 'yes') {
                    this.leads.forEach(lead => {
                        lead.processed = false;
                        delete lead.processedAt;
                    });
                    this.saveLeads();
                    console.log('✅ All lead status reset!');
                } else {
                    console.log('❌ Operation cancelled.');
                }
                break;
            case '4':
                return;
            default:
                console.log('❌ Invalid option!');
        }
        
        if (choice !== '4') {
            await this.getUserInput('\nPress Enter to continue...');
        }
    }

    async run() {
        console.log('🏢 Starting Real Estate Lead Dashboard...\n');
        
        while (true) {
            this.displayMainMenu();
            const choice = await this.getUserInput('Select an option: ');
            
            switch (choice) {
                case '1':
                    await this.viewAllLeads();
                    break;
                case '2':
                    await this.viewQualifiedLeads();
                    break;
                case '3':
                    await this.viewUnprocessedLeads();
                    break;
                case '4':
                    await this.markAsProcessed();
                    break;
                case '5':
                    await this.showStatistics();
                    break;
                case '6':
                    await this.exportToExcel();
                    break;
                case '7':
                    await this.exportToCSV();
                    break;
                case '8':
                    await this.searchLeads();
                    break;
                case '9':
                    await this.viewLeadDetails();
                    break;
                case '10':
                    await this.showSettings();
                    break;
                case '0':
                    console.log('👋 Goodbye! Thank you for using the Lead Dashboard.');
                    this.rl.close();
                    process.exit(0);
                    break;
                default:
                    console.log('❌ Invalid option! Please try again.');
                    await this.getUserInput('\nPress Enter to continue...');
            }
        }
    }
}

// Run the dashboard if called directly
if (require.main === module) {
    const dashboard = new LeadDashboard();
    dashboard.run().catch(console.error);
}

module.exports = LeadDashboard; 