import { Button } from "@lcaitool/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">灵创AI工具箱</h1>
        <p className="text-xl text-gray-600">专业场景AI工具集合平台</p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">立即开始</Button>
          <Button variant="outline" size="lg">了解更多</Button>
        </div>
      </div>
    </main>
  );
}
