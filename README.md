# MobiliPresenter2D

> **Current project entry point:** [CURRENT_STATE.md](CURRENT_STATE.md). It identifies the live authority sources and preserves dated checkpoints as historical records.
>
> **Architecture method:** [Plano Diretor v0.9](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/docs/architecture/MOBILIPRESENTER2D_PLANO_DIRETOR_CONSOLIDADO_v0.9.md).
> **Execution state:** [operational register](https://github.com/EAKerber/MobiliPresenter2D/blob/development/docs/architecture/plan-v0.9-execution-register.json). Resolve the live `development` HEAD and file before relying on item status.
> **Design decisions:** [Design System decisions](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/decisions.json).

MobiliPresenter2D is a fixed-camera 2D configurator for modular furniture, with public presentation, Viewer, Admin, and configuration flows.

`main` is the stable publication branch; `development` is the integration buffer. Promotion is selective by architectural family and requires the relevant source, consumer, and contract evidence. Do not merge the divergent branch trees wholesale.

For local development, open `app/index.html`. The application test suite is run with `cd app && npm test`.
