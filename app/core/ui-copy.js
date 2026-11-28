/* ARC-13 LOC-003/004/006: canonical pt-BR catalog for shared UI. */
(function (root, factory) {
  "use strict";
  var catalog = factory();
  if (root) root.CASA_UI_COPY = catalog;
  if (typeof module === "object" && module.exports) module.exports = catalog;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  return Object.freeze({
    schema: "M2DUIStringCatalog/1",
    locale: "pt-BR",
    brand: Object.freeze({
      homeLinkAriaLabel: "Casa em Módulos, início",
      logoAlt: "Casa em Módulos"
    }),
    navigation: Object.freeze({
      menu: Object.freeze({
        open: "Abrir menu",
        close: "Fechar menu"
      }),
      primaryLabel: "Navegação principal",
      logout: "Sair",
      logoutFailure: "Não foi possível encerrar o acesso. Verifique a conexão e tente novamente.",
      privateMenu: Object.freeze({
        privatePages: "Páginas privadas",
        publicPages: "Páginas públicas",
        configurator: "Configurador",
        administration: "Administração",
        manageAccesses: "Gerenciar acessos"
      }),
      privateAccessState: Object.freeze({
        loading: "Verificando acesso…",
        lookupFailure: "Não foi possível verificar o acesso. Feche e abra o menu para tentar novamente.",
        anonymousAdminEntry: "Entrar na administração",
        denied: "Esta conta não tem acesso às páginas de gestão."
      }),
      environments: "Ambientes",
      howItWorks: "Como funciona",
      about: "Quem somos",
      contactAriaLabel: "Fale conosco pelo WhatsApp",
      contact: "Fale conosco"
    }),
    home: Object.freeze({
      hero: Object.freeze({
        eyebrow: "Casa em Módulos",
        heading: Object.freeze({
          assemble: "Monte.",
          choose: "Escolha.",
          enjoy: "Aproveite."
        }),
        lead: "Móveis inteligentes, pensados para o seu espaço e para o seu orçamento.",
        description: "Um novo conceito em mobiliário que une projeto, fabricação e instalação em uma solução simples, prática e acessível.",
        artworkAlt: "Cozinha planejada com uma mão segurando um celular",
        aboutLink: "Saiba mais",
        video: Object.freeze({
          groupLabel: "Vídeo de apresentação no celular",
          playLabel: "Reproduzir o vídeo de apresentação"
        })
      }),
      benefits: Object.freeze({
        miniLabel: "Vantagens",
        stripLabel: "Vantagens Casa em Módulos"
      }),
      environments: Object.freeze({
        eyebrow: "Você escolhe o que precisa",
        heading: "A gente já sabe como fazer.",
        carousel: Object.freeze({
          previous: "Ambientes anteriores",
          page: "Página do carrossel",
          next: "Próximos ambientes"
        })
      }),
      story: Object.freeze({
        eyebrow: "Simples do início ao fim",
        heading: "Do seu espaço ao ambiente pronto.",
        description: "Escolha o ambiente, conheça os módulos e encontre uma solução que acompanha sua rotina.",
        action: "Encontre seu ambiente "
      }),
      footer: Object.freeze({
        environmentsLink: "Voltar aos ambientes ↑"
      })
    }),
    actions: Object.freeze({
      exploreEnvironments: "Conheça nossos ambientes"
    }),
    video: Object.freeze({
      youtubeLink: "Assistir no YouTube ↗",
      fullscreen: Object.freeze({
        open: "Abrir vídeo em tela cheia",
        close: "Sair da tela cheia"
      })
    }),
    footer: Object.freeze({
      tagline: "Móveis modulares pensados para a vida real.",
      homeLink: "Voltar ao início ↑"
    }),
    configurator: Object.freeze({
      stageNavigation: Object.freeze({ compactLabels: Object.freeze({ modules: "Módulos", finishes: "Acab.", services: "Serv.", summary: "Resumo" }) }),
      miniScene: Object.freeze({
        viewerLabel: "Visualização da cozinha",
        controlsLabel: "Controles da mini-cena",
        pin: Object.freeze({ pin: "Fixar cena", release: "Liberar cena" }),
        transparency: "Alternar transparência",
        resize: Object.freeze({ ariaLabel: "Alterar tamanho da mini-cena", title: "Alterar tamanho" }),
        status: Object.freeze({
          pinned: "Cena fixada para contexto durante a configuração.",
          released: "Cena liberada para o fluxo normal.",
          launcherPinned: "Mini-cena fixada para contexto durante a configuração.",
          available: "Mini-cena disponível abaixo das etapas. Selecione um módulo diretamente na cena.",
          transparencyEnabled: "Mini-cena com transparência ativada.",
          opaque: "Mini-cena opaca.",
          size: Object.freeze({ small: "Mini-cena pequena.", medium: "Mini-cena média.", large: "Mini-cena grande." })
        })
      })
    }),
    admin: Object.freeze({
      authentication: Object.freeze({
        restrictedEyebrow: "Acesso restrito",
        loginHeading: "Painel administrativo",
        loginIntro: "Entre com uma conta administrativa convidada para editar as etapas e os itens disponíveis no configurador.",
        emailLabel: "E-mail",
        passwordLabel: "Senha",
        showPassword: "Mostrar senha",
        hidePassword: "Ocultar senha",
        showPasswordAction: "Mostrar",
        hidePasswordAction: "Ocultar",
        submitLogin: "Entrar",
        requestRecovery: "Esqueci minha senha",
        newPasswordLabel: "Nova senha",
        savePassword: "Salvar senha",
        deniedHeading: "Esta conta não é administradora",
        deniedIntroBefore: "Peça a um responsável para adicionar o papel ",
        deniedIntroAfter: " à sua conta no Netlify Identity.",
        inviteTitle: "Defina uma senha para concluir o convite de administrador.",
        recoveryTitle: "Defina uma nova senha para acessar a administração.",
        acceptInvite: "Aceitar convite",
        updatePassword: "Atualizar senha",
        loginProgress: "Entrando…",
        loginFallback: "Não foi possível entrar. Confira os dados e tente novamente.",
        missingEmail: "Informe seu e-mail para receber o link de recuperação.",
        recoverySuccess: "Se a conta existir, você receberá um link para redefinir a senha.",
        recoveryFallback: "Não foi possível solicitar a recuperação.",
        updatePasswordFallback: "Não foi possível atualizar a senha.",
        accessInitializationFallback: "Não foi possível concluir o acesso."
      }),
      shell: Object.freeze({
        documentTitle: "Administração — Casa em Módulos",
        header: Object.freeze({
          pageName: "Administração",
          menuLabel: "Menu do site",
          userFallback: "Administrador"
        }),
        eyebrow: "Configurador público",
        heading: "Administração do catálogo",
        intro: "Configure etapas, conteúdo dos objetos, acabamentos e valores publicados.",
        tablistLabel: "Áreas de administração",
        tabs: Object.freeze({
          stages: "Etapas",
          objects: "Dados dos objetos",
          finishes: "Cores e acabamentos",
          rules: "Dependências e eventos",
          pricing: "Preços"
        }),
        objectPager: Object.freeze({
          previous: "← Anterior",
          label: "Objeto",
          next: "Próximo →"
        }),
        objectTablistLabel: "Dados do objeto",
        objectTabs: Object.freeze({
          content: "Conteúdo",
          assets: "Imagens e máscaras"
        })
      }),
      loadState: Object.freeze({
        revisionPending: "Versão —",
        revisionLabel: "Versão {revision} · editor hierárquico",
        configurationNotPublished: "A API de configuração ainda não foi publicada.",
        configurationLoadFailure: "Não foi possível carregar a configuração.",
        adminDataLoadFallback: "Falha ao carregar os dados administrativos.",
        retryLoad: "Tentar novamente",
        handlesRepairNeeded: "Puxadores ainda não está atribuído no v3 publicado. Persista Puxadores no v3 antes da futura publicação hierárquica.",
        version5Loaded: "Configuração v5 carregada. A hierarquia e os preços tipados podem ser publicados com validação.",
        hierarchyDraftLoaded: "Hierarquia carregada. Alterações estruturais permanecem em rascunho até a publicação hierárquica ser habilitada."
      }),
      initialState: Object.freeze({
        entityVisibility: "Iniciar visível no configurador",
        entityVisibilityAriaLabel: "{item}: visível inicialmente no configurador",
        viewerVisibility: "Iniciar visível no viewer",
        viewerVisibilityAriaLabel: "{item}: visível inicialmente no viewer",
        serviceActive: "Iniciar ativo",
        serviceActiveAriaLabel: "{item}: ativo inicialmente"
      }),
      finishes: Object.freeze({
        customerAvailability: "Disponível para clientes",
        customerAvailabilityAriaLabel: "{finish}: disponível para clientes",
        scopeLabel: "Aplicação",
        scopeAriaLabel: "{finish}: aplicação",
        scopeOptions: Object.freeze({ global: "Global · conjunto todo", local: "Local · módulo individual" }),
        globalAvailabilityPolicy: "Mantenha pelo menos um acabamento global disponível para clientes.",
        moduleOptionsAriaLabel: "Módulos que aceitam {finish}",
        moduleAvailabilityAriaLabel: "{finish}: disponível para o módulo {module}",
        localAssociationPolicy: "Mantenha este acabamento associado a pelo menos um módulo."
      }),
      stages: Object.freeze({
        availabilityActive: "Ativa",
        availabilityInactive: "Inativa",
        availabilityAriaLabel: "Ativar etapa {stage}",
        requiredAvailabilityPolicy: "Etapa obrigatória: não pode ser desativada nem removida.",
        emptyAvailabilityPolicy: "Adicione pelo menos um item antes de ativar esta etapa."
      }),
      hierarchyEditor: Object.freeze({
        stagePanelNote: "Arraste os itens entre etapas. Itens sem etapa aparecem na lista de disponíveis. Etapas de módulos e resumo são essenciais.",
        newStageTypeLabel: "Tipo da nova etapa",
        newStageTypes: Object.freeze({ custom: "Personalizada", finishes: "Acabamentos", services: "Serviços" }),
        addStage: "Adicionar etapa",
        newStagePrompt: "Nome da nova etapa",
        newSectionPrompt: "Nome da nova seção",
        newGroupPrompt: "Nome do novo grupo",
        stageLimitValidation: "O limite é {limit} etapas.",
        moveUpAriaLabel: "Mover {item} para cima",
        moveDownAriaLabel: "Mover {item} para baixo",
        choiceOptionsSummary: "Opções do item · {count} disponível(is)",
        choiceOptionsNote: "Estas são opções do item, não itens hierárquicos independentes. Disponibilidade e dados comerciais continuam nas abas próprias.",
        choiceAvailable: "Disponível",
        choiceUnavailable: "Indisponível",
        moveItemLabel: "Mover para",
        newSection: "Nova seção",
        removeItem: "Retirar",
        sectionName: "Seção",
        componentLabel: "Componente",
        moveSectionToGroup: "Mover seção para grupo",
        moveSectionToNewGroup: "Mover para novo grupo",
        mergeSection: "Remover seção e unir",
        groupName: "Grupo",
        groupWidth: "Largura",
        groupColumnOptions: Object.freeze({ one: "1 coluna", two: "2 colunas" }),
        mergeGroup: "Remover grupo e unir conteúdo",
        availableItemsAriaLabel: "Itens do catálogo sem seção",
        availableItemsHeading: "Itens disponíveis",
        availableItemsHint: "Itens pertencem a seções explícitas. Escolha uma seção compatível ou crie a estrutura inicial de uma etapa vazia.",
        emptyStageDestination: "criar grupo/seção inicial",
        addItem: "Adicionar",
        allItemsPlaced: "Todos os itens compatíveis já pertencem a uma seção.",
        stageNameLabel: "Nome da etapa",
        stageNameAriaLabel: "Nome da etapa {stage}",
        removeStage: "Remover etapa",
        emptyStageHint: "Etapa vazia. Adicione um item disponível para criar o primeiro grupo e seção."
      }),
      rules: Object.freeze({
        dependenciesHeading: "Regras de dependência",
        dependenciesHint: "Um objeto pode exigir outros módulos ou itens visíveis para ser habilitado.",
        addDependency: "Adicionar dependência",
        dependencyItemHeading: "Item dependente",
        dependencyEntityLabel: "Este item",
        dependencyRequirementsLabel: "Requer todos estes itens",
        removeDependency: "Remover dependência",
        eventsHeading: "Eventos de configuração",
        eventsHint: "Altere dimensões ou ative/desative um módulo ou serviço quando outro item for ligado ou desligado.",
        addEvent: "Adicionar evento",
        eventHeadings: Object.freeze({ legacyDepth: "Ajuste legado de profundidade", stateChange: "Ativar ou desativar item", dimension: "Ajuste de dimensão" }),
        eventActionLabel: "Ação",
        eventActions: Object.freeze({ setDimension: "Alterar dimensão de módulo", setEnabled: "Ativar ou desativar módulo ou serviço", setDepth: "Profundidade fixa" }),
        eventTriggerLabel: "Quando este item",
        eventConditionLabel: "Estiver",
        eventConditions: Object.freeze({ enabled: "Ativado", disabled: "Desativado" }),
        eventTargetLabel: "Aplicar a",
        eventStateLabel: "Definir estado",
        eventStates: Object.freeze({ enabled: "Ativado", disabled: "Desativado" }),
        eventModuleLabel: "Aplicar ao módulo",
        eventDimensionLabel: "Dimensão",
        eventDimensions: Object.freeze({ width: "Largura", height: "Altura", depth: "Profundidade" }),
        eventValueMmLabel: "Valor em mm",
        legacyDepthTargetLabel: "Aplicar ao {target} · Profundidade em mm",
        removeEvent: "Remover evento"
      }),
      nominalDimensions: Object.freeze({
        legend: "Medidas nominais (mm)",
        note: "Atualiza as cotas e vistas técnicas; não altera a geometria da cena.",
        axisLabels: Object.freeze({ width: "Largura", height: "Altura", depth: "Profundidade" }),
        axisAriaLabel: "{module}: {axis} nominal em milímetros",
        invalidValueMessage: "Informe uma medida nominal entre 1 e 5.000 mm, com até uma casa decimal."
      }),
      objectAssets: Object.freeze({
        heading: "{item} · arquivos da cena",
        fields: Object.freeze({
          sceneImage: "Imagem da cena",
          detailImage: "Imagem dos detalhes",
          finishMask: "Máscara de acabamento"
        }),
        defaultSelection: "Usar o padrão / sem máscara",
        previewAlt: "{asset} · {item}",
        previewUnavailable: "Prévia indisponível",
        emptyPreview: "Sem máscara · usar o recorte padrão",
        sceneEntityPolicy: "A lista contém apenas arquivos já presentes na cena. O painel não carrega arquivos novos nem permite caminhos externos.",
        nonSceneEntityPolicy: "Este item não possui camada visual própria na cena. Configure cores e texturas na biblioteca de materiais."
      }),
      objectContentFields: Object.freeze({
        publicName: "Nome público",
        description: "Descrição",
        benefitsPerLine: "Destaques (um por linha)",
        componentsPerLine: "Componentes (um por linha)",
        requirementsPerLine: "Requisitos (um por linha)"
      }),
      pagination: Object.freeze({
        previous: "← Anterior",
        next: "Próxima →"
      }),
      materials: Object.freeze({
        name: "Nome",
        groupName: "Nome da opção",
        kindLabel: "Tipo de material",
        kindOptions: Object.freeze({ solidColor: "Cor sólida", texture: "Textura" }),
        textureAssetLabel: "Textura (arquivo existente)",
        onlyColor: "Somente cor",
        texturePreviewAlt: "Textura de {material}",
        validForSummary: "Válido para…",
        removeMaterial: "Remover material",
        validOptionsSuffix: "opções válidas",
        frontTarget: "Frentes",
        stoneTarget: "Pedra e rodapé",
        handleTargetPrefix: "Puxador",
        handleAvailabilityNote: "Definir depois não é um puxador e não recebe materiais.",
        handleMaterialsHeading: "Cores e materiais deste puxador",
        handleMaterialsEmptyState: "Nenhum material associado. Configure a lista na aba Cores e acabamentos.",
        initialHandleLabel: "Puxador selecionado inicialmente",
        defineLater: "Definir depois",
        stoneAvailabilityHeading: "Pedras e texturas disponíveis para bancada e rodapé",
        frontMaterialsLabel: "Materiais válidos para frentes",
        initialColorLabel: "Cor selecionada inicialmente",
        initialStoneLabel: "Pedra selecionada inicialmente",
        baseboardAvailabilityNote: "A disponibilidade do serviço de rodapé é controlada separadamente na etapa; pedra e rodapé compartilham o material escolhido.",
        lastMaterialValidation: "Mantenha pelo menos um material nesta opção.",
        lastHandleAvailabilityValidation: "Mantenha pelo menos um puxador disponível.",
        availableCountSuffix: "disponível(is)",
        selectedCountSuffix: "selecionado(s)",
        createPrompt: "Nome da nova cor ou textura",
        createDefault: "Novo material",
        baseColor: "Cor base",
        noColor: "Sem cor/tinta base",
        colorDisabledReason: "Cor base indisponível enquanto “Sem cor/tinta base” estiver marcado.",
        noColorDisabledReason: "Sem cor/tinta base está disponível apenas para materiais do tipo Textura.",
        librarySection: Object.freeze({
          heading: "Biblioteca de cores e texturas",
          guidance: "A mesma biblioteca pode abastecer frentes, pedras e modelos de puxador.",
          addMaterial: "Adicionar material",
          availabilityHeading: "Opções e disponibilidade por acabamento",
          availabilityGuidance: "Configure separadamente pedras e materiais de cada puxador. Pedra e rodapé compartilham a escolha; a disponibilidade do serviço de rodapé continua independente.",
          finishAvailabilityHeading: "Disponibilidade das cores de MDF",
          finishAvailabilityGuidance: "Ative as cores para clientes e escolha se cada uma vale para o conjunto todo ou para módulos específicos."
        })
      }),
      pricing: Object.freeze({
        editor: Object.freeze({
          roleLabels: Object.freeze({
            itemBase: "Valores de módulos e acessórios",
            handleChoiceTotal: "Puxadores",
            frontFinishAdjustment: "Adicional por acabamento",
            localAdjustment: "Adicionais locais",
            globalAdjustment: "Adicionais globais"
          }),
          publishedValuesNotice: "Os valores publicados são estimativas para clientes. Custos, margens e dados de fornecedores não entram neste painel.",
          typeLabels: Object.freeze({
            amount: "Valor fixo",
            percentage: "Percentual"
          }),
          basisLabels: Object.freeze({
            "eligible-module-base": "Base: valor base de cada módulo elegível"
          }),
          typeAriaLabel: "Tipo de preço: {label}",
          valueAriaLabel: "Valor de {label}",
          typeChangedResetNotice: "Tipo de preço alterado. O valor foi zerado para evitar conversão implícita entre R$ e %."
        }),
        viewerBasePricePublication: Object.freeze({
          title: "Exibição pública no Viewer",
          label: "Mostrar preços base no Viewer",
          requiresV5: "Esta opção exige uma configuração V5 publicada.",
          explanation: "Inicialmente desativado. Somente os valores base válidos dos módulos publicados e visíveis serão exibidos; não inclui opções e serviços. Alterar esta opção não publica nada até clicar em Publicar configuração.",
          enabledDraft: "Exibição de preços base ativada apenas no rascunho. Clique em Publicar configuração para autorizar valores públicos.",
          disabledDraft: "Exibição de preços base desativada apenas no rascunho. Clique em Publicar configuração para retirar valores da API pública."
        })
      }),
      publication: Object.freeze({
        actions: Object.freeze({
          persistHandles: "Persistir Puxadores no v3",
          publishConfiguration: "Publicar configuração"
        }),
        handlesConfirmation: "Há alterações locais no painel. Esta operação publicará somente Puxadores no schema v3 e recarregará o painel; outras alterações locais não serão publicadas. Continuar?",
        handlesCancelled: "Persistência de Puxadores cancelada; nenhuma alteração foi publicada.",
        handlesRechecking: "Relendo a configuração publicada antes de persistir Puxadores…",
        handlesReloadBeforeRetry: "A configuração mudou desde que o painel foi aberto. O painel foi recarregado; revise o estado antes de tentar novamente.",
        handlesPlanFallback: "Não foi possível preparar a atribuição de Puxadores.",
        handlesAlreadyPersisted: "Puxadores já está persistido em Acabamentos.",
        handlesDeltaFallback: "A alteração proposta não é exclusivamente a atribuição de Puxadores.",
        handlesPersisting: "Persistindo apenas Puxadores em Acabamentos no schema v3…",
        handlesForbidden: "Sua sessão não tem permissão para persistir Puxadores.",
        handlesConflict: "A configuração mudou durante a gravação. Recarregue o painel antes de tentar novamente.",
        handlesWriteFallback: "A API recusou a gravação isolada de Puxadores.",
        handlesWriteMismatch: "A resposta da gravação não corresponde ao candidato v3 esperado.",
        handlesReadbackFailed: "Puxadores foi gravado, mas a releitura de confirmação falhou.",
        handlesReadbackMismatch: "A releitura não corresponde exatamente ao v3 esperado após persistir Puxadores.",
        handlesPersistedWithDraft: "Puxadores foi persistido em Acabamentos no v3 publicado. O painel foi recarregado a partir do publicado; outras alterações locais não foram enviadas.",
        handlesPersisted: "Puxadores foi persistido em Acabamentos no v3 publicado. A publicação hierárquica v5 continua bloqueada.",
        handlesFailureFallback: "Falha ao persistir Puxadores.",
        publishedSettingsNotLoaded: "A configuração publicada ainda não foi carregada.",
        handlesRequireV3: "A persistência isolada de Puxadores é exclusiva do v3.",
        configurationReadFailed: "Não foi possível reler a configuração publicada.",
        hierarchyRevisionMismatch: "O rascunho não corresponde à revisão publicada. Recarregue antes de salvar.",
        hierarchyPublishing: "Publicando configuração hierárquica v5…",
        publishForbidden: "Sua sessão não tem permissão para publicar esta configuração.",
        publishConflict: "A configuração mudou em outra sessão. Recarregue o painel antes de salvar.",
        hierarchyPublishFallback: "A API recusou a publicação v5.",
        hierarchyWriteMismatch: "A resposta de publicação v5 não corresponde ao documento esperado.",
        hierarchyReadbackFailed: "A publicação v5 foi aceita, mas a releitura de confirmação falhou.",
        hierarchyReadbackMismatch: "A releitura v5 não corresponde à revisão publicada; nenhuma confirmação foi assumida.",
        hierarchyPublished: "Configuração v5 publicada e verificada por releitura.",
        incompatibleSchema: "O schema publicado não é compatível com este editor.",
        hierarchyDraftBlocked: "A hierarquia foi alterada. Este rascunho não será achatado no schema publicado; publique a hierarquia apenas no checkpoint autenticado.",
        pricePublicationBlocked: "Este tipo de preço exige a futura publicação consolidada. Nenhuma configuração foi publicada; use Percentual para manter compatibilidade com o schema atual.",
        hierarchyProjectionFallback: "A hierarquia não pode ser publicada com segurança.",
        compatiblePublishing: "Publicando configuração compatível…",
        hierarchyCheckpointBlocked: "A API bloqueou uma publicação hierárquica antes do checkpoint autorizado.",
        compatiblePayloadRejected: "A configuração não foi aceita. Confira nomes e itens selecionados.",
        compatiblePublished: "Configuração compatível publicada. A hierarquia estrutural continua protegida contra publicação prematura.",
        publicationFailureFallback: "Falha ao publicar a configuração."
      })
    }),
    comparison: Object.freeze({
      labels: Object.freeze({
        adaptation: "Adaptação",
        quality: "Qualidade",
        personalization: "Personalização",
        cost: "Custo",
        stagedPurchase: "Compra por etapas",
        production: "Produção"
      }),
      cards: Object.freeze({
        readyMade: "Móveis prontos",
        traditional: "Planejados tradicionais",
        modular: "Casa em Módulos"
      }),
      details: Object.freeze({
        readyMade: Object.freeze({
          adaptation: "Dimensões e configurações da linha.",
          quality: "Varia conforme o produto e o fabricante.",
          personalization: "Opções oferecidas pela linha.",
          cost: "Varia conforme produto e configuração.",
          stagedPurchase: "Depende da linha e da disponibilidade.",
          production: "Produção da linha do fabricante."
        }),
        traditional: Object.freeze({
          adaptation: "Projeto definido para o ambiente.",
          quality: "Definida por materiais, projeto e execução.",
          personalization: "Definida durante o projeto.",
          cost: "Varia conforme projeto, materiais e serviço.",
          stagedPurchase: "Definida com o prestador.",
          production: "Produção conforme o projeto."
        }),
        modular: Object.freeze({
          adaptation: "Combinação de módulos estudados para o empreendimento.",
          quality: "Padrão de marcenaria conforme especificações do projeto.",
          personalization: "Combinações de módulos, acabamentos e acessórios disponíveis.",
          cost: "Busca valores acessíveis por eficiência e escala.",
          stagedPurchase: "Possibilidade prevista no modelo, conforme regras comerciais.",
          production: "Organizada a partir de uma plataforma modular por empreendimento."
        })
      })
    }),
    viewer: Object.freeze({
      state: Object.freeze({
        empty: "Nenhum módulo está visível no viewer neste momento.",
        loading: "Carregando informações publicadas…",
        unavailable: "Informações temporariamente indisponíveis. Tente novamente mais tarde."
      }),
      views: Object.freeze({
        show: "Mostrar vista {index}",
        previous: "Vista anterior",
        counter: "{current} / {total}",
        next: "Próxima vista"
      }),
      scene: Object.freeze({
        selected: "Selecionado: {number} · {title}",
        heading: "Cena interativa",
        instruction: "Clique em um módulo ou use ←/→ e as teclas 1–7.",
        accessibleInstruction: "Cena da cozinha. Use as setas para percorrer os módulos ou as teclas de 1 a 7 para selecionar pelo número.",
        imageAlt: "Composição da cozinha Casa em Módulos",
        hotspotsLabel: "Módulos selecionáveis na cena",
        fallbackStatus: "Imagem indisponível",
        fallbackDescription: "A composição completa da cozinha não pôde ser exibida.",
        fallbackAccessibleLabel: "Cena da cozinha indisponível. A composição completa não pôde ser exibida."
      })
    }),
    theme: Object.freeze({
      mode: Object.freeze({
        auto: Object.freeze({ full: "Automático", short: "Auto" }),
        light: "Claro",
        dark: "Escuro"
      }),
      toggle: Object.freeze({
        ariaLabel: "Tema atual: {current}. Ativar {next}.",
        title: "Tema: {current} (próximo: {next})"
      })
    })
  });
});
