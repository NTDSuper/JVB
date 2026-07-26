// ── Auth ──
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

// ── User ──
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  role: string[];
  created_at?: string;
}

export interface UserAdminUpdate {
  username?: string;
  email?: string;
  full_name?: string;
  is_active?: boolean;
  role?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

// ── Product ──
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Attribute {
  id: number;
  category_id: number;
  name: string;
  data_type: string;
  required: boolean;
}

export interface ProductAttribute {
  attribute_id: number;
  attribute_name: string;
  data_type: string;
  value?: string;
}

export interface Product {
  id?: number;
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  cost_price?: number;
  category_id?: number;
  stock: number;
  image_url?: string;
  status: string;
  attributes?: ProductAttribute[];
}

// ── Cart ──
export interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  product_price: number;
  product_image_url?: string;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  total_amount: number;
}

export interface AddToCartRequest {
  product_id: number;
  quantity: number;
}

// ── Order ──
export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  items: OrderItem[];
}

export interface OrderList {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  item_count: number;
}

export interface OrderListPaginatedResponse {
  items: OrderList[];
  total: number;
  skip: number;
  limit: number;
}

export interface CheckoutRequest {
  payment_method: string;
}

// ── Payment ──
export interface Payment {
  id: number;
  order_id: number;
  method: string;
  amount: number;
  status: string;
  expires_at?: string;
  paid_at?: string;
  refund_at?: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  payment?: Payment;
}
