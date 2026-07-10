import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  /** Token Bearer del administrador (equivalente a localStorage en web) */
  token: string | null;
  isAuthenticated: boolean;
  /** Sesión del vendedor (Paso 2 del flujo de 2 pasos) */
  isSellerAuthenticated: boolean;
  sellerId: string | null;
  sellerName: string | null;
  sellerCode: string | null;
  currentStoreId: string | null;
  currentStoreName: string | null;
}

const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  isSellerAuthenticated: false,
  sellerId: null,
  sellerName: null,
  sellerCode: null,
  currentStoreId: null,
  currentStoreName: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    setSellerSession(
      state,
      action: PayloadAction<{
        sellerId: string;
        sellerName: string;
        sellerCode: string;
        storeId: string;
        storeName: string;
      }>
    ) {
      state.isSellerAuthenticated = true;
      state.sellerId = action.payload.sellerId;
      state.sellerName = action.payload.sellerName;
      state.sellerCode = action.payload.sellerCode;
      state.currentStoreId = action.payload.storeId;
      state.currentStoreName = action.payload.storeName;
    },
    clearSellerSession(state) {
      state.isSellerAuthenticated = false;
      state.sellerId = null;
      state.sellerName = null;
      state.sellerCode = null;
    },
    /**
     * Login completo en un solo dispatch: token + sesión de vendedor.
     * Usado por el auto-login de usuarios con seller_id vinculado.
     */
    setFullSession(
      state,
      action: PayloadAction<{
        token: string;
        sellerId: string;
        sellerName: string;
        sellerCode: string;
        storeId: string;
        storeName: string;
      }>
    ) {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isSellerAuthenticated = true;
      state.sellerId = action.payload.sellerId;
      state.sellerName = action.payload.sellerName;
      state.sellerCode = action.payload.sellerCode;
      state.currentStoreId = action.payload.storeId;
      state.currentStoreName = action.payload.storeName;
    },
    logout(state) {
      Object.assign(state, initialState);
    }
  }
});

export const { setToken, setSellerSession, clearSellerSession, setFullSession, logout } =
  authSlice.actions;
export default authSlice.reducer;
