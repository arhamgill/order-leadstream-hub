import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CartItem } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const money = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasProduct(cart: CartItem[], category: string, type: string) {
  return cart.some((i) => i.category === category && i.type === type);
}

function getPackageLabel(cart: CartItem[], category: string, type: string) {
  const items = cart.filter((i) => i.category === category && i.type === type);
  return items.map((i) => `${i.quantity} Pack — ${money(i.price)}`).join(', ');
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-[11px] font-medium text-[#f4a8a8]" data-testid="field-error">
      {msg}
    </p>
  );
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7a95ba]">
      {children}
      {required && <span className="ml-0.5 text-[#68d8f0]">*</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-3.5 py-2.5 text-sm text-white placeholder-[#4d6a8e] transition focus:border-[#3e7dda] focus:outline-none focus:ring-1 focus:ring-[#3e7dda]/30';

const errorInputClass =
  'w-full rounded-[10px] border border-[#a04040] bg-[#0d1b2e] px-3.5 py-2.5 text-sm text-white placeholder-[#4d6a8e] transition focus:border-[#f48c8c] focus:outline-none focus:ring-1 focus:ring-[#f48c8c]/30';

// ─── States Multi-Select ─────────────────────────────────────────────────────

function StatesMultiSelect({
  value,
  onChange,
  error,
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (state: string) => {
    if (value.includes(state)) onChange(value.filter((s) => s !== state));
    else onChange([...value, state]);
  };

  const label =
    value.length === 0
      ? 'Select states…'
      : value.length === US_STATES.length
        ? 'All states selected'
        : value.slice(0, 6).join(', ') + (value.length > 6 ? ` +${value.length - 6} more` : '');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        data-testid={`${id}-trigger`}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border px-3.5 py-2.5 text-sm text-left transition ${
          error ? 'border-[#a04040]' : 'border-[#243e62]'
        } bg-[#0d1b2e] text-white focus:border-[#3e7dda] focus:outline-none focus:ring-1 focus:ring-[#3e7dda]/30`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value.length === 0 ? 'text-[#4d6a8e]' : 'text-white truncate'}>{label}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-[#6291b8]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#6291b8]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-[13px] border border-[#243e62] bg-[#0d1b2e] shadow-[0_24px_60px_rgba(0,0,0,.45)]"
          >
            <div className="flex items-center justify-between border-b border-[#1c3254] px-3.5 py-2.5">
              <span className="text-xs font-semibold text-[#7a95ba]">{value.length} selected</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => onChange([...US_STATES])} className="text-[11px] font-semibold text-[#62d8f0] hover:text-white transition">All</button>
                <button type="button" onClick={() => onChange([])} className="text-[11px] font-semibold text-[#62d8f0] hover:text-white transition">Clear</button>
                <button type="button" onClick={() => setOpen(false)} className="text-[#6291b8] hover:text-white transition"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div
              role="listbox"
              aria-multiselectable="true"
              className="scrollbar-subtle grid max-h-56 grid-cols-5 gap-px overflow-y-auto p-2"
            >
              {US_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  role="option"
                  aria-selected={value.includes(state)}
                  data-testid={`state-option-${state}`}
                  onClick={() => toggle(state)}
                  className={`rounded-[7px] py-1.5 text-[11px] font-semibold transition ${
                    value.includes(state)
                      ? 'bg-[#1d5cc4] text-white'
                      : 'text-[#7a95ba] hover:bg-[#172a47] hover:text-white'
                  }`}
                >
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

// ─── Availability Multi-Day Picker ───────────────────────────────────────────

function AvailabilityPicker({
  days,
  onDaysChange,
  hoursValue,
  onHoursChange,
  error,
  id,
}: {
  days: string[];
  onDaysChange: (d: string[]) => void;
  hoursValue: string;
  onHoursChange: (v: string) => void;
  error?: string;
  id: string;
}) {
  const toggle = (day: string) => {
    if (days.includes(day)) onDaysChange(days.filter((d) => d !== day));
    else onDaysChange([...days, day]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            data-testid={`${id}-day-${day.toLowerCase()}`}
            onClick={() => toggle(day)}
            className={`rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition ${
              days.includes(day)
                ? 'bg-[#1d5cc4] text-white shadow-[0_4px_12px_rgba(29,92,196,.3)]'
                : 'border border-[#243e62] bg-[#0d1b2e] text-[#7a95ba] hover:bg-[#142644] hover:text-white'
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>
      <input
        id={`${id}-hours`}
        type="text"
        data-testid={`${id}-hours`}
        value={hoursValue}
        onChange={(e) => onHoursChange(e.target.value)}
        placeholder="e.g. 9:00 AM – 5:00 PM EST"
        className={error ? errorInputClass : inputClass}
      />
      {error && <FieldError msg={error} />}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <motion.fieldset
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-[20px] p-6 sm:p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <div>
          {badge && (
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#62d8f0]">{badge}</div>
          )}
          <legend className="font-display text-base font-semibold text-white">{title}</legend>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </motion.fieldset>
  );
}

function Row({ children, half }: { children: React.ReactNode; half?: boolean }) {
  return (
    <div className={`grid gap-4 ${half ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>{children}</div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

// ─── Order Summary Sidebar ────────────────────────────────────────────────────

function OrderSummary({ cart, onEdit }: { cart: CartItem[]; onEdit: () => void }) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const savings = cart.reduce((s, i) => s + (i.savings ?? 0) * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <aside className="glass-panel overflow-hidden rounded-[20px]" aria-label="Order summary">
      <div className="border-b border-[#1d3558] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#62d8f0]" />
          <span className="font-display text-sm font-semibold text-white">Order Summary</span>
          <span className="ml-auto rounded-full bg-[#1d5cc4] px-2 py-0.5 text-[10px] font-bold text-white">
            {count}
          </span>
        </div>
      </div>
      <div className="px-5 py-4 sm:px-6">
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.lineId} className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[12px] font-semibold text-white">
                  {item.quantity} {item.type}
                </div>
                <div className="mt-0.5 text-[10px] text-[#6a89ae]">{item.category}</div>
              </div>
              <span className="font-display text-xs font-semibold text-[#d8eaff]">
                {money(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-[#1d3558] pt-4 text-[11px]">
          <div className="flex justify-between text-[#7a95ba]">
            <span>Subtotal</span>
            <span className="font-display font-semibold text-white">{money(subtotal)}</span>
          </div>
          {savings > 0 && (
            <div className="flex justify-between text-[#62d8f0]">
              <span>Estimated Savings</span>
              <span className="font-display font-semibold">{money(savings)}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          data-testid="button-edit-order"
          onClick={onEdit}
          className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#243e62] py-2 text-xs font-semibold text-[#7a95ba] transition hover:bg-[#142644] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Edit Order
        </button>
      </div>
    </aside>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ cart, onBackToShop }: { cart: CartItem[]; onBackToShop: () => void }) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[22px] bg-[#1a4caa] shadow-[0_14px_40px_rgba(29,92,196,.4)]">
        <BadgeCheck className="h-10 w-10 text-[#7de8f4]" strokeWidth={1.6} />
      </div>
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#62d8f0]">Order Received</div>
      <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
        You're all set.
      </h2>
      <p className="mt-4 max-w-[420px] text-sm leading-7 text-[#8fa6c4]">
        Your order details have been submitted and are being reviewed by the LeadStream Hub team. A representative will reach out shortly to finalize payment and delivery.
      </p>

      <div className="mt-8 w-full max-w-[400px] rounded-[16px] border border-[#243e62] bg-[#0d1b2e] p-5 text-left">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a95ba]">Order Details</div>
        <div className="space-y-2.5">
          {cart.map((item) => (
            <div key={item.lineId} className="flex items-center justify-between">
              <span className="text-xs text-[#8fa6c4]">
                {item.quantity} {item.type}{' '}
                <span className="text-[#5e7da2]">({item.category})</span>
              </span>
              <span className="font-display text-xs font-semibold text-white">{money(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between border-t border-[#1d3558] pt-3">
            <span className="text-xs font-semibold text-[#7a95ba]">Total</span>
            <span className="font-display text-sm font-bold text-white">{money(subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <div className="flex items-center gap-2 rounded-full border border-[#243e62] bg-[#0d1b2e] px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-[#62d8f0]" />
          <span className="text-xs font-semibold text-[#7a95ba]">Exclusive. Never recycled.</span>
        </div>
      </div>

      <button
        type="button"
        data-testid="button-back-to-shop"
        onClick={onBackToShop}
        className="focus-ring mt-8 flex items-center gap-2 rounded-full border border-[#2c456a] px-5 py-2.5 text-sm font-semibold text-[#b5d0f2] transition hover:bg-[#142644]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </button>
    </motion.div>
  );
}

// ─── Main Checkout Component ──────────────────────────────────────────────────

type FormValues = {
  firstName: string;
  lastName: string;
  agencyName: string;
  phone: string;
  email: string;
  // FE Callback
  fe_cb_states: string[];
  fe_cb_startDate: string;
  fe_cb_deliveryDate: string;
  fe_cb_format: string;
  fe_cb_agencyMention: string;
  // FE Live Transfers
  fe_lt_states: string[];
  fe_lt_startDate: string;
  fe_lt_phone: string;
  fe_lt_callsPerDay: string;
  fe_lt_availDays: string[];
  fe_lt_availHours: string;
  // FE Pre Closed
  fe_pc_states: string[];
  fe_pc_startDate: string;
  fe_pc_carriers: string;
  fe_pc_availDays: string[];
  fe_pc_availHours: string;
  // Medicare Callback
  mc_cb_states: string[];
  mc_cb_leadType: string;
  mc_cb_startDate: string;
  mc_cb_deliveryDate: string;
  mc_cb_format: string;
  mc_cb_agencyMention: string;
  // Medicare Live Transfers
  mc_lt_states: string[];
  mc_lt_leadType: string;
  mc_lt_startDate: string;
  mc_lt_phone: string;
  mc_lt_callsPerDay: string;
  mc_lt_availDays: string[];
  mc_lt_availHours: string;
  // General
  additionalInstructions: string;
  agreedToTerms: boolean;
};

export default function CheckoutPage({
  cart,
  onBack,
  onSuccess,
}: {
  cart: CartItem[];
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  // Product presence flags
  const hasFeCb = hasProduct(cart, 'Final Expense', 'Callback Leads');
  const hasFeLt = hasProduct(cart, 'Final Expense', 'Live Transfers');
  const hasFePc = hasProduct(cart, 'Final Expense', 'Pre Closed Applications');
  const hasMcCb = hasProduct(cart, 'Medicare', 'Callback Leads');
  const hasMcLt = hasProduct(cart, 'Medicare', 'Live Transfers');

  // States multi-select state (managed outside RHF since RHF doesn't handle arrays elegantly here)
  const [feCbStates, setFeCbStates] = useState<string[]>([]);
  const [feLtStates, setFeLtStates] = useState<string[]>([]);
  const [fePcStates, setFePcStates] = useState<string[]>([]);
  const [mcCbStates, setMcCbStates] = useState<string[]>([]);
  const [mcLtStates, setMcLtStates] = useState<string[]>([]);

  // Availability day checkboxes
  const [feLtDays, setFeLtDays] = useState<string[]>([]);
  const [fePcDays, setFePcDays] = useState<string[]>([]);
  const [mcLtDays, setMcLtDays] = useState<string[]>([]);

  // State errors from manual multi-select validation
  const [stateErrors, setStateErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: '', lastName: '', agencyName: '', phone: '', email: '',
      fe_cb_startDate: '', fe_cb_deliveryDate: '', fe_cb_format: '', fe_cb_agencyMention: '',
      fe_lt_startDate: '', fe_lt_phone: '', fe_lt_callsPerDay: '', fe_lt_availHours: '',
      fe_pc_startDate: '', fe_pc_carriers: '', fe_pc_availHours: '',
      mc_cb_leadType: '', mc_cb_startDate: '', mc_cb_deliveryDate: '', mc_cb_format: '', mc_cb_agencyMention: '',
      mc_lt_leadType: '', mc_lt_startDate: '', mc_lt_phone: '', mc_lt_callsPerDay: '', mc_lt_availHours: '',
      additionalInstructions: '',
      agreedToTerms: false,
    },
  });

  const onSubmit = (_data: FormValues) => {
    // Validate multi-selects
    const errs: Record<string, string> = {};
    if (hasFeCb && feCbStates.length === 0) errs.fe_cb_states = 'Please select at least one state.';
    if (hasFeLt && feLtStates.length === 0) errs.fe_lt_states = 'Please select at least one state.';
    if (hasFePc && fePcStates.length === 0) errs.fe_pc_states = 'Please select at least one state.';
    if (hasMcCb && mcCbStates.length === 0) errs.mc_cb_states = 'Please select at least one state.';
    if (hasMcLt && mcLtStates.length === 0) errs.mc_lt_states = 'Please select at least one state.';
    if (hasFeLt && feLtDays.length === 0) errs.fe_lt_days = 'Please select at least one day.';
    if (hasFePc && fePcDays.length === 0) errs.fe_pc_days = 'Please select at least one day.';
    if (hasMcLt && mcLtDays.length === 0) errs.mc_lt_days = 'Please select at least one day.';
    if (Object.keys(errs).length > 0) { setStateErrors(errs); return; }
    setStateErrors({});
    setSubmitted(true);
    onSuccess();
  };

  if (submitted) {
    return (
      <div className="portal-shell min-h-[100dvh]">
        <CheckoutHeader onBack={onBack} />
        <main className="mx-auto w-full max-w-[860px] px-5 pb-24 sm:px-8">
          <SuccessScreen cart={cart} onBackToShop={onBack} />
        </main>
      </div>
    );
  }

  return (
    <motion.div
      className="portal-shell min-h-[100dvh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <CheckoutHeader onBack={onBack} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-28 sm:px-8 lg:px-10">
        <div className="mb-8 pt-10">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#62d8f0]">
            Secure Order Form
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Complete Your Order
          </h1>
          <p className="mt-2 text-sm text-[#7a95ba]">
            Fill in your details below. Our team will review and follow up to finalize your order.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            data-testid="form-checkout"
            className="space-y-5"
          >
            {/* Customer Information */}
            <SectionCard title="Customer Information" badge="Required">
              <Row half>
                <Field>
                  <Label htmlFor="firstName" required>First Name</Label>
                  <input
                    id="firstName"
                    data-testid="input-first-name"
                    className={errors.firstName ? errorInputClass : inputClass}
                    placeholder="John"
                    {...register('firstName', { required: 'First name is required.' })}
                  />
                  <FieldError msg={errors.firstName?.message} />
                </Field>
                <Field>
                  <Label htmlFor="lastName" required>Last Name</Label>
                  <input
                    id="lastName"
                    data-testid="input-last-name"
                    className={errors.lastName ? errorInputClass : inputClass}
                    placeholder="Smith"
                    {...register('lastName', { required: 'Last name is required.' })}
                  />
                  <FieldError msg={errors.lastName?.message} />
                </Field>
              </Row>
              <Field>
                <Label htmlFor="agencyName">Agency Name</Label>
                <input
                  id="agencyName"
                  data-testid="input-agency-name"
                  className={inputClass}
                  placeholder="Smith Insurance Agency"
                  {...register('agencyName')}
                />
              </Field>
              <Row half>
                <Field>
                  <Label htmlFor="phone" required>Phone</Label>
                  <input
                    id="phone"
                    type="tel"
                    data-testid="input-phone"
                    className={errors.phone ? errorInputClass : inputClass}
                    placeholder="(555) 000-0000"
                    {...register('phone', {
                      required: 'Phone number is required.',
                      pattern: { value: /^[\d\s\-().+]{7,20}$/, message: 'Enter a valid phone number.' },
                    })}
                  />
                  <FieldError msg={errors.phone?.message} />
                </Field>
                <Field>
                  <Label htmlFor="email" required>Email</Label>
                  <input
                    id="email"
                    type="email"
                    data-testid="input-email"
                    className={errors.email ? errorInputClass : inputClass}
                    placeholder="john@agency.com"
                    {...register('email', {
                      required: 'Email address is required.',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
                    })}
                  />
                  <FieldError msg={errors.email?.message} />
                </Field>
              </Row>
            </SectionCard>

            {/* Final Expense — Callback Leads */}
            {hasFeCb && (
              <SectionCard title="Final Expense — Callback Leads" badge="Product Details">
                <Field>
                  <Label htmlFor="fe_cb_states" required>Licensed States</Label>
                  <StatesMultiSelect
                    id="fe_cb_states"
                    value={feCbStates}
                    onChange={setFeCbStates}
                    error={stateErrors.fe_cb_states}
                  />
                  <FieldError msg={stateErrors.fe_cb_states} />
                </Field>
                <Field>
                  <Label htmlFor="fe_cb_package">Package</Label>
                  <div
                    id="fe_cb_package"
                    className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]"
                    data-testid="display-fe-cb-package"
                  >
                    {getPackageLabel(cart, 'Final Expense', 'Callback Leads')}
                  </div>
                </Field>
                <Row half>
                  <Field>
                    <Label htmlFor="fe_cb_startDate" required>Preferred Start Date</Label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                      <input
                        id="fe_cb_startDate"
                        type="date"
                        data-testid="input-fe-cb-start-date"
                        className={`pl-9 ${errors.fe_cb_startDate ? errorInputClass : inputClass}`}
                        {...register('fe_cb_startDate', { required: 'Start date is required.' })}
                      />
                    </div>
                    <FieldError msg={errors.fe_cb_startDate?.message} />
                  </Field>
                  <Field>
                    <Label htmlFor="fe_cb_deliveryDate" required>Preferred Delivery Date</Label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                      <input
                        id="fe_cb_deliveryDate"
                        type="date"
                        data-testid="input-fe-cb-delivery-date"
                        className={`pl-9 ${errors.fe_cb_deliveryDate ? errorInputClass : inputClass}`}
                        {...register('fe_cb_deliveryDate', { required: 'Delivery date is required.' })}
                      />
                    </div>
                    <FieldError msg={errors.fe_cb_deliveryDate?.message} />
                  </Field>
                </Row>
                <Field>
                  <Label htmlFor="fe_cb_format" required>Delivery Format</Label>
                  <div className="flex gap-3">
                    {['CSV', 'PDF'].map((fmt) => (
                      <label key={fmt} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-4 py-2.5 text-sm font-semibold text-white transition has-[:checked]:border-[#3e7dda] has-[:checked]:bg-[#0f2044]">
                        <input
                          type="radio"
                          value={fmt}
                          data-testid={`radio-fe-cb-format-${fmt.toLowerCase()}`}
                          {...register('fe_cb_format', { required: 'Please select a delivery format.' })}
                          className="accent-[#3e7dda]"
                        />
                        {fmt}
                      </label>
                    ))}
                  </div>
                  <FieldError msg={errors.fe_cb_format?.message} />
                </Field>
                <Field>
                  <Label htmlFor="fe_cb_agencyMention" required>Agency Name to Mention to Prospect</Label>
                  <input
                    id="fe_cb_agencyMention"
                    data-testid="input-fe-cb-agency-mention"
                    className={errors.fe_cb_agencyMention ? errorInputClass : inputClass}
                    placeholder="The name your agents use when calling prospects"
                    {...register('fe_cb_agencyMention', { required: 'Agency name to mention is required.' })}
                  />
                  <FieldError msg={errors.fe_cb_agencyMention?.message} />
                </Field>
              </SectionCard>
            )}

            {/* Final Expense — Live Transfers */}
            {hasFeLt && (
              <SectionCard title="Final Expense — Live Transfers" badge="Product Details">
                <Field>
                  <Label htmlFor="fe_lt_states" required>Licensed States</Label>
                  <StatesMultiSelect
                    id="fe_lt_states"
                    value={feLtStates}
                    onChange={setFeLtStates}
                    error={stateErrors.fe_lt_states}
                  />
                  <FieldError msg={stateErrors.fe_lt_states} />
                </Field>
                <Field>
                  <Label htmlFor="fe_lt_package">Package</Label>
                  <div
                    id="fe_lt_package"
                    className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]"
                    data-testid="display-fe-lt-package"
                  >
                    {getPackageLabel(cart, 'Final Expense', 'Live Transfers')}
                  </div>
                </Field>
                <Field>
                  <Label htmlFor="fe_lt_startDate" required>Preferred Start Date</Label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                    <input
                      id="fe_lt_startDate"
                      type="date"
                      data-testid="input-fe-lt-start-date"
                      className={`pl-9 ${errors.fe_lt_startDate ? errorInputClass : inputClass}`}
                      {...register('fe_lt_startDate', { required: 'Start date is required.' })}
                    />
                  </div>
                  <FieldError msg={errors.fe_lt_startDate?.message} />
                </Field>
                <Row half>
                  <Field>
                    <Label htmlFor="fe_lt_phone" required>Transfer Phone Number</Label>
                    <input
                      id="fe_lt_phone"
                      type="tel"
                      data-testid="input-fe-lt-phone"
                      className={errors.fe_lt_phone ? errorInputClass : inputClass}
                      placeholder="(555) 000-0000"
                      {...register('fe_lt_phone', {
                        required: 'Transfer phone number is required.',
                        pattern: { value: /^[\d\s\-().+]{7,20}$/, message: 'Enter a valid phone number.' },
                      })}
                    />
                    <FieldError msg={errors.fe_lt_phone?.message} />
                  </Field>
                  <Field>
                    <Label htmlFor="fe_lt_callsPerDay" required>Calls Per Day</Label>
                    <input
                      id="fe_lt_callsPerDay"
                      type="number"
                      min="1"
                      max="200"
                      data-testid="input-fe-lt-calls-per-day"
                      className={errors.fe_lt_callsPerDay ? errorInputClass : inputClass}
                      placeholder="e.g. 10"
                      {...register('fe_lt_callsPerDay', {
                        required: 'Calls per day is required.',
                        min: { value: 1, message: 'Must be at least 1.' },
                      })}
                    />
                    <FieldError msg={errors.fe_lt_callsPerDay?.message} />
                  </Field>
                </Row>
                <Field>
                  <Label htmlFor="fe_lt_avail" required>Availability</Label>
                  <AvailabilityPicker
                    id="fe_lt_avail"
                    days={feLtDays}
                    onDaysChange={setFeLtDays}
                    hoursValue={''}
                    onHoursChange={() => {}}
                    error={stateErrors.fe_lt_days}
                  />
                  <FieldError msg={stateErrors.fe_lt_days} />
                </Field>
              </SectionCard>
            )}

            {/* Final Expense — Pre Closed Applications */}
            {hasFePc && (
              <SectionCard title="Final Expense — Pre Closed Applications" badge="Product Details">
                <Field>
                  <Label htmlFor="fe_pc_states" required>Licensed States</Label>
                  <StatesMultiSelect
                    id="fe_pc_states"
                    value={fePcStates}
                    onChange={setFePcStates}
                    error={stateErrors.fe_pc_states}
                  />
                  <FieldError msg={stateErrors.fe_pc_states} />
                </Field>
                <Field>
                  <Label htmlFor="fe_pc_package">Package</Label>
                  <div
                    id="fe_pc_package"
                    className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]"
                    data-testid="display-fe-pc-package"
                  >
                    {getPackageLabel(cart, 'Final Expense', 'Pre Closed Applications')}
                  </div>
                </Field>
                <Field>
                  <Label htmlFor="fe_pc_startDate" required>Preferred Start Date</Label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                    <input
                      id="fe_pc_startDate"
                      type="date"
                      data-testid="input-fe-pc-start-date"
                      className={`pl-9 ${errors.fe_pc_startDate ? errorInputClass : inputClass}`}
                      {...register('fe_pc_startDate', { required: 'Start date is required.' })}
                    />
                  </div>
                  <FieldError msg={errors.fe_pc_startDate?.message} />
                </Field>
                <Field>
                  <Label htmlFor="fe_pc_carriers" required>Carriers</Label>
                  <textarea
                    id="fe_pc_carriers"
                    data-testid="input-fe-pc-carriers"
                    rows={3}
                    className={`resize-none ${errors.fe_pc_carriers ? errorInputClass : inputClass}`}
                    placeholder="List the insurance carriers you are contracted with (e.g. Mutual of Omaha, Aetna, Americo…)"
                    {...register('fe_pc_carriers', { required: 'Please list your contracted carriers.' })}
                  />
                  <FieldError msg={errors.fe_pc_carriers?.message} />
                </Field>
                <Field>
                  <Label htmlFor="fe_pc_avail" required>Availability</Label>
                  <AvailabilityPicker
                    id="fe_pc_avail"
                    days={fePcDays}
                    onDaysChange={setFePcDays}
                    hoursValue={''}
                    onHoursChange={() => {}}
                    error={stateErrors.fe_pc_days}
                  />
                  <FieldError msg={stateErrors.fe_pc_days} />
                </Field>
              </SectionCard>
            )}

            {/* Medicare — Callback Leads */}
            {hasMcCb && (
              <SectionCard title="Medicare — Callback Leads" badge="Product Details">
                <Field>
                  <Label htmlFor="mc_cb_states" required>Licensed States</Label>
                  <StatesMultiSelect
                    id="mc_cb_states"
                    value={mcCbStates}
                    onChange={setMcCbStates}
                    error={stateErrors.mc_cb_states}
                  />
                  <FieldError msg={stateErrors.mc_cb_states} />
                </Field>
                <Field>
                  <Label htmlFor="mc_cb_package">Package</Label>
                  <div
                    id="mc_cb_package"
                    className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]"
                    data-testid="display-mc-cb-package"
                  >
                    {getPackageLabel(cart, 'Medicare', 'Callback Leads')}
                  </div>
                </Field>
                <Field>
                  <Label htmlFor="mc_cb_leadType" required>Lead Type</Label>
                  <div className="flex flex-wrap gap-3">
                    {['Medicare Supplement', 'Medicare Advantage', 'Both'].map((t) => (
                      <label key={t} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-4 py-2.5 text-sm font-semibold text-white transition has-[:checked]:border-[#3e7dda] has-[:checked]:bg-[#0f2044]">
                        <input
                          type="radio"
                          value={t}
                          data-testid={`radio-mc-cb-lead-type-${t.toLowerCase().replaceAll(' ', '-')}`}
                          {...register('mc_cb_leadType', { required: 'Please select a lead type.' })}
                          className="accent-[#3e7dda]"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  <FieldError msg={errors.mc_cb_leadType?.message} />
                </Field>
                <Row half>
                  <Field>
                    <Label htmlFor="mc_cb_startDate" required>Preferred Start Date</Label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                      <input
                        id="mc_cb_startDate"
                        type="date"
                        data-testid="input-mc-cb-start-date"
                        className={`pl-9 ${errors.mc_cb_startDate ? errorInputClass : inputClass}`}
                        {...register('mc_cb_startDate', { required: 'Start date is required.' })}
                      />
                    </div>
                    <FieldError msg={errors.mc_cb_startDate?.message} />
                  </Field>
                  <Field>
                    <Label htmlFor="mc_cb_deliveryDate" required>Preferred Delivery Date</Label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                      <input
                        id="mc_cb_deliveryDate"
                        type="date"
                        data-testid="input-mc-cb-delivery-date"
                        className={`pl-9 ${errors.mc_cb_deliveryDate ? errorInputClass : inputClass}`}
                        {...register('mc_cb_deliveryDate', { required: 'Delivery date is required.' })}
                      />
                    </div>
                    <FieldError msg={errors.mc_cb_deliveryDate?.message} />
                  </Field>
                </Row>
                <Field>
                  <Label htmlFor="mc_cb_format" required>Delivery Format</Label>
                  <div className="flex gap-3">
                    {['CSV', 'PDF'].map((fmt) => (
                      <label key={fmt} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-4 py-2.5 text-sm font-semibold text-white transition has-[:checked]:border-[#3e7dda] has-[:checked]:bg-[#0f2044]">
                        <input
                          type="radio"
                          value={fmt}
                          data-testid={`radio-mc-cb-format-${fmt.toLowerCase()}`}
                          {...register('mc_cb_format', { required: 'Please select a delivery format.' })}
                          className="accent-[#3e7dda]"
                        />
                        {fmt}
                      </label>
                    ))}
                  </div>
                  <FieldError msg={errors.mc_cb_format?.message} />
                </Field>
                <Field>
                  <Label htmlFor="mc_cb_agencyMention" required>Agency Name to Mention</Label>
                  <input
                    id="mc_cb_agencyMention"
                    data-testid="input-mc-cb-agency-mention"
                    className={errors.mc_cb_agencyMention ? errorInputClass : inputClass}
                    placeholder="The name your agents use when calling prospects"
                    {...register('mc_cb_agencyMention', { required: 'Agency name to mention is required.' })}
                  />
                  <FieldError msg={errors.mc_cb_agencyMention?.message} />
                </Field>
              </SectionCard>
            )}

            {/* Medicare — Live Transfers */}
            {hasMcLt && (
              <SectionCard title="Medicare — Live Transfers" badge="Product Details">
                <Field>
                  <Label htmlFor="mc_lt_states" required>Licensed States</Label>
                  <StatesMultiSelect
                    id="mc_lt_states"
                    value={mcLtStates}
                    onChange={setMcLtStates}
                    error={stateErrors.mc_lt_states}
                  />
                  <FieldError msg={stateErrors.mc_lt_states} />
                </Field>
                <Field>
                  <Label htmlFor="mc_lt_package">Package</Label>
                  <div
                    id="mc_lt_package"
                    className="rounded-[10px] border border-[#243e62] bg-[#080f1c] px-3.5 py-2.5 text-sm text-[#7a95ba]"
                    data-testid="display-mc-lt-package"
                  >
                    {getPackageLabel(cart, 'Medicare', 'Live Transfers')}
                  </div>
                </Field>
                <Field>
                  <Label htmlFor="mc_lt_leadType" required>Lead Type</Label>
                  <div className="flex flex-wrap gap-3">
                    {['Supplement', 'Advantage', 'Both'].map((t) => (
                      <label key={t} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#243e62] bg-[#0d1b2e] px-4 py-2.5 text-sm font-semibold text-white transition has-[:checked]:border-[#3e7dda] has-[:checked]:bg-[#0f2044]">
                        <input
                          type="radio"
                          value={t}
                          data-testid={`radio-mc-lt-lead-type-${t.toLowerCase()}`}
                          {...register('mc_lt_leadType', { required: 'Please select a lead type.' })}
                          className="accent-[#3e7dda]"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  <FieldError msg={errors.mc_lt_leadType?.message} />
                </Field>
                <Field>
                  <Label htmlFor="mc_lt_startDate" required>Preferred Start Date</Label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6a8e]" />
                    <input
                      id="mc_lt_startDate"
                      type="date"
                      data-testid="input-mc-lt-start-date"
                      className={`pl-9 ${errors.mc_lt_startDate ? errorInputClass : inputClass}`}
                      {...register('mc_lt_startDate', { required: 'Start date is required.' })}
                    />
                  </div>
                  <FieldError msg={errors.mc_lt_startDate?.message} />
                </Field>
                <Row half>
                  <Field>
                    <Label htmlFor="mc_lt_phone" required>Transfer Phone Number</Label>
                    <input
                      id="mc_lt_phone"
                      type="tel"
                      data-testid="input-mc-lt-phone"
                      className={errors.mc_lt_phone ? errorInputClass : inputClass}
                      placeholder="(555) 000-0000"
                      {...register('mc_lt_phone', {
                        required: 'Transfer phone number is required.',
                        pattern: { value: /^[\d\s\-().+]{7,20}$/, message: 'Enter a valid phone number.' },
                      })}
                    />
                    <FieldError msg={errors.mc_lt_phone?.message} />
                  </Field>
                  <Field>
                    <Label htmlFor="mc_lt_callsPerDay" required>Calls Per Day</Label>
                    <input
                      id="mc_lt_callsPerDay"
                      type="number"
                      min="1"
                      max="200"
                      data-testid="input-mc-lt-calls-per-day"
                      className={errors.mc_lt_callsPerDay ? errorInputClass : inputClass}
                      placeholder="e.g. 10"
                      {...register('mc_lt_callsPerDay', {
                        required: 'Calls per day is required.',
                        min: { value: 1, message: 'Must be at least 1.' },
                      })}
                    />
                    <FieldError msg={errors.mc_lt_callsPerDay?.message} />
                  </Field>
                </Row>
                <Field>
                  <Label htmlFor="mc_lt_avail" required>Availability</Label>
                  <AvailabilityPicker
                    id="mc_lt_avail"
                    days={mcLtDays}
                    onDaysChange={setMcLtDays}
                    hoursValue={''}
                    onHoursChange={() => {}}
                    error={stateErrors.mc_lt_days}
                  />
                  <FieldError msg={stateErrors.mc_lt_days} />
                </Field>
              </SectionCard>
            )}

            {/* Additional Instructions */}
            <SectionCard title="Additional Instructions">
              <Field>
                <Label htmlFor="additionalInstructions">Comments</Label>
                <textarea
                  id="additionalInstructions"
                  data-testid="input-additional-instructions"
                  rows={4}
                  className={`resize-none ${inputClass}`}
                  placeholder="If we missed anything or you have additional information regarding your order, please let us know here."
                  {...register('additionalInstructions')}
                />
              </Field>
            </SectionCard>

            {/* Terms & Conditions + Submit */}
            <div className="glass-panel rounded-[20px] p-6 sm:p-7">
              <label className="flex cursor-pointer items-start gap-3.5" data-testid="label-terms">
                <input
                  type="checkbox"
                  data-testid="checkbox-terms"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#3e7dda]"
                  {...register('agreedToTerms', { required: 'You must agree to the Terms & Conditions.' })}
                />
                <span className="text-sm leading-6 text-[#8fa6c4]">
                  I have read and agree to the LeadStream Hub{' '}
                  <a
                    href="https://leadstreamhub.com/terms-conditions/"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-terms"
                    className="inline-flex items-center gap-0.5 font-semibold text-[#62d8f0] underline underline-offset-2 hover:text-white transition"
                  >
                    Terms &amp; Conditions <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </span>
              </label>
              {errors.agreedToTerms && (
                <FieldError msg={errors.agreedToTerms.message} />
              )}

              <button
                type="submit"
                data-testid="button-submit-order"
                className="blue-button focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 active:translate-y-0"
              >
                Submit Order <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-[11px] text-[#5a7999]">
                No payment is collected here. Your order is reviewed by the LeadStream team.
              </p>
            </div>
          </form>

          {/* ── Sidebar Summary ── */}
          <div className="lg:sticky lg:top-6">
            <OrderSummary cart={cart} onEdit={onBack} />
          </div>
        </div>
      </main>
    </motion.div>
  );
}

function CheckoutHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-5 py-5 sm:px-8 lg:px-10">
      <button
        type="button"
        data-testid="button-back-to-catalog"
        onClick={onBack}
        className="focus-ring flex items-center gap-1.5 rounded-full border border-[#243e62] px-3.5 py-2 text-xs font-semibold text-[#7a95ba] transition hover:bg-[#142644] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-center gap-2.5">
        <span className="font-display text-[13px] font-semibold text-white">leadstream</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#62d8f0]">checkout</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#5a7999]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#62d8f0]" />
        Secure order form
      </div>
    </header>
  );
}
