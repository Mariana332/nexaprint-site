# Gabaritos V7 — NEXA PRINT

Fonte: `GABARITOS_POR_PAGINA_V7(1).csv`.

Payload validado para importação: `gabaritos_v7_safe.json.gz.b64`.

Escopo do payload:
- 442 combinações técnicas classificadas como `SEGURO` na auditoria V7.
- Associação por produto + tamanho + material + impressão + acabamento.
- Não altera preços, produtos ou variantes.
- O mesmo arquivo de gabarito pode ser associado a várias variantes quando a estrutura técnica é a mesma.

## Estado em 02/09/2026

- Banco antigo de gabaritos: 2.315 vínculos / 37 templates.
- Esses vínculos foram preservados em `public.nexa_gabarito_legacy_backup` e removidos das tabelas ativas.
- `templates` e `variant_templates` ficaram zeradas para evitar que o site continue exibindo associações incorretas.
- Importador temporário do Supabase: `nexa-import-gabaritos-v7`.
- A validação do importador bloqueia a gravação se houver variante sem correspondência ou correspondência ambígua.

O payload só deve ser considerado concluído quando o importador retornar `ok: true` e os vínculos forem auditados no Supabase.
