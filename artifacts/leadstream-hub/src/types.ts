export type Category = 'Final Expense' | 'Medicare' | 'ACA';
export type ProductType = 'Callback Leads' | 'Live Transfers' | 'Pre Closed Applications';

export type Package = {
  quantity: number;
  price: number;
  savings?: number;
};

export type Product = {
  id: string;
  category: Category;
  type: ProductType;
  description: string;
  buffer?: string;
  packages: Package[];
};

export type CartItem = Product & Package & { lineId: string; quantity: number };
