export function styles(color: string, customCss = ""): string {
  return `
.cf-root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;box-sizing:border-box}
.cf-root *{box-sizing:border-box}
.cf-bubble{position:fixed;z-index:2147483000;width:60px;height:60px;border-radius:999px;border:0;background:${color};color:white;box-shadow:0 18px 50px rgba(15,23,42,.28);display:grid;place-items:center;cursor:pointer;right:24px;bottom:24px}
.cf-bubble.cf-pos-bottom-left{left:24px;right:auto}.cf-bubble.cf-pos-top-right{top:24px;bottom:auto}.cf-bubble.cf-pos-top-left{top:24px;bottom:auto;left:24px;right:auto}
.cf-bubble:after{content:"";position:absolute;inset:7px;border-radius:999px;border:1px solid rgba(255,255,255,.25)}
.cf-bubble svg{width:28px;height:28px}.cf-badge{position:absolute;right:-3px;top:-3px;min-width:18px;height:18px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;display:grid;place-items:center;padding:0 4px}
.cf-eyecatcher{position:fixed;z-index:2147482999;max-width:220px;background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.18);padding:12px 14px 14px;font-size:13px;color:#0f172a;border:1px solid #e2e8f0}
.cf-eyecatcher.cf-pos-bottom-right{right:96px;bottom:34px}.cf-eyecatcher.cf-pos-bottom-left{left:96px;bottom:34px}.cf-eyecatcher.cf-pos-top-right{right:96px;top:34px}.cf-eyecatcher.cf-pos-top-left{left:96px;top:34px}
.cf-eyecatcher img{display:block;max-width:100%;border-radius:8px;margin-bottom:8px}
.cf-eyecatcher-html{margin-bottom:8px}
.cf-eyecatcher button.cf-eyecatcher-close{position:absolute;right:6px;top:6px;border:0;background:transparent;font-size:14px;cursor:pointer;color:#64748b}
.cf-panel{position:fixed;z-index:2147483000;right:24px;bottom:96px;width:390px;height:620px;max-height:calc(100vh - 120px);background:#fff;border:1px solid #dbe4f0;border-radius:18px;box-shadow:0 28px 90px rgba(15,23,42,.28);display:flex;flex-direction:column;overflow:hidden;transform:translateY(14px);animation:cfIn .18s ease forwards}
.cf-panel.cf-pos-bottom-left{left:24px;right:auto}.cf-panel.cf-pos-top-right{top:96px;bottom:auto}.cf-panel.cf-pos-top-left{top:96px;bottom:auto;left:24px;right:auto}
@keyframes cfIn{to{transform:translateY(0)}}
.cf-head{background:${color};color:#fff;padding:18px 18px 14px;display:flex;align-items:center;justify-content:space-between}
.cf-brand-row{display:flex;align-items:center;gap:12px}
.cf-title{font-size:17px;font-weight:800;line-height:1.1}
.cf-subtitle{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:12px;opacity:.9}
.cf-head-actions{display:flex;gap:6px}
.cf-head-actions button{width:34px;height:34px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:14px;cursor:pointer}
.cf-close{width:34px;height:34px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:22px;line-height:1;cursor:pointer}
.cf-avatar-stack{position:relative;width:54px;height:36px}
.cf-avatar{position:absolute;top:0;display:grid;place-items:center;width:36px;height:36px;border-radius:999px;border:2px solid rgba(255,255,255,.85);font-size:11px;font-weight:800;box-shadow:0 8px 24px rgba(15,23,42,.18)}
.cf-avatar-a{left:0;background:#fff;color:${color}}.cf-avatar-b{right:0;background:#111827;color:#fff}
.cf-avatar img{width:100%;height:100%;border-radius:999px;object-fit:cover}
.cf-status-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}
.cf-status-dot.cf-off{background:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,.18)}
.cf-welcome{background:${color};color:#fff;padding:0 18px 18px}
.cf-welcome-copy{font-size:22px;font-weight:800;line-height:1.15;letter-spacing:0}
.cf-welcome-meta{margin-top:9px;font-size:12px;opacity:.86}
.cf-body{flex:1;padding:14px;overflow:auto;background:#f3f6fb;position:relative}
.cf-options{display:grid;gap:8px;margin-bottom:12px}
.cf-kb-box{display:grid;gap:8px;margin-bottom:12px}
.cf-kb-input{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:9px 11px;font:inherit;color:#111827;outline:none;background:#fff}
.cf-kb-input:focus{border-color:${color};box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.cf-kb-list{display:grid;gap:6px}
.cf-kb-item{display:block;border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 10px;font-size:12px;color:#0f172a;text-decoration:none}
.cf-kb-item:hover{background:#f8fbff;border-color:#bfdbfe}
.cf-option{display:grid;gap:2px;width:100%;border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:12px;text-align:left;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.cf-option span{font-weight:800;color:#111827}
.cf-option small{color:#64748b}
.cf-option:hover{border-color:#bfdbfe;background:#f8fbff}
.cf-chat-start{display:inline-flex;align-items:center;gap:8px;margin:4px auto 12px;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid #e2e8f0;color:#64748b;font-size:12px}
.cf-msg{max-width:80%;padding:11px 13px;border-radius:16px;margin:9px 0;font-size:14px;line-height:1.4;word-break:break-word;box-shadow:0 1px 2px rgba(15,23,42,.04);position:relative}
.cf-customer{margin-left:auto;background:#fff;color:#111827;border:1px solid #e2e8f0;border-bottom-right-radius:5px}
.cf-agent{margin-right:auto;background:${color};color:#fff;border-bottom-left-radius:5px}
.cf-bot{margin-right:auto;background:#0f172a;color:#fff;border-bottom-left-radius:5px}
.cf-system{text-align:center;color:#64748b;font-size:12px;margin:10px 0}
.cf-agent-name{font-size:11px;opacity:.82;margin-bottom:3px;display:flex;align-items:center;gap:6px}
.cf-agent-name img{width:18px;height:18px;border-radius:999px}
.cf-msg.cf-failed{border:1px solid #ef4444;color:#b91c1c;cursor:pointer}
.cf-msg .cf-meta{margin-top:5px;font-size:10px;opacity:.6;display:flex;justify-content:flex-end;gap:6px}
.cf-msg .cf-tick{font-size:10px}
.cf-preview{background:#e2e8f0;color:#475569;font-style:italic}
.cf-attachment{display:inline-flex;align-items:center;gap:6px;color:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px}
.cf-card{display:flex;flex-direction:column;gap:6px;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}
.cf-card img{width:100%;max-height:160px;object-fit:cover}
.cf-card-title{font-weight:800;font-size:14px;padding:0 12px}
.cf-card-subtitle{font-size:12px;color:#64748b;padding:0 12px 8px}
.cf-card-buttons{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 12px}
.cf-card-button{display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:12px;text-decoration:none;color:#1e293b;background:#f8fafc;cursor:pointer}
.cf-carousel{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}
.cf-carousel-card{min-width:240px;scroll-snap-align:start}
.cf-qr-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.cf-qr{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#1e293b;padding:6px 12px;font-size:12px;cursor:pointer}
.cf-qr:hover{background:#f1f5f9}
.cf-image img{max-width:240px;border-radius:12px;display:block}
.cf-video{max-width:280px;border-radius:12px}
.cf-location{display:inline-flex;background:#fff;color:#0f172a;border-radius:10px;border:1px solid #e2e8f0;padding:8px 10px;font-size:13px;text-decoration:none}
.cf-list{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;color:#0f172a}
.cf-list ul{list-style:none;padding:0;margin:6px 0 0}
.cf-list li{padding:6px 0;border-top:1px solid #f1f5f9}
.cf-list li:first-child{border-top:0}
.cf-list-subtitle{color:#64748b;font-size:12px}
.cf-product{display:flex;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:8px;color:#0f172a;text-decoration:none}
.cf-product img{width:64px;height:64px;border-radius:10px;object-fit:cover}
.cf-product-meta{flex:1;display:flex;flex-direction:column;gap:2px}
.cf-product-name{font-weight:800}
.cf-product-desc{font-size:12px;color:#64748b}
.cf-product-price{font-size:13px;font-weight:800;color:${color}}
.cf-foot{padding:12px;border-top:1px solid #e2e8f0;background:#fff;position:relative}
.cf-row{display:flex;gap:8px;align-items:flex-end}
.cf-input{flex:1;resize:none;min-height:42px;max-height:112px;border:1px solid #cbd5e1;border-radius:12px;padding:11px 12px;font:inherit;outline:none}
.cf-input:focus{border-color:${color};box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.cf-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;background:${color};color:#fff;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;white-space:nowrap}
.cf-btn:disabled{opacity:.6;cursor:not-allowed}
.cf-btn svg{width:16px;height:16px}
.cf-icon{width:42px;height:42px;padding:0;background:#f8fafc;color:#334155;border:1px solid #cbd5e1}
.cf-foot-hint{margin-top:8px;color:#94a3b8;font-size:11px;text-align:center}
.cf-emoji-panel{position:absolute;bottom:60px;right:12px;width:280px;max-height:240px;overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 12px 40px rgba(15,23,42,.18);padding:8px}
.cf-emoji-group-label{font-size:10px;text-transform:uppercase;color:#64748b;margin:6px 4px 4px;letter-spacing:.06em}
.cf-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px}
.cf-gif-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.cf-gif-item{border:1px solid #e2e8f0;border-radius:8px;padding:0;background:#fff;overflow:hidden;cursor:pointer}
.cf-gif-item img{display:block;width:100%;height:86px;object-fit:cover}
.cf-emoji{background:transparent;border:0;font-size:18px;padding:6px;cursor:pointer;border-radius:6px}
.cf-emoji:hover{background:#f1f5f9}
.cf-locale-switch{position:absolute;top:14px;right:60px}
.cf-locale-switch select{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:8px;font-size:12px;padding:3px 6px}
.cf-form{display:grid;gap:11px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.cf-form-title{font-size:16px;font-weight:900}
.cf-form label{display:grid;gap:5px;color:#475569;font-size:12px;font-weight:800}
.cf-form label[hidden]{display:none}
.cf-form input,.cf-form textarea,.cf-form select{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px 11px;font:inherit;color:#111827;outline:none}
.cf-form input:focus,.cf-form textarea:focus,.cf-form select:focus{border-color:${color};box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.cf-form [aria-invalid="true"]{border-color:#ef4444}
.cf-field-error{color:#ef4444;font-size:11px;font-weight:600;margin-top:2px;display:block}
.cf-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cf-submit{width:100%;padding:12px}
.cf-muted{margin:0;color:#64748b;font-size:13px;line-height:1.4}
.cf-success{display:grid;gap:4px;text-align:center;color:#111827}
.cf-success span{color:#64748b}
.cf-stars{display:flex;justify-content:center;gap:8px}
.cf-star{font-size:30px;border:0;background:transparent;color:#d6d3d1;cursor:pointer}
.cf-star.active{color:#d97706}
.cf-typing{display:flex;gap:4px}
.cf-dot{width:6px;height:6px;background:#dbeafe;border-radius:50%;animation:cfDot 1s infinite}
.cf-dot:nth-child(2){animation-delay:.15s}
.cf-dot:nth-child(3){animation-delay:.3s}
@keyframes cfDot{50%{transform:translateY(-4px);opacity:.55}}
.cf-connect-banner{position:sticky;top:0;background:#fef3c7;color:#92400e;font-size:12px;padding:6px 10px;border-radius:8px;margin-bottom:8px;text-align:center}
.cf-footnote{font-size:10px;text-align:center;color:#94a3b8;padding:4px 0 6px}
.cf-footnote a{color:inherit;text-decoration:underline}
.cf-rtc-remote{position:fixed;z-index:2147483001;right:24px;bottom:24px;width:min(320px,40vw);border-radius:12px;background:#000;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.cf-panel.cf-theme-dark,.cf-theme-dark .cf-body,.cf-theme-dark .cf-foot{background:#0f172a;color:#e5e7eb;border-color:#334155}
.cf-theme-dark .cf-body{background:#111827}
.cf-theme-dark .cf-form,.cf-theme-dark .cf-option,.cf-theme-dark .cf-chat-start,.cf-theme-dark .cf-customer,.cf-theme-dark .cf-success,.cf-theme-dark .cf-card,.cf-theme-dark .cf-list,.cf-theme-dark .cf-product,.cf-theme-dark .cf-location{background:#1e293b;color:#e5e7eb;border-color:#334155}
.cf-theme-dark .cf-option span{color:#f8fafc}
.cf-theme-dark .cf-option small,.cf-theme-dark .cf-muted,.cf-theme-dark .cf-foot-hint,.cf-theme-dark .cf-product-desc,.cf-theme-dark .cf-card-subtitle,.cf-theme-dark .cf-list-subtitle{color:#94a3b8}
.cf-theme-dark .cf-form input,.cf-theme-dark .cf-form textarea,.cf-theme-dark .cf-form select,.cf-theme-dark .cf-input{background:#0f172a;color:#f8fafc;border-color:#475569}
.cf-theme-dark .cf-kb-input,.cf-theme-dark .cf-kb-item{background:#1e293b;color:#e5e7eb;border-color:#334155}
.cf-theme-dark .cf-icon{background:#1e293b;color:#e2e8f0;border-color:#475569}
.cf-theme-dark .cf-emoji-panel{background:#1e293b;border-color:#334155;color:#f8fafc}
.cf-theme-dark .cf-gif-item{background:#0f172a;border-color:#334155}
.cf-theme-dark .cf-emoji:hover{background:#0f172a}
.cf-theme-dark .cf-qr{background:#1e293b;color:#e5e7eb;border-color:#334155}
@media(prefers-color-scheme:dark){
.cf-panel.cf-theme-auto,.cf-theme-auto .cf-body,.cf-theme-auto .cf-foot{background:#0f172a;color:#e5e7eb;border-color:#334155}
.cf-theme-auto .cf-body{background:#111827}
.cf-theme-auto .cf-form,.cf-theme-auto .cf-option,.cf-theme-auto .cf-chat-start,.cf-theme-auto .cf-customer,.cf-theme-auto .cf-success,.cf-theme-auto .cf-card,.cf-theme-auto .cf-list,.cf-theme-auto .cf-product,.cf-theme-auto .cf-location{background:#1e293b;color:#e5e7eb;border-color:#334155}
.cf-theme-auto .cf-option span{color:#f8fafc}
.cf-theme-auto .cf-option small,.cf-theme-auto .cf-muted,.cf-theme-auto .cf-foot-hint,.cf-theme-auto .cf-product-desc,.cf-theme-auto .cf-card-subtitle,.cf-theme-auto .cf-list-subtitle{color:#94a3b8}
.cf-theme-auto .cf-form input,.cf-theme-auto .cf-form textarea,.cf-theme-auto .cf-form select,.cf-theme-auto .cf-input{background:#0f172a;color:#f8fafc;border-color:#475569}
.cf-theme-auto .cf-kb-input,.cf-theme-auto .cf-kb-item{background:#1e293b;color:#e5e7eb;border-color:#334155}
.cf-theme-auto .cf-icon{background:#1e293b;color:#e2e8f0;border-color:#475569}
}
@media(max-width:520px){.cf-panel{inset:0;width:auto;height:auto;max-height:none;border-radius:0}.cf-bubble{right:18px;bottom:18px}.cf-field-grid{grid-template-columns:1fr}.cf-welcome-copy{font-size:20px}}
${customCss}`;
}
