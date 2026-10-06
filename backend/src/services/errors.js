export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
