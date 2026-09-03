<#--
  The chrome every Akira email is rendered into. Overriding this one file
  re-skins the lot, because base's html/*.ftl all import "template.ftl" and
  theme resolution finds this copy first.

  Email is not the web, so this is written to a narrower set of rules than
  akira.css:
    * Layout is tables. Flex and grid are unsupported in Outlook's Word
      rendering engine, which is still what desktop Outlook uses.
    * Colours are hardcoded hex, repeated at each use site. Custom properties
      are unsupported by most clients, and there is no cascade to lean on.
    * Structural styles are inline. Gmail does support a <style> block, but
      strips it in the forwarded/clipped view, so anything that must survive
      is on the element.
    * The <style> block is therefore only for things inline styles cannot do:
      the dark scheme and the width breakpoint. Both need !important, since an
      inline style outranks any rule in a stylesheet.
-->
<#macro emailLayout>
<!DOCTYPE html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<#-- Both names are needed: the first is the standard, the second is what Apple
     Mail reads. Without them a dark-mode client inverts the palette itself. -->
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${realmName!''}</title>
<style>
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }

  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
  }

  /* Outlook ignores this and lands on the bgcolor attribute instead, which is
     the intended fallback: a flat wash rather than the app's gutter hatching.

     Deliberately weaker than akira.css, which uses --color-rule at a 10px tile.
     In the app the hatch is gutter texture and nothing is ever set on top of
     it; here the wordmark sits directly on it, and at the app's contrast the
     lines won that fight. Lighter line, wider tile: same motif, but it reads as
     paper grain rather than as stripes, and the realm name comes back. */
  .akira-hatch {
    background-color: #fafaf9;
    background-image: repeating-linear-gradient(
      315deg, #f2f2f0 0, #f2f2f0 1px, transparent 0, transparent 50%);
    background-size: 16px 16px;
  }

  @media (prefers-color-scheme: dark) {
    /* Dark needed this most: #1f1f23 on #0a0a0b was the loudest thing in the
       message, louder than the card's own border. */
    .akira-hatch {
      background-color: #0a0a0b !important;
      background-image: repeating-linear-gradient(
        315deg, #121215 0, #121215 1px, transparent 0, transparent 50%) !important;
      background-size: 16px 16px !important;
    }
    .akira-body { background-color: #0a0a0b !important; }
    .akira-card { background-color: #0a0a0b !important; border-color: #1f1f23 !important; }
    .akira-brand, .akira-h1, .akira-strong { color: #f4f4f5 !important; }
    .akira-text { color: #a1a1aa !important; }
    .akira-muted, .akira-foot { color: #71717a !important; }
    .akira-rule { border-color: #1f1f23 !important; }
    .akira-btn-bg { background-color: #60a5fa !important; }
    .akira-btn-a { color: #0a0a0b !important; }
    .akira-code {
      background-color: #111113 !important;
      border-color: #2a2a2f !important;
      color: #f4f4f5 !important;
    }
    .akira-link a, a.akira-plain { color: #60a5fa !important; }
  }

  @media only screen and (max-width: 600px) {
    .akira-pad { padding: 32px 12px !important; }
    .akira-card { padding: 22px !important; }
  }
</style>
</head>
<body class="akira-body" style="margin:0; padding:0; width:100%; background-color:#fafaf9;">
<table role="presentation" class="akira-hatch" width="100%" cellpadding="0" cellspacing="0" border="0"
       bgcolor="#fafaf9" style="border-collapse:collapse; background-color:#fafaf9;">
  <tr>
    <td align="center" class="akira-pad" style="padding:44px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border-collapse:collapse; table-layout:fixed; max-width:520px; margin:0 auto;">

        <#-- Wordmark. Text rather than an image: a remote image is blocked by
             default in most clients, and a CID attachment is not something a
             theme can add. -->
        <tr>
          <td align="center" style="padding:0 0 20px;">
            <span class="akira-brand" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:18px; font-weight:600; letter-spacing:-0.01em; color:#0b0b0c;">${realmName!'Akira'}</span>
          </td>
        </tr>

        <tr>
          <td class="akira-card" bgcolor="#ffffff"
              style="background-color:#ffffff; border:1px solid #e7e7e4; border-radius:12px; padding:28px;">
            <#nested>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:20px 8px 0;">
            <p class="akira-foot" style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.5; color:#8a8a8f;">
              This message was sent automatically. Please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
</#macro>
