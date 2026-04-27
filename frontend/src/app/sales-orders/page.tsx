'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { SalesOrder, SalesOrderStatus, Warehouse, Product, PaginatedResponse } from '@/types';

interface SalesOrderItemForm {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    warehouseId: '',
    remark: '',
    items: [] as SalesOrderItemForm[],
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, warehousesResponse, productsResponse] = await Promise.all([
        api.get('/sales-orders', { params: filters }),
        api.get('/warehouses'),
        api.get('/products', { params: { pageSize: 100 } }),
      ]);

      const ordersData: PaginatedResponse<SalesOrder> = ordersResponse.data;
      setOrders(ordersData.data);
      setTotal(ordersData.total);
      setWarehouses(warehousesResponse.data);
      
      if (productsResponse.data.data) {
        setProducts(productsResponse.data.data);
      } else {
        setProducts(productsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: SalesOrderStatus): string => {
    const statusMap: Record<SalesOrderStatus, string> = {
      [SalesOrderStatus.DRAFT]: '草稿',
      [SalesOrderStatus.PENDING_APPROVAL]: '待审批',
      [SalesOrderStatus.APPROVED]: '已审批',
      [SalesOrderStatus.PENDING_SHIPMENT]: '待出库',
      [SalesOrderStatus.PARTIALLY_SHIPPED]: '部分出库',
      [SalesOrderStatus.COMPLETED]: '已完成',
      [SalesOrderStatus.CANCELLED]: '已取消',
    };
    return statusMap[status];
  };

  const getStatusBadgeClass = (status: SalesOrderStatus): string => {
    const badgeMap: Record<SalesOrderStatus, string> = {
      [SalesOrderStatus.DRAFT]: 'badge-default',
      [SalesOrderStatus.PENDING_APPROVAL]: 'badge-warning',
      [SalesOrderStatus.APPROVED]: 'badge-primary',
      [SalesOrderStatus.PENDING_SHIPMENT]: 'badge-warning',
      [SalesOrderStatus.PARTIALLY_SHIPPED]: 'badge-warning',
      [SalesOrderStatus.COMPLETED]: 'badge-success',
      [SalesOrderStatus.CANCELLED]: 'badge-default',
    };
    return badgeMap[status];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sales-orders', formData);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Failed to create order:', error);
      alert(error.response?.data?.error || '创建失败，请重试');
    }
  };

  const handleSubmitForApproval = async (order: SalesOrder) => {
    try {
      await api.post(`/sales-orders/${order.id}/submit`);
      fetchData();
    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('提交失败，请重试');
    }
  };

  const handleApprove = async (order: SalesOrder) => {
    try {
      await api.post(`/sales-orders/${order.id}/approve`);
      fetchData();
    } catch (error) {
      console.error('Failed to approve order:', error);
      alert('审批失败，请重试');
    }
  };

  const handleCancel = async (order: SalesOrder) => {
    if (!confirm('确定要取消这个销售订单吗？')) return;
    try {
      await api.post(`/sales-orders/${order.id}/cancel`);
      fetchData();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('取消失败，请重试');
    }
  };

  const handleViewDetail = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index] = { ...newItems[index], [field]: value, unitPrice: product.sellingPrice };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      warehouseId: '',
      remark: '',
      items: [],
    });
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  if (loading && orders.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">销售订单</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          + 新建销售单
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-item">
            <label className="form-label">状态</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">全部状态</option>
              <option value={SalesOrderStatus.DRAFT}>草稿</option>
              <option value={SalesOrderStatus.PENDING_APPROVAL}>待审批</option>
              <option value={SalesOrderStatus.APPROVED}>已审批</option>
              <option value={SalesOrderStatus.PENDING_SHIPMENT}>待出库</option>
              <option value={SalesOrderStatus.PARTIALLY_SHIPPED}>部分出库</option>
              <option value={SalesOrderStatus.COMPLETED}>已完成</option>
              <option value={SalesOrderStatus.CANCELLED}>已取消</option>
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

      {/* Orders Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">订单编号</th>
                  <th className="table-header-cell">客户名称</th>
                  <th className="table-header-cell">出库仓库</th>
                  <th className="table-header-cell">总金额</th>
                  <th className="table-header-cell">状态</th>
                  <th className="table-header-cell">创建人</th>
                  <th className="table-header-cell">创建时间</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-cell text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="table-row">
                      <td className="table-cell font-mono text-sm font-medium">{order.orderNo}</td>
                      <td className="table-cell">{order.customerName}</td>
                      <td className="table-cell">{order.warehouse.name}</td>
                      <td className="table-cell font-medium">¥{order.totalAmount.toFixed(2)}</td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="table-cell">{order.createdBy.name}</td>
                      <td className="table-cell text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetail(order)}
                            className="btn btn-secondary btn-sm"
                          >
                            详情
                          </button>
                          {order.status === SalesOrderStatus.DRAFT && (
                            <>
                              <button
                                onClick={() => handleSubmitForApproval(order)}
                                className="btn btn-primary btn-sm"
                              >
                                提交
                              </button>
                              <button
                                onClick={() => handleCancel(order)}
                                className="btn btn-danger btn-sm"
                              >
                                取消
                              </button>
                            </>
                          )}
                          {order.status === SalesOrderStatus.PENDING_APPROVAL && (
                            <button
                              onClick={() => handleApprove(order)}
                              className="btn btn-success btn-sm"
                            >
                              审批
                            </button>
                          )}
                        </div>
                      </td>
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

      {/* Create Order Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex-shrink-0">
              <h2 className="text-lg font-semibold">新建销售单</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">客户名称 *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">出库仓库 *</label>
                      <select
                        className="form-select"
                        value={formData.warehouseId}
                        onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                        required
                      >
                        <option value="">请选择仓库</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">联系电话</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">收货地址</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.customerAddress}
                        onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">备注</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={formData.remark}
                      onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    />
                  </div>

                  {/* Order Items */}
                  <div className="form-group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="form-label mb-0">商品明细</label>
                      <button
                        type="button"
                        onClick={addItem}
                        className="btn btn-primary btn-sm"
                      >
                        + 添加商品
                      </button>
                    </div>
                    {formData.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        暂无商品，请点击"添加商品"按钮
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <select
                                className="form-select"
                                value={item.productId}
                                onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                required
                              >
                                <option value="">请选择商品</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>{p.code} - {p.name} (售价: ¥{p.sellingPrice})</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                className="form-input"
                                placeholder="数量"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                required
                              />
                            </div>
                            <div className="w-32">
                              <input
                                type="number"
                                className="form-input"
                                placeholder="单价"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                required
                              />
                            </div>
                            <div className="w-24 text-right font-medium">
                              ¥{(item.quantity * item.unitPrice).toFixed(2)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.items.length > 0 && (
                      <div className="mt-4 text-right font-semibold text-lg">
                        总金额：¥{formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formData.items.length === 0}
                >
                  创建销售单
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">销售单详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">订单编号</label>
                    <p className="font-medium">{selectedOrder.orderNo}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <p>
                      <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">客户名称</label>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">出库仓库</label>
                    <p className="font-medium">{selectedOrder.warehouse.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建人</label>
                    <p>{selectedOrder.createdBy.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">创建时间</label>
                    <p>{new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                {selectedOrder.remark && (
                  <div>
                    <label className="text-sm text-gray-500">备注</label>
                    <p>{selectedOrder.remark}</p>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-3">商品明细</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">商品编码</th>
                          <th className="table-header-cell">商品名称</th>
                          <th className="table-header-cell">数量</th>
                          <th className="table-header-cell">已出库</th>
                          <th className="table-header-cell">单价</th>
                          <th className="table-header-cell">金额</th>
                        </tr>
                      </thead>
                      <tbody className="table-body">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="table-row">
                            <td className="table-cell font-mono text-sm">{item.product.code}</td>
                            <td className="table-cell">{item.product.name}</td>
                            <td className="table-cell">{item.quantity}</td>
                            <td className="table-cell">{item.shippedQuantity}</td>
                            <td className="table-cell">¥{item.unitPrice.toFixed(2)}</td>
                            <td className="table-cell font-medium">¥{item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-right text-xl font-semibold">
                  总金额：¥{selectedOrder.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
