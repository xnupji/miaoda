import type { ReactNode } from 'react';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// 懒加载页面组件
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MiningPage = lazy(() => import('./pages/MiningPage'));
const InvitationPage = lazy(() => import('./pages/InvitationPage'));
const MasterNodePage = lazy(() => import('./pages/MasterNodePage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const InteractionCenterPage = lazy(() => import('./pages/InteractionCenterPage'));
const CustomerServicePage = lazy(() => import('./pages/CustomerServicePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '仪表盘',
    path: '/',
    element: <DashboardPage />,
  },
  {
    name: '挖矿记录',
    path: '/mining',
    element: <MiningPage />,
  },
  {
    name: '邀请好友',
    path: '/invitation',
    element: <InvitationPage />,
  },
  {
    name: '主节点',
    path: '/master-node',
    element: <MasterNodePage />,
  },
  {
    name: '交易记录',
    path: '/transactions',
    element: <TransactionsPage />,
  },
  {
    name: '钱包管理',
    path: '/wallet',
    element: <WalletPage />,
  },
  {
    name: '交互中心',
    path: '/interaction',
    element: <InteractionCenterPage />,
  },
  {
    name: '客服中心',
    path: '/customer-service',
    element: <CustomerServicePage />,
  },
  {
    name: '管理后台',
    path: '/admin',
    element: <AdminPage />,
  },
  {
    name: '设置',
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    name: '搜索',
    path: '/search',
    element: <SearchPage />,
    visible: false, // Hidden from auto-generated menus if needed, but we'll add it manually to MainLayout
  },
  {
    name: '登录',
    path: '/login',
    element: <LoginPage />,
    visible: false,
  },
];

export default routes;
