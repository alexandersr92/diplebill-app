import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '@/helpers/axiosInstance';

export interface Product {
  id: string; // inventory product item id
  product_id: string;
  inventory_id: string;
  sku: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  stock: number; // quantity in inventory
  unit_of_measure?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  tax: number;
}

export interface InvoiceDetailProduct {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  discount: number;
  tax: number;
  grand_total: number;
}

export interface SingleInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_status: string;
  client_name: string;
  grand_total: number;
  total_items: number;
  discount: number;
  tax: number;
  method: string | null;
  invoice_note?: string;
  seller?: string | null;
  invoice_details: InvoiceDetailProduct[];
}

interface BillingState {
  products: Product[];
  cart: CartItem[];
  invoices: SingleInvoice[];
  isLoading: boolean;
  error: string | null;
}

const initialState: BillingState = {
  products: [],
  cart: [],
  invoices: [],
  isLoading: false,
  error: null
};

// Async Thunks
export const fetchProducts = createAsyncThunk(
  'billing/fetchProducts',
  async ({ storeId, search }: { storeId: string; search: string }, { rejectWithValue }) => {
    try {
      // Query items from specific store inventory
      const response = await axiosInstance.get(`/v1/inventories/stores/${storeId}`, {
        params: { search, per_page: 50 }
      });
      // La API retorna los datos en data.data o data
      const records = response.data?.data || response.data || [];

      // Mapear el formato que viene de la API
      return records.map((item: any) => ({
        id: item.id, // ID del item en inventario
        product_id: item.product_id || item.product?.id || '',
        inventory_id: item.inventory_id || '',
        sku: item.sku || item.product?.sku || '',
        barcode: item.barcode || item.product?.barcode || '',
        name: item.name || item.product?.name || '',
        price: Number(item.price || item.product?.price || 0),
        cost: Number(item.cost || item.product?.cost || 0),
        stock: Number(item.quantity ?? 0),
        unit_of_measure: item.unit_of_measure || item.product?.unit_of_measure || 'ud'
      }));
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al buscar productos');
    }
  }
);

export const createInvoice = createAsyncThunk(
  'billing/createInvoice',
  async (invoiceData: any, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/v1/invoices', invoiceData);
      dispatch(clearCart());
      return response.data?.data || response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al registrar la venta');
    }
  }
);

export const fetchInvoicesList = createAsyncThunk(
  'billing/fetchInvoices',
  async ({ storeId }: { storeId: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/v1/invoices', {
        params: { store_id: storeId, per_page: 50 }
      });
      return response.data?.data || response.data || [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al cargar facturas');
    }
  }
);

export const cancelInvoiceThunk = createAsyncThunk(
  'billing/cancelInvoice',
  async ({ id, storeId }: { id: string; storeId: string }, { dispatch, rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/v1/invoices/${id}`);
      dispatch(fetchInvoicesList({ storeId }));
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Error al anular la factura');
    }
  }
);

// Slice
const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<Product>) {
      const existing = state.cart.find((item) => item.product.id === action.payload.id);
      if (existing) {
        if (existing.quantity < action.payload.stock) {
          existing.quantity += 1;
        }
      } else {
        state.cart.push({
          product: action.payload,
          quantity: 1,
          discount: 0,
          tax: 0
        });
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.cart = state.cart.filter((item) => item.product.id !== action.payload);
    },
    updateCartQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.cart.find((i) => i.product.id === action.payload.productId);
      if (item) {
        const qty = Math.max(1, Math.min(action.payload.quantity, item.product.stock));
        item.quantity = qty;
      }
    },
    updateCartItemPrice(state, action: PayloadAction<{ productId: string; price: number }>) {
      const item = state.cart.find((i) => i.product.id === action.payload.productId);
      if (item) {
        item.product.price = Math.max(0, action.payload.price);
      }
    },
    updateCartItemDiscount(state, action: PayloadAction<{ productId: string; discount: number }>) {
      const item = state.cart.find((i) => i.product.id === action.payload.productId);
      if (item) {
        item.discount = Math.max(0, action.payload.discount);
      }
    },
    clearCart(state) {
      state.cart = [];
    },
    clearBillingError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.products = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Invoice
      .addCase(createInvoice.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Invoices
      .addCase(fetchInvoicesList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoicesList.fulfilled, (state, action) => {
        state.invoices = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchInvoicesList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  addToCart,
  removeFromCart,
  updateCartQuantity,
  updateCartItemPrice,
  updateCartItemDiscount,
  clearCart,
  clearBillingError
} = billingSlice.actions;
export default billingSlice.reducer;
