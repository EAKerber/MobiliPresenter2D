# Coletar diagnóstico do acesso administrativo

Use este registro somente quando a falha intermitente de login ou carregamento aparecer.

1. Abra `/admin.html?authDebug=1` no site onde a falha foi observada.
2. Faça login uma vez e não recarregue a página se surgir a mensagem de erro.
3. Abra **Diagnóstico temporário do acesso**, clique em **Copiar diagnóstico** e compartilhe o JSON com a equipe.

O registro existe apenas em memória na aba atual. Ele contém horários, a origem das atualizações da tela, presença de sessão e papel administrativo como valores booleanos, status HTTP, duração, identificador da requisição Netlify e classe do erro. Não coleta e-mail, senha, token, corpo de resposta ou conteúdo da configuração; não envia telemetria.

Remova `?authDebug=1` ao terminar. Sem esse parâmetro, o painel e a coleta não são ativados.
