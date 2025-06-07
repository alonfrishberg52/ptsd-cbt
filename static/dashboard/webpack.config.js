const path = require('path');
module.exports = {
  entry: './js/dashboard_widgets.js',
  output: {
    path: path.resolve(__dirname, 'js'),
    filename: 'dashboard_widgets.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  mode: 'production',
};
