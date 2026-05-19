export function styles(color: string, customCss = ""): string {
  const brandDark = mixHex(color, "#9E2600", 0.18);
  const brandHover = mixHex(color, "#111827", 0.12);
  const brandSoft = mixHex(color, "#FFFFFF", 0.08);
  return `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
.cf-root{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1E232A;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.cf-root *{box-sizing:border-box}
.cf-root h1,.cf-root h2,.cf-root h3,.cf-root h4,.cf-root h5,.cf-root h6,.cf-root .cf-title,.cf-root .cf-welcome-copy,.cf-root .cf-form-title{font-family:'DM Sans',system-ui,sans-serif}
.cf-bubble{position:fixed;z-index:2147483000;width:56px;height:56px;border-radius:999px;border:0;background:linear-gradient(180deg,${color},${brandDark});color:white;box-shadow:0 16px 38px rgba(15,23,42,.22),0 0 0 1px rgba(255,255,255,.18) inset;display:grid;place-items:center;cursor:pointer;right:24px;bottom:24px;transition:transform .15s cubic-bezier(.23,1,.32,1),box-shadow .15s ease}
.cf-bubble:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 20px 48px rgba(15,23,42,.26),0 0 0 1px rgba(255,255,255,.2) inset}
.cf-bubble:active{transform:scale(.97)}
.cf-bubble.cf-pos-bottom-left{left:24px;right:auto}.cf-bubble.cf-pos-top-right{top:24px;bottom:auto}.cf-bubble.cf-pos-top-left{top:24px;bottom:auto;left:24px;right:auto}
.cf-bubble:after{content:"";position:absolute;inset:6px;border-radius:999px;border:1px solid rgba(255,255,255,.24)}
.cf-bubble svg{width:26px;height:26px}.cf-badge{position:absolute;right:-3px;top:-3px;min-width:18px;height:18px;border-radius:999px;background:#E53935;color:#fff;font-size:11px;display:grid;place-items:center;padding:0 4px;font-weight:700;box-shadow:0 0 0 2px #fff}
.cf-bubble-pulse{position:absolute;inset:-4px;border-radius:999px;animation:bubblePulse 2s ease-in-out infinite;border:2px solid ${color}}
@keyframes bubblePulse{0%,100%{opacity:0;transform:scale(1)}50%{opacity:.4;transform:scale(1.15)}}
.cf-eyecatcher{position:fixed;z-index:2147482999;max-width:220px;background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.18);padding:12px 14px 14px;font-size:13px;color:#1E232A;border:1px solid #E5E7EB;animation:cfSlideIn .3s ease}
.cf-eyecatcher.cf-pos-bottom-right{right:96px;bottom:34px}.cf-eyecatcher.cf-pos-bottom-left{left:96px;bottom:34px}.cf-eyecatcher.cf-pos-top-right{right:96px;top:34px}.cf-eyecatcher.cf-pos-top-left{left:96px;top:34px}
@keyframes cfSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.cf-eyecatcher img{display:block;max-width:100%;border-radius:8px;margin-bottom:8px}
.cf-eyecatcher-html{margin-bottom:8px}
.cf-eyecatcher button.cf-eyecatcher-close{position:absolute;right:6px;top:6px;border:0;background:transparent;font-size:14px;cursor:pointer;color:#6B7280}
.cf-panel{position:fixed;z-index:2147483000;right:24px;bottom:92px;width:380px;height:560px;max-height:calc(100vh - 116px);background:#fff;border:1px solid rgba(227,230,235,.9);border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.22),0 0 0 1px rgba(255,255,255,.65) inset;display:flex;flex-direction:column;overflow:hidden;transform-origin:bottom right;animation:cfPanelIn .24s cubic-bezier(.23,1,.32,1) forwards}
.cf-panel.cf-pos-bottom-left{left:24px;right:auto;transform-origin:bottom left}.cf-panel.cf-pos-top-right{top:96px;bottom:auto;transform-origin:top right}.cf-panel.cf-pos-top-left{top:96px;bottom:auto;left:24px;right:auto;transform-origin:top left}
@keyframes cfPanelIn{from{opacity:0;transform:scale(.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
.cf-head{background:linear-gradient(180deg,${color},${brandDark});color:#fff;padding:16px 16px 12px;display:flex;align-items:center;justify-content:space-between}
.cf-brand-row{display:flex;align-items:center;gap:12px}
.cf-title{font-size:16px;font-weight:800;line-height:1.1;letter-spacing:0}
.cf-subtitle{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:12px;opacity:.9}
.cf-head-actions{display:flex;gap:6px}
.cf-head-actions button{width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:14px;cursor:pointer;transition:background .15s ease,transform .15s cubic-bezier(.23,1,.32,1)}
.cf-head-actions button:hover{background:rgba(255,255,255,.22)}
.cf-head-actions button:active{transform:scale(.96)}
.cf-close{width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:22px;line-height:1;cursor:pointer;transition:background .15s ease,transform .15s cubic-bezier(.23,1,.32,1)}
.cf-close:hover{background:rgba(255,255,255,.22)}
.cf-close:active{transform:scale(.96)}
.cf-avatar-stack{position:relative;width:54px;height:36px}
.cf-avatar{position:absolute;top:0;display:grid;place-items:center;width:36px;height:36px;border-radius:999px;border:2px solid rgba(255,255,255,.85);font-size:11px;font-weight:800;box-shadow:0 8px 24px rgba(15,23,42,.18)}
.cf-avatar-a{left:0;background:#fff;color:${color}}.cf-avatar-b{right:0;background:#1E232A;color:#fff}
.cf-avatar img{width:100%;height:100%;border-radius:999px;object-fit:cover}
.cf-status-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#1DB954;box-shadow:0 0 0 3px rgba(29,185,84,.18);animation:cfPulse 2s ease-in-out infinite}
@keyframes cfPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
.cf-status-dot.cf-off{background:#9BA3B2;box-shadow:0 0 0 3px rgba(155,163,178,.18);animation:none}
.cf-welcome{background:linear-gradient(180deg,${brandSoft},${color});color:#fff;padding:0 16px 16px}
.cf-welcome-copy{font-size:20px;font-weight:800;line-height:1.18;letter-spacing:0}
.cf-welcome-meta{margin-top:9px;font-size:12px;opacity:.86}
.cf-body{flex:1;padding:14px;overflow:auto;background:linear-gradient(180deg,#F8F9FA 0%,#F4F5F7 100%);position:relative;scroll-behavior:smooth}
.cf-options{display:grid;gap:8px;margin-bottom:12px}
.cf-kb-box{display:grid;gap:8px;margin-bottom:12px}
.cf-kb-input{width:100%;border:1px solid #E5E7EB;border-radius:10px;padding:9px 11px;font:inherit;color:#1E232A;outline:none;background:#fff;transition:border-color .15s ease,box-shadow .15s ease}
.cf-kb-input:focus{border-color:${color};box-shadow:0 0 0 3px ${color}22}
.cf-kb-list{display:grid;gap:6px}
.cf-kb-item{display:block;border:1px solid #E5E7EB;border-radius:10px;background:#fff;padding:8px 10px;font-size:12px;color:#1E232A;text-decoration:none;transition:background .15s ease,border-color .15s ease}
.cf-kb-item:hover{background:${color}08;border-color:${color}44}
.cf-option{display:grid;gap:2px;width:100%;border:1px solid #E5E7EB;background:#fff;border-radius:12px;padding:12px;text-align:left;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:border-color .15s ease,background .15s ease}
.cf-option span{font-weight:700;color:#1E232A}
.cf-option small{color:#6B7280}
.cf-option:hover{border-color:${color}44;background:${color}06}
.cf-chat-start{display:inline-flex;align-items:center;gap:8px;margin:4px auto 12px;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid #E5E7EB;color:#6B7280;font-size:12px}
.cf-msg{max-width:82%;padding:10px 12px;border-radius:18px;margin:8px 0;font-size:14px;line-height:1.45;word-break:break-word;box-shadow:0 1px 2px rgba(15,23,42,.04);position:relative;animation:cfMsgIn .18s cubic-bezier(.23,1,.32,1)}
@keyframes cfMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.cf-customer{margin-left:auto;background:${color};color:#fff;border-bottom-right-radius:5px}
.cf-agent{margin-right:auto;background:#fff;color:#1E232A;border:1px solid #E5E7EB;border-bottom-left-radius:5px}
.cf-bot{margin-right:auto;background:${color}0D;color:#1E232A;border:1px solid ${color}22;border-bottom-left-radius:5px}
.cf-note{margin-right:auto;background:#FFF8E1;color:#1E232A;border:1px solid #FFE082;border-bottom-left-radius:5px;font-style:italic}
.cf-system{text-align:center;color:#6B7280;font-size:12px;margin:10px 0}
.cf-agent-name{font-size:11px;opacity:.82;margin-bottom:3px;display:flex;align-items:center;gap:6px;font-weight:600}
.cf-agent-name img{width:18px;height:18px;border-radius:999px}
.cf-msg.cf-failed{border:1px solid #E53935;color:#B71C1C;cursor:pointer}
.cf-msg .cf-meta{margin-top:5px;font-size:10px;opacity:.6;display:flex;justify-content:flex-end;gap:6px}
.cf-msg .cf-tick{font-size:10px}
.cf-preview{background:#E5E7EB;color:#4B5261;font-style:italic}
.cf-attachment{display:inline-flex;align-items:center;gap:6px;color:inherit;font-weight:700;text-decoration:underline;text-underline-offset:3px}
.cf-card{display:flex;flex-direction:column;gap:6px;background:#fff;color:#1E232A;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden}
.cf-card img{width:100%;max-height:160px;object-fit:cover}
.cf-card-title{font-weight:700;font-size:14px;padding:0 12px}
.cf-card-subtitle{font-size:12px;color:#6B7280;padding:0 12px 8px}
.cf-card-buttons{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 12px}
.cf-card-button{display:inline-flex;border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;text-decoration:none;color:#1E232A;background:#F8F9FA;cursor:pointer;transition:background .15s ease}
.cf-card-button:hover{background:#F1F5F9}
.cf-carousel{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;-webkit-overflow-scrolling:touch}
.cf-carousel::-webkit-scrollbar{display:none}
.cf-carousel-card{min-width:240px;scroll-snap-align:start}
.cf-qr-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.cf-qr{border:1px solid #E5E7EB;border-radius:999px;background:#fff;color:#1E232A;padding:6px 12px;font-size:12px;cursor:pointer;transition:background .15s ease}
.cf-qr:hover{background:#F1F5F9}
.cf-image img{max-width:240px;border-radius:12px;display:block}
.cf-video{max-width:280px;border-radius:12px}
.cf-location{display:inline-flex;background:#fff;color:#1E232A;border-radius:10px;border:1px solid #E5E7EB;padding:8px 10px;font-size:13px;text-decoration:none}
.cf-list{background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:10px;color:#1E232A}
.cf-list ul{list-style:none;padding:0;margin:6px 0 0}
.cf-list li{padding:6px 0;border-top:1px solid #F8F9FA}
.cf-list li:first-child{border-top:0}
.cf-list-subtitle{color:#6B7280;font-size:12px}
.cf-product{display:flex;gap:8px;background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:8px;color:#1E232A;text-decoration:none}
.cf-product img{width:64px;height:64px;border-radius:10px;object-fit:cover}
.cf-product-meta{flex:1;display:flex;flex-direction:column;gap:2px}
.cf-product-name{font-weight:700}
.cf-product-desc{font-size:12px;color:#6B7280}
.cf-product-price{font-size:13px;font-weight:800;color:${color}}
.cf-foot{padding:10px 12px 8px;border-top:1px solid #E5E7EB;background:#fff;position:relative}
.cf-row{display:grid;gap:8px}
.cf-tools{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none}
.cf-tools::-webkit-scrollbar{display:none}
.cf-composer{display:flex;gap:8px;align-items:flex-end}
.cf-input{flex:1;resize:none;min-height:42px;max-height:112px;border:1px solid #E3E6EB;border-radius:12px;padding:10px 12px;font:inherit;outline:none;transition:border-color .15s ease,box-shadow .15s ease;background:#fff;color:#1E232A}
.cf-input:focus{border-color:${color};box-shadow:0 0 0 3px ${color}22}
.cf-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;background:${color};color:#fff;border-radius:12px;padding:10px 13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s ease,transform .15s cubic-bezier(.23,1,.32,1),box-shadow .15s ease}
.cf-btn:hover{background:${brandHover};box-shadow:0 8px 18px ${color}22}
.cf-btn:active{transform:scale(.97)}
.cf-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.cf-btn svg{width:16px;height:16px}
.cf-icon{width:34px;height:34px;min-width:34px;padding:0;background:#F8F9FA;color:#4B5261;border:1px solid #E3E6EB;border-radius:10px;transition:background .15s ease,color .15s ease,border-color .15s ease,transform .15s cubic-bezier(.23,1,.32,1)}
.cf-icon:hover{background:#FFF4ED;color:${color};border-color:#FECCAA;box-shadow:none}
.cf-icon:active{transform:scale(.96)}
.cf-foot-hint{margin-top:6px;color:#9BA3B2;font-size:10px;text-align:center}
.cf-emoji-panel{position:absolute;bottom:60px;right:12px;width:280px;max-height:240px;overflow:auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 12px 40px rgba(15,23,42,.18);padding:8px;animation:cfSlideIn .2s ease}
.cf-emoji-group-label{font-size:10px;text-transform:uppercase;color:#6B7280;margin:6px 4px 4px;letter-spacing:.06em;font-weight:600}
.cf-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px}
.cf-gif-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.cf-gif-item{border:1px solid #E5E7EB;border-radius:8px;padding:0;background:#fff;overflow:hidden;cursor:pointer}
.cf-gif-item img{display:block;width:100%;height:86px;object-fit:cover}
.cf-emoji{background:transparent;border:0;font-size:18px;padding:6px;cursor:pointer;border-radius:6px;transition:background .1s ease}
.cf-emoji:hover{background:#F1F5F9}
.cf-locale-switch{position:absolute;top:14px;right:60px}
.cf-locale-switch select{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:8px;font-size:12px;padding:3px 6px}
.cf-form{display:grid;gap:11px;background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.04);animation:cfSlideIn .25s ease}
.cf-form-title{font-size:16px;font-weight:800}
.cf-form label{display:grid;gap:5px;color:#4B5261;font-size:12px;font-weight:600}
.cf-form label[hidden]{display:none}
.cf-form input,.cf-form textarea,.cf-form select{width:100%;border:1px solid #E5E7EB;border-radius:10px;padding:10px 11px;font:inherit;color:#1E232A;outline:none;transition:border-color .15s ease,box-shadow .15s ease}
.cf-form input:focus,.cf-form textarea:focus,.cf-form select:focus{border-color:${color};box-shadow:0 0 0 3px ${color}22}
.cf-form [aria-invalid="true"]{border-color:#E53935}
.cf-field-error{color:#E53935;font-size:11px;font-weight:600;margin-top:2px;display:block}
.cf-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cf-submit{width:100%;padding:12px}
.cf-muted{margin:0;color:#6B7280;font-size:13px;line-height:1.5}
.cf-success{display:grid;gap:4px;text-align:center;color:#1E232A}
.cf-success span{color:#6B7280}
.cf-stars{display:flex;justify-content:center;gap:8px}
.cf-star{font-size:30px;border:0;background:transparent;color:#D1D5DB;cursor:pointer;transition:color .1s ease,transform .1s ease}
.cf-star:hover{transform:scale(1.15)}
.cf-star.active{color:#FFC107}
.cf-typing{display:flex;gap:4px}
.cf-dot{width:6px;height:6px;background:${color}33;border-radius:50%;animation:cfDot 1s infinite}
.cf-dot:nth-child(2){animation-delay:.15s}
.cf-dot:nth-child(3){animation-delay:.3s}
@keyframes cfDot{50%{transform:translateY(-4px);opacity:.55}}
.cf-connect-banner{position:sticky;top:0;background:#FEF3C7;color:#92400E;font-size:12px;padding:6px 10px;border-radius:8px;margin-bottom:8px;text-align:center}
.cf-footnote{font-size:10px;text-align:center;color:#9BA3B2;padding:4px 0 6px}
.cf-footnote a{color:inherit;text-decoration:underline}
.cf-rtc-remote{position:fixed;z-index:2147483001;right:24px;bottom:24px;width:min(320px,40vw);border-radius:12px;background:#000;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.cf-panel.cf-theme-dark,.cf-theme-dark .cf-body,.cf-theme-dark .cf-foot{background:#0F1117;color:#E5E7EB;border-color:#2D333B}
.cf-theme-dark .cf-body{background:#171B20}
.cf-theme-dark .cf-form,.cf-theme-dark .cf-option,.cf-theme-dark .cf-chat-start,.cf-theme-dark .cf-customer,.cf-theme-dark .cf-success,.cf-theme-dark .cf-card,.cf-theme-dark .cf-list,.cf-theme-dark .cf-product,.cf-theme-dark .cf-location{background:#1E232A;color:#E5E7EB;border-color:#2D333B}
.cf-theme-dark .cf-bot{background:${color}15;border-color:${color}33}
.cf-theme-dark .cf-option span{color:#F8F9FA}
.cf-theme-dark .cf-option small,.cf-theme-dark .cf-muted,.cf-theme-dark .cf-foot-hint,.cf-theme-dark .cf-product-desc,.cf-theme-dark .cf-card-subtitle,.cf-theme-dark .cf-list-subtitle{color:#9BA3B2}
.cf-theme-dark .cf-form input,.cf-theme-dark .cf-form textarea,.cf-theme-dark .cf-form select,.cf-theme-dark .cf-input{background:#0F1117;color:#F8F9FA;border-color:#4B5261}
.cf-theme-dark .cf-kb-input,.cf-theme-dark .cf-kb-item{background:#1E232A;color:#E5E7EB;border-color:#2D333B}
.cf-theme-dark .cf-icon{background:#1E232A;color:#C7CCD6;border-color:#4B5261}
.cf-theme-dark .cf-emoji-panel{background:#1E232A;border-color:#2D333B;color:#F8F9FA}
.cf-theme-dark .cf-gif-item{background:#0F1117;border-color:#2D333B}
.cf-theme-dark .cf-emoji:hover{background:#0F1117}
.cf-theme-dark .cf-qr{background:#1E232A;color:#E5E7EB;border-color:#2D333B}
.cf-theme-dark .cf-note{background:#2D2810;border-color:#5C4D15;color:#E5E7EB}
@media(prefers-color-scheme:dark){
.cf-panel.cf-theme-auto,.cf-theme-auto .cf-body,.cf-theme-auto .cf-foot{background:#0F1117;color:#E5E7EB;border-color:#2D333B}
.cf-theme-auto .cf-body{background:#171B20}
.cf-theme-auto .cf-form,.cf-theme-auto .cf-option,.cf-theme-auto .cf-chat-start,.cf-theme-auto .cf-customer,.cf-theme-auto .cf-success,.cf-theme-auto .cf-card,.cf-theme-auto .cf-list,.cf-theme-auto .cf-product,.cf-theme-auto .cf-location{background:#1E232A;color:#E5E7EB;border-color:#2D333B}
.cf-theme-auto .cf-option span{color:#F8F9FA}
.cf-theme-auto .cf-option small,.cf-theme-auto .cf-muted,.cf-theme-auto .cf-foot-hint,.cf-theme-auto .cf-product-desc,.cf-theme-auto .cf-card-subtitle,.cf-theme-auto .cf-list-subtitle{color:#9BA3B2}
.cf-theme-auto .cf-form input,.cf-theme-auto .cf-form textarea,.cf-theme-auto .cf-form select,.cf-theme-auto .cf-input{background:#0F1117;color:#F8F9FA;border-color:#4B5261}
.cf-theme-auto .cf-kb-input,.cf-theme-auto .cf-kb-item{background:#1E232A;color:#E5E7EB;border-color:#2D333B}
.cf-theme-auto .cf-icon{background:#1E232A;color:#C7CCD6;border-color:#4B5261}
}
@media(max-width:520px){.cf-panel{inset:0;width:auto;height:auto;max-height:none;border-radius:0}.cf-bubble{right:18px;bottom:18px;width:52px;height:52px}.cf-field-grid{grid-template-columns:1fr}.cf-welcome-copy{font-size:19px}.cf-tools{padding-bottom:1px}.cf-icon{width:33px;height:33px;min-width:33px}.cf-btn{padding:10px 12px}}
${customCss}`;
}

function mixHex(input: string, target: string, amount: number): string {
  const source = parseHex(input);
  const dest = parseHex(target);
  if (!source || !dest) return input;
  const mixed = source.map((channel, index) => Math.round(channel * (1 - amount) + dest[index] * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(value: string): [number, number, number] | null {
  const normalized = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(normalized);
  if (short) {
    return short[1].split("").map((part) => parseInt(`${part}${part}`, 16)) as [number, number, number];
  }
  const full = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!full) return null;
  const hex = full[1];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
