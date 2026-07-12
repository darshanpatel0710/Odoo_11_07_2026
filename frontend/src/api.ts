const BASE_URL = 'http://127.0.0.1:8000/api';

const req = async (method: string, endpoint: string, body?: any) => {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(BASE_URL + endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw { response: { data } }; // match axios error structure
    }
    return { data }; // match axios success structure
};

export const api = {
    get: (url: string) => req('GET', url),
    post: (url: string, body?: any) => req('POST', url, body),
    put: (url: string, body?: any) => req('PUT', url, body)
};
