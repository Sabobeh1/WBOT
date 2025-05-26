# WBOT WhatsApp Business Automation Setup Guide

## 🚀 Quick Start

This guide will help you set up an automated WhatsApp business reply bot using WBOT.

### Prerequisites
- Node.js installed on your system
- A WhatsApp account
- A smartphone to scan the QR code

### Installation Steps

1. **Navigate to the WBOT directory:**
   ```bash
   cd WBOT
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the bot:**
   ```bash
   node src/index.js
   ```

4. **Scan the QR code** that appears in the terminal with your WhatsApp

5. **That's it!** Your bot is now running and will automatically reply to messages

## 📝 Customization

### Business Information Setup

1. **Edit `business-config.json`** to update your business details:
   - Business name, contact information
   - Business hours
   - Services offered
   - Pricing information

2. **Important:** After editing `business-config.json`, restart the bot to apply changes

### Bot Responses Configuration

The bot responses are configured in `bot.json`. Here's what each section does:

#### Key Configuration Sections:

**appconfig:**
- `headless`: Set to `true` for production, `false` for testing
- `isGroupReply`: Set to `false` to only reply to individual messages
- `downloadMedia`: Set to `true` to save received media files

**bot array:** Contains all the automated responses
- `contains`: Keywords that trigger the response (anywhere in message)
- `exact`: Exact phrases that trigger the response
- `response`: The reply message to send
- `afterSeconds`: Delay before sending reply (optional)

## 💼 Pre-configured Business Responses

Your bot comes with professional responses for:

- **Greetings** - Welcomes customers with menu options
- **Business Hours** - Provides operating hours
- **Services** - Lists your business services
- **Pricing** - Shows pricing packages
- **Contact Info** - Shares contact details
- **Support** - Routes to appropriate support channels
- **Technical Support** - Handles technical issues
- **Billing** - Manages billing inquiries
- **Orders** - Tracks order status
- **Consultations** - Schedules appointments
- **Emergency** - Provides urgent contact info

## 🔧 Advanced Features

### Media Responses
The bot can send images or audio files with responses:
```json
{
  "contains": ["audio"],
  "response": "Here's an audio response!",
  "file": ["./mediaToBeSent/your-audio.mp3"]
}
```

### Delayed Responses
Add natural delays to responses:
```json
{
  "contains": ["hello"],
  "response": "Hello! How can I help?",
  "afterSeconds": 3
}
```

### Webhooks
Connect to external services:
```json
{
  "contains": ["order"],
  "response": "Checking your order...",
  "webhook": "https://your-server.com/webhook"
}
```

## 🛡️ Security Features

### Block/Allow Lists
- **blocked**: Array of phone numbers to ignore
- **allowed**: If set, only these numbers will get responses

Example:
```json
{
  "blocked": ["+1234567890"],
  "allowed": ["+1987654321", "+1122334455"]
}
```

## 📱 Smart Reply Suggestions

Users will see quick reply buttons for common inquiries:
- Business Hours
- Our Services  
- Contact Information
- Technical Support
- Schedule Consultation

## 🔄 Managing the Bot

### Starting the Bot
```bash
node src/index.js
```

### Stopping the Bot
Press `Ctrl+C` in the terminal

### Restarting After Changes
After editing `bot.json`, restart the bot:
1. Stop with `Ctrl+C`
2. Start again with `node src/index.js`

## 📊 Message Logging

All received messages are logged in `messages.json` for:
- Analytics
- Improving responses
- Customer service follow-up

## 🌐 Web Interface

Access the web interface at `http://localhost:8080`:
- Username: `admin`
- Password: `admin`

Use this to:
- Edit bot responses
- View message logs
- Monitor bot status

## ⚠️ Important Notes

1. **First Run**: The bot will download Chromium browser (may take a few minutes)
2. **QR Code**: You only need to scan once - session is saved automatically
3. **Groups**: Bot doesn't reply in groups by default (for privacy)
4. **Rate Limiting**: WhatsApp may temporarily block if too many messages are sent

## 🔧 Troubleshooting

### Common Issues:

**Bot not responding:**
- Check if bot is running in terminal
- Verify WhatsApp Web is connected
- Restart the bot

**QR Code not appearing:**
- Ensure you're in the correct directory
- Check if Node.js is installed properly
- Try running with admin privileges

**Browser issues:**
- Clear browser cache: `npm cache clean`
- Delete ChromeSession folder and restart

### Getting Help:
- Check the console for error messages
- Review the `error.png` screenshot if available
- Check the GitHub repository for updates

## 📈 Best Practices

1. **Test First**: Start with `headless: false` to see the browser
2. **Monitor Responses**: Check `messages.json` regularly
3. **Update Keywords**: Add relevant business terms to triggers
4. **Professional Tone**: Keep responses helpful and professional
5. **Response Time**: Use `afterSeconds` for natural conversation flow

## 🚀 Production Deployment

For 24/7 operation:
1. Set `headless: true` in bot.json
2. Use a VPS or cloud server
3. Set up process monitoring (PM2 recommended)
4. Configure automatic restarts

---

**Need more help?** Check the main README.md or visit the GitHub repository for additional documentation and community support. 