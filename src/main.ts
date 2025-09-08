import { Devvit, type FormField } from "@devvit/public-api";

function generateVerificationCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

Devvit.configure({
  redditAPI: true,
  http: {
    domains: ["discord.com"],
  },
  redis: true
});

Devvit.addSettings([{
  type: "string",
  name: "webhookLink",
  label: "Webhook Link",
  scope: 'installation',
  onValidate: async ({ value }) => {
    if (!value?.includes("https://discord.com/api/webhooks")) {
      return "The inputted text must be a webhook link to a discord channel where the verifications are logged"
    }
  }
}])

const verificationForm = Devvit.createForm({
  fields: [
    {
      type: "string",
      name: "discordUsername",
      label: "Discord Username"
    }
  ]
}, async (event, context) => {
  const username = await context.reddit.getCurrentUsername()
  const webhookLink = await context.settings.get("webhookLink");
  let code = generateVerificationCode()
  const redisCode = await context.redis.get(username!)
  if (redisCode) {
    code = redisCode;
  }
  else {
    context.redis.set(username!, code)
  }
  try {
    context.ui.showToast("Generating you verification code, and sending you a DM with it")
    await context.reddit.sendPrivateMessage({
      to: username!,
      subject: "Please input this code in your Discord ticket من فضلك اكتب الكود ده في التيكيت في ديسكورد ",
      text: `${code}`
    })
    context.ui.showToast("Sent you a DM with the code")
    await fetch(webhookLink!.toString(), {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "content": `${event.values.discordUsername} - ${code} - ${username}`
      })
    })
  }
  catch (e) {
    context.ui.showToast("Something went wrong with verifying")
  }
});

Devvit.addMenuItem({
  label: "Discord Verification",
  location: "subreddit",
  description:
    "verify your account in discord server gate",
  onPress: (_, context) => {
    context.ui.showForm(verificationForm)
  },
});

export default Devvit;
