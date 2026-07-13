import axiosInstance from '@/helpers/axiosInstance';

export const getExpenseCategoriesApi = async () => {
  return await axiosInstance.get('/v1/expense-categories');
};

export const createExpenseCategoryApi = async (name: string) => {
  return await axiosInstance.post('/v1/expense-categories', { name });
};
