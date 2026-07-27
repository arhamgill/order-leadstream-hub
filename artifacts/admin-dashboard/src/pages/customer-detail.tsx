import { useParams, Link } from "wouter";
import { useGetAdminCustomer } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Mail, Phone, Building } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders";

export default function CustomerDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useGetAdminCustomer(id);

  if (isLoading) return <div className="p-6">Loading customer...</div>;
  if (!data) return <div className="p-6 text-red-500">Customer not found</div>;

  const { customer, orders } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{customer.first_name} {customer.last_name}</h1>
          <p className="text-muted-foreground">
            Customer since {format(new Date(customer.created_at), "MMMM yyyy")}
          </p>
        </div>
        <div className="ml-auto">
          {/* Link to customer portal as instructed - just an anchor to / */}
          <Button asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Login as Customer (Portal)
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            {customer.agency_name && (
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-muted-foreground" />
                <span>{customer.agency_name}</span>
              </div>
            )}
            <div className="pt-4 mt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{orders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifetime Value</span>
                <span className="font-bold text-green-400">
                  {formatCurrency(orders.reduce((sum, o) => sum + o.total_cents, 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline text-primary">
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
