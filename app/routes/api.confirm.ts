import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  confirmPublishPage,
  confirmCreateDiscount,
  confirmUpdateProduct,
} from "../lib/ai/tools";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();

  const { action: confirmAction, ...params } = body;

  switch (confirmAction) {
    case "publishPage":
      return Response.json(
        await confirmPublishPage(admin, params as { title: string; htmlContent: string }),
      );

    case "createDiscount":
      return Response.json(
        await confirmCreateDiscount(admin, params as {
          code: string;
          discountType: "percentage" | "fixed_amount";
          value: number;
          title: string;
          expiresAt?: string | null;
        }),
      );

    case "updateProduct":
      return Response.json(
        await confirmUpdateProduct(admin, params as {
          productId: string;
          title?: string;
          descriptionHtml?: string;
        }),
      );

    default:
      return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  }
};
