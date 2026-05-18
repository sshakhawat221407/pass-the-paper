import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { Footer } from './Footer';
import { resourcesApi, cartApi } from '../services/api';
import { BookOpen, FileText, Clipboard, TrendingUp, ShoppingCart, Book, Cpu } from 'lucide-react';
import { ItemDetailsModal } from './ItemDetailsModal';
import { toast } from 'sonner';

type HomeProps = {
  user: User;
};

type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceType: 'money' | 'points';
  uploadedBy: string;
  uploaderName: string;
  downloads: number;
  rating: number;
};

export function Home({ user }: HomeProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, [selectedCategory]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = selectedCategory
        ? await resourcesApi.getAll(selectedCategory)
        : await resourcesApi.getFeatured();
      setResources(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (resource: Resource) => {
    setAddingToCart(resource.id);
    try {
      await cartApi.add(resource.id);
      toast.success(`"${resource.title}" added to cart!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const categories = [
    { name: 'Previous Papers',     icon: FileText,   color: '#E56E20' },
    { name: 'Lecture Notes',       icon: BookOpen,   color: '#3B82F6' },
    { name: 'Assignments',         icon: Clipboard,  color: '#10B981' },
    { name: 'Books',               icon: Book,       color: '#8B5CF6' },
    { name: 'Electronic Equipment',icon: Cpu,        color: '#EC4899' },
    { name: 'Trending',            icon: TrendingUp, color: '#F59E0B' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FDF6F0' }}>
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user.name}! 👋
              </h2>
              <p className="text-gray-600">
                {user.isVerified ? (
                  <span className="text-green-600 font-medium">✓ Verified Student</span>
                ) : (
                  <span className="text-yellow-600 font-medium">⏳ Verification Pending</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Wallet Balance</p>
              <p className="text-3xl font-bold" style={{ color: '#E56E20' }}>
                ৳{user.walletBalance.toFixed(2)}
              </p>
              {user.rewardPoints !== undefined && (
                <p className="text-sm text-gray-500">{user.rewardPoints} pts</p>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Browse by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() =>
                  setSelectedCategory(
                    category.name === 'Trending' ? undefined : category.name
                  )
                }
                className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all ${
                  selectedCategory === category.name
                    ? 'ring-2 ring-offset-2'
                    : ''
                }`}
                style={
                  selectedCategory === category.name
                    ? { outline: `2px solid ${category.color}` }
                    : {}
                }
              >
                <category.icon
                  size={32}
                  style={{ color: category.color }}
                  className="mb-3 mx-auto"
                />
                <h4 className="font-semibold text-gray-800 text-sm text-center">
                  {category.name}
                </h4>
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        <div>
          <h3 className="text-xl font-bold mb-4">
            {selectedCategory ? selectedCategory : 'Featured Resources'}
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: '#E56E20' }}
              />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No resources found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedResourceId(resource.id)}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={20} style={{ color: '#E56E20' }} />
                      <span className="text-sm text-gray-500">
                        {resource.category}
                      </span>
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{resource.title}</h4>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">
                        by {resource.uploaderName}
                      </span>
                      <span className="text-sm text-gray-500">
                        ⭐ {resource.rating}/5
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xl font-bold"
                        style={{ color: '#E56E20' }}
                      >
                        {resource.priceType === 'money'
                          ? `৳${resource.price}`
                          : `${resource.price} pts`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(resource);
                        }}
                        disabled={addingToCart === resource.id}
                        className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60 transition-opacity"
                        style={{ backgroundColor: '#E56E20' }}
                      >
                        {addingToCart === resource.id ? 'Adding...' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item Details Modal */}
      {selectedResourceId && (
        <ItemDetailsModal
          resourceId={selectedResourceId}
          onClose={() => setSelectedResourceId(null)}
          onAddToCart={() => {
            const resource = resources.find((r) => r.id === selectedResourceId);
            if (resource) addToCart(resource);
          }}
        />
      )}

      <Footer />
    </div>
  );
}
