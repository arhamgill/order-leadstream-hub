import { useState } from "react";
import { useListAdminOrders } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10">Pending</Badge>;
    case 'paid': return <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/10">Paid</Badge>;
    case 'processing': return <Badge variant="outline" className="text-cyan-400 border-cyan-400/20 bg-cyan-400/10">Processing</Badge>;
    case 'completed': return <Badge variant="outline" className="text-green-400 border-green-400/20 bg-green-400/10">Completed</Badge>;
    case 'refunded': return <Badge variant="outline" className="text-red-400 border-red-400/20 bg-red-400/10">Refunded</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export function PaymentStatusBadge({ status, method }: { status: string, method: string }) {
  if (method === 'zelle' && status === 'pending') {
    return <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10">Awaiting Zelle</Badge>;
  }
  if (status === 'succeeded') {
    return <Badge variant="outline" className="text-green-400 border-green-400/20 bg-green-400/10">Succeeded</Badge>;
  }
  return <Badge variant="outline" className="capitalize">{status}</Badge>;
}

export default function Orders() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 20;

  const { data, isLoading } = useListAdminOrders({ page, limit, search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : data?.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              data?.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                      {order.order_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{order.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs font-medium uppercase text-muted-foreground">{order.payment_method}</span>
                      <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total_cents)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to Math.min(page * limit, data.total) of {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= data.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
