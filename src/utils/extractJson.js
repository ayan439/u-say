export default function extractJson(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) return null;

  const jsonStr = text.substring(first, last + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
}
