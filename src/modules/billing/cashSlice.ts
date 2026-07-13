import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '@/helpers/axiosInstance';

export interface CashSession {
  id: string;
  store_id: string;
  user_id: string;
  cash_register_name: string | null;
  opening_balance: number;
  expected_balance: number;
  actual_cash: number;
  difference: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface CashTotals {
  invoice_cash: number;
  invoice_transfer: number;
  invoice_card: number;
  credit_cash: number;
  credit_transfer: number;
  credit_card: number;
  manual_in: number;
  manual_out: number;
  expected_cash: number;
  total_transfer: number;
  total_card: number;
}

interface CashState {
  activeSession: CashSession | null;
  isOpen: boolean;
  totals: CashTotals | null;
  controlMode: 'NONE' | 'SIMPLIFIED' | 'STRICT';
  isLoading: boolean;
  error: string | null;
}

const initialState: CashState = {
  activeSession: null,
  isOpen: false,
  totals: null,
  controlMode: 'NONE',
  isLoading: false,
  error: null
};

// Async Thunks
export const fetchCashSettingsAndSession = createAsyncThunk(
  'cash/fetchSettingsAndSession',
  async (storeId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/v1/cash-sessions/active?store_id=${storeId}`);

      let controlMode: 'NONE' | 'SIMPLIFIED' | 'STRICT' = 'NONE';
      try {
        const settingsResponse = await axiosInstance.get('/v1/settings?key=cash_control_mode');
        const settingsData = settingsResponse.data?.data || settingsResponse.data || [];
        if (settingsData.length > 0) {
          controlMode = settingsData[0].value;
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('Error al obtener cash_control_mode:', e);
        }
      }

      return {
        session: response.data?.session || null,
        isOpen: response.data?.is_open || false,
        totals: response.data?.totals || null,
        controlMode
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al cargar datos de caja');
    }
  }
);

export const openCashSession = createAsyncThunk(
  'cash/openSession',
  async (
    payload: { storeId: string; openingBalance: number; cashRegisterName?: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post('/v1/cash-sessions/open', {
        store_id: payload.storeId,
        opening_balance: payload.openingBalance,
        cash_register_name: payload.cashRegisterName || 'Caja Móvil'
      });
      // Recargar datos de sesión
      dispatch(fetchCashSettingsAndSession(payload.storeId));
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al abrir caja');
    }
  }
);

export const closeCashSession = createAsyncThunk(
  'cash/closeSession',
  async (
    payload: { cashSessionId: string; actualCash: number; actualUsd?: number; usdExchangeRate?: number; notes?: string; storeId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post('/v1/cash-sessions/close', {
        cash_session_id: payload.cashSessionId,
        actual_cash: payload.actualCash,
        actual_usd: payload.actualUsd || 0,
        usd_exchange_rate: payload.usdExchangeRate,
        notes: payload.notes || ''
      });
      // Recargar datos de sesión
      dispatch(fetchCashSettingsAndSession(payload.storeId));
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al cerrar caja');
    }
  }
);

export const addCashTransaction = createAsyncThunk(
  'cash/addTransaction',
  async (
    payload: { cashSessionId: string; type: 'in' | 'out'; amount: number; currency?: 'NIO' | 'USD'; expense_category_id?: string | null; description: string; storeId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post('/v1/cash-sessions/transactions', {
        cash_session_id: payload.cashSessionId,
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency || 'NIO',
        expense_category_id: payload.expense_category_id,
        description: payload.description
      });
      dispatch(fetchCashSettingsAndSession(payload.storeId));
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al registrar movimiento');
    }
  }
);

// Slice
const cashSlice = createSlice({
  name: 'cash',
  initialState,
  reducers: {
    clearCashState(state) {
      state.activeSession = null;
      state.isOpen = false;
      state.totals = null;
      state.error = null;
    },
    clearCashError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Settings and Session
      .addCase(fetchCashSettingsAndSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCashSettingsAndSession.fulfilled, (state, action) => {
        state.activeSession = action.payload.session;
        state.isOpen = action.payload.isOpen;
        state.totals = action.payload.totals;
        state.controlMode = action.payload.controlMode;
        state.isLoading = false;
      })
      .addCase(fetchCashSettingsAndSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Open Session
      .addCase(openCashSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(openCashSession.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(openCashSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Close Session
      .addCase(closeCashSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(closeCashSession.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(closeCashSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearCashState, clearCashError } = cashSlice.actions;
export default cashSlice.reducer;
