/**
 * 工具详情页 - 样式对比验证脚本
 *
 * 验证项目列表：
 * 1. 页面背景动画 (page-bg-animated)
 * 2. 面包屑导航样式
 * 3. ToolHero 组件布局与样式
 * 4. ToolCreationForm 表单模式样式
 * 5. ToolFeatures 功能卡片样式
 * 6. ToolHowTo 使用步骤与进度示例
 * 7. ToolPricing 三卡片定价布局
 * 8. ToolReviews 评价展示样式
 * 9. 底部CTA按钮样式
 * 10. 响应式布局适配
 */

// 运行命令: node apps/frontend-user/tests/tool-detail-validation.js

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  工具详情页样式对比验证');
console.log('========================================\n');

// 检查文件是否存在
const filesToCheck = [
  'apps/frontend-user/src/components/tool-detail/ToolHero.tsx',
  'apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx',
  'apps/frontend-user/src/components/tool-detail/ToolFeatures.tsx',
  'apps/frontend-user/src/components/tool-detail/ToolHowTo.tsx',
  'apps/frontend-user/src/components/tool-detail/ToolPricing.tsx',
  'apps/frontend-user/src/components/tool-detail/ToolReviews.tsx',
  'apps/frontend-user/src/app/tools/storybook-generator/page.tsx',
  'apps/frontend-user/src/app/globals.css',
];

let allFilesExist = true;
filesToCheck.forEach((file) => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n');

if (!allFilesExist) {
  console.log('❌ 部分文件缺失，请检查项目结构');
  process.exit(1);
}

// 验证每个组件的关键样式
const validations = [
  {
    name: 'ToolHero - 左右分栏布局',
    file: 'apps/frontend-user/src/components/tool-detail/ToolHero.tsx',
    checks: [
      { pattern: /grid.*lg:grid-cols-2/, desc: '两栏网格布局' },
      { pattern: /sticky.*top-24/, desc: '左侧图片固定定位' },
      { pattern: /rounded-2xl.*overflow-hidden.*shadow-2xl/, desc: '主图片圆角阴影' },
      { pattern: /badge-hot|badge-new/, desc: '热门/新品徽章样式' },
      { pattern: /grid.*grid-cols-3.*gap-4/, desc: '快速统计三栏布局' },
      { pattern: /bg-white.*rounded-2xl.*border.*border-gray-200/, desc: '定价预览卡片样式' },
      { pattern: /bg-gradient-to-r.*from-green-600.*to-green-500/, desc: '主按钮渐变样式' },
    ],
  },
  {
    name: 'ToolCreationForm - 创作表单',
    file: 'apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx',
    checks: [
      { pattern: /py-20.*bg-(gray-50|\[#F8FAFC\])/, desc: '表单区域背景和内边距' },
      { pattern: /bg-white.*p-2.*rounded-2xl.*border.*border-gray-200/, desc: '模式切换容器样式' },
      { pattern: /lg:col-span-2[\s\S]*lg:col-span-1/, desc: '三栏表单布局' },
      { pattern: /sticky.*top-24.*shadow-xl/, desc: '右侧费用预估吸顶样式' },
      { pattern: /bg-gradient-to-r.*from-green-600.*to-green-500/, desc: '生成按钮渐变样式' },
      { pattern: /fixed.*inset-0.*bg-black.*flex.*items-center.*justify-center/, desc: '进度弹窗布局' },
    ],
  },
  {
    name: 'ToolFeatures - 功能卡片',
    file: 'apps/frontend-user/src/components/tool-detail/ToolFeatures.tsx',
    checks: [
      { pattern: /flex.*items-center.*gap-3.*mb-10/, desc: '标题图标组合布局' },
      { pattern: /bg-gradient-to-br.*from-pink-500.*to-rose-600/, desc: '标题图标渐变背景' },
      { pattern: /grid.*md:grid-cols-2.*lg:grid-cols-3.*gap-6/, desc: '三栏功能卡片布局' },
      { pattern: /bg-white.*rounded-2xl.*border.*border-gray-200.*transition-all.*hover:border-blue-500.*hover:shadow-lg/, desc: '功能卡片悬浮效果' },
      { pattern: /md:grid-cols-4.*gap-4/, desc: '适用场景四栏布局' },
    ],
  },
  {
    name: 'ToolHowTo - 使用步骤',
    file: 'apps/frontend-user/src/components/tool-detail/ToolHowTo.tsx',
    checks: [
      { pattern: /flex.*items-center.*gap-3.*mb-10/, desc: '标题图标组合布局' },
      { pattern: /bg-gradient-to-br.*from-green-500.*to-emerald-600/, desc: '标题图标渐变背景' },
      { pattern: /grid.*md:grid-cols-3.*gap-8.*mb-12/, desc: '三栏步骤卡片布局' },
      { pattern: /bg-white.*rounded-2xl.*p-8.*border.*border-gray-200.*text-center/, desc: '步骤卡片样式' },
      { pattern: /space-y-6/, desc: '进度示例间距' },
      { pattern: /w-10.*h-10.*rounded-full/, desc: '进度图标样式' },
    ],
  },
  {
    name: 'ToolPricing - 三卡片定价',
    file: 'apps/frontend-user/src/components/tool-detail/ToolPricing.tsx',
    checks: [
      { pattern: /flex.*items-center.*gap-3.*mb-10/, desc: '标题图标组合布局' },
      { pattern: /bg-gradient-to-br.*from-amber-500.*to-orange-600/, desc: '标题图标渐变背景' },
      { pattern: /grid.*md:grid-cols-3.*gap-8/, desc: '三栏定价卡片布局' },
      { pattern: /bg-gradient-to-br.*from-green-50.*to-emerald-50/, desc: '推荐卡片特殊背景' },
      { pattern: /border-2.*border-green-600/, desc: '推荐卡片边框样式' },
      { pattern: /absolute.*-top-3.*left-1\/2.*-translate-x-1\/2/, desc: '推荐徽章定位' },
    ],
  },
  {
    name: 'ToolReviews - 用户评价',
    file: 'apps/frontend-user/src/components/tool-detail/ToolReviews.tsx',
    checks: [
      { pattern: /flex.*items-center.*gap-3.*mb-10/, desc: '标题图标组合布局' },
      { pattern: /bg-gradient-to-br.*from-blue-500.*to-blue-600/, desc: '标题图标渐变背景' },
      { pattern: /grid.*md:grid-cols-2.*gap-6/, desc: '两栏评价卡片布局' },
      { pattern: /bg-white.*rounded-2xl.*p-6.*border.*border-gray-200/, desc: '评价卡片样式' },
    ],
  },
  {
    name: 'Storybook Page - 页面整体结构',
    file: 'apps/frontend-user/src/app/tools/storybook-generator/page.tsx',
    checks: [
      { pattern: /page-bg-animated.*min-h-screen.*bg-\[#F8FAFC\]/, desc: '页面背景动画类' },
      { pattern: /py-6|py-4/, desc: '面包屑容器样式' },
      { pattern: /bg-gradient-to-br.*from-green-600.*to-green-500/, desc: '底部CTA渐变背景' },
    ],
  },
  {
    name: 'Global CSS - 全局样式',
    file: 'apps/frontend-user/src/app/globals.css',
    checks: [
      { pattern: /\.page-bg-animated.*\{/, desc: '页面背景动画类定义' },
      { pattern: /@keyframes blobFloat[123]/, desc: '背景blob动画关键帧' },
      { pattern: /\.gradient-text.*\{/, desc: '渐变文字样式' },
      { pattern: /\.feature-card.*\{/, desc: '功能卡片样式' },
      { pattern: /\.step-card.*\{/, desc: '步骤卡片样式' },
      { pattern: /\.pricing-card.*\{/, desc: '定价卡片样式' },
      { pattern: /\.review-card.*\{/, desc: '评价卡片样式' },
      { pattern: /\.badge-hot.*\{/, desc: '热门徽章样式' },
      { pattern: /@media.*prefers-reduced-motion.*reduce/, desc: '减少动画偏好设置' },
    ],
  },
];

let totalChecks = 0;
let passedChecks = 0;

validations.forEach((validation) => {
  console.log(`📋 ${validation.name}`);
  const content = fs.readFileSync(validation.file, 'utf-8');

  validation.checks.forEach((check) => {
    totalChecks++;
    const passed = check.pattern.test(content);
    if (passed) passedChecks++;
    console.log(`  ${passed ? '✅' : '❌'} ${check.desc}`);
  });

  console.log('');
});

console.log('========================================');
console.log(`  测试结果: ${passedChecks}/${totalChecks} 项通过`);
console.log(`  通过率: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log('========================================\n');

if (passedChecks === totalChecks) {
  console.log('🎉 所有样式验证通过！');
  console.log('');
  console.log('📝 手动验证步骤：');
  console.log('  1. 访问 http://localhost:3000/tools/storybook-generator');
  console.log('  2. 对比设计稿 docs/design/tool-detail.html');
  console.log('  3. 检查以下视觉元素：');
  console.log('     - 背景色是否为 #F8FAFC');
  console.log('     - 背景blob动画是否正常显示');
  console.log('     - 所有卡片圆角、阴影是否一致');
  console.log('     - 渐变按钮颜色是否正确');
  console.log('     - 响应式布局在不同屏幕尺寸下的表现');
} else {
  console.log('⚠️  部分验证未通过，请检查上述 ❌ 标记的项目');
  process.exit(1);
}
