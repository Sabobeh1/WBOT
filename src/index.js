const puppeteer = require('puppeteer-core');
const _cliProgress = require('cli-progress');
const spintax = require('mel-spintax');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
require("./welcome");
var spinner = require("./step");
var utils = require("./utils");
var qrcode = require('qrcode-terminal');
var path = require("path");
var argv = require('yargs').argv;
var rev = require("./detectRev");
var constants = require("./constants");
var configs = require("../bot");
var fs = require("fs");
const fetch = require("node-fetch");
const { lt } = require('semver');
const mime = require('mime');
const moment = require('moment')
// only when server object is there in bot.json
// take parameter from json 
// only after authentication success from whatsapp
const graphicalInterface = require('./server/server')
// Import conversation manager for tree-based conversations
const ConversationManager = require('./conversationManager');
//TODO: remove this
// const {write,read}=require('../media/tem')

// Initialize conversation manager
let conversationManager = null;

let appconfig = null;

//console.log(process.cwd());

// ADD THIS NEW FUNCTION TO LOG BOT MESSAGES
function logBotMessage(to, message, chatInfo = {}) {
    try {
        const messagesPath = path.resolve('messages.json');
        let messages = [];
        
        // Read existing messages without caching
        if (fs.existsSync(messagesPath)) {
            try {
                const fileContent = fs.readFileSync(messagesPath, 'utf8');
                messages = JSON.parse(fileContent);
            } catch (parseError) {
                console.error('Error parsing messages.json, starting with empty array:', parseError);
                messages = [];
            }
        }
        
        // Create a bot message object similar to user messages
        const botMessage = {
            _data: {
                id: {
                    fromMe: true,
                    remote: to,
                    id: "BOT_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                    _serialized: `true_${to}_BOT_${Date.now()}`
                },
                viewed: false,
                body: message,
                type: "chat",
                t: Math.floor(Date.now() / 1000),
                notifyName: "WBOT",
                from: "972599059600@c.us", // Your bot's number
                to: to,
                ack: 1,
                invis: false,
                isNewMsg: true,
                star: false,
                kicNotified: false,
                recvFresh: true,
                isFromTemplate: false,
                pollInvalidated: false,
                isSentCagPollCreation: false,
                latestEditMsgKey: null,
                latestEditSenderTimestampMs: null,
                mentionedJidList: [],
                groupMentions: [],
                isEventCanceled: false,
                eventInvalidated: false,
                isVcardOverMmsDocument: false,
                isForwarded: false,
                labels: [],
                hasReaction: false,
                links: [],
                chatName: chatInfo.chatName || "WBOT Response"
            },
            id: {
                fromMe: true,
                remote: to,
                id: "BOT_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                _serialized: `true_${to}_BOT_${Date.now()}`
            },
            ack: 1,
            hasMedia: false,
            body: message,
            type: "chat",
            timestamp: moment().format('DD/MM/YYYY HH:mm'),
            from: "972599059600@c.us", // Your bot's number
            to: to,
            deviceType: "bot",
            isForwarded: false,
            forwardingScore: 0,
            isStatus: false,
            isStarred: false,
            fromMe: true, // This is the key difference - marks it as bot message
            hasQuotedMsg: false,
            hasReaction: false,
            vCards: [],
            mentionedIds: [],
            groupMentions: [],
            isGif: false,
            links: []
        };
        
        messages.push(botMessage);
        
        // Write with error handling
        try {
            fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
            console.log(`✅ Bot message logged successfully: "${message.substring(0, 50)}..." to ${to}`);
        } catch (writeError) {
            console.error('❌ Error writing bot message to messages.json:', writeError);
        }
        
    } catch (error) {
        console.error('❌ Error in logBotMessage function:', error);
    }
}

async function Main() {

    try {
        //console.log(configs);
        var page;
        
        // Initialize messages.json file
        initializeMessagesFile();
        
        await downloadAndStartThings();
        // var isLogin = await checkLogin();
        // if (!isLogin) {
        //     await getAndShowQR();
        // }
        // if (configs.smartreply.suggestions.length > 0) {
        //     await setupSmartReply();
        // }
        // await setupPopup();
        await checkForUpdate();
        
        // Test message logging functionality
        testMessageLogging();
        
        console.log("WBOT is ready !! Let those message come.");
    } catch (e) {
        console.error("\nLooks like you got an error. " + e);
        try {
            page.screenshot({ path: path.join(process.cwd(), "error.png") })
        } catch (s) {
            console.error("Can't create shreenshot, X11 not running?. " + s);
        }
        console.warn(e);
        console.error("Don't worry errors are good. They help us improve. A screenshot has already been saved as error.png in current directory. Please mail it on vasani.arpit@gmail.com along with the steps to reproduce it.\n");
        throw e;
    }

    /**
     * If local chrome is not there then this function will download it first. then use it for automation. 
     */
    async function downloadAndStartThings() {
        appconfig = await utils.externalInjection("bot.json");
        appconfig = JSON.parse(appconfig);
        spinner.start("Downloading chromium\n");
        const browserFetcher = puppeteer.createBrowserFetcher({ platform: process.platform, path: process.cwd() });
        const progressBar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_grey);
        progressBar.start(100, 0);
        //var revNumber = await rev.getRevNumber();
        const revisionInfo = await browserFetcher.download("1313161", (download, total) => {
            //console.log(download);
            var percentage = (download * 100) / total;
            progressBar.update(percentage);
        });
        progressBar.update(100);
        spinner.stop("Downloading chromium ... done!");
        //console.log(revisionInfo.executablePath);
        spinner.start("Launching browser\n");
        var pptrArgv = [];
        if (argv.proxyURI) {
            pptrArgv.push('--proxy-server=' + argv.proxyURI);
        }
        const extraArguments = Object.assign({});
        extraArguments.userDataDir = constants.DEFAULT_DATA_DIR;
        // const browser = await puppeteer.launch({
        //     executablePath: revisionInfo.executablePath,
        //     defaultViewport: null,
        //     headless: appconfig.appconfig.headless,
        //     userDataDir: path.join(process.cwd(), "ChromeSession"),
        //     devtools: false,
        //     args: [...constants.DEFAULT_CHROMIUM_ARGS, ...pptrArgv], ...extraArguments
        // });

        const client = new Client({
            puppeteer: {
                executablePath: revisionInfo.executablePath,
                defaultViewport: null,
                headless: appconfig.appconfig.headless,
                devtools: false,
                args: [...pptrArgv], ...extraArguments
            }
        });
        if (argv.proxyURI) {
            spinner.info("Using a Proxy Server");
        }

        client.on('loading_screen', (percent, message) => {
            console.log('LOADING SCREEN', percent, message);
        });

        client.on('qr', (qr) => {
            // Generate and scan this code with your phone
            console.log('QR RECEIVED', qr);
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', async () => {
            spinner.info('WBOT is spinning up!');
            await utils.delay(5000)
            
            // Initialize conversation manager
            conversationManager = new ConversationManager();
            console.log('Conversation Manager initialized with tree-based navigation!');
            
            // Set up session cleanup interval (every 30 minutes)
            setInterval(() => {
                if (conversationManager) {
                    conversationManager.cleanupOldSessions();
                    const stats = conversationManager.getSessionStats();
                    console.log(`Session cleanup: ${stats.activeSessions} active sessions`);
                }
            }, 30 * 60 * 1000);
            
            let server = appconfig.appconfig.server
            if (server) {

                //Graphical interface to edit bot.json
                const USERNAME = server.username;
                const PASSWORD = server.password;
                const PORT = server.port;

                graphicalInterface(USERNAME, PASSWORD, PORT);
            }
            // await smartReply({client: client})
            //TODO: if replyUnreadMsg is true then get the unread messages and reply to them.
        });

        client.on('authenticated', () => {
            spinner.info('AUTHENTICATED');
        });

        client.on('auth_failure', msg => {
            // Fired if session restore was unsuccessful
            console.error('AUTHENTICATION FAILURE', msg);
            // process.exit(1);
        });

        client.on('message', async msg => {
            // console.log(msg.body)

            // write(msg)

            let chat = await client.getChatById(msg.from)
            console.log(`Message ${msg.body} received in ${chat.name} chat`)
            
            // FIX: Use fs.readFileSync instead of require to avoid caching issues
            const messagesPath = path.resolve('messages.json');
            let messages = [];
            
            // Read existing messages without caching
            if (fs.existsSync(messagesPath)) {
                try {
                    const fileContent = fs.readFileSync(messagesPath, 'utf8');
                    messages = JSON.parse(fileContent);
                } catch (error) {
                    console.error('Error reading messages.json:', error);
                    messages = [];
                }
            }
            
            msg.timestamp = moment().format('DD/MM/YYYY HH:mm');
            msg._data['chatName'] = chat.name
            messages.push(msg)
            
            try {
                fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
                console.log(`User message logged: "${msg.body.substring(0, 50)}..." from ${msg.from}`);
            } catch (error) {
                console.error('Error writing user message to messages.json:', error);
            }

            // if it is a media message then download the media and save it in the media folder
            if (msg.hasMedia && configs.appconfig.downloadMedia) {
                console.log("Message has media. downloading");
                const media = await msg.downloadMedia()
                // checking if director is present or not
                if (!fs.existsSync(path.join(process.cwd(), "receivedMedia"))) {
                    fs.mkdirSync(path.join(process.cwd(), "receivedMedia"));
                }

                if (media) {
                    // write the data to a file
                    let extension = mime.getExtension(media.mimetype)
                    fs.writeFileSync(path.join(process.cwd(), "receivedMedia", msg.from + msg.id.id + "." + extension), media.data, 'base64')
                    console.log("Media has been downloaded");
                } else {
                    console.log("There was an issue in downloading the media");
                }
            } else {
                console.log("Message doesn't have media or it is not enabled in bot.config.json");
            }


            if (msg.body.length != 0) {
                //TODO: reply according to the bot.config.json
                await smartReply({ msg, client });
                //TODO: call the webhook
            }
        });


        await client.initialize();

        spinner.stop("Launching browser ... done!");

        // When the settings file is edited multiple calls are sent to function. This will help
        // to prevent from getting corrupted settings data
        let timeout = 5000;

        // Register a filesystem watcher
        fs.watch(constants.BOT_SETTINGS_FILE, (event, filename) => {
            setTimeout(async () => {
                console.log("Settings file has been updated. Reloading the settings");
                configs = JSON.parse(fs.readFileSync(path.join(process.cwd(), "bot.json")));
                appconfig = await utils.externalInjection("bot.json");
                appconfig = JSON.parse(appconfig);
            }, timeout);
        });

        // page.exposeFunction("getFile", utils.getFileInBase64);
        // page.exposeFunction("saveFile", utils.saveFileFromBase64);
        // page.exposeFunction("resolveSpintax", spintax.unspin);
    }
}

async function getResponse(msg, message) {
    function greetings() {
        let date = new Date();
        hour = date.getHours();

        if (hour >= 0 && hour < 12) {
            return "Good Morning";
        }

        if (hour >= 12 && hour < 18) {
            return "Good evening";
        }

        if (hour >= 18 && hour < 24) {
            return "Good night";
        }
    }

    let response = await spintax.unspin(message);

    // Adding variables: 
    response = response.replace('[#name]', msg._data.notifyName)
    response = response.replace('[#greetings]', greetings())
    response = response.replace('[#phoneNumber]', msg.from.split("@")[0])

    return response;
}

async function sendReply({ msg, client, data, noMatch }) {
    let globalWebhook = appconfig.appconfig.webhook;

    if (noMatch) {
        if (appconfig.noMatch.length != 0) {
            let response = await getResponse(msg, appconfig.noMatch);
            console.log(`❓ No match found. Replying with: "${response.substring(0, 100)}..."`);
            if (!configs.appconfig.quoteMessageInReply) {
                await client.sendMessage(msg.from, response);
                // LOG THE BOT MESSAGE
                logBotMessage(msg.from, response, { chatName: msg._data?.chatName });
            }
            else {
                await msg.reply(response);
                // LOG THE BOT MESSAGE
                logBotMessage(msg.from, response, { chatName: msg._data?.chatName });
            }
            await processWebhook({ msg, client, webhook: globalWebhook });

            return;
        }
        console.log(`❓ No match found and no default response configured`);
        return;
    }

    let response = await getResponse(msg, data.response);
    console.log(`📤 Replying with: "${response.substring(0, 100)}..."`);

    if (data.afterSeconds) {
        await utils.delay(data.afterSeconds * 1000);
    }

    if (data.file) {

        var captionStatus = data.responseAsCaption;

        // We consider undefined responseAsCaption as a false
        if (captionStatus == undefined) {
            captionStatus = false;
        }

        // files = await spintax.unspin(data.file);
        files = data.file
        if (Array.isArray(files)) {
            files.forEach(file => {
                sendFile(file)
            })
        }
        else {
            sendFile(files)
        }
        if (!captionStatus) {
            if (!configs.appconfig.quoteMessageInReply) {
                await client.sendMessage(msg.from, response);
                // LOG THE BOT MESSAGE
                logBotMessage(msg.from, response, { chatName: msg._data?.chatName });
            }
            else {
                await msg.reply(response);
                // LOG THE BOT MESSAGE
                logBotMessage(msg.from, response, { chatName: msg._data?.chatName });
            }
        }
        // if responseAsCaption is true, send image with response as a caption
        // else send image and response seperately
    } else {
        if (!configs.appconfig.quoteMessageInReply) {
            await client.sendMessage(msg.from, response);
            // LOG THE BOT MESSAGE
            logBotMessage(msg.from, response, { chatName: msg._data?.chatName });
        }
        else {
            await msg.reply(response);
            // LOG THE BOT MESSAGE
            logBotMessage(msg.from, response, { chatName: msg._data?.chatName });
        }
    }
    if (data.hasOwnProperty('webhook') && data.webhook.length > 0) {
        let localWebhook = data.webhook;
        await processWebhook({ msg, client, webhook: localWebhook });
    }
    await processWebhook({ msg, client, webhook: globalWebhook });

    function sendFile(file) {

        if (captionStatus == true) {
            utils
                .getFileData(file)
                .then(async ({ fileMime, base64 }) => {

                    // console.log(fileMime);
                    // send response in place of caption as a last argument in below function call
                    var media = await new MessageMedia(
                        fileMime,
                        base64,
                        file
                    );
                    if (!configs.appconfig.quoteMessageInReply) {
                        await client.sendMessage(msg.from, media, { caption: response });
                        // LOG THE MEDIA MESSAGE WITH CAPTION
                        logBotMessage(msg.from, `[Media: ${file}] ${response}`, { chatName: msg._data?.chatName });
                    }
                    else {
                        // #TODO Caption is not working
                        const data = await msg.getChat();
                        // console.log(data)
                        // console.log({ caption: response })
                        // console.log(media)
                        await msg.reply(media, data.id._serialized, { caption: response });
                        // LOG THE MEDIA MESSAGE WITH CAPTION
                        logBotMessage(msg.from, `[Media: ${file}] ${response}`, { chatName: msg._data?.chatName });
                        // await msg.reply(media,);
                    }
                })
                .catch((error) => {
                    console.log("Error in sending file\n" + error);
                });
        } else {
            console.log(
                "Either the responseAsCaption is undefined or false, Make it true to allow caption to a file"
            );

            utils
                .getFileData(file)
                .then(async ({ fileMime, base64 }) => {
                    // console.log(fileMime);
                    // send blank in place of caption as a last argument in below function call
                    var media = await new MessageMedia(
                        fileMime,
                        base64,
                        file
                    );
                    if (!configs.appconfig.quoteMessageInReply) {
                        await client.sendMessage(msg.from, media);
                        // LOG THE MEDIA MESSAGE
                        logBotMessage(msg.from, `[Media: ${file}]`, { chatName: msg._data?.chatName });
                    }
                    else {
                        await msg.reply(media);
                        // LOG THE MEDIA MESSAGE
                        logBotMessage(msg.from, `[Media: ${file}]`, { chatName: msg._data?.chatName });
                    }
                })
                .catch((error) => {
                    console.log("Error in sending file\n" + error);
                })
        }
    }

}

async function processWebhook({ msg, client, webhook }) {

    if (!webhook) return;

    body = {};
    body.text = msg.body;
    body.type = 'message';
    body.user = msg.id.remote;

    const data = await fetch(webhook, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json'
        }
    })

    const response = await data.json();

    //replying to the user based on response
    if (response && response.length > 0) {
        response.forEach(async (itemResponse) => {

            itemResponse.text = await getResponse(msg, itemResponse.text);

            if (!configs.appconfig.quoteMessageInReply) {
                await client.sendMessage(msg.from, itemResponse.text);
                // LOG THE WEBHOOK RESPONSE
                logBotMessage(msg.from, itemResponse.text, { chatName: msg._data?.chatName });
            }
            else {
                await msg.reply(itemResponse.text);
                // LOG THE WEBHOOK RESPONSE
                logBotMessage(msg.from, itemResponse.text, { chatName: msg._data?.chatName });
            }

            //sending files if there is any 
            if (itemResponse.files && itemResponse.files.length > 0) {
                itemResponse.files.forEach(async (itemFile) => {

                    const mimeTypeMatch = itemFile.file.match(/^data:(.*?);/);

                    const base64Data = mimeTypeMatch ? itemFile.file.split(',')[1] : itemFile.file;

                    const mimeType = mimeTypeMatch ? itemFile.file.split(':')[1].split(';')[0] : "image/jpg";

                    var media = await new MessageMedia(
                        mimeType,
                        base64Data,
                        itemFile.name
                    );

                    if (!configs.appconfig.quoteMessageInReply) {
                        await client.sendMessage(msg.from, media);
                        // LOG THE WEBHOOK FILE
                        logBotMessage(msg.from, `[Webhook Media: ${itemFile.name}]`, { chatName: msg._data?.chatName });
                    }
                    else {
                        await msg.reply(media);
                        // LOG THE WEBHOOK FILE
                        logBotMessage(msg.from, `[Webhook Media: ${itemFile.name}]`, { chatName: msg._data?.chatName });
                    }
                })
            }
        });
    }
}

async function smartReply({ msg, client }) {

    // console.log(msg.body)
    const data = msg?.body;
    const userId = msg.from;

    //Don't reply is sender is blocked
    const senderNumber = msg.from.split("@")[0]
    var blockedNumbers = appconfig.blocked
    var allowedNumbers = appconfig.allowed
    // check if blocked numnbers are there or not. 
    // if current number is init then return
    if (Array.isArray(blockedNumbers) && blockedNumbers.includes(senderNumber)) {
        console.log("Message received but sender is blocked so will not reply.")
        return;
    }

    if (Array.isArray(allowedNumbers) && allowedNumbers.length > 0 && !allowedNumbers.includes(senderNumber)) {
        console.log("Message received but user is not in allowed list so will not reply.")
        return;
    }

    // Don't do group reply if isGroupReply is off
    if (msg.id.participant && appconfig.appconfig.isGroupReply == false) {
        console.log(
            "Message received in group and group reply is off. so will not take any actions."
        );
        return;
    }

    // Use conversation manager for tree-based responses
    if (conversationManager) {
        try {
            const response = conversationManager.getResponse(userId, data);
            
            if (response && response.message) {
                console.log(`🤖 Tree Response: User in state '${response.state}' - ${response.isError ? 'Error' : 'Success'}`);
                console.log(`📤 Sending bot response: "${response.message.substring(0, 100)}..."`);
                
                // Send the tree-based response
                if (!appconfig.appconfig.quoteMessageInReply) {
                    await client.sendMessage(msg.from, response.message);
                    // LOG THE CONVERSATION MANAGER RESPONSE
                    logBotMessage(msg.from, response.message, { chatName: msg._data?.chatName });
                } else {
                    await msg.reply(response.message);
                    // LOG THE CONVERSATION MANAGER RESPONSE
                    logBotMessage(msg.from, response.message, { chatName: msg._data?.chatName });
                }
                return;
            }
        } catch (error) {
            console.error('❌ Error in conversation manager:', error);
        }
    }

    // Fallback to original bot logic if conversation manager fails
    const list = appconfig.bot;
    var exactMatch = list.find((obj) =>
        obj.exact.find((ex) => ex == data.toLowerCase())
    );

    if (exactMatch != undefined) {
        return sendReply({ msg, client, data: exactMatch });
    }
    var PartialMatch = list.find((obj) =>
        obj.contains.find((ex) => data.toLowerCase().search(ex) > -1)
    );
    if (PartialMatch != undefined) {
        return sendReply({ msg, client, data: PartialMatch });
    }
    sendReply({ msg, client, data: exactMatch, noMatch: true });
}

async function checkForUpdate() {
    spinner.start("Checking for an Update...");
    // Using Github API (https://docs.github.com/en/rest/reference/repos#releases)
    // to get the releases data
    const url = "https://api.github.com/repos/vasani-arpit/WBOT/releases";
    const response = await fetch(url);

    // Storing data in form of JSON
    var data = await response.json();
    var latestVersion = data[0].tag_name;
    var latestVersionLink = `https://github.com/vasani-arpit/WBOT/releases/tag/${latestVersion}`;
    var myVersion = 'v' + require('../package.json').version;

    spinner.stop("Checking for an Update... Completed");

    if (lt(myVersion, latestVersion)) {
        console.log(`An Update is available for you.\nPlease download the latest version ${latestVersion} of WBOT from ${latestVersionLink}`);
    }
}

// Simple test function to verify the structure
function downloadMessagesAsExcel() {
    console.log('Testing Excel download...');
    
    if (typeof XLSX === 'undefined') {
        alert('XLSX library not loaded!');
        return;
    }

    // Create test data
    const testData = [
        {
            'Sender Name': 'Test User',
            'Date & Time': '01/06/2025 12:00',
            'Request': 'Hello! How can I help you?',
            'Message Content': 'I need help with my order',
            'Sender Phone': '1234567890',
            'Message ID': 'test123',
            'Device Type': 'ios'
        },
        {
            'Sender Name': 'Another User', 
            'Date & Time': '01/06/2025 12:05',
            'Request': 'What would you like to know?',
            'Message Content': 'What are your business hours?',
            'Sender Phone': '0987654321',
            'Message ID': 'test456',
            'Device Type': 'android'
        }
    ];

    // Create Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(testData);
    
    ws['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 35 }, { wch: 35 },
        { wch: 15 }, { wch: 25 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Test_Messages');
    XLSX.writeFile(wb, 'Test_WhatsApp_Messages.xlsx');
    
    alert('Test Excel file downloaded! Check if it has the Request column.');
}

// Initialize messages.json file if it doesn't exist
function initializeMessagesFile() {
    const messagesPath = path.resolve('messages.json');
    if (!fs.existsSync(messagesPath)) {
        try {
            fs.writeFileSync(messagesPath, JSON.stringify([], null, 2));
            console.log('📝 Created messages.json file');
        } catch (error) {
            console.error('❌ Error creating messages.json file:', error);
        }
    }
}

// Test function to verify message logging
function testMessageLogging() {
    console.log('🧪 Testing message logging functionality...');
    const testMessage = "Test bot response - " + new Date().toISOString();
    const testUserId = "test_user@c.us";
    
    logBotMessage(testUserId, testMessage, { chatName: "Test Chat" });
    
    // Verify the message was logged
    setTimeout(() => {
        try {
            const messagesPath = path.resolve('messages.json');
            if (fs.existsSync(messagesPath)) {
                const fileContent = fs.readFileSync(messagesPath, 'utf8');
                const messages = JSON.parse(fileContent);
                const testMsg = messages.find(msg => msg.body === testMessage);
                if (testMsg) {
                    console.log('✅ Message logging test passed!');
                } else {
                    console.log('❌ Message logging test failed - message not found');
                }
            }
        } catch (error) {
            console.log('❌ Message logging test failed with error:', error);
        }
    }, 1000);
}

Main();