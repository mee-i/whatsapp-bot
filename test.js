const { Worker } = require('worker_threads');

// Create a new worker
const worker = new Worker(`
  const { parentPort } = require('worker_threads');

const frames = ['.', '..', '...'];
let frameIndex = 0;

function sendFrame() {
  parentPort.postMessage(frames[frameIndex]);
  frameIndex = (frameIndex + 1) % frames.length;
  setTimeout(sendFrame, 500); // Change frame every 500ms
}

sendFrame();

`, { eval: true });

// Listen for messages from the worker
worker.on('message', (message) => {
  console.log(message);
});

// Handle errors
worker.on('error', (error) => {
  console.error('Worker error:', error);
});

// Handle worker exit
worker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Worker stopped with exit code ${code}`);
  }
});
