import { connection } from "next/server";
import type { ReactNode } from "react";
import StoreProvider from "./StoreProvider";

export default async function RequestStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  await connection();

  return <StoreProvider>{children}</StoreProvider>;
}
