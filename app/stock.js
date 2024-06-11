const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/api/stock-price', async (req, res) => {
    const { apiKey, stockSymbol } = req.body;
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=1min&apikey=${apiKey}`;
    try {
        const response = await axios.get(url);
        const data = response.data;
        if (data['Time Series (1min)']) {
            const latestTime = Object.keys(data['Time Series (1min)'])[0];
            const stockPrice = parseFloat(data['Time Series (1min)'][latestTime]['1. open']).toFixed(2);
            res.json({ price: stockPrice });
        } else {
            res.status(400).json({ error: 'Error fetching data' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/api/company-info', async (req, res) => {
    const { apiKey, stockSymbol } = req.body;
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${stockSymbol}&apikey=${apiKey}`;
    try {
        const response = await axios.get(url);
        const data = response.data;
        if (data.bestMatches && data.bestMatches.length > 0) {
            const companyInfo = {
                symbol: data.bestMatches[0]['1. symbol'],
                name: data.bestMatches[0]['2. name']
            };
            res.json(companyInfo);
        } else {
            res.status(400).json({ error: 'Company not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
