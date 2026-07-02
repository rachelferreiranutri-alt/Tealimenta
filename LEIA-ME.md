# TEAlimenta — como publicar a versão com notificações push

Este pacote inclui tudo (app + servidor de notificações). Siga os passos na ordem.

## 1. Publicar o site

No painel do Netlify, publique esta pasta inteira (arraste a pasta toda,
não só o `index.html` como antes — agora tem vários arquivos que trabalham
juntos).

## 2. Ativar Netlify Blobs

No painel do site → **Project configuration** → procure por **Blobs** (ou
"Data & Storage"). Confirme que está habilitado. Normalmente já vem ativado
por padrão nas contas mais novas — se não encontrar essa opção, é porque já
está ativo.

## 3. Configurar as chaves de notificação (VAPID)

Essas duas chaves já foram geradas para você. Elas funcionam como a
"identidade" do seu site perante os navegadores, para poder enviar
notificações.

No painel do Netlify → **Site configuration** → **Environment variables** →
adicione estas três variáveis:

| Nome | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | `BAaZ30Wo7i-tTDt5__HcQTyxREfBFsRHbzaCSaVCiz4yF_O-2wHf5cl2lhPfMj5DId3828_qC2zrvdvPtwAuKbA` |
| `VAPID_PRIVATE_KEY` | `EO1rpQTEW3ot6eoaT-cmuq8XxOMnKpKF0nahAy1TTNM` |
| `VAPID_CONTACT_EMAIL` | `mailto:seuemail@exemplo.com` (troque pelo seu e-mail real) |

**Importante:** a `VAPID_PRIVATE_KEY` é secreta — não compartilhe, não
publique em repositório público. Ela já está corretamente calculada junto
com a pública, então não precisa (e não deve) gerar outra por conta própria,
ou os dois pares deixam de combinar.

Depois de adicionar as variáveis, republique o site uma vez (qualquer
alteração e novo deploy já resolve) para elas passarem a valer.

## 4. Testar

1. Abra o site publicado no celular (pelo navegador primeiro, depois pode
   adicionar à tela inicial).
2. Vá em **Mãe/Cuidador** → role até **Notificações no celular** → toque em
   **Ativar notificações**.
3. Aceite a permissão que o celular pedir.
4. Cadastre um suplemento ou refeição para um horário 1-2 minutos no futuro
   e espere — a notificação deve chegar mesmo com o app fechado.

Cada família que instalar o app e tocar em "Ativar notificações" passa a
receber os avisos dela mesma, de forma independente — sem cadastro, sem
login, sem você precisar fazer nada manualmente para cada uma.

## Limitações importantes de ser honesto

- **iPhone**: só funciona em iOS 16.4 ou mais recente, e só depois de
  adicionar o app à Tela de Início (não funciona direto pelo Safari).
- **Eu não consegui testar o envio de ponta a ponta** neste ambiente porque
  não tenho acesso à internet aqui — o código segue exatamente o padrão do
  protocolo Web Push, mas o primeiro teste real só acontece depois de você
  publicar. Se algo não chegar de primeira, me manda o que apareceu (erro no
  console do navegador, ou "ativei mas não chegou") que ajusto.
- A verificação roda a cada 1 minuto no servidor — então o aviso pode chegar
  com até ~1 minuto de atraso do horário exato configurado.
- Os alarmes nativos do celular que já configurei continuam sendo uma boa
  camada extra de segurança — recomendo manter os dois por enquanto.
