import {
  HeroSection,
  BenchmarkTools,
  CategoryGrid,
  SectionPlaceholder,
} from '../components/home';

export default function Home() {
  return (
    <>
      <HeroSection />
      <BenchmarkTools />
      <CategoryGrid />
      <SectionPlaceholder
        title="新工具 & 热门推荐"
        description="最新上线和用户最爱的AI工具，持续更新中..."
      />
      <SectionPlaceholder
        title="用户共创"
        description="参与投票，决定下一个工具的开发方向，让你的声音被听见"
      />
      <SectionPlaceholder
        title="用户评价"
        description="来自真实用户的使用体验和效果反馈"
      />
    </>
  );
}
