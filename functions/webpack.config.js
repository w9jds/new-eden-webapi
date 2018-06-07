var nodeExternals = require('webpack-node-externals');
var path = require('path');

module.exports = {
    entry: ['./src/index.ts'],
    context: __dirname,
    output: {
        path: __dirname,
        filename: 'index.js',
        libraryTarget: 'this'
    },
    target: 'node',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: true
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    externals: [nodeExternals()]
};
