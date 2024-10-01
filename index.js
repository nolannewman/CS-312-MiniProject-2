const express = require('express');
const axios = require('axios');
const app = express();

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));

let cachedMarketOverview = null;
let cachedTopGainers = [];
let cachedTopLosers = [];
let cacheTimestamp = null;

// Cache duration in milliseconds (5 minutes)
const cacheDuration = 5 * 60 * 1000;

// Home route to display form, search results, and categories
app.get('/', async (req, res) => {
    let priceData = null;
    let symbol = null;

    // Handle price search if the user submitted a query
    if (req.query.symbol) {
        symbol = req.query.symbol.toUpperCase();

        // Blockchain.com API for price search
        const blockchainUrl = `https://api.blockchain.com/v3/exchange/tickers/${symbol}-USD`;

        try {
            // Fetch the price data from Blockchain.com API
            const response = await axios.get(blockchainUrl);
            const priceResponse = response.data;

            priceData = {
                name: symbol,  
                symbol: symbol,
                current_price: priceResponse.last_trade_price,
            };
        } catch (error) {
            console.error('Error fetching price data from Blockchain API:', error.message);
        }
    }

    // Check if the cache is valid (within the last 5 minutes)
    if (!cachedMarketOverview || Date.now() - cacheTimestamp > cacheDuration) {
        console.log("Fetching fresh data from CoinGecko...");

        // Fetch global market data (market overview) from CoinGecko
        const marketOverviewUrl = 'https://api.coingecko.com/api/v3/global';
        try {
            const overviewResponse = await axios.get(marketOverviewUrl);
            cachedMarketOverview = overviewResponse.data.data;
        } catch (error) {
            console.error('Error fetching market overview from CoinGecko:', error.message);
        }

        // Fetch top gainers and losers from CoinGecko
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false`;
        try {
            const response = await axios.get(url);
            const coins = response.data;

            // Filter top gainers and losers
            cachedTopGainers = coins.filter(coin => coin.price_change_percentage_24h > 0)
                .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
                .slice(0, 5);

            cachedTopLosers = coins.filter(coin => coin.price_change_percentage_24h < 0)
                .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
                .slice(0, 5);

            cacheTimestamp = Date.now();
        } catch (error) {
            console.error('Error fetching category data from CoinGecko API:', error.message);
            cachedTopGainers = [];
            cachedTopLosers = [];
        }
    } else {
        console.log("Serving from cache...");
    }

    // Render the index page with all the data
    res.render('index', {
        priceData,
        symbol,
        topGainers: cachedTopGainers || [],
        topLosers: cachedTopLosers || [],
        marketOverview: cachedMarketOverview
    });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
