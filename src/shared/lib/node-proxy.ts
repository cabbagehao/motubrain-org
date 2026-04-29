export function fetchWithNodeProxy(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, init);
}
