const { execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');

const repoUrl = 'https://api.github.com/repos/codex-sw/manager';
const localVersionFile = '/home/admin/tickerapp/app/version.txt';
const mainAppScript = '/home/admin/tickerapp/app/app.js';
const maxRetries = 5;
let retryCount = 0;

const checkForUpdates = async () => {
    try {
        const response = await axios.get(`${repoUrl}/releases/latest`);
        const latestVersion = response.data.tag_name;

        const localVersion = fs.existsSync(localVersionFile) ? fs.readFileSync(localVersionFile, 'utf8').trim() : '0.0.0';

        if (latestVersion !== localVersion) {
            console.log(`New version available: ${latestVersion}. Updating...`);
            updateApplication(response.data.zipball_url, latestVersion);
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

const updateApplication = (zipUrl, latestVersion) => {
    const tempDir = '/tmp/update';
    execSync(`rm -rf ${tempDir}`);
    execSync(`mkdir -p ${tempDir}`);
    execSync(`wget -O ${tempDir}/update.zip ${zipUrl}`);
    execSync(`unzip ${tempDir}/update.zip -d ${tempDir}`);
    execSync(`cp -r ${tempDir}/yourrepo-*/* /home/admin/tickerapp/app/`);
    fs.writeFileSync(localVersionFile, latestVersion);
    console.log('Update complete. Restarting application...');
    startMainApplication();
};

const startMainApplication = () => {
    console.log('Starting main application...');
    execSync(`node ${mainAppScript}`, { stdio: 'inherit' });
};

checkForUpdates();
