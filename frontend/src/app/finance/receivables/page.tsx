'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AccountsReceivable, PaymentStatus, PaginatedResponse } from '@/types';

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountsReceivable | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    customerName: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: '',
    paymentReference: '',
    remark: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/finance/receivables', { params: filters });
      const data: PaginatedResponse<AccountsReceivable> = response.data;
      setReceivables(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: PaymentStatus): string => {
    const statusMap: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: '待收款',
      [PaymentStatus.PARTIALLY_PAID]: '部分收款',
      [PaymentStatus.FULLY_PAID]: '已收清',
    };
    return statusMap[status];
  };

  const getStatusBadgeClass = (status: PaymentStatus): string => {
    const badgeMap: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'badge-warning',
      [PaymentStatus.PARTIALLY_PAID]: 'badge-primary',
      [PaymentStatus.FULLY_PAID]: 'badge-success',
    };
    return badgeMap[status];
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    
    if (paymentForm.amount > selectedReceivable.remainingAmount) {
      alert('收款金额不能超过剩余应收金额');
      return;
    }
    if (paymentForm.amount <= 0) {
      alert('收款金额必须大于0');
      return;
    }

    try {
      await api.post(`/finance/receivables/${selectedReceivable.id}/receive`, {
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod || undefined,
        paymentReference: paymentForm.paymentReference || undefined,
        remark: paymentForm.remark || undefined,
      });
      setShowPaymentModal(false);
      resetPaymentForm();
      fetchData();
    } catch (error: any) {
      console.error('Failed to receive payment:', error);
      alert(error.response?.data?.error || '收款失败，请重试');
    }
  };

  const handleViewDetail = (receivable: AccountsReceivable) => {
    setSelectedReceivable(receivable);
    setShowDetailModal(true);
  };

  const handleOpenPayment = (receivable: AccountsReceivable) => {
    if (receivable.status === PaymentStatus.FULLY_PAID) {
      alert('该笔账款已全部收清');
      return;
    }
    setSelectedReceivable(receivable);
    setPaymentForm({
      amount: receivable.remainingAmount,
      paymentMethod: '',
      paymentReference: '',
      remark: '',
    });
    setShowPaymentModal(true);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      paymentMethod: '',
      paymentReference: '',
      remark: '',
    });
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  if (loading && receivables.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">应收账款</h1>
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
              <option value={PaymentStatus.PENDING}>待收款</option>
              <option value={PaymentStatus.PARTIALLY_PAID}>部分收款</option>
              <option value={PaymentStatus.FULLY_PAID}>已收清</option>
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">客户名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="搜索客户"
              value={filters.customerName}
              onChange={(e) => setFilters({ ...filters, customerName: e.target.value, page: 1 })}
            />
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

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">凭证编号</th>
                  <th className="table-header-cell">客户名称</th>
                  <th className="table-header-cell">关联销售单</th>
                  <th className="table-header-cell">总金额</th>
                  <th className="table-header-cell">已收款</th>
                  <th className="table-header-cell">剩余金额</th>
                  <th className="table-header-cell">状态</th>
                  <th className="table-header-cell">创建时间</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-cell text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  receivables.map((receivable) => (
                    <tr key={receivable.id} className="table-row">
                      <td className="table-cell font-mono text-sm font-medium">{receivable.voucherNo}</td>
                      <td className="table-cell">{receivable.customerName}</td>
                      <td className="table-cell text-gray-500">
                        {receivable.salesOrder ? receivable.salesOrder.orderNo : '-'}
                      </td>
                      <td className="table-cell font-medium">¥{receivable.totalAmount.toFixed(2)}</td>
                      <td className="table-cell text-green-600">¥{receivable.receivedAmount.toFixed(2)}</td>
                      <td className="table-cell text-red-600 font-medium">¥{receivable.remainingAmount.toFixed(2)}</td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusBadgeClass(receivable.status)}`}>
                          {getStatusLabel(receivable.status)}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {new Date(receivable.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetail(receivable)}
                            className="btn btn-secondary btn-sm"
                          >
                            详情
                          </button>
                          {receivable.status !== PaymentStatus.FULLY_PAID && (
                            <button
                              onClick={() => handleOpenPayment(receivable)}
                              className="btn btn-primary btn-sm"
                            >
                              收款
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

      {/* Receive Payment Modal */}
      {showPaymentModal && selectedReceivable && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">收款</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleReceive}>
              <div className="modal-body">
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">总金额</p>
                        <p className="font-semibold">¥{selectedReceivable.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">已收款</p>
                        <p className="font-semibold text-green-600">¥{selectedReceivable.receivedAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">剩余应收</p>
                        <p className="font-semibold text-red-600">¥{selectedReceivable.remainingAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">收款金额 *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedReceivable.remainingAmount}
                      className="form-input"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">收款方式</label>
                      <select
                        className="form-select"
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      >
                        <option value="">请选择</option>
                        <option value="bank_transfer">银行转账</option>
                        <option value="cash">现金</option>
                        <option value="check">支票</option>
                        <option value="alipay">支付宝</option>
                        <option value="wechat">微信</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">交易凭证号</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="请输入凭证号（可选）"
                        value={paymentForm.paymentReference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">备注</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={paymentForm.remark}
                      onChange={(e) => setPaymentForm({ ...paymentForm, remark: e.target.value })}
                      placeholder="请输入备注（可选）"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={paymentForm.amount <= 0 || paymentForm.amount > selectedReceivable.remainingAmount}
                >
                  确认收款
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReceivable && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">应收账款详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">凭证编号</label>
                    <p className="font-medium">{selectedReceivable.voucherNo}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <p>
                      <span className={`badge ${getStatusBadgeClass(selectedReceivable.status)}`}>
                        {getStatusLabel(selectedReceivable.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">客户名称</label>
                    <p className="font-medium">{selectedReceivable.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">关联销售单</label>
                    <p>{selectedReceivable.salesOrder ? selectedReceivable.salesOrder.orderNo : '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">总金额</p>
                    <p className="text-xl font-semibold">¥{selectedReceivable.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">已收款</p>
                    <p className="text-xl font-semibold text-green-600">¥{selectedReceivable.receivedAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">剩余金额</p>
                    <p className="text-xl font-semibold text-red-600">¥{selectedReceivable.remainingAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Payment Records */}
                {selectedReceivable.paymentRecords && selectedReceivable.paymentRecords.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">收款记录</h3>
                    <div className="table-container">
                      <table className="table">
                        <thead className="table-header">
                          <tr>
                            <th className="table-header-cell">记录编号</th>
                            <th className="table-header-cell">收款金额</th>
                            <th className="table-header-cell">收款方式</th>
                            <th className="table-header-cell">凭证号</th>
                            <th className="table-header-cell">收款日期</th>
                          </tr>
                        </thead>
                        <tbody className="table-body">
                          {selectedReceivable.paymentRecords.map((record) => (
                            <tr key={record.id} className="table-row">
                              <td className="table-cell font-mono text-sm">{record.recordNo}</td>
                              <td className="table-cell font-medium">¥{record.amount.toFixed(2)}</td>
                              <td className="table-cell">{record.paymentMethod || '-'}</td>
                              <td className="table-cell">{record.paymentReference || '-'}</td>
                              <td className="table-cell text-gray-500">
                                {new Date(record.paymentDate).toLocaleDateString('zh-CN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
