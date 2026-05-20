import axios from 'axios';

const API_BASE_URL = 'https://spendwise-api-5fy4.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getDashboardStats = async (familyId: number) => {
  const response = await api.get(`/families/${familyId}/dashboard`);
  return response.data;
};

export const createTransaction = async (transaction: any) => {
  const response = await api.post('/transactions/', transaction);
  return response.data;
};

export const createUser = async (user: any) => {
  const response = await api.post('/users/', user);
  return response.data;
};

export const updateFamily = async (familyId: number, data: any) => {
  const response = await api.patch(`/families/${familyId}`, data);
  return response.data;
};

export const getFamilyTransactions = async (familyId: number) => {
  const response = await api.get(`/families/${familyId}/transactions`);
  return response.data;
};

export const getFamilies = async () => {
    // This is a helper for the MVP to just get the first family
    const response = await api.get('/families/1');
    return response.data;
}

export const resetDatabase = async () => {
  const response = await api.post('/reset');
  return response.data;
};

export const askAI = async (familyId: number, query: string) => {
  const response = await api.post(`/families/${familyId}/ask-ai`, { query });
  return response.data;
};

export default api;
