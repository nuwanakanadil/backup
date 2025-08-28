'use client';
import ProductDetail from "@/components/products/product"; 

export default function ProductPage({ params }) {
  return <ProductDetail productId={params.id} />;
}