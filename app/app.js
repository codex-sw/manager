const express = require('express');
const fs = require('fs');
const path = require('path');
const stockRoutes = require('./stock'); // Keep this if you want to keep stock routes
const cryptoRoutes = require('./crypto'); // Import the crypto routes
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// app.use(stockRoutes); // Use the stock routes
app.use(cryptoRoutes); // Use the crypto routes


// Set log directory based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const logDir = isDevelopment ? path.join(__dirname, 'logs') : '/home/admin/tickerapp/app';
const logFile = path.join(logDir, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const log = (message) => {
    console.log(message);
    logStream.write(`${new Date().toISOString()} - ${message}\n`);
};

// Load GPIO only if not in development
let Gpio;
let button;
const buttonPin = 26;
let deviceAwake = true;
let lastPressTime = 0;
const longPressThreshold = 4 * 1000;

if (!isDevelopment) {
    try {
        Gpio = require('pigpio').Gpio;
        log('Attempting to set up GPIO...');
        button = new Gpio(buttonPin, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_UP,
            alert: true
        });
        button.glitchFilter(10000);
        log('GPIO setup successful');

        button.on('alert', (level, tick) => {
            const currentTime = Date.now();

            if (level === 0) {
                lastPressTime = currentTime;
                log('Button pressed');
            } else {
                const pressDuration = currentTime - lastPressTime;
                if (pressDuration >= longPressThreshold) {
                    log('Long press detected - Log opening shutdown screen');
                } else {
                    if (deviceAwake) {
                        log('Toggling sleep mode - Putting device to sleep');
                        sleepDevice();
                    } else {
                        log('Toggling wake mode - Waking up device');
                        wakeDevice();
                    }
                    deviceAwake = !deviceAwake;
                }
            }
        });
    } catch (err) {
        log(`Error setting up GPIO: ${err}`);
        process.exit(1);
    }
}

// Middleware to serve the loading page if the app is not ready
// app.use((req, res, next) => {
//     if (!app.locals.ready) {
//         res.sendFile(path.join(__dirname, 'public', 'loading.html'));
//     } else {
//         next();
//     }
// });

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.sendStatus(app.locals.ready ? 200 : 503);
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simulate app readiness after 5 seconds (replace this with your actual readiness logic)
setTimeout(() => {
    app.locals.ready = true;
}, 5000);

app.listen(port, () => {
    log(`App listening at http://localhost:${port}`);
});

function sleepDevice() {
    log('Turning off the DSI display backlight');
    require('child_process').execSync("echo 1 | sudo tee /sys/class/backlight/10-0045/bl_power");
}

function wakeDevice() {
    log('Turning on the DSI display backlight');
    require('child_process').execSync("echo 0 | sudo tee /sys/class/backlight/10-0045/bl_power");
}

process.on('SIGINT', () => {
    log('Exiting gracefully');
    if (button) {
        button.digitalWrite(0);
    }
    process.exit();
});
