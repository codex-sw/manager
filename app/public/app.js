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
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)', // Adjust color as needed
                pointRadius: 0 // Hide the data points
            }]
        },
        options: {
            scales: {
                x: {
                    display: false // Hide the X-axis
                },
                y: {
                    display: false // Hide the Y-axis
                }
            },
            plugins: {
                legend: {
                    display: false // Hide the legend
                }
            },
            elements: {
                line: {
                    tension: 0.4 // Smoothing the line
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
            if (data.id) {
                // Set initial data
                symbolElement.textContent = data.symbol;
                companyNameElement.textContent = data.name;
                priceElement.textContent = "$" + Number((data.price.replace(/[$,]/g, ''))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                percentageChangeElement.textContent = data.percentageChange;
                marketCapElement.textContent = formatMarketCap((data.marketCap.replace(/[$,]/g, '')));

                // Perform additional initial setup here
                console.log(`Initial coin ID: ${data.id}`);
                console.log(`Initial coin name: ${data.name}`);
                console.log(`Initial coin symbol: ${data.symbol}`);
                console.log(`Initial price: ${data.price}`);
                console.log(`Initial percentage change: ${data.percentageChange}`);
                console.log(`Initial market cap: ${data.marketCap}`);

                // Update the chart with the received data
                const now = new Date();
                cryptoChart.data.labels.push(now);
                cryptoChart.data.datasets[0].data.push(parseFloat(data.price.replace(/[^0-9.-]+/g,"")));
                cryptoChart.update();

                if (data.percentageDataChange == "down") {
                    // Negative number, downwards triangle
                    if (triangleElement.classList.contains("triangle-positive")) {
                        triangleElement.classList.remove("triangle-positive");
                    }

                    triangleElement.classList.add("triangle-negative");
                    percentageChangeElement.textContent = "-" + percentageChangeElement.textContent;

                    // Change chart color to red
                    cryptoChart.data.datasets[0].borderColor = 'rgba(255, 99, 132, 1)';
                    cryptoChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
                } else {
                    // Positive number, upwards triangle
                    if (triangleElement.classList.contains("triangle-negative")) {
                        triangleElement.classList.remove("triangle-negative");
                    }

                    triangleElement.classList.add("triangle-positive");

                    // Change chart color to green
                    cryptoChart.data.datasets[0].borderColor = 'rgba(75, 192, 192, 1)';
                    cryptoChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
                }
                cryptoChart.update();
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
        priceElement.textContent = "$" + Number(data.price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        percentageChangeElement.textContent = `${data.percentageChange.toFixed(2)}%`;
        marketCapElement.textContent = formatMarketCap(data.marketCap);

        if (data.percentageChange < 0) {
            // Negative number, downwards triangle
            if (triangleElement.classList.contains("triangle-positive")) {
                triangleElement.classList.remove("triangle-positive");
            }

            triangleElement.classList.add("triangle-negative");

            // Change chart color to red
            cryptoChart.data.datasets[0].borderColor = 'rgba(255, 99, 132, 1)';
            cryptoChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
        } else {
            // Positive number, upwards triangle
            if (triangleElement.classList.contains("triangle-negative")) {
                triangleElement.classList.remove("triangle-negative");
            }

            triangleElement.classList.add("triangle-positive");

            // Change chart color to green
            cryptoChart.data.datasets[0].borderColor = 'rgba(75, 192, 192, 1)';
            cryptoChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
        }
        cryptoChart.update();
    };

    // Optionally, refresh the data at intervals
    // setInterval(() => fetchCryptoInfo(cryptoName), 60000); // Refresh every minute

    // Overlay functionality
    const overlay = document.getElementById("overlay");
    const closeOverlayBtn = document.getElementById("close-overlay");
    const mainMenu = document.getElementById("main-menu");
    const viewsMenu = document.getElementById("views-menu");
    const settingsMenu = document.getElementById("settings-menu");
    const modeMenu = document.getElementById("mode-menu");
    const cryptoMenu = document.getElementById("crypto-menu");
    const stocksMenu = document.getElementById("stocks-menu");

    // Show overlay on screen tap/click
    document.getElementById("main-container").addEventListener("click", () => {
        overlay.classList.remove("hidden");
    });

    // Close overlay
    closeOverlayBtn.addEventListener("click", () => {
        overlay.classList.add("hidden");
    });

    // Navigation
    document.getElementById("swap-views").addEventListener("click", () => {
        mainMenu.classList.add("hidden");
        viewsMenu.classList.remove("hidden");
    });

    document.getElementById("settings").addEventListener("click", () => {
        mainMenu.classList.add("hidden");
        settingsMenu.classList.remove("hidden");
    });

    document.getElementById("mode").addEventListener("click", () => {
        mainMenu.classList.add("hidden");
        modeMenu.classList.remove("hidden");
    });

    document.getElementById("back-to-main-menu").addEventListener("click", () => {
        viewsMenu.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    });

    document.getElementById("back-to-main-menu-settings").addEventListener("click", () => {
        settingsMenu.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    });

    document.getElementById("back-to-main-menu-mode").addEventListener("click", () => {
        modeMenu.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    });

    document.getElementById("crypto").addEventListener("click", () => {
        modeMenu.classList.add("hidden");
        cryptoMenu.classList.remove("hidden");
    });

    document.getElementById("stocks").addEventListener("click", () => {
        modeMenu.classList.add("hidden");
        stocksMenu.classList.remove("hidden");
    });

    document.getElementById("back-to-mode-menu").addEventListener("click", () => {
        cryptoMenu.classList.add("hidden");
        modeMenu.classList.remove("hidden");
    });

    document.getElementById("back-to-mode-menu-stocks").addEventListener("click", () => {
        stocksMenu.classList.add("hidden");
        modeMenu.classList.remove("hidden");
    });

    // Add functionality to save and load options from JSON
});
