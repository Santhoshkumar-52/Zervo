import { create } from "zustand";

import {
  createPlan as createPlanRequest,
  deletePlan as deletePlanRequest,
  getPlanById,
  getPlans,
  updatePlan as updatePlanRequest,
  updatePlanStatus,
} from "@/api/plan/planApi";
import { notifyError, notifySuccess } from "@/utils/notification";

/**
 * Plan store: the single source of truth for the plans screen.
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

// Mirrors the server search: name contains text.
const matchesSearch = (plan, search) => {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return String(plan.name ?? "").toLowerCase().includes(query);
};

// Same order as the server: name A-Z, then newest id first.
const comparePlans = (a, b) =>
  (a.name ?? "").localeCompare(b.name ?? "") || b.id - a.id;

// Replace one plan everywhere it is held in the store.
const mergePlan = (state, plan) => ({
  plans: state.plans.map((item) =>
    item.id === plan.id ? { ...item, ...plan } : item,
  ),
  selectedPlan:
    state.selectedPlan?.id === plan.id
      ? { ...state.selectedPlan, ...plan }
      : state.selectedPlan,
});

const initialState = {
  // Data
  plans: [],
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

  // Plan being edited (set from the clicked row, then refreshed by id)
  selectedPlan: null,
  isSelectedLoading: false,

  // Mutation status
  isSaving: false, // create / update
  isDeleting: false,
  statusUpdatingIds: [],
};

export const usePlanStore = create((set, get) => ({
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

  // GET /plan  (reads the page + applied search from the store)
  fetchPlans: async () => {
    const { pagination, appliedSearch } = get();
    const requestId = ++listRequestId;

    set((state) => ({
      isFetching: true,
      isLoading: !state.hasLoaded,
      error: null,
    }));

    try {
      const response = await getPlans({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: appliedSearch,
      });

      if (requestId !== listRequestId) return;

      // Server shape: { success, message, data: { plans, pagination } }
      const { plans, pagination: serverPagination } = response.data.data;

      set({
        plans,
        total: serverPagination.total,
        hasLoaded: true,
        isLoading: false,
        isFetching: false,
      });
    } catch (error) {
      if (requestId !== listRequestId) return;

      const message = getApiError(error, "Failed to load plans");

      set({ error: message, isLoading: false, isFetching: false });
      notifyError(message);
    }
  },

  // ---------------------------------------------------------------
  // Selected plan (edit form)
  // ---------------------------------------------------------------

  // Show the clicked row immediately, then call fetchPlanById for fresh data.
  selectPlan: (plan) => set({ selectedPlan: plan }),

  clearSelectedPlan: () => {
    detailRequestId += 1;
    set({ selectedPlan: null, isSelectedLoading: false });
  },

  // GET /plan/:id
  fetchPlanById: async (id) => {
    const requestId = ++detailRequestId;

    set({ isSelectedLoading: true });

    try {
      const response = await getPlanById(id);

      // Server shape: { success, message, data: { plan } }
      const plan = response.data.data.plan;

      if (requestId === detailRequestId) {
        set((state) => ({
          ...mergePlan(state, plan),
          selectedPlan: plan,
          isSelectedLoading: false,
        }));
      }

      return plan;
    } catch (error) {
      if (requestId === detailRequestId) {
        set({ isSelectedLoading: false });
        notifyError(getApiError(error, "Failed to load plan"));

        // Deleted by someone else: drop it from the table too.
        if (error?.response?.status === 404) {
          set((state) => ({
            plans: state.plans.filter((item) => item.id !== id),
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

  // POST /plan
  createPlan: async (values) => {
    set({ isSaving: true });

    try {
      const response = await createPlanRequest(values);
      const plan = response.data.data.plan;

      set((state) => {
        // Not part of the list being viewed (an active search it doesn't match).
        if (!matchesSearch(plan, state.appliedSearch)) return state;

        const total = state.total + 1;

        // Only the first page can show it; other pages just get the new total.
        if (state.pagination.pageIndex !== 0) return { total };

        return {
          total,
          plans: [...state.plans, plan]
            .sort(comparePlans)
            .slice(0, state.pagination.pageSize),
        };
      });

      notifySuccess(`${plan.name} added`);

      return plan;
    } catch (error) {
      notifyError(getApiError(error, "Failed to add plan"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /plan/:id
  updatePlan: async (id, values) => {
    set({ isSaving: true });

    try {
      const response = await updatePlanRequest(id, values);
      const plan = response.data.data.plan;

      set((state) => mergePlan(state, plan));

      notifySuccess(`${plan.name} updated`);

      return plan;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update plan"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /plan/:id/status
  toggleStatus: async (plan, isActive) => {
    set((state) => ({
      statusUpdatingIds: [...state.statusUpdatingIds, plan.id],
    }));

    try {
      const response = await updatePlanStatus(plan.id, isActive);
      const updated = response.data.data.plan;

      set((state) => mergePlan(state, updated));

      notifySuccess(
        `${updated.name} marked as ${isActive ? "active" : "inactive"}`,
      );

      return updated;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update plan status"));
      throw error;
    } finally {
      set((state) => ({
        statusUpdatingIds: state.statusUpdatingIds.filter(
          (id) => id !== plan.id,
        ),
      }));
    }
  },

  // DELETE /plan/:id
  deletePlan: async (plan) => {
    set({ isDeleting: true });

    try {
      await deletePlanRequest(plan.id);

      set((state) => {
        const plans = state.plans.filter((item) => item.id !== plan.id);
        const { pageIndex } = state.pagination;

        return {
          plans,
          total: Math.max(0, state.total - 1),
          selectedPlan:
            state.selectedPlan?.id === plan.id ? null : state.selectedPlan,
          // Emptied a later page: step back (the page refetches that page).
          pagination:
            plans.length === 0 && pageIndex > 0
              ? { ...state.pagination, pageIndex: pageIndex - 1 }
              : state.pagination,
        };
      });

      notifySuccess(`${plan.name} deleted`);
    } catch (error) {
      notifyError(getApiError(error, "Failed to delete plan"));
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
