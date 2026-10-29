PAINEL DE OPERAÇÃO E MANUTENÇÃO · BRITAGEM DE AGREGADOS · GSA SERVICE
=====================================================================

Estrutura
  index.html          Painel (o que a fiscalização acessa)
  atualizar.html      Área de atualização diária (gera o dados.js a partir da planilha)
  dados/dados.js      Dados publicados. É o ÚNICO arquivo que muda no dia a dia
  assets/             Visual, gráficos, logo, extrator e catálogo de equipamentos
  assets/equipamentos.js  Fichas técnicas e vínculo TAG × modelo (editável)

PUBLICAÇÃO INICIAL (uma vez, GitHub Pages, gratuito)
  1. Crie uma conta em github.com (se ainda não tiver).
  2. Clique em "New repository". Nome sugerido: painel-britagem. Marque "Public".
     (GitHub Pages gratuito exige repositório público. Para acesso restrito,
     veja a seção ACESSO RESTRITO abaixo.)
  3. Na página do repositório, clique em "uploading an existing file" e arraste
     TODO o conteúdo desta pasta (index.html, atualizar.html, assets, dados).
     Clique em "Commit changes".
  4. Vá em Settings › Pages. Em "Branch", escolha "main" e pasta "/ (root)". Salve.
  5. Em um a dois minutos o endereço aparece no topo da mesma tela, no formato
     https://SEU-USUARIO.github.io/painel-britagem/ . Esse é o link da fiscalização.

ATUALIZAÇÃO DIÁRIA (cerca de 1 minuto)
  1. Salve a planilha no Excel (para gravar os valores calculados).
  2. Abra SEU-LINK/atualizar.html, arraste a planilha e confira os avisos.
  3. Clique em "Baixar dados.js".
  4. No GitHub, abra a pasta "dados", clique em Add file › Upload files, arraste o
     dados.js baixado e clique em Commit changes.

ACESSO RESTRITO (opcional)
  O link do GitHub Pages é público para quem o tiver; o painel não é indexado em
  buscadores (meta robots noindex). Para exigir senha, publique a mesma pasta no
  Cloudflare Pages com Cloudflare Access (gratuito até 50 usuários, login por
  e-mail) ou no Netlify com proteção por senha (plano pago).

REGRAS DA PLANILHA QUE O PAINEL PRESSUPÕE
  - Abas: Produção, Operação Primária, Operação Secundária, Base Diária,
    Parâmetros, Cronograma. Os nomes das abas não podem mudar.
  - As colunas são localizadas pelo NOME do cabeçalho; novas colunas não quebram.
  - A Base Diária precisa estar calculada (salvar no Excel antes de carregar).

TESTE LOCAL
  Basta abrir o index.html com duplo clique; funciona sem internet.
