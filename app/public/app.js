document.addEventListener('DOMContentLoaded', () => {
    const cryptoName = 'ethereum'; // Replace with the crypto name you want
    const symbolElement = document.getElementById('symbol');
    const companyNameElement = document.getElementById('company-name');
    const marketCapElement = document.getElementById('market-cap');
    const percentageChangeElement = document.getElementById('percentage-change');
    const priceElement = document.getElementById('price');
    const triangleElement = document.getElementById("triangleIndicator");

    const ctx = document.getElementById('cryptoChart').getContext('2d');

    let cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Time labels for the X-axis
            datasets: [{
                label: 'Price',
                data: [], // Price data for the Y-axis
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    }
                }
            }
        }
    });

    function formatMarketCap(marketCap) {
        if (marketCap >= 1e12) {
            return (marketCap / 1e12).toFixed(2).toLocaleString() + 'T';
        } else if (marketCap >= 1e9) {
            return (marketCap / 1e9).toFixed(2).toLocaleString() + 'B';
        } else if (marketCap >= 1e6) {
            return (marketCap / 1e6).toFixed(2).toLocaleString() + 'M';
        } else {
            return marketCap.toFixed(2).toLocaleString();
        }
    }

    async function fetchCryptoInfo(cryptoName) {
        try {
            console.log('Fetching crypto info for:', cryptoName);
            const response = await fetch('/api/crypto-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cryptoName })
            });

            const data = await response.json();
            console.log('Received data:', data);
            console.log("NEW DATA!!!!")
            console.log(data);
            if (data.id) {
                symbolElement.textContent = data.symbol;
                companyNameElement.textContent = data.name;
                priceElement.textContent = "$" + Number(data.price.toFixed(2)).toLocaleString();
                percentageChangeElement.textContent = `${data.percentageChange.toFixed(2)}%`;
                marketCapElement.textContent = formatMarketCap(data.marketCap);

                // Update the chart with the received data
                const now = new Date();
                cryptoChart.data.labels.push(now);
                cryptoChart.data.datasets[0].data.push(data.price);
                cryptoChart.update();

                if (data.percentageChange < 0) {
                    // Negative number, downwards triangle
                    if (triangleElement.classList.contains("triangle-positive")) {
                        triangleElement.classList.remove("triangle-positive");
                    }

                    triangleElement.classList.add("triangle-negative");
                } else {
                    // Positive number, upwards triangle
                    if (triangleElement.classList.contains("triangle-negative")) {
                        triangleElement.classList.remove("triangle-negative");
                    }

                    triangleElement.classList.add("triangle-positive");
                }
            } else {
                console.error('Error fetching crypto info');
            }
        } catch (error) {
            console.error('Error fetching crypto info:', error);
        }
    }

    fetchCryptoInfo(cryptoName);

    // Listen for Server-Sent Events
    const eventSource = new EventSource('/api/crypto-updates');
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        console.log('Received update:', data);

        // Update the chart with the received data
        const now = new Date();
        cryptoChart.data.labels.push(now);
        cryptoChart.data.datasets[0].data.push(data.price);
        cryptoChart.update();

        // Update the displayed values
        priceElement.textContent = "$" + Number(data.price.toFixed(2)).toLocaleString();
        percentageChangeElement.textContent = `${data.percentageChange.toFixed(2)}%`;
        marketCapElement.textContent = formatMarketCap(data.marketCap);
    };

    // Optionally, refresh the data at intervals
    // setInterval(() => fetchCryptoInfo(cryptoName), 60000); // Refresh every minute
});
