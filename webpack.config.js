const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    'websocket-handler': './src/handlers/websocket-handler.js',
    'session-cleanup': './src/handlers/session-cleanup.js'
  },
  output: {
    path: path.resolve(__dirname, '.webpack'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  externals: [
    nodeExternals({
      allowlist: ['uuid'] // Include specific packages in bundle
    })
  ],
  resolve: {
    extensions: ['.js', '.json'],
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: { node: '20' }
              }]
            ]
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true
  },
  resolve: {
    extensions: ['.js', '.json']
  }
};
