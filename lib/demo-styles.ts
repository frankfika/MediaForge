/** Demo styles for first-run play. Relative imports only: scripts/seed.ts runs this under tsx. Ids are fixed uuids so reloading is idempotent. */
import type { Style } from "./types";

export const DEMO_STYLES: Style[] = [
  {
    id: "d3a10001-0000-4000-8000-000000000001",
    name: "极简技术流",
    version: 1,
    prompt: "用短句和技术人的克制语气写作。先给结论,再给一两条证据;不用感叹号,不堆形容词;术语保持原文,必要时用代码或列表。每段不超过三句。",
    features: {
      avgSentenceLength: 14,
      vocabulary: ["本质", "结论", "实现", "取舍", "成本", "边界"],
      rhythm: "short, punchy sentences",
      devices: ["lists", "code snippets"],
      taboos: ["感叹号", "营销话术", "空泛形容词"],
    },
  },
  {
    id: "d3a10002-0000-4000-8000-000000000002",
    name: "小红书种草",
    version: 1,
    prompt: "像和闺蜜聊天:开头一句抓人的感受,中间分点说亮点,多用 emoji 和口语,结尾用提问引导评论。标题带数字或情绪词。",
    features: {
      avgSentenceLength: 12,
      vocabulary: ["绝了", "真的", "姐妹们", "亲测", "谁懂", "必入"],
      rhythm: "short-short-long, chatty",
      devices: ["rhetorical questions", "emoji", "lists"],
      taboos: ["长段落", "学术腔"],
    },
  },
  {
    id: "d3a10003-0000-4000-8000-000000000003",
    name: "公众号深度评论",
    version: 1,
    prompt: "以一个反常识的判断开篇,层层递进:现象 → 原因 → 反例 → 判断。长短句交错,善用类比和引用,结尾回到开头的判断并留一个开放问题。",
    features: {
      avgSentenceLength: 38,
      vocabulary: ["事实上", "换个角度", "更深一层", "归根结底", "悖论", "趋势"],
      rhythm: "long, flowing sentences with a short punchline",
      devices: ["analogies", "quotations", "rhetorical questions"],
      taboos: ["标题党", "情绪化断言"],
    },
  },
];
