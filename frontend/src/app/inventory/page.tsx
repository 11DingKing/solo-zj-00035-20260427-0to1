'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Inventory, Warehouse, Product, PaginatedResponse } from '@/types';
import { useUiStore } from '@/store/uiStore';
import { useDebounce } from '@/utils/debounce';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);
  
  // 本地输入状态，用于防抖
  const [localFilters, setLocalFilters] = useState({
    warehouseId: '',
    productName: '',
    lowStock: false,
  });

  // 防抖：500ms 后才更新用于搜索的 filters
  const debouncedProductName = useDebounce(localFilters.productName, 500);
  
  const { showGlobalLoading, hideGlobalLoading, showError } = useUiStore();

  // 仓库列表只加载一次
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // 当防抖后的搜索条件改变时，或者仓库ID/低库存选项改变时，触发搜索
  useEffect(() => {
    // 只有当仓库加载完成后才开始搜索库存
    if (warehousesLoaded) {
      fetchInventory();
    }
  }, [localFilters.warehouseId, localFilters.lowStock, debouncedProductName, warehousesLoaded]);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
      setWarehousesLoaded(true);
    } catch (error: any) {
      console.error('Failed to fetch warehouses:', error);
      showError(error.response?.data?.error || '获取仓库列表失败');
      setWarehousesLoaded(true); // 即使失败也标记为已加载
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory', {
        params: {
          warehouseId: localFilters.warehouseId,
          productName: debouncedProductName,
          lowStock: localFilters.lowStock,
          pageSize: 100,
        },
      });

      const inventoryData: PaginatedResponse<Inventory> = response.data;
      setInventory(inventoryData.data);
    } catch (error: any) {
      console.error('Failed to fetch inventory:', error);
      showError(error.response?.data?.error || '获取库存数据失败');
    } finally {
      setLoading(false);
    }
  }, [localFilters.warehouseId, localFilters.lowStock, debouncedProductName, showError]);

  const isLowStock = (item: Inventory): boolean => {
    return item.quantity < item.product.safetyStock;
  };

  if (loading && inventory.length === 0 && !warehousesLoaded) {
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
        <h1 className="text-2xl font-bold text-gray-800">库存查询</h1>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-item">
            <label className="form-label">仓库</label>
            <select
              className="form-select"
              value={localFilters.warehouseId}
              onChange={(e) => setLocalFilters({ ...localFilters, warehouseId: e.target.value })}
            >
              <option value="">全部仓库</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">商品名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="搜索商品名称（输入后自动搜索）"
              value={localFilters.productName}
              onChange={(e) => setLocalFilters({ ...localFilters, productName: e.target.value })}
            />
          </div>
          <div className="filter-item">
            <label className="form-label">低库存</label>
            <label className="flex items-center mt-1">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded"
                checked={localFilters.lowStock}
                onChange={(e) => setLocalFilters({ ...localFilters, lowStock: e.target.checked })}
              />
              <span className="ml-2 text-sm text-gray-700">仅显示低库存</span>
            </label>
          </div>
          <button
            onClick={fetchInventory}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      {/* Loading 提示 */}
      {loading && inventory.length > 0 && (
        <div className="text-center py-4 text-blue-600">
          <span className="inline-block animate-spin mr-2">⟳</span>
          搜索中...
        </div>
      )}

      {/* Inventory Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">商品编码</th>
                  <th className="table-header-cell">商品名称</th>
                  <th className="table-header-cell">规格</th>
                  <th className="table-header-cell">单位</th>
                  <th className="table-header-cell">仓库</th>
                  <th className="table-header-cell">当前库存</th>
                  <th className="table-header-cell">安全库存</th>
                  <th className="table-header-cell">成本价</th>
                  <th className="table-header-cell">售价</th>
                  <th className="table-header-cell">状态</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-cell text-center text-gray-500">
                      {loading ? '加载中...' : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell font-mono text-sm">{item.product.code}</td>
                      <td className="table-cell font-medium">{item.product.name}</td>
                      <td className="table-cell text-gray-500">{item.product.specification || '-'}</td>
                      <td className="table-cell">{item.product.unit}</td>
                      <td className="table-cell">{item.warehouse.name}</td>
                      <td className="table-cell">
                        <span className={isLowStock(item) ? 'text-red-600 font-semibold' : ''}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="table-cell">{item.product.safetyStock}</td>
                      <td className="table-cell">¥{item.product.costPrice.toFixed(2)}</td>
                      <td className="table-cell">¥{item.product.sellingPrice.toFixed(2)}</td>
                      <td className="table-cell">
                        {isLowStock(item) ? (
                          <span className="badge badge-danger">库存不足</span>
                        ) : (
                          <span className="badge badge-success">正常</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
