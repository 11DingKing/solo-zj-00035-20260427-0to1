'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Warehouse } from '@/types';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.id}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      setShowModal(false);
      resetForm();
      fetchWarehouses();
    } catch (error) {
      console.error('Failed to save warehouse:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address || '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (warehouse: Warehouse) => {
    try {
      await api.put(`/warehouses/${warehouse.id}/toggle-active`);
      fetchWarehouses();
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
    });
    setEditingWarehouse(null);
  };

  if (loading && warehouses.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">仓库管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          + 新增仓库
        </button>
      </div>

      {/* Warehouse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无仓库数据，请添加仓库
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div key={warehouse.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${warehouse.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <span className="text-2xl">🏭</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold text-gray-800">{warehouse.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {warehouse.address || '暂无地址'}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${warehouse.isActive ? 'badge-success' : 'badge-default'}`}>
                    {warehouse.isActive ? '启用' : '禁用'}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(warehouse)}
                    className="btn btn-secondary btn-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleToggleActive(warehouse)}
                    className={`btn btn-sm ${warehouse.isActive ? 'btn-danger' : 'btn-success'}`}
                  >
                    {warehouse.isActive ? '禁用' : '启用'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">
                {editingWarehouse ? '编辑仓库' : '新增仓库'}
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
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">仓库名称 *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入仓库名称"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">仓库地址</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="请输入仓库地址（可选）"
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
