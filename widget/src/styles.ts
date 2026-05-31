export function styles(color: string, customCss = ""): string {
  const brandHover = mixHex(color, "#111827", 0.12);
  return `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

/* ── Reset & root ── */
.cf-root{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;color:#0F172A;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.cf-root *{box-sizing:border-box}

/* ── Launcher bubble — rounded square, NOT circle ── */
.cf-bubble{position:fixed;z-index:2147483000;width:56px;height:56px;border-radius:16px;border:0;background:linear-gradient(135deg,#4F46E5,#7C3AED,#F97066);color:white;box-shadow:0 20px 25px -5px rgba(15,23,42,0.1),0 8px 10px -6px rgba(15,23,42,0.06),0 0 20px rgba(79,70,229,0.25),0 0 60px rgba(79,70,229,0.1);display:grid;place-items:center;cursor:pointer;right:24px;bottom:24px;transition:transform 200ms cubic-bezier(0,0,0.2,1),box-shadow 200ms cubic-bezier(0,0,0.2,1)}
.cf-bubble:hover{transform:scale(1.08);box-shadow:0 20px 25px -5px rgba(15,23,42,0.14),0 8px 10px -6px rgba(15,23,42,0.08),0 0 30px rgba(79,70,229,0.35),0 0 80px rgba(79,70,229,0.18)}
.cf-bubble:active{transform:scale(0.95);transition-duration:100ms}
.cf-bubble.cf-pos-bottom-left{left:24px;right:auto}
.cf-bubble.cf-pos-top-right{top:24px;bottom:auto}
.cf-bubble.cf-pos-top-left{top:24px;bottom:auto;left:24px;right:auto}
.cf-bubble svg{width:28px;height:28px}
.cf-badge{position:absolute;right:-4px;top:-4px;min-width:18px;height:18px;border-radius:9999px;background:#EF4444;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 4px;box-shadow:0 0 0 2px #fff}

/* ── Eye-catcher ── */
.cf-eyecatcher{position:fixed;z-index:2147482999;max-width:220px;background:#fff;border-radius:12px;box-shadow:0 10px 15px -3px rgba(15,23,42,0.08),0 4px 6px -4px rgba(15,23,42,0.04);padding:12px 14px 14px;font-size:13px;color:#0F172A;border:1px solid #E2E8F0;animation:cfSlideIn .3s cubic-bezier(0,0,0.2,1)}
.cf-eyecatcher.cf-pos-bottom-right{right:96px;bottom:34px}
.cf-eyecatcher.cf-pos-bottom-left{left:96px;bottom:34px}
.cf-eyecatcher.cf-pos-top-right{right:96px;top:34px}
.cf-eyecatcher.cf-pos-top-left{left:96px;top:34px}
@keyframes cfSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.cf-eyecatcher img{display:block;max-width:100%;border-radius:8px;margin-bottom:8px}
.cf-eyecatcher-html{margin-bottom:8px}
.cf-eyecatcher button.cf-eyecatcher-close{position:absolute;right:6px;top:6px;border:0;background:transparent;font-size:14px;cursor:pointer;color:#94A3B8}

/* ── Panel window ── */
.cf-panel{position:fixed;z-index:2147483000;right:24px;bottom:92px;width:380px;height:560px;max-height:calc(100vh - 116px);background:#fff;border-radius:20px 20px 0 0;box-shadow:0 25px 50px -12px rgba(15,23,42,0.2);display:flex;flex-direction:column;overflow:hidden;transform-origin:bottom right;animation:cfPanelIn 300ms cubic-bezier(0.22,1,0.36,1) forwards}
.cf-panel.cf-pos-bottom-left{left:24px;right:auto;transform-origin:bottom left}
.cf-panel.cf-pos-top-right{top:96px;bottom:auto;border-radius:0 0 20px 20px;transform-origin:top right}
.cf-panel.cf-pos-top-left{top:96px;bottom:auto;left:24px;right:auto;border-radius:0 0 20px 20px;transform-origin:top left}
@keyframes cfPanelIn{from{opacity:0;transform:scale(0.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}

/* ── Header — brand gradient, NOT solid color ── */
.cf-head{background:linear-gradient(135deg,#4F46E5,#7C3AED,#F97066);color:#fff;padding:0 16px;height:72px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.cf-brand-row{display:flex;align-items:center;gap:12px}
.cf-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:600;line-height:1.2}
.cf-subtitle{display:flex;align-items:center;gap:5px;margin-top:3px;font-size:11px;opacity:0.8}
.cf-head-actions{display:flex;gap:6px}
.cf-head-actions button{width:32px;height:32px;border-radius:9999px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:14px;cursor:pointer;transition:background 150ms ease}
.cf-head-actions button:hover{background:rgba(255,255,255,0.25)}
.cf-close{width:32px;height:32px;border-radius:9999px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:20px;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background 150ms ease,transform 150ms ease}
.cf-close:hover{background:rgba(255,255,255,0.25)}
.cf-close:active{transform:scale(0.93)}

/* ── Avatar stack ── */
.cf-avatar-stack{position:relative;width:54px;height:36px}
.cf-avatar{position:absolute;top:0;display:grid;place-items:center;width:36px;height:36px;border-radius:9999px;border:2px solid rgba(255,255,255,0.9);font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,0.2)}
.cf-avatar-a{left:0;background:#fff;color:#4F46E5}
.cf-avatar-b{right:0;background:#1E293B;color:#fff}
.cf-avatar img{width:100%;height:100%;border-radius:9999px;object-fit:cover}

/* ── Status dot ── */
.cf-status-dot{display:inline-block;width:8px;height:8px;border-radius:9999px;background:#10B981;box-shadow:0 0 0 2px rgba(16,185,129,0.25);animation:cfPulse 2s ease-in-out infinite}
@keyframes cfPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.25)}}
.cf-status-dot.cf-off{background:#94A3B8;box-shadow:0 0 0 2px rgba(148,163,184,0.2);animation:none}

/* ── Welcome section (legacy compat) ── */
.cf-welcome{background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;padding:0 16px 16px}
.cf-welcome-copy{font-size:20px;font-weight:700;line-height:1.2}
.cf-welcome-meta{margin-top:8px;font-size:12px;opacity:0.85}

/* ── Message body ── */
.cf-body{flex:1;padding:16px;overflow:auto;background:#fff;position:relative;scroll-behavior:smooth}
.cf-options{display:grid;gap:8px;margin-bottom:12px}
.cf-kb-box{display:grid;gap:8px;margin-bottom:12px}
.cf-kb-input{width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:9px 12px;font:inherit;color:#0F172A;outline:none;background:#fff;font-size:14px;transition:border-color 150ms ease,box-shadow 150ms ease}
.cf-kb-input:focus{border-color:#4F46E5;box-shadow:0 0 0 3px #EEF2FF}
.cf-kb-list{display:grid;gap:6px}
.cf-kb-item{display:block;border:1px solid #E2E8F0;border-radius:8px;background:#fff;padding:8px 12px;font-size:13px;color:#0F172A;text-decoration:none;transition:background 150ms ease,border-color 150ms ease}
.cf-kb-item:hover{background:#EEF2FF;border-color:#A5B4FC}

/* ── Chat option cards ── */
.cf-option{display:grid;gap:2px;width:100%;border:1px solid #E2E8F0;background:#fff;border-radius:12px;padding:12px;text-align:left;cursor:pointer;box-shadow:0 1px 3px 0 rgba(15,23,42,0.06);transition:border-color 150ms ease,background 150ms ease}
.cf-option span{font-weight:600;color:#0F172A;font-size:14px}
.cf-option small{color:#64748B;font-size:13px}
.cf-option:hover{border-color:#A5B4FC;background:#EEF2FF}
.cf-chat-start{display:inline-flex;align-items:center;gap:8px;margin:4px auto 12px;padding:6px 12px;border-radius:9999px;background:#F8FAFC;border:1px solid #E2E8F0;color:#64748B;font-size:12px}

/* ── Message bubbles — NO directional tails ── */
.cf-msg{max-width:75%;padding:10px 14px;margin:6px 0;font-size:14px;line-height:1.5;word-break:break-word;position:relative;animation:cfMsgIn 180ms cubic-bezier(0.22,1,0.36,1)}
@keyframes cfMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* Visitor/customer — indigo, right-aligned, tight bottom-right */
.cf-customer{margin-left:auto;background:${color};color:#fff;border-radius:16px 16px 4px 16px}

/* Agent — slate-100, left-aligned, tight bottom-left */
.cf-agent{margin-right:auto;background:#F1F5F9;color:#1E293B;border-radius:16px 16px 16px 4px}

/* Bot — indigo-50 tint, left-aligned */
.cf-bot{margin-right:auto;background:#EEF2FF;color:#4338CA;border-radius:16px 16px 16px 4px}

/* Internal note */
.cf-note{margin-right:auto;background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;border-radius:12px;font-style:italic}

/* System message — centered, indigo-50 */
.cf-system{text-align:center;margin:10px auto;max-width:85%;background:#EEF2FF;color:#4338CA;font-size:13px;border-radius:12px;padding:8px 14px}

.cf-agent-name{font-size:11px;color:#64748B;margin-bottom:4px;display:flex;align-items:center;gap:5px;font-weight:600}
.cf-agent-name img{width:18px;height:18px;border-radius:9999px}
.cf-msg.cf-failed{border:1px solid #EF4444;color:#DC2626;cursor:pointer}
.cf-msg .cf-meta{margin-top:4px;font-size:10px;opacity:0.55;display:flex;justify-content:flex-end;gap:5px}
.cf-msg .cf-tick{font-size:10px}
.cf-preview{background:#E2E8F0;color:#475569;font-style:italic;border-radius:8px}

/* ── Quick reply chips ── */
.cf-qr-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.cf-qr{border:1px solid #C7D2FE;border-radius:9999px;background:#EEF2FF;color:#4F46E5;padding:6px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:background 150ms ease,border-color 150ms ease}
.cf-qr:hover{background:#E0E7FF;border-color:#A5B4FC}

/* ── Rich message types ── */
.cf-attachment{display:inline-flex;align-items:center;gap:6px;color:inherit;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.cf-card{display:flex;flex-direction:column;gap:6px;background:#fff;color:#0F172A;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden}
.cf-card img{width:100%;max-height:160px;object-fit:cover}
.cf-card-title{font-weight:700;font-size:14px;padding:0 12px}
.cf-card-subtitle{font-size:12px;color:#64748B;padding:0 12px 8px}
.cf-card-buttons{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 12px}
.cf-card-button{display:inline-flex;border:1px solid #E2E8F0;border-radius:8px;padding:6px 12px;font-size:12px;text-decoration:none;color:#0F172A;background:#F8FAFC;cursor:pointer;transition:background 150ms ease}
.cf-card-button:hover{background:#EEF2FF}
.cf-carousel{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;-webkit-overflow-scrolling:touch}
.cf-carousel::-webkit-scrollbar{display:none}
.cf-carousel-card{min-width:240px;scroll-snap-align:start}
.cf-image img{max-width:240px;border-radius:12px;display:block}
.cf-video{max-width:280px;border-radius:12px}
.cf-location{display:inline-flex;background:#fff;color:#0F172A;border-radius:8px;border:1px solid #E2E8F0;padding:8px 12px;font-size:13px;text-decoration:none}
.cf-list{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:10px;color:#0F172A}
.cf-list ul{list-style:none;padding:0;margin:6px 0 0}
.cf-list li{padding:6px 0;border-top:1px solid #F8FAFC}
.cf-list li:first-child{border-top:0}
.cf-list-subtitle{color:#64748B;font-size:12px}
.cf-product{display:flex;gap:8px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:8px;color:#0F172A;text-decoration:none}
.cf-product img{width:64px;height:64px;border-radius:8px;object-fit:cover}
.cf-product-meta{flex:1;display:flex;flex-direction:column;gap:2px}
.cf-product-name{font-weight:700;font-size:14px}
.cf-product-desc{font-size:12px;color:#64748B}
.cf-product-price{font-size:13px;font-weight:700;color:#4F46E5}

/* ── Typing indicator — in a bubble, NOT bare dots ── */
.cf-typing-wrap{display:flex;align-items:center;margin:6px 0}
.cf-typing{display:inline-flex;align-items:center;gap:4px;padding:10px 14px;background:#F1F5F9;border-radius:16px 16px 16px 4px}
.cf-dot{width:6px;height:6px;background:#94A3B8;border-radius:50%;animation:cfDot 0.6s ease-in-out infinite}
.cf-dot:nth-child(2){animation-delay:0.15s}
.cf-dot:nth-child(3){animation-delay:0.3s}
@keyframes cfDot{0%,100%{transform:translateY(0);opacity:0.5}50%{transform:translateY(-4px);opacity:1}}

/* ── Connection banner ── */
.cf-connect-banner{position:sticky;top:0;background:#FFFBEB;color:#92400E;font-size:12px;padding:6px 12px;border-radius:8px;margin-bottom:8px;text-align:center;z-index:10}

/* ── Input area ── */
.cf-foot{padding:12px 16px 8px;border-top:1px solid #E2E8F0;background:#fff;position:relative;flex-shrink:0}
.cf-row{display:grid;gap:8px}
.cf-tools{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none}
.cf-tools::-webkit-scrollbar{display:none}
.cf-composer{display:flex;gap:8px;align-items:center}
.cf-input{flex:1;resize:none;min-height:44px;max-height:100px;border:none;border-radius:0;padding:10px 4px;font:inherit;font-size:14px;outline:none;background:transparent;color:#0F172A;line-height:1.5}
.cf-input::placeholder{color:#94A3B8}

/* Send button — circle, indigo when active, slate when empty */
.cf-btn-send{width:36px;height:36px;min-width:36px;border-radius:9999px;border:0;background:#E2E8F0;color:#94A3B8;display:grid;place-items:center;cursor:pointer;transition:background 200ms ease,color 200ms ease;flex-shrink:0}
.cf-btn-send.active{background:#4F46E5;color:#fff}
.cf-btn-send.active:hover{background:#4338CA}
.cf-btn-send svg{width:18px;height:18px}

/* Attachment button */
.cf-btn-attach{width:32px;height:32px;min-width:32px;border-radius:8px;border:0;background:transparent;color:#94A3B8;display:grid;place-items:center;cursor:pointer;transition:color 150ms ease;flex-shrink:0}
.cf-btn-attach:hover{color:#475569}
.cf-btn-attach svg{width:20px;height:20px}

/* Legacy .cf-btn for form submits etc */
.cf-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;background:${color};color:#fff;border-radius:8px;padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap;font-family:inherit;transition:background 150ms ease,transform 150ms ease}
.cf-btn:hover{background:${brandHover}}
.cf-btn:active{transform:scale(0.97)}
.cf-btn:disabled{opacity:0.55;cursor:not-allowed;transform:none}
.cf-btn svg{width:16px;height:16px}

/* Legacy icon buttons */
.cf-icon{width:34px;height:34px;min-width:34px;padding:0;background:#F8FAFC;color:#475569;border:1px solid #E2E8F0;border-radius:8px;display:grid;place-items:center;cursor:pointer;transition:background 150ms ease,color 150ms ease,border-color 150ms ease}
.cf-icon:hover{background:#EEF2FF;color:#4F46E5;border-color:#A5B4FC}
.cf-icon:active{transform:scale(0.95)}

/* "Powered by Flowlyra" footer */
.cf-foot-hint{margin-top:6px;color:#94A3B8;font-size:11px;text-align:center}
.cf-foot-hint a{color:#94A3B8;text-decoration:none;transition:color 150ms ease}
.cf-foot-hint a:hover{color:#4F46E5}
.cf-footnote{font-size:11px;text-align:center;color:#94A3B8;padding:4px 0 6px}
.cf-footnote a{color:inherit;text-decoration:none}
.cf-footnote a:hover{color:#4F46E5}

/* ── Emoji panel ── */
.cf-emoji-panel{position:absolute;bottom:64px;right:12px;width:280px;max-height:240px;overflow:auto;background:#fff;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 10px 15px -3px rgba(15,23,42,0.08);padding:8px;animation:cfSlideIn .2s ease;z-index:10}
.cf-emoji-group-label{font-size:10px;text-transform:uppercase;color:#64748B;margin:6px 4px 4px;letter-spacing:0.06em;font-weight:600}
.cf-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px}
.cf-gif-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.cf-gif-item{border:1px solid #E2E8F0;border-radius:8px;padding:0;background:#fff;overflow:hidden;cursor:pointer}
.cf-gif-item img{display:block;width:100%;height:86px;object-fit:cover}
.cf-emoji{background:transparent;border:0;font-size:18px;padding:6px;cursor:pointer;border-radius:6px;transition:background .1s ease}
.cf-emoji:hover{background:#EEF2FF}

/* ── Locale switch ── */
.cf-locale-switch{position:absolute;top:14px;right:60px}
.cf-locale-switch select{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;border-radius:6px;font-size:12px;padding:3px 6px}

/* ── Forms (pre-chat, offline, CSAT) ── */
.cf-form{display:grid;gap:11px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:16px;box-shadow:0 1px 3px 0 rgba(15,23,42,0.06);animation:cfSlideIn .25s ease}
.cf-form-title{font-size:16px;font-weight:700;color:#0F172A}
.cf-form label{display:grid;gap:5px;color:#334155;font-size:13px;font-weight:500}
.cf-form label[hidden]{display:none}
.cf-form input,.cf-form textarea,.cf-form select{width:100%;border:1px solid #CBD5E1;border-radius:6px;padding:10px 12px;font:inherit;font-size:14px;color:#0F172A;outline:none;transition:border-color 150ms ease,box-shadow 150ms ease}
.cf-form input:focus,.cf-form textarea:focus,.cf-form select:focus{border-color:#4F46E5;box-shadow:0 0 0 3px #EEF2FF}
.cf-form [aria-invalid="true"]{border-color:#EF4444}
.cf-field-error{color:#EF4444;font-size:12px;font-weight:500;margin-top:2px;display:block}
.cf-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cf-submit{width:100%;padding:12px}
.cf-muted{margin:0;color:#64748B;font-size:13px;line-height:1.5}
.cf-success{display:grid;gap:4px;text-align:center;color:#0F172A}
.cf-success span{color:#64748B}

/* ── CSAT stars ── */
.cf-stars{display:flex;justify-content:center;gap:8px}
.cf-star{font-size:28px;border:0;background:transparent;color:#CBD5E1;cursor:pointer;transition:color .15s ease,transform .1s ease}
.cf-star:hover{transform:scale(1.15)}
.cf-star.active{color:#FBBF24}

/* ── WebRTC remote video ── */
.cf-rtc-remote{position:fixed;z-index:2147483001;right:24px;bottom:24px;width:min(320px,40vw);border-radius:12px;background:#000;box-shadow:0 10px 30px rgba(0,0,0,.35)}

/* ── Dark mode ── */
.cf-panel.cf-theme-dark,.cf-theme-dark .cf-body,.cf-theme-dark .cf-foot{background:#0F172A;color:#F1F5F9;border-color:#334155}
.cf-theme-dark .cf-body{background:#1E293B}
.cf-theme-dark .cf-form,.cf-theme-dark .cf-option,.cf-theme-dark .cf-chat-start,.cf-theme-dark .cf-success,.cf-theme-dark .cf-card,.cf-theme-dark .cf-list,.cf-theme-dark .cf-product,.cf-theme-dark .cf-location{background:#1E293B;color:#F1F5F9;border-color:#334155}
.cf-theme-dark .cf-agent{background:#334155;color:#F1F5F9}
.cf-theme-dark .cf-typing{background:#334155}
.cf-theme-dark .cf-dot{background:#64748B}
.cf-theme-dark .cf-option span{color:#F1F5F9}
.cf-theme-dark .cf-option small,.cf-theme-dark .cf-muted,.cf-theme-dark .cf-foot-hint,.cf-theme-dark .cf-product-desc,.cf-theme-dark .cf-card-subtitle,.cf-theme-dark .cf-list-subtitle{color:#94A3B8}
.cf-theme-dark .cf-form input,.cf-theme-dark .cf-form textarea,.cf-theme-dark .cf-form select,.cf-theme-dark .cf-input{background:#0F172A;color:#F1F5F9;border-color:#475569}
.cf-theme-dark .cf-kb-input,.cf-theme-dark .cf-kb-item{background:#1E293B;color:#F1F5F9;border-color:#334155}
.cf-theme-dark .cf-icon{background:#1E293B;color:#94A3B8;border-color:#334155}
.cf-theme-dark .cf-btn-send{background:#334155;color:#94A3B8}
.cf-theme-dark .cf-btn-send.active{background:#4F46E5;color:#fff}
.cf-theme-dark .cf-emoji-panel{background:#1E293B;border-color:#334155;color:#F1F5F9}
.cf-theme-dark .cf-gif-item{background:#0F172A;border-color:#334155}
.cf-theme-dark .cf-emoji:hover{background:#334155}
.cf-theme-dark .cf-qr{background:#1E293B;color:#A5B4FC;border-color:#334155}
.cf-theme-dark .cf-note{background:#2D2810;border-color:#5C4D15;color:#F1F5F9}

@media(prefers-color-scheme:dark){
.cf-panel.cf-theme-auto,.cf-theme-auto .cf-body,.cf-theme-auto .cf-foot{background:#0F172A;color:#F1F5F9;border-color:#334155}
.cf-theme-auto .cf-body{background:#1E293B}
.cf-theme-auto .cf-form,.cf-theme-auto .cf-option,.cf-theme-auto .cf-chat-start,.cf-theme-auto .cf-success,.cf-theme-auto .cf-card,.cf-theme-auto .cf-list,.cf-theme-auto .cf-product,.cf-theme-auto .cf-location{background:#1E293B;color:#F1F5F9;border-color:#334155}
.cf-theme-auto .cf-agent{background:#334155;color:#F1F5F9}
.cf-theme-auto .cf-typing{background:#334155}
.cf-theme-auto .cf-option span{color:#F1F5F9}
.cf-theme-auto .cf-option small,.cf-theme-auto .cf-muted,.cf-theme-auto .cf-foot-hint,.cf-theme-auto .cf-product-desc,.cf-theme-auto .cf-card-subtitle,.cf-theme-auto .cf-list-subtitle{color:#94A3B8}
.cf-theme-auto .cf-form input,.cf-theme-auto .cf-form textarea,.cf-theme-auto .cf-form select,.cf-theme-auto .cf-input{background:#0F172A;color:#F1F5F9;border-color:#475569}
.cf-theme-auto .cf-kb-input,.cf-theme-auto .cf-kb-item{background:#1E293B;color:#F1F5F9;border-color:#334155}
.cf-theme-auto .cf-icon{background:#1E293B;color:#94A3B8;border-color:#334155}
.cf-theme-auto .cf-btn-send{background:#334155;color:#94A3B8}
.cf-theme-auto .cf-btn-send.active{background:#4F46E5;color:#fff}
.cf-theme-auto .cf-qr{background:#1E293B;color:#A5B4FC;border-color:#334155}
}

/* ── Mobile: full-screen slide-up ── */
@media(max-width:480px){
  .cf-panel{inset:0;width:100vw;height:100%;max-height:none;border-radius:0;right:0;bottom:0;transform-origin:bottom center;animation:cfPanelMobile 300ms cubic-bezier(0.22,1,0.36,1) forwards}
  @keyframes cfPanelMobile{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
  .cf-bubble{right:18px;bottom:18px}
  .cf-field-grid{grid-template-columns:1fr}
  .cf-tools{padding-bottom:1px}
}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}
}

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
