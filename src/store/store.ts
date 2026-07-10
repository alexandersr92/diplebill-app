import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/modules/auth/authSlice';
import billingReducer from '@/modules/billing/billingSlice';
import cashReducer from '@/modules/billing/cashSlice';

/**
 * Redux store de DipleBill Mobile.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    billing: billingReducer,
    cash: cashReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
