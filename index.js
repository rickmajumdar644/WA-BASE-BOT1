const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, jidNormalizedUser } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs-extra');
const app = express();
const port = process.env.PORT || 3000;

app.get('/pair', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.send({ error: "Number is required!" });

    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${num}`);
    
    try {
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["DARKッKILLER", "Chrome", "1.0.0"]
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(num);
            if (!res.headersSent) res.send({ code: code });
        }

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (s) => {
            const { connection } = s;
            if (connection === "open") {
                await delay(5000);
                const session_id = Buffer.from(JSON.stringify(sock.authState.creds)).toString('base64');
                const message = `*DARKッKILLER SESSION GENERATED*\n\n> *Session ID:* DARK_KILLER_SESSION_${session_id}\n\n_Do not share this code with anyone!_`;
                
                await sock.sendMessage(sock.user.id, { text: message });
                console.log(`Session Active for: ${num}`);
                
                // Cleanup session folder
                await delay(10000);
                fs.removeSync(`./sessions/${num}`);
            }
        });

    } catch (err) {
        console.log("Error in Pairing:", err);
    }
});

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>DARKッKILLER - Session Generator</title>
                <style>
                    body { background: #000; color: #00ff00; font-family: 'Courier New', Courier, monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .container { border: 2px solid #ff0000; padding: 40px; border-radius: 15px; box-shadow: 0 0 20px #ff0000; text-align: center; }
                    input { padding: 12px; width: 80%; border: 1px solid #0f0; background: transparent; color: #fff; margin-bottom: 20px; text-align: center; }
                    button { padding: 12px 25px; background: #ff0000; color: #fff; border: none; cursor: pointer; font-weight: bold; text-transform: uppercase; }
                    h1 { color: #ff0000; text-shadow: 2px 2px #fff; }
                    #pairing-code { font-size: 35px; color: #fff; margin-top: 20px; letter-spacing: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>DARKッKILLER</h1>
                    <p>Enter your WhatsApp Number with Country Code</p>
                    <input type="text" id="number" placeholder="e.g. 91xxxxxxxxxx"> <br>
                    <button onclick="getPairingCode()">Generate Code</button>
                    <div id="pairing-code"></div>
                </div>
                <script>
                    async function getPairingCode() {
                        const num = document.getElementById('number').value;
                        const codeDiv = document.getElementById('pairing-code');
                        codeDiv.innerText = "Please wait...";
                        const res = await fetch('/pair?number=' + num);
                        const data = await res.json();
                        codeDiv.innerText = data.code || "Error!";
                    }
                </script>
            </body>
        </html>
    `);
});

app.listen(port, () => console.log("DARKッKILLER Server is running on port " + port));
