import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { ToolDefinitionGeneratorPlugin } from './compiler-hook-plugin';

type Options = {
  entry: string;
  tsConfigFile: string;
  outputPath: string;
};

export const withToolWebpackConfig = ({
  entry,
  tsConfigFile,
  outputPath: outputFolder,
}: Options) => {
  const outputFilename = 'index.js';
  const outputDefinitionFilename = 'definition.json';
  return {
    target: 'es2020',
    externals: ['shinkai/utils'],
    externalsType: 'commonjs',
    entry: entry,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      plugins: [
        new TsconfigPathsPlugin({
          ...(tsConfigFile ? { configFile: tsConfigFile } : {}),
        }),
      ],
    },
    plugins: [
      new ToolDefinitionGeneratorPlugin({
        outputFolder,
        outputFilename,
        outputDefinitionFilename,
      }),
    ],
    output: {
      path: outputFolder,
      filename: outputFilename,
      library: {
        type: 'var',
        name: 'tool',
      },
      chunkFormat: 'module',
    },
    optimization: {
      minimize: false,
    },
    mode: 'production',
  };
};

export * from './compiler-hook-plugin';
