'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Supplier } from '@/types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [keyword, setKeyword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
    bankName: '',
    bankAccount: '',
    taxId: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers', { params: { keyword, pageSize: 100 } });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      bankName: supplier.bankName || '',
      bankAccount: supplier.bankAccount || '',
      taxId: supplier.taxId || '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      await api.put(`/suppliers/${supplier.id}/toggle-active`);
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      address: '',
      bankName: '',
      bankAccount: '',
      taxId: '',
    });
    setEditingSupplier(null);
  };

  if (loading && suppliers.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">供应商管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          + 新增供应商
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-item">
            <label className="form-label">关键词</label>
            <input
              type="text"
              className="form-input"
              placeholder="搜索供应商名称/联系人/电话"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()}
            />
          </div>
          <button
            onClick={fetchSuppliers}
            className="btn btn-primary"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">供应商名称</th>
                  <th className="table-header-cell">联系人</th>
                  <th className="table-header-cell">电话</th>
                  <th className="table-header-cell">地址</th>
                  <th className="table-header-cell">开户行</th>
                  <th className="table-header-cell">状态</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-cell text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="table-row">
                      <td className="table-cell font-medium">{supplier.name}</td>
                      <td className="table-cell">{supplier.contactPerson || '-'}</td>
                      <td className="table-cell">{supplier.phone || '-'}</td>
                      <td className="table-cell text-gray-500 max-w-xs truncate" title={supplier.address}>
                        {supplier.address || '-'}
                      </td>
                      <td className="table-cell text-gray-500">{supplier.bankName || '-'}</td>
                      <td className="table-cell">
                        <span className={`badge ${supplier.isActive ? 'badge-success' : 'badge-default'}`}>
                          {supplier.isActive ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="btn btn-secondary btn-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleToggleActive(supplier)}
                            className={`btn btn-sm ${supplier.isActive ? 'btn-danger' : 'btn-success'}`}
                          >
                            {supplier.isActive ? '禁用' : '启用'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">
                {editingSupplier ? '编辑供应商' : '新增供应商'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">供应商名称 *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">联系人</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">联系电话</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">税号</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    />
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">地址</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">开户行</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">银行账号</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
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
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
