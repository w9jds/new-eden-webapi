const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    name: 'server',
    context: __dirname,
    target: 'node',
    devtool: 'sourcemap',
    mode: 'development',
    entry: {
        server: ['./src/index.ts']
    },
    output: {
        path: path.resolve(__dirname, './build'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /functions/
            }
        ]
    },
    externals: [nodeExternals()],
    resolve: {
        extensions: ['.ts', '.js']
    }
};