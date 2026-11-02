# Local patches to the Glaze registry files

These files come from `https://design.how/r/glaze/*.json` through `components.json`. After any
`npx shadcn@latest add … --overwrite`, reapply every patch below and rerun `bun run build`.

1. `styles.css`: `@source "../../src"` → `@source "../.."`. The registry assumes the app sits
   in `<root>/src` while Glaze lives in `<root>/components`. Here Glaze lives in `src/components/glaze`,
   so `../../src` pointed at `src/src` and Tailwind never scanned `src/features` or `src/routes`.
2. Fixed English accessible names, translated to pt-BR because the app is `lang="pt-BR"` and these
   components take no prop for them:
   - `ui/dialog.tsx`, `ui/sheet.tsx` (×2): `Close` → `Fechar`; `ui/sheet.tsx`: `Resize panel` → `Redimensionar painel`
   - `ui/toast.tsx`: `Dismiss` → `Dispensar`; the live viewport gets `aria-label: 'Notificações'` (Base UI's default is `Notifications`)
   - `ui/number-input.tsx`: `Decrease` / `Increase` → `Diminuir` / `Aumentar`
   - `ui/pagination.tsx`: `Pagination` / `Previous page` / `Next page` → `Paginação` / `Página anterior` / `Próxima página`
   - `ui/combobox.tsx`: `Clear` → `Limpar`
   - `ui/date-picker.tsx`: `Previous month` / `Next month` / `Choose a time` / `Times` / `Presets` /
     `Time` → `Mês anterior` / `Próximo mês` / `Escolher horário` / `Horários` / `Atalhos` /
     `Horário`; the day cell's `, today` → `, hoje`; the empty trigger's `empty` → `vazio`;
     `dayCount` counts in pt-BR (`1 dia`, `2 dias`); the footer's `Clear` / `Set` → `Limpar` / `Definir`
