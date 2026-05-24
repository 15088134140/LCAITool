/**
 * 支付模块 API
 */

import { api } from '../client';
import type {
  Order,
  RechargePackage,
  CreateOrderRequest,
  CreateOrderResponse,
  PointTransaction,
  ListTransactionsParams,
  PaginatedResponse,
} from '../types';

export const paymentApi = {
  /**
   * 获取充值套餐列表
   */
  getRechargePackages: async (is_active: boolean = true): Promise<PaginatedResponse<RechargePackage>> => {
    return api.get<PaginatedResponse<RechargePackage>>('/payment/packages', { params: { is_active } });
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
   * 模拟支付（仅用于开发测试）
   */
  simulatePayment: async (orderNo: string): Promise<any> => {
    return api.post(`/payment/orders/${orderNo}/pay`);
  },

  /**
   * 获取积分交易记录
   */
  getTransactions: async (params?: ListTransactionsParams): Promise<PaginatedResponse<PointTransaction>> => {
    return api.get<PaginatedResponse<PointTransaction>>('/payment/transactions', { params });
  },

  /**
   * 获取订单列表
   */
  getOrders: async (
    page: number = 1,
    pageSize: number = 20,
    startDate?: number,
    endDate?: number,
  ): Promise<PaginatedResponse<Order>> => {
    return api.get<PaginatedResponse<Order>>('/payment/orders', {
      params: { page, page_size: pageSize, start_date: startDate, end_date: endDate },
    });
  },

  /**
   * 自定义充值（一步完成创建订单+支付）
   */
  customRecharge: async (amount: number): Promise<{
    success: boolean;
    order_no: string;
    pay_amount: number;
    total_points: number;
    balance: number;
    message: string;
  }> => {
    return api.post('/payment/custom-recharge', { amount });
  },
};

export default paymentApi;
