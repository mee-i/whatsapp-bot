const { parentPort } = require('node:worker_threads');

const frames = ['Tunggu sebentar tidak akan lama...', 'Sedang meracik sebuah keajaiban...', 'Mengolah bahan...', 'Sebentar ini tidak akan lama...', 'Ini bentar kok...', 'Beneran bentar lagi...', 'Sedikit lagi asli...', 'Nggak bohong gw mah, bentar lagi...', 'Santai dulu gak sih...'];
let frameIndex = 0;

function sendFrame() {
    parentPort.postMessage(frames[frameIndex]);
    frameIndex = (frameIndex + 1) % frames.length;
    setTimeout(sendFrame, 2000);
}

sendFrame();