# NEXORA AI: setup (Hinglish)

Aapki site GitHub Pages par hai, wahan secret key safe nahi rakh sakte. Isliye key ek chhote Cloudflare Worker me rahegi, aur `nexora.html` sirf us Worker se baat karega.

## Files (is folder ki saari files repo ke root me copy karein, koi subfolder nahi)
```
nexora.html  nexora.css  nexora.js  nexora-md.js  nexora-config.js
nexora-worker.js  wrangler.toml  .dev.vars.example  NEXORA-SETUP.md
```
Koi purani file change nahi hui. Sirf `.gitignore` me ek line add karein: `.dev.vars`

## Step 1: API key (zaroori)
Claude.ai subscription se API access nahi milta. https://console.anthropic.com par account banao, billing/credits add karo, API key banao. Key kisi ko mat do, chat me ya GitHub par mat daalo.

## Step 2: Worker deploy (free Cloudflare account chahiye)
```
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # key yahan paste karo
npx wrangler deploy
```
Deploy ke baad URL milega, jaise `https://nexora-api.<naam>.workers.dev`.
`wrangler.toml` me `ALLOWED_ORIGIN` (aapki site) aur `MODELS` (jo models aapki key use kar sake) check karein.

## Step 3: Site ko Worker se jodo
`nexora-config.js` me URL daalo:
```js
window.NEXORA_API_URL = "https://nexora-api.<naam>.workers.dev";
```
Agar custom domain Worker ke liye use karoge to `nexora.html` ke CSP me `connect-src` me wo domain add karna hoga.

## Step 4: GitHub par push
```
git add nexora.html nexora.css nexora.js nexora-md.js nexora-config.js nexora-worker.js wrangler.toml .gitignore
git commit -m "Add NEXORA AI"
git push
```
1-2 minute baad: https://vivaan001-creator.github.io/genalpha/nexora.html

## Optional: menu me link
`more.html` ke "Settings" grid me ye line add kar sakte ho:
```html
<a href="nexora.html" class="more-item"><div class="more-icon purple"><i class="fa-solid fa-wand-magic-sparkles"></i></div><span>NEXORA AI</span></a>
```
(`more.html` admin page hai; NEXORA sab ke liye khula rahega agar URL pata ho.)

## Local test
`.dev.vars.example` ko `.dev.vars` banao, key daalo, `npx wrangler dev` chalao, aur site `python3 -m http.server 8080` se kholo (`ALLOWED_ORIGIN=http://localhost:8080`).

## Troubleshooting
- Banner "not connected": `nexora-config.js` me URL khali hai.
- "Cannot reach server": URL galat, ya `ALLOWED_ORIGIN` site se match nahi karta (https://vivaan001-creator.github.io, bina `/genalpha`).
- "no API key": `wrangler secret put ANTHROPIC_API_KEY` dobara chalao.
- "provider error": `npx wrangler tail` se logs dekho (galat model naam ya credits khatam).

## Limitations (sach-sach)
- NEXORA page ka URL jaanne wala koi bhi use kar sakta hai aur aapke API credits kharch honge. Login nahi hai. Cloudflare dashboard me Rate Limiting rule lagao aur Anthropic console me spend limit set karo.
- Worker ka rate limit sirf basic hai (har instance me alag).
- Chats sirf is browser me save hote hain. Cross-device memory nahi hai.
- Voice, file attach, PWA abhi nahi banaye (jo kaam nahi karta wo button nahi diya).
