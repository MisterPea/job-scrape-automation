import { parentPort, workerData } from 'node:worker_threads';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';

const { fullHtml, link } = workerData;

try {
  const virtualConsole = new VirtualConsole();
  virtualConsole.off;

  const dom = new JSDOM( fullHtml, { url: link, virtualConsole } );

  const reader = new Readability( dom.window.document, { charThreshold: 0, disableJSONLD: true } );

  const article = reader.parse();
  parentPort.postMessage( { article } );

} catch ( err ) {
  parentPort.postMessage( { error: err.message } );
}