export interface FilterOptions {
  search: string;
  category_id: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by: "popularity" | "price_asc" | "price_desc" | "newest" | "name_asc";
}