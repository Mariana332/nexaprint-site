# Gabaritos V7 — NEXA PRINT

Fonte: `GABARITOS_POR_PAGINA_V7(1).csv`.

Payload validado: `gabaritos_v7_safe.json.gz.b64`.

## Escopo
- 442 combinações técnicas classificadas como `SEGURO` na auditoria V7.
- Associação por produto + tamanho + material + impressão + acabamento.
- Não altera preços, produtos ou variantes.
- O mesmo arquivo de gabarito pode ser associado a várias variantes quando a estrutura técnica é a mesma.

## Estado em 02/09/2026
- Os 2.315 vínculos antigos foram preservados em `public.nexa_gabarito_legacy_backup` e removidos das tabelas ativas porque havia associações incorretas.
- Importação V7 concluída com sucesso: **31 templates**, **442 vínculos** e **442 variantes** com gabarito.
- Auditoria pós-importação: **0 vínculos duplicados** e **0 vínculos órfãos**.
- O front-end atual (`produto-v4.js`) já consulta `variant_templates` + `templates` e exibe o bloco de gabarito somente para a variante selecionada.
- O importador `nexa-import-gabaritos-v7` permanece disponível para manutenção, mas está protegido por JWT após a importação.

## Regra de segurança
Novas importações devem passar pela validação completa antes de gravar. Se houver variante sem correspondência ou correspondência ambígua, a operação deve ser interrompida sem gravar dados.
