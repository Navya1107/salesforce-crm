
import { mockData } from "../data";
const storage = structuredClone(mockData);
export async function getAll(object) {
  return [...(storage[object] || [])];
}
export async function getById(object, id) {
  return storage[object]?.find(item => item.id === Number(id)) || null;
}
export async function create(object, data) {
  const records = storage[object];

  if (!records) throw new Error("Invalid CRM object");

  const record = {
    ...data,
    id: Date.now()
  };

  records.push(record);
  return record;
}
export async function update(object, id, data) {
  const records = storage[object];
  const index = records?.findIndex(item => item.id === Number(id));

  if (index === undefined || index < 0) {
    throw new Error("Record not found");
  }
  records[index] = { ...records[index], ...data };
  return records[index];
}
export async function remove(object, id) {
  const records = storage[object];
  const index = records?.findIndex(item => item.id === Number(id));
  if (index === undefined || index < 0) {
    throw new Error("Record not found");
  }
  records.splice(index, 1);
  return true;
}
