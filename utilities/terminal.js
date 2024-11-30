const colors = require('./colors.js');

function Log(message) {
    console.log(`${colors.FgGreen}%s${colors.Reset}`, message);
}

function ErrorLog(message) {
    console.error(`${colors.FgRed}%s${colors.Reset}`, message);
}

function WarnLog(message) {
    console.warn(`${colors.FgYellow}%s${colors.Reset}`, message);
}

module.exports = {
    Log,
    ErrorLog,
    WarnLog
};
