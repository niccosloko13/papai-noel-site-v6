# Worklog — Mobile Commerce Rebuild

## Estado atual
Branch: `feat/mobile-commerce-rebuild`  
PR: #1

A versão funcional passou o workflow **Mobile Commerce QA** no push e no PR.

## Implementado
- Landing mobile-first em exatamente 6 blocos.
- Hero compacto com CTA dentro do primeiro viewport mobile.
- Cards Básico, Personalizado e Premium em scroll horizontal no mobile.
- Seção “Como fica em casa” refeita e navegável por toque/teclado.
- Design system limpo, sem CSS herdado das versões antigas.
- Checkout em 3 etapas.
- Preview de personalização/carta.
- Resumo lateral real no checkout desktop.
- Pix manual via BR Code.
- QR Code gerado localmente no navegador.
- Biblioteca de QR hospedada no próprio repositório; sem dependência de CDN no pagamento.
- Valor Pix calculado com desconto e frete configurado.
- TXID único por pedido.
- “Já fiz o Pix” -> status local “Pagamento informado”.
- Confirmação manual orientada por WhatsApp.
- Página de acompanhamento do pedido.
- Admin mobile para catálogo, pedidos e configuração Pix em modo local.
- CRUD local de produtos.
- Configuração pública versionada em `store-data.js`.
- WhatsApp de suporte: (13) 97410-0193.
- Capturas automatizadas de home, checkout, Pix, Admin e acompanhamento.
- Testes de overflow em 360/375/390/412/430.
- Axe: bloqueio para violações serious/critical.
- Verificação de assets e lazy-loading.
- Verificação de touch targets.
- Gate do sticky buy bar para não cobrir CTA dos kits.
- GitHub Actions com cancelamento de execuções obsoletas.

## Arquitetura sem gateway
A chave Pix não é segredo. Em produção, ela deve ser preenchida em `store-data.js` junto com:
- chave
- nome do recebedor
- nome comercial
- cidade
- desconto Pix

O cliente recebe QR Code e Pix copia-e-cola com valor exato.

A confirmação continua manual. Nenhuma tela afirma “Pago” automaticamente.

## Limitação consciente do Admin
O Admin atual usa localStorage para prévia/operação local.

Portanto:
- pedidos feitos em outro navegador/dispositivo não aparecem automaticamente no Admin;
- alterações feitas no Admin local não são publicadas para todos os clientes;
- a fonte pública do catálogo/Pix é `store-data.js`.

Isso é proposital enquanto o projeto permanece sem backend.

## QA validado
Workflow: `Mobile Commerce QA`

Cobertura:
- mobile 360 / 375 / 390 / 412 / 430
- desktop 1440
- landing sem overflow
- checkout
- Pix
- BR Code / CRC
- catálogo com produtos desativados
- Admin
- confirmação manual
- acompanhamento de pedido
- acessibilidade
- assets
- screenshots

Artifact:
`visual-qa`

## Pendente antes de produção
1. Substituir os SVGs provisórios pelas fotografias finais aprovadas.
2. Inserir a chave Pix e os dados reais do recebedor em `store-data.js`.
3. Testar o QR Code final em pelo menos dois apps bancários reais.
4. Definir a regra real de frete.
5. Aprovar dados comerciais e políticas.
6. Se quiser Admin multi-dispositivo/pedidos centralizados, adicionar backend de pedidos — isso é separado do pagamento Pix e não exige gateway.

## Regra de release
Não fazer merge na `main` enquanto fotografias finais e configuração Pix real não estiverem validadas.
