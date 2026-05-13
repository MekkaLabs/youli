const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  return response.json() as Promise<T>;
}
