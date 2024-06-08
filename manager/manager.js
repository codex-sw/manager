const { execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');

const repoUrl = 'https://api.github.com/repos/codex-sw/manager/commits/main';
const localVersionFile = '/home/admin/tickerapp/app/version.txt';
const mainAppScript = '/home/admin/tickerapp/app/app.js';
const maxRetries = 5;
let retryCount = 0;

const checkForUpdates = async () => {
    try {
        const response = await axios.get(repoUrl);
        const latestCommit = response.data.sha;

        const localVersion = fs.existsSync(localVersionFile) ? fs.readFileSync(localVersionFile, 'utf8').trim() : '';

        if (latestCommit !== localVersion) {
            console.log(`New version available: ${latestCommit}. Updating...`);
            updateApplication(latestCommit);
        } else {
            console.log('Already on the latest version.');
            startMainApplication();
        }
    } catch (error) {
        if (error.code === 'EAI_AGAIN' && retryCount < maxRetries) {
            retryCount++;
            console.error(`DNS lookup failed. Retrying in 10 seconds... (Attempt ${retryCount} of ${maxRetries})`);
            setTimeout(checkForUpdates, 10000);
        } else {
            console.error('Error checking for updates:', error);
            console.log('Proceeding without updates.');
            startMainApplication();
        }
    }
};

const updateApplication = (latestCommit) => {
    const tempDir = '/tmp/update';
    try {
        execSync(`rm -rf ${tempDir}`);
        execSync(`mkdir -p ${tempDir}`);
        execSync(`git clone https://github.com/codex-sw/manager.git ${tempDir}`);
        execSync(`sudo cp -r ${tempDir}/app/* /home/admin/tickerapp/app/`);
        fs.writeFileSync(localVersionFile, latestCommit);
        console.log('Update complete. Restarting application...');
        restartServices();
    } catch (error) {
        console.error('Error during update:', error.message);
        console.error('Full error output:', error.output ? error.output.toString() : 'No additional output');
        startMainApplication();
    }
};

const startMainApplication = () => {
    try {
        console.log('Starting main application...');
        execSync(`sudo node ${mainAppScript}`, { stdio: 'inherit' });
    } catch (error) {
        console.error('Error starting main application:', error.message);
        console.error('Full error output:', error.output ? error.output.toString() : 'No additional output');
    }
};

const restartServices = () => {
    console.log('Restarting services...');
    try {
        // Restart the Node.js app service
        execSync('sudo systemctl restart manager.service');
        // Restart the Chromium kiosk service
        execSync('sudo systemctl restart xinit.service');
    } catch (error) {
        console.error('Error restarting services:', error.message);
        console.error('Full error output:', error.output ? error.output.toString() : 'No additional output');
    }
};

checkForUpdates();
