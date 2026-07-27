import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Clock3,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CheckoutPage from './pages/Checkout';
import type { CartItem, Category, Package, Product, ProductType } from './types';

// ─── Product Data ─────────────────────────────────────────────────────────────

const callbackPackages: Package[] = [
  { quantity: 20, price: 400 },
  { quantity: 30, price: 600 },
  { quantity: 50, price: 900, savings: 100 },
  { quantity: 100, price: 1700, savings: 300 },
];

const liveTransferPackages: Package[] = [
  { quantity: 10, price: 350 },
  { quantity: 20, price: 700 },
  { quantity: 30, price: 950, savings: 100 },
  { quantity: 50, price: 1500, savings: 250 },
  { quantity: 100, price: 2800, savings: 700 },
];

const preClosedPackages: Package[] = [
  { quantity: 5, price: 1000 },
  { quantity: 10, price: 1850, savings: 150 },
  { quantity: 15, price: 2700, savings: 300 },
  { quantity: 20, price: 3400, savings: 600 },
];

const descriptionByType: Record<ProductType, string> = {
  'Callback Leads':
    'Exclusive, self-generated prospects who have requested information about this insurance product.',
  'Live Transfers':
    'Receive warm, qualified prospects transferred directly to your licensed agents.',
  'Pre Closed Applications':
    'Receive approved applications that have already completed the majority of the enrollment process.',
};

const makeProduct = (category: Category, type: ProductType, packages: Package[]): Product => ({
  id: `${category}-${type}`.toLowerCase().replaceAll(' ', '-'),
  category,
  type,
  description:
    category === 'Final Expense'
      ? descriptionByType[type]
      : type === 'Pre Closed Applications'
        ? descriptionByType[type]
        : descriptionByType[type].replace('this insurance product', category),
  buffer: type === 'Live Transfers' ? '120 Second Buffer' : undefined,
  packages,
});

const productsByCategory: Record<Exclude<Category, 'ACA'>, Product[]> = {
  'Final Expense': [
    makeProduct('Final Expense', 'Callback Leads', callbackPackages),
    makeProduct('Final Expense', 'Live Transfers', liveTransferPackages),
    makeProduct('Final Expense', 'Pre Closed Applications', preClosedPackages),
  ],
  Medicare: [
    makeProduct('Medicare', 'Callback Leads', callbackPackages),
    makeProduct('Medicare', 'Live Transfers', liveTransferPackages),
  ],
};

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const categoryMeta: Record<Category, { eyebrow: string; description: string }> = {
  'Final Expense': {
    eyebrow: 'High-intent prospects',
    description: 'Build a steady pipeline with exclusive Final Expense opportunities.',
  },
  Medicare: {
    eyebrow: 'Ready-to-connect demand',
    description: 'Reach Medicare prospects at the moment they are looking for guidance.',
  },
  ACA: {
    eyebrow: 'Launching soon',
    description: 'ACA lead programs are being prepared for the Hub.',
  },
};

// ─── Catalog Components ───────────────────────────────────────────────────────

function BrandMark() {
  return (
    <img
      src="/logo.png"
      alt="LeadStream Hub"
      className="h-12 w-auto object-contain"
    />
  );
}

function Header({ itemCount, onCart }: { itemCount: number; onCart: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <BrandMark />
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-xs text-[#8ea2c1] sm:flex">
          <ShieldCheck className="h-4 w-4 text-[#62d8ef]" />
          Exclusive leads. Direct access.
        </div>
        <motion.button
          type="button"
          onClick={onCart}
          data-testid="button-header-cart"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          className="focus-ring relative flex h-11 items-center gap-2 rounded-full border border-[#2c466b] bg-[#12223b] px-4 text-sm font-semibold text-white transition-colors hover:border-[#4f83c7] hover:bg-[#172d4d]"
          aria-label={`Open cart with ${itemCount} products`}
        >
          <ShoppingBag className="h-4 w-4 text-[#6cddf3]" />
          <span className="hidden sm:inline">Your cart</span>
          <motion.span
            key={itemCount}
            initial={{ scale: 0.5, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3182f4] px-1.5 text-[11px]"
          >
            {itemCount}
          </motion.span>
        </motion.button>
      </div>
    </header>
  );
}

function CategorySelector({ selected, onSelect }: { selected: Category; onSelect: (c: Category) => void }) {
  return (
    <div
      className="grid w-full grid-cols-3 rounded-[18px] border border-[#294364] bg-[#0e1b30]/90 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.16)]"
      role="tablist"
      aria-label="Insurance product categories"
    >
      {(['Final Expense', 'Medicare', 'ACA'] as Category[]).map((category) => {
        const isActive = selected === category;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(category)}
            data-testid={`button-category-${category.toLowerCase().replaceAll(' ', '-')}`}
            className={`focus-ring relative rounded-[13px] px-2 py-3 text-xs font-semibold transition-colors sm:px-4 sm:py-3.5 sm:text-sm ${
              isActive ? 'text-white' : 'text-[#8ea3c3] hover:text-white'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="activeCategoryPill"
                className="absolute inset-0 rounded-[13px] bg-[#277bf0] shadow-[0_8px_22px_rgba(39,123,240,.28)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">
              {category}
              {category === 'ACA' && (
                <span className="ml-1.5 hidden rounded-full bg-[#1c3657] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#7eddf0] sm:inline">
                  Soon
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PackageRow({
  product,
  pack,
  onAdd,
}: {
  product: Product;
  pack: Package;
  onAdd: (product: Product, pack: Package) => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-3 border-t border-[#263b5a] py-3.5 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#2b4a70] bg-[#142844] font-display text-xs font-semibold text-[#a9c8ed]">
          {pack.quantity}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{pack.quantity} Pack</div>
          {pack.savings ? (
            <div className="mt-0.5 text-[11px] font-medium text-[#68d7e9]">Save {money(pack.savings)}</div>
          ) : (
            <div className="mt-0.5 text-[11px] text-[#7389aa]">Standard package</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-display text-sm font-semibold text-[#dce8f7]">{money(pack.price)}</span>
        <motion.button
          type="button"
          onClick={() => onAdd(product, pack)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          data-testid={`button-add-${product.category.toLowerCase().replaceAll(' ', '-')}-${product.type.toLowerCase().replaceAll(' ', '-')}-${pack.quantity}`}
          className="focus-ring flex h-9 items-center gap-1.5 rounded-[9px] border border-[#38669b] bg-[#18365d] px-3 text-xs font-semibold text-[#d8eaff] transition-colors hover:border-[#70d4f4] hover:bg-[#20518a]"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </motion.button>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  onAdd,
}: {
  product: Product;
  index: number;
  onAdd: (product: Product, pack: Package) => void;
}) {
  const typeIcon = product.type === 'Callback Leads' ? 'CB' : product.type === 'Live Transfers' ? 'LT' : 'PA';
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      className="glass-panel group rounded-[22px] p-5 transition-colors duration-300 hover:border-[#3c6c9d] sm:p-6"
      data-testid={`card-product-${product.id}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-[#32567f] bg-[#162e50] font-display text-[11px] font-bold tracking-wide text-[#67d8f0]">
            {typeIcon}
          </div>
          <div>
            <h3 className="font-display text-[17px] font-semibold tracking-[-0.025em] text-white">{product.type}</h3>
            <p className="mt-1.5 max-w-[34rem] text-xs leading-5 text-[#91a7c8]">{product.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {product.buffer && (
            <span className="hidden items-center gap-1 rounded-full border border-[#365378] bg-[#132843] px-2.5 py-1 text-[10px] font-semibold text-[#9fcaeb] sm:flex">
              <Clock3 className="h-3 w-3 text-[#68d8ee]" /> {product.buffer}
            </span>
          )}
          {typeof product.stockRemaining === 'number' && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#f0a63a]/40 bg-[#f0a63a]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f7bb57]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f7bb57]" />
              {product.stockRemaining > 0 ? `Only ${product.stockRemaining} left` : 'Sold out'}
            </span>
          )}
        </div>
      </div>
      {product.buffer && (
        <div className="mb-4 flex w-fit items-center gap-1.5 rounded-full border border-[#365378] bg-[#132843] px-2.5 py-1 text-[10px] font-semibold text-[#9fcaeb] sm:hidden">
          <Clock3 className="h-3 w-3 text-[#68d8ee]" /> {product.buffer}
        </div>
      )}
      <div className="rounded-[14px] border border-[#243e60] bg-[#0d1b2e]/70 px-3.5">
        <div className="flex items-center justify-between py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#718aaf]">
          <span>Package size</span>
          <span>One-time price</span>
        </div>
        {product.packages.map((pack) => (
          <PackageRow key={pack.quantity} product={product} pack={pack} onAdd={onAdd} />
        ))}
      </div>
    </motion.article>
  );
}

function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#2c4e78] bg-[#142945] text-[#61d5ef]">
        <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">Your cart is ready when you are.</h3>
      <p className="mt-2 max-w-[230px] text-xs leading-5 text-[#849ab9]">
        Add a package to start building your exclusive lead order.
      </p>
      <button
        type="button"
        onClick={onBrowse}
        data-testid="button-browse-packages"
        className="focus-ring mt-6 rounded-full border border-[#39699e] px-4 py-2 text-xs font-semibold text-[#b7d6f2] transition hover:bg-[#18365d]"
      >
        Browse packages
      </button>
    </div>
  );
}

function CartPanel({
  cart,
  onChange,
  onRemove,
  onCheckout,
  onBrowse,
  mobile = false,
}: {
  cart: CartItem[];
  onChange: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onCheckout: () => void;
  onBrowse: () => void;
  mobile?: boolean;
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const productCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const savings = cart.reduce((sum, item) => sum + (item.savings ?? 0) * item.quantity, 0);

  return (
    <aside
      className={`${mobile ? 'w-full' : 'sticky top-6'} glass-panel overflow-hidden rounded-[22px]`}
      aria-label="Shopping cart"
    >
      <div className="border-b border-[#263e60] px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-white">Your order</h2>
              {productCount > 0 && (
                <span className="rounded-full bg-[#1e5dc1] px-2 py-0.5 text-[10px] font-bold text-[#d9ebff]">
                  {productCount} {productCount === 1 ? 'product' : 'products'}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#8097b7]">Mix and match across product categories.</p>
          </div>
          <ShoppingBag className="h-5 w-5 text-[#66d9f0]" />
        </div>
      </div>

      {cart.length === 0 ? (
        <EmptyCart onBrowse={onBrowse} />
      ) : (
        <>
          <div className="scrollbar-subtle max-h-[345px] overflow-y-auto px-5 py-2 sm:px-6">
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.lineId}
                  layout
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="border-b border-[#243a59] py-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-white">
                        {item.quantity} {item.type}
                      </div>
                      <div className="mt-1 truncate text-[10px] text-[#7790b2]">
                        {item.category} · {money(item.price)} package
                      </div>
                    </div>
                    <div className="font-display text-sm font-semibold text-[#d9e8f8]">
                      {money(item.price * item.quantity)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-[8px] border border-[#2a466b] bg-[#101f35]">
                      <button
                        type="button"
                        onClick={() => onChange(item.lineId, -1)}
                        aria-label={`Decrease ${item.type} quantity`}
                        data-testid={`button-decrease-${item.lineId}`}
                        className="focus-ring flex h-7 w-7 items-center justify-center text-[#91acce] transition hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span
                        className="min-w-7 text-center font-display text-xs font-semibold text-white"
                        data-testid={`text-quantity-${item.lineId}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange(item.lineId, 1)}
                        aria-label={`Increase ${item.type} quantity`}
                        data-testid={`button-increase-${item.lineId}`}
                        className="focus-ring flex h-7 w-7 items-center justify-center text-[#91acce] transition hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(item.lineId)}
                      data-testid={`button-remove-${item.lineId}`}
                      className="focus-ring flex items-center gap-1 text-[10px] font-medium text-[#7890af] transition hover:text-[#f48c8c]"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="border-t border-[#263e60] bg-[#0d192b]/60 px-5 py-5 sm:px-6">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-[#8da2be]">
                <span>Subtotal</span>
                <span className="font-display font-semibold text-white" data-testid="text-cart-subtotal">
                  {money(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#8da2be]">
                <span>Number of Products</span>
                <span className="font-display font-semibold text-white" data-testid="text-cart-product-count">
                  {productCount}
                </span>
              </div>
              <div className="flex justify-between text-[#70dbe7]">
                <span>Estimated Savings</span>
                <span className="font-display font-semibold" data-testid="text-cart-savings">
                  {money(savings)}
                </span>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={onCheckout}
              data-testid="button-proceed-checkout"
              disabled={cart.length === 0}
              whileHover={cart.length === 0 ? undefined : { y: -2 }}
              whileTap={cart.length === 0 ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="blue-button focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-[11px] py-3.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed To Checkout <ArrowRight className="h-4 w-4" />
            </motion.button>
            <p className="mt-3 text-center text-[10px] leading-4 text-[#7389a8]">
              No payment required in this preview. Your order is handed off to the LeadStream team.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Final Expense');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Live stock counts (admin-controlled) fetched from the catalog API, keyed by
  // product id. Merged onto the static product data below.
  const [stockById, setStockById] = useState<Record<string, number | null>>({});
  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ id: string; stock_remaining: number | null }>) => {
        const map: Record<string, number | null> = {};
        for (const row of rows) map[row.id] = row.stock_remaining ?? null;
        setStockById(map);
      })
      .catch(() => {});
  }, []);

  const products = useMemo(
    () =>
      selectedCategory === 'ACA'
        ? []
        : productsByCategory[selectedCategory].map((p) => ({
            ...p,
            stockRemaining: p.id in stockById ? stockById[p.id] : undefined,
          })),
    [selectedCategory, stockById],
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product, pack: Package) => {
    const lineId = `${product.id}-${pack.quantity}`;
    setCart((current) => {
      const existing = current.find((item) => item.lineId === lineId);
      if (existing) return current.map((item) => (item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { ...product, ...pack, lineId, quantity: 1 }];
    });
    setFeedback(`${pack.quantity} ${product.type} added to your cart`);
    window.setTimeout(() => setFeedback(''), 2300);
  };

  const changeQuantity = (lineId: string, delta: number) => {
    setCart((current) =>
      current.flatMap((item) =>
        item.lineId === lineId ? (item.quantity + delta > 0 ? [{ ...item, quantity: item.quantity + delta }] : []) : [item],
      ),
    );
  };

  const removeItem = (lineId: string) => setCart((current) => current.filter((item) => item.lineId !== lineId));

  const browsePackages = () => {
    setMobileCartOpen(false);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToCheckout = () => {
    setMobileCartOpen(false);
    setCheckoutOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backFromCheckout = () => {
    setCheckoutOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show checkout page
  if (checkoutOpen) {
    return (
      <CheckoutPage
        cart={cart}
        onBack={backFromCheckout}
        onSuccess={() => { setCart([]); }}
      />
    );
  }

  // Show catalog
  return (
    <div className="portal-shell min-h-[100dvh]">
      <Header itemCount={itemCount} onCart={() => setMobileCartOpen(true)} />
      <main className="mx-auto w-full max-w-[1320px] px-5 pb-32 sm:px-8 lg:px-10 lg:pb-20">
        {/* Hero */}
        <section className="relative pb-10 pt-12 sm:pb-14 sm:pt-20 lg:pt-24">
          <div className="pointer-events-none absolute -right-24 top-5 h-64 w-64 rounded-full bg-[#1775f2]/10 blur-3xl" />
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#69d9ed]">
              <Sparkles className="h-3.5 w-3.5" /> Exclusive inventory, on your terms
            </div>
            <h1 className="font-display max-w-[800px] text-balance text-[clamp(2.65rem,7vw,5.9rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-white">
              Order Exclusive
              <br />
              <span className="bg-gradient-to-r from-[#ffffff] via-[#8fc8ff] to-[#55d9ea] bg-clip-text text-transparent">
                Insurance Leads
              </span>
            </h1>
            <div className="mt-7 flex max-w-[760px] flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <p className="max-w-[580px] text-[15px] leading-7 text-[#9aafcb] sm:text-base">
                Choose the insurance products you need, customize your order, and securely complete your purchase in just a few minutes.
              </p>
              <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#9cb4d3]">
                <span className="h-2 w-2 rounded-full bg-[#62dceb] shadow-[0_0_12px_#62dceb]" /> Live inventory
              </div>
            </div>
          </motion.div>
        </section>

        {/* Catalog + Cart */}
        <section id="catalog" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
          <div>
            <div className="mb-6">
              <CategorySelector
                selected={selectedCategory}
                onSelect={(category) => {
                  setSelectedCategory(category);
                  setMobileCartOpen(false);
                }}
              />
            </div>
            <AnimatePresence mode="wait">
              {selectedCategory === 'ACA' ? (
                <motion.div
                  key="aca"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="glass-panel flex min-h-[460px] flex-col items-center justify-center rounded-[22px] px-6 text-center"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#2e527d] bg-[#142b4a] text-[#64d9ee]">
                    <Clock3 className="h-7 w-7" strokeWidth={1.6} />
                  </div>
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cdaed]">
                    {categoryMeta.ACA.eyebrow}
                  </div>
                  <h2 className="font-display text-3xl font-semibold tracking-[-0.05em] text-white">Coming Soon</h2>
                  <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#8fa6c4]">
                    We're preparing a strong ACA lead program for the Hub. Check back soon for exclusive inventory and package pricing.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Final Expense')}
                    data-testid="button-view-final-expense"
                    className="focus-ring mt-7 flex items-center gap-2 rounded-full border border-[#3d6ca1] px-4 py-2.5 text-xs font-semibold text-[#bad8f4] transition hover:bg-[#18365d]"
                  >
                    View available products <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div key={selectedCategory} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#69d9ed]">
                        {categoryMeta[selectedCategory].eyebrow}
                      </div>
                      <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-white">
                        {selectedCategory} products
                      </h2>
                    </div>
                    <p className="hidden max-w-[250px] text-right text-xs leading-5 text-[#8098b9] sm:block">
                      {categoryMeta[selectedCategory].description}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} onAdd={addToCart} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:block">
            <CartPanel
              cart={cart}
              onChange={changeQuantity}
              onRemove={removeItem}
              onCheckout={goToCheckout}
              onBrowse={browsePackages}
            />
          </div>
        </section>

        {/* Trust bar */}
        <section className="mt-16 grid gap-4 border-t border-[#1d3452] pt-8 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Exclusive by design', copy: 'Opportunities sourced for the LeadStream Hub network.' },
            { icon: Clock3, title: 'Built for speed', copy: 'Choose your mix, add packages, and keep moving.' },
            { icon: Check, title: 'Agent-first support', copy: 'Your order is reviewed by a real LeadStream team.' },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#5fd8ed]" />
              <div>
                <div className="text-xs font-semibold text-[#d4e4f5]">{title}</div>
                <div className="mt-1 text-xs leading-5 text-[#7289a9]">{copy}</div>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a1c40]/40 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1320px] px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Brand */}
            <div className="flex items-center">
              <img src="/logo.png" alt="LeadStream Hub" className="h-12 w-auto object-contain" />
            </div>

            {/* Contact info */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-8">
              <a href="https://leadstreamhub.com/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] text-[#6ea8d8] transition hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                </svg>
                leadstreamhub.com
              </a>
              <a href="tel:9839552149"
                className="flex items-center gap-1.5 text-[12px] text-[#6ea8d8] transition hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.5 5.5l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                (983) 955-2149
              </a>
              <a href="mailto:info@leadstreamhub.com"
                className="flex items-center gap-1.5 text-[12px] text-[#6ea8d8] transition hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                info@leadstreamhub.com
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-[11px] text-[#8ba6cc]">
            © {new Date().getFullYear()} LeadStream Hub. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile cart bar */}
      <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden">
        <motion.button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          data-testid="button-mobile-cart"
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="blue-button focus-ring flex w-full items-center justify-between rounded-[14px] px-4 py-3.5 text-left text-white shadow-[0_12px_35px_rgba(0,0,0,.4)]"
        >
          <span className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-[#9af0fa]" />
            <span className="text-sm font-semibold">
              {itemCount ? `${itemCount} ${itemCount === 1 ? 'product' : 'products'} in cart` : 'Your cart is empty'}
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm font-bold">
            {itemCount ? money(subtotal) : 'View'} <ArrowRight className="h-4 w-4" />
          </span>
        </motion.button>
      </div>

      {/* Mobile cart sheet */}
      <AnimatePresence>
        {mobileCartOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end bg-[#050b14]/70 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setMobileCartOpen(false)}
          >
            <motion.div
              className="max-h-[88dvh] w-full overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 27, stiffness: 300 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#5a769b]" />
              <CartPanel
                mobile
                cart={cart}
                onChange={changeQuantity}
                onRemove={removeItem}
                onCheckout={goToCheckout}
                onBrowse={browsePackages}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-to-cart feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 12, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 8, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-50 flex items-center gap-2 rounded-full border border-[#3d6da1] bg-[#122a4a] px-4 py-2.5 text-xs font-semibold text-[#d9eeff] shadow-[0_12px_30px_rgba(0,0,0,.35)] sm:bottom-7"
            role="status"
            data-testid="status-cart-feedback"
          >
            <Check className="h-3.5 w-3.5 text-[#6ee4ee]" /> {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Home;
