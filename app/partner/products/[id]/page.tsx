import { notFound } from "next/navigation";
import ProductEditor from "@/components/ProductEditor";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d{0,18}$/.test(id)) notFound();
  return <ProductEditor productId={Number(id)} />;
}
