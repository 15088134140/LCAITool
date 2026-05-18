import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@lcaitool/ui";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">灵创AI工具箱 - 管理后台</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>用户管理</CardTitle>
              <CardDescription>管理平台用户和权限</CardDescription>
            </CardHeader>
            <CardContent>
              <Button>查看用户</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>工具管理</CardTitle>
              <CardDescription>管理AI工具配置</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
