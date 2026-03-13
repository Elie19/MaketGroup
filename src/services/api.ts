const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3): Promise<Response> => {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  
  // If we get HTML instead of JSON, check if it's the warmup page
  if (contentType && contentType.includes('text/html')) {
    const text = await response.clone().text();
    if (text.includes('Please wait while your application starts') && retries > 0) {
      console.log(`Server is warming up, retrying in 2s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, options, retries - 1);
    }
  }
  
  return response;
};

const handleResponse = async (response: Response) => {
  const text = await response.text();
  if (!response.ok) {
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      errorData = { error: text || `Error ${response.status}: ${response.statusText}` };
    }
    throw new Error(errorData.error || errorData.details || 'API request failed');
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    if (text.includes('<!doctype html>')) {
      throw new Error("Server is still starting up. Please refresh the page in a few seconds.");
    }
    console.error("Failed to parse JSON response:", text);
    throw new Error("Invalid JSON response from server. See console for details.");
  }
};

export const api = {
  // Users
  getUser: (uid: string) => fetchWithRetry(`/api/users/${uid}`).then(handleResponse),
  createUser: (userData: any) => fetchWithRetry('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  }).then(handleResponse),
  getUsers: () => fetchWithRetry('/api/users').then(handleResponse),
  updateUser: (uid: string, data: any) => fetchWithRetry(`/api/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  // Annonces
  getAnnonces: (category?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (limit) params.append('limit', limit.toString());
    return fetchWithRetry(`/api/annonces?${params}`).then(handleResponse);
  },
  getAnnonce: (id: string) => fetchWithRetry(`/api/annonces/${id}`).then(handleResponse),
  getUserAnnonces: (userId: string) => fetchWithRetry(`/api/annonces/user/${userId}`).then(handleResponse),
  createAnnonce: (data: any) => fetchWithRetry('/api/annonces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  deleteAnnonce: (id: string) => fetchWithRetry(`/api/annonces/${id}`, { method: 'DELETE' }).then(handleResponse),

  // Messages
  getUserMessages: (userId: string) => fetchWithRetry(`/api/messages/user/${userId}`).then(handleResponse),
  getConversation: (u1: string, u2: string) => fetchWithRetry(`/api/messages/conversation?u1=${u1}&u2=${u2}`).then(handleResponse),
  sendMessage: (data: any) => fetchWithRetry('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  // Groups
  getGroups: () => fetchWithRetry('/api/groups').then(handleResponse),
  createGroup: (data: any) => fetchWithRetry('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  deleteGroup: (id: string) => fetchWithRetry(`/api/groups/${id}`, { method: 'DELETE' }).then(handleResponse),
  getGroupMessages: (groupId: string) => fetchWithRetry(`/api/group-messages/${groupId}`).then(handleResponse),
  sendGroupMessage: (data: any) => fetchWithRetry('/api/group-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
};
