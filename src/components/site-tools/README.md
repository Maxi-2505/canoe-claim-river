# Canoe site tools

This folder contains the app-wide preference controls and the local FAQ chat. The chat uses the Canoe mark and its responses are canned, bilingual help text; it does not access claim data or make coverage decisions.

## Integration

`SiteToolsProvider` owns the selected language and theme. `SiteTools` renders the floating controls. The current app mounts both in `src/routes/__root.tsx`, outside route content, so they can be carried through a landing page update without editing each page.

For a new app shell, wrap the route tree in `SiteToolsProvider`, render one `SiteTools` beside the route outlet, and keep `src/styles.css`'s `canoe-site-*` styles and the explicit `.dark` palette rules. Use `useSiteTools()` and `t("English copy")` for strings that should change with the EN/DE selector. Add German entries to the `translations` map in `SiteTools.tsx`.

Current translations cover the car claim intake flow and chat. Reviewer and policy admin screens still display English text.
