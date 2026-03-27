import React, { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from "../convex/_generated/api";
import { Loader2, Plus, ExternalLink, Package, DollarSign, Image, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomProductsTabProps {
    stripeAccountId: string;
}

export const CustomProductsTab: React.FC<CustomProductsTabProps> = ({ stripeAccountId }) => {
    const listProducts = useAction(api.stripeActions.listConnectedProducts);
    const createProduct = useAction(api.stripeActions.createConnectedProduct);
    const archiveProduct = useAction(api.stripeActions.archiveConnectedProduct);

    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState(""); // Input as string (dollars), convert to cents
    const [imageUrl, setImageUrl] = useState("");

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const data = await listProducts({ stripeAccountId });
            setProducts(data);
        } catch (e) {
            toast.error("Failed to load products");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (stripeAccountId) {
            fetchProducts();
        }
    }, [stripeAccountId]);

    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    const handleDeleteClick = (productId: string) => {
        setProductToDelete(productId);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        try {
            await archiveProduct({ stripeAccountId, productId: productToDelete });
            toast.success("Product deleted");
            fetchProducts();
        } catch (e) {
            toast.error("Failed to delete product");
        } finally {
            setProductToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const result = await createProduct({
                stripeAccountId,
                name,
                description,
                amount: Math.round(parseFloat(amount) * 100), // Convert to cents
                imageUrl: imageUrl || undefined
            });

            setOpenModal(false);

            // Show Payment Link
            if (result.paymentLink?.url) {
                toast.success("Product created! Payment Link copied to clipboard.");
                navigator.clipboard.writeText(result.paymentLink.url);
            } else {
                toast.success("Product created successfully!");
            }

            // Reset form
            setName("");
            setDescription("");
            setAmount("");
            setImageUrl("");
            // Refresh list
            fetchProducts();
        } catch (e) {
            toast.error("Failed to create product");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-stone-900 font-serif">Products & Services</h2>
                    <p className="text-stone-500 text-sm">Create and manage your offerings.</p>
                </div>
                <button
                    onClick={() => setOpenModal(true)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-full flex items-center gap-2 hover:bg-stone-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Product
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <Package className="w-12 h-12 mx-auto text-stone-300 mb-4" />
                    <h3 className="text-stone-900 font-medium">No products yet</h3>
                    <p className="text-stone-500 text-sm mt-1">Create your first product to start selling.</p>
                </div>
            ) : (
                <div className="bg-white border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-stone-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium text-stone-500">Product</th>
                                <th className="px-6 py-3 font-medium text-stone-500">Price</th>
                                <th className="px-6 py-3 font-medium text-stone-500">Checkout Link</th>
                                <th className="px-6 py-3 font-medium text-stone-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {products.map((product) => (
                                <tr key={product.id} className="hover:bg-stone-50/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {product.images && product.images[0] ? (
                                                <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-stone-100" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-stone-900">{product.name}</div>
                                                <div className="text-stone-500 text-xs truncate max-w-xs">{product.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-stone-600">
                                        {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: product.default_price?.currency || 'usd'
                                        }).format((product.default_price?.unit_amount || 0) / 100)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {product.paymentLinkUrl ? (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(product.paymentLinkUrl);
                                                    toast.success("Link copied!");
                                                }}
                                                className="flex items-center gap-2 px-2 py-1 bg-stone-100 rounded text-xs text-stone-600 hover:bg-stone-200 transition-colors max-w-[200px]"
                                            >
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{product.paymentLinkUrl}</span>
                                            </button>
                                        ) : (
                                            <span className="text-stone-400 text-xs italic">No link available</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteClick(product.id)}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors inline-block"
                                            title="Delete Product"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {openModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Create Product</h3>
                            <button onClick={() => setOpenModal(false)} className="text-stone-400 hover:text-stone-900">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Product Name</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="e.g. Consulting Hour"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Brief description..."
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Price ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Image URL (Optional)</label>
                                    <div className="relative">
                                        <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={e => setImageUrl(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpenModal(false)}
                                    className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {productToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg text-stone-900 mb-2">Delete Product?</h3>
                        <p className="text-stone-500 text-sm mb-6">
                            Are you sure you want to delete this product? This action cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => setProductToDelete(null)}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
