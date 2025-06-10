let chart = null;
let rawData = [];
let allData = []; // Store all data for filtering

async function fetchExchangeRates() {
    try {
        // Check if running in local server environment
        const isLocalServer = window.location.protocol !== 'file:';
        
        let response;
        if (isLocalServer) {
            // Use local proxy server
            response = await fetch('/api/exchange-rates');
        } else {
            // Direct API call (may encounter CORS issues)
            response = await fetch('https://www.xe.com/api/protected/charting-rates/?fromCurrency=USD&toCurrency=JPY&crypto=true', {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic bG9kZXN0YXI6cHVnc25heA=='
                }
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch data:', error);
        throw error;
    }
}

function processData(data) {
    if (!data.batchList || !Array.isArray(data.batchList)) {
        throw new Error('Invalid data format');
    }
    
    // Use only daily interval batch (86400000ms = 1 day)
    const dailyBatch = data.batchList.find(batch => batch.interval === 86400000);
    
    if (!dailyBatch) {
        throw new Error('Daily interval data not found');
    }
    
    const startTime = dailyBatch.startTime;
    const interval = dailyBatch.interval;
    
    // The first value (if < 1) is an offset that needs to be subtracted from all values
    const offset = dailyBatch.rates[0] < 1 ? dailyBatch.rates[0] : 0;
    const rates = dailyBatch.rates.slice(1);
    
    rawData = rates.map((rate, index) => {
        const timestamp = startTime + (index * interval);
        return {
            timestamp: new Date(timestamp),
            rate: rate - offset
        };
    });
    
    // Store all data for filtering
    allData = [...rawData];
    
    // Apply default filter (last 2 years)
    filterDataByTimeRange('2y');
    
    return rawData;
}

function calculateMonthlyAverages(data) {
    const monthlyData = {};
    
    data.forEach(item => {
        const yearMonth = `${item.timestamp.getFullYear()}-${String(item.timestamp.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[yearMonth]) {
            monthlyData[yearMonth] = {
                rates: [],
                month: yearMonth
            };
        }
        
        monthlyData[yearMonth].rates.push(item.rate);
    });
    
    const monthlyAverages = Object.values(monthlyData).map(month => {
        const rates = month.rates;
        const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        const max = Math.max(...rates);
        const min = Math.min(...rates);
        
        return {
            month: month.month,
            average: average.toFixed(4),
            max: max.toFixed(4),
            min: min.toFixed(4)
        };
    });
    
    return monthlyAverages;
}

function shouldShowMonthlyAverages(data) {
    if (data.length < 2) return false;
    
    const firstDate = data[0].timestamp;
    const lastDate = data[data.length - 1].timestamp;
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    
    return daysDiff > 30;
}

function createChart(data) {
    const ctx = document.getElementById('rateChart').getContext('2d');
    
    const chartData = {
        labels: data.map(item => item.timestamp),
        datasets: [{
            label: 'USD/JPY Exchange Rate',
            data: data.map(item => item.rate),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgb(75, 192, 192)',
            pointHoverBorderColor: 'rgb(255, 255, 255)',
            pointHoverBorderWidth: 2
        }]
    };
    
    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'USD/JPY Exchange Rate Trend Chart'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        },
                        label: function(context) {
                            return `Rate: ${context.parsed.y.toFixed(4)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MM-dd',
                            hour: 'MM-dd HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Exchange Rate (JPY/USD)'
                    }
                }
            }
        }
    };
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, config);
}

function displayMonthlyAverages(monthlyAverages) {
    const monthlyAvgDiv = document.getElementById('monthlyAvg');
    const tbody = document.getElementById('monthlyTableBody');
    
    tbody.innerHTML = '';
    
    monthlyAverages.forEach(month => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month.month}</td>
            <td>${month.average}</td>
            <td>${month.max}</td>
            <td>${month.min}</td>
        `;
        tbody.appendChild(row);
    });
    
    monthlyAvgDiv.style.display = 'block';
}

async function init() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    try {
        const data = await fetchExchangeRates();
        const processedData = processData(data);
        
        loadingDiv.style.display = 'none';
        
        // processData already applies the default 2y filter
        createChart(rawData);
        
        if (shouldShowMonthlyAverages(rawData)) {
            const monthlyAverages = calculateMonthlyAverages(rawData);
            displayMonthlyAverages(monthlyAverages);
        }
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = `Error: ${error.message}`;
    }
}

function filterDataByTimeRange(range) {
    if (!allData || allData.length === 0) return;
    
    const now = new Date();
    let startDate;
    
    switch(range) {
        case '3m':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
        case '6m':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            break;
        case '1y':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
        case '2y':
            startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
            break;
        case '5y':
            startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
            break;
        case '10y':
            rawData = [...allData];
            return;
    }
    
    rawData = allData.filter(item => item.timestamp >= startDate);
}

function updateChart() {
    const timeRange = document.getElementById('timeRange').value;
    filterDataByTimeRange(timeRange);
    
    if (chart) {
        createChart(rawData);
    }
    
    // Update monthly averages if needed
    if (shouldShowMonthlyAverages(rawData)) {
        const monthlyAverages = calculateMonthlyAverages(rawData);
        displayMonthlyAverages(monthlyAverages);
    } else {
        document.getElementById('monthlyAvg').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Add event listener for update button
    document.getElementById('updateChart').addEventListener('click', updateChart);
    
    // Also update when selection changes
    document.getElementById('timeRange').addEventListener('change', updateChart);
});