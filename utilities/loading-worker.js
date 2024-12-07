const { parentPort } = require('node:worker_threads');

const frames = ['/', '—', '\\', '|'];
let frameIndex = 0;

function sendFrame() {
    parentPort.postMessage(frames[frameIndex]);
    frameIndex = (frameIndex + 1) % frames.length;
    setTimeout(sendFrame, 1000);
}

sendFrame();