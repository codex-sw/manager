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
    execSync(`rm -rf ${tempDir}`);
    execSync(`mkdir -p ${tempDir}`);
    execSync(`git clone https://github.com/codex-sw/manager.git ${tempDir}`);
    execSync(`cp -r ${tempDir}/app/* /home/admin/tickerapp/app/`);
    fs.writeFileSync(localVersionFile, latestCommit);
    console.log('Update complete. Restarting application...');
    startMainApplication();
};

const startMainApplication = () => {
    console.log('Starting main application...');
    execSync(`node ${mainAppScript}`, { stdio: 'inherit' });
};

checkForUpdates();
