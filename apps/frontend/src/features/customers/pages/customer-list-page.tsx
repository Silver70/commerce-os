import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EyeIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "~/components/data-table";
import { formatMoney } from "~/lib/money";
import type { Customer } from "~/types/api";
import { customersQueryOptions } from "../queries";
import { fullName } from "../utils";
import { CustomerAvatar } from "../components/customer-avatar";
import { CustomerStatusBadge } from "../components/customer-status-badge";
import { CreateCustomerSheet } from "../components/create-customer-sheet";

const COLUMNS: DataTableColumn<Customer>[] = [
  {
    key: "customer",
    header: "Customer",
    render: (row) => {
      const name = fullName(row);
      return (
        <div className="flex items-center gap-3">
          <CustomerAvatar name={name} />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <CustomerStatusBadge status={row.status} />,
  },
  {
    key: "orders",
    header: "Orders",
    align: "center",
    className: "w-24",
    render: (row) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.ordersCount != null
          ? row.ordersCount === 0
            ? "—"
            : row.ordersCount
          : "—"}
      </span>
    ),
  },
  {
    key: "total",
    header: "Total spent",
    align: "right",
    className: "w-32",
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums">
        {row.totalSpent != null
          ? row.totalSpent === 0
            ? "—"
            : formatMoney(row.totalSpent)
          : "—"}
      </span>
    ),
  },
  {
    key: "since",
    header: "Customer since",
    className: "w-36",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    key: "view",
    header: "",
    align: "center",
    className: "w-14 pl-6",
    render: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/customers/$customerId" params={{ customerId: row.id }}>
          <EyeIcon className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];

const FILTERS: DataTableFilter[] = [
  {
    key: "status",
    placeholder: "All statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Disabled", value: "disabled" },
    ],
  },
];

export function CustomerListPage() {
  const customers: Customer[] = useSuspenseQuery(customersQueryOptions()).data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            View and manage customer accounts.
            <span className="ml-1">({customers.length} total)</span>
          </p>
        </div>
        <CreateCustomerSheet />
      </div>

      <DataTable
        data={customers}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={25}
        emptyMessage="No customers match your filters."
      />
    </div>
  );
}
