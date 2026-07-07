import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import publicMenuService from '../../services/publicMenuService';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import MenuHeader from '../../components/publicMenu/MenuHeader';
import SearchBar from '../../components/publicMenu/SearchBar';
import CategoryTabs from '../../components/publicMenu/CategoryTabs';
import ProductCard from '../../components/publicMenu/ProductCard';
import ProductDetailModal from '../../components/publicMenu/ProductDetailModal';
import ClosedBanner from '../../components/publicMenu/ClosedBanner';
import MenuFooter from '../../components/publicMenu/MenuFooter';

const setMetaTag = (selector, attrs) => {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== 'content') tag.setAttribute(key, value);
    });
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', attrs.content);
};

const PublicMenu = () => {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [closedData, setClosedData] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const visitTrackedRef = useRef(false);
  const isFirstCategoryRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const response = await publicMenuService.getPublicMenu(slug);
        if (!isMounted) return;

        if (!response.success) {
          setNotFound(true);
          return;
        }

        const data = response.data;

        if (!data.open) {
          setClosedData(data);
          return;
        }

        setRestaurant(data.restaurant);
        setCategories(data.categories || []);
        setProducts(data.products || []);

        if (!visitTrackedRef.current) {
          visitTrackedRef.current = true;
          publicMenuService.trackVisit(slug, { type: 'menu_visit' });
        }
      } catch (error) {
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (isFirstCategoryRef.current) {
      isFirstCategoryRef.current = false;
      return;
    }
    if (activeCategory) {
      publicMenuService.trackVisit(slug, { type: 'category_view', categoryId: activeCategory });
    }
  }, [activeCategory, slug]);

  useEffect(() => {
    if (!restaurant) return;

    document.title = restaurant.seo?.title || restaurant.name || 'Menú Digital';

    setMetaTag('meta[name="description"]', {
      name: 'description',
      content: restaurant.seo?.description || restaurant.description || '',
    });
    setMetaTag('meta[property="og:title"]', {
      property: 'og:title',
      content: restaurant.seo?.title || restaurant.name || '',
    });
    setMetaTag('meta[property="og:description"]', {
      property: 'og:description',
      content: restaurant.seo?.description || restaurant.description || '',
    });
    setMetaTag('meta[property="og:image"]', {
      property: 'og:image',
      content: resolveMediaUrl(restaurant.logoUrl) || '',
    });
  }, [restaurant]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory;
      if (!matchesCategory) return false;
      if (!term) return true;
      const haystack = `${product.title || ''} ${product.description || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [products, activeCategory, search]);

  const handleProductClick = (product) => {
    publicMenuService.trackVisit(slug, { type: 'product_view', foodId: product._id });
    setSelectedProduct(product);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-600 text-lg">Menú no disponible</p>
      </div>
    );
  }

  if (closedData) {
    return (
      <ClosedBanner
        restaurantName={closedData.restaurantName}
        message={closedData.closedMessage}
        schedule={closedData.schedule}
      />
    );
  }

  const appearance = restaurant.appearance || {};

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        '--menu-primary': appearance.primaryColor || '#78350f',
        '--menu-secondary': appearance.secondaryColor || '#f59e0b',
        '--menu-button': appearance.buttonColor || '#16a34a',
        '--menu-text': appearance.textColor || '#1f2937',
      }}
    >
      <MenuHeader
        name={restaurant.name}
        description={restaurant.description}
        logoUrl={restaurant.logoUrl}
        bannerUrl={restaurant.bannerUrl}
        showLogo={restaurant.showLogo}
        phone={restaurant.phone}
        whatsapp={restaurant.whatsapp}
        socialLinks={restaurant.socialLinks}
      />

      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-8 py-3 space-y-3">
        <SearchBar value={search} onChange={setSearch} />
        <CategoryTabs categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />
      </div>

      <div className="px-4 sm:px-8 py-6">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No se encontraron productos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product._id} product={product} onClick={handleProductClick} />
            ))}
          </div>
        )}
      </div>

      <ProductDetailModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />

      <MenuFooter address={restaurant.address} />
    </div>
  );
};

export default PublicMenu;
