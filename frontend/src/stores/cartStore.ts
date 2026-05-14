import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MockService } from '../lib/mockData';

export interface CartItem {
  service_id: number;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  category_name: string;
  is_package: boolean;
  sample_type: string | null;
  report_turnaround_hours: number;
}

interface CartState {
  items: CartItem[];
  /**
   * Set when the patient enters the booking flow via the "Book Home Visit"
   * CTA — survives navigation through ServicesPage / CartPage so BookTestPage
   * can pre-select home_visit. `undefined` means no preference; BookTestPage
   * falls back to in-clinic.
   */
  preferredVisitType?: 'in_clinic' | 'home_visit';
  addItem: (service: MockService) => void;
  removeItem: (serviceId: number) => void;
  updateQuantity: (serviceId: number, quantity: number) => void;
  setPreferredVisitType: (v: 'in_clinic' | 'home_visit' | undefined) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      preferredVisitType: undefined,
      setPreferredVisitType: (v) => set({ preferredVisitType: v }),
      addItem: (service) => {
        const existing = get().items.find((i) => i.service_id === service.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.service_id === service.id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                service_id: service.id,
                name: service.name,
                slug: service.slug,
                // services.price is a Postgres NUMERIC; node-pg returns it as
                // a string. TypeScript can't catch the mismatch at runtime —
                // coerce here so the rest of the app can rely on price being
                // a number (without this, `subtotal + homeVisitCharge` would
                // silently string-concat: 6 + "4" → "64").
                price: Number(service.price),
                quantity: 1,
                category_name: service.category_name,
                is_package: service.is_package,
                sample_type: service.sample_type,
                report_turnaround_hours: service.report_turnaround_hours,
              },
            ],
          });
        }
      },
      removeItem: (serviceId) =>
        set({ items: get().items.filter((i) => i.service_id !== serviceId) }),
      updateQuantity: (serviceId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(serviceId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.service_id === serviceId ? { ...i, quantity } : i,
          ),
        });
      },
      clear: () => set({ items: [], preferredVisitType: undefined }),
      // Coerce both sides — older persisted carts (pre-fix) might still hold
      // string prices from localStorage. Number() makes the sum honest.
      subtotal: () =>
        get().items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'arogya-cart' },
  ),
);
