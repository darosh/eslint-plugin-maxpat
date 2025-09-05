# eslint-plugin-maxpat

## Rules

 <!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
⚠️ Configurations set to warn in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                       | Description                                                                                   | 💼 | ⚠️ | 🔧 |
| :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :- | :- | :- |
| [compatibility/deprecated](docs/rules/compatibility/deprecated.md)         | Warns against the use of deprecated Max/MSP objects                                           |    | ✅  |    |
| [debug/connected-print](docs/rules/debug/connected-print.md)               | Check for print objects with active connections that should be disabled in production         |    | ✅  | 🔧 |
| [flow/disconnected](docs/rules/flow/disconnected.md)                       | Check for disconnected objects in Max/MSP patches                                             |    | ✅  |    |
| [flow/global-send-receive](docs/rules/flow/global-send-receive.md)         | Check for global send/receive names that are not in allowed exceptions list                   |    | ✅  |    |
| [flow/local-send-receive](docs/rules/flow/local-send-receive.md)           | Check for matching send/receive pairs with triple dash prefix                                 |    | ✅  |    |
| [layout/grid-size](docs/rules/layout/grid-size.md)                         | Require specific grid size in Max/MSP patches                                                 |    | ✅  | 🔧 |
| [layout/patching-overlaps](docs/rules/layout/patching-overlaps.md)         | Check for overlapping objects in patching mode                                                |    | ✅  |    |
| [layout/position-rounding](docs/rules/layout/position-rounding.md)         | Require proper coordinate rounding for patching_rect and presentation_rect in Max/MSP patches |    | ✅  | 🔧 |
| [layout/presentation-overlaps](docs/rules/layout/presentation-overlaps.md) | Check for overlapping objects in presentation mode                                            |    | ✅  |    |
| [layout/snap-to-grid](docs/rules/layout/snap-to-grid.md)                   | Require snap to grid to be enabled in Max/MSP patches                                         |    | ✅  | 🔧 |
| [layout/snap-to-pixel](docs/rules/layout/snap-to-pixel.md)                 | Enforce snap to pixel setting in Max/MSP patches                                              |    | ✅  | 🔧 |
| [performance/defer](docs/rules/performance/defer.md)                       | Check for UI objects that should use defer for thread-safe operation                          |    | ✅  |    |
| [performance/speed-limit](docs/rules/performance/speed-limit.md)           | Check parameter_speedlim value for specified object types                                     |    | ✅  | 🔧 |
| [structure/validate](docs/rules/structure/validate.md)                     | Ensure the .maxpat file has a valid root patcher object                                       | ✅  |    |    |
| [ui/annotation-info](docs/rules/ui/annotation-info.md)                     | List all UI elements with their names and annotations for review                              |    | ✅  |    |

<!-- end auto-generated rules list -->
