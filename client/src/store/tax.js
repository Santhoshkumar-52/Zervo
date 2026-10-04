import { create } from "zustand";

import {
  createTax as createTaxRequest,
  deleteTax as deleteTaxRequest,
  getTaxById,
  getTaxes,
  updateTax as updateTaxRequest,
  updateTaxStatus,
} from "@/api/tax/taxApi";
import { notifyError, notifySuccess } from "@/utils/notification";

/**
 * Tax store: the single source of truth for the tax screen.
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
const matchesSearch = (tax, search) => {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [tax.name, tax.description].some(
    (value) => value && String(value).toLowerCase().includes(query),
  );
};

// Same order as the server: name A-Z, then newest id first.
const compareTaxes = (a, b) =>
  (a.name ?? "").localeCompare(b.name ?? "") || b.id - a.id;

// Replace one tax everywhere it is held in the store.
const mergeTax = (state, tax) => ({
  taxes: state.taxes.map((item) =>
    item.id === tax.id ? { ...item, ...tax } : item,
  ),
  selectedTax:
    state.selectedTax?.id === tax.id
      ? { ...state.selectedTax, ...tax }
      : state.selectedTax,
});

const initialState = {
  // Data
  taxes: [],
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

  // Tax being edited (set from the clicked row, then refreshed by id)
  selectedTax: null,
  isSelectedLoading: false,

  // Mutation status
  isSaving: false, // create / update
  isDeleting: false,
  statusUpdatingIds: [],
};

export const useTaxStore = create((set, get) => ({
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

  // GET /tax  (reads the page + applied search from the store)
  fetchTaxes: async () => {
    const { pagination, appliedSearch } = get();
    const requestId = ++listRequestId;

    set((state) => ({
      isFetching: true,
      isLoading: !state.hasLoaded,
      error: null,
    }));

    try {
      const response = await getTaxes({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: appliedSearch,
      });

      if (requestId !== listRequestId) return;

      // Server shape: { success, message, data: { taxes, pagination } }
      const { taxes, pagination: serverPagination } = response.data.data;

      set({
        taxes,
        total: serverPagination.total,
        hasLoaded: true,
        isLoading: false,
        isFetching: false,
      });
    } catch (error) {
      if (requestId !== listRequestId) return;

      const message = getApiError(error, "Failed to load taxes");

      set({ error: message, isLoading: false, isFetching: false });
      notifyError(message);
    }
  },

  // ---------------------------------------------------------------
  // Selected tax (edit form)
  // ---------------------------------------------------------------

  // Show the clicked row immediately, then call fetchTaxById for fresh data.
  selectTax: (tax) => set({ selectedTax: tax }),

  clearSelectedTax: () => {
    detailRequestId += 1;
    set({ selectedTax: null, isSelectedLoading: false });
  },

  // GET /tax/:id
  fetchTaxById: async (id) => {
    const requestId = ++detailRequestId;

    set({ isSelectedLoading: true });

    try {
      const response = await getTaxById(id);

      // Server shape: { success, message, data: { tax } }
      const tax = response.data.data.tax;

      if (requestId === detailRequestId) {
        set((state) => ({
          ...mergeTax(state, tax),
          selectedTax: tax,
          isSelectedLoading: false,
        }));
      }

      return tax;
    } catch (error) {
      if (requestId === detailRequestId) {
        set({ isSelectedLoading: false });
        notifyError(getApiError(error, "Failed to load tax"));

        // Deleted by someone else: drop it from the table too.
        if (error?.response?.status === 404) {
          set((state) => ({
            taxes: state.taxes.filter((item) => item.id !== id),
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

  // POST /tax
  createTax: async (values) => {
    set({ isSaving: true });

    try {
      const response = await createTaxRequest(values);
      const tax = response.data.data.tax;

      set((state) => {
        // Not part of the list being viewed (an active search it doesn't match).
        if (!matchesSearch(tax, state.appliedSearch)) return state;

        const total = state.total + 1;

        // Only the first page can show it; other pages just get the new total.
        if (state.pagination.pageIndex !== 0) return { total };

        return {
          total,
          taxes: [...state.taxes, tax]
            .sort(compareTaxes)
            .slice(0, state.pagination.pageSize),
        };
      });

      notifySuccess(`${tax.name} added`);

      return tax;
    } catch (error) {
      notifyError(getApiError(error, "Failed to add tax"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /tax/:id
  updateTax: async (id, values) => {
    set({ isSaving: true });

    try {
      const response = await updateTaxRequest(id, values);
      const tax = response.data.data.tax;

      set((state) => mergeTax(state, tax));

      notifySuccess(`${tax.name} updated`);

      return tax;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update tax"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /tax/:id/status
  toggleStatus: async (tax, isActive) => {
    set((state) => ({
      statusUpdatingIds: [...state.statusUpdatingIds, tax.id],
    }));

    try {
      const response = await updateTaxStatus(tax.id, isActive);
      const updated = response.data.data.tax;

      set((state) => mergeTax(state, updated));

      notifySuccess(
        `${updated.name} marked as ${isActive ? "active" : "inactive"}`,
      );

      return updated;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update tax status"));
      throw error;
    } finally {
      set((state) => ({
        statusUpdatingIds: state.statusUpdatingIds.filter((id) => id !== tax.id),
      }));
    }
  },

  // DELETE /tax/:id
  deleteTax: async (tax) => {
    set({ isDeleting: true });

    try {
      await deleteTaxRequest(tax.id);

      set((state) => {
        const taxes = state.taxes.filter((item) => item.id !== tax.id);
        const { pageIndex } = state.pagination;

        return {
          taxes,
          total: Math.max(0, state.total - 1),
          selectedTax:
            state.selectedTax?.id === tax.id ? null : state.selectedTax,
          // Emptied a later page: step back (the page refetches that page).
          pagination:
            taxes.length === 0 && pageIndex > 0
              ? { ...state.pagination, pageIndex: pageIndex - 1 }
              : state.pagination,
        };
      });

      notifySuccess(`${tax.name} deleted`);
    } catch (error) {
      notifyError(getApiError(error, "Failed to delete tax"));
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
