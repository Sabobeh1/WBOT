const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path')
const multer = require('multer');
const moment = require('moment')

const graphicalInterface = (USERNAME, PASSWORD, PORT) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log("Storing file")
      cb(null, './mediaToBeSent/');
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });

  const upload = multer({ storage: storage });
  app.set('view engine', 'ejs');
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, res, next) => {

    // -----------------------------------------------------------------------
    // authentication middleware
    // console.log("passing through middleware")
    const auth = { login: USERNAME, password: PASSWORD } // change this

    // parse login and password from headers
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

    // Verify login and password are set and correct
    if (login && password && login === auth.login && password === auth.password) {
      // Access granted...
      return next()
    }

    // Access denied...
    res.set('WWW-Authenticate', 'Basic realm="401"') // change this
    res.status(401).send('Authentication required.') // custom message

    // -----------------------------------------------------------------------

  })

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'))
  })
  app.get('/bot.json', (req, res) => {
    const botData = require(path.resolve('.','bot.json'))
    res.send(botData)
  })
  app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'))
  })
  
  // ADD THIS NEW ENDPOINT FOR ALL MESSAGES
  app.get('/all-messages.json', (req, res) => {
    console.log('All messages endpoint accessed');
    try {
      // Clear require cache to get fresh data
      const messagesPath = path.resolve('.', 'messages.json');
      delete require.cache[messagesPath];
      
      const messages = require(messagesPath);
      console.log(`Sending ${messages.length} messages`);
      res.json(messages);
    } catch (error) {
      console.error('Error reading all messages:', error);
      res.status(500).json({ error: 'Failed to read messages', message: error.message });
    }
  })
  
  // NEW — return the array stored in leads.json
  app.get('/leads.json', (req, res) => {
    try {
      const leadsPath = path.resolve('.', 'leads.json')
      delete require.cache[leadsPath]            // always fresh
      const leads = require(leadsPath)
      res.json(leads)
    } catch (e) {
      console.error('Cannot read leads.json', e)
      res.status(500).json({ error: 'leads.json not found' })
    }
  })
  
  app.get('/messages.json', (req, res) => {
    const messages = require(path.resolve('.','messages.json'))
    let todayMessages = []
    let today = moment()
    messages.map(msg => {
      let inputDate = moment(msg.timestamp, 'DD/MM/YYYY HH:mm')
      if (today.isSame(inputDate, 'day'))
      {
        if(msg.hasMedia)
        {
          msg.body = "[Media Received]"
        }
        todayMessages.push(msg)
      }
    })
    res.send(todayMessages)
  })
  app.get('/messages', (req, res) => {
    res.sendFile(path.join(__dirname, '/messages.html'))
  })
  app.get('/deleteNode/:id', (req, res) => {
    const data = require(path.resolve('.','bot.json'))
    const id = req.params.id;
    data.bot.splice(id, 1)
    fs.writeFileSync(path.resolve('.','bot.json'), JSON.stringify(data, null, 2))
    res.redirect('/');
  })

  app.post('/newNode', upload.array('file'), (req, res) => {
    const data = require(path.resolve('.','bot.json'));
    const response = req.body;
    const files = req.files;

    if (files && files.length > 0) {
      const fileNames = files.map(file => "./mediaToBeSent/" + file.filename);
      response.file = fileNames;
    }

    if (response.exact.includes(',')) {
    response.exact = response.exact.split(',').map(value => value.trim());
    }
    else {
      response.exact = [response.exact]
    }
    if (response.contains.includes(',')) {
  response.contains = response.contains.split(',').map(value => value.trim());
    }
    else {
      response.contains = [response.contains]
    }
    if (response.responseAsCaption) {
      let responseAsCaption = response.responseAsCaption === "true" ? true : false;
      response.responseAsCaption = responseAsCaption
    }
    response.exact = response.exact.filter(res => res !== "")
    response.contains = response.contains.filter(res => res !== "")
    data.bot.push(response);
    fs.writeFileSync(path.resolve('.','bot.json'), JSON.stringify(data, null, 2))
    res.redirect('/');
  });

  app.get('/leads', (req, res) => {
    res.sendFile(path.join(__dirname, '/leads.html'))
  })

  app.listen(PORT, () => {
    console.log(`You can use the graphical interface at [your_ipv4_address]:${PORT}`)
  });
}

// Alternative download function using existing /messages.json endpoint
function downloadMessagesAsExcelAlternative() {
    console.log('Alternative download function called');
    
    // Check if XLSX is loaded
    if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded. Please refresh the page and try again.');
        return;
    }
    
    // Read messages from the global variable or fetch from existing endpoint
    fetch('/messages.json')
        .then(response => response.json())
        .then(todayData => {
            console.log('Today messages:', todayData);
            
            // For a quick fix, let's just export today's messages
            if (todayData.length === 0) {
                alert('No messages found for today to export.');
                return;
            }
            
            const excelData = todayData.map(msg => ({
                'Sender Name': (msg._data && msg._data.notifyName) ? msg._data.notifyName : 'N/A',
                'Date & Time': msg.timestamp || 'N/A',
                'Message Content': msg.body || 'N/A',
                'Sender Phone': msg.from ? msg.from.replace('@c.us', '') : 'N/A',
                'Message ID': (msg.id && msg.id._serialized) ? msg.id._serialized : 'N/A',
                'Device Type': msg.deviceType || 'N/A'
            }));

            // Create and download Excel file
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            ws['!cols'] = [
                { wch: 20 }, { wch: 18 }, { wch: 30 }, 
                { wch: 15 }, { wch: 25 }, { wch: 12 }
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Messages');
            
            const now = new Date();
            const filename = `WhatsApp_Messages_Today_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.xlsx`;
            
            XLSX.writeFile(wb, filename);
            console.log('File download completed');
        })
        .catch(error => {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        });
}

module.exports = graphicalInterface
