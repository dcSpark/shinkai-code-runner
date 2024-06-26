const path = require('path');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    target: 'es6',
    entry: './src/index.ts',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'index.js',
        library: {
            type: 'var',
            name: 'tool',
        },
        chunkFormat: 'commonjs',
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        plugins: [new TsconfigPathsPlugin()],
        fallback: {
            "assert": require.resolve("assert/"),
            "buffer": require.resolve("buffer/"),
            "console": require.resolve("console-browserify"),
            "constants": require.resolve("constants-browserify"),
            "crypto": require.resolve("crypto-browserify"),
            "domain": require.resolve("domain-browser"),
            "events": require.resolve("events/"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "os": require.resolve("os-browserify/browser"),
            "path": require.resolve("path-browserify"),
            "punycode": require.resolve("punycode/"),
            "process": require.resolve("process/browser"),
            "querystring": require.resolve("querystring-es3"),
            "stream": require.resolve("stream-browserify"),
            "string_decoder": require.resolve("string_decoder/"),
            "sys": require.resolve("util/"),
            "timers": require.resolve("timers-browserify"),
            "tty": require.resolve("tty-browserify"),
            "url": require.resolve("url/"),
            "util": require.resolve("util/"),
            "vm": require.resolve("vm-browserify"),
            "zlib": require.resolve("browserify-zlib"),
            "net": false,
            "tls": false,
            "bufferutil": false,
            "utf-8-validate": false,
            "fs": false,
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser',
        }),
        new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
            const mod = resource.request.replace(/^node:/, "");
            switch (mod) {
                case "buffer":
                    resource.request = "buffer";
                    break;
                case "stream":
                    resource.request = "readable-stream";
                    break;
                default:
                    throw new Error(`Not found ${mod}`);
            }
        }),
    ],
    optimization: {
        minimize: false,
    },
    mode: 'production',
};