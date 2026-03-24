import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  confirmPublishPage,
  confirmCreateDiscount,
  confirmUpdateProduct,
} from "../lib/ai/tools";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { action: confirmAction, ...params } = body;

  try {
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
        return Response.json(
          { success: false, error: "Unknown action" },
          { status: 400 },
        );
    }
  } catch (error: any) {
    console.error(`Confirm action "${confirmAction}" failed:`, error);
    return Response.json(
      { success: false, error: error.message || "Mutation failed" },
      { status: 500 },
    );
  }
};
