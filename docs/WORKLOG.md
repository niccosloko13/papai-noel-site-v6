# Worklog — Mobile Commerce Rebuild

## Implementado nesta rodada
- Landing mobile-first em 6 blocos.
- Design system limpo e sem CSS herdado.
- Seção “Como fica em casa” refeita.
- Catálogo com Básico, Personalizado e Premium.
- Catálogo agora carregado do Admin/localStorage.
- Admin: criar, editar, duplicar, excluir e ativar/desativar produtos.
- Checkout em 3 etapas.
- Carta personalizada com preview.
- Pix manual via BR Code.
- QR Code com valor exato do pedido.
- TXID único por pedido.
- Botão “Já fiz o Pix” -> Pagamento informado.
- Admin confirma manualmente -> Pago.
- WhatsApp de suporte: (13) 97410-0193.
- Assets provisórios hospedados no próprio repositório para evitar imagens quebradas.

## Importante antes de produção
- Substituir os SVGs provisórios pelas fotografias finais aprovadas.
- Proteger admin.html com autenticação/backend antes de publicar.
- Validar o BR Code com a chave Pix real da empresa.
- Definir regra definitiva de frete.
- Rodar QA visual em 360/390/430/1440.
- Testar QR Code em apps bancários reais antes do lançamento.

## Branch
`feat/mobile-commerce-rebuild`

## PR
#1
