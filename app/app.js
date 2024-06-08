const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

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
app.use((req, res, next) => {
    if (!app.locals.ready) {
        res.sendFile(path.join(__dirname, 'loading.html'));
    } else {
        next();
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.sendStatus(app.locals.ready ? 200 : 503);
});

// Serve the main page
app.get('/', (req, res) => {
    if (app.locals.ready) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'loading.html'));
    }
});

app.get('/ping', async (req, res) => {
    try {
        const response = await axios.get('https://www.google.com');
        res.send('Ping to Google successful');
        log('Ping to Google successful');
    } catch (error) {
        res.send('Ping to Google failed');
        log(`Ping to Google failed: ${error}`);
    }
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
