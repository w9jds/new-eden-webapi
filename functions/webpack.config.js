var nodeExternals = require('webpack-node-externals');
var path = require('path');

module.exports = {
    entry: ['babel-polyfill', 'isomorphic-fetch', './src/index.ts'],
    context: __dirname,
    output: {
        path: __dirname,
        filename: 'index.js',
        libraryTarget: 'this'
    },
    target: 'node',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    transpileOnly: true
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    externals: [nodeExternals()]
};
