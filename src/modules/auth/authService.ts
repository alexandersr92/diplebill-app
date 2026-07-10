import axiosInstance from '@/helpers/axiosInstance';
import axios from 'axios';

export interface SellerStoreData {
  id: string;
  name: string;
}

export interface SellerData {
  id: string;
  name: string;
  code: string;
  stores: SellerStoreData[];
}

export interface ValidatedUser {
  id: string;
  email: string;
  organization_id: string;
  seller_id?: string | null;
  seller?: SellerData | null;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: ValidatedUser;
}

export interface StoreData {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
}

/**
 * Servicio de autenticación e interacción con el API de DipleBill.
 */
export const authService = {
  /**
   * Inicia sesión del Administrador (Paso 1).
   */
  async loginAdmin(email: string, password: string) {
    try {
      const response = await axiosInstance.post('/v1/login', {
        email,
        password,
        device_name: 'mobile'
      });
      return response.data; // { token, user }
    } catch (error: any) {
      if (__DEV__) {
        console.warn('Axios error details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data
        });
      }
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Error de inicio de sesión');
      }
      throw new Error('Ha ocurrido un error inesperado');
    }
  },

  /**
   * Valida un token de administrador existente.
   * Retorna los datos del usuario (incluyendo seller si tiene) o null si el token es inválido.
   */
  async validateAdminToken(token: string): Promise<ValidatedUser | null> {
    try {
      const res = await axiosInstance.get<ValidateTokenResponse>('/v1/validateToken', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.valid && res.data.user) {
        return res.data.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Obtiene la lista de tiendas asociadas al Administrador autenticado.
   */
  async fetchStoresList(): Promise<StoreData[]> {
    try {
      const response = await axiosInstance.get('/v1/stores');
      // En Laravel de DipleBill, a veces la respuesta viene envuelta en data.data o data.
      return response.data?.data || response.data || [];
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Error al cargar las tiendas');
      }
      throw new Error('Error al conectar con el servidor');
    }
  },

  /**
   * Inicia sesión del Vendedor para una tienda específica (Paso 2).
   */
  async loginSeller(storeId: string, code: string, pin: string) {
    try {
      const response = await axiosInstance.post('/v1/sellers/seller-login', {
        store_id: storeId,
        code,
        pin
      });
      return response.data; // Retorna la sesión del vendedor
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'PIN o código de vendedor incorrecto');
      }
      throw new Error('Error al conectar con el servidor');
    }
  }
};
