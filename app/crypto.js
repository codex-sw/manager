const express = require('express');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const WebSocket = require('ws');
const router = express.Router();

const coinmarketcapUrl = 'https://coinmarketcap.com/currencies/'; // Placeholder URL

async function fetchCoinId(cryptoName) {
    const url = `${coinmarketcapUrl}${cryptoName}/`;
    try {
        const response = await axios.get(url);
        const html = response.data;
        // Parse the HTML using JSDOM
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const coinNameElement = document.querySelector('[data-role="coin-name"]');
        const coinSymbolElement = document.querySelector('[data-role="coin-symbol"]');
        const priceElement = document.querySelector('.sc-d1ede7e3-0.fsQm.base-text');
        const percentageElement = document.querySelector('.sc-71024e3-0.ihXFUo.iPawMI');
        const marketCapElement = document.querySelector('dd.sc-d1ede7e3-0.hPHvUM.base-text');

        const result = {};

        if (coinNameElement) {
            result.name = coinNameElement.getAttribute('title');
        } else {
            console.warn('Coin name not found');
        }

        if (coinSymbolElement) {
            result.symbol = coinSymbolElement.textContent.trim();
        } else {
            console.warn('Coin symbol not found');
        }

        if (priceElement) {
            result.coinPrice = priceElement.textContent.trim();
        } else {
            console.warn('Price not found');
        }

        // if (percentageElement) {
        //     result.percentageChange = percentageElement.textContent.trim();
        //     result.percentageDataChange = percentageElement.getAttribute('data-change');
        // } else {
        //     console.warn('Percentage change not found');
        // }

        if (marketCapElement) {
            const marketCapDiv = marketCapElement.querySelector('div.sc-4c05d6ef-0.sc-58c82cf9-0.dlQYLv.dTczEt');
            if (marketCapDiv) {
                result.coinMarketCap = marketCapDiv.nextSibling.textContent.trim();
                result.percentageChange = marketCapDiv.querySelector('p').textContent.trim();
                result.percentageDataChange = marketCapDiv.querySelector('p').getAttribute('data-change');
            } else {
                console.warn('Market cap div not found');
            }
        }

        const chipElements = document.querySelectorAll('div.BaseChip_labelWrapper__lZ4ii');

        if (chipElements.length > 0) {
            let idValue = null;
            chipElements.forEach(function(chipElement) {
                const idText = chipElement.textContent.trim();
                const potentialId = idText.split(/\s+/)[0]; // Assuming the ID is the first part
                if (!isNaN(potentialId)) {
                    idValue = potentialId;
                }
            });

            if (idValue) {
                result.id = idValue;
            } else {
                console.warn('Coin ID not found');
            }
        } else {
            console.warn('Chip label wrapper not found');
        }

        if (!result.id) {
            throw new Error('Coin ID not found');
        }

        return result;
    } catch (error) {
        console.error('Error fetching coin ID:', error);
        throw error;
    }
}

async function fetchCryptoData(coinId, sendUpdate) {
    try {
        const url = 'wss://push.coinmarketcap.com/ws?device=web&client_source=coin_detail_page';

        const headers = {
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'pragma': 'no-cache',
            'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits',
            'sec-websocket-key': 'uFG0DVwyKnqCErfrTVCN7A==',
            'sec-websocket-version': '13',
            'origin': 'https://coinmarketcap.com',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
        };

        const ws = new WebSocket(url, { headers });

        ws.on('open', function open() {
            console.log('WebSocket connection established');

            const subscribeMessage = JSON.stringify({
                method: 'RSUBSCRIPTION',
                params: [
                    'main-site@crypto_price_15s@{}@detail',
                    coinId // Replace with the ID(s) you want to subscribe to
                ]
            });

            ws.send(subscribeMessage);
            console.log('Subscription message sent:', subscribeMessage);
        });

        ws.on('message', function incoming(data) {
            const message = JSON.parse(data);
            console.log('Received data:', message);

            // Check if the message contains the data we are interested in
            if (message.d && message.d.p && message.d.p24h && message.d.mc) {
                const cryptoData = {
                    id: coinId,
                    price: message.d.p, // Assuming message contains the price info
                    percentageChange: message.d.p24h, // Assuming message contains the 24h percentage change
                    marketCap: message.d.mc // Assuming message contains the market cap
                };
                sendUpdate(cryptoData); // Send update to the client
            } else {
                console.error('Data not in expected format', message);
            }
        });

        ws.on('close', function() {
            console.log('WebSocket connection closed');
        });

        ws.on('error', function(error) {
            console.error('WebSocket error:', error);
        });
    } catch (e) {
        console.log("Whoops, error");
        console.log(e);
    }
}

router.post('/api/crypto-info', async (req, res) => {
    const { cryptoName } = req.body;
    try {
        console.log(`Received request for crypto: ${cryptoName}`);
        const { id: coinId, name: coinName, symbol: coinSymbol, coinPrice, coinMarketCap, percentageChange, percentageDataChange } = await fetchCoinId(cryptoName);
        res.json({ id: coinId, name: coinName, symbol: coinSymbol, price: coinPrice, marketCap: coinMarketCap, percentageChange, percentageDataChange });
    } catch (error) {
        console.error('Error in /api/crypto-info:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/crypto-updates', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendUpdate = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    req.on('close', () => {
        console.log('Client disconnected from updates');
    });

    // Replace `coinId` with the actual coin ID you are tracking
    fetchCryptoData('1027', sendUpdate); // Use the correct coin ID here
});

module.exports = router;
