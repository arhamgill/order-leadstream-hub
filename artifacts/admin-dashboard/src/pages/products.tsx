import { useState } from "react";
import { useListAdminProducts, useUpdateAdminProduct, getListAdminProductsQueryKey, AdminProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { snakeToTitle } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

function ProductEditor({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient();
  const updateProduct = useUpdateAdminProduct();
  
  const [description, setDescription] = useState(product.description || "");
  const [buffer, setBuffer] = useState(product.buffer || "");
  const [active, setActive] = useState(product.active);
  const [packages, setPackages] = useState(product.packages.map(p => ({ ...p, id: Math.random().toString() })));

  const handleSave = () => {
    // Strip temp IDs from packages
    const cleanPackages = packages.map(({ id, ...pkg }) => ({
      quantity: Number(pkg.quantity),
      price_dollars: Number(pkg.price_dollars),
      savings_dollars: Number(pkg.savings_dollars),
      savings_label: pkg.savings_label || ""
    }));

    updateProduct.mutate({
      id: product.id,
      data: {
        description,
        buffer,
        active,
        packages: cleanPackages
      }
    }, {
      onSuccess: () => {
        toast.success(`${snakeToTitle(product.type)} updated`);
        queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      }
    });
  };

  return (
    <Card className={`border-l-4 ${active ? 'border-l-primary' : 'border-l-muted opacity-60'}`}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{snakeToTitle(product.category)} - {snakeToTitle(product.type)}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Active</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="h-20 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Buffer Info (e.g. "We send 10% extra")</Label>
            <Textarea 
              value={buffer} 
              onChange={e => setBuffer(e.target.value)} 
              className="h-20 resize-none"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Pricing Packages</Label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPackages([...packages, { id: Math.random().toString(), quantity: 0, price_dollars: 0, savings_dollars: 0, savings_label: "" }])}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Package
            </Button>
          </div>
          
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No packages defined. Customers cannot order this.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Price ($)</div>
                <div className="col-span-3">Unit Price</div>
                <div className="col-span-2">Savings ($)</div>
                <div className="col-span-2">Label</div>
                <div className="col-span-1"></div>
              </div>
              {packages.map((pkg, i) => (
                <div key={pkg.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded-md">
                  <div className="col-span-2">
                    <Input type="number" value={pkg.quantity} onChange={e => {
                      const newPkgs = [...packages];
                      newPkgs[i].quantity = Number(e.target.value);
                      setPackages(newPkgs);
                    }} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={pkg.price_dollars} onChange={e => {
                      const newPkgs = [...packages];
                      newPkgs[i].price_dollars = Number(e.target.value);
                      setPackages(newPkgs);
                    }} />
                  </div>
                  <div className="col-span-3 text-sm px-2 text-muted-foreground">
                    ${pkg.quantity > 0 ? (pkg.price_dollars / pkg.quantity).toFixed(2) : "0.00"} / lead
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={pkg.savings_dollars ?? 0} onChange={e => {
                      const newPkgs = [...packages];
                      newPkgs[i].savings_dollars = Number(e.target.value);
                      setPackages(newPkgs);
                    }} />
                  </div>
                  <div className="col-span-2">
                    <Input value={pkg.savings_label || ""} placeholder="e.g. Most Popular" onChange={e => {
                      const newPkgs = [...packages];
                      newPkgs[i].savings_label = e.target.value;
                      setPackages(newPkgs);
                    }} />
                  </div>
                  <div className="col-span-1 text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      setPackages(packages.filter((_, idx) => idx !== i));
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={updateProduct.isPending} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50">
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Products() {
  const { data: products, isLoading } = useListAdminProducts();

  if (isLoading) return <div className="p-6">Loading catalog...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
      <p className="text-muted-foreground">Manage leads, pricing, and availability.</p>

      <div className="space-y-6">
        {products?.map(product => (
          <ProductEditor key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
