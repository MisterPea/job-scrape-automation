import { Worker } from 'node:worker_threads';

export function parseWithTimeout(fullHtml:string, link:string, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./parserWorker.mjs', import.meta.url), {
      workerData: { fullHtml, link }
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Reader.parse() timed out'));
    }, timeoutMs);

    worker.on('message', (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timer);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}