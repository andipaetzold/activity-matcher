
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    dependencies: [
        path.join(__dirname, "node_modules")
    ],

    entry: {
        script: './src/index.ts',
        style: './src/style.css'
    },

    cache: true,

    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js',
    },

    resolve: {
        extensions: ['.ts', '.js', '.css']
    },

    module: {
        rules: [
            { test: /\.ts$/, loader: 'awesome-typescript-loader' },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] }
        ]
    },

    plugins: [
        new CopyWebpackPlugin([
            { from: 'index.html', context: './src' },
        ]),
    ]
};