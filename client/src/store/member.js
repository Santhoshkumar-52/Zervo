import { create } from "zustand";

import {
  createMember as createMemberRequest,
  deleteMember as deleteMemberRequest,
  getMemberById,
  getMembers,
  updateMember as updateMemberRequest,
  updateMemberStatus,
} from "@/api/member/memberApi";
import { notifyError, notifySuccess } from "@/utils/notification";

/**
 * Member store: the single source of truth for the members screen.
 *
 *   API  ->  store  <->  page
 *
 * - The page only renders from the store and calls its actions.
 * - Every action calls the API; the store is updated only after the API
 *   succeeds, so the table updates by itself.
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

// Mirrors the server search: name, email, phone or trainer name contains text.
const matchesSearch = (member, search) => {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [
    member.member_name,
    member.email,
    member.phone,
    member.trainer_name,
  ].some((value) => value && String(value).toLowerCase().includes(query));
};

// Same order as the server: newest joined first, then newest id first.
const compareMembers = (a, b) =>
  (b.joined_on ?? "").localeCompare(a.joined_on ?? "") || b.id - a.id;

// Replace one member everywhere it is held in the store.
const mergeMember = (state, member) => ({
  members: state.members.map((item) =>
    item.id === member.id ? { ...item, ...member } : item,
  ),
  selectedMember:
    state.selectedMember?.id === member.id
      ? { ...state.selectedMember, ...member }
      : state.selectedMember,
});

const initialState = {
  // Data
  members: [],
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

  // Member being edited (set from the clicked row, then refreshed by id)
  selectedMember: null,
  isSelectedLoading: false,

  // Mutation status
  isSaving: false, // create / update
  isDeleting: false,
  statusUpdatingIds: [],
};

export const useMemberStore = create((set, get) => ({
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

  // GET /member  (reads the page + applied search from the store)
  fetchMembers: async () => {
    const { pagination, appliedSearch } = get();
    const requestId = ++listRequestId;

    set((state) => ({
      isFetching: true,
      isLoading: !state.hasLoaded,
      error: null,
    }));

    try {
      const response = await getMembers({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: appliedSearch,
      });

      if (requestId !== listRequestId) return;

      // Server shape: { success, message, data: { members, pagination } }
      const { members, pagination: serverPagination } = response.data.data;

      set({
        members,
        total: serverPagination.total,
        hasLoaded: true,
        isLoading: false,
        isFetching: false,
      });
    } catch (error) {
      if (requestId !== listRequestId) return;

      const message = getApiError(error, "Failed to load members");

      set({ error: message, isLoading: false, isFetching: false });
      notifyError(message);
    }
  },

  // ---------------------------------------------------------------
  // Selected member (edit form)
  // ---------------------------------------------------------------

  // Show the clicked row immediately, then call fetchMemberById for fresh data.
  selectMember: (member) => set({ selectedMember: member }),

  clearSelectedMember: () => {
    detailRequestId += 1;
    set({ selectedMember: null, isSelectedLoading: false });
  },

  // GET /member/:id
  fetchMemberById: async (id) => {
    const requestId = ++detailRequestId;

    set({ isSelectedLoading: true });

    try {
      const response = await getMemberById(id);

      // Server shape: { success, message, data: { member } }
      const member = response.data.data.member;

      if (requestId === detailRequestId) {
        set((state) => ({
          ...mergeMember(state, member),
          selectedMember: member,
          isSelectedLoading: false,
        }));
      }

      return member;
    } catch (error) {
      if (requestId === detailRequestId) {
        set({ isSelectedLoading: false });
        notifyError(getApiError(error, "Failed to load member"));

        // Deleted by someone else: drop it from the table too.
        if (error?.response?.status === 404) {
          set((state) => ({
            members: state.members.filter((item) => item.id !== id),
            total: Math.max(0, state.total - 1),
          }));
        }
      }

      throw error;
    }
  },

  // ---------------------------------------------------------------
  // Mutations (API first, store after success)
  // ---------------------------------------------------------------

  // POST /member
  createMember: async (values) => {
    set({ isSaving: true });

    try {
      const response = await createMemberRequest(values);
      const member = response.data.data.member;

      set((state) => {
        // Not part of the list being viewed (an active search it doesn't match).
        if (!matchesSearch(member, state.appliedSearch)) return state;

        const total = state.total + 1;

        // Only the first page can show it; other pages just get the new total.
        if (state.pagination.pageIndex !== 0) return { total };

        return {
          total,
          members: [...state.members, member]
            .sort(compareMembers)
            .slice(0, state.pagination.pageSize),
        };
      });

      notifySuccess(`${member.member_name} added`);

      return member;
    } catch (error) {
      notifyError(getApiError(error, "Failed to add member"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /member/:id
  updateMember: async (id, values) => {
    set({ isSaving: true });

    try {
      const response = await updateMemberRequest(id, values);
      const member = response.data.data.member;

      set((state) => mergeMember(state, member));

      notifySuccess(`${member.member_name} updated`);

      return member;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update member"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /member/:id/status
  toggleStatus: async (member, isActive) => {
    set((state) => ({
      statusUpdatingIds: [...state.statusUpdatingIds, member.id],
    }));

    try {
      const response = await updateMemberStatus(member.id, isActive);
      const updated = response.data.data.member;

      set((state) => mergeMember(state, updated));

      notifySuccess(
        `${updated.member_name} marked as ${isActive ? "active" : "inactive"}`,
      );

      return updated;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update member status"));
      throw error;
    } finally {
      set((state) => ({
        statusUpdatingIds: state.statusUpdatingIds.filter(
          (id) => id !== member.id,
        ),
      }));
    }
  },

  // DELETE /member/:id
  deleteMember: async (member) => {
    set({ isDeleting: true });

    try {
      await deleteMemberRequest(member.id);

      set((state) => {
        const members = state.members.filter((item) => item.id !== member.id);
        const { pageIndex } = state.pagination;

        return {
          members,
          total: Math.max(0, state.total - 1),
          selectedMember:
            state.selectedMember?.id === member.id ? null : state.selectedMember,
          // Emptied a later page: step back (the page refetches that page).
          pagination:
            members.length === 0 && pageIndex > 0
              ? { ...state.pagination, pageIndex: pageIndex - 1 }
              : state.pagination,
        };
      });

      notifySuccess(`${member.member_name} deleted`);
    } catch (error) {
      notifyError(getApiError(error, "Failed to delete member"));
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
