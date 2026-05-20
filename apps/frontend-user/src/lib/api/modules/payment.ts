/**
 * 支付模块 API
 */

import { api } from '../client';
import type {
  Order,
  RechargePackage,
  CreateOrderRequest,
  CreateOrderResponse,
} from '../types';

export const paymentApi = {
  /**
   * 获取充值套餐列表
   */
  getRechargePackages: async (): Promise<RechargePackage[]> => {
    return api.get<RechargePackage[]>('/payment/packages');
  },

  /**
   * 创建充值订单
   */
  createOrder: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    return api.post<CreateOrderResponse>('/payment/orders', data);
  },

  /**
   * 获取订单详情
   */
  getOrder: async (orderNo: string): Promise<Order> => {
    return api.get<Order>(`/payment/orders/${orderNo}`);
  },

  /**
   * 获取订单列表
   */
  getOrders: async (page: number = 1, pageSize: number = 20): Promise<{
    items: Order[];
    total: number;
  }> => {
    return api.get<{ items: Order[]; total: number }>('/payment/orders', {
      params: { page, page_size: pageSize },
    });
  },

  /**
   * 模拟支付（仅用于开发测试）
   */
  simulatePayment: async (orderId: string): Promise<Order> => {
    return api.post<Order>(`/payment/orders/${orderId}/simulate-payment`);
  },

  /**
   * 查询订单支付状态
   */
  checkOrderStatus: async (orderNo: string): Promise<{
    status: string;
    paid_at?: number;
  }> => {
    return api.get<{ status: string; paid_at?: number }>(`/payment/orders/${orderNo}/status`);
  },
};

export default paymentApi;
