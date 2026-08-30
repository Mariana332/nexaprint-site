# Arquitetura funcional do NEXAPRINT

## Catálogo

`products` representa o produto comercial. `product_variants` representa a configuração vendável (tamanho, material, impressão, acabamento e corte quando aplicável). `variant_prices` representa quantidade, preço e custo.

## Gabaritos

`templates` guarda cada arquivo/URL de gabarito uma única vez. `variant_templates` relaciona gabaritos às configurações vendáveis.

Isso permite:

- vários gabaritos para uma configuração;
- o mesmo gabarito reutilizado em várias configurações;
- repetição de produto/configuração sem apagar relações válidas;
- atualização mensal de preço sem perder o gabarito.

## Imagens

`product_images` permite imagem principal e imagens adicionais no produto ou na configuração.

## Conteúdo e identidade

`site_settings` centraliza logo, favicon, cores, fontes, contato e textos globais.

`home_sections` controla a página inicial, incluindo banners, ofertas e destaques.

## Administração

O painel será a camada de operação do negócio. Alterações comuns de identidade, layout, conteúdo, produtos, preços, gabaritos, ofertas, frete e pedidos não devem exigir edição manual do código.

## Importação Atual Card

A importação mensal deve ser idempotente e não destrutiva:

1. identificar produto existente;
2. atualizar dados comerciais;
3. identificar configuração existente;
4. atualizar preços/quantidades;
5. preservar vínculos de imagem e gabarito já existentes;
6. adicionar novos produtos/configurações/gabaritos quando encontrados;
7. nunca apagar automaticamente dados apenas porque uma atualização não os trouxe.

## UX de produto

Fluxo principal:

Produto -> configuração -> quantidade -> opcionais -> gabaritos -> envio de arte -> frete -> total -> compra/carrinho.
