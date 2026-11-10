let chart = null;
let rawData = [];
let allData = []; // Store all data for filtering

async function fetchExchangeRates() {
  try {
    // Check if running in local server environment
    const isLocalServer = window.location.protocol !== "file:";

    let response;
    if (isLocalServer) {
      // Use local proxy server
      response = await fetch("/api/exchange-rates");
    } else {
      // Direct API call (may encounter CORS issues)
      response = await fetch(
        "https://www.xe.com/api/protected/charting-rates/?fromCurrency=USD&toCurrency=JPY&crypto=true",
        {
          method: "GET",
          headers: {
            Authorization: "Basic bG9kZXN0YXI6cHVnc25heA==",
          },
        },
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch data:", error);
    throw error;
  }
}

function processData(data) {
  if (!data.batchList || !Array.isArray(data.batchList)) {
    throw new Error("Invalid data format");
  }

  // Use only daily interval batch (86400000ms = 1 day)
  const dailyBatch = data.batchList.find((batch) => batch.interval === 86400000);

  if (!dailyBatch) {
    throw new Error("Daily interval data not found");
  }

  const DAY = 86400000;

  // Decode a batch: rates[0] is a random per-request offset, the rest are offset values.
  const decode = (batch) => {
    const offset = batch.rates[0] < 1 ? batch.rates[0] : 0;
    return batch.rates.slice(1).map((rate, index) => ({
      time: batch.startTime + index * batch.interval,
      rate: rate - offset,
    }));
  };

  const points = decode(dailyBatch);
  let lastTime = points.length ? points[points.length - 1].time : dailyBatch.startTime - DAY;

  // The daily batch lags ~30 days behind. A daily value is the 00:00 UTC sample,
  // so extend it with the 00:00 UTC samples from the finer batches (coarsest first).
  const finer = data.batchList
    .filter((batch) => batch.interval < DAY)
    .sort((a, b) => b.interval - a.interval);
  for (const batch of finer) {
    for (const point of decode(batch)) {
      if (point.time > lastTime && point.time % DAY === 0) {
        points.push(point);
        lastTime = point.time;
      }
    }
  }

  rawData = points.map((point) => ({
    timestamp: new Date(point.time),
    rate: point.rate,
  }));

  // Store all data for filtering
  allData = [...rawData];

  // Apply default filter (last 2 years)
  filterDataByTimeRange("2y");

  return rawData;
}

function calculateMonthlyAverages(data) {
  const monthlyData = {};

  data.forEach((item) => {
    const yearMonth = `${item.timestamp.getUTCFullYear()}-${String(item.timestamp.getUTCMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = {
        rates: [],
        month: yearMonth,
      };
    }

    monthlyData[yearMonth].rates.push(item.rate);
  });

  const monthlyAverages = Object.values(monthlyData).map((month) => {
    const rates = month.rates;
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const max = Math.max(...rates);
    const min = Math.min(...rates);

    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    return {
      month: month.month,
      days: rates.length,
      provisional: month.month >= currentMonth,
      average: average.toFixed(4),
      max: max.toFixed(4),
      min: min.toFixed(4),
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
  const ctx = document.getElementById("rateChart").getContext("2d");

  const chartData = {
    labels: data.map((item) => item.timestamp),
    datasets: [
      {
        label: "USD/JPY Exchange Rate",
        data: data.map((item) => item.rate),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgb(75, 192, 192)",
        pointHoverBorderColor: "rgb(255, 255, 255)",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const config = {
    type: "line",
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: "USD/JPY Exchange Rate Trend Chart",
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
            },
            label: (context) => `Rate: ${context.parsed.y.toFixed(4)}`,
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            displayFormats: {
              day: "MM-dd",
              hour: "MM-dd HH:mm",
            },
          },
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "Exchange Rate (JPY/USD)",
          },
        },
      },
    },
  };

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, config);
}

function displayMonthlyAverages(monthlyAverages) {
  const monthlyAvgDiv = document.getElementById("monthlyAvg");
  const tbody = document.getElementById("monthlyTableBody");

  tbody.innerHTML = "";

  monthlyAverages.forEach((month) => {
    const row = document.createElement("tr");
    if (month.provisional) row.className = "provisional";
    const label = month.provisional
      ? `${month.month} <span class="badge">In progress · ${month.days} days</span>`
      : month.month;
    row.innerHTML = `
            <td>${label}</td>
            <td>${month.average}</td>
            <td>${month.max}</td>
            <td>${month.min}</td>
        `;
    tbody.appendChild(row);
  });

  monthlyAvgDiv.style.display = "block";
}

async function init() {
  const loadingDiv = document.getElementById("loading");
  const errorDiv = document.getElementById("error");

  try {
    const data = await fetchExchangeRates();
    const _processedData = processData(data);

    loadingDiv.style.display = "none";

    // processData already applies the default 2y filter
    createChart(rawData);

    if (shouldShowMonthlyAverages(rawData)) {
      const monthlyAverages = calculateMonthlyAverages(rawData);
      displayMonthlyAverages(monthlyAverages);
    }
  } catch (error) {
    loadingDiv.style.display = "none";
    errorDiv.style.display = "block";
    errorDiv.textContent = `Error: ${error.message}`;
  }
}

function filterDataByTimeRange(range) {
  if (!allData || allData.length === 0) return;

  const now = new Date();
  let startDate;

  switch (range) {
    case "3m":
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "6m":
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case "1y":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "2y":
      startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      break;
    case "5y":
      startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    case "10y":
      rawData = [...allData];
      return;
  }

  rawData = allData.filter((item) => item.timestamp >= startDate);
}

function updateChart() {
  const timeRange = document.getElementById("timeRange").value;
  filterDataByTimeRange(timeRange);

  if (chart) {
    createChart(rawData);
  }

  // Update monthly averages if needed
  if (shouldShowMonthlyAverages(rawData)) {
    const monthlyAverages = calculateMonthlyAverages(rawData);
    displayMonthlyAverages(monthlyAverages);
  } else {
    document.getElementById("monthlyAvg").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();

  // Add event listener for update button
  document.getElementById("updateChart").addEventListener("click", updateChart);

  // Also update when selection changes
  document.getElementById("timeRange").addEventListener("change", updateChart);
});
