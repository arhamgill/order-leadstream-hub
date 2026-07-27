import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  ExternalLink,
  Globe2,
  Loader2,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { CartItem } from '../types';
import {
  fetchSettings,
  createPaymentIntent,
  uploadFile,
  submitOrder,
  type AppSettings,
} from '../lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

const moneyFromDollars = (dollars: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dollars);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasProduct(cart: CartItem[], category: string, type: string) {
  return cart.some((i) => i.category === category && i.type === type);
}

function getPackageLabel(cart: CartItem[], category: string, type: string) {
  return cart
    .filter((i) => i.category === category && i.type === type)
    .map((i) => `${i.quantity} Pack — ${moneyFromDollars(i.price)}`)
    .join(', ');
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-3.5 py-2.5 text-sm text-white placeholder-[#4d6a8e] transition focus:border-[#3e7dda] focus:outline-none focus:ring-1 focus:ring-[#3e7dda]/30';
const errorInputClass =
  'w-full rounded-[10px] border border-[#a04040] bg-[#0d1b2e] px-3.5 py-2.5 text-sm text-white placeholder-[#4d6a8e] transition focus:border-[#f48c8c] focus:outline-none focus:ring-1 focus:ring-[#f48c8c]/30';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" data-testid="field-error" className="mt-1.5 text-[11px] font-medium text-[#f4a8a8]">{msg}</p>;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7a95ba]">
      {children}{required && <span className="ml-0.5 text-[#68d8f0]">*</span>}
    </label>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

// ─── States Multi-Select ──────────────────────────────────────────────────────

function StatesMultiSelect({ value, onChange, error, id }: {
  value: string[]; onChange: (v: string[]) => void; error?: string; id: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  const label = value.length === 0 ? 'Select states…' : value.length === US_STATES.length ? 'All states selected' : value.slice(0, 5).join(', ') + (value.length > 5 ? ` +${value.length - 5} more` : '');
  return (
    <div className="relative" ref={ref}>
      <button type="button" id={id} data-testid={`${id}-trigger`} onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border px-3.5 py-2.5 text-sm text-left transition bg-[#0d1b2e] text-white focus:outline-none focus:ring-1 focus:ring-[#3e7dda]/30 ${error ? 'border-[#a04040]' : 'border-[#243e62] focus:border-[#3e7dda]'}`}>
        <span className={value.length === 0 ? 'text-[#4d6a8e] truncate' : 'text-white truncate'}>{label}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-[#6291b8]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#6291b8]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-[13px] border border-[#243e62] bg-[#0d1b2e] shadow-[0_24px_60px_rgba(0,0,0,.5)]">
            <div className="flex items-center justify-between border-b border-[#1c3254] px-3.5 py-2.5">
              <span className="text-xs font-semibold text-[#7a95ba]">{value.length} selected</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => onChange([...US_STATES])} className="text-[11px] font-semibold text-[#62d8f0] hover:text-white transition">All</button>
                <button type="button" onClick={() => onChange([])} className="text-[11px] font-semibold text-[#62d8f0] hover:text-white transition">Clear</button>
                <button type="button" onClick={() => setOpen(false)} className="text-[#6291b8] hover:text-white transition"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div role="listbox" aria-multiselectable="true" className="scrollbar-subtle grid max-h-52 grid-cols-5 gap-px overflow-y-auto p-2">
              {US_STATES.map((state) => (
                <button key={state} type="button" role="option" aria-selected={value.includes(state)}
                  data-testid={`state-option-${state}`} onClick={() => toggle(state)}
                  className={`rounded-[7px] py-1.5 text-[11px] font-semibold transition ${value.includes(state) ? 'bg-[#1d5cc4] text-white' : 'text-[#7a95ba] hover:bg-[#172a47] hover:text-white'}`}>
                  {state}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Availability Picker ──────────────────────────────────────────────────────

function AvailabilityPicker({ days, onDaysChange, hours, onHoursChange, error, id }: {
  days: string[]; onDaysChange: (d: string[]) => void;
  hours: string; onHoursChange: (v: string) => void;
  error?: string; id: string;
}) {
  const toggle = (day: string) => onDaysChange(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((day) => (
          <button key={day} type="button" data-testid={`${id}-day-${day.toLowerCase()}`} onClick={() => toggle(day)}
            className={`rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition ${days.includes(day) ? 'bg-[#1d5cc4] text-white shadow-[0_4px_12px_rgba(29,92,196,.3)]' : 'border border-[#243e62] bg-[#0d1b2e] text-[#7a95ba] hover:bg-[#142644] hover:text-white'}`}>
            {day.slice(0, 3)}
          </button>
        ))}
      </div>
      <input id={`${id}-hours`} type="text" data-testid={`${id}-hours`} value={hours} onChange={(e) => onHoursChange(e.target.value)}
        placeholder="e.g. 9:00 AM – 5:00 PM EST" className={error ? errorInputClass : inputClass} />
    </div>
  );
}

// ─── Radio Group ──────────────────────────────────────────────────────────────

function RadioGroup({ name, options, register: reg, error }: {
  name: string; options: string[];
  register: (name: string, opts?: object) => object;
  error?: string;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-3.5 py-2.5 text-sm font-semibold text-white transition has-[:checked]:border-[#3e7dda] has-[:checked]:bg-[#0f2044]">
            <input type="radio" value={opt} className="accent-[#3e7dda]"
              data-testid={`radio-${name}-${opt.toLowerCase().replaceAll(' ', '-')}`}
              {...(reg as (n: string, o?: object) => object)(name, { required: 'This field is required.' })} />
            {opt}
          </label>
        ))}
      </div>
      <FieldError msg={error} />
    </>
  );
}

// ─── Override badge ───────────────────────────────────────────────────────────

function OverrideBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all ${active ? 'bg-[#3d2800] text-[#fbbf24] border border-[#7c4a00]' : 'bg-[#0c2240] text-[#62d8f0] border border-[#1a4472]'}`}>
      {active ? <Settings2 className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
      {active ? 'Custom Settings' : 'Using Default Settings'}
    </span>
  );
}

// ─── Section cards ────────────────────────────────────────────────────────────

function CustomerCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.fieldset initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="glass-panel rounded-[20px] p-6 sm:p-7">
      <div className="mb-6">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#62d8f0]">Required</div>
        <legend className="font-display text-base font-semibold text-white">Customer Information</legend>
      </div>
      <div className="space-y-5">{children}</div>
    </motion.fieldset>
  );
}

function DefaultSettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.fieldset initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.06 }}
      className="rounded-[20px] border border-[#2a5fa8]/40 bg-gradient-to-br from-[#0d2550]/90 to-[#081c3c]/90 p-6 shadow-[0_0_0_1px_rgba(42,95,168,.1),0_24px_60px_rgba(0,0,0,.3)] backdrop-blur-xl sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#2a5fa8]/50 bg-[#0e2448] text-[#62d8f0]">
          <Globe2 className="h-4 w-4" />
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#62d8f0]">Applied globally</div>
          <legend className="font-display text-base font-semibold text-white">Default Order Settings</legend>
        </div>
      </div>
      <p className="mb-6 rounded-[10px] border border-[#1c3a6a]/60 bg-[#0a1e3a]/60 px-4 py-3 text-xs leading-5 text-[#7a9cc8]">
        These settings will automatically apply to every product in your cart. If you need different settings for a specific product, you can override them inside that product section.
      </p>
      <div className="space-y-5">{children}</div>
    </motion.fieldset>
  );
}

function ProductSectionCard({ title, badge, override, children, overrideToggle, overrideFields }: {
  title: string; badge: string; override: boolean;
  children: React.ReactNode; overrideToggle: React.ReactNode; overrideFields: React.ReactNode;
}) {
  return (
    <motion.fieldset initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="glass-panel rounded-[20px] overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[#1d3558] px-6 py-4 sm:px-7">
        <div>
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62d8f0]">{badge}</div>
          <legend className="font-display text-sm font-semibold text-white">{title}</legend>
        </div>
        <OverrideBadge active={override} />
      </div>
      <div className="space-y-5 p-6 sm:p-7">{children}</div>
      <div className="border-t border-[#1d3558] px-6 pb-6 pt-5 sm:px-7">
        {overrideToggle}
        <AnimatePresence>
          {override && (
            <motion.div key="ov" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="mt-5 space-y-5 rounded-[12px] border border-[#3d2800]/60 bg-[#1a1200]/40 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fbbf24]/80">Custom overrides for this product</div>
                {overrideFields}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.fieldset>
  );
}

// ─── Order Summary Sidebar ────────────────────────────────────────────────────

function OrderSummary({ cart, paymentMethod, onEdit }: {
  cart: CartItem[]; paymentMethod: 'card' | 'zelle' | null; onEdit: () => void;
}) {
  const subtotalDollars = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotalCents   = subtotalDollars * 100;
  const feeCents        = paymentMethod === 'card'  ? Math.round(subtotalCents * 0.05) : 0;
  const discountCents   = paymentMethod === 'zelle' ? Math.round(subtotalCents * 0.10) : 0;
  const totalCents      = subtotalCents + feeCents - discountCents;

  return (
    <aside className="glass-panel overflow-hidden rounded-[20px]" aria-label="Order summary">
      <div className="border-b border-[#1d3558] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#62d8f0]" />
          <span className="font-display text-sm font-semibold text-white">Order Summary</span>
          <span className="ml-auto rounded-full bg-[#1d5cc4] px-2 py-0.5 text-[10px] font-bold text-white">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>
      <div className="px-5 py-4 sm:px-6">
        <div className="space-y-2.5">
          {cart.map((item) => (
            <div key={item.lineId} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#62d8f0]" />
                <span className="text-[11px] font-semibold leading-5 text-white">{item.quantity} {item.category} {item.type}</span>
              </div>
              <span className="font-display text-[11px] font-semibold text-[#d8eaff] shrink-0">{moneyFromDollars(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-[#1d3558] pt-4 text-[11px]">
          <div className="flex justify-between text-[#7a95ba]">
            <span>Subtotal</span>
            <span className="font-display font-semibold text-white">{moneyFromDollars(subtotalDollars)}</span>
          </div>
          {feeCents > 0 && (
            <div className="flex justify-between text-[#f4a8a8]">
              <span>Processing Fee (5%)</span>
              <span className="font-display font-semibold">+{money(feeCents)}</span>
            </div>
          )}
          {discountCents > 0 && (
            <div className="flex justify-between text-[#62d8f0]">
              <span>Zelle Discount (10%)</span>
              <span className="font-display font-semibold">−{money(discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#1d3558] pt-2.5 text-[12px]">
            <span className="font-semibold text-white">Grand Total</span>
            <span className="font-display font-bold text-white">{money(totalCents)}</span>
          </div>
          {paymentMethod && (
            <div className="flex items-center justify-between text-[#7a95ba]">
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Payment</span>
              <span className="font-semibold text-[#8fa6c4]">{paymentMethod === 'card' ? 'Card' : 'Zelle'}</span>
            </div>
          )}
        </div>
        <button type="button" data-testid="button-edit-order" onClick={onEdit}
          className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#243e62] py-2 text-xs font-semibold text-[#7a95ba] transition hover:bg-[#142644] hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Edit Order
        </button>
      </div>
    </aside>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ cart, orderNumber, paymentMethod, onBackToShop }: {
  cart: CartItem[]; orderNumber: string; paymentMethod: 'card' | 'zelle'; onBackToShop: () => void;
}) {
  const subtotalDollars = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const subtotalCents   = subtotalDollars * 100;
  const feeCents        = paymentMethod === 'card'  ? Math.round(subtotalCents * 0.05) : 0;
  const discountCents   = paymentMethod === 'zelle' ? Math.round(subtotalCents * 0.10) : 0;
  const totalCents      = subtotalCents + feeCents - discountCents;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[22px] bg-[#1a4caa] shadow-[0_14px_40px_rgba(29,92,196,.4)]">
        <BadgeCheck className="h-10 w-10 text-[#7de8f4]" strokeWidth={1.6} />
      </div>
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#62d8f0]">Order Confirmed</div>
      <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Thank You!</h2>
      <p className="mt-4 max-w-[460px] text-sm leading-7 text-[#8fa6c4]">
        Your order has been successfully submitted. You will receive a confirmation email within the next <strong className="text-white">10–15 minutes</strong>.
        Our onboarding team will review your order and contact you if any additional information is required.
        We look forward to building a long-term partnership with you.
      </p>

      <div className="mt-8 w-full max-w-[440px] rounded-[16px] border border-[#243e62] bg-[#0d1b2e] p-5 text-left">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a95ba]">Order Details</div>
          <span className="rounded-full border border-[#1a4472] bg-[#0c2240] px-3 py-0.5 text-[11px] font-bold text-[#62d8f0]">{orderNumber}</span>
        </div>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.lineId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="h-3 w-3 shrink-0 text-[#62d8f0]" />
                <span className="text-xs text-[#8fa6c4] truncate">{item.quantity} {item.category} {item.type}</span>
              </div>
              <span className="font-display text-xs font-semibold text-white shrink-0">{moneyFromDollars(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-[#1d3558] pt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#7a95ba]">Subtotal</span>
            <span className="text-white">{moneyFromDollars(subtotalDollars)}</span>
          </div>
          {feeCents > 0 && <div className="flex items-center justify-between text-[11px]"><span className="text-[#f4a8a8]">Processing Fee (5%)</span><span className="text-[#f4a8a8]">+{money(feeCents)}</span></div>}
          {discountCents > 0 && <div className="flex items-center justify-between text-[11px]"><span className="text-[#62d8f0]">Zelle Discount (10%)</span><span className="text-[#62d8f0]">−{money(discountCents)}</span></div>}
          <div className="flex items-center justify-between border-t border-[#1d3558] pt-2">
            <span className="text-xs font-semibold text-[#7a95ba]">Grand Total</span>
            <span className="font-display text-sm font-bold text-white">{money(totalCents)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#7a95ba]">Payment Method</span>
            <span className="text-white font-semibold">{paymentMethod === 'card' ? 'Credit / Debit Card' : 'Zelle Transfer'}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-full border border-[#243e62] bg-[#0d1b2e] px-4 py-2.5">
        <ShieldCheck className="h-4 w-4 text-[#62d8f0]" />
        <span className="text-xs font-semibold text-[#7a95ba]">Exclusive. Never recycled.</span>
      </div>
      <button type="button" data-testid="button-back-to-shop" onClick={onBackToShop}
        className="focus-ring mt-8 flex items-center gap-2 rounded-full border border-[#2c456a] px-5 py-2.5 text-sm font-semibold text-[#b5d0f2] transition hover:bg-[#142644]">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </button>
    </motion.div>
  );
}

// ─── Checkout Header ──────────────────────────────────────────────────────────

function CheckoutHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-5 py-5 sm:px-8 lg:px-10">
      <button type="button" data-testid="button-back-to-catalog" onClick={onBack}
        className="focus-ring flex items-center gap-1.5 rounded-full border border-[#243e62] px-3.5 py-2 text-xs font-semibold text-[#7a95ba] transition hover:bg-[#142644] hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2.5">
        <span className="font-display text-[13px] font-semibold text-white">leadstream</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#62d8f0]">checkout</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#5a7999]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#62d8f0]" /> Secure order form
      </div>
    </header>
  );
}

// ─── Card Payment Panel (PaymentElement with its own Elements context) ────────

interface CardPaymentPanelHandle {
  confirmCardPayment(billingDetails: {
    name: string; email: string; phone: string;
  }): Promise<{ paymentIntentId: string } | { error: string }>;
}

// Inner — must live inside <Elements options={{ clientSecret }}>
const CardPaymentInner = forwardRef<CardPaymentPanelHandle, { cardError: string }>(
  ({ cardError }, ref) => {
    const stripe   = useStripe();
    const elements = useElements();

    useImperativeHandle(ref, () => ({
      async confirmCardPayment(billingDetails) {
        if (!stripe || !elements) return { error: 'Stripe not loaded. Please refresh.' };

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
            payment_method_data: {
              billing_details: {
                name: billingDetails.name,
                email: billingDetails.email,
                phone: billingDetails.phone,
              },
            },
          },
          redirect: 'if_required',
        });

        if (error) return { error: error.message ?? 'Payment failed.' };
        if (paymentIntent?.status === 'succeeded') return { paymentIntentId: paymentIntent.id };
        return { error: `Payment did not complete (status: ${paymentIntent?.status ?? 'unknown'}).` };
      },
    }));

    return (
      <div className="space-y-3">
        <PaymentElement options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'never', email: 'never', phone: 'never' } },
        }} />
        {cardError && <FieldError msg={cardError} />}
      </div>
    );
  }
);
CardPaymentInner.displayName = 'CardPaymentInner';

// Outer wrapper — creates its own Elements context with clientSecret
type StripePromise = ReturnType<typeof loadStripe> | null;
const CardPaymentPanel = forwardRef<
  CardPaymentPanelHandle,
  { stripePromise: StripePromise; clientSecret: string; cardError: string }
>(({ stripePromise, clientSecret, cardError }, ref) => (
  <Elements
    stripe={stripePromise}
    options={{
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary:      '#3e7dda',
          colorBackground:   '#0d1b2e',
          colorText:         '#e0eaff',
          colorDanger:       '#f4a8a8',
          fontFamily:        'DM Sans, sans-serif',
          borderRadius:      '10px',
        },
      },
    }}
  >
    <CardPaymentInner ref={ref} cardError={cardError} />
  </Elements>
));
CardPaymentPanel.displayName = 'CardPaymentPanel';

// ─── Form Types ───────────────────────────────────────────────────────────────

type FormValues = {
  firstName: string; lastName: string; agencyName: string; phone: string; email: string;
  default_startDate: string; default_availHours: string; default_agencyMention: string;
  fe_cb_override: boolean; fe_lt_override: boolean; fe_pc_override: boolean;
  mc_cb_override: boolean; mc_lt_override: boolean;
  fe_cb_deliveryDate: string; fe_cb_format: string;
  fe_cb_ov_startDate: string; fe_cb_ov_agencyMention: string;
  fe_lt_phone: string; fe_lt_callsPerDay: string;
  fe_lt_ov_startDate: string; fe_lt_ov_availHours: string;
  fe_pc_carriers: string;
  fe_pc_ov_startDate: string; fe_pc_ov_availHours: string;
  mc_cb_leadType: string; mc_cb_deliveryDate: string; mc_cb_format: string;
  mc_cb_ov_startDate: string; mc_cb_ov_agencyMention: string;
  mc_lt_leadType: string; mc_lt_phone: string; mc_lt_callsPerDay: string;
  mc_lt_ov_startDate: string; mc_lt_ov_availHours: string;
  additionalInstructions: string;
  agreedToTerms: boolean;
};

// ─── Inner Checkout Form (must be inside <Elements>) ─────────────────────────

function InnerCheckoutForm({ cart, onBack, settings, stripePromise }: {
  cart: CartItem[]; onBack: () => void; settings: AppSettings | null;
  stripePromise: StripePromise;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'zelle' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cardError, setCardError] = useState('');

  // Card payment via PaymentElement
  const cardPanelRef     = useRef<CardPaymentPanelHandle>(null);
  const [cardClientSecret, setCardClientSecret] = useState('');
  const [cardPICreating,   setCardPICreating]   = useState(false);

  // Zelle screenshot state
  const [zelleFile, setZelleFile]     = useState<File | null>(null);
  const [zelleFileId, setZelleFileId] = useState('');
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadDone, setUploadDone]   = useState(false);
  const zelleInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Computed totals
  const subtotalCents = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity * 100, 0),
    [cart]
  );
  const zelleSubtotalCents = subtotalCents;
  const zelleDiscountCents = Math.round(subtotalCents * 0.10);
  const zelleTotalCents    = subtotalCents - zelleDiscountCents;
  const cardTotalCents     = subtotalCents + Math.round(subtotalCents * 0.05);

  // Product presence
  const hasFeCb = hasProduct(cart, 'Final Expense', 'Callback Leads');
  const hasFeLt = hasProduct(cart, 'Final Expense', 'Live Transfers');
  const hasFePc = hasProduct(cart, 'Final Expense', 'Pre Closed Applications');
  const hasMcCb = hasProduct(cart, 'Medicare', 'Callback Leads');
  const hasMcLt = hasProduct(cart, 'Medicare', 'Live Transfers');

  // Multi-select / day arrays (managed outside RHF)
  const [defaultStates,    setDefaultStates]    = useState<string[]>([]);
  const [defaultAvailDays, setDefaultAvailDays] = useState<string[]>([]);
  const [feCbOvStates,     setFeCbOvStates]     = useState<string[]>([]);
  const [feLtOvStates,     setFeLtOvStates]     = useState<string[]>([]);
  const [feLtOvDays,       setFeLtOvDays]       = useState<string[]>([]);
  const [fePcOvStates,     setFePcOvStates]     = useState<string[]>([]);
  const [fePcOvDays,       setFePcOvDays]       = useState<string[]>([]);
  const [mcCbOvStates,     setMcCbOvStates]     = useState<string[]>([]);
  const [mcLtOvStates,     setMcLtOvStates]     = useState<string[]>([]);
  const [mcLtOvDays,       setMcLtOvDays]       = useState<string[]>([]);

  const [extraErrors, setExtraErrors] = useState<Record<string, string>>({});

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    shouldUnregister: true,
    defaultValues: {
      firstName: '', lastName: '', agencyName: '', phone: '', email: '',
      default_startDate: '', default_availHours: '', default_agencyMention: '',
      fe_cb_override: false, fe_lt_override: false, fe_pc_override: false,
      mc_cb_override: false, mc_lt_override: false,
      fe_cb_deliveryDate: '', fe_cb_format: '',
      fe_cb_ov_startDate: '', fe_cb_ov_agencyMention: '',
      fe_lt_phone: '', fe_lt_callsPerDay: '',
      fe_lt_ov_startDate: '', fe_lt_ov_availHours: '',
      fe_pc_carriers: '',
      fe_pc_ov_startDate: '', fe_pc_ov_availHours: '',
      mc_cb_leadType: '', mc_cb_deliveryDate: '', mc_cb_format: '',
      mc_cb_ov_startDate: '', mc_cb_ov_agencyMention: '',
      mc_lt_leadType: '', mc_lt_phone: '', mc_lt_callsPerDay: '',
      mc_lt_ov_startDate: '', mc_lt_ov_availHours: '',
      additionalInstructions: '', agreedToTerms: false,
    },
  });

  const feCbOverride = watch('fe_cb_override');
  const feLtOverride = watch('fe_lt_override');
  const fePcOverride = watch('fe_pc_override');
  const mcCbOverride = watch('mc_cb_override');
  const mcLtOverride = watch('mc_lt_override');

  // ── Create PaymentIntent when card is selected ──
  useEffect(() => {
    if (paymentMethod !== 'card' || cardClientSecret || cardPICreating || !cardTotalCents) return;
    setCardPICreating(true);
    setCardError('');
    const firstName = watch('firstName');
    const lastName  = watch('lastName');
    const email     = watch('email');
    createPaymentIntent(cardTotalCents, {
      email: email || undefined,
      name: `${firstName} ${lastName}`.trim() || undefined,
    })
      .then(({ client_secret }) => setCardClientSecret(client_secret))
      .catch(() => setCardError('Could not initialize card payment. Please refresh and try again.'))
      .finally(() => setCardPICreating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  // ── Handle Zelle screenshot upload ──
  const handleFileSelect = async (file: File) => {
    setZelleFile(file);
    setUploadError('');
    setUploadDone(false);
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setZelleFileId(result.file_id);
      setUploadDone(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // ── Main submit ──
  const onFormValid = async (data: FormValues) => {
    // Validate extras
    const errs: Record<string, string> = {};
    if (!paymentMethod)                       errs.paymentMethod     = 'Please select a payment method.';
    if (paymentMethod === 'zelle' && !uploadDone) errs.zelleScreenshot = 'Please upload your payment screenshot.';
    if (defaultStates.length === 0)           errs.default_states    = 'Please select at least one state.';
    if (defaultAvailDays.length === 0)        errs.default_availDays = 'Please select at least one day.';
    if (hasFeCb && feCbOverride && feCbOvStates.length === 0) errs.fe_cb_ov_states = 'Please select at least one state.';
    if (hasFeLt && feLtOverride && feLtOvStates.length === 0) errs.fe_lt_ov_states = 'Please select at least one state.';
    if (hasFeLt && feLtOverride && feLtOvDays.length === 0)   errs.fe_lt_ov_days   = 'Please select at least one day.';
    if (hasFePc && fePcOverride && fePcOvStates.length === 0) errs.fe_pc_ov_states = 'Please select at least one state.';
    if (hasFePc && fePcOverride && fePcOvDays.length === 0)   errs.fe_pc_ov_days   = 'Please select at least one day.';
    if (hasMcCb && mcCbOverride && mcCbOvStates.length === 0) errs.mc_cb_ov_states = 'Please select at least one state.';
    if (hasMcLt && mcLtOverride && mcLtOvStates.length === 0) errs.mc_lt_ov_states = 'Please select at least one state.';
    if (hasMcLt && mcLtOverride && mcLtOvDays.length === 0)   errs.mc_lt_ov_days   = 'Please select at least one day.';
    if (Object.keys(errs).length > 0) {
      setExtraErrors(errs);
      // Scroll to the first failing field so the user can see the error
      setTimeout(() => {
        const firstKey = Object.keys(errs)[0];
        const el = document.getElementById(firstKey) ?? document.querySelector(`[data-error="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
      return;
    }
    setExtraErrors({});
    setSubmitting(true);
    setSubmitError('');
    setCardError('');

    try {
      // Build cart items for API
      const subtotalCents = cart.reduce((s, i) => s + i.price * i.quantity * 100, 0);
      const feeCents      = paymentMethod === 'card'  ? Math.round(subtotalCents * 0.05) : 0;
      const discountCents = paymentMethod === 'zelle' ? Math.round(subtotalCents * 0.10) : 0;
      const totalCents    = subtotalCents + feeCents - discountCents;

      const items = cart.map((i) => ({
        category: i.category, type: i.type, quantity: i.quantity,
        price_cents: i.price * i.quantity * 100,
        savings_cents: (i.savings ?? 0) * i.quantity * 100,
      }));

      const defaultSettings = {
        states: defaultStates, start_date: data.default_startDate,
        avail_days: defaultAvailDays, avail_hours: data.default_availHours,
        agency_mention: data.default_agencyMention,
      };

      const productAnswers: Record<string, Record<string, unknown>> = {};
      if (hasFeCb) productAnswers.fe_cb = { override: feCbOverride, delivery_date: data.fe_cb_deliveryDate, format: data.fe_cb_format, ...(feCbOverride ? { ov_states: feCbOvStates, ov_start_date: data.fe_cb_ov_startDate, ov_agency_mention: data.fe_cb_ov_agencyMention } : {}) };
      if (hasFeLt) productAnswers.fe_lt = { override: feLtOverride, phone: data.fe_lt_phone, calls_per_day: data.fe_lt_callsPerDay, ...(feLtOverride ? { ov_states: feLtOvStates, ov_start_date: data.fe_lt_ov_startDate, ov_avail_days: feLtOvDays, ov_avail_hours: data.fe_lt_ov_availHours } : {}) };
      if (hasFePc) productAnswers.fe_pc = { override: fePcOverride, carriers: data.fe_pc_carriers, ...(fePcOverride ? { ov_states: fePcOvStates, ov_start_date: data.fe_pc_ov_startDate, ov_avail_days: fePcOvDays, ov_avail_hours: data.fe_pc_ov_availHours } : {}) };
      if (hasMcCb) productAnswers.mc_cb = { override: mcCbOverride, lead_type: data.mc_cb_leadType, delivery_date: data.mc_cb_deliveryDate, format: data.mc_cb_format, ...(mcCbOverride ? { ov_states: mcCbOvStates, ov_start_date: data.mc_cb_ov_startDate, ov_agency_mention: data.mc_cb_ov_agencyMention } : {}) };
      if (hasMcLt) productAnswers.mc_lt = { override: mcLtOverride, lead_type: data.mc_lt_leadType, phone: data.mc_lt_phone, calls_per_day: data.mc_lt_callsPerDay, ...(mcLtOverride ? { ov_states: mcLtOvStates, ov_start_date: data.mc_lt_ov_startDate, ov_avail_days: mcLtOvDays, ov_avail_hours: data.mc_lt_ov_availHours } : {}) };

      const basePayload = {
        customer: { first_name: data.firstName, last_name: data.lastName, agency_name: data.agencyName || undefined, phone: data.phone, email: data.email },
        items, default_settings: defaultSettings, product_answers: productAnswers,
        additional_instructions: data.additionalInstructions || undefined,
      };

      let orderNum = '';

      if (paymentMethod === 'card') {
        if (!cardPanelRef.current || !cardClientSecret) {
          setSubmitError('Card payment form not ready. Please wait a moment and try again.');
          setSubmitting(false);
          return;
        }

        // stripe.confirmPayment() via PaymentElement (inside CardPaymentPanel)
        const payResult = await cardPanelRef.current.confirmCardPayment({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
        });

        if ('error' in payResult) {
          setCardError(payResult.error);
          setSubmitting(false);
          return;
        }

        // Payment succeeded — now create the order server-side
        const result = await submitOrder({
          ...basePayload,
          payment: { method: 'card', payment_intent_id: payResult.paymentIntentId },
        });
        orderNum = result.order_number;
      } else {
        // Zelle
        const result = await submitOrder({
          ...basePayload,
          payment: { method: 'zelle', zelle_file_id: zelleFileId },
        });
        orderNum = result.order_number;
      }

      setOrderNumber(orderNum);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="portal-shell min-h-[100dvh]">
        <CheckoutHeader onBack={onBack} />
        <main className="mx-auto w-full max-w-[860px] px-5 pb-24 sm:px-8">
          <SuccessScreen cart={cart} orderNumber={orderNumber} paymentMethod={paymentMethod!} onBackToShop={onBack} />
        </main>
      </div>
    );
  }

  // ── Helpers for rendering ──
  const today = new Date().toISOString().split('T')[0];
  const dateInput = (id: string, testId: string, regName: keyof FormValues, required?: boolean) => (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
      <input id={id} type="date" data-testid={testId} min={today}
        className={`pl-9 ${((errors[regName] || extraErrors[regName]) ? errorInputClass : inputClass)}`}
        {...register(regName as Parameters<typeof register>[0], required ? { required: 'Date is required.' } : {})} />
      <FieldError msg={errors[regName]?.message as string | undefined} />
    </div>
  );

  const overrideToggle = (name: keyof FormValues) => (
    <label className="flex cursor-pointer items-center gap-3" data-testid={`toggle-${name}`}>
      <input type="checkbox" className="h-4 w-4 cursor-pointer rounded accent-[#e8a020]"
        data-testid={`checkbox-${name}`} {...register(name as Parameters<typeof register>[0])} />
      <span className="text-xs font-semibold text-[#8fa6c4]">Override Default Settings for this product</span>
    </label>
  );

  return (
    <motion.div className="portal-shell min-h-[100dvh]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <CheckoutHeader onBack={onBack} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-28 sm:px-8 lg:px-10">
        <div className="mb-8 pt-10">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#62d8f0]">Secure Order Form</div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Complete Your Order</h1>
          <p className="mt-2 text-sm text-[#7a95ba]">Fill in your details and select a payment method. Your order will be processed immediately.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <form
            onSubmit={handleSubmit(onFormValid, (fieldErrors) => {
              // RHF field validation failed — surface errors near the Submit button and scroll to first one
              const rhfMessages: Record<string, string> = {};
              Object.entries(fieldErrors).forEach(([k, v]) => {
                const msg = (v as { message?: string })?.message;
                if (msg) rhfMessages[k] = msg;
              });
              setExtraErrors(rhfMessages);
              const firstKey = Object.keys(fieldErrors)[0];
              const el =
                document.querySelector<HTMLElement>(`[name="${firstKey}"]`) ??
                document.getElementById(firstKey);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus();
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            })}
            noValidate data-testid="form-checkout" className="space-y-5">

            {/* ── Customer Info ── */}
            <CustomerCard>
              <Row2>
                <div>
                  <Label htmlFor="firstName" required>First Name</Label>
                  <input id="firstName" data-testid="input-first-name" placeholder="John"
                    className={errors.firstName ? errorInputClass : inputClass}
                    {...register('firstName', { required: 'First name is required.' })} />
                  <FieldError msg={errors.firstName?.message} />
                </div>
                <div>
                  <Label htmlFor="lastName" required>Last Name</Label>
                  <input id="lastName" data-testid="input-last-name" placeholder="Smith"
                    className={errors.lastName ? errorInputClass : inputClass}
                    {...register('lastName', { required: 'Last name is required.' })} />
                  <FieldError msg={errors.lastName?.message} />
                </div>
              </Row2>
              <div>
                <Label htmlFor="agencyName">Agency Name</Label>
                <input id="agencyName" data-testid="input-agency-name" placeholder="Smith Insurance Agency"
                  className={inputClass} {...register('agencyName')} />
              </div>
              <Row2>
                <div>
                  <Label htmlFor="phone" required>Phone</Label>
                  <input id="phone" type="tel" data-testid="input-phone" placeholder="(555) 000-0000"
                    className={errors.phone ? errorInputClass : inputClass}
                    {...register('phone', { required: 'Phone is required.', pattern: { value: /^[\d\s\-().+]{7,20}$/, message: 'Invalid phone number.' } })} />
                  <FieldError msg={errors.phone?.message} />
                </div>
                <div>
                  <Label htmlFor="email" required>Email</Label>
                  <input id="email" type="email" data-testid="input-email" placeholder="john@agency.com"
                    className={errors.email ? errorInputClass : inputClass}
                    {...register('email', { required: 'Email is required.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address.' } })} />
                  <FieldError msg={errors.email?.message} />
                </div>
              </Row2>
            </CustomerCard>

            {/* ── Default Order Settings ── */}
            <DefaultSettingsCard>
              <div>
                <Label htmlFor="default_states" required>Licensed States</Label>
                <StatesMultiSelect id="default_states" value={defaultStates} onChange={setDefaultStates} error={extraErrors.default_states} />
                <FieldError msg={extraErrors.default_states} />
              </div>
              <div>
                <Label htmlFor="default_startDate" required>Preferred Start Date</Label>
                {dateInput('default_startDate', 'input-default-start-date', 'default_startDate', true)}
              </div>
              <div>
                <Label htmlFor="default_avail" required>Availability</Label>
                <AvailabilityPicker id="default_avail" days={defaultAvailDays} onDaysChange={setDefaultAvailDays}
                  hours={''} onHoursChange={() => {}} error={extraErrors.default_availDays} />
                <FieldError msg={extraErrors.default_availDays} />
              </div>
              <div>
                <Label htmlFor="default_agencyMention">Agency Name to Mention to Prospects <span className="text-[#5a7999] font-normal">(optional)</span></Label>
                <input id="default_agencyMention" data-testid="input-default-agency-mention"
                  placeholder="The name your agents use when calling prospects"
                  className={inputClass}
                  {...register('default_agencyMention')} />
                <FieldError msg={errors.default_agencyMention?.message} />
              </div>
            </DefaultSettingsCard>

            {/* ── FE Callback ── */}
            {hasFeCb && (
              <ProductSectionCard title="Final Expense — Callback Leads" badge="Product Details" override={!!feCbOverride}
                overrideToggle={overrideToggle('fe_cb_override')}
                overrideFields={<>
                  <div><Label htmlFor="fe_cb_ov_states" required>Licensed States</Label>
                    <StatesMultiSelect id="fe_cb_ov_states" value={feCbOvStates} onChange={setFeCbOvStates} error={extraErrors.fe_cb_ov_states} />
                    <FieldError msg={extraErrors.fe_cb_ov_states} /></div>
                  <div><Label htmlFor="fe_cb_ov_startDate" required>Preferred Start Date</Label>
                    {dateInput('fe_cb_ov_startDate', 'input-fe-cb-ov-start', 'fe_cb_ov_startDate', false)}</div>
                  <div><Label htmlFor="fe_cb_ov_agencyMention" required>Agency Name to Mention</Label>
                    <input id="fe_cb_ov_agencyMention" placeholder="Override agency name" className={errors.fe_cb_ov_agencyMention ? errorInputClass : inputClass}
                      {...register('fe_cb_ov_agencyMention', { required: feCbOverride ? 'Required.' : false })} />
                    <FieldError msg={errors.fe_cb_ov_agencyMention?.message} /></div>
                </>}>
                <div><Label htmlFor="fe_cb_package">Package</Label>
                  <div id="fe_cb_package" data-testid="display-fe-cb-package" className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]">{getPackageLabel(cart, 'Final Expense', 'Callback Leads')}</div></div>
                <div><Label htmlFor="fe_cb_deliveryDate">Preferred Delivery Date</Label>
                  {dateInput('fe_cb_deliveryDate', 'input-fe-cb-delivery', 'fe_cb_deliveryDate', false)}</div>
                <div><Label htmlFor="fe_cb_format" required>Delivery Format</Label>
                  <RadioGroup name="fe_cb_format" options={['CSV','PDF']} register={register as (n: string, o?: object) => object} error={errors.fe_cb_format?.message} /></div>
              </ProductSectionCard>
            )}

            {/* ── FE Live Transfers ── */}
            {hasFeLt && (
              <ProductSectionCard title="Final Expense — Live Transfers" badge="Product Details" override={!!feLtOverride}
                overrideToggle={overrideToggle('fe_lt_override')}
                overrideFields={<>
                  <div><Label htmlFor="fe_lt_ov_states" required>Licensed States</Label>
                    <StatesMultiSelect id="fe_lt_ov_states" value={feLtOvStates} onChange={setFeLtOvStates} error={extraErrors.fe_lt_ov_states} />
                    <FieldError msg={extraErrors.fe_lt_ov_states} /></div>
                  <div><Label htmlFor="fe_lt_ov_startDate" required>Preferred Start Date</Label>
                    {dateInput('fe_lt_ov_startDate', 'input-fe-lt-ov-start', 'fe_lt_ov_startDate', false)}</div>
                  <div><Label htmlFor="fe_lt_ov_avail" required>Availability</Label>
                    <AvailabilityPicker id="fe_lt_ov_avail" days={feLtOvDays} onDaysChange={setFeLtOvDays} hours={''} onHoursChange={() => {}} error={extraErrors.fe_lt_ov_days} />
                    <FieldError msg={extraErrors.fe_lt_ov_days} /></div>
                </>}>
                <div><Label htmlFor="fe_lt_package">Package</Label>
                  <div id="fe_lt_package" data-testid="display-fe-lt-package" className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]">{getPackageLabel(cart, 'Final Expense', 'Live Transfers')}</div></div>
                <Row2>
                  <div><Label htmlFor="fe_lt_phone" required>Transfer Phone Number</Label>
                    <input id="fe_lt_phone" type="tel" data-testid="input-fe-lt-phone" placeholder="(555) 000-0000"
                      className={errors.fe_lt_phone ? errorInputClass : inputClass}
                      {...register('fe_lt_phone', { required: 'Transfer phone is required.', pattern: { value: /^[\d\s\-().+]{7,20}$/, message: 'Invalid phone.' } })} />
                    <FieldError msg={errors.fe_lt_phone?.message} /></div>
                  <div><Label htmlFor="fe_lt_callsPerDay" required>Calls Per Day</Label>
                    <input id="fe_lt_callsPerDay" type="number" min="1" data-testid="input-fe-lt-calls" placeholder="e.g. 10"
                      className={errors.fe_lt_callsPerDay ? errorInputClass : inputClass}
                      {...register('fe_lt_callsPerDay', { required: 'Required.', min: { value: 1, message: 'Min 1.' } })} />
                    <FieldError msg={errors.fe_lt_callsPerDay?.message} /></div>
                </Row2>
              </ProductSectionCard>
            )}

            {/* ── FE Pre Closed ── */}
            {hasFePc && (
              <ProductSectionCard title="Final Expense — Pre Closed Applications" badge="Product Details" override={!!fePcOverride}
                overrideToggle={overrideToggle('fe_pc_override')}
                overrideFields={<>
                  <div><Label htmlFor="fe_pc_ov_states" required>Licensed States</Label>
                    <StatesMultiSelect id="fe_pc_ov_states" value={fePcOvStates} onChange={setFePcOvStates} error={extraErrors.fe_pc_ov_states} />
                    <FieldError msg={extraErrors.fe_pc_ov_states} /></div>
                  <div><Label htmlFor="fe_pc_ov_startDate" required>Preferred Start Date</Label>
                    {dateInput('fe_pc_ov_startDate', 'input-fe-pc-ov-start', 'fe_pc_ov_startDate', false)}</div>
                  <div><Label htmlFor="fe_pc_ov_avail" required>Availability</Label>
                    <AvailabilityPicker id="fe_pc_ov_avail" days={fePcOvDays} onDaysChange={setFePcOvDays} hours={''} onHoursChange={() => {}} error={extraErrors.fe_pc_ov_days} />
                    <FieldError msg={extraErrors.fe_pc_ov_days} /></div>
                </>}>
                <div><Label htmlFor="fe_pc_package">Package</Label>
                  <div id="fe_pc_package" data-testid="display-fe-pc-package" className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]">{getPackageLabel(cart, 'Final Expense', 'Pre Closed Applications')}</div></div>
                <div><Label htmlFor="fe_pc_carriers" required>Carriers</Label>
                  <textarea id="fe_pc_carriers" rows={3} data-testid="input-fe-pc-carriers"
                    className={`resize-none ${errors.fe_pc_carriers ? errorInputClass : inputClass}`}
                    placeholder="List the insurance carriers you are contracted with…"
                    {...register('fe_pc_carriers', { required: 'Please list your contracted carriers.' })} />
                  <FieldError msg={errors.fe_pc_carriers?.message} /></div>
              </ProductSectionCard>
            )}

            {/* ── Medicare Callback ── */}
            {hasMcCb && (
              <ProductSectionCard title="Medicare — Callback Leads" badge="Product Details" override={!!mcCbOverride}
                overrideToggle={overrideToggle('mc_cb_override')}
                overrideFields={<>
                  <div><Label htmlFor="mc_cb_ov_states" required>Licensed States</Label>
                    <StatesMultiSelect id="mc_cb_ov_states" value={mcCbOvStates} onChange={setMcCbOvStates} error={extraErrors.mc_cb_ov_states} />
                    <FieldError msg={extraErrors.mc_cb_ov_states} /></div>
                  <div><Label htmlFor="mc_cb_ov_startDate" required>Preferred Start Date</Label>
                    {dateInput('mc_cb_ov_startDate', 'input-mc-cb-ov-start', 'mc_cb_ov_startDate', false)}</div>
                  <div><Label htmlFor="mc_cb_ov_agencyMention" required>Agency Name to Mention</Label>
                    <input id="mc_cb_ov_agencyMention" placeholder="Override agency name" className={errors.mc_cb_ov_agencyMention ? errorInputClass : inputClass}
                      {...register('mc_cb_ov_agencyMention', { required: mcCbOverride ? 'Required.' : false })} />
                    <FieldError msg={errors.mc_cb_ov_agencyMention?.message} /></div>
                </>}>
                <div><Label htmlFor="mc_cb_package">Package</Label>
                  <div id="mc_cb_package" data-testid="display-mc-cb-package" className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]">{getPackageLabel(cart, 'Medicare', 'Callback Leads')}</div></div>
                <div><Label htmlFor="mc_cb_leadType" required>Lead Type</Label>
                  <RadioGroup name="mc_cb_leadType" options={['Medicare Supplement','Medicare Advantage','Both']} register={register as (n: string, o?: object) => object} error={errors.mc_cb_leadType?.message} /></div>
                <div><Label htmlFor="mc_cb_deliveryDate">Preferred Delivery Date</Label>
                  {dateInput('mc_cb_deliveryDate', 'input-mc-cb-delivery', 'mc_cb_deliveryDate', false)}</div>
                <div><Label htmlFor="mc_cb_format" required>Delivery Format</Label>
                  <RadioGroup name="mc_cb_format" options={['CSV','PDF']} register={register as (n: string, o?: object) => object} error={errors.mc_cb_format?.message} /></div>
              </ProductSectionCard>
            )}

            {/* ── Medicare Live Transfers ── */}
            {hasMcLt && (
              <ProductSectionCard title="Medicare — Live Transfers" badge="Product Details" override={!!mcLtOverride}
                overrideToggle={overrideToggle('mc_lt_override')}
                overrideFields={<>
                  <div><Label htmlFor="mc_lt_ov_states" required>Licensed States</Label>
                    <StatesMultiSelect id="mc_lt_ov_states" value={mcLtOvStates} onChange={setMcLtOvStates} error={extraErrors.mc_lt_ov_states} />
                    <FieldError msg={extraErrors.mc_lt_ov_states} /></div>
                  <div><Label htmlFor="mc_lt_ov_startDate" required>Preferred Start Date</Label>
                    {dateInput('mc_lt_ov_startDate', 'input-mc-lt-ov-start', 'mc_lt_ov_startDate', false)}</div>
                  <div><Label htmlFor="mc_lt_ov_avail" required>Availability</Label>
                    <AvailabilityPicker id="mc_lt_ov_avail" days={mcLtOvDays} onDaysChange={setMcLtOvDays} hours={''} onHoursChange={() => {}} error={extraErrors.mc_lt_ov_days} />
                    <FieldError msg={extraErrors.mc_lt_ov_days} /></div>
                </>}>
                <div><Label htmlFor="mc_lt_package">Package</Label>
                  <div id="mc_lt_package" data-testid="display-mc-lt-package" className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]">{getPackageLabel(cart, 'Medicare', 'Live Transfers')}</div></div>
                <div><Label htmlFor="mc_lt_leadType" required>Lead Type</Label>
                  <RadioGroup name="mc_lt_leadType" options={['Supplement','Advantage','Both']} register={register as (n: string, o?: object) => object} error={errors.mc_lt_leadType?.message} /></div>
                <Row2>
                  <div><Label htmlFor="mc_lt_phone" required>Transfer Phone Number</Label>
                    <input id="mc_lt_phone" type="tel" data-testid="input-mc-lt-phone" placeholder="(555) 000-0000"
                      className={errors.mc_lt_phone ? errorInputClass : inputClass}
                      {...register('mc_lt_phone', { required: 'Transfer phone is required.', pattern: { value: /^[\d\s\-().+]{7,20}$/, message: 'Invalid phone.' } })} />
                    <FieldError msg={errors.mc_lt_phone?.message} /></div>
                  <div><Label htmlFor="mc_lt_callsPerDay" required>Calls Per Day</Label>
                    <input id="mc_lt_callsPerDay" type="number" min="1" data-testid="input-mc-lt-calls" placeholder="e.g. 10"
                      className={errors.mc_lt_callsPerDay ? errorInputClass : inputClass}
                      {...register('mc_lt_callsPerDay', { required: 'Required.', min: { value: 1, message: 'Min 1.' } })} />
                    <FieldError msg={errors.mc_lt_callsPerDay?.message} /></div>
                </Row2>
              </ProductSectionCard>
            )}

            {/* ── Additional Instructions ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className="glass-panel rounded-[20px] p-6 sm:p-7">
              <div className="mb-5">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#62d8f0]">Optional</div>
                <h2 className="font-display text-base font-semibold text-white">Additional Instructions</h2>
              </div>
              <textarea id="additionalInstructions" rows={3} data-testid="input-additional-instructions"
                className={`resize-none ${inputClass}`}
                placeholder="If we missed anything or you have additional information regarding your order, please let us know here."
                {...register('additionalInstructions')} />
            </motion.div>

            {/* ── Payment Method ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className="glass-panel rounded-[20px] overflow-hidden">
              <div className="border-b border-[#1d3558] px-6 py-4 sm:px-7">
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#62d8f0]">Required</div>
                <h2 className="font-display text-base font-semibold text-white">Payment Method</h2>
              </div>
              <div className="p-6 sm:p-7 space-y-4">
                {/* Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center gap-2 rounded-[14px] border p-4 text-center transition ${paymentMethod === 'card' ? 'border-[#3e7dda] bg-[#0f2044]' : 'border-[#243e62] bg-[#0d1b2e] hover:bg-[#121f36]'}`}>
                    <CreditCard className="h-5 w-5 text-[#62d8f0]" />
                    <div className="text-sm font-semibold text-white">Credit / Debit Card</div>
                    <div className="text-[10px] text-[#f4a8a8]">+5% processing fee</div>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('zelle')}
                    className={`flex flex-col items-center gap-2 rounded-[14px] border p-4 text-center transition ${paymentMethod === 'zelle' ? 'border-[#3e7dda] bg-[#0f2044]' : 'border-[#243e62] bg-[#0d1b2e] hover:bg-[#121f36]'}`}>
                    <Zap className="h-5 w-5 text-[#62d8f0]" />
                    <div className="text-sm font-semibold text-white">Zelle</div>
                    <div className="text-[10px] text-[#62d8f0]">Save 10%</div>
                  </button>
                </div>
                <FieldError msg={extraErrors.paymentMethod} />

                {/* Card panel */}
                <AnimatePresence>
                  {paymentMethod === 'card' && (
                    <motion.div key="card-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="rounded-[14px] border border-[#243e62] bg-[#080f1c] p-5 space-y-4">
                        <div>
                          <Label htmlFor="payment-element" required>Card Details</Label>
                          {cardPICreating ? (
                            <div className="flex items-center justify-center rounded-[10px] border border-[#243e62] bg-[#0d1b2e] py-6 text-sm text-[#5a7999]">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing secure payment…
                            </div>
                          ) : cardClientSecret && stripePromise ? (
                            <div id="payment-element">
                              <CardPaymentPanel
                                ref={cardPanelRef}
                                stripePromise={stripePromise}
                                clientSecret={cardClientSecret}
                                cardError={cardError}
                              />
                            </div>
                          ) : !cardPICreating && cardError ? (
                            <div className="rounded-[10px] border border-[#a04040]/40 bg-[#2a0f0f]/30 px-4 py-3 text-sm text-[#f4a8a8]">
                              {cardError}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-[10px] border border-[#f4a8a8]/20 bg-[#2a0f0f]/30 px-4 py-3 text-[11px] text-[#f4a8a8]">
                          A <strong>5% processing fee</strong> will be added at checkout. Your card will be charged immediately.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Zelle panel */}
                <AnimatePresence>
                  {paymentMethod === 'zelle' && (
                    <motion.div key="zelle-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="rounded-[14px] border border-[#243e62] bg-[#080f1c] p-5 space-y-4">
                        {/* Discount callout */}
                        <div className="rounded-[10px] border border-[#62d8f0]/20 bg-[#062030]/60 px-4 py-3 text-[12px] text-[#62d8f0]">
                          🎉 <strong>10% Zelle discount</strong> applied automatically to your order total.
                        </div>
                        {/* Amount to send */}
                        {zelleSubtotalCents > 0 && (
                          <div className="rounded-[10px] border border-[#1d5cc4]/50 bg-[#0f2044]/80 px-4 py-3 flex items-center justify-between">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a95ba]">Amount to Send</div>
                            <div className="text-2xl font-bold text-white">{money(zelleTotalCents)}</div>
                          </div>
                        )}
                        {/* Send to */}
                        {settings?.zelle_phone && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a95ba]">Send Payment To</div>
                            <div className="rounded-[10px] border border-[#1d3558] bg-[#0a1628] px-4 py-3 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-base font-bold text-white">{settings.zelle_phone}</div>
                                {settings.zelle_name && <div className="text-xs text-[#7a95ba] mt-0.5">{settings.zelle_name}</div>}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(settings.zelle_phone);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[#1d3558] bg-[#0d1b2e] px-3 py-1.5 text-[11px] font-semibold text-[#62d8f0] transition hover:bg-[#0f2044] hover:border-[#3e7dda]"
                              >
                                {copied
                                  ? <><Check className="h-3.5 w-3.5" /> Copied</>
                                  : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Screenshot upload */}
                        <div>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a95ba]">
                            Payment Screenshot <span className="text-[#68d8f0]">*</span>
                          </div>
                          <div
                            onClick={() => zelleInputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border-2 border-dashed px-4 py-6 text-center transition ${uploadDone ? 'border-[#1d5cc4] bg-[#0f2044]' : extraErrors.zelleScreenshot ? 'border-[#a04040]' : 'border-[#243e62] hover:border-[#3e7dda] hover:bg-[#0e1e35]'}`}>
                            {uploading ? (
                              <><Loader2 className="h-6 w-6 animate-spin text-[#62d8f0]" /><span className="text-xs text-[#7a95ba]">Uploading…</span></>
                            ) : uploadDone ? (
                              <><Check className="h-6 w-6 text-[#62d8f0]" /><span className="text-xs font-semibold text-[#62d8f0]">{zelleFile?.name}</span><span className="text-[10px] text-[#7a95ba]">Click to replace</span></>
                            ) : (
                              <><Upload className="h-6 w-6 text-[#4d6a8e]" /><span className="text-xs font-semibold text-[#7a95ba]">Upload payment screenshot</span><span className="text-[10px] text-[#4d6a8e]">PNG, JPG, PDF · up to 15 MB</span></>
                            )}
                          </div>
                          <input ref={zelleInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                          {uploadError && <FieldError msg={uploadError} />}
                          {extraErrors.zelleScreenshot && <FieldError msg={extraErrors.zelleScreenshot} />}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ── Terms + Submit ── */}
            <div className="glass-panel rounded-[20px] p-6 sm:p-7">
              <label className="flex cursor-pointer items-start gap-3.5" data-testid="label-terms">
                <input type="checkbox" data-testid="checkbox-terms"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#3e7dda]"
                  {...register('agreedToTerms', { required: 'You must agree to the Terms & Conditions.' })} />
                <span className="text-sm leading-6 text-[#8fa6c4]">
                  I have read and agree to the LeadStream Hub{' '}
                  <a href="https://leadstreamhub.com/terms-conditions/" target="_blank" rel="noopener noreferrer"
                    data-testid="link-terms"
                    className="inline-flex items-center gap-0.5 font-semibold text-[#62d8f0] underline underline-offset-2 hover:text-white transition">
                    Terms &amp; Conditions <ExternalLink className="h-3 w-3" />
                  </a>.
                </span>
              </label>
              {errors.agreedToTerms && <FieldError msg={errors.agreedToTerms.message} />}

              {submitError && (
                <div className="mt-4 rounded-[10px] border border-[#a04040]/40 bg-[#2a0f0f]/40 px-4 py-3 text-sm text-[#f4a8a8]">
                  {submitError}
                </div>
              )}

              {/* Inline validation summary — shown above Submit when there are extra errors */}
              {Object.keys(extraErrors).length > 0 && (
                <div className="mt-4 rounded-[10px] border border-[#a04040]/40 bg-[#2a0f0f]/40 px-4 py-3 text-sm text-[#f4a8a8] space-y-1">
                  <p className="font-semibold">Please fix the following before submitting:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {Object.values(extraErrors).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button type="submit" disabled={submitting} data-testid="button-submit-order"
                className="blue-button focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>{paymentMethod === 'card' ? 'Submit Order & Pay' : 'Submit Order'} <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="mt-3 text-center text-[11px] text-[#5a7999]">
                {paymentMethod === 'card' ? 'Your card will be charged immediately and securely via Stripe.' : 'Your order will be confirmed after payment verification.'}
              </p>
            </div>
          </form>

          {/* ── Sidebar ── */}
          <div className="lg:sticky lg:top-6">
            <OrderSummary cart={cart} paymentMethod={paymentMethod} onEdit={onBack} />
          </div>
        </div>
      </main>
    </motion.div>
  );
}

// ─── Main CheckoutPage (manages Stripe provider) ──────────────────────────────

export default function CheckoutPage({ cart, onBack, onSuccess }: {
  cart: CartItem[]; onBack: () => void; onSuccess: () => void;
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  // Only load Stripe when we have a publishable key
  const stripePromise = useMemo(() => {
    if (settings?.stripe_publishable_key) {
      return loadStripe(settings.stripe_publishable_key);
    }
    return null;
  }, [settings?.stripe_publishable_key]);

  return (
    <InnerCheckoutForm
      cart={cart}
      onBack={onBack}
      settings={settings}
      stripePromise={stripePromise}
    />
  );
}
