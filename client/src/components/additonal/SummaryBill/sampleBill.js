// Sample data in the shape <SummaryBill bill={...} /> expects.
// Money is in paise: 450000 = 4,500.00. The figures add up
// (discount first, then 18% tax on what is left), so it doubles as a check
// of the layout. Delete it once the bill comes from the API.

export const sampleBill = {
  branch: {
    name: "Zervo Fitness Adyar",
    logo: "",
    code: "ZF-ADY",
    address: "14 Lattice Bridge Road, Adyar, Chennai 600020",
    phone: "+91 98765 43210",
    currency: "\u20B9",
  },

  summary: {
    bill_no: 1042,
    bill_date: "2026-10-11",
    subscription_no: "SUB-2026-0187",
    start_date: "2026-10-11",
    end_date: "2027-01-10",
    base_price: 810000,
    discount_type: 2,
    discount_price: 75000,
    discount_rate: null,
    discounted_price: 735000,
    tax_percent: "18.00",
    tax_amount: 132300,
    total_price: 867300,
  },

  member: {
    first_name: "Priya",
    last_name: "Raman",
    member_Id: 1042,
    phone: "+91 91234 56780",
    email: "priya.raman@example.com",
    joined_on: "2025-03-02",
    avatar_url: "",
    trainer: { full_name: "Karthik S" },
  },

  items: [
    {
      id: 1,
      item_type: "membership",
      item_name: "Quarterly membership",
      item_description: "Gym floor, group classes and locker access",
      quantity: 1,
      start_date: "2026-10-11",
      end_date: "2027-01-10",
      base_price: 450000,
      discount_type: 1,
      discount_price: 45000,
      discount_rate: "10.0000",
      discounted_price: 405000,
      tax_percent: "18.00",
      tax_amount: 72900,
      total_price: 477900,
    },
    {
      id: 2,
      item_type: "personal_training",
      item_name: "Personal training, 12 sessions",
      item_description: "One-on-one sessions with your assigned trainer",
      quantity: 1,
      start_date: "2026-10-11",
      end_date: "2027-01-10",
      base_price: 360000,
      discount_type: 2,
      discount_price: 30000,
      discount_rate: null,
      discounted_price: 330000,
      tax_percent: "18.00",
      tax_amount: 59400,
      total_price: 389400,
    },
  ],

  payment: {
    status: "completed", // draft | pending | cancelled | completed
    method: "UPI",
    paid_on: "2026-10-11T10:42:00",
    paid_price: 800000,
    change: 0,
    balance: 67300, // total 867300 - paid 800000
  },

  issued_by: "Meera Nair",
};
