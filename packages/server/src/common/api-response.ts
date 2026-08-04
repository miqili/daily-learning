export function success<T>(data: T, message = 'success') {
  return { code: 200, message, data };
}
