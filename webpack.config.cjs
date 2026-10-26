const path = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { EsbuildPlugin } = require('esbuild-loader');

module.exports = {
    entry: "./src/index.js",
    output: {
        filename: "autoanimations.js",
        publicPath: "/modules/autoanimations/dist/",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
    mode: "development",
    devtool: "source-map",

    optimization: {
        usedExports: true,
        minimize: true,
        minimizer: [
            new EsbuildPlugin({
                target: 'esnext',
                minifyIdentifiers: false,
                minifySyntax: true,
                minifyWhitespace: true,
            })
        ],
    },

    module: {
        parser: { javascript: { url: false } },
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'esbuild-loader',
                    options: {
                        target: 'esnext',
                        sourcemap: true,
                    }
                }],
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: { url: false }
                    },
                    'sass-loader'
                ]
            }
        ],
    },

    plugins: [
        new MiniCssExtractPlugin({ filename: 'autoanimations.css' }),
    ]
};
