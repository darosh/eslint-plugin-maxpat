# Automatically organize patch layout using hierarchical grid algorithm. Experimental feature. Fix is turned off by default (`maxpat/layout/auto-layout`)

⚠️ This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name               | Description                                  | Type     | Choices                          | Default        |
| :----------------- | :------------------------------------------- | :------- | :------------------------------- | :------------- |
| `fix`              | Apply automatic layout                       | Boolean  |                                  | `false`        |
| `gridSize`         | Grid alignment in pixels [x, y]              | Number[] |                                  | [`8`, `8`]     |
| `layerSpacing`     | Horizontal spacing between layers            | Number   |                                  | `150`          |
| `maxObjectWidth`   | Maximum width for extended objects           | Number   |                                  | `200`          |
| `multiOutlet`      | How to handle objects with multiple outlets  | String   | `extend-width`, `standard-width` | `extend-width` |
| `objectSpacing`    | Vertical spacing between objects             | Number   |                                  | `80`           |
| `outletSpacing`    | Spacing between outlets for extended objects | Number   |                                  | `20`           |
| `preserveComments` | Keep comments near their associated objects  | Boolean  |                                  | `true`         |

<!-- end auto-generated rule options list -->
