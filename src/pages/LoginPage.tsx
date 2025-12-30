import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '', invitationCode: '' });
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');

  const from = (location.state as { from?: string })?.from || '/';

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    if (code) {
      setRegisterForm(prev => ({ ...prev, invitationCode: code }));
      setActiveTab('register');
    }
  }, [location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.username || !loginForm.password) {
      toast.error('请填写用户名和密码');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginForm.username, loginForm.password);
    setIsLoading(false);

    if (error) {
      let errorMessage = error.message;
      if (errorMessage.includes('Email not confirmed')) {
        errorMessage = '注册邮箱尚未验证，请前往邮箱确认，或联系管理员处理';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = '用户名或密码错误';
      }
      toast.error('登录失败：' + errorMessage);
    } else {
      toast.success('登录成功！');
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerForm.username || !registerForm.password) {
      toast.error('请填写用户名和密码');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error('密码长度至少为6位');
      return;
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
      toast.error('用户名只能包含字母、数字和下划线');
      return;
    }

    setIsLoading(true);
    const { data, error } = await signUp(
      registerForm.username,
      registerForm.password,
      registerForm.invitationCode || undefined
    );
    setIsLoading(false);

    if (error) {
      toast.error('注册失败：' + error.message);
    } else {
      toast.success('注册成功！');
      
      // 如果注册返回了 session，说明不需要邮箱验证，直接跳转
      if (data?.session) {
        navigate(from, { replace: true });
      } else {
        // 否则可能还是需要验证，或者虽然没有 session 但我们尝试自动登录
        // 注意：如果后台关了验证，signUp 会直接返回 session。
        // 如果后台开了验证，signUp 返回 user 但 session 为 null。
        // 为了兼容，如果 session 存在直接跳转。如果不存在，尝试自动登录（可能会失败如果需要验证）
        
        // 尝试自动登录（作为 fallback）
        try {
            await signIn(registerForm.username, registerForm.password);
            navigate(from, { replace: true });
        } catch (e) {
            // 忽略错误，可能需要邮箱验证
             toast.warning('注册成功但登录受限。请检查后台是否关闭了邮箱验证并启用了 Email Provider。');
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-chart-3/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <Card className="w-full max-w-md relative z-10 glow-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">HTP挖矿平台</CardTitle>
          <CardDescription>基于BSC区块链的去中心化挖矿平台</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">用户名</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full hover-glow" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登录
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">用户名</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="字母、数字、下划线"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">密码</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="至少6位"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">确认密码</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invitation-code">邀请码（可选）</Label>
                  <Input
                    id="invitation-code"
                    type="text"
                    placeholder="如有邀请码请输入"
                    value={registerForm.invitationCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, invitationCode: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full hover-glow" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
