const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('.'));

// Proxy endpoint to fetch real XE API data
app.get('/api/exchange-rates', async (req, res) => {
    try {
        const response = await axios.get('https://www.xe.com/api/protected/charting-rates/', {
            params: {
                fromCurrency: 'USD',
                toCurrency: 'JPY',
                isExtended: true
            },
            headers: {
                'Authorization': 'Basic bG9kZXN0YXI6cHVnc25heA=='
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('API request failed:', error.message);
        if (error.response) {
            res.status(error.response.status).json({ error: error.response.data });
        } else {
            res.status(500).json({ error: 'Unable to fetch exchange rate data' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});