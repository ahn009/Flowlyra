import { create } from "zustand";
import { api } from "../lib/api";

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  billing_interval: string;
  seat_quantity: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  stripe_price_id?: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  created: string;
}

interface BillingState {
  subscription: Subscription | null;
  invoices: Invoice[];
  loading: boolean;
  fetchSubscription: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  createCheckout: (priceId: string, interval: string) => Promise<string>;
  openPortal: () => Promise<string>;
  updateSeats: (quantity: number) => Promise<void>;
  cancelSubscription: (atPeriodEnd?: boolean) => Promise<void>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  subscription: null,
  invoices: [],
  loading: false,
  fetchSubscription: async (): Promise<void> => {
    set({ loading: true });
    try {
      const { data } = await api.get<Subscription | null>("/billing/subscription");
      set({ subscription: data });
    } finally {
      set({ loading: false });
    }
  },
  fetchInvoices: async (): Promise<void> => {
    const { data } = await api.get<Invoice[]>("/billing/invoices");
    set({ invoices: data });
  },
  createCheckout: async (priceId: string, interval: string): Promise<string> => {
    const origin = window.location.origin;
    const { data } = await api.post<{ url: string }>("/billing/checkout", {
      price_id: priceId,
      success_url: `${origin}/admin/billing?checkout=success&interval=${interval}`,
      cancel_url: `${origin}/admin/billing?checkout=cancelled`,
      quantity: get().subscription?.seat_quantity ?? 1,
    });
    return data.url;
  },
  openPortal: async (): Promise<string> => {
    const { data } = await api.post<{ url: string }>("/billing/portal", { return_url: `${window.location.origin}/admin/billing` });
    return data.url;
  },
  updateSeats: async (quantity: number): Promise<void> => {
    const { data } = await api.patch<Subscription | null>("/billing/subscription", { seat_quantity: quantity });
    set({ subscription: data });
  },
  cancelSubscription: async (atPeriodEnd = true): Promise<void> => {
    const { data } = await api.delete<Subscription | null>("/billing/subscription", { params: { at_period_end: atPeriodEnd } });
    set({ subscription: data });
  },
}));
