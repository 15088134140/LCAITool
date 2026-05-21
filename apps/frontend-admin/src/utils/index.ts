// 格式化日期（支持秒级时间戳和毫秒级时间戳）
export const formatDate = (date: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  // 如果是数字且小于1e12（2001-09-09），则视为秒级时间戳，转换为毫秒
  const timestamp = typeof date === 'number' && date < 1000000000000 ? date * 1000 : date;
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// 格式化手机号
export const formatPhone = (phone: string) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

// 格式化金额
export const formatMoney = (amount: number, decimals = 2) => {
  return amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 防抖
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// 生成随机颜色（用于头像）
export const getRandomColor = (str: string) => {
  const colors = [
    '#1E3A5F',
    '#059669',
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#EF4444',
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 获取订单状态文本和颜色
export const getOrderStatusInfo = (status: string) => {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: '待支付', color: '#F59E0B', bgColor: '#FEF3C7' },
    paid: { label: '已支付', color: '#059669', bgColor: '#D1FAE5' },
    failed: { label: '支付失败', color: '#EF4444', bgColor: '#FEE2E2' },
    refunded: { label: '已退款', color: '#6B7280', bgColor: '#F3F4F6' },
    expired: { label: '已过期', color: '#9CA3AF', bgColor: '#F3F4F6' },
  };
  return statusMap[status] || { label: status, color: '#6B7280', bgColor: '#F3F4F6' };
};

// 获取支付方式文本
export const getPaymentProviderText = (provider: string) => {
  const providerMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    simulated: '模拟支付',
  };
  return providerMap[provider] || provider;
};

// 获取用户状态文本和颜色
export const getUserStatusInfo = (status: number) => {
  return status === 1
    ? { label: '正常', color: '#059669', bgColor: '#D1FAE5' }
    : { label: '禁用', color: '#EF4444', bgColor: '#FEE2E2' };
};

// 获取认证状态文本和颜色
export const getVerificationStatusInfo = (verified: boolean) => {
  return verified
    ? { label: '已认证', color: '#059669', bgColor: '#D1FAE5' }
    : { label: '未认证', color: '#6B7280', bgColor: '#F3F4F6' };
};

// 获取交易类型文本
export const getTransactionTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    recharge: '充值',
    consume: '消费',
    refund: '退款',
    adjust: '调整',
    freeze: '冻结',
    unfreeze: '解冻',
  };
  return typeMap[type] || type;
};

// 复制到剪贴板
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
};
