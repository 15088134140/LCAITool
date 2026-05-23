# 充值支付流程简化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将充值流程简化为 4 个固定档位 + 自定义金额输入，所有充值在 `/pricing` 页一步完成，删除独立的 `/payment` 页面。

**Architecture:** 后端保持现有 Order/RechargePackage/PointTransaction 模型不变，修改种子数据为 PRD 的 4 个档位，新增一个合并创建订单+模拟支付的自定义充值端点和一个订单列表端点。前端完全重写 `/pricing` 页面为统一充值页，删除 `/payment` 页面及相关组件，更新所有入口链接。

**Tech Stack:** FastAPI (Python), Next.js 14 (React), TypeScript, Zustand, Tailwind CSS

---

### Task 1: 种子数据对齐 PRD 4个档位

**Files:**
- Modify: `apps/backend/app/seed_data.py:262-303`

- [ ] **Step 1: 替换 seed_packages() 为 PRD 4档位**

将原有的 5 个充值套餐（体验包 9.9 元 ~ 旗舰包 298 元）替换为 PRD 设计的 4 个档位：

```python
async def seed_packages(db: AsyncSession):
    """创建充值套餐（PRD 3.5.2 标准档位）"""
    packages = [
        RechargePackage(
            name="入门档", description="适合初次体验",
            original_price=30.00, sale_price=30.00,
            base_points=300, bonus_points=20, bonus_percentage=0,
            is_popular=False, sort_order=1, is_active=True,
        ),
        RechargePackage(
            name="进阶档", description="日常使用推荐",
            original_price=100.00, sale_price=100.00,
            base_points=1000, bonus_points=100, bonus_percentage=10,
            is_popular=True, sort_order=2, is_active=True,
        ),
        RechargePackage(
            name="专业档", description="高频用户首选",
            original_price=300.00, sale_price=300.00,
            base_points=3000, bonus_points=400, bonus_percentage=13,
            is_popular=True, sort_order=3, is_active=True,
        ),
        RechargePackage(
            name="企业档", description="团队/企业使用",
            original_price=1000.00, sale_price=1000.00,
            base_points=10000, bonus_points=2000, bonus_percentage=20,
            is_popular=False, sort_order=4, is_active=True,
        ),
    ]
    for pkg in packages:
        existing = await db.execute(
            select(RechargePackage).where(RechargePackage.name == pkg.name)
        )
        if not existing.scalar_one_or_none():
            db.add(pkg)
    await db.commit()
    print(f"  ✓ 已创建 {len(packages)} 个充值套餐")
```

注意：保留防重复逻辑（按 name 查询），确保多次运行不重复创建。

- [ ] **Step 2: 验证种子数据可运行**

```bash
cd apps/backend && python -m app.seed_data
```

Expected: 输出包含 `✓ 已创建 4 个充值套餐`

---

### Task 2: 后端新增自定义充值接口 + 订单列表接口

**Files:**
- Modify: `apps/backend/app/api/v1/endpoints/payment.py` (新增 2 个端点)
- Modify: `apps/backend/app/schemas/payment.py` (新增 2 个 schema)

- [ ] **Step 1: 在 schemas/payment.py 中追加 CustomRecharge 相关 schema**

在文件末尾追加：

```python
class CustomRechargeRequest(BaseModel):
    """自定义充值请求"""
    amount: float = Field(..., ge=1, le=100000, description="充值金额(元)，最小1，最大100000")
    payment_provider: PaymentProvider = Field(PaymentProvider.SIMULATED, description="支付方式")


class CustomRechargeResponse(BaseModel):
    """自定义充值响应"""
    success: bool
    order_no: str
    pay_amount: float
    total_points: int
    balance: float
    message: str = "充值成功"
```

- [ ] **Step 2: 在 payment.py 末尾添加自定义充值端点**

在 `get_transactions` 函数之后追加：

```python

# ============== 6. 自定义充值 API ==============

@router.post("/custom-recharge", summary="自定义充值（一步完成）")
async def custom_recharge(
    request: CustomRechargeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    自定义充值：
    - 输入金额(元)，按 1元=10积分 计算
    - 创建订单 → 模拟支付（同一事务）
    - 积分即时到账
    - 返回订单号和充值后余额
    """
    # 计算积分
    total_points = int(request.amount * 10)

    # 创建订单
    order = Order(
        user_id=current_user.id,
        order_no=PaymentService._generate_order_no(),
        pay_amount=float(request.amount),
        base_points=total_points,
        bonus_points=0,
        total_points=total_points,
        payment_provider=request.payment_provider,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    await db.flush()

    # 模拟支付（同一事务）
    result = await PaymentService.process_simulated_payment(db, order.id)

    # 获取更新后的用户余额
    await db.refresh(current_user)

    return CustomRechargeResponse(
        success=True,
        order_no=order.order_no,
        pay_amount=float(request.amount),
        total_points=total_points,
        balance=float(current_user.balance),
        message="充值成功"
    )
```

- [ ] **Step 3: 添加 import 语句更新**

在 `payment.py` 顶部 import 部分，给 `from app.schemas.payment import (...)` 块中追加：
- `CustomRechargeRequest`
- `CustomRechargeResponse`

以及在 `from app.models.payment import (...)` 中已导入 `Order` 和 `OrderStatus`（需要验证 `OrderStatus` 是否已导入 — 从当前代码看 `OrderStatus` 在 schemas 里，model 里也需要。确认 `from app.models.payment import` 是否包含 `OrderStatus`）。

检查当前 import 行：
```python
from app.schemas.payment import (
    CreateOrderRequest, CreateOrderResponse,
    RechargePackage, Order, PointTransaction, PaymentResponse,
    CustomRechargeRequest, CustomRechargeResponse  # 新增
)
```

- [ ] **Step 4: 在 payment.py 末尾添加用户订单列表端点**

```python

# ============== 7. 用户订单列表 API ==============

@router.get("/orders", summary="获取用户订单列表")
async def get_user_orders(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="订单状态: pending/paid/failed/refunded"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户的充值订单列表"""
    skip = (page - 1) * page_size
    order_status = None
    if status:
        try:
            order_status = OrderStatus(status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"无效的订单状态: {status}")

    orders, total = await PaymentService.get_user_orders(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        status=order_status
    )

    return {
        "items": [Order.model_validate(o) for o in orders],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
```

注意：这个端点与已有的 `GET /orders/{order_no}` 路径不冲突，因为带 path param 的优先级更高。

- [ ] **Step 5: 验证后端启动**

```bash
cd apps/backend && python -c "from app.api.v1.endpoints import payment; print('OK')"
```

---

### Task 3: 前端 paymentApi 新增 customRecharge 方法

**Files:**
- Modify: `apps/frontend-user/src/lib/api/modules/payment.ts`

- [ ] **Step 1: 在 paymentApi 对象中添加 customRecharge 方法**

```typescript
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
```

- [ ] **Step 2: 验证 TypeScript 编译无报错**

```bash
cd apps/frontend-user && npx tsc --noEmit
```

---

### Task 4: 重写 /pricing 页面为完整充值页

**Files:**
- Rewrite: `apps/frontend-user/src/app/pricing/page.tsx`

- [ ] **Step 1: 编写新的 pricing/page.tsx**

完整的 `pricing/page.tsx` 包含以下功能模块：

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import paymentApi from '@/lib/api/modules/payment';
import type { RechargePackage } from '@/lib/api/types';

interface CustomRechargeResult {
  success: boolean;
  order_no: string;
  pay_amount: number;
  total_points: number;
  balance: number;
  message: string;
}

// 常见问题数据
interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: '积分有有效期吗？',
    answer: '积分永久有效，无过期时间。您可以根据使用需求灵活充值，用多少充多少。'
  },
  {
    question: '可以申请退款吗？',
    answer: '充值后7天内，如未使用任何积分，可申请全额退款。已使用部分按实际消费结算，剩余部分可退还。退款将在5个工作日内原路返回。'
  },
  {
    question: '企业发票怎么开？',
    answer: '可以开具增值税普通发票和专用发票。企业用户可通过个人中心申请，或联系客服获取详细发票信息。'
  },
  {
    question: '支付失败怎么办？',
    answer: '如果支付失败，请检查支付方式是否正常，或尝试其他支付方式。如遇到技术问题，可联系客服协助解决。'
  }
];

export default function PricingPage() {
  const router = useRouter();
  const { user, refreshUserBalance } = useUserStore();
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomRechargeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    refreshUserBalance();
    loadPackages();
  }, [refreshUserBalance]);

  const loadPackages = async () => {
    try {
      const data = await paymentApi.getRechargePackages(true);
      setPackages(data.items || []);
      // 默认选中第一个热门档位
      const popular = data.items?.find(p => p.is_popular);
      if (popular) {
        setSelectedPackageId(popular.id);
      } else if (data.items?.length > 0) {
        setSelectedPackageId(data.items[0].id);
      }
    } catch (e) {
      console.error('加载充值档位失败', e);
    }
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  const payAmount = selectedPackage
    ? selectedPackage.sale_price
    : (parseFloat(customAmount) || 0);
  const isValidAmount = payAmount >= 1;
  const isCustomSelected = selectedPackageId === null;

  const handleSelectPackage = (id: string) => {
    setSelectedPackageId(id);
    setCustomAmount('');
    setResult(null);
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedPackageId(null);
    setResult(null);
    setError(null);
  };

  const handlePay = async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      if (selectedPackage) {
        // 选择档位：创建订单 → 模拟支付（两步）
        const order = await paymentApi.createOrder({
          recharge_package_id: selectedPackage.id,
          payment_provider: 'simulated' as any,
        });
        const payResult = await paymentApi.simulatePayment(order.order_no);
        await refreshUserBalance();
        setResult({
          success: true,
          order_no: order.order_no,
          pay_amount: selectedPackage.sale_price,
          total_points: selectedPackage.base_points + selectedPackage.bonus_points,
          balance: user?.balance ?? 0,
          message: '充值成功',
        });
      } else if (payAmount > 0) {
        // 自定义金额：一步完成
        const res = await paymentApi.customRecharge(payAmount);
        await refreshUserBalance();
        setResult({
          success: true,
          order_no: res.order_no,
          pay_amount: res.pay_amount,
          total_points: res.total_points,
          balance: res.balance,
          message: res.message,
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || '支付失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCustomAmount('');
    const popular = packages.find(p => p.is_popular);
    setSelectedPackageId(popular?.id || packages[0]?.id || null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] py-16 lg:py-24 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">积分充值</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            按量付费，透明划算，无订阅负担，想用就用
          </p>

          {/* 当前积分余额 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
            <div className="text-blue-100 text-sm mb-2">当前积分余额</div>
            <div className="text-5xl font-bold text-white mb-4">{user?.balance ?? 0}</div>
            <button
              onClick={() => router.push('/user-center/points')}
              className="w-full py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              积分明细
            </button>
          </div>
        </div>
      </section>

      {/* 充值档位选择 */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3 text-center">选择充值档位</h2>
          <p className="text-slate-600 text-center mb-12">所有档位积分永久有效，无过期时间</p>

          {/* 4个档位卡片 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {packages.map((pkg) => {
              const totalPoints = pkg.base_points + pkg.bonus_points;
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className={`relative card-hover bg-white rounded-2xl border p-6 cursor-pointer transition-all duration-250 flex flex-col ${
                    isSelected
                      ? 'border-[#2563EB] border-2 shadow-lg ring-4 ring-blue-100'
                      : 'border-slate-200'
                  }`}
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  {/* 热门标签 */}
                  {pkg.is_popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-5 py-1.5 rounded-full text-sm font-bold shadow-md bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white">
                        {pkg.name === '进阶档' ? '推荐' : '最划算'}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6 pt-3">
                    <h3 className="font-bold text-xl text-[#1E3A5F] mb-1">{pkg.name}</h3>
                    <p className="text-sm text-slate-600">{pkg.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-[#1E3A5F]">
                      ¥{pkg.sale_price.toFixed(0)}
                    </div>
                    <div className="text-slate-600 mt-1">
                      = {totalPoints} 积分
                      {pkg.bonus_points > 0 && (
                        <span className="text-xs text-green-600 ml-2">
                          (含赠送 {pkg.bonus_points})
                        </span>
                      )}
                    </div>
                    {pkg.bonus_percentage > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        额外赠送 {pkg.bonus_percentage}%
                      </div>
                    )}
                  </div>

                  <div className="flex-1" />

                  <button
                    className={`w-full py-3 rounded-xl font-semibold transition-colors mt-4 ${
                      isSelected
                        ? 'btn-primary text-white'
                        : 'border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white'
                    }`}
                  >
                    选择
                  </button>
                </div>
              );
            })}
          </div>

          {/* 自定义金额输入 */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 mb-8">
            <h3 className="font-bold text-lg text-[#1E3A5F] mb-4">自定义充值金额</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">¥</span>
                <input
                  type="number"
                  placeholder="输入金额"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  min="1"
                  max="100000"
                />
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              * 1元 = 10积分，自定义充值不享受额外赠送
            </p>
            {isCustomSelected && customAmount && parseFloat(customAmount) >= 1 && (
              <p className="text-sm text-blue-600 mt-1 font-medium">
                到账积分：{Math.floor(parseFloat(customAmount) * 10)}
              </p>
            )}
          </div>

          {/* 确认支付 / 结果展示 */}
          <div className="max-w-2xl mx-auto">
            {result ? (
              <div className="bg-white rounded-2xl border border-green-200 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2">充值成功</h3>
                <div className="text-slate-600 space-y-1 mb-6">
                  <p>订单号：{result.order_no}</p>
                  <p>充值金额：¥{result.pay_amount.toFixed(2)}</p>
                  <p>到账积分：{result.total_points}</p>
                  <p>当前余额：{result.balance} 积分</p>
                </div>
                <button
                  onClick={handleReset}
                  className="btn-primary px-8 py-3 text-white rounded-xl font-semibold"
                >
                  继续充值
                </button>
              </div>
            ) : (
              <>
                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* 支付按钮 */}
                <button
                  onClick={handlePay}
                  disabled={!isValidAmount || loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${
                    isValidAmount && !loading
                      ? 'btn-primary text-white hover:shadow-2xl'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      处理中...
                    </span>
                  ) : (
                    `立即支付 ¥${payAmount.toFixed(selectedPackage ? 0 : 2)}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="py-16 bg-white section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">安全保障与服务承诺</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: '银行级加密',
                description: 'SSL 256位加密传输，保障您的支付安全',
                icon: '🔒'
              },
              {
                title: '即时到账',
                description: '支付成功后，积分即时到账，无需等待',
                icon: '⚡'
              },
              {
                title: '未用可退',
                description: '7天内未使用余额可申请退款，无后顾之忧',
                icon: '💰'
              },
              {
                title: '专属客服',
                description: '7x24小时在线客服，随时解答您的疑问',
                icon: '💬'
              }
            ].map((item, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 常见问题 */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">常见问题</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-5 bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-[#1E3A5F]">{item.question}</span>
                  <svg className={`w-5 h-5 text-slate-600 transform transition-transform ${
                    openFaq === index ? 'rotate-180' : ''
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`mt-4 pt-4 border-t border-slate-200 text-slate-600 ${
                  openFaq === index ? 'block' : 'hidden'
                }`}>
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
```

关键设计点：
- 上部分：余额卡片 + "积分明细"链接到 `/user-center/points`
- 中间：4 个档位卡片从 `GET /payment/packages` 实时获取，选中态高亮
- 下方：自定义金额输入框，输入时实时显示到账积分（1元=10积分）
- 支付按钮：选择了档位就 2 步（createOrder → simulatePayment），自定义金额就 1 步（customRecharge）
- 成功后内嵌展示结果，不跳转页面，有"继续充值"按钮
- 安全保障和常见问题保留原有内容

---

### Task 5: 删除 /payment 页面和 RechargePackageCard 组件

**Files:**
- Delete: `apps/frontend-user/src/app/payment/page.tsx`
- Delete: `apps/frontend-user/src/components/payment/RechargePackageCard.tsx`
- Check: `apps/frontend-user/src/components/payment/` 目录是否还有其他文件

- [ ] **Step 1: 删除 payment/page.tsx**

```bash
rm apps/frontend-user/src/app/payment/page.tsx
```

- [ ] **Step 2: 删除 RechargePackageCard.tsx**

```bash
rm apps/frontend-user/src/components/payment/RechargePackageCard.tsx
```

- [ ] **Step 3: 检查 payment 目录是否还有文件，如为空可删除目录**

```bash
ls apps/frontend-user/src/components/payment/
```

如果该目录下没有其他文件，可以删除目录。

- [ ] **Step 4: 验证无引用错误**

```bash
cd apps/frontend-user && npx tsc --noEmit
```
如果报引用错误（比如其他地方还在 import RechargePackageCard），修复引用。

---

### Task 6: 更新所有 /payment → /pricing 链接

**Files:**
- Modify: `apps/frontend-user/src/app/user-center/points/page.tsx` (2处)
- Modify: `apps/frontend-user/src/app/orders/page.tsx` (1处)
- Modify: `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx` (1处)
- Modify: `apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx` (1处)
- Modify: `apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx` (1处)
- Modify: `apps/frontend-user/src/components/tool-detail/DialogMode.tsx` (1处)
- Modify: `apps/frontend-user/src/app/user-center/page.tsx` (2处)

- [ ] **Step 1: 搜索所有 `/payment` 引用**

```bash
cd apps/frontend-user && grep -rn "/payment" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "__pycache__"
```

确认引用列表，逐一替换为 `/pricing`。

- [ ] **Step 2: 替换 user-center/points/page.tsx 中的 2 处**

搜索文件中的 `/payment` 字符串，全部替换为 `/pricing`。

- [ ] **Step 3: 替换 orders/page.tsx 中的 1 处**

搜索文件中的 `/payment` 字符串，全部替换为 `/pricing`。

- [ ] **Step 4: 替换 4 个工具表单文件中的各 1 处**

分别替换 StorybookForm.tsx、EcommerceForm.tsx、MarketingForm.tsx、DialogMode.tsx 中的 `/payment` 为 `/pricing`。

- [ ] **Step 5: 替换 user-center/page.tsx 中的 2 处**

Line 128: `href="/user-center/points"` → `href="/pricing"`（"充值"按钮）
Line 256: `href="/user-center/points"` → `href="/pricing"`（"立即充值"按钮）

验证：确保 sidebar 中的"积分明细"菜单项（约 line 195-211）仍然链接到 `/user-center/points`，不改动。

- [ ] **Step 6: 验证编译通过**

```bash
cd apps/frontend-user && npx tsc --noEmit
```

---

### Task 7: 更新 E2E 测试适配新流程

**Files:**
- Modify: `apps/backend/tests/e2e/test_payment_flow.py`

- [ ] **Step 1: 更新测试用例**

读取当前测试文件，调整以下关键点：
- 等待 pricing 页面加载套餐列表（4个来自 API，不再是硬编码的 5 个）
- 选择档位后点击支付按钮（页面内完成，不再跳转到 /payment）
- 验证支付成功后的内嵌结果展示
- 验证自定义充值流程
- 验证余额刷新

- [ ] **Step 2: 运行 E2E 测试验证**

```bash
cd apps/backend && pytest tests/e2e/test_payment_flow.py -v
```

---

## 自检清单

1. **Spec 覆盖检查：**
   - 种子数据 4 个档位 → Task 1 ✓
   - 自定义充值端点 → Task 2 ✓
   - 订单列表端点 → Task 2 ✓
   - /pricing 页面重构 → Task 4 ✓
   - 删除 /payment 页面 → Task 5 ✓
   - 所有入口链接重定向 → Task 6 ✓

2. **占位符检查：** 所有代码块包含完整实现，无 TODO/TBD ✓
3. **类型一致性：** CustomRechargeRequest/CustomRechargeResponse 在 schema 中定义，后端端点使用，前端 API 也对应调用 ✓
