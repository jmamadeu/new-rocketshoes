import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function persistOnLocalStorage(cart: Product[]) {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }

  async function saveCart(products: Product[]) {
    persistOnLocalStorage(products);
    setCart(products);
  }

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find((c) => c.id === productId)
      if (product) {
        updateProductAmount({ amount: product.amount + 1, productId })
        
        return;
      }

      const { data: productData } = await api.get<Omit<Product, "amount">>(
        `/products/${productId}`,
      );

      const newProduct: Product = {
        ...productData,
        amount: 1,
      };

      saveCart([...cart, newProduct]);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {

      if(!cart.find(p => p.id === productId)) {
        toast.error("Erro na remoção do produto");
        return
      }

      const cartsFiltered = cart.filter((c) => c.id !== productId);

      saveCart(cartsFiltered);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1 ) {
        toast.error("Quantidade solicitada fora de estoque");
        return
      }

      const {
        data: { amount: maxAmount },
      } = await api.get<{ amount: number }>(`/stock/${productId}`);


      if (amount > maxAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const cartFiltered = cart.map((p) =>
        p.id === productId ? { ...p, amount } : p,
      );

      saveCart(cartFiltered);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
