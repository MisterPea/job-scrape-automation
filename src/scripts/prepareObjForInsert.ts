// Method to take an object and convert keys to an array 
// and values to an array of arrays.
export function prepareObjectsForInsert<T = any>(data: any[]) {
  const keys = new Set();
  const values = [];
  for (let i = 0; i < data.length; i += 1) {
    const currElement = data[i];
    const currKeys = Object.keys(currElement);
    const currVals = Object.values(currElement);
    currKeys.forEach((k) => keys.add(k));
    values.push(currVals);
  }
  return { keys: [...keys], vals: values };
}