// Method to take an object and convert keys to an array
// and values to an array of arrays.
interface SearchData {
  title: string;
  link: string;
}
export function prepareObjectsForInsert(data: SearchData[]) {
  const keys = new Set();
  const values = [];
  for (let i = 0; i < data.length; i += 1) {
    const currElement = data[i] as SearchData;
    const currKeys = Object.keys(currElement);
    const currVals = Object.values(currElement);
    for (const k of currKeys) {
      keys.add(k);
    }
    values.push(currVals);
  }
  return { keys: [...keys], vals: values };
}
