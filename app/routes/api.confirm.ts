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

  let body: Record<string, unknown>;
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
        const audienceParams = params as { audienceName: string; customerEmails: string[] };
        const list = await getOrCreateList(audienceParams.audienceName);
        const listId = list.id;
        const profileMap = await getProfilesByEmails(audienceParams.customerEmails);
        const profileIds = Object.values(profileMap).filter(Boolean) as string[];
        if (profileIds.length > 0) {
          await addProfilesToList(listId, profileIds);
        }
        return Response.json({
          success: true,
          listId,
          audienceName: audienceParams.audienceName,
          profilesAdded: profileIds.length,
          profilesNotFound: audienceParams.customerEmails.length - profileIds.length,
        });
      }

      case "sendKlaviyoCampaign": {
        if (!process.env.KLAVIYO_API_KEY) {
          return Response.json({ success: false, error: "Klaviyo is not configured" }, { status: 500 });
        }
        const campaignParams = params as {
          audienceName?: string; campaignName: string; customerEmails: string[];
          subject: string; previewText: string; htmlBody: string;
        };
        const campaignList = await getOrCreateList(campaignParams.audienceName || campaignParams.campaignName);
        const campaignListId = campaignList.id;
        const campaignProfileMap = await getProfilesByEmails(campaignParams.customerEmails);
        const campaignProfileIds = Object.values(campaignProfileMap).filter(Boolean) as string[];
        if (campaignProfileIds.length > 0) {
          await addProfilesToList(campaignListId, campaignProfileIds);
        }
        const campaign = await createCampaign({
          name: campaignParams.campaignName,
          listId: campaignListId,
          subject: campaignParams.subject,
          previewText: campaignParams.previewText,
          htmlBody: campaignParams.htmlBody,
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
  } catch (error: unknown) {
    console.error(`Confirm action "${confirmAction}" failed:`, error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Mutation failed" },
      { status: 500 },
    );
  }
};
