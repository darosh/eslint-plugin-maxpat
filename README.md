# eslint-plugin-maxpat [WIP]

> An ESLint plugin for linting Max/MSP patch files (.maxpat) <br />
> ⚠️ This is experimental work in progress. Use with caution! <br />
> So far tested only [here](https://github.com/darosh/px-stream) on 30+ maxpat files and 3000+ issues.

## Install

Prerequisites: [Node.js](https://nodejs.org/)

```bash
npm init
```

```bash
npm i eslint
```

```bash
npm i https://github.com/darosh/eslint-plugin-maxpat
```

## Usage

Learn about [ESLint](https://eslint.org/)

### Example config

[https://github.com/darosh/px-stream/blob/main/eslint.config.mjs](https://github.com/darosh/px-stream/blob/main/eslint.config.mjs)

### Run

```bash
eslint ./*.maxpat --rule={"maxpat/ui/annotation-info":"off"}
```

### Run with fix (use with caution!)

```bash
eslint ./*.maxpat --rule={"maxpat/ui/annotation-info":"off"} --fix
```

### List UI elements and their annotation

```bash
eslint ./*.maxpat --format node_modules/eslint-plugin-maxpat/lib/formatter.js
```

## Rules

 <!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
⚠️ Configurations set to warn in.\
✅ Set in the `recommended` configuration.\
⚙️ Has configuration options.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

### Layout

| Name                                                                       | Description                                                                                   | 💼 | ⚠️ | ⚙️ | 🔧 |
| :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :- | :- | :- | :- |
| [layout/grid-size](docs/rules/layout/grid-size.md)                         | Require specific grid size in Max/MSP patches                                                 |    | ✅  | ⚙️ | 🔧 |
| [layout/no-segmented-cords](docs/rules/layout/no-segmented-cords.md)       | Disallow segmented patch cords (midpoints) in Max/MSP patches                                 |    | ✅  | ⚙️ | 🔧 |
| [layout/patching-overlaps](docs/rules/layout/patching-overlaps.md)         | Check for overlapping objects in patching mode                                                |    | ✅  | ⚙️ |    |
| [layout/position-rounding](docs/rules/layout/position-rounding.md)         | Require proper coordinate rounding for patching_rect and presentation_rect in Max/MSP patches |    | ✅  | ⚙️ | 🔧 |
| [layout/presentation-overlaps](docs/rules/layout/presentation-overlaps.md) | Check for overlapping objects in presentation mode                                            |    | ✅  | ⚙️ |    |
| [layout/snap-to-grid](docs/rules/layout/snap-to-grid.md)                   | Require snap to grid to be enabled in Max/MSP patches                                         |    | ✅  | ⚙️ | 🔧 |
| [layout/snap-to-pixel](docs/rules/layout/snap-to-pixel.md)                 | Enforce snap to pixel setting in Max/MSP patches                                              |    | ✅  | ⚙️ | 🔧 |

### Misc

| Name                                                                   | Description                                                                           | 💼 | ⚠️ | ⚙️ | 🔧 |
| :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------ | :- | :- | :- | :- |
| [compatibility/deprecated](docs/rules/compatibility/deprecated.md)     | Warns against the use of deprecated Max/MSP objects                                   |    | ✅  | ⚙️ |    |
| [debug/connected-print](docs/rules/debug/connected-print.md)           | Check for print objects with active connections that should be disabled in production |    | ✅  | ⚙️ | 🔧 |
| [flow/disconnected](docs/rules/flow/disconnected.md)                   | No disconnected objects                                                               |    | ✅  | ⚙️ |    |
| [flow/disconnected-outlets](docs/rules/flow/disconnected-outlets.md)   | No disconnected outlets                                                               |    | ✅  | ⚙️ |    |
| [flow/global-send-receive](docs/rules/flow/global-send-receive.md)     | Check for global send/receive names that are not in allowed exceptions list           |    | ✅  | ⚙️ |    |
| [flow/local-send-receive](docs/rules/flow/local-send-receive.md)       | Check for matching send/receive pairs with triple dash prefix                         |    | ✅  | ⚙️ |    |
| [performance/defer](docs/rules/performance/defer.md)                   | Check for UI objects that should use defer for thread-safe operation                  |    | ✅  | ⚙️ |    |
| [performance/speed-limit](docs/rules/performance/speed-limit.md)       | Check parameter_speedlim value for specified object types                             |    | ✅  | ⚙️ | 🔧 |
| [structure/no-unused-styles](docs/rules/structure/no-unused-styles.md) | Disallow unused styles in Max/MSP patches                                             |    | ✅  | ⚙️ | 🔧 |
| [structure/require](docs/rules/structure/require.md)                   | Require essential Live objects in Max for Live device patches                         |    | ✅  | ⚙️ |    |
| [structure/validate](docs/rules/structure/validate.md)                 | Ensure the .maxpat file has a valid root patcher object                               | ✅  |    |    |    |
| [ui/annotation-info](docs/rules/ui/annotation-info.md)                 | List all UI elements with their names and annotations for review                      |    | ✅  | ⚙️ |    |

<!-- end auto-generated rules list -->
