import {
  HeroSection,
  BenchmarkTools,
  CategoryGrid,
  NewAndHotTools,
  VoteSection,
  StatsAndTestimonials,
  EnterpriseServices,
  CTASection,
} from '../components/home';

export default function Home() {
  return (
    <>
      <HeroSection />
      <BenchmarkTools />
      <CategoryGrid />
      <NewAndHotTools />
      <VoteSection />
      <StatsAndTestimonials />
      <EnterpriseServices />
      <CTASection />
    </>
  );
}
