'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Product, Category, Unit, PaginatedResponse } from '@/types';

interface ProductWithInventory extends Product {
  totalQuantity?: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    categoryId: '',
    keyword: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    specification: '',
    unit: Unit.PIECE,
    costPrice: 0,
    sellingPrice: 0,
    safetyStock: 10,
    barcode: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/products', { params: { ...filters, pageSize: 100 } }),
        api.get('/categories'),
      ]);

      const productData: PaginatedResponse<ProductWithInventory> = productsResponse.data;
      setProducts(productData.data);
      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.category.id,
      specification: product.specification || '',
      unit: product.unit,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      safetyStock: product.safetyStock,
      barcode: product.barcode || '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await api.put(`/products/${product.id}/toggle-active`);
      fetchData();
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      specification: '',
      unit: Unit.PIECE,
      costPrice: 0,
      sellingPrice: 0,
      safetyStock: 10,
      barcode: '',
    });
    setEditingProduct(null);
  };

  const getUnitLabel = (unit: Unit): string => {
    const unitMap: Record<Unit, string> = {
      [Unit.PIECE]: '件',
      [Unit.BOX]: '箱',
      [Unit.KILOGRAM]: '千克',
      [Unit.METER]: '米',
      [Unit.SET]: '套',
      [Unit.PACK]: '包',
    };
    return unitMap[unit];
  };

  if (loading && products.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">商品管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          + 新增商品
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-item">
            <label className="form-label">分类</label>
            <select
              className="form-select"
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label className="form-label">关键词</label>
            <input
              type="text"
              className="form-input"
              placeholder="搜索商品名称/编码/条码"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
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

      {/* Products Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">商品编码</th>
                  <th className="table-header-cell">商品名称</th>
                  <th className="table-header-cell">分类</th>
                  <th className="table-header-cell">规格</th>
                  <th className="table-header-cell">单位</th>
                  <th className="table-header-cell">成本价</th>
                  <th className="table-header-cell">售价</th>
                  <th className="table-header-cell">安全库存</th>
                  <th className="table-header-cell">状态</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-cell text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="table-row">
                      <td className="table-cell font-mono text-sm">{product.code}</td>
                      <td className="table-cell font-medium">{product.name}</td>
                      <td className="table-cell">{product.category.name}</td>
                      <td className="table-cell text-gray-500">{product.specification || '-'}</td>
                      <td className="table-cell">{getUnitLabel(product.unit)}</td>
                      <td className="table-cell">¥{product.costPrice.toFixed(2)}</td>
                      <td className="table-cell">¥{product.sellingPrice.toFixed(2)}</td>
                      <td className="table-cell">{product.safetyStock}</td>
                      <td className="table-cell">
                        <span className={`badge ${product.isActive ? 'badge-success' : 'badge-default'}`}>
                          {product.isActive ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="btn btn-secondary btn-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`btn btn-sm ${product.isActive ? 'btn-danger' : 'btn-success'}`}
                          >
                            {product.isActive ? '禁用' : '启用'}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold">
                {editingProduct ? '编辑商品' : '新增商品'}
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
                    <label className="form-label">商品名称 *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">分类 *</label>
                    <select
                      className="form-select"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      required
                    >
                      <option value="">请选择分类</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">规格</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.specification}
                      onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">单位 *</label>
                    <select
                      className="form-select"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
                      required
                    >
                      <option value={Unit.PIECE}>件</option>
                      <option value={Unit.BOX}>箱</option>
                      <option value={Unit.KILOGRAM}>千克</option>
                      <option value={Unit.METER}>米</option>
                      <option value={Unit.SET}>套</option>
                      <option value={Unit.PACK}>包</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">成本价 *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">售价 *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">安全库存</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={formData.safetyStock}
                      onChange={(e) => setFormData({ ...formData, safetyStock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">条码</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
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
