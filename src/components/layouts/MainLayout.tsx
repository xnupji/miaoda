import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/button';
import { Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Pickaxe,
  Users,
  Network,
  History,
  Wallet,
  Settings,
  LogOut,
  Menu,
  Sparkles,
  Shield,
  ChevronRight,
  ArrowRightLeft,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '仪表盘', icon: Home },
  { path: '/mining', label: '挖矿记录', icon: Pickaxe },
  { path: '/invitation', label: '邀请好友', icon: Users },
  { path: '/master-node', label: '主节点', icon: Network },
  { path: '/interaction', label: '交互中心', icon: ArrowRightLeft },
  { path: '/transactions', label: '交易记录', icon: History },
  { path: '/wallet', label: '钱包管理', icon: Wallet },
  { path: '/search', label: '数据库搜索', icon: Sparkles },
  { path: '/HTP_Whitepaper.md', label: '白皮书', icon: FileText, external: true },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { account, isConnected, connectWallet } = useWeb3();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-sidebar-primary" />
          <span className="text-xl font-bold text-sidebar-foreground">HTP挖矿</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.external) {
            return (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover-glow',
                  'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </a>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover-glow',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover-glow',
                location.pathname.startsWith('/admin')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Shield className="w-5 h-5" />
              <span>管理后台</span>
              {location.pathname.startsWith('/admin') && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/30">
          <Avatar>
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.username}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {profile?.role === 'admin' ? '管理员' : profile?.is_master_node ? '主节点' : '普通用户'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* 桌面侧边栏 */}
      <aside className="hidden lg:block w-64 shrink-0 bg-sidebar-background border-r border-sidebar-border">
        <NavContent />
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
            {/* 移动端菜单按钮 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar-background">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Main navigation menu</SheetDescription>
                </SheetHeader>
                <NavContent />
              </SheetContent>
            </Sheet>

            {/* 余额显示 */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/50 glow-border">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {profile?.htp_balance?.toFixed(2) || '0.00'} HTP
                </span>
              </div>

              {/* 钱包连接按钮 */}
              {!isConnected ? (
                <Button onClick={connectWallet} variant="outline" size="sm" className="hover-glow">
                  <Wallet className="w-4 h-4 mr-2" />
                  连接钱包
                </Button>
              ) : (
                <Badge variant="secondary" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </Badge>
              )}

              {/* 用户菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.role === 'admin' ? '管理员' : profile?.is_master_node ? '主节点' : '普通用户'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    设置
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
