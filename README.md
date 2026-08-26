# Sistema de Gestão de Estoque

Versão atual: **Dashboard e Catálogo são públicos** (qualquer cliente pode
acessar direto, sem login). **Produtos e Configurações** pedem apenas uma
**senha** para editar — por trás continua sendo um login real no Supabase
(o e-mail já vem fixo no código), então a proteção é de verdade, no banco
de dados, não só um botão escondido na tela.


## Estrutura de pastas

```
kadu-sistema/
├── index.html            → redireciona para dashboard.html
├── dashboard.html          → público
├── produtos.html            → protegido por senha
├── catalogo.html              → público
├── configuracoes.html          → protegido por senha
├── database/
│   ├── schema.sql               → schema original (tabelas, RLS, função)
│   └── atualizar_acesso_publico.sql → libera leitura pública (rodar 1x)
└── assets/
    ├── css/style.css
    ├── img/logo.svg
    └── js/
        ├── data.js, supabaseClient.js, auth-cloud.js, brand.js
        ├── shell.js         → menu, cabeçalho e a telinha de senha
        └── dashboard.js, produtos.js, catalogo.js, configuracoes.js
```
