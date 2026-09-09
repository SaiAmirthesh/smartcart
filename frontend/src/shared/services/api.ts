const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiProduct {
  id: number;
  rfid_uid: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface ApiCart {
  id: number;
  cart_code: string;
  status: string;
  created_at?: string;
}

export interface ApiCartItem {
  product: string;
  rfid_uid: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ApiCartDetails {
  cart_id: number;
  cart_code: string;
  status: string;
  items: ApiCartItem[];
  subtotal: number;
}

export interface ApiAddProductResponse {
  message: string;
  product: string;
  quantity: number;
  price: number;
}

export interface ApiCheckoutResponse {
  message: string;
  transaction_code: string;
  cart_id: number;
  total_amount: number;
  payment_status: string;
}

export interface ApiTransaction {
  id: number;
  transaction_code: string;
  cart_id: number;
  total_amount: number;
  payment_status: string;
  created_at?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // fallback to statusText
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const smartCartApi = {
  // Health check
  checkHealth: async (): Promise<boolean> => {
    try {
      const res = await request<{ status: string }>('/health');
      return res.status === 'healthy';
    } catch {
      return false;
    }
  },

  // Products
  getProducts: async (): Promise<ApiProduct[]> => {
    return request<ApiProduct[]>('/products/');
  },

  getProductByRfid: async (rfidUid: string): Promise<ApiProduct> => {
    return request<ApiProduct>(`/products/rfid/${encodeURIComponent(rfidUid)}`);
  },

  createProduct: async (data: {
    rfid_uid: string;
    name: string;
    category: string;
    price: number;
    stock?: number;
  }): Promise<ApiProduct> => {
    return request<ApiProduct>('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cart
  createCart: async (): Promise<ApiCart> => {
    return request<ApiCart>('/cart/create', {
      method: 'POST',
    });
  },

  getCart: async (cartId: number): Promise<ApiCartDetails> => {
    return request<ApiCartDetails>(`/cart/${cartId}`);
  },

  addProductToCart: async (
    cartId: number,
    rfidUid: string
  ): Promise<ApiAddProductResponse> => {
    return request<ApiAddProductResponse>(
      `/cart/${cartId}/add/${encodeURIComponent(rfidUid)}`,
      { method: 'POST' }
    );
  },

  removeProductFromCart: async (
    cartId: number,
    rfidUid: string
  ): Promise<{ message: string }> => {
    return request<{ message: string }>(
      `/cart/${cartId}/remove/${encodeURIComponent(rfidUid)}`,
      { method: 'DELETE' }
    );
  },

  // Transactions / Checkout
  checkout: async (cartId: number): Promise<ApiCheckoutResponse> => {
    return request<ApiCheckoutResponse>(`/transactions/checkout/${cartId}`, {
      method: 'POST',
    });
  },

  getTransactions: async (): Promise<ApiTransaction[]> => {
    return request<ApiTransaction[]>('/transactions/');
  },

  getTransactionByCode: async (transactionCode: string): Promise<ApiTransaction> => {
    return request<ApiTransaction>(
      `/transactions/${encodeURIComponent(transactionCode)}`
    );
  },
};
