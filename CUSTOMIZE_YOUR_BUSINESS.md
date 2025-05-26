# 📝 Customize Your Business Information

## Quick Customization Checklist

Follow these steps to personalize your WhatsApp bot for your business:

### Step 1: Update Business Details
Edit the `business-config.json` file and replace the placeholder information:

```json
{
  "businessInfo": {
    "name": "YOUR BUSINESS NAME HERE",
    "email": "your-email@yourdomain.com",
    "phone": "YOUR PHONE NUMBER",
    "address": "YOUR BUSINESS ADDRESS",
    "website": "www.yourbusinesswebsite.com"
  }
}
```

### Step 2: Set Your Business Hours
Update your operating schedule:

```json
{
  "businessHours": {
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM", 
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 6:00 PM",
    "friday": "9:00 AM - 6:00 PM",
    "saturday": "10:00 AM - 4:00 PM",
    "sunday": "Closed"
  }
}
```

### Step 3: Customize Your Services
List what your business offers:

```json
{
  "services": [
    "YOUR SERVICE 1",
    "YOUR SERVICE 2", 
    "YOUR SERVICE 3",
    "YOUR SERVICE 4"
  ]
}
```

### Step 4: Set Your Pricing
Update your pricing packages:

```json
{
  "pricing": {
    "basic": "$YOUR BASIC PRICE",
    "standard": "$YOUR STANDARD PRICE", 
    "premium": "$YOUR PREMIUM PRICE"
  }
}
```

### Step 5: Test Your Bot
1. Run the bot: `node src/index.js`
2. Scan the QR code with WhatsApp
3. Send yourself test messages like:
   - "hi" (should show welcome message)
   - "hours" (should show your business hours)
   - "services" (should list your services)
   - "contact" (should show your contact info)

## 🎨 Advanced Customization

### Adding New Responses
Edit `bot.json` to add new automated responses:

```json
{
  "contains": ["your", "keywords", "here"],
  "exact": [],
  "response": "Your custom response message here"
}
```

### Popular Business Keywords to Add:
- "appointment", "booking", "schedule"
- "delivery", "shipping", "pickup"
- "warranty", "guarantee", "return"
- "discount", "offer", "promotion"
- "location", "directions", "parking"

### Adding Media Responses
Place images/audio in the `mediaToBeSent` folder and reference them:

```json
{
  "contains": ["catalog", "brochure"],
  "response": "Here's our latest catalog!",
  "file": ["./mediaToBeSent/your-catalog.pdf"]
}
```

## 🔧 Quick Troubleshooting

**Bot not responding?**
1. Check if the bot is running in the terminal
2. Verify WhatsApp Web is connected
3. Make sure your JSON files are valid (use jsonlint.com)

**Want to change responses?**
1. Edit `bot.json`
2. Stop the bot (Ctrl+C)
3. Restart with `node src/index.js`

## 📞 Need Help?

If you need assistance customizing your bot:
1. Check the SETUP_GUIDE.md for detailed instructions
2. Validate your JSON files for syntax errors
3. Test one change at a time to isolate issues

Remember: After making changes, always restart your bot to apply the updates!

---

**Happy automating! 🤖✨** 