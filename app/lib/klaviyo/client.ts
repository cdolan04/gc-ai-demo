const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const REVISION = "2024-10-15";

function headers() {
  return {
    Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
    "Content-Type": "application/vnd.api+json",
    Accept: "application/vnd.api+json",
    revision: REVISION,
  };
}

async function klaviyoFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${KLAVIYO_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Klaviyo API error (${res.status}): ${error}`);
  }
  // Some Klaviyo endpoints (e.g. addProfilesToList) return 204 No Content
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getProfileByEmail(email: string): Promise<string | null> {
  const data = await klaviyoFetch(
    `/profiles/?filter=equals(email,"${email}")`,
  );
  const profiles = data?.data;
  if (profiles && profiles.length > 0) {
    return profiles[0].id;
  }
  return null;
}

export async function getProfilesByEmails(
  emails: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const email of emails) {
    try {
      const profileId = await getProfileByEmail(email);
      if (profileId) {
        result[email] = profileId;
      }
    } catch (e) {
      // Skip emails that fail lookup
      console.warn(`Failed to look up Klaviyo profile for ${email}:`, e);
    }
  }
  return result;
}

export async function getOrCreateList(name: string) {
  // Check if a list with this name already exists
  const existing = await klaviyoFetch(
    `/lists/?filter=equals(name,"${name}")`,
  );
  if (existing?.data?.length > 0) {
    return existing.data[0];
  }
  // Create a new one
  const created = await klaviyoFetch("/lists/", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "list",
        attributes: { name },
      },
    }),
  });
  return created.data;
}

export async function addProfilesToList(
  listId: string,
  profileIds: string[],
) {
  return klaviyoFetch(`/lists/${listId}/relationships/profiles/`, {
    method: "POST",
    body: JSON.stringify({
      data: profileIds.map((id) => ({ type: "profile", id })),
    }),
  });
}

export async function createCampaign({
  name,
  listId,
  subject,
  previewText,
  htmlBody,
}: {
  name: string;
  listId: string;
  subject: string;
  previewText: string;
  htmlBody: string;
}) {
  // 1. Create the campaign
  const campaignRes = await klaviyoFetch("/campaigns/", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "campaign",
        attributes: {
          name,
          audiences: {
            included: [listId],
            excluded: [],
          },
          "campaign-messages": {
            data: [
              {
                type: "campaign-message",
                attributes: {
                  channel: "email",
                  label: name,
                  content: {
                    subject,
                    preview_text: previewText,
                    from_email: process.env.KLAVIYO_FROM_EMAIL || "noreply@example.com",
                    from_label: process.env.KLAVIYO_FROM_LABEL || "Store",
                  },
                },
              },
            ],
          },
          send_strategy: {
            method: "immediate",
          },
        },
      },
    }),
  });

  const campaignId = campaignRes.data.id;

  // 2. Create a template with the HTML body (visible in Klaviyo for the campaign)
  const template = await createTemplate(name, htmlBody);
  const templateId = template.data.id;

  return { id: campaignId, templateId };
}

async function createTemplate(name: string, htmlBody: string) {
  return klaviyoFetch("/templates/", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "template",
        attributes: {
          name: `${name} - Template`,
          html: htmlBody,
          editor_type: "CODE",
        },
      },
    }),
  });
}

export async function sendCampaign(campaignId: string) {
  return klaviyoFetch("/campaign-send-jobs/", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "campaign-send-job",
        attributes: {
          campaign_id: campaignId,
        },
      },
    }),
  });
}
