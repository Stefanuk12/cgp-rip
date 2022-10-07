// Generated using webpack-cli https://github.com/webpack/webpack-cli

import { resolve as _resolve } from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const isProduction = process.env.NODE_ENV == 'production';


const config = {
    entry: './src/index.ts',
    output: {
        path: _resolve(__dirname, 'lib'),
    },
    devServer: {
        open: true,
        host: 'localhost',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
        }),

        // Add your plugins here
        // Learn more about plugins from https://webpack.js.org/configuration/plugins/
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...']
    }
};

export default () => {
    if (isProduction) {
        config.mode = 'production';
    } else {
        config.mode = 'development';
    }
    return config;
};
