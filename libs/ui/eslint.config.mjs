import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.config.mjs";

export default [
    ...nx.configs["flat/angular"],
    ...nx.configs["flat/angular-template"],
    ...baseConfig,
    {
        files: ["**/*.ts"],
        rules: {
            // `app-icon` stays a selector of the one icon component so existing Admin templates keep working.
            "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: ["ui", "app"], style: "camelCase" }],
            "@angular-eslint/component-selector": ["error", { type: "element", prefix: ["ui", "app"], style: "kebab-case" }]
        }
    },
    {
        files: ["**/*.html"],
        rules: {}
    }
];
