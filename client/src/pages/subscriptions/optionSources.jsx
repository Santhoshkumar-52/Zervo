import { getMembers } from "@/api/member/memberApi";
import { getPlans } from "@/api/plan/planApi";
import { getTaxes } from "@/api/tax/taxApi";
import { formatMoney } from "@/utils/currency";

import OptionRow from "./OptionRow";

// Dropdown sources for AsyncCombobox: { key, fetchPage, getLabel, renderOption }.
// Server shape: { data: { <listKey>: [], pagination } }
const toPage = (listKey) => (response) => {
  const { [listKey]: items, pagination } = response.data.data;

  return { items, pagination };
};

export const memberSource = {
  key: "subscription-members",
  fetchPage: (params) =>
    getMembers({ ...params, memberActive: true }).then(toPage("members")),
  getLabel: (member) => member.member_name,
  renderOption: (member) => (
    <OptionRow
      title={member.member_name}
      detail={`#${member.member_Id} · ${member.phone}`}
    />
  ),
};

export const planSource = {
  key: "subscription-plans",
  fetchPage: (params) =>
    getPlans({ ...params, planActive: true }).then(toPage("plans")),
  getLabel: (plan) => plan.name,
  renderOption: (plan) => (
    <OptionRow title={plan.name} detail={formatMoney(plan.price_minor)} />
  ),
};

export const taxSource = {
  key: "subscription-taxes",
  fetchPage: (params) =>
    getTaxes({ ...params, taxActive: true }).then(toPage("taxes")),
  getLabel: (tax) => tax.name,
  renderOption: (tax) => (
    <OptionRow title={tax.name} detail={`${Number(tax.rate)}%`} />
  ),
};
