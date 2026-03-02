"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface ProductType {
  id: string;
  name: string;
  display_order?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  product_type_id: string;
  product_types: ProductType | null;
}

interface StockageClientProps {
  initialProducts: Product[];
  initialProductTypes: ProductType[];
}

export function StockageClient({
  initialProducts,
  initialProductTypes,
}: StockageClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productTypes, setProductTypes] = useState<ProductType[]>(initialProductTypes);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductTypeId, setNewProductTypeId] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editTypeId, setEditTypeId] = useState("");
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const quantitySaveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const refreshData = useCallback(async () => {
    const [productsRes, typesRes] = await Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/product-types").then((r) => r.json()),
    ]);
    if (Array.isArray(productsRes)) setProducts(productsRes);
    if (Array.isArray(typesRes)) setProductTypes(typesRes);
  }, []);

  useEffect(() => {
    if (productTypes.length > 0 && !newProductTypeId) {
      setNewProductTypeId(productTypes[0].id);
    }
  }, [productTypes, newProductTypeId]);

  useEffect(() => {
    return () => {
      Object.values(quantitySaveTimeoutsRef.current).forEach(clearTimeout);
      quantitySaveTimeoutsRef.current = {};
    };
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductTypeId) return;
    const price = parseFloat(newProductPrice);
    if (isNaN(price) || price < 0) return;

    setLoading(true);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProductName.trim(),
        price,
        product_type_id: newProductTypeId,
        quantity: 0,
      }),
    });
    setLoading(false);

    if (res.ok) {
      const created = await res.json();
      setProducts((prev) => [...prev, created]);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductTypeId(productTypes[0]?.id || "");
      router.refresh();
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;

    setLoading(true);
    const res = await fetch("/api/admin/product-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTypeName.trim(),
        display_order: productTypes.length,
      }),
    });
    setLoading(false);

    if (res.ok) {
      const created = await res.json();
      setProductTypes((prev) => [...prev, created]);
      setNewProductTypeId(created.id);
      setNewTypeName("");
      setShowNewTypeInput(false);
      router.refresh();
    }
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    if (!editTypeName.trim()) return;

    setLoading(true);
    const res = await fetch(`/api/admin/product-types/${editingType.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editTypeName.trim() }),
    });
    setLoading(false);

    if (res.ok) {
      const updated = await res.json();
      setProductTypes((prev) =>
        prev.map((t) => (t.id === editingType.id ? updated : t))
      );
      setEditingType(null);
      router.refresh();
    }
  };

  const handleDeleteType = async (type: ProductType, e: React.MouseEvent) => {
    e.stopPropagation();
    const typeProducts = productsByType[type.id] || [];
    if (typeProducts.length > 0) {
      const ok = confirm(
        `Le type « ${type.name} » contient ${typeProducts.length} produit(s). Les supprimer aussi ?`
      );
      if (!ok) return;
    } else if (!confirm(`Supprimer le type « ${type.name} » ?`)) {
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/admin/product-types/${type.id}`, {
      method: "DELETE",
    });
    setLoading(false);

    if (res.ok) {
      setProductTypes((prev) => prev.filter((t) => t.id !== type.id));
      setProducts((prev) => prev.filter((p) => p.product_type_id !== type.id));
      if (editingType?.id === type.id) setEditingType(null);
      if (newProductTypeId === type.id) {
        const remaining = productTypes.filter((t) => t.id !== type.id);
        setNewProductTypeId(remaining[0]?.id || "");
      }
      router.refresh();
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Math.max(0, quantity) }),
    });

    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? updated : p))
      );
      router.refresh();
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim() || !editTypeId) return;
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) return;

    setLoading(true);
    const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        price,
        product_type_id: editTypeId,
      }),
    });
    setLoading(false);

    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? updated : p))
      );
      setEditingProduct(null);
      router.refresh();
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditTypeId(product.product_type_id);
  };

  const handleDeleteProduct = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer le produit « ${product.name} » ?`)) return;

    setLoading(true);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
    });
    setLoading(false);

    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      if (editingProduct?.id === product.id) setEditingProduct(null);
      router.refresh();
    }
  };

  const openEditTypeModal = (type: ProductType) => {
    setEditingType(type);
    setEditTypeName(type.name);
  };

  const productsByType = productTypes.reduce<Record<string, Product[]>>(
    (acc, type) => {
      acc[type.id] = products.filter((p) => p.product_type_id === type.id);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-4">Nouveau produit</h2>
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Nom complet du produit
              </label>
              <input
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Ex: PAC Daikin 5 kW"
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Prix (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Type de produit
              </label>
              <div className="flex gap-2">
                <select
                  value={newProductTypeId}
                  onChange={(e) => setNewProductTypeId(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                >
                  {productTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewTypeInput(!showNewTypeInput)}
                  className="px-3 py-2 border rounded-lg hover:bg-slate-50"
                  title="Ajouter un type"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {showNewTypeInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Nouveau type..."
                    className="flex-1 px-4 py-2 border rounded-lg"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateType())}
                  />
                  <button
                    type="button"
                    onClick={handleCreateType}
                    disabled={!newTypeName.trim() || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTypeInput(false);
                      setNewTypeName("");
                    }}
                    className="px-3 py-2 border rounded-lg hover:bg-slate-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !newProductName.trim() || !newProductTypeId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Créer le produit
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {productTypes.length === 0 ? (
          <p className="text-slate-500">
            Aucun type de produit. Créez d&apos;abord un type via le formulaire ci-dessus.
          </p>
        ) : (
          productTypes.map((type) => {
            const typeProducts = productsByType[type.id] || [];
            return (
              <div
                key={type.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-medium text-slate-800">{type.name}</h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditTypeModal(type)}
                      className="p-2 rounded-lg hover:bg-slate-200"
                      title="Modifier le type"
                    >
                      <Pencil className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteType(type, e)}
                      disabled={loading}
                      className="p-2 rounded-lg hover:bg-red-50"
                      title="Supprimer le type"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-4 -mt-2">
                  {typeProducts.length} produit(s)
                </p>
                <div className="space-y-0">
                  {typeProducts.length === 0 ? (
                    <p className="text-slate-400 py-4">Aucun produit</p>
                  ) : (
                    typeProducts.map((product, i) => (
                      <div
                        key={product.id}
                        className={`flex justify-between items-center py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 ${
                          i < typeProducts.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <span className="text-slate-700">{product.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-sm">
                            {Number(product.price).toFixed(2)} €
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-500">Qté:</span>
                            <input
                              type="number"
                              min="0"
                              value={product.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 0) {
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === product.id
                                        ? { ...p, quantity: v }
                                        : p
                                    )
                                  );
                                  const pid = product.id;
                                  if (quantitySaveTimeoutsRef.current[pid])
                                    clearTimeout(quantitySaveTimeoutsRef.current[pid]);
                                  quantitySaveTimeoutsRef.current[pid] = setTimeout(() => {
                                    delete quantitySaveTimeoutsRef.current[pid];
                                    handleUpdateQuantity(pid, v);
                                  }, 500);
                                }
                              }}
                              className="w-16 px-2 py-1 border rounded text-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="p-2 rounded-lg hover:bg-slate-200"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProduct(product, e)}
                            disabled={loading}
                            className="p-2 rounded-lg hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium text-slate-800 mb-4">Modifier le produit</h3>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nom</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Prix (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Type</label>
                <select
                  value={editTypeId}
                  onChange={(e) => setEditTypeId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {productTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingType && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingType(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium text-slate-800 mb-4">Modifier le type</h3>
            <form onSubmit={handleUpdateType} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nom du type</label>
                <input
                  type="text"
                  value={editTypeName}
                  onChange={(e) => setEditTypeName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
