const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error('API request failed:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: 'Unable to fetch exchange rate data' });
    }
  }
};