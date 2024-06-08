const express = require('express');
const axios = require('axios');
const Gpio = require('pigpio').Gpio;
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

const logDir = '/home/admin/tickerapp/app';
const logFile = `${logDir}/app.log`;

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const log = (message) => {
    console.log(message);
    logStream.write(`${new Date().toISOString()} - ${message}\n`);
};

const buttonPin = 26;
let deviceAwake = true;
let lastPressTime = 0;
const longPressThreshold = 4 * 1000;

let button;
try {
    log('Attempting to set up GPIO...');
    button = new Gpio(buttonPin, {
        mode: Gpio.INPUT,
        pullUpDown: Gpio.PUD_UP,
        alert: true
    });
    button.glitchFilter(10000);
    log('GPIO setup successful');
} catch (err) {
    log(`Error setting up GPIO: ${err}`);
    process.exit(1);
}

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

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
    button.digitalWrite(0);
    process.exit();
});
