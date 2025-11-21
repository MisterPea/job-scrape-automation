import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'fast-csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function writeCsv(fileName: string, records: Array<Object>) {
  const csvFile = path.resolve(__dirname, `logging/${fileName}`);

  const writeHeaders =
    !fs.existsSync(csvFile) || fs.statSync(csvFile).size === 0;

  const writeStream = fs.createWriteStream(csvFile, { flags: 'a' });

  // Create ONE formatter instance
  const formatter = csv.format({
    headers: writeHeaders,
    includeEndRowDelimiter: true,
  });

  // Pipe it BEFORE writing rows
  formatter.pipe(writeStream).on('finish', () => {
    console.log(`Record added to ${fileName}`);
  });

  // Write all rows through the formatter
  records.forEach((row) => formatter.write(row));

  // Close the formatter
  formatter.end();
}
