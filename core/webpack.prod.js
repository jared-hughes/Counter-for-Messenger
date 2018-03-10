const webpack = require('webpack')
const merge = require('webpack-merge')
const baseWebpack = require('./webpack.base')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin')
const ZipPlugin = require('zip-webpack-plugin')
const { styleLoaders } = require('./tools')

module.exports = (env) =>
  merge(baseWebpack(env), {
    devtool: '#cheap-module-eval-source-map',
    module: { rules: styleLoaders({ extract: true, sourceMap: true }) },
    plugins: [
      new webpack.NoEmitOnErrorsPlugin(),
      new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"production"' }),
      new OptimizeCSSPlugin({ cssProcessorOptions: { safe: true } }),
      new ExtractTextPlugin({ filename: 'css/[name].[contenthash].css' }),
      new webpack.HashedModuleIdsPlugin(),
      new ZipPlugin({ path: '../..', filename: (env.FIREFOX) ? 'release-firefox.zip' : 'release-chrome.zip' })
    ]
  })
