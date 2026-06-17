/**
 * 灵创AI工具箱 - API类型定义
 * 基于后端Python模型生成的TypeScript类型
 */

// 通用类型
export type UUID = string;
export type Timestamp = number;

// 通用分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  stats?: {
    total: number;
    published_count: number;
    total_views: number;
    avg_version: number;
  };
}

// 通用API响应
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============== 用户相关类型 ==============

export interface User {
  id: UUID;
  openid?: string;
  phone?: string;
  email?: string;
  nickname?: string;
  avatar?: string;
  real_name?: string;
  id_card_number?: string;
  id_card_verified: boolean;
  balance: number;
  frozen_balance: number;
  status: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Role {
  id: UUID;
  name: string;
  description?: string;
  permissions?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// 认证相关
export interface LoginRequest {
  code: string; // 微信授权code
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// 账号密码注册
export interface RegisterRequest {
  username?: string;
  password: string;
  phone?: string;
  email?: string;
  nickname?: string;
  code?: string;
  invite_code?: string;
}

export interface RegisterResponse {
  id: UUID;
  phone?: string;
  email?: string;
  nickname?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// 实名认证相关
export interface RealNameVerificationRequest {
  real_name: string;
  id_card_number: string;
  front_image?: string;
  back_image?: string;
  hold_image?: string;
}

export interface RealNameVerification {
  id_card_verified: boolean;
  real_name?: string;
  id_card_number?: string;
}

// ============== 工具参数Schema类型 ==============

export interface ToolParamOption {
  label: string;
  value: string | number | boolean;
  icon?: string;
  desc?: string;
}

export interface ToolParamCondition {
  when: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'truthy' | 'falsy';
    value?: any;
  };
  effect: 'show' | 'hide' | 'enable' | 'disable';
}

export interface ToolParamField {
  key: string;
  label: string;
  type: 'section' | 'text' | 'textarea' | 'radio' | 'select' | 'range' | 'number' | 'boolean' | 'file' | 'action' | 'hidden';
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  accept?: string;
  min?: number;
  max?: number;
  order?: number;
  uiHint?: string;
  helpText?: string;
  action?: string;
  options?: ToolParamOption[];
  condition?: ToolParamCondition;
}

// ============== 工具相关类型 ==============

export interface ToolCategory {
  id: UUID;
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  sort_order: number;
  tool_count: number;
  is_active: boolean;
  is_featured: boolean;
  parent_id?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============== 动态表单 / 计价 schema ==============

export type ToolParamFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'radioCard'
  | 'checkbox'
  | 'boolean'
  | 'date'
  | 'file'
  | 'section'
  | 'range'
  | 'hidden';

export interface ToolParamOption {
  label: string;
  value: string | number;
  icon?: string;
  desc?: string;
}

export interface ToolParamConditionWhen {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin';
  value: any;
}

export interface ToolParamCondition {
  when: ToolParamConditionWhen;
  effect: 'show' | 'hide' | 'enable' | 'disable';
}

export interface ToolParamField {
  key: string;
  label: string;
  type: ToolParamFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: ToolParamOption[];
  min?: number;
  max?: number;
  step?: number;
  order?: number;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  maxFiles?: number;
  allowCustom?: boolean;
  condition?: ToolParamCondition;
  uiHint?: 'card';
}

export type PricingItemType = 'fixed' | 'per_unit';

export interface PricingWhenCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'truthy' | 'falsy';
  value?: any;
}

export interface PricingSchemaItem {
  key: string;
  type: PricingItemType;
  label?: string;
  // fixed
  amount_ref?: string;
  // per_unit
  field?: string;
  unit_amount_ref?: string;
  default_quantity?: number;
  min_quantity?: number;
  max_quantity?: number;
  unit_size?: number;
  // conditional
  when?: PricingWhenCondition;
}

export interface PricingDisplayConfig {
  show_breakdown?: boolean;
  total_label?: string;
  unit_label?: string;
}

export interface PricingSchema {
  version: number;
  currency: string;
  rounding?: 'ceil' | 'floor' | 'round';
  min_total?: number;
  max_total?: number | null;
  items: PricingSchemaItem[];
  display?: PricingDisplayConfig;
}

export interface PricingBreakdownItem {
  key: string;
  label: string;
  amount: number;
  quantity: number;
  unit_amount: number;
  amount_ref?: string;
  unit_amount_ref?: string;
}

export interface PricingResult {
  total: number;
  currency: string;
  breakdown: PricingBreakdownItem[];
  warnings: string[];
}

// ============== 上传文件元数据 ==============

export interface UploadedFileMeta {
  id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  url: string;
}

export interface Tool {
  id: UUID;
  slug: string;
  name: string;
  description?: string;
  short_desc?: string;
  cover_image?: string;
  category_id?: UUID;
  category?: string;
  tags?: string[];
  base_fee: number;
  image_fee: number;
  audio_fee: number;
  token_fee: number;
  config?: Record<string, any>;
  param_schema?: ToolParamField[];
  executor_key?: string;
  pricing_schema?: Record<string, any>;
  status: number;
  use_count: number;
  favorite_count: number;
  rating_count: number;
  rating_avg: number;
  usage_modes?: string[];
  param_schema?: ToolParamField[] | null;
  pricing_schema?: PricingSchema | null;
  executor_key?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ToolFavorite {
  id: UUID;
  user_id: UUID;
  tool_id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ToolRating {
  id: UUID;
  user_id: UUID;
  tool_id: UUID;
  task_id: UUID;
  rating: number;
  content?: string;
  images?: string[];
  is_useful_count: number;
  status: number;
  admin_reply?: string;
  replied_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ToolDemo {
  id: UUID;
  tool_id: UUID;
  title: string;
  description?: string;
  cover_image?: string;
  demo_type: 'image' | 'image_audio' | 'video';
  demo_images?: string[];
  input_params?: Record<string, any>;
  result_sample?: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  created_by?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============== 任务相关类型 ==============

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface Task {
  id: UUID;
  user_id: UUID;
  tool_id?: UUID;
  task_type: string;
  status: TaskStatus;
  progress: number;
  progress_message?: string;
  snapshot_data?: Record<string, any>;
  input_params?: Record<string, any>;
  result_preview?: string;
  error_message?: string;
  estimated_cost?: number;
  actual_cost?: number;
  started_at?: Timestamp;
  completed_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  // 前端扩展字段
  tool_name?: string;
  tool_cover?: string;
}

export interface TaskLog {
  id: UUID;
  task_id: UUID;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreateTaskRequest {
  tool_id: UUID;
  task_type: string;
  estimated_cost?: number;
  input_params: Record<string, any>;
}

export interface EstimateCostRequest {
  tool_id: UUID;
  input_params: Record<string, any>;
}

export interface EstimateCostResponse {
  estimated_cost: number;
  breakdown: {
    base_fee: number;
    image_fee?: number;
    audio_fee?: number;
    token_fee?: number;
  };
}

// ============== 成果相关类型 ==============

export type WorkStatus = 'draft' | 'published';

export interface Work {
  id: UUID;
  user_id: UUID;
  task_id: UUID;
  parent_id?: UUID;
  tool_id?: UUID;
  title: string;
  description?: string;
  version: number;
  cover_image?: string;
  status: WorkStatus;
  is_public: boolean;
  view_count: number;
  like_count: number;
  share_count: number;
  input_params?: Record<string, any>;
  actual_cost?: number;
  usage_modes?: string[];
  tool_param_schema?: Array<{
    key: string;
    label: string;
    type: string;
    order: number;
  }>;
  created_at: Timestamp;
  updated_at: Timestamp;
  // 前端扩展字段
  task_type?: string;
  tool_name?: string;
  coverImage?: string; // 别名用于方便组件使用
  file_count?: number;
}

export interface WorkFile {
  id: UUID;
  work_id: UUID;
  file_type: 'image' | 'audio' | 'video' | 'pdf' | 'psd' | 'other';
  file_name: string;
  file_url: string;
  file_size?: number;
  page_number?: number;
  mime_type?: string;
  duration?: number;
  is_preview: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WorkShare {
  id: UUID;
  work_id: UUID;
  share_type: 'public' | 'link' | 'friends';
  share_url?: string;
  password?: string;
  expire_at?: Timestamp;
  view_count: number;
  like_count: number;
  comment_count: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: UUID;
  reviewed_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============== 支付相关类型 ==============

export type PaymentProvider = 'wechat' | 'alipay' | 'simulated';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
export type TransactionType = 'recharge' | 'consume' | 'refund' | 'adjust' | 'freeze' | 'unfreeze';

export interface Order {
  id: UUID;
  user_id: UUID;
  order_no: string;
  third_party_order_no?: string;
  pay_amount: number;
  base_points: number;
  bonus_points: number;
  total_points: number;
  payment_provider: PaymentProvider;
  status: OrderStatus;
  paid_at?: Timestamp;
  expired_at?: Timestamp;
  client_ip?: string;
  device_info?: string;
  remark?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RechargePackage {
  id: UUID;
  name: string;
  description?: string;
  original_price: number;
  sale_price: number;
  base_points: number;
  bonus_points: number;
  bonus_percentage: number;
  is_popular: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PointTransaction {
  id: UUID;
  user_id: UUID;
  amount: number;
  type: TransactionType;
  reason?: string;
  related_id?: string;
  related_type?: string;
  idempotency_key?: string;
  balance_before: number;
  balance_after: number;
  operator?: string;
  remark?: string;
  order_id?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreateOrderRequest {
  recharge_package_id: UUID;
  payment_provider: PaymentProvider;
}

export interface CreateOrderResponse {
  order_id: UUID;
  order_no: string;
  pay_amount: number;
  payment_params: Record<string, any>;
}

// ============== 创意相关类型 ==============

export type IdeaStatus = 'pending' | 'reviewing' | 'approved' | 'implemented' | 'rejected';

export interface VoterInfo {
  user_id: UUID;
  nickname?: string;
  avatar?: string;
}

export interface IdeaSubmission {
  id: UUID;
  user_id: UUID;
  title: string;
  description?: string;
  cover_image?: string;
  category?: string;
  tags?: string[];
  contact_info?: string;
  vote_count: number;
  view_count: number;
  has_voted?: boolean;
  voters?: VoterInfo[];
  status: IdeaStatus;
  admin_remark?: string;
  admin_id?: UUID;
  reviewed_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface IdeaVote {
  id: UUID;
  idea_id: UUID;
  user_id: UUID;
  vote_type: 'up' | 'down';
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreateIdeaRequest {
  title: string;
  description?: string;
  cover_image?: string;
  category?: string;
  tags?: string[];
  contact_info?: string;
}

export interface VoteIdeaRequest {
  idea_id: UUID;
  vote_type: 'up' | 'down';
}

// ============== SSE事件类型 ==============

export type SSEEventType =
  | 'task.progress'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'
  | 'user.balance_updated'
  | 'notification';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: Timestamp;
}

export interface TaskProgressEvent {
  task_id: UUID;
  status: TaskStatus;
  progress: number;
  progress_message?: string;
}

export interface TaskCompletedEvent {
  task_id: UUID;
  work_id: UUID;
  actual_cost: number;
}

export interface TaskFailedEvent {
  task_id: UUID;
  error_message: string;
}

export interface BalanceUpdatedEvent {
  user_id: UUID;
  balance: number;
  frozen_balance: number;
}

// ============== 用户统计类型 ==============

export interface UserStats {
  days_used: number;
  today_count: number;
  total_works: number;
  total_consumed: number;
  total_recharge: number;
  total_income: number;
  reward_points: number;
  monthly_consumed: number;
}

// ============== 最近使用的工具 ==============

export interface ToolRecentItem {
  id: string;
  name: string;
  cover_image: string | null;
  use_count: number;
  last_used_at: number | null;
}

// ============== 查询参数类型 ==============

export interface ListTasksParams {
  status?: TaskStatus;
  tool_id?: UUID;
  page?: number;
  page_size?: number;
}

export interface ListWorksParams {
  status?: WorkStatus;
  category_id?: UUID;
  search?: string;
  date_from?: Timestamp;
  date_to?: Timestamp;
  page?: number;
  page_size?: number;
}

export interface ListToolsParams {
  category_id?: UUID;
  search?: string;
  is_featured?: boolean;
  is_hot?: boolean;
  is_new?: boolean;
  page?: number;
  page_size?: number;
}

export interface ListIdeasParams {
  status?: IdeaStatus;
  category?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ListTransactionsParams {
  type?: TransactionType;
  start_date?: Timestamp;
  end_date?: Timestamp;
  page?: number;
  page_size?: number;
}

// ============== API Key 相关类型 ==============

export interface ApiKey {
  id: UUID;
  name: string;
  key_prefix: string;
  status: string;
  last_used_at: Timestamp | null;
  created_at: Timestamp;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
  warning: string;
}

export interface ApiKeyReveal {
  id: UUID;
  key: string;
}
