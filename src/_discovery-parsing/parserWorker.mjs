import { parentPort, workerData } from "node:worker_threads";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

const { fullHtml, link } = workerData;

try {
  const virtualConsole = new VirtualConsole();
  virtualConsole.off;

  const dom = new JSDOM(fullHtml, { url: link, virtualConsole });

  // TODO: Find location

  const reader = new Readability(dom.window.document, {
    charThreshold: 0,
    disableJSONLD: false,
  });

  const article = reader.parse();

  const { content } = article;

  const turndownService = new TurndownService();
  const ts = turndownService.remove("img").turndown(content);

  // This regex removes md links: e.g. [Some link](://myUrl) or links preceded by a bullet (*, +, -, !)
  // It is broken into 2 parts to first part for bullet + link removal and || link by itself.
  // We cannot remove the link alone or it may leave the bullet and we can't clean up stray bullets from
  // link removal, as we don't know they are from a link being removed.
  const regex =
    /^\s*(\*|\+|\-|\*{2,})?\s*!?\[.*?\]\([^\)]*\)\s*(\r?\n|$) | (\[.*?\]\([^\)]*\))/gm;

  const cleanedString = ts.replaceAll(regex, "");

  parentPort.postMessage({ article, siteData: cleanedString });
} catch (err) {
  parentPort.postMessage({ error: err.message });
}
