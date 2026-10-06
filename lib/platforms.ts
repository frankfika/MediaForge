import type { Platform } from "./types";

export const PLATFORM_SPECS: Record<Platform, { label: string; limit: number; guide: string }> = {
  wechat: {
    label: "公众号",
    limit: 20000,
    guide: "Long-form. Title <= 22 chars. Short paragraphs, subheadings, closing line that invites replies.",
  },
  x: {
    label: "X / 推特",
    limit: 280,
    guide: "Single post <= 280 chars (CJK counts double). First line is the hook. At most 2 hashtags. No title.",
  },
  xhs: {
    label: "小红书",
    limit: 1000,
    guide: "Title <= 20 chars with one emoji. Conversational, line-broken body, light emoji, 3-5 #topics at the end.",
  },
  bilibili: {
    label: "B 站",
    limit: 2000,
    guide: "Eye-catching title; description or column body that is playful, meme-literate, clearly sectioned.",
  },
};
