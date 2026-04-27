'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { InventoryTransaction, InventoryTransactionType, Warehouse, PaginatedResponse } from '@/types';

export default function InventoryTransactionsPage() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    warehouseId: '',
    type: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsResponse, warehousesResponse] = await Promise.all([
        api.get('/inventory/transactions', { params: filters }),
        api.get('/warehouses'),
      ]);

      const data: PaginatedResponse<InventoryTransaction> = transactionsResponse.data;
      setTransactions(data.data);
      setTotal(data.total);
      setWarehouses(warehousesResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: InventoryTransactionType): string => {
    const typeMap: Record<InventoryTransactionType, string> = {
      [InventoryTransactionType.PURCHASE_IN]: '采购入库',
      [InventoryTransactionType.SALES_OUT]: '销售出库',
      [InventoryTransactionType.TRANSFER_OUT]: '调拨出库',
      [InventoryTransactionType.TRANSFER_IN]: '调拨入库',
      [InventoryTransactionType.ADJUSTMENT]: '库存调整',
    };
    return typeMap[type];
  };

  const getTypeBadgeClass = (type: InventoryTransactionType): string => {
    const badgeMap: Record<InventoryTransactionType, string> = {
      [InventoryTransactionType.PURCHASE_IN]: 'badge-success',
      [InventoryTransactionType.SALES_OUT]: 'badge-danger',
      [InventoryTransactionType.TRANSFER_OUT]: 'badge-warning',
      [InventoryTransactionType.TRANSFER_IN]: 'badge-primary',
      [InventoryTransactionType.ADJUSTMENT]: 'badge-default',
    };
    return badgeMap[type];
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">库存流水</h1>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-item">
            <label className="form-label">仓库</label>
            <select
              className="form-select"
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value, page: 1 })}
            >
              <option value="">全部仓库</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">操作类型</label>
            <select
              className="form-select"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            >
              <option value="">全部类型</option>
              <option value={InventoryTransactionType.PURCHASE_IN}>采购入库</option>
              <option value={InventoryTransactionType.SALES_OUT}>销售出库</option>
              <option value={InventoryTransactionType.TRANSFER_OUT}>调拨出库</option>
              <option value={InventoryTransactionType.TRANSFER_IN}>调拨入库</option>
              <option value={InventoryTransactionType.ADJUSTMENT}>库存调整</option>
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">开始日期</label>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
            />
          </div>
          <div className="filter-item">
            <label className="form-label">结束日期</label>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
            />
          </div>
          <button
            onClick={fetchData}
            className="btn btn-primary"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">操作时间</th>
                  <th className="table-header-cell">操作类型</th>
                  <th className="table-header-cell">仓库</th>
                  <th className="table-header-cell">商品编码</th>
                  <th className="table-header-cell">商品名称</th>
                  <th className="table-header-cell">变动数量</th>
                  <th className="table-header-cell">操作前库存</th>
                  <th className="table-header-cell">操作后库存</th>
                  <th className="table-header-cell">操作人</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-cell text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="table-row">
                      <td className="table-cell text-gray-500">
                        {new Date(txn.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getTypeBadgeClass(txn.type)}`}>
                          {getTypeLabel(txn.type)}
                        </span>
                      </td>
                      <td className="table-cell">{txn.warehouse.name}</td>
                      <td className="table-cell font-mono text-sm">{txn.product.code}</td>
                      <td className="table-cell font-medium">{txn.product.name}</td>
                      <td className="table-cell">
                        <span className={
                          txn.type === InventoryTransactionType.SALES_OUT || 
                          txn.type === InventoryTransactionType.TRANSFER_OUT
                            ? 'text-red-600'
                            : 'text-green-600'
                        }>
                          {
                            txn.type === InventoryTransactionType.SALES_OUT || 
                            txn.type === InventoryTransactionType.TRANSFER_OUT
                              ? `-${txn.quantity}`
                              : `+${txn.quantity}`
                          }
                        </span>
                      </td>
                      <td className="table-cell">{txn.beforeQuantity}</td>
                      <td className="table-cell">{txn.afterQuantity}</td>
                      <td className="table-cell">{txn.operator.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                共 <span className="font-medium">{total}</span> 条记录
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="btn btn-secondary btn-sm"
              >
                上一页
              </button>
              <span className="text-sm text-gray-700">
                第 {filters.page} 页 / 共 {totalPages} 页
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= totalPages}
                className="btn btn-secondary btn-sm"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
