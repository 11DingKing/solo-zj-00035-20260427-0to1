'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { DashboardSummary, DashboardTrends, Inventory, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface ChartData {
  month: string;
  采购: number;
  销售: number;
  利润: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const getRoleLabel = (role: UserRole): string => {
    const roleMap: Record<UserRole, string> = {
      [UserRole.ADMIN]: '系统管理员',
      [UserRole.WAREHOUSE_MANAGER]: '仓库管理员',
      [UserRole.PURCHASER]: '采购员',
      [UserRole.FINANCE]: '财务',
    };
    return roleMap[role];
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const [summaryResponse, trendsResponse] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/trends'),
        ]);
        
        setSummary(summaryResponse.data);
        
        const trendData: DashboardTrends = trendsResponse.data;
        const chartData: ChartData[] = trendData.purchaseTrends.map((item, index) => ({
          month: item.month,
          采购: item.amount,
          销售: trendData.salesTrends[index]?.amount || 0,
          利润: trendData.profitTrends[index]?.amount || 0,
        }));
        
        setTrends(chartData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">欢迎回来，{user?.name}！</h1>
        <p className="text-blue-100">您的角色：{user?.role && getRoleLabel(user.role)}</p>
        <p className="text-blue-100 mt-1">今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      {/* Low Stock Alert */}
      {summary?.lowStockItemsCount && summary.lowStockItemsCount > 0 && (
        <div className="alert alert-danger">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <p className="font-semibold">库存预警</p>
              <p className="text-sm">有 {summary.lowStockItemsCount} 个商品库存低于安全库存量，请及时处理。</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-title">本月采购总额</p>
              <p className="stats-card-value text-blue-600">
                {summary ? formatCurrency(summary.monthlyPurchaseAmount) : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-title">本月销售总额</p>
              <p className="stats-card-value text-green-600">
                {summary ? formatCurrency(summary.monthlySalesAmount) : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-title">本月毛利润</p>
              <p className="stats-card-value text-purple-600">
                {summary ? formatCurrency(summary.grossProfit) : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-title">应付账款余额</p>
              <p className="stats-card-value text-orange-600">
                {summary ? formatCurrency(summary.totalPayables) : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-title">应收账款余额</p>
              <p className="stats-card-value text-teal-600">
                {summary ? formatCurrency(summary.totalReceivables) : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💵</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-800">近12个月采购/销售/利润趋势</h2>
        </div>
        <div className="card-body">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend />
                <Line type="monotone" dataKey="采购" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="销售" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                <Line type="monotone" dataKey="利润" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {summary?.lowStockItems && summary.lowStockItems.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-800">低库存商品列表</h2>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">商品编码</th>
                    <th className="table-header-cell">商品名称</th>
                    <th className="table-header-cell">规格</th>
                    <th className="table-header-cell">单位</th>
                    <th className="table-header-cell">当前库存</th>
                    <th className="table-header-cell">安全库存</th>
                    <th className="table-header-cell">所在仓库</th>
                    <th className="table-header-cell">状态</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {summary.lowStockItems.map((item: Inventory) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell font-mono text-sm">{item.product.code}</td>
                      <td className="table-cell font-medium">{item.product.name}</td>
                      <td className="table-cell text-gray-500">{item.product.specification || '-'}</td>
                      <td className="table-cell">{item.product.unit}</td>
                      <td className="table-cell">
                        <span className="text-red-600 font-semibold">{item.quantity}</span>
                      </td>
                      <td className="table-cell">{item.product.safetyStock}</td>
                      <td className="table-cell">{item.warehouse.name}</td>
                      <td className="table-cell">
                        <span className="badge badge-danger">库存不足</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
