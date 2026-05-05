import { dbService } from "./db";

export type SaleCartItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export async function executeSaleTransaction(
  cartItems: SaleCartItem[],
): Promise<void> {
  await dbService.executeSaleTransaction(cartItems);
}
