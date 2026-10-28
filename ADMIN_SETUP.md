# Admin seguro — ativação

O login antigo com senha `123` no navegador foi removido. O servidor agora rejeita login sem configuração. Não use essa senha na produção.

## Variáveis na Vercel (Production, Preview conforme necessidade)

- `ADMIN_USERNAME`: usuário administrativo, por exemplo `admin`.
- `ADMIN_PASSWORD_SCRYPT`: texto `saltHex:hashHex` gerado pelo comando abaixo.
- `ADMIN_SESSION_SECRET`: string aleatória de no mínimo 32 caracteres.
- `DATABASE_URL` (ou `POSTGRES_URL`): URL PostgreSQL de um banco de dados dedicado, com TLS válido.

Gere a senha no terminal **local**, sem colocá-la no código ou no chat:

```bash
node -e "const c=require('node:crypto');const s=c.randomBytes(16).toString('hex');const p=process.env.ADMIN_NEW_PASSWORD;if(!p||p.length<12)throw Error('Defina ADMIN_NEW_PASSWORD com 12+ caracteres');console.log(s+':'+c.scryptSync(p,s,64).toString('hex'))"
```

Gere o segredo usando `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.

Configure as variáveis pela interface da Vercel e faça redeploy. Não comite credenciais. O endpoint `/api/admin/auth` deve retornar `configured:true` e `authenticated:false` para usuário anônimo após a configuração.

## Operação

As APIs `/api/admin/orders` e `/api/admin/settings` exigem sessão válida e guardam dados no PostgreSQL. As tabelas `natal_orders` e `natal_settings` são criadas na primeira chamada autenticada. Utilize um usuário do banco com privilégios adequados.

**Integração criada:** o checkout agora registra pedidos na API `/api/checkout`, que calcula valores no servidor e gera o Pix a partir da configuração central. A confirmação informada pelo cliente usa `/api/payment-informed` com segredo individual do pedido. O checkout público lê desconto e frete em `/api/checkout-config`. A operação **continua bloqueada** sem banco e Pix configurados e sem testes ponta a ponta no ambiente implantado. A tela de acompanhamento `pedido.html` ainda usa dados locais e precisa de integração com o servidor.

**Segurança adicional pendente:** limitar tentativas de login na borda (Vercel WAF ou serviço equivalente), trilha de auditoria de mudanças e recuperação/rotação de acesso. A senha de desenvolvimento `123` não deve ser usada.
