import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  confirmPublishPage,
  confirmCreateDiscount,
  confirmUpdateProduct,
} from "../lib/ai/tools";
import {
  getOrCreateList,
  getProfilesByEmails,
  addProfilesToList,
  createCampaign,
  sendCampaign,
} from "../lib/klaviyo/client";

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

      case "createKlaviyoAudience": {
        if (!process.env.KLAVIYO_API_KEY) {
          return Response.json({ success: false, error: "Klaviyo is not configured" }, { status: 500 });
        }
        const list = await getOrCreateList(params.audienceName);
        const listId = list.id;
        const profileMap = await getProfilesByEmails(params.customerEmails);
        const profileIds = Object.values(profileMap).filter(Boolean) as string[];
        if (profileIds.length > 0) {
          await addProfilesToList(listId, profileIds);
        }
        return Response.json({
          success: true,
          listId,
          audienceName: params.audienceName,
          profilesAdded: profileIds.length,
          profilesNotFound: params.customerEmails.length - profileIds.length,
        });
      }

      case "sendKlaviyoCampaign": {
        if (!process.env.KLAVIYO_API_KEY) {
          return Response.json({ success: false, error: "Klaviyo is not configured" }, { status: 500 });
        }
        const campaignList = await getOrCreateList(params.audienceName || params.campaignName);
        const campaignListId = campaignList.id;
        const campaignProfileMap = await getProfilesByEmails(params.customerEmails);
        const campaignProfileIds = Object.values(campaignProfileMap).filter(Boolean) as string[];
        if (campaignProfileIds.length > 0) {
          await addProfilesToList(campaignListId, campaignProfileIds);
        }
        const campaign = await createCampaign({
          name: params.campaignName,
          listId: campaignListId,
          subject: params.subject,
          previewText: params.previewText,
          htmlBody: params.htmlBody,
        });
        let sent = false;
        try {
          await sendCampaign(campaign.id);
          sent = true;
        } catch (e) {
          console.warn("Campaign send failed (may be free tier limitation):", e);
        }
        return Response.json({
          success: true,
          campaignId: campaign.id,
          sent,
          recipientCount: campaignProfileIds.length,
        });
      }

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
