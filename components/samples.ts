export const SAMPLES = [
  {
    key: "parcel",
    label: "Parcel fee",
    hint: "Delivery notice",
    tint: "var(--blue-tint)",
    text: "Delivery notice: your parcel could not be delivered. Pay a small fee at https://parcel-redelivery.top/pay within 24 hours or it will be returned to sender.",
  },
  {
    key: "wrong-number",
    label: "Wrong number",
    hint: "Friendly stranger",
    tint: "var(--card)",
    text: "Hi, is this Sarah? Oh sorry, wrong number! You seem really nice though. A friend of mine makes steady profits on a trading platform, happy to show you how it works.",
  },
  {
    key: "code",
    label: "Login code",
    hint: "One-time code",
    tint: "var(--green-tint)",
    text: "Your verification code is 482913. It expires in 10 minutes. Never share this code with anyone.",
  },
] as const;

export const CHANNELS = [
  { value: "came by SMS", label: "Text message" },
  { value: "came by email", label: "Email" },
  { value: "phone call transcript", label: "Phone call" },
  { value: "came through a social media or chat app", label: "Social or chat" },
];
