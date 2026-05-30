import { queryOptions } from "@tanstack/react-query";
import {
  getDiscountsServerFn,
  getDiscountByIdServerFn,
  getCouponsServerFn,
} from "~/server/discounts";

export const discountsQueryOptions = () =>
  queryOptions({
    queryKey: ["discounts"],
    queryFn: () => getDiscountsServerFn(),
    staleTime: 30 * 1000,
  });

export const discountQueryOptions = (discountId: string) =>
  queryOptions({
    queryKey: ["discounts", discountId],
    queryFn: () => getDiscountByIdServerFn({ data: { discountId } }),
    staleTime: 30 * 1000,
  });

export const couponsQueryOptions = () =>
  queryOptions({
    queryKey: ["coupons"],
    queryFn: () => getCouponsServerFn(),
    staleTime: 30 * 1000,
  });
