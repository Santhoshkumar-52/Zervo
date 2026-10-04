import { create } from "zustand";

import {
  createDiscount as createDiscountRequest,
  deleteDiscount as deleteDiscountRequest,
  getDiscountById,
  getDiscounts,
  updateDiscount as updateDiscountRequest,
  updateDiscountStatus,
} from "@/api/discount/discountApi";
import { notifyError, notifySuccess } from "@/utils/notification";

/**
 * Discount store: the single source of truth for the discount screen.
 *
 *   API  ->  store  <->  page
 *
 * - The page only renders from the store and calls its actions.
 * - The list is fetched only when the page or applied search changes.
 *   create / update / status / delete call their API once and then update the
 *   store from the response; they never re-fetch the list.
 * - Actions show the success / error toast and re-throw on failure, so a
 *   dialog awaiting the action stays open when it fails.
 */

const initialPagination = {
  pageIndex: 0,
  pageSize: 10,
};

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// Used to ignore a slow response when a newer request has already been made.
let listRequestId = 0;
let detailRequestId = 0;

// Mirrors the server search: name or description contains text.
const matchesSearch = (discount, search) => {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [discount.name, discount.description].some(
    (value) => value && String(value).toLowerCase().includes(query),
  );
};

// Same order as the server: name A-Z, then newest id first.
const compareDiscounts = (a, b) =>
  (a.name ?? "").localeCompare(b.name ?? "") || b.id - a.id;

// Replace one discount everywhere it is held in the store.
const mergeDiscount = (state, discount) => ({
  discounts: state.discounts.map((item) =>
    item.id === discount.id ? { ...item, ...discount } : item,
  ),
  selectedDiscount:
    state.selectedDiscount?.id === discount.id
      ? { ...state.selectedDiscount, ...discount }
      : state.selectedDiscount,
});

const initialState = {
  // Data
  discounts: [],
  total: 0,

  // Table state. `search` is the input text; `appliedSearch` is the debounced
  // value the list is actually fetched with.
  search: "",
  appliedSearch: "",
  pagination: initialPagination,

  // List status
  hasLoaded: false,
  isLoading: false, // first load, nothing to show yet
  isFetching: false, // any list request in flight
  error: null,

  // Discount being edited (set from the clicked row, then refreshed by id)
  selectedDiscount: null,
  isSelectedLoading: false,

  // Mutation status
  isSaving: false, // create / update
  isDeleting: false,
  statusUpdatingIds: [],
};

export const useDiscountStore = create((set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------
  // Table state
  // ---------------------------------------------------------------

  setSearch: (updater) =>
    set((state) => ({
      search: typeof updater === "function" ? updater(state.search) : updater,
    })),

  // Called once the user stops typing. A new search always starts at page 1.
  applySearch: (value) =>
    set((state) =>
      state.appliedSearch === value
        ? state
        : {
            appliedSearch: value,
            pagination: { ...state.pagination, pageIndex: 0 },
          },
    ),

  setPagination: (updater) =>
    set((state) => ({
      pagination:
        typeof updater === "function" ? updater(state.pagination) : updater,
    })),

  // ---------------------------------------------------------------
  // List
  // ---------------------------------------------------------------

  // GET /discount  (reads the page + applied search from the store)
  fetchDiscounts: async () => {
    const { pagination, appliedSearch } = get();
    const requestId = ++listRequestId;

    set((state) => ({
      isFetching: true,
      isLoading: !state.hasLoaded,
      error: null,
    }));

    try {
      const response = await getDiscounts({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: appliedSearch,
      });

      if (requestId !== listRequestId) return;

      // Server shape: { success, message, data: { discounts, pagination } }
      const { discounts, pagination: serverPagination } = response.data.data;

      set({
        discounts,
        total: serverPagination.total,
        hasLoaded: true,
        isLoading: false,
        isFetching: false,
      });
    } catch (error) {
      if (requestId !== listRequestId) return;

      const message = getApiError(error, "Failed to load discounts");

      set({ error: message, isLoading: false, isFetching: false });
      notifyError(message);
    }
  },

  // ---------------------------------------------------------------
  // Selected discount (edit form)
  // ---------------------------------------------------------------

  // Show the clicked row immediately, then call fetchDiscountById for fresh data.
  selectDiscount: (discount) => set({ selectedDiscount: discount }),

  clearSelectedDiscount: () => {
    detailRequestId += 1;
    set({ selectedDiscount: null, isSelectedLoading: false });
  },

  // GET /discount/:id
  fetchDiscountById: async (id) => {
    const requestId = ++detailRequestId;

    set({ isSelectedLoading: true });

    try {
      const response = await getDiscountById(id);

      // Server shape: { success, message, data: { discount } }
      const discount = response.data.data.discount;

      if (requestId === detailRequestId) {
        set((state) => ({
          ...mergeDiscount(state, discount),
          selectedDiscount: discount,
          isSelectedLoading: false,
        }));
      }

      return discount;
    } catch (error) {
      if (requestId === detailRequestId) {
        set({ isSelectedLoading: false });
        notifyError(getApiError(error, "Failed to load discount"));

        // Deleted by someone else: drop it from the table too.
        if (error?.response?.status === 404) {
          set((state) => ({
            discounts: state.discounts.filter((item) => item.id !== id),
            total: Math.max(0, state.total - 1),
          }));
        }
      }

      throw error;
    }
  },

  // ---------------------------------------------------------------
  // Mutations (one API call, then the store is updated from the response)
  // ---------------------------------------------------------------

  // POST /discount
  createDiscount: async (values) => {
    set({ isSaving: true });

    try {
      const response = await createDiscountRequest(values);
      const discount = response.data.data.discount;

      set((state) => {
        // Not part of the list being viewed (an active search it doesn't match).
        if (!matchesSearch(discount, state.appliedSearch)) return state;

        const total = state.total + 1;

        // Only the first page can show it; other pages just get the new total.
        if (state.pagination.pageIndex !== 0) return { total };

        return {
          total,
          discounts: [...state.discounts, discount]
            .sort(compareDiscounts)
            .slice(0, state.pagination.pageSize),
        };
      });

      notifySuccess(`${discount.name} added`);

      return discount;
    } catch (error) {
      notifyError(getApiError(error, "Failed to add discount"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /discount/:id
  updateDiscount: async (id, values) => {
    set({ isSaving: true });

    try {
      const response = await updateDiscountRequest(id, values);
      const discount = response.data.data.discount;

      set((state) => mergeDiscount(state, discount));

      notifySuccess(`${discount.name} updated`);

      return discount;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update discount"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /discount/:id/status
  toggleStatus: async (discount, isActive) => {
    set((state) => ({
      statusUpdatingIds: [...state.statusUpdatingIds, discount.id],
    }));

    try {
      const response = await updateDiscountStatus(discount.id, isActive);
      const updated = response.data.data.discount;

      set((state) => mergeDiscount(state, updated));

      notifySuccess(
        `${updated.name} marked as ${isActive ? "active" : "inactive"}`,
      );

      return updated;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update discount status"));
      throw error;
    } finally {
      set((state) => ({
        statusUpdatingIds: state.statusUpdatingIds.filter(
          (id) => id !== discount.id,
        ),
      }));
    }
  },

  // DELETE /discount/:id
  deleteDiscount: async (discount) => {
    set({ isDeleting: true });

    try {
      await deleteDiscountRequest(discount.id);

      set((state) => {
        const discounts = state.discounts.filter(
          (item) => item.id !== discount.id,
        );
        const { pageIndex } = state.pagination;

        return {
          discounts,
          total: Math.max(0, state.total - 1),
          selectedDiscount:
            state.selectedDiscount?.id === discount.id
              ? null
              : state.selectedDiscount,
          // Emptied a later page: step back (the page refetches that page).
          pagination:
            discounts.length === 0 && pageIndex > 0
              ? { ...state.pagination, pageIndex: pageIndex - 1 }
              : state.pagination,
        };
      });

      notifySuccess(`${discount.name} deleted`);
    } catch (error) {
      notifyError(getApiError(error, "Failed to delete discount"));
      throw error;
    } finally {
      set({ isDeleting: false });
    }
  },

  reset: () => {
    listRequestId += 1;
    detailRequestId += 1;
    set({ ...initialState });
  },
}));
