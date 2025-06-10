# USD/JPY Exchange Rate Chart

A real-time interactive chart application for displaying USD/JPY exchange rates with advanced visualization features.

## Features

- **Real-time Exchange Rate Display**: Fetches live data from XE.com API
- **Interactive Chart**: Hover over any point to view exact time and exchange rate
- **Daily Data View**: Displays daily exchange rate data for clear trend analysis
- **Monthly Statistics**: Automatically calculates and displays monthly averages when data spans over 30 days
- **Responsive Design**: Adapts to various screen sizes for optimal viewing

## Installation

### Prerequisites

- Node.js (v14 or higher)
- pnpm package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/leaker/chartingrates.git
cd chartingrates
```

2. Install dependencies using pnpm:
```bash
pnpm install
```

## Usage

### Method 1: Deploy to Vercel (Recommended for Production)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Follow the prompts to deploy your application. The API will be automatically handled by Vercel's serverless functions.

### Method 2: Using the Node.js Server (For Local Development)

1. Start the server:
```bash
pnpm start
```

2. Open your browser and navigate to `http://localhost:3000`

The application will automatically fetch real-time data from the XE.com API using the configured authentication.

### Method 3: Direct HTML File Access

You can open `index.html` directly in your browser, but this may encounter CORS issues when fetching data from the API.

## API Configuration

The application uses XE.com's protected charting rates API. The authentication is already configured in the server proxy. The API endpoint used is:

```
https://www.xe.com/api/protected/charting-rates/
```

Parameters:
- `fromCurrency`: USD
- `toCurrency`: JPY
- `isExtended`: true (for extended data)

## Project Structure

```
chartingrates/
├── api/               # Vercel serverless functions
│   └── exchange-rates.js  # API proxy function
├── index.html         # Main HTML file
├── app.js            # Frontend JavaScript logic
├── server.js         # Express server for local development
├── vercel.json       # Vercel configuration
├── package.json      # Project dependencies
├── docs/             # Documentation and sample data
│   └── charting-rates.json  # Sample API response
└── README.md         # This file
```

## Technical Details

### Frontend
- **Chart.js**: For rendering interactive charts
- **Chart.js Date Adapter**: For proper date/time handling on the x-axis
- **Vanilla JavaScript**: No framework dependencies for lightweight performance

### Backend
- **Express.js**: Minimal server for API proxying
- **Axios**: For making HTTP requests to the XE API
- **CORS**: Enabled for cross-origin requests

### Data Processing
- The application processes multiple data batches from the API
- Only daily interval data (86400000ms intervals) is used for display
- Outlier values (rates < 1) are automatically filtered out
- Data is sorted chronologically for proper visualization

## Monthly Statistics

When the displayed data period exceeds 30 days, the application automatically:
- Calculates monthly average exchange rates
- Identifies the highest and lowest rates for each month
- Displays this information in a formatted table below the chart

## Development

To run the server in development mode:
```bash
pnpm dev
```

## Browser Support

The application supports all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- XE.com for providing the exchange rate data API
- Chart.js team for the excellent charting library