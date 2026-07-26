import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@geummogi.local",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const subscription = {
  endpoint: process.argv[2],
  keys: {
    p256dh: process.argv[3],
    auth: process.argv[4],
  },
};

const payload = JSON.stringify({
  title: "테스트 알림 ⛏️",
  body: "이 알림이 보이면 발송 파이프라인은 정상이에요!",
  url: "/",
});

try {
  const res = await webpush.sendNotification(subscription, payload);
  console.log("SUCCESS", res.statusCode);
} catch (err) {
  console.error("FAILED", err.statusCode, err.body);
}
