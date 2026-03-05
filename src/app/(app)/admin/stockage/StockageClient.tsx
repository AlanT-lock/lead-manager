"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Package, Layers, Euro } from "lucide-react";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editTypeId, setEditTypeId] = useState("");
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const quantitySaveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      setShowAddModal(false);
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

  // Stats
  const totalQuantity = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalAmount = products.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.price) || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-200/80 p-3">
              <Package className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Produits différents</p>
              <p className="text-2xl font-bold text-slate-800">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-200/80 p-3">
              <Layers className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Quantité totale</p>
              <p className="text-2xl font-bold text-slate-800">{totalQuantity}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-200/80 p-3">
              <Euro className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600">Valeur totale</p>
              <p className="text-2xl font-bold text-emerald-800">
                {totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header + bouton ajouter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800">Catalogue des produits</h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Ajouter un produit
        </button>
      </div>

      {/* Grille de produits par type */}
      <div className="space-y-10">
        {productTypes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun type de produit</p>
            <p className="text-slate-400 text-sm mt-1">
              Cliquez sur « Ajouter un produit » pour créer un type, puis un produit.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Ajouter un produit
            </button>
          </div>
        ) : (
          productTypes.map((type) => {
            const typeProducts = productsByType[type.id] || [];
            return (
              <section key={type.id} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-700">{type.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditTypeModal(type)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                      title="Modifier le type"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteType(type, e)}
                      disabled={loading}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Supprimer le type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeProducts.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/30 py-8 text-center">
                      <p className="text-slate-400 text-sm">Aucun produit dans cette catégorie</p>
                    </div>
                  ) : (
                    typeProducts.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-slate-800 line-clamp-2 pr-2">{product.name}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProduct(product, e)}
                              disabled={loading}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 disabled:opacity-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-lg font-semibold text-slate-700 mb-3">
                          {Number(product.price).toFixed(2)} €
                        </p>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-500">Qté :</label>
                          <input
                            type="number"
                            min="0"
                            value={product.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v) && v >= 0) {
                                setProducts((prev) =>
                                  prev.map((p) =>
                                    p.id === product.id ? { ...p, quantity: v } : p
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
                            className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Modal : Ajouter un produit */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Nouveau produit</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Nom complet du produit
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ex: PAC Daikin 5 kW"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Prix (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Type de produit
                </label>
                <div className="flex gap-2">
                  <select
                    value={newProductTypeId}
                    onChange={(e) => setNewProductTypeId(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
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
                    className="px-3 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"
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
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl"
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), handleCreateType())
                      }
                    />
                    <button
                      type="button"
                      onClick={handleCreateType}
                      disabled={!newTypeName.trim() || loading}
                      className="px-4 py-2.5 bg-slate-600 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50"
                    >
                      Créer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTypeInput(false);
                        setNewTypeName("");
                      }}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !newProductName.trim() || !newProductTypeId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  Créer le produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Modifier produit */}
      {editingProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Modifier le produit</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Prix (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Type</label>
                <select
                  value={editTypeId}
                  onChange={(e) => setEditTypeId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  {productTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Modifier type */}
      {editingType && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingType(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Modifier le type</h3>
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nom du type</label>
                <input
                  type="text"
                  value={editTypeName}
                  onChange={(e) => setEditTypeName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
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
