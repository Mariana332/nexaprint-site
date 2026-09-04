# NEXAPRINT

Novo projeto da loja online NEXA PRINT.

## Direção do projeto

- Interface clara, leve e profissional.
- Identidade NEXA PRINT: branco, preto e verde/turquesa.
- Sem degradês.
- Experiência de compra clara e operacional, sem expor fornecedores ao cliente.
- Produto organizado por configuração, com preço, quantidade, imagem, gabaritos, envio de arte, frete e compra.
- Gabaritos vinculados à configuração correta; uma configuração pode ter vários arquivos e um arquivo pode ser reutilizado em várias configurações.
- Importação das planilhas de fornecedores deve atualizar preços/quantidades e adicionar novidades sem destruir vínculos existentes.
- Painel administrativo deve controlar identidade, layout, conteúdo, catálogo, gabaritos, ofertas, pedidos, clientes e configurações sem edição manual de HTML.

## Infraestrutura

- GitHub: `Mariana332/nexaprint-site`
- Supabase: `nexaprint-store`

## Fonte operacional

As planilhas operacionais contêm produto, configuração, preço, imagem, URL do gabarito, URL direta, tipos e quantidade de gabaritos. Esses dados devem ser mapeados para as tabelas relacionais do projeto, sem interpretar repetições como erro.

## Regra de segurança

Credenciais, senhas e chaves privadas nunca devem ser versionadas neste repositório.
